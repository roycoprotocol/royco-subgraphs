import { BigInt, crypto, Bytes } from "@graphprotocol/graph-ts";
import { 
  NodeInserted as NodeInsertedEvent,
  MarketCreated as MarketCreatedEvent,
  CancelledOrder as CancelledOrderEvent,
  FillOrderCall,
  CancelOrderCall,
  FillOrderCall_orderPreChecksStruct,
  FillOrderCall_orderPostChecksStruct
} from "../generated/Royco/Royco";
import { 
  RawOrder, 
  RawGlobalActivity,
  RawOperand,
  RawCondition
} from "../generated/schema";
import { CHAIN_ID } from "./constants";
import { 
  generateRawOrderId, 
  generateRawOperandId, 
  generateRawConditionId,
  generateRawGlobalActivityId,
  generateTokenId,
  formatAddress,
  formatBytes
} from "./utils/id-generator";

// Import handlers from separate files
import { handleNodeInserted as handleNodeInsertedImpl } from "./open-liquidity-graph";
import { handleMarketCreated as handleMarketCreatedImpl } from "./marketplace";
import { handleCancelledOrder as handleCancelledOrderImpl } from "./order-processor";

export function handleNodeInserted(event: NodeInsertedEvent): void {
  handleNodeInsertedImpl(event);
}

export function handleMarketCreated(event: MarketCreatedEvent): void {
  handleMarketCreatedImpl(event);
}

export function handleCancelledOrder(event: CancelledOrderEvent): void {
  handleCancelledOrderImpl(event);
}

