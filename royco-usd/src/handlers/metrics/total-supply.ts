import { BigInt } from "@graphprotocol/graph-ts";
import {
  RoyusdMetricHistorical,
  RoyusdMetricLatest,
  RoyusdTransfer,
} from "../../../generated/schema";
import {
  CHAIN_ID,
  METRIC_TOTAL_SUPPLY,
  SUB_CATEGORY_BURN,
} from "../../constants";
import {
  generateMetricHistoricalId,
  generateMetricLatestId,
} from "../../utils";

export function updateMetricTotalSupply(
  transfer: RoyusdTransfer,
  subCategory: string
): RoyusdMetricLatest {
  let name = METRIC_TOTAL_SUPPLY;

  let multiplier = BigInt.fromI32(1);
  if (subCategory == SUB_CATEGORY_BURN) {
    multiplier = BigInt.fromI32(-1);
  }

  let metricId = generateMetricLatestId(name);
  let metricLatest = RoyusdMetricLatest.load(metricId);
  if (!metricLatest) {
    metricLatest = new RoyusdMetricLatest(metricId);
    metricLatest.chainId = CHAIN_ID;
    metricLatest.name = name;
    metricLatest.value = BigInt.fromI32(0);
    metricLatest.prevValue = BigInt.fromI32(0);
    metricLatest.blockTimestamp = transfer.blockTimestamp;
    metricLatest.prevBlockTimestamp = transfer.blockTimestamp;
    metricLatest.createdAt = transfer.blockTimestamp;
  }

  metricLatest.prevValue = metricLatest.value;
  metricLatest.value = metricLatest.value.plus(
    transfer.rawAmount.times(multiplier)
  );
  metricLatest.prevBlockTimestamp = metricLatest.blockTimestamp;
  metricLatest.blockTimestamp = transfer.blockTimestamp;
  metricLatest.updatedAt = transfer.blockTimestamp;
  metricLatest.save();

  let metricHistoricalId = generateMetricHistoricalId(
    transfer.transactionHash,
    transfer.logIndex,
    name
  );
  let metricHistorical = new RoyusdMetricHistorical(metricHistoricalId);
  metricHistorical.chainId = metricLatest.chainId;
  metricHistorical.name = metricLatest.name;
  metricHistorical.prevValue = metricLatest.prevValue;
  metricHistorical.value = metricLatest.value;
  metricHistorical.blockNumber = transfer.blockNumber;
  metricHistorical.prevBlockTimestamp = metricLatest.prevBlockTimestamp;
  metricHistorical.blockTimestamp = metricLatest.blockTimestamp;
  metricHistorical.transactionHash = transfer.transactionHash;
  metricHistorical.logIndex = transfer.logIndex;
  metricHistorical.createdAt = transfer.blockTimestamp;
  metricHistorical.save();

  return metricLatest;
}
