import { BigInt, Address } from "@graphprotocol/graph-ts";
import { Transfer as TransferEvent } from "../generated/templates/ERC20Template/ERC20";
import { RawSafeTokenizedPosition, RawSafe } from "../generated/schema";
import { ERC20 } from "../generated/templates/ERC20Template/ERC20";
import { CHAIN_ID, NULL_ADDRESS } from "./constants";
import {
  generateRawSafeId,
  generateRawSafeTokenizedPositionId,
  generateTokenId,
} from "./utils/id-generator";

export function handleTransfer(event: TransferEvent): void {
  let tokenAddress = event.address.toHexString();
  let fromAddress = event.params.from.toHexString();
  let toAddress = event.params.to.toHexString();
  let value = event.params.value;

  // Check if 'to' address is a tracked Safe
  let toSafeId = generateRawSafeId(toAddress);
  let toSafe = RawSafe.load(toSafeId);
  if (toSafe) {
    updateSafeTokenPosition(
      toSafe,
      tokenAddress,
      value,
      true, // adding tokens
      event.block.number,
      event.block.timestamp,
      event.transaction.hash.toHexString(),
      event.logIndex
    );
  }

  // Check if 'from' address is a tracked Safe
  let fromSafeId = generateRawSafeId(fromAddress);
  let fromSafe = RawSafe.load(fromSafeId);
  if (fromSafe) {
    updateSafeTokenPosition(
      fromSafe,
      tokenAddress,
      value,
      false, // subtracting tokens
      event.block.number,
      event.block.timestamp,
      event.transaction.hash.toHexString(),
      event.logIndex
    );
  }
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
    position.tokenAmount = position.tokenAmount.minus(value);
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
