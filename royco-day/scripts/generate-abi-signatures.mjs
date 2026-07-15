/**
 * abis/*.json -> tests/generated/abi-signatures.ts
 *
 * matchstick's createMockedFunction() matches on an exact ethabi signature
 * string. Hand-writing those is untenable here: RoycoDayAccountant.getState()
 * has a 27-member tuple output, and a single wrong character produces
 * "function not mocked" rather than "bad signature" — a genuinely confusing
 * failure to debug.
 *
 * So we derive them with graph-cli's own algorithm (see scripts/lib/abi.mjs)
 * and commit the result. When an ABI gains a struct field, `npm run check:drift`
 * shows exactly which signatures changed instead of leaving a mock silently
 * unmatched.
 *
 * Also emits the yaml `event:` signatures, so subgraph.template.yaml entries can
 * be checked against a generated source of truth rather than hand-transcribed.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  readAbi,
  callableFunctions,
  events,
  functionSignature,
  eventSignature,
} from "./lib/abi.mjs";
import { toSnakeCase } from "./lib/schema.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ABI_DIR = path.join(ROOT, "abis");
const OUT = path.join(ROOT, "tests/generated/abi-signatures.ts");

const constName = (abiName, fnName) =>
  `${toSnakeCase(abiName).toUpperCase()}__${toSnakeCase(fnName).toUpperCase()}`;

const files = fs.readdirSync(ABI_DIR).filter((f) => f.endsWith(".json")).sort();

const lines = [];
const seen = new Set();
let fnCount = 0;
let evCount = 0;

for (const file of files) {
  const abiName = path.basename(file, ".json");
  const abi = readAbi(path.join(ABI_DIR, file));

  const fns = callableFunctions(abi);
  const evs = events(abi);

  lines.push(`// ${"=".repeat(74)}`);
  lines.push(`// ${abiName}  (abis/${file})`);
  lines.push(`// ${"=".repeat(74)}`);
  lines.push("");

  lines.push(`// --- callable functions (${fns.length}) — view/pure/nonpayable/constant ---`);
  for (const fn of fns) {
    // Overloads collapse to the same const name; suffix to disambiguate.
    let name = constName(abiName, fn.name);
    if (seen.has(name)) {
      let i = 1;
      while (seen.has(`${name}__${i}`)) i++;
      name = `${name}__${i}`;
    }
    seen.add(name);
    lines.push(`export const ${name}: string =`);
    lines.push(`  "${functionSignature(fn)}";`);
    fnCount++;
  }
  lines.push("");

  if (evs.length) {
    lines.push(
      `// --- event signatures (${evs.length}) — these are the strings for subgraph.template.yaml \`event:\` ---`,
    );
    for (const ev of evs) {
      let name = `${constName(abiName, ev.name)}__EVENT`;
      if (seen.has(name)) continue;
      seen.add(name);
      lines.push(`export const ${name}: string =`);
      lines.push(`  "${eventSignature(ev)}";`);
      evCount++;
    }
    lines.push("");
  }
}

const header = `// ${"=".repeat(74)}
// GENERATED FILE — DO NOT EDIT.
//
// Produced by scripts/generate-abi-signatures.mjs from abis/*.json, using
// graph-cli's own signature algorithm (scripts/lib/abi.mjs mirrors
// @graphprotocol/graph-cli/dist/protocols/ethereum/abi.js).
//
// Regenerate with \`npm run generate\`. Drift is caught by \`npm run check:drift\`.
//
// Contains every function graph codegen emits a binding for: view, pure,
// nonpayable and constant. Only \`payable\` is excluded (the sole payable
// function across these ABIs is upgradeToAndCall). See CLAUDE.md §5.
// ${"=".repeat(74)}

`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, header + lines.join("\n") + "\n");
console.log(
  `generate-abi-signatures: ${fnCount} functions + ${evCount} events from ${files.length} ABIs -> ${path.relative(ROOT, OUT)}`,
);
