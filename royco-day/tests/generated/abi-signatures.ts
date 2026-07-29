// ==========================================================================
// GENERATED FILE — DO NOT EDIT.
//
// Produced by scripts/generate-abi-signatures.mjs from abis/*.json, using
// graph-cli's own signature algorithm (scripts/lib/abi.mjs mirrors
// @graphprotocol/graph-cli/dist/protocols/ethereum/abi.js).
//
// Regenerate with `npm run generate`. Drift is caught by `npm run check:drift`.
//
// Contains every function graph codegen emits a binding for: view, pure,
// nonpayable and constant. Only `payable` is excluded (the sole payable
// function across these ABIs is upgradeToAndCall). See CLAUDE.md §5.
// ==========================================================================

// ==========================================================================
// ERC20  (abis/ERC20.json)
// ==========================================================================

// --- callable functions (5) — view/pure/nonpayable/constant ---
export const ERC20__BALANCE_OF: string =
  "balanceOf(address):(uint256)";
export const ERC20__DECIMALS: string =
  "decimals():(uint8)";
export const ERC20__NAME: string =
  "name():(string)";
export const ERC20__SYMBOL: string =
  "symbol():(string)";
export const ERC20__TOTAL_SUPPLY: string =
  "totalSupply():(uint256)";

// --- event signatures (1) — these are the strings for subgraph.template.yaml `event:` ---
export const ERC20__TRANSFER__EVENT: string =
  "Transfer(indexed address,indexed address,uint256)";

// ==========================================================================
// RoycoDayAccountant  (abis/RoycoDayAccountant.json)
// ==========================================================================

// --- callable functions (30) — view/pure/nonpayable/constant ---
export const ROYCO_DAY_ACCOUNTANT__KERNEL: string =
  "KERNEL():(address)";
export const ROYCO_DAY_ACCOUNTANT__UPGRADE_INTERFACE_VERSION: string =
  "UPGRADE_INTERFACE_VERSION():(string)";
export const ROYCO_DAY_ACCOUNTANT__AUTHORITY: string =
  "authority():(address)";
export const ROYCO_DAY_ACCOUNTANT__COMMIT_LIQUIDITY_PROVIDER_TRANCHE_RAW_NAV: string =
  "commitLiquidityProviderTrancheRawNAV(uint256)";
export const ROYCO_DAY_ACCOUNTANT__GET_STATE: string =
  "getState():((uint64,uint64,uint64,uint64,uint64,uint64,uint24,uint8,uint32,uint32,uint32,address,uint64,address,uint64,uint128,uint128,uint256,uint256,uint256,uint256,uint256,uint256,uint256))";
export const ROYCO_DAY_ACCOUNTANT__INITIALIZE: string =
  "initialize((uint64,uint256,uint64,address,bytes,address,bytes,uint64,uint64,uint24,uint256,uint64,uint64,uint64,uint64),address)";
export const ROYCO_DAY_ACCOUNTANT__IS_CONSUMING_SCHEDULED_OP: string =
  "isConsumingScheduledOp():(bytes4)";
export const ROYCO_DAY_ACCOUNTANT__MAX_JT_WITHDRAWAL: string =
  "maxJTWithdrawal((uint8,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint32,uint256,uint256,uint256)):(uint256)";
export const ROYCO_DAY_ACCOUNTANT__MAX_LPT_WITHDRAWAL: string =
  "maxLPTWithdrawal((uint8,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint32,uint256,uint256,uint256)):(uint256)";
export const ROYCO_DAY_ACCOUNTANT__MAX_ST_DEPOSIT: string =
  "maxSTDeposit((uint8,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint32,uint256,uint256,uint256)):(uint256)";
export const ROYCO_DAY_ACCOUNTANT__PAUSE: string =
  "pause()";
export const ROYCO_DAY_ACCOUNTANT__PAUSED: string =
  "paused():(bool)";
export const ROYCO_DAY_ACCOUNTANT__POST_OP_SYNC_TRANCHE_ACCOUNTING: string =
  "postOpSyncTrancheAccounting(uint8,uint256,uint256,uint256,bool):((uint8,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint32,uint256,uint256,uint256))";
export const ROYCO_DAY_ACCOUNTANT__PRE_OP_SYNC_TRANCHE_ACCOUNTING: string =
  "preOpSyncTrancheAccounting(uint256):((uint8,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint32,uint256,uint256,uint256))";
export const ROYCO_DAY_ACCOUNTANT__PREVIEW_SYNC_TRANCHE_ACCOUNTING: string =
  "previewSyncTrancheAccounting(uint256):((uint8,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint32,uint256,uint256,uint256))";
export const ROYCO_DAY_ACCOUNTANT__PROXIABLE_UUID: string =
  "proxiableUUID():(bytes32)";
export const ROYCO_DAY_ACCOUNTANT__SET_AUTHORITY: string =
  "setAuthority(address)";
export const ROYCO_DAY_ACCOUNTANT__SET_DUST_TOLERANCE: string =
  "setDustTolerance(uint256)";
export const ROYCO_DAY_ACCOUNTANT__SET_FIXED_TERM_DURATION: string =
  "setFixedTermDuration(uint24)";
export const ROYCO_DAY_ACCOUNTANT__SET_JT_YIELD_SHARE_PROTOCOL_FEE: string =
  "setJTYieldShareProtocolFee(uint64)";
export const ROYCO_DAY_ACCOUNTANT__SET_JUNIOR_TRANCHE_PROTOCOL_FEE: string =
  "setJuniorTrancheProtocolFee(uint64)";
export const ROYCO_DAY_ACCOUNTANT__SET_JUNIOR_TRANCHE_YDM: string =
  "setJuniorTrancheYDM(address,bytes)";
export const ROYCO_DAY_ACCOUNTANT__SET_LPT_YIELD_SHARE_PROTOCOL_FEE: string =
  "setLPTYieldShareProtocolFee(uint64)";
