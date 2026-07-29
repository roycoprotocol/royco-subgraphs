import {
  assert,
  describe,
  test,
  clearStore,
  beforeEach,
} from "matchstick-as/assembly/index";
import { BigInt } from "@graphprotocol/graph-ts";
import { handleMarketDeploymentCompleted } from "../../src/royco-factory";
import { handlePostOpTrancheAccountingSynced } from "../../src/royco-day-kernel";
import {
  DeploymentResult,
  createMarketDeploymentCompletedEvent,
} from "../builders/factory";
import { createPostOpSyncEvent } from "../builders/kernel";
import { TrancheState } from "../builders/shared";
import {
  DayMarketFixture,
  mockDayMarket,
  mockAssetPriceNAV,
  mockAssetPriceNAVReverts,
  mockConvertToAssets,
  mockConvertToAssetsReverts,
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
  BLOCK_TIMESTAMP,
  DECIMALS_18,
  TX_HASH,
  TX_HASH_2,
} from "../helpers/constants";
import {
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
function assertSharePriceAllZero(
  entity: string,
  id: string,
  tranchePrefix: string
): void {
  assert.fieldEquals(entity, id, tranchePrefix.concat("SharePriceCollateralAssets"), "0");
  assert.fieldEquals(
    entity,
    id,
    tranchePrefix.concat("SharePriceLiquidityTrancheAssets"),
    "0"
  );
  assert.fieldEquals(entity, id, tranchePrefix.concat("SharePriceSeniorTrancheShares"), "0");
  assert.fieldEquals(entity, id, tranchePrefix.concat("SharePriceNAV"), "0");
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

  test("creation seeds the first row — asset prices read, share prices provably zero", () => {
    deployMarket();

    assert.entityCount("DayMarketNav", 1);
    assert.entityCount("DayMarketNavHistorical", 1);

    assert.fieldEquals("DayMarketNav", NAV_ID, "marketId", ADDR_KERNEL.toHexString());
    // A LAST-INDEX, not a count: born together with entry 0, so total == field + 1.
    // If this ever reads "1" the isNew branch in writeMarketNav has inverted and
    // entry 0 does not exist.

    // Zero supply => _scaleAssetClaims returns the zero struct for ANY input,
    // including one whole share. So all FIFTEEN legs are 0 by the contract's own
    // arithmetic, not because the handler failed to read them — which is why creation
    // spends no eth_call on them at all.
    assertSharePriceAllZero("DayMarketNav", NAV_ID, "seniorTranche");
    assertSharePriceAllZero("DayMarketNav", NAV_ID, "juniorTranche");
    assertSharePriceAllZero("DayMarketNav", NAV_ID, "liquidityTranche");
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
    assertSharePriceAllZero("DayMarketNavHistorical", id, "seniorTranche");
    assertSharePriceAllZero("DayMarketNavHistorical", id, "liquidityTranche");
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
