import { BigInt } from "@graphprotocol/graph-ts";
import { CHAIN_ID } from "../constants";

// Entity ID generators — one place per format. Addresses are lowercase-hex from
// .toHexString() (a checksummed address silently forks a second row).

// <CHAIN_ID>_<ENTRY_POINT_ADDRESS>_<TRANCHE_ADDRESS>. Keyed on the entry point
// address, not a version: the nonce counter is per-deployment.
export function generateEntryPointStateId(entryPointAddress: string, trancheAddress: string): string {
  return CHAIN_ID.toString().concat("_").concat(entryPointAddress).concat("_").concat(trancheAddress);
}

// <CHAIN_ID>_<ENTRY_POINT_ADDRESS>_<NONCE>
export function generateEntryPointRequestId(entryPointAddress: string, nonce: BigInt): string {
  return CHAIN_ID.toString().concat("_").concat(entryPointAddress).concat("_").concat(nonce.toString());
}

// DayEntryPointExecution.id = <CHAIN_ID>_<TX_HASH>_<LOG_INDEX> — one per *Executed log.
export function generateExecutionId(transactionHash: string, logIndex: BigInt): string {
  return CHAIN_ID.toString().concat("_").concat(transactionHash).concat("_").concat(logIndex.toString());
}

// <CHAIN_ID>_<VAULT_ADDRESS> (the tranche is its own share token).
export function generateVaultId(vaultAddress: string): string {
  return CHAIN_ID.toString().concat("_").concat(vaultAddress);
}

// <CHAIN_ID>_<TOKEN_ADDRESS> — the share token (== the vault).
export function generateTokenId(tokenAddress: string): string {
  return CHAIN_ID.toString().concat("_").concat(tokenAddress);
}

// <CHAIN_ID>_<TOKEN_ADDRESS>_<VAULT_ADDRESS> — the deposit (asset) token, scoped
// by vault since one asset can back several vaults.
export function generateTokenVaultId(tokenAddress: string, vaultAddress: string): string {
  return CHAIN_ID.toString().concat("_").concat(tokenAddress).concat("_").concat(vaultAddress);
}
