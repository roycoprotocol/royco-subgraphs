# Handler test template

Copy into `tests/handlers/<contract>.test.ts` and replace the `<PLACEHOLDERS>`.

**This file is `.md`, not `.test.ts`, on purpose.** Matchstick discovers
`*.test.ts` recursively and would compile a template full of placeholder imports,
failing the whole suite.

## Rules

1. **`clearStore()` in `beforeEach`, never `afterAll`.** `afterAll` leaks state
   between `describe` blocks in the same file.
2. **Build the fixture INSIDE each `test()` body — never in a `describe`-scope
   `let`.** A test callback that reads an outer variable is a closure, and
   AssemblyScript has none: it fails to compile with `ERROR AS100: Not
   implemented: Closures` (CLAUDE.md §3). Module-level `const`s are fine — those
   are globals, not captures. Factor the shared setup into a module-level
   function and call it from each test; see `royco-factory.test.ts`.
3. **Mock every view the handler touches, before calling it.** An unmocked call
   aborts the handler and matchstick reports it as a failed assertion — which
   reads like a logic bug and sends you hunting in the wrong place.
   `mockDayMarket(DayMarketFixture.standard())` covers the whole market surface.
4. **Never let a test's meaning depend on a call being UNMOCKED.** matchstick-as
   0.6.0 has `clearStore()` but no `clearMockedFunctions` — mocks registered by
   *other tests* survive `beforeEach`, keyed by (address, fn, signature, args).
   So "the handler would abort on the wrong input" is not a real assertion: some
   earlier test probably mocked that input already, and the wrong call quietly
   succeeds. Assert a **sentinel value that only this test registers** instead.
   `royco-factory.test.ts`'s decimals test shows the pattern — and a mutation
   escaped it until it was written that way.
5. **Start from `DayMarketFixture.standard()`** and mutate only the field under
   test. An all-zeros market hides division-by-zero and "is it just defaulting?"
   bugs.
6. **Never hardcode an entity id.** Build it with the `src/utils` generator. A
   hardcoded id that drifts from the generator passes while production breaks.
7. **Give every field a distinct value.** Shared values hide transpositions —
   this is the single most important rule in this harness (see
   `tests/harness/` for why).
8. **Assert `createdAt*` is NOT re-stamped on update.** Re-stamping builds fine,
   indexes fine, and silently destroys every cohort query in Neon. Test 2 below
   exists for exactly this.

## Template

```ts
import {
  assert,
  describe,
  test,
  clearStore,
  beforeEach,
} from "matchstick-as/assembly/index";
import { BigInt } from "@graphprotocol/graph-ts";
import { handle<EVENT> } from "../../src/<contract>";
import { create<EVENT>Event } from "../builders/<contract>";
import { DayMarketFixture, mockDayMarket } from "../mocks";
import { ctx } from "../helpers/event";
import {
  ADDR_ALICE,
  ADDR_KERNEL,
  ADDR_SENIOR,
  BLOCK_TIMESTAMP,
} from "../helpers/constants";
import { generateVaultId } from "../../src/utils";

describe("handle<EVENT>", () => {
  beforeEach(() => {
    clearStore();
  });

  test("creates <ENTITY> on the first event", () => {
    mockDayMarket(DayMarketFixture.standard());

    const c = ctx();
    c.emitter = ADDR_SENIOR; // the emitting contract drives the handler's lookup

    handle<EVENT>(create<EVENT>Event(/* args */, c));

    const id = generateVaultId(ADDR_SENIOR.toHexString());
    assert.entityCount("<ENTITY>", 1);
    assert.fieldEquals("<ENTITY>", id, "marketId", ADDR_KERNEL.toHexString());
    assert.fieldEquals(
      "<ENTITY>",
      id,
      "createdAtBlockTimestamp",
      c.blockTimestamp.toString()
    );
    // On creation, updatedAt* == createdAt*.
    assert.fieldEquals(
      "<ENTITY>",
      id,
      "updatedAtBlockTimestamp",
      c.blockTimestamp.toString()
    );
  });

  test("second event updates without duplicating, and does not re-stamp createdAt", () => {
    const first = ctx();
    first.emitter = ADDR_SENIOR;
    handle<EVENT>(create<EVENT>Event(/* args */, first));

    const second = ctx();
    second.emitter = ADDR_SENIOR;
    second.blockTimestamp = BLOCK_TIMESTAMP.plus(BigInt.fromI32(3600));
    second.txHash = TX_HASH_2;
    handle<EVENT>(create<EVENT>Event(/* different args */, second));

    const id = generateVaultId(ADDR_SENIOR.toHexString());
    assert.entityCount("<ENTITY>", 1);
    // createdAt* pinned to the FIRST event...
    assert.fieldEquals(
      "<ENTITY>",
      id,
      "createdAtBlockTimestamp",
      first.blockTimestamp.toString()
    );
    // ...updatedAt* moved to the second.
    assert.fieldEquals(
      "<ENTITY>",
      id,
      "updatedAtBlockTimestamp",
      second.blockTimestamp.toString()
    );
  });

  test("appends a historical snapshot and advances the cursor", () => {
    // Creation snapshot is entry 0 and sets lastHistoricalEntryIndex = 0;
    // each later snapshot writes +1. Total = lastHistoricalEntryIndex + 1.
    // Delete this test if the handler writes no *Historical entity.
    const c = ctx();
    c.emitter = ADDR_SENIOR;
    handle<EVENT>(create<EVENT>Event(/* args */, c));

    const parentId = generateVaultId(ADDR_SENIOR.toHexString());
    assert.fieldEquals("<ENTITY>", parentId, "lastHistoricalEntryIndex", "0");
    assert.entityCount("<ENTITY>Historical", 1);
    assert.fieldEquals(
      "<ENTITY>Historical",
      generateVaultStateHistoricalId(
        ADDR_SENIOR.toHexString(),
        BigInt.fromI32(0)
      ),
      "entryIndex",
      "0"
    );
  });

  test("no-op when the market is unknown", () => {
    // THE TEST PEOPLE FORGET. Every handler that resolves a market must return
    // early when the lookup misses — events can arrive before the market entity
    // exists (reorgs, a startBlock mid-history, a template created late). That
    // early-return path is where ordering bugs live.
    clearStore(); // market never created
    const c = ctx();
    c.emitter = ADDR_SENIOR;

    handle<EVENT>(create<EVENT>Event(/* args */, c));

    assert.entityCount("<ENTITY>", 0);
  });
});
```
