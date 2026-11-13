/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { sha256Sync, hashObject } from './crypto';
import { buildMerkleTree } from './merkle';
import type {
  Account,
  LedgerTransaction,
  MerkleEpoch,
  VerificationResult,
  DoubleEntryLeg
} from '../types';

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Computes canonical hash of transaction payload (excluding the final block entryHash)
 */
export function computeTxDataHash(tx: Omit<LedgerTransaction, 'entryHash' | 'txDataHash'>): string {
  const payload = {
    id: tx.id,
    txIndex: tx.txIndex,
    timestamp: tx.timestamp,
    type: tx.type,
    status: tx.status,
    amount: tx.amount,
    currency: tx.currency,
    legs: tx.legs.map(l => ({
      accountId: l.accountId,
      type: l.type,
      amount: l.amount,
      memo: l.memo
    })),
    initiatorId: tx.initiatorId,
    initiatorRole: tx.initiatorRole,
    approverId: tx.approverId || '',
    approverRole: tx.approverRole || '',
    approvalTimestamp: tx.approvalTimestamp || '',
    memo: tx.memo,
    batchId: tx.batchId || '',
    epochId: tx.epochId,
    prevHash: tx.prevHash
  };
  return hashObject(payload);
}

/**
 * Computes block entry hash by chaining previous block hash with current transaction data hash
 */
export function computeEntryHash(prevHash: string, txDataHash: string): string {
  return sha256Sync(prevHash + txDataHash);
}

/**
 * Validates that double-entry bookkeeping holds for a set of legs:
 * Total debits must equal total credits with floating-point epsilon protection.
 */
export function validateDoubleEntryLegs(legs: DoubleEntryLeg[]): { isValid: boolean; debitTotal: number; creditTotal: number; diff: number } {
  let debitTotal = 0;
  let creditTotal = 0;

  for (const leg of legs) {
    if (leg.type === 'DEBIT') {
      debitTotal += leg.amount;
    } else if (leg.type === 'CREDIT') {
      creditTotal += leg.amount;
    }
  }

  // Round to 4 decimal places to prevent float rounding errors
  debitTotal = Math.round(debitTotal * 10000) / 10000;
  creditTotal = Math.round(creditTotal * 10000) / 10000;
  const diff = Math.abs(debitTotal - creditTotal);

  return {
    isValid: diff < 0.0001,
    debitTotal,
    creditTotal,
    diff
  };
}

/**
 * Verifies mathematical and cryptographic integrity of the entire ledger.
 * Runs zero-trust verification on:
 * 1. Double-entry debit/credit balance invariance.
 * 2. SHA-256 hash chaining continuity (prevHash pointers).
 * 3. Data integrity (txDataHash matching payload).
 * 4. Entry hash authenticity (entryHash = sha256(prevHash + txDataHash)).
 * 5. Account balance reconciliation from genesis to present head.
 * 6. Merkle root integrity per epoch.
 */
