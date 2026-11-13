/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldCheck, Database, Lock, ArrowRight, Check, X } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: 'Welcome to Vaultora',
      subtitle: 'Secure Enterprise Ledger & Treasury Platform',
      icon: ShieldCheck,
      content: (
        <div className="space-y-3 text-sm text-slate-300">
          <p>
            Vaultora is engineered for high-integrity financial operations, providing mathematical double-entry guarantees,
            real-time cryptographic audit logging, and role-based permissions.
          </p>
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5 text-xs text-slate-400">
            <div className="flex items-center space-x-2 text-cyan-400 font-semibold">
              <span>Core Guarantees:</span>
            </div>
            <div>• Atomic double-entry fund transfers (Debits == Credits invariant)</div>
            <div>• SHA-256 block hash-chaining and RFC 6962 Merkle epoch proofs</div>
            <div>• Segregated institutional roles and high-value dual authorization</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Multi-Account Segregation',
      subtitle: 'Separated balances with instant settlements',
      icon: Database,
      content: (
        <div className="space-y-3 text-sm text-slate-300">
          <p>
            Each user and enterprise can hold segregated accounts designated for distinct financial functions:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="font-semibold text-cyan-400 block mb-1">Checking</span>
              Operating balance for day-to-day liquidity and disbursements.
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="font-semibold text-emerald-400 block mb-1">Savings</span>
              Yield-earning reserve vault and treasury buffers.
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="font-semibold text-indigo-400 block mb-1">Investment</span>
              Portfolio capital allocation and yield strategies.
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="font-semibold text-amber-400 block mb-1">Escrow</span>
              Conditional collateral and regulatory margin holds.
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Governance & RBAC Roles',
      subtitle: 'Principle of least privilege',
      icon: Lock,
      content: (
        <div className="space-y-3 text-sm text-slate-300">
          <p>
            Vaultora enforces granular RBAC (Role-Based Access Control) to eliminate single points of failure:
          </p>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-start space-x-2">
              <span className="px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 font-mono font-semibold">ADMIN</span>
              <span>Full control over users, policies, liquidity pools, and dual authorization.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono font-semibold">COMPLIANCE</span>
              <span>Dual-approval on transfers &gt; ₹50,000, regulatory freezes, and KYC reviews.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-semibold">OPERATOR</span>
              <span>Execution of treasury rebalances, batch payouts, and wire transfers.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono font-semibold">AUDITOR</span>
              <span>Read-only mathematical verification of hash chains and Merkle receipts.</span>
            </li>
          </ul>
        </div>
      ),
    },
  ];

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-800 flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">{current.title}</h2>
              <p className="text-xs text-slate-400">{current.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">{current.content}</div>

        <div className="p-6 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between">
          <div className="flex space-x-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-6 bg-cyan-400' : 'w-2 bg-slate-700'
                }`}
              />
            ))}
          </div>

          <div className="flex space-x-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (isLast) onClose();
                else setStep(step + 1);
              }}
              className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
            >
              <span>{isLast ? 'Get Started' : 'Next'}</span>
              {isLast ? <Check className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

