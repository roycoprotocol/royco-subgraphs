import { Address, BigInt } from "@graphprotocol/graph-ts";
import { MarketDeploymentCompleted as MarketDeploymentCompletedEvent } from "../generated/RoycoFactory/RoycoFactory";
import {
  DayAccountantMarketMap,
  DayMarketState,
  DayVaultState,
  DayVaultStateHistorical,
} from "../generated/schema";
import {
  RoycoSeniorTranche,
  RoycoJuniorTranche,
  RoycoLiquidityProviderTranche,
  RoycoDayAccountant,
  RoycoDayKernel,
} from "../generated/templates";
import { RoycoDayAccountant as RoycoDayAccountantContract } from "../generated/RoycoFactory/RoycoDayAccountant";
import { RoycoDayKernel as RoycoDayKernelContract } from "../generated/RoycoFactory/RoycoDayKernel";
import { RoycoSeniorTranche as TrancheContract } from "../generated/RoycoFactory/RoycoSeniorTranche";
import { ERC20 } from "../generated/RoycoFactory/ERC20";
import {
  CHAIN_ID,
  MARKET_STATE_FIXED,
  MARKET_STATE_PERPETUAL,
  VAULT_MAJOR_TYPE,
  ERC20_DECIMALS_UNKNOWN,
  MARKET_TOKEN_ROLE_COLLATERAL_ASSET,
  MARKET_TOKEN_ROLE_LPT_ASSET,
  MARKET_TOKEN_ROLE_QUOTE_ASSET,
  TRANCHE_TYPE_SENIOR,
  TRANCHE_TYPE_JUNIOR,
  TRANCHE_TYPE_LIQUIDITY,
  ZERO_ADDRESS,
} from "./constants";
import {
  generateAccountantMarketMapId,
  generateMarketId,
  generateMarketTokenId,
  generateTokenId,
  generateVaultId,
} from "./utils";
import { snapshotVault } from "./handlers/base/update-vault";
import { marketAssetTokenId } from "./handlers/base/market-token-id";
import { resolveQuotePoolBinding } from "./handlers/base/quote-price-nav";
import {
  marketNavPricesFromVaults,
  writeMarketNav,
} from "./handlers/base/market-nav";

/**
 * The entry point for the whole subgraph.
 *
 * This is the only handler on a fixed-address data source; every other contract
 * is discovered from here. Miss a template and its events are silently never
 * indexed — no error, just missing rows.
 *
 * Writes, per market:
 *   - 1 DayMarketState  (id = <CHAIN_ID>_<KERNEL>; the kernel address IS the marketId)
 *   - 3 DayVaultState        (senior / junior / liquidity)
 *   - 3 DayVaultStateHistorical for the creation block
 *   - 1 DayAccountantMarketMap (accountant -> market, so accountant handlers need no eth_call)
 *
 * See CLAUDE.md §5 before adding any contract call, and §6 for the Claims struct.
 */
