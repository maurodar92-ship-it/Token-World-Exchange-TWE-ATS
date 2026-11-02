import React, { useMemo, useState } from "react";
import { TokenRecord, ChainType, TokenStandard } from "../types";
import {
  SOVEREIGN_RESERVE_SHARES,
  SOVEREIGN_TREASURY_SHARES,
  SOVEREIGN_OWNER,
  buildMultiTokenDotEnv,
} from "../utils/cryptoGenerators";
import { downloadTokensCSV } from "../utils/csvExport";
import {
  CheckSquare,
  Coins,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Layers,
  Globe,
  Copy,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Zap,
  BarChart3,
  Lock,
  Download,
  Terminal,
  Scale,
  Hash,
  FileSpreadsheet,
  Flame,
} from "lucide-react";
import { MarketImpactVisualizer } from "./MarketImpactVisualizer";
import { BurnMechanismSimulator } from "./BurnMechanismSimulator";

interface SelectedTokenomicsDashboardProps {
  tokens: TokenRecord[];
  selectedTokenIds: Set<string>;
  onDeselectAll: () => void;
  onExpandSelectedToSovereign?: () => void;
  onSelectToken?: (token: TokenRecord) => void;
}

export function formatCompactCurrency(val: number): string {
  if (val >= 1e12) {
    return `$${(val / 1e12).toFixed(2)}T`;
  }
  if (val >= 1e9) {
    return `$${(val / 1e9).toFixed(2)}B`;
  }
  if (val >= 1e6) {
    return `$${(val / 1e6).toFixed(2)}M`;
  }
  if (val >= 1e3) {
    return `$${(val / 1e3).toFixed(2)}K`;
  }
  return `$${val.toFixed(2)}`;
}

export function formatCompactNumber(val: number): string {
  if (val >= 1e12) {
    return `${(val / 1e12).toFixed(2)}T`;
  }
  if (val >= 1e9) {
    return `${(val / 1e9).toFixed(2)}B`;
  }
  if (val >= 1e6) {
    return `${(val / 1e6).toFixed(2)}M`;
  }
  if (val >= 1e3) {
    return `${(val / 1e3).toFixed(1)}K`;
  }
  return val.toLocaleString();
}

