import {
  assert,
  describe,
  test,
  clearStore,
  beforeEach,
} from "matchstick-as/assembly/index";
import { BigInt } from "@graphprotocol/graph-ts";
import { handleMarketDeploymentCompleted } from "../../src/royco-factory";
import {
  handleMultiAssetDeposit,
  handleMultiAssetRedeem,
} from "../../src/royco-liquidity-tranche";
import {
  MultiAssetDeposit as LiquidityMultiAssetDeposit,
  MultiAssetRedeem as LiquidityMultiAssetRedeem,
} from "../../generated/templates/RoycoLiquidityTranche/RoycoLiquidityTranche";
import {
  DeploymentResult,
  createMarketDeploymentCompletedEvent,
} from "../builders/factory";
import {
  createMultiAssetDepositEvent,
  createMultiAssetRedeemEvent,
} from "../builders/tranche";
import { Claims } from "../builders/shared";
import { DayMarketFixture, mockDayMarket } from "../mocks";
import { ctx, EventContext } from "../helpers/event";
import {
  ADDR_ALICE,
  ADDR_BOB,
  ADDR_DEPLOYER,
  ADDR_KERNEL,
  ADDR_LIQUIDITY,
  ADDR_TEMPLATE,
  BLOCK_TIMESTAMP,
  LOG_INDEX,
  TX_HASH,
} from "../helpers/constants";
import { generateId, generateMarketId, generateVaultId } from "../../src/utils";

// =============================================================================
// handleMultiAssetDeposit / handleMultiAssetRedeem — LIQUIDITY-TRANCHE-ONLY.
//
// ACTIVITY rows: immutable, id = <CHAIN>_<TX>_<LOG_INDEX>, no cursor. The row is
// the sole on-subgraph record of the asset legs (the underlying ERC20s are
// unindexed), but it owns NO share/position/supply — the mint/burn Transfer at a
// lower log index does. `graph build` sees none of this.
// =============================================================================

const LIQUIDITY = ADDR_LIQUIDITY.toHexString();
const KERNEL = ADDR_KERNEL.toHexString();

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

/** A Claims whose five members are distinct, so a field transposition shows. */
function distinctClaims(): Claims {
  const c = new Claims();
  c.stAssets = BigInt.fromI32(100);
  c.jtAssets = BigInt.fromI32(200);
  c.ltAssets = BigInt.fromI32(300);
  c.stShares = BigInt.fromI32(400);
  c.nav = BigInt.fromI32(500);
  return c;
}

