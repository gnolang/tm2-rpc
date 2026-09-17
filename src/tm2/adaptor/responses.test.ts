/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  fromBase64,
  toBase64,
  toUtf8,
} from "@cosmjs/encoding";
import {
  JsonRpcSuccessResponse,
} from "@cosmjs/json-rpc";
import {
  describe,
  expect,
  test,
} from "vitest";

import {
  broadcastTxSyncSuccess,
} from "../responses.js";
import {
  Responses,
} from "./responses.js";

// Payloads below are trimmed from responses of a gnoland node built from gnolang/gno master.

const rpcResponse = (result: any): JsonRpcSuccessResponse => ({
  jsonrpc: "2.0",
  id: 1,
  result,
});

const emptyResponseBase = {
  ResponseBase: {
    Error: null,
    Data: null,
    Events: null,
    Log: "",
    Info: "",
  },
};

const validatorAddress = "g1ts7jplv6dfx4p02af03aeth8ck5d3zc2dzf0hw";

const validatorPubKey = {
  "@type": "/tm.PubKeyEd25519",
  value: "mayNJ5sXw9njvrm0Hl4WGPIxSsLxt6PqQhzAD2WIlfI=",
};

const blockResults = (deliverTx: any[]) => rpcResponse({
  height: "12",
  results: {
    deliver_tx: deliverTx,
    end_block: {
      ...emptyResponseBase,
      ValidatorUpdates: null,
      ConsensusParams: null,
      Events: null,
    },
    begin_block: emptyResponseBase,
  },
});

describe("Responses events", () => {
  test("decodes realm, storage deposit and bank transfer events", () => {
    const res = Responses.decodeBlockResults(blockResults([
      {
        ResponseBase: {
          Error: null,
          Data: "KGZhbHNlIGJvb2wpCgo=",
          Events: [
            {
              "@type": "/tm.Event",
              type: "ProfileFieldCreated",
              attrs: [
                {
                  key: "FieldType",
                  value: "StringField",
                },
              ],
              pkg_path: "gno.land/r/demo/profile",
            },
            {
              "@type": "/tm.StorageDepositEvent",
              bytes_delta: "2081",
              fee_delta: "208100ugnot",
              pkg_path: "gno.land/r/demo/profile",
            },
            {
              "@type": "/bank.TransferEvent",
              from: "g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5",
              to: "g1us8428u2a5satrlxzagqqa5m6vmuze025anjlj",
              coins: "1000ugnot",
            },
          ],
          Log: "msg:0,success:true,log:,events:[]",
          Info: "",
        },
        GasWanted: "20000000",
        GasUsed: "5689637",
      },
    ]));

    const [realm, deposit, transfer] = res.results.deliverTx[0].responseBase.events;
    expect(realm).toEqual({
      "@type": "/tm.Event",
      type: "ProfileFieldCreated",
      attrs: [
        {
          key: "FieldType",
          value: "StringField",
        },
      ],
      pkg_path: "gno.land/r/demo/profile",
    });
    expect(deposit).toStrictEqual({
      "@type": "/tm.StorageDepositEvent",
      bytes_delta: "2081",
      fee_delta: "208100ugnot",
      attrs: [],
      pkg_path: "gno.land/r/demo/profile",
    });
    expect(transfer).toStrictEqual({
      "@type": "/bank.TransferEvent",
      from: "g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5",
      to: "g1us8428u2a5satrlxzagqqa5m6vmuze025anjlj",
      coins: "1000ugnot",
      attrs: [],
    });
  });

  test("decodes a failed deliver tx error without value", () => {
    const res = Responses.decodeBlockResults(blockResults([
      {
        ResponseBase: {
          Error: {
            "@type": "/std.OutOfGasError",
          },
          Data: null,
          Events: null,
          Log: "gas used (1526201) exceeds tx's gas wanted (1500000)",
          Info: "",
        },
        GasWanted: "1500000",
        GasUsed: "1526201",
      },
    ]));

    expect(res.results.deliverTx[0].responseBase.error).toEqual({
      "@type": "/std.OutOfGasError",
    });
    expect(res.results.deliverTx[0].gasUsed).toBe(1526201n);
  });

  test("decodes block results without deliver txs", () => {
    const res = Responses.decodeBlockResults(blockResults(null as any));
    expect(res.results.deliverTx).toEqual([]);
  });
});

