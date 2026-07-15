import { ethereum } from "@graphprotocol/graph-ts";
import { newTypedMockEventWithParams } from "matchstick-as";
import { TrancheAccountingSynced } from "../../generated/templates/RoycoDayAccountant/RoycoDayAccountant";
import { EventContext, applyCtx } from "../helpers/event";
import { TrancheState } from "./shared";

/**
 * TrancheAccountingSynced((uint8,uint256 x12,uint32,uint256,bool,uint256,uint256))
 *
 * One param: the full 18-field TrancheState. Prefer this event over calling
 * previewSyncTrancheAccounting — it's free and it is the post-state at exactly
 * this log index.
 */
export function createTrancheAccountingSyncedEvent(
  resultingState: TrancheState,
  c: EventContext
): TrancheAccountingSynced {
  const params: ethereum.EventParam[] = [
    new ethereum.EventParam(
      "resultingState",
      ethereum.Value.fromTuple(resultingState.toTuple())
    ),
  ];
  const event = newTypedMockEventWithParams<TrancheAccountingSynced>(params);
  applyCtx(event, c);
  return event;
}
