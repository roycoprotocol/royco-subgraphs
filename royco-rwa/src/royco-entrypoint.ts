import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  DepositRequested as DepositRequestedEvent,
  DepositExecuted as DepositExecutedEvent,
  DepositRequestCancelled as DepositRequestCancelledEvent,
  RedemptionRequested as RedemptionRequestedEvent,
  RedemptionExecuted as RedemptionExecutedEvent,
  RedemptionRequestCancelled as RedemptionRequestCancelledEvent,
  ProtocolFeeSharesAccrued as ProtocolFeeSharesAccruedEvent,
  TrancheConfigUpdated as TrancheConfigUpdatedEvent,
} from "../generated/Vault/RoycoEntryPoint";
import { BaseVault } from "../generated/Vault/BaseVault";
import {
  EntryPointRequest,
  EntryPointState,
  GlobalTokenActivity,
} from "../generated/schema";
import {
  CHAIN_ID,
  getEntryPointVersion,
  CATEGORY_ASSETS,
  CATEGORY_SHARES,
  SUB_CATEGORY_DEPOSIT,
  SUB_CATEGORY_WITHDRAW,
  STATUS_PENDING,
  STATUS_CANCELLED,
  STATUS_COMPLETED,
  FEES_MINOR_TYPE_SHARES,
  ZERO_ADDRESS,
  FEES_MAJOR_TYPE_ENTRY_POINT,
  ACTIVITY_TYPE_REQUEST,
} from "./constants";
import {
  generateTokenId,
  generateTokenVaultId,
  generateVaultId,
} from "./utils";
import { updateFeeState } from "./handlers/fees/update-fees";

// === HELPERS ===

function generateEntryPointStateId(
  version: BigInt,
  vaultAddress: string
): string {
  return version
    .toString()
    .concat("_")
    .concat(CHAIN_ID.toString())
    .concat("_")
    .concat(vaultAddress);
}

function generateEntryPointRequestId(version: BigInt, nonce: BigInt): string {
  return version
    .toString()
    .concat("_")
    .concat(CHAIN_ID.toString())
    .concat("_")
    .concat(nonce.toString());
}

function decodeYieldRecipient(value: i32): string {
  if (value == 0) return "protocol";
  if (value == 1) return "lp";
  return "vault";
}

function getOrCreateEntryPointState(
  version: BigInt,
  vaultAddress: string,
  blockTimestamp: BigInt,
  save: boolean
): EntryPointState {
  let id = generateEntryPointStateId(version, vaultAddress);
  let state = EntryPointState.load(id);

  if (state == null) {
    let trancheContract = BaseVault.bind(Address.fromString(vaultAddress));
    let assetResult = trancheContract.try_asset();

    let depositTokenAddress = assetResult.reverted
      ? ZERO_ADDRESS
      : assetResult.value.toHexString();

    state = new EntryPointState(id);
    state.version = version;
    state.chainId = CHAIN_ID;
    state.vaultAddress = vaultAddress;
    state.vaultId = generateVaultId(vaultAddress);

    state.depositTokenAddress = depositTokenAddress;
    state.depositTokenId = generateTokenVaultId(
      depositTokenAddress,
      vaultAddress
    );
    state.shareTokenAddress = vaultAddress;
    state.shareTokenId = generateTokenId(vaultAddress);

    state.isEnabled = false;
    state.yieldRecipient = "protocol";
    state.depositDelaySeconds = BigInt.fromI32(0);
    state.redemptionDelaySeconds = BigInt.fromI32(0);
    state.createdAt = blockTimestamp;
    state.updatedAt = blockTimestamp;

    if (save && state.depositTokenAddress != ZERO_ADDRESS) {
      state.save();
    }
  }

  return state;
}

