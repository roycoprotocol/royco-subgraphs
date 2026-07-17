import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { createMockedFunction } from "matchstick-as";
import { AccountantState, mockAccountantGetState } from "./accountant";
import {
  KernelState,
  mockKernelGetState,
  mockPreviewSyncTrancheAccounting,
} from "./kernel";
import { Claims, TrancheState } from "../builders/shared";
import {
  ADDR_ACCOUNTANT,
  ADDR_ASSET,
  ADDR_JUNIOR,
  ADDR_KERNEL,
  ADDR_LIQUIDITY,
  ADDR_SENIOR,
  DECIMALS_18,
  WAD,
} from "../helpers/constants";
import {
  ROYCO_DAY_KERNEL__JT_CONVERT_TRANCHE_UNITS_TO_NAV_UNITS,
  ROYCO_DAY_KERNEL__LT_CONVERT_TRANCHE_UNITS_TO_NAV_UNITS,
  ROYCO_DAY_KERNEL__ST_CONVERT_TRANCHE_UNITS_TO_NAV_UNITS,
  ROYCO_SENIOR_TRANCHE__CONVERT_TO_ASSETS,
  ROYCO_SENIOR_TRANCHE__TRANCHE_TYPE,
} from "../generated/abi-signatures";

export * from "./accountant";
export * from "./kernel";

// Tranche type selectors for previewSyncTrancheAccounting(uint8).
// Inferred from the Kernel's SENIOR/JUNIOR/LIQUIDITY getter order — the ABI
// carries no enum names. Production code must read TRANCHE_TYPE() rather than
// hardcode these; they exist here only so fixtures can mock all three.
export const TRANCHE_SENIOR: i32 = 0;
export const TRANCHE_JUNIOR: i32 = 1;
export const TRANCHE_LIQUIDITY: i32 = 2;

/** Mock the ERC20-ish surface every tranche shares. */
export function mockTrancheToken(
  tranche: Address,
  asset: Address,
  decimals: i32,
  totalSupply: BigInt
): void {
  createMockedFunction(tranche, "asset", "asset():(address)")
    .withArgs([])
    .returns([ethereum.Value.fromAddress(asset)]);
  createMockedFunction(tranche, "decimals", "decimals():(uint8)")
    .withArgs([])
    .returns([ethereum.Value.fromI32(decimals)]);
  createMockedFunction(tranche, "totalSupply", "totalSupply():(uint256)")
    .withArgs([])
    .returns([ethereum.Value.fromUnsignedBigInt(totalSupply)]);
  createMockedFunction(tranche, "KERNEL", "KERNEL():(address)")
    .withArgs([])
    .returns([ethereum.Value.fromAddress(ADDR_KERNEL)]);
}

/**
 * Mock ACCOUNTANT.KERNEL() — the accountant -> market hop.
 *
 * The accountant address is NOT the marketId; the kernel's is (§6). Every
 * accountant handler makes this call before it can touch a DayMarketState, so
 * without this mock every one of them aborts.
 */
export function mockAccountantKernel(accountant: Address, kernel: Address): void {
  createMockedFunction(accountant, "KERNEL", "KERNEL():(address)")
    .withArgs([])
    .returns([ethereum.Value.fromAddress(kernel)]);
}

/** Mock the asset token itself (needed for DayVaultState.assetTokenDecimals). */
export function mockAssetToken(asset: Address, decimals: i32): void {
  createMockedFunction(asset, "decimals", "decimals():(uint8)")
    .withArgs([])
    .returns([ethereum.Value.fromI32(decimals)]);
}

/**
 * Mock TRANCHE_TYPE() — the uint8 the Kernel's previewSyncTrancheAccounting
 * wants. Handlers must read this rather than hardcode 0/1/2 (CLAUDE.md §6), so
 * it has to be mocked or the call aborts.
 *
 * The signature string is shared across all three tranche ABIs; the
 * "tranche view surfaces are byte-identical" check in scripts/checks/abi.test.mjs
 * fails the build if that ever stops being true.
 */
export function mockTrancheType(tranche: Address, trancheType: i32): void {
  createMockedFunction(tranche, "TRANCHE_TYPE", ROYCO_SENIOR_TRANCHE__TRANCHE_TYPE)
    .withArgs([])
    .returns([ethereum.Value.fromI32(trancheType)]);
}

