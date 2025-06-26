import { ISafe } from "generated";

// Note: CHAIN_ID is now dynamic - use event.chainId in handlers
const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

// Helper function to get chain ID from event (for multichain compatibility)
function getChainId(event: any): bigint {
  return BigInt(event.chainId);
}

ISafe.Transfer.handler(async ({ event, context }) => {
  const tokenAddress = event.srcAddress.toLowerCase();
  const fromAddress = event.params.from.toLowerCase();
  const toAddress = event.params.to.toLowerCase();
  const value = event.params.value;

  

  // Load potential safes
  const chainId = BigInt(event.chainId);
  const toSafeId = `${chainId}_${toAddress}`;
  const fromSafeId = `${chainId}_${fromAddress}`;
  
  const toSafe = await context.RawSafe.get(toSafeId);
  const fromSafe = await context.RawSafe.get(fromSafeId);


  // If neither side is a Safe we track, exit early
  if (!toSafe && !fromSafe) {

    return;
  }

  // Ensure token is tracked
  await ensureTokenTracked(tokenAddress, event, context);

  // Update positions for the Safe that receives tokens
  if (toSafe) {
    await updateSafeTokenPosition(
      toSafe,
      tokenAddress,
      value,
      true, // incoming
      BigInt(event.block.number),
      BigInt(event.block.timestamp),
      event.block.hash.toLowerCase(),
      BigInt(event.logIndex),
      context,
      chainId
    );
  }

  // Update positions for the Safe that sends tokens
  if (fromSafe) {
    await updateSafeTokenPosition(
      fromSafe,
      tokenAddress,
      value,
      false, // outgoing
      BigInt(event.block.number),
      BigInt(event.block.timestamp),
      event.block.hash.toLowerCase(),
      BigInt(event.logIndex),
      context,
      chainId
    );
  }
}, {
  wildcard: true,
  eventFilters: ({ addresses }: { addresses: string[] }) => [{ from: addresses }, { to: addresses }],
});



ISafe.SafeSetup.handler(async ({ event, context }) => {
  const chainId = BigInt(event.chainId);
  
  const safeSetupEntity = {
    id: `${event.block.hash}_${event.logIndex}`,
    chainId: chainId,
    initiator: event.params.initiator.toLowerCase(),
    owners: event.params.owners.map((owner: string) => owner.toLowerCase()),
    threshold: event.params.threshold,
    initializer: event.params.initializer.toLowerCase(),
    fallbackHandler: event.params.fallbackHandler.toLowerCase(),
    blockNumber: BigInt(event.block.number),
    blockTimestamp: BigInt(event.block.timestamp),
    transactionHash: event.block.hash.toLowerCase(),
    logIndex: BigInt(event.logIndex),
  };

  context.SafeSetup.set(safeSetupEntity);

  // Update RawSafe with owners and threshold
  const safeId = `${chainId}_${event.srcAddress.toLowerCase()}`;
  let rawSafe = await context.RawSafe.get(safeId);

  if (rawSafe) {
    const updatedRawSafe = {
      ...rawSafe,
      owners: event.params.owners.map((owner: string) => owner.toLowerCase()),
      threshold: event.params.threshold,
      updatedBlockNumber: BigInt(event.block.number),
      updatedBlockTimestamp: BigInt(event.block.timestamp),
      updatedTransactionHash: event.block.hash.toLowerCase(),
      updatedLogIndex: BigInt(event.logIndex),
    };

    context.RawSafe.set(updatedRawSafe);
  }

  // Create RawSafeMap for each owner
  for (const owner of event.params.owners) {
    const mapId = `${chainId}_${event.srcAddress.toLowerCase()}_${owner.toLowerCase()}`;
    const rawSafeMapEntity = {
      id: mapId,
      rawSafeRefId: safeId,
      chainId: chainId,
      safeAddress: event.srcAddress.toLowerCase(),
      accountAddress: owner.toLowerCase(),
      createdBlockNumber: BigInt(event.block.number),
      createdBlockTimestamp: BigInt(event.block.timestamp),
      createdTransactionHash: event.block.hash.toLowerCase(),
      createdLogIndex: BigInt(event.logIndex),
      updatedBlockNumber: BigInt(event.block.number),
      updatedBlockTimestamp: BigInt(event.block.timestamp),
      updatedTransactionHash: event.block.hash.toLowerCase(),
      updatedLogIndex: BigInt(event.logIndex),
    };

    context.RawSafeMap.set(rawSafeMapEntity);
  }
});

