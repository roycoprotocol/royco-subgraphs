import {
  Award as AwardEvent,
  CoIPsAdded as CoIPsAddedEvent,
  CoIPsRemoved as CoIPsRemovedEvent,
  DefaultProtocolFeeClaimantSet as DefaultProtocolFeeClaimantSetEvent,
  DefaultProtocolFeeSet as DefaultProtocolFeeSetEvent,
  FeesClaimed as FeesClaimedEvent,
  IncentiveCampaignCreated as IncentiveCampaignCreatedEvent,
  IncentivesAdded as IncentivesAddedEvent,
  IncentivesClaimed as IncentivesClaimedEvent,
  IncentivesRemoved as IncentivesRemovedEvent,
  OwnershipTransferStarted as OwnershipTransferStartedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  PointsProgramCreated as PointsProgramCreatedEvent,
  PointsProgramOwnershipTransferred as PointsProgramOwnershipTransferredEvent,
  PointsSpent as PointsSpentEvent,
  ProtocolFeeClaimantForCampaignSet as ProtocolFeeClaimantForCampaignSetEvent,
  ProtocolFeeForCampaignSet as ProtocolFeeForCampaignSetEvent,
  SpendCapsUpdated as SpendCapsUpdatedEvent,
} from "../generated/IncentiveLocker/IncentiveLocker";
import {
  Award,
  CoIPsAdded,
  CoIPsRemoved,
  DefaultProtocolFeeClaimantSet,
  DefaultProtocolFeeSet,
  FeesClaimed,
  IncentiveCampaignCreated,
  IncentivesAdded,
  IncentivesClaimed,
  IncentivesRemoved,
  IncentiveLockerOwnershipTransferStarted,
  IncentiveLockerOwnershipTransferred,
  PointsProgramCreated,
  PointsProgramOwnershipTransferred,
  PointsSpent,
  ProtocolFeeClaimantForCampaignSet,
  ProtocolFeeForCampaignSet,
  RawCoIp,
  SpendCapsUpdated,
} from "../generated/schema";
import { Bytes } from "@graphprotocol/graph-ts";
import {
  createRawPointsProgram,
  handleUpdatedSpendCaps,
  handlePointsProgramOwnershipTransfer,
  handleSpendPoints,
  handleAwardPoints,
} from "./handlers/points-handler";
import {
  handleIncentiveCampaignCreation,
  handleAddingIncentives,
  handleRemovingIncentives,
  handleClaim,
  handleAddOrRemoveCoIP,
} from "./handlers/incentive-campaign-handler";
import {
  generateId,
  generateIncentiveId,
  generateRawCoIpId,
  generateRawIncentiveCampaignId,
} from "./utils/id-generator";
import { CHAIN_ID } from "./utils/constants";

export function handleAward(event: AwardEvent): void {
  let entity = new Award(generateId(event.transaction.hash, event.logIndex));
  entity.pointsId = event.params.pointsId.toHexString();
  entity.rawPointsProgramRefId = generateIncentiveId(entity.pointsId);
  entity.recipient = event.params.recipient.toHexString();
  entity.amount = event.params.amount;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();

  entity.save();

  handleAwardPoints(entity);
}

