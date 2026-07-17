import { ethereum } from "@graphprotocol/graph-ts";
import { DayMarketState } from "../../../generated/schema";
import { RoycoDayAccountant as RoycoDayAccountantContract } from "../../../generated/templates/RoycoDayAccountant/RoycoDayAccountant";
import { generateMarketId } from "../../utils";

/**
 * Resolve the DayMarketState an Accountant event belongs to.
 *
 * THE ACCOUNTANT ADDRESS IS NOT THE MARKET ID — the KERNEL address is (§6). So
 * every accountant handler has to make this hop; a kernel handler does not
 * (there, event.address IS the marketId).
 *
 * ACCOUNTANT.KERNEL() is a `view` returning an address fixed at initialize, and
 * §5 names KERNEL() explicitly among the immutable metadata reads where a raw
 * call is fine. It costs one eth_call per event, which is why this is used rather
 * than an AccountantMarketMap lookup entity (royco-rwa's approach): these are
 * governance/config events that fire rarely, and a map entity would be a schema
 * change plus a pipeline change plus a table, to save a call on a cold path. If a
 * high-frequency accountant handler ever needs this (TrancheAccountingSynced
 * would), revisit — that is the point where the map earns its keep.
 *
 * RETURNS NULL, and callers MUST early-return on it. Not defensive padding: the
 * Accountant's initialize() emits CoverageUpdated and FixedTermDurationUpdated
 * DURING deployMarket, i.e. at a LOWER log index than the factory's
 * MarketDeploymentCompleted that creates this template and writes the market. So
 * if graph-node ever replays those earlier same-block logs into the freshly
 * created template, they arrive before the market exists. Returning null is what
 * makes the handler correct either way, without depending on graph-node's
 * same-block dynamic-data-source semantics.
 */
export function resolveMarketFromAccountant(
  event: ethereum.Event
): DayMarketState | null {
  const accountant = RoycoDayAccountantContract.bind(event.address);
  const kernel = accountant.KERNEL().toHexString();
  return DayMarketState.load(generateMarketId(kernel));
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
