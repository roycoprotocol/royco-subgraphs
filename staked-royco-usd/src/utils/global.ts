import { BigInt } from "@graphprotocol/graph-ts";
import { CHAIN_ID } from "../constants";

export function generateId(transactionHash: string, logIndex: BigInt): string {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(transactionHash)
    .concat("_")
    .concat(logIndex.toString());
}

export const generateTokenId = (tokenAddress: string): string => {
  return CHAIN_ID.toString().concat("-").concat(tokenAddress);
};

export const generatePositionLatestId = (accountAddress: string): string => {
  return CHAIN_ID.toString().concat("_").concat(accountAddress);
};

export const generatePositionHistoricalId = (
  transactionHash: string,
  logIndex: BigInt,
  accountAddress: string
): string => {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(transactionHash)
    .concat("_")
    .concat(logIndex.toString())
    .concat("_")
    .concat(accountAddress);
};

export const generateMetricLatestId = (name: string): string => {
  return CHAIN_ID.toString().concat("_").concat(name);
};

export const generateMetricHistoricalId = (
  transactionHash: string,
  logIndex: BigInt,
  name: string
): string => {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(transactionHash)
    .concat("_")
    .concat(logIndex.toString())
    .concat("_")
    .concat(name);
};

export const generateGlobalTokenActivityId = (
  transactionHash: string,
  logIndex: BigInt,
  category: string,
  subCategory: string,
  tokenIndex: BigInt
): string => {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(transactionHash)
    .concat("_")
    .concat(logIndex.toString())
    .concat("_")
    .concat(category)
    .concat("_")
    .concat(subCategory)
    .concat("_")
    .concat(tokenIndex.toString());
};
