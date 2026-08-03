# royco-day v2 migration — ST/JT collateral merge + LT→LPT rewrite

**Status: COMPLETE.** All eight steps of §4 are done and the package is green:
`check-drift` OK, 15 node checks, 133 matchstick tests, `graph build` clean.

Final shape: **19 entities** (was 20 — the two yield-share tables merged into one),
39 handlers, 19 pipeline tables. `GlobalTokenTransfer` / `GlobalTokenActivity` untouched,
so the frozen shared-table contract with royco-rwa / royco-usd / staked-royco-usd holds.

Remaining before deploy: fill in the real factory address + startBlock in
`config/markets/networks/*.json`, then drop and recreate the Day tables in Neon (fresh
start — see the decisions table below) and `goldsky pipeline apply`.

## ABI provenance — read before trusting these

`abis/*.json` were **compiled from `contracts/`**, not hand-written. They are real solc
output, and every signature in §2 below was cross-checked against them with the package's
own graph-cli algorithm (`scripts/lib/abi.mjs`). Reproduce with:

```bash
# scratch dir; contracts/ imports ../../../lib/... so lib/ sits beside contracts/
mkdir -p abigen/lib && cp -R contracts abigen/contracts
git clone --depth 1 https://github.com/OpenZeppelin/openzeppelin-contracts.git             abigen/lib/openzeppelin-contracts
git clone --depth 1 https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable.git abigen/lib/openzeppelin-contracts-upgradeable
git clone --depth 1 https://github.com/Vectorized/solady.git                               abigen/lib/solady
cat > abigen/foundry.toml <<'EOF'
[profile.default]
src = "contracts"
out = "out"
libs = []
evm_version = "cancun"
optimizer = true
via_ir = true
EOF
printf '@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/\n@openzeppelin/contracts-upgradeable/=lib/openzeppelin-contracts-upgradeable/contracts/\n' > abigen/remappings.txt
cd abigen && forge build --skip '*BalancerV3*' --skip '*balancer-v3*'
# then: jq --indent 2 '.abi' out/<C>.sol/<C>.json > ../abis/<C>.json
```

**Three caveats, in descending order of how much they should worry you:**

1. **`RoycoDayKernel.json` is the BASE kernel**, not the deployed
   `RoycoDayBalancerV3Kernel`. The Balancer sources were skipped — `balancer-v3-monorepo`
   is a pnpm monorepo needing its own remappings, and none of its surface is indexed. The
   base ABI carries every event and function this subgraph touches (verified: the 4 kernel
   events, `getState`, `previewSyncTrancheAccountingFor`, both converters), so it is
   sufficient. It is NOT the full deployed ABI.
2. **Built against OpenZeppelin `master`, not a release.** Required: `Math.saturatingSub`
   (`libraries/Units.sol:35`) does not exist in ANY published v5.x tag — v5.1 through
   v5.6.1 were each checked. Only OZ-inherited members are affected, and the ones this
   subgraph uses (`Transfer`, `decimals()`, `totalSupply()`) are fixed by ERC20 and cannot
   vary. Everything Royco-declared comes from `contracts/` and is exact.
3. **solc 0.8.35, `via_ir = true`, optimizer on** — chosen to clear a "Stack too deep" in
   codegen. Irrelevant to the ABI, which is derived from the AST.

If the contracts repo can emit these from its own pinned `foundry.toml` + `lib/`
submodules, **prefer those** — same command, authoritative versions, and it resolves
caveats 1 and 2 for free.

## Confirmed by the compiler

Everything in §2 was predicted from the interfaces and then verified against real solc
output. Of particular note, all three held:

- `TrancheAccountingSynced` → **16**-member tuple (was 18)
- `Redeem` / `MultiAssetRedeem` → **4**-member claims tuple (was 5) ⇒ **topic0 changed**
  despite identical names and parameter lists
- `MaxYieldSharesUpdated(uint64,uint64)` and `MultiAssetDeposit(...6 × uint256)` →
  **topic0 unchanged**; only AS getter names move, which `asc` will catch for you

