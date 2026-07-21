import { BigInt } from "@graphprotocol/graph-ts";
import {
  TrancheAccountingSynced as TrancheAccountingSyncedEvent,
  MaxYieldSharesUpdated as MaxYieldSharesUpdatedEvent,
  JuniorTrancheYieldShareAccrued as JuniorTrancheYieldShareAccruedEvent,
  LiquidityTrancheYieldShareAccrued as LiquidityTrancheYieldShareAccruedEvent,
  FixedTermCommenced as FixedTermCommencedEvent,
  FixedTermEnded as FixedTermEndedEvent,
  FixedTermDurationUpdated as FixedTermDurationUpdatedEvent,
  CoverageUpdated as CoverageUpdatedEvent,
  LiquidityUpdated as LiquidityUpdatedEvent,
  LiquidationCoverageUtilizationUpdated as LiquidationCoverageUtilizationUpdatedEvent,
  SeniorTrancheProtocolFeeUpdated as SeniorTrancheProtocolFeeUpdatedEvent,
  JuniorTrancheProtocolFeeUpdated as JuniorTrancheProtocolFeeUpdatedEvent,
  JuniorTrancheYieldShareProtocolFeeUpdated as JuniorTrancheYieldShareProtocolFeeUpdatedEvent,
  LiquidityTrancheYieldShareProtocolFeeUpdated as LiquidityTrancheYieldShareProtocolFeeUpdatedEvent,
  SeniorTrancheDustToleranceUpdated as SeniorTrancheDustToleranceUpdatedEvent,
  JuniorTrancheDustToleranceUpdated as JuniorTrancheDustToleranceUpdatedEvent,
  JuniorTrancheCoverageImpermanentLossReset as JuniorTrancheCoverageImpermanentLossResetEvent,
  JuniorTrancheYDMUpdated as JuniorTrancheYDMUpdatedEvent,
  LiquidityTrancheYDMUpdated as LiquidityTrancheYDMUpdatedEvent,
} from "../generated/templates/RoycoDayAccountant/RoycoDayAccountant";
import {
  DayFixedTermHistory,
  DayJuniorTrancheYieldSharesAccruedHistory,
  DayLiquidityTrancheYieldSharesAccruedHistory,
  DayTrancheAccountingSyncedHistory,
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
import { CHAIN_ID, MARKET_STATE_FIXED, MARKET_STATE_PERPETUAL } from "./constants";

/**
 * RoycoDayAccountant — the market's config and accounting surface.
 *
 * EVERY handler here starts with resolveMarketFromAccountant() and returns on
 * null. The accountant address is NOT the marketId (§6), and the market may not
 * exist yet: initialize() emits CoverageUpdated and FixedTermDurationUpdated
 * during deployMarket, at a LOWER log index than the MarketDeploymentCompleted
 * that creates this template and writes the market.
 *
 * These are config events and they carry the NEW value as their payload, so no
 * handler here re-reads getState(). The one exception is documented on
 * handleSeniorTrancheDustToleranceUpdated.
 *
 * TYPE TRAPS (verified against generated/, see CLAUDE.md §4). Only ONE of the
 * fifteen is not a direct BigInt assign:
 *   FixedTermDurationUpdated(uint24) -> i32     !! needs BigInt.fromI32()
 *   FixedTermCommenced(uint32)       -> BigInt, direct
 *   the *WAD events (uint64)         -> BigInt, direct
 *   the dust tolerances (uint256)    -> BigInt, direct
 *   the YDM events (address)         -> .toHexString()
 *
 * handleTrancheAccountingSynced is the one HOT handler here — see its own note.
 */

/**
 * The market's accounting was re-synced. TWO writes, and only two:
 *
 *   A. DayMarketState's PREVIEW BLOCK — exactly TEN of the event's eighteen fields.
 *   B. DayTrancheAccountingSyncedHistory — ALL EIGHTEEN, verbatim, one immutable
 *      row per sync (the full unabridged history this event carries).
 *
 * The asymmetry is deliberate. (B) is a fresh, write-once row keyed by a per-sync
 * entryIndex, so copying the whole payload into it is not just safe but the point.
 * (A) is a shared MUTABLE row, and copying the payload there is wrong three ways —
 * the reasons the other eight fields are dropped FROM DayMarketState (never from B):
 *
 *   1. ALREADY OWNED — marketState and fixedTermEndTimestamp belong to the
 *      fixed-term handlers; minCoverageWAD, minLiquidityWAD and
 *      coverageLiquidationUtilizationWAD to the config handlers above. Writing
 *      them onto DayMarketState here would make each field's value depend on log
 *      ORDER. The hazard is real, not theoretical: setCoverage carries
 *      `withSyncedAccounting`, so it emits TrancheAccountingSynced (carrying the
 *      OLD coverage) BEFORE CoverageUpdated (the new one). Today the config handler
 *      runs second and wins. Swap those two emits in the contract and this handler
 *      would silently revert every config change. One writer per DayMarketState field.
 *
 *   2. THE §6 DIVERGENCE TRAP — minCoverageWAD exists in BOTH this struct and
 *      Accountant.getState(), under the SAME NAME and a different width. The
 *      schema deliberately stores the getState() one on DayMarketState. Reading it
 *      from here into DayMarketState compiles, indexes, and is wrong forever; it is
 *      exactly the bug the factory handler shipped with. (B) records the LIVE
 *      struct value under its own column — the two live in different tables and do
 *      not collide. The `<- ABI:` annotations in schema.graphql are the authority.
 *
 *   3. NO DayMarketState HOME — state.stProtocolFee / jtProtocolFee / ltProtocolFee
 *      are NAV_UNIT AMOUNTS ("protocol fee taken on ST yield ON THIS SYNC"). The
 *      schema's seniorTrancheProtocolFeeWAD is a uint64 RATE from
 *      getState().stProtocolFeeWAD. Different type, different unit, one word apart.
 *      They are per-sync deltas and DayMarketState is a current-state snapshot, so
 *      they are dropped THERE — but they DO have a home now: (B)'s
 *      seniorTrancheProtocolFee / juniorTrancheProtocolFee / liquidityTrancheProtocolFee.
 *      That history row is the "own entity" the previous note said they needed.
 *
 * ZERO CONTRACT CALLS by design. The event IS the post-state at this log index,
 * which is why §5 says prefer it over previewSyncTrancheAccounting.
 *
 * !! HOT PATH. This is not a config event. The LT's Balancer V3 pool hook holds
 *    SYNC_ROLE and its onBeforeSwap calls syncTrancheAccounting()
 *    unconditionally, so EVERY SWAP against that pool — including a
 *    permissionless arb bot's — lands here. It is immune to share-transfer volume
 *    (a plain ERC20 transfer never syncs: that path dead-ends in an empty
 *    _preTrancheBalanceUpdate) but fully exposed to AMM volume. That makes
 *    DayTrancheAccountingSyncedHistory the highest-cardinality entity in the
 *    schema, and the per-event KERNEL() hop in resolveMarketFromAccountant the one
 *    eth_call cost in this file — see the note there.
 *
 * Deliberately does NOT refresh DayVaultState. At swap frequency that would be
 * ~6 eth_calls and 3 immutable history rows PER SWAP. The split is intentional:
 * market-level accounting is live (free, from this payload) and (B) is one cheap
 * call-free immutable row; per-vault claims stay sampled at mint/burn.
 */
export function handleTrancheAccountingSynced(
  event: TrancheAccountingSyncedEvent
): void {
  const market = resolveMarketFromAccountant(event);
  if (!market) return;

  const state = event.params.resultingState;

  // (A) DayMarketState LIVE preview block — TEN fields; the other eight are owned
  //     elsewhere or have no current-state home (see the docstring). Do NOT add to
  //     this list without re-reading it.
  market.seniorTrancheRawNAV = state.stRawNAV;
  market.juniorTrancheRawNAV = state.jtRawNAV;
  market.liquidityTrancheRawNAV = state.ltRawNAV;
  market.seniorTrancheEffectiveNAV = state.stEffectiveNAV;
  market.juniorTrancheEffectiveNAV = state.jtEffectiveNAV;
  market.juniorTrancheCoverageImpermanentLoss = state.jtCoverageImpermanentLoss;
  market.liquidityTrancheLiquidityPremium = state.ltLiquidityPremium;
  market.coverageUtilizationWAD = state.coverageUtilizationWAD;
  market.liquidityUtilizationWAD = state.liquidityUtilizationWAD;
  market.isJuniorTrancheCoinvested = state.jtCoinvested;

  // (B) DayTrancheAccountingSyncedHistory — the full 18-field struct, verbatim.
  //     Use-then-increment: the count IS the next entryIndex, so the first sync is
  //     entry 0 and the count becomes 1 (§ ENTRY INDEX CURSOR in schema.graphql).
  const entryIndex = market.countTrancheAccountingSyncedEntries;
  const entry = new DayTrancheAccountingSyncedHistory(
    generateMarketRecordId(market.marketId, entryIndex)
  );
  entry.chainId = CHAIN_ID;
  entry.marketId = market.marketId;
  entry.marketRefId = market.id;
  entry.entryIndex = entryIndex;
  // The LIVE market state carried by the sync — NOT market.marketState, which is the
  // STORED lastMarketState owned by the fixed-term handlers (§6). uint8 -> i32.
  entry.marketState = liveMarketStateName(state.marketState);
  entry.seniorTrancheRawNAV = state.stRawNAV;
  entry.juniorTrancheRawNAV = state.jtRawNAV;
  entry.liquidityTrancheRawNAV = state.ltRawNAV;
  entry.seniorTrancheEffectiveNAV = state.stEffectiveNAV;
  entry.juniorTrancheEffectiveNAV = state.jtEffectiveNAV;
  entry.juniorTrancheCoverageImpermanentLoss = state.jtCoverageImpermanentLoss;
  entry.liquidityTrancheLiquidityPremium = state.ltLiquidityPremium;
  // The per-sync protocol-fee AMOUNTS (NAV_UNIT) — dropped from DayMarketState (case
  // 3 in the docstring), recorded here. NOT the getState() *ProtocolFeeWAD rates.
  entry.seniorTrancheProtocolFee = state.stProtocolFee;
  entry.juniorTrancheProtocolFee = state.jtProtocolFee;
  entry.liquidityTrancheProtocolFee = state.ltProtocolFee;
  entry.coverageUtilizationWAD = state.coverageUtilizationWAD;
  entry.liquidityUtilizationWAD = state.liquidityUtilizationWAD;
  // uint32 -> BigInt, direct (§4).
  entry.fixedTermEndTimestamp = state.fixedTermEndTimestamp;
  entry.minCoverageWAD = state.minCoverageWAD;
  entry.isJuniorTrancheCoinvested = state.jtCoinvested;
  entry.coverageLiquidationUtilizationWAD = state.coverageLiquidationUtilizationWAD;
  entry.minLiquidityWAD = state.minLiquidityWAD;
  // Immutable — createdAt* only, no updatedAt* (§8).
  entry.createdAtTransactionHash = event.transaction.hash.toHexString();
  entry.createdAtBlockNumber = event.block.number;
  entry.createdAtBlockTimestamp = event.block.timestamp;
  entry.save();

  market.countTrancheAccountingSyncedEntries = entryIndex.plus(BigInt.fromI32(1));

  touchMarket(event, market);
}

/**
 * Map the sync's LIVE state.marketState (uint8 -> i32) onto its schema string, for
 * DayTrancheAccountingSyncedHistory. The enum is `MarketState { PERPETUAL, FIXED_TERM }`
 * (contracts/libraries/Types.sol), so 0 is PERPETUAL — it reads backwards (§6). This
 * is the factory's marketStateName twin, but for the LIVE value; the factory maps the
 * STORED lastMarketState. Kept local rather than shared so neither file's meaning is
 * silently coupled to the other's.
 */
function liveMarketStateName(marketState: i32): string {
  return marketState == 0 ? MARKET_STATE_PERPETUAL : MARKET_STATE_FIXED;
}

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
    generateMarketRecordId(market.marketId, entryIndex)
  );
  entry.chainId = CHAIN_ID;
  entry.marketId = market.marketId;
  entry.marketRefId = market.id;
  entry.entryIndex = entryIndex;
  entry.startBlockTimestamp = event.block.timestamp;
  entry.scheduledEndBlockTimestamp = event.params.fixedTermEndTimestamp;
  // Open. closeOpenFixedTerm keys off exactly this, and so do consumers.
  entry.endBlockTimestamp = BigInt.zero();
  // Seeded because it is non-null and unset is fatal at index time (§8). It stays
  // zero unless the term ends with a real coverage loss, which arrives later and
  // out-of-band via handleJuniorTrancheCoverageImpermanentLossReset — the erased
  // value exists in that event and nowhere else.
  entry.juniorTrancheCoverageImpermanentLossNAV = BigInt.zero();

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
export function handleFixedTermDurationUpdated(
  event: FixedTermDurationUpdatedEvent
): void {
  const market = resolveMarketFromAccountant(event);
  if (!market) return;

  // uint24 -> i32. THE one lift in this file; its uint32/uint64 neighbours are
  // direct assigns (§4).
  market.fixedTermDurationSeconds = BigInt.fromI32(
    event.params.fixedTermDurationSeconds
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

/**
 * The JT coverage impermanent loss that was erased — the ONLY witness to that
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
 *   2. DayFixedTermHistory.juniorTrancheCoverageImpermanentLossNAV — PER-TERM, and
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
 * It does NOT touch juniorTrancheCoverageImpermanentLoss — that is the LIVE value
 * from the preview block and belongs to handleTrancheAccountingSynced (still a
 * stub). See the schema note: the two names differ by one word and mean opposite
 * things.
 */
export function handleJuniorTrancheCoverageImpermanentLossReset(
  event: JuniorTrancheCoverageImpermanentLossResetEvent
): void {
  const market = resolveMarketFromAccountant(event);
  if (!market) return;

  const erased = event.params.jtCoverageImpermanentLossErased;
  // Nothing was erased — only the UNGUARDED setFixedTermDuration(0) site emits
  // this, and it never means anything happened. Returning keeps updatedAt* honest:
  // no field changed.
  if (erased.isZero()) return;

  market.juniorTrancheCoverageLossNAV =
    market.juniorTrancheCoverageLossNAV.plus(erased);
  touchMarket(event, market);

  recordFixedTermCoverageLoss(event, market, erased);
}

// =============================================================================
// CONFIG — each event carries its own new value; no contract reads needed.
// =============================================================================

export function handleCoverageUpdated(event: CoverageUpdatedEvent): void {
  const market = resolveMarketFromAccountant(event);
  if (!market) return;

  market.minCoverageWAD = event.params.minCoverageWAD;
  touchMarket(event, market);
}

export function handleLiquidityUpdated(event: LiquidityUpdatedEvent): void {
  const market = resolveMarketFromAccountant(event);
  if (!market) return;

  market.minLiquidityWAD = event.params.minLiquidityWAD;
  touchMarket(event, market);
}

export function handleLiquidationCoverageUtilizationUpdated(
  event: LiquidationCoverageUtilizationUpdatedEvent
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
  event: MaxYieldSharesUpdatedEvent
): void {
  const market = resolveMarketFromAccountant(event);
  if (!market) return;

  market.maxJuniorTrancheYieldShareAccruedWAD = event.params.maxJTYieldShareWAD;
  market.maxLiquidityTrancheYieldShareAccruedWAD = event.params.maxLTYieldShareWAD;
  touchMarket(event, market);
}

/**
 * A junior yield-share accrual tick. Emitted whenever a tranche interaction advances
 * the clock (elapsed > 0 — RoycoDayAccountant.sol:755,767), always paired with its
 * liquidity twin at an adjacent log index.
 *
 * SOLE UPDATER of DayMarketState.timeWeightedJuniorTrancheYieldShareAccruedWAD. The
 * running total (twJTYieldShareAccruedWAD) rides on THIS event and is NOT in the
 * TrancheAccountingSynced state tuple, so nothing else can advance the field — it
 * would otherwise freeze at the factory's deploy seed. Also appends the per-tick
 * history row. No zero guard: a tick with a 0 instantaneous share still reports the
 * authoritative running total and is a real accrual step.
 */
export function handleJuniorTrancheYieldShareAccrued(
  event: JuniorTrancheYieldShareAccruedEvent
): void {
  const market = resolveMarketFromAccountant(event);
  if (!market) return;

  market.timeWeightedJuniorTrancheYieldShareAccruedWAD =
    event.params.twJTYieldShareAccruedWAD;

  // Use-then-increment: the count IS the next entryIndex; the first tick is 0.
  const entryIndex = market.countJuniorTrancheYieldSharesAccruedEntries;

  const entry = new DayJuniorTrancheYieldSharesAccruedHistory(
    generateMarketRecordId(market.marketId, entryIndex)
  );
  entry.chainId = CHAIN_ID;
  entry.marketId = market.marketId;
  entry.marketRefId = market.id;
  entry.entryIndex = entryIndex;
  entry.yieldShareWAD = event.params.jtYieldShareWAD; // <- ABI: jtYieldShareWAD
  entry.timeWeightedYieldShareAccruedWAD =
    event.params.twJTYieldShareAccruedWAD; // <- ABI: twJTYieldShareAccruedWAD
  entry.createdAtTransactionHash = event.transaction.hash.toHexString();
  entry.createdAtBlockNumber = event.block.number;
  entry.createdAtBlockTimestamp = event.block.timestamp;
  entry.save();

  market.countJuniorTrancheYieldSharesAccruedEntries = entryIndex.plus(
    BigInt.fromI32(1)
  );
  touchMarket(event, market);
}

/**
 * The liquidity-tranche twin of handleJuniorTrancheYieldShareAccrued — identical
 * shape, its own event params (lt*), entity, cursor and timeWeighted* field.
 */
export function handleLiquidityTrancheYieldShareAccrued(
  event: LiquidityTrancheYieldShareAccruedEvent
): void {
  const market = resolveMarketFromAccountant(event);
  if (!market) return;

  market.timeWeightedLiquidityTrancheYieldShareAccruedWAD =
    event.params.twLTYieldShareAccruedWAD;

  const entryIndex = market.countLiquidityTrancheYieldSharesAccruedEntries;

  const entry = new DayLiquidityTrancheYieldSharesAccruedHistory(
    generateMarketRecordId(market.marketId, entryIndex)
  );
  entry.chainId = CHAIN_ID;
  entry.marketId = market.marketId;
  entry.marketRefId = market.id;
  entry.entryIndex = entryIndex;
  entry.yieldShareWAD = event.params.ltYieldShareWAD; // <- ABI: ltYieldShareWAD
  entry.timeWeightedYieldShareAccruedWAD =
    event.params.twLTYieldShareAccruedWAD; // <- ABI: twLTYieldShareAccruedWAD
  entry.createdAtTransactionHash = event.transaction.hash.toHexString();
  entry.createdAtBlockNumber = event.block.number;
  entry.createdAtBlockTimestamp = event.block.timestamp;
  entry.save();

  market.countLiquidityTrancheYieldSharesAccruedEntries = entryIndex.plus(
    BigInt.fromI32(1)
  );
  touchMarket(event, market);
}

export function handleSeniorTrancheProtocolFeeUpdated(
  event: SeniorTrancheProtocolFeeUpdatedEvent
): void {
  const market = resolveMarketFromAccountant(event);
  if (!market) return;

  market.seniorTrancheProtocolFeeWAD = event.params.stProtocolFeeWAD;
  touchMarket(event, market);
}

export function handleJuniorTrancheProtocolFeeUpdated(
  event: JuniorTrancheProtocolFeeUpdatedEvent
): void {
  const market = resolveMarketFromAccountant(event);
  if (!market) return;

  market.juniorTrancheProtocolFeeWAD = event.params.jtProtocolFeeWAD;
  touchMarket(event, market);
}

export function handleJuniorTrancheYieldShareProtocolFeeUpdated(
  event: JuniorTrancheYieldShareProtocolFeeUpdatedEvent
): void {
  const market = resolveMarketFromAccountant(event);
  if (!market) return;

  market.juniorTrancheYieldShareProtocolFeeWAD =
    event.params.jtYieldShareProtocolFeeWAD;
  touchMarket(event, market);
}

export function handleLiquidityTrancheYieldShareProtocolFeeUpdated(
  event: LiquidityTrancheYieldShareProtocolFeeUpdatedEvent
): void {
  const market = resolveMarketFromAccountant(event);
  if (!market) return;

  market.liquidityTrancheYieldShareProtocolFeeWAD =
    event.params.ltYieldShareProtocolFeeWAD;
  touchMarket(event, market);
}

/**
 * !! THIS HANDLER WRITES TWO FIELDS, AND THE SECOND ONE HAS NO EVENT.
 *
 * setSeniorTrancheDustTolerance also recomputes a cached
 * `effectiveNAVDustTolerance = stNAVDustTolerance + jtNAVDustTolerance` in the
 * same call — and the contract emits NOTHING for it. There is no
 * EffectiveNAVDustToleranceUpdated event anywhere in the ABI.
 *
 * So DayMarketState.effectiveNAVDustTolerance, seeded from getState() at
 * creation, would drift permanently stale the first time either tolerance moved.
 * Nothing would error; the column would simply stop matching the chain.
 *
 * We recompute it here from the event's new ST value and the market's current JT
 * value rather than calling getState(): the entity already holds the JT value, so
 * the sum is exact and free. The mirror of this lives on the JT handler below —
 * change one and you must change the other.
 */
export function handleSeniorTrancheDustToleranceUpdated(
  event: SeniorTrancheDustToleranceUpdatedEvent
): void {
  const market = resolveMarketFromAccountant(event);
  if (!market) return;

  market.seniorTrancheDustTolerance = event.params.stNAVDustTolerance;
  market.effectiveNAVDustTolerance = event.params.stNAVDustTolerance.plus(
    market.juniorTrancheDustTolerance
  );
  touchMarket(event, market);
}

/** The mirror of the ST handler above — read its note; the same silent field applies. */
export function handleJuniorTrancheDustToleranceUpdated(
  event: JuniorTrancheDustToleranceUpdatedEvent
): void {
  const market = resolveMarketFromAccountant(event);
  if (!market) return;

  market.juniorTrancheDustTolerance = event.params.jtNAVDustTolerance;
  market.effectiveNAVDustTolerance = market.seniorTrancheDustTolerance.plus(
    event.params.jtNAVDustTolerance
  );
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
  event: JuniorTrancheYDMUpdatedEvent
): void {
  const market = resolveMarketFromAccountant(event);
  if (!market) return;

  market.juniorTrancheYdmAddress = event.params.jtYDM.toHexString();
  touchMarket(event, market);
}

export function handleLiquidityTrancheYDMUpdated(
  event: LiquidityTrancheYDMUpdatedEvent
): void {
  const market = resolveMarketFromAccountant(event);
  if (!market) return;

  market.liquidityTrancheYdmAddress = event.params.ltYDM.toHexString();
  touchMarket(event, market);
}
