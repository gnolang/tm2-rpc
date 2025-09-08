// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

/**
 * Request for ABCI application information.
 *
 * This is a parameter-less request that queries basic information
 * about the ABCI application including its current state.
 */
export interface AbciInfoRequest {
  readonly method: Method.AbciInfo
}

/**
 * Parameters for an ABCI query request.
 *
 * ABCI queries allow direct interaction with the application to retrieve
 * custom data. The path and data format are application-specific.
 */
export interface AbciQueryParams {
  /** Application-specific query path (e.g., "/store/bank/key") */
  readonly path: string
  /** Query data bytes (often an encoded key or identifier) */
  readonly data: Uint8Array
  /** Block height at which to execute the query (default: latest) */
  readonly height?: number
  /**
   * Whether to include cryptographic proofs in the response.
   *
   * When true, the response includes Merkle proofs that can be used to
   * verify the query result against the block's app hash.
   *
   * Note: This maps to the inverse "trusted" parameter in older Tendermint versions.
   */
  readonly prove?: boolean
}

/**
 * Request for executing an ABCI query.
 *
 * Combines the query method with the specific parameters for the query.
 */
export interface AbciQueryRequest {
  readonly method: Method.AbciQuery
  readonly params: AbciQueryParams
}

export interface BlockchainRequest {
  readonly method: Method.Blockchain
  readonly params: BlockchainRequestParams
}

export interface BlockchainRequestParams {
  readonly minHeight?: number
  readonly maxHeight?: number
}

export interface BlockRequest {
  readonly method: Method.Block
  readonly params: {
    readonly height?: number
  }
}

export interface BlockResultsRequest {
  readonly method: Method.BlockResults
  readonly params: {
    readonly height?: number
  }
}

/**
 * Parameters for broadcasting a transaction.
 *
 * Contains the raw transaction bytes to be submitted to the network.
 */
export interface BroadcastTxParams {
  /** Raw transaction bytes to broadcast */
  readonly tx: Uint8Array
}

/**
 * Request for broadcasting a transaction.
 *
 * Supports three broadcast modes:
 * - Async: Returns immediately with transaction hash
 * - Sync: Waits for mempool check (CheckTx) result
 * - Commit: Waits for transaction to be included in a block
 */
export interface BroadcastTxRequest {
  readonly method: Method.BroadcastTxAsync | Method.BroadcastTxSync | Method.BroadcastTxCommit
  readonly params: BroadcastTxParams
}

export interface BuildQueryComponents {
  readonly tags?: readonly QueryTag[]
  readonly raw?: string
}

export interface CommitRequest {
  readonly method: Method.Commit
  readonly params: {
    readonly height?: number
  }
}

export interface ConsensusParamsRequest {
  readonly method: Method.ConsensusParams
  readonly params: {
    readonly height?: number
  }
}

export interface ConsensusStateRequest {
  readonly method: Method.ConsensusState
}

export interface DumpConsensusStateRequest {
  readonly method: Method.DumpConsensusState
}

export interface GenesisRequest {
  readonly method: Method.Genesis
}

export interface HealthRequest {
  readonly method: Method.Health
}

/**
 * Enumeration of all supported Tendermint RPC methods.
 *
 * These correspond to the JSON-RPC method names used when communicating
 * with Tendermint nodes. The values must match the exact spelling used
 * in the RPC API (snake_case format).
 *
 * Based on documentation:
 * https://github.com/onbloc/gnoland-tutorials/blob/main/docs/gnoland-rpc-endpoints.md
 */
export enum Method {
  /** Query ABCI application info */
  AbciInfo = "abci_info",
  /** Execute an ABCI query */
  AbciQuery = "abci_query",
  /** Get a specific block by height */
  Block = "block",
  /** Get block execution results */
  BlockResults = "block_results",
  /** Get a range of block headers */
  Blockchain = "blockchain",
  /** Broadcast transaction asynchronously */
  BroadcastTxAsync = "broadcast_tx_async",
  /** Broadcast transaction synchronously */
  BroadcastTxSync = "broadcast_tx_sync",
  /** Broadcast and wait for commit */
  BroadcastTxCommit = "broadcast_tx_commit",
  /** Get commit information for a block */
  Commit = "commit",
  /** Get consensus parameters */
  ConsensusParams = "consensus_params",
  /** Get current consensus state */
  ConsensusState = "consensus_state",
  /** Dump complete consensus state */
  DumpConsensusState = "dump_consensus_state",
  /** Get genesis document */
  Genesis = "genesis",
  /** Check node health */
  Health = "health",
  /** Get network and peer information */
  NetInfo = "net_info",
  /** Get count of unconfirmed transactions */
  NumUnconfirmedTxs = "num_unconfirmed_txs",
  /** Get node status */
  Status = "status",
  /** Get a specific transaction by hash */
  Tx = "tx",
  /** Get unconfirmed transactions from mempool */
  UnconfirmedTxs = "unconfirmed_txs",
  /* TODO: Verify if we need these in a js client
  UnsafeFlushMempool = "unsafe_flush_mempool",
  UnsafeStartCpuProfiler = "unsafe_start_cpu_profiler",
  UnsafeStopCpuProfiler = "unsafe_stop_cpu_profiler",
  UnsafeWriteHeapProfile = "unsafe_write_heap_profile",
  */
  /** Get validator set */
  Validators = "validators",
}

