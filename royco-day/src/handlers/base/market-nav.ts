import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  DayMarketNav,
  DayMarketNavHistorical,
  DayMarketState,
  DayVaultState,
} from "../../../generated/schema";
import { RoycoSeniorTranche as TrancheContract } from "../../../generated/templates/RoycoSeniorTranche/RoycoSeniorTranche";
import { CHAIN_ID } from "../../constants";
import { generateMarketNavHistoricalId, generateMarketNavId } from "../../utils";
import { assetPriceNAV } from "./asset-price-nav";

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
  seniorTrancheSharePrice: SharePriceClaims = new SharePriceClaims();
  juniorTrancheSharePrice: SharePriceClaims = new SharePriceClaims();
  liquidityTrancheSharePrice: SharePriceClaims = new SharePriceClaims();
}

/**
 * Write the market's price vector: upsert DayMarketNav, then append its immutable
 * snapshot.
 *
 * THE CURSOR IS A LAST-INDEX, not a count. This row is born together with its
 * entry 0 (the factory writes both in one handler), so total snapshots ==
 * lastHistoricalEntryIndex + 1 and the order is increment-then-write. That is the
 * INVERSE of DayMarketState's `count*Entries` streams, which are born empty. Both
 * shapes are 0-based and dense; only the base value and the increment order differ
 * — see "ENTRY INDEX CURSOR" in schema.graphql.
 *
 * Hence the isNew branch: get it wrong and the first snapshot lands at entry 1,
 * entry 0 never exists, and the dense "total == cursor + 1" contract the schema
 * states is broken forever. Same shape as updatePosition and recordFeeSharesMinted.
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
  const isNew = nav == null;

  if (!nav) {
    nav = new DayMarketNav(id);
    nav.chainId = CHAIN_ID;
    nav.marketId = market.marketId;
    // createdAt* EXACTLY ONCE (§8). Re-stamping on the sync path would build fine,
    // index fine, and quietly destroy every cohort/age query in Neon — and this row
    // is written on every swap, so it would be re-stamped constantly.
    nav.createdAtTransactionHash = event.transaction.hash.toHexString();
    nav.createdAtBlockNumber = event.block.number;
    nav.createdAtBlockTimestamp = event.block.timestamp;
  }

  // The two scalar ASSET prices (v1 had three; senior and junior now share one).
  nav.collateralAssetPriceNAV = prices.collateralAssetPriceNAV;
  nav.liquidityTrancheAssetPriceNAV = prices.liquidityTrancheAssetPriceNAV;

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
    // The cursor advances ONLY when a new block row is created. Bumping it on an update
    // would push it past the row count permanently and put gaps in an index the schema
    // promises is dense.
    const entryIndex = isNew
      ? BigInt.zero()
      : nav.lastHistoricalEntryIndex.plus(BigInt.fromI32(1));
    snapshot.entryIndex = entryIndex;
    snapshot.blockNumber = event.block.number;
    nav.lastHistoricalEntryIndex = entryIndex;
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
 * !! COST: 5 eth_calls per call, on the HOTTEST path in this subgraph. The LT's
 *    Balancer V3 pool hook holds SYNC_ROLE and syncs on every swap, so this runs at
 *    AMM frequency. That cost is unavoidable rather than careless:
 *      - The TrancheAccountingSynced payload is 16 MARKET-level fields (collateralNAV,
 *        jtEffectiveNAV, utilizations, ...). It carries no per-share and no
 *        per-asset-token price, so nothing here is derivable from it for free.
 *      - The share-price quintuples exist on NO other entity — DayVaultState carries
 *        neither claims* nor sharePrice* any more, precisely because this row
 *        superseded them. There is nothing to copy.
 *      - DayVaultState holds NO price at all any more — not claims*, not sharePrice*,
 *        not assetPriceNAV. There is nothing on any other entity to copy, which is
 *        precisely because this row superseded all of them.
 *    handleTrancheAccountingSynced still deliberately does NOT refresh DayVaultState
 *    (that would be a further ~6 calls plus 3 immutable rows per swap). This is the
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
  const junior = DayVaultState.load(market.juniorTrancheId);
  const liquidity = DayVaultState.load(market.liquidityTrancheId);
  // The factory writes all three vaults in the same handler that writes the market,
  // so this is unreachable in practice. Bailing beats writing a half-priced row: a
  // partial vector with three zeros in it is indistinguishable in Neon from a market
  // whose junior tranche is genuinely worthless.
  if (!senior || !junior || !liquidity) return;

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
  prices.liquidityTrancheAssetPriceNAV = assetPriceNAV(
    market.kernelAddress,
    liquidity.minorType,
    liquidity.assetTokenDecimals,
    fallback.liquidityTrancheAssetPriceNAV
  );

  // One call per tranche returns that tranche's WHOLE quintuple — adding the four
  // extra legs per tranche cost no extra eth_call, the handler was simply discarding
  // them. The five legs also fall back TOGETHER on a revert, which is right: they are
  // one atomic read of one struct, and mixing four fresh legs with one stale one
  // would produce a claim that never existed at any instant.
  prices.seniorTrancheSharePrice = sharePriceClaims(
    senior,
    fallback.seniorTrancheSharePrice
  );
  prices.juniorTrancheSharePrice = sharePriceClaims(
    junior,
    fallback.juniorTrancheSharePrice
  );
  prices.liquidityTrancheSharePrice = sharePriceClaims(
    liquidity,
    fallback.liquidityTrancheSharePrice
  );

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
  fallback: SharePriceClaims
): SharePriceClaims {
  const tranche = TrancheContract.bind(Address.fromString(vault.vaultAddress));
  // .pow() takes a u8; decimals is an i32 (§3).
  const oneShare = BigInt.fromI32(10).pow(u8(vault.shareTokenDecimals));
  const claims = tranche.try_convertToAssets(oneShare);
  if (claims.reverted) return fallback;

  const out = new SharePriceClaims();
  out.collateralAssets = claims.value.collateralAssets;
  out.liquidityTrancheAssets = claims.value.lptAssets;
  out.seniorTrancheShares = claims.value.stShares;
  out.nav = claims.value.nav;
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
  liquidity: DayVaultState
): MarketNavPrices {
  const prices = new MarketNavPrices();
  // No previous row exists at creation, so the fallback is zero (§5/§8).
  prices.collateralAssetPriceNAV = assetPriceNAV(
    market.kernelAddress,
    senior.minorType,
    senior.assetTokenDecimals,
    BigInt.zero()
  );
  prices.liquidityTrancheAssetPriceNAV = assetPriceNAV(
    market.kernelAddress,
    liquidity.minorType,
    liquidity.assetTokenDecimals,
    BigInt.zero()
  );
  return prices;
}
