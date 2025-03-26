import { BigInt, Bytes, Int8 } from "@graphprotocol/graph-ts";
import {
  DESTINATION_CHAIN_ID,
  MARKET_TYPE,
  SOURCE_CHAIN_ID,
} from "./constants";

export function generateId(transactionHash: Bytes, logIndex: BigInt): string {
  return DESTINATION_CHAIN_ID.toString()
    .concat("_")
    .concat(transactionHash.toHexString())
    .concat("_")
    .concat(logIndex.toString());
}

export const generateRawMarketId = (marketId: string): string => {
  return SOURCE_CHAIN_ID.toString()
    .concat("_")
    .concat(MARKET_TYPE.toString())
    .concat("_")
    .concat(marketId);
};

export const generateRawMarketTokenBalanceId = (
  rawMarketRefId: string,
  tokenClass: Int8,
  tokenId: string
): string => {
  return rawMarketRefId
    .concat("_")
    .concat(tokenClass.toString())
    .concat("_")
    .concat(tokenId);
};
