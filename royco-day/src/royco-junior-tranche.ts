import {
  Transfer as TransferEvent,
  Deposit as DepositEvent,
  Redeem as RedeemEvent,
  ProtocolFeeSharesMinted as ProtocolFeeSharesMintedEvent,
} from "../generated/templates/RoycoJuniorTranche/RoycoJuniorTranche";

/**
 * STUB — no indexing logic yet.
 *
 * Junior tranche. Same four events as Senior minus LiquidityPremiumSharesMinted.
 * See src/royco-senior-tranche.ts for the entity TODOs — they are identical.
 *
 * Shared logic goes in src/handlers/ and is re-exported here; do not duplicate
 * it across the three tranche files.
 */
export function handleTransfer(event: TransferEvent): void {}

export function handleDeposit(event: DepositEvent): void {}

export function handleRedeem(event: RedeemEvent): void {}

export function handleProtocolFeeSharesMinted(
  event: ProtocolFeeSharesMintedEvent
): void {}
