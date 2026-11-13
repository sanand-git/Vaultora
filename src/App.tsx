/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sidebar, type AppTab } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { OverviewPage } from './components/OverviewPage';
import { DashboardOverview } from './components/DashboardOverview';
import { AccountsManagement } from './components/AccountsManagement';
import { MoneyMovementHub } from './components/MoneyMovementHub';
import { LedgerAuditView } from './components/LedgerAuditView';
import { AdminUsersDirectory } from './components/AdminUsersDirectory';
import { UserOnboarding } from './components/UserOnboarding';
import { AuditLogsView } from './components/AuditLogsView';
import { CreateAccountModal } from './components/CreateAccountModal';
import { CryptographicReceiptModal } from './components/CryptographicReceiptModal';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { ChevronDown, LogOut, RotateCw, CheckCircle2, Shield } from 'lucide-react';

import {
  loadDynamicState,
  saveDynamicState,
  resetDynamicState,
  type DynamicSystemState
} from './services/dynamicStorage';

import type {
  UserProfile,
  Role,
  Account,
  AccountType,
  LedgerTransaction,
  MerkleEpoch,
  AuditLogEntry,
  OnboardingApplicant,
  VerificationResult,
  Currency
} from './types';

import {
  computeTxDataHash,
  computeEntryHash,
  verifyLedgerIntegrity
} from './utils/ledger';
import { buildMerkleTree } from './utils/merkle';
import { sha256Sync } from './utils/crypto';
import { requiresDualApproval } from './utils/rbac';

