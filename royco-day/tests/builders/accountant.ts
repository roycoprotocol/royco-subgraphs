import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { newTypedMockEventWithParams } from "matchstick-as";
import { EventContext, applyCtx } from "../helpers/event";
import { uint, uintI32, addr } from "../helpers/tuple";

// =============================================================================
// Config-event builders. (The sync builders moved to ./kernel.ts in v2, when the
// sync events moved from the accountant onto the kernel.)
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
 * Four uints — YieldSharesAccrued(jtYieldShareWAD, twJTYieldShareAccruedWAD,
 * lptYieldShareWAD, twLPTYieldShareAccruedWAD).
 *
 * v2 merged v1's two separate accrual events into this one, so a single builder now
 * covers what used to need two calls at adjacent log indices.
 */
export function createFourUintEvent<T>(
  n1: string,
  v1: BigInt,
  n2: string,
  v2: BigInt,
  n3: string,
  v3: BigInt,
  n4: string,
  v4: BigInt,
  c: EventContext
): T {
  const params: ethereum.EventParam[] = [
    new ethereum.EventParam(n1, uint(v1)),
    new ethereum.EventParam(n2, uint(v2)),
    new ethereum.EventParam(n3, uint(v3)),
    new ethereum.EventParam(n4, uint(v4)),
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
