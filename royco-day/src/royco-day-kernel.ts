import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  ProtocolFeeRecipientUpdated as ProtocolFeeRecipientUpdatedEvent,
  SeniorTrancheSelfLiquidationBonusUpdated as SeniorTrancheSelfLiquidationBonusUpdatedEvent,
  LiquidityPremiumReinvested as LiquidityPremiumReinvestedEvent,
  LiquidityPremiumReinvestmentFailed as LiquidityPremiumReinvestmentFailedEvent,
  CollateralAssetOracleUpdated as CollateralAssetOracleUpdatedEvent,
  SequencerUptimeFeedUpdated as SequencerUptimeFeedUpdatedEvent,
  PreOpTrancheAccountingSynced as PreOpTrancheAccountingSyncedEvent,
  PostOpTrancheAccountingSynced as PostOpTrancheAccountingSyncedEvent,
} from "../generated/templates/RoycoDayKernel/RoycoDayKernel";
import {
  DayMarketState,
  DayLiquidityPremiumReinvestedHistory,
  DayLiquidityPremiumReinvestmentFailedHistory,
  DayTrancheAccountingSyncedHistory,
} from "../generated/schema";
import {
  generateMarketId,
  generateMarketRecordId,
  generateMarketBlockRecordId,
} from "./utils";
import { touchMarket } from "./handlers/base/resolve-market";
import { refreshMarketNav } from "./handlers/base/market-nav";
import {
  CHAIN_ID,
  MARKET_STATE_FIXED,
  MARKET_STATE_PERPETUAL,
  OPERATION_ST_DEPOSIT,
  OPERATION_ST_REDEEM,
  OPERATION_JT_DEPOSIT,
  OPERATION_JT_REDEEM,
  OPERATION_LPT_DEPOSIT,
  OPERATION_LPT_REDEEM,
  OPERATION_LPT_MULTI_ASSET_DEPOSIT,
  OPERATION_LPT_MULTI_ASSET_REDEEM,
  OPERATION_UNKNOWN,
  SYNC_TYPE_PRE_OP,
  SYNC_TYPE_POST_OP,
} from "./constants";

/**
 * RoycoDayKernel — the market's execution surface.
 *
 * Unlike the accountant, THE KERNEL ADDRESS IS THE MARKET ID (§6), so the lookup
 * is direct and costs no eth_call. Contrast
 * src/handlers/base/resolve-market.ts, which must hop accountant -> KERNEL() on
 * every accountant event. Do not import resolveMarketFromAccountant here.
 *
 * The null guard is still required. In practice it is unreachable — the factory
 * creates this template in the same handler that writes the market — but the
 * early-return is where an ordering bug would surface if that stopped being true,
 * and it costs nothing.
 *
 * Every handler carries its new value on the event, so none reads getState().
 *
 * The two config setters update DayMarketState in place. The two liquidity-premium
 * reinvestment events are RECORD streams (DayLiquidityPremiumReinvested/Reinvestment
 * FailedHistory): they append an immutable row and bump the market's cursor, and own
 * NO shares/positions/supply — the Reinvested success only moves kernel-internal
 * accounting ($.ltOwned*, BalancerV3VenueLogic.sol:208-209), not an indexed Transfer,
 * and the Failed case mutates nothing at all (:195-198). The reinvest events fire
 * from a library inlined into the kernel, so event.address is the kernel (= marketId)
 * and resolution stays direct.
 *
 * NOT INDEXED, deliberately:
 *   RoycoBlacklistUpdated — Kernel.getState().roycoBlacklist has no schema field.
 *     Add the field and the handler together, or neither; schema.graphql says so
 *     at the Kernel block.
 */
export function handleProtocolFeeRecipientUpdated(
  event: ProtocolFeeRecipientUpdatedEvent
): void {
  const market = DayMarketState.load(
    generateMarketId(event.address.toHexString())
  );
  if (!market) return;

  market.protocolFeeRecipientAddress =
    event.params.protocolFeeRecipient.toHexString();
  touchMarket(event, market);
}

