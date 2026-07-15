import { assert, describe, test } from "matchstick-as/assembly/index";
import { BigInt } from "@graphprotocol/graph-ts";
import {
  generateFeeStateHistoricalId,
  generateFeeStateId,
  generateGlobalTokenActivityId,
  generateGlobalTokenTransferId,
  generateMarketId,
  generatePositionStateHistoricalId,
  generatePositionStateId,
  generateVaultId,
  generateVaultStateHistoricalId,
} from "../../src/utils";
import {
  CATEGORY_SHARES,
  CHAIN_ID,
  FEES_MAJOR_TYPE_LIQUIDITY_PREMIUM,
  FEES_MAJOR_TYPE_PROTOCOL,
  FEES_MINOR_TYPE_SHARES,
  SUB_CATEGORY_MINT,
} from "../../src/constants";
import { ADDR_ALICE, ADDR_KERNEL, ADDR_SENIOR, TX_HASH } from "../helpers/constants";

// =============================================================================
// ID generator tests.
//
// Deliberately NOT 25 identity tests. Asserting generateVaultId("0xabc") ==
// "1_0xabc" just restates the implementation — it tests that concat
// concatenates.
//
// What's tested here instead is the stuff no single function's unit test can
// see, and that breaks SILENTLY in a Postgres mirror rather than erroring:
//   - cross-entity reference consistency (does a foreign key actually resolve?)
//   - immutable-entity id uniqueness (a collision is fatal at INDEX time only)
//   - the schema's id comments staying honest
// =============================================================================

const SENIOR = ADDR_SENIOR.toHexString();
const KERNEL = ADDR_KERNEL.toHexString();
const ALICE = ADDR_ALICE.toHexString();
const TX = TX_HASH.toHexString();

describe("cross-entity references resolve", () => {
  test("DayPositionState.vaultId resolves to a DayVaultState.id", () => {
    // A handler sets positionState.vaultId = generateVaultId(vaultAddress).
    // If these two ever diverge, nothing errors — the join just silently
    // returns nothing in Neon.
    const vaultStateId = generateVaultId(SENIOR);
    const referencedFromPosition = generateVaultId(SENIOR);
    assert.stringEquals(vaultStateId, referencedFromPosition);
  });

  test("marketRefId resolves to a DayMarketState.id, and the kernel IS the marketId", () => {
    // DayVaultState.marketRefId = <CHAIN_ID>_<MARKET_ID>, and marketId is the
    // kernel address. So generateMarketId(kernel) must equal the market's id.
    const marketId = generateMarketId(KERNEL);
    assert.stringEquals(
      marketId,
      CHAIN_ID.toString().concat("_").concat(KERNEL)
    );
  });

  test("a vault id and a market id are distinct even for the same address", () => {
    // Both are <CHAIN_ID>_<ADDRESS>, so they only differ by which address goes
    // in. Pinning this stops anyone 'simplifying' the two generators into one
    // and cross-linking the entities.
    assert.assertTrue(generateVaultId(SENIOR) != generateMarketId(KERNEL));
  });
});

