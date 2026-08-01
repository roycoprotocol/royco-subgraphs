import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { createMockedFunction } from "matchstick-as";
import { tuple, uint, uintI32, addr } from "../helpers/tuple";
import {
  ADDR_ACCOUNTANT,
  ADDR_ASSET,
  ADDR_BLACKLIST,
  ADDR_BPT_ORACLE,
  ADDR_FEE_RECIPIENT,
  ADDR_JUNIOR,
  ADDR_LIQUIDITY,
  ADDR_LPT_ASSET,
  ADDR_ORACLE,
  ADDR_QUOTE_ASSET,
  ADDR_SEQUENCER_FEED,
  ADDR_SENIOR,
  WAD,
} from "../helpers/constants";
import { Claims, TrancheState } from "../builders/shared";
import {
  ROYCO_DAY_KERNEL__GET_STATE,
  ROYCO_DAY_KERNEL__GET_BALANCER_V3_LIQUIDITY_VENUE_STATE,
  ROYCO_DAY_KERNEL__PREVIEW_SYNC_TRANCHE_ACCOUNTING_FOR,
} from "../generated/abi-signatures";

/**
 * RoycoDayKernel.getState() — a single 19-field tuple.
 *
 * The binding decodes the whole tuple, including the blacklist address.
 */
export class KernelState {
  seniorTranche: Address = ADDR_SENIOR; // 0
  stSelfLiquidationBonusWAD: BigInt = BigInt.zero(); // 1 uint64
  juniorTranche: Address = ADDR_JUNIOR; // 2
  liquidityProviderTranche: Address = ADDR_LIQUIDITY; // 3
  collateralAsset: Address = ADDR_ASSET; // 4
  oneWholeCollateralAsset: BigInt = WAD; // 5 uint64
  lptAsset: Address = ADDR_LPT_ASSET; // 6
  oneWholeLPTAsset: BigInt = WAD; // 7 uint64
  quoteAsset: Address = ADDR_QUOTE_ASSET; // 8
  accountant: Address = ADDR_ACCOUNTANT; // 9
  protocolFeeRecipient: Address = ADDR_FEE_RECIPIENT; // 10
  roycoBlacklist: Address = ADDR_BLACKLIST; // 11
  collateralAssetOracle: Address = ADDR_ORACLE; // 12
  stalenessThresholdSeconds: BigInt = BigInt.zero(); // 13 uint48 -> BigInt
  sequencerUptimeFeed: Address = ADDR_SEQUENCER_FEED; // 14
  gracePeriodSeconds: BigInt = BigInt.zero(); // 15 uint48 -> BigInt
  totalCollateralAssets: BigInt = BigInt.zero(); // 16
  totalLPTAssets: BigInt = BigInt.zero(); // 17
  lptOwnedSeniorTrancheShares: BigInt = BigInt.zero(); // 18

  toTuple(): ethereum.Tuple {
    return tuple([
      addr(this.seniorTranche),
      uint(this.stSelfLiquidationBonusWAD),
      addr(this.juniorTranche),
      addr(this.liquidityProviderTranche),
      addr(this.collateralAsset),
      uint(this.oneWholeCollateralAsset),
      addr(this.lptAsset),
      uint(this.oneWholeLPTAsset),
      addr(this.quoteAsset),
      addr(this.accountant),
      addr(this.protocolFeeRecipient),
      addr(this.roycoBlacklist),
      addr(this.collateralAssetOracle),
      uint(this.stalenessThresholdSeconds),
      addr(this.sequencerUptimeFeed),
      uint(this.gracePeriodSeconds),
      uint(this.totalCollateralAssets),
      uint(this.totalLPTAssets),
      uint(this.lptOwnedSeniorTrancheShares),
    ]);
  }
}

export function mockKernelGetState(kernel: Address, s: KernelState): void {
  createMockedFunction(kernel, "getState", ROYCO_DAY_KERNEL__GET_STATE)
    .withArgs([])
    .returns([ethereum.Value.fromTuple(s.toTuple())]);
}

export function mockBalancerV3LiquidityVenueState(
  kernel: Address,
  bptOracle: Address = ADDR_BPT_ORACLE,
  maxReinvestmentSlippageWAD: BigInt = BigInt.zero()
): void {
  createMockedFunction(
    kernel,
    "getBalancerV3LiquidityVenueState",
    ROYCO_DAY_KERNEL__GET_BALANCER_V3_LIQUIDITY_VENUE_STATE
  )
    .withArgs([])
    .returns([
      ethereum.Value.fromTuple(
        tuple([addr(bptOracle), uint(maxReinvestmentSlippageWAD)])
      ),
    ]);
}

export function mockKernelPaused(kernel: Address, paused: bool): void {
  createMockedFunction(kernel, "paused", "paused():(bool)")
    .withArgs([])
    .returns([ethereum.Value.fromBoolean(paused)]);
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
