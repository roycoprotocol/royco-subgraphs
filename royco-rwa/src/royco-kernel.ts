import { BigInt } from "@graphprotocol/graph-ts";
import {
  ProtocolFeeRecipientUpdated as ProtocolFeeRecipientUpdatedEvent,
  JuniorTrancheRedemptionDelayUpdated as JuniorTrancheRedemptionDelayUpdatedEvent,
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

export function handleJuniorTrancheRedemptionDelayUpdated(
  event: JuniorTrancheRedemptionDelayUpdatedEvent
): void {
  const kernelAddress = event.address.toHexString();
  const marketState = getMarketStateByKernel(kernelAddress);

  if (!marketState) {
    return;
  }

  marketState.juniorTrancheRedemptionDelay = BigInt.fromI32(
    event.params.jtRedemptionDelayInSeconds
  );
  marketState.updatedAt = event.block.timestamp;
  marketState.save();
}
