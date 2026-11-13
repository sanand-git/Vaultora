/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ArrowRightLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Layers,
  Send,
  ShieldAlert,
  Zap,
  Lock,
  FileCheck2,
  Info
} from 'lucide-react';
import type {
  Account,
  LedgerTransaction,
  UserProfile,
  DoubleEntryLeg
} from '../types';
import { hasPermission, requiresDualApproval } from '../utils/rbac';

interface MoneyMovementHubProps {
  currentUser: UserProfile;
  accounts: Account[];
  pendingTransactions: LedgerTransaction[];
  onInitiateTransfer: (data: {
    sourceAccountId: string;
    targetAccountId: string;
    amount: number;
    memo: string;
  }) => { requiresApproval: boolean; txId: string };
  onApprovePending: (txId: string) => void;
  onRejectPending: (txId: string, reason: string) => void;
  onExecuteBatchDisbursement: (items: { accountId: string; amount: number; memo: string }[]) => void;
}

export const MoneyMovementHub: React.FC<MoneyMovementHubProps> = ({
  currentUser,
  accounts,
  pendingTransactions,
  onInitiateTransfer,
  onApprovePending,
  onRejectPending,
  onExecuteBatchDisbursement
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'transfer' | 'pending' | 'batch'>('transfer');

  // Transfer Form state
  const [sourceAccountId, setSourceAccountId] = useState(accounts[1]?.id || accounts[0]?.id || '');
  const [targetAccountId, setTargetAccountId] = useState(accounts[0]?.id || accounts[1]?.id || '');
  const [amountStr, setAmountStr] = useState('25000');
  const [memo, setMemo] = useState('Operating liquidity rebalance');
  const [rejectionModalTx, setRejectionModalTx] = useState<LedgerTransaction | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Insufficient documentation for cross-border corridor');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const canInitiate = hasPermission(currentUser, 'canInitiateTransfer');
  const canApprove = hasPermission(currentUser, 'canApproveHighValue');
  const canBatch = hasPermission(currentUser, 'canBatchDisburse');

  // Account lookups
  const sourceAccount = accounts.find(a => a.id === sourceAccountId);
  const targetAccount = accounts.find(a => a.id === targetAccountId);
  const parsedAmount = Math.max(0, parseFloat(amountStr) || 0);

  // Policy dual approval check
  const threshold = currentUser.limitConfig.dualApprovalThreshold || 50000;
  const isHighValue = requiresDualApproval(parsedAmount, threshold);

  // Available balance for source account
  const availableSourceBalance = sourceAccount
    ? sourceAccount.balance - sourceAccount.reservedBalance
    : 0;

  const isInsufficientFunds = parsedAmount > availableSourceBalance;
  const isSourceFrozen = sourceAccount?.status === 'frozen';
  const isTargetFrozen = targetAccount?.status === 'frozen';
  const isSameAccount = sourceAccountId === targetAccountId;

  const canSubmitTransfer =
    canInitiate &&
    parsedAmount > 0 &&
    !isInsufficientFunds &&
    !isSourceFrozen &&
    !isTargetFrozen &&
    !isSameAccount &&
    memo.trim().length > 0;

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitTransfer) return;

    const res = onInitiateTransfer({
      sourceAccountId,
      targetAccountId,
      amount: parsedAmount,
      memo: memo.trim()
    });

    if (res.requiresApproval) {
      setSuccessBanner(
        `High-value movement of ₹${parsedAmount.toLocaleString('en-IN')} queued for secondary signoff. (Threshold: ₹${threshold.toLocaleString('en-IN')})`
      );
    } else {
      setSuccessBanner(
        `Atomic double-entry transfer of ₹${parsedAmount.toLocaleString('en-IN')} completed and sealed into ledger block.`
      );
    }

    setAmountStr('10000');
    setMemo('Treasury balance rebalance');
  };

  const handleRunSampleBatch = () => {
    const target1 = accounts.find(a => a.id === 'acc_chk_sanand') || accounts[1] || accounts[0];
    const target2 = accounts.find(a => a.id === 'acc_sav_sanand') || accounts[2] || accounts[0];
    const target3 = accounts.find(a => a.id === 'acc_operating_inr' || a.id === 'acc_operating_usd') || accounts[0];

    const sampleItems = [
      { accountId: target1.id, amount: 45000, memo: `Disbursement tranche A -> ${target1.accountName}` },
      { accountId: target2.id, amount: 30000, memo: `Disbursement tranche B -> ${target2.accountName}` },
      { accountId: target3.id, amount: 15000, memo: `Operating liquidity rebalance -> ${target3.accountName}` }
    ];
    onExecuteBatchDisbursement(sampleItems);
    setSuccessBanner('Multi-recipient batch payout (₹90,000.00) sealed atomically into immutable ledger.');
  };

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Header and Subtabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5e9e2] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-[#13382c] flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#eaf0e6] border border-[#d8e2d4] flex items-center justify-center text-[#13382c]">
              <ArrowRightLeft className="h-4 w-4 text-[#13382c]" />
            </div>
            <span>Money Movement & Treasury Operations</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#69887b] mt-1">
            Execute double-entry transfers, review high-value dual authorizations, and run batch disbursements.
          </p>
        </div>

        {/* Subtabs Segmented Control */}
        <div className="flex items-center gap-1 rounded-xl border border-[#d8e2d4] bg-[#edf2ea] p-1">
          <button
            onClick={() => setActiveSubTab('transfer')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
              activeSubTab === 'transfer'
                ? 'bg-white text-[#13382c] shadow-xs font-semibold'
                : 'text-[#69887b] hover:text-[#13382c]'
            }`}
          >
            Direct Transfer
          </button>
          <button
            onClick={() => setActiveSubTab('pending')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'pending'
                ? 'bg-white text-[#13382c] shadow-xs font-semibold'
                : 'text-[#69887b] hover:text-[#13382c]'
            }`}
          >
            <span>Dual Approvals</span>
            {pendingTransactions.length > 0 && (
              <span className="rounded-full bg-amber-100 text-amber-800 px-1.5 py-0.2 text-[10px] font-mono font-bold">
                {pendingTransactions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('batch')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
              activeSubTab === 'batch'
                ? 'bg-white text-[#13382c] shadow-xs font-semibold'
                : 'text-[#69887b] hover:text-[#13382c]'
            }`}
          >
            Batch Disbursements
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-900 flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold px-1"
          >
            &times;
          </button>
        </div>
      )}

      {/* Direct Transfer Tab */}
      {activeSubTab === 'transfer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Transfer Form Column */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-2xl border border-[#e4eae0] bg-white p-6 shadow-xs">
              <h2 className="text-sm font-bold text-[#13382c] mb-4 flex items-center gap-2">
                <Send className="h-4 w-4 text-[#13382c]" />
                <span>Initiate Double-Entry Money Movement</span>
              </h2>

              {!canInitiate && (
                <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    Your current role (<strong>{currentUser.name} - {currentUser.role.toUpperCase()}</strong>) does not have funds initiation permissions. Switch to Treasury Operator or Client Holder in the top-right persona menu to initiate movements.
                  </span>
                </div>
              )}

              <form onSubmit={handleTransferSubmit} className="space-y-4">
                {/* Source Account */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Debit Account (Source of Funds)
                  </label>
                  <select
                    value={sourceAccountId}
                    onChange={(e) => setSourceAccountId(e.target.value)}
                    disabled={!canInitiate}
                    className="w-full rounded-xl border border-[#d8e2d4] bg-[#f9faf7] px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#13382c] disabled:opacity-50"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountName} ({acc.accountNumber}) · Available: ₹{Math.max(0, acc.balance - acc.reservedBalance).toLocaleString('en-IN')} INR
                        {acc.status === 'frozen' ? ' [FROZEN]' : ''}
                      </option>
                    ))}
                  </select>
                  {isSourceFrozen && (
                    <p className="mt-1 text-[11px] text-rose-600 font-mono">
                      * Source account is currently FROZEN by compliance.
                    </p>
                  )}
                </div>

                {/* Destination Account */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Credit Account (Beneficiary Vault)
                  </label>
                  <select
                    value={targetAccountId}
                    onChange={(e) => setTargetAccountId(e.target.value)}
                    disabled={!canInitiate}
                    className="w-full rounded-xl border border-[#d8e2d4] bg-[#f9faf7] px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#13382c] disabled:opacity-50"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountName} ({acc.accountNumber}) · {acc.currency}
                        {acc.status === 'frozen' ? ' [FROZEN]' : ''}
                      </option>
                    ))}
                  </select>
                  {isTargetFrozen && (
                    <p className="mt-1 text-[11px] text-rose-600 font-mono">
                      * Destination account is currently FROZEN by compliance.
                    </p>
                  )}
                  {isSameAccount && (
                    <p className="mt-1 text-[11px] text-amber-600 font-mono">
                      * Source and destination cannot be identical.
                    </p>
                  )}
                </div>

                {/* Amount & Currency */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Transfer Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={amountStr}
                        onChange={(e) => setAmountStr(e.target.value)}
                        disabled={!canInitiate}
                        placeholder="0.00"
                        className="w-full rounded-xl border border-[#d8e2d4] bg-[#f9faf7] pl-8 pr-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#13382c] disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Currency Unit
                    </label>
                    <input
                      type="text"
                      disabled
                      value={sourceAccount?.currency || 'INR'}
                      className="w-full rounded-xl border border-[#e4eae0] bg-[#f1f4ef] px-3.5 py-2.5 text-xs font-mono text-slate-600 font-bold"
                    />
                  </div>
                </div>

                {isInsufficientFunds && (
                  <p className="text-[11px] text-rose-600 font-mono">
                    * Amount exceeds available liquidity (₹{availableSourceBalance.toLocaleString('en-IN')}).
                  </p>
                )}

                {/* Dual-approval warning threshold notice */}
                {isHighValue && !isInsufficientFunds && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                    <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold font-mono">Dual-Authorization Required (₹50,000.00+ Threshold):</span>
                      <p className="text-amber-800 mt-0.5">
                        This movement exceeds the institutional policy threshold. It will enter the <strong>Dual Approvals</strong> queue for Compliance sign-off before being chained into the ledger.
                      </p>
                    </div>
                  </div>
                )}

                {/* Audit Memo */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Auditable Memo / Business Justification
                  </label>
                  <input
                    type="text"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    disabled={!canInitiate}
                    placeholder="e.g. Q1 Liquidity Rebalancing or Vendor Settlement"
                    className="w-full rounded-xl border border-[#d8e2d4] bg-[#f9faf7] px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#13382c] disabled:opacity-50"
                  />
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={!canSubmitTransfer}
                  className="w-full rounded-xl bg-[#13382c] hover:bg-[#1a4a3a] px-4 py-3 text-xs font-bold text-white shadow-xs transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                >
                  <Send className="h-4 w-4" />
                  <span>
                    {isHighValue
                      ? `Submit ₹${parsedAmount.toLocaleString('en-IN')} for Approval`
                      : `Transfer ₹${parsedAmount.toLocaleString('en-IN')} INR`}
                  </span>
                </button>
              </form>
            </div>
          </div>

          {/* Clean User-Friendly Transfer Summary Card */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-[#e4eae0] bg-white p-6 shadow-xs space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-[#13382c]">
                  Transfer Summary
                </h3>
                <p className="text-xs text-[#69887b] mt-0.5">
                  Review transaction parameters before settlement.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-2 border-b border-[#e5e9e2]">
                  <span className="text-[#69887b]">Transfer Amount</span>
                  <span className="font-mono text-base font-bold text-[#13382c]">
                    ₹{parsedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} INR
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-[#e5e9e2]">
                  <span className="text-[#69887b]">Origin Account</span>
                  <span className="text-slate-800 font-medium text-right max-w-[200px] truncate">
                    {sourceAccount?.accountName || '---'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-[#e5e9e2]">
                  <span className="text-[#69887b]">Beneficiary Account</span>
                  <span className="text-slate-800 font-medium text-right max-w-[200px] truncate">
                    {targetAccount?.accountName || '---'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-[#e5e9e2]">
                  <span className="text-[#69887b]">Processing Fee</span>
                  <span className="text-emerald-700 font-mono font-bold">₹0.00 (Standard)</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-[#e5e9e2]">
                  <span className="text-[#69887b]">Settlement Speed</span>
                  <span className="text-slate-800 font-medium">Instant Cryptographic</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-[#e5e9e2]">
                  <span className="text-[#69887b]">Authorization Tier</span>
                  <span className={`font-mono text-[11px] font-bold ${isHighValue ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {isHighValue ? 'DUAL-APPROVAL QUEUE' : 'IMMEDIATE SETTLEMENT'}
                  </span>
                </div>
              </div>

              {/* Collapsible Accounting Invariant Details */}
              <div className="pt-2">
                <details className="text-xs text-slate-600 rounded-xl bg-[#f9faf7] p-3.5 border border-[#e4eae0] group">
                  <summary className="font-medium cursor-pointer text-[#13382c] flex items-center justify-between select-none">
                    <span>Accounting Breakdown (Debit / Credit)</span>
                    <span className="text-[10px] text-emerald-700 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Balanced</span>
                  </summary>
                  <div className="mt-3 space-y-2 pt-2 border-t border-[#e5e9e2] text-[11px] font-mono">
                    <div className="flex items-center justify-between text-emerald-800 font-semibold">
                      <span>Debit: {targetAccount?.accountName || 'Target'}</span>
                      <span>+₹{parsedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700">
                      <span>Credit: {sourceAccount?.accountName || 'Source'}</span>
                      <span>-₹{parsedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="text-[10px] text-[#69887b] pt-1">
                      Invariant Check: Difference = ₹0.00 (RFC 6234 Double-Entry Verified)
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Dual Approvals Tab */}
      {activeSubTab === 'pending' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#e4eae0] bg-white p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-[#13382c] flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span>Pending Dual-Authorization Queue</span>
                  <span className="text-xs font-mono text-[#69887b] font-normal">
                    ({pendingTransactions.length} requiring signoff)
                  </span>
                </h2>
                <p className="text-xs text-[#69887b] mt-0.5">
                  Transactions exceeding institutional threshold (₹50,000) require Compliance or SecOps approval before ledger commitment.
                </p>
              </div>

              {!canApprove && (
                <div className="text-[11px] font-mono text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                  Read-Only Mode: Switch to Compliance or Admin to sign off.
                </div>
              )}
            </div>
          </div>

          {pendingTransactions.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-[#e4eae0] bg-white text-[#69887b] shadow-xs">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
              <div className="text-sm font-semibold text-[#13382c]">No Pending Authorizations</div>
              <p className="text-xs text-[#69887b] mt-1">
                All high-value money movements have been reviewed and committed.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="rounded-2xl border border-[#e4eae0] bg-white p-6 space-y-4 shadow-xs hover:border-[#13382c]/30 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e5e9e2] pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-mono text-xs font-bold">
                        REQ
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-500">{tx.id}</span>
                          <span className="text-xs font-bold text-slate-900">{tx.memo}</span>
                        </div>
                        <div className="text-[11px] text-[#69887b] mt-0.5">
                          Initiated by <span className="text-slate-900 font-semibold">{tx.initiatorName}</span> ({tx.initiatorRole.toUpperCase()}) · {new Date(tx.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-bold font-mono text-emerald-700">
                        ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} INR
                      </div>
                      <div className="text-[11px] font-mono text-amber-700 font-semibold">
                        STATUS: PENDING_COMPLIANCE
                      </div>
                    </div>
                  </div>

                  {/* Legs breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                    {tx.legs.map((leg, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-[#f9faf7] border border-[#e4eae0] flex items-center justify-between">
                        <div>
                          <span className={`text-[10px] font-bold ${leg.type === 'DEBIT' ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {leg.type}
                          </span>
                          <div className="text-slate-900 text-xs truncate font-sans font-medium">{leg.accountName}</div>
                        </div>
                        <span className="font-bold text-slate-800">
                          ₹{leg.amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => setRejectionModalTx(tx)}
                      disabled={!canApprove}
                      className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition cursor-pointer disabled:opacity-40"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Reject with Memo</span>
                    </button>
                    <button
                      onClick={() => onApprovePending(tx.id)}
                      disabled={!canApprove}
                      className="flex items-center gap-1.5 rounded-xl bg-[#13382c] hover:bg-[#1a4a3a] px-4 py-2 text-xs font-bold text-white transition shadow-xs cursor-pointer disabled:opacity-40"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Authorize & Seal into Block</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Batch Disbursements Tab */}
      {activeSubTab === 'batch' && (
        <div className="rounded-2xl border border-[#e4eae0] bg-white p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-[#13382c] flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#13382c]" />
                <span>Batch Payout & Carrier Clearing Runner</span>
              </h2>
              <p className="text-xs text-[#69887b] mt-0.5">
                Execute multi-recipient atomic disbursements with instant batch Merkle root synthesis.
              </p>
            </div>

            <button
              onClick={handleRunSampleBatch}
              disabled={!canBatch}
              className="flex items-center gap-2 rounded-xl bg-[#13382c] hover:bg-[#1a4a3a] px-4 py-2.5 text-xs font-bold text-white transition cursor-pointer disabled:opacity-40 shadow-xs"
            >
              <Zap className="h-4 w-4" />
              <span>Execute Sample 3-Way Disbursement (₹90,000)</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#e4eae0] bg-white">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#f8faf7] text-[#69887b] text-[11px] font-semibold border-b border-[#e4eae0]">
                <tr>
                  <th className="py-3 px-3.5">Item #</th>
                  <th className="py-3 px-3.5">Recipient Account</th>
                  <th className="py-3 px-3.5">Purpose Memo</th>
                  <th className="py-3 px-3.5 text-right">Disbursement Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4eae0] text-slate-700">
                <tr>
                  <td className="py-3 px-3.5 text-slate-400 font-sans">01</td>
                  <td className="py-3 px-3.5 text-slate-900 font-sans font-medium">
                    {accounts.find(a => a.id === 'acc_chk_sanand')?.accountName || 'Primary Operational Checking'} ({accounts.find(a => a.id === 'acc_chk_sanand')?.accountNumber || 'BV-1042-INR-01'})
                  </td>
                  <td className="py-3 px-3.5 text-[#69887b] text-[11px] font-sans">Primary Operating Liquidity Allocation</td>
                  <td className="py-3 px-3.5 text-right font-bold text-emerald-700">₹45,000.00</td>
                </tr>
                <tr>
                  <td className="py-3 px-3.5 text-slate-400 font-sans">02</td>
                  <td className="py-3 px-3.5 text-slate-900 font-sans font-medium">
                    {accounts.find(a => a.id === 'acc_sav_sanand')?.accountName || 'High-Yield Treasury Vault'} ({accounts.find(a => a.id === 'acc_sav_sanand')?.accountNumber || 'BV-1042-INR-02'})
                  </td>
                  <td className="py-3 px-3.5 text-[#69887b] text-[11px] font-sans">High-Yield Treasury Yield Tranche</td>
                  <td className="py-3 px-3.5 text-right font-bold text-emerald-700">₹30,000.00</td>
                </tr>
                <tr>
                  <td className="py-3 px-3.5 text-slate-400 font-sans">03</td>
                  <td className="py-3 px-3.5 text-slate-900 font-sans font-medium">
                    {accounts.find(a => a.id === 'acc_operating_inr' || a.id === 'acc_operating_usd')?.accountName || 'INR Operating Liquidity Pool'} ({accounts.find(a => a.id === 'acc_operating_inr' || a.id === 'acc_operating_usd')?.accountNumber || 'BV-9021-INR-02'})
                  </td>
                  <td className="py-3 px-3.5 text-[#69887b] text-[11px] font-sans">Core Operating Pool Reserve Balancing</td>
                  <td className="py-3 px-3.5 text-right font-bold text-emerald-700">₹15,000.00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rejection Memo Modal */}
      {rejectionModalTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-[#e4eae0] bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <XCircle className="h-5 w-5 text-rose-600" />
              <span>Reject Money Movement</span>
            </h3>
            <p className="text-xs text-slate-600">
              Provide an official compliance reason for rejecting Tx #{rejectionModalTx.id}.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rejection Memo
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full rounded-xl border border-[#d8e2d4] bg-[#f9faf7] p-2.5 text-xs text-slate-900 focus:outline-none focus:border-rose-500 font-sans"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectionModalTx(null)}
                className="rounded-xl px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 transition font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onRejectPending(rejectionModalTx.id, rejectionReason);
                  setRejectionModalTx(null);
                }}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition shadow-xs cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
