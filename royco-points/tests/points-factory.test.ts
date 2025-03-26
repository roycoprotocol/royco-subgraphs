import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address } from "@graphprotocol/graph-ts"
import { NewPointsProgram } from "../generated/schema"
import { NewPointsProgram as NewPointsProgramEvent } from "../generated/PointsFactory/PointsFactory"
import { handleNewPointsProgram } from "../src/points-factory"
import { createNewPointsProgramEvent } from "./points-factory-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let points = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let name = "Example string value"
    let symbol = "Example string value"
    let newNewPointsProgramEvent = createNewPointsProgramEvent(
      points,
      name,
      symbol
    )
    handleNewPointsProgram(newNewPointsProgramEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("NewPointsProgram created and stored", () => {
    assert.entityCount("NewPointsProgram", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "NewPointsProgram",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "points",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "NewPointsProgram",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "name",
      "Example string value"
    )
    assert.fieldEquals(
      "NewPointsProgram",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "symbol",
      "Example string value"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})