/**
 * Mock convertToAssets(shares) -> Claims, for ONE input value.
 *
 * These are not ERC-4626 vaults: convertToAssets returns the Claims quintuple,
 * not a uint256 (CLAUDE.md §6). withArgs matches on the encoded argument, so a
 * handler calling this with any other `shares` value hits an unmocked function
 * and aborts — mock every input the handler uses.
 */
export function mockConvertToAssets(
  tranche: Address,
  shares: BigInt,
  claims: Claims
): void {
  createMockedFunction(
    tranche,
    "convertToAssets",
    ROYCO_SENIOR_TRANCHE__CONVERT_TO_ASSETS
  )
    .withArgs([ethereum.Value.fromUnsignedBigInt(shares)])
    .returns([ethereum.Value.fromTuple(claims.toTuple())]);
}

/**
 * Mock the Kernel's three tranche-prefixed NAV-unit converters, which back
 * DayVaultState.assetPriceNAV.
 *
 * There is no bare `convertTrancheUnitsToNAVUnits` on any contract — only these
 * three, and only on the Kernel. Distinct return values per prefix are the point:
 * they are what makes an st/jt/lt dispatch transposition fail the test.
 */
export function mockAssetPriceNAV(
  kernel: Address,
  oneAssetToken: BigInt,
  stNAV: BigInt,
  jtNAV: BigInt,
  ltNAV: BigInt
): void {
  const arg = [ethereum.Value.fromUnsignedBigInt(oneAssetToken)];
  createMockedFunction(
    kernel,
    "stConvertTrancheUnitsToNAVUnits",
    ROYCO_DAY_KERNEL__ST_CONVERT_TRANCHE_UNITS_TO_NAV_UNITS
  )
    .withArgs(arg)
    .returns([ethereum.Value.fromUnsignedBigInt(stNAV)]);
  createMockedFunction(
    kernel,
    "jtConvertTrancheUnitsToNAVUnits",
    ROYCO_DAY_KERNEL__JT_CONVERT_TRANCHE_UNITS_TO_NAV_UNITS
  )
    .withArgs(arg)
    .returns([ethereum.Value.fromUnsignedBigInt(jtNAV)]);
  createMockedFunction(
    kernel,
    "ltConvertTrancheUnitsToNAVUnits",
    ROYCO_DAY_KERNEL__LT_CONVERT_TRANCHE_UNITS_TO_NAV_UNITS
  )
    .withArgs(arg)
    .returns([ethereum.Value.fromUnsignedBigInt(ltNAV)]);
}

/**
 * A whole Day market's mockable surface, in one object.
 *
 * Mutate only the field under test; leave the rest coherent. Mutable fields
 * rather than a constructor — AssemblyScript has no object literals.
 */
export class DayMarketFixture {
  kernel: Address = ADDR_KERNEL;
  accountant: Address = ADDR_ACCOUNTANT;
  seniorTranche: Address = ADDR_SENIOR;
  juniorTranche: Address = ADDR_JUNIOR;
  liquidityTranche: Address = ADDR_LIQUIDITY;
  asset: Address = ADDR_ASSET;
  assetDecimals: i32 = DECIMALS_18;
  trancheDecimals: i32 = DECIMALS_18;

  accountantState: AccountantState = new AccountantState();
  kernelState: KernelState = new KernelState();
  trancheState: TrancheState = new TrancheState();
  claims: Claims = new Claims();
  totalTrancheShares: BigInt = BigInt.zero();
  sharesTotalSupply: BigInt = BigInt.zero();

  // === per-tranche values ===
  //
  // Deliberately DISTINCT per tranche. `claims` above is shared across the three
  // previewSyncTrancheAccounting mocks (that call's `state` is
  // tranche-independent, so sharing is honest there). These are not: they back
  // convertToAssets and the NAV converters, which a handler must route per
  // tranche. Shared values here would let a senior/junior/liquidity
  // transposition pass every assertion.

  /** convertToAssets(sharesTotalSupply) — DayVaultState's first Claims quintuple. */
  seniorTotalClaims: Claims = new Claims();
  juniorTotalClaims: Claims = new Claims();
  liquidityTotalClaims: Claims = new Claims();

