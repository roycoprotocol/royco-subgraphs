# royco-day

Subgraph for **Royco Day** 3-tranche markets (senior / junior / liquidity).
Deployed to Goldsky; entities mirrored to Neon Postgres by a Goldsky Pipeline.

**Status: base setup.** Every handler in `src/` is a wired, compiling no-op stub.
Writing them is the next phase.

> **Read [CLAUDE.md](./CLAUDE.md) before changing anything.** It is the real
> documentation — build order, AssemblyScript traps, the ABI type table, entity
> id rules, and the cross-package constraints that aren't visible from this
> directory. This README is just the command list.

## Commands

```bash
npm install

npm run build      # prepare -> codegen -> build   (prepare is included)
npm test           # node checks + matchstick
npm run check      # drift check + all tests — what CI runs

npm run generate     # regenerate pipeline template + abi signatures from source
npm run check:drift  # fail if generated artifacts are stale
npm run test:only    # matchstick alone (fast, needs a warm generated/)
npm run test:watch   # matchstick in watch mode
```

**`graph` and `mustache` are not on your PATH** — they're local devDependencies.
Use `npm run ...`, or `npx graph ...` for one-offs.

**codegen cannot run before prepare.** `subgraph.yaml` and
`src/constants/static.ts` don't exist until mustache renders them from
`config/markets/`. `npm run build` chains this correctly; if you run steps by
hand, keep the order.

## Layout

| Path | What |
|---|---|
| `schema.graphql` | 9 entities. Source of truth for the pipeline. |
| `abis/` | 6 Day ABIs + ERC20 (for asset `decimals()`). |
| `config/markets/` | mustache templates + per-network values. **Edit here, not the rendered output.** |
| `src/` | Handlers (stubs), constants, id generators. |
| `scripts/` | Generators, checks, deploy scripts. |
| `tests/` | matchstick harness + tests. |
| `.claude/` | Subagents, slash commands, permissions. |

Generated but **committed** (reviewable): `config/markets/pipeline.template.yaml`,
`royco-day-markets-pipeline.yaml`, `tests/generated/abi-signatures.ts`.
Generated and **gitignored** (they're whichever network was prepared last, so a
committed copy would lie about `CHAIN_ID`): `subgraph.yaml`,
`src/constants/static.ts`.

## Toolchain notes (verified on this machine)

- **matchstick 0.6.0 works on Apple Silicon.** Verified on an M5 Pro / macOS 26:
  the `binary-macos-12-m1` binary runs, failing tests print a proper assertion
  diff plus a wasm backtrace, and the exit code propagates. The 0.6.0 release
  notes warn of an M1 memory error on failure — it did not reproduce here. No
  `libpq`/postgres install is needed.
- **Don't use `graph test -d` (docker) to judge anything.** graph-cli's docker
  path never checks the container's exit code, so it always "passes".
- matchstick 0.6.0 is unmaintained (last release Oct 2023) but is still `latest`.
  The version is pinned via `-v 0.6.0` so CI can't drift.

## Deploys

Human-gated on purpose — `goldsky pipeline apply` mutates production Neon.

```bash
npm run deploy:subgraphs:markets   # graph build + goldsky subgraph deploy
npm run deploy:pipeline:markets    # regenerate + goldsky pipeline apply
```

**The Day factory isn't deployed yet.** `config/markets/networks/mainnet.json`
holds a placeholder address and `startBlock: 0`. Fill those in first.

## Two things that will bite you

1. **`GlobalTokenTransfer` / `GlobalTokenActivity` are a frozen cross-package
   contract.** They sink into the *same* Neon tables as royco-rwa, royco-usd and
   staked-royco-usd. Changing a field breaks *their* pipelines. A test enforces
   this by diffing against `../royco-rwa/schema.graphql`.
2. **A green `graph build` proves very little.** Immutable-id collisions and
   unset non-null fields are fatal at *index* time and compile perfectly. That's
   what the tests are for.
