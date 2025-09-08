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

// Encoder is a generic that matches all methods of Params
type Encoder<T extends requests.Request> = (req: T) => JsonRpcRequest;

// Decoder is a generic that matches all methods of Responses
type Decoder<T extends responses.Response> = (res: JsonRpcSuccessResponse) => T;

export class Tm2Client {
  /**
   * Creates a new Tendermint client for the given endpoint.
   *
   * Uses HTTP when the URL schema is http or https. Uses WebSockets otherwise.
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
   * Creates a new Tendermint client given an RPC client.
   */
  public static async create(rpcClient: RpcClient): Promise<Tm2Client> {
    return new Tm2Client(rpcClient);
  }

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

  private readonly client: RpcClient;

  /**
   * Use `Tendermint37Client.connect` or `Tendermint37Client.create` to create an instance.
   */
  private constructor(client: RpcClient) {
    this.client = client;
  }

  public disconnect(): void {
    this.client.disconnect();
  }

  public async abciInfo(): Promise<responses.AbciInfoResponse> {
    const query: requests.AbciInfoRequest = {
      method: requests.Method.AbciInfo,
    };
    return this.doCall(query, Params.encodeAbciInfo, Responses.decodeAbciInfo);
  }

  public async abciQuery(params: requests.AbciQueryParams): Promise<responses.AbciQueryResponse> {
    const query: requests.AbciQueryRequest = {
      params: params,
      method: requests.Method.AbciQuery,
    };
    return this.doCall(query, Params.encodeAbciQuery, Responses.decodeAbciQuery);
  }

  public async block(height?: number): Promise<responses.BlockResponse> {
    const query: requests.BlockRequest = {
      method: requests.Method.Block,
      params: {
        height: height,
      },
    };
    return this.doCall(query, Params.encodeBlock, Responses.decodeBlock);
  }

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

  public async commit(height?: number): Promise<responses.CommitResponse> {
    const query: requests.CommitRequest = {
      method: requests.Method.Commit,
      params: {
        height: height,
      },
    };
    return this.doCall(query, Params.encodeCommit, Responses.decodeCommit);
  }

  public async consensusParams(height?: number): Promise<responses.ConsensusParamsResponse> {
    const query: requests.ConsensusParamsRequest = {
      method: requests.Method.ConsensusParams,
      params: {
        height: height,
      },
    };
    return this.doCall(query, Params.encodeConsensusParams, Responses.decodeConsensusParams);
  }

  public async consensusState(): Promise<responses.ConsensusStateResponse> {
    const query: requests.ConsensusStateRequest = {
      method: requests.Method.ConsensusState,
    };
    return this.doCall(query, Params.encodeConsensusState, Responses.decodeConsensusState);
  }

  public async dumpConsensusState(): Promise<responses.DumpConsensusStateResponse> {
    const query: requests.DumpConsensusStateRequest = {
      method: requests.Method.DumpConsensusState,
    };
    return this.doCall(query, Params.encodeDumpConsensusState, Responses.decodeDumpConsensusState);
  }

  public async genesis(): Promise<responses.GenesisResponse> {
    const query: requests.GenesisRequest = {
      method: requests.Method.Genesis,
    };
    return this.doCall(query, Params.encodeGenesis, Responses.decodeGenesis);
  }

  public async health(): Promise<responses.HealthResponse> {
    const query: requests.HealthRequest = {
      method: requests.Method.Health,
    };
    return this.doCall(query, Params.encodeHealth, Responses.decodeHealth);
  }

  public async netInfo(): Promise<responses.NetInfoResponse> {
    const query: requests.NetInfoRequest = {
      method: requests.Method.NetInfo,
    };
    return this.doCall(query, Params.encodeNetInfo, Responses.decodeNetInfo);
  }

  public async numUnconfirmedTxs(): Promise<responses.UnconfirmedTxsResponse> {
    const query: requests.NumUnconfirmedTxsRequest = {
      method: requests.Method.NumUnconfirmedTxs,
    };
    return this.doCall(query, Params.encodeNumUnconfirmedTxs, Responses.decodeUnconfirmedTxs);
  }

  public async status(): Promise<responses.StatusResponse> {
    const query: requests.StatusRequest = {
      method: requests.Method.Status,
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

  public async unconfirmedTxs(limit: number): Promise<responses.UnconfirmedTxsResponse> {
    const query: requests.UnconfirmedTxsRequest = {
      method: requests.Method.UnconfirmedTxs,
      params: {
        limit,
      },
    };
    return this.doCall(query, Params.encodeUnconfirmedTxs, Responses.decodeUnconfirmedTxs);
  }

  public async validators(params: requests.ValidatorsParams): Promise<responses.ValidatorsResponse> {
    const query: requests.ValidatorsRequest = {
      method: requests.Method.Validators,
      params: params,
    };
    return this.doCall(query, Params.encodeValidators, Responses.decodeValidators);
  }

  // doCall is a helper to handle the encode/call/decode logic
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