export const ROYCO_DAY_ACCOUNTANT__SET_LIQUIDATION_COVERAGE_UTILIZATION: string =
  "setLiquidationCoverageUtilization(uint256)";
export const ROYCO_DAY_ACCOUNTANT__SET_LIQUIDITY_PROVIDER_TRANCHE_YDM: string =
  "setLiquidityProviderTrancheYDM(address,bytes)";
export const ROYCO_DAY_ACCOUNTANT__SET_MAX_YIELD_SHARES: string =
  "setMaxYieldShares(uint64,uint64)";
export const ROYCO_DAY_ACCOUNTANT__SET_MIN_COVERAGE: string =
  "setMinCoverage(uint64)";
export const ROYCO_DAY_ACCOUNTANT__SET_MIN_LIQUIDITY: string =
  "setMinLiquidity(uint64)";
export const ROYCO_DAY_ACCOUNTANT__SET_SENIOR_TRANCHE_PROTOCOL_FEE: string =
  "setSeniorTrancheProtocolFee(uint64)";
export const ROYCO_DAY_ACCOUNTANT__UNPAUSE: string =
  "unpause()";

// --- event signatures (21) — these are the strings for subgraph.template.yaml `event:` ---
export const ROYCO_DAY_ACCOUNTANT__AUTHORITY_UPDATED__EVENT: string =
  "AuthorityUpdated(address)";
export const ROYCO_DAY_ACCOUNTANT__COVERAGE_UPDATED__EVENT: string =
  "CoverageUpdated(uint64)";
export const ROYCO_DAY_ACCOUNTANT__DUST_TOLERANCE_UPDATED__EVENT: string =
  "DustToleranceUpdated(uint256)";
export const ROYCO_DAY_ACCOUNTANT__FIXED_TERM_COMMENCED__EVENT: string =
  "FixedTermCommenced(uint32)";
export const ROYCO_DAY_ACCOUNTANT__FIXED_TERM_DURATION_UPDATED__EVENT: string =
  "FixedTermDurationUpdated(uint24)";
export const ROYCO_DAY_ACCOUNTANT__FIXED_TERM_ENDED__EVENT: string =
  "FixedTermEnded()";
export const ROYCO_DAY_ACCOUNTANT__INITIALIZED__EVENT: string =
  "Initialized(uint64)";
export const ROYCO_DAY_ACCOUNTANT__JUNIOR_TRANCHE_IMPERMANENT_LOSS_RESET__EVENT: string =
  "JuniorTrancheImpermanentLossReset(uint256)";
export const ROYCO_DAY_ACCOUNTANT__JUNIOR_TRANCHE_PROTOCOL_FEE_UPDATED__EVENT: string =
  "JuniorTrancheProtocolFeeUpdated(uint64)";
export const ROYCO_DAY_ACCOUNTANT__JUNIOR_TRANCHE_YDM_UPDATED__EVENT: string =
  "JuniorTrancheYDMUpdated(address)";
export const ROYCO_DAY_ACCOUNTANT__JUNIOR_TRANCHE_YIELD_SHARE_PROTOCOL_FEE_UPDATED__EVENT: string =
  "JuniorTrancheYieldShareProtocolFeeUpdated(uint64)";
export const ROYCO_DAY_ACCOUNTANT__LIQUIDATION_COVERAGE_UTILIZATION_UPDATED__EVENT: string =
  "LiquidationCoverageUtilizationUpdated(uint256)";
export const ROYCO_DAY_ACCOUNTANT__LIQUIDITY_PROVIDER_TRANCHE_YDM_UPDATED__EVENT: string =
  "LiquidityProviderTrancheYDMUpdated(address)";
export const ROYCO_DAY_ACCOUNTANT__LIQUIDITY_PROVIDER_TRANCHE_YIELD_SHARE_PROTOCOL_FEE_UPDATED__EVENT: string =
  "LiquidityProviderTrancheYieldShareProtocolFeeUpdated(uint64)";
export const ROYCO_DAY_ACCOUNTANT__LIQUIDITY_UPDATED__EVENT: string =
  "LiquidityUpdated(uint64)";
export const ROYCO_DAY_ACCOUNTANT__MAX_YIELD_SHARES_UPDATED__EVENT: string =
  "MaxYieldSharesUpdated(uint64,uint64)";
export const ROYCO_DAY_ACCOUNTANT__PAUSED__EVENT: string =
  "Paused(address)";
export const ROYCO_DAY_ACCOUNTANT__SENIOR_TRANCHE_PROTOCOL_FEE_UPDATED__EVENT: string =
  "SeniorTrancheProtocolFeeUpdated(uint64)";
export const ROYCO_DAY_ACCOUNTANT__UNPAUSED__EVENT: string =
  "Unpaused(address)";
export const ROYCO_DAY_ACCOUNTANT__UPGRADED__EVENT: string =
  "Upgraded(indexed address)";
export const ROYCO_DAY_ACCOUNTANT__YIELD_SHARES_ACCRUED__EVENT: string =
  "YieldSharesAccrued(uint256,uint256,uint256,uint256)";

// ==========================================================================
// RoycoDayKernel  (abis/RoycoDayKernel.json)
// ==========================================================================

// --- callable functions (52) — view/pure/nonpayable/constant ---
export const ROYCO_DAY_KERNEL__ACCOUNTANT: string =
  "ACCOUNTANT():(address)";
export const ROYCO_DAY_KERNEL__COLLATERAL_ASSET: string =
  "COLLATERAL_ASSET():(address)";
export const ROYCO_DAY_KERNEL__ENFORCE_TRANCHE_WHITELIST_ON_TRANSFER: string =
  "ENFORCE_TRANCHE_WHITELIST_ON_TRANSFER():(bool)";
