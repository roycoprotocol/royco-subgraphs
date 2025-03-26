import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  RawMarketRecipeDestination,
  RawWeirollWalletDestination,
  RawWeirollWalletMapDestination,
  RawWeirollWalletWithdrawnDestination,
} from "../generated/schema";
import {
  SOURCE_CHAIN_ID,
  DESTINATION_CHAIN_ID,
  MARKET_TYPE,
} from "./constants";
import { DepositExecutor } from "../generated/DepositExecutor/DepositExecutor";
import { createOrUpdateRawMarketTokenBalance } from "./token-balance-handler";
import { generateRawMarketId } from "./utils";

export function createNewRawMarketDestination(
  marketId: string
): RawMarketRecipeDestination {
  let rawMarketDestination = new RawMarketRecipeDestination(
    SOURCE_CHAIN_ID.toString()
      .concat("_")
      .concat(MARKET_TYPE.toString())
      .concat("_")
      .concat(marketId)
  );

  rawMarketDestination.sourceChainId = SOURCE_CHAIN_ID;
  rawMarketDestination.destinationChainId = DESTINATION_CHAIN_ID;
  rawMarketDestination.marketType = MARKET_TYPE;
  rawMarketDestination.marketId = marketId;

  return rawMarketDestination;
}

export function updateRawMarketDestinationUnlockTimestamp(
  marketId: string,
  unlockTimestamp: BigInt
): void {
  let rawMarketDestination = RawMarketRecipeDestination.load(
    SOURCE_CHAIN_ID.toString()
      .concat("_")
      .concat(MARKET_TYPE.toString())
      .concat("_")
      .concat(marketId)
  );

  if (!rawMarketDestination) {
    rawMarketDestination = createNewRawMarketDestination(marketId);
  }

  rawMarketDestination.unlockTimestamp = unlockTimestamp;

  rawMarketDestination.save();
}

export function updateRawMarketDestinationReceiptToken(
  marketId: string,
  receiptToken: string
): void {
  let rawMarketDestination = RawMarketRecipeDestination.load(
    SOURCE_CHAIN_ID.toString()
      .concat("_")
      .concat(MARKET_TYPE.toString())
      .concat("_")
      .concat(marketId)
  );

  if (!rawMarketDestination) {
    rawMarketDestination = createNewRawMarketDestination(marketId);
  }

  rawMarketDestination.receiptTokenId = DESTINATION_CHAIN_ID.toString()
    .concat("-")
    .concat(receiptToken);

  rawMarketDestination.save();
}

export function updateRawMarketDestinationInputTokens(
  marketId: string,
  inputTokens: string[]
): void {
  let rawMarketDestination = RawMarketRecipeDestination.load(
    SOURCE_CHAIN_ID.toString()
      .concat("_")
      .concat(MARKET_TYPE.toString())
      .concat("_")
      .concat(marketId)
  );

  if (!rawMarketDestination) {
    rawMarketDestination = createNewRawMarketDestination(marketId);
  }

  rawMarketDestination.inputTokenIds = inputTokens.map<string>((inputToken) =>
    DESTINATION_CHAIN_ID.toString().concat("-").concat(inputToken)
  );

  rawMarketDestination.save();
}

export function processRawWeirollWalletDestination(
  weirollWallet: string,
  marketId: string,
  processTransactionHash: string,
  ccdmNonce: BigInt
): void {
  let rawWeirollWalletDestinationRefId = SOURCE_CHAIN_ID.toString()
    .concat("_")
    .concat(DESTINATION_CHAIN_ID.toString())
    .concat("_")
    .concat(marketId)
    .concat("_")
    .concat(ccdmNonce.toString());

  let rawWeirollWalletDestination = RawWeirollWalletDestination.load(
    rawWeirollWalletDestinationRefId
  );

  if (!rawWeirollWalletDestination) {
    rawWeirollWalletDestination = new RawWeirollWalletDestination(
      rawWeirollWalletDestinationRefId
    );

    rawWeirollWalletDestination.sourceChainId = SOURCE_CHAIN_ID;
    rawWeirollWalletDestination.destinationChainId = DESTINATION_CHAIN_ID;

    rawWeirollWalletDestination.rawMarketRecipeDestinationRefId =
      SOURCE_CHAIN_ID.toString()
        .concat("_")
        .concat(MARKET_TYPE.toString())
        .concat("_")
        .concat(marketId);

    rawWeirollWalletDestination.marketId = marketId;
    rawWeirollWalletDestination.ccdmNonce = ccdmNonce;
    rawWeirollWalletDestination.weirollWallet = weirollWallet;
    rawWeirollWalletDestination.processTransactionHash = processTransactionHash;

    rawWeirollWalletDestination.save();

    // Create a map for the weiroll wallet destination
    let rawWeirollWalletMapDestination = new RawWeirollWalletMapDestination(
      SOURCE_CHAIN_ID.toString()
        .concat("_")
        .concat(DESTINATION_CHAIN_ID.toString())
        .concat("_")
        .concat(weirollWallet)
    );

    rawWeirollWalletMapDestination.sourceChainId = SOURCE_CHAIN_ID;
    rawWeirollWalletMapDestination.destinationChainId = DESTINATION_CHAIN_ID;
    rawWeirollWalletMapDestination.weirollWallet = weirollWallet;

    rawWeirollWalletMapDestination.rawWeirollWalletDestinationRefId =
      rawWeirollWalletDestinationRefId;

    rawWeirollWalletMapDestination.save();
  }
}

export function executeRawWeirollWalletDestination(
  weirollWallet: string,
  receiptTokenAmount: BigInt,
  transactionHash: string
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
      rawWeirollWalletDestination.receiptTokenAmount = receiptTokenAmount;
      rawWeirollWalletDestination.executeTransactionHash = transactionHash;

      rawWeirollWalletDestination.save();
    }
  }
}

export function withdrawRawWeirollWalletDestination(
  weirollWallet: string,
  withdrawTransactionHash: string,
  depositLeaf: string
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
      let rawMarketDestinationRefId = generateRawMarketId(
        rawWeirollWalletDestination.marketId
      );

      let rawMarket = RawMarketRecipeDestination.load(
        rawMarketDestinationRefId
      );

      if (rawMarket) {
        let rawWeirollWalletWithdrawnDestinationRefId =
          SOURCE_CHAIN_ID.toString()
            .concat("_")
            .concat(DESTINATION_CHAIN_ID.toString())
            .concat("_")
            .concat(rawWeirollWalletDestination.marketId)
            .concat("_")
            .concat(rawWeirollWalletDestination.ccdmNonce.toString())
            .concat("_")
            .concat(depositLeaf);

        let rawWeirollWalletWithdrawnDestination =
          RawWeirollWalletWithdrawnDestination.load(
            rawWeirollWalletWithdrawnDestinationRefId
          );

        if (!rawWeirollWalletWithdrawnDestination) {
          let rawWeirollWalletWithdrawnDestination =
            new RawWeirollWalletWithdrawnDestination(
              rawWeirollWalletWithdrawnDestinationRefId
            );

          rawWeirollWalletWithdrawnDestination.withdrawTransactionHash =
            withdrawTransactionHash;
          rawWeirollWalletWithdrawnDestination.isWithdrawn = true;

          rawWeirollWalletWithdrawnDestination.save();
        }
      }
    }
  }
}
