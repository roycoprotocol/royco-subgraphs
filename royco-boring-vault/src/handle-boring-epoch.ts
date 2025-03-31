import { Address, BigInt, Int8 } from "@graphprotocol/graph-ts";
import {
  EpochStarted as EpochStartedEvent,
  RewardsDistributed as RewardsDistributedEvent,
  UserDepositedIntoEpoch as UserDepositedIntoEpochEvent,
  UserRewardsClaimed as UserRewardsClaimedEvent,
  UserWithdrawnFromEpoch as UserWithdrawnFromEpochEvent,
} from "../generated/BoringVault/BoringVault";
import {
  BoringEpoch,
  BoringEpochRewardBalance,
  BoringReward,
  BoringRewardClaimed,
} from "../generated/schema";
import { CHAIN_ID } from "./constants";
import {
  generateBoringRewardId,
  generateBoringEpochId,
  generateBoringEpochRewardBalanceId,
  generateTokenId,
  generateBoringRewardClaimedId,
  generateBoringVaultId,
} from "./utils";

export function createBoringEpoch(
  vaultAddress: Address,
  event: EpochStartedEvent
): void {
  const boringEpochId = generateBoringEpochId(
    vaultAddress, // Vault address
    event.params.epoch // Epoch
  );

  let boringEpoch = BoringEpoch.load(boringEpochId);

  if (!boringEpoch) {
    boringEpoch = new BoringEpoch(boringEpochId);

    boringEpoch.boringVaultRefId = generateBoringVaultId(vaultAddress);
    boringEpoch.chainId = CHAIN_ID;
    boringEpoch.vaultAddress = vaultAddress.toHexString();
    boringEpoch.epoch = event.params.epoch;
    boringEpoch.startTimestamp = event.block.timestamp;
    boringEpoch.endTimestamp = BigInt.zero();
    boringEpoch.eligibleShares = event.params.eligibleShares;
    boringEpoch.rewardIds = [];
    boringEpoch.rewardTokenIds = [];
    boringEpoch.rewardRawAmounts = [];
  }

  boringEpoch.save();

  // If the epoch is not the 0th epoch, update the end timestamp of the previous epoch
  if (boringEpoch.epoch.notEqual(BigInt.zero())) {
    let prevBoringEpochId = generateBoringEpochId(
      vaultAddress, // Vault address
      boringEpoch.epoch.minus(BigInt.fromI32(1)) // Previous epoch
    );

    let prevBoringEpoch = BoringEpoch.load(prevBoringEpochId);

    if (!prevBoringEpoch) {
      return;
    }

    prevBoringEpoch.endTimestamp = event.block.timestamp;
    prevBoringEpoch.save();
  }
}

// export function updateBoringEpochShares(
//   event: any,
//   // event: UserDepositedIntoEpochEvent | UserWithdrawnFromEpochEvent,
//   updateType: Int8 // 0: Deposit (Add), 1: Withdraw (Subtract)
// ): void {
//   const boringEpochId = generateBoringEpochId(
//     event.address, // Vault address
//     event.params.epoch // Epoch
//   );

//   let boringEpoch = BoringEpoch.load(boringEpochId);

//   if (!boringEpoch) {
//     return;
//   }

//   if (updateType == 0) {
//     // Deposit (Add)
//     boringEpoch.eligibleShares = boringEpoch.eligibleShares.plus(
//       event.params.shareAmount
//     );
//   } else {
//     // Withdraw (Subtract)
//     boringEpoch.eligibleShares = boringEpoch.eligibleShares.minus(
//       event.params.shareAmount
//     );
//   }

//   boringEpoch.save();
// }

export function updateBoringEpochSharesDeposit(
  event: UserDepositedIntoEpochEvent
): void {
  const boringEpochId = generateBoringEpochId(
    event.address, // Vault address
    event.params.epoch // Epoch
  );

  let boringEpoch = BoringEpoch.load(boringEpochId);

  if (!boringEpoch) {
    return;
  }

  // Deposit (Add)
  boringEpoch.eligibleShares = boringEpoch.eligibleShares.plus(
    event.params.shareAmount
  );

  boringEpoch.save();
}

export function updateBoringEpochSharesWithdraw(
  event: UserWithdrawnFromEpochEvent
): void {
  const boringEpochId = generateBoringEpochId(
    event.address, // Vault address
    event.params.epoch // Epoch
  );

  let boringEpoch = BoringEpoch.load(boringEpochId);

  if (!boringEpoch) {
    return;
  }

  // Withdraw (Subtract)
  boringEpoch.eligibleShares = boringEpoch.eligibleShares.minus(
    event.params.shareAmount
  );

  boringEpoch.save();
}

