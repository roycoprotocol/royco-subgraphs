import { Address } from "@graphprotocol/graph-ts";
import {
  BaseLzReceiveGasLimitSet as BaseLzReceiveGasLimitSetEvent,
  CampaignOwnerSet as CampaignOwnerSetEvent,
  DepositExecutorSet as DepositExecutorSetEvent,
  DestinationChainLzEidSet as DestinationChainLzEidSetEvent,
  GreenLightTurnedOff as GreenLightTurnedOffEvent,
  GreenLightTurnedOn as GreenLightTurnedOnEvent,
  GreenLighterSet as GreenLighterSetEvent,
  IndividualDepositMade as IndividualDepositMadeEvent,
  IndividualWithdrawalMade as IndividualWithdrawalMadeEvent,
  LpTokensBridgedToDestination as LpTokensBridgedToDestinationEvent,
  LpTokensMerkleBridgedToDestination as LpTokensMerkleBridgedToDestinationEvent,
  LzV2OFTForTokenRemoved as LzV2OFTForTokenRemovedEvent,
  LzV2OFTForTokenSet as LzV2OFTForTokenSetEvent,
  MarketHalted as MarketHaltedEvent,
  MerkleDepositMade as MerkleDepositMadeEvent,
  MerkleWithdrawalMade as MerkleWithdrawalMadeEvent,
  OwnershipTransferStarted as OwnershipTransferStartedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  SingleTokensBridgedToDestination as SingleTokensBridgedToDestinationEvent,
  SingleTokensMerkleBridgedToDestination as SingleTokensMerkleBridgedToDestinationEvent,
} from "../generated/DepositLocker/DepositLocker";
import {
  BaseLzReceiveGasLimitSet,
  CampaignOwnerSet,
  DepositExecutorSet,
  DestinationChainLzEidSet,
  GreenLightTurnedOff,
  GreenLightTurnedOn,
  GreenLighterSet,
  IndividualDepositMade,
  IndividualWithdrawalMade,
  LpTokensBridgedToDestination,
  LpTokensMerkleBridgedToDestination,
  LzV2OFTForTokenRemoved,
  LzV2OFTForTokenSet,
  MarketHalted,
  MerkleDepositMade,
  MerkleWithdrawalMade,
  OwnershipTransferStarted,
  OwnershipTransferred,
  SingleTokensBridgedToDestination,
  SingleTokensMerkleBridgedToDestination,
} from "../generated/schema";
import {
  depositWeirollWalletSource,
  findAndUpdateWeirollWallets,
  updateCcdmNonceBridgedMapSource,
  withdrawWeirollWalletSource,
} from "./deposit-handler";
import { SOURCE_CHAIN_ID } from "./constants";
import { generateId } from "./utils";

