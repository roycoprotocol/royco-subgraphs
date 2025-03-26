import { RawPositionRecipe } from "../generated/schema";
import { generateRawPositionId } from "./utils";
import { withdrawRawPositionTokenBalance } from "./token-balance-handler";
import { WeirollWalletExecutedManually as WeirollWalletExecutedManuallyEvent } from "../generated/templates/WeirollWalletTemplate/WeirollWallet";

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
  }
}
