import { Transfer as TransferEvent } from "../generated/templates/WrappedVault/WrappedVault";
import { RawMarketVault } from "../generated/schema";
import { NULL_ADDRESS } from "./constants";
import {
  createOrUpdateRawMarketTokenBalanceInputToken,
  createOrUpdateRawMarketTokenBalanceShares,
  createOrUpdateRawPositionTokenBalanceVault,
  createOrUpdateRawPositionVault,
  updateRawVolume,
  updateToken0Balance,
} from "./token-balance-handler";
import { generateRawMarketId, generateTokenId } from "./utils";
import { WrappedVault } from "../generated/templates/WrappedVault/WrappedVault";
import { BigInt, Bytes } from "@graphprotocol/graph-ts";

export function handleRawPosition(event: TransferEvent): void {
  let fromAddress = event.params.from.toHexString();
  let toAddress = event.params.to.toHexString();

  let inputTokenAmount = BigInt.zero();
  let shares = BigInt.zero();

  let rawMarket = RawMarketVault.load(
    generateRawMarketId(event.address.toHexString())
  );

  if (rawMarket) {
    // Create contract binding
    let contract = WrappedVault.bind(event.address);

    // Call totalAssets()
    let totalAssetsResult = contract.try_totalAssets();
    if (!totalAssetsResult.reverted) {
      inputTokenAmount = totalAssetsResult.value;
    }

    let totalSharesResult = contract.try_totalSupply();
    if (!totalSharesResult.reverted) {
      shares = totalSharesResult.value;
    }

    // Update the input token balance in the raw market
    createOrUpdateRawMarketTokenBalanceInputToken(
      event.address.toHexString(), // Market ID
      rawMarket.inputTokenId, // Input Token ID
      inputTokenAmount // Input Token Amount
    );

    // Update the input token balance in the raw market
    createOrUpdateRawMarketTokenBalanceShares(
      event.address.toHexString(), // Market ID
      generateTokenId(Bytes.fromHexString(rawMarket.marketId)), // Wrapped Vault Token ID
      shares // Input Token Amount
    );

    if (fromAddress == NULL_ADDRESS) {
      // Update the token0 balance
      updateToken0Balance(
        event.address, // Market ID
        toAddress, // Account Address
        event.block.number, // Block Number
        event.block.timestamp, // Block Timestamp
        event.transaction.hash, // Transaction Hash
        event.logIndex // Log Index
      );

      // This is a deposit into the wrapped vault
      createOrUpdateRawPositionVault(
        generateRawMarketId(event.address.toHexString()), // Market ID
        toAddress, // Account Address
        2, // Shares
        generateTokenId(Bytes.fromHexString(rawMarket.marketId)), // Wrapped Vault Token ID
        event.params.amount, // Shares
        0, // Add
        event.block.number, // Block Number
        event.block.timestamp, // Block Timestamp
        event.transaction.hash, // Transaction Hash
        event.logIndex // Log Index
      );

      createOrUpdateRawPositionTokenBalanceVault(
        generateRawMarketId(event.address.toHexString()), // Market ID
        toAddress, // Account Address
        2, // Shares
        generateTokenId(Bytes.fromHexString(rawMarket.marketId)), // Wrapped Vault Token ID
        event.params.amount, // Shares
        0 // Add
      );

      // Update volume for input token
      updateRawVolume(
        event.address.toHexString(), // Market ID
        rawMarket.inputTokenId, // Input Token ID
        inputTokenAmount, // Input Token Amount
        event.block.number, // Block Number
        event.block.timestamp, // Block Timestamp
        event.transaction.hash, // Transaction Hash
        event.logIndex, // Log Index
        0 // Add
      );
    } else if (toAddress == NULL_ADDRESS) {
      // Update the token0 balance
      updateToken0Balance(
        event.address, // Market ID
        fromAddress, // Account Address
        event.block.number, // Block Number
        event.block.timestamp, // Block Timestamp
        event.transaction.hash, // Transaction Hash
        event.logIndex // Log Index
      );

      // This is a withdraw from the wrapped vault
      createOrUpdateRawPositionVault(
        generateRawMarketId(event.address.toHexString()), // Market ID
        fromAddress, // Account Address
        2, // Shares
        generateTokenId(Bytes.fromHexString(rawMarket.marketId)), // Wrapped Vault Token ID
        event.params.amount, // Shares
        1, // Subtract
        event.block.number, // Block Number
        event.block.timestamp, // Block Timestamp
        event.transaction.hash, // Transaction Hash
        event.logIndex // Log Index
      );

      createOrUpdateRawPositionTokenBalanceVault(
        generateRawMarketId(event.address.toHexString()), // Market ID
        fromAddress, // Account Address
        2, // Shares
        generateTokenId(Bytes.fromHexString(rawMarket.marketId)), // Wrapped Vault Token ID
        event.params.amount, // Shares
        1 // Subtract
      );

      // Update volume for input token
      updateRawVolume(
        event.address.toHexString(), // Market ID
        rawMarket.inputTokenId, // Input Token ID
        inputTokenAmount, // Input Token Amount
        event.block.number, // Block Number
        event.block.timestamp, // Block Timestamp
        event.transaction.hash, // Transaction Hash
        event.logIndex, // Log Index
        0 // Add
      );
    } else {
      // This is a user to user transfer

      if (fromAddress != toAddress) {
        // Update the token0 balance
        updateToken0Balance(
          event.address, // Market ID
          fromAddress, // Account Address
          event.block.number, // Block Number
          event.block.timestamp, // Block Timestamp
          event.transaction.hash, // Transaction Hash
          event.logIndex // Log Index
        );
        updateToken0Balance(
          event.address, // Market ID
          toAddress, // Account Address
          event.block.number, // Block Number
          event.block.timestamp, // Block Timestamp
          event.transaction.hash, // Transaction Hash
          event.logIndex // Log Index
        );

        createOrUpdateRawPositionVault(
          generateRawMarketId(event.address.toHexString()), // Market ID
          fromAddress, // Account Address
          2, // Shares
          generateTokenId(Bytes.fromHexString(rawMarket.marketId)), // Wrapped Vault Address
          event.params.amount, // Shares
          1, // Subtract
          event.block.number, // Block Number
          event.block.timestamp, // Block Timestamp
          event.transaction.hash, // Transaction Hash
          event.logIndex // Log Index
        );

        createOrUpdateRawPositionTokenBalanceVault(
          generateRawMarketId(event.address.toHexString()), // Market ID
          fromAddress, // Account Address
          2, // Shares
          generateTokenId(Bytes.fromHexString(rawMarket.marketId)), // Wrapped Vault Address
          event.params.amount, // Shares
          1 // Subtract
        );

        createOrUpdateRawPositionVault(
          generateRawMarketId(event.address.toHexString()), // Market ID
          toAddress, // Account Address
          2, // Shares
          generateTokenId(Bytes.fromHexString(rawMarket.marketId)), // Wrapped Vault Address
          event.params.amount, // Shares
          0, // Add
          event.block.number, // Block Number
          event.block.timestamp, // Block Timestamp
          event.transaction.hash, // Transaction Hash
          event.logIndex // Log Index
        );

        createOrUpdateRawPositionTokenBalanceVault(
          generateRawMarketId(event.address.toHexString()), // Market ID
          toAddress, // Account Address
          2, // Shares
          generateTokenId(Bytes.fromHexString(rawMarket.marketId)), // Wrapped Vault Address
          event.params.amount, // Shares
          0 // Add
        );
      }
    }

    rawMarket.inputTokenAmount = inputTokenAmount;
    rawMarket.shares = shares;

    rawMarket.save();
  }
}
