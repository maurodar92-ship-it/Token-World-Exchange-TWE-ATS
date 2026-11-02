import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  X,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  Lock,
  Unlock,
  Radio,
  Sliders,
  Sparkles,
  Zap,
  Layers,
  ChevronRight,
  Flame,
  Info,
  QrCode,
  FileText,
  Eye,
  CheckCircle2,
  Globe,
  Server,
  Activity,
  Wifi,
  Terminal,
  ChevronDown,
  Edit2,
  Database,
  Cpu,
  Camera,
  ScanLine,
  Bookmark,
} from "lucide-react";
import {
  universalWalletExtensionEngine,
  UniversalWalletState,
  SupportedWalletType,
  TokenApprovalRecord,
  RiskLevel,
} from "../utils/universalWalletExtensionEngine";
import {
  multiChainBalanceProviderService,
  NetworkProviderType,
  LiveProviderBalanceResult,
  ADDRESS_PRESETS,
  ETHEREUM_ENDPOINTS,
  SOLANA_ENDPOINTS,
} from "../utils/multiChainBalanceProviderService";
import { REAL_WORLD_PRICES } from "../utils/walletPortfolioService";
import { WalletQrCodeModal } from "./WalletQrCodeModal";
import { WalletCameraScannerModal } from "./WalletCameraScannerModal";

interface UniversalWalletExtensionPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSendReceive?: (mode: "send" | "receive") => void;
  onOpenSwap?: () => void;
}

