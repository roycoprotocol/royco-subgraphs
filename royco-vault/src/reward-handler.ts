import { BigInt } from "@graphprotocol/graph-ts";
import {
  RewardsSet as RewardsSetEvent,
  RewardsTokenAdded as RewardsTokenAddedEvent,
} from "../generated/templates/WrappedVault/WrappedVault";
import { RawMarketVault } from "../generated/schema";

import { generateRawMarketId, generateTokenId } from "./utils";
import {
  createOrUpdateRawMarketTokenBalanceIncentiveToken,
  updateRawVolume,
} from "./token-balance-handler";

export function addReward(event: RewardsTokenAddedEvent): void {
  let rawMarketRefId = generateRawMarketId(event.address.toHexString());

  let rawMarket = RawMarketVault.load(rawMarketRefId);

  if (rawMarket) {
    let newBaseIncentiveIds = rawMarket.baseIncentiveIds;
    newBaseIncentiveIds.push(generateTokenId(event.params.reward));
    rawMarket.baseIncentiveIds = newBaseIncentiveIds;

    let newBaseIncentiveAmounts = rawMarket.baseIncentiveAmounts;
    newBaseIncentiveAmounts.push(BigInt.zero());
    rawMarket.baseIncentiveAmounts = newBaseIncentiveAmounts;

    let newBaseIncentiveRates = rawMarket.baseIncentiveRates;
    newBaseIncentiveRates.push(BigInt.zero());
    rawMarket.baseIncentiveRates = newBaseIncentiveRates;

    let newBaseStartTimestamps = rawMarket.baseStartTimestamps;
    newBaseStartTimestamps.push(BigInt.zero());
    rawMarket.baseStartTimestamps = newBaseStartTimestamps;

    let newBaseEndTimestamps = rawMarket.baseEndTimestamps;
    newBaseEndTimestamps.push(BigInt.zero());
    rawMarket.baseEndTimestamps = newBaseEndTimestamps;

    rawMarket.save();

    createOrUpdateRawMarketTokenBalanceIncentiveToken(
      rawMarket.marketId, // Wrapped Vault Address
      generateTokenId(event.params.reward), // Incentive Token Address
      BigInt.zero(), // Incentive Amount
      BigInt.zero(), // Incentive Rate
      BigInt.zero(), // Incentive Start Timestamp
      BigInt.zero() // Incentive End Timestamp
    );
  }
}

export function setReward(event: RewardsSetEvent): void {
  let rawMarketRefId = generateRawMarketId(event.address.toHexString());

  let rawMarket = RawMarketVault.load(rawMarketRefId);

  if (rawMarket) {
    let incentiveIndex = rawMarket.baseIncentiveIds.indexOf(
      generateTokenId(event.params.reward)
    );

    if (incentiveIndex != -1) {
      let newBaseIncentiveAmounts = rawMarket.baseIncentiveAmounts;
      newBaseIncentiveAmounts[incentiveIndex] = event.params.totalRewards;
      rawMarket.baseIncentiveAmounts = newBaseIncentiveAmounts;

      let newBaseIncentiveRates = rawMarket.baseIncentiveRates;
      newBaseIncentiveRates[incentiveIndex] = event.params.rate;
      rawMarket.baseIncentiveRates = newBaseIncentiveRates;

      let newBaseStartTimestamps = rawMarket.baseStartTimestamps;
      newBaseStartTimestamps[incentiveIndex] = event.params.start;
      rawMarket.baseStartTimestamps = newBaseStartTimestamps;

      let newBaseEndTimestamps = rawMarket.baseEndTimestamps;
      newBaseEndTimestamps[incentiveIndex] = event.params.end;
      rawMarket.baseEndTimestamps = newBaseEndTimestamps;

      rawMarket.save();

      createOrUpdateRawMarketTokenBalanceIncentiveToken(
        rawMarket.marketId, // Market ID
        generateTokenId(event.params.reward), // Incentive Token ID
        event.params.totalRewards, // Incentive Amount
        event.params.rate, // Incentive Rate
        event.params.start, // Incentive Start Timestamp
        event.params.end // Incentive End Timestamp
      );
    }
  }
}
