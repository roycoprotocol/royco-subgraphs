// prettier-ignore
import { BigInt } from "@graphprotocol/graph-ts";

export const CHAIN_ID = BigInt.fromU64(146); // Will be replaced during deployment

export const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

// Queue Address -> Vault Address
export function getVaultAddress(queueAddress: string): string {
  if (queueAddress == "0xd0885a285f9a00aa2d9734d2d26be1186f850e38") {
    return "0x45088fb2ffebfdcf4dff7b7201bfa4cd2077c30e";
  }
  if (queueAddress == "0x9ec26125fecde8ce5c67346db2e20c9026225440") {
    return "0x74d1fafa4e0163b2f1035f1b052137f3f9bad5cc";
  }
  return NULL_ADDRESS;
}
