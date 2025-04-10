import { BigInt, Bytes, Int8 } from "@graphprotocol/graph-ts";
import { CHAIN_ID } from "../utils/constants";

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

export const generateRawIncentiveCampaignBalanceId = (incentiveCampaignId: string, apAddress: string): string => {
    return CHAIN_ID.toString()
        .concat("_")
        .concat(incentiveCampaignId)
        .concat("_")
        .concat(apAddress);
};