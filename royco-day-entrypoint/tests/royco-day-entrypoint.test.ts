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
  CollateralAssetOraclePoked,
  ProtocolFeeSharesCollected,
  Paused,
  Unpaused,
} from "../generated/RoycoDayEntryPoint/RoycoDayEntryPoint";
import {
  handleDepositRequested,
  handleDepositExecuted,
  handleDepositRequestCancelled,
  handleRedemptionRequested,
  handleRedemptionExecuted,
  handleRedemptionRequestCancelled,
  handleTrancheConfigUpdated,
  handleCollateralAssetOraclePoked,
  handleProtocolFeeSharesCollected,
  handlePaused,
  handleUnpaused,
} from "../src/royco-day-entrypoint";
import {
  generateEntryPointDeploymentStateId,
  generateEntryPointRequestId,
  generateEntryPointStateId,
  generateExecutionId,
  generateGlobalTokenActivityId,
  generateTokenId,
} from "../src/utils";

const ENTITY = "DayEntryPointRequest";

// Must match config/entrypoint/networks/test.json.
const ENTRY_POINT = Address.fromString("0xba140d75fc0b646a13422224099a4f144a4ec9db");
const TRANCHE = Address.fromString("0x0000000000000000000000000000000000000051");
const ASSET = Address.fromString("0x00000000000000000000000000000000000000a5");
const ALICE = Address.fromString("0x00000000000000000000000000000000000000e1");
const BOB = Address.fromString("0x00000000000000000000000000000000000000e2");
const N1 = BigInt.fromI32(1);
const QUEUED_AT = BigInt.fromI32(1_700_000_000);
const EXEC_AT = BigInt.fromI32(1_700_000_100);
const EXPIRES_AT = BigInt.fromI32(1_700_000_400);

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
function claims(collateral: i32, lpt: i32, stShares: i32, nav: i32): ethereum.Value {
  return ethereum.Value.fromTuple(
    changetype<ethereum.Tuple>([
      uint(BigInt.fromI32(collateral)),
      uint(BigInt.fromI32(lpt)),
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

function baseRequest(): ethereum.Value {
  return ethereum.Value.fromTuple(
    changetype<ethereum.Tuple>([
      ethereum.Value.fromAddress(TRANCHE),
      uint(QUEUED_AT),
      uint(EXEC_AT),
      uint(EXPIRES_AT),
      uint(BigInt.zero()),
      ethereum.Value.fromAddress(BOB),
    ])
  );
}

function depositRequested(assets: i32): DepositRequested {
  return mock(changetype<DepositRequested>(newMockEvent()), [
    param("user", ethereum.Value.fromAddress(ALICE)),
    param("nonce", uint(N1)),
    param("tranche", ethereum.Value.fromAddress(TRANCHE)),
    param(
      "request",
      ethereum.Value.fromTuple(
        changetype<ethereum.Tuple>([
          uint(BigInt.fromI32(assets)),
          uint(BigInt.fromI32(assets * 10)),
          baseRequest(),
        ])
      )
    ),
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
    param("bonusShares", uint(BigInt.fromI32(bonus))),
  ]);
}
function redemptionRequested(shares: i32): RedemptionRequested {
  return mock(changetype<RedemptionRequested>(newMockEvent()), [
    param("user", ethereum.Value.fromAddress(ALICE)),
    param("nonce", uint(N1)),
    param("tranche", ethereum.Value.fromAddress(TRANCHE)),
    param(
      "request",
      ethereum.Value.fromTuple(
        changetype<ethereum.Tuple>([
          uint(BigInt.fromI32(shares)),
          uint(BigInt.fromI32(888)),
          uintSmall(2),
          baseRequest(),
        ])
      )
    ),
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
    param("executedMode", uintSmall(1)),
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
          uint(BigInt.fromI32(300)),
          uintSmall(redemptionDelay),
          uint(BigInt.fromI32(600)),
          ethereum.Value.fromBoolean(true),
        ])
      )
    ),
  ]);
}

