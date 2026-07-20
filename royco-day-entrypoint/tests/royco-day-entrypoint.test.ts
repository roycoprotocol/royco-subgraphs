import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  assert,
  beforeEach,
  clearStore,
  createMockedFunction,
  describe,
  newMockEvent,
  test,
} from "matchstick-as/assembly/index";
import {
  DepositRequested,
  DepositExecuted,
  DepositRequestCancelled,
  RedemptionRequested,
  RedemptionExecuted,
  RedemptionRequestCancelled,
  TrancheConfigUpdated,
} from "../generated/RoycoDayEntryPoint/RoycoDayEntryPoint";
import {
  handleDepositRequested,
  handleDepositExecuted,
  handleDepositRequestCancelled,
  handleRedemptionRequested,
  handleRedemptionExecuted,
  handleRedemptionRequestCancelled,
  handleTrancheConfigUpdated,
} from "../src/royco-day-entrypoint";
import { generateEntryPointRequestId, generateExecutionId } from "../src/utils";

const ENTITY = "DayEntryPointRequest";

// Emit from 0x0: config/entrypoint/networks/mainnet.json maps the placeholder
// 0x0 -> version 1, so getEntryPointVersion recognises it. When the real address
// is deployed, update the network config AND this constant together.
const ENTRY_POINT = Address.zero();
const TRANCHE = Address.fromString("0x0000000000000000000000000000000000000051");
const ASSET = Address.fromString("0x00000000000000000000000000000000000000a5");
const ALICE = Address.fromString("0x00000000000000000000000000000000000000e1");
const BOB = Address.fromString("0x00000000000000000000000000000000000000e2");
const N1 = BigInt.fromI32(1);
const EXEC_AT = BigInt.fromI32(1_700_000_100);

function reqId(nonce: BigInt): string {
  return generateEntryPointRequestId(ENTRY_POINT.toHexString(), nonce);
}

// getOrCreateState resolves the deposit token via tranche.asset(); mock it.
function mockAsset(): void {
  createMockedFunction(TRANCHE, "asset", "asset():(address)").returns([
    ethereum.Value.fromAddress(ASSET),
  ]);
}

function uint(v: BigInt): ethereum.Value {
  return ethereum.Value.fromUnsignedBigInt(v);
}
// uint8/16/24 decode to ValueKind.UINT — use fromUnsignedBigInt, not fromI32.
function uintSmall(v: i32): ethereum.Value {
  return ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(v));
}
function param(name: string, v: ethereum.Value): ethereum.EventParam {
  return new ethereum.EventParam(name, v);
}
function claims(st: i32, jt: i32, lt: i32, stShares: i32, nav: i32): ethereum.Value {
  return ethereum.Value.fromTuple(
    changetype<ethereum.Tuple>([
      uint(BigInt.fromI32(st)),
      uint(BigInt.fromI32(jt)),
      uint(BigInt.fromI32(lt)),
      uint(BigInt.fromI32(stShares)),
      uint(BigInt.fromI32(nav)),
    ])
  );
}
// Attach params and emit from the entry point singleton.
function mock<T extends ethereum.Event>(e: T, params: ethereum.EventParam[]): T {
  e.parameters = params;
  e.address = ENTRY_POINT;
  return e;
}
// Set a distinct logIndex so per-fill execution ids don't collide within a test.
function at<T extends ethereum.Event>(e: T, logIndex: i32): T {
  e.logIndex = BigInt.fromI32(logIndex);
  return e;
}

