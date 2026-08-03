import { BigInt } from "@graphprotocol/graph-ts";
import {
  MaxYieldSharesUpdated as MaxYieldSharesUpdatedEvent,
  YieldSharesAccrued as YieldSharesAccruedEvent,
  FixedTermCommenced as FixedTermCommencedEvent,
  FixedTermEnded as FixedTermEndedEvent,
  FixedTermDurationUpdated as FixedTermDurationUpdatedEvent,
  FixedTermCommenceableAt as FixedTermCommenceableAtEvent,
  FixedTermCommenceableAtTimestampUpdated as FixedTermCommenceableAtTimestampUpdatedEvent,
  MinCoverageUpdated as MinCoverageUpdatedEvent,
  MinLiquidityUpdated as MinLiquidityUpdatedEvent,
  LiquidationCoverageUtilizationUpdated as LiquidationCoverageUtilizationUpdatedEvent,
  SeniorTrancheProtocolFeeUpdated as SeniorTrancheProtocolFeeUpdatedEvent,
  JuniorTrancheProtocolFeeUpdated as JuniorTrancheProtocolFeeUpdatedEvent,
  JuniorTrancheYieldShareProtocolFeeUpdated as JuniorTrancheYieldShareProtocolFeeUpdatedEvent,
  LiquidityProviderTrancheYieldShareProtocolFeeUpdated as LiquidityProviderTrancheYieldShareProtocolFeeUpdatedEvent,
  DustToleranceUpdated as DustToleranceUpdatedEvent,
  JuniorTrancheImpermanentLossReset as JuniorTrancheImpermanentLossResetEvent,
  JuniorTrancheYDMUpdated as JuniorTrancheYDMUpdatedEvent,
  LiquidityProviderTrancheYDMUpdated as LiquidityProviderTrancheYDMUpdatedEvent,
} from "../generated/templates/RoycoDayAccountant/RoycoDayAccountant";
import {
  DayFixedTermHistory,
  DayYieldSharesAccruedHistory,
} from "../generated/schema";
import {
  resolveMarketFromAccountant,
  touchMarket,
} from "./handlers/base/resolve-market";
import {
  closeOpenFixedTerm,
  recordFixedTermCoverageLoss,
} from "./handlers/base/fixed-term";
import { generateMarketRecordId } from "./utils";
import {
  CHAIN_ID,
  MARKET_STATE_FIXED,
  MARKET_STATE_PERPETUAL,
} from "./constants";

/**
 * RoycoDayAccountant — the market's config and accounting surface.
 *
 * EVERY handler here starts with resolveMarketFromAccountant() and returns on
 * null. The accountant address is NOT the marketId (§6), and the market may not
 * exist yet: initialize() emits MinCoverageUpdated and FixedTermDurationUpdated
 * during deployMarket, at a LOWER log index than the MarketDeploymentCompleted
 * that creates this template and writes the market.
 *
 * These are config events and they carry the NEW value as their payload, so no
 * handler here re-reads getState(). The one exception is documented on
 * handleSeniorTrancheDustToleranceUpdated.
 *
 * `$.kernel` is assigned once in initialize() and has no setter. On the deployed
 * revision, KernelUpdated(address) reports an implementation update; the latest revision
 * removes it. Neither can re-point the accountant. That invariant is why the factory's
 * DayAccountantMarketMap remains valid.
 *
 * TYPE TRAPS (verified against generated/, see CLAUDE.md §4). Only ONE of the
 * fifteen is not a direct BigInt assign:
 *   FixedTermDurationUpdated(uint24) -> i32     !! needs BigInt.fromI32()
 *   FixedTermCommenced(uint32)       -> BigInt, direct
 *   the *WAD events (uint64)         -> BigInt, direct
 *   the dust tolerances (uint256)    -> BigInt, direct
 *   the YDM events (address)         -> .toHexString()
 *
 * THE SYNC HANDLER NO LONGER LIVES HERE. v2 replaced the accountant's
 * TrancheAccountingSynced with the kernel's PreOp/PostOpTrancheAccountingSynced pair,
 * so it moved to src/royco-day-kernel.ts — where event.address IS the marketId and no
 * accountant -> market hop is needed at all. Everything left in this file is a config or
 * lifecycle event, and each resolves through resolveMarketFromAccountant, which is now a
 * DayAccountantMarketMap store load rather than an eth_call.
 */

// =============================================================================
// FIXED TERM
//
// The lifecycle spans three handlers and DayFixedTermHistory is the one MUTABLE
// record stream. Read the note on closeOpenFixedTerm before changing any of them.
// =============================================================================

