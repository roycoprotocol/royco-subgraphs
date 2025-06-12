import {
  IncentiveCampaignCreated,
  IncentivesAdded,
  IncentivesClaimed,
  IncentivesRemoved,
  RawIncentiveCampaign,
  RawIncentiveClaimBalance,
  RawCoIp,
  RawGlobalActivity,
  RawIncentraAVActionParams,
} from "../../generated/schema";
import {
  generateRawIncentiveCampaignId,
  generateIncentiveId,
  generateRawIncentiveClaimBalanceId,
  generateRawCoIpId,
  generateIncentiveCampaignTag,
  generateRawGlobalActivityId,
  generateTokenId,
} from "../utils/id-generator";
import {
  BIG_INT_ZERO,
  CHAIN_ID,
  INCENTRA_AV_ADDRESS,
} from "../utils/constants";
import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import { decodeIncentraActionParams } from "../utils/action-params-decoder";

export function handleIncentiveCampaignCreation(
  entity: IncentiveCampaignCreated
): void {
  let campaign = new RawIncentiveCampaign(
    generateRawIncentiveCampaignId(entity.incentiveCampaignId)
  );
  campaign.chainId = CHAIN_ID;
  campaign.incentiveCampaignId = entity.incentiveCampaignId;
  campaign.actionVerifier = entity.actionVerifier;
  campaign.actionParams = entity.actionParams;
  campaign.owner = entity.ip;
  campaign.incentivesOfferedIds = entity.incentivesOffered.map<string>(
    (incentiveOffered) => generateIncentiveId(incentiveOffered)
  );
  campaign.incentiveAmountsOffered = entity.incentiveAmountsOffered;
  campaign.incentiveAmountsRemaining = entity.incentiveAmountsOffered;
  campaign.coIPs = [];
  campaign.tag = generateIncentiveCampaignTag(campaign.actionVerifier);
  campaign.blockNumber = entity.blockTimestamp;
  campaign.blockTimestamp = entity.blockTimestamp;
  campaign.transactionHash = entity.transactionHash;
  campaign.logIndex = entity.logIndex;

  // If this is an Incentra campaign, decode the actionParams and create RawIncentraAVActionParams entity
  if (
    entity.actionVerifier.toLowerCase() == INCENTRA_AV_ADDRESS.toLowerCase()
  ) {
    const decodedParams = decodeIncentraActionParams(
      Bytes.fromHexString(entity.actionParams)
    );
    if (decodedParams != null) {
      // Create RawIncentraAVActionParams entity
      let incentraParams = new RawIncentraAVActionParams(
        generateRawIncentiveCampaignId(entity.incentiveCampaignId)
      );
      incentraParams.chainId = CHAIN_ID;
      incentraParams.incentiveCampaignId = entity.incentiveCampaignId;
      incentraParams.rawIncentiveCampaignRefId = campaign.id;
      incentraParams.campaignType = decodedParams.campaignType;
      incentraParams.incentraCampaign =
        decodedParams.incentraCampaign.toHexString();
      incentraParams.blockNumber = entity.blockNumber;
      incentraParams.blockTimestamp = entity.blockTimestamp;
      incentraParams.transactionHash = entity.transactionHash;
      incentraParams.logIndex = entity.logIndex;
      incentraParams.save();
    }
  }

  campaign.save();
}

