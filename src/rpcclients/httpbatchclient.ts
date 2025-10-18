import {
  isJsonRpcErrorResponse,
  JsonRpcRequest,
  JsonRpcSuccessResponse,
  parseJsonRpcResponse,
} from "@cosmjs/json-rpc";

import {
  http,
} from "./http.js";
import {
  HttpEndpoint,
} from "./httpclient.js";
import {
  hasProtocol, RpcClient,
} from "./rpcclient.js";

export interface HttpBatchClientOptions {
  /** Interval for dispatching batches (in milliseconds) */
  dispatchInterval: number
  /** Max number of items sent in one request */
  batchSizeLimit: number
}

// Those values are private and can change any time.
// Does a user need to know them? I don't think so. You either set
// a custom value or leave the option field unset.
const defaultHttpBatchClientOptions: HttpBatchClientOptions = {
  dispatchInterval: 20,
  batchSizeLimit: 20,
};

export class HttpBatchClient implements RpcClient {
  protected readonly url: string;
  protected readonly headers: Record<string, string> | undefined;
  protected readonly options: HttpBatchClientOptions;
  private timer?: NodeJS.Timeout;

  private readonly queue: Array<{
    request: JsonRpcRequest
    resolve: (a: JsonRpcSuccessResponse) => void
    reject: (a: Error) => void
  }> = [];

  /**
   * Creates a new HTTP batch client for JSON-RPC requests.
   *
   * Automatically batches requests and sends them at regular intervals to improve
   * performance when making many concurrent RPC calls.
   *
   * @param endpoint - The RPC endpoint URL or HttpEndpoint configuration
   * @param options - Optional configuration for batch behavior
   * @throws Error if the endpoint URL is missing a protocol
   */
  public constructor(endpoint: string | HttpEndpoint, options: Partial<HttpBatchClientOptions> = {
  }) {
    this.options = {
      batchSizeLimit: options.batchSizeLimit ?? defaultHttpBatchClientOptions.batchSizeLimit,
      dispatchInterval: options.dispatchInterval ?? defaultHttpBatchClientOptions.dispatchInterval,
    };
    if (typeof endpoint === "string") {
      if (!hasProtocol(endpoint)) {
        throw new Error("Endpoint URL is missing a protocol. Expected 'https://' or 'http://'.");
      }
      this.url = endpoint;
    }
    else {
      this.url = endpoint.url;
      this.headers = endpoint.headers;
    }
    this.timer = setInterval(() => this.tick(), options.dispatchInterval);
    this.validate();
  }

  /**
   * Disconnects the client and cleans up resources.
   *
   * Stops the internal timer that dispatches batched requests. Call this method
   * when you're done using the client to prevent memory leaks.
   */
  public disconnect(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = undefined;
  }

  /**
   * Executes a JSON-RPC request using the batching mechanism.
   *
   * Adds the request to the internal queue and returns a promise that resolves
   * when the request is processed. If the queue reaches the batch size limit,
   * the batch is immediately dispatched.
   *
   * @param request - The JSON-RPC request to execute
   * @returns Promise that resolves with the JSON-RPC response
   * @throws Error if the request fails or returns a JSON-RPC error
   */
  public async execute(request: JsonRpcRequest): Promise<JsonRpcSuccessResponse> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        request,
        resolve,
        reject,
      });

      if (this.queue.length >= this.options.batchSizeLimit) {
        // this train is full, let's go
        this.tick();
      }
    });
  }

  /**
   * Validates the client configuration options.
   *
   * @throws Error if batchSizeLimit is not a safe positive integer
   */
  private validate(): void {
    if (
      !this.options.batchSizeLimit
      || !Number.isSafeInteger(this.options.batchSizeLimit)
      || this.options.batchSizeLimit < 1
    ) {
      throw new Error("batchSizeLimit must be a safe integer >= 1");
    }
  }

  /**
   * Processes the current batch of queued requests.
   *
   * This is called on an interval where promise rejections cannot be handled,
   * so this is not async and HTTP errors need to be handled by the queued promises.
   * Sends up to batchSizeLimit requests in a single HTTP call.
   */
  private tick(): void {
    // Avoid race conditions
    const batch = this.queue.splice(0, this.options.batchSizeLimit);

    if (!batch.length) return;

    const requests = batch.map(s => s.request);
    const requestIds = requests.map(request => request.id);

    http("POST", this.url, this.headers, requests).then(
      (raw) => {
        // Requests with a single entry return as an object
        const arr = Array.isArray(raw) ? raw : [raw];

        arr.forEach((el) => {
          const req = batch.find(s => s.request.id === el.id);
          if (!req) return;
          const {
            reject, resolve,
          } = req;
          const response = parseJsonRpcResponse(el);
          if (isJsonRpcErrorResponse(response)) {
            reject(new Error(JSON.stringify(response.error)));
          }
          else {
            resolve(response);
          }
        });
      },
      (error) => {
        for (const requestId of requestIds) {
          const req = batch.find(s => s.request.id === requestId);
          if (!req) return;
          req.reject(error);
        }
      },
    );
  }
}
