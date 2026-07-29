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
import { generateMarketId, generateMarketBlockRecordId } from "../../src/utils";

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
// These streams are BLOCK-KEYED now: one row per (market, block). ENTRY0 is the row
// for the fixture's default block; ENTRY1 is the NEXT block's row.
const ENTRY0 = generateMarketBlockRecordId(KERNEL, BLOCK_NUMBER);
const ENTRY1 = generateMarketBlockRecordId(
  KERNEL,
  BLOCK_NUMBER.plus(BigInt.fromI32(1))
);

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

  test("reinvested records realised shares/assets into its block's row", () => {
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
    assert.fieldEquals("DayLiquidityPremiumReinvestedHistory", ENTRY0, "shares", "55");
    assert.fieldEquals("DayLiquidityPremiumReinvestedHistory", ENTRY0, "assets", "66");
    assert.fieldEquals("DayLiquidityPremiumReinvestedHistory", ENTRY0, "marketId", KERNEL);
  });

  test("failed records the attempt/bound/revertData into its block's row", () => {
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
    assert.fieldEquals("DayLiquidityPremiumReinvestmentFailedHistory", ENTRY0, "shares", "77");
    assert.fieldEquals("DayLiquidityPremiumReinvestmentFailedHistory", ENTRY0, "assets", "88");
    assert.fieldEquals(
      "DayLiquidityPremiumReinvestmentFailedHistory",
      ENTRY0,
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
  });
});
