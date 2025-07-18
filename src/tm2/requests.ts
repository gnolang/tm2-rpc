/**
 * RPC methods as documented in https://docs.tendermint.com/master/rpc/
 *
 * Enum raw value must match the spelling in the "shell" example call (snake_case)
 */
export enum Method {
  AbciInfo = "abci_info",
  AbciQuery = "abci_query",
  Block = "block",
  BlockResults = "block_results",
  Blockchain = "blockchain",
  BroadcastTxAsync = "broadcast_tx_async",
  BroadcastTxSync = "broadcast_tx_sync",
  BroadcastTxCommit = "broadcast_tx_commit",
  Commit = "commit",
  ConsensusParams = "consensus_params",
  ConsensusState = "consensus_state",
  DumpConsensusState = "dump_consensus_state",
  Genesis = "genesis",
  Health = "health",
  NetInfo = "net_info",
  NumUnconfirmedTxs = "num_unconfirmed_txs",
  Status = "status",
  Tx = "tx",
  UnconfirmedTxs = "unconfirmed_txs",
  UnsafeFlushMempool = "unsafe_flush_mempool",
  UnsafeStartCpuProfiler = "unsafe_start_cpu_profiler",
  UnsafeStopCpuProfiler = "unsafe_stop_cpu_profiler",
  UnsafeWriteHeapProfile = "unsafe_write_heap_profile",
  Validators = "validators",
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
    | UnsafeFlushMempoolRequest
    | UnsafeStartCpuProfilerRequest
    | UnsafeStopCpuProfilerRequest
    | UnsafeWriteHeapProfileRequest
    | ValidatorsRequest;

export interface AbciInfoRequest {
  readonly method: Method.AbciInfo
}

export interface AbciQueryRequest {
  readonly method: Method.AbciQuery
  readonly params: AbciQueryParams
}

export interface AbciQueryParams {
  readonly path: string
  readonly data: Uint8Array
  readonly height?: number
  /**
   * A flag that defines if proofs are included in the response or not.
   *
   * Internally this is mapped to the old inverse name `trusted` for Tendermint < 0.26.
   * Starting with Tendermint 0.26, the default value changed from true to false.
   */
  readonly prove?: boolean
}

export interface BlockRequest {
  readonly method: Method.Block
  readonly params: {
    readonly height?: number
  }
}

export interface BlockchainRequest {
  readonly method: Method.Blockchain
  readonly params: BlockchainRequestParams
}

export interface BlockchainRequestParams {
  readonly minHeight?: number
  readonly maxHeight?: number
}

export interface BlockResultsRequest {
  readonly method: Method.BlockResults
  readonly params: {
    readonly height?: number
  }
}

export interface BroadcastTxRequest {
  readonly method: Method.BroadcastTxAsync | Method.BroadcastTxSync | Method.BroadcastTxCommit
  readonly params: BroadcastTxParams
}

export interface BroadcastTxParams {
  readonly tx: Uint8Array
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
export interface NetInfoRequest {
  readonly method: Method.NetInfo
}
export interface NumUnconfirmedTxsRequest {
  readonly method: Method.NumUnconfirmedTxs
}

export interface StatusRequest {
  readonly method: Method.Status
}
export interface QueryTag {
  readonly key: string
  readonly value: string
}

export interface TxRequest {
  readonly method: Method.Tx
  readonly params: TxParams
}

export interface TxParams {
  readonly hash: Uint8Array
  readonly prove?: boolean
}
export interface UnconfirmedTxsRequest {
  readonly method: Method.UnconfirmedTxs
  readonly params: {
    readonly limit?: number
  }
}
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
export interface ValidatorsRequest {
  readonly method: Method.Validators
  readonly params: ValidatorsParams
}

export interface ValidatorsParams {
  readonly height?: number
  readonly page?: number
  readonly per_page?: number
}

export interface BuildQueryComponents {
  readonly tags?: readonly QueryTag[]
  readonly raw?: string
}

export function buildQuery(components: BuildQueryComponents): string {
  const tags = components.tags ? components.tags : [];
  const tagComponents = tags.map(tag => `${tag.key}='${tag.value}'`);
  const rawComponents = components.raw ? [components.raw] : [];

  return [...tagComponents, ...rawComponents].join(" AND ");
}
