/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ReadonlyDate,
} from "readonly-date";

import {
  ReadonlyDateWithNanoseconds,
} from "../dates.js";
import {
  Duration,
  ValidatorPubkey,
} from "../types.js";

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

/**
 * Response from the ABCI info query.
 *
 * Contains information about the application including the latest block
 * height the application has processed and the corresponding app hash.
 */
export interface AbciInfoResponse {
  /** Application-specific data returned by the ABCI app */
  readonly responseBase: ResponseBase
  readonly abciVersion: string
  readonly appVersion: string
  readonly lastBlockHeight: bigint
  readonly lastBlockAppHash: Uint8Array
}

/**
 * Response from an ABCI query.
 *
 * Contains the queried data along with optional proof information.
 * The key and value are the raw bytes returned by the application.
 */
export interface AbciQueryResponse {
  /** Base response information including error status and events */
  readonly responseBase: ResponseBase
  /** The key that was queried (may be different from requested key) */
  readonly key: Uint8Array
  /** The value associated with the key */
  readonly value: Uint8Array
  /** Merkle proof of the key-value pair (if requested) */
  readonly proof?: QueryProof
  /** Block height at which the query was executed */
  readonly height?: number
}

/**
 * ABCI BeginBlock response data.
 *
 * Contains the response from the application's BeginBlock method,
 * including any events and gas information.
 */
export interface BeginBlock {
  readonly responseBase: ResponseBase
}

/**
 * Represents a bit array used in consensus voting.
 *
 * Used to track which validators have voted in a particular round.
 */
export interface BitArray {
  readonly bits: bigint
  readonly elems: readonly bigint[]
}

/**
 * A complete block including header, transactions, and evidence.
 *
 * Represents a finalized block in the blockchain containing all
 * transactions and their execution results.
 */
export interface Block {
  /** Block header with metadata and hash information */
  readonly header: Header
  /**
   * Commit information from the previous block.
   * For the block at height 1 (genesis), last commit is not set.
   */
  readonly lastCommit: Commit | null
  /** Raw transaction bytes included in this block */
  readonly txs: readonly Uint8Array[]
  /** Evidence of validator misbehavior (usually empty) */
  readonly evidence: readonly Evidence[]
}

/**
 * Parameters controlling block gossip behavior.
 */
export interface BlockGossipParams {
  readonly blockPartSizeBytes: number
}

/**
 * Unique identifier for a block.
 *
 * Contains the block hash and information about the block's part set.
 */
export interface BlockId {
  readonly hash: Uint8Array
  readonly parts: PartSetHeader
}

/**
 * Metadata about a block without the full transaction data.
 *
 * Contains the block ID and header information for efficient block queries.
 */
export interface BlockMeta {
  readonly blockId: BlockId
  readonly header: Header
}

/**
 * Consensus parameters related to block size and gas limits.
 */
export interface BlockParams {
  readonly maxDataBytes: number
  readonly maxTxBytes: number
  readonly maxBlockBytes: number
  readonly maxGas: number
  readonly timeIotaMs: number
}

/**
 * Response containing a complete block with metadata.
 *
 * This is returned by the block RPC method and includes both
 * the block data and additional metadata about the block.
 */
export interface BlockResponse {
  /** Metadata about the block including size and transaction count */
  readonly blockMeta: BlockMeta
  /** The complete block data */
  readonly block: Block
}

/**
 * Response containing the results of executing all transactions in a block.
 *
 * Includes transaction execution results, validator updates, and consensus events.
 */
export interface BlockResultsResponse {
  readonly height: number
  readonly results: {
    deliverTx: readonly TxResult[]
    beginBlock: BeginBlock
    endBlock: EndBlock
  }
}

/**
 * Response containing a range of block metadata.
 *
 * Used for blockchain queries that return multiple block headers.
 */
export interface BlockchainResponse {
  readonly lastHeight: number
  readonly blockMetas: readonly BlockMeta[]
}

/**
 * Response from broadcasting a transaction asynchronously.
 *
 * The async broadcast method returns immediately without waiting for the
 * transaction to be included in a block or even validated. Only the
 * transaction hash is returned.
 */
export interface BroadcastTxAsyncResponse {
  /** Hash of the submitted transaction */
  readonly hash: Uint8Array
}

/**
 * Response from broadcasting a transaction and waiting for it to be committed.
 *
 * This is the most complete broadcast response, containing the results of both
 * the mempool check and the block execution phases.
 */
