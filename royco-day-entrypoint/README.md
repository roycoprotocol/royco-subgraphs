# royco-day-entrypoint

Subgraph for the **RoycoDayEntryPoint** — the async deposit/redemption queue for Royco Day 3-tranche markets (senior / junior / liquidity). Deploys to Goldsky; its entities mirror to Neon Postgres via a Goldsky Pipeline. Companion to the `../royco-day` markets subgraph; domain model mirrors `../royco-rwa`'s entry-point subgraph, extended for Day's 3-tranche claims. Neon tables (`day_entry_point_state` / `day_entry_point_request` / `day_entry_point_execution`) are fresh and Day-prefixed.

> Read [CLAUDE.md](./CLAUDE.md) first — build order, the partial-fill SUM rules, and deploy gating.

## Commands

```bash
npm install
npm run build   # prepare → codegen → graph build
npm test        # prepare → codegen → matchstick
```

`graph` and `mustache` aren't on PATH (local devDeps — use `npm run` or `npx`). codegen can't run before prepare (`subgraph.yaml` / `static.ts` are rendered from `config/entrypoint/`); `npm run build` chains this.

## Layout

| Path | What |
| --- | --- |
| `schema.graphql` | `DayEntryPointState`, `DayEntryPointRequest`, `DayEntryPointExecution` (per-fill), `GlobalTokenActivity` (shared feed) |
| `abis/` | `RoycoDayEntryPoint`, `RoycoVaultTranche` (for `asset()`), `ERC20` |
| `config/entrypoint/` | mustache templates + per-network values (edit here, not the rendered output) |
| `src/royco-day-entrypoint.ts` | the handlers (one entry file — singleton data source) |
| `scripts/entrypoint/` | Goldsky deploy / delete scripts |
| `tests/` | one matchstick test covering the SUM rules |

Gitignored (rendered per-network): `subgraph.yaml`, `src/constants/static.ts`.

## Deploys — human-gated

`goldsky pipeline apply` mutates production Neon. Not deployed yet: `config/entrypoint/networks/mainnet.json` holds a placeholder address / `startBlock: 0` — fill in and bump `version` before deploying.

```bash
npm run deploy:subgraphs:entrypoint
npm run deploy:pipeline:entrypoint
```
