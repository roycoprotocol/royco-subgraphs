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
 * (senior tranche share token, quote asset). The venue constructor enforces exactly
 * that — `POOL_MUST_HAVE_TWO_TOKENS`, then `INVALID_POOL_TOKEN_CONFIGURATION` unless one
 * of the two is SENIOR_TRANCHE — and takes QUOTE_ASSET as whichever is left. This
 * function reproduces that derivation, so it inherits those guarantees rather than
 * assuming them.
 *
 * In Balancer V3 the pool contract IS the BPT, so `lptAsset` is both the token the
 * liquidity tranche takes deposits in and the `pool` argument the vault expects. The
 * venue relies on exactly that identity (`_vault.isPoolRegistered(LPT_ASSET)`).
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
  seniorTrancheAddress: string
): QuotePoolBinding {
  const binding = new QuotePoolBinding();

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

  // The QUOTE asset is the one that is NOT the senior tranche. Comparing against the
  // senior address rather than trusting a slot order: registration order is the pool
  // deployer's choice, and the venue itself branches the same way.
  let quoteIndex = -1;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].toHexString() != seniorTrancheAddress) {
      quoteIndex = i;
    }
  }
  // Neither slot is the senior tranche, or both are — the venue would have reverted at
  // construction, so this is unreachable for a real market. Refuse to guess.
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
