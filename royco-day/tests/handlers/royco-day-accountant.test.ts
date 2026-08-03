import {
  assert,
  describe,
  test,
  clearStore,
  beforeEach,
  createMockedFunction,
} from "matchstick-as/assembly/index";
import { BigInt } from "@graphprotocol/graph-ts";
import { handleMarketDeploymentCompleted } from "../../src/royco-factory";
import {
  handleMinCoverageUpdated,
  handleMinLiquidityUpdated,
  handleLiquidationCoverageUtilizationUpdated,
  handleFixedTermDurationUpdated,
  handleFixedTermCommenceableAtTimestampUpdated,
  handleMaxYieldSharesUpdated,
  handleFixedTermCommenced,
  handleFixedTermEnded,
  handleSeniorTrancheProtocolFeeUpdated,
  handleJuniorTrancheProtocolFeeUpdated,
  handleJuniorTrancheYieldShareProtocolFeeUpdated,
  handleLiquidityTrancheYieldShareProtocolFeeUpdated,
  handleDustToleranceUpdated,
  handleJuniorTrancheYDMUpdated,
  handleLiquidityTrancheYDMUpdated,
  handleJuniorTrancheImpermanentLossReset,
  handleYieldSharesAccrued,
} from "../../src/royco-day-accountant";
import {
  handleProtocolFeeRecipientUpdated,
  handleSeniorTrancheSelfLiquidationBonusUpdated,
  handlePreOpTrancheAccountingSynced,
  handlePostOpTrancheAccountingSynced,
} from "../../src/royco-day-kernel";
import {
  MinCoverageUpdated,
  MinLiquidityUpdated,
  LiquidationCoverageUtilizationUpdated,
  FixedTermDurationUpdated,
  FixedTermCommenceableAtTimestampUpdated,
  MaxYieldSharesUpdated,
  FixedTermCommenced,
  FixedTermEnded,
  SeniorTrancheProtocolFeeUpdated,
  JuniorTrancheProtocolFeeUpdated,
  JuniorTrancheYieldShareProtocolFeeUpdated,
  LiquidityProviderTrancheYieldShareProtocolFeeUpdated,
  DustToleranceUpdated,
  JuniorTrancheYDMUpdated,
  LiquidityProviderTrancheYDMUpdated,
  JuniorTrancheImpermanentLossReset,
  YieldSharesAccrued,
} from "../../generated/templates/RoycoDayAccountant/RoycoDayAccountant";
import {
  ProtocolFeeRecipientUpdated,
  SeniorTrancheSelfLiquidationBonusUpdated,
} from "../../generated/templates/RoycoDayKernel/RoycoDayKernel";
import {
  DeploymentResult,
  createMarketDeploymentCompletedEvent,
} from "../builders/factory";
import {
  createUintEvent,
  createUint24Event,
  createAddressEvent,
  createTwoUintEvent,
  createEmptyEvent,
  createFourUintEvent,
} from "../builders/accountant";
import { createPreOpSyncEvent, createPostOpSyncEvent } from "../builders/kernel";
import { TrancheState } from "../builders/shared";
import { DayMarketFixture, mockDayMarket } from "../mocks";
import { KernelState, mockKernelGetState } from "../mocks/kernel";
import { AccountantState, mockAccountantGetState } from "../mocks/accountant";
import { ROYCO_DAY_KERNEL__GET_STATE } from "../generated/abi-signatures";
import { ctx, EventContext } from "../helpers/event";
import {
  ADDR_ACCOUNTANT,
  ADDR_ALICE,
  ADDR_BOB,
  ADDR_DEPLOYER,
  ADDR_KERNEL,
  ADDR_SENIOR,
  ADDR_TEMPLATE,
  BLOCK_NUMBER,
  BLOCK_TIMESTAMP,
  TX_HASH_2,
  WAD,
} from "../helpers/constants";
import {
  generateMarketRecordId,
  generateMarketId,
  generateMarketBlockRecordId,
  generateVaultId,
} from "../../src/utils";

// =============================================================================
// The Accountant config handlers, plus the two Kernel ones.
//
// Every accountant handler hops accountant -> KERNEL() -> market. `graph build`
// cannot see any of this; nor can it see a field written from the wrong event
// param, which is what most of these tests are actually for.
//
// The market must be deployed first: these handlers early-return without one.
// =============================================================================

const MARKET_ID = generateMarketId(ADDR_KERNEL.toHexString());

/** A term's scheduled end, distinct from every other sentinel in this file. */
const TERM_END = BigInt.fromI32(1_700_500_000);

function deployMarket(): void {
  const market = DayMarketFixture.standard();
  mockDayMarket(market);
  handleMarketDeploymentCompleted(
    createMarketDeploymentCompletedEvent(
      ADDR_TEMPLATE,
      ADDR_DEPLOYER,
      new DeploymentResult(),
      ctx()
    )
  );
}

/** An event from the ACCOUNTANT — not the kernel. The hop is the point. */
function accountantCtx(): EventContext {
  const c = ctx();
  c.emitter = ADDR_ACCOUNTANT;
  return c;
}

function kernelCtx(): EventContext {
  const c = ctx();
  c.emitter = ADDR_KERNEL;
  return c;
}

