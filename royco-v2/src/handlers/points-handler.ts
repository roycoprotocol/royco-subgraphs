import { BigInt, Address } from "@graphprotocol/graph-ts";
import {
    Award,
    PointsProgramCreated,
    SpendCapsUpdated,
    RawPointsProgram,
    RawWhitelistedIP,
    RawPointsProgramBalance
} from "../../generated/schema"
import {
    generateIncentiveId,
    generateRawWhitelistedIpId,
    generateRawPointsProgramBalanceId
} from "../utils/id-generator"
import { CHAIN_ID, BIG_INT_ZERO } from "../utils/constants"


export function createRawPointsProgram(entity: PointsProgramCreated): void {
    // Create a new RawPointsProgram event.params using the generated unique ID
    let rawPointsProgramId = generateIncentiveId(entity.pointsId);
    let program = new RawPointsProgram(rawPointsProgramId);

    // Populate the main program fields
    program.chainId = CHAIN_ID;
    program.pointsAddress = entity.pointsId;
    program.owner = entity.owner;
    program.name = entity.name;
    program.symbol = entity.symbol;
    program.decimals = entity.decimals;
    // Total awarded/supply initializes at 0
    program.totalSupply = BIG_INT_ZERO;
    program.whitelistedIPs = entity.whitelistedIPs;
    program.spendCaps = entity.spendCaps;
    program.blockNumber = entity.blockNumber;
    program.blockTimestamp = entity.blockTimestamp;
    program.transactionHash = entity.transactionHash;
    program.logIndex = entity.logIndex;

    // Loop through each IP and capacity pair.
    for (let i = 0; i < entity.whitelistedIPs.length; i++) {
        let ipAddress = entity.whitelistedIPs[i];
        let capacity = entity.spendCaps[i];
        let ipId = generateRawWhitelistedIpId(entity.pointsId, ipAddress);

        let whitelistedIpIndex = program.whitelistedIPs.indexOf(ipAddress);
        if (whitelistedIpIndex == -1) {
            // Create new IP entity
            let newWhitelistedIPs = program.whitelistedIPs;
            newWhitelistedIPs.push(ipAddress);
            let newSpendCaps = program.spendCaps;
            newSpendCaps.push(capacity);
            // Write new array
            program.whitelistedIPs = newWhitelistedIPs;
            program.spendCaps = newSpendCaps;
        } else {
            // Update the spend caps array
            let newSpendCaps = program.spendCaps;
            newSpendCaps[whitelistedIpIndex] = capacity;
            program.spendCaps = newSpendCaps;
        }

        let whitelistedIp = new RawWhitelistedIP(ipId);
        // Link this whitelisted IP to its parent points program.
        whitelistedIp.chainId = CHAIN_ID;
        whitelistedIp.pointsAddress = entity.pointsId;
        whitelistedIp.rawPointsProgramRefId = rawPointsProgramId;
        whitelistedIp.accountAddress = ipAddress;
        whitelistedIp.spendCap = capacity;
        whitelistedIp.blockNumber = entity.blockNumber;
        whitelistedIp.blockTimestamp = entity.blockTimestamp;
        whitelistedIp.transactionHash = entity.transactionHash;
        whitelistedIp.logIndex = entity.logIndex;
        whitelistedIp.save();
    }

    program.save();
}

