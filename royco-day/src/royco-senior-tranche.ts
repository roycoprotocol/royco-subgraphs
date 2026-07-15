import {
  Transfer as TransferEvent,
  Deposit as DepositEvent,
  Redeem as RedeemEvent,
  ProtocolFeeSharesMinted as ProtocolFeeSharesMintedEvent,
  LiquidityPremiumSharesMinted as LiquidityPremiumSharesMintedEvent,
} from "../generated/templates/RoycoSeniorTranche/RoycoSeniorTranche";

/**
 * STUB — no indexing logic yet.
 *
 * Senior tranche. Shares Transfer/Deposit/Redeem/ProtocolFeeSharesMinted with
 * Junior and Liquidity, and adds LiquidityPremiumSharesMinted (senior-only).
 *
 * codegen emits a DISTINCT class per template even where the ABI event shape is
 * identical, so shared logic belongs in src/handlers/ and gets re-exported from
 * each entry file (see royco-rwa/src/royco-vault-tranche-v2.ts:28 for the house
 * idiom). Keep these thin.
 *
 * TODO — entities each should write:
 *   handleTransfer   -> GlobalTokenTransfer, GlobalTokenActivity,
 *                       DayPositionState(+Historical), DayVaultState.sharesTotalSupply
 *                       Mint = from ZERO_ADDRESS; burn = to ZERO_ADDRESS.
 *   handleDeposit    -> GlobalTokenTransfer (CATEGORY_ASSETS/SUB_CATEGORY_DEPOSIT)
 *   handleRedeem     -> event.params.claims is the 5-field Claims struct:
 *                       stAssets->seniorTrancheAssets, jtAssets->juniorTrancheAssets,
 *                       ltAssets->liquidityTrancheAssets, stShares->seniorTrancheShares,
 *                       nav->nav.  See CLAUDE.md §6.
 *   handleProtocolFeeSharesMinted        -> DayFeeState majorType=FEES_MAJOR_TYPE_PROTOCOL
 *   handleLiquidityPremiumSharesMinted   -> DayFeeState majorType=FEES_MAJOR_TYPE_LIQUIDITY_PREMIUM
 *
 * The two fee handlers write the SAME (vault, account) pair when the protocol
 * fee recipient is also an LP holder — that's exactly why majorType/minorType
 * are part of generateFeeStateId().
 */
export function handleTransfer(event: TransferEvent): void {}

export function handleDeposit(event: DepositEvent): void {}

export function handleRedeem(event: RedeemEvent): void {}

export function handleProtocolFeeSharesMinted(
  event: ProtocolFeeSharesMintedEvent
): void {}

export function handleLiquidityPremiumSharesMinted(
  event: LiquidityPremiumSharesMintedEvent
): void {}
