import {
  assert,
  describe,
  test,
  clearStore,
  beforeEach,
} from "matchstick-as/assembly/index";
import { BigInt } from "@graphprotocol/graph-ts";
import { handleMarketDeploymentCompleted } from "../../src/royco-factory";
import { handleProtocolFeeSharesMinted } from "../../src/royco-senior-tranche";
import { handleProtocolFeeSharesMinted as handleJuniorProtocolFee } from "../../src/royco-junior-tranche";
import { handleProtocolFeeSharesMinted as handleLiquidityProtocolFee } from "../../src/royco-liquidity-tranche";
import { ProtocolFeeSharesMinted as SeniorProtocolFee } from "../../generated/templates/RoycoSeniorTranche/RoycoSeniorTranche";
import { ProtocolFeeSharesMinted as JuniorProtocolFee } from "../../generated/templates/RoycoJuniorTranche/RoycoJuniorTranche";
import { ProtocolFeeSharesMinted as LiquidityProtocolFee } from "../../generated/templates/RoycoLiquidityTranche/RoycoLiquidityTranche";
import {
  DeploymentResult,
  createMarketDeploymentCompletedEvent,
} from "../builders/factory";
import { createProtocolFeeSharesMintedEvent } from "../builders/tranche";
import {
  DayMarketFixture,
  mockDayMarket,
  mockConvertToAssets,
  mockConvertToAssetsReverts,
} from "../mocks";
import { Claims } from "../builders/shared";
import { ctx } from "../helpers/event";
import {
  ADDR_ALICE,
  ADDR_DEPLOYER,
  ADDR_FEE_RECIPIENT,
  ADDR_JUNIOR,
  ADDR_KERNEL,
  ADDR_LIQUIDITY,
  ADDR_SENIOR,
  ADDR_TEMPLATE,
  BLOCK_TIMESTAMP,
  TX_HASH_2,
} from "../helpers/constants";
import {
  generateFeeStateId,
  generateFeeStateHistoricalId,
  generateVaultId,
} from "../../src/utils";
import {
  VAULT_MAJOR_TYPE,
  TRANCHE_TYPE_SENIOR,
  TRANCHE_TYPE_JUNIOR,
  TRANCHE_TYPE_LIQUIDITY,
} from "../../src/constants";

// =============================================================================
// handleProtocolFeeSharesMinted, shared across all three tranches.
//
// Writes DayFeeState(+Historical) ONLY — the fee mint's own Transfer already did
// the share/position/supply accounting at a lower log index. `graph build` cannot
// see the double-count, the nav delta/cumulative split, or the cursor.
// =============================================================================

const RECIP = ADDR_FEE_RECIPIENT.toHexString();
const TOTAL = BigInt.fromI32(100_000); // totalTrancheShares — unused by the handler

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

/** The fee row's id for the senior tranche / recipient / protocol stream. */
function seniorFeeId(): string {
  // MARKET-scoped id: the leading discriminator is the bare kernel address, and
  // minorType (senior) separates this tranche's stream within the market.
  return generateFeeStateId(
    ADDR_KERNEL.toHexString(),
    RECIP,
    VAULT_MAJOR_TYPE,
    TRANCHE_TYPE_SENIOR
  );
}

/** A Claims whose nav is `nav`; the other four are distinct so a nav/other mixup shows. */
function claimsWithNav(nav: i32): Claims {
  const c = new Claims();
  c.stAssets = BigInt.fromI32(nav + 1);
  c.jtAssets = BigInt.fromI32(nav + 2);
  c.ltAssets = BigInt.fromI32(nav + 3);
  c.stShares = BigInt.fromI32(nav + 4);
  c.nav = BigInt.fromI32(nav);
  return c;
}

