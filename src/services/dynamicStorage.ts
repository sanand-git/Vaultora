/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  Account,
  LedgerTransaction,
  MerkleEpoch,
  UserProfile,
  AuditLogEntry,
  OnboardingApplicant,
  Currency
} from '../types';
import { sha256Sync } from '../utils/crypto';
import {
  GENESIS_HASH,
  computeTxDataHash,
  computeEntryHash
} from '../utils/ledger';
import { buildMerkleTree } from '../utils/merkle';

const STORAGE_KEY = 'vaultora_dynamic_state_v1';

export interface DynamicSystemState {
  users: UserProfile[];
  accounts: Account[];
  transactions: LedgerTransaction[];
  epochs: MerkleEpoch[];
  pendingTransactions: LedgerTransaction[];
  applicants: OnboardingApplicant[];
  auditLogs: AuditLogEntry[];
}

/**
 * Creates the foundational dynamic state with authentic institutional accounts
 * and dynamically computed genesis SHA-256 hash chains.
 */
export function createBaselineDynamicState(): DynamicSystemState {
  const users: UserProfile[] = [
    {
      id: 'usr_admin_1',
      name: 'Alex Rivera',
      email: 'admin@vaultora.corp',
      role: 'admin',
      title: 'System Administrator',
      avatarBg: 'bg-[#13382c] text-white',
      entityType: 'institutional',
      kycStatus: 'verified',
      kycTier: 'tier3',
      limitConfig: {
        dailyMax: 10000000,
        dualApprovalThreshold: 50000
      },
      allowedAccountIds: ['*']
    },
    {
      id: 'usr_user_1',
      name: 'Sanand Prasad',
      email: 'sanandprasad23@gmail.com',
      role: 'holder',
      title: 'Account holder',
      avatarBg: 'bg-[#cbd5c0] text-[#13382c]',
      entityType: 'individual',
      kycStatus: 'verified',
      kycTier: 'tier2',
      limitConfig: {
        dailyMax: 1000000,
        dualApprovalThreshold: 50000
      },
      allowedAccountIds: ['acc_chk_sanand', 'acc_sav_sanand']
    }
  ];

  const accounts: Account[] = [
    {
      id: 'acc_treasury_core_inr',
      accountNumber: 'BV-9021-INR-01',
      accountName: 'Core Treasury Reserve Vault',
      entityName: 'Vaultora Custody',
      currency: 'INR',
      type: 'treasury',
      status: 'active',
      balance: 10000000.00,
      reservedBalance: 1000000.00,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'acc_operating_inr',
      accountNumber: 'BV-9021-INR-02',
      accountName: 'INR Operating Liquidity Pool',
      entityName: 'Vaultora Treasury',
      currency: 'INR',
      type: 'operating',
      status: 'active',
      balance: 2000000.00,
      reservedBalance: 100000.00,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'acc_chk_sanand',
      accountNumber: 'BV-1042-INR-01',
      accountName: 'Primary Operational Checking',
      entityName: 'Sanand Prasad',
      currency: 'INR',
      type: 'operating',
      status: 'active',
      balance: 50000.00,
      reservedBalance: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'acc_sav_sanand',
      accountNumber: 'BV-1042-INR-02',
      accountName: 'High-Yield Treasury Vault',
      entityName: 'Sanand Prasad',
      currency: 'INR',
      type: 'treasury',
      status: 'active',
      balance: 150000.00,
      reservedBalance: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  // Dynamic Genesis Transactions with real SHA-256 Chaining
  const rawGenesis = [
    {
      id: 'tx_genesis_000',
      timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
      type: 'DEPOSIT' as const,
      status: 'SETTLED' as const,
      amount: 10000000.00,
      currency: 'INR' as Currency,
      legs: [
        {
          accountId: 'acc_treasury_core_inr',
          accountName: 'Core Treasury Reserve Vault',
          type: 'DEBIT' as const,
          amount: 10000000.00,
          memo: 'Master Reserve Capital Allocation'
        },
        {
          accountId: 'acc_operating_inr',
          accountName: 'INR Operating Liquidity Pool',
          type: 'CREDIT' as const,
          amount: 10000000.00,
          memo: 'Capital Base Underwrite'
        }
      ],
      initiatorId: 'usr_admin_1',
      initiatorName: 'Alex Rivera',
      initiatorRole: 'admin' as const,
      memo: 'Genesis Ledger Initialization & Capital Base Allocation',
      epochId: 1
    },
    {
      id: 'tx_init_sanand_001',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      type: 'TRANSFER' as const,
      status: 'SETTLED' as const,
      amount: 200000.00,
      currency: 'INR' as Currency,
      legs: [
        {
          accountId: 'acc_chk_sanand',
          accountName: 'Primary Operational Checking',
          type: 'DEBIT' as const,
          amount: 50000.00,
          memo: 'Checking initial allocation'
        },
        {
          accountId: 'acc_sav_sanand',
          accountName: 'High-Yield Treasury Vault',
          type: 'DEBIT' as const,
          amount: 150000.00,
          memo: 'High-yield vault initial allocation'
        },
        {
          accountId: 'acc_operating_inr',
          accountName: 'INR Operating Liquidity Pool',
          type: 'CREDIT' as const,
          amount: 200000.00,
          memo: 'Capitalization distribution to private client'
        }
      ],
      initiatorId: 'usr_admin_1',
      initiatorName: 'Alex Rivera',
      initiatorRole: 'admin' as const,
      memo: 'Private Client Account Capitalization for Sanand Prasad',
      epochId: 1
    }
  ];

  const transactions: LedgerTransaction[] = [];
  let currentPrevHash = GENESIS_HASH;

  for (let i = 0; i < rawGenesis.length; i++) {
    const raw = rawGenesis[i];
    const partialTx: Omit<LedgerTransaction, 'entryHash' | 'txDataHash'> = {
      ...raw,
      txIndex: i,
      prevHash: currentPrevHash
    };

    const txDataHash = computeTxDataHash(partialTx);
    const entryHash = computeEntryHash(currentPrevHash, txDataHash);

    const fullTx: LedgerTransaction = {
      ...partialTx,
      txDataHash,
      entryHash
    };

    transactions.push(fullTx);
    currentPrevHash = entryHash;
  }

  const { root: epochRoot } = buildMerkleTree(transactions.map(t => t.entryHash));

  const epochs: MerkleEpoch[] = [
    {
      epochId: 1,
      timestamp: new Date().toISOString(),
      txCount: transactions.length,
      merkleRoot: epochRoot,
      txHashes: transactions.map(t => t.entryHash),
      isFinalized: true
    }
  ];

  const applicants: OnboardingApplicant[] = [
    {
      id: 'app_dyn_101',
      legalName: 'Apex Treasury Global Partners',
      entityType: 'institutional',
      registrationNumber: 'CORP-882910',
      country: 'United States',
      requestedTier: 'tier3',
      contactEmail: 'treasury@apextreasury.com',
      contactPerson: 'David Vance',
      status: 'pending_review',
      riskScore: 'LOW',
      submittedAt: new Date(Date.now() - 7200000).toISOString(),
      initialDepositRequested: 2500000,
      initialCurrency: 'USD',
      notes: 'Institutional liquidity counterparty with audited financial statements.'
    }
  ];

  const auditLogs: AuditLogEntry[] = [
    {
      id: `log_init_001`,
      timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
      actorId: 'usr_admin_1',
      actorName: 'Alex Rivera',
      actorRole: 'admin',
      action: 'GENESIS_LEDGER_SEALED',
      details: 'Initialized immutable double-entry ledger base with ₹1,00,00,000 INR reserve capacity.',
      severity: 'info',
      hashSignature: sha256Sync(`GENESIS_SEAL_AlexRivera_${Date.now()}`)
    },
    {
      id: `log_init_002`,
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      actorId: 'usr_admin_1',
      actorName: 'Alex Rivera',
      actorRole: 'admin',
      action: 'CLIENT_ONBOARDING_INITIALIZED',
      details: 'Allocated primary checking and high-yield treasury vaults for Sanand Prasad.',
      severity: 'info',
      hashSignature: sha256Sync(`ONBOARD_SanandPrasad_${Date.now()}`)
    }
  ];

  return {
    users,
    accounts,
    transactions,
    epochs,
    pendingTransactions: [],
    applicants,
    auditLogs
  };
}

/**
 * Loads the dynamic system state from localStorage or falls back to clean baseline.
 * Enforces platform-wide Indian Rupees (INR / ₹) standard.
 */
export function loadDynamicState(): DynamicSystemState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('balancevault_dynamic_state_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.accounts) && Array.isArray(parsed.transactions)) {
        // Enforce user requirement: "whole currency should be only in the rupees only"
        parsed.accounts = parsed.accounts.map((a: any) => ({
          ...a,
          currency: 'INR' as Currency,
          entityName: typeof a.entityName === 'string' ? a.entityName.replace(/BalanceVault/g, 'Vaultora') : a.entityName,
          accountNumber: typeof a.accountNumber === 'string'
            ? a.accountNumber.replace('-USD-', '-INR-').replace('-EUR-', '-INR-').replace('-GBP-', '-INR-')
            : a.accountNumber
        }));
        parsed.transactions = parsed.transactions.map((tx: any) => ({
          ...tx,
          currency: 'INR' as Currency
        }));
        if (Array.isArray(parsed.users)) {
          parsed.users = parsed.users.map((u: any) => ({
            ...u,
            email: u.email === 'admin@balancevault.corp' ? 'admin@vaultora.corp' : u.email
          }));
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[DynamicStorage] Could not load stored state, initializing fresh baseline:', err);
  }

  const baseline = createBaselineDynamicState();
  saveDynamicState(baseline);
  return baseline;
}

/**
 * Persists dynamic state to localStorage and attempts to sync with the backend server.
 */
export function saveDynamicState(state: DynamicSystemState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('[DynamicStorage] Failed to save state to localStorage:', err);
  }

  // Asynchronous background sync with backend server if online
  if (typeof window !== 'undefined') {
    fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    }).catch(() => {
      // Offline or standalone mode - localStorage handles local persistence
    });
  }
}

/**
 * Resets state to clean baseline.
 */
export function resetDynamicState(): DynamicSystemState {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  const baseline = createBaselineDynamicState();
  saveDynamicState(baseline);
  return baseline;
}

