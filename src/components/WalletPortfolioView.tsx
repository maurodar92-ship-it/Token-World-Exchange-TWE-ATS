import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowDownUp,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Search,
  Filter,
  Plus,
  ShieldCheck,
  Layers,
  Coins,
  Globe,
  Radio,
  Clock,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Send,
  Eye,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ChevronDown,
  X,
  FileCode,
  Sliders,
  DollarSign,
  LayoutGrid,
  List,
  Activity,
  Flame,
  Maximize2,
  Zap,
  AlertTriangle,
  Bell
} from "lucide-react";
import QRCode from "qrcode";
import { TokenRecord } from "../types";
import { UseMetaMaskSyncReturn } from "../utils/useMetaMaskSync";
import {
  METAMASK_CHAINS,
  FOUNDRY_SOVEREIGN_DEPLOYER,
  getMetaMaskProvider,
  addCustomTokenToMetaMask
} from "../utils/metamaskSync";
import {
  fetchWalletPortfolio,
  fetchWalletTransactions,
  sendMetaMaskTransaction,
  queryOnChainErc20Balance,
  PortfolioTokenHolding,
  WalletTransactionRecord,
  PortfolioSummary,
  getExplorerUrl,
  REAL_WORLD_PRICES,
  KNOWN_REAL_WORLD_TOKENS
} from "../utils/walletPortfolioService";
import { RealTimePnLGraph } from "./RealTimePnLGraph";
import { D3TokenPnLSparkline, computeTokenVolatilityMetrics, TokenVolatilityMetrics } from "./D3TokenPnLSparkline";
import { Asset30DayPerformanceModal } from "./Asset30DayPerformanceModal";

interface WalletPortfolioViewProps {
  metaMaskSync: UseMetaMaskSyncReturn;
  tokens: TokenRecord[];
  onOpenMetaMaskModal?: () => void;
  onOpenGlobalSwapSell?: (token?: any, mode?: "swap" | "sell") => void;
}

