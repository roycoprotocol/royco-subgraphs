import { BigInt } from "@graphprotocol/graph-ts";
import {
  MarketCreated as MarketCreatedEvent,
  RecipeMarketHub,
} from "../generated/RecipeMarketHub/RecipeMarketHub";
import { RawMarketRecipe } from "../generated/schema";
import { CHAIN_ID, MARKET_TYPE } from "./constants";
import { generateRawMarketId, generateTokenId } from "./utils";

export function createRawMarket(event: MarketCreatedEvent): void {
  let rawMarketRefId = generateRawMarketId(
    event.params.marketHash.toHexString()
  );

  let entity = new RawMarketRecipe(rawMarketRefId);

  entity.chainId = CHAIN_ID;
  entity.marketType = MARKET_TYPE;
  entity.marketId = event.params.marketHash.toHexString();
  entity.inputTokenId = generateTokenId(event.params.inputToken);
  entity.inputTokenAmount = BigInt.zero();
  entity.lockupTime = event.params.lockupTime;
  entity.frontendFee = event.params.frontendFee;
  entity.rewardStyle = event.params.rewardStyle;
  entity.depositWeirollCommands = [];
  entity.depositWeirollState = [];
  entity.withdrawWeirollCommands = [];
  entity.withdrawWeirollState = [];

  let contract = RecipeMarketHub.bind(event.address);
  let weirollMarket = contract.try_marketHashToWeirollMarket(
    event.params.marketHash
  );

  if (!weirollMarket.reverted) {
    entity.depositWeirollCommands = weirollMarket.value
      .getDepositRecipe()
      .weirollCommands.map<string>((command) => command.toHexString());

    entity.depositWeirollState = weirollMarket.value
      .getDepositRecipe()
      .weirollState.map<string>((state) => state.toHexString());

    entity.withdrawWeirollCommands = weirollMarket.value
      .getWithdrawRecipe()
      .weirollCommands.map<string>((command) => command.toHexString());

    entity.withdrawWeirollState = weirollMarket.value
      .getWithdrawRecipe()
      .weirollState.map<string>((state) => state.toHexString());
  }

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash.toHexString();
  entity.logIndex = event.logIndex;

  entity.save();
}
