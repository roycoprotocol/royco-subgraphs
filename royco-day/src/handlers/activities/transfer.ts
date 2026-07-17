import { BigInt } from "@graphprotocol/graph-ts";
import {
  GlobalTokenActivity,
  GlobalTokenTransfer,
} from "../../../generated/schema";
import {
  ZERO_ADDRESS,
  SUB_CATEGORY_MINT,
  SUB_CATEGORY_BURN,
  SUB_CATEGORY_TRANSFER_IN,
  SUB_CATEGORY_TRANSFER_OUT,
  SUB_CATEGORY_DEPOSIT,
  SUB_CATEGORY_WITHDRAW,
  ACTIVITY_TYPE_TRANSFER,
  STATUS_COMPLETED,
} from "../../constants";
import { generateGlobalTokenActivityId } from "../../utils";

/**
 * Derive a GlobalTokenActivity from a GlobalTokenTransfer.
 *
 * One transfer can yield SEVERAL activities: a plain share transfer is one
 * movement but two account-facing events (transferOut for `from`, transferIn for
 * `to`), and a Redeem's three asset legs are three activities on one log. The
 * activity id carries both `subCategory` and `tokenIndex`, so neither collides.
 *
 * THREE DELIBERATE DEPARTURES from royco-rwa's version — do not "restore" them:
 *
 *   1. Arg order. royco-day's generateGlobalTokenActivityId is
 *      (tx, logIndex, vaultAddress, category, subCategory, tokenIndex);
 *      royco-rwa's is (tx, logIndex, category, subCategory, vaultAddress, ...).
 *      All three middle params are `string`, so copying rwa's call site verbatim
 *      COMPILES CLEAN and silently emits a differently-shaped id into a shared
 *      Neon column.
 *   2. `tokenIndex` is a real parameter, not rwa's hardcoded 0 at every call
 *      site. royco-day is the first package that needs it non-zero.
 *   3. `activity.tokenAddress = transfer.tokenAddress`, NOT rwa's
 *      `transfer.vaultAddress`. rwa's is a latent bug, invisible only because
 *      its CATEGORY_SHARES rows have tokenAddress == vaultAddress. It is flatly
 *      wrong for CATEGORY_ASSETS — i.e. every Deposit and Redeem row here.
 */
export function addTransferActivity(
  transfer: GlobalTokenTransfer,
  transferSubCategoryToAdd: string,
  tokenIndex: i32
): GlobalTokenActivity {
  // Which side of the movement this activity is FOR. rwa's mapping, and correct:
  // the account credited on the way in, debited on the way out.
  let accountAddress = ZERO_ADDRESS;
  if (
    transferSubCategoryToAdd == SUB_CATEGORY_MINT ||
    transferSubCategoryToAdd == SUB_CATEGORY_TRANSFER_IN ||
    transferSubCategoryToAdd == SUB_CATEGORY_WITHDRAW
  ) {
    accountAddress = transfer.toAddress;
  } else if (
    transferSubCategoryToAdd == SUB_CATEGORY_BURN ||
    transferSubCategoryToAdd == SUB_CATEGORY_TRANSFER_OUT ||
    transferSubCategoryToAdd == SUB_CATEGORY_DEPOSIT
  ) {
    accountAddress = transfer.fromAddress;
  }

  const activity = new GlobalTokenActivity(
    generateGlobalTokenActivityId(
      transfer.transactionHash,
      transfer.logIndex,
      transfer.vaultAddress,
      transfer.category,
      transferSubCategoryToAdd,
      BigInt.fromI32(tokenIndex)
    )
  );

  activity.vaultId = transfer.vaultId;
  activity.chainId = transfer.chainId;
  activity.vaultAddress = transfer.vaultAddress;
  activity.category = transfer.category;
  activity.subCategory = transferSubCategoryToAdd;
  activity.accountAddress = accountAddress;
  activity.type = ACTIVITY_TYPE_TRANSFER;
  activity.tokenIndex = BigInt.fromI32(tokenIndex);
  activity.tokenId = transfer.tokenId;
  activity.tokenAddress = transfer.tokenAddress;
  activity.value = transfer.value;
  activity.status = STATUS_COMPLETED;
  activity.blockNumber = transfer.blockNumber;
  activity.blockTimestamp = transfer.blockTimestamp;
  activity.transactionHash = transfer.transactionHash;
  activity.logIndex = transfer.logIndex;
  activity.createdAt = transfer.blockTimestamp;
  activity.save();

  return activity;
}
