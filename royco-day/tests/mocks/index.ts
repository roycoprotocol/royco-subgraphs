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

/** Mock the asset token itself (needed for DayVaultState.assetTokenDecimals). */
export function mockAssetToken(asset: Address, decimals: i32): void {
  createMockedFunction(asset, "decimals", "decimals():(uint8)")
    .withArgs([])
    .returns([ethereum.Value.fromI32(decimals)]);
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
    m.accountantState.fixedTermDurationSeconds = 30 * 24 * 60 * 60;
    m.accountantState.lastMarketState = 0; // "fixed"

    m.kernelState.stSelfLiquidationBonusWAD = WAD.div(BigInt.fromI32(100));

    m.trancheState.marketState = 0;
    m.trancheState.stRawNAV = WAD.times(BigInt.fromI32(100));
    m.trancheState.jtRawNAV = WAD.times(BigInt.fromI32(50));
    m.trancheState.ltRawNAV = WAD.times(BigInt.fromI32(25));
    m.trancheState.stEffectiveNAV = WAD.times(BigInt.fromI32(100));
    m.trancheState.jtEffectiveNAV = WAD.times(BigInt.fromI32(50));
    m.trancheState.coverageUtilizationWAD = WAD.div(BigInt.fromI32(2));
    m.trancheState.liquidityUtilizationWAD = WAD.div(BigInt.fromI32(4));
    m.trancheState.minCoverageWAD = WAD.div(BigInt.fromI32(2));
    m.trancheState.minLiquidityWAD = WAD.div(BigInt.fromI32(4));

    m.claims.stAssets = WAD.times(BigInt.fromI32(100));
    m.claims.jtAssets = WAD.times(BigInt.fromI32(50));
    m.claims.ltAssets = WAD.times(BigInt.fromI32(25));
    m.claims.stShares = WAD.times(BigInt.fromI32(10));
    m.claims.nav = WAD.times(BigInt.fromI32(175));

    m.totalTrancheShares = WAD.times(BigInt.fromI32(100));
    m.sharesTotalSupply = WAD.times(BigInt.fromI32(100));

    return m;
  }
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

  mockAssetToken(m.asset, m.assetDecimals);
}
