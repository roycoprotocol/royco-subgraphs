import { Marketplace, Royco } from "generated";
import { IdGenerator, ID_CONSTANTS } from "./utils/id-generator";

// Handle NodeInserted events from Marketplace contract
Marketplace.NodeInserted.handler(async ({ event, context }) => {
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

// Handle MarketCreated events from Marketplace contract
Marketplace.MarketCreated.handler(async ({ event, context }) => {
  const chainId = BigInt(event.chainId);
  const marketId = IdGenerator.rawMarketAtlas(chainId, event.params.marketHash);
  const nodeId = IdGenerator.rawNode(chainId, event.params.nodeHash);

  // Ensure the referenced node exists
  const node = await context.RawNode.get(nodeId);
  if (!node) {
    context.log.warn(`Node not found for market creation: ${nodeId}`);
    return;
  }

  // Create RawMarketAtlas entity
  const rawMarketAtlasEntity = {
    id: marketId,
    rawNodeRefId: nodeId,
    chainId: chainId,
    marketType: ID_CONSTANTS.ATLAS_MARKET_TYPE,
    marketHash: event.params.marketHash,
    nodeHash: event.params.nodeHash,
    signalTarget: event.params.signalProvider.toLowerCase(),
    signalData: event.params.data,
    blockNumber: BigInt(event.block.number),
    blockTimestamp: BigInt(event.block.timestamp),
    transactionHash: event.transaction.hash.toLowerCase(),
    logIndex: BigInt(event.logIndex),
    rawOrderRefId: IdGenerator.rawOrderAtlas(chainId, event.params.marketHash),
  };

  context.RawMarketAtlas.set(rawMarketAtlasEntity);
});

// Handle AbsoluteOrderFilled events from Royco contract
Royco.AbsoluteOrderFilled.handler(async ({ event, context }) => {
  const chainId = BigInt(event.chainId);
  const orderId = IdGenerator.rawOrderAtlas(chainId, event.params.orderhash);

  // Find the market atlas entity
  const marketId = IdGenerator.rawMarketAtlas(
    chainId,
    event.params.targetMarket
  );
  const market = await context.RawMarketAtlas.get(marketId);

  if (!market) {
    context.log.warn(`Market not found for order fill: ${marketId}`);
    return;
  }

  let order = await context.RawOrderAtlas.get(orderId);
  if (!order) {
    return;
  }

  // Update order with fill information
  const updatedOrder = {
    ...order,
    taker: event.params.taker.toLowerCase(),
    amountFilled: event.params.amountFilled,
    status: "filled",
    updatedBlockNumber: BigInt(event.block.number),
    updatedBlockTimestamp: BigInt(event.block.timestamp),
    updatedTransactionHash: event.transaction.hash.toLowerCase(),
    updatedLogIndex: BigInt(event.logIndex),
  };

  context.RawOrderAtlas.set(updatedOrder);
});

// Handle OrderCancelled events from Royco contract
Royco.OrderCancelled.handler(async ({ event, context }) => {
  const chainId = BigInt(event.chainId);
  const orderId = IdGenerator.rawOrderAtlas(chainId, event.params.orderHash);

  const order = await context.RawOrderAtlas.get(orderId);
  if (!order) {
    context.log.warn(`Order not found for cancellation: ${orderId}`);
    return;
  }

  const updatedOrder = {
    ...order,
    status: "cancelled",
    updatedBlockNumber: BigInt(event.block.number),
    updatedBlockTimestamp: BigInt(event.block.timestamp),
    updatedTransactionHash: event.transaction.hash.toLowerCase(),
    updatedLogIndex: BigInt(event.logIndex),
  };

  context.RawOrderAtlas.set(updatedOrder);
});