  /** convertToAssets(10 ** trancheDecimals) — the sharePrice* quintuple. */
  seniorShareClaims: Claims = new Claims();
  juniorShareClaims: Claims = new Claims();
  liquidityShareClaims: Claims = new Claims();

  /** kernel.{st,jt,lt}ConvertTrancheUnitsToNAVUnits(10 ** assetDecimals). */
  seniorAssetPriceNAV: BigInt = BigInt.zero();
  juniorAssetPriceNAV: BigInt = BigInt.zero();
  liquidityAssetPriceNAV: BigInt = BigInt.zero();

  /**
   * A coherent, non-degenerate market: fees set, a live NAV, healthy coverage.
   * Prefer this over `new DayMarketFixture()` — an all-zeros market makes
   * division-by-zero and "is it just defaulting?" bugs invisible.
   */
  static standard(): DayMarketFixture {
    const m = new DayMarketFixture();

    m.accountantState.stProtocolFeeWAD = WAD.div(BigInt.fromI32(10)); // 10%
    m.accountantState.jtProtocolFeeWAD = WAD.div(BigInt.fromI32(20)); // 5%
    m.accountantState.minCoverageWAD = WAD.div(BigInt.fromI32(2)); // 50%
    m.accountantState.minLiquidityWAD = WAD.div(BigInt.fromI32(4)); // 25%
    m.accountantState.fixedTermDurationSeconds = 30 * 24 * 60 * 60; // uint24
    m.accountantState.lastMarketState = 0; // "perpetual"

    // Distinct non-zero sentinels for every member the handler reads. Left at the
    // class defaults these are all BigInt.zero(), and same-typed adjacent members
    // transpose freely under 0 == 0 — the tw*/max* quartet below is the pair
    // CLAUDE.md §7 calls "actively misleading" (caps, NOT accruals), and swapping
    // them silently inverts every yield-share query in Neon.
    // Widths are load-bearing: uint32 timestamps, uint64 caps, uint192 accruals.
    m.accountantState.fixedTermEndTimestamp = BigInt.fromI32(1_700_100_001);
    m.accountantState.lastYieldShareAccrualTimestamp = BigInt.fromI32(1_700_100_002);
    m.accountantState.lastPremiumPaymentTimestamp = BigInt.fromI32(1_700_100_003);
    m.accountantState.jtYieldShareProtocolFeeWAD = BigInt.fromI32(4_101);
    m.accountantState.ltYieldShareProtocolFeeWAD = BigInt.fromI32(4_102);
    m.accountantState.twJTYieldShareAccruedWAD = BigInt.fromI32(8_101);
    m.accountantState.maxJTYieldShareWAD = BigInt.fromI32(8_102);
    m.accountantState.twLTYieldShareAccruedWAD = BigInt.fromI32(8_103);
    m.accountantState.maxLTYieldShareWAD = BigInt.fromI32(8_104);
    m.accountantState.coverageLiquidationUtilizationWAD = BigInt.fromI32(7_101);
    m.accountantState.stNAVDustTolerance = BigInt.fromI32(6_101);
    m.accountantState.jtNAVDustTolerance = BigInt.fromI32(6_102);
    m.accountantState.effectiveNAVDustTolerance = BigInt.fromI32(6_103);

    m.kernelState.stSelfLiquidationBonusWAD = WAD.div(BigInt.fromI32(100));
    // Four adjacent st/jt/lt-prefixed BigInts — a rotation is undetectable
    // downstream, so they must not share a value.
    m.kernelState.stOwnedYieldBearingAssets = BigInt.fromI32(5_101);
    m.kernelState.jtOwnedYieldBearingAssets = BigInt.fromI32(5_102);
    m.kernelState.ltOwnedYieldBearingAssets = BigInt.fromI32(5_103);
    m.kernelState.ltOwnedSeniorTrancheShares = BigInt.fromI32(5_104);

    m.trancheState.marketState = 0;
    m.trancheState.stRawNAV = WAD.times(BigInt.fromI32(100));
    m.trancheState.jtRawNAV = WAD.times(BigInt.fromI32(50));
    m.trancheState.ltRawNAV = WAD.times(BigInt.fromI32(25));
    // Effective != raw. Equal values would let a raw/effective mix-up pass, and the
    // distinction is the whole point of the coverage model.
    m.trancheState.stEffectiveNAV = WAD.times(BigInt.fromI32(99));
    m.trancheState.jtEffectiveNAV = WAD.times(BigInt.fromI32(49));
    m.trancheState.jtCoverageImpermanentLoss = BigInt.fromI32(7_201);
    m.trancheState.ltLiquidityPremium = BigInt.fromI32(7_202);
    m.trancheState.coverageUtilizationWAD = WAD.div(BigInt.fromI32(2));
    m.trancheState.liquidityUtilizationWAD = WAD.div(BigInt.fromI32(4));
    // !! DELIBERATELY DIFFERENT from accountantState's min*WAD above. Both structs
    //    declare members with these exact names: the Accountant's are the STORED
    //    thresholds (what the schema keeps), the TrancheState's are the LIVE ones,
    //    and they diverge between syncs (CLAUDE.md §6).
    //    Giving them equal values makes the two sources indistinguishable and lets
    //    a handler read the wrong one and still pass — which is exactly what
    //    happened: handleMarketDeploymentCompleted shipped sourcing both from the
    //    preview, and the whole suite stayed green until these values diverged.
    m.trancheState.minCoverageWAD = WAD.div(BigInt.fromI32(3));
    m.trancheState.minLiquidityWAD = WAD.div(BigInt.fromI32(5));

    m.claims.stAssets = WAD.times(BigInt.fromI32(100));
    m.claims.jtAssets = WAD.times(BigInt.fromI32(50));
    m.claims.ltAssets = WAD.times(BigInt.fromI32(25));
    m.claims.stShares = WAD.times(BigInt.fromI32(10));
    m.claims.nav = WAD.times(BigInt.fromI32(175));

    m.totalTrancheShares = WAD.times(BigInt.fromI32(100));
    m.sharesTotalSupply = WAD.times(BigInt.fromI32(100));

    // Every value below is distinct, including across the two quintuples of one
    // tranche — nothing here may be inferable from anything else here.
    seedClaims(m.seniorTotalClaims, 1_100);
    seedClaims(m.juniorTotalClaims, 1_200);
    seedClaims(m.liquidityTotalClaims, 1_300);

    seedClaims(m.seniorShareClaims, 2_100);
    seedClaims(m.juniorShareClaims, 2_200);
    seedClaims(m.liquidityShareClaims, 2_300);

    m.seniorAssetPriceNAV = BigInt.fromI32(3_100);
    m.juniorAssetPriceNAV = BigInt.fromI32(3_200);
    m.liquidityAssetPriceNAV = BigInt.fromI32(3_300);

    return m;
  }
}