export function handleCoIPsAdded(event: CoIPsAddedEvent): void {
  let entity = new CoIPsAdded(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.incentiveCampaignId = event.params.incentiveCampaignId.toHexString();
  entity.coIPs = event.params.coIPs.map<string>((copIPAddress) =>
    copIPAddress.toHexString()
  );

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  handleAddOrRemoveCoIP(
    entity.incentiveCampaignId,
    entity.coIPs,
    true,
    entity.blockNumber,
    entity.blockTimestamp,
    entity.transactionHash,
    entity.logIndex
  );
}

export function handleCoIPsRemoved(event: CoIPsRemovedEvent): void {
  let entity = new CoIPsRemoved(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.incentiveCampaignId = event.params.incentiveCampaignId.toHexString();
  entity.coIPs = event.params.coIPs.map<string>((copIPAddress) =>
    copIPAddress.toHexString()
  );

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  handleAddOrRemoveCoIP(
    entity.incentiveCampaignId,
    entity.coIPs,
    false,
    entity.blockNumber,
    entity.blockTimestamp,
    entity.transactionHash,
    entity.logIndex
  );
}

export function handleDefaultProtocolFeeClaimantSet(
  event: DefaultProtocolFeeClaimantSetEvent
): void {
  let entity = new DefaultProtocolFeeClaimantSet(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.newDefaultProtocolFeeClaimant =
    event.params.newDefaultProtocolFeeClaimant.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleDefaultProtocolFeeSet(
  event: DefaultProtocolFeeSetEvent
): void {
  let entity = new DefaultProtocolFeeSet(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.newDefaultProtocolFee = event.params.newDefaultProtocolFee;
  entity.chainId = CHAIN_ID;
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
  entity.claimant = event.params.claimant.toHexString();
  entity.incentive = event.params.incentive.toHexString();
  entity.amount = event.params.amount;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleIncentiveCampaignCreated(
  event: IncentiveCampaignCreatedEvent
): void {
  let entity = new IncentiveCampaignCreated(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.incentiveCampaignId = event.params.incentiveCampaignId.toHexString();
  entity.incentiveLockerAddress = event.address.toHexString();
  entity.ip = event.params.ip.toHexString();
  entity.actionVerifier = event.params.actionVerifier.toHexString();
  entity.actionParams = event.params.actionParams.toHexString();
  entity.defaultProtocolFee = event.params.defaultProtocolFee;
  entity.incentivesOffered = event.params.incentivesOffered.map<string>(
    (incentive) => incentive.toHexString()
  );
  entity.incentiveAmountsOffered = event.params.incentiveAmountsOffered;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  handleIncentiveCampaignCreation(entity);
}

export function handleIncentivesAdded(event: IncentivesAddedEvent): void {
  let entity = new IncentivesAdded(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.incentiveCampaignId = event.params.incentiveCampaignId.toHexString();
  entity.ip = event.params.ip.toHexString();
  entity.incentivesOffered = event.params.incentivesOffered.map<string>(
    (incentive) => incentive.toHexString()
  );
  entity.incentiveAmountsOffered = event.params.incentiveAmountsOffered;
  entity.rawIncentiveCampaignRefId = generateRawIncentiveCampaignId(
    entity.incentiveCampaignId
  );

  let coIpId = generateRawCoIpId(entity.incentiveCampaignId, entity.ip);
  let coIP = RawCoIp.load(coIpId);
  if (coIP != null) {
    entity.rawCoIpRefId = coIpId;
  }

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  handleAddingIncentives(entity);
}

export function handleIncentivesClaimed(event: IncentivesClaimedEvent): void {
  let entity = new IncentivesClaimed(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.incentiveCampaignId = event.params.incentiveCampaignId.toHexString();
  entity.ap = event.params.ap.toHexString();
  entity.incentivesClaimed = event.params.incentivesClaimed.map<string>(
    (incentive) => incentive.toHexString()
  );
  entity.incentiveLockerAddress = event.address.toHexString();
  entity.incentiveAmountsPaid = event.params.incentiveAmountsPaid;
  entity.protocolFeesPaid = event.params.protocolFeesPaid;
  entity.rawIncentiveCampaignRefId = generateRawIncentiveCampaignId(
    entity.incentiveCampaignId
  );

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  handleClaim(entity);
}

export function handleIncentivesRemoved(event: IncentivesRemovedEvent): void {
  let entity = new IncentivesRemoved(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.incentiveCampaignId = event.params.incentiveCampaignId.toHexString();
  entity.ip = event.params.ip.toHexString();
  entity.incentivesRemoved = event.params.incentivesRemoved.map<string>(
    (incentive) => incentive.toHexString()
  );
  entity.incentiveAmountsRemoved = event.params.incentiveAmountsRemoved;
  entity.rawIncentiveCampaignRefId = generateRawIncentiveCampaignId(
    entity.incentiveCampaignId
  );

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  handleRemovingIncentives(entity);
}

export function handleOwnershipTransferStarted(
  event: OwnershipTransferStartedEvent
): void {
  let entity = new IncentiveLockerOwnershipTransferStarted(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.previousOwner = event.params.previousOwner.toHexString();
  entity.newOwner = event.params.newOwner.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new IncentiveLockerOwnershipTransferred(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.previousOwner = event.params.previousOwner.toHexString();
  entity.newOwner = event.params.newOwner.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handlePointsProgramCreated(
  event: PointsProgramCreatedEvent
): void {
  let entity = new PointsProgramCreated(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.pointsId = event.params.pointsId.toHexString();
  entity.owner = event.params.owner.toHexString();
  entity.name = event.params.name;
  entity.symbol = event.params.symbol.toHexString();
  entity.decimals = event.params.decimals;
  entity.whitelistedIPs = event.params.whitelistedIPs.map<string>(
    (whitelistedIP) => whitelistedIP.toHexString()
  );
  entity.spendCaps = event.params.spendCaps;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  // Create the points program
  createRawPointsProgram(entity);
}

export function handlePointsProgramOwnershipTransferred(
  event: PointsProgramOwnershipTransferredEvent
): void {
  let entity = new PointsProgramOwnershipTransferred(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.pointsId = event.params.pointsId.toHexString();
  entity.rawPointsProgramRefId = generateIncentiveId(entity.pointsId);
  entity.newOwner = event.params.newOwner.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  handlePointsProgramOwnershipTransfer(entity.pointsId, entity.newOwner);
}

export function handlePointsSpent(event: PointsSpentEvent): void {
  let entity = new PointsSpent(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.pointsId = event.params.pointsId.toHexString();
  entity.rawPointsProgramRefId = generateIncentiveId(entity.pointsId);
  entity.ip = event.params.ip.toHexString();
  entity.amount = event.params.amount;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  handleSpendPoints(entity.pointsId, entity.ip, entity.amount);
}

export function handleProtocolFeeClaimantForCampaignSet(
  event: ProtocolFeeClaimantForCampaignSetEvent
): void {
  let entity = new ProtocolFeeClaimantForCampaignSet(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.incentiveCampaignId = event.params.incentiveCampaignId.toHexString();
  entity.newProtocolFeeClaimant =
    event.params.newProtocolFeeClaimant.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleProtocolFeeForCampaignSet(
  event: ProtocolFeeForCampaignSetEvent
): void {
  let entity = new ProtocolFeeForCampaignSet(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.incentiveCampaignId = event.params.incentiveCampaignId.toHexString();
  entity.newProtocolFee = event.params.newProtocolFee;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleSpendCapsUpdated(event: SpendCapsUpdatedEvent): void {
  let entity = new SpendCapsUpdated(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.pointsId = event.params.pointsId.toHexString();
  entity.ips = event.params.ips.map<string>((ip) => ip.toHexString());
  entity.spendCaps = event.params.spendCaps;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  // Update the whitelisted IPs for this event
  handleUpdatedSpendCaps(entity);
}