export function handleFillOrder(call: FillOrderCall): void {
  let order = call.inputs._order;
  let fillAmount = call.inputs._fillAmount;
  
  // Create RawOperand for rhsSignalOperand
  let rhsOperandHash = crypto.keccak256(
    order.rhsSignalOperand.target
      .concat(Bytes.fromByteArray(crypto.keccak256(order.rhsSignalOperand.data)))
  );
  let rhsOperandId = generateRawOperandId(formatBytes(Bytes.fromByteArray(rhsOperandHash)));
  
  let rhsOperand = RawOperand.load(rhsOperandId);
  if (rhsOperand == null) {
    rhsOperand = new RawOperand(rhsOperandId);
    rhsOperand.chainId = CHAIN_ID;
    rhsOperand.target = formatAddress(order.rhsSignalOperand.target);
    rhsOperand.data = formatBytes(order.rhsSignalOperand.data);
    rhsOperand.save();
  }

  // Create RawConditions for preChecks and postChecks
  let preCheckIds: string[] = [];
  for (let i = 0; i < order.preChecks.length; i++) {
    let condition = order.preChecks[i];
    let conditionId = createConditionFromPreCheck(condition);
    preCheckIds.push(conditionId);
  }

  let postCheckIds: string[] = [];
  for (let i = 0; i < order.postChecks.length; i++) {
    let condition = order.postChecks[i];
    let conditionId = createConditionFromPostCheck(condition);
    postCheckIds.push(conditionId);
  }

  // Calculate order hash (simplified - use contract's hashOrder method in practice)
  let orderHashInput = crypto.keccak256(
    order.roycoAccount
      .concat(order.targetMarketHash)
      .concat(Bytes.fromByteArray(Bytes.fromBigInt(order.quantity)))
  );
  let orderHash = crypto.keccak256(orderHashInput);

  // Create or update RawOrder entity
  let orderId = generateRawOrderId(formatBytes(Bytes.fromByteArray(orderHash)));
  
  let rawOrder = RawOrder.load(orderId);
  if (rawOrder == null) {
    rawOrder = new RawOrder(orderId);
    rawOrder.chainId = CHAIN_ID;
    rawOrder.orderHash = formatBytes(Bytes.fromByteArray(orderHash));
    rawOrder.roycoAccount = formatAddress(order.roycoAccount);
    rawOrder.taker = order.taker ? formatAddress(order.taker) : null;
    rawOrder.targetMarketHash = formatBytes(order.targetMarketHash);
    rawOrder.signalComparator = order.signalComparator;
    rawOrder.rhsSignalOperandRefId = rhsOperandId;
    rawOrder.checkSignalBeforeFill = order.checkSignalBeforeFill;
    rawOrder.auxiliaryExecutionParams = formatBytes(order.auxiliaryExecutionParams);
    rawOrder.quantity = order.quantity;
    rawOrder.recipient = formatAddress(order.recipient);
    rawOrder.expiry = order.expiry;
    rawOrder.allocator = formatAddress(order.allocator);
    rawOrder.allocatorArgs = formatBytes(order.allocatorArgs);
    rawOrder.preCheckConditionRefIds = preCheckIds;
    rawOrder.postCheckConditionRefIds = postCheckIds;
    rawOrder.signature = formatBytes(order.signature);
    rawOrder.isCancelled = false;
    rawOrder.amountFilled = BigInt.fromI32(0);
    rawOrder.createdBlockNumber = call.block.number;
    rawOrder.createdBlockTimestamp = call.block.timestamp;
    rawOrder.createdTransactionHash = formatBytes(call.transaction.hash);
    rawOrder.createdLogIndex = BigInt.fromI32(0);

    // Set market reference
    let marketId = CHAIN_ID.toString()
      .concat("_2_") // market type is always 2
      .concat(formatBytes(order.targetMarketHash));
    rawOrder.rawMarketRefId = marketId;
  }

  // Update fill amount
  rawOrder.amountFilled = rawOrder.amountFilled.plus(fillAmount);
  rawOrder.updatedBlockNumber = call.block.number;
  rawOrder.updatedBlockTimestamp = call.block.timestamp;
  rawOrder.updatedTransactionHash = formatBytes(call.transaction.hash);
  rawOrder.updatedLogIndex = BigInt.fromI32(0);
  
  rawOrder.save();

  // Create RawGlobalActivity entity for order fill (deposit activity)
  let tokenIndex = BigInt.fromI32(0); // Default token index
  let category = "v3000";
  let subCategory = "deposit";
  
  let activityId = generateRawGlobalActivityId(
    call.transaction.hash,
    BigInt.fromI32(0), // logIndex for call handlers
    category,
    subCategory,
    tokenIndex
  );
  
  // For v3000, we'll use the target market's input token as the token address
  // This would need to be derived from the market data, for now using a placeholder
  let tokenAddress = "0x0000000000000000000000000000000000000000"; // TODO: derive from market
  let tokenId = generateTokenId(tokenAddress);
  
  let rawGlobalActivity = new RawGlobalActivity(activityId);
  rawGlobalActivity.chainId = CHAIN_ID;
  rawGlobalActivity.category = category;
  rawGlobalActivity.subCategory = subCategory;
  rawGlobalActivity.sourceRefId = orderId;
  rawGlobalActivity.contractAddress = formatAddress(call.to);
  rawGlobalActivity.accountAddress = formatAddress(order.roycoAccount);
  rawGlobalActivity.tokenIndex = tokenIndex;
  rawGlobalActivity.tokenId = tokenId;
  rawGlobalActivity.tokenAddress = tokenAddress;
  rawGlobalActivity.tokenAmount = fillAmount;
  rawGlobalActivity.blockNumber = call.block.number;
  rawGlobalActivity.blockTimestamp = call.block.timestamp;
  rawGlobalActivity.transactionHash = formatBytes(call.transaction.hash);
  rawGlobalActivity.logIndex = BigInt.fromI32(0);
  
  rawGlobalActivity.save();
}

export function handleCancelOrder(call: CancelOrderCall): void {
  let order = call.inputs._order;
  
  // Calculate order hash (same logic as fillOrder)
  let orderHashInput = crypto.keccak256(
    order.roycoAccount
      .concat(order.targetMarketHash)
      .concat(Bytes.fromByteArray(Bytes.fromBigInt(order.quantity)))
  );
  let orderHash = crypto.keccak256(orderHashInput);

  // Update RawOrder entity to mark as cancelled
  let orderId = generateRawOrderId(formatBytes(Bytes.fromByteArray(orderHash)));
  
  let rawOrder = RawOrder.load(orderId);
  if (rawOrder != null) {
    rawOrder.isCancelled = true;
    rawOrder.updatedBlockNumber = call.block.number;
    rawOrder.updatedBlockTimestamp = call.block.timestamp;
    rawOrder.updatedTransactionHash = formatBytes(call.transaction.hash);
    rawOrder.updatedLogIndex = BigInt.fromI32(0);
    
    rawOrder.save();
  }
}

