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
    RawEmissionRates,
    RawUmaMerkleRootState,
    RawUmaMerkleRootAssertion
} from "../../generated/schema"
import { Bytes } from "@graphprotocol/graph-ts"
import { generateIncentiveId, generateRawEmissionRatesId, generateRawIncentiveCampaignId, generateRawUmaMerkleRootAssertionId, generateRawUmaMerkleRootStateId } from "../utils/id-generator"
import { CHAIN_ID, UMA_MERKLE_ORACLE_STATES } from "../utils/constants";

export function handleRateUpdates(entity: EmissionRatesUpdated): void {
    let ratesId = generateRawEmissionRatesId(entity.incentiveCampaignId);
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

export function handleMerkleRootAssertion(entity: MerkleRootAsserted): void {
    let merkleRootStateId = generateRawUmaMerkleRootStateId(entity.incentiveCampaignId);

    let merkleRootAssertion = new RawUmaMerkleRootAssertion(generateRawUmaMerkleRootAssertionId(entity.assertionId));
    merkleRootAssertion.chainId = CHAIN_ID;
    merkleRootAssertion.incentiveCampaignId = entity.incentiveCampaignId;
    merkleRootAssertion.rawMerkleRootStateRefId = merkleRootStateId;
    merkleRootAssertion.assertionId = entity.assertionId;
    merkleRootAssertion.accountAddress = entity.asserter;
    merkleRootAssertion.merkleRoot = entity.merkleRoot;
    merkleRootAssertion.state = UMA_MERKLE_ORACLE_STATES.ASSERTED;
    merkleRootAssertion.blockNumber = entity.blockNumber;
    merkleRootAssertion.blockTimestamp = entity.blockTimestamp;
    merkleRootAssertion.transactionHash = entity.transactionHash;
    merkleRootAssertion.logIndex = entity.logIndex;

    merkleRootAssertion.save();

    let merkleRootState = RawUmaMerkleRootState.load(merkleRootStateId);
    if (merkleRootState == null) {
        merkleRootState = new RawUmaMerkleRootState(merkleRootStateId);
        merkleRootState.chainId = CHAIN_ID;
        merkleRootState.incentiveCampaignId = entity.incentiveCampaignId;
        merkleRootState.rawIncentiveCampaignRefId = generateRawIncentiveCampaignId(entity.incentiveCampaignId);
        // First root hasn't resolved yet, so set to bytes32(0)
        merkleRootState.merkleRoot = (new Bytes(32)).toHexString();
        merkleRootState.blockNumber = entity.blockNumber;
        merkleRootState.blockTimestamp = entity.blockTimestamp;
        merkleRootState.transactionHash = entity.transactionHash;
        merkleRootState.logIndex = entity.logIndex;
    }

    merkleRootState.save()
}

export function handleMerkleRootDisputed(entity: MerkleRootAssertionDisputed): void {
    let merkleRootAssertion = RawUmaMerkleRootAssertion.load(generateRawUmaMerkleRootAssertionId(entity.assertionId));
    if (merkleRootAssertion == null) {
        // Log error because merkle root assertion should exist
        return;
    }
    merkleRootAssertion.state = UMA_MERKLE_ORACLE_STATES.DISPUTED;
    merkleRootAssertion.save()
}

export function handleMerkleRootResolved(entity: MerkleRootAssertionResolved): void {
    let merkleRootAssertion = RawUmaMerkleRootAssertion.load(generateRawUmaMerkleRootAssertionId(entity.assertionId));
    if (merkleRootAssertion == null) {
        // Log error because merkle root assertion should exist
        return;
    }
    merkleRootAssertion.state = UMA_MERKLE_ORACLE_STATES.RESOLVED;
    merkleRootAssertion.save()

    let merkleRootState = RawUmaMerkleRootState.load(generateRawIncentiveCampaignId(merkleRootAssertion.incentiveCampaignId));
    if (merkleRootState == null) {
        // Log error because merkle root state should exist
        return;
    }
    // Set the most recent merkle root as the current state
    merkleRootState.merkleRoot = entity.merkleRoot;
    merkleRootState.save()
}