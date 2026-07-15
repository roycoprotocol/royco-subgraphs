import { Address, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { newTypedMockEventWithParams } from "matchstick-as";
import { MarketDeploymentCompleted } from "../../generated/RoycoFactory/RoycoFactory";
import { tuple, addr, bytes } from "../helpers/tuple";
import { EventContext, applyCtx } from "../helpers/event";
import {
  ADDR_ACCOUNTANT,
  ADDR_JT_YDM,
  ADDR_JUNIOR,
  ADDR_KERNEL,
  ADDR_LIQUIDITY,
  ADDR_LT_YDM,
  ADDR_SENIOR,
} from "../helpers/constants";

/**
 * The `result` tuple of MarketDeploymentCompleted.
 *
 *   (seniorTranche, juniorTranche, liquidityTranche, kernel, accountant, ydm, ltYdm, extras)
 *
 * NOTE the two YDM fields: `ydm` is the JUNIOR tranche's YDM, `ltYdm` is the
 * liquidity tranche's. The ABI does not name the first one `jtYdm`, which makes
 * this an easy transposition — hence distinct sentinels and a round-trip test.
 */
export class DeploymentResult {
  seniorTranche: Address = ADDR_SENIOR;
  juniorTranche: Address = ADDR_JUNIOR;
  liquidityTranche: Address = ADDR_LIQUIDITY;
  kernel: Address = ADDR_KERNEL;
  accountant: Address = ADDR_ACCOUNTANT;
  ydm: Address = ADDR_JT_YDM;
  ltYdm: Address = ADDR_LT_YDM;
  extras: Bytes = Bytes.fromHexString("0xdeadbeef") as Bytes;

  /** MUST match ABI component order exactly. */
  toTuple(): ethereum.Tuple {
    return tuple([
      addr(this.seniorTranche), // 0
      addr(this.juniorTranche), // 1
      addr(this.liquidityTranche), // 2
      addr(this.kernel), // 3
      addr(this.accountant), // 4
      addr(this.ydm), // 5  <- JUNIOR ydm
      addr(this.ltYdm), // 6  <- LIQUIDITY ydm
      bytes(this.extras), // 7
    ]);
  }
}

/**
 * MarketDeploymentCompleted(indexed address,indexed address,(address x7,bytes))
 *
 * `template` and `deployer` are indexed but still occupy parameters[0]/[1] —
 * push params in ABI order regardless of indexed-ness.
 */
export function createMarketDeploymentCompletedEvent(
  template: Address,
  deployer: Address,
  result: DeploymentResult,
  c: EventContext
): MarketDeploymentCompleted {
  const params: ethereum.EventParam[] = [
    new ethereum.EventParam("template", ethereum.Value.fromAddress(template)),
    new ethereum.EventParam("deployer", ethereum.Value.fromAddress(deployer)),
    new ethereum.EventParam(
      "result",
      ethereum.Value.fromTuple(result.toTuple())
    ),
  ];
  const event = newTypedMockEventWithParams<MarketDeploymentCompleted>(params);
  applyCtx(event, c);
  return event;
}
