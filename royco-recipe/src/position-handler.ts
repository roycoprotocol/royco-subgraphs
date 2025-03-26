import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  RawMarketRecipe,
  RawOfferRecipe,
  RawPositionRecipe,
  RawPositionRecipeBoyco,
} from "../generated/schema";
import { CHAIN_ID } from "./constants";
import { generateRawPositionId } from "./utils";
import {
  createOrUpdateRawMarketTokenBalance,
  createRawPositionTokenBalance,
} from "./token-balance-handler";

export function createRawPosition(
  rawMarketRefId: string,
  rawOfferRefId: string,
  weirollWallet: string,
  accountAddress: string,
  token0Amount: BigInt,
  token1Amounts: BigInt[],
  blockNumber: BigInt,
  blockTimestamp: BigInt,
  transactionHash: Bytes,
  logIndex: BigInt
): void {
  let rawMarket = RawMarketRecipe.load(rawMarketRefId);
  let rawOffer = RawOfferRecipe.load(rawOfferRefId);

  if (rawMarket && rawOffer) {
    let rawPositionRefId = generateRawPositionId(weirollWallet);

    let rawPositionRecipeBoyco = RawPositionRecipeBoyco.load(rawPositionRefId);

    let rawPosition = new RawPositionRecipe(rawPositionRefId);

    rawPosition.rawMarketRefId = rawMarketRefId;
    rawPosition.rawOfferRefId = rawOfferRefId;
    rawPosition.chainId = CHAIN_ID;
    rawPosition.weirollWallet = weirollWallet;
    rawPosition.accountAddress = accountAddress;

    rawPosition.marketId = rawMarket.marketId;
    rawPosition.rewardStyle = rawMarket.rewardStyle;

    rawPosition.token0Id = rawOffer.token0Id;
    rawPosition.token0Amount = token0Amount;
    rawPosition.token1Ids = rawOffer.token1Ids;
    rawPosition.token1Amounts = token1Amounts;
    rawPosition.isForfeited = false;

    if (rawPositionRecipeBoyco) {
      rawPosition.isWithdrawn = rawPositionRecipeBoyco.isWithdrawn;
      rawPosition.tag = rawPositionRecipeBoyco.tag;

      createRawPositionTokenBalance(
        rawMarketRefId, // Market Ref ID
        rawOfferRefId, // Offer Ref ID
        weirollWallet, // Weiroll Wallet Address
        accountAddress, // Wallet Address
        0, // Token class: Input
        rawOffer.token0Id, // Input Token ID
        token0Amount, // Input amount
        true // Withdraw Status
      );

      // // @note: no de-duplication required, because only one token
      // createOrUpdateRawMarketTokenBalance(
      //   rawMarketRefId, // Market ID
      //   0, // Token class: Input
      //   rawOffer.token0Id, // Input Token ID
      //   token0Amount, // Input amount
      //   1 // Subtract
      // );
    } else {
      // Input always needs to be withdrawn
      rawPosition.isWithdrawn = false;
      createRawPositionTokenBalance(
        rawMarketRefId, // Market Ref ID
        rawOfferRefId, // Offer Ref ID
        weirollWallet, // Weiroll Wallet Address
        accountAddress, // Wallet Address
        0, // Token class: Input
        rawOffer.token0Id, // Input Token ID
        token0Amount, // Input amount
        false // Withdraw Status
      );
    }

    if (rawMarket.rewardStyle == 0) {
      // Upfront, default to true
      rawPosition.isClaimed = token1Amounts.map<boolean>(
        (token1Amount) => true
      );

      // @note: no de-duplication required, because token1Ids will always have unique tokens
      for (let i = 0; i < token1Amounts.length; i++) {
        createOrUpdateRawMarketTokenBalance(
          rawMarket.marketId, // Market Hash
          1, // Token class: Incentive
          rawOffer.token1Ids[i], // Incentive Token ID
          token1Amounts[i], // Incentive Token Amount
          1 // Subtract
        );
      }
    } else {
      // Arrear & Forfeitable, default to false
      rawPosition.isClaimed = token1Amounts.map<boolean>(
        (token1Amount) => false
      );
    }

    // Arrear & Forfeitable, default to false
    let incentiveClaimStatus = false;

    if (rawMarket.rewardStyle == 0) {
      // Upfront, default to true
      incentiveClaimStatus = true;
    }

    // @note: no de-duplication required, because token1Ids will always have unique tokens
    for (let i = 0; i < token1Amounts.length; i++) {
      let token1Id = rawOffer.token1Ids[i];
      let token1Amount = token1Amounts[i];

      createRawPositionTokenBalance(
        rawMarketRefId, // Market Ref ID
        rawOfferRefId, // Offer Ref ID
        weirollWallet, // Weiroll Wallet Address
        accountAddress, // Wallet Address
        1, // Token class: Incentive
        token1Id, // Incentive Token ID
        token1Amount, // Incentive Token Amount
        incentiveClaimStatus // Incentive Claim Status
      );
    }

    rawPosition.unlockTimestamp = blockTimestamp.plus(rawMarket.lockupTime); // Unlock Timestamp of the position
    rawPosition.blockNumber = blockNumber;
    rawPosition.blockTimestamp = blockTimestamp;
    rawPosition.transactionHash = transactionHash.toHexString(); // Transaction Hash
    rawPosition.logIndex = logIndex; // Log Index

    rawPosition.save();
  }
}

export function updateRawPositionTag(
  rawPositionRefId: string,
  tag: string
): void {
  let rawPosition = RawPositionRecipe.load(rawPositionRefId);

  if (rawPosition) {
    rawPosition.tag = tag;
    rawPosition.save();
  }
}
