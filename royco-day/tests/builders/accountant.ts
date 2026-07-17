import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { newTypedMockEventWithParams } from "matchstick-as";
import { TrancheAccountingSynced } from "../../generated/templates/RoycoDayAccountant/RoycoDayAccountant";
import { EventContext, applyCtx } from "../helpers/event";
import { TrancheState } from "./shared";
import { uint, uintI32, addr } from "../helpers/tuple";

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


// =============================================================================
// Config-event builders.
//
// The Accountant's fifteen config events reduce to five SHAPES, and shape is
// what a builder has to get right: codegen decodes POSITIONALLY
// (`parameters[0].value.toBigInt()`), so the EventParam name is cosmetic — it
// exists here only so a failure message reads sensibly.
//
// The <T> generic monomorphizes per call site, so each event is still built
// against its own generated class, the same discipline the tranche builders and
// the entry files use.
//
// changetype is needed on `event` because the compiler cannot prove an unbounded
// T extends ethereum.Event.
// =============================================================================

/** uint32 / uint64 / uint256 — anything codegen reads back with `.toBigInt()`. */
export function createUintEvent<T>(
  paramName: string,
  value: BigInt,
  c: EventContext
): T {
  const params: ethereum.EventParam[] = [
    new ethereum.EventParam(paramName, uint(value)),
  ];
  const event = newTypedMockEventWithParams<T>(params);
  applyCtx(changetype<ethereum.Event>(event), c);
  return event;
}

/**
 * uint8 / uint16 / uint24 — the small unsigned ints codegen reads with `.toI32()`.
 *
 * Built with uintI32 (fromUnsignedBigInt), NOT fromI32: real ABI decoding always
 * produces ValueKind.UINT for an unsigned type. See tests/helpers/tuple.ts.
 * FixedTermDurationUpdated(uint24) is the only user of this in the Accountant.
 */
export function createUint24Event<T>(
  paramName: string,
  value: i32,
  c: EventContext
): T {
  const params: ethereum.EventParam[] = [
    new ethereum.EventParam(paramName, uintI32(value)),
  ];
  const event = newTypedMockEventWithParams<T>(params);
  applyCtx(changetype<ethereum.Event>(event), c);
  return event;
}

/** A single address param — the two YDM events, and the kernel's fee recipient. */
export function createAddressEvent<T>(
  paramName: string,
  value: Address,
  c: EventContext
): T {
  const params: ethereum.EventParam[] = [
    new ethereum.EventParam(paramName, addr(value)),
  ];
  const event = newTypedMockEventWithParams<T>(params);
  applyCtx(changetype<ethereum.Event>(event), c);
  return event;
}

/** Two uints — MaxYieldSharesUpdated(uint64 maxJT, uint64 maxLT). */
export function createTwoUintEvent<T>(
  firstName: string,
  first: BigInt,
  secondName: string,
  second: BigInt,
  c: EventContext
): T {
  const params: ethereum.EventParam[] = [
    new ethereum.EventParam(firstName, uint(first)),
    new ethereum.EventParam(secondName, uint(second)),
  ];
  const event = newTypedMockEventWithParams<T>(params);
  applyCtx(changetype<ethereum.Event>(event), c);
  return event;
}

/**
 * No params at all — FixedTermEnded().
 *
 * The empty payload is the whole reason DayFixedTermHistory needs a cursor: the
 * event names no term, so the only way to know which one ended is the open row at
 * (countFixedTermEntries - 1).
 */
export function createEmptyEvent<T>(c: EventContext): T {
  const params: ethereum.EventParam[] = [];
  const event = newTypedMockEventWithParams<T>(params);
  applyCtx(changetype<ethereum.Event>(event), c);
  return event;
}

/** (uint256,uint256,bytes) — LiquidityPremiumReinvestmentFailed. */
export function createTwoUintBytesEvent<T>(
  firstName: string,
  first: BigInt,
  secondName: string,
  second: BigInt,
  thirdName: string,
  third: Bytes,
  c: EventContext
): T {
  const params: ethereum.EventParam[] = [
    new ethereum.EventParam(firstName, uint(first)),
    new ethereum.EventParam(secondName, uint(second)),
    new ethereum.EventParam(thirdName, ethereum.Value.fromBytes(third)),
  ];
  const event = newTypedMockEventWithParams<T>(params);
  applyCtx(changetype<ethereum.Event>(event), c);
  return event;
}