export const SelectedTokenomicsDashboard: React.FC<SelectedTokenomicsDashboardProps> = ({
  tokens,
  selectedTokenIds,
  onDeselectAll,
  onExpandSelectedToSovereign,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showMarketImpact, setShowMarketImpact] = useState<boolean>(true);
  const [showBurnMechanism, setShowBurnMechanism] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Filter selected tokens
  const selectedTokens = useMemo(() => {
    return tokens.filter((t) => selectedTokenIds.has(t.id));
  }, [tokens, selectedTokenIds]);

  const count = selectedTokens.length;
  const totalTokens = tokens.length;
  const selectionPercentage = totalTokens > 0 ? ((count / totalTokens) * 100).toFixed(1) : "0";

  // Aggregated Tokenomics Metrics Calculations
  const tokenomicsMetrics = useMemo(() => {
    if (selectedTokens.length === 0) {
      return {
        totalMarketCap: 0,
        avgMarketCap: 0,
        sovereignCount: 0,
        sovereignRatio: "0",
        totalEstimatedSupply: 0,
        avgPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        totalHolders: 0,
        avgSecurityScore: 0,
        chainCounts: {} as Record<ChainType, number>,
        standardCounts: {} as Record<TokenStandard, number>,
        statusCounts: {} as Record<string, number>,
        powerOfTwoCompliantCount: 0,
        hasSovereignAllocationsCount: 0,
      };
    }

    let totalMarketCap = 0;
    let sovereignCount = 0;
    let totalSupplyNum = 0;
    let totalPrice = 0;
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let totalHolders = 0;
    let totalSecurityScore = 0;
    let powerOfTwoCompliantCount = 0;
    let hasSovereignAllocationsCount = 0;

    const chainCounts: Partial<Record<ChainType, number>> = {};
    const standardCounts: Partial<Record<TokenStandard, number>> = {};
    const statusCounts: Record<string, number> = {};

    selectedTokens.forEach((t) => {
      const mcap = t.marketCap || 0;
      totalMarketCap += mcap;
      if (mcap >= 3_000_000_000_000) {
        sovereignCount++;
      }

      // Initial Supply parse
      const rawSupply = parseFloat(t.initialSupply?.replace(/,/g, "") || "0");
      if (!isNaN(rawSupply) && isFinite(rawSupply)) {
        totalSupplyNum += rawSupply;
      }

      // Price
      const price = t.priceUsd || 0;
      totalPrice += price;
      if (price < minPrice) minPrice = price;
      if (price > maxPrice) maxPrice = price;

      // Holders & Security
      totalHolders += t.holderCount || 0;
      totalSecurityScore += t.securityScore || 0;

      // Sovereign Reserves 2^8 compliance
      if (t.powerOfTwoReserves === 256 || t.coinmarketcapMetric && t.coinmarketcapMetric >= 256) {
        powerOfTwoCompliantCount++;
      }
      if (
        t.reserveShares === SOVEREIGN_RESERVE_SHARES ||
        t.treasuryShares === SOVEREIGN_TREASURY_SHARES
      ) {
        hasSovereignAllocationsCount++;
      }

      // Distributions
      chainCounts[t.chain] = (chainCounts[t.chain] || 0) + 1;
      standardCounts[t.tokenStandard] = (standardCounts[t.tokenStandard] || 0) + 1;
      statusCounts[t.launchStatus] = (statusCounts[t.launchStatus] || 0) + 1;
    });

    const avgMarketCap = totalMarketCap / selectedTokens.length;
    const avgPrice = totalPrice / selectedTokens.length;
    const avgSecurityScore = totalSecurityScore / selectedTokens.length;
    const sovereignRatio = ((sovereignCount / selectedTokens.length) * 100).toFixed(1);

    return {
      totalMarketCap,
      avgMarketCap,
      sovereignCount,
      sovereignRatio,
      totalEstimatedSupply: totalSupplyNum,
      avgPrice,
      minPrice: minPrice === Infinity ? 0 : minPrice,
      maxPrice: maxPrice === -Infinity ? 0 : maxPrice,
      totalHolders,
      avgSecurityScore,
      chainCounts: chainCounts as Record<ChainType, number>,
      standardCounts: standardCounts as Record<TokenStandard, number>,
      statusCounts,
      powerOfTwoCompliantCount,
      hasSovereignAllocationsCount,
    };
  }, [selectedTokens]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleCopyAddresses = () => {
    const addresses = selectedTokens.map((t) => t.contractAddress).join("\n");
    handleCopy(addresses, "addresses");
  };

  const handleCopyTokenIds = () => {
    const ids = selectedTokens.map((t) => t.tokenId).join("\n");
    handleCopy(ids, "token_ids");
  };

  const handleDownloadFoundryEnv = () => {
    const envContent = buildMultiTokenDotEnv(selectedTokens);
    const blob = new Blob([envContent], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `.env.selected_${selectedTokens.length}_tokens`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = () => {
    downloadTokensCSV(selectedTokens, `selected_${selectedTokens.length}_tokenomics`);
  };

  if (count === 0) return null;

  return (
    <div
      id="selected-tokens-summary-dashboard"
      className="bg-[#0D0E12] border-2 border-[#F27D26]/70 rounded-xl p-4 shadow-xl space-y-3.5 transition-all animate-in fade-in duration-200"
    >
      {/* Top Banner Bar: Count, Header, and Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E222D]">
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#F27D26]/10 border border-[#F27D26]/30 text-[#F27D26]">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <span>Selected Tokens &amp; Contracts Summary</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#F27D26] text-black shadow-sm">
                {count.toLocaleString()} / {totalTokens.toLocaleString()} ({selectionPercentage}%)
              </span>
            </div>
            <p className="text-[11px] text-[#8E9299]">
              Aggregated tokenomics valuation, initial supply volume, 2^8 reserve compliance, and multi-chain allocation.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {onExpandSelectedToSovereign && tokenomicsMetrics.sovereignCount < count && (
            <button
              type="button"
              id="btn-summary-elevate-sovereign"
              onClick={onExpandSelectedToSovereign}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 hover:text-white text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Elevate selected tokens to >= $3T CoinMarketCap with 9e20 Reserve and 9e21 Treasury"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Elevate Selected to &gt;= $3T</span>
            </button>
          )}

          <button
            type="button"
            id="btn-summary-copy-addresses"
            onClick={handleCopyAddresses}
            className="px-2.5 py-1.5 rounded-lg bg-[#161820] hover:bg-[#202533] border border-[#2B3245] text-cyan-400 hover:text-cyan-300 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Copy all selected Contract Addresses"
          >
            {copiedKey === "addresses" ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span>{copiedKey === "addresses" ? "Copied Addrs!" : "Copy Addrs"}</span>
          </button>

          <button
            type="button"
            id="btn-summary-copy-token-ids"
            onClick={handleCopyTokenIds}
            className="px-2.5 py-1.5 rounded-lg bg-[#161820] hover:bg-[#202533] border border-[#2B3245] text-amber-400 hover:text-amber-300 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Copy all selected uint256 Token IDs"
          >
            {copiedKey === "token_ids" ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Hash className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>{copiedKey === "token_ids" ? "Copied IDs!" : "Copy IDs"}</span>
          </button>

          <button
            type="button"
            id="btn-summary-download-csv"
            onClick={handleDownloadCSV}
            className="px-2.5 py-1.5 rounded-lg bg-[#F27D26]/20 hover:bg-[#F27D26]/30 border border-[#F27D26]/50 text-[#F27D26] hover:text-white text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
            title={`Export ${selectedTokens.length} selected tokens to CSV for external spreadsheet analysis`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#F27D26]" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            id="btn-summary-download-env"
            onClick={handleDownloadFoundryEnv}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Download Foundry .env preset for selected tokens"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>.env</span>
          </button>

          <button
            type="button"
            id="btn-summary-toggle-market-impact"
            onClick={() => setShowMarketImpact(!showMarketImpact)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm ${
              showMarketImpact
                ? "bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/50 text-rose-300"
                : "bg-[#161820] hover:bg-[#202533] border-[#2B3245] text-[#8E9299] hover:text-white"
            }`}
            title="Toggle Market Impact & Liquidity Pool Slippage Analysis"
          >
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            <span>{showMarketImpact ? "Impact Active" : "Market Impact"}</span>
          </button>

          <button
            type="button"
            id="btn-summary-toggle-burn-mechanism"
            onClick={() => setShowBurnMechanism(!showBurnMechanism)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm ${
              showBurnMechanism
                ? "bg-orange-500/20 hover:bg-orange-500/30 border-orange-500/50 text-orange-300"
                : "bg-[#161820] hover:bg-[#202533] border-[#2B3245] text-[#8E9299] hover:text-white"
            }`}
            title="Toggle Token Burn Mechanism & Market Cap Valuation Simulator"
          >
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>{showBurnMechanism ? "Burn Active" : "Burn Mechanism"}</span>
          </button>

          <button
            type="button"
            id="btn-summary-toggle-expanded"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2.5 py-1.5 rounded-lg bg-[#161820] hover:bg-[#202533] border border-[#2B3245] text-[#8E9299] hover:text-white text-xs font-mono flex items-center gap-1 transition-all cursor-pointer"
          >
            <span>{isExpanded ? "Compact View" : "Detailed Metrics"}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            id="btn-summary-deselect-all"
            onClick={onDeselectAll}
            className="p-1.5 rounded-lg bg-[#161820] hover:bg-rose-950/40 border border-[#2B3245] hover:border-rose-500/50 text-[#8E9299] hover:text-rose-300 transition-all cursor-pointer"
            title="Deselect All Tokens"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Aggregated Tokenomics Metric Grid (6 High-Information Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Card 1: Aggregated Market Capitalization */}
        <div className="bg-[#12141A] p-3 rounded-lg border border-[#1E222D] space-y-1">
          <div className="flex items-center justify-between text-[#8E9299] text-[10px] font-mono uppercase tracking-wider">
            <span>Aggregated MCap</span>
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-base font-bold font-mono text-white truncate">
            {formatCompactCurrency(tokenomicsMetrics.totalMarketCap)}
          </div>
          <div className="text-[10px] font-mono text-[#8E9299] flex items-center justify-between">
            <span>Avg: {formatCompactCurrency(tokenomicsMetrics.avgMarketCap)}</span>
            <span className="text-amber-400 font-semibold">{tokenomicsMetrics.sovereignCount} ≥ $3T</span>
          </div>
        </div>

        {/* Card 2: Aggregated Initial Supply Volume */}
        <div className="bg-[#12141A] p-3 rounded-lg border border-[#1E222D] space-y-1">
          <div className="flex items-center justify-between text-[#8E9299] text-[10px] font-mono uppercase tracking-wider">
            <span>Total Supply</span>
            <Coins className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-base font-bold font-mono text-cyan-300 truncate">
            {formatCompactNumber(tokenomicsMetrics.totalEstimatedSupply)}
          </div>
          <div className="text-[10px] font-mono text-[#8E9299]">
            Across {count} smart contracts
          </div>
        </div>

        {/* Card 3: Price & Range */}
        <div className="bg-[#12141A] p-3 rounded-lg border border-[#1E222D] space-y-1">
          <div className="flex items-center justify-between text-[#8E9299] text-[10px] font-mono uppercase tracking-wider">
            <span>Avg Token Price</span>
            <Scale className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-base font-bold font-mono text-emerald-400 truncate">
            ${tokenomicsMetrics.avgPrice.toFixed(4)}
          </div>
          <div className="text-[10px] font-mono text-[#8E9299] truncate">
            ${tokenomicsMetrics.minPrice.toFixed(2)} - ${tokenomicsMetrics.maxPrice.toFixed(2)}
          </div>
        </div>

        {/* Card 4: Security & Audit Health */}
        <div className="bg-[#12141A] p-3 rounded-lg border border-[#1E222D] space-y-1">
          <div className="flex items-center justify-between text-[#8E9299] text-[10px] font-mono uppercase tracking-wider">
            <span>Audit Score</span>
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-base font-bold font-mono text-purple-300 truncate">
            {tokenomicsMetrics.avgSecurityScore.toFixed(1)} / 100
          </div>
          <div className="text-[10px] font-mono text-purple-400/90 font-semibold">
            {tokenomicsMetrics.avgSecurityScore >= 90
              ? "Institutional Grade"
              : tokenomicsMetrics.avgSecurityScore >= 80
              ? "Enterprise Secure"
              : "Standard Audit"}
          </div>
        </div>

        {/* Card 5: Power-of-Two 2^8 Reserves (256) */}
        <div className="bg-[#12141A] p-3 rounded-lg border border-[#1E222D] space-y-1">
          <div className="flex items-center justify-between text-[#8E9299] text-[10px] font-mono uppercase tracking-wider">
            <span>2^8 Reserves</span>
            <Lock className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="text-base font-bold font-mono text-[#F27D26] truncate">
            {tokenomicsMetrics.powerOfTwoCompliantCount} / {count}
          </div>
          <div className="text-[10px] font-mono text-[#8E9299] truncate">
            9e20 Reserve • 9e21 Treas.
          </div>
        </div>

        {/* Card 6: Multi-Chain Spread */}
        <div className="bg-[#12141A] p-3 rounded-lg border border-[#1E222D] space-y-1">
          <div className="flex items-center justify-between text-[#8E9299] text-[10px] font-mono uppercase tracking-wider">
            <span>Chains &amp; Std</span>
            <Globe className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-base font-bold font-mono text-blue-300 truncate">
            {Object.keys(tokenomicsMetrics.chainCounts).length} Chains
          </div>
          <div className="text-[10px] font-mono text-[#8E9299] truncate">
            {Object.keys(tokenomicsMetrics.standardCounts).length} Standards
          </div>
        </div>
      </div>

      {/* Hypothetical Sell Order Market Impact Simulation (Recharts AMM Curve) */}
      {showMarketImpact && (
        <MarketImpactVisualizer selectedTokens={selectedTokens} />
      )}

      {/* Token Burn Mechanism Simulation (Supply Destruction & Market Cap Valuation Impact) */}
      {showBurnMechanism && (
        <BurnMechanismSimulator selectedTokens={selectedTokens} />
      )}

      {/* Expanded Breakdown Drawer (Toggled via "Detailed Metrics") */}
      {isExpanded && (
        <div className="pt-3 border-t border-[#1E222D] space-y-3 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            {/* 1. Chains Allocation */}
            <div className="bg-[#12141A] p-3 rounded-lg border border-[#1E222D] space-y-2">
              <div className="flex items-center justify-between text-[#8E9299] text-[11px]">
                <span className="font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  Blockchains Distribution
                </span>
                <span className="text-[10px]">{Object.keys(tokenomicsMetrics.chainCounts).length} networks</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(tokenomicsMetrics.chainCounts).map(([chain, cnt]) => (
                  <span
                    key={chain}
                    className="px-2 py-0.5 rounded bg-[#1A1D27] border border-[#2B3245] text-[#D0D4E0] text-[10px] flex items-center gap-1"
                  >
                    <span className="capitalize font-semibold">{chain}:</span>
                    <span className="text-cyan-400 font-bold">{cnt}</span>
                    <span className="text-[9px] text-[#717684]">
                      ({(((cnt as number) / count) * 100).toFixed(0)}%)
                    </span>
                  </span>
                ))}
              </div>
            </div>

            {/* 2. Token Standards Allocation */}
            <div className="bg-[#12141A] p-3 rounded-lg border border-[#1E222D] space-y-2">
              <div className="flex items-center justify-between text-[#8E9299] text-[11px]">
                <span className="font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  Token Standards Distribution
                </span>
                <span className="text-[10px]">{Object.keys(tokenomicsMetrics.standardCounts).length} types</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(tokenomicsMetrics.standardCounts).map(([std, cnt]) => (
                  <span
                    key={std}
                    className="px-2 py-0.5 rounded bg-[#1A1D27] border border-[#2B3245] text-[#D0D4E0] text-[10px] flex items-center gap-1"
                  >
                    <span className="font-semibold">{std}:</span>
                    <span className="text-purple-400 font-bold">{cnt}</span>
                    <span className="text-[9px] text-[#717684]">
                      ({(((cnt as number) / count) * 100).toFixed(0)}%)
                    </span>
                  </span>
                ))}
              </div>
            </div>

            {/* 3. Launch Status & Sovereign Pillars */}
            <div className="bg-[#12141A] p-3 rounded-lg border border-[#1E222D] space-y-2">
              <div className="flex items-center justify-between text-[#8E9299] text-[11px]">
                <span className="font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Launch Status &amp; Pillars
                </span>
                <span className="text-[10px] text-amber-400">{tokenomicsMetrics.sovereignRatio}% Sovereign</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(tokenomicsMetrics.statusCounts).map(([st, cnt]) => (
                  <span
                    key={st}
                    className="px-2 py-0.5 rounded bg-[#1A1D27] border border-[#2B3245] text-[#D0D4E0] text-[10px] flex items-center gap-1"
                  >
                    <span>{st}:</span>
                    <span className="text-emerald-400 font-bold">{cnt}</span>
                  </span>
                ))}
                <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] flex items-center gap-1">
                  <span>Holders:</span>
                  <span className="font-bold">{formatCompactNumber(tokenomicsMetrics.totalHolders)}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Contract Addresses Strip */}
          <div className="p-2.5 rounded-lg bg-[#08090C] border border-[#1F222E] flex items-center justify-between text-[11px] font-mono text-[#8E9299] overflow-hidden">
            <div className="flex items-center gap-2 truncate">
              <span className="text-white font-semibold shrink-0">Selected Contracts Preview:</span>
              <span className="text-[#8E9299] truncate">
                {selectedTokens
                  .slice(0, 5)
                  .map((t) => `${t.symbol} (${t.contractAddress.slice(0, 6)}...${t.contractAddress.slice(-4)})`)
                  .join(" • ")}
                {selectedTokens.length > 5 && ` and +${selectedTokens.length - 5} more`}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyAddresses}
              className="text-cyan-400 hover:text-cyan-300 shrink-0 ml-2 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Copy className="w-3 h-3" />
              <span>Copy All ({count})</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
