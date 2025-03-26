// prettier-ignore
import { BigInt } from "@graphprotocol/graph-ts";

export const SOURCE_CHAIN_ID = BigInt.fromU64({{sourceChainId}}); // Will be replaced during deployment
export const DESTINATION_CHAIN_ID = BigInt.fromU64({{destinationChainId}}); // Will be replaced during deployment

export const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";