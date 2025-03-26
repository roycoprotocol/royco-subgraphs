import {
  APOfferCancelled as APOfferCancelledEvent,
  APOfferCreated as APOfferCreatedEvent,
  APOfferFilled as APOfferFilledEvent,
} from "../generated/VaultMarketHub/VaultMarketHub";
import {
  APOfferCancelled,
  APOfferCreated,
  APOfferFilled,
} from "../generated/schema";
import { cancelAPOffer, createAPOffer, fillAPOffer } from "./ap-handler";
import { CHAIN_ID } from "./constants";
import { generateId } from "./utils";

export function handleAPOfferCreated(event: APOfferCreatedEvent): void {
  let entity = new APOfferCreated(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.offerID = event.params.offerID;
  entity.marketID = event.params.marketID.toHexString();
  entity.ap = event.params.ap.toHexString();
  entity.fundingVault = event.params.fundingVault.toHexString();
  entity.quantity = event.params.quantity;
  entity.incentivesRequested = event.params.incentivesRequested.map<string>(
    (incentive) => incentive.toHexString()
  );
  entity.incentivesRates = event.params.incentivesRates;
  entity.expiry = event.params.expiry;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  // Create AP Offer
  createAPOffer(event);
}

export function handleAPOfferFilled(event: APOfferFilledEvent): void {
  let entity = new APOfferFilled(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.offerID = event.params.offerID;
  entity.fillAmount = event.params.fillAmount;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  // Fill AP Offer
  fillAPOffer(event);
}

export function handleAPOfferCancelled(event: APOfferCancelledEvent): void {
  let entity = new APOfferCancelled(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.offerID = event.params.offerID;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  // Cancel AP Offer
  cancelAPOffer(event);
}
