import { Address, BigInt } from "@graphprotocol/graph-ts";
import { GlobalTokenTransfer, VaultState } from "../../../generated/schema";
import { CATEGORY_ASSETS, CATEGORY_SHARES, CHAIN_ID } from "../../constants";
import { generateId, generateTokenId, generateVaultId } from "../../utils";
import { BaseVault } from "../../../generated/BaseVault/BaseVault";

export function processGlobalTokenTransfer(
  vaultAddress: string,
  category: string,
  subCategory: string,
  fromAddress: string,
  toAddress: string,
  value: BigInt,
  blockNumber: BigInt,
  blockTimestamp: BigInt,
  transactionHash: string,
  logIndex: BigInt,
  save: boolean
): GlobalTokenTransfer {
  let entity = new GlobalTokenTransfer(generateId(transactionHash, logIndex));
  entity.vaultId = generateVaultId(vaultAddress);
  entity.chainId = CHAIN_ID;
  entity.vaultAddress = vaultAddress;
  entity.category = category;
  entity.subCategory = subCategory;

  if (category == CATEGORY_SHARES) {
    entity.tokenId = generateTokenId(vaultAddress);
    entity.tokenAddress = vaultAddress;
  } else if (entity.category == CATEGORY_ASSETS) {
    let vaultId = generateVaultId(vaultAddress);
    let vaultState = VaultState.load(vaultId);

    if (vaultState) {
      entity.tokenId = vaultState.depositTokenId;
      entity.tokenAddress = vaultState.depositTokenAddress;
    } else {
      let contract = BaseVault.bind(Address.fromString(vaultAddress));
      let depositTokenAddress = contract.asset().toHexString();
      entity.tokenId = generateTokenId(depositTokenAddress);
      entity.tokenAddress = depositTokenAddress;
    }
  }

  entity.fromAddress = fromAddress;
  entity.toAddress = toAddress;
  entity.value = value;
  entity.blockNumber = blockNumber;
  entity.blockTimestamp = blockTimestamp;
  entity.transactionHash = transactionHash;
  entity.logIndex = logIndex;
  entity.createdAt = blockTimestamp;

  if (save) {
    entity.save();
  }

  return entity;
}
