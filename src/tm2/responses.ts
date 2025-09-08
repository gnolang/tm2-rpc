import {
  ReadonlyDate,
} from "readonly-date";

import {
  ReadonlyDateWithNanoseconds,
} from "../dates";
import {
  Duration,
  ValidatorPubkey,
} from "../types";

export type Response
  = | AbciInfoResponse
    | AbciQueryResponse
    | BlockResponse
    | BlockResultsResponse
    | BlockchainResponse
    | BroadcastTxAsyncResponse
    | BroadcastTxSyncResponse
    | BroadcastTxCommitResponse
    | CommitResponse
    | ConsensusParamsResponse
    | ConsensusStateResponse
    | DumpConsensusStateResponse
    | GenesisResponse
    | HealthResponse
    | NetInfoResponse
    | StatusResponse
    | TxResponse
    | UnconfirmedTxsResponse
    /* TODO: Verify if we need these in a js client
    | UnsafeFlushMempoolResponse
    | UnsafeStartCpuProfilerResponse
    | UnsafeStopCpuProfilerResponse
    | UnsafeWriteHeapProfileResponse
    */
    | ValidatorsResponse;

export interface AbciInfoResponse {
  readonly data?: string
  readonly lastBlockHeight?: number
  readonly lastBlockAppHash?: Uint8Array
}

export interface ProofOp {
  readonly type: string
  readonly key: Uint8Array
  readonly data: Uint8Array
}

export interface QueryProof {
  readonly ops: readonly ProofOp[]
}

export interface AbciQueryResponse {
  readonly responseBase: ResponseBase
  readonly key: Uint8Array
  readonly value: Uint8Array
  readonly proof?: QueryProof
  readonly height?: number
}

export interface BlockResponse {
  readonly blockMeta: BlockMeta
  readonly block: Block
}
export interface TxResult {
  readonly responseBase: ResponseBase
  readonly gasWanted: bigint
  readonly gasUsed: bigint
}
export interface BeginBlock {
  readonly responseBase: ResponseBase
}
export interface EndBlock {
  readonly responseBase: ResponseBase
  readonly validatorUpdates: null
  readonly consensusParams: null
  readonly events: null
}
export interface BlockResultsResponse {
  readonly height: number
  readonly results: {
    deliverTx: readonly TxResult[]
    beginBlock: BeginBlock
    endBlock: EndBlock
  }
}

export interface BlockchainResponse {
  readonly lastHeight: number
  readonly blockMetas: readonly BlockMeta[]
}

/**
 * No transaction data in here because RPC method BroadcastTxAsync "returns right away, with no response"
 */
export interface BroadcastTxAsyncResponse {
  readonly hash: Uint8Array
}

export interface BroadcastTxSyncResponse extends TxData {
  readonly hash: Uint8Array
}

/**
 * Returns true iff transaction made it successfully into the transaction pool
 */
export function broadcastTxSyncSuccess(res: BroadcastTxSyncResponse): boolean {
  // code must be 0 on success
  return res.responseBase.error === null;
}

export interface BroadcastTxCommitResponse {
  readonly height: number
  readonly hash: Uint8Array
  readonly checkTx: TxData
  readonly deliverTx?: TxData
}

/**
 * Returns true iff transaction made it successfully into a block
 * (i.e. success in `check_tx` and `deliver_tx` field)
 */
export function broadcastTxCommitSuccess(response: BroadcastTxCommitResponse): boolean {
  // code must be 0 on success
  // deliverTx may be present but empty on failure
  return response.checkTx.responseBase.error === null && !!response.deliverTx && response.deliverTx.responseBase.error === null;
}

