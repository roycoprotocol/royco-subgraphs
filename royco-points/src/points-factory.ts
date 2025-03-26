import { NewPointsProgram as NewPointsProgramEvent } from "../generated/PointsFactory/PointsFactory";
import { NewPointsProgram } from "../generated/schema";
import { CHAIN_ID } from "./constants";
import { PointsProgramTemplate } from "../generated/templates";
import { generateId } from "./utils";

export function handleNewPointsProgram(event: NewPointsProgramEvent): void {
  // Extract the address of the new child contract
  let pointsProgramAddress = event.params.points;

  // Dynamically create a new data source for the child contract
  PointsProgramTemplate.create(pointsProgramAddress);

  let entity = new NewPointsProgram(
    generateId(event.transaction.hash, event.logIndex)
  );

  entity.chainId = CHAIN_ID;
  entity.points = event.params.points.toHexString();
  entity.name = event.params.name;
  entity.symbol = event.params.symbol;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}
