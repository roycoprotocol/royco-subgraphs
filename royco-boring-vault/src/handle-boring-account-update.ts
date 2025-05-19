import { Int8, BigInt } from "@graphprotocol/graph-ts";
import {
  UserDepositedIntoEpoch as UserDepositedIntoEpochEvent,
  UserWithdrawnFromEpoch as UserWithdrawnFromEpochEvent,
} from "../generated/BoringVault/BoringVault";
import { BoringAccountUpdate } from "../generated/schema";
import { CHAIN_ID } from "./constants";
import {
  generateBoringAccountUpdateId,
  generateBoringEpochId,
  generateBoringVaultId,
} from "./utils";

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

    boringAccountUpdate.boringVaultRefId = generateBoringVaultId(event.address);
    boringAccountUpdate.boringEpochRefId = boringEpochId;
    boringAccountUpdate.chainId = CHAIN_ID;
    boringAccountUpdate.vaultAddress = event.address.toHexString();
    boringAccountUpdate.accountAddress = event.params.user.toHexString();
    boringAccountUpdate.epoch = event.params.epoch;

    boringAccountUpdate.shares = event.params.shareAmount.lt(BigInt.fromI32(0))
      ? BigInt.fromI32(0)
      : event.params.shareAmount;
    boringAccountUpdate.blockNumber = event.block.number;
    boringAccountUpdate.blockTimestamp = event.block.timestamp;
    boringAccountUpdate.transactionHash = event.transaction.hash.toHexString();
    boringAccountUpdate.logIndex = event.logIndex;
  } else {
    // Add the new shares ensuring the result isn't negative
    boringAccountUpdate.shares = boringAccountUpdate.shares.plus(
      event.params.shareAmount.lt(BigInt.fromI32(0))
        ? BigInt.fromI32(0)
        : event.params.shareAmount
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

    boringAccountUpdate.boringVaultRefId = generateBoringVaultId(event.address);
    boringAccountUpdate.boringEpochRefId = boringEpochId;
    boringAccountUpdate.chainId = CHAIN_ID;
    boringAccountUpdate.vaultAddress = event.address.toHexString();
    boringAccountUpdate.accountAddress = event.params.user.toHexString();
    boringAccountUpdate.epoch = event.params.epoch;
    boringAccountUpdate.shares = BigInt.fromI32(0); // Start with zero instead of withdrawal amount
    boringAccountUpdate.blockNumber = event.block.number;
    boringAccountUpdate.blockTimestamp = event.block.timestamp;
    boringAccountUpdate.transactionHash = event.transaction.hash.toHexString();
    boringAccountUpdate.logIndex = event.logIndex;
  } else {
    // Only subtract if there are enough shares to prevent going negative
    if (boringAccountUpdate.shares.ge(event.params.shareAmount)) {
      boringAccountUpdate.shares = boringAccountUpdate.shares.minus(
        event.params.shareAmount
      );
    } else {
      // If trying to withdraw more than available, set to zero
      boringAccountUpdate.shares = BigInt.fromI32(0);
    }
  }

  boringAccountUpdate.save();
}
