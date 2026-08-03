import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readEntities, toSnakeCase } from "../lib/schema.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCHEMA = path.join(ROOT, "schema.graphql");

test("toSnakeCase matches graph-node's Inflector on regular camelCase", () => {
  assert.equal(toSnakeCase("DayVaultState"), "day_vault_state");
  assert.equal(toSnakeCase("GlobalTokenTransfer"), "global_token_transfer");
  assert.equal(
    toSnakeCase("DayPositionStateHistorical"),
    "day_position_state_historical",
  );
});

test("toSnakeCase splits acronym boundaries — the case a naive regex fails", () => {
  // A single /([a-z\d])([A-Z])/ pass yields "day_navstate" / "raw_multiplier_apoffer".
  // graph-node's Inflector splits the acronym. The two-step order is load-bearing.
  assert.equal(toSnakeCase("DayNAVState"), "day_nav_state");
  assert.equal(toSnakeCase("RawMultiplierAPOffer"), "raw_multiplier_ap_offer");
  assert.equal(toSnakeCase("DayYDMState"), "day_ydm_state");
});

test("toSnakeCase handles a trailing acronym", () => {
  assert.equal(toSnakeCase("SharePriceNAV"), "share_price_nav");
  assert.equal(toSnakeCase("MinCoverageWAD"), "min_coverage_wad");
});

test("toSnakeCase leaves digits attached to their word", () => {
  assert.equal(toSnakeCase("Erc20Token"), "erc20_token");
});

test("schema declares the 20 expected entities", () => {
  const entities = readEntities(SCHEMA);
  assert.deepEqual(entities, [
    "GlobalTokenTransfer",
    "GlobalTokenActivity",
    "DayMarketState",
    "DayAccountantMarketMap",
    "DayMarketNav",
    "DayMarketNavHistorical",
    "DayVaultState",
    "DayVaultStateHistorical",
    "DayFixedTermHistory",
    "DayYieldSharesAccruedHistory",
    "DayTrancheAccountingSyncedHistory",
    "DayLiquidityPremiumSharesMintedHistory",
    "DayLiquidityPremiumReinvestedHistory",
    "DayLiquidityPremiumReinvestmentFailedHistory",
    "DayMultiAssetDepositActivity",
    "DayMultiAssetRedeemActivity",
    "DayPositionState",
    "DayPositionStateHistorical",
    "DayFeeState",
    "DayFeeStateHistorical",
  ]);
});

