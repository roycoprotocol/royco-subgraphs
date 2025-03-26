import { OwnershipTransferred as OwnershipTransferredEvent } from "../generated/templates/PointsProgramTemplate/Points";
import { RawPoint } from "../generated/schema";
import { CHAIN_ID } from "./constants";
import { Points as PointsProgram } from "../generated/templates/PointsProgramTemplate/Points";
import { BigInt } from "@graphprotocol/graph-ts";
import { generateTokenId } from "./utils";

export function createPointProgram(event: OwnershipTransferredEvent): void {
  /**
   * Get details of the new Points program
   */
  let contract = PointsProgram.bind(event.address);

  let nameResult = contract.try_name();
  let symbolResult = contract.try_symbol();
  let decimalsResult = contract.try_decimals();

  let rawPointRefId = generateTokenId(event.address);

  let rawPoint = RawPoint.load(rawPointRefId);

  if (
    !nameResult.reverted &&
    !symbolResult.reverted &&
    !decimalsResult.reverted
  ) {
    if (rawPoint == null) {
      rawPoint = new RawPoint(
        CHAIN_ID.toString().concat("-").concat(event.address.toHexString())
      );
    }

    rawPoint.chainId = CHAIN_ID;
    rawPoint.contractAddress = event.address.toHexString();
    rawPoint.owner = event.params.newOwner.toHexString();
    rawPoint.issuers = [];
    rawPoint.name = nameResult.value;
    rawPoint.symbol = symbolResult.value;
    rawPoint.decimals = decimalsResult.value;
    rawPoint.totalSupply = BigInt.zero();

    rawPoint.blockNumber = event.block.number;
    rawPoint.blockTimestamp = event.block.timestamp;
    rawPoint.transactionHash = event.transaction.hash.toHexString();
    rawPoint.logIndex = event.logIndex;

    rawPoint.save();
  }
}