export interface BroadcastTxCommitResponse {
  /** Height of the block containing the transaction */
  readonly height: number
  /** Hash of the committed transaction */
  readonly hash: Uint8Array
  /** Result of the mempool check (CheckTx) */
  readonly checkTx: TxData
  /** Result of block execution (DeliverTx), undefined if check failed */
  readonly deliverTx?: TxData
}

/**
 * Response from broadcasting a transaction synchronously.
 *
 * Returns after the transaction has been checked by the mempool but before
 * it has been included in a block. Includes the transaction hash and
 * the result of the mempool check.
 */
export interface BroadcastTxSyncResponse extends TxData {
  /** Hash of the submitted transaction */
  readonly hash: Uint8Array
}

/**
 * Status information for a peer-to-peer communication channel.
 *
 * Contains queue sizes, priorities, and recent activity metrics.
 */
export interface ChannelStatus {
  id: number
  sendQueueCapacity: number
  sendQueueSize: number
  priority: number
  recentlySent: bigint
}

/**
 * Commit information containing validator signatures for a block.
 *
 * Includes the block ID and precommit votes from validators.
 */
export interface Commit {
  readonly blockId: BlockId
  readonly precommits: readonly (Vote | null)[]
}

/**
 * Response containing commit information for a specific block.
 *
 * Includes the block header, commit signatures, and canonical status.
 */
export interface CommitResponse {
  readonly header: Header
  readonly commit: Commit
  readonly canonical: boolean
}

/**
 * Status information for a peer connection.
 *
 * Contains connection duration, traffic monitoring, and channel information.
 */
export interface ConnectionStatus {
  duration: Duration
  sendMonitor: FlowStatus
  recvMonitor: FlowStatus
  channels: ChannelStatus[]
}

/**
 * Configuration settings for the consensus algorithm.
 *
 * Contains file paths and validator configuration used by the consensus engine.
 */
export interface ConsensusConfig {
  home: string
  walFile: string
  privValidator: PrivValidatorConfig
}

/**
 * Consensus parameters that govern blockchain behavior.
 *
 * Contains block size limits, validator constraints, and evidence rules.
 */
export interface ConsensusParams {
  readonly block: BlockParams
  readonly validator: ValidatorParams
}

/**
 * Response containing consensus parameters for a specific block height.
 */
export interface ConsensusParamsResponse {
  readonly blockHeight: number
  readonly consensusParams: ConsensusParams
}

/**
 * Response containing current consensus state information.
 *
 * Includes the current round state with height, round, and step information.
 */
export interface ConsensusStateResponse {
  readonly roundState: SimpleRoundState
}

/**
 * Response containing a complete dump of consensus state.
 *
 * Used for debugging and includes configuration, round state, and peer states.
 */
export interface DumpConsensusStateResponse {
  config: ConsensusConfig
  roundState: RoundState
  peers: DumpPeerRoundState[]
}

/**
 * Peer's consensus round state from a consensus state dump.
 *
 * Contains the peer's address, connection info, and detailed voting state.
 */
export interface DumpPeerRoundState {
  readonly address: string
  readonly server: string
  readonly port: number
  readonly roundState: PeerRoundState
}

/**
 * ABCI EndBlock response data.
 *
 * Contains the response from the application's EndBlock method,
 * including validator updates and consensus parameter changes.
 */
export interface EndBlock {
  readonly responseBase: ResponseBase
  readonly validatorUpdates: null
  readonly consensusParams: null
  readonly events: null
}

/**
 * We lost track on how the evidence structure actually looks like.
 * This is any now and passed to the caller untouched.
 *
 * See also https://github.com/cosmos/cosmjs/issues/980.
 */
export type Evidence = any;

/**
 * Event data from transaction or block execution.
 *
 * Contains event type and key-value attributes for application-specific events.
 */
export interface Event {
  readonly "@type": string
  readonly type: string
  readonly pkg_path: string
  readonly attrs: readonly EventAttribute[]
}

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

/**
 * Parameters governing evidence handling for byzantine behavior.
 *
 * Controls how long evidence is considered valid and stored.
 */
export interface EvidenceParams {
  readonly maxAgeNumBlocks: number
  readonly maxAgeDuration: number
}

/**
 * Flow status information for network connections.
 *
 * Contains bandwidth usage, transfer rates, and connection timing metrics.
 */
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

