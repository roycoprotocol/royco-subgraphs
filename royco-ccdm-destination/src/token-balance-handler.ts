import { Address, BigInt, Bytes, Int8 } from "@graphprotocol/graph-ts";
import {
  RawMarketRecipeDestination,
  RawMarketTokenBalanceRecipe,
  RawWeirollWalletDestination,
  RawWeirollWalletMapDestination,
} from "../generated/schema";
import {
  SOURCE_CHAIN_ID,
  MARKET_TYPE,
  DESTINATION_CHAIN_ID,
  NULL_ADDRESS,
} from "./constants";
import { generateRawMarketId, generateRawMarketTokenBalanceId } from "./utils";
import {
  DepositExecutor,
  MerkleDepositorWithdrawn as MerkleDepositorWithdrawnEvent,
} from "../generated/DepositExecutor/DepositExecutor";

export function updateRawMarketTokenBalanceFromWeirollWallet(
  contractAddress: Address,
  weirollWallet: string
): void {
  let rawWeirollWalletMapDestination = RawWeirollWalletMapDestination.load(
    SOURCE_CHAIN_ID.toString()
      .concat("_")
      .concat(DESTINATION_CHAIN_ID.toString())
      .concat("_")
      .concat(weirollWallet)
  );

  if (rawWeirollWalletMapDestination) {
    let rawWeirollWalletDestinationRefId =
      rawWeirollWalletMapDestination.rawWeirollWalletDestinationRefId;

    let rawWeirollWalletDestination = RawWeirollWalletDestination.load(
      rawWeirollWalletDestinationRefId
    );

    if (rawWeirollWalletDestination) {
      let rawMarketRefId = generateRawMarketId(
        rawWeirollWalletDestination.marketId
      );

      let rawMarketDestination =
        RawMarketRecipeDestination.load(rawMarketRefId);

      let contract = DepositExecutor.bind(contractAddress);

      let merkleInfo = contract.try_getMerkleInfoForWeirollWallet(
        Bytes.fromHexString(rawWeirollWalletDestination.marketId),
        Address.fromString(rawWeirollWalletDestination.weirollWallet)
      );

      let receiptTokenId: string = NULL_ADDRESS;

      if (
        rawMarketDestination &&
        rawMarketDestination.receiptTokenId &&
        !merkleInfo.reverted
      ) {
        receiptTokenId = rawMarketDestination.receiptTokenId as string;

        let tokenAmount =
          merkleInfo.value.getTotalMerkleTreeSourceAmountLeftToWithdraw();

        if (receiptTokenId && receiptTokenId != NULL_ADDRESS) {
          createOrUpdateRawMarketTokenBalance(
            rawWeirollWalletDestination.marketId, // Market Hash
            rawWeirollWalletDestination.weirollWallet, // Weiroll Wallet Address on Destination Chain
            0, // Class: Input token
            receiptTokenId, // Receipt token id
            tokenAmount, // Input token amount
            2 // Set
          );
        }
      }
    }
  }
}

export function createOrUpdateRawMarketTokenBalance(
  marketId: string,
  weirollWallet: string,
  tokenClass: Int8,
  tokenId: string,
  tokenAmount: BigInt,
  type: Int8 // 0: Add, 1: Subtract, 2: Set
): void {
  let rawMarketRefId = generateRawMarketId(marketId);
  let rawMarket = RawMarketRecipeDestination.load(rawMarketRefId);

  if (rawMarket) {
    let rawMarketTokenBalanceRefId = generateRawMarketTokenBalanceId(
      rawMarketRefId, // Market Ref ID
      tokenClass, // Token class
      tokenId // Token ID
    );

    let rawMarketTokenBalance = RawMarketTokenBalanceRecipe.load(
      rawMarketTokenBalanceRefId
    );

    if (!rawMarketTokenBalance) {
      // If the token balance does not exist, we need to create it
      rawMarketTokenBalance = new RawMarketTokenBalanceRecipe(
        rawMarketTokenBalanceRefId
      );

      rawMarketTokenBalance.rawMarketRefId = rawMarketRefId;
      rawMarketTokenBalance.chainId = SOURCE_CHAIN_ID;
      rawMarketTokenBalance.marketType = MARKET_TYPE;
      rawMarketTokenBalance.marketId = rawMarket.marketId;
      rawMarketTokenBalance.weirollWallet = weirollWallet;
      rawMarketTokenBalance.tokenClass = tokenClass;
      rawMarketTokenBalance.tokenId = tokenId;
      rawMarketTokenBalance.tokenAmount = tokenAmount;
    } else {
      // If the token balance already exists, we need to update it
      if (type === 0) {
        // Add
        rawMarketTokenBalance.tokenAmount =
          rawMarketTokenBalance.tokenAmount.plus(tokenAmount);
      } else if (type === 1) {
        // Subtract
        rawMarketTokenBalance.tokenAmount =
          rawMarketTokenBalance.tokenAmount.minus(tokenAmount);
      } else if (type === 2) {
        // Set
        rawMarketTokenBalance.tokenAmount = tokenAmount;
      }
    }

    rawMarketTokenBalance.save();
  }
}
