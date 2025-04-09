import { BigInt, Address } from "@graphprotocol/graph-ts";
import {
    Award,
    PointsProgramCreated,
    PointsProgramOwnershipTransferred,
    PointsSpent,
    SpendCapsUpdated,
    RawPointsProgram,
    RawWhitelistedIP,
    RawPointsProgramBalance
} from "../../generated/schema"
import {
    Award as AwardEvent,
    PointsProgramCreated as PointsProgramCreatedEvent,
    PointsProgramOwnershipTransferred as PointsProgramOwnershipTransferredEvent,
    PointsSpent as PointsSpentEvent,
    SpendCapsUpdated as SpendCapsUpdatedEvent
} from "../../generated/IncentiveLocker/IncentiveLocker"
import {
    generateRawPointsProgramId,
    generateRawWhitelistedIpId,
    generateRawPointsProgramBalanceId
} from "../utils/id-generator"
import { CHAIN_ID, BIG_INT_ZERO } from "../utils/constants"


export function createRawPointsProgram(entity: PointsProgramCreated): void {
    // Create a new RawPointsProgram event.params using the generated unique ID
    let rawPointsProgramId = generateRawPointsProgramId(entity.pointsId);
    let program = new RawPointsProgram(rawPointsProgramId);

    // Populate the main program fields
    program.chainId = CHAIN_ID;
    program.pointsId = entity.pointsId;
    program.owner = entity.owner;
    program.name = entity.name;
    program.symbol = entity.symbol;
    program.decimals = entity.decimals;
    // Total awarded/supply initializes at 0
    program.totalSupply = BIG_INT_ZERO;
    program.blockNumber = entity.blockNumber;
    program.blockTimestamp = entity.blockTimestamp;
    program.transactionHash = entity.transactionHash;

    // Save the points program event.params
    program.save();
}

export function createOrUpdateRawWhitelistedIps(
    pointsId: string,
    ipAddresses: string[],
    capacities: BigInt[],
    blockNumber: BigInt,
    blockTimestamp: BigInt,
    transactionHash: string,
): void {
    let rawPointsProgramId = generateRawPointsProgramId(pointsId);
    let program = RawPointsProgram.load(rawPointsProgramId);
    if (program == null) {
        // Can log an error since program should exist
        return;
    }

    // Loop through each IP and capacity pair.
    for (let i = 0; i < ipAddresses.length; i++) {
        let ipAddress = ipAddresses[i];
        let capacity = capacities[i];
        let ipId = generateRawWhitelistedIpId(pointsId, ipAddress);

        let whitelistedIpIndex = program.whitelistedIPs.indexOf(ipAddress);
        if (whitelistedIpIndex == -1) {
            // IP Doesn't exist
            program.whitelistedIPs.push(ipAddress);
            program.spendCaps.push(capacity);
        } else {
            program.spendCaps[whitelistedIpIndex] = capacity;
        }

        // Try to load an existing whitelisted IP record.
        let whitelistedIp = RawWhitelistedIP.load(ipId);

        // If the record doesn't exist, create a new one.
        if (whitelistedIp == null) {
            whitelistedIp = new RawWhitelistedIP(ipId);
            // Link this whitelisted IP to its parent points program.
            whitelistedIp.chainId = CHAIN_ID;
            whitelistedIp.pointsId = pointsId;
            whitelistedIp.rawPointsProgramRefId = rawPointsProgramId;
            whitelistedIp.accountAddress = ipAddress;
            whitelistedIp.blockNumber = blockNumber;
            whitelistedIp.blockTimestamp = blockTimestamp;
            whitelistedIp.transactionHash = transactionHash;
        }

        // Update (or set for a new record) the spend cap.
        whitelistedIp.spendCap = capacity;
        whitelistedIp.save();
    }

    program.save();
}

export function handlePointsProgramOwnershipTransfer(pointsId: string, newOwner: string) {
    let rawPointsProgramId = generateRawPointsProgramId(pointsId);
    let program = RawPointsProgram.load(rawPointsProgramId);
    if (program == null) {
        // Can log an error since program should exist
        return;
    }

    // Update the owner
    program.owner = newOwner;
    program.save();
}

export function handleSpendPoints(pointsId: string, ipAddress: string, pointsSpent: BigInt) {
    let rawPointsProgramId = generateRawPointsProgramId(pointsId);
    let program = RawPointsProgram.load(rawPointsProgramId);
    if (program == null) {
        // Can log an error since program should exist
        return;
    }

    let whitelistedIpIndex = program.whitelistedIPs.indexOf(ipAddress);
    if (whitelistedIpIndex == -1) {
        // Can log an error since whitelistedIp should exist
        return;
    }
    let newCapacity = program.spendCaps[whitelistedIpIndex].minus(pointsSpent);
    program.spendCaps[whitelistedIpIndex] = newCapacity;

    program.save();

    let whitelistedIp = RawWhitelistedIP.load(generateRawWhitelistedIpId(pointsId, ipAddress));
    if (whitelistedIp == null) {
        // Can log an error since whitelistedIp should exist
        return;
    }
    whitelistedIp.spendCap = newCapacity;

    whitelistedIp.save();
}

export function handleAwardPoints(entity: Award) {
    let program = RawPointsProgram.load(entity.rawPointsProgramRefId);
    if (program == null) {
        // Can log an error since program should exist
        return;
    }

    // Add awarded points to the total supply
    program.totalSupply.plus(entity.amount);
    program.save();

    let pointsProgramBalanceId = generateRawPointsProgramBalanceId(entity.pointsId, entity.recipient);
    let pointsProgramBalance = RawPointsProgramBalance.load(pointsProgramBalanceId);
    if (pointsProgramBalance == null) {
        // If first award for this AP, create a balance entity for them
        pointsProgramBalance = new RawPointsProgramBalance(pointsProgramBalanceId);
        pointsProgramBalance.chainId = CHAIN_ID;
        pointsProgramBalance.pointsId = entity.pointsId;
        pointsProgramBalance.rawPointsProgramRefId = entity.rawPointsProgramRefId;
        pointsProgramBalance.accountAddress = entity.recipient;
        pointsProgramBalance.balance = entity.amount;
        pointsProgramBalance.blockNumber = entity.blockNumber;
        pointsProgramBalance.blockTimestamp = entity.blockTimestamp;
        pointsProgramBalance.transactionHash = entity.transactionHash;
    } else {
        pointsProgramBalance.balance = pointsProgramBalance.balance.plus(entity.amount);
    }

    pointsProgramBalance.save();
}



