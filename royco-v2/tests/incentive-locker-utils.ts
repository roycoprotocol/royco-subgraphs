import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
  Award,
  CoIPsAdded,
  CoIPsRemoved,
  DefaultProtocolFeeClaimantSet,
  DefaultProtocolFeeSet,
  FeesClaimed,
  IncentiveCampaignCreated,
  IncentivesAdded,
  IncentivesClaimed,
  IncentivesRemoved,
  OwnershipTransferStarted,
  OwnershipTransferred,
  PointsProgramCreated,
  PointsProgramOwnershipTransferred,
  PointsSpent,
  ProtocolFeeClaimantForCampaignSet,
  ProtocolFeeForCampaignSet,
  SpendCapsUpdated
} from "../generated/IncentiveLocker/IncentiveLocker"

export function createAwardEvent(
  pointsId: Address,
  recipient: Address,
  amount: BigInt
): Award {
  let awardEvent = changetype<Award>(newMockEvent())

  awardEvent.parameters = new Array()

  awardEvent.parameters.push(
    new ethereum.EventParam("pointsId", ethereum.Value.fromAddress(pointsId))
  )
  awardEvent.parameters.push(
    new ethereum.EventParam("recipient", ethereum.Value.fromAddress(recipient))
  )
  awardEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return awardEvent
}

export function createCoIPsAddedEvent(
  incentiveCampaignId: Bytes,
  coIPs: Array<Address>
): CoIPsAdded {
  let coIPsAddedEvent = changetype<CoIPsAdded>(newMockEvent())

  coIPsAddedEvent.parameters = new Array()

  coIPsAddedEvent.parameters.push(
    new ethereum.EventParam(
      "incentiveCampaignId",
      ethereum.Value.fromFixedBytes(incentiveCampaignId)
    )
  )
  coIPsAddedEvent.parameters.push(
    new ethereum.EventParam("coIPs", ethereum.Value.fromAddressArray(coIPs))
  )

  return coIPsAddedEvent
}

export function createCoIPsRemovedEvent(
  incentiveCampaignId: Bytes,
  coIPs: Array<Address>
): CoIPsRemoved {
  let coIPsRemovedEvent = changetype<CoIPsRemoved>(newMockEvent())

  coIPsRemovedEvent.parameters = new Array()

  coIPsRemovedEvent.parameters.push(
    new ethereum.EventParam(
      "incentiveCampaignId",
      ethereum.Value.fromFixedBytes(incentiveCampaignId)
    )
  )
  coIPsRemovedEvent.parameters.push(
    new ethereum.EventParam("coIPs", ethereum.Value.fromAddressArray(coIPs))
  )

  return coIPsRemovedEvent
}

export function createDefaultProtocolFeeClaimantSetEvent(
  newDefaultProtocolFeeClaimant: Address
): DefaultProtocolFeeClaimantSet {
  let defaultProtocolFeeClaimantSetEvent =
    changetype<DefaultProtocolFeeClaimantSet>(newMockEvent())

  defaultProtocolFeeClaimantSetEvent.parameters = new Array()

  defaultProtocolFeeClaimantSetEvent.parameters.push(
    new ethereum.EventParam(
      "newDefaultProtocolFeeClaimant",
      ethereum.Value.fromAddress(newDefaultProtocolFeeClaimant)
    )
  )

  return defaultProtocolFeeClaimantSetEvent
}

export function createDefaultProtocolFeeSetEvent(
  newDefaultProtocolFee: BigInt
): DefaultProtocolFeeSet {
  let defaultProtocolFeeSetEvent =
    changetype<DefaultProtocolFeeSet>(newMockEvent())

  defaultProtocolFeeSetEvent.parameters = new Array()

  defaultProtocolFeeSetEvent.parameters.push(
    new ethereum.EventParam(
      "newDefaultProtocolFee",
      ethereum.Value.fromUnsignedBigInt(newDefaultProtocolFee)
    )
  )

  return defaultProtocolFeeSetEvent
}

export function createFeesClaimedEvent(
  claimant: Address,
  incentive: Address,
  amount: BigInt
): FeesClaimed {
  let feesClaimedEvent = changetype<FeesClaimed>(newMockEvent())

  feesClaimedEvent.parameters = new Array()

  feesClaimedEvent.parameters.push(
    new ethereum.EventParam("claimant", ethereum.Value.fromAddress(claimant))
  )
  feesClaimedEvent.parameters.push(
    new ethereum.EventParam("incentive", ethereum.Value.fromAddress(incentive))
  )
  feesClaimedEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return feesClaimedEvent
}