export const ROYCO_DAY_KERNEL__JUNIOR_TRANCHE: string =
  "JUNIOR_TRANCHE():(address)";
export const ROYCO_DAY_KERNEL__LIQUIDITY_PROVIDER_TRANCHE: string =
  "LIQUIDITY_PROVIDER_TRANCHE():(address)";
export const ROYCO_DAY_KERNEL__LPT_ASSET: string =
  "LPT_ASSET():(address)";
export const ROYCO_DAY_KERNEL__QUOTE_ASSET: string =
  "QUOTE_ASSET():(address)";
export const ROYCO_DAY_KERNEL__SENIOR_TRANCHE: string =
  "SENIOR_TRANCHE():(address)";
export const ROYCO_DAY_KERNEL__UPGRADE_INTERFACE_VERSION: string =
  "UPGRADE_INTERFACE_VERSION():(string)";
export const ROYCO_DAY_KERNEL__ADD_LIQUIDITY: string =
  "addLiquidity(bool,uint256,uint256,uint256):(uint256,uint256,uint256)";
export const ROYCO_DAY_KERNEL__ATTEMPT_LIQUIDITY_PREMIUM_REINVESTMENT: string =
  "attemptLiquidityPremiumReinvestment(uint256,uint256,uint256)";
export const ROYCO_DAY_KERNEL__AUTHORITY: string =
  "authority():(address)";
export const ROYCO_DAY_KERNEL__CONVERT_COLLATERAL_ASSETS_TO_VALUE: string =
  "convertCollateralAssetsToValue(uint256):(uint256)";
export const ROYCO_DAY_KERNEL__CONVERT_LPT_ASSETS_TO_VALUE: string =
  "convertLPTAssetsToValue(uint256):(uint256)";
export const ROYCO_DAY_KERNEL__CONVERT_VALUE_TO_COLLATERAL_ASSETS: string =
  "convertValueToCollateralAssets(uint256):(uint256)";
export const ROYCO_DAY_KERNEL__CONVERT_VALUE_TO_LPT_ASSETS: string =
  "convertValueToLPTAssets(uint256):(uint256)";
export const ROYCO_DAY_KERNEL__ENFORCE_NOT_BLACKLISTED: string =
  "enforceNotBlacklisted(address)";
export const ROYCO_DAY_KERNEL__ENFORCE_NOT_BLACKLISTED__1: string =
  "enforceNotBlacklisted(address[])";
export const ROYCO_DAY_KERNEL__GET_COLLATERAL_ASSET_ORACLE: string =
  "getCollateralAssetOracle():(address)";
export const ROYCO_DAY_KERNEL__GET_STATE: string =
  "getState():((address,uint64,uint256,uint256,uint256,address,address,uint48,address,uint48))";
export const ROYCO_DAY_KERNEL__IS_CONSUMING_SCHEDULED_OP: string =
  "isConsumingScheduledOp():(bytes4)";
export const ROYCO_DAY_KERNEL__JT_DEPOSIT: string =
  "jtDeposit(bool,uint256):(uint256,uint256,uint256)";
export const ROYCO_DAY_KERNEL__JT_MAX_DEPOSIT: string =
  "jtMaxDeposit(address):(uint256)";
export const ROYCO_DAY_KERNEL__JT_MAX_WITHDRAWABLE: string =
  "jtMaxWithdrawable(address):(uint256,uint256,uint256)";
export const ROYCO_DAY_KERNEL__JT_REDEEM: string =
  "jtRedeem(bool,uint256,address):((uint256,uint256,uint256,uint256))";
export const ROYCO_DAY_KERNEL__LPT_DEPOSIT: string =
  "lptDeposit(bool,uint256):(uint256,uint256,uint256)";
export const ROYCO_DAY_KERNEL__LPT_DEPOSIT_MULTI_ASSET: string =
  "lptDepositMultiAsset(bool,uint256,uint256,uint256):(uint256,uint256,uint256)";
export const ROYCO_DAY_KERNEL__LPT_MAX_DEPOSIT: string =
  "lptMaxDeposit(address):(uint256)";
export const ROYCO_DAY_KERNEL__LPT_MAX_WITHDRAWABLE: string =
  "lptMaxWithdrawable(address):(uint256,uint256,uint256)";
export const ROYCO_DAY_KERNEL__LPT_MAX_WITHDRAWABLE_MULTI_ASSET: string =
  "lptMaxWithdrawableMultiAsset(address):(uint256,uint256,uint256)";
export const ROYCO_DAY_KERNEL__LPT_REDEEM: string =
  "lptRedeem(bool,uint256,address):((uint256,uint256,uint256,uint256))";
export const ROYCO_DAY_KERNEL__LPT_REDEEM_MULTI_ASSET: string =
  "lptRedeemMultiAsset(bool,uint256,uint256,uint256,address):((uint256,uint256,uint256,uint256),uint256)";
export const ROYCO_DAY_KERNEL__PAUSE: string =
  "pause()";
export const ROYCO_DAY_KERNEL__PAUSED: string =
  "paused():(bool)";
export const ROYCO_DAY_KERNEL__PRE_TRANCHE_BALANCE_UPDATE_HOOK: string =
  "preTrancheBalanceUpdateHook(address,address,address,uint256)";
export const ROYCO_DAY_KERNEL__PREVIEW_SYNC_TRANCHE_ACCOUNTING_FOR: string =
  "previewSyncTrancheAccountingFor(uint8):((uint8,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint32,uint256,uint256,uint256),(uint256,uint256,uint256,uint256),uint256)";
export const ROYCO_DAY_KERNEL__PROXIABLE_UUID: string =
  "proxiableUUID():(bytes32)";
export const ROYCO_DAY_KERNEL__REINVEST_LIQUIDITY_PREMIUM: string =
  "reinvestLiquidityPremium(uint256)";
