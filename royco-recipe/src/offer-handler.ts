import { Address, BigInt, Bytes, Int8 } from "@graphprotocol/graph-ts";
import { RawMarketRecipe, RawOfferRecipe } from "../generated/schema";
import { CHAIN_ID, MARKET_TYPE } from "./constants";
import {
  generateRawMarketId,
  generateRawOfferId,
  generateRawOfferTokenBalanceId,
  generateTokenId,
} from "./utils";
import {
  createRawOfferTokenBalance,
  updateRawOfferTokenBalance,
} from "./token-balance-handler";

export function createRawOffer(
  marketId: string,
  offerSide: Int8,
  offerId: string,
  accountAddress: string,
  fundingVault: string,
  token0Amount: BigInt,
  token1Addresses: Address[],
  token1Amounts: BigInt[],
  expiry: BigInt,
  blockNumber: BigInt,
  blockTimestamp: BigInt,
  transactionHash: Bytes,
  logIndex: BigInt
): void {
  let rawMarketRefId = generateRawMarketId(marketId);
  let rawMarket = RawMarketRecipe.load(rawMarketRefId);

  if (rawMarket) {
    let rawOfferRefId = generateRawOfferId(offerSide, offerId);

    let rawOffer = new RawOfferRecipe(rawOfferRefId);

    rawOffer.rawMarketRefId = rawMarketRefId;
    rawOffer.chainId = CHAIN_ID;
    rawOffer.marketType = MARKET_TYPE;
    rawOffer.offerSide = offerSide;
    rawOffer.offerId = offerId;
    rawOffer.marketId = rawMarket.marketId;

    rawOffer.accountAddress = accountAddress;
    rawOffer.fundingVault = fundingVault;

    rawOffer.token0Id = rawMarket.inputTokenId;
    rawOffer.token0Amount = token0Amount;
    rawOffer.token0AmountRemaining = token0Amount;

    rawOffer.token1Ids = token1Addresses.map<string>((address) =>
      generateTokenId(address)
    );
    rawOffer.token1Amounts = token1Amounts;
    rawOffer.token1AmountsRemaining = token1Amounts;

    rawOffer.expiry = expiry;
    rawOffer.isCancelled = false;

    rawOffer.blockNumber = blockNumber;
    rawOffer.blockTimestamp = blockTimestamp;
    rawOffer.transactionHash = transactionHash.toHexString();
    rawOffer.logIndex = logIndex;

    rawOffer.save();

    /**
     * @description Create a new RawOfferTokenBalance entity for the Input token
     * @note no de-duplication required, because only one token
     */
    createRawOfferTokenBalance(
      rawMarket.marketId, // Market Hash
      offerSide, // Offer side
      offerId, // Offer ID
      0, // Token class: Input
      rawMarket.inputTokenId, // Input Token ID
      token0Amount, // Input Token Amount
      accountAddress, // Wallet Address
      fundingVault // Funding Vault Address
    );

    /**
     * @description Create a new RawOfferTokenBalance entity for each incentive token
     * @note no de-duplication required, because token1Ids will always have unique tokens
     */
    for (let i = 0; i < token1Addresses.length; i++) {
      createRawOfferTokenBalance(
        rawMarket.marketId, // Market Hash
        offerSide, // Offer side
        offerId, // Offer ID
        1, // Token class: Incentive
        generateTokenId(token1Addresses[i]), // Incentive Token ID
        token1Amounts[i], // Incentive Token Amount
        accountAddress, // Wallet Address
        fundingVault // Funding Vault Address
      );
    }
  }
}

export function fillRawOffer(
  rawMarketRefId: string,
  rawOfferRefId: string,
  fillToken0Amount: BigInt,
  fillToken1Amounts: BigInt[]
): void {
  let rawMarket = RawMarketRecipe.load(rawMarketRefId);
  let rawOffer = RawOfferRecipe.load(rawOfferRefId);

  if (rawMarket && rawOffer) {
    let newToken0AmountRemaining =
      rawOffer.token0AmountRemaining.minus(fillToken0Amount);

    /**
     * @description Update the Input token balance in the offer
     * @note no de-duplication required, because only one token
     */
    updateRawOfferTokenBalance(
      generateRawOfferTokenBalanceId(
        rawOfferRefId, // Offer Ref ID
        0, // Token class: Input
        rawOffer.token0Id // Input Token ID
      ),
      fillToken0Amount, // Input Token Amount
      1 // Subtract
    );

    let newToken1AmountsRemaining = rawOffer.token1AmountsRemaining;

    /**
     * @description Update the incentive token balance in the offer
     * @note no de-duplication required, because token1Ids will always have unique tokens
     */
    for (let i = 0; i < rawOffer.token1Ids.length; i++) {
      newToken1AmountsRemaining[i] = newToken1AmountsRemaining[i].minus(
        fillToken1Amounts[i]
      );

      updateRawOfferTokenBalance(
        generateRawOfferTokenBalanceId(
          rawOfferRefId, // Offer Ref ID
          1, // Token class: Incentive
          rawOffer.token1Ids[i] // Incentive Token ID
        ),
        fillToken1Amounts[i], // Incentive Token Amount
        1 // Subtract
      );
    }

    rawOffer.token0AmountRemaining = newToken0AmountRemaining;
    rawOffer.token1AmountsRemaining = newToken1AmountsRemaining;

    rawOffer.save();
  }
}
