import { BigInt } from "@graphprotocol/graph-ts";
import {
  Approval as ApprovalEvent,
  AuthorityUpdated as AuthorityUpdatedEvent,
  Enter as EnterEvent,
  EpochStarted as EpochStartedEvent,
  Exit as ExitEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  RewardsDistributed as RewardsDistributedEvent,
  Transfer as TransferEvent,
  UserDepositedIntoEpoch as UserDepositedIntoEpochEvent,
  UserRewardsClaimed as UserRewardsClaimedEvent,
  UserWithdrawnFromEpoch as UserWithdrawnFromEpochEvent,
} from "../generated/BoringVault/BoringVault";
import {
  Approval,
  AuthorityUpdated,
  Enter,
  EpochStarted,
  Exit,
  OwnershipTransferred,
  RewardsDistributed,
  Transfer,
  UserDepositedIntoEpoch,
  UserRewardsClaimed,
  UserWithdrawnFromEpoch,
} from "../generated/schema";
import { CHAIN_ID, NULL_ADDRESS } from "./constants";
import { createRawGlobalActivity } from "./global-activity-handler";
import {
  createBoringAccountUpdateDeposit,
  createBoringAccountUpdateWithdraw,
} from "./handle-boring-account-update";
import {
  claimBoringReward,
  createBoringEpoch,
  updateBoringEpochRewards,
  updateBoringEpochSharesDeposit,
  updateBoringEpochSharesWithdraw,
} from "./handle-boring-epoch";
import { generateBoringVaultId, generateId, generateTokenId } from "./utils";

