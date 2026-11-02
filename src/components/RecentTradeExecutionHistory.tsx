import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Search,
  Download,
  Play,
  Pause,
  RotateCcw,
  Layers,
  Scale,
  Zap,
  CheckCircle2,
  ExternalLink,
  Sliders,
  DollarSign,
  Activity,
  Sparkles,
  ChevronDown,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Check
} from "lucide-react";
import { PortfolioTokenHolding } from "../utils/walletPortfolioService";
import { TokenRecord } from "../types";

export type TimeInForce = "GTC" | "IOC" | "FOK";
export type TradeSide = "BUY" | "SELL";

export interface FilledPriceTier {
  tierId: string;
  tierName: string;
  depthLevel: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  priceOffsetPct: number;
}

export interface SimulatedTradeExecution {
  id: string;
  timestamp: number;
  timeFormatted: string;
  relativeTime: string;
  side: TradeSide;
  price: number;
  amountTokens: number;
  notionalUsd: number;
  filledPriceTier: FilledPriceTier;
  timeInForce: TimeInForce;
  executionVenue: string;
  liquidityRole: "Maker" | "Taker";
  slippagePct: number;
  isBlockOrder: boolean;
  txHash: string;
}

export interface RecentTradeExecutionHistoryProps {
  holding: PortfolioTokenHolding;
  token?: TokenRecord;
  currentPrice: number;
  currentMarketCap?: number;
  className?: string;
  onOpenGlobalSwapSell?: (token: any, initialMode?: "swap" | "send" | "sell") => void;
}

const PRICE_TIERS: FilledPriceTier[] = [
  {
    tierId: "TIER_1_TOP_OF_BOOK",
    tierName: "Tier 1: Inside Mid (Spread < 0.10%)",
    depthLevel: "Top of Book / Tightest Spread",
    badgeBg: "bg-emerald-500/15",
    badgeBorder: "border-emerald-500/40",
    badgeText: "text-emerald-300",
    priceOffsetPct: 0.05,
  },
  {
    tierId: "TIER_2_NEAR_MID",
    tierName: "Tier 2: Algorithmic Depth (0.10% – 0.45%)",
    depthLevel: "Near-Market Liquid Corridors",
    badgeBg: "bg-cyan-500/15",
    badgeBorder: "border-cyan-500/40",
    badgeText: "text-cyan-300",
    priceOffsetPct: 0.25,
  },
  {
    tierId: "TIER_3_INSTITUTIONAL_WALL",
    tierName: "Tier 3: Institutional Wall Sweep (0.45% – 0.95%)",
    depthLevel: "Institutional Block Resting Walls",
    badgeBg: "bg-purple-500/20",
    badgeBorder: "border-purple-500/50",
    badgeText: "text-purple-300",
    priceOffsetPct: 0.70,
  },
  {
    tierId: "TIER_4_DEEP_BOOK",
    tierName: "Tier 4: Deep Book Cross (> 0.95%)",
    depthLevel: "Deep Liquidity Absorb / Aggressive Sweep",
    badgeBg: "bg-amber-500/20",
    badgeBorder: "border-amber-500/50",
    badgeText: "text-amber-300",
    priceOffsetPct: 1.35,
  },
];

