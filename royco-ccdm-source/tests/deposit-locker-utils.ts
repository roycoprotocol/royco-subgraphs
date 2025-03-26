import { newMockEvent } from "matchstick-as"
import { ethereum, BigInt, Bytes, Address } from "@graphprotocol/graph-ts"
import {
  BaseLzReceiveGasLimitSet,
  CampaignOwnerSet,
  DepositExecutorSet,
  DestinationChainLzEidSet,
  GreenLightTurnedOff,
  GreenLightTurnedOn,
  GreenLighterSet,
  IndividualDepositMade,
  IndividualWithdrawalMade,
  LpTokensBridgedToDestination,
  LpTokensMerkleBridgedToDestination,
  LzV2OFTForTokenRemoved,
  LzV2OFTForTokenSet,
  MarketHalted,
  MerkleDepositMade,
  MerkleWithdrawalMade,
  OwnershipTransferStarted,
  OwnershipTransferred,
  SingleTokensBridgedToDestination,
  SingleTokensMerkleBridgedToDestination
} from "../generated/DepositLocker/DepositLocker"

export function createBaseLzReceiveGasLimitSetEvent(
  baseLzReceiveGasLimit: BigInt
): BaseLzReceiveGasLimitSet {
  let baseLzReceiveGasLimitSetEvent = changetype<BaseLzReceiveGasLimitSet>(
    newMockEvent()
  )

  baseLzReceiveGasLimitSetEvent.parameters = new Array()

  baseLzReceiveGasLimitSetEvent.parameters.push(
    new ethereum.EventParam(
      "baseLzReceiveGasLimit",
      ethereum.Value.fromUnsignedBigInt(baseLzReceiveGasLimit)
    )
  )

  return baseLzReceiveGasLimitSetEvent
}

export function createCampaignOwnerSetEvent(
  marketHash: Bytes,
  campaignOwner: Address
): CampaignOwnerSet {
  let campaignOwnerSetEvent = changetype<CampaignOwnerSet>(newMockEvent())

  campaignOwnerSetEvent.parameters = new Array()

  campaignOwnerSetEvent.parameters.push(
    new ethereum.EventParam(
      "marketHash",
      ethereum.Value.fromFixedBytes(marketHash)
    )
  )
  campaignOwnerSetEvent.parameters.push(
    new ethereum.EventParam(
      "campaignOwner",
      ethereum.Value.fromAddress(campaignOwner)
    )
  )

  return campaignOwnerSetEvent
}

export function createDepositExecutorSetEvent(
  depositExecutor: Address
): DepositExecutorSet {
  let depositExecutorSetEvent = changetype<DepositExecutorSet>(newMockEvent())

  depositExecutorSetEvent.parameters = new Array()

  depositExecutorSetEvent.parameters.push(
    new ethereum.EventParam(
      "depositExecutor",
      ethereum.Value.fromAddress(depositExecutor)
    )
  )

  return depositExecutorSetEvent
}

export function createDestinationChainLzEidSetEvent(
  dstChainLzEid: BigInt
): DestinationChainLzEidSet {
  let destinationChainLzEidSetEvent = changetype<DestinationChainLzEidSet>(
    newMockEvent()
  )

  destinationChainLzEidSetEvent.parameters = new Array()

  destinationChainLzEidSetEvent.parameters.push(
    new ethereum.EventParam(
      "dstChainLzEid",
      ethereum.Value.fromUnsignedBigInt(dstChainLzEid)
    )
  )

  return destinationChainLzEidSetEvent
}

export function createGreenLightTurnedOffEvent(
  marketHash: Bytes
): GreenLightTurnedOff {
  let greenLightTurnedOffEvent = changetype<GreenLightTurnedOff>(newMockEvent())

  greenLightTurnedOffEvent.parameters = new Array()

  greenLightTurnedOffEvent.parameters.push(
    new ethereum.EventParam(
      "marketHash",
      ethereum.Value.fromFixedBytes(marketHash)
    )
  )

  return greenLightTurnedOffEvent
}

