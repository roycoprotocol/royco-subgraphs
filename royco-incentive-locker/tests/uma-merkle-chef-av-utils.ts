import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
  AssertersBlacklisted,
  AssertersWhitelisted,
  AssertionLivenessUpdated,
  BondCurrencyUpdated,
  EmissionRatesUpdated,
  MerkleRootAsserted,
  MerkleRootAssertionDisputed,
  MerkleRootAssertionResolved,
  OwnershipTransferStarted,
  OwnershipTransferred
} from "../generated/UmaMerkleChefAV/UmaMerkleChefAV"

export function createAssertersBlacklistedEvent(
  blacklistedAsserters: Array<Address>
): AssertersBlacklisted {
  let assertersBlacklistedEvent =
    changetype<AssertersBlacklisted>(newMockEvent())

  assertersBlacklistedEvent.parameters = new Array()

  assertersBlacklistedEvent.parameters.push(
    new ethereum.EventParam(
      "blacklistedAsserters",
      ethereum.Value.fromAddressArray(blacklistedAsserters)
    )
  )

  return assertersBlacklistedEvent
}

export function createAssertersWhitelistedEvent(
  whitelistedAsserters: Array<Address>
): AssertersWhitelisted {
  let assertersWhitelistedEvent =
    changetype<AssertersWhitelisted>(newMockEvent())

  assertersWhitelistedEvent.parameters = new Array()

  assertersWhitelistedEvent.parameters.push(
    new ethereum.EventParam(
      "whitelistedAsserters",
      ethereum.Value.fromAddressArray(whitelistedAsserters)
    )
  )

  return assertersWhitelistedEvent
}

export function createAssertionLivenessUpdatedEvent(
  newAssertionLiveness: BigInt
): AssertionLivenessUpdated {
  let assertionLivenessUpdatedEvent =
    changetype<AssertionLivenessUpdated>(newMockEvent())

  assertionLivenessUpdatedEvent.parameters = new Array()

  assertionLivenessUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "newAssertionLiveness",
      ethereum.Value.fromUnsignedBigInt(newAssertionLiveness)
    )
  )

  return assertionLivenessUpdatedEvent
}

export function createBondCurrencyUpdatedEvent(
  newBondCurrency: Address
): BondCurrencyUpdated {
  let bondCurrencyUpdatedEvent = changetype<BondCurrencyUpdated>(newMockEvent())

  bondCurrencyUpdatedEvent.parameters = new Array()

  bondCurrencyUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "newBondCurrency",
      ethereum.Value.fromAddress(newBondCurrency)
    )
  )

  return bondCurrencyUpdatedEvent
}

export function createEmissionRatesUpdatedEvent(
  incentiveCampaignId: Bytes,
  incentives: Array<Address>,
  updatedRates: Array<BigInt>
): EmissionRatesUpdated {
  let emissionRatesUpdatedEvent =
    changetype<EmissionRatesUpdated>(newMockEvent())

  emissionRatesUpdatedEvent.parameters = new Array()

  emissionRatesUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "incentiveCampaignId",
      ethereum.Value.fromFixedBytes(incentiveCampaignId)
    )
  )
  emissionRatesUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "incentives",
      ethereum.Value.fromAddressArray(incentives)
    )
  )
  emissionRatesUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "updatedRates",
      ethereum.Value.fromUnsignedBigIntArray(updatedRates)
    )
  )

  return emissionRatesUpdatedEvent
}

export function createMerkleRootAssertedEvent(
  assertionId: Bytes,
  incentiveCampaignId: Bytes,
  asserter: Address,
  merkleRoot: Bytes
): MerkleRootAsserted {
  let merkleRootAssertedEvent = changetype<MerkleRootAsserted>(newMockEvent())

  merkleRootAssertedEvent.parameters = new Array()

  merkleRootAssertedEvent.parameters.push(
    new ethereum.EventParam(
      "assertionId",
      ethereum.Value.fromFixedBytes(assertionId)
    )
  )
  merkleRootAssertedEvent.parameters.push(
    new ethereum.EventParam(
      "incentiveCampaignId",
      ethereum.Value.fromFixedBytes(incentiveCampaignId)
    )
  )
  merkleRootAssertedEvent.parameters.push(
    new ethereum.EventParam("asserter", ethereum.Value.fromAddress(asserter))
  )
  merkleRootAssertedEvent.parameters.push(
    new ethereum.EventParam(
      "merkleRoot",
      ethereum.Value.fromFixedBytes(merkleRoot)
    )
  )

  return merkleRootAssertedEvent
}

export function createMerkleRootAssertionDisputedEvent(
  assertionId: Bytes,
  merkleRoot: Bytes
): MerkleRootAssertionDisputed {
  let merkleRootAssertionDisputedEvent =
    changetype<MerkleRootAssertionDisputed>(newMockEvent())

  merkleRootAssertionDisputedEvent.parameters = new Array()

  merkleRootAssertionDisputedEvent.parameters.push(
    new ethereum.EventParam(
      "assertionId",
      ethereum.Value.fromFixedBytes(assertionId)
    )
  )
  merkleRootAssertionDisputedEvent.parameters.push(
    new ethereum.EventParam(
      "merkleRoot",
      ethereum.Value.fromFixedBytes(merkleRoot)
    )
  )

  return merkleRootAssertionDisputedEvent
}

export function createMerkleRootAssertionResolvedEvent(
  assertionId: Bytes,
  merkleRoot: Bytes
): MerkleRootAssertionResolved {
  let merkleRootAssertionResolvedEvent =
    changetype<MerkleRootAssertionResolved>(newMockEvent())

  merkleRootAssertionResolvedEvent.parameters = new Array()

  merkleRootAssertionResolvedEvent.parameters.push(
    new ethereum.EventParam(
      "assertionId",
      ethereum.Value.fromFixedBytes(assertionId)
    )
  )
  merkleRootAssertionResolvedEvent.parameters.push(
    new ethereum.EventParam(
      "merkleRoot",
      ethereum.Value.fromFixedBytes(merkleRoot)
    )
  )

  return merkleRootAssertionResolvedEvent
}

export function createOwnershipTransferStartedEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferStarted {
  let ownershipTransferStartedEvent =
    changetype<OwnershipTransferStarted>(newMockEvent())

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
  let ownershipTransferredEvent =
    changetype<OwnershipTransferred>(newMockEvent())

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
