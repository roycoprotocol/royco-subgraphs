import { GlobalTokenTransfer, GlobalVaultTransactionMap } from "../../../generated/schema";
import { CHAIN_ID } from "../../constants";
import {
  generateGlobalTransactionLogId,
  generateGlobalVaultTransactionMapId,
} from "../../utils";

export function updateGlobalVaultTransactionMap(
  transfer: GlobalTokenTransfer
): GlobalVaultTransactionMap | null {
  let id = generateGlobalVaultTransactionMapId(
    transfer.vaultAddress,
    transfer.transactionHash
  );

  let entity = GlobalVaultTransactionMap.load(id);
  if (entity) {
    return entity;
  }

  entity = new GlobalVaultTransactionMap(id);
  entity.chainId = CHAIN_ID;
  entity.vaultAddress = transfer.vaultAddress;
  entity.vaultId = transfer.vaultId;
  entity.transactionHash = transfer.transactionHash;
  entity.transactionIndexId = generateGlobalTransactionLogId(
    transfer.transactionHash
  );
  entity.blockNumber = transfer.blockNumber;
  entity.blockTimestamp = transfer.blockTimestamp;
  entity.createdAt = transfer.blockTimestamp;

  entity.save();
  return entity;
}