export function handleAddingIncentives(entity: IncentivesAdded): void {
  let campaign = RawIncentiveCampaign.load(
    generateRawIncentiveCampaignId(entity.incentiveCampaignId)
  );
  if (campaign == null) {
    // Possibly log an error
    return;
  }

  let resultingIncentivesOffered = campaign.incentivesOfferedIds;
  let resultingAmountsOffered = campaign.incentiveAmountsOffered;
  let resultingAmountsRemaining = campaign.incentiveAmountsRemaining;

  // Add incentives to amounts
  // Handle new incentive additions too
  for (
    let additionIndex = 0;
    additionIndex < entity.incentivesOffered.length;
    additionIndex++
  ) {
    let incentive = entity.incentivesOffered[additionIndex];
    let incentiveId = generateIncentiveId(incentive);
    let incentiveIndex = resultingIncentivesOffered.indexOf(incentiveId);
    if (incentiveIndex == -1) {
      resultingIncentivesOffered.push(incentiveId);
      resultingAmountsOffered.push(
        entity.incentiveAmountsOffered[additionIndex]
      );
      resultingAmountsRemaining.push(
        entity.incentiveAmountsOffered[additionIndex]
      );
    } else {
      resultingAmountsOffered[incentiveIndex] = resultingAmountsOffered[
        incentiveIndex
      ].plus(entity.incentiveAmountsOffered[additionIndex]);
      resultingAmountsRemaining[incentiveIndex] = resultingAmountsRemaining[
        incentiveIndex
      ].plus(entity.incentiveAmountsOffered[additionIndex]);
    }
  }

  campaign.incentivesOfferedIds = resultingIncentivesOffered;
  campaign.incentiveAmountsOffered = resultingAmountsOffered;
  campaign.incentiveAmountsRemaining = resultingAmountsRemaining;

  campaign.save();
}

export function handleRemovingIncentives(entity: IncentivesRemoved): void {
  let campaign = RawIncentiveCampaign.load(
    generateRawIncentiveCampaignId(entity.incentiveCampaignId)
  );
  if (campaign == null) {
    // Possibly log an error
    return;
  }

  let resultingIncentivesOffered = campaign.incentivesOfferedIds;
  let resultingAmountsOffered = campaign.incentiveAmountsOffered;
  let resultingAmountsRemaining = campaign.incentiveAmountsRemaining;

  // Reduce the incentives remaining and offered based on the claimed amounts
  for (
    let removalIndex = 0;
    removalIndex < entity.incentivesRemoved.length;
    removalIndex++
  ) {
    let incentive = entity.incentivesRemoved[removalIndex];
    let incentiveId = generateIncentiveId(incentive);
    let incentiveIndex = resultingIncentivesOffered.indexOf(incentiveId);
    resultingAmountsOffered[incentiveIndex] = resultingAmountsOffered[
      incentiveIndex
    ].minus(entity.incentiveAmountsRemoved[removalIndex]);
    resultingAmountsRemaining[incentiveIndex] = resultingAmountsRemaining[
      incentiveIndex
    ].minus(entity.incentiveAmountsRemoved[removalIndex]);
  }

  campaign.incentivesOfferedIds = resultingIncentivesOffered;
  campaign.incentiveAmountsOffered = resultingAmountsOffered;
  campaign.incentiveAmountsRemaining = resultingAmountsRemaining;

  campaign.save();
}

