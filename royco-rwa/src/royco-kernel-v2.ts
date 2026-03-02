import {
  ProtocolFeeRecipientUpdated as ProtocolFeeRecipientUpdatedEvent,
  SeniorTrancheSelfLiquidationBonusUpdated as SeniorTrancheSelfLiquidationBonusUpdatedEvent,
} from "../generated/templates/RoycoKernel/RoycoKernel";
import { KernelMarketMap, MarketState } from "../generated/schema";
import { generateKernelMarketMapId } from "./utils";

function getMarketStateByKernel(kernelAddress: string): MarketState | null {
  const mapId = generateKernelMarketMapId(kernelAddress);
  const kernelMarketMap = KernelMarketMap.load(mapId);

  if (!kernelMarketMap) {
    return null;
  }

  return MarketState.load(kernelMarketMap.marketStateId);
}

export function handleProtocolFeeRecipientUpdated(
  event: ProtocolFeeRecipientUpdatedEvent
): void {
  const kernelAddress = event.address.toHexString();
  const marketState = getMarketStateByKernel(kernelAddress);

  if (!marketState) {
    return;
  }

  marketState.protocolFeeRecipient =
    event.params.protocolFeeRecipient.toHexString();
  marketState.updatedAt = event.block.timestamp;
  marketState.save();
}

export function handleSeniorTrancheSelfLiquidationBonusUpdated(
  event: SeniorTrancheSelfLiquidationBonusUpdatedEvent
): void {
  const kernelAddress = event.address.toHexString();
  const marketState = getMarketStateByKernel(kernelAddress);

  if (!marketState) {
    return;
  }

  marketState.seniorSelfLiquidationBonusWAD =
    event.params.stSelfLiquidationBonusWAD;
  marketState.updatedAt = event.block.timestamp;
  marketState.save();
}
