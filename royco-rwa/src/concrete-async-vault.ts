import { BigInt } from "@graphprotocol/graph-ts";
import {
  QueuedWithdrawal as QueuedWithdrawalEvent,
  RequestCancelled as RequestCancelledEvent,
  RequestMovedToNextEpoch as RequestMovedToNextEpochEvent,
  EpochClosed as EpochClosedEvent,
  EpochProcessed as EpochProcessedEvent,
  RequestClaimed as RequestClaimedEvent,
  RoleGranted as RoleGrantedEvent,
} from "../generated/Vault/AsyncVaultConcrete";
import {
  ConcreteEpoch,
  ConcreteWithdrawal,
  PositionRequestLatest,
  VaultState,
} from "../generated/schema";
import {
  CHAIN_ID,
  CATEGORY_ASSETS,
  CATEGORY_SHARES,
  SUB_CATEGORY_WITHDRAW,
  STATUS_PENDING,
  STATUS_APPROVED,
  STATUS_CLAIMABLE,
  STATUS_UPDATED,
  STATUS_CLAIMED,
  STATUS_CANCEL_CLAIMED,
  VAULT_MAJOR_TYPE,
  VAULT_MINOR_TYPE,
} from "./constants";
import { addRequestActivity } from "./handlers/activities/request";
import {
  addPositionStateHistorical,
  getPositionRequestLatest,
  getPositionState,
} from "./handlers/base/update-position";
import {
  generatePositionRequestLatestId,
  generateTokenId,
  generateVaultId,
} from "./utils";
import { processGlobalTokenTransfer } from "./handlers/base/process-transfer";
import { addTransferActivity } from "./handlers/activities/transfer";
import { BaseVault } from "../generated/Vault/BaseVault";

export { handleTransfer, handleDeposit, handleWithdraw } from "./vault";

export function handleRoleGranted(event: RoleGrantedEvent): void {
  const vaultAddress = event.address.toHexString();
  const vaultId = generateVaultId(vaultAddress);

  let vaultState = VaultState.load(vaultId);
  if (!vaultState) {
    vaultState = new VaultState(vaultId);
    vaultState.chainId = CHAIN_ID;
    vaultState.vaultAddress = vaultAddress;

    const contract = BaseVault.bind(event.address);
    const depositTokenAddress = contract.asset().toHexString();
    vaultState.depositTokenId = generateTokenId(depositTokenAddress);
    vaultState.depositTokenAddress = depositTokenAddress;

    const decimals = contract.decimals();
    vaultState.decimals = decimals;

    vaultState.majorType = VAULT_MAJOR_TYPE;
    vaultState.minorType = VAULT_MINOR_TYPE;

    vaultState.transfers = BigInt.fromI32(0);
    vaultState.totalSupply = BigInt.fromI32(0);
    vaultState.depositors = BigInt.fromI32(0);
    vaultState.blockNumber = event.block.number;
    vaultState.blockTimestamp = event.block.timestamp;
    vaultState.createdAt = event.block.timestamp;
    vaultState.updatedAt = event.block.timestamp;

    vaultState.save();
  }
}

export function getConcreteEpoch(
  vaultAddress: string,
  epochId: BigInt,
  blockTimestamp: BigInt
): ConcreteEpoch {
  let id = CHAIN_ID.toString()
    .concat("_")
    .concat(vaultAddress)
    .concat("_")
    .concat(epochId.toString());

  let concreteEpoch = ConcreteEpoch.load(id);

  if (!concreteEpoch) {
    concreteEpoch = new ConcreteEpoch(id);
    concreteEpoch.vaultId = generateVaultId(vaultAddress);
    concreteEpoch.chainId = CHAIN_ID;
    concreteEpoch.vaultAddress = vaultAddress;
    concreteEpoch.epochId = epochId;
    concreteEpoch.startIndex = BigInt.fromI32(1);
    concreteEpoch.endIndex = BigInt.fromI32(1);
    concreteEpoch.createdAt = blockTimestamp;
  }
  concreteEpoch.updatedAt = blockTimestamp;

  return concreteEpoch;
}

