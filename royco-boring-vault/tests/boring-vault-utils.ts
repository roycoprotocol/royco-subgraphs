import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
import {
  Approval,
  AuthorityUpdated,
  Enter,
  EpochStarted,
  Exit,
  OwnershipTransferred,
  RewardsDistributed,
  Transfer,
  UserDepositedIntoEpoch,
  UserRewardsClaimed,
  UserWithdrawnFromEpoch
} from "../generated/BoringVault/BoringVault"

export function createApprovalEvent(
  owner: Address,
  spender: Address,
  amount: BigInt
): Approval {
  let approvalEvent = changetype<Approval>(newMockEvent())

  approvalEvent.parameters = new Array()

  approvalEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )
  approvalEvent.parameters.push(
    new ethereum.EventParam("spender", ethereum.Value.fromAddress(spender))
  )
  approvalEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return approvalEvent
}

export function createAuthorityUpdatedEvent(
  user: Address,
  newAuthority: Address
): AuthorityUpdated {
  let authorityUpdatedEvent = changetype<AuthorityUpdated>(newMockEvent())

  authorityUpdatedEvent.parameters = new Array()

  authorityUpdatedEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )
  authorityUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "newAuthority",
      ethereum.Value.fromAddress(newAuthority)
    )
  )

  return authorityUpdatedEvent
}

export function createEnterEvent(
  from: Address,
  asset: Address,
  amount: BigInt,
  to: Address,
  shares: BigInt
): Enter {
  let enterEvent = changetype<Enter>(newMockEvent())

  enterEvent.parameters = new Array()

  enterEvent.parameters.push(
    new ethereum.EventParam("from", ethereum.Value.fromAddress(from))
  )
  enterEvent.parameters.push(
    new ethereum.EventParam("asset", ethereum.Value.fromAddress(asset))
  )
  enterEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  enterEvent.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to))
  )
  enterEvent.parameters.push(
    new ethereum.EventParam("shares", ethereum.Value.fromUnsignedBigInt(shares))
  )

  return enterEvent
}

export function createEpochStartedEvent(
  epoch: BigInt,
  eligibleShares: BigInt,
  startTimestamp: BigInt
): EpochStarted {
  let epochStartedEvent = changetype<EpochStarted>(newMockEvent())

  epochStartedEvent.parameters = new Array()

  epochStartedEvent.parameters.push(
    new ethereum.EventParam("epoch", ethereum.Value.fromUnsignedBigInt(epoch))
  )
  epochStartedEvent.parameters.push(
    new ethereum.EventParam(
      "eligibleShares",
      ethereum.Value.fromUnsignedBigInt(eligibleShares)
    )
  )
  epochStartedEvent.parameters.push(
    new ethereum.EventParam(
      "startTimestamp",
      ethereum.Value.fromUnsignedBigInt(startTimestamp)
    )
  )

  return epochStartedEvent
}

export function createExitEvent(
  to: Address,
  asset: Address,
  amount: BigInt,
  from: Address,
  shares: BigInt
): Exit {
  let exitEvent = changetype<Exit>(newMockEvent())

  exitEvent.parameters = new Array()

  exitEvent.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to))
  )
  exitEvent.parameters.push(
    new ethereum.EventParam("asset", ethereum.Value.fromAddress(asset))
  )
  exitEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  exitEvent.parameters.push(
    new ethereum.EventParam("from", ethereum.Value.fromAddress(from))
  )
  exitEvent.parameters.push(
    new ethereum.EventParam("shares", ethereum.Value.fromUnsignedBigInt(shares))
  )

  return exitEvent
}

export function createOwnershipTransferredEvent(
  user: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent =
    changetype<OwnershipTransferred>(newMockEvent())

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}

export function createRewardsDistributedEvent(
  token: Address,
  startEpoch: BigInt,
  endEpoch: BigInt,
  amount: BigInt,
  rewardId: BigInt
): RewardsDistributed {
  let rewardsDistributedEvent = changetype<RewardsDistributed>(newMockEvent())

  rewardsDistributedEvent.parameters = new Array()

  rewardsDistributedEvent.parameters.push(
    new ethereum.EventParam("token", ethereum.Value.fromAddress(token))
  )
  rewardsDistributedEvent.parameters.push(
    new ethereum.EventParam(
      "startEpoch",
      ethereum.Value.fromUnsignedBigInt(startEpoch)
    )
  )
  rewardsDistributedEvent.parameters.push(
    new ethereum.EventParam(
      "endEpoch",
      ethereum.Value.fromUnsignedBigInt(endEpoch)
    )
  )
  rewardsDistributedEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  rewardsDistributedEvent.parameters.push(
    new ethereum.EventParam(
      "rewardId",
      ethereum.Value.fromUnsignedBigInt(rewardId)
    )
  )

  return rewardsDistributedEvent
}

export function createTransferEvent(
  from: Address,
  to: Address,
  amount: BigInt
): Transfer {
  let transferEvent = changetype<Transfer>(newMockEvent())

  transferEvent.parameters = new Array()

  transferEvent.parameters.push(
    new ethereum.EventParam("from", ethereum.Value.fromAddress(from))
  )
  transferEvent.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to))
  )
  transferEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return transferEvent
}

export function createUserDepositedIntoEpochEvent(
  user: Address,
  epoch: BigInt,
  shareAmount: BigInt
): UserDepositedIntoEpoch {
  let userDepositedIntoEpochEvent =
    changetype<UserDepositedIntoEpoch>(newMockEvent())

  userDepositedIntoEpochEvent.parameters = new Array()

  userDepositedIntoEpochEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )
  userDepositedIntoEpochEvent.parameters.push(
    new ethereum.EventParam("epoch", ethereum.Value.fromUnsignedBigInt(epoch))
  )
  userDepositedIntoEpochEvent.parameters.push(
    new ethereum.EventParam(
      "shareAmount",
      ethereum.Value.fromUnsignedBigInt(shareAmount)
    )
  )

  return userDepositedIntoEpochEvent
}

export function createUserRewardsClaimedEvent(
  user: Address,
  token: Address,
  rewardId: BigInt,
  amount: BigInt
): UserRewardsClaimed {
  let userRewardsClaimedEvent = changetype<UserRewardsClaimed>(newMockEvent())

  userRewardsClaimedEvent.parameters = new Array()

  userRewardsClaimedEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )
  userRewardsClaimedEvent.parameters.push(
    new ethereum.EventParam("token", ethereum.Value.fromAddress(token))
  )
  userRewardsClaimedEvent.parameters.push(
    new ethereum.EventParam(
      "rewardId",
      ethereum.Value.fromUnsignedBigInt(rewardId)
    )
  )
  userRewardsClaimedEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return userRewardsClaimedEvent
}

export function createUserWithdrawnFromEpochEvent(
  user: Address,
  epoch: BigInt,
  shareAmount: BigInt
): UserWithdrawnFromEpoch {
  let userWithdrawnFromEpochEvent =
    changetype<UserWithdrawnFromEpoch>(newMockEvent())

  userWithdrawnFromEpochEvent.parameters = new Array()

  userWithdrawnFromEpochEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )
  userWithdrawnFromEpochEvent.parameters.push(
    new ethereum.EventParam("epoch", ethereum.Value.fromUnsignedBigInt(epoch))
  )
  userWithdrawnFromEpochEvent.parameters.push(
    new ethereum.EventParam(
      "shareAmount",
      ethereum.Value.fromUnsignedBigInt(shareAmount)
    )
  )

  return userWithdrawnFromEpochEvent
}
