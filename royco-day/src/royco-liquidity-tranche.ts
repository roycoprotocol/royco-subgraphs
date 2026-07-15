import {
  Transfer as TransferEvent,
  Deposit as DepositEvent,
  Redeem as RedeemEvent,
  ProtocolFeeSharesMinted as ProtocolFeeSharesMintedEvent,
  MultiAssetDeposit as MultiAssetDepositEvent,
  MultiAssetRedeem as MultiAssetRedeemEvent,
} from "../generated/templates/RoycoLiquidityTranche/RoycoLiquidityTranche";

/**
 * STUB — no indexing logic yet.
 *
 * Liquidity tranche. Adds the two multi-asset events on top of the shared four.
 *
 * PREFER THESE EVENTS over calling the multi-asset previews
 * (previewDepositMultiAsset / previewRedeemMultiAsset, and the Kernel's
 * ltPreview* / previewAddLiquidity / previewRemoveLiquidity). Those ARE callable
 * — they're `nonpayable`, and graph codegen binds nonpayable functions, contrary
 * to a widely-repeated claim; only `payable` is excluded. But they are not pure
 * reads, so simulating them via eth_call is slower and semantically shakier than
 * reading the numbers the contract already emitted here. Use try_ if you must.
 * See CLAUDE.md §5.
 *
 * TODO — entities:
 *   handleMultiAssetDeposit -> params: (caller, receiver, stAssets, quoteAssets,
 *                              ltAssetsMinted, shares). Carries what
 *                              previewDepositMultiAsset would have returned.
 *   handleMultiAssetRedeem  -> params: (caller, receiver, owner, shares,
 *                              stClaims, quoteAssets). stClaims is the 5-field
 *                              Claims struct; note it sits at index 4, AFTER
 *                              `shares` — unlike Redeem, where it's at index 2.
 */
export function handleTransfer(event: TransferEvent): void {}

export function handleDeposit(event: DepositEvent): void {}

export function handleRedeem(event: RedeemEvent): void {}

export function handleProtocolFeeSharesMinted(
  event: ProtocolFeeSharesMintedEvent
): void {}

export function handleMultiAssetDeposit(event: MultiAssetDepositEvent): void {}

export function handleMultiAssetRedeem(event: MultiAssetRedeemEvent): void {}
