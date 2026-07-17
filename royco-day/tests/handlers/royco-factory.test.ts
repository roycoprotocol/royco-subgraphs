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
  DeploymentResult,
  createMarketDeploymentCompletedEvent,
} from "../builders/factory";
import { DayMarketFixture, mockDayMarket } from "../mocks";
import { ctx } from "../helpers/event";
import {
  ADDR_ACCOUNTANT,
  ADDR_ASSET,
  ADDR_DEPLOYER,
  ADDR_FEE_RECIPIENT,
  ADDR_JT_YDM,
  ADDR_JUNIOR,
  ADDR_KERNEL,
  ADDR_LIQUIDITY,
  ADDR_LT_YDM,
  ADDR_SENIOR,
  ADDR_TEMPLATE,
  BLOCK_NUMBER,
  BLOCK_TIMESTAMP,
  DECIMALS_18,
  DECIMALS_6,
  TX_HASH,
  WAD,
} from "../helpers/constants";
import {
  generateMarketId,
  generateTokenId,
  generateVaultId,
  generateVaultStateHistoricalId,
} from "../../src/utils";

// =============================================================================
// handleMarketDeploymentCompleted — the entry point for the whole subgraph.
//
// Per market it writes 1 DayMarketState + 3 DayVaultState + 3
// DayVaultStateHistorical, and spawns 5 templates.
//
// dataSource.create() has no STORE effect, so fieldEquals/entityCount cannot see
// a template — but matchstick tracks them in a separate registry, and
// assert.dataSourceCount/dataSourceExists read it. "No store effect" does not
// mean "unobservable"; missing a template is the silent failure CLAUDE.md §6
// warns about, so it is asserted directly below.
// =============================================================================

const MARKET_ID = generateMarketId(ADDR_KERNEL.toHexString());
const SENIOR_ID = generateVaultId(ADDR_SENIOR.toHexString());
const JUNIOR_ID = generateVaultId(ADDR_JUNIOR.toHexString());
const LIQUIDITY_ID = generateVaultId(ADDR_LIQUIDITY.toHexString());

/**
 * Mock a market and run the handler over it.
 *
 * NOTE the shape of every test below: the fixture is built INSIDE the test body,
 * never hoisted to a `let` in the describe scope. AssemblyScript has no closures
 * (CLAUDE.md §3) — a test callback reading an outer `market` variable fails to
 * compile with "ERROR AS100: Not implemented: Closures". Module-level constants
 * are fine; they are globals, not captures.
 */
