import { MerkleDepositMade as MerkleDepositMadeEvent } from "../generated/DepositLocker/DepositLocker";
import {
  MerkleDepositMade,
  RawPositionRecipeBoyco,
  RawPositionRecipe,
  RawPositionTokenBalanceRecipe,
} from "../generated/schema";
import { CHAIN_ID } from "./constants";
import {
  generateId,
  generateRawPositionId,
  generateRawPositionTokenBalanceId,
  generateRawPositionRecipeBoycoId,
} from "./utils";
import {
  createOrUpdateRawMarketTokenBalance,
  withdrawRawPositionTokenBalance,
} from "./token-balance-handler";

export function withdrawBoycoInputToken(event: MerkleDepositMadeEvent): void {
  let rawPositionRefId = generateRawPositionId(
    event.params.weirollWallet.toHexString()
  );

  let rawPosition = RawPositionRecipe.load(rawPositionRefId);

  if (rawPosition) {
    // If position exists, withdraw token balance
    let rawPositionTokenBalanceRefId = generateRawPositionTokenBalanceId(
      rawPositionRefId, // Position Ref ID
      0, // Token class
      rawPosition.token0Id // Token ID
    );

    let rawPositionTokenBalance = RawPositionTokenBalanceRecipe.load(
      rawPositionTokenBalanceRefId
    );

    if (rawPositionTokenBalance) {
      // @note: no de-duplication required, because only one token
      createOrUpdateRawMarketTokenBalance(
        rawPosition.marketId, // Market ID
        0, // Token class
        rawPosition.token0Id, // Token ID
        rawPositionTokenBalance.tokenAmount, // Token amount
        1 // Subtract
      );

      rawPosition.isWithdrawn = true;
      rawPosition.tag = "boyco";

      rawPosition.save();
    }
  } else {
    // If position does not exist, store in temporary table
    let rawPositionRecipeBoycoRefId = generateRawPositionRecipeBoycoId(
      event.params.weirollWallet.toHexString()
    );

    let rawPositionRecipeBoyco = RawPositionRecipeBoyco.load(
      rawPositionRecipeBoycoRefId
    );

    if (!rawPositionRecipeBoyco) {
      rawPositionRecipeBoyco = new RawPositionRecipeBoyco(
        rawPositionRecipeBoycoRefId
      );

      rawPositionRecipeBoyco.rawPositionRefId = rawPositionRefId;
      rawPositionRecipeBoyco.chainId = CHAIN_ID;
      rawPositionRecipeBoyco.weirollWallet =
        event.params.weirollWallet.toHexString();
      rawPositionRecipeBoyco.tag = "boyco";
      rawPositionRecipeBoyco.isWithdrawn = true;
      rawPositionRecipeBoyco.save();
    }
  }
}

export function handleMerkleDepositMade(event: MerkleDepositMadeEvent): void {
  let entity = new MerkleDepositMade(
    generateId(event.transaction.hash, event.logIndex)
  );
  entity.chainId = CHAIN_ID;
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

  // Withdraw Boyco Input
  // This auto withdraws the Boyco Input Token
  // from the Market and Position at the same time
  withdrawBoycoInputToken(event);
}
