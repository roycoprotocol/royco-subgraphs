import { Address, BigInt } from "@graphprotocol/graph-ts";
import { MarketDeployed as MarketDeployedEvent } from "../generated/Vault/RoycoFactory";
import {
  CHAIN_ID,
  VAULT_MAJOR_TYPE,
  VAULT_SUB_CATEGORY_JUNIOR,
  VAULT_SUB_CATEGORY_SENIOR,
} from "./constants";
import {
  AccountantMarketMap,
  KernelMarketMap,
  MarketState,
  VaultState,
} from "../generated/schema";
import {
  generateAccountantMarketMapId,
  generateKernelMarketMapId,
  generateTokenVaultId,
  generateVaultId,
} from "./utils";
import {
  RoycoVaultTranche,
  RoycoAccountant,
  RoycoKernel,
} from "../generated/templates";
import { RoycoVaultTranche as RoycoVaultTrancheContract } from "../generated/templates/RoycoVaultTranche/RoycoVaultTranche";
import { RoycoAccountant as RoycoAccountantContract } from "../generated/templates/RoycoAccountant/RoycoAccountant";
import { RoycoKernel as RoycoKernelContract } from "../generated/templates/RoycoKernel/RoycoKernel";

export function handleMarketDeployed(event: MarketDeployedEvent): void {
  RoycoVaultTranche.create(event.params.roycoMarket.seniorTranche);
  RoycoVaultTranche.create(event.params.roycoMarket.juniorTranche);
  RoycoAccountant.create(event.params.roycoMarket.accountant);
  RoycoKernel.create(event.params.roycoMarket.kernel);

  const seniorContract = RoycoVaultTrancheContract.bind(
    Address.fromString(event.params.roycoMarket.seniorTranche.toHexString())
  );
  const juniorContract = RoycoVaultTrancheContract.bind(
    Address.fromString(event.params.roycoMarket.juniorTranche.toHexString())
  );
  const accountantContract = RoycoAccountantContract.bind(
    Address.fromString(event.params.roycoMarket.accountant.toHexString())
  );
  const kernelContract = RoycoKernelContract.bind(
    Address.fromString(event.params.roycoMarket.kernel.toHexString())
  );

  const accountantState = accountantContract.getState();
  const kernelState = kernelContract.getState();

  const marketId = event.params.params.marketId.toHexString();
  const id = CHAIN_ID.toString().concat("_").concat(marketId);

  let marketState = new MarketState(id);

  // Base
  marketState.chainId = CHAIN_ID;
  marketState.marketId = marketId;
  marketState.kernelAddress = event.params.roycoMarket.kernel.toHexString();
  marketState.accountantAddress =
    event.params.roycoMarket.accountant.toHexString();

  // Senior Tranche
  marketState.seniorVaultAddress =
    event.params.roycoMarket.seniorTranche.toHexString();
  marketState.seniorVaultId = generateVaultId(marketState.seniorVaultAddress);
  marketState.seniorVaultSymbol = event.params.params.seniorTrancheSymbol;
  marketState.seniorVaultImplementationAddress =
    event.params.params.seniorTrancheImplementation.toHexString();

  const seniorAssetTokenAddress = seniorContract.asset().toHexString();
  marketState.seniorAssetTokenAddress = seniorAssetTokenAddress;
  marketState.seniorAssetTokenId = generateTokenVaultId(
    marketState.seniorAssetTokenAddress,
    marketState.seniorVaultAddress
  );

  // Junior Tranche
  marketState.juniorVaultAddress =
    event.params.roycoMarket.juniorTranche.toHexString();
  marketState.juniorVaultId = generateVaultId(marketState.juniorVaultAddress);
  marketState.juniorVaultSymbol = event.params.params.juniorTrancheSymbol;
  marketState.juniorVaultImplementationAddress =
    event.params.params.juniorTrancheImplementation.toHexString();

  const juniorAssetTokenAddress = juniorContract.asset().toHexString();
  marketState.juniorAssetTokenAddress = juniorAssetTokenAddress;
  marketState.juniorAssetTokenId = generateTokenVaultId(
    marketState.juniorAssetTokenAddress,
    marketState.juniorVaultAddress
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

  // Constants
  marketState.ydmAddress = accountantState.ydm.toHexString();
  marketState.betaWAD = accountantState.betaWAD;
  marketState.coverageWAD = accountantState.coverageWAD;
  marketState.lltvWAD = accountantState.lltvWAD;
  marketState.dustTolerance = accountantState.dustTolerance;
  marketState.fixedTermDurationSeconds = BigInt.fromI32(
    accountantState.fixedTermDurationSeconds
  );
  marketState.seniorVaultProtocolFeeWAD = accountantState.stProtocolFeeWAD;
  marketState.juniorVaultProtocolFeeWAD = accountantState.jtProtocolFeeWAD;

  // Kernel Data
  marketState.protocolFeeRecipient = kernelState
    .getProtocolFeeRecipient()
    .toHexString();
  marketState.juniorTrancheRedemptionDelay = BigInt.fromI32(
    kernelState.getJtRedemptionDelayInSeconds()
  );

  // Market Start Data
  marketState.blockNumber = event.block.number;
  marketState.blockTimestamp = event.block.timestamp;
  marketState.transactionHash = event.transaction.hash.toHexString();
  marketState.logIndex = event.logIndex;

  // Timestamps
  marketState.createdAt = event.block.timestamp;
  marketState.updatedAt = event.block.timestamp;

  marketState.save();

  // Accountant Market Map
  let accountantMarketMap = new AccountantMarketMap(
    generateAccountantMarketMapId(marketState.accountantAddress)
  );
  accountantMarketMap.chainId = CHAIN_ID;
  accountantMarketMap.accountantAddress = marketState.accountantAddress;
  accountantMarketMap.marketStateId = marketState.id;
  accountantMarketMap.createdAt = event.block.timestamp;
  accountantMarketMap.save();

  // Kernel Market Map
  let kernelMarketMap = new KernelMarketMap(
    generateKernelMarketMapId(marketState.kernelAddress)
  );
  kernelMarketMap.chainId = CHAIN_ID;
  kernelMarketMap.kernelAddress = marketState.kernelAddress;
  kernelMarketMap.marketStateId = marketState.id;
  kernelMarketMap.createdAt = event.block.timestamp;
  kernelMarketMap.save();

  // Senior Vault State
  let seniorVaultState = new VaultState(marketState.seniorVaultId);
  seniorVaultState.chainId = CHAIN_ID;
  seniorVaultState.vaultAddress = marketState.seniorVaultAddress;
  seniorVaultState.depositTokenId = marketState.seniorAssetTokenId;
  seniorVaultState.depositTokenAddress = marketState.seniorAssetTokenAddress;

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

  juniorVaultState.depositTokenId = marketState.juniorAssetTokenId;
  juniorVaultState.depositTokenAddress = marketState.juniorAssetTokenAddress;

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
