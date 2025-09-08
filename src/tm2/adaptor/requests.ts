import {
  toBase64, toHex,
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

function encodeAbciQueryParams(params: requests.AbciQueryParams): RpcAbciQueryParams {
  return {
    path: assertNotEmpty(params.path),
    data: toHex(params.data),
    height: may(smallIntToApi, params.height),
    prove: params.prove,
  };
}

function encodeBlockchainRequestParams(param: requests.BlockchainRequestParams): RpcBlockchainRequestParams {
  return {
    minHeight: may(smallIntToApi, param.minHeight),
    maxHeight: may(smallIntToApi, param.maxHeight),
  };
}

function encodeBroadcastTxParams(params: requests.BroadcastTxParams): RpcBroadcastTxParams {
  return {
    tx: toBase64(assertNotEmpty(params.tx)),
  };
}

function encodeHeightParam(param: HeightParam): RpcHeightParam {
  return {
    height: may(smallIntToApi, param.height),
  };
}

function encodeStatusParams(params?: requests.StatusParams): RpcStatusParams {
  return {
    heightGte: may(smallIntToApi, params?.heightGte),
  };
}

function encodeTxParams(params: requests.TxParams): RpcTxParams {
  return {
    hash: toBase64(assertNotEmpty(params.hash)),
  };
}

function encodeUnconfirmedTxsParams(params: requests.UnconfirmedTxsParams): RpcUnconfirmedTxsParams {
  return {
    limit: may(smallIntToApi, params.limit),
  };
}

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

  public static encodeBlockchain(req: requests.BlockchainRequest): JsonRpcRequest {
    return createJsonRpcRequest(req.method, encodeBlockchainRequestParams(req.params));
  }

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

  public static encodeCommit(req: requests.CommitRequest): JsonRpcRequest {
    return createJsonRpcRequest(req.method, encodeHeightParam(req.params));
  }

  public static encodeConsensusParams(req: requests.ConsensusParamsRequest): JsonRpcRequest {
    return createJsonRpcRequest(req.method, encodeHeightParam(req.params));
  }

  public static encodeConsensusState(req: requests.ConsensusStateRequest): JsonRpcRequest {
    return createJsonRpcRequest(req.method);
  }

  public static encodeDumpConsensusState(req: requests.DumpConsensusStateRequest): JsonRpcRequest {
    return createJsonRpcRequest(req.method);
  }

  public static encodeGenesis(req: requests.GenesisRequest): JsonRpcRequest {
    return createJsonRpcRequest(req.method);
  }

  public static encodeHealth(req: requests.HealthRequest): JsonRpcRequest {
    return createJsonRpcRequest(req.method);
  }

  public static encodeNetInfo(req: requests.NetInfoRequest): JsonRpcRequest {
    return createJsonRpcRequest(req.method);
  }

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
