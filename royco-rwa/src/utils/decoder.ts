import { BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";

export function getMetadataType(metadata: Bytes): BigInt {
  let bytesArray = new Uint8Array(2);

  for (let i = 0; i < 2; i++) {
    bytesArray[i] = metadata[i];
  }

  let bytes = Bytes.fromUint8Array(bytesArray);
  let decoded = ethereum.decode("uint16", bytes);

  if (decoded) {
    let value = decoded.toBigInt();
    return value;
  }

  return BigInt.fromI32(0);
}

export function getMetadataTimestamp(metadata: Bytes): BigInt {
  let bytesArray = new Uint8Array(32);

  for (let i = 0; i < 32; i++) {
    bytesArray[i] = metadata[2 + i];
  }

  let bytes = Bytes.fromUint8Array(bytesArray);
  let decoded = ethereum.decode("uint256", bytes);

  if (decoded) {
    let value = decoded.toBigInt();
    return value;
  }

  return BigInt.fromI32(0);
}
