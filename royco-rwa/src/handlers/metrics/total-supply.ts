import { BigInt } from "@graphprotocol/graph-ts";
import { MetricLatest, GlobalTokenTransfer } from "../../../generated/schema";
import {
  CHAIN_ID,
  SUB_CATEGORY_BURN,
  METRIC_TOTAL_SUPPLY,
} from "../../constants";
import { generateMetricLatestId, generateVaultId } from "../../utils";
import { addMetricHistorical } from "./update-period";

export function updateMetricTotalSupply(
  transfer: GlobalTokenTransfer
): MetricLatest {
  let multiplier = BigInt.fromI32(1);
  if (transfer.subCategory == SUB_CATEGORY_BURN) {
    multiplier = BigInt.fromI32(-1);
  }

  // Update latest metric
  let metricId = generateMetricLatestId(
    transfer.vaultAddress,
    METRIC_TOTAL_SUPPLY
  );
  let metricLatest = MetricLatest.load(metricId);
  if (!metricLatest) {
    metricLatest = new MetricLatest(metricId);
    metricLatest.vaultId = transfer.vaultId;
    metricLatest.chainId = transfer.chainId;
    metricLatest.vaultAddress = transfer.vaultAddress;
    metricLatest.category = METRIC_TOTAL_SUPPLY;
    metricLatest.value = BigInt.fromI32(0);
    metricLatest.createdAt = transfer.blockTimestamp;
  }
  metricLatest.value = metricLatest.value.plus(
    transfer.value.times(multiplier)
  );
  metricLatest.blockTimestamp = transfer.blockTimestamp;
  metricLatest.updatedAt = transfer.blockTimestamp;
  metricLatest.save();

  // Add historical metric
  let metricHistorical = addMetricHistorical(transfer, metricLatest);

  return metricLatest;
}
