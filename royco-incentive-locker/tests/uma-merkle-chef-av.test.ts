import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { AssertersBlacklisted } from "../generated/schema"
import { AssertersBlacklisted as AssertersBlacklistedEvent } from "../generated/UmaMerkleChefAV/UmaMerkleChefAV"
import { handleAssertersBlacklisted } from "../src/uma-merkle-chef-av"
import { createAssertersBlacklistedEvent } from "./uma-merkle-chef-av-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let blacklistedAsserters = [
      Address.fromString("0x0000000000000000000000000000000000000001")
    ]
    let newAssertersBlacklistedEvent =
      createAssertersBlacklistedEvent(blacklistedAsserters)
    handleAssertersBlacklisted(newAssertersBlacklistedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("AssertersBlacklisted created and stored", () => {
    assert.entityCount("AssertersBlacklisted", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "AssertersBlacklisted",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "blacklistedAsserters",
      "[0x0000000000000000000000000000000000000001]"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})
