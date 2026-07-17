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
  entry.updatedAtTransactionHash = event.transaction.hash.toHexString();
  entry.updatedAtBlockNumber = event.block.number;
  entry.updatedAtBlockTimestamp = event.block.timestamp;
  entry.save();
}

/**
 * Record the JT coverage impermanent loss that was erased when a term ended.
 *
 * WHY THIS VALUE ONLY EXISTS IN THIS EVENT: the Accountant copies the loss into a
 * local and zeroes storage BEFORE it marshals `state`, so by the instant
 * FixedTermEnded fires, BOTH previewSyncTrancheAccounting().state
 * .jtCoverageImpermanentLoss AND getState().lastJTCoverageImpermanentLoss are
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

  entry.juniorTrancheCoverageImpermanentLossNAV = erased;
  entry.updatedAtTransactionHash = event.transaction.hash.toHexString();
  entry.updatedAtBlockNumber = event.block.number;
  entry.updatedAtBlockTimestamp = event.block.timestamp;
  entry.save();
}