export function createIncentiveCampaignCreatedEvent(
  incentiveCampaignId: Bytes,
  ip: Address,
  actionVerifier: Address,
  actionParams: Bytes,
  defaultProtocolFee: BigInt,
  incentivesOffered: Array<Address>,
  incentiveAmountsOffered: Array<BigInt>
): IncentiveCampaignCreated {
  let incentiveCampaignCreatedEvent =
    changetype<IncentiveCampaignCreated>(newMockEvent())

  incentiveCampaignCreatedEvent.parameters = new Array()

  incentiveCampaignCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "incentiveCampaignId",
      ethereum.Value.fromFixedBytes(incentiveCampaignId)
    )
  )
  incentiveCampaignCreatedEvent.parameters.push(
    new ethereum.EventParam("ip", ethereum.Value.fromAddress(ip))
  )
  incentiveCampaignCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "actionVerifier",
      ethereum.Value.fromAddress(actionVerifier)
    )
  )
  incentiveCampaignCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "actionParams",
      ethereum.Value.fromBytes(actionParams)
    )
  )
  incentiveCampaignCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "defaultProtocolFee",
      ethereum.Value.fromUnsignedBigInt(defaultProtocolFee)
    )
  )
  incentiveCampaignCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "incentivesOffered",
      ethereum.Value.fromAddressArray(incentivesOffered)
    )
  )
  incentiveCampaignCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "incentiveAmountsOffered",
      ethereum.Value.fromUnsignedBigIntArray(incentiveAmountsOffered)
    )
  )

  return incentiveCampaignCreatedEvent
}

export function createIncentivesAddedEvent(
  incentiveCampaignId: Bytes,
  ip: Address,
  incentivesOffered: Array<Address>,
  incentiveAmountsOffered: Array<BigInt>
): IncentivesAdded {
  let incentivesAddedEvent = changetype<IncentivesAdded>(newMockEvent())

  incentivesAddedEvent.parameters = new Array()

  incentivesAddedEvent.parameters.push(
    new ethereum.EventParam(
      "incentiveCampaignId",
      ethereum.Value.fromFixedBytes(incentiveCampaignId)
    )
  )
  incentivesAddedEvent.parameters.push(
    new ethereum.EventParam("ip", ethereum.Value.fromAddress(ip))
  )
  incentivesAddedEvent.parameters.push(
    new ethereum.EventParam(
      "incentivesOffered",
      ethereum.Value.fromAddressArray(incentivesOffered)
    )
  )
  incentivesAddedEvent.parameters.push(
    new ethereum.EventParam(
      "incentiveAmountsOffered",
      ethereum.Value.fromUnsignedBigIntArray(incentiveAmountsOffered)
    )
  )

  return incentivesAddedEvent
}

export function createIncentivesClaimedEvent(
  incentiveCampaignId: Bytes,
  ap: Address,
  incentiveAmountsPaid: Array<BigInt>,
  protocolFeesPaid: Array<BigInt>
): IncentivesClaimed {
  let incentivesClaimedEvent = changetype<IncentivesClaimed>(newMockEvent())

  incentivesClaimedEvent.parameters = new Array()

  incentivesClaimedEvent.parameters.push(
    new ethereum.EventParam(
      "incentiveCampaignId",
      ethereum.Value.fromFixedBytes(incentiveCampaignId)
    )
  )
  incentivesClaimedEvent.parameters.push(
    new ethereum.EventParam("ap", ethereum.Value.fromAddress(ap))
  )
  incentivesClaimedEvent.parameters.push(
    new ethereum.EventParam(
      "incentiveAmountsPaid",
      ethereum.Value.fromUnsignedBigIntArray(incentiveAmountsPaid)
    )
  )
  incentivesClaimedEvent.parameters.push(
    new ethereum.EventParam(
      "protocolFeesPaid",
      ethereum.Value.fromUnsignedBigIntArray(protocolFeesPaid)
    )
  )

  return incentivesClaimedEvent
}

export function createIncentivesRemovedEvent(
  incentiveCampaignId: Bytes,
  ip: Address,
  incentivesRemoved: Array<Address>,
  incentiveAmountsRemoved: Array<BigInt>
): IncentivesRemoved {
  let incentivesRemovedEvent = changetype<IncentivesRemoved>(newMockEvent())

  incentivesRemovedEvent.parameters = new Array()

  incentivesRemovedEvent.parameters.push(
    new ethereum.EventParam(
      "incentiveCampaignId",
      ethereum.Value.fromFixedBytes(incentiveCampaignId)
    )
  )
  incentivesRemovedEvent.parameters.push(
    new ethereum.EventParam("ip", ethereum.Value.fromAddress(ip))
  )
  incentivesRemovedEvent.parameters.push(
    new ethereum.EventParam(
      "incentivesRemoved",
      ethereum.Value.fromAddressArray(incentivesRemoved)
    )
  )
  incentivesRemovedEvent.parameters.push(
    new ethereum.EventParam(
      "incentiveAmountsRemoved",
      ethereum.Value.fromUnsignedBigIntArray(incentiveAmountsRemoved)
    )
  )

  return incentivesRemovedEvent
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

export function createPointsProgramCreatedEvent(
  pointsId: Address,
  owner: Address,
  name: string,
  symbol: string,
  decimals: i32,
  whitelistedIPs: Array<Address>,
  spendCaps: Array<BigInt>
): PointsProgramCreated {
  let pointsProgramCreatedEvent =
    changetype<PointsProgramCreated>(newMockEvent())

  pointsProgramCreatedEvent.parameters = new Array()

  pointsProgramCreatedEvent.parameters.push(
    new ethereum.EventParam("pointsId", ethereum.Value.fromAddress(pointsId))
  )
  pointsProgramCreatedEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )
  pointsProgramCreatedEvent.parameters.push(
    new ethereum.EventParam("name", ethereum.Value.fromString(name))
  )
  pointsProgramCreatedEvent.parameters.push(
    new ethereum.EventParam("symbol", ethereum.Value.fromString(symbol))
  )
  pointsProgramCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "decimals",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(decimals))
    )
  )
  pointsProgramCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "whitelistedIPs",
      ethereum.Value.fromAddressArray(whitelistedIPs)
    )
  )
  pointsProgramCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "spendCaps",
      ethereum.Value.fromUnsignedBigIntArray(spendCaps)
    )
  )

  return pointsProgramCreatedEvent
}