function generateSeedTrades(
  basePrice: number,
  symbol: string,
  count: number = 24
): SimulatedTradeExecution[] {
  const trades: SimulatedTradeExecution[] = [];
  const now = Date.now();

  const venues = [
    "TWE ATS Limit Heap #9450",
    "On-Chain DvP Order Bus",
    "Institutional Dark Pool Cross",
    "FAST Protocol Depository #9450",
  ];

  for (let i = 0; i < count; i++) {
    const elapsedSec = (i * 38) + Math.floor(Math.random() * 25);
    const ts = now - elapsedSec * 1000;
    const isBuy = (i * 7 + Math.random()) % 2 > 0.95 ? true : i % 2 === 0;
    const side: TradeSide = isBuy ? "BUY" : "SELL";

    const tierIndex = i % 7 === 0 ? 3 : i % 4 === 0 ? 2 : i % 2 === 0 ? 1 : 0;
    const tier = PRICE_TIERS[tierIndex];

    const priceOffset = (tier.priceOffsetPct * (side === "BUY" ? 1 : -1) * (0.8 + Math.random() * 0.4)) / 100;
    const execPrice = Math.max(0.0001, basePrice * (1 + priceOffset));

    // Realistic order sizes with occasional institutional whale block orders
    const isBlock = i % 5 === 0;
    const notionalUsd = isBlock
      ? Math.round(35000 + Math.random() * 125000)
      : Math.round(850 + Math.random() * 8500);

    const amountTokens = Number((notionalUsd / execPrice).toFixed(execPrice < 1 ? 2 : 4));
    const tif: TimeInForce = i % 6 === 0 ? "FOK" : i % 3 === 0 ? "IOC" : "GTC";
    const venue = venues[i % venues.length];
    const role = side === "BUY" && Math.random() > 0.4 ? "Taker" : "Maker";
    const slippage = Number((Math.abs(priceOffset) * 100).toFixed(2));

    const date = new Date(ts);
    const timeFormatted = date.toTimeString().split(" ")[0];

    const relSec = Math.floor((now - ts) / 1000);
    const relativeTime =
      relSec < 60
        ? `${relSec}s ago`
        : relSec < 3600
        ? `${Math.floor(relSec / 60)}m ago`
        : `${Math.floor(relSec / 3600)}h ago`;

    const txHex = ((ts * 1337) ^ (i * 99991)).toString(16).padStart(8, "0");
    const txHash = `0x${txHex.slice(0, 4)}...${txHex.slice(-4)}`;

    trades.push({
      id: `TR-${ts}-${i}`,
      timestamp: ts,
      timeFormatted,
      relativeTime,
      side,
      price: execPrice,
      amountTokens,
      notionalUsd,
      filledPriceTier: tier,
      timeInForce: tif,
      executionVenue: venue,
      liquidityRole: role,
      slippagePct: slippage,
      isBlockOrder: isBlock,
      txHash,
    });
  }

  return trades;
}

