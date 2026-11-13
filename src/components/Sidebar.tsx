/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  LayoutGrid,
  CreditCard,
  TrendingUp,
  Activity,
  Plus,
  ChevronRight,
  ShieldCheck,
  Check,
  Layers,
  Users,
  UserCheck,
  FileCheck2,
  ChevronDown,
  LogOut,
  RotateCw
} from 'lucide-react';
import type { UserProfile, VerificationResult } from '../types';
import { ROLE_DEFINITIONS } from '../utils/rbac';

export type AppTab =
  | 'overview'
  | 'accounts'
  | 'statements'
  | 'ledger'
  | 'directory'
  | 'onboarding'
  | 'audit';

interface SidebarProps {
  currentUser: UserProfile;
  users: UserProfile[];
  onSelectUser: (user: UserProfile) => void;
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onOpenCreateAccount: () => void;
  pendingApprovalsCount: number;
  pendingOnboardingCount: number;
  verificationResult: VerificationResult;
  onRunAudit: () => void;
  isVerifying: boolean;
  onSignOut: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  users,
  onSelectUser,
  activeTab,
  onSelectTab,
  onOpenCreateAccount,
  pendingApprovalsCount,
  pendingOnboardingCount,
  verificationResult,
  onRunAudit,
  isVerifying,
  onSignOut
}) => {
  const currentRoleDef = ROLE_DEFINITIONS[currentUser.role];

  return (
    <aside className="w-full lg:w-64 shrink-0 bg-[#18202d] border-r border-[#222c3c] flex flex-col justify-between lg:h-screen lg:sticky lg:top-0 z-40 overflow-y-auto text-white font-sans selection:bg-slate-700">
      {/* ========================================================= */}
      {/* TOP SECTION: BRAND & NAVIGATION                           */}
      {/* ========================================================= */}
      <div className="p-5 space-y-6">
        {/* Brand Logo (Preserved) */}
        <div className="flex items-center gap-3 px-1 pt-1">
          <img
            src="/logo-icon.png"
            alt="Vaultora"
            className="w-8 h-8 object-contain shrink-0 drop-shadow-xs"
          />
          <span className="text-xl font-bold tracking-tight text-white font-sans">
            vaultora
          </span>
        </div>

        {/* WORKSPACE SECTION */}
        <div className="space-y-1">
          <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-widest text-[#78889b] font-semibold">
            WORKSPACE
          </div>

          <nav className="space-y-1">
            {/* Overview */}
            <button
              type="button"
              onClick={() => onSelectTab('overview')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition text-left cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-[#2b3545] text-white font-semibold border border-[#3d4b60] shadow-xs'
                  : 'text-[#94a3b8] hover:bg-[#202937] hover:text-white border border-transparent'
              }`}
            >
              <LayoutGrid className="w-4 h-4 text-slate-300 shrink-0" />
              <span className="text-sm">Overview</span>
            </button>

            {/* Accounts */}
            <button
              type="button"
              onClick={() => onSelectTab('accounts')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition text-left cursor-pointer ${
                activeTab === 'accounts'
                  ? 'bg-[#2b3545] text-white font-semibold border border-[#3d4b60] shadow-xs'
                  : 'text-[#94a3b8] hover:bg-[#202937] hover:text-white border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-slate-300 shrink-0" />
                <span className="text-sm">Accounts</span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#64748b]" />
            </button>

            {/* Statements / Transfers */}
            <button
              type="button"
              onClick={() => onSelectTab('statements')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition text-left cursor-pointer ${
                activeTab === 'statements'
                  ? 'bg-[#2b3545] text-white font-semibold border border-[#3d4b60] shadow-xs'
                  : 'text-[#94a3b8] hover:bg-[#202937] hover:text-white border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Activity className="w-4 h-4 text-slate-300 shrink-0" />
                <span className="text-sm">Statements</span>
              </div>
            </button>

            {/* + Account request */}
            <button
              type="button"
              onClick={onOpenCreateAccount}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[#94a3b8] hover:bg-[#202937] hover:text-white transition text-left cursor-pointer border border-transparent"
            >
              <Plus className="w-4 h-4 text-slate-300 shrink-0" />
              <span className="text-sm">Account request</span>
            </button>
          </nav>
        </div>

        {/* GOVERNANCE & PROVABLE LEDGER SECTION */}
        <div className="space-y-1 pt-2">
          <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-widest text-[#78889b] font-semibold">
            AUDIT & GOVERNANCE
          </div>

          <nav className="space-y-1">
            {/* Provable Ledger */}
            <button
              type="button"
              onClick={() => onSelectTab('ledger')}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl transition text-left cursor-pointer text-xs ${
                activeTab === 'ledger'
                  ? 'bg-[#2b3545] text-white font-medium border border-[#3d4b60]'
                  : 'text-[#94a3b8] hover:bg-[#202937] hover:text-white border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Layers className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                <span>Provable Ledger</span>
              </div>
              <span className="text-[9px] font-mono text-emerald-400">SHA-256</span>
            </button>

            {/* User Directory - Admin Only */}
            {currentUser.role === 'admin' && (
              <button
                type="button"
                onClick={() => onSelectTab('directory')}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl transition text-left cursor-pointer text-xs ${
                  activeTab === 'directory'
                    ? 'bg-[#2b3545] text-white font-medium border border-[#3d4b60]'
                    : 'text-[#94a3b8] hover:bg-[#202937] hover:text-white border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  <span>User Directory</span>
                </div>
                <span className="text-[11px] font-mono text-[#78889b]">{users.length}</span>
              </button>
            )}

            {/* Client Onboarding - Admin Only */}
            {currentUser.role === 'admin' && (
              <button
                type="button"
                onClick={() => onSelectTab('onboarding')}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl transition text-left cursor-pointer text-xs ${
                  activeTab === 'onboarding'
                    ? 'bg-[#2b3545] text-white font-medium border border-[#3d4b60]'
                    : 'text-[#94a3b8] hover:bg-[#202937] hover:text-white border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <UserCheck className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  <span>Client Onboarding</span>
                </div>
                <span className="w-4 h-4 rounded-full bg-[#0284c7] text-white font-mono font-bold text-[10px] flex items-center justify-center">
                  {pendingOnboardingCount || 1}
                </span>
              </button>
            )}

            {/* Audit Trail */}
            <button
              type="button"
              onClick={() => onSelectTab('audit')}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl transition text-left cursor-pointer text-xs ${
                activeTab === 'audit'
                  ? 'bg-[#2b3545] text-white font-medium border border-[#3d4b60]'
                  : 'text-[#94a3b8] hover:bg-[#202937] hover:text-white border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileCheck2 className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                <span>Audit Trail</span>
              </div>
              <span className="text-[9px] font-mono text-emerald-400">Signed</span>
            </button>
          </nav>
        </div>
      </div>
    </aside>
  );
};