export function updateBoringEpochRewards(event: RewardsDistributedEvent): void {
  let startEpoch = event.params.startEpoch;
  let endEpoch = event.params.endEpoch;

  let totalEligibleShares = BigInt.zero();

  for (let i = startEpoch; i <= endEpoch; i = i.plus(BigInt.fromI32(1))) {
    let boringEpochId = generateBoringEpochId(
      event.address, // Vault address
      i // Epoch
    );

    let boringEpoch = BoringEpoch.load(boringEpochId);

    if (boringEpoch) {
      totalEligibleShares = totalEligibleShares.plus(
        boringEpoch.eligibleShares
      );
    }
  }

  for (let i = startEpoch; i <= endEpoch; i = i.plus(BigInt.fromI32(1))) {
    let boringEpochId = generateBoringEpochId(
      event.address, // Vault address
      i // Epoch
    );

    let boringEpoch = BoringEpoch.load(boringEpochId);

    if (boringEpoch) {
      const rewardId = event.params.rewardId;
      const rewardTokenId = generateTokenId(event.params.token);
      const rewardRawAmount = event.params.amount
        .times(boringEpoch.eligibleShares)
        .div(totalEligibleShares);

      boringEpoch.rewardIds.push(rewardId);
      boringEpoch.rewardTokenIds.push(rewardTokenId);
      boringEpoch.rewardRawAmounts.push(rewardRawAmount);

      boringEpoch.save();

      let boringEpochRewardBalanceId = generateBoringEpochRewardBalanceId(
        event.address, // Vault address
        i, // Epoch
        rewardId // Reward ID
      );

      let boringEpochRewardBalance = BoringEpochRewardBalance.load(
        boringEpochRewardBalanceId
      );

      if (!boringEpochRewardBalance) {
        boringEpochRewardBalance = new BoringEpochRewardBalance(
          boringEpochRewardBalanceId
        );

        boringEpochRewardBalance.boringVaultRefId = generateBoringVaultId(
          event.address
        );
        boringEpochRewardBalance.boringEpochRefId = boringEpochId;
        boringEpochRewardBalance.chainId = CHAIN_ID;
        boringEpochRewardBalance.vaultAddress = event.address.toHexString();
        boringEpochRewardBalance.epoch = i;
        boringEpochRewardBalance.rewardId = rewardId;
        boringEpochRewardBalance.tokenId = rewardTokenId;
        boringEpochRewardBalance.tokenAddress =
          event.params.token.toHexString();
        boringEpochRewardBalance.rawAmount = rewardRawAmount;
        boringEpochRewardBalance.startTimestamp = boringEpoch.startTimestamp;
        boringEpochRewardBalance.endTimestamp = boringEpoch.endTimestamp;
        boringEpochRewardBalance.blockNumber = event.block.number;
        boringEpochRewardBalance.blockTimestamp = event.block.timestamp;
        boringEpochRewardBalance.transactionHash =
          event.transaction.hash.toHexString();
        boringEpochRewardBalance.logIndex = event.logIndex;
      }

      boringEpochRewardBalance.save();
    }
  }

  const boringRewardId = generateBoringRewardId(
    event.address, // Vault address
    event.params.rewardId // Reward ID
  );

  let boringReward = BoringReward.load(boringRewardId);

  if (!boringReward) {
    boringReward = new BoringReward(boringRewardId);

    boringReward.boringVaultRefId = generateBoringVaultId(event.address);
    boringReward.chainId = CHAIN_ID;
    boringReward.vaultAddress = event.address.toHexString();
    boringReward.rewardId = event.params.rewardId;
    boringReward.tokenId = generateTokenId(event.params.token);
    boringReward.tokenAddress = event.params.token.toHexString();
    boringReward.rawAmount = event.params.amount;
    boringReward.startEpoch = startEpoch;
    boringReward.endEpoch = endEpoch;
    boringReward.blockNumber = event.block.number;
    boringReward.blockTimestamp = event.block.timestamp;
    boringReward.transactionHash = event.transaction.hash.toHexString();
    boringReward.logIndex = event.logIndex;

    boringReward.save();
  }
}

export function claimBoringReward(event: UserRewardsClaimedEvent): void {
  let boringRewardClaimedId = generateBoringRewardClaimedId(
    event.address, // Vault address
    event.params.user, // Account address
    event.params.rewardId // Reward ID
  );

  let boringRewardClaimed = BoringRewardClaimed.load(boringRewardClaimedId);

  let boringRewardId = generateBoringRewardId(
    event.address, // Vault address
    event.params.rewardId // Reward ID
  );

  if (!boringRewardClaimed) {
    boringRewardClaimed = new BoringRewardClaimed(boringRewardClaimedId);

    boringRewardClaimed.boringVaultRefId = generateBoringVaultId(event.address);
    boringRewardClaimed.boringRewardRefId = boringRewardId;
    boringRewardClaimed.chainId = CHAIN_ID;
    boringRewardClaimed.vaultAddress = event.address.toHexString();
    boringRewardClaimed.accountAddress = event.params.user.toHexString();
    boringRewardClaimed.rewardId = event.params.rewardId;
    boringRewardClaimed.amount = event.params.amount;
    boringRewardClaimed.blockNumber = event.block.number;
    boringRewardClaimed.blockTimestamp = event.block.timestamp;
    boringRewardClaimed.transactionHash = event.transaction.hash.toHexString();
    boringRewardClaimed.logIndex = event.logIndex;

    boringRewardClaimed.save();
  }
}
