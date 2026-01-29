import { BigInt } from "@graphprotocol/graph-ts";
import {
  BetaUpdated as BetaUpdatedEvent,
  CoverageUpdated as CoverageUpdatedEvent,
  DustToleranceUpdated as DustToleranceUpdatedEvent,
  FixedTermDurationUpdated as FixedTermDurationUpdatedEvent,
  JTCoverageImpermanentLossErased as JTCoverageImpermanentLossErasedEvent,
  JuniorTrancheProtocolFeeUpdated as JuniorTrancheProtocolFeeUpdatedEvent,
  LLTVUpdated as LLTVUpdatedEvent,
  SeniorTrancheProtocolFeeUpdated as SeniorTrancheProtocolFeeUpdatedEvent,
  YDMUpdated as YDMUpdatedEvent,
} from "../generated/templates/RoycoAccountant/RoycoAccountant";
import { AccountantMarketMap, MarketState } from "../generated/schema";
import { generateAccountantMarketMapId } from "./utils";

function getMarketStateByAccountant(
  accountantAddress: string
): MarketState | null {
  const mapId = generateAccountantMarketMapId(accountantAddress);
  const accountantMarketMap = AccountantMarketMap.load(mapId);

  if (!accountantMarketMap) {
    return null;
  }

  return MarketState.load(accountantMarketMap.marketStateId);
}

export function handleBetaUpdated(event: BetaUpdatedEvent): void {
  const accountantAddress = event.address.toHexString();
  const marketState = getMarketStateByAccountant(accountantAddress);

  if (!marketState) {
    return;
  }

  marketState.betaWAD = event.params.betaWAD;
  marketState.updatedAt = event.block.timestamp;
  marketState.save();
}

export function handleCoverageUpdated(event: CoverageUpdatedEvent): void {
  const accountantAddress = event.address.toHexString();
  const marketState = getMarketStateByAccountant(accountantAddress);

  if (!marketState) {
    return;
  }

  marketState.coverageWAD = event.params.coverageWAD;
  marketState.updatedAt = event.block.timestamp;
  marketState.save();
}

export function handleLLTVUpdated(event: LLTVUpdatedEvent): void {
  const accountantAddress = event.address.toHexString();
  const marketState = getMarketStateByAccountant(accountantAddress);

  if (!marketState) {
    return;
  }

  marketState.lltvWAD = event.params.lltvWAD;
  marketState.updatedAt = event.block.timestamp;
  marketState.save();
}

export function handleYDMUpdated(event: YDMUpdatedEvent): void {
  const accountantAddress = event.address.toHexString();
  const marketState = getMarketStateByAccountant(accountantAddress);

  if (!marketState) {
    return;
  }

  marketState.ydmAddress = event.params.ydm.toHexString();
  marketState.updatedAt = event.block.timestamp;
  marketState.save();
}

export function handleDustToleranceUpdated(
  event: DustToleranceUpdatedEvent
): void {
  const accountantAddress = event.address.toHexString();
  const marketState = getMarketStateByAccountant(accountantAddress);

  if (!marketState) {
    return;
  }

  marketState.dustTolerance = event.params.dustTolerance;
  marketState.updatedAt = event.block.timestamp;
  marketState.save();
}

export function handleFixedTermDurationUpdated(
  event: FixedTermDurationUpdatedEvent
): void {
  const accountantAddress = event.address.toHexString();
  const marketState = getMarketStateByAccountant(accountantAddress);

  if (!marketState) {
    return;
  }

  marketState.fixedTermDurationSeconds = BigInt.fromI32(
    event.params.fixedTermDurationSeconds
  );
  marketState.updatedAt = event.block.timestamp;
  marketState.save();
}

export function handleJuniorTrancheProtocolFeeUpdated(
  event: JuniorTrancheProtocolFeeUpdatedEvent
): void {
  const accountantAddress = event.address.toHexString();
  const marketState = getMarketStateByAccountant(accountantAddress);

  if (!marketState) {
    return;
  }

  marketState.juniorVaultProtocolFeeWAD = event.params.jtProtocolFeeWAD;
  marketState.updatedAt = event.block.timestamp;
  marketState.save();
}

export function handleSeniorTrancheProtocolFeeUpdated(
  event: SeniorTrancheProtocolFeeUpdatedEvent
): void {
  const accountantAddress = event.address.toHexString();
  const marketState = getMarketStateByAccountant(accountantAddress);

  if (!marketState) {
    return;
  }

  marketState.seniorVaultProtocolFeeWAD = event.params.stProtocolFeeWAD;
  marketState.updatedAt = event.block.timestamp;
  marketState.save();
}
