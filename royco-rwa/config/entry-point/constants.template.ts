// prettier-ignore
import { BigInt } from "@graphprotocol/graph-ts";

export const CHAIN_ID = BigInt.fromU64({{chainId}});

export function getEntryPointVersion(address: string): BigInt {
  let normalized = address.toLowerCase();
  {{#entryPoints}}
  if (normalized == "{{address}}".toLowerCase()) return BigInt.fromU64({{version}});
  {{/entryPoints}}
  return BigInt.zero();
}
