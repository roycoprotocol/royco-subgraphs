// Static string constants shared across handlers. These land in Postgres columns
// (part of the public contract — add freely, changing is a migration). CHAIN_ID
// and getEntryPointVersion live in the generated ./static.ts.
import { BigInt } from "@graphprotocol/graph-ts";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// DayEntryPointRequest.category / .subCategory
export const CATEGORY_ASSETS = "assets"; // deposits escrow asset tokens
export const CATEGORY_SHARES = "shares"; // redemptions escrow tranche shares
export const SUB_CATEGORY_DEPOSIT = "deposit";
export const SUB_CATEGORY_WITHDRAW = "withdraw";

// DayEntryPointRequest.status
export const STATUS_PENDING = "pending";
export const STATUS_PARTIALLY_FILLED = "partiallyFilled";
export const STATUS_CANCELLED = "cancelled";
export const STATUS_COMPLETED = "completed";

// executorBonusWAD sentinel = third-party execution disabled (owner-only), NOT a
// bonus. type(uint64).max; real bonuses are < WAD.
export const SELF_EXECUTION_ONLY_SENTINEL: BigInt = BigInt.fromU64(u64.MAX_VALUE);
