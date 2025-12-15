import { BigInt } from "@graphprotocol/graph-ts";
import {
  RedeemRequest as RedeemRequestEvent,
  DepositRequest as DepositRequestEvent,
  CancelDepositRequest as CancelDepositRequestEvent,
  CancelRedeemRequest as CancelRedeemRequestEvent,
  CancelRedeemClaim as CancelRedeemClaimEvent,
  CancelDepositClaim as CancelDepositClaimEvent,
  Deposit as DepositEvent,
  Withdraw as WithdrawEvent,
} from "../generated/Vault/AsyncVaultRoyco";
import {
  ZERO_ADDRESS,
  CATEGORY_ASSETS,
  CATEGORY_SHARES,
  SUB_CATEGORY_DEPOSIT,
  SUB_CATEGORY_WITHDRAW,
  STATUS_PENDING,
  STATUS_CANCELLED,
  STATUS_CANCEL_CLAIMED,
} from "./constants";
import { addRequestActivity } from "./handlers/activities/request";
import { addTransferActivity } from "./handlers/activities/transfer";
import {
  getPositionState,
  getPositionRequestLatest,
  addPositionStateHistorical,
} from "./handlers/base/update-position";
import { processGlobalTokenTransfer } from "./handlers/base/process-transfer";

export { handleTransfer } from "./vault";

export function handleDepositRequest(event: DepositRequestEvent): void {
  const vaultAddress = event.address.toHexString();
  const accountAddress = event.params.owner.toHexString();
  const value = event.params.assets;
  const positionRequestCategory = CATEGORY_ASSETS;
  const activityCategory = CATEGORY_ASSETS;
  const activitySubCategory = SUB_CATEGORY_DEPOSIT;
  const requestId = event.params.requestId.toString();
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
  positionRequestLatest.value = value;
  positionRequestLatest.save();

  // Update state
  let positionState = getPositionState(
    vaultAddress,
    accountAddress,
    event.block.timestamp
  );
  positionState.assetsOwed = positionState.assetsOwed.plus(
    positionRequestLatest.value
  );
  positionState.save();
  addPositionStateHistorical(positionState, event.block.timestamp);

  // Add activity
  addRequestActivity(
    positionRequestLatest,
    activityCategory,
    activitySubCategory
  );
}

export function handleRedeemRequest(event: RedeemRequestEvent): void {
  const vaultAddress = event.address.toHexString();
  const accountAddress = event.params.owner.toHexString();
  const value = event.params.shares;
  const positionRequestCategory = CATEGORY_SHARES;
  const activityCategory = CATEGORY_SHARES;
  const activitySubCategory = SUB_CATEGORY_WITHDRAW;
  const requestId = event.params.requestId.toString();
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
  positionRequestLatest.value = value;
  positionRequestLatest.save();

  // Update state
  let positionState = getPositionState(
    vaultAddress,
    accountAddress,
    event.block.timestamp
  );
  positionState.sharesOwed = positionState.sharesOwed.plus(
    positionRequestLatest.value
  );
  positionState.save();
  addPositionStateHistorical(positionState, event.block.timestamp);

  // Add activity
  addRequestActivity(
    positionRequestLatest,
    activityCategory,
    activitySubCategory
  );
}

export function handleCancelDepositRequest(
  event: CancelDepositRequestEvent
): void {
  const vaultAddress = event.address.toHexString();
  const accountAddress = ZERO_ADDRESS;
  const positionRequestCategory = CATEGORY_ASSETS;
  const activityCategory = CATEGORY_ASSETS;
  const activitySubCategory = SUB_CATEGORY_DEPOSIT;
  const requestId = event.params.requestId.toString();
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
  positionState.assetsOwed = positionState.assetsOwed.minus(
    positionRequestLatest.value
  );
  positionState.cancelledAssetsOwed = positionState.cancelledAssetsOwed.plus(
    positionRequestLatest.value
  );
  positionState.save();
  addPositionStateHistorical(positionState, event.block.timestamp);

  // Add activity
  addRequestActivity(
    positionRequestLatest,
    activityCategory,
    activitySubCategory
  );
}

