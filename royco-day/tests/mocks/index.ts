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
  ADDR_LPT_ASSET,
  ADDR_QUOTE_ASSET,
  ADDR_BALANCER_VAULT,
  ADDR_JUNIOR,
  ADDR_KERNEL,
  ADDR_LIQUIDITY,
  ADDR_SENIOR,
  DECIMALS_18,
  DECIMALS_6,
  WAD,
} from "../helpers/constants";
import {
  ROYCO_DAY_KERNEL__CONVERT_COLLATERAL_ASSETS_TO_VALUE,
  ROYCO_DAY_KERNEL__CONVERT_LPT_ASSETS_TO_VALUE,
  ROYCO_DAY_KERNEL__COLLATERAL_ASSET,
  ROYCO_DAY_KERNEL__LPT_ASSET,
  ROYCO_DAY_KERNEL__QUOTE_ASSET,
  ROYCO_SENIOR_TRANCHE__CONVERT_TO_ASSETS,
  ROYCO_SENIOR_TRANCHE__TRANCHE_TYPE,
} from "../generated/abi-signatures";

export * from "./accountant";
export * from "./kernel";

// Tranche type selectors for previewSyncTrancheAccountingFor(uint8).
// Inferred from the Kernel's SENIOR/JUNIOR/LIQUIDITY getter order — the ABI
// carries no enum names. Production code must read TRANCHE_TYPE() rather than
// hardcode these; they exist here only so fixtures can mock all three.
export const TRANCHE_SENIOR: i32 = 0;
export const TRANCHE_JUNIOR: i32 = 1;
export const TRANCHE_LIQUIDITY: i32 = 2; // TrancheType.LIQUIDITY_PROVIDER in v2

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
 * The BPT's Balancer V3 surface: the pool's vault, its two tokens, and their rates.
 *
 * The liquidity tranche's deposit asset IS the BPT, and in Balancer V3 the pool contract
 * IS that token, so `bpt` is both the token address and the `pool` argument.
 *
 * TOKEN ORDER IS THE PARAMETER THAT MATTERS. The pool is a pair of (senior tranche
 * share, quote asset) but registration order is the deployer's choice, so
 * `quoteAssetPoolIndex` places the quote leg and the senior share takes the other slot.
 * The rates are per-slot too, so a handler that hardcodes slot 0 or reads the senior
 * leg's rate produces a visibly wrong number rather than a coincidental pass.
 */
export function mockBalancerPool(
  bpt: Address,
  vault: Address,
  seniorTranche: Address,
  quoteAsset: Address,
  quoteAssetPoolIndex: i32,
  quoteRate: BigInt,
  seniorRate: BigInt
): void {
  createMockedFunction(bpt, "getVault", "getVault():(address)")
    .withArgs([])
    .returns([ethereum.Value.fromAddress(vault)]);

  const tokens = new Array<Address>(2);
  const rates = new Array<BigInt>(2);
  const scalingFactors = new Array<BigInt>(2);
  const seniorIndex = quoteAssetPoolIndex == 0 ? 1 : 0;
  tokens[quoteAssetPoolIndex] = quoteAsset;
  tokens[seniorIndex] = seniorTranche;
  rates[quoteAssetPoolIndex] = quoteRate;
  rates[seniorIndex] = seniorRate;
  // Deliberately NOT 1e18 in either slot: these are RAW 10 ** (18 - decimals) factors,
  // not fixed-point (PoolConfigLib.sol:255-257). They cancel out of the price identity,
  // so a handler that multiplies by them anyway is off by 10^12 here and shows it.
  scalingFactors[quoteAssetPoolIndex] = BigInt.fromI32(10).pow(12); // a 6-decimal quote
  scalingFactors[seniorIndex] = BigInt.fromI32(1); // an 18-decimal share

  createMockedFunction(vault, "getPoolTokens", "getPoolTokens(address):(address[])")
    .withArgs([ethereum.Value.fromAddress(bpt)])
    .returns([ethereum.Value.fromAddressArray(tokens)]);

  createMockedFunction(
    vault,
    "getPoolTokenRates",
    "getPoolTokenRates(address):(uint256[],uint256[])"
  )
    .withArgs([ethereum.Value.fromAddress(bpt)])
    .returns([
      ethereum.Value.fromUnsignedBigIntArray(scalingFactors),
      ethereum.Value.fromUnsignedBigIntArray(rates),
    ]);
}

