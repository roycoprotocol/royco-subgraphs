import {
  assert,
  describe,
  test,
  clearStore,
  beforeEach,
} from "matchstick-as/assembly/index";
import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { handleMarketDeploymentCompleted } from "../../src/royco-factory";
import {
  handleYieldSharesAccrued,
} from "../../src/royco-day-accountant";
import {
  handleLiquidityPremiumReinvested,
  handleLiquidityPremiumReinvestmentFailed,
} from "../../src/royco-day-kernel";
import {
  YieldSharesAccrued,
} from "../../generated/templates/RoycoDayAccountant/RoycoDayAccountant";
import {
  LiquidityPremiumReinvested,
  LiquidityPremiumReinvestmentFailed,
} from "../../generated/templates/RoycoDayKernel/RoycoDayKernel";
import {
  DeploymentResult,
  createMarketDeploymentCompletedEvent,
} from "../builders/factory";
import {
  createTwoUintEvent,
  createFourUintEvent,
  createTwoUintBytesEvent,
} from "../builders/accountant";
import { DayMarketFixture, mockDayMarket } from "../mocks";
import { ctx, EventContext } from "../helpers/event";
import {
  BLOCK_NUMBER,
  ADDR_ACCOUNTANT,
  ADDR_DEPLOYER,
  ADDR_KERNEL,
  ADDR_TEMPLATE,
} from "../helpers/constants";
import {
  generateMarketId,
  generateMarketBlockRecordId,
  generateMarketRecordId,
} from "../../src/utils";

// =============================================================================
// The four remaining record streams:
//   accountant JuniorTrancheYieldShareAccrued / LiquidityTrancheYieldShareAccrued
//   kernel     LiquidityPremiumReinvested / LiquidityPremiumReinvestmentFailed
//
// The yield-share handlers ALSO advance DayMarketState.timeWeighted*YieldShareAccrued
// WAD — the event carries the running total (it is NOT in TrancheAccountingSynced),
// so this handler is the field's only updater. The fixture seeds those fields to
// 8101 / 8103, so asserting a different value proves the update landed.
// =============================================================================

const KERNEL = ADDR_KERNEL.toHexString();
const MARKET_ID = generateMarketId(KERNEL);
// TWO keying schemes live in this file, deliberately.
//   ENTRY*  — DayYieldSharesAccruedHistory is BLOCK-KEYED: one row per (market, block).
//             ENTRY0 is the fixture block's row, ENTRY1 the NEXT block's.
//   RECORD* — the two reinvest streams keep EVERY event, keyed by entryIndex, so a
//             second event in the SAME block still gets RECORD1.
const ENTRY0 = generateMarketBlockRecordId(KERNEL, BLOCK_NUMBER);
const ENTRY1 = generateMarketBlockRecordId(
  KERNEL,
  BLOCK_NUMBER.plus(BigInt.fromI32(1))
);
const RECORD0 = generateMarketRecordId(KERNEL, BigInt.zero());
const RECORD1 = generateMarketRecordId(KERNEL, BigInt.fromI32(1));

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

/** An event from the ACCOUNTANT — resolveMarketFromAccountant hops KERNEL(). */
function accountantCtx(): EventContext {
  const c = ctx();
  c.emitter = ADDR_ACCOUNTANT;
  return c;
}

/** An event from the KERNEL — the kernel address IS the marketId (direct lookup). */
function kernelCtx(): EventContext {
  const c = ctx();
  c.emitter = ADDR_KERNEL;
  return c;
}

