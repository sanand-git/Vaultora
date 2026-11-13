/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  ShieldCheck,
  Binary,
  Layers,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import type { LedgerTransaction, MerkleEpoch, MerkleProof } from '../types';
import { generateMerkleProof, verifyMerkleProof } from '../utils/merkle';

interface CryptographicReceiptModalProps {
  transaction: LedgerTransaction;
  epoch: MerkleEpoch | undefined;
  epochTxs: LedgerTransaction[];
  onClose: () => void;
}

export const CryptographicReceiptModal: React.FC<CryptographicReceiptModalProps> = ({
  transaction,
  epoch,
  epochTxs,
  onClose
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [proofVerified, setProofVerified] = useState<boolean | null>(null);

  const hashes = epochTxs.map(t => t.entryHash);
  const leafIndex = epochTxs.findIndex(t => t.id === transaction.id);

  let merkleProof: MerkleProof | null = null;
  if (leafIndex !== -1 && epoch) {
    try {
      merkleProof = generateMerkleProof(hashes, leafIndex, epoch.epochId);
    } catch {
      merkleProof = null;
    }
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleVerifyProof = () => {
    if (!merkleProof || !epoch) return;
    const ok = verifyMerkleProof(transaction.entryHash, merkleProof.path, epoch.merkleRoot);
    setProofVerified(ok);
  };

  const downloadReceiptJson = () => {
    const payload = {
      spec: 'Vaultora-Cryptographic-Receipt-v2.6',
      verifiedAt: new Date().toISOString(),
      transaction: {
        id: transaction.id,
        txIndex: transaction.txIndex,
        timestamp: transaction.timestamp,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        initiator: {
          id: transaction.initiatorId,
          name: transaction.initiatorName,
          role: transaction.initiatorRole
        },
        approver: transaction.approverId ? {
          id: transaction.approverId,
          name: transaction.approverName,
          role: transaction.approverRole,
          timestamp: transaction.approvalTimestamp
        } : null,
        memo: transaction.memo,
        legs: transaction.legs
      },
      cryptographicProof: {
        prevHash: transaction.prevHash,
        txDataHash: transaction.txDataHash,
        entryHash: transaction.entryHash,
        epochId: transaction.epochId,
        merkleRoot: epoch?.merkleRoot || '',
        merkleProofPath: merkleProof?.path || []
      }
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${transaction.id}-${transaction.entryHash.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto font-sans">
      <div className="relative w-full max-w-3xl rounded-2xl border border-[#e4eae0] bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#e4eae0] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#13382c]/10 text-[#13382c]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-serif text-[#13382c]">Cryptographic Transaction Receipt</h3>
                <span className="text-xs font-mono text-slate-500 font-semibold">
                  #{transaction.txIndex.toString().padStart(4, '0')}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Immutable SHA-256 Ledger Block & Merkle Inclusion Proof
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
            aria-label="Close receipt modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="mt-5 space-y-5 text-xs">
          {/* Summary Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-[#f9faf8] border border-[#e4eae0]">
            <div>
              <div className="text-slate-500 font-mono text-[11px]">TRANSACTION TYPE</div>
              <div className="font-semibold text-slate-900 mt-0.5">{transaction.type}</div>
            </div>
            <div>
              <div className="text-slate-500 font-mono text-[11px]">SETTLED AMOUNT</div>
              <div className="font-mono font-bold text-[#13382c] mt-0.5">
                ₹{transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} INR
              </div>
            </div>
            <div>
              <div className="text-slate-500 font-mono text-[11px]">EPOCH BLOCK</div>
              <div className="font-mono text-slate-700 mt-0.5">Epoch #{transaction.epochId}</div>
            </div>
            <div>
              <div className="text-slate-500 font-mono text-[11px]">SETTLEMENT STATUS</div>
              <div className="font-mono text-emerald-700 mt-0.5 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>{transaction.status}</span>
              </div>
            </div>
          </div>

          {/* Cryptographic Hash Chain Cards */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 font-sans">
              <Binary className="h-3.5 w-3.5 text-[#13382c]" />
              <span>Cryptographic Hash Linkages</span>
            </h4>

            {/* Previous Hash */}
            <div className="p-3 rounded-xl bg-[#f9faf8] border border-[#e4eae0]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500">Previous Block Hash (prevHash)</span>
                <button
                  onClick={() => copyToClipboard(transaction.prevHash, 'prevHash')}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-[#13382c] transition cursor-pointer"
                >
                  {copiedKey === 'prevHash' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  <span>Copy</span>
                </button>
              </div>
              <div className="mt-1 font-mono text-[11px] text-slate-800 break-all select-all bg-white p-2 rounded-lg border border-[#e4eae0]">
                {transaction.prevHash}
              </div>
            </div>

            {/* Current Transaction Data Hash */}
            <div className="p-3 rounded-xl bg-[#f9faf8] border border-[#e4eae0]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500">Canonical Payload Hash (txDataHash)</span>
                <button
                  onClick={() => copyToClipboard(transaction.txDataHash, 'txDataHash')}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-[#13382c] transition cursor-pointer"
                >
                  {copiedKey === 'txDataHash' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  <span>Copy</span>
                </button>
              </div>
              <div className="mt-1 font-mono text-[11px] text-slate-800 break-all select-all bg-white p-2 rounded-lg border border-[#e4eae0]">
                {transaction.txDataHash}
              </div>
            </div>

            {/* Chained Entry Hash */}
            <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-emerald-800 flex items-center gap-1.5 font-bold">
                  <span>Block Entry Hash = SHA256(prevHash + txDataHash)</span>
                </span>
                <button
                  onClick={() => copyToClipboard(transaction.entryHash, 'entryHash')}
                  className="flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-900 transition cursor-pointer"
                >
                  {copiedKey === 'entryHash' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  <span>Copy</span>
                </button>
              </div>
              <div className="mt-1 font-mono text-[11px] text-emerald-950 font-bold break-all select-all bg-white p-2 rounded-lg border border-emerald-200">
                {transaction.entryHash}
              </div>
            </div>
          </div>

          {/* Double-Entry Legs Breakdown */}
          <div>
            <h4 className="text-xs font-semibold text-slate-800 mb-2 flex items-center gap-1.5 font-sans">
              <Layers className="h-3.5 w-3.5 text-[#13382c]" />
              <span>Balanced Double-Entry Bookkeeping Legs</span>
            </h4>
            <div className="overflow-x-auto rounded-xl border border-[#e4eae0]">
              <table className="w-full text-left font-mono">
                <thead className="bg-[#f9faf8] text-slate-500 text-[11px] border-b border-[#e4eae0]">
                  <tr>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Account Name</th>
                    <th className="py-2.5 px-3">Memo</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e4eae0] text-slate-700">
                  {transaction.legs.map((leg, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3">
                        <span className={leg.type === 'DEBIT' ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                          {leg.type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-900">{leg.accountName}</td>
                      <td className="py-2 px-3 text-slate-500 text-[11px]">{leg.memo}</td>
                      <td className="py-2 px-3 text-right font-medium">
                        {leg.type === 'DEBIT' ? '+' : '-'}₹{leg.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Merkle Proof Section */}
          {merkleProof && epoch && (
            <div className="p-4 rounded-xl bg-[#f9faf8] border border-[#e4eae0] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-slate-800 font-sans">Merkle Inclusion Proof</h4>
                  <p className="text-[11px] text-slate-500">
                    Proves this entry&apos;s existence in Epoch #{epoch.epochId} root without full ledger scanning.
                  </p>
                </div>
                <button
                  onClick={handleVerifyProof}
                  className="flex items-center gap-1.5 rounded-xl bg-[#13382c] px-3 py-1.5 font-mono text-[11px] text-white hover:bg-[#1a4a3a] transition cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Verify Inclusion Math</span>
                </button>
              </div>

              {proofVerified !== null && (
                <div className={`p-3 rounded-xl border text-[11px] font-mono flex items-center gap-2 ${
                  proofVerified
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    {proofVerified
                      ? 'MATHEMATICAL PROOF VERIFIED: Cascaded sibling hash traversal perfectly matches finalized Merkle Root.'
                      : 'VERIFICATION FAILED: Sibling hash path does not reconstruct the expected Merkle Root.'}
                  </span>
                </div>
              )}

              {/* Sibling Steps list */}
              <div className="space-y-1.5 font-mono text-[10px]">
                <div className="text-slate-500">Proof Steps ({merkleProof.path.length} sibling hops):</div>
                {merkleProof.path.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-[#e4eae0] text-slate-700">
                    <span className="text-slate-400">Step {idx + 1}:</span>
                    <span className="text-[#13382c] uppercase font-semibold">[{step.position}]</span>
                    <span className="truncate flex-1 text-slate-500">{step.hash}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-1 text-slate-800">
                  <ArrowRight className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-slate-500">Yields Merkle Root:</span>
                  <span className="text-[#13382c] font-semibold truncate">{epoch.merkleRoot}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-between border-t border-[#e4eae0] pt-4">
          <button
            onClick={downloadReceiptJson}
            className="flex items-center gap-2 rounded-xl border border-[#e4eae0] bg-[#f9faf8] px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <Download className="h-4 w-4 text-[#13382c]" />
            <span>Download Cryptographic Receipt (.json)</span>
          </button>
          <button
            onClick={onClose}
            className="rounded-xl bg-[#13382c] hover:bg-[#1a4a3a] px-4 py-2 text-xs font-medium text-white transition cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