export function handleMarketDeploymentCompleted(
  event: MarketDeploymentCompletedEvent
): void {
  const result = event.params.result;

  // Spawn all 5 templates FIRST. `ydm`/`ltYdm` get no template: this schema
  // indexes no YDM events, it only records their addresses.
  RoycoSeniorTranche.create(result.seniorTranche);
  RoycoJuniorTranche.create(result.juniorTranche);
  RoycoLiquidityProviderTranche.create(result.liquidityProviderTranche);
  RoycoDayAccountant.create(result.accountant);
  RoycoDayKernel.create(result.kernel);

  const accountant = RoycoDayAccountantContract.bind(result.accountant);
  const kernel = RoycoDayKernelContract.bind(result.kernel);

  // getState() on both is a plain storage read that cannot revert, so raw is
  // fine (§5). previewSyncTrancheAccountingFor below is NOT — it computes.
  const accountantState = accountant.getState();
  const kernelState = kernel.getState();

  const marketId = result.kernel.toHexString();
  const market = new DayMarketState(generateMarketId(marketId));

  // === from the event ===
  market.chainId = CHAIN_ID;
  market.marketId = marketId;
  market.templateAddress = event.params.template.toHexString();
  market.deployerAddress = event.params.deployer.toHexString();
  market.seniorTrancheAddress = result.seniorTranche.toHexString();
  market.juniorTrancheAddress = result.juniorTranche.toHexString();
  market.liquidityTrancheAddress = result.liquidityProviderTranche.toHexString();
  market.seniorTrancheId = generateVaultId(market.seniorTrancheAddress);
  market.juniorTrancheId = generateVaultId(market.juniorTrancheAddress);
  market.liquidityTrancheId = generateVaultId(market.liquidityTrancheAddress);
  market.kernelAddress = marketId;
  market.accountantAddress = result.accountant.toHexString();
  // `ydm` is the JUNIOR ydm and `lptYdm` is the liquidity one. The ABI does not
  // name the first `jtYdm` — this is the transposition trap in §6.
  market.juniorTrancheYdmAddress = result.ydm.toHexString();
  market.liquidityTrancheYdmAddress = result.lptYdm.toHexString();
  market.creationEncodedData = result.extras.toHexString();

  // === from RoycoDayAccountant.getState() ===
  market.seniorTrancheProtocolFeeWAD = accountantState.stProtocolFeeWAD;
  market.juniorTrancheProtocolFeeWAD = accountantState.jtProtocolFeeWAD;
  market.juniorTrancheYieldShareProtocolFeeWAD =
    accountantState.jtYieldShareProtocolFeeWAD;
  market.liquidityTrancheYieldShareProtocolFeeWAD =
    accountantState.lptYieldShareProtocolFeeWAD;
  // The STORED thresholds. previewSyncTrancheAccountingFor's state carries
  // members with these exact same names holding the LIVE values, and the two
  // disagree between syncs — the schema deliberately stores these (§6). Same
  // name, different contract, different width (uint64 here, uint256 there), so
  // sourcing them from the preview compiles and silently indexes the wrong number.
  market.minCoverageWAD = accountantState.minCoverageWAD;
  market.minLiquidityWAD = accountantState.minLiquidityWAD;
  market.marketState = marketStateName(accountantState.lastMarketState);
  // uint24 -> i32, so this one needs the lift. Its uint32 neighbours do not (§4).
  market.fixedTermDurationSeconds = BigInt.fromI32(
    accountantState.fixedTermDurationSeconds
  );
  market.fixedTermEndTimestamp = accountantState.fixedTermEndTimestamp;
  // uint64 -> BigInt direct. THIS read is what actually fills the column: the matching
  // event only fires from the accountant's initialize(), below this handler's log index.
  market.fixedTermCommenceableAtTimestamp =
    accountantState.fixedTermCommenceableAtTimestamp;
  market.lastYieldShareAccruedTimestamp =
    accountantState.lastYieldShareAccrualTimestamp;
  market.lastPremiumPaymentTimestamp = accountantState.lastPremiumPaymentTimestamp;
  market.timeWeightedJuniorTrancheYieldShareAccruedWAD =
    accountantState.twJTYieldShareAccruedWAD;
  market.maxJuniorTrancheYieldShareAccruedWAD = accountantState.maxJTYieldShareWAD;
  market.timeWeightedLiquidityTrancheYieldShareAccruedWAD =
    accountantState.twLPTYieldShareAccruedWAD;
  market.maxLiquidityTrancheYieldShareAccruedWAD =
    accountantState.maxLPTYieldShareWAD;
  market.coverageLiquidationUtilizationWAD =
    accountantState.coverageLiquidationUtilizationWAD;
  // ONE tolerance in v2 where v1 read three (st, jt, and a cached effective sum).
  market.dustTolerance = accountantState.dustTolerance;

  // === from RoycoDayKernel.getState() ===
  market.protocolFeeRecipientAddress =
    kernelState.protocolFeeRecipient.toHexString();
  market.seniorTrancheSelfLiquidationBonusWAD =
    kernelState.stSelfLiquidationBonusWAD;
  // st + jt owned assets merged into ONE totalCollateralAssets in v2.
  market.totalCollateralAssets = kernelState.totalCollateralAssets;
  market.totalLiquidityTrancheAssets = kernelState.totalLPTAssets;
  market.liquidityTrancheOwnedSeniorTrancheShares =
    kernelState.lptOwnedSeniorTrancheShares;
  // New in v2: the oracle + sequencer-uptime configuration. uint48 -> BigInt direct;
  // only uint24-and-below decode to i32 and need BigInt.fromI32 (§4).
  market.collateralAssetOracleAddress =
    kernelState.collateralAssetOracle.toHexString();
  market.collateralAssetOracleStalenessThresholdSeconds =
    kernelState.stalenessThresholdSeconds;
  market.sequencerUptimeFeedAddress = kernelState.sequencerUptimeFeed.toHexString();
  market.sequencerUptimeFeedGracePeriodSeconds = kernelState.gracePeriodSeconds;

  // === the market's three asset tokens ===
  //
  // STRUCT MEMBERS OF kernelState, not standalone views. They used to be three separate
  // calls — COLLATERAL_ASSET() / LPT_ASSET() / QUOTE_ASSET(), SCREAMING_CASE immutables —
  // and every one of those was REMOVED when the kernel folded them into getState(). Left
  // as calls they would have reverted: the two raw ones would have killed this handler
  // and with it the market, all three vaults and every row hanging off them.
  //
  // Reading them off the state packet already in hand costs THREE FEWER eth_calls per
  // market and removes the try_ that QUOTE_ASSET needed, since a struct member cannot
  // revert. A venue-less kernel simply reports the zero address there, which is the same
  // answer the old fallback produced.
  //
  // The kernel's constructor requires senior.asset() == junior.asset() == collateralAsset
  // and liquidity.asset() == lptAsset, so these must agree with the per-vault
  // assetTokenAddress that createVault reads below; storing them at market level saves a
  // three-way join and gives Neon a free consistency check.
  const collateralAsset = kernelState.collateralAsset.toHexString();
  market.collateralTokenAddress = collateralAsset;
  market.collateralTokenId = generateMarketTokenId(
    collateralAsset,
    marketId,
    MARKET_TOKEN_ROLE_COLLATERAL_ASSET
  );

  const lptAsset = kernelState.lptAsset.toHexString();
  market.liquidityTrancheAssetTokenAddress = lptAsset;
  market.liquidityTrancheAssetTokenId = generateMarketTokenId(
    lptAsset,
    marketId,
    MARKET_TOKEN_ROLE_LPT_ASSET
  );

  // The quote asset needs NO try_ any more. It used to be a `virtual`, bodyless
  // QUOTE_ASSET() that only the liquidity venue concretised, so a venue-less kernel
  // reverted on it; now it is a plain struct member that reports the zero address in
  // that case — the same answer, without the guard.
  const quoteAsset = kernelState.quoteAsset.toHexString();
  market.quoteAssetTokenAddress = quoteAsset;
  market.quoteAssetTokenId = generateMarketTokenId(
    quoteAsset,
    marketId,
    MARKET_TOKEN_ROLE_QUOTE_ASSET
  );
  // Its decimals, and try_ AGAIN — a second failure mode, not the same one. Even when
  // QUOTE_ASSET resolves, `decimals()` is optional in ERC20 and a token that omits it
  // reverts; and when QUOTE_ASSET did NOT resolve we would be calling the zero address.
  // Either way 0 is the honest reading, disambiguated by quoteAssetTokenAddress.
  //
  // Immutable metadata read once at deployment, so no refresh path — §5. This is the only
  // place the quote token's scale is recorded (see the schema note).
  // Written as if/else rather than a ternary: the two branches would be `i32` and
  // `CallResult<i32>`, and AS has no union to reconcile them (§3).
  let quoteDecimals = ERC20_DECIMALS_UNKNOWN;
  if (quoteAsset != ZERO_ADDRESS) {
    const decimals = ERC20.bind(kernelState.quoteAsset).try_decimals();
    if (!decimals.reverted) {
      quoteDecimals = decimals.value;
    }
  }
  market.quoteAssetTokenDecimals = quoteDecimals;

  // === the BPT's vault + which slot holds the quote asset ===
  //
  // The liquidity tranche's deposit asset IS the BPT, and in Balancer V3 the pool
  // contract IS that token — so `lptAsset` is both. The pool is a pair of (senior
  // tranche share, quote asset), enforced in the venue constructor, so the quote leg is
  // derivable from the pool alone with no new Kernel view.
  //
  // Resolved HERE and cached because both are immutable on chain. Doing it per sync
  // would add two eth_calls to the hottest path in the subgraph; doing it once leaves
  // that path a single getPoolTokenRates. Every call inside is try_ — a market with no
  // Balancer venue yields the zero-address binding rather than a dead handler.
  const quotePool = resolveQuotePoolBinding(lptAsset, quoteAsset);
  market.balancerVaultAddress = quotePool.vaultAddress;
  market.quoteAssetPoolIndex = quotePool.quoteAssetPoolIndex;

  // === from RoycoDayKernel.previewSyncTrancheAccountingFor(_trancheType) ===
  //
  // `state` is tranche-INDEPENDENT, so any tranche type returns the same values
  // here. We still read the senior tranche's own TRANCHE_TYPE() rather than pass
  // a literal 0 — the ABI carries no enum member names, so 0/1/2 is an inference
  // (§6). Only `claims`, which this entity does not consume, varies by type.
  const seniorTrancheType = TrancheContract.bind(result.seniorTranche).TRANCHE_TYPE();
  const preview = kernel.try_previewSyncTrancheAccountingFor(seniorTrancheType);
  if (!preview.reverted) {
    const state = preview.value.getState();
    market.collateralNAV = state.collateralNAV;
    market.liquidityTrancheRawNAV = state.lptRawNAV;
    market.seniorTrancheEffectiveNAV = state.stEffectiveNAV;
    market.juniorTrancheEffectiveNAV = state.jtEffectiveNAV;
    market.juniorTrancheImpermanentLoss = state.jtImpermanentLoss;
    market.liquidityTrancheLiquidityPremium = state.lptLiquidityPremium;
    market.coverageUtilizationWAD = state.coverageUtilizationWAD;
    market.liquidityUtilizationWAD = state.liquidityUtilizationWAD;
    // NOTE: `state` also carries minCoverageWAD / minLiquidityWAD. Do NOT read
    // them here — those are the LIVE values and the schema stores the Accountant's
    // stored ones, set above (§6).
  } else {
    // No previous value to fall back on at creation, and every field is non-null
    // — an unset one is fatal at index time (§8). A market this young has no NAV
    // to speak of, so zero is also the truthful answer.
    market.collateralNAV = BigInt.zero();
    market.liquidityTrancheRawNAV = BigInt.zero();
    market.seniorTrancheEffectiveNAV = BigInt.zero();
    market.juniorTrancheEffectiveNAV = BigInt.zero();
    market.juniorTrancheImpermanentLoss = BigInt.zero();
    market.liquidityTrancheLiquidityPremium = BigInt.zero();
    market.coverageUtilizationWAD = BigInt.zero();
    market.liquidityUtilizationWAD = BigInt.zero();
    // minCoverageWAD / minLiquidityWAD are deliberately absent from this branch:
    // they come from the raw getState() above, which cannot revert, so a known-good
    // value is always in hand. Zeroing them here would discard it — and a zero
    // coverage floor is the most dangerous possible wrong answer for that field.
  }

  // === record cursors ===
  // COUNTS, not last-indices: every one of these streams is born empty. They exist for
  // the four streams that keep EVERY event as its own row — the fixed-term lifecycle
  // and the three liquidity-premium streams. The *Historical snapshot tables are keyed
  // and ordered by block number and carry no cursor at all. See "ENTRY INDEX CURSOR"
  // in schema.graphql.
  market.countFixedTermEntries = BigInt.zero();
  market.countYieldSharesAccruedEntries = BigInt.zero();
  market.countLiquidityPremiumSharesMintedEntries = BigInt.zero();
  market.countLiquidityPremiumReinvestedEntries = BigInt.zero();
  market.countLiquidityPremiumReinvestmentFailedEntries = BigInt.zero();

  // A lifetime accumulator, not a cursor: every coverage-loss erase adds to it.
  // Zero is the only truthful seed — nothing has been erased yet, and unlike every
  // other contract-sourced field on this entity there is no getState() member to
  // read it from. The subgraph is the only thing that tracks this total.
  market.juniorTrancheImpermanentLossNAV = BigInt.zero();

  market.createdAtTransactionHash = event.transaction.hash.toHexString();
  market.createdAtBlockNumber = event.block.number;
  market.createdAtBlockTimestamp = event.block.timestamp;
  market.updatedAtTransactionHash = event.transaction.hash.toHexString();
  market.updatedAtBlockNumber = event.block.number;
  market.updatedAtBlockTimestamp = event.block.timestamp;

  market.save();

  // ACCOUNTANT -> MARKET, written in the same handler as the market itself and from the
  // same DeploymentResult, so the pair cannot disagree and the row cannot be missing for
  // a market that exists. This is what lets resolveMarketFromAccountant do a store load
  // instead of an eth_call on every single accountant event; the pairing is 1:1 and fixed
  // at deployment, so a row written once here is correct forever.
  const accountantMap = new DayAccountantMarketMap(
    generateAccountantMarketMapId(market.accountantAddress)
  );
  accountantMap.chainId = CHAIN_ID;
  accountantMap.accountantAddress = market.accountantAddress;
  accountantMap.marketId = marketId;
  // The COMPOSITE id, so the resolver loads DayMarketState directly off this column
  // rather than re-deriving it — one place builds the key, one place consumes it.
  accountantMap.marketRefId = market.id;
  accountantMap.createdAtTransactionHash = event.transaction.hash.toHexString();
  accountantMap.createdAtBlockNumber = event.block.number;
  accountantMap.createdAtBlockTimestamp = event.block.timestamp;
  accountantMap.save();

  const senior = createVault(
    event,
    result.seniorTranche,
    TRANCHE_TYPE_SENIOR,
    market
  );
  // The junior vault's return IS needed: the collateral ASSET price covers senior and
  // junior together (one shared token), but each tranche has its OWN share price, so all
  // three vaults are passed through.
  const junior = createVault(
    event,
    result.juniorTranche,
    TRANCHE_TYPE_JUNIOR,
    market
  );
  const liquidity = createVault(
    event,
    result.liquidityProviderTranche,
    TRANCHE_TYPE_LIQUIDITY,
    market
  );

  // DayMarketNav entry 0.
  //
  //   assetPrice* — READ LIVE here, three calls: the two Kernel converters plus the
  //                 BPT's getPoolTokenRates for the quote leg. (An older comment
  //                 claimed these were free because createVault had already read them.
  //                 That stopped being true when DayVaultState lost assetPriceNAV —
  //                 no vault stores a price any more.)
  //
  //   sharePrice* — NOT read, and NOT an omission: all twelve legs are provably ZERO
  //                 at creation, so the three convertToAssets calls would cost an
  //                 eth_call each to return a struct we already know. Supply is zero
  //                 here — deployMarket only predicts addresses and wires roles, and
  //                 every mint path (kernelMint, the protocol-fee mint, the senior
  //                 premium mint) is onlyKernel and guarded — and
  //                 AssetLedgerLogic._scaleAssetClaims returns the zero struct
  //                 outright when _totalTrancheShares == 0, BEFORE virtual shares are
  //                 applied. So zero is the contract's own answer for any input,
  //                 including one whole share.
  //
  // The sync path cannot take that shortcut: once supply is non-zero the prices are
  // real and change on every mint, burn and re-price, so refreshMarketNav reads all
  // three quadruples live. That is where sharePrice* stops being zero.
  writeMarketNav(
    event,
    market,
    marketNavPricesFromVaults(market, senior, junior, liquidity)
  );
}

