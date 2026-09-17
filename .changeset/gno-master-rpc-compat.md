---
"@gnolang/tm2-rpc": major
---

Update RPC response decoding for the latest gnolang/gno (tm2) nodes.

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
