import {
  ProtocolFeeRecipientUpdated as ProtocolFeeRecipientUpdatedEvent,
  ProtocolFeeUpdated as ProtocolFeeUpdatedEvent,
  ReferralFeeUpdated as ReferralFeeUpdatedEvent,
  WrappedVaultCreated as WrappedVaultCreatedEvent,
} from "../generated/WrappedVaultFactory/WrappedVaultFactory";
import {
  ProtocolFeeRecipientUpdated,
  ProtocolFeeUpdated,
  ReferralFeeUpdated,
  WrappedVaultCreated,
} from "../generated/schema";
import { generateId } from "./utils";
import { createRawMarket } from "./market-handler";
import { CHAIN_ID } from "./constants";
import { WrappedVault } from "../generated/templates";

export function handleWrappedVaultCreated(
  event: WrappedVaultCreatedEvent
): void {
  // Extract the address of the new child contract
  let wrappedVaultAddress = event.params.incentivizedVaultAddress;

  // Dynamically create a new data source for the child contract
  WrappedVault.create(wrappedVaultAddress);

  let entity = new WrappedVaultCreated(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.underlyingVaultAddress =
    event.params.underlyingVaultAddress.toHexString();
  entity.incentivizedVaultAddress =
    event.params.incentivizedVaultAddress.toHexString();
  entity.owner = event.params.owner.toHexString();
  entity.inputToken = event.params.inputToken.toHexString();
  entity.frontendFee = event.params.frontendFee;
  entity.name = event.params.name;
  entity.vaultSymbol = event.params.vaultSymbol;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  // Create new raw market
  createRawMarket(event);
}

export function handleProtocolFeeRecipientUpdated(
  event: ProtocolFeeRecipientUpdatedEvent
): void {
  let entity = new ProtocolFeeRecipientUpdated(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.newRecipient = event.params.newRecipient.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;
  entity.save();
}

export function handleProtocolFeeUpdated(event: ProtocolFeeUpdatedEvent): void {
  let entity = new ProtocolFeeUpdated(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.newProtocolFee = event.params.newProtocolFee;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleReferralFeeUpdated(event: ReferralFeeUpdatedEvent): void {
  let entity = new ReferralFeeUpdated(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.newReferralFee = event.params.newReferralFee;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}
