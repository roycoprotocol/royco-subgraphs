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
import { Transfer as LiquidityTransfer } from "../../generated/templates/RoycoLiquidityProviderTranche/RoycoLiquidityProviderTranche";
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
  mockAssetPriceNAV,
} from "../mocks";
import { Claims } from "../builders/shared";
import { ctx } from "../helpers/event";
import {
  BLOCK_NUMBER,
  ADDR_ALICE,
  ADDR_ASSET,
  ADDR_BOB,
  ADDR_DEPLOYER,
  ADDR_JUNIOR,
  ADDR_KERNEL,
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
/**
 * 1e18 — one whole ASSET token. Numerically equal to ONE_SHARE only because the
 * standard fixture is 18/18; they are different denominators and the two names are
 * kept apart so a decimals bug stays visible (see the factory suite's 6-decimal test).
 */
const ONE_ASSET_TOKEN = WAD;
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
  c.collateralAssets = BigInt.fromI32(base + 1);
  c.lptAssets = BigInt.fromI32(base + 3);
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

    // The POSITION's claim must move with its balance, in the same write —
    // DayPositionState is now the only entity carrying a plain claims* quintuple
    // (DayVaultState's two were dropped for DayMarketNav). Before the mint alice had
    // no row at all, so a missing refresh leaves the seeded 0 here and this catches it.
    assert.fieldEquals(
      "DayPositionState",
      generatePositionStateId(ADDR_SENIOR.toHexString(), ALICE),
      "claimsNAV",
      "4105"
    );
    assert.fieldEquals(
      "DayPositionState",
      generatePositionStateId(ADDR_SENIOR.toHexString(), ALICE),
      "claimsCollateralAssets",
      "4101"
    );
  });

  test("a second mint prices each position by its OWN balance, not the supply", () => {
    // Only observable once a second account holds shares. Each position's claim comes
    // from convertToAssets(ITS OWN balance), never from the total supply — a handler
    // that priced positions off the supply passes every first-mint test (where the two
    // inputs coincide) and fails here.
    //
    // The vault half of this comparison is gone: DayVaultState no longer stores a
    // claim, so convertToAssets(TOTAL supply) is not called on the mint path at all.
    // The `doubled` mock below therefore exists only to prove the negative — if a
    // supply-priced claim ever comes back, 4_800 is the value that would show up.
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
    // Both positions: priced at their OWN balance, which is still MINT_AMOUNT — NOT
    // 4_805, which is what the doubled supply would have produced.
    
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

  test("the mint snapshot records the POST-mint supply, not the pre-mint one", () => {
    // Whatever lands on the mint's block row is what Neon reports for that block, so it
    // must be built AFTER the delta is applied, not before. The mint takes its own block
    // so the creation row survives alongside it to be compared against.
    //
    // v1 also asserted assetPriceNAV here. DayVaultState now stores no price at all, so
    // sharesTotalSupply is the only value on this entity that can be stale — and with
    // the price reads gone, applySharesDelta makes ZERO eth_calls.
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
    c.blockNumber = BLOCK_NUMBER.plus(BigInt.fromI32(1));
    handleTransfer(
      createTransferEvent<SeniorTransfer>(ADDR_ZERO, ADDR_ALICE, MINT_AMOUNT, c)
    );

    const snapshotId = generateVaultStateHistoricalId(
      ADDR_SENIOR.toHexString(),
      BLOCK_NUMBER.plus(BigInt.fromI32(1))
    );
    assert.fieldEquals(
      "DayVaultStateHistorical",
      snapshotId,
      "sharesTotalSupply",
      MINT_AMOUNT.toString()
    );
    assert.fieldEquals("DayVaultStateHistorical", snapshotId, "entryIndex", "1");
    // The creation block's row still holds the pre-mint zero — the snapshot stream is a
    // real time series, not a repeated view of the latest state.
    assert.fieldEquals(
      "DayVaultStateHistorical",
      generateVaultStateHistoricalId(ADDR_SENIOR.toHexString(), BLOCK_NUMBER),
      "sharesTotalSupply",
      "0"
    );
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
    // Supply is unchanged, so a snapshot would duplicate the previous row and advance
    // the cursor over nothing. Each event gets its OWN block here: under block keying a
    // same-block transfer could not add a row regardless, so it would pass whether or
    // not the no-op guard exists.
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
    c.blockNumber = BLOCK_NUMBER.plus(BigInt.fromI32(1));
    handleTransfer(createTransferEvent<SeniorTransfer>(ADDR_ZERO, ADDR_ALICE, MINT_AMOUNT, c));
    // 3 creation snapshots (one per tranche) + 1 for this mint, in its own block.
    assert.entityCount("DayVaultStateHistorical", 4);
    assert.fieldEquals("DayVaultState", SENIOR_ID, "lastHistoricalEntryIndex", "1");

    const half = MINT_AMOUNT.div(BigInt.fromI32(2));
    mockConvertToAssets(ADDR_SENIOR, half, claimsOf(4_500));
    const c2 = ctx();
    c2.emitter = ADDR_SENIOR;
    c2.logIndex = BigInt.fromI32(2);
    c2.blockNumber = BLOCK_NUMBER.plus(BigInt.fromI32(2));
    handleTransfer(createTransferEvent<SeniorTransfer>(ADDR_ALICE, ADDR_BOB, half, c2));

    // A THIRD block went by and still no fourth senior row: the guard, not the key.
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
    // entry 1 first and leaves 0 absent forever. The rows are keyed by BLOCK, so the
    // second mint gets its own block; two mints in ONE block would collapse to one row
    // (asserted separately) and this test would prove nothing about density.
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
    c2.blockNumber = BLOCK_NUMBER.plus(BigInt.fromI32(1));
    handleTransfer(createTransferEvent<SeniorTransfer>(ADDR_ZERO, ADDR_ALICE, MINT_AMOUNT, c2));

    const positionId = generatePositionStateId(ADDR_SENIOR.toHexString(), ALICE);
    assert.fieldEquals("DayPositionState", positionId, "lastHistoricalEntryIndex", "1");
    assert.entityCount("DayPositionStateHistorical", 2);
    assert.fieldEquals(
      "DayPositionStateHistorical",
      generatePositionStateHistoricalId(
        ADDR_SENIOR.toHexString(),
        ALICE,
        BLOCK_NUMBER
      ),
      "entryIndex",
      "0"
    );
    assert.fieldEquals(
      "DayPositionStateHistorical",
      generatePositionStateHistoricalId(
        ADDR_SENIOR.toHexString(),
        ALICE,
        BLOCK_NUMBER.plus(BigInt.fromI32(1))
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
    claims.collateralAssets = BigInt.fromI32(7_101);
    claims.lptAssets = BigInt.fromI32(7_102);
    claims.stShares = BigInt.fromI32(7_103);
    claims.nav = BigInt.fromI32(7_104);

    const c = ctx();
    c.emitter = ADDR_SENIOR;
    handleRedeem(createRedeemEvent<SeniorRedeem>(ADDR_ALICE, ADDR_BOB, claims, MINT_AMOUNT, c));

    // TWO legs in v2, not three — the senior and junior asset legs merged into one
    // collateral leg. stShares still gets no row (the senior Transfer carries it).
    assert.entityCount("GlobalTokenTransfer", 2);
    assert.entityCount("GlobalTokenActivity", 2);

    for (let i = 0; i < 2; i++) {
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
    // THE HIGHEST-VALUE ASSERTION HERE. The indices are POSITIONAL: index 0 is always
    // the collateral leg and 1 always the liquidity leg, whether or not either is
    // present. A running counter over the NON-ZERO legs would slide the liquidity leg
    // down to index 0 when collateral is absent, and the leg would then be
    // unrecoverable from Neon — tokenAddress is the only other clue.
    const market = DayMarketFixture.standard();
    deployMarket(market);

    const claims = new Claims();
    claims.collateralAssets = BigInt.zero(); // skipped on-chain too
    claims.lptAssets = BigInt.fromI32(7_103);

    const c = ctx();
    c.emitter = ADDR_SENIOR;
    handleRedeem(createRedeemEvent<SeniorRedeem>(ADDR_ALICE, ADDR_BOB, claims, MINT_AMOUNT, c));

    assert.entityCount("GlobalTokenTransfer", 1);
    // The liquidity leg keeps tokenIndex 1 even though it is the ONLY row written —
    // a counter would have put it at 0.
    assert.fieldEquals(
      "GlobalTokenTransfer",
      generateGlobalTokenTransferId(
        TX_HASH.toHexString(),
        c.logIndex,
        BigInt.fromI32(1)
      ),
      "value",
      "7103"
    );
    assert.notInStore(
      "GlobalTokenTransfer",
      generateGlobalTokenTransferId(
        TX_HASH.toHexString(),
        c.logIndex,
        BigInt.zero()
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
    claims.collateralAssets = BigInt.fromI32(7_101);

    const c = ctx();
    c.emitter = ADDR_SENIOR;
    handleRedeem(createRedeemEvent<SeniorRedeem>(ADDR_ALICE, ADDR_BOB, claims, MINT_AMOUNT, c));

    assert.entityCount("DayPositionState", 0);
    assert.fieldEquals("DayVaultState", SENIOR_ID, "sharesTotalSupply", "0");
  });

  test("the vault cursor does NOT advance on a same-block update, so entryIndex stays dense", () => {
    // The cursor bump belongs to CREATING a block's row, not to writing one. If it fired
    // on every write, a second mint in the same block would push the cursor to 2 while
    // still only 2 rows existed, and the NEXT block's row would be stamped entryIndex 3 —
    // a hole in the stream. Nothing errors; ordering and dense-index readers just break.
    const market = DayMarketFixture.standard();
    deployMarket(market); // creation row for BLOCK_NUMBER, entryIndex 0, cursor 0

    const c1 = ctx();
    c1.emitter = ADDR_SENIOR;
    c1.blockNumber = BLOCK_NUMBER.plus(BigInt.fromI32(1));
    handleTransfer(createTransferEvent<SeniorTransfer>(ADDR_ZERO, ADDR_ALICE, MINT_AMOUNT, c1));
    assert.fieldEquals("DayVaultState", SENIOR_ID, "lastHistoricalEntryIndex", "1");

    // SECOND mint, SAME block: updates that row. The cursor must not move.
    const c2 = ctx();
    c2.emitter = ADDR_SENIOR;
    c2.logIndex = BigInt.fromI32(2);
    c2.blockNumber = BLOCK_NUMBER.plus(BigInt.fromI32(1));
    handleTransfer(createTransferEvent<SeniorTransfer>(ADDR_ZERO, ADDR_BOB, MINT_AMOUNT, c2));
    assert.fieldEquals("DayVaultState", SENIOR_ID, "lastHistoricalEntryIndex", "1");

    // Third mint, NEW block: this is where the drift would surface as entryIndex 3.
    const c3 = ctx();
    c3.emitter = ADDR_SENIOR;
    c3.logIndex = BigInt.fromI32(3);
    c3.blockNumber = BLOCK_NUMBER.plus(BigInt.fromI32(2));
    handleTransfer(createTransferEvent<SeniorTransfer>(ADDR_ZERO, ADDR_ALICE, MINT_AMOUNT, c3));

    assert.fieldEquals("DayVaultState", SENIOR_ID, "lastHistoricalEntryIndex", "2");
    assert.fieldEquals(
      "DayVaultStateHistorical",
      generateVaultStateHistoricalId(
        ADDR_SENIOR.toHexString(),
        BLOCK_NUMBER.plus(BigInt.fromI32(2))
      ),
      "entryIndex",
      "2"
    );
    // Three senior rows (one per block) + two untouched sibling creation rows.
    assert.entityCount("DayVaultStateHistorical", 5);
    // The collapsed block's row holds BOTH of its mints.
    assert.fieldEquals(
      "DayVaultStateHistorical",
      generateVaultStateHistoricalId(
        ADDR_SENIOR.toHexString(),
        BLOCK_NUMBER.plus(BigInt.fromI32(1))
      ),
      "sharesTotalSupply",
      MINT_AMOUNT.times(BigInt.fromI32(2)).toString()
    );
  });
});
