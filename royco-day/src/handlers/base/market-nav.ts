import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  DayMarketNav,
  DayMarketNavHistorical,
  DayMarketState,
  DayVaultState,
} from "../../../generated/schema";
import { RoycoSeniorTranche as TrancheContract } from "../../../generated/templates/RoycoSeniorTranche/RoycoSeniorTranche";
import { RoycoDayKernel as RoycoDayKernelContract } from "../../../generated/templates/RoycoDayKernel/RoycoDayKernel";
import { CHAIN_ID, TRANCHE_TYPE_LIQUIDITY } from "../../constants";
import { generateMarketNavHistoricalId, generateMarketNavId } from "../../utils";
import { assetPriceNAV } from "./asset-price-nav";
import { quoteAssetPriceNAV } from "./quote-price-nav";

/**
 * ONE tranche's share price: the AssetClaims quintuple of convertToAssets(1 share).
 *
 * Field names are the SCHEMA's (descriptive), not the ABI's (abbreviated), because
 * every one of them is copied straight onto a column of the same name — §7's
 * convention, applied at the point where the two sides meet. The one place the ABI
 * names appear is sharePriceClaims() below, which does the translation once.
 *
 * Deliberately NOT RedeemClaims from ../tranche/claims.ts, despite the identical
 * shape: that class exists to carry a Redeem/MultiAssetRedeem payload across the
 * shared-handler boundary and is named for it. Nothing here is a redemption — this
 * is convertToAssets, the pro-rata accounting claim (§6).
 *
 * Mutable fields with defaults, never a positional constructor: four same-typed
 * BigInts in a row guarantee a transposition eventually (§3, and the same rule as
 * RedeemClaims and tests/builders/shared.ts).
 */
export class SharePriceClaims {
  collateralAssets: BigInt = BigInt.zero();
  liquidityTrancheAssets: BigInt = BigInt.zero();
  seniorTrancheShares: BigInt = BigInt.zero();
  nav: BigInt = BigInt.zero();
}

/**
 * The market's whole price vector: three asset prices + three share-price claims.
 *
 * A class rather than fourteen positional parameters — fourteen same-typed BigInts
 * would make a transposition a certainty, and a senior/junior swap is invisible
 * downstream because both are plausible values of the same magnitude. Nesting the
 * quintuples also means the five legs of one tranche can only move together, which
 * is how the contract returns them.
 *
 * NOTE the asymmetry, and that it is the contract's: the ASSET price is a scalar
 * (Kernel.*ConvertTrancheUnitsToNAVUnits returns uint256) while the SHARE price is a
 * struct (convertToAssets returns AssetClaims — these are NOT ERC-4626 vaults, §6).
 */
export class MarketNavPrices {
  // ONE collateral price for senior AND junior — they share the asset in v2.
  collateralAssetPriceNAV: BigInt = BigInt.zero();
  liquidityTrancheAssetPriceNAV: BigInt = BigInt.zero();
  quoteAssetPriceNAV: BigInt = BigInt.zero();
  seniorTrancheSharePrice: SharePriceClaims = new SharePriceClaims();
  juniorTrancheSharePrice: SharePriceClaims = new SharePriceClaims();
  liquidityTrancheSharePrice: SharePriceClaims = new SharePriceClaims();
}

/**
 * Write the market's price vector: upsert DayMarketNav, then upsert this block's
 * snapshot.
 *
 * COLLAPSES PER BLOCK. The historical row is keyed by (market, block), so the first
 * write in a block creates it and every later one overwrites it — a deposit block, which
 * syncs twice, keeps the LAST price vector rather than two near-identical snapshots.
 * That is why DayMarketNavHistorical is `immutable: false`: the second write in a block
 * resolves to the same id, which on an immutable entity is fatal at index time (§8).
 *
 * Within a block it writes unconditionally, even when no price moved. The five eth_calls
 * behind these values have already been spent by the time we could compare them, so a
 * change check would save nothing.
 *
 * Does NOT touch DayMarketState — no cursor lives there for this stream, and
 * nothing here mutates the market. Callers still own their own touchMarket().
 */