/**
 * Map Accountant.getState().lastMarketState (uint8 -> i32) onto its schema string.
 *
 * The on-chain enum is `MarketState { PERPETUAL, FIXED_TERM }`
 * (contracts/libraries/Types.sol), so 0 is PERPETUAL. This reads backwards to
 * anyone who assumes "fixed" comes first — it does not.
 */
function marketStateName(lastMarketState: i32): string {
  return lastMarketState == 0 ? MARKET_STATE_PERPETUAL : MARKET_STATE_FIXED;
}

/**
 * Write one tranche's DayVaultState plus its creation snapshot.
 *
 * RETURNS the saved vault so the caller can pass the three to
 * marketNavPricesFromVaults, which needs their addresses and decimals. It no longer
 * carries any price of its own — DayVaultState stores none.
 *
 * `minorType` comes from which slot of the DeploymentResult tuple the address
 * arrived in, which is authoritative by construction — it is NOT derived from
 * TRANCHE_TYPE(). TRANCHE_TYPE() answers a different question (the uint8 the
 * Kernel wants) and its 0/1/2 ordering is an inference (§6).
 *
 * All three tranches are bound with ONE generated class. Two things make that safe
 * here, and BOTH are required — do not copy this pattern without checking both:
 *
 *   1. Their ABIs declare byte-identical signatures for every view used here. The
 *      "the three tranches' shared view surfaces are byte-identical" test in
 *      scripts/checks/abi.test.mjs fails the build if that stops being true: were
 *      the junior tranche's convertToAssets to change shape, this binding would
 *      keep sending the senior selector and revert at index time.
 *
 *   2. THIS data source lists all three tranche ABIs (§10.4). That is not a
 *      formality. `bind()` bakes the contract NAME into the binding
 *      (`new RoycoSeniorTranche("RoycoSeniorTranche", address)`) and graph-node
 *      resolves that name against the RUNNING data source's `abis:` list at
 *      eth_call time — the import path is irrelevant to it. A binding is NOT just
 *      an address plus a signature. Bind RoycoSeniorTranche from a data source
 *      that does not list that ABI and the call fails, the handler dies, and the
 *      subgraph stalls; `try_` does not save you, because the host errors before
 *      it can hand back a reverted result.
 */
