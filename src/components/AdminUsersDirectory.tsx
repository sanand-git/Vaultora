/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Shield,
  ShieldCheck,
  UserCheck,
  Mail
} from 'lucide-react';
import type { UserProfile, Role } from '../types';
import { ROLE_DEFINITIONS } from '../utils/rbac';

interface AdminUsersDirectoryProps {
  currentUser: UserProfile;
  users: UserProfile[];
  onUpdateUserRole: (userId: string, newRole: Role) => void;
  onToggleUserStatus: (userId: string) => void;
}

export const AdminUsersDirectory: React.FC<AdminUsersDirectoryProps> = ({
  currentUser,
  users,
  onUpdateUserRole,
  onToggleUserStatus,
}) => {
  const [search, setSearch] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [sendingEmailUserId, setSendingEmailUserId] = useState<string | null>(null);

  const canManageRoles = currentUser.role === 'admin' || currentUser.role === 'operator';

  const filteredUsers = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  const handleSendRegistrationEmail = async (u: UserProfile) => {
    setSendingEmailUserId(u.id);
    try {
      const res = await fetch('/api/auth/register-success', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: u.name,
          email: u.email,
          entityType: u.entityType,
          kycTier: u.kycTier
        })
      });
      const data = await res.json();
      if (data.liveDelivered) {
        setSuccessMsg(`Registration confirmation email successfully delivered to ${u.email}`);
      } else {
        setSuccessMsg(`Registration email dispatched for ${u.email} (logged to server console). Set SMTP_PASS in .env for live inbox delivery.`);
      }
    } catch {
      setSuccessMsg(`Dispatched registration email for ${u.email}`);
    } finally {
      setSendingEmailUserId(null);
      setTimeout(() => setSuccessMsg(null), 5000);
    }
  };

  const handleRoleChange = (userId: string, newRole: Role) => {
    onUpdateUserRole(userId, newRole);
    setSuccessMsg(`Role updated to ${newRole.toUpperCase()} for user ID ${userId}`);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleStatusChange = (userId: string) => {
    onToggleUserStatus(userId);
    setSuccessMsg(`Account status updated for user ID ${userId}`);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e4eae0] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#13382c]/10 text-[#13382c]">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-serif text-[#13382c] font-normal">
              User Directory & Access Governance
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Institutional directory maintaining verified platform accounts: Admin and Account Holder.
          </p>
        </div>

        {!canManageRoles && (
          <div className="text-xs font-mono text-[#13382c] bg-[#13382c]/10 border border-[#13382c]/20 px-3 py-1.5 rounded-xl">
            Read-Only Audit Mode: Elevated permissions required to edit RBAC
          </div>
        )}
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Search Bar & Summary */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-[#e4eae0] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#13382c] placeholder:text-slate-400 shadow-xs"
          />
        </div>

        <div className="text-xs text-slate-500">
          Total Directory Accounts: <strong className="text-slate-800 font-semibold">{filteredUsers.length}</strong>
        </div>
      </div>

      {/* Users Table */}
      <div className="border border-[#e4eae0] rounded-2xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f9faf8] border-b border-[#e4eae0] text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">User Identity</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">KYC / Diligence</th>
                <th className="py-3 px-4">Dual-Approval Threshold</th>
                <th className="py-3 px-4">Daily Limit</th>
                <th className="py-3 px-4">Registration Notice</th>
                <th className="py-3 px-4 text-right">Account Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4eae0] font-sans">
              {filteredUsers.map((u) => {
                const isCurrent = u.id === currentUser.id;

                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-9 w-9 rounded-full font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                            u.role === 'admin'
                              ? 'bg-[#13382c] text-white'
                              : 'bg-[#cbd5c0] text-[#13382c]'
                          }`}
                        >
                          {u.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-2">
                            <span>{u.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Active Session
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {canManageRoles ? (
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                          className="bg-white border border-[#e4eae0] rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-[#13382c] cursor-pointer shadow-xs"
                        >
                          <option value="admin">ADMIN (Administrator)</option>
                          <option value="holder">HOLDER (Account Holder)</option>
                        </select>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md text-xs font-medium uppercase bg-[#13382c]/10 text-[#13382c] border border-[#13382c]/20">
                          {u.role}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          u.kycStatus === 'verified'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {u.kycStatus === 'verified' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                        )}
                        <span>{u.kycStatus} ({u.kycTier})</span>
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-700">
                      ₹{u.limitConfig.dualApprovalThreshold.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-700">
                      ₹{u.limitConfig.dailyMax.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleSendRegistrationEmail(u)}
                        disabled={sendingEmailUserId === u.id}
                        title="Send 'Registration Successful' email to this user's inbox"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border border-slate-200 hover:border-emerald-200 transition cursor-pointer disabled:opacity-50"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>{sendingEmailUserId === u.id ? 'Sending...' : 'Send Email'}</span>
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {canManageRoles && !isCurrent ? (
                        <button
                          onClick={() => handleStatusChange(u.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                            u.kycStatus === 'verified'
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {u.kycStatus === 'verified' ? 'Active' : 'Suspended'}
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Active</span>
                        </span>
                      )}
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
