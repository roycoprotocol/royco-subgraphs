import { newMockEvent } from "matchstick-as"
import { ethereum, BigInt, Address } from "@graphprotocol/graph-ts"
import {
  APOfferCancelled,
  APOfferCreated,
  APOfferFilled,
  OwnershipTransferStarted,
  OwnershipTransferred
} from "../generated/VaultMarketHub/VaultMarketHub"

export function createAPOfferCancelledEvent(offerID: BigInt): APOfferCancelled {
  let apOfferCancelledEvent = changetype<APOfferCancelled>(newMockEvent())

  apOfferCancelledEvent.parameters = new Array()

  apOfferCancelledEvent.parameters.push(
    new ethereum.EventParam(
      "offerID",
      ethereum.Value.fromUnsignedBigInt(offerID)
    )
  )

  return apOfferCancelledEvent
}

export function createAPOfferCreatedEvent(
  offerID: BigInt,
  marketID: Address,
  ap: Address,
  fundingVault: Address,
  quantity: BigInt,
  incentivesRequested: Array<Address>,
  incentivesRates: Array<BigInt>,
  expiry: BigInt
): APOfferCreated {
  let apOfferCreatedEvent = changetype<APOfferCreated>(newMockEvent())

  apOfferCreatedEvent.parameters = new Array()

  apOfferCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "offerID",
      ethereum.Value.fromUnsignedBigInt(offerID)
    )
  )
  apOfferCreatedEvent.parameters.push(
    new ethereum.EventParam("marketID", ethereum.Value.fromAddress(marketID))
  )
  apOfferCreatedEvent.parameters.push(
    new ethereum.EventParam("ap", ethereum.Value.fromAddress(ap))
  )
  apOfferCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "fundingVault",
      ethereum.Value.fromAddress(fundingVault)
    )
  )
  apOfferCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "quantity",
      ethereum.Value.fromUnsignedBigInt(quantity)
    )
  )
  apOfferCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "incentivesRequested",
      ethereum.Value.fromAddressArray(incentivesRequested)
    )
  )
  apOfferCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "incentivesRates",
      ethereum.Value.fromUnsignedBigIntArray(incentivesRates)
    )
  )
  apOfferCreatedEvent.parameters.push(
    new ethereum.EventParam("expiry", ethereum.Value.fromUnsignedBigInt(expiry))
  )

  return apOfferCreatedEvent
}

export function createAPOfferFilledEvent(
  offerID: BigInt,
  fillAmount: BigInt
): APOfferFilled {
  let apOfferFilledEvent = changetype<APOfferFilled>(newMockEvent())

  apOfferFilledEvent.parameters = new Array()

  apOfferFilledEvent.parameters.push(
    new ethereum.EventParam(
      "offerID",
      ethereum.Value.fromUnsignedBigInt(offerID)
    )
  )
  apOfferFilledEvent.parameters.push(
    new ethereum.EventParam(
      "fillAmount",
      ethereum.Value.fromUnsignedBigInt(fillAmount)
    )
  )

  return apOfferFilledEvent
}

export function createOwnershipTransferStartedEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferStarted {
  let ownershipTransferStartedEvent = changetype<OwnershipTransferStarted>(
    newMockEvent()
  )

  ownershipTransferStartedEvent.parameters = new Array()

  ownershipTransferStartedEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferStartedEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferStartedEvent
}

export function createOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent = changetype<OwnershipTransferred>(
    newMockEvent()
  )

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}