function initRequest(
  version: BigInt,
  nonce: BigInt,
  vaultAddress: string,
  accountAddress: string,
  category: string,
  subCategory: string,
  tokenAddress: string,
  initValue: BigInt,
  executableAtTimestamp: BigInt,
  executorBonusWAD: BigInt,
  blockNumber: BigInt,
  blockTimestamp: BigInt,
  transactionHash: string,
  logIndex: BigInt
): EntryPointRequest {
  let id = generateEntryPointRequestId(version, nonce);
  let request = new EntryPointRequest(id);

  request.version = version;
  request.chainId = CHAIN_ID;
  request.nonce = nonce;
  request.vaultAddress = vaultAddress;
  request.vaultId = generateVaultId(vaultAddress);
  request.accountAddress = accountAddress;
  request.category = category;
  request.subCategory = subCategory;

  if (category == CATEGORY_ASSETS) {
    request.tokenId = generateTokenVaultId(tokenAddress, vaultAddress);
  } else {
    request.tokenId = generateTokenId(tokenAddress);
  }

  request.tokenAddress = tokenAddress;
  request.currValue = initValue;
  request.initValue = initValue;
  request.status = STATUS_PENDING;
  request.executableAtTimestamp = executableAtTimestamp;
  request.executorBonusWAD = executorBonusWAD;

  request.assetsDeposited = BigInt.fromI32(0);
  request.assetsBonus = BigInt.fromI32(0);
  request.sharesMinted = BigInt.fromI32(0);

  request.sharesRedeemed = BigInt.fromI32(0);
  request.sharesForfeited = BigInt.fromI32(0);
  request.stAssetsUserClaims = BigInt.fromI32(0);
  request.jtAssetsUserClaims = BigInt.fromI32(0);
  request.stAssetsBonusClaims = BigInt.fromI32(0);
  request.jtAssetsBonusClaims = BigInt.fromI32(0);

  request.createdAtBlockNumber = blockNumber;
  request.createdAtBlockTimestamp = blockTimestamp;
  request.createdAtTransactionHash = transactionHash;
  request.createdAtLogIndex = logIndex;
  request.updatedAtBlockNumber = blockNumber;
  request.updatedAtBlockTimestamp = blockTimestamp;
  request.updatedAtTransactionHash = transactionHash;
  request.updatedAtLogIndex = logIndex;
  request.createdAt = blockTimestamp;
  request.updatedAt = blockTimestamp;

  return request;
}

function touchRequest(
  request: EntryPointRequest,
  blockNumber: BigInt,
  blockTimestamp: BigInt,
  transactionHash: string,
  logIndex: BigInt
): void {
  request.updatedAtBlockNumber = blockNumber;
  request.updatedAtBlockTimestamp = blockTimestamp;
  request.updatedAtTransactionHash = transactionHash;
  request.updatedAtLogIndex = logIndex;
  request.updatedAt = blockTimestamp;
}

function addActivity(request: EntryPointRequest): void {
  let activityId = "entrypoint"
    .concat("_")
    .concat(request.id)
    .concat("_")
    .concat(request.updatedAtBlockNumber.toString())
    .concat("_")
    .concat(request.updatedAtBlockTimestamp.toString())
    .concat("_")
    .concat(request.updatedAtTransactionHash)
    .concat("_")
    .concat(request.updatedAtLogIndex.toString());

  let activity = new GlobalTokenActivity(activityId);
  activity.vaultId = request.vaultId;
  activity.chainId = CHAIN_ID;
  activity.vaultAddress = request.vaultAddress;
  activity.category = request.category;
  activity.subCategory = request.subCategory;
  activity.accountAddress = request.accountAddress;
  activity.type = ACTIVITY_TYPE_REQUEST;
  activity.tokenIndex = BigInt.fromI32(0);
  activity.tokenId = request.tokenId;
  activity.tokenAddress = request.tokenAddress;
  activity.value = request.currValue;
  activity.status = request.status;
  activity.blockNumber = request.updatedAtBlockNumber;
  activity.blockTimestamp = request.updatedAtBlockTimestamp;
  activity.transactionHash = request.updatedAtTransactionHash;
  activity.logIndex = request.updatedAtLogIndex;
  activity.createdAt = request.updatedAt;
  activity.save();
}

