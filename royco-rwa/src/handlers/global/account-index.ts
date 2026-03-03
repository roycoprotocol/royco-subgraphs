import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { GlobalAccountIndex, GlobalTokenTransfer } from "../../../generated/schema";
import { CHAIN_ID } from "../../constants";
import { generateGlobalAccountIndexId, generateVaultId } from "../../utils";

export function updateGlobalAccountIndex(
  transfer: GlobalTokenTransfer,
  accountAddress: string,
  isSender: boolean,
  isDeposit: boolean,
  isWithdraw: boolean,
  assetValue: BigInt
): GlobalAccountIndex {
  let id = generateGlobalAccountIndexId(transfer.vaultAddress, accountAddress);

  let entity = GlobalAccountIndex.load(id);
  if (!entity) {
    entity = new GlobalAccountIndex(id);
    entity.chainId = CHAIN_ID;
    entity.vaultAddress = transfer.vaultAddress;
    entity.vaultId = transfer.vaultId;
    entity.accountAddress = accountAddress;
    let hasCode = ethereum.hasCode(Address.fromString(accountAddress));
    entity.isContract = hasCode.inner == 1;
    entity.transactionCount = BigInt.fromI32(0);
    entity.sentCount = BigInt.fromI32(0);
    entity.receivedCount = BigInt.fromI32(0);
    entity.depositCount = BigInt.fromI32(0);
    entity.withdrawCount = BigInt.fromI32(0);
    entity.totalDeposited = BigInt.fromI32(0);
    entity.totalWithdrawn = BigInt.fromI32(0);
    entity.firstSeenBlock = transfer.blockNumber;
    entity.firstSeenTimestamp = transfer.blockTimestamp;
    entity.firstTransactionHash = transfer.transactionHash;
    entity.lastSeenBlock = transfer.blockNumber;
    entity.lastSeenTimestamp = transfer.blockTimestamp;
    entity.lastTransactionHash = transfer.transactionHash;
    entity.createdAt = transfer.blockTimestamp;
  }

  // Update counts
  entity.transactionCount = entity.transactionCount.plus(BigInt.fromI32(1));

  if (isSender) {
    entity.sentCount = entity.sentCount.plus(BigInt.fromI32(1));
  } else {
    entity.receivedCount = entity.receivedCount.plus(BigInt.fromI32(1));
  }

  if (isDeposit) {
    entity.depositCount = entity.depositCount.plus(BigInt.fromI32(1));
    entity.totalDeposited = entity.totalDeposited.plus(assetValue);
  }

  if (isWithdraw) {
    entity.withdrawCount = entity.withdrawCount.plus(BigInt.fromI32(1));
    entity.totalWithdrawn = entity.totalWithdrawn.plus(assetValue);
  }

  // Update last seen
  entity.lastSeenBlock = transfer.blockNumber;
  entity.lastSeenTimestamp = transfer.blockTimestamp;
  entity.lastTransactionHash = transfer.transactionHash;
  entity.updatedAt = transfer.blockTimestamp;

  entity.save();
  return entity;
}
