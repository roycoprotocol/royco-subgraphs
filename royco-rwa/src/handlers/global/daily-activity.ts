import { BigInt } from "@graphprotocol/graph-ts";
import {
  GlobalAccountDailyActivity,
  GlobalAccountIndex,
  GlobalVaultDailyActivity,
  GlobalTokenTransfer,
} from "../../../generated/schema";
import { CHAIN_ID } from "../../constants";
import {
  generateGlobalAccountDailyActivityId,
  generateGlobalAccountIndexId,
  generateGlobalVaultDailyActivityId,
} from "../../utils";

function getDayTimestamp(blockTimestamp: BigInt): BigInt {
  let seconds = blockTimestamp.toI64();
  let daySeconds = (seconds / 86400) * 86400;
  return BigInt.fromI64(daySeconds);
}

export function updateGlobalAccountDailyActivity(
  transfer: GlobalTokenTransfer,
  accountAddress: string,
  isDeposit: boolean,
  isWithdraw: boolean,
  isTransfer: boolean,
  assetValue: BigInt
): GlobalAccountDailyActivity {
  let dayTimestamp = getDayTimestamp(transfer.blockTimestamp);
  let id = generateGlobalAccountDailyActivityId(
    transfer.vaultAddress,
    accountAddress,
    dayTimestamp
  );

  let entity = GlobalAccountDailyActivity.load(id);
  if (!entity) {
    entity = new GlobalAccountDailyActivity(id);
    entity.chainId = CHAIN_ID;
    entity.vaultAddress = transfer.vaultAddress;
    entity.vaultId = transfer.vaultId;
    entity.accountAddress = accountAddress;
    entity.dayTimestamp = dayTimestamp;
    entity.depositCount = BigInt.fromI32(0);
    entity.withdrawCount = BigInt.fromI32(0);
    entity.transferCount = BigInt.fromI32(0);
    entity.totalCount = BigInt.fromI32(0);
    entity.totalDeposited = BigInt.fromI32(0);
    entity.totalWithdrawn = BigInt.fromI32(0);
    entity.cumulativeDeposited = BigInt.fromI32(0);
    entity.cumulativeWithdrawn = BigInt.fromI32(0);
    entity.createdAt = transfer.blockTimestamp;
  }

  if (isDeposit) {
    entity.depositCount = entity.depositCount.plus(BigInt.fromI32(1));
    entity.totalDeposited = entity.totalDeposited.plus(assetValue);
  }

  if (isWithdraw) {
    entity.withdrawCount = entity.withdrawCount.plus(BigInt.fromI32(1));
    entity.totalWithdrawn = entity.totalWithdrawn.plus(assetValue);
  }

  if (isTransfer) {
    entity.transferCount = entity.transferCount.plus(BigInt.fromI32(1));
  }

  entity.totalCount = entity.totalCount.plus(BigInt.fromI32(1));

  // Update cumulative from AccountIndex (which holds running totals)
  let accountIndex = GlobalAccountIndex.load(
    generateGlobalAccountIndexId(transfer.vaultAddress, accountAddress)
  );
  if (accountIndex) {
    entity.cumulativeDeposited = accountIndex.totalDeposited;
    entity.cumulativeWithdrawn = accountIndex.totalWithdrawn;
  }

  entity.updatedAt = transfer.blockTimestamp;
  entity.save();
  return entity;
}

export function updateGlobalVaultDailyActivity(
  transfer: GlobalTokenTransfer,
  isDeposit: boolean,
  isWithdraw: boolean,
  isTransfer: boolean,
  assetValue: BigInt
): GlobalVaultDailyActivity {
  let dayTimestamp = getDayTimestamp(transfer.blockTimestamp);
  let id = generateGlobalVaultDailyActivityId(
    transfer.vaultAddress,
    dayTimestamp
  );

  let entity = GlobalVaultDailyActivity.load(id);
  if (!entity) {
    entity = new GlobalVaultDailyActivity(id);
    entity.chainId = CHAIN_ID;
    entity.vaultAddress = transfer.vaultAddress;
    entity.vaultId = transfer.vaultId;
    entity.dayTimestamp = dayTimestamp;
    entity.depositCount = BigInt.fromI32(0);
    entity.withdrawCount = BigInt.fromI32(0);
    entity.transferCount = BigInt.fromI32(0);
    entity.totalCount = BigInt.fromI32(0);
    entity.totalDeposited = BigInt.fromI32(0);
    entity.totalWithdrawn = BigInt.fromI32(0);
    entity.cumulativeDeposited = BigInt.fromI32(0);
    entity.cumulativeWithdrawn = BigInt.fromI32(0);
    entity.uniqueAccounts = BigInt.fromI32(0);
    entity.createdAt = transfer.blockTimestamp;
  }

  if (isDeposit) {
    entity.depositCount = entity.depositCount.plus(BigInt.fromI32(1));
    entity.totalDeposited = entity.totalDeposited.plus(assetValue);
  }

  if (isWithdraw) {
    entity.withdrawCount = entity.withdrawCount.plus(BigInt.fromI32(1));
    entity.totalWithdrawn = entity.totalWithdrawn.plus(assetValue);
  }

  if (isTransfer) {
    entity.transferCount = entity.transferCount.plus(BigInt.fromI32(1));
  }

  entity.totalCount = entity.totalCount.plus(BigInt.fromI32(1));

  // Update cumulative totals
  if (isDeposit) {
    entity.cumulativeDeposited = entity.cumulativeDeposited.plus(assetValue);
  }
  if (isWithdraw) {
    entity.cumulativeWithdrawn = entity.cumulativeWithdrawn.plus(assetValue);
  }

  entity.updatedAt = transfer.blockTimestamp;
  entity.save();
  return entity;
}
