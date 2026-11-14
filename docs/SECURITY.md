# 🛡️ Vaultora Security & Threat Model (`docs/SECURITY.md`)

> **Document Classification:** Institutional Security Architecture & Adversarial Verification Report  
> **Applicable Specifications:** RFC 6234 (SHA-256), RFC 6962 (Certificate Transparency / Merkle Tree Auditing), NIST SP 800-53 Rev. 5, NIST SP 800-63B (AAL2 Digital Identity), AICPA SOC 2 Type II

---

## 1. Security Architecture & Threat Model

Vaultora is engineered around **zero-trust defense-in-depth**. Every financial transition is committed via atomic double-entry legs, cryptographically chained using SHA-256 blocks, anchored into verifiable Merkle tree epochs, and protected by strict out-of-band two-factor authentication.

```
       +-------------------------------------------------------------+
       |               CLIENT BROWSER / REST CLIENT                  |
       +-------------------------------------------------------------+
                                      |
                     [TLS 1.3 / Strict-Transport-Security]
                     [SameSite=Strict, HttpOnly Cookies]
                     [Double-Submit CSRF Validation]
                                      v
       +-------------------------------------------------------------+
       |           SECURITY & AUTHENTICATION PERIMETER               |
       |  - Strict Content-Security-Policy (CSP) & Frame Deny        |
       |  - Brute-Force Rate Limiter (Max 5 attempts / 60s cooldown) |
       |  - Out-of-Band 2FA (Email OTP + Dynamic Pattern Key via SMTP|
       |  - Zero On-Screen Pattern / Credential Display              |
       |  - Role-Based Access Control (RBAC) Policy Engine           |
       +-------------------------------------------------------------+
                                      |
                     [Role Gated Operations & Dual Approval]
                     [Unregistered Email Denial & Admin Alerting]
                                      v
       +-------------------------------------------------------------+
       |          TRANSACTION & LEDGER INTEGRITY ENGINE              |
       |  - Double-Entry Balance Invariance (Σ Debits = Σ Credits)   |
       |  - Pure RFC 6234 SHA-256 Chaining (prevHash -> entryHash)   |
       |  - RFC 6962 Merkle Tree Epochs & Inclusion Proofs          |
       |  - Automated Zero-Trust Tamper Detection & Auditor Lab      |
       +-------------------------------------------------------------+
```

---

## 2. Threat Analysis Matrix (STRIDE Model)

| Threat Category | Potential Attack Vector | Impact on Platform | Vaultora Mitigation Architecture | Automated Test / Verification Reference |
| :--- | :--- | :--- | :--- | :--- |
| **Spoofing** | • Adversary attempts credential guessing or brute force.<br>• Session fixation or token forgery.<br>• Shoulder-surfing credentials. | Unauthorized access to institutional funds. | • Zero static passwords in browser memory: Out-of-band OTP + dynamic visual pattern dispatched to email.<br>• No on-screen codes or auto-fill buttons.<br>• Interactive 9-node gesture pattern verification with 5-attempt rate-limiting and 60-second security lockout.<br>• Session tokens expire and are bound to IP. | `LoginPage.tsx`<br>`src/utils/security.test.ts` |
| **Tampering** | • Rogue operator attempts altering transaction amounts or memos.<br>• Fabricating balance without matching credit leg.<br>• Modifying historic settled blocks. | Ledger corruption, unauthorized balance inflation. | • Continuous SHA-256 hash chaining: altering any block breaks downstream `entryHash` pointers.<br>• Strict double-entry invariant enforcement ($\sum \text{Debit} - \sum \text{Credit} = 0$).<br>• RFC 6962 Merkle epoch root calculation detects leaf modification. | `src/utils/ledger.ts`<br>`src/utils/merkle.ts`<br>`src/utils/ledger.test.ts`<br>`src/utils/security.test.ts` (Attacks 1, 2, 3) |
| **Repudiation** | • Operator executes a fraudulent transfer and denies action.<br>• Compliance officer denies approving an applicant. | Lack of legal accountability, audit failure. | • Every state change generates an immutable `AuditLogEntry` carrying `actorId`, `actorRole`, `timestamp`, and SHA-256 `hashSignature`.<br>• Cryptographic receipts exportable as auditable JSON with Merkle paths. | `AuditLogsView.tsx`<br>`CryptographicReceiptModal.tsx`<br>`src/utils/ledger.test.ts` |
| **Information Disclosure** | • Intercepting communications or sniffing reserve balances.<br>• XSS extracting session data.<br>• Unregistered user enumeration. | Exposure of institutional counterparties and liquidity reserves. | • `HttpOnly`, `SameSite=Strict`, `Secure` cookies.<br>• Strict CSP headers blocking unauthorized inline scripts and external data exfiltration.<br>• Unregistered emails are blocked from receiving OTPs, and attempts trigger instant admin alerts to `sanandprasad23@gmail.com`. | `vite.config.ts`<br>`server/index.ts`<br>`LoginPage.tsx` |
| **Denial of Service** | • Flooding API endpoints with concurrent transfer requests.<br>• Memory exhaustion attacks. | Service downtime, delayed settlement. | • Rate-limiting middleware (`express-rate-limit`): 100 req/15 min global, 5 req/15 min auth.<br>• Request body size limits (500kb max). | `server/index.ts`<br>`LoginPage.tsx` |
| **Elevation of Privilege** | • Client holder attempting to execute dual-approval on high-value transfers or unfreezing sanctioned accounts. | Unauthorized execution of restricted operations. | • RBAC matrix checked at controller and state level.<br>• Transfers $\ge ₹50,000$ automatically queued into `PENDING_APPROVAL` status requiring secondary signoff from `compliance` or `admin`. | `src/utils/rbac.ts`<br>`MoneyMovementHub.tsx`<br>`src/utils/security.test.ts` (Attack 5) |

