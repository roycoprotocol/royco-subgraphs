import {
  assert,
  describe,
  test,
  clearStore,
  beforeEach,
} from "matchstick-as/assembly/index";
import { BigInt } from "@graphprotocol/graph-ts";
import { RoycoDayAccountant } from "../../generated/templates/RoycoDayAccountant/RoycoDayAccountant";
import { RoycoDayKernel } from "../../generated/templates/RoycoDayKernel/RoycoDayKernel";
import { AccountantState, mockAccountantGetState } from "../mocks/accountant";
import {
  KernelState,
  mockKernelGetState,
  mockPreviewSyncTrancheAccounting,
} from "../mocks/kernel";
import { Claims, TrancheState } from "../builders/shared";
import {
  ADDR_ACCOUNTANT,
  ADDR_BLACKLIST,
  ADDR_FEE_RECIPIENT,
  ADDR_JT_YDM,
  ADDR_KERNEL,
  ADDR_LT_YDM,
} from "../helpers/constants";

// =============================================================================
// Mock round-trip tests: register a mock, then call the REAL generated binding.
//
// With zero handlers written, this proves the things that are otherwise only
// discovered while debugging a handler (and misdiagnosed as a handler bug):
//   1. the generated ethabi signature string matches our mock's
//   2. tuple field order matches codegen's getters
//   3. the i32-vs-BigInt choices are right
//   4. withArgs() encoding matches (the uintI32 trap)
//   5. matchstick's mocking works at all on this platform
//
// Distinct sentinel per field, as ever.
// =============================================================================

describe("RoycoDayAccountant.getState mock", () => {
  beforeEach(() => {
    clearStore();
  });

  test("all 27 fields round-trip through the real binding", () => {
    const s = new AccountantState();
    s.stProtocolFeeWAD = BigInt.fromI32(2000);
    s.jtProtocolFeeWAD = BigInt.fromI32(2001);
    s.jtYieldShareProtocolFeeWAD = BigInt.fromI32(2002);
    s.ltYieldShareProtocolFeeWAD = BigInt.fromI32(2003);
    s.minCoverageWAD = BigInt.fromI32(2004);
    s.fixedTermDurationSeconds = 2005; // uint24 -> i32
    s.lastMarketState = 1; // uint8  -> i32
    s.fixedTermEndTimestamp = BigInt.fromI32(2007); // uint32 -> BigInt
    s.lastYieldShareAccrualTimestamp = BigInt.fromI32(2008);
    s.lastPremiumPaymentTimestamp = BigInt.fromI32(2009);
    s.minLiquidityWAD = BigInt.fromI32(2012);
    s.twJTYieldShareAccruedWAD = BigInt.fromI32(2013);
    s.maxJTYieldShareWAD = BigInt.fromI32(2014);
    s.twLTYieldShareAccruedWAD = BigInt.fromI32(2015);
    s.maxLTYieldShareWAD = BigInt.fromI32(2016);
    s.coverageLiquidationUtilizationWAD = BigInt.fromI32(2017);
    s.lastSTRawNAV = BigInt.fromI32(2018);
    s.lastJTRawNAV = BigInt.fromI32(2019);
    s.lastSTEffectiveNAV = BigInt.fromI32(2020);
    s.lastJTEffectiveNAV = BigInt.fromI32(2021);
    s.lastJTCoverageImpermanentLoss = BigInt.fromI32(2022);
    s.lastLTRawNAV = BigInt.fromI32(2023);
    s.stNAVDustTolerance = BigInt.fromI32(2024);
    s.jtNAVDustTolerance = BigInt.fromI32(2025);
    s.effectiveNAVDustTolerance = BigInt.fromI32(2026);

    mockAccountantGetState(ADDR_ACCOUNTANT, s);

    const got = RoycoDayAccountant.bind(ADDR_ACCOUNTANT).getState();

    assert.bigIntEquals(got.stProtocolFeeWAD, BigInt.fromI32(2000));
    assert.bigIntEquals(got.jtProtocolFeeWAD, BigInt.fromI32(2001));
    assert.bigIntEquals(got.jtYieldShareProtocolFeeWAD, BigInt.fromI32(2002));
    assert.bigIntEquals(got.ltYieldShareProtocolFeeWAD, BigInt.fromI32(2003));
    assert.bigIntEquals(got.minCoverageWAD, BigInt.fromI32(2004));
    // These two are i32, NOT BigInt — the uint24/uint8 boundary.
    assert.i32Equals(got.fixedTermDurationSeconds, 2005);
    assert.i32Equals(got.lastMarketState, 1);
    // ...while this uint32 neighbour IS a BigInt. The asymmetry, pinned.
    assert.bigIntEquals(got.fixedTermEndTimestamp, BigInt.fromI32(2007));
    assert.bigIntEquals(got.lastYieldShareAccrualTimestamp, BigInt.fromI32(2008));
    assert.bigIntEquals(got.lastPremiumPaymentTimestamp, BigInt.fromI32(2009));
    assert.addressEquals(got.jtYDM, ADDR_JT_YDM);
    assert.addressEquals(got.ltYDM, ADDR_LT_YDM);
    assert.bigIntEquals(got.minLiquidityWAD, BigInt.fromI32(2012));
    assert.bigIntEquals(got.twJTYieldShareAccruedWAD, BigInt.fromI32(2013));
    assert.bigIntEquals(got.maxJTYieldShareWAD, BigInt.fromI32(2014));
    assert.bigIntEquals(got.twLTYieldShareAccruedWAD, BigInt.fromI32(2015));
    assert.bigIntEquals(got.maxLTYieldShareWAD, BigInt.fromI32(2016));
    assert.bigIntEquals(
      got.coverageLiquidationUtilizationWAD,
      BigInt.fromI32(2017)
    );
    assert.bigIntEquals(got.lastSTRawNAV, BigInt.fromI32(2018));
    assert.bigIntEquals(got.lastJTRawNAV, BigInt.fromI32(2019));
    assert.bigIntEquals(got.lastSTEffectiveNAV, BigInt.fromI32(2020));
    assert.bigIntEquals(got.lastJTEffectiveNAV, BigInt.fromI32(2021));
    assert.bigIntEquals(got.lastJTCoverageImpermanentLoss, BigInt.fromI32(2022));
    assert.bigIntEquals(got.lastLTRawNAV, BigInt.fromI32(2023));
    assert.bigIntEquals(got.stNAVDustTolerance, BigInt.fromI32(2024));
    assert.bigIntEquals(got.jtNAVDustTolerance, BigInt.fromI32(2025));
    assert.bigIntEquals(got.effectiveNAVDustTolerance, BigInt.fromI32(2026));
  });
});

