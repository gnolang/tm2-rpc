import {
  toBase64,
} from "@cosmjs/encoding";
import {
  JsonRpcRequest,
} from "@cosmjs/json-rpc";

import {
  smallIntToApi,
} from "../../inthelpers";
import {
  createJsonRpcRequest,
} from "../../jsonrpc";
import {
  assertNotEmpty, may,
} from "../encodings";
import * as requests from "../requests";

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

interface HeightParam {
  readonly height?: number
}

interface RpcAbciQueryParams {
  readonly path: string
  /** hex encoded */
  readonly data: string
  readonly height?: string
  readonly prove?: boolean
}

interface RpcBlockchainRequestParams {
  readonly minHeight?: string
  readonly maxHeight?: string
}

interface RpcBroadcastTxParams {
  /** base64 encoded */
  readonly tx: string
}

interface RpcHeightParam {
  readonly height?: string
}

interface RpcStatusParams {
  readonly heightGte?: string
}
interface RpcTxParams {
  /** base64 encoded */
  readonly hash: string
  readonly prove?: boolean
}

interface RpcUnconfirmedTxsParams {
  readonly limit?: string
}

interface RpcValidatorsParams {
  readonly height?: string
  readonly page?: string
  readonly per_page?: string
}

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Encodes ABCI query parameters for RPC transmission.
 *
 * @param params - The ABCI query parameters
 * @returns RPC-compatible ABCI query parameters
 */
function encodeAbciQueryParams(params: requests.AbciQueryParams): RpcAbciQueryParams {
  return {
    path: assertNotEmpty(params.path),
    data: toBase64(params.data),
    height: may(smallIntToApi, params.height),
    prove: params.prove,
  };
}

/**
 * Encodes blockchain request parameters for RPC transmission.
 *
 * @param param - The blockchain request parameters
 * @returns RPC-compatible blockchain request parameters
 */
function encodeBlockchainRequestParams(param: requests.BlockchainRequestParams): RpcBlockchainRequestParams {
  return {
    minHeight: may(smallIntToApi, param.minHeight),
    maxHeight: may(smallIntToApi, param.maxHeight),
  };
}

/**
 * Encodes broadcast transaction parameters for RPC transmission.
 *
 * @param params - The broadcast transaction parameters
 * @returns RPC-compatible broadcast transaction parameters with base64-encoded tx
 */
function encodeBroadcastTxParams(params: requests.BroadcastTxParams): RpcBroadcastTxParams {
  return {
    tx: toBase64(assertNotEmpty(params.tx)),
  };
}

/**
 * Encodes height parameter for RPC transmission.
 *
 * @param param - The height parameter
 * @returns RPC-compatible height parameter
 */
function encodeHeightParam(param: HeightParam): RpcHeightParam {
  return {
    height: may(smallIntToApi, param.height),
  };
}

/**
 * Encodes status request parameters for RPC transmission.
 *
 * @param params - The optional status parameters
 * @returns RPC-compatible status parameters
 */
function encodeStatusParams(params?: requests.StatusParams): RpcStatusParams {
  return {
    heightGte: may(smallIntToApi, params?.heightGte),
  };
}

/**
 * Encodes transaction query parameters for RPC transmission.
 *
 * @param params - The transaction parameters
 * @returns RPC-compatible transaction parameters with base64-encoded hash
 */
function encodeTxParams(params: requests.TxParams): RpcTxParams {
  return {
    hash: toBase64(assertNotEmpty(params.hash)),
  };
}

/**
 * Encodes unconfirmed transactions request parameters for RPC transmission.
 *
 * @param params - The unconfirmed transactions parameters
 * @returns RPC-compatible unconfirmed transactions parameters
 */
function encodeUnconfirmedTxsParams(params: requests.UnconfirmedTxsParams): RpcUnconfirmedTxsParams {
  return {
    limit: may(smallIntToApi, params.limit),
  };
}

/**
 * Encodes validators request parameters for RPC transmission.
 *
 * @param params - The validators parameters
 * @returns RPC-compatible validators parameters
 */
function encodeValidatorsParams(params: requests.ValidatorsParams): RpcValidatorsParams {
  return {
    height: may(smallIntToApi, params.height),
  };
}

// ============================================================================
// CLASSES
// ============================================================================

/**
 * Static class providing request encoders for all Tendermint RPC methods.
 *
 * This class contains methods that encode typed request objects into the
 * JSON-RPC format expected by Tendermint nodes. Each method handles:
 * - Converting numeric types to string format required by JSON-RPC
 * - Encoding binary data (Uint8Array) to base64 or hex as appropriate
 * - Wrapping parameters in the correct JSON-RPC request structure
 *
 * The encoders are used internally by the Tm2Client to convert application
 * requests into the wire format.
 */
export class Params {
  /**
   * Encodes an ABCI info request.
   *
   * @param req - ABCI info request (parameter-less)
   * @returns JSON-RPC request ready for transmission
   */
  public static encodeAbciInfo(req: requests.AbciInfoRequest): JsonRpcRequest {
    return createJsonRpcRequest(req.method);
  }

  /**
   * Encodes an ABCI query request with path, data, and options.
   *
   * @param req - ABCI query request with path, data, height, and proof options
   * @returns JSON-RPC request with encoded parameters
   */
  public static encodeAbciQuery(req: requests.AbciQueryRequest): JsonRpcRequest {
    return createJsonRpcRequest(req.method, encodeAbciQueryParams(req.params));
  }

