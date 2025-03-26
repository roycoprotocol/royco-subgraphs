import { BigInt, Bytes, Int8 } from "@graphprotocol/graph-ts";
import { CHAIN_ID, MARKET_TYPE } from "./constants";

export function generateId(transactionHash: Bytes, logIndex: BigInt): string {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(transactionHash.toHexString())
    .concat("_")
    .concat(logIndex.toString());
}

export const generateTokenId = (tokenAddress: Bytes): string => {
  return CHAIN_ID.toString().concat("-").concat(tokenAddress.toHexString());
};

export const generateRawMarketId = (marketId: string): string => {
  return CHAIN_ID.toString()
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

export const generateRawOfferId = (
  offerSide: Int8,
  offerId: string
): string => {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(MARKET_TYPE.toString())
    .concat("_")
    .concat(offerSide.toString())

    .concat("_")

    .concat(offerId.toString());
};

export const generateRawOfferTokenBalanceId = (
  rawOfferRefId: string,
  tokenClass: Int8,
  tokenId: string
): string => {
  return rawOfferRefId
    .concat("_")
    .concat(tokenClass.toString())
    .concat("_")
    .concat(tokenId);
};

export const generateRawPositionId = (
  marketId: string,
  accountAddress: string
): string => {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(marketId)
    .concat("_")
    .concat(accountAddress);
};

export const generateRawPositionTokenBalanceId = (
  rawPositionRefId: string,
  tokenClass: Int8,
  tokenId: string
): string => {
  return rawPositionRefId
    .concat("_")
    .concat(tokenClass.toString())
    .concat("_")
    .concat(tokenId);
};

export const generateRawProtocolFeeId = (): string => {
  return CHAIN_ID.toString().concat("_").concat(MARKET_TYPE.toString());
};

export const generateRawVolumeId = (
  marketId: string,
  tokenId: string
): string => {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(MARKET_TYPE.toString())
    .concat("_")
    .concat(marketId)
    .concat("_")
    .concat(tokenId);
};
