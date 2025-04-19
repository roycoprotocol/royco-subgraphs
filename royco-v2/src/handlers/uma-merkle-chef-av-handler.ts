import {
  IncentiveEmissionRatesUpdated,
  MerkleRootAsserted,
  MerkleRootAssertionDisputed,
  MerkleRootAssertionResolved,
  RawIncentiveEmissionRateUpdate,
  RawUmaMerkleRootState,
  RawUmaMerkleRootAssertion,
  RawIncentiveCampaignUmaMerkleChef,
} from "../../generated/schema";
import { Bytes } from "@graphprotocol/graph-ts";
import {
  generateIncentiveCampaignTag,
  generateIncentiveId,
  generateRawIncentiveEmissionRatesId,
  generateRawIncentiveCampaignId,
  generateRawUmaMerkleRootAssertionId,
  generateRawUmaMerkleRootStateId,
} from "../utils/id-generator";
import { CHAIN_ID, UMA_MERKLE_ORACLE_STATES } from "../utils/constants";

export function handleRateUpdates(entity: IncentiveEmissionRatesUpdated): void {
  let ratesId = generateRawIncentiveEmissionRatesId(entity.incentiveCampaignId, entity.logIndex);
  let merkleCampaignId = generateRawIncentiveCampaignId(
    entity.incentiveCampaignId
  );
  let rates = new RawIncentiveEmissionRateUpdate(ratesId);
  rates.chainId = CHAIN_ID;
  rates.incentiveCampaignId = entity.incentiveCampaignId;
  rates.rawIncentiveCampaignRefId = merkleCampaignId;
  rates.incentives = entity.incentives;
  rates.incentiveEmissionRates = entity.updatedRates;
  rates.blockNumber = entity.blockNumber;
  rates.blockTimestamp = entity.blockTimestamp;
  rates.transactionHash = entity.transactionHash;
  rates.logIndex = entity.logIndex;

  let merkleCampaign = RawIncentiveCampaignUmaMerkleChef.load(merkleCampaignId);
  if (merkleCampaign == null) {
    merkleCampaign = new RawIncentiveCampaignUmaMerkleChef(merkleCampaignId);
    merkleCampaign.incentiveCampaignId = entity.incentiveCampaignId;
    merkleCampaign.chainId = CHAIN_ID;
    merkleCampaign.incentiveIds = entity.incentives.map<string>((incenitve) =>
      generateIncentiveId(incenitve)
    );
    merkleCampaign.incentiveEmissionRates = entity.updatedRates;
    merkleCampaign.merkleRoot = new Bytes(32).toHexString();
    merkleCampaign.blockNumber = entity.blockNumber;
    merkleCampaign.blockTimestamp = entity.blockTimestamp;
    merkleCampaign.transactionHash = entity.transactionHash;
    merkleCampaign.logIndex = entity.logIndex;
    rates.save();
    merkleCampaign.save();
    return;
  }

  let updatedIncentiveIds = merkleCampaign.incentiveIds;
  let updatedRates = merkleCampaign.incentiveEmissionRates;

  for (
    let updateIndex = 0;
    updateIndex < entity.incentives.length;
    updateIndex++
  ) {
    let incentive = entity.incentives[updateIndex];
    let incentiveId = generateIncentiveId(incentive);
    let existingIncentiveIndex = updatedIncentiveIds.indexOf(incentiveId);
    if (existingIncentiveIndex == -1) {
      updatedIncentiveIds.push(incentiveId);
      updatedRates.push(entity.updatedRates[updateIndex]);
    } else {
      updatedRates[existingIncentiveIndex] = entity.updatedRates[updateIndex];
    }
  }

  merkleCampaign.incentiveIds = updatedIncentiveIds;
  merkleCampaign.incentiveEmissionRates = updatedRates;
  // Strip chain id to make this avm friendly
  let updatedIncentives: string[] = [];
  for (let i = 0; i < updatedIncentiveIds.length; i++) {
    updatedIncentives[i] = updatedIncentiveIds[i].slice(updatedIncentiveIds[i].indexOf("-") + 1);
  }
  rates.incentives = updatedIncentives;
  rates.incentiveEmissionRates = updatedRates;

  rates.save();
  merkleCampaign.save();
}

export function handleMerkleRootAssertion(entity: MerkleRootAsserted): void {
  let merkleRootStateId = generateRawUmaMerkleRootStateId(
    entity.incentiveCampaignId
  );

  let merkleRootAssertion = new RawUmaMerkleRootAssertion(
    generateRawUmaMerkleRootAssertionId(entity.assertionId)
  );
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
    merkleRootState.rawIncentiveCampaignRefId = generateRawIncentiveCampaignId(
      entity.incentiveCampaignId
    );
    // First root hasn't resolved yet, so set to bytes32(0)
    merkleRootState.merkleRoot = new Bytes(32).toHexString();
    merkleRootState.blockNumber = entity.blockNumber;
    merkleRootState.blockTimestamp = entity.blockTimestamp;
    merkleRootState.transactionHash = entity.transactionHash;
    merkleRootState.logIndex = entity.logIndex;
  }

  merkleRootState.save();
}

export function handleMerkleRootDisputed(
  entity: MerkleRootAssertionDisputed
): void {
  let merkleRootAssertion = RawUmaMerkleRootAssertion.load(
    generateRawUmaMerkleRootAssertionId(entity.assertionId)
  );
  if (merkleRootAssertion == null) {
    // Log error because merkle root assertion should exist
    return;
  }
  merkleRootAssertion.state = UMA_MERKLE_ORACLE_STATES.DISPUTED;
  merkleRootAssertion.save();
}

export function handleMerkleRootResolved(
  entity: MerkleRootAssertionResolved
): void {
  let merkleRootAssertion = RawUmaMerkleRootAssertion.load(
    generateRawUmaMerkleRootAssertionId(entity.assertionId)
  );
  if (merkleRootAssertion == null) {
    // Log error because merkle root assertion should exist
    return;
  }
  merkleRootAssertion.state = UMA_MERKLE_ORACLE_STATES.RESOLVED;
  merkleRootAssertion.save();

  let incentiveCampaignId = generateRawIncentiveCampaignId(
    merkleRootAssertion.incentiveCampaignId
  );

  let merkleRootState = RawUmaMerkleRootState.load(incentiveCampaignId);
  if (merkleRootState == null) {
    // Log error because merkle root state should exist
    return;
  }
  // Set the most recent merkle root as the current state
  merkleRootState.merkleRoot = entity.merkleRoot;
  merkleRootState.save();

  let merkleCampaign =
    RawIncentiveCampaignUmaMerkleChef.load(incentiveCampaignId);
  if (merkleCampaign == null) {
    // Log error because merkle root state should exist
    return;
  }
  // Set the most recent merkle root as the current state
  merkleCampaign.merkleRoot = entity.merkleRoot;
  merkleCampaign.save();
}
