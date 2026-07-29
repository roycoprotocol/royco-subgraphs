import { BigInt } from "@graphprotocol/graph-ts";
import { CHAIN_ID } from "../constants";

// =============================================================================
// Entity ID generators.
//
// RULES:
//   1. NEVER inline an id in a handler. Every id gets a generator here, so that
//      the format lives in exactly one place. An id format change is silently
//      catastrophic in a Postgres mirror: it doesn't error, it forks entity
//      lineage into duplicate rows and orphans every cross-entity reference.
//   2. Addresses are lowercase hex WITH the 0x prefix, i.e. straight from
//      `.toHexString()`. Never pass a checksummed address — ids won't match on
//      load and you'll silently create a second entity.
//   3. Every immutable entity's id MUST carry a per-write discriminator
//      (entryIndex, or txHash+logIndex). See "ENTRY INDEX CURSOR" in
//      schema.graphql.
//   4. Built with .concat() — house style across this monorepo, and the AS
//      compiler handles it predictably. See CLAUDE.md §3.
// =============================================================================

/** <CHAIN_ID>_<TRANSACTION_HASH>_<LOG_INDEX> — the base for per-event ids. */
export function generateId(transactionHash: string, logIndex: BigInt): string {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(transactionHash)
    .concat("_")
    .concat(logIndex.toString());
}

// === MARKETS ===

/**
 * DayMarketState.id = <CHAIN_ID>_<KERNEL_ADDRESS>
 * The kernel address IS the marketId. See CLAUDE.md §6.
 */
export const generateMarketId = (kernelAddress: string): string => {
  return CHAIN_ID.toString().concat("_").concat(kernelAddress);
};

// === RECORDS ===

/**
 * The shared id shape for EVERY market-keyed record stream:
 *   <CHAIN_ID>_<MARKET_ID>_<ENTRY_INDEX>
 * DayFixedTermHistory, DayLiquidityPremiumSharesMintedHistory, and the yield-share
 * accrual streams all key on it. One generator so the format lives in one place
 * (§8) — a stream that needs a different shape gets its own, not a tweak to this.
 *
 * The entryIndex comes from that stream's DayMarketState.count*Entries cursor,
 * which is a COUNT and not a last-index: read it, use it, THEN increment (the
 * inverse of lastHistoricalEntryIndex). The record streams are born empty, so the
 * first entry is 0 and the count becomes 1. See "ENTRY INDEX CURSOR" in schema.graphql.
 *
 * `marketId` here is the bare KERNEL ADDRESS, not the composite <CHAIN>_<KERNEL>
 * — passing DayMarketState.id by mistake yields "1_1_0xkernel_0", which builds,
 * indexes, and silently forks the stream. Pass market.marketId, never market.id.
 */
export const generateMarketRecordId = (
  marketId: string,
  entryIndex: BigInt
): string => {
  return generateMarketId(marketId).concat("_").concat(entryIndex.toString());
};

/**
 * DayMarketNav.id = <CHAIN_ID>_<MARKET_ID>
 *
 * Byte-identical to generateMarketId — one live NAV row per market, keyed exactly
 * like the DayMarketState it hangs off. It gets its OWN generator anyway (rule 1):
 * `generateMarketNavId(market.marketId)` at the call site says which table is being
 * addressed, and if either id shape ever moves, only one of them moves.
 *
 * Pass the bare KERNEL ADDRESS (market.marketId), never the composite
 * DayMarketState.id — that yields "1_1_0xkernel", which builds and indexes.
 */
export const generateMarketNavId = (marketId: string): string => {
  return generateMarketId(marketId);
};

