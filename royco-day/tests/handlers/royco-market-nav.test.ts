import {
  assert,
  describe,
  test,
  clearStore,
  createMockedFunction,
  beforeEach,
} from "matchstick-as/assembly/index";
import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import { handleMarketDeploymentCompleted } from "../../src/royco-factory";
import { handlePostOpTrancheAccountingSynced } from "../../src/royco-day-kernel";
import {
  DeploymentResult,
  createMarketDeploymentCompletedEvent,
} from "../builders/factory";
import { createPostOpSyncEvent } from "../builders/kernel";
import { Claims, TrancheState } from "../builders/shared";
import {
  DayMarketFixture,
  mockDayMarket,
  mockAssetPriceNAV,
  mockAssetPriceNAVReverts,
  mockConvertToAssets,
  mockConvertToAssetsReverts,
  mockBalancerPool,
  mockBalancerPoolAbsent,
  mockValueToAssetsReverts,
  withoutQuoteAsset,
} from "../mocks";
import { ctx, EventContext } from "../helpers/event";
import {
  BLOCK_NUMBER,
  ADDR_ACCOUNTANT,
  ADDR_DEPLOYER,
  ADDR_JUNIOR,
  ADDR_KERNEL,
  ADDR_LIQUIDITY,
  ADDR_SENIOR,
  ADDR_TEMPLATE,
  ADDR_BALANCER_VAULT,
  ADDR_ZERO,
  ADDR_ASSET,
  ADDR_LPT_ASSET,
  ADDR_QUOTE_ASSET,
  BLOCK_TIMESTAMP,
  DECIMALS_18,
  TX_HASH,
  TX_HASH_2,
} from "../helpers/constants";
import {
  generateMarketId,
  generateMarketNavHistoricalId,
  generateMarketNavId,
} from "../../src/utils";

// =============================================================================
// DayMarketNav / DayMarketNavHistorical — the market's 18-column price vector:
// three scalar ASSET prices + three SHARE-price AssetClaims quintuples.
//
// THE SOLE HOME of the share-price claims: DayVaultState used to keep a per-vault
// copy of this struct and no longer carries claims* or sharePrice* at all.
//
// TWO write sites with DIFFERENT sources, and the difference is the whole design:
//   - MarketDeploymentCompleted copies the three ASSET prices off the vaults it just
//     wrote, and leaves all 15 share-price legs at zero — an assertion about the
//     contracts (no supply yet, so _scaleAssetClaims returns the zero struct), not a
//     shortcut. Free either way: no extra eth_calls.
//   - TrancheAccountingSynced RE-READS everything live, because the sync payload has
//     no per-share or per-asset-token price, the share-price legs exist on no other
//     entity, and the vault's assetPriceNAV is stale between mints/burns.
// A handler that "optimised" the second into a vault copy would still write rows,
// still index, and silently freeze every price at the last mint. "the sync RE-READS
// the prices" below is the test that fails when that happens.
//
// DayMarketFixture.standard() gives all 18 values DISTINCT sentinels — asset prices
// 3_100/3_200/3_300, and seedClaims laying each tranche's quadruple out as base+1..
// base+4 (senior 2_101..2_104, junior 2_201..2_204, liquidity 2_301..2_304). Twelve
// same-typed BigInts make a transposition otherwise undetectable, so the full
// per-leg assertion below is the point, not thoroughness for its own sake.
//
// NOTE the mocks return NON-ZERO for the legs the real contract leaves structurally
// zero (senior/junior ltAssets+stShares; liquidity stAssets+jtAssets+stShares — see
// the schema note). That is deliberate: mocking them as zero would make a
// transposition AMONG the zero legs invisible, which is exactly the class of bug
// these assertions exist to catch. The handler's job is to copy the struct verbatim;
// which legs the contract fills is the contract's business.
// =============================================================================

const NAV_ID = generateMarketNavId(ADDR_KERNEL.toHexString());

/** Both assetTokenDecimals and shareTokenDecimals are 18 in the standard fixture. */
const ONE_TOKEN = BigInt.fromI32(10).pow(u8(DECIMALS_18));

// Creation: assetPrice* come from the Kernel's three converters, already read by
// createVault. seedClaims(base) puts `nav` at base + 5.
const CREATE_COLLATERAL_ASSET = "3100";
const CREATE_LT_ASSET = "3300";

