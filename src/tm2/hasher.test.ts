import {
  fromHex,
  toHex,
} from "@cosmjs/encoding";
import {
  describe,
  expect,
  test,
} from "vitest";

import {
  hashBlock,
  hashTx,
} from "./hasher.js";
import {
  Header,
} from "./responses.js";

describe("hasher", () => {
  describe("hashTx", () => {
    test("computes SHA-256 hash of transaction", () => {
      const tx = fromHex("deadbeef");
      const hash = hashTx(tx);

      expect(hash).toHaveLength(32);
      expect(toHex(hash)).toBe("5f78c33274e43fa9de5659265c1d917e25c03722dcb0b8d27db8d5feaa813953");
    });

    test("produces different hashes for different transactions", () => {
      const tx1 = fromHex("deadbeef");
      const tx2 = fromHex("cafebabe");

      const hash1 = hashTx(tx1);
      const hash2 = hashTx(tx2);

      expect(hash1).not.toEqual(hash2);
    });

    test("produces same hash for identical transactions", () => {
      const tx = fromHex("deadbeef");

      const hash1 = hashTx(tx);
      const hash2 = hashTx(tx);

      expect(hash1).toEqual(hash2);
    });

    test("handles empty transaction", () => {
      const tx = new Uint8Array(0);
      const hash = hashTx(tx);

      expect(hash).toHaveLength(32);
      expect(toHex(hash)).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    });

    test("handles single byte transaction", () => {
      const tx = new Uint8Array([42]);
      const hash = hashTx(tx);

      expect(hash).toHaveLength(32);
      expect(toHex(hash)).toBe("684888c0ebb17f374298b65ee2807526c066094c701bcc7ebbe1c1095f494fc1");
    });

    test("handles large transaction", () => {
      const tx = new Uint8Array(1000).fill(170); // 1000 bytes of 0xAA
      const hash = hashTx(tx);

      expect(hash).toHaveLength(32);
    });
  });

  describe("hashBlock", () => {
    const createMockHeader = (): Header => ({
      chainId: "test-chain",
      height: 12345,
      time: new Date("2023-01-15T10:30:45.123Z"),
      lastBlockId: {
        hash: fromHex("0123456789abcdef0123456789abcdef01234567"),
        parts: {
          total: 1n,
          hash: fromHex("fedcba9876543210fedcba9876543210fedcba98"),
        },
      },
      lastCommitHash: fromHex("1111111111111111111111111111111111111111"),
      dataHash: fromHex("2222222222222222222222222222222222222222"),
      validatorsHash: fromHex("3333333333333333333333333333333333333333"),
      nextValidatorsHash: fromHex("4444444444444444444444444444444444444444"),
      consensusHash: fromHex("5555555555555555555555555555555555555555"),
      appHash: fromHex("6666666666666666666666666666666666666666"),
      lastResultsHash: fromHex("7777777777777777777777777777777777777777"),
      proposerAddress: fromHex("8888888888888888888888888888888888888888"),
      version: "v0.0.0-rc1",
    });

    test("computes hash for valid header", () => {
      const header = createMockHeader();
      const hash = hashBlock(header);

      expect(hash).toHaveLength(32);
      expect(toHex(hash)).toMatch(/^[a-f0-9]{64}$/);
    });

    test("produces consistent hash for same header", () => {
      const header = createMockHeader();

      const hash1 = hashBlock(header);
      const hash2 = hashBlock(header);

      expect(hash1).toEqual(hash2);
    });

    test("produces different hashes for different headers", () => {
      const header1 = createMockHeader();
      const header2 = {
        ...createMockHeader(),
        height: 54321,
      };

      const hash1 = hashBlock(header1);
      const hash2 = hashBlock(header2);

      expect(hash1).not.toEqual(hash2);
    });

    test("throws error for genesis block (no lastBlockId)", () => {
      const genesisHeader = {
        ...createMockHeader(),
        lastBlockId: null,
      };

      expect(() => hashBlock(genesisHeader)).toThrow(
        "Hashing a block header with no last block ID (i.e. header at height 1) is not supported",
      );
    });

    test("hash changes when chainId changes", () => {
      const header1 = createMockHeader();
      const header2 = {
        ...createMockHeader(),
        chainId: "different-chain",
      };

      const hash1 = hashBlock(header1);
      const hash2 = hashBlock(header2);

      expect(hash1).not.toEqual(hash2);
    });

    test("hash changes when time changes", () => {
      const header1 = createMockHeader();
      const header2 = {
        ...createMockHeader(),
        time: new Date("2023-01-15T10:30:46.123Z"), // 1 second later
      };

      const hash1 = hashBlock(header1);
      const hash2 = hashBlock(header2);

      expect(hash1).not.toEqual(hash2);
    });

    test("hash changes when lastBlockId changes", () => {
      const header1 = createMockHeader();
      const header2 = {
        ...createMockHeader(),
        lastBlockId: {
          hash: fromHex("9876543210abcdef9876543210abcdef98765432"),
          parts: {
            total: 1n,
            hash: fromHex("123456789abcdef0123456789abcdef012345678"),
          },
        },
      };

      const hash1 = hashBlock(header1);
      const hash2 = hashBlock(header2);

      expect(hash1).not.toEqual(hash2);
    });

    test("hash changes when any hash field changes", () => {
      const originalHeader = createMockHeader();
      const hashFields = ["lastCommitHash", "dataHash", "validatorsHash", "nextValidatorsHash", "consensusHash", "appHash", "lastResultsHash"] as const;

      for (const field of hashFields) {
        const modifiedHeader = {
          ...createMockHeader(),
          [field]: fromHex("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"),
        };

        const originalHash = hashBlock(originalHeader);
        const modifiedHash = hashBlock(modifiedHeader);

        expect(modifiedHash).not.toEqual(originalHash);
      }
    });

    test("hash changes when proposerAddress changes", () => {
      const header1 = createMockHeader();
      const header2 = {
        ...createMockHeader(),
        proposerAddress: fromHex("9999999999999999999999999999999999999999"),
      };

      const hash1 = hashBlock(header1);
      const hash2 = hashBlock(header2);

      expect(hash1).not.toEqual(hash2);
    });

    test("handles minimum height", () => {
      const header = {
        ...createMockHeader(),
        height: 2, // Minimum allowed height (genesis would be 1)
      };

      const hash = hashBlock(header);

      expect(hash).toHaveLength(32);
    });

    test("handles maximum height", () => {
      const header = {
        ...createMockHeader(),
        height: Number.MAX_SAFE_INTEGER,
      };

      const hash = hashBlock(header);

      expect(hash).toHaveLength(32);
    });

    test("handles empty hashes", () => {
      const header = {
        ...createMockHeader(),
        dataHash: new Uint8Array(20).fill(0),
        appHash: new Uint8Array(20).fill(0),
      };

      const hash = hashBlock(header);

      expect(hash).toHaveLength(32);
    });
  });
});
