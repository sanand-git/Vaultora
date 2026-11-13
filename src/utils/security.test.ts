/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { sha256Sync, hashObject } from './crypto';
import { buildMerkleTree, generateMerkleProof, verifyMerkleProof } from './merkle';
import {
  GENESIS_HASH,
  computeTxDataHash,
  computeEntryHash,
  validateDoubleEntryLegs,
  verifyLedgerIntegrity
} from './ledger';
import { hasPermission, requiresDualApproval, ROLE_DEFINITIONS } from './rbac';
import type { Account, LedgerTransaction, MerkleEpoch, UserProfile } from '../types';

/**
 * ADVERSARIAL ATTACK TEST SUITE
 * Validates system resilience against attacks documented in THREATS.md
 */

// Sample clean test fixture
function createSampleEnvironment() {
  const accounts: Account[] = [
    {
      id: 'acc_vault_usd',
      accountNumber: 'BV-9021-USD-01',
      accountName: 'USD Treasury Reserve',
      entityName: 'Core Vault',
      currency: 'USD',
      type: 'treasury',
      status: 'active',
      balance: 1000000,
      reservedBalance: 100000,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    },
    {
      id: 'acc_operating_usd',
      accountNumber: 'BV-9021-USD-02',
      accountName: 'USD Operating',
      entityName: 'Core Vault',
      currency: 'USD',
      type: 'operating',
      status: 'active',
      balance: -1000000,
      reservedBalance: 0,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    }
  ];

  const partialTx: Omit<LedgerTransaction, 'entryHash' | 'txDataHash'> = {
    id: 'tx_sec_001',
    txIndex: 0,
    timestamp: '2026-01-01T00:00:00Z',
    type: 'TRANSFER',
    status: 'SETTLED',
    amount: 1000000,
    currency: 'USD',
    legs: [
      { accountId: 'acc_vault_usd', accountName: 'USD Treasury Reserve', type: 'DEBIT', amount: 1000000, memo: 'Inbound' },
      { accountId: 'acc_operating_usd', accountName: 'USD Operating', type: 'CREDIT', amount: 1000000, memo: 'Outbound' }
    ],
    initiatorId: 'usr_sec_1',
    initiatorName: 'Alex Rivera',
    initiatorRole: 'admin',
    memo: 'Seed funding',
    epochId: 1,
    prevHash: GENESIS_HASH
  };

  const txDataHash = computeTxDataHash(partialTx);
  const entryHash = computeEntryHash(GENESIS_HASH, txDataHash);

  const tx: LedgerTransaction = {
    ...partialTx,
    txDataHash,
    entryHash
  };

  const { root } = buildMerkleTree([entryHash]);
  const epochs: MerkleEpoch[] = [
    {
      epochId: 1,
      timestamp: '2026-01-01T00:00:00Z',
      txCount: 1,
      merkleRoot: root,
      txHashes: [entryHash],
      isFinalized: true
    }
  ];

  return { accounts, transactions: [tx], epochs };
}

test('[ATTACK 1] Unbalanced Money Creation Attempt', () => {
  // Attacker attempts to create $50,000 credit without matching debit
  const fraudulentLegs = [
    { accountId: 'acc_attacker', accountName: 'Attacker Vault', type: 'DEBIT' as const, amount: 50000, memo: 'Free credit' },
    { accountId: 'acc_victim', accountName: 'Victim Vault', type: 'CREDIT' as const, amount: 10000, memo: 'Partial draw' }
  ];

  const result = validateDoubleEntryLegs(fraudulentLegs);
  assert.equal(result.isValid, false, 'Unbalanced double-entry legs must be rejected');
  assert.equal(result.diff, 40000, 'Difference of $40,000 must be detected');
});

test('[ATTACK 2] Settle Block Modification / Bit-Rot Tampering', () => {
  const { accounts, transactions, epochs } = createSampleEnvironment();

  // Baseline audit passes
  const cleanAudit = verifyLedgerIntegrity(transactions, accounts, epochs);
  assert.equal(cleanAudit.isValid, true, 'Clean baseline ledger must pass verification');

  // Attacker modifies transaction amount in settled block #0 from $1,000,000 to $1,050,000
  const tamperedTxs: LedgerTransaction[] = [
    {
      ...transactions[0],
      amount: 1050000
    }
  ];

  const tamperedAudit = verifyLedgerIntegrity(tamperedTxs, accounts, epochs);
  assert.equal(tamperedAudit.isValid, false, 'Tampered block must fail zero-trust verification');
  assert.equal(tamperedAudit.tamperedIndex, 0, 'Must isolate exact tampered block index #0');
  assert.match(tamperedAudit.tamperedReason || '', /tamper detected|modified/i);
});

test('[ATTACK 3] Hash-Chain Continuity Disruption (Forged prevHash)', () => {
  const { accounts, transactions, epochs } = createSampleEnvironment();

  // Attacker injects fake prevHash to break ancestor linkage
  const corruptedTxs: LedgerTransaction[] = [
    {
      ...transactions[0],
      prevHash: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
    }
  ];

  const audit = verifyLedgerIntegrity(corruptedTxs, accounts, epochs);
  assert.equal(audit.isValid, false);
  assert.equal(audit.tamperedIndex, 0);
});

test('[ATTACK 4] Merkle Inclusion Proof Forgery', () => {
  const leaves = [
    sha256Sync('tx_valid_0'),
    sha256Sync('tx_valid_1'),
    sha256Sync('tx_valid_2'),
    sha256Sync('tx_valid_3')
  ];

  const { root } = buildMerkleTree(leaves);
  const proof = generateMerkleProof(leaves, 1, 1);

  // Legitimate proof passes
  assert.equal(verifyMerkleProof(leaves[1], proof.path, root), true);

  // Forged leaf must fail inclusion proof
  const forgedLeaf = sha256Sync('tx_forged_payload');
  assert.equal(verifyMerkleProof(forgedLeaf, proof.path, root), false, 'Forged leaf must be rejected');

  // Altered sibling hash in path must fail
  const corruptedPath = proof.path.map((step, idx) =>
    idx === 0 ? { ...step, hash: sha256Sync('corrupted_sibling') } : step
  );
  assert.equal(verifyMerkleProof(leaves[1], corruptedPath, root), false, 'Altered path must be rejected');
});

test('[ATTACK 5] Privilege Escalation & Dual-Approval Policy Bypassing', () => {
  // Test role authorization matrix
  const clientUser: UserProfile = {
    id: 'usr_client',
    name: 'Client',
    email: 'client@test.com',
    role: 'holder',
    title: 'Customer',
    avatarBg: 'bg-blue-600',
    entityType: 'institutional',
    kycStatus: 'verified',
    kycTier: 'tier1',
    limitConfig: { dailyMax: 100000, dualApprovalThreshold: 50000 },
    allowedAccountIds: []
  };

  const operatorUser: UserProfile = {
    ...clientUser,
    role: 'operator'
  };

  const complianceUser: UserProfile = {
    ...clientUser,
    role: 'compliance'
  };

  // Client cannot approve high-value transfers
  assert.equal(hasPermission(clientUser, 'canApproveHighValue'), false);
  // Operator cannot approve high-value transfers (Segregation of Duties)
  assert.equal(hasPermission(operatorUser, 'canApproveHighValue'), false);
  // Compliance CAN approve high-value transfers
  assert.equal(hasPermission(complianceUser, 'canApproveHighValue'), true);

  // Movement of $75,000 with $50,000 threshold must mandate dual-authorization
  assert.equal(requiresDualApproval(75000, 50000), true);
  assert.equal(requiresDualApproval(25000, 50000), false);
});
