import { NodeInserted as NodeInsertedEvent } from "../generated/Royco/Royco";
import { NodeInserted, RawNode } from "../generated/schema";
import { CHAIN_ID } from "./constants";
import { generateEventId, generateRawNodeId, formatAddress, formatBytes } from "./utils/id-generator";

export function handleNodeInserted(event: NodeInsertedEvent): void {
  // Create NodeInserted event entity
  let eventEntity = new NodeInserted(
    generateEventId(event.transaction.hash, event.logIndex)
  );
  eventEntity.chainId = CHAIN_ID;
  eventEntity.nodeHash = formatBytes(event.params.nodeHash);
  eventEntity.inputToken = formatAddress(event.params.inputToken);
  
  // Convert Recipe commands and state to string arrays
  let depositCommands: string[] = [];
  for (let i = 0; i < event.params.depositRecipe.commands.length; i++) {
    depositCommands.push(formatBytes(event.params.depositRecipe.commands[i]));
  }
  eventEntity.depositRecipeCommands = depositCommands;
  
  let depositState: string[] = [];
  for (let i = 0; i < event.params.depositRecipe.state.length; i++) {
    depositState.push(formatBytes(event.params.depositRecipe.state[i]));
  }
  eventEntity.depositRecipeState = depositState;
  
  let liquidityCommands: string[] = [];
  for (let i = 0; i < event.params.liquidityQuery.commands.length; i++) {
    liquidityCommands.push(formatBytes(event.params.liquidityQuery.commands[i]));
  }
  eventEntity.liquidityQueryCommands = liquidityCommands;
  
  let liquidityState: string[] = [];
  for (let i = 0; i < event.params.liquidityQuery.state.length; i++) {
    liquidityState.push(formatBytes(event.params.liquidityQuery.state[i]));
  }
  eventEntity.liquidityQueryState = liquidityState;
  
  let withdrawalCommands: string[] = [];
  for (let i = 0; i < event.params.withdrawalRecipe.commands.length; i++) {
    withdrawalCommands.push(formatBytes(event.params.withdrawalRecipe.commands[i]));
  }
  eventEntity.withdrawalRecipeCommands = withdrawalCommands;
  
  let withdrawalState: string[] = [];
  for (let i = 0; i < event.params.withdrawalRecipe.state.length; i++) {
    withdrawalState.push(formatBytes(event.params.withdrawalRecipe.state[i]));
  }
  eventEntity.withdrawalRecipeState = withdrawalState;
  
  eventEntity.outputToken = formatAddress(event.params.outputToken);
  eventEntity.blockNumber = event.block.number;
  eventEntity.blockTimestamp = event.block.timestamp;
  eventEntity.transactionHash = formatBytes(event.transaction.hash);
  eventEntity.logIndex = event.logIndex;
  
  eventEntity.save();

  // Create or update RawNode entity
  let nodeId = generateRawNodeId(formatBytes(event.params.nodeHash));
  
  let rawNode = new RawNode(nodeId);
  rawNode.chainId = CHAIN_ID;
  rawNode.nodeHash = formatBytes(event.params.nodeHash);
  rawNode.inputToken = formatAddress(event.params.inputToken);
  rawNode.depositRecipeCommands = depositCommands;
  rawNode.depositRecipeState = depositState;
  rawNode.liquidityQueryCommands = liquidityCommands;
  rawNode.liquidityQueryState = liquidityState;
  rawNode.withdrawalRecipeCommands = withdrawalCommands;
  rawNode.withdrawalRecipeState = withdrawalState;
  rawNode.outputToken = formatAddress(event.params.outputToken);
  rawNode.createdBlockNumber = event.block.number;
  rawNode.createdBlockTimestamp = event.block.timestamp;
  rawNode.createdTransactionHash = formatBytes(event.transaction.hash);
  rawNode.createdLogIndex = event.logIndex;
  rawNode.updatedBlockNumber = event.block.number;
  rawNode.updatedBlockTimestamp = event.block.timestamp;
  rawNode.updatedTransactionHash = formatBytes(event.transaction.hash);
  rawNode.updatedLogIndex = event.logIndex;
  
  rawNode.save();
}