// prettier-ignore
import { BigInt } from "@graphprotocol/graph-ts";

export const CHAIN_ID = BigInt.fromU64(42161);

export function getEntryPointVersion(address: string): BigInt {
  let normalized = address.toLowerCase();
  if (normalized == "0xe72b67389e6c8919961b4eb2b9563b9359ba30b6".toLowerCase()) return BigInt.fromU64(1);
  if (normalized == "0x63da1229be88fb4d20210147954a1a3e05f2581b".toLowerCase()) return BigInt.fromU64(2);
  return BigInt.zero();
}
