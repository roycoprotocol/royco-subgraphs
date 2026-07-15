import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readEntities, toSnakeCase } from "../lib/schema.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCHEMA = path.join(ROOT, "schema.graphql");
const TEMPLATE = path.join(ROOT, "config/markets/pipeline.template.yaml");
const CONFIG = path.join(ROOT, "config/markets/pipeline.config.json");

const template = () => fs.readFileSync(TEMPLATE, "utf8");
const cfg = () => JSON.parse(fs.readFileSync(CONFIG, "utf8"));

test("every wired entity has BOTH a source and a sink", () => {
  // goldsky pipeline apply rejects a source with no matching sink — at DEPLOY
  // time, against production. Catch it here instead.
  const c = cfg();
  const excluded = new Set(c.exclude ?? []);
  const wired = readEntities(SCHEMA).filter((e) => !excluded.has(e));
  const src = template();

  for (const entity of wired) {
    const t = toSnakeCase(entity);
    assert.ok(
      src.includes(`${c.prefix}_${t}_reference:`),
      `${entity}: missing source block (${c.prefix}_${t}_reference)`,
    );
    assert.ok(
      src.includes(`${c.prefix}_${t}_postgres:`),
      `${entity}: missing sink block (${c.prefix}_${t}_postgres)`,
    );
    assert.ok(
      src.includes(`from: ${c.prefix}_${t}_reference`),
      `${entity}: sink is not wired to its source`,
    );
  }
});

test("no sink exists without a schema entity behind it", () => {
  // The inverse drift: a table in Neon that nothing produces.
  const c = cfg();
  const known = new Set(readEntities(SCHEMA).map(toSnakeCase));
  const sinks = [
    ...template().matchAll(new RegExp(`^  ${c.prefix}_(\\w+)_postgres:`, "gm")),
  ].map((m) => m[1]);

  assert.ok(sinks.length > 0, "template has no sinks at all");
  for (const t of sinks) {
    assert.ok(known.has(t), `sink "${t}" has no matching entity in schema.graphql`);
  }
});

test("excluded entities are wired nowhere", () => {
  const c = cfg();
  const src = template();
  for (const entity of c.exclude ?? []) {
    const t = toSnakeCase(entity);
    assert.ok(
      !src.includes(`_${t}_reference:`) && !src.includes(`_${t}_postgres:`),
      `${entity} is in the exclude list but still appears in the template`,
    );
  }
});

test("template keeps the mustache seams prepare depends on", () => {
  const src = template();
  assert.match(src, /^name: \{\{pipelineName\}\}$/m);
  assert.ok(src.includes("{{#metadata}}"), "lost the per-network metadata loop");
  assert.ok(src.includes("{{/metadata}}"));
  assert.ok(src.includes("{{network}}") && src.includes("{{version}}"));
});

test("every sink targets the shared Neon secret and public schema", () => {
  const c = cfg();
  const src = template();
  const sinkCount = [...src.matchAll(/type: postgres/g)].length;
  const secretCount = [...src.matchAll(new RegExp(`secret_name: ${c.secretName}`, "g"))].length;
  const schemaCount = [...src.matchAll(/schema: public/g)].length;
  assert.equal(secretCount, sinkCount, "a sink is missing its secret_name");
  assert.equal(schemaCount, sinkCount, "a sink is missing `schema: public`");
});
