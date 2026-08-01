import { ethereum } from "@graphprotocol/graph-ts";
import { newTypedMockEventWithParams } from "matchstick-as";
import {
  PreOpTrancheAccountingSynced,
  PostOpTrancheAccountingSynced,
} from "../../generated/templates/RoycoDayKernel/RoycoDayKernel";
import { EventContext, applyCtx } from "../helpers/event";
import { TrancheState } from "./shared";
import { uintI32 } from "../helpers/tuple";

// =============================================================================
// The kernel's two accounting-sync events.
//
// v2 replaced the accountant's single TrancheAccountingSynced with this pair, moved
// onto the KERNEL — so event.address is the marketId and the handlers need no
// Accountant.getState().kernel hop. Both carry the same 16-field SyncedAccountingState; only
// the post-op adds the `op` enum in FRONT of it.
//
// Two builders rather than one generic: the two events declare DISTINCT generated
// classes whose structs are read positionally, so each is built against its own.
// =============================================================================

/** PreOpTrancheAccountingSynced(SyncedAccountingState resultingState) */
export function createPreOpSyncEvent(
  resultingState: TrancheState,
  c: EventContext
): PreOpTrancheAccountingSynced {
  const params: ethereum.EventParam[] = [
    new ethereum.EventParam(
      "resultingState",
      ethereum.Value.fromTuple(resultingState.toTuple())
    ),
  ];
  const event = newTypedMockEventWithParams<PreOpTrancheAccountingSynced>(params);
  applyCtx(event, c);
  return event;
}

/**
 * PostOpTrancheAccountingSynced(Operation op, SyncedAccountingState resultingState)
 *
 * `op` is a uint8 enum and MUST be encoded with uintI32 (fromUnsignedBigInt), not
 * fromI32 — real ABI decoding always yields ValueKind.UINT for an unsigned type. See
 * tests/helpers/tuple.ts.
 */
export function createPostOpSyncEvent(
  op: i32,
  resultingState: TrancheState,
  c: EventContext
): PostOpTrancheAccountingSynced {
  const params: ethereum.EventParam[] = [
    new ethereum.EventParam("op", uintI32(op)),
    new ethereum.EventParam(
      "resultingState",
      ethereum.Value.fromTuple(resultingState.toTuple())
    ),
  ];
  const event = newTypedMockEventWithParams<PostOpTrancheAccountingSynced>(params);
  applyCtx(event, c);
  return event;
}
