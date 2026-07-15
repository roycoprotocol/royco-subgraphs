import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { createMockedFunction } from "matchstick-as";
import { tuple, uint, uintI32, addr } from "../helpers/tuple";
import { ADDR_JT_YDM, ADDR_LT_YDM } from "../helpers/constants";
import { ROYCO_DAY_ACCOUNTANT__GET_STATE } from "../generated/abi-signatures";

/**
 * RoycoDayAccountant.getState() — a single 27-field tuple output.
 *
 * Note the signature is generated, not hand-written: a 27-field ethabi string is
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
  ltYieldShareProtocolFeeWAD: BigInt = BigInt.zero(); //  3 uint64
  minCoverageWAD: BigInt = BigInt.zero(); //  4 uint64
  fixedTermDurationSeconds: i32 = 0; //  5 uint24 -> i32 (!)
  lastMarketState: i32 = 0; //  6 uint8  -> i32
  fixedTermEndTimestamp: BigInt = BigInt.zero(); //  7 uint32 -> BigInt (!)
  lastYieldShareAccrualTimestamp: BigInt = BigInt.zero(); //  8 uint32
  lastPremiumPaymentTimestamp: BigInt = BigInt.zero(); //  9 uint32
  jtYDM: Address = ADDR_JT_YDM; // 10
  ltYDM: Address = ADDR_LT_YDM; // 11
  minLiquidityWAD: BigInt = BigInt.zero(); // 12 uint64
  twJTYieldShareAccruedWAD: BigInt = BigInt.zero(); // 13 uint192
  maxJTYieldShareWAD: BigInt = BigInt.zero(); // 14 uint64
  twLTYieldShareAccruedWAD: BigInt = BigInt.zero(); // 15 uint192
  maxLTYieldShareWAD: BigInt = BigInt.zero(); // 16 uint64
  coverageLiquidationUtilizationWAD: BigInt = BigInt.zero(); // 17
  lastSTRawNAV: BigInt = BigInt.zero(); // 18
  lastJTRawNAV: BigInt = BigInt.zero(); // 19
  lastSTEffectiveNAV: BigInt = BigInt.zero(); // 20
  lastJTEffectiveNAV: BigInt = BigInt.zero(); // 21
  lastJTCoverageImpermanentLoss: BigInt = BigInt.zero(); // 22
  lastLTRawNAV: BigInt = BigInt.zero(); // 23
  stNAVDustTolerance: BigInt = BigInt.zero(); // 24
  jtNAVDustTolerance: BigInt = BigInt.zero(); // 25
  effectiveNAVDustTolerance: BigInt = BigInt.zero(); // 26

  toTuple(): ethereum.Tuple {
    return tuple([
      uint(this.stProtocolFeeWAD),
      uint(this.jtProtocolFeeWAD),
      uint(this.jtYieldShareProtocolFeeWAD),
      uint(this.ltYieldShareProtocolFeeWAD),
      uint(this.minCoverageWAD),
      uintI32(this.fixedTermDurationSeconds), // uint24
      uintI32(this.lastMarketState), // uint8
      uint(this.fixedTermEndTimestamp), // uint32
      uint(this.lastYieldShareAccrualTimestamp),
      uint(this.lastPremiumPaymentTimestamp),
      addr(this.jtYDM),
      addr(this.ltYDM),
      uint(this.minLiquidityWAD),
      uint(this.twJTYieldShareAccruedWAD),
      uint(this.maxJTYieldShareWAD),
      uint(this.twLTYieldShareAccruedWAD),
      uint(this.maxLTYieldShareWAD),
      uint(this.coverageLiquidationUtilizationWAD),
      uint(this.lastSTRawNAV),
      uint(this.lastJTRawNAV),
      uint(this.lastSTEffectiveNAV),
      uint(this.lastJTEffectiveNAV),
      uint(this.lastJTCoverageImpermanentLoss),
      uint(this.lastLTRawNAV),
      uint(this.stNAVDustTolerance),
      uint(this.jtNAVDustTolerance),
      uint(this.effectiveNAVDustTolerance),
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
