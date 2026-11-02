import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRightLeft,
  Scale,
  X,
  Search,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Layers,
  Coins,
  Sparkles,
  Zap,
  Award,
  BarChart3,
  Download,
  Shuffle,
  CheckCircle2,
  Lock,
  ChevronDown,
  FileSpreadsheet,
  Building2,
  Users,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Area,
  ComposedChart,
} from "recharts";
import { TokenRecord } from "../types";
import { CHAIN_METADATA } from "../utils/marketData";
import { ChainIcon } from "./ChainIcon";

export interface TokenCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokens: TokenRecord[];
  initialTokenAId?: string;
  initialTokenBId?: string;
  onOpenGlobalSwapSell?: (token: TokenRecord, mode?: "swap" | "sell") => void;
  onOpenMarketDeploy?: (targetTokenIds?: string[]) => void;
}

// Format numbers into human-readable financial strings
function formatCompactCurrency(val: number): string {
  if (isNaN(val) || val <= 0) return "$0.00";
  if (val >= 1e15) return `$${(val / 1e15).toFixed(2)}Q`;
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(2)}K`;
  return `$${val.toFixed(2)}`;
}

function formatNumberCompact(val: number): string {
  if (isNaN(val) || val <= 0) return "0";
  if (val >= 1e9) return `${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `${(val / 1e6).toFixed(2)}M`;
  if (val >= 1e3) return `${(val / 1e3).toFixed(1)}K`;
  return val.toLocaleString();
}

