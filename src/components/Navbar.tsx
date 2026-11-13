/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ChevronDown,
  Layers,
  ArrowRightLeft,
  Wallet,
  UserCheck,
  FileCheck2,
  LogOut,
  Shield,
  CheckCircle2
} from 'lucide-react';
import type { UserProfile, VerificationResult } from '../types';
import { ROLE_DEFINITIONS } from '../utils/rbac';

interface NavbarProps {
  currentUser: UserProfile;
  users: UserProfile[];
  onSelectUser: (user: UserProfile) => void;
  activeTab: 'ledger' | 'movement' | 'accounts' | 'onboarding' | 'audit';
  onSelectTab: (tab: 'ledger' | 'movement' | 'accounts' | 'onboarding' | 'audit') => void;
  pendingApprovalsCount: number;
  pendingOnboardingCount: number;
  verificationResult: VerificationResult;
  onRunAudit: () => void;
  isVerifying: boolean;
  onSignOut?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  users,
  onSelectUser,
  activeTab,
  onSelectTab,
  pendingApprovalsCount,
  pendingOnboardingCount,
  verificationResult,
  onRunAudit,
  isVerifying,
  onSignOut
}) => {
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const currentRoleDef = ROLE_DEFINITIONS[currentUser.role];

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <img
            src="/logo-icon.png"
            alt="Vaultora"
            className="h-8 w-8 object-contain shrink-0 drop-shadow-xs"
          />
          <span className="text-base font-bold tracking-tight text-white font-sans">
            vaultora
          </span>
        </div>

        {/* Center Streamlined Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => onSelectTab('accounts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'accounts'
                ? 'bg-zinc-800 text-white font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
            }`}
          >
            <Wallet className="h-3.5 w-3.5" />
            <span>Vaults</span>
          </button>

          <button
            onClick={() => onSelectTab('movement')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'movement'
                ? 'bg-zinc-800 text-white font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
            }`}
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            <span>Transfers</span>
            {pendingApprovalsCount > 0 && (
              <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-mono font-bold text-amber-400 border border-amber-500/30">
                {pendingApprovalsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('ledger')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'ledger'
                ? 'bg-zinc-800 text-white font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Ledger</span>
          </button>

          <button
            onClick={() => onSelectTab('onboarding')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'onboarding'
                ? 'bg-zinc-800 text-white font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Onboarding</span>
            {pendingOnboardingCount > 0 && (
              <span className="rounded-full bg-blue-500/20 px-1.5 py-0.2 text-[10px] font-mono font-bold text-blue-400 border border-blue-500/30">
                {pendingOnboardingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('audit')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-zinc-800 text-white font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
            }`}
          >
            <FileCheck2 className="h-3.5 w-3.5" />
            <span>Audit Trail</span>
          </button>
        </nav>

        {/* Right Section: Status, Persona Switcher & Sign Out */}
        <div className="flex items-center gap-2.5">
          {/* Quick Ledger Status Pill */}
          <button
            onClick={onRunAudit}
            disabled={isVerifying}
            className="hidden lg:flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 py-1 text-xs text-zinc-300 hover:border-zinc-700 transition cursor-pointer"
            title="Recalculate Ledger Verification"
          >
            <span className={`h-2 w-2 rounded-full ${verificationResult.isValid ? 'bg-emerald-400' : 'bg-rose-400 animate-pulse'}`} />
            <span className="text-[11px] font-medium text-zinc-300">
              {isVerifying ? 'Auditing...' : verificationResult.isValid ? 'Verified' : 'Flagged'}
            </span>
          </button>

          {/* User Persona Switcher */}
          <div className="relative">
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-left transition hover:border-zinc-700 hover:bg-zinc-900 cursor-pointer"
            >
              <div className={`flex h-6 w-6 items-center justify-center rounded-md font-mono text-[11px] font-bold text-white ${currentUser.avatarBg}`}>
                {currentUser.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-zinc-200 leading-tight">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-zinc-400 leading-tight">
                  {currentRoleDef.label}
                </div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
            </button>

            {roleMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl border border-zinc-800 bg-zinc-900 p-2 shadow-2xl z-50">
                <div className="px-2 py-1.5 border-b border-zinc-800 mb-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                    Simulate Role Persona
                  </div>
                </div>
                <div className="space-y-1">
                  {users.map(u => {
                    const roleMeta = ROLE_DEFINITIONS[u.role];
                    const isSelected = u.id === currentUser.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          onSelectUser(u);
                          setRoleMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition cursor-pointer text-xs ${
                          isSelected ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-300 hover:bg-zinc-800/60'
                        }`}
                      >
                        <div className="truncate">
                          <div className="text-zinc-200 truncate">{u.name}</div>
                          <div className="text-[10px] text-zinc-500 truncate">{u.title}</div>
                        </div>
                        <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${roleMeta.color} bg-zinc-950`}>
                          {roleMeta.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sign Out Button */}
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-rose-300 hover:border-zinc-700 transition cursor-pointer"
              title="Lock Vault"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Horizontal Tab Navigation */}
      <div className="md:hidden flex items-center gap-1 px-4 py-2 border-t border-zinc-800/60 overflow-x-auto bg-zinc-950/60">
        <button
          onClick={() => onSelectTab('accounts')}
          className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap ${activeTab === 'accounts' ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}
        >
          Vaults
        </button>
        <button
          onClick={() => onSelectTab('movement')}
          className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap ${activeTab === 'movement' ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}
        >
          Transfers
        </button>
        <button
          onClick={() => onSelectTab('ledger')}
          className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap ${activeTab === 'ledger' ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}
        >
          Ledger
        </button>
        <button
          onClick={() => onSelectTab('onboarding')}
          className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap ${activeTab === 'onboarding' ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}
        >
          Onboarding
        </button>
        <button
          onClick={() => onSelectTab('audit')}
          className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap ${activeTab === 'audit' ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}
        >
          Audit
        </button>
      </div>
    </header>
  );
};