describe("handleMultiAssetDeposit", () => {
  beforeEach(() => {
    clearStore();
  });

  test("writes one activity row carrying every event field", () => {
    deployMarket();

    const c = ctx();
    c.emitter = ADDR_LIQUIDITY;
    handleMultiAssetDeposit(
      createMultiAssetDepositEvent<LiquidityMultiAssetDeposit>(
        ADDR_ALICE, // caller (initiator)
        ADDR_BOB, // receiver (share-side)
        BigInt.fromI32(11), // stAssets
        BigInt.fromI32(22), // quoteAssets
        BigInt.fromI32(33), // ltAssetsMinted
        BigInt.fromI32(44), // shares
        c
      )
    );

    const id = generateId(TX_HASH.toHexString(), LOG_INDEX);
    assert.entityCount("DayMultiAssetDepositActivity", 1);
    assert.fieldEquals("DayMultiAssetDepositActivity", id, "marketId", KERNEL);
    assert.fieldEquals(
      "DayMultiAssetDepositActivity",
      id,
      "marketRefId",
      generateMarketId(KERNEL)
    );
    assert.fieldEquals("DayMultiAssetDepositActivity", id, "vaultAddress", LIQUIDITY);
    assert.fieldEquals(
      "DayMultiAssetDepositActivity",
      id,
      "vaultId",
      generateVaultId(LIQUIDITY)
    );
    // Share-side party is the RECEIVER; caller is a separate column.
    assert.fieldEquals(
      "DayMultiAssetDepositActivity",
      id,
      "accountAddress",
      ADDR_BOB.toHexString()
    );
    assert.fieldEquals(
      "DayMultiAssetDepositActivity",
      id,
      "callerAddress",
      ADDR_ALICE.toHexString()
    );
    assert.fieldEquals("DayMultiAssetDepositActivity", id, "seniorTrancheAssets", "11");
    assert.fieldEquals("DayMultiAssetDepositActivity", id, "quoteAssets", "22");
    assert.fieldEquals(
      "DayMultiAssetDepositActivity",
      id,
      "liquidityTrancheAssetsMinted",
      "33"
    );
    assert.fieldEquals("DayMultiAssetDepositActivity", id, "shares", "44");
    assert.fieldEquals(
      "DayMultiAssetDepositActivity",
      id,
      "createdAtBlockTimestamp",
      BLOCK_TIMESTAMP.toString()
    );
  });

  test("writes no share/position/supply — the mint's Transfer owns those", () => {
    deployMarket();

    const c = ctx();
    c.emitter = ADDR_LIQUIDITY;
    handleMultiAssetDeposit(
      createMultiAssetDepositEvent<LiquidityMultiAssetDeposit>(
        ADDR_ALICE,
        ADDR_BOB,
        BigInt.fromI32(11),
        BigInt.fromI32(22),
        BigInt.fromI32(33),
        BigInt.fromI32(44),
        c
      )
    );

    assert.entityCount("DayPositionState", 0);
    assert.entityCount("GlobalTokenTransfer", 0);
    assert.fieldEquals(
      "DayVaultState",
      generateVaultId(LIQUIDITY),
      "sharesTotalSupply",
      "0"
    );
  });

  test("two deposits in one tx get distinct ids by log index", () => {
    // The activity id keys on (tx, logIndex); a shared tx with two multi-asset
    // deposits must not collide on an immutable entity.
    deployMarket();

    const c1 = ctx();
    c1.emitter = ADDR_LIQUIDITY;
    handleMultiAssetDeposit(
      createMultiAssetDepositEvent<LiquidityMultiAssetDeposit>(
        ADDR_ALICE,
        ADDR_BOB,
        BigInt.fromI32(11),
        BigInt.fromI32(22),
        BigInt.fromI32(33),
        BigInt.fromI32(44),
        c1
      )
    );

    const c2 = ctx();
    c2.emitter = ADDR_LIQUIDITY;
    c2.logIndex = LOG_INDEX.plus(BigInt.fromI32(1));
    handleMultiAssetDeposit(
      createMultiAssetDepositEvent<LiquidityMultiAssetDeposit>(
        ADDR_ALICE,
        ADDR_BOB,
        BigInt.fromI32(55),
        BigInt.fromI32(66),
        BigInt.fromI32(77),
        BigInt.fromI32(88),
        c2
      )
    );

    assert.entityCount("DayMultiAssetDepositActivity", 2);
    assert.fieldEquals(
      "DayMultiAssetDepositActivity",
      generateId(TX_HASH.toHexString(), LOG_INDEX.plus(BigInt.fromI32(1))),
      "shares",
      "88"
    );
  });

  test("an emit from a non-vault address is a no-op", () => {
    deployMarket();

    const c = ctx();
    c.emitter = ADDR_ALICE; // not a deployed vault
    handleMultiAssetDeposit(
      createMultiAssetDepositEvent<LiquidityMultiAssetDeposit>(
        ADDR_ALICE,
        ADDR_BOB,
        BigInt.fromI32(11),
        BigInt.fromI32(22),
        BigInt.fromI32(33),
        BigInt.fromI32(44),
        c
      )
    );

    assert.entityCount("DayMultiAssetDepositActivity", 0);
  });
});