describe("handleYieldSharesAccrued", () => {
  beforeEach(() => {
    clearStore();
  });

  test("one event writes ONE row carrying BOTH tranches, and advances both fields", () => {
    // v1 had two events, two handlers, two entities and two cursors. v2 emits a single
    // YieldSharesAccrued with all four values, so a JT accrual can no longer be
    // recorded without its LPT twin — the drift that was structurally possible before
    // is now impossible.
    deployMarket();

    handleYieldSharesAccrued(
      createFourUintEvent<YieldSharesAccrued>(
        "jtYieldShareWAD",
        BigInt.fromI32(11),
        "twJTYieldShareAccruedWAD",
        BigInt.fromI32(2200),
        "lptYieldShareWAD",
        BigInt.fromI32(33),
        "twLPTYieldShareAccruedWAD",
        BigInt.fromI32(4400),
        accountantCtx()
      )
    );

    assert.entityCount("DayYieldSharesAccruedHistory", 1);
    assert.fieldEquals("DayYieldSharesAccruedHistory", ENTRY0, "marketId", KERNEL);
    // All four values land on their OWN column — distinct sentinels are the only thing
    // separating four same-typed BigInts in one row.
    assert.fieldEquals(
      "DayYieldSharesAccruedHistory",
      ENTRY0,
      "juniorTrancheYieldShareWAD",
      "11"
    );
    assert.fieldEquals(
      "DayYieldSharesAccruedHistory",
      ENTRY0,
      "juniorTrancheTimeWeightedYieldShareAccruedWAD",
      "2200"
    );
    assert.fieldEquals(
      "DayYieldSharesAccruedHistory",
      ENTRY0,
      "liquidityTrancheYieldShareWAD",
      "33"
    );
    assert.fieldEquals(
      "DayYieldSharesAccruedHistory",
      ENTRY0,
      "liquidityTrancheTimeWeightedYieldShareAccruedWAD",
      "4400"
    );
    // The un-freeze: BOTH market fields track their running totals (seeds were
    // 8101 / 8103), advanced in the same write.
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "timeWeightedJuniorTrancheYieldShareAccruedWAD",
      "2200"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "timeWeightedLiquidityTrancheYieldShareAccruedWAD",
      "4400"
    );
  });

  test("a second tick in a NEW BLOCK gets its own row; the first block's row stays frozen", () => {
    deployMarket();

    handleYieldSharesAccrued(
      createFourUintEvent<YieldSharesAccrued>(
        "jtYieldShareWAD",
        BigInt.fromI32(11),
        "twJTYieldShareAccruedWAD",
        BigInt.fromI32(2200),
        "lptYieldShareWAD",
        BigInt.fromI32(33),
        "twLPTYieldShareAccruedWAD",
        BigInt.fromI32(4400),
        accountantCtx()
      )
    );

    // A NEW BLOCK, not just a later log index: within one block the second tick would
    // collapse into the first row (that is asserted separately below).
    const c2 = accountantCtx();
    c2.blockNumber = BLOCK_NUMBER.plus(BigInt.fromI32(1));
    handleYieldSharesAccrued(
      createFourUintEvent<YieldSharesAccrued>(
        "jtYieldShareWAD",
        BigInt.fromI32(7),
        "twJTYieldShareAccruedWAD",
        BigInt.fromI32(2207),
        "lptYieldShareWAD",
        BigInt.fromI32(9),
        "twLPTYieldShareAccruedWAD",
        BigInt.fromI32(4409),
        c2
      )
    );

    assert.entityCount("DayYieldSharesAccruedHistory", 2);
    // Market fields hold the LATEST running totals.
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "timeWeightedJuniorTrancheYieldShareAccruedWAD",
      "2207"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "timeWeightedLiquidityTrancheYieldShareAccruedWAD",
      "4409"
    );
    // Entry 1 holds the second tick; entry 0 is untouched (immutable).
    assert.fieldEquals(
      "DayYieldSharesAccruedHistory",
      ENTRY1,
      "juniorTrancheYieldShareWAD",
      "7"
    );
    assert.fieldEquals(
      "DayYieldSharesAccruedHistory",
      ENTRY0,
      "juniorTrancheYieldShareWAD",
      "11"
    );
    assert.fieldEquals(
      "DayYieldSharesAccruedHistory",
      ENTRY0,
      "liquidityTrancheYieldShareWAD",
      "33"
    );
  });
});

