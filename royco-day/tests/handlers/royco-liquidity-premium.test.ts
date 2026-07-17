import {
  assert,
  describe,
  test,
  clearStore,
  beforeEach,
} from "matchstick-as/assembly/index";
import { BigInt } from "@graphprotocol/graph-ts";
import { handleMarketDeploymentCompleted } from "../../src/royco-factory";
import { handleLiquidityPremiumSharesMinted } from "../../src/royco-senior-tranche";
import { LiquidityPremiumSharesMinted as SeniorLiquidityPremium } from "../../generated/templates/RoycoSeniorTranche/RoycoSeniorTranche";
import {
  DeploymentResult,
  createMarketDeploymentCompletedEvent,
} from "../builders/factory";
import { createLiquidityPremiumSharesMintedEvent } from "../builders/tranche";
import { DayMarketFixture, mockDayMarket } from "../mocks";
import { ctx, EventContext } from "../helpers/event";
import {
  ADDR_ALICE,
  ADDR_DEPLOYER,
  ADDR_KERNEL,
  ADDR_SENIOR,
  ADDR_TEMPLATE,
  BLOCK_TIMESTAMP,
  TX_HASH_2,
} from "../helpers/constants";
import {
  generateMarketId,
  generateMarketRecordId,
  generateVaultId,
} from "../../src/utils";

// =============================================================================
// handleLiquidityPremiumSharesMinted — SENIOR-ONLY.
//
// THE LIQUIDITY PREMIUM IS NOT A FEE. This writes a DayLiquidityPremiumSharesMinted-
// History record and advances DayMarketState.countLiquidityPremiumSharesMintedEntries
// — it must NOT touch DayFeeState, and the mint's own Transfer (lower log index)
// already owns the share/position/supply accounting, so it writes none of that.
//
// The stream is a COUNT cursor (write-then-increment, born at 0), unlike the fee's
// last-index cursor — and unlike a fee, each record's `shares` is a standalone mint
// amount, never a running total. `graph build` sees none of this.
// =============================================================================

const KERNEL = ADDR_KERNEL.toHexString();
const SENIOR = ADDR_SENIOR.toHexString();
const TOTAL = BigInt.fromI32(100_000); // totalTrancheShares — RECORDED as sharesTotalSupply

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

/** Emit LiquidityPremiumSharesMinted from the senior tranche. holder is the kernel. */
function emitPremium(minted: BigInt, total: BigInt, c: EventContext): void {
  c.emitter = ADDR_SENIOR;
  handleLiquidityPremiumSharesMinted(
    createLiquidityPremiumSharesMintedEvent<SeniorLiquidityPremium>(
      ADDR_KERNEL, // holder — invariantly the kernel (onlyKernel mint, passes address(this))
      minted,
      total,
      c
    )
  );
}