export function handleEpochStarted(event: EpochStartedEvent): void {
  let entity = new EpochStarted(
    generateId(event.address, event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.vaultAddress = event.address.toHexString();
  entity.epoch = event.params.epoch;
  entity.eligibleShares = event.params.eligibleShares;
  entity.startTimestamp = event.params.startTimestamp;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  createBoringEpoch(
    event.address, // Vault address
    event // Event
  );
}

export function handleUserDepositedIntoEpoch(
  event: UserDepositedIntoEpochEvent
): void {
  let entity = new UserDepositedIntoEpoch(
    generateId(event.address, event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.vaultAddress = event.address.toHexString();
  entity.user = event.params.user.toHexString();
  entity.epoch = event.params.epoch;
  entity.shareAmount = event.params.shareAmount;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  createBoringAccountUpdateDeposit(event);

  updateBoringEpochSharesDeposit(event);
}

export function handleUserWithdrawnFromEpoch(
  event: UserWithdrawnFromEpochEvent
): void {
  let entity = new UserWithdrawnFromEpoch(
    generateId(event.address, event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.vaultAddress = event.address.toHexString();
  entity.user = event.params.user.toHexString();
  entity.epoch = event.params.epoch;
  entity.shareAmount = event.params.shareAmount;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  createBoringAccountUpdateWithdraw(event);

  updateBoringEpochSharesWithdraw(event);
}

export function handleRewardsDistributed(event: RewardsDistributedEvent): void {
  let entity = new RewardsDistributed(
    generateId(event.address, event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.vaultAddress = event.address.toHexString();
  entity.token = event.params.token.toHexString();
  entity.startEpoch = event.params.startEpoch;
  entity.endEpoch = event.params.endEpoch;
  entity.amount = event.params.amount;
  entity.rewardId = event.params.rewardId;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  updateBoringEpochRewards(
    event // Event
  );
}

export function handleUserRewardsClaimed(event: UserRewardsClaimedEvent): void {
  let entity = new UserRewardsClaimed(
    generateId(event.address, event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.vaultAddress = event.address.toHexString();
  entity.user = event.params.user.toHexString();
  entity.token = event.params.token.toHexString();
  entity.rewardId = event.params.rewardId;
  entity.amount = event.params.amount;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  claimBoringReward(
    event // Event
  );

  const sourceRefId = generateBoringVaultId(event.address);

  const tokenId = generateTokenId(event.params.token);

  createRawGlobalActivity(
    "boring",
    "claim",
    sourceRefId,
    event.address.toHexString(),
    event.params.user.toHexString(),
    BigInt.fromI32(0),
    tokenId,
    event.params.amount,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash,
    event.logIndex
  );
}

export function handleApproval(event: ApprovalEvent): void {
  let entity = new Approval(
    generateId(event.address, event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.vaultAddress = event.address.toHexString();
  entity.owner = event.params.owner.toHexString();
  entity.spender = event.params.spender.toHexString();
  entity.amount = event.params.amount;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleAuthorityUpdated(event: AuthorityUpdatedEvent): void {
  let entity = new AuthorityUpdated(
    generateId(event.address, event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.vaultAddress = event.address.toHexString();
  entity.user = event.params.user.toHexString();
  entity.newAuthority = event.params.newAuthority.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleEnter(event: EnterEvent): void {
  let entity = new Enter(
    generateId(event.address, event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.vaultAddress = event.address.toHexString();
  entity.from = event.params.from.toHexString();
  entity.asset = event.params.asset.toHexString();
  entity.amount = event.params.amount;
  entity.to = event.params.to.toHexString();
  entity.shares = event.params.shares;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  //add global

  /*
export function createRawGlobalActivity(
  category: string,
  subCategory: string,
  sourceRefId: string,
  contractAddress: string,
  accountAddress: string,
  tokenIndex: BigInt,
  tokenId: string,
  tokenAmount: BigInt,
  blockNumber: BigInt,
  blockTimestamp: BigInt,
  transactionHash: Bytes,
  logIndex: BigInt
): void {
  */
  const sourceRefId = generateBoringVaultId(event.address);

  const tokenId = generateTokenId(event.params.asset);

  createRawGlobalActivity(
    "boring",
    "deposit",
    sourceRefId,
    event.address.toHexString(),
    event.params.from.toHexString(),
    BigInt.fromI32(0),
    tokenId,
    event.params.amount,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash,
    event.logIndex
  );
}

export function handleExit(event: ExitEvent): void {
  let entity = new Exit(
    generateId(event.address, event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.vaultAddress = event.address.toHexString();
  entity.to = event.params.to.toHexString();
  entity.asset = event.params.asset.toHexString();
  entity.amount = event.params.amount;
  entity.from = event.params.from.toHexString();
  entity.shares = event.params.shares;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  const sourceRefId = generateBoringVaultId(event.address);

  const tokenId = generateTokenId(event.params.asset);

  createRawGlobalActivity(
    "boring",
    "withdraw",
    sourceRefId,
    event.address.toHexString(),
    event.params.to.toHexString(),
    BigInt.fromI32(0),
    tokenId,
    event.params.amount,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash,
    event.logIndex
  );
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    generateId(event.address, event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.vaultAddress = event.address.toHexString();
  entity.user = event.params.user.toHexString();
  entity.newOwner = event.params.newOwner.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleTransfer(event: TransferEvent): void {
  let entity = new Transfer(
    generateId(event.address, event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.vaultAddress = event.address.toHexString();
  entity.from = event.params.from.toHexString();
  entity.to = event.params.to.toHexString();
  entity.amount = event.params.amount;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  const sourceRefId = generateBoringVaultId(event.address);

  const tokenId = generateTokenId(event.params.asset);

  createRawGlobalActivity(
    "boring",
    "withdraw",
    sourceRefId,
    event.address.toHexString(),
    event.params.from.toHexString(),
    BigInt.fromI32(0),
    tokenId,
    event.params.amount,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash,
    event.logIndex
  );

  if (event.params.from.toHexString() !== NULL_ADDRESS) {
    createRawGlobalActivity(
      "boring",
      "deposit",
      sourceRefId,
      event.address.toHexString(),
      event.params.to.toHexString(),
      BigInt.fromI32(0),
      tokenId,
      event.params.amount,
      event.block.number,
      event.block.timestamp,
      event.transaction.hash,
      event.logIndex
    );
  }
}