export const ROYCO_DAY_KERNEL__REMOVE_LIQUIDITY: string =
  "removeLiquidity(bool,uint256,uint256,uint256,address):(uint256,uint256,uint256)";
export const ROYCO_DAY_KERNEL__SET_AUTHORITY: string =
  "setAuthority(address)";
export const ROYCO_DAY_KERNEL__SET_COLLATERAL_ASSET_ORACLE: string =
  "setCollateralAssetOracle(address,uint48,bool)";
export const ROYCO_DAY_KERNEL__SET_PROTOCOL_FEE_RECIPIENT: string =
  "setProtocolFeeRecipient(address)";
export const ROYCO_DAY_KERNEL__SET_ROYCO_BLACKLIST: string =
  "setRoycoBlacklist(address)";
export const ROYCO_DAY_KERNEL__SET_SENIOR_TRANCHE_SELF_LIQUIDATION_BONUS: string =
  "setSeniorTrancheSelfLiquidationBonus(uint64)";
export const ROYCO_DAY_KERNEL__SET_SEQUENCER_UPTIME_FEED: string =
  "setSequencerUptimeFeed(address,uint48)";
export const ROYCO_DAY_KERNEL__ST_DEPOSIT: string =
  "stDeposit(bool,uint256):(uint256,uint256,uint256)";
export const ROYCO_DAY_KERNEL__ST_MAX_DEPOSIT: string =
  "stMaxDeposit(address):(uint256)";
export const ROYCO_DAY_KERNEL__ST_MAX_WITHDRAWABLE: string =
  "stMaxWithdrawable(address):(uint256,uint256,uint256)";
export const ROYCO_DAY_KERNEL__ST_REDEEM: string =
  "stRedeem(bool,uint256,address):((uint256,uint256,uint256,uint256))";
export const ROYCO_DAY_KERNEL__SYNC_TRANCHE_ACCOUNTING: string =
  "syncTrancheAccounting():((uint8,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint32,uint256,uint256,uint256))";
export const ROYCO_DAY_KERNEL__SYNC_TRANCHE_ACCOUNTING_FOR: string =
  "syncTrancheAccountingFor(uint8):((uint8,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint32,uint256,uint256,uint256),(uint256,uint256,uint256,uint256),uint256)";
export const ROYCO_DAY_KERNEL__UNPAUSE: string =
  "unpause()";

// --- event signatures (14) — these are the strings for subgraph.template.yaml `event:` ---
export const ROYCO_DAY_KERNEL__AUTHORITY_UPDATED__EVENT: string =
  "AuthorityUpdated(address)";
export const ROYCO_DAY_KERNEL__COLLATERAL_ASSET_ORACLE_UPDATED__EVENT: string =
  "CollateralAssetOracleUpdated(indexed address,uint48)";
export const ROYCO_DAY_KERNEL__INITIALIZED__EVENT: string =
  "Initialized(uint64)";
export const ROYCO_DAY_KERNEL__LIQUIDITY_PREMIUM_REINVESTED__EVENT: string =
  "LiquidityPremiumReinvested(uint256,uint256)";
export const ROYCO_DAY_KERNEL__LIQUIDITY_PREMIUM_REINVESTMENT_FAILED__EVENT: string =
  "LiquidityPremiumReinvestmentFailed(uint256,uint256,bytes)";
export const ROYCO_DAY_KERNEL__PAUSED__EVENT: string =
  "Paused(address)";
export const ROYCO_DAY_KERNEL__POST_OP_TRANCHE_ACCOUNTING_SYNCED__EVENT: string =
  "PostOpTrancheAccountingSynced(uint8,(uint8,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint32,uint256,uint256,uint256))";
export const ROYCO_DAY_KERNEL__PRE_OP_TRANCHE_ACCOUNTING_SYNCED__EVENT: string =
  "PreOpTrancheAccountingSynced((uint8,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint32,uint256,uint256,uint256))";
export const ROYCO_DAY_KERNEL__PROTOCOL_FEE_RECIPIENT_UPDATED__EVENT: string =
  "ProtocolFeeRecipientUpdated(address)";
export const ROYCO_DAY_KERNEL__ROYCO_BLACKLIST_UPDATED__EVENT: string =
  "RoycoBlacklistUpdated(address)";
export const ROYCO_DAY_KERNEL__SENIOR_TRANCHE_SELF_LIQUIDATION_BONUS_UPDATED__EVENT: string =
  "SeniorTrancheSelfLiquidationBonusUpdated(uint64)";
export const ROYCO_DAY_KERNEL__SEQUENCER_UPTIME_FEED_UPDATED__EVENT: string =
  "SequencerUptimeFeedUpdated(indexed address,uint48)";
export const ROYCO_DAY_KERNEL__UNPAUSED__EVENT: string =
  "Unpaused(address)";
export const ROYCO_DAY_KERNEL__UPGRADED__EVENT: string =
  "Upgraded(indexed address)";

// ==========================================================================
// RoycoFactory  (abis/RoycoFactory.json)
// ==========================================================================

// --- callable functions (23) — view/pure/nonpayable/constant ---
export const ROYCO_FACTORY__ROYCO_AUTHORITY: string =
  "ROYCO_AUTHORITY():(address)";
export const ROYCO_FACTORY__ROYCO_FACTORY_GATEKEEPER: string =
  "ROYCO_FACTORY_GATEKEEPER():(address)";
export const ROYCO_FACTORY__UPGRADE_INTERFACE_VERSION: string =
  "UPGRADE_INTERFACE_VERSION():(string)";
export const ROYCO_FACTORY__AUTHORITY: string =
  "authority():(address)";
export const ROYCO_FACTORY__DEPLOY_DETERMINISTIC_PROXY: string =
  "deployDeterministicProxy(address,bytes,bytes32):(address)";
export const ROYCO_FACTORY__DEPLOY_DETERMINISTIC_PROXY_FROM_TEMPLATE: string =
  "deployDeterministicProxyFromTemplate(address,bytes,bytes32):(address,bool)";
