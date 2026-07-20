// prettier-ignore
// GENERATED (gitignored) -> src/constants/static.ts by
// `npm run prepare:entrypoint:<network>`. Edit this template / the networks/*.json
// values, never static.ts.
import { BigInt } from "@graphprotocol/graph-ts";

export const CHAIN_ID = BigInt.fromU64({{chainId}});

// Maps an EntryPoint address to its deployment version; 0 = not one of ours
// (handlers skip it). Rendered from networks/<network>.json entryPoints[].
export function getEntryPointVersion(address: string): BigInt {
  let normalized = address.toLowerCase();
  {{#entryPoints}}
  if (normalized == "{{address}}".toLowerCase()) return BigInt.fromU64({{version}});
  {{/entryPoints}}
  return BigInt.zero();
}
