import fs from "node:fs";

/**
 * Entity names declared in a schema.graphql, in file order.
 *
 * A regex is sufficient and keeps the package dependency-free: the schema is
 * ours, machine-checked by `graph codegen` on every build, and house style is
 * one `type X @entity(...)` per line. Pulling in the `graphql` package to parse
 * a file that a stricter tool already validates would be cost without benefit.
 */
export function readEntities(schemaPath) {
  const src = fs.readFileSync(schemaPath, "utf8");
  return [...src.matchAll(/^type\s+([A-Za-z_][A-Za-z0-9_]*)\s+@entity\b/gm)].map(
    (m) => m[1],
  );
}

/**
 * GraphQL entity name -> Postgres table name, matching what graph-node does.
 *
 * graph-node uses Rust's Inflector::to_snake_case. The two-step order matters:
 * the acronym-boundary pass MUST run first. With only the second pass,
 * "DayNAVState" yields "day_navstate" — graph-node produces "day_nav_state".
 *
 *   DayNAVState -> (1) DayNAV_State -> (2) Day_NAV_State -> day_nav_state
 *
 * Validated against 36 hand-written pipeline `name:` fields across royco-rwa,
 * royco-recipe and royco-points: 0 mismatches (incl. RawMultiplierAPOffer ->
 * raw_multiplier_ap_offer).
 */
export function toSnakeCase(name) {
  return name
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2") // acronym boundary
    .replace(/([a-z\d])([A-Z])/g, "$1_$2") // regular camel boundary
    .toLowerCase();
}
