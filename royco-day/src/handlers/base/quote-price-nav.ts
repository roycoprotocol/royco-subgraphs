import { Address, BigInt } from "@graphprotocol/graph-ts";
import { BalancerV3Vault } from "../../../generated/templates/RoycoDayKernel/BalancerV3Vault";
import { BalancerPoolToken } from "../../../generated/templates/RoycoDayKernel/BalancerPoolToken";
import { ZERO_ADDRESS } from "../../constants";

/**
 * The Balancer V3 pool facts needed to price the quote leg — resolved once, at market
 * creation, because both are immutable on chain.
 *
 * Mutable fields with defaults rather than a positional constructor: two same-typed
 * values would guarantee a transposition eventually (§3).
 */
export class QuotePoolBinding {
  vaultAddress: string = ZERO_ADDRESS;
  quoteAssetPoolIndex: i32 = 0;
}

/**
 * Resolve the BPT's vault and which of its two slots holds the QUOTE asset.
 *
 * THE LIQUIDITY TRANCHE'S DEPOSIT ASSET *IS* THE BPT, and that pool is a pair of
 * (senior tranche share token, quote asset). The venue enforces exactly that —
 * `POOL_MUST_HAVE_TWO_TOKENS`, then `INVALID_POOL_TOKEN_CONFIGURATION` unless
 * `tokens[0] == seniorTranche && tokens[1] == quoteAsset`
 * (BalancerV3LiquidityVenue.sol:97-100).
 *
 * THAT PIN IS NEWER AND STRICTER THAN WHAT THIS FUNCTION NEEDS. The 2026-08 contracts
 * deleted the venue's stored `stShareIsPoolToken1` flag, its `_poolTokenIndexes()`
 * derivation and the QUOTE_ASSET_MISMATCH error, so there is no longer any runtime
 * ordering to reproduce: on every deployable market the quote asset sits at index 1.
 * This function keeps searching for it anyway. That is deliberate — a positive match is
 * correct under either regime, costs nothing on a two-element list already in hand, and
 * means a future venue that relaxes the pin does not silently mis-price every market.
 *
 * In Balancer V3 the pool contract IS the BPT, so `lptAsset` is both the token the
 * liquidity tranche takes deposits in and the `pool` argument the vault expects. The
 * venue relies on exactly that identity (`_vault.isPoolRegistered(LPT_ASSET)`).
 *
 * The quote asset is located by MATCHING IT, not by elimination — see the note at the
 * loop for why the "whichever isn't the senior tranche" formulation is unsafe.
 *
 * EVERY CALL IS `try_`, and each guards a different failure (§5):
 *   - getVault() reverts on a kernel with NO Balancer venue at all, where LPT_ASSET is
 *     an ordinary ERC20 and not a pool.
 *   - getPoolTokens() reverts if the pool is not registered with that vault.
 * Either way the caller gets the zero-address binding and the quote price stays 0,
 * which is the truthful answer for a market that has no quote asset. A raw call here
 * would kill handleMarketDeploymentCompleted and with it the market, all three vaults
 * and every row that ever hangs off them.
 *
 * Returns index 0 with a zero vault when unresolvable — read the two together, never
 * the index alone (see the schema note on quoteAssetPoolIndex).
 */
