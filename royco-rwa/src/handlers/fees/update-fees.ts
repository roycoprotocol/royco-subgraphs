import { BigInt } from "@graphprotocol/graph-ts";
import { FeeState, FeeHistorical } from "../../../generated/schema";
import { CHAIN_ID } from "../../constants";
import {
  generateFeeStateId,
  generateFeeHistoricalId,
  generateVaultId,
  generateTokenId,
} from "../../utils";

export function addFeeHistorical(
  feeState: FeeState,
  feeValue: BigInt
): FeeHistorical {
  let feeHistoricalId = generateFeeHistoricalId(
    feeState.transactionHash,
    feeState.logIndex,
    feeState.vaultAddress,
    feeState.accountAddress,
    feeState.majorType,
    feeState.minorType
  );

  let feeHistorical = new FeeHistorical(feeHistoricalId);

  feeHistorical.vaultId = feeState.vaultId;
  feeHistorical.chainId = feeState.chainId;
  feeHistorical.vaultAddress = feeState.vaultAddress;
  feeHistorical.accountAddress = feeState.accountAddress;
  feeHistorical.majorType = feeState.majorType;
  feeHistorical.minorType = feeState.minorType;
  feeHistorical.tokenId = feeState.tokenId;
  feeHistorical.tokenAddress = feeState.tokenAddress;
  feeHistorical.value = feeValue;
  feeHistorical.updateOffchain = feeState.updateOffchain;
  feeHistorical.blockNumber = feeState.blockNumber;
  feeHistorical.blockTimestamp = feeState.blockTimestamp;
  feeHistorical.transactionHash = feeState.transactionHash;
  feeHistorical.logIndex = feeState.logIndex;
  feeHistorical.createdAt = feeState.createdAt;
  feeHistorical.save();

  return feeHistorical;
}

export function updateFeeState(
  vaultAddress: string,
  accountAddress: string,
  tokenAddress: string,
  value: BigInt,
  majorType: string,
  minorType: string,
  blockNumber: BigInt,
  blockTimestamp: BigInt,
  transactionHash: string,
  logIndex: BigInt,
  updateOffchain: boolean
): FeeState {
  let feeStateId = generateFeeStateId(
    vaultAddress,
    accountAddress,
    majorType,
    minorType
  );

  let feeState = FeeState.load(feeStateId);
  if (!feeState) {
    feeState = new FeeState(feeStateId);

    feeState.vaultId = generateVaultId(vaultAddress);
    feeState.chainId = CHAIN_ID;
    feeState.vaultAddress = vaultAddress;
    feeState.accountAddress = accountAddress;
    feeState.majorType = majorType;
    feeState.minorType = minorType;
    feeState.tokenId = generateTokenId(tokenAddress);
    feeState.tokenAddress = tokenAddress;
    feeState.value = BigInt.fromI32(0);
    feeState.createdAt = blockTimestamp;
  }

  feeState.value = feeState.value.plus(value);
  feeState.updateOffchain = updateOffchain;
  feeState.blockNumber = blockNumber;
  feeState.blockTimestamp = blockTimestamp;
  feeState.transactionHash = transactionHash;
  feeState.logIndex = logIndex;
  feeState.updatedAt = blockTimestamp;
  feeState.save();

  addFeeHistorical(feeState, value);

  return feeState;
}