/**
 * A term began: PERPETUAL -> FIXED_TERM, detected by the accounting sync.
 *
 * The event carries the SCHEDULED end. That number also lands on
 * DayMarketState.fixedTermEndTimestamp, but that field is live state — the
 * contract `delete`s it on term end and each new term overwrites it — so the
 * per-term copy on the history row is the only way to ask "did this term end
 * early?" after the fact.
 */
export function handleFixedTermCommenced(event: FixedTermCommencedEvent): void {
  const market = resolveMarketFromAccountant(event);
  if (!market) return;

  // The sync writes $.lastMarketState = FIXED_TERM before emitting this, and
  // DayMarketState.marketState mirrors that stored value (§6).
  market.marketState = MARKET_STATE_FIXED;
  market.fixedTermEndTimestamp = event.params.fixedTermEndTimestamp;

  // Use-then-increment: the count IS the next entryIndex, so the first term is
  // entry 0 and the count becomes 1.
  const entryIndex = market.countFixedTermEntries;

  const entry = new DayFixedTermHistory(
    generateMarketRecordId(market.marketId, entryIndex),
  );
  entry.chainId = CHAIN_ID;
  entry.marketId = market.marketId;
  entry.marketRefId = market.id;
  entry.entryIndex = entryIndex;
  entry.startBlockTimestamp = event.block.timestamp;
  entry.scheduledEndBlockTimestamp = event.params.fixedTermEndTimestamp;
  // Open. closeOpenFixedTerm keys off exactly this, and so do consumers.
  entry.endBlockTimestamp = BigInt.zero();
  // Explicitly null, not merely left unset. Both produce the same absent column (a
  // nullable setter calls unset() on null), but writing it states the intent: the term
  // is RUNNING and has no duration yet. closeOpenFixedTerm is the only place it is
  // filled in. Note this is the one field here that must NOT be seeded to zero — §8's
  // "an unset non-null field is fatal" does not apply to a nullable one, and 0 is a real
  // duration (a term opened and closed in one block).
  entry.duration = null;
  // Seeded because it is non-null and unset is fatal at index time (§8). It stays
  // zero unless the term ends with a real coverage loss, which arrives later and
  // out-of-band via handleJuniorTrancheImpermanentLossReset — the erased
  // value exists in that event and nowhere else.
  entry.juniorTrancheImpermanentLossNAV = BigInt.zero();

  entry.createdAtTransactionHash = event.transaction.hash.toHexString();
  entry.createdAtBlockNumber = event.block.number;
  entry.createdAtBlockTimestamp = event.block.timestamp;
  entry.updatedAtTransactionHash = event.transaction.hash.toHexString();
  entry.updatedAtBlockNumber = event.block.number;
  entry.updatedAtBlockTimestamp = event.block.timestamp;
  entry.save();

  market.countFixedTermEntries = entryIndex.plus(BigInt.fromI32(1));
  touchMarket(event, market);
}

/**
 * A term ended naturally: FIXED_TERM -> PERPETUAL, detected by the sync.
 *
 * The event payload is EMPTY — it names no term. The open row at
 * (countFixedTermEntries - 1) is the only way to know which one ended, which is
 * why the counter exists and why an entry index must never be derived from a
 * block number or timestamp (§8).
 */
export function handleFixedTermEnded(event: FixedTermEndedEvent): void {
  const market = resolveMarketFromAccountant(event);
  if (!market) return;

  market.marketState = MARKET_STATE_PERPETUAL;
  // The contract `delete`s $.fixedTermEndTimestamp on this transition; mirror it.
  // The scheduled end survives on the history row.
  market.fixedTermEndTimestamp = BigInt.zero();

  closeOpenFixedTerm(event, market);
  touchMarket(event, market);
}

/**
 * The configured term length changed — and, if it changed to ZERO, the market was
 * force-flipped to perpetual WITHOUT a FixedTermEnded. See closeOpenFixedTerm.
 *
 * Also fires from initialize(), before the market entity exists. The null guard in
 * resolveMarketFromAccountant is what makes that a no-op rather than a crash.
 */
/**
 * The market's fixed-term grace period elapsed — i.e. the earliest timestamp at which a
 * fixed term may commence. Deployment time plus the configured grace period.
 *
 * PURE CONFIG, carried on the event; no contract read.
 *
 * !! ITS ONLY EMIT SITE IS initialize() (RoycoDayAccountant.sol:122), which fires DURING
 *    deployMarket at a LOWER log index than the MarketDeploymentCompleted that creates
 *    this template and writes the market. So in practice the null guard swallows it and
 *    the column is filled by the factory's own getState() read instead.
 *
 *    It is wired anyway, deliberately: the value has no setter TODAY, and if one is ever
 *    added this handler picks it up with no further work. Its three neighbours —
 *    MinCoverageUpdated, MinLiquidityUpdated, FixedTermDurationUpdated — each already
 *    have a real set* and two emit sites, so this is the same shape as code that is
 *    demonstrably live.
 *
 * uint64 -> BigInt direct. The uint24 lift that bites on fixedTermDurationSeconds does
 * not apply (§4).
 */
