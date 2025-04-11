// prettier-ignore
import { BigInt } from "@graphprotocol/graph-ts";

export const ACTION_VERIFIER_TYPES = {
    "UMA_MERKLE_CHEF": 0
};

export const CHAIN_ID = BigInt.fromU64(1); // Will be replaced during deployment

export const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

export const BIG_INT_ZERO = new BigInt(0);

export enum UMA_MERKLE_ORACLE_STATES {
    ASSERTED,
    RESOLVED,
    DISPUTED
}