  /**
   * Encodes a block query request.
   *
   * @param req - Block request with optional height parameter
   * @returns JSON-RPC request with height parameter (if specified)
   */
  public static encodeBlock(req: requests.BlockRequest): JsonRpcRequest {
    return createJsonRpcRequest(req.method, encodeHeightParam(req.params));
  }

  /**
   * Encodes a blockchain range request.
   *
   * @param req - Blockchain request with min/max height parameters
   * @returns JSON-RPC request with height range parameters
   */
  public static encodeBlockchain(req: requests.BlockchainRequest): JsonRpcRequest {
    return createJsonRpcRequest(req.method, encodeBlockchainRequestParams(req.params));
  }

  /**
   * Encodes a block results request.
   *
   * @param req - Block results request with optional height parameter
   * @returns JSON-RPC request with height parameter (if specified)
   */
  public static encodeBlockResults(req: requests.BlockResultsRequest): JsonRpcRequest {
    return createJsonRpcRequest(req.method, encodeHeightParam(req.params));
  }

  /**
   * Encodes a transaction broadcast request.
   *
   * @param req - Broadcast request with transaction bytes
   * @returns JSON-RPC request with base64-encoded transaction
   */
  public static encodeBroadcastTx(req: requests.BroadcastTxRequest): JsonRpcRequest {
    return createJsonRpcRequest(req.method, encodeBroadcastTxParams(req.params));
  }

  /**
   * Encodes a commit request.
   *
   * @param req - Commit request with optional height parameter
   * @returns JSON-RPC request with height parameter (if specified)
   */
  public static encodeCommit(req: requests.CommitRequest): JsonRpcRequest {
    return createJsonRpcRequest(req.method, encodeHeightParam(req.params));
  }

  /**
   * Encodes a consensus parameters request.
   *
   * @param req - Consensus parameters request with optional height parameter
   * @returns JSON-RPC request with height parameter (if specified)
   */
  public static encodeConsensusParams(req: requests.ConsensusParamsRequest): JsonRpcRequest {
    return createJsonRpcRequest(req.method, encodeHeightParam(req.params));
  }

  /**
   * Encodes a consensus state request.
   *
   * @param req - Consensus state request (parameter-less)
   * @returns JSON-RPC request ready for transmission
   */
  public static encodeConsensusState(req: requests.ConsensusStateRequest): JsonRpcRequest {
    return createJsonRpcRequest(req.method);
  }

  /**
   * Encodes a dump consensus state request.
   *
   * @param req - Dump consensus state request (parameter-less)
   * @returns JSON-RPC request ready for transmission
   */
  public static encodeDumpConsensusState(req: requests.DumpConsensusStateRequest): JsonRpcRequest {
    return createJsonRpcRequest(req.method);
  }

  /**
   * Encodes a genesis request.
   *
   * @param req - Genesis request (parameter-less)
   * @returns JSON-RPC request ready for transmission
   */
  public static encodeGenesis(req: requests.GenesisRequest): JsonRpcRequest {
    return createJsonRpcRequest(req.method);
  }

  /**
   * Encodes a health check request.
   *
   * @param req - Health request (parameter-less)
   * @returns JSON-RPC request ready for transmission
   */
  public static encodeHealth(req: requests.HealthRequest): JsonRpcRequest {
    return createJsonRpcRequest(req.method);
  }

  /**
   * Encodes a network info request.
   *
   * @param req - Network info request (parameter-less)
   * @returns JSON-RPC request ready for transmission
   */
  public static encodeNetInfo(req: requests.NetInfoRequest): JsonRpcRequest {
    return createJsonRpcRequest(req.method);
  }

  /**
   * Encodes a request for the number of unconfirmed transactions.
   *
   * @param req - Number of unconfirmed transactions request (parameter-less)
   * @returns JSON-RPC request ready for transmission
   */
  public static encodeNumUnconfirmedTxs(req: requests.NumUnconfirmedTxsRequest): JsonRpcRequest {
    return createJsonRpcRequest(req.method);
  }

  /**
   * Encodes a node status request.
   *
   * @param req - Status request (parameter-less)
   * @returns JSON-RPC request ready for transmission
   */
  public static encodeStatus(req: requests.StatusRequest): JsonRpcRequest {
    return createJsonRpcRequest(req.method, encodeStatusParams(req.params));
  }

  /**
   * Encodes a transaction query request.
   *
   * @param req - Transaction query request with hash parameter
   * @returns JSON-RPC request with base64-encoded transaction hash
   */
  public static encodeTx(req: requests.TxRequest): JsonRpcRequest {
    return createJsonRpcRequest(req.method, encodeTxParams(req.params));
  }

  /**
   * Encodes an unconfirmed transactions request.
   *
   * @param req - Unconfirmed transactions request with optional limit parameter
   * @returns JSON-RPC request with limit parameter (if specified)
   */
  public static encodeUnconfirmedTxs(req: requests.UnconfirmedTxsRequest): JsonRpcRequest {
    return createJsonRpcRequest(req.method, encodeUnconfirmedTxsParams(req.params));
  }

  /**
   * Encodes a validators query request.
   *
   * @param req - Validators request with optional height parameter
   * @returns JSON-RPC request with height parameter (if specified)
   */
  public static encodeValidators(req: requests.ValidatorsRequest): JsonRpcRequest {
    return createJsonRpcRequest(req.method, encodeValidatorsParams(req.params));
  }
}
