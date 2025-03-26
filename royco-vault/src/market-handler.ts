import { BigInt } from "@graphprotocol/graph-ts";
import { WrappedVaultCreated as WrappedVaultCreatedEvent } from "../generated/WrappedVaultFactory/WrappedVaultFactory";
import { RawMarketVault } from "../generated/schema";
import { CHAIN_ID, MARKET_TYPE } from "./constants";
import { generateRawMarketId, generateTokenId } from "./utils";

export function createRawMarket(event: WrappedVaultCreatedEvent): void {
  let rawMarketRefId = generateRawMarketId(
    event.params.incentivizedVaultAddress.toHexString()
  );

  let entity = new RawMarketVault(rawMarketRefId);

  entity.chainId = CHAIN_ID;
  entity.marketType = MARKET_TYPE;
  entity.marketId = event.params.incentivizedVaultAddress.toHexString();
  entity.underlyingVaultAddress =
    event.params.underlyingVaultAddress.toHexString();
  entity.owner = event.params.owner.toHexString();
  entity.inputTokenId = generateTokenId(event.params.inputToken);
  entity.inputTokenAmount = BigInt.zero();
  entity.lockupTime = BigInt.zero();
  entity.frontendFee = event.params.frontendFee;
  entity.rewardStyle = 3;
  entity.vaultSymbol = event.params.vaultSymbol;
  entity.shares = BigInt.zero();
  entity.baseIncentiveIds = [];
  entity.baseIncentiveAmounts = [];
  entity.baseIncentiveRates = [];
  entity.baseStartTimestamps = [];
  entity.baseEndTimestamps = [];

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}
