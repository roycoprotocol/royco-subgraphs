import { BigInt, Bytes, Int8 } from "@graphprotocol/graph-ts";
import {
  RawMarketRecipe,
  RawMarketTokenBalanceRecipe,
  RawOfferRecipe,
  RawOfferTokenBalanceRecipe,
  RawPositionTokenBalanceRecipe,
  RawVolume,
} from "../generated/schema";
import { CHAIN_ID, MARKET_TYPE } from "./constants";
import {
  generateRawMarketId,
  generateRawMarketTokenBalanceId,
  generateRawOfferId,
  generateRawOfferTokenBalanceId,
  generateRawPositionId,
  generateRawPositionTokenBalanceId,
  generateRawVolumeId,
} from "./utils";

export function createRawOfferTokenBalance(
  marketId: string,
  offerSide: Int8,
  offerId: string,
  tokenClass: Int8,
  tokenId: string,
  tokenAmount: BigInt,
  accountAddress: string,
  fundingVault: string
): void {
  let rawMarketRefId = generateRawMarketId(marketId);
  let rawMarket = RawMarketRecipe.load(rawMarketRefId);

  if (rawMarket) {
    let rawOfferRefId = generateRawOfferId(offerSide, offerId);

    let rawOfferTokenBalanceRefId = generateRawOfferTokenBalanceId(
      rawOfferRefId, // Offer Ref ID
      tokenClass, // Token class
      tokenId // Token ID
    );

    let rawOfferTokenBalance = new RawOfferTokenBalanceRecipe(
      rawOfferTokenBalanceRefId
    );

    rawOfferTokenBalance.rawMarketRefId = rawMarketRefId;
    rawOfferTokenBalance.rawOfferRefId = rawOfferRefId;

    rawOfferTokenBalance.chainId = CHAIN_ID;
    rawOfferTokenBalance.marketType = MARKET_TYPE;
    rawOfferTokenBalance.offerSide = offerSide;
    rawOfferTokenBalance.offerId = offerId;
    rawOfferTokenBalance.marketId = rawMarket.marketId;
    rawOfferTokenBalance.accountAddress = accountAddress;
    rawOfferTokenBalance.fundingVault = fundingVault;

    rawOfferTokenBalance.tokenClass = tokenClass;
    rawOfferTokenBalance.tokenId = tokenId;
    rawOfferTokenBalance.tokenAmount = tokenAmount;
    rawOfferTokenBalance.tokenAmountRemaining = tokenAmount;

    rawOfferTokenBalance.save();
  }
}

export function updateRawOfferTokenBalance(
  rawOfferTokenBalanceRefId: string,
  tokenAmount: BigInt,
  type: Int8 // 0: Add, 1: Subtract, 2: Set
): void {
  let rawOfferTokenBalance = RawOfferTokenBalanceRecipe.load(
    rawOfferTokenBalanceRefId
  );

  if (rawOfferTokenBalance) {
    if (type == 0) {
      // Add
      rawOfferTokenBalance.tokenAmountRemaining =
        rawOfferTokenBalance.tokenAmountRemaining.plus(tokenAmount);
    } else if (type == 1) {
      // Subtract
      rawOfferTokenBalance.tokenAmountRemaining =
        rawOfferTokenBalance.tokenAmountRemaining.minus(tokenAmount);
    } else if (type == 2) {
      // Set
      rawOfferTokenBalance.tokenAmountRemaining = tokenAmount;
    }

    rawOfferTokenBalance.save();
  }
}

export function createOrUpdateRawMarketTokenBalance(
  marketId: string,
  tokenClass: Int8,
  tokenId: string,
  tokenAmount: BigInt,
  type: Int8 // 0: Add, 1: Subtract, 2: Set
): void {
  let rawMarketRefId = generateRawMarketId(marketId);
  let rawMarket = RawMarketRecipe.load(rawMarketRefId);

  if (rawMarket) {
    let rawMarketTokenBalanceRefId = generateRawMarketTokenBalanceId(
      rawMarketRefId, // Market Ref ID
      tokenClass, // Token class
      tokenId // Token ID
    );

    let rawMarketTokenBalance = RawMarketTokenBalanceRecipe.load(
      rawMarketTokenBalanceRefId
    );

    if (!rawMarketTokenBalance) {
      // If the token balance does not exist, we need to create it
      rawMarketTokenBalance = new RawMarketTokenBalanceRecipe(
        rawMarketTokenBalanceRefId
      );

      rawMarketTokenBalance.rawMarketRefId = rawMarketRefId;
      rawMarketTokenBalance.chainId = CHAIN_ID;
      rawMarketTokenBalance.marketType = MARKET_TYPE;
      rawMarketTokenBalance.marketId = rawMarket.marketId;
      rawMarketTokenBalance.tokenClass = tokenClass;
      rawMarketTokenBalance.tokenId = tokenId;
      rawMarketTokenBalance.tokenAmount = BigInt.fromI32(0);
    }

    // If the token balance already exists, we need to update it
    if (type == 0) {
      // Add
      rawMarketTokenBalance.tokenAmount =
        rawMarketTokenBalance.tokenAmount.plus(tokenAmount);
    } else if (type == 1) {
      // Subtract
      rawMarketTokenBalance.tokenAmount =
        rawMarketTokenBalance.tokenAmount.minus(tokenAmount);
    } else if (type == 2) {
      // Set
      rawMarketTokenBalance.tokenAmount = tokenAmount;
    }

    rawMarketTokenBalance.save();

    // Update raw market input token amount
    if (tokenClass == 0) {
      if (type == 0) {
        // Add
        rawMarket.inputTokenAmount =
          rawMarket.inputTokenAmount.plus(tokenAmount);
      } else if (type == 1) {
        // Subtract
        rawMarket.inputTokenAmount =
          rawMarket.inputTokenAmount.minus(tokenAmount);
      } else if (type == 2) {
        // Set
        rawMarket.inputTokenAmount = tokenAmount;
      }

      rawMarket.save();
    }
  }
}

