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
  RoycoLiquidityTranche,
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
} from "./constants";
import {
  generateMarketId,
  generateTokenId,
  generateVaultId,
} from "./utils";
import { assetPriceNAV } from "./handlers/base/asset-price-nav";
import { snapshotVault } from "./handlers/base/update-vault";

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
 *   - 3 DayVaultStateHistorical at entryIndex 0 — the creation snapshot
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
  RoycoLiquidityTranche.create(result.liquidityTranche);
  RoycoDayAccountant.create(result.accountant);
  RoycoDayKernel.create(result.kernel);

  const accountant = RoycoDayAccountantContract.bind(result.accountant);
  const kernel = RoycoDayKernelContract.bind(result.kernel);

  // getState() on both is a plain storage read that cannot revert, so raw is
  // fine (§5). previewSyncTrancheAccounting below is NOT — it computes.
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
  market.liquidityTrancheAddress = result.liquidityTranche.toHexString();
  market.seniorTrancheId = generateVaultId(market.seniorTrancheAddress);
  market.juniorTrancheId = generateVaultId(market.juniorTrancheAddress);
  market.liquidityTrancheId = generateVaultId(market.liquidityTrancheAddress);
  market.kernelAddress = marketId;
  market.accountantAddress = result.accountant.toHexString();
  // `ydm` is the JUNIOR ydm and `ltYdm` is the liquidity one. The ABI does not
  // name the first `jtYdm` — this is the transposition trap in §6.
  market.juniorTrancheYdmAddress = result.ydm.toHexString();
  market.liquidityTrancheYdmAddress = result.ltYdm.toHexString();
  market.creationEncodedData = result.extras.toHexString();

  // === from RoycoDayAccountant.getState() ===
  market.seniorTrancheProtocolFeeWAD = accountantState.stProtocolFeeWAD;
  market.juniorTrancheProtocolFeeWAD = accountantState.jtProtocolFeeWAD;
  market.juniorTrancheYieldShareProtocolFeeWAD =
    accountantState.jtYieldShareProtocolFeeWAD;
  market.liquidityTrancheYieldShareProtocolFeeWAD =
    accountantState.ltYieldShareProtocolFeeWAD;
  // The STORED thresholds. previewSyncTrancheAccounting's TrancheState carries
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
    accountantState.twLTYieldShareAccruedWAD;
  market.maxLiquidityTrancheYieldShareAccruedWAD =
    accountantState.maxLTYieldShareWAD;
  market.coverageLiquidationUtilizationWAD =
    accountantState.coverageLiquidationUtilizationWAD;
  market.seniorTrancheDustTolerance = accountantState.stNAVDustTolerance;
  market.juniorTrancheDustTolerance = accountantState.jtNAVDustTolerance;
  market.effectiveNAVDustTolerance = accountantState.effectiveNAVDustTolerance;

  // === from RoycoDayKernel.getState() ===
  market.protocolFeeRecipientAddress =
    kernelState.protocolFeeRecipient.toHexString();
  market.seniorTrancheSelfLiquidationBonusWAD =
    kernelState.stSelfLiquidationBonusWAD;
  market.seniorTrancheOwnedYieldBearingAssets =
    kernelState.stOwnedYieldBearingAssets;
  market.juniorTrancheOwnedYieldBearingAssets =
    kernelState.jtOwnedYieldBearingAssets;
  market.liquidityTrancheOwnedYieldBearingAssets =
    kernelState.ltOwnedYieldBearingAssets;
  market.liquidityTrancheOwnedSeniorTrancheShares =
    kernelState.ltOwnedSeniorTrancheShares;

  // === from RoycoDayKernel.previewSyncTrancheAccounting(_trancheType) ===
  //
  // `state` is tranche-INDEPENDENT, so any tranche type returns the same values
  // here. We still read the senior tranche's own TRANCHE_TYPE() rather than pass
  // a literal 0 — the ABI carries no enum member names, so 0/1/2 is an inference
  // (§6). Only `claims`, which this entity does not consume, varies by type.
  const seniorTrancheType = TrancheContract.bind(result.seniorTranche).TRANCHE_TYPE();
  const preview = kernel.try_previewSyncTrancheAccounting(seniorTrancheType);
  if (!preview.reverted) {
    const state = preview.value.getState();
    market.seniorTrancheRawNAV = state.stRawNAV;
    market.juniorTrancheRawNAV = state.jtRawNAV;
    market.liquidityTrancheRawNAV = state.ltRawNAV;
    market.seniorTrancheEffectiveNAV = state.stEffectiveNAV;
    market.juniorTrancheEffectiveNAV = state.jtEffectiveNAV;
    market.juniorTrancheCoverageImpermanentLoss = state.jtCoverageImpermanentLoss;
    market.liquidityTrancheLiquidityPremium = state.ltLiquidityPremium;
    market.coverageUtilizationWAD = state.coverageUtilizationWAD;
    market.liquidityUtilizationWAD = state.liquidityUtilizationWAD;
    market.isJuniorTrancheCoinvested = state.jtCoinvested;
    // NOTE: `state` also carries minCoverageWAD / minLiquidityWAD. Do NOT read
    // them here — those are the LIVE values and the schema stores the Accountant's
    // stored ones, set above (§6).
  } else {
    // No previous value to fall back on at creation, and every field is non-null
    // — an unset one is fatal at index time (§8). A market this young has no NAV
    // to speak of, so zero is also the truthful answer.
    market.seniorTrancheRawNAV = BigInt.zero();
    market.juniorTrancheRawNAV = BigInt.zero();
    market.liquidityTrancheRawNAV = BigInt.zero();
    market.seniorTrancheEffectiveNAV = BigInt.zero();
    market.juniorTrancheEffectiveNAV = BigInt.zero();
    market.juniorTrancheCoverageImpermanentLoss = BigInt.zero();
    market.liquidityTrancheLiquidityPremium = BigInt.zero();
    market.coverageUtilizationWAD = BigInt.zero();
    market.liquidityUtilizationWAD = BigInt.zero();
    market.isJuniorTrancheCoinvested = false;
    // minCoverageWAD / minLiquidityWAD are deliberately absent from this branch:
    // they come from the raw getState() above, which cannot revert, so a known-good
    // value is always in hand. Zeroing them here would discard it — and a zero
    // coverage floor is the most dangerous possible wrong answer for that field.
  }

  // === record cursors ===
  // Counts, not last-indices: every stream is born empty. See the "=> records"
  // block in schema.graphql.
  market.countFixedTermEntries = BigInt.zero();
  market.countJuniorTrancheYieldSharesAccruedEntries = BigInt.zero();
  market.countLiquidityTrancheYieldSharesAccruedEntries = BigInt.zero();
  market.countTrancheAccountingSyncedEntries = BigInt.zero();
  market.countLiquidityPremiumSharesMintedEntries = BigInt.zero();
  market.countLiquidityPremiumReinvestedEntries = BigInt.zero();
  market.countLiquidityPremiumReinvestmentFailedEntries = BigInt.zero();

  // A lifetime accumulator, not a cursor: every coverage-loss erase adds to it.
  // Zero is the only truthful seed — nothing has been erased yet, and unlike every
  // other contract-sourced field on this entity there is no getState() member to
  // read it from. The subgraph is the only thing that tracks this total.
  market.juniorTrancheCoverageLossNAV = BigInt.zero();

  market.createdAtTransactionHash = event.transaction.hash.toHexString();
  market.createdAtBlockNumber = event.block.number;
  market.createdAtBlockTimestamp = event.block.timestamp;
  market.updatedAtTransactionHash = event.transaction.hash.toHexString();
  market.updatedAtBlockNumber = event.block.number;
  market.updatedAtBlockTimestamp = event.block.timestamp;

  market.save();

  createVault(event, result.seniorTranche, TRANCHE_TYPE_SENIOR, market);
  createVault(event, result.juniorTranche, TRANCHE_TYPE_JUNIOR, market);
  createVault(event, result.liquidityTranche, TRANCHE_TYPE_LIQUIDITY, market);
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
): void {
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

  // BOTH AssetClaims quintuples are provably ALL ZERO at deployment, so there is
  // nothing to call. convertToAssets -> _scaleAssetClaims returns the zero struct
  // whenever the tranche's total shares is zero, for ANY input — including the
  // one-whole-share input behind sharePrice*. And the supply IS zero here: every
  // _mint in the contracts lives in deposit / depositMultiAsset / mint /
  // mintProtocolFeeShares / mintLiquidityPremiumShares, none of which is reachable
  // from deployMarket or initialize.
  //
  // So two try_convertToAssets calls per tranche (six per market) would spend an
  // eth_call each to be told zero. The handlers in src/handlers/base/update-vault.ts
  // own these fields from the first mint onward.
  //
  // If a future template CAN seed supply during deployMarket, this becomes wrong
  // silently — the zero guard in _scaleAssetClaims is the only thing holding it up.
  vault.claimsSeniorTrancheAssets = BigInt.zero();
  vault.claimsJuniorTrancheAssets = BigInt.zero();
  vault.claimsLiquidityTrancheAssets = BigInt.zero();
  vault.claimsSeniorTrancheShares = BigInt.zero();
  vault.claimsNAV = BigInt.zero();
  vault.sharePriceSeniorTrancheAssets = BigInt.zero();
  vault.sharePriceJuniorTrancheAssets = BigInt.zero();
  vault.sharePriceLiquidityTrancheAssets = BigInt.zero();
  vault.sharePriceSeniorTrancheShares = BigInt.zero();
  vault.sharePriceNAV = BigInt.zero();

  // NOT supply-scaled, so this one CAN be non-zero at creation — it is a unit
  // conversion on the Kernel, not a claim. No previous value yet, so the fallback
  // is zero (§5/§8).
  vault.assetPriceNAV = assetPriceNAV(
    market.kernelAddress,
    minorType,
    vault.assetTokenDecimals,
    BigInt.zero()
  );

  // The creation snapshot IS entry 0, so the cursor starts at 0 and the next
  // snapshot writes 1. Total snapshots == lastHistoricalEntryIndex + 1.
  vault.lastHistoricalEntryIndex = BigInt.zero();

  vault.createdAtTransactionHash = event.transaction.hash.toHexString();
  vault.createdAtBlockNumber = event.block.number;
  vault.createdAtBlockTimestamp = event.block.timestamp;
  vault.updatedAtTransactionHash = event.transaction.hash.toHexString();
  vault.updatedAtBlockNumber = event.block.number;
  vault.updatedAtBlockTimestamp = event.block.timestamp;

  vault.save();

  snapshotVault(event, vault);
}