export function createPointsProgramOwnershipTransferredEvent(
  pointsId: Address,
  newOwner: Address
): PointsProgramOwnershipTransferred {
  let pointsProgramOwnershipTransferredEvent =
    changetype<PointsProgramOwnershipTransferred>(newMockEvent())

  pointsProgramOwnershipTransferredEvent.parameters = new Array()

  pointsProgramOwnershipTransferredEvent.parameters.push(
    new ethereum.EventParam("pointsId", ethereum.Value.fromAddress(pointsId))
  )
  pointsProgramOwnershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return pointsProgramOwnershipTransferredEvent
}

export function createPointsSpentEvent(
  pointsId: Address,
  ip: Address,
  amount: BigInt
): PointsSpent {
  let pointsSpentEvent = changetype<PointsSpent>(newMockEvent())

  pointsSpentEvent.parameters = new Array()

  pointsSpentEvent.parameters.push(
    new ethereum.EventParam("pointsId", ethereum.Value.fromAddress(pointsId))
  )
  pointsSpentEvent.parameters.push(
    new ethereum.EventParam("ip", ethereum.Value.fromAddress(ip))
  )
  pointsSpentEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return pointsSpentEvent
}

export function createProtocolFeeClaimantForCampaignSetEvent(
  incentiveCampaignId: Bytes,
  newProtocolFeeClaimant: Address
): ProtocolFeeClaimantForCampaignSet {
  let protocolFeeClaimantForCampaignSetEvent =
    changetype<ProtocolFeeClaimantForCampaignSet>(newMockEvent())

  protocolFeeClaimantForCampaignSetEvent.parameters = new Array()

  protocolFeeClaimantForCampaignSetEvent.parameters.push(
    new ethereum.EventParam(
      "incentiveCampaignId",
      ethereum.Value.fromFixedBytes(incentiveCampaignId)
    )
  )
  protocolFeeClaimantForCampaignSetEvent.parameters.push(
    new ethereum.EventParam(
      "newProtocolFeeClaimant",
      ethereum.Value.fromAddress(newProtocolFeeClaimant)
    )
  )

  return protocolFeeClaimantForCampaignSetEvent
}

export function createProtocolFeeForCampaignSetEvent(
  incentiveCampaignId: Bytes,
  newProtocolFee: BigInt
): ProtocolFeeForCampaignSet {
  let protocolFeeForCampaignSetEvent =
    changetype<ProtocolFeeForCampaignSet>(newMockEvent())

  protocolFeeForCampaignSetEvent.parameters = new Array()

  protocolFeeForCampaignSetEvent.parameters.push(
    new ethereum.EventParam(
      "incentiveCampaignId",
      ethereum.Value.fromFixedBytes(incentiveCampaignId)
    )
  )
  protocolFeeForCampaignSetEvent.parameters.push(
    new ethereum.EventParam(
      "newProtocolFee",
      ethereum.Value.fromUnsignedBigInt(newProtocolFee)
    )
  )

  return protocolFeeForCampaignSetEvent
}

export function createSpendCapsUpdatedEvent(
  pointsId: Address,
  ips: Array<Address>,
  spendCaps: Array<BigInt>
): SpendCapsUpdated {
  let spendCapsUpdatedEvent = changetype<SpendCapsUpdated>(newMockEvent())

  spendCapsUpdatedEvent.parameters = new Array()

  spendCapsUpdatedEvent.parameters.push(
    new ethereum.EventParam("pointsId", ethereum.Value.fromAddress(pointsId))
  )
  spendCapsUpdatedEvent.parameters.push(
    new ethereum.EventParam("ips", ethereum.Value.fromAddressArray(ips))
  )
  spendCapsUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "spendCaps",
      ethereum.Value.fromUnsignedBigIntArray(spendCaps)
    )
  )

  return spendCapsUpdatedEvent
}
