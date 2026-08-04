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
 * Attach an erased JT loss to the real fixed term it ended.
 *
 * The reset is the only source of the pre-erase value, but it can also fire while
 * the market is already perpetual. Patch only the latest row when it is still open
 * or was closed earlier in this transaction; an older closed row is unrelated.
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

  // The ONLY write of this field. It is seeded to 0 at FixedTermCommenced and `erased`
  // is provably non-zero here (guarded above and again by the caller), so a non-zero
  // value always means a real loss and 0 always means none was recorded.
  entry.juniorTrancheImpermanentLossNAV = erased;
  entry.updatedAtTransactionHash = event.transaction.hash.toHexString();
  entry.updatedAtBlockNumber = event.block.number;
  entry.updatedAtBlockTimestamp = event.block.timestamp;
  entry.save();
}
