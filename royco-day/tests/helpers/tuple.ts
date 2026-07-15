import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";

/**
 * Build an ethereum.Tuple from a list of Values.
 *
 * `ethereum.Tuple` is declared as `class Tuple extends Array<Value> {}`
 * (graph-ts/chain/ethereum.ts:525) — no extra fields, identical layout — so
 * changetype is safe and free. There is no public constructor, which is why this
 * helper exists.
 */
export function tuple(values: ethereum.Value[]): ethereum.Tuple {
  return changetype<ethereum.Tuple>(values);
}

export function addr(a: Address): ethereum.Value {
  return ethereum.Value.fromAddress(a);
}

export function bytes(b: Bytes): ethereum.Value {
  return ethereum.Value.fromBytes(b);
}

export function bool(b: boolean): ethereum.Value {
  return ethereum.Value.fromBoolean(b);
}

export function str(s: string): ethereum.Value {
  return ethereum.Value.fromString(s);
}

/** uint32 .. uint256 — anything codegen reads back with `.toBigInt()`. */
export function uint(v: BigInt): ethereum.Value {
  return ethereum.Value.fromUnsignedBigInt(v);
}

/**
 * uint8 / uint16 / uint24 — the small unsigned ints codegen reads with
 * `.toI32()`.
 *
 * !! Use this, NOT ethereum.Value.fromI32(). !!
 *
 * Real ABI decoding always produces ValueKind.UINT for an unsigned type, and
 * codegen emits `ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(x))` when
 * passing a uint8 argument (graph-cli codegen/types/conversions.js). `fromI32()`
 * would produce ValueKind.INT instead.
 *
 * `.toI32()` tolerates both kinds, so a builder using fromI32() still *reads*
 * fine — but `createMockedFunction(...).withArgs([...])` matches on the encoded
 * representation, so a fromI32() argument silently fails to match its mock. The
 * symptom is "function not mocked", which sends you hunting in the wrong place.
 */
export function uintI32(v: i32): ethereum.Value {
  return ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(v));
}

/** Signed int8..int32. */
export function intI32(v: i32): ethereum.Value {
  return ethereum.Value.fromI32(v);
}
