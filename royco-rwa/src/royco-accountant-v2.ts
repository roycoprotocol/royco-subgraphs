import { BigInt } from "@graphprotocol/graph-ts";
import {
  YDMUpdated as YDMUpdatedEvent,
  BetaUpdated as BetaUpdatedEvent,
  CoverageUpdated as CoverageUpdatedEvent,
  FixedTermDurationUpdated as FixedTermDurationUpdatedEvent,
  JTImpermanentLossReset as JTImpermanentLossResetEvent,
  JuniorTrancheDustToleranceUpdated as JuniorTrancheDustToleranceUpdatedEvent,
  JuniorTrancheProtocolFeeUpdated as JuniorTrancheProtocolFeeUpdatedEvent,
  SeniorTrancheDustToleranceUpdated as SeniorTrancheDustToleranceUpdatedEvent,
  SeniorTrancheProtocolFeeUpdated as SeniorTrancheProtocolFeeUpdatedEvent,
  YieldShareProtocolFeeUpdated as YieldShareProtocolFeeUpdatedEvent,
  TrancheAccountingSynced as TrancheAccountingSyncedEvent,
} from "../generated/templates/RoycoAccountant/RoycoAccountant";
import {
  AccountantMarketMap,
  MarketLossErasedHistorical,
  MarketState,
  TrancheAccountingState,
  TrancheAccountingStateHistorical,
  SharePriceIndexedState,
  SharePriceIndexedStateHistorical,
  VaultState,
} from "../generated/schema";
import {
  generateAccountantMarketMapId,
  generateId,
  generateTrancheAccountingStateId,
  generateTrancheAccountingStateHistoricalId,
  generateSharePriceIndexedStateId,
  generateSharePriceIndexedStateHistoricalId,
  generateVaultId,
} from "./utils";
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

