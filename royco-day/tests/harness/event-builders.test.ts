import {
  assert,
  describe,
  test,
} from "matchstick-as/assembly/index";
import { BigInt } from "@graphprotocol/graph-ts";
import {
  createMarketDeploymentCompletedEvent,
  DeploymentResult,
} from "../builders/factory";
import { createTrancheAccountingSyncedEvent } from "../builders/accountant";
import { createRedeemEvent, createMultiAssetRedeemEvent } from "../builders/tranche";
import { Claims, TrancheState } from "../builders/shared";
import { ctx } from "../helpers/event";
import {
  ADDR_ACCOUNTANT,
  ADDR_ALICE,
  ADDR_BOB,
  ADDR_DEPLOYER,
  ADDR_JT_YDM,
  ADDR_JUNIOR,
  ADDR_KERNEL,
  ADDR_LIQUIDITY,
  ADDR_LT_YDM,
  ADDR_SENIOR,
  ADDR_TEMPLATE,
  BLOCK_TIMESTAMP,
  TX_HASH,
} from "../helpers/constants";
import { Redeem as SeniorRedeem } from "../../generated/templates/RoycoSeniorTranche/RoycoSeniorTranche";
import { MultiAssetRedeem } from "../../generated/templates/RoycoLiquidityTranche/RoycoLiquidityTranche";

// =============================================================================
// Round-trip tests: build an event with our builders, then read it back through
// the REAL generated getters.
//
// This is the day-one value of the harness, with zero handlers written. The
// generated bindings encode the ABI contract, so these tests verify that our
// tuple field order matches codegen's decoding, and that every i32-vs-BigInt
// choice is right.
//
// A transposition inside an 18- or 27-field tuple of same-typed values produces
// WRONG DATA WITH NO ERROR. Nothing else catches that. Which is why every field
// below gets a DISTINCT sentinel value — reusing values would make these tests
// pass unconditionally, and that would be theater.
// =============================================================================

describe("MarketDeploymentCompleted builder", () => {
  test("all 8 result components land in the right slots", () => {
    const c = ctx();
    const event = createMarketDeploymentCompletedEvent(
      ADDR_TEMPLATE,
      ADDR_DEPLOYER,
      new DeploymentResult(),
      c
    );

    // Indexed params still occupy their ABI positions.
    assert.addressEquals(event.params.template, ADDR_TEMPLATE);
    assert.addressEquals(event.params.deployer, ADDR_DEPLOYER);

    const r = event.params.result;
    assert.addressEquals(r.seniorTranche, ADDR_SENIOR);
    assert.addressEquals(r.juniorTranche, ADDR_JUNIOR);
    assert.addressEquals(r.liquidityTranche, ADDR_LIQUIDITY);
    assert.addressEquals(r.kernel, ADDR_KERNEL);
    assert.addressEquals(r.accountant, ADDR_ACCOUNTANT);
    assert.stringEquals(r.extras.toHexString(), "0xdeadbeef");
  });

  test("`ydm` is the JUNIOR ydm and `ltYdm` is the liquidity ydm", () => {
    // The ABI names the junior YDM `ydm`, not `jtYdm` — the single easiest
    // transposition in this event, and it would be invisible in production.
    const r = createMarketDeploymentCompletedEvent(
      ADDR_TEMPLATE,
      ADDR_DEPLOYER,
      new DeploymentResult(),
      ctx()
    ).params.result;

    assert.addressEquals(r.ydm, ADDR_JT_YDM);
    assert.addressEquals(r.ltYdm, ADDR_LT_YDM);
  });

  test("applyCtx overrides matchstick's 20-byte default tx hash", () => {
    // Without applyCtx the tx hash is defaultAddressBytes — a 20-byte address.
    // Every historical id and createdAtTransactionHash derives from this.
    const event = createMarketDeploymentCompletedEvent(
      ADDR_TEMPLATE,
      ADDR_DEPLOYER,
      new DeploymentResult(),
      ctx()
    );

    assert.bytesEquals(event.transaction.hash, TX_HASH);
    assert.i32Equals(event.transaction.hash.length, 32);
    assert.bigIntEquals(event.block.timestamp, BLOCK_TIMESTAMP);
  });
});