export const ROYCO_FACTORY__DISABLE_TEMPLATE: string =
  "disableTemplate(address)";
export const ROYCO_FACTORY__EXECUTE_AS_FACTORY: string =
  "executeAsFactory(address,bytes):(bytes)";
export const ROYCO_FACTORY__EXECUTE_MARKET_DEPLOYMENT: string =
  "executeMarketDeployment(address,bytes):((address,address,address,address,address,address,address,bytes))";
export const ROYCO_FACTORY__GET_MARKET: string =
  "getMarket(address):(address,address,address,address)";
export const ROYCO_FACTORY__GRANT_MARKET_ROLE: string =
  "grantMarketRole(uint64[],address[],uint32[])";
export const ROYCO_FACTORY__INITIALIZE: string =
  "initialize(address)";
export const ROYCO_FACTORY__IS_CONSUMING_SCHEDULED_OP: string =
  "isConsumingScheduledOp():(bytes4)";
export const ROYCO_FACTORY__IS_TEMPLATE_ENABLED: string =
  "isTemplateEnabled(address):(bool)";
export const ROYCO_FACTORY__PAUSE: string =
  "pause()";
export const ROYCO_FACTORY__PAUSED: string =
  "paused():(bool)";
export const ROYCO_FACTORY__PREDICT_DETERMINISTIC_ADDRESS: string =
  "predictDeterministicAddress(bytes32):(address)";
export const ROYCO_FACTORY__PROXIABLE_UUID: string =
  "proxiableUUID():(bytes32)";
export const ROYCO_FACTORY__REGISTER_TEMPLATE: string =
  "registerTemplate(address)";
export const ROYCO_FACTORY__SET_AUTHORITY: string =
  "setAuthority(address)";
export const ROYCO_FACTORY__SET_MARKET_TARGET_FUNCTION_ROLE: string =
  "setMarketTargetFunctionRole(address,bytes4[],uint64[])";
export const ROYCO_FACTORY__TRANCHE_TO_KERNEL: string =
  "trancheToKernel(address):(address)";
export const ROYCO_FACTORY__UNPAUSE: string =
  "unpause()";

// --- event signatures (9) — these are the strings for subgraph.template.yaml `event:` ---
export const ROYCO_FACTORY__AUTHORITY_UPDATED__EVENT: string =
  "AuthorityUpdated(address)";
export const ROYCO_FACTORY__INITIALIZED__EVENT: string =
  "Initialized(uint64)";
export const ROYCO_FACTORY__MARKET_DEPLOYMENT_COMPLETED__EVENT: string =
  "MarketDeploymentCompleted(indexed address,indexed address,(address,address,address,address,address,address,address,bytes))";
export const ROYCO_FACTORY__PAUSED__EVENT: string =
  "Paused(address)";
export const ROYCO_FACTORY__PROXY_DEPLOYED__EVENT: string =
  "ProxyDeployed(indexed address,indexed address,bytes32)";
export const ROYCO_FACTORY__TEMPLATE_DISABLED__EVENT: string =
  "TemplateDisabled(indexed address)";
export const ROYCO_FACTORY__TEMPLATE_REGISTERED__EVENT: string =
  "TemplateRegistered(indexed address)";
export const ROYCO_FACTORY__UNPAUSED__EVENT: string =
  "Unpaused(address)";
export const ROYCO_FACTORY__UPGRADED__EVENT: string =
  "Upgraded(indexed address)";

// ==========================================================================
// RoycoJuniorTranche  (abis/RoycoJuniorTranche.json)
// ==========================================================================

// --- callable functions (38) — view/pure/nonpayable/constant ---
export const ROYCO_JUNIOR_TRANCHE__DOMAIN_SEPARATOR: string =
  "DOMAIN_SEPARATOR():(bytes32)";
export const ROYCO_JUNIOR_TRANCHE__KERNEL: string =
  "KERNEL():(address)";
export const ROYCO_JUNIOR_TRANCHE__TRANCHE_TYPE: string =
  "TRANCHE_TYPE():(uint8)";
export const ROYCO_JUNIOR_TRANCHE__UPGRADE_INTERFACE_VERSION: string =
  "UPGRADE_INTERFACE_VERSION():(string)";
export const ROYCO_JUNIOR_TRANCHE__ALLOWANCE: string =
  "allowance(address,address):(uint256)";
export const ROYCO_JUNIOR_TRANCHE__APPROVE: string =
  "approve(address,uint256):(bool)";
export const ROYCO_JUNIOR_TRANCHE__ASSET: string =
  "asset():(address)";
export const ROYCO_JUNIOR_TRANCHE__AUTHORITY: string =
  "authority():(address)";
export const ROYCO_JUNIOR_TRANCHE__BALANCE_OF: string =
  "balanceOf(address):(uint256)";
export const ROYCO_JUNIOR_TRANCHE__BURN: string =
  "burn(uint256)";
export const ROYCO_JUNIOR_TRANCHE__BURN_FROM: string =
  "burnFrom(address,uint256)";
export const ROYCO_JUNIOR_TRANCHE__CONVERT_TO_ASSETS: string =
  "convertToAssets(uint256):((uint256,uint256,uint256,uint256))";
export const ROYCO_JUNIOR_TRANCHE__CONVERT_TO_SHARES: string =
  "convertToShares(uint256):(uint256)";
export const ROYCO_JUNIOR_TRANCHE__DECIMALS: string =
  "decimals():(uint8)";
export const ROYCO_JUNIOR_TRANCHE__DEPOSIT: string =
  "deposit(uint256,address):(uint256)";
export const ROYCO_JUNIOR_TRANCHE__EIP712_DOMAIN: string =
  "eip712Domain():(bytes1,string,string,uint256,address,bytes32,uint256[])";