export function handleCancelRedeemRequest(
  event: CancelRedeemRequestEvent
): void {
  const vaultAddress = event.address.toHexString();
  const accountAddress = ZERO_ADDRESS;
  const positionRequestCategory = CATEGORY_SHARES;
  const activityCategory = CATEGORY_SHARES;
  const activitySubCategory = SUB_CATEGORY_WITHDRAW;
  const requestId = event.params.requestId.toString();
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
  positionState.sharesOwed = positionState.sharesOwed.minus(
    positionRequestLatest.value
  );
  positionState.cancelledSharesOwed = positionState.cancelledSharesOwed.plus(
    positionRequestLatest.value
  );
  positionState.save();
  addPositionStateHistorical(positionState, event.block.timestamp);

  // Add activity
  addRequestActivity(
    positionRequestLatest,
    activityCategory,
    activitySubCategory
  );
}

export function handleCancelDepositClaim(event: CancelDepositClaimEvent): void {
  const vaultAddress = event.address.toHexString();
  const accountAddress = ZERO_ADDRESS;
  const positionRequestCategory = CATEGORY_ASSETS;
  const activityCategory = CATEGORY_ASSETS;
  const activitySubCategory = SUB_CATEGORY_DEPOSIT;
  const requestId = event.params.requestId.toString();
  const requestStatus = STATUS_CANCEL_CLAIMED;

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
  positionState.cancelledAssetsOwed = positionState.cancelledAssetsOwed.minus(
    positionRequestLatest.value
  );
  positionState.save();
  addPositionStateHistorical(positionState, event.block.timestamp);

  // Add activity
  addRequestActivity(
    positionRequestLatest,
    activityCategory,
    activitySubCategory
  );
}

export function handleCancelRedeemClaim(event: CancelRedeemClaimEvent): void {
  const vaultAddress = event.address.toHexString();
  const accountAddress = ZERO_ADDRESS;
  const positionRequestCategory = CATEGORY_SHARES;
  const activityCategory = CATEGORY_SHARES;
  const activitySubCategory = SUB_CATEGORY_WITHDRAW;
  const requestId = event.params.requestId.toString();
  const requestStatus = STATUS_CANCEL_CLAIMED;

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
  positionState.cancelledSharesOwed = positionState.cancelledSharesOwed.minus(
    positionRequestLatest.value
  );
  positionState.save();
  addPositionStateHistorical(positionState, event.block.timestamp);

  // Add activity
  addRequestActivity(
    positionRequestLatest,
    activityCategory,
    activitySubCategory
  );
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

  let positionState = getPositionState(
    transfer.vaultAddress,
    transfer.fromAddress,
    transfer.blockTimestamp
  );
  if (positionState.assetsOwed > BigInt.fromI32(0)) {
    positionState.assetsOwed = positionState.assetsOwed.minus(
      event.params.assets
    );

    if (positionState.assetsOwed < BigInt.fromI32(0)) {
      positionState.assetsOwed = BigInt.fromI32(0);
    }

    positionState.save();
    addPositionStateHistorical(positionState, transfer.blockTimestamp);
  }

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

  let positionState = getPositionState(
    transfer.vaultAddress,
    transfer.toAddress,
    transfer.blockTimestamp
  );
  if (positionState.sharesOwed > BigInt.fromI32(0)) {
    positionState.sharesOwed = positionState.sharesOwed.minus(
      event.params.shares
    );

    if (positionState.sharesOwed < BigInt.fromI32(0)) {
      positionState.sharesOwed = BigInt.fromI32(0);
    }

    positionState.save();
    addPositionStateHistorical(positionState, transfer.blockTimestamp);
  }

  addTransferActivity(transfer, SUB_CATEGORY_WITHDRAW);
}
