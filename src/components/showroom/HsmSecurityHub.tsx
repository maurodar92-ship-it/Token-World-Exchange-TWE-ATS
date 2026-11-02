import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Key, 
  Fingerprint, 
  Cpu, 
  Lock, 
  FileCheck2, 
  Check, 
  Copy, 
  ExternalLink, 
  RefreshCw, 
  Download, 
  AlertTriangle, 
  Zap, 
  Eye, 
  Layers, 
  CheckCircle2,
  Server
} from 'lucide-react';
import { useShowroomSync, Iso20022Message } from '../../context/ShowroomSyncContext';

export const HsmSecurityHub: React.FC = () => {
  const { 
    isoMessages, 
    latencyMs, 
    biometricActive, 
    triggerBiometricAuth,
    lastSyncedTimestamp 
  } = useShowroomSync();

  const [activeIso, setActiveIso] = useState<Iso20022Message>(isoMessages[0]);
  const [isVerifyingBiometric, setIsVerifyingBiometric] = useState<boolean>(false);
  const [biometricFeedback, setBiometricFeedback] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const handleTestBiometric = async () => {
    setIsVerifyingBiometric(true);
    setBiometricFeedback(null);
    await triggerBiometricAuth();
    setIsVerifyingBiometric(false);
    setBiometricFeedback("Biometric signature generated via FIDO2 / Secure Enclave (P-256 ECDSA). Verified.");
    setTimeout(() => setBiometricFeedback(null), 4000);
  };

  const handleCopyXml = () => {
    navigator.clipboard.writeText(activeIso.payloadXmlSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleExportAuditJson = () => {
    const payload = JSON.stringify(isoMessages, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TWE_ATS_ISO20022_AuditLog_${Date.now()}.json`;
    link.click();
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-indigo-950/80 p-5 rounded-3xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                FIPS 140-2 Level 4 HSM &amp; WORM
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Telemetry Ping: <strong className="text-emerald-400">{latencyMs}ms</strong>
              </span>
            </div>
            <h2 className="text-2xl font-black text-white mt-0.5">
              Institutional Security &amp; ISO 20022 Compliance Hub
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportAuditJson}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export ISO Audit JSON</span>
          </button>
        </div>
      </div>

      {/* Grid: 4 Pillars of Institutional Security */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Hardware Security Module (HSM) */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase">Hardware Key Vault</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Server className="w-4 h-4 text-emerald-400" />
            <span>CloudHSM &amp; YubiKey</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 space-y-1">
            <div>&bull; Secure Enclave bound keys</div>
            <div>&bull; Multi-party computation (MPC)</div>
            <div>&bull; Cold-sign threshold: 3-of-5</div>
          </div>
        </div>

        {/* Card 2: Biometric Passkey WebAuthn */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase">FIDO2 / WebAuthn</span>
              <Fingerprint className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-base font-bold text-white">Biometric Passkey</div>
            <div className="text-[11px] text-slate-400 mt-1">
              Touch ID / Face ID hardware signature
            </div>
          </div>

          <button
            onClick={handleTestBiometric}
            disabled={isVerifyingBiometric}
            className="mt-3 w-full py-1.5 px-3 text-xs font-bold bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 rounded-lg flex items-center justify-center gap-1.5 transition-all"
          >
            {isVerifyingBiometric ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Fingerprint className="w-3.5 h-3.5" />
            )}
            <span>{isVerifyingBiometric ? "Scanning Biometrics..." : "Simulate Biometric Auth"}</span>
          </button>
        </div>

        {/* Card 3: SEC Rule 15c3-5 Pre-Trade Risk Collars */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase">Pre-Trade Risk</span>
            <span className="text-[10px] font-mono bg-cyan-500/10 text-cyan-400 px-1.5 py-0.2 rounded border border-cyan-500/20">
              Rule 15c3-5
            </span>
          </div>
          <div className="text-base font-bold text-white">Automated Risk Collars</div>
          <div className="text-[11px] text-slate-400 mt-2 space-y-1">
            <div>&bull; Max single order: $5,000,000</div>
            <div>&bull; Max price band collar: &plusmn;3.0%</div>
            <div>&bull; Sub-150μs pre-trade latency check</div>
          </div>
        </div>

        {/* Card 4: Enterprise RBAC Master Key */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase">Executive Governance</span>
            <Lock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-base font-bold text-white">Mauro Lomibao Dar III</div>
          <div className="text-[11px] text-slate-400 mt-2 space-y-1">
            <div>&bull; Sole Owner &amp; System Architect</div>
            <div>&bull; Exclusive Master Superuser Key</div>
            <div>&bull; Partitioned from general member tiers</div>
          </div>
        </div>
      </div>

      {biometricFeedback && (
        <div className="p-3.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>{biometricFeedback}</span>
        </div>
      )}

      {/* ISO 20022 Messaging Console & XML Payload Inspector */}
      <div className="p-6 rounded-3xl bg-slate-950/80 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-emerald-400" />
              <span>ISO 20022 Financial Messaging &amp; Audit Pipeline</span>
            </h3>
            <p className="text-xs text-slate-400">
              Real-time cross-platform transaction messages formatted in standardized SWIFT / DTCC / FedNow XML structures.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">
              Synchronized: <strong className="text-slate-200">{lastSyncedTimestamp}</strong>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Messages List */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Live ISO Streams:
            </span>
            {isoMessages.map((msg) => (
              <button
                key={msg.id}
                onClick={() => setActiveIso(msg)}
                className={`w-full p-3 rounded-xl border text-left transition-all ${
                  activeIso.id === msg.id
                    ? 'border-emerald-500 bg-emerald-950/20 text-white ring-1 ring-emerald-500'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-400">{msg.messageType}</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    ${msg.settlementAmountUsd.toLocaleString()}
                  </span>
                </div>
                <div className="text-xs font-semibold text-white mt-1 truncate">{msg.name}</div>
                <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                  <span>{msg.senderBic} &rarr; {msg.receiverBic}</span>
                  <span className="text-emerald-400 font-mono">T+0 Atomic</span>
                </div>
              </button>
            ))}
          </div>

          {/* XML Payload Previewer */}
          <div className="lg:col-span-2 bg-slate-900 rounded-2xl border border-slate-800 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-white">{activeIso.messageType}</span>
                  <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono border border-slate-700">
                    Rule: {activeIso.complianceRule}
                  </span>
                </div>
                <button
                  onClick={handleCopyXml}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 border border-slate-700 transition-colors"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? "Copied" : "Copy Payload"}</span>
                </button>
              </div>

              <pre className="font-mono text-xs text-emerald-300/90 bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 overflow-x-auto max-h-56">
                {activeIso.payloadXmlSnippet}
              </pre>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
              <div>
                Sender BIC: <span className="font-mono text-white">{activeIso.senderBic}</span> &bull; Receiver BIC: <span className="font-mono text-white">{activeIso.receiverBic}</span>
              </div>
              <div className="text-emerald-400 font-mono font-semibold">
                Instant Settlement &bull; Cryptographically Sealed
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
