import {
  IssuanceCommenced as IssuanceCommencedEvent,
  CreditsPurchased as CreditsPurchasedEvent,
  IssuanceLiquidityClaimed as IssuanceLiquidityClaimedEvent,
  IssuanceCancelled as IssuanceCancelledEvent,
  LiquidityWithdrawn as LiquidityWithdrawnEvent,
  CreditsRedeemed as CreditsRedeemedEvent,
  Transfer as TransferEvent,
  CreditsClaimed as CreditsClaimedEvent,
} from "../generated/templates/CreditTemplate/Credit";
import {
  IssuanceCommenced,
  CreditsPurchased,
  IssuanceLiquidityClaimed,
  IssuanceCancelled,
  LiquidityWithdrawn,
  CreditsRedeemed,
  Transfer,
  RawCredit,
  RawCreditBalance,
  RawIssuance,
  CreditsClaimed,
  RawGlobalActivity,
  RawIssuanceBalance,
} from "../generated/schema";
import { CHAIN_ID, NULL_ADDRESS } from "./constants";
import { BigInt } from "@graphprotocol/graph-ts";
import {
  generateId,
  generateTokenId,
  generateRawCreditBalanceId,
  generateRawIssuanceId,
  generateRawGlobalActivityId,
  generateRawIssuanceBalanceId,
} from "./utils";

