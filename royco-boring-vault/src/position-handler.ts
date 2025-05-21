import { BigInt } from "@graphprotocol/graph-ts";
import { Transfer as TransferEvent } from "../generated/BoringVault/BoringVault";
import { RawGlobalAccountUpdate, RawPositionBoring } from "../generated/schema";
import { CHAIN_ID, NULL_ADDRESS } from "./constants";
import {
  generateRawPositionId,
  generateBoringVaultId,
  generateRawGlobalAccountUpdateId,
} from "./utils";

export function handleRawPosition(event: TransferEvent): void {
  let vaultAddress = event.address.toHexString();

  let fromAddress = event.params.from.toHexString();
  let toAddress = event.params.to.toHexString();

  let boringVaultRefId = generateBoringVaultId(event.address);

  let shares = event.params.amount;

  if (fromAddress == NULL_ADDRESS) {
    // this is deposit inside the vault
    // mint shares
    let rawPositionRefId = generateRawPositionId(vaultAddress, toAddress);
    let rawPosition = RawPositionBoring.load(rawPositionRefId);

    if (!rawPosition) {
      rawPosition = new RawPositionBoring(rawPositionRefId);

      rawPosition.boringVaultRefId = boringVaultRefId;
      rawPosition.chainId = CHAIN_ID;
      rawPosition.vaultAddress = vaultAddress;
      rawPosition.accountAddress = toAddress;
      rawPosition.shares = shares;
      rawPosition.blockNumber = event.block.number;
      rawPosition.blockTimestamp = event.block.timestamp;
      rawPosition.transactionHash = event.transaction.hash.toHexString();
      rawPosition.logIndex = event.logIndex;
    } else {
      rawPosition.shares = rawPosition.shares.plus(shares);

      rawPosition.blockNumber = event.block.number;
      rawPosition.blockTimestamp = event.block.timestamp;
      rawPosition.transactionHash = event.transaction.hash.toHexString();
      rawPosition.logIndex = event.logIndex;
    }

    rawPosition.save();

    // === Create raw global account update ===
    let rawGlobalAccountUpdate = new RawGlobalAccountUpdate(
      generateRawGlobalAccountUpdateId(
        rawPosition.vaultAddress, // vault address
        rawPosition.accountAddress, // account address
        rawPosition.blockTimestamp // block timestamp
      )
    );

    rawGlobalAccountUpdate.chainId = rawPosition.chainId;
    rawGlobalAccountUpdate.sourceRefId = rawPosition.boringVaultRefId;
    rawGlobalAccountUpdate.sourceAddress = rawPosition.vaultAddress;
    rawGlobalAccountUpdate.sourceCategory = "boring";
    rawGlobalAccountUpdate.accountAddress = rawPosition.accountAddress;
    rawGlobalAccountUpdate.shares = rawPosition.shares;
    rawGlobalAccountUpdate.blockNumber = rawPosition.blockNumber;
    rawGlobalAccountUpdate.blockTimestamp = rawPosition.blockTimestamp;
    rawGlobalAccountUpdate.transactionHash = rawPosition.transactionHash;
    rawGlobalAccountUpdate.logIndex = rawPosition.logIndex;

    rawGlobalAccountUpdate.save();
    // xxx Create raw global account update xxx
  } else if (toAddress == NULL_ADDRESS) {
    // this is withdraw from the vault
    // burn shares
    let rawPositionRefId = generateRawPositionId(vaultAddress, fromAddress);
    let rawPosition = RawPositionBoring.load(rawPositionRefId);

    if (!rawPosition) {
      rawPosition = new RawPositionBoring(rawPositionRefId);

      rawPosition.boringVaultRefId = boringVaultRefId;
      rawPosition.chainId = CHAIN_ID;
      rawPosition.vaultAddress = vaultAddress;
      rawPosition.accountAddress = fromAddress;
      rawPosition.shares = BigInt.fromI32(0).minus(shares);
      rawPosition.blockNumber = event.block.number;
      rawPosition.blockTimestamp = event.block.timestamp;
      rawPosition.transactionHash = event.transaction.hash.toHexString();
      rawPosition.logIndex = event.logIndex;
    } else {
      rawPosition.shares = rawPosition.shares.minus(shares);

      rawPosition.blockNumber = event.block.number;
      rawPosition.blockTimestamp = event.block.timestamp;
      rawPosition.transactionHash = event.transaction.hash.toHexString();
      rawPosition.logIndex = event.logIndex;
    }

    rawPosition.save();

    // === Create raw global account update ===
    let rawGlobalAccountUpdate = new RawGlobalAccountUpdate(
      generateRawGlobalAccountUpdateId(
        rawPosition.vaultAddress, // vault address
        rawPosition.accountAddress, // account address
        rawPosition.blockTimestamp // block timestamp
      )
    );

    rawGlobalAccountUpdate.chainId = rawPosition.chainId;
    rawGlobalAccountUpdate.sourceRefId = rawPosition.boringVaultRefId;
    rawGlobalAccountUpdate.sourceAddress = rawPosition.vaultAddress;
    rawGlobalAccountUpdate.sourceCategory = "boring";
    rawGlobalAccountUpdate.accountAddress = rawPosition.accountAddress;
    rawGlobalAccountUpdate.shares = rawPosition.shares;
    rawGlobalAccountUpdate.blockNumber = rawPosition.blockNumber;
    rawGlobalAccountUpdate.blockTimestamp = rawPosition.blockTimestamp;
    rawGlobalAccountUpdate.transactionHash = rawPosition.transactionHash;
    rawGlobalAccountUpdate.logIndex = rawPosition.logIndex;

    rawGlobalAccountUpdate.save();
    // xxx Create raw global account update xxx
  } else {
    // this is account to account transfer of shares
    if (fromAddress != toAddress) {
      let rawPositionRefIdFrom = generateRawPositionId(
        vaultAddress,
        fromAddress
      );
      let rawPositionFrom = RawPositionBoring.load(rawPositionRefIdFrom);

      // Subtract shares from the from address
      if (!rawPositionFrom) {
        rawPositionFrom = new RawPositionBoring(rawPositionRefIdFrom);

        rawPositionFrom.boringVaultRefId = boringVaultRefId;
        rawPositionFrom.chainId = CHAIN_ID;
        rawPositionFrom.vaultAddress = vaultAddress;
        rawPositionFrom.accountAddress = fromAddress;
        rawPositionFrom.shares = BigInt.fromI32(0).minus(shares);
        rawPositionFrom.blockNumber = event.block.number;
        rawPositionFrom.blockTimestamp = event.block.timestamp;
        rawPositionFrom.transactionHash = event.transaction.hash.toHexString();
        rawPositionFrom.logIndex = event.logIndex;
      } else {
        rawPositionFrom.shares = rawPositionFrom.shares.minus(shares);

        rawPositionFrom.blockNumber = event.block.number;
        rawPositionFrom.blockTimestamp = event.block.timestamp;
        rawPositionFrom.transactionHash = event.transaction.hash.toHexString();
        rawPositionFrom.logIndex = event.logIndex;
      }

      let rawPositionRefIdTo = generateRawPositionId(vaultAddress, toAddress);
      let rawPositionTo = RawPositionBoring.load(rawPositionRefIdTo);

      // Add shares to the to address
      if (!rawPositionTo) {
        rawPositionTo = new RawPositionBoring(rawPositionRefIdTo);

        rawPositionTo.boringVaultRefId = boringVaultRefId;
        rawPositionTo.chainId = CHAIN_ID;
        rawPositionTo.vaultAddress = vaultAddress;
        rawPositionTo.accountAddress = toAddress;
        rawPositionTo.shares = shares;
        rawPositionTo.blockNumber = event.block.number;
        rawPositionTo.blockTimestamp = event.block.timestamp;
        rawPositionTo.transactionHash = event.transaction.hash.toHexString();
        rawPositionTo.logIndex = event.logIndex;
      } else {
        rawPositionTo.shares = rawPositionTo.shares.plus(shares);

        rawPositionTo.blockNumber = event.block.number;
        rawPositionTo.blockTimestamp = event.block.timestamp;
        rawPositionTo.transactionHash = event.transaction.hash.toHexString();
        rawPositionTo.logIndex = event.logIndex;
      }

      // Save raw position from and to
      rawPositionFrom.save();
      rawPositionTo.save();

      // === Create raw global account update for from address ===
      let rawGlobalAccountUpdateFrom = new RawGlobalAccountUpdate(
        generateRawGlobalAccountUpdateId(
          rawPositionFrom.vaultAddress, // vault address
          rawPositionFrom.accountAddress, // account address
          rawPositionFrom.blockTimestamp // block timestamp
        )
      );

      rawGlobalAccountUpdateFrom.chainId = rawPositionFrom.chainId;
      rawGlobalAccountUpdateFrom.sourceRefId = rawPositionFrom.boringVaultRefId;
      rawGlobalAccountUpdateFrom.sourceAddress = rawPositionFrom.vaultAddress;
      rawGlobalAccountUpdateFrom.sourceCategory = "boring";
      rawGlobalAccountUpdateFrom.accountAddress =
        rawPositionFrom.accountAddress;
      rawGlobalAccountUpdateFrom.shares = rawPositionFrom.shares;
      rawGlobalAccountUpdateFrom.blockNumber = rawPositionFrom.blockNumber;
      rawGlobalAccountUpdateFrom.blockTimestamp =
        rawPositionFrom.blockTimestamp;
      rawGlobalAccountUpdateFrom.transactionHash =
        rawPositionFrom.transactionHash;
      rawGlobalAccountUpdateFrom.logIndex = rawPositionFrom.logIndex;

      rawGlobalAccountUpdateFrom.save();
      // xxx Create raw global account update xxx

      // === Create raw global account update for to address ===
      let rawGlobalAccountUpdateTo = new RawGlobalAccountUpdate(
        generateRawGlobalAccountUpdateId(
          rawPositionTo.vaultAddress, // vault address
          rawPositionTo.accountAddress, // account address
          rawPositionTo.blockTimestamp // block timestamp
        )
      );

      rawGlobalAccountUpdateTo.chainId = rawPositionTo.chainId;
      rawGlobalAccountUpdateTo.sourceRefId = rawPositionTo.boringVaultRefId;
      rawGlobalAccountUpdateTo.sourceAddress = rawPositionTo.vaultAddress;
      rawGlobalAccountUpdateTo.sourceCategory = "boring";
      rawGlobalAccountUpdateTo.accountAddress = rawPositionTo.accountAddress;
      rawGlobalAccountUpdateTo.shares = rawPositionTo.shares;
      rawGlobalAccountUpdateTo.blockNumber = rawPositionTo.blockNumber;
      rawGlobalAccountUpdateTo.blockTimestamp = rawPositionTo.blockTimestamp;
      rawGlobalAccountUpdateTo.transactionHash = rawPositionTo.transactionHash;
      rawGlobalAccountUpdateTo.logIndex = rawPositionTo.logIndex;

      rawGlobalAccountUpdateTo.save();
      // xxx Create raw global account update xxx
    }
  }
}
