import {
  JsonRpcRequest, JsonRpcSuccessResponse,
} from "@cosmjs/json-rpc";

import {
  createJsonRpcRequest,
} from "../jsonrpc";
import {
  HttpClient,
  HttpEndpoint,
  RpcClient,
  WebsocketClient,
} from "../rpcclients";
import {
  Params, Responses,
} from "./adaptor";
import * as requests from "./requests";
import * as responses from "./responses";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Generic decoder type that transforms a JSON-RPC success response into a typed response object.
 *
 * This type represents functions that decode raw JSON-RPC responses from the Tendermint node
 * into properly typed response objects with correct TypeScript types.
 */
type Decoder<T extends responses.Response> = (res: JsonRpcSuccessResponse) => T;

/**
 * Generic encoder type that transforms a typed request into a JSON-RPC request.
 *
 * This type represents functions that encode typed request objects into the JSON-RPC
 * format expected by the Tendermint node.
 */
type Encoder<T extends requests.Request> = (req: T) => JsonRpcRequest;

// ============================================================================
// CLASSES
// ============================================================================

/**
 * Tm2Client provides a high-level interface for interacting with Tendermint nodes via RPC.
 *
 * This client supports all major Tendermint RPC methods including:
 * - Chain queries (blocks, blockchain, validators)
 * - Transaction operations (broadcast, query)
 * - Node information (status, health, network info)
 * - Consensus data (consensus params, genesis)
 * - ABCI queries for custom application data
 *
 * The client automatically handles:
 * - JSON-RPC request/response encoding and decoding
 * - Type conversion between API and application types
 * - Connection management for HTTP and WebSocket transports
 *
 * @example
 * ```typescript
 * const client = await Tm2Client.connect("http://localhost:26657");
 *
 * // Get latest block
 * const block = await client.block();
 *
 * // Get node status
 * const status = await client.status();
 *
 * // Broadcast a transaction
 * const result = await client.broadcastTxCommit({ tx: txBytes });
 * ```
 */
export class Tm2Client {
  private readonly client: RpcClient;

  /**
   * Private constructor to ensure clients are created through the static factory methods.
   *
   * Use `Tm2Client.connect()` or `Tm2Client.create()` to create an instance.
   * This ensures proper initialization and version detection.
   *
   * @param client - The underlying RPC client (HTTP or WebSocket)
   */
  private constructor(client: RpcClient) {
    this.client = client;
  }

  /**
   * Creates and connects a new Tendermint client for the given endpoint.
   *
   * This is the primary way to create a Tm2Client instance. It automatically:
   * - Detects the transport type based on URL scheme
   * - Performs version detection handshake
   * - Returns a ready-to-use client instance
   *
   * Transport selection:
   * - HTTP/HTTPS URLs create an HttpClient
   * - All other URLs create a WebsocketClient
   * - HttpEndpoint objects always create an HttpClient
   *
   * @param endpoint - Either a URL string or HttpEndpoint with URL and headers
   * @returns Promise resolving to a connected Tm2Client instance
   * @throws Error if connection fails or version detection fails
   */
  public static async connect(endpoint: string | HttpEndpoint): Promise<Tm2Client> {
    let rpcClient: RpcClient;
    if (typeof endpoint === "object") {
      rpcClient = new HttpClient(endpoint);
    }
    else {
      const useHttp = endpoint.startsWith("http://") || endpoint.startsWith("https://");
      rpcClient = useHttp ? new HttpClient(endpoint) : new WebsocketClient(endpoint);
    }

    // For some very strange reason I don't understand, tests start to fail on some systems
    // (our CI) when skipping the status call before doing other queries. Sleeping a little
    // while did not help. Thus we query the version as a way to say "hi" to the backend,
    // even in cases where we don't use the result.
    const _version = await this.detectVersion(rpcClient);

    return Tm2Client.create(rpcClient);
  }

  /**
   * Creates a new Tendermint client from an existing RPC client.
   *
   * This is useful when you want to reuse an existing RPC client instance
   * or when you need custom RPC client configuration.
   *
   * @param rpcClient - Pre-configured RPC client (HTTP or WebSocket)
   * @returns Promise resolving to a Tm2Client instance
   */
  public static async create(rpcClient: RpcClient): Promise<Tm2Client> {
    return new Tm2Client(rpcClient);
  }

