import { OpenLiquidityGraph } from "generated";
import { IdGenerator } from "./utils/id-generator";

OpenLiquidityGraph.NodeInserted.handler(async ({ event, context }) => {
  const chainId = BigInt(event.chainId);
  const nodeId = IdGenerator.rawNode(chainId, event.params.nodeHash);

  // Create RawNode entity
  const rawNodeEntity = {
    id: nodeId,
    chainId: chainId,
    nodeHash: event.params.nodeHash,
    inputTokenId: IdGenerator.tokenId(chainId, event.params.inputToken),
    depositRecipeCommands: event.params.depositRecipe[0].map(
      (cmd: string) => cmd
    ),
    depositRecipeState: event.params.depositRecipe[1].map(
      (state: string) => state
    ),
    withdrawalRecipeCommands: event.params.withdrawalRecipe[0].map(
      (cmd: string) => cmd
    ),
    withdrawalRecipeState: event.params.withdrawalRecipe[1].map(
      (state: string) => state
    ),
    liquidityQueryCommands: event.params.liquidityQuery[0].map(
      (cmd: string) => cmd
    ),
    liquidityQueryState: event.params.liquidityQuery[1].map(
      (state: string) => state
    ),
    outputTokenId: IdGenerator.tokenId(chainId, event.params.outputToken),
    blockNumber: BigInt(event.block.number),
    blockTimestamp: BigInt(event.block.timestamp),
    transactionHash: event.transaction.hash.toLowerCase(),
    logIndex: BigInt(event.logIndex),
    rawMarketsAtlas: [
      IdGenerator.rawMarketAtlas(chainId, event.params.nodeHash),
    ],
  };
  context.RawNode.set(rawNodeEntity);
});