export function handleSeniorTrancheSelfLiquidationBonusUpdated(
  event: SeniorTrancheSelfLiquidationBonusUpdatedEvent
): void {
  const market = DayMarketState.load(
    generateMarketId(event.address.toHexString())
  );
  if (!market) return;

  // uint64 -> BigInt, assign direct. The uint24 lift that bites in the accountant
  // has no equivalent here (§4).
  market.seniorTrancheSelfLiquidationBonusWAD =
    event.params.stSelfLiquidationBonusWAD;
  touchMarket(event, market);
}

/**
 * The idle liquidity-premium ST shares were successfully reinvested into the LT's
 * venue position. A pure record: append the row + bump the cursor; the share/asset
 * moves are kernel-internal accounting, not indexed Transfers.
 */
export function handleLiquidityPremiumReinvested(
  event: LiquidityPremiumReinvestedEvent
): void {
  const market = DayMarketState.load(
    generateMarketId(event.address.toHexString())
  );
  if (!market) return;

  // ONE ROW PER EVENT — this stream does NOT collapse. Use-then-increment: the count
  // IS the next entryIndex (see "ENTRY INDEX CURSOR" in schema.graphql).
  const entryIndex = market.countLiquidityPremiumReinvestedEntries;

  const entry = new DayLiquidityPremiumReinvestedHistory(
    generateMarketRecordId(market.marketId, entryIndex)
  );
  entry.entryIndex = entryIndex;
  entry.chainId = CHAIN_ID;
  entry.marketId = market.marketId;
  entry.marketRefId = market.id;
  // REALISED amounts, this event's own. Never sum these with the Failed stream's
  // identically-named columns (see the schema note).
  entry.shares = event.params.stSharesReinvested; // <- ABI: stSharesReinvested
  entry.assets = event.params.lptAssetsMinted; // <- ABI: lptAssetsMinted
  entry.createdAtTransactionHash = event.transaction.hash.toHexString();
  entry.createdAtBlockNumber = event.block.number;
  entry.createdAtBlockTimestamp = event.block.timestamp;
  entry.save();

  market.countLiquidityPremiumReinvestedEntries = entryIndex.plus(BigInt.fromI32(1));
  // Persists the cursor bump as well as updatedAt*.
  touchMarket(event, market);
}

/**
 * The collateral asset's price oracle, and how stale a reading may be before the kernel
 * rejects it. Both arrive on one event, and both are pure config — no contract read.
 *
 * uint48 -> BigInt, direct. Only uint24-and-below decode to i32 and need
 * BigInt.fromI32 (§4); this is comfortably above that line.
 */
export function handleCollateralAssetOracleUpdated(
  event: CollateralAssetOracleUpdatedEvent
): void {
  const market = DayMarketState.load(
    generateMarketId(event.address.toHexString())
  );
  if (!market) return;

  market.collateralAssetOracleAddress =
    event.params.collateralAssetOracle.toHexString();
  market.collateralAssetOracleStalenessThresholdSeconds =
    event.params.stalenessThresholdSeconds;
  touchMarket(event, market);
}

/**
 * The L2 sequencer-uptime feed and its post-downtime grace period — the twin of the
 * oracle handler above. On a chain with no sequencer feed this simply never fires and
 * the columns keep their creation values.
 */
export function handleSequencerUptimeFeedUpdated(
  event: SequencerUptimeFeedUpdatedEvent
): void {
  const market = DayMarketState.load(
    generateMarketId(event.address.toHexString())
  );
  if (!market) return;

  market.sequencerUptimeFeedAddress =
    event.params.sequencerUptimeFeed.toHexString();
  market.sequencerUptimeFeedGracePeriodSeconds = event.params.gracePeriodSeconds;
  touchMarket(event, market);
}