/**
 * DayMarketNavHistorical.id = <CHAIN_ID>_<MARKET_ID>_<BLOCK_NUMBER>
 *
 * KEYED BY BLOCK, not by entryIndex — the second of the two ids in this file that are
 * (see generateMarketBlockRecordId, which does the same for the sync stream). The nav
 * history collapses to one row per block, so both writes of a deposit block resolve to
 * the SAME id and the later one updates the earlier. That requires the entity to be
 * `immutable: false`; on an immutable entity the second save is fatal at index time.
 *
 * `entryIndex` still exists on the row and is still dense — it is just no longer what
 * the id is built from. Read entryIndex for ordering, the id for lookup.
 *
 * Same string SHAPE as generateMarketRecordId and generateMarketBlockRecordId, and
 * deliberately its own function: shape is not meaning, and which cursor (or block) fills
 * the last component is exactly the thing a call site must not have to guess.
 */
export const generateMarketNavHistoricalId = (
  marketId: string,
  blockNumber: BigInt
): string => {
  return generateMarketNavId(marketId).concat("_").concat(blockNumber.toString());
};

/**
 * The shared id shape for every BLOCK-COLLAPSED market-keyed stream:
 *   <CHAIN_ID>_<MARKET_ID>_<BLOCK_NUMBER>
 * DayTrancheAccountingSyncedHistory, DayYieldSharesAccruedHistory and the three
 * liquidity-premium streams all key on it.
 *
 * The BLOCK-KEYED counterpart to generateMarketRecordId, and deliberately a separate
 * function from it: the two produce the same SHAPE from different things — an
 * entryIndex from a use-then-increment cursor there, a block number here — and which
 * one a call site is asking for must not be a guess. §8's "never key an id on a block
 * number" is inverted for these: the collision IS the dedupe, which is only safe
 * because every entity using this is `immutable: false`. See "BLOCK-KEYED HISTORY" in
 * schema.graphql.
 *
 * DayFixedTermHistory does NOT use this — a term spans blocks, so it keeps
 * generateMarketRecordId.
 *
 * Pass the bare KERNEL ADDRESS (market.marketId), never the composite DayMarketState.id.
 */
export const generateMarketBlockRecordId = (
  marketId: string,
  blockNumber: BigInt
): string => {
  return generateMarketId(marketId).concat("_").concat(blockNumber.toString());
};

// === TOKENS / VAULTS ===

/** <CHAIN_ID>_<TOKEN_ADDRESS> */
export const generateTokenId = (tokenAddress: string): string => {
  return CHAIN_ID.toString().concat("_").concat(tokenAddress);
};

/** DayVaultState.id = <CHAIN_ID>_<VAULT_ADDRESS> */
export const generateVaultId = (vaultAddress: string): string => {
  return CHAIN_ID.toString().concat("_").concat(vaultAddress);
};

/** DayVaultStateHistorical.id = <CHAIN_ID>_<VAULT_ADDRESS>_<BLOCK_NUMBER> (block-collapsed) */
export const generateVaultStateHistoricalId = (
  vaultAddress: string,
  blockNumber: BigInt
): string => {
  return generateVaultId(vaultAddress).concat("_").concat(blockNumber.toString());
};

// === POSITIONS ===

/** DayPositionState.id = <CHAIN_ID>_<VAULT_ADDRESS>_<ACCOUNT_ADDRESS> */
export const generatePositionStateId = (
  vaultAddress: string,
  accountAddress: string
): string => {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(vaultAddress)
    .concat("_")
    .concat(accountAddress);
};

/**
 * DayPositionStateHistorical.id
 *   = <CHAIN_ID>_<VAULT_ADDRESS>_<ACCOUNT_ADDRESS>_<BLOCK_NUMBER>
 *
 * The trailing entryIndex is what makes this immutable entity writable more than
 * once per account. The draft schema omitted it and would have died on the 2nd
 * snapshot for any position.
 */
export const generatePositionStateHistoricalId = (
  vaultAddress: string,
  accountAddress: string,
  blockNumber: BigInt
): string => {
  return generatePositionStateId(vaultAddress, accountAddress)
    .concat("_")
    .concat(blockNumber.toString());
};

// === FEES ===

