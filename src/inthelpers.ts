import {
  protoInt64,
} from "@bufbuild/protobuf";
import {
  Int53,
} from "@cosmjs/math";

import {
  assertString,
} from "./tm2/encodings.js";
import {
  Duration,
} from "./types.js";

/**
 * Converts an integer value from the Tendermint RPC API to a JavaScript number.
 *
 * Tendermint RPC often returns numeric values as strings to avoid JSON precision
 * issues. This function safely converts them back to numbers while ensuring they
 * remain within JavaScript's safe integer range (Number.MAX_SAFE_INTEGER).
 *
 * @param input - String or number from the RPC API
 * @returns The value as a JavaScript number
 * @throws Error if the value exceeds the safe integer range
 *
 * @example
 * ```typescript
 * const height = apiToSmallInt("12345"); // 12345
 * const count = apiToSmallInt(response.n_txs); // converts "42" to 42
 * ```
 */
export function apiToSmallInt(input: string | number): number {
  const asInt = typeof input === "number" ? new Int53(input) : Int53.fromString(input);
  return asInt.toNumber();
}
/**
 * Parses a duration string from Tendermint RPC into a Duration object.
 *
 * Tendermint returns durations in Go's duration format (e.g., "5.5s", "1000000000ns").
 * This function parses the string and converts it to a structured Duration object
 * with separate seconds and nanoseconds components.
 *
 * @param value - Duration string in Go format (e.g., "1.5s", "2000000000ns")
 * @returns Duration object with seconds (BigInt) and nanoseconds (number)
 * @throws Error if the string format is invalid or the duration is too large
 *
 * @example
 * ```typescript
 * const duration1 = durationFromString("5s");        // { seconds: 5n, nanos: 0 }
 * const duration2 = durationFromString("1.5s");      // { seconds: 1n, nanos: 500000000 }
 * const duration3 = durationFromString("-2.25s");   // { seconds: -2n, nanos: -250000000 }
 * ```
 */
export function durationFromString(value: string): Duration {
  const duration: Duration = {
    seconds: BigInt(0),
    nanos: 0,
  };

  // Parse duration string format: "[+-]?[0-9]+([.][0-9]+)?s"
  const match = value.match(/^(-?[0-9]+)(?:\.([0-9]+))?s/);
  if (match === null) {
    throw new Error(
      `cannot decode duration from string: ${value}`,
    );
  }

  const longSeconds = Number(match[1]);
  // Check for reasonable bounds (approximately ±10,000 years)
  if (longSeconds > 315576000000 || longSeconds < -315576000000) {
    throw new Error(
      `cannot decode  duration from string: ${value}`,
    );
  }

  duration.seconds = protoInt64.parse(longSeconds);

  // Handle fractional seconds (nanoseconds)
  if (typeof match[2] !== "string") {
    return duration;
  }

  // Pad fractional part to 9 digits (nanosecond precision)
  const nanosStr = match[2] + "0".repeat(9 - match[2].length);
  duration.nanos = parseInt(nanosStr);

  // Apply sign to nanoseconds if seconds is negative or negative zero
  if (longSeconds < 0 || Object.is(longSeconds, -0)) {
    duration.nanos = -duration.nanos;
  }

  return duration;
}
/**
 * Converts an integer value from the Tendermint RPC API to a JavaScript BigInt.
 *
 * Tendermint RPC returns large integers as strings to avoid JSON precision issues.
 * This function converts them to BigInt, which can handle the full uint64 and int64
 * ranges that Tendermint uses.
 *
 * @param input - String representation of an integer from the RPC API
 * @returns The value as a JavaScript BigInt
 * @throws Error if the string format is invalid or not a valid integer
 *
 * @example
 * ```typescript
 * const votingPower = apiToBigInt("1000000000000");  // 1000000000000n
 * const gasUsed = apiToBigInt(response.gas_used);    // converts "21000" to 21000n
 * const balance = apiToBigInt("-500");              // -500n (negative values supported)
 * ```
 */
export function apiToBigInt(input: string): bigint {
  assertString(input); // Runtime check on top of TypeScript just to be safe for semi-trusted API types

  // Validate that the string contains only digits and optional leading minus sign
  if (!input.match(/^-?[0-9]+$/)) {
    throw new Error("Invalid string format");
  }

  return BigInt(input);
}

/**
 * Converts a JavaScript number to a string representation for the Tendermint RPC API.
 *
 * This is the inverse of apiToSmallInt(). It ensures the number is within the
 * safe integer range and converts it to a string format expected by the RPC API.
 *
 * @param num - JavaScript number to convert (must be within safe integer range)
 * @returns String representation of the number for RPC transmission
 * @throws Error if the number is not within the safe integer range
 *
 * @example
 * ```typescript
 * const heightStr = smallIntToApi(12345);        // "12345"
 * const limitStr = smallIntToApi(100);           // "100"
 * const params = { height: smallIntToApi(height) }; // For RPC parameters
 * ```
 */
export function smallIntToApi(num: number): string {
  return new Int53(num).toString();
}
