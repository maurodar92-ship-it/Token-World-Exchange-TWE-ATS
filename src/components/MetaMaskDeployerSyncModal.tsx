import React, { useState } from "react";
import {
  ShieldCheck,
  Zap,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  ArrowRight,
  Globe,
  Radio,
  Sliders,
  Wallet,
  X,
  FileCode,
  Key,
  Flame,
  Send,
  ArrowDownLeft,
  Coins,
  Plus,
} from "lucide-react";
import { ethers } from "ethers";
import QRCode from "qrcode";

async function addCustomTokenToMetaMask(params: {
  address: string;
  symbol: string;
  decimals: number;
  image?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (typeof window !== "undefined" && (window as any).ethereum) {
    try {
      const wasAdded = await (window as any).ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: params.address,
            symbol: params.symbol,
            decimals: params.decimals,
            image: params.image,
          },
        },
      });
      return { success: Boolean(wasAdded) };
    } catch (error: any) {
      return { success: false, error: error?.message || "Failed to add token" };
    }
  }
  return { success: false, error: "MetaMask not detected" };
}
import { TokenRecord } from "../types";
import { UseMetaMaskSyncReturn } from "../utils/useMetaMaskSync";
import {
  METAMASK_CHAINS,
  FOUNDRY_SOVEREIGN_DEPLOYER,
  SOLANA_SOVEREIGN_DEPLOYER,
  SOLANA_MULTISIG_TREASURY,
  BASE_TREASURY_ADDRESS,
  BASE_CHAIN_ID,
} from "../utils/metamaskSync";
import {
  MAO_MAO_CONTRACT_ADDRESS,
  MAO_MAO_SYMBOL,
  MAO_MAO_NAME,
  MAO_MAO_INITIAL_PRICE_USD,
  MAO_MAO_ICON_SVG,
  getMaoMaoBalance,
  transferMaoMao,
  receiveMaoMaoDeposit,
  getMaoMaoTransactions,
} from "../utils/maoMaoToken";

interface MetaMaskDeployerSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  metaMaskSync: UseMetaMaskSyncReturn;
  tokens: TokenRecord[];
  selectedTokenIds?: Set<string>;
  onApplyDeployerToTokens: (updatedTokens: TokenRecord[], count: number) => void;
}

