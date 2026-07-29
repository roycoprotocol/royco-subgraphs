import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  DayLiquidityPremiumSharesMintedHistory,
  DayMarketState,
  DayVaultState,
} from "../../../generated/schema";
import { CHAIN_ID } from "../../constants";
import { generateMarketBlockRecordId, generateVaultId } from "../../utils";
import { touchMarket } from "../base/resolve-market";

/**
 * Record one liquidity-premium mint as a DayLiquidityPremiumSharesMintedHistory
 * row, advancing the market's countLiquidityPremiumSharesMintedEntries cursor.
 *
 * THE LIQUIDITY PREMIUM IS NOT A FEE. A fee is taken from a holder; this is minted
 * into the market's own accounting (the kernel custodies the shares for the
 * liquidity tranche — RoycoSeniorTranche.mintLiquidityPremiumShares). So it writes
 * NO DayFeeState — it is a plain record stream, keyed by the market, exactly like
 * DayFixedTermHistory (contrast recordFeeSharesMinted, which owns DayFeeState).
 *
 * OWNS THE RECORD ROW + THE CURSOR ONLY — never shares/positions/supply. The mint
 * emits its own Transfer(0x0 -> holder) at a lower log index, so processTransfer's
 * mint branch has already written the holder's position and the supply bump.
 * Booking shares here would double-count.
 *
 * event.address is the SENIOR TRANCHE, not the kernel (only the senior tranche
 * emits this event). The market is read off this tranche's own DayVaultState — an
 * entity load, not an eth_call to KERNEL() — which also hands us marketId /
 * marketRefId / vaultId already in the id shapes the row needs.
 *
 * The caller guarantees mintedShares > 0 (a zero mint is skipped upstream), so this
 * never burns a cursor on a no-op record.
 */
export function recordLiquidityPremiumSharesMinted(
  event: ethereum.Event,
  holder: Address,
  mintedShares: BigInt,
  totalTrancheShares: BigInt
): void {
  const vaultAddress = event.address.toHexString();
  const vault = DayVaultState.load(generateVaultId(vaultAddress));
  // The factory is the sole creator of a DayVaultState, in the same handler that
  // spawns this tranche template, so this is unreachable in practice. But the
  // market-scoped columns come off the vault; without it there is no market to
  // attach the record to (§ see processTransfer's guard).
  if (!vault) return;

  const market = DayMarketState.load(vault.marketRefId);
  if (!market) return;

  // ONE ROW PER (MARKET, BLOCK) — see "BLOCK-KEYED HISTORY" in schema.graphql.
  const id = generateMarketBlockRecordId(vault.marketId, event.block.number);
  let record = DayLiquidityPremiumSharesMintedHistory.load(id);

  if (!record) {
    record = new DayLiquidityPremiumSharesMintedHistory(id);
    // Use-then-increment, and ONLY for a new block: the count IS the next entryIndex.
    const entryIndex = market.countLiquidityPremiumSharesMintedEntries;
    record.entryIndex = entryIndex;
    record.blockNumber = event.block.number;
    record.chainId = CHAIN_ID;
    record.marketId = vault.marketId;
    record.marketRefId = vault.marketRefId;
    record.vaultAddress = vaultAddress; // the senior tranche
    record.vaultId = vault.id;
    // A DELTA — starts at zero and accumulates across this block's mints (see below).
    record.shares = BigInt.zero();
    record.createdAtTransactionHash = event.transaction.hash.toHexString();
    record.createdAtBlockNumber = event.block.number;
    record.createdAtBlockTimestamp = event.block.timestamp;
    market.countLiquidityPremiumSharesMintedEntries = entryIndex.plus(
      BigInt.fromI32(1)
    );
  }

  record.accountAddress = holder.toHexString(); // invariantly the kernel (== marketId)
  // `shares` is a DELTA, so it ACCUMULATES within the block: two premium mints in one
  // block must still sum to the block's total. `sharesTotalSupply` is a SNAPSHOT of the
  // senior supply after the mint, so the last one wins.
  record.shares = record.shares.plus(mintedShares); // <- ABI: mintedLiquidityPremiumShares
  record.sharesTotalSupply = totalTrancheShares; // <- ABI: totalTrancheShares (senior total supply POST-mint)
  record.updatedAtTransactionHash = event.transaction.hash.toHexString();
  record.updatedAtBlockNumber = event.block.number;
  record.updatedAtBlockTimestamp = event.block.timestamp;
  record.save();

  touchMarket(event, market);
}
