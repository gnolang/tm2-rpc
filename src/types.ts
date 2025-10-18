// Types in this file are exported outside of the @cosmjs/tendermint-rpc package,
// e.g. as part of a request or response

import {
  ReadonlyDateWithNanoseconds,
} from "./dates.js";

/**
 * Represents a commit signature from a validator for a specific block.
 *
 * Contains the validator's signature and associated metadata used in
 * Tendermint consensus to commit to a block.
 */
export interface CommitSignature {
  /** If this is BlockIdFlag.Absent, all other fields are expected to be unset */
  blockIdFlag: BlockIdFlag
  /** The validator's address (20 bytes), undefined if absent */
  validatorAddress: Uint8Array | undefined
  /** Timestamp when the signature was created, undefined if absent */
  timestamp: ReadonlyDateWithNanoseconds | undefined
  /** The actual cryptographic signature bytes, undefined if absent */
  signature: Uint8Array | undefined
}

/**
 * Represents a time duration with nanosecond precision.
 *
 * Compatible with protobuf Duration type, allowing representation
 * of time spans with both second and nanosecond components.
 */
export interface Duration {
  /** The number of seconds in the duration */
  seconds: bigint
  /** The nanosecond component (0-999,999,999) */
  nanos: number
}

/**
 * Represents an Ed25519 public key used by a Tendermint validator.
 *
 * Ed25519 is the default signature algorithm in Tendermint consensus.
 */
export interface ValidatorEd25519Pubkey {
  /** The cryptographic algorithm identifier */
  readonly algorithm: "ed25519"
  /** The 32-byte Ed25519 public key */
  readonly data: Uint8Array
}

/**
 * Represents a secp256k1 public key used by a Tendermint validator.
 *
 * Secp256k1 is the elliptic curve used in Bitcoin and supported in Tendermint.
 */
export interface ValidatorSecp256k1Pubkey {
  /** The cryptographic algorithm identifier */
  readonly algorithm: "secp256k1"
  /** The 33-byte compressed secp256k1 public key */
  readonly data: Uint8Array
}

/**
 * Union type for all supported validator public key types.
 *
 * Allows type-safe handling of different cryptographic algorithms
 * used by Tendermint validators.
 */
export type ValidatorPubkey = ValidatorEd25519Pubkey | ValidatorSecp256k1Pubkey;

/**
 * Enumeration of possible block ID flags used in commit signatures.
 *
 * These flags indicate the validator's participation status in consensus:
 * - Unknown: Default/uninitialized state
 * - Absent: Validator did not participate
 * - Commit: Validator committed to the block
 * - Nil: Validator voted nil (against the block)
 * - Unrecognized: Invalid/unknown flag value
 */
export enum BlockIdFlag {
  /** Default/uninitialized state */
  Unknown = 0,
  /** Validator did not participate in this block */
  Absent = 1,
  /** Validator committed to this block */
  Commit = 2,
  /** Validator voted nil (against this block) */
  Nil = 3,
  /** Invalid or unrecognized flag value */
  Unrecognized = -1,
}
