import {
  OwnershipTransferred as OwnershipTransferredEvent,
  Award as AwardEvent,
  AllowedVaultAdded as AllowedVaultAddedEvent,
  AllowedIPAdded as AllowedIPAddedEvent,
} from "../generated/templates/PointsProgramTemplate/Points";
import {
  OwnershipTransferred,
  Award,
  AllowedVaultAdded,
  AllowedIPAdded,
} from "../generated/schema";
import { CHAIN_ID } from "./constants";
import { generateId } from "./utils";
import { createPointProgram } from "./creation-handler";
import {
  createRawAward,
  updateRawAuthorizedPointIssuer,
  updateRawPointBalance,
  updateRawPointTotalSupply,
} from "./point-handler";

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    generateId(event.transaction.hash, event.logIndex)
  );

  entity.chainId = CHAIN_ID;
  entity.previousOwner = event.params.previousOwner.toHexString();
  entity.newOwner = event.params.newOwner.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  createPointProgram(event);
}

export function handleAward(event: AwardEvent): void {
  let entity = new Award(generateId(event.transaction.hash, event.logIndex));

  entity.chainId = CHAIN_ID;
  entity.to = event.params.to.toHexString();
  entity.amount = event.params.amount;
  entity.awardedBy = event.params.awardedBy.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  createRawAward(event);
  updateRawPointTotalSupply(event);
  updateRawPointBalance(event);
}

export function handleAllowedVaultAdded(event: AllowedVaultAddedEvent): void {
  let entity = new AllowedVaultAdded(
    generateId(event.transaction.hash, event.logIndex)
  );

  entity.chainId = CHAIN_ID;
  entity.vault = event.params.vault.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  updateRawAuthorizedPointIssuer(event.address, event.params.vault);
}

export function handleAllowedIPAdded(event: AllowedIPAddedEvent): void {
  let entity = new AllowedIPAdded(
    generateId(event.transaction.hash, event.logIndex)
  );

  entity.chainId = CHAIN_ID;
  entity.ip = event.params.ip.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  updateRawAuthorizedPointIssuer(event.address, event.params.ip);
}
