import React, { useState, useEffect } from "react";
import { AlertOctagon, ShieldAlert, Zap, X } from "lucide-react";
import {
  subscribeToMemoryHealth,
  startAutomatedHealthMonitoring,
  MemoryHealthReport,
  selfHealEncryptedVault,
} from "../utils/memoryHealthDiagnostics";
import { TokenRecord } from "../types";

interface MemoryHealthAlertBannerProps {
  tokens: TokenRecord[];
  onOpenDiagnosticModal: () => void;
}

export const MemoryHealthAlertBanner: React.FC<MemoryHealthAlertBannerProps> = ({
  tokens,
  onOpenDiagnosticModal,
}) => {
  const [report, setReport] = useState<MemoryHealthReport | null>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isHealing, setIsHealing] = useState<boolean>(false);

  useEffect(() => {
    startAutomatedHealthMonitoring(20);

    const unsub = subscribeToMemoryHealth((rep) => {
      setReport(rep);
      if (rep.overallStatus === "corrupted") {
        setIsDismissed(false);
      }
    });

    return () => unsub();
  }, []);

  if (!report || report.overallStatus !== "corrupted" || isDismissed) {
    return null;
  }

  const handleSelfHealQuick = async () => {
    setIsHealing(true);
    try {
      await selfHealEncryptedVault(tokens);
    } catch (e) {
      console.error("Quick self heal error:", e);
    } finally {
      setIsHealing(false);
    }
  };

  return (
    <div
      id="memory-health-alert-banner"
      className="bg-gradient-to-r from-red-950 via-[#2a0b12] to-red-950 border-y-2 border-red-500/80 px-4 py-3 text-white shadow-2xl animate-fade-in relative z-40"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center flex-shrink-0 animate-pulse">
            <AlertOctagon className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-red-200 flex items-center gap-2 uppercase tracking-wide">
              <span>Memory Health Alert: Encrypted Blob Decryption Failure Detected</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-red-500/30 text-red-300">
                {report.corruptedBlobsCount} corrupted
              </span>
            </div>
            <p className="text-[11px] text-red-300/80 mt-0.5">
              One or more local storage encrypted memory payloads failed AES-GCM verification. Checksum tag or ciphertext tampering detected.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleSelfHealQuick}
            disabled={isHealing}
            className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-400 text-black font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>{isHealing ? "Healing..." : `Self-Heal Vault (${tokens.length} Tokens)`}</span>
          </button>

          <button
            onClick={onOpenDiagnosticModal}
            className="px-3 py-1.5 rounded-lg bg-[#16161A] hover:bg-[#1F1F23] border border-red-500/40 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Inspect Diagnostics</span>
          </button>

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 rounded-lg text-red-400 hover:text-white hover:bg-red-500/20 transition-all cursor-pointer"
            title="Dismiss Alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
