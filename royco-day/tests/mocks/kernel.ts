import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { createMockedFunction } from "matchstick-as";
import { tuple, uint, uintI32, addr } from "../helpers/tuple";
import { ADDR_BLACKLIST, ADDR_FEE_RECIPIENT } from "../helpers/constants";
import { Claims, TrancheState } from "../builders/shared";
import {
  ROYCO_DAY_KERNEL__GET_STATE,
  ROYCO_DAY_KERNEL__PREVIEW_SYNC_TRANCHE_ACCOUNTING,
} from "../generated/abi-signatures";

/**
 * RoycoDayKernel.getState() — a single 7-field tuple.
 *
 * Note `roycoBlacklist` (index 6) has no schema field today; it's mocked anyway
 * because the binding decodes the whole tuple regardless.
 */
export class KernelState {
  protocolFeeRecipient: Address = ADDR_FEE_RECIPIENT; // 0
  stSelfLiquidationBonusWAD: BigInt = BigInt.zero(); // 1 uint64
  stOwnedYieldBearingAssets: BigInt = BigInt.zero(); // 2
  jtOwnedYieldBearingAssets: BigInt = BigInt.zero(); // 3
  ltOwnedYieldBearingAssets: BigInt = BigInt.zero(); // 4
  ltOwnedSeniorTrancheShares: BigInt = BigInt.zero(); // 5
  roycoBlacklist: Address = ADDR_BLACKLIST; // 6

  toTuple(): ethereum.Tuple {
    return tuple([
      addr(this.protocolFeeRecipient),
      uint(this.stSelfLiquidationBonusWAD),
      uint(this.stOwnedYieldBearingAssets),
      uint(this.jtOwnedYieldBearingAssets),
      uint(this.ltOwnedYieldBearingAssets),
      uint(this.ltOwnedSeniorTrancheShares),
      addr(this.roycoBlacklist),
    ]);
  }
}

export function mockKernelGetState(kernel: Address, s: KernelState): void {
  createMockedFunction(kernel, "getState", ROYCO_DAY_KERNEL__GET_STATE)
    .withArgs([])
    .returns([ethereum.Value.fromTuple(s.toTuple())]);
}

/**
 * RoycoDayKernel.previewSyncTrancheAccounting(uint8 trancheType)
 *   -> (TrancheState state, Claims claims, uint256 totalTrancheShares)
 *
 * THREE outputs => .returns() gets THREE elements (contrast getState's one).
 *
 * The arg MUST be encoded with uintI32 (fromUnsignedBigInt), not fromI32 —
 * withArgs matches on the encoded representation and codegen passes a uint8 as
 * an unsigned BigInt. fromI32 produces ValueKind.INT and silently never matches.
 * See tests/helpers/tuple.ts.
 */
export function mockPreviewSyncTrancheAccounting(
  kernel: Address,
  trancheType: i32,
  state: TrancheState,
  claims: Claims,
  totalTrancheShares: BigInt
): void {
  createMockedFunction(
    kernel,
    "previewSyncTrancheAccounting",
    ROYCO_DAY_KERNEL__PREVIEW_SYNC_TRANCHE_ACCOUNTING
  )
    .withArgs([uintI32(trancheType)])
    .returns([
      ethereum.Value.fromTuple(state.toTuple()), // 0: TrancheState
      ethereum.Value.fromTuple(claims.toTuple()), // 1: Claims
      ethereum.Value.fromUnsignedBigInt(totalTrancheShares), // 2: uint256
    ]);
}
