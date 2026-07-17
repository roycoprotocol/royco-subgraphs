import {
  assert,
  describe,
  test,
  clearStore,
  beforeEach,
} from "matchstick-as/assembly/index";
import { BigInt } from "@graphprotocol/graph-ts";
import {
  DayMarketFixture,
  mockDayMarket,
  TRANCHE_JUNIOR,
  TRANCHE_LIQUIDITY,
  TRANCHE_SENIOR,
} from "../mocks";
import { RoycoDayAccountant } from "../../generated/templates/RoycoDayAccountant/RoycoDayAccountant";
import { RoycoDayKernel } from "../../generated/templates/RoycoDayKernel/RoycoDayKernel";
import { RoycoSeniorTranche } from "../../generated/templates/RoycoSeniorTranche/RoycoSeniorTranche";
import { ADDR_ASSET, ADDR_KERNEL, DECIMALS_18, WAD } from "../helpers/constants";

// =============================================================================
// Exercises DayMarketFixture + mockDayMarket end to end.
//
// This test is load-bearing beyond its assertions: matchstick only COMPILES a
// helper file if a test imports it. Without this, tests/mocks/index.ts would
// ship having never been typechecked — the classic "helper rots silently"
// failure. Keep it, even though handler tests will cover the same ground later.
// =============================================================================

describe("DayMarketFixture.standard()", () => {
  beforeEach(() => {
    clearStore();
  });

  test("is coherent and non-degenerate", () => {
    // An all-zeros market hides div-by-zero and "is it just defaulting?" bugs,
    // so the shared fixture must not be all zeros.
    const m = DayMarketFixture.standard();

    assert.assertTrue(m.accountantState.stProtocolFeeWAD.gt(BigInt.zero()));
    assert.assertTrue(m.accountantState.minCoverageWAD.gt(BigInt.zero()));
    assert.assertTrue(m.trancheState.stRawNAV.gt(BigInt.zero()));
    assert.assertTrue(m.claims.nav.gt(BigInt.zero()));
    assert.assertTrue(m.totalTrancheShares.gt(BigInt.zero()));

    // NAV should be the sum of the three tranche claims — if this drifts, every
    // handler test built on the fixture is reasoning about an impossible market.
    assert.bigIntEquals(
      m.claims.nav,
      m.claims.stAssets.plus(m.claims.jtAssets).plus(m.claims.ltAssets)
    );
  });

  test("mockDayMarket registers every view a handler can reach", () => {
    const m = DayMarketFixture.standard();
    mockDayMarket(m);

    // Each of these would abort the handler if unmocked.
    const accountant = RoycoDayAccountant.bind(m.accountant);
    assert.bigIntEquals(
      accountant.getState().stProtocolFeeWAD,
      WAD.div(BigInt.fromI32(10))
    );

    const kernel = RoycoDayKernel.bind(m.kernel);
    assert.bigIntEquals(
      kernel.getState().stSelfLiquidationBonusWAD,
      WAD.div(BigInt.fromI32(100))
    );

    // All three tranche types are mocked — a handler reading TRANCHE_TYPE() and
    // passing it through will hit one of these whichever tranche it is.
    assert.bigIntEquals(
      kernel.previewSyncTrancheAccounting(TRANCHE_SENIOR).value1.nav,
      m.claims.nav
    );
    assert.bigIntEquals(
      kernel.previewSyncTrancheAccounting(TRANCHE_JUNIOR).value1.nav,
      m.claims.nav
    );
    assert.bigIntEquals(
      kernel.previewSyncTrancheAccounting(TRANCHE_LIQUIDITY).value1.nav,
      m.claims.nav
    );

    const senior = RoycoSeniorTranche.bind(m.seniorTranche);
    assert.addressEquals(senior.asset(), ADDR_ASSET);
    assert.i32Equals(senior.decimals(), DECIMALS_18);
    assert.addressEquals(senior.KERNEL(), ADDR_KERNEL);
    assert.bigIntEquals(senior.totalSupply(), m.sharesTotalSupply);
  });

  test("mutating one field leaves the rest coherent", () => {
    // The intended usage pattern for handler tests.
    const m = DayMarketFixture.standard();
    m.trancheState.jtCoinvested = true;
    m.accountantState.lastMarketState = 1; // "fixed"
    mockDayMarket(m);

    const kernel = RoycoDayKernel.bind(m.kernel);
    assert.booleanEquals(
      kernel.previewSyncTrancheAccounting(TRANCHE_SENIOR).value0.jtCoinvested,
      true
    );
    assert.i32Equals(
      RoycoDayAccountant.bind(m.accountant).getState().lastMarketState,
      1
    );
  });
});
