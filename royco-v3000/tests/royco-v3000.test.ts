import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, BigInt } from "@graphprotocol/graph-ts"
import { RoycoAccountDeployed, RawSafe, SafeSetup, ExecutionSuccess, ExecutionFailure, RawSafeTokenizedPosition } from "../generated/schema"
import { RoycoAccountDeployed as RoycoAccountDeployedEvent } from "../generated/RoycoAccountFactory/RoycoAccountFactory"
import { SafeSetup as SafeSetupEvent, ExecutionSuccess as ExecutionSuccessEvent, ExecutionFailure as ExecutionFailureEvent } from "../generated/templates/SafeTemplate/ISafe"
import { Transfer as TransferEvent } from "../generated/templates/ERC20Template/ERC20"
import { handleRoycoAccountDeployed } from "../src/royco-account-factory"
import { handleSafeSetup, handleExecutionSuccess, handleExecutionFailure, handleAddedOwner, handleRemovedOwner, handleChangedThreshold } from "../src/safe"
import { handleTransfer, trackNativeETHTransfer } from "../src/erc20"
import { createRoycoAccountDeployedEvent, createSafeSetupEvent, createExecutionSuccessEvent, createExecutionFailureEvent, createTransferEvent, createAddedOwnerEvent, createRemovedOwnerEvent, createChangedThresholdEvent } from "./royco-v3000-utils"
import { CHAIN_ID } from "../src/constants"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("RoycoAccountFactory tests", () => {
  beforeAll(() => {
    let user = Address.fromString("0x0000000000000000000000000000000000000001")
    let accountId = BigInt.fromI32(1)
    let roycoAccount = Address.fromString("0x0000000000000000000000000000000000000002")
    let newRoycoAccountDeployedEvent = createRoycoAccountDeployedEvent(user, accountId, roycoAccount)
    handleRoycoAccountDeployed(newRoycoAccountDeployedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("RoycoAccountDeployed created and stored", () => {
    assert.entityCount("RoycoAccountDeployed", 1)
    assert.entityCount("RawSafe", 1)

    // The actual ID format is CHAIN_ID_TRANSACTION_HASH_LOG_INDEX
    // Using the transaction hash we set in the mock
    let expectedRoycoAccountId = CHAIN_ID.toString().concat("_0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef_1")
    assert.fieldEquals(
      "RoycoAccountDeployed",
      expectedRoycoAccountId,
      "user",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "RoycoAccountDeployed",
      expectedRoycoAccountId,
      "roycoAccount",
      "0x0000000000000000000000000000000000000002"
    )
    assert.fieldEquals(
      "RoycoAccountDeployed",
      expectedRoycoAccountId,
      "accountId",
      "1"
    )

    // Check RawSafe was created
    let expectedSafeId = CHAIN_ID.toString().concat("_0x0000000000000000000000000000000000000002")
    assert.fieldEquals(
      "RawSafe",
      expectedSafeId,
      "safeAddress",
      "0x0000000000000000000000000000000000000002"
    )
    assert.fieldEquals(
      "RawSafe",
      expectedSafeId,
      "creatorAddress",
      "0x0000000000000000000000000000000000000001"
    )
  })
})

describe("Safe template tests", () => {
  beforeAll(() => {
    clearStore()
    
    // First create a RoycoAccount
    let user = Address.fromString("0x0000000000000000000000000000000000000001")
    let accountId = BigInt.fromI32(1)
    let roycoAccount = Address.fromString("0x0000000000000000000000000000000000000002")
    let newRoycoAccountDeployedEvent = createRoycoAccountDeployedEvent(user, accountId, roycoAccount)
    handleRoycoAccountDeployed(newRoycoAccountDeployedEvent)
    
    // Then create SafeSetup event
    let initiator = Address.fromString("0x0000000000000000000000000000000000000001")
    let owners = [Address.fromString("0x0000000000000000000000000000000000000001")]
    let threshold = BigInt.fromI32(1)
    let initializer = Address.fromString("0x0000000000000000000000000000000000000003")
    let fallbackHandler = Address.fromString("0x0000000000000000000000000000000000000004")
    let newSafeSetupEvent = createSafeSetupEvent(initiator, owners, threshold, initializer, fallbackHandler)
    // Set the address to match the roycoAccount
    newSafeSetupEvent.address = roycoAccount
    handleSafeSetup(newSafeSetupEvent)
  })

  afterAll(() => {
    clearStore()
  })

  test("SafeSetup created and stored", () => {
    assert.entityCount("SafeSetup", 1)
    assert.entityCount("RawSafeMap", 1)

    let expectedSafeSetupId = CHAIN_ID.toString().concat("_0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef_1")
    assert.fieldEquals(
      "SafeSetup",
      expectedSafeSetupId,
      "initiator",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "SafeSetup",
      expectedSafeSetupId,
      "threshold",
      "1"
    )

    // Check RawSafe was updated
    let expectedSafeId2 = CHAIN_ID.toString().concat("_0x0000000000000000000000000000000000000002")
    assert.fieldEquals(
      "RawSafe",
      expectedSafeId2,
      "threshold",
      "1"
    )

    // Check RawSafeMap was created
    let expectedSafeMapId = CHAIN_ID.toString().concat("_0x0000000000000000000000000000000000000002_0x0000000000000000000000000000000000000001")
    assert.fieldEquals(
      "RawSafeMap",
      expectedSafeMapId,
      "safeAddress",
      "0x0000000000000000000000000000000000000002"
    )
    assert.fieldEquals(
      "RawSafeMap",
      expectedSafeMapId,
      "accountAddress",
      "0x0000000000000000000000000000000000000001"
    )
  })

  test("ExecutionSuccess created and stored", () => {
    let txHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    let payment = BigInt.fromI32(0) // Set to 0 to avoid ETH tracking interference
    let newExecutionSuccessEvent = createExecutionSuccessEvent(txHash, payment)
    handleExecutionSuccess(newExecutionSuccessEvent)

    assert.entityCount("ExecutionSuccess", 1)
    
    let expectedExecutionSuccessId = CHAIN_ID.toString().concat("_0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef_1")
    assert.fieldEquals(
      "ExecutionSuccess",
      expectedExecutionSuccessId,
      "payment",
      "0"
    )
  })

  test("ExecutionFailure created and stored", () => {
    let txHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    let payment = BigInt.fromI32(0) // Set to 0 to avoid ETH tracking interference
    let newExecutionFailureEvent = createExecutionFailureEvent(txHash, payment)
    handleExecutionFailure(newExecutionFailureEvent)

    assert.entityCount("ExecutionFailure", 1)
    
    let expectedExecutionFailureId = CHAIN_ID.toString().concat("_0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef_1")
    assert.fieldEquals(
      "ExecutionFailure",
      expectedExecutionFailureId,
      "payment",
      "0"
    )
  })
})

describe("ERC20 token tracking tests", () => {
  beforeAll(() => {
    clearStore()
    
    // First create a RoycoAccount and Safe
    let user = Address.fromString("0x0000000000000000000000000000000000000001")
    let accountId = BigInt.fromI32(1)
    let roycoAccount = Address.fromString("0x0000000000000000000000000000000000000002")
    let newRoycoAccountDeployedEvent = createRoycoAccountDeployedEvent(user, accountId, roycoAccount)
    handleRoycoAccountDeployed(newRoycoAccountDeployedEvent)
    
    // Create SafeSetup event
    let initiator = Address.fromString("0x0000000000000000000000000000000000000001")
    let owners = [Address.fromString("0x0000000000000000000000000000000000000001")]
    let threshold = BigInt.fromI32(1)
    let initializer = Address.fromString("0x0000000000000000000000000000000000000003")
    let fallbackHandler = Address.fromString("0x0000000000000000000000000000000000000004")
    let newSafeSetupEvent = createSafeSetupEvent(initiator, owners, threshold, initializer, fallbackHandler)
    newSafeSetupEvent.address = roycoAccount
    handleSafeSetup(newSafeSetupEvent)
  })

  afterAll(() => {
    clearStore()
  })

  test("Token transfer to Safe creates tokenized position", () => {
    let tokenAddress = Address.fromString("0x0000000000000000000000000000000000000005")
    let fromAddress = Address.fromString("0x0000000000000000000000000000000000000006")
    let safeAddress = Address.fromString("0x0000000000000000000000000000000000000002")
    let value = BigInt.fromI32(1000)
    
    let transferEvent = createTransferEvent(fromAddress, safeAddress, value)
    transferEvent.address = tokenAddress
    handleTransfer(transferEvent)

    assert.entityCount("RawSafeTokenizedPosition", 1)
    
    let expectedTokenPositionId = CHAIN_ID.toString().concat("_0x0000000000000000000000000000000000000002_0x0000000000000000000000000000000000000005")
    let expectedTokenId = CHAIN_ID.toString().concat("-0x0000000000000000000000000000000000000005")
    assert.fieldEquals(
      "RawSafeTokenizedPosition",
      expectedTokenPositionId,
      "safeAddress",
      "0x0000000000000000000000000000000000000002"
    )
    assert.fieldEquals(
      "RawSafeTokenizedPosition",
      expectedTokenPositionId,
      "tokenAddress",
      "0x0000000000000000000000000000000000000005"
    )
    assert.fieldEquals(
      "RawSafeTokenizedPosition",
      expectedTokenPositionId,
      "tokenAmount",
      "1000"
    )
    assert.fieldEquals(
      "RawSafeTokenizedPosition",
      expectedTokenPositionId,
      "tokenId",
      expectedTokenId
    )
  })

  test("Token transfer from Safe updates tokenized position", () => {
    let tokenAddress = Address.fromString("0x0000000000000000000000000000000000000005")
    let safeAddress = Address.fromString("0x0000000000000000000000000000000000000002")
    let toAddress = Address.fromString("0x0000000000000000000000000000000000000007")
    let value = BigInt.fromI32(300)
    
    let transferEvent = createTransferEvent(safeAddress, toAddress, value)
    transferEvent.address = tokenAddress
    handleTransfer(transferEvent)

    // Should still have 1 position, but with updated amount
    assert.entityCount("RawSafeTokenizedPosition", 1)
    
    // Original amount was 1000, after transfer out of 300, should be 700
    let expectedTokenPositionId2 = CHAIN_ID.toString().concat("_0x0000000000000000000000000000000000000002_0x0000000000000000000000000000000000000005")
    assert.fieldEquals(
      "RawSafeTokenizedPosition",
      expectedTokenPositionId2,
      "tokenAmount",
      "700"
    )
  })

  test("Token transfer between non-Safe addresses doesn't create positions", () => {
    let tokenAddress = Address.fromString("0x0000000000000000000000000000000000000008")
    let fromAddress = Address.fromString("0x0000000000000000000000000000000000000009")
    let toAddress = Address.fromString("0x000000000000000000000000000000000000000a")
    let value = BigInt.fromI32(500)
    
    let transferEvent = createTransferEvent(fromAddress, toAddress, value)
    transferEvent.address = tokenAddress
    handleTransfer(transferEvent)

    // Should still only have 1 position from previous tests
    assert.entityCount("RawSafeTokenizedPosition", 1)
  })

  test("Native ETH transfer tracking works correctly", () => {
    // Start with fresh store for this test to avoid interference
    clearStore()
    
    // Create a Safe first
    let user = Address.fromString("0x0000000000000000000000000000000000000001")
    let accountId = BigInt.fromI32(1)
    let roycoAccount = Address.fromString("0x0000000000000000000000000000000000000002")
    let newRoycoAccountDeployedEvent = createRoycoAccountDeployedEvent(user, accountId, roycoAccount)
    handleRoycoAccountDeployed(newRoycoAccountDeployedEvent)
    
    let safeAddress = "0x0000000000000000000000000000000000000002"
    let value = BigInt.fromI32(1000)
    
    // Test incoming ETH transfer
    trackNativeETHTransfer(
      safeAddress,
      value,
      true, // incoming
      BigInt.fromI32(100),
      BigInt.fromI32(1000000),
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      BigInt.fromI32(1)
    )

    // Should now have 1 ETH position
    assert.entityCount("RawSafeTokenizedPosition", 1)
    
    // Check ETH position was created with NULL_ADDRESS
    let expectedETHPositionId = CHAIN_ID.toString().concat("_0x0000000000000000000000000000000000000002_0x0000000000000000000000000000000000000000")
    let expectedETHTokenId = CHAIN_ID.toString().concat("-0x0000000000000000000000000000000000000000")
    assert.fieldEquals(
      "RawSafeTokenizedPosition",
      expectedETHPositionId,
      "safeAddress",
      "0x0000000000000000000000000000000000000002"
    )
    assert.fieldEquals(
      "RawSafeTokenizedPosition",
      expectedETHPositionId,
      "tokenAddress",
      "0x0000000000000000000000000000000000000000"
    )
    assert.fieldEquals(
      "RawSafeTokenizedPosition",
      expectedETHPositionId,
      "tokenAmount",
      "1000"
    )
    assert.fieldEquals(
      "RawSafeTokenizedPosition",
      expectedETHPositionId,
      "tokenId",
      expectedETHTokenId
    )

    // Test outgoing ETH transfer
    trackNativeETHTransfer(
      safeAddress,
      BigInt.fromI32(300),
      false, // outgoing
      BigInt.fromI32(101),
      BigInt.fromI32(1000001),
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcde0",
      BigInt.fromI32(2)
    )

    // Should still have 1 position, but ETH amount updated
    assert.entityCount("RawSafeTokenizedPosition", 1)
    
    // Original amount was 1000, after outgoing transfer of 300, should be 700
    let expectedETHPositionId2 = CHAIN_ID.toString().concat("_0x0000000000000000000000000000000000000002_0x0000000000000000000000000000000000000000")
    assert.fieldEquals(
      "RawSafeTokenizedPosition",
      expectedETHPositionId2,
      "tokenAmount",
      "700"
    )
  })

  test("ExecutionSuccess with transaction value tracks ETH transfer", () => {
    // Start with fresh store
    clearStore()
    
    // Create a Safe first
    let user = Address.fromString("0x0000000000000000000000000000000000000001")
    let accountId = BigInt.fromI32(1)
    let roycoAccount = Address.fromString("0x0000000000000000000000000000000000000002")
    let newRoycoAccountDeployedEvent = createRoycoAccountDeployedEvent(user, accountId, roycoAccount)
    handleRoycoAccountDeployed(newRoycoAccountDeployedEvent)
    
    // Create ExecutionSuccess with transaction value to trigger ETH tracking
    let txHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    let payment = BigInt.fromI32(0)
    let newExecutionSuccessEvent = createExecutionSuccessEvent(txHash, payment)
    newExecutionSuccessEvent.address = roycoAccount
    newExecutionSuccessEvent.transaction.value = BigInt.fromI32(500) // ETH sent to Safe
    handleExecutionSuccess(newExecutionSuccessEvent)

    // Should have 1 ExecutionSuccess event and 1 ETH position
    assert.entityCount("ExecutionSuccess", 1)
    assert.entityCount("RawSafeTokenizedPosition", 1)
    
    // Check ETH position was created for incoming ETH
    let expectedETHPositionId3 = CHAIN_ID.toString().concat("_0x0000000000000000000000000000000000000002_0x0000000000000000000000000000000000000000")
    assert.fieldEquals(
      "RawSafeTokenizedPosition",
      expectedETHPositionId3,
      "tokenAddress",
      "0x0000000000000000000000000000000000000000"
    )
    // ETH is incoming to the Safe
    assert.fieldEquals(
      "RawSafeTokenizedPosition",
      expectedETHPositionId3,
      "tokenAmount",
      "500"
    )
  })
})

describe("Safe owner management tests", () => {
  beforeAll(() => {
    clearStore()
    
    // First create a RoycoAccount and Safe
    let user = Address.fromString("0x0000000000000000000000000000000000000001")
    let accountId = BigInt.fromI32(1)
    let roycoAccount = Address.fromString("0x0000000000000000000000000000000000000002")
    let newRoycoAccountDeployedEvent = createRoycoAccountDeployedEvent(user, accountId, roycoAccount)
    handleRoycoAccountDeployed(newRoycoAccountDeployedEvent)
    
    // Create SafeSetup event with initial owner
    let initiator = Address.fromString("0x0000000000000000000000000000000000000001")
    let owners = [Address.fromString("0x0000000000000000000000000000000000000001")]
    let threshold = BigInt.fromI32(1)
    let initializer = Address.fromString("0x0000000000000000000000000000000000000003")
    let fallbackHandler = Address.fromString("0x0000000000000000000000000000000000000004")
    let newSafeSetupEvent = createSafeSetupEvent(initiator, owners, threshold, initializer, fallbackHandler)
    newSafeSetupEvent.address = roycoAccount
    handleSafeSetup(newSafeSetupEvent)
  })

  afterAll(() => {
    clearStore()
  })

  test("Adding an owner updates Safe and creates RawSafeMap", () => {
    let newOwner = Address.fromString("0x0000000000000000000000000000000000000008")
    let addedOwnerEvent = createAddedOwnerEvent(newOwner)
    addedOwnerEvent.address = Address.fromString("0x0000000000000000000000000000000000000002")
    handleAddedOwner(addedOwnerEvent)

    // Should now have 2 RawSafeMap entries (original owner + new owner)
    assert.entityCount("RawSafeMap", 2)
    
    // Check the new RawSafeMap was created
    let expectedNewSafeMapId = CHAIN_ID.toString().concat("_0x0000000000000000000000000000000000000002_0x0000000000000000000000000000000000000008")
    assert.fieldEquals(
      "RawSafeMap",
      expectedNewSafeMapId,
      "safeAddress",
      "0x0000000000000000000000000000000000000002"
    )
    assert.fieldEquals(
      "RawSafeMap",
      expectedNewSafeMapId,
      "accountAddress",
      "0x0000000000000000000000000000000000000008"
    )
  })

  test("Removing an owner updates Safe and marks RawSafeMap inactive", () => {
    let ownerToRemove = Address.fromString("0x0000000000000000000000000000000000000001")
    let removedOwnerEvent = createRemovedOwnerEvent(ownerToRemove)
    removedOwnerEvent.address = Address.fromString("0x0000000000000000000000000000000000000002")
    handleRemovedOwner(removedOwnerEvent)

    // Should still have 2 RawSafeMap entries, but one marked as inactive
    assert.entityCount("RawSafeMap", 2)
    
    // Check the removed owner's RawSafeMap is marked with NULL_ADDRESS
    let expectedRemovedSafeMapId = CHAIN_ID.toString().concat("_0x0000000000000000000000000000000000000002_0x0000000000000000000000000000000000000001")
    assert.fieldEquals(
      "RawSafeMap",
      expectedRemovedSafeMapId,
      "safeAddress",
      "0x0000000000000000000000000000000000000000"
    )
  })

  test("Changing threshold updates Safe", () => {
    let newThreshold = BigInt.fromI32(2)
    let changedThresholdEvent = createChangedThresholdEvent(newThreshold)
    changedThresholdEvent.address = Address.fromString("0x0000000000000000000000000000000000000002")
    handleChangedThreshold(changedThresholdEvent)

    // Check the threshold was updated
    let expectedSafeId3 = CHAIN_ID.toString().concat("_0x0000000000000000000000000000000000000002")
    assert.fieldEquals(
      "RawSafe",
      expectedSafeId3,
      "threshold",
      "2"
    )
  })
})