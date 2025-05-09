import { CHAIN_ID } from "./constants";
import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { generateRawGlobalActivityId } from "./utils";
import { RawGlobalActivity } from "../generated/schema";

export function createRawGlobalActivity(
  category: string,
  subCategory: string,
  sourceRefId: string,
  contractAddress: string,
  accountAddress: string,
  tokenIndex: BigInt,
  tokenId: string,
  tokenAmount: BigInt,
  blockNumber: BigInt,
  blockTimestamp: BigInt,
  transactionHash: Bytes,
  logIndex: BigInt
): void {
  let rawGlobalActivityRefId = generateRawGlobalActivityId(
    transactionHash, // transactionHash
    logIndex, // logIndex
    category, // category
    subCategory, // subCategory
    tokenIndex // tokenIndex
  );

  let rawGlobalActivity = RawGlobalActivity.load(rawGlobalActivityRefId);

  // If the raw global activity already exists, return
  if (rawGlobalActivity) {
    return;
  }

  rawGlobalActivity = new RawGlobalActivity(
    generateRawGlobalActivityId(
      transactionHash, // transactionHash
      logIndex, // logIndex
      category, // category
      subCategory, // subCategory
      tokenIndex // tokenIndex
    )
  );

  const tokenAddress = tokenId.split("-")[1];

  rawGlobalActivity.chainId = CHAIN_ID;
  rawGlobalActivity.category = category;
  rawGlobalActivity.subCategory = subCategory;
  rawGlobalActivity.sourceRefId = sourceRefId;
  rawGlobalActivity.contractAddress = contractAddress;
  rawGlobalActivity.accountAddress = accountAddress;
  rawGlobalActivity.tokenIndex = tokenIndex;
  rawGlobalActivity.tokenId = tokenId;
  rawGlobalActivity.tokenAddress = tokenAddress;
  rawGlobalActivity.tokenAmount = tokenAmount;
  rawGlobalActivity.blockNumber = blockNumber;
  rawGlobalActivity.blockTimestamp = blockTimestamp;
  rawGlobalActivity.transactionHash = transactionHash.toHexString();
  rawGlobalActivity.logIndex = logIndex;

  rawGlobalActivity.save();
}
