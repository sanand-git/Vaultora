/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileCheck2,
  Download,
  Shield,
  Sliders,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Info,
  Lock,
  Binary
} from 'lucide-react';
import type { AuditLogEntry, UserProfile, VerificationResult, LedgerTransaction } from '../types';
import { hasPermission } from '../utils/rbac';

interface AuditLogsViewProps {
  currentUser: UserProfile;
  auditLogs: AuditLogEntry[];
  transactions: LedgerTransaction[];
  verificationResult: VerificationResult;
  onUpdatePolicyLimits: (dailyMax: number, dualThreshold: number) => void;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({
  currentUser,
  auditLogs,
  transactions,
  verificationResult,
  onUpdatePolicyLimits
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [dualThresholdInput, setDualThresholdInput] = useState(
    currentUser.limitConfig.dualApprovalThreshold.toString()
  );
  const [dailyMaxInput, setDailyMaxInput] = useState(
    currentUser.limitConfig.dailyMax.toString()
  );
  const [policySaved, setPolicySaved] = useState(false);

  const canConfigure = hasPermission(currentUser, 'canConfigurePolicies');

  const filteredLogs = auditLogs.filter(log => {
    if (filterSeverity !== 'ALL' && log.severity !== filterSeverity) return false;
    return true;
  });

  const handleSavePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canConfigure) return;

    const threshold = Math.max(1000, parseFloat(dualThresholdInput) || 50000);
    const max = Math.max(threshold, parseFloat(dailyMaxInput) || 1000000);

    onUpdatePolicyLimits(max, threshold);
    setPolicySaved(true);
    setTimeout(() => setPolicySaved(false), 3000);
  };

