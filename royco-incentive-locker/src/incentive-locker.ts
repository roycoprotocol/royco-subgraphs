import {
  Award as AwardEvent,
  CoIPsAdded as CoIPsAddedEvent,
  CoIPsRemoved as CoIPsRemovedEvent,
  DefaultProtocolFeeClaimantSet as DefaultProtocolFeeClaimantSetEvent,
  DefaultProtocolFeeSet as DefaultProtocolFeeSetEvent,
  FeesClaimed as FeesClaimedEvent,
  IncentiveCampaignCreated as IncentiveCampaignCreatedEvent,
  IncentivesAdded as IncentivesAddedEvent,
  IncentivesClaimed as IncentivesClaimedEvent,
  IncentivesRemoved as IncentivesRemovedEvent,
  OwnershipTransferStarted as OwnershipTransferStartedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  PointsProgramCreated as PointsProgramCreatedEvent,
  PointsProgramOwnershipTransferred as PointsProgramOwnershipTransferredEvent,
  PointsSpent as PointsSpentEvent,
  ProtocolFeeClaimantForCampaignSet as ProtocolFeeClaimantForCampaignSetEvent,
  ProtocolFeeForCampaignSet as ProtocolFeeForCampaignSetEvent,
  SpendCapsUpdated as SpendCapsUpdatedEvent
} from "../generated/IncentiveLocker/IncentiveLocker"
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
} from "../generated/schema"
import { Bytes } from "@graphprotocol/graph-ts"

export function handleAward(event: AwardEvent): void {
  let entity = new Award(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.pointsId = event.params.pointsId
  entity.recipient = event.params.recipient
  entity.amount = event.params.amount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleCoIPsAdded(event: CoIPsAddedEvent): void {
  let entity = new CoIPsAdded(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.incentiveCampaignId = event.params.incentiveCampaignId
  entity.coIPs = changetype<Bytes[]>(event.params.coIPs)

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleCoIPsRemoved(event: CoIPsRemovedEvent): void {
  let entity = new CoIPsRemoved(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.incentiveCampaignId = event.params.incentiveCampaignId
  entity.coIPs = changetype<Bytes[]>(event.params.coIPs)

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleDefaultProtocolFeeClaimantSet(
  event: DefaultProtocolFeeClaimantSetEvent
): void {
  let entity = new DefaultProtocolFeeClaimantSet(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.newDefaultProtocolFeeClaimant =
    event.params.newDefaultProtocolFeeClaimant

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleDefaultProtocolFeeSet(
  event: DefaultProtocolFeeSetEvent
): void {
  let entity = new DefaultProtocolFeeSet(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.newDefaultProtocolFee = event.params.newDefaultProtocolFee

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleFeesClaimed(event: FeesClaimedEvent): void {
  let entity = new FeesClaimed(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.claimant = event.params.claimant
  entity.incentive = event.params.incentive
  entity.amount = event.params.amount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleIncentiveCampaignCreated(
  event: IncentiveCampaignCreatedEvent
): void {
  let entity = new IncentiveCampaignCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.incentiveCampaignId = event.params.incentiveCampaignId
  entity.ip = event.params.ip
  entity.actionVerifier = event.params.actionVerifier
  entity.actionParams = event.params.actionParams
  entity.defaultProtocolFee = event.params.defaultProtocolFee
  entity.incentivesOffered = changetype<Bytes[]>(event.params.incentivesOffered)
  entity.incentiveAmountsOffered = event.params.incentiveAmountsOffered

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleIncentivesAdded(event: IncentivesAddedEvent): void {
  let entity = new IncentivesAdded(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.incentiveCampaignId = event.params.incentiveCampaignId
  entity.ip = event.params.ip
  entity.incentivesOffered = changetype<Bytes[]>(event.params.incentivesOffered)
  entity.incentiveAmountsOffered = event.params.incentiveAmountsOffered

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleIncentivesClaimed(event: IncentivesClaimedEvent): void {
  let entity = new IncentivesClaimed(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.incentiveCampaignId = event.params.incentiveCampaignId
  entity.ap = event.params.ap
  entity.incentiveAmountsPaid = event.params.incentiveAmountsPaid
  entity.protocolFeesPaid = event.params.protocolFeesPaid

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleIncentivesRemoved(event: IncentivesRemovedEvent): void {
  let entity = new IncentivesRemoved(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.incentiveCampaignId = event.params.incentiveCampaignId
  entity.ip = event.params.ip
  entity.incentivesRemoved = changetype<Bytes[]>(event.params.incentivesRemoved)
  entity.incentiveAmountsRemoved = event.params.incentiveAmountsRemoved

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOwnershipTransferStarted(
  event: OwnershipTransferStartedEvent
): void {
  let entity = new OwnershipTransferStarted(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.previousOwner = event.params.previousOwner
  entity.newOwner = event.params.newOwner

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.previousOwner = event.params.previousOwner
  entity.newOwner = event.params.newOwner

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePointsProgramCreated(
  event: PointsProgramCreatedEvent
): void {
  let entity = new PointsProgramCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.pointsId = event.params.pointsId
  entity.owner = event.params.owner
  entity.name = event.params.name
  entity.symbol = event.params.symbol
  entity.decimals = event.params.decimals
  entity.whitelistedIPs = changetype<Bytes[]>(event.params.whitelistedIPs)
  entity.spendCaps = event.params.spendCaps

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePointsProgramOwnershipTransferred(
  event: PointsProgramOwnershipTransferredEvent
): void {
  let entity = new PointsProgramOwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.pointsId = event.params.pointsId
  entity.newOwner = event.params.newOwner

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePointsSpent(event: PointsSpentEvent): void {
  let entity = new PointsSpent(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.pointsId = event.params.pointsId
  entity.ip = event.params.ip
  entity.amount = event.params.amount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleProtocolFeeClaimantForCampaignSet(
  event: ProtocolFeeClaimantForCampaignSetEvent
): void {
  let entity = new ProtocolFeeClaimantForCampaignSet(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.incentiveCampaignId = event.params.incentiveCampaignId
  entity.newProtocolFeeClaimant = event.params.newProtocolFeeClaimant

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleProtocolFeeForCampaignSet(
  event: ProtocolFeeForCampaignSetEvent
): void {
  let entity = new ProtocolFeeForCampaignSet(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.incentiveCampaignId = event.params.incentiveCampaignId
  entity.newProtocolFee = event.params.newProtocolFee

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleSpendCapsUpdated(event: SpendCapsUpdatedEvent): void {
  let entity = new SpendCapsUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.pointsId = event.params.pointsId
  entity.ips = changetype<Bytes[]>(event.params.ips)
  entity.spendCaps = event.params.spendCaps

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
