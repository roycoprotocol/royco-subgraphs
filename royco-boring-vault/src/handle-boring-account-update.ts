import { Int8 } from "@graphprotocol/graph-ts";
import {
  UserDepositedIntoEpoch as UserDepositedIntoEpochEvent,
  UserWithdrawnFromEpoch as UserWithdrawnFromEpochEvent,
} from "../generated/BoringVault/BoringVault";
import { BoringAccountUpdate } from "../generated/schema";
import { CHAIN_ID } from "./constants";
import { generateBoringAccountUpdateId, generateBoringEpochId } from "./utils";

// export function createBoringAccountUpdate(
//   event: UserDepositedIntoEpochEvent | UserWithdrawnFromEpochEvent,
//   updateType: Int8 // 0: deposit (Add), 1: withdraw (Subtract)
// ): void {
//   const boringAccountUpdateId = generateBoringAccountUpdateId(
//     event.address, // Vault address
//     event.params.user, // Account address
//     event.params.epoch // Epoch
//   );

//   let boringEpochId = generateBoringEpochId(
//     event.address, // Vault address
//     event.params.epoch // Epoch
//   );

//   let boringAccountUpdate = BoringAccountUpdate.load(boringAccountUpdateId);

//   if (!boringAccountUpdate) {
//     boringAccountUpdate = new BoringAccountUpdate(boringAccountUpdateId);

//     boringAccountUpdate.boringEpochRefId = boringEpochId;
//     boringAccountUpdate.chainId = CHAIN_ID;
//     boringAccountUpdate.vaultAddress = event.address.toHexString();
//     boringAccountUpdate.accountAddress = event.params.user.toHexString();
//     boringAccountUpdate.epoch = event.params.epoch;
//     boringAccountUpdate.shares = event.params.shareAmount;
//     boringAccountUpdate.blockNumber = event.block.number;
//     boringAccountUpdate.blockTimestamp = event.block.timestamp;
//     boringAccountUpdate.transactionHash = event.transaction.hash.toHexString();
//     boringAccountUpdate.logIndex = event.logIndex;
//   } else {
//     if (updateType == 0) {
//       // Deposit (Add)
//       boringAccountUpdate.shares = boringAccountUpdate.shares.plus(
//         event.params.shareAmount
//       );
//     } else {
//       // Withdraw (Subtract)
//       boringAccountUpdate.shares = boringAccountUpdate.shares.minus(
//         event.params.shareAmount
//       );
//     }
//   }

//   boringAccountUpdate.save();
// }

export function createBoringAccountUpdateDeposit(
  event: UserDepositedIntoEpochEvent
): void {
  const boringAccountUpdateId = generateBoringAccountUpdateId(
    event.address, // Vault address
    event.params.user, // Account address
    event.params.epoch // Epoch
  );

  let boringEpochId = generateBoringEpochId(
    event.address, // Vault address
    event.params.epoch // Epoch
  );

  let boringAccountUpdate = BoringAccountUpdate.load(boringAccountUpdateId);

  if (!boringAccountUpdate) {
    boringAccountUpdate = new BoringAccountUpdate(boringAccountUpdateId);

    boringAccountUpdate.boringEpochRefId = boringEpochId;
    boringAccountUpdate.chainId = CHAIN_ID;
    boringAccountUpdate.vaultAddress = event.address.toHexString();
    boringAccountUpdate.accountAddress = event.params.user.toHexString();
    boringAccountUpdate.epoch = event.params.epoch;
    boringAccountUpdate.shares = event.params.shareAmount;
    boringAccountUpdate.blockNumber = event.block.number;
    boringAccountUpdate.blockTimestamp = event.block.timestamp;
    boringAccountUpdate.transactionHash = event.transaction.hash.toHexString();
    boringAccountUpdate.logIndex = event.logIndex;
  } else {
    boringAccountUpdate.shares = boringAccountUpdate.shares.plus(
      event.params.shareAmount
    );
  }

  boringAccountUpdate.save();
}

export function createBoringAccountUpdateWithdraw(
  event: UserWithdrawnFromEpochEvent
): void {
  const boringAccountUpdateId = generateBoringAccountUpdateId(
    event.address, // Vault address
    event.params.user, // Account address
    event.params.epoch // Epoch
  );

  let boringEpochId = generateBoringEpochId(
    event.address, // Vault address
    event.params.epoch // Epoch
  );

  let boringAccountUpdate = BoringAccountUpdate.load(boringAccountUpdateId);

  if (!boringAccountUpdate) {
    boringAccountUpdate = new BoringAccountUpdate(boringAccountUpdateId);

    boringAccountUpdate.boringEpochRefId = boringEpochId;
    boringAccountUpdate.chainId = CHAIN_ID;
    boringAccountUpdate.vaultAddress = event.address.toHexString();
    boringAccountUpdate.accountAddress = event.params.user.toHexString();
    boringAccountUpdate.epoch = event.params.epoch;
    boringAccountUpdate.shares = event.params.shareAmount;
    boringAccountUpdate.blockNumber = event.block.number;
    boringAccountUpdate.blockTimestamp = event.block.timestamp;
    boringAccountUpdate.transactionHash = event.transaction.hash.toHexString();
    boringAccountUpdate.logIndex = event.logIndex;
  } else {
    boringAccountUpdate.shares = boringAccountUpdate.shares.minus(
      event.params.shareAmount
    );
  }

  boringAccountUpdate.save();
}
