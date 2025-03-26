import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Bytes, BigInt, Address } from "@graphprotocol/graph-ts"
import { CCDMBridgeProcessed } from "../generated/schema"
import { CCDMBridgeProcessed as CCDMBridgeProcessedEvent } from "../generated/DepositExecutor/DepositExecutor"
import { handleCCDMBridgeProcessed } from "../src/deposit-executor"
import { createCCDMBridgeProcessedEvent } from "./deposit-executor-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let sourceMarketHash = Bytes.fromI32(1234567890)
    let ccdmNonce = BigInt.fromI32(234)
    let guid = Bytes.fromI32(1234567890)
    let weirollWallet = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let newCCDMBridgeProcessedEvent = createCCDMBridgeProcessedEvent(
      sourceMarketHash,
      ccdmNonce,
      guid,
      weirollWallet
    )
    handleCCDMBridgeProcessed(newCCDMBridgeProcessedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("CCDMBridgeProcessed created and stored", () => {
    assert.entityCount("CCDMBridgeProcessed", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "CCDMBridgeProcessed",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "sourceMarketHash",
      "1234567890"
    )
    assert.fieldEquals(
      "CCDMBridgeProcessed",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "ccdmNonce",
      "234"
    )
    assert.fieldEquals(
      "CCDMBridgeProcessed",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "guid",
      "1234567890"
    )
    assert.fieldEquals(
      "CCDMBridgeProcessed",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "weirollWallet",
      "0x0000000000000000000000000000000000000001"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})
