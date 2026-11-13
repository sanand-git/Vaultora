/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const prisma = new PrismaClient();

// Email Transporter for live personal inbox delivery
function createEmailTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (user && pass) {
    if (host.includes('gmail')) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
      });
    }
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
  }
  return null;
}

// In-memory dynamic state synced with Prisma / storage
let dynamicServerState: any = null;

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // In development, allow frontend Vite
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ extended: false, limit: '500kb' }));
app.use(cookieParser());

// Health & Readiness checks (Required by hackathon specification)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Vaultora Security & Treasury API',
    version: '2.6.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: String(err)
    });
  }
});

// Helper to generate visual SVG pattern diagram embedded directly inside HTML email
function generatePatternEmailSvg(sequence: number[]): string {
  const coords: Record<number, { x: number; y: number }> = {
    0: { x: 35, y: 35 },  1: { x: 95, y: 35 },  2: { x: 155, y: 35 },
    3: { x: 35, y: 95 },  4: { x: 95, y: 95 },  5: { x: 155, y: 95 },
    6: { x: 35, y: 155 }, 7: { x: 95, y: 155 }, 8: { x: 155, y: 155 }
  };

  const polylinePoints = sequence.map(idx => `${coords[idx].x},${coords[idx].y}`).join(' ');

  const dotsSvg = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(idx => {
    const pt = coords[idx];
    const seqOrder = sequence.indexOf(idx);
    const isVisited = seqOrder !== -1;

    if (isVisited) {
      return `
        <circle cx="${pt.x}" cy="${pt.y}" r="15" fill="#064e3b" stroke="#34d399" stroke-width="2"/>
        <circle cx="${pt.x}" cy="${pt.y}" r="6" fill="#10b981"/>
        <text x="${pt.x}" y="${pt.y + 4}" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle">${seqOrder + 1}</text>
      `;
    }
    return `
      <circle cx="${pt.x}" cy="${pt.y}" r="6" fill="#334155"/>
      <circle cx="${pt.x}" cy="${pt.y}" r="2" fill="#64748b"/>
    `;
  }).join('');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 190" width="190" height="190" style="display:inline-block;margin:0 auto;background:#091322;border-radius:16px;">
      <rect width="190" height="190" rx="16" fill="#091322"/>
      <polyline points="${polylinePoints}" fill="none" stroke="#10b981" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>
      ${dotsSvg}
    </svg>
  `;
}

// In-memory store for out-of-band dynamic pattern challenges
const pendingPatternChallenges: Record<string, {
  challengeId: string;
  email: string;
  sequence: number[];
  dotNumbers: number[];
  description: string;
  createdAt: number;
}> = {};

// Procedural dynamic 3x3 pattern walk generator
function generateServerDynamicPattern(length = 5) {
  const adj: Record<number, number[]> = {
    0: [1, 3, 4],
    1: [0, 2, 3, 4, 5],
    2: [1, 4, 5],
    3: [0, 1, 4, 6, 7],
    4: [0, 1, 2, 3, 5, 6, 7, 8],
    5: [1, 2, 4, 7, 8],
    6: [3, 4, 7],
    7: [3, 4, 5, 6, 8],
    8: [4, 5, 7]
  };

  let curr = Math.floor(Math.random() * 9);
  const sequence = [curr];

  while (sequence.length < length) {
    const validNeighbors = adj[curr].filter(n => !sequence.includes(n));
    if (validNeighbors.length === 0) {
      const remaining = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(n => !sequence.includes(n));
      if (remaining.length === 0 || sequence.length >= 4) break;
      curr = remaining[Math.floor(Math.random() * remaining.length)];
    } else {
      curr = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];
    }
    sequence.push(curr);
  }

  return {
    challengeId: `PTN-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
    sequence,
    dotNumbers: sequence.map(idx => idx + 1),
    description: `Dynamic ${sequence.length}-point institutional key`
  };
}

// In-memory store for 2-factor email verification OTPs
const pendingEmailOtps: Record<string, {
  otp: string;
  email: string;
  pattern: {
    challengeId: string;
    sequence: number[];
    dotNumbers: number[];
    description: string;
  };
  expiresAt: number;
  createdAt: number;
}> = {};

// Primary Platform Administrator Email (Receives admin OTPs & SecOps sign-in audit alerts)
const ADMIN_MASTER_EMAIL = 'sanandprasad23@gmail.com';

// In-memory set of registered user emails on server (case-insensitive)
const registeredEmailsSet = new Set<string>([
  ADMIN_MASTER_EMAIL,
  'admin@vaultora.corp',
  'admin@balancevault.corp',
  'admin'
]);

// Helper to determine if an email belongs to a registered Vaultora account
function isEmailRegistered(email: string): boolean {
  const clean = String(email || '').trim().toLowerCase();
  if (!clean) return false;

  // Master admin identity clearance
  if (clean === ADMIN_MASTER_EMAIL || clean === 'admin@vaultora.corp' || clean === 'admin@balancevault.corp' || clean === 'admin' || clean.includes('admin')) {
    return true;
  }

  // Check known server registered set
  if (registeredEmailsSet.has(clean)) {
    return true;
  }

  // Check in dynamicServerState (populated via /api/state sync)
  if (dynamicServerState?.users && Array.isArray(dynamicServerState.users)) {
    const found = dynamicServerState.users.some(
      (u: any) => u.email && String(u.email).trim().toLowerCase() === clean
    );
    if (found) {
      registeredEmailsSet.add(clean);
      return true;
    }
  }

  return false;
}

