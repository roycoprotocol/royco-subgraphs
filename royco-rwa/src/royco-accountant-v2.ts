import { Address, BigInt } from "@graphprotocol/graph-ts";
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
import { RoycoKernel } from "../generated/templates/RoycoKernel/RoycoKernel";
import { RoycoVaultTranche } from "../generated/templates/RoycoVaultTranche/RoycoVaultTranche";
import {
  AccountantMarketMap,
  MarketLossErasedHistorical,
  MarketState,
  TrancheAccountingState,
  TrancheAccountingStateHistorical,
  SharePriceMarketHistorical,
  SharePriceUnderlyingHistorical,
  VaultState,
} from "../generated/schema";
import {
  generateAccountantMarketMapId,
  generateId,
  generateTrancheAccountingStateId,
  generateTrancheAccountingStateHistoricalId,
  generateSharePriceMarketHistoricalId,
  generateSharePriceUnderlyingHistoricalId,
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

  // === Create SharePriceMarketHistorical via vault tranche convertToAssets ===
  const seniorVaultId = marketState.seniorVaultId;
  const seniorVaultState = VaultState.load(seniorVaultId);
  if (seniorVaultState) {
    const seniorOneUnit = BigInt.fromI32(10).pow(
      u8(seniorVaultState.decimals)
    );
    const seniorTranche = RoycoVaultTranche.bind(
      Address.fromString(marketState.seniorVaultAddress)
    );
    const stConvertResult = seniorTranche.try_convertToAssets(seniorOneUnit);
    if (!stConvertResult.reverted) {
      const stMarketHistoricalId = generateSharePriceMarketHistoricalId(
        marketState.seniorVaultAddress,
        event.transaction.hash.toHexString()
      );
      const stMarketHistorical = new SharePriceMarketHistorical(
        stMarketHistoricalId
      );
      stMarketHistorical.vaultId = seniorVaultId;
      stMarketHistorical.chainId = CHAIN_ID;
      stMarketHistorical.vaultAddress = marketState.seniorVaultAddress;
      stMarketHistorical.marketId = marketState.marketId;
      stMarketHistorical.stAssets = stConvertResult.value.stAssets;
      stMarketHistorical.jtAssets = stConvertResult.value.jtAssets;
      stMarketHistorical.nav = stConvertResult.value.nav;
      stMarketHistorical.blockNumber = event.block.number;
      stMarketHistorical.blockTimestamp = event.block.timestamp;
      stMarketHistorical.transactionHash =
        event.transaction.hash.toHexString();
      stMarketHistorical.logIndex = event.logIndex;
      stMarketHistorical.createdAt = event.block.timestamp;
      stMarketHistorical.save();
    }
  }

  const juniorVaultId = marketState.juniorVaultId;
  const juniorVaultState = VaultState.load(juniorVaultId);
  if (juniorVaultState) {
    const juniorOneUnit = BigInt.fromI32(10).pow(
      u8(juniorVaultState.decimals)
    );
    const juniorTranche = RoycoVaultTranche.bind(
      Address.fromString(marketState.juniorVaultAddress)
    );
    const jtConvertResult = juniorTranche.try_convertToAssets(juniorOneUnit);
    if (!jtConvertResult.reverted) {
      const jtMarketHistoricalId = generateSharePriceMarketHistoricalId(
        marketState.juniorVaultAddress,
        event.transaction.hash.toHexString()
      );
      const jtMarketHistorical = new SharePriceMarketHistorical(
        jtMarketHistoricalId
      );
      jtMarketHistorical.vaultId = juniorVaultId;
      jtMarketHistorical.chainId = CHAIN_ID;
      jtMarketHistorical.vaultAddress = marketState.juniorVaultAddress;
      jtMarketHistorical.marketId = marketState.marketId;
      jtMarketHistorical.stAssets = jtConvertResult.value.stAssets;
      jtMarketHistorical.jtAssets = jtConvertResult.value.jtAssets;
      jtMarketHistorical.nav = jtConvertResult.value.nav;
      jtMarketHistorical.blockNumber = event.block.number;
      jtMarketHistorical.blockTimestamp = event.block.timestamp;
      jtMarketHistorical.transactionHash =
        event.transaction.hash.toHexString();
      jtMarketHistorical.logIndex = event.logIndex;
      jtMarketHistorical.createdAt = event.block.timestamp;
      jtMarketHistorical.save();
    }
  }

  // === Create SharePriceUnderlyingHistorical via kernel convertTrancheUnitsToNAVUnits ===
  const kernelContract = RoycoKernel.bind(
    Address.fromString(marketState.kernelAddress)
  );
  const WAD_UNIT = BigInt.fromI32(10).pow(18);

  // Senior underlying
  if (seniorVaultState) {
    const stUnderlyingResult =
      kernelContract.try_stConvertTrancheUnitsToNAVUnits(WAD_UNIT);
    if (!stUnderlyingResult.reverted) {
      const seniorCompositeAddress = seniorVaultState.depositTokenAddress
        .concat("_")
        .concat(marketState.seniorVaultAddress);
      const stUnderlyingHistoricalId = generateSharePriceUnderlyingHistoricalId(
        seniorCompositeAddress,
        event.transaction.hash.toHexString()
      );
      const stUnderlyingHistorical = new SharePriceUnderlyingHistorical(
        stUnderlyingHistoricalId
      );
      stUnderlyingHistorical.vaultId = marketState.seniorVaultId;
      stUnderlyingHistorical.chainId = CHAIN_ID;
      stUnderlyingHistorical.vaultAddress = seniorCompositeAddress;
      stUnderlyingHistorical.underlyingAddress =
        seniorVaultState.depositTokenAddress;
      stUnderlyingHistorical.marketId = marketState.marketId;
      stUnderlyingHistorical.nav = stUnderlyingResult.value;
      stUnderlyingHistorical.blockNumber = event.block.number;
      stUnderlyingHistorical.blockTimestamp = event.block.timestamp;
      stUnderlyingHistorical.transactionHash =
        event.transaction.hash.toHexString();
      stUnderlyingHistorical.logIndex = event.logIndex;
      stUnderlyingHistorical.createdAt = event.block.timestamp;
      stUnderlyingHistorical.save();
    }
  }

  // Junior underlying
  if (juniorVaultState) {
    const jtUnderlyingResult =
      kernelContract.try_jtConvertTrancheUnitsToNAVUnits(WAD_UNIT);
    if (!jtUnderlyingResult.reverted) {
      const juniorCompositeAddress = juniorVaultState.depositTokenAddress
        .concat("_")
        .concat(marketState.juniorVaultAddress);
      const jtUnderlyingHistoricalId = generateSharePriceUnderlyingHistoricalId(
        juniorCompositeAddress,
        event.transaction.hash.toHexString()
      );
      const jtUnderlyingHistorical = new SharePriceUnderlyingHistorical(
        jtUnderlyingHistoricalId
      );
      jtUnderlyingHistorical.vaultId = marketState.juniorVaultId;
      jtUnderlyingHistorical.chainId = CHAIN_ID;
      jtUnderlyingHistorical.vaultAddress = juniorCompositeAddress;
      jtUnderlyingHistorical.underlyingAddress =
        juniorVaultState.depositTokenAddress;
      jtUnderlyingHistorical.marketId = marketState.marketId;
      jtUnderlyingHistorical.nav = jtUnderlyingResult.value;
      jtUnderlyingHistorical.blockNumber = event.block.number;
      jtUnderlyingHistorical.blockTimestamp = event.block.timestamp;
      jtUnderlyingHistorical.transactionHash =
        event.transaction.hash.toHexString();
      jtUnderlyingHistorical.logIndex = event.logIndex;
      jtUnderlyingHistorical.createdAt = event.block.timestamp;
      jtUnderlyingHistorical.save();
    }
  }
}
