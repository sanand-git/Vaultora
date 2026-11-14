# 🗄️ Vaultora Database Schema & Storage Model (`docs/DATABASE.md`)

> **ORM:** Prisma 5.14+ / 6.x  
> **Dialect:** PostgreSQL (Production) / SQLite (`dev.db` for local zero-dependency testing)  
> **Schema File:** `prisma/schema.prisma`

---

## 1. Relational Database Design Overview

The Vaultora database architecture is designed to enforce strict referential integrity, immutable audit persistence, role-based governance, and session fixation defense.

```
       +---------------------------------------------+
       |                   User                      |
       +---------------------------------------------+
       | id (PK)                                     |
       | email (UNIQUE)                              |
       | passwordHash                                |
       | role (admin, compliance, operator, ...)     |
       | dailyMax                                    |
       | dualApprovalThreshold                       |
       +---------------------------------------------+
              | 1                             | 1
              |                               |
              | *                             | *
              v                               v
+-------------------------------+   +-------------------------------+
|            Session            |   |           AuditLog            |
+-------------------------------+   +-------------------------------+
| id (PK)                       |   | id (PK)                       |
| userId (FK -> User.id)        |   | actorId (FK -> User.id)       |
| tokenHash (UNIQUE)            |   | actorEmail                    |
| ipAddress                     |   | actorRole                     |
| expiresAt                     |   | action                        |
+-------------------------------+   | details                       |
                                    | hashSignature (SHA-256)       |
                                    +-------------------------------+
```

---

## 2. Table Definitions & Constraints

### 2.1 `User` Table
Stores registered platform users, security thresholds, and credential hashes.

| Column | Type | Constraints / Defaults | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id`, `@default(uuid())` | Primary key UUID |
| `email` | `String` | `@unique`, indexed | Canonical email address |
| `passwordHash`| `String` | Not Null | Bcrypt hash (work factor 12) |
| `name` | `String` | Not Null | Legal entity or account holder name |
| `role` | `String` | `@default("holder")` | `admin`, `compliance`, `operator`, `auditor`, `holder` |
| `title` | `String` | `@default("")` | Professional institutional title |
| `entityType` | `String` | `@default("individual")`| `individual` or `institutional` |
| `kycStatus` | `String` | `@default("pending")` | `verified`, `pending`, `review_required` |
| `kycTier` | `String` | `@default("tier1")` | Diligence classification (`tier1`, `tier2`, `tier3`) |
| `dailyMax` | `Float` | `@default(500000)` | Maximum 24h cumulative transfer volume in INR |
| `dualApprovalThreshold`| `Float`| `@default(50000)`| Threshold triggering dual-authorization in INR |
| `failedLoginAttempts` | `Int` | `@default(0)` | Counter for rate limiting and lockouts |
| `lockedUntil`| `DateTime?`| Nullable | Timestamp until account lockout expires |
| `isActive` | `Boolean` | `@default(true)` | Active status flag |
| `createdAt` | `DateTime` | `@default(now())` | Account provisioning timestamp |
| `updatedAt` | `DateTime` | `@updatedAt` | Automatic mutation timestamp |

### 2.2 `Session` Table
Stores active authenticated sessions bound to network origin metadata.

| Column | Type | Constraints / Defaults | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id`, `@default(uuid())` | Session identifier UUID |
| `userId` | `String` | `@relation(fields: [userId], references: [User.id], onDelete: Cascade)` | Foreign key to `User` |
| `tokenHash` | `String` | `@unique`, indexed | SHA-256 hash of the session secret |
| `ipAddress` | `String` | Not Null | Originating client IP address |
| `userAgent` | `String` | `@default("")` | Client browser fingerprint |
| `expiresAt` | `DateTime` | Indexed | Hard session expiration boundary |
| `createdAt` | `DateTime` | `@default(now())` | Session initialization timestamp |

### 2.3 `AuditLog` Table
An append-only, tamper-evident log of all administrative and financial events.

| Column | Type | Constraints / Defaults | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id`, `@default(uuid())` | Audit record primary key |
| `timestamp` | `DateTime` | `@default(now())`, indexed | Precise event timestamp (UTC) |
| `actorId` | `String?` | `@relation(fields: [actorId], references: [User.id], onDelete: SetNull)` | User executing the action |
| `actorEmail`| `String` | Not Null | Email snapshot at event execution |
| `actorRole` | `String` | Not Null | RBAC role snapshot |
| `action` | `String` | Indexed | Event verb (`TRANSFER_SETTLED`, `ACCOUNT_FROZEN`, etc.) |
| `resource` | `String` | `@default("")` | Target resource identifier |
| `details` | `String` | Not Null | Human-readable audit narrative |
| `severity` | `String` | `@default("info")`, indexed | Event severity (`info`, `warning`, `critical`) |
| `hashSignature`| `String` | Not Null | Synchronous SHA-256 signature for non-repudiation |

### 2.4 `CsrfToken` Table
Server-side double-submit CSRF prevention store.

| Column | Type | Constraints / Defaults | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id`, `@default(uuid())` | Primary key |
| `token` | `String` | `@unique`, indexed | Cryptographic CSRF random token |
| `sessionId` | `String` | Indexed | Association to client session |
| `expiresAt` | `DateTime` | Indexed | Expiration boundary |

---

## 3. Dynamic Cryptographic Ledger Entities (`src/types/index.ts`)

In addition to relational user governance, the core ledger engine models money movements using double-entry graph entities:

### 3.1 `Account`
- Segregated account containers designated as `treasury`, `operating`, `escrow`, or `reserve`.
- Locked strictly to Indian Rupees (`currency: 'INR'`).
- Enforces reserve margin balances:
  $$\text{Available Funds} = \text{Balance} - \text{Reserved Balance}$$

### 3.2 `LedgerTransaction` & `DoubleEntryLeg`
- Atomic multi-leg settlement container.
- Debits credit target accounts, credits debit source accounts.
- Chained with `prevHash` and `entryHash`:
  $$\text{entryHash} = \text{SHA-256}(\text{prevHash} \parallel \text{txDataHash})$$

### 3.3 `MerkleEpoch`
- Groups settled transactions into epochs (10 txs / epoch).
- Stores the balanced binary tree root hash (`merkleRoot`) and leaf list (`txHashes`).
- Enables $O(\log N)$ inclusion verification without scanning full ledger history.

---

## 4. Database Setup, Migrations & Seeding Commands

### Initialize Schema & Migrations:
```bash
# Generate Prisma Client
npm run db:generate

# Apply migrations to database
npm run db:push
```

### Seed Initial Institutional Accounts & Personas:
```bash
npm run db:seed
```
*(Executes `prisma/seed.ts` to provision baseline superadmin `admin@vaultora.corp`, pre-configured treasury vaults, and genesis audit logs).*