ISafe.ExecutionSuccess.handler(async ({ event, context }) => {
  const chainId = BigInt(event.chainId);
  
  const executionSuccessEntity = {
    id: `${event.block.hash}_${event.logIndex}`,
    chainId: chainId,
    safeAddress: event.srcAddress.toLowerCase(),
    txHash: event.params.txHash,
    payment: event.params.payment,
    blockNumber: BigInt(event.block.number),
    blockTimestamp: BigInt(event.block.timestamp),
    transactionHash: event.block.hash.toLowerCase(),
    logIndex: BigInt(event.logIndex),
  };

  context.ExecutionSuccess.set(executionSuccessEntity);

  // Create RawSafeTransaction entity using available transaction data
  const transactionId = `${event.block.hash}_${event.srcAddress.toLowerCase()}_${event.logIndex}`;
  const safeId = `${chainId}_${event.srcAddress.toLowerCase()}`;

  const rawSafeTransactionEntity = {
    id: transactionId,
    rawSafeRefId: safeId,
    chainId: chainId,
    safeAddress: event.srcAddress.toLowerCase(),
    to: event.transaction.to?.toLowerCase() || "0x0000000000000000000000000000000000000000",
    value: event.transaction.value || BigInt(0),
    data: event.transaction.input || "0x",
    operation: 0, // Default to CALL operation
    safeTxGas: BigInt(0), // Not available from transaction
    baseGas: BigInt(0), // Not available from transaction  
    gasPrice: event.transaction.gasPrice || BigInt(0),
    gasToken: "0x0000000000000000000000000000000000000000", // ETH
    refundReceiver: "0x0000000000000000000000000000000000000000",
    blockNumber: BigInt(event.block.number),
    blockTimestamp: BigInt(event.block.timestamp),
    transactionHash: event.transaction.hash.toLowerCase(),
  };

  context.RawSafeTransaction.set(rawSafeTransactionEntity);

  // Decode the Safe transaction data to get the actual ETH value being sent
  const decodedTx = decodeSafeTransactionData(event.transaction.input);
  if (decodedTx && decodedTx.value > BigInt(0)) {
    context.log.info(`Detected outgoing ETH transfer from Safe: ${decodedTx.value.toString()} wei to ${decodedTx.to}`);
    
    // Track the outgoing ETH transfer
    await trackNativeETHTransfer(
      event.srcAddress.toLowerCase(),
      decodedTx.value,
      false, // outgoing
      BigInt(event.block.number),
      BigInt(event.block.timestamp),
      event.transaction.hash.toLowerCase(),
      BigInt(event.logIndex),
      context,
      chainId
    );
  }
});

ISafe.ExecutionFailure.handler(async ({ event, context }) => {
  const chainId = BigInt(event.chainId);
  
  const executionFailureEntity = {
    id: `${event.block.hash}_${event.logIndex}`,
    chainId: chainId,
    safeAddress: event.srcAddress.toLowerCase(),
    txHash: event.params.txHash,
    payment: event.params.payment,
    blockNumber: BigInt(event.block.number),
    blockTimestamp: BigInt(event.block.timestamp),
    transactionHash: event.block.hash.toLowerCase(),
    logIndex: BigInt(event.logIndex),
  };

  context.ExecutionFailure.set(executionFailureEntity);
});

ISafe.AddedOwner.handler(async ({ event, context }) => {
  const chainId = BigInt(event.chainId);
  const safeId = `${chainId}_${event.srcAddress.toLowerCase()}`;
  let rawSafe = await context.RawSafe.get(safeId);

  if (rawSafe) {
    const newOwner = event.params.owner.toLowerCase();
    if (!rawSafe.owners.includes(newOwner)) {
      const updatedRawSafe = {
        ...rawSafe,
        owners: [...rawSafe.owners, newOwner],
        updatedBlockNumber: BigInt(event.block.number),
        updatedBlockTimestamp: BigInt(event.block.timestamp),
        updatedTransactionHash: event.block.hash.toLowerCase(),
        updatedLogIndex: BigInt(event.logIndex),
      };

      context.RawSafe.set(updatedRawSafe);

      // Create RawSafeMap for new owner
      const mapId = `${chainId}_${event.srcAddress.toLowerCase()}_${newOwner}`;
      const rawSafeMapEntity = {
        id: mapId,
        rawSafeRefId: safeId,
        chainId: chainId,
        safeAddress: event.srcAddress.toLowerCase(),
        accountAddress: newOwner,
        createdBlockNumber: BigInt(event.block.number),
        createdBlockTimestamp: BigInt(event.block.timestamp),
        createdTransactionHash: event.block.hash.toLowerCase(),
        createdLogIndex: BigInt(event.logIndex),
        updatedBlockNumber: BigInt(event.block.number),
        updatedBlockTimestamp: BigInt(event.block.timestamp),
        updatedTransactionHash: event.block.hash.toLowerCase(),
        updatedLogIndex: BigInt(event.logIndex),
      };

      context.RawSafeMap.set(rawSafeMapEntity);
    }
  }
});