/**
 * A reinvestment ATTEMPT reverted (breached gate or venue revert); the premium
 * shares stayed idle and nothing was moved. `shares`/`assets` here are the ATTEMPT
 * and its slippage floor, NOT realised amounts — never sum them with the Reinvested
 * stream's identically-named columns (see the schema note).
 */
export function handleLiquidityPremiumReinvestmentFailed(
  event: LiquidityPremiumReinvestmentFailedEvent
): void {
  const market = DayMarketState.load(
    generateMarketId(event.address.toHexString())
  );
  if (!market) return;

  // ONE ROW PER EVENT — this stream does NOT collapse, and here that matters most: a
  // block can hold a failed attempt AND a later successful retry, and each failure
  // carries its own revertData. Collapsing would keep only the last reason.
  const entryIndex = market.countLiquidityPremiumReinvestmentFailedEntries;

  const entry = new DayLiquidityPremiumReinvestmentFailedHistory(
    generateMarketRecordId(market.marketId, entryIndex)
  );
  entry.entryIndex = entryIndex;
  entry.chainId = CHAIN_ID;
  entry.marketId = market.marketId;
  entry.marketRefId = market.id;
  // An ATTEMPT and a BOUND, not realised amounts — this event's own values.
  entry.shares = event.params.stSharesToReinvest; // <- ABI: stSharesToReinvest
  entry.assets = event.params.minLPTAssetsOut; // <- ABI: minLPTAssetsOut
  entry.revertData = event.params.revertData.toHexString(); // <- ABI: revertData (bytes -> hex, §4)
  entry.createdAtTransactionHash = event.transaction.hash.toHexString();
  entry.createdAtBlockNumber = event.block.number;
  entry.createdAtBlockTimestamp = event.block.timestamp;
  entry.save();

  market.countLiquidityPremiumReinvestmentFailedEntries = entryIndex.plus(
    BigInt.fromI32(1)
  );
  // Persists the cursor bump as well as updatedAt*.
  touchMarket(event, market);
}

/**
 * A handler-local copy of `SyncedAccountingState`, decoded by name.
 *
 * WHY THIS EXISTS: codegen emits a DISTINCT struct class per event, and each reads its
 * sixteen members POSITIONALLY. Handing PreOp's struct to code typed against PostOp's
 * compiles only by accident of layout and would read the payload through the wrong
 * slots the moment either event's field order moved — the exact silent transposition
 * the shared-handler design exists to avoid (same rule as RedeemClaims in
 * src/handlers/tranche/claims.ts, and the tranche entry files).
 *
 * Each handler copies into this BY NAME, so `asc` fails on the drifting event's own
 * copy function and names the member.
 *
 * Mutable fields with defaults, never a positional constructor: sixteen same-typed
 * values in a row guarantee a transposition eventually (§3).
 */
class SyncedState {
  marketState: i32 = 0;
  collateralNAV: BigInt = BigInt.zero();
  lptRawNAV: BigInt = BigInt.zero();
  stEffectiveNAV: BigInt = BigInt.zero();
  jtEffectiveNAV: BigInt = BigInt.zero();
  jtImpermanentLoss: BigInt = BigInt.zero();
  lptLiquidityPremium: BigInt = BigInt.zero();
  stProtocolFee: BigInt = BigInt.zero();
  jtProtocolFee: BigInt = BigInt.zero();
  lptProtocolFee: BigInt = BigInt.zero();
  coverageUtilizationWAD: BigInt = BigInt.zero();
  liquidityUtilizationWAD: BigInt = BigInt.zero();
  fixedTermEndTimestamp: BigInt = BigInt.zero();
  minCoverageWAD: BigInt = BigInt.zero();
  coverageLiquidationUtilizationWAD: BigInt = BigInt.zero();
  minLiquidityWAD: BigInt = BigInt.zero();
}

