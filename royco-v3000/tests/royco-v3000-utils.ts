import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { RoycoAccountDeployed } from "../generated/RoycoAccountFactory/RoycoAccountFactory"
import { SafeSetup, ExecutionSuccess, ExecutionFailure, AddedOwner, RemovedOwner, ChangedThreshold } from "../generated/templates/SafeTemplate/ISafe"
import { Transfer } from "../generated/templates/ERC20Template/ERC20"

export function createRoycoAccountDeployedEvent(
  user: Address,
  accountId: BigInt,
  roycoAccount: Address
): RoycoAccountDeployed {
  let roycoAccountDeployedEvent = changetype<RoycoAccountDeployed>(newMockEvent())

  roycoAccountDeployedEvent.parameters = new Array()

  roycoAccountDeployedEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )
  roycoAccountDeployedEvent.parameters.push(
    new ethereum.EventParam("accountId", ethereum.Value.fromUnsignedBigInt(accountId))
  )
  roycoAccountDeployedEvent.parameters.push(
    new ethereum.EventParam("roycoAccount", ethereum.Value.fromAddress(roycoAccount))
  )

  return roycoAccountDeployedEvent
}

export function createSafeSetupEvent(
  initiator: Address,
  owners: Address[],
  threshold: BigInt,
  initializer: Address,
  fallbackHandler: Address
): SafeSetup {
  let safeSetupEvent = changetype<SafeSetup>(newMockEvent())

  safeSetupEvent.parameters = new Array()

  safeSetupEvent.parameters.push(
    new ethereum.EventParam("initiator", ethereum.Value.fromAddress(initiator))
  )
  safeSetupEvent.parameters.push(
    new ethereum.EventParam("owners", ethereum.Value.fromAddressArray(owners))
  )
  safeSetupEvent.parameters.push(
    new ethereum.EventParam("threshold", ethereum.Value.fromUnsignedBigInt(threshold))
  )
  safeSetupEvent.parameters.push(
    new ethereum.EventParam("initializer", ethereum.Value.fromAddress(initializer))
  )
  safeSetupEvent.parameters.push(
    new ethereum.EventParam("fallbackHandler", ethereum.Value.fromAddress(fallbackHandler))
  )

  // Set transaction value to 0 to avoid ETH tracking during setup
  safeSetupEvent.transaction.value = BigInt.fromI32(0)

  return safeSetupEvent
}

export function createExecutionSuccessEvent(
  txHash: string,
  payment: BigInt
): ExecutionSuccess {
  let executionSuccessEvent = changetype<ExecutionSuccess>(newMockEvent())

  executionSuccessEvent.parameters = new Array()

  executionSuccessEvent.parameters.push(
    new ethereum.EventParam("txHash", ethereum.Value.fromBytes(Bytes.fromHexString(txHash)))
  )
  executionSuccessEvent.parameters.push(
    new ethereum.EventParam("payment", ethereum.Value.fromUnsignedBigInt(payment))
  )

  return executionSuccessEvent
}

export function createExecutionFailureEvent(
  txHash: string,
  payment: BigInt
): ExecutionFailure {
  let executionFailureEvent = changetype<ExecutionFailure>(newMockEvent())

  executionFailureEvent.parameters = new Array()

  executionFailureEvent.parameters.push(
    new ethereum.EventParam("txHash", ethereum.Value.fromBytes(Bytes.fromHexString(txHash)))
  )
  executionFailureEvent.parameters.push(
    new ethereum.EventParam("payment", ethereum.Value.fromUnsignedBigInt(payment))
  )

  return executionFailureEvent
}

export function createTransferEvent(
  from: Address,
  to: Address,
  value: BigInt
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
    new ethereum.EventParam("value", ethereum.Value.fromUnsignedBigInt(value))
  )

  return transferEvent
}

export function createAddedOwnerEvent(
  owner: Address
): AddedOwner {
  let addedOwnerEvent = changetype<AddedOwner>(newMockEvent())

  addedOwnerEvent.parameters = new Array()

  addedOwnerEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )

  return addedOwnerEvent
}

export function createRemovedOwnerEvent(
  owner: Address
): RemovedOwner {
  let removedOwnerEvent = changetype<RemovedOwner>(newMockEvent())

  removedOwnerEvent.parameters = new Array()

  removedOwnerEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )

  return removedOwnerEvent
}

export function createChangedThresholdEvent(
  threshold: BigInt
): ChangedThreshold {
  let changedThresholdEvent = changetype<ChangedThreshold>(newMockEvent())

  changedThresholdEvent.parameters = new Array()

  changedThresholdEvent.parameters.push(
    new ethereum.EventParam("threshold", ethereum.Value.fromUnsignedBigInt(threshold))
  )

  return changedThresholdEvent
}