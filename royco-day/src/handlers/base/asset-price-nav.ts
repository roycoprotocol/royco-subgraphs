import { Address, BigInt } from "@graphprotocol/graph-ts";
import { RoycoDayKernel as RoycoDayKernelContract } from "../../../generated/templates/RoycoDayKernel/RoycoDayKernel";
import { TRANCHE_TYPE_SENIOR, TRANCHE_TYPE_JUNIOR } from "../../constants";

/**
 * The NAV value of one whole asset token, for one tranche.
 *
 * There is no bare `convertTrancheUnitsToNAVUnits` on any contract — it lives
 * only on the Kernel, as three tranche-prefixed variants. AssemblyScript has no
 * closures and these are three distinct generated methods, so the dispatch is an
 * explicit if/else rather than a lookup (§3).
 *
 * Dispatch on minorType, NOT on TRANCHE_TYPE() == 0/1/2 — the ABI carries the
 * enum type name but no member names, so that numbering is an inference (§6).
 *
 * `fallback` is what to keep when the call reverts, and the choice is the
 * caller's because the right answer differs (§5): at creation there is no
 * previous value, so the factory passes zero; mid-life the schema says keep the
 * previous value, so the transfer path passes vault.assetPriceNAV. NEVER write
 * zero over a good value.
 *
 * RoycoDayKernel is on every data source that reaches this — factory and all
 * three tranche templates — which is what makes the bind resolvable (§10.4).
 */
export function assetPriceNAV(
  kernelAddress: string,
  minorType: string,
  assetTokenDecimals: i32,
  fallback: BigInt
): BigInt {
  const kernel = RoycoDayKernelContract.bind(Address.fromString(kernelAddress));
  // .pow() takes a u8; decimals is an i32 (§3).
  const oneAssetToken = BigInt.fromI32(10).pow(u8(assetTokenDecimals));

  if (minorType == TRANCHE_TYPE_SENIOR) {
    const r = kernel.try_stConvertTrancheUnitsToNAVUnits(oneAssetToken);
    return r.reverted ? fallback : r.value;
  }
  if (minorType == TRANCHE_TYPE_JUNIOR) {
    const r = kernel.try_jtConvertTrancheUnitsToNAVUnits(oneAssetToken);
    return r.reverted ? fallback : r.value;
  }
  const r = kernel.try_ltConvertTrancheUnitsToNAVUnits(oneAssetToken);
  return r.reverted ? fallback : r.value;
}