export function writeMarketNav(
  event: ethereum.Event,
  market: DayMarketState,
  prices: MarketNavPrices
): void {
  const id = generateMarketNavId(market.marketId);
  let nav = DayMarketNav.load(id);

  if (!nav) {
    nav = new DayMarketNav(id);
    nav.chainId = CHAIN_ID;
    nav.marketId = market.marketId;
    // createdAt* EXACTLY ONCE (§8). Re-stamping on the sync path would build fine,
    // index fine, and quietly destroy every cohort/age query in Neon — and this row
    // is rewritten on every explicit accounting sync.
    nav.createdAtTransactionHash = event.transaction.hash.toHexString();
    nav.createdAtBlockNumber = event.block.number;
    nav.createdAtBlockTimestamp = event.block.timestamp;
  }

  // The two scalar ASSET prices (v1 had three; senior and junior now share one).
  nav.collateralAssetPriceNAV = prices.collateralAssetPriceNAV;
  nav.liquidityTrancheAssetPriceNAV = prices.liquidityTrancheAssetPriceNAV;
  nav.quoteAssetPriceNAV = prices.quoteAssetPriceNAV;

  // The three SHARE-price quadruples, flattened onto their columns. Written out in
  // full rather than looped: AssemblyScript has no closures (§3), and the entity
  // setters are distinct generated properties anyway. The lptAssets/stShares legs on
  // senior and junior — and collateralAssets/stShares on liquidity — are invariantly
  // zero by the contract's own branch structure; they are stored anyway so the row is
  // the whole struct. See the schema note.
  const st = prices.seniorTrancheSharePrice;
  nav.seniorTrancheSharePriceCollateralAssets = st.collateralAssets;
  nav.seniorTrancheSharePriceLiquidityTrancheAssets = st.liquidityTrancheAssets;
  nav.seniorTrancheSharePriceSeniorTrancheShares = st.seniorTrancheShares;
  nav.seniorTrancheSharePriceNAV = st.nav;

  const jt = prices.juniorTrancheSharePrice;
  nav.juniorTrancheSharePriceCollateralAssets = jt.collateralAssets;
  nav.juniorTrancheSharePriceLiquidityTrancheAssets = jt.liquidityTrancheAssets;
  nav.juniorTrancheSharePriceSeniorTrancheShares = jt.seniorTrancheShares;
  nav.juniorTrancheSharePriceNAV = jt.nav;

  const lt = prices.liquidityTrancheSharePrice;
  nav.liquidityTrancheSharePriceCollateralAssets = lt.collateralAssets;
  nav.liquidityTrancheSharePriceLiquidityTrancheAssets = lt.liquidityTrancheAssets;
  nav.liquidityTrancheSharePriceSeniorTrancheShares = lt.seniorTrancheShares;
  nav.liquidityTrancheSharePriceNAV = lt.nav;

  // The BLOCK's row — created by the first write in the block, overwritten by every
  // later one. Both writes of a deposit block (pre-op then post-op sync) land on the
  // same id, so the block keeps the LAST price vector rather than two near-identical
  // snapshots. See generateMarketNavHistoricalId.
  const snapshotId = generateMarketNavHistoricalId(
    market.marketId,
    event.block.number
  );
  let snapshot = DayMarketNavHistorical.load(snapshotId);

  if (!snapshot) {
    snapshot = new DayMarketNavHistorical(snapshotId);
    snapshot.blockNumber = event.block.number;
    // createdAt* EXACTLY ONCE (§8) — the FIRST write in this block.
    snapshot.createdAtTransactionHash = event.transaction.hash.toHexString();
    snapshot.createdAtBlockNumber = event.block.number;
    snapshot.createdAtBlockTimestamp = event.block.timestamp;
  }

  nav.updatedAtTransactionHash = event.transaction.hash.toHexString();
  nav.updatedAtBlockNumber = event.block.number;
  nav.updatedAtBlockTimestamp = event.block.timestamp;
  nav.save();

  snapshot.chainId = nav.chainId;
  snapshot.marketId = nav.marketId;
  // The parent DayMarketNav.id and DayMarketState.id are the same string; this one
  // column serves as both pointers.
  snapshot.marketRefId = nav.id;
  // Copied from `nav`, not from `prices` — so the snapshot mirrors what was actually
  // stored, and stays correct if a future edit ever transforms a value on the way in.
  snapshot.collateralAssetPriceNAV = nav.collateralAssetPriceNAV;
  snapshot.liquidityTrancheAssetPriceNAV = nav.liquidityTrancheAssetPriceNAV;
  snapshot.quoteAssetPriceNAV = nav.quoteAssetPriceNAV;
  snapshot.seniorTrancheSharePriceCollateralAssets =
    nav.seniorTrancheSharePriceCollateralAssets;
  snapshot.seniorTrancheSharePriceLiquidityTrancheAssets =
    nav.seniorTrancheSharePriceLiquidityTrancheAssets;
  snapshot.seniorTrancheSharePriceSeniorTrancheShares =
    nav.seniorTrancheSharePriceSeniorTrancheShares;
  snapshot.seniorTrancheSharePriceNAV = nav.seniorTrancheSharePriceNAV;
  snapshot.juniorTrancheSharePriceCollateralAssets =
    nav.juniorTrancheSharePriceCollateralAssets;
  snapshot.juniorTrancheSharePriceLiquidityTrancheAssets =
    nav.juniorTrancheSharePriceLiquidityTrancheAssets;
  snapshot.juniorTrancheSharePriceSeniorTrancheShares =
    nav.juniorTrancheSharePriceSeniorTrancheShares;
  snapshot.juniorTrancheSharePriceNAV = nav.juniorTrancheSharePriceNAV;
  snapshot.liquidityTrancheSharePriceCollateralAssets =
    nav.liquidityTrancheSharePriceCollateralAssets;
  snapshot.liquidityTrancheSharePriceLiquidityTrancheAssets =
    nav.liquidityTrancheSharePriceLiquidityTrancheAssets;
  snapshot.liquidityTrancheSharePriceSeniorTrancheShares =
    nav.liquidityTrancheSharePriceSeniorTrancheShares;
  snapshot.liquidityTrancheSharePriceNAV = nav.liquidityTrancheSharePriceNAV;
  snapshot.updatedAtTransactionHash = event.transaction.hash.toHexString();
  snapshot.updatedAtBlockNumber = event.block.number;
  snapshot.updatedAtBlockTimestamp = event.block.timestamp;
  snapshot.save();
}