And one load-bearing invariant **survives the rewrite**: the three tranches' shared view
and event surfaces are still byte-identical, so the single shared implementation in
`src/handlers/tranche/` and the one-binding-class trick in `createVault` remain valid.
`scripts/checks/abi.test.mjs` proves it and now names the renamed contract.

## Decisions taken

| | |
|---|---|
| Migration posture | **Fresh start.** New factory ⇒ reindex from scratch. Rename freely, drop dead columns, no backfill. |
| Naming | **Merge only.** `liquidityTranche*` columns and `minorType: "liquidity"` stay ⇒ `DayFeeState` ids unchanged. |
| Merged ST/JT fields | **`collateral*`**, matching the contracts, so `<- ABI:` annotations stay literal. |
| Yield-share history | **Merge the two tables into one.** |
| New oracle/sequencer config | **Index it.** |

`GlobalTokenTransfer` / `GlobalTokenActivity` are untouched — still the frozen shared
contract with royco-rwa / royco-usd / staked-royco-usd.

---

## 1. Structs

**`AssetClaims` 5 → 4.** `stAssets` + `jtAssets` → `collateralAssets`; `ltAssets` → `lptAssets`.

**`SyncedAccountingState` 18 → 16.** `stRawNAV`+`jtRawNAV` → `collateralNAV`; `ltRawNAV` →
`lptRawNAV`; `jtCoverageImpermanentLoss` → `jtImpermanentLoss`; `lt*` → `lpt*`;
**`jtCoinvested` removed**.

**`TrancheType.LIQUIDITY` → `LIQUIDITY_PROVIDER`** (ordinal still 2).
**`Operation` remains 6 values.** Multi-asset LPT flows use the LPT deposit and
redemption ordinals.

**`Accountant.getState()` 27 → 24.** Three dust members → one `dustTolerance`.
`lastSTRawNAV`+`lastJTRawNAV` → `lastCollateralNAV`. Accruals **uint192 → uint128** (still
`BigInt`, no `.fromI32` — §4 unchanged). **Member order changed**, so the tuple builder in
`tests/mocks/accountant.ts` must be rewritten against the generated signature, not edited.

**`Kernel.getState()` 7 → 10.** `stOwned`+`jtOwnedYieldBearingAssets` →
`totalCollateralAssets`; `ltOwned…` → `totalLPTAssets`; `ltOwnedSeniorTrancheShares` →
`lptOwnedSeniorTrancheShares`; **+4 new**: `collateralAssetOracle`,
`stalenessThresholdSeconds` (uint48), `sequencerUptimeFeed`, `gracePeriodSeconds` (uint48).

**Kernel converters 3 → 2** — the change that drove all of this:

```
stConvertTrancheUnitsToNAVUnits ┐
jtConvertTrancheUnitsToNAVUnits ┴→ convertCollateralAssetsToValue
ltConvertTrancheUnitsToNAVUnits  → convertLPTAssetsToValue
```

`previewSyncTrancheAccounting(uint8)` → **`previewSyncTrancheAccountingFor(uint8)`**.
New: `COLLATERAL_ASSET()`, `LPT_ASSET()`, `QUOTE_ASSET()`. `asset()` survives on the
tranche, so per-vault `assetTokenAddress` still works — senior and junior now return the
same address, which is the whole point.

## 2. Events

### ⚠️ Topic0 changes with NO name change — the silent ones

`Redeem` and `MultiAssetRedeem` keep their names and parameter lists but embed
`AssetClaims`, which went 5-tuple → 4-tuple. **Their topic0s change.** Miss these in the
manifest and they match nothing, with no error.

### Accountant

