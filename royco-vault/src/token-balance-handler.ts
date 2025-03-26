import { Address, BigInt, Bytes, Int8 } from "@graphprotocol/graph-ts";
import {
  RawMarketVault,
  RawMarketTokenBalanceVault,
  RawOfferVault,
  RawOfferTokenBalanceVault,
  RawVolume,
  RawPositionVault,
  RawPositionTokenBalanceVault,
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
import { WrappedVault } from "../generated/templates/WrappedVault/WrappedVault";

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
  let rawMarket = RawMarketVault.load(rawMarketRefId);

  if (rawMarket) {
    let rawOfferRefId = generateRawOfferId(offerSide, offerId);

    let rawOfferTokenBalanceRefId = generateRawOfferTokenBalanceId(
      rawOfferRefId, // Offer Ref ID
      tokenClass, // Token Class
      tokenId // Token ID
    );

    let rawOfferTokenBalance = new RawOfferTokenBalanceVault(
      rawOfferTokenBalanceRefId
    );

    rawOfferTokenBalance.rawMarketRefId = rawMarketRefId;
    rawOfferTokenBalance.rawOfferRefId = rawOfferRefId;

    rawOfferTokenBalance.chainId = CHAIN_ID;
    rawOfferTokenBalance.marketType = MARKET_TYPE;
    rawOfferTokenBalance.marketId = rawMarket.marketId;
    rawOfferTokenBalance.offerSide = offerSide;
    rawOfferTokenBalance.offerId = offerId;
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
  let rawOfferTokenBalance = RawOfferTokenBalanceVault.load(
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

export function createOrUpdateRawMarketTokenBalanceInputToken(
  marketId: string,
  tokenId: string,
  tokenAmount: BigInt
): void {
  let tokenClass = 0; // Input Token

  let rawMarketRefId = generateRawMarketId(marketId);
  let rawMarket = RawMarketVault.load(rawMarketRefId);

  if (rawMarket) {
    let rawMarketTokenBalanceRefId = generateRawMarketTokenBalanceId(
      rawMarketRefId, // Market Ref ID
      tokenClass, // Token Class
      tokenId // Token ID
    );

    let rawMarketTokenBalance = RawMarketTokenBalanceVault.load(
      rawMarketTokenBalanceRefId
    );

    if (!rawMarketTokenBalance) {
      rawMarketTokenBalance = new RawMarketTokenBalanceVault(
        rawMarketTokenBalanceRefId
      );

      rawMarketTokenBalance.rawMarketRefId = rawMarketRefId;
      rawMarketTokenBalance.chainId = CHAIN_ID;
      rawMarketTokenBalance.marketType = MARKET_TYPE;
      rawMarketTokenBalance.marketId = rawMarket.marketId;
      rawMarketTokenBalance.tokenClass = tokenClass;
      rawMarketTokenBalance.tokenId = tokenId;
      rawMarketTokenBalance.tokenAmount = tokenAmount;
    } else {
      // If the token balance already exists, we need to update it

      rawMarketTokenBalance.tokenAmount = tokenAmount;
    }

    rawMarketTokenBalance.save();
  }
}

export function createOrUpdateRawMarketTokenBalanceIncentiveToken(
  marketId: string,
  tokenId: string,
  tokenAmount: BigInt,
  tokenRate: BigInt,
  startTimestamp: BigInt,
  endTimestamp: BigInt
): void {
  let tokenClass = 1; // Incentive Token

  let rawMarketRefId = generateRawMarketId(marketId);
  let rawMarket = RawMarketVault.load(rawMarketRefId);

  if (rawMarket) {
    let rawMarketTokenBalanceRefId = generateRawMarketTokenBalanceId(
      rawMarketRefId, // Market Ref ID
      tokenClass, // Token Class
      tokenId // Token ID
    );

    let rawMarketTokenBalance = RawMarketTokenBalanceVault.load(
      rawMarketTokenBalanceRefId
    );

    if (!rawMarketTokenBalance) {
      rawMarketTokenBalance = new RawMarketTokenBalanceVault(
        rawMarketTokenBalanceRefId
      );

      rawMarketTokenBalance.rawMarketRefId = rawMarketRefId;
      rawMarketTokenBalance.chainId = CHAIN_ID;
      rawMarketTokenBalance.marketType = MARKET_TYPE;
      rawMarketTokenBalance.marketId = rawMarket.marketId;
      rawMarketTokenBalance.tokenClass = tokenClass;
      rawMarketTokenBalance.tokenId = tokenId;
      rawMarketTokenBalance.tokenAmount = tokenAmount;
      rawMarketTokenBalance.tokenRate = tokenRate;
      rawMarketTokenBalance.startTimestamp = startTimestamp;
      rawMarketTokenBalance.endTimestamp = endTimestamp;
    } else {
      // If the token balance already exists, we need to update it

      rawMarketTokenBalance.tokenAmount = tokenAmount;
      rawMarketTokenBalance.tokenRate = tokenRate;
      rawMarketTokenBalance.startTimestamp = startTimestamp;
      rawMarketTokenBalance.endTimestamp = endTimestamp;
    }

    rawMarketTokenBalance.save();
  }
}

export function createOrUpdateRawMarketTokenBalanceShares(
  marketId: string,
  tokenId: string,
  tokenAmount: BigInt
): void {
  let tokenClass = 2; // Shares

  let rawMarketRefId = generateRawMarketId(marketId);
  let rawMarket = RawMarketVault.load(rawMarketRefId);

  if (rawMarket) {
    let rawMarketTokenBalanceRefId = generateRawMarketTokenBalanceId(
      rawMarketRefId, // Market Ref ID
      tokenClass, // Token Class
      tokenId // Token ID
    );

    let rawMarketTokenBalance = RawMarketTokenBalanceVault.load(
      rawMarketTokenBalanceRefId
    );

    if (!rawMarketTokenBalance) {
      rawMarketTokenBalance = new RawMarketTokenBalanceVault(
        rawMarketTokenBalanceRefId
      );

      rawMarketTokenBalance.rawMarketRefId = rawMarketRefId;
      rawMarketTokenBalance.chainId = CHAIN_ID;
      rawMarketTokenBalance.marketType = MARKET_TYPE;
      rawMarketTokenBalance.marketId = rawMarket.marketId;
      rawMarketTokenBalance.tokenClass = tokenClass;
      rawMarketTokenBalance.tokenId = tokenId;
      rawMarketTokenBalance.tokenAmount = tokenAmount;
    } else {
      // If the token balance already exists, we need to update it

      rawMarketTokenBalance.tokenAmount = tokenAmount;
    }

    rawMarketTokenBalance.save();
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

  let rawMarket = RawMarketVault.load(rawMarketRefId);

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

export function createOrUpdateRawPositionVault(
  rawMarketRefId: string,
  accountAddress: string,
  tokenClass: Int8,
  tokenId: string,
  tokenAmount: BigInt,
  type: Int8 // 0: Add, 1: Subtract, 2: Set
): void {
  let rawMarket = RawMarketVault.load(rawMarketRefId);

  if (rawMarket) {
    let rawPositionRefId = generateRawPositionId(
      rawMarket.marketId, // Market ID
      accountAddress // Account Address
    );

    let rawPosition = RawPositionVault.load(rawPositionRefId);

    if (!rawPosition) {
      rawPosition = new RawPositionVault(rawPositionRefId);

      rawPosition.rawMarketRefId = rawMarketRefId;
      rawPosition.chainId = CHAIN_ID;
      rawPosition.accountAddress = accountAddress;
      rawPosition.marketId = rawMarket.marketId;
      rawPosition.shares = BigInt.zero();
      rawPosition.token0Id = rawMarket.inputTokenId;
      rawPosition.token0Amount = BigInt.zero();
      rawPosition.token1Ids = [];
      rawPosition.token1Amounts = [];
    }

    if (tokenClass == 0) {
      // Input Token

      if (type == 0) {
        // Add
        rawPosition.token0Amount = rawPosition.token0Amount.plus(tokenAmount);
      } else if (type == 1) {
        // Subtract
        rawPosition.token0Amount = rawPosition.token0Amount.minus(tokenAmount);
      } else if (type == 2) {
        // Set
        rawPosition.token0Amount = tokenAmount;
      }
    } else if (tokenClass == 1) {
      // Incentive Token

      let index = rawPosition.token1Ids.indexOf(tokenId);

      if (index == -1) {
        // Token ID does not exist in the array

        let newToken1Ids = rawPosition.token1Ids;
        newToken1Ids.push(tokenId);
        rawPosition.token1Ids = newToken1Ids;

        let newToken1Amounts = rawPosition.token1Amounts;
        newToken1Amounts.push(tokenAmount);
        rawPosition.token1Amounts = newToken1Amounts;
      } else {
        // Token ID exists in the array
        if (type == 0) {
          // Add
          let newToken1Amounts = rawPosition.token1Amounts;
          newToken1Amounts[index] = newToken1Amounts[index].plus(tokenAmount);
          rawPosition.token1Amounts = newToken1Amounts;
        } else if (type == 1) {
          // Subtract
          let newToken1Amounts = rawPosition.token1Amounts;
          newToken1Amounts[index] = newToken1Amounts[index].minus(tokenAmount);
          rawPosition.token1Amounts = newToken1Amounts;
        } else if (type == 2) {
          // Set
          let newToken1Amounts = rawPosition.token1Amounts;
          newToken1Amounts[index] = tokenAmount;
          rawPosition.token1Amounts = newToken1Amounts;
        }
      }
    } else if (tokenClass == 2) {
      // Shares
      rawPosition.shares = rawPosition.shares.plus(tokenAmount);

      if (type == 0) {
        // Add
        rawPosition.shares = rawPosition.shares.plus(tokenAmount);
      } else if (type == 1) {
        // Subtract
        rawPosition.shares = rawPosition.shares.minus(tokenAmount);
      } else if (type == 2) {
        // Set
        rawPosition.shares = tokenAmount;
      }
    }

    rawPosition.save();
  }
}

export function createOrUpdateRawPositionTokenBalanceVault(
  rawMarketRefId: string,
  accountAddress: string,
  tokenClass: Int8,
  tokenId: string,
  tokenAmount: BigInt,
  type: Int8 // 0: Add, 1: Subtract, 2: Set
): void {
  let rawMarket = RawMarketVault.load(rawMarketRefId);

  if (rawMarket) {
    let rawPositionRefId = generateRawPositionId(
      rawMarket.marketId, // Market ID
      accountAddress // Account Address
    );

    let rawPositionTokenBalanceRefId = generateRawPositionTokenBalanceId(
      rawPositionRefId, // Position Ref ID
      tokenClass, // Token Class
      tokenId // Token ID
    );

    let rawPositionTokenBalance = RawPositionTokenBalanceVault.load(
      rawPositionTokenBalanceRefId
    );

    if (!rawPositionTokenBalance) {
      rawPositionTokenBalance = new RawPositionTokenBalanceVault(
        rawPositionTokenBalanceRefId
      );

      rawPositionTokenBalance.rawMarketRefId = rawMarketRefId;
      rawPositionTokenBalance.rawPositionRefId = rawPositionRefId;
      rawPositionTokenBalance.chainId = CHAIN_ID;
      rawPositionTokenBalance.accountAddress = accountAddress;
      rawPositionTokenBalance.marketId = rawMarket.marketId;
      rawPositionTokenBalance.tokenClass = tokenClass;
      rawPositionTokenBalance.tokenId = tokenId;
      rawPositionTokenBalance.tokenAmount = BigInt.zero();

      if (tokenClass == 1) {
        rawPositionTokenBalance.isWithdrawn = true;
      } else {
        rawPositionTokenBalance.isWithdrawn = false;
      }
    }

    if (type == 0) {
      // Add
      rawPositionTokenBalance.tokenAmount =
        rawPositionTokenBalance.tokenAmount.plus(tokenAmount);
    } else if (type == 1) {
      // Subtract
      rawPositionTokenBalance.tokenAmount =
        rawPositionTokenBalance.tokenAmount.minus(tokenAmount);
    } else if (type == 2) {
      // Set
      rawPositionTokenBalance.tokenAmount = tokenAmount;
    }

    if (rawPositionTokenBalance.tokenAmount.equals(BigInt.zero())) {
      rawPositionTokenBalance.isWithdrawn = true;
    }

    rawPositionTokenBalance.save();
  }
}

export function updateToken0Balance(
  wrappedVaultAddress: Address,
  accountAddress: string
): void {
  let rawMarketRefId = generateRawMarketId(wrappedVaultAddress.toHexString());
  let rawMarket = RawMarketVault.load(rawMarketRefId);

  if (rawMarket) {
    // Create contract binding
    let contract = WrappedVault.bind(wrappedVaultAddress);

    let token0Amount = BigInt.zero();

    let maxWithdrawResult = contract.try_maxWithdraw(
      Address.fromString(accountAddress)
    );

    if (!maxWithdrawResult.reverted) {
      token0Amount = maxWithdrawResult.value;
    }

    createOrUpdateRawPositionVault(
      rawMarketRefId, // Market ID
      accountAddress, // Account Address
      0, // Input Token
      rawMarket.inputTokenId, // Input Token ID
      token0Amount, // Input Token Amount
      2 // Set
    );

    createOrUpdateRawPositionTokenBalanceVault(
      rawMarketRefId, // Market ID
      accountAddress, // Account Address
      0, // Input Token
      rawMarket.inputTokenId, // Input Token ID
      token0Amount, // Input Token Amount
      2 // Set
    );
  }
}