function protocolFeeSharesCollected(receiver: Address, shares: i32): ProtocolFeeSharesCollected {
  return mock(changetype<ProtocolFeeSharesCollected>(newMockEvent()), [
    param("tranche", ethereum.Value.fromAddress(TRANCHE)),
    param("receiver", ethereum.Value.fromAddress(receiver)),
    param("shares", uint(BigInt.fromI32(shares))),
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
    assert.fieldEquals("DayEntryPointState", id, "depositExpirySeconds", "300");
    assert.fieldEquals("DayEntryPointState", id, "redemptionDelaySeconds", "120");
    assert.fieldEquals("DayEntryPointState", id, "redemptionExpirySeconds", "600");
    assert.fieldEquals("DayEntryPointState", id, "gateByOracleUpdate", "true");
    assert.fieldEquals("DayEntryPointState", id, "depositTokenAddress", ASSET.toHexString());
    assert.fieldEquals(
      "DayEntryPointState",
      id,
      "depositTokenId",
      generateTokenId(ASSET.toHexString())
    );
  });

  test("oracle pokes and pause events maintain executable-state inputs", () => {
    mockAsset();

    const poke = mock(changetype<CollateralAssetOraclePoked>(newMockEvent()), [
      param("tranche", ethereum.Value.fromAddress(TRANCHE)),
      param("lastUpdateTimestamp", uint(BigInt.fromI32(1_700_000_050))),
    ]);
    handleCollateralAssetOraclePoked(poke);

    const stateId = generateEntryPointStateId(
      ENTRY_POINT.toHexString(),
      TRANCHE.toHexString()
    );
    assert.fieldEquals(
      "DayEntryPointState",
      stateId,
      "latestOracleUpdateTimestamp",
      "1700000050"
    );

    handlePaused(
      mock(changetype<Paused>(newMockEvent()), [
        param("account", ethereum.Value.fromAddress(ALICE)),
      ])
    );
    const deploymentId = generateEntryPointDeploymentStateId(
      ENTRY_POINT.toHexString()
    );
    assert.fieldEquals(
      "DayEntryPointDeploymentState",
      deploymentId,
      "isPaused",
      "true"
    );

    handleUnpaused(
      mock(changetype<Unpaused>(newMockEvent()), [
        param("account", ethereum.Value.fromAddress(ALICE)),
      ])
    );
    assert.fieldEquals(
      "DayEntryPointDeploymentState",
      deploymentId,
      "isPaused",
      "false"
    );
  });
});

describe("protocol fee collection", () => {
  beforeEach(clearStore);

  test("records the exact collected tranche shares without request activity", () => {
    const ev = at(protocolFeeSharesCollected(BOB, 73), 4);
    handleProtocolFeeSharesCollected(ev);

    const id = generateExecutionId(ev.transaction.hash.toHexString(), ev.logIndex);
    assert.entityCount("DayEntryPointProtocolFeeCollection", 1);
    assert.fieldEquals("DayEntryPointProtocolFeeCollection", id, "entryPointAddress", ENTRY_POINT.toHexString());
    assert.fieldEquals("DayEntryPointProtocolFeeCollection", id, "trancheAddress", TRANCHE.toHexString());
    assert.fieldEquals("DayEntryPointProtocolFeeCollection", id, "vaultId", "1_".concat(TRANCHE.toHexString()));
    assert.fieldEquals("DayEntryPointProtocolFeeCollection", id, "receiverAddress", BOB.toHexString());
    assert.fieldEquals("DayEntryPointProtocolFeeCollection", id, "shares", "73");
    assert.entityCount("GlobalTokenActivity", 0);
  });
});

