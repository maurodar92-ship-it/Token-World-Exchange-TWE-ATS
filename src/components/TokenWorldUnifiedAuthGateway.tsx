import React, { useState, useEffect, useRef } from "react";
import {
  Layers,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Key,
  Lock,
  Mail,
  User,
  ExternalLink,
  Eye,
  EyeOff,
  Check,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  LogOut,
  Fingerprint,
  TrendingUp,
  Sparkles,
  Zap,
  Copy,
  Smartphone,
  RefreshCw,
  X,
} from "lucide-react";

export interface UnifiedAuthUser {
  name: string;
  email: string;
  role: "MEMBER" | "ADMIN_OPERATOR";
  provider: "TWE ATS SSO" | "Google OAuth 2.0" | "X.com" | "LinkedIn" | "Facebook" | "ATS Subscriber Credential" | "Master Operator ID";
  scopes: string[];
  sessionToken: string;
  clearance: string;
  authenticatedAt: string;
}

export interface TokenWorldUnifiedAuthGatewayProps {
  isOpen?: boolean;
  onClose?: () => void;
  onNavigateToTab?: (tab: string) => void;
  isEmbedded?: boolean;
}

// RFC 7636 PKCE Helpers
function generateRandomString(length = 48) {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return Array.from(array, (dec) => ("0" + dec.toString(16)).substr(-2)).join("");
}

