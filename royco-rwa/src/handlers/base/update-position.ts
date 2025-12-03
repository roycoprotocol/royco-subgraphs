import { BigInt } from "@graphprotocol/graph-ts";
import {
  PositionHistorical,
  PositionLatest,
  GlobalTokenTransfer,
  PositionState,
  VaultState,
  PositionRequestLatest,
  PositionStateHistorical,
} from "../../../generated/schema";
import {
  ZERO_ADDRESS,
  UPDATE_TYPE_OVERRIDE,
  UPDATE_TYPE_MULTIPLIER,
  SUB_CATEGORY_MINT,
  SUB_CATEGORY_TRANSFER_IN,
  SUB_CATEGORY_BURN,
  SUB_CATEGORY_TRANSFER_OUT,
  CHAIN_ID,
  CATEGORY_ASSETS,
} from "../../constants";
import {
  generatePositionLatestId,
  generatePositionHistoricalId,
  generateTokenId,
  generatePositionStateId,
  generateVaultId,
  generatePositionRequestLatestId,
  generatePositionStateHistoricalId,
} from "../../utils";
import { BaseVault } from "../../../generated/Vault/BaseVault";
import { Address } from "@graphprotocol/graph-ts";

export function addPositionHistorical(
  transfer: GlobalTokenTransfer,
  positionLatest: PositionLatest
): PositionHistorical {
  // Update historical position
  let positionHistoricalId = generatePositionHistoricalId(
    transfer.transactionHash,
    transfer.logIndex,
    positionLatest.vaultAddress,
    positionLatest.accountAddress,
    positionLatest.category
  );
  let positionHistorical = new PositionHistorical(positionHistoricalId);
  positionHistorical.vaultId = positionLatest.vaultId;
  positionHistorical.chainId = positionLatest.chainId;
  positionHistorical.vaultAddress = positionLatest.vaultAddress;
  positionHistorical.accountAddress = positionLatest.accountAddress;
  positionHistorical.category = positionLatest.category;
  positionHistorical.tokenId = positionLatest.tokenId;
  positionHistorical.tokenAddress = positionLatest.tokenAddress;
  positionHistorical.value = positionLatest.value;
  positionHistorical.blockNumber = transfer.blockNumber;
  positionHistorical.blockTimestamp = transfer.blockTimestamp;
  positionHistorical.transactionHash = transfer.transactionHash;
  positionHistorical.logIndex = transfer.logIndex;
  positionHistorical.createdAt = transfer.blockTimestamp;
  positionHistorical.save();

  return positionHistorical;
}

export function addPositionStateHistorical(
  positionState: PositionState,
  blockTimestamp: BigInt
): PositionStateHistorical {
  let positionStateHistoricalId = generatePositionStateHistoricalId(
    positionState.vaultAddress,
    positionState.accountAddress,
    blockTimestamp
  );
  let positionStateHistorical = new PositionStateHistorical(
    positionStateHistoricalId
  );
  positionStateHistorical.vaultId = positionState.vaultId;
  positionStateHistorical.chainId = positionState.chainId;
  positionStateHistorical.vaultAddress = positionState.vaultAddress;
  positionStateHistorical.accountAddress = positionState.accountAddress;
  positionStateHistorical.shareTokenId = positionState.shareTokenId;
  positionStateHistorical.shareTokenAddress = positionState.shareTokenAddress;
  positionStateHistorical.assetTokenId = positionState.assetTokenId;
  positionStateHistorical.assetTokenAddress = positionState.assetTokenAddress;
  positionStateHistorical.shares = positionState.shares;
  positionStateHistorical.assetsOwed = positionState.assetsOwed;
  positionStateHistorical.sharesOwed = positionState.sharesOwed;
  positionStateHistorical.cancelledAssetsOwed =
    positionState.cancelledAssetsOwed;
  positionStateHistorical.cancelledSharesOwed =
    positionState.cancelledSharesOwed;
  positionStateHistorical.earningsShares = positionState.earningsShares;
  positionStateHistorical.earningsAssets = positionState.earningsAssets;
  positionStateHistorical.blockTimestamp = blockTimestamp;
  positionStateHistorical.save();

  return positionStateHistorical;
}

export function getPositionState(
  vaultAddress: string,
  accountAddress: string,
  blockTimestamp: BigInt
): PositionState {
  let positionStateId = generatePositionStateId(vaultAddress, accountAddress);

  let positionState = PositionState.load(positionStateId);
  if (!positionState) {
    positionState = new PositionState(positionStateId);
    positionState.vaultId = generateVaultId(vaultAddress);
    positionState.chainId = CHAIN_ID;
    positionState.vaultAddress = vaultAddress;
    positionState.accountAddress = accountAddress;
    positionState.shareTokenId = generateTokenId(vaultAddress);
    positionState.shareTokenAddress = vaultAddress;

    let vaultStateId = generateVaultId(vaultAddress);
    let vaultState = VaultState.load(vaultStateId);

    if (!vaultState) {
      const contract = BaseVault.bind(Address.fromString(vaultAddress));
      const assetTokenAddress = contract.asset().toHexString();
      const assetTokenId = generateTokenId(assetTokenAddress);
      positionState.assetTokenId = assetTokenId;
      positionState.assetTokenAddress = assetTokenAddress;
    } else {
      positionState.assetTokenId = vaultState.depositTokenId;
      positionState.assetTokenAddress = vaultState.depositTokenAddress;
    }

    positionState.shares = BigInt.fromI32(0);
    positionState.assetsOwed = BigInt.fromI32(0);
    positionState.sharesOwed = BigInt.fromI32(0);
    positionState.cancelledAssetsOwed = BigInt.fromI32(0);
    positionState.cancelledSharesOwed = BigInt.fromI32(0);
    positionState.createdAt = blockTimestamp;
  }
  positionState.updatedAt = blockTimestamp;

  return positionState;
}

