import { RawMarketVault } from "../generated/schema";
import { generateRawMarketId } from "./utils";
import { BigInt } from "@graphprotocol/graph-ts";

export function updateFrontendFee(
  marketId: string,
  newFrontendFee: BigInt
): void {
  let rawMarketRefId = generateRawMarketId(marketId);

  let rawMarketVault = RawMarketVault.load(rawMarketRefId);

  if (rawMarketVault) {
    rawMarketVault.frontendFee = newFrontendFee;
    rawMarketVault.save();
  }
}
