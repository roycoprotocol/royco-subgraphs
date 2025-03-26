// prettier-ignore
import { BigInt } from "@graphprotocol/graph-ts";

export const SOURCE_CHAIN_ID = BigInt.fromU64(1); // Will be replaced during deployment
export const DESTINATION_CHAIN_ID = BigInt.fromU64(80094); // Will be replaced during deployment

export const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

// Weiroll Wallet Status
export const PROCESSED = "processed";
export const EXECUTED = "executed";
export const WITHDRAWN = "withdrawn";
export const OVERDUE = "overdue";

export const MARKET_TYPE = 0; // 0 = Receipt Market