/**
 * Re-read the whole price vector from the contracts and write the row.
 *
 * !! COST: 6 eth_calls per explicit accounting sync. The Balancer pool is hookless,
 *    so swaps do not invoke this path; authorized keepers, entrypoint operations,
 *    tranche operations, reinvestment and synchronizing admin updates do. The cost is
 *    unavoidable rather than careless:
 *      - The TrancheAccountingSynced payload is 16 MARKET-level fields (collateralNAV,
 *        jtEffectiveNAV, utilizations, ...). It carries no per-share and no
 *        per-asset-token price, so nothing here is derivable from it for free.
 *      - The share-price quintuples exist on NO other entity — DayVaultState carries
 *        neither claims* nor sharePrice* any more, precisely because this row
 *        superseded them. There is nothing to copy.
 *      - DayVaultState holds NO price at all any more — not claims*, not sharePrice*,
 *        not assetPriceNAV. There is nothing on any other entity to copy, which is
 *        precisely because this row superseded all of them.
 *    recordSync still deliberately does NOT refresh DayVaultState (that would be a
 *    further ~6 calls plus 3 history rows per sync). This is the
 *    one contract-reading addition to that handler; keep it the only one.
 *
 * NO ELSE BRANCHES on the reverts, deliberately. Every one of these values was
 * seeded at market creation, so a previous value provably always exists — on revert
 * we keep it (§5). `view` is not revert-safety: a stale Chainlink feed or a kernel
 * pause reverts these while the sync log itself succeeded, and eth_call reads
 * END-OF-BLOCK state, so a pause later in the same block reverts a call for an event
 * that legitimately happened. Writing zero here would destroy a good price.
 *
 * The three tranches are bound through ONE generated class, which is safe only
 * because their ABIs declare byte-identical convertToAssets signatures (guarded by
 * scripts/checks/abi.test.mjs) AND because the RUNNING data source lists that ABI.
 * That second condition is why RoycoSeniorTranche had to be added to the
 * RoycoDayAccountant template's `abis:` list — `bind()` bakes the contract NAME and
 * graph-node resolves it against the running data source at eth_call time, so
 * without it every sync would fail its call and stall the subgraph, and `graph
 * build` would pass regardless (§10.4).
 */
