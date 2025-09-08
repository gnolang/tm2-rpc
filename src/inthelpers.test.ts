import {
  describe, expect, test,
} from "vitest";

import {
  apiToBigInt,
  apiToSmallInt,
  durationFromString,
  smallIntToApi,
} from "./inthelpers";

describe("inthelpers", () => {
  describe("apiToSmallInt", () => {
    test("converts string to number", () => {
      expect(apiToSmallInt("12345")).toBe(12345);
      expect(apiToSmallInt("0")).toBe(0);
      expect(apiToSmallInt("-42")).toBe(-42);
    });

    test("passes through numbers unchanged", () => {
      expect(apiToSmallInt(12345)).toBe(12345);
      expect(apiToSmallInt(0)).toBe(0);
      expect(apiToSmallInt(-42)).toBe(-42);
    });

    test("handles large safe integers", () => {
      const maxSafe = Number.MAX_SAFE_INTEGER;
      expect(apiToSmallInt(maxSafe.toString())).toBe(maxSafe);

      const minSafe = Number.MIN_SAFE_INTEGER;
      expect(apiToSmallInt(minSafe.toString())).toBe(minSafe);
    });

    test("throws error for numbers exceeding safe integer range", () => {
      const tooLarge = (Number.MAX_SAFE_INTEGER + 1).toString();
      expect(() => apiToSmallInt(tooLarge)).toThrow();

      const tooSmall = (Number.MIN_SAFE_INTEGER - 1).toString();
      expect(() => apiToSmallInt(tooSmall)).toThrow();
    });
  });

  describe("smallIntToApi", () => {
    test("converts numbers to strings", () => {
      expect(smallIntToApi(12345)).toBe("12345");
      expect(smallIntToApi(0)).toBe("0");
      expect(smallIntToApi(-42)).toBe("-42");
    });

    test("handles large safe integers", () => {
      const maxSafe = Number.MAX_SAFE_INTEGER;
      expect(smallIntToApi(maxSafe)).toBe(maxSafe.toString());

      const minSafe = Number.MIN_SAFE_INTEGER;
      expect(smallIntToApi(minSafe)).toBe(minSafe.toString());
    });

    test("round trip with apiToSmallInt", () => {
      const original = 12345;
      const stringified = smallIntToApi(original);
      const parsed = apiToSmallInt(stringified);

      expect(parsed).toBe(original);
    });

    test("throws error for unsafe integers", () => {
      const unsafe = Number.MAX_SAFE_INTEGER + 1;
      expect(() => smallIntToApi(unsafe)).toThrow();
    });
  });

  describe("apiToBigInt", () => {
    test("converts string to BigInt", () => {
      expect(apiToBigInt("12345")).toBe(12345n);
      expect(apiToBigInt("0")).toBe(0n);
      expect(apiToBigInt("-42")).toBe(-42n);
    });

    test("handles very large numbers", () => {
      const largeNumber = "123456789012345678901234567890";
      expect(apiToBigInt(largeNumber)).toBe(123456789012345678901234567890n);
    });

    test("handles negative numbers", () => {
      expect(apiToBigInt("-123456789012345678901234567890")).toBe(-123456789012345678901234567890n);
    });

    test("throws error for invalid format", () => {
      expect(() => apiToBigInt("12.34")).toThrow("Invalid string format");
      expect(() => apiToBigInt("abc")).toThrow("Invalid string format");
      expect(() => apiToBigInt("123a")).toThrow("Invalid string format");
      expect(() => apiToBigInt("")).toThrow("Invalid string format");
      expect(() => apiToBigInt(" 123 ")).toThrow("Invalid string format");
    });

    test("accepts single zero", () => {
      expect(apiToBigInt("0")).toBe(0n);
    });

    test("accepts negative zero", () => {
      expect(apiToBigInt("-0")).toBe(0n);
    });
  });

  describe("durationFromString", () => {
    test("parses whole seconds", () => {
      const result = durationFromString("5s");
      expect(result.seconds).toBe(5n);
      expect(result.nanos).toBe(0);
    });

    test("parses fractional seconds", () => {
      const result = durationFromString("1.5s");
      expect(result.seconds).toBe(1n);
      expect(result.nanos).toBe(500000000);
    });

    test("parses negative durations", () => {
      const result = durationFromString("-2.25s");
      expect(result.seconds).toBe(-2n);
      expect(result.nanos).toBe(-250000000);
    });

    test("handles high precision fractional seconds", () => {
      const result = durationFromString("1.123456789s");
      expect(result.seconds).toBe(1n);
      expect(result.nanos).toBe(123456789);
    });

    test("pads short fractional parts", () => {
      const result = durationFromString("1.123s");
      expect(result.seconds).toBe(1n);
      expect(result.nanos).toBe(123000000);
    });

    test("truncates overly precise fractional parts", () => {
      const result = durationFromString("1.123456789s");
      expect(result.seconds).toBe(1n);
      expect(result.nanos).toBe(123456789);
    });

    test("handles zero duration", () => {
      const result = durationFromString("0s");
      expect(result.seconds).toBe(0n);
      expect(result.nanos).toBe(0);
    });

    test("handles negative zero", () => {
      const result = durationFromString("-0s");
      expect(result.seconds).toBe(0n);
      expect(result.nanos).toBe(0);
    });

    test("applies negative sign to nanoseconds for negative zero", () => {
      const result = durationFromString("-0.5s");
      expect(result.seconds).toBe(0n);
      expect(result.nanos).toBe(-500000000);
    });

    test("throws error for invalid format", () => {
      expect(() => durationFromString("5")).toThrow("cannot decode duration from string: 5");
      expect(() => durationFromString("5ms")).toThrow("cannot decode duration from string: 5ms");
      expect(() => durationFromString("abc")).toThrow("cannot decode duration from string: abc");
      expect(() => durationFromString("")).toThrow("cannot decode duration from string: ");
    });

    test("throws error for duration exceeding bounds", () => {
      const tooLarge = "315576000001s"; // > 10,000 years
      expect(() => durationFromString(tooLarge)).toThrow(
        `cannot decode  duration from string: ${tooLarge}`,
      );

      const tooSmall = "-315576000001s"; // < -10,000 years
      expect(() => durationFromString(tooSmall)).toThrow(
        `cannot decode  duration from string: ${tooSmall}`,
      );
    });

    test("accepts maximum valid duration", () => {
      const maxValid = "315576000000s"; // ~10,000 years
      const result = durationFromString(maxValid);
      expect(result.seconds).toBe(315576000000n);
      expect(result.nanos).toBe(0);
    });

    test("accepts minimum valid duration", () => {
      const minValid = "-315576000000s"; // ~-10,000 years
      const result = durationFromString(minValid);
      expect(result.seconds).toBe(-315576000000n);
      expect(result.nanos).toBe(0);
    });

    test("handles large seconds with fractional part", () => {
      const result = durationFromString("1000000.123456s");
      expect(result.seconds).toBe(1000000n);
      expect(result.nanos).toBe(123456000);
    });
  });

  describe("integration tests", () => {
    test("small int round trip maintains precision", () => {
      const numbers = [0, 1, -1, 12345, -67890, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER];

      for (const num of numbers) {
        const stringified = smallIntToApi(num);
        const parsed = apiToSmallInt(stringified);
        expect(parsed).toBe(num);
      }
    });

    test("duration parsing handles edge cases", () => {
      const testCases = [
        {
          input: "0s",
          expectedSeconds: 0n,
          expectedNanos: 0,
        },
        {
          input: "0.000000001s",
          expectedSeconds: 0n,
          expectedNanos: 1,
        },
        {
          input: "-0.000000001s",
          expectedSeconds: 0n,
          expectedNanos: -1,
        },
        {
          input: "1.999999999s",
          expectedSeconds: 1n,
          expectedNanos: 999999999,
        },
        {
          input: "-1.999999999s",
          expectedSeconds: -1n,
          expectedNanos: -999999999,
        },
      ];

      for (const testCase of testCases) {
        const result = durationFromString(testCase.input);
        expect(result.seconds).toBe(testCase.expectedSeconds);
        expect(result.nanos).toBe(testCase.expectedNanos);
      }
    });
  });
});