export function resolveQuotePoolBinding(
  lptAsset: string,
  quoteAssetAddress: string
): QuotePoolBinding {
  const binding = new QuotePoolBinding();

  // NO QUOTE ASSET, NO POOL TO ASK. A venue-less kernel reports a zero quote address, so there is
  // nothing to resolve — and returning here spends ZERO eth_calls on that market
  // instead of two that could only fail or, worse, succeed against an unrelated pool.
  if (quoteAssetAddress == ZERO_ADDRESS) {
    return binding;
  }

  const pool = Address.fromString(lptAsset);
  const vaultResult = BalancerPoolToken.bind(pool).try_getVault();
  if (vaultResult.reverted) {
    return binding;
  }

  const tokensResult = BalancerV3Vault.bind(vaultResult.value).try_getPoolTokens(pool);
  if (tokensResult.reverted) {
    return binding;
  }

  // The venue requires exactly two, but this reads the array the chain actually
  // returned — a length assumption here would be an out-of-bounds trap in WASM, which
  // aborts the handler rather than returning an error.
  const tokens = tokensResult.value;
  if (tokens.length != 2) {
    return binding;
  }

  // MATCH THE QUOTE ASSET ITSELF, positively. The venue sets
  // `QUOTE_ASSET = address(tokens[QUOTE_ASSET_POOL_INDEX])`, so the token the kernel
  // calls QUOTE_ASSET *is* one of these two slots by construction — locating it is the
  // same derivation the contract performed, not a re-inference of it.
  //
  // !! DO NOT REWRITE THIS AS "the slot that is not the senior tranche". That inversion
  //    looks equivalent and is not: it yields an index for ANY two-token pool, including
  //    one containing neither the senior share nor this market's quote asset. The venue
  //    guards that case with an explicit `else revert INVALID_POOL_TOKEN_CONFIGURATION()`
  //    (BalancerV3LiquidityVenue.sol:113-115); a negative search silently drops that arm
  //    and caches an index pointing at an unrelated token, which then prices that token
  //    as this market's quote asset on every sync, forever, with no error anywhere.
  //
  //    Matching positively also makes the guarantee the one that actually matters: the
  //    rate this index selects is the rate of the token stored in
  //    DayMarketState.quoteAssetTokenAddress. The two columns cannot disagree.
  let quoteIndex = -1;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].toHexString() == quoteAssetAddress) {
      quoteIndex = i;
      break;
    }
  }
  // The pool does not contain this market's quote asset, so nothing here can price it.
  // Unreachable for a market the Balancer venue deployed — its constructor read
  // QUOTE_ASSET out of these very slots — but reachable for any other kernel whose
  // LPT_ASSET happens to be a registered pool. Refuse to guess: a zero binding leaves
  // quoteAssetPriceNAV at 0, which is honest, where a guess is silently wrong.
  if (quoteIndex < 0) {
    return binding;
  }

  binding.vaultAddress = vaultResult.value.toHexString();
  binding.quoteAssetPoolIndex = quoteIndex;
  return binding;
}

/**
 * The NAV value of one whole QUOTE token.
 *
 * IT IS EXACTLY THE POOL'S REGISTERED TOKEN RATE, and that is an identity, not an
 * approximation. Balancer's own scaling is
 *   scaled18 = rawAmount * decimalScalingFactors[i] * tokenRates[i] / WAD
 * and `decimalScalingFactors[i]` is a RAW `10 ** (18 - decimals)` factor rather than a
 * fixed-point number — PoolConfigLib.sol:255-257 states that explicitly. So for one
 * whole token:
 *   10^d * 10^(18-d) * rate / 1e18  ==  rate
 * The two powers of ten cancel, nothing is truncated, and the decimals never enter. That
 * is why this function needs no decimals argument while assetPriceNAV does.
 *
 * WHY THE RATE IS THE NAV PRICE: a Day market's NAV numeraire is defined by how the BPT
 * oracle is wired. Its price feeds are constant 1.0 on both legs, so no pricing enters
 * through Chainlink — all of it enters through the pool's rate providers. The senior
 * leg's provider is the kernel itself (NAV per ST share); the quote leg's is its
 * configured rate provider, or an implicit FP(1) when the token is registered STANDARD.
 * Each leg's scaled18 balance is therefore already denominated in NAV units, which is
 * what lets the venue wrap computeTVL() straight into NAV_UNIT. The quote leg's NAV
 * price is definitionally its pool token rate.
 *
 * `fallback` is the caller's choice for the same reason as assetPriceNAV (§5): zero at
 * creation, where there is no previous value; the previous value mid-life, because the
 * schema says never write zero over a good price.
 *
 * A zero `vaultAddress` means the market has no Balancer venue. That is not an error and
 * makes no call — there is no pool to ask and no quote asset to price.
 */
export function quoteAssetPriceNAV(
  vaultAddress: string,
  lptAsset: string,
  quoteAssetPoolIndex: i32,
  fallback: BigInt
): BigInt {
  if (vaultAddress == ZERO_ADDRESS) {
    return fallback;
  }

  const vault = BalancerV3Vault.bind(Address.fromString(vaultAddress));
  const rates = vault.try_getPoolTokenRates(Address.fromString(lptAsset));
  if (rates.reverted) {
    return fallback;
  }

  // value1 is `tokenRates`; value0 is `decimalScalingFactors`, which cancels out (see
  // above) and is deliberately unused.
  const tokenRates = rates.value.value1;
  // The pool could return fewer slots than the cached index if it were ever
  // re-registered differently. Out-of-bounds is a WASM trap that kills the handler, so
  // the guard is what keeps a stale index from stalling the subgraph.
  if (quoteAssetPoolIndex < 0 || quoteAssetPoolIndex >= tokenRates.length) {
    return fallback;
  }
  return tokenRates[quoteAssetPoolIndex];
}