/**
 * BOTH kernel sync events land here, and they COLLAPSE PER BLOCK.
 *
 *   PreOpTrancheAccountingSynced  — fires on EVERY sync: the liquidity venue's swap
 *                                   hook, oracle updates, syncTrancheAccounting,
 *                                   reinvestLiquidityPremium, and the first half of
 *                                   every deposit and redemption.
 *   PostOpTrancheAccountingSynced — fires only on the eight deposit/redeem operations,
 *                                   carrying the settled state plus the `op` enum.
 *
 * THE COLLAPSE RULE: one DayTrancheAccountingSyncedHistory row per (market, block).
 * The first sync in a block creates it; every later sync in that same block
 * OVERWRITES it. So a swap-only block leaves a `preOp` row, and a
 * deposit block leaves a `postOp` row because the post-op fires second and wins.
 *
 * That is why the id is keyed by BLOCK NUMBER and why the entity is `immutable: false`
 * — CLAUDE.md §8's "never derive an id from a block number, two writes collide" is
 * inverted here on purpose: the collision IS the dedupe. On an immutable entity the
 * second save would be fatal at index time. See generateMarketBlockRecordId.
 *
 * THREE WRITES:
 *   A. DayMarketState's PREVIEW BLOCK — the live market-level accounting. Naturally
 *      last-write-wins, since it is a single mutable row.
 *   B. DayTrancheAccountingSyncedHistory — the full 16-field state, upserted per block.
 *   C. DayMarketNav (+Historical) — the market's price vector, RE-READ from the
 *      contracts. (A) and (B) come free off the payload; (C) does not.
 *
 * (C) COLLAPSES THE SAME WAY. DayMarketNavHistorical is also keyed by (market, block)
 * and also mutable, so a deposit block leaves ONE nav snapshot carrying the block's
 * final prices, exactly as this table leaves one sync row. Its eth_calls are still paid
 * per sync — the values have to be read before they can be known to be the last ones —
 * but the row count matches.
 *
 * !! THE PLACEHOLDER ZEROES ARE GONE. v1's single sync marshalled `lptRawNAV` and
 *    `liquidityUtilizationWAD` as zero placeholders, leaving both columns permanently 0.
 *    Both events now emit AFTER _commitLPTRawNAV, which refreshes the pair in the state
 *    packet in place, so every field is real.
 *
 * The (A)/(B) asymmetry is unchanged from v1: (B) is this block's own row, so copying
 * the whole payload into it is the point; (A) is shared and MUTABLE, so the members
 * owned by the fixed-term and config handlers are NOT written here — one writer per
 * DayMarketState field, or the value would depend on log order.
 */
export function handlePreOpTrancheAccountingSynced(
  event: PreOpTrancheAccountingSyncedEvent
): void {
  // A pre-op sync precedes any operation, so there is no `op` to record: the row's
  // `operation` column stays null until a post-op in the same block overwrites it.
  recordSync(event, preOpState(event), SYNC_TYPE_PRE_OP, -1);
}

export function handlePostOpTrancheAccountingSynced(
  event: PostOpTrancheAccountingSyncedEvent
): void {
  recordSync(event, postOpState(event), SYNC_TYPE_POST_OP, event.params.op);
}

/**
 * The shared upsert behind both handlers.
 *
 * `op` is -1 for a pre-op sync — a sentinel, not an enum member, chosen because
 * AssemblyScript has no nullable i32 and every real ordinal is >= 0. It maps to a null
 * `operation` column rather than to OPERATION_UNKNOWN, which is reserved for an ordinal
 * the enum grew past.
 *
 * It takes a SyncedState — the by-name decode of whichever event fired — never a raw
 * generated struct. See that class for why.
 */
