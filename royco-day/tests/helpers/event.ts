import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
  ADDR_SENIOR,
  BLOCK_NUMBER,
  BLOCK_TIMESTAMP,
  LOG_INDEX,
  TX_HASH,
} from "./constants";

/**
 * The block/tx/log context an event carries.
 *
 * Mutable fields, not a positional constructor: AssemblyScript has no object
 * literals and no spread, so `const c = ctx(); c.emitter = X;` is the only
 * ergonomic override idiom.
 */
export class EventContext {
  emitter: Address = ADDR_SENIOR;
  blockNumber: BigInt = BLOCK_NUMBER;
  blockTimestamp: BigInt = BLOCK_TIMESTAMP;
  txHash: Bytes = TX_HASH;
  logIndex: BigInt = LOG_INDEX;
}

/** A fresh default context. Override fields on the result as needed. */
export function ctx(): EventContext {
  return new EventContext();
}

/**
 * Stamp a context onto a mock event.
 *
 * This is not optional bookkeeping — it is load-bearing. matchstick's
 * newMockEvent() builds its transaction with a 20-BYTE ADDRESS as the tx hash
 * (defaults.ts: `new ethereum.Transaction(defaultAddressBytes, ...)`), so
 * without this every `createdAtTransactionHash` and every historical entity id
 * in a test would be built from a hash no real chain could emit.
 *
 * Typed as `ethereum.Event` rather than generic: every generated event class
 * extends it, so subclasses pass implicitly with no changetype at the call site.
 */
export function applyCtx(event: ethereum.Event, c: EventContext): void {
  event.address = c.emitter;
  event.logIndex = c.logIndex;
  event.block.number = c.blockNumber;
  event.block.timestamp = c.blockTimestamp;
  event.transaction.hash = c.txHash;
}
