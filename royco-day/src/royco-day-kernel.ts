import {
  ProtocolFeeRecipientUpdated as ProtocolFeeRecipientUpdatedEvent,
  SeniorTrancheSelfLiquidationBonusUpdated as SeniorTrancheSelfLiquidationBonusUpdatedEvent,
} from "../generated/templates/RoycoDayKernel/RoycoDayKernel";

/**
 * STUB — no indexing logic yet.
 *
 * Both handlers update DayMarketState. Unlike the accountant, the kernel address
 * IS the marketId, so the lookup is a direct
 * generateMarketId(event.address.toHexString()).
 *
 * TODO:
 *   handleProtocolFeeRecipientUpdated             -> protocolFeeRecipientAddress
 *   handleSeniorTrancheSelfLiquidationBonusUpdated -> seniorTrancheSelfLiquidationBonusWAD (uint64 -> BigInt, direct)
 *
 * Not currently indexed (no schema field): RoycoBlacklistUpdated,
 * LiquidityPremiumReinvested, LiquidityPremiumReinvestmentFailed. Add the
 * schema field and the handler together if they're ever needed.
 */
export function handleProtocolFeeRecipientUpdated(
  event: ProtocolFeeRecipientUpdatedEvent
): void {}

export function handleSeniorTrancheSelfLiquidationBonusUpdated(
  event: SeniorTrancheSelfLiquidationBonusUpdatedEvent
): void {}
