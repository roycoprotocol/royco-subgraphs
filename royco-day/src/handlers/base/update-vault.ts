import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  DayVaultState,
  DayVaultStateHistorical,
} from "../../../generated/schema";
import { generateVaultStateHistoricalId } from "../../utils";

/**
 * Copy a DayVaultState into an immutable DayVaultStateHistorical row.
 *
 * Reads the entry index off the parent rather than deriving one — two writes in
 * one block would collide on a block-derived index, and an immutable entity is
 * write-once: a second save() on the same id is a fatal "entity already exists"
 * at INDEX time, which `graph build` cannot catch (§8).
 */
export function snapshotVault(event: ethereum.Event, vault: DayVaultState): void {
  // ONE ROW PER (VAULT, BLOCK). Several mints or burns can share a block; the row keeps
  // the vault's state at the END of it. See "BLOCK-KEYED HISTORY" in schema.graphql.
  const id = generateVaultStateHistoricalId(
    vault.vaultAddress,
    event.block.number
  );
  let snapshot = DayVaultStateHistorical.load(id);

  if (!snapshot) {
    snapshot = new DayVaultStateHistorical(id);
    // entryIndex is fixed at creation; the caller already advanced the cursor for a new
    // block, and must NOT have advanced it for an update.
    snapshot.entryIndex = vault.lastHistoricalEntryIndex;
    snapshot.blockNumber = event.block.number;
    snapshot.createdAtTransactionHash = event.transaction.hash.toHexString();
    snapshot.createdAtBlockNumber = event.block.number;
    snapshot.createdAtBlockTimestamp = event.block.timestamp;
  }

  snapshot.chainId = vault.chainId;
  snapshot.vaultAddress = vault.vaultAddress;
  snapshot.vaultId = vault.id;
  snapshot.majorType = vault.majorType;
  snapshot.minorType = vault.minorType;
  snapshot.marketRefId = vault.marketRefId;
  snapshot.marketId = vault.marketId;
  snapshot.sharesTotalSupply = vault.sharesTotalSupply;

  snapshot.updatedAtTransactionHash = event.transaction.hash.toHexString();
  snapshot.updatedAtBlockNumber = event.block.number;
  snapshot.updatedAtBlockTimestamp = event.block.timestamp;

  snapshot.save();
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
 * ZERO eth_calls. This used to refresh two AssetClaims quintuples (whose literal input
 * WAS sharesTotalSupply, so they had to move with it) and then just assetPriceNAV; all
 * of those columns are gone from DayVaultState, so there is nothing left to read from
 * chain here. Every price now lives on DayMarketNav. A mint or a burn is pure
 * bookkeeping: add the delta, stamp, snapshot.
 */
export function applySharesDelta(
  event: ethereum.Event,
  vault: DayVaultState,
  sharesDelta: BigInt
): void {
  vault.sharesTotalSupply = vault.sharesTotalSupply.plus(sharesDelta);

  vault.updatedAtTransactionHash = event.transaction.hash.toHexString();
  vault.updatedAtBlockNumber = event.block.number;
  vault.updatedAtBlockTimestamp = event.block.timestamp;

  // Advance the cursor ONLY when this block has no row yet. A second mint in the same
  // block updates the existing snapshot, and bumping here would push the cursor past
  // the row count permanently (rule 2 of "BLOCK-KEYED HISTORY").
  const existing = DayVaultStateHistorical.load(
    generateVaultStateHistoricalId(vault.vaultAddress, event.block.number)
  );
  if (!existing) {
    vault.lastHistoricalEntryIndex = vault.lastHistoricalEntryIndex.plus(
      BigInt.fromI32(1)
    );
  }
  vault.save();
  snapshotVault(event, vault);
}
