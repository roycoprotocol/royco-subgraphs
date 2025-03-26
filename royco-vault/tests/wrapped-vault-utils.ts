import { newMockEvent } from "matchstick-as";
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts";
import {
  Approval,
  Claimed,
  Deposit,
  FeesClaimed,
  FrontendFeeUpdated,
  Initialized,
  OwnershipHandoverCanceled,
  OwnershipHandoverRequested,
  OwnershipTransferred,
  RewardsPerTokenUpdated,
  RewardsSet,
  RewardsTokenAdded,
  Transfer,
  UserRewardsUpdated,
  Withdraw,
} from "../generated/templates/WrappedVault/WrappedVault";

export function createApprovalEvent(
  owner: Address,
  spender: Address,
  amount: BigInt
): Approval {
  let approvalEvent = changetype<Approval>(newMockEvent());

  approvalEvent.parameters = new Array();

  approvalEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  );
  approvalEvent.parameters.push(
    new ethereum.EventParam("spender", ethereum.Value.fromAddress(spender))
  );
  approvalEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  );

  return approvalEvent;
}

export function createClaimedEvent(
  reward: Address,
  user: Address,
  receiver: Address,
  claimed: BigInt
): Claimed {
  let claimedEvent = changetype<Claimed>(newMockEvent());

  claimedEvent.parameters = new Array();

  claimedEvent.parameters.push(
    new ethereum.EventParam("reward", ethereum.Value.fromAddress(reward))
  );
  claimedEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  );
  claimedEvent.parameters.push(
    new ethereum.EventParam("receiver", ethereum.Value.fromAddress(receiver))
  );
  claimedEvent.parameters.push(
    new ethereum.EventParam(
      "claimed",
      ethereum.Value.fromUnsignedBigInt(claimed)
    )
  );

  return claimedEvent;
}

export function createDepositEvent(
  caller: Address,
  owner: Address,
  assets: BigInt,
  shares: BigInt
): Deposit {
  let depositEvent = changetype<Deposit>(newMockEvent());

  depositEvent.parameters = new Array();

  depositEvent.parameters.push(
    new ethereum.EventParam("caller", ethereum.Value.fromAddress(caller))
  );
  depositEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  );
  depositEvent.parameters.push(
    new ethereum.EventParam("assets", ethereum.Value.fromUnsignedBigInt(assets))
  );
  depositEvent.parameters.push(
    new ethereum.EventParam("shares", ethereum.Value.fromUnsignedBigInt(shares))
  );

  return depositEvent;
}

export function createFeesClaimedEvent(
  claimant: Address,
  incentiveToken: Address
): FeesClaimed {
  let feesClaimedEvent = changetype<FeesClaimed>(newMockEvent());

  feesClaimedEvent.parameters = new Array();

  feesClaimedEvent.parameters.push(
    new ethereum.EventParam("claimant", ethereum.Value.fromAddress(claimant))
  );
  feesClaimedEvent.parameters.push(
    new ethereum.EventParam(
      "incentiveToken",
      ethereum.Value.fromAddress(incentiveToken)
    )
  );

  return feesClaimedEvent;
}

export function createFrontendFeeUpdatedEvent(
  frontendFee: BigInt
): FrontendFeeUpdated {
  let frontendFeeUpdatedEvent = changetype<FrontendFeeUpdated>(newMockEvent());

  frontendFeeUpdatedEvent.parameters = new Array();

  frontendFeeUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "frontendFee",
      ethereum.Value.fromUnsignedBigInt(frontendFee)
    )
  );

  return frontendFeeUpdatedEvent;
}

export function createInitializedEvent(version: BigInt): Initialized {
  let initializedEvent = changetype<Initialized>(newMockEvent());

  initializedEvent.parameters = new Array();

  initializedEvent.parameters.push(
    new ethereum.EventParam(
      "version",
      ethereum.Value.fromUnsignedBigInt(version)
    )
  );

  return initializedEvent;
}

export function createOwnershipHandoverCanceledEvent(
  pendingOwner: Address
): OwnershipHandoverCanceled {
  let ownershipHandoverCanceledEvent = changetype<OwnershipHandoverCanceled>(
    newMockEvent()
  );

  ownershipHandoverCanceledEvent.parameters = new Array();

  ownershipHandoverCanceledEvent.parameters.push(
    new ethereum.EventParam(
      "pendingOwner",
      ethereum.Value.fromAddress(pendingOwner)
    )
  );

  return ownershipHandoverCanceledEvent;
}

export function createOwnershipHandoverRequestedEvent(
  pendingOwner: Address
): OwnershipHandoverRequested {
  let ownershipHandoverRequestedEvent = changetype<OwnershipHandoverRequested>(
    newMockEvent()
  );

  ownershipHandoverRequestedEvent.parameters = new Array();

  ownershipHandoverRequestedEvent.parameters.push(
    new ethereum.EventParam(
      "pendingOwner",
      ethereum.Value.fromAddress(pendingOwner)
    )
  );

  return ownershipHandoverRequestedEvent;
}

