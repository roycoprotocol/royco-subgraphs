import { BigInt } from "@graphprotocol/graph-ts";
import {
  RoyusdPositionHistorical,
  RoyusdPositionLatest,
  RoyusdTransfer,
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

export function updateRoyusdPosition(
  transfer: RoyusdTransfer,
  subCategory: string
): RoyusdPositionLatest {
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
  let positionLatest = RoyusdPositionLatest.load(positionLatestId);
  if (!positionLatest) {
    positionLatest = new RoyusdPositionLatest(positionLatestId);
    positionLatest.chainId = CHAIN_ID;
    positionLatest.accountAddress = accountAddress;
    positionLatest.rawAmount = BigInt.fromI32(0);
    positionLatest.prevRawAmount = BigInt.fromI32(0);
    positionLatest.blockTimestamp = transfer.blockTimestamp;
    positionLatest.prevBlockTimestamp = transfer.blockTimestamp;
    positionLatest.createdAt = transfer.blockTimestamp;
  }

  positionLatest.prevRawAmount = positionLatest.rawAmount;
  positionLatest.rawAmount = positionLatest.rawAmount.plus(
    transfer.rawAmount.times(multiplier)
  );
  positionLatest.prevBlockTimestamp = positionLatest.blockTimestamp;
  positionLatest.blockTimestamp = transfer.blockTimestamp;
  positionLatest.updatedAt = transfer.blockTimestamp;
  positionLatest.save();

  let positionHistoricalId = generatePositionHistoricalId(
    transfer.transactionHash,
    transfer.logIndex,
    accountAddress
  );
  let positionHistorical = new RoyusdPositionHistorical(positionHistoricalId);
  positionHistorical.chainId = positionLatest.chainId;
  positionHistorical.accountAddress = positionLatest.accountAddress;
  positionHistorical.prevRawAmount = positionLatest.prevRawAmount;
  positionHistorical.rawAmount = positionLatest.rawAmount;
  positionHistorical.blockNumber = transfer.blockNumber;
  positionHistorical.prevBlockTimestamp = positionLatest.prevBlockTimestamp;
  positionHistorical.blockTimestamp = positionLatest.blockTimestamp;
  positionHistorical.transactionHash = transfer.transactionHash;
  positionHistorical.logIndex = transfer.logIndex;
  positionHistorical.createdAt = transfer.blockTimestamp;
  positionHistorical.save();

  return positionLatest;
}
