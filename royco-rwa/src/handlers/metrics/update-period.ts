import {
  GlobalTokenTransfer,
  MetricHistorical,
  MetricHistoricalDaily,
  MetricHistoricalHourly,
  MetricLatest,
} from "../../../generated/schema";
import {
  generateMetricHistoricalId,
  generateMetricHistoricalPeriodId,
  getDailyTimestamp,
  getHourlyTimestamp,
} from "../../utils";

export function addMetricHistorical(
  transfer: GlobalTokenTransfer,
  metricLatest: MetricLatest
): MetricHistorical {
  let metricHistoricalId = generateMetricHistoricalId(
    transfer.transactionHash,
    transfer.logIndex,
    transfer.vaultAddress,
    metricLatest.category
  );
  let metricHistorical = new MetricHistorical(metricHistoricalId);
  metricHistorical.vaultId = metricLatest.vaultId;
  metricHistorical.chainId = metricLatest.chainId;
  metricHistorical.vaultAddress = metricLatest.vaultAddress;
  metricHistorical.category = metricLatest.category;
  metricHistorical.value = metricLatest.value;
  metricHistorical.blockNumber = transfer.blockNumber;
  metricHistorical.blockTimestamp = transfer.blockTimestamp;
  metricHistorical.transactionHash = transfer.transactionHash;
  metricHistorical.logIndex = transfer.logIndex;
  metricHistorical.save();

  return metricHistorical;
}

export function updateMetricHistoricalHourly(
  metricHistorical: MetricHistorical
): void {
  let periodTimestamp = getHourlyTimestamp(metricHistorical.blockTimestamp);
  let metricHistoricalPeriodId = generateMetricHistoricalPeriodId(
    metricHistorical.vaultAddress,
    metricHistorical.category,
    periodTimestamp
  );
  let metricHistoricalPeriod = MetricHistoricalHourly.load(
    metricHistoricalPeriodId
  );
  if (!metricHistoricalPeriod) {
    metricHistoricalPeriod = new MetricHistoricalHourly(
      metricHistoricalPeriodId
    );
    metricHistoricalPeriod.vaultId = metricHistorical.vaultId;
    metricHistoricalPeriod.chainId = metricHistorical.chainId;
    metricHistoricalPeriod.vaultAddress = metricHistorical.vaultAddress;
    metricHistoricalPeriod.category = metricHistorical.category;
    metricHistoricalPeriod.createdAt = metricHistorical.blockTimestamp;
  }
  metricHistoricalPeriod.value = metricHistorical.value;
  metricHistoricalPeriod.blockTimestamp = periodTimestamp;
  metricHistoricalPeriod.updatedAt = metricHistorical.blockTimestamp;
  metricHistoricalPeriod.save();
}

export function updateMetricHistoricalDaily(
  metricHistorical: MetricHistorical
): void {
  let periodTimestamp = getDailyTimestamp(metricHistorical.blockTimestamp);
  let metricHistoricalPeriodId = generateMetricHistoricalPeriodId(
    metricHistorical.vaultAddress,
    metricHistorical.category,
    periodTimestamp
  );
  let metricHistoricalPeriod = MetricHistoricalDaily.load(
    metricHistoricalPeriodId
  );
  if (!metricHistoricalPeriod) {
    metricHistoricalPeriod = new MetricHistoricalDaily(
      metricHistoricalPeriodId
    );
    metricHistoricalPeriod.vaultId = metricHistorical.vaultId;
    metricHistoricalPeriod.chainId = metricHistorical.chainId;
    metricHistoricalPeriod.vaultAddress = metricHistorical.vaultAddress;
    metricHistoricalPeriod.category = metricHistorical.category;
    metricHistoricalPeriod.createdAt = metricHistorical.blockTimestamp;
  }
  metricHistoricalPeriod.value = metricHistorical.value;
  metricHistoricalPeriod.blockTimestamp = periodTimestamp;
  metricHistoricalPeriod.updatedAt = metricHistorical.blockTimestamp;
  metricHistoricalPeriod.save();
}
