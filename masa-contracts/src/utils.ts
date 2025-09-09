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

export const generateRawCreditBalanceId = (
  tokenAddress: Bytes,
  accountAddress: Bytes
): string => {
  return generateTokenId(tokenAddress)
    .concat("_")
    .concat(accountAddress.toHexString());
};

export const generateRawIssuanceId = (
  tokenAddress: Bytes,
  issuanceId: Bytes
): string => {
  return generateTokenId(tokenAddress)
    .concat("_")
    .concat(issuanceId.toHexString());
};

export const generateRawIssuanceBalanceId = (
  tokenAddress: Bytes,
  issuanceId: Bytes,
  accountAddress: Bytes
): string => {
  return generateTokenId(tokenAddress)
    .concat("_")
    .concat(issuanceId.toHexString())
    .concat("_")
    .concat(accountAddress.toHexString());
};
