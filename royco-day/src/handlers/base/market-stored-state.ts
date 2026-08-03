import { Address } from "@graphprotocol/graph-ts";
import { DayMarketState } from "../../../generated/schema";
import { RoycoDayKernel as RoycoDayKernelContract } from "../../../generated/templates/RoycoDayKernel/RoycoDayKernel";
import { RoycoDayAccountant as RoycoDayAccountantContract } from "../../../generated/templates/RoycoDayKernel/RoycoDayAccountant";

/**
 * Re-read the seven DayMarketState columns that ONLY getState() can supply.
 *
 * "STORED" in §6's sense — these come from Kernel.getState() / Accountant.getState(),
 * the checkpointed values, as opposed to the LIVE ones in
 * previewSyncTrancheAccountingFor().state. Do not read that vocabulary the other way
 * round; §6 turns on the distinction.
 *
 * WHY THIS EXISTS. All five were seeded once by the factory at market creation and
 * never touched again, while every one of them mutates on chain immediately afterwards:
 *
 *   totalCollateralAssets                      DepositLogic (st/jt deposits),
 *                                              TrancheClaimsLogic (redeems)
 *   totalLiquidityTrancheAssets                DepositLogic (lpt deposits),
 *                                              TrancheClaimsLogic,
 *                                              BalancerV3LiquidityVenueLogic
 *   liquidityTrancheOwnedSeniorTrancheShares   FeeAndLiquidityPremiumLogic (premium
 *                                              mints), TrancheClaimsLogic,
 *                                              BalancerV3LiquidityVenueLogic (reinvestment)
 *   lastYieldShareAccruedTimestamp             RoycoDayAccountant, every accrual
 *   lastPremiumPaymentTimestamp                RoycoDayAccountant, every premium payout
 *   timeWeightedJuniorTrancheYieldShareAccruedWAD    incremented on every accrual (which
 *   timeWeightedLiquidityTrancheYieldShareAccruedWAD emits) and ZEROED on every premium
 *                                              payout (which does not) — see below
 *
 * All five read ZERO at deployment — the kernel custodies nothing yet, and initialize()
 * never sets either timestamp — so before this they were permanently 0 in Neon while the
 * real values moved constantly. Not a missing column, which is visible; a populated
 * column that is silently wrong.
 *
 * WHY A RE-READ AND NOT EVENT ACCUMULATION. Accumulating deltas would avoid these calls
 * but has to catch nine separate mutation sites exactly, and `lastPremiumPaymentTimestamp`
 * has NO event at all — `premiumsPaid` is an internal bool, and the tranche-side
 * LiquidityPremiumSharesMinted only fires when the LPT leg is non-zero, so it is not 1:1
 * with a payment. `lastYieldShareAccruedTimestamp` could come off YieldSharesAccrued but
 * would lag a cycle, because the bootstrap branch sets the timestamp and returns WITHOUT
 * emitting. A re-read is exact for all five and cannot drift.
 *
 * WHY THE SYNC IS THE RIGHT PLACE. Every mutation site above sits in a flow that syncs
 * tranche accounting in the same transaction, so syncing is a superset of the events
 * that move these values — there is no path that changes one without a sync following.
 *
 * !! COST: TWO eth_calls per sync, on the hottest path in this subgraph. The liquidity
 *    tranche's Balancer pool hook holds SYNC_ROLE and syncs on EVERY swap, so this is
 *    AMM-frequency. Together with refreshMarketNav's six that makes eight per sync. Both
 *    are unavoidable for these columns; do not add a third without the same argument.
 *
 * !! GUARDED, where the factory reads the SAME calls raw, and the asymmetry is
 *    deliberate (§5). getState() is a plain storage read that should not revert, and at
 *    creation a revert costs one market. HERE a revert would kill the handler and stall
 *    the WHOLE SUBGRAPH indefinitely, on the highest-frequency path there is. On revert
 *    each group keeps its previous values — never zero over a good value — and the two
 *    groups fall back independently, because a kernel failure says nothing about the
 *    accountant.
 *
 * Takes the kernel address from the caller rather than market.kernelAddress: on this
 * template event.address IS the kernel and IS the marketId (§6), so the caller already
 * holds it as an Address and re-parsing the string would be pure waste.
 */
export function refreshMarketStoredState(
  market: DayMarketState,
  kernelAddress: Address
): void {
  const kernelState = RoycoDayKernelContract.bind(kernelAddress).try_getState();
  if (!kernelState.reverted) {
    market.totalCollateralAssets = kernelState.value.totalCollateralAssets;
    market.totalLiquidityTrancheAssets = kernelState.value.totalLPTAssets;
    market.liquidityTrancheOwnedSeniorTrancheShares =
      kernelState.value.lptOwnedSeniorTrancheShares;
  }

  const accountantState = RoycoDayAccountantContract.bind(
    Address.fromString(market.accountantAddress)
  ).try_getState();
  if (!accountantState.reverted) {
    // Schema name vs ABI name differ by one word here — Accrued vs Accrual (§7).
    market.lastYieldShareAccruedTimestamp =
      accountantState.value.lastYieldShareAccrualTimestamp;
    market.lastPremiumPaymentTimestamp =
      accountantState.value.lastPremiumPaymentTimestamp;
    // THE TWO ACCUMULATORS, and they MUST be re-read here even though YieldSharesAccrued
    // already reports them. That event fires with the POST-increment values and then the
    // very same call zeroes both (RoycoDayAccountant.sol:158-163, inside
    // `if (premiumsPaid)`) EMITTING NOTHING — none of the accountant's sixteen events
    // signals the reset. So the event stream can only ever ratchet these up; it can
    // never bring them back down.
    //
    // Leaving them out was not merely stale, it was self-contradictory: the reset stamps
    // lastPremiumPaymentTimestamp in the same breath, and that field IS refreshed two
    // lines above, so the row would advertise a fresh payout beside a non-zero
    // "accrued since that payout" the chain had already cleared.
    //
    // The re-read also strictly dominates the event elsewhere: graph-node's eth_call
    // reads END-OF-BLOCK state, and within a block only the first sync accrues at all
    // (_accruePremiumYieldShares returns early on elapsed == 0), so the two agree
    // everywhere except the reset — where this one is right.
    //
    // DayYieldSharesAccruedHistory's copies stay EVENT-sourced on purpose: a history row
    // records the accumulator at that instant, which is exactly the pre-reset value.
    market.timeWeightedJuniorTrancheYieldShareAccruedWAD =
      accountantState.value.twJTYieldShareAccruedWAD;
    market.timeWeightedLiquidityTrancheYieldShareAccruedWAD =
      accountantState.value.twLPTYieldShareAccruedWAD;
  }
}
