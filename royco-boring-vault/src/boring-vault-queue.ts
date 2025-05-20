import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  AuthorityUpdated as AuthorityUpdatedEvent,
  OnChainWithdrawCancelled as OnChainWithdrawCancelledEvent,
  OnChainWithdrawRequested as OnChainWithdrawRequestedEvent,
  OnChainWithdrawSolved as OnChainWithdrawSolvedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  Paused as PausedEvent,
  Unpaused as UnpausedEvent,
  WithdrawAssetSetup as WithdrawAssetSetupEvent,
  WithdrawAssetStopped as WithdrawAssetStoppedEvent,
  WithdrawAssetUpdated as WithdrawAssetUpdatedEvent,
} from "../generated/BoringVaultQueue/BoringVaultQueue";
import {
  OnChainWithdrawCancelled,
  OnChainWithdrawRequested,
  OnChainWithdrawSolved,
} from "../generated/schema";
import { CHAIN_ID } from "./constants";
import {
  generateBoringVaultId,
  generateBoringWithdrawalId,
  generateId,
  generateRequestId,
  generateTokenId,
} from "./utils";
import { createRawGlobalActivity } from "./global-activity-handler";

export function handleOnChainWithdrawCancelled(
  event: OnChainWithdrawCancelledEvent
): void {
  let entity = new OnChainWithdrawCancelled(
    generateId(event.address, event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.vaultQueueAddress = event.address.toHexString();
  entity.requestId = event.params.requestId.toHexString();
  entity.user = event.params.user.toHexString();
  entity.timestamp = event.params.timestamp;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  //check if request exists
  let request = OnChainWithdrawRequested.load(
    generateRequestId(event.address, event.params.requestId)
  );

  if (request) {
    const sourceRefId = generateBoringVaultId(event.address);

    const tokenId = generateTokenId(Address.fromString(request.assetOut));

    //try to get the vault for the token

    createRawGlobalActivity(
      "boring",
      "withdraw-cancelled",
      sourceRefId,
      event.address.toHexString(),
      event.params.user.toHexString(),
      BigInt.fromI32(0),
      tokenId,
      request.amountOfAssets,
      event.block.number,
      event.block.timestamp,
      event.transaction.hash,
      event.logIndex
    );
  }
}

export function handleOnChainWithdrawRequested(
  event: OnChainWithdrawRequestedEvent
): void {
  let entity = new OnChainWithdrawRequested(
    generateRequestId(event.address, event.params.requestId)
  );

  entity.chainId = CHAIN_ID;
  entity.vaultQueueAddress = event.address.toHexString();
  entity.requestId = event.params.requestId.toHexString();
  entity.user = event.params.user.toHexString();
  entity.assetOut = event.params.assetOut.toHexString();
  entity.nonce = event.params.nonce;
  entity.amountOfShares = event.params.amountOfShares;
  entity.amountOfAssets = event.params.amountOfAssets;
  entity.creationTime = event.params.creationTime;
  entity.secondsToMaturity = BigInt.fromU32(event.params.secondsToMaturity);
  entity.secondsToDeadline = BigInt.fromU32(event.params.secondsToDeadline);

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  const sourceRefId = generateBoringVaultId(event.address);

  const tokenId = generateTokenId(event.params.assetOut);

  //try to get the vault for the token

  createRawGlobalActivity(
    "boring",
    "withdraw-requested",
    sourceRefId,
    event.address.toHexString(),
    event.params.user.toHexString(),
    BigInt.fromI32(0),
    tokenId,
    event.params.amountOfAssets,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash,
    event.logIndex
  );
}

//note: wasn't sure if we should use this, so commented out for now
// export function handleOnChainWithdrawSolved(
//   event: OnChainWithdrawSolvedEvent
// ): void {
//   let entity = new OnChainWithdrawSolved(
//     generateId(event.address, event.transaction.hash, event.logIndex)
//   );
//   entity.chainId = CHAIN_ID;
//   entity.vaultQueueAddress = event.address.toHexString();
//   entity.requestId = event.params.requestId.toHexString();
//   entity.user = event.params.user.toHexString();
//   entity.timestamp = event.params.timestamp;

//   entity.blockNumber = event.block.number;
//   entity.blockTimestamp = event.block.timestamp;
//   entity.transactionHash = event.transaction.hash.toHexString();
//   entity.logIndex = event.logIndex;

//   entity.save();

// }
