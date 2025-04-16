import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { Award } from "../generated/schema"
import { Award as AwardEvent } from "../generated/IncentiveLocker/IncentiveLocker"
import { handleAward } from "../src/incentive-locker"
import { createAwardEvent } from "./incentive-locker-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let pointsId = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let recipient = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let amount = BigInt.fromI32(234)
    let newAwardEvent = createAwardEvent(pointsId, recipient, amount)
    handleAward(newAwardEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("Award created and stored", () => {
    assert.entityCount("Award", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "Award",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "pointsId",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "Award",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "recipient",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "Award",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "amount",
      "234"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})
