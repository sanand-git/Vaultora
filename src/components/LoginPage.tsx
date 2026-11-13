/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Lock,
  ArrowRight,
  AlertTriangle,
  Mail,
  RotateCw,
  ArrowLeft,
  CheckCircle2,
  RefreshCcw,
  Sparkles,
  KeyRound,
  ExternalLink,
  ShieldCheck,
  Clock,
  Send,
  Eye,
  EyeOff
} from 'lucide-react';
import type { UserProfile } from '../types';
import { loadDynamicState } from '../services/dynamicStorage';

interface DynamicPatternChallenge {
  challengeId: string;
  sequence: number[]; // 0-based indices (0..8)
  dotNumbers: number[]; // 1-based indices (1..9)
  description: string;
  createdAt: number;
}

// Procedural dynamic 3x3 pattern walk generator (Guarantees fresh, non-static patterns)
function generateProceduralPattern(targetLength = 5): DynamicPatternChallenge {
  const adjacencyMap: Record<number, number[]> = {
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

  let current = Math.floor(Math.random() * 9);
  const sequence: number[] = [current];

  while (sequence.length < targetLength) {
    const validNeighbors = adjacencyMap[current].filter((n) => !sequence.includes(n));
    if (validNeighbors.length === 0) {
      const remaining = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((n) => !sequence.includes(n));
      if (remaining.length === 0 || sequence.length >= 4) break;
      current = remaining[Math.floor(Math.random() * remaining.length)];
    } else {
      current = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];
    }
    sequence.push(current);
  }

  const challengeId = `PTN-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

  return {
    challengeId,
    sequence,
    dotNumbers: sequence.map((i) => i + 1),
    description: `Dynamic ${sequence.length}-point procedural sequence`,
    createdAt: Date.now()
  };
}

// Coordinates for the 3x3 Pattern Lock Pad (viewBox: 0 0 270 270)
const DOT_COORDINATES = [
  { index: 0, num: 1, x: 45, y: 45 },
  { index: 1, num: 2, x: 135, y: 45 },
  { index: 2, num: 3, x: 225, y: 45 },
  { index: 3, num: 4, x: 45, y: 135 },
  { index: 4, num: 5, x: 135, y: 135 },
  { index: 5, num: 6, x: 225, y: 135 },
  { index: 6, num: 7, x: 45, y: 225 },
  { index: 7, num: 8, x: 135, y: 225 },
  { index: 8, num: 9, x: 225, y: 225 }
];

// Coordinates for the 100x100 Mini Token Visual Pattern Preview
const MINI_DOTS = [
  { x: 22, y: 22 }, { x: 50, y: 22 }, { x: 78, y: 22 },
  { x: 22, y: 50 }, { x: 50, y: 50 }, { x: 78, y: 50 },
  { x: 22, y: 78 }, { x: 50, y: 78 }, { x: 78, y: 78 }
];

interface LoginPageProps {
  users: UserProfile[];
  onLogin: (user: UserProfile) => void;
  onNavigateToRegister?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  users,
  onLogin,
  onNavigateToRegister
}) => {
  // Step 1: 'identifier' (enter email) -> Step 2: 'otp' (verify 6-digit email OTP) -> Step 3: 'pattern' (draw vault pattern)
  const [authStep, setAuthStep] = useState<'identifier' | 'otp' | 'pattern'>('identifier');

  // Pre-fill with stored personal email if exists, otherwise default
  const [identifier, setIdentifier] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vaultora_personal_email') || localStorage.getItem('balancevault_personal_email');
      if (saved) return saved;
    }
    return 'sanandprasad23@gmail.com';
  });

  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // OTP Verification State
  const [otpCode, setOtpCode] = useState('');
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [otpResendCooldown, setOtpResendCooldown] = useState(30);
  const [canResendOtp, setCanResendOtp] = useState(false);

  // Dynamic Pattern Security State (No static hardcoded patterns)
  const [activeChallenge, setActiveChallenge] = useState<DynamicPatternChallenge | null>(null);
  const [drawnSequence, setDrawnSequence] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentCursorPos, setCurrentCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [padStatus, setPadStatus] = useState<'idle' | 'drawing' | 'success' | 'error'>('idle');

  // Rate Limiting & Cooldown
  const [resendCooldown, setResendCooldown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [tokenTimeRemaining, setTokenTimeRemaining] = useState(30);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockCountdown, setLockCountdown] = useState(0);

  const svgPadRef = useRef<SVGSVGElement | null>(null);

  // Rate Limiting & Cooldown Timers
  useEffect(() => {
    let timer: any;
    if (isLocked && lockCountdown > 0) {
      timer = setInterval(() => {
        setLockCountdown((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            setFailedAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isLocked, lockCountdown]);

  // Auto-refresh 30-second virtual security token (TOTP-P)
  useEffect(() => {
    let timer: any;
    if (authStep === 'pattern' && !isLocked) {
      timer = setInterval(() => {
        setTokenTimeRemaining((prev) => {
          if (prev <= 1) {
            // Automatically cycle to fresh dynamic pattern!
            const nextChallenge = generateProceduralPattern(Math.random() > 0.5 ? 5 : 4);
            setActiveChallenge(nextChallenge);
            setDrawnSequence([]);
            setPadStatus('idle');
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [authStep, isLocked]);

  // OTP Resend Cooldown Timer
  useEffect(() => {
    let timer: any;
    if (authStep === 'otp' && otpResendCooldown > 0) {
      timer = setInterval(() => {
        setOtpResendCooldown((prev) => {
          if (prev <= 1) {
            setCanResendOtp(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [authStep, otpResendCooldown]);

  const handleCycleToken = async () => {
    if (isLocked || !selectedUser) return;
    const nextChallenge = generateProceduralPattern(Math.random() > 0.5 ? 5 : 4);
    setActiveChallenge(nextChallenge);
    setTokenTimeRemaining(60);
    setDrawnSequence([]);
    setPadStatus('idle');

    try {
      await fetch('/api/auth/pattern/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedUser.email,
          pattern: nextChallenge
        })
      });
    } catch (err) {
      console.warn('Pattern dispatch error:', err);
    }
  };

  // Step 1: Send OTP to User's Personal Email (STRICTLY RESTRICTED TO REGISTERED USERS)
  const handleIdentifierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    setErrorMessage(null);
    setIsLoading(true);

    const clean = identifier.trim().toLowerCase();
    const isEmail = clean.includes('@');

    // Retrieve full set of registered users from active state & local persistent store
    const allUsers: UserProfile[] = [...users];
    try {
      const stored = loadDynamicState();
      if (stored && Array.isArray(stored.users)) {
        for (const su of stored.users) {
          if (!allUsers.some((u) => u.id === su.id || u.email.toLowerCase() === su.email.toLowerCase())) {
            allUsers.push(su);
          }
        }
      }
    } catch (err) {
      console.warn('[LoginPage] Dynamic storage user load notice:', err);
    }

    // Match strictly against registered users
    let matched: UserProfile | undefined;

    if (isEmail) {
      matched = allUsers.find((u) => u.email.toLowerCase() === clean);
      // Support platform admin email
      if (!matched && clean === 'sanandprasad23@gmail.com') {
        matched = allUsers.find((u) => u.email.toLowerCase() === 'sanandprasad23@gmail.com') ||
                  allUsers.find((u) => u.role === 'admin');
      }
    } else {
      // By admin shortcut or exact registered legal name
      if (clean === 'admin' || clean === 'alex') {
        matched = allUsers.find((u) => u.role === 'admin') || allUsers[0];
      } else {
        matched = allUsers.find(
          (u) =>
            u.name.toLowerCase() === clean ||
            u.id.toLowerCase() === clean
        );
      }
    }

    // CRITICAL USER REQUIREMENT:
    // "user who havent registered shoud not get otp when they try to enter email and trie to get otp"
    // Unregistered users are strictly denied OTP dispatch!
    if (!matched) {
      setIsLoading(false);
      setErrorMessage(
        isEmail
          ? `The email "${identifier.trim()}" is not registered with Vaultora. Please register an account first.`
          : `No registered account found matching "${identifier.trim()}". Please enter your registered email or create an account.`
      );
      return;
    }

    setSelectedUser(matched);

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: matched.email,
          purpose: 'login',
          registeredEmails: allUsers.map((u) => u.email)
        })
      });
      const data = await res.json();
      setIsLoading(false);

      if (data.success) {
        setOtpCode('');
        setOtpResendCooldown(30);
        setCanResendOtp(false);
        setAuthStep('otp');
      } else {
        setErrorMessage(data.error || 'Failed to dispatch verification code. Please check your credentials.');
      }
    } catch {
      setIsLoading(false);
      setErrorMessage('Unable to connect to authentication server. Please check your network connection.');
    }
  };

  // Step 2: Verify 6-digit OTP sent to personal email and unlock vault pattern
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || isLocked) return;
    if (otpCode.trim().length < 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setErrorMessage(null);
    setIsOtpLoading(true);

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedUser.email,
          otp: otpCode.trim()
        })
      });

      const data = await res.json();
      setIsOtpLoading(false);

      if (data.success && data.pattern) {
        setActiveChallenge(data.pattern);
        setTokenTimeRemaining(60);
        setDrawnSequence([]);
        setPadStatus('idle');
        setAuthStep('pattern');
      } else {
        setErrorMessage(data.error || 'Invalid verification code. Please check your personal mail.');
      }
    } catch {
      setIsOtpLoading(false);
      setErrorMessage('Authentication server unreachable. Please check your connection.');
    }
  };

  // Resend OTP to personal email
  const handleResendOtp = async () => {
    if (!canResendOtp || !selectedUser) return;
    setCanResendOtp(false);
    setOtpResendCooldown(30);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: selectedUser.email, purpose: 'login' })
      });
      const data = await res.json();
      if (!data.success) {
        setErrorMessage(data.error || 'Failed to resend verification code.');
      }
    } catch {
      setErrorMessage('Failed to connect to authentication server for resend.');
    }
  };

  // Helper to get SVG-relative coordinates
  const getSvgCoordinates = useCallback((clientX: number, clientY: number) => {
    if (!svgPadRef.current) return null;
    const rect = svgPadRef.current.getBoundingClientRect();
    const x = (clientX - rect.left) * (270 / rect.width);
    const y = (clientY - rect.top) * (270 / rect.height);
    return { x, y };
  }, []);

  // Check if position touches any dot
  const detectDotCollision = useCallback((pos: { x: number; y: number }) => {
    const HIT_RADIUS = 28;
    for (const dot of DOT_COORDINATES) {
      const dist = Math.hypot(pos.x - dot.x, pos.y - dot.y);
      if (dist <= HIT_RADIUS) {
        return dot.index;
      }
    }
    return null;
  }, []);

  // Pattern Verification logic against dynamic challenge
  const verifyDrawnPattern = useCallback(
    (sequence: number[]) => {
      if (!activeChallenge || sequence.length === 0) return;

      const isMatch =
        sequence.length === activeChallenge.sequence.length &&
        sequence.every((val, idx) => val === activeChallenge.sequence[idx]);

      if (isMatch) {
        setPadStatus('success');
        setErrorMessage(null);
        setTimeout(() => {
          if (selectedUser) {
            onLogin(selectedUser);
          }
        }, 500);
      } else {
        setPadStatus('error');
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);

        if (nextAttempts >= 5) {
          setIsLocked(true);
          setLockCountdown(60);
          setErrorMessage('Vault security lockout: 5 invalid pattern entries. System cooldown 60s.');
        } else {
          setErrorMessage(`Invalid pattern. Please check the email sent to ${selectedUser?.email}. (${5 - nextAttempts} attempts remaining)`);
        }

        // Auto-clear after brief delay
        setTimeout(() => {
          setDrawnSequence([]);
          setPadStatus('idle');
          setCurrentCursorPos(null);
        }, 1100);
      }
    },
    [activeChallenge, selectedUser, failedAttempts, onLogin]
  );

  // Mouse Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isLocked || padStatus === 'success') return;
    const coords = getSvgCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    const hit = detectDotCollision(coords);
    if (hit !== null) {
      setIsDrawing(true);
      setPadStatus('drawing');
      setDrawnSequence([hit]);
      setCurrentCursorPos(coords);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing || isLocked || padStatus === 'success') return;
    const coords = getSvgCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    setCurrentCursorPos(coords);
    const hit = detectDotCollision(coords);
    if (hit !== null && !drawnSequence.includes(hit)) {
      setDrawnSequence((prev) => [...prev, hit]);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || isLocked || padStatus === 'success') return;
    setIsDrawing(false);
    setCurrentCursorPos(null);
    verifyDrawnPattern(drawnSequence);
  };

  // Touch Interaction Handlers (for mobile / tablets / touch displays)
  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    if (isLocked || padStatus === 'success') return;
    const touch = e.touches[0];
    const coords = getSvgCoordinates(touch.clientX, touch.clientY);
    if (!coords) return;

    const hit = detectDotCollision(coords);
    if (hit !== null) {
      setIsDrawing(true);
      setPadStatus('drawing');
      setDrawnSequence([hit]);
      setCurrentCursorPos(coords);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (!isDrawing || isLocked || padStatus === 'success') return;
    const touch = e.touches[0];
    const coords = getSvgCoordinates(touch.clientX, touch.clientY);
    if (!coords) return;

    setCurrentCursorPos(coords);
    const hit = detectDotCollision(coords);
    if (hit !== null && !drawnSequence.includes(hit)) {
      setDrawnSequence((prev) => [...prev, hit]);
    }
  };

  const handleTouchEnd = () => {
    if (!isDrawing || isLocked || padStatus === 'success') return;
    setIsDrawing(false);
    setCurrentCursorPos(null);
    verifyDrawnPattern(drawnSequence);
  };

  // Click-to-connect support (individual dot click fallback)
  const handleDotClick = (dotIndex: number) => {
    if (isLocked || padStatus === 'success') return;
    if (!drawnSequence.includes(dotIndex)) {
      const next = [...drawnSequence, dotIndex];
      setDrawnSequence(next);
      setPadStatus('drawing');
      if (activeChallenge && next.length === activeChallenge.sequence.length) {
        verifyDrawnPattern(next);
      }
    }
  };

  // Cycle Virtual Security Token
  const handleResendPattern = () => {
    if (isLocked) return;
    handleCycleToken();
  };

  // Pre-fill test persona
  const selectPersona = (u: UserProfile) => {
    setIdentifier(u.email);
    setErrorMessage(null);
  };

  const isAdminSelected = identifier.toLowerCase().includes('admin');

  // Build SVG polyline points string from drawn sequence
  const polylinePoints = drawnSequence
    .map((idx) => {
      const dot = DOT_COORDINATES[idx];
      return `${dot.x},${dot.y}`;
    })
    .join(' ');

  // Last connected dot coordinates for the active dragging line
  const lastDrawnDot =
    drawnSequence.length > 0 ? DOT_COORDINATES[drawnSequence[drawnSequence.length - 1]] : null;

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#08121e] font-sans selection:bg-cyan-900 selection:text-white relative">

      {/* ========================================================= */}
      {/* LEFT COLUMN: Deep Midnight Navy & Luminous Wave Visuals   */}
      {/* Matches target design in reference screenshot             */}
      {/* ========================================================= */}
      <div className="w-full lg:w-1/2 bg-[#070f1c] text-white p-8 sm:p-12 lg:p-14 flex flex-col justify-between relative overflow-hidden border-r border-[#152438]">
        {/* Glowing Luminous Ambient Gradient Orbs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-cyan-600/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[520px] h-[520px] rounded-full bg-emerald-600/15 blur-3xl pointer-events-none" />

        {/* Technical Coordinate Matrix Overlay on Top-Right */}
        <div className="absolute top-8 right-8 w-44 h-44 pointer-events-none opacity-20 hidden md:block">
          <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" stroke="#38bdf8" strokeWidth="0.5">
            <line x1="0" y1="20" x2="100" y2="20" strokeDasharray="2 2" />
            <line x1="0" y1="40" x2="100" y2="40" strokeDasharray="2 2" />
            <line x1="0" y1="60" x2="100" y2="60" strokeDasharray="2 2" />
            <line x1="0" y1="80" x2="100" y2="80" strokeDasharray="2 2" />
            <line x1="20" y1="0" x2="20" y2="100" strokeDasharray="2 2" />
            <line x1="40" y1="0" x2="40" y2="100" strokeDasharray="2 2" />
            <line x1="60" y1="0" x2="60" y2="100" strokeDasharray="2 2" />
            <line x1="80" y1="0" x2="80" y2="100" strokeDasharray="2 2" />
            <circle cx="20" cy="20" r="1.5" fill="#38bdf8" />
            <circle cx="60" cy="60" r="1.5" fill="#38bdf8" />
            <circle cx="80" cy="20" r="1.5" fill="#38bdf8" />
          </svg>
        </div>

        {/* Top Branding */}
        <div className="flex items-center relative z-10">
          <div className="flex items-center gap-3">
            <img
              src="/logo-icon.png"
              alt="Vaultora"
              className="h-8 w-8 object-contain shrink-0 drop-shadow-xs"
            />
            <span className="text-xl font-bold tracking-tight text-white font-sans">
              vaultora
            </span>
          </div>
        </div>

        {/* Luminous Wave Mesh Lines (Background SVG) */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center">
          <svg
            className="w-[140%] h-[120%] opacity-40 -translate-x-12 translate-y-10"
            viewBox="0 0 1000 600"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M-50 420 C 150 280, 320 540, 520 380 C 720 220, 850 480, 1050 320"
              stroke="url(#waveGrad1)"
              strokeWidth="1.5"
            />
            <path
              d="M-50 460 C 170 320, 340 560, 540 400 C 740 240, 870 500, 1050 340"
              stroke="url(#waveGrad2)"
              strokeWidth="1"
            />
            <path
              d="M-50 500 C 190 360, 360 580, 560 420 C 760 260, 890 520, 1050 360"
              stroke="url(#waveGrad1)"
              strokeWidth="0.75"
              strokeDasharray="4 4"
            />
            <path
              d="M-50 380 C 130 240, 300 500, 500 340 C 700 180, 830 440, 1050 280"
              stroke="url(#waveGrad2)"
              strokeWidth="0.8"
            />
            <defs>
              <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.1" />
                <stop offset="35%" stopColor="#38bdf8" stopOpacity="0.7" />
                <stop offset="70%" stopColor="#10b981" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.1" />
              </linearGradient>
              <linearGradient id="waveGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.1" />
                <stop offset="45%" stopColor="#06b6d4" stopOpacity="0.6" />
                <stop offset="85%" stopColor="#34d399" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#047857" stopOpacity="0.1" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Center Content: Headline & Glassmorphism Graphic */}
        <div className="my-10 lg:my-0 space-y-7 max-w-lg relative z-10">
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-widest text-[#7292ab] font-mono font-medium">
              MONEY, ACCOUNTED FOR.
            </p>

            <h1 className="text-4xl sm:text-5xl font-serif font-normal leading-[1.15] text-white">
              Confidence in{' '}
              <span className="relative inline-block font-serif italic text-[#a5f3fc]">
                every
                <svg
                  className="absolute -bottom-1.5 left-0 w-full overflow-visible"
                  height="6"
                  viewBox="0 0 100 6"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M 1 4 Q 50 1, 99 3"
                    stroke="#a5f3fc"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <br />
              transaction.
            </h1>

            <p className="text-sm sm:text-base text-slate-300 font-light leading-relaxed pt-2">
              A clearer view of your accounts, built on an immutable ledger where every entry has its place and mathematically verifiable proof.
            </p>
          </div>

          {/* Floating Glassmorphic Graphic Card */}
          <div className="relative pt-2">
            <div className="relative bg-[#0c1827]/80 backdrop-blur-md text-white rounded-2xl p-5 shadow-2xl border border-[#1d3550] space-y-3.5 max-w-md">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-slate-300">
                  BV / PRIVATE LEDGER
                </span>
              </div>

              <div className="relative h-20 w-full bg-[#08121f]/90 rounded-xl border border-[#16293f] p-2.5 overflow-hidden flex flex-col justify-between">
                <div className="absolute inset-0 pointer-events-none opacity-20">
                  <div className="border-b border-[#38bdf8] h-1/3 w-full" />
                  <div className="border-b border-[#38bdf8] h-1/3 w-full" />
                </div>

                <div className="flex justify-between items-center text-[9px] font-mono text-[#6285a2] z-10">
                  <span>TX-01</span>
                  <span>0.10ms</span>
                  <span>BLOCK 02</span>
                  <span>FINAL</span>
                </div>

                <div className="relative h-9 w-full z-10 flex items-center">
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 36" fill="none" preserveAspectRatio="none">
                    <path
                      d="M 10 24 C 60 10, 110 30, 160 18 C 210 6, 260 26, 310 16"
                      stroke="url(#lineGradient)"
                      strokeWidth="2"
                    />
                    <defs>
                      <linearGradient id="lineGradient" x1="0" y1="0" x2="320" y2="0" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="50%" stopColor="#22d3ee" />
                        <stop offset="75%" stopColor="#a855f7" />
                        <stop offset="100%" stopColor="#c084fc" />
                      </linearGradient>
                    </defs>
                  </svg>

                  <div className="relative w-full flex justify-between px-2 items-center">
                    <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 shadow-sm shadow-cyan-400/80 -translate-y-1" />
                    <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 shadow-sm shadow-cyan-400/80 translate-y-1.5" />
                    <span className="w-2.5 h-2.5 rounded-sm bg-cyan-300 shadow-sm shadow-cyan-300/80 -translate-y-0.5" />
                    <span className="w-2.5 h-2.5 rounded-sm bg-purple-400 shadow-sm shadow-purple-400/80 -translate-y-2" />
                    <span className="w-2.5 h-2.5 rounded-sm bg-purple-400 shadow-sm shadow-purple-400/80 translate-y-1" />
                    <span className="w-2.5 h-2.5 rounded-sm bg-purple-300 shadow-sm shadow-purple-300/80 -translate-y-1" />
                  </div>
                </div>

                <div className="flex justify-between items-center text-[8px] font-mono text-[#4b6a82] z-10">
                  <span>SHA256</span>
                  <span>MERKLE</span>
                  <span>VERIFIED</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-[#182c44] text-[11px]">
                <span className="font-mono text-[10px] tracking-wider uppercase font-semibold text-slate-400">
                  SECURE BY DESIGN
                </span>
                <div className="inline-flex items-center gap-1.5 text-slate-200 font-medium text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Every entry accountable</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT COLUMN: Clean White Auth Panel                      */}
      {/* DIRECT EMAIL DISPATCH - ZERO POPUPS OR MODALS ON PAGE     */}
      {/* ========================================================= */}
      <div className="w-full lg:w-1/2 bg-[#ffffff] text-slate-900 p-8 sm:p-12 lg:p-16 flex flex-col justify-between overflow-y-auto">
        <div className="w-full max-w-md mx-auto my-auto space-y-6">

          {/* ========================================================= */}
          {/* STEP 1: ENTER PERSONAL EMAIL OR USERNAME                  */}
          {/* ========================================================= */}
          {authStep === 'identifier' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1">
                <p className="text-[11px] font-mono font-bold tracking-widest text-[#64748b] uppercase">
                  WELCOME BACK
                </p>
                <h2 className="text-3xl font-serif font-normal text-slate-900">
                  Sign in to your vault
                </h2>
                <p className="text-xs sm:text-sm text-[#64748b]">
                  Enter your email address to receive your 6-digit identity verification code.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold">{errorMessage}</div>
                    {errorMessage.includes('not registered') && onNavigateToRegister && (
                      <button
                        type="button"
                        onClick={onNavigateToRegister}
                        className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium transition cursor-pointer text-[11px]"
                      >
                        <span>Create an account now</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleIdentifierSubmit} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-800">
                      Registered Email Address
                    </label>
                    <span className="text-[10px] text-emerald-600 font-mono font-medium flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                      6-Digit Security OTP
                    </span>
                  </div>
                  <div className="relative flex items-center rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-slate-800 focus-within:ring-1 focus-within:ring-slate-800 transition overflow-hidden shadow-2xs">
                    <div className="px-3.5 py-3 text-slate-400 bg-slate-50/50 border-r border-slate-100 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-slate-500" />
                    </div>
                    <input
                      type="email"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. sanandprasad23@gmail.com"
                      className="w-full bg-transparent px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-[#64748b] mt-1.5 flex items-center gap-1 font-mono">
                    <KeyRound className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>One-time verification code dispatched to your personal mail.</span>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || isLocked || !identifier.trim()}
                  className="w-full rounded-xl bg-[#091322] hover:bg-[#0f1d33] text-white font-medium py-3 px-4 text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-sm disabled:opacity-50 mt-3"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sending verification code...</span>
                    </div>
                  ) : isLocked ? (
                    <span>Locked for security ({lockCountdown}s)</span>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Send 6-Digit Verification OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {onNavigateToRegister && (
                  <div className="text-center pt-1.5">
                    <button
                      type="button"
                      onClick={onNavigateToRegister}
                      className="text-xs text-slate-600 hover:text-slate-900 transition cursor-pointer"
                    >
                      New to Vaultora? <span className="underline underline-offset-2">Create an account</span>
                    </button>
                  </div>
                )}
              </form>

              <div className="flex items-start gap-2 pt-2 text-[11px] text-[#64748b]">
                <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <span>
                  Zero-trust security: Pattern key and 2FA codes are delivered strictly out-of-band to your verified email.
                </span>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 2: ENTER & VERIFY 6-DIGIT EMAIL OTP                  */}
          {/* ========================================================= */}
          {authStep === 'otp' && selectedUser && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <button
                type="button"
                onClick={() => {
                  setAuthStep('identifier');
                  setErrorMessage(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 transition cursor-pointer font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change email / Back</span>
              </button>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 border border-sky-200">
                    STEP 2: EMAIL VERIFICATION
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {selectedUser.name} &bull; {selectedUser.role.toUpperCase()}
                  </span>
                </div>
                <h2 className="text-3xl font-serif font-normal text-slate-900">
                  Verify your email
                </h2>
                <p className="text-xs sm:text-sm text-[#64748b]">
                  We sent a 6-digit verification code to{' '}
                  <strong className="text-slate-900 font-semibold">{selectedUser.email}</strong>.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold">{errorMessage}</div>
                    {errorMessage.includes('not registered') && onNavigateToRegister && (
                      <button
                        type="button"
                        onClick={onNavigateToRegister}
                        className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium transition cursor-pointer text-[11px]"
                      >
                        <span>Create an account now</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Verification OTP Form */}
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    6-Digit Verification Code
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={6}
                      autoFocus
                      value={otpCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setOtpCode(val);
                        if (val.length === 6) {
                          setErrorMessage(null);
                        }
                      }}
                      placeholder="• • • • • •"
                      className="w-full text-center tracking-[12px] text-2xl font-mono font-bold text-slate-900 py-3.5 px-4 rounded-xl border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 outline-none transition bg-white shadow-2xs"
                    />
                  </div>
                </div>

                {/* Inbox Dispatch Notice */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5 text-xs text-slate-600">
                  <Mail className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    A 6-digit verification code was dispatched directly to <strong className="text-slate-900 font-mono">{selectedUser?.email || identifier}</strong>. Please check your personal mail.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isOtpLoading || otpCode.length < 6}
                  className="w-full rounded-xl bg-[#091322] hover:bg-[#0f1d33] text-white font-medium py-3 px-4 text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isOtpLoading ? (
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verifying code...</span>
                    </div>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Verify & Reveal Vault Pattern</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                  <span>Didn&apos;t receive code?</span>
                  <button
                    type="button"
                    disabled={!canResendOtp}
                    onClick={handleResendOtp}
                    className="text-xs font-semibold text-slate-800 hover:underline disabled:text-slate-400 disabled:no-underline cursor-pointer"
                  >
                    {canResendOtp ? 'Resend code' : `Resend in ${otpResendCooldown}s`}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 3: DRAW AUTHENTICATED VAULT PATTERN                  */}
          {/* ========================================================= */}
          {authStep === 'pattern' && selectedUser && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <button
                type="button"
                onClick={() => {
                  setAuthStep('otp');
                  setErrorMessage(null);
                  setDrawnSequence([]);
                  setPadStatus('idle');
                }}
                className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 transition cursor-pointer font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to verification</span>
              </button>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    EMAIL OTP VERIFIED
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {selectedUser.name} &bull; {selectedUser.role.toUpperCase()}
                  </span>
                </div>
                <h2 className="text-2xl font-serif font-normal text-slate-900">
                  Draw your vault security pattern
                </h2>
                <p className="text-xs text-[#64748b]">
                  Email verified. Trace the authorized one-time pattern below to unlock your vault.
                </p>
              </div>

              {/* Virtual Security Token Notice (NO PATTERN DISPLAY ON SCREEN - EMAILED ONLY) */}
              <div className="rounded-2xl bg-[#091322] border border-[#1e344f] p-4 text-white shadow-md space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white tracking-wide flex items-center gap-1.5">
                        <span>PATTERN DISPATCHED TO EMAIL</span>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Ref: {activeChallenge?.challengeId || 'TOKEN-ACTIVE'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Live countdown timer */}
                    <div className="flex items-center gap-1.5 bg-[#0d1c31] px-2.5 py-1 rounded-lg border border-slate-700/60">
                      <Clock className={`w-3 h-3 ${tokenTimeRemaining <= 10 ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`} />
                      <span className="text-xs font-mono font-bold text-white">{tokenTimeRemaining}s</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCycleToken}
                      title="Resend pattern to your personal email"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0d1c31] hover:bg-[#142944] text-slate-300 hover:text-white border border-slate-700/60 text-xs transition cursor-pointer"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span className="text-[10px] font-mono">Resend</span>
                    </button>
                  </div>
                </div>

                {/* Secure Instructions Banner */}
                <div className="bg-[#0d1c31]/90 rounded-xl p-3.5 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                    <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Dynamic Pattern Sent in Second Email Message</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    A dynamic 3×3 pattern key and visual diagram have been sent to{' '}
                    <strong className="text-white font-mono">{selectedUser.email}</strong>.
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Check your email inbox for your one-time pattern sequence, then trace it on the 3×3 security pad below.
                  </p>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* The 3x3 Interactive Pattern Drawing Pad */}
              <div className="flex flex-col items-center space-y-3 pt-1">
                <div
                  className={`relative w-[280px] h-[280px] rounded-3xl p-2 select-none touch-none transition-all duration-300 ${
                    padStatus === 'success'
                      ? 'bg-[#062c20] border-2 border-emerald-400 shadow-xl shadow-emerald-500/20'
                      : padStatus === 'error'
                      ? 'bg-[#2b0d14] border-2 border-rose-500 shadow-xl shadow-rose-500/20 animate-shake'
                      : 'bg-[#08121f] border border-[#1e344f] shadow-lg'
                  }`}
                >
                  <svg
                    ref={svgPadRef}
                    viewBox="0 0 270 270"
                    className="w-full h-full cursor-crosshair"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    <defs>
                      <linearGradient id="patternLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="50%" stopColor="#22d3ee" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                      <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    {isDrawing && currentCursorPos && lastDrawnDot && (
                      <line
                        x1={lastDrawnDot.x}
                        y1={lastDrawnDot.y}
                        x2={currentCursorPos.x}
                        y2={currentCursorPos.y}
                        stroke="#38bdf8"
                        strokeWidth="3.5"
                        strokeDasharray="4 3"
                        strokeLinecap="round"
                      />
                    )}

                    {drawnSequence.length > 1 && (
                      <polyline
                        points={polylinePoints}
                        fill="none"
                        stroke={padStatus === 'error' ? '#f43f5e' : 'url(#patternLineGrad)'}
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        filter="url(#glowFilter)"
                      />
                    )}

                    {DOT_COORDINATES.map((dot) => {
                      const isConnected = drawnSequence.includes(dot.index);
                      const stepOrder = drawnSequence.indexOf(dot.index);
                      const isFirst = stepOrder === 0;

                      return (
                        <g
                          key={dot.index}
                          onClick={() => handleDotClick(dot.index)}
                          className="cursor-pointer"
                        >
                          <circle cx={dot.x} cy={dot.y} r="28" fill="transparent" />

                          <circle
                            cx={dot.x}
                            cy={dot.y}
                            r={isConnected ? '20' : '15'}
                            fill={
                              isConnected
                                ? padStatus === 'error'
                                  ? 'rgba(244, 63, 94, 0.2)'
                                  : 'rgba(16, 185, 129, 0.25)'
                                : 'rgba(255, 255, 255, 0.03)'
                            }
                            stroke={
                              isConnected
                                ? padStatus === 'error'
                                  ? '#f43f5e'
                                  : isFirst
                                  ? '#38bdf8'
                                  : '#10b981'
                                : '#1e334d'
                            }
                            strokeWidth={isConnected ? '2' : '1.5'}
                            className="transition-all duration-200"
                          />

                          <circle
                            cx={dot.x}
                            cy={dot.y}
                            r={isConnected ? '8' : '6'}
                            fill={
                              isConnected
                                ? padStatus === 'error'
                                  ? '#f43f5e'
                                  : isFirst
                                  ? '#38bdf8'
                                  : '#10b981'
                                : '#64748b'
                            }
                            className="transition-all duration-150"
                          />

                          {isConnected && (
                            <text
                              x={dot.x}
                              y={dot.y - 12}
                              textAnchor="middle"
                              fill="#ffffff"
                              fontSize="9"
                              fontFamily="monospace"
                              fontWeight="bold"
                              className="pointer-events-none drop-shadow"
                            >
                              {stepOrder + 1}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>

                <div className="text-center text-xs font-mono">
                  {padStatus === 'idle' && (
                    <span className="text-slate-500">
                      Trace the visual token pattern &bull; {drawnSequence.length} dots connected
                    </span>
                  )}
                  {padStatus === 'drawing' && (
                    <span className="text-cyan-600 font-semibold">
                      Tracing: Dot {drawnSequence.map((i) => i + 1).join(' → Dot ')}
                    </span>
                  )}
                  {padStatus === 'success' && (
                    <span className="text-emerald-600 font-bold flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                      <span>Security Token Authenticated! Opening vault...</span>
                    </span>
                  )}
                  {padStatus === 'error' && (
                    <span className="text-rose-600 font-bold">
                      Pattern mismatch. Match the active security token and try again.
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1 w-full max-w-[280px]">
                  <button
                    type="button"
                    onClick={() => {
                      setDrawnSequence([]);
                      setPadStatus('idle');
                      setErrorMessage(null);
                    }}
                    disabled={drawnSequence.length === 0 || padStatus === 'success'}
                    className="flex-1 py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-40 shadow-2xs"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
                    <span>Clear Pad</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCycleToken}
                    disabled={isLocked || padStatus === 'success'}
                    className="flex-1 py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-40 shadow-2xs"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Cycle Token</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        <div className="text-center text-xs text-slate-400 pt-6 border-t border-slate-100">
          Vaultora &middot; Institutional Vault Platform
        </div>
      </div>
    </div>
  );
};
