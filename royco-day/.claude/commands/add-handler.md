---
description: Scaffold an event handler — yaml wiring, an exported stub, and a test. Usage /add-handler <Contract> <EventName>
argument-hint: <Contract> <EventName>
allowed-tools: Task, Read, Edit, Write, Grep, Bash(npm run prepare:markets:*), Bash(npm run codegen), Bash(npx graph build), Bash(npx graph test:*)
---

Wire up event **$2** on contract **$1**. Wiring only — write a stub body with a
TODO, not indexing logic, unless explicitly asked for the logic too.

1. **Get the exact signature.** Grep `tests/generated/abi-signatures.ts` (it is
   generated from the ABIs with graph-cli's own algorithm, so it is correct by
   construction), or ask the **abi-oracle** subagent for the param table and AS
   types. **Never hand-transcribe tuple components** — order is load-bearing, and
   a wrong signature produces a topic0 that matches nothing: zero rows, zero
   errors, no clue that anything is broken.

2. **Edit `config/markets/subgraph.template.yaml`** — never `subgraph.yaml`,
   which is generated and gitignored, and which the next `prepare` silently
   reverts (CLAUDE.md §2). Under the right data source or template:
   - add the `eventHandlers:` entry with the exact signature, plus `receipt: true`
   - list the entities it writes under `entities:`
   - confirm every ABI the handler will `.bind()` is in that data source's
     `abis:` list

3. **Export the handler** from the `file:` that data source names. If **$1** is
   one of the three tranches and the event exists on the others too
   (Transfer/Deposit/Redeem/ProtocolFeeSharesMinted), put shared logic in
   `src/handlers/` and re-export it from each tranche entry file — codegen emits a
   distinct class per template even for identical event shapes.

4. **Add a test** from `tests/handlers/_TEMPLATE.md`, including the
   unknown-market early-return case.

5. Run `/verify`.

6. **Report**: files touched, the signature used, and the entities the TODO says
   this event should eventually write.

If the event carries an `AssetClaims` tuple, note the fixed mapping in the stub
comment: `stAssets→claimsSeniorTrancheAssets, jtAssets→claimsJuniorTrancheAssets,
ltAssets→claimsLiquidityTrancheAssets, stShares→claimsSeniorTrancheShares,
nav→claimsNAV`.
Check the index — `Redeem` has claims at position 2, `MultiAssetRedeem` at 4.