describe("handleProtocolFeeSharesMinted", () => {
  beforeEach(() => {
    clearStore();
  });

  test("first fee opens the stream at entry 0, keyed day + tranche", () => {
    deployMarket();
    const minted = BigInt.fromI32(500);
    // The handler prices the newly minted shares: convertToAssets(minted).nav.
    mockConvertToAssets(ADDR_SENIOR, minted, claimsWithNav(9_000));

    const c = ctx();
    c.emitter = ADDR_SENIOR;
    handleProtocolFeeSharesMinted(
      createProtocolFeeSharesMintedEvent<SeniorProtocolFee>(
        ADDR_FEE_RECIPIENT,
        minted,
        TOTAL,
        c
      )
    );

    const id = seniorFeeId();
    assert.entityCount("DayFeeState", 1);
    assert.fieldEquals("DayFeeState", id, "accountAddress", RECIP);
    assert.fieldEquals("DayFeeState", id, "majorType", "day");
    assert.fieldEquals("DayFeeState", id, "minorType", "senior");
    assert.fieldEquals("DayFeeState", id, "vaultAddress", ADDR_SENIOR.toHexString());
    assert.fieldEquals("DayFeeState", id, "marketId", ADDR_KERNEL.toHexString());
    // The state holds the running totals ONLY, in both denominations.
    assert.fieldEquals("DayFeeState", id, "cumulativeShares", "500");
    assert.fieldEquals("DayFeeState", id, "cumulativeNav", "9000");
    assert.fieldEquals("DayFeeState", id, "lastHistoricalEntryIndex", "0");

    const snapId = generateFeeStateHistoricalId(
      ADDR_KERNEL.toHexString(),
      RECIP,
      VAULT_MAJOR_TYPE,
      TRANCHE_TYPE_SENIOR,
      BigInt.zero()
    );
    assert.entityCount("DayFeeStateHistorical", 1);
    assert.fieldEquals("DayFeeStateHistorical", snapId, "entryIndex", "0");
    // On entry 0 each delta equals its cumulative — the first addend IS the sum.
    assert.fieldEquals("DayFeeStateHistorical", snapId, "shares", "500");
    assert.fieldEquals("DayFeeStateHistorical", snapId, "cumulativeShares", "500");
    assert.fieldEquals("DayFeeStateHistorical", snapId, "nav", "9000");
    assert.fieldEquals("DayFeeStateHistorical", snapId, "cumulativeNav", "9000");
  });

  test("cumulative* ACCUMULATE; historical shares/nav are per-event DELTAS", () => {
    // The core of the delta/cumulative split, in BOTH denominations. A second,
    // smaller fee climbs each cumulative and records its own smaller deltas.
    deployMarket();

    const first = BigInt.fromI32(500);
    mockConvertToAssets(ADDR_SENIOR, first, claimsWithNav(9_000));
    const c1 = ctx();
    c1.emitter = ADDR_SENIOR;
    handleProtocolFeeSharesMinted(
      createProtocolFeeSharesMintedEvent<SeniorProtocolFee>(
        ADDR_FEE_RECIPIENT,
        first,
        TOTAL,
        c1
      )
    );

    const second = BigInt.fromI32(300);
    mockConvertToAssets(ADDR_SENIOR, second, claimsWithNav(2_000));
    const c2 = ctx();
    c2.emitter = ADDR_SENIOR;
    c2.logIndex = BigInt.fromI32(3);
    c2.txHash = TX_HASH_2;
    handleProtocolFeeSharesMinted(
      createProtocolFeeSharesMintedEvent<SeniorProtocolFee>(
        ADDR_FEE_RECIPIENT,
        second,
        TOTAL,
        c2
      )
    );

    const id = seniorFeeId();
    // Both denominations accumulated: 500+300 shares, 9000+2000 nav.
    assert.fieldEquals("DayFeeState", id, "cumulativeShares", "800");
    assert.fieldEquals("DayFeeState", id, "cumulativeNav", "11000");
    assert.fieldEquals("DayFeeState", id, "lastHistoricalEntryIndex", "1");
    assert.entityCount("DayFeeStateHistorical", 2);

    // Entry 1: shares/nav are the DELTAS (300 / 2000), cumulative* the running
    // totals (800 / 11000). An overwrite would show shares==800; a
    // SUM(cumulativeShares) reader would get 1300.
    const snap1 = generateFeeStateHistoricalId(
      ADDR_KERNEL.toHexString(),
      RECIP,
      VAULT_MAJOR_TYPE,
      TRANCHE_TYPE_SENIOR,
      BigInt.fromI32(1)
    );
    assert.fieldEquals("DayFeeStateHistorical", snap1, "shares", "300");
    assert.fieldEquals("DayFeeStateHistorical", snap1, "cumulativeShares", "800");
    assert.fieldEquals("DayFeeStateHistorical", snap1, "nav", "2000");
    assert.fieldEquals("DayFeeStateHistorical", snap1, "cumulativeNav", "11000");
    // Entry 0 still holds its own deltas — untouched by the second event.
    const snap0 = generateFeeStateHistoricalId(
      ADDR_KERNEL.toHexString(),
      RECIP,
      VAULT_MAJOR_TYPE,
      TRANCHE_TYPE_SENIOR,
      BigInt.zero()
    );
    assert.fieldEquals("DayFeeStateHistorical", snap0, "shares", "500");
    assert.fieldEquals("DayFeeStateHistorical", snap0, "cumulativeShares", "500");
    assert.fieldEquals("DayFeeStateHistorical", snap0, "nav", "9000");
    assert.fieldEquals("DayFeeStateHistorical", snap0, "cumulativeNav", "9000");
  });

  test("the fee handler writes NO share/position/supply — the mint's Transfer owns those", () => {
    // A share bump here would double-count: the _mint emitted its own
    // Transfer(0x0 -> recipient) at a lower log index.
    deployMarket();
    const minted = BigInt.fromI32(500);
    mockConvertToAssets(ADDR_SENIOR, minted, claimsWithNav(9_000));

    const c = ctx();
    c.emitter = ADDR_SENIOR;
    handleProtocolFeeSharesMinted(
      createProtocolFeeSharesMintedEvent<SeniorProtocolFee>(
        ADDR_FEE_RECIPIENT,
        minted,
        TOTAL,
        c
      )
    );

    assert.entityCount("DayPositionState", 0);
    assert.entityCount("GlobalTokenTransfer", 0);
    // Vault supply untouched — still the factory's zero seed.
    assert.fieldEquals(
      "DayVaultState",
      generateVaultId(ADDR_SENIOR.toHexString()),
      "sharesTotalSupply",
      "0"
    );
  });

  test("a zero-share fee event is skipped entirely", () => {
    // The contract emits even when 0 shares were minted. That is not a fee — it
    // must not burn an entryIndex on a no-op snapshot.
    deployMarket();

    const c = ctx();
    c.emitter = ADDR_SENIOR;
    handleProtocolFeeSharesMinted(
      createProtocolFeeSharesMintedEvent<SeniorProtocolFee>(
        ADDR_FEE_RECIPIENT,
        BigInt.zero(),
        TOTAL,
        c
      )
    );

    assert.entityCount("DayFeeState", 0);
    assert.entityCount("DayFeeStateHistorical", 0);
  });

  test("a convertToAssets revert books shares exactly and a zero nav delta", () => {
    // The nav is a state-dependent call and can revert (stale oracle, kernel
    // pause). The share count is from the event and stays exact; only that event's
    // nav valuation is lost.
    deployMarket();
    const minted = BigInt.fromI32(500);
    mockConvertToAssetsReverts(ADDR_SENIOR, minted);

    const c = ctx();
    c.emitter = ADDR_SENIOR;
    handleProtocolFeeSharesMinted(
      createProtocolFeeSharesMintedEvent<SeniorProtocolFee>(
        ADDR_FEE_RECIPIENT,
        minted,
        TOTAL,
        c
      )
    );

    const id = seniorFeeId();
    // Shares are exact (from the event); only the nav valuation is lost to 0.
    assert.fieldEquals("DayFeeState", id, "cumulativeShares", "500");
    assert.fieldEquals("DayFeeState", id, "cumulativeNav", "0");
    const snapId = generateFeeStateHistoricalId(
      ADDR_KERNEL.toHexString(),
      RECIP,
      VAULT_MAJOR_TYPE,
      TRANCHE_TYPE_SENIOR,
      BigInt.zero()
    );
    assert.fieldEquals("DayFeeStateHistorical", snapId, "shares", "500");
    assert.fieldEquals("DayFeeStateHistorical", snapId, "cumulativeShares", "500");
    assert.fieldEquals("DayFeeStateHistorical", snapId, "nav", "0");
  });

  test("createdAt is set once and never re-stamped", () => {
    deployMarket();
    const minted = BigInt.fromI32(500);
    mockConvertToAssets(ADDR_SENIOR, minted, claimsWithNav(9_000));

    const c1 = ctx();
    c1.emitter = ADDR_SENIOR;
    handleProtocolFeeSharesMinted(
      createProtocolFeeSharesMintedEvent<SeniorProtocolFee>(
        ADDR_FEE_RECIPIENT,
        minted,
        TOTAL,
        c1
      )
    );

    const second = BigInt.fromI32(300);
    mockConvertToAssets(ADDR_SENIOR, second, claimsWithNav(2_000));
    const c2 = ctx();
    c2.emitter = ADDR_SENIOR;
    c2.logIndex = BigInt.fromI32(3);
    c2.txHash = TX_HASH_2;
    c2.blockTimestamp = BLOCK_TIMESTAMP.plus(BigInt.fromI32(3600));
    handleProtocolFeeSharesMinted(
      createProtocolFeeSharesMintedEvent<SeniorProtocolFee>(
        ADDR_FEE_RECIPIENT,
        second,
        TOTAL,
        c2
      )
    );

    const id = seniorFeeId();
    assert.fieldEquals(
      "DayFeeState",
      id,
      "createdAtBlockTimestamp",
      BLOCK_TIMESTAMP.toString()
    );
    assert.fieldEquals(
      "DayFeeState",
      id,
      "updatedAtBlockTimestamp",
      c2.blockTimestamp.toString()
    );
  });

  test("junior and liquidity share the handler and key by their own vault", () => {
    // The whole reason to run all three: the shared handler binds RoycoSeniorTranche
    // for convertToAssets from a data source whose abis: list is Junior/Liquidity —
    // and that only works because those templates list the Senior ABI (§10.4).
    deployMarket();
    const minted = BigInt.fromI32(700);
    mockConvertToAssets(ADDR_JUNIOR, minted, claimsWithNav(3_300));
    mockConvertToAssets(ADDR_LIQUIDITY, minted, claimsWithNav(4_400));

    const cj = ctx();
    cj.emitter = ADDR_JUNIOR;
    handleJuniorProtocolFee(
      createProtocolFeeSharesMintedEvent<JuniorProtocolFee>(
        ADDR_FEE_RECIPIENT,
        minted,
        TOTAL,
        cj
      )
    );

    const cl = ctx();
    cl.emitter = ADDR_LIQUIDITY;
    handleLiquidityProtocolFee(
      createProtocolFeeSharesMintedEvent<LiquidityProtocolFee>(
        ADDR_FEE_RECIPIENT,
        minted,
        TOTAL,
        cl
      )
    );

    assert.fieldEquals(
      "DayFeeState",
      generateFeeStateId(
        ADDR_KERNEL.toHexString(),
        RECIP,
        VAULT_MAJOR_TYPE,
        TRANCHE_TYPE_JUNIOR
      ),
      "cumulativeNav",
      "3300"
    );
    assert.fieldEquals(
      "DayFeeState",
      generateFeeStateId(
        ADDR_KERNEL.toHexString(),
        RECIP,
        VAULT_MAJOR_TYPE,
        TRANCHE_TYPE_LIQUIDITY
      ),
      "cumulativeNav",
      "4400"
    );
    // Three distinct vault streams for one recipient — no cross-contamination.
    assert.entityCount("DayFeeState", 2);
  });
});
