/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { sha256Sync } from '../utils/crypto';
import {
  GENESIS_HASH,
  computeTxDataHash,
  computeEntryHash
} from '../utils/ledger';
import { buildMerkleTree } from '../utils/merkle';
import type {
  UserProfile,
  Account,
  LedgerTransaction,
  MerkleEpoch,
  AuditLogEntry,
  OnboardingApplicant
} from '../types';

export const INITIAL_USERS: UserProfile[] = [
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

export const INITIAL_ACCOUNTS: Account[] = [
  {
    id: 'acc_treasury_core_usd',
    accountNumber: 'BV-9021-USD-01',
    accountName: 'Core Treasury Reserve Vault',
    entityName: 'Vaultora Global Custody',
    currency: 'USD',
    type: 'treasury',
    status: 'active',
    balance: 14250000.00,
    reservedBalance: 2000000.00,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-02-10T12:00:00Z'
  },
  {
    id: 'acc_operating_usd',
    accountNumber: 'BV-9021-USD-02',
    accountName: 'USD Operating Liquidity',
    entityName: 'Vaultora Treasury',
    currency: 'USD',
    type: 'operating',
    status: 'active',
    balance: 3840500.00,
    reservedBalance: 150000.00,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-02-11T09:30:00Z'
  },
  {
    id: 'acc_escrow_collateral',
    accountNumber: 'BV-9021-USD-03',
    accountName: 'Escrow & Margin Collateral Pool',
    entityName: 'Vaultora Trust & Escrow',
    currency: 'USD',
    type: 'escrow',
    status: 'active',
    balance: 1500000.00,
    reservedBalance: 500000.00,
    createdAt: '2026-01-05T00:00:00Z',
    updatedAt: '2026-02-08T15:20:00Z'
  },
  {
    id: 'acc_clearing_eur',
    accountNumber: 'BV-4410-EUR-01',
    accountName: 'EUR Cross-Border Clearing',
    entityName: 'Vaultora Europe B.V.',
    currency: 'EUR',
    type: 'operating',
    status: 'active',
    balance: 2120000.00,
    reservedBalance: 0,
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-02-10T18:00:00Z'
  },
  {
    id: 'acc_settlement_gbp',
    accountNumber: 'BV-3301-GBP-01',
    accountName: 'GBP RTGS Settlement Account',
    entityName: 'Vaultora UK Ltd',
    currency: 'GBP',
    type: 'operating',
    status: 'active',
    balance: 850000.00,
    reservedBalance: 0,
    createdAt: '2026-01-12T00:00:00Z',
    updatedAt: '2026-02-09T11:15:00Z'
  },
  {
    id: 'acc_orion_usd',
    accountNumber: 'BV-7720-USD-99',
    accountName: 'Orion Freight Operations',
    entityName: 'Orion Global Logistics',
    currency: 'USD',
    type: 'operating',
    status: 'active',
    balance: 620000.00,
    reservedBalance: 0,
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-02-11T08:00:00Z'
  },
  {
    id: 'acc_orion_eur',
    accountNumber: 'BV-7720-EUR-99',
    accountName: 'Orion Rotterdam Port Escrow',
    entityName: 'Orion Global Logistics',
    currency: 'EUR',
    type: 'escrow',
    status: 'active',
    balance: 310000.00,
    reservedBalance: 50000.00,
    createdAt: '2026-01-20T00:00:00Z',
    updatedAt: '2026-02-10T14:40:00Z'
  },
  {
    id: 'acc_cold_reserve',
    accountNumber: 'BV-9900-USD-00',
    accountName: 'Cold Vault Proof-of-Reserves',
    entityName: 'Vaultora Custodian Trust',
    currency: 'USD',
    type: 'reserve',
    status: 'active',
    balance: 25000000.00,
    reservedBalance: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'acc_chk_sanand',
    accountNumber: 'BV-1042-USD-01',
    accountName: 'Primary Operational Checking',
    entityName: 'Sanand Prasad',
    currency: 'USD',
    type: 'operating',
    status: 'active',
    balance: 50000.00,
    reservedBalance: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'acc_sav_sanand',
    accountNumber: 'BV-1042-USD-02',
    accountName: 'High-Yield Treasury Vault',
    entityName: 'Sanand Prasad',
    currency: 'USD',
    type: 'treasury',
    status: 'active',
    balance: 150000.00,
    reservedBalance: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  }
];

// Helper to construct a chained ledger transaction
interface RawTxSeed {
  id: string;
  timestamp: string;
  type: LedgerTransaction['type'];
  status: LedgerTransaction['status'];
  amount: number;
  currency: LedgerTransaction['currency'];
  legs: LedgerTransaction['legs'];
  initiatorId: string;
  initiatorName: string;
  initiatorRole: UserProfile['role'];
  approverId?: string;
  approverName?: string;
  approverRole?: UserProfile['role'];
  approvalTimestamp?: string;
  rejectionReason?: string;
  memo: string;
  batchId?: string;
  epochId: number;
}

const RAW_TRANSACTIONS: RawTxSeed[] = [
  {
    id: 'tx_genesis_000',
    timestamp: '2026-01-01T00:00:00Z',
    type: 'DEPOSIT',
    status: 'SETTLED',
    amount: 14250000.00,
    currency: 'USD',
    legs: [
      { accountId: 'acc_treasury_core_usd', accountName: 'Core Treasury Reserve Vault', type: 'DEBIT', amount: 14250000.00, memo: 'Genesis Custodial Capital Allocation' },
      { accountId: 'acc_cold_reserve', accountName: 'Cold Vault Proof-of-Reserves', type: 'CREDIT', amount: 14250000.00, memo: 'Capital Base Underwriting' }
    ],
    initiatorId: 'usr_admin_1',
    initiatorName: 'Alex Rivera',
    initiatorRole: 'admin',
    memo: 'System Genesis Block: Base capital deposit into Core Treasury',
    epochId: 1
  },
  {
    id: 'tx_alloc_001',
    timestamp: '2026-01-02T10:15:00Z',
    type: 'TRANSFER',
    status: 'SETTLED',
    amount: 4000000.00,
    currency: 'USD',
    legs: [
      { accountId: 'acc_operating_usd', accountName: 'USD Operating Liquidity', type: 'DEBIT', amount: 4000000.00, memo: 'Liquidity provisioning' },
      { accountId: 'acc_treasury_core_usd', accountName: 'Core Treasury Reserve Vault', type: 'CREDIT', amount: 4000000.00, memo: 'Reserve allocation' }
    ],
    initiatorId: 'usr_user_1',
    initiatorName: 'Sanand Prasad',
    initiatorRole: 'holder',
    approverId: 'usr_admin_1',
    approverName: 'Alex Rivera',
    approverRole: 'admin',
    approvalTimestamp: '2026-01-02T10:20:00Z',
    memo: 'Allocated USD Operating buffer for January trading flow',
    epochId: 1
  },
  {
    id: 'tx_collateral_002',
    timestamp: '2026-01-05T14:30:00Z',
    type: 'RESERVE_HOLD',
    status: 'SETTLED',
    amount: 1500000.00,
    currency: 'USD',
    legs: [
      { accountId: 'acc_escrow_collateral', accountName: 'Escrow & Margin Collateral Pool', type: 'DEBIT', amount: 1500000.00, memo: 'Escrow guarantee funded' },
      { accountId: 'acc_treasury_core_usd', accountName: 'Core Treasury Reserve Vault', type: 'CREDIT', amount: 1500000.00, memo: 'Treasury collateral draw' }
    ],
    initiatorId: 'usr_user_1',
    initiatorName: 'Sanand Prasad',
    initiatorRole: 'holder',
    approverId: 'usr_admin_1',
    approverName: 'Alex Rivera',
    approverRole: 'admin',
    approvalTimestamp: '2026-01-05T14:45:00Z',
    memo: 'Segregated risk collateral buffer for clearing facilities',
    epochId: 1
  },
  {
    id: 'tx_fx_eur_003',
    timestamp: '2026-01-10T09:00:00Z',
    type: 'DEPOSIT',
    status: 'SETTLED',
    amount: 2120000.00,
    currency: 'EUR',
    legs: [
      { accountId: 'acc_clearing_eur', accountName: 'EUR Cross-Border Clearing', type: 'DEBIT', amount: 2120000.00, memo: 'ECB TARGET2 clearing inbound' },
      { accountId: 'acc_cold_reserve', accountName: 'Cold Vault Proof-of-Reserves', type: 'CREDIT', amount: 2120000.00, memo: 'EUR reserve mirror' }
    ],
    initiatorId: 'usr_user_1',
    initiatorName: 'Sanand Prasad',
    initiatorRole: 'holder',
    memo: 'SEPA RTGS inbound clearing capitalization for Eurozone corridors',
    epochId: 1
  },
  {
    id: 'tx_gbp_004',
    timestamp: '2026-01-12T11:30:00Z',
    type: 'DEPOSIT',
    status: 'SETTLED',
    amount: 850000.00,
    currency: 'GBP',
    legs: [
      { accountId: 'acc_settlement_gbp', accountName: 'GBP RTGS Settlement Account', type: 'DEBIT', amount: 850000.00, memo: 'CHAPS clearing credit' },
      { accountId: 'acc_cold_reserve', accountName: 'Cold Vault Proof-of-Reserves', type: 'CREDIT', amount: 850000.00, memo: 'GBP collateral hedge' }
    ],
    initiatorId: 'usr_user_1',
    initiatorName: 'Sanand Prasad',
    initiatorRole: 'holder',
    memo: 'Bank of England CHAPS liquidity gateway setup',
    epochId: 1
  },
  {
    id: 'tx_client_onboard_005',
    timestamp: '2026-01-15T16:00:00Z',
    type: 'TRANSFER',
    status: 'SETTLED',
    amount: 700000.00,
    currency: 'USD',
    legs: [
      { accountId: 'acc_orion_usd', accountName: 'Orion Freight Operations', type: 'DEBIT', amount: 700000.00, memo: 'Initial client funding credit' },
      { accountId: 'acc_operating_usd', accountName: 'USD Operating Liquidity', type: 'CREDIT', amount: 700000.00, memo: 'Inbound wire clearing match' }
    ],
    initiatorId: 'usr_user_1',
    initiatorName: 'Sanand Prasad',
    initiatorRole: 'holder',
    approverId: 'usr_admin_1',
    approverName: 'Alex Rivera',
    approverRole: 'admin',
    approvalTimestamp: '2026-01-15T16:15:00Z',
    memo: 'Initial verified institutional deposit for Orion Logistics Inc.',
    epochId: 2
  },
  {
    id: 'tx_client_payout_006',
    timestamp: '2026-01-22T13:45:00Z',
    type: 'DISBURSEMENT',
    status: 'SETTLED',
    amount: 80000.00,
    currency: 'USD',
    legs: [
      { accountId: 'acc_operating_usd', accountName: 'USD Operating Liquidity', type: 'DEBIT', amount: 80000.00, memo: 'Clearing fee offset' },
      { accountId: 'acc_orion_usd', accountName: 'Orion Freight Operations', type: 'CREDIT', amount: 80000.00, memo: 'Port carrier disbursement' }
    ],
    initiatorId: 'usr_user_1',
    initiatorName: 'Sanand Prasad',
    initiatorRole: 'holder',
    approverId: 'usr_admin_1',
    approverName: 'Alex Rivera',
    approverRole: 'admin',
    approvalTimestamp: '2026-01-22T14:00:00Z',
    memo: 'Batch bunker fuel disbursement for Maersk Terminal',
    batchId: 'BATCH-20260122-09',
    epochId: 2
  },
  {
    id: 'tx_eur_escrow_007',
    timestamp: '2026-01-25T15:10:00Z',
    type: 'TRANSFER',
    status: 'SETTLED',
    amount: 310000.00,
    currency: 'EUR',
    legs: [
      { accountId: 'acc_orion_eur', accountName: 'Orion Rotterdam Port Escrow', type: 'DEBIT', amount: 310000.00, memo: 'Rotterdam customs bond' },
      { accountId: 'acc_clearing_eur', accountName: 'EUR Cross-Border Clearing', type: 'CREDIT', amount: 310000.00, memo: 'Euro escrow allocation' }
    ],
    initiatorId: 'usr_user_1',
    initiatorName: 'Sanand Prasad',
    initiatorRole: 'holder',
    approverId: 'usr_admin_1',
    approverName: 'Alex Rivera',
    approverRole: 'admin',
    approvalTimestamp: '2026-01-25T15:20:00Z',
    memo: 'Rotterdam port authority bonded escrow lockup',
    epochId: 2
  },
  {
    id: 'tx_rebalance_008',
    timestamp: '2026-02-02T11:00:00Z',
    type: 'TRANSFER',
    status: 'SETTLED',
    amount: 540500.00,
    currency: 'USD',
    legs: [
      { accountId: 'acc_operating_usd', accountName: 'USD Operating Liquidity', type: 'DEBIT', amount: 540500.00, memo: 'Treasury sweep replenishment' },
      { accountId: 'acc_treasury_core_usd', accountName: 'Core Treasury Reserve Vault', type: 'CREDIT', amount: 540500.00, memo: 'Sweep from core reserve' }
    ],
    initiatorId: 'usr_user_1',
    initiatorName: 'Sanand Prasad',
    initiatorRole: 'holder',
    approverId: 'usr_admin_1',
    approverName: 'Alex Rivera',
    approverRole: 'admin',
    approvalTimestamp: '2026-02-02T11:15:00Z',
    memo: 'Q1 mid-term liquidity buffer adjustment',
    epochId: 2
  },
  {
    id: 'tx_treasury_fee_009',
    timestamp: '2026-02-05T17:00:00Z',
    type: 'FEE',
    status: 'SETTLED',
    amount: 500000.00,
    currency: 'USD',
    legs: [
      { accountId: 'acc_treasury_core_usd', accountName: 'Core Treasury Reserve Vault', type: 'DEBIT', amount: 500000.00, memo: 'Custody fee accretion' },
      { accountId: 'acc_operating_usd', accountName: 'USD Operating Liquidity', type: 'CREDIT', amount: 500000.00, memo: 'Fee transfer to vault' }
    ],
    initiatorId: 'usr_admin_1',
    initiatorName: 'Alex Rivera',
    initiatorRole: 'admin',
    memo: 'Platform custodian and staking yield distribution sweep',
    epochId: 2
  }
];

// Dynamically chain the initial transactions with SHA-256
export function buildInitialLedger(): {
  transactions: LedgerTransaction[];
  epochs: MerkleEpoch[];
} {
  const transactions: LedgerTransaction[] = [];
  let currentPrevHash = GENESIS_HASH;

  for (let i = 0; i < RAW_TRANSACTIONS.length; i++) {
    const raw = RAW_TRANSACTIONS[i];
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

  // Build epochs
  const epoch1Txs = transactions.filter(t => t.epochId === 1);
  const epoch2Txs = transactions.filter(t => t.epochId === 2);

  const { root: root1 } = buildMerkleTree(epoch1Txs.map(t => t.entryHash));
  const { root: root2 } = buildMerkleTree(epoch2Txs.map(t => t.entryHash));

  const epochs: MerkleEpoch[] = [
    {
      epochId: 1,
      timestamp: '2026-01-12T12:00:00Z',
      txCount: epoch1Txs.length,
      merkleRoot: root1,
      txHashes: epoch1Txs.map(t => t.entryHash),
      isFinalized: true
    },
    {
      epochId: 2,
      timestamp: '2026-02-05T18:00:00Z',
      txCount: epoch2Txs.length,
      merkleRoot: root2,
      txHashes: epoch2Txs.map(t => t.entryHash),
      isFinalized: true
    }
  ];

  return { transactions, epochs };
}

export function getInitialReconciledAccounts(): Account[] {
  const calculated: Record<string, number> = {};
  for (const acc of INITIAL_ACCOUNTS) {
    calculated[acc.id] = 0;
  }

  for (const tx of RAW_TRANSACTIONS) {
    if (tx.status !== 'SETTLED') continue;
    for (const leg of tx.legs) {
      if (calculated[leg.accountId] !== undefined) {
        if (leg.type === 'DEBIT') {
          calculated[leg.accountId] += leg.amount;
        } else if (leg.type === 'CREDIT') {
          calculated[leg.accountId] -= leg.amount;
        }
      }
    }
  }

  return INITIAL_ACCOUNTS.map(acc => ({
    ...acc,
    balance: Math.round((calculated[acc.id] ?? 0) * 100) / 100
  }));
}

export const INITIAL_ONBOARDING_APPLICANTS: OnboardingApplicant[] = [
  {
    id: 'app_001',
    legalName: 'Apex Quant Capital LLC',
    entityType: 'institutional',
    registrationNumber: 'DE-8829104',
    country: 'United States',
    requestedTier: 'tier3',
    contactEmail: 'onboarding@apexquant.com',
    contactPerson: 'David Miller',
    status: 'pending_review',
    riskScore: 'LOW',
    submittedAt: '2026-02-10T14:22:00Z',
    initialDepositRequested: 5000000,
    initialCurrency: 'USD',
    notes: 'Institutional proprietary trading firm with audited SOC-2 reports.'
  },
  {
    id: 'app_002',
    legalName: 'Nordic Merchant Clearing AB',
    entityType: 'institutional',
    registrationNumber: 'SE-556102-9912',
    country: 'Sweden',
    requestedTier: 'tier2',
    contactEmail: 'compliance@nordicmerchant.se',
    contactPerson: 'Astrid Lindqvist',
    status: 'pending_review',
    riskScore: 'LOW',
    submittedAt: '2026-02-11T08:15:00Z',
    initialDepositRequested: 1200000,
    initialCurrency: 'EUR',
    notes: 'EU payment service provider seeking EUR/GBP settlement corridor.'
  },
  {
    id: 'app_003',
    legalName: 'Helios Commodity Traders',
    entityType: 'institutional',
    registrationNumber: 'CH-CHE-190.221.844',
    country: 'Switzerland',
    requestedTier: 'tier3',
    contactEmail: 'kyc@heliostrading.ch',
    contactPerson: 'Beatrix von Berg',
    status: 'approved',
    riskScore: 'MEDIUM',
    submittedAt: '2026-02-08T11:00:00Z',
    reviewedBy: 'Alex Rivera',
    reviewedAt: '2026-02-09T09:30:00Z',
    initialDepositRequested: 8500000,
    initialCurrency: 'USD',
    notes: 'Enhanced due diligence completed. Requires dual-approval above ₹1,00,000.'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'log_001',
    timestamp: '2026-02-11T09:30:12Z',
    actorId: 'usr_admin_1',
    actorName: 'Alex Rivera',
    actorRole: 'admin',
    action: 'POLICY_UPDATE',
    details: 'Dual-approval ceiling verified at ₹50,000 for standard tier accounts.',
    severity: 'info',
    hashSignature: sha256Sync('log_001_AlexRivera_POLICY_UPDATE')
  },
  {
    id: 'log_002',
    timestamp: '2026-02-11T09:12:45Z',
    actorId: 'usr_admin_1',
    actorName: 'Alex Rivera',
    actorRole: 'admin',
    action: 'KYC_TIER_APPROVAL',
    details: 'Approved Tier-3 verification status for Helios Commodity Traders.',
    severity: 'info',
    hashSignature: sha256Sync('log_002_AlexRivera_KYC')
  },
  {
    id: 'log_003',
    timestamp: '2026-02-11T08:44:00Z',
    actorId: 'usr_admin_1',
    actorName: 'Alex Rivera',
    actorRole: 'admin',
    action: 'ZERO_TRUST_AUDIT_PASS',
    details: 'Completed mathematical verification across Epochs 1 & 2. 0 anomalies detected.',
    severity: 'info',
    hashSignature: sha256Sync('log_003_AlexRivera_AUDIT')
  },
  {
    id: 'log_004',
    timestamp: '2026-02-10T18:20:30Z',
    actorId: 'usr_user_1',
    actorName: 'Sanand Prasad',
    actorRole: 'holder',
    action: 'BATCH_DISBURSE_INITIATED',
    details: 'Initiated carrier settlement BATCH-20260122-09 (₹80,000.00).',
    severity: 'info',
    hashSignature: sha256Sync('log_004_SanandPrasad_BATCH')
  }
];

// Initial pending approval item for high-value workflow testing
export const INITIAL_PENDING_TX: LedgerTransaction = {
  id: 'tx_pending_req_771',
  txIndex: 10,
  timestamp: '2026-02-11T09:45:00Z',
  type: 'TRANSFER',
  status: 'PENDING_APPROVAL',
  amount: 250000.00,
  currency: 'USD',
  legs: [
    { accountId: 'acc_operating_usd', accountName: 'USD Operating Liquidity', type: 'DEBIT', amount: 250000.00, memo: 'Clearing liquidity request' },
    { accountId: 'acc_treasury_core_usd', accountName: 'Core Treasury Reserve Vault', type: 'CREDIT', amount: 250000.00, memo: 'Core reserve transfer' }
  ],
  initiatorId: 'usr_user_1',
  initiatorName: 'Sanand Prasad',
  initiatorRole: 'holder',
  memo: 'Overnight clearing rebalance for APAC trading session (Requires Dual Sign-off)',
  epochId: 3,
  prevHash: '', // Will be assigned upon settlement
  txDataHash: '',
  entryHash: ''
};
