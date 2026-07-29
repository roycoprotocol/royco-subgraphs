import { BigInt } from "@graphprotocol/graph-ts";

/**
 * A tranche-agnostic copy of the ABI's `AssetClaims` quintuple.
 *
 * WHY THIS EXISTS: codegen emits a DISTINCT `RedeemClaimsStruct` per template,
 * each of which reads its five members by POSITION (`this[0].toBigInt()` ...).
 * Handing one of those structs to shared code would mean the shared code reads
 * the payload through whichever tranche's positional slots it happened to be
 * typed against — the exact silent transposition the shared-handler design
 * exists to avoid. Each entry file copies into this class BY NAME instead, so
 * `asc` fails in the drifting tranche's own file if a member is renamed.
 *
 * FOUR members in v2, not five: the senior and junior asset legs merged into one
 * `collateralAssets` when the two tranches became coinvested in a single token.
 *
 * Mutable fields with defaults, never a positional constructor: four same-typed
 * BigInts in a row guarantee a transposition eventually. Same rule as
 * tests/builders/shared.ts.
 */
export class RedeemClaims {
  collateralAssets: BigInt = BigInt.zero();
  lptAssets: BigInt = BigInt.zero();
  stShares: BigInt = BigInt.zero();
  nav: BigInt = BigInt.zero();
}
