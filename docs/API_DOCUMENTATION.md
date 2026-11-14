# 📡 Vaultora API Documentation (`docs/API_DOCUMENTATION.md`)

> **Base URL:** `http://localhost:3001` (Local) / `/api` (Production Vercel)  
> **Protocol:** REST over HTTPS  
> **Payload Format:** `application/json`  
> **Authentication:** Cookie-based session token / Out-of-band email OTP verification

---

## 1. System Health & Readiness Endpoints

### 1.1 Service Health Check
- **Endpoint:** `GET /api/health`
- **Authentication:** Public
- **Description:** Returns the active health, version, uptime, and server timestamp.
- **Success Response (200 OK):**
```json
{
  "status": "ok",
  "service": "Vaultora Security & Treasury API",
  "version": "2.6.0",
  "uptime": 142.85,
  "timestamp": "2026-11-14T05:30:00.000Z"
}
```

### 1.2 Database Readiness Probe
- **Endpoint:** `GET /api/ready`
- **Authentication:** Public
- **Description:** Verifies database connectivity by executing a lightweight probe (`SELECT 1`).
- **Success Response (200 OK):**
```json
{
  "status": "ready",
  "database": "connected",
  "timestamp": "2026-11-14T05:30:00.000Z"
}
```
- **Error Response (503 Service Unavailable):**
```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "error": "Connection timeout"
}
```

---

## 2. Authentication & 2-Factor Verification Endpoints

### 2.1 Request Email Verification OTP
- **Endpoint:** `POST /api/auth/otp/send`
- **Rate Limit:** 5 requests per 15 minutes per IP
- **Description:** Sends a 6-digit cryptographic OTP to the user's personal email via SMTP. Unregistered emails are blocked from receiving OTPs to prevent enumeration and spam, and trigger a SecOps alert to the administrator.
- **Request Body:**
```json
{
  "email": "sanandprasad23@gmail.com",
  "purpose": "login"
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Verification code sent to sanandprasad23@gmail.com",
  "email": "sanandprasad23@gmail.com",
  "liveDelivered": true,
  "expiresIn": 300
}
```
- **Unregistered Email Response (403 Forbidden):**
```json
{
  "success": false,
  "error": "This email \"unregistered@example.com\" is not registered with Vaultora. Please register an account first."
}
```

### 2.2 Verify OTP & Dispatch Dynamic Vault Pattern
- **Endpoint:** `POST /api/auth/otp/verify`
- **Description:** Validates the 6-digit OTP code against the server cache. Upon success, immediately generates a dynamic 3×3 procedural pattern key and dispatches it in a **second email** containing an embedded SVG diagram.
- **Request Body:**
```json
{
  "email": "sanandprasad23@gmail.com",
  "otp": "501867"
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "verified": true,
  "message": "Email OTP verified. Authorized pattern dispatched to email.",
  "recipient": "sanandprasad23@gmail.com",
  "pattern": {
    "challengeId": "PTN-MW581Z-402",
    "sequence": [0, 1, 5, 2],
    "dotNumbers": [1, 2, 6, 3],
    "description": "Dynamic 4-point procedural sequence",
    "createdAt": 1794560000000
  }
}
```
- **Invalid OTP Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Invalid verification code. Please check your personal mail."
}
```

### 2.3 Resend Dynamic Pattern Key
- **Endpoint:** `POST /api/auth/pattern/dispatch`
- **Rate Limit:** 60-second cooldown per email
- **Description:** Dispatches a refreshed dynamic 3×3 pattern sequence and visual SVG diagram to the user's email if their token expires or needs rotation.
- **Request Body:**
```json
{
  "email": "sanandprasad23@gmail.com"
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Dynamic pattern dispatched to sanandprasad23@gmail.com",
  "pattern": {
    "challengeId": "PTN-REFRESH-812",
    "sequence": [3, 4, 7, 8],
    "dotNumbers": [4, 5, 8, 9],
    "description": "Dynamic 4-point procedural sequence",
    "createdAt": 1794560030000
  }
}
```

### 2.4 Verify Pattern Tracing
- **Endpoint:** `POST /api/auth/pattern/verify`
- **Description:** Verifies that the client-drawn gesture coordinates match the active procedural challenge.
- **Request Body:**
```json
{
  "email": "sanandprasad23@gmail.com",
  "challengeId": "PTN-MW581Z-402",
  "drawnSequence": [0, 1, 5, 2]
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "authenticated": true,
  "message": "Vault security token authenticated successfully."
}
```

---

## 3. Registration & Onboarding Endpoints

### 3.1 Registration Success Notification
- **Endpoint:** `POST /api/auth/register-success`
- **Description:** Sends a formal welcome and onboarding confirmation email to a newly registered user, detailing their legal name, entity classification, diligence tier, and allocated segregated rupee account number.
- **Request Body:**
```json
{
  "name": "Sanand Prasad",
  "email": "sanandprasad23@gmail.com",
  "entityType": "individual",
  "kycTier": "tier2",
  "accountNumber": "BV-1042-INR-01",
  "initialDeposit": 100000,
  "currency": "INR"
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Welcome email successfully dispatched to sanandprasad23@gmail.com"
}
```

---

## 4. Ledger & Account State Endpoints

### 4.1 Retrieve Dynamic Platform State
- **Endpoint:** `GET /api/state`
- **Description:** Fetches all platform accounts, settled ledger transactions, Merkle epochs, dual-authorization queues, and audit trails.
- **Success Response (200 OK):**
```json
{
  "success": true,
  "state": {
    "users": [...],
    "accounts": [...],
    "transactions": [...],
    "epochs": [...],
    "pendingTransactions": [],
    "auditLogs": [...]
  }
}
```

### 4.2 Sync Dynamic State
- **Endpoint:** `POST /api/state`
- **Description:** Commits client-side ledger updates, settling double-entry legs and archiving epoch hashes.
- **Request Body:** Complete `DynamicSystemState` payload.
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "System state synchronized successfully."
}
```

### 4.3 List Accounts
- **Endpoint:** `GET /api/accounts`
- **Description:** Retrieves all institutional and client accounts with current balances and reserved amounts in INR.
- **Success Response (200 OK):**
```json
[
  {
    "id": "acc_treasury_core_inr",
    "accountNumber": "BV-9021-INR-01",
    "accountName": "Core Treasury Reserve Vault",
    "entityName": "Vaultora Custody",
    "currency": "INR",
    "type": "treasury",
    "status": "active",
    "balance": 10000000.00,
    "reservedBalance": 1000000.00
  }
]
```

### 4.4 List Cryptographic Audit Logs
- **Endpoint:** `GET /api/audit-logs`
- **Description:** Returns the append-only log of security and financial events with SHA-256 digital signatures.
- **Success Response (200 OK):**
```json
[
  {
    "id": "log_init_001",
    "timestamp": "2026-11-14T01:00:00.000Z",
    "actorId": "usr_admin_1",
    "actorName": "Alex Rivera",
    "actorRole": "admin",
    "action": "GENESIS_LEDGER_SEALED",
    "details": "Initialized immutable double-entry ledger base with ₹1,00,00,000 INR reserve capacity.",
    "severity": "info",
    "hashSignature": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
  }
]
```