function depositRequested(assets: i32): DepositRequested {
  return mock(changetype<DepositRequested>(newMockEvent()), [
    param("user", ethereum.Value.fromAddress(ALICE)),
    param("nonce", uint(N1)),
    param("tranche", ethereum.Value.fromAddress(TRANCHE)),
    param("assets", uint(BigInt.fromI32(assets))),
    param("executableAtTimestamp", uint(EXEC_AT)),
    param("executorBonusWAD", uint(BigInt.zero())),
  ]);
}
function depositExecuted(deposited: i32, minted: i32, fee: i32, bonus: i32): DepositExecuted {
  return mock(changetype<DepositExecuted>(newMockEvent()), [
    param("user", ethereum.Value.fromAddress(ALICE)),
    param("nonce", uint(N1)),
    param("executor", ethereum.Value.fromAddress(BOB)),
    param("assetsDeposited", uint(BigInt.fromI32(deposited))),
    param("sharesMinted", uint(BigInt.fromI32(minted))),
    param("protocolFeeShares", uint(BigInt.fromI32(fee))),
    param("bonusAssets", uint(BigInt.fromI32(bonus))),
  ]);
}
function redemptionRequested(shares: i32): RedemptionRequested {
  return mock(changetype<RedemptionRequested>(newMockEvent()), [
    param("user", ethereum.Value.fromAddress(ALICE)),
    param("nonce", uint(N1)),
    param("tranche", ethereum.Value.fromAddress(TRANCHE)),
    param("shares", uint(BigInt.fromI32(shares))),
    param("executableAtTimestamp", uint(EXEC_AT)),
    param("executorBonusWAD", uint(BigInt.zero())),
  ]);
}
function redemptionExecuted(
  redeemed: i32,
  fee: i32,
  userClaims: ethereum.Value,
  quote: i32,
  bonusClaims: ethereum.Value,
  bonusQuote: i32
): RedemptionExecuted {
  return mock(changetype<RedemptionExecuted>(newMockEvent()), [
    param("user", ethereum.Value.fromAddress(ALICE)),
    param("nonce", uint(N1)),
    param("executor", ethereum.Value.fromAddress(BOB)),
    param("sharesRedeemed", uint(BigInt.fromI32(redeemed))),
    param("protocolFeeShares", uint(BigInt.fromI32(fee))),
    param("userClaims", userClaims),
    param("quoteAssets", uint(BigInt.fromI32(quote))),
    param("bonusClaims", bonusClaims),
    param("bonusQuoteAssets", uint(BigInt.fromI32(bonusQuote))),
  ]);
}
function trancheConfig(enabled: boolean, depositDelay: i32, redemptionDelay: i32): TrancheConfigUpdated {
  return mock(changetype<TrancheConfigUpdated>(newMockEvent()), [
    param("tranche", ethereum.Value.fromAddress(TRANCHE)),
    param(
      "config",
      ethereum.Value.fromTuple(
        changetype<ethereum.Tuple>([
          ethereum.Value.fromBoolean(enabled),
          uintSmall(depositDelay),
          uintSmall(redemptionDelay),
          ethereum.Value.fromAddress(Address.zero()),
        ])
      )
    ),
  ]);
}

describe("TrancheConfigUpdated", () => {
  beforeEach(clearStore);

  test("upserts per-tranche state with enablement, delays, and deposit token", () => {
    mockAsset();
    handleTrancheConfigUpdated(trancheConfig(true, 60, 120));
    const id = "1_".concat(ENTRY_POINT.toHexString()).concat("_").concat(TRANCHE.toHexString());
    assert.fieldEquals("DayEntryPointState", id, "isEnabled", "true");
    assert.fieldEquals("DayEntryPointState", id, "depositDelaySeconds", "60");
    assert.fieldEquals("DayEntryPointState", id, "redemptionDelaySeconds", "120");
    assert.fieldEquals("DayEntryPointState", id, "depositTokenAddress", ASSET.toHexString());
  });
});

describe("deposit lifecycle", () => {
  beforeEach(clearStore);

  test("requestDeposit escrows the full assets as pending", () => {
    mockAsset();
    handleDepositRequested(depositRequested(1000));
    const id = reqId(N1);
    assert.fieldEquals(ENTITY, id, "status", "pending");
    assert.fieldEquals(ENTITY, id, "subCategory", "deposit");
    assert.fieldEquals(ENTITY, id, "initValue", "1000");
    assert.fieldEquals(ENTITY, id, "currValue", "1000");
    assert.fieldEquals(ENTITY, id, "selfExecutionOnly", "false");
  });

  test("partial then full execution follows the SUM rule (assetsDeposited + bonusAssets)", () => {
    mockAsset();
    handleDepositRequested(depositRequested(100));
    const id = reqId(N1);

    // 38 deposited + 2 bonus consumes 40, leaving 60.
    handleDepositExecuted(at(depositExecuted(38, 40, 2, 2), 1));
    assert.fieldEquals(ENTITY, id, "currValue", "60");
    assert.fieldEquals(ENTITY, id, "status", "partiallyFilled");
    assert.fieldEquals(ENTITY, id, "protocolFeeShares", "2");

    // 58 + 2 consumes the remaining 60 -> completed.
    const fill2 = at(depositExecuted(58, 60, 0, 2), 2);
    handleDepositExecuted(fill2);
    assert.fieldEquals(ENTITY, id, "currValue", "0");
    assert.fieldEquals(ENTITY, id, "status", "completed");
    assert.fieldEquals(ENTITY, id, "assetsDeposited", "96");
    assert.fieldEquals(ENTITY, id, "assetsBonus", "4");
    assert.fieldEquals(ENTITY, id, "sharesMinted", "100");
    // each fill left an immutable execution row with its own deltas + post-fill state
    assert.entityCount("DayEntryPointExecution", 2);
    const exec2 = generateExecutionId(fill2.transaction.hash.toHexString(), fill2.logIndex);
    assert.fieldEquals("DayEntryPointExecution", exec2, "statusAfter", "completed");
    assert.fieldEquals("DayEntryPointExecution", exec2, "remainingAfter", "0");
    assert.fieldEquals("DayEntryPointExecution", exec2, "consumed", "60");
    assert.fieldEquals("DayEntryPointExecution", exec2, "assetsDeposited", "58");
    assert.fieldEquals("DayEntryPointExecution", exec2, "assetsBonus", "2");
    assert.fieldEquals("DayEntryPointExecution", exec2, "executorAddress", BOB.toHexString());
  });

  test("cancellation marks cancelled and zeroes the escrow", () => {
    mockAsset();
    handleDepositRequested(depositRequested(1000));
    handleDepositRequestCancelled(
      mock(changetype<DepositRequestCancelled>(newMockEvent()), [
        param("user", ethereum.Value.fromAddress(ALICE)),
        param("nonce", uint(N1)),
        param("receiver", ethereum.Value.fromAddress(ALICE)),
        param("assets", uint(BigInt.fromI32(1000))),
      ])
    );
    const id = reqId(N1);
    assert.fieldEquals(ENTITY, id, "status", "cancelled");
    assert.fieldEquals(ENTITY, id, "currValue", "0");
    assert.fieldEquals(ENTITY, id, "cancelReceiverAddress", ALICE.toHexString());
    assert.fieldEquals(ENTITY, id, "cancelledAmount", "1000");
  });
});