/**
 * Response containing the genesis document of the blockchain.
 *
 * The genesis document defines the initial state and configuration
 * of the blockchain including validators, consensus parameters,
 * and application-specific initial state.
 */
export interface GenesisResponse {
  /** Time when the blockchain was created */
  readonly genesisTime: ReadonlyDate
  /** Unique identifier for this blockchain */
  readonly chainId: string
  /** Initial consensus parameters */
  readonly consensusParams: ConsensusParams
  /** Initial validator set */
  readonly validators: readonly Validator[]
  /** Initial application state hash */
  readonly appHash: Uint8Array
  /** Application-specific genesis state (varies by app) */
  readonly appState: Record<string, unknown> | undefined
}

/**
 * Block header containing all metadata and hash commitments for a block.
 *
 * The header serves as a cryptographic commitment to all block data and
 * links blocks together in the blockchain. Each field is carefully
 * constructed to enable efficient verification.
 *
 * Based on Tendermint spec:
 * https://github.com/tendermint/tendermint/blob/v0.31.8/docs/spec/blockchain/blockchain.md
 */
export interface Header {
  // === Basic Block Information ===
  /** Block format version */
  readonly version: string
  /** Blockchain identifier */
  readonly chainId: string
  /** Block height (sequential block number) */
  readonly height: number
  /** Block creation timestamp with nanosecond precision */
  readonly time: ReadonlyDateWithNanoseconds

  /**
   * Block ID of the previous block.
   * This is null for the genesis block (height 1).
   */
  readonly lastBlockId: BlockId | null

  // === Data Commitment Hashes ===
  /**
   * Hash of the previous block's commit.
   * This is sha256("") for the genesis block.
   */
  readonly lastCommitHash: Uint8Array
  /**
   * Hash of transaction data in this block.
   * This is sha256("") when there are no transactions.
   */
  readonly dataHash: Uint8Array

  // === Validator Set Hashes ===
  /** Hash of the current validator set */
  readonly validatorsHash: Uint8Array
  /** Hash of the next validator set */
  readonly nextValidatorsHash: Uint8Array
  /** Hash of consensus parameters */
  readonly consensusHash: Uint8Array
  /**
   * Hash of the application state after the previous block.
   * May be empty for genesis block.
   */
  readonly appHash: Uint8Array
  /**
   * Hash of transaction execution results from the previous block.
   * This is sha256("") when there were no transactions.
   */
  readonly lastResultsHash: Uint8Array

  // === Consensus Information ===
  /**
   * Address of the validator that proposed this block.
   * Derived from the validator's public key.
   */
  readonly proposerAddress: Uint8Array
}

export type HealthResponse = null;

/**
 * Vote set for a specific block height (placeholder interface).
 *
 * Used in consensus state tracking but currently empty.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface HeightVoteSet {
}

/**
 * Response containing network information.
 *
 * Includes listening status, peer count, and detailed peer information.
 */
export interface NetInfoResponse {
  listening: boolean
  listeners: string[]
  nPeers: number
  peers: Peer[]
}

/**
 * Information about a Tendermint node.
 *
 * Contains node version, network details, and supported features.
 */
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

/**
 * Part set information (placeholder interface).
 *
 * Used for block part tracking but currently empty.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PartSet {

}

/**
 * Header information for a block part set.
 *
 * Contains the total number of parts and the hash of the complete set.
 */
export interface PartSetHeader {
  readonly total: bigint
  readonly hash: Uint8Array
}

/**
 * Information about a connected peer.
 *
 * Contains peer node info, connection status, and network details.
 */
export interface Peer {
  nodeInfo: NodeInfo
  isOutbound: boolean
  connectionStatus: ConnectionStatus
  remoteIp: string
}

/**
 * Detailed consensus state information for a peer.
 *
 * Contains the peer's current voting state, proposals, and consensus progress.
 */
