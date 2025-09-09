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
  RawTransfer,
  RawIssuanceBalance,
  RawIssuance,
  CreditsClaimed,
  RawGlobalActivity,
} from "../generated/schema";
import { CHAIN_ID } from "./constants";
import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  generateId,
  generateTokenId,
  generateRawCreditBalanceId,
  generateRawIssuanceId,
  generateRawIssuanceBalanceId,
  generateRawGlobalActivityId,
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

  //add to Raw issuance
  let rawIssuanceId = generateRawIssuanceId(
    event.address,
    event.params.issuanceId
  );
  let rawIssuance = RawIssuance.load(rawIssuanceId);
  if (!rawIssuance) {
    rawIssuance = new RawIssuance(rawIssuanceId);
    rawIssuance.rawCreditRefId = generateTokenId(event.address);
    rawIssuance.chainId = CHAIN_ID;
    rawIssuance.contractAddress = event.address.toHexString();
    rawIssuance.issuanceId = event.params.issuanceId.toHexString();
  }
  rawIssuance.isCancelled = false;
  rawIssuance.isCompleted = false;
  rawIssuance.quantitySupplied = BigInt.zero();
  rawIssuance.quantityDemanded = BigInt.zero();
  rawIssuance.pricePerCreditWAD = BigInt.zero();
  rawIssuance.assetDemanded = event.params.assetDemanded.toHexString();
  rawIssuance.issuerClaimedLiquidity = false;
  rawIssuance.purchases = [];
  rawIssuance.save();
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

  //get raw issuance balance
  let rawIssuanceBalanceId = generateRawIssuanceBalanceId(
    event.address,
    event.params.issuanceId,
    event.params.recipient
  );
  let rawIssuanceBalance = RawIssuanceBalance.load(rawIssuanceBalanceId);
  if (rawIssuanceBalance) {
    if (rawIssuanceBalance.amount.lt(event.params.amountClaimed)) {
      //make zero
      rawIssuanceBalance.amount = BigInt.zero();
    } else {
      rawIssuanceBalance.amount = rawIssuanceBalance.amount.minus(
        event.params.amountClaimed
      );
    }
    rawIssuanceBalance.save();
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

  let rawIssuanceId = generateRawIssuanceId(
    event.address,
    event.params.issuanceId
  );

  let rawIssuanceBalanceId = generateRawIssuanceBalanceId(
    event.address,
    event.params.issuanceId,
    event.params.recipient
  );
  let rawIssuanceBalance = RawIssuanceBalance.load(rawIssuanceBalanceId);
  if (!rawIssuanceBalance) {
    rawIssuanceBalance = new RawIssuanceBalance(rawIssuanceBalanceId);
    rawIssuanceBalance.rawIssuanceRefId = generateRawIssuanceId(
      event.address,
      event.params.issuanceId
    );
    rawIssuanceBalance.chainId = CHAIN_ID;
    rawIssuanceBalance.contractAddress = event.address.toHexString();
    rawIssuanceBalance.accountAddress = event.params.recipient.toHexString();
    rawIssuanceBalance.amount = event.params.creditsPurchased;
  } else {
    rawIssuanceBalance.amount = rawIssuanceBalance.amount.plus(
      event.params.creditsPurchased
    );
  }
  rawIssuanceBalance.save();

  let rawIssuance = RawIssuance.load(rawIssuanceId);

  if (rawIssuance) {
    rawIssuance.quantityDemanded = rawIssuance.quantityDemanded.plus(
      event.params.creditsPurchased
    );
    if (rawIssuance.quantityDemanded.equals(rawIssuance.quantitySupplied)) {
      rawIssuance.isCompleted = true;
    }
    rawIssuance.save();
  }
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

  let rawIssuance = RawIssuance.load(
    generateRawIssuanceId(event.address, event.params.issuanceId)
  );
  if (rawIssuance) {
    rawIssuance.isCancelled = true;
    rawIssuance.save();
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

  //look up balance of recipient
  let rawIssuanceBalanceId = generateRawIssuanceBalanceId(
    event.address,
    event.params.issuanceId,
    event.params.recipient
  );
  let rawIssuanceBalance = RawIssuanceBalance.load(rawIssuanceBalanceId);
  //balance should not be negative

  if (rawIssuanceBalance) {
    if (rawIssuanceBalance.amount.lt(event.params.creditsRelinquished)) {
      //make zero
      rawIssuanceBalance.amount = BigInt.zero();
    } else {
      rawIssuanceBalance.amount = rawIssuanceBalance.amount.minus(
        event.params.creditsRelinquished
      );
    }
    rawIssuanceBalance.save();
  }

  //decrease quantity demanded
  let rawIssuance = RawIssuance.load(
    generateRawIssuanceId(event.address, event.params.issuanceId)
  );
  if (rawIssuance) {
    rawIssuance.quantityDemanded = rawIssuance.quantityDemanded.minus(
      event.params.creditsRelinquished
    );
    rawIssuance.save();
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

  //make activity

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
  rawGlobalActivity.sourceRefId = event.params.redemptionId.toString();
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
  let t = new Transfer(generateId(event.transaction.hash, event.logIndex));
  t.chainId = CHAIN_ID;
  t.credit = event.address.toHexString();
  t.from = event.params.from.toHexString();
  t.to = event.params.to.toHexString();
  t.amount = event.params.amount;
  t.blockNumber = event.block.number;
  t.blockTimestamp = event.block.timestamp;
  t.transactionHash = event.transaction.hash.toHexString();
  t.logIndex = event.logIndex;
  t.save();

  let rawTransfer = new RawTransfer(
    generateId(event.transaction.hash, event.logIndex)
  );
  const rawCreditRefId = generateTokenId(event.address);
  rawTransfer.rawCreditRefId = rawCreditRefId;
  rawTransfer.chainId = CHAIN_ID;
  rawTransfer.contractAddress = event.address.toHexString();
  rawTransfer.from = event.params.from.toHexString();
  rawTransfer.to = event.params.to.toHexString();
  rawTransfer.amount = event.params.amount;
  rawTransfer.blockNumber = event.block.number;
  rawTransfer.blockTimestamp = event.block.timestamp;
  rawTransfer.transactionHash = event.transaction.hash.toHexString();
  rawTransfer.logIndex = event.logIndex;
  rawTransfer.save();

  const fromIsZero = event.params.from.equals(Address.zero());
  const toIsZero = event.params.to.equals(Address.zero());

  let rawCredit = RawCredit.load(rawCreditRefId);
  if (rawCredit) {
    // Mint
    if (fromIsZero) {
      rawCredit.totalSupply = rawCredit.totalSupply.plus(event.params.amount);
    }
    // Burn
    if (toIsZero) {
      rawCredit.totalSupply = rawCredit.totalSupply.minus(event.params.amount);
    }
    rawCredit.save();
  }

  if (!fromIsZero) {
    const fromBalId = generateRawCreditBalanceId(
      event.address,
      event.params.from
    );
    let fromBal = RawCreditBalance.load(fromBalId);
    if (!fromBal) {
      fromBal = new RawCreditBalance(fromBalId);
      fromBal.rawCreditRefId = rawCreditRefId;
      fromBal.chainId = CHAIN_ID;
      fromBal.contractAddress = event.address.toHexString();
      fromBal.accountAddress = event.params.from.toHexString();
      fromBal.amount = BigInt.zero();
    }
    fromBal.amount = fromBal.amount.minus(event.params.amount);
    fromBal.save();
  }

  if (!toIsZero) {
    const toBalId = generateRawCreditBalanceId(event.address, event.params.to);
    let toBal = RawCreditBalance.load(toBalId);
    if (!toBal) {
      toBal = new RawCreditBalance(toBalId);
      toBal.rawCreditRefId = rawCreditRefId;
      toBal.chainId = CHAIN_ID;
      toBal.contractAddress = event.address.toHexString();
      toBal.accountAddress = event.params.to.toHexString();
      toBal.amount = BigInt.zero();
    }
    toBal.amount = toBal.amount.plus(event.params.amount);
    toBal.save();
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

  //set issue
  let rawIssuance = RawIssuance.load(
    generateRawIssuanceId(event.address, event.params.issuanceId)
  );
  if (rawIssuance) {
    rawIssuance.issuerClaimedLiquidity = true;
    rawIssuance.save();
  }
}
