import React, { useState } from "react";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft, 
  X, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  Layers,
  Database,
  Info,
  Check
} from "lucide-react";
import { 
  VaultValidationReport, 
  VaultDiscrepancy, 
  resolveDiscrepanciesPushToVault, 
  resolveDiscrepanciesPullFromVault, 
  triggerVaultValidationNow 
} from "../utils/firebase";
import { TokenRecord } from "../types";

interface VaultValidationNoticeProps {
  report: VaultValidationReport;
  localTokens: TokenRecord[];
  onUpdateLocalTokens: (tokens: TokenRecord[]) => void;
  onNavigateToVault?: () => void;
}

export const VaultValidationNotice: React.FC<VaultValidationNoticeProps> = ({
  report,
  localTokens,
  onUpdateLocalTokens,
  onNavigateToVault,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [resolutionFeedback, setResolutionFeedback] = useState<string | null>(null);

  const hasDiscrepancy = report.status === "discrepancy_detected" && report.discrepancies.length > 0;
  const isValidating = report.status === "validating";
  const isInSync = report.status === "in_sync";

  const handlePushToVault = async () => {
    setIsResolving(true);
    setResolutionFeedback(null);
    try {
      const res = await resolveDiscrepanciesPushToVault(localTokens);
      if (res.success) {
        setResolutionFeedback(`Successfully secured ${res.savedCount} local tokens to remote Vault!`);
      } else {
        setResolutionFeedback(`Push error: ${res.error || "Unknown error"}`);
      }
    } catch (e: any) {
      setResolutionFeedback(`Error: ${e.message}`);
    } finally {
      setIsResolving(false);
      setTimeout(() => setResolutionFeedback(null), 5000);
    }
  };

  const handlePullFromVault = async () => {
    setIsResolving(true);
    setResolutionFeedback(null);
    try {
      const res = await resolveDiscrepanciesPullFromVault(onUpdateLocalTokens);
      if (res.success) {
        setResolutionFeedback(`Pulled ${res.count} tokens from remote Vault into local memory!`);
      } else {
        setResolutionFeedback(`Pull error: ${res.error || "Unknown error"}`);
      }
    } catch (e: any) {
      setResolutionFeedback(`Error: ${e.message}`);
    } finally {
      setIsResolving(false);
      setTimeout(() => setResolutionFeedback(null), 5000);
    }
  };

  const handleTriggerRecheck = async () => {
    setIsResolving(true);
    await triggerVaultValidationNow();
    setIsResolving(false);
  };

  return (
    <>
      {/* 1. Main Auto-Reporting Discrepancy Banner (shown when discrepancy detected) */}
      {hasDiscrepancy && !isMinimized && (
        <div 
          id="vault-discrepancy-banner"
          className="relative bg-gradient-to-r from-[#241508] via-[#1A1208] to-[#14141A] border-y sm:border sm:rounded-xl border-[#F27D26]/50 p-3 sm:p-4 shadow-xl mb-4 animate-fadeIn"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Left side: Alert Icon & Status Details */}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#F27D26]/20 border border-[#F27D26]/60 flex items-center justify-center text-[#F27D26] flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-[#F27D26] flex items-center gap-1.5">
                    30s Vault Discrepancy Alert
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26]/40 font-semibold">
                    {report.discrepancyCount} {report.discrepancyCount === 1 ? "Issue" : "Issues"} Detected
                  </span>
                  <span className="text-[11px] text-[#8E9299] font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#8E9299]" />
                    Re-checking in {report.nextCheckInSeconds}s (Check #{report.checkRunCount})
                  </span>
                </div>

                <p className="text-xs text-[#D1D5DB] mt-1">
                  Local memory holds <strong className="text-white">{report.localCount} tokens</strong>, whereas remote Firestore Token Vault holds <strong className="text-white">{report.remoteCount} tokens</strong>.
                  {report.missingInRemoteCount > 0 && ` • ${report.missingInRemoteCount} missing in remote vault`}
                  {report.missingInLocalCount > 0 && ` • ${report.missingInLocalCount} missing in local memory`}
                  {report.fieldMismatchCount > 0 && ` • ${report.fieldMismatchCount} field mismatch`}
                </p>

                {resolutionFeedback && (
                  <p className="text-xs text-green-400 font-mono mt-1 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    {resolutionFeedback}
                  </p>
                )}
              </div>
            </div>

            {/* Right side: Action Controls */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end flex-shrink-0">
              <button
                type="button"
                id="btn-inspect-discrepancies"
                onClick={() => setIsModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-[#252530] hover:bg-[#303040] text-xs font-semibold text-white border border-[#3E3E50] transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Info className="w-3.5 h-3.5 text-[#F27D26]" />
                <span>Inspect Diff</span>
              </button>

              <button
                type="button"
                id="btn-auto-heal-push"
                onClick={handlePushToVault}
                disabled={isResolving}
                className="px-3 py-1.5 rounded-lg bg-[#F27D26] hover:bg-[#ff8f3d] disabled:opacity-50 text-xs font-bold text-black transition-colors cursor-pointer flex items-center gap-1.5 shadow-md"
                title="Saves all local memory tokens into Firestore Token Vault"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Auto-Heal (Push to Vault)</span>
              </button>

              <button
                type="button"
                id="btn-auto-heal-pull"
                onClick={handlePullFromVault}
                disabled={isResolving}
                className="px-2.5 py-1.5 rounded-lg bg-[#181820] hover:bg-[#22222E] disabled:opacity-50 text-xs text-[#D1D5DB] hover:text-white border border-[#1F1F23] transition-colors cursor-pointer flex items-center gap-1"
                title="Loads remote Firestore Vault tokens into local memory"
              >
                <ArrowDownLeft className="w-3.5 h-3.5 text-green-400" />
                <span className="hidden lg:inline">Pull Vault</span>
              </button>

              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                aria-label="Minimize discrepancy notice"
                className="p-1.5 rounded-lg hover:bg-white/10 text-[#8E9299] hover:text-white transition-colors cursor-pointer"
                title="Minimize notice"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Compact Status Pill (Shown when minimized or when user wants persistent view) */}
      {hasDiscrepancy && isMinimized && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-40 animate-fadeIn">
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#241508] border border-[#F27D26] text-xs shadow-2xl hover:scale-105 transition-transform cursor-pointer"
          >
            <div className="w-2 h-2 rounded-full bg-[#F27D26] animate-ping" />
            <AlertTriangle className="w-3.5 h-3.5 text-[#F27D26]" />
            <span className="font-bold text-[#F27D26]">
              Vault Desync ({report.discrepancyCount})
            </span>
            <span className="text-[10px] text-[#8E9299] font-mono">
              {report.nextCheckInSeconds}s
            </span>
          </button>
        </div>
      )}

      {/* 3. Detailed Discrepancy Inspector Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121216] border border-[#1F1F23] w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#1F1F23] flex items-center justify-between bg-[#0A0A0C]">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  hasDiscrepancy ? "bg-[#F27D26]/20 border border-[#F27D26]/40 text-[#F27D26]" : "bg-green-500/20 border border-green-500/40 text-green-400"
                }`}>
                  {hasDiscrepancy ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>30-Second Vault Validation Inspector</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-bold border ${
                      hasDiscrepancy 
                        ? "bg-[#F27D26]/20 text-[#F27D26] border-[#F27D26]/40" 
                        : "bg-green-500/20 text-green-400 border-green-500/40"
                    }`}>
                      {report.status.replace("_", " ")}
                    </span>
                  </h3>
                  <p className="text-xs text-[#8E9299]">
                    Continuous integrity auditor • Next comparison in <strong className="text-white font-mono">{report.nextCheckInSeconds}s</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-lg bg-[#181820] hover:bg-[#252530] text-[#8E9299] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Overview Stats Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 sm:p-4 bg-[#16161C] border-b border-[#1F1F23]">
              <div className="p-2.5 rounded-lg bg-[#0E0E12] border border-[#1F1F23]">
                <div className="text-[10px] text-[#8E9299] font-mono uppercase">Local Memory</div>
                <div className="text-lg font-bold text-white font-mono">{report.localCount} <span className="text-xs text-[#8E9299] font-normal">tokens</span></div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0E0E12] border border-[#1F1F23]">
                <div className="text-[10px] text-[#8E9299] font-mono uppercase">Firestore Vault</div>
                <div className="text-lg font-bold text-white font-mono">{report.remoteCount} <span className="text-xs text-[#8E9299] font-normal">tokens</span></div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0E0E12] border border-[#1F1F23]">
                <div className="text-[10px] text-[#8E9299] font-mono uppercase">Matched In-Sync</div>
                <div className="text-lg font-bold text-green-400 font-mono">{report.matchedCount} <span className="text-xs text-[#8E9299] font-normal">records</span></div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0E0E12] border border-[#1F1F23]">
                <div className="text-[10px] text-[#8E9299] font-mono uppercase">Discrepancies</div>
                <div className={`text-lg font-bold font-mono ${report.discrepancyCount > 0 ? "text-[#F27D26]" : "text-green-400"}`}>
                  {report.discrepancyCount}
                </div>
              </div>
            </div>

            {/* Discrepancy List Body */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {report.discrepancies.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Local Memory & Firestore Vault Perfectly In Sync</h4>
                  <p className="text-xs text-[#8E9299] max-w-md mx-auto mt-1">
                    Every token in local memory matches its remote document in the Firestore Token Vault. The validation service checks every 30 seconds.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#8E9299] font-mono uppercase px-1">
                    <span>Identified Discrepancies ({report.discrepancies.length})</span>
                    <span>Last validated: {new Date(report.lastCheckedAt).toLocaleTimeString()}</span>
                  </div>

                  {report.discrepancies.map((disc) => (
                    <div 
                      key={disc.id}
                      className="p-3 rounded-xl bg-[#0E0E12] border border-[#1F1F23] hover:border-[#F27D26]/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-mono px-2 py-0.2 rounded font-semibold uppercase ${
                              disc.type === "missing_in_remote" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                              disc.type === "missing_in_local" ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" :
                              disc.type === "field_mismatch" ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" :
                              "bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26]/30"
                            }`}>
                              {disc.type.replace(/_/g, " ")}
                            </span>
                            <span className="text-xs font-bold text-white">
                              {disc.tokenSymbol} {disc.tokenName && `• ${disc.tokenName}`}
                            </span>
                            {disc.chain && (
                              <span className="text-[10px] font-mono text-[#8E9299] uppercase">
                                [{disc.chain}]
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#C0C4CC] mt-1.5 leading-relaxed">
                            {disc.description}
                          </p>
                        </div>
                      </div>

                      {/* Field Value Diff if available */}
                      {disc.field && (
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#1F1F23] text-xs font-mono">
                          <div className="p-1.5 rounded bg-[#16161E]">
                            <span className="text-[10px] text-[#8E9299] uppercase block">Local Memory Value:</span>
                            <span className="text-white break-all">{String(disc.localValue)}</span>
                          </div>
                          <div className="p-1.5 rounded bg-[#16161E]">
                            <span className="text-[10px] text-[#8E9299] uppercase block">Remote Vault Value:</span>
                            <span className="text-white break-all">{String(disc.remoteValue)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer with Actions */}
            <div className="p-4 border-t border-[#1F1F23] bg-[#0A0A0C] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-[#8E9299] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>Service cadence: 30s</span>
                <span>• Check #{report.checkRunCount}</span>
                <span>• Duration: {report.durationMs}ms</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleTriggerRecheck}
                  disabled={isResolving || isValidating}
                  className="px-3 py-1.5 rounded-lg bg-[#181820] hover:bg-[#252530] text-xs text-white border border-[#1F1F23] transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? "animate-spin text-[#F27D26]" : ""}`} />
                  <span>Re-Validate Now</span>
                </button>

                <button
                  type="button"
                  onClick={handlePushToVault}
                  disabled={isResolving}
                  className="px-3 py-1.5 rounded-lg bg-[#F27D26] hover:bg-[#ff8f3d] disabled:opacity-50 text-xs font-bold text-black transition-colors cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Push All Local to Vault</span>
                </button>

                <button
                  type="button"
                  onClick={handlePullFromVault}
                  disabled={isResolving}
                  className="px-3 py-1.5 rounded-lg bg-[#181820] hover:bg-[#252530] disabled:opacity-50 text-xs font-semibold text-green-400 border border-green-500/30 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>Pull Vault to Local</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