export interface PeerRoundState {
  readonly height: number
  readonly round: number
  readonly step: number
  readonly startTime: ReadonlyDateWithNanoseconds
  readonly proposal: boolean
  readonly proposalBlockParts: BitArray | null
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

/**
 * Configuration for a private validator.
 *
 * Contains paths to validator files and remote signer configuration.
 */
export interface PrivValidatorConfig {
  home: string
  signState: string
  localSigner: string
  remoteSigner: RemoteSignerConfig | null
}

/**
 * A single operation in a Merkle proof.
 *
 * Contains the operation type, key, and data needed for proof verification.
 */
export interface ProofOp {
  readonly type: string
  readonly key: Uint8Array
  readonly data: Uint8Array
}

/**
 * Consensus proposal for a new block.
 *
 * Contains proposal details including block ID, timestamp, and signature.
 */
export interface Proposal {
  readonly type: number // 1 for PreVote, 2 for PreCommit
  readonly height: number
  readonly round: number
  readonly polRound: number
  readonly blockId: BlockId
  readonly timestamp: ReadonlyDateWithNanoseconds
  readonly signature: Uint8Array | undefined
}

/**
 * Merkle proof for ABCI query results.
 *
 * Contains the series of operations needed to verify a query result.
 */
export interface QueryProof {
  readonly ops: readonly ProofOp[]
}

/**
 * Configuration for remote validator signing.
 *
 * Contains connection settings and security parameters for remote signers.
 */
export interface RemoteSignerConfig {
  readonly serverAddress: string
  readonly dialMaxRetries: number
  readonly dialRetryInterval: number
  readonly dialTimeout: number
  readonly requestTimeout: number
  readonly authorizedKeys: readonly string[]
  readonly keepAlivePeriod: number
}

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

/**
 * Base response structure for ABCI operations.
 *
 * Contains error information, data, events, and logs common to all ABCI responses.
 */
export interface ResponseBase {
  readonly error: {
    readonly "@type": string
    readonly value: string
  }
  readonly data: Uint8Array
  readonly events: readonly Event[]
  readonly log: string
  readonly info: string
}

/**
 * Complete consensus round state information.
 *
 * Contains detailed consensus progress including proposals, votes, and validator states.
 */
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

/**
 * Simplified consensus round state representation.
 *
 * Contains basic consensus progress information in a compact format.
 */
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

/**
 * Complete status information about a Tendermint node.
 *
 * This is one of the most commonly used responses, providing a comprehensive
 * overview of the node's current state including version, sync status,
 * and validator information.
 */
export interface StatusResponse {
  /** Information about the node software and network */
  readonly nodeInfo: NodeInfo
  /** Current synchronization status and latest block info */
  readonly syncInfo: SyncInfo
  /** Validator information (empty if not a validator) */
  readonly validatorInfo: Validator
}

/**
 * Node synchronization status information.
 *
 * Contains the latest block information and whether the node is catching up.
 */
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

/**
 * Transaction execution data and gas usage information.
 *
 * Contains the base response data plus gas wanted and used amounts.
 */
export interface TxData {
  readonly responseBase: ResponseBase
  readonly gasWanted: bigint
  readonly gasUsed: bigint
}

/**
 * Transaction event from WebSocket subscriptions.
 *
 * Contains the transaction data, hash, and execution results.
 */
export interface TxEvent {
  readonly tx: Uint8Array
  readonly hash: Uint8Array
  readonly height: number
  readonly result: TxData
}

/**
 * Merkle proof for transaction inclusion in a block.
 *
 * Contains the transaction data, root hash, and proof information.
 */
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

/**
 * A transaction from RPC calls like search.
 *
 * Try to keep this compatible to TxEvent
 */
/**
 * Response containing transaction data and execution results.
 *
 * Returned by transaction queries and searches, this includes both
 * the raw transaction data and the results of its execution.
 */
export interface TxResponse {
  /** Raw transaction bytes */
  readonly tx: Uint8Array
  /** Transaction hash (usually SHA-256 of tx bytes) */
  readonly hash: Uint8Array
  /** Block height where this transaction was included */
  readonly height: number
  /** Index of this transaction within the block */
  readonly index: number
  /** Execution results including gas usage and events */
  readonly result: TxData
}

/**
 * Transaction execution result.
 *
 * Contains gas usage and execution status for a single transaction.
 */
export interface TxResult {
  readonly responseBase: ResponseBase
  readonly gasWanted: bigint
  readonly gasUsed: bigint
}

/**
 * Response from transaction search queries.
 *
 * Contains matching transactions and total count for pagination.
 */
export interface TxSearchResponse {
  readonly txs: readonly TxResponse[]
  readonly totalCount: number
}

/**
 * Parameters controlling transaction size limits.
 */
export interface TxSizeParams {
  readonly maxBytes: number
  readonly maxGas: number
}

/**
 * Response containing unconfirmed transactions from the mempool.
 *
 * Includes transaction count, total size, and the raw transaction data.
 */
export interface UnconfirmedTxsResponse {
  readonly nTxs: bigint
  readonly total: bigint
  readonly totalBytes: bigint
  readonly txs: readonly Uint8Array[]
}

/**
 * Validator information including identity and voting power.
 *
 * Contains the validator's address, public key, and consensus weight.
 */
export interface Validator {
  readonly address: Uint8Array
  readonly pubkey?: ValidatorPubkey
  readonly votingPower: bigint
  readonly name?: string
  readonly proposerPriority?: bigint
}

/**
 * Parameters governing validator public key types.
 *
 * Specifies which public key algorithms are allowed for validators.
 */
export interface ValidatorParams {
  readonly pubKeyTypeUrls: readonly string[]
}

/**
 * Complete validator set with proposer information.
 *
 * Contains all validators and identifies the current block proposer.
 */
export interface ValidatorSet {
  readonly validators: readonly Validator[]
  readonly proposer: Validator | null
}

/**
 * Response containing the validator set at a specific height.
 *
 * Includes all validators and their voting power at the specified
 * block height.
 */
export interface ValidatorsResponse {
  /** Block height for which these validators are valid */
  readonly blockHeight: number
  /** List of all validators with their voting power and keys */
  readonly validators: readonly Validator[]
}

/**
 * Validator update information from block execution.
 *
 * Contains changes to validator set including power updates.
 */
export interface ValidatorUpdate {
  readonly pubkey: ValidatorPubkey
  readonly votingPower: bigint
}

/**
 * Software version information.
 *
 * Contains component name, version string, and whether it's optional.
 */
export interface VersionInfo {
  readonly name: string
  readonly version: string
  readonly optional: boolean
}

/**
 * Consensus vote from a validator.
 *
 * Contains vote type, validator information, block ID, and signature.
 */
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

/**
 * Vote set information (placeholder interface).
 *
 * Used for tracking consensus votes but currently empty.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface VoteSet {
}

/**
 * raw values from https://github.com/tendermint/tendermint/blob/dfa9a9a30a666132425b29454e90a472aa579a48/types/vote.go#L44
 */
export enum VoteType {
  PreVote = 1,
  PreCommit = 2,
}

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Determines if a broadcast_tx_commit operation was successful.
 *
 * A transaction is considered successful only if both the mempool check (CheckTx)
 * and block execution (DeliverTx) completed without errors. This means the
 * transaction was accepted into the mempool AND successfully executed in a block.
 *
 * @param response - The broadcast_tx_commit response to check
 * @returns true if the transaction was successfully committed to a block
 *
 * @example
 * ```typescript
 * const result = await client.broadcastTxCommit({ tx: txBytes });
 * if (broadcastTxCommitSuccess(result)) {
 *   console.log(`Transaction committed at height ${result.height}`);
 * } else {
 *   console.log('Transaction failed:', result.checkTx.responseBase.error || result.deliverTx?.responseBase.error);
 * }
 * ```
 */
export function broadcastTxCommitSuccess(response: BroadcastTxCommitResponse): boolean {
  // Transaction must pass both CheckTx and DeliverTx phases
  // DeliverTx may be present but empty on failure, so we check for both existence and success
  return response.checkTx.responseBase.error === null && !!response.deliverTx && response.deliverTx.responseBase.error === null;
}

/**
 * Determines if a broadcast_tx_sync operation was successful.
 *
 * A sync broadcast is successful if the transaction passes the mempool check (CheckTx)
 * and is accepted into the transaction pool. This does NOT guarantee the transaction
 * will be included in a block or executed successfully.
 *
 * @param res - The broadcast_tx_sync response to check
 * @returns true if the transaction was accepted into the mempool
 *
 * @example
 * ```typescript
 * const result = await client.broadcastTxSync({ tx: txBytes });
 * if (broadcastTxSyncSuccess(result)) {
 *   console.log(`Transaction ${toHex(result.hash)} accepted into mempool`);
 * } else {
 *   console.log('Transaction rejected:', result.responseBase.error);
 * }
 * ```
 */
export function broadcastTxSyncSuccess(res: BroadcastTxSyncResponse): boolean {
  // Success means no error in the CheckTx phase (mempool acceptance)
  return res.responseBase.error === null;
}
