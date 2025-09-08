import {
  fromRfc3339,
} from "@cosmjs/encoding";
import {
  Uint32,
} from "@cosmjs/math";
import {
  ReadonlyDate,
} from "readonly-date";

/**
 * Extends the standard Date interface to include nanosecond precision.
 *
 * JavaScript Date objects only support millisecond precision, but blockchain
 * timestamps often require nanosecond precision. This interface adds the
 * additional nanosecond component.
 */
export interface DateWithNanoseconds extends Date {
  /** Nanoseconds after the time stored in a vanilla Date (millisecond granularity) */
  nanoseconds?: number
}

/**
 * Readonly version of DateWithNanoseconds for immutable date handling.
 *
 * Provides nanosecond precision while maintaining immutability guarantees.
 * Used throughout the RPC client for timestamp handling.
 */
export interface ReadonlyDateWithNanoseconds extends ReadonlyDate {
  /** Nanoseconds after the time stored in a vanilla ReadonlyDate (millisecond granularity) */
  readonly nanoseconds?: number
}

/**
 * Parses an RFC 3339 datetime string with nanosecond precision.
 *
 * Extends the standard RFC 3339 parsing to extract nanosecond information
 * that would otherwise be lost in JavaScript's millisecond-precision Date.
 *
 * @param dateTimeString - RFC 3339 formatted datetime string (e.g., "2023-01-01T12:00:00.123456789Z")
 * @returns DateWithNanoseconds object containing both the Date and nanosecond components
 */
export function fromRfc3339WithNanoseconds(dateTimeString: string): DateWithNanoseconds {
  const out: DateWithNanoseconds = fromRfc3339(dateTimeString);
  const nanosecondsMatch = dateTimeString.match(/\.(\d+)Z$/);
  const nanoseconds = nanosecondsMatch ? nanosecondsMatch[1].slice(3) : "";
  out.nanoseconds = parseInt(nanoseconds.padEnd(6, "0"), 10);
  return out;
}

/**
 * Creates a DateWithNanoseconds from Unix timestamp components.
 *
 * Combines seconds since Unix epoch with nanosecond precision,
 * commonly used when interfacing with protobuf Timestamp types.
 *
 * @param seconds - Seconds since Unix epoch (January 1, 1970 UTC)
 * @param nanos - Nanoseconds component (0-999,999,999), defaults to 0
 * @returns DateWithNanoseconds object with the specified timestamp
 * @throws Error if nanoseconds exceed 999,999,999
 */
export function fromSeconds(seconds: number, nanos = 0): DateWithNanoseconds {
  const checkedNanos = new Uint32(nanos).toNumber();
  if (checkedNanos > 999_999_999) {
    throw new Error("Nano seconds must not exceed 999999999");
  }
  // Create Date from seconds + milliseconds derived from nanoseconds
  const out: DateWithNanoseconds = new Date(seconds * 1000 + Math.floor(checkedNanos / 1000000));
  // Store remaining nanoseconds after millisecond conversion
  out.nanoseconds = checkedNanos % 1000000;
  return out;
}

/**
 * Formats a DateWithNanoseconds as an RFC 3339 string with nanosecond precision.
 *
 * Converts the date back to a string representation that preserves nanosecond
 * precision, suitable for transmission in JSON or other text formats.
 *
 * @param dateTime - DateWithNanoseconds to format
 * @returns RFC 3339 formatted string with nanosecond precision (e.g., "2023-01-01T12:00:00.123456789Z")
 */
export function toRfc3339WithNanoseconds(dateTime: ReadonlyDateWithNanoseconds): string {
  const millisecondIso = dateTime.toISOString();
  const nanoseconds = dateTime.nanoseconds?.toString() ?? "";
  // Replace the 'Z' with nanoseconds + 'Z'
  return `${millisecondIso.slice(0, -1)}${nanoseconds.padStart(6, "0")}Z`;
}

/**
 * Calculates the UNIX timestamp in seconds as well as the nanoseconds after the given second.
 *
 * This is useful when dealing with external systems like the protobuf type
 * [.google.protobuf.Timestamp](https://developers.google.com/protocol-buffers/docs/reference/google.protobuf#google.protobuf.Timestamp)
 * or any other system that does not use millisecond precision.
 *
 * @param date - DateWithNanoseconds to convert
 * @returns Object with seconds (Unix timestamp) and nanos (0-999,999,999) components
 */
export function toSeconds(date: ReadonlyDateWithNanoseconds): {
  seconds: number
  nanos: number
} {
  return {
    // Get seconds since Unix epoch
    seconds: Math.floor(date.getTime() / 1000),
    // Combine milliseconds converted to nanos + additional nanoseconds
    nanos: (date.getTime() % 1000) * 1000000 + (date.nanoseconds ?? 0),
  };
}

/**
 * @deprecated Use fromRfc3339WithNanoseconds/toRfc3339WithNanoseconds instead
 *
 * Legacy DateTime class providing backwards compatibility.
 * New code should use the functional API instead of this class.
 */
export class DateTime {
  /**
   * @deprecated Use fromRfc3339WithNanoseconds instead
   *
   * Decodes an RFC 3339 datetime string with nanosecond precision.
   *
   * @param dateTimeString - RFC 3339 formatted datetime string
   * @returns ReadonlyDateWithNanoseconds object
   */
  public static decode(dateTimeString: string): ReadonlyDateWithNanoseconds {
    return fromRfc3339WithNanoseconds(dateTimeString);
  }

  /**
   * @deprecated Use toRfc3339WithNanoseconds instead
   *
   * Encodes a DateWithNanoseconds as an RFC 3339 string.
   *
   * @param dateTime - DateWithNanoseconds to encode
   * @returns RFC 3339 formatted string with nanosecond precision
   */
  public static encode(dateTime: ReadonlyDateWithNanoseconds): string {
    return toRfc3339WithNanoseconds(dateTime);
  }
}
