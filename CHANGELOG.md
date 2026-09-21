# @gnolang/tm2-rpc

## 2.0.2

### Patch Changes

- [#15](https://github.com/gnolang/tm2-rpc/pull/15) [`e6f99d3`](https://github.com/gnolang/tm2-rpc/commit/e6f99d3294c2ade1fd89aef6b1e8ebe8af0287a5) Thanks [@clockworkgr](https://github.com/clockworkgr)! - Update the `@cosmjs/*` runtime dependencies to 0.39.0.

## 2.0.1

### Patch Changes

- [#8](https://github.com/gnolang/tm2-rpc/pull/8) [`2c2febc`](https://github.com/gnolang/tm2-rpc/commit/2c2febc6133fbfc5f9b15c51e7d511844c237ec7) Thanks [@clockworkgr](https://github.com/clockworkgr)! - Fix validator address decoding in `status`, `validators`, `genesis` and `dumpConsensusState` responses when `@scure/base` 2.3.0 or later is installed. `fromBech32` from `@cosmjs/encoding` defaults its length limit to `Infinity`, which newer `@scure/base` rejects with `RangeError: limit: expected safe integer, got Infinity`; an explicit safe-integer limit is now passed instead.

## 2.0.0

### Major Changes

- [#5](https://github.com/gnolang/tm2-rpc/pull/5) [`c8c3c3f`](https://github.com/gnolang/tm2-rpc/commit/c8c3c3f7e78d3f355d673b43611a5cd20bc2d9db) Thanks [@clockworkgr](https://github.com/clockworkgr)! - Update RPC response decoding for the latest gnolang/gno (tm2) nodes.

  **Breaking changes**

  - `BroadcastTxSyncResponse` now matches what the node returns: `{ error, data, log, hash }` instead of `responseBase`/`gasWanted`/`gasUsed`. `broadcastTxSyncSuccess` checks `error`.
  - `ResponseBase.error` is typed as `AbciError | null` (`null` on success, `{ "@type": ... }` on failure) instead of a non-nullable `{ "@type", value }`.
  - `Event.type` and `Event.pkg_path` are optional, since events such as `/bank.TransferEvent`, `/tm.StorageDepositEvent` and `/tm.StorageUnlockEvent` don't carry them. Their own fields are available through the index signature, and `attrs` is always set.
  - The `PeerRoundState` vote bit arrays (`proposalPol`, `prevotes`, `precommits`, `lastCommit`, `catchupCommit`) are typed as `BitArray | null`.

  **Fixes**

  - `blockResults` and `tx` no longer throw on transactions that emit events without a `pkg_path`, such as the `/bank.TransferEvent` emitted for every ugnot transfer.
  - `broadcastTxSync` and `broadcastTxAsync` no longer throw when decoding the node's response.
  - `dumpConsensusState` skips peers that have no consensus state yet and accepts peers whose vote bit arrays are nil.
  - `genesis` accepts validators with an empty name.

  **Features**

  - `status` exposes the node's `buildVersion`.
  - `genesis` exposes `initialHeight` for chains restarted through a hardfork.
  - New exported `AbciError` type.
