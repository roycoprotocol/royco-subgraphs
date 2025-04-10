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
    RawIncentiveCampaignBalance
} from "../../generated/schema"
import { generateRawIncentiveCampaignId, generateIncentiveId, generateRawIncentiveCampaignBalanceId } from "../utils/id-generator"
import { CHAIN_ID } from "../utils/constants"


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
    }

    let resultingAmountsRemaining = campaign.incentiveAmountsRemaining;

    let resultingIncentives = balances.incentiveIds;
    let resultingBalances = balances.incentiveBalances;

    // Reduce the incentives remaining based on the claimed amounts
    // Modify the user balances for this campaign
    entity.incentivesClaimed.forEach((incentive,) => {
        let incentiveId = generateIncentiveId(incentive);
        let incentiveIndex = campaign.incentivesOfferedIds.indexOf(incentiveId);
        resultingAmountsRemaining[incentiveIndex] = resultingAmountsRemaining[incentiveIndex].minus(entity.incentiveAmountsPaid[incentiveIndex]);

        let balanceIndex = resultingIncentives.indexOf(incentiveId);
        if (balanceIndex == -1) {
            resultingIncentives.push(incentiveId);
            resultingBalances.push(entity.incentiveAmountsPaid[incentiveIndex]);
        } else {
            resultingBalances[balanceIndex] = resultingBalances[balanceIndex].plus(entity.incentiveAmountsPaid[incentiveIndex]);
        }
    })

    campaign.incentiveAmountsRemaining = resultingAmountsRemaining;

    balances.incentiveIds = resultingIncentives;
    balances.incentiveBalances = resultingBalances;

    balances.save();
    campaign.save();
}