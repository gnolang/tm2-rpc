/* eslint-disable max-lines */
import {
  fromAscii,
  fromBase64, fromBech32, fromHex,
} from "@cosmjs/encoding";
import {
  JsonRpcSuccessResponse,
} from "@cosmjs/json-rpc";
import {
  assert,
} from "@cosmjs/utils";

import {
  fromRfc3339WithNanoseconds,
} from "../../dates";
import {
  apiToBigInt, apiToSmallInt,
  durationFromString,
} from "../../inthelpers";
import {
  SubscriptionEvent,
} from "../../rpcclients";
import {
  ValidatorPubkey,
} from "../../types";
import {
  assertArray,
  assertBoolean,
  assertNotEmpty,
  assertNumber,
  assertObject,
  assertSet,
  assertString,
  dictionaryToStringMap,
  may,
} from "../encodings";
import {
  hashTx,
} from "../hasher";
import * as responses from "../responses";

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

/**
 * Result wrapper for ABCI info responses from JSON-RPC
 */
interface AbciInfoResult {
  readonly response: RpcAbciInfoResponse
}

/**
 * Result wrapper for ABCI query responses from JSON-RPC
 */
interface AbciQueryResult {
  readonly response: RpcAbciQueryResponse
}

/**
 * Result wrapper for genesis document responses from JSON-RPC
 */
interface GenesisResult {
  readonly genesis: RpcGenesisResponse
}

/**
 * Raw RPC response structure for ABCI info query
 */
interface RpcAbciInfoResponse {
  readonly data?: string
  readonly last_block_height?: string
  /** base64 encoded */
  readonly last_block_app_hash?: string
}

/**
 * Raw RPC response structure for ABCI queries
 */
interface RpcAbciQueryResponse {
  // TODO: Veify how these are encoded
  readonly Key?: string | null
  /**
   * Base64 encoded
   *
   * This can be null since this is a byte slice and due to
   * https://github.com/tendermint/tendermint/blob/v0.35.7/abci/types/result.go#L53
   */
  readonly Value?: string | null
  readonly Proof?: RpcQueryProof | null
  readonly Height?: string
  readonly ResponseBase: RpcResponseBase
}

/**
 * Raw RPC structure for begin block events
 */
interface RpcBeginBlock {
  ResponseBase: RpcResponseBase
}

/**
 * Raw RPC structure for bit arrays used in consensus
 */
interface RpcBitArray {
  readonly bits: string
  readonly elems: readonly string[]
}
/**
 * Raw RPC structure for block data
 */
interface RpcBlock {
  readonly header: RpcHeader
  readonly last_commit: RpcCommit
  readonly data: {
    /** Raw tx bytes, base64 encoded */
    readonly txs?: readonly string[]
  }
  // It's currently unclear why the deep nesting is requied.
  // See https://github.com/tendermint/tendermint/issues/7697.
  readonly evidence?: {
    readonly evidence?: readonly RpcEvidence[]
  }
}

/**
 * Raw RPC structure for block identifiers
 */
interface RpcBlockId {
  /** hex encoded */
  readonly hash: string
  readonly parts: RpcPartSetHeader
}

/**
 * Raw RPC structure for block metadata
 */
interface RpcBlockMeta {
  readonly block_id: RpcBlockId
  readonly block_size: string
  readonly header: RpcHeader
  readonly num_txs: string
}

/**
 * Raw RPC structure for block consensus parameters
 */
interface RpcBlockParams {
  readonly MaxTxBytes: string
  readonly MaxDataBytes: string
  readonly MaxBlockBytes: string
  readonly MaxGas: string
  readonly TimeIotaMS: string
}

/**
 * Raw RPC response structure for block queries
 */
interface RpcBlockResponse {
  readonly block_meta: RpcBlockMeta
  readonly block: RpcBlock
}

/**
 * Raw RPC response structure for block results queries
 */
interface RpcBlockResultsResponse {
  readonly height: string
  readonly results: {
    readonly deliver_tx: readonly RpcTxResult[]
    readonly begin_block: RpcBeginBlock
    readonly end_block: RpcEndBlock
  }
}

/**
 * Raw RPC response structure for blockchain queries
 */
interface RpcBlockchainResponse {
  readonly last_height: string
  readonly block_metas: readonly RpcBlockMeta[]
}

/**
 * Raw RPC response structure for transaction broadcast with commit
 */
interface RpcBroadcastTxCommitResponse {
  readonly height: string
  /** hex encoded */
  readonly hash: string
  readonly check_tx: RpcTxData
  readonly deliver_tx?: RpcTxData
}

/**
 * Raw RPC response structure for synchronous transaction broadcast
 */
interface RpcBroadcastTxSyncResponse extends RpcTxData {
  /** hex encoded */
  readonly hash: string
}

/**
 * Information about peer-to-peer communication channels
 */
export interface RpcChannelInfo {
  readonly ID: number
  readonly SendQueueCapacity: string
  readonly SendQueueSize: string
  readonly Priority: string
  readonly RecentlySent: string
}

/**
 * Raw RPC structure for commit information
 */
interface RpcCommit {
  readonly block_id: RpcBlockId
  readonly precommits: readonly RpcVote[]
}

/**
 * Raw RPC response structure for commit queries
 */
interface RpcCommitResponse {
  readonly signed_header: {
    readonly header: RpcHeader
    readonly commit: RpcCommit
  }
  readonly canonical: boolean
}

/**
 * Connection status information for peer connections
 */
export interface RpcConnectionStatus {
  readonly Duration: string
  readonly RecvMonitor: RpcMonitorInfo
  readonly SendMonitor: RpcMonitorInfo
  readonly Channels: readonly RpcChannelInfo[]
}

/**
 * Consensus configuration settings
 */
export interface RpcConsensusConfig {
  readonly home: string
  readonly wal_file: string
  readonly priv_validator: RpcPrivValidatorConfig
}

/**
 * Raw RPC structure for consensus parameters
 */
interface RpcConsensusParams {
  readonly Block: RpcBlockParams
  readonly Validator: RpcValidatorParams
}

/**
 * Raw RPC response structure for consensus parameters queries
 */
interface RpcConsensusParamsResponse {
  readonly block_height: string
  readonly consensus_params: RpcConsensusParams
}

/**
 * Raw RPC response structure for consensus state queries
 */
interface RpcConsensusStateResponse {
  readonly round_state: RpcSimpleRoundState
}

/**
 * Raw RPC response structure for full consensus state dump
 */
interface RpcDumpConsensusStateResponse {
  readonly config: RpcConsensusConfig
  readonly round_state: RpcRoundState
  readonly peers: readonly RpcPeerRoundState[]
}

/**
 * Raw RPC structure for end block events
 */
interface RpcEndBlock {
  ResponseBase: RpcResponseBase
  // TOOO: Need to check and fill out the following types
  ValidatorUpdates: null
  ConsensusParams: null
  Events: null
}

/**
 * Event data structure from transaction execution
 */
export interface RpcEvent {
  readonly "@type": string
  readonly type: string
  readonly pkg_path: string
  readonly attrs: readonly RpcEventAttribute[]
}

/**
 * Key-value attribute pairs within events
 */
export interface RpcEventAttribute {
  readonly key: string
  readonly value: string
}

/**
 * Evidence structure for byzantine behavior
 *
 * We lost track on how the evidence structure actually looks like.
 * This is any now and passed to the caller untouched.
 */
type RpcEvidence = any;

/**
 * Raw RPC response structure for genesis document
 */
interface RpcGenesisResponse {
  readonly genesis_time: string
  readonly chain_id: string
  readonly consensus_params: RpcConsensusParams
  // The validators key is used to specify a set of validators for testnets or PoA blockchains.
  // PoS blockchains use the app_state.genutil.gentxs field to stake and bond a number of validators in the first block.
  readonly validators?: readonly RpcValidatorGenesis[]
  /** hex encoded */
  readonly app_hash: string
  readonly app_state: Record<string, unknown> | undefined
}

/**
 * Raw RPC structure for block headers
 */
interface RpcHeader {
  readonly version: string
  readonly chain_id: string
  readonly height: string
  readonly time: string

  readonly last_block_id: RpcBlockId

  /** hex encoded */
  readonly last_commit_hash: string
  /** hex encoded */
  readonly data_hash: string

