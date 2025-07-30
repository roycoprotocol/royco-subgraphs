import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { UrdCreated } from "../generated/UrdFactory/UrdFactory"

export function createUrdCreatedEvent(
  urd: Address,
  caller: Address,
  initialOwner: Address,
  initialTimelock: BigInt,
  initialRoot: Bytes,
  initialIpfsHash: Bytes,
  salt: Bytes
): UrdCreated {
  let urdCreatedEvent = changetype<UrdCreated>(newMockEvent())

  urdCreatedEvent.parameters = new Array()

  urdCreatedEvent.parameters.push(
    new ethereum.EventParam("urd", ethereum.Value.fromAddress(urd))
  )
  urdCreatedEvent.parameters.push(
    new ethereum.EventParam("caller", ethereum.Value.fromAddress(caller))
  )
  urdCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "initialOwner",
      ethereum.Value.fromAddress(initialOwner)
    )
  )
  urdCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "initialTimelock",
      ethereum.Value.fromUnsignedBigInt(initialTimelock)
    )
  )
  urdCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "initialRoot",
      ethereum.Value.fromFixedBytes(initialRoot)
    )
  )
  urdCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "initialIpfsHash",
      ethereum.Value.fromFixedBytes(initialIpfsHash)
    )
  )
  urdCreatedEvent.parameters.push(
    new ethereum.EventParam("salt", ethereum.Value.fromFixedBytes(salt))
  )

  return urdCreatedEvent
}
