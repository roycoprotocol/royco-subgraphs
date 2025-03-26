import { BigInt } from "@graphprotocol/graph-ts";
import {
  APOfferCancelled as APOfferCancelledEvent,
  APOfferCreated as APOfferCreatedEvent,
  APOfferFilled as APOfferFilledEvent,
} from "../generated/VaultMarketHub/VaultMarketHub";
import { RawMarketVault, RawOfferVault } from "../generated/schema";
import { createRawOffer, fillRawOffer } from "./offer-handler";

import { updateRawOfferTokenBalance } from "./token-balance-handler";
import {
  generateRawMarketId,
  generateRawOfferId,
  generateRawOfferTokenBalanceId,
} from "./utils";

export function createAPOffer(event: APOfferCreatedEvent): void {
  let rawMarketRefId = generateRawMarketId(event.params.marketID.toHexString());

  let rawMarket = RawMarketVault.load(rawMarketRefId);

  if (rawMarket) {
    /**
     * @description Create a new RawOffer entity
     */
    createRawOffer(
      rawMarket.marketId, // Market ID
      0, // Offer side: AP
      event.params.offerID.toString(), // Offer ID
      event.params.ap.toHexString(), // Creator
      event.params.fundingVault.toHexString(), // Funding vault
      event.params.quantity, // Input amount
      event.params.incentivesRequested, // Incentive tokens
      event.params.incentivesRates, // Incentive amounts
      event.params.expiry, // Expiry
      event.block.number, // Block number
      event.block.timestamp, // Block timestamp
      event.transaction.hash, // Transaction hash
      event.logIndex // Log index
    );
  }
}

export function fillAPOffer(event: APOfferFilledEvent): void {
  let rawOfferRefId = generateRawOfferId(
    0, // Offer side: AP
    event.params.offerID.toString() // Offer ID
  );

  let rawOffer = RawOfferVault.load(rawOfferRefId);

  if (rawOffer) {
    let rawMarketRefId = rawOffer.rawMarketRefId;
    let rawMarket = RawMarketVault.load(rawMarketRefId);

    if (rawMarket) {
      /**
       * @description Update the Input token balance in the offer
       */
      fillRawOffer(rawMarketRefId, rawOfferRefId, event.params.fillAmount);
    }
  }
}

export function cancelAPOffer(event: APOfferCancelledEvent): void {
  let rawOfferRefId = generateRawOfferId(
    0, // Offer side: AP
    event.params.offerID.toString() // Offer ID
  );
  let rawOffer = RawOfferVault.load(rawOfferRefId);

  if (rawOffer) {
    let rawMarketRefId = rawOffer.rawMarketRefId;
    let rawMarket = RawMarketVault.load(rawMarketRefId);

    if (rawMarket) {
      /**
       * @description Zero the Input token balance in the offer
       */
      updateRawOfferTokenBalance(
        generateRawOfferTokenBalanceId(
          rawOfferRefId, // Offer Ref ID
          0, // Token class: Input
          rawMarket.inputTokenId // Input token ID
        ),
        BigInt.zero(), // Input token amount
        2 // Set
      );

      /**
       * @description Zero the incentive token balances in the offer
       */
      for (let i = 0; i < rawOffer.token1Ids.length; i++) {
        updateRawOfferTokenBalance(
          generateRawOfferTokenBalanceId(
            rawOfferRefId, // Offer Ref ID
            1, // Token class: Incentive
            rawOffer.token1Ids[i] // Incentive token ID
          ),
          BigInt.zero(), // Incentive token amount
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