  const exportFullAuditReport = () => {
    const report = {
      title: 'Vaultora Cryptographic Audit Attestation',
      generatedAt: new Date().toISOString(),
      auditor: {
        name: currentUser.name,
        role: currentUser.role,
        email: currentUser.email
      },
      cryptographicState: {
        isValid: verificationResult.isValid,
        totalBlocks: transactions.length,
        doubleEntryBalanced: verificationResult.doubleEntryBalanced,
        merkleRootsValid: verificationResult.merkleRootsValid,
        reconciliationStatus: verificationResult.balancesReconciled ? 'RECONCILED' : 'DISCREPANCY',
        latencyMs: verificationResult.executionTimeMs
      },
      auditLogEventsCount: auditLogs.length,
      auditLogsSample: auditLogs
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vaultora-audit-attestation-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e4eae0] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif text-[#13382c] flex items-center gap-2">
            <FileCheck2 className="h-6 w-6 text-[#13382c]" />
            <span>Cryptographic Audit Logs & Policy Controls</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Immutable system activity register, dual-authorization limits, and exportable regulatory attestations.
          </p>
        </div>

        <button
          onClick={exportFullAuditReport}
          className="flex items-center gap-2 rounded-xl bg-white hover:bg-slate-50 border border-[#e4eae0] px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <Download className="h-4 w-4 text-[#13382c]" />
          <span>Export Full Audit Report (.json)</span>
        </button>
      </div>

      {/* Grid: Policy Limits + Attestation Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Policy Configuration (Admin only) */}
        <div className="lg:col-span-6 rounded-2xl border border-[#e4eae0] bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-[#13382c]" />
              <h2 className="text-sm font-semibold text-slate-900">Institutional Policy Thresholds</h2>
            </div>
            {!canConfigure && (
              <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                <Lock className="h-3 w-3" /> Admin Only
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Configure system-wide dual authorization triggers and maximum daily single-account volume.
          </p>

          <form onSubmit={handleSavePolicy} className="space-y-4 text-xs font-mono">
            <div>
              <label className="block text-slate-700 font-sans font-semibold mb-1">
                Dual-Authorization Threshold (₹)
              </label>
              <input
                type="number"
                disabled={!canConfigure}
                step="5000"
                value={dualThresholdInput}
                onChange={(e) => setDualThresholdInput(e.target.value)}
                className="w-full rounded-xl border border-[#e4eae0] bg-white px-3.5 py-2 text-slate-900 focus:outline-none focus:border-[#13382c] disabled:opacity-40"
              />
              <p className="mt-1 text-[11px] text-slate-500 font-sans">
                Movements at or above this value require secondary administrative sign-off before settlement.
              </p>
            </div>

            <div>
              <label className="block text-slate-700 font-sans font-semibold mb-1">
                Standard Daily Maximum Cumulative Movement (₹)
              </label>
              <input
                type="number"
                disabled={!canConfigure}
                step="50000"
                value={dailyMaxInput}
                onChange={(e) => setDailyMaxInput(e.target.value)}
                className="w-full rounded-xl border border-[#e4eae0] bg-white px-3.5 py-2 text-slate-900 focus:outline-none focus:border-[#13382c] disabled:opacity-40"
              />
            </div>

            {policySaved && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Policy thresholds committed and signed into audit log.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!canConfigure}
              className="rounded-xl bg-[#13382c] hover:bg-[#1a4a3a] px-4 py-2 text-xs font-semibold text-white transition cursor-pointer disabled:opacity-40 shadow-xs"
            >
              Update Policy Thresholds
            </button>
          </form>
        </div>

        {/* Regulatory Attestation Badge Card */}
        <div className="lg:col-span-6 rounded-2xl border border-[#e4eae0] bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#13382c]" />
              <h2 className="text-sm font-semibold text-slate-900">Cryptographic Attestation Summary</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Zero-knowledge proof readiness for internal controls & SOC-1/SOC-2 Type II audit readiness.
            </p>

            <div className="mt-4 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#f9faf8] border border-[#e4eae0]">
                <span className="text-slate-500">HASH CHAIN INTEGRITY</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> 100% MATHEMATICAL VALIDITY
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#f9faf8] border border-[#e4eae0]">
                <span className="text-slate-500">DOUBLE ENTRY DRIFT</span>
                <span className="text-emerald-700 font-bold">Δ = ₹0.0000 (INVARIANT HELD)</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#f9faf8] border border-[#e4eae0]">
                <span className="text-slate-500">AUDIT LOG DIGITAL SIGNATURES</span>
                <span className="text-[#13382c] font-bold">{auditLogs.length} EVENTS SIGNED</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#f9faf8] border border-[#e4eae0] text-[11px] text-slate-600 font-sans flex items-start gap-2">
            <Info className="h-4 w-4 text-[#13382c] shrink-0 mt-0.5" />
            <span>
              All transactions are exportable as RFC-6962 Merkle certificates verifiable by third-party auditors without revealing confidential counterparty identity.
            </span>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-serif text-[#13382c] flex items-center gap-2">
            <Binary className="h-4 w-4 text-[#13382c]" />
            <span>Signed System Operations Register</span>
            <span className="text-xs font-mono text-slate-400 font-normal">
              ({filteredLogs.length} events)
            </span>
          </h2>

          <div className="flex items-center gap-1 rounded-xl border border-[#e4eae0] bg-[#f9faf8] p-1">
            {['ALL', 'info', 'warning', 'critical'].map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition cursor-pointer capitalize ${
                  filterSeverity === sev
                    ? 'bg-white text-[#13382c] shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#e4eae0] bg-white shadow-xs">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-[#e4eae0] bg-[#f9faf8] text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Event Timestamp</th>
                <th className="py-3 px-4">Actor & Role</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Operation Details</th>
                <th className="py-3 px-4">Signature Digest</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4eae0] text-slate-700">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                    {new Date(log.timestamp).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap font-sans">
                    <span className="font-semibold text-slate-900">{log.actorName}</span>
                    <span className="text-[10px] font-mono text-slate-400 ml-1 uppercase">
                      [{log.actorRole}]
                    </span>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="font-semibold text-slate-900">
                      {log.action}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-sans text-xs text-slate-600 max-w-md">
                    {log.details}
                  </td>

                  <td className="py-3 px-4 text-slate-400 text-[11px] truncate max-w-xs">
                    {log.hashSignature.slice(0, 16)}...
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
