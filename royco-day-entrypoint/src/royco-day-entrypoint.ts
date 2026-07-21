import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  TrancheConfigUpdated as TrancheConfigUpdatedEvent,
  DepositRequested as DepositRequestedEvent,
  DepositExecuted as DepositExecutedEvent,
  DepositRequestCancelled as DepositRequestCancelledEvent,
  RedemptionRequested as RedemptionRequestedEvent,
  RedemptionExecuted as RedemptionExecutedEvent,
  RedemptionRequestCancelled as RedemptionRequestCancelledEvent,
} from "../generated/RoycoDayEntryPoint/RoycoDayEntryPoint";
import { RoycoVaultTranche } from "../generated/RoycoDayEntryPoint/RoycoVaultTranche";
import {
  DayEntryPointExecution,
  DayEntryPointRequest,
  DayEntryPointState,
  GlobalTokenActivity,
} from "../generated/schema";
import {
  CHAIN_ID,
  getEntryPointVersion,
  ZERO_ADDRESS,
  CATEGORY_ASSETS,
  CATEGORY_SHARES,
  SUB_CATEGORY_DEPOSIT,
  SUB_CATEGORY_WITHDRAW,
  STATUS_PENDING,
  STATUS_PARTIALLY_FILLED,
  STATUS_CANCELLED,
  STATUS_COMPLETED,
  STATUS_UPDATED,
  SELF_EXECUTION_ONLY_SENTINEL,
  ACTIVITY_TYPE_REQUEST,
} from "./constants";
import {
  generateEntryPointStateId,
  generateEntryPointRequestId,
  generateExecutionId,
  generateGlobalTokenActivityId,
  generateVaultId,
  generateTokenId,
  generateTokenVaultId,
} from "./utils";

// The EntryPoint is a per-chain singleton — every event emits from its one
// address. getEntryPointVersion(event.address) returns 0 for an address this
// subgraph isn't configured for; every handler bails on 0.

// Loads or lazily creates the per-(entryPoint, tranche) config. Resolves the
// deposit token via tranche.asset(); a revert (not a live tranche) leaves a
// ZERO_ADDRESS token, unsaved, and callers skip it.
function getOrCreateState(
  version: BigInt,
  entryPointAddress: string,
  trancheAddress: string,
  blockTimestamp: BigInt,
  save: boolean
): DayEntryPointState {
  const id = generateEntryPointStateId(entryPointAddress, trancheAddress);
  let state = DayEntryPointState.load(id);
  if (state != null) return state;

  state = new DayEntryPointState(id);

  const assetResult = RoycoVaultTranche.bind(Address.fromString(trancheAddress)).try_asset();
  const depositTokenAddress = assetResult.reverted ? ZERO_ADDRESS : assetResult.value.toHexString();

  state.chainId = CHAIN_ID;
  state.version = version;
  state.entryPointAddress = entryPointAddress;
  state.vaultAddress = trancheAddress;
  state.vaultId = generateVaultId(trancheAddress);
  state.depositTokenAddress = depositTokenAddress;
  state.depositTokenId = generateTokenVaultId(depositTokenAddress, trancheAddress);
  state.shareTokenAddress = trancheAddress;
  state.shareTokenId = generateTokenId(trancheAddress);
  state.isEnabled = false; // real values arrive via TrancheConfigUpdated
  state.depositDelaySeconds = BigInt.zero();
  state.redemptionDelaySeconds = BigInt.zero();
  state.oracleClockAddress = ZERO_ADDRESS;
  state.createdAt = blockTimestamp;
  state.updatedAt = blockTimestamp;

  if (save && depositTokenAddress != ZERO_ADDRESS) state.save();
  return state;
}

