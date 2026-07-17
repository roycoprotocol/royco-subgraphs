import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  DayVaultState,
  DayVaultStateHistorical,
} from "../../../generated/schema";
import { RoycoSeniorTranche as TrancheContract } from "../../../generated/templates/RoycoSeniorTranche/RoycoSeniorTranche";
import { generateVaultStateHistoricalId } from "../../utils";
import { assetPriceNAV } from "./asset-price-nav";

/**
 * Copy a DayVaultState into an immutable DayVaultStateHistorical row.
 *
 * Reads the entry index off the parent rather than deriving one — two writes in
 * one block would collide on a block-derived index, and an immutable entity is
 * write-once: a second save() on the same id is a fatal "entity already exists"
 * at INDEX time, which `graph build` cannot catch (§8).
 */
export function snapshotVault(event: ethereum.Event, vault: DayVaultState): void {
  const snapshot = new DayVaultStateHistorical(
    generateVaultStateHistoricalId(
      vault.vaultAddress,
      vault.lastHistoricalEntryIndex
    )
  );

  snapshot.chainId = vault.chainId;
  snapshot.vaultAddress = vault.vaultAddress;
  snapshot.vaultId = vault.id;
  snapshot.entryIndex = vault.lastHistoricalEntryIndex;
  snapshot.majorType = vault.majorType;
  snapshot.minorType = vault.minorType;
  snapshot.marketRefId = vault.marketRefId;
  snapshot.marketId = vault.marketId;
  snapshot.sharesTotalSupply = vault.sharesTotalSupply;
  snapshot.claimsSeniorTrancheAssets = vault.claimsSeniorTrancheAssets;
  snapshot.claimsJuniorTrancheAssets = vault.claimsJuniorTrancheAssets;
  snapshot.claimsLiquidityTrancheAssets = vault.claimsLiquidityTrancheAssets;
  snapshot.claimsSeniorTrancheShares = vault.claimsSeniorTrancheShares;
  snapshot.claimsNAV = vault.claimsNAV;
  snapshot.assetPriceNAV = vault.assetPriceNAV;
  snapshot.sharePriceSeniorTrancheAssets = vault.sharePriceSeniorTrancheAssets;
  snapshot.sharePriceJuniorTrancheAssets = vault.sharePriceJuniorTrancheAssets;
  snapshot.sharePriceLiquidityTrancheAssets =
    vault.sharePriceLiquidityTrancheAssets;
  snapshot.sharePriceSeniorTrancheShares = vault.sharePriceSeniorTrancheShares;
  snapshot.sharePriceNAV = vault.sharePriceNAV;

  // Immutable entities carry only createdAt* (§8).
  snapshot.createdAtTransactionHash = event.transaction.hash.toHexString();
  snapshot.createdAtBlockNumber = event.block.number;
  snapshot.createdAtBlockTimestamp = event.block.timestamp;

  snapshot.save();
}

/**
 * Re-read every contract-sourced field on a vault: both AssetClaims quintuples
 * and assetPriceNAV.
 *
 * NO ELSE BRANCHES, deliberately. Every one of these fields was seeded by
 * handleMarketDeploymentCompleted before any tranche template event could fire,
 * so a previous value provably always exists. On revert we keep it (§5). Writing
 * zero here would destroy a good value — the factory's zero-fill is legal only
 * because creation genuinely has no previous value.
 *
 * try_ is mandatory even though these are `view`. A plain ERC20 transfer reads no
 * oracle on-chain, so the Transfer log can succeed in a block where
 * convertToAssets reverts — a stale Chainlink feed (a missed heartbeat, with no
 * market event at all) is the likeliest cause, and a kernel pause is another:
 * previewSyncTrancheAccounting is whenNotPaused, and because eth_call reads
 * end-of-block state a pause later in the same block reverts the call for an
 * event that legitimately succeeded. `view` is not revert-safety (§5).
 */
export function refreshVaultClaims(vault: DayVaultState): void {
  const tranche = TrancheContract.bind(Address.fromString(vault.vaultAddress));

  const totalClaims = tranche.try_convertToAssets(vault.sharesTotalSupply);
  if (!totalClaims.reverted) {
    vault.claimsSeniorTrancheAssets = totalClaims.value.stAssets;
    vault.claimsJuniorTrancheAssets = totalClaims.value.jtAssets;
    vault.claimsLiquidityTrancheAssets = totalClaims.value.ltAssets;
    vault.claimsSeniorTrancheShares = totalClaims.value.stShares;
    vault.claimsNAV = totalClaims.value.nav;
  }

  const oneShare = BigInt.fromI32(10).pow(u8(vault.shareTokenDecimals));
  const shareClaims = tranche.try_convertToAssets(oneShare);
  if (!shareClaims.reverted) {
    vault.sharePriceSeniorTrancheAssets = shareClaims.value.stAssets;
    vault.sharePriceJuniorTrancheAssets = shareClaims.value.jtAssets;
    vault.sharePriceLiquidityTrancheAssets = shareClaims.value.ltAssets;
    vault.sharePriceSeniorTrancheShares = shareClaims.value.stShares;
    vault.sharePriceNAV = shareClaims.value.nav;
  }

  vault.assetPriceNAV = assetPriceNAV(
    vault.marketId,
    vault.minorType,
    vault.assetTokenDecimals,
    vault.assetPriceNAV
  );
}

/**
 * Apply a supply change from a mint or a burn, then snapshot.
 *
 * `sharesTotalSupply` is an ACCUMULATOR, never a totalSupply() call. That is not
 * just cheaper, it is strictly more correct: graph-node's eth_call reads
 * END-OF-BLOCK state, so for a mint at log 2 in a block whose log 9 is a large
 * redeem, totalSupply() returns the post-redeem number and bakes a supply the
 * vault never had into a write-once historical row. The accumulator is exact at
 * this log index. It is also provably complete — every supply mutation routes
 * through ERC20._update and therefore emits Transfer.
 *
 * The claims refresh is NOT optional. claims* IS convertToAssets(sharesTotalSupply)
 * — the supply is its literal input. Bumping the input without recomputing the
 * output puts a claimsNAV priced at the old supply in the same row as the new
 * supply, so claimsNAV / sharesTotalSupply mixes two instants. That is strictly
 * worse than both being stale together.
 */
export function applySharesDelta(
  event: ethereum.Event,
  vault: DayVaultState,
  sharesDelta: BigInt
): void {
  vault.sharesTotalSupply = vault.sharesTotalSupply.plus(sharesDelta);

  refreshVaultClaims(vault);

  vault.updatedAtTransactionHash = event.transaction.hash.toHexString();
  vault.updatedAtBlockNumber = event.block.number;
  vault.updatedAtBlockTimestamp = event.block.timestamp;

  // Increment-then-write, save-then-snapshot — the same order as the factory's
  // creation path, which seeds entry 0.
  vault.lastHistoricalEntryIndex = vault.lastHistoricalEntryIndex.plus(
    BigInt.fromI32(1)
  );
  vault.save();
  snapshotVault(event, vault);
}
