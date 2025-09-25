import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { CHAIN_ID } from "./constants";

export function generateId(transactionHash: Bytes, logIndex: BigInt): string {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(transactionHash.toHexString())
    .concat("_")
    .concat(logIndex.toString());
}

export const generateTokenId = (tokenAddress: Bytes): string => {
  return CHAIN_ID.toString().concat("-").concat(tokenAddress.toHexString());
};

export const generateRawGlobalActivityId = (
  transactionHash: Bytes,
  logIndex: BigInt,
  category: string,
  subCategory: string,
  tokenIndex: BigInt
): string => {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(transactionHash.toHexString())
    .concat("_")
    .concat(logIndex.toString())
    .concat("_")
    .concat(category)
    .concat("_")
    .concat(subCategory)
    .concat("_")
    .concat(tokenIndex.toString());
};

export const generateRawMetricHistoricalId = (
  transactionHash: Bytes,
  logIndex: BigInt,
  category: string
): string => {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(transactionHash.toHexString())
    .concat("_")
    .concat(logIndex.toString())
    .concat("_")
    .concat(category);
};

export const generateRawMetricLatestId = (category: string): string => {
  return CHAIN_ID.toString().concat("_").concat(category);
};