function deploy(market: DayMarketFixture): void {
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

/** The common case: a coherent, non-degenerate market, deployed. */
function deployStandard(): void {
  deploy(DayMarketFixture.standard());
}

describe("handleMarketDeploymentCompleted", () => {
  beforeEach(() => {
    clearStore();
  });

  test("spawns all five templates, each at its own address", () => {
    // Miss a template and its contract's events are silently never indexed — no
    // error, just a table that stops updating forever (§6). Nothing else in this
    // suite would notice: dropping one passes build, codegen, and every other test.
    deployStandard();

    assert.dataSourceCount("RoycoSeniorTranche", 1);
    assert.dataSourceCount("RoycoJuniorTranche", 1);
    assert.dataSourceCount("RoycoLiquidityTranche", 1);
    assert.dataSourceCount("RoycoDayAccountant", 1);
    assert.dataSourceCount("RoycoDayKernel", 1);

    // The counts alone survive a transposition — the addresses are the real check.
    assert.dataSourceExists("RoycoSeniorTranche", ADDR_SENIOR.toHexString());
    assert.dataSourceExists("RoycoJuniorTranche", ADDR_JUNIOR.toHexString());
    assert.dataSourceExists("RoycoLiquidityTranche", ADDR_LIQUIDITY.toHexString());
    assert.dataSourceExists("RoycoDayAccountant", ADDR_ACCOUNTANT.toHexString());
    assert.dataSourceExists("RoycoDayKernel", ADDR_KERNEL.toHexString());
  });

  test("writes one DayMarketState keyed by the kernel address", () => {
    deployStandard();

    assert.entityCount("DayMarketState", 1);
    // The kernel address IS the marketId — not the accountant, not the factory.
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "marketId",
      ADDR_KERNEL.toHexString()
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "kernelAddress",
      ADDR_KERNEL.toHexString()
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "accountantAddress",
      ADDR_ACCOUNTANT.toHexString()
    );
  });

  test("every DeploymentResult component lands in its own field", () => {
    deployStandard();

    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "templateAddress",
      ADDR_TEMPLATE.toHexString()
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "deployerAddress",
      ADDR_DEPLOYER.toHexString()
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "seniorTrancheAddress",
      ADDR_SENIOR.toHexString()
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheAddress",
      ADDR_JUNIOR.toHexString()
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "liquidityTrancheAddress",
      ADDR_LIQUIDITY.toHexString()
    );
    assert.fieldEquals("DayMarketState", MARKET_ID, "seniorTrancheId", SENIOR_ID);
    assert.fieldEquals("DayMarketState", MARKET_ID, "juniorTrancheId", JUNIOR_ID);
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "liquidityTrancheId",
      LIQUIDITY_ID
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "creationEncodedData",
      "0xdeadbeef"
    );
  });

  test("`ydm` is the JUNIOR ydm and `ltYdm` is the liquidity one", () => {
    // The ABI names the junior tranche's YDM `ydm`, not `jtYdm` (CLAUDE.md §6).
    // Nothing but distinct sentinels catches this transposition — both fields are
    // plausible addresses either way round.
    deployStandard();

    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheYdmAddress",
      ADDR_JT_YDM.toHexString()
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "liquidityTrancheYdmAddress",
      ADDR_LT_YDM.toHexString()
    );
  });

  test("Accountant.getState() lands, with the uint24 lifted to BigInt", () => {
    deployStandard();

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
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "minCoverageWAD",
      WAD.div(BigInt.fromI32(2)).toString()
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "minLiquidityWAD",
      WAD.div(BigInt.fromI32(4)).toString()
    );
    // fixedTermDurationSeconds is uint24 -> i32 and needs BigInt.fromI32(); its
    // uint32 neighbours do not. Getting this wrong is a build error, but getting
    // it "right" via a truncating cast would not be (CLAUDE.md §4).
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "fixedTermDurationSeconds",
      (30 * 24 * 60 * 60).toString()
    );
  });

  test("marketState maps 0 -> perpetual (enum is PERPETUAL, FIXED_TERM)", () => {
    const market = DayMarketFixture.standard();
    market.accountantState.lastMarketState = 0;
    deploy(market);

    assert.fieldEquals("DayMarketState", MARKET_ID, "marketState", "perpetual");
  });

  test("marketState maps 1 -> fixed", () => {
    // The pair of these is the point: an inverted mapping passes either test
    // alone. Types.sol declares `enum MarketState { PERPETUAL, FIXED_TERM }`, so
    // 0 is perpetual — which reads backwards and was wrong across this repo's
    // comments until it was checked against the source.
    const market = DayMarketFixture.standard();
    market.accountantState.lastMarketState = 1;
    deploy(market);

    assert.fieldEquals("DayMarketState", MARKET_ID, "marketState", "fixed");
  });

  test("the tw*/max* quartet does not transpose", () => {
    // CLAUDE.md §7 calls this pair actively misleading: despite the "Accrued" in
    // their names, max* are CONFIGURED CAPS (setMaxYieldShares), while tw* are the
    // real accruals sitting right beside them. Swap a pair and Neon reports a cap
    // as an accrual — every yield-share utilization query inverts, and a market at
    // 2% of cap reads as saturated. Four adjacent BigInts; only distinct values
    // separate them.
    deployStandard();

    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "timeWeightedJuniorTrancheYieldShareAccruedWAD",
      "8101"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "maxJuniorTrancheYieldShareAccruedWAD",
      "8102"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "timeWeightedLiquidityTrancheYieldShareAccruedWAD",
      "8103"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "maxLiquidityTrancheYieldShareAccruedWAD",
      "8104"
    );
  });

  test("the remaining Accountant fields land, each from its own member", () => {
    deployStandard();

    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheYieldShareProtocolFeeWAD",
      "4101"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "liquidityTrancheYieldShareProtocolFeeWAD",
      "4102"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "coverageLiquidationUtilizationWAD",
      "7101"
    );
    assert.fieldEquals("DayMarketState", MARKET_ID, "seniorTrancheDustTolerance", "6101");
    assert.fieldEquals("DayMarketState", MARKET_ID, "juniorTrancheDustTolerance", "6102");
    assert.fieldEquals("DayMarketState", MARKET_ID, "effectiveNAVDustTolerance", "6103");
    // uint32 -> BigInt, assigned direct. Note lastYieldShareAccruedTimestamp reads
    // from the ABI's lastYieldShareAccrualTimestamp — the names differ by design.
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "fixedTermEndTimestamp",
      "1700100001"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "lastYieldShareAccruedTimestamp",
      "1700100002"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "lastPremiumPaymentTimestamp",
      "1700100003"
    );
  });

  test("Kernel.getState() lands, including the owned-assets quartet", () => {
    deployStandard();

    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "protocolFeeRecipientAddress",
      ADDR_FEE_RECIPIENT.toHexString()
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "seniorTrancheSelfLiquidationBonusWAD",
      WAD.div(BigInt.fromI32(100)).toString()
    );
    // Four adjacent st/jt/lt BigInts. A rotation among them is invisible in Neon —
    // every value stays plausible — so it has to be pinned here.
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "seniorTrancheOwnedYieldBearingAssets",
      "5101"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheOwnedYieldBearingAssets",
      "5102"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "liquidityTrancheOwnedYieldBearingAssets",
      "5103"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "liquidityTrancheOwnedSeniorTrancheShares",
      "5104"
    );
  });

  test("previewSyncTrancheAccounting's tranche-independent state lands", () => {
    const market = DayMarketFixture.standard();
    market.trancheState.jtCoinvested = true;
    deploy(market);

    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "seniorTrancheRawNAV",
      WAD.times(BigInt.fromI32(100)).toString()
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheRawNAV",
      WAD.times(BigInt.fromI32(50)).toString()
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "liquidityTrancheRawNAV",
      WAD.times(BigInt.fromI32(25)).toString()
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "isJuniorTrancheCoinvested",
      "true"
    );
    // Effective NAV is a distinct member from raw NAV — the coverage model turns on
    // the difference, so equal fixture values would hide a mix-up.
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "seniorTrancheEffectiveNAV",
      WAD.times(BigInt.fromI32(99)).toString()
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheEffectiveNAV",
      WAD.times(BigInt.fromI32(49)).toString()
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheCoverageImpermanentLoss",
      "7201"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "liquidityTrancheLiquidityPremium",
      "7202"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "coverageUtilizationWAD",
      WAD.div(BigInt.fromI32(2)).toString()
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "liquidityUtilizationWAD",
      WAD.div(BigInt.fromI32(4)).toString()
    );
  });

  test("all six record cursors start at zero", () => {
    // These are COUNTS, not last-indices: every record stream is born empty.
    // A non-null field left unset is fatal at index time, not build time (§8).
    deployStandard();

    assert.fieldEquals("DayMarketState", MARKET_ID, "countFixedTermEntries", "0");
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "countJuniorTrancheYieldSharesAccruedEntries",
      "0"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "countLiquidityTrancheYieldSharesAccruedEntries",
      "0"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "countLiquidityPremiumSharesMintedEntries",
      "0"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "countLiquidityPremiumReinvestedEntries",
      "0"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "countLiquidityPremiumReinvestmentFailedEntries",
      "0"
    );
  });

  test("writes exactly three DayVaultState, one per tranche", () => {
    deployStandard();

    assert.entityCount("DayVaultState", 3);
    assert.fieldEquals("DayVaultState", SENIOR_ID, "minorType", "senior");
    assert.fieldEquals("DayVaultState", JUNIOR_ID, "minorType", "junior");
    assert.fieldEquals("DayVaultState", LIQUIDITY_ID, "minorType", "liquidity");

    assert.fieldEquals("DayVaultState", SENIOR_ID, "majorType", "day");
    assert.fieldEquals("DayVaultState", SENIOR_ID, "marketRefId", MARKET_ID);
    assert.fieldEquals(
      "DayVaultState",
      SENIOR_ID,
      "marketId",
      ADDR_KERNEL.toHexString()
    );
  });

  test("a tranche is its own share token; the asset token is separate", () => {
    deployStandard();

    assert.fieldEquals(
      "DayVaultState",
      SENIOR_ID,
      "shareTokenAddress",
      ADDR_SENIOR.toHexString()
    );
    assert.fieldEquals(
      "DayVaultState",
      SENIOR_ID,
      "shareTokenId",
      generateTokenId(ADDR_SENIOR.toHexString())
    );
    assert.fieldEquals(
      "DayVaultState",
      SENIOR_ID,
      "assetTokenAddress",
      ADDR_ASSET.toHexString()
    );
    assert.fieldEquals(
      "DayVaultState",
      SENIOR_ID,
      "assetTokenId",
      generateTokenId(ADDR_ASSET.toHexString())
    );
    // decimals() is uint8 -> i32, and Int! IS i32 — assigned direct, never
    // lifted through BigInt.fromI32() (§4).
    assert.fieldEquals(
      "DayVaultState",
      SENIOR_ID,
      "assetTokenDecimals",
      DECIMALS_18.toString()
    );
    assert.fieldEquals(
      "DayVaultState",
      SENIOR_ID,
      "shareTokenDecimals",
      DECIMALS_18.toString()
    );
  });

  test("a market is born with zero supply and zero claims, calling nothing", () => {
    // Both quintuples are provably zero at deployment: _scaleAssetClaims returns
    // the zero struct whenever the tranche's total shares is zero, for ANY input.
    // And supply IS zero — no _mint is reachable from deployMarket/initialize.
    // So the factory does not call convertToAssets at all, and mockDayMarket
    // deliberately does NOT mock it at 0: if this handler ever starts calling it
    // again, these tests abort as unmocked rather than passing quietly.
    deployStandard();

    assert.fieldEquals("DayVaultState", SENIOR_ID, "sharesTotalSupply", "0");
    assert.fieldEquals("DayVaultState", JUNIOR_ID, "sharesTotalSupply", "0");
    assert.fieldEquals("DayVaultState", LIQUIDITY_ID, "sharesTotalSupply", "0");

    for (let i = 0; i < 3; i++) {
      const id = i == 0 ? SENIOR_ID : i == 1 ? JUNIOR_ID : LIQUIDITY_ID;
      assert.fieldEquals("DayVaultState", id, "claimsSeniorTrancheAssets", "0");
      assert.fieldEquals("DayVaultState", id, "claimsJuniorTrancheAssets", "0");
      assert.fieldEquals("DayVaultState", id, "claimsLiquidityTrancheAssets", "0");
      assert.fieldEquals("DayVaultState", id, "claimsSeniorTrancheShares", "0");
      assert.fieldEquals("DayVaultState", id, "claimsNAV", "0");
      assert.fieldEquals("DayVaultState", id, "sharePriceNAV", "0");
    }
  });

  test("assetPriceNAV is priced in ASSET decimals, not share decimals", () => {
    // The fixture's default 18/18 makes oneShare == oneAssetToken == 1e18, so a
    // handler reading the wrong decimals would pass every other test here. A
    // 6-decimal asset (USDC) under an 18-decimal share token separates them: the
    // Kernel's NAV converters get mocked at 10**6.
    //
    // !! The NAV values are overridden to sentinels unique to this test, and that
    //    is load-bearing. matchstick-as 0.6.0 has clearStore() but NO
    //    clearMockedFunctions — mocks REGISTERED BY OTHER TESTS SURVIVE
    //    beforeEach. Every other test here registers the NAV converters at 10**18
    //    (the default assetDecimals), so if the handler wrongly called at 10**18
    //    it would hit that leaked mock and quietly get 3100 instead of aborting.
    //    Asserting a value only this test registers is what makes the check real.
    //
    // The oneShare half of this pair now lives in royco-tranche.test.ts: the
    // factory no longer calls convertToAssets (a fresh market's claims are
    // provably zero), so sharePrice* is only reachable via a mint.
    const market = DayMarketFixture.standard();
    market.assetDecimals = DECIMALS_6;
    market.trancheDecimals = DECIMALS_18;
    market.seniorAssetPriceNAV = BigInt.fromI32(9_100);
    market.juniorAssetPriceNAV = BigInt.fromI32(9_200);
    market.liquidityAssetPriceNAV = BigInt.fromI32(9_300);
    deploy(market);

    assert.fieldEquals(
      "DayVaultState",
      SENIOR_ID,
      "assetTokenDecimals",
      DECIMALS_6.toString()
    );
    assert.fieldEquals(
      "DayVaultState",
      SENIOR_ID,
      "shareTokenDecimals",
      DECIMALS_18.toString()
    );
    assert.fieldEquals("DayVaultState", SENIOR_ID, "assetPriceNAV", "9100");
    assert.fieldEquals("DayVaultState", JUNIOR_ID, "assetPriceNAV", "9200");
    assert.fieldEquals("DayVaultState", LIQUIDITY_ID, "assetPriceNAV", "9300");
  });

  test("assetPriceNAV routes each tranche to its own Kernel converter", () => {
    // st/jt/lt are three distinct Kernel methods and AS has no closures, so the
    // dispatch is a hand-written if/else — exactly the shape that transposes.
    deployStandard();

    assert.fieldEquals("DayVaultState", SENIOR_ID, "assetPriceNAV", "3100");
    assert.fieldEquals("DayVaultState", JUNIOR_ID, "assetPriceNAV", "3200");
    assert.fieldEquals("DayVaultState", LIQUIDITY_ID, "assetPriceNAV", "3300");
  });

  test("creation writes historical entry 0 and seeds the cursor to match", () => {
    // The cursor contract: the creation snapshot IS entry 0, so
    // lastHistoricalEntryIndex == 0 and total snapshots == cursor + 1. If
    // creation wrote no snapshot, the first later one would write entry 1 and
    // leave a hole at 0.
    deployStandard();

    assert.entityCount("DayVaultStateHistorical", 3);
    assert.fieldEquals("DayVaultState", SENIOR_ID, "lastHistoricalEntryIndex", "0");

    const snapshotId = generateVaultStateHistoricalId(
      ADDR_SENIOR.toHexString(),
      BigInt.zero()
    );
    assert.fieldEquals("DayVaultStateHistorical", snapshotId, "entryIndex", "0");
    assert.fieldEquals("DayVaultStateHistorical", snapshotId, "vaultId", SENIOR_ID);
    assert.fieldEquals(
      "DayVaultStateHistorical",
      snapshotId,
      "vaultAddress",
      ADDR_SENIOR.toHexString()
    );
    assert.fieldEquals("DayVaultStateHistorical", snapshotId, "minorType", "senior");
  });

  test("the creation snapshot mirrors its parent's values", () => {
    deployStandard();

    const snapshotId = generateVaultStateHistoricalId(
      ADDR_JUNIOR.toHexString(),
      BigInt.zero()
    );
    // Zero, and that is the point: entry 0 records a market with no shares yet.
    // assetPriceNAV below is the one contract-sourced value that is NOT
    // supply-scaled, so it is the field that proves the snapshot really copied
    // the parent rather than defaulting everything.
    assert.fieldEquals(
      "DayVaultStateHistorical",
      snapshotId,
      "claimsSeniorTrancheAssets",
      "0"
    );
    assert.fieldEquals("DayVaultStateHistorical", snapshotId, "claimsNAV", "0");
    assert.fieldEquals("DayVaultStateHistorical", snapshotId, "sharePriceNAV", "0");
    // Junior's converter, not senior's or liquidity's — the snapshot copied the
    // parent, and the parent routed to the right one of the three.
    assert.fieldEquals(
      "DayVaultStateHistorical",
      snapshotId,
      "assetPriceNAV",
      "3200"
    );
  });

  test("createdAt and updatedAt are both stamped, and equal, at creation", () => {
    deployStandard();

    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "createdAtTransactionHash",
      TX_HASH.toHexString()
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "createdAtBlockNumber",
      BLOCK_NUMBER.toString()
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
      BLOCK_TIMESTAMP.toString()
    );

    assert.fieldEquals(
      "DayVaultState",
      SENIOR_ID,
      "createdAtBlockTimestamp",
      BLOCK_TIMESTAMP.toString()
    );
    assert.fieldEquals(
      "DayVaultState",
      SENIOR_ID,
      "updatedAtBlockTimestamp",
      BLOCK_TIMESTAMP.toString()
    );

    // Immutable entities carry createdAt* only — no updatedAt* to re-stamp.
    const snapshotId = generateVaultStateHistoricalId(
      ADDR_SENIOR.toHexString(),
      BigInt.zero()
    );
    assert.fieldEquals(
      "DayVaultStateHistorical",
      snapshotId,
      "createdAtBlockTimestamp",
      BLOCK_TIMESTAMP.toString()
    );
  });

  test("ids are chain-scoped and built from lowercase hex", () => {
    deployStandard();

    // A checksummed address would not match on load() and would silently fork
    // the entity into a duplicate row (§8).
    assert.fieldEquals("DayVaultState", SENIOR_ID, "vaultAddress", ADDR_SENIOR.toHexString());
    assert.assertTrue(MARKET_ID.startsWith("1_"));
    assert.assertTrue(SENIOR_ID.startsWith("1_"));
  });
});
