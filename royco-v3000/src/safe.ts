import { BigInt, store } from "@graphprotocol/graph-ts";
import {
  SafeSetup as SafeSetupEvent,
  ExecutionSuccess as ExecutionSuccessEvent,
  ExecutionFailure as ExecutionFailureEvent,
  AddedOwner as AddedOwnerEvent,
  RemovedOwner as RemovedOwnerEvent,
  ChangedThreshold as ChangedThresholdEvent,
} from "../generated/templates/SafeTemplate/ISafe";
import {
  SafeSetup,
  ExecutionSuccess,
  ExecutionFailure,
  RawSafe,
  RawSafeMap,
} from "../generated/schema";
import { CHAIN_ID, NULL_ADDRESS } from "./constants";
import {
  generateEventId,
  generateRawSafeId,
  generateRawSafeMapId,
} from "./utils/id-generator";
import { trackNativeETHTransfer } from "./erc20";

export function handleSafeSetup(event: SafeSetupEvent): void {
  let entity = new SafeSetup(
    generateEventId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.initiator = event.params.initiator.toHexString().toLowerCase();
  entity.owners = event.params.owners.map<string>((owner) =>
    owner.toHexString().toLowerCase()
  );
  entity.threshold = event.params.threshold;
  entity.initializer = event.params.initializer.toHexString().toLowerCase();
  entity.fallbackHandler = event.params.fallbackHandler
    .toHexString()
    .toLowerCase();
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString().toLowerCase();
  entity.logIndex = event.logIndex;

  entity.save();

  // Track incoming ETH if transaction has value
  if (event.transaction.value.gt(BigInt.fromI32(0))) {
    trackNativeETHTransfer(
      event.address.toHexString().toLowerCase(),
      event.transaction.value,
      true, // incoming
      event.block.number,
      event.block.timestamp,
      event.transaction.hash.toHexString().toLowerCase(),
      event.logIndex
    );
  }

  let safeId = generateRawSafeId(event.address.toHexString());
  let rawSafe = RawSafe.load(safeId);
  if (rawSafe) {
    rawSafe.owners = event.params.owners.map<string>((owner) =>
      owner.toHexString().toLowerCase()
    );
    rawSafe.threshold = event.params.threshold;
    rawSafe.updatedBlockNumber = event.block.number;
    rawSafe.updatedBlockTimestamp = event.block.timestamp;
    rawSafe.updatedTransactionHash = event.transaction.hash
      .toHexString()
      .toLowerCase();
    rawSafe.updatedLogIndex = event.logIndex;
    rawSafe.save();

    for (let i = 0; i < event.params.owners.length; i++) {
      let ownerAddress = event.params.owners[i].toHexString().toLowerCase();
      let mapId = generateRawSafeMapId(
        event.address.toHexString().toLowerCase(),
        ownerAddress
      );
      let rawSafeMap = new RawSafeMap(mapId);
      rawSafeMap.rawSafeRefId = safeId;
      rawSafeMap.chainId = CHAIN_ID;
      rawSafeMap.safeAddress = event.address.toHexString().toLowerCase();
      rawSafeMap.accountAddress = ownerAddress;
      rawSafeMap.createdBlockNumber = event.block.number;
      rawSafeMap.createdBlockTimestamp = event.block.timestamp;
      rawSafeMap.createdTransactionHash = event.transaction.hash
        .toHexString()
        .toLowerCase();
      rawSafeMap.createdLogIndex = event.logIndex;
      rawSafeMap.updatedBlockNumber = event.block.number;
      rawSafeMap.updatedBlockTimestamp = event.block.timestamp;
      rawSafeMap.updatedTransactionHash = event.transaction.hash
        .toHexString()
        .toLowerCase();
      rawSafeMap.updatedLogIndex = event.logIndex;
      rawSafeMap.save();
    }
  }
}

export function handleExecutionSuccess(event: ExecutionSuccessEvent): void {
  let entity = new ExecutionSuccess(
    generateEventId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.safeAddress = event.address.toHexString().toLowerCase();
  entity.txHash = event.params.txHash;
  entity.payment = event.params.payment;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString().toLowerCase();
  entity.logIndex = event.logIndex;

  entity.save();

  // Track native ETH transfer if transaction has value
  if (event.transaction.value.gt(BigInt.fromI32(0))) {
    trackNativeETHTransfer(
      event.address.toHexString().toLowerCase(),
      event.transaction.value,
      true, // incoming ETH to Safe
      event.block.number,
      event.block.timestamp,
      event.transaction.hash.toHexString().toLowerCase(),
      event.logIndex
    );
  }
}

export function handleExecutionFailure(event: ExecutionFailureEvent): void {
  let entity = new ExecutionFailure(
    generateEventId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.safeAddress = event.address.toHexString().toLowerCase();
  entity.txHash = event.params.txHash;
  entity.payment = event.params.payment;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString().toLowerCase();
  entity.logIndex = event.logIndex;

  entity.save();

  // Track native ETH transfer if transaction has value
  if (event.transaction.value.gt(BigInt.fromI32(0))) {
    trackNativeETHTransfer(
      event.address.toHexString().toLowerCase(),
      event.transaction.value,
      true, // incoming ETH to Safe
      event.block.number,
      event.block.timestamp,
      event.transaction.hash.toHexString().toLowerCase(),
      event.logIndex
    );
  }
}

export function handleAddedOwner(event: AddedOwnerEvent): void {
  let safeId = generateRawSafeId(event.address.toHexString());
  let rawSafe = RawSafe.load(safeId);
  if (rawSafe) {
    let owners = rawSafe.owners;
    owners.push(event.params.owner.toHexString().toLowerCase());
    rawSafe.owners = owners;
    rawSafe.updatedBlockNumber = event.block.number;
    rawSafe.updatedBlockTimestamp = event.block.timestamp;
    rawSafe.updatedTransactionHash = event.transaction.hash
      .toHexString()
      .toLowerCase();
    rawSafe.updatedLogIndex = event.logIndex;
    rawSafe.save();

    let ownerAddress = event.params.owner.toHexString().toLowerCase();
    let mapId = generateRawSafeMapId(
      event.address.toHexString().toLowerCase(),
      ownerAddress
    );
    //check if the mapId already exists
    let rawSafeMap = RawSafeMap.load(mapId);
    if (rawSafeMap) {
      rawSafeMap.updatedBlockNumber = event.block.number;
      rawSafeMap.updatedBlockTimestamp = event.block.timestamp;
      rawSafeMap.updatedTransactionHash = event.transaction.hash
        .toHexString()
        .toLowerCase();
      rawSafeMap.updatedLogIndex = event.logIndex;
      rawSafeMap.safeAddress = event.address.toHexString().toLowerCase();
      rawSafeMap.accountAddress = ownerAddress;
      rawSafeMap.chainId = CHAIN_ID;
      rawSafeMap.save();
    } else {
      // Create new RawSafeMap entry for the added owner
      let rawSafeMap = new RawSafeMap(mapId);
      rawSafeMap.rawSafeRefId = safeId;
      rawSafeMap.chainId = CHAIN_ID;
      rawSafeMap.safeAddress = event.address.toHexString().toLowerCase();
      rawSafeMap.accountAddress = ownerAddress;
      rawSafeMap.createdBlockNumber = event.block.number;
      rawSafeMap.createdBlockTimestamp = event.block.timestamp;
      rawSafeMap.createdTransactionHash = event.transaction.hash
        .toHexString()
        .toLowerCase();
      rawSafeMap.createdLogIndex = event.logIndex;
      rawSafeMap.updatedBlockNumber = event.block.number;
      rawSafeMap.updatedBlockTimestamp = event.block.timestamp;
      rawSafeMap.updatedTransactionHash = event.transaction.hash
        .toHexString()
        .toLowerCase();
      rawSafeMap.updatedLogIndex = event.logIndex;
      rawSafeMap.save();
    }
  }
}

export function handleRemovedOwner(event: RemovedOwnerEvent): void {
  let safeId = generateRawSafeId(event.address.toHexString());
  let rawSafe = RawSafe.load(safeId);
  if (rawSafe) {
    // Remove owner from the owners array
    let owners = rawSafe.owners;
    let removedOwner = event.params.owner.toHexString().toLowerCase();
    let newOwners: string[] = [];
    for (let i = 0; i < owners.length; i++) {
      if (owners[i] != removedOwner) {
        newOwners.push(owners[i]);
      }
    }
    rawSafe.owners = newOwners;
    rawSafe.updatedBlockNumber = event.block.number;
    rawSafe.updatedBlockTimestamp = event.block.timestamp;
    rawSafe.updatedTransactionHash = event.transaction.hash
      .toHexString()
      .toLowerCase();
    rawSafe.updatedLogIndex = event.logIndex;
    rawSafe.save();

    let mapId = generateRawSafeMapId(
      event.address.toHexString().toLowerCase(),
      removedOwner
    );
    let rawSafeMap = RawSafeMap.load(mapId);
    if (rawSafeMap) {
      rawSafeMap.updatedBlockNumber = event.block.number;
      rawSafeMap.updatedBlockTimestamp = event.block.timestamp;
      rawSafeMap.updatedTransactionHash = event.transaction.hash
        .toHexString()
        .toLowerCase();
      rawSafeMap.updatedLogIndex = event.logIndex;
      rawSafeMap.safeAddress = NULL_ADDRESS;
      rawSafeMap.save();
    }
  }
}

export function handleChangedThreshold(event: ChangedThresholdEvent): void {
  let safeId = generateRawSafeId(event.address.toHexString());
  let rawSafe = RawSafe.load(safeId);
  if (rawSafe) {
    rawSafe.threshold = event.params.threshold;
    rawSafe.updatedBlockNumber = event.block.number;
    rawSafe.updatedBlockTimestamp = event.block.timestamp;
    rawSafe.updatedTransactionHash = event.transaction.hash
      .toHexString()
      .toLowerCase();
    rawSafe.updatedLogIndex = event.logIndex;
    rawSafe.save();
  }
}