  /**
   * Detects the Tendermint version by querying the node status.
   *
   * This method is called during client initialization to ensure compatibility
   * and to work around some system-specific initialization issues in the RPC layer.
   *
   * @param client - The RPC client to use for version detection
   * @returns Promise resolving to the node version string
   * @throws Error if status query fails or version format is invalid
   */
  private static async detectVersion(client: RpcClient): Promise<string> {
    const req = createJsonRpcRequest(requests.Method.Status);
    const response = await client.execute(req);
    const result = response.result;

    if (!result || !result.node_info) {
      throw new Error("Unrecognized format for status response");
    }

    const version = result.node_info.version;
    if (typeof version !== "string") {
      throw new Error("Unrecognized version format: must be string");
    }
    return version;
  }

  /**
   * Queries the ABCI info from the node.
   *
   * Returns information about the application including the last block height
   * and app hash. This is useful for determining the current state of the application.
   *
   * @returns Promise resolving to ABCI info including data, last block height, and app hash
   * @throws Error if the query fails
   *
   * @example
   * ```typescript
   * const info = await client.abciInfo();
   * console.log(`Last block height: ${info.lastBlockHeight}`);
   * ```
   */
  public async abciInfo(): Promise<responses.AbciInfoResponse> {
    const query: requests.AbciInfoRequest = {
      method: requests.Method.AbciInfo,
    };
    return this.doCall(query, Params.encodeAbciInfo, Responses.decodeAbciInfo);
  }

  /**
   * Performs an ABCI query against the application.
   *
   * ABCI queries allow you to retrieve custom application data by querying
   * the application directly. The path and data parameters are application-specific.
   *
   * @param params - Query parameters including path, data, height, and proof options
   * @returns Promise resolving to query response with key, value, proof, and height
   * @throws Error if the query fails
   *
   * @example
   * ```typescript
   * const result = await client.abciQuery({
   *   path: "/store/bank/key",
   *   data: fromHex("account_address"),
   *   prove: true
   * });
   * console.log(`Account balance: ${result.value}`);
   * ```
   */
  public async abciQuery(params: requests.AbciQueryParams): Promise<responses.AbciQueryResponse> {
    const query: requests.AbciQueryRequest = {
      params: params,
      method: requests.Method.AbciQuery,
    };
    return this.doCall(query, Params.encodeAbciQuery, Responses.decodeAbciQuery);
  }

  /**
   * Retrieves a block at the specified height.
   *
   * Returns the complete block including header, transactions, and evidence.
   * If no height is specified, returns the latest block.
   *
   * @param height - Block height to retrieve (optional, defaults to latest)
   * @returns Promise resolving to block data with metadata and transactions
   * @throws Error if the block doesn't exist or query fails
   *
   * @example
   * ```typescript
   * // Get latest block
   * const latestBlock = await client.block();
   *
   * // Get specific block
   * const block100 = await client.block(100);
   * console.log(`Block has ${block100.block.txs.length} transactions`);
   * ```
   */
  public async block(height?: number): Promise<responses.BlockResponse> {
    const query: requests.BlockRequest = {
      method: requests.Method.Block,
      params: {
        height: height,
      },
    };
    return this.doCall(query, Params.encodeBlock, Responses.decodeBlock);
  }

  /**
   * Retrieves the execution results for a block at the specified height.
   *
   * Returns the ABCI results from executing the block including transaction
   * delivery results, begin/end block events, and validator updates.
   *
   * @param height - Block height to get results for (optional, defaults to latest)
   * @returns Promise resolving to block execution results
   * @throws Error if the block doesn't exist or query fails
   *
   * @example
   * ```typescript
   * const results = await client.blockResults(100);
   * console.log(`Block had ${results.results.deliverTx.length} transaction results`);
   * ```
   */
  public async blockResults(height?: number): Promise<responses.BlockResultsResponse> {
    const query: requests.BlockResultsRequest = {
      method: requests.Method.BlockResults,
      params: {
        height: height,
      },
    };
    return this.doCall(query, Params.encodeBlockResults, Responses.decodeBlockResults);
  }

