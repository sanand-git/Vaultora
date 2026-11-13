/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Vaultora Institutional Database...');

  try {
    const salt = await bcrypt.genSalt(12);

    // 1. Superadmin Persona
    const adminPasswordHash = await bcrypt.hash('Admin#Vault2026!Sec', salt);
    const adminUser = await prisma.user.upsert({
      where: { email: 'alex.rivera@balancevault.corp' },
      update: {
        role: 'admin',
        title: 'Chief Information Security Officer',
        kycStatus: 'verified',
        kycTier: 'tier3',
        dualApprovalThreshold: 50000,
        dailyMax: 10000000,
        isActive: true,
      },
      create: {
        email: 'alex.rivera@balancevault.corp',
        name: 'Alex Rivera',
        passwordHash: adminPasswordHash,
        role: 'admin',
        title: 'Chief Information Security Officer',
        entityType: 'institutional',
        kycStatus: 'verified',
        kycTier: 'tier3',
        dualApprovalThreshold: 50000,
        dailyMax: 10000000,
        isActive: true,
      },
    });

    // 2. Reference Seed Admin
    const refAdminHash = await bcrypt.hash('Admin@123', salt);
    await prisma.user.upsert({
      where: { email: 'admin@balancevault.com' },
      update: { role: 'admin', isActive: true },
      create: {
        email: 'admin@balancevault.com',
        name: 'System Administrator',
        passwordHash: refAdminHash,
        role: 'admin',
        title: 'Master Treasury Operator',
        entityType: 'institutional',
        kycStatus: 'verified',
        kycTier: 'tier3',
        dualApprovalThreshold: 50000,
        dailyMax: 10000000,
        isActive: true,
      },
    });

    // 3. Auditor Persona
    const auditorHash = await bcrypt.hash('Auditor#Pass2026!', salt);
    await prisma.user.upsert({
      where: { email: 'elena.rostova@balancevault.corp' },
      update: { role: 'auditor', isActive: true },
      create: {
        email: 'elena.rostova@balancevault.corp',
        name: 'Elena Rostova',
        passwordHash: auditorHash,
        role: 'auditor',
        title: 'Independent Compliance Auditor',
        entityType: 'institutional',
        kycStatus: 'verified',
        kycTier: 'tier3',
        dualApprovalThreshold: 25000,
        dailyMax: 1000000,
        isActive: true,
      },
    });

    // 4. Operator Persona
    const operatorHash = await bcrypt.hash('Operator#Pass2026!', salt);
    await prisma.user.upsert({
      where: { email: 'marcus.vance@balancevault.corp' },
      update: { role: 'operator', isActive: true },
      create: {
        email: 'marcus.vance@balancevault.corp',
        name: 'Marcus Vance',
        passwordHash: operatorHash,
        role: 'operator',
        title: 'Head of Treasury Operations',
        entityType: 'institutional',
        kycStatus: 'verified',
        kycTier: 'tier2',
        dualApprovalThreshold: 50000,
        dailyMax: 5000000,
        isActive: true,
      },
    });

    // 5. Account Holder / Demo User
    const userHash = await bcrypt.hash('User@123', salt);
    await prisma.user.upsert({
      where: { email: 'user@balancevault.com' },
      update: { role: 'holder', isActive: true },
      create: {
        email: 'user@balancevault.com',
        name: 'Sarah Chen',
        passwordHash: userHash,
        role: 'holder',
        title: 'Principal Treasury Client',
        entityType: 'institutional',
        kycStatus: 'verified',
        kycTier: 'tier2',
        dualApprovalThreshold: 50000,
        dailyMax: 2000000,
        isActive: true,
      },
    });

    // 6. Record Bootstrap Audit Log
    const sigPayload = `GENESIS_BOOTSTRAP_${adminUser.id}_${Date.now()}`;
    const hashSignature = crypto.createHash('sha256').update(sigPayload).digest('hex');

    await prisma.auditLog.create({
      data: {
        actorId: adminUser.id,
        actorEmail: adminUser.email,
        actorRole: adminUser.role,
        action: 'SYSTEM_BOOTSTRAP_COMPLETE',
        resource: 'DATABASE_GENESIS',
        details: 'Initial administrator identities and zero-drift cryptographic ledger initialized.',
        ipAddress: '127.0.0.1',
        userAgent: 'BalanceVault-Bootstrap/1.0',
        severity: 'info',
        hashSignature,
      },
    });

    console.log('✅ BalanceVault Seed Completed Successfully:');
    console.log('   - Admin: alex.rivera@balancevault.corp (Admin#Vault2026!Sec)');
    console.log('   - Admin: admin@balancevault.com (Admin@123)');
    console.log('   - User:  user@balancevault.com (User@123)');
    console.log('   - Auditor: elena.rostova@balancevault.corp');
  } catch (err: any) {
    // Check for PostgreSQL SQLSTATE 42501 (insufficient privilege) or Prisma P2010
    if (err?.code === '42501' || err?.code === 'P2010') {
      console.warn('⚠️ SQLSTATE 42501 detected (cloud database role permission limitation). Handled gracefully.');
    } else {
      console.error('❌ Seeding encountered an error:', err);
      throw err;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