describe("accountant config handlers", () => {
  beforeEach(() => {
    clearStore();
  });

  test("each config event writes its OWN field", () => {
    // Every one of these is a lone BigInt on a market row full of other lone
    // BigInts. Distinct sentinels are the only thing separating them: a handler
    // writing minLiquidityWAD from the MinCoverageUpdated param would be invisible
    // under shared values.
    deployMarket();

    handleMinCoverageUpdated(
      createUintEvent<MinCoverageUpdated>(
        "minCoverageWAD",
        BigInt.fromI32(9_001),
        accountantCtx()
      )
    );
    handleMinLiquidityUpdated(
      createUintEvent<MinLiquidityUpdated>(
        "minLiquidityWAD",
        BigInt.fromI32(9_002),
        accountantCtx()
      )
    );
    handleLiquidationCoverageUtilizationUpdated(
      createUintEvent<LiquidationCoverageUtilizationUpdated>(
        "liquidationCoverageUtilizationWAD",
        BigInt.fromI32(9_003),
        accountantCtx()
      )
    );
    handleSeniorTrancheProtocolFeeUpdated(
      createUintEvent<SeniorTrancheProtocolFeeUpdated>(
        "stProtocolFeeWAD",
        BigInt.fromI32(9_004),
        accountantCtx()
      )
    );
    handleJuniorTrancheProtocolFeeUpdated(
      createUintEvent<JuniorTrancheProtocolFeeUpdated>(
        "jtProtocolFeeWAD",
        BigInt.fromI32(9_005),
        accountantCtx()
      )
    );
    handleJuniorTrancheYieldShareProtocolFeeUpdated(
      createUintEvent<JuniorTrancheYieldShareProtocolFeeUpdated>(
        "jtYieldShareProtocolFeeWAD",
        BigInt.fromI32(9_006),
        accountantCtx()
      )
    );
    handleLiquidityTrancheYieldShareProtocolFeeUpdated(
      createUintEvent<LiquidityProviderTrancheYieldShareProtocolFeeUpdated>(
        "lptYieldShareProtocolFeeWAD",
        BigInt.fromI32(9_007),
        accountantCtx()
      )
    );

    assert.fieldEquals("DayMarketState", MARKET_ID, "minCoverageWAD", "9001");
    assert.fieldEquals("DayMarketState", MARKET_ID, "minLiquidityWAD", "9002");
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "coverageLiquidationUtilizationWAD",
      "9003"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "seniorTrancheProtocolFeeWAD",
      "9004"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheProtocolFeeWAD",
      "9005"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheYieldShareProtocolFeeWAD",
      "9006"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "liquidityTrancheYieldShareProtocolFeeWAD",
      "9007"
    );
  });

  test("MaxYieldSharesUpdated writes the two CAPS, not the accruals", () => {
    // §7 calls these names actively misleading: max*YieldShareAccruedWAD are
    // CONFIGURED CAPS despite the "Accrued". The timeWeighted* fields beside them
    // are the real accruals and must NOT move here — a handler that wrote the
    // accrual fields from this event would invert every yield-share query in Neon.
    deployMarket();

    handleMaxYieldSharesUpdated(
      createTwoUintEvent<MaxYieldSharesUpdated>(
        "maxJTYieldShareWAD",
        BigInt.fromI32(9_101),
        "maxLPTYieldShareWAD",
        BigInt.fromI32(9_102),
        accountantCtx()
      )
    );

    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "maxJuniorTrancheYieldShareAccruedWAD",
      "9101"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "maxLiquidityTrancheYieldShareAccruedWAD",
      "9102"
    );
    // Untouched — still the factory's seeded values.
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "timeWeightedJuniorTrancheYieldShareAccruedWAD",
      "8101"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "timeWeightedLiquidityTrancheYieldShareAccruedWAD",
      "8103"
    );
  });

  test("FixedTermDurationUpdated lifts its uint24 through BigInt.fromI32", () => {
    // The ONE type trap in this file. uint24 -> i32, so it needs the lift; its
    // uint32/uint64 neighbours do not (§4).
    deployMarket();

    handleFixedTermDurationUpdated(
      createUint24Event<FixedTermDurationUpdated>(
        "fixedTermDurationSeconds",
        7 * 24 * 60 * 60,
        accountantCtx()
      )
    );

    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "fixedTermDurationSeconds",
      (7 * 24 * 60 * 60).toString()
    );
  });

  test("ONE dust tolerance now, carried by its own event", () => {
    // v1's SILENT ONE, now retired. There used to be TWO events (senior + junior)
    // writing THREE columns, because the accountant cached
    // effectiveNAVDustTolerance = st + jt and emitted NOTHING for it — so both
    // handlers had to recompute that sum or the column drifted stale the moment
    // either tolerance moved, with nothing anywhere reporting a problem.
    //
    // v2 deletes the hazard rather than guarding it: senior and junior share one
    // collateral asset, so there is one tolerance, it has its own event, and the
    // event carries the new value. Nothing to recompute, nothing to keep in sync.
    deployMarket();

    // The factory seeded 6101 from getState(); this must overwrite it.
    handleDustToleranceUpdated(
      createUintEvent<DustToleranceUpdated>(
        "dustTolerance",
        BigInt.fromI32(400),
        accountantCtx()
      )
    );

    assert.fieldEquals("DayMarketState", MARKET_ID, "dustTolerance", "400");
  });

  test("the YDM handlers write their own side", () => {
    deployMarket();

    handleJuniorTrancheYDMUpdated(
      createAddressEvent<JuniorTrancheYDMUpdated>("jtYDM", ADDR_ALICE, accountantCtx())
    );
    handleLiquidityTrancheYDMUpdated(
      createAddressEvent<LiquidityProviderTrancheYDMUpdated>("lptYDM", ADDR_BOB, accountantCtx())
    );

    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheYdmAddress",
      ADDR_ALICE.toHexString()
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "liquidityTrancheYdmAddress",
      ADDR_BOB.toHexString()
    );
  });

  test("a config event for an unknown market is a no-op", () => {
    // THE TEST PEOPLE FORGET. The Accountant's initialize() emits MinCoverageUpdated
    // and FixedTermDurationUpdated during deployMarket — at a LOWER log index than
    // the MarketDeploymentCompleted that creates this template and writes the
    // market. If graph-node ever replays those earlier same-block logs into the
    // new template, they land before the market exists.
    clearStore(); // no market
    const market = DayMarketFixture.standard();
    mockDayMarket(market); // KERNEL() still resolvable; the ENTITY is what's absent

    handleMinCoverageUpdated(
      createUintEvent<MinCoverageUpdated>(
        "minCoverageWAD",
        BigInt.fromI32(9_001),
        accountantCtx()
      )
    );

    assert.entityCount("DayMarketState", 0);
  });

  test("FixedTermCommenceableAtTimestampUpdated moves the commencement floor", () => {
    // The floor is when fixed-term logic can FIRST activate — deployment time plus the
    // grace period — and the accountant gates commencement on it
    // (RoycoDayAccountant.sol:550, `block.timestamp < $.fixedTermCommenceableAtTimestamp`).
    //
    // Today the only emit is inside initialize(), which fires BELOW
    // MarketDeploymentCompleted, so the null guard swallows it and the factory's
    // getState() read fills the column. This drives the handler directly, so the wiring
    // is proven now rather than the first time a setter is added.
    deployMarket();
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "fixedTermCommenceableAtTimestamp",
      "1700100777"
    );

    handleFixedTermCommenceableAtTimestampUpdated(
      createUintEvent<FixedTermCommenceableAtTimestampUpdated>(
        "fixedTermCommenceableAtTimestamp",
        BigInt.fromI32(1_700_200_999),
        accountantCtx()
      )
    );

    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "fixedTermCommenceableAtTimestamp",
      "1700200999"
    );
    // The neighbouring fixed-term clock is a DIFFERENT value and must not move: one is a
    // per-term scheduled end, the other a one-time floor.
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "fixedTermEndTimestamp",
      "1700100001"
    );
  });

  test("a config write never re-stamps createdAt", () => {
    // Re-stamping builds fine, indexes fine, and quietly destroys every cohort
    // query in Neon (§8).
    deployMarket();

    const later = accountantCtx();
    later.blockTimestamp = BLOCK_TIMESTAMP.plus(BigInt.fromI32(3600));
    later.txHash = TX_HASH_2;
    handleMinCoverageUpdated(
      createUintEvent<MinCoverageUpdated>("minCoverageWAD", BigInt.fromI32(9_001), later)
    );

    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "createdAtBlockTimestamp",
      BLOCK_TIMESTAMP.toString()
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "updatedAtBlockTimestamp",
      later.blockTimestamp.toString()
    );
  });
});

