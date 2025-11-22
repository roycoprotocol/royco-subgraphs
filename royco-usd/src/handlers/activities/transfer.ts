import { BigInt } from "@graphprotocol/graph-ts";
import { GlobalTokenActivity, RoyusdTransfer } from "../../../generated/schema";
import {
  CHAIN_ID,
  ZERO_ADDRESS,
  SUB_CATEGORY_MINT,
  SUB_CATEGORY_BURN,
  SUB_CATEGORY_TRANSFER_IN,
  SUB_CATEGORY_TRANSFER_OUT,
  CATEGORY_ROYUSD,
  SOURCE_REF_ID_ROYUSD,
  SOURCE_CONTRACT_ADDRESS_ROYUSD,
} from "../../constants";
import { generateGlobalTokenActivityId, generateTokenId } from "../../utils";

export function addTransferActivity(
  transfer: RoyusdTransfer,
  subCategory: string
): GlobalTokenActivity {
  let accountAddress = ZERO_ADDRESS;

  if (
    subCategory == SUB_CATEGORY_MINT ||
    subCategory == SUB_CATEGORY_TRANSFER_IN
  ) {
    accountAddress = transfer.toAddress;
  } else if (
    subCategory == SUB_CATEGORY_BURN ||
    subCategory == SUB_CATEGORY_TRANSFER_OUT
  ) {
    accountAddress = transfer.fromAddress;
  }

  let activityId = generateGlobalTokenActivityId(
    transfer.transactionHash,
    transfer.logIndex,
    CATEGORY_ROYUSD,
    subCategory,
    BigInt.fromI32(0)
  );
  let activity = new GlobalTokenActivity(activityId);
  activity.chainId = CHAIN_ID;
  activity.sourceRefId = SOURCE_REF_ID_ROYUSD;
  activity.category = CATEGORY_ROYUSD;
  activity.subCategory = subCategory;
  activity.contractAddress = SOURCE_CONTRACT_ADDRESS_ROYUSD;
  activity.accountAddress = accountAddress;
  activity.tokenIndex = BigInt.fromI32(0);
  activity.tokenId = generateTokenId(SOURCE_CONTRACT_ADDRESS_ROYUSD);
  activity.tokenAddress = SOURCE_CONTRACT_ADDRESS_ROYUSD;
  activity.tokenRawAmount = transfer.rawAmount;
  activity.blockNumber = transfer.blockNumber;
  activity.blockTimestamp = transfer.blockTimestamp;
  activity.transactionHash = transfer.transactionHash;
  activity.logIndex = transfer.logIndex;
  activity.createdAt = transfer.blockTimestamp;
  activity.save();

  return activity;
}