export function refreshMarketNav(
  event: ethereum.Event,
  market: DayMarketState
): void {
  // Entity loads, not eth_calls — the decimals these need are already stored. Both
  // denominators matter: assetPrice* is priced in ASSET decimals and sharePrice* in
  // SHARE decimals, and the two differ whenever a tranche's share token and its
  // underlying disagree.
  const senior = DayVaultState.load(market.seniorTrancheId);
  // The senior tranche is MANDATORY on every market (RoycoFactory.sol:132-137), and the
  // factory writes it in the same handler that writes the market, so a missing senior is
  // a real fault. Bail: a vector with no senior price is indistinguishable in Neon from a
  // market whose senior tranche is genuinely worthless.
  if (!senior) return;
  // The junior and liquidity slots are OPTIONAL — one of the two may be the zero address,
  // in which case no vault was ever created and this load is legitimately null. That is
  // NOT a fault; price the tranches that exist and leave the absent one at its fallback.
  const junior = DayVaultState.load(market.juniorTrancheId);
  const liquidity = DayVaultState.load(market.liquidityTrancheId);

  // The previous row supplies the per-leg fallback. Reusing MarketNavPrices for it
  // is not just tidiness: every field of it defaults to zero, which is exactly the right
  // answer when there is no previous row, so the "creation never ran" case needs no
  // separate branch. That case is unreachable in practice (the factory seeds entry 0
  // before this template can fire); zero is simply the only value available if it
  // ever were reached.
  const fallback = new MarketNavPrices();
  const previous = DayMarketNav.load(generateMarketNavId(market.marketId));
  if (previous) {
    fallback.collateralAssetPriceNAV = previous.collateralAssetPriceNAV;
    fallback.liquidityTrancheAssetPriceNAV = previous.liquidityTrancheAssetPriceNAV;
    fallback.quoteAssetPriceNAV = previous.quoteAssetPriceNAV;
    fallback.seniorTrancheSharePrice.collateralAssets =
      previous.seniorTrancheSharePriceCollateralAssets;
    fallback.seniorTrancheSharePrice.liquidityTrancheAssets =
      previous.seniorTrancheSharePriceLiquidityTrancheAssets;
    fallback.seniorTrancheSharePrice.seniorTrancheShares =
      previous.seniorTrancheSharePriceSeniorTrancheShares;
    fallback.seniorTrancheSharePrice.nav = previous.seniorTrancheSharePriceNAV;
    fallback.juniorTrancheSharePrice.collateralAssets =
      previous.juniorTrancheSharePriceCollateralAssets;
    fallback.juniorTrancheSharePrice.liquidityTrancheAssets =
      previous.juniorTrancheSharePriceLiquidityTrancheAssets;
    fallback.juniorTrancheSharePrice.seniorTrancheShares =
      previous.juniorTrancheSharePriceSeniorTrancheShares;
    fallback.juniorTrancheSharePrice.nav = previous.juniorTrancheSharePriceNAV;
    fallback.liquidityTrancheSharePrice.collateralAssets =
      previous.liquidityTrancheSharePriceCollateralAssets;
    fallback.liquidityTrancheSharePrice.liquidityTrancheAssets =
      previous.liquidityTrancheSharePriceLiquidityTrancheAssets;
    fallback.liquidityTrancheSharePrice.seniorTrancheShares =
      previous.liquidityTrancheSharePriceSeniorTrancheShares;
    fallback.liquidityTrancheSharePrice.nav = previous.liquidityTrancheSharePriceNAV;
  }

  const prices = new MarketNavPrices();

  // Dispatch is on each vault's OWN minorType, which is authoritative — it comes
  // from which slot of the DeploymentResult tuple the address arrived in, not from
  // TRANCHE_TYPE(), whose 0/1/2 ordering is an inference (§6).
  // ONE collateral read covers senior AND junior — same asset, same converter, so a
  // second call would spend an eth_call to fetch a number we already hold.
  prices.collateralAssetPriceNAV = assetPriceNAV(
    market.kernelAddress,
    senior.minorType,
    senior.assetTokenDecimals,
    fallback.collateralAssetPriceNAV
  );

  // The senior tranche always exists, so its share price is always re-read. One call
  // returns the WHOLE quintuple — adding the four extra legs cost no extra eth_call, the
  // handler was simply discarding them. The five legs also fall back TOGETHER on a
  // revert, which is right: they are one atomic read of one struct, and mixing four fresh
  // legs with one stale one would produce a claim that never existed at any instant.
  prices.seniorTrancheSharePrice = sharePriceClaims(
    senior,
    market.kernelAddress,
    fallback.seniorTrancheSharePrice
  );

  // The junior tranche is OPTIONAL. When absent its share price keeps the fallback (the
  // previous row's value, or zero if none) rather than being read off a vault that does
  // not exist.
  if (junior) {
    prices.juniorTrancheSharePrice = sharePriceClaims(
      junior,
      market.kernelAddress,
      fallback.juniorTrancheSharePrice
    );
  } else {
    prices.juniorTrancheSharePrice = fallback.juniorTrancheSharePrice;
  }

  // The liquidity tranche is OPTIONAL, and it carries THREE legs of the vector: its own
  // asset price, the quote leg derived from its BPT, and its share price. When it is
  // absent the market has no LPT asset and no Balancer venue at all, so all three keep
  // the fallback and no eth_call is spent chasing a pool that was never deployed.
  if (liquidity) {
    prices.liquidityTrancheAssetPriceNAV = assetPriceNAV(
      market.kernelAddress,
      liquidity.minorType,
      liquidity.assetTokenDecimals,
      fallback.liquidityTrancheAssetPriceNAV
    );
    // The third asset price, and the only one not from a Kernel view. ONE call, using the
    // vault and slot resolved once at market creation — re-deriving them per sync would
    // cost two more on the hottest path in the subgraph.
    //
    // The pool address is the KERNEL's LPT_ASSET, not liquidity.assetTokenAddress. The
    // two are the same token on chain (the kernel constructor requires
    // liquidityProviderTranche.asset() == LPT_ASSET), but LPT_ASSET is the authoritative
    // one and is literally what the venue passes as `pool`. Sourcing it from the kernel
    // rather than the tranche means this does not silently depend on that invariant.
    prices.quoteAssetPriceNAV = quoteAssetPriceNAV(
      market.balancerVaultAddress,
      market.liquidityTrancheAssetTokenAddress,
      market.quoteAssetPoolIndex,
      fallback.quoteAssetPriceNAV
    );
    prices.liquidityTrancheSharePrice = sharePriceClaims(
      liquidity,
      market.kernelAddress,
      fallback.liquidityTrancheSharePrice
    );
  } else {
    prices.liquidityTrancheAssetPriceNAV = fallback.liquidityTrancheAssetPriceNAV;
    prices.quoteAssetPriceNAV = fallback.quoteAssetPriceNAV;
    prices.liquidityTrancheSharePrice = fallback.liquidityTrancheSharePrice;
  }

  writeMarketNav(event, market, prices);
}

