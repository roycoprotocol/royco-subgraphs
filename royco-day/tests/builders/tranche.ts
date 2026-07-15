import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { newTypedMockEventWithParams } from "matchstick-as";
import { EventContext, applyCtx } from "../helpers/event";
import { Claims } from "./shared";

// =============================================================================
// Tranche event builders.
//
// Senior / Junior / Liquidity emit byte-identical Transfer, Deposit, Redeem and
// ProtocolFeeSharesMinted — but codegen emits a DISTINCT class per template. The
// AS generic <T> monomorphizes per call site, so one builder serves all three:
//
//   createRedeemEvent<SeniorRedeem>(...)
//   createRedeemEvent<JuniorRedeem>(...)
//
// changetype is needed on `event` because the compiler can't prove an unbounded
// T extends ethereum.Event.
// =============================================================================

/** Transfer(indexed address from, indexed address to, uint256 value) */
export function createTransferEvent<T>(
  from: Address,
  to: Address,
  value: BigInt,
  c: EventContext
): T {
  const params: ethereum.EventParam[] = [
    new ethereum.EventParam("from", ethereum.Value.fromAddress(from)),
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to)),
    new ethereum.EventParam(
      "value",
      ethereum.Value.fromUnsignedBigInt(value)
    ),
  ];
  const event = newTypedMockEventWithParams<T>(params);
  applyCtx(changetype<ethereum.Event>(event), c);
  return event;
}

/** Deposit(indexed address sender, indexed address receiver, uint256 assets, uint256 shares) */
export function createDepositEvent<T>(
  sender: Address,
  receiver: Address,
  assets: BigInt,
  shares: BigInt,
  c: EventContext
): T {
  const params: ethereum.EventParam[] = [
    new ethereum.EventParam("sender", ethereum.Value.fromAddress(sender)),
    new ethereum.EventParam("receiver", ethereum.Value.fromAddress(receiver)),
    new ethereum.EventParam(
      "assets",
      ethereum.Value.fromUnsignedBigInt(assets)
    ),
    new ethereum.EventParam(
      "shares",
      ethereum.Value.fromUnsignedBigInt(shares)
    ),
  ];
  const event = newTypedMockEventWithParams<T>(params);
  applyCtx(changetype<ethereum.Event>(event), c);
  return event;
}

/**
 * Redeem(indexed address sender, indexed address receiver, Claims claims, uint256 shares)
 *
 * NOTE claims sits at index 2, BEFORE shares. Contrast MultiAssetRedeem below,
 * where the claims tuple is at index 4.
 */
export function createRedeemEvent<T>(
  sender: Address,
  receiver: Address,
  claims: Claims,
  shares: BigInt,
  c: EventContext
): T {
  const params: ethereum.EventParam[] = [
    new ethereum.EventParam("sender", ethereum.Value.fromAddress(sender)),
    new ethereum.EventParam("receiver", ethereum.Value.fromAddress(receiver)),
    new ethereum.EventParam("claims", ethereum.Value.fromTuple(claims.toTuple())),
    new ethereum.EventParam(
      "shares",
      ethereum.Value.fromUnsignedBigInt(shares)
    ),
  ];
  const event = newTypedMockEventWithParams<T>(params);
  applyCtx(changetype<ethereum.Event>(event), c);
  return event;
}

/**
 * ProtocolFeeSharesMinted(indexed address protocolFeeRecipient,
 *                         uint256 mintedProtocolFeeShares,
 *                         uint256 totalTrancheShares)
 * Emitted by all three tranches.
 */
export function createProtocolFeeSharesMintedEvent<T>(
  protocolFeeRecipient: Address,
  mintedProtocolFeeShares: BigInt,
  totalTrancheShares: BigInt,
  c: EventContext
): T {
  const params: ethereum.EventParam[] = [
    new ethereum.EventParam(
      "protocolFeeRecipient",
      ethereum.Value.fromAddress(protocolFeeRecipient)
    ),
    new ethereum.EventParam(
      "mintedProtocolFeeShares",
      ethereum.Value.fromUnsignedBigInt(mintedProtocolFeeShares)
    ),
    new ethereum.EventParam(
      "totalTrancheShares",
      ethereum.Value.fromUnsignedBigInt(totalTrancheShares)
    ),
  ];
  const event = newTypedMockEventWithParams<T>(params);
  applyCtx(changetype<ethereum.Event>(event), c);
  return event;
}

