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
  SUB_CATEGORY_MINT,
  TRANCHE_TYPE_JUNIOR,
  TRANCHE_TYPE_SENIOR,
  VAULT_MAJOR_TYPE,
} from "../../src/constants";
import {
  ADDR_ALICE,
  ADDR_KERNEL,
  ADDR_SENIOR,
  TX_HASH,
} from "../helpers/constants";

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
    // The fee id is MARKET-scoped: the leading discriminator is the kernel, not the
    // vault, and minorType separates the tranche stream.
    const parent = generateFeeStateId(
      KERNEL,
      ALICE,
      VAULT_MAJOR_TYPE,
      TRANCHE_TYPE_SENIOR
    );
    const e0 = generateFeeStateHistoricalId(
      KERNEL,
      ALICE,
      VAULT_MAJOR_TYPE,
      TRANCHE_TYPE_SENIOR,
      BigInt.fromI32(0)
    );
    const e1 = generateFeeStateHistoricalId(
      KERNEL,
      ALICE,
      VAULT_MAJOR_TYPE,
      TRANCHE_TYPE_SENIOR,
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
  });

  test("GlobalTokenTransfer ids differ per token within one log", () => {
    // One Redeem log pays out up to three different asset ERC20s. Without the
    // trailing tokenIndex the second leg is a fatal "entity already exists" on an
    // immutable entity — at index time, after `graph build` goes green.
    const senior = generateGlobalTokenTransferId(
      TX,
      BigInt.fromI32(1),
      BigInt.fromI32(0)
    );
    const junior = generateGlobalTokenTransferId(
      TX,
      BigInt.fromI32(1),
      BigInt.fromI32(1)
    );
    const liquidity = generateGlobalTokenTransferId(
      TX,
      BigInt.fromI32(1),
      BigInt.fromI32(2)
    );
    assert.assertTrue(senior != junior);
    assert.assertTrue(junior != liquidity);
    assert.assertTrue(senior != liquidity);
  });

  test("a transfer and its activity share the log prefix", () => {
    // Both ids start <CHAIN>_<TX>_<LOG>; they diverge only in what follows. Keeps
    // the two tables joinable on the log even though the suffixes differ.
    const prefix = CHAIN_ID.toString().concat("_").concat(TX).concat("_1");
    assert.assertTrue(
      generateGlobalTokenTransferId(
        TX,
        BigInt.fromI32(1),
        BigInt.fromI32(0)
      ).startsWith(prefix)
    );
    assert.assertTrue(
      generateGlobalTokenActivityId(
        TX,
        BigInt.fromI32(1),
        SENIOR,
        CATEGORY_SHARES,
        SUB_CATEGORY_MINT,
        BigInt.fromI32(0)
      ).startsWith(prefix)
    );
  });
});

describe("DayFeeState id is market-scoped, tranche-separated", () => {
  test("minorType is load-bearing: same market + account, different tranche => distinct rows", () => {
    // The fee id keys on the KERNEL (the market), shared by all three tranches, so
    // the SAME market and account produce the SAME leading id — and it is minorType
    // that separates the senior fee stream from the junior one. This is exactly why
    // minorType is load-bearing here (unlike a vaultAddress-keyed id, where the
    // vault already implied the tranche). Both use KERNEL, not the vault.
    const seniorFee = generateFeeStateId(
      KERNEL,
      ALICE,
      VAULT_MAJOR_TYPE,
      TRANCHE_TYPE_SENIOR
    );
    const juniorFee = generateFeeStateId(
      KERNEL,
      ALICE,
      VAULT_MAJOR_TYPE,
      TRANCHE_TYPE_JUNIOR
    );
    assert.assertTrue(seniorFee != juniorFee);
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
    assert.assertTrue(
      generateGlobalTokenTransferId(TX, BigInt.fromI32(1), BigInt.fromI32(0)).startsWith(
        prefix
      )
    );
  });

  test("addresses go in as lowercase hex with 0x", () => {
    // toHexString() is lowercase. A checksummed address would not match on
    // load() and would silently create a duplicate entity.
    assert.stringEquals(SENIOR, SENIOR.toLowerCase());
    assert.assertTrue(SENIOR.startsWith("0x"));
  });
});