function createVault(
  event: MarketDeploymentCompletedEvent,
  trancheAddress: Address,
  minorType: string,
  market: DayMarketState
): DayVaultState {
  const tranche = TrancheContract.bind(trancheAddress);
  const vaultAddress = trancheAddress.toHexString();

  const vault = new DayVaultState(generateVaultId(vaultAddress));
  vault.chainId = CHAIN_ID;
  vault.vaultAddress = vaultAddress;
  vault.majorType = VAULT_MAJOR_TYPE;
  vault.minorType = minorType;
  vault.marketRefId = market.id;
  vault.marketId = market.marketId;

  // Immutable metadata, read once at deployment — raw is fine (§5).
  // Bound ONCE and reused: `tranche.asset()` is an eth_call, and calling it a second
  // time to feed ERC20.bind cost a redundant round-trip per vault, three per market.
  const assetToken = tranche.asset();
  const assetAddress = assetToken.toHexString();
  vault.assetTokenAddress = assetAddress;
  // MARKET-SCOPED AND ROLE-TAGGED, matching DayMarketState.collateralTokenId /
  // liquidityTrancheAssetTokenId for the same token in the same role. Set AFTER
  // assetTokenAddress, minorType and marketId, because marketAssetTokenId reads all
  // three off the vault.
  //
  // This is the ONE definition: the Global* asset rows read this column rather than
  // recomputing, so a vault's asset id and its transfer rows cannot drift apart.
  vault.assetTokenId = marketAssetTokenId(vault);
  // decimals() is uint8 -> i32, and Int! IS i32 — assign direct, never
  // BigInt.fromI32() (§4).
  vault.assetTokenDecimals = ERC20.bind(assetToken).decimals();

  // The tranche IS its own share token.
  vault.shareTokenId = generateTokenId(vaultAddress);
  vault.shareTokenAddress = vaultAddress;
  vault.shareTokenDecimals = tranche.decimals();

  // ZERO, not totalSupply(). A market has no shares at deployment — deployMarket
  // only predicts addresses and wires roles, and initialize() does not mint.
  //
  // This field is an ACCUMULATOR from here on: the tranche Transfer handlers add
  // and subtract on every mint and burn. That needs a truthful base, and
  // totalSupply() cannot give one — graph-node runs eth_call against END-OF-BLOCK
  // state, so a deposit landing in this same block at a higher log index would
  // already be counted here, and then counted AGAIN when its Transfer(mint) is
  // handled. Silent, permanent, and it corrupts every claims* derived from it.
  vault.sharesTotalSupply = BigInt.zero();

  // No claims* / sharePrice* to seed: DayVaultState carries neither quintuple any
  // more (see its schema note). Both moved to DayMarketNav, written once per market
  // at the bottom of handleMarketDeploymentCompleted rather than three times here.
  //
  // No historical cursor to seed either. DayVaultStateHistorical is keyed and ordered
  // by block number; snapshotVault below writes the creation block's row and nothing
  // has to be counted. See "BLOCK-KEYED HISTORY" in schema.graphql.

  vault.createdAtTransactionHash = event.transaction.hash.toHexString();
  vault.createdAtBlockNumber = event.block.number;
  vault.createdAtBlockTimestamp = event.block.timestamp;
  vault.updatedAtTransactionHash = event.transaction.hash.toHexString();
  vault.updatedAtBlockNumber = event.block.number;
  vault.updatedAtBlockTimestamp = event.block.timestamp;

  vault.save();

  snapshotVault(event, vault);

  return vault;
}
