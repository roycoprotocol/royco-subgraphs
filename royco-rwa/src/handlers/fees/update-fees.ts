import { BigInt } from "@graphprotocol/graph-ts";
import {
  FeeState,
  FeeHistorical,
  GlobalTokenTransfer,
} from "../../../generated/schema";
import {
  ZERO_ADDRESS,
  CATEGORY_SHARES,
  METRIC_DEPOSITORS,
  CHAIN_ID,
} from "../../constants";
import {
  generateFeeStateId,
  generateFeeHistoricalId,
  generateVaultId,
  generateTokenId,
} from "../../utils";

export function addFeeHistorical(feeState: FeeState): FeeHistorical {
  let feeHistoricalId = generateFeeHistoricalId(
    feeState.transactionHash,
    feeState.logIndex,
    feeState.vaultAddress,
    feeState.accountAddress,
    feeState.majorType,
    feeState.minorType,
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
  feeHistorical.value = feeState.value;
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
): FeeState {
  let feeStateId = generateFeeStateId(
    vaultAddress,
    accountAddress,
    majorType,
    minorType,
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
  feeState.blockNumber = blockNumber;
  feeState.blockTimestamp = blockTimestamp;
  feeState.transactionHash = transactionHash;
  feeState.logIndex = logIndex;
  feeState.updatedAt = blockTimestamp;
  feeState.save();

  addFeeHistorical(feeState);

  return feeState;
}