  /** hex encoded */
  readonly validators_hash: string
  /** hex encoded */
  readonly next_validators_hash: string
  /** hex encoded */
  readonly consensus_hash: string
  /** hex encoded */
  readonly app_hash: string
  /** hex encoded */
  readonly last_results_hash: string

  /** hex encoded */
  readonly evidence_hash: string
  /** hex encoded */
  readonly proposer_address: string
}

/**
 * Vote set for a specific height (placeholder interface)
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RpcHeightVoteSet {

}

/**
 * Flow monitoring information for network connections
 */
export interface RpcMonitorInfo {
  readonly Active: boolean
  readonly Start: string
  readonly Duration: string
  readonly Idle: string
  readonly Bytes: string
  readonly Samples: string
  readonly InstRate: string
  readonly CurRate: string
  readonly AvgRate: string
  readonly PeakRate: string
  readonly BytesRem: string
  readonly TimeRem: string
  readonly Progress: number
}

/**
 * Raw RPC response structure for network information
 */
export interface RpcNetInfoResponse {
  readonly listening: boolean
  readonly n_peers: string
  readonly peers: readonly RpcPeerInfo[]
  readonly listeners?: string[]
}

/**
 * Raw RPC structure for node information
 */
interface RpcNodeInfo {
  readonly version_set: RpcVersionInfo[]
  readonly net_address: string
  readonly network: string
  readonly software: string // can be empty
  readonly version: string
  readonly channels: string // ???
  readonly moniker: string

  /**
   * Additional information. E.g.
   * {
   *   "tx_index": "on",
   *   "rpc_address":"tcp://0.0.0.0:26657"
   * }
   */
  readonly other: Record<string, unknown>
}

/**
 * Part set information (placeholder interface)
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RpcPartSet {

}

/**
 * Header information for part sets
 */
export interface RpcPartSetHeader {
  readonly total: string
  /** base64 encoded */
  readonly hash: string
}

/**
 * Information about connected peers
 */
export interface RpcPeerInfo {
  readonly node_info: RpcNodeInfo
  readonly is_outbound: boolean
  readonly connection_status: RpcConnectionStatus
  readonly remote_ip: string
}

/**
 * Peer's consensus round state information
 */
export interface RpcPeerRoundState {
  node_address: string
  peer_state: string
}
/**
 * Detailed peer consensus state information
 */
export interface RpcPeerState {
  height: string
  round: string
  step: number
  start_time: string
  proposal: boolean
  proposal_block_parts_header: RpcPartSetHeader
  proposal_block_parts: RpcBitArray | null
  proposal_pol_round: string
  proposal_pol: RpcBitArray
  prevotes: RpcBitArray
  precommits: RpcBitArray
  last_commit_round: string
  last_commit: RpcBitArray
  catchup_commit_round: string
  catchup_commit: RpcBitArray
}
/**
 * Private validator configuration settings
 */
export interface RpcPrivValidatorConfig {
  readonly home: string
  readonly sign_state: string
  readonly local_signer: string
  readonly remote_signer: RpcRemoteSignerConfig
}

/**
 * Single operation in a Merkle proof
 */
export interface RpcProofOp {
  readonly type: string
  /** base64 encoded */
  readonly key: string
  /** base64 encoded */
  readonly data: string
}

/**
 * Consensus proposal information
 */
export interface RpcProposal {
  readonly Type: string
  readonly height: string
  readonly round: string
  readonly pol_round: string
  readonly block_id: RpcBlockId
  readonly timestamp: string
  readonly signature: string | null
}

/**
 * Public key structure with different encoding formats
 */
type RpcPubkey
  = | {
    readonly "@type": string
    /** base64 encoded */
    readonly value: string
  }
  | {
    // See: https://github.com/cosmos/cosmjs/issues/1142
    readonly Sum: {
      readonly type: string
      readonly value: {
        /** base64 encoded */
        [algorithm: string]: string
      }
    }
  };

/**
 * Merkle proof for query results
 */
export interface RpcQueryProof {
  readonly ops: readonly RpcProofOp[]
}

/**
 * Configuration for remote validator signing
 */
export interface RpcRemoteSignerConfig {
  readonly server_address: string
  readonly dial_max_retries: string
  readonly dial_retry_interval: string
  readonly dial_timeout: string
  readonly request_timeout: string
  readonly tcp_authorized_keys: readonly string[]
  readonly tcp_keep_alive_period: string
}

/**
 * Base response structure for ABCI operations
 */
interface RpcResponseBase {
  readonly Error: string | null
  readonly Data: string | null
  readonly Events: RpcEvent[]
  readonly Log: string
  readonly Info: string
}

/**
 * Complete consensus round state information
 */
export interface RpcRoundState {
  readonly height: number
  readonly round: string
  readonly step: string
  readonly start_time: string
  readonly commit_time: string
  readonly validators: RpcValidatorSet
  readonly proposal: RpcProposal | null
  readonly proposal_block: RpcBlock | null
  readonly proposal_block_parts: RpcPartSet | null
  readonly locked_round: string
  readonly locked_block: RpcBlock | null
  readonly locked_block_parts: RpcPartSet | null
  readonly valid_round: string
  readonly valid_block: RpcBlock | null
  readonly valid_block_parts: RpcPartSet | null
  readonly votes: RpcHeightVoteSet | null
  readonly commit_round: string
  readonly last_commit: RpcVoteSet | null
  readonly last_validators: RpcValidatorSet
  readonly triggered_timeout_precommit: boolean
}

/**
 * Simplified consensus round state representation
 */
interface RpcSimpleRoundState {
  "height/round/step": string
  start_time: string
  proposal_block_hash: string | null
  locked_block_hash: string | null
  valid_block_hash: string | null
  height_vote_set: object
}

/**
 * Raw RPC response structure for node status
 */
interface RpcStatusResponse {
  readonly node_info: RpcNodeInfo
  readonly sync_info: RpcSyncInfo
  readonly validator_info: RpcValidatorInfo
}

/**
 * Node synchronization status information
 */
interface RpcSyncInfo {
  /** base64 encoded */
  readonly latest_block_hash: string
  /** base64 encoded */
  readonly latest_app_hash: string
  readonly latest_block_height: string
  readonly latest_block_time: string
  readonly catching_up: boolean
}

/**
 * Transaction execution data and gas usage
 */
interface RpcTxData {
  readonly ResponseBase: RpcResponseBase
  readonly GasWanted?: string
  readonly GasUsed?: string
}

/**
 * Transaction event from WebSocket subscriptions
 */
interface RpcTxEvent {
  /** Raw tx bytes, base64 encoded */
  readonly tx: string
  readonly result: RpcTxData
  readonly height: string
}

/**
 * Merkle proof for transaction inclusion in block
 *
 * Example data:
 * {
 *   "root_hash": "10A1A17D5F818099B5CAB5B91733A3CC27C0DB6CE2D571AC27FB970C314308BB",
 *   "data": "ZVlERVhDV2lVNEUwPXhTUjc4Tmp2QkNVSg==",
 *   "proof": {
 *     "total": "1",
 *     "index": "0",
 *     "leaf_hash": "EKGhfV+BgJm1yrW5FzOjzCfA22zi1XGsJ/uXDDFDCLs=",
 *     "aunts": []
 *   }
 * }
 */
interface RpcTxProof {
  /** base64 encoded */
  readonly data: string
  /** hex encoded */
  readonly root_hash: string
  readonly proof: {
    readonly total: string
    readonly index: string
    /** base64 encoded */
    readonly leaf_hash: string
    /** base64 encoded */
    readonly aunts: readonly string[]
  }
}

/**
 * Raw RPC response structure for transaction queries
 */
interface RpcTxResponse {
  /** Raw tx bytes, base64 encoded */
  readonly tx: string
  readonly tx_result: RpcTxData
  readonly height: string
  readonly index: number
  /** hex encoded */
  readonly hash: string
}

/**
 * Transaction execution result structure
 */
interface RpcTxResult {
  readonly ResponseBase: RpcResponseBase
  readonly GasWanted?: string
  readonly GasUsed?: string
}

/**
 * Raw RPC response structure for transaction search queries
 */
interface RpcTxSearchResponse {
  readonly txs: readonly RpcTxResponse[]
  readonly total_count: string
}

