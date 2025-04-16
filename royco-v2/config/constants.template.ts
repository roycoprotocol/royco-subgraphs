// prettier-ignore
import { BigInt } from "@graphprotocol/graph-ts";

export const CHAIN_ID = BigInt.fromU64({{chainId}}); // Will be replaced during deployment

export const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";
export const ZERO_BD = "0";

// Protocol specific constants
export const PROTOCOL_NAME = "Royco V2";
export const PROTOCOL_SLUG = "royco-v2";
export const PROTOCOL_SCHEMA_VERSION = "1.3.0";
export const PROTOCOL_SUBGRAPH_VERSION = "0.0.1";
export const PROTOCOL_METHODOLOGY_VERSION = "1.0.0"; 