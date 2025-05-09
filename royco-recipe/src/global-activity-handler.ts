import { CHAIN_ID } from "./constants";
import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { generateRawGlobalActivityId } from "./utils";
import { RawGlobalActivity } from "../generated/schema";
export function createRawGlobalActivity(
  rawMarketRefId: string,
  tokenIndex: BigInt,
  tokenId: string,
  tokenAmount: BigInt,
  sourceRefId: string,
  category: string,
  blockNumber: BigInt,
  blockTimestamp: BigInt,
  transactionHash: Bytes,
  logIndex: BigInt,
  accountAddress: string
): void {
  let rawGlobalActivity = new RawGlobalActivity(
    generateRawGlobalActivityId(rawMarketRefId, category, blockTimestamp)
  );

  const tokenAddress = tokenId.split("-")[1];

  rawGlobalActivity.chainId = CHAIN_ID;
  rawGlobalActivity.contractAddress = rawMarketRefId.toLowerCase();
  rawGlobalActivity.accountAddress = accountAddress.toLowerCase();
  rawGlobalActivity.tokenAddress = tokenAddress.toLowerCase();
  rawGlobalActivity.tokenId = tokenId;
  rawGlobalActivity.tokenAmount = tokenAmount;
  rawGlobalActivity.tokenIndex = tokenIndex;
  rawGlobalActivity.sourceRefId = sourceRefId.toLowerCase();
  rawGlobalActivity.category = category.toLowerCase();
  rawGlobalActivity.blockNumber = blockNumber;
  rawGlobalActivity.blockTimestamp = blockTimestamp;
  rawGlobalActivity.transactionHash = transactionHash
    .toHexString()
    .toLowerCase();
  rawGlobalActivity.logIndex = logIndex;

  rawGlobalActivity.save();
}
