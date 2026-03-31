/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  describe, expect, test,
} from "vitest";

import {
  DateTime,
  type DateWithNanoseconds,
  fromRfc3339WithNanoseconds,
  fromSeconds,
  type ReadonlyDateWithNanoseconds,
  toRfc3339WithNanoseconds,
  toSeconds,
} from "./dates.js";

describe("dates", () => {
  describe("fromRfc3339WithNanoseconds", () => {
    test("parses RFC 3339 datetime with nanoseconds", () => {
      const dateString = "2023-01-15T12:30:45.123456789Z"; // Changed to UTC time
      const result = fromRfc3339WithNanoseconds(dateString);

      expect(result.getFullYear()).toBe(2023);
      expect(result.getMonth()).toBe(0); // January is 0
      expect(result.getDate()).toBe(15);
      expect(result.getUTCHours()).toBe(12); // Use UTC methods to avoid timezone issues
      expect(result.getUTCMinutes()).toBe(30);
      expect(result.getUTCSeconds()).toBe(45);
      expect(result.getUTCMilliseconds()).toBe(123);
      expect(result.nanoseconds).toBe(456789);
    });

    test("parses RFC 3339 datetime with milliseconds only", () => {
      const dateString = "2023-01-15T10:30:45.123Z";
      const result = fromRfc3339WithNanoseconds(dateString);

      expect(result.getMilliseconds()).toBe(123);
      expect(result.nanoseconds).toBe(0);
    });

    test("parses RFC 3339 datetime without fractional seconds", () => {
      const dateString = "2023-01-15T10:30:45Z";
      const result = fromRfc3339WithNanoseconds(dateString);

      expect(result.getMilliseconds()).toBe(0);
      expect(result.nanoseconds).toBe(0);
    });

    test("handles partial nanoseconds", () => {
      const dateString = "2023-01-15T10:30:45.123456Z";
      const result = fromRfc3339WithNanoseconds(dateString);

      expect(result.getMilliseconds()).toBe(123);
      expect(result.nanoseconds).toBe(456000);
    });
  });

  describe("fromSeconds", () => {
    test("creates date from Unix timestamp", () => {
      const seconds = 1673780445; // 2023-01-15T10:00:45Z
      const result = fromSeconds(seconds);

      expect(result.getFullYear()).toBe(2023);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
      expect(result.nanoseconds).toBe(0);
    });

    test("creates date with nanoseconds", () => {
      const seconds = 1673780445;
      const nanos = 123456789;
      const result = fromSeconds(seconds, nanos);

      expect(result.getFullYear()).toBe(2023);
      expect(result.getMilliseconds()).toBe(123); // From nanos
      expect(result.nanoseconds).toBe(456789); // Remaining nanos
    });

    test("throws error for nanoseconds exceeding limit", () => {
      const seconds = 1673780445;
      const invalidNanos = 1000000000; // > 999,999,999

      expect(() => fromSeconds(seconds, invalidNanos)).toThrow(
        "Nano seconds must not exceed 999999999",
      );
    });

    test("handles zero nanoseconds", () => {
      const seconds = 1673780445;
      const result = fromSeconds(seconds, 0);

      expect(result.nanoseconds).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    test("handles maximum valid nanoseconds", () => {
      const seconds = 1673780445;
      const nanos = 999999999;
      const result = fromSeconds(seconds, nanos);

      expect(result.getMilliseconds()).toBe(999);
      expect(result.nanoseconds).toBe(999999);
    });
  });

  describe("toRfc3339WithNanoseconds", () => {
    test("formats date with nanoseconds", () => {
      const date: DateWithNanoseconds = new Date("2023-01-15T10:30:45.123Z");
      date.nanoseconds = 456789;

      const result = toRfc3339WithNanoseconds(date);

      expect(result).toBe("2023-01-15T10:30:45.123456789Z");
    });

    test("formats date without nanoseconds", () => {
      const date: DateWithNanoseconds = new Date("2023-01-15T10:30:45.123Z");

      const result = toRfc3339WithNanoseconds(date);

      expect(result).toBe("2023-01-15T10:30:45.123000000Z");
    });

    test("pads nanoseconds to 6 digits", () => {
      const date: DateWithNanoseconds = new Date("2023-01-15T10:30:45.123Z");
      date.nanoseconds = 456;

      const result = toRfc3339WithNanoseconds(date);

      expect(result).toBe("2023-01-15T10:30:45.123000456Z");
    });

    test("handles zero nanoseconds", () => {
      const date: DateWithNanoseconds = new Date("2023-01-15T10:30:45.000Z");
      date.nanoseconds = 0;

      const result = toRfc3339WithNanoseconds(date);

      expect(result).toBe("2023-01-15T10:30:45.000000000Z");
    });
  });

  describe("toSeconds", () => {
    test("converts date to seconds and nanos", () => {
      const date: DateWithNanoseconds = new Date("2023-01-15T12:00:45.123Z");
      date.nanoseconds = 456789;

      const result = toSeconds(date);

      // Just test the structure and calculations, not exact timestamp
      expect(result.seconds).toBe(1673784045); // Reasonable timestamp range
      expect(result.nanos).toBe(123456789); // milliseconds + nanoseconds
    });

    test("handles date without nanoseconds", () => {
      const date: DateWithNanoseconds = new Date("2023-01-15T12:00:45.123Z");

      const result = toSeconds(date);

      expect(result.seconds).toBe(1673784045); // Reasonable timestamp range
      expect(result.nanos).toBe(123000000); // Only milliseconds
    });

    test("handles date with zero milliseconds and nanoseconds", () => {
      const date: DateWithNanoseconds = new Date("2023-01-15T12:00:45.000Z");
      date.nanoseconds = 0;

      const result = toSeconds(date);

      expect(result.seconds).toBe(1673784045); // Reasonable timestamp range
      expect(result.nanos).toBe(0);
    });

    test("round trip conversion preserves precision", () => {
      const original = {
        seconds: 1673780445,
        nanos: 123456789,
      };
      const date = fromSeconds(original.seconds, original.nanos);
      const converted = toSeconds(date);

      expect(converted.seconds).toBe(original.seconds);
      expect(converted.nanos).toBe(original.nanos);
    });
  });

  describe("DateTime (deprecated)", () => {
    test("decode method works like fromRfc3339WithNanoseconds", () => {
      const dateString = "2023-01-15T10:30:45.123456789Z";
      const result = DateTime.decode(dateString);
      const expected = fromRfc3339WithNanoseconds(dateString);

      expect(result.getTime()).toBe(expected.getTime());
      expect(result.nanoseconds).toBe(expected.nanoseconds);
    });

    test("encode method works like toRfc3339WithNanoseconds", () => {
      const date: ReadonlyDateWithNanoseconds = new Date("2023-01-15T10:30:45.123Z");
      (date as any).nanoseconds = 456789;

      const result = DateTime.encode(date);
      const expected = toRfc3339WithNanoseconds(date);

      expect(result).toBe(expected);
    });
  });

  describe("integration tests", () => {
    test("RFC 3339 round trip preserves precision", () => {
      const originalString = "2023-01-15T10:30:45.123456789Z";
      const parsed = fromRfc3339WithNanoseconds(originalString);
      const formatted = toRfc3339WithNanoseconds(parsed);

      expect(formatted).toBe(originalString);
    });

    test("seconds round trip preserves precision", () => {
      const originalSeconds = 1673780445;
      const originalNanos = 123456789;
      const date = fromSeconds(originalSeconds, originalNanos);
      const converted = toSeconds(date);

      expect(converted.seconds).toBe(originalSeconds);
      expect(converted.nanos).toBe(originalNanos);
    });

    test("cross-format conversion works correctly", () => {
      const rfcString = "2023-01-15T10:30:45.123456789Z";
      const fromRfc = fromRfc3339WithNanoseconds(rfcString);
      const toSecs = toSeconds(fromRfc);
      const fromSecs = fromSeconds(toSecs.seconds, toSecs.nanos);
      const backToRfc = toRfc3339WithNanoseconds(fromSecs);

      expect(backToRfc).toBe(rfcString);
    });
  });
});
