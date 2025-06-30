/**
 * ID Generator utility functions for consistent entity ID generation
 * across the Royco V3000 subgraph
 */

export class IdGenerator {
  /**
   * Generate ID for RoycoAccountDeployed entity
   * Format: <TRANSACTION_HASH>_<LOG_INDEX>
   */
  static roycoAccountDeployed(
    transactionHash: string,
    logIndex: bigint
  ): string {
    return `${transactionHash}_${logIndex}`;
  }

  /**
   * Generate ID for RawSafe entity
   * Format: <CHAIN_ID>_<SAFE_ADDRESS>
   */
  static rawSafe(chainId: bigint, safeAddress: string): string {
    return `${chainId}_${safeAddress.toLowerCase()}`;
  }

  /**
   * Generate ID for RawSafeMap entity
   * Format: <CHAIN_ID>_<SAFE_ADDRESS>_<ACCOUNT_ADDRESS>
   */
  static rawSafeMap(
    chainId: bigint,
    safeAddress: string,
    accountAddress: string
  ): string {
    return `${chainId}_${safeAddress.toLowerCase()}_${accountAddress.toLowerCase()}`;
  }

  /**
   * Generate ID for RawSafeTokenizedPosition entity
   * Format: <CHAIN_ID>_<SAFE_ADDRESS>_<TOKEN_ADDRESS>
   */
  static rawSafeTokenizedPosition(
    chainId: bigint,
    safeAddress: string,
    tokenAddress: string
  ): string {
    return `${chainId}_${safeAddress.toLowerCase()}_${tokenAddress.toLowerCase()}`;
  }

  /**
   * Generate ID for TrackedErc20Token entity
   * Format: <CHAIN_ID>_<TOKEN_ADDRESS>
   */
  static trackedErc20Token(chainId: bigint, tokenAddress: string): string {
    return `${chainId}_${tokenAddress.toLowerCase()}`;
  }

  /**
   * Generate token ID reference
   * Format: <CHAIN_ID>-<TOKEN_ADDRESS> (note: hyphen, not underscore)
   */
  static tokenId(chainId: bigint, tokenAddress: string): string {
    return `${chainId}-${tokenAddress.toLowerCase()}`;
  }

  /**
   * Generate ID for RawNode entity
   * Format: <CHAIN_ID>_<NODE_HASH>
   */
  static rawNode(chainId: bigint, nodeHash: string): string {
    return `${chainId}_${nodeHash}`;
  }

  /**
   * Generate ID for RawMarketAtlas entity
   * Format: <CHAIN_ID>_<MARKET_TYPE>_<MARKET_HASH>
   */
  static rawMarketAtlas(chainId: bigint, marketHash: string): string {
    return `${chainId}_3_${marketHash}`;
  }

  /**
   * Generate ID for RawOrderAtlas entity
   * Format: <CHAIN_ID>_<ORDER_HASH>
   */
  static rawOrderAtlas(chainId: bigint, orderHash: string): string {
    return `${chainId}_${orderHash}`;
  }

  /**
   * Generate ID for SafeSetup entity
   * Format: <TRANSACTION_HASH>_<LOG_INDEX>
   */
  static safeSetup(transactionHash: string, logIndex: bigint): string {
    return `${transactionHash}_${logIndex}`;
  }

  /**
   * Generate ID for ExecutionSuccess entity
   * Format: <TRANSACTION_HASH>_<LOG_INDEX>
   */
  static executionSuccess(transactionHash: string, logIndex: bigint): string {
    return `${transactionHash}_${logIndex}`;
  }

  /**
   * Generate ID for ExecutionFailure entity
   * Format: <TRANSACTION_HASH>_<LOG_INDEX>
   */
  static executionFailure(transactionHash: string, logIndex: bigint): string {
    return `${transactionHash}_${logIndex}`;
  }

  /**
   * Generate ID for SafeReceived entity
   * Format: <TRANSACTION_HASH>_<LOG_INDEX>
   */
  static safeReceived(transactionHash: string, logIndex: bigint): string {
    return `${transactionHash}_${logIndex}`;
  }

  /**
   * Generate ID for RawSafeTransaction entity
   * Format: <TRANSACTION_HASH>_<LOG_INDEX>
   */
  static rawSafeTransaction(transactionHash: string, logIndex: bigint): string {
    return `${transactionHash}_${logIndex}`;
  }
}

/**
 * Constants for the ID generator
 */
export const ID_CONSTANTS = {
  ATLAS_MARKET_TYPE: 3,
  NULL_ADDRESS: "0x0000000000000000000000000000000000000000",
} as const;