export function createGreenLightTurnedOnEvent(
  marketHash: Bytes,
  bridgingAllowedTimestamp: BigInt
): GreenLightTurnedOn {
  let greenLightTurnedOnEvent = changetype<GreenLightTurnedOn>(newMockEvent())

  greenLightTurnedOnEvent.parameters = new Array()

  greenLightTurnedOnEvent.parameters.push(
    new ethereum.EventParam(
      "marketHash",
      ethereum.Value.fromFixedBytes(marketHash)
    )
  )
  greenLightTurnedOnEvent.parameters.push(
    new ethereum.EventParam(
      "bridgingAllowedTimestamp",
      ethereum.Value.fromUnsignedBigInt(bridgingAllowedTimestamp)
    )
  )

  return greenLightTurnedOnEvent
}

export function createGreenLighterSetEvent(
  greenLighter: Address
): GreenLighterSet {
  let greenLighterSetEvent = changetype<GreenLighterSet>(newMockEvent())

  greenLighterSetEvent.parameters = new Array()

  greenLighterSetEvent.parameters.push(
    new ethereum.EventParam(
      "greenLighter",
      ethereum.Value.fromAddress(greenLighter)
    )
  )

  return greenLighterSetEvent
}

export function createIndividualDepositMadeEvent(
  marketHash: Bytes,
  weirollWallet: Address,
  depositor: Address,
  amountDeposited: BigInt
): IndividualDepositMade {
  let individualDepositMadeEvent = changetype<IndividualDepositMade>(
    newMockEvent()
  )

  individualDepositMadeEvent.parameters = new Array()

  individualDepositMadeEvent.parameters.push(
    new ethereum.EventParam(
      "marketHash",
      ethereum.Value.fromFixedBytes(marketHash)
    )
  )
  individualDepositMadeEvent.parameters.push(
    new ethereum.EventParam(
      "weirollWallet",
      ethereum.Value.fromAddress(weirollWallet)
    )
  )
  individualDepositMadeEvent.parameters.push(
    new ethereum.EventParam("depositor", ethereum.Value.fromAddress(depositor))
  )
  individualDepositMadeEvent.parameters.push(
    new ethereum.EventParam(
      "amountDeposited",
      ethereum.Value.fromUnsignedBigInt(amountDeposited)
    )
  )

  return individualDepositMadeEvent
}

export function createIndividualWithdrawalMadeEvent(
  marketHash: Bytes,
  weirollWallet: Address,
  depositor: Address,
  amountWithdrawn: BigInt
): IndividualWithdrawalMade {
  let individualWithdrawalMadeEvent = changetype<IndividualWithdrawalMade>(
    newMockEvent()
  )

  individualWithdrawalMadeEvent.parameters = new Array()

  individualWithdrawalMadeEvent.parameters.push(
    new ethereum.EventParam(
      "marketHash",
      ethereum.Value.fromFixedBytes(marketHash)
    )
  )
  individualWithdrawalMadeEvent.parameters.push(
    new ethereum.EventParam(
      "weirollWallet",
      ethereum.Value.fromAddress(weirollWallet)
    )
  )
  individualWithdrawalMadeEvent.parameters.push(
    new ethereum.EventParam("depositor", ethereum.Value.fromAddress(depositor))
  )
  individualWithdrawalMadeEvent.parameters.push(
    new ethereum.EventParam(
      "amountWithdrawn",
      ethereum.Value.fromUnsignedBigInt(amountWithdrawn)
    )
  )

  return individualWithdrawalMadeEvent
}

