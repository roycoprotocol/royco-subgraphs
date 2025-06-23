import { BigInt } from "@graphprotocol/graph-ts";
import { RoycoAccountDeployed as RoycoAccountDeployedEvent } from "../generated/RoycoAccountFactory/RoycoAccountFactory";
import { RoycoAccountDeployed, RawSafe, RawSafeMap } from "../generated/schema";
import { SafeTemplate } from "../generated/templates";
import { CHAIN_ID } from "./constants";
import { generateEventId, generateRawSafeId } from "./utils/id-generator";

export function handleRoycoAccountDeployed(
  event: RoycoAccountDeployedEvent
): void {
  let entity = new RoycoAccountDeployed(
    generateEventId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.user = event.params.user.toHexString();
  entity.accountId = event.params.accountId;
  entity.roycoAccount = event.params.roycoAccount.toHexString();
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  // Create RawSafe entity
  let safeId = generateRawSafeId(event.params.roycoAccount.toHexString());
  let rawSafe = new RawSafe(safeId);
  rawSafe.chainId = CHAIN_ID;
  rawSafe.safeAddress = event.params.roycoAccount.toHexString();
  rawSafe.owners = [];
  rawSafe.threshold = BigInt.fromI32(0); // Will be populated by SafeSetup event
  rawSafe.creatorAddress = event.params.user.toHexString();
  rawSafe.createdBlockNumber = event.block.number;
  rawSafe.createdBlockTimestamp = event.block.timestamp;
  rawSafe.createdTransactionHash = event.transaction.hash.toHexString();
  rawSafe.createdLogIndex = event.logIndex;
  rawSafe.updatedBlockNumber = event.block.number;
  rawSafe.updatedBlockTimestamp = event.block.timestamp;
  rawSafe.updatedTransactionHash = event.transaction.hash.toHexString();
  rawSafe.updatedLogIndex = event.logIndex;

  rawSafe.save();

  // Start tracking this Safe with a template
  SafeTemplate.create(event.params.roycoAccount);
}