/**
 * One whole share of one tranche, as the full AssetClaims quintuple:
 * convertToAssets(10 ** shareTokenDecimals).
 *
 * This is convertToAssets, NOT previewRedeem — the pro-rata accounting claim, not
 * redemption proceeds, which go down a different kernel path entirely. Never
 * describe it as "redeemable" (§6).
 *
 * THE ONE PLACE ABI NAMES MEET SCHEMA NAMES for this struct, so the §6 mapping is
 * applied exactly once instead of at three call sites:
 *   collateralAssets -> collateralAssets   lptAssets -> liquidityTrancheAssets
 *   stShares         -> seniorTrancheShares  nav       -> nav
 *
 * Several legs come back structurally zero and that is CORRECT — which ones depends
 * on the tranche, and the schema note spells it out from contracts/. Do not add a
 * "looks empty, try something else" fallback for them.
 *
 * `fallback` is returned WHOLE on a revert, never leg-by-leg: the five members are
 * one atomic read of one struct at one instant, so a mixture of fresh and stale legs
 * would describe a claim that never existed. It is the caller's value for the same
 * reason as in assetPriceNAV — the schema says keep the previous one, and there is
 * no sensible zero (§5).
 */
function sharePriceClaims(
  vault: DayVaultState,
  kernelAddress: string,
  fallback: SharePriceClaims
): SharePriceClaims {
  // .pow() takes a u8; decimals is an i32 (§3).
  const oneShare = BigInt.fromI32(10).pow(u8(vault.shareTokenDecimals));

  // EMPTY TRANCHE: one whole share is worth ONE WHOLE NAV UNIT, not zero.
  //
  // convertToAssets would return the ZERO STRUCT here, and that is not the share price
  // — it is the pro-rata claim on real assets, of which an empty tranche has none.
  // AssetLedgerLogic._scaleAssetClaims short-circuits `if (_totalTrancheShares == 0)
  // return scaledClaims;` BEFORE the virtual-share arithmetic that defines the price.
  //
  // The protocol's own notion of a share price is ValuationLogic._computeTrancheShareRate,
  // which is _convertToValue(WAD, supply, nav) — and at zero supply that is
  //     (0 + VIRTUAL_VALUE) * WAD / (0 + VIRTUAL_SHARES)  ==  1 * 1e18 / 1  ==  1e18
  // because VIRTUAL_SHARES == 1 and VIRTUAL_VALUE == ONE_NAV_UNIT == 1. So a tranche
  // opens at exactly 1 NAV per whole share — $1, the market's numeraire being pinned to
  // USD by the quote leg's rate. That bootstrap ratio is also what the first depositor
  // actually mints at, since _convertToSharesUnclamped is the same expression inverted.
  //
  // For supply > 0 there is nothing to special-case: _scaleAssetClaims' nav leg is
  //     (nav + VIRTUAL_VALUE) * shares / (supply + VIRTUAL_SHARES)
  // which IS _convertToValue, so convertToAssets already agrees with the share rate.
  // The zero-supply early return is the only divergence.
  //
  // Only the NAV leg is affected: the virtual value backs the price, but an empty
  // tranche holds no real collateral, LPT assets or ST shares, so those three legs are
  // genuinely zero.
  //
  // THE CONTRACT IS STILL ASKED FIRST, and its answer always wins. The substitution
  // below fires ONLY when the tranche is empty AND the call came back with a zero nav —
  // i.e. exactly the short-circuited case. It never overrides a real price, so a market
  // whose supply the subgraph has somehow under-counted still reports whatever the chain
  // says rather than a synthetic 1e18.
  const tranche = TrancheContract.bind(Address.fromString(vault.vaultAddress));
  const claims = tranche.try_convertToAssets(oneShare);
  if (claims.reverted) return fallback;

  const out = new SharePriceClaims();
  out.collateralAssets = claims.value.collateralAssets;
  out.liquidityTrancheAssets = claims.value.lptAssets;
  out.seniorTrancheShares = claims.value.stShares;
  out.nav = claims.value.nav;
  if (vault.sharesTotalSupply.isZero() && out.nav.isZero()) {
    // Same helper the creation path uses, so an empty tranche reads identically whether
    // it was just deployed or is being synced before its first deposit.
    return bootstrapSharePrice(vault, kernelAddress);
  }
  return out;
}

