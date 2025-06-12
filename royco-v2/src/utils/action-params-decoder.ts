import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";

enum CampaignType {
  SAME_CHAIN,
  CROSS_CHAIN,
}
// Struct to hold decoded ActionParams
export class DecodedIncentraActionParams {
  campaignType: CampaignType;
  incentraCampaign: Address;

  constructor(campaignType: CampaignType, incentraCampaign: Address) {
    this.campaignType = campaignType;
    this.incentraCampaign = incentraCampaign;
  }
}

/**
 * Decodes ActionParams bytes for Incentra campaigns
 * @param actionParams - The bytes to decode
 * @returns DecodedActionParams or null if decoding fails
 */
export function decodeIncentraActionParams(
  actionParams: Bytes
): DecodedIncentraActionParams | null {
  // ActionParams struct: (uint8 campaignType, address incentraCampaign)
  // This is a simple struct with two fields

  // Check if we have enough bytes (32 bytes for each field)
  if (actionParams.length < 64) {
    return null;
  }

  // Extract campaignType (first 32 bytes, but only first byte is used for uint8)
  const campaignTypeBytes = actionParams.slice(0, 32);
  const campaignTypeValue = campaignTypeBytes[31]; // uint8 is the last byte in the 32-byte slot
  const campaignType = campaignTypeValue as CampaignType;

  // Extract incentraCampaign address (next 32 bytes)
  const incentraCampaignBytes = actionParams.slice(32, 64);
  // Extract the last 20 bytes for the address
  const addressBytes = incentraCampaignBytes.subarray(12, 32);
  const incentraCampaign = Address.fromBytes(
    Bytes.fromUint8Array(addressBytes)
  );

  return new DecodedIncentraActionParams(campaignType, incentraCampaign);
}