export interface NetInfoRequest {
  readonly method: Method.NetInfo
}

export interface NumUnconfirmedTxsRequest {
  readonly method: Method.NumUnconfirmedTxs
}

export interface QueryTag {
  readonly key: string
  readonly value: string
}

export type Request
  = | AbciInfoRequest
    | AbciQueryRequest
    | BlockRequest
    | BlockchainRequest
    | BlockResultsRequest
    | BroadcastTxRequest
    | CommitRequest
    | ConsensusStateRequest
    | ConsensusParamsRequest
    | DumpConsensusStateRequest
    | GenesisRequest
    | HealthRequest
    | NetInfoRequest
    | NumUnconfirmedTxsRequest
    | StatusRequest
    | TxRequest
    | UnconfirmedTxsRequest
    /* TODO: Verify if we need these in a js client
    | UnsafeFlushMempoolRequest
    | UnsafeStartCpuProfilerRequest
    | UnsafeStopCpuProfilerRequest
    | UnsafeWriteHeapProfileRequest
    */
    | ValidatorsRequest;

export interface StatusParams {
  readonly heightGte?: number
}
export interface StatusRequest {
  readonly method: Method.Status
  readonly params?: StatusParams
}

/**
 * Parameters for querying a specific transaction.
 */
export interface TxParams {
  /** Hash of the transaction to retrieve */
  readonly hash: Uint8Array
}

export interface TxRequest {
  readonly method: Method.Tx
  readonly params: TxParams
}

export interface UnconfirmedTxsParams {
  readonly limit?: number
}

export interface UnconfirmedTxsRequest {
  readonly method: Method.UnconfirmedTxs
  readonly params: {
    readonly limit?: number
  }
}

/* TODO: Verify if we need these in a js client
export interface UnsafeFlushMempoolRequest {
  readonly method: Method.UnsafeFlushMempool
}
export interface UnsafeStartCpuProfilerRequest {
  readonly method: Method.UnsafeStartCpuProfiler
  readonly params: {
    readonly filename?: string
  }
}
export interface UnsafeStopCpuProfilerRequest {
  readonly method: Method.UnsafeStopCpuProfiler
}
export interface UnsafeWriteHeapProfileRequest {
  readonly method: Method.UnsafeWriteHeapProfile
  readonly params: {
    readonly filename?: string
  }
}
*/

/**
 * Parameters for querying the validator set.
 */
export interface ValidatorsParams {
  /** Block height at which to get the validator set (default: latest) */
  readonly height?: number
}

export interface ValidatorsRequest {
  readonly method: Method.Validators
  readonly params: ValidatorsParams
}

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Builds a query string for event subscription or transaction searching.
 *
 * Combines tag-based filters and raw query strings into a single query
 * that can be used with Tendermint's event system or transaction search.
 *
 * @param components - Query components including tags and raw query strings
 * @returns A formatted query string using AND logic
 *
 * @example
 * ```typescript
 * // Search for transactions with specific attributes
 * const query = buildQuery({
 *   tags: [
 *     { key: "tx.height", value: "100" },
 *     { key: "transfer.sender", value: "alice" }
 *   ],
 *   raw: "tx.gas_used > 1000"
 * });
 * // Result: "tx.height='100' AND transfer.sender='alice' AND tx.gas_used > 1000"
 * ```
 */
export function buildQuery(components: BuildQueryComponents): string {
  const tags = components.tags ? components.tags : [];
  const tagComponents = tags.map(tag => `${tag.key}='${tag.value}'`);
  const rawComponents = components.raw ? [components.raw] : [];

  return [...tagComponents, ...rawComponents].join(" AND ");
}
