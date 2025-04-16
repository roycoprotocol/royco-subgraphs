import { BigInt } from "@graphprotocol/graph-ts";
import {
  WeirollWalletClaimedIncentive as WeirollWalletClaimedIncentiveEvent,
  WeirollWalletExecutedWithdrawal as WeirollWalletExecutedWithdrawalEvent,
  WeirollWalletForfeited as WeirollWalletForfeitedEvent,
} from "../generated/RecipeMarketHub/RecipeMarketHub";
import {
  RawOfferRecipe,
  RawPositionRecipe,
  RawPositionTokenBalanceRecipe,
} from "../generated/schema";
import {
  generateRawOfferTokenBalanceId,
  generateRawPositionId,
  generateRawPositionTokenBalanceId,
  generateTokenId,
} from "./utils";
import {
  createOrUpdateRawMarketTokenBalance,
  updateRawOfferTokenBalance,
  updateRawVolume,
  withdrawRawPositionTokenBalance,
} from "./token-balance-handler";
import { store } from "@graphprotocol/graph-ts";

export function claimIncentive(
  event: WeirollWalletClaimedIncentiveEvent
): void {
  let rawPositionRefId = generateRawPositionId(
    event.params.weirollWallet.toHexString()
  );

  let rawPosition = RawPositionRecipe.load(rawPositionRefId);

  if (rawPosition) {
    let tokenIndex = rawPosition.token1Ids.indexOf(
      generateTokenId(event.params.incentive)
    );

    if (tokenIndex != -1 && rawPosition.isClaimed[tokenIndex] == false) {
      withdrawRawPositionTokenBalance(
        event.params.weirollWallet.toHexString(), // Weiroll Wallet
        1, // Token class: Incentive
        rawPosition.token1Ids[tokenIndex] // Incentive Token ID
      );

      let newIsClaimed = rawPosition.isClaimed;
      newIsClaimed[tokenIndex] = true;
      rawPosition.isClaimed = newIsClaimed;

      rawPosition.save();
    }
  }
}

export function withdrawInputToken(
  event: WeirollWalletExecutedWithdrawalEvent
): void {
  let rawPositionRefId = generateRawPositionId(
    event.params.weirollWallet.toHexString()
  );

  let rawPosition = RawPositionRecipe.load(rawPositionRefId);

  if (rawPosition && rawPosition.isWithdrawn == false) {
    withdrawRawPositionTokenBalance(
      event.params.weirollWallet.toHexString(), // Weiroll Wallet
      0, // Token class: Input
      rawPosition.token0Id // Token ID
    );

    rawPosition.isWithdrawn = true;
    rawPosition.save();

    // Update volume
    updateRawVolume(
      rawPosition.marketId, // Market Hash
      rawPosition.token0Id, // Input Token ID
      rawPosition.token0Amount, // Input fill amount
      event.block.number, // Block number
      event.block.timestamp, // Block timestamp
      event.transaction.hash, // Transaction hash
      event.logIndex, // Log index
      0 // Type: Add
    );
  }
}

export function forfeitPosition(event: WeirollWalletForfeitedEvent): void {
  let rawPositionRefId = generateRawPositionId(
    event.params.weirollWallet.toHexString()
  );

  let rawPosition = RawPositionRecipe.load(rawPositionRefId);

  if (rawPosition && rawPosition.isForfeited == false) {
    let token1Ids = rawPosition.token1Ids;
    let token1Amounts = rawPosition.token1Amounts;

    let rawOfferRefId = rawPosition.rawOfferRefId;
    let rawOffer = RawOfferRecipe.load(rawOfferRefId);

    if (rawOffer) {
      if (rawOffer.offerSide == 0) {
        // rawOffer was AP Offer
        // so remove incentives from rawMarketTokenBalance
        // @note: no de-duplication required, because token1Ids will always have unique tokens
        for (let i = 0; i < token1Ids.length; i++) {
          createOrUpdateRawMarketTokenBalance(
            rawOffer.marketId, // Market Hash
            1, // Token class: Incentive
            token1Ids[i], // Incentive Token ID
            token1Amounts[i], // Incentive Token Amount
            1 // Type: Subtract
          );
        }
      } else {
        // rawOffer was IP Offer
        // if cancelled or expired, remove incentives from rawMarketTokenBalance
        // else return incentives to rawOffer

        if (
          rawOffer.isCancelled == true ||
          (rawOffer.expiry <= event.block.timestamp &&
            !rawOffer.expiry.equals(BigInt.zero()))
        ) {
          // @note: no de-duplication required, because token1Ids will always have unique tokens
          for (let i = 0; i < token1Ids.length; i++) {
            createOrUpdateRawMarketTokenBalance(
              rawOffer.marketId, // Market Hash
              1, // Token class: Incentive
              token1Ids[i], // Incentive Token ID
              token1Amounts[i], // Incentive Token Amount
              1 // Type: Subtract
            );
          }
        } else {
          let newToken1AmountsRemaining = rawOffer.token1AmountsRemaining;

          // @note: no de-duplication required, because token1Ids will always have unique tokens
          for (let i = 0; i < token1Ids.length; i++) {
            updateRawOfferTokenBalance(
              generateRawOfferTokenBalanceId(
                rawOffer.id, // Offer Ref ID
                1, // Token class: Incentive
                token1Ids[i] // Incentive Token ID
              ),
              newToken1AmountsRemaining[i], // Incentive Token Amount
              0 // Type: Add
            );

            newToken1AmountsRemaining[i] = rawOffer.token1AmountsRemaining[
              i
            ].plus(token1Amounts[i]);
          }

          rawOffer.token1AmountsRemaining = newToken1AmountsRemaining;

          rawOffer.save();
        }
      }
    }

    // Remove all incentive tokens from rawPosition and rawPositionTokenBalance
    for (let i = 0; i < token1Ids.length; i++) {
      let rawPositionTokenBalanceRefId = generateRawPositionTokenBalanceId(
        rawPositionRefId, // Position Ref ID
        1, // Token class: Incentive
        token1Ids[i] // Incentive Token ID
      );

      let rawPositionTokenBalance = RawPositionTokenBalanceRecipe.load(
        rawPositionTokenBalanceRefId
      );

      if (rawPositionTokenBalance) {
        store.remove(
          "RawPositionTokenBalanceRecipe",
          rawPositionTokenBalanceRefId
        );
      }
    }

    // rawPosition.token1Ids = [];
    // rawPosition.token1Amounts = [];
    rawPosition.isForfeited = true;
    // rawPosition.isClaimed = [];
    rawPosition.unlockTimestamp = event.block.timestamp;

    rawPosition.save();
  }
}
