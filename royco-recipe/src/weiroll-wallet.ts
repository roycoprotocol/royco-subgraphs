import { RawPositionRecipe } from "../generated/schema";
import { generateRawPositionId } from "./utils";
import { withdrawRawPositionTokenBalance } from "./token-balance-handler";
import { WeirollWalletExecutedManually as WeirollWalletExecutedManuallyEvent } from "../generated/templates/WeirollWalletTemplate/WeirollWallet";
import { createRawGlobalActivity } from "./global-activity-handler";
import { BigInt } from "@graphprotocol/graph-ts";

export function handleWeirollWalletExecutedManually(
  event: WeirollWalletExecutedManuallyEvent
): void {
  let rawPositionRefId = generateRawPositionId(event.address.toHexString());

  let rawPosition = RawPositionRecipe.load(rawPositionRefId);

  if (rawPosition && rawPosition.isWithdrawn == false) {
    withdrawRawPositionTokenBalance(
      event.address.toHexString(), // Weiroll Wallet
      0, // Token class: Input
      rawPosition.token0Id // Token ID
    );

    rawPosition.isWithdrawn = true;
    rawPosition.save();

    // Create "withdraw" event
    createRawGlobalActivity(
      "recipe", // Category
      "withdraw", // Sub Category
      rawPosition.rawMarketRefId, // Source Ref ID
      event.address.toHexString(), // Contract Address
      rawPosition.accountAddress, // Account Address
      BigInt.fromI32(0), // Token Index
      rawPosition.token0Id, // Token ID
      rawPosition.token0Amount, // Token Amount
      event.block.number, // Block Number
      event.block.timestamp, // Block Timestamp
      event.transaction.hash, // Transaction Hash
      event.logIndex // Log Index
    );
  }
}
