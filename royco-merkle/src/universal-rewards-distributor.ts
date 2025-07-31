import {
  Claimed as ClaimedEvent,
  OwnerSet as OwnerSetEvent,
  PendingRootRevoked as PendingRootRevokedEvent,
  PendingRootSet as PendingRootSetEvent,
  RootSet as RootSetEvent,
  RootUpdaterSet as RootUpdaterSetEvent,
  TimelockSet as TimelockSetEvent,
} from "../generated/UrdFactory/UniversalRewardsDistributor";
import {
  Claimed,
  MerkleClaim,
  OwnerSet,
  PendingRootRevoked,
  PendingRootSet,
  RootSet,
  RootUpdaterSet,
  TimelockSet,
} from "../generated/schema";
import { CHAIN_ID } from "./constants";
import { generateId, generateTokenId } from "./utils";

export function handleClaimed(event: ClaimedEvent): void {
  let entity = new Claimed(generateId(event.transaction.hash, event.logIndex));
  entity.chainId = CHAIN_ID;
  entity.account = event.params.account.toHexString();
  entity.reward = event.params.reward.toHexString();
  entity.amount = event.params.amount;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  // Create a new MerkleClaim entity

  let merkleClaimId = CHAIN_ID.toString()
    .concat("_")
    .concat(event.address.toHexString())
    .concat("_")
    .concat(event.params.account.toHexString());

  let merkleClaimEntity = MerkleClaim.load(merkleClaimId);

  if (merkleClaimEntity) {
    merkleClaimEntity.tokenAmount = merkleClaimEntity.tokenAmount.plus(
      event.params.amount
    );
  } else {
    merkleClaimEntity = new MerkleClaim(
      CHAIN_ID.toString()
        .concat("_")
        .concat(event.address.toHexString())
        .concat("_")
        .concat(event.params.account.toHexString())
    );
    merkleClaimEntity.merkleContractRefId = CHAIN_ID.toString()
      .concat("_")
      .concat(event.address.toHexString());
    merkleClaimEntity.chainId = CHAIN_ID;
    merkleClaimEntity.contractAddress = event.address.toHexString();
    merkleClaimEntity.accountAddress = event.params.account.toHexString();
    merkleClaimEntity.tokenId = generateTokenId(event.params.reward);
    merkleClaimEntity.tokenAmount = event.params.amount;

    merkleClaimEntity.blockNumber = event.block.number;
    merkleClaimEntity.blockTimestamp = event.block.timestamp;
    merkleClaimEntity.transactionHash = event.transaction.hash.toHexString();
    merkleClaimEntity.logIndex = event.logIndex;
  }

  merkleClaimEntity.save();
}

export function handleOwnerSet(event: OwnerSetEvent): void {
  let entity = new OwnerSet(generateId(event.transaction.hash, event.logIndex));
  entity.chainId = CHAIN_ID;
  entity.newOwner = event.params.newOwner.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handlePendingRootRevoked(event: PendingRootRevokedEvent): void {
  let entity = new PendingRootRevoked(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.caller = event.params.caller.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handlePendingRootSet(event: PendingRootSetEvent): void {
  let entity = new PendingRootSet(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.caller = event.params.caller.toHexString();
  entity.newRoot = event.params.newRoot.toHexString();
  entity.newIpfsHash = event.params.newIpfsHash.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleRootSet(event: RootSetEvent): void {
  let entity = new RootSet(generateId(event.transaction.hash, event.logIndex));
  entity.chainId = CHAIN_ID;
  entity.newRoot = event.params.newRoot.toHexString();
  entity.newIpfsHash = event.params.newIpfsHash.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleRootUpdaterSet(event: RootUpdaterSetEvent): void {
  let entity = new RootUpdaterSet(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.rootUpdater = event.params.rootUpdater.toHexString();
  entity.active = event.params.active;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleTimelockSet(event: TimelockSetEvent): void {
  let entity = new TimelockSet(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.newTimelock = event.params.newTimelock;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}
