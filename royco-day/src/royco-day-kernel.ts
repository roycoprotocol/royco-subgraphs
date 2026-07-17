import { BigInt } from "@graphprotocol/graph-ts";
import {
  ProtocolFeeRecipientUpdated as ProtocolFeeRecipientUpdatedEvent,
  SeniorTrancheSelfLiquidationBonusUpdated as SeniorTrancheSelfLiquidationBonusUpdatedEvent,
  LiquidityPremiumReinvested as LiquidityPremiumReinvestedEvent,
  LiquidityPremiumReinvestmentFailed as LiquidityPremiumReinvestmentFailedEvent,
} from "../generated/templates/RoycoDayKernel/RoycoDayKernel";
import {
  DayMarketState,
  DayLiquidityPremiumReinvestedHistory,
  DayLiquidityPremiumReinvestmentFailedHistory,
} from "../generated/schema";
import { generateMarketId, generateMarketRecordId } from "./utils";
import { touchMarket } from "./handlers/base/resolve-market";
import { CHAIN_ID } from "./constants";

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

  // Use-then-increment: the count IS the next entryIndex; the first is 0.
  const entryIndex = market.countLiquidityPremiumReinvestedEntries;

  const entry = new DayLiquidityPremiumReinvestedHistory(
    generateMarketRecordId(market.marketId, entryIndex)
  );
  entry.chainId = CHAIN_ID;
  entry.marketId = market.marketId;
  entry.marketRefId = market.id;
  entry.entryIndex = entryIndex;
  entry.shares = event.params.stSharesReinvested; // <- ABI: stSharesReinvested (actually reinvested)
  entry.assets = event.params.ltAssetsMinted; // <- ABI: ltAssetsMinted (actually minted)
  entry.createdAtTransactionHash = event.transaction.hash.toHexString();
  entry.createdAtBlockNumber = event.block.number;
  entry.createdAtBlockTimestamp = event.block.timestamp;
  entry.save();

  market.countLiquidityPremiumReinvestedEntries = entryIndex.plus(
    BigInt.fromI32(1)
  );
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

  const entryIndex = market.countLiquidityPremiumReinvestmentFailedEntries;

  const entry = new DayLiquidityPremiumReinvestmentFailedHistory(
    generateMarketRecordId(market.marketId, entryIndex)
  );
  entry.chainId = CHAIN_ID;
  entry.marketId = market.marketId;
  entry.marketRefId = market.id;
  entry.entryIndex = entryIndex;
  entry.shares = event.params.stSharesToReinvest; // <- ABI: stSharesToReinvest (attempted; never moved)
  entry.assets = event.params.minLTAssetsOut; // <- ABI: minLTAssetsOut (slippage bound; never minted)
  entry.revertData = event.params.revertData.toHexString(); // <- ABI: revertData (bytes -> hex, §4)
  entry.createdAtTransactionHash = event.transaction.hash.toHexString();
  entry.createdAtBlockNumber = event.block.number;
  entry.createdAtBlockTimestamp = event.block.timestamp;
  entry.save();

  market.countLiquidityPremiumReinvestmentFailedEntries = entryIndex.plus(
    BigInt.fromI32(1)
  );
  touchMarket(event, market);
}
