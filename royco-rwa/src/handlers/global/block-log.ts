import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import { GlobalBlockLog } from "../../../generated/schema";
import { CHAIN_ID } from "../../constants";
import { generateGlobalBlockLogId } from "../../utils";

export function updateGlobalBlockLog(event: ethereum.Event): GlobalBlockLog {
  let id = generateGlobalBlockLogId(event.block.number);

  let entity = GlobalBlockLog.load(id);
  if (!entity) {
    entity = new GlobalBlockLog(id);
    entity.chainId = CHAIN_ID;
    entity.blockNumber = event.block.number;
    entity.blockTimestamp = event.block.timestamp;
    entity.blockHash = event.block.hash.toHexString();
    entity.parentHash = event.block.parentHash.toHexString();
    entity.unclesHash = event.block.unclesHash.toHexString();
    entity.author = event.block.author.toHexString();
    entity.stateRoot = event.block.stateRoot.toHexString();
    entity.transactionsRoot = event.block.transactionsRoot.toHexString();
    entity.receiptsRoot = event.block.receiptsRoot.toHexString();
    entity.gasUsed = event.block.gasUsed;
    entity.gasLimit = event.block.gasLimit;
    entity.difficulty = event.block.difficulty;
    entity.totalDifficulty = event.block.totalDifficulty;
    entity.size = event.block.size;
    entity.baseFeePerGas = event.block.baseFeePerGas;
    entity.transactionCount = BigInt.fromI32(0);
    entity.eventCount = BigInt.fromI32(0);
    entity.createdAt = event.block.timestamp;
  }

  entity.transactionCount = entity.transactionCount.plus(BigInt.fromI32(1));
  entity.eventCount = entity.eventCount.plus(BigInt.fromI32(1));

  entity.save();
  return entity;
}