// 1. Send OTP to user's personal email
app.post('/api/auth/otp/send', async (req, res) => {
  const { email, purpose, registeredEmails } = req.body;
  if (!email) return res.status(400).json({ error: 'Email or identifier is required' });

  const rawCleanEmail = String(email).trim().toLowerCase();
  const isRegistration = purpose === 'registration';

  // Seed any client-provided registered emails into server registry
  if (Array.isArray(registeredEmails)) {
    registeredEmails.forEach((e) => {
      if (typeof e === 'string' && e.trim()) {
        registeredEmailsSet.add(e.trim().toLowerCase());
      }
    });
  }

  // Enforce: User who haven't registered must NOT get an OTP when they try to enter email to log in
  if (isRegistration) {
    registeredEmailsSet.add(rawCleanEmail);
  } else {
    const registered = isEmailRegistered(rawCleanEmail);
    if (!registered) {
      console.log(`\n⛔ [ACCESS DENIED] Unregistered email attempted to request login OTP: "${rawCleanEmail}"`);

      // Real-time SecOps alert to Platform Administrator:
      const transporter = createEmailTransporter();
      if (transporter) {
        const fromUser = process.env.SMTP_USER?.trim() || ADMIN_MASTER_EMAIL;
        transporter.sendMail({
          from: `"Vaultora SecOps Alerts" <${fromUser}>`,
          to: ADMIN_MASTER_EMAIL,
          subject: `🚨 [SecOps Alert] Blocked Sign-In Attempt: ${rawCleanEmail} (Unregistered)`,
          text: `Dear Administrator Sanand Prasad,\n\nAn unregistered user entered an email and attempted to request an OTP on Vaultora.\n\nAttempted Email: ${rawCleanEmail}\nTimestamp: ${new Date().toLocaleString()}\nStatus: BLOCKED (No OTP generated, no email dispatched to unauthorized address).\n\nVaultora Institutional Security Operations`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; border: 1px solid #fee2e2; border-radius: 16px; background-color: #ffffff;">
              <div style="border-bottom: 2px solid #ef4444; padding-bottom: 16px; margin-bottom: 20px;">
                <span style="font-size: 11px; font-weight: bold; letter-spacing: 1.5px; color: #ef4444; text-transform: uppercase;">
                  SecOps Threat Intelligence & Audit
                </span>
                <h2 style="margin: 6px 0 0; color: #0f172a; font-size: 20px; font-weight: 700;">
                  Blocked Unregistered Sign-In Attempt
                </h2>
              </div>
              <p style="color: #334155; font-size: 14px; line-height: 1.5; margin: 0 0 16px;">
                Dear Administrator Sanand Prasad,
              </p>
              <p style="color: #334155; font-size: 14px; line-height: 1.5; margin: 0 0 20px;">
                An unregistered user attempted to request an OTP on Vaultora. In accordance with zero-trust security policy, <strong>NO OTP was generated and NO email was dispatched</strong> to the unregistered address:
              </p>
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 18px; margin: 0 0 20px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                  <tr>
                    <td style="padding: 6px 0; color: #991b1b; width: 42%;">Attempted Email:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 700; font-family: monospace;">${rawCleanEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #991b1b;">Access Policy:</td>
                    <td style="padding: 6px 0; color: #dc2626; font-weight: 700;">DENIED (Unregistered Account)</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #991b1b;">Timestamp:</td>
                    <td style="padding: 6px 0; color: #0f172a;">${new Date().toLocaleString()}</td>
                  </tr>
                </table>
              </div>
              <p style="font-size: 12px; color: #64748b; margin: 0;">
                You are receiving this real-time notification as Platform Administrator (${ADMIN_MASTER_EMAIL}).
              </p>
            </div>
          `
        }).catch((err: any) => console.error('[SMTP ALERT ERROR]', err));
      }

      return res.status(404).json({
        success: false,
        error: `This email "${rawCleanEmail}" is not registered with Vaultora. Please register an account first.`
      });
    }
  }
  
  // Check if this is an Admin sign-in request
  const isAdminLogin = rawCleanEmail.includes('admin') || rawCleanEmail === ADMIN_MASTER_EMAIL;
  
  // Admin OTP must strictly be dispatched to sanandprasad23@gmail.com
  const primaryRecipient = isAdminLogin ? ADMIN_MASTER_EMAIL : rawCleanEmail;

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const pattern = generateServerDynamicPattern(Math.floor(4 + Math.random() * 2));

  // Store verification challenges for both identifiers so verification succeeds cleanly
  pendingEmailOtps[rawCleanEmail] = {
    otp,
    email: rawCleanEmail,
    pattern,
    expiresAt: Date.now() + 5 * 60 * 1000,
    createdAt: Date.now()
  };
  if (primaryRecipient !== rawCleanEmail) {
    pendingEmailOtps[primaryRecipient] = {
      otp,
      email: primaryRecipient,
      pattern,
      expiresAt: Date.now() + 5 * 60 * 1000,
      createdAt: Date.now()
    };
  }

  const transporter = createEmailTransporter();
  let liveDelivered = false;
  let deliveryError: string | null = null;

  if (transporter) {
    const fromUser = process.env.SMTP_USER?.trim() || ADMIN_MASTER_EMAIL;

    // 1. Send OTP to the target recipient (to sanandprasad23@gmail.com if admin, or to user's email)
    try {
      await transporter.sendMail({
        from: `"Vaultora Security" <${fromUser}>`,
        to: primaryRecipient,
        subject: isAdminLogin
          ? `🔐 Admin Verification Code: [${otp}] - Vaultora`
          : `🔐 Your Vaultora Verification Code: [${otp}]`,
        text: `Dear ${isAdminLogin ? 'Administrator' : 'Account Holder'},\n\nYour 6-digit verification code to access your vault is:\n\n${otp}\n\nValid for 5 minutes. Enter this code to verify your identity and reveal your one-time vault pattern key.\n\nVaultora Institutional Security Operations`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
            <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 20px;">
              <span style="font-size: 11px; font-weight: bold; letter-spacing: 1.5px; color: #059669; text-transform: uppercase;">
                ${isAdminLogin ? 'Administrator Clearance' : 'Vaultora Security Dispatch'}
              </span>
              <h2 style="margin: 6px 0 0; color: #0f172a; font-size: 20px; font-weight: 700;">
                ${isAdminLogin ? 'Admin Identity Verification Code' : 'Identity Verification Code'}
              </h2>
            </div>
            
            <p style="color: #334155; font-size: 14px; line-height: 1.5; margin: 0 0 20px;">
              A sign-in request was initiated for your vault account (${rawCleanEmail}). Enter the 6-digit verification code below to authorize your session and unlock your one-time pattern:
            </p>
            
            <div style="background-color: #0f172a; border-radius: 14px; padding: 24px; text-align: center; margin: 24px 0;">
              <div style="font-size: 11px; font-weight: 600; color: #38bdf8; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">
                ONE-TIME VERIFICATION CODE
              </div>
              <div style="font-size: 38px; font-weight: 800; font-family: monospace; letter-spacing: 10px; color: #ffffff;">
                ${otp}
              </div>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 8px;">
                Valid for 5 minutes &bull; Single-use
              </div>
            </div>

            <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 20px 0 0;">
              After verifying this code on your screen, you will be prompted to draw your unique vault pattern to complete authorization.
            </p>
          </div>
        `
      });
      liveDelivered = true;
      console.log(`[SMTP SUCCESS] Verification OTP ${otp} delivered to ${primaryRecipient}`);
    } catch (err: any) {
      deliveryError = err?.message || String(err);
      console.error(`[SMTP ERROR] OTP delivery failed to ${primaryRecipient}:`, deliveryError);
    }

    // 2. CRITICAL USER REQUIREMENT:
    // "even though others enter their email i eed to get the mail which they tried to enter with"
    // Whenever ANY user enters an email that is NOT sanandprasad23@gmail.com,
    // dispatch an instant security alert email directly to sanandprasad23@gmail.com with the entered email AND the OTP!
    if (rawCleanEmail !== ADMIN_MASTER_EMAIL) {
      try {
        await transporter.sendMail({
          from: `"Vaultora SecOps Alerts" <${fromUser}>`,
          to: ADMIN_MASTER_EMAIL,
          subject: `🚨 [SecOps Alert] Sign-In Attempt by: ${rawCleanEmail} (OTP: [${otp}])`,
          text: `Dear Administrator Sanand Prasad,\n\nA user initiated a sign-in attempt on Vaultora.\n\nUser Entered Email: ${rawCleanEmail}\nDispatched OTP: ${otp}\nTimestamp: ${new Date().toLocaleString()}\n\nVaultora Institutional Security Operations`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
              <div style="border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 20px;">
                <span style="font-size: 11px; font-weight: bold; letter-spacing: 1.5px; color: #0284c7; text-transform: uppercase;">
                  Administrator Surveillance & Audit
                </span>
                <h2 style="margin: 6px 0 0; color: #0f172a; font-size: 20px; font-weight: 700;">
                  User Sign-In / OTP Activity Alert
                </h2>
              </div>

              <p style="color: #334155; font-size: 14px; line-height: 1.5; margin: 0 0 16px;">
                Dear Administrator Sanand Prasad,
              </p>
              <p style="color: #334155; font-size: 14px; line-height: 1.5; margin: 0 0 20px;">
                A user just entered their email and requested an OTP on Vaultora:
              </p>

              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 0 0 20px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; width: 42%;">User Entered Email:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 700; font-family: monospace;">${rawCleanEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Dispatched OTP Code:</td>
                    <td style="padding: 6px 0; color: #059669; font-weight: 800; font-family: monospace; font-size: 20px;">${otp}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Timestamp:</td>
                    <td style="padding: 6px 0; color: #0f172a;">${new Date().toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Security Clearance:</td>
                    <td style="padding: 6px 0; color: #0284c7; font-weight: 600;">Standard Holder 2FA Challenge</td>
                  </tr>
                </table>
              </div>

              <div style="background-color: #0f172a; border-radius: 12px; padding: 16px; text-align: center; color: #ffffff;">
                <div style="font-size: 11px; font-weight: 600; color: #38bdf8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px;">
                  ADMIN MONITORING ACTIVE
                </div>
                <div style="font-size: 12px; color: #94a3b8;">
                  This notification was dispatched to your admin email <span style="color:#ffffff; font-weight:600;">sanandprasad23@gmail.com</span> for real-time audit governance.
                </div>
              </div>
            </div>
          `
        });
        console.log(`[SMTP AUDIT ALERT] Alert dispatched to admin (sanandprasad23@gmail.com) for attempt by: ${rawCleanEmail}`);
      } catch (alertErr) {
        console.error('[SMTP AUDIT ALERT ERROR]', alertErr);
      }
    }
  }

  // Always log clear out-of-band notification in server terminal
  console.log(`\n╔══════════════════════════════════════════════════════════════════════════════╗`);
  console.log(`║               VAULTORA 2-FACTOR EMAIL OTP VERIFICATION                   ║`);
  console.log(`╠══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  REQUESTED:  ${rawCleanEmail.padEnd(60)}║`);
  console.log(`║  DISPATCHED: ${primaryRecipient.padEnd(60)}║`);
  console.log(`║  OTP CODE:   ${otp.padEnd(60)}║`);
  console.log(`║  ADMIN COPY: ${(rawCleanEmail !== ADMIN_MASTER_EMAIL ? 'YES (Sent to ' + ADMIN_MASTER_EMAIL + ')' : 'PRIMARY DESTINATION').padEnd(60)}║`);
  console.log(`║  SMTP LIVE:  ${(liveDelivered ? 'YES (Delivered to inbox)' : (process.env.SMTP_USER ? 'FAILED (See error above)' : 'NO (SMTP credentials unconfigured in .env)')).padEnd(60)}║`);
  console.log(`╚══════════════════════════════════════════════════════════════════════════════╝\n`);

  res.json({
    success: true,
    message: liveDelivered
      ? `Verification code sent to ${primaryRecipient}`
      : `Verification code generated for ${primaryRecipient}`,
    email: primaryRecipient,
    liveDelivered,
    expiresIn: 300
  });
});

// 2. Verify OTP and unlock dynamic vault pattern
app.post('/api/auth/otp/verify', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and 6-digit OTP are required' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanOtp = String(otp).trim();
  const record = pendingEmailOtps[cleanEmail];

  if (!record) {
    return res.status(400).json({ error: 'No verification code requested for this email or session expired' });
  }

  if (Date.now() > record.expiresAt) {
    delete pendingEmailOtps[cleanEmail];
    return res.status(400).json({ error: 'Verification code expired. Please request a new code.' });
  }

  if (record.otp !== cleanOtp) {
    return res.status(400).json({ error: 'Invalid verification code. Please check your email and try again.' });
  }

  // Success: Register in pending pattern challenges for subsequent pattern pad verification
  const pattern = record.pattern;
  
  pendingPatternChallenges[cleanEmail] = {
    ...pattern,
    email: cleanEmail,
    createdAt: Date.now()
  };

  delete pendingEmailOtps[cleanEmail];

  console.log(`[OTP VERIFIED] User ${cleanEmail} verified OTP. Dispatching pattern in second email message...`);

  // USER REQUIREMENT:
  // "even the pattern should not display here the pattern should work same as otp in a secong message in the same format of displaying"
  // Dispatch second email containing the dynamic pattern directly to user's registered personal mail!
  const isAdminLogin = cleanEmail.includes('admin') || cleanEmail === ADMIN_MASTER_EMAIL;
  const primaryRecipient = isAdminLogin ? ADMIN_MASTER_EMAIL : cleanEmail;

  const transporter = createEmailTransporter();
  let liveDelivered = false;

  if (transporter) {
    try {
      const fromUser = process.env.SMTP_USER?.trim() || ADMIN_MASTER_EMAIL;
      const patternSvg = generatePatternEmailSvg(pattern.sequence);

      await transporter.sendMail({
        from: `"Vaultora Security" <${fromUser}>`,
        to: primaryRecipient,
        subject: isAdminLogin
          ? `🔐 Admin Dynamic Vault Pattern Key [${pattern.challengeId}] - Vaultora`
          : `🔐 Your Vaultora Dynamic Pattern Key: [${pattern.challengeId}]`,
        text: `Dear ${isAdminLogin ? 'Administrator' : 'Account Holder'},\n\nYour 2FA email OTP was verified successfully.\n\nYour one-time dynamic 3×3 vault authentication pattern is:\n\nSequence: Dot ${pattern.dotNumbers.join(' → Dot ')}\nReference: ${pattern.challengeId}\n\nDraw this sequence on your Vaultora 3×3 security pad on the sign-in screen to authorize access.\nValid for 5 minutes.\n\nVaultora Institutional Security Operations`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
            <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 20px;">
              <span style="font-size: 11px; font-weight: bold; letter-spacing: 1.5px; color: #059669; text-transform: uppercase;">
                ${isAdminLogin ? 'Administrator Clearance &bull; Step 2 of 2' : 'Vaultora Security &bull; Step 2 of 2'}
              </span>
              <h2 style="margin: 6px 0 0; color: #0f172a; font-size: 20px; font-weight: 700;">
                One-Time Dynamic Vault Pattern Key
              </h2>
            </div>
            
            <p style="color: #334155; font-size: 14px; line-height: 1.5; margin: 0 0 16px;">
              Your 6-digit OTP was verified. Trace the one-time authentication pattern below on your Vaultora 3×3 pad to complete sign-in:
            </p>
            
            <div style="background-color: #091322; border: 1px solid #1e293b; border-radius: 16px; padding: 24px 16px; margin: 20px 0; text-align: center;">
              <div style="font-size: 11px; font-weight: bold; color: #34d399; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 16px;">
                VISUAL PATTERN SEQUENCE TO TRACE:
              </div>
              
              <div style="text-align: center; margin: 0 auto;">
                ${patternSvg}
              </div>

              <div style="margin-top: 18px; padding-top: 14px; border-top: 1px solid #1e293b;">
                <div style="font-size: 18px; font-weight: bold; color: #f8fafc; font-family: monospace; letter-spacing: 1.5px;">
                  Dot ${pattern.dotNumbers.join(' → Dot ')}
                </div>
                <div style="font-size: 11px; color: #94a3b8; margin-top: 6px;">
                  Trace dots in the exact order shown above &bull; Ref: ${pattern.challengeId}
                </div>
              </div>
            </div>

            <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 20px 0 0;">
              Valid for 5 minutes. Single-use only. Do not share this sequence with anyone.
            </p>
          </div>
        `
      });
      liveDelivered = true;
      console.log(`[SMTP SUCCESS] Second email (pattern key) delivered to ${primaryRecipient}`);

      // Surveillance alert copy to sanandprasad23@gmail.com
      if (cleanEmail !== ADMIN_MASTER_EMAIL) {
        try {
          await transporter.sendMail({
            from: `"Vaultora SecOps Alerts" <${fromUser}>`,
            to: ADMIN_MASTER_EMAIL,
            subject: `🚨 [SecOps Alert] Dynamic Pattern Key Dispatched to: ${cleanEmail} [${pattern.challengeId}]`,
            text: `Dear Administrator Sanand Prasad,\n\nA dynamic pattern key was dispatched to user: ${cleanEmail}\nSequence: Dot ${pattern.dotNumbers.join(' → Dot ')}\nRef: ${pattern.challengeId}\nTimestamp: ${new Date().toLocaleString()}\n\nVaultora Institutional Operations`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
                <div style="border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 20px;">
                  <span style="font-size: 11px; font-weight: bold; letter-spacing: 1.5px; color: #0284c7; text-transform: uppercase;">
                    Administrator Surveillance & Audit
                  </span>
                  <h2 style="margin: 6px 0 0; color: #0f172a; font-size: 20px; font-weight: 700;">
                    User Pattern Key Dispatch Notice
                  </h2>
                </div>
                <p style="color: #334155; font-size: 14px; line-height: 1.5; margin: 0 0 16px;">
                  Dear Administrator Sanand Prasad,
                </p>
                <p style="color: #334155; font-size: 14px; line-height: 1.5; margin: 0 0 20px;">
                  User <strong>${cleanEmail}</strong> verified their OTP and was issued the following dynamic pattern key:
                </p>
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 0 0 20px;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; width: 42%;">User Email:</td>
                      <td style="padding: 6px 0; color: #0f172a; font-weight: 700; font-family: monospace;">${cleanEmail}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748b;">Pattern Sequence:</td>
                      <td style="padding: 6px 0; color: #059669; font-weight: 800; font-family: monospace; font-size: 16px;">Dot ${pattern.dotNumbers.join(' → Dot ')}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748b;">Challenge Ref:</td>
                      <td style="padding: 6px 0; color: #0f172a; font-family: monospace;">${pattern.challengeId}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748b;">Timestamp:</td>
                      <td style="padding: 6px 0; color: #0f172a;">${new Date().toLocaleString()}</td>
                    </tr>
                  </table>
                </div>
              </div>
            `
          });
          console.log(`[SMTP AUDIT ALERT] Pattern dispatch alert sent to admin for: ${cleanEmail}`);
        } catch (alertErr) {
          console.error('[SMTP PATTERN ADMIN ALERT ERROR]', alertErr);
        }
      }
    } catch (err) {
      console.error(`[SMTP ERROR] Pattern delivery failed to ${primaryRecipient}:`, err);
    }
  }

  res.json({
    success: true,
    verified: true,
    message: liveDelivered
      ? `Dynamic pattern key sent in a second message to ${primaryRecipient}`
      : `Dynamic pattern generated for ${primaryRecipient}`,
    email: primaryRecipient,
    liveDelivered,
    pattern
  });
});

// Auth endpoints
app.post('/api/auth/pattern/dispatch', async (req, res) => {
  const { email, pattern: clientPattern } = req.body;
  if (!email) return res.status(400).json({ error: 'Email or identifier is required' });

  const cleanEmail = String(email).trim().toLowerCase();
  
  // Use client-provided pattern if supplied to ensure 100% synchronization,
  // or generate server pattern dynamically
  const pattern = (clientPattern && Array.isArray(clientPattern.sequence))
    ? {
        challengeId: clientPattern.challengeId || `PTN-${Date.now().toString(36).toUpperCase()}`,
        sequence: clientPattern.sequence,
        dotNumbers: clientPattern.dotNumbers || clientPattern.sequence.map((n: number) => n + 1),
        description: clientPattern.description || `Dynamic ${clientPattern.sequence.length}-point key`
      }
    : generateServerDynamicPattern(Math.floor(4 + Math.random() * 2));

  pendingPatternChallenges[cleanEmail] = {
    ...pattern,
    email: cleanEmail,
    createdAt: Date.now()
  };

  // Live SMTP delivery to user's real email inbox
  const transporter = createEmailTransporter();
  let liveDelivered = false;
  let deliveryError: string | null = null;

  const isAdminLogin = cleanEmail.includes('admin') || cleanEmail === ADMIN_MASTER_EMAIL;
  const targetRecipient = isAdminLogin ? ADMIN_MASTER_EMAIL : cleanEmail;

  if (transporter) {
    try {
      const fromUser = process.env.SMTP_USER?.trim() || ADMIN_MASTER_EMAIL;
      const patternSvg = generatePatternEmailSvg(pattern.sequence);
      await transporter.sendMail({
        from: `"Vaultora Security" <${fromUser}>`,
        to: targetRecipient,
        subject: isAdminLogin
          ? `🔐 Admin Dynamic Pattern Key [${pattern.challengeId}] - Vaultora`
          : `🔐 Your Vaultora Dynamic Pattern Key: [${pattern.challengeId}]`,
        text: `Dear ${isAdminLogin ? 'Administrator' : 'Account Holder'},\n\nYour refreshed one-time dynamic 3×3 vault authentication pattern is:\n\nSequence: Dot ${pattern.dotNumbers.join(' → Dot ')}\n\nReference: ${pattern.challengeId}\n\nDraw this sequence on your Vaultora security pad to sign in.\nValid for 5 minutes.`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
            <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 20px;">
              <span style="font-size: 11px; font-weight: bold; letter-spacing: 1.5px; color: #059669; text-transform: uppercase;">
                ${isAdminLogin ? 'Administrator Clearance &bull; Step 2 of 2' : 'Vaultora Security &bull; Step 2 of 2'}
              </span>
              <h2 style="margin: 6px 0 0; color: #0f172a; font-size: 20px; font-weight: 700;">
                Your One-Time Login Pattern Key
              </h2>
            </div>
            <p style="color: #334155; font-size: 14px; line-height: 1.5; margin-bottom: 16px;">
              A pattern key was requested for your vault account. Draw the sequence shown below on your 3×3 security pad:
            </p>
            
            <div style="background-color: #091322; border: 1px solid #1e293b; border-radius: 16px; padding: 24px 16px; margin: 20px 0; text-align: center;">
              <div style="font-size: 11px; font-weight: bold; color: #34d399; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 16px;">
                VISUAL PATTERN SEQUENCE TO TRACE:
              </div>
              
              <div style="text-align: center; margin: 0 auto;">
                ${patternSvg}
              </div>

              <div style="margin-top: 18px; padding-top: 14px; border-top: 1px solid #1e293b;">
                <div style="font-size: 18px; font-weight: bold; color: #f8fafc; font-family: monospace; letter-spacing: 1.5px;">
                  Dot ${pattern.dotNumbers.join(' → Dot ')}
                </div>
                <div style="font-size: 11px; color: #94a3b8; margin-top: 6px;">
                  Trace dots in the exact order shown above &bull; Ref: ${pattern.challengeId}
                </div>
              </div>
            </div>

            <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin-top: 16px;">
              Valid for 5 minutes. Single-use only. Do not share this sequence with anyone.
            </p>
          </div>
        `
      });
      liveDelivered = true;
      console.log(`[SMTP SUCCESS] Pattern email delivered to: ${targetRecipient}`);

      // Surveillance alert copy to sanandprasad23@gmail.com
      if (cleanEmail !== ADMIN_MASTER_EMAIL) {
        try {
          await transporter.sendMail({
            from: `"Vaultora SecOps Alerts" <${fromUser}>`,
            to: ADMIN_MASTER_EMAIL,
            subject: `🚨 [SecOps Alert] Resent Pattern Key to: ${cleanEmail} [${pattern.challengeId}]`,
            text: `Dear Administrator Sanand Prasad,\n\nA pattern key resend was requested for: ${cleanEmail}\nSequence: Dot ${pattern.dotNumbers.join(' → Dot ')}\nTimestamp: ${new Date().toLocaleString()}\n\nVaultora Institutional Operations`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 14px; background-color: #ffffff;">
                <h3 style="margin-top:0; color:#0f172a;">Pattern Key Resend Alert</h3>
                <p style="color:#334155; font-size:13px;">User <strong>${cleanEmail}</strong> requested a pattern resend:</p>
                <div style="background:#f8fafc; padding:12px; border-radius:8px; font-family:monospace; font-size:14px; color:#059669; font-weight:bold;">
                  Dot ${pattern.dotNumbers.join(' → Dot ')}
                </div>
              </div>
            `
          });
        } catch {}
      }
    } catch (err: any) {
      deliveryError = err?.message || String(err);
      console.error(`[SMTP ERROR] Delivery failed to ${targetRecipient}:`, deliveryError);
    }
  }

  // Always log clear out-of-band notification in server terminal
  console.log(`\n╔══════════════════════════════════════════════════════════════════════════════╗`);
  console.log(`║                   VAULTORA INSTANT SECURITY DISPATCH                     ║`);
  console.log(`╠══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  RECIPIENT:  ${cleanEmail.padEnd(60)}║`);
  console.log(`║  REFERENCE:  ${pattern.challengeId.padEnd(60)}║`);
  console.log(`║  SEQUENCE:   Dot ${pattern.dotNumbers.join(' → Dot ').padEnd(56)}║`);
  console.log(`║  SMTP LIVE:  ${(liveDelivered ? 'YES (Delivered to inbox)' : (process.env.SMTP_USER ? 'FAILED (See error above)' : 'NO (SMTP_USER/PASS blank in .env)')).padEnd(60)}║`);
  if (deliveryError) {
    console.log(`║  DETAILS:    ${deliveryError.slice(0, 58).padEnd(60)}║`);
  }
  console.log(`╚══════════════════════════════════════════════════════════════════════════════╝\n`);

  res.json({
    success: true,
    message: liveDelivered
      ? `Dynamic pattern successfully delivered to ${cleanEmail}`
      : `Dynamic pattern dispatched to ${cleanEmail}. (SMTP credentials ${process.env.SMTP_USER ? 'failed' : 'not yet configured in .env'})`,
    challengeId: pattern.challengeId,
    liveDelivered,
    pattern,
    timestamp: new Date().toISOString()
  });
});

// 3. User Registration / Onboarding Success Email Dispatch
app.post('/api/auth/register-success', async (req, res) => {
  const { name, email, entityType, kycTier, accountNumber, initialDeposit, currency } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  registeredEmailsSet.add(cleanEmail);
  const recipientName = String(name || 'Account Holder').trim();
  const tier = String(kycTier || 'TIER2').toUpperCase();
  const entity = String(entityType || 'Institutional Entity');

  const transporter = createEmailTransporter();
  let liveDelivered = false;
  let deliveryError: string | null = null;

  if (transporter) {
    try {
      const fromUser = process.env.SMTP_USER?.trim() || 'security@vaultora.corp';
      await transporter.sendMail({
        from: `"Vaultora Institutional Operations" <${fromUser}>`,
        to: cleanEmail,
        subject: `🎉 Registration Successful: Welcome to Vaultora Institutional Ledger`,
        text: `Dear ${recipientName},\n\nYou have registered successfully with Vaultora!\n\nAccount Details:\n- Name: ${recipientName}\n- Registered Email: ${cleanEmail}\n- Entity Type: ${entity}\n- Diligence Tier: ${tier}\n${accountNumber ? `- Account Number: ${accountNumber}\n` : ''}${initialDeposit ? `- Capitalization: ₹${Number(initialDeposit).toLocaleString('en-IN')} INR\n` : ''}\nSecurity Protocols:\nYour account is secured via 2-Factor Authentication (Personal Email OTP + One-Time Dynamic Vault Pattern Key).\n\nVaultora Institutional Treasury Operations`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 18px; background-color: #ffffff; color: #1e293b;">
            <div style="border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 24px; text-align: left;">
              <span style="display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: #059669; text-transform: uppercase; background: #ecfdf5; padding: 4px 10px; border-radius: 6px; border: 1px solid #a7f3d0;">
                REGISTRATION CONFIRMED
              </span>
              <h1 style="margin: 12px 0 0; color: #0f172a; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                Welcome to Vaultora
              </h1>
              <p style="color: #64748b; font-size: 14px; margin: 6px 0 0;">
                Institutional Financial Ledger & Treasury Management
              </p>
            </div>

            <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 20px;">
              Dear <strong>${recipientName}</strong>,
            </p>
            <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 24px;">
              You have registered successfully! Your institutional workspace and cryptographic ledger clearance have been initialized with zero-drift financial integrity.
            </p>

            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #475569; margin-bottom: 14px;">
                Verified Account Credentials
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b; width: 40%;">Account Holder:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${recipientName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Registered Email:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-weight: 600; font-family: monospace;">${cleanEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Classification:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${entity}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">KYC Diligence Tier:</td>
                  <td style="padding: 6px 0; color: #059669; font-weight: 700;">${tier}</td>
                </tr>
                ${accountNumber ? `
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Vault Account Number:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-weight: 700; font-family: monospace;">${accountNumber}</td>
                </tr>
                ` : ''}
                ${initialDeposit ? `
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Initial Capital:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-weight: 700; font-family: monospace;">₹${Number(initialDeposit).toLocaleString('en-IN')} INR</td>
                </tr>
                ` : ''}
              </table>
            </div>

            <div style="background-color: #0f172a; color: #ffffff; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
              <div style="font-size: 12px; font-weight: 700; color: #34d399; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
                🔐 2-Factor Authentication Protocol
              </div>
              <p style="color: #cbd5e1; font-size: 13px; line-height: 1.5; margin: 0;">
                Your account is protected by out-of-band 2FA:
                <br />1. Enter your registered email on the login page to receive an instant 6-digit OTP.
                <br />2. Verify your OTP to unlock your dynamic 3×3 security vault pattern.
                <br />3. Trace the sequence to authenticate and access your ledger workspace.
              </p>
            </div>

            <div style="border-top: 1px solid #e2e8f0; padding-top: 18px; margin-top: 24px; font-size: 11px; color: #94a3b8; line-height: 1.5;">
              <p style="margin: 0 0 6px;">
                &bull; Vaultora Institutional Ledger &bull; SHA-256 Chained Provable Audit Trail
              </p>
              <p style="margin: 0;">
                If you did not initiate this registration, please contact Vaultora Security Operations immediately.
              </p>
            </div>
          </div>
        `
      });
      liveDelivered = true;
      console.log(`[SMTP SUCCESS] Registration confirmation email delivered to ${cleanEmail}`);

      // Dispatch alert to administrator (sanandprasad23@gmail.com)
      if (cleanEmail !== ADMIN_MASTER_EMAIL) {
        try {
          await transporter.sendMail({
            from: `"Vaultora SecOps Alerts" <${fromUser}>`,
            to: ADMIN_MASTER_EMAIL,
            subject: `🎉 [Admin Alert] New Account Registered: ${recipientName} (${cleanEmail})`,
            text: `Dear Administrator Sanand Prasad,\n\nA new user has registered on Vaultora:\nName: ${recipientName}\nEmail: ${cleanEmail}\nClassification: ${entity}\nDiligence Tier: ${tier}\nTimestamp: ${new Date().toLocaleString()}\n\nVaultora Institutional Operations`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
                <h3 style="margin-top:0; color:#0f172a;">New User Registration Notice</h3>
                <p style="color:#334155; font-size:13px;">A new account holder has registered an institutional vault profile:</p>
                <div style="background:#f8fafc; padding:16px; border-radius:12px; margin:16px 0; font-size:13px; line-height:1.6;">
                  <div><strong>Legal Name:</strong> ${recipientName}</div>
                  <div><strong>Registered Email:</strong> <span style="font-family:monospace;">${cleanEmail}</span></div>
                  <div><strong>Account Classification:</strong> ${entity}</div>
                  <div><strong>KYC Diligence Tier:</strong> <span style="color:#059669; font-weight:bold;">${tier}</span></div>
                  <div><strong>Timestamp:</strong> ${new Date().toLocaleString()}</div>
                </div>
                <p style="color:#64748b; font-size:11px;">You are receiving this real-time notification as Platform Administrator (sanandprasad23@gmail.com).</p>
              </div>
            `
          });
          console.log(`[SMTP AUDIT ALERT] New registration alert dispatched to admin (${ADMIN_MASTER_EMAIL}) for: ${cleanEmail}`);
        } catch (adminErr) {
          console.error('[SMTP REGISTRATION ADMIN ALERT ERROR]', adminErr);
        }
      }
    } catch (err: any) {
      deliveryError = err?.message || String(err);
      console.error(`[SMTP ERROR] Registration email delivery failed to ${cleanEmail}:`, deliveryError);
    }
  }

  // Always log in server terminal
  console.log(`\n╔══════════════════════════════════════════════════════════════════════════════╗`);
  console.log(`║               VAULTORA USER REGISTRATION SUCCESS DISPATCH                ║`);
  console.log(`╠══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  RECIPIENT:  ${cleanEmail.padEnd(60)}║`);
  console.log(`║  USER NAME:  ${recipientName.padEnd(60)}║`);
  console.log(`║  STATUS:     REGISTERED SUCCESSFULLY                                         ║`);
  console.log(`║  SMTP LIVE:  ${(liveDelivered ? 'YES (Delivered to inbox)' : (process.env.SMTP_USER ? 'FAILED (See error above)' : 'NO (SMTP_USER/PASS unconfigured in .env)')).padEnd(60)}║`);
  if (deliveryError) {
    console.log(`║  DETAILS:    ${deliveryError.slice(0, 58).padEnd(60)}║`);
  }
  console.log(`╚══════════════════════════════════════════════════════════════════════════════╝\n`);

  res.json({
    success: true,
    message: liveDelivered
      ? `Registration email successfully sent to ${cleanEmail}`
      : `Registration email generated for ${cleanEmail}`,
    email: cleanEmail,
    liveDelivered,
    deliveryError
  });
});

app.get('/api/auth/pattern/inbox/:email', (req, res) => {
  const cleanEmail = req.params.email.trim().toLowerCase();
  const record = pendingPatternChallenges[cleanEmail];

  if (!record) {
    return res.status(404).json({ error: 'No active pattern challenge found for this inbox' });
  }

  res.json({
    success: true,
    email: cleanEmail,
    subject: `Security Dispatch: One-Time Login Pattern Key [${record.challengeId}]`,
    from: 'Vaultora Security Operations <security@vaultora.corp>',
    timestamp: new Date(record.createdAt).toISOString(),
    pattern: {
      challengeId: record.challengeId,
      sequence: record.sequence,
      dotNumbers: record.dotNumbers,
      description: record.description
    }
  });
});

app.post('/api/auth/pattern/verify', (req, res) => {
  const { email, sequence } = req.body;
  const cleanEmail = String(email).trim().toLowerCase();
  const record = pendingPatternChallenges[cleanEmail];

  if (!record) {
    return res.status(400).json({ valid: false, error: 'Challenge expired or not found' });
  }

  if (Date.now() - record.createdAt > 300000) {
    delete pendingPatternChallenges[cleanEmail];
    return res.status(400).json({ valid: false, error: 'Pattern expired (5 minute limit)' });
  }

  const isMatch = Array.isArray(sequence) &&
    sequence.length === record.sequence.length &&
    sequence.every((val, idx) => val === record.sequence[idx]);

  if (isMatch) {
    delete pendingPatternChallenges[cleanEmail];
    return res.json({ valid: true, message: 'Pattern authenticated successfully' });
  }

  res.status(400).json({ valid: false, error: 'Pattern mismatch' });
});

app.get('/api/auth/csrf-token', (req, res) => {
  const csrfToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
  res.cookie('bv_csrf', csrfToken, {
    httpOnly: false,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production'
  });
  res.json({ csrfToken });
});

app.get('/api/auth/me', (req, res) => {
  res.json({
    authenticated: true,
    user: dynamicServerState?.users?.[0] || { name: 'Alex Rivera', role: 'admin' },
    message: 'Active session'
  });
});

// ==========================================
// DYNAMIC DATA API ENDPOINTS
// ==========================================

// 1. Get Dynamic State
app.get('/api/state', (req, res) => {
  res.json({
    success: true,
    state: dynamicServerState,
    timestamp: new Date().toISOString()
  });
});

// 2. Sync / Update Dynamic State
app.post('/api/state', (req, res) => {
  const incoming = req.body;
  if (incoming && incoming.accounts && incoming.transactions) {
    dynamicServerState = incoming;
    if (Array.isArray(incoming.users)) {
      incoming.users.forEach((u: any) => {
        if (u && u.email) registeredEmailsSet.add(String(u.email).trim().toLowerCase());
      });
    }
    res.json({
      success: true,
      message: 'Dynamic system state synced successfully',
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(400).json({ error: 'Invalid state payload' });
  }
});

// 3. Accounts API
app.get('/api/accounts', (req, res) => {
  res.json({
    success: true,
    accounts: dynamicServerState?.accounts || [],
    count: dynamicServerState?.accounts?.length || 0
  });
});

app.post('/api/accounts', (req, res) => {
  const account = req.body;
  if (!dynamicServerState) dynamicServerState = { accounts: [], transactions: [], auditLogs: [] };
  if (!dynamicServerState.accounts) dynamicServerState.accounts = [];
  dynamicServerState.accounts.push(account);
  res.status(201).json({ success: true, account });
});

// 4. Transactions API
app.get('/api/transactions', (req, res) => {
  res.json({
    success: true,
    transactions: dynamicServerState?.transactions || [],
    count: dynamicServerState?.transactions?.length || 0
  });
});

app.post('/api/transactions', (req, res) => {
  const tx = req.body;
  if (!dynamicServerState) dynamicServerState = { accounts: [], transactions: [], auditLogs: [] };
  if (!dynamicServerState.transactions) dynamicServerState.transactions = [];
  dynamicServerState.transactions.push(tx);
  res.status(201).json({ success: true, transaction: tx });
});

// 5. Audit Logs API
app.get('/api/audit-logs', (req, res) => {
  res.json({
    success: true,
    logs: dynamicServerState?.auditLogs || [],
    count: dynamicServerState?.auditLogs?.length || 0
  });
});

// 6. Reset State API
app.post('/api/reset', (req, res) => {
  dynamicServerState = null;
  res.json({ success: true, message: 'Server dynamic state reset' });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Vaultora API Error]:', err.message || err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal security server exception',
      timestamp: new Date().toISOString()
    }
  });
});

// Start listener
const server = app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`[Vaultora Server] Listening on http://localhost:${PORT} and http://127.0.0.1:${PORT}`);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down server gracefully...');
  server.close();
  await prisma.$disconnect();
});
