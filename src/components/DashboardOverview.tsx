/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Wallet,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  RefreshCw,
  Plus,
  Send,
  Lock,
  Layers,
  FileCheck2,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import type { Account, LedgerTransaction, UserProfile, VerificationResult } from '../types';

interface DashboardOverviewProps {
  currentUser: UserProfile;
  accounts: Account[];
  transactions: LedgerTransaction[];
  verificationResult: VerificationResult;
  onOpenTransfer: () => void;
  onOpenCreateAccount: () => void;
  onRunAudit: () => void;
  isVerifying: boolean;
  onInspectTx: (tx: LedgerTransaction) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  currentUser,
  accounts,
  transactions,
  verificationResult,
  onOpenTransfer,
  onOpenCreateAccount,
  onRunAudit,
  isVerifying,
  onInspectTx,
}) => {
  const totalInr = accounts
    .filter((a) => a.id !== 'acc_cold_reserve')
    .reduce((sum, a) => sum + Math.max(0, a.balance), 0);

  const activeAccountsCount = accounts.filter(
    (a) => a.status === 'active' || a.status === 'ACTIVE'
  ).length;

  const settledTxCount = transactions.filter((t) => t.status === 'SETTLED').length;
  const recentTransactions = transactions.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Financial Ledger Overview</span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Live ACID System
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-account balance aggregator with SHA-256 cryptographic settlement guarantees
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onRunAudit}
            disabled={isVerifying}
            className="p-2 rounded-xl border border-slate-700/80 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer disabled:opacity-50"
            title="Re-verify Ledger Proofs"
          >
            <RefreshCw className={`w-4 h-4 ${isVerifying ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          <button
            onClick={onOpenCreateAccount}
            className="px-3.5 py-2 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-800/80 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Open Account</span>
          </button>

          <button
            onClick={onOpenTransfer}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition shadow-sm shadow-cyan-500/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Transfer Funds</span>
          </button>
        </div>
      </div>

      {/* Metric StatCards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Consolidated Net Worth */}
        <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/70 p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Consolidated Net Worth</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white tracking-tight">
            ₹{totalInr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
            <TrendingUp className="w-3 h-3" />
            <span>Strict zero-drift double-entry balance</span>
          </div>
        </div>

        {/* Active Accounts */}
        <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/70 p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Active Vault Accounts</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white tracking-tight">
            {activeAccountsCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Segregated multi-currency balance vaults
          </div>
        </div>

        {/* Total Ledger Transactions */}
        <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/70 p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Settled Ledger Blocks</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white tracking-tight">
            {settledTxCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Irrevocably chained with SHA-256
          </div>
        </div>

        {/* Compliance Status */}
        <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/70 p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Ledger Integrity Status</span>
            <div className={`p-1.5 rounded-lg border ${
              verificationResult.isValid
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}>
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className={`mt-2 text-2xl font-bold tracking-tight ${
            verificationResult.isValid ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {verificationResult.isValid ? '100% OK' : 'VIOLATION'}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {verificationResult.isValid ? 'Cryptographically Verified' : 'Integrity Breach Detected'}
          </div>
        </div>
      </div>

      {/* Vault Accounts Summary List */}
      <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/70 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Segregated Vault Containers</h2>
            <p className="text-xs text-slate-400">Direct balances across operating, treasury, and escrow accounts</p>
          </div>
          <button
            onClick={onOpenCreateAccount}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 transition"
          >
            <span>+ New Account</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {accounts.slice(0, 6).map((acc) => {
            const isFrozen = acc.status === 'frozen' || acc.status === 'FROZEN';
            const sym = '₹';
            return (
              <div
                key={acc.id}
                className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200 truncate">{acc.accountName}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md uppercase font-semibold ${
                    isFrozen
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {isFrozen ? 'FROZEN' : 'ACTIVE'}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-lg font-bold font-mono text-white">
                    {sym}{acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{acc.accountNumber}</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate flex items-center justify-between">
                  <span>{acc.entityName}</span>
                  <span className="text-[10px] text-cyan-400 uppercase font-mono">{acc.type}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Ledger Transactions Feed */}
      <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/70 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Recent Immutable Transactions</h2>
            <p className="text-xs text-slate-400">Sub-millisecond settlement records with SHA-256 hash chains</p>
          </div>
          <button
            onClick={onOpenTransfer}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 transition"
          >
            <span>View All Transfers</span>
            <ArrowRightLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Tx Index / ID</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Accounts Involved</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Hash Digest</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {recentTransactions.map((tx) => {
                const sym = '₹';
                const isSettled = tx.status === 'SETTLED';
                const isPending = tx.status === 'PENDING_APPROVAL';

                return (
                  <tr key={tx.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 text-slate-300">
                      <div className="font-bold text-white">#{tx.txIndex}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{tx.id}</div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                        {tx.type}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-100">
                      {sym}{tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3 px-4 font-sans text-slate-300 max-w-xs truncate">
                      {tx.legs.length >= 2 ? (
                        <span>
                          {tx.legs[0]?.accountName} &rarr; {tx.legs[1]?.accountName}
                        </span>
                      ) : (
                        <span>{tx.memo || 'Direct settlement'}</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        isSettled
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : isPending
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}>
                        {tx.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-[10px] text-slate-400">
                      {tx.entryHash.slice(0, 10)}...{tx.entryHash.slice(-6)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onInspectTx(tx)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-[11px] font-sans font-medium transition cursor-pointer"
                      >
                        Receipt
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
