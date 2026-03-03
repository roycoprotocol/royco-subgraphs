import { Bytes, ethereum } from "@graphprotocol/graph-ts";
import { GlobalEventLog } from "../../../generated/schema";
import { CHAIN_ID } from "../../constants";
import { generateGlobalEventLogId } from "../../utils";

export function addGlobalEventLog(event: ethereum.Event): GlobalEventLog {
  let id = generateGlobalEventLogId(
    event.transaction.hash.toHexString(),
    event.logIndex
  );

  let entity = new GlobalEventLog(id);
  entity.chainId = CHAIN_ID;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.transactionIndex = event.transaction.index;
  entity.logIndex = event.logIndex;
  entity.transactionLogIndex = event.transactionLogIndex;
  entity.contractAddress = event.address.toHexString();
  entity.eventSignature = null;
  entity.data = Bytes.empty();

  // Topics from receipt logs
  let receipt = event.receipt;
  if (receipt) {
    let logs = receipt.logs;
    for (let i = 0; i < logs.length; i++) {
      if (logs[i].logIndex.equals(event.logIndex)) {
        let log = logs[i];
        let topics = log.topics;
        entity.topic0 = topics.length > 0 ? topics[0] : null;
        entity.topic1 = topics.length > 1 ? topics[1] : null;
        entity.topic2 = topics.length > 2 ? topics[2] : null;
        entity.topic3 = topics.length > 3 ? topics[3] : null;
        entity.data = log.data;
        if (topics.length > 0) {
          entity.eventSignature = topics[0].toHexString();
        }
        break;
      }
    }
  }

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.createdAt = event.block.timestamp;

  entity.save();
  return entity;
}
