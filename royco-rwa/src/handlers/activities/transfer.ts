import { BigInt } from "@graphprotocol/graph-ts";
import {
  GlobalTokenActivity,
  GlobalTokenTransfer,
} from "../../../generated/schema";
import {
  ZERO_ADDRESS,
  SUB_CATEGORY_MINT,
  SUB_CATEGORY_TRANSFER_IN,
  SUB_CATEGORY_BURN,
  SUB_CATEGORY_TRANSFER_OUT,
  SUB_CATEGORY_DEPOSIT,
  SUB_CATEGORY_WITHDRAW,
  ACTIVITY_TYPE_TRANSFER,
  STATUS_COMPLETED,
} from "../../constants";
import { generateGlobalTokenActivityId } from "../../utils";

export function addTransferActivity(
  transfer: GlobalTokenTransfer,
  transferSubCategoryToAdd: string
): GlobalTokenActivity {
  let accountAddress = ZERO_ADDRESS;

  if (
    transferSubCategoryToAdd == SUB_CATEGORY_MINT ||
    transferSubCategoryToAdd == SUB_CATEGORY_TRANSFER_IN ||
    transferSubCategoryToAdd == SUB_CATEGORY_WITHDRAW
  ) {
    accountAddress = transfer.toAddress;
  } else if (
    transferSubCategoryToAdd == SUB_CATEGORY_BURN ||
    transferSubCategoryToAdd == SUB_CATEGORY_TRANSFER_OUT ||
    transferSubCategoryToAdd == SUB_CATEGORY_DEPOSIT
  ) {
    accountAddress = transfer.fromAddress;
  }

  let activityId = generateGlobalTokenActivityId(
    transfer.transactionHash,
    transfer.logIndex,
    transfer.vaultAddress,
    transfer.category,
    transferSubCategoryToAdd,
    BigInt.fromI32(0)
  );
  let activity = new GlobalTokenActivity(activityId);
  activity.vaultId = transfer.vaultId;
  activity.chainId = transfer.chainId;
  activity.vaultAddress = transfer.vaultAddress;
  activity.category = transfer.category;
  activity.subCategory = transferSubCategoryToAdd;
  activity.accountAddress = accountAddress;
  activity.type = ACTIVITY_TYPE_TRANSFER;
  activity.tokenIndex = BigInt.fromI32(0);
  activity.tokenId = transfer.tokenId;
  activity.tokenAddress = transfer.vaultAddress;
  activity.value = transfer.value;
  activity.status = STATUS_COMPLETED;
  activity.blockNumber = transfer.blockNumber;
  activity.blockTimestamp = transfer.blockTimestamp;
  activity.transactionHash = transfer.transactionHash;
  activity.logIndex = transfer.logIndex;
  activity.createdAt = transfer.blockTimestamp;
  activity.save();

  return activity;
}
