import { BigInt } from "@graphprotocol/graph-ts";
import {
  RawWeirollWalletSource,
  RawCcdmNonceBridgedMapSource,
} from "../generated/schema";
import { SOURCE_CHAIN_ID, DESTINATION_CHAIN_ID } from "./constants";

export function updateCcdmNonceBridgedMapSource(
  marketId: string,
  weirollWallet: string
): void {
  let rawCcdmNonceBridgedMapSource = RawCcdmNonceBridgedMapSource.load(
    SOURCE_CHAIN_ID.toString().concat("_").concat(marketId)
  );

  if (!rawCcdmNonceBridgedMapSource) {
    rawCcdmNonceBridgedMapSource = new RawCcdmNonceBridgedMapSource(
      SOURCE_CHAIN_ID.toString().concat("_").concat(marketId)
    );

    rawCcdmNonceBridgedMapSource.sourceChainId = SOURCE_CHAIN_ID;
    rawCcdmNonceBridgedMapSource.destinationChainId = DESTINATION_CHAIN_ID;
    rawCcdmNonceBridgedMapSource.marketId = marketId;
    rawCcdmNonceBridgedMapSource.weirollWallets = [];
  }

  let newWeirollWallets = rawCcdmNonceBridgedMapSource.weirollWallets;
  newWeirollWallets.push(weirollWallet);
  rawCcdmNonceBridgedMapSource.weirollWallets = newWeirollWallets;

  rawCcdmNonceBridgedMapSource.save();
}

export function depositWeirollWalletSource(
  weirollWallet: string,
  marketId: string,
  depositLeaf: string,
  merkleDepositNonce: BigInt,
  amountDeposited: BigInt,
  depositTransactionHash: string
): void {
  let rawWeirollWalletSource = new RawWeirollWalletSource(
    SOURCE_CHAIN_ID.toString().concat("_").concat(weirollWallet)
  );

  rawWeirollWalletSource.sourceChainId = SOURCE_CHAIN_ID;
  rawWeirollWalletSource.destinationChainId = DESTINATION_CHAIN_ID;
  rawWeirollWalletSource.weirollWallet = weirollWallet;
  rawWeirollWalletSource.marketId = marketId;
  rawWeirollWalletSource.depositLeaf = depositLeaf;
  rawWeirollWalletSource.merkleDepositNonce = merkleDepositNonce;
  rawWeirollWalletSource.amountDeposited = amountDeposited;
  rawWeirollWalletSource.rawMarketRefId = SOURCE_CHAIN_ID.toString()
    .concat("_")
    .concat("0")
    .concat("_")
    .concat(marketId);
  rawWeirollWalletSource.rawMarketRecipeDestinationRefId =
    SOURCE_CHAIN_ID.toString()
      .concat("_")
      .concat(DESTINATION_CHAIN_ID.toString())
      .concat("_")
      .concat(marketId);
  rawWeirollWalletSource.depositTransactionHash = depositTransactionHash;

  rawWeirollWalletSource.save();
}

export function withdrawWeirollWalletSource(
  weirollWallet: string,
  forfeitTransactionHash: string
): void {
  let rawWeirollWalletSource = RawWeirollWalletSource.load(
    SOURCE_CHAIN_ID.toString().concat("_").concat(weirollWallet)
  );

  if (rawWeirollWalletSource) {
    rawWeirollWalletSource.forfeitTransactionHash = forfeitTransactionHash;

    rawWeirollWalletSource.save();
  }
}

export function bridgeWeirollWalletSource(
  marketId: string,
  weirollWallet: string,
  ccdmNonce: BigInt,
  bridgeTransactionHash: string,
  totalAmountBridged: BigInt
): void {
  let rawWeirollWalletSource = RawWeirollWalletSource.load(
    SOURCE_CHAIN_ID.toString().concat("_").concat(weirollWallet)
  );

  if (rawWeirollWalletSource) {
    // update the weiroll wallet source
    rawWeirollWalletSource.rawWeirollWalletDestinationRefId =
      SOURCE_CHAIN_ID.toString()
        .concat("_")
        .concat(DESTINATION_CHAIN_ID.toString())
        .concat("_")
        .concat(marketId)
        .concat("_")

        .concat(ccdmNonce.toString());

    rawWeirollWalletSource.rawWeirollWalletWithdrawnDestinationRefId =
      SOURCE_CHAIN_ID.toString()
        .concat("_")
        .concat(DESTINATION_CHAIN_ID.toString())
        .concat("_")
        .concat(marketId)
        .concat("_")
        .concat(ccdmNonce.toString())
        .concat("_")
        .concat(rawWeirollWalletSource.depositLeaf);

    rawWeirollWalletSource.ccdmNonce = ccdmNonce;
    rawWeirollWalletSource.totalAmountBridged = totalAmountBridged;
    rawWeirollWalletSource.bridgeTransactionHash = bridgeTransactionHash;

    rawWeirollWalletSource.save();
  }
}

export function findAndUpdateWeirollWallets(
  marketId: string,
  ccdmNonce: BigInt,
  bridgeTransactionHash: string,
  totalAmountBridged: BigInt
): void {
  // find the weiroll wallets that have this lastCcdmNonceBridged
  let rawCcdmNonceBridgedMapSource = RawCcdmNonceBridgedMapSource.load(
    SOURCE_CHAIN_ID.toString().concat("_").concat(marketId)
  );

  if (rawCcdmNonceBridgedMapSource) {
    // get all the weiroll wallets to bridge
    let weirollWallets = rawCcdmNonceBridgedMapSource.weirollWallets;

    // update the status of the weiroll wallets
    for (let i = 0; i < weirollWallets.length; i++) {
      let rawWeirollWalletSource = RawWeirollWalletSource.load(
        SOURCE_CHAIN_ID.toString().concat("_").concat(weirollWallets[i])
      );

      if (rawWeirollWalletSource) {
        bridgeWeirollWalletSource(
          marketId,
          weirollWallets[i],
          ccdmNonce,
          bridgeTransactionHash,
          totalAmountBridged
        );
      }
    }
  }
}
