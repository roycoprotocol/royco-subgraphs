// prettier-ignore
import { BigInt } from "@graphprotocol/graph-ts";

export const CHAIN_ID = BigInt.fromU64({{chainId}}); // Will be replaced during deployment

export const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

// Queue Address -> Vault Address
export function getVaultAddress(queueAddress: string): string {
  {{#sources}}
  if (queueAddress == "{{vaultQueueAddress}}") {
    return "{{vaultAddress}}";
  }
  {{/sources}}
  return NULL_ADDRESS;
}
