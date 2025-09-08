import {
  protoInt64,
} from "@bufbuild/protobuf";
import {
  Int53,
} from "@cosmjs/math";

import {
  assertString,
} from "./tm2/encodings";
import {
  Duration,
} from "./types";

/**
 * Takes an integer value from the Tendermint RPC API and
 * returns it as number.
 *
 * Only works within the safe integer range.
 */
export function apiToSmallInt(input: string | number): number {
  const asInt = typeof input === "number" ? new Int53(input) : Int53.fromString(input);
  return asInt.toNumber();
}
export function durationFromString(value: string) {
  const duration: Duration = {
    seconds: BigInt(0),
    nanos: 0,
  };
  const match = value.match(/^(-?[0-9]+)(?:\.([0-9]+))?s/);
  if (match === null) {
    throw new Error(
      `cannot decode duration from string: ${value}`,
    );
  }
  const longSeconds = Number(match[1]);
  if (longSeconds > 315576000000 || longSeconds < -315576000000) {
    throw new Error(
      `cannot decode  duration from string: ${value}`,
    );
  }
  duration.seconds = protoInt64.parse(longSeconds);
  if (typeof match[2] !== "string") {
    return duration;
  }
  const nanosStr = match[2] + "0".repeat(9 - match[2].length);
  duration.nanos = parseInt(nanosStr);
  if (longSeconds < 0 || Object.is(longSeconds, -0)) {
    duration.nanos = -duration.nanos;
  }
  return duration;
}
/**
 * Takes an integer value from the Tendermint RPC API and
 * returns it as BigInt.
 *
 * This supports the full uint64 and int64 ranges.
 */
export function apiToBigInt(input: string): bigint {
  assertString(input); // Runtime check on top of TypeScript just to be safe for semi-trusted API types
  if (!input.match(/^-?[0-9]+$/)) {
    throw new Error("Invalid string format");
  }
  return BigInt(input);
}

/**
 * Takes an integer in the safe integer range and returns
 * a string representation to be used in the Tendermint RPC API.
 */
export function smallIntToApi(num: number): string {
  return new Int53(num).toString();
}