export function createLpTokensBridgedToDestinationEvent(
  marketHash: Bytes,
  ccdmNonce: BigInt,
  depositorsBridged: Array<Address>,
  totalLpTokensBridged: BigInt,
  lz_token0_guid: Bytes,
  lz_token0_nonce: BigInt,
  token0: Address,
  lz_token0_AmountBridged: BigInt,
  lz_token1_guid: Bytes,
  lz_token1_nonce: BigInt,
  token1: Address,
  lz_token1_AmountBridged: BigInt
): LpTokensBridgedToDestination {
  let lpTokensBridgedToDestinationEvent =
    changetype<LpTokensBridgedToDestination>(newMockEvent())

  lpTokensBridgedToDestinationEvent.parameters = new Array()

  lpTokensBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam(
      "marketHash",
      ethereum.Value.fromFixedBytes(marketHash)
    )
  )
  lpTokensBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam(
      "ccdmNonce",
      ethereum.Value.fromUnsignedBigInt(ccdmNonce)
    )
  )
  lpTokensBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam(
      "depositorsBridged",
      ethereum.Value.fromAddressArray(depositorsBridged)
    )
  )
  lpTokensBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam(
      "totalLpTokensBridged",
      ethereum.Value.fromUnsignedBigInt(totalLpTokensBridged)
    )
  )
  lpTokensBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam(
      "lz_token0_guid",
      ethereum.Value.fromFixedBytes(lz_token0_guid)
    )
  )
  lpTokensBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam(
      "lz_token0_nonce",
      ethereum.Value.fromUnsignedBigInt(lz_token0_nonce)
    )
  )
  lpTokensBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam("token0", ethereum.Value.fromAddress(token0))
  )
  lpTokensBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam(
      "lz_token0_AmountBridged",
      ethereum.Value.fromUnsignedBigInt(lz_token0_AmountBridged)
    )
  )
  lpTokensBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam(
      "lz_token1_guid",
      ethereum.Value.fromFixedBytes(lz_token1_guid)
    )
  )
  lpTokensBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam(
      "lz_token1_nonce",
      ethereum.Value.fromUnsignedBigInt(lz_token1_nonce)
    )
  )
  lpTokensBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam("token1", ethereum.Value.fromAddress(token1))
  )
  lpTokensBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam(
      "lz_token1_AmountBridged",
      ethereum.Value.fromUnsignedBigInt(lz_token1_AmountBridged)
    )
  )

  return lpTokensBridgedToDestinationEvent
}

export function createLpTokensMerkleBridgedToDestinationEvent(
  marketHash: Bytes,
  ccdmNonce: BigInt,
  lastCcdmNonceBridged: BigInt,
  merkleRoot: Bytes,
  totalLpTokensBridged: BigInt,
  lz_token0_guid: Bytes,
  lz_token0_nonce: BigInt,
  token0: Address,
  lz_token0_AmountBridged: BigInt,
  lz_token1_guid: Bytes,
  lz_token1_nonce: BigInt,
  token1: Address,
  lz_token1_AmountBridged: BigInt
): LpTokensMerkleBridgedToDestination {
  let lpTokensMerkleBridgedToDestinationEvent =
    changetype<LpTokensMerkleBridgedToDestination>(newMockEvent())

  lpTokensMerkleBridgedToDestinationEvent.parameters = new Array()

  lpTokensMerkleBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam(
      "marketHash",
      ethereum.Value.fromFixedBytes(marketHash)
    )
  )
  lpTokensMerkleBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam(
      "ccdmNonce",
      ethereum.Value.fromUnsignedBigInt(ccdmNonce)
    )
  )
  lpTokensMerkleBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam(
      "lastCcdmNonceBridged",
      ethereum.Value.fromUnsignedBigInt(lastCcdmNonceBridged)
    )
  )
  lpTokensMerkleBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam(
      "merkleRoot",
      ethereum.Value.fromFixedBytes(merkleRoot)
    )
  )
  lpTokensMerkleBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam(
      "totalLpTokensBridged",
      ethereum.Value.fromUnsignedBigInt(totalLpTokensBridged)
    )
  )
  lpTokensMerkleBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam(
      "lz_token0_guid",
      ethereum.Value.fromFixedBytes(lz_token0_guid)
    )
  )
  lpTokensMerkleBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam(
      "lz_token0_nonce",
      ethereum.Value.fromUnsignedBigInt(lz_token0_nonce)
    )
  )
  lpTokensMerkleBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam("token0", ethereum.Value.fromAddress(token0))
  )
  lpTokensMerkleBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam(
      "lz_token0_AmountBridged",
      ethereum.Value.fromUnsignedBigInt(lz_token0_AmountBridged)
    )
  )
  lpTokensMerkleBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam(
      "lz_token1_guid",
      ethereum.Value.fromFixedBytes(lz_token1_guid)
    )
  )
  lpTokensMerkleBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam(
      "lz_token1_nonce",
      ethereum.Value.fromUnsignedBigInt(lz_token1_nonce)
    )
  )
  lpTokensMerkleBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam("token1", ethereum.Value.fromAddress(token1))
  )
  lpTokensMerkleBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam(
      "lz_token1_AmountBridged",
      ethereum.Value.fromUnsignedBigInt(lz_token1_AmountBridged)
    )
  )

  return lpTokensMerkleBridgedToDestinationEvent
}