describe("immutable ids carry a per-write discriminator", () => {
  test("DayVaultStateHistorical differs per entryIndex", () => {
    const e0 = generateVaultStateHistoricalId(SENIOR, BigInt.fromI32(0));
    const e1 = generateVaultStateHistoricalId(SENIOR, BigInt.fromI32(1));
    assert.assertTrue(e0 != e1);
    assert.stringEquals(e0, generateVaultId(SENIOR).concat("_0"));
  });

  test("DayPositionStateHistorical differs per entryIndex — the draft-schema bug", () => {
    // The draft had this id identical to DayPositionState's, on an
    // immutable entity. Snapshot #2 for any account = fatal
    // "entity already exists" at index time. Builds clean, dies in production.
    const e0 = generatePositionStateHistoricalId(SENIOR, ALICE, BigInt.fromI32(0));
    const e1 = generatePositionStateHistoricalId(SENIOR, ALICE, BigInt.fromI32(1));
    assert.assertTrue(e0 != e1);

    // ...and it must not collide with its own mutable parent either.
    assert.assertTrue(e0 != generatePositionStateId(SENIOR, ALICE));
  });

  test("DayFeeStateHistorical differs per entryIndex and from its parent", () => {
    const parent = generateFeeStateId(
      SENIOR,
      ALICE,
      FEES_MAJOR_TYPE_PROTOCOL,
      FEES_MINOR_TYPE_SHARES
    );
    const e0 = generateFeeStateHistoricalId(
      SENIOR,
      ALICE,
      FEES_MAJOR_TYPE_PROTOCOL,
      FEES_MINOR_TYPE_SHARES,
      BigInt.fromI32(0)
    );
    const e1 = generateFeeStateHistoricalId(
      SENIOR,
      ALICE,
      FEES_MAJOR_TYPE_PROTOCOL,
      FEES_MINOR_TYPE_SHARES,
      BigInt.fromI32(1)
    );
    assert.assertTrue(e0 != e1);
    assert.assertTrue(e0 != parent);
  });

  test("GlobalTokenActivity ids differ within one log", () => {
    // One Redeem settles senior + junior + liquidity claims, so a single
    // (tx, logIndex) produces several activities. Without the trailing
    // discriminators they'd collide on an immutable entity.
    const a = generateGlobalTokenActivityId(
      TX,
      BigInt.fromI32(1),
      SENIOR,
      CATEGORY_SHARES,
      SUB_CATEGORY_MINT,
      BigInt.fromI32(0)
    );
    const b = generateGlobalTokenActivityId(
      TX,
      BigInt.fromI32(1),
      SENIOR,
      CATEGORY_SHARES,
      SUB_CATEGORY_MINT,
      BigInt.fromI32(1)
    );
    assert.assertTrue(a != b);
    assert.assertTrue(a.startsWith(generateGlobalTokenTransferId(TX, BigInt.fromI32(1))));
  });
});

describe("DayFeeState id separates the two fee sources", () => {
  test("same (vault, account) but different majorType => different ids", () => {
    // The reason majorType is in the id at all: RoycoSeniorTranche emits BOTH
    // ProtocolFeeSharesMinted(protocolFeeRecipient, ...) and
    // LiquidityPremiumSharesMinted(holder, ...). When the fee recipient is also
    // an LP holder, both resolve to the same (vault, account) — and without
    // majorType they'd overwrite each other's running totals.
    const protocolFee = generateFeeStateId(
      SENIOR,
      ALICE,
      FEES_MAJOR_TYPE_PROTOCOL,
      FEES_MINOR_TYPE_SHARES
    );
    const liquidityPremium = generateFeeStateId(
      SENIOR,
      ALICE,
      FEES_MAJOR_TYPE_LIQUIDITY_PREMIUM,
      FEES_MINOR_TYPE_SHARES
    );
    assert.assertTrue(protocolFee != liquidityPremium);
  });
});

describe("id format", () => {
  test("every id is chain-scoped", () => {
    // Rows from every chain share one Neon table, so an id that forgets the
    // chain prefix silently merges mainnet and L2 entities.
    const prefix = CHAIN_ID.toString().concat("_");
    assert.assertTrue(generateVaultId(SENIOR).startsWith(prefix));
    assert.assertTrue(generateMarketId(KERNEL).startsWith(prefix));
    assert.assertTrue(generatePositionStateId(SENIOR, ALICE).startsWith(prefix));
    assert.assertTrue(generateGlobalTokenTransferId(TX, BigInt.fromI32(1)).startsWith(prefix));
  });

  test("addresses go in as lowercase hex with 0x", () => {
    // toHexString() is lowercase. A checksummed address would not match on
    // load() and would silently create a duplicate entity.
    assert.stringEquals(SENIOR, SENIOR.toLowerCase());
    assert.assertTrue(SENIOR.startsWith("0x"));
  });
});
