import {
  assert,
  describe,
  test,
  clearStore,
  beforeEach,
} from "matchstick-as/assembly/index";
import { BigInt } from "@graphprotocol/graph-ts";
import { handleMarketDeploymentCompleted } from "../../src/royco-factory";
import {
  handleCoverageUpdated,
  handleLiquidityUpdated,
  handleLiquidationCoverageUtilizationUpdated,
  handleFixedTermDurationUpdated,
  handleMaxYieldSharesUpdated,
  handleFixedTermCommenced,
  handleFixedTermEnded,
  handleSeniorTrancheProtocolFeeUpdated,
  handleJuniorTrancheProtocolFeeUpdated,
  handleJuniorTrancheYieldShareProtocolFeeUpdated,
  handleLiquidityTrancheYieldShareProtocolFeeUpdated,
  handleSeniorTrancheDustToleranceUpdated,
  handleJuniorTrancheDustToleranceUpdated,
  handleJuniorTrancheYDMUpdated,
  handleLiquidityTrancheYDMUpdated,
  handleJuniorTrancheCoverageImpermanentLossReset,
  handleTrancheAccountingSynced,
} from "../../src/royco-day-accountant";
import {
  handleProtocolFeeRecipientUpdated,
  handleSeniorTrancheSelfLiquidationBonusUpdated,
} from "../../src/royco-day-kernel";
import {
  CoverageUpdated,
  LiquidityUpdated,
  LiquidationCoverageUtilizationUpdated,
  FixedTermDurationUpdated,
  MaxYieldSharesUpdated,
  FixedTermCommenced,
  FixedTermEnded,
  SeniorTrancheProtocolFeeUpdated,
  JuniorTrancheProtocolFeeUpdated,
  JuniorTrancheYieldShareProtocolFeeUpdated,
  LiquidityTrancheYieldShareProtocolFeeUpdated,
  SeniorTrancheDustToleranceUpdated,
  JuniorTrancheDustToleranceUpdated,
  JuniorTrancheYDMUpdated,
  LiquidityTrancheYDMUpdated,
  JuniorTrancheCoverageImpermanentLossReset,
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
  createTrancheAccountingSyncedEvent,
} from "../builders/accountant";
import { TrancheState } from "../builders/shared";
import { DayMarketFixture, mockDayMarket } from "../mocks";
import { ctx, EventContext } from "../helpers/event";
import {
  ADDR_ACCOUNTANT,
  ADDR_ALICE,
  ADDR_BOB,
  ADDR_DEPLOYER,
  ADDR_KERNEL,
  ADDR_SENIOR,
  ADDR_TEMPLATE,
  BLOCK_TIMESTAMP,
  TX_HASH_2,
  WAD,
} from "../helpers/constants";
import {
  generateMarketRecordId,
  generateMarketId,
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
    // writing minLiquidityWAD from the CoverageUpdated param would be invisible
    // under shared values.
    deployMarket();

    handleCoverageUpdated(
      createUintEvent<CoverageUpdated>(
        "minCoverageWAD",
        BigInt.fromI32(9_001),
        accountantCtx()
      )
    );
    handleLiquidityUpdated(
      createUintEvent<LiquidityUpdated>(
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
      createUintEvent<LiquidityTrancheYieldShareProtocolFeeUpdated>(
        "ltYieldShareProtocolFeeWAD",
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
        "maxLTYieldShareWAD",
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

  test("BOTH dust handlers recompute effectiveNAVDustTolerance — it has no event", () => {
    // THE SILENT ONE. setSeniorTrancheDustTolerance and
    // setJuniorTrancheDustTolerance each recompute a cached
    // effectiveNAVDustTolerance = st + jt on-chain, and the contract emits NOTHING
    // for it. Without this recompute the column, seeded from getState() at
    // creation, drifts stale the first time either tolerance moves — and nothing
    // anywhere reports a problem.
    deployMarket();

    handleSeniorTrancheDustToleranceUpdated(
      createUintEvent<SeniorTrancheDustToleranceUpdated>(
        "stNAVDustTolerance",
        BigInt.fromI32(400),
        accountantCtx()
      )
    );
    // 400 + the factory's seeded jt (6102).
    assert.fieldEquals("DayMarketState", MARKET_ID, "seniorTrancheDustTolerance", "400");
    assert.fieldEquals("DayMarketState", MARKET_ID, "effectiveNAVDustTolerance", "6502");

    handleJuniorTrancheDustToleranceUpdated(
      createUintEvent<JuniorTrancheDustToleranceUpdated>(
        "jtNAVDustTolerance",
        BigInt.fromI32(600),
        accountantCtx()
      )
    );
    // Now 400 + 600 — proving the JT handler reads the ST value the FIRST handler
    // wrote, not the factory's stale seed.
    assert.fieldEquals("DayMarketState", MARKET_ID, "juniorTrancheDustTolerance", "600");
    assert.fieldEquals("DayMarketState", MARKET_ID, "effectiveNAVDustTolerance", "1000");
  });

  test("the YDM handlers write their own side", () => {
    deployMarket();

    handleJuniorTrancheYDMUpdated(
      createAddressEvent<JuniorTrancheYDMUpdated>("jtYDM", ADDR_ALICE, accountantCtx())
    );
    handleLiquidityTrancheYDMUpdated(
      createAddressEvent<LiquidityTrancheYDMUpdated>("ltYDM", ADDR_BOB, accountantCtx())
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
    // THE TEST PEOPLE FORGET. The Accountant's initialize() emits CoverageUpdated
    // and FixedTermDurationUpdated during deployMarket — at a LOWER log index than
    // the MarketDeploymentCompleted that creates this template and writes the
    // market. If graph-node ever replays those earlier same-block logs into the
    // new template, they land before the market exists.
    clearStore(); // no market
    const market = DayMarketFixture.standard();
    mockDayMarket(market); // KERNEL() still resolvable; the ENTITY is what's absent

    handleCoverageUpdated(
      createUintEvent<CoverageUpdated>(
        "minCoverageWAD",
        BigInt.fromI32(9_001),
        accountantCtx()
      )
    );

    assert.entityCount("DayMarketState", 0);
  });

  test("a config write never re-stamps createdAt", () => {
    // Re-stamping builds fine, indexes fine, and quietly destroys every cohort
    // query in Neon (§8).
    deployMarket();

    const later = accountantCtx();
    later.blockTimestamp = BLOCK_TIMESTAMP.plus(BigInt.fromI32(3600));
    later.txHash = TX_HASH_2;
    handleCoverageUpdated(
      createUintEvent<CoverageUpdated>("minCoverageWAD", BigInt.fromI32(9_001), later)
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

describe("handleTrancheAccountingSynced", () => {
  beforeEach(() => {
    clearStore();
  });

  test("un-freezes the ten preview fields, from the payload alone", () => {
    // Before this handler existed, all ten were written once by the factory and
    // never again — and since a fresh market has no supply and no NAV, they sat at
    // zero for the market's whole life. Nothing errored; the columns just lied.
    deployMarket();

    const s = new TrancheState();
    s.stRawNAV = BigInt.fromI32(1_001);
    s.jtRawNAV = BigInt.fromI32(1_002);
    s.ltRawNAV = BigInt.fromI32(1_003);
    s.stEffectiveNAV = BigInt.fromI32(1_004);
    s.jtEffectiveNAV = BigInt.fromI32(1_005);
    s.jtCoverageImpermanentLoss = BigInt.fromI32(1_006);
    s.ltLiquidityPremium = BigInt.fromI32(1_007);
    s.coverageUtilizationWAD = BigInt.fromI32(1_008);
    s.liquidityUtilizationWAD = BigInt.fromI32(1_009);
    s.jtCoinvested = true;

    handleTrancheAccountingSynced(
      createTrancheAccountingSyncedEvent(s, accountantCtx())
    );

    // Ten distinct sentinels: any transposition among these same-typed neighbours
    // lands the wrong number in the wrong column, plausibly.
    assert.fieldEquals("DayMarketState", MARKET_ID, "seniorTrancheRawNAV", "1001");
    assert.fieldEquals("DayMarketState", MARKET_ID, "juniorTrancheRawNAV", "1002");
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
      "juniorTrancheCoverageImpermanentLoss",
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
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "isJuniorTrancheCoinvested",
      "true"
    );
  });

  test("does NOT touch the five fields other handlers own", () => {
    // The payload carries these too, and copying it wholesale would make each
    // field's value depend on log ORDER. setCoverage syncs BEFORE its body, so a
    // sync carrying the OLD coverage is emitted BEFORE CoverageUpdated carries the
    // new one — this handler writing them would silently revert config changes.
    deployMarket();

    // The config handler sets the truth first...
    handleCoverageUpdated(
      createUintEvent<CoverageUpdated>(
        "minCoverageWAD",
        BigInt.fromI32(5_001),
        accountantCtx()
      )
    );
    handleLiquidityUpdated(
      createUintEvent<LiquidityUpdated>(
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
    handleTrancheAccountingSynced(
      createTrancheAccountingSyncedEvent(s, accountantCtx())
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
    const histId = generateMarketRecordId(ADDR_KERNEL.toHexString(), BigInt.zero());
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
    s.ltProtocolFee = BigInt.fromI32(4_446);
    handleTrancheAccountingSynced(
      createTrancheAccountingSyncedEvent(s, accountantCtx())
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
    const histId = generateMarketRecordId(ADDR_KERNEL.toHexString(), BigInt.zero());
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
    s.stRawNAV = BigInt.fromI32(1_001);
    handleTrancheAccountingSynced(
      createTrancheAccountingSyncedEvent(s, accountantCtx())
    );

    // 3 creation snapshots and no more — the sync added nothing.
    assert.entityCount("DayVaultStateHistorical", 3);
    assert.fieldEquals(
      "DayVaultState",
      generateVaultId(ADDR_SENIOR.toHexString()),
      "lastHistoricalEntryIndex",
      "0"
    );
  });

  test("records the full 18-field sync as an immutable history row (entry 0)", () => {
    // ALL eighteen fields, verbatim — the unabridged history DayMarketState does not
    // keep. Distinct sentinels for every field: a transposition among same-typed
    // neighbours lands the wrong number in the wrong column, plausibly.
    deployMarket();

    const s = new TrancheState();
    s.marketState = 1; // LIVE state -> "fixed"
    s.stRawNAV = BigInt.fromI32(3_001);
    s.jtRawNAV = BigInt.fromI32(3_002);
    s.ltRawNAV = BigInt.fromI32(3_003);
    s.stEffectiveNAV = BigInt.fromI32(3_004);
    s.jtEffectiveNAV = BigInt.fromI32(3_005);
    s.jtCoverageImpermanentLoss = BigInt.fromI32(3_006);
    s.ltLiquidityPremium = BigInt.fromI32(3_007);
    s.stProtocolFee = BigInt.fromI32(3_008);
    s.jtProtocolFee = BigInt.fromI32(3_009);
    s.ltProtocolFee = BigInt.fromI32(3_010);
    s.coverageUtilizationWAD = BigInt.fromI32(3_011);
    s.liquidityUtilizationWAD = BigInt.fromI32(3_012);
    s.fixedTermEndTimestamp = BigInt.fromI32(3_013);
    s.minCoverageWAD = BigInt.fromI32(3_014);
    s.jtCoinvested = true;
    s.coverageLiquidationUtilizationWAD = BigInt.fromI32(3_016);
    s.minLiquidityWAD = BigInt.fromI32(3_017);

    handleTrancheAccountingSynced(
      createTrancheAccountingSyncedEvent(s, accountantCtx())
    );

    // Use-then-increment: the first sync is entry 0 and the count becomes 1.
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "countTrancheAccountingSyncedEntries",
      "1"
    );
    assert.entityCount("DayTrancheAccountingSyncedHistory", 1);

    const id = generateMarketRecordId(ADDR_KERNEL.toHexString(), BigInt.zero());
    const E = "DayTrancheAccountingSyncedHistory";
    assert.fieldEquals(E, id, "entryIndex", "0");
    assert.fieldEquals(E, id, "marketId", ADDR_KERNEL.toHexString());
    assert.fieldEquals(E, id, "marketRefId", MARKET_ID);
    // LIVE market state from the payload — the value DayMarketState deliberately drops.
    assert.fieldEquals(E, id, "marketState", "fixed");
    assert.fieldEquals(E, id, "seniorTrancheRawNAV", "3001");
    assert.fieldEquals(E, id, "juniorTrancheRawNAV", "3002");
    assert.fieldEquals(E, id, "liquidityTrancheRawNAV", "3003");
    assert.fieldEquals(E, id, "seniorTrancheEffectiveNAV", "3004");
    assert.fieldEquals(E, id, "juniorTrancheEffectiveNAV", "3005");
    assert.fieldEquals(E, id, "juniorTrancheCoverageImpermanentLoss", "3006");
    assert.fieldEquals(E, id, "liquidityTrancheLiquidityPremium", "3007");
    assert.fieldEquals(E, id, "seniorTrancheProtocolFee", "3008");
    assert.fieldEquals(E, id, "juniorTrancheProtocolFee", "3009");
    assert.fieldEquals(E, id, "liquidityTrancheProtocolFee", "3010");
    assert.fieldEquals(E, id, "coverageUtilizationWAD", "3011");
    assert.fieldEquals(E, id, "liquidityUtilizationWAD", "3012");
    assert.fieldEquals(E, id, "fixedTermEndTimestamp", "3013");
    assert.fieldEquals(E, id, "minCoverageWAD", "3014");
    assert.fieldEquals(E, id, "isJuniorTrancheCoinvested", "true");
    assert.fieldEquals(E, id, "coverageLiquidationUtilizationWAD", "3016");
    assert.fieldEquals(E, id, "minLiquidityWAD", "3017");
    // Immutable: createdAt* is set; there is no updatedAt* on this entity.
    assert.fieldEquals(E, id, "createdAtBlockTimestamp", BLOCK_TIMESTAMP.toString());
  });

  test("a second sync opens entry 1 — the stream is dense", () => {
    // A count, not a last-index (§ ENTRY INDEX CURSOR). The second sync in the same
    // block gets the next dense entryIndex off the counter — no reliance on the
    // block timestamp, which would collide for two syncs in one block (§8).
    deployMarket();

    handleTrancheAccountingSynced(
      createTrancheAccountingSyncedEvent(new TrancheState(), accountantCtx())
    );

    const second = accountantCtx();
    second.logIndex = BigInt.fromI32(7); // same block, later log index
    handleTrancheAccountingSynced(
      createTrancheAccountingSyncedEvent(new TrancheState(), second)
    );

    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "countTrancheAccountingSyncedEntries",
      "2"
    );
    assert.entityCount("DayTrancheAccountingSyncedHistory", 2);
    assert.fieldEquals(
      "DayTrancheAccountingSyncedHistory",
      generateMarketRecordId(ADDR_KERNEL.toHexString(), BigInt.fromI32(1)),
      "entryIndex",
      "1"
    );
    // Entry 0 is immutable and still present, untouched by the second sync.
    assert.fieldEquals(
      "DayTrancheAccountingSyncedHistory",
      generateMarketRecordId(ADDR_KERNEL.toHexString(), BigInt.zero()),
      "entryIndex",
      "0"
    );
  });

  test("a sync for an unknown market is a no-op", () => {
    clearStore();
    const market = DayMarketFixture.standard();
    mockDayMarket(market); // KERNEL() resolvable; the market ENTITY is absent

    handleTrancheAccountingSynced(
      createTrancheAccountingSyncedEvent(new TrancheState(), accountantCtx())
    );

    assert.entityCount("DayMarketState", 0);
    // The early return also means no history row was written.
    assert.entityCount("DayTrancheAccountingSyncedHistory", 0);
  });
});

describe("the fixed-term lifecycle", () => {
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
    assert.fieldEquals(
      "DayFixedTermHistory",
      generateMarketRecordId(ADDR_KERNEL.toHexString(), BigInt.zero()),
      "endBlockTimestamp",
      "0"
    );
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
    handleJuniorTrancheCoverageImpermanentLossReset(
      createUintEvent<JuniorTrancheCoverageImpermanentLossReset>(
        "jtCoverageImpermanentLossErased",
        BigInt.fromI32(9_301),
        reset
      )
    );

    assert.fieldEquals(
      "DayFixedTermHistory",
      generateMarketRecordId(ADDR_KERNEL.toHexString(), BigInt.zero()),
      "juniorTrancheCoverageImpermanentLossNAV",
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
    handleJuniorTrancheCoverageImpermanentLossReset(
      createUintEvent<JuniorTrancheCoverageImpermanentLossReset>(
        "jtCoverageImpermanentLossErased",
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
      "juniorTrancheCoverageImpermanentLossNAV",
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
    handleJuniorTrancheCoverageImpermanentLossReset(
      createUintEvent<JuniorTrancheCoverageImpermanentLossReset>(
        "jtCoverageImpermanentLossErased",
        BigInt.fromI32(9_303),
        reset
      )
    );

    // A LATER tx, market long perpetual: must not touch the concluded term.
    const later = accountantCtx();
    later.blockTimestamp = BLOCK_TIMESTAMP.plus(BigInt.fromI32(99_999));
    later.txHash = TX_HASH_2;
    handleJuniorTrancheCoverageImpermanentLossReset(
      createUintEvent<JuniorTrancheCoverageImpermanentLossReset>(
        "jtCoverageImpermanentLossErased",
        BigInt.fromI32(7_777),
        later
      )
    );

    assert.fieldEquals(
      "DayFixedTermHistory",
      generateMarketRecordId(ADDR_KERNEL.toHexString(), BigInt.zero()),
      "juniorTrancheCoverageImpermanentLossNAV",
      "9303"
    );
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
    handleJuniorTrancheCoverageImpermanentLossReset(
      createUintEvent<JuniorTrancheCoverageImpermanentLossReset>(
        "jtCoverageImpermanentLossErased",
        BigInt.fromI32(9_304),
        real
      )
    );

    // The body's second Reset, same tx, now zero. Must not clobber.
    const zeroReset = accountantCtx();
    zeroReset.blockTimestamp = ended.blockTimestamp;
    handleJuniorTrancheCoverageImpermanentLossReset(
      createUintEvent<JuniorTrancheCoverageImpermanentLossReset>(
        "jtCoverageImpermanentLossErased",
        BigInt.zero(),
        zeroReset
      )
    );

    assert.fieldEquals(
      "DayFixedTermHistory",
      generateMarketRecordId(ADDR_KERNEL.toHexString(), BigInt.zero()),
      "juniorTrancheCoverageImpermanentLossNAV",
      "9304"
    );
  });

  test("juniorTrancheCoverageLossNAV accumulates and never decreases", () => {
    // A LIFETIME TOTAL, and the only place this number exists — no contract tracks
    // it. It must add, not overwrite: a handler that assigned instead of summing
    // would look right on the first erase and be wrong forever after.
    deployMarket();
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheCoverageLossNAV",
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
    handleJuniorTrancheCoverageImpermanentLossReset(
      createUintEvent<JuniorTrancheCoverageImpermanentLossReset>(
        "jtCoverageImpermanentLossErased",
        BigInt.fromI32(100),
        accountantCtx()
      )
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheCoverageLossNAV",
      "100"
    );

    // A SECOND, smaller erase in a later tx. The total must climb to 130 — an
    // overwrite would drop it to 30, which is the whole bug this pins.
    const later = accountantCtx();
    later.txHash = TX_HASH_2;
    later.blockTimestamp = BLOCK_TIMESTAMP.plus(BigInt.fromI32(50_000));
    handleJuniorTrancheCoverageImpermanentLossReset(
      createUintEvent<JuniorTrancheCoverageImpermanentLossReset>(
        "jtCoverageImpermanentLossErased",
        BigInt.fromI32(30),
        later
      )
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheCoverageLossNAV",
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
    handleJuniorTrancheCoverageImpermanentLossReset(
      createUintEvent<JuniorTrancheCoverageImpermanentLossReset>(
        "jtCoverageImpermanentLossErased",
        BigInt.fromI32(100),
        atEnd
      )
    );

    // An incidental erase later, market perpetual: total ONLY.
    const incidental = accountantCtx();
    incidental.txHash = TX_HASH_2;
    incidental.blockTimestamp = BLOCK_TIMESTAMP.plus(BigInt.fromI32(70_000));
    handleJuniorTrancheCoverageImpermanentLossReset(
      createUintEvent<JuniorTrancheCoverageImpermanentLossReset>(
        "jtCoverageImpermanentLossErased",
        BigInt.fromI32(7),
        incidental
      )
    );

    // 107 in the total...
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheCoverageLossNAV",
      "107"
    );
    // ...but the concluded term still reports only its own 100. The 7 belongs to
    // no term and must not have leaked into the row.
    assert.fieldEquals(
      "DayFixedTermHistory",
      generateMarketRecordId(ADDR_KERNEL.toHexString(), BigInt.zero()),
      "juniorTrancheCoverageImpermanentLossNAV",
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
    handleJuniorTrancheCoverageImpermanentLossReset(
      createUintEvent<JuniorTrancheCoverageImpermanentLossReset>(
        "jtCoverageImpermanentLossErased",
        BigInt.zero(),
        zero
      )
    );

    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheCoverageLossNAV",
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
    // juniorTrancheCoverageImpermanentLoss is the live, point-in-time value from
    // the preview block; juniorTrancheCoverageLossNAV is the lifetime total erased.
    deployMarket();
    handleJuniorTrancheCoverageImpermanentLossReset(
      createUintEvent<JuniorTrancheCoverageImpermanentLossReset>(
        "jtCoverageImpermanentLossErased",
        BigInt.fromI32(100),
        accountantCtx()
      )
    );

    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheCoverageLossNAV",
      "100"
    );
    // Still the factory's seeded live value — this handler must not touch it.
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheCoverageImpermanentLoss",
      "7201"
    );
  });

  test("a Reset before any term ever started still counts toward the total", () => {
    // The two writes part ways here. A market can erase coverage loss having never
    // run a fixed term at all (duration permanently 0, or JT wiped out), so there
    // is no row to patch — but the loss was still real and belongs in the lifetime
    // total. Writing only the row would silently lose it.
    deployMarket();

    handleJuniorTrancheCoverageImpermanentLossReset(
      createUintEvent<JuniorTrancheCoverageImpermanentLossReset>(
        "jtCoverageImpermanentLossErased",
        BigInt.fromI32(9_305),
        accountantCtx()
      )
    );

    assert.entityCount("DayFixedTermHistory", 0);
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheCoverageLossNAV",
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