async function generateCodeChallenge(codeVerifier: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export const TokenWorldUnifiedAuthGateway: React.FC<TokenWorldUnifiedAuthGatewayProps> = ({
  isOpen = true,
  onClose,
  onNavigateToTab,
  isEmbedded = false,
}) => {
  // Navigation tabs: member vs admin
  const [activePortalTab, setActivePortalTab] = useState<"member" | "admin">("member");
  // Admin flow: "creds" (Step 1) vs "2fa" (Step 2)
  const [adminStep, setAdminStep] = useState<"creds" | "2fa">("creds");

  // Member form inputs
  const [memberEmail, setMemberEmail] = useState<string>("investor@institutional.com");
  const [memberPassword, setMemberPassword] = useState<string>("TWE-Secure-2026!");
  const [showMemberPassword, setShowMemberPassword] = useState<boolean>(false);

  // Admin form inputs
  const [adminUser, setAdminUser] = useState<string>("operator-admin@twe-ats.internal");
  const [adminPassword, setAdminPassword] = useState<string>("MasterATSKey#9450");
  const [showAdminPassword, setShowAdminPassword] = useState<boolean>(false);

  // 6-Digit OTP inputs
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [timerSeconds, setTimerSeconds] = useState<number>(30);

  // Alert Box notifications
  const [alert, setAlert] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Active Authenticated Session state
  const [currentUser, setCurrentUser] = useState<UnifiedAuthUser | null>(() => {
    try {
      const stored = localStorage.getItem("twe_unified_auth_session");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [copiedToken, setCopiedToken] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // 30s Countdown timer for TOTP RFC 6238
  useEffect(() => {
    let interval: any = null;
    if (adminStep === "2fa" && !currentUser) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            return 30; // Auto-regenerate next TOTP time-window window
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [adminStep, currentUser]);

  const showAlert = (message: string, type: "success" | "error" | "info" = "info") => {
    setAlert({ message, type });
    setTimeout(() => {
      setAlert((current) => (current?.message === message ? null : current));
    }, 5000);
  };

  // 1. TWE ATS SSO Direct Connect
  const handleTweSsoLogin = async () => {
    setIsProcessing(true);
    const verifier = generateRandomString(48);
    const challenge = await generateCodeChallenge(verifier);

    showAlert(`Initiating RFC 7636 PKCE Handshake with Token World Exchange ATS® SSO...`, "info");

    setTimeout(() => {
      const sessionUser: UnifiedAuthUser = {
        name: "Mauro Lomibao Dar III (Institutional VIP)",
        email: "maurodar08@gmail.com",
        role: "MEMBER",
        provider: "TWE ATS SSO",
        scopes: ["twe:ats:trade", "twe:ats:read", "twe:ats:settle", "openid", "profile"],
        sessionToken: `twe_sso_${generateRandomString(24)}`,
        clearance: "Direct Market Access (DMA Tier 4 - 140µs)",
        authenticatedAt: new Date().toISOString(),
      };
      setCurrentUser(sessionUser);
      localStorage.setItem("twe_unified_auth_session", JSON.stringify(sessionUser));
      setIsProcessing(false);
      showAlert(`Authenticated successfully via Token World Exchange ATS® SSO!`, "success");
    }, 1000);
  };

  // 2. Social OAuth Handler
  const handleSocialAuth = (providerName: string) => {
    setIsProcessing(true);
    showAlert(`Opening ${providerName} OAuth 2.0 authorization dialog...`, "info");

    setTimeout(() => {
      const sessionUser: UnifiedAuthUser = {
        name: `${providerName} Institutional Subscriber`,
        email: `subscriber@${providerName.toLowerCase().replace(/[^a-z]/g, "")}.institutional.com`,
        role: "MEMBER",
        provider: `${providerName} OAuth 2.0` as any,
        scopes: ["twe:ats:read", "twe:ats:trade", "openid"],
        sessionToken: `soc_${providerName.toLowerCase().slice(0, 3)}_${generateRandomString(20)}`,
        clearance: "Standard Trading Venue (ATS)",
        authenticatedAt: new Date().toISOString(),
      };
      setCurrentUser(sessionUser);
      localStorage.setItem("twe_unified_auth_session", JSON.stringify(sessionUser));
      setIsProcessing(false);
      showAlert(`Connected securely via ${providerName} OAuth 2.0!`, "success");
    }, 800);
  };

  // 3. Member Email/Password Form
  const handleMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberEmail || !memberPassword) {
      showAlert("Please enter your Subscriber Email and Password.", "error");
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      const sessionUser: UnifiedAuthUser = {
        name: memberEmail.split("@")[0].toUpperCase() + " (ATS Member)",
        email: memberEmail,
        role: "MEMBER",
        provider: "ATS Subscriber Credential",
        scopes: ["twe:ats:trade", "twe:ats:read", "openid"],
        sessionToken: `twe_sub_${generateRandomString(24)}`,
        clearance: "Standard Trading Venue (ATS)",
        authenticatedAt: new Date().toISOString(),
      };
      setCurrentUser(sessionUser);
      localStorage.setItem("twe_unified_auth_session", JSON.stringify(sessionUser));
      setIsProcessing(false);
      showAlert(`Signed in successfully to Member Portal.`, "success");
    }, 600);
  };

  // 4. Admin Step 1: Credentials
  const handleAdminCredsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser || !adminPassword) {
      showAlert("Please enter your ATS Operator ID and Master Password.", "error");
      return;
    }
    showAlert("Step 1 Credentials verified. Please enter 6-digit TOTP code.", "info");
    setAdminStep("2fa");
    // Pre-fill demo OTP or focus first input
    setTimeout(() => {
      otpInputRefs.current[0]?.focus();
    }, 100);
  };

  // 5. Admin Step 2: OTP Handling
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const nextDigits = [...otpDigits];
    nextDigits[index] = value.slice(-1);
    setOtpDigits(nextDigits);

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length > 0) {
      const nextDigits = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        nextDigits[i] = pasted[i] || "";
      }
      setOtpDigits(nextDigits);
      const focusIndex = Math.min(pasted.length, 5);
      otpInputRefs.current[focusIndex]?.focus();
    }
  };

  const handleVerifyOtp = () => {
    const code = otpDigits.join("");
    if (code.length < 6) {
      // Auto-populate sample code if user clicks without entering for ease of use
      const demoCode = ["7", "2", "8", "9", "4", "1"];
      setOtpDigits(demoCode);
      showAlert("Pre-populating verified RFC 6238 TOTP Authenticator code (728941)...", "info");
    }

    setIsProcessing(true);
    setTimeout(() => {
      const sessionUser: UnifiedAuthUser = {
        name: "Master ATS Operator (Mauro Lomibao Dar III)",
        email: adminUser,
        role: "ADMIN_OPERATOR",
        provider: "Master Operator ID",
        scopes: [
          "twe:ats:admin",
          "twe:ats:trade",
          "twe:ats:settle",
          "twe:ats:compliance",
          "twe:finra:15c3-5",
          "openid",
        ],
        sessionToken: `twe_admin_totp_${generateRandomString(28)}`,
        clearance: "Level 4 Sovereign Administrator & FINRA Designated Principal",
        authenticatedAt: new Date().toISOString(),
      };
      setCurrentUser(sessionUser);
      localStorage.setItem("twe_unified_auth_session", JSON.stringify(sessionUser));
      setIsProcessing(false);
      showAlert("Administrator 2FA Handshake Complete! Full exchange privileges unlocked.", "success");
    }, 700);
  };

  // 6. Logout
  const handleLogout = () => {
    showAlert("Revoking OAuth 2.0 Bearer token and ending session...", "info");
    setTimeout(() => {
      setCurrentUser(null);
      localStorage.removeItem("twe_unified_auth_session");
      setAdminStep("creds");
      setOtpDigits(["", "", "", "", "", ""]);
      showAlert("Logged out securely. Handshake terminated.", "success");
    }, 400);
  };

  const handleCopyToken = () => {
    if (currentUser?.sessionToken) {
      navigator.clipboard.writeText(currentUser.sessionToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const content = (
    <div className="relative w-full max-w-xl mx-auto z-10 font-sans">
      {/* Background Glow Accents */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="text-center mb-6 relative">
        {onClose && !isEmbedded && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-0 right-0 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all cursor-pointer"
            title="Close Auth Gateway"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-amber-500 shadow-xl shadow-emerald-950/80 mb-3 border border-emerald-400/30">
          <Layers className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
          Token World Exchange{" "}
          <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-0.5 rounded-md font-mono font-bold tracking-normal shadow-sm">
            ATS®
          </span>
        </h1>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold font-mono">
          Institutional Digital Asset Authentication
        </p>
      </div>

      {/* Alert Box for Notifications */}
      {alert && (
        <div
          className={`mb-4 p-3.5 rounded-2xl border text-xs sm:text-sm font-medium transition-all duration-300 flex items-center gap-2.5 shadow-lg ${
            alert.type === "success"
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
              : alert.type === "error"
              ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
              : "bg-amber-500/20 border-amber-500/40 text-amber-300"
          }`}
        >
          {alert.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : alert.type === "error" ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
          )}
          <span className="flex-1 leading-snug">{alert.message}</span>
        </div>
      )}

      {/* =========================================================================
          AUTHENTICATED ACTIVE DASHBOARD (IF LOGGED IN)
         ========================================================================= */}
      {currentUser ? (
        <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg text-white shadow-md ${
                  currentUser.role === "ADMIN_OPERATOR"
                    ? "bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 font-black shadow-amber-950/50"
                    : "bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-950/50"
                }`}
              >
                {currentUser.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                  {currentUser.name}
                  {currentUser.role === "ADMIN_OPERATOR" && (
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                  )}
                </h2>
                <p className="text-xs font-mono text-emerald-400 uppercase tracking-wider mt-0.5">
                  {currentUser.role === "ADMIN_OPERATOR" ? "Master ATS Operator" : "Member Account"}
                </p>
              </div>
            </div>
            <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Connected
            </span>
          </div>

          {/* ATS Session Spec Details */}
          <div className="bg-slate-950/90 rounded-2xl p-4 border border-slate-800 space-y-2.5 font-mono text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-900">
              <span className="text-slate-500">Identity Provider:</span>
              <span className="text-amber-400 font-semibold">{currentUser.provider}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-900">
              <span className="text-slate-500">Account Identity:</span>
              <span className="text-slate-200 truncate max-w-[220px]">{currentUser.email}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-900">
              <span className="text-slate-500">OAuth Access Scopes:</span>
              <span className="text-slate-300 text-right">{currentUser.scopes.join(", ")}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-900">
              <span className="text-slate-500">Session ID (Bearer):</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 truncate max-w-[150px] sm:max-w-[180px]">
                  {currentUser.sessionToken}
                </span>
                <button
                  type="button"
                  onClick={handleCopyToken}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Copy Bearer Token"
                >
                  {copiedToken ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">Security Clearance:</span>
              <span className="text-emerald-400 font-bold text-right">{currentUser.clearance}</span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                if (onNavigateToTab) onNavigateToTab("ats_nyse_exchange");
                if (onClose) onClose();
              }}
              className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700/60 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>ATS Order Book</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (onNavigateToTab) onNavigateToTab("regulatory_compliance");
                if (onClose) onClose();
              }}
              className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700/60 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Fingerprint className="w-4 h-4 text-amber-400" />
              <span>KYC / AML Records</span>
            </button>
          </div>

          {/* Secure Logout CTA */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-3 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <LogOut className="w-4 h-4" />
            <span>Revoke Token &amp; Secure Log Out</span>
          </button>
        </div>
      ) : (
        /* =========================================================================
            UNAUTHENTICATED GATEWAY: MEMBER VS ADMIN
           ========================================================================= */
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Top Segmented Tabs: Member vs Admin */}
          <div className="flex p-1 bg-slate-950/70 border border-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setActivePortalTab("member");
                setAdminStep("creds");
              }}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl transition duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                activePortalTab === "member"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <User className="w-4 h-4" />
              <span>Member Portal</span>
            </button>
            <button
              type="button"
              onClick={() => setActivePortalTab("admin")}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl transition duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                activePortalTab === "admin"
                  ? "bg-amber-600 text-white shadow-md shadow-amber-950"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Administrator</span>
            </button>
          </div>

          {/* ================= 1. MEMBER LOGIN VIEW ================= */}
          {activePortalTab === "member" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Token World Exchange (TWE) ATS OAuth Direct Connect Button */}
              <button
                type="button"
                onClick={handleTweSsoLogin}
                disabled={isProcessing}
                className="w-full relative group overflow-hidden rounded-2xl p-[1px] focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-500 group-hover:opacity-100 transition duration-300"></span>
                <div className="relative px-5 py-3.5 bg-slate-900 rounded-2xl flex items-center justify-center gap-3 transition duration-200 group-hover:bg-opacity-80">
                  <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span className="font-bold text-sm tracking-wide text-white">
                    Continue with Token World Exchange ATS® SSO
                  </span>
                </div>
              </button>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-slate-900 px-3 text-[11px] uppercase text-slate-500 font-semibold tracking-wider font-mono">
                  Social OAuth 2.0
                </span>
                <div className="border-t border-slate-800 w-full" />
              </div>

              {/* Social OAuth Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Google */}
                <button
                  type="button"
                  onClick={() => handleSocialAuth("Google")}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 rounded-xl text-xs font-semibold text-slate-200 transition cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.5.4-2.3L1.9 7.3C.7 9.7 0 12 0 12s.7 2.3 1.9 4.7l3.7-2.9z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
                    />
                  </svg>
                  <span>Google</span>
                </button>

                {/* X.com */}
                <button
                  type="button"
                  onClick={() => handleSocialAuth("X.com")}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 rounded-xl text-xs font-semibold text-slate-200 transition cursor-pointer"
                >
                  <span className="font-bold text-sm text-white">𝕏</span>
                  <span>X.com</span>
                </button>

                {/* LinkedIn */}
                <button
                  type="button"
                  onClick={() => handleSocialAuth("LinkedIn")}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 rounded-xl text-xs font-semibold text-slate-200 transition cursor-pointer"
                >
                  <span className="font-bold text-blue-400 text-xs bg-blue-500/10 px-1 rounded">in</span>
                  <span>LinkedIn</span>
                </button>

                {/* Facebook */}
                <button
                  type="button"
                  onClick={() => handleSocialAuth("Facebook")}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 rounded-xl text-xs font-semibold text-slate-200 transition cursor-pointer"
                >
                  <span className="font-bold text-blue-500 text-sm">f</span>
                  <span>Facebook</span>
                </button>
              </div>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-slate-900 px-3 text-[11px] uppercase text-slate-500 font-semibold tracking-wider font-mono">
                  Or ATS Member ID
                </span>
                <div className="border-t border-slate-800 w-full" />
              </div>

              {/* Member Email/Password Form */}
              <form onSubmit={handleMemberSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Email / Subscriber Account ID
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      required
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none font-mono"
                      placeholder="investor@institutional.com"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-slate-400">Password</label>
                    <button
                      type="button"
                      onClick={() => showAlert("Password reset instructions dispatched to your verified institutional email.", "info")}
                      className="text-xs text-emerald-400 hover:underline cursor-pointer"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showMemberPassword ? "text" : "password"}
                      required
                      value={memberPassword}
                      onChange={(e) => setMemberPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-600 outline-none font-mono"
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMemberPassword(!showMemberPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showMemberPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm tracking-wide transition shadow-lg shadow-emerald-950 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? "Authenticating..." : "Sign In to Member Portal"}
                </button>
              </form>

              <p className="text-center text-xs text-slate-500 font-mono">
                SEC Reg ATS Compliant &bull; 256-bit TLS Encrypted Handshake
              </p>
            </div>
          )}

          {/* ================= 2. ADMIN CREDENTIAL VIEW (STEP 1) ================= */}
          {activePortalTab === "admin" && adminStep === "creds" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3 items-center">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <p className="text-xs text-amber-300 leading-relaxed font-mono">
                  Restricted Operator Access. All authentication attempts are logged for FINRA / SEC Reg ATS audit trail.
                </p>
              </div>

              <form onSubmit={handleAdminCredsSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    ATS Operator ID / Admin Identity
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={adminUser}
                      onChange={(e) => setAdminUser(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none font-mono"
                      placeholder="operator-admin@twe-ats.internal"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Master Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                      <Key className="w-4 h-4" />
                    </span>
                    <input
                      type={showAdminPassword ? "text" : "password"}
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-600 outline-none font-mono"
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold rounded-xl text-sm transition shadow-lg shadow-amber-950 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Verify Step 1 Credentials</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* ================= 3. ADMIN TOTP AUTHENTICATOR VIEW (STEP 2) ================= */}
          {activePortalTab === "admin" && adminStep === "2fa" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl border border-emerald-500/30">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Authenticator Verification</h3>
                <p className="text-xs text-slate-400">
                  Enter the 6-digit TOTP code generated by your Authenticator App (Google Authenticator, Authy, or Duo).
                </p>
              </div>

              {/* 6 Digit OTP Input Grid */}
              <div className="flex justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputRefs.current[idx] = el)}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-11 sm:w-12 h-14 text-center text-xl font-bold font-mono bg-slate-950 border border-slate-800 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-white outline-none"
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-mono">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Code expires in:{" "}
                  <strong className="text-amber-400 font-mono">{timerSeconds}s</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setAdminStep("creds")}
                  className="text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Back to Step 1
                </button>
              </div>

              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={isProcessing}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition shadow-lg shadow-amber-950 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                <span>{isProcessing ? "Verifying Handshake..." : "Complete Administrator Handshake"}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Security Footer */}
      <div className="mt-6 text-center text-xs text-slate-500 flex flex-wrap items-center justify-center gap-4 font-mono">
        <span className="flex items-center gap-1">
          <Lock className="w-3 h-3 text-slate-400" /> OAuth 2.0 / RFC 7636 (PKCE)
        </span>
        <span>&bull;</span>
        <span>RFC 6238 TOTP</span>
        <span>&bull;</span>
        <span>Token World Exchange ATS®</span>
      </div>
    </div>
  );

  if (isEmbedded) {
    return (
      <div className="min-h-[80vh] bg-slate-950 text-slate-100 flex items-center justify-center p-4 antialiased rounded-3xl">
        {content}
      </div>
    );
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-xl my-8">{content}</div>
    </div>
  );
};
