# 🧪 Vaultora Testing & Verification Guide (`docs/TESTING.md`)

> **Classification:** Automated Test Suite & Manual End-to-End Verification Procedures  
> **Test Framework:** Node.js native test runner (`node:test`, `node:assert/strict`) with TypeScript compilation via `tsx`

---

## 1. Automated Test Suite

Vaultora includes a test suite covering canonical cryptographic primitives, double-entry arithmetic invariants, Merkle inclusion proof algorithms, and five adversarial penetration attack simulations.

### 1.1 Test Execution Command

Run the automated test runner directly from the project root:
```bash
npm test
```
*(Equivalent to: `npx tsx --test src/utils/ledger.test.ts src/utils/security.test.ts`)*

### 1.2 Verified Test Suite Output

```text
✔ sha256Sync produces correct canonical hashes (1.5772ms)
✔ validateDoubleEntryLegs enforces debit equals credit (0.1923ms)
✔ Merkle Tree builds valid roots and verifies inclusion proofs (1.9518ms)
✔ verifyLedgerIntegrity audits clean chain and catches tampered blocks (2.9362ms)
✔ [ATTACK 1] Unbalanced Money Creation Attempt (0.6353ms)
✔ [ATTACK 2] Settle Block Modification / Bit-Rot Tampering (3.3645ms)
✔ [ATTACK 3] Hash-Chain Continuity Disruption (Forged prevHash) (0.3991ms)
✔ [ATTACK 4] Merkle Inclusion Proof Forgery (1.0417ms)
✔ [ATTACK 5] Privilege Escalation & Dual-Approval Policy Bypassing (0.6666ms)

ℹ tests 9
ℹ suites 0
ℹ pass 9
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 409.1993
```

### 1.3 Detailed Automated Test Descriptions

1. **`sha256Sync produces correct canonical hashes`:**
   - Validates that `src/utils/crypto.ts` produces identical hashes to NIST standard test vectors for empty strings, ASCII strings, and structured JSON objects.
2. **`validateDoubleEntryLegs enforces debit equals credit`:**
   - Tests that transfers with balanced legs pass, while any transaction with unbalanced debits and credits ($\sum \text{Debit} \ne \sum \text{Credit}$) is rejected.
3. **`Merkle Tree builds valid roots and verifies inclusion proofs`:**
   - Constructs balanced binary Merkle trees according to RFC 6962, extracts cryptographic audit paths, and verifies that invalid sibling proofs are rejected.
4. **`verifyLedgerIntegrity audits clean chain and catches tampered blocks`:**
   - Audits a multi-block sequence from genesis hash (`0000...0000`) through multiple settled epochs, verifying 100% hash chain continuity.
5. **`[ATTACK 1] Unbalanced Money Creation Attempt`:**
   - Adversary injects a fabricated transfer credit (+₹10,00,000) with no balancing debit leg. Validator detects invariant failure and halts execution.
6. **`[ATTACK 2] Settle Block Modification / Bit-Rot Tampering`:**
   - Simulates an attacker altering a settled historical transaction amount from ₹10,000 to ₹10,00,000. Hash-chain recomputation immediately catches the discrepancy and flags the exact modified block index.
7. **`[ATTACK 3] Hash-Chain Continuity Disruption (Forged prevHash)`:**
   - Attacker attempts inserting an orphan block with a forged `prevHash`. The chain verification engine detects the broken link.
8. **`[ATTACK 4] Merkle Inclusion Proof Forgery`:**
   - Attacker presents an altered entry hash with a valid proof path. Tree validation fails cryptographic root matching.
9. **`[ATTACK 5] Privilege Escalation & Dual-Approval Policy Bypassing`:**
   - Simulates a non-admin client attempting to approve transactions exceeding the ₹50,000 institutional threshold or modify compliance limits. RBAC engine rejects unauthorized mutations.

---

## 2. Static Analysis & Build Verification

### 2.1 TypeScript Type Checking
Verifies zero compilation errors and strict type safety across all frontend and backend modules:
```bash
npx tsc --noEmit
# Expected output: (exits with code 0, 0 errors)
```

### 2.2 Production Vite Build
Tests production tree-shaking, minification, and asset generation:
```bash
npm run build
# Expected output:
# ✓ 1677 modules transformed.
# ✓ built in ~930ms
```

---

## 3. Manual Testing & Verification Workflows

The following manual test flows have been verified:

### Flow 1: Out-of-Band Two-Factor Sign-In
1. Navigate to `http://localhost:3000`.
2. Input registered email (`sanandprasad23@gmail.com`) and click **"Send 6-Digit Verification OTP"**.
3. **Verification Points:**
   - Confirm **NO code** or auto-fill button appears on the screen.
   - Confirm personal inbox receives the 6-digit OTP code via SMTP.
   - Confirm server logs print the SecOps surveillance alert dispatch.
4. Enter the 6-digit OTP and click **"Verify & Reveal Vault Pattern"**.
5. **Verification Points:**
   - Confirm a second email arrives in your inbox containing the dynamic pattern sequence (e.g. `Dot 1 → Dot 2 → Dot 6 → Dot 3`) and embedded SVG grid diagram.
   - Confirm the on-screen UI shows **ONLY** the 3×3 interactive drawing pad and countdown timer.
6. Trace the matching sequence on the 3×3 SVG pad.
7. **Verification Point:** Pad turns emerald green and redirects to the Vaultora Overview Dashboard.

### Flow 2: Unregistered User Denial & Admin Surveillance
1. On the login screen, enter an unregistered email (e.g., `unregistered.test@gmail.com`).
2. Click **"Send 6-Digit Verification OTP"**.
3. **Verification Points:**
   - Screen displays an error notice: *"This email is not registered with Vaultora. Please register an account first."*
   - Server strictly blocks OTP generation.
   - Administrator email (`sanandprasad23@gmail.com`) immediately receives a SecOps breach alert detailing the unauthorized access attempt.

### Flow 3: Institutional Dual-Authorization Movement
1. Navigate to the **Statements / Money Movement** tab.
2. Select a source checking account and target treasury account.
3. **Sub-case A (Below Threshold):**
   - Enter amount `₹10,000` and submit.
   - Confirm instant settlement into the current Merkle epoch with invariant $\Delta = ₹0.0000$.
4. **Sub-case B (Above Threshold):**
   - Enter amount `₹1,00,000` (exceeds ₹50,000 policy threshold) and submit.
   - Confirm transaction enters the **Pending Dual-Authorization Queue** with status `PENDING_APPROVAL`.
   - Log in as Admin/Compliance to sign off and seal the block into the ledger.

### Flow 4: Interactive Tamper Simulation Lab
1. Navigate to the **Provable Ledger** tab.
2. Observe the current ledger integrity badge: `100% MATHEMATICALLY VALID`.
3. In the Tamper Simulation box, click **"Simulate Tamper"** to mutate a historical block amount.
4. **Verification Points:**
   - Ledger integrity badge immediately switches to `TAMPER DETECTED / ANOMALY FLAGGED`.
   - The UI pinpoints the exact tampered block index and explains the hash mismatch.
   - Click **"Restore Clean Ledger"** to rollback to the cryptographically verified baseline state.