/**
 * Fill a Claims with five distinct, traceable values: base+1 .. base+5.
 *
 * The five fields are all BigInt and all plausible, so a stAssets/jtAssets swap
 * is invisible unless every value differs. Reading 1_103 in a failure message
 * tells you exactly which field and which tranche you actually got.
 */
function seedClaims(c: Claims, base: i32): void {
  c.stAssets = BigInt.fromI32(base + 1);
  c.jtAssets = BigInt.fromI32(base + 2);
  c.ltAssets = BigInt.fromI32(base + 3);
  c.stShares = BigInt.fromI32(base + 4);
  c.nav = BigInt.fromI32(base + 5);
}

/**
 * Register every view a Day handler can reach, for a whole market.
 *
 * Makes handler-test setup a single line:
 *   beforeEach(() => { clearStore(); mockDayMarket(DayMarketFixture.standard()); });
 *
 * An UNMOCKED call aborts the handler, and matchstick reports it as a failed
 * assertion — which reads like a logic bug and sends you looking in the wrong
 * place. Mock generously.
 */
export function mockDayMarket(m: DayMarketFixture): void {
  mockAccountantGetState(m.accountant, m.accountantState);
  mockAccountantKernel(m.accountant, m.kernel);
  mockKernelGetState(m.kernel, m.kernelState);

  mockPreviewSyncTrancheAccounting(
    m.kernel,
    TRANCHE_SENIOR,
    m.trancheState,
    m.claims,
    m.totalTrancheShares
  );
  mockPreviewSyncTrancheAccounting(
    m.kernel,
    TRANCHE_JUNIOR,
    m.trancheState,
    m.claims,
    m.totalTrancheShares
  );
  mockPreviewSyncTrancheAccounting(
    m.kernel,
    TRANCHE_LIQUIDITY,
    m.trancheState,
    m.claims,
    m.totalTrancheShares
  );

  mockTrancheToken(m.seniorTranche, m.asset, m.trancheDecimals, m.sharesTotalSupply);
  mockTrancheToken(m.juniorTranche, m.asset, m.trancheDecimals, m.sharesTotalSupply);
  mockTrancheToken(m.liquidityTranche, m.asset, m.trancheDecimals, m.sharesTotalSupply);

  mockTrancheType(m.seniorTranche, TRANCHE_SENIOR);
  mockTrancheType(m.juniorTranche, TRANCHE_JUNIOR);
  mockTrancheType(m.liquidityTranche, TRANCHE_LIQUIDITY);

  // convertToAssets is mocked at the two inputs DayVaultState reads it at:
  // the total supply, and one whole share (CLAUDE.md §6). withArgs matches on the
  // encoded argument, so a handler passing any other value aborts as unmocked.
  const oneShare = BigInt.fromI32(10).pow(u8(m.trancheDecimals));

  mockConvertToAssets(m.seniorTranche, m.sharesTotalSupply, m.seniorTotalClaims);
  mockConvertToAssets(m.juniorTranche, m.sharesTotalSupply, m.juniorTotalClaims);
  mockConvertToAssets(
    m.liquidityTranche,
    m.sharesTotalSupply,
    m.liquidityTotalClaims
  );

  mockConvertToAssets(m.seniorTranche, oneShare, m.seniorShareClaims);
  mockConvertToAssets(m.juniorTranche, oneShare, m.juniorShareClaims);
  mockConvertToAssets(m.liquidityTranche, oneShare, m.liquidityShareClaims);

  mockAssetPriceNAV(
    m.kernel,
    BigInt.fromI32(10).pow(u8(m.assetDecimals)),
    m.seniorAssetPriceNAV,
    m.juniorAssetPriceNAV,
    m.liquidityAssetPriceNAV
  );

  mockAssetToken(m.asset, m.assetDecimals);
}

