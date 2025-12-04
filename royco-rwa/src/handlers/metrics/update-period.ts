import {
  GlobalTokenTransfer,
  MetricHistorical,
  MetricLatest,
} from "../../../generated/schema";
import { generateMetricHistoricalId } from "../../utils";

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
  metricHistorical.createdAt = transfer.blockTimestamp;
  metricHistorical.save();

  return metricHistorical;
}
