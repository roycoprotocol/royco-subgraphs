import { newMockEvent } from "matchstick-as"
import { ethereum, Bytes, BigInt, Address } from "@graphprotocol/graph-ts"
import {
  CCDMBridgeProcessed,
  CampaignDepositRecipeSet,
  CampaignInputTokensSet,
  CampaignOwnerSet,
  CampaignReceiptTokenSet,
  CampaignUnlockTimestampSet,
  CampaignVerificationStatusSet,
  CampaignVerifierSet,
  IndividualDepositorWithdrawn,
  MerkleDepositorWithdrawn,
  OwnershipTransferStarted,
  OwnershipTransferred,
  ValidLzOftRemoved,
  ValidLzOftSet,
  WeirollWalletsExecutedDepositRecipe
} from "../generated/DepositExecutor/DepositExecutor"

export function createCCDMBridgeProcessedEvent(
  sourceMarketHash: Bytes,
  ccdmNonce: BigInt,
  guid: Bytes,
  weirollWallet: Address
): CCDMBridgeProcessed {
  let ccdmBridgeProcessedEvent = changetype<CCDMBridgeProcessed>(newMockEvent())

  ccdmBridgeProcessedEvent.parameters = new Array()

  ccdmBridgeProcessedEvent.parameters.push(
    new ethereum.EventParam(
      "sourceMarketHash",
      ethereum.Value.fromFixedBytes(sourceMarketHash)
    )
  )
  ccdmBridgeProcessedEvent.parameters.push(
    new ethereum.EventParam(
      "ccdmNonce",
      ethereum.Value.fromUnsignedBigInt(ccdmNonce)
    )
  )
  ccdmBridgeProcessedEvent.parameters.push(
    new ethereum.EventParam("guid", ethereum.Value.fromFixedBytes(guid))
  )
  ccdmBridgeProcessedEvent.parameters.push(
    new ethereum.EventParam(
      "weirollWallet",
      ethereum.Value.fromAddress(weirollWallet)
    )
  )

  return ccdmBridgeProcessedEvent
}

export function createCampaignDepositRecipeSetEvent(
  sourceMarketHash: Bytes
): CampaignDepositRecipeSet {
  let campaignDepositRecipeSetEvent = changetype<CampaignDepositRecipeSet>(
    newMockEvent()
  )

  campaignDepositRecipeSetEvent.parameters = new Array()

  campaignDepositRecipeSetEvent.parameters.push(
    new ethereum.EventParam(
      "sourceMarketHash",
      ethereum.Value.fromFixedBytes(sourceMarketHash)
    )
  )

  return campaignDepositRecipeSetEvent
}

export function createCampaignInputTokensSetEvent(
  sourceMarketHash: Bytes,
  inputTokens: Array<Address>
): CampaignInputTokensSet {
  let campaignInputTokensSetEvent = changetype<CampaignInputTokensSet>(
    newMockEvent()
  )

  campaignInputTokensSetEvent.parameters = new Array()

  campaignInputTokensSetEvent.parameters.push(
    new ethereum.EventParam(
      "sourceMarketHash",
      ethereum.Value.fromFixedBytes(sourceMarketHash)
    )
  )
  campaignInputTokensSetEvent.parameters.push(
    new ethereum.EventParam(
      "inputTokens",
      ethereum.Value.fromAddressArray(inputTokens)
    )
  )

  return campaignInputTokensSetEvent
}

export function createCampaignOwnerSetEvent(
  sourceMarketHash: Bytes,
  newOwner: Address
): CampaignOwnerSet {
  let campaignOwnerSetEvent = changetype<CampaignOwnerSet>(newMockEvent())

  campaignOwnerSetEvent.parameters = new Array()

  campaignOwnerSetEvent.parameters.push(
    new ethereum.EventParam(
      "sourceMarketHash",
      ethereum.Value.fromFixedBytes(sourceMarketHash)
    )
  )
  campaignOwnerSetEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return campaignOwnerSetEvent
}

export function createCampaignReceiptTokenSetEvent(
  sourceMarketHash: Bytes,
  receiptToken: Address
): CampaignReceiptTokenSet {
  let campaignReceiptTokenSetEvent = changetype<CampaignReceiptTokenSet>(
    newMockEvent()
  )

  campaignReceiptTokenSetEvent.parameters = new Array()

  campaignReceiptTokenSetEvent.parameters.push(
    new ethereum.EventParam(
      "sourceMarketHash",
      ethereum.Value.fromFixedBytes(sourceMarketHash)
    )
  )
  campaignReceiptTokenSetEvent.parameters.push(
    new ethereum.EventParam(
      "receiptToken",
      ethereum.Value.fromAddress(receiptToken)
    )
  )

  return campaignReceiptTokenSetEvent
}

export function createCampaignUnlockTimestampSetEvent(
  sourceMarketHash: Bytes,
  unlockTimestamp: BigInt
): CampaignUnlockTimestampSet {
  let campaignUnlockTimestampSetEvent = changetype<CampaignUnlockTimestampSet>(
    newMockEvent()
  )

  campaignUnlockTimestampSetEvent.parameters = new Array()

  campaignUnlockTimestampSetEvent.parameters.push(
    new ethereum.EventParam(
      "sourceMarketHash",
      ethereum.Value.fromFixedBytes(sourceMarketHash)
    )
  )
  campaignUnlockTimestampSetEvent.parameters.push(
    new ethereum.EventParam(
      "unlockTimestamp",
      ethereum.Value.fromUnsignedBigInt(unlockTimestamp)
    )
  )

  return campaignUnlockTimestampSetEvent
}

