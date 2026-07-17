import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { DayVaultState } from "../../../generated/schema";
import {
  CATEGORY_SHARES,
  SUB_CATEGORY_BURN,
  SUB_CATEGORY_MINT,
  SUB_CATEGORY_TRANSFER,
  SUB_CATEGORY_TRANSFER_IN,
  SUB_CATEGORY_TRANSFER_OUT,
  TOKEN_INDEX_SINGLE,
  ZERO_ADDRESS,
} from "../../constants";
import { generateVaultId } from "../../utils";
import { processGlobalTokenTransfer } from "../base/process-transfer";
import { addTransferActivity } from "../activities/transfer";
import { applySharesDelta } from "../base/update-vault";
import { updatePosition } from "../base/update-position";

/**
 * Share movement on any tranche. Owns ALL share/position/supply accounting for
 * that tranche — see the ownership invariant in ../base/process-transfer.ts.
 *
 * Typed to `ethereum.Event` + primitives, not to a generated event class: each
 * entry file decodes with ITS OWN class and passes the values in, so `asc` fails
 * in the drifting tranche's own file if a member is renamed. See the note in
 * src/royco-senior-tranche.ts for why a bare re-export would be silently unsafe.
 *
 * ORDER IS LOAD-BEARING throughout.
 */
export function processTransfer(
  event: ethereum.Event,
  from: Address,
  to: Address,
  value: BigInt
): void {
  const vaultAddress = event.address.toHexString();
  const vault = DayVaultState.load(generateVaultId(vaultAddress));

  // The factory is the SOLE legitimate creator of a DayVaultState — it spawns the
  // templates in the same handler that writes all three vaults, so this is
  // unreachable in practice. Do NOT lazy-create here the way royco-rwa's
  // vault.ts does: a DayVaultState needs marketRefId/marketId/minorType, and
  // minorType is authoritative ONLY from which slot of the DeploymentResult tuple
  // the address arrived in — never from TRANCHE_TYPE(). A fabricated row would
  // carry a guessed minorType and a permanently wrong marketId.
  if (!vault) return;

  // ERC20 permits a zero-value transfer. The global rows below would be honest,
  // but a position/vault write for a no-op burns a write-once entryIndex on a
  // snapshot identical to its predecessor. Nothing downstream can tell them apart.
  if (value.isZero()) return;

  const fromAddress = from.toHexString();
  const toAddress = to.toHexString();

  // Self-transfer (from == to): DROPPED ENTIRELY. No GlobalTokenTransfer, no
  // GlobalTokenActivity, no position or vault write — a self-transfer moves no
  // balance, and these tables record MEANINGFUL MOVEMENTS, not a raw mirror of
  // every log. Nothing on-chain rejects it (the only _update hook screens
  // blacklists and never compares the two sides), so it does occur. This also
  // matches royco-rwa's vault.ts, which returns at the top for the same reason, so
  // the shared Neon tables stay behaviourally consistent across packages.
  //
  // The guard is load-bearing, not hygiene. Let a self-transfer through and the
  // two updatePosition calls below would snapshot `shares - value` — a balance
  // this account never held — then restore it: a phantom dip in
  // day_position_state_historical, which is read as a time series. It would NOT
  // crash (updatePosition saves before returning, so the second call reads the
  // advanced cursor); it would just quietly lie.
  //
  // from == to implies both are non-zero — OZ reverts on a zero from/to in
  // _transfer — so a self-transfer is always a plain TRANSFER, never a mint/burn.
  if (fromAddress == toAddress) return;

  // Compare against the ZERO_ADDRESS constant (lowercase hex, as .toHexString()
  // produces) — never Address.zero().
  let subCategory = SUB_CATEGORY_TRANSFER;
  if (fromAddress == ZERO_ADDRESS) {
    subCategory = SUB_CATEGORY_MINT;
  } else if (toAddress == ZERO_ADDRESS) {
    subCategory = SUB_CATEGORY_BURN;
  }

  // The tranche IS its own share token, so token* == the vault.
  const transfer = processGlobalTokenTransfer(
    vault.id,
    vaultAddress,
    CATEGORY_SHARES,
    subCategory,
    vault.shareTokenId,
    vault.shareTokenAddress,
    fromAddress,
    toAddress,
    value,
    TOKEN_INDEX_SINGLE,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash.toHexString(),
    event.logIndex,
    true
  );

  // A mint/burn is one account-facing event; a plain transfer is two. The two
  // plain rows share a log index and cannot collide: subCategory IS part of the
  // activity id (and is NOT part of the transfer id). SUB_CATEGORY_TRANSFER
  // itself appears only on the transfer row, never on an activity row.
  if (subCategory == SUB_CATEGORY_MINT || subCategory == SUB_CATEGORY_BURN) {
    addTransferActivity(transfer, subCategory, TOKEN_INDEX_SINGLE);
  } else {
    addTransferActivity(transfer, SUB_CATEGORY_TRANSFER_OUT, TOKEN_INDEX_SINGLE);
    addTransferActivity(transfer, SUB_CATEGORY_TRANSFER_IN, TOKEN_INDEX_SINGLE);
  }

  // Supply moves only on mint/burn. A plain transfer must NOT touch the vault:
  // the supply is unchanged, so a snapshot would duplicate the previous row and
  // burn an entryIndex forever. Vault first, so the positions below derive from
  // a fresh one.
  if (subCategory == SUB_CATEGORY_MINT) {
    applySharesDelta(event, vault, value);
  } else if (subCategory == SUB_CATEGORY_BURN) {
    applySharesDelta(event, vault, value.neg());
  }

  // Strictly sequential — see updatePosition. updatePosition itself skips 0x0,
  // so mint/burn correctly touch one side only.
  updatePosition(event, vault, fromAddress, value.neg());
  updatePosition(event, vault, toAddress, value);
}
