import { BigInt } from "@graphprotocol/graph-ts";
import { Transfer as TransferEvent } from "../generated/RoyUSD/RoyUSD";
import {
  RawGlobalActivity,
  RawMetricHistorical,
  RawMetricLatest,
  RawRoyusdPosition,
  RawRoyusdTransfer,
} from "../generated/schema";
import { CHAIN_ID, METRIC_TOTAL_SUPPLY, ZERO_ADDRESS } from "./constants";
import {
  generateId,
  generateRawGlobalActivityId,
  generateRawMetricHistoricalId,
  generateRawMetricLatestId,
  generateTokenId,
} from "./utils";

export function handleTransfer(event: TransferEvent): void {
  let entity = new RawRoyusdTransfer(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.fromAddress = event.params.from.toHexString();
  entity.toAddress = event.params.to.toHexString();
  entity.value = event.params.value;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;
  entity.createdAt = event.block.timestamp.toI32();

  entity.save();

  let fromAddress = event.params.from.toHexString();
  let toAddress = event.params.to.toHexString();

  // Return if from and to are the same address
  if (fromAddress == toAddress) return;

  // Update from balance
  if (fromAddress != ZERO_ADDRESS) {
    let fromPosition = RawRoyusdPosition.load(fromAddress);

    if (!fromPosition) {
      fromPosition = new RawRoyusdPosition(fromAddress);
      fromPosition.chainId = CHAIN_ID;
      fromPosition.accountAddress = fromAddress;
      fromPosition.rawAmount = BigInt.fromI32(0);
      fromPosition.createdAt = event.block.timestamp.toI32();
    }

    fromPosition.rawAmount = fromPosition.rawAmount.minus(event.params.value);
    fromPosition.updatedAt = event.block.timestamp.toI32();
    fromPosition.save();
  }

  // Update to balance
  if (toAddress != ZERO_ADDRESS) {
    let toPosition = RawRoyusdPosition.load(toAddress);

    if (!toPosition) {
      toPosition = new RawRoyusdPosition(toAddress);
      toPosition.chainId = CHAIN_ID;
      toPosition.accountAddress = toAddress;
      toPosition.rawAmount = BigInt.fromI32(0);
      toPosition.createdAt = event.block.timestamp.toI32();
    }

    toPosition.rawAmount = toPosition.rawAmount.plus(event.params.value);
    toPosition.updatedAt = event.block.timestamp.toI32();
    toPosition.save();
  }

  // Update metric
  if (fromAddress == ZERO_ADDRESS) {
    // Mint: total supply goes up
    let rawMetricHistorical = new RawMetricHistorical(
      generateRawMetricHistoricalId(
        event.transaction.hash,
        event.logIndex,
        METRIC_TOTAL_SUPPLY
      )
    );
    rawMetricHistorical.chainId = CHAIN_ID;
    rawMetricHistorical.category = METRIC_TOTAL_SUPPLY;
    rawMetricHistorical.value = event.params.value;
    rawMetricHistorical.blockNumber = event.block.number;
    rawMetricHistorical.blockTimestamp = event.block.timestamp;
    rawMetricHistorical.transactionHash = event.transaction.hash.toHexString();
    rawMetricHistorical.logIndex = event.logIndex;
    rawMetricHistorical.createdAt = event.block.timestamp.toI32();
    rawMetricHistorical.save();

    const rawMetricLatestId = generateRawMetricLatestId(METRIC_TOTAL_SUPPLY);
    let rawMetricLatest = RawMetricLatest.load(rawMetricLatestId);

    if (!rawMetricLatest) {
      rawMetricLatest = new RawMetricLatest(rawMetricLatestId);
      rawMetricLatest.chainId = CHAIN_ID;
      rawMetricLatest.category = METRIC_TOTAL_SUPPLY;
      rawMetricLatest.value = BigInt.fromI32(0);
      rawMetricLatest.createdAt = event.block.timestamp.toI32();
    }

    rawMetricLatest.value = rawMetricLatest.value.plus(event.params.value);
    rawMetricLatest.updatedAt = event.block.timestamp.toI32();
    rawMetricLatest.save();
  } else if (toAddress == ZERO_ADDRESS) {
    // Burn: total supply goes down
    let rawMetricHistorical = new RawMetricHistorical(
      generateRawMetricHistoricalId(
        event.transaction.hash,
        event.logIndex,
        METRIC_TOTAL_SUPPLY
      )
    );
    rawMetricHistorical.chainId = CHAIN_ID;
    rawMetricHistorical.category = METRIC_TOTAL_SUPPLY;
    rawMetricHistorical.value = event.params.value;
    rawMetricHistorical.blockNumber = event.block.number;
    rawMetricHistorical.blockTimestamp = event.block.timestamp;
    rawMetricHistorical.transactionHash = event.transaction.hash.toHexString();
    rawMetricHistorical.logIndex = event.logIndex;
    rawMetricHistorical.createdAt = event.block.timestamp.toI32();
    rawMetricHistorical.save();

    const rawMetricLatestId = generateRawMetricLatestId(METRIC_TOTAL_SUPPLY);
    let rawMetricLatest = RawMetricLatest.load(rawMetricLatestId);

    if (!rawMetricLatest) {
      rawMetricLatest = new RawMetricLatest(rawMetricLatestId);
      rawMetricLatest.chainId = CHAIN_ID;
      rawMetricLatest.category = METRIC_TOTAL_SUPPLY;
      rawMetricLatest.value = BigInt.fromI32(0);
      rawMetricLatest.createdAt = event.block.timestamp.toI32();
    }

    rawMetricLatest.value = rawMetricLatest.value.minus(event.params.value);
    rawMetricLatest.updatedAt = event.block.timestamp.toI32();
    rawMetricLatest.save();
  }

  // Add global activity for from address
  if (fromAddress != ZERO_ADDRESS) {
    let subCategory = "transfer-out";
    if (toAddress == ZERO_ADDRESS) {
      subCategory = "burn";
    }

    let rawGlobalActivity = new RawGlobalActivity(
      generateRawGlobalActivityId(
        event.transaction.hash,
        event.logIndex,
        "royusd",
        subCategory,
        BigInt.fromI32(0)
      )
    );
    rawGlobalActivity.chainId = CHAIN_ID;
    rawGlobalActivity.category = "royusd";
    rawGlobalActivity.subCategory = subCategory;
    rawGlobalActivity.sourceRefId = generateTokenId(event.address);
    rawGlobalActivity.contractAddress = event.address.toHexString();
    rawGlobalActivity.accountAddress = fromAddress;
    rawGlobalActivity.tokenIndex = BigInt.fromI32(0);
    rawGlobalActivity.tokenId = generateTokenId(event.address);
    rawGlobalActivity.tokenAddress = event.address.toHexString();
    rawGlobalActivity.tokenRawAmount = event.params.value;
    rawGlobalActivity.blockNumber = event.block.number;
    rawGlobalActivity.blockTimestamp = event.block.timestamp;
    rawGlobalActivity.transactionHash = event.transaction.hash.toHexString();
    rawGlobalActivity.logIndex = event.logIndex;
    rawGlobalActivity.createdAt = event.block.timestamp.toI32();
    rawGlobalActivity.save();
  }

  // Add global activity for to address
  if (toAddress != ZERO_ADDRESS) {
    let subCategory = "transfer-in";
    if (fromAddress == ZERO_ADDRESS) {
      subCategory = "mint";
    }

    let rawGlobalActivity = new RawGlobalActivity(
      generateRawGlobalActivityId(
        event.transaction.hash,
        event.logIndex,
        "royusd",
        subCategory,
        BigInt.fromI32(0)
      )
    );
    rawGlobalActivity.chainId = CHAIN_ID;
    rawGlobalActivity.category = "royusd";
    rawGlobalActivity.subCategory = subCategory;
    rawGlobalActivity.sourceRefId = generateTokenId(event.address);
    rawGlobalActivity.contractAddress = event.address.toHexString();
    rawGlobalActivity.accountAddress = toAddress;
    rawGlobalActivity.tokenIndex = BigInt.fromI32(0);
    rawGlobalActivity.tokenId = generateTokenId(event.address);
    rawGlobalActivity.tokenAddress = event.address.toHexString();
    rawGlobalActivity.tokenRawAmount = event.params.value;
    rawGlobalActivity.blockNumber = event.block.number;
    rawGlobalActivity.blockTimestamp = event.block.timestamp;
    rawGlobalActivity.transactionHash = event.transaction.hash.toHexString();
    rawGlobalActivity.logIndex = event.logIndex;
    rawGlobalActivity.createdAt = event.block.timestamp.toI32();
    rawGlobalActivity.save();
  }
}