export interface CommitResponse {
  readonly header: Header
  readonly commit: Commit
  readonly canonical: boolean
}
export interface ConsensusParamsResponse {
  readonly blockHeight: number
  readonly consensusParams: ConsensusParams
}
export interface SimpleRoundState {
  readonly height: number
  readonly round: number
  readonly step: number
  readonly startTime: ReadonlyDateWithNanoseconds
  readonly proposalBlockHash: Uint8Array
  readonly lockedBlockHash: Uint8Array
  readonly validBlockHash: Uint8Array
  readonly heightVoteSet: any
}
export interface ValidatorSet {
  readonly validators: readonly Validator[]
  readonly proposer: Validator | null
}
export interface Proposal {
  readonly type: number // 1 for PreVote, 2 for PreCommit
  readonly height: number
  readonly round: number
  readonly polRound: number
  readonly blockId: BlockId
  readonly timestamp: ReadonlyDateWithNanoseconds
  readonly signature: Uint8Array | undefined
}
export interface PartSet {

}
export interface HeightVoteSet {
}
export interface VoteSet {
}
export interface RoundState {
  readonly height: number
  readonly round: number
  readonly step: number
  readonly startTime: ReadonlyDateWithNanoseconds
  readonly commitTime: ReadonlyDateWithNanoseconds
  readonly validators: ValidatorSet
  readonly proposal: Proposal | null
  readonly proposalBlock: Block | null
  readonly proposalBlockParts: PartSet | null
  readonly lockedRound: number
  readonly lockedBlock: Block | null
  readonly lockedBlockParts: PartSet | null
  readonly validRound: number
  readonly validBlock: Block | null
  readonly validBlockParts: null
  readonly votes: HeightVoteSet | null
  readonly commitRound: number
  readonly lastCommit: VoteSet | null
  readonly lastValidators: ValidatorSet | null
  readonly triggeredTimeoutPrecommit: boolean
}
export interface BitArray {
  readonly bits: number
  readonly elems: readonly number[]
}
export interface PartSetHeader {
  readonly total: number
  readonly hash: Uint8Array
}
export interface PeerRoundState {
  readonly height: number
  readonly round: number
  readonly step: number
  readonly startTime: ReadonlyDateWithNanoseconds
  readonly proposal: boolean
  readonly proposalBlockParts: BitArray
  readonly proposalBlockPartsHeader: PartSetHeader | null
  readonly proposalPolRound: number
  readonly proposalPol: BitArray
  readonly prevotes: BitArray
  readonly precommits: BitArray
  readonly lastCommitRound: number
  readonly lastCommit: BitArray
  readonly catchupCommitRound: number
  readonly catchupCommit: BitArray
}
export interface DumpPeerRoundState {
  readonly address: string
  readonly server: string
  readonly port: number
  readonly roundState: PeerRoundState
}
export interface ConsensusStateResponse {
  readonly roundState: SimpleRoundState
}

export interface GenesisResponse {
  readonly genesisTime: ReadonlyDate
  readonly chainId: string
  readonly consensusParams: ConsensusParams
  readonly validators: readonly Validator[]
  readonly appHash: Uint8Array
  readonly appState: Record<string, unknown> | undefined
}

export type HealthResponse = null;

export interface UnconfirmedTxsResponse {
  readonly nTxs: bigint
  readonly total: bigint
  readonly totalBytes: bigint
  readonly txs: readonly Uint8Array[]
}

export interface StatusResponse {
  readonly nodeInfo: NodeInfo
  readonly syncInfo: SyncInfo
  readonly validatorInfo: Validator
}

/**
 * A transaction from RPC calls like search.
 *
 * Try to keep this compatible to TxEvent
 */
export interface TxResponse {
  readonly tx: Uint8Array
  readonly hash: Uint8Array
  readonly height: number
  readonly index: number
  readonly result: TxData
}

export interface TxSearchResponse {
  readonly txs: readonly TxResponse[]
  readonly totalCount: number
}

export interface ValidatorsResponse {
  readonly blockHeight: number
  readonly validators: readonly Validator[]
}

export interface ResponseBase {
  readonly error: string | null
  readonly data: Uint8Array
  readonly events: readonly Event[]
  readonly log: string
  readonly info: string
}
// Events

export interface TxEvent {
  readonly tx: Uint8Array
  readonly hash: Uint8Array
  readonly height: number
  readonly result: TxData
}

// Helper items used above

/**
 * An event attribute.
 *
 * In 0.35 the type of key and value was changed
 * from bytes to string, such that no base64 encoding is used anymore.
 */
export interface EventAttribute {
  readonly key: string
  readonly value: string
}

export interface Event {
  readonly "@type": string
  readonly type: string
  readonly pkg_path: string
  readonly attrs: readonly EventAttribute[]
}

export interface TxData {
  readonly responseBase: ResponseBase
  readonly gasWanted: bigint
  readonly gasUsed: bigint
}

export interface TxProof {
  readonly data: Uint8Array
  readonly rootHash: Uint8Array
  readonly proof: {
    readonly total: number
    readonly index: number
    readonly leafHash: Uint8Array
    readonly aunts: readonly Uint8Array[]
  }
}

export interface BlockMeta {
  readonly blockId: BlockId
  readonly header: Header
}

export interface BlockId {
  readonly hash: Uint8Array
  readonly parts: {
    readonly total: number
    readonly hash: Uint8Array
  }
}

export interface Block {
  readonly header: Header
  /**
   * For the block at height 1, last commit is not set.
   */
  readonly lastCommit: Commit | null
  readonly txs: readonly Uint8Array[]
  readonly evidence: readonly Evidence[]
}

/**
 * We lost track on how the evidence structure actually looks like.
 * This is any now and passed to the caller untouched.
 *
 * See also https://github.com/cosmos/cosmjs/issues/980.
 */
export type Evidence = any;

export interface Commit {
  readonly blockId: BlockId
  readonly precommits: readonly (Vote | null)[]
}

/**
 * raw values from https://github.com/tendermint/tendermint/blob/dfa9a9a30a666132425b29454e90a472aa579a48/types/vote.go#L44
 */
export enum VoteType {
  PreVote = 1,
  PreCommit = 2,
}