export function handleBaseLzReceiveGasLimitSet(
  event: BaseLzReceiveGasLimitSetEvent
): void {
  let entity = new BaseLzReceiveGasLimitSet(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = SOURCE_CHAIN_ID;
  entity.baseLzReceiveGasLimit = event.params.baseLzReceiveGasLimit;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleCampaignOwnerSet(event: CampaignOwnerSetEvent): void {
  let entity = new CampaignOwnerSet(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = SOURCE_CHAIN_ID;
  entity.marketHash = event.params.marketHash.toHexString();
  entity.campaignOwner = event.params.campaignOwner.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleDepositExecutorSet(event: DepositExecutorSetEvent): void {
  let entity = new DepositExecutorSet(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = SOURCE_CHAIN_ID;
  entity.depositExecutor = event.params.depositExecutor.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleDestinationChainLzEidSet(
  event: DestinationChainLzEidSetEvent
): void {
  let entity = new DestinationChainLzEidSet(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = SOURCE_CHAIN_ID;
  entity.dstChainLzEid = event.params.dstChainLzEid;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleGreenLightTurnedOff(
  event: GreenLightTurnedOffEvent
): void {
  let entity = new GreenLightTurnedOff(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = SOURCE_CHAIN_ID;
  entity.marketHash = event.params.marketHash.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleGreenLightTurnedOn(event: GreenLightTurnedOnEvent): void {
  let entity = new GreenLightTurnedOn(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = SOURCE_CHAIN_ID;
  entity.marketHash = event.params.marketHash.toHexString();
  entity.bridgingAllowedTimestamp = event.params.bridgingAllowedTimestamp;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleGreenLighterSet(event: GreenLighterSetEvent): void {
  let entity = new GreenLighterSet(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = SOURCE_CHAIN_ID;
  entity.greenLighter = event.params.greenLighter.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleIndividualDepositMade(
  event: IndividualDepositMadeEvent
): void {
  let entity = new IndividualDepositMade(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = SOURCE_CHAIN_ID;
  entity.marketHash = event.params.marketHash.toHexString();
  entity.weirollWallet = event.params.weirollWallet.toHexString();
  entity.depositor = event.params.depositor.toHexString();
  entity.amountDeposited = event.params.amountDeposited;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleIndividualWithdrawalMade(
  event: IndividualWithdrawalMadeEvent
): void {
  let entity = new IndividualWithdrawalMade(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = SOURCE_CHAIN_ID;
  entity.marketHash = event.params.marketHash.toHexString();
  entity.weirollWallet = event.params.weirollWallet.toHexString();
  entity.depositor = event.params.depositor.toHexString();
  entity.amountWithdrawn = event.params.amountWithdrawn;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleLpTokensBridgedToDestination(
  event: LpTokensBridgedToDestinationEvent
): void {
  let entity = new LpTokensBridgedToDestination(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = SOURCE_CHAIN_ID;
  entity.marketHash = event.params.marketHash.toHexString();
  entity.ccdmNonce = event.params.ccdmNonce;
  entity.depositorsBridged = event.params.depositorsBridged.map<string>(
    (address: Address): string => address.toHexString()
  );
  entity.totalLpTokensBridged = event.params.totalLpTokensBridged;
  entity.lz_token0_guid = event.params.lz_token0_guid.toHexString();
  entity.lz_token0_nonce = event.params.lz_token0_nonce;
  entity.token0 = event.params.token0.toHexString();
  entity.lz_token0_AmountBridged = event.params.lz_token0_AmountBridged;
  entity.lz_token1_guid = event.params.lz_token1_guid.toHexString();
  entity.lz_token1_nonce = event.params.lz_token1_nonce;
  entity.token1 = event.params.token1.toHexString();
  entity.lz_token1_AmountBridged = event.params.lz_token1_AmountBridged;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleLzV2OFTForTokenRemoved(
  event: LzV2OFTForTokenRemovedEvent
): void {
  let entity = new LzV2OFTForTokenRemoved(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = SOURCE_CHAIN_ID;
  entity.token = event.params.token.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleLzV2OFTForTokenSet(event: LzV2OFTForTokenSetEvent): void {
  let entity = new LzV2OFTForTokenSet(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = SOURCE_CHAIN_ID;
  entity.token = event.params.token.toHexString();
  entity.lzV2OFT = event.params.lzV2OFT.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleMarketHalted(event: MarketHaltedEvent): void {
  let entity = new MarketHalted(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = SOURCE_CHAIN_ID;
  entity.marketHash = event.params.marketHash.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleOwnershipTransferStarted(
  event: OwnershipTransferStartedEvent
): void {
  let entity = new OwnershipTransferStarted(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = SOURCE_CHAIN_ID;
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
  let entity = new OwnershipTransferred(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = SOURCE_CHAIN_ID;
  entity.previousOwner = event.params.previousOwner.toHexString();
  entity.newOwner = event.params.newOwner.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleSingleTokensBridgedToDestination(
  event: SingleTokensBridgedToDestinationEvent
): void {
  let entity = new SingleTokensBridgedToDestination(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = SOURCE_CHAIN_ID;
  entity.marketHash = event.params.marketHash.toHexString();
  entity.ccdmNonce = event.params.ccdmNonce;
  entity.depositorsBridged = event.params.depositorsBridged.map<string>(
    (address: Address): string => address.toHexString()
  );
  entity.lz_guid = event.params.lz_guid.toHexString();
  entity.lz_nonce = event.params.lz_nonce;
  entity.totalAmountBridged = event.params.totalAmountBridged;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

/**
 * Merkle deposit made event
 */
export function handleMerkleDepositMade(event: MerkleDepositMadeEvent): void {
  let entity = new MerkleDepositMade(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = SOURCE_CHAIN_ID;
  entity.lastCcdmNonceBridged = event.params.lastCcdmNonceBridged;
  entity.marketHash = event.params.marketHash.toHexString();
  entity.weirollWallet = event.params.weirollWallet.toHexString();
  entity.depositor = event.params.depositor.toHexString();
  entity.amountDeposited = event.params.amountDeposited;
  entity.merkleDepositNonce = event.params.merkleDepositNonce;
  entity.depositLeaf = event.params.depositLeaf.toHexString();
  entity.depositLeafIndex = event.params.depositLeafIndex;
  entity.updatedMerkleRoot = event.params.updatedMerkleRoot.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  depositWeirollWalletSource(
    event.params.weirollWallet.toHexString(), // Weiroll Wallet Address
    event.params.marketHash.toHexString(), // Market Hash
    event.params.depositLeaf.toHexString(), // Deposit Leaf
    event.params.merkleDepositNonce, // Merkle Deposit Nonce
    event.params.amountDeposited, // Amount Deposited
    event.transaction.hash.toHexString() // Deposit Transaction Hash
  );

  updateCcdmNonceBridgedMapSource(
    event.params.marketHash.toHexString(), // Market Hash
    event.params.weirollWallet.toHexString() // Weiroll Wallet Address
  );
}

/**
 * Merkle withdrawal made event
 */
export function handleMerkleWithdrawalMade(
  event: MerkleWithdrawalMadeEvent
): void {
  let entity = new MerkleWithdrawalMade(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = SOURCE_CHAIN_ID;
  entity.marketHash = event.params.marketHash.toHexString();
  entity.weirollWallet = event.params.weirollWallet.toHexString();
  entity.depositor = event.params.depositor.toHexString();
  entity.amountWithdrawn = event.params.amountWithdrawn;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  withdrawWeirollWalletSource(
    event.params.weirollWallet.toHexString(),
    event.transaction.hash.toHexString()
  );
}

/**
 * Merkle single token bridged to destination event
 */
export function handleSingleTokensMerkleBridgedToDestination(
  event: SingleTokensMerkleBridgedToDestinationEvent
): void {
  let entity = new SingleTokensMerkleBridgedToDestination(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = SOURCE_CHAIN_ID;
  entity.marketHash = event.params.marketHash.toHexString();
  entity.ccdmNonce = event.params.ccdmNonce;
  entity.lastCcdmNonceBridged = event.params.lastCcdmNonceBridged;
  entity.merkleRoot = event.params.merkleRoot.toHexString();
  entity.lz_guid = event.params.lz_guid.toHexString();
  entity.lz_nonce = event.params.lz_nonce;
  entity.totalAmountBridged = event.params.totalAmountBridged;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  findAndUpdateWeirollWallets(
    event.params.marketHash.toHexString(),
    event.params.ccdmNonce,
    event.transaction.hash.toHexString(),
    event.params.totalAmountBridged
  );
}

/**
 * Merkle lp tokens bridged to destination event
 */
export function handleLpTokensMerkleBridgedToDestination(
  event: LpTokensMerkleBridgedToDestinationEvent
): void {
  let entity = new LpTokensMerkleBridgedToDestination(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = SOURCE_CHAIN_ID;
  entity.marketHash = event.params.marketHash.toHexString();
  entity.ccdmNonce = event.params.ccdmNonce;
  entity.lastCcdmNonceBridged = event.params.lastCcdmNonceBridged;
  entity.merkleRoot = event.params.merkleRoot.toHexString();
  entity.totalLpTokensBridged = event.params.totalLpTokensBridged;
  entity.lz_token0_guid = event.params.lz_token0_guid.toHexString();
  entity.lz_token0_nonce = event.params.lz_token0_nonce;
  entity.token0 = event.params.token0.toHexString();
  entity.lz_token0_AmountBridged = event.params.lz_token0_AmountBridged;
  entity.lz_token1_guid = event.params.lz_token1_guid.toHexString();
  entity.lz_token1_nonce = event.params.lz_token1_nonce;
  entity.token1 = event.params.token1.toHexString();
  entity.lz_token1_AmountBridged = event.params.lz_token1_AmountBridged;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  findAndUpdateWeirollWallets(
    event.params.marketHash.toHexString(),
    event.params.ccdmNonce,
    event.transaction.hash.toHexString(),
    event.params.totalLpTokensBridged
  );
}
