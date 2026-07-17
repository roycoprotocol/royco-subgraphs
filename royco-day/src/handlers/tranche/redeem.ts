import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { DayMarketState, DayVaultState } from "../../../generated/schema";
import {
  CATEGORY_ASSETS,
  REDEEM_TOKEN_INDEX_JUNIOR_TRANCHE_ASSETS,
  REDEEM_TOKEN_INDEX_LIQUIDITY_TRANCHE_ASSETS,
  REDEEM_TOKEN_INDEX_SENIOR_TRANCHE_ASSETS,
  SUB_CATEGORY_WITHDRAW,
} from "../../constants";
import { generateVaultId } from "../../utils";
import { processGlobalTokenTransfer } from "../base/process-transfer";
import { addTransferActivity } from "../activities/transfer";
import { RedeemClaims } from "./claims";

/**
 * The ASSET legs of a redeem. Up to three of them, one per non-zero claim.
 *
 * NO DayPositionState, NO DayVaultState — and it could not do them correctly
 * anyway. redeem() calls the kernel (which performs the asset transfers), THEN
 * _burn(owner, shares), THEN emits Redeem. So the burn Transfer has the lower log
 * index and processTransfer has already done the position and supply accounting.
 * More decisively: Redeem carries `sender` and `receiver` but NOT `owner`, so on
 * a third-party redeem (redeem() spends an allowance when msg.sender != owner)
 * this event cannot even identify whose shares were burned. The burn Transfer is
 * the only source of that. This is a reason, not a coincidence.
 *
 * `claims.nav` is DROPPED. Every claims quintuple in the schema is a CURRENT
 * pro-rata claim (convertToAssets of a share balance), never a redeemed delta,
 * and nav is a NAV_UNIT accounting figure rather than a token balance, so it fits
 * in neither a transfer nor an activity row. Deliberate, and the only field the
 * event carries that this subgraph does not keep.
 *
 * `claims.stShares` gets NO ROW either: _withdrawAssets does
 * `IERC20(seniorTranche).safeTransfer(receiver, stShares)`, and the senior tranche
 * IS an indexed template — that leg already emits its own Transfer at its own log
 * index, which processTransfer records along with both positions. A row here
 * would double-count. The ST/JT/LT ASSET erc20s are NOT data sources, so this
 * event is their only witness; that asymmetry is the whole reason this handler
 * exists.
 */
export function processRedeem(
  event: ethereum.Event,
  receiver: Address,
  claims: RedeemClaims
): void {
  const vaultAddress = event.address.toHexString();
  const vault = DayVaultState.load(generateVaultId(vaultAddress));
  if (!vault) return;

  const market = DayMarketState.load(vault.marketRefId);
  if (!market) return;

  // Each leg pays out a DIFFERENT tranche's asset token, so each token comes from
  // that tranche's own vault row. Four entity loads, zero eth_calls.
  const senior = DayVaultState.load(market.seniorTrancheId);
  const junior = DayVaultState.load(market.juniorTrancheId);
  const liquidity = DayVaultState.load(market.liquidityTrancheId);
  if (!senior || !junior || !liquidity) return;

  // Unrolled, not a loop over a lookup table: AS has no closures (§3).
  emitLeg(
    event,
    vault,
    receiver,
    senior,
    claims.stAssets,
    REDEEM_TOKEN_INDEX_SENIOR_TRANCHE_ASSETS
  );
  emitLeg(
    event,
    vault,
    receiver,
    junior,
    claims.jtAssets,
    REDEEM_TOKEN_INDEX_JUNIOR_TRANCHE_ASSETS
  );
  emitLeg(
    event,
    vault,
    receiver,
    liquidity,
    claims.ltAssets,
    REDEEM_TOKEN_INDEX_LIQUIDITY_TRANCHE_ASSETS
  );
}

/**
 * One asset leg: a GlobalTokenTransfer plus its GlobalTokenActivity.
 *
 * `tokenIndex` is POSITIONAL — it says WHICH claim this is, and it is what makes
 * the three legs' ids distinct on one log. Never derive it from a running counter
 * over the non-zero legs: the leg would then be unrecoverable from Neon, because
 * tokenAddress is the only other clue and the shipped identical-ST/JT kernel gives
 * the senior and junior legs the SAME asset token.
 *
 * For that same reason, never merge two legs that share a token. They are
 * distinct claims; the rows describe claims, which is what Redeem describes.
 */
function emitLeg(
  event: ethereum.Event,
  vault: DayVaultState,
  receiver: Address,
  legVault: DayVaultState,
  value: BigInt,
  tokenIndex: i32
): void {
  // _withdrawAssets skips zero legs on-chain, so a zero-value row would assert a
  // movement that never happened.
  if (!value.gt(BigInt.zero())) return;

  const transfer = processGlobalTokenTransfer(
    vault.id,
    // The REDEEMING tranche — the row belongs to the vault whose event this is,
    // not to the sibling whose asset token is moving.
    vault.vaultAddress,
    CATEGORY_ASSETS,
    SUB_CATEGORY_WITHDRAW,
    legVault.assetTokenId,
    legVault.assetTokenAddress,
    // The REDEEMING vault, mirroring royco-rwa's handleWithdraw (fromAddress =
    // vault, toAddress = receiver) on the frozen shared global_token_transfer
    // table, and matching the deposit leg's toAddress = vault. Vault-level
    // attribution, NOT the literal source: the kernel actually custodies the
    // assets and executes the safeTransfer to the receiver. Using the kernel here
    // would make royco-day the only package whose withdraw rows break
    // `from_address == vault_address`, and would contradict our own deposit rows.
    vault.vaultAddress,
    receiver.toHexString(),
    value,
    tokenIndex,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash.toHexString(),
    event.logIndex,
    true
  );

  // WITHDRAW maps accountAddress -> toAddress, i.e. the receiver: the party
  // actually credited. That matters — redeem() spends an allowance when
  // msg.sender != owner, so sender and receiver genuinely differ.
  addTransferActivity(transfer, SUB_CATEGORY_WITHDRAW, tokenIndex);
}