describe("handleMultiAssetRedeem", () => {
  beforeEach(() => {
    clearStore();
  });

  test("writes one activity row; the claims quintuple maps field-for-field", () => {
    // The claim members are distinct here so a transposition surfaces. In
    // production stClaims is a SENIOR claim, so stShares/ltAssets are 0 — but the
    // handler copies verbatim, so the mapping is what this pins.
    deployMarket();

    const c = ctx();
    c.emitter = ADDR_LIQUIDITY;
    handleMultiAssetRedeem(
      createMultiAssetRedeemEvent<LiquidityMultiAssetRedeem>(
        ADDR_ALICE, // caller
        ADDR_BOB, // receiver (assets out)
        ADDR_KERNEL, // owner (shares burned) — any distinct addr
        BigInt.fromI32(44), // shares
        distinctClaims(), // stClaims: 100/200/300/400/500
        BigInt.fromI32(99), // quoteAssets
        c
      )
    );

    const id = generateId(TX_HASH.toHexString(), LOG_INDEX);
    assert.entityCount("DayMultiAssetRedeemActivity", 1);
    assert.fieldEquals("DayMultiAssetRedeemActivity", id, "vaultAddress", LIQUIDITY);
    assert.fieldEquals("DayMultiAssetRedeemActivity", id, "marketId", KERNEL);
    // Three distinct parties, each in its own column.
    assert.fieldEquals(
      "DayMultiAssetRedeemActivity",
      id,
      "accountAddress",
      ADDR_KERNEL.toHexString()
    ); // owner
    assert.fieldEquals(
      "DayMultiAssetRedeemActivity",
      id,
      "callerAddress",
      ADDR_ALICE.toHexString()
    );
    assert.fieldEquals(
      "DayMultiAssetRedeemActivity",
      id,
      "receiverAddress",
      ADDR_BOB.toHexString()
    );
    assert.fieldEquals("DayMultiAssetRedeemActivity", id, "shares", "44");
    assert.fieldEquals("DayMultiAssetRedeemActivity", id, "quoteAssets", "99");
    // The quintuple, in order: st/jt/lt assets, st shares, nav.
    assert.fieldEquals("DayMultiAssetRedeemActivity", id, "claimsSeniorTrancheAssets", "100");
    assert.fieldEquals("DayMultiAssetRedeemActivity", id, "claimsJuniorTrancheAssets", "200");
    assert.fieldEquals("DayMultiAssetRedeemActivity", id, "claimsLiquidityTrancheAssets", "300");
    assert.fieldEquals("DayMultiAssetRedeemActivity", id, "claimsSeniorTrancheShares", "400");
    assert.fieldEquals("DayMultiAssetRedeemActivity", id, "claimsNAV", "500");
  });

  test("writes no share/position/supply — the burn's Transfer owns those", () => {
    deployMarket();

    const c = ctx();
    c.emitter = ADDR_LIQUIDITY;
    handleMultiAssetRedeem(
      createMultiAssetRedeemEvent<LiquidityMultiAssetRedeem>(
        ADDR_ALICE,
        ADDR_BOB,
        ADDR_KERNEL,
        BigInt.fromI32(44),
        distinctClaims(),
        BigInt.fromI32(99),
        c
      )
    );

    assert.entityCount("DayPositionState", 0);
    assert.entityCount("GlobalTokenTransfer", 0);
    assert.fieldEquals(
      "DayVaultState",
      generateVaultId(LIQUIDITY),
      "sharesTotalSupply",
      "0"
    );
  });

  test("an emit from a non-vault address is a no-op", () => {
    deployMarket();

    const c = ctx();
    c.emitter = ADDR_ALICE; // not a deployed vault
    handleMultiAssetRedeem(
      createMultiAssetRedeemEvent<LiquidityMultiAssetRedeem>(
        ADDR_ALICE,
        ADDR_BOB,
        ADDR_KERNEL,
        BigInt.fromI32(44),
        distinctClaims(),
        BigInt.fromI32(99),
        c
      )
    );

    assert.entityCount("DayMultiAssetRedeemActivity", 0);
  });
});
