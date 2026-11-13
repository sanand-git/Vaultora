/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Plus, AlertCircle, ShieldCheck } from 'lucide-react';
import type { AccountType, Currency } from '../types';

interface CreateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAccount: (data: {
    name: string;
    type: AccountType;
    initialBalance: number;
    currency: Currency;
  }) => void;
}

export const CreateAccountModal: React.FC<CreateAccountModalProps> = ({
  isOpen,
  onClose,
  onCreateAccount,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('CHECKING');
  const [currency, setCurrency] = useState<Currency>('INR');
  const [initialBalance, setInitialBalance] = useState('1000');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide a descriptive account name or label.');
      return;
    }

    const initBal = parseFloat(initialBalance);
    if (isNaN(initBal) || initBal < 0) {
      setError('Initial balance cannot be negative.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      onCreateAccount({
        name: name.trim(),
        type,
        initialBalance: initBal,
        currency,
      });
      setIsSubmitting(false);
      onClose();
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 font-sans">
      <div className="w-full max-w-md bg-white border border-[#e4eae0] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e4eae0] flex items-center justify-between bg-[#f9faf8]">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#13382c]/10 text-[#13382c] flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-serif text-[#13382c]">Open New Vault Account</h3>
              <p className="text-[11px] text-slate-500">Provision dedicated segregated ledger container</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Account Label / Portfolio Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Operating Checking, Global Escrow Collateral"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-[#e4eae0] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#13382c] shadow-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Account Category
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
                className="w-full bg-white border border-[#e4eae0] rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#13382c] cursor-pointer shadow-xs"
              >
                <option value="CHECKING">Checking / Operational</option>
                <option value="SAVINGS">Savings / High Yield</option>
                <option value="INVESTMENT">Investment Vault</option>
                <option value="ESCROW">Escrow Collateral</option>
                <option value="TREASURY">Core Treasury</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Settlement Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-full bg-white border border-[#e4eae0] rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#13382c] cursor-pointer shadow-xs"
              >
                <option value="INR">INR (₹ - Indian Rupees)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Initial Deposit Allocation
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                ₹
              </span>
              <input
                type="number"
                min="0"
                step="any"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white border border-[#e4eae0] rounded-xl pl-8 pr-3.5 py-2.5 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#13382c] shadow-xs"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Funds will be atomically credited via double-entry journal entry from Master Reserve.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-[#13382c] hover:bg-[#1a4a3a] text-white text-xs font-semibold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Provisioning...</span>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Open Account</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
