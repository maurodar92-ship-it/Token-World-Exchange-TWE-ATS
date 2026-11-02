import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertOctagon,
  RefreshCw,
  Activity,
  KeyRound,
  Check,
  Copy,
  Download,
  Terminal,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Database,
  X,
  Lock,
  Flame,
  FileCode,
  Sliders,
  ShieldQuestion,
  HelpCircle,
} from "lucide-react";
import { TokenRecord } from "../types";
import {
  MemoryHealthReport,
  runCompleteMemoryHealthCheck,
  selfHealEncryptedVault,
  simulateBlobCorruption,
  subscribeToMemoryHealth,
  startAutomatedHealthMonitoring,
  DEFAULT_SESSION_PASSPHRASE,
  BlobDiagnosticResult,
} from "../utils/memoryHealthDiagnostics";

interface MemoryHealthCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokens: TokenRecord[];
  onHealed?: () => void;
}

export const MemoryHealthCheckModal: React.FC<MemoryHealthCheckModalProps> = ({
  isOpen,
  onClose,
  tokens,
  onHealed,
}) => {
  const [report, setReport] = useState<MemoryHealthReport | null>(null);
  const [isRunningCheck, setIsRunningCheck] = useState<boolean>(false);
  const [isHealing, setIsHealing] = useState<boolean>(false);
  const [passphrase, setPassphrase] = useState<string>(DEFAULT_SESSION_PASSPHRASE);
  const [autoMonitorActive, setAutoMonitorActive] = useState<boolean>(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    runHealthCheck();

    const unsub = subscribeToMemoryHealth((newReport) => {
      setReport(newReport);
    });

    if (autoMonitorActive) {
      startAutomatedHealthMonitoring(15);
    }

    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const runHealthCheck = async () => {
    setIsRunningCheck(true);
    try {
      const rep = await runCompleteMemoryHealthCheck(passphrase);
      setReport(rep);
      if (rep.overallStatus === "corrupted") {
        setNotification("⚠ Decryption Integrity Alert: One or more encrypted blobs failed verification!");
      } else {
        setNotification("✓ Diagnostic completed: Memory health checked across all storage keys.");
      }
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setNotification(`Diagnostic error: ${err?.message || "Execution failure"}`);
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setIsRunningCheck(false);
    }
  };

  const handleSelfHeal = async () => {
    setIsHealing(true);
    try {
      const healedReport = await selfHealEncryptedVault(tokens, passphrase);
      setReport(healedReport);
      setNotification(`✓ Self-Healing Complete: Re-encrypted ${tokens.length} working tokens with verified AES-GCM (256-bit)!`);
      if (onHealed) onHealed();
      setTimeout(() => setNotification(null), 4500);
    } catch (err: any) {
      setNotification(`Self-heal error: ${err?.message || "Failed to rebuild encrypted vault"}`);
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setIsHealing(false);
    }
  };

  const handleSimulateTampering = () => {
    simulateBlobCorruption();
    setNotification("⚡ Simulated Tampering: Injected corruption into localStorage ciphertext. Re-running diagnostics...");
    setTimeout(() => {
      runHealthCheck();
    }, 400);
    setTimeout(() => setNotification(null), 4500);
  };

  const handleCopyReport = () => {
    if (!report) return;
    const jsonStr = JSON.stringify(report, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopiedKey("report_json");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadReport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `memory-health-report-${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        id="memory-health-check-modal"
        className="bg-[#121216] border border-[#2A2A32] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-[#1F1F23] flex items-center justify-between bg-gradient-to-r from-[#16161A] to-[#1e131d]">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl p-0.5 flex items-center justify-center shadow-lg ${
                report?.overallStatus === "corrupted"
                  ? "bg-red-500"
                  : report?.overallStatus === "healthy"
                  ? "bg-gradient-to-br from-emerald-500 to-cyan-500"
                  : "bg-amber-500"
              }`}
            >
              <div className="w-full h-full bg-[#121216] rounded-[10px] flex items-center justify-center">
                {report?.overallStatus === "corrupted" ? (
                  <ShieldAlert className="w-5 h-5 text-red-400 animate-bounce" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight uppercase">
                  Encrypted Memory Health Diagnostic Tool
                </h2>
                {report?.overallStatus === "corrupted" ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/15 text-red-400 border border-red-500/30 animate-pulse flex items-center gap-1">
                    <AlertOctagon className="w-3 h-3" />
                    DECRYPTION FAULT DETECTED
                  </span>
                ) : report?.overallStatus === "healthy" ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    ALL BLOBS VERIFIED HEALTHY
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    STATUS: {report?.overallStatus?.toUpperCase() || "CHECKING..."}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8E9299] mt-0.5">
                Automated cryptographic validator for AES-GCM (256-bit) memory blobs, PBKDF2 vector validation, and tamper alerting.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-[#16161A] text-[#8E9299] hover:text-white hover:bg-[#1F1F23] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Header Bar */}
        <div className="flex flex-wrap items-center justify-between px-5 py-2.5 bg-[#0E0E12] border-b border-[#1F1F23] gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={runHealthCheck}
              disabled={isRunningCheck}
              className="px-3 py-1.5 rounded-lg bg-[#16161A] hover:bg-[#1F1F23] border border-[#2A2A32] text-xs font-semibold text-white flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRunningCheck ? "animate-spin" : ""}`} />
              <span>{isRunningCheck ? "Running Check..." : "Run Health Check Now"}</span>
            </button>

            <button
              onClick={handleSelfHeal}
              disabled={isHealing}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
              title="Re-encrypts all working tokens into storage with valid vectors and cryptographic tag"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{isHealing ? "Rebuilding Vault..." : "Self-Heal / Re-Encrypt Vault"}</span>
            </button>

            <button
              onClick={handleSimulateTampering}
              className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Corrupts the encrypted ciphertext in localStorage to verify that decryption failure alerts trigger correctly"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Simulate Tamper / Test Alert</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyReport}
              className="px-2.5 py-1 rounded bg-[#16161A] text-[11px] font-mono text-[#8E9299] hover:text-white border border-[#1F1F23] flex items-center gap-1 cursor-pointer"
            >
              {copiedKey === "report_json" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedKey === "report_json" ? "Copied" : "Copy Report"}</span>
            </button>

            <button
              onClick={handleDownloadReport}
              className="px-2.5 py-1 rounded bg-[#16161A] text-[11px] font-mono text-[#8E9299] hover:text-white border border-[#1F1F23] flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3 h-3 text-cyan-400" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {/* Decryption Failure Alert Banner */}
        {report?.overallStatus === "corrupted" && (
          <div className="mx-5 mt-4 p-4 rounded-xl bg-red-500/10 border-2 border-red-500/50 flex items-start gap-3 animate-pulse">
            <AlertOctagon className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <div className="font-bold text-red-300 text-sm flex items-center justify-between">
                <span>CRITICAL: Encrypted Blob Decryption Failure Alert</span>
                <span className="font-mono text-[10px] bg-red-500/20 px-2 py-0.5 rounded text-red-200">
                  AES-GCM Tag Mismatch
                </span>
              </div>
              <p className="text-red-200/90 mt-1 leading-relaxed">
                Cryptographic authentication tag verification failed on one or more local storage encrypted blobs. The ciphertext may have been tampered with, truncated, or encrypted with a different passphrase.
              </p>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleSelfHeal}
                  className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-400 text-black font-extrabold text-xs cursor-pointer shadow transition-all"
                >
                  Apply Self-Healing Re-Encryption ({tokens.length} tokens ready)
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem("active_cockpit_vault");
                    runHealthCheck();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#16161A] hover:bg-[#1F1F23] border border-red-500/40 text-red-300 text-xs font-semibold cursor-pointer transition-all"
                >
                  Flush Corrupted Blob
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Toast */}
        {notification && (
          <div className="mx-5 mt-3 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {/* Diagnostic Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#16161A] border border-[#1F1F23] p-3 rounded-xl">
              <div className="text-[10px] font-mono text-[#8E9299]">CHECKED STORAGE KEYS</div>
              <div className="text-sm font-bold text-white mt-1">
                {report?.totalBlobsChecked || 0} Targets Scanned
              </div>
              <div className="text-[10px] text-cyan-400 mt-0.5">localStorage Enclave</div>
            </div>

            <div className="bg-[#16161A] border border-[#1F1F23] p-3 rounded-xl">
              <div className="text-[10px] font-mono text-[#8E9299]">HEALTHY & DECRYPTABLE</div>
              <div className="text-sm font-bold text-emerald-400 mt-1">
                {report?.healthyBlobsCount || 0} / {report?.totalBlobsChecked || 0} Blobs
              </div>
              <div className="text-[10px] text-emerald-400 mt-0.5">AES-GCM Auth Passed</div>
            </div>

            <div className="bg-[#16161A] border border-[#1F1F23] p-3 rounded-xl">
              <div className="text-[10px] font-mono text-[#8E9299]">DECRYPTION ERRORS</div>
              <div
                className={`text-sm font-bold mt-1 ${
                  (report?.corruptedBlobsCount || 0) > 0 ? "text-red-400 font-extrabold" : "text-gray-400"
                }`}
              >
                {report?.corruptedBlobsCount || 0} Faults Detected
              </div>
              <div className="text-[10px] text-[#8E9299] mt-0.5">0 Zero Tolerance</div>
            </div>

            <div className="bg-[#16161A] border border-[#1F1F23] p-3 rounded-xl">
              <div className="text-[10px] font-mono text-[#8E9299]">WEB CRYPTO ENGINE</div>
              <div className="text-sm font-bold text-purple-400 mt-1">
                {report?.cryptoApiAvailable ? "Hardware Accelerated" : "Unavailable"}
              </div>
              <div className="text-[10px] text-purple-300 mt-0.5">crypto.subtle Native</div>
            </div>
          </div>

          {/* Detailed Blobs Validation Table */}
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#F27D26]" />
                <span className="text-xs font-bold text-white uppercase font-mono">
                  Storage Enclave Blobs Diagnostic Status
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#8E9299]">
                Last Check: {report ? new Date(report.timestamp).toLocaleTimeString() : "Pending"}
              </span>
            </div>

            <div className="divide-y divide-[#1F1F23] border border-[#1F1F23] rounded-xl overflow-hidden bg-[#0A0A0C]">
              {report?.results.map((res, idx) => (
                <div key={idx} className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-[#121216] transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {res.status === "healthy" ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : res.status === "corrupted" ? (
                        <AlertOctagon className="w-5 h-5 text-red-400" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white font-mono">{res.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#16161A] text-[#8E9299] border border-[#1F1F23]">
                          {res.storageKey}
                        </span>
                      </div>

                      <div className="text-[11px] text-[#8E9299] mt-1 flex items-center gap-3 flex-wrap">
                        <span>Size: <strong className="text-gray-300">{(res.sizeBytes / 1024).toFixed(2)} KB</strong></span>
                        <span>•</span>
                        <span>IV: <strong className="text-cyan-400">{res.ivLengthBits ? `${res.ivLengthBits}-bit` : "N/A"}</strong></span>
                        <span>•</span>
                        <span>Salt: <strong className="text-orange-400">{res.saltLengthBits ? `${res.saltLengthBits}-bit` : "N/A"}</strong></span>
                        <span>•</span>
                        <span>Items: <strong className="text-emerald-400">{res.itemCount} tokens</strong></span>
                        <span>•</span>
                        <span>Latency: <strong className="text-purple-400">{res.latencyMs.toFixed(2)}ms</strong></span>
                      </div>

                      {res.errorMessage && (
                        <div className="mt-2 text-[11px] font-mono text-red-400 bg-red-500/10 px-2.5 py-1 rounded border border-red-500/30">
                          {res.errorMessage}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-center">
                    {res.status === "healthy" ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        DECRYPTABLE (OK)
                      </span>
                    ) : res.status === "corrupted" ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
                        CORRUPTED
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        EMPTY / UNINITIALIZED
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-4 space-y-2">
            <div className="text-xs font-bold text-white uppercase font-mono flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>Automated Diagnostic Recommendations & Protocol</span>
            </div>
            <ul className="space-y-1.5 text-xs text-[#8E9299]">
              {report?.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#1F1F23] bg-[#0E0E12] flex items-center justify-between text-xs text-[#8E9299] flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Automated Heartbeat: Background diagnostics executing every 15 seconds.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#16161A] hover:bg-[#1F1F23] text-white text-xs font-semibold cursor-pointer transition-all"
          >
            Close Diagnostic Tool
          </button>
        </div>
      </div>
    </div>
  );
};
