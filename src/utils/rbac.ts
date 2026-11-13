/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Role, UserProfile } from '../types';

export interface RolePermissions {
  canInitiateTransfer: boolean;
  canApproveHighValue: boolean;
  canBatchDisburse: boolean;
  canFreezeAccount: boolean;
  canOnboardUser: boolean;
  canVerifyLedger: boolean;
  canSimulateTamper: boolean;
  canExportAuditProof: boolean;
  canConfigurePolicies: boolean;
  canViewAllAccounts: boolean;
}

export const ROLE_DEFINITIONS: Record<Role, {
  label: string;
  badge: string;
  color: string;
  description: string;
  permissions: RolePermissions;
}> = {
  admin: {
    label: 'SecOps Administrator',
    badge: 'SUPERADMIN',
    color: 'text-violet-400',
    description: 'Full administrative control, dual-approval authorization, policy & user management.',
    permissions: {
      canInitiateTransfer: true,
      canApproveHighValue: true,
      canBatchDisburse: true,
      canFreezeAccount: true,
      canOnboardUser: true,
      canVerifyLedger: true,
      canSimulateTamper: true,
      canExportAuditProof: true,
      canConfigurePolicies: true,
      canViewAllAccounts: true,
    }
  },
  compliance: {
    label: 'Compliance & AML Officer',
    badge: 'COMPLIANCE',
    color: 'text-amber-400',
    description: 'KYC/AML verification, dual-approval on high-value transfers, regulatory account freezing.',
    permissions: {
      canInitiateTransfer: false,
      canApproveHighValue: true,
      canBatchDisburse: false,
      canFreezeAccount: true,
      canOnboardUser: true,
      canVerifyLedger: true,
      canSimulateTamper: false,
      canExportAuditProof: true,
      canConfigurePolicies: false,
      canViewAllAccounts: true,
    }
  },
  operator: {
    label: 'Treasury Operator',
    badge: 'TREASURY',
    color: 'text-emerald-400',
    description: 'Execution of day-to-day liquidity rebalances, payouts, batch disbursements, and reserves.',
    permissions: {
      canInitiateTransfer: true,
      canApproveHighValue: false,
      canBatchDisburse: true,
      canFreezeAccount: false,
      canOnboardUser: false,
      canVerifyLedger: true,
      canSimulateTamper: false,
      canExportAuditProof: true,
      canConfigurePolicies: false,
      canViewAllAccounts: true,
    }
  },
  auditor: {
    label: 'External / Internal Auditor',
    badge: 'AUDITOR',
    color: 'text-cyan-400',
    description: 'Read-only mathematical verification of hash chains, Merkle proofs, and tamper simulation.',
    permissions: {
      canInitiateTransfer: false,
      canApproveHighValue: false,
      canBatchDisburse: false,
      canFreezeAccount: false,
      canOnboardUser: false,
      canVerifyLedger: true,
      canSimulateTamper: true,
      canExportAuditProof: true,
      canConfigurePolicies: false,
      canViewAllAccounts: true,
    }
  },
  holder: {
    label: 'Client Account Holder',
    badge: 'CLIENT',
    color: 'text-blue-400',
    description: 'Customer portal: view allocated accounts, transfer within authorized balance, review receipts.',
    permissions: {
      canInitiateTransfer: true,
      canApproveHighValue: false,
      canBatchDisburse: false,
      canFreezeAccount: false,
      canOnboardUser: false,
      canVerifyLedger: true,
      canSimulateTamper: false,
      canExportAuditProof: true,
      canConfigurePolicies: false,
      canViewAllAccounts: false,
    }
  }
};

export function hasPermission(user: UserProfile, permission: keyof RolePermissions): boolean {
  const roleDef = ROLE_DEFINITIONS[user.role];
  if (!roleDef) return false;
  return roleDef.permissions[permission] ?? false;
}

export function requiresDualApproval(amount: number, threshold: number): boolean {
  return amount >= threshold;
}
