import { ethereum } from "@graphprotocol/graph-ts";
import {
  DayAccountantMarketMap,
  DayMarketState,
} from "../../../generated/schema";
import { generateAccountantMarketMapId } from "../../utils";

/**
 * Resolve the DayMarketState an Accountant event belongs to.
 *
 * Accountant addresses are not market ids. The factory writes the immutable mapping at
 * market creation, avoiding a contract call per event. Initialization events can precede
 * that row, so callers must treat null as an expected no-op.
 */
export function resolveMarketFromAccountant(
  event: ethereum.Event
): DayMarketState | null {
  const map = DayAccountantMarketMap.load(
    generateAccountantMarketMapId(event.address.toHexString())
  );
  if (!map) return null;
  return DayMarketState.load(map.marketRefId);
}

/**
 * Stamp updatedAt* off the event and save.
 *
 * createdAt* is NEVER touched here — it belongs to the factory's creation write
 * and re-stamping it builds fine, indexes fine, and quietly destroys every cohort
 * query in Neon (§8).
 */
export function touchMarket(event: ethereum.Event, market: DayMarketState): void {
  market.updatedAtTransactionHash = event.transaction.hash.toHexString();
  market.updatedAtBlockNumber = event.block.number;
  market.updatedAtBlockTimestamp = event.block.timestamp;
  market.save();
}
