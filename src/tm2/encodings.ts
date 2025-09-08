import {
  toUtf8,
} from "@cosmjs/encoding";

import {
  ReadonlyDateWithNanoseconds,
} from "../dates";
import {
  BlockId,
} from "./responses";

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

interface Lengther {
  readonly length: number
}

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Runtime type checker that ensures a value is an array.
 *
 * Validates that the input is actually an array at runtime, which is useful
 * when dealing with semi-trusted data from RPC responses that may not match
 * the expected TypeScript types.
 *
 * @param value - The value to check (should be an array)
 * @returns The same value, but with array type guaranteed
 * @throws Error if the value is not an array or is null/undefined
 *
 * @example
 * ```typescript
 * const apiResponse: any = JSON.parse(responseText);
 * const txs = assertArray(apiResponse.txs); // Ensures txs is actually an array
 * ```
 */
export function assertArray<T>(value: readonly T[]): readonly T[] {
  assertSet(value);
  if (!Array.isArray(value as unknown)) {
    throw new Error("Value must be a an array");
  }
  return value;
}

/**
 * Runtime type checker that ensures a value is a boolean.
 *
 * Validates that the input is actually a boolean at runtime, protecting
 * against API responses that might return strings like "true"/"false"
 * instead of actual boolean values.
 *
 * @param value - The value to check (should be a boolean)
 * @returns The same value, but with boolean type guaranteed
 * @throws Error if the value is not a boolean or is null/undefined
 */
export function assertBoolean(value: boolean): boolean {
  assertSet(value);
  if (typeof (value as unknown) !== "boolean") {
    throw new Error("Value must be a boolean");
  }
  return value;
}

/**
 * Ensures a value is not empty according to its type.
 *
 * Checks for "empty" values based on the value type:
 * - Numbers: rejects 0
 * - Arrays/strings: rejects length 0
 * - Objects with length property: rejects length 0
 *
 * This is commonly used to validate that required fields from RPC responses
 * contain meaningful data.
 *
 * @param value - The value to check for emptiness
 * @returns The same value if it's not empty
 * @throws Error if the value is empty, null, or undefined
 *
 * @example
 * ```typescript
 * const blockHash = assertNotEmpty(response.hash); // Ensures hash is not empty string
 * const height = assertNotEmpty(response.height);   // Ensures height is not 0
 * ```
 */
export function assertNotEmpty<T>(value: T): T {
  assertSet(value);

  if (typeof value === "number" && value === 0) {
    throw new Error("must provide a non-zero value");
  }
  else if ((value as any as Lengther).length === 0) {
    throw new Error("must provide a non-empty value");
  }
  return value;
}

/**
 * A runtime checker that ensures a given value is a number
 *
 * This is used when you want to verify that data at runtime matches the expected type.
 * This implies assertSet.
 */
export function assertNumber(value: number): number {
  assertSet(value);
  if (typeof (value as unknown) !== "number") {
    throw new Error("Value must be a number");
  }
  return value;
}

/**
 * A runtime checker that ensures a given value is an object in the sense of JSON
 * (an unordered collection of key–value pairs where the keys are strings)
 *
 * This is used when you want to verify that data at runtime matches the expected type.
 * This implies assertSet.
 */
export function assertObject<T>(value: T): T {
  assertSet(value);
  if (typeof (value as unknown) !== "object") {
    throw new Error("Value must be an object");
  }

  // Exclude special kind of objects like Array, Date or Uint8Array
  // Object.prototype.toString() returns a specified value:
  // http://www.ecma-international.org/ecma-262/7.0/index.html#sec-object.prototype.tostring
  if (Object.prototype.toString.call(value) !== "[object Object]") {
    throw new Error("Value must be a simple object");
  }

  return value;
}

/**
 * Runtime checker that ensures a value is defined (not null or undefined).
 *
 * This is the most basic runtime type check, ensuring that a value exists.
 * Used as a foundation by other assertion functions and when dealing with
 * optional fields from RPC responses.
 *
 * @param value - The value to check
 * @returns The same value if it's defined
 * @throws Error if the value is null or undefined
 *
 * @example
 * ```typescript
 * const result = assertSet(apiResponse.result); // Ensures result exists
 * const nodeInfo = assertSet(status.node_info); // Ensures node_info is present
 * ```
 */
export function assertSet<T>(value: T): T {
  if ((value as unknown) === undefined) {
    throw new Error("Value must not be undefined");
  }

  if ((value as unknown) === null) {
    throw new Error("Value must not be null");
  }

  return value;
}

/**
 * A runtime checker that ensures a given value is a string.
 *
 * This is used when you want to verify that data at runtime matches the expected type.
 * This implies assertSet.
 */
export function assertString(value: string): string {
  assertSet(value);
  if (typeof (value as unknown) !== "string") {
    throw new Error("Value must be a string");
  }
  return value;
}

/**
 * Converts a dictionary object to a Map with string keys and values.
 *
 * @param obj - The dictionary object to convert
 * @returns A Map with string keys and string values
 */
export function dictionaryToStringMap(obj: Record<string, unknown>): Map<string, string> {
  const out = new Map<string, string>();
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (typeof value !== "string") {
      throw new Error("Found dictionary value of type other than string");
    }
    out.set(key, value);
  }
  return out;
}

// Encodings needed for hashing block headers
// Several of these functions are inspired by https://github.com/nomic-io/js-tendermint/blob/tendermint-0.30/src/

/**
 * Encodes a block ID using Amino encoding format.
 *
 * @param blockId - The block ID to encode
 * @returns Amino-encoded block ID as bytes
 */