export default function App() {
  // Dynamic State Initialization (Persisted & Synced)
  const [dynamicState, setDynamicState] = useState<DynamicSystemState>(() => loadDynamicState());

  // Authentication & Security Gate State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  // Navigation & User Persona State
  const [activeTab, setActiveTab] = useState<AppTab>('overview');
  const [users, setUsers] = useState<UserProfile[]>(() => dynamicState.users);
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    return dynamicState.users.find(u => u.role !== 'admin') || dynamicState.users[0];
  });
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  // Core Ledger & Treasury State
  const [transactions, setTransactions] = useState<LedgerTransaction[]>(() => dynamicState.transactions);
  const [originalTransactions, setOriginalTransactions] = useState<LedgerTransaction[]>(() => dynamicState.transactions);
  const [accounts, setAccounts] = useState<Account[]>(() => dynamicState.accounts);
  const [originalAccounts, setOriginalAccounts] = useState<Account[]>(() => dynamicState.accounts);
  const [epochs, setEpochs] = useState<MerkleEpoch[]>(() => dynamicState.epochs);
  const [pendingTransactions, setPendingTransactions] = useState<LedgerTransaction[]>(() => dynamicState.pendingTransactions);
  const [applicants, setApplicants] = useState<OnboardingApplicant[]>(() => dynamicState.applicants);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => dynamicState.auditLogs);

  // Cryptographic Verification State
  const [verificationResult, setVerificationResult] = useState<VerificationResult>(() =>
    verifyLedgerIntegrity(dynamicState.transactions, dynamicState.accounts, dynamicState.epochs)
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const [isTampered, setIsTampered] = useState(false);

  // Receipt Modal State
  const [inspectedTx, setInspectedTx] = useState<LedgerTransaction | null>(null);

  // Automatically persist dynamic changes to storage & backend
  useEffect(() => {
    saveDynamicState({
      users,
      accounts,
      transactions,
      epochs,
      pendingTransactions,
      applicants,
      auditLogs
    });
  }, [users, accounts, transactions, epochs, pendingTransactions, applicants, auditLogs]);

  // Helper to append signed audit log
  const addAuditLog = (action: string, details: string, severity: 'info' | 'warning' | 'critical' = 'info') => {
    const newEntry: AuditLogEntry = {
      id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action,
      details,
      severity,
      hashSignature: sha256Sync(`${Date.now()}_${currentUser.name}_${action}`)
    };
    setAuditLogs(prev => [newEntry, ...prev]);
  };

  // Re-run audit helper
  const runAudit = (txs = transactions, accs = accounts, eps = epochs) => {
    setIsVerifying(true);
    setTimeout(() => {
      const result = verifyLedgerIntegrity(txs, accs, eps);
      setVerificationResult(result);
      setIsVerifying(false);
    }, 120);
  };

  // 0. Authentication Handlers
  const handleLogin = (user: UserProfile) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    addAuditLog(
      'USER_AUTHENTICATION_SUCCESS',
      `Secure authentication established for ${user.name} (${user.role.toUpperCase()}) from 127.0.0.1. Session encrypted.`,
      'info'
    );
  };

  const handleSignOut = () => {
    addAuditLog(
      'USER_VAULT_LOCKED',
      `Active vault session cleared and locked for ${currentUser.name}.`,
      'info'
    );
    setIsAuthenticated(false);
  };

  const handleRegister = (newUser: UserProfile) => {
    // Automatically provision primary checking vault for the new registrant (in Rupees)
    const newAccount: Account = {
      id: `acc_chk_${newUser.id}`,
      accountNumber: `BV-${Math.floor(1000 + Math.random() * 9000)}-INR-01`,
      accountName: `${newUser.name} Primary Operating Vault`,
      entityName: newUser.name,
      currency: 'INR',
      type: 'operating',
      status: 'active',
      balance: 100000.00,
      reservedBalance: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const userWithAccount = {
      ...newUser,
      allowedAccountIds: [newAccount.id]
    };

    setAccounts(prev => [...prev, newAccount]);
    setUsers(prev => [...prev, userWithAccount]);
    setCurrentUser(userWithAccount);
    setIsAuthenticated(true);
    addAuditLog(
      'USER_REGISTRATION_SUCCESS',
      `New institutional account created for ${newUser.name} (${newUser.email}). Identity verified via 2FA OTP. Provisioned primary vault ${newAccount.accountNumber}.`,
      'info'
    );

    // Out-of-band email dispatch: Notify user of successful registration
    fetch('/api/auth/register-success', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newUser.name,
        email: newUser.email,
        entityType: newUser.entityType,
        kycTier: newUser.kycTier
      })
    })
      .then(res => res.json())
      .then(data => {
        console.log('[REGISTRATION EMAIL DISPATCH]', data);
      })
      .catch(err => {
        console.warn('Registration success email dispatch failed:', err);
      });
  };

  // 1. Initiate Transfer Handler
  const handleInitiateTransfer = (data: {
    sourceAccountId: string;
    targetAccountId: string;
    amount: number;
    memo: string;
  }) => {
    const source = accounts.find(a => a.id === data.sourceAccountId)!;
    const target = accounts.find(a => a.id === data.targetAccountId)!;
    const threshold = currentUser.limitConfig.dualApprovalThreshold || 50000;
    const isHighVal = requiresDualApproval(data.amount, threshold);

    const legs = [
      {
        accountId: target.id,
        accountName: target.accountName,
        type: 'DEBIT' as const,
        amount: data.amount,
        memo: `Credit inbound to ${target.accountName}`
      },
      {
        accountId: source.id,
        accountName: source.accountName,
        type: 'CREDIT' as const,
        amount: data.amount,
        memo: `Debit outbound from ${source.accountName}`
      }
    ];

    if (isHighVal) {
      // High-Value: Queue for dual approval
      const pendingTx: LedgerTransaction = {
        id: `tx_req_${Date.now().toString().slice(-6)}`,
        txIndex: transactions.length + pendingTransactions.length,
        timestamp: new Date().toISOString(),
        type: 'TRANSFER',
        status: 'PENDING_APPROVAL',
        amount: data.amount,
        currency: source.currency,
        legs,
        initiatorId: currentUser.id,
        initiatorName: currentUser.name,
        initiatorRole: currentUser.role,
        memo: data.memo,
        epochId: epochs.length + 1,
        prevHash: '',
        txDataHash: '',
        entryHash: ''
      };

      setPendingTransactions(prev => [pendingTx, ...prev]);
      addAuditLog(
        'HIGH_VALUE_MOVEMENT_QUEUED',
        `Initiated transfer of ₹${data.amount.toLocaleString('en-IN')} ${source.currency} from ${source.accountName} to ${target.accountName}. Queued for Compliance dual-signoff.`,
        'warning'
      );

      return { requiresApproval: true, txId: pendingTx.id };
    }

    // Standard Value: Immediate double-entry settlement into immutable ledger
    const lastTx = transactions[transactions.length - 1];
    const prevHash = lastTx ? lastTx.entryHash : '0000000000000000000000000000000000000000000000000000000000000000';
    const currentEpoch = epochs[epochs.length - 1];

    const partialTx: Omit<LedgerTransaction, 'entryHash' | 'txDataHash'> = {
      id: `tx_${Date.now().toString().slice(-6)}`,
      txIndex: transactions.length,
      timestamp: new Date().toISOString(),
      type: 'TRANSFER',
      status: 'SETTLED',
      amount: data.amount,
      currency: source.currency,
      legs,
      initiatorId: currentUser.id,
      initiatorName: currentUser.name,
      initiatorRole: currentUser.role,
      memo: data.memo,
      epochId: currentEpoch ? currentEpoch.epochId : 1,
      prevHash
    };

    const txDataHash = computeTxDataHash(partialTx);
    const entryHash = computeEntryHash(prevHash, txDataHash);

    const settledTx: LedgerTransaction = {
      ...partialTx,
      txDataHash,
      entryHash
    };

    // Update account balances
    const updatedAccounts = accounts.map(acc => {
      if (acc.id === target.id) {
        return { ...acc, balance: acc.balance + data.amount, updatedAt: new Date().toISOString() };
      }
      if (acc.id === source.id) {
        return { ...acc, balance: acc.balance - data.amount, updatedAt: new Date().toISOString() };
      }
      return acc;
    });

    const updatedTransactions = [...transactions, settledTx];

    // Update current epoch Merkle root
    const epochTxs = updatedTransactions.filter(t => t.epochId === currentEpoch.epochId);
    const { root: newEpochRoot } = buildMerkleTree(epochTxs.map(t => t.entryHash));
    const updatedEpochs = epochs.map(ep =>
      ep.epochId === currentEpoch.epochId
        ? { ...ep, txCount: epochTxs.length, merkleRoot: newEpochRoot, txHashes: epochTxs.map(t => t.entryHash) }
        : ep
    );

    setAccounts(updatedAccounts);
    setTransactions(updatedTransactions);
    setOriginalTransactions(updatedTransactions);
    setOriginalAccounts(updatedAccounts);
    setEpochs(updatedEpochs);

    addAuditLog(
      'TRANSFER_SETTLED',
      `Direct transfer of ₹${data.amount.toLocaleString('en-IN')} ${source.currency} settled into block #${settledTx.txIndex} (${settledTx.entryHash.slice(0, 10)}...).`,
      'info'
    );

    runAudit(updatedTransactions, updatedAccounts, updatedEpochs);
    return { requiresApproval: false, txId: settledTx.id };
  };

  // 2. Approve Pending Transfer Handler
  const handleApprovePending = (txId: string) => {
    const pendingTx = pendingTransactions.find(t => t.id === txId);
    if (!pendingTx) return;

    const lastTx = transactions[transactions.length - 1];
    const prevHash = lastTx ? lastTx.entryHash : '0000000000000000000000000000000000000000000000000000000000000000';
    const currentEpoch = epochs[epochs.length - 1];

    const partialTx: Omit<LedgerTransaction, 'entryHash' | 'txDataHash'> = {
      ...pendingTx,
      txIndex: transactions.length,
      status: 'SETTLED',
      approverId: currentUser.id,
      approverName: currentUser.name,
      approverRole: currentUser.role,
      approvalTimestamp: new Date().toISOString(),
      epochId: currentEpoch ? currentEpoch.epochId : 1,
      prevHash
    };

    const txDataHash = computeTxDataHash(partialTx);
    const entryHash = computeEntryHash(prevHash, txDataHash);

    const settledTx: LedgerTransaction = {
      ...partialTx,
      txDataHash,
      entryHash
    };

    // Update account balances
    const updatedAccounts = accounts.map(acc => {
      const debitLeg = pendingTx.legs.find(l => l.accountId === acc.id && l.type === 'DEBIT');
      const creditLeg = pendingTx.legs.find(l => l.accountId === acc.id && l.type === 'CREDIT');
      let newBal = acc.balance;
      if (debitLeg) newBal += debitLeg.amount;
      if (creditLeg) newBal -= creditLeg.amount;
      return { ...acc, balance: newBal, updatedAt: new Date().toISOString() };
    });

    const updatedTransactions = [...transactions, settledTx];

    // Update epoch Merkle root
    const epochTxs = updatedTransactions.filter(t => t.epochId === currentEpoch.epochId);
    const { root: newEpochRoot } = buildMerkleTree(epochTxs.map(t => t.entryHash));
    const updatedEpochs = epochs.map(ep =>
      ep.epochId === currentEpoch.epochId
        ? { ...ep, txCount: epochTxs.length, merkleRoot: newEpochRoot, txHashes: epochTxs.map(t => t.entryHash) }
        : ep
    );

    setPendingTransactions(prev => prev.filter(t => t.id !== txId));
    setAccounts(updatedAccounts);
    setTransactions(updatedTransactions);
    setOriginalTransactions(updatedTransactions);
    setOriginalAccounts(updatedAccounts);
    setEpochs(updatedEpochs);

    addAuditLog(
      'DUAL_APPROVAL_AUTHORIZED',
      `High-value movement of ₹${settledTx.amount.toLocaleString('en-IN')} ${settledTx.currency} approved by ${currentUser.name} (${currentUser.role.toUpperCase()}) and sealed to block #${settledTx.txIndex}.`,
      'info'
    );

    runAudit(updatedTransactions, updatedAccounts, updatedEpochs);
  };

  // 3. Reject Pending Transfer Handler
  const handleRejectPending = (txId: string, reason: string) => {
    const pendingTx = pendingTransactions.find(t => t.id === txId);
    if (!pendingTx) return;

    setPendingTransactions(prev => prev.filter(t => t.id !== txId));
    addAuditLog(
      'DUAL_APPROVAL_REJECTED',
      `High-value request ${txId} rejected by ${currentUser.name} (${currentUser.role.toUpperCase()}). Reason: "${reason}"`,
      'warning'
    );
  };

  // 4. Batch Disbursement Handler
  const handleExecuteBatchDisbursement = (items: { accountId: string; amount: number; memo: string }[]) => {
    const source = accounts.find(a => a.id === 'acc_operating_usd') || accounts[0];
    const totalAmount = items.reduce((s, i) => s + i.amount, 0);

    const legs = [
      ...items.map(item => {
        const dest = accounts.find(a => a.id === item.accountId) || source;
        return {
          accountId: dest.id,
          accountName: dest.accountName,
          type: 'DEBIT' as const,
          amount: item.amount,
          memo: item.memo
        };
      }),
      {
        accountId: source.id,
        accountName: source.accountName,
        type: 'CREDIT' as const,
        amount: totalAmount,
        memo: `Batch disbursement draw from ${source.accountName}`
      }
    ];

    const lastTx = transactions[transactions.length - 1];
    const prevHash = lastTx ? lastTx.entryHash : '0000000000000000000000000000000000000000000000000000000000000000';
    const currentEpoch = epochs[epochs.length - 1];

    const partialTx: Omit<LedgerTransaction, 'entryHash' | 'txDataHash'> = {
      id: `tx_batch_${Date.now().toString().slice(-6)}`,
      txIndex: transactions.length,
      timestamp: new Date().toISOString(),
      type: 'DISBURSEMENT',
      status: 'SETTLED',
      amount: totalAmount,
      currency: source.currency,
      legs,
      initiatorId: currentUser.id,
      initiatorName: currentUser.name,
      initiatorRole: currentUser.role,
      memo: `Atomic 3-Way Terminal & Port Disbursement (${items.length} payouts)`,
      batchId: `BATCH-${Date.now().toString().slice(-8)}`,
      epochId: currentEpoch ? currentEpoch.epochId : 1,
      prevHash
    };

    const txDataHash = computeTxDataHash(partialTx);
    const entryHash = computeEntryHash(prevHash, txDataHash);

    const settledTx: LedgerTransaction = {
      ...partialTx,
      txDataHash,
      entryHash
    };

    const updatedAccounts = accounts.map(acc => {
      let change = 0;
      for (const item of items) {
        if (item.accountId === acc.id) change += item.amount;
      }
      if (acc.id === source.id) change -= totalAmount;
      return { ...acc, balance: acc.balance + change, updatedAt: new Date().toISOString() };
    });

    const updatedTransactions = [...transactions, settledTx];

    const epochTxs = updatedTransactions.filter(t => t.epochId === currentEpoch.epochId);
    const { root: newEpochRoot } = buildMerkleTree(epochTxs.map(t => t.entryHash));
    const updatedEpochs = epochs.map(ep =>
      ep.epochId === currentEpoch.epochId
        ? { ...ep, txCount: epochTxs.length, merkleRoot: newEpochRoot, txHashes: epochTxs.map(t => t.entryHash) }
        : ep
    );

    setAccounts(updatedAccounts);
    setTransactions(updatedTransactions);
    setOriginalTransactions(updatedTransactions);
    setOriginalAccounts(updatedAccounts);
    setEpochs(updatedEpochs);

    addAuditLog(
      'BATCH_DISBURSEMENT_SETTLED',
      `Batch run ${settledTx.batchId} (₹${totalAmount.toLocaleString('en-IN')} ${source.currency}) committed with Merkle hash ${settledTx.entryHash.slice(0, 10)}...`,
      'info'
    );

    runAudit(updatedTransactions, updatedAccounts, updatedEpochs);
  };

  // 5. Freeze / Unfreeze Handler
  const handleToggleFreezeAccount = (accountId: string, reason: string) => {
    const acc = accounts.find(a => a.id === accountId);
    if (!acc) return;

    const willFreeze = acc.status !== 'frozen';
    const updatedAccounts = accounts.map(a => {
      if (a.id === accountId) {
        return {
          ...a,
          status: (willFreeze ? 'frozen' : 'active') as Account['status'],
          freezeReason: willFreeze ? reason : undefined,
          freezeActor: willFreeze ? currentUser.name : undefined,
          freezeTimestamp: willFreeze ? new Date().toISOString() : undefined,
          updatedAt: new Date().toISOString()
        };
      }
      return a;
    });

    setAccounts(updatedAccounts);
    setOriginalAccounts(updatedAccounts);

    addAuditLog(
      willFreeze ? 'ACCOUNT_REGULATORY_FREEZE' : 'ACCOUNT_UNFROZEN',
      `${willFreeze ? 'Frozen' : 'Unfrozen'} ${acc.accountName} (${acc.accountNumber}). Memo: "${reason}" by ${currentUser.name} (${currentUser.role.toUpperCase()})`,
      willFreeze ? 'warning' : 'info'
    );
  };

  // 6. Adjust Reserved Balance
  const handleUpdateReservedBalance = (accountId: string, newReserve: number) => {
    const acc = accounts.find(a => a.id === accountId);
    if (!acc) return;

    const updatedAccounts = accounts.map(a => {
      if (a.id === accountId) {
        return { ...a, reservedBalance: newReserve, updatedAt: new Date().toISOString() };
      }
      return a;
    });

    setAccounts(updatedAccounts);
    setOriginalAccounts(updatedAccounts);

    addAuditLog(
      'RESERVE_COLLATERAL_ADJUSTED',
      `Updated reserved margin collateral on ${acc.accountName} to ₹${newReserve.toLocaleString('en-IN')}`,
      'info'
    );
  };

  // 7. Approve Onboarding Applicant
  const handleApproveApplicant = (applicantId: string, initialDeposit: number, currency: Currency) => {
    const app = applicants.find(a => a.id === applicantId);
    if (!app) return;

    // Create client's new vault account
    const newAccount: Account = {
      id: `acc_client_${Date.now().toString().slice(-6)}`,
      accountNumber: `BV-${Math.floor(1000 + Math.random() * 9000)}-${currency}-01`,
      accountName: `${app.legalName} Primary Vault`,
      entityName: app.legalName,
      currency,
      type: 'operating',
      status: 'active',
      balance: initialDeposit,
      reservedBalance: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Credit client account, debit core treasury reserve
    const treasury = accounts.find(a => a.id === 'acc_treasury_core_usd') || accounts[0];
    const updatedAccounts = [
      ...accounts.map(a => {
        if (a.id === treasury.id) {
          return { ...a, balance: a.balance - initialDeposit };
        }
        return a;
      }),
      newAccount
    ];

    // Chained ledger transaction for initialization
    const lastTx = transactions[transactions.length - 1];
    const prevHash = lastTx ? lastTx.entryHash : '0000000000000000000000000000000000000000000000000000000000000000';
    const currentEpoch = epochs[epochs.length - 1];

    const partialTx: Omit<LedgerTransaction, 'entryHash' | 'txDataHash'> = {
      id: `tx_onboard_${Date.now().toString().slice(-6)}`,
      txIndex: transactions.length,
      timestamp: new Date().toISOString(),
      type: 'DEPOSIT',
      status: 'SETTLED',
      amount: initialDeposit,
      currency,
      legs: [
        {
          accountId: newAccount.id,
          accountName: newAccount.accountName,
          type: 'DEBIT',
          amount: initialDeposit,
          memo: `Initial capitalization deposit for ${app.legalName}`
        },
        {
          accountId: treasury.id,
          accountName: treasury.accountName,
          type: 'CREDIT',
          amount: initialDeposit,
          memo: `Treasury capital underwriting allocation`
        }
      ],
      initiatorId: currentUser.id,
      initiatorName: currentUser.name,
      initiatorRole: currentUser.role,
      approverId: currentUser.id,
      approverName: currentUser.name,
      approverRole: currentUser.role,
      approvalTimestamp: new Date().toISOString(),
      memo: `Institutional Client Onboarding Capitalization: ${app.legalName}`,
      epochId: currentEpoch ? currentEpoch.epochId : 1,
      prevHash
    };

    const txDataHash = computeTxDataHash(partialTx);
    const entryHash = computeEntryHash(prevHash, txDataHash);

    const settledTx: LedgerTransaction = {
      ...partialTx,
      txDataHash,
      entryHash
    };

    const updatedTransactions = [...transactions, settledTx];

    const epochTxs = updatedTransactions.filter(t => t.epochId === currentEpoch.epochId);
    const { root: newEpochRoot } = buildMerkleTree(epochTxs.map(t => t.entryHash));
    const updatedEpochs = epochs.map(ep =>
      ep.epochId === currentEpoch.epochId
        ? { ...ep, txCount: epochTxs.length, merkleRoot: newEpochRoot, txHashes: epochTxs.map(t => t.entryHash) }
        : ep
    );

    setApplicants(prev =>
      prev.map(a =>
        a.id === applicantId
          ? {
              ...a,
              status: 'approved',
              reviewedBy: currentUser.name,
              reviewedAt: new Date().toISOString()
            }
          : a
      )
    );

    setAccounts(updatedAccounts);
    setTransactions(updatedTransactions);
    setOriginalTransactions(updatedTransactions);
    setOriginalAccounts(updatedAccounts);
    setEpochs(updatedEpochs);

    addAuditLog(
      'ONBOARDING_APPROVED_AND_PROVISIONED',
      `Approved institutional client ${app.legalName}. Allocated vault ${newAccount.accountNumber} with ₹${initialDeposit.toLocaleString('en-IN')} capitalization.`,
      'info'
    );

    // Send successful registration & onboarding welcome email
    if (app.contactEmail) {
      fetch('/api/auth/register-success', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: app.legalName,
          email: app.contactEmail,
          entityType: app.entityType,
          kycTier: app.requestedTier,
          accountNumber: newAccount.accountNumber,
          initialDeposit,
          currency
        })
      })
        .then(res => res.json())
        .then(data => console.log('[ONBOARDING EMAIL DISPATCH]', data))
        .catch(err => console.warn('Onboarding email dispatch error:', err));
    }

    runAudit(updatedTransactions, updatedAccounts, updatedEpochs);
  };

  // 8. Reject Onboarding Applicant
  const handleRejectApplicant = (applicantId: string, reason: string) => {
    setApplicants(prev =>
      prev.map(a =>
        a.id === applicantId
          ? {
              ...a,
              status: 'rejected',
              reviewedBy: currentUser.name,
              reviewedAt: new Date().toISOString(),
              notes: reason
            }
          : a
      )
    );

    addAuditLog(
      'ONBOARDING_REJECTED',
      `Rejected applicant ${applicantId}. Reason: "${reason}" by ${currentUser.name}`,
      'warning'
    );
  };

  // 9. Submit New Applicant
  const handleSubmitNewApplicant = (newApp: Omit<OnboardingApplicant, 'id' | 'status' | 'submittedAt'>) => {
    const applicant: OnboardingApplicant = {
      ...newApp,
      id: `app_${Date.now().toString().slice(-6)}`,
      status: 'pending_review',
      submittedAt: new Date().toISOString()
    };

    setApplicants(prev => [applicant, ...prev]);
    addAuditLog(
      'ONBOARDING_APPLICATION_SUBMITTED',
      `Submitted entity verification for ${applicant.legalName} (${applicant.country}, ${applicant.requestedTier.toUpperCase()}).`,
      'info'
    );
  };

  // 10. Policy Limits Update
  const handleUpdatePolicyLimits = (dailyMax: number, dualThreshold: number) => {
    const updatedUsers = users.map(u => ({
      ...u,
      limitConfig: {
        dailyMax: u.role === 'admin' ? dailyMax * 2 : dailyMax,
        dualApprovalThreshold: dualThreshold
      }
    }));

    setUsers(updatedUsers);
    setCurrentUser(prev => ({
      ...prev,
      limitConfig: {
        dailyMax: prev.role === 'admin' ? dailyMax * 2 : dailyMax,
        dualApprovalThreshold: dualThreshold
      }
    }));

    addAuditLog(
      'POLICY_LIMITS_RECONFIGURED',
      `Updated institutional dual-authorization threshold to ₹${dualThreshold.toLocaleString('en-IN')} and daily max to ₹${dailyMax.toLocaleString('en-IN')}`,
      'warning'
    );
  };

  // 11. Tamper Simulation Lab (Auditor feature)
  const handleSimulateTamper = (type: 'amount' | 'memo' | 'chain', txIndex: number) => {
    const targetIdx = transactions.findIndex(t => t.txIndex === txIndex);
    if (targetIdx === -1) return;

    const modifiedTxs = [...transactions];
    const target = { ...modifiedTxs[targetIdx] };

    if (type === 'amount') {
      target.amount = target.amount + 10000;
    } else if (type === 'memo') {
      target.memo = target.memo + ' [CORRUPTED BY SIMULATED INTRUDER]';
    } else if (type === 'chain') {
      target.prevHash = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    }

    modifiedTxs[targetIdx] = target;
    setTransactions(modifiedTxs);
    setIsTampered(true);

    addAuditLog(
      'TAMPER_SIMULATION_INJECTED',
      `Simulated ${type} alteration on Block #${txIndex} (${target.id}) to test zero-trust detection.`,
      'critical'
    );

    runAudit(modifiedTxs, accounts, epochs);
  };

  // 12. Restore Clean Ledger
  const handleRestoreLedger = () => {
    setTransactions(originalTransactions);
    setAccounts(originalAccounts);
    setIsTampered(false);

    addAuditLog(
      'LEDGER_INTEGRITY_RESTORED',
      'Restored clean cryptographic ledger state from verifiable baseline.',
      'info'
    );

    runAudit(originalTransactions, originalAccounts, epochs);
  };

  // 13. Create New Vault Account (From Reference Architecture)
  const handleCreateAccount = (data: {
    name: string;
    type: AccountType;
    initialBalance: number;
    currency: Currency;
  }) => {
    const newAccId = `acc_vault_${Date.now().toString().slice(-4)}`;
    const newAcc: Account = {
      id: newAccId,
      accountNumber: `BV-${String(data.type).slice(0, 3).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`,
      accountName: data.name,
      entityName: currentUser.name,
      currency: data.currency,
      type: data.type,
      status: 'active',
      balance: data.initialBalance,
      reservedBalance: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    let updatedAccounts = [...accounts, newAcc];
    let updatedTxs = [...transactions];

    if (data.initialBalance > 0) {
      const master = accounts.find(a => a.id === 'acc_treasury_core_usd') || accounts[0];
      const txId = `tx_${Date.now().toString().slice(-4)}`;
      const prevHash = transactions[transactions.length - 1]?.entryHash || '0'.repeat(64);

      const newTx: LedgerTransaction = {
        id: txId,
        txIndex: transactions.length,
        timestamp: new Date().toISOString(),
        type: 'DEPOSIT',
        status: 'SETTLED',
        amount: data.initialBalance,
        currency: data.currency,
        legs: [
          {
            accountId: newAcc.id,
            accountName: newAcc.accountName,
            type: 'DEBIT',
            amount: data.initialBalance,
            memo: 'Account initial deposit allocation'
          },
          {
            accountId: master.id,
            accountName: master.accountName,
            type: 'CREDIT',
            amount: data.initialBalance,
            memo: `Initial reserve allocation to ${data.name}`
          }
        ],
        initiatorId: currentUser.id,
        initiatorName: currentUser.name,
        initiatorRole: currentUser.role,
        memo: `Initial balance funding for ${data.name}`,
        epochId: epochs.length ? epochs[epochs.length - 1].epochId : 1,
        prevHash,
        txDataHash: '',
        entryHash: ''
      };

      newTx.txDataHash = computeTxDataHash(newTx);
      newTx.entryHash = computeEntryHash(newTx.prevHash, newTx.txDataHash);

      updatedTxs.push(newTx);
      updatedAccounts = updatedAccounts.map(a => {
        if (a.id === master.id) return { ...a, balance: a.balance - data.initialBalance, updatedAt: new Date().toISOString() };
        return a;
      });
    }

    if (currentUser.allowedAccountIds && !currentUser.allowedAccountIds.includes('*')) {
      const updatedUser = {
        ...currentUser,
        allowedAccountIds: [...currentUser.allowedAccountIds, newAccId]
      };
      setCurrentUser(updatedUser);
      setUsers(users.map(u => u.id === currentUser.id ? updatedUser : u));
    }

    setAccounts(updatedAccounts);
    setTransactions(updatedTxs);
    setOriginalAccounts(updatedAccounts);
    setOriginalTransactions(updatedTxs);

    addAuditLog(
      'ACCOUNT_OPENED',
      `New vault account opened: ${newAcc.accountName} (${newAcc.accountNumber}) with initial balance of ₹${data.initialBalance.toLocaleString('en-IN')} ${data.currency}.`,
      'info'
    );

    runAudit(updatedTxs, updatedAccounts, epochs);
  };

  // Quick Deposit Handler (Dynamic Double-Entry Funding)
  const handleQuickDeposit = (accountId: string, amount: number, memo: string) => {
    const acc = accounts.find(a => a.id === accountId);
    if (!acc || amount <= 0) return;

    const master = accounts.find(a => a.id === 'acc_treasury_core_usd') || accounts[0];
    const lastTx = transactions[transactions.length - 1];
    const prevHash = lastTx ? lastTx.entryHash : '0'.repeat(64);
    const currentEpoch = epochs[epochs.length - 1] || { epochId: 1 };

    const legs = [
      {
        accountId: acc.id,
        accountName: acc.accountName,
        type: 'DEBIT' as const,
        amount,
        memo: `Direct deposit credit into ${acc.accountName}`
      },
      {
        accountId: master.id,
        accountName: master.accountName,
        type: 'CREDIT' as const,
        amount,
        memo: `Treasury liquidity draw for deposit`
      }
    ];

    const partialTx: Omit<LedgerTransaction, 'entryHash' | 'txDataHash'> = {
      id: `tx_dep_${Date.now().toString().slice(-6)}`,
      txIndex: transactions.length,
      timestamp: new Date().toISOString(),
      type: 'DEPOSIT',
      status: 'SETTLED',
      amount,
      currency: acc.currency,
      legs,
      initiatorId: currentUser.id,
      initiatorName: currentUser.name,
      initiatorRole: currentUser.role,
      memo: memo || `Direct deposit to ${acc.accountName}`,
      epochId: currentEpoch.epochId,
      prevHash
    };

    const txDataHash = computeTxDataHash(partialTx);
    const entryHash = computeEntryHash(prevHash, txDataHash);

    const settledTx: LedgerTransaction = {
      ...partialTx,
      txDataHash,
      entryHash
    };

    const updatedAccounts = accounts.map(a => {
      if (a.id === acc.id) return { ...a, balance: a.balance + amount, updatedAt: new Date().toISOString() };
      if (a.id === master.id) return { ...a, balance: a.balance - amount, updatedAt: new Date().toISOString() };
      return a;
    });

    const updatedTxs = [...transactions, settledTx];

    const epochTxs = updatedTxs.filter(t => t.epochId === currentEpoch.epochId);
    const { root: newEpochRoot } = buildMerkleTree(epochTxs.map(t => t.entryHash));
    const updatedEpochs = epochs.map(ep =>
      ep.epochId === currentEpoch.epochId
        ? { ...ep, txCount: epochTxs.length, merkleRoot: newEpochRoot, txHashes: epochTxs.map(t => t.entryHash) }
        : ep
    );

    setAccounts(updatedAccounts);
    setTransactions(updatedTxs);
    setOriginalAccounts(updatedAccounts);
    setOriginalTransactions(updatedTxs);
    setEpochs(updatedEpochs);

    addAuditLog(
      'FUNDS_DEPOSITED',
      `Deposited ₹${amount.toLocaleString('en-IN')} ${acc.currency} into ${acc.accountName} (${settledTx.entryHash.slice(0, 10)}...).`,
      'info'
    );

    runAudit(updatedTxs, updatedAccounts, updatedEpochs);
  };

  // Quick Withdraw Handler (Dynamic Double-Entry Payout)
  const handleQuickWithdraw = (accountId: string, amount: number, memo: string) => {
    const acc = accounts.find(a => a.id === accountId);
    if (!acc || amount <= 0) return;
    if (acc.balance < amount) {
      alert('Insufficient available funds.');
      return;
    }

    const master = accounts.find(a => a.id === 'acc_treasury_core_usd') || accounts[0];
    const lastTx = transactions[transactions.length - 1];
    const prevHash = lastTx ? lastTx.entryHash : '0'.repeat(64);
    const currentEpoch = epochs[epochs.length - 1] || { epochId: 1 };

    const legs = [
      {
        accountId: master.id,
        accountName: master.accountName,
        type: 'DEBIT' as const,
        amount,
        memo: `Treasury liquidation return from ${acc.accountName}`
      },
      {
        accountId: acc.id,
        accountName: acc.accountName,
        type: 'CREDIT' as const,
        amount,
        memo: `Withdrawal payout from ${acc.accountName}`
      }
    ];

    const partialTx: Omit<LedgerTransaction, 'entryHash' | 'txDataHash'> = {
      id: `tx_wth_${Date.now().toString().slice(-6)}`,
      txIndex: transactions.length,
      timestamp: new Date().toISOString(),
      type: 'DISBURSEMENT',
      status: 'SETTLED',
      amount,
      currency: acc.currency,
      legs,
      initiatorId: currentUser.id,
      initiatorName: currentUser.name,
      initiatorRole: currentUser.role,
      memo: memo || `Withdrawal payout from ${acc.accountName}`,
      epochId: currentEpoch.epochId,
      prevHash
    };

    const txDataHash = computeTxDataHash(partialTx);
    const entryHash = computeEntryHash(prevHash, txDataHash);

    const settledTx: LedgerTransaction = {
      ...partialTx,
      txDataHash,
      entryHash
    };

    const updatedAccounts = accounts.map(a => {
      if (a.id === acc.id) return { ...a, balance: a.balance - amount, updatedAt: new Date().toISOString() };
      if (a.id === master.id) return { ...a, balance: a.balance + amount, updatedAt: new Date().toISOString() };
      return a;
    });

    const updatedTxs = [...transactions, settledTx];

    const epochTxs = updatedTxs.filter(t => t.epochId === currentEpoch.epochId);
    const { root: newEpochRoot } = buildMerkleTree(epochTxs.map(t => t.entryHash));
    const updatedEpochs = epochs.map(ep =>
      ep.epochId === currentEpoch.epochId
        ? { ...ep, txCount: epochTxs.length, merkleRoot: newEpochRoot, txHashes: epochTxs.map(t => t.entryHash) }
        : ep
    );

    setAccounts(updatedAccounts);
    setTransactions(updatedTxs);
    setOriginalAccounts(updatedAccounts);
    setOriginalTransactions(updatedTxs);
    setEpochs(updatedEpochs);

    addAuditLog(
      'FUNDS_WITHDRAWN',
      `Withdrew ₹${amount.toLocaleString('en-IN')} ${acc.currency} from ${acc.accountName} (${settledTx.entryHash.slice(0, 10)}...).`,
      'info'
    );

    runAudit(updatedTxs, updatedAccounts, updatedEpochs);
  };

  // 14. RBAC User Directory Management
  const handleUpdateUserRole = (userId: string, newRole: Role) => {
    setUsers(prev => prev.map(u => (u.id === userId ? { ...u, role: newRole } : u)));
    if (currentUser.id === userId) {
      setCurrentUser(prev => ({ ...prev, role: newRole }));
    }
    addAuditLog(
      'USER_ROLE_ASSIGNED',
      `RBAC permissions updated for user ${userId} to role ${newRole.toUpperCase()} by ${currentUser.name}.`,
      'warning'
    );
  };

  const handleToggleUserStatus = (userId: string) => {
    setUsers(prev =>
      prev.map(u => {
        if (u.id !== userId) return u;
        const newStatus = u.kycStatus === 'verified' ? 'review_required' : 'verified';
        return { ...u, kycStatus: newStatus };
      })
    );
    addAuditLog(
      'USER_STATUS_MODIFIED',
      `Account active status toggled for user ID ${userId} by ${currentUser.name}.`,
      'warning'
    );
  };

  const pendingApprovalsCount = pendingTransactions.length;
  const pendingOnboardingCount = applicants.filter(a => a.status === 'pending_review').length;

  const inspectedEpoch = inspectedTx
    ? epochs.find(e => e.epochId === inspectedTx.epochId)
    : undefined;

  const epochTxs = inspectedTx
    ? transactions.filter(t => t.epochId === inspectedTx.epochId && t.status === 'SETTLED')
    : [];

  // Authentication & Security Gate: Display Login or Register screen if unauthenticated
  if (!isAuthenticated) {
    if (authView === 'register') {
      return (
        <RegisterPage
          onRegister={handleRegister}
          onNavigateToLogin={() => setAuthView('login')}
        />
      );
    }
    return (
      <LoginPage
        users={users}
        onLogin={handleLogin}
        onNavigateToRegister={() => setAuthView('register')}
      />
    );
  }

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-[#f8faf8] text-slate-800 flex flex-col lg:flex-row font-sans selection:bg-slate-800 selection:text-white">
      {/* Left Vertical Sidebar with Headings */}
      <Sidebar
        currentUser={currentUser}
        users={users}
        onSelectUser={setCurrentUser}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenCreateAccount={() => setIsCreateAccountOpen(true)}
        pendingApprovalsCount={pendingApprovalsCount}
        pendingOnboardingCount={pendingOnboardingCount}
        verificationResult={verificationResult}
        onRunAudit={() => runAudit()}
        isVerifying={isVerifying}
        onSignOut={handleSignOut}
      />

      {/* Main Content Area (Right Side - Independently Scrollable) */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f8faf8] overflow-y-auto lg:h-screen">
        {/* Top Header Bar Matching Screenshot */}
        <header className="border-b border-[#e5e7eb] bg-[#ffffff] px-6 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 font-sans">
            <span>Workspace</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-semibold capitalize">
              {activeTab === 'overview'
                ? 'Overview'
                : activeTab === 'accounts'
                ? 'Accounts'
                : activeTab === 'statements'
                ? 'Statements'
                : activeTab === 'ledger'
                ? 'Provable Ledger'
                : activeTab === 'directory'
                ? 'User Directory'
                : activeTab === 'onboarding'
                ? 'Client Onboarding'
                : 'Audit Trail'}
            </span>
          </div>

          {/* Right Header: User Persona */}
          <div className="flex items-center gap-4">
            {/* Persona Switcher Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-[#cbd5c0] text-[#13382c] font-bold text-xs flex items-center justify-center font-sans">
                  {currentUser.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold text-slate-900 leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-500 leading-tight">
                    {currentUser.title || 'Account holder'}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {roleMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl z-50 p-3 space-y-3">
                  {/* Shows ONLY the logged-in user's personal active session profile */}
                  <div className="space-y-3">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-100 pb-1.5 flex items-center justify-between">
                      <span>Active Session Profile</span>
                      <span className="text-[9px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        Verified
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#cbd5c0] text-[#13382c] font-bold text-sm flex items-center justify-center font-sans shrink-0">
                        {currentUser.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 leading-tight truncate">
                          {currentUser.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">
                          {currentUser.email}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {currentUser.role}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono uppercase">
                            {currentUser.kycTier}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Admin quick access to dedicated User Directory tab */}
                    {currentUser.role === 'admin' && (
                      <div className="pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('directory');
                            setRoleMenuOpen(false);
                          }}
                          className="w-full flex items-center justify-between py-2 px-2.5 rounded-xl text-xs text-slate-700 hover:bg-slate-50 border border-slate-200 transition cursor-pointer font-medium"
                        >
                          <span>Open User Directory</span>
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                            {users.length} users
                          </span>
                        </button>
                      </div>
                    )}

                    <div className="border-t border-slate-100 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRoleMenuOpen(false);
                          handleSignOut();
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs text-rose-600 hover:bg-rose-50 border border-rose-100 transition cursor-pointer font-medium"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Lock Vault & Sign Out</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* View Container: Only shows related data for clicked heading */}
        <main className="flex-1 px-4 py-3 sm:px-6 sm:py-4 max-w-7xl w-full mx-auto space-y-3.5">
          {activeTab === 'overview' && (
            <OverviewPage
              currentUser={currentUser}
              accounts={accounts}
              transactions={transactions}
              verificationResult={verificationResult}
              onNavigateToAccounts={() => setActiveTab('accounts')}
              onNavigateToTransfers={(mode) => setActiveTab('statements')}
              onOpenCreateAccount={() => setIsCreateAccountOpen(true)}
              onQuickDeposit={handleQuickDeposit}
              onQuickWithdraw={handleQuickWithdraw}
            />
          )}

          {activeTab === 'accounts' && (
            <AccountsManagement
              currentUser={currentUser}
              accounts={accounts}
              onToggleFreezeAccount={handleToggleFreezeAccount}
              onUpdateReservedBalance={handleUpdateReservedBalance}
              onOpenCreateAccount={() => setIsCreateAccountOpen(true)}
            />
          )}

          {activeTab === 'statements' && (
            <MoneyMovementHub
              currentUser={currentUser}
              accounts={accounts}
              pendingTransactions={pendingTransactions}
              onInitiateTransfer={handleInitiateTransfer}
              onApprovePending={handleApprovePending}
              onRejectPending={handleRejectPending}
              onExecuteBatchDisbursement={handleExecuteBatchDisbursement}
            />
          )}

          {activeTab === 'ledger' && (
            <LedgerAuditView
              currentUser={currentUser}
              transactions={transactions}
              accounts={accounts}
              epochs={epochs}
              verificationResult={verificationResult}
              isVerifying={isVerifying}
              onRunAudit={() => runAudit()}
              onSimulateTamper={handleSimulateTamper}
              onRestoreLedger={handleRestoreLedger}
              isTampered={isTampered}
              onInspectTransaction={setInspectedTx}
            />
          )}

          {activeTab === 'directory' && (
            currentUser.role === 'admin' ? (
              <AdminUsersDirectory
                currentUser={currentUser}
                users={users}
                onUpdateUserRole={handleUpdateUserRole}
                onToggleUserStatus={handleToggleUserStatus}
              />
            ) : (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs max-w-lg mx-auto mt-12 space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                  <Shield className="w-6 h-6" />
                </div>
                <h2 className="text-base font-semibold text-slate-800">Administrator Access Restricted</h2>
                <p className="text-xs text-slate-500">Only authorized platform administrators have access to view and manage registered institutional user profiles.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="px-4 py-2 rounded-xl bg-[#13382c] text-white text-xs font-medium cursor-pointer"
                >
                  Return to My Workspace
                </button>
              </div>
            )
          )}

          {activeTab === 'onboarding' && (
            currentUser.role === 'admin' ? (
              <UserOnboarding
                currentUser={currentUser}
                applicants={applicants}
                onApproveApplicant={handleApproveApplicant}
                onRejectApplicant={handleRejectApplicant}
                onSubmitNewApplicant={handleSubmitNewApplicant}
              />
            ) : (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs max-w-lg mx-auto mt-12 space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                  <Shield className="w-6 h-6" />
                </div>
                <h2 className="text-base font-semibold text-slate-800">Administrator Access Restricted</h2>
                <p className="text-xs text-slate-500">Only platform compliance administrators have authorization to review and approve institutional onboarding applications.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="px-4 py-2 rounded-xl bg-[#13382c] text-white text-xs font-medium cursor-pointer"
                >
                  Return to My Workspace
                </button>
              </div>
            )
          )}

          {activeTab === 'audit' && (
            <AuditLogsView
              currentUser={currentUser}
              auditLogs={auditLogs}
              transactions={transactions}
              verificationResult={verificationResult}
              onUpdatePolicyLimits={handleUpdatePolicyLimits}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-[#e2e8df] py-4 px-6 sm:px-8 text-xs text-[#69887b] font-mono flex flex-col sm:flex-row items-center justify-between gap-2 mt-auto">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            <span>Vaultora Cryptographic Engine &middot; RFC 6234 / RFC 6962</span>
          </div>
          <div className="text-[#87a094] text-[11px]">
            Institutional Dual-Approval Threshold: ₹{currentUser.limitConfig.dualApprovalThreshold.toLocaleString('en-IN')}
          </div>
        </footer>
      </div>

      {/* Create Account Modal */}
      <CreateAccountModal
        isOpen={isCreateAccountOpen}
        onClose={() => setIsCreateAccountOpen(false)}
        onCreateAccount={handleCreateAccount}
      />

      {/* Cryptographic Receipt Modal */}
      {inspectedTx && (
        <CryptographicReceiptModal
          transaction={inspectedTx}
          epoch={inspectedEpoch}
          epochTxs={epochTxs}
          onClose={() => setInspectedTx(null)}
        />
      )}
    </div>
  );
}
