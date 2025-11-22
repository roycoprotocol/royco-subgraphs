import { BigInt } from "@graphprotocol/graph-ts";
import { StakedRoyusdTransfer } from "../../../generated/schema";
import {
  CHAIN_ID,
  SOURCE_CONTRACT_ADDRESS_STAKED_ROYUSD,
} from "../../constants";
import { generateId, generateTokenId } from "../../utils";

export function processStakedRoyusdTransfer(
  subCategory: string,
  fromAddress: string,
  toAddress: string,
  rawAmount: BigInt,
  blockNumber: BigInt,
  blockTimestamp: BigInt,
  transactionHash: string,
  logIndex: BigInt
): StakedRoyusdTransfer {
  let entity = new StakedRoyusdTransfer(generateId(transactionHash, logIndex));
  entity.chainId = CHAIN_ID;
  entity.subCategory = subCategory;
  entity.tokenId = generateTokenId(SOURCE_CONTRACT_ADDRESS_STAKED_ROYUSD);
  entity.tokenAddress = SOURCE_CONTRACT_ADDRESS_STAKED_ROYUSD;
  entity.fromAddress = fromAddress;
  entity.toAddress = toAddress;
  entity.rawAmount = rawAmount;
  entity.blockNumber = blockNumber;
  entity.blockTimestamp = blockTimestamp;
  entity.transactionHash = transactionHash;
  entity.logIndex = logIndex;
  entity.createdAt = blockTimestamp;
  entity.save();

  return entity;
}
