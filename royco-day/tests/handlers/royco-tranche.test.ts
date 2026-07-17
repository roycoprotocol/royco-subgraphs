import {
  assert,
  describe,
  test,
  clearStore,
  beforeEach,
} from "matchstick-as/assembly/index";
import { Address, BigInt } from "@graphprotocol/graph-ts";
import { handleMarketDeploymentCompleted } from "../../src/royco-factory";
import {
  handleTransfer,
  handleDeposit,
  handleRedeem,
} from "../../src/royco-senior-tranche";
import { handleTransfer as handleJuniorTransfer } from "../../src/royco-junior-tranche";
import { handleTransfer as handleLiquidityTransfer } from "../../src/royco-liquidity-tranche";
// The generic builders monomorphize per call site, so each tranche's events are
// built against ITS OWN generated class — the same discipline the entry files use.
import {
  Transfer as SeniorTransfer,
  Deposit as SeniorDeposit,
  Redeem as SeniorRedeem,
} from "../../generated/templates/RoycoSeniorTranche/RoycoSeniorTranche";
import { Transfer as JuniorTransfer } from "../../generated/templates/RoycoJuniorTranche/RoycoJuniorTranche";
import { Transfer as LiquidityTransfer } from "../../generated/templates/RoycoLiquidityTranche/RoycoLiquidityTranche";
import {
  DeploymentResult,
  createMarketDeploymentCompletedEvent,
} from "../builders/factory";
import {
  createTransferEvent,
  createDepositEvent,
  createRedeemEvent,
} from "../builders/tranche";
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
  ADDR_ASSET,
  ADDR_BOB,
  ADDR_DEPLOYER,
  ADDR_JUNIOR,
  ADDR_LIQUIDITY,
  ADDR_SENIOR,
  ADDR_TEMPLATE,
  ADDR_ZERO,
  TX_HASH,
  WAD,
} from "../helpers/constants";
import {
  generateGlobalTokenActivityId,
  generateGlobalTokenTransferId,
  generatePositionStateHistoricalId,
  generatePositionStateId,
  generateVaultStateHistoricalId,
  generateTokenId,
  generateVaultId,
} from "../../src/utils";
import { CATEGORY_ASSETS, CATEGORY_SHARES } from "../../src/constants";

// =============================================================================
// The three SHARED tranche handlers: Transfer / Deposit / Redeem.
//
// One implementation in src/handlers/tranche/ serves all three tranches; each
// entry file decodes with its own generated class and delegates. These tests run
// the JUNIOR and LIQUIDITY entry points too, not just Senior — that is what
// proves the shared path works from a data source whose abis: list does not name
// the class the shared code binds (CLAUDE.md §10.4). `graph build` cannot see it.
//
// Every test deploys a market first: handleMarketDeploymentCompleted is the SOLE
// legitimate creator of a DayVaultState, and the handlers return early without one.
// =============================================================================

const SENIOR_ID = generateVaultId(ADDR_SENIOR.toHexString());
const ALICE = ADDR_ALICE.toHexString();
const BOB = ADDR_BOB.toHexString();

/** 1e18 — one whole share at the fixture's 18 decimals. */
const ONE_SHARE = WAD;
const MINT_AMOUNT = WAD.times(BigInt.fromI32(10));

function deployMarket(market: DayMarketFixture): void {
  mockDayMarket(market);
  handleMarketDeploymentCompleted(
    createMarketDeploymentCompletedEvent(
      ADDR_TEMPLATE,
      ADDR_DEPLOYER,
      new DeploymentResult(),
      ctx()
    )
  );
}

/**
 * Mock the convertToAssets inputs a mint will produce.
 *
 * withArgs matches on the ENCODED argument, so every distinct input needs its own
 * mock or the handler aborts as unmocked — which matchstick reports as a failed
 * assertion and reads like a logic bug.
 *
 * !! Only TWO inputs here, not three. On a FIRST mint the supply IS the receiver's
 *    whole balance, so convertToAssets(supply) and convertToAssets(positionShares)
 *    are the SAME CALL and must return the SAME value — mocking them apart would
 *    register two answers for one input, and the second would silently win.
 *    The vault-vs-position distinction is only observable once a second account
 *    holds shares; see "a second mint prices the vault and the position apart".
 */