describe("Responses broadcast", () => {
  const hash = "A5BYxvLAy0ksUzsKTRTvd8wPeKvMztUofYShogEc+4E=";

  test("decodes a rejected broadcast_tx_sync result", () => {
    const res = Responses.decodeBroadcastTxSync(rpcResponse({
      error: {
        "@type": "/std.TxDecodeError",
      },
      data: null,
      log: "",
      hash,
    }));

    expect(res).toEqual({
      error: {
        "@type": "/std.TxDecodeError",
      },
      data: new Uint8Array(),
      log: "",
      hash: fromBase64(hash),
    });
    expect(broadcastTxSyncSuccess(res)).toBe(false);
  });

  test("decodes an accepted broadcast_tx_sync result", () => {
    const res = Responses.decodeBroadcastTxSync(rpcResponse({
      error: null,
      data: "AQI=",
      log: "",
      hash,
    }));

    expect(res.error).toBeNull();
    expect(res.data).toEqual(new Uint8Array([1, 2]));
    expect(broadcastTxSyncSuccess(res)).toBe(true);
  });

  test("decodes a broadcast_tx_async result", () => {
    const res = Responses.decodeBroadcastTxAsync(rpcResponse({
      error: null,
      data: null,
      log: "",
      hash,
    }));

    expect(res).toEqual({
      hash: fromBase64(hash),
    });
  });

  test("decodes a broadcast_tx_commit result with a failed check tx", () => {
    const res = Responses.decodeBroadcastTxCommit(rpcResponse({
      check_tx: {
        ResponseBase: {
          ...emptyResponseBase.ResponseBase,
          Error: {
            "@type": "/std.TxDecodeError",
          },
        },
        GasWanted: "0",
        GasUsed: "0",
      },
      deliver_tx: {
        ...emptyResponseBase,
        GasWanted: "0",
        GasUsed: "0",
      },
      hash,
      height: "0",
    }));

    expect(res.height).toBe(0);
    expect(res.checkTx.responseBase.error).toEqual({
      "@type": "/std.TxDecodeError",
    });
    expect(res.deliverTx?.responseBase.error).toBeNull();
  });
});

describe("Responses decodeStatus", () => {
  const status = {
    node_info: {
      version_set: [
        {
          Name: "abci",
          Version: "v1.0.0-rc.0",
          Optional: false,
        },
      ],
      net_address: "g10vux3ng0wvn9nyps5qr8cs53746fqgkreugecv@127.0.0.1:26656",
      network: "dev",
      software: "",
      version: "v1.0.0-rc.0",
      channels: "QCAhIiMwUA==",
      moniker: "node",
      other: {
        tx_index: "off",
        rpc_address: "tcp://127.0.0.1:26657",
      },
    },
    sync_info: {
      latest_block_hash: "RkSviBSKZNDg5AII2FM9mN7xdef3Is6iuSh3iGHKwwA=",
      latest_app_hash: "g0mmCkIM1W9pc3bEky8H4P9bYIMYEFtQFJsFn87yi5Y=",
      latest_block_height: "18",
      latest_block_time: "2026-09-17T09:37:42.701307Z",
      catching_up: false,
    },
    validator_info: {
      address: validatorAddress,
      pub_key: validatorPubKey,
      voting_power: "10",
    },
  };

  test("decodes build_version", () => {
    const res = Responses.decodeStatus(rpcResponse({
      ...status,
      build_version: "develop",
    }));

    expect(res.buildVersion).toBe("develop");
    expect(res.syncInfo.latestBlockHeight).toBe(18);
  });

  test("accepts nodes without build_version", () => {
    const res = Responses.decodeStatus(rpcResponse(status));
    expect(res.buildVersion).toBeUndefined();
  });
});