export const ROYCO_JUNIOR_TRANCHE__INITIALIZE: string =
  "initialize((string,string,address))";
export const ROYCO_JUNIOR_TRANCHE__IS_CONSUMING_SCHEDULED_OP: string =
  "isConsumingScheduledOp():(bytes4)";
export const ROYCO_JUNIOR_TRANCHE__MAX_DEPOSIT: string =
  "maxDeposit(address):(uint256)";
export const ROYCO_JUNIOR_TRANCHE__MAX_REDEEM: string =
  "maxRedeem(address):(uint256)";
export const ROYCO_JUNIOR_TRANCHE__MINT: string =
  "mint(address,uint256)";
export const ROYCO_JUNIOR_TRANCHE__MINT_PROTOCOL_FEE_SHARES: string =
  "mintProtocolFeeShares(address,uint256):(uint256)";
export const ROYCO_JUNIOR_TRANCHE__NAME: string =
  "name():(string)";
export const ROYCO_JUNIOR_TRANCHE__NONCES: string =
  "nonces(address):(uint256)";
export const ROYCO_JUNIOR_TRANCHE__PAUSE: string =
  "pause()";
export const ROYCO_JUNIOR_TRANCHE__PAUSED: string =
  "paused():(bool)";
export const ROYCO_JUNIOR_TRANCHE__PERMIT: string =
  "permit(address,address,uint256,uint256,uint8,bytes32,bytes32)";
export const ROYCO_JUNIOR_TRANCHE__PREVIEW_DEPOSIT: string =
  "previewDeposit(uint256):(uint256)";
export const ROYCO_JUNIOR_TRANCHE__PREVIEW_REDEEM: string =
  "previewRedeem(uint256):((uint256,uint256,uint256,uint256))";
export const ROYCO_JUNIOR_TRANCHE__PROXIABLE_UUID: string =
  "proxiableUUID():(bytes32)";
export const ROYCO_JUNIOR_TRANCHE__REDEEM: string =
  "redeem(uint256,address,address):((uint256,uint256,uint256,uint256))";
export const ROYCO_JUNIOR_TRANCHE__SET_AUTHORITY: string =
  "setAuthority(address)";
export const ROYCO_JUNIOR_TRANCHE__SYMBOL: string =
  "symbol():(string)";
export const ROYCO_JUNIOR_TRANCHE__TOTAL_ASSETS: string =
  "totalAssets():((uint256,uint256,uint256,uint256))";
export const ROYCO_JUNIOR_TRANCHE__TOTAL_SUPPLY: string =
  "totalSupply():(uint256)";
export const ROYCO_JUNIOR_TRANCHE__TRANSFER: string =
  "transfer(address,uint256):(bool)";
export const ROYCO_JUNIOR_TRANCHE__TRANSFER_FROM: string =
  "transferFrom(address,address,uint256):(bool)";
export const ROYCO_JUNIOR_TRANCHE__UNPAUSE: string =
  "unpause()";

// --- event signatures (11) — these are the strings for subgraph.template.yaml `event:` ---
export const ROYCO_JUNIOR_TRANCHE__APPROVAL__EVENT: string =
  "Approval(indexed address,indexed address,uint256)";
export const ROYCO_JUNIOR_TRANCHE__AUTHORITY_UPDATED__EVENT: string =
  "AuthorityUpdated(address)";
export const ROYCO_JUNIOR_TRANCHE__DEPOSIT__EVENT: string =
  "Deposit(indexed address,indexed address,uint256,uint256)";
export const ROYCO_JUNIOR_TRANCHE__EIP712_DOMAIN_CHANGED__EVENT: string =
  "EIP712DomainChanged()";
export const ROYCO_JUNIOR_TRANCHE__INITIALIZED__EVENT: string =
  "Initialized(uint64)";
export const ROYCO_JUNIOR_TRANCHE__PAUSED__EVENT: string =
  "Paused(address)";
export const ROYCO_JUNIOR_TRANCHE__PROTOCOL_FEE_SHARES_MINTED__EVENT: string =
  "ProtocolFeeSharesMinted(indexed address,uint256,uint256)";
export const ROYCO_JUNIOR_TRANCHE__REDEEM__EVENT: string =
  "Redeem(indexed address,indexed address,(uint256,uint256,uint256,uint256),uint256)";
export const ROYCO_JUNIOR_TRANCHE__TRANSFER__EVENT: string =
  "Transfer(indexed address,indexed address,uint256)";
export const ROYCO_JUNIOR_TRANCHE__UNPAUSED__EVENT: string =
  "Unpaused(address)";
export const ROYCO_JUNIOR_TRANCHE__UPGRADED__EVENT: string =
  "Upgraded(indexed address)";

// ==========================================================================
// RoycoLiquidityProviderTranche  (abis/RoycoLiquidityProviderTranche.json)
// ==========================================================================

