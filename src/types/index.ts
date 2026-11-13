/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'admin' | 'compliance' | 'operator' | 'auditor' | 'holder';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string;
  avatarBg: string;
  entityType: 'individual' | 'institutional';
  kycStatus: 'verified' | 'pending' | 'review_required';
  kycTier: 'tier1' | 'tier2' | 'tier3';
  limitConfig: {
    dailyMax: number;
    dualApprovalThreshold: number;
  };
  allowedAccountIds: string[];
}

export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP';
export type AccountType = 'operating' | 'treasury' | 'escrow' | 'reserve' | 'CHECKING' | 'SAVINGS' | 'INVESTMENT' | 'ESCROW' | 'TREASURY';
export type AccountStatus = 'active' | 'frozen' | 'restricted' | 'ACTIVE' | 'FROZEN';

export interface Account {
  id: string;
  accountNumber: string;
  accountName: string;
  entityName: string;
  currency: Currency;
  type: AccountType;
  status: AccountStatus;
  balance: number;
  reservedBalance: number;
  freezeReason?: string;
  freezeActor?: string;
  freezeTimestamp?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DoubleEntryLeg {
  accountId: string;
  accountName: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  memo: string;
}

export type TransactionType =
  | 'TRANSFER'
  | 'DEPOSIT'
  | 'DISBURSEMENT'
  | 'RESERVE_HOLD'
  | 'RESERVE_RELEASE'
  | 'FEE';

export type TransactionStatus = 'SETTLED' | 'PENDING_APPROVAL' | 'REJECTED';

export interface LedgerTransaction {
  id: string;
  txIndex: number;
  timestamp: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: Currency;
  legs: DoubleEntryLeg[];
  initiatorId: string;
  initiatorName: string;
  initiatorRole: Role;
  approverId?: string;
  approverName?: string;
  approverRole?: Role;
  approvalTimestamp?: string;
  rejectionReason?: string;
  memo: string;
  batchId?: string;
  epochId: number;
  // Cryptographic fields
  prevHash: string;
  txDataHash: string;
  entryHash: string;
}

export interface MerkleEpoch {
  epochId: number;
  timestamp: string;
  txCount: number;
  merkleRoot: string;
  txHashes: string[];
  isFinalized: boolean;
}

export interface MerkleProofStep {
  position: 'left' | 'right';
  hash: string;
}

export interface MerkleProof {
  txHash: string;
  txIndex: number;
  epochId: number;
  merkleRoot: string;
  path: MerkleProofStep[];
  verified: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: Role;
  action: string;
  details: string;
  severity: 'info' | 'warning' | 'critical';
  hashSignature: string;
}

export interface OnboardingApplicant {
  id: string;
  legalName: string;
  entityType: 'individual' | 'institutional';
  registrationNumber: string;
  country: string;
  requestedTier: 'tier1' | 'tier2' | 'tier3';
  contactEmail: string;
  contactPerson: string;
  status: 'pending_review' | 'approved' | 'rejected';
  riskScore: 'LOW' | 'MEDIUM' | 'HIGH';
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
  initialDepositRequested?: number;
  initialCurrency?: Currency;
}

export interface VerificationResult {
  isValid: boolean;
  totalEntriesChecked: number;
  tamperedIndex: number | null;
  tamperedReason?: string;
  doubleEntryBalanced: boolean;
  merkleRootsValid: boolean;
  balancesReconciled: boolean;
  executionTimeMs: number;
  timestamp: string;
  blockEpochsChecked: number;
}