export function verifyLedgerIntegrity(
  transactions: LedgerTransaction[],
  accounts: Account[],
  epochs: MerkleEpoch[]
): VerificationResult {
  const startTime = performance.now();
  let doubleEntryBalanced = true;
  let merkleRootsValid = true;
  let balancesReconciled = true;

  // 1. Check transactions in sequence
  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];

    // Check double entry
    const legCheck = validateDoubleEntryLegs(tx.legs);
    if (!legCheck.isValid) {
      return {
        isValid: false,
        totalEntriesChecked: i + 1,
        tamperedIndex: i,
        tamperedReason: `Double-entry invariant violated at Tx #${tx.txIndex} (${tx.id}): Debits (₹${legCheck.debitTotal}) != Credits (₹${legCheck.creditTotal})`,
        doubleEntryBalanced: false,
        merkleRootsValid: false,
        balancesReconciled: false,
        executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
        timestamp: new Date().toISOString(),
        blockEpochsChecked: epochs.length
      };
    }

    // Check prevHash pointer
    const expectedPrevHash = i === 0 ? GENESIS_HASH : transactions[i - 1].entryHash;
    if (tx.prevHash !== expectedPrevHash) {
      return {
        isValid: false,
        totalEntriesChecked: i + 1,
        tamperedIndex: i,
        tamperedReason: `Broken Hash Chain at Tx #${tx.txIndex} (${tx.id}). Expected prevHash "${expectedPrevHash.slice(0, 12)}...", but found "${tx.prevHash.slice(0, 12)}..."`,
        doubleEntryBalanced: true,
        merkleRootsValid: false,
        balancesReconciled: false,
        executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
        timestamp: new Date().toISOString(),
        blockEpochsChecked: epochs.length
      };
    }

    // Recompute txDataHash
    const expectedTxDataHash = computeTxDataHash(tx);
    if (tx.txDataHash !== expectedTxDataHash) {
      return {
        isValid: false,
        totalEntriesChecked: i + 1,
        tamperedIndex: i,
        tamperedReason: `Data Tamper Detected at Tx #${tx.txIndex} (${tx.id})! Payload was modified. Recomputed data hash "${expectedTxDataHash.slice(0, 12)}..." does not match stored "${tx.txDataHash.slice(0, 12)}..."`,
        doubleEntryBalanced: true,
        merkleRootsValid: false,
        balancesReconciled: false,
        executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
        timestamp: new Date().toISOString(),
        blockEpochsChecked: epochs.length
      };
    }

    // Recompute entryHash
    const expectedEntryHash = computeEntryHash(tx.prevHash, expectedTxDataHash);
    if (tx.entryHash !== expectedEntryHash) {
      return {
        isValid: false,
        totalEntriesChecked: i + 1,
        tamperedIndex: i,
        tamperedReason: `Entry Cryptographic Signature Mismatch at Tx #${tx.txIndex} (${tx.id}). Recomputed entry hash "${expectedEntryHash.slice(0, 12)}..." does not match stored "${tx.entryHash.slice(0, 12)}..."`,
        doubleEntryBalanced: true,
        merkleRootsValid: false,
        balancesReconciled: false,
        executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
        timestamp: new Date().toISOString(),
        blockEpochsChecked: epochs.length
      };
    }
  }

  // 2. Check Merkle roots per epoch
  for (const epoch of epochs) {
    const epochTxs = transactions.filter(t => t.epochId === epoch.epochId && t.status === 'SETTLED');
    const hashes = epochTxs.map(t => t.entryHash);
    const { root: computedRoot } = buildMerkleTree(hashes);
    if (computedRoot !== epoch.merkleRoot) {
      merkleRootsValid = false;
      return {
        isValid: false,
        totalEntriesChecked: transactions.length,
        tamperedIndex: null,
        tamperedReason: `Merkle Root Discrepancy for Epoch #${epoch.epochId}. Stored root "${epoch.merkleRoot.slice(0, 12)}..." != Recomputed "${computedRoot.slice(0, 12)}..."`,
        doubleEntryBalanced: true,
        merkleRootsValid: false,
        balancesReconciled: true,
        executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
        timestamp: new Date().toISOString(),
        blockEpochsChecked: epochs.length
      };
    }
  }

  // 3. Balance reconciliation: calculate running balances for each account from settled transactions
  const calculatedBalances: Record<string, number> = {};
  for (const acc of accounts) {
    calculatedBalances[acc.id] = 0;
  }

  for (const tx of transactions) {
    if (tx.status !== 'SETTLED') continue;
    for (const leg of tx.legs) {
      if (calculatedBalances[leg.accountId] !== undefined) {
        // In asset/cash accounts: DEBIT increases balance, CREDIT decreases balance
        if (leg.type === 'DEBIT') {
          calculatedBalances[leg.accountId] += leg.amount;
        } else if (leg.type === 'CREDIT') {
          calculatedBalances[leg.accountId] -= leg.amount;
        }
      }
    }
  }

  for (const acc of accounts) {
    const roundedCalculated = Math.round(calculatedBalances[acc.id] * 100) / 100;
    const roundedStored = Math.round(acc.balance * 100) / 100;
    if (Math.abs(roundedCalculated - roundedStored) > 0.01) {
      balancesReconciled = false;
      return {
        isValid: false,
        totalEntriesChecked: transactions.length,
        tamperedIndex: null,
        tamperedReason: `Balance Reconciliation Mismatch on account "${acc.accountName}" (${acc.accountNumber}). Ledger settled sum is ₹${roundedCalculated.toLocaleString('en-IN')}, but account balance is recorded as ₹${roundedStored.toLocaleString('en-IN')}`,
        doubleEntryBalanced: true,
        merkleRootsValid: true,
        balancesReconciled: false,
        executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
        timestamp: new Date().toISOString(),
        blockEpochsChecked: epochs.length
      };
    }
  }

  const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

  return {
    isValid: true,
    totalEntriesChecked: transactions.length,
    tamperedIndex: null,
    doubleEntryBalanced,
    merkleRootsValid,
    balancesReconciled,
    executionTimeMs,
    timestamp: new Date().toISOString(),
    blockEpochsChecked: epochs.length
  };
}
