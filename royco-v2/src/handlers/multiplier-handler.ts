import {
    APOfferCreated,
    APOfferFilled,
    OptedInToIncentiveCampaign,
    RawUserMultiplierState,
    RawHistoricalMultiplierState,
    RawMultiplerAPOffer
} from "../../generated/schema"
import { generateRawOfferId, generateRawIncentiveCampaignId, generateRawUserMultiplierStateId, generateRawHistoricalMultiplierStateId } from "../utils/id-generator"
import { CHAIN_ID, OFFER_TYPE } from "../utils/constants"
import { BigInt } from "@graphprotocol/graph-ts";

export function handleMultiplierUpdate(incentiveCampaignId: string, apAddress: string, multiplier: BigInt, offerSize: BigInt, blockNumber: BigInt, blockTimestamp: BigInt, transactionHash: string, logIndex: BigInt): void {
    let userMultiplierStateId = generateRawUserMultiplierStateId(incentiveCampaignId, apAddress);
    let rawIncentiveCampaignId = generateRawIncentiveCampaignId(incentiveCampaignId);

    let historicalMultiplierState = new RawHistoricalMultiplierState(generateRawHistoricalMultiplierStateId(incentiveCampaignId, apAddress, logIndex));
    historicalMultiplierState.chainId = CHAIN_ID;
    historicalMultiplierState.incentiveCampaignId = incentiveCampaignId;
    historicalMultiplierState.rawUserMultiplierStateRefId = userMultiplierStateId;
    historicalMultiplierState.accountAddress = apAddress;
    historicalMultiplierState.multiplier = multiplier;
    historicalMultiplierState.offerSize = offerSize;
    historicalMultiplierState.blockNumber = blockNumber;
    historicalMultiplierState.blockTimestamp = blockTimestamp;
    historicalMultiplierState.transactionHash = transactionHash;
    historicalMultiplierState.logIndex = logIndex;
    historicalMultiplierState.save();

    let userMultiplierState = RawUserMultiplierState.load(generateRawUserMultiplierStateId(incentiveCampaignId, apAddress));
    if (userMultiplierState == null) {
        userMultiplierState = new RawUserMultiplierState(userMultiplierStateId);
        userMultiplierState.chainId = CHAIN_ID;
        userMultiplierState.incentiveCampaignId = incentiveCampaignId;
        userMultiplierState.rawIncentiveCampaignRefId = rawIncentiveCampaignId;
        userMultiplierState.accountAddress = apAddress;
        userMultiplierState.blockNumber = blockNumber;
        userMultiplierState.blockTimestamp = blockTimestamp;
        userMultiplierState.transactionHash = transactionHash;
        userMultiplierState.logIndex = logIndex;
    }

    userMultiplierState.multiplier = multiplier;
    userMultiplierState.offerSize = offerSize;
    userMultiplierState.save();
}

export function handleAPOfferCreation(entity: APOfferCreated): void {
    let apOffer = new RawMultiplerAPOffer(generateRawOfferId(entity.incentiveCampaignId, entity.apOfferHash, OFFER_TYPE.AP_OFFER));
    apOffer.chainId = CHAIN_ID;
    apOffer.incentiveCampaignId = entity.incentiveCampaignId;
    apOffer.rawUserMultiplierStateRefId = generateRawUserMultiplierStateId(entity.incentiveCampaignId, entity.ap);
    apOffer.accountAddress = entity.ap;
    apOffer.offerType = OFFER_TYPE.AP_OFFER;
    apOffer.multiplier = entity.multiplier;
    apOffer.offerSize = entity.offerSize;
    apOffer.filled = false;
    apOffer.blockNumber = entity.blockNumber;
    apOffer.blockTimestamp = entity.blockTimestamp;
    apOffer.transactionHash = entity.transactionHash;
    apOffer.logIndex = entity.logIndex;
    apOffer.save();
}

export function handleAPOfferFill(incentiveCampaignId: string, apOfferHash: string): void {
    let apOffer = RawMultiplerAPOffer.load(generateRawOfferId(incentiveCampaignId, apOfferHash, OFFER_TYPE.AP_OFFER));
    if (apOffer == null) {
        // Log error if ap offer is null since it has to exist to be filled
        return;
    }
    apOffer.filled = true;
    apOffer.save();
}