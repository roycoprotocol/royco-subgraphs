import {
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
    ProtocolFeeClaimantForCampaignSet as ProtocolFeeClaimantForCampaignSetEvent,
    ProtocolFeeForCampaignSet as ProtocolFeeForCampaignSetEvent,
} from "../../generated/IncentiveLocker/IncentiveLocker"
import {
    CoIPsAdded,
    CoIPsRemoved,
    DefaultProtocolFeeClaimantSet,
    DefaultProtocolFeeSet,
    FeesClaimed,
    IncentiveCampaignCreated,
    IncentivesAdded,
    IncentivesClaimed,
    IncentivesRemoved,
    OwnershipTransferStarted,
    OwnershipTransferred,
    ProtocolFeeClaimantForCampaignSet,
    ProtocolFeeForCampaignSet,
    RawIncentiveCampaign,
    RawPointsProgram,
    RawIncentiveCampaignBalance,
    RawCoIp
} from "../../generated/schema"
import { generateRawIncentiveCampaignId, generateIncentiveId, generateRawIncentiveCampaignBalanceId, generateRawCoIpId } from "../utils/id-generator"
import { BIG_INT_ZERO, CHAIN_ID } from "../utils/constants"
import { BigInt } from "@graphprotocol/graph-ts";


export function handleIncentiveCampaignCreation(entity: IncentiveCampaignCreated): void {
    let campaign = new RawIncentiveCampaign(generateRawIncentiveCampaignId(entity.incentiveCampaignId));
    campaign.chainId = CHAIN_ID;
    campaign.incentiveCampaignId = entity.incentiveCampaignId;
    campaign.actionVerifier = entity.actionVerifier;
    campaign.actionParams = entity.actionParams;
    campaign.owner = entity.ip;
    campaign.incentivesOfferedIds = entity.incentivesOffered.map<string>((incentiveOffered) =>
        generateIncentiveId(incentiveOffered)
    );
    campaign.incentiveAmountsOffered = entity.incentiveAmountsOffered;
    campaign.incentiveAmountsRemaining = entity.incentiveAmountsOffered;
    campaign.blockNumber = entity.blockTimestamp;
    campaign.blockTimestamp = entity.blockTimestamp;
    campaign.transactionHash = entity.transactionHash;
    campaign.logIndex = entity.logIndex;

    campaign.save();
}

export function handleAddingIncentives(entity: IncentivesAdded): void {
    let campaign = RawIncentiveCampaign.load(generateRawIncentiveCampaignId(entity.incentiveCampaignId));
    if (campaign == null) {
        // Possibly log an error
        return;
    }

    let resultingIncentivesOffered = campaign.incentivesOfferedIds;
    let resultingAmountsOffered = campaign.incentiveAmountsOffered;
    let resultingAmountsRemaining = campaign.incentiveAmountsRemaining;

    // Add incentives to amounts
    // Handle new incentive additions too
    entity.incentivesOffered.forEach((incentive, additionIndex) => {
        let incentiveId = generateIncentiveId(incentive);
        let incentiveIndex = resultingIncentivesOffered.indexOf(incentiveId);
        if (incentiveIndex == null) {
            resultingIncentivesOffered.push(incentiveId);
            resultingAmountsOffered.push(entity.incentiveAmountsOffered[additionIndex])
            resultingAmountsRemaining.push(entity.incentiveAmountsOffered[additionIndex])
        } else {
            resultingAmountsOffered[incentiveIndex] = resultingAmountsOffered[incentiveIndex].plus(entity.incentiveAmountsOffered[additionIndex])
            resultingAmountsRemaining[incentiveIndex] = resultingAmountsRemaining[incentiveIndex].plus(entity.incentiveAmountsOffered[additionIndex])
        }
    })

    campaign.incentivesOfferedIds = resultingIncentivesOffered;
    campaign.incentiveAmountsOffered = resultingAmountsOffered;
    campaign.incentiveAmountsRemaining = resultingAmountsRemaining;

    campaign.save();
}