function mockFirstMint(
  tranche: Address,
  supply: BigInt,
  supplyClaims: Claims,
  shareClaims: Claims
): void {
  mockConvertToAssets(tranche, supply, supplyClaims);
  mockConvertToAssets(tranche, ONE_SHARE, shareClaims);
}

function claimsOf(base: i32): Claims {
  const c = new Claims();
  c.stAssets = BigInt.fromI32(base + 1);
  c.jtAssets = BigInt.fromI32(base + 2);
  c.ltAssets = BigInt.fromI32(base + 3);
  c.stShares = BigInt.fromI32(base + 4);
  c.nav = BigInt.fromI32(base + 5);
  return c;
}

describe("processTransfer", () => {
  beforeEach(() => {
    clearStore();
  });

  test("mint credits the receiver, bumps supply, and never creates a 0x0 position", () => {
    // The 0x0 guard is the one that CORRUPTS rather than crashes: a position keyed
    // on the zero address would accumulate every mint and burn in the market and
    // read as a real whale in Neon.
    const market = DayMarketFixture.standard();
    deployMarket(market);
    mockFirstMint(
      ADDR_SENIOR,
      MINT_AMOUNT,
      claimsOf(4_100),
      claimsOf(4_200)
    );

    const c = ctx();
    c.emitter = ADDR_SENIOR;
    handleTransfer(createTransferEvent<SeniorTransfer>(ADDR_ZERO, ADDR_ALICE, MINT_AMOUNT, c));

    assert.fieldEquals(
      "DayVaultState",
      SENIOR_ID,
      "sharesTotalSupply",
      MINT_AMOUNT.toString()
    );
    assert.fieldEquals(
      "DayPositionState",
      generatePositionStateId(ADDR_SENIOR.toHexString(), ALICE),
      "shares",
      MINT_AMOUNT.toString()
    );
    assert.notInStore(
      "DayPositionState",
      generatePositionStateId(ADDR_SENIOR.toHexString(), ADDR_ZERO.toHexString())
    );
    assert.entityCount("DayPositionState", 1);

    // The claims MUST move with the supply, in the same write. claims* IS
    // convertToAssets(sharesTotalSupply) — the supply is its literal input — so a
    // row carrying the new supply beside claims priced at the old one is strictly
    // worse than both being stale together: claimsNAV / sharesTotalSupply would
    // then mix two different instants. Before the mint these were all 0 (a fresh
    // market), so a missing refresh leaves 0 here and this catches it.
    assert.fieldEquals("DayVaultState", SENIOR_ID, "claimsNAV", "4105");
    assert.fieldEquals("DayVaultState", SENIOR_ID, "sharePriceNAV", "4205");
    assert.fieldEquals(
      "DayVaultState",
      SENIOR_ID,
      "claimsSeniorTrancheAssets",
      "4101"
    );
    // Same value, and that is correct rather than a coincidence: on a first mint
    // alice holds the entire supply, so her claim IS the vault's claim.
    assert.fieldEquals(
      "DayPositionState",
      generatePositionStateId(ADDR_SENIOR.toHexString(), ALICE),
      "claimsNAV",
      "4105"
    );
  });

  test("a second mint prices the vault and the position apart", () => {
    // Only observable once a second account holds shares: the vault's claim comes
    // from convertToAssets(TOTAL supply) and each position's from
    // convertToAssets(ITS OWN balance) — two different inputs, two different
    // answers. A handler that reused the vault's result for the position (or vice
    // versa) passes every first-mint test and fails here.
    const market = DayMarketFixture.standard();
    deployMarket(market);
    mockFirstMint(ADDR_SENIOR, MINT_AMOUNT, claimsOf(4_100), claimsOf(4_200));

    const c = ctx();
    c.emitter = ADDR_SENIOR;
    handleTransfer(
      createTransferEvent<SeniorTransfer>(ADDR_ZERO, ADDR_ALICE, MINT_AMOUNT, c)
    );

    // Bob mints the same amount: supply doubles, but each position stays at
    // MINT_AMOUNT. Now the two inputs are distinct and can carry distinct answers.
    const doubled = MINT_AMOUNT.times(BigInt.fromI32(2));
    mockConvertToAssets(ADDR_SENIOR, doubled, claimsOf(4_800));

    const c2 = ctx();
    c2.emitter = ADDR_SENIOR;
    c2.logIndex = BigInt.fromI32(2);
    handleTransfer(
      createTransferEvent<SeniorTransfer>(ADDR_ZERO, ADDR_BOB, MINT_AMOUNT, c2)
    );

    assert.fieldEquals("DayVaultState", SENIOR_ID, "sharesTotalSupply", doubled.toString());
    // The vault: priced at the TOTAL supply.
    assert.fieldEquals("DayVaultState", SENIOR_ID, "claimsNAV", "4805");
    // Both positions: priced at their OWN balance, which is still MINT_AMOUNT.
    assert.fieldEquals(
      "DayPositionState",
      generatePositionStateId(ADDR_SENIOR.toHexString(), BOB),
      "claimsNAV",
      "4105"
    );
    // Alice untouched by bob's mint — her row still holds her own last claim.
    assert.fieldEquals(
      "DayPositionState",
      generatePositionStateId(ADDR_SENIOR.toHexString(), ALICE),
      "claimsNAV",
      "4105"
    );
  });

  test("the mint snapshot records the refreshed claims, not the pre-mint ones", () => {
    // The snapshot is immutable and write-once: whatever lands at entryIndex 1 is
    // what Neon reports for that block forever.
    const market = DayMarketFixture.standard();
    deployMarket(market);
    mockFirstMint(
      ADDR_SENIOR,
      MINT_AMOUNT,
      claimsOf(4_100),
      claimsOf(4_200)
    );

    const c = ctx();
    c.emitter = ADDR_SENIOR;
    handleTransfer(
      createTransferEvent<SeniorTransfer>(ADDR_ZERO, ADDR_ALICE, MINT_AMOUNT, c)
    );

    const snapshotId = generateVaultStateHistoricalId(
      ADDR_SENIOR.toHexString(),
      BigInt.fromI32(1)
    );
    assert.fieldEquals(
      "DayVaultStateHistorical",
      snapshotId,
      "sharesTotalSupply",
      MINT_AMOUNT.toString()
    );
    assert.fieldEquals("DayVaultStateHistorical", snapshotId, "claimsNAV", "4105");
    assert.fieldEquals("DayVaultStateHistorical", snapshotId, "entryIndex", "1");
  });

  test("supply is an accumulator: mint then burn nets out", () => {
    // Never totalSupply(). eth_call reads END-OF-BLOCK state, so a mint at log 2
    // in a block whose log 9 is a big redeem would bake a supply the vault never
    // had into a write-once historical row.
    const market = DayMarketFixture.standard();
    deployMarket(market);
    mockFirstMint(
      ADDR_SENIOR,
      MINT_AMOUNT,
      claimsOf(4_100),
      claimsOf(4_200)
    );
    const burn = MINT_AMOUNT.div(BigInt.fromI32(4));
    const remaining = MINT_AMOUNT.minus(burn);
    mockConvertToAssets(ADDR_SENIOR, remaining, claimsOf(4_400));

    const c = ctx();
    c.emitter = ADDR_SENIOR;
    handleTransfer(createTransferEvent<SeniorTransfer>(ADDR_ZERO, ADDR_ALICE, MINT_AMOUNT, c));

    const c2 = ctx();
    c2.emitter = ADDR_SENIOR;
    c2.logIndex = BigInt.fromI32(2);
    handleTransfer(createTransferEvent<SeniorTransfer>(ADDR_ALICE, ADDR_ZERO, burn, c2));

    assert.fieldEquals(
      "DayVaultState",
      SENIOR_ID,
      "sharesTotalSupply",
      remaining.toString()
    );
    assert.fieldEquals(
      "DayPositionState",
      generatePositionStateId(ADDR_SENIOR.toHexString(), ALICE),
      "shares",
      remaining.toString()
    );
  });

  test("a plain transfer moves both sides and leaves supply alone", () => {
    const market = DayMarketFixture.standard();
    deployMarket(market);
    mockFirstMint(
      ADDR_SENIOR,
      MINT_AMOUNT,
      claimsOf(4_100),
      claimsOf(4_200)
    );

    const c = ctx();
    c.emitter = ADDR_SENIOR;
    handleTransfer(createTransferEvent<SeniorTransfer>(ADDR_ZERO, ADDR_ALICE, MINT_AMOUNT, c));

    const half = MINT_AMOUNT.div(BigInt.fromI32(2));
    mockConvertToAssets(ADDR_SENIOR, half, claimsOf(4_500));

    const c2 = ctx();
    c2.emitter = ADDR_SENIOR;
    c2.logIndex = BigInt.fromI32(2);
    handleTransfer(createTransferEvent<SeniorTransfer>(ADDR_ALICE, ADDR_BOB, half, c2));

    // Supply unchanged — a plain transfer must not touch the vault at all.
    assert.fieldEquals(
      "DayVaultState",
      SENIOR_ID,
      "sharesTotalSupply",
      MINT_AMOUNT.toString()
    );
    assert.fieldEquals(
      "DayPositionState",
      generatePositionStateId(ADDR_SENIOR.toHexString(), ALICE),
      "shares",
      half.toString()
    );
    assert.fieldEquals(
      "DayPositionState",
      generatePositionStateId(ADDR_SENIOR.toHexString(), BOB),
      "shares",
      half.toString()
    );
  });

  test("a plain transfer writes NO new vault snapshot", () => {
    // Supply is unchanged, so a snapshot would duplicate the previous row and burn
    // a write-once entryIndex forever.
    const market = DayMarketFixture.standard();
    deployMarket(market);
    mockFirstMint(
      ADDR_SENIOR,
      MINT_AMOUNT,
      claimsOf(4_100),
      claimsOf(4_200)
    );

    const c = ctx();
    c.emitter = ADDR_SENIOR;
    handleTransfer(createTransferEvent<SeniorTransfer>(ADDR_ZERO, ADDR_ALICE, MINT_AMOUNT, c));
    // 3 creation snapshots (one per tranche) + 1 for this mint.
    assert.entityCount("DayVaultStateHistorical", 4);
    assert.fieldEquals("DayVaultState", SENIOR_ID, "lastHistoricalEntryIndex", "1");

    const half = MINT_AMOUNT.div(BigInt.fromI32(2));
    mockConvertToAssets(ADDR_SENIOR, half, claimsOf(4_500));
    const c2 = ctx();
    c2.emitter = ADDR_SENIOR;
    c2.logIndex = BigInt.fromI32(2);
    handleTransfer(createTransferEvent<SeniorTransfer>(ADDR_ALICE, ADDR_BOB, half, c2));

    assert.entityCount("DayVaultStateHistorical", 4);
    assert.fieldEquals("DayVaultState", SENIOR_ID, "lastHistoricalEntryIndex", "1");
  });

  test("a self-transfer writes NOTHING — not even the global rows", () => {
    // A self-transfer moves no balance, and we drop it entirely: no
    // GlobalTokenTransfer, no GlobalTokenActivity, no position or vault write.
    // Nothing on-chain rejects from == to, so it does occur.
    //
    // Were it allowed through, the two updatePosition calls would snapshot
    // `shares - value` (a balance the account never held) and then restore it — a
    // phantom dip in a time series. It would not crash, just quietly lie. The row
    // counts below are what catch it.
    const market = DayMarketFixture.standard();
    deployMarket(market);
    mockFirstMint(
      ADDR_SENIOR,
      MINT_AMOUNT,
      claimsOf(4_100),
      claimsOf(4_200)
    );

    const c = ctx();
    c.emitter = ADDR_SENIOR;
    handleTransfer(createTransferEvent<SeniorTransfer>(ADDR_ZERO, ADDR_ALICE, MINT_AMOUNT, c));

    // Baseline after the mint: exactly 1 global transfer, alice at cursor 0.
    assert.entityCount("GlobalTokenTransfer", 1);

    const half = MINT_AMOUNT.div(BigInt.fromI32(2));
    mockConvertToAssets(ADDR_SENIOR, half, claimsOf(4_600));

    const c2 = ctx();
    c2.emitter = ADDR_SENIOR;
    c2.logIndex = BigInt.fromI32(2);
    handleTransfer(createTransferEvent<SeniorTransfer>(ADDR_ALICE, ADDR_ALICE, half, c2));

    // The self-transfer added NOTHING to any table.
    assert.entityCount("GlobalTokenTransfer", 1);
    assert.entityCount("GlobalTokenActivity", 1);
    // Position untouched: still the full mint, still cursor 0, one snapshot.
    assert.fieldEquals(
      "DayPositionState",
      generatePositionStateId(ADDR_SENIOR.toHexString(), ALICE),
      "shares",
      MINT_AMOUNT.toString()
    );
    assert.fieldEquals(
      "DayPositionState",
      generatePositionStateId(ADDR_SENIOR.toHexString(), ALICE),
      "lastHistoricalEntryIndex",
      "0"
    );
    assert.entityCount("DayPositionStateHistorical", 1);
  });

  test("the position cursor starts at 0 and is dense", () => {
    // A position is born on its FIRST transfer, not seeded by the factory the way
    // a vault is — so its entry 0 is that first write. Getting this wrong writes
    // entry 1 first and leaves 0 absent forever.
    const market = DayMarketFixture.standard();
    deployMarket(market);
    mockFirstMint(
      ADDR_SENIOR,
      MINT_AMOUNT,
      claimsOf(4_100),
      claimsOf(4_200)
    );

    const c = ctx();
    c.emitter = ADDR_SENIOR;
    handleTransfer(createTransferEvent<SeniorTransfer>(ADDR_ZERO, ADDR_ALICE, MINT_AMOUNT, c));

    const more = MINT_AMOUNT.times(BigInt.fromI32(2));
    mockConvertToAssets(ADDR_SENIOR, more, claimsOf(4_700));
    mockConvertToAssets(ADDR_SENIOR, more, claimsOf(4_700));
    const c2 = ctx();
    c2.emitter = ADDR_SENIOR;
    c2.logIndex = BigInt.fromI32(2);
    handleTransfer(createTransferEvent<SeniorTransfer>(ADDR_ZERO, ADDR_ALICE, MINT_AMOUNT, c2));

    const positionId = generatePositionStateId(ADDR_SENIOR.toHexString(), ALICE);
    assert.fieldEquals("DayPositionState", positionId, "lastHistoricalEntryIndex", "1");
    assert.entityCount("DayPositionStateHistorical", 2);
    assert.fieldEquals(
      "DayPositionStateHistorical",
      generatePositionStateHistoricalId(
        ADDR_SENIOR.toHexString(),
        ALICE,
        BigInt.zero()
      ),
      "entryIndex",
      "0"
    );
    assert.fieldEquals(
      "DayPositionStateHistorical",
      generatePositionStateHistoricalId(
        ADDR_SENIOR.toHexString(),
        ALICE,
        BigInt.fromI32(1)
      ),
      "entryIndex",
      "1"
    );
  });

  test("a mint writes ONE activity; a plain transfer writes transferOut AND transferIn", () => {
    const market = DayMarketFixture.standard();
    deployMarket(market);
    mockFirstMint(
      ADDR_SENIOR,
      MINT_AMOUNT,
      claimsOf(4_100),
      claimsOf(4_200)
    );

    const c = ctx();
    c.emitter = ADDR_SENIOR;
    handleTransfer(createTransferEvent<SeniorTransfer>(ADDR_ZERO, ADDR_ALICE, MINT_AMOUNT, c));
    assert.entityCount("GlobalTokenActivity", 1);

    const half = MINT_AMOUNT.div(BigInt.fromI32(2));
    mockConvertToAssets(ADDR_SENIOR, half, claimsOf(4_500));
    const c2 = ctx();
    c2.emitter = ADDR_SENIOR;
    c2.logIndex = BigInt.fromI32(2);
    handleTransfer(createTransferEvent<SeniorTransfer>(ADDR_ALICE, ADDR_BOB, half, c2));

    // The two rows share a log and differ only on subCategory — which IS in the
    // activity id and is NOT in the transfer id.
    assert.entityCount("GlobalTokenActivity", 3);
    assert.fieldEquals(
      "GlobalTokenActivity",
      generateGlobalTokenActivityId(
        TX_HASH.toHexString(),
        BigInt.fromI32(2),
        ADDR_SENIOR.toHexString(),
        CATEGORY_SHARES,
        "transferOut",
        BigInt.zero()
      ),
      "accountAddress",
      ALICE
    );
    assert.fieldEquals(
      "GlobalTokenActivity",
      generateGlobalTokenActivityId(
        TX_HASH.toHexString(),
        BigInt.fromI32(2),
        ADDR_SENIOR.toHexString(),
        CATEGORY_SHARES,
        "transferIn",
        BigInt.zero()
      ),
      "accountAddress",
      BOB
    );
  });

  test("a zero-value transfer touches no position", () => {
    const market = DayMarketFixture.standard();
    deployMarket(market);

    const c = ctx();
    c.emitter = ADDR_SENIOR;
    handleTransfer(createTransferEvent<SeniorTransfer>(ADDR_ALICE, ADDR_BOB, BigInt.zero(), c));

    assert.entityCount("DayPositionState", 0);
    assert.entityCount("GlobalTokenTransfer", 0);
  });

  test("a claims revert on a brand-new position seeds zeros instead of dying", () => {
    // The position is born HERE, so there is no previous value to keep — and five
    // unset non-null fields are fatal at INDEX time, not build time.
    const market = DayMarketFixture.standard();
    deployMarket(market);
    mockConvertToAssets(ADDR_SENIOR, MINT_AMOUNT, claimsOf(4_100));
    mockConvertToAssets(ADDR_SENIOR, ONE_SHARE, claimsOf(4_200));
    mockConvertToAssetsReverts(ADDR_SENIOR, MINT_AMOUNT);

    const c = ctx();
    c.emitter = ADDR_SENIOR;
    handleTransfer(createTransferEvent<SeniorTransfer>(ADDR_ZERO, ADDR_ALICE, MINT_AMOUNT, c));

    const positionId = generatePositionStateId(ADDR_SENIOR.toHexString(), ALICE);
    assert.fieldEquals(
      "DayPositionState",
      positionId,
      "shares",
      MINT_AMOUNT.toString()
    );
    assert.fieldEquals("DayPositionState", positionId, "claimsNAV", "0");
  });

  test("the junior entry point works — its data source cannot bind Senior without the manifest", () => {
    // THE POINT OF THIS TEST. The shared handler binds RoycoSeniorTranche for its
    // convertToAssets calls, and `bind()` bakes the contract NAME, which graph-node
    // resolves against the RUNNING data source's abis: list. Without
    // RoycoSeniorTranche on the Junior template, every Junior transfer fails its
    // eth_call and stalls the subgraph — and `graph build` passes either way.
    const market = DayMarketFixture.standard();
    deployMarket(market);
    mockFirstMint(
      ADDR_JUNIOR,
      MINT_AMOUNT,
      claimsOf(5_100),
      claimsOf(5_200)
    );

    const c = ctx();
    c.emitter = ADDR_JUNIOR;
    handleJuniorTransfer(createTransferEvent<JuniorTransfer>(ADDR_ZERO, ADDR_ALICE, MINT_AMOUNT, c));

    assert.fieldEquals(
      "DayVaultState",
      generateVaultId(ADDR_JUNIOR.toHexString()),
      "sharesTotalSupply",
      MINT_AMOUNT.toString()
    );
    assert.fieldEquals(
      "DayPositionState",
      generatePositionStateId(ADDR_JUNIOR.toHexString(), ALICE),
      "claimsNAV",
      "5105"
    );
  });

  test("the liquidity entry point works too", () => {
    const market = DayMarketFixture.standard();
    deployMarket(market);
    mockFirstMint(
      ADDR_LIQUIDITY,
      MINT_AMOUNT,
      claimsOf(6_100),
      claimsOf(6_200)
    );

    const c = ctx();
    c.emitter = ADDR_LIQUIDITY;
    handleLiquidityTransfer(
      createTransferEvent<LiquidityTransfer>(ADDR_ZERO, ADDR_ALICE, MINT_AMOUNT, c)
    );

    assert.fieldEquals(
      "DayVaultState",
      generateVaultId(ADDR_LIQUIDITY.toHexString()),
      "sharesTotalSupply",
      MINT_AMOUNT.toString()
    );
  });
});

