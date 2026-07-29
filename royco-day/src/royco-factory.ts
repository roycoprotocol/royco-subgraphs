import { Address, BigInt } from "@graphprotocol/graph-ts";
import { MarketDeploymentCompleted as MarketDeploymentCompletedEvent } from "../generated/RoycoFactory/RoycoFactory";
import {
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
  TRANCHE_TYPE_SENIOR,
  TRANCHE_TYPE_JUNIOR,
  TRANCHE_TYPE_LIQUIDITY,
  ZERO_ADDRESS,
} from "./constants";
import {
  generateMarketId,
  generateTokenId,
  generateVaultId,
} from "./utils";
import { snapshotVault } from "./handlers/base/update-vault";
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

  // === the market's three asset tokens, from dedicated Kernel views ===
  //
  // Three separate calls, not getState() members. Read once here and never again:
  // all three are `immutable` on chain and no event exists for any of them.
  //
  // COLLATERAL_ASSET and LPT_ASSET are declared `public immutable` on RoycoDayKernel
  // itself, so raw is correct — §5's "immutable metadata read once at deployment".
  // The kernel's own constructor requires senior.asset() == junior.asset() ==
  // COLLATERAL_ASSET and liquidity.asset() == LPT_ASSET, so these must agree with the
  // per-vault assetTokenAddress that createVault reads below; storing them at market
  // level saves a three-way join and gives Neon a free consistency check.
  const collateralAsset = kernel.COLLATERAL_ASSET().toHexString();
  market.collateralTokenAddress = collateralAsset;
  market.collateralTokenId = generateTokenId(collateralAsset);

  const lptAsset = kernel.LPT_ASSET().toHexString();
  market.liquidityTrancheAssetTokenAddress = lptAsset;
  market.liquidityTrancheAssetTokenId = generateTokenId(lptAsset);

  // QUOTE_ASSET is the ONE that needs try_. It is `virtual` and BODYLESS on the base
  // kernel — only the liquidity venue concretises it — so a kernel variant without a
  // venue need not implement it. A raw revert here would take down this handler, and
  // with it the market, all three vaults and every row that ever hangs off them. The
  // zero address is the truthful answer for a venue-less market.
  const quote = kernel.try_QUOTE_ASSET();
  const quoteAsset = quote.reverted ? ZERO_ADDRESS : quote.value.toHexString();
  market.quoteAssetTokenAddress = quoteAsset;
  market.quoteAssetTokenId = generateTokenId(quoteAsset);

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

  // === the one record cursor ===
  // A COUNT, not a last-index: the stream is born empty. It survives for
  // DayFixedTermHistory alone — every other stream is keyed and ordered by block
  // number and carries no cursor. See "ENTRY INDEX CURSOR" in schema.graphql.
  market.countFixedTermEntries = BigInt.zero();

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

  const senior = createVault(
    event,
    result.seniorTranche,
    TRANCHE_TYPE_SENIOR,
    market
  );
  // The junior vault is still written, but its return value is not needed: the
  // collateral price covers senior AND junior, so marketNavPricesFromVaults only takes
  // one of the two.
  createVault(event, result.juniorTranche, TRANCHE_TYPE_JUNIOR, market);
  const liquidity = createVault(
    event,
    result.liquidityProviderTranche,
    TRANCHE_TYPE_LIQUIDITY,
    market
  );

  // DayMarketNav entry 0, assembled from the three vaults just written — ZERO extra
  // eth_calls. Both halves are already in hand and already correct:
  //   assetPrice* — each createVault call read its own tranche's converter.
  //   sharePrice* — all five legs provably 0 here, for the same reason the claims
  //                 quintuples are: supply is 0, so _scaleAssetClaims returns the
  //                 zero struct for any input, including one whole share.
  // The sync path CANNOT do this — those copies go stale between mints/burns — so it
  // re-reads all three quintuples live. See refreshMarketNav.
  writeMarketNav(
    event,
    market,
    marketNavPricesFromVaults(market, senior, liquidity)
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
  const assetAddress = tranche.asset().toHexString();
  vault.assetTokenId = generateTokenId(assetAddress);
  vault.assetTokenAddress = assetAddress;
  // decimals() is uint8 -> i32, and Int! IS i32 — assign direct, never
  // BigInt.fromI32() (§4).
  vault.assetTokenDecimals = ERC20.bind(tranche.asset()).decimals();

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
