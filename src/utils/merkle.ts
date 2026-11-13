/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { sha256Sync } from './crypto';
import type { MerkleProof, MerkleProofStep } from '../types';

/**
 * Computes hash of a pair of sibling nodes in the Merkle Tree
 */
export function hashPair(left: string, right: string): string {
  return sha256Sync(left + right);
}

/**
 * Computes the Merkle Root for an array of transaction hashes.
 * If empty, returns a canonical genesis null hash.
 * If odd number of nodes at any level, duplicates the last node (standard Bitcoin/RFC 6962 pattern).
 */
export function buildMerkleTree(hashes: string[]): { root: string; levels: string[][] } {
  if (hashes.length === 0) {
    const emptyRoot = sha256Sync('MERKLE_TREE_EMPTY_LEAF');
    return { root: emptyRoot, levels: [[emptyRoot]] };
  }

  const levels: string[][] = [];
  let currentLevel = [...hashes];
  levels.push(currentLevel);

  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
      nextLevel.push(hashPair(left, right));
    }
    levels.push(nextLevel);
    currentLevel = nextLevel;
  }

  return {
    root: levels[levels.length - 1][0],
    levels
  };
}

/**
 * Computes Merkle inclusion proof for a leaf at a given index.
 */
export function generateMerkleProof(
  hashes: string[],
  leafIndex: number,
  epochId: number
): MerkleProof {
  if (leafIndex < 0 || leafIndex >= hashes.length) {
    throw new Error(`Leaf index ${leafIndex} out of bounds (0-${hashes.length - 1})`);
  }

  const { root, levels } = buildMerkleTree(hashes);
  const path: MerkleProofStep[] = [];
  let currentIndex = leafIndex;

  for (let levelIdx = 0; levelIdx < levels.length - 1; levelIdx++) {
    const level = levels[levelIdx];
    const isRightNode = currentIndex % 2 === 1;
    const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;

    let siblingHash: string;
    if (siblingIndex < level.length) {
      siblingHash = level[siblingIndex];
    } else {
      // Duplicated odd node
      siblingHash = level[currentIndex];
    }

    path.push({
      position: isRightNode ? 'left' : 'right',
      hash: siblingHash
    });

    currentIndex = Math.floor(currentIndex / 2);
  }

  const targetHash = hashes[leafIndex];
  const verified = verifyMerkleProof(targetHash, path, root);

  return {
    txHash: targetHash,
    txIndex: leafIndex,
    epochId,
    merkleRoot: root,
    path,
    verified
  };
}

/**
 * Verifies that a transaction hash belongs to the given Merkle Root using the proof path
 */
export function verifyMerkleProof(
  leafHash: string,
  path: MerkleProofStep[],
  expectedRoot: string
): boolean {
  let currentHash = leafHash;

  for (const step of path) {
    if (step.position === 'left') {
      currentHash = hashPair(step.hash, currentHash);
    } else {
      currentHash = hashPair(currentHash, step.hash);
    }
  }

  return currentHash === expectedRoot;
}
