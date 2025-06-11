// prettier-ignore
import { BigInt } from "@graphprotocol/graph-ts";


export const CHAIN_ID = BigInt.fromU64(1); // Will be replaced during deployment

export const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

export const BIG_INT_ZERO = BigInt.zero();

export enum OFFER_TYPE {
    AP_OFFER,
    IP_OFFER
}

export const INCENTRA_AV_ADDRESS = "0xb56c0a94246736897225294d587f65b005fd6135";


// Multipliers are denominated in BPS, so 100 = 1x multiplier
export const DEFAULT_MULTIPLIER = BigInt.fromI32(100);

export enum UMA_MERKLE_ORACLE_STATES {
    ASSERTED,
    RESOLVED,
    DISPUTED
}