describe("deposit lifecycle", () => {
  beforeEach(clearStore);

  test("requestDeposit escrows the full assets as pending", () => {
    mockAsset();
    const rq = at(depositRequested(1000), 0);
    handleDepositRequested(rq);
    const id = reqId(N1);
    assert.fieldEquals(ENTITY, id, "status", "pending");
    assert.fieldEquals(ENTITY, id, "subCategory", "deposit");
    assert.fieldEquals(ENTITY, id, "initValue", "1000");
    assert.fieldEquals(ENTITY, id, "currValue", "1000");
    assert.fieldEquals(ENTITY, id, "selfExecutionOnly", "false");
    assert.fieldEquals(ENTITY, id, "requestReceiverAddress", BOB.toHexString());
    assert.fieldEquals(ENTITY, id, "queuedAtTimestamp", QUEUED_AT.toString());
    assert.fieldEquals(ENTITY, id, "expiresAtTimestamp", EXPIRES_AT.toString());
    assert.fieldEquals(ENTITY, id, "equivalentSharesAtRequestTime", "10000");
    assert.fieldEquals(ENTITY, id, "remainingEquivalentSharesAtRequestTime", "10000");
    assert.fieldEquals(ENTITY, id, "tokenId", generateTokenId(ASSET.toHexString()));
    assert.entityCount("GlobalTokenActivity", 1);
    const actId = generateGlobalTokenActivityId(
      rq.transaction.hash.toHexString(), rq.logIndex, TRANCHE.toHexString(), "assets", "deposit", BigInt.zero()
    );
    assert.fieldEquals("GlobalTokenActivity", actId, "type", "request");
    assert.fieldEquals("GlobalTokenActivity", actId, "status", "pending");
    assert.fieldEquals("GlobalTokenActivity", actId, "value", "1000");
    assert.fieldEquals("GlobalTokenActivity", actId, "accountAddress", ALICE.toHexString());
    assert.fieldEquals(
      "GlobalTokenActivity",
      actId,
      "tokenId",
      generateTokenId(ASSET.toHexString())
    );
  });

  test("partial then full execution consumes deposited assets while bonus is paid in shares", () => {
    mockAsset();
    handleDepositRequested(at(depositRequested(100), 0));
    const id = reqId(N1);

    const fill1 = at(depositExecuted(40, 40, 2, 2), 1);
    handleDepositExecuted(fill1);
    assert.fieldEquals(ENTITY, id, "currValue", "60");
    assert.fieldEquals(ENTITY, id, "status", "partiallyFilled");
    assert.fieldEquals(ENTITY, id, "protocolFeeShares", "2");
    assert.fieldEquals(ENTITY, id, "remainingEquivalentSharesAtRequestTime", "600");

    const fill2 = at(depositExecuted(60, 60, 0, 2), 2);
    handleDepositExecuted(fill2);
    assert.fieldEquals(ENTITY, id, "currValue", "0");
    assert.fieldEquals(ENTITY, id, "remainingEquivalentSharesAtRequestTime", "0");
    assert.fieldEquals(ENTITY, id, "status", "completed");
    assert.fieldEquals(ENTITY, id, "assetsDeposited", "100");
    assert.fieldEquals(ENTITY, id, "bonusShares", "4");
    assert.fieldEquals(ENTITY, id, "sharesMinted", "100");
    assert.entityCount("DayEntryPointExecution", 2);
    const exec2 = generateExecutionId(fill2.transaction.hash.toHexString(), fill2.logIndex);
    assert.fieldEquals("DayEntryPointExecution", exec2, "statusAfter", "completed");
    assert.fieldEquals("DayEntryPointExecution", exec2, "remainingAfter", "0");
    assert.fieldEquals("DayEntryPointExecution", exec2, "consumed", "60");
    assert.fieldEquals("DayEntryPointExecution", exec2, "equivalentSharesAtRequestTime", "600");
    assert.fieldEquals("DayEntryPointExecution", exec2, "assetsDeposited", "60");
    assert.fieldEquals("DayEntryPointExecution", exec2, "bonusShares", "2");
    assert.fieldEquals("DayEntryPointExecution", exec2, "executorAddress", BOB.toHexString());
    assert.entityCount("GlobalTokenActivity", 3);
    const act1 = generateGlobalTokenActivityId(
      fill1.transaction.hash.toHexString(), fill1.logIndex, TRANCHE.toHexString(), "assets", "deposit", BigInt.zero()
    );
    assert.fieldEquals("GlobalTokenActivity", act1, "status", "updated"); // partial fill, request not done
    assert.fieldEquals("GlobalTokenActivity", act1, "value", "40");
    const act2 = generateGlobalTokenActivityId(
      fill2.transaction.hash.toHexString(), fill2.logIndex, TRANCHE.toHexString(), "assets", "deposit", BigInt.zero()
    );
    assert.fieldEquals("GlobalTokenActivity", act2, "status", "completed"); // final fill completes the request
    assert.fieldEquals("GlobalTokenActivity", act2, "value", "60");
  });

  test("cancellation after a partial fill returns only the remaining escrow", () => {
    mockAsset();
    handleDepositRequested(at(depositRequested(1000), 0));
    handleDepositExecuted(at(depositExecuted(400, 390, 10, 0), 1));
    const cancelEv = at(
      mock(changetype<DepositRequestCancelled>(newMockEvent()), [
        param("user", ethereum.Value.fromAddress(ALICE)),
        param("nonce", uint(N1)),
        param("receiver", ethereum.Value.fromAddress(ALICE)),
        param("assets", uint(BigInt.fromI32(600))),
      ]),
      2
    );
    handleDepositRequestCancelled(cancelEv);
    const id = reqId(N1);
    assert.fieldEquals(ENTITY, id, "status", "cancelled");
    assert.fieldEquals(ENTITY, id, "currValue", "0");
    assert.fieldEquals(ENTITY, id, "remainingEquivalentSharesAtRequestTime", "0");
    assert.fieldEquals(ENTITY, id, "cancelReceiverAddress", ALICE.toHexString());
    assert.fieldEquals(ENTITY, id, "cancelledAmount", "600");
    assert.fieldEquals(ENTITY, id, "assetsDeposited", "400");
    assert.fieldEquals(ENTITY, id, "protocolFeeShares", "10");
    assert.entityCount("GlobalTokenActivity", 3);
    const cancelActId = generateGlobalTokenActivityId(
      cancelEv.transaction.hash.toHexString(), cancelEv.logIndex, TRANCHE.toHexString(), "assets", "deposit", BigInt.zero()
    );
    assert.fieldEquals("GlobalTokenActivity", cancelActId, "status", "cancelled");
    assert.fieldEquals("GlobalTokenActivity", cancelActId, "value", "600");
  });
});

