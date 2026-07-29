# ✅ RESOLVED — superseded by the v2 contracts (2026-07-28)

**Everything below is historical.** The contract change this document asked for has
shipped, in a better form than was proposed, and the subgraph is updated accordingly.

What actually landed:

- `TrancheAccountingSynced` on the accountant was **replaced** by a pair on the
  **kernel**: `PreOpTrancheAccountingSynced(state)` and
  `PostOpTrancheAccountingSynced(op, state)`. Separate topic0s, so no `isPostOp`
  discriminator and no receipt scan — cleaner than §2a proposed.
- The **emit-placement trap in §2c cannot occur**: the emits moved out of
  `postOpSyncTrancheAccounting` (where the early `return` would have skipped 6 of 8 call
  sites) into `AccountingSyncLogic`, after the accountant call returns.
- The **placeholder zeros in §1 are fixed**. Both events emit after `_commitLPTRawNAV`,
  which refreshes `lptRawNAV` and `liquidityUtilizationWAD` in the state packet in
  place, so `liquidity_tranche_raw_nav` and `liquidity_utilization_wad` carry real
  values in both `day_market_state` and `day_tranche_accounting_synced_history`.
- Being kernel events, they need no `ACCOUNTANT.KERNEL()` hop — one fewer eth_call per
  sync.
- `LiquidityProviderTrancheRawNAVCommitted` (the §3 fallback) was removed. It is not
  needed: the sync events now carry the committed mark themselves.

The subgraph indexes **both** events, collapsed to one row per (market, block): the
first sync in a block creates the row, later syncs overwrite it. See the note on
`DayTrancheAccountingSyncedHistory` in `schema.graphql`.

---

<details><summary>Original request (historical)</summary>

# Contract change request — discriminate pre-op from post-op syncs

**Status:** blocked on the contract. Nothing in `src/` changes until the new ABI lands
in `abis/RoycoDayAccountant.json`.

**Goal:** the subgraph should record only the **post-op** `TrancheAccountingSynced`.

---

## 1. Why

`postOpSyncTrancheAccounting` marshals a state the pre-op sync cannot produce. The
pre-op payload hard-codes two members as placeholders — the contract says so itself
(`RoycoDayAccountant.sol`, `_previewSyncTrancheAccounting`):

```solidity
// NOTE: The liquidity tranche raw NAV and utilization are zero placeholders
//       that the kernel refreshes after committing the fresh mark
ltRawNAV: ZERO_NAV_UNITS,
...
liquidityUtilizationWAD: 0,
```

`postOpSyncTrancheAccounting` sets both for real (`ltRawNAV: _ltRawNAV`, and a computed
`liquidityUtilizationWAD`). Because every `TrancheAccountingSynced` on chain today comes
from the pre-op path, four Neon columns are permanently zero:

| table | columns |
|---|---|
| `day_market_state` | `liquidity_tranche_raw_nav`, `liquidity_utilization_wad` |
| `day_tranche_accounting_synced_history` | `liquidity_tranche_raw_nav`, `liquidity_utilization_wad` |

## 2. What to change

### 2a. Add a discriminator to the event

`contracts/interfaces/IRoycoDayAccountant.sol:144`

```solidity
-   event TrancheAccountingSynced(SyncedAccountingState resultingState);
+   event TrancheAccountingSynced(SyncedAccountingState resultingState, bool isPostOp);
```

A `bool` is enough. If a phase enum is preferred that is fine too — anything that is a
**non-indexed scalar appended after** `resultingState`. Do not reorder the tuple.

### 2b. Tag the existing pre-op emit

`RoycoDayAccountant.sol:192`, end of `preOpSyncTrancheAccounting`:

```solidity
-   emit TrancheAccountingSynced(state);
+   emit TrancheAccountingSynced(state, false);
```

### 2c. Add the post-op emit — PLACEMENT IS LOAD-BEARING

`postOpSyncTrancheAccounting` has an **early return** before its requirement checks:

```solidity
        });                                                   // <- state marshalled, ~line 321

+       emit TrancheAccountingSynced(state, true);            // <- PUT IT HERE

        // Preemptively return if the kernel specified that the market's
        // requirements don't need to be enforced
        if (!_enforceCoverageAndLiquidityRequirements) return state;   // <- line 324

        if (_op == Operation.ST_DEPOSIT || ...) { require(...); }
        if (_op == Operation.ST_DEPOSIT || ...) { require(...); }
    }                                                          // <- NOT here
```

