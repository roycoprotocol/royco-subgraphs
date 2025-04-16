import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Bytes, Address, BigInt } from "@graphprotocol/graph-ts"
import { APOfferCreated } from "../generated/schema"
import { APOfferCreated as APOfferCreatedEvent } from "../generated/MultiplierMarketHub/MultiplierMarketHub"
import { handleAPOfferCreated } from "../src/multiplier-market-hub"
import { createAPOfferCreatedEvent } from "./multiplier-market-hub-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let incentiveCampaignId = Bytes.fromI32(1234567890)
    let apOfferHash = Bytes.fromI32(1234567890)
    let ap = Address.fromString("0x0000000000000000000000000000000000000001")
    let multiplier = BigInt.fromI32(234)
    let size = BigInt.fromI32(234)
    let newAPOfferCreatedEvent = createAPOfferCreatedEvent(
      incentiveCampaignId,
      apOfferHash,
      ap,
      multiplier,
      size
    )
    handleAPOfferCreated(newAPOfferCreatedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("APOfferCreated created and stored", () => {
    assert.entityCount("APOfferCreated", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "APOfferCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "incentiveCampaignId",
      "1234567890"
    )
    assert.fieldEquals(
      "APOfferCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "apOfferHash",
      "1234567890"
    )
    assert.fieldEquals(
      "APOfferCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "ap",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "APOfferCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "multiplier",
      "234"
    )
    assert.fieldEquals(
      "APOfferCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "size",
      "234"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})
