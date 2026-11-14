# 🏛️ Vaultora Architecture Documentation (`docs/ARCHITECTURE.md`)

> **Platform:** Vaultora — Institutional Financial Ledger & Treasury Platform  
> **Classification:** Technical Architecture, Request Lifecycle & System Decomposition  
> **Compliance Standards:** RFC 6234 (SHA-256), RFC 6962 (Certificate Transparency / Merkle Tree Auditing), NIST SP 800-63B (AAL2 Multi-Factor Authentication)

---

## 1. High-Level System Overview

Vaultora is engineered as an institutional-grade, zero-trust financial ledger and treasury platform. It decouples interface interactions from immutable cryptographic verification, guaranteeing mathematical double-entry equilibrium, tamper detection, and strict out-of-band credential delivery.

```
+---------------------------------------------------------------------------------------+
|                                    PRESENTATION TIER                                  |
|   React 19 / TypeScript / Vite / Tailwind CSS                                          |
|   Modular Domain Views:                                                               |
|   - Overview Dashboard       - Account Management       - Money Movement Hub          |
|   - Provable Ledger Audit    - User Directory           - Client Onboarding           |
|   - 2-Factor Pattern Pad (Interactive 3x3 SVG Gesture Tracing)                        |
+---------------------------------------------------------------------------------------+
                                           |
                                [HTTPS / JSON REST API]
                                [SameSite Cookies & CSRF]
                                           v
+---------------------------------------------------------------------------------------+
|                                     SERVICES TIER                                     |
|   Express.js / Node.js Runtime (Local Standalone & Vercel Serverless Function)        |
|   - Security Perimeter: Helmet, CORS, Rate Limiting (express-rate-limit)              |
|   - Authentication Engine: Email OTP Dispatch, Procedural Pattern Walk Generator      |
|   - SMTP Out-of-Band Delivery: Nodemailer (Gmail App Password & TLS Transporter)      |
|   - SecOps Surveillance Hub: Real-time Admin Telemetry & Instant Breach Alerting      |
+---------------------------------------------------------------------------------------+
                                           |
                    +----------------------+----------------------+
                    v                                             v
+---------------------------------------+   +-------------------------------------------+
|           DATA & LEDGER TIER          |   |          CRYPTOGRAPHIC VERIFICATION       |
|  - PostgreSQL / SQLite (Prisma ORM)   |   |  - Synchronous Pure RFC 6234 SHA-256 Engine|
|  - Dynamic Verified Local Storage     |   |  - Double-Entry Invariant (Σ Debits=Credits)|
|  - Append-Only Tamper-Evident Logs    |   |  - RFC 6962 Merkle Tree Epoch Roots       |
|  - Role-Based Access Control (RBAC)   |   |  - Mathematical Inclusion Proofs          |
+---------------------------------------+   +-------------------------------------------+
```

---

## 2. Frontend Architecture

### 2.1 Technology Stack
- **Framework:** React 19 with TypeScript 5.4+ (strict type-checking).
- **Bundler & Tooling:** Vite 8.3 with zero external runtime build bloat.
- **Styling & Design System:** Tailwind CSS with a cohesive financial aesthetic:
  - Sage green banners (`#eef1ec`, `#13382c`) representing capital stability.
  - Deep midnight navy (`#070f1c`, `#091322`) for zero-trust authorization views.
  - Crisp typography using JetBrains Mono (monospaced hashes and currency), Newsreader (editorial serif headings), and Plus Jakarta Sans (body UI).
- **Icons & Visuals:** Lucide React for consistent, lightweight vector iconography.

### 2.2 Component Hierarchy & Modularity
The client is structured cleanly into feature modules:
```
src/
├── components/
│   ├── LoginPage.tsx                  # 3-step out-of-band email auth & 3x3 pattern pad
│   ├── RegisterPage.tsx               # Institutional onboarding & verification gate
│   ├── OverviewPage.tsx               # Portfolio summary, quick actions, account overview
│   ├── AccountsManagement.tsx         # Multi-account custody, limits, reserve allocation
│   ├── MoneyMovementHub.tsx           # Atomic transfers, batch disbursements, dual approval
│   ├── LedgerAuditView.tsx            # Blockchain-grade block inspector & tamper lab
│   ├── AdminUsersDirectory.tsx        # RBAC privilege management & compliance review
│   ├── UserOnboarding.tsx             # Institutional KYC verification workflows
│   ├── CryptographicReceiptModal.tsx  # Merkle tree leaf inclusion proof inspector
│   ├── CreateAccountModal.tsx         # Segregated account creation with currency locks
│   ├── OnboardingModal.tsx            # Interactive architectural and role walkthrough
│   └── Sidebar.tsx                    # Role-aware navigation drawer
├── services/
│   └── dynamicStorage.ts              # Self-healing persistent state with migration
├── utils/
│   ├── crypto.ts                      # Synchronous SHA-256 implementation
│   ├── ledger.ts                      # Double-entry validator & hash chain verifier
│   ├── merkle.ts                      # Merkle tree generator & proof evaluator
│   └── rbac.ts                        # Role-based privilege matrix
└── types/
    └── index.ts                       # Single source of truth for all domain entities
```