Appending the emit at the end of the function instead looks natural and is **wrong**:
only 2 of the 8 post-op call sites reach it unconditionally.

| call site | operation | `_enforceCoverageAndLiquidityRequirements` | reaches end? |
|---|---|---|---|
| `DepositLogic.sol:59` | `ST_DEPOSIT` | `true` | yes |
| `DepositLogic.sol:93` | `JT_DEPOSIT` | `false` | **no** |
| `DepositLogic.sol:125` | `LT_DEPOSIT` | `false` | **no** |
| `DepositLogic.sol:187` | `LT_DEPOSIT` | `(_stAssets != ZERO_TRANCHE_UNITS)` | sometimes |
| `RedemptionLogic.sol:66` | `ST_REDEEM` | `false` | **no** |
| `RedemptionLogic.sol:101` | `JT_REDEEM` | `true` | yes |
| `RedemptionLogic.sol:137` | `LT_REDEEM` | conditional | sometimes |
| `RedemptionLogic.sol:204` | `LT_REDEEM` | conditional | sometimes |

Emitting before the `require`s is safe: a failing requirement reverts the whole
transaction, so the log is discarded with it. There are no orphan logs.

## 3. Known and accepted consequence

`preOpSyncTrancheAccounting` is called **without any post-op** from:

- `BalancerV3_LT_BPTOracle_Quoter.sol:334,338` — the swap hook (highest volume)
- `IdenticalAssets_ST_JT_ChainlinkOracle_Quoter.sol:115,119` and
  `IdenticalAssets_ST_JT_Oracle_Quoter.sol:96,101` — oracle updates
- `AccountingSyncLogic.syncTrancheAccounting` — whose docstring reads *"Only executes a
  pre-op sync because there is no operation being executed in the same call as this sync"*
- `AccountingSyncLogic.reinvestLiquidityPremium`

Only `DepositLogic` (4 flows) and `RedemptionLogic` (4 flows) pair pre+post. So once the
subgraph filters to `isPostOp`, **`day_tranche_accounting_synced_history` and
`day_market_nav` will cover deposits and redemptions only** — AMM-driven and
oracle-driven syncs will no longer produce rows. This was raised and accepted; it is
recorded here so it is not rediscovered as a bug.

If that is ever revisited, the alternative needs no contract change at all: both
`_preOpSyncTrancheAccounting` overloads end with `_commitPostSyncLiquidityTrancheRawNAV`,
so **every** sync is immediately followed by `LiquidityTrancheRawNAVCommitted(uint256
ltRawNAV)` — already present in `abis/` and currently unindexed. That supplies the real
`ltRawNAV`, and `UtilizationLogic._computeLiquidityUtilization(stEffectiveNAV,
minLiquidityWAD, ltRawNAV)` is `pure`, so the utilization is exactly recomputable from
values the subgraph already holds.

## 4. Subgraph work, once the ABI lands

Drop the regenerated ABI into `abis/RoycoDayAccountant.json`, then:

1. `npm run generate` — refreshes `tests/generated/abi-signatures.ts`. **Copy the new
   `event:` string from there**; never hand-transcribe an 18-member tuple (CLAUDE.md §10.1).
2. `config/markets/subgraph.template.yaml` — replace the `TrancheAccountingSynced`
   signature with the 2-arg form. A stale signature yields a topic0 matching nothing:
   zero rows, zero errors.
3. `src/royco-day-accountant.ts` — the guard goes **first**, above
   `resolveMarketFromAccountant`:

   ```ts
   export function handleTrancheAccountingSynced(
     event: TrancheAccountingSyncedEvent
   ): void {
     // Pre-op syncs carry placeholder ltRawNAV / liquidityUtilizationWAD; only the
     // post-op payload is complete. Guard BEFORE resolving the market — that hop is an
     // eth_call (ACCOUNTANT.KERNEL()), and pre-op syncs are the high-volume ones.
     if (!event.params.isPostOp) return;

     const market = resolveMarketFromAccountant(event);
     ...
   ```

   Ordering matters for cost, not just style: every swap emits a pre-op sync, and
   guarding first skips an eth_call per swap.
4. Tests — `tests/builders/accountant.ts`'s
   `createTrancheAccountingSyncedEvent` gains the `isPostOp` param; add a case asserting a
   pre-op event writes **nothing** (no history row, no cursor advance, no `DayMarketNav`
   row, `updatedAt*` untouched).
5. `/verify`, then redeploy both subgraphs. No pipeline change — the entity set and column
   set are unchanged.

</details>
