import { BigInt } from "@graphprotocol/graph-ts";
import { Transfer as TransferEvent } from "../generated/BoringVault/BoringVault";
import { RawPositionBoring } from "../generated/schema";
import { CHAIN_ID, NULL_ADDRESS } from "./constants";
import { generateRawPositionId } from "./utils";

export function handleRawPosition(event: TransferEvent): void {
  let vaultAddress = event.address.toHexString();

  let fromAddress = event.params.from.toHexString();
  let toAddress = event.params.to.toHexString();

  let shares = event.params.amount;

  if (fromAddress == NULL_ADDRESS) {
    // mint shares
    let rawPositionRefId = generateRawPositionId(vaultAddress, toAddress);
    let rawPosition = RawPositionBoring.load(rawPositionRefId);

    if (!rawPosition) {
      rawPosition = new RawPositionBoring(rawPositionRefId);

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
    }

    rawPosition.save();
  } else if (toAddress == NULL_ADDRESS) {
    // burn shares
    let rawPositionRefId = generateRawPositionId(vaultAddress, fromAddress);
    let rawPosition = RawPositionBoring.load(rawPositionRefId);

    if (!rawPosition) {
      rawPosition = new RawPositionBoring(rawPositionRefId);

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
    }

    rawPosition.save();
  } else {
    // this is account to account transfer
    if (fromAddress != toAddress) {
      let rawPositionRefIdFrom = generateRawPositionId(
        vaultAddress,
        fromAddress
      );
      let rawPositionFrom = RawPositionBoring.load(rawPositionRefIdFrom);

      // Subtract shares from the from address
      if (!rawPositionFrom) {
        rawPositionFrom = new RawPositionBoring(rawPositionRefIdFrom);

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
      }

      let rawPositionRefIdTo = generateRawPositionId(vaultAddress, toAddress);
      let rawPositionTo = RawPositionBoring.load(rawPositionRefIdTo);

      // Add shares to the to address
      if (!rawPositionTo) {
        rawPositionTo = new RawPositionBoring(rawPositionRefIdTo);

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
      }

      rawPositionTo.save();
    }
  }
}
