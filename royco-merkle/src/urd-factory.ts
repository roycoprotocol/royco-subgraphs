import { UrdCreated as UrdCreatedEvent } from "../generated/UrdFactory/UrdFactory"
import { UrdCreated } from "../generated/schema"

export function handleUrdCreated(event: UrdCreatedEvent): void {
  let entity = new UrdCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.urd = event.params.urd
  entity.caller = event.params.caller
  entity.initialOwner = event.params.initialOwner
  entity.initialTimelock = event.params.initialTimelock
  entity.initialRoot = event.params.initialRoot
  entity.initialIpfsHash = event.params.initialIpfsHash
  entity.salt = event.params.salt

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
