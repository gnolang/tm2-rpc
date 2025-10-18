/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  JsonRpcRequest,
} from "@cosmjs/json-rpc";

const numbersWithoutZero = "123456789";

/**
 * Generates a random numeric character from 1-9.
 *
 * Used for creating random IDs that don't start with zero.
 *
 * @returns A single digit character from "1" to "9"
 */
function randomNumericChar(): string {
  return numbersWithoutZero[Math.floor(Math.random() * numbersWithoutZero.length)];
}

/**
 * Generates a random positive integer for JSON-RPC request IDs.
 *
 * Creates a 12-digit random number by concatenating random digits 1-9.
 * This ensures the ID is always positive and never starts with zero.
 *
 * WARNING: This is NOT cryptographically secure and should only be used
 * for JSON-RPC request correlation, not for security-sensitive purposes.
 *
 * @returns A random 12-digit positive integer
 */
function randomId(): number {
  return parseInt(
    Array.from({
      length: 12,
    })
      .map(() => randomNumericChar())
      .join(""),
    10,
  );
}

/**
 * Creates a JSON-RPC 2.0 request with a random ID.
 *
 * Constructs a properly formatted JSON-RPC request object with:
 * - JSON-RPC version 2.0
 * - Random numeric ID for request correlation
 * - Specified method name
 * - Optional parameters object
 *
 * @param method - The RPC method name to call
 * @param params - Optional parameters object (will be copied to avoid mutation)
 * @returns Complete JSON-RPC request object ready for transmission
 *
 * @example
 * ```typescript
 * // Simple request without parameters
 * const statusRequest = createJsonRpcRequest("status");
 *
 * // Request with parameters
 * const blockRequest = createJsonRpcRequest("block", { height: "100" });
 *
 * // Result:
 * // {
 * //   jsonrpc: "2.0",
 * //   id: 123456789012,
 * //   method: "block",
 * //   params: { height: "100" }
 * // }
 * ```
 */
export function createJsonRpcRequest(method: string, params?: Record<string, any>): JsonRpcRequest {
  // Create a shallow copy of params to avoid accidental mutation
  const paramsCopy = params
    ? {
      ...params,
    }
    : {
    };
  return {
    jsonrpc: "2.0",
    id: randomId(),
    method: method,
    params: paramsCopy,
  };
}