export function createCampaignVerificationStatusSetEvent(
  sourceMarketHash: Bytes,
  verificationStatus: boolean
): CampaignVerificationStatusSet {
  let campaignVerificationStatusSetEvent =
    changetype<CampaignVerificationStatusSet>(newMockEvent())

  campaignVerificationStatusSetEvent.parameters = new Array()

  campaignVerificationStatusSetEvent.parameters.push(
    new ethereum.EventParam(
      "sourceMarketHash",
      ethereum.Value.fromFixedBytes(sourceMarketHash)
    )
  )
  campaignVerificationStatusSetEvent.parameters.push(
    new ethereum.EventParam(
      "verificationStatus",
      ethereum.Value.fromBoolean(verificationStatus)
    )
  )

  return campaignVerificationStatusSetEvent
}

export function createCampaignVerifierSetEvent(
  campaignVerifier: Address
): CampaignVerifierSet {
  let campaignVerifierSetEvent = changetype<CampaignVerifierSet>(newMockEvent())

  campaignVerifierSetEvent.parameters = new Array()

  campaignVerifierSetEvent.parameters.push(
    new ethereum.EventParam(
      "campaignVerifier",
      ethereum.Value.fromAddress(campaignVerifier)
    )
  )

  return campaignVerifierSetEvent
}

export function createIndividualDepositorWithdrawnEvent(
  weirollWallet: Address,
  depositor: Address
): IndividualDepositorWithdrawn {
  let individualDepositorWithdrawnEvent =
    changetype<IndividualDepositorWithdrawn>(newMockEvent())

  individualDepositorWithdrawnEvent.parameters = new Array()

  individualDepositorWithdrawnEvent.parameters.push(
    new ethereum.EventParam(
      "weirollWallet",
      ethereum.Value.fromAddress(weirollWallet)
    )
  )
  individualDepositorWithdrawnEvent.parameters.push(
    new ethereum.EventParam("depositor", ethereum.Value.fromAddress(depositor))
  )

  return individualDepositorWithdrawnEvent
}

export function createMerkleDepositorWithdrawnEvent(
  weirollWallet: Address,
  depositor: Address,
  depositLeaf: Bytes
): MerkleDepositorWithdrawn {
  let merkleDepositorWithdrawnEvent = changetype<MerkleDepositorWithdrawn>(
    newMockEvent()
  )

  merkleDepositorWithdrawnEvent.parameters = new Array()

  merkleDepositorWithdrawnEvent.parameters.push(
    new ethereum.EventParam(
      "weirollWallet",
      ethereum.Value.fromAddress(weirollWallet)
    )
  )
  merkleDepositorWithdrawnEvent.parameters.push(
    new ethereum.EventParam("depositor", ethereum.Value.fromAddress(depositor))
  )
  merkleDepositorWithdrawnEvent.parameters.push(
    new ethereum.EventParam(
      "depositLeaf",
      ethereum.Value.fromFixedBytes(depositLeaf)
    )
  )

  return merkleDepositorWithdrawnEvent
}

export function createOwnershipTransferStartedEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferStarted {
  let ownershipTransferStartedEvent = changetype<OwnershipTransferStarted>(
    newMockEvent()
  )

  ownershipTransferStartedEvent.parameters = new Array()

  ownershipTransferStartedEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferStartedEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferStartedEvent
}

export function createOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent = changetype<OwnershipTransferred>(
    newMockEvent()
  )

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}

export function createValidLzOftRemovedEvent(
  lzV2OFT: Address
): ValidLzOftRemoved {
  let validLzOftRemovedEvent = changetype<ValidLzOftRemoved>(newMockEvent())

  validLzOftRemovedEvent.parameters = new Array()

  validLzOftRemovedEvent.parameters.push(
    new ethereum.EventParam("lzV2OFT", ethereum.Value.fromAddress(lzV2OFT))
  )

  return validLzOftRemovedEvent
}

export function createValidLzOftSetEvent(lzV2OFT: Address): ValidLzOftSet {
  let validLzOftSetEvent = changetype<ValidLzOftSet>(newMockEvent())

  validLzOftSetEvent.parameters = new Array()

  validLzOftSetEvent.parameters.push(
    new ethereum.EventParam("lzV2OFT", ethereum.Value.fromAddress(lzV2OFT))
  )

  return validLzOftSetEvent
}

export function createWeirollWalletsExecutedDepositRecipeEvent(
  sourceMarketHash: Bytes,
  weirollWalletsExecuted: Array<Address>,
  receiptTokensReceived: Array<BigInt>
): WeirollWalletsExecutedDepositRecipe {
  let weirollWalletsExecutedDepositRecipeEvent =
    changetype<WeirollWalletsExecutedDepositRecipe>(newMockEvent())

  weirollWalletsExecutedDepositRecipeEvent.parameters = new Array()

  weirollWalletsExecutedDepositRecipeEvent.parameters.push(
    new ethereum.EventParam(
      "sourceMarketHash",
      ethereum.Value.fromFixedBytes(sourceMarketHash)
    )
  )
  weirollWalletsExecutedDepositRecipeEvent.parameters.push(
    new ethereum.EventParam(
      "weirollWalletsExecuted",
      ethereum.Value.fromAddressArray(weirollWalletsExecuted)
    )
  )
  weirollWalletsExecutedDepositRecipeEvent.parameters.push(
    new ethereum.EventParam(
      "receiptTokensReceived",
      ethereum.Value.fromUnsignedBigIntArray(receiptTokensReceived)
    )
  )

  return weirollWalletsExecutedDepositRecipeEvent
}
