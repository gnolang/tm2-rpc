import {
  ripemd160, sha256,
} from "@cosmjs/crypto";
import {
  toHex,
} from "@cosmjs/encoding";

/**
 * Returns Tendermint address in uppercase hex format.
 *
 * This is for addresses that are derived by the Tendermint keypair (typically Ed25519).
 *
 * For secp256k1 this assumes we already have a compressed pubkey, which is the default in Cosmos.
 *
 * @param type - The cryptographic algorithm type ("ed25519" or "secp256k1")
 * @param data - The raw public key bytes
 * @returns The address as an uppercase hex string (40 characters)
 */
export function pubkeyToAddress(type: "ed25519" | "secp256k1", data: Uint8Array): string {
  // Convert raw address bytes to uppercase hex string
  return toHex(pubkeyToRawAddress(type, data)).toUpperCase();
}

/**
 * Returns Tendermint address as bytes.
 *
 * This is for addresses that are derived by the Tendermint keypair (typically Ed25519).
 *
 * For secp256k1 this assumes we already have a compressed pubkey, which is the default in Cosmos.
 *
 * @param type - The cryptographic algorithm type ("ed25519" or "secp256k1")
 * @param data - The raw public key bytes
 * @returns The 20-byte raw address
 * @throws Error if the pubkey type is not supported
 */
export function pubkeyToRawAddress(type: "ed25519" | "secp256k1", data: Uint8Array): Uint8Array {
  switch (type) {
    case "ed25519":
      // Ed25519 uses SHA256 hash, first 20 bytes
      return rawEd25519PubkeyToRawAddress(data);
    case "secp256k1":
      // Secp256k1 uses Bitcoin-style RIPEMD160(SHA256) hash
      return rawSecp256k1PubkeyToRawAddress(data);
    default:
      // Keep this case here to guard against new types being added but not handled
      throw new Error(`Pubkey type ${type} not supported`);
  }
}

/**
 * Converts a raw Ed25519 public key to a raw Tendermint address.
 *
 * Ed25519 addresses are computed by taking the first 20 bytes of the SHA256 hash
 * of the 32-byte public key. This follows the Tendermint specification.
 *
 * @param pubkeyData - The 32-byte Ed25519 public key
 * @returns The 20-byte raw address
 * @throws Error if the public key length is not 32 bytes
 */
export function rawEd25519PubkeyToRawAddress(pubkeyData: Uint8Array): Uint8Array {
  if (pubkeyData.length !== 32) {
    throw new Error(`Invalid Ed25519 pubkey length: ${pubkeyData.length}`);
  }
  // Take first 20 bytes of SHA256 hash for Ed25519 addresses
  return sha256(pubkeyData).slice(0, 20);
}

/**
 * Converts a raw secp256k1 compressed public key to a raw Tendermint address.
 *
 * Secp256k1 addresses are computed using RIPEMD160(SHA256(compressed_pubkey)).
 * This follows the Bitcoin-style address derivation used in Cosmos.
 *
 * @param pubkeyData - The 33-byte compressed secp256k1 public key
 * @returns The 20-byte raw address
 * @throws Error if the public key length is not 33 bytes (compressed format)
 */
export function rawSecp256k1PubkeyToRawAddress(pubkeyData: Uint8Array): Uint8Array {
  if (pubkeyData.length !== 33) {
    throw new Error(`Invalid Secp256k1 pubkey length (compressed): ${pubkeyData.length}`);
  }
  // Use Bitcoin-style hash: RIPEMD160(SHA256(pubkey))
  return ripemd160(sha256(pubkeyData));
}