| old | new | impact |
|---|---|---|
| `TrancheAccountingSynced(18-tuple)` | `(16-tuple)` | topic0 changes; handler drops 2 fields |
| `JuniorTrancheYieldShareAccrued` + `LiquidityTrancheYieldShareAccrued` | `YieldSharesAccrued(jtYieldShareWAD, twJTYieldShareAccruedWAD, lptYieldShareWAD, twLPTYieldShareAccruedWAD)` | **2 handlers → 1** |
| `SeniorTrancheDustToleranceUpdated` + `JuniorTrancheDustToleranceUpdated` | `DustToleranceUpdated(NAV_UNIT)` | **2 handlers → 1** |
| `JuniorTrancheCoverageImpermanentLossReset` | `JuniorTrancheImpermanentLossReset` | rename |
| `LiquidityTranche{YDMUpdated,YieldShareProtocolFeeUpdated,RawNAVCommitted}` | `LiquidityProviderTranche…` | rename |
| `MaxYieldSharesUpdated(uint64,uint64)` | same types, `maxLTYieldShareWAD`→`maxLPTYieldShareWAD` | **topic0 UNCHANGED**; only the AS getter name moves |
| `CoverageUpdated`, `LiquidityUpdated`, `LiquidationCoverageUtilizationUpdated`, `FixedTerm*`, `SeniorTrancheProtocolFeeUpdated`, `JuniorTrancheProtocolFeeUpdated`, `JuniorTrancheYieldShareProtocolFeeUpdated`, `JuniorTrancheYDMUpdated` | unchanged | none |

**`handleSeniorTrancheDustToleranceUpdated`'s clever bit disappears.** It recomputed
`effectiveNAVDustTolerance = st + jt` because no event carried it. There is now one
tolerance and one event, so both handlers and that whole hazard are deleted.

### Kernel

| old | new |
|---|---|
| `LiquidityPremiumReinvested(uint256, TRANCHE_UNIT)` | same types → **topic0 unchanged**, `ltAssetsMinted`→`lptAssetsMinted` |
| `LiquidityPremiumReinvestmentFailed(uint256, TRANCHE_UNIT, bytes)` | same types → **topic0 unchanged**, `minLTAssetsOut`→`minLPTAssetsOut` |
| `ProtocolFeeRecipientUpdated`, `SeniorTrancheSelfLiquidationBonusUpdated` | unchanged |
| — | **`CollateralAssetOracleUpdated(address indexed, uint48)`** NEW |
| — | **`SequencerUptimeFeedUpdated(address indexed, uint48)`** NEW |
| `RoycoBlacklistUpdated` | still deliberately unindexed |

### Tranches

`Transfer`, `Deposit`, `ProtocolFeeSharesMinted`, `LiquidityPremiumSharesMinted`
unchanged. `MultiAssetDeposit` keeps its types (`stAssets` → `collateralAssets` is a name
change only) so topic0 holds. `Redeem` / `MultiAssetRedeem` — see the warning above.

## 3. Schema

### `DayMarketState`
- **drop** `seniorTrancheRawNAV`, `juniorTrancheRawNAV` → **add** `collateralNAV`
- **drop** `seniorTrancheDustTolerance`, `juniorTrancheDustTolerance`, `effectiveNAVDustTolerance` → **add** `dustTolerance`
- **drop** `seniorTrancheOwnedYieldBearingAssets`, `juniorTrancheOwnedYieldBearingAssets` → **add** `totalCollateralAssets`
- **drop** `isJuniorTrancheCoinvested` — no source remains
- rename `juniorTrancheCoverageImpermanentLoss` → `juniorTrancheImpermanentLoss` ("Coverage" is gone from the contract). Its lifetime-accumulator sibling `juniorTrancheCoverageLossNAV` → `juniorTrancheImpermanentLossNAV`; **the two still mean opposite things** — keep that warning.
- `liquidityTrancheRawNAV` ← `lptRawNAV`, `liquidityTrancheOwnedYieldBearingAssets` ← `totalLPTAssets` (names kept per the naming decision)
- **add** `collateralAssetOracleAddress`, `collateralAssetOracleStalenessThresholdSeconds`, `sequencerUptimeFeedAddress`, `sequencerUptimeFeedGracePeriodSeconds` (uint48 → BigInt direct)
- cursors **7 → 6**: the two yield-share counters become one

