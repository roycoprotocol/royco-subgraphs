import { CreditIssuerRegistered as CreditIssuerRegisteredEvent } from "../generated/CreditFactory/CreditFactory";
import { CreditIssuerRegistered, RawCredit } from "../generated/schema";
import { CHAIN_ID, DECIMALS } from "./constants";
import { CreditTemplate } from "../generated/templates";
import { generateId, generateTokenId } from "./utils";
import { BigInt, Bytes } from "@graphprotocol/graph-ts";

export function handleCreditIssuerRegistered(
  event: CreditIssuerRegisteredEvent
): void {
  // Log the factory event
  let entity = new CreditIssuerRegistered(
    generateId(event.transaction.hash, event.logIndex)
  );

  entity.chainId = CHAIN_ID;
  entity.name = Bytes.fromUTF8(event.params.name);
  entity.symbol = Bytes.fromUTF8(event.params.symbol);
  entity.issuer = event.params.issuer.toHexString();
  entity.credit = event.params.credit.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  // Create new raw credit
  let rawCredit = new RawCredit(generateTokenId(event.params.credit));

  rawCredit.chainId = CHAIN_ID;
  rawCredit.contractAddress = event.params.credit.toHexString();
  rawCredit.issuer = event.params.issuer.toHexString();
  rawCredit.name = event.params.name.toString();
  rawCredit.symbol = event.params.symbol.toString();
  rawCredit.decimals = DECIMALS;
  rawCredit.totalSupply = BigInt.zero();
  rawCredit.createdTransactionHash = event.transaction.hash.toHexString();
  rawCredit.updatedTransactionHash = event.transaction.hash.toHexString();
  rawCredit.createdAt = event.block.timestamp.toI32();
  rawCredit.updatedAt = event.block.timestamp.toI32();

  rawCredit.save();

  // Start indexing the Credit contract
  let childContractAddress = event.params.credit;
  CreditTemplate.create(childContractAddress);
}
