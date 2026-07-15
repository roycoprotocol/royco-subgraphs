/**
 * Runs every generator. Single entry point so `npm run check:drift` is exactly
 * "regenerate everything, then `git diff --exit-code`" — one mechanism covering
 * all generated-but-committed artifacts.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

for (const script of [
  "generate-pipeline-template.mjs",
  "generate-abi-signatures.mjs",
]) {
  execFileSync(process.execPath, [path.join(HERE, script)], {
    stdio: "inherit",
  });
}
