import { Address, BigInt, Bytes, Int8 } from "@graphprotocol/graph-ts";
import { RawMarketVault, RawOfferVault } from "../generated/schema";
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
  let rawMarket = RawMarketVault.load(rawMarketRefId);

  if (rawMarket) {
    let rawOfferRefId = generateRawOfferId(offerSide, offerId);

    let rawOffer = new RawOfferVault(rawOfferRefId);

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
     */
    createRawOfferTokenBalance(
      rawMarket.marketId, // Market ID
      offerSide, // Offer side
      offerId, // Offer ID
      0, // Token class: Input
      rawMarket.inputTokenId, // Token ID
      token0Amount, // Token amount
      accountAddress, // Account address
      fundingVault // Funding vault address
    );

    /**
     * @description Create a new RawOfferTokenBalance entity for the incentive tokens
     */
    for (let i = 0; i < token1Addresses.length; i++) {
      createRawOfferTokenBalance(
        rawMarket.marketId, // Market ID
        offerSide, // Offer side
        offerId, // Offer ID
        1, // Token class: Incentive
        generateTokenId(token1Addresses[i]), // Incentive token ID
        token1Amounts[i], // Incentive token amount
        accountAddress, // Account address
        fundingVault // Funding vault address
      );
    }
  }
}

export function fillRawOffer(
  rawMarketRefId: string,
  rawOfferRefId: string,
  fillAmount: BigInt
): void {
  let rawMarket = RawMarketVault.load(rawMarketRefId);
  let rawOffer = RawOfferVault.load(rawOfferRefId);

  if (rawMarket && rawOffer) {
    let newToken0AmountRemaining =
      rawOffer.token0AmountRemaining.minus(fillAmount);

    /**
     * @description Update the Input token balance in the offer
     */
    updateRawOfferTokenBalance(
      generateRawOfferTokenBalanceId(
        rawOfferRefId, // Offer Ref ID
        0, // Token class: Input
        rawOffer.token0Id // Input token ID
      ),
      fillAmount, // Input token amount
      1 // Type: Subtract
    );

    rawOffer.token0AmountRemaining = newToken0AmountRemaining;

    rawOffer.save();
  }
}