// --- callable functions (43) — view/pure/nonpayable/constant ---
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__DOMAIN_SEPARATOR: string =
  "DOMAIN_SEPARATOR():(bytes32)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__KERNEL: string =
  "KERNEL():(address)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__TRANCHE_TYPE: string =
  "TRANCHE_TYPE():(uint8)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__UPGRADE_INTERFACE_VERSION: string =
  "UPGRADE_INTERFACE_VERSION():(string)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__ALLOWANCE: string =
  "allowance(address,address):(uint256)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__APPROVE: string =
  "approve(address,uint256):(bool)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__ASSET: string =
  "asset():(address)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__AUTHORITY: string =
  "authority():(address)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__BALANCE_OF: string =
  "balanceOf(address):(uint256)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__BURN: string =
  "burn(uint256)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__BURN_FROM: string =
  "burnFrom(address,uint256)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__CONVERT_TO_ASSETS: string =
  "convertToAssets(uint256):((uint256,uint256,uint256,uint256))";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__CONVERT_TO_SHARES: string =
  "convertToShares(uint256):(uint256)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__DECIMALS: string =
  "decimals():(uint8)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__DEPOSIT: string =
  "deposit(uint256,address):(uint256)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__DEPOSIT_MULTI_ASSET: string =
  "depositMultiAsset(uint256,uint256,uint256,address):(uint256,uint256)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__EIP712_DOMAIN: string =
  "eip712Domain():(bytes1,string,string,uint256,address,bytes32,uint256[])";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__INITIALIZE: string =
  "initialize((string,string,address))";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__IS_CONSUMING_SCHEDULED_OP: string =
  "isConsumingScheduledOp():(bytes4)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__MAX_DEPOSIT: string =
  "maxDeposit(address):(uint256)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__MAX_REDEEM: string =
  "maxRedeem(address):(uint256)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__MAX_REDEEM_MULTI_ASSET: string =
  "maxRedeemMultiAsset(address):(uint256)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__MINT: string =
  "mint(address,uint256)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__MINT_PROTOCOL_FEE_SHARES: string =
  "mintProtocolFeeShares(address,uint256):(uint256)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__NAME: string =
  "name():(string)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__NONCES: string =
  "nonces(address):(uint256)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__PAUSE: string =
  "pause()";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__PAUSED: string =
  "paused():(bool)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__PERMIT: string =
  "permit(address,address,uint256,uint256,uint8,bytes32,bytes32)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__PREVIEW_DEPOSIT: string =
  "previewDeposit(uint256):(uint256)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__PREVIEW_DEPOSIT_MULTI_ASSET: string =
  "previewDepositMultiAsset(uint256,uint256):(uint256,uint256)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__PREVIEW_REDEEM: string =
  "previewRedeem(uint256):((uint256,uint256,uint256,uint256))";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__PREVIEW_REDEEM_MULTI_ASSET: string =
  "previewRedeemMultiAsset(uint256):((uint256,uint256,uint256,uint256),uint256)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__PROXIABLE_UUID: string =
  "proxiableUUID():(bytes32)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__REDEEM: string =
  "redeem(uint256,address,address):((uint256,uint256,uint256,uint256))";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__REDEEM_MULTI_ASSET: string =
  "redeemMultiAsset(uint256,uint256,uint256,address,address):((uint256,uint256,uint256,uint256),uint256)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__SET_AUTHORITY: string =
  "setAuthority(address)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__SYMBOL: string =
  "symbol():(string)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__TOTAL_ASSETS: string =
  "totalAssets():((uint256,uint256,uint256,uint256))";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__TOTAL_SUPPLY: string =
  "totalSupply():(uint256)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__TRANSFER: string =
  "transfer(address,uint256):(bool)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__TRANSFER_FROM: string =
  "transferFrom(address,address,uint256):(bool)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__UNPAUSE: string =
  "unpause()";

// --- event signatures (13) — these are the strings for subgraph.template.yaml `event:` ---
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__APPROVAL__EVENT: string =
  "Approval(indexed address,indexed address,uint256)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__AUTHORITY_UPDATED__EVENT: string =
  "AuthorityUpdated(address)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__DEPOSIT__EVENT: string =
  "Deposit(indexed address,indexed address,uint256,uint256)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__EIP712_DOMAIN_CHANGED__EVENT: string =
  "EIP712DomainChanged()";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__INITIALIZED__EVENT: string =
  "Initialized(uint64)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__MULTI_ASSET_DEPOSIT__EVENT: string =
  "MultiAssetDeposit(indexed address,indexed address,uint256,uint256,uint256,uint256)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__MULTI_ASSET_REDEEM__EVENT: string =
  "MultiAssetRedeem(indexed address,indexed address,indexed address,uint256,(uint256,uint256,uint256,uint256),uint256)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__PAUSED__EVENT: string =
  "Paused(address)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__PROTOCOL_FEE_SHARES_MINTED__EVENT: string =
  "ProtocolFeeSharesMinted(indexed address,uint256,uint256)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__REDEEM__EVENT: string =
  "Redeem(indexed address,indexed address,(uint256,uint256,uint256,uint256),uint256)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__TRANSFER__EVENT: string =
  "Transfer(indexed address,indexed address,uint256)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__UNPAUSED__EVENT: string =
  "Unpaused(address)";
export const ROYCO_LIQUIDITY_PROVIDER_TRANCHE__UPGRADED__EVENT: string =
  "Upgraded(indexed address)";

// ==========================================================================
// RoycoSeniorTranche  (abis/RoycoSeniorTranche.json)
// ==========================================================================

// --- callable functions (39) — view/pure/nonpayable/constant ---
export const ROYCO_SENIOR_TRANCHE__DOMAIN_SEPARATOR: string =
  "DOMAIN_SEPARATOR():(bytes32)";
export const ROYCO_SENIOR_TRANCHE__KERNEL: string =
  "KERNEL():(address)";
export const ROYCO_SENIOR_TRANCHE__TRANCHE_TYPE: string =
  "TRANCHE_TYPE():(uint8)";
export const ROYCO_SENIOR_TRANCHE__UPGRADE_INTERFACE_VERSION: string =
  "UPGRADE_INTERFACE_VERSION():(string)";
export const ROYCO_SENIOR_TRANCHE__ALLOWANCE: string =
  "allowance(address,address):(uint256)";
export const ROYCO_SENIOR_TRANCHE__APPROVE: string =
  "approve(address,uint256):(bool)";
export const ROYCO_SENIOR_TRANCHE__ASSET: string =
  "asset():(address)";
export const ROYCO_SENIOR_TRANCHE__AUTHORITY: string =
  "authority():(address)";
export const ROYCO_SENIOR_TRANCHE__BALANCE_OF: string =
  "balanceOf(address):(uint256)";
export const ROYCO_SENIOR_TRANCHE__BURN: string =
  "burn(uint256)";