/**
 * Assemble the whole price vector at MARKET CREATION. TWO eth_calls.
 *
 * The asset prices are read here rather than copied off the vaults: DayVaultState no
 * longer stores a price of any kind, so this is their only source. Two calls, not
 * three — senior and junior are coinvested in one collateral asset and share a
 * converter, so `senior` below stands in for both.
 *
 * All fifteen SHARE-price legs are left at MarketNavPrices' zero defaults, and that
 * is an assertion about the contracts, not a shortcut: a market has no shares at
 * deployment (every _mint lives in deposit / depositMultiAsset / mint /
 * mintProtocolFeeShares / mintLiquidityPremiumShares, none reachable from
 * deployMarket or initialize), and _scaleAssetClaims returns the zero struct whenever
 * total shares is zero, for ANY input — including one whole share
 * (TrancheClaimsLogic.sol:126). So three try_convertToAssets calls here would spend an
 * eth_call each to be told zero.
 *
 * !! If a future template CAN seed supply during deployMarket, this goes silently
 *    wrong — the zero guard in _scaleAssetClaims is the only thing holding it up, and
 *    nothing here would notice. The fix then is to call sharePriceClaims() per tranche
 *    rather than to reintroduce a vault copy: DayVaultState no longer stores these.
 *
 * NOT valid anywhere but creation. Mid-life the answer must come from the chain — see
 * refreshMarketNav.
 */