/**
 * Raw RPC response structure for unconfirmed transactions
 */
interface RpcUnconfirmedTxsResponse {
  readonly n_txs: string
  readonly total: string
  readonly total_bytes: string
  readonly txs: readonly string[] | null
}

/**
 * Validator information in genesis document
 */
interface RpcValidatorGenesis {
  /** hex-encoded */
  readonly address: string
  readonly pub_key: RpcPubkey
  readonly power: string
  readonly name?: string
}

/**
 * Validator information from status queries
 */
interface RpcValidatorInfo {
  /** hex encoded */
  readonly address: string
  readonly pub_key: RpcPubkey
  readonly voting_power: string
  readonly proposer_priority?: string
}

/**
 * Validator consensus parameters
 */
interface RpcValidatorParams {
  readonly PubKeyTypeURLs: readonly string[]
}

/**
 * Raw RPC response structure for validator set queries
 */
interface RpcValidatorsResponse {
  readonly block_height: string
  readonly validators: readonly RpcValidatorInfo[]
}

/**
 * Complete validator set with proposer information
 */
export interface RpcValidatorSet {
  readonly validators: readonly RpcValidatorInfo[]
  readonly proposer: RpcValidatorInfo | null
}

/**
 * Validator update information from block results
 */
interface RpcValidatorUpdate {
  readonly pub_key: RpcPubkey
  // When omitted, this means zero (see https://github.com/cosmos/cosmjs/issues/1177#issuecomment-1160115080)
  readonly power?: string
}

/**
 * Software version information
 */
interface RpcVersionInfo {
  readonly Name: string
  readonly Version: string
  readonly Optional: boolean
}

/**
 * Consensus vote structure
 */
type RpcVote = {
  readonly type: number
  readonly height: string
  readonly round: string
  /** hex encoded */
  readonly block_id: RpcBlockId
  /** base64 encoded */
  readonly timestamp: string
  /** hex encoded */
  readonly validator_address: string
  readonly validator_index: string
  /** base64 encoded */
  readonly signature: string
};

/**
 * Vote set information (placeholder interface)
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RpcVoteSet {
}

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Decodes an RPC ABCI info response to the internal AbciInfoResponse format.
 *
 * @param data - The raw RPC ABCI info response
 * @returns Decoded ABCI info response with typed fields
 */
function decodeAbciInfo(data: RpcAbciInfoResponse): responses.AbciInfoResponse {
  return {
    data: data.data,
    lastBlockHeight: may(apiToSmallInt, data.last_block_height),
    lastBlockAppHash: may(fromBase64, data.last_block_app_hash),
  };
}

/**
 * Decodes an RPC ABCI query response to the internal AbciQueryResponse format.
 *
 * @param data - The raw RPC ABCI query response
 * @returns Decoded ABCI query response with base64-decoded values
 */
function decodeAbciQuery(data: RpcAbciQueryResponse): responses.AbciQueryResponse {
  return {
    key: fromBase64(assertString(data.Key ?? "")),
    value: fromBase64(assertString(data.Value ?? "")),
    proof: may(decodeQueryProof, data.Proof),
    height: may(apiToSmallInt, data.Height),
    responseBase: decodeResponseBase(data.ResponseBase),
  };
}

/**
 * Decodes an array of RPC event attributes to the internal EventAttribute format.
 *
 * @param attributes - Array of raw RPC event attributes
 * @returns Array of decoded event attributes
 */
function decodeAttributes(attributes: readonly RpcEventAttribute[]): responses.EventAttribute[] {
  return assertArray(attributes).map(decodeEventAttribute);
}

/**
 * Decodes an RPC begin block response to the internal BeginBlock format.
 *
 * @param data - The raw RPC begin block response
 * @returns Decoded begin block response
 */
function decodeBeginBlock(data: RpcBeginBlock): responses.BeginBlock {
  return {
    responseBase: decodeResponseBase(data.ResponseBase),
  };
}

/**
 * Decodes an RPC bit array to the internal BitArray format.
 *
 * @param data - The raw RPC bit array
 * @returns Decoded bit array with bigint elements
 */
function decodeBitArray(data: RpcBitArray): responses.BitArray {
  return {
    bits: apiToBigInt(assertNotEmpty(data.bits)),
    elems: assertArray(data.elems).map(apiToBigInt),
  };
}
/**
 * Decodes an RPC block to the internal Block format.
 *
 * @param data - The raw RPC block data
 * @returns Decoded block with header, last commit, and transactions
 */
function decodeBlock(data: RpcBlock): responses.Block {
  return {
    header: decodeHeader(assertObject(data.header)),
    // For the block at height 1, last commit is not set. This is represented in an empty object like this:
    // { height: '0', round: 0, block_id: { hash: '', parts: [Object] }, signatures: [] }
    lastCommit: data.last_commit.block_id.hash ? decodeCommit(assertObject(data.last_commit)) : null,
    txs: data.data.txs ? assertArray(data.data.txs).map(fromBase64) : [],
    // Lift up .evidence.evidence to just .evidence
    // See https://github.com/tendermint/tendermint/issues/7697
    evidence: data.evidence?.evidence ?? [],
  };
}

/**
 * Decodes an RPC block ID to the internal BlockId format.
 *
 * @param data - The raw RPC block ID
 * @returns Decoded block ID with hash and part set header
 */
function decodeBlockId(data: RpcBlockId): responses.BlockId {
  return {
    hash: fromBase64(assertNotEmpty(data.hash)),
    parts: decodePartSetHeader(data.parts),
  };
}

/**
 * Decodes an RPC block metadata to the internal BlockMeta format.
 *
 * @param data - The raw RPC block metadata
 * @returns Decoded block metadata with block ID and header
 */
function decodeBlockMeta(data: RpcBlockMeta): responses.BlockMeta {
  return {
    blockId: decodeBlockId(data.block_id),
    header: decodeHeader(data.header),
  };
}

/**
 * Decodes an RPC block parameters to the internal BlockParams format.
 *
 * @param data - The raw RPC block parameters
 * @returns Decoded block parameters with size and gas limits
 */
function decodeBlockParams(data: RpcBlockParams): responses.BlockParams {
  return {
    maxBlockBytes: apiToSmallInt(assertNotEmpty(data.MaxBlockBytes)),
    maxDataBytes: apiToSmallInt(assertNotEmpty(data.MaxDataBytes)),
    maxTxBytes: apiToSmallInt(assertNotEmpty(data.MaxTxBytes)),
    maxGas: apiToSmallInt(assertNotEmpty(data.MaxGas)),
    timeIotaMs: apiToSmallInt(assertNotEmpty(data.TimeIotaMS)),
  };
}

/**
 * Decodes an RPC block response to the internal BlockResponse format.
 *
 * @param data - The raw RPC block response
 * @returns Decoded block response with metadata and block data
 */
function decodeBlockResponse(data: RpcBlockResponse): responses.BlockResponse {
  return {
    blockMeta: decodeBlockMeta(data.block_meta),
    block: decodeBlock(data.block),
  };
}

/**
 * Decodes an RPC block results response to the internal BlockResultsResponse format.
 *
 * @param data - The raw RPC block results response
 * @returns Decoded block results with transaction execution results
 */
function decodeBlockResults(data: RpcBlockResultsResponse): responses.BlockResultsResponse {
  return {
    height: apiToSmallInt(assertNotEmpty(data.height)),
    results: {
      deliverTx: decodeTxResults(data.results.deliver_tx ?? []),
      beginBlock: decodeBeginBlock(data.results.begin_block),
      endBlock: decodeEndBlock(data.results.end_block),
    },
  };
}

/**
 * Decodes an RPC block version to the internal block version format.
 *
 * @param data - The raw RPC block version string
 * @returns Decoded block version string
 */
function decodeBlockVersion(data: string): string {
  // Todo: what is this supposed to look like? for now keeping it as "v1.0.0-rc.0"
  return data;
}

/**
 * Decodes an RPC blockchain response to the internal BlockchainResponse format.
 *
 * @param data - The raw RPC blockchain response
 * @returns Decoded blockchain response with block metadata list
 */
