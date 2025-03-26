import { newMockEvent } from "matchstick-as"
import { ethereum, BigInt, Bytes, Address } from "@graphprotocol/graph-ts"
import {
  APOfferCancelled,
  APOfferCreated,
  APOfferFilled,
  FeesClaimed,
  IPOfferCancelled,
  IPOfferCreated,
  IPOfferFilled,
  MarketCreated,
  OwnershipTransferred,
  WeirollWalletClaimedIncentive,
  WeirollWalletExecutedWithdrawal,
  WeirollWalletForfeited
} from "../generated/RecipeMarketHub/RecipeMarketHub"

export function createAPOfferCancelledEvent(offerID: BigInt): APOfferCancelled {
  let apOfferCancelledEvent = changetype<APOfferCancelled>(newMockEvent())

  apOfferCancelledEvent.parameters = new Array()

  apOfferCancelledEvent.parameters.push(
    new ethereum.EventParam(
      "offerID",
      ethereum.Value.fromUnsignedBigInt(offerID)
    )
  )

  return apOfferCancelledEvent
}

export function createAPOfferCreatedEvent(
  offerID: BigInt,
  marketHash: Bytes,
  ap: Address,
  fundingVault: Address,
  quantity: BigInt,
  incentiveAddresses: Array<Address>,
  incentiveAmounts: Array<BigInt>,
  expiry: BigInt
): APOfferCreated {
  let apOfferCreatedEvent = changetype<APOfferCreated>(newMockEvent())

  apOfferCreatedEvent.parameters = new Array()

  apOfferCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "offerID",
      ethereum.Value.fromUnsignedBigInt(offerID)
    )
  )
  apOfferCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "marketHash",
      ethereum.Value.fromFixedBytes(marketHash)
    )
  )
  apOfferCreatedEvent.parameters.push(
    new ethereum.EventParam("ap", ethereum.Value.fromAddress(ap))
  )
  apOfferCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "fundingVault",
      ethereum.Value.fromAddress(fundingVault)
    )
  )
  apOfferCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "quantity",
      ethereum.Value.fromUnsignedBigInt(quantity)
    )
  )
  apOfferCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "incentiveAddresses",
      ethereum.Value.fromAddressArray(incentiveAddresses)
    )
  )
  apOfferCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "incentiveAmounts",
      ethereum.Value.fromUnsignedBigIntArray(incentiveAmounts)
    )
  )
  apOfferCreatedEvent.parameters.push(
    new ethereum.EventParam("expiry", ethereum.Value.fromUnsignedBigInt(expiry))
  )

  return apOfferCreatedEvent
}

export function createAPOfferFilledEvent(
  offerID: BigInt,
  ip: Address,
  fillAmount: BigInt,
  weirollWallet: Address,
  incentiveAmounts: Array<BigInt>,
  protocolFeeAmounts: Array<BigInt>,
  frontendFeeAmounts: Array<BigInt>
): APOfferFilled {
  let apOfferFilledEvent = changetype<APOfferFilled>(newMockEvent())

  apOfferFilledEvent.parameters = new Array()

  apOfferFilledEvent.parameters.push(
    new ethereum.EventParam(
      "offerID",
      ethereum.Value.fromUnsignedBigInt(offerID)
    )
  )
  apOfferFilledEvent.parameters.push(
    new ethereum.EventParam("ip", ethereum.Value.fromAddress(ip))
  )
  apOfferFilledEvent.parameters.push(
    new ethereum.EventParam(
      "fillAmount",
      ethereum.Value.fromUnsignedBigInt(fillAmount)
    )
  )
  apOfferFilledEvent.parameters.push(
    new ethereum.EventParam(
      "weirollWallet",
      ethereum.Value.fromAddress(weirollWallet)
    )
  )
  apOfferFilledEvent.parameters.push(
    new ethereum.EventParam(
      "incentiveAmounts",
      ethereum.Value.fromUnsignedBigIntArray(incentiveAmounts)
    )
  )
  apOfferFilledEvent.parameters.push(
    new ethereum.EventParam(
      "protocolFeeAmounts",
      ethereum.Value.fromUnsignedBigIntArray(protocolFeeAmounts)
    )
  )
  apOfferFilledEvent.parameters.push(
    new ethereum.EventParam(
      "frontendFeeAmounts",
      ethereum.Value.fromUnsignedBigIntArray(frontendFeeAmounts)
    )
  )

  return apOfferFilledEvent
}

