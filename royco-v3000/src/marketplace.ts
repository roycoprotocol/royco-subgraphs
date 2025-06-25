import { crypto, Bytes } from "@graphprotocol/graph-ts";
import { MarketCreated as MarketCreatedEvent } from "../generated/Royco/Royco";
import { MarketCreated, RawMarket, RawNode } from "../generated/schema";
import { CHAIN_ID } from "./constants";
import {
  generateEventId,
  generateRawMarketId,
  generateRawNodeId,
  formatAddress,
  formatBytes,
} from "./utils/id-generator";

export function handleMarketCreated(event: MarketCreatedEvent): void {
  // Create MarketCreated event entity
  let eventEntity = new MarketCreated(
    generateEventId(event.transaction.hash, event.logIndex)
  );
  eventEntity.chainId = CHAIN_ID;
  eventEntity.nodeHash = formatBytes(event.params.nodeHash);
  eventEntity.marketType = 2;
  eventEntity.oracle = formatAddress(event.params.oracle);
  eventEntity.data = formatBytes(event.params.data);
  eventEntity.blockNumber = event.block.number;
  eventEntity.blockTimestamp = event.block.timestamp;
  eventEntity.transactionHash = formatBytes(event.transaction.hash);
  eventEntity.logIndex = event.logIndex;

  // Calculate marketHash (keccak256 of nodeHash + marketSignal)
  let marketSignalEncoded = crypto.keccak256(
    Bytes.fromUTF8("(address,bytes)")
      .concat(event.params.oracle)
      .concat(Bytes.fromByteArray(crypto.keccak256(event.params.data)))
  );
  let marketHashInput = event.params.nodeHash.concat(
    Bytes.fromByteArray(marketSignalEncoded)
  );
  let marketHash = crypto.keccak256(marketHashInput);
  eventEntity.marketHash = formatBytes(Bytes.fromByteArray(marketHash));

  eventEntity.save();

  // Create or update RawMarket entity
  let marketId = generateRawMarketId(
    formatBytes(Bytes.fromByteArray(marketHash))
  );

  let rawMarket = new RawMarket(marketId);
  rawMarket.chainId = CHAIN_ID;
  rawMarket.marketHash = formatBytes(Bytes.fromByteArray(marketHash));
  rawMarket.marketType = 2;
  rawMarket.nodeHash = formatBytes(event.params.nodeHash);
  rawMarket.signalTarget = formatAddress(event.params.oracle);
  rawMarket.signalData = formatBytes(event.params.data);
  rawMarket.createdBlockNumber = event.block.number;
  rawMarket.createdBlockTimestamp = event.block.timestamp;
  rawMarket.createdTransactionHash = formatBytes(event.transaction.hash);
  rawMarket.createdLogIndex = event.logIndex;
  rawMarket.updatedBlockNumber = event.block.number;
  rawMarket.updatedBlockTimestamp = event.block.timestamp;
  rawMarket.updatedTransactionHash = formatBytes(event.transaction.hash);
  rawMarket.updatedLogIndex = event.logIndex;

  // Set the reference to RawNode
  let nodeId = generateRawNodeId(formatBytes(event.params.nodeHash));
  rawMarket.rawNodeRefId = nodeId;

  rawMarket.save();
}
