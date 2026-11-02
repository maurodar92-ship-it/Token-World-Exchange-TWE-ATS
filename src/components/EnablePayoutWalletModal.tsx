import React, { useState, useEffect } from "react";
import {
  X,
  Wallet,
  Sparkles,
  ShieldCheck,
  Key,
  Copy,
  Check,
  Download,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Zap,
  CheckCircle2,
  Lock,
  RefreshCw,
  Landmark,
  FileText,
} from "lucide-react";
import QRCode from "qrcode";
import {
  GeneratedPayoutWallet,
  generateEnabledPayoutWallet,
  enableExistingAddressAsPayoutWallet,
  getEnabledPayoutWallets,
  getActivePayoutWallet,
  diagnoseTokenTransferability,
  TransferDiagnostic,
} from "../utils/payoutWalletManager";

interface EnablePayoutWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  metaMaskAccount?: string | null;
  onWalletEnabled?: (wallet: GeneratedPayoutWallet) => void;
  initialTokenSymbol?: string;
  isInitialSbt?: boolean;
}

export const EnablePayoutWalletModal: React.FC<EnablePayoutWalletModalProps> = ({
  isOpen,
  onClose,
  metaMaskAccount,
  onWalletEnabled,
  initialTokenSymbol = "TOKEN",
  isInitialSbt = false,
}) => {
  const [activeTab, setActiveTab] = useState<"generate" | "connect_existing" | "diagnostic" | "list">("generate");
  const [walletsList, setWalletsList] = useState<GeneratedPayoutWallet[]>(() => getEnabledPayoutWallets());
  const [activeWallet, setActiveWallet] = useState<GeneratedPayoutWallet>(() => getActivePayoutWallet());
  const [justGenerated, setJustGenerated] = useState<GeneratedPayoutWallet | null>(null);
  const [walletLabel, setWalletLabel] = useState<string>("Institutional Trading Depository");
  const [showPrivateKey, setShowPrivateKey] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Diagnostic Form
  const [testTokenSymbol, setTestTokenSymbol] = useState<string>(initialTokenSymbol);
  const [testIsSbt, setTestIsSbt] = useState<boolean>(isInitialSbt);
  const [testRecipient, setTestRecipient] = useState<string>(activeWallet.address);
  const [diagnosticResult, setDiagnosticResult] = useState<TransferDiagnostic | null>(null);

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      const all = getEnabledPayoutWallets();
      setWalletsList(all);
      const primary = getActivePayoutWallet();
      setActiveWallet(primary);
      setTestRecipient(primary.address);
      setJustGenerated(null);
      runDiagnostic(primary.address, initialTokenSymbol, isInitialSbt);
    }
  }, [isOpen, initialTokenSymbol, isInitialSbt]);

  // Generate QR for active/generated wallet
  useEffect(() => {
    const targetAddr = justGenerated?.address || activeWallet.address;
    if (!targetAddr) return;
    QRCode.toDataURL(targetAddr, {
      width: 180,
      margin: 1.5,
      color: {
        dark: "#0F172A",
        light: "#FFFFFF",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.warn("Failed to generate QR code:", err));
  }, [justGenerated, activeWallet]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGenerateNew = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const generated = generateEnabledPayoutWallet({
        label: walletLabel || "Enabled Institutional Payout Wallet",
        autoSetPrimary: true,
        registerAtsIdentity: true,
      });
      setJustGenerated(generated);
      setActiveWallet(generated);
      setWalletsList(getEnabledPayoutWallets());
      setTestRecipient(generated.address);
      setIsGenerating(false);
      runDiagnostic(generated.address, testTokenSymbol, testIsSbt);
      if (onWalletEnabled) onWalletEnabled(generated);
    }, 450);
  };

  const handleEnableConnected = () => {
    if (!metaMaskAccount) return;
    const enabled = enableExistingAddressAsPayoutWallet(metaMaskAccount, "Connected MetaMask Payout Wallet");
    setActiveWallet(enabled);
    setJustGenerated(enabled);
    setWalletsList(getEnabledPayoutWallets());
    setTestRecipient(enabled.address);
    runDiagnostic(enabled.address, testTokenSymbol, testIsSbt);
    if (onWalletEnabled) onWalletEnabled(enabled);
  };

  const runDiagnostic = (recipient: string, symbol: string, sbt: boolean) => {
    const result = diagnoseTokenTransferability({
      tokenSymbol: symbol,
      tokenStandard: sbt ? "ERC-5192" : "ERC-20",
      isSoulbound: sbt,
      recipientPayoutAddress: recipient,
    });
    setDiagnosticResult(result);
  };

  const handleDownloadBackupJson = (wallet: GeneratedPayoutWallet) => {
    const backupData = {
      title: "Token World ATS - Enabled Payout Wallet Keycard",
      exportedAt: new Date().toISOString(),
      walletId: wallet.walletId,
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonicPhrase: wallet.mnemonic,
      publicKey: wallet.publicKey,
      chain: wallet.chain,
      complianceTier: wallet.complianceTier,
      isWhitelistedAts: wallet.isWhitelistedAts,
      securityNotice:
        "CRITICAL: Keep your private key and recovery mnemonic confidential. Never share private keys over unencrypted channels.",
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payout-wallet-${wallet.walletId.toLowerCase()}-backup.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="bg-[#0e111a] border border-[#232b40] rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-200"
        id="enable-payout-wallet-modal"
      >
        {/* Top Header */}
        <div className="p-5 bg-gradient-to-r from-[#141825] via-[#101420] to-[#161a29] border-b border-[#232b40] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Generate &amp; Enable Payout Wallet ID
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  EIP-55 &amp; ATS DvP CLEARED
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Generate or whitelist an authorized payout address to enable token transfers, DEX liquidations, and treasury revenues.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-[#232b40] bg-[#0c0e16] flex items-center gap-1 pt-3">
          <button
            type="button"
            onClick={() => setActiveTab("generate")}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "generate"
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Generate New Payout Wallet</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("diagnostic")}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "diagnostic"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>Transfer Diagnostics (Why Blocked?)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("connect_existing")}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "connect_existing"
                ? "border-emerald-400 text-emerald-300"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Enable Connected MetaMask</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("list")}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "list"
                ? "border-indigo-400 text-indigo-300"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span>All Enabled Wallets ({walletsList.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[calc(85vh-160px)] overflow-y-auto font-sans text-xs">
          {/* TAB 1: GENERATE NEW PAYOUT WALLET */}
          {activeTab === "generate" && (
            <div className="space-y-4">
              {/* Informational Callout */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-white text-xs block">
                    Why does Token World require an Enabled Payout Wallet ID?
                  </span>
                  <p className="text-zinc-300 text-[11px] leading-relaxed">
                    Token transfers and DEX liquidations route through institutional DvP (Delivery vs Payment) smart contracts. A destination address must be registered and whitelisted in the Sovereign Treasury and ATS Identity Registry so that contracts can verify sanctions clearance and dispatch liquidation proceeds.
                  </p>
                </div>
              </div>

              {/* Just Generated Success Display */}
              {justGenerated ? (
                <div className="p-5 rounded-2xl bg-emerald-950/25 border border-emerald-500/40 space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-white text-sm">Payout Wallet ID Successfully Generated &amp; Enabled!</span>
                        <span className="text-[10px] text-emerald-300 block font-mono">
                          Status: Active Primary Payout Depository
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-[10px] font-bold">
                      {justGenerated.walletId}
                    </span>
                  </div>

                  {/* Wallet Specs */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#0a0d14] p-4 rounded-xl border border-[#1f2638]">
                    <div className="md:col-span-2 space-y-3 font-mono text-[11px]">
                      {/* Address */}
                      <div>
                        <span className="text-zinc-400 text-[10px] uppercase block font-sans">
                          EVM Payout Address (EIP-55 Checksum):
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-cyan-300 font-bold select-all break-all">{justGenerated.address}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(justGenerated.address, "addr")}
                            className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer shrink-0"
                            title="Copy Address"
                          >
                            {copiedKey === "addr" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Private Key */}
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400 text-[10px] uppercase font-sans">Private Key (Confidential):</span>
                          <button
                            type="button"
                            onClick={() => setShowPrivateKey(!showPrivateKey)}
                            className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 font-sans cursor-pointer"
                          >
                            {showPrivateKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            <span>{showPrivateKey ? "Hide Key" : "Reveal Key"}</span>
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-amber-300 font-bold select-all break-all">
                            {showPrivateKey
                              ? justGenerated.privateKey
                              : "••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(justGenerated.privateKey, "pk")}
                            className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer shrink-0"
                            title="Copy Private Key"
                          >
                            {copiedKey === "pk" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Recovery Seed Phrase */}
                      <div>
                        <span className="text-zinc-400 text-[10px] uppercase block font-sans">Recovery Mnemonic (12 Words):</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-zinc-300 text-[10px] select-all break-words">{justGenerated.mnemonic}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(justGenerated.mnemonic, "mn")}
                            className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer shrink-0"
                            title="Copy Recovery Phrase"
                          >
                            {copiedKey === "mn" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* QR Code and Actions */}
                    <div className="flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-[#1f2638] pt-3 md:pt-0 md:pl-4 space-y-2">
                      {qrDataUrl && (
                        <div className="p-2 bg-white rounded-xl shadow-md">
                          <img src={qrDataUrl} alt="Payout Address QR" className="w-28 h-28 object-contain" />
                        </div>
                      )}
                      <span className="text-[10px] text-zinc-400 text-center">Mobile &amp; Exchange Scan</span>

                      <button
                        type="button"
                        onClick={() => handleDownloadBackupJson(justGenerated)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#182030] hover:bg-[#202b42] border border-[#2b3a5a] text-cyan-300 font-mono text-[10px] font-semibold transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Keycard (.JSON)</span>
                      </button>
                    </div>
                  </div>

                  {/* 4-Point Clearance Verification Matrix */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
                    <div className="p-2.5 rounded-lg bg-[#121624] border border-[#232b40] text-emerald-300 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>EIP-55 Validated</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#121624] border border-[#232b40] text-emerald-300 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>Treasury Enabled</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#121624] border border-[#232b40] text-emerald-300 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>ATS Whitelisted</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#121624] border border-[#232b40] text-emerald-300 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>Transfers Cleared</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Form to Generate */
                <div className="space-y-4 bg-[#121624] p-5 rounded-2xl border border-[#232b40]">
                  <div className="space-y-2">
                    <label className="text-zinc-300 font-semibold block">Payout Depository Label</label>
                    <input
                      type="text"
                      value={walletLabel}
                      onChange={(e) => setWalletLabel(e.target.value)}
                      placeholder="e.g. Primary Institutional Trading Payout Depository"
                      className="w-full bg-[#181d2e] border border-[#2c3752] rounded-xl px-4 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-[10px] text-zinc-500 block">
                      This label will identify your payout address in the Sovereign Treasury and ATS Orderbook.
                    </span>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={handleGenerateNew}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-950/40 transition-all disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Generating EIP-55 Keypair &amp; Enabling Payout ID...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Generate &amp; Enable Payout Wallet ID Now</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TRANSFER DIAGNOSTICS */}
          {activeTab === "diagnostic" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-2">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
                  <HelpCircle className="w-4 h-4" />
                  <span>Transfer Feasibility &amp; Compliance Audit Engine</span>
                </div>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  Test whether a specific token can be transferred to a payout wallet address, or diagnose why a previous transfer was blocked.
                </p>
              </div>

              {/* Diagnostic Input Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#121624] p-4 rounded-xl border border-[#232b40]">
                <div>
                  <label className="text-zinc-400 text-[10px] uppercase font-semibold block mb-1">Token Symbol</label>
                  <input
                    type="text"
                    value={testTokenSymbol}
                    onChange={(e) => {
                      setTestTokenSymbol(e.target.value.toUpperCase());
                      runDiagnostic(testRecipient, e.target.value.toUpperCase(), testIsSbt);
                    }}
                    placeholder="e.g. MAOMAO, TREE3, SBT"
                    className="w-full bg-[#181d2e] border border-[#2c3752] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 text-[10px] uppercase font-semibold block mb-1">Token Standard</label>
                  <select
                    value={testIsSbt ? "sbt" : "standard"}
                    onChange={(e) => {
                      const isSbt = e.target.value === "sbt";
                      setTestIsSbt(isSbt);
                      runDiagnostic(testRecipient, testTokenSymbol, isSbt);
                    }}
                    className="w-full bg-[#181d2e] border border-[#2c3752] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="standard">ERC-20 / Fungible Token</option>
                    <option value="sbt">ERC-5192 Soulbound Token (SBT)</option>
                  </select>
                </div>

                <div>
                  <label className="text-zinc-400 text-[10px] uppercase font-semibold block mb-1">Target Payout Address</label>
                  <input
                    type="text"
                    value={testRecipient}
                    onChange={(e) => {
                      setTestRecipient(e.target.value);
                      runDiagnostic(e.target.value, testTokenSymbol, testIsSbt);
                    }}
                    placeholder="0x..."
                    className="w-full bg-[#181d2e] border border-[#2c3752] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Diagnostic Results Card */}
              {diagnosticResult && (
                <div
                  className={`p-5 rounded-2xl border space-y-3 animate-in fade-in ${
                    diagnosticResult.status === "ENABLED"
                      ? "bg-emerald-950/25 border-emerald-500/40"
                      : diagnosticResult.status === "BLOCKED"
                      ? "bg-rose-950/25 border-rose-500/40"
                      : "bg-amber-950/25 border-amber-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {diagnosticResult.status === "ENABLED" ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : diagnosticResult.status === "BLOCKED" ? (
                        <Lock className="w-5 h-5 text-rose-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-amber-400" />
                      )}
                      <h4 className="font-bold text-white text-sm">{diagnosticResult.title}</h4>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase border ${
                        diagnosticResult.status === "ENABLED"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : diagnosticResult.status === "BLOCKED"
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                          : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      }`}
                    >
                      {diagnosticResult.status}
                    </span>
                  </div>

                  <p className="text-zinc-300 text-xs leading-relaxed">{diagnosticResult.explanation}</p>

                  <div className="p-3 bg-[#0a0d14] rounded-xl border border-[#1f2638] space-y-1">
                    <span className="text-zinc-400 text-[10px] uppercase font-bold block">Resolution &amp; Next Steps:</span>
                    <p className="text-cyan-300 text-[11px] leading-relaxed">{diagnosticResult.resolution}</p>
                  </div>

                  {diagnosticResult.recommendedAction === "GENERATE_ENABLE_PAYOUT_WALLET" && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("generate")}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Switch to Generator to Enable this Payout Address</span>
                    </button>
                  )}
                </div>
              )}

              {/* The 4 Common Transfer Block Scenarios */}
              <div className="space-y-2 pt-2">
                <span className="font-bold text-white uppercase text-[10px] tracking-wider block">
                  Reference: The 4 Core Transfer Rules in Token World
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div className="p-3 rounded-xl bg-[#121624] border border-[#232b40] space-y-1">
                    <span className="font-bold text-rose-400 block">1. ERC-5192 Soulbound Tokens (SBTs)</span>
                    <p className="text-zinc-400 text-[10px]">
                      SBTs are permanently non-transferable identity badges. Calls to <code>transferFrom()</code> intentionally revert with <code>ErrSoulboundTokenLocked()</code>.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#121624] border border-[#232b40] space-y-1">
                    <span className="font-bold text-amber-400 block">2. Un-Whitelisted Payout Addresses</span>
                    <p className="text-zinc-400 text-[10px]">
                      Institutional ATS and SEC Reg D/S security tokens require recipient addresses to be registered in the Identity Registry before receiving transfers.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#121624] border border-[#232b40] space-y-1">
                    <span className="font-bold text-cyan-400 block">3. Payout Router Not Bound</span>
                    <p className="text-zinc-400 text-[10px]">
                      If the payout wallet is not configured in the Sovereign Treasury, automated liquidation proceeds and DEX swap fees cannot be dispatched.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#121624] border border-[#232b40] space-y-1">
                    <span className="font-bold text-emerald-400 block">4. Enabled Payout Wallet Clearance</span>
                    <p className="text-zinc-400 text-[10px]">
                      Generating or enabling a Payout Wallet ID resolves all clearance gates, ensuring instant peer-to-pool liquidity and atomic DvP settlements.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ENABLE CONNECTED METAMASK */}
          {activeTab === "connect_existing" && (
            <div className="space-y-4 bg-[#121624] p-5 rounded-2xl border border-[#232b40]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Enable Your Active Web3 / MetaMask Wallet</h4>
                  <p className="text-zinc-400 text-[11px]">
                    Promote your personal connected address to an official Enabled Payout Wallet ID.
                  </p>
                </div>
              </div>

              {metaMaskAccount ? (
                <div className="space-y-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-[#0a0d14] border border-[#1f2638] space-y-1">
                    <span className="text-zinc-400 text-[10px] uppercase font-mono block">Detected Connected Address:</span>
                    <span className="text-emerald-300 font-mono font-bold text-xs select-all break-all">
                      {metaMaskAccount}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleEnableConnected}
                    className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/40 transition-all"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Authorize &amp; Enable this MetaMask Address as Primary Payout Wallet ID</span>
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center space-y-2">
                  <span className="text-amber-300 font-bold block">No Web3 Wallet Connected</span>
                  <p className="text-zinc-400 text-[11px]">
                    Connect your MetaMask wallet using the header connection button or generate a new standalone Payout Wallet ID.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("generate")}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Standalone Payout Wallet Instead</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ALL ENABLED WALLETS LIST */}
          {activeTab === "list" && (
            <div className="space-y-3">
              <span className="font-bold text-white uppercase text-[10px] tracking-wider block">
                Registered Enabled Payout Wallets ({walletsList.length})
              </span>

              <div className="space-y-2">
                {walletsList.map((w) => (
                  <div
                    key={w.walletId}
                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors ${
                      w.isPrimaryPayout
                        ? "bg-emerald-950/20 border-emerald-500/40 shadow-sm"
                        : "bg-[#121624] border-[#232b40]"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-xs">{w.label}</span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {w.walletId}
                        </span>
                        {w.isPrimaryPayout && (
                          <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                            PRIMARY ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[11px] text-cyan-300 select-all break-all">
                        {w.address}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopy(w.address, `list_${w.walletId}`)}
                        className="p-1.5 rounded-lg bg-[#1a2030] hover:bg-[#222b40] text-zinc-300 hover:text-white transition-colors cursor-pointer"
                        title="Copy Address"
                      >
                        {copiedKey === `list_${w.walletId}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadBackupJson(w)}
                        className="p-1.5 rounded-lg bg-[#1a2030] hover:bg-[#222b40] text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                        title="Download Backup Keycard"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#0a0c12] border-t border-[#232b40] flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Active Payout Router: <strong className="text-white select-all">{activeWallet.walletId}</strong></span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs cursor-pointer transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
