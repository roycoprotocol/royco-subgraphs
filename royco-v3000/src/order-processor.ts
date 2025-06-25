import { CancelledOrder as CancelledOrderEvent } from "../generated/Royco/Royco";
import { CancelledOrder, RawOrder } from "../generated/schema";
import { CHAIN_ID } from "./constants";
import { generateEventId, generateRawOrderId, formatBytes } from "./utils/id-generator";

export function handleCancelledOrder(event: CancelledOrderEvent): void {
  // Create CancelledOrder event entity
  let eventEntity = new CancelledOrder(
    generateEventId(event.transaction.hash, event.logIndex)
  );
  eventEntity.chainId = CHAIN_ID;
  eventEntity.orderHash = formatBytes(event.params.orderHash);
  eventEntity.blockNumber = event.block.number;
  eventEntity.blockTimestamp = event.block.timestamp;
  eventEntity.transactionHash = formatBytes(event.transaction.hash);
  eventEntity.logIndex = event.logIndex;
  
  eventEntity.save();

  // Update RawOrder entity to mark as cancelled
  let orderId = generateRawOrderId(formatBytes(event.params.orderHash));
  
  let rawOrder = RawOrder.load(orderId);
  if (rawOrder != null) {
    rawOrder.isCancelled = true;
    rawOrder.updatedBlockNumber = event.block.number;
    rawOrder.updatedBlockTimestamp = event.block.timestamp;
    rawOrder.updatedTransactionHash = formatBytes(event.transaction.hash);
    rawOrder.updatedLogIndex = event.logIndex;
    
    rawOrder.save();
  }
}