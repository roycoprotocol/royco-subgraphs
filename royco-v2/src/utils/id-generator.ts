import { BigInt, Bytes, Int8 } from "@graphprotocol/graph-ts";
import { CHAIN_ID, OFFER_TYPE } from "./constants";

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

export const generateRawUserMultiplierStateId = (incentiveCampaignId: string, apAddess: string): string => {
    return CHAIN_ID.toString()
        .concat("_")
        .concat(incentiveCampaignId)
        .concat("_")
        .concat(apAddess);
};

export const generateRawHistoricalMultiplierStateId = (incentiveCampaignId: string, apAddess: string, logIndex: BigInt): string => {
    return CHAIN_ID.toString()
        .concat("_")
        .concat(incentiveCampaignId)
        .concat("_")
        .concat(logIndex.toString());
};

export const generateRawOfferId = (incentiveCampaignId: string, offerHash: string, offerType: OFFER_TYPE): string => {
    return CHAIN_ID.toString()
        .concat("_")
        .concat(incentiveCampaignId)
        .concat("_")
        .concat(offerHash)
        .concat("_")
        .concat(offerType.toString());
};

export function generateIncentiveCampaignTag(actionVerifierAddress: string): string {
    if (actionVerifierAddress == "0x0e6db09B98369aFfb3049580936B1c86127EBB52") return "UMA_MERKLE_CHEF";
    else return "";
}