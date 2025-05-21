import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  OnChainWithdrawCancelled as OnChainWithdrawCancelledEvent,
  OnChainWithdrawRequested as OnChainWithdrawRequestedEvent,
  OnChainWithdrawSolved as OnChainWithdrawSolvedEvent,
} from "../generated/BoringVaultQueue/BoringVaultQueue";
import {
  BoringWithdrawal,
  OnChainWithdrawCancelled,
  OnChainWithdrawRequested,
  OnChainWithdrawSolved,
  RawGlobalActivity,
} from "../generated/schema";
import { CHAIN_ID, getVaultAddress } from "./constants";
import {
  generateBoringVaultId,
  generateId,
  generateQueueId,
  generateRawGlobalActivityId,
  generateRequestId,
  generateTokenId,
} from "./utils";

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

  const vaultAddress = getVaultAddress(event.address.toHexString());

  // === Create boring withdrawal ===
  let boringWithdrawal = new BoringWithdrawal(
    generateQueueId(vaultAddress, event.params.requestId.toHexString())
  );

  boringWithdrawal.boringVaultRefId = generateBoringVaultId(
    Address.fromString(vaultAddress)
  );
  boringWithdrawal.requestId = event.params.requestId.toHexString();
  boringWithdrawal.chainId = CHAIN_ID;
  boringWithdrawal.vaultAddress = vaultAddress;
  boringWithdrawal.accountAddress = event.params.user.toHexString();
  boringWithdrawal.assetId = generateTokenId(event.params.assetOut);
  boringWithdrawal.assetOut = event.params.assetOut.toHexString();
  boringWithdrawal.nonce = event.params.nonce;
  boringWithdrawal.amountOfShares = event.params.amountOfShares;
  boringWithdrawal.amountOfAssets = event.params.amountOfAssets;
  boringWithdrawal.creationTime = event.params.creationTime;
  boringWithdrawal.secondsToMaturity = BigInt.fromU32(
    event.params.secondsToMaturity
  );
  boringWithdrawal.secondsToDeadline = BigInt.fromU32(
    event.params.secondsToDeadline
  );
  boringWithdrawal.status = "requested";
  boringWithdrawal.expiresAt = BigInt.fromU32(
    event.params.secondsToMaturity
  ).plus(event.block.timestamp);
  boringWithdrawal.blockNumber = event.block.number;
  boringWithdrawal.blockTimestamp = event.block.timestamp;
  boringWithdrawal.transactionHash = event.transaction.hash.toHexString();
  boringWithdrawal.logIndex = event.logIndex;

  boringWithdrawal.save();
  // xxx Create raw global activity xxx

  // === Create raw global activity ===
  let rawGlobalActivity = new RawGlobalActivity(
    generateRawGlobalActivityId(
      event.transaction.hash,
      event.logIndex,
      "boring",
      "withdraw-requested",
      BigInt.fromI32(0)
    )
  );

  rawGlobalActivity.chainId = CHAIN_ID;
  rawGlobalActivity.category = "boring";
  rawGlobalActivity.subCategory = "withdraw-requested";
  rawGlobalActivity.sourceRefId = generateBoringVaultId(
    Address.fromString(vaultAddress)
  );
  rawGlobalActivity.contractAddress = vaultAddress;
  rawGlobalActivity.accountAddress = event.params.user.toHexString();
  rawGlobalActivity.tokenIndex = BigInt.fromI32(0);
  rawGlobalActivity.tokenId = generateTokenId(event.params.assetOut);
  rawGlobalActivity.tokenAddress = event.params.assetOut.toHexString();
  rawGlobalActivity.tokenAmount = event.params.amountOfAssets;
  rawGlobalActivity.blockNumber = event.block.number;
  rawGlobalActivity.blockTimestamp = event.block.timestamp;
  rawGlobalActivity.transactionHash = event.transaction.hash.toHexString();
  rawGlobalActivity.logIndex = event.logIndex;

  rawGlobalActivity.save();
  // xxx Create raw global activity xxx
}

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

  const vaultAddress = getVaultAddress(event.address.toHexString());

  let boringWithdrawal = BoringWithdrawal.load(
    generateQueueId(vaultAddress, event.params.requestId.toHexString())
  );

  if (boringWithdrawal) {
    // === Update boring withdrawal ===
    boringWithdrawal.status = "cancelled";

    boringWithdrawal.blockNumber = event.block.number;
    boringWithdrawal.blockTimestamp = event.block.timestamp;
    boringWithdrawal.transactionHash = event.transaction.hash.toHexString();
    boringWithdrawal.logIndex = event.logIndex;

    boringWithdrawal.save();
    // xxx Update raw global activity xxx

    // === Create raw global activity ===
    let rawGlobalActivity = new RawGlobalActivity(
      generateRawGlobalActivityId(
        event.transaction.hash,
        event.logIndex,
        "boring",
        "withdraw-cancelled",
        BigInt.fromI32(0)
      )
    );

    rawGlobalActivity.chainId = CHAIN_ID;
    rawGlobalActivity.category = "boring";
    rawGlobalActivity.subCategory = "withdraw-cancelled";
    rawGlobalActivity.sourceRefId = boringWithdrawal.boringVaultRefId;
    rawGlobalActivity.contractAddress = vaultAddress;
    rawGlobalActivity.accountAddress = event.params.user.toHexString();
    rawGlobalActivity.tokenIndex = BigInt.fromI32(0);
    rawGlobalActivity.tokenId = generateTokenId(
      Address.fromString(boringWithdrawal.assetOut)
    );
    rawGlobalActivity.tokenAddress = boringWithdrawal.assetOut;
    rawGlobalActivity.tokenAmount = boringWithdrawal.amountOfAssets;
    rawGlobalActivity.blockNumber = event.block.number;
    rawGlobalActivity.blockTimestamp = event.block.timestamp;
    rawGlobalActivity.transactionHash = event.transaction.hash.toHexString();
    rawGlobalActivity.logIndex = event.logIndex;

    rawGlobalActivity.save();
    // xxx Create raw global activity xxx
  }
}

