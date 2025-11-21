import { BigInt } from "@graphprotocol/graph-ts";
import { MetricLatest, GlobalTokenTransfer } from "../../../generated/schema";
import { METRIC_TRANSFERS } from "../../constants";
import { generateMetricLatestId } from "../../utils";
import {
  addMetricHistorical,
  updateMetricHistoricalDaily,
  updateMetricHistoricalHourly,
} from "./update-period";

export function updateMetricTransfers(
  transfer: GlobalTokenTransfer
): MetricLatest {
  // Update latest metric
  let metricId = generateMetricLatestId(
    transfer.vaultAddress,
    METRIC_TRANSFERS
  );
  let metricLatest = MetricLatest.load(metricId);
  if (!metricLatest) {
    metricLatest = new MetricLatest(metricId);
    metricLatest.vaultId = transfer.vaultId;
    metricLatest.chainId = transfer.chainId;
    metricLatest.vaultAddress = transfer.vaultAddress;
    metricLatest.category = METRIC_TRANSFERS;
    metricLatest.value = BigInt.fromI32(0);
    metricLatest.blockTimestamp = transfer.blockTimestamp;
    metricLatest.createdAt = transfer.blockTimestamp;
  }
  metricLatest.value = metricLatest.value.plus(BigInt.fromI32(1));
  metricLatest.blockTimestamp = transfer.blockTimestamp;
  metricLatest.updatedAt = transfer.blockTimestamp;
  metricLatest.save();

  // Add historical metric
  let metricHistorical = addMetricHistorical(transfer, metricLatest);

  // Update hourly and daily metrics
  updateMetricHistoricalHourly(metricHistorical);
  updateMetricHistoricalDaily(metricHistorical);

  return metricLatest;
}