  /**
   * Queries block headers filtered by minHeight <= height <= maxHeight.
   *
   * @param minHeight The minimum height to be included in the result. Defaults to 0.
   * @param maxHeight The maximum height to be included in the result. Defaults to infinity.
   */
  public async blockchain(minHeight?: number, maxHeight?: number): Promise<responses.BlockchainResponse> {
    const query: requests.BlockchainRequest = {
      method: requests.Method.Blockchain,
      params: {
        minHeight: minHeight,
        maxHeight: maxHeight,
      },
    };
    return this.doCall(query, Params.encodeBlockchain, Responses.decodeBlockchain);
  }

  /**
   * Broadcast transaction to mempool and do not wait for result
   *
   * @see https://docs.tendermint.com/master/rpc/#/Tx/broadcast_tx_async
   */
  public async broadcastTxAsync(
    params: requests.BroadcastTxParams,
  ): Promise<responses.BroadcastTxAsyncResponse> {
    const query: requests.BroadcastTxRequest = {
      params: params,
      method: requests.Method.BroadcastTxAsync,
    };
    return this.doCall(query, Params.encodeBroadcastTx, Responses.decodeBroadcastTxAsync);
  }

  /**
   * Broadcast transaction to mempool and wait for block
   *
   * @see https://docs.tendermint.com/master/rpc/#/Tx/broadcast_tx_commit
   */
  public async broadcastTxCommit(
    params: requests.BroadcastTxParams,
  ): Promise<responses.BroadcastTxCommitResponse> {
    const query: requests.BroadcastTxRequest = {
      params: params,
      method: requests.Method.BroadcastTxCommit,
    };
    return this.doCall(query, Params.encodeBroadcastTx, Responses.decodeBroadcastTxCommit);
  }

  /**
   * Broadcast transaction to mempool and wait for response
   *
   * @see https://docs.tendermint.com/master/rpc/#/Tx/broadcast_tx_sync
   */
  public async broadcastTxSync(
    params: requests.BroadcastTxParams,
  ): Promise<responses.BroadcastTxSyncResponse> {
    const query: requests.BroadcastTxRequest = {
      params: params,
      method: requests.Method.BroadcastTxSync,
    };
    return this.doCall(query, Params.encodeBroadcastTx, Responses.decodeBroadcastTxSync);
  }

  /**
   * Retrieves the commit information for a block at the specified height.
   *
   * Returns the commit data including validator signatures and block header.
   * This is useful for verifying block finality and validator participation.
   *
   * @param height - Block height to get commit for (optional, defaults to latest)
   * @returns Promise resolving to commit data with signatures and header
   * @throws Error if the block doesn't exist or query fails
   *
   * @example
   * ```typescript
   * const commit = await client.commit(100);
   * console.log(`Block was signed by ${commit.commit.precommits.filter(p => p).length} validators`);
   * ```
   */
  public async commit(height?: number): Promise<responses.CommitResponse> {
    const query: requests.CommitRequest = {
      method: requests.Method.Commit,
      params: {
        height: height,
      },
    };
    return this.doCall(query, Params.encodeCommit, Responses.decodeCommit);
  }

  /**
   * Retrieves the consensus parameters at the specified height.
   *
   * Returns the current consensus parameters including block limits,
   * validator requirements, and other chain configuration settings.
   *
   * @param height - Block height to get consensus params for (optional, defaults to latest)
   * @returns Promise resolving to consensus parameters including block and validator params
   * @throws Error if the query fails
   *
   * @example
   * ```typescript
   * const params = await client.consensusParams();
   * console.log(`Max block size: ${params.consensusParams.block.maxBlockBytes} bytes`);
   * ```
   */
  public async consensusParams(height?: number): Promise<responses.ConsensusParamsResponse> {
    const query: requests.ConsensusParamsRequest = {
      method: requests.Method.ConsensusParams,
      params: {
        height: height,
      },
    };
    return this.doCall(query, Params.encodeConsensusParams, Responses.decodeConsensusParams);
  }

  /**
   * Retrieves the current consensus state of the node.
   *
   * Returns information about the current consensus round including height,
   * round number, step, and voting progress. This is primarily useful for
   * debugging consensus issues.
   *
   * @returns Promise resolving to current consensus state information
   * @throws Error if the query fails
   *
   * @example
   * ```typescript
   * const state = await client.consensusState();
   * console.log(`Node is at height ${state.roundState.height}, round ${state.roundState.round}`);
   * ```
   */
  public async consensusState(): Promise<responses.ConsensusStateResponse> {
    const query: requests.ConsensusStateRequest = {
      method: requests.Method.ConsensusState,
    };
    return this.doCall(query, Params.encodeConsensusState, Responses.decodeConsensusState);
  }

