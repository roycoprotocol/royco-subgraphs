import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  DayFeeState,
  DayFeeStateHistorical,
  DayVaultState,
} from "../../../generated/schema";
import { RoycoSeniorTranche as TrancheContract } from "../../../generated/templates/RoycoSeniorTranche/RoycoSeniorTranche";
import { CHAIN_ID, VAULT_MAJOR_TYPE } from "../../constants";
import {
  generateFeeStateId,
  generateFeeStateHistoricalId,
  generateVaultId,
} from "../../utils";

/**
 * Accrue one protocol-fee-share mint into DayFeeState (+ its historical snapshot).
 *
 * PROTOCOL FEE ONLY. It is the sole fee: the liquidity premium is NOT a fee (it is
 * minted into the market's own accounting, not taken from a holder), so it has no
 * DayFeeState row — it lives in DayLiquidityPremiumSharesMintedHistory. So there is
 * no fee-TYPE discriminator; a fee row is keyed by (vault, account), with
 * majorType/minorType mirroring DayVaultState:
 *   majorType = VAULT_MAJOR_TYPE  ("day")     — the product
 *   minorType = vault.minorType   (the tranche: senior / junior / liquidity)
 * Both are read off the loaded vault, so both are constant per vault — denormalised
 * descriptors, not distinguishing key parts. The vaultAddress already identifies
 * the tranche; minorType just spares a join, exactly as on DayVaultState.
 *
 * OWNS DayFeeState ONLY — never shares/positions/supply. The mint that triggered
 * this event already emitted its own Transfer(0x0 -> recipient) at a LOWER log
 * index (RoycoVaultTranche.sol: _mint at :148, then emit at :151), so
 * processTransfer's mint branch has already written the recipient's position, the
 * historical snapshot, and the supply bump. Bumping shares here would double-count.
 *
 * TWO DENOMINATIONS, each with a running total on the state and a per-event delta
 * on the historical row:
 *   cumulativeShares += mintedShares                      (exact, from the event)
 *   cumulativeNav    += convertToAssets(mintedShares).nav (the fee's NAV worth)
 * (Fees are always share-minted, so there is no shares-vs-assets fan-out; one row
 * holds both. Contrast royco-rwa, whose single scalar `value` forces two rows.)
 *
 * The nav is not in the event, so it is a contract call — try_ (state-dependent,
 * reverts in edge states, §5). On revert the nav delta is unmeasurable, so it
 * books 0 for this event: the share count stays exact, only the nav valuation of
 * this one accrual is lost. `mintedShares` is guaranteed > 0 by the caller (a
 * zero-fee event is skipped), so convertToAssets(0) — which returns an all-zero
 * struct — is never the reason a leg is zero here.
 */
export function recordFeeSharesMinted(
  event: ethereum.Event,
  accountAddress: string,
  mintedShares: BigInt
): void {
  const vaultAddress = event.address.toHexString();
  const vault = DayVaultState.load(generateVaultId(vaultAddress));
  // The factory is the sole creator of a DayVaultState, in the same handler that
  // spawns this template — so this is unreachable in practice. The market-scoped
  // columns (marketId/marketRefId) and the tranche (minorType) come off the vault;
  // a fabricated row could not supply them (§ see processTransfer's guard).
  if (!vault) return;

  // Mirror DayVaultState: product + tranche. Both off the loaded vault.
  const majorType = VAULT_MAJOR_TYPE;
  const minorType = vault.minorType;

  // The fee's NAV worth. try_ is mandatory (§5). On revert, 0 — the share count
  // below stays exact regardless.
  const tranche = TrancheContract.bind(event.address);
  const claims = tranche.try_convertToAssets(mintedShares);
  const navDelta = claims.reverted ? BigInt.zero() : claims.value.nav;

  // MARKET-scoped id (vault.marketId is the bare kernel address); minorType is what
  // separates the tranche streams within a market. See generateFeeStateId.
  const id = generateFeeStateId(
    vault.marketId,
    accountAddress,
    majorType,
    minorType
  );
  let fee = DayFeeState.load(id);
  const isNew = fee == null;

  if (!fee) {
    fee = new DayFeeState(id);
    fee.chainId = CHAIN_ID;
    fee.vaultAddress = vaultAddress;
    fee.vaultId = vault.id;
    fee.marketRefId = vault.marketRefId;
    fee.marketId = vault.marketId;
    fee.accountAddress = accountAddress;
    fee.majorType = majorType;
    fee.minorType = minorType;
    fee.cumulativeShares = BigInt.zero();
    fee.cumulativeNav = BigInt.zero();
    fee.lastHistoricalEntryIndex = BigInt.zero();
    fee.createdAtTransactionHash = event.transaction.hash.toHexString();
    fee.createdAtBlockNumber = event.block.number;
    fee.createdAtBlockTimestamp = event.block.timestamp;
  }

  // Accumulate BOTH denominations. These are the running totals; the per-event
  // deltas (mintedShares, navDelta) are preserved only on the historical row below.
  fee.cumulativeShares = fee.cumulativeShares.plus(mintedShares);
  fee.cumulativeNav = fee.cumulativeNav.plus(navDelta);

  // Born-with-entry-0 cursor (increment-then-write): the first accrual for this
  // stream is entry 0. Total snapshots == lastHistoricalEntryIndex + 1.
  const entryIndex = isNew
    ? BigInt.zero()
    : fee.lastHistoricalEntryIndex.plus(BigInt.fromI32(1));

  const snapshot = new DayFeeStateHistorical(
    generateFeeStateHistoricalId(
      vault.marketId,
      accountAddress,
      majorType,
      minorType,
      entryIndex
    )
  );
  snapshot.chainId = fee.chainId;
  snapshot.vaultAddress = fee.vaultAddress;
  snapshot.vaultId = fee.vaultId;
  snapshot.marketRefId = fee.marketRefId;
  snapshot.marketId = fee.marketId;
  snapshot.accountAddress = fee.accountAddress;
  snapshot.majorType = fee.majorType;
  snapshot.minorType = fee.minorType;
  snapshot.entryIndex = entryIndex;
  // Deltas (this event alone) and running totals (mirror the parent), per denomination.
  snapshot.shares = mintedShares; // delta — this event's minted shares
  snapshot.cumulativeShares = fee.cumulativeShares; // running total
  snapshot.nav = navDelta; // delta — this event's nav contribution
  snapshot.cumulativeNav = fee.cumulativeNav; // running total
  snapshot.createdAtTransactionHash = event.transaction.hash.toHexString();
  snapshot.createdAtBlockNumber = event.block.number;
  snapshot.createdAtBlockTimestamp = event.block.timestamp;
  snapshot.save();

  fee.lastHistoricalEntryIndex = entryIndex;
  fee.updatedAtTransactionHash = event.transaction.hash.toHexString();
  fee.updatedAtBlockNumber = event.block.number;
  fee.updatedAtBlockTimestamp = event.block.timestamp;
  fee.save();
}