function decodeBlockchain(data: RpcBlockchainResponse): responses.BlockchainResponse {
  return {
    lastHeight: apiToSmallInt(assertNotEmpty(data.last_height)),
    blockMetas: assertArray(data.block_metas).map(decodeBlockMeta),
  };
}

/**
 * Decodes an RPC broadcast transaction commit response to the internal BroadcastTxCommitResponse format.
 *
 * @param data - The raw RPC broadcast transaction commit response
 * @returns Decoded transaction commit response with hash and execution results
 */
function decodeBroadcastTxCommit(data: RpcBroadcastTxCommitResponse): responses.BroadcastTxCommitResponse {
  return {
    height: apiToSmallInt(data.height),
    hash: fromHex(assertNotEmpty(data.hash)),
    checkTx: decodeTxData(assertObject(data.check_tx)),
    deliverTx: may(decodeTxData, data.deliver_tx),
  };
}

/**
 * Decodes an RPC broadcast transaction sync response to the internal BroadcastTxSyncResponse format.
 *
 * @param data - The raw RPC broadcast transaction sync response
 * @returns Decoded transaction sync response with hash and validation results
 */
function decodeBroadcastTxSync(data: RpcBroadcastTxSyncResponse): responses.BroadcastTxSyncResponse {
  return {
    ...decodeTxData(data),
    hash: fromHex(assertNotEmpty(data.hash)),
  };
}

/**
 * Decodes an RPC channel info to the internal ChannelStatus format.
 *
 * @param data - The raw RPC channel info
 * @returns Decoded channel status with queue information
 */
function decodeChannelInfo(data: RpcChannelInfo): responses.ChannelStatus {
  return {
    id: data.ID,
    sendQueueCapacity: apiToSmallInt(data.SendQueueCapacity),
    sendQueueSize: apiToSmallInt(data.SendQueueSize),
    priority: apiToSmallInt(data.Priority),
    recentlySent: apiToBigInt(data.RecentlySent),
  };
}

/**
 * Decodes an RPC commit to the internal Commit format.
 *
 * @param data - The raw RPC commit
 * @returns Decoded commit with block ID and precommit signatures
 */
function decodeCommit(data: RpcCommit): responses.Commit {
  return {
    blockId: decodeBlockId(assertObject(data.block_id)),
    precommits: assertArray(data.precommits).map(pre => pre ? decodePrecommit(pre) : null),
  };
}

/**
 * Decodes an RPC commit response to the internal CommitResponse format.
 *
 * @param data - The raw RPC commit response
 * @returns Decoded commit response with canonical flag, header, and commit
 */
function decodeCommitResponse(data: RpcCommitResponse): responses.CommitResponse {
  return {
    canonical: assertBoolean(data.canonical),
    header: decodeHeader(data.signed_header.header),
    commit: decodeCommit(data.signed_header.commit),
  };
}

/**
 * Decodes RPC connection status to the internal ConnectionStatus format.
 *
 * @param data - The raw RPC connection status
 * @returns Decoded connection status with duration and monitor information
 */
function decodeConnectionStatus(data: RpcConnectionStatus): responses.ConnectionStatus {
  return {
    duration: durationFromString(data.Duration),
    recvMonitor: decodeMonitorInfo(assertObject(data.RecvMonitor)),
    sendMonitor: decodeMonitorInfo(assertObject(data.SendMonitor)),
    channels: data.Channels ? data.Channels.map(decodeChannelInfo) : [],
  };
}

/**
 * Decodes RPC consensus configuration to the internal ConsensusConfig format.
 *
 * @param data - The raw RPC consensus configuration
 * @returns Decoded consensus configuration with validator settings
 */
function decodeConsensusConfig(data: RpcConsensusConfig): responses.ConsensusConfig {
  return {
    home: assertNotEmpty(data.home),
    walFile: assertNotEmpty(data.wal_file),
    privValidator: decodePrivValidatorConfig(data.priv_validator),
  };
}

/**
 * Decodes RPC consensus parameters to the internal ConsensusParams format.
 *
 * @param data - The raw RPC consensus parameters
 * @returns Decoded consensus parameters with block and validator settings
 */
function decodeConsensusParams(data: RpcConsensusParams): responses.ConsensusParams {
  return {
    block: decodeBlockParams(assertObject(data.Block)),
    validator: decodeValidatorParams(assertObject(data.Validator)),
  };
}

/**
 * Decodes RPC consensus parameters response to the internal format.
 *
 * @param data - The raw RPC consensus parameters response
 * @returns Decoded consensus parameters response with block height
 */
function decodeConsensusParamsResponse(data: RpcConsensusParamsResponse): responses.ConsensusParamsResponse {
  return {
    blockHeight: apiToSmallInt(data.block_height),
    consensusParams: decodeConsensusParams(assertObject(data.consensus_params)),
  };
}

/**
 * Decodes RPC consensus state response to the internal format.
 *
 * @param data - The raw RPC consensus state response
 * @returns Decoded consensus state with round information
 */
function decodeConsensusStateResponse(data: RpcConsensusStateResponse): responses.ConsensusStateResponse {
  return {
    roundState: {
      height: apiToSmallInt(assertNotEmpty(data.round_state["height/round/step"].split("/")[0])),
      round: apiToSmallInt(assertNotEmpty(data.round_state["height/round/step"].split("/")[1])),
      step: apiToSmallInt(assertNotEmpty(data.round_state["height/round/step"].split("/")[2])),
      startTime: fromRfc3339WithNanoseconds(assertNotEmpty(data.round_state.start_time)),
      proposalBlockHash: data.round_state.proposal_block_hash ? fromBase64(data.round_state.proposal_block_hash) : new Uint8Array(),
      lockedBlockHash: data.round_state.locked_block_hash ? fromBase64(data.round_state.locked_block_hash) : new Uint8Array(),
      validBlockHash: data.round_state.valid_block_hash ? fromBase64(data.round_state.valid_block_hash) : new Uint8Array(),
      heightVoteSet: assertObject(data.round_state.height_vote_set),
    },
  };
}

/**
 * Decodes RPC dump consensus state response to the internal format.
 *
 * @param data - The raw RPC dump consensus state response
 * @returns Decoded full consensus state dump with configuration and peer states
 */
function decodeDumpConsensusStateResponse(data: RpcDumpConsensusStateResponse): responses.DumpConsensusStateResponse {
  return {
    config: decodeConsensusConfig(assertObject(data.config)),
    roundState: decodeRoundState(assertObject(data.round_state)),
    peers: data.peers && assertArray(data.peers) ? data.peers.map(decodePeerRoundState) : [],
  };
}

/**
 * Decodes an RPC end block response to the internal EndBlock format.
 *
 * @param data - The raw RPC end block response
 * @returns Decoded end block response
 */
function decodeEndBlock(data: RpcEndBlock): responses.EndBlock {
  return {
    responseBase: decodeResponseBase(data.ResponseBase),
    validatorUpdates: null,
    consensusParams: null,
    events: null,
  };
}

/**
 * Decodes an RPC event to the internal Event format.
 *
 * @param event - The raw RPC event
 * @returns Decoded event with type and attributes
 */
export function decodeEvent(event: RpcEvent): responses.Event {
  return {
    "@type": assertNotEmpty(event["@type"]),
    type: event.type,
    attrs: event.attrs ? decodeAttributes(event.attrs) : [],
    pkg_path: assertNotEmpty(event.pkg_path), // This is not used in the Tendermint API, but we keep it for compatibility
  };
}

/**
 * Decodes an RPC event attribute to the internal EventAttribute format.
 *
 * @param attribute - The raw RPC event attribute
 * @returns Decoded event attribute with key and value
 */
function decodeEventAttribute(attribute: RpcEventAttribute): responses.EventAttribute {
  return {
    key: assertNotEmpty(attribute.key),
    value: attribute.value ?? "",
  };
}

/**
 * Decodes an array of RPC events to the internal Event format.
 *
 * @param events - Array of raw RPC events
 * @returns Array of decoded events
 */
function decodeEvents(events: readonly RpcEvent[]): readonly responses.Event[] {
  return assertArray(events).map(decodeEvent);
}

/**
 * Decodes an RPC genesis response to the internal GenesisResponse format.
 *
 * @param data - The raw RPC genesis response
 * @returns Decoded genesis document with chain configuration and initial state
 */
