import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import { tuple, uint, uintI32, bool } from "../helpers/tuple";

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
 * uint256. This quintuple is why six schema entities repeat the same five
 * fields. See CLAUDE.md §6.
 */
export class Claims {
  stAssets: BigInt = BigInt.zero();
  jtAssets: BigInt = BigInt.zero();
  ltAssets: BigInt = BigInt.zero();
  stShares: BigInt = BigInt.zero();
  nav: BigInt = BigInt.zero();

  toTuple(): ethereum.Tuple {
    return tuple([
      uint(this.stAssets), // 0
      uint(this.jtAssets), // 1
      uint(this.ltAssets), // 2
      uint(this.stShares), // 3
      uint(this.nav), // 4
    ]);
  }
}

/**
 * `TrancheState` — 18 fields. The sole payload of
 * Accountant.TrancheAccountingSynced, and the first return value of
 * Kernel.previewSyncTrancheAccounting(uint8).
 *
 * TYPE TRAPS (verified against generated/):
 *   marketState           uint8  -> i32     (use uintI32)
 *   fixedTermEndTimestamp uint32 -> BigInt  (use uint)
 *   jtCoinvested          bool   -> boolean
 * Everything else is uint256 -> BigInt.
 */
export class TrancheState {
  marketState: i32 = 0; //  0 uint8  -> i32
  stRawNAV: BigInt = BigInt.zero(); //  1
  jtRawNAV: BigInt = BigInt.zero(); //  2
  ltRawNAV: BigInt = BigInt.zero(); //  3
  stEffectiveNAV: BigInt = BigInt.zero(); //  4
  jtEffectiveNAV: BigInt = BigInt.zero(); //  5
  jtCoverageImpermanentLoss: BigInt = BigInt.zero(); //  6
  ltLiquidityPremium: BigInt = BigInt.zero(); //  7
  stProtocolFee: BigInt = BigInt.zero(); //  8
  jtProtocolFee: BigInt = BigInt.zero(); //  9
  ltProtocolFee: BigInt = BigInt.zero(); // 10
  coverageUtilizationWAD: BigInt = BigInt.zero(); // 11
  liquidityUtilizationWAD: BigInt = BigInt.zero(); // 12
  fixedTermEndTimestamp: BigInt = BigInt.zero(); // 13 uint32 -> BigInt (!)
  minCoverageWAD: BigInt = BigInt.zero(); // 14
  jtCoinvested: boolean = false; // 15 bool
  coverageLiquidationUtilizationWAD: BigInt = BigInt.zero(); // 16
  minLiquidityWAD: BigInt = BigInt.zero(); // 17

  toTuple(): ethereum.Tuple {
    return tuple([
      uintI32(this.marketState), //  0 uint8
      uint(this.stRawNAV), //  1
      uint(this.jtRawNAV), //  2
      uint(this.ltRawNAV), //  3
      uint(this.stEffectiveNAV), //  4
      uint(this.jtEffectiveNAV), //  5
      uint(this.jtCoverageImpermanentLoss), //  6
      uint(this.ltLiquidityPremium), //  7
      uint(this.stProtocolFee), //  8
      uint(this.jtProtocolFee), //  9
      uint(this.ltProtocolFee), // 10
      uint(this.coverageUtilizationWAD), // 11
      uint(this.liquidityUtilizationWAD), // 12
      uint(this.fixedTermEndTimestamp), // 13 uint32
      uint(this.minCoverageWAD), // 14
      bool(this.jtCoinvested), // 15
      uint(this.coverageLiquidationUtilizationWAD), // 16
      uint(this.minLiquidityWAD), // 17
    ]);
  }
}
