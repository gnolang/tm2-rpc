import {
  describe,
  expect,
  test,
} from "vitest";

import {
  assertArray,
  assertBoolean,
  assertNotEmpty,
  assertNumber,
  assertObject,
  assertSet,
  assertString,
  dictionaryToStringMap,
  may,
} from "./encodings";

describe("assertion functions", () => {
  describe("assertSet", () => {
    test("passes through defined values", () => {
      expect(assertSet(42)).toBe(42);
      expect(assertSet("hello")).toBe("hello");
      expect(assertSet([])).toEqual([]);
      expect(assertSet({
      })).toEqual({
      });
      expect(assertSet(false)).toBe(false);
      expect(assertSet(0)).toBe(0);
    });

    test("throws for undefined", () => {
      expect(() => assertSet(undefined)).toThrow("Value must not be undefined");
    });

    test("throws for null", () => {
      expect(() => assertSet(null)).toThrow("Value must not be null");
    });
  });

  describe("assertString", () => {
    test("passes through strings", () => {
      expect(assertString("hello")).toBe("hello");
      expect(assertString("")).toBe("");
    });

    test("throws for non-strings", () => {
      expect(() => assertString(42 as any)).toThrow("Value must be a string");
      expect(() => assertString(null as any)).toThrow("Value must not be null");
      expect(() => assertString(undefined as any)).toThrow("Value must not be undefined");
    });
  });

  describe("assertNumber", () => {
    test("passes through numbers", () => {
      expect(assertNumber(42)).toBe(42);
      expect(assertNumber(0)).toBe(0);
      expect(assertNumber(-1.5)).toBe(-1.5);
      expect(assertNumber(NaN)).toBeNaN();
      expect(assertNumber(Infinity)).toBe(Infinity);
    });

    test("throws for non-numbers", () => {
      expect(() => assertNumber("42" as any)).toThrow("Value must be a number");
      expect(() => assertNumber(null as any)).toThrow("Value must not be null");
      expect(() => assertNumber(undefined as any)).toThrow("Value must not be undefined");
    });
  });

  describe("assertBoolean", () => {
    test("passes through booleans", () => {
      expect(assertBoolean(true)).toBe(true);
      expect(assertBoolean(false)).toBe(false);
    });

    test("throws for non-booleans", () => {
      expect(() => assertBoolean("true" as any)).toThrow("Value must be a boolean");
      expect(() => assertBoolean(1 as any)).toThrow("Value must be a boolean");
      expect(() => assertBoolean(null as any)).toThrow("Value must not be null");
    });
  });

  describe("assertArray", () => {
    test("passes through arrays", () => {
      expect(assertArray([1, 2, 3])).toEqual([1, 2, 3]);
      expect(assertArray([])).toEqual([]);
    });

    test("throws for non-arrays", () => {
      expect(() => assertArray("hello" as any)).toThrow("Value must be a an array");
      expect(() => assertArray(null as any)).toThrow("Value must not be null");
      expect(() => assertArray({
      } as any)).toThrow("Value must be a an array");
    });
  });

  describe("assertObject", () => {
    test("passes through plain objects", () => {
      expect(assertObject({
        key: "value",
      })).toEqual({
        key: "value",
      });
      expect(assertObject({
      })).toEqual({
      });
    });

    test("throws for non-objects", () => {
      expect(() => assertObject("hello" as any)).toThrow("Value must be an object");
      expect(() => assertObject(42 as any)).toThrow("Value must be an object");
      expect(() => assertObject(null as any)).toThrow("Value must not be null");
    });

    test("throws for special objects", () => {
      expect(() => assertObject([1, 2, 3] as any)).toThrow("Value must be a simple object");
      expect(() => assertObject(new Date() as any)).toThrow("Value must be a simple object");
      expect(() => assertObject(new Uint8Array() as any)).toThrow("Value must be a simple object");
    });
  });

  describe("assertNotEmpty", () => {
    test("passes through non-empty values", () => {
      expect(assertNotEmpty(42)).toBe(42);
      expect(assertNotEmpty("hello")).toBe("hello");
      expect(assertNotEmpty([1])).toEqual([1]);
      expect(assertNotEmpty({
        length: 1,
      })).toEqual({
        length: 1,
      });
    });

    test("throws for zero number", () => {
      expect(() => assertNotEmpty(0)).toThrow("must provide a non-zero value");
    });

    test("throws for empty array", () => {
      expect(() => assertNotEmpty([])).toThrow("must provide a non-empty value");
    });

    test("throws for empty string", () => {
      expect(() => assertNotEmpty("")).toThrow("must provide a non-empty value");
    });

    test("throws for objects with zero length", () => {
      expect(() => assertNotEmpty({
        length: 0,
      })).toThrow("must provide a non-empty value");
    });

    test("throws for null/undefined", () => {
      expect(() => assertNotEmpty(null)).toThrow("Value must not be null");
      expect(() => assertNotEmpty(undefined)).toThrow("Value must not be undefined");
    });
  });
});

describe("utility functions", () => {
  describe("dictionaryToStringMap", () => {
    test("converts object to Map", () => {
      const obj = {
        key1: "value1",
        key2: "value2",
      };
      const map = dictionaryToStringMap(obj);

      expect(map).toBeInstanceOf(Map);
      expect(map.get("key1")).toBe("value1");
      expect(map.get("key2")).toBe("value2");
      expect(map.size).toBe(2);
    });

    test("handles empty object", () => {
      const map = dictionaryToStringMap({
      });

      expect(map).toBeInstanceOf(Map);
      expect(map.size).toBe(0);
    });

    test("throws for non-string values", () => {
      const obj = {
        key1: "value1",
        key2: 42,
      };

      expect(() => dictionaryToStringMap(obj)).toThrow(
        "Found dictionary value of type other than string",
      );
    });

    test("handles special string values", () => {
      const obj = {
        empty: "",
        zero: "0",
        bool: "true",
      };
      const map = dictionaryToStringMap(obj);

      expect(map.get("empty")).toBe("");
      expect(map.get("zero")).toBe("0");
      expect(map.get("bool")).toBe("true");
    });
  });

  describe("may function", () => {
    test("applies transform to defined value", () => {
      const transform = (x: number) => x * 2;
      expect(may(transform, 5)).toBe(10);
      expect(may(transform, 0)).toBe(0);
    });

    test("returns undefined for null input", () => {
      const transform = (x: number) => x * 2;
      expect(may(transform, null)).toBeUndefined();
    });

    test("returns undefined for undefined input", () => {
      const transform = (x: number) => x * 2;
      expect(may(transform, undefined)).toBeUndefined();
    });

    test("works with string transforms", () => {
      const transform = (x: string) => x.toUpperCase();
      expect(may(transform, "hello")).toBe("HELLO");
      expect(may(transform, null)).toBeUndefined();
    });

    test("works with complex transforms", () => {
      const transform = (obj: {
        x: number
      }) => obj.x + 1;
      expect(may(transform, {
        x: 5,
      })).toBe(6);
      expect(may(transform, null)).toBeUndefined();
    });
  });
});