export function handleRemovingIncentives(entity: IncentivesRemoved): void {
    let campaign = RawIncentiveCampaign.load(generateRawIncentiveCampaignId(entity.incentiveCampaignId));
    if (campaign == null) {
        // Possibly log an error
        return;
    }

    let resultingIncentivesOffered = campaign.incentivesOfferedIds;
    let resultingAmountsOffered = campaign.incentiveAmountsOffered;
    let resultingAmountsRemaining = campaign.incentiveAmountsRemaining;

    // Reduce the incentives remaining and offered based on the claimed amounts
    entity.incentivesRemoved.forEach((incentive, removalIndex) => {
        let incentiveId = generateIncentiveId(incentive);
        let incentiveIndex = resultingIncentivesOffered.indexOf(incentiveId);
        resultingAmountsOffered[incentiveIndex] = resultingAmountsOffered[incentiveIndex].minus(entity.incentiveAmountsRemoved[removalIndex]);
        // If amount offered becomes zero, treat it like the incentive was never offered
        if (resultingAmountsOffered[incentiveIndex] == BIG_INT_ZERO) {
            resultingIncentivesOffered.splice(incentiveIndex, 1);
            resultingAmountsOffered.splice(incentiveIndex, 1);
            resultingAmountsRemaining.splice(incentiveIndex, 1);
            return;
        }
        resultingAmountsRemaining[incentiveIndex] = resultingAmountsRemaining[incentiveIndex].minus(entity.incentiveAmountsRemoved[removalIndex]);
    })

    campaign.incentivesOfferedIds = resultingIncentivesOffered;
    campaign.incentiveAmountsOffered = resultingAmountsOffered;
    campaign.incentiveAmountsRemaining = resultingAmountsRemaining;

    campaign.save();
}

export function handleClaim(entity: IncentivesClaimed): void {
    let campaign = RawIncentiveCampaign.load(generateRawIncentiveCampaignId(entity.incentiveCampaignId));
    if (campaign == null) {
        // Possibly log an error
        return;
    }

    // Update the balances entity for this AP
    let balancesId = generateRawIncentiveCampaignBalanceId(entity.incentiveCampaignId, entity.ap);
    let balances = RawIncentiveCampaignBalance.load(balancesId)
    if (balances == null) {
        balances = new RawIncentiveCampaignBalance(balancesId);
        balances.chainId = CHAIN_ID;
        balances.incentiveCampaignId = entity.incentiveCampaignId;
        balances.rawIncentiveCampaignRefId = generateRawIncentiveCampaignId(entity.incentiveCampaignId);
        balances.accountAddress = entity.ap;
        balances.blockNumber = entity.blockNumber;
        balances.blockTimestamp = entity.blockTimestamp;
        balances.transactionHash = entity.transactionHash;
        balances.logIndex = entity.logIndex;
    }

    let resultingAmountsRemaining = campaign.incentiveAmountsRemaining;

    let resultingIncentives = balances.incentiveIds;
    let resultingBalances = balances.incentiveBalances;

    // Reduce the incentives remaining based on the claimed amounts
    // Modify the user balances for this campaign
    entity.incentivesClaimed.forEach((incentive, claimedIndex) => {
        let incentiveId = generateIncentiveId(incentive);
        let incentiveIndex = campaign.incentivesOfferedIds.indexOf(incentiveId);
        resultingAmountsRemaining[incentiveIndex] = resultingAmountsRemaining[incentiveIndex].minus(entity.incentiveAmountsPaid[claimedIndex]);

        let balanceIndex = resultingIncentives.indexOf(incentiveId);
        if (balanceIndex == -1) {
            resultingIncentives.push(incentiveId);
            resultingBalances.push(entity.incentiveAmountsPaid[claimedIndex]);
        } else {
            resultingBalances[balanceIndex] = resultingBalances[balanceIndex].plus(entity.incentiveAmountsPaid[claimedIndex]);
        }
    })

    campaign.incentiveAmountsRemaining = resultingAmountsRemaining;

    balances.incentiveIds = resultingIncentives;
    balances.incentiveBalances = resultingBalances;

    balances.save();
    campaign.save();
}

export function handleAddOrRemoveCoIP(incentiveCampaignId: string, coIpAddresses: string[], addCoIp: boolean, blockNumber: BigInt, blockTimestamp: BigInt, transactionHash: string, logIndex: BigInt): void {
    coIpAddresses.forEach((coIpAddress, index) => {
        let coIpId = generateRawCoIpId(incentiveCampaignId, coIpAddress);
        let coIP = RawCoIp.load(coIpId);
        if (coIP == null) {
            coIP = new RawCoIp(coIpId);
            coIP.chainId = CHAIN_ID;
            coIP.incentiveCampaignId = incentiveCampaignId;
            coIP.rawIncentiveCampaignRefId = generateRawIncentiveCampaignId(incentiveCampaignId);
            coIP.accountAddress = coIpAddress;
            coIP.blockNumber = blockNumber;
            coIP.blockTimestamp = blockTimestamp;
            coIP.transactionHash = transactionHash;
            coIP.logIndex = logIndex;
        }

        coIP.isCoIP = addCoIp;

        coIP.save();
    })
}