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
import { generateId } from "./utils/id-generator"
import { BIG_INT_ZERO, CHAIN_ID } from "./utils/constants"

export function handleAPOfferCreated(event: APOfferCreatedEvent): void {
  let entity = new APOfferCreated(
    generateId(event.transaction.hash, event.logIndex)
  )
  entity.incentiveCampaignId = event.params.incentiveCampaignId.toHexString()
  entity.apOfferHash = event.params.apOfferHash.toHexString()
  entity.ap = event.params.ap.toHexString()
  entity.multiplier = event.params.multiplier
  entity.size = event.params.size

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash.toHexString()
  entity.logIndex = event.logIndex

  entity.save()
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

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash.toHexString()
  entity.logIndex = event.logIndex


  entity.save()
}

export function handleOptedInToIncentiveCampaign(
  event: OptedInToIncentiveCampaignEvent,
): void {
  let entity = new OptedInToIncentiveCampaign(
    generateId(event.transaction.hash, event.logIndex)
  )
  entity.incentiveCampaignId = event.params.incentiveCampaignId.toHexString()
  entity.ap = event.params.ap.toHexString()

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash.toHexString()
  entity.logIndex = event.logIndex


  entity.save()
}
