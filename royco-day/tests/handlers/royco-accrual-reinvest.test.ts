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
  handleJuniorTrancheYieldShareAccrued,
  handleLiquidityTrancheYieldShareAccrued,
} from "../../src/royco-day-accountant";
import {
  handleLiquidityPremiumReinvested,
  handleLiquidityPremiumReinvestmentFailed,
} from "../../src/royco-day-kernel";
import {
  JuniorTrancheYieldShareAccrued,
  LiquidityTrancheYieldShareAccrued,
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
  createTwoUintBytesEvent,
} from "../builders/accountant";
import { DayMarketFixture, mockDayMarket } from "../mocks";
import { ctx, EventContext } from "../helpers/event";
import {
  ADDR_ACCOUNTANT,
  ADDR_DEPLOYER,
  ADDR_KERNEL,
  ADDR_TEMPLATE,
} from "../helpers/constants";
import { generateMarketId, generateMarketRecordId } from "../../src/utils";

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
const ENTRY0 = generateMarketRecordId(KERNEL, BigInt.zero());
const ENTRY1 = generateMarketRecordId(KERNEL, BigInt.fromI32(1));

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

describe("handleJuniorTrancheYieldShareAccrued", () => {
  beforeEach(() => {
    clearStore();
  });

  test("writes entry 0, advances the market's timeWeighted field, bumps the cursor", () => {
    deployMarket();

    handleJuniorTrancheYieldShareAccrued(
      createTwoUintEvent<JuniorTrancheYieldShareAccrued>(
        "jtYieldShareWAD",
        BigInt.fromI32(11),
        "twJTYieldShareAccruedWAD",
        BigInt.fromI32(2200),
        accountantCtx()
      )
    );

    assert.entityCount("DayJuniorTrancheYieldSharesAccruedHistory", 1);
    assert.fieldEquals("DayJuniorTrancheYieldSharesAccruedHistory", ENTRY0, "entryIndex", "0");
    assert.fieldEquals("DayJuniorTrancheYieldSharesAccruedHistory", ENTRY0, "yieldShareWAD", "11");
    assert.fieldEquals(
      "DayJuniorTrancheYieldSharesAccruedHistory",
      ENTRY0,
      "timeWeightedYieldShareAccruedWAD",
      "2200"
    );
    assert.fieldEquals("DayJuniorTrancheYieldSharesAccruedHistory", ENTRY0, "marketId", KERNEL);
    // The un-freeze: the market field tracks the running total (seed was 8101).
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "timeWeightedJuniorTrancheYieldShareAccruedWAD",
      "2200"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "countJuniorTrancheYieldSharesAccruedEntries",
      "1"
    );
  });

  test("a second tick climbs the cursor + market field; entry 0 stays frozen", () => {
    deployMarket();

    handleJuniorTrancheYieldShareAccrued(
      createTwoUintEvent<JuniorTrancheYieldShareAccrued>(
        "jtYieldShareWAD",
        BigInt.fromI32(11),
        "twJTYieldShareAccruedWAD",
        BigInt.fromI32(2200),
        accountantCtx()
      )
    );

    const c2 = accountantCtx();
    c2.logIndex = ctx().logIndex.plus(BigInt.fromI32(2));
    handleJuniorTrancheYieldShareAccrued(
      createTwoUintEvent<JuniorTrancheYieldShareAccrued>(
        "jtYieldShareWAD",
        BigInt.fromI32(7),
        "twJTYieldShareAccruedWAD",
        BigInt.fromI32(2207),
        c2
      )
    );

    assert.entityCount("DayJuniorTrancheYieldSharesAccruedHistory", 2);
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "countJuniorTrancheYieldSharesAccruedEntries",
      "2"
    );
    // Market field now holds the LATEST running total.
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "timeWeightedJuniorTrancheYieldShareAccruedWAD",
      "2207"
    );
    // Entry 1 holds the second tick; entry 0 is untouched.
    assert.fieldEquals("DayJuniorTrancheYieldSharesAccruedHistory", ENTRY1, "yieldShareWAD", "7");
    assert.fieldEquals("DayJuniorTrancheYieldSharesAccruedHistory", ENTRY0, "yieldShareWAD", "11");
  });
});

describe("handleLiquidityTrancheYieldShareAccrued", () => {
  beforeEach(() => {
    clearStore();
  });

  test("writes its OWN entity + timeWeighted field, not the junior twin's", () => {
    // Guards against a copy-paste that writes the junior entity/field.
    deployMarket();

    handleLiquidityTrancheYieldShareAccrued(
      createTwoUintEvent<LiquidityTrancheYieldShareAccrued>(
        "ltYieldShareWAD",
        BigInt.fromI32(33),
        "twLTYieldShareAccruedWAD",
        BigInt.fromI32(4400),
        accountantCtx()
      )
    );

    assert.entityCount("DayLiquidityTrancheYieldSharesAccruedHistory", 1);
    assert.fieldEquals("DayLiquidityTrancheYieldSharesAccruedHistory", ENTRY0, "yieldShareWAD", "33");
    assert.fieldEquals(
      "DayLiquidityTrancheYieldSharesAccruedHistory",
      ENTRY0,
      "timeWeightedYieldShareAccruedWAD",
      "4400"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "timeWeightedLiquidityTrancheYieldShareAccruedWAD",
      "4400"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "countLiquidityTrancheYieldSharesAccruedEntries",
      "1"
    );
    // The junior stream is untouched — the twins do not cross.
    assert.entityCount("DayJuniorTrancheYieldSharesAccruedHistory", 0);
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "timeWeightedJuniorTrancheYieldShareAccruedWAD",
      "8101"
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
    assert.fieldEquals("DayLiquidityPremiumReinvestedHistory", ENTRY0, "shares", "55");
    assert.fieldEquals("DayLiquidityPremiumReinvestedHistory", ENTRY0, "assets", "66");
    assert.fieldEquals("DayLiquidityPremiumReinvestedHistory", ENTRY0, "marketId", KERNEL);
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "countLiquidityPremiumReinvestedEntries",
      "1"
    );
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
    assert.fieldEquals("DayLiquidityPremiumReinvestmentFailedHistory", ENTRY0, "shares", "77");
    assert.fieldEquals("DayLiquidityPremiumReinvestmentFailedHistory", ENTRY0, "assets", "88");
    assert.fieldEquals(
      "DayLiquidityPremiumReinvestmentFailedHistory",
      ENTRY0,
      "revertData",
      "0xdeadbeef"
    );
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "countLiquidityPremiumReinvestmentFailedEntries",
      "1"
    );
  });

  test("the two reinvest streams keep independent cursors", () => {
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
    assert.fieldEquals("DayMarketState", MARKET_ID, "countLiquidityPremiumReinvestedEntries", "1");
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "countLiquidityPremiumReinvestmentFailedEntries",
      "1"
    );
  });
});