---

## 3. Backend Architecture & Vercel Serverless Bridge

### 3.1 Server Architecture (`server/index.ts`)
The backend is a Node.js Express server configured for both local daemon execution and serverless edge deployment on Vercel:
- **Security Middlewares:**
  - `helmet`: Protects against clickjacking, MIME sniffing, and cross-site injections.
  - `cors`: Strictly whitelists designated frontend origins (`http://localhost:3000` or production Vercel domains).
  - `express-rate-limit`: Restricts authentication endpoints to 5 requests per 15-minute window per IP to eliminate brute-force and credential-stuffing threats.
- **Out-of-Band Notification Pipeline:**
  - Built on `nodemailer`. Transports SMTP payloads directly to Google's TLS mail servers (`smtp.gmail.com:587`).
  - Terminal fallback: In offline environments where SMTP credentials are omitted, formatted UTF-8 banners output generated codes directly to stdout for verification.
- **Serverless Bridge (`api/index.ts` + `vercel.json`):**
  - Standalone server listener (`app.listen()`) is guarded by `if (!process.env.VERCEL)`.
  - On Vercel, requests to `/api/(.*)` are transparently routed to `api/index.ts`, executing as an AWS Lambda serverless function.

---

## 4. End-to-End Request Lifecycles

### 4.1 Strict Two-Factor Out-of-Band Authentication Flow
```
User Terminal                     Vaultora Server                  Gmail SMTP / Inbox
     |                                   |                                   |
     |--- 1. POST /api/auth/otp/send --->|                                   |
     |    { email: "user@..." }          |--- 2. Validate Registration ----->|
     |                                   |    (Block if unregistered)        |
     |                                   |--- 3. Dispatch 6-digit OTP ------>|
     |                                   |--- 4. Alert Admin (sanandprasad)->|
     |<-- 5. 200 OK (Code Sent) ---------|                                   |
     |                                   |                                   v
     |                                   |                     User checks email: [123456]
     |--- 6. POST /api/auth/otp/verify ->|                                   |
     |    { email, otp: "123456" }       |--- 7. Generate Dynamic Pattern -->|
     |                                   |    (e.g., Dot 1 -> 2 -> 6 -> 3)   |
     |                                   |--- 8. Dispatch Pattern Email ---->|
     |<-- 9. 200 OK (Pattern Dispatched)-|                                   |
     |                                   |                                   v
     |                                   |                     User checks email: [Pattern SVG]
     |--- 10. Trace Pattern on SVG Pad ->|                                   |
     |    (Validates matching sequence)  |                                   |
     v                                   v                                   v
[Vault Unlocked & Session Initialized]
```

### 4.2 Atomic Money Movement Lifecycle
1. **Initiation:** The user inputs source account, destination account, amount, and memo in `MoneyMovementHub`.
2. **Double-Entry Legs Computation:** The platform generates balancing atomic legs:
   $$\sum \text{Debit Legs} = \sum \text{Credit Legs} = \text{Amount}$$
3. **Policy Gate Evaluation:**
   - If $\text{Amount} < ₹50,000$: Settles immediately into the current Merkle epoch.
   - If $\text{Amount} \ge ₹50,000$: Transaction status is marked `PENDING_APPROVAL` and held in the institutional Dual-Authorization Queue until authorized by a user with `compliance` or `admin` role.
4. **Cryptographic Chaining:**
   - Computes canonical `txDataHash` of normalized transaction attributes.
   - Links to `prevHash` of the latest settled block:
     $$\text{entryHash} = \text{SHA-256}(\text{prevHash} \parallel \text{txDataHash})$$
5. **Merkle Epoch Finalization:**
   - Slices transactions into epoch blocks (10 txs per epoch).
   - Computes balanced binary Merkle tree root (RFC 6962 standard).
   - Generates deterministic audit inclusion paths $O(\log N)$.
6. **Audit Trail Signature:**
   - Generates an immutable, timestamped `AuditLogEntry` carrying `actorId`, `actorRole`, and digital SHA-256 signature.

---

## 5. Role-Based Access Control (RBAC) Matrix

| Permission Capability | Admin | Compliance | Operator | Auditor | Holder (Client) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **View Personal Accounts** | Yes | Yes | Yes | Yes | Yes |
| **Initiate Transfers (< ₹50k)** | Yes | No | Yes | No | Yes |
| **Approve High-Value Moves ($\ge$ ₹50k)** | Yes | Yes | No | No | No |
| **Freeze / Unfreeze Accounts** | Yes | Yes | No | No | No |
| **Adjust Reserve Collateral** | Yes | No | Yes | No | No |
| **Run Merkle & Ledger Verifier** | Yes | Yes | Yes | Yes | Yes |
| **Simulate Ledger Tamper (Lab)** | Yes | No | No | Yes | No |
| **Access User Directory** | Yes | No | No | No | No |
| **Review & Approve KYC Onboarding** | Yes | Yes | No | No | No |
| **Configure System Policy Thresholds**| Yes | No | No | No | No |
