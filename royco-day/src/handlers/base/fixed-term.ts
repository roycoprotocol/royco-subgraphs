import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import { DayFixedTermHistory, DayMarketState } from "../../../generated/schema";
import { generateMarketRecordId } from "../../utils";

/**
 * Close the market's currently-open fixed term, if there is one.
 *
 * CLOSING A TERM IS A UNION OF TWO EVENTS, NOT ONE. Both call this:
 *
 *   1. FixedTermEnded() — the natural path, emitted by the accounting sync when
 *      the market transitions FIXED_TERM -> PERPETUAL.
 *   2. FixedTermDurationUpdated(0) — setFixedTermDuration(0) force-writes
 *      lastMarketState = PERPETUAL and `delete`s fixedTermEndTimestamp, and emits
 *      NO FixedTermEnded. Its `withSyncedAccounting` modifier syncs BEFORE the
 *      body, while the OLD non-zero duration still holds, so the pre-body sync
 *      need not transition either. Closing only on FixedTermEnded leaves
 *      endBlockTimestamp == 0 forever on a market that provably went perpetual.
 *
 * BOTH CAN FIRE IN ONE TRANSACTION: a term that expires naturally in the same tx
 * as a setFixedTermDuration(0) emits FixedTermEnded from the pre-body sync AND
 * FixedTermDurationUpdated(0) from the body. Hence the endBlockTimestamp guard —
 * this must be idempotent, and the FIRST close wins because it is the truthful one.
 *
 * Also a no-op when there is no open row at all: initialize() emits
 * FixedTermDurationUpdated too, so this runs at market creation before any term
 * exists.
 */
export function closeOpenFixedTerm(
  event: ethereum.Event,
  market: DayMarketState,
): void {
  // A count, not a last-index: 0 means no term has ever started, and (count - 1)
  // would be -1. BigInt is signed and would not underflow, but the load would miss
  // and mask a real bug behind a silent no-op.
  if (market.countFixedTermEntries.isZero()) return;

  const entry = DayFixedTermHistory.load(
    generateMarketRecordId(
      market.marketId,
      market.countFixedTermEntries.minus(BigInt.fromI32(1)),
    ),
  );
  if (!entry) return;

  // Already closed — the other of the two paths got here first, in this tx or an
  // earlier one. Never overwrite: the first close is the true end.
  if (!entry.endBlockTimestamp.isZero()) return;

  entry.endBlockTimestamp = event.block.timestamp;
  // The ONLY write of `duration`, deliberately in the same statement group as the close
  // it is derived from — the two can never disagree, and the "first close wins" guard
  // above covers both. Non-negative by construction: startBlockTimestamp came off
  // FixedTermCommenced, which necessarily preceded this event.
  //
  // Zero is a legitimate value here (a term opened and closed in one block), which is
  // exactly why the field is nullable rather than 0-sentinelled — see schema.graphql.
  entry.duration = event.block.timestamp.minus(entry.startBlockTimestamp);
  entry.updatedAtTransactionHash = event.transaction.hash.toHexString();
  entry.updatedAtBlockNumber = event.block.number;
  entry.updatedAtBlockTimestamp = event.block.timestamp;
  entry.save();
}

/**
 * Record the JT impermanent loss that was erased when a term ended.
 *
 * WHY THIS VALUE ONLY EXISTS IN THIS EVENT: the Accountant copies the loss into a
 * local and zeroes storage BEFORE it marshals `state`, so by the instant
 * FixedTermEnded fires, BOTH previewSyncTrancheAccountingFor().state
 * .jtImpermanentLoss AND getState().lastJTImpermanentLoss are
 * already 0. The pre-erase number survives nowhere else.
 *
 * A BLIND PATCH CORRUPTS. The Reset has TWO emit sites with different guards, and
 * an erase does NOT imply a term end — the erase branch has four disjuncts and
 * only one is "the fixed term elapsed". The other three (duration permanently 0,
 * coverage past the liquidation threshold, JT wiped out) can all fire on a market
 * that is ALREADY perpetual, where no term ended at all. So the three shapes are:
 *
 *   A) sync path, term ended. FixedTermEnded is emitted at a LOWER log index than
 *      the Reset, so by now closeOpenFixedTerm has run: the row is CLOSED, IN THIS
 *      TX. Patch it.
 *   B) setFixedTermDuration(0) on a LIVE, non-elapsed term. The pre-body sync does
 *      not erase (the old duration still holds), so the body emits the Reset with
 *      a real non-zero loss — and it emits it BEFORE its own
 *      FixedTermDurationUpdated(0), which is what closes the row a log later. So
 *      the row is still OPEN here. Patch it; the close follows.
 *   C) an incidental erase on an already-perpetual market. The last row was closed
 *      in an EARLIER tx. Skip — patching would overwrite a concluded term's loss
 *      with an unrelated number.
 *
 * Hence: patch iff the row is OPEN, or was CLOSED IN THIS TX. Case B is the one
 * that makes the naive "row must be closed" guard wrong — it drops the loss on
 * every mid-term setFixedTermDuration(0), silently.
 *
 * The zero guard belongs to the caller: site :925 is UNGUARDED and fires even when
 * nothing was erased, while the sync site is guarded by `!= ZERO_NAV_UNITS`. That
 * asymmetry is also why one tx can emit two Resets — a natural expiry inside a
 * setFixedTermDuration(0) tx erases via the sync (non-zero, patches) and then the
 * body re-emits with the now-zeroed storage (zero, skipped).
 */