export function handleFixedTermCommenceableAt(
  event: FixedTermCommenceableAtEvent
): void {
  const market = resolveMarketFromAccountant(event);
  if (!market) return;

  market.fixedTermCommenceableAtTimestamp =
    event.params.fixedTermCommenceableAtTimestamp;
  touchMarket(event, market);
}

export function handleFixedTermDurationUpdated(
  event: FixedTermDurationUpdatedEvent,
): void {
  const market = resolveMarketFromAccountant(event);
  if (!market) return;

  // uint24 -> i32. THE one lift in this file; its uint32/uint64 neighbours are
  // direct assigns (§4).
  market.fixedTermDurationSeconds = BigInt.fromI32(
    event.params.fixedTermDurationSeconds,
  );

  if (event.params.fixedTermDurationSeconds == 0) {
    // setFixedTermDuration(0) writes lastMarketState = PERPETUAL and deletes
    // fixedTermEndTimestamp in the same call, emitting no FixedTermEnded.
    market.marketState = MARKET_STATE_PERPETUAL;
    market.fixedTermEndTimestamp = BigInt.zero();
    closeOpenFixedTerm(event, market);
  }

  touchMarket(event, market);
}

export function handleFixedTermCommenceableAtTimestampUpdated(
  event: FixedTermCommenceableAtTimestampUpdatedEvent,
): void {
  const market = resolveMarketFromAccountant(event);
  if (!market) return;

  market.fixedTermCommenceableAtTimestamp =
    event.params.fixedTermCommenceableAtTimestamp;
  touchMarket(event, market);
}

/**
 * The JT impermanent loss that was erased — the ONLY witness to that
 * number anywhere on chain. The Accountant copies it into a local and zeroes
 * storage BEFORE marshalling state, so by the time anything else can observe the
 * market, both the preview and getState() already read 0.
 *
 * WRITES TWO THINGS, WITH DELIBERATELY DIFFERENT RULES:
 *
 *   1. DayMarketState.juniorTrancheCoverageLossNAV — a LIFETIME TOTAL. EVERY
 *      erase adds to it, term-end or not, so it only ever grows. No contract
 *      tracks this; the subgraph is the only place it exists.
 *
 *   2. DayFixedTermHistory.juniorTrancheImpermanentLossNAV — PER-TERM, and
 *      only for the erase that ended THAT term. An erase does NOT imply a term
 *      ended (the erase branch has four disjuncts and three of them fire on
 *      already-perpetual markets), so this one is guarded. All the subtlety is in
 *      recordFixedTermCoverageLoss — read its note before touching either.
 *
 * The two therefore disagree on purpose: the market total is >= the sum of the
 * per-term rows, and the difference is exactly the erases that ended no term.
 *
 * NO DOUBLE-COUNT: one erase can emit at most one NON-ZERO Reset. If the sync
 * erases, it zeroes storage, so a setFixedTermDuration(0) body re-emitting in the
 * same tx necessarily carries 0 and the zero guard drops it. If the sync did not
 * erase, only the body's Reset fires. Two non-zero Resets in one tx would mean two
 * genuinely distinct erasures, and adding both is correct.
 *
 * It does NOT touch juniorTrancheImpermanentLoss — that is the LIVE value
 * from the preview block and belongs to handleTrancheAccountingSynced (still a
 * stub). See the schema note: the two names differ by one word and mean opposite
 * things.
 */
export function handleJuniorTrancheImpermanentLossReset(
  event: JuniorTrancheImpermanentLossResetEvent,
): void {
  const market = resolveMarketFromAccountant(event);
  if (!market) return;

  const erased = event.params.jtImpermanentLossErased;
  // Nothing was erased — only the UNGUARDED setFixedTermDuration(0) site emits
  // this, and it never means anything happened. Returning keeps updatedAt* honest:
  // no field changed.
  if (erased.isZero()) return;

  market.juniorTrancheImpermanentLossNAV =
    market.juniorTrancheImpermanentLossNAV.plus(erased);

  // BEFORE touchMarket, not after. On a market with a zero fixedTermDurationSeconds
  // this opens a new history row and ADVANCES countFixedTermEntries on the in-memory
  // market; touchMarket is the save that persists it. Called after the save, the
  // cursor bump would be silently dropped and the next loss would overwrite this
  // row's id. Same ordering as handleFixedTermCommenced and handleFixedTermEnded.
  recordFixedTermCoverageLoss(event, market, erased);

  touchMarket(event, market);
}