describe("redemption lifecycle", () => {
  beforeEach(clearStore);

  test("two fills follow the SUM rule, recursively scale references, and complete", () => {
    mockAsset();
    handleRedemptionRequested(at(redemptionRequested(1000), 0));
    // 600 redeemed + 100 forfeited consumes 700, leaving 300.
    const ev = at(redemptionExecuted(600, 100, claims(11, 13, 14, 15), 7, claims(1, 3, 4, 5), 1), 3);
    handleRedemptionExecuted(ev);
    const id = reqId(N1);
    assert.fieldEquals(ENTITY, id, "subCategory", "withdraw");
    assert.fieldEquals(ENTITY, id, "currValue", "300");
    assert.fieldEquals(ENTITY, id, "status", "partiallyFilled");
    assert.fieldEquals(ENTITY, id, "sharesRedeemed", "600");
    assert.fieldEquals(ENTITY, id, "protocolFeeShares", "100");
    assert.fieldEquals(ENTITY, id, "requestReceiverAddress", BOB.toHexString());
    assert.fieldEquals(ENTITY, id, "valueAtRequestTime", "888");
    assert.fieldEquals(ENTITY, id, "remainingValueAtRequestTime", "266");
    assert.fieldEquals(ENTITY, id, "requestedRedemptionMode", "2");
    assert.fieldEquals(ENTITY, id, "collateralAssetsUserClaims", "11");
    assert.fieldEquals(ENTITY, id, "lptAssetsUserClaims", "13");
    assert.fieldEquals(ENTITY, id, "stSharesUserClaims", "14");
    assert.fieldEquals(ENTITY, id, "navUserClaims", "15");
    assert.fieldEquals(ENTITY, id, "quoteAssetsUserClaims", "7");
    assert.fieldEquals(ENTITY, id, "lptAssetsBonusClaims", "3");
    assert.fieldEquals(ENTITY, id, "quoteAssetsBonusClaims", "1");
    assert.entityCount("DayEntryPointExecution", 1);
    const execId = generateExecutionId(ev.transaction.hash.toHexString(), ev.logIndex);
    assert.fieldEquals("DayEntryPointExecution", execId, "executorAddress", BOB.toHexString());
    assert.fieldEquals("DayEntryPointExecution", execId, "consumed", "700");
    assert.fieldEquals("DayEntryPointExecution", execId, "remainingAfter", "300");
    assert.fieldEquals("DayEntryPointExecution", execId, "statusAfter", "partiallyFilled");
    assert.fieldEquals("DayEntryPointExecution", execId, "sharesRedeemed", "600");
    assert.fieldEquals("DayEntryPointExecution", execId, "valueAtRequestTime", "621");
    assert.fieldEquals("DayEntryPointExecution", execId, "executedRedemptionMode", "1");
    assert.fieldEquals("DayEntryPointExecution", execId, "lptAssetsUserClaims", "13");
    assert.fieldEquals("DayEntryPointExecution", execId, "requestId", id);
    assert.entityCount("GlobalTokenActivity", 2);
    const redActId = generateGlobalTokenActivityId(
      ev.transaction.hash.toHexString(), ev.logIndex, TRANCHE.toHexString(), "shares", "withdraw", BigInt.zero()
    );
    assert.fieldEquals("GlobalTokenActivity", redActId, "status", "updated");
    assert.fieldEquals("GlobalTokenActivity", redActId, "value", "600");
    assert.fieldEquals(
      "GlobalTokenActivity",
      redActId,
      "tokenId",
      generateTokenId(TRANCHE.toHexString())
    );

    const ev2 = at(
      redemptionExecuted(
        250,
        50,
        claims(21, 23, 24, 25),
        17,
        claims(2, 6, 8, 10),
        2
      ),
      4
    );
    handleRedemptionExecuted(ev2);
    assert.fieldEquals(ENTITY, id, "currValue", "0");
    assert.fieldEquals(ENTITY, id, "remainingValueAtRequestTime", "0");
    assert.fieldEquals(ENTITY, id, "status", "completed");
    assert.fieldEquals(ENTITY, id, "sharesRedeemed", "850");
    assert.fieldEquals(ENTITY, id, "protocolFeeShares", "150");
    assert.fieldEquals(ENTITY, id, "collateralAssetsUserClaims", "32");
    assert.fieldEquals(ENTITY, id, "quoteAssetsUserClaims", "24");

    const exec2 = generateExecutionId(
      ev2.transaction.hash.toHexString(),
      ev2.logIndex
    );
    assert.fieldEquals("DayEntryPointExecution", exec2, "consumed", "300");
    assert.fieldEquals(
      "DayEntryPointExecution",
      exec2,
      "valueAtRequestTime",
      "266"
    );
    assert.fieldEquals(
      "DayEntryPointExecution",
      exec2,
      "statusAfter",
      "completed"
    );
    assert.entityCount("GlobalTokenActivity", 3);
    const redAct2 = generateGlobalTokenActivityId(
      ev2.transaction.hash.toHexString(),
      ev2.logIndex,
      TRANCHE.toHexString(),
      "shares",
      "withdraw",
      BigInt.zero()
    );
    assert.fieldEquals("GlobalTokenActivity", redAct2, "status", "completed");
    assert.fieldEquals("GlobalTokenActivity", redAct2, "value", "250");
  });

  test("full forfeiture completes escrow even when activity value is zero", () => {
    mockAsset();
    handleRedemptionRequested(at(redemptionRequested(1000), 0));

    const ev = at(
      redemptionExecuted(
        0,
        1000,
        claims(0, 0, 0, 0),
        0,
        claims(0, 0, 0, 0),
        0
      ),
      1
    );
    handleRedemptionExecuted(ev);

    const id = reqId(N1);
    assert.fieldEquals(ENTITY, id, "status", "completed");
    assert.fieldEquals(ENTITY, id, "currValue", "0");
    assert.fieldEquals(ENTITY, id, "protocolFeeShares", "1000");

    const execId = generateExecutionId(
      ev.transaction.hash.toHexString(),
      ev.logIndex
    );
    assert.fieldEquals("DayEntryPointExecution", execId, "consumed", "1000");
    assert.fieldEquals(
      "DayEntryPointExecution",
      execId,
      "valueAtRequestTime",
      "888"
    );
    assert.fieldEquals(
      "DayEntryPointExecution",
      execId,
      "statusAfter",
      "completed"
    );

    const activityId = generateGlobalTokenActivityId(
      ev.transaction.hash.toHexString(),
      ev.logIndex,
      TRANCHE.toHexString(),
      "shares",
      "withdraw",
      BigInt.zero()
    );
    assert.fieldEquals("GlobalTokenActivity", activityId, "status", "completed");
    assert.fieldEquals("GlobalTokenActivity", activityId, "value", "0");
  });

  test("cancellation records the receiver and returned shares", () => {
    mockAsset();
    handleRedemptionRequested(at(redemptionRequested(1000), 0));
    handleRedemptionRequestCancelled(
      at(
        mock(changetype<RedemptionRequestCancelled>(newMockEvent()), [
          param("user", ethereum.Value.fromAddress(ALICE)),
          param("nonce", uint(N1)),
          param("receiver", ethereum.Value.fromAddress(BOB)), // may differ from the payout receiver
          param("shares", uint(BigInt.fromI32(1000))),
        ]),
        1
      )
    );
    const id = reqId(N1);
    assert.fieldEquals(ENTITY, id, "status", "cancelled");
    assert.fieldEquals(ENTITY, id, "currValue", "0");
    assert.fieldEquals(ENTITY, id, "remainingValueAtRequestTime", "0");
    assert.fieldEquals(ENTITY, id, "cancelReceiverAddress", BOB.toHexString());
    assert.fieldEquals(ENTITY, id, "cancelledAmount", "1000");
    // activity feed: 1 pending (create) + 1 cancelled
    assert.entityCount("GlobalTokenActivity", 2);
  });
});