export function getRequestId(
  vaultAddress: string,
  epochId: BigInt,
  accountAddress: string,
  blockTimestamp: BigInt
): string {
  let concreteWithdrawalId = CHAIN_ID.toString()
    .concat("_")
    .concat(vaultAddress)
    .concat("_")
    .concat(epochId.toString())
    .concat("_")
    .concat(accountAddress);

  let concreteWithdrawal = ConcreteWithdrawal.load(concreteWithdrawalId);

  if (!concreteWithdrawal) {
    let concreteEpoch = getConcreteEpoch(vaultAddress, epochId, blockTimestamp);

    // Create new withdrawal
    concreteWithdrawal = new ConcreteWithdrawal(concreteWithdrawalId);
    concreteWithdrawal.vaultId = concreteEpoch.vaultId;
    concreteWithdrawal.chainId = concreteEpoch.chainId;
    concreteWithdrawal.vaultAddress = concreteEpoch.vaultAddress;
    concreteWithdrawal.epochId = concreteEpoch.epochId;
    concreteWithdrawal.accountAddress = accountAddress;
    concreteWithdrawal.index = concreteEpoch.endIndex;
    concreteWithdrawal.createdAt = blockTimestamp;
    concreteWithdrawal.save();

    // Increment end index
    concreteEpoch.endIndex = concreteEpoch.endIndex.plus(BigInt.fromI32(1));
    concreteEpoch.save();
  }

  return concreteWithdrawal.epochId
    .toString()
    .concat("_")
    .concat(concreteWithdrawal.index.toString());
}

export function handleQueuedWithdrawal(event: QueuedWithdrawalEvent): void {
  const vaultAddress = event.address.toHexString();
  const accountAddress = event.params.owner.toHexString();
  const value = event.params.shares;
  const positionRequestCategory = CATEGORY_SHARES;
  const positionRequestSubCategory = SUB_CATEGORY_WITHDRAW;
  const activityCategory = CATEGORY_SHARES;
  const activitySubCategory = SUB_CATEGORY_WITHDRAW;
  const requestId = getRequestId(
    vaultAddress,
    event.params.epochID,
    accountAddress,
    event.block.timestamp
  );
  const requestStatus = STATUS_PENDING;

  // Update request
  let positionRequestLatest = getPositionRequestLatest(
    vaultAddress,
    accountAddress,
    positionRequestCategory,
    positionRequestSubCategory,
    requestId,
    requestStatus,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash.toHexString(),
    event.logIndex
  );
  positionRequestLatest.value = positionRequestLatest.value.plus(value);
  positionRequestLatest.save();

  // Update state
  let positionState = getPositionState(
    vaultAddress,
    accountAddress,
    event.block.timestamp
  );
  positionState.sharesOwed = positionState.sharesOwed.plus(value);
  positionState.save();
  addPositionStateHistorical(positionState, event.block.timestamp);

  // Add activity
  addRequestActivity(
    positionRequestLatest,
    activityCategory,
    activitySubCategory,
    BigInt.fromI32(0)
  );
}

export function handleRequestCancelled(event: RequestCancelledEvent): void {
  const vaultAddress = event.address.toHexString();
  const accountAddress = event.params.owner.toHexString();
  const value = event.params.shares;
  const positionRequestCategory = CATEGORY_SHARES;
  const positionRequestSubCategory = SUB_CATEGORY_WITHDRAW;
  const activityCategory = CATEGORY_SHARES;
  const activitySubCategory = SUB_CATEGORY_WITHDRAW;
  const requestId = getRequestId(
    vaultAddress,
    event.params.epochID,
    accountAddress,
    event.block.timestamp
  );
  const requestStatus = STATUS_CANCEL_CLAIMED;

  // Update request
  let positionRequestLatest = getPositionRequestLatest(
    vaultAddress,
    accountAddress,
    positionRequestCategory,
    positionRequestSubCategory,
    requestId,
    requestStatus,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash.toHexString(),
    event.logIndex
  );
  positionRequestLatest.value = BigInt.fromI32(0);
  positionRequestLatest.save();

  // Update state
  let positionState = getPositionState(
    vaultAddress,
    accountAddress,
    event.block.timestamp
  );
  positionState.sharesOwed = positionState.sharesOwed.minus(value);
  positionState.save();
  addPositionStateHistorical(positionState, event.block.timestamp);

  // Add activity
  addRequestActivity(
    positionRequestLatest,
    activityCategory,
    activitySubCategory,
    BigInt.fromI32(0)
  );
}

