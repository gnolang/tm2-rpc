import util from "util";

import {
  connectTm2,
} from "./tendermintclient";

export {
  pubkeyToAddress,
  pubkeyToRawAddress,
  rawEd25519PubkeyToRawAddress,
  rawSecp256k1PubkeyToRawAddress,
} from "./addresses";
export {
  DateTime,
  fromRfc3339WithNanoseconds,
  fromSeconds,
  type ReadonlyDateWithNanoseconds,
  toRfc3339WithNanoseconds,
  toSeconds,
} from "./dates";
// The public Tendermint34Client.create constructor allows manually choosing an RpcClient.
// This is currently the only way to switch to the HttpBatchClient (which may become default at some point).
// Due to this API, we make RPC client implementations public.
export type {
  HttpBatchClientOptions, HttpEndpoint, RpcClient,
} from "./rpcclients";
export {
  HttpBatchClient, HttpClient, WebsocketClient,
} from "./rpcclients";
export {
  connectTm2,
} from "./tendermintclient";
export * from "./tm2";
export type {
  CommitSignature,
  ValidatorEd25519Pubkey,
  ValidatorPubkey,
  ValidatorSecp256k1Pubkey,
} from "./types";
export {
  BlockIdFlag,
} from "./types";

const init = async () => {
  const client = await connectTm2("http://localhost:26657/");
  /*
  console.log(util.inspect(await client.abciInfo(), {
    depth: null,
  }));
  console.log(util.inspect(await client.block(123), {
    depth: null,
  }));
  console.log(util.inspect(await client.blockResults(1234), {
    depth: null,
  }));
  console.log(util.inspect(await client.blockchain(123, 124), {
    depth: null,
  }));
  console.log(util.inspect(await client.commit(123), {
    depth: null,
  }));
  console.log(util.inspect(await client.consensusParams(123), {
    depth: null,
  }));
  console.log(util.inspect(await client.consensusState(), {
    depth: null,
  }));
  console.log(util.inspect(await client.dumpConsensusState(), {
    depth: null,
  }));
  console.log(util.inspect(await client.genesis(), {
    depth: null,
  }));
  console.log(util.inspect(await client.health(), {
    depth: null,
  }));
  */

  console.log(util.inspect(await client.netInfo(), {
    depth: null,
  }));
};
init();