describe("processDeposit", () => {
  beforeEach(() => {
    clearStore();
  });

  test("the deposit asset leg is attributed to the VAULT (shared-table convention)", () => {
    // toAddress = the vault deposited into, matching royco-rwa on the frozen
    // shared global_token_transfer table (every package sets to==vault on a
    // deposit). It is vault-level attribution, not the literal recipient: the
    // assets actually go to the KERNEL via safeTransferFrom(sender, KERNEL, assets)
    // — but that would make royco-day the only package whose deposit rows break
    // `to_address == vault_address`.
    const market = DayMarketFixture.standard();
    deployMarket(market);

    const c = ctx();
    c.emitter = ADDR_SENIOR;
    handleDeposit(
      createDepositEvent<SeniorDeposit>(ADDR_ALICE, ADDR_ALICE, MINT_AMOUNT, MINT_AMOUNT, c)
    );

    const transferId = generateGlobalTokenTransferId(
      TX_HASH.toHexString(),
      c.logIndex,
      BigInt.zero()
    );
    assert.fieldEquals("GlobalTokenTransfer", transferId, "fromAddress", ALICE);
    assert.fieldEquals(
      "GlobalTokenTransfer",
      transferId,
      "toAddress",
      ADDR_SENIOR.toHexString()
    );
    assert.fieldEquals(
      "GlobalTokenTransfer",
      transferId,
      "category",
      CATEGORY_ASSETS
    );
    // The ASSET token, not the vault. rwa's addTransferActivity sets tokenAddress
    // to the vault — invisible for share rows, flatly wrong here.
    assert.fieldEquals(
      "GlobalTokenTransfer",
      transferId,
      "tokenAddress",
      ADDR_ASSET.toHexString()
    );
    assert.fieldEquals(
      "GlobalTokenTransfer",
      transferId,
      "tokenId",
      generateTokenId(ADDR_ASSET.toHexString())
    );
  });

  test("deposit writes an activity and touches NO share accounting", () => {
    // The accompanying Transfer(mint) owns the shares. deposit() mints BEFORE it
    // emits, so by now processTransfer has already done it — doing it again here
    // double-counts.
    const market = DayMarketFixture.standard();
    deployMarket(market);

    const c = ctx();
    c.emitter = ADDR_SENIOR;
    handleDeposit(
      createDepositEvent<SeniorDeposit>(ADDR_ALICE, ADDR_ALICE, MINT_AMOUNT, MINT_AMOUNT, c)
    );

    assert.entityCount("GlobalTokenActivity", 1);
    assert.fieldEquals(
      "GlobalTokenActivity",
      generateGlobalTokenActivityId(
        TX_HASH.toHexString(),
        c.logIndex,
        ADDR_SENIOR.toHexString(),
        CATEGORY_ASSETS,
        "deposit",
        BigInt.zero()
      ),
      "accountAddress",
      ALICE
    );
    assert.entityCount("DayPositionState", 0);
    assert.fieldEquals("DayVaultState", SENIOR_ID, "sharesTotalSupply", "0");
  });
});