ISafe.RemovedOwner.handler(async ({ event, context }) => {
  const chainId = BigInt(event.chainId);
  const safeId = `${chainId}_${event.srcAddress.toLowerCase()}`;
  let rawSafe = await context.RawSafe.get(safeId);

  if (rawSafe) {
    const removedOwner = event.params.owner.toLowerCase();
    const updatedRawSafe = {
      ...rawSafe,
      owners: rawSafe.owners.filter((owner: string) => owner !== removedOwner),
      updatedBlockNumber: BigInt(event.block.number),
      updatedBlockTimestamp: BigInt(event.block.timestamp),
      updatedTransactionHash: event.block.hash.toLowerCase(),
      updatedLogIndex: BigInt(event.logIndex),
    };

    context.RawSafe.set(updatedRawSafe);

    // Remove RawSafeMap for removed owner
    const mapId = `${chainId}_${event.srcAddress.toLowerCase()}_${removedOwner}`;
    context.RawSafeMap.deleteUnsafe(mapId);
  }
});

ISafe.ChangedThreshold.handler(async ({ event, context }) => {
  const chainId = BigInt(event.chainId);
  const safeId = `${chainId}_${event.srcAddress.toLowerCase()}`;
  let rawSafe = await context.RawSafe.get(safeId);

  if (rawSafe) {
    const updatedRawSafe = {
      ...rawSafe,
      threshold: event.params.threshold,
      updatedBlockNumber: BigInt(event.block.number),
      updatedBlockTimestamp: BigInt(event.block.timestamp),
      updatedTransactionHash: event.block.hash.toLowerCase(),
      updatedLogIndex: BigInt(event.logIndex),
    };

    context.RawSafe.set(updatedRawSafe);
  }
});

ISafe.SafeReceived.handler(async ({ event, context }) => {
  const chainId = BigInt(event.chainId);
  
  const safeReceivedEntity = {
    id: `${event.block.hash}_${event.logIndex}`,
    chainId: chainId,
    safeAddress: event.srcAddress.toLowerCase(),
    sender: event.params.sender.toLowerCase(),
    value: event.params.value,
    blockNumber: BigInt(event.block.number),
    blockTimestamp: BigInt(event.block.timestamp),
    transactionHash: event.block.hash.toLowerCase(),
    logIndex: BigInt(event.logIndex),
  };

  context.SafeReceived.set(safeReceivedEntity);

  // Track native ETH transfer
  await trackNativeETHTransfer(
    event.srcAddress.toLowerCase(),
    event.params.value,
    true, // incoming
    BigInt(event.block.number),
    BigInt(event.block.timestamp),
    event.block.hash.toLowerCase(),
    BigInt(event.logIndex),
    context,
    chainId
  );
});



