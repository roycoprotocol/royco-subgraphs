import { BigInt } from "@graphprotocol/graph-ts";
import {
  QueuedWithdrawal as QueuedWithdrawalEvent,
  RequestCancelled as RequestCancelledEvent,
  RequestMovedToNextEpoch as RequestMovedToNextEpochEvent,
  EpochClosed as EpochClosedEvent,
  EpochProcessed as EpochProcessedEvent,
  RequestClaimed as RequestClaimedEvent,
  Deposit as DepositEvent,
  Withdraw as WithdrawEvent,
} from "../generated/Vault/AsyncVaultConcrete";
import {
  ConcreteEpoch,
  ConcreteWithdrawal,
  PositionRequestLatest,
} from "../generated/schema";
import {
  CHAIN_ID,
  CATEGORY_ASSETS,
  CATEGORY_SHARES,
  SUB_CATEGORY_WITHDRAW,
  STATUS_PENDING,
  STATUS_CANCELLED,
  STATUS_APPROVED,
  STATUS_CLAIMABLE,
  STATUS_COMPLETED,
  STATUS_UPDATED,
  SUB_CATEGORY_DEPOSIT,
} from "./constants";
import { addRequestActivity } from "./handlers/activities/request";
import {
  addPositionStateHistorical,
  getPositionRequestLatest,
  getPositionState,
} from "./handlers/base/update-position";
import { generatePositionRequestLatestId, generateVaultId } from "./utils";
import { processGlobalTokenTransfer } from "./handlers/base/process-transfer";
import { addTransferActivity } from "./handlers/activities/transfer";

export { handleTransfer } from "./vault";

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
    concreteEpoch.updatedAt = blockTimestamp;
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
    concreteWithdrawal.epochId = concreteEpoch.endIndex;
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
    activitySubCategory
  );
}

export function handleRequestCancelled(event: RequestCancelledEvent): void {
  const vaultAddress = event.address.toHexString();
  const accountAddress = event.params.owner.toHexString();
  const value = event.params.shares;
  const positionRequestCategory = CATEGORY_SHARES;
  const activityCategory = CATEGORY_SHARES;
  const activitySubCategory = SUB_CATEGORY_WITHDRAW;
  const requestId = getRequestId(
    vaultAddress,
    event.params.epochID,
    accountAddress,
    event.block.timestamp
  );
  const requestStatus = STATUS_CANCELLED;

  // Update request
  let positionRequestLatest = getPositionRequestLatest(
    vaultAddress,
    accountAddress,
    positionRequestCategory,
    requestId,
    requestStatus,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash.toHexString(),
    event.logIndex
  );
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
    activitySubCategory
  );
}

export function handleRequestMovedToNextEpoch(
  event: RequestMovedToNextEpochEvent
): void {
  const vaultAddress = event.address.toHexString();
  const accountAddress = event.params.user.toHexString();
  const value = event.params.shares;
  const positionRequestCategory = CATEGORY_SHARES;
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
    prevRequestId,
    STATUS_UPDATED,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash.toHexString(),
    event.logIndex
  );
  prevPositionRequestLatest.save();

  // Update new request
  let newPositionRequestLatest = getPositionRequestLatest(
    vaultAddress,
    accountAddress,
    positionRequestCategory,
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
    activitySubCategory
  );

  // Add new activity
  addRequestActivity(
    newPositionRequestLatest,
    activityCategory,
    activitySubCategory
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
      positionRequestLatest.save();

      addRequestActivity(
        positionRequestLatest,
        activityCategory,
        activitySubCategory
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
      positionRequestLatest.requestStatus == STATUS_APPROVED
    ) {
      positionRequestLatest.value = positionRequestLatest.value.times(
        event.params.sharePrice
      );
      positionRequestLatest.sharePrice = event.params.sharePrice;
      positionRequestLatest.requestStatus = STATUS_CLAIMABLE;
      positionRequestLatest.save();

      addRequestActivity(
        positionRequestLatest,
        activityCategory,
        activitySubCategory
      );
    }
  }
}

export function handleRequestClaimed(event: RequestClaimedEvent): void {
  const vaultAddress = event.address.toHexString();
  const positionRequestCategory = CATEGORY_SHARES;
  const activityCategory = CATEGORY_SHARES;
  const activitySubCategory = SUB_CATEGORY_WITHDRAW;

  let sharesPaid = BigInt.fromI32(0);

  for (let i = 0; i < event.params.epochIDs.length; i++) {
    let epochId = event.params.epochIDs[i];

    let concreteEpoch = getConcreteEpoch(
      vaultAddress,
      epochId,
      event.block.timestamp
    );

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

    if (positionRequestLatest) {
      // Update request
      positionRequestLatest.requestStatus = STATUS_COMPLETED;
      positionRequestLatest.save();

      sharesPaid = sharesPaid.plus(positionRequestLatest.value);

      // Add activity
      addRequestActivity(
        positionRequestLatest,
        activityCategory,
        activitySubCategory
      );
    }
  }

  // Update state
  let positionState = getPositionState(
    vaultAddress,
    event.params.owner.toHexString(),
    event.block.timestamp
  );
  positionState.sharesOwed = positionState.sharesOwed.minus(sharesPaid);
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

export function handleDeposit(event: DepositEvent): void {
  let transfer = processGlobalTokenTransfer(
    event.address.toHexString(),
    CATEGORY_ASSETS,
    SUB_CATEGORY_DEPOSIT,
    event.params.owner.toHexString(),
    event.address.toHexString(),
    event.params.assets,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash.toHexString(),
    event.logIndex,
    true
  );

  addTransferActivity(transfer, SUB_CATEGORY_DEPOSIT);
}

export function handleWithdraw(event: WithdrawEvent): void {
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
