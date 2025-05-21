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

export const generateVaultTokenId = (
  vaultAddress: Address,
  accountAddress: Address
): string => {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(vaultAddress.toHexString())
    .concat("_")
    .concat(accountAddress.toHexString());
};

export const generateTokenId = (tokenAddress: Address): string => {
  return CHAIN_ID.toString().concat("-").concat(tokenAddress.toHexString());
};

export const generateRequestId = (
  address: Address,
  requestId: Bytes
): string => {
  return CHAIN_ID.toString()
    .toLowerCase()
    .concat("_")
    .concat(address.toHexString().toLowerCase())
    .concat("_")
    .concat(requestId.toHexString().toLowerCase());
};

export const generateBoringAccountUpdateId = (
  vaultAddress: Address,
  accountAddress: Address,
  epoch: BigInt
): string => {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(vaultAddress.toHexString().toLowerCase())
    .concat("_")
    .concat(accountAddress.toHexString().toLowerCase())
    .concat("_")
    .concat(epoch.toString().toLowerCase());
};

export const generateBoringEpochId = (
  vaultAddress: Address,
  epoch: BigInt
): string => {
  return CHAIN_ID.toString()
    .toLowerCase()
    .concat("_")
    .concat(vaultAddress.toHexString().toLowerCase())
    .concat("_")
    .concat(epoch.toString().toLowerCase());
};

export const generateRawGlobalActivityId = (
  transactionHash: Bytes,
  logIndex: BigInt,
  category: string,
  subCategory: string,
  tokenIndex: BigInt
): string => {
  return CHAIN_ID.toString()
    .toLowerCase()
    .concat("_")
    .concat(transactionHash.toHexString().toLowerCase())
    .concat("_")
    .concat(logIndex.toString().toLowerCase())
    .concat("_")
    .concat(category.toLowerCase())
    .concat("_")
    .concat(subCategory.toLowerCase())
    .concat("_")
    .concat(tokenIndex.toString().toLowerCase());
};

export const generateBoringRewardId = (
  vaultAddress: Address,
  rewardId: BigInt
): string => {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(vaultAddress.toHexString().toLowerCase())
    .concat("_")
    .concat(rewardId.toString().toLowerCase());
};

export const generateBoringEpochRewardBalanceId = (
  vaultAddress: Address,
  epoch: BigInt,
  rewardId: BigInt
): string => {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(vaultAddress.toHexString().toLowerCase())
    .concat("_")
    .concat(epoch.toString().toLowerCase())
    .concat("_")
    .concat(rewardId.toString().toLowerCase());
};

export const generateBoringRewardClaimedId = (
  vaultAddress: Address,
  accountAddress: Address,
  rewardId: BigInt
): string => {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(vaultAddress.toHexString().toLowerCase())
    .concat("_")
    .concat(accountAddress.toHexString().toLowerCase())
    .concat("_")
    .concat(rewardId.toString().toLowerCase());
};

export const generateBoringVaultId = (vaultAddress: Address): string => {
  return CHAIN_ID.toString().concat("_").concat(vaultAddress.toHexString());
};

export const generateRawPositionId = (
  vaultAddress: string,
  accountAddress: string
): string => {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(vaultAddress)
    .concat("_")
    .concat(accountAddress);
};

export const generateBoringWithdrawalId = (
  vaultAddress: Address,
  requestId: Bytes
): string => {
  return CHAIN_ID.toString()
    .toLowerCase()
    .concat("_")
    .concat(vaultAddress.toHexString().toLowerCase())
    .concat("_")
    .concat(requestId.toHexString().toLowerCase());
};

export const generateRawGlobalActivityIdWithdraw = (
  sourceRefId: string,
  requestId: string
): string => {
  return sourceRefId.concat("_").concat(requestId);
};

export const generateQueueId = (
  vaultAddress: string,
  requestId: string
): string => {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(vaultAddress)
    .concat("_")
    .concat(requestId);
};

export const generateRawGlobalAccountUpdateId = (
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
