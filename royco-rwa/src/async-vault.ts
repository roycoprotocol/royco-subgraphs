import {
  RedeemRequest as RedeemRequestEvent,
  DepositRequest as DepositRequestEvent,
  CancelDepositRequest as CancelDepositRequestEvent,
  CancelRedeemRequest as CancelRedeemRequestEvent,
  CancelRedeemClaim as CancelRedeemClaimEvent,
  CancelDepositClaim as CancelDepositClaimEvent,
} from "../generated/BaseVault/BaseVault";
import {
  CATEGORY_ASSETS,
  CATEGORY_SHARES,
  POSITION_ASSETS_DEPOSIT,
  POSITION_SHARES_WITHDRAW,
  STATUS_CANCELLED,
  STATUS_COMPLETE,
  STATUS_PENDING,
  SUB_CATEGORY_DEPOSIT,
  SUB_CATEGORY_WITHDRAW,
  ZERO_ADDRESS,
} from "./constants";
import { addRequestActivity } from "./handlers/activities/request";
import {
  getPositionState,
  getPositionRequestLatest,
} from "./handlers/base/update-position";

export function handleDepositRequest(event: DepositRequestEvent): void {
  const activityCategory = CATEGORY_ASSETS;
  const activitySubCategory = SUB_CATEGORY_DEPOSIT;
  const positionRequestCategory = POSITION_ASSETS_DEPOSIT;
  const vaultAddress = event.address.toHexString();
  const accountAddress = event.params.owner.toHexString();
  const value = event.params.assets;
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

  // Add activity
  addRequestActivity(
    positionRequestLatest,
    activityCategory,
    activitySubCategory
  );
}

export function handleRedeemRequest(event: RedeemRequestEvent): void {
  const activityCategory = CATEGORY_SHARES;
  const activitySubCategory = SUB_CATEGORY_WITHDRAW;
  const positionRequestCategory = POSITION_SHARES_WITHDRAW;
  const vaultAddress = event.address.toHexString();
  const accountAddress = event.params.owner.toHexString();
  const value = event.params.shares;
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
  const activityCategory = CATEGORY_ASSETS;
  const activitySubCategory = SUB_CATEGORY_DEPOSIT;
  const positionRequestCategory = POSITION_ASSETS_DEPOSIT;
  const vaultAddress = event.address.toHexString();
  const accountAddress = ZERO_ADDRESS;
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
  const activityCategory = CATEGORY_SHARES;
  const activitySubCategory = SUB_CATEGORY_WITHDRAW;
  const positionRequestCategory = POSITION_SHARES_WITHDRAW;
  const vaultAddress = event.address.toHexString();
  const accountAddress = ZERO_ADDRESS;
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

  // Add activity
  addRequestActivity(
    positionRequestLatest,
    activityCategory,
    activitySubCategory
  );
}

export function handleCancelDepositClaim(event: CancelDepositClaimEvent): void {
  const activityCategory = CATEGORY_ASSETS;
  const activitySubCategory = SUB_CATEGORY_DEPOSIT;
  const positionRequestCategory = POSITION_ASSETS_DEPOSIT;
  const vaultAddress = event.address.toHexString();
  const accountAddress = ZERO_ADDRESS;
  const requestId = event.params.requestId.toString();
  const requestStatus = STATUS_COMPLETE;

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

  // Add activity
  addRequestActivity(
    positionRequestLatest,
    activityCategory,
    activitySubCategory
  );
}

export function handleCancelRedeemClaim(event: CancelRedeemClaimEvent): void {
  const activityCategory = CATEGORY_SHARES;
  const activitySubCategory = SUB_CATEGORY_WITHDRAW;
  const positionRequestCategory = POSITION_SHARES_WITHDRAW;
  const vaultAddress = event.address.toHexString();
  const accountAddress = ZERO_ADDRESS;
  const requestId = event.params.requestId.toString();
  const requestStatus = STATUS_COMPLETE;

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

  // Add activity
  addRequestActivity(
    positionRequestLatest,
    activityCategory,
    activitySubCategory
  );
}
