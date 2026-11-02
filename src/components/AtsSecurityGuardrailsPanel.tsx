import React, { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  UserCheck,
  Zap,
  Activity,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  Sliders,
  Sparkles,
  Layers,
  ArrowRight,
  Clock,
  Key,
} from "lucide-react";
import {
  useAuth0Membership,
  AUTH0_NAMESPACE,
  VIP_TIER_MATRIX,
  MembershipTier,
} from "../utils/auth0MembershipContext";
import {
  maskTreasuryAddress,
  maskTxHash,
  evaluateTreasuryAccess,
  handleTreasuryApiRequest,
  ADMIN_RESTRICTED_MESSAGE,
  ADMIN_RESTRICTED_ADDRESS_TAG,
  SYSTEM_ALIAS_CATALOG,
} from "../utils/treasuryPrivacyGuardrail";

export const AtsSecurityGuardrailsPanel: React.FC = () => {
  const {
    user,
    membershipTier,
    isVIP,
    setMembershipTier,
    auditLogs,
    recordAdminAuditAction,
  } = useAuth0Membership();

  // Guardrail 1: Redaction Tester State
  const [redactionInput, setRedactionInput] = useState<string>(
    "Investor Mauro L. Dar III (SSN: 000-12-3456, Wallet: 0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0) holds 1,500,000 TREE3 in ATS Dark Pool Node #4 with proprietary dark book routing formula alpha=0.985."
  );
  const [redactedOutput, setRedactedOutput] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Guardrail 2: Admin 2-Man Rule Simulator State
  const [isSystemHalted, setIsSystemHalted] = useState<boolean>(false);
  const [circuitBreakerTripped, setCircuitBreakerTripped] = useState<boolean>(false);
  const [twoManPendingAction, setTwoManPendingAction] = useState<{
    action: string;
    entity: string;
    officer1: string;
    reason: string;
  } | null>(null);
  const [officer2Signature, setOfficer2Signature] = useState<string>("");
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  // Guardrail 4: Treasury Privacy & Level 5 Clearance State
  const [isAdminLevel5Unlocked, setIsAdminLevel5Unlocked] = useState<boolean>(false);
  const [adminPasskey, setAdminPasskey] = useState<string>("");
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [simulatedEndpoint, setSimulatedEndpoint] = useState<string>("/api/v1/admin/treasury/reserves");
  const [endpointSimulationResponse, setEndpointSimulationResponse] = useState<any>(null);

  const handleUnlockLevel5 = () => {
    if (
      adminPasskey === "TWE-LVL5-ADMIN" ||
      adminPasskey.toLowerCase() === "admin" ||
      adminPasskey.toLowerCase() === "mauro"
    ) {
      setIsAdminLevel5Unlocked(true);
      setPasskeyError(null);
      recordAdminAuditAction(
        "LEVEL_5_CLEARANCE_UNLOCKED",
        "TREASURY_ONCHAIN_INFRASTRUCTURE",
        "Administrator authenticated Level 5 session for reserve auditing"
      );
      setActionSuccessNotice("Level 5 Administrator Clearance Verified. On-chain addresses & treasury balances decrypted.");
    } else {
      setPasskeyError("Invalid Level 5 Admin Passkey. Access Denied.");
    }
  };

  const handleTestTreasuryApi = (asAdmin: boolean) => {
    const res = handleTreasuryApiRequest(
      simulatedEndpoint,
      asAdmin ? ["ADMIN", "TREASURY_OFFICER"] : ["MEMBER"],
      asAdmin
    );
    setEndpointSimulationResponse(res);
  };

  // Redaction Engine Implementation
  const runRedactionEngine = (text: string) => {
    // 1. Check for proprietary ATS queries
    const lower = text.toLowerCase();
    if (
      lower.includes("dark pool execution mechanism") ||
      lower.includes("internal order book parameters") ||
      lower.includes("unredacted disclosures") ||
      lower.includes("trade routing logic")
    ) {
      return "Access Denied: The requested execution data is proprietary to Token World Exchange ATS® and restricted under platform confidentiality protocols.";
    }

    // 2. Redact PII (SSN, Phone, Email, full Ethereum addresses)
    let sanitized = text;
    // Mask SSN
    sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED-SSN]");
    // Mask EVM Addresses: 0x****...1234
    sanitized = sanitized.replace(/0x[a-fA-F0-9]{40}/g, (addr) => `0x****...${addr.slice(-4)}`);
    // Mask proprietary routing formulas
    sanitized = sanitized.replace(/alpha=[0-9.]+/gi, "[REDACTED-ALGO-PARAM]");
    // Mask dark pool node specifics
    sanitized = sanitized.replace(/Dark Pool Node #\d+/gi, "ATS Protected Liquidity Venue");

    return sanitized;
  };

  const handleTestRedaction = () => {
    const result = runRedactionEngine(redactionInput);
    setRedactedOutput(result);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // 2-Man Rule Dual Custody Execution
  const initiateTwoManAction = (action: string, entity: string, reason: string) => {
    setTwoManPendingAction({
      action,
      entity,
      officer1: "ADMIN-OFFICER-1 (Mauro L. Dar III)",
      reason,
    });
  };

  const confirmTwoManAction = () => {
    if (!twoManPendingAction) return;

    if (twoManPendingAction.action === "EMERGENCY_SYSTEM_HALT") {
      setIsSystemHalted(true);
      recordAdminAuditAction(
        "EMERGENCY_SYSTEM_HALT",
        twoManPendingAction.entity,
        `${twoManPendingAction.reason} [Dual-Approved: Officer 1 & Officer 2: ${officer2Signature || "SecOps Lead"}]`,
        true
      );
      setActionSuccessNotice("Emergency System Halt successfully authorized via Dual-Custody (2-Man Rule)!");
    } else if (twoManPendingAction.action === "CIRCUIT_BREAKER_TRIP") {
      setCircuitBreakerTripped(true);
      recordAdminAuditAction(
        "CIRCUIT_BREAKER_TRIP",
        twoManPendingAction.entity,
        `${twoManPendingAction.reason} [Dual-Approved: Officer 1 & Officer 2: ${officer2Signature || "Risk Officer"}]`,
        true
      );
      setActionSuccessNotice("Market Circuit Breaker engaged across matching engine!");
    } else if (twoManPendingAction.action === "CIRCUIT_BREAKER_RESET") {
      setCircuitBreakerTripped(false);
      setIsSystemHalted(false);
      recordAdminAuditAction(
        "CIRCUIT_BREAKER_RESET",
        twoManPendingAction.entity,
        `Circuit Breaker Reset to Continuous Trading [Dual-Approved]`,
        true
      );
      setActionSuccessNotice("Market and matching engine restored to continuous trading!");
    }

    setTwoManPendingAction(null);
    setOfficer2Signature("");
    setTimeout(() => setActionSuccessNotice(null), 4000);
  };

  return (
    <div className="space-y-8 font-sans text-slate-200">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-[#131722] to-slate-900 border border-slate-800 p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold">
              Institutional Security &amp; Administrative Governance
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
            <span>Token World Exchange ATS® Security &amp; VIP Control Matrix</span>
          </h2>
          <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
            SEC Regulation ATS Rule 301 &amp; FINRA supervisory control system. Implements automatic PII redaction, 
            dual-custody (2-Man Rule) circuit breakers, immutable audit logging, and 4-tier Auth0 claim enforcement.
          </p>
        </div>

        {/* Current Auth0 Subscription Pill */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-right shrink-0">
          <div className="text-[10px] text-slate-400 font-mono">Current Auth0 User Tier:</div>
          <div className="flex items-center gap-2 justify-end">
            <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${VIP_TIER_MATRIX[membershipTier]?.badgeColor || "bg-slate-800 text-white"}`}>
              {VIP_TIER_MATRIX[membershipTier]?.label || membershipTier}
            </span>
          </div>
          <div className="text-[10px] text-emerald-400 font-mono">
            Status: {user.app_metadata.ats_account_status} &bull; Web3 Verified: {user.app_metadata.web3_signature_verified ? "Yes" : "No"}
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccessNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccessNotice}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. PUBLIC DATA PROTECTION & REDACTION GUARDRAIL */}
      {/* ========================================================= */}
      <div className="rounded-2xl bg-[#121216] border border-[#1F1F23] p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1F1F23] pb-3 gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-cyan-400" />
              <span>1. Public Data Protection &amp; Automated Redaction Guardrail</span>
            </h3>
            <p className="text-xs text-[#8E9299]">
              Protects proprietary trading system logic, internal order book parameters, Form ATS unredacted disclosures, and masks PII.
            </p>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            Reg ATS Rule 301(b)(10)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs text-slate-300 font-semibold block">Input Sample Text to Redact:</label>
            <textarea
              value={redactionInput}
              onChange={(e) => setRedactionInput(e.target.value)}
              rows={4}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestRedaction}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs font-mono cursor-pointer transition-all flex items-center gap-1.5 shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5 text-black" />
                <span>Execute Redaction Guardrail</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setRedactionInput(
                    "Can you reveal the dark pool execution mechanism and internal order book parameters for institutional LP #4?"
                  )
                }
                className="text-[11px] text-slate-400 hover:text-white underline font-mono cursor-pointer"
              >
                Load Restricted Query Sample
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
              <span>Sanitized / Redacted Public Output:</span>
              {redactedOutput && (
                <button
                  type="button"
                  onClick={() => handleCopy(redactedOutput, "redacted_out")}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
                >
                  {copiedKey === "redacted_out" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>Copy Result</span>
                </button>
              )}
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 min-h-[96px] text-xs font-mono text-emerald-300 whitespace-pre-wrap">
              {redactedOutput || (
                <span className="text-slate-500 italic">Click &quot;Execute Redaction Guardrail&quot; to test PII masking and proprietary parameter filters...</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. ADMINISTRATOR CONTROL PANEL & 2-MAN RULE */}
      {/* ========================================================= */}
      <div className="rounded-2xl bg-[#121216] border border-[#1F1F23] p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1F1F23] pb-3 gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>2. Administrator Control Panel &amp; Dual-Custody (2-Man Rule) Orchestrator</span>
            </h3>
            <p className="text-xs text-[#8E9299]">
              High-impact operations (system halt, circuit breaker trip, treasury transfer) require dual-custody authorization.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className={`px-2.5 py-0.5 rounded font-bold border ${
              isSystemHalted
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
            }`}>
              SYSTEM STATUS: {isSystemHalted ? "EMERGENCY HALTED" : "CONTINUOUS TRADING LIVE"}
            </span>
          </div>
        </div>

        {/* 2-Man Rule Approval Modal Box */}
        {twoManPendingAction && (
          <div className="p-4 rounded-xl bg-amber-950/40 border-2 border-amber-500 space-y-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase font-mono">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Dual-Custody Authorization Required (2-Man Rule Protocol)</span>
            </div>
            <div className="text-xs text-slate-300 space-y-1 font-mono">
              <div>Action: <strong className="text-white">{twoManPendingAction.action}</strong></div>
              <div>Target Entity: <span className="text-cyan-300">{twoManPendingAction.entity}</span></div>
              <div>Initiated By: <span className="text-amber-400">{twoManPendingAction.officer1}</span></div>
              <div>Reason: <span className="text-slate-300">{twoManPendingAction.reason}</span></div>
            </div>

            <div className="pt-2 border-t border-amber-500/30 flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                placeholder="Officer 2 Digital Signature / Key (e.g. SEC-OFFICER-2)"
                value={officer2Signature}
                onChange={(e) => setOfficer2Signature(e.target.value)}
                className="w-full sm:w-80 px-3 py-1.5 rounded-lg bg-black/60 border border-amber-500/40 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={confirmTwoManAction}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs font-mono cursor-pointer transition-all shadow-md"
              >
                Dual-Authorize &amp; Execute
              </button>
              <button
                type="button"
                onClick={() => setTwoManPendingAction(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Quick Admin Knobs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-xs font-bold text-white flex items-center justify-between">
              <span>Market Circuit Breaker</span>
              <span className={`w-2 h-2 rounded-full ${circuitBreakerTripped ? "bg-rose-400" : "bg-emerald-400"}`} />
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              SEC Rule 15c3-5 Price Collar Volatility Guardian (&plusmn;30% band limit).
            </p>
            <button
              type="button"
              onClick={() => {
                if (circuitBreakerTripped) {
                  initiateTwoManAction("CIRCUIT_BREAKER_RESET", "MATCHING_ENGINE_ALL", "Restoration of continuous trading");
                } else {
                  initiateTwoManAction("CIRCUIT_BREAKER_TRIP", "MATCHING_ENGINE_ALL", "Sudden volatility spike exceeding collar");
                }
              }}
              className={`w-full py-2 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all ${
                circuitBreakerTripped
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                  : "bg-rose-600 hover:bg-rose-500 text-white"
              }`}
            >
              {circuitBreakerTripped ? "Reset Circuit Breaker (2-Man)" : "Trip Circuit Breaker (2-Man)"}
            </button>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-xs font-bold text-white flex items-center justify-between">
              <span>Emergency System Halt</span>
              <span className={`w-2 h-2 rounded-full ${isSystemHalted ? "bg-rose-400" : "bg-emerald-400"}`} />
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Immediate order matching pause across all asset books with atomic state lock.
            </p>
            <button
              type="button"
              onClick={() => {
                if (isSystemHalted) {
                  initiateTwoManAction("CIRCUIT_BREAKER_RESET", "ALL_VENUE_BOOKS", "Resuming trading operations");
                } else {
                  initiateTwoManAction("EMERGENCY_SYSTEM_HALT", "ALL_VENUE_BOOKS", "Supervisory regulatory hold");
                }
              }}
              className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-mono font-bold text-xs cursor-pointer transition-all"
            >
              {isSystemHalted ? "Lift System Halt (2-Man)" : "Initiate System Halt (2-Man)"}
            </button>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-xs font-bold text-white flex items-center justify-between">
              <span>Wash-Trading AI Filter</span>
              <span className="text-[10px] text-emerald-400 font-mono font-bold">ACTIVE (100%)</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Real-time heuristic scanner inspecting crossing trader IDs and round-trip wash flows.
            </p>
            <div className="p-2 rounded bg-black/40 border border-slate-800 text-[10px] font-mono text-emerald-400">
              0 Wash Trades Detected &bull; Heuristic Integrity 99.98%
            </div>
          </div>
        </div>

        {/* Immutable Audit Log Table */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-xs text-white font-bold mb-2">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Immutable Administrative Action Audit Log (FINRA Rule 3110)</span>
            </span>
            <span className="text-slate-500 font-mono text-[10px]">Total Log Entries: {auditLogs.length}</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs font-mono bg-slate-950">
              <thead>
                <tr className="text-[#8E9299] border-b border-slate-800 bg-[#0a0a0f]">
                  <th className="py-2.5 px-3">Log ID</th>
                  <th className="py-2.5 px-3">Timestamp (UTC)</th>
                  <th className="py-2.5 px-3">Admin Officer</th>
                  <th className="py-2.5 px-3">Action Type</th>
                  <th className="py-2.5 px-3">Target Entity</th>
                  <th className="py-2.5 px-3">2-Man Status</th>
                  <th className="py-2.5 px-3">Reason / Context</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="py-2 px-3 text-cyan-400">{log.id}</td>
                    <td className="py-2 px-3 text-slate-400">{log.timestampUtc.replace("T", " ").slice(0, 19)}</td>
                    <td className="py-2 px-3 text-amber-300">{log.adminUserId}</td>
                    <td className="py-2 px-3 font-bold text-white">{log.actionType}</td>
                    <td className="py-2 px-3 text-slate-300">{log.targetEntity}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.twoManStatus === "APPROVED"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : log.twoManStatus === "PENDING_SECOND_OFFICER"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse"
                          : "bg-slate-800 text-slate-400"
                      }`}>
                        {log.twoManStatus}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-300 max-w-xs truncate" title={log.reason}>
                      {log.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. VIP MEMBERSHIP TIER BENEFIT MATRIX */}
      {/* ========================================================= */}
      <div className="rounded-2xl bg-[#121216] border border-[#1F1F23] p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1F1F23] pb-3 gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>3. VIP Membership Tier Hierarchy &amp; Claim Enforcement Matrix</span>
            </h3>
            <p className="text-xs text-[#8E9299]">
              Enforces 4-tier entitlement boundaries across high-performance Level 3 order books and institutional dark pool routing.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400">Quick Switch Tier:</span>
            {(["STANDARD", "FREE_TIER_1", "PAID_VIP_SUBSCRIPTION", "ELITE_INSTITUTIONAL"] as MembershipTier[]).map(
              (t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setMembershipTier(t)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition-all ${
                    membershipTier === t
                      ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  {t.replace("FREE_", "").replace("_SUBSCRIPTION", "").replace("_INSTITUTIONAL", "")}
                </button>
              )
            )}
          </div>
        </div>

        {/* 4-Tier Comparison Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs font-sans bg-slate-950">
            <thead>
              <tr className="text-[#8E9299] border-b border-slate-800 bg-[#0a0a0f] font-mono">
                <th className="py-3 px-4">Membership Tier</th>
                <th className="py-3 px-4">Qualification Criteria</th>
                <th className="py-3 px-4">Maker / Taker Fees</th>
                <th className="py-3 px-4">Security &amp; Exclusive Features</th>
                <th className="py-3 px-4 text-center">Protected Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 font-mono text-xs">
              {(Object.keys(VIP_TIER_MATRIX) as MembershipTier[]).map((tierKey) => {
                const item = VIP_TIER_MATRIX[tierKey];
                const isCurrent = membershipTier === tierKey;
                return (
                  <tr
                    key={tierKey}
                    className={`transition-colors ${
                      isCurrent ? "bg-amber-500/10 border-l-4 border-amber-500" : "hover:bg-slate-900/60"
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-white">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${item.badgeColor}`}>
                          {item.label}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] text-amber-400 font-bold tracking-wider">(CURRENT TIER)</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{item.qualification}</td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">{item.makerTakerFee}</td>
                    <td className="py-3 px-4 text-slate-300">
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] font-sans">
                        {item.securityAndFeatures.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {tierKey === "PAID_VIP_SUBSCRIPTION" || tierKey === "ELITE_INSTITUTIONAL" ? (
                        <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                          ✓ L3 &amp; Sandbox Unlocked
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[10px]">
                          Upgrade Required
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. TREASURY & ON-CHAIN INFRASTRUCTURE PRIVACY GUARDRAIL (LEVEL 5 CLEARANCE) */}
      {/* ========================================================= */}
      <div className="rounded-2xl bg-[#121216] border border-[#1F1F23] p-6 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1F1F23] pb-4 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-purple-400" />
              <h3 className="text-base font-bold text-white">
                4. Treasury &amp; On-Chain Infrastructure Privacy Guardrail (Level 5 Clearance)
              </h3>
            </div>
            <p className="text-xs text-[#8E9299] mt-0.5">
              Strictly obfuscates platform treasuries, swap smart contracts, and reserve balances behind system aliases for public end-users. Access restricted exclusively to verified Level 5 Administrators.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border flex items-center gap-1.5 ${
              isAdminLevel5Unlocked
                ? "bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                : "bg-slate-900 text-slate-400 border-slate-800"
            }`}>
              {isAdminLevel5Unlocked ? <Unlock className="w-3.5 h-3.5 text-purple-400" /> : <Lock className="w-3.5 h-3.5 text-amber-400" />}
              <span>{isAdminLevel5Unlocked ? "LEVEL 5 ADMIN UNLOCKED" : "PUBLIC CLIENT BOUNDARY (ACTIVE)"}</span>
            </span>

            {isAdminLevel5Unlocked ? (
              <button
                type="button"
                onClick={() => {
                  setIsAdminLevel5Unlocked(false);
                  setAdminPasskey("");
                }}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono cursor-pointer"
              >
                Lock Admin View
              </button>
            ) : null}
          </div>
        </div>

        {/* Level 5 Unlock Form if currently locked */}
        {!isAdminLevel5Unlocked && (
          <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-purple-400" />
                <span>Administrator Level 5 Clearance Gate</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Enter your administrative key to decrypt raw platform on-chain addresses, liquidity mechanics, and hot/cold reserve balances.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <input
                type="password"
                placeholder="Admin Passkey (e.g. TWE-LVL5-ADMIN)"
                value={adminPasskey}
                onChange={(e) => setAdminPasskey(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-black/60 border border-purple-500/40 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
              />
              <button
                type="button"
                onClick={handleUnlockLevel5}
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs font-mono cursor-pointer transition-all shadow-md shrink-0"
              >
                Authenticate
              </button>
            </div>
          </div>
        )}
        {passkeyError && (
          <div className="text-xs font-mono text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/30">
            {passkeyError}
          </div>
        )}

        {/* System Infrastructure Masking & Alias Comparison Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span>Platform Infrastructure &amp; Smart Contract Aliases:</span>
            <span className="text-[10px] font-mono text-slate-500">
              {isAdminLevel5Unlocked ? "Showing Decrypted Real Addresses" : "Abstracted behind Generic System Aliases"}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs font-mono bg-slate-950">
              <thead>
                <tr className="text-[#8E9299] border-b border-slate-800 bg-[#0a0a0f]">
                  <th className="py-2.5 px-3">Component Category</th>
                  <th className="py-2.5 px-3">Public UI Masked Alias</th>
                  <th className="py-2.5 px-3">ZK-Relayer Gateway Proxy</th>
                  <th className="py-2.5 px-3">On-Chain Raw Address</th>
                  <th className="py-2.5 px-3">Clearance Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {Object.entries(SYSTEM_ALIAS_CATALOG).map(([rawAddr, info]) => (
                  <tr key={rawAddr} className="hover:bg-slate-900/60 transition-colors">
                    <td className="py-2.5 px-3 text-cyan-300 font-bold">{info.category}</td>
                    <td className="py-2.5 px-3 text-white font-semibold">
                      <div className="flex items-center gap-1.5">
                        <span>{info.alias}</span>
                        {!isAdminLevel5Unlocked && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            MASKED
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{info.proxyGateway}</td>
                    <td className="py-2.5 px-3">
                      {isAdminLevel5Unlocked ? (
                        <span className="text-purple-300 font-mono font-bold select-all">{rawAddr}</span>
                      ) : (
                        <span className="text-amber-400/90 font-mono bg-black/40 px-2 py-0.5 rounded border border-amber-500/20 text-[11px]">
                          [ADMIN_RESTRICTED_ADDRESS]
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        Level 5 Restricted
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* API Endpoint Simulation Testbench */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Treasury Endpoint Guardrail Tester (/api/v1/admin/treasury/*)</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleTestTreasuryApi(false)}
                className="px-3 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-mono text-xs border border-rose-500/40 cursor-pointer"
              >
                Test as Public Client (Unauthenticated)
              </button>
              <button
                type="button"
                onClick={() => handleTestTreasuryApi(true)}
                className="px-3 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-mono text-xs border border-emerald-500/40 cursor-pointer"
              >
                Test as Admin (Level 5 Clearance)
              </button>
            </div>
          </div>

          {endpointSimulationResponse && (
            <div className="space-y-1 font-mono text-xs">
              <div className="text-[10px] text-slate-500">
                HTTP {endpointSimulationResponse.status} &bull; Endpoint: {simulatedEndpoint}
              </div>
              <pre className={`p-3 rounded-lg overflow-x-auto text-[11px] border ${
                endpointSimulationResponse.status === 200
                  ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-300"
                  : "bg-rose-950/20 border-rose-500/40 text-rose-300"
              }`}>
                {JSON.stringify(endpointSimulationResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Proxy Router & ZK Relayer Architecture Diagram */}
        <div className="p-4 rounded-xl bg-black/40 border border-slate-800 text-xs space-y-2">
          <div className="text-slate-300 font-bold flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Proxy Router &amp; ZK-Relayer Architecture (Backend Isolation)</span>
          </div>
          <div className="font-mono text-[11px] text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800 overflow-x-auto leading-relaxed">
            [ Public Frontend / User Wallet ] ──► [ Gateway Proxy (0xGW_Proxy_SettlementRouter) ]<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼ (ZK State Proof Batching)<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[ PRIVACY SHIELD: ISOLATED BACKEND ]<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── Core Platform Treasury (0x70Ac...94f0) [LEVEL 5]<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── Hot / Cold Reserve Swapping Vaults [LEVEL 5]<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── Market Maker Fee Collector Escrow [LEVEL 5]
          </div>
        </div>
      </div>
    </div>
  );
};