export const WalletPortfolioView: React.FC<WalletPortfolioViewProps> = ({
  metaMaskSync,
  tokens,
  onOpenMetaMaskModal,
  onOpenGlobalSwapSell,
}) => {
  const {
    isInstalled,
    isConnected,
    isConnecting,
    account,
    activeDeployerAddress,
    networkName,
    chainId,
    balanceEth,
    connect,
    switchChain,
    refreshBalance,
  } = metaMaskSync;

  // Active address to view (defaults to connected MetaMask, fallback to active deployer)
  const [viewAddress, setViewAddress] = useState<string>(() => {
    return account || activeDeployerAddress || FOUNDRY_SOVEREIGN_DEPLOYER;
  });

  // Keep viewAddress in sync when user connects or switches accounts
  useEffect(() => {
    if (account) {
      setViewAddress(account);
    }
  }, [account]);

  // Selected Chain Filter
  const [selectedChainKey, setSelectedChainKey] = useState<string>("ethereum");

  // Portfolio State
  const [holdings, setHoldings] = useState<PortfolioTokenHolding[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [transactions, setTransactions] = useState<WalletTransactionRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"pnl" | "holdings" | "transactions" | "import" | "chains">("pnl");
  const [txFilter, setTxFilter] = useState<"all" | "receive" | "send" | "swap" | "deploy" | "approve">("all");
  const [holdingsLayoutMode, setHoldingsLayoutMode] = useState<"cards" | "table">("cards");

  // Volatility Alert System (triggers visual pulse effect on asset cards upon 2-sigma standard deviation spike)
  const [volatilityAlertEnabled, setVolatilityAlertEnabled] = useState<boolean>(true);
  const [filterOnlyTwoSigmaSpikes, setFilterOnlyTwoSigmaSpikes] = useState<boolean>(false);

  // Copy Feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Modals
  const [isSendModalOpen, setIsSendModalOpen] = useState<boolean>(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState<boolean>(false);
  const [sendSelectedHolding, setSendSelectedHolding] = useState<PortfolioTokenHolding | null>(null);
  const [sendRecipient, setSendRecipient] = useState<string>("");
  const [sendAmount, setSendAmount] = useState<string>("");
  const [isSendingTx, setIsSendingTx] = useState<boolean>(false);
  const [sendTxFeedback, setSendTxFeedback] = useState<{ success: boolean; msg: string; txHash?: string } | null>(null);

  // QR Code for Receive Modal
  const [receiveQrUrl, setReceiveQrUrl] = useState<string>("");

  // 30-Day Performance Breakdown Modal State
  const [is30DayModalOpen, setIs30DayModalOpen] = useState<boolean>(false);
  const [performanceModalHolding, setPerformanceModalHolding] = useState<PortfolioTokenHolding | null>(null);
  const [performanceModalToken, setPerformanceModalToken] = useState<TokenRecord | undefined>(undefined);

  const handleOpen30DayBreakdown = (h: PortfolioTokenHolding, t?: TokenRecord) => {
    setPerformanceModalHolding(h);
    setPerformanceModalToken(t);
    setIs30DayModalOpen(true);
  };

  // Custom Token Importer State
  const [importAddressInput, setImportAddressInput] = useState<string>("");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importedTokenPreview, setImportedTokenPreview] = useState<any>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Watch Asset Feedback
  const [watchingId, setWatchingId] = useState<string | null>(null);
  const [watchFeedback, setWatchFeedback] = useState<string | null>(null);

  // Load Portfolio Data
  const loadPortfolioData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchWalletPortfolio(viewAddress, selectedChainKey, tokens);
      setHoldings(data.holdings);
      setSummary(data.summary);

      const txs = await fetchWalletTransactions(viewAddress, selectedChainKey);
      setTransactions(txs);
    } catch (e) {
      console.warn("Failed to load portfolio:", e);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [viewAddress, selectedChainKey, tokens]);

  useEffect(() => {
    loadPortfolioData();
  }, [loadPortfolioData]);

  // Generate QR Code when Receive Modal opens
  useEffect(() => {
    if (isReceiveModalOpen && viewAddress) {
      QRCode.toDataURL(viewAddress, {
        width: 220,
        margin: 1,
        color: { dark: "#06B6D4", light: "#0A0A0C" },
      })
        .then((url) => setReceiveQrUrl(url))
        .catch((err) => console.warn("QR generation error:", err));
    }
  }, [isReceiveModalOpen, viewAddress]);

  // Pre-calculate 7-Day D3 Volatility Metrics and 2-Sigma Spikes for all assets
  const holdingsVolatilityMap = useMemo(() => {
    const map = new Map<string, TokenVolatilityMetrics>();
    for (const h of holdings) {
      const matchedToken = tokens.find(
        (t) =>
          t.contractAddress.toLowerCase() === h.contractAddress.toLowerCase() ||
          t.symbol.toLowerCase() === h.symbol.toLowerCase()
      );
      const metrics = computeTokenVolatilityMetrics(h, matchedToken);
      map.set(h.id, metrics);
    }
    return map;
  }, [holdings, tokens]);

  // Count active 2-sigma standard deviation spikes across all portfolio holdings
  const totalTwoSigmaSpikesCount = useMemo(() => {
    let count = 0;
    for (const metrics of holdingsVolatilityMap.values()) {
      if (metrics.hasTwoSigmaSpike) {
        count++;
      }
    }
    return count;
  }, [holdingsVolatilityMap]);

  // Filtered Holdings
  const filteredHoldings = useMemo(() => {
    return holdings.filter((h) => {
      const matchesSearch =
        searchQuery === "" ||
        h.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.contractAddress.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (filterOnlyTwoSigmaSpikes && volatilityAlertEnabled) {
        const metrics = holdingsVolatilityMap.get(h.id);
        return metrics?.hasTwoSigmaSpike ?? false;
      }

      return true;
    });
  }, [holdings, searchQuery, filterOnlyTwoSigmaSpikes, volatilityAlertEnabled, holdingsVolatilityMap]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (txFilter === "all") return true;
      return t.type === txFilter;
    });
  }, [transactions, txFilter]);

  // Handle Watch Asset in MetaMask
  const handleWatchToken = async (h: PortfolioTokenHolding) => {
    if (h.isNative) return;
    setWatchingId(h.id);
    const res = await addCustomTokenToMetaMask({
      address: h.contractAddress,
      symbol: h.symbol,
      decimals: h.decimals,
    });
    if (res.success) {
      setWatchFeedback(`Added ${h.symbol} to your MetaMask wallet!`);
    } else {
      setWatchFeedback(res.error || `Could not add ${h.symbol}`);
    }
    setWatchingId(null);
    setTimeout(() => setWatchFeedback(null), 3500);
  };

  // Handle Send Transaction Submit
  const handleSendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendTxFeedback(null);
    if (!sendRecipient || !sendRecipient.startsWith("0x") || sendRecipient.length !== 42) {
      setSendTxFeedback({ success: false, msg: "Invalid EVM recipient address (must start with 0x and be 42 characters)" });
      return;
    }
    if (!sendAmount || parseFloat(sendAmount) <= 0) {
      setSendTxFeedback({ success: false, msg: "Please enter a valid amount greater than 0" });
      return;
    }

    setIsSendingTx(true);
    try {
      const res = await sendMetaMaskTransaction(
        sendRecipient,
        sendAmount,
        sendSelectedHolding?.symbol || "ETH"
      );
      if (res.success && res.txHash) {
        setSendTxFeedback({
          success: true,
          msg: `Transaction broadcast successfully! Tx Hash: ${res.txHash.slice(0, 10)}...`,
          txHash: res.txHash,
        });
        setSendAmount("");
        // Reload balances
        setTimeout(() => {
          loadPortfolioData();
          refreshBalance();
        }, 1500);
      } else {
        setSendTxFeedback({
          success: false,
          msg: res.error || "Transaction was rejected or failed",
        });
      }
    } catch (err: any) {
      setSendTxFeedback({ success: false, msg: err?.message || "Failed to broadcast transaction" });
    } finally {
      setIsSendingTx(false);
    }
  };

  // Handle Import Custom Token
  const handleImportLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportStatus(null);
    setImportedTokenPreview(null);
    const clean = importAddressInput.trim();

    if (!clean.startsWith("0x") || clean.length !== 42) {
      setImportStatus("Please enter a valid 42-character ERC-20 contract address starting with 0x");
      return;
    }

    setIsImporting(true);
    try {
      const result = await queryOnChainErc20Balance(clean, viewAddress);
      if (result) {
        setImportedTokenPreview({
          contractAddress: clean,
          balance: result.balance,
          decimals: result.decimals,
          symbol: "CUSTOM",
          name: "Imported Token",
        });
        setImportStatus(`Found on-chain token! Balance: ${result.balance.toLocaleString()} (Decimals: ${result.decimals})`);
      } else {
        setImportStatus("Queried contract. Ready to track or add to MetaMask wallet.");
        setImportedTokenPreview({
          contractAddress: clean,
          balance: 0,
          decimals: 18,
          symbol: "TOKEN",
          name: "Custom Token",
        });
      }
    } catch (e: any) {
      setImportStatus("Could not query token info: " + (e?.message || "Unknown error"));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header Card */}
      <div className="bg-[#0e1017] border border-[#1f2433] rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          {/* Address & Meta */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-400">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold font-mono text-white tracking-tight">
                    Wallet Portfolio
                  </h1>
                  {isConnected ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      MetaMask Synced
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Deployer View
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#8E9299] font-mono mt-0.5">
                  Real-world EVM token holdings, live valuations, and verified transaction ledger
                </p>
              </div>
            </div>

            {/* Address Row & Quick Selector */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="flex items-center gap-2 bg-[#141722] border border-[#242a3d] px-3 py-1.5 rounded-xl font-mono text-xs">
                <span className="text-[#8E9299]">Active Address:</span>
                <span className="text-white font-semibold">{viewAddress}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(viewAddress, "top-address")}
                  className="p-1 hover:text-cyan-400 text-[#8E9299] transition-colors cursor-pointer"
                  title="Copy Full Address"
                >
                  {copiedKey === "top-address" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <a
                  href={getExplorerUrl(selectedChainKey, viewAddress, "address")}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 hover:text-cyan-400 text-[#8E9299] transition-colors"
                  title="View on Explorer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Toggle to Sovereign Foundry Deployer or Connected */}
              {isConnected && account && viewAddress.toLowerCase() !== account.toLowerCase() && (
                <button
                  type="button"
                  onClick={() => setViewAddress(account)}
                  className="px-2.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-mono text-xs cursor-pointer transition-all"
                >
                  Switch to My MetaMask ({account.slice(0, 6)}...{account.slice(-4)})
                </button>
              )}

              {viewAddress.toLowerCase() !== FOUNDRY_SOVEREIGN_DEPLOYER.toLowerCase() && (
                <button
                  type="button"
                  onClick={() => setViewAddress(FOUNDRY_SOVEREIGN_DEPLOYER)}
                  className="px-2.5 py-1.5 rounded-xl bg-[#141722] hover:bg-[#1a1e2c] border border-[#242a3d] text-[#8E9299] hover:text-white font-mono text-xs cursor-pointer transition-all"
                >
                  View Sovereign Deployer ({FOUNDRY_SOVEREIGN_DEPLOYER.slice(0, 6)}...)
                </button>
              )}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Refresh */}
            <button
              type="button"
              onClick={() => {
                loadPortfolioData();
                refreshBalance();
              }}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#141722] hover:bg-[#1a1e2c] border border-[#242a3d] text-white font-mono text-xs font-medium transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              title="Refresh live on-chain balances"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Syncing..." : "Refresh"}</span>
            </button>

            {/* Send */}
            <button
              type="button"
              onClick={() => {
                setSendSelectedHolding(holdings[0] || null);
                setIsSendModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#141722] hover:bg-[#1a1e2c] border border-[#242a3d] text-white font-mono text-xs font-semibold transition-all cursor-pointer active:scale-95"
            >
              <Send className="w-3.5 h-3.5 text-blue-400" />
              <span>Send</span>
            </button>

            {/* Receive */}
            <button
              type="button"
              onClick={() => setIsReceiveModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#141722] hover:bg-[#1a1e2c] border border-[#242a3d] text-white font-mono text-xs font-semibold transition-all cursor-pointer active:scale-95"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>Receive</span>
            </button>

            {/* Swap & Sell (52 Exchanges) */}
            <button
              type="button"
              onClick={() => {
                if (onOpenGlobalSwapSell) {
                  onOpenGlobalSwapSell(undefined, "swap");
                }
              }}
              title="Universal Token Swap (Connected to Treasury: 0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0)"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold transition-all shadow-md shadow-cyan-950/40 cursor-pointer active:scale-95"
            >
              <ArrowDownUp className="w-3.5 h-3.5 animate-pulse" />
              <span>Universal Swap (Treasury Synced)</span>
            </button>

            {/* Connect MetaMask if not connected */}
            {!isConnected && (
              <button
                type="button"
                onClick={connect}
                disabled={isConnecting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-mono text-xs font-bold transition-all shadow-md shadow-amber-950/40 cursor-pointer active:scale-95"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>{isConnecting ? "Connecting..." : "Connect MetaMask"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Watch Feedback Alert */}
      {watchFeedback && (
        <div className="flex items-center gap-2 p-3 bg-cyan-950/40 border border-cyan-500/40 rounded-xl text-cyan-300 font-mono text-xs animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span>{watchFeedback}</span>
        </div>
      )}

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Worth */}
        <div
          onClick={() => setActiveTab("pnl")}
          className="bg-[#0e1017] border border-[#1f2433] hover:border-cyan-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden cursor-pointer transition-all group"
          title="Click to view Real-Time Profit and Loss (PnL) Graph"
        >
          <div className="text-xs font-mono text-[#8E9299] flex items-center justify-between">
            <span className="group-hover:text-cyan-300 transition-colors">TOTAL NET WORTH</span>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="text-[10px] text-cyan-400 font-semibold hidden sm:inline group-hover:underline">PnL Graph</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-bold font-mono text-white mt-2">
            ${summary ? summary.totalValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
          </div>
          <div className="flex items-center gap-2 mt-2 font-mono text-xs">
            <span
              className={`inline-flex items-center gap-0.5 font-semibold ${
                (summary?.change24hPercent || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {(summary?.change24hPercent || 0) >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              {summary && summary.change24hPercent >= 0 ? "+" : ""}
              {summary?.change24hPercent.toFixed(2)}% (24h)
            </span>
            <span className="text-[#8E9299]">
              ({summary && summary.change24hUsd >= 0 ? "+$" : "-$"}
              {Math.abs(summary?.change24hUsd || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })})
            </span>
          </div>
        </div>

        {/* Native ETH Balance */}
        <div className="bg-[#0e1017] border border-[#1f2433] rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="text-xs font-mono text-[#8E9299] flex items-center justify-between">
            <span>NATIVE {summary?.nativeSymbol || "ETH"} BALANCE</span>
            <Coins className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl lg:text-3xl font-bold font-mono text-white mt-2">
            {summary ? summary.nativeBalance.toFixed(4) : "0.0000"} {summary?.nativeSymbol || "ETH"}
          </div>
          <div className="text-xs text-[#8E9299] font-mono mt-2 flex items-center gap-1.5">
            <span>≈ ${( (summary?.nativeBalance || 0) * (REAL_WORLD_PRICES.ETH.price) ).toLocaleString(undefined, { maximumFractionDigits: 2 })} USD</span>
            <span className="text-emerald-400">(@ ${REAL_WORLD_PRICES.ETH.price.toLocaleString()})</span>
          </div>
        </div>

        {/* Assets Held */}
        <div className="bg-[#0e1017] border border-[#1f2433] rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="text-xs font-mono text-[#8E9299] flex items-center justify-between">
            <span>ASSETS IN PORTFOLIO</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl lg:text-3xl font-bold font-mono text-white mt-2">
            {holdings.length} Tokens
          </div>
          <div className="text-xs text-[#8E9299] font-mono mt-2 flex items-center gap-1.5">
            <span>Native + Real ERC-20 + Foundry</span>
          </div>
        </div>

        {/* Network & Gas */}
        <div className="bg-[#0e1017] border border-[#1f2433] rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="text-xs font-mono text-[#8E9299] flex items-center justify-between">
            <span>ACTIVE EVM NETWORK</span>
            <Globe className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-2 truncate">
            {METAMASK_CHAINS[selectedChainKey]?.chainName || "Ethereum Mainnet"}
          </div>
          <div className="text-xs text-[#8E9299] font-mono mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>Chain ID: {METAMASK_CHAINS[selectedChainKey]?.chainIdDec || 1}</span>
            <span className="text-cyan-400 font-medium">RPC Active</span>
          </div>
        </div>
      </div>

      {/* Asset Distribution Bar */}
      {holdings.length > 0 && (
        <div className="bg-[#0e1017] border border-[#1f2433] rounded-2xl p-4 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[#8E9299]">
            <span className="font-semibold text-white">Asset Allocation Breakdown</span>
            <span>{holdings.length} Position{holdings.length > 1 ? "s" : ""}</span>
          </div>
          <div className="w-full h-3 rounded-full bg-[#141722] overflow-hidden flex">
            {holdings.map((h, i) => {
              if (h.portfolioPercent < 0.5) return null;
              return (
                <div
                  key={h.id}
                  style={{
                    width: `${h.portfolioPercent}%`,
                    backgroundColor: h.color || "#06B6D4",
                  }}
                  className="h-full transition-all hover:opacity-80"
                  title={`${h.symbol}: ${h.portfolioPercent.toFixed(1)}% ($${h.valueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })})`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {holdings.slice(0, 6).map((h) => (
              <div key={h.id} className="flex items-center gap-1.5 font-mono text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: h.color || "#06B6D4" }}
                />
                <span className="text-white font-medium">{h.symbol}</span>
                <span className="text-[#8E9299]">{h.portfolioPercent.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Tab Controller & Chain Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-[#1f2433] pb-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab("pnl")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "pnl"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-950/20"
                : "text-[#8E9299] hover:text-white hover:bg-[#141722]"
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Real-Time PnL Graph</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("holdings")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "holdings"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                : "text-[#8E9299] hover:text-white hover:bg-[#141722]"
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>Token Holdings ({holdings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("transactions")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "transactions"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                : "text-[#8E9299] hover:text-white hover:bg-[#141722]"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Recent History ({transactions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("import")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "import"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                : "text-[#8E9299] hover:text-white hover:bg-[#141722]"
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Import Custom Token</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("chains")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "chains"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                : "text-[#8E9299] hover:text-white hover:bg-[#141722]"
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Multi-Chain Distribution</span>
          </button>
        </div>

        {/* Chain Switcher Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#8E9299] hidden lg:inline">EVM Network:</span>
          <select
            value={selectedChainKey}
            onChange={(e) => {
              const nextKey = e.target.value;
              setSelectedChainKey(nextKey);
              if (isConnected && switchChain) {
                switchChain(nextKey as any);
              }
            }}
            className="bg-[#141722] border border-[#242a3d] text-white font-mono text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            {Object.entries(METAMASK_CHAINS).map(([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.chainName} ({cfg.nativeCurrency.symbol})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TAB 0: REAL-TIME PROFIT AND LOSS (PNL) GRAPH */}
      {activeTab === "pnl" && (
        <RealTimePnLGraph
          holdings={holdings}
          summary={summary}
          tokens={tokens}
          onOpenGlobalSwapSell={onOpenGlobalSwapSell}
        />
      )}

      {/* TAB 1: TOKEN HOLDINGS */}
      {activeTab === "holdings" && (
        <div className="space-y-4">
          {/* Search Bar & Layout Switcher */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#8E9299] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tokens by symbol, name, or contract address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0e1017] border border-[#1f2433] rounded-xl pl-10 pr-4 py-2.5 font-mono text-xs text-white placeholder-[#5d6373] focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Controls Bar: Volatility Alert Toggle + Layout Switcher */}
            <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
              {/* Volatility Alert Toggle (Triggers visual pulse effect on asset cards upon 2-sigma standard deviation spike) */}
              <button
                type="button"
                onClick={() => setVolatilityAlertEnabled(!volatilityAlertEnabled)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono text-xs font-semibold transition-all cursor-pointer select-none ${
                  volatilityAlertEnabled
                    ? "bg-rose-500/20 text-rose-200 border-rose-500/60 shadow-[0_0_18px_rgba(244,63,94,0.35)] ring-1 ring-rose-500/40"
                    : "bg-[#141722] text-[#8E9299] hover:text-white border-[#242a3d] hover:border-[#374151]"
                }`}
                title={
                  volatilityAlertEnabled
                    ? "Volatility Alert is ACTIVE: D3 sparkline detects 2-sigma (Z >= 2.0) standard deviation spikes and triggers visual pulse effects on affected asset cards"
                    : "Turn ON Volatility Alert to detect 2-sigma standard deviation shocks and trigger visual pulse effects on asset cards"
                }
              >
                <div className="relative flex items-center justify-center">
                  {volatilityAlertEnabled && totalTwoSigmaSpikesCount > 0 && (
                    <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-rose-400 opacity-75"></span>
                  )}
                  <Flame
                    className={`w-3.5 h-3.5 ${
                      volatilityAlertEnabled
                        ? "text-rose-400 animate-pulse fill-rose-500/40"
                        : "text-[#8E9299]"
                    }`}
                  />
                </div>
                <span>Volatility Alert (2σ)</span>
                {/* Visual toggle pill */}
                <div
                  className={`w-7 h-3.5 rounded-full p-0.5 transition-colors flex items-center ${
                    volatilityAlertEnabled ? "bg-rose-600 justify-end" : "bg-[#242a3d] justify-start"
                  }`}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />
                </div>

                {/* 2-Sigma active spikes badge */}
                {volatilityAlertEnabled && totalTwoSigmaSpikesCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-md bg-rose-500/35 text-rose-100 border border-rose-500/50 text-[10px] font-bold animate-pulse">
                    {totalTwoSigmaSpikesCount} Alert{totalTwoSigmaSpikesCount === 1 ? "" : "s"}
                  </span>
                )}
              </button>

              {/* Quick filter chip for 2-sigma alerts */}
              {volatilityAlertEnabled && totalTwoSigmaSpikesCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterOnlyTwoSigmaSpikes(!filterOnlyTwoSigmaSpikes)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-mono text-[11px] border transition-all cursor-pointer ${
                    filterOnlyTwoSigmaSpikes
                      ? "bg-rose-500/30 text-rose-200 border-rose-500 font-bold shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                      : "bg-[#141722] text-rose-300 hover:text-white border-rose-500/30"
                  }`}
                  title={filterOnlyTwoSigmaSpikes ? "Showing only 2σ spike tokens. Click to show all." : "Filter down to only tokens with 2-sigma spikes"}
                >
                  <Zap className="w-3 h-3 text-rose-400" />
                  <span>{filterOnlyTwoSigmaSpikes ? "Showing Spikes Only" : `Filter 2σ (${totalTwoSigmaSpikesCount})`}</span>
                </button>
              )}

              <span className="text-xs font-mono text-[#8E9299] hidden md:inline">
                {filteredHoldings.length} Asset{filteredHoldings.length === 1 ? "" : "s"}
              </span>

              {/* Layout Mode Toggle (Cards vs Table) */}
              <div className="flex items-center bg-[#141722] border border-[#242a3d] p-0.5 rounded-xl font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setHoldingsLayoutMode("cards")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    holdingsLayoutMode === "cards"
                      ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30"
                      : "text-[#8E9299] hover:text-white"
                  }`}
                  title="Card Grid view with D3.js PnL sparkline overlays"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Asset Cards (D3)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHoldingsLayoutMode("table")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    holdingsLayoutMode === "table"
                      ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30"
                      : "text-[#8E9299] hover:text-white"
                  }`}
                  title="Table view"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Table</span>
                </button>
              </div>
            </div>
          </div>

          {/* VIEW 1: ASSET CARDS GRID WITH D3.js 7-DAY PnL SPARKLINE OVERLAY */}
          {holdingsLayoutMode === "cards" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
              {isLoading ? (
                <div className="col-span-full py-16 text-center text-[#8E9299] font-mono text-xs bg-[#0e1017] border border-[#1f2433] rounded-2xl">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                  Loading portfolio assets and generating D3.js market cap sparklines...
                </div>
              ) : filteredHoldings.length === 0 ? (
                <div className="col-span-full py-16 text-center text-[#8E9299] font-mono text-xs bg-[#0e1017] border border-[#1f2433] rounded-2xl">
                  No holdings found matching query "{searchQuery}".
                </div>
              ) : (
                filteredHoldings.map((h) => {
                  const matchedToken = tokens.find(
                    (t) =>
                      t.contractAddress.toLowerCase() === h.contractAddress.toLowerCase() ||
                      t.symbol.toLowerCase() === h.symbol.toLowerCase()
                  );

                  const volatilityMetrics = holdingsVolatilityMap.get(h.id);
                  const hasTwoSigma = volatilityMetrics?.hasTwoSigmaSpike ?? false;
                  const isSpikeAlertActive = volatilityAlertEnabled && hasTwoSigma;

                  return (
                    <div
                      key={h.id}
                      className={`bg-[#0e1017] rounded-2xl p-5 shadow-xl transition-all duration-300 flex flex-col justify-between group relative overflow-hidden space-y-4 ${
                        isSpikeAlertActive
                          ? "border-2 border-rose-500/85 ring-2 ring-rose-500/60 shadow-[0_0_35px_rgba(244,63,94,0.45)] animate-[pulse_1.75s_cubic-bezier(0.4,0,0.6,1)_infinite]"
                          : "border border-[#1f2433] hover:border-cyan-500/40"
                      }`}
                    >
                      {/* Ambient background glow: Pulsing Rose if 2-sigma alert active, else asset color */}
                      {isSpikeAlertActive ? (
                        <div className="absolute inset-0 bg-gradient-to-br from-rose-600/15 via-rose-500/5 to-transparent pointer-events-none rounded-2xl animate-pulse z-0" />
                      ) : (
                        <div
                          className="absolute -top-12 -right-12 w-36 h-36 rounded-full blur-3xl pointer-events-none opacity-10 group-hover:opacity-20 transition-opacity"
                          style={{ backgroundColor: h.color || "#06B6D4" }}
                        />
                      )}

                      {/* 2-Sigma Volatility Spike Alert Banner */}
                      {isSpikeAlertActive && (
                        <div className="bg-gradient-to-r from-rose-950/90 via-rose-900/50 to-rose-950/90 border border-rose-500/60 rounded-xl px-3 py-1.5 flex items-center justify-between text-rose-200 font-mono text-[11px] shadow-lg animate-pulse relative z-10">
                          <div className="flex items-center gap-1.5 font-bold tracking-wide">
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                            </span>
                            <Flame className="w-3.5 h-3.5 text-rose-400 fill-rose-500/40 animate-bounce" />
                            <span>2σ VOLATILITY SPIKE ALERT</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-100 font-bold border border-rose-500/50 text-[10px]">
                              {volatilityMetrics?.maxZScore}σ Shock
                            </span>
                            <span className="text-[10px] text-rose-300/80 hidden sm:inline">
                              ({volatilityMetrics?.twoSigmaSpikeCount} spike{volatilityMetrics?.twoSigmaSpikeCount === 1 ? "" : "s"})
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Card Header: Identity & Price */}
                      <div className="flex items-start justify-between gap-3 relative z-10">
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-lg"
                              style={{ backgroundColor: h.color || "#06B6D4" }}
                            >
                              {h.symbol.slice(0, 3)}
                            </div>
                            {isSpikeAlertActive && (
                              <>
                                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 border-2 border-[#0e1017] animate-ping pointer-events-none" />
                                <div
                                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 border-2 border-[#0e1017] flex items-center justify-center text-white shadow-md"
                                  title={`2-Sigma Spike Alert: Peak ${volatilityMetrics?.maxZScore}σ`}
                                >
                                  <Zap className="w-2.5 h-2.5 text-white" />
                                </div>
                              </>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-white text-base tracking-tight">{h.symbol}</span>
                              {h.isNative && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  Native
                                </span>
                              )}
                              {h.isFoundryToken && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                  Foundry
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-[#8E9299] font-mono flex items-center gap-1.5 mt-0.5">
                              <span className="truncate max-w-[120px]">{h.name}</span>
                              {!h.isNative && (
                                <>
                                  <span>•</span>
                                  <span>{h.contractAddress.slice(0, 4)}...{h.contractAddress.slice(-4)}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(h.contractAddress, `card-${h.id}`)}
                                    className="hover:text-white transition-colors cursor-pointer"
                                    title="Copy contract address"
                                  >
                                    {copiedKey === `card-${h.id}` ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Price & 24h Change */}
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold font-mono text-white text-sm">
                            ${h.priceUsd >= 1 ? h.priceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : h.priceUsd.toFixed(5)}
                          </div>
                          <div
                            className={`inline-flex items-center gap-0.5 text-xs font-mono font-semibold ${
                              h.change24h >= 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {h.change24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {h.change24h >= 0 ? "+" : ""}{h.change24h.toFixed(2)}%
                          </div>
                        </div>
                      </div>

                      {/* Position Value & Balance Summary */}
                      <div className="bg-[#141722]/80 border border-[#242a3d] rounded-xl p-3 flex items-center justify-between font-mono relative z-10">
                        <div>
                          <div className="text-[10px] text-[#8E9299] uppercase tracking-wider">Position Value</div>
                          <div className="text-lg font-bold text-white">
                            ${h.valueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-[#8E9299] uppercase tracking-wider">Holding Balance</div>
                          <div className="text-sm font-semibold text-white">
                            {h.balanceFormatted} <span className="text-cyan-400">{h.symbol}</span>
                          </div>
                        </div>
                      </div>

                      {/* D3.JS 7-DAY PROFIT/LOSS SPARKLINE & VOLATILITY HEATMAP (STANDARD DEVIATION SPIKES) */}
                      <div className="space-y-1.5 pt-0.5 relative z-10">
                        <div className="flex items-center justify-between text-[11px] font-mono text-[#8E9299]">
                          <span className="flex items-center gap-1.5 text-white font-medium">
                            <Activity className="w-3.5 h-3.5 text-cyan-400" />
                            7-Day PnL &amp; Volatility Heatmap
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                              <Flame className="w-3 h-3 text-amber-400" />
                              <span>σ Spikes</span>
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpen30DayBreakdown(h, matchedToken);
                              }}
                              className="text-[10px] text-cyan-400 hover:text-white flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#141722] hover:bg-cyan-500/20 border border-[#242a3d] transition-colors cursor-pointer"
                              title="Expand to full 30-day performance breakdown with interactive data points"
                            >
                              <span>30D View</span>
                              <Maximize2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>

                        {/* Interactive D3 Sparkline Container with Click-to-Expand 30D Breakdown */}
                        <div
                          onClick={() => handleOpen30DayBreakdown(h, matchedToken)}
                          className="bg-[#141722]/60 border border-[#1f2433] hover:border-cyan-500/50 hover:bg-[#141722]/90 rounded-xl p-2 relative transition-all cursor-pointer group/sparkline shadow-sm"
                          title="Click sparkline to expand 30-day performance breakdown modal"
                        >
                          {/* Hover Prompt Ribbon */}
                          <div className="absolute top-1.5 left-2 z-20 opacity-0 group-hover/sparkline:opacity-100 transition-opacity pointer-events-none flex items-center gap-1 text-[9px] font-mono font-bold text-cyan-300 bg-cyan-950/90 px-1.5 py-0.5 rounded border border-cyan-500/40 shadow-lg">
                            <Maximize2 className="w-2.5 h-2.5 text-cyan-400" />
                            <span>Click to Expand 30-Day Breakdown</span>
                          </div>

                          <D3TokenPnLSparkline
                            holding={h}
                            token={matchedToken}
                            height={66}
                            showBadge={true}
                            showTooltip={true}
                            showZeroBaseline={true}
                            showVolatilityHeatmap={true}
                            volatilityAlertEnabled={volatilityAlertEnabled}
                            pulseEffectActive={isSpikeAlertActive}
                            overlayMode={true}
                          />
                        </div>
                      </div>

                      {/* Portfolio Allocation Progress Bar */}
                      <div className="space-y-1 font-mono text-xs relative z-10">
                        <div className="flex items-center justify-between text-[11px] text-[#8E9299]">
                          <span>Portfolio Weight</span>
                          <span className="text-white font-semibold">{h.portfolioPercent.toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[#141722] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(h.portfolioPercent, 100)}%`,
                              backgroundColor: h.color || "#06B6D4",
                            }}
                          />
                        </div>
                      </div>

                      {/* Card Action CTAs */}
                      <div className="pt-2 border-t border-[#1f2433] flex items-center justify-between gap-2 relative z-10">
                        {onOpenGlobalSwapSell && (
                          <button
                            type="button"
                            onClick={() => {
                              onOpenGlobalSwapSell(
                                {
                                  id: h.id,
                                  symbol: h.symbol,
                                  name: h.name,
                                  contractAddress: h.contractAddress,
                                  decimals: h.decimals,
                                  chain: h.chain,
                                  priceUsd: h.priceUsd,
                                },
                                "swap"
                              );
                            }}
                            className="flex-1 py-1.5 px-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                            title="Swap on 52 World Exchanges"
                          >
                            <ArrowDownUp className="w-3.5 h-3.5" />
                            <span>Swap / Trade</span>
                          </button>
                        )}

                        {!h.isNative && (
                          <button
                            type="button"
                            onClick={() => handleWatchToken(h)}
                            disabled={watchingId === h.id}
                            className="p-2 rounded-xl bg-[#141722] hover:bg-[#1a1e2c] border border-[#242a3d] text-[#8E9299] hover:text-white transition-colors cursor-pointer"
                            title="Add / Watch token in MetaMask extension"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setSendSelectedHolding(h);
                            setIsSendModalOpen(true);
                          }}
                          className="p-2 rounded-xl bg-[#141722] hover:bg-[#1a1e2c] border border-[#242a3d] text-[#8E9299] hover:text-white transition-colors cursor-pointer"
                          title="Send / Transfer token"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>

                        <a
                          href={h.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-[#141722] hover:bg-[#1a1e2c] border border-[#242a3d] text-[#8E9299] hover:text-white transition-colors"
                          title="Inspect contract on Block Explorer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* VIEW 2: HOLDINGS TABLE (WITH D3 7D SPARKLINE COLUMN) */}
          {holdingsLayoutMode === "table" && (
            <div className="bg-[#0e1017] border border-[#1f2433] rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#1f2433] bg-[#141722]/50 text-[#8E9299]">
                      <th className="py-3 px-4">ASSET</th>
                      <th className="py-3 px-4">PRICE (USD)</th>
                      <th className="py-3 px-4">24H CHANGE</th>
                      <th className="py-3 px-4">7D PnL TREND (D3)</th>
                      <th className="py-3 px-4">BALANCE</th>
                      <th className="py-3 px-4">VALUE (USD)</th>
                      <th className="py-3 px-4">PORTFOLIO %</th>
                      <th className="py-3 px-4 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f2433]">
                    {isLoading ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-[#8E9299]">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-400" />
                          Querying on-chain balances from MetaMask &amp; RPC...
                        </td>
                      </tr>
                    ) : filteredHoldings.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-[#8E9299]">
                          No holdings found matching query.
                        </td>
                      </tr>
                    ) : (
                      filteredHoldings.map((h) => {
                        const matchedToken = tokens.find(
                          (t) =>
                            t.contractAddress.toLowerCase() === h.contractAddress.toLowerCase() ||
                            t.symbol.toLowerCase() === h.symbol.toLowerCase()
                        );
                        const volatilityMetrics = holdingsVolatilityMap.get(h.id);
                        const hasTwoSigma = volatilityMetrics?.hasTwoSigmaSpike ?? false;
                        const isSpikeAlertActive = volatilityAlertEnabled && hasTwoSigma;

                        return (
                          <tr
                            key={h.id}
                            className={`transition-colors ${
                              isSpikeAlertActive
                                ? "bg-rose-950/20 hover:bg-rose-950/30 border-l-2 border-l-rose-500"
                                : "hover:bg-[#141722]/40"
                            }`}
                          >
                            {/* Asset */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-inner flex-shrink-0"
                                    style={{ backgroundColor: h.color || "#06B6D4" }}
                                  >
                                    {h.symbol.slice(0, 3)}
                                  </div>
                                  {isSpikeAlertActive && (
                                    <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-600 border border-[#0e1017] flex items-center justify-center text-white shadow-sm animate-ping" />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-white text-sm">{h.symbol}</span>
                                    {isSpikeAlertActive && (
                                      <span
                                        className="px-1.5 py-0.2 rounded text-[10px] bg-rose-500/25 text-rose-200 border border-rose-500/50 font-bold animate-pulse flex items-center gap-1"
                                        title={`2-Sigma Volatility Shock (${volatilityMetrics?.maxZScore}σ)`}
                                      >
                                        <Flame className="w-2.5 h-2.5 text-rose-400" />
                                        <span>2σ Alert</span>
                                      </span>
                                    )}
                                    {h.isNative && (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                        Native
                                      </span>
                                    )}
                                    {h.isFoundryToken && (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                        Foundry
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-[#8E9299] flex items-center gap-1.5">
                                    <span>{h.name}</span>
                                    {!h.isNative && (
                                      <>
                                        <span>•</span>
                                        <span>{h.contractAddress.slice(0, 6)}...{h.contractAddress.slice(-4)}</span>
                                        <button
                                          type="button"
                                          onClick={() => handleCopy(h.contractAddress, h.id)}
                                          className="hover:text-white transition-colors"
                                          title="Copy contract address"
                                        >
                                          {copiedKey === h.id ? (
                                            <Check className="w-3 h-3 text-emerald-400" />
                                          ) : (
                                            <Copy className="w-3 h-3" />
                                          )}
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Price */}
                            <td className="py-3.5 px-4 font-semibold text-white">
                              ${h.priceUsd >= 1 ? h.priceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : h.priceUsd.toFixed(6)}
                            </td>

                            {/* 24h Change */}
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center gap-1 font-semibold ${
                                  h.change24h >= 0 ? "text-emerald-400" : "text-rose-400"
                                }`}
                              >
                                {h.change24h >= 0 ? "+" : ""}
                                {h.change24h.toFixed(2)}%
                              </span>
                            </td>

                            {/* 7D D3 PnL Sparkline Column */}
                            <td className="py-2 px-4">
                              <div
                                onClick={() => handleOpen30DayBreakdown(h, matchedToken)}
                                className="w-36 cursor-pointer hover:opacity-80 transition-opacity"
                                title="Click to view full 30-day performance breakdown"
                              >
                                <D3TokenPnLSparkline
                                  holding={h}
                                  token={matchedToken}
                                  height={40}
                                  showBadge={true}
                                  showTooltip={true}
                                  showVolatilityHeatmap={true}
                                  volatilityAlertEnabled={volatilityAlertEnabled}
                                  pulseEffectActive={isSpikeAlertActive}
                                />
                              </div>
                            </td>

                            {/* Balance */}
                            <td className="py-3.5 px-4">
                              <div className="text-white font-semibold">{h.balanceFormatted}</div>
                              <div className="text-[10px] text-[#8E9299]">{h.symbol}</div>
                            </td>

                            {/* Value USD */}
                            <td className="py-3.5 px-4">
                              <div className="text-white font-bold text-sm">
                                ${h.valueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </td>

                            {/* Portfolio % */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <span className="text-[#8E9299] font-medium">{h.portfolioPercent.toFixed(1)}%</span>
                                <div className="w-16 h-1.5 rounded-full bg-[#1f2433] overflow-hidden">
                                  <div
                                    className="h-full bg-cyan-400 rounded-full"
                                    style={{ width: `${Math.min(h.portfolioPercent, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Swap & Sell button */}
                                {onOpenGlobalSwapSell && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onOpenGlobalSwapSell(
                                        {
                                          id: h.id,
                                          symbol: h.symbol,
                                          name: h.name,
                                          contractAddress: h.contractAddress,
                                          decimals: h.decimals,
                                          chain: h.chain,
                                          priceUsd: h.priceUsd,
                                        },
                                        "swap"
                                      );
                                    }}
                                    className="px-2 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-medium cursor-pointer transition-all flex items-center gap-1"
                                    title="Swap or Sell on 52 World Exchanges"
                                  >
                                    <ArrowDownUp className="w-3 h-3" />
                                    <span>Swap</span>
                                  </button>
                                )}

                                {/* Watch in MetaMask */}
                                {!h.isNative && (
                                  <button
                                    type="button"
                                    onClick={() => handleWatchToken(h)}
                                    disabled={watchingId === h.id}
                                    className="p-1.5 rounded-lg bg-[#141722] hover:bg-[#1a1e2c] border border-[#242a3d] text-[#8E9299] hover:text-white transition-colors cursor-pointer"
                                    title="Add / Watch token in MetaMask extension"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* Send CTA */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSendSelectedHolding(h);
                                    setIsSendModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg bg-[#141722] hover:bg-[#1a1e2c] border border-[#242a3d] text-[#8E9299] hover:text-white transition-colors cursor-pointer"
                                  title="Send / Transfer token"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </button>

                                {/* Explorer */}
                                <a
                                  href={h.explorerUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 rounded-lg bg-[#141722] hover:bg-[#1a1e2c] border border-[#242a3d] text-[#8E9299] hover:text-white transition-colors"
                                  title="Inspect on Block Explorer"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RECENT TRANSACTION HISTORY */}
      {activeTab === "transactions" && (
        <div className="space-y-4">
          {/* Sub Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: "all", label: "All Transactions" },
                { id: "receive", label: "Received" },
                { id: "send", label: "Sent" },
                { id: "swap", label: "Swaps" },
                { id: "deploy", label: "Contract Deploys" },
                { id: "approve", label: "Approvals" },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTxFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-semibold cursor-pointer transition-all ${
                  txFilter === f.id
                    ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40"
                    : "bg-[#0e1017] text-[#8E9299] hover:text-white border border-[#1f2433]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Transactions List */}
          <div className="bg-[#0e1017] border border-[#1f2433] rounded-2xl overflow-hidden shadow-xl">
            <div className="divide-y divide-[#1f2433]">
              {filteredTransactions.length === 0 ? (
                <div className="py-12 text-center text-[#8E9299] font-mono text-xs">
                  No transactions found for filter "{txFilter}".
                </div>
              ) : (
                filteredTransactions.map((tx) => (
                  <div key={tx.hash} className="p-4 hover:bg-[#141722]/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
                    {/* Left Icon & Details */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          tx.type === "receive"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : tx.type === "send"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : tx.type === "swap"
                            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                            : tx.type === "deploy"
                            ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        }`}
                      >
                        {tx.type === "receive" && <ArrowDownLeft className="w-4 h-4" />}
                        {tx.type === "send" && <ArrowUpRight className="w-4 h-4" />}
                        {tx.type === "swap" && <ArrowDownUp className="w-4 h-4" />}
                        {tx.type === "deploy" && <FileCode className="w-4 h-4" />}
                        {tx.type === "approve" && <ShieldCheck className="w-4 h-4" />}
                        {tx.type === "mint" && <Sparkles className="w-4 h-4" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm capitalize">{tx.methodName || tx.type}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Confirmed
                          </span>
                        </div>
                        <div className="text-[#8E9299] text-[11px] flex items-center gap-2 mt-0.5">
                          <span>{new Date(tx.timestamp).toLocaleString()}</span>
                          <span>•</span>
                          <span>Block #{tx.blockNumber.toLocaleString()}</span>
                          <span>•</span>
                          <span className="text-[#5d6373]">
                            {tx.type === "receive" ? "From: " : "To: "}
                            {(tx.type === "receive" ? tx.from : tx.to).slice(0, 6)}...{(tx.type === "receive" ? tx.from : tx.to).slice(-4)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Value & Hash */}
                    <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-1">
                      <div
                        className={`text-sm font-bold ${
                          tx.type === "receive" ? "text-emerald-400" : "text-white"
                        }`}
                      >
                        {tx.type === "receive" ? "+" : "-"}
                        {tx.amountFormatted} {tx.tokenSymbol}
                      </div>
                      <div className="text-[#8E9299] text-[11px] flex items-center gap-2">
                        <span>≈ ${tx.valueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        <span>•</span>
                        <a
                          href={tx.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1"
                        >
                          <span>{tx.hash.slice(0, 8)}...</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: IMPORT CUSTOM TOKEN */}
      {activeTab === "import" && (
        <div className="bg-[#0e1017] border border-[#1f2433] rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h2 className="text-base font-bold font-mono text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-cyan-400" />
              Import &amp; Watch Custom ERC-20 Token
            </h2>
            <p className="text-xs text-[#8E9299] font-mono mt-1">
              Add any ERC-20 contract address from Ethereum, Base, Arbitrum, or Polygon to query its live balance and watch it in MetaMask.
            </p>
          </div>

          <form onSubmit={handleImportLookup} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-[#8E9299] mb-1.5">
                Token Contract Address (0x...)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="0x..."
                  value={importAddressInput}
                  onChange={(e) => setImportAddressInput(e.target.value)}
                  className="flex-1 bg-[#141722] border border-[#242a3d] rounded-xl px-4 py-2.5 font-mono text-xs text-white placeholder-[#5d6373] focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  disabled={isImporting}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {isImporting ? "Querying..." : "Scan On-Chain"}
                </button>
              </div>
            </div>
          </form>

          {importStatus && (
            <div className="p-3.5 rounded-xl bg-[#141722] border border-[#242a3d] text-xs font-mono text-cyan-300">
              {importStatus}
            </div>
          )}

          {importedTokenPreview && (
            <div className="p-4 rounded-xl bg-[#141722] border border-cyan-500/30 space-y-3">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-[#8E9299]">Discovered Contract:</span>
                <span className="text-white font-semibold">{importedTokenPreview.contractAddress}</span>
              </div>
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-[#8E9299]">Your Balance:</span>
                <span className="text-cyan-400 font-bold">{importedTokenPreview.balance}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  addCustomTokenToMetaMask({
                    address: importedTokenPreview.contractAddress,
                    symbol: importedTokenPreview.symbol,
                    decimals: importedTokenPreview.decimals,
                  });
                  setWatchFeedback(`Added ${importedTokenPreview.contractAddress.slice(0, 8)} to MetaMask!`);
                  setTimeout(() => setWatchFeedback(null), 3500);
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold transition-all cursor-pointer"
              >
                Watch Token in MetaMask Wallet
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: MULTI-CHAIN DISTRIBUTION */}
      {activeTab === "chains" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(METAMASK_CHAINS).map(([key, cfg]) => {
            const isCurrent = key === selectedChainKey;
            const chainVal = summary?.chainDistribution[cfg.chainName] || (isCurrent ? summary?.totalValueUsd || 0 : 0);

            return (
              <div
                key={key}
                className={`bg-[#0e1017] border rounded-2xl p-5 space-y-3 shadow-lg transition-all ${
                  isCurrent ? "border-cyan-500/50 bg-cyan-950/10" : "border-[#1f2433]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold font-mono text-sm text-white">{cfg.chainName}</span>
                  </div>
                  {isCurrent && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      Active
                    </span>
                  )}
                </div>

                <div className="space-y-1 font-mono text-xs">
                  <div className="text-[#8E9299]">Native Currency: <span className="text-white font-semibold">{cfg.nativeCurrency.symbol}</span></div>
                  <div className="text-[#8E9299]">Chain ID: <span className="text-white font-semibold">{cfg.chainIdDec}</span></div>
                  <div className="text-[#8E9299]">Allocated Value: <span className="text-cyan-400 font-bold">${chainVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedChainKey(key);
                      if (isConnected && switchChain) {
                        switchChain(key as any);
                      }
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-[#141722] hover:bg-[#1a1e2c] border border-[#242a3d] text-white font-mono text-xs font-medium cursor-pointer transition-colors"
                  >
                    Switch to {cfg.chainName}
                  </button>
                  <a
                    href={cfg.blockExplorerUrls[0]}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-[#141722] hover:bg-[#1a1e2c] border border-[#242a3d] text-[#8E9299] hover:text-white transition-colors"
                    title="View Explorer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: SEND ASSETS */}
      {isSendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0e1017] border border-[#242a3d] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between border-b border-[#1f2433] pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold font-mono text-base text-white">Send / Transfer Asset</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSendModalOpen(false);
                  setSendTxFeedback(null);
                }}
                className="text-[#8E9299] hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendSubmit} className="space-y-4 font-mono text-xs">
              {/* Asset Select */}
              <div>
                <label className="block text-[#8E9299] mb-1.5">Asset to Transfer</label>
                <select
                  value={sendSelectedHolding?.id || ""}
                  onChange={(e) => {
                    const sel = holdings.find((h) => h.id === e.target.value);
                    if (sel) setSendSelectedHolding(sel);
                  }}
                  className="w-full bg-[#141722] border border-[#242a3d] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {holdings.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.symbol} - Available: {h.balanceFormatted} (${h.valueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })})
                    </option>
                  ))}
                </select>
              </div>

              {/* Recipient Address */}
              <div>
                <label className="block text-[#8E9299] mb-1.5">Recipient Address (0x...)</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={sendRecipient}
                  onChange={(e) => setSendRecipient(e.target.value)}
                  className="w-full bg-[#141722] border border-[#242a3d] rounded-xl px-4 py-2.5 text-white placeholder-[#5d6373] focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Amount */}
              <div>
                <div className="flex items-center justify-between text-[#8E9299] mb-1.5">
                  <span>Amount to Send</span>
                  {sendSelectedHolding && (
                    <button
                      type="button"
                      onClick={() => setSendAmount(sendSelectedHolding.balance.toString())}
                      className="text-cyan-400 hover:underline"
                    >
                      MAX ({sendSelectedHolding.balanceFormatted})
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    placeholder="0.0"
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    className="w-full bg-[#141722] border border-[#242a3d] rounded-xl pl-4 pr-16 py-2.5 text-white placeholder-[#5d6373] focus:outline-none focus:border-cyan-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-400 font-bold">
                    {sendSelectedHolding?.symbol || "ETH"}
                  </span>
                </div>
              </div>

              {/* Status / Feedback */}
              {sendTxFeedback && (
                <div
                  className={`p-3 rounded-xl border text-xs ${
                    sendTxFeedback.success
                      ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                      : "bg-rose-950/40 border-rose-500/40 text-rose-300"
                  }`}
                >
                  <p>{sendTxFeedback.msg}</p>
                  {sendTxFeedback.txHash && (
                    <a
                      href={getExplorerUrl(selectedChainKey, sendTxFeedback.txHash, "tx")}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-400 underline mt-1 inline-block"
                    >
                      View on Explorer &rarr;
                    </a>
                  )}
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSendingTx}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold transition-all cursor-pointer shadow-lg shadow-cyan-950/50 active:scale-98 disabled:opacity-50"
                >
                  {isSendingTx ? "Signing & Broadcasting via MetaMask..." : "Confirm & Send"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECEIVE ASSETS */}
      {isReceiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0e1017] border border-[#242a3d] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 relative text-center">
            <div className="flex items-center justify-between border-b border-[#1f2433] pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold font-mono text-base text-white">Receive EVM Assets</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsReceiveModalOpen(false)}
                className="text-[#8E9299] hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QR Code Container */}
            <div className="flex justify-center py-2">
              <div className="p-3 bg-[#0A0A0C] border-2 border-cyan-500/40 rounded-2xl shadow-xl">
                {receiveQrUrl ? (
                  <img src={receiveQrUrl} alt="Wallet QR Code" className="w-48 h-48 rounded-lg" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-xs font-mono text-[#8E9299]">
                    Generating QR...
                  </div>
                )}
              </div>
            </div>

            {/* Full Address */}
            <div className="space-y-1.5 font-mono text-xs">
              <div className="text-[#8E9299]">Your Public Deposit Address:</div>
              <div className="p-3 bg-[#141722] border border-[#242a3d] rounded-xl text-white break-all font-semibold">
                {viewAddress}
              </div>
            </div>

            {/* Copy Button */}
            <button
              type="button"
              onClick={() => handleCopy(viewAddress, "modal-receive")}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {copiedKey === "modal-receive" ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Address Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Deposit Address</span>
                </>
              )}
            </button>

            <p className="text-[11px] text-[#5d6373] font-mono">
              Only send EVM-compatible tokens (ETH, ERC-20, etc.) on supported networks to this address.
            </p>
          </div>
        </div>
      )}

      {/* MODAL: 30-DAY PERFORMANCE BREAKDOWN WITH INTERACTIVE DATA POINTS */}
      <Asset30DayPerformanceModal
        isOpen={is30DayModalOpen}
        onClose={() => setIs30DayModalOpen(false)}
        holding={performanceModalHolding}
        token={performanceModalToken}
        onOpenGlobalSwapSell={onOpenGlobalSwapSell}
        onWatchToken={handleWatchToken}
        onSendToken={(h) => {
          setSendSelectedHolding(h);
          setIsSendModalOpen(true);
        }}
      />
    </div>
  );
};
