import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
  Claimed,
  OwnerSet,
  PendingRootRevoked,
  PendingRootSet,
  RootSet,
  RootUpdaterSet,
  TimelockSet
} from "../generated/UniversalRewardsDistributor/UniversalRewardsDistributor"

export function createClaimedEvent(
  account: Address,
  reward: Address,
  amount: BigInt
): Claimed {
  let claimedEvent = changetype<Claimed>(newMockEvent())

  claimedEvent.parameters = new Array()

  claimedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )
  claimedEvent.parameters.push(
    new ethereum.EventParam("reward", ethereum.Value.fromAddress(reward))
  )
  claimedEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return claimedEvent
}

export function createOwnerSetEvent(newOwner: Address): OwnerSet {
  let ownerSetEvent = changetype<OwnerSet>(newMockEvent())

  ownerSetEvent.parameters = new Array()

  ownerSetEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownerSetEvent
}

export function createPendingRootRevokedEvent(
  caller: Address
): PendingRootRevoked {
  let pendingRootRevokedEvent = changetype<PendingRootRevoked>(newMockEvent())

  pendingRootRevokedEvent.parameters = new Array()

  pendingRootRevokedEvent.parameters.push(
    new ethereum.EventParam("caller", ethereum.Value.fromAddress(caller))
  )

  return pendingRootRevokedEvent
}

export function createPendingRootSetEvent(
  caller: Address,
  newRoot: Bytes,
  newIpfsHash: Bytes
): PendingRootSet {
  let pendingRootSetEvent = changetype<PendingRootSet>(newMockEvent())

  pendingRootSetEvent.parameters = new Array()

  pendingRootSetEvent.parameters.push(
    new ethereum.EventParam("caller", ethereum.Value.fromAddress(caller))
  )
  pendingRootSetEvent.parameters.push(
    new ethereum.EventParam("newRoot", ethereum.Value.fromFixedBytes(newRoot))
  )
  pendingRootSetEvent.parameters.push(
    new ethereum.EventParam(
      "newIpfsHash",
      ethereum.Value.fromFixedBytes(newIpfsHash)
    )
  )

  return pendingRootSetEvent
}

export function createRootSetEvent(
  newRoot: Bytes,
  newIpfsHash: Bytes
): RootSet {
  let rootSetEvent = changetype<RootSet>(newMockEvent())

  rootSetEvent.parameters = new Array()

  rootSetEvent.parameters.push(
    new ethereum.EventParam("newRoot", ethereum.Value.fromFixedBytes(newRoot))
  )
  rootSetEvent.parameters.push(
    new ethereum.EventParam(
      "newIpfsHash",
      ethereum.Value.fromFixedBytes(newIpfsHash)
    )
  )

  return rootSetEvent
}

export function createRootUpdaterSetEvent(
  rootUpdater: Address,
  active: boolean
): RootUpdaterSet {
  let rootUpdaterSetEvent = changetype<RootUpdaterSet>(newMockEvent())

  rootUpdaterSetEvent.parameters = new Array()

  rootUpdaterSetEvent.parameters.push(
    new ethereum.EventParam(
      "rootUpdater",
      ethereum.Value.fromAddress(rootUpdater)
    )
  )
  rootUpdaterSetEvent.parameters.push(
    new ethereum.EventParam("active", ethereum.Value.fromBoolean(active))
  )

  return rootUpdaterSetEvent
}

export function createTimelockSetEvent(newTimelock: BigInt): TimelockSet {
  let timelockSetEvent = changetype<TimelockSet>(newMockEvent())

  timelockSetEvent.parameters = new Array()

  timelockSetEvent.parameters.push(
    new ethereum.EventParam(
      "newTimelock",
      ethereum.Value.fromUnsignedBigInt(newTimelock)
    )
  )

  return timelockSetEvent
}
