import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  DayPositionState,
  DayPositionStateHistorical,
  DayVaultState,
} from "../../../generated/schema";
import { RoycoSeniorTranche as TrancheContract } from "../../../generated/templates/RoycoSeniorTranche/RoycoSeniorTranche";
import { CHAIN_ID, ZERO_ADDRESS } from "../../constants";
import {
  generatePositionStateHistoricalId,
  generatePositionStateId,
} from "../../utils";

/**
 * Move one account's share balance on one vault, then snapshot it.
 *
 * `shares` is an ACCUMULATOR, never a balanceOf() call — same argument as
 * sharesTotalSupply in ./update-vault.ts: eth_call reads end-of-block state and
 * would bake a balance the account never held at this log index into a write-once
 * historical row. Every balance change routes through ERC20._update, so the
 * accumulator is provably complete.
 *
 * Called at most twice per Transfer (once per side), STRICTLY SEQUENTIALLY: each
 * account must be fully loaded, mutated, snapshotted and saved before the next
 * begins. Two live handles on one row would both read the same cursor, both
 * compute the same +1, and the second save() of an identical immutable
 * DayPositionStateHistorical id is fatal at index time.
 */
export function updatePosition(
  event: ethereum.Event,
  vault: DayVaultState,
  accountAddress: string,
  sharesDelta: BigInt
): void {
  // THE GUARD THAT SILENTLY CORRUPTS IF OMITTED. 0x0 is the counterparty of every
  // mint and burn; a position keyed on it would accumulate the whole market's
  // supply and read as a real whale in Neon. It doesn't crash — it just lies.
  if (accountAddress == ZERO_ADDRESS) return;

  const id = generatePositionStateId(vault.vaultAddress, accountAddress);
  let position = DayPositionState.load(id);
  const isNew = position == null;

  if (!position) {
    position = new DayPositionState(id);
    position.vaultId = vault.id;
    position.chainId = CHAIN_ID;
    position.vaultAddress = vault.vaultAddress;
    position.accountAddress = accountAddress;
    position.shares = BigInt.zero();
    // Seed all five: unlike a vault, a position is born HERE, on its first
    // Transfer — not by the factory. If convertToAssets reverts on that very
    // first event there is no previous value to keep, and five unset non-null
    // fields are fatal at index time (§8). Zero-on-first-touch is a known lie
    // (a real mint reporting a zero claim) and it is the same compromise the
    // factory's creation path already documents and accepts.
    position.claimsSeniorTrancheAssets = BigInt.zero();
    position.claimsJuniorTrancheAssets = BigInt.zero();
    position.claimsLiquidityTrancheAssets = BigInt.zero();
    position.claimsSeniorTrancheShares = BigInt.zero();
    position.claimsNAV = BigInt.zero();
    position.lastHistoricalEntryIndex = BigInt.zero();
    // createdAt* EXACTLY ONCE (§8). Re-stamping builds fine, indexes fine, and
    // quietly destroys every cohort query in Neon.
    position.createdAtTransactionHash = event.transaction.hash.toHexString();
    position.createdAtBlockNumber = event.block.number;
    position.createdAtBlockTimestamp = event.block.timestamp;
  }

  // A vault is born together with its entry 0 (the factory writes it). A position
  // is born here, so ITS entry 0 is this very write — hence the isNew branch.
  // Getting this wrong writes entry 1 first and leaves 0 absent forever, breaking
  // the dense "total == lastHistoricalEntryIndex + 1" contract the schema states.
  const entryIndex = isNew
    ? BigInt.zero()
    : position.lastHistoricalEntryIndex.plus(BigInt.fromI32(1));

  position.shares = position.shares.plus(sharesDelta);

  // No else: keep the previous claim on revert (§5). On a brand-new position the
  // seeds above stand in.
  const tranche = TrancheContract.bind(Address.fromString(vault.vaultAddress));
  const claims = tranche.try_convertToAssets(position.shares);
  if (!claims.reverted) {
    position.claimsSeniorTrancheAssets = claims.value.stAssets;
    position.claimsJuniorTrancheAssets = claims.value.jtAssets;
    position.claimsLiquidityTrancheAssets = claims.value.ltAssets;
    position.claimsSeniorTrancheShares = claims.value.stShares;
    position.claimsNAV = claims.value.nav;
  }

  position.updatedAtTransactionHash = event.transaction.hash.toHexString();
  position.updatedAtBlockNumber = event.block.number;
  position.updatedAtBlockTimestamp = event.block.timestamp;

  const snapshot = new DayPositionStateHistorical(
    generatePositionStateHistoricalId(
      vault.vaultAddress,
      accountAddress,
      entryIndex
    )
  );
  snapshot.vaultId = position.vaultId;
  snapshot.chainId = position.chainId;
  snapshot.vaultAddress = position.vaultAddress;
  snapshot.accountAddress = position.accountAddress;
  snapshot.entryIndex = entryIndex;
  snapshot.shares = position.shares;
  snapshot.claimsSeniorTrancheAssets = position.claimsSeniorTrancheAssets;
  snapshot.claimsJuniorTrancheAssets = position.claimsJuniorTrancheAssets;
  snapshot.claimsLiquidityTrancheAssets = position.claimsLiquidityTrancheAssets;
  snapshot.claimsSeniorTrancheShares = position.claimsSeniorTrancheShares;
  snapshot.claimsNAV = position.claimsNAV;
  snapshot.createdAtTransactionHash = event.transaction.hash.toHexString();
  snapshot.createdAtBlockNumber = event.block.number;
  snapshot.createdAtBlockTimestamp = event.block.timestamp;
  snapshot.save();

  position.lastHistoricalEntryIndex = entryIndex;
  position.save();
}