// =============================================================================
// CONFIG — each event carries its own new value; no contract reads needed.
// =============================================================================

export function handleMinCoverageUpdated(event: MinCoverageUpdatedEvent): void {
  const market = resolveMarketFromAccountant(event);
  if (!market) return;

  market.minCoverageWAD = event.params.minCoverageWAD;
  touchMarket(event, market);
}

export function handleMinLiquidityUpdated(event: MinLiquidityUpdatedEvent): void {
  const market = resolveMarketFromAccountant(event);
  if (!market) return;

  market.minLiquidityWAD = event.params.minLiquidityWAD;
  touchMarket(event, market);
}

export function handleLiquidationCoverageUtilizationUpdated(
  event: LiquidationCoverageUtilizationUpdatedEvent,
): void {
  const market = resolveMarketFromAccountant(event);
  if (!market) return;

  market.coverageLiquidationUtilizationWAD =
    event.params.liquidationCoverageUtilizationWAD;
  touchMarket(event, market);
}

/**
 * The two yield-share CAPS, in one event.
 *
 * These land on maxJuniorTrancheYieldShareAccruedWAD /
 * maxLiquidityTrancheYieldShareAccruedWAD. Despite the "Accrued" in those field
 * names they are CONFIGURED CAPS, not accruals — §7 calls the naming actively
 * misleading and freezes it anyway, because renaming a shipped column is a
 * migration. The real accruals arrive on JuniorTrancheYieldShareAccrued /
 * LiquidityTrancheYieldShareAccrued and land on the timeWeighted* fields beside
 * them. Never average or compare the two.
 */
export function handleMaxYieldSharesUpdated(
  event: MaxYieldSharesUpdatedEvent,
): void {
  const market = resolveMarketFromAccountant(event);
  if (!market) return;

  market.maxJuniorTrancheYieldShareAccruedWAD = event.params.maxJTYieldShareWAD;
  market.maxLiquidityTrancheYieldShareAccruedWAD =
    event.params.maxLPTYieldShareWAD;
  touchMarket(event, market);
}

/**
 * A yield-share accrual tick — BOTH tranches, in ONE event.
 *
 * v1 had two events (JuniorTrancheYieldShareAccrued + LiquidityTrancheYieldShareAccrued)
 * emitted together at adjacent log indices, two handlers, two entities and two cursors.
 * v2 merged them into YieldSharesAccrued carrying all four values, so this is now a
 * single atomic write: one DayYieldSharesAccruedHistory row, one cursor, and both
 * timeWeighted* fields on DayMarketState advanced together. They can no longer drift
 * apart, which was structurally possible before.
 *
 * SOLE UPDATER of both DayMarketState.timeWeighted*YieldShareAccruedWAD fields. The
 * running totals ride on THIS event and are NOT in the TrancheAccountingSynced state
 * tuple, so nothing else can advance them — they would otherwise freeze at the
 * factory's deploy seed.
 *
 * No zero guard: a tick with a 0 instantaneous share still reports the authoritative
 * running totals and is a real accrual step.
 */
