import { Address, BigInt, Bytes, Int8 } from "@graphprotocol/graph-ts";
import { CHAIN_ID } from "./constants";

export function generateId(
  vaultAddress: Address,
  transactionHash: Bytes,
  logIndex: BigInt
): string {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(vaultAddress.toHexString())
    .concat("_")
    .concat(transactionHash.toHexString())
    .concat("_")
    .concat(logIndex.toString());
}

export const generateTokenId = (tokenAddress: Address): string => {
  return CHAIN_ID.toString().concat("-").concat(tokenAddress.toHexString());
};

export const generateRequestId = (
  address: Address,
  requestId: Bytes
): string => {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(address.toHexString())
    .concat("_")
    .concat(requestId.toHexString());
};

export const generateBoringAccountUpdateId = (
  vaultAddress: Address,
  accountAddress: Address,
  epoch: BigInt
): string => {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(vaultAddress.toHexString())
    .concat("_")
    .concat(accountAddress.toHexString())
    .concat("_")
    .concat(epoch.toString());
};

export const generateBoringEpochId = (
  vaultAddress: Address,
  epoch: BigInt
): string => {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(vaultAddress.toHexString())
    .concat("_")
    .concat(epoch.toString());
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

export const generateBoringRewardId = (
  vaultAddress: Address,
  rewardId: BigInt
): string => {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(vaultAddress.toHexString())
    .concat("_")
    .concat(rewardId.toString());
};

export const generateBoringEpochRewardBalanceId = (
  vaultAddress: Address,
  epoch: BigInt,
  rewardId: BigInt
): string => {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(vaultAddress.toHexString())
    .concat("_")
    .concat(epoch.toString())
    .concat("_")
    .concat(rewardId.toString());
};

export const generateBoringRewardClaimedId = (
  vaultAddress: Address,
  accountAddress: Address,
  rewardId: BigInt
): string => {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(vaultAddress.toHexString())
    .concat("_")
    .concat(accountAddress.toHexString())
    .concat("_")
    .concat(rewardId.toString());
};

export const generateBoringVaultId = (vaultAddress: Address): string => {
  return CHAIN_ID.toString().concat("_").concat(vaultAddress.toHexString());
};