// After a sync: each tranche's share price is convertToAssets(1 share) in full.
// seedClaims(base) lays the quadruple out as collateralAssets=base+1 .. nav=base+4.
const SYNC_ST_SHARE = "2104"; // the senior nav leg
const SYNC_JT_SHARE = "2204";
const SYNC_LT_SHARE = "2304";

/** Assert one tranche's whole share-price quadruple, leg by leg. */
function assertSharePriceQuadruple(
  entity: string,
  id: string,
  tranchePrefix: string,
  base: i32
): void {
  assert.fieldEquals(
    entity,
    id,
    tranchePrefix.concat("SharePriceCollateralAssets"),
    BigInt.fromI32(base + 1).toString()
  );
  assert.fieldEquals(
    entity,
    id,
    tranchePrefix.concat("SharePriceLiquidityTrancheAssets"),
    BigInt.fromI32(base + 2).toString()
  );
  assert.fieldEquals(
    entity,
    id,
    tranchePrefix.concat("SharePriceSeniorTrancheShares"),
    BigInt.fromI32(base + 3).toString()
  );
  assert.fieldEquals(
    entity,
    id,
    tranchePrefix.concat("SharePriceNAV"),
    BigInt.fromI32(base + 4).toString()
  );
}

/** Assert one tranche's whole share-price quadruple is all zeros. */
/**
 * An EMPTY tranche: the three asset legs are zero, but the NAV leg is ONE WHOLE NAV UNIT.
 *
 * Not zero — a tranche opens at $1 per whole share. ValuationLogic._computeTrancheShareRate
 * is _convertToValue(WAD, supply, nav), which at zero supply is
 * (0 + VIRTUAL_VALUE) * WAD / (0 + VIRTUAL_SHARES) == 1e18, and that is the ratio the
 * first depositor mints at. convertToAssets returns the ZERO struct here instead, because
 * AssetLedgerLogic._scaleAssetClaims short-circuits at `_totalTrancheShares == 0` before
 * the virtual-share arithmetic — it answers "claim on real assets", not "price".
 */
function assertSharePriceBootstrap(
  entity: string,
  id: string,
  tranchePrefix: string
): void {
  const isLiquidity = tranchePrefix == "liquidityTranche";
  // The tranche's OWN asset leg carries the same $1, denominated in that asset — the
  // kernel's inverse converter. The other tranche's leg stays 0, exactly as the branch in
  // TrancheClaimsLogic leaves it. 7701 / 7702 are distinct in the fixture, so a
  // mis-routed converter reads as the wrong number rather than passing by luck.
  assert.fieldEquals(
    entity,
    id,
    tranchePrefix.concat("SharePriceCollateralAssets"),
    isLiquidity ? "0" : "7701"
  );
  assert.fieldEquals(
    entity,
    id,
    tranchePrefix.concat("SharePriceLiquidityTrancheAssets"),
    isLiquidity ? "7702" : "0"
  );
  // INVARIANTLY 0 on every tranche — see the "ASSET CLAIMS" block.
  assert.fieldEquals(entity, id, tranchePrefix.concat("SharePriceSeniorTrancheShares"), "0");
  // 1e18 == one whole share's worth of NAV == $1.
  assert.fieldEquals(
    entity,
    id,
    tranchePrefix.concat("SharePriceNAV"),
    "1000000000000000000"
  );
}

function deployMarket(): void {
  mockDayMarket(DayMarketFixture.standard());
  handleMarketDeploymentCompleted(
    createMarketDeploymentCompletedEvent(
      ADDR_TEMPLATE,
      ADDR_DEPLOYER,
      new DeploymentResult(),
      ctx()
    )
  );
}

/** An event from the KERNEL — event.address IS the marketId, no hop. */
function accountantCtx(): EventContext {
  const c = ctx();
  c.emitter = ADDR_KERNEL;
  return c;
}

function sync(c: EventContext): void {
  // A POST-op sync: the events are on the KERNEL in v2, so the emitter must be the
  // kernel — event.address IS the marketId and there is no accountant hop.
  handlePostOpTrancheAccountingSynced(
    createPostOpSyncEvent(0, new TrancheState(), c)
  );
}

/** The nav row for a block OFFSET from the fixture's default — rows are block-keyed. */
function historicalId(blockOffset: i32): string {
  return generateMarketNavHistoricalId(
    ADDR_KERNEL.toHexString(),
    BLOCK_NUMBER.plus(BigInt.fromI32(blockOffset))
  );
}

