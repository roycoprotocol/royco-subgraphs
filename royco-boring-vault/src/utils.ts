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
  rewardId: BigInt,
  accountAddress: Address
): string => {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(vaultAddress.toHexString())
    .concat("_")
    .concat(rewardId.toString())
    .concat("_")
    .concat(accountAddress.toHexString());
};
