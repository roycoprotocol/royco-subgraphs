import {
  Transfer as TransferEvent,
  Deposit as DepositEvent,
  Redeem as RedeemEvent,
  ProtocolFeeSharesMinted as ProtocolFeeSharesMintedEvent,
  MultiAssetDeposit as MultiAssetDepositEvent,
  MultiAssetRedeem as MultiAssetRedeemEvent,
} from "../generated/templates/RoycoLiquidityTranche/RoycoLiquidityTranche";
import {
  RedeemClaims,
  processDeposit,
  processRedeem,
  processTransfer,
} from "./handlers/tranche";
import { recordFeeSharesMinted } from "./handlers/fees/update-fee";
import {
  recordMultiAssetDeposit,
  recordMultiAssetRedeem,
} from "./handlers/activities/multi-asset";

/**
 * Liquidity tranche entry file. Adds the two multi-asset events on top of the
 * shared four.
 *
 * The decode below is deliberately NOT a bare re-export from
 * src/handlers/tranche/ — it must happen against THIS tranche's own generated
 * class. See the full note in src/royco-senior-tranche.ts.
 *
 * NO LT SPECIAL-CASING in the shared handlers, on purpose. convertToAssets zeroes
 * claims.stShares and substitutes ltRawNAV for claims.nav on the LT and only the
 * LT — that asymmetry is the CONTRACT's answer and is copied through verbatim,
 * exactly as the factory's creation path already does. A zero
 * claimsSeniorTrancheShares on an LT row is correct, not missing data. See §6.
 *
 * PREFER THESE EVENTS over calling the multi-asset previews
 * (previewDepositMultiAsset / previewRedeemMultiAsset, and the Kernel's
 * ltPreview* / previewAddLiquidity / previewRemoveLiquidity). Those ARE callable
 * — they're `nonpayable`, and graph codegen binds nonpayable functions, contrary
 * to a widely-repeated claim; only `payable` is excluded. But they are not pure
 * reads, so simulating them via eth_call is slower and semantically shakier than
 * reading the numbers the contract already emitted here. Use try_ if you must.
 * See CLAUDE.md §5.
 *
 * handleMultiAssetDeposit / handleMultiAssetRedeem (done below) write immutable
 * ACTIVITY rows (DayMultiAssetDeposit/RedeemActivity, id = <CHAIN>_<TX>_<LOG>) via
 * the shared record* functions — no cursor, no share/position/supply writes (the
 * mint/burn Transfer at a lower log index owns those). stClaims sits at index 4,
 * AFTER `shares` — unlike Redeem, where it is at index 2 — and is the kernel's
 * SENIOR claim, NOT the DayVaultState LT convertToAssets asymmetry above:
 * claimsSeniorTrancheShares AND claimsLiquidityTrancheAssets are both invariantly 0.
 */
export function handleTransfer(event: TransferEvent): void {
  processTransfer(event, event.params.from, event.params.to, event.params.value);
}

export function handleDeposit(event: DepositEvent): void {
  processDeposit(event, event.params.sender, event.params.assets);
}

export function handleRedeem(event: RedeemEvent): void {
  const claims = new RedeemClaims();
  claims.stAssets = event.params.claims.stAssets;
  claims.jtAssets = event.params.claims.jtAssets;
  claims.ltAssets = event.params.claims.ltAssets;
  claims.stShares = event.params.claims.stShares;
  claims.nav = event.params.claims.nav;

  processRedeem(event, event.params.receiver, claims);
}

export function handleProtocolFeeSharesMinted(
  event: ProtocolFeeSharesMintedEvent
): void {
  // Emitted even for a 0-share mint (the emit is unguarded); skip the no-op.
  if (event.params.mintedProtocolFeeShares.isZero()) return;

  recordFeeSharesMinted(
    event,
    event.params.protocolFeeRecipient.toHexString(),
    event.params.mintedProtocolFeeShares
  );
}

export function handleMultiAssetDeposit(event: MultiAssetDepositEvent): void {
  recordMultiAssetDeposit(
    event,
    event.params.caller,
    event.params.receiver,
    event.params.stAssets,
    event.params.quoteAssets,
    event.params.ltAssetsMinted,
    event.params.shares
  );
}

export function handleMultiAssetRedeem(event: MultiAssetRedeemEvent): void {
  // Copied member-by-member BY NAME against THIS template's own struct — stClaims
  // reads its five members positionally, so decoding here (not across the shared
  // boundary) keeps the §6 quintuple under the right slots. See handleRedeem.
  const claims = new RedeemClaims();
  claims.stAssets = event.params.stClaims.stAssets;
  claims.jtAssets = event.params.stClaims.jtAssets;
  claims.ltAssets = event.params.stClaims.ltAssets;
  claims.stShares = event.params.stClaims.stShares;
  claims.nav = event.params.stClaims.nav;

  recordMultiAssetRedeem(
    event,
    event.params.caller,
    event.params.receiver,
    event.params.owner,
    event.params.shares,
    claims,
    event.params.quoteAssets
  );
}
