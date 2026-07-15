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

test("schema declares the 9 expected entities", () => {
  const entities = readEntities(SCHEMA);
  assert.deepEqual(entities, [
    "GlobalTokenTransfer",
    "GlobalTokenActivity",
    "DayMarketState",
    "DayVaultState",
    "DayVaultStateHistorical",
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

  assert.equal(blocks.length, 5, "expected 5 immutable entities");

  const discriminators = ["<ENTRY_INDEX>", "<LOG_INDEX>"];
  for (const [, name, idComment] of blocks) {
    assert.ok(
      discriminators.some((d) => idComment.includes(d)),
      `${name}: immutable id "${idComment.trim()}" has no per-write discriminator ` +
        `(need one of ${discriminators.join(" / ")}). A second snapshot will collide.`,
    );
  }
});

test("every *Historical entity has an entryIndex paired to a parent cursor", () => {
  const src = fs.readFileSync(SCHEMA, "utf8");
  const typeBlock = (name) => {
    const m = src.match(new RegExp(`^type\\s+${name}\\s+@entity[^{]*\\{([^}]*)\\}`, "m"));
    assert.ok(m, `entity ${name} not found`);
    return m[1];
  };

  for (const [parent, historical] of [
    ["DayVaultState", "DayVaultStateHistorical"],
    ["DayPositionState", "DayPositionStateHistorical"],
    ["DayFeeState", "DayFeeStateHistorical"],
  ]) {
    assert.match(
      typeBlock(historical),
      /^\s*entryIndex:\s*BigInt!/m,
      `${historical} must declare entryIndex`,
    );
    assert.match(
      typeBlock(parent),
      /^\s*lastHistoricalEntryIndex:\s*BigInt!/m,
      `${parent} must declare lastHistoricalEntryIndex (the cursor driving ${historical})`,
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
    const m = src.match(new RegExp(`^type\\s+${name}\\s+@entity[^{]*\\{([^}]*)\\}`, "m"));
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
