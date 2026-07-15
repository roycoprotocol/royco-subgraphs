// prettier-ignore
// =============================================================================
// GENERATED FILE — DO NOT EDIT.
//
// Rendered to src/constants/static.ts by:
//   npm run prepare:markets:<network>
// from config/markets/networks/<network>.json + this template.
//
// It is gitignored, because its contents depend entirely on which network was
// prepared last. Edit this template (or the networks/*.json values) instead.
// =============================================================================
import { BigInt } from "@graphprotocol/graph-ts";

export const CHAIN_ID = BigInt.fromU64({{chainId}});

// DayVaultState.majorType — identifies rows from this package in the shared
// Neon tables.
export const VAULT_MAJOR_TYPE = "day";
