import { MarketDeploymentCompleted as MarketDeploymentCompletedEvent } from "../generated/RoycoFactory/RoycoFactory";

/**
 * STUB — no indexing logic yet.
 *
 * This is the entry point for the whole subgraph: it is the only handler on a
 * fixed-address data source, and every other contract is discovered from here.
 *
 * TODO — when implementing:
 *   1. Create all 5 templates from event.params.result, or their events are
 *      silently never indexed (no error, just missing rows):
 *        RoycoSeniorTranche.create(event.params.result.seniorTranche)
 *        RoycoJuniorTranche.create(event.params.result.juniorTranche)
 *        RoycoLiquidityTranche.create(event.params.result.liquidityTranche)
 *        RoycoDayAccountant.create(event.params.result.accountant)
 *        RoycoDayKernel.create(event.params.result.kernel)
 *   2. Write DayMarketState (id = generateMarketId(result.kernel.toHexString()) —
 *      the kernel address IS the marketId).
 *      - factory block   <- event.params.result.*
 *          NOTE: result.ydm is the JUNIOR YDM (-> juniorTrancheYdmAddress);
 *                result.ltYdm is the LIQUIDITY YDM. The field is named `ydm`,
 *                not `jtYdm`.
 *      - accountant block <- RoycoDayAccountant.bind(result.accountant).getState()
 *          NOTE: fixedTermDurationSeconds is uint24 -> i32, needs
 *                BigInt.fromI32(). See CLAUDE.md §4.
 *      - kernel block     <- RoycoDayKernel.bind(result.kernel).getState()
 *      - preview block    <- kernel.previewSyncTrancheAccounting(trancheType)
 *          Use the KERNEL overload, not the Accountant's. `state` is
 *          tranche-independent so any type works here.
 *   3. Write one DayVaultState per tranche (senior/junior/liquidity), seeding
 *      lastHistoricalEntryIndex = 0 and EVERY other non-null field — a non-null
 *      field left unset is a fatal error at index time, not build time.
 *      Read each tranche's own TRANCHE_TYPE(); never hardcode 0/1/2.
 *   4. Stamp createdAt* AND updatedAt* on creation (they're equal at t0).
 *
 * Read CLAUDE.md §5 before adding any contract call, and §6 for the Claims
 * struct.
 */
export function handleMarketDeploymentCompleted(
  event: MarketDeploymentCompletedEvent
): void {}