describe("DayMarketNav at market creation", () => {
  beforeEach(() => {
    clearStore();
  });

  test("creation seeds the first row — asset prices read, share prices at the $1 bootstrap", () => {
    deployMarket();

    assert.entityCount("DayMarketNav", 1);
    assert.entityCount("DayMarketNavHistorical", 1);

    assert.fieldEquals("DayMarketNav", NAV_ID, "marketId", ADDR_KERNEL.toHexString());
    // A LAST-INDEX, not a count: born together with entry 0, so total == field + 1.
    // If this ever reads "1" the isNew branch in writeMarketNav has inverted and
    // entry 0 does not exist.

    // Zero supply, so every tranche is at its BOOTSTRAP price: the three asset legs are
    // genuinely 0 (no collateral, no LPT assets, no ST shares held yet) while the NAV leg
    // is one whole NAV unit — $1 per whole share, which is the rate the first depositor
    // mints at. Creation spends no eth_call on any of this: supply is provably zero at
    // deployment, so the answer is known rather than looked up.
    assertSharePriceBootstrap("DayMarketNav", NAV_ID, "seniorTranche");
    assertSharePriceBootstrap("DayMarketNav", NAV_ID, "juniorTranche");
    assertSharePriceBootstrap("DayMarketNav", NAV_ID, "liquidityTranche");
  });

  test("all 18 prices route to their OWN tranche and OWN claim leg", () => {
    // The transposition guard. Eighteen same-typed BigInts of the same order of
    // magnitude: a senior/junior swap, or an stAssets/jtAssets swap WITHIN one
    // quintuple, is invisible in Neon forever and passes every other test in this
    // file. Only distinct sentinels on every single leg catch it.
    deployMarket();

    assert.fieldEquals(
      "DayMarketNav",
      NAV_ID,
      "collateralAssetPriceNAV",
      CREATE_COLLATERAL_ASSET
    );
    assert.fieldEquals(
      "DayMarketNav",
      NAV_ID,
      "liquidityTrancheAssetPriceNAV",
      CREATE_LT_ASSET
    );

    // Now the share half, where creation's zeros cannot distinguish the three. One
    // sync re-reads them live, and each tranche's convertToAssets is mocked with its
    // own Claims — so a wrong tranche binding shows up as the wrong base, and a leg
    // swap within a quintuple as the wrong offset.
    sync(accountantCtx());

    assertSharePriceQuadruple("DayMarketNav", NAV_ID, "seniorTranche", 2_100);
    assertSharePriceQuadruple("DayMarketNav", NAV_ID, "juniorTranche", 2_200);
    assertSharePriceQuadruple("DayMarketNav", NAV_ID, "liquidityTranche", 2_300);
  });

  test("the creation snapshot mirrors its parent", () => {
    deployMarket();

    const id = historicalId(0);
    assert.fieldEquals("DayMarketNavHistorical", id, "marketId", ADDR_KERNEL.toHexString());
    // marketRefId points at BOTH the parent DayMarketNav and the DayMarketState —
    // they are the same string, which is why one column serves both.
    assert.fieldEquals("DayMarketNavHistorical", id, "marketRefId", NAV_ID);
    assert.fieldEquals(
      "DayMarketNavHistorical",
      id,
      "collateralAssetPriceNAV",
      CREATE_COLLATERAL_ASSET
    );
    assert.fieldEquals(
      "DayMarketNavHistorical",
      id,
      "liquidityTrancheAssetPriceNAV",
      CREATE_LT_ASSET
    );
    assertSharePriceBootstrap("DayMarketNavHistorical", id, "seniorTranche");
    assertSharePriceBootstrap("DayMarketNavHistorical", id, "liquidityTranche");
    // Immutable rows carry createdAt* only.
    assert.fieldEquals(
      "DayMarketNavHistorical",
      id,
      "createdAtBlockTimestamp",
      BLOCK_TIMESTAMP.toString()
    );
  });

  test("the snapshot carries the full quintuples too, not just the parent", () => {
    // The historical row is what Neon actually charts. A handler that wrote the 15
    // legs onto DayMarketNav but forgot them on the snapshot would pass every test
    // above and leave the time series permanently zero.
    deployMarket();
    // A NEW BLOCK, so this is its own row. In the creation block the sync would COLLAPSE
    // into the creation snapshot — which is correct, and asserted separately.
    const c = accountantCtx();
    c.blockNumber = BLOCK_NUMBER.plus(BigInt.fromI32(1));
    sync(c);

    const id = historicalId(1);
    assertSharePriceQuadruple("DayMarketNavHistorical", id, "seniorTranche", 2_100);
    assertSharePriceQuadruple("DayMarketNavHistorical", id, "juniorTranche", 2_200);
    assertSharePriceQuadruple("DayMarketNavHistorical", id, "liquidityTranche", 2_300);
  });
});

