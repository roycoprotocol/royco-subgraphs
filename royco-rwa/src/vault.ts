import {
  Transfer as TransferEvent,
  Deposit as DepositEvent,
  Withdraw as WithdrawEvent,
  BaseVault,
} from "../generated/Vault/BaseVault";
import {
  CATEGORY_ASSETS,
  CATEGORY_SHARES,
  SUB_CATEGORY_BURN,
  SUB_CATEGORY_DEPOSIT,
  SUB_CATEGORY_MINT,
  SUB_CATEGORY_TRANSFER,
  SUB_CATEGORY_TRANSFER_IN,
  SUB_CATEGORY_TRANSFER_OUT,
  SUB_CATEGORY_WITHDRAW,
  UPDATE_TYPE_MULTIPLIER,
  ZERO_ADDRESS,
} from "./constants";
import { processGlobalTokenTransfer } from "./handlers/base/process-transfer";
import { updateMetricTotalSupply } from "./handlers/metrics/total-supply";
import {
  addPositionStateHistorical,
  getPositionState,
  updatePosition,
} from "./handlers/base/update-position";
import { addTransferActivity } from "./handlers/activities/transfer";
import { BigInt } from "@graphprotocol/graph-ts";
import { updateMetricDepositors } from "./handlers/metrics/depositors";
import { generateTokenId } from "./utils";
import { MarketVaultMap, VaultState } from "../generated/schema";
import { updateMetricTransfers } from "./handlers/metrics/transfers";
import { VAULT_MAJOR_TYPE, VAULT_MINOR_TYPE } from "./constants";

export function handleTransfer(event: TransferEvent): void {
  const fromAddress = event.params.from.toHexString();
  const toAddress = event.params.to.toHexString();

  if (fromAddress == toAddress) return;

  let subCategory = SUB_CATEGORY_TRANSFER;
  if (fromAddress == ZERO_ADDRESS) {
    subCategory = SUB_CATEGORY_MINT;
  } else if (toAddress == ZERO_ADDRESS) {
    subCategory = SUB_CATEGORY_BURN;
  }

  let transfer = processGlobalTokenTransfer(
    event.address.toHexString(),
    CATEGORY_SHARES,
    subCategory,
    fromAddress,
    toAddress,
    event.params.value,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash.toHexString(),
    event.logIndex,
    true
  );

  let vaultState = VaultState.load(transfer.vaultId);
  if (!vaultState) {
    vaultState = new VaultState(transfer.vaultId);
    vaultState.chainId = transfer.chainId;
    vaultState.vaultAddress = transfer.vaultAddress;

    const contract = BaseVault.bind(event.address);
    const depositTokenAddress = contract.asset().toHexString();
    vaultState.depositTokenId = generateTokenId(depositTokenAddress);
    vaultState.depositTokenAddress = depositTokenAddress;

    const decimals = contract.decimals();
    vaultState.decimals = decimals;

    if (VAULT_MAJOR_TYPE.length > 0) {
      vaultState.majorType = VAULT_MAJOR_TYPE;
    }

    if (VAULT_MINOR_TYPE.length > 0) {
      vaultState.minorType = VAULT_MINOR_TYPE;
    }

    const marketVault = MarketVaultMap.load(transfer.vaultId);
    if (marketVault) {
      vaultState.marketRefId = marketVault.marketRefId;
      vaultState.marketId = marketVault.marketId;
      vaultState.majorType = marketVault.majorType;
      vaultState.minorType = marketVault.minorType;
      vaultState.partnerVaultId = marketVault.partnerVaultId;
      vaultState.partnerVaultAddress = marketVault.partnerVaultAddress;
    }

    vaultState.transfers = BigInt.fromI32(0);
    vaultState.totalSupply = BigInt.fromI32(0);
    vaultState.depositors = BigInt.fromI32(0);
    vaultState.blockNumber = transfer.blockNumber;
    vaultState.blockTimestamp = transfer.blockTimestamp;
    vaultState.createdAt = transfer.blockTimestamp;
  }

  // Update depositors
  let metricDepositors = updateMetricDepositors(transfer);
  vaultState.depositors = metricDepositors.value;

  // Update transfers
  let metricTransfers = updateMetricTransfers(transfer);
  vaultState.transfers = metricTransfers.value;

  if (subCategory == SUB_CATEGORY_MINT || subCategory == SUB_CATEGORY_BURN) {
    let accountAddress = transfer.toAddress;
    if (subCategory == SUB_CATEGORY_BURN) {
      accountAddress = transfer.fromAddress;
    }

    let positionLatest = updatePosition(
      transfer,
      subCategory, // transfer category (mint or burn)
      CATEGORY_SHARES, // position category
      UPDATE_TYPE_MULTIPLIER
    );

    let positionState = getPositionState(
      transfer.vaultAddress,
      accountAddress,
      transfer.blockTimestamp
    );
    positionState.shares = positionLatest.value;
    positionState.save();
    addPositionStateHistorical(positionState, transfer.blockTimestamp);

    addTransferActivity(transfer, subCategory);

    let metricTotalSupply = updateMetricTotalSupply(transfer);
    vaultState.totalSupply = metricTotalSupply.value;
  } else {
    let positionLatest1 = updatePosition(
      transfer,
      SUB_CATEGORY_TRANSFER_OUT, // transfer sub category
      CATEGORY_SHARES, // position category
      UPDATE_TYPE_MULTIPLIER
    );

    let positionState1 = getPositionState(
      transfer.vaultAddress,
      transfer.fromAddress,
      transfer.blockTimestamp
    );
    positionState1.shares = positionLatest1.value;
    positionState1.save();

    addTransferActivity(transfer, SUB_CATEGORY_TRANSFER_OUT);

    let positionLatest2 = updatePosition(
      transfer,
      SUB_CATEGORY_TRANSFER_IN, // transfer sub category
      CATEGORY_SHARES, // position category
      UPDATE_TYPE_MULTIPLIER
    );

    let positionState2 = getPositionState(
      transfer.vaultAddress,
      transfer.toAddress,
      transfer.blockTimestamp
    );
    positionState2.shares = positionLatest2.value;
    positionState2.save();

    addTransferActivity(transfer, SUB_CATEGORY_TRANSFER_IN);
  }

  vaultState.updatedAt = transfer.blockTimestamp;
  vaultState.save();
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
