import {
  Approval as ApprovalEvent,
  Claimed as ClaimedEvent,
  Deposit as DepositEvent,
  FeesClaimed as FeesClaimedEvent,
  FrontendFeeUpdated as FrontendFeeUpdatedEvent,
  Initialized as InitializedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  RewardsPerTokenUpdated as RewardsPerTokenUpdatedEvent,
  RewardsSet as RewardsSetEvent,
  RewardsTokenAdded as RewardsTokenAddedEvent,
  Transfer as TransferEvent,
  UserRewardsUpdated as UserRewardsUpdatedEvent,
  Withdraw as WithdrawEvent,
} from "../generated/templates/WrappedVault/WrappedVault";
import {
  Approval,
  Claimed,
  Deposit,
  FeesClaimed,
  FrontendFeeUpdated,
  Initialized,
  OwnershipTransferred,
  RewardsPerTokenUpdated,
  RewardsSet,
  RewardsTokenAdded,
  Transfer,
  UserRewardsUpdated,
  Withdraw,
} from "../generated/schema";
import { CHAIN_ID } from "./constants";
import { updateFrontendFee } from "./fee-handler";
import { updateMarketOwner } from "./ownership-handler";
import { handleRawPosition } from "./position-handler";
import { addReward, setReward } from "./reward-handler";
import {
  createOrUpdateRawPositionTokenBalanceVault,
  createOrUpdateRawPositionVault,
  updateRawVolume,
  updateToken0Balance,
} from "./token-balance-handler";
import { generateId, generateRawMarketId, generateTokenId } from "./utils";

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.marketId = event.address.toHexString();
  entity.oldOwner = event.params.oldOwner.toHexString();
  entity.newOwner = event.params.newOwner.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  // Update market owner
  updateMarketOwner(
    event.address.toHexString(),
    event.params.newOwner.toHexString()
  );
}

export function handleFrontendFeeUpdated(event: FrontendFeeUpdatedEvent): void {
  let entity = new FrontendFeeUpdated(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.marketId = event.address.toHexString();
  entity.frontendFee = event.params.frontendFee;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;
  entity.save();

  // Update frontend fee
  updateFrontendFee(event.address.toHexString(), event.params.frontendFee);
}

export function handleRewardsTokenAdded(event: RewardsTokenAddedEvent): void {
  let entity = new RewardsTokenAdded(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.marketId = event.address.toHexString();
  entity.reward = event.params.reward.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  // Add Reward
  addReward(event);
}

export function handleRewardsSet(event: RewardsSetEvent): void {
  let entity = new RewardsSet(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.marketId = event.address.toHexString();
  entity.reward = event.params.reward.toHexString();
  entity.start = event.params.start;
  entity.end = event.params.end;
  entity.rate = event.params.rate;
  entity.totalRewards = event.params.totalRewards;
  entity.protocolFee = event.params.protocolFee;
  entity.frontendFee = event.params.frontendFee;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  // Set Reward
  setReward(event);
}

export function handleTransfer(event: TransferEvent): void {
  let entity = new Transfer(generateId(event.transaction.hash, event.logIndex));
  entity.chainId = CHAIN_ID;
  entity.marketId = event.address.toHexString();

  entity.from = event.params.from.toHexString();
  entity.to = event.params.to.toHexString();
  entity.amount = event.params.amount;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  handleRawPosition(event);
}

export function handleDeposit(event: DepositEvent): void {
  let entity = new Deposit(generateId(event.transaction.hash, event.logIndex));
  entity.chainId = CHAIN_ID;
  entity.marketId = event.address.toHexString();
  entity.caller = event.params.caller.toHexString();
  entity.owner = event.params.owner.toHexString();
  entity.assets = event.params.assets;
  entity.shares = event.params.shares;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleWithdraw(event: WithdrawEvent): void {
  let entity = new Withdraw(generateId(event.transaction.hash, event.logIndex));
  entity.chainId = CHAIN_ID;
  entity.marketId = event.address.toHexString();
  entity.caller = event.params.caller.toHexString();
  entity.receiver = event.params.receiver.toHexString();
  entity.owner = event.params.owner.toHexString();
  entity.assets = event.params.assets;
  entity.shares = event.params.shares;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleClaimed(event: ClaimedEvent): void {
  let entity = new Claimed(generateId(event.transaction.hash, event.logIndex));
  entity.chainId = CHAIN_ID;
  entity.marketId = event.address.toHexString();
  entity.reward = event.params.reward.toHexString();
  entity.user = event.params.user.toHexString();
  entity.receiver = event.params.receiver.toHexString();
  entity.claimed = event.params.claimed;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  // Update Volume for Incentive Token
  updateRawVolume(
    event.address.toHexString(), // Market ID
    generateTokenId(event.params.reward), // Incentive Token ID
    event.params.claimed, // Incentive Token Amount
    event.block.number, // Block Number
    event.block.timestamp, // Block Timestamp
    event.transaction.hash, // Transaction Hash
    event.logIndex, // Log Index
    0 // Add
  );

  updateToken0Balance(event.address, event.params.user.toHexString());

  createOrUpdateRawPositionVault(
    generateRawMarketId(event.address.toHexString()), // Market ID
    event.params.user.toHexString(), // Account Address
    1, // Incentive Token
    generateTokenId(event.params.reward), // Incentive Token ID
    event.params.claimed, // Incentive Token Amount
    0 // Add
  );

  createOrUpdateRawPositionTokenBalanceVault(
    generateRawMarketId(event.address.toHexString()), // Market ID
    event.params.user.toHexString(), // Account Address
    1, // Incentive Token
    generateTokenId(event.params.reward), // Incentive Token ID
    event.params.claimed, // Incentive Token Amount
    0 // Add
  );
}

export function handleRewardsPerTokenUpdated(
  event: RewardsPerTokenUpdatedEvent
): void {
  let entity = new RewardsPerTokenUpdated(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.marketId = event.address.toHexString();
  entity.reward = event.params.reward.toHexString();
  entity.accumulated = event.params.accumulated;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleApproval(event: ApprovalEvent): void {
  let entity = new Approval(generateId(event.transaction.hash, event.logIndex));
  entity.chainId = CHAIN_ID;
  entity.marketId = event.address.toHexString();
  entity.owner = event.params.owner.toHexString();
  entity.spender = event.params.spender.toHexString();
  entity.amount = event.params.amount;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleFeesClaimed(event: FeesClaimedEvent): void {
  let entity = new FeesClaimed(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.marketId = event.address.toHexString();
  entity.claimant = event.params.claimant.toHexString();
  entity.incentiveToken = event.params.incentiveToken.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleUserRewardsUpdated(event: UserRewardsUpdatedEvent): void {
  let entity = new UserRewardsUpdated(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.marketId = event.address.toHexString();
  entity.reward = event.params.reward.toHexString();
  entity.user = event.params.user.toHexString();
  entity.accumulated = event.params.accumulated;
  entity.checkpoint = event.params.checkpoint;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleInitialized(event: InitializedEvent): void {
  let entity = new Initialized(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.marketId = event.address.toHexString();
  entity.version = event.params.version;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}
