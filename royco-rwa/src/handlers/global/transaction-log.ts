import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { GlobalTransactionLog } from "../../../generated/schema";
import { CHAIN_ID } from "../../constants";
import { generateGlobalTransactionLogId } from "../../utils";

export function updateGlobalTransactionLog(
  event: ethereum.Event
): GlobalTransactionLog | null {
  let transactionHash = event.transaction.hash.toHexString();
  let id = generateGlobalTransactionLogId(transactionHash);

  let entity = GlobalTransactionLog.load(id);
  if (entity) {
    return entity;
  }

  // Skip contract creation transactions (no toAddress)
  if (!event.transaction.to) {
    return null;
  }

  entity = new GlobalTransactionLog(id);
  entity.chainId = CHAIN_ID;

  // Transaction fields
  entity.transactionHash = transactionHash;
  entity.transactionIndex = event.transaction.index;
  entity.fromAddress = event.transaction.from.toHexString();
  entity.toAddress = event.transaction.to!.toHexString();
  entity.value = event.transaction.value;
  entity.gasLimit = event.transaction.gasLimit;
  entity.gasPrice = event.transaction.gasPrice;
  entity.nonce = event.transaction.nonce;
  entity.input = event.transaction.input.toHexString();

  // Function selector (first 4 bytes of input)
  let input = event.transaction.input;
  if (input.length >= 4) {
    let selectorBytes = new Bytes(4);
    for (let i = 0; i < 4; i++) {
      selectorBytes[i] = input[i];
    }
    entity.functionSelector = selectorBytes.toHexString();
  } else {
    entity.functionSelector = null;
  }

  // Block fields
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.blockHash = event.block.hash.toHexString();
  entity.blockGasUsed = event.block.gasUsed;
  entity.blockGasLimit = event.block.gasLimit;
  entity.blockSize = event.block.size;
  entity.baseFeePerGas = event.block.baseFeePerGas!;

  // Receipt fields
  let receipt = event.receipt;
  let baseFee = event.block.baseFeePerGas!;
  if (receipt) {
    entity.gasUsed = receipt.gasUsed;
    entity.cumulativeGasUsed = receipt.cumulativeGasUsed;
    entity.logsBloom = receipt.logsBloom.toHexString();

    // Computed fee fields
    entity.transactionFee = receipt.gasUsed.times(event.transaction.gasPrice);
    let priorityFeePerGas = event.transaction.gasPrice.minus(baseFee);
    entity.priorityFee = receipt.gasUsed.times(priorityFeePerGas);
    entity.burnedAmount = receipt.gasUsed.times(baseFee);
  } else {
    entity.gasUsed = BigInt.fromI32(0);
    entity.cumulativeGasUsed = BigInt.fromI32(0);
    entity.logsBloom = "0x";
    entity.transactionFee = BigInt.fromI32(0);
    entity.priorityFee = BigInt.fromI32(0);
    entity.burnedAmount = BigInt.fromI32(0);
  }

  // Metadata
  entity.createdAt = event.block.timestamp;

  entity.save();
  return entity;
}