export function createLzV2OFTForTokenRemovedEvent(
  token: Address
): LzV2OFTForTokenRemoved {
  let lzV2OftForTokenRemovedEvent = changetype<LzV2OFTForTokenRemoved>(
    newMockEvent()
  )

  lzV2OftForTokenRemovedEvent.parameters = new Array()

  lzV2OftForTokenRemovedEvent.parameters.push(
    new ethereum.EventParam("token", ethereum.Value.fromAddress(token))
  )

  return lzV2OftForTokenRemovedEvent
}

export function createLzV2OFTForTokenSetEvent(
  token: Address,
  lzV2OFT: Address
): LzV2OFTForTokenSet {
  let lzV2OftForTokenSetEvent = changetype<LzV2OFTForTokenSet>(newMockEvent())

  lzV2OftForTokenSetEvent.parameters = new Array()

  lzV2OftForTokenSetEvent.parameters.push(
    new ethereum.EventParam("token", ethereum.Value.fromAddress(token))
  )
  lzV2OftForTokenSetEvent.parameters.push(
    new ethereum.EventParam("lzV2OFT", ethereum.Value.fromAddress(lzV2OFT))
  )

  return lzV2OftForTokenSetEvent
}

export function createMarketHaltedEvent(marketHash: Bytes): MarketHalted {
  let marketHaltedEvent = changetype<MarketHalted>(newMockEvent())

  marketHaltedEvent.parameters = new Array()

  marketHaltedEvent.parameters.push(
    new ethereum.EventParam(
      "marketHash",
      ethereum.Value.fromFixedBytes(marketHash)
    )
  )

  return marketHaltedEvent
}

export function createMerkleDepositMadeEvent(
  lastCcdmNonceBridged: BigInt,
  marketHash: Bytes,
  weirollWallet: Address,
  depositor: Address,
  amountDeposited: BigInt,
  merkleDepositNonce: BigInt,
  depositLeaf: Bytes,
  depositLeafIndex: BigInt,
  updatedMerkleRoot: Bytes
): MerkleDepositMade {
  let merkleDepositMadeEvent = changetype<MerkleDepositMade>(newMockEvent())

  merkleDepositMadeEvent.parameters = new Array()

  merkleDepositMadeEvent.parameters.push(
    new ethereum.EventParam(
      "lastCcdmNonceBridged",
      ethereum.Value.fromUnsignedBigInt(lastCcdmNonceBridged)
    )
  )
  merkleDepositMadeEvent.parameters.push(
    new ethereum.EventParam(
      "marketHash",
      ethereum.Value.fromFixedBytes(marketHash)
    )
  )
  merkleDepositMadeEvent.parameters.push(
    new ethereum.EventParam(
      "weirollWallet",
      ethereum.Value.fromAddress(weirollWallet)
    )
  )
  merkleDepositMadeEvent.parameters.push(
    new ethereum.EventParam("depositor", ethereum.Value.fromAddress(depositor))
  )
  merkleDepositMadeEvent.parameters.push(
    new ethereum.EventParam(
      "amountDeposited",
      ethereum.Value.fromUnsignedBigInt(amountDeposited)
    )
  )
  merkleDepositMadeEvent.parameters.push(
    new ethereum.EventParam(
      "merkleDepositNonce",
      ethereum.Value.fromUnsignedBigInt(merkleDepositNonce)
    )
  )
  merkleDepositMadeEvent.parameters.push(
    new ethereum.EventParam(
      "depositLeaf",
      ethereum.Value.fromFixedBytes(depositLeaf)
    )
  )
  merkleDepositMadeEvent.parameters.push(
    new ethereum.EventParam(
      "depositLeafIndex",
      ethereum.Value.fromUnsignedBigInt(depositLeafIndex)
    )
  )
  merkleDepositMadeEvent.parameters.push(
    new ethereum.EventParam(
      "updatedMerkleRoot",
      ethereum.Value.fromFixedBytes(updatedMerkleRoot)
    )
  )

  return merkleDepositMadeEvent
}

