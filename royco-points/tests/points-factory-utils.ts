import { newMockEvent } from "matchstick-as"
import { ethereum, Address } from "@graphprotocol/graph-ts"
import {
  NewPointsProgram,
  OwnershipTransferStarted,
  OwnershipTransferred,
  RecipeMarketHubAdded
} from "../generated/PointsFactory/PointsFactory"

export function createNewPointsProgramEvent(
  points: Address,
  name: string,
  symbol: string
): NewPointsProgram {
  let newPointsProgramEvent = changetype<NewPointsProgram>(newMockEvent())

  newPointsProgramEvent.parameters = new Array()

  newPointsProgramEvent.parameters.push(
    new ethereum.EventParam("points", ethereum.Value.fromAddress(points))
  )
  newPointsProgramEvent.parameters.push(
    new ethereum.EventParam("name", ethereum.Value.fromString(name))
  )
  newPointsProgramEvent.parameters.push(
    new ethereum.EventParam("symbol", ethereum.Value.fromString(symbol))
  )

  return newPointsProgramEvent
}

export function createOwnershipTransferStartedEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferStarted {
  let ownershipTransferStartedEvent = changetype<OwnershipTransferStarted>(
    newMockEvent()
  )

  ownershipTransferStartedEvent.parameters = new Array()

  ownershipTransferStartedEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferStartedEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferStartedEvent
}

export function createOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent = changetype<OwnershipTransferred>(
    newMockEvent()
  )

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}

export function createRecipeMarketHubAddedEvent(
  recipeMarketHub: Address
): RecipeMarketHubAdded {
  let recipeMarketHubAddedEvent = changetype<RecipeMarketHubAdded>(
    newMockEvent()
  )

  recipeMarketHubAddedEvent.parameters = new Array()

  recipeMarketHubAddedEvent.parameters.push(
    new ethereum.EventParam(
      "recipeMarketHub",
      ethereum.Value.fromAddress(recipeMarketHub)
    )
  )

  return recipeMarketHubAddedEvent
}
