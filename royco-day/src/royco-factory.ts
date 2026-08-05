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
  ERC20_SYMBOL_UNKNOWN,
  TRANCHE_TYPE_SENIOR,
  TRANCHE_TYPE_JUNIOR,
  TRANCHE_TYPE_LIQUIDITY,
  ZERO_ADDRESS,
} from "./constants";
import {
  generateAccountantMarketMapId,
  generateMarketId,
  generateTokenId,
  generateVaultId,
  isZeroAddress,
} from "./utils";
import { snapshotVault } from "./handlers/base/update-vault";
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
 *   - 1 DayAccountantMarketMap (accountant -> market lookup)
 *
 * See CLAUDE.md §5 before adding any contract call, and §6 for the Claims struct.
 */
export function handleMarketDeploymentCompleted(
  event: MarketDeploymentCompletedEvent
): void {
  const result = event.params.result;

  // Spawn all five templates first. YDM events are not indexed; only their
  // addresses are stored on the market.
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
  // THE EMITTER, not a param — MarketDeploymentCompleted carries no factory address
  // because RoycoFactory emits it about itself. Off the event rather than the prepared
  // config, so the row records the factory that actually deployed it; that is what tells
  // mainnet rows from staging's mock-market rows in the shared Neon tables (§11).
  market.factoryAddress = event.address.toHexString();
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
  // The initialization event precedes this handler, so seed the value from state.
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
  market.roycoBlacklistAddress = kernelState.roycoBlacklist.toHexString();
  market.kernelPaused = kernel.paused();

  const venueState = kernel.try_getBalancerV3LiquidityVenueState();
  market.bptOracleAddress = venueState.reverted
    ? ZERO_ADDRESS
    : venueState.value.bptOracle.toHexString();
  market.maxReinvestmentSlippageWAD = venueState.reverted
    ? BigInt.zero()
    : venueState.value.maxReinvestmentSlippageWAD;

  // Reuse the asset addresses from kernelState instead of making three more calls.
  // A venue-less market reports the zero address for quoteAsset.
  const collateralAsset = kernelState.collateralAsset.toHexString();
  market.collateralTokenAddress = collateralAsset;
  market.collateralTokenId = generateTokenId(collateralAsset);
  // The DECIMALS duplicate the senior and junior DayVaultState.assetTokenDecimals — same
  // token, same read — for the same reason the address above duplicates their
  // assetTokenAddress: one market row instead of a three-way vault join, plus a free
  // cross-check. The SYMBOL has no vault counterpart; DayVaultState carries none.
  market.collateralAssetTokenSymbol = erc20Symbol(kernelState.collateralAsset);
  market.collateralAssetTokenDecimals = erc20Decimals(kernelState.collateralAsset);

  const lptAsset = kernelState.lptAsset.toHexString();
  market.liquidityTrancheAssetTokenAddress = lptAsset;
  market.liquidityTrancheAssetTokenId = generateTokenId(lptAsset);
  // Store the LPT asset metadata on the market for consumers that do not join
  // through the liquidity vault.
  market.liquidityTrancheAssetTokenSymbol = erc20Symbol(kernelState.lptAsset);
  market.liquidityTrancheAssetTokenDecimals = erc20Decimals(kernelState.lptAsset);

  const quoteAsset = kernelState.quoteAsset.toHexString();
  market.quoteAssetTokenAddress = quoteAsset;
  market.quoteAssetTokenId = generateTokenId(quoteAsset);
  // The only one of the three whose token may genuinely not exist: a venue-less kernel
  // reports the zero address here, and "" / 0 beside a zero address is the truthful "no
  // quote asset" answer. This is also the ONLY place the quote token's scale and label
  // are recorded — it has no tranche and therefore no DayVaultState (see the schema note).
  market.quoteAssetTokenSymbol = erc20Symbol(kernelState.quoteAsset);
  market.quoteAssetTokenDecimals = erc20Decimals(kernelState.quoteAsset);

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

  // === the three tranches' share-token metadata ===
  //
  // A TRANCHE IS ITS OWN SHARE TOKEN, so these read `symbol()` and `decimals()` straight
  // off the addresses the DeploymentResult already gave us — no extra hop, and no vault
  // needed. Fixed at initialize() with no event for either, so once at creation is the
  // only read (§5).
  //
  // The decimals DUPLICATE each tranche's DayVaultState.shareTokenDecimals — same token,
  // same view — for the same reason the asset columns above duplicate the vaults': a
  // market-level row instead of a three-way join. The symbols exist nowhere else.
  market.seniorTrancheTokenSymbol = erc20Symbol(result.seniorTranche);
  market.seniorTrancheTokenDecimals = erc20Decimals(result.seniorTranche);
  market.juniorTrancheTokenSymbol = erc20Symbol(result.juniorTranche);
  market.juniorTrancheTokenDecimals = erc20Decimals(result.juniorTranche);
  market.liquidityTrancheTokenSymbol = erc20Symbol(
    result.liquidityProviderTranche
  );
  market.liquidityTrancheTokenDecimals = erc20Decimals(
    result.liquidityProviderTranche
  );

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

  // Cache the immutable accountant -> market pairing.
  const accountantMap = new DayAccountantMarketMap(
    generateAccountantMarketMapId(market.accountantAddress)
  );
  accountantMap.marketRefId = market.id;
  accountantMap.save();

  const senior = createVault(
    event,
    result.seniorTranche,
    TRANCHE_TYPE_SENIOR,
    market
  );
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
  writeMarketNav(
    event,
    market,
    marketNavPricesFromVaults(market, senior, junior, liquidity)
  );
}

/** One ERC20's decimals, or the unknown sentinel when the view is unavailable. */
function erc20Decimals(token: Address): i32 {
  if (isZeroAddress(token)) {
    return ERC20_DECIMALS_UNKNOWN;
  }
  const decimals = ERC20.bind(token).try_decimals();
  return decimals.reverted ? ERC20_DECIMALS_UNKNOWN : decimals.value;
}

/** One ERC20's symbol, or the unknown sentinel when the view is unavailable. */
function erc20Symbol(token: Address): string {
  if (isZeroAddress(token)) {
    return ERC20_SYMBOL_UNKNOWN;
  }
  const symbol = ERC20.bind(token).try_symbol();
  return symbol.reverted ? ERC20_SYMBOL_UNKNOWN : symbol.value;
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
  vault.assetTokenId = generateTokenId(assetAddress);
  // decimals() is uint8 -> i32, and Int! IS i32 — assign direct, never
  // BigInt.fromI32() (§4).
  vault.assetTokenDecimals = ERC20.bind(assetToken).decimals();

  // The tranche IS its own share token.
  vault.shareTokenId = generateTokenId(vaultAddress);
  vault.shareTokenAddress = vaultAddress;
  vault.shareTokenDecimals = tranche.decimals();

  // Dynamic templates also process matching logs from earlier in their creation
  // block, so deployment-time seed mints build this accumulator from zero.
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