export function createMerkleWithdrawalMadeEvent(
  marketHash: Bytes,
  weirollWallet: Address,
  depositor: Address,
  amountWithdrawn: BigInt
): MerkleWithdrawalMade {
  let merkleWithdrawalMadeEvent = changetype<MerkleWithdrawalMade>(
    newMockEvent()
  )

  merkleWithdrawalMadeEvent.parameters = new Array()

  merkleWithdrawalMadeEvent.parameters.push(
    new ethereum.EventParam(
      "marketHash",
      ethereum.Value.fromFixedBytes(marketHash)
    )
  )
  merkleWithdrawalMadeEvent.parameters.push(
    new ethereum.EventParam(
      "weirollWallet",
      ethereum.Value.fromAddress(weirollWallet)
    )
  )
  merkleWithdrawalMadeEvent.parameters.push(
    new ethereum.EventParam("depositor", ethereum.Value.fromAddress(depositor))
  )
  merkleWithdrawalMadeEvent.parameters.push(
    new ethereum.EventParam(
      "amountWithdrawn",
      ethereum.Value.fromUnsignedBigInt(amountWithdrawn)
    )
  )

  return merkleWithdrawalMadeEvent
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

export function createSingleTokensBridgedToDestinationEvent(
  marketHash: Bytes,
  ccdmNonce: BigInt,
  depositorsBridged: Array<Address>,
  lz_guid: Bytes,
  lz_nonce: BigInt,
  totalAmountBridged: BigInt
): SingleTokensBridgedToDestination {
  let singleTokensBridgedToDestinationEvent =
    changetype<SingleTokensBridgedToDestination>(newMockEvent())

  singleTokensBridgedToDestinationEvent.parameters = new Array()

  singleTokensBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam(
      "marketHash",
      ethereum.Value.fromFixedBytes(marketHash)
    )
  )
  singleTokensBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam(
      "ccdmNonce",
      ethereum.Value.fromUnsignedBigInt(ccdmNonce)
    )
  )
  singleTokensBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam(
      "depositorsBridged",
      ethereum.Value.fromAddressArray(depositorsBridged)
    )
  )
  singleTokensBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam("lz_guid", ethereum.Value.fromFixedBytes(lz_guid))
  )
  singleTokensBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam(
      "lz_nonce",
      ethereum.Value.fromUnsignedBigInt(lz_nonce)
    )
  )
  singleTokensBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam(
      "totalAmountBridged",
      ethereum.Value.fromUnsignedBigInt(totalAmountBridged)
    )
  )

  return singleTokensBridgedToDestinationEvent
}

export function createSingleTokensMerkleBridgedToDestinationEvent(
  marketHash: Bytes,
  ccdmNonce: BigInt,
  lastCcdmNonceBridged: BigInt,
  merkleRoot: Bytes,
  lz_guid: Bytes,
  lz_nonce: BigInt,
  totalAmountBridged: BigInt
): SingleTokensMerkleBridgedToDestination {
  let singleTokensMerkleBridgedToDestinationEvent =
    changetype<SingleTokensMerkleBridgedToDestination>(newMockEvent())

  singleTokensMerkleBridgedToDestinationEvent.parameters = new Array()

  singleTokensMerkleBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam(
      "marketHash",
      ethereum.Value.fromFixedBytes(marketHash)
    )
  )
  singleTokensMerkleBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam(
      "ccdmNonce",
      ethereum.Value.fromUnsignedBigInt(ccdmNonce)
    )
  )
  singleTokensMerkleBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam(
      "lastCcdmNonceBridged",
      ethereum.Value.fromUnsignedBigInt(lastCcdmNonceBridged)
    )
  )
  singleTokensMerkleBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam(
      "merkleRoot",
      ethereum.Value.fromFixedBytes(merkleRoot)
    )
  )
  singleTokensMerkleBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam("lz_guid", ethereum.Value.fromFixedBytes(lz_guid))
  )
  singleTokensMerkleBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam(
      "lz_nonce",
      ethereum.Value.fromUnsignedBigInt(lz_nonce)
    )
  )
  singleTokensMerkleBridgedToDestinationEvent.parameters.push(
    new ethereum.EventParam(
      "totalAmountBridged",
      ethereum.Value.fromUnsignedBigInt(totalAmountBridged)
    )
  )

  return singleTokensMerkleBridgedToDestinationEvent
}
