import { BigInt, Bytes, Address } from "@graphprotocol/graph-ts";
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
 * Generate a unique ID for RawSafeTransaction based on rawSafeId and transaction hash
 */
export function generateRawSafeTransactionId(
  rawSafeId: string,
  transactionHash: string
): string {
  return rawSafeId.concat("_").concat(transactionHash.toLowerCase());
}

/**
 * Generate a unique ID for RawNode based on chain ID and node hash
 */
export function generateRawNodeId(nodeHash: string): string {
  return CHAIN_ID.toString().concat("_").concat(nodeHash.toLowerCase());
}

/**
 * Generate a unique ID for RawMarket based on chain ID and market hash
 * Market type is always 2 for signal markets
 */
export function generateRawMarketId(marketHash: string): string {
  return CHAIN_ID.toString()
    .concat("_")
    .concat("2")
    .concat("_")
    .concat(marketHash.toLowerCase());
}

/**
 * Generate a unique ID for RawOrder based on chain ID and order hash
 */
export function generateRawOrderId(orderHash: string): string {
  return CHAIN_ID.toString().concat("_").concat(orderHash.toLowerCase());
}

/**
 * Generate a unique ID for RawOperand based on chain ID and hash of target+data
 */
export function generateRawOperandId(operandHash: string): string {
  return CHAIN_ID.toString().concat("_").concat(operandHash.toLowerCase());
}

/**
 * Generate a unique ID for RawCondition based on chain ID and hash of condition components
 */
export function generateRawConditionId(conditionHash: string): string {
  return CHAIN_ID.toString().concat("_").concat(conditionHash.toLowerCase());
}

/**
 * Format address to lowercase hex string
 */
export function formatAddress(address: Address): string {
  return address.toHexString().toLowerCase();
}

/**
 * Format bytes to lowercase hex string
 */
export function formatBytes(bytes: Bytes): string {
  return bytes.toHexString().toLowerCase();
}

/**
 * Generate a unique ID for RawGlobalActivity
 */
export function generateRawGlobalActivityId(
  transactionHash: Bytes,
  logIndex: BigInt,
  category: string,
  subCategory: string,
  tokenIndex: BigInt
): string {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(transactionHash.toHexString().toLowerCase())
    .concat("_")
    .concat(logIndex.toString())
    .concat("_")
    .concat(category)
    .concat("_")
    .concat(subCategory)
    .concat("_")
    .concat(tokenIndex.toString());
}
