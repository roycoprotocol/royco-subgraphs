import {
    AssertersBlacklisted as AssertersBlacklistedEvent,
    AssertersWhitelisted as AssertersWhitelistedEvent,
    AssertionLivenessUpdated as AssertionLivenessUpdatedEvent,
    BondCurrencyUpdated as BondCurrencyUpdatedEvent,
    EmissionRatesUpdated as EmissionRatesUpdatedEvent,
    MerkleRootAsserted as MerkleRootAssertedEvent,
    MerkleRootAssertionDisputed as MerkleRootAssertionDisputedEvent,
    MerkleRootAssertionResolved as MerkleRootAssertionResolvedEvent,
    OwnershipTransferStarted as OwnershipTransferStartedEvent,
    OwnershipTransferred as OwnershipTransferredEvent,
} from "../../generated/UmaMerkleChefAV/UmaMerkleChefAV"
import {
    AssertersBlacklisted,
    AssertersWhitelisted,
    AssertionLivenessUpdated,
    BondCurrencyUpdated,
    EmissionRatesUpdated,
    MerkleRootAsserted,
    MerkleRootAssertionDisputed,
    MerkleRootAssertionResolved,
    UmaMerkleChefAVOwnershipTransferStarted,
    UmaMerkleChefAVOwnershipTransferred,
    RawEmissionRates
} from "../../generated/schema"
import { Bytes } from "@graphprotocol/graph-ts"
import { generateIncentiveId, generateRawEmissionRatesId, generateRawIncentiveCampaignId } from "../utils/id-generator"
import { CHAIN_ID } from "../utils/constants";

export function handleRateUpdates(entity: EmissionRatesUpdated): void {
    let ratesId = generateRawEmissionRatesId(entity.incentiveCampaignId, entity.logIndex);
    let rates = RawEmissionRates.load(ratesId);

    if (rates == null) {
        rates = new RawEmissionRates(ratesId);
        rates.chainId = CHAIN_ID;
        rates.incentiveCampaignId = entity.incentiveCampaignId;
        rates.rawIncentiveCampaignRefId = generateRawIncentiveCampaignId(entity.incentiveCampaignId);
        rates.incentiveIds = entity.incentives.map(incenitve => generateIncentiveId(incenitve));
        rates.emissionRates = entity.updatedRates;
        rates.blockNumber = entity.blockNumber;
        rates.blockTimestamp = entity.blockTimestamp;
        rates.transactionHash = entity.transactionHash;
        rates.logIndex = entity.logIndex;
    } else {
        let updatedIncentiveIds = rates.incentiveIds;
        let updatedRates = rates.emissionRates;

        entity.incentives.forEach((incentive, updateIndex) => {
            let incentiveId = generateIncentiveId(incentive);
            let existingIncentiveIndex = updatedIncentiveIds.indexOf(incentiveId);
            if (existingIncentiveIndex == -1) {
                updatedIncentiveIds.push(incentiveId);
                updatedRates.push(entity.updatedRates[updateIndex]);
            } else {
                updatedRates[existingIncentiveIndex] = entity.updatedRates[updateIndex];
            }
        })

        rates.incentiveIds = updatedIncentiveIds;
        rates.emissionRates = updatedRates;
    }

    rates.save();

}