export function createOwnershipTransferredEvent(
  oldOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent = changetype<OwnershipTransferred>(
    newMockEvent()
  );

  ownershipTransferredEvent.parameters = new Array();

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("oldOwner", ethereum.Value.fromAddress(oldOwner))
  );
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  );

  return ownershipTransferredEvent;
}

export function createRewardsPerTokenUpdatedEvent(
  reward: Address,
  accumulated: BigInt
): RewardsPerTokenUpdated {
  let rewardsPerTokenUpdatedEvent = changetype<RewardsPerTokenUpdated>(
    newMockEvent()
  );

  rewardsPerTokenUpdatedEvent.parameters = new Array();

  rewardsPerTokenUpdatedEvent.parameters.push(
    new ethereum.EventParam("reward", ethereum.Value.fromAddress(reward))
  );
  rewardsPerTokenUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "accumulated",
      ethereum.Value.fromUnsignedBigInt(accumulated)
    )
  );

  return rewardsPerTokenUpdatedEvent;
}

export function createRewardsSetEvent(
  reward: Address,
  start: BigInt,
  end: BigInt,
  rate: BigInt,
  totalRewards: BigInt,
  protocolFee: BigInt,
  frontendFee: BigInt
): RewardsSet {
  let rewardsSetEvent = changetype<RewardsSet>(newMockEvent());

  rewardsSetEvent.parameters = new Array();

  rewardsSetEvent.parameters.push(
    new ethereum.EventParam("reward", ethereum.Value.fromAddress(reward))
  );
  rewardsSetEvent.parameters.push(
    new ethereum.EventParam("start", ethereum.Value.fromUnsignedBigInt(start))
  );
  rewardsSetEvent.parameters.push(
    new ethereum.EventParam("end", ethereum.Value.fromUnsignedBigInt(end))
  );
  rewardsSetEvent.parameters.push(
    new ethereum.EventParam("rate", ethereum.Value.fromUnsignedBigInt(rate))
  );
  rewardsSetEvent.parameters.push(
    new ethereum.EventParam(
      "totalRewards",
      ethereum.Value.fromUnsignedBigInt(totalRewards)
    )
  );
  rewardsSetEvent.parameters.push(
    new ethereum.EventParam(
      "protocolFee",
      ethereum.Value.fromUnsignedBigInt(protocolFee)
    )
  );
  rewardsSetEvent.parameters.push(
    new ethereum.EventParam(
      "frontendFee",
      ethereum.Value.fromUnsignedBigInt(frontendFee)
    )
  );

  return rewardsSetEvent;
}

export function createRewardsTokenAddedEvent(
  reward: Address
): RewardsTokenAdded {
  let rewardsTokenAddedEvent = changetype<RewardsTokenAdded>(newMockEvent());

  rewardsTokenAddedEvent.parameters = new Array();

  rewardsTokenAddedEvent.parameters.push(
    new ethereum.EventParam("reward", ethereum.Value.fromAddress(reward))
  );

  return rewardsTokenAddedEvent;
}

export function createTransferEvent(
  from: Address,
  to: Address,
  amount: BigInt
): Transfer {
  let transferEvent = changetype<Transfer>(newMockEvent());

  transferEvent.parameters = new Array();

  transferEvent.parameters.push(
    new ethereum.EventParam("from", ethereum.Value.fromAddress(from))
  );
  transferEvent.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to))
  );
  transferEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  );

  return transferEvent;
}

export function createUserRewardsUpdatedEvent(
  reward: Address,
  user: Address,
  accumulated: BigInt,
  checkpoint: BigInt
): UserRewardsUpdated {
  let userRewardsUpdatedEvent = changetype<UserRewardsUpdated>(newMockEvent());

  userRewardsUpdatedEvent.parameters = new Array();

  userRewardsUpdatedEvent.parameters.push(
    new ethereum.EventParam("reward", ethereum.Value.fromAddress(reward))
  );
  userRewardsUpdatedEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  );
  userRewardsUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "accumulated",
      ethereum.Value.fromUnsignedBigInt(accumulated)
    )
  );
  userRewardsUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "checkpoint",
      ethereum.Value.fromUnsignedBigInt(checkpoint)
    )
  );

  return userRewardsUpdatedEvent;
}

export function createWithdrawEvent(
  caller: Address,
  receiver: Address,
  owner: Address,
  assets: BigInt,
  shares: BigInt
): Withdraw {
  let withdrawEvent = changetype<Withdraw>(newMockEvent());

  withdrawEvent.parameters = new Array();

  withdrawEvent.parameters.push(
    new ethereum.EventParam("caller", ethereum.Value.fromAddress(caller))
  );
  withdrawEvent.parameters.push(
    new ethereum.EventParam("receiver", ethereum.Value.fromAddress(receiver))
  );
  withdrawEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  );
  withdrawEvent.parameters.push(
    new ethereum.EventParam("assets", ethereum.Value.fromUnsignedBigInt(assets))
  );
  withdrawEvent.parameters.push(
    new ethereum.EventParam("shares", ethereum.Value.fromUnsignedBigInt(shares))
  );

  return withdrawEvent;
}
