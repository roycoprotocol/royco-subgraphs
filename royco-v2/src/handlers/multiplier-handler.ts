import {
    APOfferCreated,
    APOfferFilled,
    OptedInToIncentiveCampaign,
    RawUserMultiplierState
} from "../../generated/schema"
import { generateId, generateRawIncentiveCampaignId, generateRawUserMultiplierStateId } from "../utils/id-generator"
import { BIG_INT_ZERO, DEFAULT_MULTIPLIER, CHAIN_ID } from "../utils/constants"

export function handleOptIn(entity: OptedInToIncentiveCampaign): void {
    let userMultiplierState = RawUserMultiplierState.load(generateRawUserMultiplierStateId(entity.incentiveCampaignId, entity.ap));
    if (userMultiplierState == null) {
        userMultiplierState = new RawUserMultiplierState(generateRawUserMultiplierStateId(entity.incentiveCampaignId, entity.ap));
        userMultiplierState.chainId = CHAIN_ID;
        userMultiplierState.incentiveCampaignId = entity.incentiveCampaignId;
        userMultiplierState.rawIncentiveCampaignRefId = generateRawIncentiveCampaignId(entity.incentiveCampaignId);
        userMultiplierState.accountAddress = entity.ap;
        userMultiplierState.multiplier = DEFAULT_MULTIPLIER;
        userMultiplierState.size = BIG_INT_ZERO;
        userMultiplierState.blockNumber = entity.blockNumber;
        userMultiplierState.blockTimestamp = entity.blockTimestamp;
        userMultiplierState.transactionHash = entity.transactionHash;
        userMultiplierState.logIndex = entity.logIndex;
        userMultiplierState.save();
    }
}

export function handleOptInOnCreation(entity: APOfferCreated): void {
    let userMultiplierState = RawUserMultiplierState.load(generateRawUserMultiplierStateId(entity.incentiveCampaignId, entity.ap));
    if (userMultiplierState == null) {
        userMultiplierState = new RawUserMultiplierState(generateRawUserMultiplierStateId(entity.incentiveCampaignId, entity.ap));
        userMultiplierState.chainId = CHAIN_ID;
        userMultiplierState.incentiveCampaignId = entity.incentiveCampaignId;
        userMultiplierState.rawIncentiveCampaignRefId = generateRawIncentiveCampaignId(entity.incentiveCampaignId);
        userMultiplierState.accountAddress = entity.ap;
        userMultiplierState.multiplier = DEFAULT_MULTIPLIER;
        userMultiplierState.size = BIG_INT_ZERO;
        userMultiplierState.blockNumber = entity.blockNumber;
        userMultiplierState.blockTimestamp = entity.blockTimestamp;
        userMultiplierState.transactionHash = entity.transactionHash;
        userMultiplierState.logIndex = entity.logIndex;
        userMultiplierState.save();
    }
}

export function handleFillApOffer(entity: APOfferFilled): void {
    let userMultiplierState = RawUserMultiplierState.load(generateRawUserMultiplierStateId(entity.incentiveCampaignId, entity.ap));
    if (userMultiplierState == null) {
        userMultiplierState = new RawUserMultiplierState(generateRawUserMultiplierStateId(entity.incentiveCampaignId, entity.ap));
        userMultiplierState.chainId = CHAIN_ID;
        userMultiplierState.incentiveCampaignId = entity.incentiveCampaignId;
        userMultiplierState.rawIncentiveCampaignRefId = generateRawIncentiveCampaignId(entity.incentiveCampaignId);
        userMultiplierState.accountAddress = entity.ap;
        userMultiplierState.blockNumber = entity.blockNumber;
        userMultiplierState.blockTimestamp = entity.blockTimestamp;
        userMultiplierState.transactionHash = entity.transactionHash;
        userMultiplierState.logIndex = entity.logIndex;
    }
    userMultiplierState.multiplier = entity.multiplier;
    userMultiplierState.size = entity.size;
    userMultiplierState.save();
}