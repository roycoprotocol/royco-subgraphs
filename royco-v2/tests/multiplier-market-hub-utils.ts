import { newMockEvent } from "matchstick-as"
import { ethereum, Bytes, Address, BigInt } from "@graphprotocol/graph-ts"
import {
  APOfferCreated,
  APOfferFilled,
  OptedInToIncentiveCampaign
} from "../generated/MultiplierMarketHub/MultiplierMarketHub"

export function createAPOfferCreatedEvent(
  incentiveCampaignId: Bytes,
  apOfferHash: Bytes,
  ap: Address,
  multiplier: BigInt,
  size: BigInt
): APOfferCreated {
  let apOfferCreatedEvent = changetype<APOfferCreated>(newMockEvent())

  apOfferCreatedEvent.parameters = new Array()

  apOfferCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "incentiveCampaignId",
      ethereum.Value.fromFixedBytes(incentiveCampaignId)
    )
  )
  apOfferCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "apOfferHash",
      ethereum.Value.fromFixedBytes(apOfferHash)
    )
  )
  apOfferCreatedEvent.parameters.push(
    new ethereum.EventParam("ap", ethereum.Value.fromAddress(ap))
  )
  apOfferCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "multiplier",
      ethereum.Value.fromUnsignedBigInt(multiplier)
    )
  )
  apOfferCreatedEvent.parameters.push(
    new ethereum.EventParam("size", ethereum.Value.fromUnsignedBigInt(size))
  )

  return apOfferCreatedEvent
}

export function createAPOfferFilledEvent(
  apOfferHash: Bytes,
  incentiveCampaignId: Bytes,
  ap: Address,
  multiplier: BigInt,
  size: BigInt
): APOfferFilled {
  let apOfferFilledEvent = changetype<APOfferFilled>(newMockEvent())

  apOfferFilledEvent.parameters = new Array()

  apOfferFilledEvent.parameters.push(
    new ethereum.EventParam(
      "apOfferHash",
      ethereum.Value.fromFixedBytes(apOfferHash)
    )
  )
  apOfferFilledEvent.parameters.push(
    new ethereum.EventParam(
      "incentiveCampaignId",
      ethereum.Value.fromFixedBytes(incentiveCampaignId)
    )
  )
  apOfferFilledEvent.parameters.push(
    new ethereum.EventParam("ap", ethereum.Value.fromAddress(ap))
  )
  apOfferFilledEvent.parameters.push(
    new ethereum.EventParam(
      "multiplier",
      ethereum.Value.fromUnsignedBigInt(multiplier)
    )
  )
  apOfferFilledEvent.parameters.push(
    new ethereum.EventParam("size", ethereum.Value.fromUnsignedBigInt(size))
  )

  return apOfferFilledEvent
}

export function createOptedInToIncentiveCampaignEvent(
  incentiveCampaignId: Bytes,
  ap: Address
): OptedInToIncentiveCampaign {
  let optedInToIncentiveCampaignEvent =
    changetype<OptedInToIncentiveCampaign>(newMockEvent())

  optedInToIncentiveCampaignEvent.parameters = new Array()

  optedInToIncentiveCampaignEvent.parameters.push(
    new ethereum.EventParam(
      "incentiveCampaignId",
      ethereum.Value.fromFixedBytes(incentiveCampaignId)
    )
  )
  optedInToIncentiveCampaignEvent.parameters.push(
    new ethereum.EventParam("ap", ethereum.Value.fromAddress(ap))
  )

  return optedInToIncentiveCampaignEvent
}