export interface Vote {
  readonly type: VoteType
  readonly validatorAddress: Uint8Array
  readonly validatorIndex: number
  readonly height: number
  readonly round: number
  readonly timestamp: ReadonlyDate
  readonly blockId: BlockId
  readonly signature: Uint8Array
}

// https://github.com/tendermint/tendermint/blob/v0.31.8/docs/spec/blockchain/blockchain.md
export interface Header {
  // basic block info
  readonly version: string
  readonly chainId: string
  readonly height: number
  readonly time: ReadonlyDateWithNanoseconds

  /**
   * Block ID of the previous block. This can be `null` when the currect block is height 1.
   */
  readonly lastBlockId: BlockId | null

  /**
   * Hashes of block data.
   *
   * This is `sha256("")` for height 1 🤷‍
   */
  readonly lastCommitHash: Uint8Array
  /**
   * This is `sha256("")` as long as there is no data 🤷‍
   */
  readonly dataHash: Uint8Array

  // hashes from the app output from the prev block
  readonly validatorsHash: Uint8Array
  readonly nextValidatorsHash: Uint8Array
  readonly consensusHash: Uint8Array
  /**
   * This can be an empty string for height 1 and turn into "0000000000000000" later on 🤷‍
   */
  readonly appHash: Uint8Array
  /**
   * This is `sha256("")` as long as there is no data 🤷‍
   */
  readonly lastResultsHash: Uint8Array

  // consensus info
  /**
   * This is `sha256("")` as long as there is no data 🤷‍
   */
  readonly proposerAddress: Uint8Array
}
export interface VersionInfo {
  readonly name: string
  readonly version: string
  readonly optional: boolean
}
export interface NodeInfo {
  /** IP and port */
  readonly listenAddr: string
  readonly network: string
  readonly version: string
  readonly software: string
  readonly channels: number[] // ???
  readonly moniker: string
  readonly other: Map<string, string>
  readonly versionSet: VersionInfo[]
}

export interface SyncInfo {
  readonly earliestAppHash?: Uint8Array
  readonly earliestBlockHash?: Uint8Array
  readonly earliestBlockHeight?: number
  readonly earliestBlockTime?: ReadonlyDate
  readonly latestBlockHash: Uint8Array
  readonly latestAppHash: Uint8Array
  readonly latestBlockHeight: number
  readonly latestBlockTime: ReadonlyDate
  readonly catchingUp: boolean
}

export interface Validator {
  readonly address: Uint8Array
  readonly pubkey?: ValidatorPubkey
  readonly votingPower: bigint
  readonly name?: string
  readonly proposerPriority?: bigint
}

export interface ValidatorUpdate {
  readonly pubkey: ValidatorPubkey
  readonly votingPower: bigint
}

export interface ConsensusParams {
  readonly block: BlockParams
  readonly validator: ValidatorParams
}

export interface ValidatorParams {
  readonly pubKeyTypeUrls: readonly string[]
}

export interface BlockParams {
  readonly maxDataBytes: number
  readonly maxTxBytes: number
  readonly maxBlockBytes: number
  readonly maxGas: number
  readonly timeIotaMs: number
}

export interface TxSizeParams {
  readonly maxBytes: number
  readonly maxGas: number
}

export interface BlockGossipParams {
  readonly blockPartSizeBytes: number
}

export interface EvidenceParams {
  readonly maxAgeNumBlocks: number
  readonly maxAgeDuration: number
}
export interface RemoteSignerConfig {
  readonly serverAddress: string
  readonly dialMaxRetries: number
  readonly dialRetryInterval: number
  readonly dialTimeout: number
  readonly requestTimeout: number
  readonly authorizedKeys: readonly string[]
  readonly keepAlivePeriod: number
}
export interface PrivValidatorConfig {
  home: string
  signState: string
  localSigner: string
  remoteSigner: RemoteSignerConfig | null
}
export interface ConsensusConfig {
  home: string
  walFile: string
  privValidator: PrivValidatorConfig
}

export interface DumpConsensusStateResponse {
  config: ConsensusConfig
  roundState: RoundState
  peers: DumpPeerRoundState[]
}
export interface FlowStatus {
  active: boolean
  start: ReadonlyDateWithNanoseconds
  duration: Duration
  idle: Duration
  bytes: bigint
  samples: bigint
  instRate: bigint
  curRate: bigint
  avgRate: bigint
  peakRate: bigint
  bytesRem: bigint
  timeRem: Duration
  progress: number
}
export interface ChannelStatus {
  id: number
  sendQueueCapacity: number
  sendQueueSize: number
  priority: number
  recentlySent: bigint
}
export interface ConnectionStatus {
  duration: Duration
  sendMonitor: FlowStatus
  recvMonitor: FlowStatus
  channels: ChannelStatus[]
}
export interface Peer {
  nodeInfo: NodeInfo
  isOutbound: boolean
  connectionStatus: ConnectionStatus
  remoteIp: string
}
export interface NetInfoResponse {
  listening: boolean
  listeners: string[]
  nPeers: number
  peers: Peer[]
}
