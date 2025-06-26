import { RoycoAccountFactory } from "generated";

RoycoAccountFactory.RoycoAccountDeployed.contractRegister(({ event, context }) => {
  // Register the deployed Royco account as a Safe contract to track its events
  context.addISafe(event.params.roycoAccount);
});

RoycoAccountFactory.RoycoAccountDeployed.handler(async ({ event, context }) => {
  const chainId = BigInt(event.chainId); // Dynamic chain ID for multichain compatibility
  
  context.log.info(`[Chain ${event.chainId}] RoycoAccountDeployed: user=${event.params.user} accountId=${event.params.accountId} roycoAccount=${event.params.roycoAccount}`);
  
  // Create RoycoAccountDeployed entity
  const roycoAccountDeployedEntity = {
    id: `${event.block.hash}_${event.logIndex}`,
    chainId: chainId,
    user: event.params.user.toLowerCase(),
    accountId: event.params.accountId,
    roycoAccount: event.params.roycoAccount.toLowerCase(),
    blockNumber: BigInt(event.block.number),
    blockTimestamp: BigInt(event.block.timestamp),
    transactionHash: event.block.hash.toLowerCase(),
    logIndex: BigInt(event.logIndex),
  };

  context.RoycoAccountDeployed.set(roycoAccountDeployedEntity);

  // Create RawSafe entity
  const safeId = `${chainId}_${event.params.roycoAccount.toLowerCase()}`;
  const rawSafeEntity = {
    id: safeId,
    chainId: chainId,
    safeAddress: event.params.roycoAccount.toLowerCase(),
    owners: [],
    threshold: BigInt(0),
    creatorAddress: event.params.user.toLowerCase(),
    createdBlockNumber: BigInt(event.block.number),
    createdBlockTimestamp: BigInt(event.block.timestamp),
    createdTransactionHash: event.block.hash.toLowerCase(),
    createdLogIndex: BigInt(event.logIndex),
    updatedBlockNumber: BigInt(event.block.number),
    updatedBlockTimestamp: BigInt(event.block.timestamp),
    updatedTransactionHash: event.block.hash.toLowerCase(),
    updatedLogIndex: BigInt(event.logIndex),
  };

  context.RawSafe.set(rawSafeEntity);

  // Note: Dynamic contract registration needs to be configured differently in HyperIndex v2
});