export const TokenCompareModal: React.FC<TokenCompareModalProps> = ({
  isOpen,
  onClose,
  tokens,
  initialTokenAId,
  initialTokenBId,
  onOpenGlobalSwapSell,
  onOpenMarketDeploy,
}) => {
  // Select slot IDs
  const [tokenAId, setTokenAId] = useState<string>("");
  const [tokenBId, setTokenBId] = useState<string>("");

  // Search filter for dropdown pickers
  const [searchA, setSearchA] = useState<string>("");
  const [searchB, setSearchB] = useState<string>("");
  const [isPickerAOpen, setIsPickerAOpen] = useState<boolean>(false);
  const [isPickerBOpen, setIsPickerBOpen] = useState<boolean>(false);

  // Chart view mode (linear vs logarithmic scaling)
  const [chartScale, setChartScale] = useState<"linear" | "log">("linear");
  const [copiedAddressA, setCopiedAddressA] = useState<boolean>(false);
  const [copiedAddressB, setCopiedAddressB] = useState<boolean>(false);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  // Initialize or reset selected tokens when modal opens
  useEffect(() => {
    if (isOpen && tokens.length > 0) {
      const first = tokens.find((t) => t.id === initialTokenAId) || tokens[0];
      const second =
        tokens.find((t) => t.id === initialTokenBId && t.id !== first.id) ||
        tokens.find((t) => t.id !== first.id) ||
        tokens[0];

      setTokenAId(first.id);
      setTokenBId(second.id);
      setSearchA("");
      setSearchB("");
    }
  }, [isOpen, initialTokenAId, initialTokenBId, tokens]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const tokenA = useMemo(() => tokens.find((t) => t.id === tokenAId) || tokens[0] || null, [tokens, tokenAId]);
  const tokenB = useMemo(
    () => tokens.find((t) => t.id === tokenBId) || tokens.find((t) => t.id !== tokenAId) || tokens[1] || null,
    [tokens, tokenBId, tokenAId]
  );

  // Swap Token A & Token B slots
  const handleSwapSlots = () => {
    const temp = tokenAId;
    setTokenAId(tokenBId);
    setTokenBId(temp);
  };

  // Pick two random distinct tokens
  const handlePickRandomPair = () => {
    if (tokens.length < 2) return;
    const idxA = Math.floor(Math.random() * tokens.length);
    let idxB = Math.floor(Math.random() * tokens.length);
    while (idxB === idxA && tokens.length > 1) {
      idxB = Math.floor(Math.random() * tokens.length);
    }
    setTokenAId(tokens[idxA].id);
    setTokenBId(tokens[idxB].id);
  };

  // Filtered lists for pickers
  const filteredTokensA = useMemo(() => {
    if (!searchA.trim()) return tokens.slice(0, 50);
    const q = searchA.toLowerCase();
    return tokens.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.symbol.toLowerCase().includes(q) ||
        t.contractAddress.toLowerCase().includes(q) ||
        t.chain.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [tokens, searchA]);

  const filteredTokensB = useMemo(() => {
    if (!searchB.trim()) return tokens.slice(0, 50);
    const q = searchB.toLowerCase();
    return tokens.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.symbol.toLowerCase().includes(q) ||
        t.contractAddress.toLowerCase().includes(q) ||
        t.chain.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [tokens, searchB]);

  // Copy addresses
  const handleCopyA = () => {
    if (!tokenA) return;
    navigator.clipboard.writeText(tokenA.contractAddress);
    setCopiedAddressA(true);
    setTimeout(() => setCopiedAddressA(false), 2000);
  };

  const handleCopyB = () => {
    if (!tokenB) return;
    navigator.clipboard.writeText(tokenB.contractAddress);
    setCopiedAddressB(true);
    setTimeout(() => setCopiedAddressB(false), 2000);
  };

  // Market Cap Scaling History Data Points
  const scalingHistoryData = useMemo(() => {
    if (!tokenA || !tokenB) return [];

    const capA = tokenA.marketCap || 1_000_000;
    const capB = tokenB.marketCap || 1_000_000;

    const stages = [
      { stage: "1. Genesis Seed", multiplierA: 0.05, multiplierB: 0.06 },
      { stage: "2. DEX Liquidity", multiplierA: 0.22, multiplierB: 0.18 },
      { stage: "3. Tier-2 CEX", multiplierA: 0.52, multiplierB: 0.48 },
      { stage: "4. Global Tier-1", multiplierA: 0.85, multiplierB: 0.88 },
      { stage: "5. Active Valuation", multiplierA: 1.0, multiplierB: 1.0 },
      { stage: "6. Sovereign Target", multiplierA: 2.2, multiplierB: 2.0 },
    ];

    return stages.map((s) => {
      const valA = Math.round(capA * s.multiplierA);
      const valB = Math.round(capB * s.multiplierB);
      return {
        stage: s.stage,
        [tokenA.symbol]: chartScale === "log" ? (valA > 0 ? Number(Math.log10(valA).toFixed(2)) : 0) : valA,
        [tokenB.symbol]: chartScale === "log" ? (valB > 0 ? Number(Math.log10(valB).toFixed(2)) : 0) : valB,
        rawA: valA,
        rawB: valB,
      };
    });
  }, [tokenA, tokenB, chartScale]);

  // Copy structured comparison markdown report
  const handleCopyReport = () => {
    if (!tokenA || !tokenB) return;
    const report = `=== TOKEN COMPARISON REPORT ===
Alpha: ${tokenA.name} (${tokenA.symbol}) on ${tokenA.chain.toUpperCase()}
Beta:  ${tokenB.name} (${tokenB.symbol}) on ${tokenB.chain.toUpperCase()}

[VALUATION & MARKET CAP]
${tokenA.symbol} Market Cap: ${formatCompactCurrency(tokenA.marketCap)} | Price: $${tokenA.priceUsd}
${tokenB.symbol} Market Cap: ${formatCompactCurrency(tokenB.marketCap)} | Price: $${tokenB.priceUsd}

[SECURITY & AUDIT]
${tokenA.symbol} Security Score: ${tokenA.securityScore}/100 (${tokenA.auditFirm || "Internal Audit"})
${tokenB.symbol} Security Score: ${tokenB.securityScore}/100 (${tokenB.auditFirm || "Internal Audit"})

[COMMUNITY & LIQUIDITY]
${tokenA.symbol} Holders: ${tokenA.holderCount.toLocaleString()} | Pair: ${tokenA.liquidityPair}
${tokenB.symbol} Holders: ${tokenB.holderCount.toLocaleString()} | Pair: ${tokenB.liquidityPair}

[CONTRACT ADDRESSES]
${tokenA.symbol}: ${tokenA.contractAddress}
${tokenB.symbol}: ${tokenB.contractAddress}
Generated via Web3 Token & Contract ID Foundry 5.0`;

    navigator.clipboard.writeText(report);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  // Export JSON summary
  const handleExportJson = () => {
    if (!tokenA || !tokenB) return;
    const payload = {
      comparisonDate: new Date().toISOString(),
      tokenA,
      tokenB,
      delta: {
        marketCapDelta: (tokenA.marketCap || 0) - (tokenB.marketCap || 0),
        securityScoreDelta: (tokenA.securityScore || 0) - (tokenB.securityScore || 0),
        holdersDelta: (tokenA.holderCount || 0) - (tokenB.holderCount || 0),
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compare-${tokenA.symbol}-vs-${tokenB.symbol}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen || !tokenA || !tokenB) return null;

  // Comparison metrics calculations
  const capDiff = (tokenA.marketCap || 0) - (tokenB.marketCap || 0);
  const secDiff = (tokenA.securityScore || 0) - (tokenB.securityScore || 0);
  const holdersDiff = (tokenA.holderCount || 0) - (tokenB.holderCount || 0);
  const priceRatio = tokenA.priceUsd > 0 && tokenB.priceUsd > 0 ? (tokenA.priceUsd / tokenB.priceUsd).toFixed(4) : "1.0";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 14 }}
        transition={{ duration: 0.2 }}
        className="bg-[#0C0E14] border border-[#232B3E] rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto"
      >
        {/* ================= MODAL HEADER ================= */}
        <div className="p-4 sm:p-5 bg-[#121622] border-b border-[#202738] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-md">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white font-mono tracking-tight flex items-center gap-2">
                  <span>Token Comparison Matrix</span>
                </h2>
                <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono font-bold">
                  SIDE-BY-SIDE AUDIT
                </span>
              </div>
              <p className="text-xs text-[#8E9299]">
                Deep comparative analysis of performance metrics, supply tokenomics, and market cap scaling history.
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-compare-random-pair"
              onClick={handlePickRandomPair}
              className="px-2.5 py-1.5 rounded-lg bg-[#181D2A] hover:bg-[#232B3E] border border-[#2B354C] text-[#8E9299] hover:text-white text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer"
              title="Compare two random tokens from the current session"
            >
              <Shuffle className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Random Pair</span>
            </button>

            <button
              type="button"
              id="btn-compare-swap-slots"
              onClick={handleSwapSlots}
              className="px-2.5 py-1.5 rounded-lg bg-[#181D2A] hover:bg-[#232B3E] border border-[#2B354C] text-[#8E9299] hover:text-white text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer"
              title="Swap Alpha and Beta positions (A ⇄ B)"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Swap (A ⇄ B)</span>
            </button>

            <button
              type="button"
              onClick={handleCopyReport}
              className="px-2.5 py-1.5 rounded-lg bg-[#181D2A] hover:bg-[#232B3E] border border-[#2B354C] text-[#8E9299] hover:text-white text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer"
              title="Copy comparison summary markdown to clipboard"
            >
              {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedReport ? "Copied" : "Copy Report"}</span>
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              className="p-1.5 rounded-lg bg-[#181D2A] hover:bg-[#232B3E] border border-[#2B354C] text-[#8E9299] hover:text-white transition-all cursor-pointer"
              title="Download comparison payload as JSON"
            >
              <Download className="w-4 h-4 text-cyan-400" />
            </button>

            <button
              type="button"
              id="btn-close-token-compare-modal"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#181D2A] hover:bg-rose-500/20 border border-[#2B354C] hover:border-rose-500/40 text-[#8E9299] hover:text-rose-400 transition-all cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ================= SCROLLABLE COMPARISON BODY ================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* 1. SIDE-BY-SIDE TOKEN PICKERS & HERO CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
            {/* Slot A: Alpha Token */}
            <div className="bg-[#111520] border-2 border-cyan-500/30 rounded-xl p-4 space-y-3 relative shadow-lg shadow-cyan-950/20">
              <div className="flex items-center justify-between gap-2 border-b border-[#1E2536] pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500 text-black text-[10px] font-black font-mono">
                    TOKEN A
                  </span>
                  <span className="text-xs font-mono text-cyan-400 font-bold">ALPHA ASSET</span>
                </div>

                {/* Token A Selector Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsPickerAOpen(!isPickerAOpen)}
                    className="px-2.5 py-1 rounded-lg bg-[#181E2E] hover:bg-[#222A40] border border-[#2D3852] text-xs font-mono text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Change Token</span>
                    <ChevronDown className="w-3.5 h-3.5 text-[#8E9299]" />
                  </button>

                  {isPickerAOpen && (
                    <div className="absolute right-0 top-full mt-1 w-72 bg-[#121622] border border-[#263045] rounded-xl shadow-2xl p-2 z-30 space-y-1.5">
                      <div className="flex items-center gap-1.5 bg-[#0D1018] px-2 py-1 rounded-lg border border-[#1E2536]">
                        <Search className="w-3.5 h-3.5 text-[#8E9299]" />
                        <input
                          type="text"
                          value={searchA}
                          onChange={(e) => setSearchA(e.target.value)}
                          placeholder="Search token name or symbol..."
                          className="bg-transparent text-xs text-white placeholder-[#8E9299] focus:outline-none w-full font-mono"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {filteredTokensA.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => {
                              setTokenAId(t.id);
                              setIsPickerAOpen(false);
                            }}
                            className={`p-1.5 rounded-lg flex items-center justify-between text-xs cursor-pointer hover:bg-[#1C2334] ${
                              t.id === tokenA.id ? "bg-cyan-500/15 text-cyan-300 font-bold" : "text-[#8E9299]"
                            }`}
                          >
                            <span className="font-semibold text-white truncate max-w-[140px]">{t.name}</span>
                            <span className="font-mono text-[10px] text-cyan-400">{t.symbol}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Token A Hero Identity */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ChainIcon chain={tokenA.chain} className="w-10 h-10 rounded-xl" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-white font-mono">{tokenA.name}</h3>
                      <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {tokenA.symbol}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#8E9299] font-mono mt-0.5">
                      <span>{CHAIN_METADATA[tokenA.chain]?.name || tokenA.chain}</span>
                      <span>•</span>
                      <span>{tokenA.tokenStandard}</span>
                      <span>•</span>
                      <span className="text-emerald-400">{tokenA.launchStatus}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl font-black text-white font-mono">
                    {formatCompactCurrency(tokenA.marketCap)}
                  </div>
                  <div className="text-xs text-cyan-400 font-mono font-semibold">
                    ${tokenA.priceUsd.toFixed(6)} USD
                  </div>
                </div>
              </div>

              {/* Address with Copy & Explorer */}
              <div className="bg-[#0C0F16] p-2 rounded-lg border border-[#1A202E] flex items-center justify-between gap-2 font-mono text-[11px]">
                <span className="text-[#8E9299] truncate select-all">{tokenA.contractAddress}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyA}
                    className="p-1 hover:bg-[#1A202E] rounded text-[#8E9299] hover:text-white transition-colors cursor-pointer"
                    title="Copy contract address"
                  >
                    {copiedAddressA ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a
                    href={`${CHAIN_METADATA[tokenA.chain]?.explorerUrl || "https://etherscan.io/address/"}${tokenA.contractAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 hover:bg-[#1A202E] rounded text-cyan-400 hover:underline transition-colors"
                    title="View on block explorer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Center VS Badge on Desktop */}
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#1A202E] border-2 border-[#2F3B56] items-center justify-center text-[10px] font-black font-mono text-amber-400 shadow-xl z-10 pointer-events-none">
              VS
            </div>

            {/* Slot B: Beta Token */}
            <div className="bg-[#111520] border-2 border-amber-500/30 rounded-xl p-4 space-y-3 relative shadow-lg shadow-amber-950/20">
              <div className="flex items-center justify-between gap-2 border-b border-[#1E2536] pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-amber-500 text-black text-[10px] font-black font-mono">
                    TOKEN B
                  </span>
                  <span className="text-xs font-mono text-amber-400 font-bold">BETA ASSET</span>
                </div>

                {/* Token B Selector Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsPickerBOpen(!isPickerBOpen)}
                    className="px-2.5 py-1 rounded-lg bg-[#181E2E] hover:bg-[#222A40] border border-[#2D3852] text-xs font-mono text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Change Token</span>
                    <ChevronDown className="w-3.5 h-3.5 text-[#8E9299]" />
                  </button>

                  {isPickerBOpen && (
                    <div className="absolute right-0 top-full mt-1 w-72 bg-[#121622] border border-[#263045] rounded-xl shadow-2xl p-2 z-30 space-y-1.5">
                      <div className="flex items-center gap-1.5 bg-[#0D1018] px-2 py-1 rounded-lg border border-[#1E2536]">
                        <Search className="w-3.5 h-3.5 text-[#8E9299]" />
                        <input
                          type="text"
                          value={searchB}
                          onChange={(e) => setSearchB(e.target.value)}
                          placeholder="Search token name or symbol..."
                          className="bg-transparent text-xs text-white placeholder-[#8E9299] focus:outline-none w-full font-mono"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {filteredTokensB.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => {
                              setTokenBId(t.id);
                              setIsPickerBOpen(false);
                            }}
                            className={`p-1.5 rounded-lg flex items-center justify-between text-xs cursor-pointer hover:bg-[#1C2334] ${
                              t.id === tokenB.id ? "bg-amber-500/15 text-amber-300 font-bold" : "text-[#8E9299]"
                            }`}
                          >
                            <span className="font-semibold text-white truncate max-w-[140px]">{t.name}</span>
                            <span className="font-mono text-[10px] text-amber-400">{t.symbol}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Token B Hero Identity */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ChainIcon chain={tokenB.chain} className="w-10 h-10 rounded-xl" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-white font-mono">{tokenB.name}</h3>
                      <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {tokenB.symbol}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#8E9299] font-mono mt-0.5">
                      <span>{CHAIN_METADATA[tokenB.chain]?.name || tokenB.chain}</span>
                      <span>•</span>
                      <span>{tokenB.tokenStandard}</span>
                      <span>•</span>
                      <span className="text-emerald-400">{tokenB.launchStatus}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl font-black text-white font-mono">
                    {formatCompactCurrency(tokenB.marketCap)}
                  </div>
                  <div className="text-xs text-amber-400 font-mono font-semibold">
                    ${tokenB.priceUsd.toFixed(6)} USD
                  </div>
                </div>
              </div>

              {/* Address with Copy & Explorer */}
              <div className="bg-[#0C0F16] p-2 rounded-lg border border-[#1A202E] flex items-center justify-between gap-2 font-mono text-[11px]">
                <span className="text-[#8E9299] truncate select-all">{tokenB.contractAddress}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyB}
                    className="p-1 hover:bg-[#1A202E] rounded text-[#8E9299] hover:text-white transition-colors cursor-pointer"
                    title="Copy contract address"
                  >
                    {copiedAddressB ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a
                    href={`${CHAIN_METADATA[tokenB.chain]?.explorerUrl || "https://etherscan.io/address/"}${tokenB.contractAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 hover:bg-[#1A202E] rounded text-amber-400 hover:underline transition-colors"
                    title="View on block explorer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* 2. SIDE-BY-SIDE PERFORMANCE METRICS TABLE */}
          <div className="bg-[#101420] border border-[#202738] rounded-xl overflow-hidden shadow-md">
            <div className="p-3.5 bg-[#141926] border-b border-[#202738] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Comparative Performance Metrics
                </h4>
              </div>
              <span className="text-[10px] text-[#8E9299] font-mono">
                Relative Delta Ratio: {priceRatio}x
              </span>
            </div>

            <div className="divide-y divide-[#1B2130] text-xs font-mono">
              {/* Row: Market Valuation */}
              <div className="grid grid-cols-12 p-3 items-center hover:bg-[#131824] transition-colors">
                <div className="col-span-4 text-[#8E9299] flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span>Market Cap Valuation</span>
                </div>
                <div className="col-span-4 text-left font-bold text-white flex items-center gap-1.5">
                  <span className="text-cyan-300">{formatCompactCurrency(tokenA.marketCap)}</span>
                  {tokenA.marketCap >= tokenB.marketCap && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      LEADER
                    </span>
                  )}
                </div>
                <div className="col-span-4 text-left font-bold text-white flex items-center gap-1.5">
                  <span className="text-amber-300">{formatCompactCurrency(tokenB.marketCap)}</span>
                  {tokenB.marketCap > tokenA.marketCap && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      LEADER
                    </span>
                  )}
                </div>
              </div>

              {/* Row: Token Price */}
              <div className="grid grid-cols-12 p-3 items-center hover:bg-[#131824] transition-colors">
                <div className="col-span-4 text-[#8E9299]">Spot Price (USD)</div>
                <div className="col-span-4 text-left text-white font-semibold">
                  ${tokenA.priceUsd.toFixed(6)}
                </div>
                <div className="col-span-4 text-left text-white font-semibold">
                  ${tokenB.priceUsd.toFixed(6)}
                </div>
              </div>

              {/* Row: Security Score */}
              <div className="grid grid-cols-12 p-3 items-center hover:bg-[#131824] transition-colors">
                <div className="col-span-4 text-[#8E9299] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Security Audit Score</span>
                </div>
                <div className="col-span-4 text-left flex items-center gap-2">
                  <div className="w-20 bg-[#1A202E] h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full"
                      style={{ width: `${tokenA.securityScore}%` }}
                    />
                  </div>
                  <span className="text-emerald-400 font-bold">{tokenA.securityScore}/100</span>
                </div>
                <div className="col-span-4 text-left flex items-center gap-2">
                  <div className="w-20 bg-[#1A202E] h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full"
                      style={{ width: `${tokenB.securityScore}%` }}
                    />
                  </div>
                  <span className="text-emerald-400 font-bold">{tokenB.securityScore}/100</span>
                </div>
              </div>

              {/* Row: Holder Count */}
              <div className="grid grid-cols-12 p-3 items-center hover:bg-[#131824] transition-colors">
                <div className="col-span-4 text-[#8E9299] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  <span>On-Chain Holders</span>
                </div>
                <div className="col-span-4 text-left text-white font-semibold">
                  {tokenA.holderCount.toLocaleString()} addresses
                </div>
                <div className="col-span-4 text-left text-white font-semibold">
                  {tokenB.holderCount.toLocaleString()} addresses
                </div>
              </div>

              {/* Row: Liquidity Pair */}
              <div className="grid grid-cols-12 p-3 items-center hover:bg-[#131824] transition-colors">
                <div className="col-span-4 text-[#8E9299]">Liquidity Pool Pair</div>
                <div className="col-span-4 text-left text-cyan-300 font-semibold">
                  {tokenA.liquidityPair || "Direct AMM"}
                </div>
                <div className="col-span-4 text-left text-amber-300 font-semibold">
                  {tokenB.liquidityPair || "Direct AMM"}
                </div>
              </div>

              {/* Row: Initial / Total Supply */}
              <div className="grid grid-cols-12 p-3 items-center hover:bg-[#131824] transition-colors">
                <div className="col-span-4 text-[#8E9299]">Initial Supply &amp; Decimals</div>
                <div className="col-span-4 text-left text-white">
                  {Number(tokenA.initialSupply).toLocaleString()} ({tokenA.decimals} dec)
                </div>
                <div className="col-span-4 text-left text-white">
                  {Number(tokenB.initialSupply).toLocaleString()} ({tokenB.decimals} dec)
                </div>
              </div>

              {/* Row: Narrative & Standard */}
              <div className="grid grid-cols-12 p-3 items-center hover:bg-[#131824] transition-colors">
                <div className="col-span-4 text-[#8E9299]">Narrative &amp; Standard</div>
                <div className="col-span-4 text-left text-[#8E9299]">
                  <span className="text-white font-semibold">{tokenA.narrative}</span> ({tokenA.tokenStandard})
                </div>
                <div className="col-span-4 text-left text-[#8E9299]">
                  <span className="text-white font-semibold">{tokenB.narrative}</span> ({tokenB.tokenStandard})
                </div>
              </div>
            </div>
          </div>

          {/* 3. MARKET CAP SCALING HISTORY CHART */}
          <div className="bg-[#101420] border border-[#202738] rounded-xl p-4 sm:p-5 space-y-4 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#202738] pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Market Cap Scaling Trajectory
                  </h4>
                  <p className="text-[10px] text-[#8E9299] font-mono">
                    Comparative valuation progression from Genesis Seed through Global Tier-1 listings &amp; Sovereign targets.
                  </p>
                </div>
              </div>

              {/* Linear vs Logarithmic Switch */}
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-[10px] text-[#8E9299]">Scale Mode:</span>
                <div className="flex items-center bg-[#171D2B] p-0.5 rounded-lg border border-[#252E44]">
                  <button
                    type="button"
                    onClick={() => setChartScale("linear")}
                    className={`px-2 py-0.5 rounded text-[10px] cursor-pointer ${
                      chartScale === "linear" ? "bg-cyan-500 text-black font-bold" : "text-[#8E9299] hover:text-white"
                    }`}
                  >
                    Linear ($)
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartScale("log")}
                    className={`px-2 py-0.5 rounded text-[10px] cursor-pointer ${
                      chartScale === "log" ? "bg-cyan-500 text-black font-bold" : "text-[#8E9299] hover:text-white"
                    }`}
                  >
                    Log10
                  </button>
                </div>
              </div>
            </div>

            {/* Recharts Dual-Line Chart */}
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={scalingHistoryData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorAlphaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#00F0FF" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorBetaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1D2436" vertical={false} />
                  <XAxis
                    dataKey="stage"
                    stroke="#5A657D"
                    tick={{ fill: "#8E9299", fontSize: 10, fontFamily: "monospace" }}
                  />
                  <YAxis
                    stroke="#5A657D"
                    tick={{ fill: "#8E9299", fontSize: 10, fontFamily: "monospace" }}
                    tickFormatter={(val) => (chartScale === "log" ? `10^${val}` : formatCompactCurrency(val))}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0F131D",
                      borderColor: "#263045",
                      borderRadius: "0.75rem",
                      fontFamily: "monospace",
                      fontSize: "11px",
                    }}
                    formatter={(val: any, name: any, item: any) => {
                      const raw = name === tokenA.symbol ? item.payload.rawA : item.payload.rawB;
                      return [`${formatCompactCurrency(raw)} USD`, name];
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontFamily: "monospace", fontSize: "11px", paddingTop: "8px" }}
                  />
                  <Area
                    type="monotone"
                    dataKey={tokenA.symbol}
                    fill="url(#colorAlphaGrad)"
                    stroke="#00F0FF"
                    strokeWidth={2.5}
                    name={tokenA.symbol}
                  />
                  <Area
                    type="monotone"
                    dataKey={tokenB.symbol}
                    fill="url(#colorBetaGrad)"
                    stroke="#F59E0B"
                    strokeWidth={2.5}
                    name={tokenB.symbol}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 4. TOKENOMICS ALLOCATION & SUPPLY PILLARS */}
          <div className="bg-[#101420] border border-[#202738] rounded-xl p-4 sm:p-5 space-y-4 shadow-md">
            <div className="flex items-center gap-2 border-b border-[#202738] pb-3">
              <Layers className="w-4 h-4 text-purple-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Tokenomics Supply &amp; Distribution Architecture
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Token A Distribution */}
              <div className="bg-[#0C0F16] p-3.5 rounded-lg border border-[#1C2334] space-y-3 font-mono">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-cyan-300">{tokenA.name} ({tokenA.symbol})</span>
                  <span className="text-[10px] text-[#8E9299]">Reserve Shares: {tokenA.reserveShares || "2^8 (256)"}</span>
                </div>

                {/* Stacked Percentage Bar */}
                <div className="w-full h-3 rounded-full bg-[#171D2B] overflow-hidden flex">
                  <div className="h-full bg-cyan-500" style={{ width: "40%" }} title="Treasury Reserve: 40%" />
                  <div className="h-full bg-indigo-500" style={{ width: "30%" }} title="DEX Liquidity: 30%" />
                  <div className="h-full bg-emerald-500" style={{ width: "20%" }} title="Public Circulation: 20%" />
                  <div className="h-full bg-purple-500" style={{ width: "10%" }} title="Team / Governance: 10%" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="flex items-center gap-1.5 text-[#8E9299]">
                    <span className="w-2 h-2 rounded-full bg-cyan-500" />
                    <span>Treasury Vault: <strong>40%</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#8E9299]">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span>DEX Liquidity: <strong>30%</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#8E9299]">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Public Circulation: <strong>20%</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#8E9299]">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <span>Team / Governance: <strong>10%</strong></span>
                  </div>
                </div>
              </div>

              {/* Token B Distribution */}
              <div className="bg-[#0C0F16] p-3.5 rounded-lg border border-[#1C2334] space-y-3 font-mono">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-300">{tokenB.name} ({tokenB.symbol})</span>
                  <span className="text-[10px] text-[#8E9299]">Reserve Shares: {tokenB.reserveShares || "2^8 (256)"}</span>
                </div>

                {/* Stacked Percentage Bar */}
                <div className="w-full h-3 rounded-full bg-[#171D2B] overflow-hidden flex">
                  <div className="h-full bg-amber-500" style={{ width: "45%" }} title="Treasury Reserve: 45%" />
                  <div className="h-full bg-blue-500" style={{ width: "25%" }} title="DEX Liquidity: 25%" />
                  <div className="h-full bg-emerald-500" style={{ width: "20%" }} title="Public Circulation: 20%" />
                  <div className="h-full bg-rose-500" style={{ width: "10%" }} title="Ecosystem Grant: 10%" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="flex items-center gap-1.5 text-[#8E9299]">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Treasury Vault: <strong>45%</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#8E9299]">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>DEX Liquidity: <strong>25%</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#8E9299]">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Public Circulation: <strong>20%</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#8E9299]">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Ecosystem Grant: <strong>10%</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 5. COMPARATIVE VERDICT & DEPLOYMENT ACTION BANNER */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#141A28] via-[#161D2E] to-[#141A28] border border-cyan-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-white font-mono">
                  Comparative Analysis Verdict
                </h4>
                <p className="text-xs text-[#8E9299] font-mono">
                  {capDiff >= 0
                    ? `${tokenA.symbol} holds higher aggregate capital backing by ${formatCompactCurrency(Math.abs(capDiff))}`
                    : `${tokenB.symbol} commands greater market scale by ${formatCompactCurrency(Math.abs(capDiff))}`}
                  . {secDiff >= 0 ? `${tokenA.symbol} achieves higher code security rating (${tokenA.securityScore} vs ${tokenB.securityScore}).` : `${tokenB.symbol} scores higher on verified audits.`}
                </p>
              </div>
            </div>

            {/* Direct Action Triggers */}
            <div className="flex items-center gap-2 shrink-0 font-mono">
              {onOpenGlobalSwapSell && (
                <button
                  type="button"
                  id="btn-compare-trade-alpha"
                  onClick={() => {
                    onClose();
                    onOpenGlobalSwapSell(tokenA, "swap");
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#1D2538] hover:bg-[#28344E] border border-[#2F3E60] text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Trade {tokenA.symbol}</span>
                </button>
              )}

              {onOpenMarketDeploy && (
                <button
                  type="button"
                  id="btn-compare-deploy-winner"
                  onClick={() => {
                    onClose();
                    onOpenMarketDeploy([tokenA.id, tokenB.id]);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black text-xs font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 fill-black" />
                  <span>Deploy Pair to Market</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
