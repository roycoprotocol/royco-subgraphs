import { CreditIssuerRegistered as CreditIssuerRegisteredEvent } from "../generated/CreditFactory/CreditFactory";
import { CreditIssuerRegistered, RawCredit } from "../generated/schema";
import { CHAIN_ID } from "./constants";
import { CreditTemplate } from "../generated/templates";
import { generateId, generateTokenId } from "./utils";
import { Credit as CreditContract } from "../generated/templates/CreditTemplate/Credit";
import { BigInt, Bytes } from "@graphprotocol/graph-ts";

export function handleCreditIssuerRegistered(
  event: CreditIssuerRegisteredEvent
): void {
  // Start indexing the Credit contract
  CreditTemplate.create(event.params.credit);

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

  let rawId = generateTokenId(event.params.credit);

  let raw = RawCredit.load(rawId);
  if (raw == null) {
    raw = new RawCredit(rawId);
  }

  const credit = CreditContract.bind(event.params.credit);
  const totalSupplyResult = credit.try_totalSupply();

  raw.chainId = CHAIN_ID;
  raw.contractAddress = event.params.credit.toHexString();
  raw.issuer = event.params.issuer.toHexString();
  raw.name = event.params.name.toString();
  raw.symbol = event.params.symbol.toString();
  raw.decimals = BigInt.fromI32(2);

  raw.totalSupply = totalSupplyResult.reverted
    ? BigInt.zero()
    : totalSupplyResult.value;

  raw.blockNumber = event.block.number;
  raw.blockTimestamp = event.block.timestamp;
  raw.transactionHash = event.transaction.hash.toHexString();
  raw.logIndex = event.logIndex;

  raw.save();
}