/**
 * Make convertToAssets(shares) REVERT for one input.
 *
 * The revert branches are the only paths in the tranche handlers that `graph
 * build` cannot reach and that matter enormously: a stale Chainlink feed reverts
 * convertToAssets while the Transfer log itself succeeds (a plain ERC20 transfer
 * reads no oracle on-chain), so this is an ordinary Tuesday, not an exotic case.
 */
export function mockConvertToAssetsReverts(tranche: Address, shares: BigInt): void {
  createMockedFunction(
    tranche,
    "convertToAssets",
    ROYCO_SENIOR_TRANCHE__CONVERT_TO_ASSETS
  )
    .withArgs([ethereum.Value.fromUnsignedBigInt(shares)])
    .reverts();
}

/** Make all three Kernel NAV converters REVERT for one input. */
export function mockAssetPriceNAVReverts(
  kernel: Address,
  oneAssetToken: BigInt
): void {
  const arg = [ethereum.Value.fromUnsignedBigInt(oneAssetToken)];
  createMockedFunction(
    kernel,
    "stConvertTrancheUnitsToNAVUnits",
    ROYCO_DAY_KERNEL__ST_CONVERT_TRANCHE_UNITS_TO_NAV_UNITS
  )
    .withArgs(arg)
    .reverts();
  createMockedFunction(
    kernel,
    "jtConvertTrancheUnitsToNAVUnits",
    ROYCO_DAY_KERNEL__JT_CONVERT_TRANCHE_UNITS_TO_NAV_UNITS
  )
    .withArgs(arg)
    .reverts();
  createMockedFunction(
    kernel,
    "ltConvertTrancheUnitsToNAVUnits",
    ROYCO_DAY_KERNEL__LT_CONVERT_TRANCHE_UNITS_TO_NAV_UNITS
  )
    .withArgs(arg)
    .reverts();
}
