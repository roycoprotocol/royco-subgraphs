import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address } from "@graphprotocol/graph-ts"
import { ProxyCreation } from "../generated/schema"
import { ProxyCreation as ProxyCreationEvent } from "../generated/GnosisSafeProxyFactory/GnosisSafeProxyFactory"
import { handleProxyCreation } from "../src/gnosis-safe-proxy-factory"
import { createProxyCreationEvent } from "./gnosis-safe-proxy-factory-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let proxy = Address.fromString("0x0000000000000000000000000000000000000001")
    let singleton = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let newProxyCreationEvent = createProxyCreationEvent(proxy, singleton)
    handleProxyCreation(newProxyCreationEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("ProxyCreation created and stored", () => {
    assert.entityCount("ProxyCreation", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "ProxyCreation",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "proxy",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "ProxyCreation",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "singleton",
      "0x0000000000000000000000000000000000000001"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})
