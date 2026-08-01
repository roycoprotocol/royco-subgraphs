import { DayVaultState } from "../../../generated/schema";
import {
  MARKET_TOKEN_ROLE_COLLATERAL_ASSET,
  MARKET_TOKEN_ROLE_LPT_ASSET,
  TRANCHE_TYPE_LIQUIDITY,
} from "../../constants";
import { generateMarketTokenId } from "../../utils";

/**
 * A vault's ASSET token id, in DayMarketState's market-scoped, role-tagged form:
 *   <CHAIN_ID>_<TOKEN_ADDRESS>_<MARKET_ID>_<ROLE>
 *
 * CALLED ONCE, by createVault, to set DayVaultState.assetTokenId. Everything downstream
 * — the deposit and redeem legs on the shared Global* tables — reads that column rather
 * than recomputing, so a vault's asset id and its transfer rows cannot drift apart. It
 * matches DayMarketState.collateralTokenId / liquidityTrancheAssetTokenId exactly, so
 * all three join on equality for the same token in the same role.
 *
 * !! SHARE TOKENS DO NOT USE THIS, and that is the deliberate, known cost of this
 *    design. A tranche's share token has no role among
 *    {collateralAsset, lptAsset, quoteAsset} — it IS the vault — so
 *    DayVaultState.shareTokenId stays chain-global, and so do the share rows that carry
 *    it. The consequence is that global_token_activity.token_id holds
 *    TWO SHAPES for royco-day rows: role-tagged on `category == "assets"`, chain-global
 *    on `category == "shares"`. Branch on `category` before parsing it, and never assume
 *    one shape across the column.
 *
 * !! IT ALSO DIVERGES FROM THE OTHER PACKAGES sharing public.global_token_activity.
 *    royco-rwa, royco-usd and staked-royco-usd all write the chain-global
 *    <CHAIN_ID>_<TOKEN_ADDRESS> (royco-rwa/src/utils/global.ts:30) into this same
 *    column. Rows cannot collide — ids are chain+tx+log scoped — but a consumer joining
 *    token_id to a chain-global token dimension will MISS royco-day's asset rows rather
 *    than error. Join on `token_address`, which is unchanged and present on every row in
 *    every package, or strip the trailing <MARKET_ID>_<ROLE> first.
 *
 * THE ROLE COMES FROM minorType, never from TRANCHE_TYPE() == 0/1/2 — the ABI carries
 * the enum's type but none of its member names, so that numbering is an inference (§6).
 * Senior and junior are coinvested in one collateral token and therefore share a role;
 * only the liquidity tranche has its own asset. The quote asset never appears here: it
 * has no vault, and the multi-asset flows record their quote leg on
 * DayMultiAssetDeposit/RedeemActivity rather than on the Global* tables.
 *
 * `vault.marketId` is the bare KERNEL ADDRESS, which is what generateMarketTokenId
 * wants — not the composite marketRefId.
 */
export function marketAssetTokenId(vault: DayVaultState): string {
  const role =
    vault.minorType == TRANCHE_TYPE_LIQUIDITY
      ? MARKET_TOKEN_ROLE_LPT_ASSET
      : MARKET_TOKEN_ROLE_COLLATERAL_ASSET;
  return generateMarketTokenId(vault.assetTokenAddress, vault.marketId, role);
}