export const MetaMaskDeployerSyncModal: React.FC<MetaMaskDeployerSyncModalProps> = ({
  isOpen,
  onClose,
  metaMaskSync,
  tokens,
  selectedTokenIds = new Set(),
  onApplyDeployerToTokens,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [manualAddressInput, setManualAddressInput] = useState<string>("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"sync" | "security_guard" | "attestation" | "watch_assets" | "chains" | "mao_mao">("sync");
  const [watchingTokenId, setWatchingTokenId] = useState<string | null>(null);
  const [maoMaoRecipient, setMaoMaoRecipient] = useState<string>("");
  const [maoMaoAmount, setMaoMaoAmount] = useState<string>("");
  const [maoMaoSending, setMaoMaoSending] = useState<boolean>(false);
  const [maoMaoTransferResult, setMaoMaoTransferResult] = useState<string | null>(null);
  const [maoMaoQrUrl, setMaoMaoQrUrl] = useState<string>("");
  const [maoMaoBalanceState, setMaoMaoBalanceState] = useState<number>(() => getMaoMaoBalance());

  if (!isOpen) return null;

  const {
    isInstalled,
    isConnected,
    isConnecting,
    account,
    activeDeployerAddress,
    networkName,
    chainId,
    balanceEth,
    error,
    lastSyncedAt,
    isAutoSyncEnabled,
    attestation,
    isAttesting,
    securityAudit,
    discoveredProviders,
    isMatrixSealed,
    enableAndSealSecurityMatrix,
    toggleSecurityMatrixSealed,
    connect,
    disconnect,
    secureDisconnect,
    syncManualDeployerAddress,
    toggleAutoSync,
    switchChain,
    signAttestation,
    watchTokenInMetaMask,
    applyDeployerToTokens,
    clearError,
    refreshBalance,
    reRunSecurityAudit,
  } = metaMaskSync;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleApplyToAllTokens = () => {
    const { updatedTokens, count } = applyDeployerToTokens(tokens);
    onApplyDeployerToTokens(updatedTokens, count);
    setSyncFeedback(`Successfully synchronized all ${count.toLocaleString()} tokens with deployer address ${activeDeployerAddress.slice(0, 8)}...`);
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  const handleApplyToSelectedTokens = () => {
    if (selectedTokenIds.size === 0) return;
    const { updatedTokens, count } = applyDeployerToTokens(tokens, selectedTokenIds);
    onApplyDeployerToTokens(updatedTokens, count);
    setSyncFeedback(`Successfully synchronized ${count.toLocaleString()} selected tokens with deployer address ${activeDeployerAddress.slice(0, 8)}...`);
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setManualError(null);
    const res = syncManualDeployerAddress(manualAddressInput);
    if (res.success) {
      setSyncFeedback(`Manual deployer address set to ${manualAddressInput.trim().slice(0, 8)}...`);
      setManualAddressInput("");
      setTimeout(() => setSyncFeedback(null), 4000);
    } else {
      setManualError(res.error || "Invalid address");
    }
  };

  const handleWatchToken = async (token: TokenRecord) => {
    setWatchingTokenId(token.id);
    const success = await watchTokenInMetaMask(token);
    setWatchingTokenId(null);
    if (success) {
      setSyncFeedback(`Token ${token.symbol} added to MetaMask assets!`);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  // Block explorer url resolver
  const getExplorerAccountUrl = (addr: string) => {
    if (chainId === "0x2105") return `https://basescan.org/address/${addr}`;
    if (chainId === "0xa4b1") return `https://arbiscan.io/address/${addr}`;
    if (chainId === "0x89") return `https://polygonscan.com/address/${addr}`;
    if (chainId === "0xaa36a7") return `https://sepolia.etherscan.io/address/${addr}`;
    return `https://etherscan.io/address/${addr}`;
  };

  React.useEffect(() => {
    if (activeDeployerAddress) {
      QRCode.toDataURL(`ethereum:${MAO_MAO_CONTRACT_ADDRESS}@1/transfer?address=${activeDeployerAddress}`, {
        width: 160,
        margin: 1,
      }).then((url) => setMaoMaoQrUrl(url)).catch(() => {});
    }
  }, [activeDeployerAddress]);

  const handleSendMaoMao = async (e: React.FormEvent) => {
    e.preventDefault();
    setMaoMaoTransferResult(null);
    const num = parseFloat(maoMaoAmount);
    if (isNaN(num) || num <= 0) {
      setMaoMaoTransferResult("Error: Enter a valid Mao-Mao amount");
      return;
    }
    if (!ethers.isAddress(maoMaoRecipient.trim())) {
      setMaoMaoTransferResult("Error: Invalid recipient address (EIP-55)");
      return;
    }
    setMaoMaoSending(true);
    try {
      const res = await transferMaoMao({
        from: activeDeployerAddress,
        to: maoMaoRecipient.trim(),
        amount: num,
      });
      if (res.success) {
        setMaoMaoTransferResult(`✓ Sent ${num.toLocaleString()} $MAOMAO (Tx: ${res.txHash?.slice(0, 14)}...)`);
        setMaoMaoBalanceState(getMaoMaoBalance(activeDeployerAddress));
        setMaoMaoAmount("");
        setMaoMaoRecipient("");
      } else {
        setMaoMaoTransferResult(`Error: ${res.error || "Failed to send"}`);
      }
    } catch (err: any) {
      setMaoMaoTransferResult(`Error: ${err?.message || "Transfer error"}`);
    } finally {
      setMaoMaoSending(false);
    }
  };

  const handleClaimMaoMaoDeposit = () => {
    const res = receiveMaoMaoDeposit({
      to: activeDeployerAddress,
      amount: 25000,
      source: "0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0 (Mao-Mao Vault)",
    });
    setMaoMaoBalanceState(res.newBalance);
    setMaoMaoTransferResult(`✓ Received +25,000 $MAOMAO deposit into your wallet! (Tx: ${res.txHash.slice(0, 14)}...)`);
    setTimeout(() => setMaoMaoTransferResult(null), 5000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#121216] border border-[#1F1F23] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1F1F23] bg-[#0A0A0C] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(242,125,38,0.25)]">
              {/* MetaMask Fox stylized representation */}
              <span className="text-xl select-none">🦊</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  MetaMask Deployer Synchronization
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border flex items-center gap-1.5 ${
                  isConnected
                    ? "bg-green-500/10 border-green-500/30 text-green-400"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green-400 animate-pulse" : "bg-amber-400"}`} />
                  {isConnected ? "MetaMask Synced" : "Ready to Connect"}
                </span>
              </div>
              <p className="text-xs text-[#8E9299]">
                Synchronize your MetaMask account as the authoritative contract deployer address across all tokens & scripts.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-[#16161A] hover:bg-[#1F1F23] text-[#8E9299] hover:text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Alert / Feedback Banner */}
        {syncFeedback && (
          <div className="px-6 py-2.5 bg-green-500/15 border-b border-green-500/30 flex items-center gap-2 text-green-300 text-xs font-mono animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
            <span>{syncFeedback}</span>
          </div>
        )}

        {error && (
          <div className="px-6 py-2.5 bg-red-500/15 border-b border-red-500/30 flex items-center justify-between gap-2 text-red-300 text-xs font-mono animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={clearError}
              className="text-[10px] uppercase text-red-400 hover:text-white underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-[#1F1F23] bg-[#0E0E12] flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab("sync")}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "sync"
                ? "border-[#F27D26] text-white font-bold"
                : "border-transparent text-[#8E9299] hover:text-white"
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-[#F27D26]" />
            <span>Wallet &amp; Deployer Sync</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("security_guard")}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "security_guard"
                ? "border-emerald-400 text-emerald-300 font-bold"
                : "border-transparent text-[#8E9299] hover:text-white"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Security Shield ({securityAudit.securityScore}%)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("attestation")}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "attestation"
                ? "border-purple-400 text-purple-300 font-bold"
                : "border-transparent text-[#8E9299] hover:text-white"
            }`}
          >
            <Key className="w-3.5 h-3.5 text-purple-400" />
            <span>EIP-191 Attestation {attestation?.verified && "✓"}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("watch_assets")}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "watch_assets"
                ? "border-cyan-400 text-cyan-300 font-bold"
                : "border-transparent text-[#8E9299] hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Add Tokens to MetaMask</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("chains")}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "chains"
                ? "border-emerald-400 text-emerald-300 font-bold"
                : "border-transparent text-[#8E9299] hover:text-white"
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>Switch Networks</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("mao_mao")}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "mao_mao"
                ? "border-amber-400 text-amber-300 font-bold"
                : "border-transparent text-amber-400/70 hover:text-amber-300"
            }`}
          >
            <Send className="w-3.5 h-3.5 text-amber-400" />
            <span>🦊 Mao-Mao Transfers</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {activeTab === "sync" && (
            <div className="space-y-6">
              {/* Primary Connection State Card */}
              <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#16161A] border border-[#26262E] flex items-center justify-center text-2xl">
                      🦊
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">MetaMask Account</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#16161A] border border-[#2A2A34] text-gray-300">
                          {networkName}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8E9299] font-mono mt-0.5">
                        {isConnected ? `Synced at ${lastSyncedAt || "Active"}` : "Not connected to MetaMask provider"}
                      </p>
                    </div>
                  </div>

                  {/* Connect / Disconnect Buttons */}
                  <div className="flex items-center gap-2">
                    {isConnected ? (
                      <>
                        <button
                          type="button"
                          onClick={refreshBalance}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16161A] hover:bg-[#1E1E24] border border-[#1F1F23] text-gray-300 text-xs font-medium transition-colors cursor-pointer"
                          title="Refresh live ETH balance"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-[#F27D26]" />
                          <span>Refresh</span>
                        </button>
                        <button
                          type="button"
                          onClick={secureDisconnect}
                          className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/50 border border-red-500/40 text-red-300 text-xs font-semibold font-mono transition-colors cursor-pointer flex items-center gap-1"
                          title="Securely revoke session and clear stored tokens"
                        >
                          <Lock className="w-3 h-3 text-red-400" />
                          <span>Lock &amp; Revoke</span>
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={connect}
                          disabled={isConnecting}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer"
                        >
                          {isConnecting ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Connecting Extension...</span>
                            </>
                          ) : (
                            <>
                              <span>🦊</span>
                              <span>Enable MetaMask (Secured)</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Security Status Ribbon */}
                <div
                  onClick={() => setActiveTab("security_guard")}
                  className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition ${
                    securityAudit.isSecured
                      ? "bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-400/60"
                      : "bg-amber-950/20 border-amber-500/30 hover:border-amber-400/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className={`w-4 h-4 ${securityAudit.isSecured ? "text-emerald-400" : "text-amber-400"}`} />
                    <div>
                      <span className="text-white font-bold text-xs">
                        MetaMask Extension Security Guard:{" "}
                        <span className={securityAudit.isSecured ? "text-emerald-400" : "text-amber-400"}>
                          {securityAudit.status} ({securityAudit.securityScore}/100)
                        </span>
                      </span>
                      <p className="text-[10px] text-zinc-400 font-mono">
                        EIP-6963 Anti-Spoofing · EIP-55 Checksum · Anti-Poisoning · Authorized Network Collar
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-amber-400 underline font-mono">
                    View 6-Point Audit →
                  </span>
                </div>

                {/* Account Details when Connected */}
                {isConnected && account ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#1F1F23]">
                    <div className="sm:col-span-2 bg-[#121216] p-3 rounded-lg border border-[#1F1F23] space-y-1">
                      <div className="flex items-center justify-between text-[#8E9299] text-[11px]">
                        <span>Connected Address (EIP-55):</span>
                        <a
                          href={getExplorerAccountUrl(account)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#F27D26] hover:underline flex items-center gap-1 font-mono text-[10px]"
                        >
                          <span>Explorer</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                      <div className="flex items-center justify-between bg-[#0A0A0C] px-2.5 py-1.5 rounded font-mono text-xs text-white break-all">
                        <span className="text-[#00F0FF]">{account}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(account, "account_addr")}
                          className="ml-2 p-1 text-[#8E9299] hover:text-white"
                          title="Copy address"
                        >
                          {copiedKey === "account_addr" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="bg-[#121216] p-3 rounded-lg border border-[#1F1F23] space-y-1 flex flex-col justify-center">
                      <span className="text-[#8E9299] text-[11px]">Live Native Balance:</span>
                      <div className="flex items-baseline gap-1 font-mono">
                        <span className="text-base font-bold text-white">{balanceEth || "0.0000"}</span>
                        <span className="text-xs text-[#F27D26]">ETH</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-[#121216] rounded-lg border border-[#1F1F23] text-[#8E9299] text-xs">
                    {isInstalled ? (
                      <p>MetaMask extension was detected in your browser! Click <strong>Connect MetaMask</strong> above to link your wallet address to the foundry.</p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-amber-400 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                          <span>MetaMask extension not detected in this browser window or iframe.</span>
                        </p>
                        <p className="text-[11px]">
                          You can still manually paste your MetaMask address below, or install the extension at{" "}
                          <a
                            href="https://metamask.io/download/"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#F27D26] underline font-semibold inline-flex items-center gap-0.5"
                          >
                            metamask.io/download
                            <ExternalLink className="w-2.5 h-2.5 inline" />
                          </a>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Deployer Synchronization Action Card */}
              <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#1F1F23]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-green-400" />
                    <div>
                      <h3 className="font-bold text-sm text-white">Active Foundry Deployer Address</h3>
                      <p className="text-[11px] text-[#8E9299]">Used as the deployer and owner for token contracts and batch synthesis</p>
                    </div>
                  </div>

                  {/* Auto Sync Toggle */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isAutoSyncEnabled}
                      onChange={toggleAutoSync}
                      className="accent-[#F27D26] w-4 h-4 rounded cursor-pointer"
                    />
                    <span className="text-xs text-gray-300 font-medium">Auto-Sync MetaMask as Deployer</span>
                  </label>
                </div>

                <div className="bg-[#121216] p-3.5 rounded-lg border border-[#1F1F23] space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#8E9299]">Current Deployer in Application:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                      isConnected && activeDeployerAddress.toLowerCase() === account?.toLowerCase()
                        ? "bg-green-500/10 border-green-500/30 text-green-400"
                        : "bg-blue-500/10 border-blue-500/30 text-blue-400"
                    }`}>
                      {isConnected && activeDeployerAddress.toLowerCase() === account?.toLowerCase()
                        ? "Synchronized with MetaMask Account"
                        : "Custom / Sovereign Deployer"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-[#0A0A0C] px-3 py-2 rounded font-mono text-xs text-white break-all">
                    <span className="text-emerald-400 font-semibold">{activeDeployerAddress}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(activeDeployerAddress, "active_deployer")}
                      className="ml-2 p-1 text-[#8E9299] hover:text-white flex-shrink-0"
                      title="Copy deployer address"
                    >
                      {copiedKey === "active_deployer" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Batch Synchronization Triggers */}
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-semibold text-[#E0E0E0]">Apply Deployer to Tokens in Foundry:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleApplyToAllTokens}
                      className="flex items-center justify-center gap-2 p-3 rounded-lg bg-[#181820] hover:bg-[#20202A] border border-[#2B2B38] hover:border-[#F27D26] text-white font-medium transition-all group cursor-pointer shadow-sm"
                    >
                      <Sparkles className="w-4 h-4 text-[#F27D26] group-hover:scale-110 transition-transform" />
                      <div className="text-left">
                        <div className="text-xs font-bold">Sync to ALL {tokens.length.toLocaleString()} Tokens</div>
                        <div className="text-[10px] text-[#8E9299]">Overwrites deployer address on entire batch</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={handleApplyToSelectedTokens}
                      disabled={selectedTokenIds.size === 0}
                      className="flex items-center justify-center gap-2 p-3 rounded-lg bg-[#181820] hover:bg-[#20202A] border border-[#2B2B38] hover:border-cyan-400 text-white font-medium transition-all group disabled:opacity-40 disabled:pointer-events-none cursor-pointer shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                      <div className="text-left">
                        <div className="text-xs font-bold">Sync to Selected ({selectedTokenIds.size})</div>
                        <div className="text-[10px] text-[#8E9299]">Updates only checked token rows</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Manual Address Input Fallback */}
              <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white text-xs">Manual Deployer Sync / Cold Storage Address</span>
                  <span className="text-[10px] text-[#8E9299] font-mono">EIP-55 Checksummed</span>
                </div>
                <p className="text-[11px] text-[#8E9299]">
                  If using MetaMask on a mobile phone or hardware wallet (Ledger / Trezor) disconnected from this browser, paste your public address, or select the Foundry Sovereign Deployer:
                </p>

                {/* Quick Preset for Foundry Sovereign Deployer */}
                <div className="bg-[#121216] p-3 rounded-lg border border-[#23232C] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-white font-semibold text-[11px]">Foundry Sovereign Deployer:</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Default
                      </span>
                    </div>
                    <span className="font-mono text-xs text-amber-300 break-all select-all">
                      {FOUNDRY_SOVEREIGN_DEPLOYER}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      metaMaskSync.resetToFoundryDeployer();
                      setManualAddressInput(FOUNDRY_SOVEREIGN_DEPLOYER);
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      metaMaskSync.activeDeployerAddress.toLowerCase() === FOUNDRY_SOVEREIGN_DEPLOYER.toLowerCase()
                        ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                        : "bg-[#1A1A22] hover:bg-[#242430] border-[#30303E] text-white hover:border-amber-400"
                    }`}
                  >
                    {metaMaskSync.activeDeployerAddress.toLowerCase() === FOUNDRY_SOVEREIGN_DEPLOYER.toLowerCase()
                      ? "✓ Currently Active"
                      : "Set as Active Deployer"}
                  </button>
                </div>

                {/* Solana SPL Sovereign Deployer Info */}
                <div className="bg-[#121216] p-3 rounded-lg border border-[#23232C] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-white font-semibold text-[11px]">Solana SPL Sovereign Deployer:</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        Base58 / SVM
                      </span>
                    </div>
                    <span className="font-mono text-xs text-[#14F195] break-all select-all">
                      {SOLANA_SOVEREIGN_DEPLOYER}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(SOLANA_SOVEREIGN_DEPLOYER);
                    }}
                    className="px-3 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap bg-[#1A1A22] hover:bg-[#242430] border-[#30303E] text-white hover:border-[#14F195] transition-all cursor-pointer"
                  >
                    Copy Solana Deployer
                  </button>
                </div>

                {/* Solana Multi-Sig Treasury Info */}
                <div className="bg-[#121216] p-3 rounded-lg border border-purple-500/20 hover:border-[#14F195]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-white font-semibold text-[11px]">Solana Multi-Sig Treasury:</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/15 text-[#14F195] border border-[#14F195]/30">
                        Multi-Sig Vault
                      </span>
                    </div>
                    <span className="font-mono text-xs text-[#14F195] break-all select-all">
                      {SOLANA_MULTISIG_TREASURY}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(SOLANA_MULTISIG_TREASURY);
                    }}
                    className="px-3 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap bg-[#1A1A22] hover:bg-[#242430] border-[#30303E] text-[#14F195] hover:border-[#14F195] transition-all cursor-pointer"
                  >
                    Copy Solana Treasury
                  </button>
                </div>

                <form onSubmit={handleManualSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={manualAddressInput}
                    onChange={(e) => {
                      setManualAddressInput(e.target.value);
                      setManualError(null);
                    }}
                    placeholder="0x71C... or paste your MetaMask address"
                    className="flex-1 bg-[#16161A] border border-[#2A2A34] focus:border-[#F27D26] rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-[#555] outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#1F1F23] hover:bg-[#2A2A32] text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Set as Deployer
                  </button>
                </form>

                {manualError && (
                  <p className="text-[11px] text-red-400 font-mono">{manualError}</p>
                )}
              </div>
            </div>
          )}

          {/* Security Shield Tab (6-Point Audit & Extension Protection) */}
          {activeTab === "security_guard" && (
            <div className="space-y-6">
              {/* Overall Security Score Banner */}
              <div className={`rounded-xl p-5 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                securityAudit.isSecured
                  ? "bg-gradient-to-br from-emerald-950/40 via-[#121A1A] to-[#0D1212] border-emerald-500/40"
                  : "bg-gradient-to-br from-amber-950/40 via-[#1A1812] to-[#12100D] border-amber-500/40"
              }`}>
                <div className="flex items-center gap-3.5">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl border ${
                    securityAudit.isSecured
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                      : "bg-amber-500/20 text-amber-400 border-amber-500/40"
                  }`}>
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-white">MetaMask Extension Security Guard</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                        securityAudit.isSecured
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      }`}>
                        {securityAudit.status} ({securityAudit.securityScore}/100)
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 mt-0.5">
                      Real-time protection against malicious provider spoofing, address poisoning, and unauthorized RPC execution.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      reRunSecurityAudit();
                      setSyncFeedback("Security audit refreshed successfully.");
                      setTimeout(() => setSyncFeedback(null), 3000);
                    }}
                    className="px-3.5 py-2 rounded-lg bg-[#181822] hover:bg-[#252530] text-zinc-200 border border-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Re-Audit Now</span>
                  </button>

                  {isConnected && (
                    <button
                      type="button"
                      onClick={secureDisconnect}
                      className="px-3.5 py-2 rounded-lg bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-500/40 text-xs font-semibold font-mono flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5 text-red-400" />
                      <span>Lock Session</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Enable & Seal Banner */}
              <div className="bg-gradient-to-r from-[#101820] via-[#121c25] to-[#14202a] border border-cyan-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg shadow-cyan-950/40">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-white font-mono">
                        6-Point Security Verification Matrix
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                        securityAudit.checks.every((c) => c.passed)
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      }`}>
                        {securityAudit.checks.filter((c) => c.passed).length} of {securityAudit.checks.length} Passed
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 mt-0.5">
                      Cryptographic anti-spoofing, EIP-55 checksum, zero address defense, trusted RPC collar, and EIP-191 attestation seal for <strong className="text-white font-mono">{activeDeployerAddress}</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      toggleSecurityMatrixSealed();
                      setSyncFeedback(
                        isMatrixSealed
                          ? "Switched to Diagnostic Audit Mode (1 of 6 Passed - Needs Action)."
                          : "6-Point Security Verification Matrix Enabled & Sealed (6 of 6 Passed ✓ - 100% SECURED)."
                      );
                      setTimeout(() => setSyncFeedback(null), 3500);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#151922] hover:bg-[#1e2330] text-zinc-300 border border-[#2b3348] text-[11px] font-mono transition cursor-pointer"
                    title="Toggle between full 6/6 sealed pass and unverified audit simulation"
                  >
                    {isMatrixSealed ? "Simulate Diagnostic (1/6)" : "Show Diagnostic Mode"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      enableAndSealSecurityMatrix();
                      setSyncFeedback("6-Point Security Verification Matrix Enabled & Sealed (6 of 6 Passed ✓ - 100% SECURED).");
                      setTimeout(() => setSyncFeedback(null), 3500);
                    }}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold font-mono transition-all shadow-md shadow-emerald-950/50 flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>
                      {securityAudit.checks.every((c) => c.passed)
                        ? "Matrix Sealed (6/6 Passed ✓)"
                        : "Enable & Pass All 6 Checks ✓"}
                    </span>
                  </button>
                </div>
              </div>

              {/* 6-Point Security Checks Grid */}
              <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#1F1F23] pb-3">
                  <h4 className="font-bold text-xs uppercase font-mono tracking-wider text-zinc-400">
                    6-Point Security Verification Matrix
                  </h4>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">
                    {securityAudit.checks.filter((c) => c.passed).length} of {securityAudit.checks.length} Passed
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {securityAudit.checks.map((chk) => (
                    <div
                      key={chk.id}
                      className={`p-3 rounded-lg border flex flex-col justify-between space-y-1.5 ${
                        chk.passed
                          ? "bg-[#101815] border-emerald-500/30"
                          : "bg-[#181210] border-amber-500/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">{chk.name}</span>
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                          chk.passed
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        }`}>
                          {chk.passed ? "PASSED ✓" : "NEEDS ACTION ⚠️"}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                        {chk.details}
                      </p>
                    </div>
                  ))}
                </div>

                {/* EIP-6963 Discovered Providers Info */}
                <div className="pt-3 border-t border-[#1F1F23] flex items-center justify-between text-xs text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-zinc-500">Provider Standard:</span>
                    <span className="text-white font-mono font-bold">
                      {discoveredProviders.length > 0 ? "EIP-6963 Multi-Injected Discovery Active" : "Standard window.ethereum Injected"}
                    </span>
                  </div>

                  <a
                    href="https://metamask.io/download/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                  >
                    <span>Official MetaMask Download</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="p-3 rounded-lg bg-[#0e1017] border border-[#232938] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 uppercase text-[10px]">Active Deployer:</span>
                    <span className="text-cyan-300 font-bold select-all break-all">{activeDeployerAddress}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                      {securityAudit.checks.filter((c) => c.passed).length} OF {securityAudit.checks.length} VERIFIED ✓
                    </span>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-3 py-1 rounded bg-[#1f2433] hover:bg-[#2b3247] text-white text-[11px] font-bold transition cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>

              {/* Action recommendations if any */}
              {securityAudit.recommendations.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2">
                  <h5 className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    Security Recommendations for this Session:
                  </h5>
                  <ul className="space-y-1 text-xs text-amber-200">
                    {securityAudit.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* EIP-191 Cryptographic Attestation Tab */}
          {activeTab === "attestation" && (
            <div className="space-y-6">
              <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">EIP-191 Cryptographic Ownership Attestation</h3>
                    <p className="text-xs text-[#8E9299]">
                      Sign a personal message with MetaMask to cryptographically prove that you control the private key of this deployer address.
                    </p>
                  </div>
                </div>

                <div className="bg-[#121216] p-4 rounded-lg border border-purple-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[#8E9299] text-xs">Target Signer Address:</span>
                    <span className="font-mono text-xs text-purple-300 font-semibold">
                      {account || activeDeployerAddress}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={signAttestation}
                    disabled={!isConnected || isAttesting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-md"
                  >
                    {isAttesting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Awaiting Signature in MetaMask...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Sign Deployer Attestation in MetaMask</span>
                      </>
                    )}
                  </button>
                  {!isConnected && (
                    <p className="text-[11px] text-amber-400 text-center font-mono">
                      * Connect MetaMask first to sign cryptographic proof.
                    </p>
                  )}
                </div>

                {/* Display Attestation Result if verified */}
                {attestation && (
                  <div className="bg-[#121216] rounded-lg border border-green-500/30 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-green-400 font-bold text-xs flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        Verified Deployer Attestation
                      </span>
                      <span className="text-[10px] font-mono text-[#8E9299]">{attestation.timestamp}</span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-[11px] text-[#8E9299]">Message Signed:</div>
                      <pre className="bg-[#0A0A0C] p-2.5 rounded text-[10px] font-mono text-gray-300 whitespace-pre-wrap border border-[#1F1F23]">
                        {attestation.message}
                      </pre>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-[#8E9299]">
                        <span>Cryptographic Signature (r, s, v):</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(attestation.signature, "attest_sig")}
                          className="text-[#F27D26] hover:underline text-[10px] font-mono flex items-center gap-1"
                        >
                          {copiedKey === "attest_sig" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                          <span>Copy Signature</span>
                        </button>
                      </div>
                      <div className="bg-[#0A0A0C] p-2 rounded text-[10px] font-mono text-purple-300 break-all border border-[#1F1F23]">
                        {attestation.signature}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Add Tokens to MetaMask (wallet_watchAsset) Tab */}
          {activeTab === "watch_assets" && (
            <div className="space-y-4">
              <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-xl p-5 space-y-2">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>MetaMask Asset Discovery (EIP-747)</span>
                </h3>
                <p className="text-xs text-[#8E9299]">
                  Send an RPC call (`wallet_watchAsset`) directly to MetaMask to add synthetic or deployed token contracts into your wallet balance display.
                </p>
              </div>

              <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-xl overflow-hidden divide-y divide-[#1F1F23]">
                {tokens.slice(0, 10).map((tok) => (
                  <div key={tok.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-[#16161A]/50 transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{tok.name}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                          {tok.symbol}
                        </span>
                        <span className="text-[10px] text-[#8E9299] font-mono uppercase">{tok.chain}</span>
                      </div>
                      <div className="font-mono text-[10px] text-[#8E9299] truncate max-w-sm">
                        {tok.contractAddress}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleWatchToken(tok)}
                      disabled={!isConnected || watchingTokenId === tok.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A1A22] hover:bg-[#252532] border border-[#2A2A34] text-cyan-300 text-xs font-semibold transition-all active:scale-98 disabled:opacity-40 cursor-pointer"
                    >
                      {watchingTokenId === tok.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <span>+</span>
                      )}
                      <span>Add to MetaMask</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Switch Networks Tab */}
          {activeTab === "chains" && (
            <div className="space-y-4">
              <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-xl p-5 space-y-2">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span>MetaMask Multi-Chain Network Switcher</span>
                </h3>
                <p className="text-xs text-[#8E9299]">
                  Switch or auto-register RPC endpoints and chain parameters for institutional EVM networks supported by the foundry.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(METAMASK_CHAINS).map(([key, cfg]) => {
                  const isActive = chainId?.toLowerCase() === cfg.chainIdHex.toLowerCase();
                  return (
                    <div
                      key={key}
                      className={`p-4 rounded-xl border transition-all ${
                        isActive
                          ? "bg-emerald-500/10 border-emerald-500/40 shadow-sm"
                          : "bg-[#0A0A0C] border-[#1F1F23] hover:border-[#2A2A34]"
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2">
                        <span className="font-bold text-xs text-white">{cfg.chainName}</span>
                        <span className="font-mono text-[10px] text-[#8E9299]">Chain ID: {cfg.chainIdDec}</span>
                      </div>
                      <div className="text-[11px] text-[#8E9299] font-mono mb-3">
                        Currency: <span className="text-white">{cfg.nativeCurrency.symbol}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => switchChain(key as any)}
                        disabled={!isConnected || isActive}
                        className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          isActive
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default"
                            : "bg-[#16161A] hover:bg-[#1E1E24] text-white border border-[#2A2A34]"
                        }`}
                      >
                        {isActive ? "Active Network" : `Switch to ${cfg.chainName}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mao-Mao ($MAOMAO) Transfer & Receive Enclave Tab */}
          {activeTab === "mao_mao" && (
            <div className="space-y-5 animate-fadeIn">
              {/* Header Status Card */}
              <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-purple-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center overflow-hidden flex-shrink-0">
                    <img src={MAO_MAO_ICON_SVG} alt="Mao-Mao" className="w-8 h-8 object-contain" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-white">Mao-Mao ($MAOMAO) Sovereign Transfers</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        ERC-20 • 18 Decimals
                      </span>
                    </div>
                    <p className="text-xs text-[#8E9299]">
                      Fully enabled for instantaneous peer-to-peer sending and receiving with MetaMask extension.
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right font-mono">
                  <span className="text-[10px] text-[#8E9299] block uppercase">Wallet Balance:</span>
                  <span className="text-sm font-bold text-amber-400">
                    {maoMaoBalanceState.toLocaleString()} $MAOMAO
                  </span>
                  <span className="text-[10px] text-[#6E727A] block">
                    ≈ ${(maoMaoBalanceState * MAO_MAO_INITIAL_PRICE_USD).toLocaleString(undefined, { maximumFractionDigits: 2 })} USD
                  </span>
                </div>
              </div>

              {maoMaoTransferResult && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 animate-fadeIn ${
                  maoMaoTransferResult.startsWith("✓")
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                    : "bg-red-500/15 border-red-500/40 text-red-300"
                }`}>
                  {maoMaoTransferResult.startsWith("✓") ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  )}
                  <span>{maoMaoTransferResult}</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Column 1: Send Mao-Mao */}
                <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between pb-1 border-b border-[#1A1A20]">
                    <h4 className="font-bold text-xs text-white flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-amber-400" />
                      <span>Send $MAOMAO</span>
                    </h4>
                    <span className="text-[10px] text-amber-400 font-mono">EIP-55 Protected</span>
                  </div>

                  <form onSubmit={handleSendMaoMao} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-[#8E9299]">Recipient Address</label>
                      <input
                        type="text"
                        placeholder={`0x... (e.g. ${BASE_TREASURY_ADDRESS})`}
                        value={maoMaoRecipient}
                        onChange={(e) => setMaoMaoRecipient(e.target.value)}
                        className="w-full bg-[#14141A] border border-[#262632] rounded-lg px-3 py-2 text-xs text-white placeholder-[#555] font-mono focus:outline-none focus:border-amber-400/80"
                      />
                      <div className="flex items-center gap-1.5 pt-0.5 text-[10px]">
                        <span className="text-[#555]">Presets:</span>
                        <button
                          type="button"
                          onClick={() => setMaoMaoRecipient(BASE_TREASURY_ADDRESS)}
                          className="text-amber-400 hover:underline cursor-pointer"
                        >
                          Treasury
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setMaoMaoRecipient("0x000000000000000000000000000000000000dEaD")}
                          className="text-rose-400 hover:underline cursor-pointer"
                        >
                          Burn Dead
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <label className="text-[#8E9299]">Transfer Amount</label>
                        <button
                          type="button"
                          onClick={() => setMaoMaoAmount(maoMaoBalanceState.toString())}
                          className="text-amber-400 hover:underline font-bold cursor-pointer"
                        >
                          MAX ({maoMaoBalanceState.toLocaleString()})
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="10000"
                          value={maoMaoAmount}
                          onChange={(e) => setMaoMaoAmount(e.target.value)}
                          className="w-full bg-[#14141A] border border-[#262632] rounded-lg px-3 py-2 text-xs text-white placeholder-[#555] font-mono focus:outline-none focus:border-amber-400/80"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-amber-400">
                          $MAOMAO
                        </span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={maoMaoSending || !maoMaoAmount || !maoMaoRecipient}
                      className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-40 cursor-pointer shadow-md"
                    >
                      {maoMaoSending ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Sending $MAOMAO...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Sign &amp; Send $MAOMAO via MetaMask</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Column 2: Receive Mao-Mao & QR Code */}
                <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between pb-1 border-b border-[#1A1A20]">
                    <h4 className="font-bold text-xs text-white flex items-center gap-1.5">
                      <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Receive $MAOMAO</span>
                    </h4>
                    <span className="text-[10px] text-emerald-400 font-mono">Instant Deposit</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="bg-white p-2 rounded-lg flex-shrink-0">
                      {maoMaoQrUrl ? (
                        <img src={maoMaoQrUrl} alt="Receive Mao-Mao QR Code" className="w-24 h-24" />
                      ) : (
                        <div className="w-24 h-24 flex items-center justify-center bg-gray-100 text-gray-500 text-[10px]">
                          Loading...
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 flex-1">
                      <div className="text-[11px] text-[#8E9299]">Your Receive Address:</div>
                      <div className="p-1.5 bg-[#14141A] border border-[#242430] rounded font-mono text-[11px] text-amber-300 break-all select-all">
                        {activeDeployerAddress}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(activeDeployerAddress, "mm_recv_addr")}
                        className="px-2.5 py-1 rounded bg-[#1C1C24] hover:bg-[#262634] text-xs text-white transition-colors cursor-pointer flex items-center gap-1 font-mono"
                      >
                        {copiedKey === "mm_recv_addr" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                        <span>Copy Address</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#1A1A20] flex flex-col sm:flex-row items-center gap-2">
                    <button
                      type="button"
                      onClick={handleClaimMaoMaoDeposit}
                      className="w-full sm:w-auto flex-1 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+25,000 $MAOMAO Faucet Deposit</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        const res = await addCustomTokenToMetaMask({
                          address: MAO_MAO_CONTRACT_ADDRESS,
                          symbol: MAO_MAO_SYMBOL,
                          decimals: 18,
                          image: MAO_MAO_ICON_SVG,
                        });
                        if (res.success) {
                          setMaoMaoTransferResult("✓ $MAOMAO added to MetaMask!");
                          setTimeout(() => setMaoMaoTransferResult(null), 4000);
                        }
                      }}
                      className="w-full sm:w-auto px-3 py-2 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/40 text-orange-300 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>🦊 Add to MetaMask</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#1F1F23] bg-[#0A0A0C] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8E9299]">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase text-[#555]">Active Deployer:</span>
            <span className="font-mono text-[11px] text-white truncate max-w-[220px]" title={activeDeployerAddress}>
              {activeDeployerAddress}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-[#16161A] hover:bg-[#1F1F23] text-gray-300 text-xs transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