export function handleOnChainWithdrawSolved(
  event: OnChainWithdrawSolvedEvent
): void {
  let entity = new OnChainWithdrawSolved(
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

  const vaultAddress = getVaultAddress(event.address.toHexString());

  let boringWithdrawal = BoringWithdrawal.load(
    generateQueueId(vaultAddress, event.params.requestId.toHexString())
  );

  if (boringWithdrawal) {
    // === Update boring withdrawal ===
    boringWithdrawal.status = "complete";

    boringWithdrawal.blockNumber = event.block.number;
    boringWithdrawal.blockTimestamp = event.block.timestamp;
    boringWithdrawal.transactionHash = event.transaction.hash.toHexString();
    boringWithdrawal.logIndex = event.logIndex;

    boringWithdrawal.save();
    // xxx Update raw global activity xxx

    // === Create raw global activity ===
    let rawGlobalActivity = new RawGlobalActivity(
      generateRawGlobalActivityId(
        event.transaction.hash,
        event.logIndex,
        "boring",
        "withdraw-complete",
        BigInt.fromI32(0)
      )
    );

    rawGlobalActivity.chainId = CHAIN_ID;
    rawGlobalActivity.category = "boring";
    rawGlobalActivity.subCategory = "withdraw-complete";
    rawGlobalActivity.sourceRefId = boringWithdrawal.boringVaultRefId;
    rawGlobalActivity.contractAddress = vaultAddress;
    rawGlobalActivity.accountAddress = event.params.user.toHexString();
    rawGlobalActivity.tokenIndex = BigInt.fromI32(0);
    rawGlobalActivity.tokenId = generateTokenId(
      Address.fromString(boringWithdrawal.assetOut)
    );
    rawGlobalActivity.tokenAddress = boringWithdrawal.assetOut;
    rawGlobalActivity.tokenAmount = boringWithdrawal.amountOfAssets;
    rawGlobalActivity.blockNumber = event.block.number;
    rawGlobalActivity.blockTimestamp = event.block.timestamp;
    rawGlobalActivity.transactionHash = event.transaction.hash.toHexString();
    rawGlobalActivity.logIndex = event.logIndex;

    rawGlobalActivity.save();
    // xxx Create raw global activity xxx
  }
}
