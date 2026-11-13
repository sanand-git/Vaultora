/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CreditCard,
  ShieldCheck,
  Plus,
  ArrowRight,
  TrendingUp,
  Wallet,
  Sparkles,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  X,
  AlertCircle
} from 'lucide-react';
import type { Account, LedgerTransaction, UserProfile, VerificationResult } from '../types';

interface OverviewPageProps {
  currentUser: UserProfile;
  accounts: Account[];
  transactions: LedgerTransaction[];
  verificationResult: VerificationResult;
  onNavigateToAccounts: () => void;
  onNavigateToTransfers: (mode?: 'transfer' | 'deposit' | 'withdraw') => void;
  onOpenCreateAccount: () => void;
  onQuickDeposit?: (accountId: string, amount: number, memo: string) => void;
  onQuickWithdraw?: (accountId: string, amount: number, memo: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  currentUser,
  accounts,
  transactions,
  verificationResult,
  onNavigateToAccounts,
  onNavigateToTransfers,
  onOpenCreateAccount,
  onQuickDeposit,
  onQuickWithdraw,
}) => {
  // If user has specific allowedAccountIds, filter to those, or if holder with allowed accounts
  const userAccounts =
    currentUser.allowedAccountIds && currentUser.allowedAccountIds.includes('*')
      ? accounts
      : accounts.filter(
          (a) =>
            currentUser.allowedAccountIds?.includes(a.id) ||
            a.entityName.toLowerCase().includes(currentUser.name.toLowerCase())
        );

  const totalAccountsFormatted =
    userAccounts.length < 10 ? `0${userAccounts.length}` : `${userAccounts.length}`;

  const firstName = currentUser.name.split(' ')[0] || 'User';

  const totalBalance = userAccounts.reduce((sum, a) => sum + Math.max(0, a.balance), 0);

  // Quick Action Modal State
  const [modalType, setModalType] = useState<'deposit' | 'withdraw' | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState(userAccounts[0]?.id || accounts[0]?.id || '');
  const [actionAmount, setActionAmount] = useState('5000');
  const [actionMemo, setActionMemo] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const handleActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    const amt = parseFloat(actionAmount);
    if (isNaN(amt) || amt <= 0) {
      setActionError('Please enter a valid positive amount.');
      return;
    }

    const targetAcc = accounts.find(a => a.id === selectedAccountId);
    if (!targetAcc) {
      setActionError('Please select a valid account.');
      return;
    }

    if (modalType === 'withdraw' && targetAcc.balance < amt) {
      setActionError(`Insufficient funds. Available: ₹${targetAcc.balance.toLocaleString('en-IN')}`);
      return;
    }

    if (modalType === 'deposit' && onQuickDeposit) {
      onQuickDeposit(selectedAccountId, amt, actionMemo || `Direct deposit to ${targetAcc.accountName}`);
      setActionSuccess(`Successfully deposited ₹${amt.toLocaleString('en-IN')} into ${targetAcc.accountName}!`);
    } else if (modalType === 'withdraw' && onQuickWithdraw) {
      onQuickWithdraw(selectedAccountId, amt, actionMemo || `Direct withdrawal from ${targetAcc.accountName}`);
      setActionSuccess(`Successfully withdrew ₹${amt.toLocaleString('en-IN')} from ${targetAcc.accountName}!`);
    }

    setTimeout(() => {
      setModalType(null);
      setActionSuccess(null);
      setActionMemo('');
    }, 1200);
  };

  return (
    <div className="space-y-3.5 font-sans">
      {/* ========================================================= */}
      {/* 1. TOP FINANCIAL OVERVIEW BANNER                          */}
      {/* ========================================================= */}
      <div className="rounded-2xl bg-[#bfccba] border border-[#aebda9] p-4 sm:p-5 lg:p-6 relative overflow-hidden shadow-xs">
        {/* Astronomical Multi-Ring Orbital Radar on Right */}
        <div className="absolute right-6 sm:right-12 top-1/2 -translate-y-1/2 pointer-events-none hidden md:block">
          <svg className="w-56 h-56 select-none" viewBox="0 0 220 220" fill="none">
            {/* Orbit Ring 4 (Outermost solid r=94) */}
            <circle cx="110" cy="110" r="94" stroke="#9daea0" strokeWidth="0.8" />
            {/* Satellite dot at top right (~70 deg) */}
            <circle cx="142" cy="22" r="2.8" fill="#2d3b2c" />
            {/* Satellite dot at bottom left (~245 deg) */}
            <circle cx="70" cy="195" r="2.8" fill="#2d3b2c" />

            {/* Orbit Ring 3 (Dotted orbit r=76) */}
            <circle cx="110" cy="110" r="76" stroke="#94a697" strokeWidth="0.9" strokeDasharray="2 3" />
            {/* Satellite dot at top right (~35 deg) */}
            <circle cx="172" cy="66" r="2.8" fill="#2d3b2c" />
            {/* Satellite dot at bottom left (~220 deg) */}
            <circle cx="52" cy="159" r="2.8" fill="#2d3b2c" />

            {/* Orbit Ring 2 (Solid orbit r=58) */}
            <circle cx="110" cy="110" r="58" stroke="#90a293" strokeWidth="0.8" />
            {/* Satellite dot at right (~345 deg) */}
            <circle cx="166" cy="125" r="2.5" fill="#2d3b2c" />

            {/* Orbit Ring 1 (Inner solid orbit r=42) */}
            <circle cx="110" cy="110" r="42" stroke="#899c8c" strokeWidth="0.8" />

            {/* Center circular disk with brand emblem (preserving user logo) */}
            <circle cx="110" cy="110" r="26" fill="#a5b3a2" stroke="#96a593" strokeWidth="1" />
            <image href="/logo-icon.png" x="93" y="93" width="34" height="34" />
          </svg>
        </div>

        {/* Banner Content */}
        <div className="relative z-10 max-w-xl space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-mono tracking-widest text-[#334232] uppercase font-semibold">
            <span>✦</span>
            <span>YOUR FINANCIAL OVERVIEW</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif text-[#18202d] tracking-tight leading-tight">
            Good to see you, <em className="italic font-normal">{firstName}</em>
          </h1>

          <p className="text-xs sm:text-sm text-[#374536] font-medium pt-0.5">
            Everything in its place. Here&apos;s your account overview.
          </p>

          <div className="flex items-center gap-4 text-xs text-[#374536] pt-1.5">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#243523]" />
              <span className="text-[#243523] font-medium">{currentUser.title || 'Account holder'}</span>
            </div>
            <span className="text-[#687a67]">&bull;</span>
            <span className="text-[#374536]">Private workspace</span>
          </div>
        </div>

        {/* Small Bottom Right Indicator */}
        <div className="absolute bottom-4 right-8 text-[11px] font-mono text-[#4c5b4b] hidden sm:block">
          01 / 02
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. YOUR SPACE & ACCOUNT OVERVIEW CARDS                     */}
      {/* ========================================================= */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono tracking-widest text-[#718096] uppercase font-semibold">
              YOUR SPACE
            </div>
            <h2 className="text-lg sm:text-xl font-serif font-bold text-[#18202d]">
              Account overview
            </h2>
          </div>

          <button
            onClick={onNavigateToAccounts}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#18202d] hover:underline cursor-pointer"
          >
            <span>All accounts</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Two Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Card 1: Total accounts */}
          <div className="rounded-2xl border border-[#e2e8e0] bg-white p-4 sm:p-5 shadow-xs relative flex items-center justify-between min-h-[110px]">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#f0f4ee] flex items-center justify-center text-[#18202d]">
                  <CreditCard className="w-3 h-3 text-[#18202d]" />
                </div>
                <span className="text-xs text-[#718096] font-medium">Total accounts</span>
              </div>

              <div>
                <div className="text-3xl sm:text-4xl font-serif font-bold text-[#18202d] tracking-tight">
                  {totalAccountsFormatted}
                </div>
                <div className="text-[11px] text-[#718096] mt-0.5 font-mono">
                  {userAccounts.length === 0
                    ? 'Accounts connected'
                    : `₹${totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Total Portfolio Value`}
                </div>
              </div>
            </div>

            {/* Donut Progress Ring Graphic Watermark */}
            <svg className="w-14 h-14 pointer-events-none select-none shrink-0" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="22" stroke="#edf1ec" strokeWidth="7" />
              <circle
                cx="32"
                cy="32"
                r="22"
                stroke="#c9d6c5"
                strokeWidth="7"
                strokeDasharray="105 138"
                strokeLinecap="round"
                transform="rotate(-90 32 32)"
              />
            </svg>
          </div>

          {/* Card 2: Account status */}
          <div className="rounded-2xl border border-[#e2e8e0] bg-white p-4 sm:p-5 shadow-xs relative flex flex-col justify-between min-h-[110px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#f0f4ee] flex items-center justify-center text-[#18202d]">
                  <ShieldCheck className="w-3 h-3 text-[#18202d]" />
                </div>
                <span className="text-xs text-[#718096] font-medium">Account status</span>
              </div>
            </div>

            <div>
              <div className="text-lg sm:text-xl font-serif font-bold text-[#18202d]">
                {userAccounts.length === 0 ? 'No accounts' : 'Operational & Active'}
              </div>
              <div className="text-[11px] text-[#718096] mt-0.5">
                {userAccounts.length} active account{userAccounts.length === 1 ? '' : 's'} &bull; Zero-drift integrity
              </div>
            </div>

            {/* Bottom charcoal accent bar matching reference */}
            <div className="w-14 h-1 bg-[#18202d] rounded-full mt-2" />
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. YOUR ACCOUNTS (LEFT) & QUICK ACTIONS (RIGHT)            */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* Left Column: Connected - Your accounts */}
        <div className="lg:col-span-7 space-y-1.5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono tracking-widest text-[#69887b] uppercase font-semibold">
                CONNECTED
              </div>
              <h2 className="text-lg sm:text-xl font-serif font-semibold text-[#13382c]">
                Your accounts
              </h2>
            </div>

            <button
              onClick={onNavigateToAccounts}
              className="w-7 h-7 rounded-full border border-[#e4eae0] bg-white hover:bg-[#f5f7f4] flex items-center justify-center text-[#13382c] transition cursor-pointer"
            >
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Accounts Card List */}
          <div className="rounded-2xl border border-[#e4eae0] bg-white p-3.5 shadow-xs min-h-[110px] flex flex-col justify-center">
            {userAccounts.length === 0 ? (
              <div className="text-center py-4 space-y-2">
                <div className="w-8 h-8 rounded-full bg-[#f0f4ee] text-[#13382c] flex items-center justify-center mx-auto">
                  <CreditCard className="w-4 h-4 text-[#13382c]" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-[#13382c]">No accounts yet</div>
                  <p className="text-[11px] text-[#69887b] max-w-sm mx-auto">
                    Customer accounts are opened after an administrator reviews your request.
                  </p>
                </div>
                <button
                  onClick={onOpenCreateAccount}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#13382c] hover:bg-[#1a4a3a] px-3 py-1.5 rounded-xl transition cursor-pointer shadow-xs mt-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Request an account</span>
                </button>
              </div>
            ) : (
              <div className="w-full space-y-2">
                {userAccounts.map((acc) => {
                  const sym = '₹';
                  return (
                    <div
                      key={acc.id}
                      className="p-3 rounded-xl border border-[#e4eae0] bg-[#f9faf7] hover:border-[#13382c]/30 flex items-center justify-between text-left transition"
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-[#13382c]">{acc.accountName}</div>
                        <div className="text-[10px] font-mono text-[#69887b]">{acc.accountNumber} &bull; {acc.type}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs sm:text-sm font-bold font-mono text-[#13382c]">
                          {sym}{acc.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[9px] text-emerald-700 font-semibold uppercase font-mono">
                          {acc.status}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: On your terms - Quick actions */}
        <div className="lg:col-span-5 space-y-1.5">
          <div className="text-[10px] font-mono tracking-widest text-[#69887b] uppercase font-semibold">
            ON YOUR TERMS
          </div>

          <h2 className="text-lg sm:text-xl font-serif font-semibold text-[#13382c]">
            Quick actions
          </h2>

          <div className="grid grid-cols-3 gap-2">
            {/* Deposit Card */}
            <button
              onClick={() => {
                if (userAccounts.length === 0) {
                  onOpenCreateAccount();
                } else {
                  setModalType('deposit');
                  setSelectedAccountId(userAccounts[0]?.id || '');
                }
              }}
              className="bg-[#eaf0e6] border border-[#d8e2d4] rounded-2xl p-2.5 text-left hover:shadow-xs transition cursor-pointer flex flex-col justify-between min-h-[105px] group"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-7 h-7 rounded-xl bg-white border border-[#d8e2d4] flex items-center justify-center text-[#13382c] group-hover:scale-105 transition-transform">
                  <Plus className="w-3.5 h-3.5 text-[#13382c]" />
                </div>
                <span className="text-[9px] font-mono uppercase tracking-wider text-[#69887b]">
                  OPEN
                </span>
              </div>

              <div className="mt-2">
                <div className="text-xs font-semibold text-[#13382c]">Deposit</div>
                <div className="text-[10px] text-[#69887b] mt-0.5">Add funds</div>
              </div>
            </button>

            {/* Withdraw Card */}
            <button
              onClick={() => {
                if (userAccounts.length === 0) {
                  onOpenCreateAccount();
                } else {
                  setModalType('withdraw');
                  setSelectedAccountId(userAccounts[0]?.id || '');
                }
              }}
              className="bg-[#faede1] border border-[#edd7c4] rounded-2xl p-2.5 text-left hover:shadow-xs transition cursor-pointer flex flex-col justify-between min-h-[105px] group"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-7 h-7 rounded-xl bg-white border border-[#edd7c4] flex items-center justify-center text-[#8c5932] group-hover:scale-105 transition-transform">
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#8c5932]" />
                </div>
                <span className="text-[9px] font-mono uppercase tracking-wider text-[#a07452]">
                  OPEN
                </span>
              </div>

              <div className="mt-2">
                <div className="text-xs font-semibold text-[#13382c]">Withdraw</div>
                <div className="text-[10px] text-[#8c5932] mt-0.5">Move funds out</div>
              </div>
            </button>

            {/* Transfer Card */}
            <button
              onClick={() => onNavigateToTransfers('transfer')}
              className="bg-[#eff0ed] border border-[#dcded9] rounded-2xl p-2.5 text-left hover:shadow-xs transition cursor-pointer flex flex-col justify-between min-h-[105px] group"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-7 h-7 rounded-xl bg-white border border-[#dcded9] flex items-center justify-center text-[#13382c] group-hover:scale-105 transition-transform">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-[#13382c]" />
                </div>
                <span className="text-[9px] font-mono uppercase tracking-wider text-[#69887b]">
                  OPEN
                </span>
              </div>

              <div className="mt-2">
                <div className="text-xs font-semibold text-[#13382c]">Transfer</div>
                <div className="text-[10px] text-[#69887b] mt-0.5">Between accounts</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* QUICK DEPOSIT / WITHDRAW MODAL                            */}
      {/* ========================================================= */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white border border-[#e4eae0] rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#e4eae0] pb-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${modalType === 'deposit' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {modalType === 'deposit' ? <Plus className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-serif font-bold text-[#13382c] capitalize">
                    {modalType === 'deposit' ? 'Deposit Liquidity' : 'Withdraw Funds'}
                  </h3>
                  <p className="text-[11px] text-[#69887b]">Atomic double-entry ledger settlement</p>
                </div>
              </div>
              <button
                onClick={() => setModalType(null)}
                className="text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {actionSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{actionSuccess}</span>
              </div>
            )}

            <form onSubmit={handleActionSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Account
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full bg-[#f9faf7] border border-[#e4eae0] rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#13382c]"
                >
                  {userAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.accountName} (${a.balance.toLocaleString()} {a.currency})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {modalType === 'deposit' ? 'Deposit Amount ($)' : 'Withdraw Amount ($)'}
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={actionAmount}
                  onChange={(e) => setActionAmount(e.target.value)}
                  className="w-full bg-white border border-[#e4eae0] rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#13382c]"
                  placeholder="e.g. 5000"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Audit Memo / Reference
                </label>
                <input
                  type="text"
                  value={actionMemo}
                  onChange={(e) => setActionMemo(e.target.value)}
                  className="w-full bg-white border border-[#e4eae0] rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#13382c]"
                  placeholder="e.g. Operating liquidity deposit"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e4eae0]">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-[#e4eae0] bg-[#f9faf7] text-xs text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#13382c] hover:bg-[#1a4a3a] text-white text-xs font-semibold shadow-xs"
                >
                  Confirm {modalType === 'deposit' ? 'Deposit' : 'Withdrawal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
