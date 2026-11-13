/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Binary,
  Layers,
  ArrowRight,
  RotateCcw,
  Bug,
  Search,
  Filter,
  Eye,
  FileCheck2,
  Copy,
  Check,
  Zap,
  Lock
} from 'lucide-react';
import type {
  LedgerTransaction,
  Account,
  MerkleEpoch,
  VerificationResult,
  UserProfile
} from '../types';
import { hasPermission } from '../utils/rbac';

interface LedgerAuditViewProps {
  currentUser: UserProfile;
  transactions: LedgerTransaction[];
  accounts: Account[];
  epochs: MerkleEpoch[];
  verificationResult: VerificationResult;
  isVerifying: boolean;
  onRunAudit: () => void;
  onSimulateTamper: (type: 'amount' | 'memo' | 'chain', txIndex: number) => void;
  onRestoreLedger: () => void;
  isTampered: boolean;
  onInspectTransaction: (tx: LedgerTransaction) => void;
}

export const LedgerAuditView: React.FC<LedgerAuditViewProps> = ({
  currentUser,
  transactions,
  accounts,
  epochs,
  verificationResult,
  isVerifying,
  onRunAudit,
  onSimulateTamper,
  onRestoreLedger,
  isTampered,
  onInspectTransaction
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTamperLab, setShowTamperLab] = useState(false);
  const [selectedTamperIndex, setSelectedTamperIndex] = useState(2);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const canSimulate = hasPermission(currentUser, 'canSimulateTamper');

  const filteredTxs = transactions.filter(tx => {
    if (filterType !== 'ALL' && tx.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = tx.id.toLowerCase().includes(q);
      const matchMemo = tx.memo.toLowerCase().includes(q);
      const matchHash = tx.entryHash.toLowerCase().includes(q);
      const matchLegs = tx.legs.some(l => l.accountName.toLowerCase().includes(q));
      if (!matchId && !matchMemo && !matchHash && !matchLegs) return false;
    }
    return true;
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 1800);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Proof Verification Dashboard */}
      <div className="rounded-2xl border border-[#e4eae0] bg-white p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-[#e4eae0] pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[#13382c] font-semibold">
                Ledger Verification Engine
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500 font-mono">SHA-256 Chained Integrity · Merkle Tree Proofs</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-normal tracking-tight text-[#13382c]">
              Institutional Ledger Audit & Transaction Continuity
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
              Every money movement is sealed in a tamper-evident cryptographic hash chain with balanced double-entry accounting.
              Any record manipulation immediately breaks downstream block signatures and Merkle root proofs.
            </p>
          </div>

          {/* Verification CTA & Status */}
          <div className="flex flex-wrap items-center gap-3">
            {isTampered && (
              <button
                onClick={onRestoreLedger}
                className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs font-medium text-amber-800 hover:bg-amber-100 transition cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Restore Clean Ledger</span>
              </button>
            )}

            <button
              onClick={onRunAudit}
              disabled={isVerifying}
              className={`flex items-center gap-2.5 rounded-xl px-5 py-2.5 text-xs font-semibold shadow-xs transition cursor-pointer ${
                verificationResult.isValid
                  ? 'bg-[#13382c] text-white hover:bg-[#1a4a3a]'
                  : 'bg-rose-600 text-white hover:bg-rose-500'
              } disabled:opacity-50`}
            >
              <ShieldCheck className={`h-4 w-4 ${isVerifying ? 'animate-spin' : ''}`} />
              <span>{isVerifying ? 'Auditing Hash Chain...' : 'Run Full Mathematical Audit'}</span>
            </button>
          </div>
        </div>

        {/* Verification Status Cards */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Hash Chain Continuity */}
          <div className="rounded-xl border border-[#e4eae0] bg-[#f9faf8] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-500">HASH CHAIN CONTINUITY</span>
              {verificationResult.tamperedIndex === null ? (
                <span className="text-[11px] font-mono text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> INTACT
                </span>
              ) : (
                <span className="text-[11px] font-mono text-rose-600 font-bold flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> BROKEN
                </span>
              )}
            </div>
            <div className="mt-2 text-lg font-bold font-mono text-[#13382c]">
              {transactions.length} / {transactions.length} Blocks
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              SHA-256 prevHash pointers validated
            </p>
          </div>

          {/* Card 2: Double-Entry Invariant */}
          <div className="rounded-xl border border-[#e4eae0] bg-[#f9faf8] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-500">DOUBLE-ENTRY INVARIANT</span>
              {verificationResult.doubleEntryBalanced ? (
                <span className="text-[11px] font-mono text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> BALANCED
                </span>
              ) : (
                <span className="text-[11px] font-mono text-rose-600 font-bold flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> VIOLATED
                </span>
              )}
            </div>
            <div className="mt-2 text-lg font-bold font-mono text-[#13382c]">
              Debits == Credits
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Zero balance drift across all legs
            </p>
          </div>

          {/* Card 3: Merkle Epoch Finality */}
          <div className="rounded-xl border border-[#e4eae0] bg-[#f9faf8] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-500">MERKLE ROOTS</span>
              {verificationResult.merkleRootsValid ? (
                <span className="text-[11px] font-mono text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> PROVEN
                </span>
              ) : (
                <span className="text-[11px] font-mono text-rose-600 font-bold flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> MISMATCH
                </span>
              )}
            </div>
            <div className="mt-2 text-lg font-bold font-mono text-[#13382c]">
              {epochs.length} Epochs Sealed
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Binary Merkle tree inclusion proofs
            </p>
          </div>

          {/* Card 4: Audit Execution Speed */}
          <div className="rounded-xl border border-[#e4eae0] bg-[#f9faf8] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-500">AUDIT LATENCY</span>
              <span className="text-[11px] font-mono text-slate-500">ZERO-TRUST</span>
            </div>
            <div className="mt-2 text-lg font-bold font-mono text-emerald-700">
              {verificationResult.executionTimeMs} ms
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Deterministic verification time
            </p>
          </div>
        </div>

        {/* Tamper Warning Banner if compromised */}
        {!verificationResult.isValid && (
          <div className="mt-5 rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs font-mono text-rose-800 animate-in fade-in">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-rose-900">
                  CRYPTOGRAPHIC ANOMALY IDENTIFIED AT BLOCK #{verificationResult.tamperedIndex}
                </div>
                <div className="text-rose-800">
                  {verificationResult.tamperedReason}
                </div>
                <p className="text-[11px] text-rose-600 pt-1">
                  Downstream blocks and Merkle roots cannot be verified because the tamper broke cryptographic continuity.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Security & Integrity Fault Diagnostics (Tamper Lab) */}
      <div className="rounded-xl border border-[#e4eae0] bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#13382c]/10 text-[#13382c]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[#13382c]">
                Zero-Trust Fault Injection & Tamper Lab
              </div>
              <p className="text-xs text-slate-500">
                Simulate adversarial state modifications to evaluate zero-trust mathematical detection accuracy.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowTamperLab(!showTamperLab)}
            className="flex items-center gap-1.5 rounded-xl border border-[#e4eae0] bg-[#f9faf8] px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition cursor-pointer self-start sm:self-auto"
          >
            <span>{showTamperLab ? 'Close Diagnostics' : 'Open Diagnostics'}</span>
          </button>
        </div>

        {showTamperLab && (
          <div className="mt-4 pt-4 border-t border-[#e4eae0] space-y-4 animate-in fade-in">
            {!canSimulate ? (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  Simulation mode is restricted. Switch to <strong>Admin</strong> in the top-right persona selector to inject simulated anomalies.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-[#f9faf8] border border-[#e4eae0] space-y-2">
                  <div className="text-xs font-semibold text-slate-800">Target Block</div>
                  <select
                    value={selectedTamperIndex}
                    onChange={(e) => setSelectedTamperIndex(Number(e.target.value))}
                    className="w-full rounded-xl bg-white border border-[#e4eae0] px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#13382c] font-mono shadow-xs"
                  >
                    {transactions.map((t) => (
                      <option key={t.id} value={t.txIndex}>
                        Tx #{t.txIndex} - {t.type} (₹{t.amount.toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Select a transaction in the immutable chain to alter.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#f9faf8] border border-[#e4eae0] space-y-2">
                  <div className="text-xs font-semibold text-slate-800">Tamper Attack Vectors</div>
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => onSimulateTamper('amount', selectedTamperIndex)}
                      className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-100 text-left font-mono transition cursor-pointer"
                    >
                      Vector A: Alter Transaction Amount (+ ₹10,000)
                    </button>
                    <button
                      onClick={() => onSimulateTamper('memo', selectedTamperIndex)}
                      className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-100 text-left font-mono transition cursor-pointer"
                    >
                      Vector B: Alter Audit Memo Text
                    </button>
                    <button
                      onClick={() => onSimulateTamper('chain', selectedTamperIndex)}
                      className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-100 text-left font-mono transition cursor-pointer"
                    >
                      Vector C: Mutate PrevHash Chain Pointer
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#f9faf8] border border-[#e4eae0] flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Audit Response</div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      After injecting a tamper vector, click &quot;Run Full Mathematical Audit&quot; above to see how SHA-256 cascading cryptographic checks immediately expose the alteration.
                    </p>
                  </div>
                  <button
                    onClick={onRestoreLedger}
                    className="mt-3 w-full rounded-xl bg-[#13382c] hover:bg-[#1a4a3a] py-2 text-xs font-medium text-white transition cursor-pointer shadow-xs"
                  >
                    Reset to Clean State
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transactions Explorer Header & Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-serif text-[#13382c] flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#13382c]" />
              <span>Immutable Ledger Blocks</span>
              <span className="text-xs font-mono text-slate-400 font-normal">
                ({filteredTxs.length} entries)
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Each block cryptographically locks previous block state with canonical SHA-256 hashing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search Tx, hash, memo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-xl border border-[#e4eae0] bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#13382c] w-48 sm:w-56 shadow-xs"
              />
            </div>

            {/* Segmented Filter Control */}
            <div className="flex items-center gap-1 rounded-xl border border-[#e4eae0] bg-[#f9faf8] p-1">
              {['ALL', 'TRANSFER', 'DEPOSIT', 'DISBURSEMENT', 'RESERVE_HOLD', 'FEE'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition cursor-pointer ${
                    filterType === type
                      ? 'bg-white text-[#13382c] shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {type === 'ALL' ? 'All' : type.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto rounded-2xl border border-[#e4eae0] bg-white shadow-xs">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-[#e4eae0] bg-[#f9faf8] text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Block #</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Description & Accounts</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Chained Entry Hash</th>
                <th className="py-3 px-4 text-center">Audit Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4eae0] text-slate-700">
              {filteredTxs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                    No transactions match your search filter.
                  </td>
                </tr>
              ) : (
                filteredTxs.map((tx) => {
                  const isCompromised = verificationResult.tamperedIndex === tx.txIndex;
                  return (
                    <tr
                      key={tx.id}
                      className={`transition ${
                        isCompromised
                          ? 'bg-rose-50 border-l-4 border-l-rose-500'
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      {/* Block Index */}
                      <td className="py-3 px-4 font-bold text-[#13382c]">
                        <div className="flex items-center gap-1.5">
                          <span>#{tx.txIndex.toString().padStart(4, '0')}</span>
                          <span className="text-[10px] text-slate-400">E{tx.epochId}</span>
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                        {new Date(tx.timestamp).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>

                      {/* Type */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`text-[11px] font-semibold ${
                          tx.type === 'TRANSFER' ? 'text-blue-700' :
                          tx.type === 'DEPOSIT' ? 'text-emerald-700' :
                          tx.type === 'DISBURSEMENT' ? 'text-amber-700' :
                          tx.type === 'RESERVE_HOLD' ? 'text-purple-700' :
                          'text-slate-600'
                        }`}>
                          {tx.type}
                        </span>
                      </td>

                      {/* Description & Accounts */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-sans text-xs text-slate-900 font-medium truncate">
                          {tx.memo}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500 truncate">
                          {tx.legs.map(l => `${l.type === 'DEBIT' ? 'Dr' : 'Cr'}: ${l.accountName}`).join(' · ')}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-slate-900">
                        ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        <span className="text-[10px] font-normal text-slate-400 ml-1">
                          INR
                        </span>
                      </td>

                      {/* Entry Hash */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-600 text-[11px]">
                            {tx.entryHash.slice(0, 10)}...{tx.entryHash.slice(-6)}
                          </span>
                          <button
                            onClick={() => handleCopy(tx.entryHash)}
                            className="text-slate-400 hover:text-[#13382c] transition cursor-pointer p-0.5"
                            title="Copy full SHA-256 hash"
                          >
                            {copiedHash === tx.entryHash ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Audit Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => onInspectTransaction(tx)}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-[11px] text-slate-800 transition cursor-pointer font-medium"
                        >
                          <Eye className="h-3 w-3 text-[#13382c]" />
                          <span>Inspect Proof</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Epochs Summary Panel */}
      <div className="rounded-2xl border border-[#e4eae0] bg-white p-5 space-y-4 shadow-xs">
        <div>
          <h3 className="text-sm font-serif text-[#13382c] flex items-center gap-2">
            <Binary className="h-4 w-4 text-[#13382c]" />
            <span>Finalized Merkle Epoch Roots</span>
          </h3>
          <p className="text-xs text-slate-500">
            Batches of transactions are mathematically anchored into cryptographic Merkle trees for instant third-party verification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {epochs.map((ep) => (
            <div key={ep.epochId} className="rounded-xl border border-[#e4eae0] bg-[#f9faf8] p-4 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">EPOCH #{ep.epochId}</span>
                <span className="text-[11px] text-emerald-700 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="h-3 w-3" /> FINALIZED ({ep.txCount} BLOCKS)
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                Sealed: {new Date(ep.timestamp).toUTCString()}
              </div>
              <div className="pt-1">
                <span className="text-[10px] text-slate-400 uppercase">Epoch Merkle Root:</span>
                <div className="mt-0.5 p-2 rounded-lg bg-white text-[11px] text-[#13382c] break-all border border-[#e4eae0]">
                  {ep.merkleRoot}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