describe("the kernel sync handlers", () => {
  beforeEach(() => {
    clearStore();
  });

  test("re-reads the seven getState-only columns, which no payload carries", () => {
    // These five were seeded once by the factory and never touched again, while every
    // one of them moves on chain immediately afterwards — so they sat at their
    // deployment values (zero, for a fresh market) for the market's whole life. The sync
    // payload cannot fix that: it is all NAVs, utilizations and per-sync fees, with no
    // custodied totals and no accrual/premium checkpoints. Only getState() has them.
    deployMarket();
    // Whatever getState() reported at deployment. On a real market these are zero — the
    // kernel custodies nothing yet and initialize() sets neither timestamp — but the
    // fixture uses distinctive values so "it never changed" is visible rather than
    // indistinguishable from a fresh market.
    assert.fieldEquals("DayMarketState", MARKET_ID, "totalCollateralAssets", "5101");
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "lastPremiumPaymentTimestamp",
      "1700100003"
    );

    // Deposits, a premium mint and an accrual happen. Re-mock BOTH getState()s to what
    // the chain would now report.
    const kernelState = new KernelState();
    kernelState.totalCollateralAssets = BigInt.fromI32(7_100);
    kernelState.totalLPTAssets = BigInt.fromI32(7_200);
    kernelState.lptOwnedSeniorTrancheShares = BigInt.fromI32(7_300);
    mockKernelGetState(ADDR_KERNEL, kernelState);

    const accountantState = new AccountantState();
    accountantState.lastYieldShareAccrualTimestamp = BigInt.fromI32(1_700_000_001);
    accountantState.lastPremiumPaymentTimestamp = BigInt.fromI32(1_700_000_002);
    // DISTINCT, so transposing the JT and LPT accumulators is visible. Four same-typed
    // BigInts read off one struct is exactly where a swap hides (§3).
    accountantState.twJTYieldShareAccruedWAD = BigInt.fromI32(6_001);
    accountantState.twLPTYieldShareAccruedWAD = BigInt.fromI32(6_002);
    mockAccountantGetState(ADDR_ACCOUNTANT, accountantState);

    handlePostOpTrancheAccountingSynced(
      createPostOpSyncEvent(0, new TrancheState(), kernelCtx())
    );

    assert.fieldEquals("DayMarketState", MARKET_ID, "totalCollateralAssets", "7100");
    assert.fieldEquals("DayMarketState", MARKET_ID, "totalLiquidityTrancheAssets", "7200");
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "liquidityTrancheOwnedSeniorTrancheShares",
      "7300"
    );
    // Schema name vs ABI name differ by one word: Accrued vs Accrual (§7).
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "lastYieldShareAccruedTimestamp",
      "1700000001"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "lastPremiumPaymentTimestamp",
      "1700000002"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "timeWeightedJuniorTrancheYieldShareAccruedWAD",
      "6001"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "timeWeightedLiquidityTrancheYieldShareAccruedWAD",
      "6002"
    );
  });

  test("a premium payout ZEROES the two accumulators, which no event can report", () => {
    // THE CASE THE EVENT STREAM STRUCTURALLY CANNOT EXPRESS. YieldSharesAccrued fires
    // with the POST-increment totals, and the very same call then deletes both
    // (RoycoDayAccountant.sol:163-168, inside `if (premiumsPaid)`) emitting NOTHING —
    // none of the accountant's sixteen events signals the reset. So an event-only column
    // ratchets up and never comes back down.
    //
    // Worse than stale: the reset stamps lastPremiumPaymentTimestamp in the same block,
    // and that IS refreshed — so without this the row would claim a fresh payout beside
    // a non-zero "accrued since that payout".
    deployMarket();

    // An accrual lands. The event reports the pre-reset totals, as it always does.
    handleYieldSharesAccrued(
      createFourUintEvent<YieldSharesAccrued>(
        "jtYieldShareWAD",
        BigInt.fromI32(11),
        "twJTYieldShareAccruedWAD",
        BigInt.fromI32(100),
        "lptYieldShareWAD",
        BigInt.fromI32(22),
        "twLPTYieldShareAccruedWAD",
        BigInt.fromI32(40),
        accountantCtx()
      )
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "timeWeightedJuniorTrancheYieldShareAccruedWAD",
      "100"
    );

    // Premiums are paid in the same call: storage is now zero, and the payout timestamp
    // advanced. The sync that follows is the only thing that can observe either.
    const paid = new AccountantState();
    paid.twJTYieldShareAccruedWAD = BigInt.zero();
    paid.twLPTYieldShareAccruedWAD = BigInt.zero();
    paid.lastPremiumPaymentTimestamp = BigInt.fromI32(1_700_000_777);
    mockAccountantGetState(ADDR_ACCOUNTANT, paid);

    handlePostOpTrancheAccountingSynced(
      createPostOpSyncEvent(0, new TrancheState(), kernelCtx())
    );

    // Both back to zero, tracking the chain.
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "timeWeightedJuniorTrancheYieldShareAccruedWAD",
      "0"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "timeWeightedLiquidityTrancheYieldShareAccruedWAD",
      "0"
    );
    // And consistent with the payout stamp the same reset wrote — the pair is the whole
    // point: "accrued since the last payment" must be 0 immediately after one.
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "lastPremiumPaymentTimestamp",
      "1700000777"
    );
    // The HISTORY row keeps the pre-reset value: it records that instant, not the end
    // state, and is deliberately still event-sourced.
    assert.fieldEquals(
      "DayYieldSharesAccruedHistory",
      generateMarketRecordId(ADDR_KERNEL.toHexString(), BigInt.zero()),
      "juniorTrancheTimeWeightedYieldShareAccruedWAD",
      "100"
    );
  });

  test("a reverting getState keeps the previous values, and does not stall", () => {
    // The factory reads these SAME two calls raw. Here they are guarded, deliberately:
    // at creation a revert costs one market, but on this path it would kill the handler
    // and stall the whole subgraph — on the highest-frequency path there is, since the
    // LT's Balancer pool hook syncs on every swap.
    deployMarket();

    const kernelState = new KernelState();
    kernelState.totalCollateralAssets = BigInt.fromI32(4_400);
    mockKernelGetState(ADDR_KERNEL, kernelState);
    const accountantState = new AccountantState();
    accountantState.lastPremiumPaymentTimestamp = BigInt.fromI32(1_700_000_009);
    mockAccountantGetState(ADDR_ACCOUNTANT, accountantState);
    handlePostOpTrancheAccountingSynced(
      createPostOpSyncEvent(0, new TrancheState(), kernelCtx())
    );
    assert.fieldEquals("DayMarketState", MARKET_ID, "totalCollateralAssets", "4400");

    // Now the KERNEL's getState stops answering. The accountant's still works.
    createMockedFunction(ADDR_KERNEL, "getState", ROYCO_DAY_KERNEL__GET_STATE)
      .withArgs([])
      .reverts();
    const later = new AccountantState();
    later.lastPremiumPaymentTimestamp = BigInt.fromI32(1_700_000_050);
    mockAccountantGetState(ADDR_ACCOUNTANT, later);

    const second = kernelCtx();
    second.blockNumber = BLOCK_NUMBER.plus(BigInt.fromI32(1));
    handlePostOpTrancheAccountingSynced(
      createPostOpSyncEvent(0, new TrancheState(), second)
    );

    // The kernel group keeps its previous value — NEVER zero over a good number.
    assert.fieldEquals("DayMarketState", MARKET_ID, "totalCollateralAssets", "4400");
    // And the accountant group still advances: the two fall back INDEPENDENTLY, because
    // a kernel failure says nothing about the accountant.
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "lastPremiumPaymentTimestamp",
      "1700000050"
    );
  });

  test("un-freezes the ten preview fields, from the payload alone", () => {
    // Before this handler existed, all ten were written once by the factory and
    // never again — and since a fresh market has no supply and no NAV, they sat at
    // zero for the market's whole life. Nothing errored; the columns just lied.
    deployMarket();

    const s = new TrancheState();
    s.collateralNAV = BigInt.fromI32(1_001);
    s.lptRawNAV = BigInt.fromI32(1_003);
    s.stEffectiveNAV = BigInt.fromI32(1_004);
    s.jtEffectiveNAV = BigInt.fromI32(1_005);
    s.jtImpermanentLoss = BigInt.fromI32(1_006);
    s.lptLiquidityPremium = BigInt.fromI32(1_007);
    s.coverageUtilizationWAD = BigInt.fromI32(1_008);
    s.liquidityUtilizationWAD = BigInt.fromI32(1_009);

    handlePostOpTrancheAccountingSynced(
      createPostOpSyncEvent(0, s, kernelCtx())
    );

    // Ten distinct sentinels: any transposition among these same-typed neighbours
    // lands the wrong number in the wrong column, plausibly.
    assert.fieldEquals("DayMarketState", MARKET_ID, "collateralNAV", "1001");
    assert.fieldEquals("DayMarketState", MARKET_ID, "liquidityTrancheRawNAV", "1003");
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "seniorTrancheEffectiveNAV",
      "1004"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheEffectiveNAV",
      "1005"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheImpermanentLoss",
      "1006"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "liquidityTrancheLiquidityPremium",
      "1007"
    );
    assert.fieldEquals("DayMarketState", MARKET_ID, "coverageUtilizationWAD", "1008");
    assert.fieldEquals("DayMarketState", MARKET_ID, "liquidityUtilizationWAD", "1009");
  });

  test("does NOT touch the five fields other handlers own", () => {
    // The payload carries these too, and copying it wholesale would make each
    // field's value depend on log ORDER. setCoverage syncs BEFORE its body, so a
    // sync carrying the OLD coverage is emitted BEFORE CoverageUpdated carries the
    // new one — this handler writing them would silently revert config changes.
    deployMarket();

    // The config handler sets the truth first. NOTE these four are ACCOUNTANT events
    // and still hop ACCOUNTANT.KERNEL() to find their market, so they emit from the
    // accountant — only the sync moved onto the kernel in v2.
    handleMinCoverageUpdated(
      createUintEvent<MinCoverageUpdated>(
        "minCoverageWAD",
        BigInt.fromI32(5_001),
        accountantCtx()
      )
    );
    handleMinLiquidityUpdated(
      createUintEvent<MinLiquidityUpdated>(
        "minLiquidityWAD",
        BigInt.fromI32(5_002),
        accountantCtx()
      )
    );
    handleLiquidationCoverageUtilizationUpdated(
      createUintEvent<LiquidationCoverageUtilizationUpdated>(
        "liquidationCoverageUtilizationWAD",
        BigInt.fromI32(5_003),
        accountantCtx()
      )
    );
    handleFixedTermCommenced(
      createUintEvent<FixedTermCommenced>(
        "fixedTermEndTimestamp",
        TERM_END,
        accountantCtx()
      )
    );

    // ...then a sync arrives carrying CONTRADICTORY values for all five.
    const s = new TrancheState();
    s.minCoverageWAD = BigInt.fromI32(9_999);
    s.minLiquidityWAD = BigInt.fromI32(9_998);
    s.coverageLiquidationUtilizationWAD = BigInt.fromI32(9_997);
    s.fixedTermEndTimestamp = BigInt.fromI32(9_996);
    s.marketState = 0; // "perpetual" — contradicts the live fixed term
    handlePostOpTrancheAccountingSynced(
      createPostOpSyncEvent(0, s, kernelCtx())
    );

    // All five untouched. The sync must not have opinions about these.
    assert.fieldEquals("DayMarketState", MARKET_ID, "minCoverageWAD", "5001");
    assert.fieldEquals("DayMarketState", MARKET_ID, "minLiquidityWAD", "5002");
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "coverageLiquidationUtilizationWAD",
      "5003"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "fixedTermEndTimestamp",
      TERM_END.toString()
    );
    assert.fieldEquals("DayMarketState", MARKET_ID, "marketState", "fixed");

    // ...but the immutable history row DID capture the sync's LIVE values — the very
    // ones DayMarketState refuses. This is the LIVE-vs-STORED split (§6) made visible:
    // the row's marketState is "perpetual" (state.marketState = 0), and its
    // minCoverageWAD is the live 9_999, while DayMarketState kept the stored 5_001.
    const histId = generateMarketBlockRecordId(ADDR_KERNEL.toHexString(), BLOCK_NUMBER);
    assert.fieldEquals(
      "DayTrancheAccountingSyncedHistory",
      histId,
      "marketState",
      "perpetual"
    );
    assert.fieldEquals(
      "DayTrancheAccountingSyncedHistory",
      histId,
      "minCoverageWAD",
      "9999"
    );
    assert.fieldEquals(
      "DayTrancheAccountingSyncedHistory",
      histId,
      "fixedTermEndTimestamp",
      "9996"
    );
  });

  test("the per-sync protocol fee AMOUNTS never reach the fee RATE columns", () => {
    // state.stProtocolFee is a NAV_UNIT amount taken on THIS sync;
    // seniorTrancheProtocolFeeWAD is a uint64 rate from getState(). One word apart,
    // and writing the amount into the rate column would look entirely plausible.
    // The amounts have no home on DayMarketState — but they are NOT dropped: they
    // land on the DayTrancheAccountingSyncedHistory row (asserted below).
    deployMarket();

    const s = new TrancheState();
    s.stProtocolFee = BigInt.fromI32(4_444);
    s.jtProtocolFee = BigInt.fromI32(4_445);
    s.lptProtocolFee = BigInt.fromI32(4_446);
    handlePostOpTrancheAccountingSynced(
      createPostOpSyncEvent(0, s, kernelCtx())
    );

    // Still the factory's seeded RATES on DayMarketState, untouched by the amounts.
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "seniorTrancheProtocolFeeWAD",
      WAD.div(BigInt.fromI32(10)).toString()
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheProtocolFeeWAD",
      WAD.div(BigInt.fromI32(20)).toString()
    );

    // The AMOUNTS reach the history row's own amount columns — their proper home.
    const histId = generateMarketBlockRecordId(ADDR_KERNEL.toHexString(), BLOCK_NUMBER);
    assert.fieldEquals(
      "DayTrancheAccountingSyncedHistory",
      histId,
      "seniorTrancheProtocolFee",
      "4444"
    );
    assert.fieldEquals(
      "DayTrancheAccountingSyncedHistory",
      histId,
      "juniorTrancheProtocolFee",
      "4445"
    );
    assert.fieldEquals(
      "DayTrancheAccountingSyncedHistory",
      histId,
      "liquidityTrancheProtocolFee",
      "4446"
    );
  });

  test("does not touch any DayVaultState — the split is deliberate", () => {
    // This fires on every Balancer pool swap. Refreshing the three vaults here
    // would be ~6 eth_calls and 3 immutable history rows PER SWAP.
    deployMarket();

    const s = new TrancheState();
    s.collateralNAV = BigInt.fromI32(1_001);
    handlePostOpTrancheAccountingSynced(
      createPostOpSyncEvent(0, s, kernelCtx())
    );

    // 3 creation snapshots and no more — the sync added nothing.
    assert.entityCount("DayVaultStateHistorical", 3);
  });

  test("records the full 16-field sync as the block's row", () => {
    // ALL eighteen fields, verbatim — the unabridged history DayMarketState does not
    // keep. Distinct sentinels for every field: a transposition among same-typed
    // neighbours lands the wrong number in the wrong column, plausibly.
    deployMarket();

    const s = new TrancheState();
    s.marketState = 1; // LIVE state -> "fixed"
    s.collateralNAV = BigInt.fromI32(3_001);
    s.lptRawNAV = BigInt.fromI32(3_003);
    s.stEffectiveNAV = BigInt.fromI32(3_004);
    s.jtEffectiveNAV = BigInt.fromI32(3_005);
    s.jtImpermanentLoss = BigInt.fromI32(3_006);
    s.lptLiquidityPremium = BigInt.fromI32(3_007);
    s.stProtocolFee = BigInt.fromI32(3_008);
    s.jtProtocolFee = BigInt.fromI32(3_009);
    s.lptProtocolFee = BigInt.fromI32(3_010);
    s.coverageUtilizationWAD = BigInt.fromI32(3_011);
    s.liquidityUtilizationWAD = BigInt.fromI32(3_012);
    s.fixedTermEndTimestamp = BigInt.fromI32(3_013);
    s.minCoverageWAD = BigInt.fromI32(3_014);
    s.coverageLiquidationUtilizationWAD = BigInt.fromI32(3_016);
    s.minLiquidityWAD = BigInt.fromI32(3_017);

    handlePostOpTrancheAccountingSynced(
      createPostOpSyncEvent(0, s, kernelCtx())
    );

    // Use-then-increment: the first sync is entry 0 and the count becomes 1.
    assert.entityCount("DayTrancheAccountingSyncedHistory", 1);

    const id = generateMarketBlockRecordId(ADDR_KERNEL.toHexString(), BLOCK_NUMBER);
    const E = "DayTrancheAccountingSyncedHistory";
    assert.fieldEquals(E, id, "marketId", ADDR_KERNEL.toHexString());
    assert.fieldEquals(E, id, "marketRefId", MARKET_ID);
    // LIVE market state from the payload — the value DayMarketState deliberately drops.
    assert.fieldEquals(E, id, "marketState", "fixed");
    assert.fieldEquals(E, id, "collateralNAV", "3001");
    assert.fieldEquals(E, id, "liquidityTrancheRawNAV", "3003");
    assert.fieldEquals(E, id, "seniorTrancheEffectiveNAV", "3004");
    assert.fieldEquals(E, id, "juniorTrancheEffectiveNAV", "3005");
    assert.fieldEquals(E, id, "juniorTrancheImpermanentLoss", "3006");
    assert.fieldEquals(E, id, "liquidityTrancheLiquidityPremium", "3007");
    assert.fieldEquals(E, id, "seniorTrancheProtocolFee", "3008");
    assert.fieldEquals(E, id, "juniorTrancheProtocolFee", "3009");
    assert.fieldEquals(E, id, "liquidityTrancheProtocolFee", "3010");
    assert.fieldEquals(E, id, "coverageUtilizationWAD", "3011");
    assert.fieldEquals(E, id, "liquidityUtilizationWAD", "3012");
    assert.fieldEquals(E, id, "fixedTermEndTimestamp", "3013");
    assert.fieldEquals(E, id, "minCoverageWAD", "3014");
    assert.fieldEquals(E, id, "coverageLiquidationUtilizationWAD", "3016");
    assert.fieldEquals(E, id, "minLiquidityWAD", "3017");
    // Immutable: createdAt* is set; there is no updatedAt* on this entity.
    assert.fieldEquals(E, id, "createdAtBlockTimestamp", BLOCK_TIMESTAMP.toString());
  });

  test("a SECOND sync in the SAME BLOCK updates the row instead of appending", () => {
    // THE COLLAPSE RULE. v1 appended one immutable row per sync; v2 keys the row on
    // (market, block) so the later sync overwrites the earlier. Two syncs in one block
    // therefore leave ONE row, and the cursor advances ONCE — if entryIndex were
    // bumped on the update too, the count would drift past the row count forever.
    deployMarket();

    // Pre-op first, as the kernel emits it.
    handlePreOpTrancheAccountingSynced(
      createPreOpSyncEvent(new TrancheState(), kernelCtx())
    );

    assert.entityCount("DayTrancheAccountingSyncedHistory", 1);
    const blockId = generateMarketBlockRecordId(
      ADDR_KERNEL.toHexString(),
      BLOCK_NUMBER
    );
    assert.fieldEquals("DayTrancheAccountingSyncedHistory", blockId, "syncType", "preOp");
    // No operation yet — a pre-op sync runs before one is chosen.
    assert.fieldEquals("DayTrancheAccountingSyncedHistory", blockId, "operation", "null");

    // Post-op lands in the SAME block, at a later log index.
    const post = kernelCtx();
    post.logIndex = BigInt.fromI32(7);
    const state = new TrancheState();
    state.collateralNAV = BigInt.fromI32(4_242);
    handlePostOpTrancheAccountingSynced(createPostOpSyncEvent(3, state, post));

    // STILL ONE ROW, cursor STILL 1.
    assert.entityCount("DayTrancheAccountingSyncedHistory", 1);
    // ...now carrying the post-op's values and its operation (3 == jtRedeem).
    assert.fieldEquals("DayTrancheAccountingSyncedHistory", blockId, "syncType", "postOp");
    assert.fieldEquals(
      "DayTrancheAccountingSyncedHistory",
      blockId,
      "operation",
      "jtRedeem"
    );
    assert.fieldEquals(
      "DayTrancheAccountingSyncedHistory",
      blockId,
      "collateralNAV",
      "4242"
    );
  });

  test("the Operation enum maps 0..5, and anything beyond is 'unknown'", () => {
    // THE ENUM HAS ALREADY CHANGED ONCE. An earlier contract revision had EIGHT members,
    // with distinct LPT_MULTI_ASSET_DEPOSIT/_REDEMPTION; those were folded into the plain
    // LPT ones and it now has SIX. The ABI carries the enum's TYPE but none of its member
    // names, so nothing about the ABI, the build or codegen can tell you this list has
    // gone stale — only Types.sol can. This test is the tripwire: it pins every member
    // AND the boundary, so a future member added on chain but not here shows up as a
    // failing "unknown" rather than being silently mislabelled as its neighbour.
    const names = [
      "stDeposit",
      "stRedeem",
      "jtDeposit",
      "jtRedeem",
      "lptDeposit",
      "lptRedeem",
    ];
    for (let op = 0; op < names.length; op++) {
      clearStore();
      deployMarket();
      const c = kernelCtx();
      c.blockNumber = BLOCK_NUMBER.plus(BigInt.fromI32(op));
      handlePostOpTrancheAccountingSynced(
        createPostOpSyncEvent(op, new TrancheState(), c)
      );
      assert.fieldEquals(
        "DayTrancheAccountingSyncedHistory",
        generateMarketBlockRecordId(ADDR_KERNEL.toHexString(), c.blockNumber),
        "operation",
        names[op]
      );
    }

    // 6 is one past the end of the current enum. If the contracts ever add a seventh
    // member, THIS is the assertion that fails and sends you back to Types.sol.
    clearStore();
    deployMarket();
    const beyond = kernelCtx();
    handlePostOpTrancheAccountingSynced(
      createPostOpSyncEvent(6, new TrancheState(), beyond)
    );
    assert.fieldEquals(
      "DayTrancheAccountingSyncedHistory",
      generateMarketBlockRecordId(ADDR_KERNEL.toHexString(), BLOCK_NUMBER),
      "operation",
      "unknown"
    );
  });

  test("a sync in a NEW BLOCK opens a new row", () => {
    // The flip side: collapsing is per BLOCK, not per market. A later block must get
    // its own row, or the table would only ever hold one row per market.
    deployMarket();

    handlePreOpTrancheAccountingSynced(
      createPreOpSyncEvent(new TrancheState(), kernelCtx())
    );

    const later = kernelCtx();
    later.blockNumber = BLOCK_NUMBER.plus(BigInt.fromI32(1));
    handlePreOpTrancheAccountingSynced(createPreOpSyncEvent(new TrancheState(), later));

    assert.entityCount("DayTrancheAccountingSyncedHistory", 2);
    // Dense entryIndex, ordered by block.
  });

  test("a sync for an unknown market is a no-op", () => {
    clearStore();
    const market = DayMarketFixture.standard();
    mockDayMarket(market); // KERNEL() resolvable; the market ENTITY is absent

    handlePostOpTrancheAccountingSynced(
      createPostOpSyncEvent(0, new TrancheState(), kernelCtx())
    );

    assert.entityCount("DayMarketState", 0);
    // The early return also means no history row was written.
    assert.entityCount("DayTrancheAccountingSyncedHistory", 0);
  });
});describe("the fixed-term lifecycle", () => {
  beforeEach(() => {
    clearStore();
  });

  test("FixedTermCommenced opens entry 0 and advances the count to 1", () => {
    // A count, not a last-index: the stream is born empty, so the first term is
    // entry 0 and the count becomes 1.
    deployMarket();

    handleFixedTermCommenced(
      createUintEvent<FixedTermCommenced>(
        "fixedTermEndTimestamp",
        TERM_END,
        accountantCtx()
      )
    );

    assert.fieldEquals("DayMarketState", MARKET_ID, "countFixedTermEntries", "1");
    assert.fieldEquals("DayMarketState", MARKET_ID, "marketState", "fixed");
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "fixedTermEndTimestamp",
      TERM_END.toString()
    );

    const entryId = generateMarketRecordId(
      ADDR_KERNEL.toHexString(),
      BigInt.zero()
    );
    assert.fieldEquals("DayFixedTermHistory", entryId, "entryIndex", "0");
    assert.fieldEquals(
      "DayFixedTermHistory",
      entryId,
      "startBlockTimestamp",
      BLOCK_TIMESTAMP.toString()
    );
    assert.fieldEquals(
      "DayFixedTermHistory",
      entryId,
      "scheduledEndBlockTimestamp",
      TERM_END.toString()
    );
    // Open.
    assert.fieldEquals("DayFixedTermHistory", entryId, "endBlockTimestamp", "0");
    // ...and `duration` is genuinely NULL, not 0. It is the one nullable column in the
    // schema, precisely so a running term is distinguishable from one that opened and
    // closed inside a single block (a real 0-second duration).
    //
    // Asserted via fieldEquals rather than assert.assertNull: that helper is
    // `assertNull<T>(value)` doing `value == null` internally, and instantiating it at
    // `BigInt | null` selects BigInt's `==` operator overload against a null operand,
    // which CRASHES the AssemblyScript compiler (compileBinaryOverload). Not a bug in
    // this code — just do not reach for assertNull on a nullable BigInt.
    assert.fieldEquals("DayFixedTermHistory", entryId, "duration", "null");
  });

  test("duration fills in on close: endBlockTimestamp - startBlockTimestamp", () => {
    deployMarket();
    handleFixedTermCommenced(
      createUintEvent<FixedTermCommenced>(
        "fixedTermEndTimestamp",
        TERM_END,
        accountantCtx()
      )
    );

    const end = accountantCtx();
    end.blockTimestamp = BLOCK_TIMESTAMP.plus(BigInt.fromI32(600));
    handleFixedTermEnded(createEmptyEvent<FixedTermEnded>(end));

    const entryId = generateMarketRecordId(
      ADDR_KERNEL.toHexString(),
      BigInt.zero()
    );
    // 600 seconds — the ACTUAL elapsed time, not the scheduled term length. This term
    // was scheduled to run until TERM_END and was cut short, so a `duration` derived
    // from scheduledEndBlockTimestamp would report something quite different.
    assert.fieldEquals("DayFixedTermHistory", entryId, "duration", "600");
  });

  test("a term opens with a ZERO loss — the seed must exist", () => {
    // NON-NULL, so leaving it unset is fatal at INDEX time and `graph build` cannot
    // catch it (§8). This asserts the seed is actually written. 0 is unambiguous as a
    // "no loss" marker because a real erase is always > 0 — the handler returns early
    // on a zero erase — it just cannot on its own tell a running term from an ended one.
    deployMarket();
    handleFixedTermCommenced(
      createUintEvent<FixedTermCommenced>(
        "fixedTermEndTimestamp",
        TERM_END,
        accountantCtx()
      )
    );

    const entryId = generateMarketRecordId(
      ADDR_KERNEL.toHexString(),
      BigInt.zero()
    );
    assert.fieldEquals(
      "DayFixedTermHistory",
      entryId,
      "juniorTrancheImpermanentLossNAV",
      "0"
    );
  });

  test("a CLEAN expiry sets duration and leaves the loss at ZERO", () => {
    // THE PAIR A CONSUMER READS TOGETHER — neither column answers it alone:
    //   duration IS NULL                -> still running
    //   duration NOT NULL + loss = 0    -> ran its course, no coverage erased
    //   duration NOT NULL + loss > 0    -> a loss hit this term
    // Guards closeOpenFixedTerm against ever writing a loss of its own: closing a term
    // is not a coverage event, and only the Reset may set that column.
    deployMarket();
    handleFixedTermCommenced(
      createUintEvent<FixedTermCommenced>(
        "fixedTermEndTimestamp",
        TERM_END,
        accountantCtx()
      )
    );

    // Ends naturally. NO JuniorTrancheImpermanentLossReset follows — nothing was erased.
    const end = accountantCtx();
    end.blockTimestamp = BLOCK_TIMESTAMP.plus(BigInt.fromI32(600));
    handleFixedTermEnded(createEmptyEvent<FixedTermEnded>(end));

    const entryId = generateMarketRecordId(
      ADDR_KERNEL.toHexString(),
      BigInt.zero()
    );
    assert.fieldEquals("DayFixedTermHistory", entryId, "endBlockTimestamp", end.blockTimestamp.toString());
    assert.fieldEquals("DayFixedTermHistory", entryId, "duration", "600");
    assert.fieldEquals(
      "DayFixedTermHistory",
      entryId,
      "juniorTrancheImpermanentLossNAV",
      "0"
    );
    // And the market's LIFETIME total is untouched — it only moves on a real erase.
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheImpermanentLossNAV",
      "0"
    );
  });

  test("a term that opens and closes in ONE BLOCK stores duration 0, not null", () => {
    // THE ENCODING TEST, and the reason `duration` is nullable rather than
    // 0-sentinelled. 0 is a legitimate duration, so it must survive as 0 and stay
    // distinguishable from a running term.
    //
    // It also pins down a real hazard in the generated setter, which reads
    // `if (!value) { this.unset("duration") }`. That is only correct because
    // AssemblyScript's `!` on a reference type is a NULL check — if it were numeric
    // truthiness, a zero BigInt would silently unset the column and a same-block term
    // would be indistinguishable from one still running.
    deployMarket();
    handleFixedTermCommenced(
      createUintEvent<FixedTermCommenced>(
        "fixedTermEndTimestamp",
        TERM_END,
        accountantCtx()
      )
    );

    // Same block, same timestamp — only the log index moves.
    const sameBlock = accountantCtx();
    sameBlock.logIndex = BigInt.fromI32(9);
    handleFixedTermEnded(createEmptyEvent<FixedTermEnded>(sameBlock));

    const entryId = generateMarketRecordId(
      ADDR_KERNEL.toHexString(),
      BigInt.zero()
    );
    assert.fieldEquals("DayFixedTermHistory", entryId, "duration", "0");
  });

  test("FixedTermEnded closes the open row and flips the market perpetual", () => {
    // The event payload is EMPTY — it names no term. The open row at
    // (count - 1) is the only way to know which one ended.
    deployMarket();
    handleFixedTermCommenced(
      createUintEvent<FixedTermCommenced>(
        "fixedTermEndTimestamp",
        TERM_END,
        accountantCtx()
      )
    );

    const end = accountantCtx();
    end.blockTimestamp = BLOCK_TIMESTAMP.plus(BigInt.fromI32(600));
    handleFixedTermEnded(createEmptyEvent<FixedTermEnded>(end));

    assert.fieldEquals("DayMarketState", MARKET_ID, "marketState", "perpetual");
    // The contract deletes it; the SCHEDULED end survives on the history row.
    assert.fieldEquals("DayMarketState", MARKET_ID, "fixedTermEndTimestamp", "0");
    // The count does NOT advance on a close.
    assert.fieldEquals("DayMarketState", MARKET_ID, "countFixedTermEntries", "1");

    const entryId = generateMarketRecordId(
      ADDR_KERNEL.toHexString(),
      BigInt.zero()
    );
    assert.fieldEquals(
      "DayFixedTermHistory",
      entryId,
      "endBlockTimestamp",
      end.blockTimestamp.toString()
    );
    // Scheduled vs actual — the whole reason the row keeps its own copy.
    assert.fieldEquals(
      "DayFixedTermHistory",
      entryId,
      "scheduledEndBlockTimestamp",
      TERM_END.toString()
    );
  });

  test("setFixedTermDuration(0) closes the term WITHOUT a FixedTermEnded", () => {
    // THE UNION-OF-TWO-EVENTS CASE. setFixedTermDuration(0) force-writes
    // lastMarketState = PERPETUAL and deletes fixedTermEndTimestamp, and emits NO
    // FixedTermEnded. Closing only on FixedTermEnded leaves endBlockTimestamp == 0
    // forever on a market that provably went perpetual.
    deployMarket();
    handleFixedTermCommenced(
      createUintEvent<FixedTermCommenced>(
        "fixedTermEndTimestamp",
        TERM_END,
        accountantCtx()
      )
    );

    const zeroed = accountantCtx();
    zeroed.blockTimestamp = BLOCK_TIMESTAMP.plus(BigInt.fromI32(900));
    handleFixedTermDurationUpdated(
      createUint24Event<FixedTermDurationUpdated>(
        "fixedTermDurationSeconds",
        0,
        zeroed
      )
    );

    assert.fieldEquals("DayMarketState", MARKET_ID, "marketState", "perpetual");
    assert.fieldEquals("DayMarketState", MARKET_ID, "fixedTermEndTimestamp", "0");
    assert.fieldEquals("DayMarketState", MARKET_ID, "fixedTermDurationSeconds", "0");
    assert.fieldEquals(
      "DayFixedTermHistory",
      generateMarketRecordId(ADDR_KERNEL.toHexString(), BigInt.zero()),
      "endBlockTimestamp",
      zeroed.blockTimestamp.toString()
    );
    // duration is filled by closeOpenFixedTerm, so BOTH close paths set it — not just
    // FixedTermEnded. Closing only on that one would leave duration null forever on a
    // provably-perpetual market, the same silent gap endBlockTimestamp had.
    assert.fieldEquals(
      "DayFixedTermHistory",
      generateMarketRecordId(ADDR_KERNEL.toHexString(), BigInt.zero()),
      "duration",
      "900"
    );
  });

  test("a non-zero duration change does NOT close an open term", () => {
    deployMarket();
    handleFixedTermCommenced(
      createUintEvent<FixedTermCommenced>(
        "fixedTermEndTimestamp",
        TERM_END,
        accountantCtx()
      )
    );

    handleFixedTermDurationUpdated(
      createUint24Event<FixedTermDurationUpdated>(
        "fixedTermDurationSeconds",
        14 * 24 * 60 * 60,
        accountantCtx()
      )
    );

    assert.fieldEquals("DayMarketState", MARKET_ID, "marketState", "fixed");
    const stillOpenId = generateMarketRecordId(
      ADDR_KERNEL.toHexString(),
      BigInt.zero()
    );
    assert.fieldEquals("DayFixedTermHistory", stillOpenId, "endBlockTimestamp", "0");
    // Still running, so still no duration.
    assert.fieldEquals("DayFixedTermHistory", stillOpenId, "duration", "null");
  });

  test("Ended then Duration(0) in one tx: the FIRST close wins", () => {
    // Both fire when a term expires naturally in the same tx as a
    // setFixedTermDuration(0): withSyncedAccounting syncs BEFORE the body, so
    // FixedTermEnded lands first, then FixedTermDurationUpdated(0) from the body.
    // The second must not overwrite the true end.
    deployMarket();
    handleFixedTermCommenced(
      createUintEvent<FixedTermCommenced>(
        "fixedTermEndTimestamp",
        TERM_END,
        accountantCtx()
      )
    );

    const ended = accountantCtx();
    ended.blockTimestamp = BLOCK_TIMESTAMP.plus(BigInt.fromI32(600));
    ended.logIndex = BigInt.fromI32(3);
    handleFixedTermEnded(createEmptyEvent<FixedTermEnded>(ended));

    // Same tx, higher log index, LATER timestamp would be wrong to record.
    const zeroed = accountantCtx();
    zeroed.blockTimestamp = BLOCK_TIMESTAMP.plus(BigInt.fromI32(999));
    zeroed.logIndex = BigInt.fromI32(4);
    handleFixedTermDurationUpdated(
      createUint24Event<FixedTermDurationUpdated>(
        "fixedTermDurationSeconds",
        0,
        zeroed
      )
    );

    assert.fieldEquals(
      "DayFixedTermHistory",
      generateMarketRecordId(ADDR_KERNEL.toHexString(), BigInt.zero()),
      "endBlockTimestamp",
      ended.blockTimestamp.toString()
    );
    assert.entityCount("DayFixedTermHistory", 1);
  });

  test("Duration(0) before any term ever started is a no-op, not a crash", () => {
    // initialize() emits FixedTermDurationUpdated, so this runs at market creation
    // when countFixedTermEntries is 0 and (count - 1) would be -1.
    deployMarket();

    handleFixedTermDurationUpdated(
      createUint24Event<FixedTermDurationUpdated>(
        "fixedTermDurationSeconds",
        0,
        accountantCtx()
      )
    );

    assert.entityCount("DayFixedTermHistory", 0);
    assert.fieldEquals("DayMarketState", MARKET_ID, "countFixedTermEntries", "0");
  });

  test("Reset A: sync-path term end patches the row closed in this tx", () => {
    // The sync emits FixedTermEnded at a LOWER log index than the Reset, so by the
    // time the Reset lands the row is already closed. This is the ordinary path.
    deployMarket();
    handleFixedTermCommenced(
      createUintEvent<FixedTermCommenced>(
        "fixedTermEndTimestamp",
        TERM_END,
        accountantCtx()
      )
    );

    const ended = accountantCtx();
    ended.blockTimestamp = BLOCK_TIMESTAMP.plus(BigInt.fromI32(600));
    ended.logIndex = BigInt.fromI32(3);
    handleFixedTermEnded(createEmptyEvent<FixedTermEnded>(ended));

    const reset = accountantCtx();
    reset.blockTimestamp = ended.blockTimestamp;
    reset.logIndex = BigInt.fromI32(4); // same tx, higher log
    handleJuniorTrancheImpermanentLossReset(
      createUintEvent<JuniorTrancheImpermanentLossReset>(
        "jtImpermanentLossErased",
        BigInt.fromI32(9_301),
        reset
      )
    );

    assert.fieldEquals(
      "DayFixedTermHistory",
      generateMarketRecordId(ADDR_KERNEL.toHexString(), BigInt.zero()),
      "juniorTrancheImpermanentLossNAV",
      "9301"
    );
  });

  test("Reset B: setFixedTermDuration(0) mid-term patches the STILL-OPEN row", () => {
    // THE CASE THE OBVIOUS GUARD GETS WRONG. On a live, non-elapsed term the
    // pre-body sync does not erase, so the body emits the Reset carrying a REAL
    // loss — and it emits it BEFORE its own FixedTermDurationUpdated(0), which is
    // what closes the row. A handler that required a closed row would drop the loss
    // here, silently, on every mid-term setFixedTermDuration(0).
    deployMarket();
    handleFixedTermCommenced(
      createUintEvent<FixedTermCommenced>(
        "fixedTermEndTimestamp",
        TERM_END,
        accountantCtx()
      )
    );

    // Reset first (:925), row still open.
    const reset = accountantCtx();
    reset.blockTimestamp = BLOCK_TIMESTAMP.plus(BigInt.fromI32(900));
    reset.logIndex = BigInt.fromI32(3);
    handleJuniorTrancheImpermanentLossReset(
      createUintEvent<JuniorTrancheImpermanentLossReset>(
        "jtImpermanentLossErased",
        BigInt.fromI32(9_302),
        reset
      )
    );

    // ...then the close (:931), same tx.
    const zeroed = accountantCtx();
    zeroed.blockTimestamp = reset.blockTimestamp;
    zeroed.logIndex = BigInt.fromI32(4);
    handleFixedTermDurationUpdated(
      createUint24Event<FixedTermDurationUpdated>(
        "fixedTermDurationSeconds",
        0,
        zeroed
      )
    );

    const entryId = generateMarketRecordId(
      ADDR_KERNEL.toHexString(),
      BigInt.zero()
    );
    assert.fieldEquals(
      "DayFixedTermHistory",
      entryId,
      "juniorTrancheImpermanentLossNAV",
      "9302"
    );
    assert.fieldEquals(
      "DayFixedTermHistory",
      entryId,
      "endBlockTimestamp",
      zeroed.blockTimestamp.toString()
    );
  });

  test("Reset C: an incidental erase on a perpetual market leaves the row alone", () => {
    // The erase branch fires on an already-perpetual market too (coverage past the
    // liquidation threshold, JT wiped out). The last term closed in an EARLIER tx
    // and its recorded loss must not be overwritten with an unrelated number.
    deployMarket();
    handleFixedTermCommenced(
      createUintEvent<FixedTermCommenced>(
        "fixedTermEndTimestamp",
        TERM_END,
        accountantCtx()
      )
    );
    const ended = accountantCtx();
    ended.blockTimestamp = BLOCK_TIMESTAMP.plus(BigInt.fromI32(600));
    handleFixedTermEnded(createEmptyEvent<FixedTermEnded>(ended));

    const reset = accountantCtx();
    reset.blockTimestamp = ended.blockTimestamp;
    handleJuniorTrancheImpermanentLossReset(
      createUintEvent<JuniorTrancheImpermanentLossReset>(
        "jtImpermanentLossErased",
        BigInt.fromI32(9_303),
        reset
      )
    );

    // A LATER tx, market long perpetual: must not touch the concluded term.
    const later = accountantCtx();
    later.blockTimestamp = BLOCK_TIMESTAMP.plus(BigInt.fromI32(99_999));
    later.txHash = TX_HASH_2;
    handleJuniorTrancheImpermanentLossReset(
      createUintEvent<JuniorTrancheImpermanentLossReset>(
        "jtImpermanentLossErased",
        BigInt.fromI32(7_777),
        later
      )
    );

    // The concluded term keeps ITS OWN loss — patching it would have overwritten 9303
    // with an unrelated 7777, which is the corruption this guard exists to prevent.
    assert.fieldEquals(
      "DayFixedTermHistory",
      generateMarketRecordId(ADDR_KERNEL.toHexString(), BigInt.zero()),
      "juniorTrancheImpermanentLossNAV",
      "9303"
    );
    // ...and the orphaned erase is NOT dropped: it gets a zero-length term of its own.
    // Skipping it would leave 7777 in the market's lifetime total with no row behind it.
    assert.entityCount("DayFixedTermHistory", 2);
    const orphan = generateMarketRecordId(
      ADDR_KERNEL.toHexString(),
      BigInt.fromI32(1)
    );
    assert.fieldEquals("DayFixedTermHistory", orphan, "duration", "0");
    assert.fieldEquals(
      "DayFixedTermHistory",
      orphan,
      "juniorTrancheImpermanentLossNAV",
      "7777"
    );
    // SUM(rows) == the market's lifetime total: 9303 + 7777.
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheImpermanentLossNAV",
      "17080"
    );
  });

  test("zero duration: a loss opens its OWN zero-length closed term", () => {
    // With no configured term length there is no term to patch, so the loss gets a
    // degenerate one. Without this it reached case C and was dropped from history
    // entirely, leaving DayMarketState's lifetime total permanently above
    // SUM(DayFixedTermHistory.juniorTrancheImpermanentLossNAV) with no way to
    // attribute the difference.
    deployMarket();
    // Drive the market to a zero duration. No term is open, so this closes nothing.
    handleFixedTermDurationUpdated(
      createUint24Event<FixedTermDurationUpdated>(
        "fixedTermDurationSeconds",
        0,
        accountantCtx()
      )
    );
    assert.fieldEquals("DayMarketState", MARKET_ID, "fixedTermDurationSeconds", "0");
    assert.entityCount("DayFixedTermHistory", 0);

    const reset = accountantCtx();
    reset.blockTimestamp = BLOCK_TIMESTAMP.plus(BigInt.fromI32(4_242));
    handleJuniorTrancheImpermanentLossReset(
      createUintEvent<JuniorTrancheImpermanentLossReset>(
        "jtImpermanentLossErased",
        BigInt.fromI32(5_150),
        reset
      )
    );

    assert.entityCount("DayFixedTermHistory", 1);
    const id = generateMarketRecordId(ADDR_KERNEL.toHexString(), BigInt.zero());
    assert.fieldEquals("DayFixedTermHistory", id, "entryIndex", "0");
    // All three timestamps are this block's: it opens and closes on the event.
    const t = reset.blockTimestamp.toString();
    assert.fieldEquals("DayFixedTermHistory", id, "startBlockTimestamp", t);
    assert.fieldEquals("DayFixedTermHistory", id, "scheduledEndBlockTimestamp", t);
    assert.fieldEquals("DayFixedTermHistory", id, "endBlockTimestamp", t);
    // A REAL zero duration, not a null — the term genuinely lasted no time.
    assert.fieldEquals("DayFixedTermHistory", id, "duration", "0");
    assert.fieldEquals(
      "DayFixedTermHistory",
      id,
      "juniorTrancheImpermanentLossNAV",
      "5150"
    );
    // The cursor advanced AND was persisted — recordFixedTermCoverageLoss mutates the
    // in-memory market and touchMarket is the save. Called in the other order this
    // reads 0 and the next loss overwrites this row.
    assert.fieldEquals("DayMarketState", MARKET_ID, "countFixedTermEntries", "1");
    // And the lifetime total now reconciles with the row.
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheImpermanentLossNAV",
      "5150"
    );
  });

  test("zero duration: each loss gets its OWN row — they never overwrite", () => {
    // The cursor-persistence test. If the bump were lost, both losses would resolve to
    // entryIndex 0 and the second would silently overwrite the first — one row, the
    // wrong number, and the market total no longer equal to the sum.
    deployMarket();
    handleFixedTermDurationUpdated(
      createUint24Event<FixedTermDurationUpdated>(
        "fixedTermDurationSeconds",
        0,
        accountantCtx()
      )
    );

    const first = accountantCtx();
    first.blockTimestamp = BLOCK_TIMESTAMP.plus(BigInt.fromI32(100));
    handleJuniorTrancheImpermanentLossReset(
      createUintEvent<JuniorTrancheImpermanentLossReset>(
        "jtImpermanentLossErased",
        BigInt.fromI32(300),
        first
      )
    );

    const second = accountantCtx();
    second.blockTimestamp = BLOCK_TIMESTAMP.plus(BigInt.fromI32(200));
    second.txHash = TX_HASH_2;
    handleJuniorTrancheImpermanentLossReset(
      createUintEvent<JuniorTrancheImpermanentLossReset>(
        "jtImpermanentLossErased",
        BigInt.fromI32(700),
        second
      )
    );

    assert.entityCount("DayFixedTermHistory", 2);
    assert.fieldEquals("DayMarketState", MARKET_ID, "countFixedTermEntries", "2");
    assert.fieldEquals(
      "DayFixedTermHistory",
      generateMarketRecordId(ADDR_KERNEL.toHexString(), BigInt.zero()),
      "juniorTrancheImpermanentLossNAV",
      "300"
    );
    assert.fieldEquals(
      "DayFixedTermHistory",
      generateMarketRecordId(ADDR_KERNEL.toHexString(), BigInt.fromI32(1)),
      "juniorTrancheImpermanentLossNAV",
      "700"
    );
    // SUM(rows) == the market lifetime total. That reconciliation is the whole point.
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheImpermanentLossNAV",
      "1000"
    );
  });

  test("zero duration: a ZERO erase still writes nothing", () => {
    // The unguarded config site emits this even when nothing was erased. The new branch
    // must not turn that into a spurious zero-length term.
    deployMarket();
    handleFixedTermDurationUpdated(
      createUint24Event<FixedTermDurationUpdated>(
        "fixedTermDurationSeconds",
        0,
        accountantCtx()
      )
    );

    handleJuniorTrancheImpermanentLossReset(
      createUintEvent<JuniorTrancheImpermanentLossReset>(
        "jtImpermanentLossErased",
        BigInt.zero(),
        accountantCtx()
      )
    );

    assert.entityCount("DayFixedTermHistory", 0);
    assert.fieldEquals("DayMarketState", MARKET_ID, "countFixedTermEntries", "0");
  });

  test("a Reset carrying ZERO never patches — only the unguarded site emits it", () => {
    // The sync site is guarded by != ZERO_NAV_UNITS, so a zero can only come from
    // setFixedTermDuration(0)'s unguarded emit. That is how one tx emits TWO
    // Resets: a natural expiry erases via the sync (non-zero, patches), then the
    // body re-emits from the now-zeroed storage.
    deployMarket();
    handleFixedTermCommenced(
      createUintEvent<FixedTermCommenced>(
        "fixedTermEndTimestamp",
        TERM_END,
        accountantCtx()
      )
    );
    const ended = accountantCtx();
    ended.blockTimestamp = BLOCK_TIMESTAMP.plus(BigInt.fromI32(600));
    handleFixedTermEnded(createEmptyEvent<FixedTermEnded>(ended));

    const real = accountantCtx();
    real.blockTimestamp = ended.blockTimestamp;
    handleJuniorTrancheImpermanentLossReset(
      createUintEvent<JuniorTrancheImpermanentLossReset>(
        "jtImpermanentLossErased",
        BigInt.fromI32(9_304),
        real
      )
    );

    // The body's second Reset, same tx, now zero. Must not clobber.
    const zeroReset = accountantCtx();
    zeroReset.blockTimestamp = ended.blockTimestamp;
    handleJuniorTrancheImpermanentLossReset(
      createUintEvent<JuniorTrancheImpermanentLossReset>(
        "jtImpermanentLossErased",
        BigInt.zero(),
        zeroReset
      )
    );

    assert.fieldEquals(
      "DayFixedTermHistory",
      generateMarketRecordId(ADDR_KERNEL.toHexString(), BigInt.zero()),
      "juniorTrancheImpermanentLossNAV",
      "9304"
    );
  });

  test("juniorTrancheImpermanentLossNAV accumulates and never decreases", () => {
    // A LIFETIME TOTAL, and the only place this number exists — no contract tracks
    // it. It must add, not overwrite: a handler that assigned instead of summing
    // would look right on the first erase and be wrong forever after.
    deployMarket();
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheImpermanentLossNAV",
      "0"
    );

    handleFixedTermCommenced(
      createUintEvent<FixedTermCommenced>(
        "fixedTermEndTimestamp",
        TERM_END,
        accountantCtx()
      )
    );
    handleFixedTermEnded(createEmptyEvent<FixedTermEnded>(accountantCtx()));
    handleJuniorTrancheImpermanentLossReset(
      createUintEvent<JuniorTrancheImpermanentLossReset>(
        "jtImpermanentLossErased",
        BigInt.fromI32(100),
        accountantCtx()
      )
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheImpermanentLossNAV",
      "100"
    );

    // A SECOND, smaller erase in a later tx. The total must climb to 130 — an
    // overwrite would drop it to 30, which is the whole bug this pins.
    const later = accountantCtx();
    later.txHash = TX_HASH_2;
    later.blockTimestamp = BLOCK_TIMESTAMP.plus(BigInt.fromI32(50_000));
    handleJuniorTrancheImpermanentLossReset(
      createUintEvent<JuniorTrancheImpermanentLossReset>(
        "jtImpermanentLossErased",
        BigInt.fromI32(30),
        later
      )
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheImpermanentLossNAV",
      "130"
    );
  });

  test("the lifetime total counts erases that ended NO term", () => {
    // This is why the market total and the per-term rows are allowed to disagree.
    // The erase branch fires on already-perpetual markets too (coverage past the
    // liquidation threshold, JT wiped out), and those erases end no term — they
    // belong in the total but in no history row.
    deployMarket();
    handleFixedTermCommenced(
      createUintEvent<FixedTermCommenced>(
        "fixedTermEndTimestamp",
        TERM_END,
        accountantCtx()
      )
    );
    const ended = accountantCtx();
    ended.blockTimestamp = BLOCK_TIMESTAMP.plus(BigInt.fromI32(600));
    handleFixedTermEnded(createEmptyEvent<FixedTermEnded>(ended));

    // The term-ending erase: hits BOTH the total and the row.
    const atEnd = accountantCtx();
    atEnd.blockTimestamp = ended.blockTimestamp;
    handleJuniorTrancheImpermanentLossReset(
      createUintEvent<JuniorTrancheImpermanentLossReset>(
        "jtImpermanentLossErased",
        BigInt.fromI32(100),
        atEnd
      )
    );

    // An incidental erase later, market perpetual: total ONLY.
    const incidental = accountantCtx();
    incidental.txHash = TX_HASH_2;
    incidental.blockTimestamp = BLOCK_TIMESTAMP.plus(BigInt.fromI32(70_000));
    handleJuniorTrancheImpermanentLossReset(
      createUintEvent<JuniorTrancheImpermanentLossReset>(
        "jtImpermanentLossErased",
        BigInt.fromI32(7),
        incidental
      )
    );

    // 107 in the total...
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheImpermanentLossNAV",
      "107"
    );
    // ...but the concluded term still reports only its own 100. The 7 belongs to
    // no term and must not have leaked into the row.
    assert.fieldEquals(
      "DayFixedTermHistory",
      generateMarketRecordId(ADDR_KERNEL.toHexString(), BigInt.zero()),
      "juniorTrancheImpermanentLossNAV",
      "100"
    );
  });

  test("a zero Reset does not touch the total, or updatedAt", () => {
    // The unguarded setFixedTermDuration(0) site fires even when nothing was
    // erased. Adding 0 is harmless arithmetic but would still bump updatedAt* on a
    // row where nothing changed.
    deployMarket();

    const zero = accountantCtx();
    zero.txHash = TX_HASH_2;
    zero.blockTimestamp = BLOCK_TIMESTAMP.plus(BigInt.fromI32(60_000));
    handleJuniorTrancheImpermanentLossReset(
      createUintEvent<JuniorTrancheImpermanentLossReset>(
        "jtImpermanentLossErased",
        BigInt.zero(),
        zero
      )
    );

    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheImpermanentLossNAV",
      "0"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "updatedAtBlockTimestamp",
      BLOCK_TIMESTAMP.toString()
    );
  });

  test("the lifetime total does not disturb the LIVE coverage-IL field", () => {
    // The two differ by one word and mean opposite things:
    // juniorTrancheImpermanentLoss is the live, point-in-time value from
    // the preview block; juniorTrancheImpermanentLossNAV is the lifetime total erased.
    deployMarket();
    handleJuniorTrancheImpermanentLossReset(
      createUintEvent<JuniorTrancheImpermanentLossReset>(
        "jtImpermanentLossErased",
        BigInt.fromI32(100),
        accountantCtx()
      )
    );

    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheImpermanentLossNAV",
      "100"
    );
    // Still the factory's seeded live value — this handler must not touch it.
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheImpermanentLoss",
      "7201"
    );
  });

  test("a Reset DURING the commencement grace period gets its own zero-length term", () => {
    // A duration IS configured, but no term has ever run — the commonest reason being
    // that the market is still inside its grace period: it cannot enter a fixed term
    // until block.timestamp >= fixedTermCommenceableAtTimestamp
    // (RoycoDayAccountant.sol:550). Losses can be erased inside that window regardless.
    //
    // There is no term to patch, and dropping it would leave the loss recorded ONLY in
    // the market's lifetime total — unattributable, with no row and no timestamp to ask
    // when it happened. It gets a zero-length term of its own instead.
    deployMarket();
    assert.entityCount("DayFixedTermHistory", 0);

    const c = accountantCtx();
    c.blockTimestamp = BLOCK_TIMESTAMP.plus(BigInt.fromI32(321));
    handleJuniorTrancheImpermanentLossReset(
      createUintEvent<JuniorTrancheImpermanentLossReset>(
        "jtImpermanentLossErased",
        BigInt.fromI32(9_305),
        c
      )
    );

    // One degenerate term, opened and closed on this event.
    assert.entityCount("DayFixedTermHistory", 1);
    const id = generateMarketRecordId(ADDR_KERNEL.toHexString(), BigInt.zero());
    const t = c.blockTimestamp.toString();
    assert.fieldEquals("DayFixedTermHistory", id, "startBlockTimestamp", t);
    assert.fieldEquals("DayFixedTermHistory", id, "endBlockTimestamp", t);
    assert.fieldEquals("DayFixedTermHistory", id, "duration", "0");
    assert.fieldEquals("DayFixedTermHistory", id, "juniorTrancheImpermanentLossNAV", "9305");
    assert.fieldEquals("DayMarketState", MARKET_ID, "countFixedTermEntries", "1");

    // AND THE TWO RECONCILE — the whole point. SUM(rows) == the lifetime total.
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheImpermanentLossNAV",
      "9305"
    );
  });

  test("a second term opens entry 1 — the stream is dense", () => {
    deployMarket();

    handleFixedTermCommenced(
      createUintEvent<FixedTermCommenced>(
        "fixedTermEndTimestamp",
        TERM_END,
        accountantCtx()
      )
    );
    handleFixedTermEnded(createEmptyEvent<FixedTermEnded>(accountantCtx()));

    const second = accountantCtx();
    second.blockTimestamp = BLOCK_TIMESTAMP.plus(BigInt.fromI32(5000));
    handleFixedTermCommenced(
      createUintEvent<FixedTermCommenced>(
        "fixedTermEndTimestamp",
        TERM_END.plus(BigInt.fromI32(5000)),
        second
      )
    );

    assert.fieldEquals("DayMarketState", MARKET_ID, "countFixedTermEntries", "2");
    assert.entityCount("DayFixedTermHistory", 2);
    assert.fieldEquals(
      "DayFixedTermHistory",
      generateMarketRecordId(ADDR_KERNEL.toHexString(), BigInt.fromI32(1)),
      "entryIndex",
      "1"
    );
    // Entry 0 still carries its own end — the new term did not touch it.
    assert.fieldEquals(
      "DayFixedTermHistory",
      generateMarketRecordId(ADDR_KERNEL.toHexString(), BigInt.zero()),
      "scheduledEndBlockTimestamp",
      TERM_END.toString()
    );
  });
});

describe("kernel handlers", () => {
  beforeEach(() => {
    clearStore();
  });

  test("the kernel address IS the marketId — no accountant hop", () => {
    deployMarket();

    handleProtocolFeeRecipientUpdated(
      createAddressEvent<ProtocolFeeRecipientUpdated>(
        "protocolFeeRecipient",
        ADDR_ALICE,
        kernelCtx()
      )
    );
    handleSeniorTrancheSelfLiquidationBonusUpdated(
      createUintEvent<SeniorTrancheSelfLiquidationBonusUpdated>(
        "stSelfLiquidationBonusWAD",
        BigInt.fromI32(9_201),
        kernelCtx()
      )
    );

    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "protocolFeeRecipientAddress",
      ADDR_ALICE.toHexString()
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "seniorTrancheSelfLiquidationBonusWAD",
      "9201"
    );
  });

  test("a kernel event for an unknown market is a no-op", () => {
    clearStore();

    handleProtocolFeeRecipientUpdated(
      createAddressEvent<ProtocolFeeRecipientUpdated>(
        "protocolFeeRecipient",
        ADDR_ALICE,
        kernelCtx()
      )
    );

    assert.entityCount("DayMarketState", 0);
  });
});