describe("DayMarketNav on TrancheAccountingSynced", () => {
  beforeEach(() => {
    clearStore();
  });

  test("the sync RE-READS the prices — it does not copy the stale DayVaultState", () => {
    // THE LOAD-BEARING TEST. If refreshMarketNav ever "saved the eth_calls" by reading
    // stored values instead of the chain, this row would report the creation values
    // forever — rows would still be written, the cursor would still advance, and
    // nothing else would notice. DayVaultState now stores no price at all, so there is
    // nothing to copy even by accident; this asserts the live read directly.
    deployMarket();

    // Re-point the Kernel's converters at new sentinels. Nothing on any stored
    // DayVaultState changes, so only a genuine re-read can observe these.
    mockAssetPriceNAV(
      ADDR_KERNEL,
      ONE_TOKEN,
      BigInt.fromI32(9_100),
      BigInt.fromI32(9_300)
    );

    sync(accountantCtx());

    assert.fieldEquals("DayMarketNav", NAV_ID, "collateralAssetPriceNAV", "9100");
    assert.fieldEquals("DayMarketNav", NAV_ID, "liquidityTrancheAssetPriceNAV", "9300");
    // The share half moved off its creation zeros in the same pass.
    assert.fieldEquals("DayMarketNav", NAV_ID, "seniorTrancheSharePriceNAV", SYNC_ST_SHARE);

    // There is no vault copy to fall back on any more: DayVaultState stores no price
    // of any kind, so this row is the ONLY source and a stale read is impossible by
    // construction rather than by discipline.
  });

  test("each BLOCK gets its own row and earlier snapshots are frozen", () => {
    deployMarket(); // creation writes the row for BLOCK_NUMBER (entry 0)

    // This sync is in the CREATION BLOCK, so it COLLAPSES into that same row rather
    // than opening a new one — the cursor stays at 0.
    const first = accountantCtx();
    sync(first);

    // Same block, later log index — two syncs in one block must not collide. An
    // entryIndex derived from a block number or timestamp would be fatal here (§8).
    // A NEW BLOCK — a second sync in the same block collapses into the same nav row.
    const second = accountantCtx();
    second.blockNumber = BLOCK_NUMBER.plus(BigInt.fromI32(1));
    mockAssetPriceNAV(
      ADDR_KERNEL,
      ONE_TOKEN,
      BigInt.fromI32(9_100),
      BigInt.fromI32(9_300)
    );
    sync(second); // a NEW block -> entry 1

    assert.entityCount("DayMarketNav", 1); // still ONE live row
    assert.entityCount("DayMarketNavHistorical", 2); // one per BLOCK, dense: 0, 1

    // The creation block's row still holds the creation price — a later BLOCK gets its
    // own row and never reaches back. (Within the block it would have overwritten it,
    // which is the collapse asserted separately.)
    assert.fieldEquals(
      "DayMarketNavHistorical",
      historicalId(0),
      "collateralAssetPriceNAV",
      CREATE_COLLATERAL_ASSET
    );
    assert.fieldEquals(
      "DayMarketNavHistorical",
      historicalId(1),
      "collateralAssetPriceNAV",
      "9100"
    );
  });

  test("createdAt is stamped once; only updatedAt follows the sync", () => {
    // Re-stamping createdAt builds fine, indexes fine, and quietly destroys every
    // cohort/age query in Neon — and this row is rewritten on every swap, so it
    // would be re-stamped constantly.
    deployMarket();

    const later = accountantCtx();
    later.blockTimestamp = BLOCK_TIMESTAMP.plus(BigInt.fromI32(3_600));
    later.txHash = TX_HASH_2;
    sync(later);

    assert.fieldEquals(
      "DayMarketNav",
      NAV_ID,
      "createdAtBlockTimestamp",
      BLOCK_TIMESTAMP.toString()
    );
    assert.fieldEquals(
      "DayMarketNav",
      NAV_ID,
      "createdAtTransactionHash",
      TX_HASH.toHexString()
    );
    assert.fieldEquals(
      "DayMarketNav",
      NAV_ID,
      "updatedAtBlockTimestamp",
      later.blockTimestamp.toString()
    );
    assert.fieldEquals(
      "DayMarketNav",
      NAV_ID,
      "updatedAtTransactionHash",
      TX_HASH_2.toHexString()
    );
  });

  test("a reverting inverse converter keeps $1 but leaves the asset leg at 0", () => {
    // convertValueToCollateralAssets / convertValueToLPTAssets DIVIDE BY AN ORACLE PRICE
    // (_getCollateralAssetPrice / _getLPTAssetPrice), so a stale feed, a downed sequencer
    // or a zero price all revert. Raw calls here would kill
    // handleMarketDeploymentCompleted and take the market, all three vaults and every
    // downstream row with them.
    //
    // The nav leg does NOT depend on the oracle — it is the virtual-share bootstrap, pure
    // arithmetic — so it must survive. Only the asset denomination is unknown.
    const market = DayMarketFixture.standard();
    mockDayMarket(market);
    mockValueToAssetsReverts(
      ADDR_KERNEL,
      BigInt.fromI32(10).pow(u8(DECIMALS_18))
    );
    handleMarketDeploymentCompleted(
      createMarketDeploymentCompletedEvent(
        ADDR_TEMPLATE,
        ADDR_DEPLOYER,
        new DeploymentResult(),
        ctx()
      )
    );

    // The market still indexed — that is the point of the guard.
    assert.entityCount("DayMarketNav", 1);
    // $1 intact on all three: the bootstrap rate is not an oracle read.
    assert.fieldEquals("DayMarketNav", NAV_ID, "seniorTrancheSharePriceNAV", "1000000000000000000");
    assert.fieldEquals("DayMarketNav", NAV_ID, "juniorTrancheSharePriceNAV", "1000000000000000000");
    assert.fieldEquals("DayMarketNav", NAV_ID, "liquidityTrancheSharePriceNAV", "1000000000000000000");
    // ...and the asset legs honestly absent rather than guessed.
    assert.fieldEquals("DayMarketNav", NAV_ID, "seniorTrancheSharePriceCollateralAssets", "0");
    assert.fieldEquals(
      "DayMarketNav",
      NAV_ID,
      "liquidityTrancheSharePriceLiquidityTrancheAssets",
      "0"
    );
  });

  test("a sync while the tranche is STILL EMPTY reports $1, not zero", () => {
    // THE REALISTIC GAP: a market is created, and before anyone deposits, the LT's
    // Balancer pool hook fires a swap-driven sync. Supply is still zero, so
    // convertToAssets returns the ZERO struct — AssetLedgerLogic._scaleAssetClaims
    // short-circuits at `_totalTrancheShares == 0` before the virtual-share arithmetic.
    //
    // Taking that at face value would drop the share price from the $1 written at
    // creation to 0, then snap back to ~$1 on the first deposit. A price series that
    // dips to zero and recovers is worse than one that never moved: every consumer
    // reads it as the tranche briefly being worthless.
    deployMarket();
    assert.fieldEquals(
      "DayMarketNav",
      NAV_ID,
      "seniorTrancheSharePriceNAV",
      "1000000000000000000"
    );

    // The chain's honest answer for an empty tranche.
    const empty = new Claims();
    const oneShare = BigInt.fromI32(10).pow(u8(DECIMALS_18));
    mockConvertToAssets(ADDR_SENIOR, oneShare, empty);
    mockConvertToAssets(ADDR_JUNIOR, oneShare, empty);
    mockConvertToAssets(ADDR_LIQUIDITY, oneShare, empty);

    const second = accountantCtx();
    second.blockNumber = BLOCK_NUMBER.plus(BigInt.fromI32(1));
    sync(second);

    // Still $1 across all three — the bootstrap rate held, it did not dip.
    assertSharePriceBootstrap("DayMarketNav", NAV_ID, "seniorTranche");
    assertSharePriceBootstrap("DayMarketNav", NAV_ID, "juniorTranche");
    assertSharePriceBootstrap("DayMarketNav", NAV_ID, "liquidityTranche");
    assertSharePriceBootstrap("DayMarketNavHistorical", historicalId(1), "seniorTranche");
  });

  test("a convertToAssets revert keeps the PREVIOUS share price, never zero", () => {
    // A plain swap reads no oracle on-chain, so the sync log can succeed in a block
    // where convertToAssets reverts — a missed Chainlink heartbeat, or a kernel pause
    // later in the same block (eth_call reads END-OF-BLOCK state). `view` is not
    // revert-safety (§5). Writing zero here would report a worthless tranche.
    deployMarket();
    sync(accountantCtx()); // share prices become 2105 / 2205 / 2305

    mockConvertToAssetsReverts(ADDR_SENIOR, ONE_TOKEN);
    mockConvertToAssetsReverts(ADDR_JUNIOR, ONE_TOKEN);
    mockConvertToAssetsReverts(ADDR_LIQUIDITY, ONE_TOKEN);

    // A NEW BLOCK — a second sync in the same block collapses into the same nav row.
    const second = accountantCtx();
    second.blockNumber = BLOCK_NUMBER.plus(BigInt.fromI32(1));
    sync(second);

    // The WHOLE quintuple falls back, not just the nav leg. The five members are one
    // atomic read of one struct at one instant — four fresh legs beside one stale one
    // would describe a claim that never existed.
    assertSharePriceQuadruple("DayMarketNav", NAV_ID, "seniorTranche", 2_100);
    assertSharePriceQuadruple("DayMarketNav", NAV_ID, "juniorTranche", 2_200);
    assertSharePriceQuadruple("DayMarketNav", NAV_ID, "liquidityTranche", 2_300);
    // The row is still written — the snapshot stream stays dense across a revert.
    // TWO rows, not three: the creation snapshot and the first sync share a block
    // and collapse into one; the reverting sync is the next block\'s row.
    assert.entityCount("DayMarketNavHistorical", 2);
  });

  test("a NAV-converter revert keeps the PREVIOUS asset price, not the creation one", () => {
    deployMarket(); // 3100 / 3200 / 3300

    mockAssetPriceNAV(
      ADDR_KERNEL,
      ONE_TOKEN,
      BigInt.fromI32(9_100),
      BigInt.fromI32(9_300)
    );
    sync(accountantCtx()); // 9100 / 9200 / 9300

    mockAssetPriceNAVReverts(ADDR_KERNEL, ONE_TOKEN);
    // A NEW BLOCK — a second sync in the same block collapses into the same nav row.
    const second = accountantCtx();
    second.blockNumber = BLOCK_NUMBER.plus(BigInt.fromI32(1));
    sync(second);

    // 9100, not 0 (that would destroy a good price) and not 3100 (that would mean the
    // fallback came from creation rather than from the row this handler last wrote).
    assert.fieldEquals("DayMarketNav", NAV_ID, "collateralAssetPriceNAV", "9100");
    assert.fieldEquals("DayMarketNav", NAV_ID, "liquidityTrancheAssetPriceNAV", "9300");
  });

  test("a sync for an unknown market writes no nav row", () => {
    // THE TEST PEOPLE FORGET. resolveMarketFromAccountant returns null before
    // refreshMarketNav can run — events can arrive before the market exists.
    clearStore();
    mockDayMarket(DayMarketFixture.standard()); // KERNEL() resolvable; entity absent

    sync(accountantCtx());

    assert.entityCount("DayMarketNav", 0);
    assert.entityCount("DayMarketNavHistorical", 0);
  });
});