export function createFeesClaimedEvent(
  claimant: Address,
  incentive: Address,
  amount: BigInt
): FeesClaimed {
  let feesClaimedEvent = changetype<FeesClaimed>(newMockEvent())

  feesClaimedEvent.parameters = new Array()

  feesClaimedEvent.parameters.push(
    new ethereum.EventParam("claimant", ethereum.Value.fromAddress(claimant))
  )
  feesClaimedEvent.parameters.push(
    new ethereum.EventParam("incentive", ethereum.Value.fromAddress(incentive))
  )
  feesClaimedEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return feesClaimedEvent
}

export function createIPOfferCancelledEvent(
  offerHash: Bytes
): IPOfferCancelled {
  let ipOfferCancelledEvent = changetype<IPOfferCancelled>(newMockEvent())

  ipOfferCancelledEvent.parameters = new Array()

  ipOfferCancelledEvent.parameters.push(
    new ethereum.EventParam(
      "offerHash",
      ethereum.Value.fromFixedBytes(offerHash)
    )
  )

  return ipOfferCancelledEvent
}

export function createIPOfferCreatedEvent(
  offerID: BigInt,
  offerHash: Bytes,
  marketHash: Bytes,
  ip: Address,
  quantity: BigInt,
  incentivesOffered: Array<Address>,
  incentiveAmounts: Array<BigInt>,
  protocolFeeAmounts: Array<BigInt>,
  frontendFeeAmounts: Array<BigInt>,
  expiry: BigInt
): IPOfferCreated {
  let ipOfferCreatedEvent = changetype<IPOfferCreated>(newMockEvent())

  ipOfferCreatedEvent.parameters = new Array()

  ipOfferCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "offerID",
      ethereum.Value.fromUnsignedBigInt(offerID)
    )
  )
  ipOfferCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "offerHash",
      ethereum.Value.fromFixedBytes(offerHash)
    )
  )
  ipOfferCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "marketHash",
      ethereum.Value.fromFixedBytes(marketHash)
    )
  )
  ipOfferCreatedEvent.parameters.push(
    new ethereum.EventParam("ip", ethereum.Value.fromAddress(ip))
  )
  ipOfferCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "quantity",
      ethereum.Value.fromUnsignedBigInt(quantity)
    )
  )
  ipOfferCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "incentivesOffered",
      ethereum.Value.fromAddressArray(incentivesOffered)
    )
  )
  ipOfferCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "incentiveAmounts",
      ethereum.Value.fromUnsignedBigIntArray(incentiveAmounts)
    )
  )
  ipOfferCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "protocolFeeAmounts",
      ethereum.Value.fromUnsignedBigIntArray(protocolFeeAmounts)
    )
  )
  ipOfferCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "frontendFeeAmounts",
      ethereum.Value.fromUnsignedBigIntArray(frontendFeeAmounts)
    )
  )
  ipOfferCreatedEvent.parameters.push(
    new ethereum.EventParam("expiry", ethereum.Value.fromUnsignedBigInt(expiry))
  )

  return ipOfferCreatedEvent
}

