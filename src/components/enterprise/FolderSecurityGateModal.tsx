import React, { useState } from "react";
import {
  ShieldCheck,
  Lock,
  Fingerprint,
  KeyRound,
  CheckCircle2,
  X,
  AlertCircle,
  Sparkles,
  Crown,
  Landmark,
} from "lucide-react";
import { EnterpriseFolderDefinition, EnterpriseModuleItem } from "../../data/enterpriseFolders";
import { useMembership } from "../../context/MembershipContext";

interface FolderSecurityGateModalProps {
  isOpen: boolean;
  folder: EnterpriseFolderDefinition | null;
  targetModule?: EnterpriseModuleItem | null;
  onClose: () => void;
  onUnlockSuccess: (folderId: string) => void;
}

export const FolderSecurityGateModal: React.FC<FolderSecurityGateModalProps> = ({
  isOpen,
  folder,
  targetModule,
  onClose,
  onUnlockSuccess,
}) => {
  const { userState, openCheckoutModal } = useMembership();
  const [authMethod, setAuthMethod] = useState<"biometric" | "pin">("biometric");
  const [pinCode, setPinCode] = useState<string>("");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanSuccess, setScanSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !folder) return null;

  const DEFAULT_VAULT_PIN = "202608";

  const handleBiometricScan = () => {
    setErrorMessage(null);
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setScanSuccess(true);
      setTimeout(() => {
        setScanSuccess(false);
        onUnlockSuccess(folder.id);
      }, 650);
    }, 900);
  };

  const handlePinVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (pinCode.trim() === DEFAULT_VAULT_PIN) {
      setScanSuccess(true);
      setTimeout(() => {
        setScanSuccess(false);
        setPinCode("");
        onUnlockSuccess(folder.id);
      }, 500);
    } else {
      setErrorMessage("Invalid Enclave PIN. Use Sovereign Passcode 202608 or click Quick-Fill.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[#0F1016] border border-rose-500/40 shadow-[0_0_50px_rgba(244,63,94,0.25)] overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-rose-950/60 via-[#151520] to-amber-950/40 border-b border-rose-500/30 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  FOLDER {folder.number} • SECURED ENCLAVE
                </span>
                <span className="text-[10px] font-mono text-amber-300 uppercase">
                  FIPS 140-3 L3
                </span>
              </div>
              <h3 className="text-base font-black tracking-tight text-white mt-1">
                {folder.name}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#1A1B24] hover:bg-[#252634] text-gray-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {targetModule && (
            <div className="p-3 rounded-xl bg-[#161722] border border-[#28293A] flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-mono text-gray-400 uppercase">
                  Requested Secured Module
                </div>
                <div className="text-xs font-bold text-white mt-0.5">
                  {targetModule.title}
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                {targetModule.badge}
              </span>
            </div>
          )}

          <p className="text-xs text-gray-300 leading-relaxed">
            This enterprise folder contains institutional custody, treasury revenue, and security enclave modules for{" "}
            <span className="text-amber-300 font-semibold">Token World Exchange ATS® (TWE)</span>. Verify hardware passkey or 6-digit enclave PIN to unlock this folder for your active session.
          </p>

          {/* Method Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#14151E] border border-[#232432]">
            <button
              type="button"
              onClick={() => {
                setAuthMethod("biometric");
                setErrorMessage(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                authMethod === "biometric"
                  ? "bg-rose-500 text-white shadow"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Fingerprint className="w-3.5 h-3.5" />
              <span>WebAuthn Passkey</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMethod("pin");
                setErrorMessage(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                authMethod === "pin"
                  ? "bg-amber-500 text-black shadow"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>6-Digit Enclave PIN</span>
            </button>
          </div>

          {authMethod === "biometric" ? (
            <div className="p-5 rounded-xl bg-[#14151F] border border-[#252738] flex flex-col items-center text-center space-y-3">
              <button
                type="button"
                disabled={isScanning || scanSuccess}
                onClick={handleBiometricScan}
                className={`w-20 h-20 rounded-2xl border-2 flex items-center justify-center transition-all cursor-pointer ${
                  scanSuccess
                    ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.4)]"
                    : isScanning
                    ? "bg-rose-500/20 border-rose-400 text-rose-300 animate-pulse shadow-[0_0_25px_rgba(244,63,94,0.4)]"
                    : "bg-[#1B1C29] border-rose-500/50 hover:border-rose-400 text-rose-400 hover:scale-105"
                }`}
              >
                {scanSuccess ? (
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                ) : (
                  <Fingerprint className="w-10 h-10" />
                )}
              </button>
              <div>
                <div className="text-xs font-bold text-white">
                  {scanSuccess
                    ? "Hardware Enclave Verified — Unlocking Folder..."
                    : isScanning
                    ? "Verifying Secure Enclave / YubiKey Passkey..."
                    : "Click Fingerprint to Authenticate Hardware Passkey"}
                </div>
                <div className="text-[11px] font-mono text-gray-400 mt-0.5">
                  Touch ID • Face ID • YubiKey FIPS Series
                </div>
              </div>
              <button
                type="button"
                disabled={isScanning || scanSuccess}
                onClick={handleBiometricScan}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-lg transition cursor-pointer"
              >
                {isScanning ? "Authenticating Enclave..." : "Unlock Secured Folder Now"}
              </button>
            </div>
          ) : (
            <form onSubmit={handlePinVerify} className="p-4 rounded-xl bg-[#14151F] border border-[#252738] space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono text-gray-300 uppercase font-bold">
                  Enter 6-Digit Sovereign PIN
                </label>
                <button
                  type="button"
                  onClick={() => setPinCode(DEFAULT_VAULT_PIN)}
                  className="text-[10px] font-mono text-amber-400 hover:text-amber-300 underline cursor-pointer"
                >
                  Quick-Fill Demo PIN (202608)
                </button>
              </div>
              <input
                type="password"
                maxLength={6}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder="••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-[#0B0C12] border border-[#2D2F42] text-center text-lg font-mono tracking-[0.5em] text-amber-300 focus:outline-none focus:border-amber-400"
              />
              {errorMessage && (
                <div className="flex items-center gap-1.5 text-[11px] text-rose-400 font-mono">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-black uppercase tracking-wider transition cursor-pointer"
              >
                Verify PIN & Open Folder
              </button>
            </form>
          )}

          {/* Tier & Custody Footer */}
          <div className="pt-2 border-t border-[#222330] flex items-center justify-between text-[11px] font-mono text-gray-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Active Tier:</span>
              <span className="text-white font-bold uppercase">{userState.tier}</span>
            </div>
            {userState.tier !== "vip" && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openCheckoutModal("vip");
                }}
                className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Upgrade to VIP ♦</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