export function handleUpdatedSpendCaps(
    entity: SpendCapsUpdated
): void {
    let rawPointsProgramId = generateIncentiveId(entity.pointsId);
    let program = RawPointsProgram.load(rawPointsProgramId);
    if (program == null) {
        // Can log an error since program should exist
        return;
    }

    // Loop through each IP and capacity pair.
    for (let i = 0; i < entity.ips.length; i++) {
        let ipAddress = entity.ips[i];
        let capacity = entity.spendCaps[i];
        let ipId = generateRawWhitelistedIpId(entity.pointsId, ipAddress);

        let whitelistedIpIndex = program.whitelistedIPs.indexOf(ipAddress);
        if (whitelistedIpIndex == -1) {
            // Create new IP entity
            let newWhitelistedIPs = program.whitelistedIPs;
            newWhitelistedIPs.push(ipAddress);
            let newSpendCaps = program.spendCaps;
            newSpendCaps.push(capacity);
            // Write new array
            program.whitelistedIPs = newWhitelistedIPs;
            program.spendCaps = newSpendCaps;
        } else {
            // Update the spend caps array
            let newSpendCaps = program.spendCaps;
            newSpendCaps[whitelistedIpIndex] = capacity;
            program.spendCaps = newSpendCaps;
        }

        // Try to load an existing whitelisted IP record.
        let whitelistedIp = RawWhitelistedIP.load(ipId);

        // If the record doesn't exist, create a new one.
        if (whitelistedIp == null) {
            whitelistedIp = new RawWhitelistedIP(ipId);
            // Link this whitelisted IP to its parent points program.
            whitelistedIp.chainId = CHAIN_ID;
            whitelistedIp.pointsAddress = entity.pointsId;
            whitelistedIp.rawPointsProgramRefId = rawPointsProgramId;
            whitelistedIp.accountAddress = ipAddress;
            whitelistedIp.blockNumber = entity.blockNumber;
            whitelistedIp.blockTimestamp = entity.blockTimestamp;
            whitelistedIp.transactionHash = entity.transactionHash;
        }

        // Update (or set for a new record) the spend cap.
        whitelistedIp.spendCap = capacity;
        whitelistedIp.save();
    }

    program.save();
}

export function handlePointsProgramOwnershipTransfer(pointsId: string, newOwner: string): void {
    let rawPointsProgramId = generateIncentiveId(pointsId);
    let program = RawPointsProgram.load(rawPointsProgramId);
    if (program == null) {
        // Can log an error since program should exist
        return;
    }

    // Update the owner
    program.owner = newOwner;
    program.save();
}

export function handleSpendPoints(pointsId: string, ipAddress: string, pointsSpent: BigInt): void {
    let rawPointsProgramId = generateIncentiveId(pointsId);
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
    // Update the spend caps array
    let newSpendCaps = program.spendCaps;
    newSpendCaps[whitelistedIpIndex] = newCapacity;
    program.spendCaps = newSpendCaps;

    program.save();

    let whitelistedIp = RawWhitelistedIP.load(generateRawWhitelistedIpId(pointsId, ipAddress));
    if (whitelistedIp == null) {
        // Can log an error since whitelistedIp should exist
        return;
    }
    whitelistedIp.spendCap = newCapacity;

    whitelistedIp.save();
}

export function handleAwardPoints(entity: Award): void {
    let program = RawPointsProgram.load(entity.rawPointsProgramRefId);
    if (program == null) {
        // Can log an error since program should exist
        return;
    }

    // Add awarded points to the total supply
    program.totalSupply = program.totalSupply.plus(entity.amount);
    program.save();

    let pointsProgramBalanceId = generateRawPointsProgramBalanceId(entity.pointsId, entity.recipient);
    let pointsProgramBalance = RawPointsProgramBalance.load(pointsProgramBalanceId);
    if (pointsProgramBalance == null) {
        // If first award for this AP, create a balance entity for them
        pointsProgramBalance = new RawPointsProgramBalance(pointsProgramBalanceId);
        pointsProgramBalance.chainId = CHAIN_ID;
        pointsProgramBalance.pointsAddress = entity.pointsId;
        pointsProgramBalance.rawPointsProgramRefId = entity.rawPointsProgramRefId;
        pointsProgramBalance.accountAddress = entity.recipient;
        pointsProgramBalance.balance = entity.amount;
        pointsProgramBalance.blockNumber = entity.blockNumber;
        pointsProgramBalance.blockTimestamp = entity.blockTimestamp;
        pointsProgramBalance.transactionHash = entity.transactionHash;
        pointsProgramBalance.logIndex = entity.logIndex;
    } else {
        pointsProgramBalance.balance = pointsProgramBalance.balance.plus(entity.amount);
    }

    pointsProgramBalance.save();
}



