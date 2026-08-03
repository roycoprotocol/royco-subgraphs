import { ethereum } from "@graphprotocol/graph-ts";
import {
  DayAccountantMarketMap,
  DayMarketState,
} from "../../../generated/schema";
import { generateAccountantMarketMapId } from "../../utils";

/**
 * Resolve the DayMarketState an Accountant event belongs to.
 *
 * THE ACCOUNTANT ADDRESS IS NOT THE MARKET ID — the KERNEL address is (§6). So
 * every accountant handler has to make this hop; a kernel handler does not
 * (there, event.address IS the marketId).
 *
 * TWO STORE LOADS, ZERO ETH_CALLS. This used to read the kernel off the contract
 * (Accountant.getState().kernel, and KERNEL() before that), which cost one eth_call on
 * EVERY accountant event — forever, on the sync path as well as the config path, to
 * fetch a value that cannot change. The factory now writes a DayAccountantMarketMap row
 * at market creation and this reads it, which is both cheaper and strictly more correct:
 * a store read cannot revert, cannot be rate-limited, and cannot return a different
 * answer than the one recorded at deployment.
 *
 * THE PAIRING IS 1:1 AND IMMUTABLE, which is what makes the cached row safe. One
 * accountant per market, fixed at deployment: `$.kernel` has exactly ONE assignment in
 * the whole accountant, inside initialize() (RoycoDayAccountant.sol:120), and there is
 * no setter. The KernelUpdated(address) event that once muddied this is GONE as of the
 * 2026-08 contract revision, so nothing even suggests the pairing can move. The call
 * this replaces could never have returned anything the map row doesn't already say.
 *
 * RETURNS NULL, and callers MUST early-return on it. Not defensive padding, and it is
 * NOT weakened by dropping the call — a missing map row means exactly what an
 * unresolvable kernel meant: skip, never guess. The path is reachable. The Accountant's
 * initialize() emits MinCoverageUpdated and FixedTermDurationUpdated DURING
 * deployMarket, i.e. at a LOWER log index than the factory's MarketDeploymentCompleted
 * that creates this template and writes both the market and the map. So if graph-node
 * ever replays those earlier same-block logs into the freshly created template, they
 * arrive before either row exists. Returning null is what makes the handler correct
 * either way, without depending on graph-node's same-block dynamic-data-source
 * semantics.
 */
export function resolveMarketFromAccountant(
  event: ethereum.Event
): DayMarketState | null {
  const map = DayAccountantMarketMap.load(
    generateAccountantMarketMapId(event.address.toHexString())
  );
  if (!map) return null;
  // marketRefId is already the composite <CHAIN_ID>_<KERNEL> — DayMarketState.id
  // verbatim, written by the factory off market.id itself. Do not re-derive it here.
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