function decodeGenesis(data: RpcGenesisResponse): responses.GenesisResponse {
  return {
    genesisTime: fromRfc3339WithNanoseconds(assertNotEmpty(data.genesis_time)),
    chainId: assertNotEmpty(data.chain_id),
    consensusParams: decodeConsensusParams(data.consensus_params),
    validators: data.validators ? assertArray(data.validators).map(decodeValidatorGenesis) : [],
    appHash: data.app_hash ? fromHex(assertSet(data.app_hash)) : new Uint8Array(), // empty string in kvstore app
    appState: data.app_state,
  };
}

/**
 * Decodes an RPC header to the internal Header format.
 *
 * @param data - The raw RPC header
 * @returns Decoded block header with all fields properly typed
 */
function decodeHeader(data: RpcHeader): responses.Header {
  return {
    version: decodeBlockVersion(data.version),
    chainId: assertNotEmpty(data.chain_id),
    height: apiToSmallInt(assertNotEmpty(data.height)),
    time: fromRfc3339WithNanoseconds(assertNotEmpty(data.time)),

    // When there is no last block ID (i.e. this block's height is 1), we get an empty structure like this:
    // { hash: '', parts: { total: 0, hash: '' } }
    lastBlockId: data.last_block_id.hash ? decodeBlockId(data.last_block_id) : null,

    lastCommitHash: fromBase64(assertSet(data.last_commit_hash)),
    dataHash: data.data_hash ? fromBase64(data.data_hash) : new Uint8Array(),

    validatorsHash: fromBase64(assertSet(data.validators_hash)),
    nextValidatorsHash: fromBase64(assertSet(data.next_validators_hash)),
    consensusHash: fromBase64(assertSet(data.consensus_hash)),
    appHash: fromBase64(assertSet(data.app_hash)),
    lastResultsHash: data.last_results_hash ? fromBase64(data.last_results_hash) : new Uint8Array(),

    proposerAddress: fromBech32(assertNotEmpty(data.proposer_address)).data,
  };
}

/**
 * Decodes an RPC height vote set to the internal HeightVoteSet format.
 *
 * @param _data - The raw RPC height vote set (unused placeholder)
 * @returns Empty decoded height vote set
 */
function decodeHeightVoteSet(_data: RpcHeightVoteSet): responses.HeightVoteSet {
  return {
  };
}

/**
 * Decodes RPC monitor information to the internal FlowStatus format.
 *
 * @param data - The raw RPC monitor information
 * @returns Decoded flow status with bandwidth and timing metrics
 */
function decodeMonitorInfo(data: RpcMonitorInfo): responses.FlowStatus {
  return {
    active: data.Active,
    start: fromRfc3339WithNanoseconds(data.Start),
    duration: durationFromString(data.Duration),
    idle: durationFromString(data.Idle),
    bytes: apiToBigInt(data.Bytes),
    samples: apiToBigInt(data.Samples),
    instRate: apiToBigInt(data.InstRate),
    curRate: apiToBigInt(data.CurRate),
    avgRate: apiToBigInt(data.AvgRate),
    peakRate: apiToBigInt(data.PeakRate),
    bytesRem: apiToBigInt(data.BytesRem),
    timeRem: durationFromString(data.TimeRem),
    progress: apiToSmallInt(data.Progress) / 100000,
  };
}

/**
 * Decodes RPC network info response to the internal NetInfoResponse format.
 *
 * @param data - The raw RPC network info response
 * @returns Decoded network information with peer details
 */
function decodeNetInfoResponse(data: RpcNetInfoResponse): responses.NetInfoResponse {
  return {
    listening: data.listening,
    nPeers: apiToSmallInt(data.n_peers),
    peers: data.peers ? data.peers.map(decodePeerInfo) : [],
    listeners: data.listeners ? data.listeners.map(assertNotEmpty) : [],
  };
}

/**
 * Decodes RPC node information to the internal NodeInfo format.
 *
 * @param data - The raw RPC node information
 * @returns Decoded node information with network address and version details
 */
function decodeNodeInfo(data: RpcNodeInfo): responses.NodeInfo {
  return {
    listenAddr: assertNotEmpty(data.net_address),
    network: assertNotEmpty(data.network),
    software: assertString(data.software), // can be empty
    version: assertString(data.version), // Can be empty (https://github.com/cosmos/cosmos-sdk/issues/7963)
    channels: Array.from(fromBase64(assertString(data.channels))), // can be empty
    moniker: assertString(data.moniker),
    other: dictionaryToStringMap(data.other),
    versionSet: data.version_set.map(versionInfo => ({
      name: assertString(versionInfo.Name),
      version: assertString(versionInfo.Version),
      optional: assertBoolean(versionInfo.Optional),
    })),
  };
}

/**
 * Decodes an RPC part set to the internal PartSet format.
 *
 * @param _data - The raw RPC part set (unused placeholder)
 * @returns Empty decoded part set
 */
function decodePartSet(_data: RpcPartSet): responses.PartSet {
  return {
  };
}

/**
 * Decodes an RPC part set header to the internal PartSetHeader format.
 *
 * @param data - The raw RPC part set header
 * @returns Decoded part set header with total count and hash
 */
function decodePartSetHeader(data: RpcPartSetHeader): responses.PartSetHeader {
  return {
    total: apiToBigInt(assertNotEmpty(data.total)),
    hash: data.hash ? fromBase64(assertNotEmpty(data.hash)) : new Uint8Array(),
  };
}

/**
 * Decodes RPC peer information to the internal Peer format.
 *
 * @param data - The raw RPC peer information
 * @returns Decoded peer information with node details and connection status
 */
function decodePeerInfo(data: RpcPeerInfo): responses.Peer {
  return {
    nodeInfo: decodeNodeInfo(assertObject(data.node_info)),
    isOutbound: data.is_outbound,
    connectionStatus: decodeConnectionStatus(assertObject(data.connection_status)),
    remoteIp: data.remote_ip,
  };
}

/**
 * Decodes RPC peer round state to the internal DumpPeerRoundState format.
 *
 * @param data - The raw RPC peer round state
 * @returns Decoded peer round state with address and consensus details
 */
function decodePeerRoundState(data: RpcPeerRoundState): responses.DumpPeerRoundState {
  const parts = data.node_address.split("@");
  const ip = parts[1].split(":");
  return {
    address: parts[0],
    server: ip[0],
    port: apiToSmallInt(ip[1]),
    roundState: decodePeerState(JSON.parse(fromAscii(fromBase64(assertNotEmpty(data.peer_state)))).round_state),
  };
}
/**
 * Decodes RPC peer state to the internal PeerRoundState format.
 *
 * @param data - The raw RPC peer state
 * @returns Decoded peer consensus state with voting information
 */
function decodePeerState(data: RpcPeerState): responses.PeerRoundState {
  return {
    height: apiToSmallInt(data.height),
    round: apiToSmallInt(data.round),
    step: apiToSmallInt(data.step),
    startTime: fromRfc3339WithNanoseconds(assertNotEmpty(data.start_time)),
    proposal: assertBoolean(data.proposal),
    proposalBlockPartsHeader: decodePartSetHeader(assertObject(data.proposal_block_parts_header)),
    proposalBlockParts: data.proposal_block_parts ? decodeBitArray(assertObject(data.proposal_block_parts)) : null,
    proposalPolRound: apiToSmallInt(data.proposal_pol_round),
    proposalPol: decodeBitArray(assertObject(data.proposal_pol)),
    prevotes: decodeBitArray(assertObject(data.prevotes)),
    precommits: decodeBitArray(assertObject(data.precommits)),
    lastCommitRound: apiToSmallInt(data.last_commit_round),
    lastCommit: decodeBitArray(assertObject(data.last_commit)),
    catchupCommitRound: apiToSmallInt(data.catchup_commit_round),
    catchupCommit: decodeBitArray(assertObject(data.catchup_commit)),
  };
}
/**
 * Decodes an RPC vote (precommit) to the internal Vote format.
 *
 * @param data - The raw RPC vote
 * @returns Decoded vote with validator information and signature
 */
