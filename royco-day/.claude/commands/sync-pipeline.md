---
description: Regenerate the pipeline template from schema.graphql and classify what changed
allowed-tools: Bash(npm run generate), Bash(npm run prepare:markets:*), Bash(npm run test:node), Bash(git diff:*), Bash(git status:*), Read, Edit
---

1. Run `npm run generate` — regenerates `config/markets/pipeline.template.yaml`
   from `schema.graphql` + `config/markets/pipeline.config.json`, and
   `tests/generated/abi-signatures.ts` from `abis/`.
2. Run `npm run prepare:markets:mainnet` to re-render
   `royco-day-markets-pipeline.yaml`.
3. Run `npm run test:node`.
4. `git diff` the template and the rendered pipeline yaml.

**Classify every change — do not present these as a routine diff:**

| Change | Meaning |
|---|---|
| new source+sink pair | additive, safe — a new Postgres table |
| removed source+sink | **destructive** — drops a table |
| renamed | 🚨 **a Postgres column/table migration.** Needs `goldsky pipeline apply` + a backfill, and breaks every downstream Neon consumer. Say so loudly. |

Then check two things the generator can't:

- **The frozen shared-table contract.** If the diff touches
  `GlobalTokenTransfer` or `GlobalTokenActivity`, **stop**. Those sink to the
  same Neon tables as royco-rwa, royco-usd and staked-royco-usd
  (`public.global_token_transfer` / `public.global_token_activity`, secret
  `NEON_ROYCO_ESTATE`). A change here breaks *their* pipelines. `npm run
  test:node` enforces this by diffing against `../royco-rwa/schema.graphql` — if
  that test fails, reconcile the schemas; never edit the assertion to pass.
- **An entity that vanished from the pipeline** without being in the `exclude`
  list. Silently missing from Neon is the failure mode this whole generator
  exists to prevent.

Finally, print the exact `goldsky pipeline apply` command for the user.
**Do not run it** — it mutates production Neon and is denied in settings.json.