export function marketNavPricesFromVaults(
  market: DayMarketState,
  senior: DayVaultState,
  junior: DayVaultState | null,
  liquidity: DayVaultState | null
): MarketNavPrices {
  const prices = new MarketNavPrices();
  // No previous row exists at creation, so the fallback is zero (§5/§8).
  prices.collateralAssetPriceNAV = assetPriceNAV(
    market.kernelAddress,
    senior.minorType,
    senior.assetTokenDecimals,
    BigInt.zero()
  );
  // The liquidity tranche is OPTIONAL. When it is absent the market has no LPT asset and
  // no Balancer venue, so both its asset price and the quote leg derived from its BPT
  // stay at the zero default — the honest value for a leg that does not exist. The
  // guarded reads also avoid dereferencing a null vault for its minorType/decimals.
  if (liquidity) {
    prices.liquidityTrancheAssetPriceNAV = assetPriceNAV(
      market.kernelAddress,
      liquidity.minorType,
      liquidity.assetTokenDecimals,
      BigInt.zero()
    );
    // Priced at creation like its two siblings, so entry 0 carries a real vector rather
    // than a zero this column would otherwise keep until the first sync. The caller has
    // already resolved the vault and slot onto `market`, so this is one call.
    prices.quoteAssetPriceNAV = quoteAssetPriceNAV(
      market.balancerVaultAddress,
      market.liquidityTrancheAssetTokenAddress,
      market.quoteAssetPoolIndex,
      BigInt.zero()
    );
  }

  // THE THREE SHARE PRICES, at the BOOTSTRAP rate — and with no eth_call, because the
  // answer is known rather than looked up.
  //
  // Every tranche is provably empty here: deployMarket only predicts addresses and
  // wires roles, and every mint path (kernelMint, the protocol-fee mint, the senior
  // premium mint) is onlyKernel and guarded, so none can have run. At zero supply the
  // protocol's own share rate — ValuationLogic._computeTrancheShareRate, i.e.
  // _convertToValue(WAD, supply, nav) — is
  //     (0 + VIRTUAL_VALUE) * WAD / (0 + VIRTUAL_SHARES)  ==  1 * 1e18 / 1  ==  1e18
  // one WHOLE NAV UNIT per whole share. $1, the numeraire being pinned to USD by the
  // quote leg's rate. That is also the ratio the first depositor mints at, since
  // _convertToSharesUnclamped is the same expression inverted.
  //
  // Calling convertToAssets instead would return the ZERO struct and be WRONG for the
  // nav leg: that function is the pro-rata claim on REAL assets, and
  // AssetLedgerLogic._scaleAssetClaims short-circuits at `_totalTrancheShares == 0`
  // BEFORE the virtual-share arithmetic that defines the price. sharePriceClaims patches
  // that same hole on the sync path; here we skip the call entirely.
  //
  // Only the NAV leg is set. The other three legs are genuinely zero — a virtual value
  // backs the price, but the tranche holds no collateral, LPT assets or ST shares yet.
  //
  // Each counterparty tranche is bootstrapped only when it exists; an absent slot keeps
  // the zero-default quintuple, which is the truthful price of a tranche the market does
  // not have.
  prices.seniorTrancheSharePrice = bootstrapSharePrice(senior, market.kernelAddress);
  if (junior) {
    prices.juniorTrancheSharePrice = bootstrapSharePrice(
      junior,
      market.kernelAddress
    );
  }
  if (liquidity) {
    prices.liquidityTrancheSharePrice = bootstrapSharePrice(
      liquidity,
      market.kernelAddress
    );
  }
  return prices;
}

