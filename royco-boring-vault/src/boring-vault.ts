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
  RawGlobalActivity,
  RewardsDistributed,
  Transfer,
  UserDepositedIntoEpoch,
  UserRewardsClaimed,
  UserWithdrawnFromEpoch,
} from "../generated/schema";
import { CHAIN_ID } from "./constants";
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
import {
  generateBoringVaultId,
  generateId,
  generateRawGlobalActivityId,
  generateTokenId,
} from "./utils";
import { handleRawPosition } from "./position-handler";

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

  // === Create raw global activity ===
  let rawGlobalActivity = new RawGlobalActivity(
    generateRawGlobalActivityId(
      event.transaction.hash,
      event.logIndex,
      "boring",
      "claim",
      BigInt.fromI32(0)
    )
  );

  rawGlobalActivity.chainId = CHAIN_ID;
  rawGlobalActivity.category = "boring";
  rawGlobalActivity.subCategory = "claim";
  rawGlobalActivity.sourceRefId = generateBoringVaultId(event.address);
  rawGlobalActivity.contractAddress = event.address.toHexString();
  rawGlobalActivity.accountAddress = event.params.user.toHexString();
  rawGlobalActivity.tokenIndex = BigInt.fromI32(0);
  rawGlobalActivity.tokenId = generateTokenId(event.params.token);
  rawGlobalActivity.tokenAddress = event.params.token.toHexString();
  rawGlobalActivity.tokenAmount = event.params.amount;
  rawGlobalActivity.blockNumber = event.block.number;
  rawGlobalActivity.blockTimestamp = event.block.timestamp;
  rawGlobalActivity.transactionHash = event.transaction.hash.toHexString();
  rawGlobalActivity.logIndex = event.logIndex;

  rawGlobalActivity.save();
  // xxx Create raw global activity xxx
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

  // === Create raw global activity ===
  let rawGlobalActivity = new RawGlobalActivity(
    generateRawGlobalActivityId(
      event.transaction.hash,
      event.logIndex,
      "boring",
      "deposit",
      BigInt.fromI32(0)
    )
  );

  rawGlobalActivity.chainId = CHAIN_ID;
  rawGlobalActivity.category = "boring";
  rawGlobalActivity.subCategory = "deposit";
  rawGlobalActivity.sourceRefId = generateBoringVaultId(event.address);
  rawGlobalActivity.contractAddress = event.address.toHexString();
  rawGlobalActivity.accountAddress = event.params.from.toHexString();
  rawGlobalActivity.tokenIndex = BigInt.fromI32(0);
  rawGlobalActivity.tokenId = generateTokenId(event.params.asset);
  rawGlobalActivity.tokenAddress = event.params.asset.toHexString();
  rawGlobalActivity.tokenAmount = event.params.amount;
  rawGlobalActivity.blockNumber = event.block.number;
  rawGlobalActivity.blockTimestamp = event.block.timestamp;
  rawGlobalActivity.transactionHash = event.transaction.hash.toHexString();
  rawGlobalActivity.logIndex = event.logIndex;

  rawGlobalActivity.save();
  // xxx Create raw global activity xxx
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

  // === Create raw global activity ===
  let rawGlobalActivity = new RawGlobalActivity(
    generateRawGlobalActivityId(
      event.transaction.hash,
      event.logIndex,
      "boring",
      "withdraw",
      BigInt.fromI32(0)
    )
  );

  rawGlobalActivity.chainId = CHAIN_ID;
  rawGlobalActivity.category = "boring";
  rawGlobalActivity.subCategory = "withdraw";
  rawGlobalActivity.sourceRefId = generateBoringVaultId(event.address);
  rawGlobalActivity.contractAddress = event.address.toHexString();
  rawGlobalActivity.accountAddress = event.params.to.toHexString();
  rawGlobalActivity.tokenIndex = BigInt.fromI32(0);
  rawGlobalActivity.tokenId = generateTokenId(event.params.asset);
  rawGlobalActivity.tokenAddress = event.params.asset.toHexString();
  rawGlobalActivity.tokenAmount = event.params.amount;
  rawGlobalActivity.blockNumber = event.block.number;
  rawGlobalActivity.blockTimestamp = event.block.timestamp;
  rawGlobalActivity.transactionHash = event.transaction.hash.toHexString();
  rawGlobalActivity.logIndex = event.logIndex;

  rawGlobalActivity.save();
  // xxx Create raw global activity xxx
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

  handleRawPosition(event);
}
