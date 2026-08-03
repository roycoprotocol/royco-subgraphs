import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { createMockedFunction } from "matchstick-as";
import { tuple, uint, uintI32, addr } from "../helpers/tuple";
import { ADDR_JT_YDM, ADDR_KERNEL, ADDR_LT_YDM } from "../helpers/constants";
import { ROYCO_DAY_ACCOUNTANT__GET_STATE } from "../generated/abi-signatures";

/**
 * RoycoDayAccountant.getState() — a single 24-field tuple output (was 27 in v1).
 *
 * !! MEMBER ORDER CHANGED in v2, not just names. This was rebuilt against the generated
 *    signature rather than edited in place — a positional tuple that merely *looks*
 *    right decodes into the wrong fields and every assertion still passes.
 *
 * Note the signature is generated, not hand-written: a 24-field ethabi string is
 * exactly the kind of thing that fails silently ("function not mocked") when one
 * character is off. See tests/generated/abi-signatures.ts.
 *
 * TYPE TRAPS (verified against generated/):
 *   fixedTermDurationSeconds  uint24 -> i32     (uintI32)
 *   lastMarketState           uint8  -> i32     (uintI32)
 *   fixedTermEndTimestamp     uint32 -> BigInt  (uint)
 *   the other two timestamps  uint32 -> BigInt  (uint)
 */
export class AccountantState {
  stProtocolFeeWAD: BigInt = BigInt.zero(); //  0 uint64
  jtProtocolFeeWAD: BigInt = BigInt.zero(); //  1 uint64
  jtYieldShareProtocolFeeWAD: BigInt = BigInt.zero(); //  2 uint64
  lptYieldShareProtocolFeeWAD: BigInt = BigInt.zero(); //  3 uint64
  minCoverageWAD: BigInt = BigInt.zero(); //  4 uint64
  minLiquidityWAD: BigInt = BigInt.zero(); //  5 uint64
  fixedTermDurationSeconds: i32 = 0; //  6 uint24 -> i32 (!)
  lastMarketState: i32 = 0; //  7 uint8  -> i32
  fixedTermEndTimestamp: BigInt = BigInt.zero(); //  8 uint32 -> BigInt (!)
  lastYieldShareAccrualTimestamp: BigInt = BigInt.zero(); //  9 uint32
  lastPremiumPaymentTimestamp: BigInt = BigInt.zero(); // 10 uint32
  jtYDM: Address = ADDR_JT_YDM; // 11
  maxJTYieldShareWAD: BigInt = BigInt.zero(); // 12 uint64
  lptYDM: Address = ADDR_LT_YDM; // 13
  maxLPTYieldShareWAD: BigInt = BigInt.zero(); // 14 uint64
  twJTYieldShareAccruedWAD: BigInt = BigInt.zero(); // 15 uint128
  twLPTYieldShareAccruedWAD: BigInt = BigInt.zero(); // 16 uint128
  // 17-18 are NEW. `kernel` replaces the removed KERNEL() view — every accountant
  // handler resolves its market through it, so a wrong slot here breaks all of them.
  kernel: Address = ADDR_KERNEL; // 17
  fixedTermCommenceableAtTimestamp: BigInt = BigInt.zero(); // 18 uint64
  coverageLiquidationUtilizationWAD: BigInt = BigInt.zero(); // 19
  lastCollateralNAV: BigInt = BigInt.zero(); // 20
  lastSTEffectiveNAV: BigInt = BigInt.zero(); // 21
  lastJTEffectiveNAV: BigInt = BigInt.zero(); // 22
  lastJTImpermanentLoss: BigInt = BigInt.zero(); // 23
  lastLPTRawNAV: BigInt = BigInt.zero(); // 24
  dustTolerance: BigInt = BigInt.zero(); // 25

  toTuple(): ethereum.Tuple {
    return tuple([
      uint(this.stProtocolFeeWAD),
      uint(this.jtProtocolFeeWAD),
      uint(this.jtYieldShareProtocolFeeWAD),
      uint(this.lptYieldShareProtocolFeeWAD),
      uint(this.minCoverageWAD),
      uint(this.minLiquidityWAD),
      uintI32(this.fixedTermDurationSeconds), // uint24
      uintI32(this.lastMarketState), // uint8
      uint(this.fixedTermEndTimestamp), // uint32
      uint(this.lastYieldShareAccrualTimestamp),
      uint(this.lastPremiumPaymentTimestamp),
      addr(this.jtYDM),
      uint(this.maxJTYieldShareWAD),
      addr(this.lptYDM),
      uint(this.maxLPTYieldShareWAD),
      uint(this.twJTYieldShareAccruedWAD),
      uint(this.twLPTYieldShareAccruedWAD),
      addr(this.kernel),
      uint(this.fixedTermCommenceableAtTimestamp),
      uint(this.coverageLiquidationUtilizationWAD),
      uint(this.lastCollateralNAV),
      uint(this.lastSTEffectiveNAV),
      uint(this.lastJTEffectiveNAV),
      uint(this.lastJTImpermanentLoss),
      uint(this.lastLPTRawNAV),
      uint(this.dustTolerance),
    ]);
  }
}

/** Single tuple output => .returns() gets ONE element. */
export function mockAccountantGetState(
  accountant: Address,
  s: AccountantState
): void {
  createMockedFunction(accountant, "getState", ROYCO_DAY_ACCOUNTANT__GET_STATE)
    .withArgs([])
    .returns([ethereum.Value.fromTuple(s.toTuple())]);
}
