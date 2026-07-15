/**
 * Fails if any generated-but-committed artifact is out of sync with its source.
 *
 * The check is simply: snapshot each artifact, regenerate, and see if anything
 * changed. If regenerating changes a file, the version on disk was stale.
 *
 * Deliberately git-free. Two earlier git-based designs were wrong:
 *   - `git diff --exit-code` reports NOTHING for an untracked file, so a new
 *     generated artifact nobody `git add`ed passed the check vacuously — exactly
 *     the silent drift this exists to catch.
 *   - `git status --porcelain` reports any difference from HEAD, so it also
 *     fires on legitimately-staged new files and can never pass in a package
 *     that hasn't been committed yet.
 * Content comparison has neither failure mode, and it still catches the CI case:
 * an artifact that was never committed doesn't exist at checkout, so
 * regenerating "changes" it from nothing and fails.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PKG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Generated, committed, and therefore drift-checkable. */
const ARTIFACTS = [
  "config/markets/pipeline.template.yaml",
  "tests/generated/abi-signatures.ts",
];

const read = (rel) => {
  const p = path.join(PKG, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
};

const before = new Map(ARTIFACTS.map((a) => [a, read(a)]));

execFileSync(process.execPath, [path.join(PKG, "scripts/generate.mjs")], {
  stdio: "inherit",
  cwd: PKG,
});

const stale = [];
const missing = [];
for (const artifact of ARTIFACTS) {
  const was = before.get(artifact);
  const now = read(artifact);
  if (was === null) missing.push(artifact);
  else if (was !== now) stale.push(artifact);
}

if (stale.length === 0 && missing.length === 0) {
  console.log(`check-drift: OK — ${ARTIFACTS.length} artifacts in sync.`);
  process.exit(0);
}

console.error("\ncheck-drift: FAILED — generated artifacts are out of sync.\n");

if (stale.length) {
  console.error("  Stale — regenerating changed them:");
  for (const f of stale) console.error(`    - ${f}`);
  console.error(
    "\n  A source changed without the artifact being regenerated, or the\n" +
      "  artifact was hand-edited. Never hand-edit these: change the source\n" +
      "  (schema.graphql / abis/ / config/markets/pipeline.config.json), run\n" +
      "  `npm run generate`, and commit the result.\n"
  );
  // The files are already regenerated on disk, so git shows the fix as the diff.
  try {
    const diff = execFileSync("git", ["diff", "--", ...stale], {
      cwd: PKG,
      encoding: "utf8",
    });
    if (diff.trim()) {
      console.error("  What regenerating changed:\n");
      console.error(diff);
    }
  } catch {
    /* not a git repo, or the file is untracked — the message above suffices */
  }
}

if (missing.length) {
  console.error("  Absent before this run — generated but never committed:");
  for (const f of missing) console.error(`    - ${f}`);
  console.error(
    "\n  These are meant to be committed so reviewers can see them and so a\n" +
      "  fresh checkout has a baseline. They exist now — `git add` them.\n"
  );
}

process.exit(1);