describe("TrancheAccountingSynced builder", () => {
  test("all 18 TrancheState fields decode to the right getters", () => {
    const s = new TrancheState();
    // One distinct sentinel per index — identical values would hide a swap.
    s.marketState = 1; //  0 uint8 -> i32
    s.stRawNAV = BigInt.fromI32(1001); //  1
    s.jtRawNAV = BigInt.fromI32(1002); //  2
    s.ltRawNAV = BigInt.fromI32(1003); //  3
    s.stEffectiveNAV = BigInt.fromI32(1004); //  4
    s.jtEffectiveNAV = BigInt.fromI32(1005); //  5
    s.jtCoverageImpermanentLoss = BigInt.fromI32(1006); //  6
    s.ltLiquidityPremium = BigInt.fromI32(1007); //  7
    s.stProtocolFee = BigInt.fromI32(1008); //  8
    s.jtProtocolFee = BigInt.fromI32(1009); //  9
    s.ltProtocolFee = BigInt.fromI32(1010); // 10
    s.coverageUtilizationWAD = BigInt.fromI32(1011); // 11
    s.liquidityUtilizationWAD = BigInt.fromI32(1012); // 12
    s.fixedTermEndTimestamp = BigInt.fromI32(1013); // 13 uint32 -> BigInt
    s.minCoverageWAD = BigInt.fromI32(1014); // 14
    s.jtCoinvested = true; // 15
    s.coverageLiquidationUtilizationWAD = BigInt.fromI32(1016); // 16
    s.minLiquidityWAD = BigInt.fromI32(1017); // 17

    const p = createTrancheAccountingSyncedEvent(s, ctx()).params.resultingState;

    assert.i32Equals(p.marketState, 1);
    assert.bigIntEquals(p.stRawNAV, BigInt.fromI32(1001));
    assert.bigIntEquals(p.jtRawNAV, BigInt.fromI32(1002));
    assert.bigIntEquals(p.ltRawNAV, BigInt.fromI32(1003));
    assert.bigIntEquals(p.stEffectiveNAV, BigInt.fromI32(1004));
    assert.bigIntEquals(p.jtEffectiveNAV, BigInt.fromI32(1005));
    assert.bigIntEquals(p.jtCoverageImpermanentLoss, BigInt.fromI32(1006));
    assert.bigIntEquals(p.ltLiquidityPremium, BigInt.fromI32(1007));
    assert.bigIntEquals(p.stProtocolFee, BigInt.fromI32(1008));
    assert.bigIntEquals(p.jtProtocolFee, BigInt.fromI32(1009));
    assert.bigIntEquals(p.ltProtocolFee, BigInt.fromI32(1010));
    assert.bigIntEquals(p.coverageUtilizationWAD, BigInt.fromI32(1011));
    assert.bigIntEquals(p.liquidityUtilizationWAD, BigInt.fromI32(1012));
    assert.bigIntEquals(p.fixedTermEndTimestamp, BigInt.fromI32(1013));
    assert.bigIntEquals(p.minCoverageWAD, BigInt.fromI32(1014));
    assert.booleanEquals(p.jtCoinvested, true);
    assert.bigIntEquals(
      p.coverageLiquidationUtilizationWAD,
      BigInt.fromI32(1016)
    );
    assert.bigIntEquals(p.minLiquidityWAD, BigInt.fromI32(1017));
  });
});

describe("Claims-carrying events", () => {
  test("Redeem: claims at index 2, all 5 fields in order", () => {
    const claims = new Claims();
    claims.stAssets = BigInt.fromI32(2001);
    claims.jtAssets = BigInt.fromI32(2002);
    claims.ltAssets = BigInt.fromI32(2003);
    claims.stShares = BigInt.fromI32(2004);
    claims.nav = BigInt.fromI32(2005);

    const event = createRedeemEvent<SeniorRedeem>(
      ADDR_ALICE,
      ADDR_BOB,
      claims,
      BigInt.fromI32(2099),
      ctx()
    );

    assert.addressEquals(event.params.sender, ADDR_ALICE);
    assert.addressEquals(event.params.receiver, ADDR_BOB);
    assert.bigIntEquals(event.params.shares, BigInt.fromI32(2099));
    assert.bigIntEquals(event.params.claims.stAssets, BigInt.fromI32(2001));
    assert.bigIntEquals(event.params.claims.jtAssets, BigInt.fromI32(2002));
    assert.bigIntEquals(event.params.claims.ltAssets, BigInt.fromI32(2003));
    assert.bigIntEquals(event.params.claims.stShares, BigInt.fromI32(2004));
    assert.bigIntEquals(event.params.claims.nav, BigInt.fromI32(2005));
  });

  test("MultiAssetRedeem: claims at index 4 — AFTER shares, unlike Redeem", () => {
    const claims = new Claims();
    claims.stAssets = BigInt.fromI32(3001);
    claims.jtAssets = BigInt.fromI32(3002);
    claims.ltAssets = BigInt.fromI32(3003);
    claims.stShares = BigInt.fromI32(3004);
    claims.nav = BigInt.fromI32(3005);

    const event = createMultiAssetRedeemEvent<MultiAssetRedeem>(
      ADDR_ALICE,
      ADDR_BOB,
      ADDR_ALICE,
      BigInt.fromI32(3098),
      claims,
      BigInt.fromI32(3099),
      ctx()
    );

    assert.bigIntEquals(event.params.shares, BigInt.fromI32(3098));
    assert.bigIntEquals(event.params.quoteAssets, BigInt.fromI32(3099));
    assert.bigIntEquals(event.params.stClaims.stAssets, BigInt.fromI32(3001));
    assert.bigIntEquals(event.params.stClaims.nav, BigInt.fromI32(3005));
  });
});