test("every immutable entity's id carries a per-write discriminator", () => {
  // An @entity(immutable: true) is write-once: a second save() on the same id is
  // a fatal "entity already exists" at INDEX time — it passes `graph build` and
  // dies in production. This is the exact bug the draft schema shipped with, on
  // DayPositionStateHistorical and DayFeeStateHistorical.
  const src = fs.readFileSync(SCHEMA, "utf8");
  const blocks = [
    ...src.matchAll(
      /^type\s+(\w+)\s+@entity\(immutable:\s*true\)\s*\{\s*\n\s*id:\s*String!\s*#\s*(.+)$/gm,
    ),
  ];

  // Nine immutable entities: four per-log rows, four cursor-keyed record streams,
  // and one factory-owned lookup row.
  //
  //   - The four per-log activity/transfer rows, whose ids carry a <LOG_INDEX> and
  //     genuinely can never repeat.
  //   - The four immutable record streams — the three liquidity-premium ones plus
  //     DayYieldSharesAccruedHistory — whose ids carry an <ENTRY_INDEX> from a
  //     use-then-increment cursor, so every event gets a fresh id.
  // The *Historical SNAPSHOT tables are deliberately NOT here: they collapse to one row
  // per block, so a later write in the block updates the earlier rather than appending,
  // and their block-keyed ids are exactly the collision this check exists to prevent.
  // See "BLOCK-KEYED HISTORY" in schema.graphql. DayFixedTermHistory is entryIndex-keyed
  // but also correctly absent — it is mutable because the term close patches a row
  // opened in an earlier block.
  assert.equal(blocks.length, 9, "expected 9 immutable entities");

  // The factory writes this immutable accountant-keyed lookup once per market.
  const SINGLE_WRITE_BY_CONSTRUCTION = new Set(["DayAccountantMarketMap"]);

  const discriminators = ["<ENTRY_INDEX>", "<LOG_INDEX>"];
  for (const [, name, idComment] of blocks) {
    if (SINGLE_WRITE_BY_CONSTRUCTION.has(name)) continue;
    assert.ok(
      discriminators.some((d) => idComment.includes(d)),
      `${name}: immutable id "${idComment.trim()}" has no per-write discriminator ` +
        `(need one of ${discriminators.join(" / ")}). A second snapshot will collide.`,
    );
  }

  const declared = new Set(blocks.map(([, name]) => name));
  for (const name of SINGLE_WRITE_BY_CONSTRUCTION) {
    assert.ok(
      declared.has(name),
      `${name} is exempted from the discriminator check but is no longer an ` +
        `immutable entity. Drop the exemption.`,
    );
  }
});

test("block-keyed streams order by blockNumber and carry NO entryIndex cursor", () => {
  const src = fs.readFileSync(SCHEMA, "utf8");
  // Body captured lazily up to a closing brace AT COLUMN 0 (house style for every
  // entity), not with `[^}]*`. A `}` inside a field comment truncates the latter
  // mid-entity, and the resulting failure claims a field is missing when it is
  // declared a few lines below the cut — a genuinely misleading half hour.
  const typeBlock = (name) => {
    const m = src.match(
      new RegExp(`^type\\s+${name}\\s+@entity[^{]*\\{([\\s\\S]*?)\\n\\}`, "m"),
    );
    assert.ok(m, `entity ${name} not found`);
    return m[1];
  };

  // Every block-collapsed stream. Each is keyed <...>_<BLOCK_NUMBER> and ordered by
  // its own blockNumber column; NONE of them carries an entryIndex any more, and no
  // parent carries a cursor. See "BLOCK-KEYED HISTORY" in schema.graphql.
  const BLOCK_KEYED = [
    "DayMarketNavHistorical",
    "DayVaultStateHistorical",
    "DayPositionStateHistorical",
    "DayFeeStateHistorical",
    "DayTrancheAccountingSyncedHistory",
  ];

  for (const historical of BLOCK_KEYED) {
    const body = typeBlock(historical);
    // The ordering column MUST exist: it is the only thing these rows can be sorted
    // by now, and it is stored so consumers never have to parse it out of the id.
    assert.match(
      body,
      /^\s*blockNumber:\s*BigInt!/m,
      `${historical} must declare blockNumber — it is the ordering column`,
    );
    // And the cursor must NOT come back. It was removed deliberately: with the id
    // already keyed on the block it carried no extra information, and it had to be
    // advanced on creation but NOT on same-block updates — an invariant that fails
    // silently and leaves gaps in an index the schema would be promising is dense.
    assert.doesNotMatch(
      body,
      /^\s*entryIndex:\s*BigInt!/m,
      `${historical} is block-keyed and must NOT declare entryIndex — order by blockNumber`,
    );
  }

  for (const parent of [
    "DayMarketNav",
    "DayVaultState",
    "DayPositionState",
    "DayFeeState",
  ]) {
    assert.doesNotMatch(
      typeBlock(parent),
      /^\s*lastHistoricalEntryIndex:\s*BigInt!/m,
      `${parent} must NOT declare lastHistoricalEntryIndex — its historical is block-keyed`,
    );
  }

  // THE EXCEPTIONS, asserted positively so they cannot be swept away by a future
  // "clean up the cursors" pass. These four keep EVERY event as its own row:
  // DayFixedTermHistory because a term spans blocks and the close patches a row opened
  // earlier; the three premium streams because each event is a distinct economic act
  // and a block can hold several.
  const ENTRY_KEYED = [
    ["DayFixedTermHistory", "countFixedTermEntries"],
    ["DayYieldSharesAccruedHistory", "countYieldSharesAccruedEntries"],
    ["DayLiquidityPremiumSharesMintedHistory", "countLiquidityPremiumSharesMintedEntries"],
    ["DayLiquidityPremiumReinvestedHistory", "countLiquidityPremiumReinvestedEntries"],
    [
      "DayLiquidityPremiumReinvestmentFailedHistory",
      "countLiquidityPremiumReinvestmentFailedEntries",
    ],
  ];
  const marketBody = typeBlock("DayMarketState");
  for (const [entity, cursor] of ENTRY_KEYED) {
    assert.match(
      typeBlock(entity),
      /^\s*entryIndex:\s*BigInt!/m,
      `${entity} keeps every event as its own row and must declare entryIndex`,
    );
    assert.match(
      marketBody,
      new RegExp(`^\\s*${cursor}:\\s*BigInt!`, "m"),
      `DayMarketState must declare ${cursor} — the cursor driving ${entity}`,
    );
    // A per-write id needs a per-write discriminator, so it must NOT be block-keyed.
    assert.doesNotMatch(
      typeBlock(entity),
      /^\s*blockNumber:\s*BigInt!/m,
      `${entity} is entryIndex-keyed; a blockNumber column here implies collapsing`,
    );
  }
});

test("global entities stay byte-identical to royco-rwa's — frozen shared-table contract", () => {
  // royco-rwa (5 pipelines), royco-usd and staked-royco-usd all sink these two
  // entities into the SAME Neon tables (public.global_token_transfer /
  // public.global_token_activity, secret NEON_ROYCO_ESTATE). Field drift here
  // breaks THEIR pipelines, not just ours.
  const rwaSchema = path.join(ROOT, "../royco-rwa/schema.graphql");
  if (!fs.existsSync(rwaSchema)) {
    // Sibling package absent (e.g. sparse checkout) — skip rather than fail.
    return;
  }

  const fieldsOf = (file, name) => {
    const src = fs.readFileSync(file, "utf8");
    // Same lazy-to-column-0-brace form as typeBlock above, and for the same reason.
    const m = src.match(
      new RegExp(`^type\\s+${name}\\s+@entity[^{]*\\{([\\s\\S]*?)\\n\\}`, "m"),
    );
    assert.ok(m, `${name} not found in ${file}`);
    return m[1]
      .split("\n")
      .map((l) => l.replace(/#.*$/, "").trim()) // drop comments
      .filter(Boolean);
  };

  for (const entity of ["GlobalTokenTransfer", "GlobalTokenActivity"]) {
    assert.deepEqual(
      fieldsOf(SCHEMA, entity),
      fieldsOf(rwaSchema, entity),
      `${entity} has drifted from royco-rwa's definition. These sink to the same ` +
        `shared Neon table — reconcile with royco-rwa/schema.graphql before changing it.`,
    );
  }
});
