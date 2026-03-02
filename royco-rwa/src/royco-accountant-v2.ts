import { BigInt } from "@graphprotocol/graph-ts";
import {
  YDMUpdated as YDMUpdatedEvent,
  BetaUpdated as BetaUpdatedEvent,
  LLTVUpdated as LLTVUpdatedEvent,
  CoverageUpdated as CoverageUpdatedEvent,
  FixedTermDurationUpdated as FixedTermDurationUpdatedEvent,
  JTImpermanentLossReset as JTImpermanentLossResetEvent,
  JuniorTrancheDustToleranceUpdated as JuniorTrancheDustToleranceUpdatedEvent,
  JuniorTrancheProtocolFeeUpdated as JuniorTrancheProtocolFeeUpdatedEvent,
  SeniorTrancheDustToleranceUpdated as SeniorTrancheDustToleranceUpdatedEvent,
  SeniorTrancheProtocolFeeUpdated as SeniorTrancheProtocolFeeUpdatedEvent,
  YieldShareProtocolFeeUpdated as YieldShareProtocolFeeUpdatedEvent,
} from "../generated/templates/RoycoAccountant/RoycoAccountant";
import {
  AccountantMarketMap,
  MarketLossErasedHistorical,
  MarketState,
} from "../generated/schema";
import { generateAccountantMarketMapId, generateId } from "./utils";
import { CHAIN_ID } from "./constants";

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

export function handleJTImpermanentLossReset(
  event: JTImpermanentLossResetEvent
): void {
  const accountantAddress = event.address.toHexString();
  const marketState = getMarketStateByAccountant(accountantAddress);

  if (!marketState) {
    return;
  }

  let marketLossErasedHistoricalId = generateId(
    event.transaction.hash.toHexString(),
    event.logIndex
  )
    .concat("_")
    .concat(marketState.marketId);
  let marketLossErasedHistorical = new MarketLossErasedHistorical(
    marketLossErasedHistoricalId
  );
  marketLossErasedHistorical.chainId = CHAIN_ID;
  marketLossErasedHistorical.marketId = marketState.marketId;
  marketLossErasedHistorical.marketRefId = marketState.id;
  marketLossErasedHistorical.value = event.params.jtImpermanentLossErased;
  marketLossErasedHistorical.blockNumber = event.block.number;
  marketLossErasedHistorical.blockTimestamp = event.block.timestamp;
  marketLossErasedHistorical.transactionHash =
    event.transaction.hash.toHexString();
  marketLossErasedHistorical.logIndex = event.logIndex;
  marketLossErasedHistorical.createdAt = event.block.timestamp;
  marketLossErasedHistorical.save();
}

export function handleJuniorTrancheDustToleranceUpdated(
  event: JuniorTrancheDustToleranceUpdatedEvent
): void {
  const accountantAddress = event.address.toHexString();
  const marketState = getMarketStateByAccountant(accountantAddress);

  if (!marketState) {
    return;
  }

  marketState.juniorVaultDustTolerance = event.params.jtNAVDustTolerance;
  marketState.updatedAt = event.block.timestamp;
  marketState.save();
}

export function handleSeniorTrancheDustToleranceUpdated(
  event: SeniorTrancheDustToleranceUpdatedEvent
): void {
  const accountantAddress = event.address.toHexString();
  const marketState = getMarketStateByAccountant(accountantAddress);

  if (!marketState) {
    return;
  }

  marketState.seniorVaultDustTolerance = event.params.stNAVDustTolerance;
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

export function handleYieldShareProtocolFeeUpdated(
  event: YieldShareProtocolFeeUpdatedEvent
): void {
  const accountantAddress = event.address.toHexString();
  const marketState = getMarketStateByAccountant(accountantAddress);

  if (!marketState) {
    return;
  }

  marketState.yieldShareProtocolFeeWAD = event.params.yieldShareProtocolFeeWAD;
  marketState.updatedAt = event.block.timestamp;
  marketState.save();
}
