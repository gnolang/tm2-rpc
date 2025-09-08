import {
  isJsonRpcErrorResponse,
  JsonRpcRequest,
  JsonRpcSuccessResponse,
  parseJsonRpcResponse,
} from "@cosmjs/json-rpc";

import {
  http,
} from "./http";
import {
  hasProtocol, RpcClient,
} from "./rpcclient";

/**
 * Configuration for HTTP RPC endpoints with custom headers.
 *
 * This interface allows specifying both the endpoint URL and custom HTTP
 * headers that should be sent with every request. Useful for authentication,
 * API keys, or other request metadata.
 */
export interface HttpEndpoint {
  /**
   * The base URL of the HTTP RPC endpoint.
   *
   * Should be the root URL without method-specific paths. For example:
   * - "http://localhost:26657"
   * - "https://rpc.cosmos.network"
   * - "https://cosmoshub-4--rpc--full.datahub.figment.io"
   */
  readonly url: string
  /**
   * HTTP headers to include with every request.
   *
   * Common use cases:
   * - Authorization headers: { "Authorization": "Bearer token123" }
   * - API keys: { "X-API-Key": "your-api-key" }
   * - Content type overrides: { "Content-Type": "application/json" }
   */
  readonly headers: Record<string, string>
}

/**
 * HTTP client implementation for Tendermint JSON-RPC communication.
 *
 * This client uses standard HTTP POST requests to communicate with Tendermint
 * nodes. It supports both simple URL endpoints and more complex configurations
 * with custom headers.
 *
 * Features:
 * - Synchronous request/response pattern
 * - Custom HTTP headers support
 * - Automatic JSON-RPC error handling
 * - Protocol validation
 *
 * @example
 * ```typescript
 * // Simple URL endpoint
 * const client = new HttpClient("http://localhost:26657");
 *
 * // With custom headers
 * const client = new HttpClient({
 *   url: "https://rpc.example.com",
 *   headers: { "Authorization": "Bearer token" }
 * });
 * ```
 */
export class HttpClient implements RpcClient {
  protected readonly url: string;
  protected readonly headers: Record<string, string> | undefined;

  /**
   * Creates a new HTTP client instance.
   *
   * @param endpoint - Either a URL string or HttpEndpoint configuration
   * @throws Error if the URL string doesn't include a protocol
   */
  public constructor(endpoint: string | HttpEndpoint) {
    if (typeof endpoint === "string") {
      if (!hasProtocol(endpoint)) {
        throw new Error("Endpoint URL is missing a protocol. Expected 'https://' or 'http://'.");
      }
      this.url = endpoint;
    }
    else {
      this.url = endpoint.url;
      this.headers = endpoint.headers;
    }
  }

  /**
   * Disconnects from the endpoint.
   *
   * For HTTP clients, this is a no-op since HTTP is stateless.
   * Included for interface compliance with other client types.
   */
  public disconnect(): void {
    // Nothing to be done for stateless HTTP connections
  }

  /**
   * Executes a JSON-RPC request via HTTP POST.
   *
   * Sends the request to the Tendermint node and parses the response.
   * Automatically handles JSON-RPC error responses by throwing exceptions.
   *
   * @param request - The JSON-RPC request to execute
   * @returns Promise resolving to the successful JSON-RPC response
   * @throws Error if the HTTP request fails or returns a JSON-RPC error
   */
  public async execute(request: JsonRpcRequest): Promise<JsonRpcSuccessResponse> {
    const response = parseJsonRpcResponse(await http("POST", this.url, this.headers, request));
    if (isJsonRpcErrorResponse(response)) {
      throw new Error(JSON.stringify(response.error));
    }
    return response;
  }
}
