import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { CHAIN_ID } from "../constants";

/**
 * Generate a unique ID for events based on transaction hash and log index
 */
export function generateEventId(
  transactionHash: Bytes,
  logIndex: BigInt
): string {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(transactionHash.toHexString().toLowerCase())
    .concat("_")
    .concat(logIndex.toString().toLowerCase());
}

/**
 * Generate a unique ID for Safe entities based on chain ID and safe address
 */
export function generateRawSafeId(safeAddress: string): string {
  return CHAIN_ID.toString().concat("_").concat(safeAddress.toLowerCase());
}

/**
 * Generate a unique ID for Safe-Account mapping based on safe address and account address
 */
export function generateRawSafeMapId(
  safeAddress: string,
  accountAddress: string
): string {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(safeAddress.toLowerCase())
    .concat("_")
    .concat(accountAddress.toLowerCase());
}

/**
 * Generate a unique ID for tokenized positions based on safe address and token address
 */
export function generateRawSafeTokenizedPositionId(
  safeAddress: string,
  tokenAddress: string
): string {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(safeAddress.toLowerCase())
    .concat("_")
    .concat(tokenAddress.toLowerCase());
}

/**
 * Generate a token ID (used for cross-reference)
 */
export function generateTokenId(tokenAddress: string): string {
  return CHAIN_ID.toString().concat("-").concat(tokenAddress.toLowerCase());
}

/**
 * Generate a unique ID for SafeTransaction entities
 * Uses safeAddress + blockNumber + transactionIndex to correlate with ExecutionSuccess/Failure events
 */
export function generateSafeTransactionId(
  safeAddress: string,
  blockNumber: BigInt,
  transactionIndex: BigInt
): string {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(safeAddress.toLowerCase())
    .concat("_")
    .concat(blockNumber.toString())
    .concat("_")
    .concat(transactionIndex.toString());
}