export const ROYCO_SENIOR_TRANCHE__BURN_FROM: string =
  "burnFrom(address,uint256)";
export const ROYCO_SENIOR_TRANCHE__CONVERT_TO_ASSETS: string =
  "convertToAssets(uint256):((uint256,uint256,uint256,uint256))";
export const ROYCO_SENIOR_TRANCHE__CONVERT_TO_SHARES: string =
  "convertToShares(uint256):(uint256)";
export const ROYCO_SENIOR_TRANCHE__DECIMALS: string =
  "decimals():(uint8)";
export const ROYCO_SENIOR_TRANCHE__DEPOSIT: string =
  "deposit(uint256,address):(uint256)";
export const ROYCO_SENIOR_TRANCHE__EIP712_DOMAIN: string =
  "eip712Domain():(bytes1,string,string,uint256,address,bytes32,uint256[])";
export const ROYCO_SENIOR_TRANCHE__INITIALIZE: string =
  "initialize((string,string,address))";
export const ROYCO_SENIOR_TRANCHE__IS_CONSUMING_SCHEDULED_OP: string =
  "isConsumingScheduledOp():(bytes4)";
export const ROYCO_SENIOR_TRANCHE__MAX_DEPOSIT: string =
  "maxDeposit(address):(uint256)";
export const ROYCO_SENIOR_TRANCHE__MAX_REDEEM: string =
  "maxRedeem(address):(uint256)";
export const ROYCO_SENIOR_TRANCHE__MINT: string =
  "mint(address,uint256)";
export const ROYCO_SENIOR_TRANCHE__MINT_LIQUIDITY_PREMIUM_SHARES: string =
  "mintLiquidityPremiumShares(uint256):(uint256)";
export const ROYCO_SENIOR_TRANCHE__MINT_PROTOCOL_FEE_SHARES: string =
  "mintProtocolFeeShares(address,uint256):(uint256)";
export const ROYCO_SENIOR_TRANCHE__NAME: string =
  "name():(string)";
export const ROYCO_SENIOR_TRANCHE__NONCES: string =
  "nonces(address):(uint256)";
export const ROYCO_SENIOR_TRANCHE__PAUSE: string =
  "pause()";
export const ROYCO_SENIOR_TRANCHE__PAUSED: string =
  "paused():(bool)";
export const ROYCO_SENIOR_TRANCHE__PERMIT: string =
  "permit(address,address,uint256,uint256,uint8,bytes32,bytes32)";
export const ROYCO_SENIOR_TRANCHE__PREVIEW_DEPOSIT: string =
  "previewDeposit(uint256):(uint256)";
export const ROYCO_SENIOR_TRANCHE__PREVIEW_REDEEM: string =
  "previewRedeem(uint256):((uint256,uint256,uint256,uint256))";
export const ROYCO_SENIOR_TRANCHE__PROXIABLE_UUID: string =
  "proxiableUUID():(bytes32)";
export const ROYCO_SENIOR_TRANCHE__REDEEM: string =
  "redeem(uint256,address,address):((uint256,uint256,uint256,uint256))";
export const ROYCO_SENIOR_TRANCHE__SET_AUTHORITY: string =
  "setAuthority(address)";
export const ROYCO_SENIOR_TRANCHE__SYMBOL: string =
  "symbol():(string)";
export const ROYCO_SENIOR_TRANCHE__TOTAL_ASSETS: string =
  "totalAssets():((uint256,uint256,uint256,uint256))";
export const ROYCO_SENIOR_TRANCHE__TOTAL_SUPPLY: string =
  "totalSupply():(uint256)";
export const ROYCO_SENIOR_TRANCHE__TRANSFER: string =
  "transfer(address,uint256):(bool)";
export const ROYCO_SENIOR_TRANCHE__TRANSFER_FROM: string =
  "transferFrom(address,address,uint256):(bool)";
export const ROYCO_SENIOR_TRANCHE__UNPAUSE: string =
  "unpause()";

// --- event signatures (12) — these are the strings for subgraph.template.yaml `event:` ---
export const ROYCO_SENIOR_TRANCHE__APPROVAL__EVENT: string =
  "Approval(indexed address,indexed address,uint256)";
export const ROYCO_SENIOR_TRANCHE__AUTHORITY_UPDATED__EVENT: string =
  "AuthorityUpdated(address)";
export const ROYCO_SENIOR_TRANCHE__DEPOSIT__EVENT: string =
  "Deposit(indexed address,indexed address,uint256,uint256)";
export const ROYCO_SENIOR_TRANCHE__EIP712_DOMAIN_CHANGED__EVENT: string =
  "EIP712DomainChanged()";
export const ROYCO_SENIOR_TRANCHE__INITIALIZED__EVENT: string =
  "Initialized(uint64)";
export const ROYCO_SENIOR_TRANCHE__LIQUIDITY_PREMIUM_SHARES_MINTED__EVENT: string =
  "LiquidityPremiumSharesMinted(indexed address,uint256,uint256)";
export const ROYCO_SENIOR_TRANCHE__PAUSED__EVENT: string =
  "Paused(address)";
export const ROYCO_SENIOR_TRANCHE__PROTOCOL_FEE_SHARES_MINTED__EVENT: string =
  "ProtocolFeeSharesMinted(indexed address,uint256,uint256)";
export const ROYCO_SENIOR_TRANCHE__REDEEM__EVENT: string =
  "Redeem(indexed address,indexed address,(uint256,uint256,uint256,uint256),uint256)";
export const ROYCO_SENIOR_TRANCHE__TRANSFER__EVENT: string =
  "Transfer(indexed address,indexed address,uint256)";
export const ROYCO_SENIOR_TRANCHE__UNPAUSED__EVENT: string =
  "Unpaused(address)";
export const ROYCO_SENIOR_TRANCHE__UPGRADED__EVENT: string =
  "Upgraded(indexed address)";