export function recordFixedTermCoverageLoss(
  event: ethereum.Event,
  market: DayMarketState,
  erased: BigInt,
): void {
  // Nothing was erased. Only the unguarded config site can emit this, and it never
  // means a term end.
  if (erased.isZero()) return;

  // NO CONFIGURED TERM LENGTH -> there is no term for this loss to belong to, so it
  // gets a zero-length one of its own. See openLossOnlyTerm.
  //
  // Reading the market's CURRENT duration is what makes this safe, and the log order
  // is why. Case B is `setFixedTermDuration(0)` on a live term: the body emits this
  // Reset BEFORE its own FixedTermDurationUpdated(0), and that later event is what
  // sets fixedTermDurationSeconds = 0. So at this instant the field still holds the
  // OLD non-zero duration, case B correctly falls through to the patch path below,
  // and the real term keeps its loss. Only a market that was ALREADY on a zero
  // duration — set in some earlier transaction — reaches openLossOnlyTerm.
  if (market.fixedTermDurationSeconds.isZero()) {
    openLossOnlyTerm(event, market, erased);
    return;
  }

  if (market.countFixedTermEntries.isZero()) return;

  const entry = DayFixedTermHistory.load(
    generateMarketRecordId(
      market.marketId,
      market.countFixedTermEntries.minus(BigInt.fromI32(1)),
    ),
  );
  if (!entry) return;

  // Case C: closed, but in an earlier tx — not ours.
  if (
    !entry.endBlockTimestamp.isZero() &&
    entry.updatedAtTransactionHash != event.transaction.hash.toHexString()
  ) {
    return;
  }

  // The ONLY write of this field. It is seeded to 0 at FixedTermCommenced and `erased`
  // is provably non-zero here (guarded above and again by the caller), so a non-zero
  // value always means a real loss and 0 always means none was recorded.
  entry.juniorTrancheImpermanentLossNAV = erased;
  entry.updatedAtTransactionHash = event.transaction.hash.toHexString();
  entry.updatedAtBlockNumber = event.block.number;
  entry.updatedAtBlockTimestamp = event.block.timestamp;
  entry.save();
}

/**
 * Record a coverage loss on a market that has NO configured term length, as a
 * zero-length term that opens and closes on this event.
 *
 * WHY A ROW AT ALL. The erase branch has four disjuncts and only one is "the fixed
 * term elapsed"; the other three fire on markets running a zero duration, where no
 * term exists to patch. Those losses used to reach case C and be dropped, so
 * DayMarketState.juniorTrancheImpermanentLossNAV (which counts every erase) drifted
 * permanently above SUM(DayFixedTermHistory.juniorTrancheImpermanentLossNAV), and the
 * difference was unattributable — no row, no timestamp, no way to ask when it
 * happened. Giving the loss its own degenerate term closes that gap: the two now
 * reconcile, and every erase is answerable in the history table.
 *
 * ALL THREE TIMESTAMPS ARE THIS BLOCK'S, deliberately:
 *   startBlockTimestamp     — the term begins here
 *   scheduledEndBlockTimestamp — it was never scheduled to run; there is no other
 *                             honest value, and 0 would read as "scheduled for the
 *                             epoch" and poison scheduled-vs-actual comparisons
 *   endBlockTimestamp       — it ends here too
 * so `duration` is 0. That is a REAL duration, not a sentinel — the same value a
 * genuine term that opened and closed in one block would carry, which is exactly why
 * `duration` is nullable rather than 0-sentinelled (see schema.graphql).
 *
 * CLOSED ON ARRIVAL, which matters for what comes next: endBlockTimestamp is non-zero,
 * so closeOpenFixedTerm's "already closed" guard skips this row, and a later erase in a
 * DIFFERENT tx hits the case C guard rather than overwriting this one's loss. A later
 * erase in the SAME tx would pass case C — but it cannot reach that path, because a
 * zero duration routes every erase here, and each gets its own fresh row.
 *
 * The caller MUST save the market after this: the cursor advances here and
 * touchMarket is what persists it.
 */
function openLossOnlyTerm(
  event: ethereum.Event,
  market: DayMarketState,
  erased: BigInt,
): void {
  // Use-then-increment, the same cursor and the same order as handleFixedTermCommenced
  // — these rows share one dense stream with the real terms, they are not a side table.
  const entryIndex = market.countFixedTermEntries;

  const entry = new DayFixedTermHistory(
    generateMarketRecordId(market.marketId, entryIndex),
  );
  entry.chainId = market.chainId;
  entry.marketId = market.marketId;
  entry.marketRefId = market.id;
  entry.entryIndex = entryIndex;
  entry.startBlockTimestamp = event.block.timestamp;
  entry.scheduledEndBlockTimestamp = event.block.timestamp;
  entry.endBlockTimestamp = event.block.timestamp;
  entry.duration = BigInt.zero();
  entry.juniorTrancheImpermanentLossNAV = erased;

  entry.createdAtTransactionHash = event.transaction.hash.toHexString();
  entry.createdAtBlockNumber = event.block.number;
  entry.createdAtBlockTimestamp = event.block.timestamp;
  entry.updatedAtTransactionHash = event.transaction.hash.toHexString();
  entry.updatedAtBlockNumber = event.block.number;
  entry.updatedAtBlockTimestamp = event.block.timestamp;
  entry.save();

  market.countFixedTermEntries = entryIndex.plus(BigInt.fromI32(1));
}
