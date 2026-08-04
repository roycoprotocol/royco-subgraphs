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
import {
  DayMarketFixture,
  mockDayMarket,
  withoutQuoteAsset,
} from "../mocks";
import { ctx } from "../helpers/event";
import {
  ADDR_ACCOUNTANT,
  ADDR_ASSET,
  ADDR_BLACKLIST,
  ADDR_BPT_ORACLE,
  ADDR_LPT_ASSET,
  ADDR_QUOTE_ASSET,
  ADDR_ZERO,
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
  MARKET_TOKEN_ROLE_COLLATERAL_ASSET,
  MARKET_TOKEN_ROLE_LPT_ASSET,
  MARKET_TOKEN_ROLE_QUOTE_ASSET,
} from "../../src/constants";
import {
  generateAccountantMarketMapId,
  generateMarketId,
  generateMarketNavId,
  generateMarketTokenId,
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
//
// !! THAT REGISTRY IS NOT CLEARED BY clearStore(), which only clears entities. It
//    accumulates across the whole file, deduplicated by address — so the counts below
//    read 1 only because that test runs FIRST and every deploy here reuses the same
//    tranche addresses. A count assertion anywhere later in this suite is measuring
//    every preceding test, not the one it sits in. Assert dataSourceExists on the
//    specific address instead.
// =============================================================================

const MARKET_ID = generateMarketId(ADDR_KERNEL.toHexString());
const ADDR_ZERO_STR = ADDR_ZERO.toHexString();
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
    assert.dataSourceCount("RoycoLiquidityProviderTranche", 1);
    assert.dataSourceCount("RoycoDayAccountant", 1);
    assert.dataSourceCount("RoycoDayKernel", 1);

    // The counts alone survive a transposition — the addresses are the real check.
    assert.dataSourceExists("RoycoSeniorTranche", ADDR_SENIOR.toHexString());
    assert.dataSourceExists("RoycoJuniorTranche", ADDR_JUNIOR.toHexString());
    assert.dataSourceExists("RoycoLiquidityProviderTranche", ADDR_LIQUIDITY.toHexString());
    assert.dataSourceExists("RoycoDayAccountant", ADDR_ACCOUNTANT.toHexString());
    assert.dataSourceExists("RoycoDayKernel", ADDR_KERNEL.toHexString());
  });

  test("writes the accountant -> market map row", () => {
    deployStandard();

    assert.entityCount("DayAccountantMarketMap", 1);

    const mapId = generateAccountantMarketMapId(ADDR_ACCOUNTANT.toHexString());
    assert.fieldEquals("DayAccountantMarketMap", mapId, "marketRefId", MARKET_ID);
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

  test("`ydm` is the JUNIOR ydm and `lptYdm` is the liquidity one", () => {
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
    // Seeded from getState() because the initialization event precedes this handler.
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "fixedTermCommenceableAtTimestamp",
      "1700100777"
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
    assert.fieldEquals("DayMarketState", MARKET_ID, "dustTolerance", "6101");
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
      "totalCollateralAssets",
      "5101"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "totalLiquidityTrancheAssets",
      "5103"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "liquidityTrancheOwnedSeniorTrancheShares",
      "5104"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "roycoBlacklistAddress",
      ADDR_BLACKLIST.toHexString()
    );
    assert.fieldEquals("DayMarketState", MARKET_ID, "kernelPaused", "false");
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "bptOracleAddress",
      ADDR_BPT_ORACLE.toHexString()
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "maxReinvestmentSlippageWAD",
      "8201"
    );
  });

  test("previewSyncTrancheAccounting's tranche-independent state lands", () => {
    const market = DayMarketFixture.standard();
    deploy(market);

    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "collateralNAV",
      // 150 = the v1 senior 100 + junior 50, now one merged collateral pool.
      WAD.times(BigInt.fromI32(150)).toString()
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "liquidityTrancheRawNAV",
      WAD.times(BigInt.fromI32(25)).toString()
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
      "juniorTrancheImpermanentLoss",
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

  test("the fixed-term record cursor starts at zero", () => {
    // A COUNT, not a last-index: the stream is born empty. It is the ONLY cursor left
    // — every other stream is keyed and ordered by block number. A non-null field left
    // unset is fatal at index time, not build time (§8).
    deployStandard();

    assert.fieldEquals("DayMarketState", MARKET_ID, "countFixedTermEntries", "0");
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
    // THE TWO ID SHAPES SIDE BY SIDE, which is the whole point of this test now:
    // shareTokenId above is chain-global; assetTokenId is market-scoped and role-tagged.
    assert.fieldEquals(
      "DayVaultState",
      SENIOR_ID,
      "assetTokenId",
      generateMarketTokenId(
        ADDR_ASSET.toHexString(),
        ADDR_KERNEL.toHexString(),
        MARKET_TOKEN_ROLE_COLLATERAL_ASSET
      )
    );
    // ...and it equals the market's column for the same token in the same role. These
    // travel completely different paths — tranche.asset() vs Kernel.COLLATERAL_ASSET() —
    // so asserting they agree is a real check, not a tautology.
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "collateralTokenId",
      generateMarketTokenId(
        ADDR_ASSET.toHexString(),
        ADDR_KERNEL.toHexString(),
        MARKET_TOKEN_ROLE_COLLATERAL_ASSET
      )
    );
    // The JUNIOR vault SHARES the collateral role with senior — they are coinvested in
    // one token, so both must produce the IDENTICAL id. A dispatch that gave junior its
    // own role, or routed it to the LPT branch, would break the join to
    // DayMarketState.collateralTokenId for half the market's asset rows.
    assert.fieldEquals(
      "DayVaultState",
      JUNIOR_ID,
      "assetTokenId",
      generateMarketTokenId(
        ADDR_ASSET.toHexString(),
        ADDR_KERNEL.toHexString(),
        MARKET_TOKEN_ROLE_COLLATERAL_ASSET
      )
    );
    // The LIQUIDITY vault takes the OTHER role off the same helper — a single shared
    // dispatch, so a wrong branch shows up here rather than only in a transfer row.
    assert.fieldEquals(
      "DayVaultState",
      LIQUIDITY_ID,
      "assetTokenId",
      generateMarketTokenId(
        ADDR_LPT_ASSET.toHexString(),
        ADDR_KERNEL.toHexString(),
        MARKET_TOKEN_ROLE_LPT_ASSET
      )
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

  test("the factory pass initializes the transfer accumulator at zero", () => {
    // Graph Node replays this creation block for the newly spawned tranche templates,
    // so deployment-time seed mints are applied by their Transfer handlers afterward.
    // Starting from an end-of-block totalSupply() here would double-count those mints.
    deployStandard();

    assert.fieldEquals("DayVaultState", SENIOR_ID, "sharesTotalSupply", "0");
    assert.fieldEquals("DayVaultState", JUNIOR_ID, "sharesTotalSupply", "0");
    assert.fieldEquals("DayVaultState", LIQUIDITY_ID, "sharesTotalSupply", "0");

    // The vault carries NO price at all now — not claims*, not sharePrice*, not
    // assetPriceNAV. Prices live only on DayMarketNav, which is asserted below and in
    // tests/handlers/royco-market-nav.test.ts.
  });

  test("the three Kernel asset tokens land, each on its own trio of columns", () => {
    // Address, id and decimals per token. Addresses come from Kernel.getState(); ids
    // remain market-scoped rather than bare addresses.
    deployStandard();

    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "collateralTokenAddress",
      ADDR_ASSET.toHexString()
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "collateralTokenId",
      generateMarketTokenId(
        ADDR_ASSET.toHexString(),
        ADDR_KERNEL.toHexString(),
        MARKET_TOKEN_ROLE_COLLATERAL_ASSET
      )
    );
    // A DIFFERENT ERC20 from the collateral — the liquidity tranche has its own asset.
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "liquidityTrancheAssetTokenAddress",
      ADDR_LPT_ASSET.toHexString()
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "liquidityTrancheAssetTokenId",
      generateMarketTokenId(
        ADDR_LPT_ASSET.toHexString(),
        ADDR_KERNEL.toHexString(),
        MARKET_TOKEN_ROLE_LPT_ASSET
      )
    );
    // And a third that belongs to NO tranche — this row is its only home.
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "quoteAssetTokenAddress",
      ADDR_QUOTE_ASSET.toHexString()
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "quoteAssetTokenId",
      generateMarketTokenId(
        ADDR_QUOTE_ASSET.toHexString(),
        ADDR_KERNEL.toHexString(),
        MARKET_TOKEN_ROLE_QUOTE_ASSET
      )
    );
    // 6, from the QUOTE token itself — not 18, which is what every other token in the
    // fixture reports. This is the only record of the quote asset's scale in the whole
    // schema (it has no tranche and no DayVaultState), and it is what makes the
    // `quoteAssets` amounts on the two multi-asset activity tables interpretable.
    assert.fieldEquals("DayMarketState", MARKET_ID, "quoteAssetTokenDecimals", "6");
    // The other two scales. Both are 18 in the standard fixture, so this pair only
    // proves the columns are POPULATED — the test below separates them.
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "collateralAssetTokenDecimals",
      "18"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "liquidityTrancheAssetTokenDecimals",
      "18"
    );
    // The three SYMBOLS, which are distinct in the fixture and so pin each column to its
    // own token on their own. Nothing else in the schema carries these — DayVaultState
    // has no symbol column — so a wrong one here is unrecoverable downstream.
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "collateralAssetTokenSymbol",
      "WETH"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "liquidityTrancheAssetTokenSymbol",
      "BPT-DAY"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "quoteAssetTokenSymbol",
      "USDC"
    );
  });

  test("collateral and LPT decimals come from their OWN tokens, not each other's", () => {
    // The standard fixture gives the collateral and the BPT the same 18 decimals, so a
    // swap between these two DECIMALS columns survives every assertion that reads them.
    // (The symbol columns beside them are distinct and would catch an address-level swap;
    // this catches the narrower case of the two decimals reads alone being crossed.)
    // Giving the BPT a scale of its own is what separates them.
    //
    // It also separates them from the per-vault columns they duplicate: senior and junior
    // must report the COLLATERAL scale and liquidity the LPT one, which is the kernel's
    // own constructor invariant (senior.asset() == junior.asset() == COLLATERAL_ASSET,
    // liquidity.asset() == LPT_ASSET) seen from the subgraph side.
    const market = DayMarketFixture.standard();
    market.lptAssetDecimals = DECIMALS_6;
    deploy(market);

    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "collateralAssetTokenDecimals",
      "18"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "liquidityTrancheAssetTokenDecimals",
      "6"
    );
    assert.fieldEquals("DayVaultState", SENIOR_ID, "assetTokenDecimals", "18");
    assert.fieldEquals("DayVaultState", JUNIOR_ID, "assetTokenDecimals", "18");
    assert.fieldEquals("DayVaultState", LIQUIDITY_ID, "assetTokenDecimals", "6");
  });

  test("each tranche's share-token symbol and decimals come from that tranche", () => {
    // A TRANCHE IS ITS OWN SHARE TOKEN, so these six columns are symbol()/decimals()
    // called on the three addresses the DeploymentResult carried — no vault, no kernel
    // hop. The SYMBOLS are distinct per tranche and pin their own columns.
    //
    // THE DECIMALS NEED A SCALE SPLIT to assert anything at all. Under the fixture's
    // default 18s every asset token reports exactly what the tranches do, so sourcing one
    // of these columns from the collateral asset or the BPT still reads 18 and passes —
    // and a right symbol does NOT imply a right decimals, they are two independent reads.
    // Dropping both ASSET scales to 6 while the tranches stay at WAD makes any
    // asset/share crossing fail. This mirrors the real hazard: RoycoVaultTranche hardcodes
    // decimals() = 18 for every tranche, so on a USDC-collateral market the two genuinely
    // differ and a crossing writes 6 where 18 belongs, once, with no refresh path.
    const market = DayMarketFixture.standard();
    market.assetDecimals = DECIMALS_6;
    market.lptAssetDecimals = DECIMALS_6;
    market.trancheDecimals = DECIMALS_18;
    deploy(market);

    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "seniorTrancheTokenSymbol",
      "DAY-SNR"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheTokenSymbol",
      "DAY-JNR"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "liquidityTrancheTokenSymbol",
      "DAY-LPT"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "seniorTrancheTokenDecimals",
      "18"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheTokenDecimals",
      "18"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "liquidityTrancheTokenDecimals",
      "18"
    );

    // The decimals half duplicates DayVaultState.shareTokenDecimals, which travels a
    // different path — createVault reads it off its own tranche binding. Asserting they
    // agree is the same cross-check the asset columns get above, not a tautology.
    assert.fieldEquals("DayVaultState", SENIOR_ID, "shareTokenDecimals", "18");
    assert.fieldEquals("DayVaultState", JUNIOR_ID, "shareTokenDecimals", "18");
    assert.fieldEquals("DayVaultState", LIQUIDITY_ID, "shareTokenDecimals", "18");
  });

  test("an omitted counterparty tranche reads as '' / 0, not a dead handler", () => {
    // A market needs a senior plus at least ONE counterparty, so the junior OR the
    // liquidity slot may legitimately be the zero address (RoycoFactory.sol:132-137).
    // That slot gets no DayVaultState, so these two market columns are the only place
    // its absence is recorded — and reaching symbol()/decimals() on 0x0 would revert and
    // take the whole market down with it, which is what the guard is for.
    const market = DayMarketFixture.standard();
    mockDayMarket(market);

    const result = new DeploymentResult();
    result.juniorTranche = ADDR_ZERO;

    handleMarketDeploymentCompleted(
      createMarketDeploymentCompletedEvent(
        ADDR_TEMPLATE,
        ADDR_DEPLOYER,
        result,
        ctx()
      )
    );

    assert.entityCount("DayMarketState", 1);
    // Two vaults, not three: the absent slot gets no DayVaultState.
    //
    // The MISSING template is deliberately NOT asserted here. matchstick's data-source
    // registry is not cleared by clearStore() (see the file header), so by this point in
    // the suite RoycoJuniorTranche already carries a leaked entry at ADDR_JUNIOR from
    // every earlier deploy — dataSourceCount would read 1 no matter what this handler
    // did. It IS checkable in the negative: assert.dataSourceExists(..., ADDR_ZERO_STR)
    // fails, which is how the skip was confirmed, but matchstick has no "does not exist"
    // assertion to encode that.
    assert.entityCount("DayVaultState", 2);

    assert.fieldEquals("DayMarketState", MARKET_ID, "juniorTrancheTokenSymbol", "");
    assert.fieldEquals("DayMarketState", MARKET_ID, "juniorTrancheTokenDecimals", "0");
    // The address column is what disambiguates "" / 0 from a real symbol-less token.
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "juniorTrancheAddress",
      ADDR_ZERO_STR
    );
    // The guard is PER TOKEN: an absent junior must not blank its neighbours.
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "seniorTrancheTokenSymbol",
      "DAY-SNR"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "liquidityTrancheTokenSymbol",
      "DAY-LPT"
    );
  });

  test("collateral matches what the tranches report — the kernel's own invariant", () => {
    // The kernel constructor REQUIRES senior.asset() == junior.asset() ==
    // COLLATERAL_ASSET and liquidity.asset() == LPT_ASSET
    // (TRANCHE_AND_KERNEL_ASSETS_MISMATCH). So these market-level columns are not
    // independent of the per-vault ones, and asserting they agree is a real check on
    // the handler having read the right getter for each — not a tautology, because the
    // two values travel completely different paths: one via tranche.asset(), the other
    // via Kernel.COLLATERAL_ASSET().
    deployStandard();

    assert.fieldEquals(
      "DayVaultState",
      SENIOR_ID,
      "assetTokenAddress",
      ADDR_ASSET.toHexString()
    );
    assert.fieldEquals(
      "DayVaultState",
      JUNIOR_ID,
      "assetTokenAddress",
      ADDR_ASSET.toHexString()
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "collateralTokenAddress",
      ADDR_ASSET.toHexString()
    );
    // THE THIRD ARM, which had no vault-side assertion until now. The same constructor
    // check requires liquidityProviderTranche.asset() == LPT_ASSET, and the LPT asset is
    // the BPT — a DIFFERENT token from the collateral. The market side of this was
    // already asserted above; this is the vault side, and its absence is what let the
    // fixture report the collateral here for a market the constructor would have
    // reverted. That divergence had teeth: a handler correctly treating this vault's
    // asset as the Balancer pool would call getPoolTokenRates on the collateral token
    // and abort as unmocked.
    assert.fieldEquals(
      "DayVaultState",
      LIQUIDITY_ID,
      "assetTokenAddress",
      ADDR_LPT_ASSET.toHexString()
    );
  });

  test("a venue-less kernel reports the zero-address quote asset, not a dead handler", () => {
    // A zero quote address is data, not a failed contract call.
    const market = withoutQuoteAsset(DayMarketFixture.standard());
    mockDayMarket(market);

    handleMarketDeploymentCompleted(
      createMarketDeploymentCompletedEvent(
        ADDR_TEMPLATE,
        ADDR_DEPLOYER,
        new DeploymentResult(),
        ctx()
      )
    );

    assert.entityCount("DayMarketState", 1);
    assert.entityCount("DayVaultState", 3);
    assert.fieldEquals("DayMarketState", MARKET_ID, "quoteAssetTokenAddress", ADDR_ZERO_STR);
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "quoteAssetTokenId",
      generateMarketTokenId(ADDR_ZERO_STR, ADDR_KERNEL.toHexString(), MARKET_TOKEN_ROLE_QUOTE_ASSET)
    );
    // Decimals fall back too, and CRUCIALLY without calling decimals() on the zero
    // address — an unmocked call there aborts the handler in matchstick and reverts on
    // chain, so the guard is what keeps the whole market from failing to index.
    assert.fieldEquals("DayMarketState", MARKET_ID, "quoteAssetTokenDecimals", "0");
    // The symbol falls back to "" on the same guard: symbol() on the zero address is
    // just as fatal as decimals().
    assert.fieldEquals("DayMarketState", MARKET_ID, "quoteAssetTokenSymbol", "");
    // The other two tokens still exist, so their scale and label are read normally — the
    // guard is per-token, not per-market.
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "collateralTokenAddress",
      ADDR_ASSET.toHexString()
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "collateralAssetTokenDecimals",
      "18"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "liquidityTrancheAssetTokenDecimals",
      "18"
    );
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
    market.collateralAssetPriceNAV = BigInt.fromI32(9_100);
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
    // The price itself lands on DayMarketNav — the vault stores none.
    assert.fieldEquals(
      "DayMarketNav",
      generateMarketNavId(ADDR_KERNEL.toHexString()),
      "collateralAssetPriceNAV",
      "9100"
    );
    assert.fieldEquals(
      "DayMarketNav",
      generateMarketNavId(ADDR_KERNEL.toHexString()),
      "liquidityTrancheAssetPriceNAV",
      "9300"
    );
  });

  test("the creation price vector routes collateral vs LPT to the right converter", () => {
    // TWO distinct Kernel methods in v2 and AS has no closures, so the dispatch is a
    // hand-written if/else — exactly the shape that transposes. Senior and junior SHARE
    // the collateral converter; only the liquidity tranche takes the other branch, so
    // this asserts the one boundary that can actually be crossed wrongly.
    deployStandard();

    const navId = generateMarketNavId(ADDR_KERNEL.toHexString());
    assert.fieldEquals("DayMarketNav", navId, "collateralAssetPriceNAV", "3100");
    assert.fieldEquals("DayMarketNav", navId, "liquidityTrancheAssetPriceNAV", "3300");
  });

  test("creation writes the vault's first historical row", () => {
    // Creation must open the vault's row for its own block. If it wrote none, the
    // stream would begin at the first mint instead and a market's opening state
    // would be missing from Neon entirely.
    deployStandard();

    assert.entityCount("DayVaultStateHistorical", 3);

    const snapshotId = generateVaultStateHistoricalId(ADDR_SENIOR.toHexString(), BLOCK_NUMBER);
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

    const snapshotId = generateVaultStateHistoricalId(ADDR_JUNIOR.toHexString(), BLOCK_NUMBER);
    // The factory pass runs before the newly spawned tranche template replays this block.
    assert.fieldEquals(
      "DayVaultStateHistorical",
      snapshotId,
      "sharesTotalSupply",
      "0"
    );
    // With every price gone from this entity, `minorType` is what proves the snapshot
    // copied ITS OWN parent rather than defaulting or copying a sibling: this id is the
    // JUNIOR vault's, so a snapshot built from the senior row would read "senior" here.
    assert.fieldEquals("DayVaultStateHistorical", snapshotId, "minorType", "junior");
    assert.fieldEquals(
      "DayVaultStateHistorical",
      snapshotId,
      "marketId",
      ADDR_KERNEL.toHexString()
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
    const snapshotId = generateVaultStateHistoricalId(ADDR_SENIOR.toHexString(), BLOCK_NUMBER);
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
