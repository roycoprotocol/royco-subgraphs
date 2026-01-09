import { Address, BigInt } from "@graphprotocol/graph-ts";
import { MarketDeployed as MarketDeployedEvent } from "../generated/Vault/RoycoFactory";
import {
  CHAIN_ID,
  VAULT_MAJOR_TYPE,
  VAULT_SUB_CATEGORY_JUNIOR,
  VAULT_SUB_CATEGORY_SENIOR,
} from "./constants";
import { MarketState, VaultState } from "../generated/schema";
import { generateTokenId, generateVaultId } from "./utils";
import { BaseVault } from "../generated/Vault/BaseVault";
import { RoycoVaultTranche } from "../generated/templates";

export function handleMarketDeployed(event: MarketDeployedEvent): void {
  RoycoVaultTranche.create(event.params.deployedContracts.seniorTranche);
  RoycoVaultTranche.create(event.params.deployedContracts.juniorTranche);

  const marketId = event.params.params.marketId.toHexString();
  const id = CHAIN_ID.toString().concat("_").concat(marketId);

  let marketState = new MarketState(id);

  // Base
  marketState.chainId = CHAIN_ID;
  marketState.marketId = marketId;
  marketState.kernelAddress =
    event.params.deployedContracts.kernel.toHexString();
  marketState.accountantAddress =
    event.params.deployedContracts.accountant.toHexString();

  // Senior Tranche
  marketState.seniorVaultAddress =
    event.params.deployedContracts.seniorTranche.toHexString();
  marketState.seniorVaultId = generateVaultId(marketState.seniorVaultAddress);
  marketState.seniorVaultSymbol = event.params.params.seniorTrancheSymbol;
  marketState.seniorVaultImplementationAddress =
    event.params.params.seniorTrancheImplementation.toHexString();
  marketState.seniorAssetTokenAddress =
    event.params.params.seniorAsset.toHexString();
  marketState.seniorAssetTokenId = generateTokenId(
    marketState.seniorAssetTokenAddress
  );

  // Junior Tranche
  marketState.juniorVaultAddress =
    event.params.deployedContracts.juniorTranche.toHexString();
  marketState.juniorVaultId = generateVaultId(marketState.juniorVaultAddress);
  marketState.juniorVaultSymbol = event.params.params.juniorTrancheSymbol;
  marketState.juniorVaultImplementationAddress =
    event.params.params.juniorTrancheImplementation.toHexString();
  marketState.juniorAssetTokenAddress =
    event.params.params.juniorAsset.toHexString();
  marketState.juniorAssetTokenId = generateTokenId(
    marketState.juniorAssetTokenAddress
  );

  // Initialization Data
  marketState.seniorVaultInitializationData =
    event.params.params.seniorTrancheInitializationData.toHexString();
  marketState.juniorVaultInitializationData =
    event.params.params.juniorTrancheInitializationData.toHexString();
  marketState.kernelInitializationData =
    event.params.params.kernelInitializationData.toHexString();
  marketState.accountantInitializationData =
    event.params.params.accountantInitializationData.toHexString();

  // Market Start Data
  marketState.blockNumber = event.block.number;
  marketState.blockTimestamp = event.block.timestamp;
  marketState.transactionHash = event.transaction.hash.toHexString();
  marketState.logIndex = event.logIndex;

  // Timestamps
  marketState.createdAt = event.block.timestamp;
  marketState.updatedAt = event.block.timestamp;

  marketState.save();

  // Senior Vault State
  let seniorVaultState = new VaultState(marketState.seniorVaultId);
  seniorVaultState.chainId = CHAIN_ID;
  seniorVaultState.vaultAddress = marketState.seniorVaultAddress;

  const seniorContract = BaseVault.bind(
    Address.fromString(marketState.seniorVaultAddress)
  );
  const seniorDepositTokenAddress = seniorContract.asset().toHexString();
  seniorVaultState.depositTokenId = generateTokenId(seniorDepositTokenAddress);
  seniorVaultState.depositTokenAddress = seniorDepositTokenAddress;

  const seniorDecimals = seniorContract.decimals();
  seniorVaultState.decimals = seniorDecimals;

  seniorVaultState.majorType = VAULT_MAJOR_TYPE;
  seniorVaultState.minorType = VAULT_SUB_CATEGORY_SENIOR;
  seniorVaultState.marketRefId = marketState.id;
  seniorVaultState.marketId = marketState.marketId;
  seniorVaultState.partnerVaultId = marketState.juniorVaultId;
  seniorVaultState.partnerVaultAddress = marketState.juniorVaultAddress;

  seniorVaultState.transfers = BigInt.fromI32(0);
  seniorVaultState.totalSupply = BigInt.fromI32(0);
  seniorVaultState.depositors = BigInt.fromI32(0);
  seniorVaultState.blockNumber = event.block.number;
  seniorVaultState.blockTimestamp = event.block.timestamp;
  seniorVaultState.createdAt = event.block.timestamp;
  seniorVaultState.updatedAt = event.block.timestamp;

  seniorVaultState.save();

  // Junior Vault State
  let juniorVaultState = new VaultState(marketState.juniorVaultId);
  juniorVaultState.chainId = CHAIN_ID;
  juniorVaultState.vaultAddress = marketState.juniorVaultAddress;

  const juniorContract = BaseVault.bind(
    Address.fromString(marketState.juniorVaultAddress)
  );
  const juniorDepositTokenAddress = juniorContract.asset().toHexString();
  juniorVaultState.depositTokenId = generateTokenId(juniorDepositTokenAddress);
  juniorVaultState.depositTokenAddress = juniorDepositTokenAddress;

  const juniorDecimals = juniorContract.decimals();
  juniorVaultState.decimals = juniorDecimals;

  juniorVaultState.majorType = VAULT_MAJOR_TYPE;
  juniorVaultState.minorType = VAULT_SUB_CATEGORY_JUNIOR;
  juniorVaultState.marketRefId = marketState.id;
  juniorVaultState.marketId = marketState.marketId;
  juniorVaultState.partnerVaultId = marketState.seniorVaultId;
  juniorVaultState.partnerVaultAddress = marketState.seniorVaultAddress;

  juniorVaultState.transfers = BigInt.fromI32(0);
  juniorVaultState.totalSupply = BigInt.fromI32(0);
  juniorVaultState.depositors = BigInt.fromI32(0);
  juniorVaultState.blockNumber = event.block.number;
  juniorVaultState.blockTimestamp = event.block.timestamp;
  juniorVaultState.createdAt = event.block.timestamp;
  juniorVaultState.updatedAt = event.block.timestamp;

  juniorVaultState.save();
}
