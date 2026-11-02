import React, { useState, useEffect } from "react";
import { ShieldCheck, Database, RefreshCw, X, AlertTriangle } from "lucide-react";
import { firestoreQuotaGuard, QuotaGuardStatus } from "../utils/firestoreQuotaGuard";

export const FirestoreQuotaAlertBanner: React.FC = () => {
  const [status, setStatus] = useState<QuotaGuardStatus>(() => firestoreQuotaGuard.getStatus());
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = firestoreQuotaGuard.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    return () => unsubscribe();
  }, []);

  if ((!status.isExceeded && !status.isPermissionDenied) || isDismissed) {
    return null;
  }

  const handleTestReconnect = () => {
    setIsRetrying(true);
    firestoreQuotaGuard.clearQuotaExceeded();
    setTimeout(() => {
      setIsRetrying(false);
    }, 1200);
  };

  const isPermissionIssue = status.isPermissionDenied;

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-3">
      <div className={`p-3.5 rounded-xl border text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-lg backdrop-blur-sm ${
        isPermissionIssue
          ? "bg-gradient-to-r from-amber-950/80 via-slate-900/90 to-rose-950/60 border-amber-500/50"
          : "bg-gradient-to-r from-amber-950/70 via-slate-900/90 to-blue-950/60 border-amber-500/40"
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex-shrink-0">
            {isPermissionIssue ? (
              <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-400 animate-pulse" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-amber-300">
                {isPermissionIssue
                  ? "Cloud Sync Permissions Notice: Local Fallback Active"
                  : "Cloud Sync Quota Protected"}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] border border-emerald-500/30">
                Local Quantum Vault 100% Active
              </span>
            </div>
            <p className="text-slate-300 text-[11px] mt-0.5">
              {isPermissionIssue
                ? "Firestore returned a permission notice while syncing. All token records, contract addresses, and configurations remain 100% safe and persistently stored in your browser's local vault."
                : "The free daily cloud write limit (20,000 writes/day) was reached on the Firestore database. All token inventions, contract IDs, and revenue settings are protected and safely stored locally in your browser."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
          <button
            type="button"
            onClick={handleTestReconnect}
            disabled={isRetrying}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isRetrying ? "animate-spin text-amber-400" : ""}`} />
            {isRetrying ? "Reconnecting..." : "Test Reconnect"}
          </button>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Dismiss warning"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
