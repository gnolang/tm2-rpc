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
  const client = await connectTm2("http://localhost:26657");
  console.log(await client.block(2));
};
init();