export function handleRequestMovedToNextEpoch(
  event: RequestMovedToNextEpochEvent
): void {
  const vaultAddress = event.address.toHexString();
  const accountAddress = event.params.user.toHexString();
  const value = event.params.shares;
  const positionRequestCategory = CATEGORY_SHARES;
  const positionRequestSubCategory = SUB_CATEGORY_WITHDRAW;
  const activityCategory = CATEGORY_SHARES;
  const activitySubCategory = SUB_CATEGORY_WITHDRAW;
  const prevRequestId = getRequestId(
    vaultAddress,
    event.params.currentEpochID,
    accountAddress,
    event.block.timestamp
  );
  const newRequestId = getRequestId(
    vaultAddress,
    event.params.nextEpochID,
    accountAddress,
    event.block.timestamp
  );

  // Update prev request
  let prevPositionRequestLatest = getPositionRequestLatest(
    vaultAddress,
    accountAddress,
    positionRequestCategory,
    positionRequestSubCategory,
    prevRequestId,
    STATUS_UPDATED,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash.toHexString(),
    event.logIndex
  );
  prevPositionRequestLatest.value = BigInt.fromI32(0);
  prevPositionRequestLatest.save();

  // Update new request
  let newPositionRequestLatest = getPositionRequestLatest(
    vaultAddress,
    accountAddress,
    positionRequestCategory,
    positionRequestSubCategory,
    newRequestId,
    STATUS_PENDING,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash.toHexString(),
    event.logIndex
  );
  newPositionRequestLatest.value = newPositionRequestLatest.value.plus(value);
  newPositionRequestLatest.save();

  // Add prev activity
  addRequestActivity(
    prevPositionRequestLatest,
    activityCategory,
    activitySubCategory,
    BigInt.fromI32(0)
  );

  // Add new activity
  addRequestActivity(
    newPositionRequestLatest,
    activityCategory,
    activitySubCategory,
    BigInt.fromI32(1)
  );
}

export function handleEpochClosed(event: EpochClosedEvent): void {
  const vaultAddress = event.address.toHexString();
  const epochId = event.params.epochID;
  const positionRequestCategory = CATEGORY_SHARES;
  const activityCategory = CATEGORY_SHARES;
  const activitySubCategory = SUB_CATEGORY_WITHDRAW;

  let concreteEpoch = getConcreteEpoch(
    vaultAddress,
    epochId,
    event.block.timestamp
  );

  if (!concreteEpoch) {
    return;
  }

  for (
    let i = concreteEpoch.startIndex;
    i < concreteEpoch.endIndex;
    i = i.plus(BigInt.fromI32(1))
  ) {
    let requestId = concreteEpoch.epochId
      .toString()
      .concat("_")
      .concat(i.toString());

    let positionRequestLatestId = generatePositionRequestLatestId(
      vaultAddress,
      positionRequestCategory,
      requestId
    );
    let positionRequestLatest = PositionRequestLatest.load(
      positionRequestLatestId
    );

    if (
      positionRequestLatest &&
      positionRequestLatest.requestStatus == STATUS_PENDING
    ) {
      positionRequestLatest.requestStatus = STATUS_APPROVED;
      positionRequestLatest.blockNumber = event.block.number;
      positionRequestLatest.blockTimestamp = event.block.timestamp;
      positionRequestLatest.transactionHash =
        event.transaction.hash.toHexString();
      positionRequestLatest.logIndex = event.logIndex;
      positionRequestLatest.updatedAt = event.block.timestamp;
      positionRequestLatest.save();

      addRequestActivity(
        positionRequestLatest,
        activityCategory,
        activitySubCategory,
        BigInt.fromI32(0)
      );
    }
  }
}

export function handleEpochProcessed(event: EpochProcessedEvent): void {
  const vaultAddress = event.address.toHexString();
  const epochId = event.params.epochID;
  const positionRequestCategory = CATEGORY_SHARES;
  const activityCategory = CATEGORY_SHARES;
  const activitySubCategory = SUB_CATEGORY_WITHDRAW;

  let vaultState = VaultState.load(generateVaultId(vaultAddress));
  if (!vaultState) {
    return;
  }

  let concreteEpoch = getConcreteEpoch(
    vaultAddress,
    epochId,
    event.block.timestamp
  );

  if (!concreteEpoch) {
    return;
  }

  let accountAddresses: string[] = [];
  let assetsOwed: BigInt[] = [];
  let sharesOwed: BigInt[] = [];

  for (
    let i = concreteEpoch.startIndex;
    i < concreteEpoch.endIndex;
    i = i.plus(BigInt.fromI32(1))
  ) {
    let requestId = concreteEpoch.epochId
      .toString()
      .concat("_")
      .concat(i.toString());

    let positionRequestLatestId = generatePositionRequestLatestId(
      vaultAddress,
      positionRequestCategory,
      requestId
    );
    let positionRequestLatest = PositionRequestLatest.load(
      positionRequestLatestId
    );

    if (
      positionRequestLatest &&
      positionRequestLatest.requestStatus == STATUS_APPROVED
    ) {
      const accountAddress = positionRequestLatest.accountAddress;

      positionRequestLatest.sharePrice = event.params.sharePrice;
      positionRequestLatest.requestStatus = STATUS_CLAIMABLE;
      positionRequestLatest.blockNumber = event.block.number;
      positionRequestLatest.blockTimestamp = event.block.timestamp;
      positionRequestLatest.transactionHash =
        event.transaction.hash.toHexString();
      positionRequestLatest.logIndex = event.logIndex;
      positionRequestLatest.updatedAt = event.block.timestamp;
      positionRequestLatest.save();

      const newAssetsOwed = positionRequestLatest.value
        .times(event.params.sharePrice)
        .div(BigInt.fromI32(10).pow(u8(vaultState.decimals)));

      const accountIndex = accountAddresses.indexOf(accountAddress);
      if (accountIndex == -1) {
        accountAddresses.push(accountAddress);
        assetsOwed.push(newAssetsOwed);
        sharesOwed.push(positionRequestLatest.value);
      } else {
        assetsOwed[accountIndex] = assetsOwed[accountIndex].plus(newAssetsOwed);
        sharesOwed[accountIndex] = sharesOwed[accountIndex].plus(
          positionRequestLatest.value
        );
      }

      addRequestActivity(
        positionRequestLatest,
        activityCategory,
        activitySubCategory,
        BigInt.fromI32(0)
      );
    }
  }

  for (let i = 0; i < accountAddresses.length; i++) {
    const positionState = getPositionState(
      vaultAddress,
      accountAddresses[i],
      event.block.timestamp
    );
    positionState.assetsOwed = positionState.assetsOwed.plus(assetsOwed[i]);
    positionState.sharesOwed = positionState.sharesOwed.minus(sharesOwed[i]);
    positionState.save();
    addPositionStateHistorical(positionState, event.block.timestamp);
  }
}