describe("handleLiquidityPremiumReinvested / …ReinvestmentFailed", () => {
  beforeEach(() => {
    clearStore();
  });

  test("reinvested records realised shares/assets at entry 0 + bumps its cursor", () => {
    deployMarket();

    handleLiquidityPremiumReinvested(
      createTwoUintEvent<LiquidityPremiumReinvested>(
        "stSharesReinvested",
        BigInt.fromI32(55),
        "ltAssetsMinted",
        BigInt.fromI32(66),
        kernelCtx()
      )
    );

    assert.entityCount("DayLiquidityPremiumReinvestedHistory", 1);
    assert.fieldEquals("DayLiquidityPremiumReinvestedHistory", RECORD0, "shares", "55");
    assert.fieldEquals("DayLiquidityPremiumReinvestedHistory", RECORD0, "assets", "66");
    assert.fieldEquals("DayLiquidityPremiumReinvestedHistory", RECORD0, "marketId", KERNEL);
  });

  test("failed records the attempt/bound/revertData at entry 0 + bumps its cursor", () => {
    deployMarket();

    handleLiquidityPremiumReinvestmentFailed(
      createTwoUintBytesEvent<LiquidityPremiumReinvestmentFailed>(
        "stSharesToReinvest",
        BigInt.fromI32(77),
        "minLTAssetsOut",
        BigInt.fromI32(88),
        "revertData",
        Bytes.fromHexString("0xdeadbeef"),
        kernelCtx()
      )
    );

    assert.entityCount("DayLiquidityPremiumReinvestmentFailedHistory", 1);
    assert.fieldEquals("DayLiquidityPremiumReinvestmentFailedHistory", RECORD0, "shares", "77");
    assert.fieldEquals("DayLiquidityPremiumReinvestmentFailedHistory", RECORD0, "assets", "88");
    assert.fieldEquals(
      "DayLiquidityPremiumReinvestmentFailedHistory",
      RECORD0,
      "revertData",
      "0xdeadbeef"
    );
  });

  test("the two reinvest streams stay independent", () => {
    // A success and a failure in the same market each open their own stream at 0.
    deployMarket();

    handleLiquidityPremiumReinvested(
      createTwoUintEvent<LiquidityPremiumReinvested>(
        "stSharesReinvested",
        BigInt.fromI32(55),
        "ltAssetsMinted",
        BigInt.fromI32(66),
        kernelCtx()
      )
    );
    const c2 = kernelCtx();
    c2.logIndex = ctx().logIndex.plus(BigInt.fromI32(1));
    handleLiquidityPremiumReinvestmentFailed(
      createTwoUintBytesEvent<LiquidityPremiumReinvestmentFailed>(
        "stSharesToReinvest",
        BigInt.fromI32(77),
        "minLTAssetsOut",
        BigInt.fromI32(88),
        "revertData",
        Bytes.fromHexString("0x01"),
        c2
      )
    );

    assert.entityCount("DayLiquidityPremiumReinvestedHistory", 1);
    assert.entityCount("DayLiquidityPremiumReinvestmentFailedHistory", 1);
    // Separate cursors: one event each, so BOTH sit at 1 rather than one reaching 2.
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "countLiquidityPremiumReinvestedEntries",
      "1"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "countLiquidityPremiumReinvestmentFailedEntries",
      "1"
    );
  });

  test("two FAILURES in ONE block get two rows, each keeping its own revertData", () => {
    // The strongest case for not collapsing this stream. A block can hold a failed
    // attempt and a later retry; collapsed, the row would keep only the last reason and
    // the first failure would vanish — exactly the data you need to debug a stuck
    // reinvestment. Both events share a block and differ only in logIndex.
    deployMarket();

    handleLiquidityPremiumReinvestmentFailed(
      createTwoUintBytesEvent<LiquidityPremiumReinvestmentFailed>(
        "stSharesToReinvest",
        BigInt.fromI32(11),
        "minLTAssetsOut",
        BigInt.fromI32(12),
        "revertData",
        Bytes.fromHexString("0xaaaa"),
        kernelCtx()
      )
    );

    const c2 = kernelCtx();
    c2.logIndex = ctx().logIndex.plus(BigInt.fromI32(5));
    handleLiquidityPremiumReinvestmentFailed(
      createTwoUintBytesEvent<LiquidityPremiumReinvestmentFailed>(
        "stSharesToReinvest",
        BigInt.fromI32(33),
        "minLTAssetsOut",
        BigInt.fromI32(34),
        "revertData",
        Bytes.fromHexString("0xbbbb"),
        c2
      )
    );

    assert.entityCount("DayLiquidityPremiumReinvestmentFailedHistory", 2);
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "countLiquidityPremiumReinvestmentFailedEntries",
      "2"
    );
    // Both reasons survive. Under collapsing, 0xaaaa would be gone.
    assert.fieldEquals(
      "DayLiquidityPremiumReinvestmentFailedHistory",
      RECORD0,
      "revertData",
      "0xaaaa"
    );
    assert.fieldEquals("DayLiquidityPremiumReinvestmentFailedHistory", RECORD0, "shares", "11");
    assert.fieldEquals(
      "DayLiquidityPremiumReinvestmentFailedHistory",
      RECORD1,
      "revertData",
      "0xbbbb"
    );
    assert.fieldEquals("DayLiquidityPremiumReinvestmentFailedHistory", RECORD1, "shares", "33");
  });

  test("two REINVESTS in ONE block get two rows — amounts are never fused", () => {
    // Same-block, entryIndex-separated. Merged, `shares` would read 130 and the two
    // distinct reinvestments would be indistinguishable from one large one.
    deployMarket();

    handleLiquidityPremiumReinvested(
      createTwoUintEvent<LiquidityPremiumReinvested>(
        "stSharesReinvested",
        BigInt.fromI32(50),
        "ltAssetsMinted",
        BigInt.fromI32(60),
        kernelCtx()
      )
    );

    const c2 = kernelCtx();
    c2.logIndex = ctx().logIndex.plus(BigInt.fromI32(7));
    handleLiquidityPremiumReinvested(
      createTwoUintEvent<LiquidityPremiumReinvested>(
        "stSharesReinvested",
        BigInt.fromI32(80),
        "ltAssetsMinted",
        BigInt.fromI32(90),
        c2
      )
    );

    assert.entityCount("DayLiquidityPremiumReinvestedHistory", 2);
    assert.fieldEquals("DayMarketState", MARKET_ID, "countLiquidityPremiumReinvestedEntries", "2");
    assert.fieldEquals("DayLiquidityPremiumReinvestedHistory", RECORD0, "shares", "50");
    assert.fieldEquals("DayLiquidityPremiumReinvestedHistory", RECORD0, "assets", "60");
    assert.fieldEquals("DayLiquidityPremiumReinvestedHistory", RECORD1, "shares", "80");
    assert.fieldEquals("DayLiquidityPremiumReinvestedHistory", RECORD1, "assets", "90");
  });
});
