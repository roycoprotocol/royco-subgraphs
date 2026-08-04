import {
  assert,
  describe,
  test,
  clearStore,
  beforeEach,
  createMockedFunction,
} from "matchstick-as/assembly/index";
import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { handleMarketDeploymentCompleted } from "../../src/royco-factory";
import {
  handleYieldSharesAccrued,
} from "../../src/royco-day-accountant";
import {
  handleLiquidityPremiumReinvested,
  handleLiquidityPremiumReinvestmentFailed,
  handlePostOpTrancheAccountingSynced,
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
import { createPostOpSyncEvent } from "../builders/kernel";
import { TrancheState } from "../builders/shared";
import {
  AccountantState,
  DayMarketFixture,
  mockAccountantGetState,
  mockDayMarket,
} from "../mocks";
import { ctx, EventContext } from "../helpers/event";
import {
  BLOCK_NUMBER,
  ADDR_ACCOUNTANT,
  ADDR_DEPLOYER,
  ADDR_KERNEL,
  ADDR_TEMPLATE,
} from "../helpers/constants";
import {
  generateMarketBlockRecordId,
  generateMarketId,
  generateMarketRecordId,
} from "../../src/utils";
import { ROYCO_DAY_ACCOUNTANT__GET_STATE } from "../generated/abi-signatures";

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
// ONE keying scheme now: all three streams in this file keep EVERY event as its own
// immutable row, keyed by entryIndex off a DayMarketState.count*Entries cursor. A second
// event in the SAME block still gets RECORD1 — nothing here collapses.
const RECORD0 = generateMarketRecordId(KERNEL, BigInt.zero());
const RECORD1 = generateMarketRecordId(KERNEL, BigInt.fromI32(1));
const ACCOUNTING_ID = generateMarketBlockRecordId(KERNEL, BLOCK_NUMBER);
const UINT256_MAX =
  "115792089237316195423570985008687907853269984665640564039457584007913129639935";

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

function recordPreTailSync(
  seniorTrancheEffectiveNAV: BigInt,
  minLiquidityWAD: BigInt,
  liquidityTrancheRawNAV: BigInt,
  liquidityUtilizationWAD: BigInt
): void {
  const state = new TrancheState();
  state.collateralNAV = BigInt.fromI32(101);
  state.lptRawNAV = liquidityTrancheRawNAV;
  state.stEffectiveNAV = seniorTrancheEffectiveNAV;
  state.jtEffectiveNAV = BigInt.fromI32(102);
  state.stProtocolFee = BigInt.fromI32(103);
  state.liquidityUtilizationWAD = liquidityUtilizationWAD;
  state.minLiquidityWAD = minLiquidityWAD;
  handlePostOpTrancheAccountingSynced(
    createPostOpSyncEvent(0, state, kernelCtx())
  );
}

function recordSuccessfulReinvestment(postTailLPTRawNAV: BigInt): void {
  const accountantState = new AccountantState();
  accountantState.lastLPTRawNAV = postTailLPTRawNAV;
  mockAccountantGetState(ADDR_ACCOUNTANT, accountantState);

  const c = kernelCtx();
  c.logIndex = c.logIndex.plus(BigInt.fromI32(1));
  handleLiquidityPremiumReinvested(
    createTwoUintEvent<LiquidityPremiumReinvested>(
      "stSharesReinvested",
      BigInt.fromI32(55),
      "ltAssetsMinted",
      BigInt.fromI32(66),
      c
    )
  );
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
    assert.fieldEquals("DayYieldSharesAccruedHistory", RECORD0, "marketId", KERNEL);
    // All four values land on their OWN column — distinct sentinels are the only thing
    // separating four same-typed BigInts in one row.
    assert.fieldEquals(
      "DayYieldSharesAccruedHistory",
      RECORD0,
      "juniorTrancheYieldShareWAD",
      "11"
    );
    assert.fieldEquals(
      "DayYieldSharesAccruedHistory",
      RECORD0,
      "juniorTrancheTimeWeightedYieldShareAccruedWAD",
      "2200"
    );
    assert.fieldEquals(
      "DayYieldSharesAccruedHistory",
      RECORD0,
      "liquidityTrancheYieldShareWAD",
      "33"
    );
    assert.fieldEquals(
      "DayYieldSharesAccruedHistory",
      RECORD0,
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

  test("a second tick gets its OWN row; the first is immutable and stays frozen", () => {
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
      RECORD1,
      "juniorTrancheYieldShareWAD",
      "7"
    );
    assert.fieldEquals(
      "DayYieldSharesAccruedHistory",
      RECORD0,
      "juniorTrancheYieldShareWAD",
      "11"
    );
    assert.fieldEquals(
      "DayYieldSharesAccruedHistory",
      RECORD0,
      "liquidityTrancheYieldShareWAD",
      "33"
    );
  });
});

