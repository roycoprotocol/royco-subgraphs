import { BigInt, Bytes, Int8 } from "@graphprotocol/graph-ts";
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

export const generatePointBalanceId = (
  tokenAddress: Bytes,
  accountAddress: Bytes
): string => {
  return generateTokenId(tokenAddress)
    .concat("_")
    .concat(accountAddress.toHexString());
};

export const generateRawPointBalanceId = (
  tokenAddress: Bytes,
  accountAddress: Bytes
): string => {
  return generateTokenId(tokenAddress)
    .concat("_")
    .concat(accountAddress.toHexString());
};

export const generateRawAuthorizedPointIssuerId = (
  tokenAddress: Bytes,
  issuerAddress: Bytes
): string => {
  return generateTokenId(tokenAddress)
    .concat("_")
    .concat(issuerAddress.toHexString());
};
