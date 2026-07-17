import { BigInt } from "@graphprotocol/graph-ts";
import { GlobalTokenTransfer } from "../../../generated/schema";
import { CHAIN_ID } from "../../constants";
import { generateGlobalTokenTransferId } from "../../utils";

// =============================================================================
// OWNERSHIP INVARIANT — read before touching any tranche handler.
//
// THE THREE SHARED HANDLERS (processTransfer / processDeposit / processRedeem)
// OWN ALL SHARE, POSITION AND SUPPLY ACCOUNTING FOR A TRANCHE.
//
// handleProtocolFeeSharesMinted and handleLiquidityPremiumSharesMinted write
// DayFeeState(+Historical) and NOTHING ELSE. mintProtocolFeeShares calls _mint
// BEFORE it emits its own event, and _mint routes through ERC20._update, which
// emits Transfer(0x0 -> recipient). So by the time a fee handler runs,
// processTransfer's mint branch has ALREADY written the recipient's
// DayPositionState and bumped sharesTotalSupply.
//
// A later author "fixing" a fee handler to also bump shares double-counts, in
// silence, forever. That is why this note is here and not in a commit message.
// =============================================================================

/**
 * Build a GlobalTokenTransfer row.
 *
 * `save = false` is not a convenience: processRedeem needs the row's shape to
 * derive its activity rows from, without persisting it. See its own note.
 *
 * Callers pass tokenId/tokenAddress rather than having this function resolve
 * them. royco-rwa binds the vault and calls `asset()` here — an eth_call per
 * deposit. Every caller in royco-day already holds a loaded DayVaultState, which
 * carries both, so the call is pure waste.
 */
export function processGlobalTokenTransfer(
  vaultId: string,
  vaultAddress: string,
  category: string,
  subCategory: string,
  tokenId: string,
  tokenAddress: string,
  fromAddress: string,
  toAddress: string,
  value: BigInt,
  tokenIndex: i32,
  blockNumber: BigInt,
  blockTimestamp: BigInt,
  transactionHash: string,
  logIndex: BigInt,
  save: boolean
): GlobalTokenTransfer {
  const entity = new GlobalTokenTransfer(
    generateGlobalTokenTransferId(
      transactionHash,
      logIndex,
      BigInt.fromI32(tokenIndex)
    )
  );

  entity.vaultId = vaultId;
  entity.chainId = CHAIN_ID;
  entity.vaultAddress = vaultAddress;
  entity.category = category;
  entity.subCategory = subCategory;
  entity.tokenId = tokenId;
  entity.tokenAddress = tokenAddress;
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
