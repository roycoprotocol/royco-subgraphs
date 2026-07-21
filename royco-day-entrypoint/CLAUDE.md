# royco-day-entrypoint

Subgraph indexing the **RoycoDayEntryPoint** — the async deposit/redemption queue for Royco Day 3-tranche markets (senior / junior / liquidity). Goldsky → Neon Postgres, into fresh Day-prefixed tables `day_entry_point_state` / `day_entry_point_request` / `day_entry_point_execution` (per-fill history), plus rows on the shared `global_token_activity` feed. Companion to `../royco-day` (markets, which has no async lifecycle); the domain model mirrors `../royco-rwa`'s entry-point subgraph, extended for Day's 3-tranche redemption claims.

## Build

```bash
npm run build   # prepare → codegen → graph build
npm test        # prepare → codegen → matchstick
```

`graph` and `mustache` aren't on PATH (local devDeps — use `npm run` or `npx`). **codegen can't run before prepare:** `subgraph.yaml` and `src/constants/static.ts` are rendered by mustache from `config/entrypoint/` and are gitignored. Edit the templates in `config/entrypoint/`, never the rendered output.

## What will bite you

- **The partial-fill SUM rule.** Each `*Executed` reduces the escrow by the SUM of two event legs, not one: deposits `-= assetsDeposited + bonusAssets`, redemptions `-= sharesRedeemed + protocolFeeShares`. Subtracting only the primary leg leaves a request perpetually "partial". Asserted in `tests/royco-day-entrypoint.test.ts` — keep it green.
- **Every handler bails when `getEntryPointVersion(event.address)` is 0** (an address this subgraph isn't configured for). The EntryPoint is a per-chain singleton, so there are no templates and no per-market discovery.
- **`config/entrypoint/pipeline.template.yaml` is hand-maintained.** Add a source+sink pair when you add a schema entity, or it silently never reaches Neon.
- **Schema entity/field names become Neon columns, frozen after first deploy.** Add a field, never rename one (a rename is a column migration).
- **`GlobalTokenActivity` is a frozen SHARED table.** Its field set is byte-identical to royco-rwa / royco-day markets and it sinks into the shared `global_token_activity` (not Day-prefixed) — the union activity feed. Editing the field set breaks those packages' pipelines. The handler writes one row per request lifecycle event (create → pending, partial fill → updated, final fill → completed, cancel → cancelled; `type: "request"`). "completed" means the whole request finished — consumers rely on that, so partial fills are "updated".
- **AssemblyScript, not TypeScript:** no closures or try/catch; use `.plus()`/`.minus()` on `BigInt` and `.toHexString()` for addresses; `uint8`–`uint24` decode to `i32` (need `BigInt.fromI32`), `uint32`+ to `BigInt` direct.

## Deploys — human-gated

`goldsky pipeline apply` mutates production Neon; never run `goldsky`, `npm run deploy:*`, or `npm run delete:*` without explicit approval. **Not deployed yet:** `config/entrypoint/networks/mainnet.json` holds a placeholder `entryPoints[].address` and `startBlock: 0` — fill those in and bump `version` before deploying.