/**
 * LiquidityPremiumSharesMinted(indexed address holder,
 *                              uint256 mintedLiquidityPremiumShares,
 *                              uint256 totalTrancheShares)
 *
 * SENIOR ONLY. This is the second fee source that makes majorType part of
 * DayFeeState's id — `holder` here may be the same address as
 * `protocolFeeRecipient` above.
 */
export function createLiquidityPremiumSharesMintedEvent<T>(
  holder: Address,
  mintedLiquidityPremiumShares: BigInt,
  totalTrancheShares: BigInt,
  c: EventContext
): T {
  const params: ethereum.EventParam[] = [
    new ethereum.EventParam("holder", ethereum.Value.fromAddress(holder)),
    new ethereum.EventParam(
      "mintedLiquidityPremiumShares",
      ethereum.Value.fromUnsignedBigInt(mintedLiquidityPremiumShares)
    ),
    new ethereum.EventParam(
      "totalTrancheShares",
      ethereum.Value.fromUnsignedBigInt(totalTrancheShares)
    ),
  ];
  const event = newTypedMockEventWithParams<T>(params);
  applyCtx(changetype<ethereum.Event>(event), c);
  return event;
}

/**
 * MultiAssetRedeem(indexed address caller, indexed address receiver,
 *                  indexed address owner, uint256 shares,
 *                  Claims stClaims, uint256 quoteAssets)
 *
 * LIQUIDITY ONLY. Claims is at index 4 — after `shares`, unlike Redeem.
 */
export function createMultiAssetRedeemEvent<T>(
  caller: Address,
  receiver: Address,
  owner: Address,
  shares: BigInt,
  stClaims: Claims,
  quoteAssets: BigInt,
  c: EventContext
): T {
  const params: ethereum.EventParam[] = [
    new ethereum.EventParam("caller", ethereum.Value.fromAddress(caller)),
    new ethereum.EventParam("receiver", ethereum.Value.fromAddress(receiver)),
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner)),
    new ethereum.EventParam(
      "shares",
      ethereum.Value.fromUnsignedBigInt(shares)
    ),
    new ethereum.EventParam(
      "stClaims",
      ethereum.Value.fromTuple(stClaims.toTuple())
    ),
    new ethereum.EventParam(
      "quoteAssets",
      ethereum.Value.fromUnsignedBigInt(quoteAssets)
    ),
  ];
  const event = newTypedMockEventWithParams<T>(params);
  applyCtx(changetype<ethereum.Event>(event), c);
  return event;
}

/**
 * MultiAssetDeposit(indexed address caller, indexed address receiver,
 *                   uint256 stAssets, uint256 quoteAssets,
 *                   uint256 ltAssetsMinted, uint256 shares)
 * LIQUIDITY ONLY. Flat — no tuple.
 */
export function createMultiAssetDepositEvent<T>(
  caller: Address,
  receiver: Address,
  stAssets: BigInt,
  quoteAssets: BigInt,
  ltAssetsMinted: BigInt,
  shares: BigInt,
  c: EventContext
): T {
  const params: ethereum.EventParam[] = [
    new ethereum.EventParam("caller", ethereum.Value.fromAddress(caller)),
    new ethereum.EventParam("receiver", ethereum.Value.fromAddress(receiver)),
    new ethereum.EventParam(
      "stAssets",
      ethereum.Value.fromUnsignedBigInt(stAssets)
    ),
    new ethereum.EventParam(
      "quoteAssets",
      ethereum.Value.fromUnsignedBigInt(quoteAssets)
    ),
    new ethereum.EventParam(
      "ltAssetsMinted",
      ethereum.Value.fromUnsignedBigInt(ltAssetsMinted)
    ),
    new ethereum.EventParam(
      "shares",
      ethereum.Value.fromUnsignedBigInt(shares)
    ),
  ];
  const event = newTypedMockEventWithParams<T>(params);
  applyCtx(changetype<ethereum.Event>(event), c);
  return event;
}
