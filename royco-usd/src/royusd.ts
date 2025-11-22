import { Transfer as TransferEvent } from "../generated/RoyUSD/RoyUSD";
import {
  SUB_CATEGORY_BURN,
  SUB_CATEGORY_MINT,
  SUB_CATEGORY_TRANSFER,
  SUB_CATEGORY_TRANSFER_IN,
  SUB_CATEGORY_TRANSFER_OUT,
  ZERO_ADDRESS,
} from "./constants";
import { processRoyusdTransfer } from "./handlers/base/process-transfer";
import { updateMetricTotalSupply } from "./handlers/metrics/total-supply";
import { updateRoyusdPosition } from "./handlers/base/update-position";
import { addTransferActivity } from "./handlers/activities/transfer";

export function handleTransfer(event: TransferEvent): void {
  const fromAddress = event.params.from.toHexString();
  const toAddress = event.params.to.toHexString();

  if (fromAddress == toAddress) return;

  let subCategory = SUB_CATEGORY_TRANSFER;
  if (fromAddress == ZERO_ADDRESS) {
    subCategory = SUB_CATEGORY_MINT;
  } else if (toAddress == ZERO_ADDRESS) {
    subCategory = SUB_CATEGORY_BURN;
  }

  let transfer = processRoyusdTransfer(
    subCategory,
    fromAddress,
    toAddress,
    event.params.value,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash.toHexString(),
    event.logIndex
  );

  if (subCategory == SUB_CATEGORY_MINT || subCategory == SUB_CATEGORY_BURN) {
    updateRoyusdPosition(transfer, subCategory);
    addTransferActivity(transfer, subCategory);
    updateMetricTotalSupply(transfer, subCategory);
  } else {
    updateRoyusdPosition(transfer, SUB_CATEGORY_TRANSFER_IN);
    addTransferActivity(transfer, SUB_CATEGORY_TRANSFER_IN);

    updateRoyusdPosition(transfer, SUB_CATEGORY_TRANSFER_OUT);
    addTransferActivity(transfer, SUB_CATEGORY_TRANSFER_OUT);
  }
}
