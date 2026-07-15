---
description: Run prepare → codegen → build → tests in the correct order, with distilled errors
allowed-tools: Task, Bash(npm run prepare:markets:*), Bash(npm run codegen), Bash(npm run test:node), Bash(npm run check:drift), Bash(npx graph build), Bash(npx graph test:*)
---

Delegate to the **build-runner** subagent. Have it run the full
prepare → codegen → build → test loop and return its distilled report.

Do not run the build yourself — build-runner exists to keep several hundred lines
of `asc` output out of this thread, which needs the headroom to reason about the
fix.

If it reports failures, fix them here (you have the schema and handler context it
lacks), then re-invoke it.

**Never "fix" a build by:**
- deleting logic or commenting out a handler body
- loosening a schema type
- renaming a schema field — that's a Postgres column migration (CLAUDE.md §9),
  and the error is in `src/` anyway
- editing an ABI to change a `stateMutability`

A green build proves very little here: immutable-id collisions and unset non-null
fields are fatal at *index* time and pass `graph build` cleanly (CLAUDE.md §8).
If the change touches entity writes, the matchstick tests are the real signal.
