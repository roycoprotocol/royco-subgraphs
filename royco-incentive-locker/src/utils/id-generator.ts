import { BigInt, Bytes, Int8 } from "@graphprotocol/graph-ts";
import { CHAIN_ID, INCENTIVE_CAMPAIGN_TAGS } from "../utils/constants";

export function generateId(transactionHash: Bytes, logIndex: BigInt): string {
    return CHAIN_ID.toString()
        .concat("_")
        .concat(transactionHash.toHexString())
        .concat("_")
        .concat(logIndex.toString());
}

export const generateIncentiveId = (incentiveAddress: string): string => {
    return CHAIN_ID.toString().concat("-").concat(incentiveAddress);
};


export const generateRawWhitelistedIpId = (pointsProgramId: string, ipAddress: string): string => {
    return CHAIN_ID.toString()
        .concat("_")
        .concat(pointsProgramId)
        .concat("_")
        .concat(ipAddress);
};

export const generateRawPointsProgramBalanceId = (pointsProgramId: string, apAddress: string): string => {
    return CHAIN_ID.toString()
        .concat("_")
        .concat(pointsProgramId)
        .concat("_")
        .concat(apAddress);
};

export const generateRawIncentiveCampaignId = (incentiveCampaignId: string): string => {
    return CHAIN_ID.toString()
        .concat("_")
        .concat(incentiveCampaignId);
};

export const generateRawIncentiveClaimBalanceId = (incentiveCampaignId: string, apAddress: string): string => {
    return CHAIN_ID.toString()
        .concat("_")
        .concat(incentiveCampaignId)
        .concat("_")
        .concat(apAddress);
};

export const generateRawCoIpId = (incentiveCampaignId: string, coIpAddress: string): string => {
    return CHAIN_ID.toString()
        .concat("_")
        .concat(incentiveCampaignId)
        .concat("_")
        .concat(coIpAddress);
};

export const generateRawIncentiveEmissionRatesId = (incentiveCampaignId: string): string => {
    return CHAIN_ID.toString()
        .concat("_")
        .concat(incentiveCampaignId)
        .concat("_")
        .concat("UMCAV_RATES");
};

export const generateRawUmaMerkleRootAssertionId = (assertionId: string): string => {
    return CHAIN_ID.toString()
        .concat("_")
        .concat(assertionId);
};

export const generateRawUmaMerkleRootStateId = (incentiveCampaignId: string): string => {
    return CHAIN_ID.toString()
        .concat("_")
        .concat(incentiveCampaignId)
        .concat("_")
        .concat("UMA_MERKLE_ROOT_STATE");
};

export const generateIncentiveCampaignTag = (actionVerifierAddress: string): string =>
    INCENTIVE_CAMPAIGN_TAGS[CHAIN_ID.toString()][actionVerifierAddress];
