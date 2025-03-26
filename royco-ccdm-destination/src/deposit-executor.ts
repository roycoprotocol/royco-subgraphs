import { BigInt } from "@graphprotocol/graph-ts";
import {
  CCDMBridgeProcessed as CCDMBridgeProcessedEvent,
  CampaignDepositRecipeSet as CampaignDepositRecipeSetEvent,
  CampaignInputTokensSet as CampaignInputTokensSetEvent,
  CampaignOwnerSet as CampaignOwnerSetEvent,
  CampaignReceiptTokenSet as CampaignReceiptTokenSetEvent,
  CampaignUnlockTimestampSet as CampaignUnlockTimestampSetEvent,
  CampaignVerificationStatusSet as CampaignVerificationStatusSetEvent,
  CampaignVerifierSet as CampaignVerifierSetEvent,
  IndividualDepositorWithdrawn as IndividualDepositorWithdrawnEvent,
  MerkleDepositorWithdrawn as MerkleDepositorWithdrawnEvent,
  OwnershipTransferStarted as OwnershipTransferStartedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  ValidLzOftRemoved as ValidLzOftRemovedEvent,
  ValidLzOftSet as ValidLzOftSetEvent,
  WeirollWalletsExecutedDepositRecipe as WeirollWalletsExecutedDepositRecipeEvent,
} from "../generated/DepositExecutor/DepositExecutor";
import {
  CCDMBridgeProcessed,
  CampaignDepositRecipeSet,
  CampaignInputTokensSet,
  CampaignOwnerSet,
  CampaignReceiptTokenSet,
  CampaignUnlockTimestampSet,
  CampaignVerificationStatusSet,
  CampaignVerifierSet,
  IndividualDepositorWithdrawn,
  MerkleDepositorWithdrawn,
  OwnershipTransferStarted,
  OwnershipTransferred,
  RawMarketRecipeDestination,
  ValidLzOftRemoved,
  ValidLzOftSet,
  WeirollWalletsExecutedDepositRecipe,
} from "../generated/schema";
import { DESTINATION_CHAIN_ID } from "./constants";
import {
  processRawWeirollWalletDestination,
  updateRawMarketDestinationInputTokens,
  updateRawMarketDestinationReceiptToken,
  updateRawMarketDestinationUnlockTimestamp,
  executeRawWeirollWalletDestination,
  withdrawRawWeirollWalletDestination,
} from "./deposit-handler";
import { generateId, generateRawMarketId } from "./utils";
import {
  createOrUpdateRawMarketTokenBalance,
  updateRawMarketTokenBalanceFromWeirollWallet,
} from "./token-balance-handler";

/**
 * Unlock timestamp is set for the campaign
 */
