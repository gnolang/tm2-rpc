import {
  Sha256, sha256,
} from "@cosmjs/crypto";

import {
  encodeBlockId,
  encodeBytes,
  encodeString,
  encodeTime,
  encodeUvarint,
} from "./encodings.js";
import {
  Header,
} from "./responses.js";

/**
 * Computes the hash of a transaction.
 *
 * Tendermint uses SHA-256 to hash transactions. This is used to generate
 * transaction IDs and for building the data hash in block headers.
 *
 * Reference: https://github.com/tendermint/tendermint/blob/master/UPGRADING.md#v0260
 *
 * @param tx - Raw transaction bytes to hash
 * @returns SHA-256 hash of the transaction
 *
 * @example
 * ```typescript
 * const txBytes = new Uint8Array([...]);
 * const txHash = hashTx(txBytes);
 * console.log(`Transaction ID: ${toHex(txHash)}`);
 * ```
 */
export function hashTx(tx: Uint8Array): Uint8Array {
  return sha256(tx);
}

/**
 * Calculates the split point for binary tree construction in Merkle trees.
 *
 * Determines where to split a list of items when building a binary Merkle tree.
 * The algorithm ensures a balanced tree by finding the largest power of 2 that
 * creates two non-empty subtrees.
 *
 * @param n - Number of items to split
 * @returns Index where to split the items
 * @throws Error if n is less than 1
 */
function getSplitPoint(n: number): number {
  if (n < 1) throw new Error("Cannot split an empty tree");
  const largestPowerOf2 = 2 ** Math.floor(Math.log2(n));
  return largestPowerOf2 < n ? largestPowerOf2 : largestPowerOf2 / 2;
}

/**
 * Hashes a leaf node in a Merkle tree.
 *
 * Leaf nodes are prefixed with a 0 byte before hashing to distinguish
 * them from inner nodes in the Merkle tree structure.
 *
 * @param leaf - The leaf data to hash
 * @returns SHA-256 hash of the leaf with prefix
 */
function hashLeaf(leaf: Uint8Array): Uint8Array {
  const hash = new Sha256(Uint8Array.from([0]));
  hash.update(leaf);
  return hash.digest();
}

/**
 * Hashes an inner node in a Merkle tree.
 *
 * Inner nodes are prefixed with a 1 byte and consist of the concatenated
 * hashes of their left and right child nodes.
 *
 * @param left - Hash of the left child node
 * @param right - Hash of the right child node
 * @returns SHA-256 hash of the inner node with prefix
 */
function hashInner(left: Uint8Array, right: Uint8Array): Uint8Array {
  const hash = new Sha256(Uint8Array.from([1]));
  hash.update(left);
  hash.update(right);
  return hash.digest();
}

/**
 * Computes the Merkle tree root hash from a list of items.
 *
 * Builds a binary Merkle tree recursively by:
 * 1. Single item: hash as leaf node
 * 2. Multiple items: split list, hash subtrees, combine as inner node
 *
 * This follows Tendermint's Merkle tree specification for computing
 * data hashes in block headers.
 *
 * Reference: https://github.com/tendermint/tendermint/blob/v0.31.8/docs/spec/blockchain/encoding.md#merkleroot
 *
 * @param hashes - Array of data items to build tree from (not necessarily hashes yet)
 * @returns Root hash of the Merkle tree
 * @throws Error if the array is empty
 */
function hashTree(hashes: readonly Uint8Array[]): Uint8Array {
  switch (hashes.length) {
    case 0:
      throw new Error("Cannot hash empty tree");
    case 1:
      return hashLeaf(hashes[0]);
    default: {
      const slicePoint = getSplitPoint(hashes.length);
      const left = hashTree(hashes.slice(0, slicePoint));
      const right = hashTree(hashes.slice(slicePoint));
      return hashInner(left, right);
    }
  }
}

/**
 * Computes the hash of a block header.
 *
 * Encodes all header fields using Amino encoding and computes the Merkle tree
 * root hash. This hash serves as the unique identifier for the block and is
 * used in block IDs and validation.
 *
 * Note: Genesis blocks (height 1) are not currently supported because they
 * have no previous block ID. This is a known limitation.
 *
 * @param header - The block header to hash
 * @returns SHA-256 hash of the block header
 * @throws Error if the header has no lastBlockId (genesis block)
 *
 * @example
 * ```typescript
 * const blockResponse = await client.block(100);
 * const headerHash = hashBlock(blockResponse.block.header);
 * console.log(`Block hash: ${toHex(headerHash)}`);
 * ```
 */
export function hashBlock(header: Header): Uint8Array {
  if (!header.lastBlockId) {
    throw new Error(
      "Hashing a block header with no last block ID (i.e. header at height 1) is not supported. If you need this, contributions are welcome. Please add documentation and test vectors for this case.",
    );
  }

  // Encode all header fields in the order specified by Tendermint spec
  const encodedFields: readonly Uint8Array[] = [
    // Note: version encoding is commented out - may need to be added in future versions
    // encodeVersion(header.version),
    encodeString(header.chainId), encodeUvarint(header.height), encodeTime(header.time), encodeBlockId(header.lastBlockId), encodeBytes(header.lastCommitHash), encodeBytes(header.dataHash), encodeBytes(header.validatorsHash), encodeBytes(header.nextValidatorsHash), encodeBytes(header.consensusHash), encodeBytes(header.appHash), encodeBytes(header.lastResultsHash), encodeBytes(header.proposerAddress),
  ];

  return hashTree(encodedFields);
}
