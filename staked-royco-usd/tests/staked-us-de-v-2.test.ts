import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { AdminTransferRequested } from "../generated/schema"
import { AdminTransferRequested as AdminTransferRequestedEvent } from "../generated/StakedUSDeV2/StakedUSDeV2"
import { handleAdminTransferRequested } from "../src/staked-us-de-v-2"
import { createAdminTransferRequestedEvent } from "./staked-us-de-v-2-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#tests-structure

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let oldAdmin = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let newAdmin = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let newAdminTransferRequestedEvent = createAdminTransferRequestedEvent(
      oldAdmin,
      newAdmin
    )
    handleAdminTransferRequested(newAdminTransferRequestedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#write-a-unit-test

  test("AdminTransferRequested created and stored", () => {
    assert.entityCount("AdminTransferRequested", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "AdminTransferRequested",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "oldAdmin",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "AdminTransferRequested",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "newAdmin",
      "0x0000000000000000000000000000000000000001"
    )

    // More assert options:
    // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#asserts
  })
})
