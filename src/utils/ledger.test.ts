/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { sha256Sync } from './crypto';
import { buildMerkleTree, generateMerkleProof, verifyMerkleProof } from './merkle';
import {
  GENESIS_HASH,
  computeTxDataHash,
  computeEntryHash,
  validateDoubleEntryLegs,
  verifyLedgerIntegrity
} from './ledger';
import type { Account, LedgerTransaction, MerkleEpoch } from '../types';

test('sha256Sync produces correct canonical hashes', () => {
  // Empty string SHA-256 NIST test vector
  const emptyHash = sha256Sync('');
  assert.equal(emptyHash, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');

  // "hello" SHA-256 test vector
  const helloHash = sha256Sync('hello');
  assert.equal(helloHash, '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
});

test('validateDoubleEntryLegs enforces debit equals credit', () => {
  const balanced = validateDoubleEntryLegs([
    { accountId: 'acc_1', accountName: 'Cash', type: 'DEBIT', amount: 5000, memo: '' },
    { accountId: 'acc_2', accountName: 'Revenue', type: 'CREDIT', amount: 5000, memo: '' }
  ]);
  assert.equal(balanced.isValid, true);
  assert.equal(balanced.diff, 0);

  const unbalanced = validateDoubleEntryLegs([
    { accountId: 'acc_1', accountName: 'Cash', type: 'DEBIT', amount: 5000, memo: '' },
    { accountId: 'acc_2', accountName: 'Revenue', type: 'CREDIT', amount: 4999, memo: '' }
  ]);
  assert.equal(unbalanced.isValid, false);
  assert.equal(unbalanced.diff, 1);
});

test('Merkle Tree builds valid roots and verifies inclusion proofs', () => {
  const leaves = [
    sha256Sync('tx_0'),
    sha256Sync('tx_1'),
    sha256Sync('tx_2'),
    sha256Sync('tx_3')
  ];

  const { root } = buildMerkleTree(leaves);
  assert.ok(root && root.length === 64, 'Merkle root must be a 64-character hex string');

  // Generate proof for tx_2
  const proof = generateMerkleProof(leaves, 2, 1);
  assert.equal(proof.verified, true);
  assert.equal(proof.merkleRoot, root);

  // Direct verification
  const isValid = verifyMerkleProof(leaves[2], proof.path, root);
  assert.equal(isValid, true);

  // Tampered leaf verification must fail
  const tamperedLeaf = sha256Sync('tampered_tx');
  const isTamperedValid = verifyMerkleProof(tamperedLeaf, proof.path, root);
  assert.equal(isTamperedValid, false);
});

test('verifyLedgerIntegrity audits clean chain and catches tampered blocks', () => {
  const accounts: Account[] = [
    {
      id: 'acc_a',
      accountNumber: 'BV-USD-001',
      accountName: 'Operating',
      entityName: 'Core Treasury',
      currency: 'USD',
      type: 'operating',
      status: 'active',
      balance: 10000,
      reservedBalance: 0,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    },
    {
      id: 'acc_b',
      accountNumber: 'BV-USD-002',
      accountName: 'Reserve Vault',
      entityName: 'Core Treasury',
      currency: 'USD',
      type: 'reserve',
      status: 'active',
      balance: -10000,
      reservedBalance: 0,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    }
  ];

  // Create tx 0 (Genesis block)
  const tx0Data = {
    id: 'tx_001',
    txIndex: 0,
    timestamp: '2026-01-01T00:00:00Z',
    type: 'DEPOSIT' as const,
    status: 'SETTLED' as const,
    amount: 10000,
    currency: 'USD' as const,
    legs: [
      { accountId: 'acc_a', accountName: 'Operating', type: 'DEBIT' as const, amount: 10000, memo: 'Capital' },
      { accountId: 'acc_b', accountName: 'Reserve Vault', type: 'CREDIT' as const, amount: 10000, memo: 'Equity' }
    ],
    initiatorId: 'usr_admin',
    initiatorName: 'Alex Rivera',
    initiatorRole: 'admin' as const,
    memo: 'Initial Genesis capitalization',
    epochId: 1,
    prevHash: GENESIS_HASH
  };
  const tx0DataHash = computeTxDataHash(tx0Data);
  const tx0EntryHash = computeEntryHash(GENESIS_HASH, tx0DataHash);
  const tx0: LedgerTransaction = {
    ...tx0Data,
    txDataHash: tx0DataHash,
    entryHash: tx0EntryHash
  };

  const { root: epoch1Root } = buildMerkleTree([tx0.entryHash]);
  const epochs: MerkleEpoch[] = [
    {
      epochId: 1,
      timestamp: '2026-01-01T00:00:00Z',
      txCount: 1,
      merkleRoot: epoch1Root,
      txHashes: [tx0.entryHash],
      isFinalized: true
    }
  ];

  // 1. Verify clean ledger
  const cleanResult = verifyLedgerIntegrity([tx0], accounts, epochs);
  assert.equal(cleanResult.isValid, true);
  assert.equal(cleanResult.tamperedIndex, null);
  assert.equal(cleanResult.doubleEntryBalanced, true);
  assert.equal(cleanResult.merkleRootsValid, true);
  assert.equal(cleanResult.balancesReconciled, true);

  // 2. Tampered payload detection
  const tamperedTx0 = {
    ...tx0,
    memo: 'Malicious modification of memo'
  };
  const tamperedResult = verifyLedgerIntegrity([tamperedTx0], accounts, epochs);
  assert.equal(tamperedResult.isValid, false);
  assert.equal(tamperedResult.tamperedIndex, 0);
  assert.match(tamperedResult.tamperedReason || '', /Data Tamper Detected/);
});