// === HANDLERS ===

export function handleTrancheConfigUpdated(
  event: TrancheConfigUpdatedEvent
): void {
  let version = getEntryPointVersion(event.address.toHexString());
  if (version.equals(BigInt.zero())) return;

  let vaultAddress = event.params.tranche.toHexString();
  let state = getOrCreateEntryPointState(
    version,
    vaultAddress,
    event.block.timestamp,
    false // save
  );

  if (state.depositTokenAddress == ZERO_ADDRESS) return;

  state.isEnabled = event.params.config.enabled;
  state.yieldRecipient = decodeYieldRecipient(
    event.params.config.yieldRecipient
  );
  state.depositDelaySeconds = BigInt.fromI32(
    event.params.config.depositDelaySeconds
  );
  state.redemptionDelaySeconds = BigInt.fromI32(
    event.params.config.redemptionDelaySeconds
  );
  state.updatedAt = event.block.timestamp;

  state.save();
}

export function handleDepositRequested(event: DepositRequestedEvent): void {
  let version = getEntryPointVersion(event.address.toHexString());
  if (version.equals(BigInt.zero())) return;

  let vaultAddress = event.params.tranche.toHexString();

  let state = getOrCreateEntryPointState(
    version,
    vaultAddress,
    event.block.timestamp,
    true // save
  );
  if (state.depositTokenAddress == ZERO_ADDRESS) return;

  let request = initRequest(
    version,
    event.params.nonce,
    vaultAddress,
    event.params.user.toHexString(),
    CATEGORY_ASSETS,
    SUB_CATEGORY_DEPOSIT,
    state.depositTokenAddress,
    event.params.assets,
    event.params.executableAtTimestamp,
    event.params.executorBonusWAD,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash.toHexString(),
    event.logIndex
  );
  request.save();

  addActivity(request);
}

export function handleDepositExecuted(event: DepositExecutedEvent): void {
  let version = getEntryPointVersion(event.address.toHexString());
  if (version.equals(BigInt.zero())) return;

  let request = EntryPointRequest.load(
    generateEntryPointRequestId(version, event.params.nonce)
  );
  if (!request) return;
  touchRequest(
    request,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash.toHexString(),
    event.logIndex
  );

  let tempCurrValue = request.currValue;
  let tempStatus = request.status;

  // temporarily alter request to capture fill activity
  request.currValue = event.params.assetsDeposited;
  request.status = STATUS_COMPLETED;
  addActivity(request);

  // then revert to original value
  request.currValue = tempCurrValue;
  request.status = tempStatus;

  request.currValue = request.currValue
    .minus(event.params.assetsDeposited)
    .minus(event.params.bonusAssets);

  request.assetsDeposited = request.assetsDeposited.plus(
    event.params.assetsDeposited
  );
  request.assetsBonus = request.assetsBonus.plus(event.params.bonusAssets);
  request.sharesMinted = request.sharesMinted.plus(event.params.sharesMinted);

  if (request.currValue.equals(BigInt.fromI32(0))) {
    request.status = STATUS_COMPLETED;
  }

  request.save();
}

export function handleDepositRequestCancelled(
  event: DepositRequestCancelledEvent
): void {
  let version = getEntryPointVersion(event.address.toHexString());
  if (version.equals(BigInt.zero())) return;

  let request = EntryPointRequest.load(
    generateEntryPointRequestId(version, event.params.nonce)
  );
  if (!request) return;
  touchRequest(
    request,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash.toHexString(),
    event.logIndex
  );

  request.status = STATUS_CANCELLED;

  // we want activity to be added before we update the current value to 0
  addActivity(request);
  request.currValue = BigInt.fromI32(0);

  request.save();
}