export function updatePosition(
  transfer: GlobalTokenTransfer,
  transferSubCategoryToUpdate: string,
  positionCategory: string,
  updateType: string
): PositionLatest {
  let accountAddress = ZERO_ADDRESS;
  let multiplier = BigInt.fromI32(1);

  if (
    transferSubCategoryToUpdate == SUB_CATEGORY_MINT ||
    transferSubCategoryToUpdate == SUB_CATEGORY_TRANSFER_IN
  ) {
    accountAddress = transfer.toAddress;
    multiplier = BigInt.fromI32(1);
  } else if (
    transferSubCategoryToUpdate == SUB_CATEGORY_BURN ||
    transferSubCategoryToUpdate == SUB_CATEGORY_TRANSFER_OUT
  ) {
    accountAddress = transfer.fromAddress;
    multiplier = BigInt.fromI32(-1);
  }

  let positionLatestId = generatePositionLatestId(
    transfer.vaultAddress,
    accountAddress,
    positionCategory
  );
  let positionLatest = PositionLatest.load(positionLatestId);
  if (!positionLatest) {
    positionLatest = new PositionLatest(positionLatestId);
    positionLatest.vaultId = transfer.vaultId;
    positionLatest.chainId = transfer.chainId;
    positionLatest.vaultAddress = transfer.vaultAddress;
    positionLatest.accountAddress = accountAddress;
    positionLatest.category = positionCategory;
    positionLatest.tokenId = transfer.tokenId;
    positionLatest.tokenAddress = transfer.tokenAddress;
    positionLatest.value = BigInt.fromI32(0);
    positionLatest.createdAt = transfer.blockTimestamp;
  }

  if (updateType == UPDATE_TYPE_OVERRIDE) {
    positionLatest.value = transfer.value;
  } else if (updateType == UPDATE_TYPE_MULTIPLIER) {
    positionLatest.value = positionLatest.value.plus(
      transfer.value.times(multiplier)
    );
  }
  positionLatest.blockTimestamp = transfer.blockTimestamp;
  positionLatest.updatedAt = transfer.blockTimestamp;
  positionLatest.save();

  addPositionHistorical(transfer, positionLatest);

  return positionLatest;
}

export function getPositionRequestLatest(
  vaultAddress: string,
  accountAddress: string,
  category: string,
  requestId: string,
  requestStatus: string,
  blockNumber: BigInt,
  blockTimestamp: BigInt,
  transactionHash: string,
  logIndex: BigInt
): PositionRequestLatest {
  let positionRequestLatestId = generatePositionRequestLatestId(
    vaultAddress,
    category,
    requestId
  );
  let positionRequestLatest = PositionRequestLatest.load(
    positionRequestLatestId
  );
  if (!positionRequestLatest) {
    positionRequestLatest = new PositionRequestLatest(positionRequestLatestId);
    positionRequestLatest.vaultId = generateVaultId(vaultAddress);
    positionRequestLatest.chainId = CHAIN_ID;
    positionRequestLatest.vaultAddress = vaultAddress;
    positionRequestLatest.accountAddress = accountAddress;
    positionRequestLatest.category = category;

    let assetTokenId = "";
    let assetTokenAddress = "";
    let shareTokenId = generateTokenId(vaultAddress);
    let shareTokenAddress = vaultAddress;

    let vaultStateId = generateVaultId(vaultAddress);
    let vaultState = VaultState.load(vaultStateId);

    if (!vaultState) {
      const contract = BaseVault.bind(Address.fromString(vaultAddress));
      assetTokenAddress = contract.asset().toHexString();
      assetTokenId = generateTokenId(assetTokenAddress);
    } else {
      assetTokenId = vaultState.depositTokenId;
      assetTokenAddress = vaultState.depositTokenAddress;
    }

    if (category == CATEGORY_ASSETS) {
      positionRequestLatest.tokenId = assetTokenId;
      positionRequestLatest.tokenAddress = assetTokenAddress;
    } else {
      positionRequestLatest.tokenId = shareTokenId;
      positionRequestLatest.tokenAddress = shareTokenAddress;
    }

    positionRequestLatest.value = BigInt.fromI32(0);
    positionRequestLatest.createdAt = blockTimestamp;
  }
  positionRequestLatest.requestId = requestId;
  positionRequestLatest.requestStatus = requestStatus;
  positionRequestLatest.blockNumber = blockNumber;
  positionRequestLatest.blockTimestamp = blockTimestamp;
  positionRequestLatest.transactionHash = transactionHash;
  positionRequestLatest.logIndex = logIndex;
  positionRequestLatest.updatedAt = blockTimestamp;

  return positionRequestLatest;
}