async function updateSafeTokenPosition(
  safe: any,
  tokenAddress: string,
  value: bigint,
  isIncoming: boolean,
  blockNumber: bigint,
  blockTimestamp: bigint,
  transactionHash: string,
  logIndex: bigint,
  context: any,
  chainId: bigint
): Promise<void> {
  const positionId = `${chainId}_${safe.safeAddress}_${tokenAddress}`;
  let position = await context.RawSafeTokenizedPosition.get(positionId);

  const oldAmount = position?.tokenAmount || BigInt(0);
  
  if (!position) {
    context.log.info(`Creating new position for Safe ${safe.safeAddress} token ${tokenAddress}`);
    position = {
      id: positionId,
      rawSafeRefId: safe.id,
      chainId: chainId,
      safeAddress: safe.safeAddress,
      tokenAddress: tokenAddress,
      tokenId: `${chainId}-${tokenAddress}`,
      tokenAmount: BigInt(0),
      createdBlockNumber: blockNumber,
      createdBlockTimestamp: blockTimestamp,
      createdTransactionHash: transactionHash,
      createdLogIndex: logIndex,
      updatedBlockNumber: blockNumber,
      updatedBlockTimestamp: blockTimestamp,
      updatedTransactionHash: transactionHash,
      updatedLogIndex: logIndex,
    };
  }

  if (isIncoming) {
    position.tokenAmount = position.tokenAmount + value;
    context.log.info(`Incoming transfer: ${oldAmount.toString()} + ${value.toString()} = ${position.tokenAmount.toString()}`);
  } else {
    position.tokenAmount = position.tokenAmount >= value 
      ? position.tokenAmount - value 
      : BigInt(0);
    context.log.info(`Outgoing transfer: ${oldAmount.toString()} - ${value.toString()} = ${position.tokenAmount.toString()}`);
  }

  position.updatedBlockNumber = blockNumber;
  position.updatedBlockTimestamp = blockTimestamp;
  position.updatedTransactionHash = transactionHash;
  position.updatedLogIndex = logIndex;

  context.RawSafeTokenizedPosition.set(position);
}

async function ensureTokenTracked(
  tokenAddress: string,
  event: any,
  context: any
): Promise<void> {
  const chainId = BigInt(event.chainId);
  const trackedTokenId = `${chainId}-${tokenAddress}`;
  let tracked = await context.TrackedErc20Token.get(trackedTokenId);

  if (!tracked) {
    tracked = {
      id: trackedTokenId,
      chainId: chainId,
      tokenAddress: tokenAddress,
      tokenId: `${chainId}-${tokenAddress}`,
      interactionCount: BigInt(1),
      firstSeenBlockNumber: BigInt(event.block.number),
      firstSeenBlockTimestamp: BigInt(event.block.timestamp),
      firstSeenTransactionHash: event.block.hash.toLowerCase(),
      lastSeenBlockNumber: BigInt(event.block.number),
      lastSeenBlockTimestamp: BigInt(event.block.timestamp),
      lastSeenTransactionHash: event.block.hash.toLowerCase(),
    };

    // Note: Dynamic contract registration needs to be configured differently in HyperIndex v2
  } else {
    tracked.interactionCount = tracked.interactionCount + BigInt(1);
    tracked.lastSeenBlockNumber = BigInt(event.block.number);
    tracked.lastSeenBlockTimestamp = BigInt(event.block.timestamp);
    tracked.lastSeenTransactionHash = event.block.hash.toLowerCase();
  }

  context.TrackedErc20Token.set(tracked);
}

// Helper function to track native ETH transfers for Safes
export async function trackNativeETHTransfer(
  safeAddress: string,
  value: bigint,
  isIncoming: boolean,
  blockNumber: bigint,
  blockTimestamp: bigint,
  transactionHash: string,
  logIndex: bigint,
  context: any,
  chainId: bigint
): Promise<void> {
  const safeId = `${chainId}_${safeAddress}`;
  const safe = await context.RawSafe.get(safeId);

  if (safe) {
    await updateSafeTokenPosition(
      safe,
      NULL_ADDRESS, // Use null address for native ETH
      value,
      isIncoming,
      blockNumber,
      blockTimestamp,
      transactionHash,
      logIndex,
      context,
      chainId
    );
  }
}

// Function to decode Safe execTransaction call data
function decodeSafeTransactionData(input: string): { to: string; value: bigint; data: string } | null {
  try {
    // execTransaction function signature: execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)
    // Function selector: 0x6a761202
    if (!input.startsWith('0x6a761202')) {
      return null;
    }

    // Remove function selector (first 4 bytes = 8 hex chars)
    const params = input.slice(10);
    
    // Decode parameters (each parameter is 32 bytes = 64 hex chars)
    // Parameter 0: to (address) - bytes 0-31
    const toHex = params.slice(24, 64); // Skip first 24 chars (12 bytes) for address
    const to = '0x' + toHex;

    // Parameter 1: value (uint256) - bytes 32-63  
    const valueHex = params.slice(64, 128);
    const value = BigInt('0x' + valueHex);

    // Parameter 2: data (bytes) - we dont need to parse for now
    const data = '0x'; // Placeholder

    return { to: to.toLowerCase(), value, data };
  } catch (error) {
    return null;
  }
}