describe("Responses decodeGenesis", () => {
  const genesis = {
    genesis_time: "2026-09-17T09:36:13.486189Z",
    chain_id: "dev",
    consensus_params: {
      Block: {
        MaxTxBytes: "1000000",
        MaxDataBytes: "2000000",
        MaxBlockBytes: "0",
        MaxGas: "3000000000",
        TimeIotaMS: "100",
      },
      Validator: {
        PubKeyTypeURLs: ["/tm.PubKeyEd25519"],
      },
    },
    validators: [
      {
        address: validatorAddress,
        pub_key: validatorPubKey,
        power: "10",
        name: "testvalidator",
      },
    ],
    app_hash: null,
    app_state: {
      "@type": "/gno.GenesisState",
    },
  };

  test("decodes a genesis starting at height 1", () => {
    const res = Responses.decodeGenesis(rpcResponse({
      genesis,
    }));

    expect(res.initialHeight).toBeUndefined();
    expect(res.validators[0].name).toBe("testvalidator");
    expect(res.appHash).toEqual(new Uint8Array());
  });

  test("decodes initial_height and empty validator names", () => {
    const res = Responses.decodeGenesis(rpcResponse({
      genesis: {
        ...genesis,
        initial_height: "12345",
        validators: [
          {
            ...genesis.validators[0],
            name: "",
          },
        ],
      },
    }));

    expect(res.initialHeight).toBe(12345);
    expect(res.validators[0].name).toBe("");
  });
});

describe("Responses decodeDumpConsensusState", () => {
  const validatorInfo = {
    address: validatorAddress,
    pub_key: validatorPubKey,
    voting_power: "10",
    proposer_priority: "0",
  };
  const validatorSet = {
    validators: [validatorInfo],
    proposer: validatorInfo,
  };
  const peerState = (roundState: any) => toBase64(toUtf8(JSON.stringify({
    round_state: roundState,
    stats: {
      votes: "0",
      block_parts: "0",
    },
  })));
  const dump = (peers: any[]) => rpcResponse({
    config: {
      home: "/gnoland-data",
      wal_file: "wal/cs.wal/wal",
      priv_validator: {
        home: "/gnoland-data/secrets",
        sign_state: "priv_validator_state.json",
        local_signer: "priv_validator_key.json",
        remote_signer: {
          server_address: "",
          dial_max_retries: "-1",
          dial_retry_interval: "5s",
          dial_timeout: "5s",
          request_timeout: "5s",
          tcp_authorized_keys: [],
          tcp_keep_alive_period: "2s",
        },
        tmkms_listener: {
          listen_addr: "",
        },
      },
      timeout_propose: "3s",
    },
    round_state: {
      height: "64",
      round: "0",
      step: 1,
      start_time: "2026-09-17T09:41:39.217350Z",
      commit_time: "2026-09-17T09:41:34.217350Z",
      validators: validatorSet,
      proposal: null,
      proposal_block: null,
      proposal_block_parts: null,
      locked_round: "-1",
      locked_block: null,
      locked_block_parts: null,
      valid_round: "-1",
      valid_block: null,
      valid_block_parts: null,
      votes: {
      },
      commit_round: "-1",
      last_commit: {
      },
      last_validators: validatorSet,
      triggered_timeout_precommit: false,
    },
    peers,
  });

  test("skips peers without consensus state and accepts nil bit arrays", () => {
    const res = Responses.decodeDumpConsensusState(dump([
      {
        node_address: "",
        peer_state: null,
      },
      {
        node_address: "g1zz8mu9lf89xu4n3fys3x8p3f3gczq4838uzeh9@127.0.0.1:26656",
        peer_state: peerState({
          height: "64",
          round: "0",
          step: 1,
          start_time: "2026-09-17T09:41:38.616139Z",
          proposal: false,
          proposal_block_parts_header: {
            total: "0",
            hash: null,
          },
          proposal_block_parts: null,
          proposal_pol_round: "-1",
          proposal_pol: null,
          prevotes: {
            bits: "1",
            elems: ["0"],
          },
          precommits: null,
          last_commit_round: "-1",
          last_commit: null,
          catchup_commit_round: "-1",
          catchup_commit: null,
        }),
      },
    ]));

    expect(res.peers).toHaveLength(1);
    expect(res.peers[0].address).toBe("g1zz8mu9lf89xu4n3fys3x8p3f3gczq4838uzeh9");
    expect(res.peers[0].port).toBe(26656);
    expect(res.peers[0].roundState.height).toBe(64);
    expect(res.peers[0].roundState.proposalPol).toBeNull();
    expect(res.peers[0].roundState.prevotes).toEqual({
      bits: 1n,
      elems: [0n],
    });
    expect(res.peers[0].roundState.precommits).toBeNull();
    expect(res.peers[0].roundState.lastCommit).toBeNull();
    expect(res.peers[0].roundState.catchupCommit).toBeNull();
    expect(res.roundState.lockedRound).toBe(-1);
  });
});
