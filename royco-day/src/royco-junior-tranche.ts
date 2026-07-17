import {
  Transfer as TransferEvent,
  Deposit as DepositEvent,
  Redeem as RedeemEvent,
  ProtocolFeeSharesMinted as ProtocolFeeSharesMintedEvent,
} from "../generated/templates/RoycoJuniorTranche/RoycoJuniorTranche";
import {
  RedeemClaims,
  processDeposit,
  processRedeem,
  processTransfer,
} from "./handlers/tranche";
import { recordFeeSharesMinted } from "./handlers/fees/update-fee";

/**
 * Junior tranche entry file. Same four events as Senior minus
 * LiquidityPremiumSharesMinted.
 *
 * The decode below is deliberately NOT a bare re-export from
 * src/handlers/tranche/ — it must happen against THIS tranche's own generated
 * class, or an ABI drift would read Senior's positional slots for Junior's
 * payload, silently and forever. See the full note in src/royco-senior-tranche.ts.
 *
 * TODO — handleProtocolFeeSharesMinted -> DayFeeState(+Historical) ONLY. The mint
 * emits its own Transfer first, so processTransfer has already accounted for the
 * shares; bumping them here double-counts.
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
