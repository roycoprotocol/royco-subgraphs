import { Address, BigInt } from "@graphprotocol/graph-ts";
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
  VaultTokenHoldings,
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
import {
  generateBoringVaultId,
  generateId,
  generateTokenId,
  generateVaultTokenId,
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

  const sourceRefId = generateBoringVaultId(event.address);

  const tokenId = generateTokenId(event.params.asset);

  //save the vault token if it doesn't exist
  let vaultTokenHoldings = VaultTokenHoldings.load(
    generateVaultTokenId(event.address, event.params.from)
  );
  if (!vaultTokenHoldings) {
    vaultTokenHoldings = new VaultTokenHoldings(
      generateVaultTokenId(event.address, event.params.from)
    );
    vaultTokenHoldings.chainId = CHAIN_ID;
    vaultTokenHoldings.vaultAddress = event.address.toHexString();
    vaultTokenHoldings.tokenAddress = event.params.asset.toHexString();
    vaultTokenHoldings.accountAddress = event.params.from.toHexString();
    vaultTokenHoldings.balance = event.params.amount;
    vaultTokenHoldings.shares = event.params.shares;
    vaultTokenHoldings.save();
  }

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

  //save the vault token if it doesn't exist
  let vaultTokenHoldings = VaultTokenHoldings.load(
    generateVaultTokenId(event.address, event.params.from)
  );
  if (vaultTokenHoldings) {
    vaultTokenHoldings.balance = vaultTokenHoldings.balance.minus(
      event.params.amount
    );
    vaultTokenHoldings.shares = vaultTokenHoldings.shares.minus(
      event.params.shares
    );
    vaultTokenHoldings.save();
  }

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

  handleRawPosition(event);

  const sourceRefId = generateBoringVaultId(event.address);

  //get the token from the vault
  let vaultTokenHoldings = VaultTokenHoldings.load(
    generateVaultTokenId(event.address, event.params.from)
  );

  if (!vaultTokenHoldings) {
    return;
  }

  const tokenId = generateTokenId(
    Address.fromString(vaultTokenHoldings.tokenAddress)
  );

  //if not burn or mint
  //if from or to is null, it means the token is a enter or exit event
  if (
    event.params.to.toHexString() !== NULL_ADDRESS &&
    event.params.from.toHexString() !== NULL_ADDRESS &&
    event.params.from.toHexString() !== event.params.to.toHexString()
  ) {
    // Check if shares is zero to prevent division by zero
    if (vaultTokenHoldings.shares.equals(BigInt.fromI32(0))) {
      return;
    }

    const percentage = event.params.amount.div(vaultTokenHoldings.shares);
    const holdingsTransferred = vaultTokenHoldings.balance.times(percentage);
    const sharesTransferred = vaultTokenHoldings.shares.times(percentage);
    //update the vault token holdings to subtract by the percentage of shares transferred, then add that amount to the new vault token holdings
    vaultTokenHoldings.balance =
      vaultTokenHoldings.balance.minus(holdingsTransferred);
    vaultTokenHoldings.shares =
      vaultTokenHoldings.shares.minus(sharesTransferred);
    vaultTokenHoldings.save();

    let newVaultAccountHoldings = VaultTokenHoldings.load(
      generateVaultTokenId(event.address, event.params.to)
    );

    if (!newVaultAccountHoldings) {
      newVaultAccountHoldings = new VaultTokenHoldings(
        generateVaultTokenId(event.address, event.params.to)
      );
      newVaultAccountHoldings.chainId = CHAIN_ID;
      newVaultAccountHoldings.vaultAddress = event.address.toHexString();
      newVaultAccountHoldings.tokenAddress = vaultTokenHoldings.tokenAddress;
      newVaultAccountHoldings.accountAddress = event.params.to.toHexString();
      newVaultAccountHoldings.balance = holdingsTransferred;
      newVaultAccountHoldings.shares = sharesTransferred;
      newVaultAccountHoldings.save();
    } else {
      newVaultAccountHoldings.balance =
        newVaultAccountHoldings.balance.plus(holdingsTransferred);
      newVaultAccountHoldings.shares =
        newVaultAccountHoldings.shares.plus(sharesTransferred);
      newVaultAccountHoldings.save();
    }

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
  }
}