function createConditionFromPreCheck(condition: FillOrderCall_orderPreChecksStruct): string {
  // Create LHS operand
  let lhsOperandHash = crypto.keccak256(
    condition.lhs.target
      .concat(condition.lhs.data)
  );
  let lhsOperandId = generateRawOperandId(formatBytes(Bytes.fromByteArray(lhsOperandHash)));
  
  let lhsOperand = RawOperand.load(lhsOperandId);
  if (lhsOperand == null) {
    lhsOperand = new RawOperand(lhsOperandId);
    lhsOperand.chainId = CHAIN_ID;
    lhsOperand.target = formatAddress(condition.lhs.target);
    lhsOperand.data = formatBytes(condition.lhs.data);
    lhsOperand.save();
  }

  // Create RHS operand
  let rhsOperandHash = crypto.keccak256(
    condition.rhs.target
      .concat(condition.rhs.data)
  );
  let rhsOperandId = generateRawOperandId(formatBytes(Bytes.fromByteArray(rhsOperandHash)));
  
  let rhsOperand = RawOperand.load(rhsOperandId);
  if (rhsOperand == null) {
    rhsOperand = new RawOperand(rhsOperandId);
    rhsOperand.chainId = CHAIN_ID;
    rhsOperand.target = formatAddress(condition.rhs.target);
    rhsOperand.data = formatBytes(condition.rhs.data);
    rhsOperand.save();
  }

  // Create condition
  let conditionHashInput = crypto.keccak256(
    Bytes.fromUTF8(lhsOperandId)
      .concat(Bytes.fromByteArray(Bytes.fromBigInt(BigInt.fromI32(condition.cmp))))
      .concat(Bytes.fromUTF8(rhsOperandId))
  );
  let conditionHash = crypto.keccak256(conditionHashInput);
  let conditionId = generateRawConditionId(formatBytes(Bytes.fromByteArray(conditionHash)));
  
  let rawCondition = RawCondition.load(conditionId);
  if (rawCondition == null) {
    rawCondition = new RawCondition(conditionId);
    rawCondition.chainId = CHAIN_ID;
    rawCondition.lhsOperandRefId = lhsOperandId;
    rawCondition.comparator = condition.cmp;
    rawCondition.rhsOperandRefId = rhsOperandId;
    rawCondition.save();
  }

  return conditionId;
}

function createConditionFromPostCheck(condition: FillOrderCall_orderPostChecksStruct): string {
  // Create LHS operand
  let lhsOperandHash = crypto.keccak256(
    condition.lhs.target
      .concat(condition.lhs.data)
  );
  let lhsOperandId = generateRawOperandId(formatBytes(Bytes.fromByteArray(lhsOperandHash)));
  
  let lhsOperand = RawOperand.load(lhsOperandId);
  if (lhsOperand == null) {
    lhsOperand = new RawOperand(lhsOperandId);
    lhsOperand.chainId = CHAIN_ID;
    lhsOperand.target = formatAddress(condition.lhs.target);
    lhsOperand.data = formatBytes(condition.lhs.data);
    lhsOperand.save();
  }

  // Create RHS operand
  let rhsOperandHash = crypto.keccak256(
    condition.rhs.target
      .concat(condition.rhs.data)
  );
  let rhsOperandId = generateRawOperandId(formatBytes(Bytes.fromByteArray(rhsOperandHash)));
  
  let rhsOperand = RawOperand.load(rhsOperandId);
  if (rhsOperand == null) {
    rhsOperand = new RawOperand(rhsOperandId);
    rhsOperand.chainId = CHAIN_ID;
    rhsOperand.target = formatAddress(condition.rhs.target);
    rhsOperand.data = formatBytes(condition.rhs.data);
    rhsOperand.save();
  }

  // Create condition
  let conditionHashInput = crypto.keccak256(
    Bytes.fromUTF8(lhsOperandId)
      .concat(Bytes.fromByteArray(Bytes.fromBigInt(BigInt.fromI32(condition.cmp))))
      .concat(Bytes.fromUTF8(rhsOperandId))
  );
  let conditionHash = crypto.keccak256(conditionHashInput);
  let conditionId = generateRawConditionId(formatBytes(Bytes.fromByteArray(conditionHash)));
  
  let rawCondition = RawCondition.load(conditionId);
  if (rawCondition == null) {
    rawCondition = new RawCondition(conditionId);
    rawCondition.chainId = CHAIN_ID;
    rawCondition.lhsOperandRefId = lhsOperandId;
    rawCondition.comparator = condition.cmp;
    rawCondition.rhsOperandRefId = rhsOperandId;
    rawCondition.save();
  }

  return conditionId;
}