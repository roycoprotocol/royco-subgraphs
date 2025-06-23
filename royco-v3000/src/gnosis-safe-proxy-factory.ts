import { ProxyCreation as ProxyCreationEvent } from "../generated/GnosisSafeProxyFactory/GnosisSafeProxyFactory"
import { ProxyCreation } from "../generated/schema"

export function handleProxyCreation(event: ProxyCreationEvent): void {
  let entity = new ProxyCreation(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.proxy = event.params.proxy
  entity.singleton = event.params.singleton

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
