import { BigInt } from "@graphprotocol/graph-ts";
import {
  GlobalTokenActivity,
  PositionRequestLatest,
} from "../../../generated/schema";
import { generateGlobalTokenActivityId } from "../../utils";
import { ACTIVITY_TYPE_REQUEST } from "../../constants";

export function addRequestActivity(
  positionRequestLatest: PositionRequestLatest,
  category: string,
  subCategory: string
): GlobalTokenActivity {
  let activityId = generateGlobalTokenActivityId(
    positionRequestLatest.transactionHash,
    positionRequestLatest.logIndex,
    positionRequestLatest.vaultAddress,
    category,
    subCategory,
    BigInt.fromI32(0)
  );
  let activity = new GlobalTokenActivity(activityId);
  activity.vaultId = positionRequestLatest.vaultId;
  activity.chainId = positionRequestLatest.chainId;
  activity.vaultAddress = positionRequestLatest.vaultAddress;
  activity.category = category;
  activity.subCategory = subCategory;
  activity.accountAddress = positionRequestLatest.accountAddress;
  activity.type = ACTIVITY_TYPE_REQUEST;
  activity.tokenIndex = BigInt.fromI32(0);
  activity.tokenId = positionRequestLatest.tokenId;
  activity.tokenAddress = positionRequestLatest.tokenAddress;
  activity.value = positionRequestLatest.value;
  activity.status = positionRequestLatest.requestStatus;
  activity.blockNumber = positionRequestLatest.blockNumber;
  activity.blockTimestamp = positionRequestLatest.blockTimestamp;
  activity.transactionHash = positionRequestLatest.transactionHash;
  activity.logIndex = positionRequestLatest.logIndex;
  activity.createdAt = positionRequestLatest.blockTimestamp;
  activity.save();

  return activity;
}