/**
 * DayFeeState.id
 *   = <CHAIN_ID>_<MARKET_ID>_<ACCOUNT_ADDRESS>_<MAJOR_TYPE>_<MINOR_TYPE>
 *
 * MARKET-scoped, NOT vault-scoped: the leading discriminator is marketId (the bare
 * kernel address), so a market's three tranche-fee streams sort adjacently. That
 * makes `minorType` LOAD-BEARING here — (marketId, minorType) resolves the vault,
 * whereas a vaultAddress key made minorType redundant. majorType is still the
 * constant "day". Pass the bare kernel address (vault.marketId), NOT the composite
 * DayMarketState.id / marketRefId. The liquidity premium is NOT a fee (see
 * schema.graphql's "=== FEES ===" block).
 */
export const generateFeeStateId = (
  marketId: string,
  accountAddress: string,
  majorType: string,
  minorType: string
): string => {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(marketId)
    .concat("_")
    .concat(accountAddress)
    .concat("_")
    .concat(majorType)
    .concat("_")
    .concat(minorType);
};

/**
 * DayFeeStateHistorical.id
 *   = <CHAIN_ID>_<MARKET_ID>_<ACCOUNT_ADDRESS>_<MAJOR_TYPE>_<MINOR_TYPE>_<BLOCK_NUMBER>
 */
export const generateFeeStateHistoricalId = (
  marketId: string,
  accountAddress: string,
  majorType: string,
  minorType: string,
  blockNumber: BigInt
): string => {
  return generateFeeStateId(marketId, accountAddress, majorType, minorType)
    .concat("_")
    .concat(blockNumber.toString());
};

// === GLOBAL (shared Neon tables — see the banner in schema.graphql) ===

/**
 * GlobalTokenTransfer.id = <CHAIN_ID>_<TRANSACTION_HASH>_<LOG_INDEX>_<TOKEN_INDEX>
 *
 * The trailing tokenIndex exists because ONE log can move SEVERAL tokens: a
 * Redeem carries an AssetClaims quintuple and pays out up to three different
 * asset ERC20s in a single event. Without a discriminator the second leg is a
 * fatal "entity already exists" at index time on this immutable entity.
 *
 * Single-token logs (a share Transfer, a Deposit) pass TOKEN_INDEX_SINGLE.
 *
 * !! CROSS-PACKAGE NOTE — public.global_token_transfer is shared with royco-rwa,
 *    royco-usd and staked-royco-usd, so this column already holds more than one
 *    shape. royco-rwa's schema comment documents the 3-part <CHAIN>_<TX>_<LOG>
 *    form but its generateTransferId actually appends _<VAULT_ADDRESS> — its own
 *    comment is wrong about the ids it writes. Rows still cannot collide across
 *    packages (tx hashes are disjoint), but do NOT write a consumer that parses
 *    this column positionally. Do not "harmonise" by copying rwa's vaultAddress
 *    arg: it carries no category, so an stAssets leg and an stShares leg on one
 *    vault would collide — rwa escapes only because it never records stShares.
 */
export const generateGlobalTokenTransferId = (
  transactionHash: string,
  logIndex: BigInt,
  tokenIndex: BigInt
): string => {
  return generateId(transactionHash, logIndex)
    .concat("_")
    .concat(tokenIndex.toString());
};

/**
 * GlobalTokenActivity.id
 *   = <CHAIN_ID>_<TX_HASH>_<LOG_INDEX>_<VAULT_ADDRESS>_<CATEGORY>_<SUB_CATEGORY>_<TOKEN_INDEX>
 *
 * One log can produce several activities (a Redeem settles senior + junior +
 * liquidity claims), hence the trailing discriminators on top of the log id.
 */
export const generateGlobalTokenActivityId = (
  transactionHash: string,
  logIndex: BigInt,
  vaultAddress: string,
  category: string,
  subCategory: string,
  tokenIndex: BigInt
): string => {
  return generateId(transactionHash, logIndex)
    .concat("_")
    .concat(vaultAddress)
    .concat("_")
    .concat(category)
    .concat("_")
    .concat(subCategory)
    .concat("_")
    .concat(tokenIndex.toString());
};