describe("handleLiquidityPremiumReinvested / …ReinvestmentFailed", () => {
  beforeEach(() => {
    clearStore();
  });

  test("success reconciles the pre-tail sync row to the committed post-tail LPT accounting", () => {
    deployMarket();
    // The sync packet is emitted before the tail: raw NAV 2 and an intentionally stale
    // utilization 99. The reinvestment's final accountant checkpoint is raw NAV 3.
    recordPreTailSync(
      BigInt.fromI32(7),
      BigInt.fromI32(2),
      BigInt.fromI32(2),
      BigInt.fromI32(99)
    );
    recordSuccessfulReinvestment(BigInt.fromI32(3));

    // Contract rounding is CEIL: ceil(7 * 2 / 3) = 5.
    assert.fieldEquals(
      "DayTrancheAccountingSyncedHistory",
      ACCOUNTING_ID,
      "liquidityTrancheRawNAV",
      "3"
    );
    assert.fieldEquals(
      "DayTrancheAccountingSyncedHistory",
      ACCOUNTING_ID,
      "liquidityUtilizationWAD",
      "5"
    );
    assert.fieldEquals("DayMarketState", MARKET_ID, "liquidityTrancheRawNAV", "3");
    assert.fieldEquals("DayMarketState", MARKET_ID, "liquidityUtilizationWAD", "5");

    // Only the two tail-sensitive fields move. The row remains the real post-op sync,
    // preserving its operation, NAV and per-sync fee rather than becoming a preview.
    assert.entityCount("DayTrancheAccountingSyncedHistory", 1);
    assert.fieldEquals(
      "DayTrancheAccountingSyncedHistory",
      ACCOUNTING_ID,
      "syncType",
      "postOp"
    );
    assert.fieldEquals(
      "DayTrancheAccountingSyncedHistory",
      ACCOUNTING_ID,
      "operation",
      "stDeposit"
    );
    assert.fieldEquals(
      "DayTrancheAccountingSyncedHistory",
      ACCOUNTING_ID,
      "collateralNAV",
      "101"
    );
    assert.fieldEquals(
      "DayTrancheAccountingSyncedHistory",
      ACCOUNTING_ID,
      "seniorTrancheProtocolFee",
      "103"
    );
  });

  test("post-tail liquidity utilization preserves the contract's zero sentinels", () => {
    // No senior NAV => 0 even when raw NAV is also zero.
    deployMarket();
    recordPreTailSync(
      BigInt.zero(),
      BigInt.fromI32(2),
      BigInt.fromI32(9),
      BigInt.fromI32(99)
    );
    recordSuccessfulReinvestment(BigInt.zero());
    assert.fieldEquals(
      "DayTrancheAccountingSyncedHistory",
      ACCOUNTING_ID,
      "liquidityUtilizationWAD",
      "0"
    );

    // No minimum liquidity requirement => 0.
    clearStore();
    deployMarket();
    recordPreTailSync(
      BigInt.fromI32(7),
      BigInt.zero(),
      BigInt.fromI32(9),
      BigInt.fromI32(99)
    );
    recordSuccessfulReinvestment(BigInt.zero());
    assert.fieldEquals(
      "DayTrancheAccountingSyncedHistory",
      ACCOUNTING_ID,
      "liquidityUtilizationWAD",
      "0"
    );

    // A positive requirement against zero inventory is effectively infinite.
    clearStore();
    deployMarket();
    recordPreTailSync(
      BigInt.fromI32(7),
      BigInt.fromI32(2),
      BigInt.fromI32(9),
      BigInt.fromI32(99)
    );
    recordSuccessfulReinvestment(BigInt.zero());
    assert.fieldEquals(
      "DayTrancheAccountingSyncedHistory",
      ACCOUNTING_ID,
      "liquidityUtilizationWAD",
      UINT256_MAX
    );
  });

  test("a reverting post-tail checkpoint keeps the sync packet and does not stall", () => {
    deployMarket();
    recordPreTailSync(
      BigInt.fromI32(7),
      BigInt.fromI32(2),
      BigInt.fromI32(11),
      BigInt.fromI32(13)
    );
    createMockedFunction(
      ADDR_ACCOUNTANT,
      "getState",
      ROYCO_DAY_ACCOUNTANT__GET_STATE
    )
      .withArgs([])
      .reverts();

    const c = kernelCtx();
    c.logIndex = c.logIndex.plus(BigInt.fromI32(1));
    handleLiquidityPremiumReinvested(
      createTwoUintEvent<LiquidityPremiumReinvested>(
        "stSharesReinvested",
        BigInt.fromI32(55),
        "ltAssetsMinted",
        BigInt.fromI32(66),
        c
      )
    );

    assert.fieldEquals(
      "DayTrancheAccountingSyncedHistory",
      ACCOUNTING_ID,
      "liquidityTrancheRawNAV",
      "11"
    );
    assert.fieldEquals(
      "DayTrancheAccountingSyncedHistory",
      ACCOUNTING_ID,
      "liquidityUtilizationWAD",
      "13"
    );
    // The record stream and cursor still advance even though the optional refresh failed.
    assert.entityCount("DayLiquidityPremiumReinvestedHistory", 1);
    assert.fieldEquals(
      "DayMarketState",
      MARKET_ID,
      "countLiquidityPremiumReinvestedEntries",
      "1"
    );
  });

  test("a failed reinvestment leaves the preceding accounting packet unchanged", () => {
    deployMarket();
    recordPreTailSync(
      BigInt.fromI32(7),
      BigInt.fromI32(2),
      BigInt.fromI32(11),
      BigInt.fromI32(13)
    );

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

    assert.fieldEquals(
      "DayTrancheAccountingSyncedHistory",
      ACCOUNTING_ID,
      "liquidityTrancheRawNAV",
      "11"
    );
    assert.fieldEquals(
      "DayTrancheAccountingSyncedHistory",
      ACCOUNTING_ID,
      "liquidityUtilizationWAD",
      "13"
    );
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
