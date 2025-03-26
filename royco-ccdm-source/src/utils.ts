import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { SOURCE_CHAIN_ID } from "./constants";

export function generateId(transactionHash: Bytes, logIndex: BigInt): string {
  return SOURCE_CHAIN_ID.toString()
    .concat("_")
    .concat(transactionHash.toHexString())
    .concat("_")
    .concat(logIndex.toString());
}
