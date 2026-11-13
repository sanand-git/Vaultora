/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  UserCheck,
  UserPlus,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Building2,
  Globe,
  FileText,
  Lock,
  ArrowRight
} from 'lucide-react';
import type { OnboardingApplicant, UserProfile, Currency } from '../types';
import { hasPermission } from '../utils/rbac';

interface UserOnboardingProps {
  currentUser: UserProfile;
  applicants: OnboardingApplicant[];
  onApproveApplicant: (applicantId: string, initialDeposit: number, currency: Currency) => void;
  onRejectApplicant: (applicantId: string, reason: string) => void;
  onSubmitNewApplicant: (applicant: Omit<OnboardingApplicant, 'id' | 'status' | 'submittedAt'>) => void;
}

export const UserOnboarding: React.FC<UserOnboardingProps> = ({
  currentUser,
  applicants,
  onApproveApplicant,
  onRejectApplicant,
  onSubmitNewApplicant
}) => {
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<OnboardingApplicant | null>(null);
  const [approvalDeposit, setApprovalDeposit] = useState('1000000');
  const [approvalCurrency, setApprovalCurrency] = useState<Currency>('INR');

  // New Application Form State
  const [legalName, setLegalName] = useState('');
  const [entityType, setEntityType] = useState<'individual' | 'institutional'>('institutional');
  const [regNumber, setRegNumber] = useState('');
  const [country, setCountry] = useState('India');
  const [tier, setTier] = useState<'tier1' | 'tier2' | 'tier3'>('tier2');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [initialDeposit, setInitialDeposit] = useState('500000');
  const [initialCurrency, setInitialCurrency] = useState<Currency>('INR');
  const [notes, setNotes] = useState('');

  const canReview = hasPermission(currentUser, 'canOnboardUser');

  const handleCreateApplicant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!legalName.trim() || !contactEmail.trim()) return;

    let riskScore: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (tier === 'tier3') riskScore = 'MEDIUM';

    onSubmitNewApplicant({
      legalName: legalName.trim(),
      entityType,
      registrationNumber: regNumber.trim() || 'REG-' + Math.floor(100000 + Math.random() * 900000),
      country,
      requestedTier: tier,
      contactEmail: contactEmail.trim(),
      contactPerson: contactPerson.trim() || legalName.trim(),
      riskScore,
      initialDepositRequested: parseFloat(initialDeposit) || 0,
      initialCurrency,
      notes: notes.trim()
    });

    // Reset
    setLegalName('');
    setRegNumber('');
    setContactEmail('');
    setContactPerson('');
    setNotes('');
    setShowNewModal(false);
  };

  const handleApprove = (app: OnboardingApplicant) => {
    const dep = Math.max(0, parseFloat(approvalDeposit) || 0);
    onApproveApplicant(app.id, dep, approvalCurrency);
    setSelectedApplicant(null);
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e4eae0] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif text-[#13382c] flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-[#13382c]" />
            <span>Institutional Onboarding & Identity Verification</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            KYC/AML entity diligence, tier assignment, and automated treasury vault provisioning.
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 rounded-xl bg-[#13382c] hover:bg-[#1a4a3a] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="h-4 w-4" />
          <span>New Onboarding Application</span>
        </button>
      </div>

      {!canReview && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
          <Lock className="h-4 w-4 text-amber-600 shrink-0" />
          <span>
            Compliance review controls are restricted to <strong>Admin</strong>. Switch role in the header to approve or reject applicants.
          </span>
        </div>
      )}

      {/* Applications Pipeline Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {applicants.map((app) => {
          const isPending = app.status === 'pending_review';
          const isApproved = app.status === 'approved';

          return (
            <div
              key={app.id}
              className={`rounded-2xl border p-5 flex flex-col justify-between transition ${isPending
                ? 'border-[#e4eae0] bg-white shadow-xs hover:border-[#13382c]/40'
                : isApproved
                  ? 'border-emerald-200 bg-emerald-50/40'
                  : 'border-[#e4eae0] bg-white opacity-60'
                }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#13382c]/10 text-[#13382c]">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 leading-tight">
                        {app.legalName}
                      </h3>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Globe className="h-3 w-3 text-slate-400" />
                        <span>{app.country}</span>
                        <span className="text-slate-300">·</span>
                        <span className="font-mono">{app.registrationNumber}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#f9faf8] border border-[#e4eae0]">
                    <span className="text-slate-500 text-[11px]">REQUESTED TIER</span>
                    <span className="text-slate-800 font-bold uppercase">{app.requestedTier}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#f9faf8] border border-[#e4eae0]">
                    <span className="text-slate-500 text-[11px]">AML RISK ASSESSMENT</span>
                    <span className={`font-bold ${app.riskScore === 'LOW' ? 'text-emerald-700' :
                      app.riskScore === 'MEDIUM' ? 'text-amber-700' :
                        'text-rose-700'
                      }`}>
                      {app.riskScore} RISK
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#f9faf8] border border-[#e4eae0]">
                    <span className="text-slate-500 text-[11px]">INITIAL FUNDING</span>
                    <span className="text-[#13382c] font-bold">
                      ₹{(app.initialDepositRequested || 0).toLocaleString('en-IN')} INR
                    </span>
                  </div>
                </div>

                {app.notes && (
                  <p className="mt-3 text-[11px] text-slate-600 font-sans italic bg-[#f9faf8] p-2.5 rounded-xl border border-[#e4eae0]">
                    &quot;{app.notes}&quot;
                  </p>
                )}
              </div>

              {/* Status and Action Footer */}
              <div className="mt-5 pt-3 border-t border-[#e4eae0] flex items-center justify-between">
                <div>
                  {isPending && (
                    <span className="text-[11px] font-mono font-semibold text-amber-700 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 text-amber-600" /> PENDING REVIEW
                    </span>
                  )}
                  {isApproved && (
                    <span className="text-[11px] font-mono font-semibold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" /> APPROVED & PROVISIONED
                    </span>
                  )}
                </div>

                {isPending && (
                  <button
                    onClick={() => {
                      setSelectedApplicant(app);
                      setApprovalDeposit((app.initialDepositRequested || 500000).toString());
                      setApprovalCurrency('INR');
                    }}
                    disabled={!canReview}
                    className="flex items-center gap-1.5 rounded-xl bg-[#13382c] hover:bg-[#1a4a3a] px-3 py-1.5 text-xs font-semibold text-white transition cursor-pointer disabled:opacity-40 shadow-xs"
                  >
                    <span>Review & Issue Vault</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Review & Approve Modal */}
      {selectedApplicant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#e4eae0] bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-[#e4eae0] pb-3">
              <div>
                <h3 className="text-base font-serif text-[#13382c] flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <span>Approve Institutional Onboarding</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedApplicant.legalName} ({selectedApplicant.registrationNumber})
                </p>
              </div>
              <button
                onClick={() => setSelectedApplicant(null)}
                className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#f9faf8] border border-[#e4eae0] space-y-1">
                <div className="text-[11px] font-mono text-slate-500 uppercase font-semibold">KYC VERIFICATION SUMMARY</div>
                <div className="text-slate-800">
                  Contact: {selectedApplicant.contactPerson} ({selectedApplicant.contactEmail})
                </div>
                <div className="text-slate-800">
                  Jurisdiction: {selectedApplicant.country} · Assigned Tier: {selectedApplicant.requestedTier.toUpperCase()}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Capitalization Deposit to Issue into Ledger
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={approvalDeposit}
                      onChange={(e) => setApprovalDeposit(e.target.value)}
                      className="w-full rounded-xl border border-[#e4eae0] bg-white px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#13382c]"
                    />
                  </div>
                  <div>
                    <select
                      value={approvalCurrency}
                      onChange={(e) => setApprovalCurrency(e.target.value as Currency)}
                      className="w-full rounded-xl border border-[#e4eae0] bg-white px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#13382c]"
                    >
                      <option value="INR">INR (₹)</option>
                    </select>
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  This deposit will be double-entry credited to the client&apos;s new vault and debited from the Core Treasury Reserve.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#e4eae0]">
              <button
                onClick={() => {
                  onRejectApplicant(selectedApplicant.id, 'Risk score exceeds tolerance limit');
                  setSelectedApplicant(null);
                }}
                className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
              >
                <XCircle className="h-4 w-4" />
                <span>Reject Application</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedApplicant(null)}
                  className="rounded-xl border border-[#e4eae0] bg-[#f9faf8] px-3.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleApprove(selectedApplicant)}
                  className="rounded-xl bg-[#13382c] hover:bg-[#1a4a3a] px-4 py-1.5 text-xs font-semibold text-white transition cursor-pointer shadow-xs"
                >
                  Confirm & Provision Vault
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Application Wizard Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl border border-[#e4eae0] bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-[#e4eae0] pb-3">
              <div>
                <h3 className="text-base font-serif text-[#13382c] flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-[#13382c]" />
                  <span>New Client Onboarding Application</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Submit entity details for compliance review and vault allocation.
                </p>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateApplicant} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Legal Entity Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Global Logistics"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    className="w-full rounded-xl border border-[#e4eae0] bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#13382c]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Entity Type
                  </label>
                  <select
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value as any)}
                    className="w-full rounded-xl border border-[#e4eae0] bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#13382c]"
                  >
                    <option value="institutional">Institutional Corporate</option>
                    <option value="individual">Private Wealth Individual</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Registration / Tax Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. US-882910"
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                    className="w-full rounded-xl border border-[#e4eae0] bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#13382c]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jurisdiction / Country
                  </label>
                  <input
                    type="text"
                    required
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full rounded-xl border border-[#e4eae0] bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#13382c]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="treasury@domain.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full rounded-xl border border-[#e4eae0] bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#13382c]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Officer Name
                  </label>
                  <input
                    type="text"
                    placeholder="Authorized signatory"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full rounded-xl border border-[#e4eae0] bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#13382c]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target KYC Diligence Tier
                  </label>
                  <select
                    value={tier}
                    onChange={(e) => setTier(e.target.value as any)}
                    className="w-full rounded-xl border border-[#e4eae0] bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#13382c]"
                  >
                    <option value="tier1">Tier 1 - Retail / Startup (₹10 Lakh daily)</option>
                    <option value="tier2">Tier 2 - Commercial Corporate (₹2 Crore daily)</option>
                    <option value="tier3">Tier 3 - Regulated Institutional (₹10 Crore daily)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Deposit Request
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      value={initialDeposit}
                      onChange={(e) => setInitialDeposit(e.target.value)}
                      className="col-span-2 w-full rounded-xl border border-[#e4eae0] bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#13382c]"
                    />
                    <select
                      value={initialCurrency}
                      onChange={(e) => setInitialCurrency(e.target.value as Currency)}
                      className="w-full rounded-xl border border-[#e4eae0] bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#13382c]"
                    >
                      <option value="INR">INR (₹)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Due Diligence Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes regarding corporate structure, beneficial ownership, regulatory licenses..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-[#e4eae0] bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#13382c]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e4eae0]">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="rounded-xl border border-[#e4eae0] bg-[#f9faf8] px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#13382c] hover:bg-[#1a4a3a] px-4 py-2 text-xs font-semibold text-white transition cursor-pointer shadow-xs"
                >
                  Submit for Compliance Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
