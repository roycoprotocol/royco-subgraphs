import {
  APOfferCreated as APOfferCreatedEvent,
  APOfferFilled as APOfferFilledEvent,
  OptedInToIncentiveCampaign as OptedInToIncentiveCampaignEvent,
} from "../generated/MultiplierMarketHub/MultiplierMarketHub"
import {
  APOfferCreated,
  APOfferFilled,
  OptedInToIncentiveCampaign,
} from "../generated/schema"
import { generateId, generateRawUserMultiplierStateId } from "./utils/id-generator"
import { BIG_INT_ZERO, DEFAULT_MULTIPLIER } from "./utils/constants"
import { handleMultiplierUpdate, handleAPOfferCreation } from "./handlers/multiplier-handler"

export function handleAPOfferCreated(event: APOfferCreatedEvent): void {
  let entity = new APOfferCreated(
    generateId(event.transaction.hash, event.logIndex)
  )
  entity.incentiveCampaignId = event.params.incentiveCampaignId.toHexString()
  entity.apOfferHash = event.params.apOfferHash.toHexString()
  entity.ap = event.params.ap.toHexString()
  entity.multiplier = event.params.multiplier
  entity.size = event.params.size
  entity.rawUserMultiplierStateRefId = generateRawUserMultiplierStateId(entity.incentiveCampaignId, entity.ap);

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash.toHexString()
  entity.logIndex = event.logIndex

  entity.save()

  handleAPOfferCreation(entity);
}

export function handleAPOfferFilled(event: APOfferFilledEvent): void {
  let entity = new APOfferFilled(
    generateId(event.transaction.hash, event.logIndex)
  )
  entity.apOfferHash = event.params.apOfferHash.toHexString()
  entity.incentiveCampaignId = event.params.incentiveCampaignId.toHexString()
  entity.ap = event.params.ap.toHexString()
  entity.multiplier = event.params.multiplier
  entity.size = event.params.size
  entity.rawUserMultiplierStateRefId = generateRawUserMultiplierStateId(entity.incentiveCampaignId, entity.ap);

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash.toHexString()
  entity.logIndex = event.logIndex

  entity.save()

  handleMultiplierUpdate(entity.incentiveCampaignId, entity.ap, entity.multiplier, entity.size, entity.blockNumber, entity.blockTimestamp, entity.transactionHash, entity.logIndex);
}

export function handleOptedInToIncentiveCampaign(
  event: OptedInToIncentiveCampaignEvent,
): void {
  let entity = new OptedInToIncentiveCampaign(
    generateId(event.transaction.hash, event.logIndex)
  )
  entity.incentiveCampaignId = event.params.incentiveCampaignId.toHexString()
  entity.ap = event.params.ap.toHexString()
  entity.rawUserMultiplierStateRefId = generateRawUserMultiplierStateId(entity.incentiveCampaignId, entity.ap);

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash.toHexString()
  entity.logIndex = event.logIndex


  entity.save()

  handleMultiplierUpdate(entity.incentiveCampaignId, entity.ap, DEFAULT_MULTIPLIER, BIG_INT_ZERO, entity.blockNumber, entity.blockTimestamp, entity.transactionHash, entity.logIndex);
}
