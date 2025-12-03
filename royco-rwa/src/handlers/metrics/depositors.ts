import { BigInt } from "@graphprotocol/graph-ts";
import {
  MetricLatest,
  GlobalTokenTransfer,
  PositionLatest,
} from "../../../generated/schema";
import {
  ZERO_ADDRESS,
  CATEGORY_SHARES,
  METRIC_DEPOSITORS,
} from "../../constants";
import { generateMetricLatestId, generatePositionLatestId } from "../../utils";
import { addMetricHistorical } from "./update-period";

export function updateMetricDepositors(
  transfer: GlobalTokenTransfer
): MetricLatest {
  let change = BigInt.fromI32(0);

  const fromAccountAddress = transfer.fromAddress;
  const toAccountAddress = transfer.toAddress;

  if (fromAccountAddress != ZERO_ADDRESS) {
    let fromPositionLatestId = generatePositionLatestId(
      transfer.vaultAddress,
      fromAccountAddress,
      CATEGORY_SHARES
    );
    let fromPositionLatest = PositionLatest.load(fromPositionLatestId);
    if (fromPositionLatest && fromPositionLatest.value.equals(transfer.value)) {
      change = change.minus(BigInt.fromI32(1));
    }
  }

  if (toAccountAddress != ZERO_ADDRESS) {
    let toPositionLatestId = generatePositionLatestId(
      transfer.vaultAddress,
      toAccountAddress,
      CATEGORY_SHARES
    );
    let toPositionLatest = PositionLatest.load(toPositionLatestId);
    if (!toPositionLatest || toPositionLatest.value.equals(BigInt.fromI32(0))) {
      change = change.plus(BigInt.fromI32(1));
    }
  }

  if (change.equals(BigInt.fromI32(0))) {
    let metricId = generateMetricLatestId(
      transfer.vaultAddress,
      METRIC_DEPOSITORS
    );
    let metricLatest = MetricLatest.load(metricId);
    if (metricLatest) {
      return metricLatest;
    }

    metricLatest = new MetricLatest(metricId);
    metricLatest.vaultId = transfer.vaultId;
    metricLatest.chainId = transfer.chainId;
    metricLatest.vaultAddress = transfer.vaultAddress;
    metricLatest.category = METRIC_DEPOSITORS;
    metricLatest.value = BigInt.fromI32(0);
    metricLatest.blockTimestamp = transfer.blockTimestamp;
    metricLatest.createdAt = transfer.blockTimestamp;
    metricLatest.updatedAt = transfer.blockTimestamp;
    metricLatest.save();

    return metricLatest;
  }

  // Update latest metric
  let metricId = generateMetricLatestId(
    transfer.vaultAddress,
    METRIC_DEPOSITORS
  );
  let metricLatest = MetricLatest.load(metricId);
  if (!metricLatest) {
    metricLatest = new MetricLatest(metricId);
    metricLatest.vaultId = transfer.vaultId;
    metricLatest.chainId = transfer.chainId;
    metricLatest.vaultAddress = transfer.vaultAddress;
    metricLatest.category = METRIC_DEPOSITORS;
    metricLatest.value = BigInt.fromI32(0);
    metricLatest.createdAt = transfer.blockTimestamp;
  }
  metricLatest.value = metricLatest.value.plus(change);
  metricLatest.blockTimestamp = transfer.blockTimestamp;
  metricLatest.updatedAt = transfer.blockTimestamp;
  metricLatest.save();

  // Add historical metric
  let metricHistorical = addMetricHistorical(transfer, metricLatest);

  return metricLatest;
}