export function handleTrancheAccountingSynced(
  event: TrancheAccountingSyncedEvent
): void {
  const accountantAddress = event.address.toHexString();
  const marketState = getMarketStateByAccountant(accountantAddress);

  if (!marketState) {
    return;
  }

  const state = event.params.resultingState;
  const WAD = BigInt.fromI32(10).pow(18);

  // === Check if TrancheAccountingStateHistorical exists ===
  const trancheAccountingStateHistoricalIdCheck =
    generateTrancheAccountingStateHistoricalId(
      marketState.marketId,
      event.transaction.hash.toHexString()
    );
  const trancheAccountingStateHistoricalCheck =
    TrancheAccountingStateHistorical.load(
      trancheAccountingStateHistoricalIdCheck
    );
  if (trancheAccountingStateHistoricalCheck) {
    // If it exists, it means it's a post accouting sync event
    // so we don't need to consider it
    return;
  }
  // xxx Check if TrancheAccountingStateHistorical exists ===

  // === Update TrancheAccountingState ===
  const trancheAccountingStateId = generateTrancheAccountingStateId(
    marketState.marketId
  );
  let trancheAccountingState = TrancheAccountingState.load(
    trancheAccountingStateId
  );
  if (!trancheAccountingState) {
    trancheAccountingState = new TrancheAccountingState(
      trancheAccountingStateId
    );
    trancheAccountingState.chainId = CHAIN_ID;
    trancheAccountingState.marketId = marketState.marketId;
    trancheAccountingState.createdAt = event.block.timestamp;
  }
  trancheAccountingState.marketState = state.marketState;
  trancheAccountingState.stRawNAV = state.stRawNAV;
  trancheAccountingState.jtRawNAV = state.jtRawNAV;
  trancheAccountingState.stEffectiveNAV = state.stEffectiveNAV;
  trancheAccountingState.jtEffectiveNAV = state.jtEffectiveNAV;
  trancheAccountingState.stImpermanentLoss = state.stImpermanentLoss;
  trancheAccountingState.jtImpermanentLoss = state.jtImpermanentLoss;
  trancheAccountingState.stProtocolFeeAccrued = state.stProtocolFeeAccrued;
  trancheAccountingState.jtProtocolFeeAccrued = state.jtProtocolFeeAccrued;
  trancheAccountingState.utilizationWAD = state.utilizationWAD;
  trancheAccountingState.fixedTermEndTimestamp = state.fixedTermEndTimestamp;
  trancheAccountingState.blockNumber = event.block.number;
  trancheAccountingState.blockTimestamp = event.block.timestamp;
  trancheAccountingState.transactionHash = event.transaction.hash.toHexString();
  trancheAccountingState.logIndex = event.logIndex;
  trancheAccountingState.updatedAt = event.block.timestamp;
  trancheAccountingState.save();

  // === Create TrancheAccountingStateHistorical ===
  const trancheAccountingStateHistoricalId =
    generateTrancheAccountingStateHistoricalId(
      marketState.marketId,
      event.transaction.hash.toHexString()
    );
  const trancheAccountingStateHistorical = new TrancheAccountingStateHistorical(
    trancheAccountingStateHistoricalId
  );
  trancheAccountingStateHistorical.chainId = CHAIN_ID;
  trancheAccountingStateHistorical.marketId = marketState.marketId;
  trancheAccountingStateHistorical.marketState = state.marketState;
  trancheAccountingStateHistorical.stRawNAV = state.stRawNAV;
  trancheAccountingStateHistorical.jtRawNAV = state.jtRawNAV;
  trancheAccountingStateHistorical.stEffectiveNAV = state.stEffectiveNAV;
  trancheAccountingStateHistorical.jtEffectiveNAV = state.jtEffectiveNAV;
  trancheAccountingStateHistorical.stImpermanentLoss = state.stImpermanentLoss;
  trancheAccountingStateHistorical.jtImpermanentLoss = state.jtImpermanentLoss;
  trancheAccountingStateHistorical.stProtocolFeeAccrued =
    state.stProtocolFeeAccrued;
  trancheAccountingStateHistorical.jtProtocolFeeAccrued =
    state.jtProtocolFeeAccrued;
  trancheAccountingStateHistorical.utilizationWAD = state.utilizationWAD;
  trancheAccountingStateHistorical.fixedTermEndTimestamp =
    state.fixedTermEndTimestamp;
  trancheAccountingStateHistorical.blockNumber = event.block.number;
  trancheAccountingStateHistorical.blockTimestamp = event.block.timestamp;
  trancheAccountingStateHistorical.transactionHash =
    event.transaction.hash.toHexString();
  trancheAccountingStateHistorical.logIndex = event.logIndex;
  trancheAccountingStateHistorical.createdAt = event.block.timestamp;
  trancheAccountingStateHistorical.save();

  // === Calculate and store share prices ===

  // Senior vault share price
  const seniorVaultId = marketState.seniorVaultId;
  const seniorVaultState = VaultState.load(seniorVaultId);
  if (seniorVaultState && seniorVaultState.totalSupply.gt(BigInt.zero())) {
    const seniorSharePrice = state.stEffectiveNAV
      .times(WAD)
      .div(seniorVaultState.totalSupply);

    // Update SharePriceIndexedState (mutable)
    const seniorSharePriceStateId = generateSharePriceIndexedStateId(
      marketState.seniorVaultAddress
    );
    let seniorSharePriceState = SharePriceIndexedState.load(
      seniorSharePriceStateId
    );
    if (!seniorSharePriceState) {
      seniorSharePriceState = new SharePriceIndexedState(
        seniorSharePriceStateId
      );
      seniorSharePriceState.vaultId = seniorVaultId;
      seniorSharePriceState.chainId = CHAIN_ID;
      seniorSharePriceState.vaultAddress = marketState.seniorVaultAddress;
      seniorSharePriceState.createdAt = event.block.timestamp;
    }
    seniorSharePriceState.value = seniorSharePrice;
    seniorSharePriceState.blockNumber = event.block.number;
    seniorSharePriceState.blockTimestamp = event.block.timestamp;
    seniorSharePriceState.transactionHash =
      event.transaction.hash.toHexString();
    seniorSharePriceState.logIndex = event.logIndex;
    seniorSharePriceState.updatedAt = event.block.timestamp;
    seniorSharePriceState.save();

    // Create SharePriceIndexedStateHistorical (immutable)
    const seniorSharePriceHistoricalId =
      generateSharePriceIndexedStateHistoricalId(
        marketState.seniorVaultAddress,
        event.transaction.hash.toHexString()
      );
    const seniorSharePriceHistorical = new SharePriceIndexedStateHistorical(
      seniorSharePriceHistoricalId
    );
    seniorSharePriceHistorical.vaultId = seniorVaultId;
    seniorSharePriceHistorical.chainId = CHAIN_ID;
    seniorSharePriceHistorical.vaultAddress = marketState.seniorVaultAddress;
    seniorSharePriceHistorical.value = seniorSharePrice;
    seniorSharePriceHistorical.blockNumber = event.block.number;
    seniorSharePriceHistorical.blockTimestamp = event.block.timestamp;
    seniorSharePriceHistorical.transactionHash =
      event.transaction.hash.toHexString();
    seniorSharePriceHistorical.logIndex = event.logIndex;
    seniorSharePriceHistorical.createdAt = event.block.timestamp;
    seniorSharePriceHistorical.save();
  }

  // Junior vault share price
  const juniorVaultId = marketState.juniorVaultId;
  const juniorVaultState = VaultState.load(juniorVaultId);
  if (juniorVaultState && juniorVaultState.totalSupply.gt(BigInt.zero())) {
    const juniorSharePrice = state.jtEffectiveNAV
      .times(WAD)
      .div(juniorVaultState.totalSupply);

    // Update SharePriceIndexedState (mutable)
    const juniorSharePriceStateId = generateSharePriceIndexedStateId(
      marketState.juniorVaultAddress
    );
    let juniorSharePriceState = SharePriceIndexedState.load(
      juniorSharePriceStateId
    );
    if (!juniorSharePriceState) {
      juniorSharePriceState = new SharePriceIndexedState(
        juniorSharePriceStateId
      );
      juniorSharePriceState.vaultId = juniorVaultId;
      juniorSharePriceState.chainId = CHAIN_ID;
      juniorSharePriceState.vaultAddress = marketState.juniorVaultAddress;
      juniorSharePriceState.createdAt = event.block.timestamp;
    }
    juniorSharePriceState.value = juniorSharePrice;
    juniorSharePriceState.blockNumber = event.block.number;
    juniorSharePriceState.blockTimestamp = event.block.timestamp;
    juniorSharePriceState.transactionHash =
      event.transaction.hash.toHexString();
    juniorSharePriceState.logIndex = event.logIndex;
    juniorSharePriceState.updatedAt = event.block.timestamp;
    juniorSharePriceState.save();

    // Create SharePriceIndexedStateHistorical (immutable)
    const juniorSharePriceHistoricalId =
      generateSharePriceIndexedStateHistoricalId(
        marketState.juniorVaultAddress,
        event.transaction.hash.toHexString()
      );
    const juniorSharePriceHistorical = new SharePriceIndexedStateHistorical(
      juniorSharePriceHistoricalId
    );
    juniorSharePriceHistorical.vaultId = juniorVaultId;
    juniorSharePriceHistorical.chainId = CHAIN_ID;
    juniorSharePriceHistorical.vaultAddress = marketState.juniorVaultAddress;
    juniorSharePriceHistorical.value = juniorSharePrice;
    juniorSharePriceHistorical.blockNumber = event.block.number;
    juniorSharePriceHistorical.blockTimestamp = event.block.timestamp;
    juniorSharePriceHistorical.transactionHash =
      event.transaction.hash.toHexString();
    juniorSharePriceHistorical.logIndex = event.logIndex;
    juniorSharePriceHistorical.createdAt = event.block.timestamp;
    juniorSharePriceHistorical.save();
  }
}