/**
 * One whole share of an EMPTY tranche, at the virtual-share bootstrap rate.
 *
 * nav = 10 ** shareTokenDecimals — one whole NAV unit, $1. See the note at the call site
 * in marketNavPricesFromVaults for why that is the contract's own answer and
 * convertToAssets' zero is not.
 *
 * THE ASSET LEG IS THE SAME VALUE, DENOMINATED IN THAT TRANCHE'S OWN ASSET, obtained by
 * running the nav back through the kernel's inverse converter. It is not a second,
 * independent price: `convertValueToCollateralAssets` / `convertValueToLPTAssets` are the
 * exact inverses of the `convert*AssetsToValue` pair used for *AssetPriceNAV, so the leg
 * answers "how much of this tranche's asset is one whole share worth" at the same oracle
 * mark. On a $1 share and a $1 asset it lands on one whole asset token; on a 4000/unit
 * collateral it lands on 1/4000th.
 *
 * ONE CONVERTER PER TRANCHE, dispatched on minorType — never on TRANCHE_TYPE() == 0/1/2,
 * whose ordering is an inference (§6). Senior and junior share the collateral converter
 * because they share the asset; only the liquidity tranche has its own.
 *
 * WHICH LEG IS FILLED matches the branch in TrancheClaimsLogic exactly, so the zero
 * pattern the schema documents is preserved: SENIOR/JUNIOR fill collateralAssets and
 * leave lptAssets and stShares at 0; LIQUIDITY fills lptAssets and leaves
 * collateralAssets at 0. stShares is 0 on every tranche.
 *
 * `try_` because both converters DIVIDE BY AN ORACLE PRICE (_getCollateralAssetPrice /
 * _getLPTAssetPrice): a stale feed, a downed sequencer or a zero price all revert. On a
 * revert the asset leg stays 0 while nav keeps its bootstrap value — the price of the
 * share is still known, only its asset denomination is not.
 */
function bootstrapSharePrice(
  vault: DayVaultState,
  kernelAddress: string
): SharePriceClaims {
  const out = new SharePriceClaims();
  // .pow() takes a u8; decimals is an i32 (§3).
  const oneShare = BigInt.fromI32(10).pow(u8(vault.shareTokenDecimals));
  out.nav = oneShare;

  const kernel = RoycoDayKernelContract.bind(Address.fromString(kernelAddress));
  if (vault.minorType == TRANCHE_TYPE_LIQUIDITY) {
    const lpt = kernel.try_convertValueToLPTAssets(oneShare);
    if (!lpt.reverted) out.liquidityTrancheAssets = lpt.value;
    return out;
  }
  const collateral = kernel.try_convertValueToCollateralAssets(oneShare);
  if (!collateral.reverted) out.collateralAssets = collateral.value;
  return out;
}
