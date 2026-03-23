/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  JsonRpcRequest, JsonRpcSuccessResponse,
} from "@cosmjs/json-rpc";
import {
  Stream,
} from "xstream";

/**
 * An event emitted from Tendermint after subscribing via WebSocket RPC.
 *
 * These events are delivered as streaming responses after establishing a
 * subscription. Each event contains the original query string and the
 * event data with type information.
 *
 * Note: This breaks the traditional JSON-RPC request/response pattern where
 * each request gets exactly one response, but this is how Tendermint implements
 * real-time event streaming.
 */
export interface SubscriptionEvent {
  /** The query string that was used to establish the subscription */
  readonly query: string
  /** The event data payload */
  readonly data: {
    /** Type of the event (e.g., "NewBlock", "Tx", "NewBlockHeader") */
    readonly type: string
    /** The actual event data (structure depends on event type) */
    readonly value: any
  }
}

/**
 * Basic RPC client interface for making JSON-RPC requests to Tendermint nodes.
 *
 * This interface defines the core functionality needed to communicate with
 * Tendermint via JSON-RPC. Implementations handle the transport layer
 * (HTTP, WebSocket) while providing a consistent interface.
 */
export interface RpcClient {
  /**
   * Executes a single JSON-RPC request and returns the response.
   *
   * @param request - The JSON-RPC request to execute
   * @returns Promise resolving to the successful JSON-RPC response
   * @throws Error if the request fails or returns an error response
   */
  readonly execute: (request: JsonRpcRequest) => Promise<JsonRpcSuccessResponse>

  /**
   * Disconnects from the Tendermint node and cleans up resources.
   *
   * For HTTP clients, this is typically a no-op. For WebSocket clients,
   * this closes the connection and stops any active subscriptions.
   */
  readonly disconnect: () => void
}

/**
 * Extended RPC client interface that supports streaming subscriptions.
 *
 * This interface extends the basic RpcClient with the ability to establish
 * long-lived subscriptions that stream events. Currently only supported
 * by WebSocket clients.
 */
export interface RpcStreamingClient extends RpcClient {
  /**
   * Establishes a subscription and returns a stream of events.
   *
   * The subscription will continue until the stream is closed or the
   * client disconnects. Events matching the subscription query will
   * be delivered through the returned stream.
   *
   * @param request - JSON-RPC subscription request (e.g., subscribe method)
   * @returns Stream of subscription events
   * @throws Error if subscription fails to establish
   */
  readonly listen: (request: JsonRpcRequest) => Stream<SubscriptionEvent>
}

/**
 * Type guard to check if an RPC client supports streaming subscriptions.
 *
 * @param client - The RPC client to check
 * @returns true if the client implements RpcStreamingClient
 */
export function instanceOfRpcStreamingClient(client: RpcClient): client is RpcStreamingClient {
  return typeof (client as any).listen === "function";
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Checks if a URL string includes a protocol scheme.
 *
 * Used to validate URLs before creating RPC clients. Helps distinguish
 * between full URLs (with protocol) and bare hostnames/addresses.
 *
 * @param url - The URL string to check
 * @returns true if the URL contains a protocol scheme (e.g., "http://", "ws://")
 *
 * @example
 * ```typescript
 * hasProtocol("http://localhost:26657");    // true
 * hasProtocol("ws://node.example.com");     // true
 * hasProtocol("localhost:26657");          // false
 * hasProtocol("node.example.com:26657");   // false
 * ```
 */
export function hasProtocol(url: string): boolean {
  return url.search("://") !== -1;
}