function decodePrecommit(data: RpcVote): responses.Vote {
  return {
    type: data.type,
    height: apiToSmallInt(data.height),
    round: apiToSmallInt(data.round),
    blockId: decodeBlockId(assertObject(data.block_id)),
    timestamp: fromRfc3339WithNanoseconds(assertNotEmpty(data.timestamp)),
    validatorAddress: fromBase64(assertNotEmpty(data.validator_address)),
    validatorIndex: apiToSmallInt(assertNotEmpty(data.validator_index)),
    signature: fromBase64(assertNotEmpty(data.signature)),
  };
}

/**
 * Decodes RPC private validator configuration to the internal format.
 *
 * @param data - The raw RPC private validator configuration
 * @returns Decoded validator configuration with signing settings
 */
function decodePrivValidatorConfig(data: RpcPrivValidatorConfig): responses.PrivValidatorConfig {
  return {
    home: assertNotEmpty(data.home),
    signState: assertNotEmpty(data.sign_state),
    localSigner: assertNotEmpty(data.local_signer),
    remoteSigner: data.remote_signer ? decodeRemoteSignerConfig(assertNotEmpty(data.remote_signer)) : null,
  };
}

/**
 * Decodes an RPC proposal to the internal Proposal format.
 *
 * @param data - The raw RPC proposal
 * @returns Decoded proposal with block ID and signature, or null if invalid
 */
function decodeProposal(data: RpcProposal): responses.Proposal | null {
  return {
    type: apiToSmallInt(assertNotEmpty(data.Type)),
    height: apiToSmallInt(assertNotEmpty(data.height)),
    round: apiToSmallInt(assertNotEmpty(data.round)),
    polRound: apiToSmallInt(assertNotEmpty(data.pol_round)),
    blockId: decodeBlockId(assertObject(data.block_id)),
    timestamp: fromRfc3339WithNanoseconds(assertNotEmpty(data.timestamp)),
    signature: data.signature ? fromBase64(assertNotEmpty(data.signature)) : undefined,
  };
}

/**
 * Decodes an RPC public key to the internal ValidatorPubkey format.
 *
 * @param data - The raw RPC public key in various encoding formats
 * @returns Decoded public key with algorithm type and key data
 * @throws Error if the public key type is unknown
 */
function decodePubkey(data: RpcPubkey): ValidatorPubkey {
  if ("Sum" in data) {
    // we don't need to check type because we're checking algorithm
    const [[algorithm, value]] = Object.entries(data.Sum.value);
    assert(algorithm === "ed25519" || algorithm === "secp256k1", `unknown pubkey type: ${algorithm}`);
    return {
      algorithm,
      data: fromBase64(assertNotEmpty(value)),
    };
  }
  else {
    switch (data["@type"]) {
      // go-amino special code
      case "/tm.PubKeyEd25519":
        return {
          algorithm: "ed25519",
          data: fromBase64(assertNotEmpty(data.value)),
        };
      case "/tm.PubKeySecp256k1":
        return {
          algorithm: "secp256k1",
          data: fromBase64(assertNotEmpty(data.value)),
        };
      default:
        throw new Error(`unknown pubkey type: ${data["@type"]}`);
    }
  }
}

/**
 * Decodes an RPC query proof to the internal QueryProof format.
 *
 * @param data - The raw RPC query proof
 * @returns Decoded Merkle proof with operations and key-value pairs
 */
function decodeQueryProof(data: RpcQueryProof): responses.QueryProof {
  return {
    ops: data.ops.map(op => ({
      type: op.type,
      key: fromBase64(op.key),
      data: fromBase64(op.data),
    })),
  };
}

/**
 * Decodes RPC remote signer configuration to the internal format.
 *
 * @param data - The raw RPC remote signer configuration
 * @returns Decoded remote signer configuration with connection settings
 */
function decodeRemoteSignerConfig(data: RpcRemoteSignerConfig): responses.RemoteSignerConfig {
  return {
    serverAddress: data.server_address ?? "",
    dialMaxRetries: apiToSmallInt(assertNotEmpty(data.dial_max_retries)),
    dialRetryInterval: parseInt(assertNotEmpty(data.dial_retry_interval)),
    dialTimeout: parseInt(assertNotEmpty(data.dial_timeout)),
    requestTimeout: parseInt(assertNotEmpty(data.request_timeout)),
    authorizedKeys: assertArray(data.tcp_authorized_keys),
    keepAlivePeriod: parseInt(assertNotEmpty(data.tcp_keep_alive_period)),
  };
}

/**
 * Decodes an RPC response base to the internal ResponseBase format.
 *
 * @param data - The raw RPC response base
 * @returns Decoded response base with error, data, events, and logs
 */
function decodeResponseBase(data: RpcResponseBase): responses.ResponseBase {
  return {
    error: data.Error ?? null,
    data: data.Data ? fromBase64(data.Data) : new Uint8Array(),
    events: data.Events ? decodeEvents(data.Events) : [],
    log: data.Log,
    info: data.Info,
  };
}

/**
 * Decodes RPC round state to the internal RoundState format.
 *
 * @param data - The raw RPC round state
 * @returns Decoded consensus round state with proposals and validator information
 */
function decodeRoundState(data: RpcRoundState): responses.RoundState {
  return {
    height: apiToSmallInt(assertNotEmpty(data.height)),
    round: apiToSmallInt(assertNotEmpty(data.round)),
    step: apiToSmallInt(assertNotEmpty(data.step)),
    startTime: fromRfc3339WithNanoseconds(assertNotEmpty(data.start_time)),
    commitTime: fromRfc3339WithNanoseconds(data.commit_time),
    validators: decodeValidatorSet(assertObject(data.validators)),
    proposal: data.proposal ? decodeProposal(assertObject(data.proposal)) : null,
    proposalBlock: data.proposal_block ? decodeBlock(assertObject(data.proposal_block)) : null,
    proposalBlockParts: data.proposal_block_parts ? decodePartSet(assertObject(data.proposal_block_parts)) : null,
    lockedRound: apiToSmallInt(assertNotEmpty(data.locked_round)),
    lockedBlock: data.locked_block ? decodeBlock(assertObject(data.locked_block)) : null,
    lockedBlockParts: data.locked_block_parts ? decodePartSet(assertObject(data.locked_block_parts)) : null,
    validRound: apiToSmallInt(assertNotEmpty(data.valid_round)),
    validBlock: data.valid_block ? decodeBlock(assertObject(data.valid_block)) : null,
    validBlockParts: null,
    votes: data.votes ? decodeHeightVoteSet(assertObject(data.votes)) : null,
    commitRound: apiToSmallInt(assertNotEmpty(data.commit_round)),
    lastCommit: data.last_commit ? decodeVoteSet(assertObject(data.last_commit)) : null,
    lastValidators: decodeValidatorSet(assertObject(data.last_validators)),
    triggeredTimeoutPrecommit: assertNotEmpty(data.triggered_timeout_precommit),
  };
}

/**
 * Decodes an RPC status response to the internal StatusResponse format.
 *
 * @param data - The raw RPC status response
 * @returns Decoded status with node, sync, and validator information
 */
function decodeStatus(data: RpcStatusResponse): responses.StatusResponse {
  return {
    nodeInfo: decodeNodeInfo(data.node_info),
    syncInfo: decodeSyncInfo(data.sync_info),
    validatorInfo: decodeValidatorInfo(data.validator_info),
  };
}

/**
 * Decodes RPC sync information to the internal SyncInfo format.
 *
 * @param data - The raw RPC sync information
 * @returns Decoded sync information with latest block details and catching up status
 */
function decodeSyncInfo(data: RpcSyncInfo): responses.SyncInfo {
  return {
    latestBlockHash: fromBase64(assertNotEmpty(data.latest_block_hash)),
    latestAppHash: fromBase64(assertNotEmpty(data.latest_app_hash)),
    latestBlockTime: fromRfc3339WithNanoseconds(assertNotEmpty(data.latest_block_time)),
    latestBlockHeight: apiToSmallInt(assertNotEmpty(data.latest_block_height)),
    catchingUp: assertBoolean(data.catching_up),
  };
}

/**
 * Decodes RPC transaction data to the internal TxData format.
 *
 * @param data - The raw RPC transaction data
 * @returns Decoded transaction data with gas usage information
 */
function decodeTxData(data: RpcTxData): responses.TxData {
  return {
    responseBase: decodeResponseBase(data.ResponseBase),
    gasWanted: apiToBigInt(data.GasWanted ?? "0"),
    gasUsed: apiToBigInt(data.GasUsed ?? "0"),
  };
}