export function handleRedemptionRequested(
  event: RedemptionRequestedEvent
): void {
  let version = getEntryPointVersion(event.address.toHexString());
  if (version.equals(BigInt.zero())) return;

  let vaultAddress = event.params.tranche.toHexString();

  let state = getOrCreateEntryPointState(
    version,
    vaultAddress,
    event.block.timestamp,
    true // save
  );
  if (state.depositTokenAddress == ZERO_ADDRESS) return;

  let request = initRequest(
    version,
    event.params.nonce,
    vaultAddress,
    event.params.user.toHexString(),
    CATEGORY_SHARES,
    SUB_CATEGORY_WITHDRAW,
    state.shareTokenAddress,
    event.params.shares,
    event.params.executableAtTimestamp,
    event.params.executorBonusWAD,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash.toHexString(),
    event.logIndex
  );
  request.save();

  addActivity(request);
}

export function handleRedemptionExecuted(event: RedemptionExecutedEvent): void {
  let version = getEntryPointVersion(event.address.toHexString());
  if (version.equals(BigInt.zero())) return;

  let request = EntryPointRequest.load(
    generateEntryPointRequestId(version, event.params.nonce)
  );
  if (!request) return;
  touchRequest(
    request,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash.toHexString(),
    event.logIndex
  );

  let tempCurrValue = request.currValue;
  let tempStatus = request.status;

  // temporarily alter request to capture fill activity
  request.currValue = event.params.sharesRedeemed;
  request.status = STATUS_COMPLETED;
  addActivity(request);

  // then revert to original value
  request.currValue = tempCurrValue;
  request.status = tempStatus;

  request.currValue = request.currValue
    .minus(event.params.sharesRedeemed)
    .minus(event.params.forfeitedYieldShares);

  request.sharesRedeemed = request.sharesRedeemed.plus(
    event.params.sharesRedeemed
  );
  request.sharesForfeited = request.sharesForfeited.plus(
    event.params.forfeitedYieldShares
  );
  request.stAssetsUserClaims = request.stAssetsUserClaims.plus(
    event.params.userClaims.stAssets
  );
  request.jtAssetsUserClaims = request.jtAssetsUserClaims.plus(
    event.params.userClaims.jtAssets
  );
  request.stAssetsBonusClaims = request.stAssetsBonusClaims.plus(
    event.params.bonusClaims.stAssets
  );
  request.jtAssetsBonusClaims = request.jtAssetsBonusClaims.plus(
    event.params.bonusClaims.jtAssets
  );

  if (request.currValue.equals(BigInt.fromI32(0))) {
    request.status = STATUS_COMPLETED;
  }

  request.save();
}

export function handleRedemptionRequestCancelled(
  event: RedemptionRequestCancelledEvent
): void {
  let version = getEntryPointVersion(event.address.toHexString());
  if (version.equals(BigInt.zero())) return;

  let request = EntryPointRequest.load(
    generateEntryPointRequestId(version, event.params.nonce)
  );
  if (!request) return;
  touchRequest(
    request,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash.toHexString(),
    event.logIndex
  );

  request.status = STATUS_CANCELLED;

  // we want activity to be added before we update the current value to 0
  addActivity(request);
  request.currValue = BigInt.fromI32(0);

  request.save();
}

export function handleProtocolFeeSharesAccrued(
  event: ProtocolFeeSharesAccruedEvent
): void {
  let version = getEntryPointVersion(event.address.toHexString());
  if (version.equals(BigInt.zero())) return;

  let vaultAddress = event.params.tranche.toHexString();

  let state = getOrCreateEntryPointState(
    version,
    vaultAddress,
    event.block.timestamp,
    false // save
  );
  if (state.depositTokenAddress == ZERO_ADDRESS) return;

  if (event.params.shares.gt(BigInt.fromI32(0))) {
    updateFeeState(
      vaultAddress,
      event.address.toHexString(),
      state.shareTokenAddress,
      event.params.shares,
      FEES_MAJOR_TYPE_ENTRY_POINT,
      FEES_MINOR_TYPE_SHARES,
      event.block.number,
      event.block.timestamp,
      event.transaction.hash.toHexString(),
      event.logIndex,
      true
    );
  }
}
