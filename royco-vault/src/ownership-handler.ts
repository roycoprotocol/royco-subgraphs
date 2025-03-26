import { RawMarketVault } from "../generated/schema";
import { generateRawMarketId } from "./utils";

export function updateMarketOwner(marketId: string, newOwner: string): void {
  let rawMarketRefId = generateRawMarketId(marketId);

  let entity = RawMarketVault.load(rawMarketRefId);

  if (entity) {
    entity.owner = newOwner;
    entity.save();
  }
}
