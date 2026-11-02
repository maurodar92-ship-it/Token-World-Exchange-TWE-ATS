import React, { useState, useEffect } from "react";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Zap,
  Lock,
  Unlock,
  Copy,
  Check,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Layers,
  X,
  Maximize2,
  Flame,
  Radio,
  QrCode,
  ScanLine,
} from "lucide-react";
import {
  universalWalletExtensionEngine,
  UniversalWalletState,
  SupportedWalletType,
} from "../utils/universalWalletExtensionEngine";
import { WalletQrCodeModal } from "./WalletQrCodeModal";
import { WalletCameraScannerModal } from "./WalletCameraScannerModal";

interface FloatingWalletExtensionDrawerProps {
  onOpenExtensionPopup: () => void;
  onOpenSendReceive?: (mode: "send" | "receive") => void;
  onOpenSwap?: () => void;
}

export const FloatingWalletExtensionDrawer: React.FC<FloatingWalletExtensionDrawerProps> = ({
  onOpenExtensionPopup,
  onOpenSendReceive,
  onOpenSwap,
}) => {
  const [walletState, setWalletState] = useState<UniversalWalletState>(
    universalWalletExtensionEngine.getState()
  );
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isQrOpen, setIsQrOpen] = useState<boolean>(false);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  useEffect(() => {
    const unsub = universalWalletExtensionEngine.subscribe((s) => {
      setWalletState(s);
    });
    return unsub;
  }, []);

  const criticalCount = walletState.approvals.filter((a) => a.riskLevel === "CRITICAL_DRAINER").length;
  const hasThreats = criticalCount > 0;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(walletState.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuickSwitch = async (walletId: SupportedWalletType) => {
    await universalWalletExtensionEngine.connectWallet(walletId, true);
  };

  const handleSeverAllThreats = (e: React.MouseEvent) => {
    e.stopPropagation();
    universalWalletExtensionEngine.revokeAllCritical();
  };

  return (
    <aside
      aria-label="Universal Web3 Extension Dock"
      className="fixed bottom-16 right-4 z-40 flex items-end font-sans select-none"
    >
      {/* Expanded Quick Drawer Slide-out Panel */}
      {isExpanded && (
        <div className="mr-3 w-80 bg-[#12121A]/95 backdrop-blur-md border border-[#272738] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_25px_rgba(242,125,38,0.15)] p-4 text-slate-100 animate-in slide-in-from-right-4 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#222230]">
            <div className="flex items-center gap-2">
              <span className="text-xl">{walletState.walletIcon}</span>
              <div>
                <h4 className="font-bold text-xs text-white leading-tight">
                  {walletState.walletName} Extension
                </h4>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{walletState.chainName}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setIsExpanded(false);
                  onOpenExtensionPopup();
                }}
                className="p-1.5 rounded-lg bg-[#1E1E2C] hover:bg-[#28283C] text-slate-300 hover:text-white border border-[#2A2A3E] transition-colors"
                title="Launch Browser Extension Window"
              >
                <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E1E2C] transition-colors"
                title="Minimize Drawer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Balance & Address */}
          <div className="my-3 p-3 rounded-xl bg-[#161622] border border-[#232334]">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{walletState.activeNetworkProvider === "solana" ? "Solana RPC" : "Ethereum RPC"}</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsQrOpen(true);
                  }}
                  className="p-1 rounded bg-[#1D1D2C] hover:bg-[#26263B] text-amber-300 border border-[#2A2A3E] transition-colors"
                  title="Generate QR code for this address"
                >
                  <QrCode className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsScannerOpen(true);
                  }}
                  className="p-1 rounded bg-[#1D1D2C] hover:bg-[#26263B] text-emerald-300 border border-[#2A2A3E] transition-colors"
                  title="Scan camera to import wallet address"
                >
                  <ScanLine className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-slate-300 hover:text-white transition-colors p-1"
                  title="Click to copy address"
                >
                  <span>
                    {(walletState.activeNetworkProvider === "solana" ? walletState.solanaAddress : walletState.address).slice(0, 6)}...
                    {(walletState.activeNetworkProvider === "solana" ? walletState.solanaAddress : walletState.address).slice(-4)}
                  </span>
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                </button>
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-lg font-bold font-mono text-white">
                ${walletState.nativeBalanceUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
              <div className="text-right text-xs font-mono">
                <span className="text-amber-400 font-semibold">{walletState.nativeBalanceEth.toFixed(2)} ETH</span>
                <span className="text-slate-400 mx-1">•</span>
                <span className="text-purple-400 font-semibold">{walletState.nativeBalanceSol?.toFixed(1) || "420.5"} SOL</span>
              </div>
            </div>
          </div>

          {/* Real-time Threat Status & Instant Sever Button */}
          <div className={`p-2.5 rounded-xl border mb-3 flex items-center justify-between ${
            hasThreats
              ? "bg-red-950/30 border-red-500/40"
              : "bg-emerald-950/20 border-emerald-500/30"
          }`}>
            <div className="flex items-center gap-2">
              {hasThreats ? (
                <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              )}
              <div>
                <div className="text-[11px] font-bold text-white">
                  {hasThreats ? `${criticalCount} Drainer Spool(s) Detected` : "Wallet Fully Shielded"}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Health: {walletState.securityScore}/100
                </div>
              </div>
            </div>

            {hasThreats ? (
              <button
                type="button"
                onClick={handleSeverAllThreats}
                className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-mono text-[10px] font-bold shadow-sm active:scale-95 transition-all"
              >
                Sever
              </button>
            ) : (
              <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                Protected
              </span>
            )}
          </div>

          {/* Quick Wallet Switcher Bar */}
          <div className="mb-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1.5">
              Quick Provider Switch
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {(["metamask", "coinbase", "trust", "rabby"] as SupportedWalletType[]).map((wId) => {
                const isSelected = walletState.activeWallet === wId;
                const icons: Record<SupportedWalletType, string> = {
                  metamask: "🦊",
                  coinbase: "🔵",
                  trust: "🛡️",
                  rabby: "🐰",
                  injected: "⚡",
                };
                return (
                  <button
                    key={wId}
                    type="button"
                    onClick={() => handleQuickSwitch(wId)}
                    className={`p-1.5 rounded-lg border text-center transition-all ${
                      isSelected
                        ? "bg-amber-500/20 border-amber-500/60 text-white shadow-sm"
                        : "bg-[#181824] hover:bg-[#202030] border-[#222232] text-slate-300"
                    }`}
                    title={`Switch to ${wId}`}
                  >
                    <span className="text-sm block">{icons[wId]}</span>
                    <span className="text-[9px] font-mono capitalize block truncate">{wId}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions & Launch Popup */}
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => {
                setIsExpanded(false);
                onOpenExtensionPopup();
              }}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-500 hover:from-amber-500 hover:to-orange-500 text-white font-mono text-xs font-bold shadow-md shadow-orange-950/40 flex items-center justify-center gap-1.5 active:scale-98 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Extension Popup</span>
            </button>

            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => onOpenSendReceive && onOpenSendReceive("send")}
                className="py-1.5 rounded-lg bg-[#1C1C28] hover:bg-[#252536] border border-[#272738] text-[11px] font-mono text-slate-200 flex flex-col items-center justify-center gap-0.5"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px]">Send</span>
              </button>
              <button
                type="button"
                onClick={() => setIsQrOpen(true)}
                className="py-1.5 rounded-lg bg-[#1C1C28] hover:bg-[#252536] border border-[#272738] text-[11px] font-mono text-slate-200 flex flex-col items-center justify-center gap-0.5"
                title="Generate QR Code"
              >
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px]">QR Code</span>
              </button>
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="py-1.5 rounded-lg bg-[#1C1C28] hover:bg-[#252536] border border-[#272738] text-[11px] font-mono text-slate-200 flex flex-col items-center justify-center gap-0.5"
                title="Scan QR Code with Camera"
              >
                <ScanLine className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px]">Scan</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenSwap && onOpenSwap()}
                className="py-1.5 rounded-lg bg-[#1C1C28] hover:bg-[#252536] border border-[#272738] text-[11px] font-mono text-slate-200 flex flex-col items-center justify-center gap-0.5"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[10px]">Swap</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Trigger Dock Button */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`relative group flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border shadow-xl transition-all cursor-pointer active:scale-95 ${
          hasThreats
            ? "bg-red-950/80 hover:bg-red-900 border-red-500/70 text-red-200 shadow-red-950/60 ring-2 ring-red-500/30"
            : "bg-[#14141E]/90 hover:bg-[#1C1C2A] border-[#2A2A3E] hover:border-amber-500/50 text-slate-100 shadow-black/60"
        }`}
        title="Universal Web3 Wallet Extension (MetaMask, Coinbase, Trust, Rabby)"
      >
        {/* Wallet Avatar */}
        <div className="relative">
          <span className="text-xl select-none">{walletState.walletIcon}</span>
          <span
            className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-[#14141E] ${
              hasThreats ? "bg-red-500 animate-ping" : "bg-emerald-400"
            }`}
          />
        </div>

        {/* Info Text */}
        <div className="text-left hidden sm:block">
          <div className="text-xs font-bold text-white flex items-center gap-1.5">
            <span>{walletState.walletName}</span>
            {hasThreats ? (
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-red-500/30 text-red-200 border border-red-500/50">
                DRAINER DETECTED
              </span>
            ) : (
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Shielded
              </span>
            )}
          </div>
          <div className="text-[10px] font-mono text-slate-400">
            {walletState.address.slice(0, 6)}...{walletState.address.slice(-4)}
          </div>
        </div>

        {/* Expand / Minimize Arrow Indicator */}
        <div className="p-1 rounded-md bg-[#1C1C28] text-slate-400 group-hover:text-white transition-colors">
          {isExpanded ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </div>
      </button>

      {/* QR Code Generator Modal */}
      <WalletQrCodeModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        ethAddress={walletState.address}
        solanaAddress={walletState.solanaAddress}
        activeNetwork={walletState.activeNetworkProvider}
        walletName={walletState.walletName}
        walletIcon={walletState.walletIcon}
        onOpenScanner={() => setIsScannerOpen(true)}
      />

      {/* Camera-based Scanner Modal */}
      <WalletCameraScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onAddressImported={(address, network, label, setAsActive) => {
          universalWalletExtensionEngine.addSavedAddress({
            address,
            network,
            label,
            source: "camera_qr_scan",
          });
          if (setAsActive) {
            universalWalletExtensionEngine.setActiveNetworkProvider(network);
            universalWalletExtensionEngine.updateActiveAddress(network, address);
          }
        }}
        onOpenQrGenerator={() => setIsQrOpen(true)}
      />
    </aside>
  );
};