/**
 * Decodes an RPC transaction event to the internal TxEvent format.
 *
 * @param data - The raw RPC transaction event
 * @returns Decoded transaction event with hash and execution results
 */
function decodeTxEvent(data: RpcTxEvent): responses.TxEvent {
  const tx = fromBase64(assertNotEmpty(data.tx));
  return {
    tx: tx,
    hash: hashTx(tx),
    result: decodeTxData(data.result),
    height: apiToSmallInt(assertNotEmpty(data.height)),
  };
}

/**
 * Decodes an RPC transaction proof to the internal TxProof format.
 *
 * @param data - The raw RPC transaction proof
 * @returns Decoded transaction proof with Merkle tree information
 */
function _decodeTxProof(data: RpcTxProof): responses.TxProof {
  return {
    data: fromBase64(assertNotEmpty(data.data)),
    rootHash: fromHex(assertNotEmpty(data.root_hash)),
    proof: {
      total: apiToSmallInt(assertNotEmpty(data.proof.total)),
      index: apiToSmallInt(assertNotEmpty(data.proof.index)),
      leafHash: fromBase64(assertNotEmpty(data.proof.leaf_hash)),
      aunts: assertArray(data.proof.aunts).map(fromBase64),
    },
  };
}

/**
 * Decodes an RPC transaction response to the internal TxResponse format.
 *
 * @param data - The raw RPC transaction response
 * @returns Decoded transaction response with hash, height, and execution results
 */
function decodeTxResponse(data: RpcTxResponse): responses.TxResponse {
  return {
    tx: fromBase64(assertNotEmpty(data.tx)),
    result: decodeTxData(assertObject(data.tx_result)),
    height: apiToSmallInt(assertNotEmpty(data.height)),
    index: apiToSmallInt(assertNumber(data.index)),
    hash: fromBase64(assertNotEmpty(data.hash)),
  };
}

/**
 * Decodes an RPC transaction result to the internal TxResult format.
 *
 * @param data - The raw RPC transaction result
 * @returns Decoded transaction result with gas usage information
 */
function decodeTxResult(data: RpcTxResult): responses.TxResult {
  return {
    responseBase: decodeResponseBase(data.ResponseBase),
    gasWanted: apiToBigInt(data.GasWanted ?? "0"),
    gasUsed: apiToBigInt(data.GasUsed ?? "0"),
  };
}

/**
 * Decodes an array of RPC transaction results to the internal format.
 *
 * @param txs - Array of raw RPC transaction results
 * @returns Array of decoded transaction results
 */
function decodeTxResults(txs: readonly RpcTxResult[]): readonly responses.TxResult[] {
  return assertArray(txs).map(decodeTxResult);
}

/**
 * Decodes an RPC transaction search response to the internal format.
 *
 * @param data - The raw RPC transaction search response
 * @returns Decoded search results with total count and transaction list
 */
function decodeTxSearch(data: RpcTxSearchResponse): responses.TxSearchResponse {
  return {
    totalCount: apiToSmallInt(assertNotEmpty(data.total_count)),
    txs: assertArray(data.txs).map(decodeTxResponse),
  };
}

/**
 * Decodes an RPC unconfirmed transactions response to the internal format.
 *
 * @param data - The raw RPC unconfirmed transactions response
 * @returns Decoded unconfirmed transactions with count and size information
 */
function decodeUnconfirmedTxs(data: RpcUnconfirmedTxsResponse): responses.UnconfirmedTxsResponse {
  return {
    nTxs: apiToBigInt(assertNotEmpty(data.n_txs)),
    total: apiToBigInt(assertNotEmpty(data.total)),
    totalBytes: apiToBigInt(assertNotEmpty(data.total_bytes)),
    txs: data.txs ? assertArray(data.txs).map(fromBase64) : [],
  };
}

/**
 * Decodes an RPC validator genesis entry to the internal Validator format.
 *
 * @param data - The raw RPC validator genesis data
 * @returns Decoded validator with address, public key, and voting power
 */
export function decodeValidatorGenesis(data: RpcValidatorGenesis): responses.Validator {
  return {
    address: fromBech32(assertNotEmpty(data.address)).data,
    pubkey: decodePubkey(assertObject(data.pub_key)),
    votingPower: apiToBigInt(assertNotEmpty(data.power)),
    name: assertNotEmpty(data.name),
  };
}

/**
 * Decodes RPC validator information to the internal Validator format.
 *
 * @param data - The raw RPC validator information
 * @returns Decoded validator with public key, voting power, and priority
 */
export function decodeValidatorInfo(data: RpcValidatorInfo): responses.Validator {
  return {
    pubkey: decodePubkey(assertObject(data.pub_key)),
    votingPower: apiToBigInt(assertNotEmpty(data.voting_power)),
    proposerPriority: data.proposer_priority ? apiToBigInt(assertNotEmpty(data.proposer_priority)) : undefined,
    address: fromBech32(assertNotEmpty(data.address)).data,
  };
}

/**
 * Decodes RPC validator parameters to the internal ValidatorParams format.
 *
 * @param data - The raw RPC validator parameters
 * @returns Decoded validator parameters with allowed public key types
 */
function decodeValidatorParams(data: RpcValidatorParams): responses.ValidatorParams {
  return {
    pubKeyTypeUrls: assertArray(data.PubKeyTypeURLs).map((url) => {
      return assertNotEmpty(url);
    }),
  };
}

/**
 * Decodes an RPC validators response to the internal ValidatorsResponse format.
 *
 * @param data - The raw RPC validators response
 * @returns Decoded validators response with block height and validator list
 */
function decodeValidators(data: RpcValidatorsResponse): responses.ValidatorsResponse {
  return {
    blockHeight: apiToSmallInt(assertNotEmpty(data.block_height)),
    validators: assertArray(data.validators).map(decodeValidatorInfo),
  };
}

/**
 * Decodes an RPC validator set to the internal ValidatorSet format.
 *
 * @param data - The raw RPC validator set
 * @returns Decoded validator set with proposer information
 */
function decodeValidatorSet(data: RpcValidatorSet): responses.ValidatorSet {
  return {
    validators: data.validators.map(decodeValidatorInfo),
    proposer: data.proposer ? decodeValidatorInfo(data.proposer) : null,
  };
}

/**
 * Decodes an RPC validator update to the internal ValidatorUpdate format.
 *
 * @param data - The raw RPC validator update
 * @returns Decoded validator update with public key and voting power changes
 */
export function decodeValidatorUpdate(data: RpcValidatorUpdate): responses.ValidatorUpdate {
  return {
    pubkey: decodePubkey(assertObject(data.pub_key)),
    votingPower: apiToBigInt(data.power ?? "0"),
  };
}

/**
 * Decodes an RPC vote set to the internal VoteSet format.
 *
 * @param _data - The raw RPC vote set (unused placeholder)
 * @returns Empty decoded vote set
 */
function decodeVoteSet(_data: RpcVoteSet): responses.VoteSet {
  return {
  };
}

// ============================================================================
// CLASSES
// ============================================================================

/**
 * Static class providing response decoders for all Tendermint RPC methods.
 *
 * This class contains methods that decode raw JSON-RPC responses from Tendermint
 * nodes into properly typed TypeScript objects. Each method corresponds to a
 * specific RPC endpoint and handles the conversion of:
 * - String numbers to proper numeric types
 * - Base64/hex encoded bytes to Uint8Array
 * - RFC3339 timestamps to Date objects
 * - Nested response structures to flattened interfaces
 *
 * The decoders are used internally by the Tm2Client to provide type-safe
 * responses to application code.
 */
export class Responses {
  /**
   * Decodes an ABCI info response from the raw JSON-RPC response.
   *
   * @param response - Raw JSON-RPC success response from abci_info method
   * @returns Decoded ABCI info with application data and state
   */
  public static decodeAbciInfo(response: JsonRpcSuccessResponse): responses.AbciInfoResponse {
    return decodeAbciInfo(assertObject((response.result as AbciInfoResult).response));
  }

