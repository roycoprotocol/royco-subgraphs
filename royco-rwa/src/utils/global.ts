import { BigInt } from "@graphprotocol/graph-ts";
import { CHAIN_ID } from "../constants";

export function generateId(transactionHash: string, logIndex: BigInt): string {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(transactionHash)
    .concat("_")
    .concat(logIndex.toString());
}

export function generateTransferId(
  transactionHash: string,
  logIndex: BigInt,
  vaultAddress: string
): string {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(transactionHash)
    .concat("_")
    .concat(logIndex.toString())
    .concat("_")
    .concat(vaultAddress);
}

export const generateVaultId = (vaultAddress: string): string => {
  return CHAIN_ID.toString().concat("_").concat(vaultAddress);
};

export const generateTokenId = (tokenAddress: string): string => {
  return CHAIN_ID.toString().concat("_").concat(tokenAddress);
};

export const generatePositionStateId = (
  vaultAddress: string,
  accountAddress: string
): string => {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(vaultAddress)
    .concat("_")
    .concat(accountAddress);
};

export const generatePositionLatestId = (
  vaultAddress: string,
  accountAddress: string,
  category: string
): string => {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(vaultAddress)
    .concat("_")
    .concat(accountAddress)
    .concat("_")
    .concat(category);
};

export const generatePositionRequestLatestId = (
  vaultAddress: string,
  category: string,
  requestId: string
): string => {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(vaultAddress)
    .concat("_")
    .concat(category)
    .concat("_")
    .concat(requestId);
};

export const generatePositionHistoricalId = (
  transactionHash: string,
  logIndex: BigInt,
  vaultAddress: string,
  accountAddress: string,
  category: string
): string => {
  return generateId(transactionHash, logIndex)
    .concat("_")
    .concat(vaultAddress)
    .concat("_")
    .concat(accountAddress)
    .concat("_")
    .concat(category);
};

export const generatePositionStateHistoricalId = (
  vaultAddress: string,
  accountAddress: string,
  blockTimestamp: BigInt
): string => {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(vaultAddress)
    .concat("_")
    .concat(accountAddress)
    .concat("_")
    .concat(blockTimestamp.toString());
};

export const generateMetricLatestId = (
  vaultAddress: string,
  category: string
): string => {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(vaultAddress)
    .concat("_")
    .concat(category);
};

export const generateMetricHistoricalId = (
  transactionHash: string,
  logIndex: BigInt,
  vaultAddress: string,
  category: string
): string => {
  return generateId(transactionHash, logIndex)
    .concat("_")
    .concat(vaultAddress)
    .concat("_")
    .concat(category);
};

export const generateGlobalTokenActivityId = (
  transactionHash: string,
  logIndex: BigInt,
  category: string,
  subCategory: string,
  vaultAddress: string,
  tokenIndex: BigInt
): string => {
  return generateId(transactionHash, logIndex)
    .concat("_")
    .concat(vaultAddress)
    .concat("_")
    .concat(category)
    .concat("_")
    .concat(subCategory)
    .concat("_")
    .concat(tokenIndex.toString());
};
