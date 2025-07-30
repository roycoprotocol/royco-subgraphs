import { UrdCreated as UrdCreatedEvent } from "../generated/UrdFactory/UrdFactory";
import {
  UrdCreated,
  UniversalRewardsDistributor as UniversalRewardsDistributorEntity,
  MerkleContract,
} from "../generated/schema";
import { UniversalRewardsDistributor as UniversalRewardsDistributorContract } from "../generated/UrdFactory/UniversalRewardsDistributor";
import { generateId } from "./utils";
import { CHAIN_ID } from "./constants";
import { UniversalRewardsDistributor } from "../generated/templates";

export function handleUrdCreated(event: UrdCreatedEvent): void {
  let entity = new UrdCreated(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
  entity.urd = event.params.urd.toHexString();
  entity.caller = event.params.caller.toHexString();
  entity.initialOwner = event.params.initialOwner.toHexString();
  entity.initialTimelock = event.params.initialTimelock;
  entity.initialRoot = event.params.initialRoot.toHexString();
  entity.initialIpfsHash = event.params.initialIpfsHash.toHexString();
  entity.salt = event.params.salt.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  // Create a new MerkleContract entity
  let merkleContractsEntity = new MerkleContract(
    CHAIN_ID.toString().concat("_").concat(event.params.urd.toHexString())
  );
  merkleContractsEntity.chainId = CHAIN_ID;
  merkleContractsEntity.contractAddress = event.params.urd.toHexString();
  merkleContractsEntity.initialOwner = event.params.initialOwner.toHexString();
  merkleContractsEntity.initialTimelock = event.params.initialTimelock;
  merkleContractsEntity.initialRoot = event.params.initialRoot.toHexString();
  merkleContractsEntity.initialIpfsHash =
    event.params.initialIpfsHash.toHexString();
  merkleContractsEntity.salt = event.params.salt.toHexString();

  merkleContractsEntity.blockNumber = event.block.number;
  merkleContractsEntity.blockTimestamp = event.block.timestamp;
  merkleContractsEntity.transactionHash = event.transaction.hash.toHexString();
  merkleContractsEntity.logIndex = event.logIndex;

  merkleContractsEntity.save();

  // Start indexing the child contract
  let childContractAddress = event.params.urd;
  UniversalRewardsDistributor.create(childContractAddress);
}