export function handleCampaignUnlockTimestampSet(
  event: CampaignUnlockTimestampSetEvent
): void {
  let entity = new CampaignUnlockTimestampSet(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = DESTINATION_CHAIN_ID;
  entity.sourceMarketHash = event.params.sourceMarketHash.toHexString();
  entity.unlockTimestamp = event.params.unlockTimestamp;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  updateRawMarketDestinationUnlockTimestamp(
    event.params.sourceMarketHash.toHexString(),
    event.params.unlockTimestamp
  );
}

/**
 * Receipt token is set for the campaign
 */
export function handleCampaignReceiptTokenSet(
  event: CampaignReceiptTokenSetEvent
): void {
  let entity = new CampaignReceiptTokenSet(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = DESTINATION_CHAIN_ID;
  entity.sourceMarketHash = event.params.sourceMarketHash.toHexString();
  entity.receiptToken = event.params.receiptToken.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  // Update the raw market destination
  updateRawMarketDestinationReceiptToken(
    event.params.sourceMarketHash.toHexString(),
    event.params.receiptToken.toHexString()
  );
}

/**
 * Input tokens are set for the campaign
 */
export function handleCampaignInputTokensSet(
  event: CampaignInputTokensSetEvent
): void {
  let entity = new CampaignInputTokensSet(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = DESTINATION_CHAIN_ID;
  entity.sourceMarketHash = event.params.sourceMarketHash.toHexString();
  entity.inputTokens = event.params.inputTokens.map<string>((token) =>
    token.toHexString()
  );

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;
  entity.save();

  // Update the raw market destination
  updateRawMarketDestinationInputTokens(
    event.params.sourceMarketHash.toHexString(),
    event.params.inputTokens.map<string>((token) => token.toHexString())
  );
}

/**
 * CCDM Bridge Processed
 */
export function handleCCDMBridgeProcessed(
  event: CCDMBridgeProcessedEvent
): void {
  let entity = new CCDMBridgeProcessed(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = DESTINATION_CHAIN_ID;
  entity.sourceMarketHash = event.params.sourceMarketHash.toHexString();
  entity.ccdmNonce = event.params.ccdmNonce;
  entity.guid = event.params.guid.toHexString();
  entity.weirollWallet = event.params.weirollWallet.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  processRawWeirollWalletDestination(
    event.params.weirollWallet.toHexString(), // Weiroll Wallet Address on Destination Chain
    event.params.sourceMarketHash.toHexString(), // Market Hash on Source Chain
    event.transaction.hash.toHexString(), // Processed Transaction Hash on Destination Chain
    event.params.ccdmNonce // CCDM Nonce used for bridging
  );
}

/**
 * Weiroll Wallets Executed Deposit Recipe
 */
export function handleWeirollWalletsExecutedDepositRecipe(
  event: WeirollWalletsExecutedDepositRecipeEvent
): void {
  let entity = new WeirollWalletsExecutedDepositRecipe(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = DESTINATION_CHAIN_ID;
  entity.sourceMarketHash = event.params.sourceMarketHash.toHexString();
  entity.weirollWalletsExecuted =
    event.params.weirollWalletsExecuted.map<string>((wallet) =>
      wallet.toHexString()
    );
  entity.receiptTokensReceived = event.params.receiptTokensReceived.map<BigInt>(
    (amount) => amount
  );

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();

  // Update the weiroll wallet status destination
  for (let i = 0; i < event.params.weirollWalletsExecuted.length; i++) {
    executeRawWeirollWalletDestination(
      event.params.weirollWalletsExecuted[i].toHexString(),
      event.params.receiptTokensReceived[i],
      event.transaction.hash.toHexString()
    );

    updateRawMarketTokenBalanceFromWeirollWallet(
      event.address, // Contract Address
      event.params.weirollWalletsExecuted[i].toHexString() // Weiroll Wallet Address on Destination Chain
    );
  }
}

/**
 * Merkle depositor withdrawn
 */
export function handleMerkleDepositorWithdrawn(
  event: MerkleDepositorWithdrawnEvent
): void {
  let entity = new MerkleDepositorWithdrawn(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = DESTINATION_CHAIN_ID;
  entity.weirollWallet = event.params.weirollWallet.toHexString();
  entity.depositor = event.params.depositor.toHexString();
  entity.depositLeaf = event.params.depositLeaf.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;
  entity.save();

  withdrawRawWeirollWalletDestination(
    event.params.weirollWallet.toHexString(),
    event.transaction.hash.toHexString(),
    event.params.depositLeaf.toHexString()
  );

  updateRawMarketTokenBalanceFromWeirollWallet(
    event.address, // Contract Address
    event.params.weirollWallet.toHexString() // Weiroll Wallet Address on Destination Chain
  );
}

export function handleCampaignDepositRecipeSet(
  event: CampaignDepositRecipeSetEvent
): void {
  let entity = new CampaignDepositRecipeSet(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = DESTINATION_CHAIN_ID;
  entity.sourceMarketHash = event.params.sourceMarketHash.toHexString();

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
  entity.chainId = DESTINATION_CHAIN_ID;
  entity.sourceMarketHash = event.params.sourceMarketHash.toHexString();
  entity.newOwner = event.params.newOwner.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleCampaignVerificationStatusSet(
  event: CampaignVerificationStatusSetEvent
): void {
  let entity = new CampaignVerificationStatusSet(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = DESTINATION_CHAIN_ID;
  entity.sourceMarketHash = event.params.sourceMarketHash.toHexString();
  entity.verificationStatus = event.params.verificationStatus;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleCampaignVerifierSet(
  event: CampaignVerifierSetEvent
): void {
  let entity = new CampaignVerifierSet(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = DESTINATION_CHAIN_ID;
  entity.campaignVerifier = event.params.campaignVerifier.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleIndividualDepositorWithdrawn(
  event: IndividualDepositorWithdrawnEvent
): void {
  let entity = new IndividualDepositorWithdrawn(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = DESTINATION_CHAIN_ID;
  entity.weirollWallet = event.params.weirollWallet.toHexString();
  entity.depositor = event.params.depositor.toHexString();

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
  entity.chainId = DESTINATION_CHAIN_ID;
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
  entity.chainId = DESTINATION_CHAIN_ID;
  entity.previousOwner = event.params.previousOwner.toHexString();
  entity.newOwner = event.params.newOwner.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleValidLzOftRemoved(event: ValidLzOftRemovedEvent): void {
  let entity = new ValidLzOftRemoved(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = DESTINATION_CHAIN_ID;
  entity.lzV2OFT = event.params.lzV2OFT.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}

export function handleValidLzOftSet(event: ValidLzOftSetEvent): void {
  let entity = new ValidLzOftSet(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = DESTINATION_CHAIN_ID;
  entity.lzV2OFT = event.params.lzV2OFT.toHexString();

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}
