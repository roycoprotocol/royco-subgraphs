import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { UrdCreated } from "../generated/schema"
import { UrdCreated as UrdCreatedEvent } from "../generated/UrdFactory/UrdFactory"
import { handleUrdCreated } from "../src/urd-factory"
import { createUrdCreatedEvent } from "./urd-factory-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#tests-structure

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let urd = Address.fromString("0x0000000000000000000000000000000000000001")
    let caller = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let initialOwner = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let initialTimelock = BigInt.fromI32(234)
    let initialRoot = Bytes.fromI32(1234567890)
    let initialIpfsHash = Bytes.fromI32(1234567890)
    let salt = Bytes.fromI32(1234567890)
    let newUrdCreatedEvent = createUrdCreatedEvent(
      urd,
      caller,
      initialOwner,
      initialTimelock,
      initialRoot,
      initialIpfsHash,
      salt
    )
    handleUrdCreated(newUrdCreatedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#write-a-unit-test

  test("UrdCreated created and stored", () => {
    assert.entityCount("UrdCreated", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "UrdCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "urd",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "UrdCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "caller",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "UrdCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "initialOwner",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "UrdCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "initialTimelock",
      "234"
    )
    assert.fieldEquals(
      "UrdCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "initialRoot",
      "1234567890"
    )
    assert.fieldEquals(
      "UrdCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "initialIpfsHash",
      "1234567890"
    )
    assert.fieldEquals(
      "UrdCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "salt",
      "1234567890"
    )

    // More assert options:
    // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#asserts
  })
})
