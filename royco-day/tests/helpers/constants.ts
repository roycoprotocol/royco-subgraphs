import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";

// =============================================================================
// Test sentinels.
//
// RULE: every address here is DISTINCT and self-describing. Reusing one address
// across roles makes tests pass unconditionally and hides exactly the bugs this
// harness exists to catch — a senior/junior transposition looks identical to
// correct code if both are 0x...01.
// =============================================================================

export const ADDR_FACTORY = Address.fromString(
  "0x00000000000000000000000000000000000000f1"
);
export const ADDR_TEMPLATE = Address.fromString(
  "0x00000000000000000000000000000000000000f2"
);
export const ADDR_DEPLOYER = Address.fromString(
  "0x00000000000000000000000000000000000000f3"
);

export const ADDR_KERNEL = Address.fromString(
  "0x000000000000000000000000000000000000000c"
);
export const ADDR_ACCOUNTANT = Address.fromString(
  "0x000000000000000000000000000000000000000a"
);
export const ADDR_SENIOR = Address.fromString(
  "0x0000000000000000000000000000000000000051"
);
export const ADDR_JUNIOR = Address.fromString(
  "0x000000000000000000000000000000000000004a"
);
export const ADDR_LIQUIDITY = Address.fromString(
  "0x000000000000000000000000000000000000001c"
);

export const ADDR_JT_YDM = Address.fromString(
  "0x00000000000000000000000000000000000000d1"
);
export const ADDR_LT_YDM = Address.fromString(
  "0x00000000000000000000000000000000000000d2"
);

export const ADDR_ASSET = Address.fromString(
  "0x00000000000000000000000000000000000000a5"
);
export const ADDR_QUOTE_ASSET = Address.fromString(
  "0x00000000000000000000000000000000000000a6"
);
export const ADDR_BLACKLIST = Address.fromString(
  "0x00000000000000000000000000000000000000b1"
);
export const ADDR_FEE_RECIPIENT = Address.fromString(
  "0x00000000000000000000000000000000000000fe"
);

export const ADDR_ALICE = Address.fromString(
  "0x00000000000000000000000000000000000000e1"
);
export const ADDR_BOB = Address.fromString(
  "0x00000000000000000000000000000000000000e2"
);

export const ADDR_ZERO = Address.fromString(
  "0x0000000000000000000000000000000000000000"
);

/**
 * A REAL 32-byte transaction hash.
 *
 * matchstick's own default is 20 bytes: defaults.ts builds the mock transaction
 * with `defaultAddressBytes` (an Address reinterpreted as Bytes) as the hash, so
 * out of the box `event.transaction.hash.toHexString()` returns
 * "0xa16081f360e3847006db660bae1c6d1b2e17ec2a" — a physically impossible hash.
 *
 * Every createdAtTransactionHash and every historical entity id in this schema
 * derives from that value. Always apply an EventContext (see ./event.ts) so
 * tests assert against something a real chain could produce.
 */
export const TX_HASH = Bytes.fromHexString(
  "0x1111111111111111111111111111111111111111111111111111111111111111"
) as Bytes;

export const TX_HASH_2 = Bytes.fromHexString(
  "0x2222222222222222222222222222222222222222222222222222222222222222"
) as Bytes;

export const BLOCK_NUMBER = BigInt.fromI32(1_000_000);
export const BLOCK_TIMESTAMP = BigInt.fromI32(1_700_000_000);
export const LOG_INDEX = BigInt.fromI32(1);

// 1e18, the WAD scale used by every *WAD field.
export const WAD = BigInt.fromString("1000000000000000000");

export const DECIMALS_18: i32 = 18;
export const DECIMALS_6: i32 = 6;