/** A kernel with NO Balancer venue: LPT_ASSET is a plain ERC20, not a pool. */
export function mockBalancerPoolAbsent(bpt: Address): void {
  createMockedFunction(bpt, "getVault", "getVault():(address)").withArgs([]).reverts();
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
 * Mock the Kernel's TWO asset-scoped NAV-unit converters, which back
 * DayVaultState.assetPriceNAV and DayMarketNav's asset prices.
 *
 * v1 had three, one per tranche. v2 has two, because senior and junior are coinvested
 * in ONE collateral asset and therefore share a converter — so a senior vault and a
 * junior vault in the same market legitimately store the SAME assetPriceNAV. Distinct
 * return values across the two are still the point: they are what makes a
 * collateral/LPT dispatch transposition fail the test.
 */
export function mockAssetPriceNAV(
  kernel: Address,
  oneAssetToken: BigInt,
  collateralNAV: BigInt,
  lptNAV: BigInt
): void {
  const arg = [ethereum.Value.fromUnsignedBigInt(oneAssetToken)];
  createMockedFunction(
    kernel,
    "convertCollateralAssetsToValue",
    ROYCO_DAY_KERNEL__CONVERT_COLLATERAL_ASSETS_TO_VALUE
  )
    .withArgs(arg)
    .returns([ethereum.Value.fromUnsignedBigInt(collateralNAV)]);
  createMockedFunction(
    kernel,
    "convertLPTAssetsToValue",
    ROYCO_DAY_KERNEL__CONVERT_LPT_ASSETS_TO_VALUE
  )
    .withArgs(arg)
    .returns([ethereum.Value.fromUnsignedBigInt(lptNAV)]);
}

/**
 * Mock the Kernel's three asset-token views.
 *
 * All three are `immutable` on chain and have no event, so handleMarketDeploymentCompleted
 * is the only place they are ever read — but it reads them unconditionally, so leaving
 * any of the three unmocked aborts EVERY factory test with a "function not mocked" that
 * reads like a logic bug.
 *
 * Distinct sentinels per token are the point: collateral and LPT are separate ERC20s in
 * v2, and quote is a third that belongs to no tranche at all. Shared values would let a
 * transposition among the three pass.
 */
export function mockKernelAssets(
  kernel: Address,
  collateralAsset: Address,
  lptAsset: Address,
  quoteAsset: Address
): void {
  createMockedFunction(kernel, "COLLATERAL_ASSET", ROYCO_DAY_KERNEL__COLLATERAL_ASSET)
    .withArgs([])
    .returns([ethereum.Value.fromAddress(collateralAsset)]);
  createMockedFunction(kernel, "LPT_ASSET", ROYCO_DAY_KERNEL__LPT_ASSET)
    .withArgs([])
    .returns([ethereum.Value.fromAddress(lptAsset)]);
  createMockedFunction(kernel, "QUOTE_ASSET", ROYCO_DAY_KERNEL__QUOTE_ASSET)
    .withArgs([])
    .returns([ethereum.Value.fromAddress(quoteAsset)]);
}

/**
 * Make QUOTE_ASSET revert — a kernel variant with no liquidity venue.
 *
 * It is the ONE of the three read with try_, because it is `virtual` and bodyless on the
 * base kernel. This exists so the zero-address fallback is actually exercised rather than
 * merely asserted in a comment.
 */
export function mockQuoteAssetReverts(kernel: Address): void {
  createMockedFunction(kernel, "QUOTE_ASSET", ROYCO_DAY_KERNEL__QUOTE_ASSET)
    .withArgs([])
    .reverts();
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
  // The kernel's own view of the same tokens. `asset` above is what the TRANCHES
  // report; the constructor requires senior.asset() == junior.asset() ==
  // COLLATERAL_ASSET, so collateralAsset mirrors it deliberately.
  collateralAsset: Address = ADDR_ASSET;
  lptAsset: Address = ADDR_LPT_ASSET;
  quoteAsset: Address = ADDR_QUOTE_ASSET;
  assetDecimals: i32 = DECIMALS_18;
  trancheDecimals: i32 = DECIMALS_18;
  // 6, NOT 18, on purpose: the quote asset is the one token whose decimals differ from
  // everything else in the fixture (USDC is the real-world case), so a handler that
  // reads the wrong token's decimals for it shows up as a wrong number rather than a
  // coincidental pass.
  quoteAssetDecimals: i32 = DECIMALS_6;
  // === the BPT's Balancer surface ===
  // lptAsset above IS the pool. Index 1 by default so the senior share sits in slot 0,
  // matching the venue's own "if tokens[0] == SENIOR_TRANCHE then quote is 1" branch.
  balancerVault: Address = ADDR_BALANCER_VAULT;
  quoteAssetPoolIndex: i32 = 1;
  // 1.0 would be indistinguishable from a hardcoded WAD, and equal rates would hide a
  // handler reading the wrong slot. A STANDARD quote really is FP(1) on chain — the
  // dedicated test covers that case explicitly.
  quoteAssetRate: BigInt = BigInt.fromString("1020000000000000000"); // 1.02
  seniorShareRate: BigInt = BigInt.fromString("3070000000000000000"); // 3.07

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

  /** kernel.convertCollateralAssetsToValue / convertLPTAssetsToValue(10 ** assetDecimals). */
  collateralAssetPriceNAV: BigInt = BigInt.zero();
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
    m.accountantState.lptYieldShareProtocolFeeWAD = BigInt.fromI32(4_102);
    m.accountantState.twJTYieldShareAccruedWAD = BigInt.fromI32(8_101);
    m.accountantState.maxJTYieldShareWAD = BigInt.fromI32(8_102);
    m.accountantState.twLPTYieldShareAccruedWAD = BigInt.fromI32(8_103);
    m.accountantState.maxLPTYieldShareWAD = BigInt.fromI32(8_104);
    m.accountantState.coverageLiquidationUtilizationWAD = BigInt.fromI32(7_101);
    m.accountantState.dustTolerance = BigInt.fromI32(6_101);

    m.kernelState.stSelfLiquidationBonusWAD = WAD.div(BigInt.fromI32(100));
    // Four adjacent st/jt/lt-prefixed BigInts — a rotation is undetectable
    // downstream, so they must not share a value.
    m.kernelState.totalCollateralAssets = BigInt.fromI32(5_101);
    m.kernelState.totalLPTAssets = BigInt.fromI32(5_103);
    m.kernelState.lptOwnedSeniorTrancheShares = BigInt.fromI32(5_104);
    m.kernelState.stalenessThresholdSeconds = BigInt.fromI32(5_201);
    m.kernelState.gracePeriodSeconds = BigInt.fromI32(5_202);

    m.trancheState.marketState = 0;
    m.trancheState.collateralNAV = WAD.times(BigInt.fromI32(150));
    m.trancheState.lptRawNAV = WAD.times(BigInt.fromI32(25));
    // Effective != raw. Equal values would let a raw/effective mix-up pass, and the
    // distinction is the whole point of the coverage model.
    m.trancheState.stEffectiveNAV = WAD.times(BigInt.fromI32(99));
    m.trancheState.jtEffectiveNAV = WAD.times(BigInt.fromI32(49));
    m.trancheState.jtImpermanentLoss = BigInt.fromI32(7_201);
    m.trancheState.lptLiquidityPremium = BigInt.fromI32(7_202);
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

    m.claims.collateralAssets = WAD.times(BigInt.fromI32(150));
    m.claims.lptAssets = WAD.times(BigInt.fromI32(25));
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

    m.collateralAssetPriceNAV = BigInt.fromI32(3_100);
    m.liquidityAssetPriceNAV = BigInt.fromI32(3_300);

    return m;
  }
}

