import {
  fromHex,
} from "@cosmjs/encoding";
import {
  describe, expect, test,
} from "vitest";

import {
  pubkeyToAddress,
  pubkeyToRawAddress,
  rawEd25519PubkeyToRawAddress,
  rawSecp256k1PubkeyToRawAddress,
} from "./addresses";

describe("addresses", () => {
  describe("rawEd25519PubkeyToRawAddress", () => {
    test("computes correct address for Ed25519 public key", () => {
      const pubkey = fromHex("83890e87b0c0622539f88c713ca1e4be3ca3a92c9a64bddc311b7b9ed9ca4f3e");
      const address = rawEd25519PubkeyToRawAddress(pubkey);

      expect(address).toHaveLength(20);
      // Just verify it produces a valid 20-byte address without checking exact values
      expect(address).toBeInstanceOf(Uint8Array);
      expect(address).toEqual(fromHex("137d29f3be1b71a123baf2574f59f2a01df8378b"));
    });

    test("throws error for invalid Ed25519 public key length", () => {
      const invalidPubkey = new Uint8Array(31); // 31 bytes instead of 32

      expect(() => rawEd25519PubkeyToRawAddress(invalidPubkey)).toThrow(
        "Invalid Ed25519 pubkey length: 31",
      );
    });

    test("throws error for empty public key", () => {
      const emptyPubkey = new Uint8Array(0);

      expect(() => rawEd25519PubkeyToRawAddress(emptyPubkey)).toThrow(
        "Invalid Ed25519 pubkey length: 0",
      );
    });
  });

  describe("rawSecp256k1PubkeyToRawAddress", () => {
    test("computes correct address for secp256k1 compressed public key", () => {
      const compressedPubkey = fromHex("02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5");
      const address = rawSecp256k1PubkeyToRawAddress(compressedPubkey);

      expect(address).toHaveLength(20);
      // Just verify it produces a valid 20-byte address without checking exact values
      expect(address).toBeInstanceOf(Uint8Array);
      expect(address).toEqual(fromHex("06afd46bcdfd22ef94ac122aa11f241244a37ecc"));
    });

    test("throws error for invalid secp256k1 public key length", () => {
      const invalidPubkey = new Uint8Array(32); // 32 bytes instead of 33

      expect(() => rawSecp256k1PubkeyToRawAddress(invalidPubkey)).toThrow(
        "Invalid Secp256k1 pubkey length (compressed): 32",
      );
    });

    test("throws error for uncompressed public key", () => {
      const uncompressedPubkey = fromHex("04c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5"); // 65 bytes

      expect(() => rawSecp256k1PubkeyToRawAddress(uncompressedPubkey)).toThrow(
        "Invalid Secp256k1 pubkey length (compressed): 65",
      );
    });
  });

  describe("pubkeyToRawAddress", () => {
    test("handles Ed25519 public key", () => {
      const pubkey = fromHex("83890e87b0c0622539f88c713ca1e4be3ca3a92c9a64bddc311b7b9ed9ca4f3e");
      const address = pubkeyToRawAddress("ed25519", pubkey);

      expect(address).toHaveLength(20);
      expect(address).toEqual(fromHex("137d29f3be1b71a123baf2574f59f2a01df8378b"));
    });

    test("handles secp256k1 public key", () => {
      const pubkey = fromHex("02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5");
      const address = pubkeyToRawAddress("secp256k1", pubkey);

      expect(address).toHaveLength(20);
    });

    test("throws error for unsupported key type", () => {
      const pubkey = fromHex("83890e87b0c0622539f88c713ca1e4be3ca3a92c9a64bddc311b7b9ed9ca4f3e");

      expect(() => pubkeyToRawAddress("rsa" as any, pubkey)).toThrow(
        "Pubkey type rsa not supported",
      );
    });
  });

  describe("pubkeyToAddress", () => {
    test("returns uppercase hex address for Ed25519 key", () => {
      const pubkey = fromHex("83890e87b0c0622539f88c713ca1e4be3ca3a92c9a64bddc311b7b9ed9ca4f3e");
      const address = pubkeyToAddress("ed25519", pubkey);

      expect(address).toMatch(/^[A-F0-9]{40}$/);
      expect(address).toHaveLength(40);
      expect(address).toEqual("137D29F3BE1B71A123BAF2574F59F2A01DF8378B");
    });

    test("returns uppercase hex address for secp256k1 key", () => {
      const pubkey = fromHex("02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5");
      const address = pubkeyToAddress("secp256k1", pubkey);

      expect(address).toMatch(/^[A-F0-9]{40}$/);
      expect(address).toHaveLength(40);
      expect(address).toEqual("06AFD46BCDFD22EF94AC122AA11F241244A37ECC");
    });

    test("produces different addresses for different keys", () => {
      const pubkey1 = fromHex("83890e87b0c0622539f88c713ca1e4be3ca3a92c9a64bddc311b7b9ed9ca4f3e");
      const pubkey2 = fromHex("02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5");

      const address1 = pubkeyToAddress("ed25519", pubkey1);
      const address2 = pubkeyToAddress("secp256k1", pubkey2);

      expect(address1).not.toEqual(address2);
    });

    test("produces consistent addresses for same input", () => {
      const pubkey = fromHex("83890e87b0c0622539f88c713ca1e4be3ca3a92c9a64bddc311b7b9ed9ca4f3e");

      const address1 = pubkeyToAddress("ed25519", pubkey);
      const address2 = pubkeyToAddress("ed25519", pubkey);

      expect(address1).toEqual(address2);
    });
  });
});
