import {
  Transfer as TransferEvent,
  UnstakingCommenced as UnstakingCommencedEvent,
  AssetsUnstaked as AssetsUnstakedEvent,
} from "../generated/StakedRoyUSD/StakedRoyUSD";
import {
  SUB_CATEGORY_BURN,
  SUB_CATEGORY_MINT,
  SUB_CATEGORY_TRANSFER,
  SUB_CATEGORY_TRANSFER_IN,
  SUB_CATEGORY_TRANSFER_OUT,
  ZERO_ADDRESS,
} from "./constants";
import { processStakedRoyusdTransfer } from "./handlers/base/process-transfer";
import { updateMetricTotalSupply } from "./handlers/metrics/total-supply";
import {
  addStakedRoyusdPositionHistorical,
  updateStakedRoyusdPosition,
} from "./handlers/base/update-position";
import { addTransferActivity } from "./handlers/activities/transfer";
import { generatePositionLatestId } from "./utils";
import { StakedRoyusdPositionLatest } from "../generated/schema";
import { BigInt } from "@graphprotocol/graph-ts";

export function handleTransfer(event: TransferEvent): void {
  const fromAddress = event.params.from.toHexString();
  const toAddress = event.params.to.toHexString();

  if (fromAddress == toAddress) return;

  let subCategory = SUB_CATEGORY_TRANSFER;
  if (fromAddress == ZERO_ADDRESS) {
    subCategory = SUB_CATEGORY_MINT;
  } else if (toAddress == ZERO_ADDRESS) {
    subCategory = SUB_CATEGORY_BURN;
  }

  let transfer = processStakedRoyusdTransfer(
    subCategory,
    fromAddress,
    toAddress,
    event.params.value,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash.toHexString(),
    event.logIndex
  );

  if (subCategory == SUB_CATEGORY_MINT || subCategory == SUB_CATEGORY_BURN) {
    updateStakedRoyusdPosition(transfer, subCategory);
    addTransferActivity(transfer, subCategory);
    updateMetricTotalSupply(transfer, subCategory);
  } else {
    updateStakedRoyusdPosition(transfer, SUB_CATEGORY_TRANSFER_IN);
    addTransferActivity(transfer, SUB_CATEGORY_TRANSFER_IN);

    updateStakedRoyusdPosition(transfer, SUB_CATEGORY_TRANSFER_OUT);
    addTransferActivity(transfer, SUB_CATEGORY_TRANSFER_OUT);
  }
}

export function handleUnstakingCommenced(event: UnstakingCommencedEvent): void {
  let accountAddress = event.params.staker.toHexString();
  let positionLatestId = generatePositionLatestId(accountAddress);
  let positionLatest = StakedRoyusdPositionLatest.load(positionLatestId);

  if (positionLatest) {
    positionLatest.prevUnstakedAssetsRawAmount =
      positionLatest.unstakedAssetsRawAmount;
    positionLatest.prevAssetsUnlockTimestamp =
      positionLatest.assetsUnlockTimestamp;
    positionLatest.prevBlockTimestamp = positionLatest.blockTimestamp;

    positionLatest.unstakedAssetsRawAmount = event.params.assetsToUnstake;
    positionLatest.assetsUnlockTimestamp = event.params.assetsUnstakeableAt;
    positionLatest.blockTimestamp = event.block.timestamp;
    positionLatest.updatedAt = event.block.timestamp;
    positionLatest.save();

    addStakedRoyusdPositionHistorical(
      positionLatest,
      event.block.number,
      event.block.timestamp,
      event.transaction.hash.toHexString(),
      event.logIndex
    );
  }
}

export function handleAssetsUnstaked(event: AssetsUnstakedEvent): void {
  let accountAddress = event.params.staker.toHexString();
  let positionLatestId = generatePositionLatestId(accountAddress);
  let positionLatest = StakedRoyusdPositionLatest.load(positionLatestId);

  if (positionLatest) {
    positionLatest.prevUnstakedAssetsRawAmount =
      positionLatest.unstakedAssetsRawAmount;
    positionLatest.prevAssetsUnlockTimestamp =
      positionLatest.assetsUnlockTimestamp;
    positionLatest.prevBlockTimestamp = positionLatest.blockTimestamp;

    positionLatest.unstakedAssetsRawAmount =
      positionLatest.unstakedAssetsRawAmount.minus(event.params.assetsUnstaked);
    positionLatest.assetsUnlockTimestamp = BigInt.fromI32(0);
    positionLatest.blockTimestamp = event.block.timestamp;
    positionLatest.updatedAt = event.block.timestamp;
    positionLatest.save();

    addStakedRoyusdPositionHistorical(
      positionLatest,
      event.block.number,
      event.block.timestamp,
      event.transaction.hash.toHexString(),
      event.logIndex
    );
  }
}