/**
 * Fill a Claims with four distinct, traceable values: base+1 .. base+4.
 *
 * The four fields are all BigInt and all plausible, so a collateralAssets/lptAssets swap
 * is invisible unless every value differs. Reading 1_103 in a failure message
 * tells you exactly which field and which tranche you actually got.
 */
function seedClaims(c: Claims, base: i32): void {
  c.collateralAssets = BigInt.fromI32(base + 1);
  c.lptAssets = BigInt.fromI32(base + 2);
  c.stShares = BigInt.fromI32(base + 3);
  c.nav = BigInt.fromI32(base + 4);
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
  // The LIQUIDITY tranche's asset is the BPT, NOT the collateral. The kernel
  // constructor requires liquidityProviderTranche.asset() == LPT_ASSET, so a fixture
  // that reported the collateral here would describe a market that cannot exist — and
  // would let a handler reading liquidity.assetTokenAddress as the pool pass its tests
  // while being wrong on chain.
  mockTrancheToken(
    m.liquidityTranche,
    m.lptAsset,
    m.trancheDecimals,
    m.sharesTotalSupply
  );

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
    m.collateralAssetPriceNAV,
    m.liquidityAssetPriceNAV
  );

  mockAssetToken(m.asset, m.assetDecimals);
  // The BPT is an ERC20 too — createVault reads decimals off the liquidity tranche's
  // asset, which is now (correctly) this one.
  mockAssetToken(m.lptAsset, m.assetDecimals);
  // The quote asset's own decimals. It has no tranche, so nothing else mocks it, and
  // handleMarketDeploymentCompleted reads it straight off the ERC20.
  mockAssetToken(m.quoteAsset, m.quoteAssetDecimals);
  // The BPT is the liquidity tranche's asset AND the Balancer pool.
  mockBalancerPool(
    m.lptAsset,
    m.balancerVault,
    m.seniorTranche,
    m.quoteAsset,
    m.quoteAssetPoolIndex,
    m.quoteAssetRate,
    m.seniorShareRate
  );

  mockKernelAssets(m.kernel, m.collateralAsset, m.lptAsset, m.quoteAsset);
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

/** Make both Kernel NAV converters REVERT for one input. */
export function mockAssetPriceNAVReverts(
  kernel: Address,
  oneAssetToken: BigInt
): void {
  const arg = [ethereum.Value.fromUnsignedBigInt(oneAssetToken)];
  createMockedFunction(
    kernel,
    "convertCollateralAssetsToValue",
    ROYCO_DAY_KERNEL__CONVERT_COLLATERAL_ASSETS_TO_VALUE
  )
    .withArgs(arg)
    .reverts();
  createMockedFunction(
    kernel,
    "convertLPTAssetsToValue",
    ROYCO_DAY_KERNEL__CONVERT_LPT_ASSETS_TO_VALUE
  )
    .withArgs(arg)
    .reverts();
}
