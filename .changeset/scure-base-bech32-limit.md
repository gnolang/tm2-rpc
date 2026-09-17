---
"@gnolang/tm2-rpc": patch
---

Fix validator address decoding in `status`, `validators`, `genesis` and `dumpConsensusState` responses when `@scure/base` 2.3.0 or later is installed. `fromBech32` from `@cosmjs/encoding` defaults its length limit to `Infinity`, which newer `@scure/base` rejects with `RangeError: limit: expected safe integer, got Infinity`; an explicit safe-integer limit is now passed instead.
