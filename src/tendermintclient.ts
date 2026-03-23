import {
  HttpEndpoint,
} from "./rpcclients/index.js";
import {
  Tm2Client,
} from "./tm2/index.js";

/**
 * Auto-detects the version of the Tendermint backend and creates an appropriate RPC client.
 *
 * This is the main entry point for connecting to a Tendermint node. It automatically
 * determines the appropriate client type based on the endpoint URL:
 * - HTTP/HTTPS URLs create an HttpClient
 * - WebSocket URLs create a WebsocketClient
 * - HttpEndpoint objects create an HttpClient with custom headers
 *
 * The function performs a version detection handshake with the node to ensure compatibility.
 *
 * @param endpoint - Either a URL string or an HttpEndpoint object with URL and headers
 * @returns A connected Tm2Client instance ready for making RPC calls
 * @throws Will throw an error if the connection fails or version detection fails
 *
 * @example
 * ```typescript
 * // Connect via HTTP
 * const client = await connectTm2("http://localhost:26657");
 *
 * // Connect via WebSocket
 * const client = await connectTm2("ws://localhost:26657/websocket");
 *
 * // Connect with custom headers
 * const client = await connectTm2({
 *   url: "https://rpc.example.com",
 *   headers: { "Authorization": "Bearer token" }
 * });
 * ```
 */
export async function connectTm2(endpoint: string | HttpEndpoint): Promise<Tm2Client> {
  return await Tm2Client.connect(endpoint);
}
