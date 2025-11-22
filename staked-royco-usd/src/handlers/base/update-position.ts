import { BigInt } from "@graphprotocol/graph-ts";
import {
  StakedRoyusdPositionHistorical,
  StakedRoyusdPositionLatest,
  StakedRoyusdTransfer,
} from "../../../generated/schema";
import {
  CHAIN_ID,
  ZERO_ADDRESS,
  SUB_CATEGORY_MINT,
  SUB_CATEGORY_BURN,
  SUB_CATEGORY_TRANSFER_IN,
  SUB_CATEGORY_TRANSFER_OUT,
} from "../../constants";
import {
  generatePositionLatestId,
  generatePositionHistoricalId,
} from "../../utils";

export function addStakedRoyusdPositionHistorical(
  positionLatest: StakedRoyusdPositionLatest,
  blockNumber: BigInt,
  blockTimestamp: BigInt,
  transactionHash: string,
  logIndex: BigInt
): StakedRoyusdPositionHistorical {
  let positionHistoricalId = generatePositionHistoricalId(
    transactionHash,
    logIndex,
    positionLatest.accountAddress
  );
  let positionHistorical = new StakedRoyusdPositionHistorical(
    positionHistoricalId
  );
  positionHistorical.chainId = positionLatest.chainId;
  positionHistorical.accountAddress = positionLatest.accountAddress;
  positionHistorical.prevSharesRawAmount = positionLatest.prevSharesRawAmount;
  positionHistorical.sharesRawAmount = positionLatest.sharesRawAmount;
  positionHistorical.prevUnstakedAssetsRawAmount =
    positionLatest.prevUnstakedAssetsRawAmount;
  positionHistorical.unstakedAssetsRawAmount =
    positionLatest.unstakedAssetsRawAmount;
  positionHistorical.prevAssetsUnlockTimestamp =
    positionLatest.prevAssetsUnlockTimestamp;
  positionHistorical.assetsUnlockTimestamp =
    positionLatest.assetsUnlockTimestamp;
  positionHistorical.blockNumber = blockNumber;
  positionHistorical.prevBlockTimestamp = positionLatest.prevBlockTimestamp;
  positionHistorical.blockTimestamp = positionLatest.blockTimestamp;
  positionHistorical.transactionHash = transactionHash;
  positionHistorical.logIndex = logIndex;
  positionHistorical.createdAt = blockTimestamp;
  positionHistorical.save();

  return positionHistorical;
}

export function updateStakedRoyusdPosition(
  transfer: StakedRoyusdTransfer,
  subCategory: string
): StakedRoyusdPositionLatest {
  let accountAddress = ZERO_ADDRESS;
  let multiplier = BigInt.fromI32(1);

  if (
    subCategory == SUB_CATEGORY_MINT ||
    subCategory == SUB_CATEGORY_TRANSFER_IN
  ) {
    accountAddress = transfer.toAddress;
    multiplier = BigInt.fromI32(1);
  } else if (
    subCategory == SUB_CATEGORY_BURN ||
    subCategory == SUB_CATEGORY_TRANSFER_OUT
  ) {
    accountAddress = transfer.fromAddress;
    multiplier = BigInt.fromI32(-1);
  }

  let positionLatestId = generatePositionLatestId(accountAddress);
  let positionLatest = StakedRoyusdPositionLatest.load(positionLatestId);
  if (!positionLatest) {
    positionLatest = new StakedRoyusdPositionLatest(positionLatestId);
    positionLatest.chainId = CHAIN_ID;
    positionLatest.accountAddress = accountAddress;
    positionLatest.prevSharesRawAmount = BigInt.fromI32(0);
    positionLatest.sharesRawAmount = BigInt.fromI32(0);
    positionLatest.prevUnstakedAssetsRawAmount = BigInt.fromI32(0);
    positionLatest.unstakedAssetsRawAmount = BigInt.fromI32(0);
    positionLatest.prevAssetsUnlockTimestamp = BigInt.fromI32(0);
    positionLatest.assetsUnlockTimestamp = BigInt.fromI32(0);
    positionLatest.blockTimestamp = transfer.blockTimestamp;
    positionLatest.prevBlockTimestamp = transfer.blockTimestamp;
    positionLatest.createdAt = transfer.blockTimestamp;
  }

  positionLatest.prevSharesRawAmount = positionLatest.sharesRawAmount;
  positionLatest.sharesRawAmount = positionLatest.sharesRawAmount.plus(
    transfer.rawAmount.times(multiplier)
  );
  positionLatest.prevBlockTimestamp = positionLatest.blockTimestamp;
  positionLatest.blockTimestamp = transfer.blockTimestamp;
  positionLatest.updatedAt = transfer.blockTimestamp;
  positionLatest.save();

  addStakedRoyusdPositionHistorical(
    positionLatest,
    transfer.blockNumber,
    transfer.blockTimestamp,
    transfer.transactionHash,
    transfer.logIndex
  );

  return positionLatest;
}