// Fresh request with every non-null field seeded.
function initRequest(
  version: BigInt,
  entryPointAddress: string,
  nonce: BigInt,
  trancheAddress: string,
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
): DayEntryPointRequest {
  const request = new DayEntryPointRequest(generateEntryPointRequestId(entryPointAddress, nonce));

  request.chainId = CHAIN_ID;
  request.version = version;
  request.entryPointAddress = entryPointAddress;
  request.nonce = nonce;
  request.vaultAddress = trancheAddress;
  request.vaultId = generateVaultId(trancheAddress);
  request.accountAddress = accountAddress;
  request.category = category;
  request.subCategory = subCategory;
  request.tokenId =
    category == CATEGORY_ASSETS
      ? generateTokenVaultId(tokenAddress, trancheAddress)
      : generateTokenId(tokenAddress);
  request.tokenAddress = tokenAddress;
  request.currValue = initValue;
  request.initValue = initValue;
  request.status = STATUS_PENDING;
  request.queuedAtTimestamp = blockTimestamp;
  request.executableAtTimestamp = executableAtTimestamp;
  request.executorBonusWAD = executorBonusWAD;
  request.selfExecutionOnly = executorBonusWAD.equals(SELF_EXECUTION_ONLY_SENTINEL);
  request.protocolFeeShares = BigInt.zero();

  request.assetsDeposited = BigInt.zero();
  request.assetsBonus = BigInt.zero();
  request.sharesMinted = BigInt.zero();

  request.sharesRedeemed = BigInt.zero();
  request.stAssetsUserClaims = BigInt.zero();
  request.jtAssetsUserClaims = BigInt.zero();
  request.ltAssetsUserClaims = BigInt.zero();
  request.stSharesUserClaims = BigInt.zero();
  request.navUserClaims = BigInt.zero();
  request.quoteAssetsUserClaims = BigInt.zero();
  request.stAssetsBonusClaims = BigInt.zero();
  request.jtAssetsBonusClaims = BigInt.zero();
  request.ltAssetsBonusClaims = BigInt.zero();
  request.stSharesBonusClaims = BigInt.zero();
  request.navBonusClaims = BigInt.zero();
  request.quoteAssetsBonusClaims = BigInt.zero();

  request.cancelReceiverAddress = ZERO_ADDRESS;
  request.cancelledAmount = BigInt.zero();

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

// updatedAt* only — never touch createdAt*.
function touchRequest(
  request: DayEntryPointRequest,
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

// Reduce the escrow and set status. `consumed` is the SUM of both event legs (see
// schema.graphql SUM RULE).
function applyExecution(request: DayEntryPointRequest, consumed: BigInt): void {
  request.currValue = request.currValue.minus(consumed);
  request.status = request.currValue.isZero() ? STATUS_COMPLETED : STATUS_PARTIALLY_FILLED;
}

// Activity status for a fill: a fill that empties the request completes it,
// otherwise it's an update. Call AFTER applyExecution. Kept distinct from the
// request's own status ("partiallyFilled") because the shared activity feed's
// vocabulary is pending/updated/completed/cancelled and consumers read
// "completed" as the whole request finishing.
function fillActivityStatus(request: DayEntryPointRequest): string {
  return request.status == STATUS_COMPLETED ? STATUS_COMPLETED : STATUS_UPDATED;
}

// One immutable per-fill row. Common fields + zeroed legs; the caller fills the
// deposit or redemption legs. Call AFTER applyExecution so remainingAfter/statusAfter
// reflect the post-fill request.
function newExecution(
  request: DayEntryPointRequest,
  executorAddress: string,
  consumed: BigInt,
  protocolFeeShares: BigInt,
  event: ethereum.Event
): DayEntryPointExecution {
  const e = new DayEntryPointExecution(
    generateExecutionId(event.transaction.hash.toHexString(), event.logIndex)
  );
  e.chainId = CHAIN_ID;
  e.version = request.version;
  e.entryPointAddress = request.entryPointAddress;
  e.requestId = request.id;
  e.nonce = request.nonce;
  e.vaultAddress = request.vaultAddress;
  e.vaultId = request.vaultId;
  e.accountAddress = request.accountAddress;
  e.executorAddress = executorAddress;
  e.category = request.category;
  e.subCategory = request.subCategory;
  e.consumed = consumed;
  e.remainingAfter = request.currValue;
  e.statusAfter = request.status;
  e.protocolFeeShares = protocolFeeShares;

  e.assetsDeposited = BigInt.zero();
  e.assetsBonus = BigInt.zero();
  e.sharesMinted = BigInt.zero();
  e.sharesRedeemed = BigInt.zero();
  e.stAssetsUserClaims = BigInt.zero();
  e.jtAssetsUserClaims = BigInt.zero();
  e.ltAssetsUserClaims = BigInt.zero();
  e.stSharesUserClaims = BigInt.zero();
  e.navUserClaims = BigInt.zero();
  e.quoteAssetsUserClaims = BigInt.zero();
  e.stAssetsBonusClaims = BigInt.zero();
  e.jtAssetsBonusClaims = BigInt.zero();
  e.ltAssetsBonusClaims = BigInt.zero();
  e.stSharesBonusClaims = BigInt.zero();
  e.navBonusClaims = BigInt.zero();
  e.quoteAssetsBonusClaims = BigInt.zero();

  e.createdAtBlockNumber = event.block.number;
  e.createdAtBlockTimestamp = event.block.timestamp;
  e.createdAtTransactionHash = event.transaction.hash.toHexString();
  e.createdAtLogIndex = event.logIndex;
  e.createdAt = event.block.timestamp;
  return e;
}

// Append a row to the SHARED global_token_activity feed (the union across all
// markets). Mirrors royco-rwa's entry-point: one row per lifecycle event —
// create (pending), each fill (completed, value = this fill's primary amount),
// cancel (cancelled). `value` is passed in because it differs per event.
function addActivity(
  request: DayEntryPointRequest,
  value: BigInt,
  status: string,
  event: ethereum.Event
): void {
  const activity = new GlobalTokenActivity(
    generateGlobalTokenActivityId(
      event.transaction.hash.toHexString(),
      event.logIndex,
      request.vaultAddress,
      request.category,
      request.subCategory,
      BigInt.zero()
    )
  );
  activity.vaultId = request.vaultId;
  activity.chainId = CHAIN_ID;
  activity.vaultAddress = request.vaultAddress;
  activity.category = request.category;
  activity.subCategory = request.subCategory;
  activity.accountAddress = request.accountAddress;
  activity.type = ACTIVITY_TYPE_REQUEST;
  activity.tokenIndex = BigInt.zero();
  activity.tokenId = request.tokenId;
  activity.tokenAddress = request.tokenAddress;
  activity.value = value;
  activity.status = status;
  activity.blockNumber = event.block.number;
  activity.blockTimestamp = event.block.timestamp;
  activity.transactionHash = event.transaction.hash.toHexString();
  activity.logIndex = event.logIndex;
  activity.createdAt = event.block.timestamp;
  activity.save();
}

export function handleTrancheConfigUpdated(event: TrancheConfigUpdatedEvent): void {
  const version = getEntryPointVersion(event.address.toHexString());
  if (version.isZero()) return;

  const state = getOrCreateState(
    version,
    event.address.toHexString(),
    event.params.tranche.toHexString(),
    event.block.timestamp,
    false
  );
  if (state.depositTokenAddress == ZERO_ADDRESS) return; // asset() reverted — not a live tranche

  const config = event.params.config;
  state.isEnabled = config.enabled;
  // uint24 -> i32, needs the BigInt.fromI32 lift.
  state.depositDelaySeconds = BigInt.fromI32(config.depositDelaySeconds);
  state.redemptionDelaySeconds = BigInt.fromI32(config.redemptionDelaySeconds);
  state.oracleClockAddress = config.oracleClock.toHexString();
  state.updatedAt = event.block.timestamp;
  state.save();
}

export function handleDepositRequested(event: DepositRequestedEvent): void {
  const version = getEntryPointVersion(event.address.toHexString());
  if (version.isZero()) return;

  const state = getOrCreateState(
    version,
    event.address.toHexString(),
    event.params.tranche.toHexString(),
    event.block.timestamp,
    true
  );
  if (state.depositTokenAddress == ZERO_ADDRESS) return;

  const request = initRequest(
    version,
    event.address.toHexString(),
    event.params.nonce,
    event.params.tranche.toHexString(),
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
  addActivity(request, request.initValue, STATUS_PENDING, event);
}

export function handleDepositExecuted(event: DepositExecutedEvent): void {
  const version = getEntryPointVersion(event.address.toHexString());
  if (version.isZero()) return;

  const request = DayEntryPointRequest.load(
    generateEntryPointRequestId(event.address.toHexString(), event.params.nonce)
  );
  if (request == null) return;

  touchRequest(request, event.block.number, event.block.timestamp, event.transaction.hash.toHexString(), event.logIndex);
  // assetsDeposited is post-bonus; the escrow held the full pre-bonus amount.
  const consumed = event.params.assetsDeposited.plus(event.params.bonusAssets);
  applyExecution(request, consumed);

  request.assetsDeposited = request.assetsDeposited.plus(event.params.assetsDeposited);
  request.assetsBonus = request.assetsBonus.plus(event.params.bonusAssets);
  request.sharesMinted = request.sharesMinted.plus(event.params.sharesMinted);
  request.protocolFeeShares = request.protocolFeeShares.plus(event.params.protocolFeeShares);
  request.save();

  const exec = newExecution(request, event.params.executor.toHexString(), consumed, event.params.protocolFeeShares, event);
  exec.assetsDeposited = event.params.assetsDeposited;
  exec.assetsBonus = event.params.bonusAssets;
  exec.sharesMinted = event.params.sharesMinted;
  exec.save();

  addActivity(request, event.params.assetsDeposited, fillActivityStatus(request), event);
}

export function handleDepositRequestCancelled(event: DepositRequestCancelledEvent): void {
  const version = getEntryPointVersion(event.address.toHexString());
  if (version.isZero()) return;

  const request = DayEntryPointRequest.load(
    generateEntryPointRequestId(event.address.toHexString(), event.params.nonce)
  );
  if (request == null) return;

  touchRequest(request, event.block.number, event.block.timestamp, event.transaction.hash.toHexString(), event.logIndex);
  request.cancelReceiverAddress = event.params.receiver.toHexString();
  request.cancelledAmount = event.params.assets;
  request.status = STATUS_CANCELLED;
  request.currValue = BigInt.zero();
  request.save();
  addActivity(request, event.params.assets, STATUS_CANCELLED, event);
}

export function handleRedemptionRequested(event: RedemptionRequestedEvent): void {
  const version = getEntryPointVersion(event.address.toHexString());
  if (version.isZero()) return;

  const state = getOrCreateState(
    version,
    event.address.toHexString(),
    event.params.tranche.toHexString(),
    event.block.timestamp,
    true
  );
  if (state.depositTokenAddress == ZERO_ADDRESS) return;

  const request = initRequest(
    version,
    event.address.toHexString(),
    event.params.nonce,
    event.params.tranche.toHexString(),
    event.params.user.toHexString(),
    CATEGORY_SHARES,
    SUB_CATEGORY_WITHDRAW,
    state.shareTokenAddress, // redemptions escrow the tranche's own shares
    event.params.shares,
    event.params.executableAtTimestamp,
    event.params.executorBonusWAD,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash.toHexString(),
    event.logIndex
  );
  request.save();
  addActivity(request, request.initValue, STATUS_PENDING, event);
}

export function handleRedemptionExecuted(event: RedemptionExecutedEvent): void {
  const version = getEntryPointVersion(event.address.toHexString());
  if (version.isZero()) return;

  const request = DayEntryPointRequest.load(
    generateEntryPointRequestId(event.address.toHexString(), event.params.nonce)
  );
  if (request == null) return;

  touchRequest(request, event.block.number, event.block.timestamp, event.transaction.hash.toHexString(), event.logIndex);
  // sharesRedeemed excludes shares forfeited to the protocol; the escrow held both.
  const consumed = event.params.sharesRedeemed.plus(event.params.protocolFeeShares);
  applyExecution(request, consumed);

  request.sharesRedeemed = request.sharesRedeemed.plus(event.params.sharesRedeemed);
  request.protocolFeeShares = request.protocolFeeShares.plus(event.params.protocolFeeShares);

  const userClaims = event.params.userClaims;
  const bonusClaims = event.params.bonusClaims;
  request.stAssetsUserClaims = request.stAssetsUserClaims.plus(userClaims.stAssets);
  request.jtAssetsUserClaims = request.jtAssetsUserClaims.plus(userClaims.jtAssets);
  request.ltAssetsUserClaims = request.ltAssetsUserClaims.plus(userClaims.ltAssets);
  request.stSharesUserClaims = request.stSharesUserClaims.plus(userClaims.stShares);
  request.navUserClaims = request.navUserClaims.plus(userClaims.nav);
  request.quoteAssetsUserClaims = request.quoteAssetsUserClaims.plus(event.params.quoteAssets);
  request.stAssetsBonusClaims = request.stAssetsBonusClaims.plus(bonusClaims.stAssets);
  request.jtAssetsBonusClaims = request.jtAssetsBonusClaims.plus(bonusClaims.jtAssets);
  request.ltAssetsBonusClaims = request.ltAssetsBonusClaims.plus(bonusClaims.ltAssets);
  request.stSharesBonusClaims = request.stSharesBonusClaims.plus(bonusClaims.stShares);
  request.navBonusClaims = request.navBonusClaims.plus(bonusClaims.nav);
  request.quoteAssetsBonusClaims = request.quoteAssetsBonusClaims.plus(event.params.bonusQuoteAssets);
  request.save();

  const exec = newExecution(request, event.params.executor.toHexString(), consumed, event.params.protocolFeeShares, event);
  exec.sharesRedeemed = event.params.sharesRedeemed;
  exec.stAssetsUserClaims = userClaims.stAssets;
  exec.jtAssetsUserClaims = userClaims.jtAssets;
  exec.ltAssetsUserClaims = userClaims.ltAssets;
  exec.stSharesUserClaims = userClaims.stShares;
  exec.navUserClaims = userClaims.nav;
  exec.quoteAssetsUserClaims = event.params.quoteAssets;
  exec.stAssetsBonusClaims = bonusClaims.stAssets;
  exec.jtAssetsBonusClaims = bonusClaims.jtAssets;
  exec.ltAssetsBonusClaims = bonusClaims.ltAssets;
  exec.stSharesBonusClaims = bonusClaims.stShares;
  exec.navBonusClaims = bonusClaims.nav;
  exec.quoteAssetsBonusClaims = event.params.bonusQuoteAssets;
  exec.save();

  addActivity(request, event.params.sharesRedeemed, fillActivityStatus(request), event);
}

export function handleRedemptionRequestCancelled(event: RedemptionRequestCancelledEvent): void {
  const version = getEntryPointVersion(event.address.toHexString());
  if (version.isZero()) return;

  const request = DayEntryPointRequest.load(
    generateEntryPointRequestId(event.address.toHexString(), event.params.nonce)
  );
  if (request == null) return;

  touchRequest(request, event.block.number, event.block.timestamp, event.transaction.hash.toHexString(), event.logIndex);
  request.cancelReceiverAddress = event.params.receiver.toHexString();
  request.cancelledAmount = event.params.shares;
  request.status = STATUS_CANCELLED;
  request.currValue = BigInt.zero();
  request.save();
  addActivity(request, event.params.shares, STATUS_CANCELLED, event);
}
