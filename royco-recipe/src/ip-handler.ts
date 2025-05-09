import { BigInt } from "@graphprotocol/graph-ts";
import {
  IPOfferCancelled as IPOfferCancelledEvent,
  IPOfferCreated as IPOfferCreatedEvent,
  IPOfferFilled as IPOfferFilledEvent,
} from "../generated/RecipeMarketHub/RecipeMarketHub";
import {
  RawMarketRecipe,
  RawOfferRecipe,
  RawPositionRecipeBoyco,
} from "../generated/schema";
import {
  generateRawMarketId,
  generateRawOfferId,
  generateRawOfferTokenBalanceId,
  generateRawPositionId,
  generateTokenId,
} from "./utils";
import {
  createOrUpdateRawMarketTokenBalance,
  updateRawOfferTokenBalance,
  updateRawVolume,
} from "./token-balance-handler";
import { createRawOffer, fillRawOffer } from "./offer-handler";
import { createRawPosition } from "./position-handler";
import { WeirollWalletTemplate } from "../generated/templates";
import { NULL_ADDRESS } from "./constants";
import { createRawGlobalActivity } from "./global-activity-handler";

export function createIPOffer(event: IPOfferCreatedEvent): void {
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
      1, // Offer side: IP
      event.params.offerHash.toHexString(), // Offer Hash
      event.params.ip.toHexString(), // Creator
      NULL_ADDRESS, // Funding vault
      event.params.quantity, // Input amount
      event.params.incentivesOffered, // Incentive tokens
      event.params.incentiveAmounts, // Incentive amounts
      event.params.expiry, // Expiry
      event.block.number, // Block number
      event.block.timestamp, // Block timestamp
      event.transaction.hash, // Transaction hash
      event.logIndex // Log index
    );

    // Update the incentive token balance in the market
    // @note: no de-duplication required, because incentivesOffered will always have unique tokens
    for (let i = 0; i < event.params.incentiveAmounts.length; i++) {
      createOrUpdateRawMarketTokenBalance(
        rawMarket.marketId, // Market Hash
        1, // Token class: Incentive
        generateTokenId(event.params.incentivesOffered[i]), // Incentive Token ID
        event.params.incentiveAmounts[i], // Incentive amount
        0 // Type: Add
      );
    }
  }
}

export function fillIPOffer(event: IPOfferFilledEvent): void {
  // Extract the address of the Weiroll Wallet from the event
  let weirollWalletAddress = event.params.weirollWallet;

  // Dynamically create a new data source for the Weiroll Wallet contract
  WeirollWalletTemplate.create(weirollWalletAddress);

  let rawOfferRefId = generateRawOfferId(
    1, // Offer side: IP
    event.params.offerHash.toHexString() // Offer Hash
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

      let rawPositionRefId = generateRawPositionId(
        event.params.weirollWallet.toHexString()
      );

      let rawPositionRecipeBoyco =
        RawPositionRecipeBoyco.load(rawPositionRefId);

      if (!rawPositionRecipeBoyco) {
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
      }

      /**
       * @description Create a new RawPosition entity for AP
       */
      createRawPosition(
        rawMarketRefId, // Market Ref ID
        rawOfferRefId, // Offer Ref ID
        event.params.weirollWallet.toHexString(), // Weiroll Wallet Address
        event.params.ap.toHexString(), // Creator
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

      // Create "deposit" event
      createRawGlobalActivity(
        "recipe", // Category
        "deposit", // Sub Category
        rawMarketRefId, // Source Ref ID
        event.address.toHexString(), // Contract Address
        event.params.ap.toHexString(), // Account Address
        BigInt.fromI32(0), // Token Index
        rawMarket.inputTokenId, // Token ID
        event.params.fillAmount, // Token Amount
        event.block.number, // Block Number
        event.block.timestamp, // Block Timestamp
        event.transaction.hash, // Transaction Hash
        event.logIndex // Log Index
      );

      // if reward style is 0, create a claim for every incentive token
      if (rawMarket.rewardStyle == 0) {
        for (let i = 0; i < rawOffer.token1Ids.length; i++) {
          // Create "claim" events
          createRawGlobalActivity(
            "recipe", // Category
            "claim", // Sub Category
            rawMarketRefId, // Source Ref ID
            event.address.toHexString(), // Contract Address
            event.params.ap.toHexString(), // Account Address
            BigInt.fromI32(i), // Token Index
            rawOffer.token1Ids[i], // Token ID
            event.params.incentiveAmounts[i], // Token Amount
            event.block.number, // Block Number
            event.block.timestamp, // Block Timestamp
            event.transaction.hash, // Transaction Hash
            event.logIndex // Log Index
          );
        }
      }
    }
  }
}

export function cancelIPOffer(event: IPOfferCancelledEvent): void {
  let rawOfferRefId = generateRawOfferId(
    1, // Offer side: IP
    event.params.offerHash.toHexString() // Offer Hash
  );
  let rawOffer = RawOfferRecipe.load(rawOfferRefId);

  if (rawOffer) {
    let rawMarketRefId = rawOffer.rawMarketRefId;
    let rawMarket = RawMarketRecipe.load(rawMarketRefId);

    if (rawMarket && rawOffer.isCancelled == false) {
      /**
       * @description Update the incentive token balance in the market
       * @note no de-duplication required, because token1Ids will always have unique tokens
       */
      for (let i = 0; i < rawOffer.token1Ids.length; i++) {
        createOrUpdateRawMarketTokenBalance(
          rawMarket.marketId, // Market Hash
          1, // Token class: Incentive
          rawOffer.token1Ids[i], // Incentive Token ID
          rawOffer.token1AmountsRemaining[i], // Token amount
          1 // Subtract
        );
      }

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
        BigInt.zero(), // Token amount
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
