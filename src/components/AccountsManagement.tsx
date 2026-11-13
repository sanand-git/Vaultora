/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Wallet,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Filter,
  DollarSign,
  Search,
  Shield,
  Layers,
  ArrowUpRight,
  Plus
} from 'lucide-react';
import type { Account, UserProfile } from '../types';
import { hasPermission } from '../utils/rbac';

interface AccountsManagementProps {
  currentUser: UserProfile;
  accounts: Account[];
  onToggleFreezeAccount: (accountId: string, reason: string) => void;
  onUpdateReservedBalance: (accountId: string, newReserve: number) => void;
  onOpenCreateAccount?: () => void;
}

export const AccountsManagement: React.FC<AccountsManagementProps> = ({
  currentUser,
  accounts,
  onToggleFreezeAccount,
  onUpdateReservedBalance,
  onOpenCreateAccount
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterCurrency, setFilterCurrency] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [freezeModalAccount, setFreezeModalAccount] = useState<Account | null>(null);
  const [freezeReason, setFreezeReason] = useState('Regulatory compliance hold - FinCEN SAR review');
  const [reserveModalAccount, setReserveModalAccount] = useState<Account | null>(null);
  const [reserveInput, setReserveInput] = useState('0');

  const canFreeze = hasPermission(currentUser, 'canFreezeAccount');

  // Aggregated totals of active custodial balances in INR (Indian Rupees)
  const totalInr = accounts
    .filter(a => a.id !== 'acc_cold_reserve')
    .reduce((sum, a) => sum + Math.max(0, a.balance), 0);

  const totalOperating = accounts
    .filter(a => (a.type === 'operating' || a.type === 'CHECKING') && a.id !== 'acc_cold_reserve')
    .reduce((sum, a) => sum + Math.max(0, a.balance), 0);

  const totalTreasury = accounts
    .filter(a => (a.type === 'treasury' || a.type === 'TREASURY' || a.type === 'SAVINGS') && a.id !== 'acc_cold_reserve')
    .reduce((sum, a) => sum + Math.max(0, a.balance), 0);

  const totalReserved = accounts
    .filter(a => a.id !== 'acc_cold_reserve')
    .reduce((sum, a) => sum + a.reservedBalance, 0);

  const filteredAccounts = accounts.filter(acc => {
    if (filterType !== 'ALL' && acc.type !== filterType) return false;
    if (filterCurrency !== 'ALL' && acc.currency !== filterCurrency) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = acc.accountName.toLowerCase().includes(q);
      const matchNumber = acc.accountNumber.toLowerCase().includes(q);
      const matchEntity = acc.entityName.toLowerCase().includes(q);
      if (!matchName && !matchNumber && !matchEntity) return false;
    }
    return true;
  });

  const handleConfirmFreeze = () => {
    if (!freezeModalAccount) return;
    onToggleFreezeAccount(freezeModalAccount.id, freezeReason);
    setFreezeModalAccount(null);
  };

  const handleConfirmReserve = () => {
    if (!reserveModalAccount) return;
    const val = Math.max(0, parseFloat(reserveInput) || 0);
    onUpdateReservedBalance(reserveModalAccount.id, val);
    setReserveModalAccount(null);
  };

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5e9e2] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-[#13382c] flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#eaf0e6] border border-[#d8e2d4] flex items-center justify-center text-[#13382c]">
              <Wallet className="h-4 w-4 text-[#13382c]" />
            </div>
            <span>Vault Accounts & Treasury Portfolios</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#69887b] mt-1">
            Multi-currency treasury reserves, escrow collateral pools, and compliance freeze controls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onOpenCreateAccount && (
            <button
              onClick={onOpenCreateAccount}
              className="px-4 py-2 rounded-xl bg-[#13382c] hover:bg-[#1a4a3a] text-white text-xs font-semibold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Open Vault Account</span>
            </button>
          )}

          {!canFreeze && (
            <div className="text-[11px] font-mono text-slate-500 bg-white border border-[#d8e2d4] px-3 py-1.5 rounded-xl shadow-xs">
              Freeze permissions restricted to Compliance & SecOps roles.
            </div>
          )}
        </div>
      </div>

      {/* Aggregated Vault Balances Metric Cards (Rupees Only) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* INR Total Custody */}
        <div className="rounded-2xl border border-[#e4eae0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#69887b] text-[11px] font-mono font-medium">
            <span>TOTAL RUPEES CUSTODY</span>
            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">INR (₹)</span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-[#13382c]">
            ₹{totalInr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="mt-1 text-[11px] text-[#809d91]">
            Across treasury & operational accounts
          </p>
        </div>

        {/* Operating Liquidity */}
        <div className="rounded-2xl border border-[#e4eae0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#69887b] text-[11px] font-mono font-medium">
            <span>OPERATING LIQUIDITY</span>
            <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-bold">INR (₹)</span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-[#13382c]">
            ₹{totalOperating.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="mt-1 text-[11px] text-[#809d91]">
            Active settlement & liquidity vaults
          </p>
        </div>

        {/* Treasury Reserves */}
        <div className="rounded-2xl border border-[#e4eae0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#69887b] text-[11px] font-mono font-medium">
            <span>TREASURY RESERVES</span>
            <span className="text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-bold">INR (₹)</span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-[#13382c]">
            ₹{totalTreasury.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="mt-1 text-[11px] text-[#809d91]">
            Institutional reserve capital pool
          </p>
        </div>

        {/* In-Reserve / Escrow */}
        <div className="rounded-2xl border border-[#e4eae0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#69887b] text-[11px] font-mono font-medium">
            <span>LOCKED RESERVES</span>
            <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-bold">ESCROW</span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-700">
            ₹{totalReserved.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="mt-1 text-[11px] text-[#809d91]">
            Margin collateral & bonded vaults
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search account name, number, entity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-xl border border-[#d8e2d4] bg-white pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#13382c] shadow-xs w-full sm:w-72"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Currency Segmented */}
          <div className="flex items-center gap-1 rounded-xl border border-[#d8e2d4] bg-[#edf2ea] p-1">
            {['ALL', 'INR'].map((cur) => (
              <button
                key={cur}
                onClick={() => setFilterCurrency(cur)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-mono font-semibold transition cursor-pointer ${
                  filterCurrency === cur
                    ? 'bg-white text-[#13382c] shadow-xs'
                    : 'text-[#69887b] hover:text-[#13382c]'
                }`}
              >
                {cur === 'ALL' ? 'All (INR)' : 'INR (₹)'}
              </button>
            ))}
          </div>

          {/* Type Segmented */}
          <div className="flex items-center gap-1 rounded-xl border border-[#d8e2d4] bg-[#edf2ea] p-1">
            {['ALL', 'operating', 'treasury', 'escrow', 'reserve'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition cursor-pointer capitalize ${
                  filterType === t
                    ? 'bg-white text-[#13382c] shadow-xs font-semibold'
                    : 'text-[#69887b] hover:text-[#13382c]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="overflow-x-auto rounded-2xl border border-[#e4eae0] bg-white shadow-xs">
        <table className="w-full text-left text-xs font-sans">
          <thead className="border-b border-[#e4eae0] bg-[#f8faf7] text-[11px] uppercase tracking-wider text-[#69887b] font-semibold">
            <tr>
              <th className="py-3.5 px-4">Account Number</th>
              <th className="py-3.5 px-4">Name & Entity</th>
              <th className="py-3.5 px-4">Type</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Available Balance</th>
              <th className="py-3.5 px-4 text-right">Total Balance</th>
              <th className="py-3.5 px-4 text-center">Compliance Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e4eae0] text-slate-700">
            {filteredAccounts.map((acc) => {
              const available = acc.balance - acc.reservedBalance;
              const isFrozen = acc.status === 'frozen';
              return (
                <tr key={acc.id} className="hover:bg-[#fbfdfb] transition">
                  {/* Account Number */}
                  <td className="py-3.5 px-4 font-bold font-mono text-[#13382c]">
                    {acc.accountNumber}
                  </td>

                  {/* Name & Entity */}
                  <td className="py-3.5 px-4 font-sans">
                    <div className="font-semibold text-slate-900">{acc.accountName}</div>
                    <div className="text-[11px] text-[#69887b]">{acc.entityName}</div>
                  </td>

                  {/* Type */}
                  <td className="py-3.5 px-4 uppercase text-[11px] text-[#69887b] font-mono">
                    {acc.type}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    {isFrozen ? (
                      <span className="font-semibold text-rose-700 flex items-center gap-1 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] w-fit">
                        <Lock className="h-3 w-3" /> FROZEN
                      </span>
                    ) : (
                      <span className="font-semibold text-emerald-800 flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] w-fit">
                        <CheckCircle2 className="h-3 w-3" /> ACTIVE
                      </span>
                    )}
                  </td>

                  {/* Available Balance */}
                  <td className="py-3.5 px-4 text-right font-bold text-emerald-700 font-mono">
                    {acc.id === 'acc_cold_reserve' ? (
                      <span className="text-slate-400 font-normal">Collateral Base</span>
                    ) : (
                      <>
                        ₹{available.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </>
                    )}
                  </td>

                  {/* Total Balance & Reserve */}
                  <td className="py-3.5 px-4 text-right font-mono text-slate-800 font-medium">
                    {acc.id === 'acc_cold_reserve' ? (
                      <div>
                        ₹{Math.abs(acc.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        <div className="text-[10px] text-cyan-700 font-sans">Underwriting Pool</div>
                      </div>
                    ) : (
                      <div>
                        <div>
                          ₹{acc.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        {acc.reservedBalance > 0 && (
                          <div className="text-[10px] text-amber-700 font-sans">
                            (₹{acc.reservedBalance.toLocaleString('en-IN')} reserved)
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          setReserveModalAccount(acc);
                          setReserveInput(acc.reservedBalance.toString());
                        }}
                        className="rounded-lg bg-[#eaf0e6] hover:bg-[#d8e2d4] px-2.5 py-1 text-[11px] text-[#13382c] font-medium transition cursor-pointer"
                        title="Adjust locked collateral reserve"
                      >
                        Reserve
                      </button>

                      {isFrozen ? (
                        <button
                          onClick={() => onToggleFreezeAccount(acc.id, 'Unfreezing - Compliance review completed')}
                          disabled={!canFreeze}
                          className="rounded-lg bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-2.5 py-1 text-[11px] text-emerald-800 font-medium transition cursor-pointer disabled:opacity-40"
                        >
                          <Unlock className="h-3 w-3 inline mr-1" />
                          <span>Unfreeze</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setFreezeModalAccount(acc);
                            setFreezeReason('Regulatory compliance hold - FinCEN SAR review');
                          }}
                          disabled={!canFreeze}
                          className="rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100 px-2.5 py-1 text-[11px] text-rose-700 font-medium transition cursor-pointer disabled:opacity-40"
                        >
                          <Lock className="h-3 w-3 inline mr-1" />
                          <span>Freeze</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Freeze Compliance Modal */}
      {freezeModalAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-[#e4eae0] bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Lock className="h-5 w-5 text-rose-600" />
              <span>Freeze Account: {freezeModalAccount.accountName}</span>
            </h3>
            <p className="text-xs text-slate-600">
              Freezing will halt all incoming and outgoing debits and credits on {freezeModalAccount.accountNumber}.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mandatory Compliance Justification Memo
              </label>
              <textarea
                rows={3}
                value={freezeReason}
                onChange={(e) => setFreezeReason(e.target.value)}
                className="w-full rounded-xl border border-[#d8e2d4] bg-[#f9faf7] p-2.5 text-xs text-slate-900 focus:outline-none focus:border-rose-500 font-sans"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setFreezeModalAccount(null)}
                className="rounded-xl px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 cursor-pointer transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmFreeze}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer transition shadow-xs"
              >
                Execute Regulatory Freeze
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reserve Adjustment Modal */}
      {reserveModalAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-[#e4eae0] bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-600" />
              <span>Adjust Reserved Collateral Balance</span>
            </h3>
            <p className="text-xs text-slate-600">
              Reserved balance is held as margin collateral and cannot be drawn for outgoing transfers.
            </p>

            <div>
              <div className="text-xs font-semibold text-slate-700 mb-1">
                Account: {reserveModalAccount.accountName} (Total: ₹{reserveModalAccount.balance.toLocaleString('en-IN')})
              </div>
              <input
                type="number"
                min="0"
                max={reserveModalAccount.balance}
                step="1000"
                value={reserveInput}
                onChange={(e) => setReserveInput(e.target.value)}
                className="w-full rounded-xl border border-[#d8e2d4] bg-[#f9faf7] px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setReserveModalAccount(null)}
                className="rounded-xl px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 cursor-pointer transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReserve}
                className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 cursor-pointer transition shadow-xs"
              >
                Save Reserve Allocation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
