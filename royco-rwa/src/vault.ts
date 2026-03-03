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
import { VaultState } from "../generated/schema";
import { updateMetricTransfers } from "./handlers/metrics/transfers";
import { VAULT_MAJOR_TYPE, VAULT_MINOR_TYPE } from "./constants";
import { updateGlobalTransactionLog } from "./handlers/global/transaction-log";
import { updateGlobalVaultTransactionMap } from "./handlers/global/vault-transaction-map";
import { updateGlobalBlockLog } from "./handlers/global/block-log";
import { addGlobalEventLog } from "./handlers/global/event-log";
import { updateGlobalAccountIndex } from "./handlers/global/account-index";
import {
  updateGlobalAccountDailyActivity,
  updateGlobalVaultDailyActivity,
} from "./handlers/global/daily-activity";

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

    vaultState.majorType = VAULT_MAJOR_TYPE;
    vaultState.minorType = VAULT_MINOR_TYPE;

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
    addPositionStateHistorical(positionState1, transfer.blockTimestamp);

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
    addPositionStateHistorical(positionState2, transfer.blockTimestamp);

    addTransferActivity(transfer, SUB_CATEGORY_TRANSFER_IN);
  }

  vaultState.updatedAt = transfer.blockTimestamp;
  vaultState.save();

  // Global index handlers
  updateGlobalTransactionLog(event);
  updateGlobalVaultTransactionMap(
    transfer.vaultAddress,
    transfer.transactionHash,
    transfer.blockNumber,
    transfer.blockTimestamp
  );
  updateGlobalBlockLog(event);
  addGlobalEventLog(event);

  let isTransferType = subCategory == SUB_CATEGORY_TRANSFER;
  let transferAssetValue = BigInt.fromI32(0);

  if (fromAddress != ZERO_ADDRESS) {
    updateGlobalAccountIndex(
      transfer,
      fromAddress,
      true,
      false,
      false,
      transferAssetValue
    );
    updateGlobalAccountDailyActivity(
      transfer,
      fromAddress,
      false,
      false,
      isTransferType,
      transferAssetValue
    );
  }
  if (toAddress != ZERO_ADDRESS) {
    updateGlobalAccountIndex(
      transfer,
      toAddress,
      false,
      false,
      false,
      transferAssetValue
    );
    updateGlobalAccountDailyActivity(
      transfer,
      toAddress,
      false,
      false,
      isTransferType,
      transferAssetValue
    );
  }

  updateGlobalVaultDailyActivity(
    transfer,
    false,
    false,
    isTransferType,
    transferAssetValue
  );
}

export function handleDeposit(event: DepositEvent): void {
  // Global index handlers
  updateGlobalVaultTransactionMap(
    event.address.toHexString(),
    event.transaction.hash.toHexString(),
    event.block.number,
    event.block.timestamp
  );
  updateGlobalTransactionLog(event);
  updateGlobalBlockLog(event);
  addGlobalEventLog(event);

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

  let depositAssetValue = event.params.assets;
  let depositorAddress = transfer.fromAddress;
  updateGlobalAccountIndex(
    transfer,
    depositorAddress,
    true,
    true,
    false,
    depositAssetValue
  );
  updateGlobalAccountDailyActivity(
    transfer,
    depositorAddress,
    true,
    false,
    false,
    depositAssetValue
  );
  updateGlobalVaultDailyActivity(
    transfer,
    true,
    false,
    false,
    depositAssetValue
  );
}

export function handleWithdraw(event: WithdrawEvent): void {
  // Global index handlers
  updateGlobalVaultTransactionMap(
    event.address.toHexString(),
    event.transaction.hash.toHexString(),
    event.block.number,
    event.block.timestamp
  );
  updateGlobalTransactionLog(event);
  updateGlobalBlockLog(event);
  addGlobalEventLog(event);

  let transfer = processGlobalTokenTransfer(
    event.address.toHexString(),
    CATEGORY_ASSETS,
    SUB_CATEGORY_WITHDRAW,
    event.address.toHexString(),
    event.params.receiver.toHexString(),
    event.params.assets,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash.toHexString(),
    event.logIndex,
    true
  );
  addTransferActivity(transfer, SUB_CATEGORY_WITHDRAW);

  // Update global index handlers
  let withdrawAssetValue = event.params.assets;
  let receiverAddress = transfer.toAddress;
  updateGlobalAccountIndex(
    transfer,
    receiverAddress,
    false,
    false,
    true,
    withdrawAssetValue
  );
  updateGlobalAccountDailyActivity(
    transfer,
    receiverAddress,
    false,
    true,
    false,
    withdrawAssetValue
  );
  updateGlobalVaultDailyActivity(
    transfer,
    false,
    true,
    false,
    withdrawAssetValue
  );
}