  /**
   * Disconnects the client from the Tendermint node.
   *
   * Cleans up any active connections and resources. For HTTP clients this is a no-op,
   * but for WebSocket clients this closes the connection.
   *
   * @example
   * ```typescript
   * const client = await Tm2Client.connect("ws://localhost:26657/websocket");
   * // ... use client
   * client.disconnect(); // Close WebSocket connection
   * ```
   */
  public disconnect(): void {
    this.client.disconnect();
  }

  /**
   * Dumps the complete consensus state including peer information.
   *
   * Returns detailed consensus state information including configuration,
   * round state, and the state of connected peers. This is primarily used
   * for debugging consensus-related issues.
   *
   * @returns Promise resolving to complete consensus state dump
   * @throws Error if the query fails
   *
   * @example
   * ```typescript
   * const dump = await client.dumpConsensusState();
   * console.log(`Consensus involves ${dump.peers.length} peers`);
   * ```
   */
  public async dumpConsensusState(): Promise<responses.DumpConsensusStateResponse> {
    const query: requests.DumpConsensusStateRequest = {
      method: requests.Method.DumpConsensusState,
    };
    return this.doCall(query, Params.encodeDumpConsensusState, Responses.decodeDumpConsensusState);
  }

  /**
   * Retrieves the genesis document for the blockchain.
   *
   * Returns the complete genesis configuration including initial validators,
   * consensus parameters, chain ID, and initial application state.
   *
   * @returns Promise resolving to genesis document with chain configuration
   * @throws Error if the query fails
   *
   * @example
   * ```typescript
   * const genesis = await client.genesis();
   * console.log(`Chain ID: ${genesis.chainId}`);
   * console.log(`Genesis time: ${genesis.genesisTime}`);
   * ```
   */
  public async genesis(): Promise<responses.GenesisResponse> {
    const query: requests.GenesisRequest = {
      method: requests.Method.Genesis,
    };
    return this.doCall(query, Params.encodeGenesis, Responses.decodeGenesis);
  }

  /**
   * Performs a health check on the node.
   *
   * Returns null if the node is healthy and responding to requests.
   * This is a lightweight way to check if the node is operational.
   *
   * @returns Promise resolving to null if healthy
   * @throws Error if the node is unhealthy or unreachable
   *
   * @example
   * ```typescript
   * try {
   *   await client.health();
   *   console.log("Node is healthy");
   * } catch (error) {
   *   console.log("Node is unhealthy:", error.message);
   * }
   * ```
   */
  public async health(): Promise<responses.HealthResponse> {
    const query: requests.HealthRequest = {
      method: requests.Method.Health,
    };
    return this.doCall(query, Params.encodeHealth, Responses.decodeHealth);
  }

  /**
   * Retrieves network information and peer details.
   *
   * Returns information about the node's network connections including
   * the number of peers, listening status, and detailed peer information.
   *
   * @returns Promise resolving to network info with peer details
   * @throws Error if the query fails
   *
   * @example
   * ```typescript
   * const netInfo = await client.netInfo();
   * console.log(`Connected to ${netInfo.nPeers} peers`);
   * console.log(`Listening: ${netInfo.listening}`);
   * ```
   */
  public async netInfo(): Promise<responses.NetInfoResponse> {
    const query: requests.NetInfoRequest = {
      method: requests.Method.NetInfo,
    };
    return this.doCall(query, Params.encodeNetInfo, Responses.decodeNetInfo);
  }

  /**
   * Retrieves the number of unconfirmed transactions in the mempool.
   *
   * Returns just the count of transactions waiting to be included in a block,
   * without the transaction data itself. This is more efficient than unconfirmedTxs()
   * when you only need the count.
   *
   * @returns Promise resolving to unconfirmed transaction count and totals
   * @throws Error if the query fails
   *
   * @example
   * ```typescript
   * const info = await client.numUnconfirmedTxs();
   * console.log(`${info.nTxs} transactions waiting in mempool`);
   * ```
   */
  public async numUnconfirmedTxs(): Promise<responses.UnconfirmedTxsResponse> {
    const query: requests.NumUnconfirmedTxsRequest = {
      method: requests.Method.NumUnconfirmedTxs,
    };
    return this.doCall(query, Params.encodeNumUnconfirmedTxs, Responses.decodeUnconfirmedTxs);
  }