describe("processRedeem", () => {
  beforeEach(() => {
    clearStore();
  });

  test("each non-zero asset leg gets its own row at its POSITIONAL tokenIndex", () => {
    const market = DayMarketFixture.standard();
    deployMarket(market);

    const claims = new Claims();
    claims.stAssets = BigInt.fromI32(7_101);
    claims.jtAssets = BigInt.fromI32(7_102);
    claims.ltAssets = BigInt.fromI32(7_103);
    claims.stShares = BigInt.fromI32(7_104);
    claims.nav = BigInt.fromI32(7_105);

    const c = ctx();
    c.emitter = ADDR_SENIOR;
    handleRedeem(createRedeemEvent<SeniorRedeem>(ADDR_ALICE, ADDR_BOB, claims, MINT_AMOUNT, c));

    assert.entityCount("GlobalTokenTransfer", 3);
    assert.entityCount("GlobalTokenActivity", 3);

    for (let i = 0; i < 3; i++) {
      const id = generateGlobalTokenTransferId(
        TX_HASH.toHexString(),
        c.logIndex,
        BigInt.fromI32(i)
      );
      assert.fieldEquals("GlobalTokenTransfer", id, "value", (7_101 + i).toString());
      // WITHDRAW credits the RECEIVER, not the sender — redeem() spends an
      // allowance when msg.sender != owner, so the two genuinely differ.
      assert.fieldEquals("GlobalTokenTransfer", id, "toAddress", BOB);
      // fromAddress = the redeeming VAULT, matching rwa's withdraw convention on
      // the shared table and our own deposit rows (vault-level attribution, not
      // the literal kernel custody source).
      assert.fieldEquals(
        "GlobalTokenTransfer",
        id,
        "fromAddress",
        ADDR_SENIOR.toHexString()
      );
    }
  });

  test("a zero leg is SKIPPED and the indices stay positional", () => {
    // THE HIGHEST-VALUE ASSERTION HERE. A running counter over the non-zero legs
    // would put ltAssets at tokenIndex 1, and the leg would then be unrecoverable
    // from Neon: tokenAddress is the only other clue, and the shipped kernel gives
    // the senior and junior legs the SAME asset token.
    const market = DayMarketFixture.standard();
    deployMarket(market);

    const claims = new Claims();
    claims.stAssets = BigInt.fromI32(7_101);
    claims.jtAssets = BigInt.zero(); // skipped on-chain too
    claims.ltAssets = BigInt.fromI32(7_103);

    const c = ctx();
    c.emitter = ADDR_SENIOR;
    handleRedeem(createRedeemEvent<SeniorRedeem>(ADDR_ALICE, ADDR_BOB, claims, MINT_AMOUNT, c));

    assert.entityCount("GlobalTokenTransfer", 2);
    assert.fieldEquals(
      "GlobalTokenTransfer",
      generateGlobalTokenTransferId(
        TX_HASH.toHexString(),
        c.logIndex,
        BigInt.zero()
      ),
      "value",
      "7101"
    );
    // tokenIndex 2, NOT 1.
    assert.fieldEquals(
      "GlobalTokenTransfer",
      generateGlobalTokenTransferId(
        TX_HASH.toHexString(),
        c.logIndex,
        BigInt.fromI32(2)
      ),
      "value",
      "7103"
    );
    assert.notInStore(
      "GlobalTokenTransfer",
      generateGlobalTokenTransferId(
        TX_HASH.toHexString(),
        c.logIndex,
        BigInt.fromI32(1)
      )
    );
  });

  test("claims.stShares gets no row — the senior Transfer log already carries it", () => {
    // _withdrawAssets safeTransfers the senior tranche's own shares, and the senior
    // tranche IS an indexed template — that leg emits its own Transfer at its own
    // log index. A row here would double-count.
    const market = DayMarketFixture.standard();
    deployMarket(market);

    const claims = new Claims();
    claims.stShares = BigInt.fromI32(7_104); // the ONLY non-zero member

    const c = ctx();
    c.emitter = ADDR_SENIOR;
    handleRedeem(createRedeemEvent<SeniorRedeem>(ADDR_ALICE, ADDR_BOB, claims, MINT_AMOUNT, c));

    assert.entityCount("GlobalTokenTransfer", 0);
    assert.entityCount("GlobalTokenActivity", 0);
  });

  test("redeem touches no position or supply", () => {
    // The burn Transfer has the lower log index and already did it. And Redeem
    // carries sender/receiver but NOT owner, so it could not identify whose shares
    // were burned even if it wanted to.
    const market = DayMarketFixture.standard();
    deployMarket(market);

    const claims = new Claims();
    claims.stAssets = BigInt.fromI32(7_101);

    const c = ctx();
    c.emitter = ADDR_SENIOR;
    handleRedeem(createRedeemEvent<SeniorRedeem>(ADDR_ALICE, ADDR_BOB, claims, MINT_AMOUNT, c));

    assert.entityCount("DayPositionState", 0);
    assert.fieldEquals("DayVaultState", SENIOR_ID, "sharesTotalSupply", "0");
  });
});