export function handleYieldSharesAccrued(event: YieldSharesAccruedEvent): void {
  const market = resolveMarketFromAccountant(event);
  if (!market) return;

  market.timeWeightedJuniorTrancheYieldShareAccruedWAD =
    event.params.twJTYieldShareAccruedWAD;
  market.timeWeightedLiquidityTrancheYieldShareAccruedWAD =
    event.params.twLPTYieldShareAccruedWAD;

  // ONE ROW PER EVENT — this stream does NOT collapse. Use-then-increment: the count IS
  // the next entryIndex (see "ENTRY INDEX CURSOR" in schema.graphql).
  //
  // It used to be keyed by block, which merged nothing: the contract emits AT MOST ONE
  // YieldSharesAccrued per block per market, because _accruePremiumYieldShares returns
  // early on `elapsed == 0` and stamps lastYieldShareAccrualTimestamp before its emit.
  // The block key only cost a load per write and implied a delta-accumulation rule that
  // could never fire — so the two instantaneous shares are now written outright rather
  // than `.plus()`-ed onto a seeded zero.
  const entryIndex = market.countYieldSharesAccruedEntries;

  const entry = new DayYieldSharesAccruedHistory(
    generateMarketRecordId(market.marketId, entryIndex)
  );
  entry.entryIndex = entryIndex;
  entry.chainId = CHAIN_ID;
  entry.marketId = market.marketId;
  entry.marketRefId = market.id;
  // The two INSTANTANEOUS shares — this event's own values, not a running sum.
  entry.juniorTrancheYieldShareWAD = event.params.jtYieldShareWAD;
  entry.liquidityTrancheYieldShareWAD = event.params.lptYieldShareWAD;
  // The two RUNNING accumulators as of this tick. A SAWTOOTH, not monotonic: both are
  // zeroed on every premium payout, and that reset carries no event of its own — see
  // the schema note and refreshMarketStoredState.
  entry.juniorTrancheTimeWeightedYieldShareAccruedWAD =
    event.params.twJTYieldShareAccruedWAD;
  entry.liquidityTrancheTimeWeightedYieldShareAccruedWAD =
    event.params.twLPTYieldShareAccruedWAD;
  entry.createdAtTransactionHash = event.transaction.hash.toHexString();
  entry.createdAtBlockNumber = event.block.number;
  entry.createdAtBlockTimestamp = event.block.timestamp;
  entry.save();

  market.countYieldSharesAccruedEntries = entryIndex.plus(BigInt.fromI32(1));

  touchMarket(event, market);
}

export function handleSeniorTrancheProtocolFeeUpdated(
  event: SeniorTrancheProtocolFeeUpdatedEvent,
): void {
  const market = resolveMarketFromAccountant(event);
  if (!market) return;

  market.seniorTrancheProtocolFeeWAD = event.params.stProtocolFeeWAD;
  touchMarket(event, market);
}

export function handleJuniorTrancheProtocolFeeUpdated(
  event: JuniorTrancheProtocolFeeUpdatedEvent,
): void {
  const market = resolveMarketFromAccountant(event);
  if (!market) return;

  market.juniorTrancheProtocolFeeWAD = event.params.jtProtocolFeeWAD;
  touchMarket(event, market);
}

export function handleJuniorTrancheYieldShareProtocolFeeUpdated(
  event: JuniorTrancheYieldShareProtocolFeeUpdatedEvent,
): void {
  const market = resolveMarketFromAccountant(event);
  if (!market) return;

  market.juniorTrancheYieldShareProtocolFeeWAD =
    event.params.jtYieldShareProtocolFeeWAD;
  touchMarket(event, market);
}

export function handleLiquidityTrancheYieldShareProtocolFeeUpdated(
  event: LiquidityProviderTrancheYieldShareProtocolFeeUpdatedEvent,
): void {
  const market = resolveMarketFromAccountant(event);
  if (!market) return;

  market.liquidityTrancheYieldShareProtocolFeeWAD =
    event.params.lptYieldShareProtocolFeeWAD;
  touchMarket(event, market);
}

/**
 * The market's dust tolerance.
 *
 * ONE handler, one field. v1 had TWO events (senior + junior) writing three columns,
 * because the accountant kept a per-tranche tolerance plus a cached
 * `effectiveNAVDustTolerance = st + jt` that had NO event of its own — so both handlers
 * had to recompute that sum or the column drifted permanently stale, silently.
 *
 * v2 deletes the whole hazard: senior and junior share one collateral asset, so there is
 * one tolerance, it has its own event, and it carries its new value. Nothing to
 * recompute and nothing to keep in sync.
 */
export function handleDustToleranceUpdated(
  event: DustToleranceUpdatedEvent,
): void {
  const market = resolveMarketFromAccountant(event);
  if (!market) return;

  market.dustTolerance = event.params.dustTolerance;
  touchMarket(event, market);
}

/**
 * The JUNIOR tranche's YDM.
 *
 * The factory sources this field from `result.ydm` — the DeploymentResult names
 * the junior YDM `ydm`, not `jtYdm` (§6). This event names it `jtYDM`, so the
 * transposition trap that exists at the factory does not exist here.
 */
export function handleJuniorTrancheYDMUpdated(
  event: JuniorTrancheYDMUpdatedEvent,
): void {
  const market = resolveMarketFromAccountant(event);
  if (!market) return;

  market.juniorTrancheYdmAddress = event.params.jtYDM.toHexString();
  touchMarket(event, market);
}

export function handleLiquidityTrancheYDMUpdated(
  event: LiquidityProviderTrancheYDMUpdatedEvent,
): void {
  const market = resolveMarketFromAccountant(event);
  if (!market) return;

  market.liquidityTrancheYdmAddress = event.params.lptYDM.toHexString();
  touchMarket(event, market);
}
