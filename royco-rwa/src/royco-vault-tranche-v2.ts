import { BigInt } from "@graphprotocol/graph-ts";
import {
  Redeem as RedeemEvent,
  ProtocolFeeSharesMinted as ProtocolFeeSharesMintedEvent,
} from "../generated/templates/RoycoVaultTranche/RoycoVaultTranche";
import { processGlobalTokenTransfer } from "./handlers/base/process-transfer";
import {
  CATEGORY_ASSETS,
  FEES_MAJOR_TYPE_PROTOCOL,
  FEES_MINOR_TYPE_SHARES,
  SUB_CATEGORY_WITHDRAW,
  VAULT_SUB_CATEGORY_JUNIOR,
} from "./constants";
import { addTransferActivity } from "./handlers/activities/transfer";
import { generateVaultId } from "./utils";
import { VaultState } from "../generated/schema";
import { updateFeeState } from "./handlers/fees/update-fees";
import { updateGlobalTransactionLog } from "./handlers/global/transaction-log";
import { updateGlobalVaultTransactionMap } from "./handlers/global/vault-transaction-map";
import { updateGlobalBlockLog } from "./handlers/global/block-log";
import { addGlobalEventLog } from "./handlers/global/event-log";
import { updateGlobalAccountIndex } from "./handlers/global/account-index";
import {
  updateGlobalAccountDailyActivity,
  updateGlobalVaultDailyActivity,
} from "./handlers/global/daily-activity";

export { handleTransfer, handleDeposit } from "./vault";

export function handleRedeem(event: RedeemEvent): void {
  let currVaultAddress = event.address.toHexString();
  let currVaultId = generateVaultId(currVaultAddress);
  let currVaultState = VaultState.load(currVaultId);
  let redeemReceiverAddress = event.params.receiver.toHexString();

  if (!currVaultState || !currVaultState.partnerVaultAddress) {
    return;
  }

  // Global index handlers (per-event, called once)
  updateGlobalTransactionLog(event);
  updateGlobalBlockLog(event);
  addGlobalEventLog(event);

  // Assume currVault is "Senior"
  let seniorVaultAddress = currVaultAddress;
  let juniorVaultAddress = currVaultState.partnerVaultAddress!;

  // If currVault is "Junior", swap senior and junior vault addresses
  if (
    currVaultState.minorType == VAULT_SUB_CATEGORY_JUNIOR &&
    currVaultState.partnerVaultAddress
  ) {
    seniorVaultAddress = currVaultState.partnerVaultAddress!;
    juniorVaultAddress = currVaultAddress;
  }

  let seniorTransfer = processGlobalTokenTransfer(
    seniorVaultAddress, // vault
    CATEGORY_ASSETS,
    SUB_CATEGORY_WITHDRAW,
    seniorVaultAddress, // from
    redeemReceiverAddress, // to
    event.params.claims.stAssets,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash.toHexString(),
    event.logIndex,
    false
  );

  if (seniorTransfer.value.gt(BigInt.fromI32(0))) {
    seniorTransfer.save();
    addTransferActivity(seniorTransfer, SUB_CATEGORY_WITHDRAW);
    updateGlobalVaultTransactionMap(
      seniorTransfer.vaultAddress,
      seniorTransfer.transactionHash,
      seniorTransfer.blockNumber,
      seniorTransfer.blockTimestamp
    );

    updateGlobalAccountIndex(
      seniorTransfer,
      redeemReceiverAddress,
      false,
      false,
      true,
      seniorTransfer.value
    );
    updateGlobalAccountDailyActivity(
      seniorTransfer,
      redeemReceiverAddress,
      false,
      true,
      false,
      seniorTransfer.value
    );
    updateGlobalVaultDailyActivity(
      seniorTransfer,
      false,
      true,
      false,
      seniorTransfer.value
    );
  }

  let juniorTransfer = processGlobalTokenTransfer(
    juniorVaultAddress, // vault
    CATEGORY_ASSETS,
    SUB_CATEGORY_WITHDRAW,
    juniorVaultAddress, // from
    redeemReceiverAddress, // to
    event.params.claims.jtAssets,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash.toHexString(),
    event.logIndex,
    false
  );

  if (juniorTransfer.value.gt(BigInt.fromI32(0))) {
    juniorTransfer.save();
    addTransferActivity(juniorTransfer, SUB_CATEGORY_WITHDRAW);
    updateGlobalVaultTransactionMap(
      juniorTransfer.vaultAddress,
      juniorTransfer.transactionHash,
      juniorTransfer.blockNumber,
      juniorTransfer.blockTimestamp
    );

    updateGlobalAccountIndex(
      juniorTransfer,
      redeemReceiverAddress,
      false,
      false,
      true,
      juniorTransfer.value
    );
    updateGlobalAccountDailyActivity(
      juniorTransfer,
      redeemReceiverAddress,
      false,
      true,
      false,
      juniorTransfer.value
    );
    updateGlobalVaultDailyActivity(
      juniorTransfer,
      false,
      true,
      false,
      juniorTransfer.value
    );
  }
}

export function handleProtocolFeeSharesMinted(
  event: ProtocolFeeSharesMintedEvent
): void {
  if (event.params.mintedProtocolFeeShares.gt(BigInt.fromI32(0))) {
    // Update fees in terms of shares
    updateFeeState(
      event.address.toHexString(), // vault address
      event.params.protocolFeeRecipient.toHexString(), // account address
      event.address.toHexString(), // token address
      event.params.mintedProtocolFeeShares, // value
      FEES_MAJOR_TYPE_PROTOCOL, // major type
      FEES_MINOR_TYPE_SHARES, // minor type
      event.block.number, // block number
      event.block.timestamp, // block timestamp
      event.transaction.hash.toHexString(), // transaction hash
      event.logIndex, // log index
      true
    );
  }
}
