import { BigInt } from "@graphprotocol/graph-ts";
import {
  APOfferCancelled as APOfferCancelledEvent,
  APOfferCreated as APOfferCreatedEvent,
  APOfferFilled as APOfferFilledEvent,
} from "../generated/RecipeMarketHub/RecipeMarketHub";
import { RawMarketRecipe, RawOfferRecipe } from "../generated/schema";
import {
  generateRawMarketId,
  generateRawOfferId,
  generateRawOfferTokenBalanceId,
} from "./utils";
import {
  createOrUpdateRawMarketTokenBalance,
  updateRawOfferTokenBalance,
  updateRawVolume,
} from "./token-balance-handler";
import { createRawOffer, fillRawOffer } from "./offer-handler";
import { createRawPosition } from "./position-handler";
import { WeirollWalletTemplate } from "../generated/templates";

export function createAPOffer(event: APOfferCreatedEvent): void {
  let rawMarketRefId = generateRawMarketId(
    event.params.marketHash.toHexString() // Market Hash
  );

  let rawMarket = RawMarketRecipe.load(rawMarketRefId);

  if (rawMarket) {
    /**
     * @description Create a new RawOffer entity
     */
    createRawOffer(
      rawMarket.marketId, // Market Hash
      0, // Offer side: AP
      event.params.offerID.toString(), // Offer ID
      event.params.ap.toHexString(), // Creator
      event.params.fundingVault.toHexString(), // Funding vault
      event.params.quantity, // Input amount
      event.params.incentiveAddresses, // Incentive tokens
      event.params.incentiveAmounts, // Incentive amounts
      event.params.expiry, // Expiry
      event.block.number, // Block number
      event.block.timestamp, // Block timestamp
      event.transaction.hash, // Transaction hash
      event.logIndex // Log index
    );
  }
}

export function fillAPOffer(event: APOfferFilledEvent): void {
  // Extract the address of the Weiroll Wallet from the event
  let weirollWalletAddress = event.params.weirollWallet;

  // Dynamically create a new data source for the Weiroll Wallet contract
  WeirollWalletTemplate.create(weirollWalletAddress);

  let rawOfferRefId = generateRawOfferId(
    0, // Offer side: AP
    event.params.offerID.toString() // Offer ID
  );

  let rawOffer = RawOfferRecipe.load(rawOfferRefId);

  if (rawOffer) {
    let rawMarketRefId = rawOffer.rawMarketRefId;
    let rawMarket = RawMarketRecipe.load(rawMarketRefId);

    if (rawMarket) {
      /**
       * @description Update the Input token balance in the offer
       */
      fillRawOffer(
        rawMarketRefId, // Market Hash
        rawOfferRefId, // Offer ID
        event.params.fillAmount, // Input fill amount
        event.params.incentiveAmounts // Incentive fill amounts
      );

      /**
       * @description Update the Input token balance in the market
       * @note no de-duplication required, because only one token
       */
      createOrUpdateRawMarketTokenBalance(
        rawMarket.marketId, // Market Hash
        0, // Token class: Input
        rawMarket.inputTokenId, // Input Token ID
        event.params.fillAmount, // Input fill amount
        0 // Add
      );

      /**
       * @description Create a new RawPosition entity for AP
       */
      createRawPosition(
        rawMarketRefId, // Market Ref ID
        rawOfferRefId, // Offer Ref ID
        event.params.weirollWallet.toHexString(), // Weiroll Wallet Address
        rawOffer.accountAddress, // Creator
        event.params.fillAmount, // Input fill amount
        event.params.incentiveAmounts, // Incentive fill amounts
        event.block.number, // Block number
        event.block.timestamp, // Block timestamp
        event.transaction.hash, // Transaction Hash
        event.logIndex // Log Index
      );

      let deduplicatedTokenIdsVolume: string[] = [];
      let deduplicatedTokenAmountsVolume: BigInt[] = [];

      /**
       * @description Update the volume in the market for the input token
       */
      deduplicatedTokenIdsVolume.push(rawMarket.inputTokenId);
      deduplicatedTokenAmountsVolume.push(event.params.fillAmount);

      /**
       * @description Update the volume in the market for the incentive tokens
       */
      for (let i = 0; i < rawOffer.token1Ids.length; i++) {
        if (deduplicatedTokenIdsVolume.includes(rawOffer.token1Ids[i])) {
          let index = deduplicatedTokenIdsVolume.indexOf(rawOffer.token1Ids[i]);
          deduplicatedTokenAmountsVolume[index] =
            deduplicatedTokenAmountsVolume[index].plus(
              event.params.incentiveAmounts[i]
            );
        } else {
          deduplicatedTokenIdsVolume.push(rawOffer.token1Ids[i]);
          deduplicatedTokenAmountsVolume.push(event.params.incentiveAmounts[i]);
        }
      }

      for (let i = 0; i < deduplicatedTokenIdsVolume.length; i++) {
        updateRawVolume(
          rawMarket.marketId, // Market Hash
          deduplicatedTokenIdsVolume[i], // Token ID
          deduplicatedTokenAmountsVolume[i], // Token amount
          event.block.number, // Block number
          event.block.timestamp, // Block timestamp
          event.transaction.hash, // Transaction hash
          event.logIndex, // Log index
          0 // Type: Add
        );
      }
    }
  }
}

export function cancelAPOffer(event: APOfferCancelledEvent): void {
  let rawOfferRefId = generateRawOfferId(
    0, // Offer side: AP
    event.params.offerID.toString() // Offer ID
  );
  let rawOffer = RawOfferRecipe.load(rawOfferRefId);

  if (rawOffer && rawOffer.isCancelled == false) {
    let rawMarketRefId = rawOffer.rawMarketRefId;
    let rawMarket = RawMarketRecipe.load(rawMarketRefId);

    if (rawMarket) {
      /**
       * @description Zero the Input token balance in the offer
       * @note no de-duplication required, because only one token
       */
      updateRawOfferTokenBalance(
        generateRawOfferTokenBalanceId(
          rawOfferRefId, // Offer Ref ID
          0, // Token class: Input
          rawMarket.inputTokenId // Input Token ID
        ),
        BigInt.zero(), // Input token amount
        2 // Set
      );

      /**
       * @description Zero the incentive token balances in the offer
       * @note no de-duplication required, because token1Ids will always have unique tokens
       */
      for (let i = 0; i < rawOffer.token1Ids.length; i++) {
        updateRawOfferTokenBalance(
          generateRawOfferTokenBalanceId(
            rawOfferRefId, // Offer Ref ID
            1, // Token class: Incentive
            rawOffer.token1Ids[i] // Incentive Token ID
          ),
          BigInt.zero(), // Token amount
          2 // Set
        );
      }

      /**
       * @description Update the isCancelled flag in the offer
       */
      rawOffer.token0AmountRemaining = BigInt.zero();
      rawOffer.token1AmountsRemaining =
        rawOffer.token1AmountsRemaining.map<BigInt>((amount) => BigInt.zero());
      rawOffer.isCancelled = true;

      rawOffer.save();
    }
  }
}
