/**
 * schema.graphql -> config/markets/pipeline.template.yaml
 *
 * Replaces the ~370 lines of hand-written, hand-maintained source/sink pairs
 * that royco-rwa carries (config/markets-v2/pipeline.template.yaml). Every block
 * there is a mechanical snake_case derivation of a schema entity name, which is
 * exactly the kind of thing a human should never be diffing by eye.
 *
 * The output is still a mustache template: {{pipelineName}} and the
 * {{#metadata}} network loop are filled in later by `npm run prepare:*` from
 * config/markets/metadata.json.
 *
 * Run via `npm run generate`. Drift is caught by `npm run check:drift`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readEntities, toSnakeCase } from "./lib/schema.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA = path.join(ROOT, "schema.graphql");
const CONFIG = path.join(ROOT, "config/markets/pipeline.config.json");
const OUT = path.join(ROOT, "config/markets/pipeline.template.yaml");

const cfg = JSON.parse(fs.readFileSync(CONFIG, "utf8"));
const entities = readEntities(SCHEMA);
const excluded = new Set(cfg.exclude ?? []);

const unknown = [...excluded].filter((e) => !entities.includes(e));
if (unknown.length) {
  console.error(
    `pipeline.config.json "exclude" names entities that do not exist in schema.graphql: ${unknown.join(", ")}`,
  );
  process.exit(1);
}

const wired = entities.filter((e) => !excluded.has(e));
if (wired.length === 0) {
  console.error("No entities to wire — refusing to emit an empty pipeline.");
  process.exit(1);
}

const source = (entity) => {
  const t = toSnakeCase(entity);
  return `  ${cfg.prefix}_${t}_reference:
    name: ${t}
    subgraphs:
      {{#metadata}}
      - name: ${cfg.subgraphNamePrefix}-{{network}}
        version: {{version}}
      {{/metadata}}
    type: subgraph_entity`;
};

const sink = (entity) => {
  const t = toSnakeCase(entity);
  return `  ${cfg.prefix}_${t}_postgres:
    type: postgres
    table: ${t}
    schema: public
    secret_name: ${cfg.secretName}
    description: "Postgres sink for: ${t}"
    from: ${cfg.prefix}_${t}_reference`;
};

const yaml = `# prettier-ignore
# =============================================================================
# GENERATED FILE — DO NOT EDIT.
#
# Produced by scripts/generate-pipeline-template.mjs from:
#   - schema.graphql               (the entity list)
#   - config/markets/pipeline.config.json  (prefix, secret, exclude list)
#
# To change it, edit one of those and run \`npm run generate\`.
# A hand-edit here is reverted by the next generate and caught by
# \`npm run check:drift\`.
#
# Entities wired: ${wired.length}${excluded.size ? ` (excluded: ${[...excluded].join(", ")})` : ""}
# =============================================================================
apiVersion: 3
name: {{pipelineName}}
resource_size: ${cfg.resourceSize}
sources:
${wired.map(source).join("\n")}
transforms: {}
sinks:
${wired.map(sink).join("\n")}
`;

fs.writeFileSync(OUT, yaml);
console.log(
  `generate-pipeline-template: ${wired.length} entities -> ${path.relative(ROOT, OUT)}` +
    (excluded.size ? ` (excluded ${excluded.size})` : ""),
);