export const UniversalWalletExtensionPopup: React.FC<UniversalWalletExtensionPopupProps> = ({
  isOpen,
  onClose,
  onOpenSendReceive,
  onOpenSwap,
}) => {
  const [walletState, setWalletState] = useState<UniversalWalletState>(
    universalWalletExtensionEngine.getState()
  );
  const [activeTab, setActiveTab] = useState<"wallet" | "providers" | "security" | "permits" | "activity">("wallet");
  const [activeNetwork, setActiveNetwork] = useState<"ethereum" | "solana" | "dual">("ethereum");
  
  // Real-time Network Provider Balances
  const [ethBalanceResult, setEthBalanceResult] = useState<LiveProviderBalanceResult>(
    multiChainBalanceProviderService.getCachedBalance("ethereum")
  );
  const [solBalanceResult, setSolBalanceResult] = useState<LiveProviderBalanceResult>(
    multiChainBalanceProviderService.getCachedBalance("solana")
  );
  const [isFetchingBalance, setIsFetchingBalance] = useState<boolean>(false);
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [showAddressPresets, setShowAddressPresets] = useState<boolean>(false);
  const [showRpcInspector, setShowRpcInspector] = useState<boolean>(false);
  const [isEditingAddress, setIsEditingAddress] = useState<boolean>(false);
  const [customAddressInput, setCustomAddressInput] = useState<string>("");

  // QR Code & Camera Scanner Modal States
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState<boolean>(false);

  const [copied, setCopied] = useState<boolean>(false);
  const [attackToast, setAttackToast] = useState<{
    show: boolean;
    title: string;
    desc: string;
  } | null>(null);
  const [selectedWalletToConnect, setSelectedWalletToConnect] = useState<SupportedWalletType | null>(null);
  const [showWalletSwitcher, setShowWalletSwitcher] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [providerPingResults, setProviderPingResults] = useState<Record<string, { latency: number; testing: boolean }>>({});

  // Sync with engine
  useEffect(() => {
    const unsub = universalWalletExtensionEngine.subscribe((s) => {
      setWalletState(s);
    });
    return unsub;
  }, []);

  // Sync with multi-chain balance provider service
  useEffect(() => {
    const unsubProvider = multiChainBalanceProviderService.subscribe((network, res) => {
      if (network === "ethereum") {
        setEthBalanceResult(res);
      } else {
        setSolBalanceResult(res);
      }
    });
    return unsubProvider;
  }, []);

  // Real-time balance fetcher
  const handleFetchLiveBalance = useCallback(async (networkOverride?: "ethereum" | "solana" | "dual") => {
    setIsFetchingBalance(true);
    const targetNet = networkOverride || activeNetwork;

    try {
      if (targetNet === "ethereum" || targetNet === "dual") {
        const spotEth = REAL_WORLD_PRICES.ETH?.price || 3425.8;
        const resEth = await multiChainBalanceProviderService.fetchEthereumBalance(
          walletState.address,
          spotEth
        );
        setEthBalanceResult(resEth);
      }

      if (targetNet === "solana" || targetNet === "dual") {
        const spotSol = REAL_WORLD_PRICES.SOL?.price || 198.2;
        const resSol = await multiChainBalanceProviderService.fetchSolanaBalance(
          walletState.solanaAddress,
          spotSol
        );
        setSolBalanceResult(resSol);
      }
    } catch (err) {
      console.warn("Live balance fetch warning:", err);
    } finally {
      setIsFetchingBalance(false);
    }
  }, [activeNetwork, walletState.address, walletState.solanaAddress]);

  // Initial fetch and auto-polling
  useEffect(() => {
    if (!isOpen) return;
    handleFetchLiveBalance();

    if (!autoSync) return;
    const interval = setInterval(() => {
      handleFetchLiveBalance();
    }, 15000);

    return () => clearInterval(interval);
  }, [isOpen, autoSync, handleFetchLiveBalance]);

  if (!isOpen) return null;

  // Active address resolution based on network
  const currentActiveAddress =
    activeNetwork === "solana" ? walletState.solanaAddress : walletState.address;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentActiveAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSwitchWallet = async (id: SupportedWalletType) => {
    setSelectedWalletToConnect(id);
    await universalWalletExtensionEngine.connectWallet(id, true);
    setShowWalletSwitcher(false);
    setSelectedWalletToConnect(null);
    // Fetch fresh balances for newly selected wallet
    setTimeout(() => handleFetchLiveBalance(), 100);
  };

  const handleApplyAddressPreset = (presetAddress: string) => {
    if (activeNetwork === "solana") {
      universalWalletExtensionEngine.updateActiveAddress("solana", presetAddress);
    } else {
      universalWalletExtensionEngine.updateActiveAddress("ethereum", presetAddress);
    }
    setShowAddressPresets(false);
    setTimeout(() => handleFetchLiveBalance(), 100);
  };

  const handleSaveCustomAddress = () => {
    const rawAddr = customAddressInput.trim();
    if (!rawAddr) return;
    if (activeNetwork === "solana") {
      universalWalletExtensionEngine.updateActiveAddress("solana", rawAddr);
      universalWalletExtensionEngine.addSavedAddress({
        address: rawAddr,
        network: "solana",
        label: `Custom Solana (${rawAddr.slice(0, 4)}...${rawAddr.slice(-4)})`,
        source: "manual_input",
      });
    } else {
      universalWalletExtensionEngine.updateActiveAddress("ethereum", rawAddr);
      universalWalletExtensionEngine.addSavedAddress({
        address: rawAddr,
        network: "ethereum",
        label: `Custom EVM (${rawAddr.slice(0, 6)}...${rawAddr.slice(-4)})`,
        source: "manual_input",
      });
    }
    setIsEditingAddress(false);
    setCustomAddressInput("");
    setAttackToast({
      show: true,
      title: "Address Updated",
      desc: `Active address set to ${rawAddr.slice(0, 8)}... Live provider balances syncing!`,
    });
    setTimeout(() => {
      setAttackToast(null);
      handleFetchLiveBalance();
    }, 100);
  };

  const handleAddressImportedFromScan = (
    address: string,
    network: "ethereum" | "solana",
    label: string,
    setAsActive: boolean
  ) => {
    universalWalletExtensionEngine.addSavedAddress({
      address,
      network,
      label,
      source: "camera_qr_scan",
    });

    if (setAsActive) {
      setActiveNetwork(network);
      universalWalletExtensionEngine.setActiveNetworkProvider(network);
      universalWalletExtensionEngine.updateActiveAddress(network, address);
      setAttackToast({
        show: true,
        title: `⚡ Scanned & Activated: ${label}`,
        desc: `Switched ${network === "ethereum" ? "Ethereum" : "Solana"} address. Real-time balance feed triggered!`,
      });
      setTimeout(() => {
        handleFetchLiveBalance(network);
      }, 100);
    } else {
      setAttackToast({
        show: true,
        title: `Address Bookmarked: ${label}`,
        desc: `Saved ${address.slice(0, 10)}... to verified presets list.`,
      });
    }
    setTimeout(() => setAttackToast(null), 5000);
  };

  const handleTestRpcEndpoint = async (endpointId: string, url: string, network: NetworkProviderType) => {
    setProviderPingResults((prev) => ({
      ...prev,
      [endpointId]: { latency: 0, testing: true },
    }));

    const start = performance.now();
    try {
      if (network === "ethereum") {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 }),
        });
      } else {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", method: "getSlot", id: 1 }),
        });
      }
      const lat = Math.round(performance.now() - start);
      setProviderPingResults((prev) => ({
        ...prev,
        [endpointId]: { latency: lat, testing: false },
      }));
    } catch {
      setProviderPingResults((prev) => ({
        ...prev,
        [endpointId]: { latency: 999, testing: false },
      }));
    }
  };

  const handleRevoke = (id: string, symbol: string) => {
    universalWalletExtensionEngine.revokeApproval(id);
    setAttackToast({
      show: true,
      title: `Approval Revoked: ${symbol}`,
      desc: "Allowance reduced to 0. Spender can no longer withdraw tokens.",
    });
    setTimeout(() => setAttackToast(null), 4500);
  };

  const handleRevokeAllThreats = () => {
    const count = universalWalletExtensionEngine.revokeAllCritical();
    setAttackToast({
      show: true,
      title: `Shield Activated: ${count} Threat(s) Cleared`,
      desc: "All critical drainers have been severed from your wallet approvals.",
    });
    setTimeout(() => setAttackToast(null), 4500);
  };

  const handleTestDrainerSimulation = () => {
    const res = universalWalletExtensionEngine.simulateDrainerAttack();
    setAttackToast({
      show: true,
      title: `⚡ Intercepted: ${res.drainerName}`,
      desc: `Blocked zero-gas malicious permit sweep on ${res.targetToken}. Your funds are 100% safe!`,
    });
    setActiveTab("activity");
    setTimeout(() => setAttackToast(null), 6000);
  };

  const handleTriggerRescan = () => {
    setIsScanning(true);
    setTimeout(() => {
      universalWalletExtensionEngine.recalculateSecurityScore();
      setIsScanning(false);
    }, 800);
  };

  const availableWallets = universalWalletExtensionEngine.getAvailableWallets();

  // Active live data based on network selection
  const currentActiveResult: LiveProviderBalanceResult =
    activeNetwork === "solana" ? solBalanceResult : ethBalanceResult;

  const totalDualValueUsd = ethBalanceResult.balanceUsd + solBalanceResult.balanceUsd;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Universal Web3 Multi-Wallet Extension"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      {/* Extension Window Container - Emulates Chrome/Brave Extension Popup Frame */}
      <div className="relative w-full max-w-[440px] h-[720px] max-h-[94vh] bg-[#0E0E14] border-2 border-[#242434] rounded-2xl shadow-[0_25px_65px_-15px_rgba(0,0,0,0.85),0_0_35px_rgba(242,125,38,0.18)] flex flex-col overflow-hidden text-slate-100 font-sans">
        
        {/* Browser Extension Top Header Bar */}
        <div className="bg-[#14141E] border-b border-[#232332] px-3.5 py-2.5 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-xs shadow-inner">
              {walletState.walletIcon}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-white tracking-wide">
                  {walletState.walletName}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  v3.9
                </span>
                {walletState.isSimulatedSandbox && (
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40" title="High-fidelity sovereign Web3 provider simulation">
                    Sandbox
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick Wallet Switcher Dropdown Trigger */}
            <button
              type="button"
              onClick={() => setShowWalletSwitcher(!showWalletSwitcher)}
              className="px-2 py-1 rounded bg-[#1C1C28] hover:bg-[#252536] border border-[#2B2B3E] text-[11px] font-mono flex items-center gap-1 transition-colors text-slate-300"
              title="Switch between MetaMask, Coinbase, Trust, Rabby"
            >
              <span>{walletState.walletName.split(" ")[0]}</span>
              <ChevronRight className={`w-3 h-3 text-slate-400 transition-transform ${showWalletSwitcher ? "rotate-90" : ""}`} />
            </button>

            {/* Close Extension */}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-[#252536] transition-colors"
              title="Close Extension Window"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Wallet Switcher Overlay Menu */}
        {showWalletSwitcher && (
          <div className="absolute top-[48px] inset-x-0 bg-[#14141E] border-b border-[#2D2D40] z-30 p-3 shadow-2xl animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#252535]">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                Select Active Provider
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">
                Ethereum & Solana Enabled
              </span>
            </div>
            <div className="space-y-1.5">
              {availableWallets.map((w) => {
                const isCurrent = walletState.activeWallet === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => handleSwitchWallet(w.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left border transition-all ${
                      isCurrent
                        ? "bg-[#202030] border-amber-500/50 text-white shadow-sm"
                        : "bg-[#181822] hover:bg-[#1E1E2C] border-[#222230] text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{w.icon}</span>
                      <div>
                        <div className="font-semibold text-xs flex items-center gap-1.5">
                          {w.name}
                          {isCurrent && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              Active
                            </span>
                          )}
                          {w.installed && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                              Installed
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate max-w-[210px]">
                          {w.tagline}
                        </p>
                      </div>
                    </div>
                    {isCurrent ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Global Toast for Actions and Interceptions */}
        {attackToast && (
          <div className="bg-gradient-to-r from-red-950/90 via-amber-950/90 to-red-900/90 border-b border-red-500/50 px-3.5 py-2 text-xs animate-in slide-in-from-top-1">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-200">{attackToast.title}</p>
                <p className="text-[11px] text-slate-300 mt-0.5">{attackToast.desc}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Tab Navigation */}
        <div className="flex items-center border-b border-[#1F1F2D] bg-[#111119] text-xs font-mono select-none">
          <button
            type="button"
            onClick={() => setActiveTab("wallet")}
            className={`flex-1 py-2 text-center border-b-2 transition-colors ${
              activeTab === "wallet"
                ? "border-amber-500 text-amber-400 font-bold bg-[#171724]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("providers")}
            className={`flex-1 py-2 text-center border-b-2 transition-colors flex items-center justify-center gap-1 ${
              activeTab === "providers"
                ? "border-emerald-500 text-emerald-400 font-bold bg-[#171724]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Server className="w-3 h-3" />
            <span>RPC Nodes</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`flex-1 py-2 text-center border-b-2 transition-colors flex items-center justify-center gap-1 ${
              activeTab === "security"
                ? "border-orange-500 text-orange-400 font-bold bg-[#171724]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>Approvals</span>
            {walletState.approvals.some((a) => a.riskLevel === "CRITICAL_DRAINER") && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("permits")}
            className={`flex-1 py-2 text-center border-b-2 transition-colors ${
              activeTab === "permits"
                ? "border-cyan-500 text-cyan-400 font-bold bg-[#171724]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Permits
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("activity")}
            className={`flex-1 py-2 text-center border-b-2 transition-colors ${
              activeTab === "activity"
                ? "border-purple-500 text-purple-400 font-bold bg-[#171724]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Sentinel
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
          {/* TAB 1: OVERVIEW & REAL-TIME PROVIDER BALANCES */}
          {activeTab === "wallet" && (
            <div className="space-y-3 animate-in fade-in-50 duration-150">
              
              {/* Network Provider Selector Pills */}
              <div className="bg-[#151520] p-1 rounded-xl border border-[#242436] flex items-center gap-1 select-none text-xs font-mono">
                <button
                  type="button"
                  onClick={() => {
                    setActiveNetwork("ethereum");
                    universalWalletExtensionEngine.setActiveNetworkProvider("ethereum");
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeNetwork === "ethereum"
                      ? "bg-gradient-to-r from-blue-600/90 to-indigo-600/90 text-white font-bold shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#1C1C28]"
                  }`}
                >
                  <span className="text-xs">Ξ</span>
                  <span>Ethereum</span>
                  <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                    ethBalanceResult.latencyMs < 100
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-amber-500/20 text-amber-300"
                  }`}>
                    {ethBalanceResult.latencyMs}ms
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveNetwork("solana");
                    universalWalletExtensionEngine.setActiveNetworkProvider("solana");
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeNetwork === "solana"
                      ? "bg-gradient-to-r from-purple-600/90 to-pink-600/90 text-white font-bold shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#1C1C28]"
                  }`}
                >
                  <span className="text-xs">◎</span>
                  <span>Solana</span>
                  <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                    solBalanceResult.latencyMs < 100
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-amber-500/20 text-amber-300"
                  }`}>
                    {solBalanceResult.latencyMs}ms
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveNetwork("dual")}
                  className={`py-1.5 px-2.5 rounded-lg transition-all flex items-center gap-1 ${
                    activeNetwork === "dual"
                      ? "bg-[#252538] text-amber-300 font-bold border border-amber-500/40"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#1C1C28]"
                  }`}
                  title="Dual-Chain Combined Portfolio"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Dual</span>
                </button>
              </div>

              {/* Active Network Provider Telemetry Bar */}
              <div className="bg-[#111119] border border-[#20202F] rounded-xl px-2.5 py-1.5 flex items-center justify-between text-[11px] font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-slate-300 font-medium">
                    {activeNetwork === "dual" ? "Multi-Chain Providers" : currentActiveResult.networkName}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate max-w-[120px]" title={currentActiveResult.rpcEndpoint}>
                    ({currentActiveResult.rpcEndpoint.replace("https://", "").split("/")[0]})
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-cyan-400">
                    {activeNetwork === "solana"
                      ? `Slot #${currentActiveResult.blockOrSlotNumber.toLocaleString()}`
                      : `Block #${ethBalanceResult.blockOrSlotNumber.toLocaleString()}`}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleFetchLiveBalance()}
                    disabled={isFetchingBalance}
                    className="p-1 rounded bg-[#1A1A28] hover:bg-[#242436] text-slate-300 border border-[#29293C] transition-colors"
                    title="Fetch live balance from RPC node"
                  >
                    <RefreshCw className={`w-3 h-3 text-amber-400 ${isFetchingBalance ? "animate-spin" : ""}`} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setAutoSync(!autoSync)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors ${
                      autoSync
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-slate-800 text-slate-400"
                    }`}
                    title="Toggle 15s auto-polling"
                  >
                    Auto
                  </button>
                </div>
              </div>

              {/* Active Address Ribbon & Presets Selector */}
              <div className="bg-[#13131D] border border-[#222232] rounded-xl p-2 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase text-slate-400 font-bold">
                    {activeNetwork === "solana" ? "Solana Address:" : "ETH Address:"}
                  </span>
                  <span className="font-semibold text-white">
                    {currentActiveAddress.slice(0, 6)}...{currentActiveAddress.slice(-4)}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-1 rounded bg-[#1C1C2A] hover:bg-[#252538] text-slate-300 border border-[#28283B] transition-colors"
                    title="Copy active address"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsQrModalOpen(true)}
                    className="p-1 rounded bg-[#1C1C2A] hover:bg-[#252538] text-amber-300 border border-[#28283B] transition-colors"
                    title="Generate QR code for active address"
                  >
                    <QrCode className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsScannerModalOpen(true)}
                    className="p-1 rounded bg-[#1C1C2A] hover:bg-[#252538] text-emerald-300 border border-[#28283B] transition-colors"
                    title="Scan camera to import wallet address"
                  >
                    <ScanLine className="w-3 h-3" />
                  </button>

                  <a
                    href={
                      activeNetwork === "solana"
                        ? `https://solscan.io/account/${currentActiveAddress}`
                        : `https://etherscan.io/address/${currentActiveAddress}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded bg-[#1C1C2A] hover:bg-[#252538] text-slate-300 border border-[#28283B] transition-colors"
                    title="View on block explorer (Solscan / Etherscan)"
                  >
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>

                  <button
                    type="button"
                    onClick={() => setShowAddressPresets(!showAddressPresets)}
                    className="px-1.5 py-1 rounded bg-[#1C1C2A] hover:bg-[#252538] text-slate-300 border border-[#28283B] text-[10px] flex items-center gap-0.5"
                    title="Select verified preset address or enter custom"
                  >
                    <span>Presets</span>
                    <ChevronDown className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>

              {/* Address Presets Dropdown */}
              {showAddressPresets && (
                <div className="bg-[#161622] border border-[#2A2A3E] rounded-xl p-2.5 shadow-xl space-y-2 text-xs font-mono animate-in slide-in-from-top-1">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#242436]">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      {activeNetwork === "solana" ? "Solana Address Presets" : "Ethereum Address Presets"}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddressPresets(false);
                          setIsScannerModalOpen(true);
                        }}
                        className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <Camera className="w-2.5 h-2.5" />
                        <span>Scan QR</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingAddress(!isEditingAddress)}
                        className="text-[10px] text-amber-400 hover:underline flex items-center gap-1"
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                        <span>Custom</span>
                      </button>
                    </div>
                  </div>

                  {isEditingAddress && (
                    <div className="flex items-center gap-1.5 pb-2 border-b border-[#242436]">
                      <input
                        type="text"
                        value={customAddressInput}
                        onChange={(e) => setCustomAddressInput(e.target.value)}
                        placeholder={activeNetwork === "solana" ? "Paste Base58 Solana address..." : "Paste 0x Ethereum address..."}
                        className="flex-1 bg-[#101018] border border-[#2B2B3E] rounded-lg px-2 py-1 text-[11px] text-white font-mono outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsScannerModalOpen(true);
                        }}
                        className="px-2 py-1 rounded-lg bg-[#202030] hover:bg-[#28283C] text-emerald-300 text-[10px] font-bold border border-[#2B2B3E] flex items-center gap-1"
                        title="Scan camera to import address"
                      >
                        <Camera className="w-2.5 h-2.5" />
                        <span>Scan</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveCustomAddress}
                        className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold"
                      >
                        Set
                      </button>
                    </div>
                  )}

                  {/* Saved / Scanned Addresses List */}
                  {walletState.savedAddresses && walletState.savedAddresses.filter(
                    (a) => a.network === (activeNetwork === "solana" ? "solana" : "ethereum")
                  ).length > 0 && (
                    <div className="space-y-1 pb-1 border-b border-[#242436]">
                      <div className="text-[9px] uppercase font-bold text-slate-400 px-1">
                        Imported & Bookmarked
                      </div>
                      {walletState.savedAddresses
                        .filter((a) => a.network === (activeNetwork === "solana" ? "solana" : "ethereum"))
                        .map((saved) => (
                          <button
                            key={saved.id}
                            type="button"
                            onClick={() => handleApplyAddressPreset(saved.address)}
                            className="w-full text-left p-1.5 rounded-lg hover:bg-[#1E1E2C] border border-transparent hover:border-[#28283B] flex items-center justify-between transition-colors"
                          >
                            <div>
                              <div className="text-[11px] font-semibold text-white flex items-center gap-1.5">
                                <span>{saved.label}</span>
                                <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                                  saved.source === "camera_qr_scan"
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : "bg-slate-800 text-slate-300"
                                }`}>
                                  {saved.source === "camera_qr_scan" ? "Scanned QR" : "Custom"}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {saved.address.slice(0, 10)}...{saved.address.slice(-6)}
                              </div>
                            </div>
                            {currentActiveAddress === saved.address && (
                              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            )}
                          </button>
                        ))}
                    </div>
                  )}

                  {/* Standard Verified Presets */}
                  <div className="space-y-1">
                    <div className="text-[9px] uppercase font-bold text-slate-400 px-1">
                      Network Verified Presets
                    </div>
                    {(activeNetwork === "solana" ? ADDRESS_PRESETS.solana : ADDRESS_PRESETS.ethereum).map((preset) => (
                      <button
                        key={preset.address}
                        type="button"
                        onClick={() => handleApplyAddressPreset(preset.address)}
                        className="w-full text-left p-1.5 rounded-lg hover:bg-[#1E1E2C] border border-transparent hover:border-[#28283B] flex items-center justify-between transition-colors"
                      >
                        <div>
                          <div className="text-[11px] font-semibold text-white flex items-center gap-1.5">
                            <span>{preset.label}</span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                              {preset.tag}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {preset.address.slice(0, 10)}...{preset.address.slice(-6)}
                          </div>
                        </div>
                        {currentActiveAddress === preset.address && (
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Quick Action to Scan */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddressPresets(false);
                      setIsScannerModalOpen(true);
                    }}
                    className="w-full mt-1.5 py-1.5 px-2 rounded-lg bg-[#1B1B2A] hover:bg-[#232338] border border-[#2A2A40] text-emerald-400 text-[11px] font-mono flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ScanLine className="w-3.5 h-3.5" />
                    <span>Scan QR Code with Camera to Import</span>
                  </button>
                </div>
              )}

              {/* REAL-TIME BALANCE HERO CARD */}
              <div className="rounded-2xl p-4 bg-gradient-to-br from-[#1A1A28] via-[#14141E] to-[#171724] border border-[#2B2B3F] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span>Active Provider Real-Time Balance</span>
                    {isFetchingBalance && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    )}
                  </span>
                  <span className="text-emerald-400 font-bold font-mono">
                    Live RPC Feed
                  </span>
                </div>

                {/* Primary Balance Display */}
                {activeNetwork === "dual" ? (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold font-mono tracking-tight text-white">
                        ${totalDualValueUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs font-mono text-slate-400">USD Combined</span>
                    </div>
                    <div className="text-xs font-mono text-slate-300 flex items-center gap-3 pt-1">
                      <span className="text-blue-400">Ξ {ethBalanceResult.nativeBalance.toFixed(4)} ETH (${ethBalanceResult.balanceUsd.toLocaleString()})</span>
                      <span className="text-purple-400">◎ {solBalanceResult.nativeBalance.toFixed(4)} SOL (${solBalanceResult.balanceUsd.toLocaleString()})</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 space-y-0.5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold font-mono tracking-tight text-white">
                        {currentActiveResult.formattedBalance}
                      </span>
                      <span className="text-xs font-mono text-amber-400">
                        {currentActiveResult.currencySymbol}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-slate-200 font-semibold">
                        ≈ ${currentActiveResult.balanceUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                      </span>
                      <span className="text-slate-400 text-[10px]">
                        (@ ${currentActiveResult.unitPriceUsd.toFixed(2)}/{currentActiveResult.currencySymbol})
                      </span>
                    </div>
                  </div>
                )}

                {/* Quick Action Button Grid */}
                <div className="grid grid-cols-4 gap-1.5 mt-4 pt-3 border-t border-[#25253A]">
                  <button
                    type="button"
                    onClick={() => onOpenSendReceive && onOpenSendReceive("send")}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#20202E] hover:bg-[#28283C] border border-[#2C2C40] transition-transform active:scale-95 text-slate-200"
                  >
                    <ArrowUpRight className="w-4 h-4 text-amber-400 mb-1" />
                    <span className="text-[11px] font-medium">Send</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsQrModalOpen(true)}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#20202E] hover:bg-[#28283C] border border-[#2C2C40] transition-transform active:scale-95 text-slate-200 group"
                    title="Generate QR code to receive crypto"
                  >
                    <QrCode className="w-4 h-4 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-medium truncate w-full text-center">Receive / QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsScannerModalOpen(true)}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#20202E] hover:bg-[#28283C] border border-[#2C2C40] transition-transform active:scale-95 text-slate-200 group"
                    title="Scan camera to import public address"
                  >
                    <ScanLine className="w-4 h-4 text-cyan-400 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-medium truncate w-full text-center">Scan Camera</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenSwap && onOpenSwap()}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#20202E] hover:bg-[#28283C] border border-[#2C2C40] transition-transform active:scale-95 text-slate-200"
                  >
                    <ArrowRightLeft className="w-4 h-4 text-purple-400 mb-1" />
                    <span className="text-[11px] font-medium">Swap</span>
                  </button>
                </div>
              </div>

              {/* JSON-RPC Provider Telemetry & Diagnostics Accordion */}
              <div className="rounded-xl border border-[#222234] bg-[#12121A] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowRpcInspector(!showRpcInspector)}
                  className="w-full px-3 py-2 flex items-center justify-between text-left text-xs font-mono text-slate-300 hover:bg-[#181824] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="font-semibold text-white">JSON-RPC Provider Inspector</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span>{currentActiveResult.latencyMs}ms latency</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showRpcInspector ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {showRpcInspector && (
                  <div className="p-3 border-t border-[#202030] bg-[#0E0E16] space-y-2 text-[11px] font-mono animate-in slide-in-from-top-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Network Protocol:</span>
                      <span className="text-white">JSON-RPC 2.0 (EIP-1193 / Solana)</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Active Node Endpoint:</span>
                      <span className="text-amber-300 truncate max-w-[210px]" title={currentActiveResult.rpcEndpoint}>
                        {currentActiveResult.rpcEndpoint}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Method Invoked:</span>
                      <span className="text-cyan-400">
                        {currentActiveResult.rawRpcPayload?.method || (activeNetwork === "solana" ? "getBalance" : "eth_getBalance")}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Block / Slot Height:</span>
                      <span className="text-emerald-400 font-bold">
                        #{currentActiveResult.blockOrSlotNumber.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="pt-2 border-t border-[#1C1C28]">
                      <div className="text-[10px] text-slate-400 mb-1">Raw RPC Response Snippet:</div>
                      <pre className="p-2 rounded bg-black/60 border border-[#20202E] text-[10px] font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap max-h-20">
                        {currentActiveResult.rawRpcPayload?.responseSnippet || `{"status": "ok", "balance": ${currentActiveResult.nativeBalance}}`}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Threat Shield Status Snippet */}
              <div className="rounded-xl p-2.5 bg-[#13131B] border border-[#20202E] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${
                    walletState.securityScore > 80
                      ? "bg-emerald-500/20 text-emerald-400"
                      : walletState.securityScore > 50
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-red-500/20 text-red-400"
                  }`}>
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs flex items-center gap-1.5">
                      <span>Threat Shield: {walletState.securityScore}/100</span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {walletState.approvals.filter((a) => a.riskLevel === "CRITICAL_DRAINER").length > 0
                        ? "Critical approval drainer vulnerability active"
                        : "All approvals verified and safe"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab("security")}
                  className="px-2.5 py-1 rounded-lg bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/40 text-[11px] font-mono text-orange-300 font-medium transition-colors"
                >
                  Audit
                </button>
              </div>

              {/* Verified Token Holdings on Active Network */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 px-1 font-bold flex items-center justify-between">
                  <span>
                    {activeNetwork === "solana" ? "Solana SPL Assets" : activeNetwork === "dual" ? "Multi-Chain Holdings" : "Ethereum Assets"}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {activeNetwork === "dual" ? "8 Assets Tracked" : `${currentActiveResult.tokens.length} Assets`}
                  </span>
                </div>

                {/* Render Token List */}
                {(activeNetwork === "dual"
                  ? [...ethBalanceResult.tokens, ...solBalanceResult.tokens]
                  : currentActiveResult.tokens
                ).map((token, idx) => (
                  <div
                    key={`${token.network}-${token.symbol}-${idx}`}
                    className="p-2.5 rounded-xl bg-[#14141C] border border-[#20202E] flex items-center justify-between hover:border-[#2C2C3E] transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-200">
                        {token.icon}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-white flex items-center gap-1.5">
                          <span>{token.name}</span>
                          <span className={`text-[9px] font-mono px-1 py-0.1 rounded ${
                            token.network === "solana"
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                          }`}>
                            {token.network === "solana" ? "SOL" : "ETH"}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {token.symbol} • ${token.priceUsd < 0.1 ? token.priceUsd.toFixed(4) : token.priceUsd.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-xs font-semibold text-white">
                        {token.formattedBalance} {token.symbol}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        ${token.valueUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: NETWORK PROVIDERS & RPC NODES */}
          {activeTab === "providers" && (
            <div className="space-y-3.5 animate-in fade-in-50 duration-150">
              <div className="rounded-xl p-3 bg-[#14141E] border border-[#242436] space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-xs text-white">Live Network RPC Infrastructure</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Dual-Chain Gateway
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Token World Extension connects directly to decentralized and official RPC provider nodes for zero-delay balance reads and signature verification.
                </p>
              </div>

              {/* Ethereum Endpoints */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 px-1 font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="text-blue-400">Ξ</span>
                    <span>Ethereum Network Providers</span>
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    Chain ID 1
                  </span>
                </div>

                {ETHEREUM_ENDPOINTS.map((ep) => {
                  const ping = providerPingResults[ep.id];
                  const isCurrent = ethBalanceResult.rpcEndpoint.includes(ep.url.replace("https://", "").split("/")[0]);
                  return (
                    <div
                      key={ep.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isCurrent
                          ? "bg-[#181826] border-blue-500/50 shadow-sm"
                          : "bg-[#14141C] border-[#20202E]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-xs text-white flex items-center gap-1.5">
                            <span>{ep.name}</span>
                            {isCurrent && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                                Active Node
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {ep.url}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleTestRpcEndpoint(ep.id, ep.url, "ethereum")}
                          className="px-2 py-1 rounded bg-[#202030] hover:bg-[#28283C] text-[10px] font-mono text-slate-300 border border-[#2B2B3E] flex items-center gap-1"
                        >
                          <Activity className={`w-3 h-3 text-cyan-400 ${ping?.testing ? "animate-spin" : ""}`} />
                          <span>{ping?.testing ? "Ping..." : ping?.latency ? `${ping.latency}ms` : "Test"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Solana Endpoints */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 px-1 font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="text-purple-400">◎</span>
                    <span>Solana Network Providers</span>
                  </span>
                  <span className="text-[10px] text-purple-400 font-mono">
                    Mainnet-Beta
                  </span>
                </div>

                {SOLANA_ENDPOINTS.map((ep) => {
                  const ping = providerPingResults[ep.id];
                  const isCurrent = solBalanceResult.rpcEndpoint.includes(ep.url.replace("https://", "").split("/")[0]);
                  return (
                    <div
                      key={ep.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isCurrent
                          ? "bg-[#181826] border-purple-500/50 shadow-sm"
                          : "bg-[#14141C] border-[#20202E]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-xs text-white flex items-center gap-1.5">
                            <span>{ep.name}</span>
                            {isCurrent && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                Active Node
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {ep.url}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleTestRpcEndpoint(ep.id, ep.url, "solana")}
                          className="px-2 py-1 rounded bg-[#202030] hover:bg-[#28283C] text-[10px] font-mono text-slate-300 border border-[#2B2B3E] flex items-center gap-1"
                        >
                          <Activity className={`w-3 h-3 text-purple-400 ${ping?.testing ? "animate-spin" : ""}`} />
                          <span>{ping?.testing ? "Ping..." : ping?.latency ? `${ping.latency}ms` : "Test"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: UNUSUAL APPROVAL DRAINER SCANNER */}
          {activeTab === "security" && (
            <div className="space-y-3.5 animate-in fade-in-50 duration-150">
              {/* Security Score Header */}
              <div className="rounded-xl p-3 bg-gradient-to-r from-[#171722] to-[#12121A] border border-[#282838] flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Wallet Health Score
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xl font-bold font-mono ${
                      walletState.securityScore > 80
                        ? "text-emerald-400"
                        : walletState.securityScore > 50
                        ? "text-amber-400"
                        : "text-red-400"
                    }`}>
                      {walletState.securityScore}/100
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {walletState.approvals.length} Open Approvals
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTriggerRescan}
                    className="p-1.5 rounded-lg bg-[#202030] hover:bg-[#28283C] text-slate-300 border border-[#2A2A3E] transition-colors"
                    title="Rescan blockchain for new spender approvals"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin text-amber-400" : ""}`} />
                  </button>

                  {walletState.approvals.some((a) => a.riskLevel === "CRITICAL_DRAINER") && (
                    <button
                      type="button"
                      onClick={handleRevokeAllThreats}
                      className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono text-[11px] font-bold shadow-md shadow-red-950/50 flex items-center gap-1 active:scale-95 transition-all"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Sever Threats</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Explanatory Banner */}
              <div className="rounded-xl p-2.5 bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-200/90 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  Unlimited token allowances (`approve(MaxUint256)`) allow spenders to extract tokens at any time without further signing. Revoke unused spenders to protect your self-custody funds.
                </p>
              </div>

              {/* Approvals List */}
              <div className="space-y-2">
                {walletState.approvals.length === 0 ? (
                  <div className="rounded-xl p-6 text-center bg-[#14141C] border border-[#20202E]">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="font-bold text-xs text-white">Zero Vulnerable Approvals</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Your wallet holds zero open allowances. No third-party contracts can drain your tokens.
                    </p>
                  </div>
                ) : (
                  walletState.approvals.map((appr) => {
                    const isCritical = appr.riskLevel === "CRITICAL_DRAINER";
                    const isSuspicious = appr.riskLevel === "SUSPICIOUS";
                    return (
                      <div
                        key={appr.id}
                        className={`p-3 rounded-xl border transition-all ${
                          isCritical
                            ? "bg-red-950/20 border-red-500/40 hover:border-red-400"
                            : isSuspicious
                            ? "bg-amber-950/15 border-amber-500/30 hover:border-amber-400"
                            : "bg-[#14141C] border-[#222230]"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white font-mono">
                              {appr.tokenSymbol}
                            </span>
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                                isCritical
                                  ? "bg-red-500/20 text-red-300 border border-red-500/40"
                                  : isSuspicious
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              }`}
                            >
                              {isCritical ? "CRITICAL DRAINER" : isSuspicious ? "UNLIMITED" : "CAPPED SAFE"}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRevoke(appr.id, appr.tokenSymbol)}
                            className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition-all active:scale-95 flex items-center gap-1 ${
                              isCritical
                                ? "bg-red-600 hover:bg-red-500 text-white shadow-sm shadow-red-950"
                                : "bg-[#222232] hover:bg-[#2C2C40] text-slate-200 border border-[#2D2D42]"
                            }`}
                          >
                            <Unlock className="w-3 h-3" />
                            <span>Revoke</span>
                          </button>
                        </div>

                        <div className="mt-2 text-[11px] space-y-1">
                          <div className="text-slate-300 flex items-center justify-between font-mono">
                            <span className="text-slate-400 text-[10px]">Spender:</span>
                            <span className="font-medium truncate max-w-[200px]" title={appr.spenderAddress}>
                              {appr.spenderName}
                            </span>
                          </div>

                          <div className="text-slate-300 flex items-center justify-between font-mono">
                            <span className="text-slate-400 text-[10px]">Allowance:</span>
                            <span className={appr.isUnlimited ? "text-amber-400 font-bold" : "text-slate-300"}>
                              {appr.allowanceFormatted}
                            </span>
                          </div>

                          <p className="text-[10px] text-slate-400 italic pt-1 border-t border-[#232332]/60 mt-1">
                            {appr.riskReason}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PERMIT & SIGNATURE GUARDIAN */}
          {activeTab === "permits" && (
            <div className="space-y-3.5 animate-in fade-in-50 duration-150">
              <div className="rounded-xl p-3 bg-[#14141E] border border-[#252538]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-xs text-white">EIP-712 & Permit2 Shield</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    Pre-Execution
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1">
                  Permits allow dApps to spend tokens using off-chain cryptography without costing gas. Drainers use fake permits to bypass wallet balance warnings.
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 px-1 font-bold">
                  Analyzed Signatures ({walletState.recentPermits.length})
                </div>

                {walletState.recentPermits.map((permit) => {
                  const isBlocked = permit.recommendation === "BLOCK_DRAINER";
                  return (
                    <div
                      key={permit.id}
                      className={`p-3 rounded-xl border ${
                        isBlocked
                          ? "bg-red-950/20 border-red-500/40"
                          : "bg-emerald-950/20 border-emerald-500/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-white">{permit.tokenSymbol}</span>
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-300">
                            {permit.permitType}
                          </span>
                        </div>

                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                            isBlocked
                              ? "bg-red-500/20 text-red-300 border border-red-500/50"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50"
                          }`}
                        >
                          {isBlocked ? "BLOCKED DRAINER" : "VERIFIED SAFE"}
                        </span>
                      </div>

                      <div className="mt-2 text-[11px] space-y-1 font-mono">
                        <div className="flex justify-between text-slate-400">
                          <span>Spender:</span>
                          <span className="text-white truncate max-w-[190px]">{permit.spenderName}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Authorized Amount:</span>
                          <span className={isBlocked ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                            {permit.amount}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-[#222232] text-[10px] space-y-1 text-slate-300">
                        {permit.findings.map((f, i) => (
                          <div key={i} className="flex items-start gap-1">
                            <span className="text-amber-400 shrink-0">•</span>
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: UNUSUAL ACTIVITY & SENTINEL LOG */}
          {activeTab === "activity" && (
            <div className="space-y-3.5 animate-in fade-in-50 duration-150">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  Sentinel Interceptions ({walletState.alerts.length})
                </span>
                <button
                  type="button"
                  onClick={handleTestDrainerSimulation}
                  className="px-2 py-1 rounded bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-mono text-[10px] font-bold flex items-center gap-1 active:scale-95 shadow-sm"
                  title="Simulate a real-time drainer phishing attack to demonstrate how Token World Extension protects your keys"
                >
                  <Zap className="w-3 h-3" />
                  <span>Test Drainer Attack</span>
                </button>
              </div>

              <div className="space-y-2">
                {walletState.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3 rounded-xl bg-[#14141E] border border-[#232334] text-xs space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                        <span className="font-bold text-white text-[11px]">{alert.title}</span>
                      </div>
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        BLOCKED
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {alert.description}
                    </p>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-[#20202E]">
                      <span>Target: {alert.targetAddress.slice(0, 10)}...</span>
                      <span>Verified Shield</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Bar: One-Click Drainer Interceptor Simulator */}
        <div className="bg-[#12121A] border-t border-[#222230] p-2.5 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Real-time Sentinel Active</span>
          </div>

          <button
            type="button"
            onClick={handleTestDrainerSimulation}
            className="px-2.5 py-1 rounded-lg bg-[#1E1E2C] hover:bg-[#28283C] border border-[#2F2F44] text-[11px] text-amber-300 font-semibold flex items-center gap-1 transition-colors"
          >
            <Flame className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
            <span>Simulate Drainer</span>
          </button>
        </div>
      </div>

      {/* QR Code Generator Modal for Active Wallet Address */}
      <WalletQrCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        ethAddress={walletState.address}
        solanaAddress={walletState.solanaAddress}
        activeNetwork={activeNetwork === "solana" ? "solana" : "ethereum"}
        walletName={walletState.walletName}
        walletIcon={walletState.walletIcon}
        onOpenScanner={() => setIsScannerModalOpen(true)}
        unitPriceEth={ethBalanceResult.unitPriceUsd}
        unitPriceSol={solBalanceResult.unitPriceUsd}
      />

      {/* Camera-based Scanner Modal to Import Public Addresses */}
      <WalletCameraScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        onAddressImported={handleAddressImportedFromScan}
        onOpenQrGenerator={() => setIsQrModalOpen(true)}
      />
    </div>
  );
};