function recordSync(
  event: ethereum.Event,
  state: SyncedState,
  syncType: string,
  op: i32
): void {
  // THE KERNEL ADDRESS IS THE MARKET ID (§6) — no ACCOUNTANT.KERNEL() hop. In v1 this
  // event lived on the accountant and paid an eth_call per sync just to find its market.
  const market = DayMarketState.load(
    generateMarketId(event.address.toHexString())
  );
  if (!market) return;

  // (A) DayMarketState LIVE preview block.
  market.collateralNAV = state.collateralNAV;
  market.liquidityTrancheRawNAV = state.lptRawNAV;
  market.seniorTrancheEffectiveNAV = state.stEffectiveNAV;
  market.juniorTrancheEffectiveNAV = state.jtEffectiveNAV;
  market.juniorTrancheImpermanentLoss = state.jtImpermanentLoss;
  market.liquidityTrancheLiquidityPremium = state.lptLiquidityPremium;
  market.coverageUtilizationWAD = state.coverageUtilizationWAD;
  market.liquidityUtilizationWAD = state.liquidityUtilizationWAD;

  // (B) The block's row — created by the first sync, overwritten by every later one.
  const id = generateMarketBlockRecordId(market.marketId, event.block.number);
  let entry = DayTrancheAccountingSyncedHistory.load(id);

  if (!entry) {
    entry = new DayTrancheAccountingSyncedHistory(id);
    entry.chainId = CHAIN_ID;
    entry.marketId = market.marketId;
    entry.marketRefId = market.id;
    entry.blockNumber = event.block.number;
    // createdAt* EXACTLY ONCE (§8) — the FIRST sync in this block. A block can span
    // several transactions, so this genuinely differs from updatedAt* when a swap and
    // a deposit share one.
    entry.createdAtTransactionHash = event.transaction.hash.toHexString();
    entry.createdAtBlockNumber = event.block.number;
    entry.createdAtBlockTimestamp = event.block.timestamp;
  }

  entry.syncType = syncType;
  // Null on a pre-op row; set once a post-op settles in this block. Never cleared back
  // to null, because a post-op cannot be followed by a pre-op for the same operation.
  entry.operation = op < 0 ? null : operationName(op);
  entry.marketState = liveMarketStateName(state.marketState);
  entry.collateralNAV = state.collateralNAV;
  entry.liquidityTrancheRawNAV = state.lptRawNAV;
  entry.seniorTrancheEffectiveNAV = state.stEffectiveNAV;
  entry.juniorTrancheEffectiveNAV = state.jtEffectiveNAV;
  entry.juniorTrancheImpermanentLoss = state.jtImpermanentLoss;
  entry.liquidityTrancheLiquidityPremium = state.lptLiquidityPremium;
  entry.seniorTrancheProtocolFee = state.stProtocolFee;
  entry.juniorTrancheProtocolFee = state.jtProtocolFee;
  entry.liquidityTrancheProtocolFee = state.lptProtocolFee;
  entry.coverageUtilizationWAD = state.coverageUtilizationWAD;
  entry.liquidityUtilizationWAD = state.liquidityUtilizationWAD;
  entry.fixedTermEndTimestamp = state.fixedTermEndTimestamp;
  entry.minCoverageWAD = state.minCoverageWAD;
  entry.coverageLiquidationUtilizationWAD = state.coverageLiquidationUtilizationWAD;
  entry.minLiquidityWAD = state.minLiquidityWAD;
  entry.updatedAtTransactionHash = event.transaction.hash.toHexString();
  entry.updatedAtBlockNumber = event.block.number;
  entry.updatedAtBlockTimestamp = event.block.timestamp;
  entry.save();

  // (C) The price vector — see the note above on why this does NOT collapse.
  refreshMarketNav(event, market);

  touchMarket(event, market);
}

/**
 * Map the sync's LIVE state.marketState (uint8 -> i32) onto its schema string. The enum
 * is `MarketState { PERPETUAL, FIXED_TERM }` (contracts/libraries/Types.sol), so 0 is
 * PERPETUAL — it reads backwards (§6). This is the factory's marketStateName twin, but
 * for the LIVE value; the factory maps the STORED lastMarketState. Kept local rather
 * than shared so neither file's meaning is silently coupled to the other's.
 */