---

## 3. Implemented Security Controls

### 3.1 Strict Out-of-Band Two-Factor Authentication
- **Zero On-Screen Credential Leakage:** Neither the 6-digit OTP nor the dynamic 3×3 pattern key is ever displayed on screen or provided via auto-fill buttons.
- **Two-Stage Verification:** 
  1. The user inputs their email address. If registered, a 6-digit code is dispatched via SMTP.
  2. Upon code verification, the server dynamically generates a procedural pattern walk and emails an SVG diagram to the user.
  3. The user reads the sequence from their inbox and traces it on the interactive SVG pad.

### 3.2 Password Handling & Cryptographic Standards
- User master passphrases are hashed using **Bcrypt with a salt cost factor of 12** (`bcryptjs`). Plaintext passwords are never persisted to disk or emitted in logs.
- All ledger hashing uses a synchronous, zero-dependency, pure JavaScript implementation of **RFC 6234 SHA-256** (`src/utils/crypto.ts`), preventing race conditions and guarantee deterministic execution across Node.js and browser runtimes.

### 3.3 Role-Based Access Control (RBAC) & Principle of Least Privilege
- Non-admin users are strictly prevented from viewing or switching to other users' profiles.
- Top navigation header avatar dropdown displays **only the logged-in user's active session profile**.
- Administrative management of users and onboarding is quarantined to the dedicated **User Directory** tab, accessible exclusively to the `admin` role.

### 3.4 Append-Only Audit Logging
Every platform event creates an immutable log entry with:
- Unique UUID identifier.
- ISO 8601 UTC timestamp.
- Actor ID, Name, and Role.
- Event classification and detailed metadata.
- SHA-256 digital signature:
  $$\text{hashSignature} = \text{SHA-256}(\text{id} \parallel \text{timestamp} \parallel \text{actorId} \parallel \text{action})$$

---

## 4. Remaining Risks & Roadmap Mitigations

1. **Hardware Security Modules (HSM):** Currently, cryptographic signatures are calculated using software-defined SHA-256 keys. Production deployment will integrate AWS KMS or CloudHSM for hardware-anchored key signing.
2. **Biometric WebAuthn / FIDO2:** While out-of-band email OTP and pattern tracing eliminate password reuse, integrating WebAuthn biometric passkeys (YubiKey / TouchID) is scheduled for Tier-3 institutional diligence compliance.
3. **Multi-Region Distributed Database:** The current deployment utilizes local SQLite / in-memory synchronized state for testing. Production scaling requires migration to an active-active PostgreSQL cluster with distributed transaction locks.