export function createRawPositionTokenBalance(
  rawMarketRefId: string,
  rawOfferRefId: string,
  weirollWallet: string,
  accountAddress: string,
  tokenClass: Int8,
  tokenId: string,
  tokenAmount: BigInt,
  isWithdrawn: boolean
): void {
  let rawMarket = RawMarketRecipe.load(rawMarketRefId);
  let rawOffer = RawOfferRecipe.load(rawOfferRefId);

  if (rawMarket && rawOffer) {
    let rawPositionRefId = generateRawPositionId(weirollWallet);

    let rawPositionTokenBalanceRefId = generateRawPositionTokenBalanceId(
      rawPositionRefId,
      tokenClass,
      tokenId
    );

    let rawPositionTokenBalance = new RawPositionTokenBalanceRecipe(
      rawPositionTokenBalanceRefId
    );

    rawPositionTokenBalance.rawMarketRefId = rawMarketRefId;
    rawPositionTokenBalance.rawOfferRefId = rawOfferRefId;
    rawPositionTokenBalance.rawPositionRefId = rawPositionRefId;

    rawPositionTokenBalance.chainId = CHAIN_ID;
    rawPositionTokenBalance.weirollWallet = weirollWallet;
    rawPositionTokenBalance.accountAddress = accountAddress;
    rawPositionTokenBalance.tokenClass = tokenClass;
    rawPositionTokenBalance.tokenId = tokenId;
    rawPositionTokenBalance.tokenAmount = tokenAmount;
    rawPositionTokenBalance.isWithdrawn = isWithdrawn;

    rawPositionTokenBalance.save();
  }
}

export function withdrawRawPositionTokenBalance(
  weirollWallet: string,
  tokenClass: Int8,
  tokenId: string
): void {
  let rawPositionRefId = generateRawPositionId(weirollWallet);

  let rawPositionTokenBalanceRefId = generateRawPositionTokenBalanceId(
    rawPositionRefId, // Position Ref ID
    tokenClass, // Token class
    tokenId // Token ID
  );

  let rawPositionTokenBalance = RawPositionTokenBalanceRecipe.load(
    rawPositionTokenBalanceRefId
  );

  if (rawPositionTokenBalance) {
    let marketId = rawPositionTokenBalance.rawMarketRefId.split("_")[2];

    // @note: no de-duplication required, because only one token
    createOrUpdateRawMarketTokenBalance(
      marketId, // Market ID
      rawPositionTokenBalance.tokenClass, // Token class
      rawPositionTokenBalance.tokenId, // Token ID
      rawPositionTokenBalance.tokenAmount, // Token amount
      1 // Subtract
    );

    rawPositionTokenBalance.isWithdrawn = true;
    rawPositionTokenBalance.save();
  }
}

export function updateRawVolume(
  marketId: string,
  tokenId: string,
  tokenAmount: BigInt,
  blockNumber: BigInt,
  blockTimestamp: BigInt,
  transactionHash: Bytes,
  logIndex: BigInt,
  type: Int8 // 0: Add, 1: Subtract
): void {
  let rawVolumeRefId = generateRawVolumeId(marketId, tokenId);
  let rawMarketRefId = generateRawMarketId(marketId);

  let rawMarket = RawMarketRecipe.load(rawMarketRefId);

  if (rawMarket) {
    let rawVolume = RawVolume.load(rawVolumeRefId);

    if (!rawVolume) {
      rawVolume = new RawVolume(rawVolumeRefId);

      rawVolume.rawMarketRefId = rawMarketRefId;

      rawVolume.chainId = CHAIN_ID;
      rawVolume.marketType = MARKET_TYPE;
      rawVolume.marketId = marketId;
      rawVolume.tokenId = tokenId;
      rawVolume.volume = tokenAmount;
      rawVolume.blockNumber = blockNumber;
      rawVolume.blockTimestamp = blockTimestamp;
      rawVolume.transactionHash = transactionHash.toHexString();
      rawVolume.logIndex = logIndex;
    } else {
      if (type == 0) {
        // Add
        rawVolume.volume = rawVolume.volume.plus(tokenAmount);
      } else if (type == 1) {
        // Subtract
        rawVolume.volume = rawVolume.volume.minus(tokenAmount);
      }

      rawVolume.blockNumber = blockNumber;
      rawVolume.blockTimestamp = blockTimestamp;
      rawVolume.transactionHash = transactionHash.toHexString();
      rawVolume.logIndex = logIndex;
    }

    rawVolume.save();
  }
}
