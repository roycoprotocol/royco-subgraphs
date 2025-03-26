import {
  APOfferCancelled as APOfferCancelledEvent,
  APOfferCreated as APOfferCreatedEvent,
  APOfferFilled as APOfferFilledEvent,
  FeesClaimed as FeesClaimedEvent,
  IPOfferCancelled as IPOfferCancelledEvent,
  IPOfferCreated as IPOfferCreatedEvent,
  IPOfferFilled as IPOfferFilledEvent,
  MarketCreated as MarketCreatedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  WeirollWalletClaimedIncentive as WeirollWalletClaimedIncentiveEvent,
  WeirollWalletExecutedWithdrawal as WeirollWalletExecutedWithdrawalEvent,
  WeirollWalletForfeited as WeirollWalletForfeitedEvent,
} from "../generated/RecipeMarketHub/RecipeMarketHub";
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
  WeirollWalletForfeited,
} from "../generated/schema";
import { cancelAPOffer, createAPOffer, fillAPOffer } from "./ap-handler";
import { CHAIN_ID } from "./constants";
import { cancelIPOffer, createIPOffer, fillIPOffer } from "./ip-handler";
import { createRawMarket } from "./market-handler";
import { generateId } from "./utils";
import {
  claimIncentive,
  forfeitPosition,
  withdrawInputToken,
} from "./weiroll-wallet-handler";

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.user = event.params.user.toHexString();
  entity.newOwner = event.params.newOwner.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleMarketCreated(event: MarketCreatedEvent): void {
  let entity = new MarketCreated(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.marketID = event.params.marketID;
  entity.marketHash = event.params.marketHash.toHexString();
  entity.inputToken = event.params.inputToken.toHexString();
  entity.lockupTime = event.params.lockupTime;
  entity.frontendFee = event.params.frontendFee;
  entity.rewardStyle = event.params.rewardStyle;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  // Create new raw market
  createRawMarket(event);
}

export function handleIPOfferCreated(event: IPOfferCreatedEvent): void {
  let entity = new IPOfferCreated(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.offerID = event.params.offerID;
  entity.offerHash = event.params.offerHash.toHexString();
  entity.marketHash = event.params.marketHash.toHexString();
  entity.ip = event.params.ip.toHexString();
  entity.quantity = event.params.quantity;
  entity.incentivesOffered = event.params.incentivesOffered.map<string>(
    (address) => address.toHexString()
  );
  entity.incentiveAmounts = event.params.incentiveAmounts;
  entity.protocolFeeAmounts = event.params.protocolFeeAmounts;
  entity.frontendFeeAmounts = event.params.frontendFeeAmounts;
  entity.expiry = event.params.expiry;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  // Create IP Offer
  createIPOffer(event);
}

export function handleIPOfferFilled(event: IPOfferFilledEvent): void {
  let entity = new IPOfferFilled(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.offerHash = event.params.offerHash.toHexString();
  entity.ap = event.params.ap.toHexString();
  entity.fillAmount = event.params.fillAmount;
  entity.weirollWallet = event.params.weirollWallet.toHexString();
  entity.incentiveAmounts = event.params.incentiveAmounts;
  entity.protocolFeeAmounts = event.params.protocolFeeAmounts;
  entity.frontendFeeAmounts = event.params.frontendFeeAmounts;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  // Fill IP Offer
  fillIPOffer(event);
}

export function handleIPOfferCancelled(event: IPOfferCancelledEvent): void {
  let entity = new IPOfferCancelled(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.offerHash = event.params.offerHash.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  // Cancel IP Offer
  cancelIPOffer(event);
}

export function handleAPOfferCreated(event: APOfferCreatedEvent): void {
  let entity = new APOfferCreated(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.offerID = event.params.offerID;
  entity.marketHash = event.params.marketHash.toHexString();
  entity.ap = event.params.ap.toHexString();
  entity.fundingVault = event.params.fundingVault.toHexString();
  entity.quantity = event.params.quantity;
  entity.incentiveAddresses = event.params.incentiveAddresses.map<string>(
    (address) => address.toHexString()
  );
  entity.incentiveAmounts = event.params.incentiveAmounts;
  entity.expiry = event.params.expiry;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  // Create AP Offer
  createAPOffer(event);
}

export function handleAPOfferFilled(event: APOfferFilledEvent): void {
  let entity = new APOfferFilled(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.offerID = event.params.offerID;
  entity.ip = event.params.ip.toHexString();
  entity.fillAmount = event.params.fillAmount;
  entity.weirollWallet = event.params.weirollWallet.toHexString();
  entity.incentiveAmounts = event.params.incentiveAmounts;
  entity.protocolFeeAmounts = event.params.protocolFeeAmounts;
  entity.frontendFeeAmounts = event.params.frontendFeeAmounts;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  // Fill AP Offer
  fillAPOffer(event);
}

export function handleAPOfferCancelled(event: APOfferCancelledEvent): void {
  let entity = new APOfferCancelled(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.offerID = event.params.offerID;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  // Cancel AP Offer
  cancelAPOffer(event);
}

export function handleWeirollWalletClaimedIncentive(
  event: WeirollWalletClaimedIncentiveEvent
): void {
  let entity = new WeirollWalletClaimedIncentive(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.weirollWallet = event.params.weirollWallet.toHexString();
  entity.recipient = event.params.recipient.toHexString();
  entity.incentive = event.params.incentive.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  // Claim Incentive
  claimIncentive(event);
}

export function handleWeirollWalletExecutedWithdrawal(
  event: WeirollWalletExecutedWithdrawalEvent
): void {
  let entity = new WeirollWalletExecutedWithdrawal(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.weirollWallet = event.params.weirollWallet.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  // Withdraw Input
  withdrawInputToken(event);
}

export function handleWeirollWalletForfeited(
  event: WeirollWalletForfeitedEvent
): void {
  let entity = new WeirollWalletForfeited(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.weirollWallet = event.params.weirollWallet.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  // Forfeit Position
  forfeitPosition(event);
}

export function handleFeesClaimed(event: FeesClaimedEvent): void {
  let entity = new FeesClaimed(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.claimant = event.params.claimant.toHexString();
  entity.incentive = event.params.incentive.toHexString();
  entity.amount = event.params.amount;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}
