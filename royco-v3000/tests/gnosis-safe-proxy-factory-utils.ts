import { newMockEvent } from "matchstick-as"
import { ethereum, Address } from "@graphprotocol/graph-ts"
import { ProxyCreation } from "../generated/GnosisSafeProxyFactory/GnosisSafeProxyFactory"

export function createProxyCreationEvent(
  proxy: Address,
  singleton: Address
): ProxyCreation {
  let proxyCreationEvent = changetype<ProxyCreation>(newMockEvent())

  proxyCreationEvent.parameters = new Array()

  proxyCreationEvent.parameters.push(
    new ethereum.EventParam("proxy", ethereum.Value.fromAddress(proxy))
  )
  proxyCreationEvent.parameters.push(
    new ethereum.EventParam("singleton", ethereum.Value.fromAddress(singleton))
  )

  return proxyCreationEvent
}