export function handleRequestClaimed(event: RequestClaimedEvent): void {
  const accountAddress = event.params.owner.toHexString();
  const vaultAddress = event.address.toHexString();
  const positionRequestCategory = CATEGORY_SHARES;
  const activityCategory = CATEGORY_SHARES;
  const activitySubCategory = SUB_CATEGORY_WITHDRAW;

  let vaultState = VaultState.load(generateVaultId(vaultAddress));
  if (!vaultState) {
    return;
  }

  let assetsPaid = BigInt.fromI32(0);

  for (let i = 0; i < event.params.epochIDs.length; i++) {
    let epochId = event.params.epochIDs[i];

    let concreteWithdrawalId = CHAIN_ID.toString()
      .concat("_")
      .concat(vaultAddress)
      .concat("_")
      .concat(epochId.toString())
      .concat("_")
      .concat(accountAddress);

    let concreteWithdrawal = ConcreteWithdrawal.load(concreteWithdrawalId);

    if (!concreteWithdrawal) {
      continue;
    }

    let requestId = epochId
      .toString()
      .concat("_")
      .concat(concreteWithdrawal.index.toString());

    let positionRequestLatestId = generatePositionRequestLatestId(
      vaultAddress,
      positionRequestCategory,
      requestId
    );
    let positionRequestLatest = PositionRequestLatest.load(
      positionRequestLatestId
    );

    if (positionRequestLatest) {
      // Update request
      positionRequestLatest.requestStatus = STATUS_CLAIMED;
      positionRequestLatest.blockNumber = event.block.number;
      positionRequestLatest.blockTimestamp = event.block.timestamp;
      positionRequestLatest.transactionHash =
        event.transaction.hash.toHexString();
      positionRequestLatest.logIndex = event.logIndex;
      positionRequestLatest.updatedAt = event.block.timestamp;
      positionRequestLatest.save();

      const newAssetsPaid = positionRequestLatest.value
        .times(positionRequestLatest.sharePrice!)
        .div(BigInt.fromI32(10).pow(u8(vaultState.decimals)));

      assetsPaid = assetsPaid.plus(newAssetsPaid);

      // Add activity
      addRequestActivity(
        positionRequestLatest,
        activityCategory,
        activitySubCategory,
        BigInt.fromI32(0)
      );
    }
  }

  // Update state
  let positionState = getPositionState(
    vaultAddress,
    event.params.owner.toHexString(),
    event.block.timestamp
  );
  positionState.assetsOwed = positionState.assetsOwed.minus(assetsPaid);
  positionState.save();
  addPositionStateHistorical(positionState, event.block.timestamp);

  // Add transfer
  let transfer = processGlobalTokenTransfer(
    event.address.toHexString(),
    CATEGORY_ASSETS,
    SUB_CATEGORY_WITHDRAW,
    event.address.toHexString(),
    event.params.owner.toHexString(),
    event.params.assets,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash.toHexString(),
    event.logIndex,
    true
  );
  addTransferActivity(transfer, SUB_CATEGORY_WITHDRAW);
}
