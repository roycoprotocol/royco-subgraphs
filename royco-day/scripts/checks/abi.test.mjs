import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  readAbi,
  callableFunctions,
  functionSignature,
  events,
  eventSignature,
} from "../lib/abi.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const abi = (name) => readAbi(path.join(ROOT, "abis", `${name}.json`));

const TRANCHES = [
  "RoycoSeniorTranche",
  "RoycoJuniorTranche",
  "RoycoLiquidityTranche",
];

/**
 * The views handleMarketDeploymentCompleted calls on all three tranches through
 * ONE binding class. See the note on createVault in src/royco-factory.ts.
 */
const SHARED_VIEWS = [
  "asset",
  "decimals",
  "totalSupply",
  "convertToAssets",
  "TRANCHE_TYPE",
  "KERNEL",
];

test("the three tranches' shared view surfaces are byte-identical", () => {
  // src/royco-factory.ts binds all three tranches with the RoycoSeniorTranche
  // class. That is safe ONLY while these signatures agree: a graph-ts binding is
  // an address plus a signature string, so if (say) RoycoJuniorTranche's
  // convertToAssets ever changed shape, the shared binding would keep sending
  // Senior's selector — an eth_call that reverts, taking the handler and the
  // whole subgraph down with it.
  //
  // If this fails: do NOT relax it. Either bind that tranche with its own
  // generated class, or split createVault per tranche.
  const sigsFor = (name) => {
    const fns = callableFunctions(abi(name));
    const picked = new Map();
    for (const fn of fns) {
      if (SHARED_VIEWS.includes(fn.name)) picked.set(fn.name, functionSignature(fn));
    }
    return picked;
  };

  const senior = sigsFor("RoycoSeniorTranche");

  for (const view of SHARED_VIEWS) {
    assert.ok(
      senior.has(view),
      `RoycoSeniorTranche is missing ${view}() — the shared binding in ` +
        `src/royco-factory.ts calls it. Did the ABI change?`,
    );
  }

  for (const tranche of TRANCHES.slice(1)) {
    const other = sigsFor(tranche);
    for (const view of SHARED_VIEWS) {
      assert.equal(
        other.get(view),
        senior.get(view),
        `${tranche}.${view}() has drifted from RoycoSeniorTranche.${view}(). ` +
          `src/royco-factory.ts binds all three tranches with the ` +
          `RoycoSeniorTranche class, so this drift would send the wrong ` +
          `selector at index time.`,
      );
    }
  }
});

/**
 * The events whose handlers are SHARED across all three tranches — implemented
 * once in src/handlers/tranche/ and delegated to from each entry file.
 *
 * LiquidityPremiumSharesMinted (senior-only) and MultiAsset* (liquidity-only) are
 * deliberately absent: one implementation each, no sharing, nothing to drift.
 */
const SHARED_EVENTS = ["Transfer", "Deposit", "Redeem", "ProtocolFeeSharesMinted"];

/** `Deposit(indexed address,indexed address,uint256,uint256)` — the topic0 preimage,
 *  and byte-for-byte the `event:` string in the manifest. TYPES ONLY, no names. */
const eventSigsFor = (name) => {
  const picked = new Map();
  for (const e of events(abi(name))) {
    if (SHARED_EVENTS.includes(e.name)) picked.set(e.name, eventSignature(e));
  }
  return picked;
};

/** `sender,receiver,claims(stAssets,jtAssets,ltAssets,stShares,nav),shares` — the
 *  names eventSignature() throws away. codegen turns each into a named getter, and
 *  the entry files read them BY NAME. */
const memberNamesFor = (name) => {
  const path = (input) =>
    (input.components ?? []).length > 0
      ? `${input.name}(${input.components.map(path).join(",")})`
      : input.name;
  const picked = new Map();
  for (const e of events(abi(name))) {
    if (SHARED_EVENTS.includes(e.name))
      picked.set(e.name, (e.inputs ?? []).map(path).join(","));
  }
  return picked;
};

test("the three tranches' shared event surfaces are byte-identical", () => {
  // src/handlers/tranche/ implements Transfer/Deposit/Redeem ONCE for all three
  // tranches. Each entry file decodes with its OWN generated class and passes
  // primitives in, so `asc` catches a member that DISAPPEARS or is RENAMED —
  // in the drifting tranche's own file.
  //
  // asc is blind to the other two drifts, and this test is the only thing
  // standing between them and production:
  //   - a WIDTH change (uint256 -> uint128 both codegen to BigInt)
  //   - a TRANSPOSITION of two same-typed members: swap `from`/`to`, or
  //     `stAssets`/`jtAssets` inside the claims tuple, and all three files
  //     compile clean while the numbers land in the wrong column forever.
  //
  // If this fails: do NOT relax it. Split the shared handler and give the
  // drifted tranche its own implementation in its entry file.
  const seniorSigs = eventSigsFor("RoycoSeniorTranche");
  const seniorNames = memberNamesFor("RoycoSeniorTranche");

  for (const event of SHARED_EVENTS) {
    assert.ok(
      seniorSigs.has(event),
      `RoycoSeniorTranche is missing ${event} — src/handlers/tranche/ shares a ` +
        `handler for it across all three tranches. Did the ABI change?`,
    );
  }

  for (const tranche of TRANCHES.slice(1)) {
    const sigs = eventSigsFor(tranche);
    const names = memberNamesFor(tranche);
    for (const event of SHARED_EVENTS) {
      assert.equal(
        sigs.get(event),
        seniorSigs.get(event),
        `${tranche}.${event} has drifted from RoycoSeniorTranche.${event}. Its ` +
          `handler is shared from src/handlers/tranche/, so this changes both the ` +
          `topic0 and the decoded shape — for that tranche only.`,
      );
      assert.equal(
        names.get(event),
        seniorNames.get(event),
        `${tranche}.${event}'s member NAMES have drifted from ` +
          `RoycoSeniorTranche.${event}'s. The signature still matches, so topic0 is ` +
          `unchanged and this indexes SILENTLY — but codegen's getters are named, ` +
          `and the entry files read them by name.`,
      );
    }
  }
});
