import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { createMockedFunction } from "matchstick-as";
import { tuple, uint, uintI32, addr } from "../helpers/tuple";
import {
  ADDR_BLACKLIST,
  ADDR_FEE_RECIPIENT,
  ADDR_ORACLE,
  ADDR_SEQUENCER_FEED,
} from "../helpers/constants";
import { Claims, TrancheState } from "../builders/shared";
import {
  ROYCO_DAY_KERNEL__GET_STATE,
  ROYCO_DAY_KERNEL__PREVIEW_SYNC_TRANCHE_ACCOUNTING_FOR,
} from "../generated/abi-signatures";

/**
 * RoycoDayKernel.getState() — a single 10-field tuple (was 7 in v1).
 *
 * Note `roycoBlacklist` (index 6) has no schema field today; it's mocked anyway
 * because the binding decodes the whole tuple regardless.
 */
export class KernelState {
  protocolFeeRecipient: Address = ADDR_FEE_RECIPIENT; // 0
  stSelfLiquidationBonusWAD: BigInt = BigInt.zero(); // 1 uint64
  totalCollateralAssets: BigInt = BigInt.zero(); // 2
  totalLPTAssets: BigInt = BigInt.zero(); // 3
  lptOwnedSeniorTrancheShares: BigInt = BigInt.zero(); // 4
  roycoBlacklist: Address = ADDR_BLACKLIST; // 5
  collateralAssetOracle: Address = ADDR_ORACLE; // 6
  stalenessThresholdSeconds: BigInt = BigInt.zero(); // 7 uint48 -> BigInt
  sequencerUptimeFeed: Address = ADDR_SEQUENCER_FEED; // 8
  gracePeriodSeconds: BigInt = BigInt.zero(); // 9 uint48 -> BigInt

  toTuple(): ethereum.Tuple {
    return tuple([
      addr(this.protocolFeeRecipient),
      uint(this.stSelfLiquidationBonusWAD),
      uint(this.totalCollateralAssets),
      uint(this.totalLPTAssets),
      uint(this.lptOwnedSeniorTrancheShares),
      addr(this.roycoBlacklist),
      addr(this.collateralAssetOracle),
      uint(this.stalenessThresholdSeconds),
      addr(this.sequencerUptimeFeed),
      uint(this.gracePeriodSeconds),
    ]);
  }
}

export function mockKernelGetState(kernel: Address, s: KernelState): void {
  createMockedFunction(kernel, "getState", ROYCO_DAY_KERNEL__GET_STATE)
    .withArgs([])
    .returns([ethereum.Value.fromTuple(s.toTuple())]);
}

/**
 * RoycoDayKernel.previewSyncTrancheAccountingFor(uint8 trancheType)
 *   -> (SyncedAccountingState state, AssetClaims claims, uint256 totalTrancheShares)
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
    "previewSyncTrancheAccountingFor",
    ROYCO_DAY_KERNEL__PREVIEW_SYNC_TRANCHE_ACCOUNTING_FOR
  )
    .withArgs([uintI32(trancheType)])
    .returns([
      ethereum.Value.fromTuple(state.toTuple()), // 0: TrancheState
      ethereum.Value.fromTuple(claims.toTuple()), // 1: Claims
      ethereum.Value.fromUnsignedBigInt(totalTrancheShares), // 2: uint256
    ]);
}
