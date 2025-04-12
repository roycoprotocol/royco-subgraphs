// prettier-ignore
import { BigInt } from "@graphprotocol/graph-ts";

export const ACTION_VERIFIER_TYPES = {
    "UMA_MERKLE_CHEF": 0
};

export const CHAIN_ID = BigInt.fromU64(1); // Will be replaced during deployment

export const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

export const BIG_INT_ZERO = new BigInt(0);

// Multipliers are denominated in BPS, so 100 = 1x multiplier
export const DEFAULT_MULTIPLIER = new BigInt(100);

export enum UMA_MERKLE_ORACLE_STATES {
    ASSERTED,
    RESOLVED,
    DISPUTED
}

// Define a type for the mapping: chain id -> (action verifier address -> campaign tag)
export const INCENTIVE_CAMPAIGN_TAGS: any = {
    "11155111": { "0x0e6db09B98369aFfb3049580936B1c86127EBB52": "UMA_MERKLE_CHEF" }
};