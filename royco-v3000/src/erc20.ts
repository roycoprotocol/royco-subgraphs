import { BigInt } from "@graphprotocol/graph-ts";
import { Transfer as TransferEvent } from "../generated/ERC20/ERC20";
import {
  RawSafeTokenizedPosition,
  RawSafe,
  TrackedERC20Token,
} from "../generated/schema";
import { CHAIN_ID, NULL_ADDRESS } from "./constants";
import {
  generateRawSafeId,
  generateRawSafeTokenizedPositionId,
  generateTokenId,
} from "./utils/id-generator";
import { ERC20Template } from "../generated/templates";

export function handleTransfer(event: TransferEvent): void {
  let tokenAddress = event.address.toHexString().toLowerCase();
  let fromAddress = event.params.from.toHexString().toLowerCase();
  let toAddress = event.params.to.toHexString().toLowerCase();
  let value = event.params.value;

  // Load potential safes once
  let toSafe = RawSafe.load(generateRawSafeId(toAddress));
  let fromSafe = RawSafe.load(generateRawSafeId(fromAddress));

  // If neither side is a Safe we track, exit early – saves computation & storage
  if (!toSafe && !fromSafe) {
    return;
  }

  // Update positions for the Safe that receives tokens
  if (toSafe) {
    updateSafeTokenPosition(
      toSafe,
      tokenAddress,
      value,
      true, // incoming
      event.block.number,
      event.block.timestamp,
      event.transaction.hash.toHexString().toLowerCase(),
      event.logIndex
    );
  }

  // Update positions for the Safe that sends tokens
  if (fromSafe) {
    updateSafeTokenPosition(
      fromSafe,
      tokenAddress,
      value,
      false, // outgoing
      event.block.number,
      event.block.timestamp,
      event.transaction.hash.toHexString().toLowerCase(),
      event.logIndex
    );
  }

  // Ensure the token is now tracked via dynamic template so that future
  // transfers bypass the global data source entirely.
  ensureTokenTemplate(event, tokenAddress);
}

function updateSafeTokenPosition(
  safe: RawSafe,
  tokenAddress: string,
  value: BigInt,
  isIncoming: boolean,
  blockNumber: BigInt,
  blockTimestamp: BigInt,
  transactionHash: string,
  logIndex: BigInt
): void {
  let positionId = generateRawSafeTokenizedPositionId(
    safe.safeAddress,
    tokenAddress
  );
  let position = RawSafeTokenizedPosition.load(positionId);

  if (!position) {
    position = new RawSafeTokenizedPosition(positionId);
    position.rawSafeRefId = safe.id;
    position.chainId = CHAIN_ID;
    position.safeAddress = safe.safeAddress;
    position.tokenAddress = tokenAddress;
    position.tokenId = generateTokenId(tokenAddress);
    position.tokenAmount = BigInt.fromI32(0);
    position.createdBlockNumber = blockNumber;
    position.createdBlockTimestamp = blockTimestamp;
    position.createdTransactionHash = transactionHash;
    position.createdLogIndex = logIndex;
  }

  if (isIncoming) {
    position.tokenAmount = position.tokenAmount.plus(value);
  } else {
    position.tokenAmount = position.tokenAmount.ge(value)
      ? position.tokenAmount.minus(value)
      : BigInt.fromI32(0);
  }

  position.updatedBlockNumber = blockNumber;
  position.updatedBlockTimestamp = blockTimestamp;
  position.updatedTransactionHash = transactionHash;
  position.updatedLogIndex = logIndex;

  position.save();
}

// Helper function to track native ETH transfers for Safes
export function trackNativeETHTransfer(
  safeAddress: string,
  value: BigInt,
  isIncoming: boolean,
  blockNumber: BigInt,
  blockTimestamp: BigInt,
  transactionHash: string,
  logIndex: BigInt
): void {
  let safeId = generateRawSafeId(safeAddress);
  let safe = RawSafe.load(safeId);

  if (safe) {
    updateSafeTokenPosition(
      safe,
      NULL_ADDRESS, // Use null address for native ETH
      value,
      isIncoming,
      blockNumber,
      blockTimestamp,
      transactionHash,
      logIndex
    );
  }
}

// Spawn template & maintain TrackedERC20Token bookkeeping
function ensureTokenTemplate(event: TransferEvent, tokenAddress: string): void {
  let trackedTokenId = CHAIN_ID.toString().concat("_").concat(tokenAddress);
  let tracked = TrackedERC20Token.load(trackedTokenId);

  if (tracked == null) {
    // First-time interaction with any Safe – create entity & start template
    tracked = new TrackedERC20Token(trackedTokenId);
    tracked.chainId = CHAIN_ID;
    tracked.tokenAddress = tokenAddress;
    tracked.tokenId = generateTokenId(tokenAddress);
    tracked.interactionCount = BigInt.fromI32(0);
    tracked.firstSeenBlockNumber = event.block.number;
    tracked.firstSeenBlockTimestamp = event.block.timestamp;
    tracked.firstSeenTransactionHash = event.transaction.hash
      .toHexString()
      .toLowerCase();

    // Activate per-token template for subsequent transfers
    ERC20Template.create(event.address);
  }

  // Update rolling stats
  let tk = tracked as TrackedERC20Token;
  tk.interactionCount = tk.interactionCount.plus(BigInt.fromI32(1));
  tk.lastSeenBlockNumber = event.block.number;
  tk.lastSeenBlockTimestamp = event.block.timestamp;
  tk.lastSeenTransactionHash = event.transaction.hash
    .toHexString()
    .toLowerCase();

  tk.save();
}
