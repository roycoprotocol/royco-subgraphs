import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import { tuple, uint, uintI32 } from "../helpers/tuple";

// =============================================================================
// The two structs that dominate this ABI surface. Both live here rather than in
// a per-contract builder, because both appear on several contracts.
//
// Mutable fields + defaults, never a positional constructor: an 18-arg
// constructor of same-typed BigInts guarantees a transposition bug eventually,
// and AssemblyScript has no object literals to soften it.
// =============================================================================

/**
 * `Claims` — returned by convertToAssets / totalAssets / previewRedeem, and
 * carried by the Redeem and MultiAssetRedeem events.
 *
 *   (stAssets, jtAssets, ltAssets, stShares, nav)
 *
 * These vaults are NOT ERC-4626: convertToAssets returns this struct, not a
 * uint256. This quadruple is why several schema entities repeat the same four
 * fields. See CLAUDE.md §6.
 */
export class Claims {
  collateralAssets: BigInt = BigInt.zero();
  lptAssets: BigInt = BigInt.zero();
  stShares: BigInt = BigInt.zero();
  nav: BigInt = BigInt.zero();

  toTuple(): ethereum.Tuple {
    return tuple([
      uint(this.collateralAssets), // 0
      uint(this.lptAssets), // 1
      uint(this.stShares), // 2
      uint(this.nav), // 3
    ]);
  }
}

/**
 * `TrancheState` — 16 fields in v2 (was 18: collateralNAV+jtRawNAV merged into
 * collateralNAV, and jtCoinvested was removed). The sole payload of
 * Accountant.TrancheAccountingSynced, and the first return value of
 * Kernel.previewSyncTrancheAccountingFor(uint8).
 *
 * TYPE TRAPS (verified against generated/):
 *   marketState           uint8  -> i32     (use uintI32)
 *   fixedTermEndTimestamp uint32 -> BigInt  (use uint)
 * Everything else is uint256 -> BigInt.
 */
export class TrancheState {
  marketState: i32 = 0; //  0 uint8  -> i32
  collateralNAV: BigInt = BigInt.zero(); //  1
  lptRawNAV: BigInt = BigInt.zero(); //  2
  stEffectiveNAV: BigInt = BigInt.zero(); //  3
  jtEffectiveNAV: BigInt = BigInt.zero(); //  4
  jtImpermanentLoss: BigInt = BigInt.zero(); //  5
  lptLiquidityPremium: BigInt = BigInt.zero(); //  6
  stProtocolFee: BigInt = BigInt.zero(); //  7
  jtProtocolFee: BigInt = BigInt.zero(); //  8
  lptProtocolFee: BigInt = BigInt.zero(); //  9
  coverageUtilizationWAD: BigInt = BigInt.zero(); // 10
  liquidityUtilizationWAD: BigInt = BigInt.zero(); // 11
  fixedTermEndTimestamp: BigInt = BigInt.zero(); // 12 uint32 -> BigInt (!)
  minCoverageWAD: BigInt = BigInt.zero(); // 13
  coverageLiquidationUtilizationWAD: BigInt = BigInt.zero(); // 14
  minLiquidityWAD: BigInt = BigInt.zero(); // 15

  toTuple(): ethereum.Tuple {
    return tuple([
      uintI32(this.marketState), //  0 uint8
      uint(this.collateralNAV), //  1
      uint(this.lptRawNAV), //  2
      uint(this.stEffectiveNAV), //  3
      uint(this.jtEffectiveNAV), //  4
      uint(this.jtImpermanentLoss), //  5
      uint(this.lptLiquidityPremium), //  6
      uint(this.stProtocolFee), //  7
      uint(this.jtProtocolFee), //  8
      uint(this.lptProtocolFee), //  9
      uint(this.coverageUtilizationWAD), // 10
      uint(this.liquidityUtilizationWAD), // 11
      uint(this.fixedTermEndTimestamp), // 12 uint32
      uint(this.minCoverageWAD), // 13
      uint(this.coverageLiquidationUtilizationWAD), // 14
      uint(this.minLiquidityWAD), // 15
    ]);
  }
}
