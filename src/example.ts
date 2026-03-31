import {
  fromBase64,
} from "@cosmjs/encoding";
import util from "util";

import {
  connectTm2,
} from "./tendermintclient.js";

/**
 * Initializes a connection to a Tendermint2 RPC endpoint and demonstrates various API calls.
 *
 * This function connects to the test network and executes a series of RPC method calls
 * to showcase the functionality of the Tm2 client, including querying blockchain info,
 * blocks, validators, transactions, and network status.
 */
const init = async () => {
  const client = await connectTm2("wss://rpc.betanet.testnets.gno.land");

  console.log(util.inspect(await client.abciInfo(), {
    depth: null,
  }));
  console.log(util.inspect(await client.block(2), {
    depth: null,
  }));
  console.log(util.inspect(await client.blockResults(2), {
    depth: null,
  }));
  console.log(util.inspect(await client.blockchain(2, 3), {
    depth: null,
  }));
  console.log(util.inspect(await client.commit(2), {
    depth: null,
  }));
  console.log(util.inspect(await client.consensusParams(2), {
    depth: null,
  }));
  console.log(util.inspect(await client.consensusState(), {
    depth: null,
  }));
  console.log(util.inspect(await client.dumpConsensusState(), {
    depth: null,
  }));
  /**
   *  console.log(util.inspect(await client.genesis(), {
   *    depth: null,
   *   }));
   **/
  console.log(util.inspect(await client.health(), {
    depth: null,
  }));
  console.log(util.inspect(await client.netInfo(), {
    depth: null,
  }));
  console.log(util.inspect(await client.numUnconfirmedTxs(), {
    depth: null,
  }));
  console.log(util.inspect(await client.status(), {
    depth: null,
  }));
  console.log(util.inspect(await client.status({
    heightGte: 2,
  }), {
    depth: null,
  }));
  console.log(util.inspect(await client.unconfirmedTxs(10), {
    depth: null,
  }));
  console.log(util.inspect(await client.validators({
    height: 2,
  }), {
    depth: null,
  }));

  console.log(util.inspect(await client.abciQuery({
    path: ".store/main/key",
    data: fromBase64("Z2FzUHJpY2U="),
    height: 2,
    prove: true,
  }), {
    depth: null,
  }));

  const client2 = await connectTm2("https://rpc.betanet.testnets.gno.land");
  console.log(util.inspect(await client2.tx({
    hash: fromBase64("yae+vMzUj2K7bAvoGaAM/MqlYeFUER/cZODy0QSoPo8="),
  }), {
    depth: null,
  }));
  process.exit(0);
};
init();
