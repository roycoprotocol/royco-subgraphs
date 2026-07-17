import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  DayMultiAssetDepositActivity,
  DayMultiAssetRedeemActivity,
  DayVaultState,
} from "../../../generated/schema";
import { CHAIN_ID } from "../../constants";
import { generateId, generateVaultId } from "../../utils";
import { RedeemClaims } from "../tranche";

/**
 * MultiAssetDeposit / MultiAssetRedeem — LIQUIDITY-TRANCHE-ONLY activity rows.
 *
 * These write immutable ACTIVITY rows, id = <CHAIN>_<TX>_<LOG_INDEX> (one row per
 * event log, like GlobalTokenActivity). No DayMarketState cursor: (tx, logIndex) is
 * already unique. event.address is the LIQUIDITY TRANCHE — the market columns
 * (marketId / marketRefId / vaultId) are read off this tranche's own DayVaultState,
 * an entity load rather than an eth_call to KERNEL().
 *
 * OWNS THE ACTIVITY ROW ONLY — never shares/positions/supply. Both flows emit their
 * own share Transfer at a LOWER log index (deposit: _mint(receiver) at
 * RoycoLiquidityTranche.sol:73; redeem: _burn(owner) at :105), so processTransfer
 * has already written the position and the supply delta. Re-booking here would
 * double-count. The underlying asset legs (ST/quote/LT on deposit, the ST/JT claim
 * legs + quote on redeem) move on ERC20s this subgraph does not index, so these rows
 * are their sole on-subgraph record. `shares` is guaranteed > 0 by the contract
 * (require on both paths), so every emitted event is a real deposit/redeem.
 */
export function recordMultiAssetDeposit(
  event: ethereum.Event,
  caller: Address,
  receiver: Address,
  stAssets: BigInt,
  quoteAssets: BigInt,
  ltAssetsMinted: BigInt,
  shares: BigInt
): void {
  const vaultAddress = event.address.toHexString(); // the liquidity tranche
  const vault = DayVaultState.load(generateVaultId(vaultAddress));
  // The factory is the sole creator of a DayVaultState, in the same handler that
  // spawns this template — unreachable in practice, but the market columns come off
  // the vault and there is nothing to attach the row to without it.
  if (!vault) return;

  const activity = new DayMultiAssetDepositActivity(
    generateId(event.transaction.hash.toHexString(), event.logIndex)
  );
  activity.chainId = CHAIN_ID;
  activity.marketId = vault.marketId;
  activity.marketRefId = vault.marketRefId;
  activity.vaultAddress = vaultAddress;
  activity.vaultId = vault.id;
  activity.accountAddress = receiver.toHexString(); // share-side: LT shares minted to receiver
  activity.callerAddress = caller.toHexString(); // msg.sender (may be a router/zap)
  activity.seniorTrancheAssets = stAssets; // <- ABI: stAssets (raw, pulled IN)
  activity.quoteAssets = quoteAssets; // <- ABI: quoteAssets (raw, pulled IN)
  activity.liquidityTrancheAssetsMinted = ltAssetsMinted; // <- ABI: ltAssetsMinted
  activity.shares = shares; // <- ABI: shares (LT shares minted)
  activity.createdAtTransactionHash = event.transaction.hash.toHexString();
  activity.createdAtBlockNumber = event.block.number;
  activity.createdAtBlockTimestamp = event.block.timestamp;
  activity.save();
}

export function recordMultiAssetRedeem(
  event: ethereum.Event,
  caller: Address,
  receiver: Address,
  owner: Address,
  shares: BigInt,
  claims: RedeemClaims,
  quoteAssets: BigInt
): void {
  const vaultAddress = event.address.toHexString(); // the liquidity tranche
  const vault = DayVaultState.load(generateVaultId(vaultAddress));
  if (!vault) return;

  const activity = new DayMultiAssetRedeemActivity(
    generateId(event.transaction.hash.toHexString(), event.logIndex)
  );
  activity.chainId = CHAIN_ID;
  activity.marketId = vault.marketId;
  activity.marketRefId = vault.marketRefId;
  activity.vaultAddress = vaultAddress;
  activity.vaultId = vault.id;
  activity.accountAddress = owner.toHexString(); // share-side: whose LT shares are burned
  activity.callerAddress = caller.toHexString(); // msg.sender (spends owner's allowance if != owner)
  activity.receiverAddress = receiver.toHexString(); // who the assets are paid to
  activity.shares = shares; // <- ABI: shares (LT shares burned)
  // stClaims is the kernel's SENIOR claim: stShares and ltAssets are invariantly 0
  // (the SENIOR branch never sets the two LT-only fields), nav is the senior
  // effective NAV pro-rata. Copied verbatim; see the schema comment.
  activity.claimsSeniorTrancheAssets = claims.stAssets; // <- ABI: stClaims.stAssets
  activity.claimsJuniorTrancheAssets = claims.jtAssets; // <- ABI: stClaims.jtAssets
  activity.claimsLiquidityTrancheAssets = claims.ltAssets; // <- ABI: stClaims.ltAssets (invariantly 0)
  activity.claimsSeniorTrancheShares = claims.stShares; // <- ABI: stClaims.stShares (invariantly 0)
  activity.claimsNAV = claims.nav; // <- ABI: stClaims.nav (senior effective NAV, pro-rata)
  activity.quoteAssets = quoteAssets; // <- ABI: quoteAssets (paid OUT to receiver)
  activity.createdAtTransactionHash = event.transaction.hash.toHexString();
  activity.createdAtBlockNumber = event.block.number;
  activity.createdAtBlockTimestamp = event.block.timestamp;
  activity.save();
}