describe("handleLiquidityPremiumSharesMinted", () => {
  beforeEach(() => {
    clearStore();
  });

  test("first mint opens the record stream at entry 0, market-keyed", () => {
    deployMarket();

    emitPremium(BigInt.fromI32(500), TOTAL, ctx());

    const id = generateMarketRecordId(KERNEL, BigInt.zero());
    assert.entityCount("DayLiquidityPremiumSharesMintedHistory", 1);
    assert.fieldEquals("DayLiquidityPremiumSharesMintedHistory", id, "entryIndex", "0");
    assert.fieldEquals("DayLiquidityPremiumSharesMintedHistory", id, "marketId", KERNEL);
    assert.fieldEquals(
      "DayLiquidityPremiumSharesMintedHistory",
      id,
      "marketRefId",
      generateMarketId(KERNEL)
    );
    // event.address is the SENIOR tranche — the record's vault, not the kernel.
    assert.fieldEquals("DayLiquidityPremiumSharesMintedHistory", id, "vaultAddress", SENIOR);
    assert.fieldEquals(
      "DayLiquidityPremiumSharesMintedHistory",
      id,
      "vaultId",
      generateVaultId(SENIOR)
    );
    // holder is invariantly the kernel: accountAddress == marketId.
    assert.fieldEquals("DayLiquidityPremiumSharesMintedHistory", id, "accountAddress", KERNEL);
    assert.fieldEquals("DayLiquidityPremiumSharesMintedHistory", id, "shares", "500");
    assert.fieldEquals(
      "DayLiquidityPremiumSharesMintedHistory",
      id,
      "sharesTotalSupply",
      "100000"
    );
    assert.fieldEquals(
      "DayLiquidityPremiumSharesMintedHistory",
      id,
      "createdAtBlockTimestamp",
      BLOCK_TIMESTAMP.toString()
    );

    // Cursor advanced 0 -> 1 (write-then-increment).
    assert.fieldEquals(
      "DayMarketState",
      generateMarketId(KERNEL),
      "countLiquidityPremiumSharesMintedEntries",
      "1"
    );
  });

  test("each mint is a standalone record; the cursor climbs and earlier rows are frozen", () => {
    // A record stream, NOT a fee: entry 1's `shares` is the SECOND mint alone, not a
    // running total, and entry 0 is untouched (immutable). Distinct values so an
    // overwrite or an accidental accumulation would show.
    deployMarket();

    emitPremium(BigInt.fromI32(500), BigInt.fromI32(100_000), ctx());

    const c2 = ctx();
    c2.logIndex = BigInt.fromI32(3);
    c2.txHash = TX_HASH_2;
    emitPremium(BigInt.fromI32(300), BigInt.fromI32(100_300), c2);

    assert.entityCount("DayLiquidityPremiumSharesMintedHistory", 2);
    assert.fieldEquals(
      "DayMarketState",
      generateMarketId(KERNEL),
      "countLiquidityPremiumSharesMintedEntries",
      "2"
    );

    const e0 = generateMarketRecordId(KERNEL, BigInt.zero());
    const e1 = generateMarketRecordId(KERNEL, BigInt.fromI32(1));
    // Entry 1 holds the second mint alone — a running total would read 800.
    assert.fieldEquals("DayLiquidityPremiumSharesMintedHistory", e1, "entryIndex", "1");
    assert.fieldEquals("DayLiquidityPremiumSharesMintedHistory", e1, "shares", "300");
    assert.fieldEquals(
      "DayLiquidityPremiumSharesMintedHistory",
      e1,
      "sharesTotalSupply",
      "100300"
    );
    // Entry 0 unchanged by the second mint.
    assert.fieldEquals("DayLiquidityPremiumSharesMintedHistory", e0, "shares", "500");
    assert.fieldEquals(
      "DayLiquidityPremiumSharesMintedHistory",
      e0,
      "sharesTotalSupply",
      "100000"
    );
  });

  test("NOT a fee: writes no DayFeeState, and no share/position/supply", () => {
    // The mint emitted its own Transfer(0x0 -> kernel) at a lower log index, so
    // processTransfer already owns position + supply. A DayFeeState row would be
    // categorically wrong — the premium is not taken from a holder.
    deployMarket();

    emitPremium(BigInt.fromI32(500), TOTAL, ctx());

    assert.entityCount("DayFeeState", 0);
    assert.entityCount("DayFeeStateHistorical", 0);
    assert.entityCount("DayPositionState", 0);
    assert.entityCount("GlobalTokenTransfer", 0);
    // Senior vault supply untouched — still the factory's zero seed.
    assert.fieldEquals("DayVaultState", generateVaultId(SENIOR), "sharesTotalSupply", "0");
  });

  test("a zero-share mint is skipped entirely — no record, cursor stays 0", () => {
    // The contract emits even when 0 shares were minted (the _mint is guarded, the
    // emit is not). A zero mint is not a premium event — it must not burn an
    // entryIndex on a no-op record.
    deployMarket();

    emitPremium(BigInt.zero(), TOTAL, ctx());

    assert.entityCount("DayLiquidityPremiumSharesMintedHistory", 0);
    assert.fieldEquals(
      "DayMarketState",
      generateMarketId(KERNEL),
      "countLiquidityPremiumSharesMintedEntries",
      "0"
    );
  });

  test("an emit from an address with no DayVaultState is a no-op", () => {
    // event.address is resolved to a market via the tranche's own DayVaultState. A
    // stray emitter (no vault) has no market to attach to — write nothing rather
    // than fabricate a row, and leave the real market's cursor alone.
    deployMarket();

    const c = ctx();
    c.emitter = ADDR_ALICE; // not a deployed vault
    handleLiquidityPremiumSharesMinted(
      createLiquidityPremiumSharesMintedEvent<SeniorLiquidityPremium>(
        ADDR_KERNEL,
        BigInt.fromI32(500),
        TOTAL,
        c
      )
    );

    assert.entityCount("DayLiquidityPremiumSharesMintedHistory", 0);
    assert.fieldEquals(
      "DayMarketState",
      generateMarketId(KERNEL),
      "countLiquidityPremiumSharesMintedEntries",
      "0"
    );
  });
});
