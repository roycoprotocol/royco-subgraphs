// import { Marketplace, Royco } from "generated";
import { Royco, Marketplace, OpenLiquidityGraph } from "generated";
import { IdGenerator, ID_CONSTANTS } from "./utils/id-generator";

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

Royco.AccountDeposited.handler(async ({ event, context }) => {
  const chainId = BigInt(event.chainId);

  const accountDepositedEntity = {
    id: IdGenerator.accountDeposited(
      event.transaction.hash.toLowerCase(),
      BigInt(event.logIndex)
    ),
    chainId: chainId,
    roycoAccount: event.params.roycoAccount.toLowerCase(),
    targetNode: event.params.targetNode,
    amountIn: event.params.amountIn,
    blockNumber: BigInt(event.block.number),
    blockTimestamp: BigInt(event.block.timestamp),
    transactionHash: event.transaction.hash.toLowerCase(),
    logIndex: BigInt(event.logIndex),
  };

  context.AccountDeposited.set(accountDepositedEntity);
});

Royco.AccountWithdrew.handler(async ({ event, context }) => {
  const chainId = BigInt(event.chainId);

  const accountWithdrewEntity = {
    id: IdGenerator.accountWithdrew(
      event.transaction.hash.toLowerCase(),
      BigInt(event.logIndex)
    ),
    chainId: chainId,
    roycoAccount: event.params.roycoAccount.toLowerCase(),
    targetNode: event.params.targetNode,
    amountOut: event.params.amountOut,
    blockNumber: BigInt(event.block.number),
    blockTimestamp: BigInt(event.block.timestamp),
    transactionHash: event.transaction.hash.toLowerCase(),
    logIndex: BigInt(event.logIndex),
  };

  context.AccountWithdrew.set(accountWithdrewEntity);
});

Royco.FeesClaimed.handler(async ({ event, context }) => {
  const chainId = BigInt(event.chainId);

  const feesClaimedEntity = {
    id: IdGenerator.feesClaimed(
      event.transaction.hash.toLowerCase(),
      BigInt(event.logIndex)
    ),
    chainId: chainId,
    claimant: event.params.claimant.toLowerCase(),
    feeToken: event.params.feeToken.toLowerCase(),
    feesClaimed: event.params.feesClaimed,
    blockNumber: BigInt(event.block.number),
    blockTimestamp: BigInt(event.block.timestamp),
    transactionHash: event.transaction.hash.toLowerCase(),
    logIndex: BigInt(event.logIndex),
  };

  context.FeesClaimed.set(feesClaimedEntity);
});