  /**
   * Retrieves the current status of the Tendermint node.
   *
   * Returns comprehensive status information including node info, sync status,
   * and validator information. This is one of the most commonly used methods
   * for getting an overview of the node's current state.
   *
   * @returns Promise resolving to complete node status information
   * @throws Error if the query fails
   *
   * @example
   * ```typescript
   * const status = await client.status();
   * console.log(`Node version: ${status.nodeInfo.version}`);
   * console.log(`Latest block: ${status.syncInfo.latestBlockHeight}`);
   * console.log(`Catching up: ${status.syncInfo.catchingUp}`);
   * ```
   */
  public async status(params?: requests.StatusParams): Promise<responses.StatusResponse> {
    const query: requests.StatusRequest = {
      method: requests.Method.Status,
      params,
    };
    return this.doCall(query, Params.encodeStatus, Responses.decodeStatus);
  }

  /**
   * Get a single transaction by hash
   *
   * @see https://docs.tendermint.com/master/rpc/#/Info/tx
   */
  public async tx(params: requests.TxParams): Promise<responses.TxResponse> {
    const query: requests.TxRequest = {
      params: params,
      method: requests.Method.Tx,
    };
    return this.doCall(query, Params.encodeTx, Responses.decodeTx);
  }

  /**
   * Retrieves unconfirmed transactions from the mempool.
   *
   * Returns both the count and the actual transaction data for transactions
   * waiting to be included in a block. Use numUnconfirmedTxs() if you only
   * need the count.
   *
   * @param limit - Maximum number of transactions to return
   * @returns Promise resolving to unconfirmed transactions and metadata
   * @throws Error if the query fails
   *
   * @example
   * ```typescript
   * const txs = await client.unconfirmedTxs(10);
   * console.log(`Retrieved ${txs.txs.length} of ${txs.total} pending transactions`);
   * ```
   */
  public async unconfirmedTxs(limit: number): Promise<responses.UnconfirmedTxsResponse> {
    const query: requests.UnconfirmedTxsRequest = {
      method: requests.Method.UnconfirmedTxs,
      params: {
        limit,
      },
    };
    return this.doCall(query, Params.encodeUnconfirmedTxs, Responses.decodeUnconfirmedTxs);
  }

  /**
   * Retrieves the validator set at the specified height.
   *
   * Returns the list of validators including their public keys, voting power,
   * and addresses. This is essential for understanding the current consensus
   * participants.
   *
   * @param params - Parameters including height to query
   * @returns Promise resolving to validator set information
   * @throws Error if the query fails or height doesn't exist
   *
   * @example
   * ```typescript
   * const validators = await client.validators({ height: 100 });
   * console.log(`Validator set has ${validators.validators.length} validators`);
   * const totalPower = validators.validators.reduce((sum, v) => sum + v.votingPower, 0n);
   * console.log(`Total voting power: ${totalPower}`);
   * ```
   */
  public async validators(params: requests.ValidatorsParams): Promise<responses.ValidatorsResponse> {
    const query: requests.ValidatorsRequest = {
      method: requests.Method.Validators,
      params: params,
    };
    return this.doCall(query, Params.encodeValidators, Responses.decodeValidators);
  }

  /**
   * Internal helper method that handles the encode/call/decode logic for all RPC methods.
   *
   * This method provides a consistent pattern for:
   * 1. Encoding typed requests into JSON-RPC format
   * 2. Executing the request via the underlying RPC client
   * 3. Decoding the response back into typed response objects
   *
   * @param request - The typed request object
   * @param encode - Function to encode the request into JSON-RPC format
   * @param decode - Function to decode the JSON-RPC response into typed response
   * @returns Promise resolving to the decoded response
   * @throws Error if encoding, network call, or decoding fails
   */
  private async doCall<T extends requests.Request, U extends responses.Response>(
    request: T,
    encode: Encoder<T>,
    decode: Decoder<U>,
  ): Promise<U> {
    const req = encode(request);
    const result = await this.client.execute(req);
    return decode(result);
  }
}