function liveMarketStateName(marketState: i32): string {
  return marketState == 0 ? MARKET_STATE_PERPETUAL : MARKET_STATE_FIXED;
}

/**
 * Map PostOpTrancheAccountingSynced's `op` (uint8 -> i32) onto its schema string.
 *
 * Declaration order from contracts/libraries/Types.sol — the ABI carries the enum's
 * TYPE but none of its member names, so this is read from source, never inferred (§4).
 * EIGHT members in v2; v1 had six, before the two multi-asset LP operations.
 *
 * An unrecognised ordinal returns "unknown" rather than falling through to a neighbour:
 * if the enum ever grows, that surfaces in Neon as a value nobody expects instead of
 * silently mislabelling every new operation as the last known one.
 */
function operationName(op: i32): string {
  if (op == 0) return OPERATION_ST_DEPOSIT;
  if (op == 1) return OPERATION_ST_REDEEM;
  if (op == 2) return OPERATION_JT_DEPOSIT;
  if (op == 3) return OPERATION_JT_REDEEM;
  if (op == 4) return OPERATION_LPT_DEPOSIT;
  if (op == 5) return OPERATION_LPT_REDEEM;
  if (op == 6) return OPERATION_LPT_MULTI_ASSET_DEPOSIT;
  if (op == 7) return OPERATION_LPT_MULTI_ASSET_REDEEM;
  return OPERATION_UNKNOWN;
}

/** Decode PreOp's struct BY NAME. */
function preOpState(e: PreOpTrancheAccountingSyncedEvent): SyncedState {
  const s = e.params.resultingState;
  const o = new SyncedState();
  o.marketState = s.marketState;
  o.collateralNAV = s.collateralNAV;
  o.lptRawNAV = s.lptRawNAV;
  o.stEffectiveNAV = s.stEffectiveNAV;
  o.jtEffectiveNAV = s.jtEffectiveNAV;
  o.jtImpermanentLoss = s.jtImpermanentLoss;
  o.lptLiquidityPremium = s.lptLiquidityPremium;
  o.stProtocolFee = s.stProtocolFee;
  o.jtProtocolFee = s.jtProtocolFee;
  o.lptProtocolFee = s.lptProtocolFee;
  o.coverageUtilizationWAD = s.coverageUtilizationWAD;
  o.liquidityUtilizationWAD = s.liquidityUtilizationWAD;
  o.fixedTermEndTimestamp = s.fixedTermEndTimestamp;
  o.minCoverageWAD = s.minCoverageWAD;
  o.coverageLiquidationUtilizationWAD = s.coverageLiquidationUtilizationWAD;
  o.minLiquidityWAD = s.minLiquidityWAD;
  return o;
}

/** Decode PostOp's struct BY NAME — a distinct generated class from PreOp's. */
function postOpState(e: PostOpTrancheAccountingSyncedEvent): SyncedState {
  const s = e.params.resultingState;
  const o = new SyncedState();
  o.marketState = s.marketState;
  o.collateralNAV = s.collateralNAV;
  o.lptRawNAV = s.lptRawNAV;
  o.stEffectiveNAV = s.stEffectiveNAV;
  o.jtEffectiveNAV = s.jtEffectiveNAV;
  o.jtImpermanentLoss = s.jtImpermanentLoss;
  o.lptLiquidityPremium = s.lptLiquidityPremium;
  o.stProtocolFee = s.stProtocolFee;
  o.jtProtocolFee = s.jtProtocolFee;
  o.lptProtocolFee = s.lptProtocolFee;
  o.coverageUtilizationWAD = s.coverageUtilizationWAD;
  o.liquidityUtilizationWAD = s.liquidityUtilizationWAD;
  o.fixedTermEndTimestamp = s.fixedTermEndTimestamp;
  o.minCoverageWAD = s.minCoverageWAD;
  o.coverageLiquidationUtilizationWAD = s.coverageLiquidationUtilizationWAD;
  o.minLiquidityWAD = s.minLiquidityWAD;
  return o;
}