describe("RoycoDayKernel mocks", () => {
  beforeEach(() => {
    clearStore();
  });

  test("getState round-trips all 7 fields", () => {
    const s = new KernelState();
    s.stSelfLiquidationBonusWAD = BigInt.fromI32(4001);
    s.stOwnedYieldBearingAssets = BigInt.fromI32(4002);
    s.jtOwnedYieldBearingAssets = BigInt.fromI32(4003);
    s.ltOwnedYieldBearingAssets = BigInt.fromI32(4004);
    s.ltOwnedSeniorTrancheShares = BigInt.fromI32(4005);

    mockKernelGetState(ADDR_KERNEL, s);

    const got = RoycoDayKernel.bind(ADDR_KERNEL).getState();

    assert.addressEquals(got.protocolFeeRecipient, ADDR_FEE_RECIPIENT);
    assert.bigIntEquals(got.stSelfLiquidationBonusWAD, BigInt.fromI32(4001));
    assert.bigIntEquals(got.stOwnedYieldBearingAssets, BigInt.fromI32(4002));
    assert.bigIntEquals(got.jtOwnedYieldBearingAssets, BigInt.fromI32(4003));
    assert.bigIntEquals(got.ltOwnedYieldBearingAssets, BigInt.fromI32(4004));
    assert.bigIntEquals(got.ltOwnedSeniorTrancheShares, BigInt.fromI32(4005));
    assert.addressEquals(got.roycoBlacklist, ADDR_BLACKLIST);
  });

  test("previewSyncTrancheAccounting: 3 outputs decode, and withArgs matches on a uint8", () => {
    // This is the test that proves the uintI32 encoding rule. If the mock used
    // ethereum.Value.fromI32 for the tranche type, this call would not match its
    // mock and the test would abort with "function not mocked".
    const state = new TrancheState();
    state.marketState = 1;
    state.stRawNAV = BigInt.fromI32(5001);
    state.jtCoinvested = true;

    const claims = new Claims();
    claims.stAssets = BigInt.fromI32(6001);
    claims.jtAssets = BigInt.fromI32(6002);
    claims.ltAssets = BigInt.fromI32(6003);
    claims.stShares = BigInt.fromI32(6004);
    claims.nav = BigInt.fromI32(6005);

    mockPreviewSyncTrancheAccounting(
      ADDR_KERNEL,
      0,
      state,
      claims,
      BigInt.fromI32(7001)
    );

    const got = RoycoDayKernel.bind(ADDR_KERNEL).previewSyncTrancheAccounting(0);

    // out 0: TrancheState
    assert.i32Equals(got.value0.marketState, 1);
    assert.bigIntEquals(got.value0.stRawNAV, BigInt.fromI32(5001));
    assert.booleanEquals(got.value0.jtCoinvested, true);
    // out 1: Claims — the quintuple DayVaultState's asset fields come from
    assert.bigIntEquals(got.value1.stAssets, BigInt.fromI32(6001));
    assert.bigIntEquals(got.value1.jtAssets, BigInt.fromI32(6002));
    assert.bigIntEquals(got.value1.ltAssets, BigInt.fromI32(6003));
    assert.bigIntEquals(got.value1.stShares, BigInt.fromI32(6004));
    assert.bigIntEquals(got.value1.nav, BigInt.fromI32(6005));
    // out 2: uint256
    assert.bigIntEquals(got.value2, BigInt.fromI32(7001));
  });

  test("distinct tranche types get distinct mocks", () => {
    // Guards the withArgs matcher: if the uint8 arg were ignored, senior's mock
    // would answer junior's call and this would fail.
    const senior = new Claims();
    senior.nav = BigInt.fromI32(111);
    const junior = new Claims();
    junior.nav = BigInt.fromI32(222);

    mockPreviewSyncTrancheAccounting(
      ADDR_KERNEL,
      0,
      new TrancheState(),
      senior,
      BigInt.zero()
    );
    mockPreviewSyncTrancheAccounting(
      ADDR_KERNEL,
      1,
      new TrancheState(),
      junior,
      BigInt.zero()
    );

    const k = RoycoDayKernel.bind(ADDR_KERNEL);
    assert.bigIntEquals(
      k.previewSyncTrancheAccounting(0).value1.nav,
      BigInt.fromI32(111)
    );
    assert.bigIntEquals(
      k.previewSyncTrancheAccounting(1).value1.nav,
      BigInt.fromI32(222)
    );
  });
});
