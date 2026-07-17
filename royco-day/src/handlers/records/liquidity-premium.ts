import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  DayLiquidityPremiumSharesMintedHistory,
  DayMarketState,
  DayVaultState,
} from "../../../generated/schema";
import { CHAIN_ID } from "../../constants";
import { generateMarketRecordId, generateVaultId } from "../../utils";
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

  // Use-then-increment: the count IS the next entryIndex, so the first mint is
  // entry 0 and the count becomes 1.
  const entryIndex = market.countLiquidityPremiumSharesMintedEntries;

  // Immutable (@entity(immutable: true)) — createdAt only, written once.
  const record = new DayLiquidityPremiumSharesMintedHistory(
    generateMarketRecordId(vault.marketId, entryIndex)
  );
  record.chainId = CHAIN_ID;
  record.marketId = vault.marketId;
  record.marketRefId = vault.marketRefId;
  record.entryIndex = entryIndex;
  record.vaultAddress = vaultAddress; // the senior tranche
  record.vaultId = vault.id;
  record.accountAddress = holder.toHexString(); // invariantly the kernel (== marketId)
  record.shares = mintedShares; // <- ABI: mintedLiquidityPremiumShares
  record.sharesTotalSupply = totalTrancheShares; // <- ABI: totalTrancheShares (senior total supply POST-mint)
  record.createdAtTransactionHash = event.transaction.hash.toHexString();
  record.createdAtBlockNumber = event.block.number;
  record.createdAtBlockTimestamp = event.block.timestamp;
  record.save();

  market.countLiquidityPremiumSharesMintedEntries = entryIndex.plus(
    BigInt.fromI32(1)
  );
  touchMarket(event, market);
}
