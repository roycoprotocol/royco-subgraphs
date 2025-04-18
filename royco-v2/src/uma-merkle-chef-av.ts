import {
  AssertersBlacklisted as AssertersBlacklistedEvent,
  AssertersWhitelisted as AssertersWhitelistedEvent,
  AssertionLivenessUpdated as AssertionLivenessUpdatedEvent,
  BondCurrencyUpdated as BondCurrencyUpdatedEvent,
  EmissionRatesUpdated as IncentiveEmissionRatesUpdatedEvent,
  MerkleRootAsserted as MerkleRootAssertedEvent,
  MerkleRootAssertionDisputed as MerkleRootAssertionDisputedEvent,
  MerkleRootAssertionResolved as MerkleRootAssertionResolvedEvent,
  OwnershipTransferStarted as OwnershipTransferStartedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
} from "../generated/UmaMerkleChefAV/UmaMerkleChefAV";
import {
  AssertersBlacklisted,
  AssertersWhitelisted,
  AssertionLivenessUpdated,
  BondCurrencyUpdated,
  IncentiveEmissionRatesUpdated,
  MerkleRootAsserted,
  MerkleRootAssertionDisputed,
  MerkleRootAssertionResolved,
  UmaMerkleChefAVOwnershipTransferStarted,
  UmaMerkleChefAVOwnershipTransferred,
} from "../generated/schema";
import { Bytes } from "@graphprotocol/graph-ts";
import {
  handleRateUpdates,
  handleMerkleRootAssertion,
  handleMerkleRootDisputed,
  handleMerkleRootResolved,
} from "./handlers/uma-merkle-chef-av-handler";
import {
  generateId,
  generateRawIncentiveEmissionRatesId,
  generateRawUmaMerkleRootAssertionId,
} from "./utils/id-generator";
import { CHAIN_ID } from "./utils/constants";

export function handleAssertersBlacklisted(
  event: AssertersBlacklistedEvent
): void {
  let entity = new AssertersBlacklisted(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.blacklistedAsserters = event.params.blacklistedAsserters.map<string>(
    (asserter) => asserter.toHexString()
  );

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleAssertersWhitelisted(
  event: AssertersWhitelistedEvent
): void {
  let entity = new AssertersWhitelisted(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.whitelistedAsserters = event.params.whitelistedAsserters.map<string>(
    (asserter) => asserter.toHexString()
  );

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleAssertionLivenessUpdated(
  event: AssertionLivenessUpdatedEvent
): void {
  let entity = new AssertionLivenessUpdated(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.newAssertionLiveness = event.params.newAssertionLiveness;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleBondCurrencyUpdated(
  event: BondCurrencyUpdatedEvent
): void {
  let entity = new BondCurrencyUpdated(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.newBondCurrency = event.params.newBondCurrency.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleIncentiveEmissionRatesUpdated(
  event: IncentiveEmissionRatesUpdatedEvent
): void {
  let entity = new IncentiveEmissionRatesUpdated(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.incentiveCampaignId = event.params.incentiveCampaignId.toHexString();
  entity.incentives = event.params.incentives.map<string>((incentive) =>
    incentive.toHexString()
  );
  entity.updatedRates = event.params.updatedRates;
  entity.rawIncentiveEmissionRatesRefId = generateRawIncentiveEmissionRatesId(
    entity.incentiveCampaignId
  );

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  handleRateUpdates(entity);
}

export function handleMerkleRootAsserted(event: MerkleRootAssertedEvent): void {
  let entity = new MerkleRootAsserted(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.assertionId = event.params.assertionId.toHexString();
  entity.incentiveCampaignId = event.params.incentiveCampaignId.toHexString();
  entity.asserter = event.params.asserter.toHexString();
  entity.merkleRoot = event.params.merkleRoot.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  handleMerkleRootAssertion(entity);
}

export function handleMerkleRootAssertionDisputed(
  event: MerkleRootAssertionDisputedEvent
): void {
  let entity = new MerkleRootAssertionDisputed(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.assertionId = event.params.assertionId.toHexString();
  entity.merkleRoot = event.params.merkleRoot.toHexString();
  entity.rawMerkleRootAssertionRefId = generateRawUmaMerkleRootAssertionId(
    entity.assertionId
  );

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  handleMerkleRootDisputed(entity);
}

export function handleMerkleRootAssertionResolved(
  event: MerkleRootAssertionResolvedEvent
): void {
  let entity = new MerkleRootAssertionResolved(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.assertionId = event.params.assertionId.toHexString();
  entity.merkleRoot = event.params.merkleRoot.toHexString();
  entity.rawMerkleRootAssertionRefId = generateRawUmaMerkleRootAssertionId(
    entity.assertionId
  );

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  handleMerkleRootResolved(entity);
}

export function handleOwnershipTransferStarted(
  event: OwnershipTransferStartedEvent
): void {
  let entity = new UmaMerkleChefAVOwnershipTransferStarted(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.previousOwner = event.params.previousOwner.toHexString();
  entity.newOwner = event.params.newOwner.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new UmaMerkleChefAVOwnershipTransferred(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.previousOwner = event.params.previousOwner.toHexString();
  entity.newOwner = event.params.newOwner.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}
