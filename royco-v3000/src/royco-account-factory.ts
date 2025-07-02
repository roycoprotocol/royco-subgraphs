import { RoycoAccountFactory } from "generated";
import { IdGenerator } from "./utils/id-generator";

RoycoAccountFactory.RoycoAccountDeployed.handler(async ({ event, context }) => {
  const chainId = BigInt(event.chainId); // Dynamic chain ID for multichain compatibility

  // Create RoycoAccountDeployed entity
  const roycoAccountDeployedEntity = {
    id: IdGenerator.roycoAccountDeployed(
      event.transaction.hash.toLowerCase(),
      BigInt(event.logIndex)
    ),
    chainId: chainId,
    user: event.params.user.toLowerCase(),
    roycoAccount: event.params.roycoAccount.toLowerCase(),
    blockNumber: BigInt(event.block.number),
    blockTimestamp: BigInt(event.block.timestamp),
    transactionHash: event.transaction.hash.toLowerCase(),
    logIndex: BigInt(event.logIndex),
  };

  context.RoycoAccountDeployed.set(roycoAccountDeployedEntity);

  // Create or update RawSafe entity
  const safeId = IdGenerator.rawSafe(chainId, event.params.roycoAccount);
  let existingRawSafe = await context.RawSafe.get(safeId);

  if (existingRawSafe) {
    // Update existing RawSafe with user information
    const updatedRawSafe = {
      ...existingRawSafe,
      creatorAddress: event.params.user.toLowerCase(),
      // Keep the existing created timestamps (from SafeSetup)
      updatedBlockNumber: BigInt(event.block.number),
      updatedBlockTimestamp: BigInt(event.block.timestamp),
      updatedTransactionHash: event.transaction.hash.toLowerCase(),
      updatedLogIndex: BigInt(event.logIndex),
    };

    context.RawSafe.set(updatedRawSafe);
  } else {
    const rawSafeEntity = {
      id: safeId,
      chainId: chainId,
      safeAddress: event.params.roycoAccount.toLowerCase(),
      owners: [],
      threshold: BigInt(0),
      creatorAddress: event.params.user.toLowerCase(),
      createdBlockNumber: BigInt(event.block.number),
      createdBlockTimestamp: BigInt(event.block.timestamp),
      createdTransactionHash: event.transaction.hash.toLowerCase(),
      createdLogIndex: BigInt(event.logIndex),
      updatedBlockNumber: BigInt(event.block.number),
      updatedBlockTimestamp: BigInt(event.block.timestamp),
      updatedTransactionHash: event.transaction.hash.toLowerCase(),
      updatedLogIndex: BigInt(event.logIndex),
    };

    context.RawSafe.set(rawSafeEntity);
  }
});

RoycoAccountFactory.RoycoAccountDeployed.contractRegister(
  ({ event, context }) => {
    // Register the deployed Royco account as a Safe contract to track its events

    context.addISafe(event.params.roycoAccount);
  }
);