describe("redemption lifecycle", () => {
  beforeEach(clearStore);

  test("execution follows the SUM rule and accumulates every claim lane", () => {
    mockAsset();
    handleRedemptionRequested(redemptionRequested(1000));
    // 600 redeemed + 100 forfeited consumes 700, leaving 300.
    const ev = at(redemptionExecuted(600, 100, claims(11, 12, 13, 14, 15), 7, claims(1, 2, 3, 4, 5), 1), 3);
    handleRedemptionExecuted(ev);
    const id = reqId(N1);
    assert.fieldEquals(ENTITY, id, "subCategory", "withdraw");
    assert.fieldEquals(ENTITY, id, "currValue", "300");
    assert.fieldEquals(ENTITY, id, "status", "partiallyFilled");
    assert.fieldEquals(ENTITY, id, "sharesRedeemed", "600");
    assert.fieldEquals(ENTITY, id, "protocolFeeShares", "100");
    // Day-specific lt / stShares / nav / quote legs
    assert.fieldEquals(ENTITY, id, "ltAssetsUserClaims", "13");
    assert.fieldEquals(ENTITY, id, "stSharesUserClaims", "14");
    assert.fieldEquals(ENTITY, id, "navUserClaims", "15");
    assert.fieldEquals(ENTITY, id, "quoteAssetsUserClaims", "7");
    assert.fieldEquals(ENTITY, id, "ltAssetsBonusClaims", "3");
    assert.fieldEquals(ENTITY, id, "quoteAssetsBonusClaims", "1");
    // the fill left an immutable execution row with this fill's own deltas
    assert.entityCount("DayEntryPointExecution", 1);
    const execId = generateExecutionId(ev.transaction.hash.toHexString(), ev.logIndex);
    assert.fieldEquals("DayEntryPointExecution", execId, "executorAddress", BOB.toHexString());
    assert.fieldEquals("DayEntryPointExecution", execId, "consumed", "700");
    assert.fieldEquals("DayEntryPointExecution", execId, "remainingAfter", "300");
    assert.fieldEquals("DayEntryPointExecution", execId, "statusAfter", "partiallyFilled");
    assert.fieldEquals("DayEntryPointExecution", execId, "sharesRedeemed", "600");
    assert.fieldEquals("DayEntryPointExecution", execId, "ltAssetsUserClaims", "13");
    assert.fieldEquals("DayEntryPointExecution", execId, "requestId", id);
  });

  test("cancellation records the receiver and returned shares", () => {
    mockAsset();
    handleRedemptionRequested(redemptionRequested(1000));
    handleRedemptionRequestCancelled(
      mock(changetype<RedemptionRequestCancelled>(newMockEvent()), [
        param("user", ethereum.Value.fromAddress(ALICE)),
        param("nonce", uint(N1)),
        param("receiver", ethereum.Value.fromAddress(BOB)), // may differ from the payout receiver
        param("shares", uint(BigInt.fromI32(1000))),
      ])
    );
    const id = reqId(N1);
    assert.fieldEquals(ENTITY, id, "status", "cancelled");
    assert.fieldEquals(ENTITY, id, "currValue", "0");
    assert.fieldEquals(ENTITY, id, "cancelReceiverAddress", BOB.toHexString());
    assert.fieldEquals(ENTITY, id, "cancelledAmount", "1000");
  });
});