export function createIPOfferFilledEvent(
  offerHash: Bytes,
  ap: Address,
  fillAmount: BigInt,
  weirollWallet: Address,
  incentiveAmounts: Array<BigInt>,
  protocolFeeAmounts: Array<BigInt>,
  frontendFeeAmounts: Array<BigInt>
): IPOfferFilled {
  let ipOfferFilledEvent = changetype<IPOfferFilled>(newMockEvent())

  ipOfferFilledEvent.parameters = new Array()

  ipOfferFilledEvent.parameters.push(
    new ethereum.EventParam(
      "offerHash",
      ethereum.Value.fromFixedBytes(offerHash)
    )
  )
  ipOfferFilledEvent.parameters.push(
    new ethereum.EventParam("ap", ethereum.Value.fromAddress(ap))
  )
  ipOfferFilledEvent.parameters.push(
    new ethereum.EventParam(
      "fillAmount",
      ethereum.Value.fromUnsignedBigInt(fillAmount)
    )
  )
  ipOfferFilledEvent.parameters.push(
    new ethereum.EventParam(
      "weirollWallet",
      ethereum.Value.fromAddress(weirollWallet)
    )
  )
  ipOfferFilledEvent.parameters.push(
    new ethereum.EventParam(
      "incentiveAmounts",
      ethereum.Value.fromUnsignedBigIntArray(incentiveAmounts)
    )
  )
  ipOfferFilledEvent.parameters.push(
    new ethereum.EventParam(
      "protocolFeeAmounts",
      ethereum.Value.fromUnsignedBigIntArray(protocolFeeAmounts)
    )
  )
  ipOfferFilledEvent.parameters.push(
    new ethereum.EventParam(
      "frontendFeeAmounts",
      ethereum.Value.fromUnsignedBigIntArray(frontendFeeAmounts)
    )
  )

  return ipOfferFilledEvent
}

export function createMarketCreatedEvent(
  marketID: BigInt,
  marketHash: Bytes,
  inputToken: Address,
  lockupTime: BigInt,
  frontendFee: BigInt,
  rewardStyle: i32
): MarketCreated {
  let marketCreatedEvent = changetype<MarketCreated>(newMockEvent())

  marketCreatedEvent.parameters = new Array()

  marketCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "marketID",
      ethereum.Value.fromUnsignedBigInt(marketID)
    )
  )
  marketCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "marketHash",
      ethereum.Value.fromFixedBytes(marketHash)
    )
  )
  marketCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "inputToken",
      ethereum.Value.fromAddress(inputToken)
    )
  )
  marketCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "lockupTime",
      ethereum.Value.fromUnsignedBigInt(lockupTime)
    )
  )
  marketCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "frontendFee",
      ethereum.Value.fromUnsignedBigInt(frontendFee)
    )
  )
  marketCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "rewardStyle",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(rewardStyle))
    )
  )

  return marketCreatedEvent
}

export function createOwnershipTransferredEvent(
  user: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent = changetype<OwnershipTransferred>(
    newMockEvent()
  )

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}

export function createWeirollWalletClaimedIncentiveEvent(
  weirollWallet: Address,
  recipient: Address,
  incentive: Address
): WeirollWalletClaimedIncentive {
  let weirollWalletClaimedIncentiveEvent =
    changetype<WeirollWalletClaimedIncentive>(newMockEvent())

  weirollWalletClaimedIncentiveEvent.parameters = new Array()

  weirollWalletClaimedIncentiveEvent.parameters.push(
    new ethereum.EventParam(
      "weirollWallet",
      ethereum.Value.fromAddress(weirollWallet)
    )
  )
  weirollWalletClaimedIncentiveEvent.parameters.push(
    new ethereum.EventParam("recipient", ethereum.Value.fromAddress(recipient))
  )
  weirollWalletClaimedIncentiveEvent.parameters.push(
    new ethereum.EventParam("incentive", ethereum.Value.fromAddress(incentive))
  )

  return weirollWalletClaimedIncentiveEvent
}

export function createWeirollWalletExecutedWithdrawalEvent(
  weirollWallet: Address
): WeirollWalletExecutedWithdrawal {
  let weirollWalletExecutedWithdrawalEvent =
    changetype<WeirollWalletExecutedWithdrawal>(newMockEvent())

  weirollWalletExecutedWithdrawalEvent.parameters = new Array()

  weirollWalletExecutedWithdrawalEvent.parameters.push(
    new ethereum.EventParam(
      "weirollWallet",
      ethereum.Value.fromAddress(weirollWallet)
    )
  )

  return weirollWalletExecutedWithdrawalEvent
}

export function createWeirollWalletForfeitedEvent(
  weirollWallet: Address
): WeirollWalletForfeited {
  let weirollWalletForfeitedEvent = changetype<WeirollWalletForfeited>(
    newMockEvent()
  )

  weirollWalletForfeitedEvent.parameters = new Array()

  weirollWalletForfeitedEvent.parameters.push(
    new ethereum.EventParam(
      "weirollWallet",
      ethereum.Value.fromAddress(weirollWallet)
    )
  )

  return weirollWalletForfeitedEvent
}