export function handleClaim(entity: IncentivesClaimed): void {
  let campaign = RawIncentiveCampaign.load(
    generateRawIncentiveCampaignId(entity.incentiveCampaignId)
  );
  if (campaign == null) {
    // Possibly log an error
    return;
  }

  // Update the balances entity for this AP
  let balancesId = generateRawIncentiveClaimBalanceId(
    entity.incentiveCampaignId,
    entity.ap
  );
  let balances = RawIncentiveClaimBalance.load(balancesId);
  if (balances == null) {
    balances = new RawIncentiveClaimBalance(balancesId);
    balances.chainId = CHAIN_ID;
    balances.incentiveCampaignId = entity.incentiveCampaignId;
    balances.rawIncentiveCampaignRefId = generateRawIncentiveCampaignId(
      entity.incentiveCampaignId
    );
    balances.accountAddress = entity.ap;
    balances.blockNumber = entity.blockNumber;
    balances.blockTimestamp = entity.blockTimestamp;
    balances.transactionHash = entity.transactionHash;
    balances.logIndex = entity.logIndex;
  }

  let resultingAmountsRemaining = campaign.incentiveAmountsRemaining;

  let resultingIncentives = balances.incentiveIds;
  let resultingBalances = balances.incentiveAmounts;

  // Reduce the incentives remaining based on the claimed amounts
  // Modify the user balances for this campaign
  for (
    let claimedIndex = 0;
    claimedIndex < entity.incentivesClaimed.length;
    claimedIndex++
  ) {
    let incentive = entity.incentivesClaimed[claimedIndex];
    let incentiveId = generateIncentiveId(incentive);
    let incentiveIndex = campaign.incentivesOfferedIds.indexOf(incentiveId);
    resultingAmountsRemaining[incentiveIndex] = resultingAmountsRemaining[
      incentiveIndex
    ].minus(entity.incentiveAmountsPaid[claimedIndex]);

    let balanceIndex = resultingIncentives.indexOf(incentiveId);
    if (balanceIndex == -1) {
      resultingIncentives.push(incentiveId);
      resultingBalances.push(entity.incentiveAmountsPaid[claimedIndex]);
    } else {
      resultingBalances[balanceIndex] = resultingBalances[balanceIndex].plus(
        entity.incentiveAmountsPaid[claimedIndex]
      );
    }
  }

  campaign.incentiveAmountsRemaining = resultingAmountsRemaining;

  balances.incentiveIds = resultingIncentives;
  balances.incentiveAmounts = resultingBalances;

  balances.save();
  campaign.save();

  // Create a raw global activity entity for each incentive claimed
  const category = "v2";
  const subCategory = "claim";
  for (let i = 0; i < entity.incentivesClaimed.length; i++) {
    let rawGlobalActivity = new RawGlobalActivity(
      generateRawGlobalActivityId(
        Bytes.fromHexString(entity.transactionHash),
        entity.logIndex,
        category,
        subCategory,
        BigInt.fromI32(i)
      )
    );

    rawGlobalActivity.chainId = CHAIN_ID;
    rawGlobalActivity.category = category;
    rawGlobalActivity.subCategory = subCategory;
    rawGlobalActivity.sourceRefId = entity.incentiveCampaignId;
    rawGlobalActivity.contractAddress = entity.incentiveLockerAddress;
    rawGlobalActivity.accountAddress = entity.ap.toLowerCase();
    rawGlobalActivity.tokenIndex = BigInt.fromI32(i);
    rawGlobalActivity.tokenId = generateTokenId(
      Address.fromString(entity.incentivesClaimed[i])
    );
    rawGlobalActivity.tokenAddress = entity.incentivesClaimed[i].toLowerCase();
    rawGlobalActivity.tokenAmount = entity.incentiveAmountsPaid[i];
    rawGlobalActivity.blockNumber = entity.blockNumber;
    rawGlobalActivity.blockTimestamp = entity.blockTimestamp;
    rawGlobalActivity.transactionHash = entity.transactionHash;
    rawGlobalActivity.logIndex = entity.logIndex;
    rawGlobalActivity.save();
  }
}

export function handleAddOrRemoveCoIP(
  incentiveCampaignId: string,
  coIpAddresses: string[],
  addCoIp: boolean,
  blockNumber: BigInt,
  blockTimestamp: BigInt,
  transactionHash: string,
  logIndex: BigInt
): void {
  let campaign = RawIncentiveCampaign.load(
    generateRawIncentiveCampaignId(incentiveCampaignId)
  );
  if (campaign == null) {
    // Possibly log an error
    return;
  }
  let newCoIPs = campaign.coIPs;

  for (let i = 0; i < coIpAddresses.length; i++) {
    let coIpAddress = coIpAddresses[i];
    let coIpId = generateRawCoIpId(incentiveCampaignId, coIpAddress);
    let coIP = RawCoIp.load(coIpId);
    if (coIP == null) {
      coIP = new RawCoIp(coIpId);
      coIP.chainId = CHAIN_ID;
      coIP.incentiveCampaignId = incentiveCampaignId;
      coIP.rawIncentiveCampaignRefId =
        generateRawIncentiveCampaignId(incentiveCampaignId);
      coIP.accountAddress = coIpAddress;
      coIP.blockNumber = blockNumber;
      coIP.blockTimestamp = blockTimestamp;
      coIP.transactionHash = transactionHash;
      coIP.logIndex = logIndex;
    }

    coIP.isCoIP = addCoIp;
    coIP.save();

    let coIPIndex = newCoIPs.indexOf(coIpAddress);
    // If adding coIP that doesnt exist add to array
    if (addCoIp && coIPIndex == -1) {
      newCoIPs.push(coIpAddress);
      // If removing coIP that does exist remove from array
    } else if (!addCoIp && coIPIndex != -1) {
      newCoIPs = newCoIPs.splice(coIPIndex, 1);
    }
  }

  campaign.coIPs = newCoIPs;
  campaign.save();
}