// =============================================================================
// THE QUOTE LEG'S NAV PRICE, decoded from the BPT.
//
// The liquidity tranche's deposit asset IS the BPT, and that pool is a pair of (senior
// tranche share, quote asset). There is no Kernel.convertQuoteAssetsToValue, so the price
// comes off the pool: it is EXACTLY tokenRates[quoteAssetPoolIndex], because Balancer's
// own scaling is rawAmount * decimalScalingFactor * rate / WAD and the factor is a raw
// 10 ** (18 - decimals), so for one whole token the two powers of ten cancel.
// =============================================================================
describe("quoteAssetPriceNAV", () => {
  beforeEach(() => {
    clearStore();
  });

  test("creation resolves the vault + quote slot and prices the leg off its rate", () => {
    deployMarket();

    const marketId = generateMarketId(ADDR_KERNEL.toHexString());
    // Both pool facts are immutable on chain, so they are cached here and the sync path
    // then needs ONE call instead of three.
    assert.fieldEquals(
      "DayMarketState",
      marketId,
      "balancerVaultAddress",
      ADDR_BALANCER_VAULT.toHexString()
    );
    // Slot 1 — DERIVED by finding the token that is NOT the senior tranche, not assumed.
    assert.fieldEquals("DayMarketState", marketId, "quoteAssetPoolIndex", "1");
    // 1.02, the QUOTE slot's rate. The senior slot's is 3.07, so reading the wrong slot
    // is visible; and the raw scaling factors (1e12 / 1) cancel, so multiplying by them
    // would land 10^12 off.
    assert.fieldEquals("DayMarketNav", NAV_ID, "quoteAssetPriceNAV", "1020000000000000000");
    assert.fieldEquals(
      "DayMarketNavHistorical",
      historicalId(0),
      "quoteAssetPriceNAV",
      "1020000000000000000"
    );
  });

  test("the quote slot is derived, so the OPPOSITE registration order still works", () => {
    // Registration order is the pool deployer's choice. The venue branches on which slot
    // holds SENIOR_TRANCHE and so must this — a hardcoded index would read the senior
    // share's rate as the quote price here.
    const market = DayMarketFixture.standard();
    market.quoteAssetPoolIndex = 0;
    mockDayMarket(market);
    handleMarketDeploymentCompleted(
      createMarketDeploymentCompletedEvent(
        ADDR_TEMPLATE,
        ADDR_DEPLOYER,
        new DeploymentResult(),
        ctx()
      )
    );

    assert.fieldEquals(
      "DayMarketState",
      generateMarketId(ADDR_KERNEL.toHexString()),
      "quoteAssetPoolIndex",
      "0"
    );
    // Still 1.02 — the quote rate followed the quote token into slot 0.
    assert.fieldEquals("DayMarketNav", NAV_ID, "quoteAssetPriceNAV", "1020000000000000000");
  });

  test("a STANDARD quote asset prices at exactly 1.0 — the USD anchor", () => {
    // A token registered STANDARD has an implicit FP(1) rate, and that 1.0 is what pins
    // the market's whole NAV numeraire to USD. Asserted explicitly because it is the
    // real-world case (USDC) and the one a wrong unit would still look plausible in.
    const market = DayMarketFixture.standard();
    market.quoteAssetRate = BigInt.fromString("1000000000000000000");
    mockDayMarket(market);
    handleMarketDeploymentCompleted(
      createMarketDeploymentCompletedEvent(
        ADDR_TEMPLATE,
        ADDR_DEPLOYER,
        new DeploymentResult(),
        ctx()
      )
    );

    assert.fieldEquals("DayMarketNav", NAV_ID, "quoteAssetPriceNAV", "1000000000000000000");
  });

  test("a sync re-reads the rate; a later block's row carries the new one", () => {
    deployMarket();

    // The pool's rate moves — a yield-bearing quote asset, or a rate-provider update.
    mockBalancerPool(
      ADDR_LPT_ASSET,
      ADDR_BALANCER_VAULT,
      ADDR_SENIOR,
      ADDR_QUOTE_ASSET,
      1,
      BigInt.fromString("1050000000000000000"), // 1.05
      BigInt.fromString("3070000000000000000")
    );

    const second = accountantCtx();
    second.blockNumber = BLOCK_NUMBER.plus(BigInt.fromI32(1));
    sync(second);

    assert.fieldEquals("DayMarketNav", NAV_ID, "quoteAssetPriceNAV", "1050000000000000000");
    // The creation block's row keeps the OLD rate — this is a time series, not a view.
    assert.fieldEquals(
      "DayMarketNavHistorical",
      historicalId(0),
      "quoteAssetPriceNAV",
      "1020000000000000000"
    );
    assert.fieldEquals(
      "DayMarketNavHistorical",
      historicalId(1),
      "quoteAssetPriceNAV",
      "1050000000000000000"
    );
  });

  test("a reverting getPoolTokenRates keeps the PREVIOUS price, never zero", () => {
    deployMarket();

    // The pool stops answering. Writing 0 here would read as "the quote asset became
    // worthless", which is the most dangerous possible wrong answer for a price.
    createMockedFunction(
      ADDR_BALANCER_VAULT,
      "getPoolTokenRates",
      "getPoolTokenRates(address):(uint256[],uint256[])"
    )
      .withArgs([ethereum.Value.fromAddress(ADDR_LPT_ASSET)])
      .reverts();

    const second = accountantCtx();
    second.blockNumber = BLOCK_NUMBER.plus(BigInt.fromI32(1));
    sync(second);

    assert.fieldEquals("DayMarketNav", NAV_ID, "quoteAssetPriceNAV", "1020000000000000000");
  });

  test("a pool that does NOT contain this market's quote asset resolves to nothing", () => {
    // THE CASE A NEGATIVE SEARCH GETS WRONG. If the slot were picked as "whichever is
    // not the senior tranche", any two-token pool would yield an index — including one
    // holding neither the senior share nor this market's quote asset — and that
    // unrelated token's rate would be written as this market's quote price forever, with
    // no revert and no error. The venue guards this with an explicit revert; matching
    // the quote asset POSITIVELY is what reproduces that guard.
    const market = DayMarketFixture.standard();
    mockDayMarket(market);
    // The BPT is a registered 2-token pool, but of two unrelated tokens.
    mockBalancerPool(
      ADDR_LPT_ASSET,
      ADDR_BALANCER_VAULT,
      ADDR_JUNIOR, // stands in for some other token, NOT the senior share
      ADDR_ASSET, // and NOT the quote asset
      1,
      BigInt.fromString("9990000000000000000"),
      BigInt.fromString("8880000000000000000")
    );
    handleMarketDeploymentCompleted(
      createMarketDeploymentCompletedEvent(
        ADDR_TEMPLATE,
        ADDR_DEPLOYER,
        new DeploymentResult(),
        ctx()
      )
    );

    // Refused, not guessed: a zero vault means later syncs make no call at all.
    assert.fieldEquals(
      "DayMarketState",
      generateMarketId(ADDR_KERNEL.toHexString()),
      "balancerVaultAddress",
      ADDR_ZERO.toHexString()
    );
    // And crucially NOT 9.99 or 8.88 — neither unrelated rate leaks in as a price.
    assert.fieldEquals("DayMarketNav", NAV_ID, "quoteAssetPriceNAV", "0");
  });

  test("no QUOTE_ASSET but a REAL pool at LPT_ASSET still stores no price", () => {
    // The nastiest shape, and the one the review surfaced: the kernel has no Royco
    // Balancer venue (QUOTE_ASSET reverts, so quoteAssetTokenAddress is 0x0) but its
    // LPT_ASSET is nonetheless a registered two-token Balancer pool — an ordinary
    // wstETH/WETH BPT, say. getVault() and getPoolTokens() both SUCCEED here, so neither
    // try_ guard fires and nothing about the calls looks wrong.
    //
    // The row must not end up internally inconsistent: a 0x0 quote asset with a non-zero
    // quote price would be undetectable downstream, because the documented "read
    // balancerVaultAddress and quoteAssetPoolIndex together" contract would also say the
    // market has a venue.
    const market = withoutQuoteAsset(DayMarketFixture.standard());
    mockDayMarket(market);
    mockBalancerPool(
      ADDR_LPT_ASSET,
      ADDR_BALANCER_VAULT,
      ADDR_JUNIOR,
      ADDR_ASSET,
      1,
      BigInt.fromString("9990000000000000000"),
      BigInt.fromString("8880000000000000000")
    );
    handleMarketDeploymentCompleted(
      createMarketDeploymentCompletedEvent(
        ADDR_TEMPLATE,
        ADDR_DEPLOYER,
        new DeploymentResult(),
        ctx()
      )
    );

    const marketId = generateMarketId(ADDR_KERNEL.toHexString());
    // All three agree that this market has no quote asset.
    assert.fieldEquals("DayMarketState", marketId, "quoteAssetTokenAddress", ADDR_ZERO.toHexString());
    assert.fieldEquals("DayMarketState", marketId, "balancerVaultAddress", ADDR_ZERO.toHexString());
    assert.fieldEquals("DayMarketNav", NAV_ID, "quoteAssetPriceNAV", "0");
  });

  test("a kernel with NO Balancer venue indexes fine, with a zero binding", () => {
    // getVault() reverts when LPT_ASSET is an ordinary ERC20 rather than a pool. A raw
    // call would kill handleMarketDeploymentCompleted and with it the market, all three
    // vaults, and every row that ever hangs off them.
    const market = DayMarketFixture.standard();
    mockDayMarket(market);
    mockBalancerPoolAbsent(ADDR_LPT_ASSET);
    handleMarketDeploymentCompleted(
      createMarketDeploymentCompletedEvent(
        ADDR_TEMPLATE,
        ADDR_DEPLOYER,
        new DeploymentResult(),
        ctx()
      )
    );

    // The market still exists — that is the point of the guard.
    assert.entityCount("DayMarketState", 1);
    assert.entityCount("DayMarketNav", 1);
    assert.fieldEquals(
      "DayMarketState",
      generateMarketId(ADDR_KERNEL.toHexString()),
      "balancerVaultAddress",
      ADDR_ZERO.toHexString()
    );
    // No pool to ask, so no price. Zero is the truthful answer, not a failed read.
    assert.fieldEquals("DayMarketNav", NAV_ID, "quoteAssetPriceNAV", "0");
    // And the OTHER two asset prices are unaffected — they come from Kernel views.
    assert.fieldEquals("DayMarketNav", NAV_ID, "collateralAssetPriceNAV", "3100");
  });
});
