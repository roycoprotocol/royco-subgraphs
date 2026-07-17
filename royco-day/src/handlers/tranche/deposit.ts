import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { DayVaultState } from "../../../generated/schema";
import {
  CATEGORY_ASSETS,
  SUB_CATEGORY_DEPOSIT,
  TOKEN_INDEX_SINGLE,
} from "../../constants";
import { generateVaultId } from "../../utils";
import { processGlobalTokenTransfer } from "../base/process-transfer";
import { addTransferActivity } from "../activities/transfer";

/**
 * The ASSET leg of a deposit. Two rows, zero contract calls.
 *
 * NO DayPositionState. NO sharesTotalSupply. Both would DOUBLE-COUNT:
 * deposit() calls _mint(receiver, shares) and only THEN emits Deposit. _mint
 * routes through ERC20._update, which emits Transfer(0x0 -> receiver). Two emits
 * are two LOG opcodes at two receipt positions, so the Transfer strictly precedes
 * the Deposit and cannot share its logIndex. graph-node dispatches in log order,
 * so by the time this runs, processTransfer's mint branch has already written the
 * shares, the historical row and the supply bump.
 *
 * Do not "optimise" by merging the two handlers on tx hash either — with
 * <CHAIN>_<TX>_<LOG>_<TOKEN_INDEX> ids the shares row and the assets row provably
 * never collide.
 */
export function processDeposit(
  event: ethereum.Event,
  sender: Address,
  assets: BigInt
): void {
  const vaultAddress = event.address.toHexString();
  const vault = DayVaultState.load(generateVaultId(vaultAddress));
  if (!vault) return;

  const transfer = processGlobalTokenTransfer(
    vault.id,
    vaultAddress,
    CATEGORY_ASSETS,
    SUB_CATEGORY_DEPOSIT,
    // An entity read, not an eth_call: the loaded vault already carries these.
    // royco-rwa binds the vault and calls asset() here, once per deposit forever.
    vault.assetTokenId,
    vault.assetTokenAddress,
    sender.toHexString(),
    // THE VAULT deposited into — matching royco-rwa, which sets toAddress to its
    // own vault on every deposit. This is the FROZEN shared table
    // (global_token_transfer, a union across royco-rwa / royco-usd /
    // staked-royco-usd), so `to_address == vault_address` on a deposit row is a
    // cross-package convention, and a consumer querying "deposits received by
    // vault X" by toAddress would silently skip us if we broke it.
    //
    // This is vault-level attribution, NOT the literal on-chain recipient: the
    // assets actually go to the KERNEL — deposit() does
    // `IERC20(ASSET).safeTransferFrom(msg.sender, KERNEL, assets)`, never touching
    // the tranche. The kernel is not lost — it is derivable as the marketId of
    // this vault — it just is not this column.
    vaultAddress,
    assets,
    TOKEN_INDEX_SINGLE,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash.toHexString(),
    event.logIndex,
    true
  );

  // The stub TODO named only GlobalTokenTransfer. Implementing it literally would
  // leave every deposit invisible in the shared global_token_activity table.
  addTransferActivity(transfer, SUB_CATEGORY_DEPOSIT, TOKEN_INDEX_SINGLE);
}