export function handleIssuanceCommenced(event: IssuanceCommencedEvent): void {
  let entity = new IssuanceCommenced(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.credit = event.address.toHexString();
  entity.issuanceId = event.params.issuanceId;
  entity.quantityToIssue = event.params.quantityToIssue;
  entity.assetDemanded = event.params.assetDemanded.toHexString();
  entity.liquidityDemanded = event.params.liquidityDemanded;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;
  entity.save();

  // Create new raw issuance
  let rawIssuanceId = generateRawIssuanceId(
    event.address,
    event.params.issuanceId
  );

  let rawIssuance = new RawIssuance(rawIssuanceId);

  rawIssuance.rawCreditRefId = generateTokenId(event.address);
  rawIssuance.chainId = CHAIN_ID;
  rawIssuance.contractAddress = event.address.toHexString();
  rawIssuance.issuanceId = event.params.issuanceId.toHexString();
  rawIssuance.assetDemandedId = generateTokenId(event.params.assetDemanded);
  rawIssuance.assetDemandedAddress = event.params.assetDemanded.toHexString();
  rawIssuance.pricePerCreditWAD = BigInt.zero(); // TODO: update this after Shiv adds price per credit in the event
  rawIssuance.quantitySupplied = event.params.quantityToIssue;
  rawIssuance.quantityDemanded = BigInt.zero();
  rawIssuance.liquidity = BigInt.zero();
  rawIssuance.issuerClaimedLiquidity = false;
  rawIssuance.isCancelled = false;
  rawIssuance.isCompleted = false;
  rawIssuance.createdTransactionHash = event.transaction.hash.toHexString();
  rawIssuance.updatedTransactionHash = event.transaction.hash.toHexString();
  rawIssuance.createdAt = event.block.timestamp.toI32();
  rawIssuance.updatedAt = event.block.timestamp.toI32();

  rawIssuance.save();
}

export function handleIssuanceCancelled(event: IssuanceCancelledEvent): void {
  let entity = new IssuanceCancelled(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.credit = event.address.toHexString();
  entity.issuanceId = event.params.issuanceId;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;
  entity.save();

  // Update Raw Issuance
  let rawIssuance = RawIssuance.load(
    generateRawIssuanceId(event.address, event.params.issuanceId)
  );

  if (rawIssuance) {
    rawIssuance.isCancelled = true;
    rawIssuance.updatedTransactionHash = event.transaction.hash.toHexString();
    rawIssuance.updatedAt = event.block.timestamp.toI32();

    rawIssuance.save();
  }
}

export function handleIssuanceLiquidityClaimed(
  event: IssuanceLiquidityClaimedEvent
): void {
  let entity = new IssuanceLiquidityClaimed(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.credit = event.address.toHexString();
  entity.issuanceId = event.params.issuanceId;
  entity.recipient = event.params.recipient.toHexString();
  entity.totalAmountClaimed = event.params.totalAmountClaimed;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;
  entity.save();

  // Update Raw Issuance
  let rawIssuance = RawIssuance.load(
    generateRawIssuanceId(event.address, event.params.issuanceId)
  );

  if (rawIssuance) {
    rawIssuance.issuerClaimedLiquidity = true;
    rawIssuance.updatedTransactionHash = event.transaction.hash.toHexString();
    rawIssuance.updatedAt = event.block.timestamp.toI32();

    rawIssuance.save();
  }
}

export function handleCreditsPurchased(event: CreditsPurchasedEvent): void {
  let entity = new CreditsPurchased(
    generateId(event.transaction.hash, event.logIndex)
  );

  entity.chainId = CHAIN_ID;
  entity.credit = event.address.toHexString();
  entity.issuanceId = event.params.issuanceId;
  entity.purchaser = event.params.purchaser.toHexString();
  entity.recipient = event.params.recipient.toHexString();
  entity.creditsPurchased = event.params.creditsPurchased;
  entity.liquidityAdded = event.params.liquidityAdded;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  // Update Raw Issuance
  let rawIssuanceId = generateRawIssuanceId(
    event.address,
    event.params.issuanceId
  );
  let rawIssuance = RawIssuance.load(rawIssuanceId);

  if (rawIssuance) {
    // Increment quantity demanded and liquidity
    rawIssuance.quantityDemanded = rawIssuance.quantityDemanded.plus(
      event.params.creditsPurchased
    );
    rawIssuance.liquidity = rawIssuance.liquidity.plus(
      event.params.liquidityAdded
    );

    // If quantity demanded is greater than or equal to quantity supplied, set isCompleted to true
    if (
      rawIssuance.quantityDemanded.equals(rawIssuance.quantitySupplied) ||
      rawIssuance.quantityDemanded.gt(rawIssuance.quantitySupplied)
    ) {
      rawIssuance.isCompleted = true;
    }

    rawIssuance.updatedTransactionHash = event.transaction.hash.toHexString();
    rawIssuance.updatedAt = event.block.timestamp.toI32();

    rawIssuance.save();
  }

  // Create/Update Raw Issuance Balance
  let rawIssuanceBalanceId = generateRawIssuanceBalanceId(
    event.address,
    event.params.issuanceId,
    event.params.recipient
  );
  let rawIssuanceBalance = RawIssuanceBalance.load(rawIssuanceBalanceId);

  if (!rawIssuanceBalance) {
    rawIssuanceBalance = new RawIssuanceBalance(rawIssuanceBalanceId);
    rawIssuanceBalance.rawIssuanceRefId = rawIssuanceId;
    rawIssuanceBalance.chainId = CHAIN_ID;
    rawIssuanceBalance.contractAddress = event.address.toHexString();
    rawIssuanceBalance.accountAddress = event.params.recipient.toHexString();
    rawIssuanceBalance.creditAmount = BigInt.zero();
    rawIssuanceBalance.liquidityAmount = BigInt.zero();
    rawIssuanceBalance.createdTransactionHash =
      event.transaction.hash.toHexString();
    rawIssuanceBalance.createdAt = event.block.timestamp.toI32();
  }

  rawIssuanceBalance.creditAmount = rawIssuanceBalance.creditAmount.plus(
    event.params.creditsPurchased
  );
  rawIssuanceBalance.liquidityAmount = rawIssuanceBalance.liquidityAmount.plus(
    event.params.liquidityAdded
  );
  rawIssuanceBalance.updatedTransactionHash =
    event.transaction.hash.toHexString();
  rawIssuanceBalance.updatedAt = event.block.timestamp.toI32();

  rawIssuanceBalance.save();
}

export function handleCreditsClaimed(event: CreditsClaimedEvent): void {
  let entity = new CreditsClaimed(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.credit = event.address.toHexString();
  entity.issuanceId = event.params.issuanceId;
  entity.claimant = event.params.claimant.toHexString();
  entity.recipient = event.params.recipient.toHexString();
  entity.amountClaimed = event.params.amountClaimed;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;
  entity.save();

  // Update Raw Issuance Balance
  let rawIssuanceBalanceId = generateRawIssuanceBalanceId(
    event.address,
    event.params.issuanceId,
    event.params.recipient
  );
  let rawIssuanceBalance = RawIssuanceBalance.load(rawIssuanceBalanceId);

  if (rawIssuanceBalance) {
    rawIssuanceBalance.creditAmount = rawIssuanceBalance.creditAmount.minus(
      event.params.amountClaimed
    );
    rawIssuanceBalance.updatedTransactionHash =
      event.transaction.hash.toHexString();
    rawIssuanceBalance.updatedAt = event.block.timestamp.toI32();

    rawIssuanceBalance.save();
  }
}

export function handleLiquidityWithdrawn(event: LiquidityWithdrawnEvent): void {
  let entity = new LiquidityWithdrawn(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.credit = event.address.toHexString();
  entity.issuanceId = event.params.issuanceId;
  entity.withdrawer = event.params.withdrawer.toHexString();
  entity.recipient = event.params.recipient.toHexString();
  entity.creditsRelinquished = event.params.creditsRelinquished;
  entity.liquidityWithdrawn = event.params.liquidityWithdrawn;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;
  entity.save();

  // Update Raw Issuance
  let rawIssuance = RawIssuance.load(
    generateRawIssuanceId(event.address, event.params.issuanceId)
  );
  if (rawIssuance) {
    rawIssuance.quantityDemanded = rawIssuance.quantityDemanded.minus(
      event.params.creditsRelinquished
    );
    rawIssuance.liquidity = rawIssuance.liquidity.minus(
      event.params.liquidityWithdrawn
    );
    rawIssuance.updatedTransactionHash = event.transaction.hash.toHexString();
    rawIssuance.updatedAt = event.block.timestamp.toI32();

    rawIssuance.save();
  }

  // Update Raw Issuance Balance
  let rawIssuanceBalance = RawIssuanceBalance.load(
    generateRawIssuanceBalanceId(
      event.address,
      event.params.issuanceId,
      event.params.recipient
    )
  );
  if (rawIssuanceBalance) {
    rawIssuanceBalance.creditAmount = rawIssuanceBalance.creditAmount.minus(
      event.params.creditsRelinquished
    );
    rawIssuanceBalance.liquidityAmount =
      rawIssuanceBalance.liquidityAmount.minus(event.params.liquidityWithdrawn);
    rawIssuanceBalance.updatedTransactionHash =
      event.transaction.hash.toHexString();
    rawIssuanceBalance.updatedAt = event.block.timestamp.toI32();

    rawIssuanceBalance.save();
  }
}

export function handleCreditsRedeemed(event: CreditsRedeemedEvent): void {
  let entity = new CreditsRedeemed(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.credit = event.address.toHexString();
  entity.redeemer = event.params.redeemer.toHexString();
  entity.redemptionId = event.params.redemptionId;
  entity.amountRedeemed = event.params.amountRedeemed;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;
  entity.save();

  // Create Raw Global Activity
  let rawGlobalActivity = new RawGlobalActivity(
    generateRawGlobalActivityId(
      event.transaction.hash,
      event.logIndex,
      "credit",
      "redeem",
      BigInt.fromI32(0)
    )
  );

  rawGlobalActivity.chainId = CHAIN_ID;
  rawGlobalActivity.category = "credit";
  rawGlobalActivity.subCategory = "redeem";
  rawGlobalActivity.sourceRefId = generateTokenId(event.address);
  rawGlobalActivity.contractAddress = event.address.toHexString();
  rawGlobalActivity.accountAddress = event.params.redeemer.toHexString();
  rawGlobalActivity.tokenIndex = BigInt.fromI32(0);
  rawGlobalActivity.tokenId = generateTokenId(event.address);
  rawGlobalActivity.tokenAddress = event.address.toHexString();
  rawGlobalActivity.tokenAmount = event.params.amountRedeemed;
  rawGlobalActivity.blockNumber = event.block.number;
  rawGlobalActivity.blockTimestamp = event.block.timestamp;
  rawGlobalActivity.transactionHash = event.transaction.hash.toHexString();
  rawGlobalActivity.logIndex = event.logIndex;

  rawGlobalActivity.save();
}

export function handleTransfer(event: TransferEvent): void {
  let entity = new Transfer(generateId(event.transaction.hash, event.logIndex));
  entity.chainId = CHAIN_ID;
  entity.credit = event.address.toHexString();
  entity.from = event.params.from.toHexString();
  entity.to = event.params.to.toHexString();
  entity.amount = event.params.value;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;
  entity.save();

  // Get Raw Credit
  const rawCreditRefId = generateTokenId(event.address);
  let rawCredit = RawCredit.load(rawCreditRefId);

  // Return if raw credit does not exist
  if (!rawCredit) return;

  // Check if from or to is zero address
  let fromAddress = event.params.from.toHexString();
  let toAddress = event.params.to.toHexString();

  // Return if from and to are the same address
  if (fromAddress == toAddress) return;

  // Update Raw Credit
  if (fromAddress == NULL_ADDRESS) {
    // Mint
    rawCredit.totalSupply = rawCredit.totalSupply.plus(event.params.value);
    rawCredit.updatedTransactionHash = event.transaction.hash.toHexString();
    rawCredit.updatedAt = event.block.timestamp.toI32();
    rawCredit.save();
  } else if (toAddress == NULL_ADDRESS) {
    // Burn
    rawCredit.totalSupply = rawCredit.totalSupply.minus(event.params.value);
    rawCredit.updatedTransactionHash = event.transaction.hash.toHexString();
    rawCredit.updatedAt = event.block.timestamp.toI32();
    rawCredit.save();
  }

  // Create/Update Raw Credit Balance for from address
  if (fromAddress !== NULL_ADDRESS) {
    const fromRawCreditBalanceId = generateRawCreditBalanceId(
      event.address,
      event.params.to
    );
    let fromRawCreditBalance = RawCreditBalance.load(fromRawCreditBalanceId);

    if (!fromRawCreditBalance) {
      fromRawCreditBalance = new RawCreditBalance(fromRawCreditBalanceId);
      fromRawCreditBalance.rawCreditRefId = rawCreditRefId;
      fromRawCreditBalance.chainId = CHAIN_ID;
      fromRawCreditBalance.contractAddress = event.address.toHexString();
      fromRawCreditBalance.accountAddress = event.params.to.toHexString();
      fromRawCreditBalance.amount = BigInt.zero();
      fromRawCreditBalance.createdTransactionHash =
        event.transaction.hash.toHexString();
      fromRawCreditBalance.createdAt = event.block.timestamp.toI32();
    }

    fromRawCreditBalance.amount = fromRawCreditBalance.amount.minus(
      event.params.value
    );
    fromRawCreditBalance.updatedTransactionHash =
      event.transaction.hash.toHexString();
    fromRawCreditBalance.updatedAt = event.block.timestamp.toI32();
    fromRawCreditBalance.save();

    // Create Raw Global Activity
    let activitySubCategory = "transfer-out";
    if (toAddress == NULL_ADDRESS) {
      activitySubCategory = "burn";
    }

    let rawGlobalActivity = new RawGlobalActivity(
      generateRawGlobalActivityId(
        event.transaction.hash,
        event.logIndex,
        "credit",
        activitySubCategory,
        BigInt.fromI32(0)
      )
    );

    rawGlobalActivity.chainId = CHAIN_ID;
    rawGlobalActivity.category = "credit";
    rawGlobalActivity.subCategory = activitySubCategory;
    rawGlobalActivity.sourceRefId = generateTokenId(event.address);
    rawGlobalActivity.contractAddress = event.address.toHexString();
    rawGlobalActivity.accountAddress = event.params.to.toHexString();
    rawGlobalActivity.tokenIndex = BigInt.fromI32(0);
    rawGlobalActivity.tokenId = generateTokenId(event.address);
    rawGlobalActivity.tokenAddress = event.address.toHexString();
    rawGlobalActivity.tokenAmount = event.params.value;
    rawGlobalActivity.blockNumber = event.block.number;
    rawGlobalActivity.blockTimestamp = event.block.timestamp;
    rawGlobalActivity.transactionHash = event.transaction.hash.toHexString();
    rawGlobalActivity.logIndex = event.logIndex;

    rawGlobalActivity.save();
  }

  // Create/Update Raw Credit Balance for to address
  if (toAddress !== NULL_ADDRESS) {
    const toRawCreditBalanceId = generateRawCreditBalanceId(
      event.address,
      event.params.to
    );
    let toRawCreditBalance = RawCreditBalance.load(toRawCreditBalanceId);

    if (!toRawCreditBalance) {
      toRawCreditBalance = new RawCreditBalance(toRawCreditBalanceId);
      toRawCreditBalance.rawCreditRefId = rawCreditRefId;
      toRawCreditBalance.chainId = CHAIN_ID;
      toRawCreditBalance.contractAddress = event.address.toHexString();
      toRawCreditBalance.accountAddress = event.params.to.toHexString();
      toRawCreditBalance.amount = BigInt.zero();
      toRawCreditBalance.createdTransactionHash =
        event.transaction.hash.toHexString();
      toRawCreditBalance.createdAt = event.block.timestamp.toI32();
    }

    toRawCreditBalance.amount = toRawCreditBalance.amount.plus(
      event.params.value
    );
    toRawCreditBalance.updatedTransactionHash =
      event.transaction.hash.toHexString();
    toRawCreditBalance.updatedAt = event.block.timestamp.toI32();
    toRawCreditBalance.save();

    // Create Raw Global Activity
    let activitySubCategory = "transfer-in";
    if (fromAddress == NULL_ADDRESS) {
      activitySubCategory = "mint";
    }

    let rawGlobalActivity = new RawGlobalActivity(
      generateRawGlobalActivityId(
        event.transaction.hash,
        event.logIndex,
        "credit",
        activitySubCategory,
        BigInt.fromI32(0)
      )
    );

    rawGlobalActivity.chainId = CHAIN_ID;
    rawGlobalActivity.category = "credit";
    rawGlobalActivity.subCategory = activitySubCategory;
    rawGlobalActivity.sourceRefId = generateTokenId(event.address);
    rawGlobalActivity.contractAddress = event.address.toHexString();
    rawGlobalActivity.accountAddress = event.params.to.toHexString();
    rawGlobalActivity.tokenIndex = BigInt.fromI32(0);
    rawGlobalActivity.tokenId = generateTokenId(event.address);
    rawGlobalActivity.tokenAddress = event.address.toHexString();
    rawGlobalActivity.tokenAmount = event.params.value;
    rawGlobalActivity.blockNumber = event.block.number;
    rawGlobalActivity.blockTimestamp = event.block.timestamp;
    rawGlobalActivity.transactionHash = event.transaction.hash.toHexString();
    rawGlobalActivity.logIndex = event.logIndex;

    rawGlobalActivity.save();
  }
}
