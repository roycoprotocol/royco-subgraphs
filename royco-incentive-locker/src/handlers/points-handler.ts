import { BigInt, store } from "@graphprotocol/graph-ts";
import {
    Award,
    PointsProgramCreated,
    PointsProgramOwnershipTransferred,
    PointsSpent,
    SpendCapsUpdated
} from "../../generated/schema"
import { RawPointsProgram, RawWhitelistedIP } from "../../generated/schema";
import { generateRawPointsProgramId, generateRawWhitelistedIpId } from "../utils/id-generator"
import { CHAIN_ID, BIG_INT_ZERO } from "../utils/constants"


export function createRawPointsProgram(entity: PointsProgramCreated): void {
    // Create a new RawPointsProgram entity using the generated unique ID
    let rawPointsProgramId = generateRawPointsProgramId(entity.pointsId);
    let program = new RawPointsProgram(rawPointsProgramId);

    // Populate the main program fields
    program.chainId = CHAIN_ID;
    program.pointsId = entity.pointsId;
    program.owner = entity.owner;
    program.name = entity.name;
    program.symbol = entity.symbol;
    program.decimals = entity.decimals;
    program.blockNumber = entity.blockNumber;
    program.blockTimestamp = entity.blockTimestamp;
    program.transactionHash = entity.transactionHash;

    // Save the points program entity
    program.save();

    // Create the whitelisted IPs
    createOrUpdateRawWhitelistedIps(
        entity.pointsId,
        entity.whitelistedIPs,
        entity.spendCaps
    );
}

export function createOrUpdateRawWhitelistedIps(
    pointsId: string,
    ipAddresses: string[],
    capacities: BigInt[]
): void {
    // Loop through each IP and capacity pair.
    for (let i = 0; i < ipAddresses.length; i++) {
        let ipAddress = ipAddresses[i];
        let capacity = capacities[i];
        let ipId = generateRawWhitelistedIpId(pointsId, ipAddress);

        // Try to load an existing whitelisted IP record.
        let whitelistedIp = RawWhitelistedIP.load(ipId);

        // If spend cap is zero, delete the entry if it exists and continue.
        if (capacity == BIG_INT_ZERO) {
            if (whitelistedIp != null) {
                store.remove("RawWhitelistedIP", ipId);
            }
            continue;
        }

        // If the record doesn't exist, create a new one.
        if (whitelistedIp == null) {
            whitelistedIp = new RawWhitelistedIP(ipId);
            // Link this whitelisted IP to its parent points program.
            whitelistedIp.rawPointsProgram = generateRawPointsProgramId(pointsId);
            whitelistedIp.chainId = CHAIN_ID;
            whitelistedIp.ip = ipAddress;
        }

        // Update (or set for a new record) the spend cap.
        whitelistedIp.spendCap = capacity;
        whitelistedIp.save();
    }
}