  /**
   * Decodes an ABCI query response from the raw JSON-RPC response.
   *
   * @param response - Raw JSON-RPC success response from abci_query method
   * @returns Decoded query result with key, value, and optional proof
   */
  public static decodeAbciQuery(response: JsonRpcSuccessResponse): responses.AbciQueryResponse {
    return decodeAbciQuery(assertObject((response.result as AbciQueryResult).response));
  }

  /**
   * Decodes a block response from the raw JSON-RPC response.
   *
   * @param response - Raw JSON-RPC success response from block method
   * @returns Decoded block data with header, transactions, and metadata
   */
  public static decodeBlock(response: JsonRpcSuccessResponse): responses.BlockResponse {
    return decodeBlockResponse(response.result as RpcBlockResponse);
  }

  /**
   * Decodes a block results response from the raw JSON-RPC response.
   *
   * @param response - Raw JSON-RPC success response from block_results method
   * @returns Decoded block results with transaction execution outcomes
   */
  public static decodeBlockResults(response: JsonRpcSuccessResponse): responses.BlockResultsResponse {
    return decodeBlockResults(response.result as RpcBlockResultsResponse);
  }

  /**
   * Decodes a blockchain response from the raw JSON-RPC response.
   *
   * @param response - Raw JSON-RPC success response from blockchain method
   * @returns Decoded blockchain information with block metadata
   */
  public static decodeBlockchain(response: JsonRpcSuccessResponse): responses.BlockchainResponse {
    return decodeBlockchain(response.result as RpcBlockchainResponse);
  }

  /**
   * Decodes a synchronous broadcast transaction response.
   *
   * @param response - Raw JSON-RPC success response from broadcast_tx_sync method
   * @returns Decoded sync broadcast result with transaction hash and validation
   */
  public static decodeBroadcastTxSync(response: JsonRpcSuccessResponse): responses.BroadcastTxSyncResponse {
    return decodeBroadcastTxSync(response.result as RpcBroadcastTxSyncResponse);
  }

  /**
   * Decodes an asynchronous broadcast transaction response.
   *
   * @param response - Raw JSON-RPC success response from broadcast_tx_async method
   * @returns Decoded async broadcast result (same format as sync)
   */
  public static decodeBroadcastTxAsync(response: JsonRpcSuccessResponse): responses.BroadcastTxAsyncResponse {
    return Responses.decodeBroadcastTxSync(response);
  }

  /**
   * Decodes a broadcast transaction commit response.
   *
   * @param response - Raw JSON-RPC success response from broadcast_tx_commit method
   * @returns Decoded commit result with transaction hash, height, and execution results
   */
  public static decodeBroadcastTxCommit(
    response: JsonRpcSuccessResponse,
  ): responses.BroadcastTxCommitResponse {
    return decodeBroadcastTxCommit(response.result as RpcBroadcastTxCommitResponse);
  }

  /**
   * Decodes a consensus state response from the raw JSON-RPC response.
   *
   * @param response - Raw JSON-RPC success response from consensus_state method
   * @returns Decoded consensus state with round information
   */
  public static decodeConsensusState(response: JsonRpcSuccessResponse): responses.ConsensusStateResponse {
    return decodeConsensusStateResponse(response.result as RpcConsensusStateResponse);
  }

  /**
   * Decodes a dump consensus state response from the raw JSON-RPC response.
   *
   * @param response - Raw JSON-RPC success response from dump_consensus_state method
   * @returns Decoded full consensus state dump with configuration and peer states
   */
  public static decodeDumpConsensusState(response: JsonRpcSuccessResponse): responses.DumpConsensusStateResponse {
    return decodeDumpConsensusStateResponse(response.result as RpcDumpConsensusStateResponse);
  }

  /**
   * Decodes a consensus parameters response from the raw JSON-RPC response.
   *
   * @param response - Raw JSON-RPC success response from consensus_params method
   * @returns Decoded consensus parameters with block and validator settings
   */
  public static decodeConsensusParams(response: JsonRpcSuccessResponse): responses.ConsensusParamsResponse {
    return decodeConsensusParamsResponse(response.result as RpcConsensusParamsResponse);
  }

  /**
   * Decodes a commit response from the raw JSON-RPC response.
   *
   * @param response - Raw JSON-RPC success response from commit method
   * @returns Decoded commit information with header and signatures
   */
  public static decodeCommit(response: JsonRpcSuccessResponse): responses.CommitResponse {
    return decodeCommitResponse(response.result as RpcCommitResponse);
  }

  /**
   * Decodes a genesis document response from the raw JSON-RPC response.
   *
   * @param response - Raw JSON-RPC success response from genesis method
   * @returns Decoded genesis document with chain ID, validators, and initial state
   */
  public static decodeGenesis(response: JsonRpcSuccessResponse): responses.GenesisResponse {
    return decodeGenesis(assertObject((response.result as GenesisResult).genesis));
  }

  /**
   * Decodes a health check response.
   *
   * The health endpoint returns an empty response on success, so this always returns null.
   * Errors are handled at the RPC level and would throw before reaching this decoder.
   *
   * @returns Always null, indicating the node is healthy
   */
  public static decodeHealth(): responses.HealthResponse {
    return null;
  }

  /**
   * Decodes a network info response from the raw JSON-RPC response.
   *
   * @param response - Raw JSON-RPC success response from net_info method
   * @returns Decoded network information with peer details and listening status
   */
  public static decodeNetInfo(response: JsonRpcSuccessResponse): responses.NetInfoResponse {
    return decodeNetInfoResponse(response.result as RpcNetInfoResponse);
  }

  /**
   * Decodes an unconfirmed transactions response from the raw JSON-RPC response.
   *
   * @param response - Raw JSON-RPC success response from unconfirmed_txs method
   * @returns Decoded unconfirmed transactions with count and size information
   */
  public static decodeUnconfirmedTxs(
    response: JsonRpcSuccessResponse,
  ): responses.UnconfirmedTxsResponse {
    return decodeUnconfirmedTxs(response.result as RpcUnconfirmedTxsResponse);
  }

  /**
   * Decodes a node status response from the raw JSON-RPC response.
   *
   * @param response - Raw JSON-RPC success response from status method
   * @returns Decoded status with node info, sync info, and validator info
   */
  public static decodeStatus(response: JsonRpcSuccessResponse): responses.StatusResponse {
    return decodeStatus(response.result as RpcStatusResponse);
  }

  /**
   * Decodes a new block event from WebSocket subscription.
   *
   * @param event - Subscription event containing block data
   * @returns Decoded block from the event
   */
  public static decodeNewBlockEvent(event: SubscriptionEvent): responses.Block {
    return decodeBlock(event.data.value.block as RpcBlock);
  }

  /**
   * Decodes a new block header event from WebSocket subscription.
   *
   * @param event - Subscription event containing header data
   * @returns Decoded block header from the event
   */
  public static decodeNewBlockHeaderEvent(event: SubscriptionEvent): responses.Header {
    return decodeHeader(event.data.value.header as RpcHeader);
  }

  /**
   * Decodes a transaction event from WebSocket subscription.
   *
   * @param event - Subscription event containing transaction result
   * @returns Decoded transaction event with hash and execution results
   */
  public static decodeTxEvent(event: SubscriptionEvent): responses.TxEvent {
    return decodeTxEvent(event.data.value.TxResult as RpcTxEvent);
  }

  /**
   * Decodes a transaction query response.
   *
   * @param response - Raw JSON-RPC success response from tx method
   * @returns Decoded transaction with data, hash, height, and execution results
   */
  public static decodeTx(response: JsonRpcSuccessResponse): responses.TxResponse {
    return decodeTxResponse(response.result as RpcTxResponse);
  }

  /**
   * Decodes a transaction search response from the raw JSON-RPC response.
   *
   * @param response - Raw JSON-RPC success response from tx_search method
   * @returns Decoded search results with total count and transaction list
   */
  public static decodeTxSearch(response: JsonRpcSuccessResponse): responses.TxSearchResponse {
    return decodeTxSearch(response.result as RpcTxSearchResponse);
  }

  /**
   * Decodes a validators query response.
   *
   * @param response - Raw JSON-RPC success response from validators method
   * @returns Decoded validator set with voting power and public keys
   */
  public static decodeValidators(response: JsonRpcSuccessResponse): responses.ValidatorsResponse {
    return decodeValidators(response.result as RpcValidatorsResponse);
  }
}
