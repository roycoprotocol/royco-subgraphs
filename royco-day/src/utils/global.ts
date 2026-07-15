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

// === TOKENS / VAULTS ===

/** <CHAIN_ID>_<TOKEN_ADDRESS> */
export const generateTokenId = (tokenAddress: string): string => {
  return CHAIN_ID.toString().concat("_").concat(tokenAddress);
};

/** DayVaultState.id = <CHAIN_ID>_<VAULT_ADDRESS> */
export const generateVaultId = (vaultAddress: string): string => {
  return CHAIN_ID.toString().concat("_").concat(vaultAddress);
};

/** DayVaultStateHistorical.id = <CHAIN_ID>_<VAULT_ADDRESS>_<ENTRY_INDEX> */
export const generateVaultStateHistoricalId = (
  vaultAddress: string,
  entryIndex: BigInt
): string => {
  return generateVaultId(vaultAddress).concat("_").concat(entryIndex.toString());
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
 *   = <CHAIN_ID>_<VAULT_ADDRESS>_<ACCOUNT_ADDRESS>_<ENTRY_INDEX>
 *
 * The trailing entryIndex is what makes this immutable entity writable more than
 * once per account. The draft schema omitted it and would have died on the 2nd
 * snapshot for any position.
 */
export const generatePositionStateHistoricalId = (
  vaultAddress: string,
  accountAddress: string,
  entryIndex: BigInt
): string => {
  return generatePositionStateId(vaultAddress, accountAddress)
    .concat("_")
    .concat(entryIndex.toString());
};

// === FEES ===

/**
 * DayFeeState.id
 *   = <CHAIN_ID>_<VAULT_ADDRESS>_<ACCOUNT_ADDRESS>_<MAJOR_TYPE>_<MINOR_TYPE>
 *
 * majorType/minorType are in the id because one (vault, account) pair can accrue
 * fees from more than one source — Senior emits both ProtocolFeeSharesMinted and
 * LiquidityPremiumSharesMinted, and the recipient may be the same address.
 */
export const generateFeeStateId = (
  vaultAddress: string,
  accountAddress: string,
  majorType: string,
  minorType: string
): string => {
  return CHAIN_ID.toString()
    .concat("_")
    .concat(vaultAddress)
    .concat("_")
    .concat(accountAddress)
    .concat("_")
    .concat(majorType)
    .concat("_")
    .concat(minorType);
};

/**
 * DayFeeStateHistorical.id
 *   = <CHAIN_ID>_<VAULT_ADDRESS>_<ACCOUNT_ADDRESS>_<MAJOR_TYPE>_<MINOR_TYPE>_<ENTRY_INDEX>
 */
export const generateFeeStateHistoricalId = (
  vaultAddress: string,
  accountAddress: string,
  majorType: string,
  minorType: string,
  entryIndex: BigInt
): string => {
  return generateFeeStateId(vaultAddress, accountAddress, majorType, minorType)
    .concat("_")
    .concat(entryIndex.toString());
};

// === GLOBAL (shared Neon tables — see the banner in schema.graphql) ===

/** GlobalTokenTransfer.id = <CHAIN_ID>_<TRANSACTION_HASH>_<LOG_INDEX> */
export const generateGlobalTokenTransferId = (
  transactionHash: string,
  logIndex: BigInt
): string => {
  return generateId(transactionHash, logIndex);
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
