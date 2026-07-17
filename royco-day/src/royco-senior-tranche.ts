import {
  Transfer as TransferEvent,
  Deposit as DepositEvent,
  Redeem as RedeemEvent,
  ProtocolFeeSharesMinted as ProtocolFeeSharesMintedEvent,
  LiquidityPremiumSharesMinted as LiquidityPremiumSharesMintedEvent,
} from "../generated/templates/RoycoSeniorTranche/RoycoSeniorTranche";
import {
  RedeemClaims,
  processDeposit,
  processRedeem,
  processTransfer,
} from "./handlers/tranche";
import { recordFeeSharesMinted } from "./handlers/fees/update-fee";
import { recordLiquidityPremiumSharesMinted } from "./handlers/records/liquidity-premium";

/**
 * Senior tranche entry file.
 *
 * ============================================================================
 * WHY THESE ARE ONE-LINE WRAPPERS AND NOT `export { handleTransfer } from ...`
 * ============================================================================
 * Transfer/Deposit/Redeem are implemented ONCE, in src/handlers/tranche/, and
 * all three tranches share them. But the decode MUST happen here, against THIS
 * tranche's own generated class, because codegen emits a distinct class per
 * template and each one reads the payload BY POSITION.
 *
 * A bare re-export (CLAUDE.md §10.5's literal wording, and royco-rwa's idiom at
 * royco-vault-tranche-v2.ts:28) would type the shared function against ONE
 * tranche's class and then hand it the other two tranches' events. It compiles.
 * It indexes. And if an ABI ever drifts, it reads Senior's positional slots for
 * Junior's payload — silently, forever. royco-rwa is not precedent: it has ONE
 * template `.create()`d at several addresses, so codegen emits one class and it
 * never had this problem.
 *
 * Decoding here means `asc` fails IN THE DRIFTING TRANCHE'S OWN FILE, naming the
 * member. That is the whole point, and it is why the extra line exists.
 *
 * `asc` still cannot see a width change (uint256 -> uint128 both become BigInt)
 * or a transposition of two same-typed members. The "shared event surfaces are
 * byte-identical" test in scripts/checks/abi.test.mjs covers those. Both layers
 * are needed; neither is sufficient.
 * ============================================================================
 *
 * These three own ALL share/position/supply accounting for this tranche — see
 * the ownership invariant in src/handlers/base/process-transfer.ts before
 * touching the fee handlers below.
 *
 * handleProtocolFeeSharesMinted (done below) writes DayFeeState(+Historical) ONLY,
 * via the shared recordFeeSharesMinted — the protocol fee is the SOLE fee. The
 * mint emits its own Transfer first, so the shares are already accounted for; a
 * share bump here would double-count.
 *
 * handleLiquidityPremiumSharesMinted (done below) is NOT a fee handler. The
 * liquidity premium is minted into the market's own accounting, not taken from a
 * holder, so it does NOT touch DayFeeState. It writes the record entity
 * DayLiquidityPremiumSharesMintedHistory and advances that stream's DayMarketState
 * cursor, via the shared recordLiquidityPremiumSharesMinted. Senior-only: only the
 * senior tranche emits this event.
 */
export function handleTransfer(event: TransferEvent): void {
  processTransfer(event, event.params.from, event.params.to, event.params.value);
}

export function handleDeposit(event: DepositEvent): void {
  processDeposit(event, event.params.sender, event.params.assets);
}

export function handleRedeem(event: RedeemEvent): void {
  // Copied member-by-member BY NAME. `event.params.claims` is this template's own
  // RedeemClaimsStruct, which reads its five members positionally — passing it
  // across the shared boundary would put the one payload that matters most (§6's
  // quintuple) back under another tranche's slots.
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
  // The contract emits this even when 0 shares were minted (the _mint is guarded,
  // the emit is not). A zero-fee event is not a fee — skip it rather than burn an
  // entryIndex on a no-op snapshot.
  if (event.params.mintedProtocolFeeShares.isZero()) return;

  recordFeeSharesMinted(
    event,
    event.params.protocolFeeRecipient.toHexString(),
    event.params.mintedProtocolFeeShares
  );
}

export function handleLiquidityPremiumSharesMinted(
  event: LiquidityPremiumSharesMintedEvent
): void {
  // The contract emits this even when 0 shares were minted (the _mint is guarded,
  // the emit is not — RoycoSeniorTranche.sol:41,44). A zero mint is not a premium
  // event — skip it rather than burn an entryIndex on a no-op record.
  if (event.params.mintedLiquidityPremiumShares.isZero()) return;

  recordLiquidityPremiumSharesMinted(
    event,
    event.params.holder,
    event.params.mintedLiquidityPremiumShares,
    event.params.totalTrancheShares
  );
}
