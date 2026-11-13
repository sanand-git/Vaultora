/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  Building2,
  User,
  AlertTriangle,
  ArrowLeft,
  Mail
} from 'lucide-react';
import type { UserProfile } from '../types';

interface RegisterPageProps {
  onRegister: (newUser: UserProfile) => void;
  onNavigateToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onRegister,
  onNavigateToLogin
}) => {
  const [legalName, setLegalName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [entityType, setEntityType] = useState<'institutional' | 'individual'>('institutional');
  const [requestedTier, setRequestedTier] = useState<'tier1' | 'tier2' | 'tier3'>('tier2');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Step state: 'form' (filling registration info) -> 'otp' (typing 6-digit email OTP)
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [pendingUser, setPendingUser] = useState<UserProfile | null>(null);
  const [regOtp, setRegOtp] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // Password entropy/strength criteria
  const hasMinLength = password.length >= 12;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const criteriaMet = [hasMinLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  // OTP Resend Cooldown Countdown
  useEffect(() => {
    let timer: any;
    if (step === 'otp' && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, resendCooldown]);

  // Form Submission: Registers user and automatically dispatches OTP to their registered mail
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legalName.trim() || !email.trim()) {
      setErrorMessage('Please complete all entity identification fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password or master passphrase must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const newUser: UserProfile = {
      id: `usr_holder_${Date.now().toString().slice(-4)}`,
      name: legalName.trim(),
      email: email.trim().toLowerCase(),
      role: 'holder',
      title: entityType === 'institutional' ? 'Institutional Account Officer' : 'Private Client',
      avatarBg: 'bg-emerald-700',
      entityType,
      kycStatus: 'pending',
      kycTier: requestedTier,
      limitConfig: {
        dailyMax: requestedTier === 'tier3' ? 10000000 : requestedTier === 'tier2' ? 1000000 : 250000,
        dualApprovalThreshold: 50000
      },
      allowedAccountIds: []
    };

    setPendingUser(newUser);

    try {
      // 1. Dispatch Welcome Confirmation Email
      fetch('/api/auth/register-success', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          entityType: newUser.entityType,
          kycTier: newUser.kycTier
        })
      }).catch(err => console.warn('Registration welcome email dispatch error:', err));

      // 2. Dispatch the 6-Digit Verification OTP to their registered personal mail
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newUser.email, purpose: 'registration' })
      });
      const data = await res.json();
      setIsLoading(false);

      if (data.success) {
        setStep('otp');
        setRegOtp('');
        setResendCooldown(30);
        setCanResend(false);
      } else {
        setErrorMessage(data.error || 'Failed to dispatch verification code to email.');
      }
    } catch {
      setIsLoading(false);
      setStep('otp');
      setRegOtp('');
      setResendCooldown(30);
      setCanResend(false);
    }
  };

  // OTP Verification: Only redirects to home page after typing the correct OTP from email
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUser) return;

    if (regOtp.trim().length < 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setErrorMessage(null);
    setIsVerifyingOtp(true);

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pendingUser.email,
          otp: regOtp.trim()
        })
      });

      const data = await res.json();
      setIsVerifyingOtp(false);

      if (data.success && (data.verified || data.pattern)) {
        // Verification succeeded! Now redirect to Home Page!
        onRegister(pendingUser);
      } else {
        setErrorMessage(data.error || 'Invalid verification code. Please check your registered email.');
      }
    } catch {
      setIsVerifyingOtp(false);
      setErrorMessage('Verification failed. Please check your network connection.');
    }
  };

  // Resend OTP to the registered email
  const handleResendOtp = async () => {
    if (!canResend || !pendingUser) return;
    setCanResend(false);
    setResendCooldown(30);
    setErrorMessage(null);

    try {
      await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingUser.email, purpose: 'registration' })
      });
    } catch (err) {
      console.warn('Resend OTP error:', err);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row font-sans selection:bg-emerald-950 selection:text-emerald-100">
      {/* LEFT HALF: BRAND IDENTITY */}
      <div className="w-full lg:w-[48%] bg-[#0e291e] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden border-r border-[#153f2f]">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-600/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-emerald-400/5 blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <img
              src="/logo-icon.png"
              alt="Vaultora"
              className="h-8 w-8 object-contain shrink-0 drop-shadow-xs"
            />
            <span className="text-xl font-bold tracking-tight font-sans text-white">
              vaultora
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-[#0a1f17] border border-emerald-800/60 px-3 py-1 text-xs text-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono tracking-wide text-[11px]">Client Onboarding Portal</span>
          </div>
        </div>

        <div className="my-auto py-12 z-10 space-y-8 max-w-xl">
          <div className="space-y-4">
            <span className="text-xs font-mono tracking-widest text-emerald-200/70 uppercase">
              Institutional Onboarding
            </span>
            <h1 className="text-4xl sm:text-5xl font-normal tracking-tight text-white leading-[1.15]">
              Open your <br />
              <span className="italic font-serif text-emerald-100 font-light">institutional vault.</span>
            </h1>
            <p className="text-sm sm:text-base text-emerald-100/75 leading-relaxed font-normal max-w-md">
              Establish multi-currency reserve vaults with zero-trust ledger proofs, automated compliance verification, and dual-authorization governance.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-800/50 bg-[#091f16]/60 p-5 space-y-3 backdrop-blur-sm">
            <div className="text-xs font-mono text-emerald-300 font-semibold uppercase tracking-wider">
              Institutional Safeguards
            </div>
            <div className="space-y-2.5 text-xs text-emerald-100/80">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Segregated rupee reserve vaults (INR / ₹)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Provable Merkle transaction receipts & inclusion proofs</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Enforced dual-authorization governance on high-value settlements</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT HALF: REGISTRATION FORM OR OTP VERIFICATION */}
      <div className="w-full lg:w-[52%] bg-[#FAF8F5] text-zinc-900 p-8 sm:p-12 lg:p-16 flex flex-col justify-between overflow-y-auto">
        {step === 'otp' ? (
          <div className="w-full max-w-md mx-auto my-auto space-y-6">
            <button
              type="button"
              onClick={() => {
                setStep('form');
                setErrorMessage(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back / Edit Registration Details</span>
            </button>

            <div className="space-y-1.5">
              <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-800 font-semibold flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                STEP 2 OF 2 &bull; EMAIL VERIFICATION REQUIRED
              </span>
              <h2 className="text-3xl font-normal font-serif text-[#123524] tracking-tight">
                Verify your email
              </h2>
              <p className="text-sm text-zinc-600">
                A 6-digit one-time verification code has been dispatched to your registered email. Enter the code below to activate your account and proceed to your home page.
              </p>
            </div>

            {/* Email Dispatch Notice */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 flex items-start gap-3 text-xs text-slate-700">
              <Mail className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div>
                  Verification code sent to: <strong className="font-mono text-slate-900">{pendingUser?.email}</strong>
                </div>
                <p className="text-[11px] text-slate-500">
                  Please check your personal mail inbox (including promotions or spam folder).
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-800 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold">Notice:</span>
                  <div>{errorMessage}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-700 block text-center">
                  Enter 6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  autoFocus
                  value={regOtp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setRegOtp(val);
                    if (val.length === 6) setErrorMessage(null);
                  }}
                  placeholder="• • • • • •"
                  className="w-full text-center tracking-[12px] text-2xl font-mono font-bold text-slate-900 py-3.5 px-4 rounded-xl border border-zinc-200 focus:border-[#123524] focus:ring-1 focus:ring-[#123524] outline-none transition bg-white shadow-xs"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-zinc-500">Didn't receive the code?</span>
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="text-[#123524] font-semibold hover:underline cursor-pointer"
                  >
                    Resend Code
                  </button>
                ) : (
                  <span className="text-zinc-400 font-mono">
                    Resend code in {resendCooldown}s
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={isVerifyingOtp || regOtp.length < 6}
                className="w-full rounded-xl bg-[#123524] hover:bg-[#18442e] text-white py-3.5 px-4 text-sm font-medium tracking-wide flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 mt-2"
              >
                {isVerifyingOtp ? (
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Activating vault & redirecting to home page...</span>
                  </div>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>Verify Code & Enter Home Page</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="w-full max-w-md mx-auto my-auto space-y-6">
          <button
            type="button"
            onClick={onNavigateToLogin}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to sign in</span>
          </button>

          <div className="space-y-1.5">
            <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-600 font-semibold">
              NEW VAULT ACCOUNT
            </span>
            <h2 className="text-3xl font-normal font-serif text-[#123524] tracking-tight">
              Create your vault
            </h2>
            <p className="text-sm text-zinc-600">
              Provide legal entity credentials for underwriting review.
            </p>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-800 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold">Validation Notice:</span>
                <div>{errorMessage}</div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Entity Type Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700">Account Structure</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEntityType('institutional')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                    entityType === 'institutional'
                      ? 'bg-[#123524] text-white border-[#123524]'
                      : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  <span>Institutional</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEntityType('individual')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                    entityType === 'individual'
                      ? 'bg-[#123524] text-white border-[#123524]'
                      : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                  <span>Private Client</span>
                </button>
              </div>
            </div>

            {/* Legal Entity Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700">Legal Entity Name</label>
              <input
                type="text"
                required
                value={legalName}
                onChange={e => setLegalName(e.target.value)}
                placeholder="e.g. Apex Global Treasury LLC"
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-600 focus:border-[#123524] focus:outline-none focus:ring-1 focus:ring-[#123524]"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700">Compliance Contact Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="treasury@apexglobal.io"
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-600 focus:border-[#123524] focus:outline-none focus:ring-1 focus:ring-[#123524]"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700">Master Cryptographic Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 pr-10 text-sm text-zinc-900 placeholder:text-zinc-600 focus:border-[#123524] focus:outline-none focus:ring-1 focus:ring-[#123524]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password strength meter */}
              {password.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
                    <div
                      className={`h-full transition-all duration-300 ${
                        criteriaMet <= 2
                          ? 'w-1/3 bg-rose-500'
                          : criteriaMet <= 4
                          ? 'w-2/3 bg-amber-500'
                          : 'w-full bg-emerald-600'
                      }`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-zinc-600">
                    <span className={hasMinLength ? 'text-emerald-700 font-semibold' : ''}>
                      {hasMinLength ? '✓' : '•'} 12+ characters
                    </span>
                    <span className={hasUpper && hasLower ? 'text-emerald-700 font-semibold' : ''}>
                      {hasUpper && hasLower ? '✓' : '•'} Mixed case (A-z)
                    </span>
                    <span className={hasNumber ? 'text-emerald-700 font-semibold' : ''}>
                      {hasNumber ? '✓' : '•'} Numeric digits
                    </span>
                    <span className={hasSpecial ? 'text-emerald-700 font-semibold' : ''}>
                      {hasSpecial ? '✓' : '•'} Special symbol
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700">Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-600 focus:border-[#123524] focus:outline-none focus:ring-1 focus:ring-[#123524]"
              />
            </div>

            {/* Email Dispatch Notice */}
            <div className="rounded-xl bg-emerald-50/80 border border-emerald-100 p-2.5 text-[11px] text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>A registration confirmation email will be delivered to your inbox upon account creation.</span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-[#123524] hover:bg-[#18442e] text-white py-3 px-4 text-sm font-medium tracking-wide flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60 mt-1"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Provisioning cryptographic vault...</span>
                </div>
              ) : (
                <>
                  <span>Create account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center text-xs text-zinc-600 pt-1">
            <span>Already registered? </span>
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="text-[#123524] font-semibold hover:underline cursor-pointer"
            >
              Sign in to your vault
            </button>
          </div>
        </div>
        )}

        <div className="text-right text-xs text-zinc-600 pt-6 font-mono">
          Vaultora · Institutional Onboarding
        </div>
      </div>
    </div>
  );
};