export const RecentTradeExecutionHistory: React.FC<RecentTradeExecutionHistoryProps> = ({
  holding,
  token,
  currentPrice,
  currentMarketCap,
  className = "",
  onOpenGlobalSwapSell,
}) => {
  const sym = holding.symbol || "TOKEN";
  const [trades, setTrades] = useState<SimulatedTradeExecution[]>(() =>
    generateSeedTrades(currentPrice > 0 ? currentPrice : 50, sym, 25)
  );

  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true);
  const [filterSide, setFilterSide] = useState<"ALL" | "BUY" | "SELL" | "BLOCK">("ALL");
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>("ALL");
  const [activeTif, setActiveTif] = useState<TimeInForce | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [flashingTradeId, setFlashingTradeId] = useState<string | null>(null);

  // Time-in-Force Simulator State
  const [tifSimOrderType, setTifSimOrderType] = useState<TimeInForce>("GTC");
  const [tifSimSizeUsd, setTifSimSizeUsd] = useState<number>(25000);
  const [tifSimSide, setTifSimSide] = useState<TradeSide>("BUY");
  const [tifSimResult, setTifSimResult] = useState<{
    status: "FILLED" | "PARTIAL_CANCEL" | "KILLED";
    fillRatioPct: number;
    filledAmountTokens: number;
    avgFillPrice: number;
    slippagePct: number;
    tierReached: string;
    explanation: string;
  } | null>(null);

  // Re-generate or adjust seed trades if base price drastically shifts
  useEffect(() => {
    if (currentPrice > 0 && trades.length === 0) {
      setTrades(generateSeedTrades(currentPrice, sym, 25));
    }
  }, [currentPrice, sym]);

  // Live Tick Engine: Simulates real-time incoming trades matching the order book depth
  useEffect(() => {
    if (!isLiveStreaming) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const isBuy = Math.random() >= 0.45; // slight buy bias typical of active crypto/RWA tokens
      const side: TradeSide = isBuy ? "BUY" : "SELL";

      // Pick tier based on realistic execution probability (Tier 1 is most frequent)
      const roll = Math.random();
      const tierIndex = roll > 0.88 ? 3 : roll > 0.65 ? 2 : roll > 0.35 ? 1 : 0;
      const tier = PRICE_TIERS[tierIndex];

      const priceOffset = (tier.priceOffsetPct * (side === "BUY" ? 1 : -1) * (0.85 + Math.random() * 0.3)) / 100;
      const execPrice = Math.max(0.0001, currentPrice * (1 + priceOffset));

      const isBlock = Math.random() > 0.82;
      const notionalUsd = isBlock
        ? Math.round(28000 + Math.random() * 95000)
        : Math.round(650 + Math.random() * 6500);

      const amountTokens = Number((notionalUsd / execPrice).toFixed(execPrice < 1 ? 2 : 4));
      const tif: TimeInForce = Math.random() > 0.8 ? "FOK" : Math.random() > 0.6 ? "IOC" : "GTC";
      const venue = "TWE ATS Limit Heap #9450";
      const role = side === "BUY" && Math.random() > 0.4 ? "Taker" : "Maker";
      const slippage = Number((Math.abs(priceOffset) * 100).toFixed(2));

      const date = new Date(now);
      const timeFormatted = date.toTimeString().split(" ")[0];

      const txHex = ((now * 2654435761) ^ Math.floor(Math.random() * 1e7)).toString(16).padStart(8, "0");
      const txHash = `0x${txHex.slice(0, 4)}...${txHex.slice(-4)}`;

      const newTrade: SimulatedTradeExecution = {
        id: `TR-${now}-${Math.floor(Math.random() * 1000)}`,
        timestamp: now,
        timeFormatted,
        relativeTime: "Just now",
        side,
        price: execPrice,
        amountTokens,
        notionalUsd,
        filledPriceTier: tier,
        timeInForce: tif,
        executionVenue: venue,
        liquidityRole: role,
        slippagePct: slippage,
        isBlockOrder: isBlock,
        txHash,
      };

      setTrades((prev) => {
        const next = [newTrade, ...prev.slice(0, 49)];
        return next;
      });

      setFlashingTradeId(newTrade.id);
      setTimeout(() => {
        setFlashingTradeId((cur) => (cur === newTrade.id ? null : cur));
      }, 1800);
    }, 2800);

    return () => clearInterval(interval);
  }, [isLiveStreaming, currentPrice]);

  // Update relative time labels every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setTrades((prev) =>
        prev.map((t) => {
          const relSec = Math.floor((now - t.timestamp) / 1000);
          const relativeTime =
            relSec < 5
              ? "Just now"
              : relSec < 60
              ? `${relSec}s ago`
              : relSec < 3600
              ? `${Math.floor(relSec / 60)}m ago`
              : `${Math.floor(relSec / 3600)}h ago`;
          return { ...t, relativeTime };
        })
      );
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  // Filtered trade list
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      if (filterSide === "BUY" && t.side !== "BUY") return false;
      if (filterSide === "SELL" && t.side !== "SELL") return false;
      if (filterSide === "BLOCK" && !t.isBlockOrder) return false;
      if (selectedTierFilter !== "ALL" && t.filledPriceTier.tierId !== selectedTierFilter) return false;
      if (activeTif !== "ALL" && t.timeInForce !== activeTif) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchHash = t.txHash.toLowerCase().includes(q);
        const matchTier = t.filledPriceTier.tierName.toLowerCase().includes(q);
        const matchPrice = t.price.toString().includes(q);
        if (!matchHash && !matchTier && !matchPrice) return false;
      }
      return true;
    });
  }, [trades, filterSide, selectedTierFilter, activeTif, searchQuery]);

  // Telemetry Aggregates
  const summaryStats = useMemo(() => {
    const totalCount = trades.length;
    const buyCount = trades.filter((t) => t.side === "BUY").length;
    const sellCount = trades.filter((t) => t.side === "SELL").length;
    const buyVolumeUsd = trades.filter((t) => t.side === "BUY").reduce((acc, t) => acc + t.notionalUsd, 0);
    const sellVolumeUsd = trades.filter((t) => t.side === "SELL").reduce((acc, t) => acc + t.notionalUsd, 0);
    const totalVolumeUsd = buyVolumeUsd + sellVolumeUsd;
    const buyRatioPct = totalVolumeUsd > 0 ? (buyVolumeUsd / totalVolumeUsd) * 100 : 50;
    const avgSlippage = trades.length > 0 ? trades.reduce((acc, t) => acc + t.slippagePct, 0) / trades.length : 0;
    const largestBlock = trades.reduce((max, t) => (t.notionalUsd > max.notionalUsd ? t : max), trades[0] || null);

    return {
      totalCount,
      buyCount,
      sellCount,
      buyVolumeUsd,
      sellVolumeUsd,
      totalVolumeUsd,
      buyRatioPct,
      avgSlippage,
      largestBlock,
    };
  }, [trades]);

  // Execute Time-in-Force Simulation Calculator
  const handleSimulateTifOrder = useCallback(() => {
    const size = tifSimSizeUsd;
    const tif = tifSimOrderType;
    const side = tifSimSide;
    const price = currentPrice > 0 ? currentPrice : 50;

    let status: "FILLED" | "PARTIAL_CANCEL" | "KILLED" = "FILLED";
    let fillRatio = 100;
    let slippage = 0.08;
    let tier = "Tier 1: Inside Mid (Spread < 0.10%)";
    let explanation = "";

    if (tif === "GTC") {
      // Good-Till-Cancelled: always 100% fills across tiers
      if (size <= 10000) {
        tier = "Tier 1: Inside Mid (Spread < 0.10%)";
        slippage = 0.06;
        explanation = `GTC simulated order of $${size.toLocaleString()} USD fully matched at Top of Book with negligible ${slippage}% slippage.`;
      } else if (size <= 50000) {
        tier = "Tier 2: Algorithmic Depth (0.10% – 0.45%)";
        slippage = 0.28;
        explanation = `GTC simulated order filled through Tier 2 algorithmic corridors with +${slippage}% depth impact.`;
      } else if (size <= 250000) {
        tier = "Tier 3: Institutional Wall Sweep (0.45% – 0.95%)";
        slippage = 0.65;
        explanation = `GTC block swept resting institutional liquidity walls with +${slippage}% price expansion.`;
      } else {
        tier = "Tier 4: Deep Book Cross (> 0.95%)";
        slippage = 1.42;
        explanation = `GTC mega-ticket crossed deep book tiers. Executed with +${slippage}% market impact.`;
      }
    } else if (tif === "IOC") {
      // Immediate-or-Cancel: fills top tiers, cancels remainder if size exceeds immediate book
      if (size <= 25000) {
        fillRatio = 100;
        tier = "Tier 1: Inside Mid";
        slippage = 0.08;
        explanation = `IOC simulated order fully filled immediately ($${size.toLocaleString()} USD @ 100%). Zero unfilled balance canceled.`;
      } else if (size <= 100000) {
        fillRatio = 78;
        status = "PARTIAL_CANCEL";
        tier = "Tier 2: Near-Mid Liquid Corridors";
        slippage = 0.22;
        const filledUsd = Math.round(size * 0.78);
        const canceledUsd = size - filledUsd;
        explanation = `IOC immediate fill executed $${filledUsd.toLocaleString()} USD (78%). Remaining $${canceledUsd.toLocaleString()} USD canceled to prevent excessive slippage.`;
      } else {
        fillRatio = 45;
        status = "PARTIAL_CANCEL";
        tier = "Tier 3: Institutional Sweep";
        slippage = 0.52;
        const filledUsd = Math.round(size * 0.45);
        const canceledUsd = size - filledUsd;
        explanation = `IOC limit hit liquidity wall: $${filledUsd.toLocaleString()} USD executed (45%). Unfilled $${canceledUsd.toLocaleString()} USD canceled immediately.`;
      }
    } else {
      // Fill-or-Kill: requires 100% full match without crossing into extreme slippage tiers, else kills
      if (size <= 50000) {
        fillRatio = 100;
        status = "FILLED";
        tier = "Tier 1 & Tier 2 Consolidated";
        slippage = 0.18;
        explanation = `FOK satisfied: Complete order of $${size.toLocaleString()} USD filled atomically in full across Tier 1 & 2 liquidity.`;
      } else {
        fillRatio = 0;
        status = "KILLED";
        tier = "None (Order Rejected / Killed)";
        slippage = 0;
        explanation = `FOK KILLED: Order size of $${size.toLocaleString()} USD exceeds immediate tight-tier depth without causing severe slippage. Entire order was aborted without partial execution.`;
      }
    }

    const avgPrice =
      status === "KILLED"
        ? 0
        : side === "BUY"
        ? price * (1 + slippage / 100)
        : price * (1 - slippage / 100);

    const filledTokens =
      status === "KILLED" ? 0 : Number(((size * (fillRatio / 100)) / avgPrice).toFixed(avgPrice < 1 ? 2 : 4));

    setTifSimResult({
      status,
      fillRatioPct: fillRatio,
      filledAmountTokens: filledTokens,
      avgFillPrice: avgPrice,
      slippagePct: slippage,
      tierReached: tier,
      explanation,
    });
  }, [tifSimOrderType, tifSimSizeUsd, tifSimSide, currentPrice]);

  // Run initial simulation on mount
  useEffect(() => {
    handleSimulateTifOrder();
  }, [handleSimulateTifOrder]);

  const handleCopyHash = (hash: string, id: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportCsv = () => {
    const headers = [
      "TRADE_ID",
      "TIMESTAMP_ISO",
      "SIDE",
      "PRICE_USD",
      "AMOUNT_TOKENS",
      "NOTIONAL_USD",
      "FILLED_PRICE_TIER",
      "TIME_IN_FORCE",
      "ROLE",
      "SLIPPAGE_PCT",
      "VENUE",
      "TX_HASH"
    ];

    const rows = filteredTrades.map((t) => [
      t.id,
      new Date(t.timestamp).toISOString(),
      t.side,
      t.price.toFixed(t.price < 1 ? 4 : 2),
      t.amountTokens,
      t.notionalUsd.toFixed(2),
      `"${t.filledPriceTier.tierName}"`,
      t.timeInForce,
      t.liquidityRole,
      t.slippagePct + "%",
      `"${t.executionVenue}"`,
      t.txHash
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${sym}_Recent_Trade_Execution_History_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`space-y-4 rounded-2xl bg-[#0e1017]/90 border border-[#1f2433] p-4 sm:p-5 shadow-2xl font-sans ${className}`}>
      {/* SECTION HEADER & REAL-TIME CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#1f2433] pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              Recent Trade Execution History
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1.5 ${
              isLiveStreaming
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
            }`}>
              <span className={`w-2 h-2 rounded-full ${isLiveStreaming ? "bg-emerald-400 animate-ping" : "bg-amber-400"}`} />
              {isLiveStreaming ? "LIVE FEED: STREAMING" : "FEED PAUSED"}
            </span>
            <span className="text-[11px] font-mono text-[#8E9299]">
              Asset: <strong className="text-white">{sym}</strong> (${(currentPrice > 0 ? currentPrice : 50).toFixed(currentPrice < 1 ? 4 : 2)})
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white mt-1 flex items-center gap-2">
            Order Book Fill Tape &amp; Executed Price Tiers
          </h3>
          <p className="text-xs text-[#8E9299]">
            Scrollable log of simulated buy and sell executions mapped directly to order book depth tiers and simulated slippage impact.
          </p>
        </div>

        {/* Action Controls & Feed Toggle */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => setIsLiveStreaming(!isLiveStreaming)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer border ${
              isLiveStreaming
                ? "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
            }`}
          >
            {isLiveStreaming ? (
              <>
                <Pause className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pause Feed</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span>Resume Feed</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141722] hover:bg-[#1a1e2c] text-cyan-300 border border-cyan-500/30 font-mono text-xs font-bold transition-all cursor-pointer"
            title="Download execution history ledger as CSV"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* SUMMARY TELEMETRY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        {/* Total Volume */}
        <div className="p-3 rounded-xl bg-[#141722]/80 border border-[#242a3d] space-y-1">
          <div className="text-[10px] text-[#8E9299] flex items-center justify-between">
            <span>SIMULATED VOLUME</span>
            <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-base sm:text-lg font-bold text-white">
            ${(summaryStats.totalVolumeUsd / 1e3).toFixed(1)}k USD
          </div>
          <div className="text-[10px] text-[#8E9299]">
            {summaryStats.totalCount} Orders Logged
          </div>
        </div>

        {/* Buy / Sell Pressure Ratio */}
        <div className="p-3 rounded-xl bg-[#141722]/80 border border-[#242a3d] space-y-1">
          <div className="text-[10px] text-[#8E9299] flex items-center justify-between">
            <span>BUY / SELL RATIO</span>
            <Scale className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-base sm:text-lg font-bold flex items-center gap-1">
            <span className="text-emerald-400">{summaryStats.buyRatioPct.toFixed(0)}% B</span>
            <span className="text-slate-500">/</span>
            <span className="text-rose-400">{(100 - summaryStats.buyRatioPct).toFixed(0)}% S</span>
          </div>
          {/* Visual Mini Progress Bar */}
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden flex">
            <div style={{ width: `${summaryStats.buyRatioPct}%` }} className="h-full bg-emerald-400" />
            <div style={{ width: `${100 - summaryStats.buyRatioPct}%` }} className="h-full bg-rose-400" />
          </div>
        </div>

        {/* Average Fill Slippage */}
        <div className="p-3 rounded-xl bg-[#141722]/80 border border-[#242a3d] space-y-1">
          <div className="text-[10px] text-[#8E9299] flex items-center justify-between">
            <span>AVG FILL SLIPPAGE</span>
            <Activity className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-base sm:text-lg font-bold text-amber-300">
            ±{summaryStats.avgSlippage.toFixed(2)}%
          </div>
          <div className="text-[10px] text-[#8E9299]">
            Inside Depth Spread
          </div>
        </div>

        {/* Peak Block Order */}
        <div className="p-3 rounded-xl bg-[#141722]/80 border border-[#242a3d] space-y-1">
          <div className="text-[10px] text-[#8E9299] flex items-center justify-between">
            <span>PEAK BLOCK ORDER</span>
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-base sm:text-lg font-bold text-purple-300 truncate">
            {summaryStats.largestBlock ? `$${(summaryStats.largestBlock.notionalUsd / 1e3).toFixed(1)}k USD` : "—"}
          </div>
          <div className="text-[10px] text-[#8E9299] truncate">
            {summaryStats.largestBlock ? summaryStats.largestBlock.filledPriceTier.tierId.replace(/_/g, " ") : "Waiting"}
          </div>
        </div>
      </div>

      {/* TIME-IN-FORCE & SLIPPAGE SENSITIVITY SIMULATOR MODULE */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-[#11131c] via-[#141722] to-[#11131c] border border-cyan-500/25 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-xs text-white uppercase tracking-wider font-mono">
              Time-in-Force (TIF) &amp; Slippage Sensitivity Simulator
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#8E9299]">
            Simulate how GTC, IOC, and FOK rules alter fill completion across order book tiers
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Side Selector */}
          <div className="sm:col-span-2 flex items-center bg-[#0a0d14] p-1 rounded-xl border border-[#242a3d]">
            <button
              type="button"
              onClick={() => setTifSimSide("BUY")}
              className={`flex-1 py-1.5 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${
                tifSimSide === "BUY"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              Buy Fill
            </button>
            <button
              type="button"
              onClick={() => setTifSimSide("SELL")}
              className={`flex-1 py-1.5 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${
                tifSimSide === "SELL"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              Sell Fill
            </button>
          </div>

          {/* Time-in-Force Dropdown Menu */}
          <div className="sm:col-span-3">
            <div className="relative">
              <select
                value={tifSimOrderType}
                onChange={(e) => setTifSimOrderType(e.target.value as TimeInForce)}
                className="w-full px-3 py-2 bg-[#0a0d14] border border-[#242a3d] focus:border-cyan-500 rounded-xl text-white font-mono text-xs cursor-pointer appearance-none outline-none"
              >
                <option value="GTC">Good-Till-Cancelled (GTC) — Full Depth Fill</option>
                <option value="IOC">Immediate-or-Cancel (IOC) — Partial Top Tiers</option>
                <option value="FOK">Fill-or-Kill (FOK) — All-or-Nothing</option>
              </select>
              <ChevronDown className="w-4 h-4 text-[#8E9299] absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Simulated Order Size Buttons */}
          <div className="sm:col-span-5 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-mono text-[#8E9299]">Size:</span>
            {[5000, 25000, 100000, 500000].map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setTifSimSizeUsd(sz)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  tifSimSizeUsd === sz
                    ? "bg-cyan-500/25 text-cyan-200 border border-cyan-400 shadow-sm"
                    : "bg-[#0a0d14] text-[#8E9299] hover:text-white border border-[#242a3d]"
                }`}
              >
                ${sz >= 1e6 ? `${sz / 1e6}M` : `${sz / 1e3}K`}
              </button>
            ))}
          </div>

          {/* Recalculate CTA */}
          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={handleSimulateTifOrder}
              className="w-full py-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Simulate TIF</span>
            </button>
          </div>
        </div>

        {/* TIF Simulation Output Banner */}
        {tifSimResult && (
          <div className="p-3 rounded-xl bg-[#0a0d14]/90 border border-slate-800 space-y-2 text-xs font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  tifSimResult.status === "FILLED"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : tifSimResult.status === "PARTIAL_CANCEL"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                }`}>
                  {tifSimResult.status} ({tifSimResult.fillRatioPct}% Executed)
                </span>
                <span className="text-white font-semibold">
                  Filled: <strong className="text-cyan-300">{tifSimResult.filledAmountTokens.toLocaleString()} {sym}</strong>
                </span>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-[#8E9299]">
                <span>Avg Price: <strong className="text-white">${tifSimResult.avgFillPrice < 1 ? tifSimResult.avgFillPrice.toFixed(4) : tifSimResult.avgFillPrice.toFixed(2)}</strong></span>
                <span>Impact: <strong className={tifSimResult.slippagePct > 0.5 ? "text-rose-400" : "text-emerald-400"}>+{tifSimResult.slippagePct}%</strong></span>
              </div>
            </div>

            <div className="text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>{tifSimResult.explanation}</span>
            </div>
          </div>
        )}
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
        {/* Side Filter Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterSide("ALL")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold ${
              filterSide === "ALL"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "bg-[#141722] text-[#8E9299] hover:text-white border border-[#242a3d]"
            }`}
          >
            All Fills ({trades.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterSide("BUY")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold flex items-center gap-1 ${
              filterSide === "BUY"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "bg-[#141722] text-[#8E9299] hover:text-emerald-300 border border-[#242a3d]"
            }`}
          >
            <ArrowUpRight className="w-3 h-3 text-emerald-400" />
            <span>Buys ({trades.filter((t) => t.side === "BUY").length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterSide("SELL")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold flex items-center gap-1 ${
              filterSide === "SELL"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                : "bg-[#141722] text-[#8E9299] hover:text-rose-300 border border-[#242a3d]"
            }`}
          >
            <ArrowDownRight className="w-3 h-3 text-rose-400" />
            <span>Sells ({trades.filter((t) => t.side === "SELL").length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterSide("BLOCK")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold flex items-center gap-1 ${
              filterSide === "BLOCK"
                ? "bg-purple-500/25 text-purple-300 border border-purple-500/50"
                : "bg-[#141722] text-[#8E9299] hover:text-purple-300 border border-[#242a3d]"
            }`}
          >
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>Block Fills (≥ $25k)</span>
          </button>
        </div>

        {/* Tier Selector & Search */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <select
            value={selectedTierFilter}
            onChange={(e) => setSelectedTierFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[#141722] border border-[#242a3d] text-slate-300 text-xs font-mono outline-none cursor-pointer focus:border-cyan-500"
          >
            <option value="ALL">All Depth Tiers</option>
            <option value="TIER_1_TOP_OF_BOOK">Tier 1: Inside Mid (&lt;0.10%)</option>
            <option value="TIER_2_NEAR_MID">Tier 2: Algorithmic (0.10%–0.45%)</option>
            <option value="TIER_3_INSTITUTIONAL_WALL">Tier 3: Wall Sweep (0.45%–0.95%)</option>
            <option value="TIER_4_DEEP_BOOK">Tier 4: Deep Cross (&gt;0.95%)</option>
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8E9299] absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hash or price..."
              className="pl-8 pr-3 py-1.5 rounded-lg bg-[#141722] border border-[#242a3d] text-white text-xs font-mono placeholder-[#8E9299] outline-none focus:border-cyan-500 w-36 sm:w-44"
            />
          </div>
        </div>
      </div>

      {/* SCROLLABLE TRADE EXECUTION LOG TABLE */}
      <div className="rounded-xl border border-[#1f2433] bg-[#0a0d14] overflow-hidden shadow-inner">
        <div className="max-h-80 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left font-mono text-xs">
            <thead className="sticky top-0 bg-[#121520] border-b border-[#242a3d] text-[#8E9299] z-20">
              <tr>
                <th className="py-2.5 px-3">TIMESTAMP</th>
                <th className="py-2.5 px-3">SIDE</th>
                <th className="py-2.5 px-3">FILL PRICE</th>
                <th className="py-2.5 px-3">AMOUNT ({sym})</th>
                <th className="py-2.5 px-3">NOTIONAL (USD)</th>
                <th className="py-2.5 px-3">FILLED PRICE TIER</th>
                <th className="py-2.5 px-3 text-center">TIF</th>
                <th className="py-2.5 px-3 text-right">TX RECEIPT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1e2c]">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#8E9299] font-mono text-xs">
                    No simulated executions match the active filters.
                  </td>
                </tr>
              ) : (
                filteredTrades.map((trade) => {
                  const isNew = flashingTradeId === trade.id;
                  const isBuy = trade.side === "BUY";

                  return (
                    <tr
                      key={trade.id}
                      className={`transition-colors duration-300 hover:bg-[#141724] ${
                        isNew
                          ? isBuy
                            ? "bg-emerald-950/40 animate-pulse"
                            : "bg-rose-950/40 animate-pulse"
                          : ""
                      }`}
                    >
                      {/* Timestamp */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="text-white font-medium">{trade.timeFormatted}</div>
                        <div className="text-[10px] text-[#8E9299]">{trade.relativeTime}</div>
                      </td>

                      {/* Side */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                            isBuy
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          }`}
                        >
                          {isBuy ? (
                            <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3 text-rose-400" />
                          )}
                          <span>{trade.side}</span>
                        </span>
                      </td>

                      {/* Fill Price */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className={`font-bold tabular-nums ${isBuy ? "text-emerald-300" : "text-rose-300"}`}>
                          ${trade.price < 1 ? trade.price.toFixed(4) : trade.price.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-[#8E9299] tabular-nums">
                          {isBuy ? "+" : "-"}{trade.slippagePct}% vs mid
                        </div>
                      </td>

                      {/* Amount Tokens */}
                      <td className="py-2 px-3 whitespace-nowrap font-medium text-white tabular-nums">
                        {trade.amountTokens.toLocaleString()}
                      </td>

                      {/* Notional USD */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="text-white font-bold tabular-nums">
                          ${trade.notionalUsd.toLocaleString()}
                        </div>
                        {trade.isBlockOrder && (
                          <span className="text-[9px] text-purple-400 font-semibold uppercase flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5" /> Block Order
                          </span>
                        )}
                      </td>

                      {/* Filled Price Tier */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-flex items-center gap-1 ${trade.filledPriceTier.badgeBg} ${trade.filledPriceTier.badgeBorder} ${trade.filledPriceTier.badgeText}`}
                          title={trade.filledPriceTier.depthLevel}
                        >
                          <Layers className="w-2.5 h-2.5" />
                          <span>{trade.filledPriceTier.tierName}</span>
                        </span>
                      </td>

                      {/* Time-in-Force */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#141722] border border-[#242a3d] text-slate-300 font-semibold">
                          {trade.timeInForce}
                        </span>
                      </td>

                      {/* Tx Hash */}
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleCopyHash(trade.txHash, trade.id)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#141722] hover:bg-[#1a1e2c] border border-[#242a3d] text-cyan-400 hover:text-cyan-300 transition-all cursor-pointer text-[10px]"
                          title="Click to copy mock tx receipt hash"
                        >
                          <span>{trade.txHash}</span>
                          {copiedId === trade.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-500" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