### `DayMarketNav` / `DayMarketNavHistorical`
- asset prices **3 → 2**: `collateralAssetPriceNAV`, `liquidityTrancheAssetPriceNAV`
- share prices **3 quintuples → 3 quadruples** (15 → 12 legs):
  `<t>SharePriceCollateralAssets`, `<t>SharePriceLiquidityTrancheAssets`,
  `<t>SharePriceSeniorTrancheShares`, `<t>SharePriceNAV`
- **structural zeros re-verified against the new `_deriveTrancheAssetClaims`: 6 of 12**
  (was 7 of 15). SENIOR/JUNIOR set only `nav` + `collateralAssets` ⇒ `lptAssets` and
  `stShares` are 0; LIQUIDITY_PROVIDER sets only `lptAssets`/`stShares`/`nav` ⇒
  `collateralAssets` is 0, and the LPT `convertToAssets` rewrite still forces `stShares`
  to 0 and `nav` to `lptRawNAV`. Non-zero: senior `collateralAssets`+`nav`, junior
  `collateralAssets`+`nav`, LPT `lptAssets`+`nav`.
- `refreshMarketNav` eth_calls **6 → 5**: 2 converters (not 3) + 3 `convertToAssets`

### `DayVaultState` / `Historical`
`assetPriceNAV` dispatch goes **3-way → 2-way**: senior *and* junior both route to
`convertCollateralAssetsToValue`, LPT to `convertLPTAssetsToValue`. `minorType` values are
unchanged (`"senior"`/`"junior"`/`"liquidity"`).

### `DayTrancheAccountingSyncedHistory`
18 → 16 columns, mirroring the struct. Also fixes the standing zero-placeholder problem:
`ltRawNAV`/`liquidityUtilizationWAD` were hard-coded 0 in the pre-op marshal — recheck
whether the new `_previewSyncTrancheAccounting` still does that before deleting the notes.

### Yield-share history — merge
Replace `DayJuniorTrancheYieldSharesAccruedHistory` +
`DayLiquidityTrancheYieldSharesAccruedHistory` with one
`DayYieldSharesAccruedHistory { juniorYieldShareWAD, juniorTimeWeightedYieldShareAccruedWAD,
liquidityTrancheYieldShareWAD, liquidityTrancheTimeWeightedYieldShareAccruedWAD }`, one
cursor, one handler. The sawtooth/reset note applies to both pairs and must survive.

### Quintuple → quadruple, everywhere else
`DayPositionState`(+`Historical`) and `DayMultiAssetRedeemActivity`: drop
`claimsSeniorTrancheAssets`/`claimsJuniorTrancheAssets`, add `claimsCollateralAssets`;
`claimsLiquidityTrancheAssets` ← `lptAssets`. `DayMultiAssetDepositActivity`:
`seniorTrancheAssets` → `collateralAssets`.

The standalone **ASSET CLAIMS** block in `schema.graphql` is the canonical note and must be
rewritten for the 4-member struct — three entities point at it.

## 4. Execution order

1. Regenerated ABIs → `abis/`
2. `npm run generate` — refreshes `tests/generated/abi-signatures.ts`; **every** `event:`
   string in the manifest comes from there, never by hand
3. `schema.graphql` (§3 above) → `npm run generate` again for the pipeline template
4. `config/markets/subgraph.template.yaml` — new signatures, handler renames, entity lists
5. `src/` — handlers; `asc` will surface every renamed getter in the right file
6. `scripts/checks/schema.test.mjs` — entity list 20 → 19 (two yield tables → one),
   immutable count, cursor pairs
7. Tests: `tests/mocks/accountant.ts` + `kernel.ts` tuple builders rebuilt against the new
   member order; `tests/builders/shared.ts` `Claims` 5 → 4 and `TrancheState` 18 → 16
8. `/verify`, then redeploy. Neon: drop and recreate the Day tables (fresh start).
   `global_token_*` untouched.

## 5. Still open

- `LiquidityProviderTrancheRawNAVCommitted` remains unindexed, as its predecessor was.
- Whether the new pre-op marshal still writes zero placeholders for `lptRawNAV` /
  `liquidityUtilizationWAD` — see `CONTRACT-CHANGE-REQUEST.md`, which is superseded in
  naming but not in substance.