export function encodeBlockId(blockId: BlockId): Uint8Array {
  return Uint8Array.from([0x0a, blockId.hash.length, ...blockId.hash, 0x12, blockId.parts.hash.length + 4, 0x08, Number(blockId.parts.total), 0x12, blockId.parts.hash.length, ...blockId.parts.hash]);
}

/**
 * Encodes a byte array using Amino encoding format.
 *
 * Amino encoding prefixes byte arrays with their length as a single byte.
 * This is used for encoding various fields in Tendermint block headers
 * for cryptographic hashing.
 *
 * Reference: https://github.com/tendermint/go-amino/blob/v0.15.0/encoder.go#L180-L187
 *
 * @param bytes - The byte array to encode
 * @returns Amino-encoded bytes with length prefix
 * @throws Error if the byte array is longer than 127 bytes
 *
 * @example
 * ```typescript
 * const hash = new Uint8Array([1, 2, 3, 4]);
 * const encoded = encodeBytes(hash); // [4, 1, 2, 3, 4]
 * ```
 */
export function encodeBytes(bytes: Uint8Array): Uint8Array {
  // Current implementation only supports lengths < 128 (single byte length encoding)
  if (bytes.length >= 0x80) throw new Error("Not implemented for byte arrays of length 128 or more");
  return bytes.length ? Uint8Array.from([bytes.length, ...bytes]) : new Uint8Array();
}

/**
 * Encodes a string using Amino encoding format.
 *
 * Converts the string to UTF-8 bytes and prefixes with the byte length.
 * Used for encoding string fields in Tendermint block headers.
 *
 * Reference: https://github.com/tendermint/go-amino/blob/v0.15.0/encoder.go#L193-L195
 *
 * @param s - The string to encode
 * @returns Amino-encoded string as bytes with length prefix
 *
 * @example
 * ```typescript
 * const chainId = "test-chain";
 * const encoded = encodeString(chainId); // [10, 116, 101, 115, 116, 45, 99, 104, 97, 105, 110]
 * ```
 */
export function encodeString(s: string): Uint8Array {
  const utf8 = toUtf8(s);
  return Uint8Array.from([utf8.length, ...utf8]);
}

/**
 * Encodes a timestamp using Amino encoding format.
 *
 * Encodes timestamps as protobuf-style fields with separate seconds and
 * nanoseconds components. Used for encoding time fields in block headers.
 *
 * Reference: https://github.com/tendermint/go-amino/blob/v0.15.0/encoder.go#L134-L178
 *
 * @param time - The timestamp to encode (with optional nanosecond precision)
 * @returns Amino-encoded timestamp bytes
 *
 * @example
 * ```typescript
 * const blockTime = new Date();
 * const encoded = encodeTime(blockTime); // Protobuf-encoded timestamp
 * ```
 */
export function encodeTime(time: ReadonlyDateWithNanoseconds): Uint8Array {
  const milliseconds = time.getTime();
  const seconds = Math.floor(milliseconds / 1000);
  // Field 1 (0x08): seconds as varint
  const secondsArray = seconds ? [0x08, ...encodeUvarint(seconds)] : new Uint8Array();
  // Field 2 (0x10): nanoseconds as varint (includes millisecond precision + any extra nanos)
  const nanoseconds = (time.nanoseconds || 0) + (milliseconds % 1000) * 1e6;
  const nanosecondsArray = nanoseconds ? [0x10, ...encodeUvarint(nanoseconds)] : new Uint8Array();
  return Uint8Array.from([...secondsArray, ...nanosecondsArray]);
}

/**
 * Encodes an unsigned integer using variable-length encoding (varint).
 *
 * This is the same varint encoding used by Protocol Buffers. Numbers are
 * encoded using 7 bits per byte, with the high bit indicating continuation.
 *
 * Reference: https://github.com/tendermint/go-amino/blob/v0.15.0/encoder.go#L79-L87
 *
 * @param n - The number to encode (must be non-negative)
 * @returns Varint-encoded bytes
 *
 * @example
 * ```typescript
 * encodeUvarint(0);    // [0]
 * encodeUvarint(127);  // [127]
 * encodeUvarint(128);  // [128, 1]
 * encodeUvarint(300);  // [172, 2]
 * ```
 */
export function encodeUvarint(n: number): Uint8Array {
  return n >= 0x80
    ? Uint8Array.from([(n & 0xff) | 0x80, ...encodeUvarint(n >> 7)])
    : Uint8Array.from([n & 0xff]);
}

/*
export function encodeVersion(version: number): Uint8Array {
  const blockArray = version.block
    ? Uint8Array.from([0x08, ...encodeUvarint(version.block)])
    : new Uint8Array();
  const appArray = version.app ? Uint8Array.from([0x10, ...encodeUvarint(version.app)]) : new Uint8Array();
  return Uint8Array.from([...blockArray, ...appArray]);
}
*/

/**
 * Conditionally applies a transformation function to a value.
 *
 * This utility function safely applies a transformation only if the input value
 * is defined (not null or undefined). If the value is null/undefined, it returns
 * undefined without calling the transform function.
 *
 * Commonly used when processing optional fields from RPC responses where some
 * fields may be absent.
 *
 * @param transform - Function to apply to the value if it exists
 * @param value - The value to potentially transform (may be null/undefined)
 * @returns Transformed value if input exists, undefined otherwise
 *
 * @example
 * ```typescript
 * // Transform height string to number only if present
 * const height = may(parseInt, response.height); // number | undefined
 *
 * // Decode base64 data only if present
 * const data = may(fromBase64, response.data); // Uint8Array | undefined
 * ```
 */
export function may<T, U>(transform: (val: T) => U, value: T | null | undefined): U | undefined {
  return value === undefined || value === null ? undefined : transform(value);
}
