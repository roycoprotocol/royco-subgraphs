import { BigInt } from "@graphprotocol/graph-ts";
import {
  GlobalTokenTransfer,
  GlobalVaultTransactionMap,
} from "../../../generated/schema";
import { CHAIN_ID } from "../../constants";
import {
  generateGlobalTransactionLogId,
  generateGlobalVaultTransactionMapId,
  generateVaultId,
} from "../../utils";

export function updateGlobalVaultTransactionMap(
  vaultAddress: string,
  transactionHash: string,
  blockNumber: BigInt,
  blockTimestamp: BigInt
): GlobalVaultTransactionMap | null {
  let id = generateGlobalVaultTransactionMapId(vaultAddress, transactionHash);

  let entity = GlobalVaultTransactionMap.load(id);
  if (entity) {
    return entity;
  }

  entity = new GlobalVaultTransactionMap(id);
  entity.chainId = CHAIN_ID;
  entity.vaultAddress = vaultAddress;
  entity.vaultId = generateVaultId(vaultAddress);
  entity.transactionHash = transactionHash;
  entity.transactionIndexId = generateGlobalTransactionLogId(transactionHash);
  entity.blockNumber = blockNumber;
  entity.blockTimestamp = blockTimestamp;
  entity.createdAt = blockTimestamp;

  entity.save();
  return entity;
}
