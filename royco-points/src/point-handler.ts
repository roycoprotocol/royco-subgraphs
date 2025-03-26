import { Award as AwardEvent } from "../generated/templates/PointsProgramTemplate/Points";
import {
  RawPoint,
  RawAward,
  RawPointBalance,
  RawAuthorizedPointIssuer,
} from "../generated/schema";
import { CHAIN_ID } from "./constants";
import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  generateId,
  generateTokenId,
  generateRawPointBalanceId,
  generateRawAuthorizedPointIssuerId,
} from "./utils";

export function createRawAward(event: AwardEvent): void {
  let rawPointRefId = generateTokenId(event.address);
  let rawPointBalanceRefId = generateRawPointBalanceId(
    event.address,
    event.params.to
  );

  let rawPoint = RawPoint.load(rawPointRefId);

  if (rawPoint) {
    let rawAwardRefId = generateId(event.transaction.hash, event.logIndex);

    let rawAward = new RawAward(rawAwardRefId);

    rawAward.rawPointRefId = rawPointRefId;
    rawAward.rawPointBalanceRefId = rawPointBalanceRefId;
    rawAward.chainId = CHAIN_ID;
    rawAward.contractAddress = event.address.toHexString();
    rawAward.from = event.params.awardedBy.toHexString();
    rawAward.to = event.params.to.toHexString();
    rawAward.amount = event.params.amount;

    rawAward.blockNumber = event.block.number;
    rawAward.blockTimestamp = event.block.timestamp;
    rawAward.transactionHash = event.transaction.hash.toHexString();
    rawAward.logIndex = event.logIndex;

    rawAward.save();
  }
}

export function updateRawPointTotalSupply(event: AwardEvent): void {
  let rawPointRefId = generateTokenId(event.address);

  let rawPoint = RawPoint.load(rawPointRefId);

  if (rawPoint) {
    rawPoint.totalSupply = rawPoint.totalSupply.plus(event.params.amount);
    rawPoint.save();
  }
}

export function updateRawPointBalance(event: AwardEvent): void {
  let rawPointBalanceRefId = generateRawPointBalanceId(
    event.address,
    event.params.to
  );

  let rawPointBalance = RawPointBalance.load(rawPointBalanceRefId);
  let rawPointRefId = generateTokenId(event.address);

  let rawPoint = RawPoint.load(rawPointRefId);

  if (rawPoint) {
    if (!rawPointBalance) {
      rawPointBalance = new RawPointBalance(rawPointBalanceRefId);

      rawPointBalance.rawPointRefId = rawPointRefId;
      rawPointBalance.chainId = CHAIN_ID;
      rawPointBalance.contractAddress = event.address.toHexString();
      rawPointBalance.accountAddress = event.params.to.toHexString();
      rawPointBalance.amount = BigInt.zero();
    }

    rawPointBalance.amount = rawPointBalance.amount.plus(event.params.amount);

    rawPointBalance.save();
  }
}

export function updateRawAuthorizedPointIssuer(
  tokenAddress: Address,
  issuerAddress: Address
): void {
  let rawPointRefId = generateTokenId(tokenAddress);

  let rawPoint = RawPoint.load(rawPointRefId);

  if (rawPoint) {
    let rawAuthorizedPointIssuerRefId = generateRawAuthorizedPointIssuerId(
      tokenAddress,
      issuerAddress
    );

    let rawAuthorizedPointIssuer = RawAuthorizedPointIssuer.load(
      rawAuthorizedPointIssuerRefId
    );

    if (!rawAuthorizedPointIssuer) {
      rawAuthorizedPointIssuer = new RawAuthorizedPointIssuer(
        rawAuthorizedPointIssuerRefId
      );

      rawAuthorizedPointIssuer.rawPointRefId = rawPointRefId;
      rawAuthorizedPointIssuer.chainId = CHAIN_ID;
      rawAuthorizedPointIssuer.contractAddress = tokenAddress.toHexString();
      rawAuthorizedPointIssuer.accountAddress = issuerAddress.toHexString();

      rawAuthorizedPointIssuer.save();

      let issuerIndex = rawPoint.issuers.indexOf(issuerAddress.toHexString());

      if (issuerIndex == -1) {
        let newIssuers = rawPoint.issuers;
        newIssuers.push(issuerAddress.toHexString());

        rawPoint.issuers = newIssuers;
        rawPoint.save();
      }
    }
  }
}
