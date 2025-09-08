import {
  fromHex,
  toUtf8,
} from "@cosmjs/encoding";
import {
  describe,
  expect,
  test,
} from "vitest";

import {
  DateWithNanoseconds,
} from "../dates";
import {
  encodeBlockId,
  encodeBytes,
  encodeString,
  encodeTime,
  encodeUvarint,
} from "./encodings";

describe("encoding functions", () => {
  describe("encodeUvarint", () => {
    test("encodes small numbers", () => {
      expect(Array.from(encodeUvarint(0))).toEqual([0]);
      expect(Array.from(encodeUvarint(1))).toEqual([1]);
      expect(Array.from(encodeUvarint(127))).toEqual([127]);
    });

    test("encodes numbers requiring multiple bytes", () => {
      expect(Array.from(encodeUvarint(128))).toEqual([128, 1]);
      expect(Array.from(encodeUvarint(300))).toEqual([172, 2]);
      expect(Array.from(encodeUvarint(16384))).toEqual([128, 128, 1]);
    });

    test("encodes large numbers", () => {
      const large = 2097151; // Requires 3 bytes
      const encoded = encodeUvarint(large);
      expect(encoded).toHaveLength(3);
      expect(Array.from(encoded)).toEqual([255, 255, 127]);
    });

    test("handles edge cases", () => {
      expect(Array.from(encodeUvarint(0x7F))).toEqual([0x7F]);
      expect(Array.from(encodeUvarint(0x80))).toEqual([0x80, 0x01]);
    });
  });

  describe("encodeBytes", () => {
    test("encodes empty bytes", () => {
      const result = encodeBytes(new Uint8Array(0));
      expect(Array.from(result)).toEqual([]);
    });

    test("encodes single byte", () => {
      const bytes = new Uint8Array([42]);
      const result = encodeBytes(bytes);
      expect(Array.from(result)).toEqual([1, 42]);
    });

    test("encodes multiple bytes", () => {
      const bytes = fromHex("deadbeef");
      const result = encodeBytes(bytes);
      expect(Array.from(result)).toEqual([4, 0xde, 0xad, 0xbe, 0xef]);
    });

    test("encodes maximum allowed length", () => {
      const bytes = new Uint8Array(127).fill(170);
      const result = encodeBytes(bytes);
      expect(result[0]).toBe(127);
      expect(result).toHaveLength(128);
    });

    test("throws for oversized bytes", () => {
      const oversized = new Uint8Array(128);
      expect(() => encodeBytes(oversized)).toThrow(
        "Not implemented for byte arrays of length 128 or more",
      );
    });
  });

  describe("encodeString", () => {
    test("encodes empty string", () => {
      const result = encodeString("");
      expect(Array.from(result)).toEqual([0]);
    });

    test("encodes ASCII string", () => {
      const result = encodeString("hello");
      const expected = [5, ...toUtf8("hello")];
      expect(Array.from(result)).toEqual(expected);
    });

    test("encodes UTF-8 string", () => {
      const result = encodeString("héllo");
      const utf8Bytes = toUtf8("héllo");
      const expected = [utf8Bytes.length, ...utf8Bytes];
      expect(Array.from(result)).toEqual(expected);
    });

    test("encodes emoji", () => {
      const result = encodeString("🚀");
      const utf8Bytes = toUtf8("🚀");
      const expected = [utf8Bytes.length, ...utf8Bytes];
      expect(Array.from(result)).toEqual(expected);
    });
  });

  describe("encodeTime", () => {
    test("encodes date without nanoseconds", () => {
      const date = new Date("2023-01-15T10:30:45.000Z");
      const result = encodeTime(date);

      // Should encode seconds field
      expect(result.length).toBeGreaterThan(0);
      // First field should be seconds (tag 1)
      expect(result[0]).toBe(0x08);
    });

    test("encodes date with nanoseconds", () => {
      const date: DateWithNanoseconds = new Date("2023-01-15T10:30:45.123Z");
      date.nanoseconds = 456789;
      const result = encodeTime(date);

      // Should have both seconds and nanoseconds fields
      expect(result.length).toBeGreaterThan(5);
      // Should include nanoseconds field (tag 2)
      expect(result.includes(0x10)).toBe(true);
    });

    test("encodes epoch time", () => {
      const date = new Date(0); // Unix epoch
      const result = encodeTime(date);

      // Epoch should encode as empty (no seconds or nanos)
      expect(Array.from(result)).toEqual([]);
    });

    test("encodes future date", () => {
      const date = new Date("2030-12-31T23:59:59.999Z");
      const result = encodeTime(date);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toBe(0x08); // Seconds field
    });

    test("handles millisecond precision", () => {
      const date = new Date("2023-01-15T10:30:45.999Z");
      const result = encodeTime(date);

      // Should have nanoseconds field for millisecond precision
      expect(result.includes(0x10)).toBe(true);
    });
  });

  describe("encodeBlockId", () => {
    test("encodes block ID with parts", () => {
      const blockId = {
        hash: fromHex("0123456789abcdef0123456789abcdef01234567"),
        parts: {
          total: 1n,
          hash: fromHex("fedcba9876543210fedcba9876543210fedcba98"),
        },
      };

      const result = encodeBlockId(blockId);

      // Should start with hash field tag and length
      expect(result[0]).toBe(0x0a);
      expect(result[1]).toBe(blockId.hash.length);

      // Should contain the parts field
      expect(result.includes(0x12)).toBe(true);
    });

    test("handles different hash lengths", () => {
      const blockId = {
        hash: fromHex("abcd"),
        parts: {
          total: 2n,
          hash: fromHex("ef01"),
        },
      };

      const result = encodeBlockId(blockId);

      expect(result[1]).toBe(2); // Hash length
      expect(result.includes(0x08)).toBe(true); // Parts total field
    });

    test("encodes parts total correctly", () => {
      const blockId = {
        hash: fromHex("deadbeef"),
        parts: {
          total: 42n,
          hash: fromHex("cafebabe"),
        },
      };

      const result = encodeBlockId(blockId);

      // Should contain the parts total field tag
      expect(result.includes(0x08)).toBe(true);
      // Should contain the parts total value somewhere in the encoding
      expect(result.includes(42)).toBe(true);
    });
  });

  describe("integration tests", () => {
    test("uvarint encoding handles edge cases", () => {
      const testCases = [
        {
          input: 0,
          expected: [0],
        },
        {
          input: 1,
          expected: [1],
        },
        {
          input: 127,
          expected: [127],
        },
        {
          input: 128,
          expected: [128, 1],
        },
        {
          input: 16383,
          expected: [255, 127],
        },
        {
          input: 16384,
          expected: [128, 128, 1],
        },
      ];

      for (const testCase of testCases) {
        const result = Array.from(encodeUvarint(testCase.input));
        expect(result).toEqual(testCase.expected);
      }
    });

    test("bytes encoding is consistent", () => {
      const testData = [new Uint8Array([]), new Uint8Array([1]), new Uint8Array([1, 2, 3, 4, 5]), fromHex("deadbeefcafebabe")];

      for (const data of testData) {
        const encoded = encodeBytes(data);
        if (data.length === 0) {
          expect(encoded).toHaveLength(0);
        }
        else {
          expect(encoded[0]).toBe(data.length);
          expect(encoded.slice(1)).toEqual(data);
        }
      }
    });

    test("string encoding preserves UTF-8", () => {
      const testStrings = ["", "hello", "héllo wörld", "🚀🌟", "测试"];

      for (const str of testStrings) {
        const encoded = encodeString(str);
        const utf8 = toUtf8(str);

        if (str.length === 0) {
          expect(Array.from(encoded)).toEqual([0]);
        }
        else {
          expect(encoded[0]).toBe(utf8.length);
          expect(encoded.slice(1)).toEqual(utf8);
        }
      }
    });
  });
});
