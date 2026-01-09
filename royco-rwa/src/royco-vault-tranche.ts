import { BigInt } from "@graphprotocol/graph-ts";
import {
  Deposit as DepositEvent,
  Redeem as RedeemEvent,
  RedeemRequest as RedeemRequestEvent,
  CancelRedeemRequest as CancelRedeemRequestEvent,
  CancelRedeemClaim as CancelRedeemClaimEvent,
} from "../generated/templates/RoycoVaultTranche/RoycoVaultTranche";
import { processGlobalTokenTransfer } from "./handlers/base/process-transfer";
import {
  CATEGORY_ASSETS,
  CATEGORY_SHARES,
  STATUS_CANCEL_CLAIMED,
  STATUS_CANCELLED,
  STATUS_CLAIMED,
  STATUS_PENDING,
  SUB_CATEGORY_DEPOSIT,
  SUB_CATEGORY_WITHDRAW,
  VAULT_SUB_CATEGORY_JUNIOR,
} from "./constants";
import { addTransferActivity } from "./handlers/activities/transfer";
import { generateVaultId } from "./utils";
import { VaultState } from "../generated/schema";
import {
  addPositionStateHistorical,
  getPositionRequestLatest,
  getPositionState,
} from "./handlers/base/update-position";
import { addRequestActivity } from "./handlers/activities/request";
import { getMetadataTimestamp, getMetadataType } from "./utils/decoder";

export { handleTransfer } from "./vault";

export function handleDeposit(event: DepositEvent): void {
  let transfer = processGlobalTokenTransfer(
    event.address.toHexString(),
    CATEGORY_ASSETS,
    SUB_CATEGORY_DEPOSIT,
    event.params.sender.toHexString(),
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

export function handleRedeem(event: RedeemEvent): void {
  let currVaultAddress = event.address.toHexString();
  let currVaultId = generateVaultId(currVaultAddress);
  let currVaultState = VaultState.load(currVaultId);

  if (!currVaultState || !currVaultState.partnerVaultAddress) {
    return;
  }

  // Assume currVault is "Senior"
  let seniorVaultAddress = currVaultAddress;
  let juniorVaultAddress = currVaultState.partnerVaultAddress!;

  // If currVault is "Junior", swap senior and junior vault addresses
  if (
    currVaultState.minorType == VAULT_SUB_CATEGORY_JUNIOR &&
    currVaultState.partnerVaultAddress
  ) {
    seniorVaultAddress = currVaultState.partnerVaultAddress!;
    juniorVaultAddress = currVaultAddress;
  }

  let seniorTransfer = processGlobalTokenTransfer(
    seniorVaultAddress, // vault
    CATEGORY_ASSETS,
    SUB_CATEGORY_WITHDRAW,
    seniorVaultAddress, // from
    event.params.receiver.toHexString(), // to
    event.params.claims.jtAssets,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash.toHexString(),
    event.logIndex,
    false
  );

  if (seniorTransfer.value.gt(BigInt.fromI32(0))) {
    seniorTransfer.save();
    addTransferActivity(seniorTransfer, SUB_CATEGORY_WITHDRAW);
  }

  let juniorTransfer = processGlobalTokenTransfer(
    juniorVaultAddress, // vault
    CATEGORY_ASSETS,
    SUB_CATEGORY_WITHDRAW,
    juniorVaultAddress, // from
    event.params.receiver.toHexString(), // to
    event.params.claims.jtAssets,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash.toHexString(),
    event.logIndex,
    false
  );

  if (juniorTransfer.value.gt(BigInt.fromI32(0))) {
    juniorTransfer.save();
    addTransferActivity(juniorTransfer, SUB_CATEGORY_WITHDRAW);
  }

  const vaultAddress = event.address.toHexString();
  const accountAddress = event.params.sender.toHexString();

  let positionState = getPositionState(
    vaultAddress,
    accountAddress,
    event.block.timestamp
  );

  // Update state
  if (positionState.sharesOwed.gt(BigInt.fromI32(0))) {
    positionState.sharesOwed = positionState.sharesOwed.minus(
      event.params.shares
    );
    positionState.save();
    addPositionStateHistorical(positionState, event.block.timestamp);

    // Update request
    // For now, all requests are assumed
    // to have request id as "0"
    const requestId = accountAddress.concat("_").concat("0");
    const positionRequestCategory = CATEGORY_SHARES;
    const positionRequestSubCategory = SUB_CATEGORY_WITHDRAW;
    const activityCategory = CATEGORY_SHARES;
    const activitySubCategory = SUB_CATEGORY_WITHDRAW;

    let positionRequestLatest = getPositionRequestLatest(
      vaultAddress,
      accountAddress,
      positionRequestCategory,
      positionRequestSubCategory,
      requestId,
      STATUS_PENDING,
      event.block.number,
      event.block.timestamp,
      event.transaction.hash.toHexString(),
      event.logIndex
    );
    positionRequestLatest.value = positionRequestLatest.value.minus(
      event.params.shares
    );

    if (positionRequestLatest.value.equals(BigInt.fromI32(0))) {
      positionRequestLatest.requestStatus = STATUS_CLAIMED;
    }

    positionRequestLatest.save();

    // Add activity
    addRequestActivity(
      positionRequestLatest,
      activityCategory,
      activitySubCategory,
      BigInt.fromI32(0)
    );
  }
}

export function handleRedeemRequest(event: RedeemRequestEvent): void {
  const vaultAddress = event.address.toHexString();
  const accountAddress = event.params.owner.toHexString();
  const value = event.params.shares;
  const positionRequestCategory = CATEGORY_SHARES;
  const positionRequestSubCategory = SUB_CATEGORY_WITHDRAW;
  const activityCategory = CATEGORY_SHARES;
  const activitySubCategory = SUB_CATEGORY_WITHDRAW;
  const requestId = accountAddress
    .concat("_")
    .concat(event.params.requestId.toString());
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

  let metadataType = getMetadataType(event.params.metadata);
  if (metadataType.equals(BigInt.fromI32(0))) {
    let metadataTimestamp = getMetadataTimestamp(event.params.metadata);

    if (metadataTimestamp.gt(BigInt.fromI32(0))) {
      positionRequestLatest.unlockTimestamp = metadataTimestamp;
    }
  }

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

export function handleCancelRedeemRequest(
  event: CancelRedeemRequestEvent
): void {
  const vaultAddress = event.address.toHexString();
  const accountAddress = event.params.sender.toHexString();
  const positionRequestCategory = CATEGORY_SHARES;
  const positionRequestSubCategory = SUB_CATEGORY_WITHDRAW;
  const activityCategory = CATEGORY_SHARES;
  const activitySubCategory = SUB_CATEGORY_WITHDRAW;
  const requestId = accountAddress
    .concat("_")
    .concat(event.params.requestId.toString());
  const requestStatus = STATUS_CANCELLED;

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
    activitySubCategory,
    BigInt.fromI32(0)
  );
}

export function handleCancelRedeemClaim(event: CancelRedeemClaimEvent): void {
  const vaultAddress = event.address.toHexString();
  const accountAddress = event.params.sender.toHexString();
  const value = event.params.shares;
  const positionRequestCategory = CATEGORY_SHARES;
  const positionRequestSubCategory = SUB_CATEGORY_WITHDRAW;
  const activityCategory = CATEGORY_SHARES;
  const activitySubCategory = SUB_CATEGORY_WITHDRAW;
  const requestId = accountAddress
    .concat("_")
    .concat(event.params.requestId.toString());
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
  positionState.cancelledSharesOwed =
    positionState.cancelledSharesOwed.minus(value);
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
