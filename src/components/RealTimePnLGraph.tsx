import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Play,
  Pause,
  RefreshCw,
  Zap,
  DollarSign,
  Percent,
  BarChart2,
  ShieldCheck,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Sliders,
  Clock,
  Sparkles,
  ArrowDownUp,
  Radio,
  Eye,
  SlidersHorizontal,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from "recharts";
import { TokenRecord } from "../types";
import { PortfolioTokenHolding, PortfolioSummary, REAL_WORLD_PRICES } from "../utils/walletPortfolioService";
import { MAO_MAO_INITIAL_PRICE_USD } from "../utils/maoMaoToken";

export type PnLTimeframe = "1H" | "24H" | "7D" | "30D" | "90D" | "1Y" | "ALL";
export type PnLDisplayMode = "pnl-usd" | "roi-percent" | "total-value" | "comparison";

interface RealTimePnLGraphProps {
  holdings: PortfolioTokenHolding[];
  summary: PortfolioSummary | null;
  tokens: TokenRecord[];
  onOpenGlobalSwapSell?: (token?: any, mode?: "swap" | "sell") => void;
  className?: string;
}

interface HistoricalPoint {
  timestamp: number;
  timeLabel: string;
  totalPnlUsd: number;
  totalRoiPercent: number;
  totalValueUsd: number;
  totalCostBasisUsd: number;
  marketCapAggregate: number;
  tokenValues: Record<string, number>; // holdingId -> valueUsd
  tokenPnls: Record<string, number>; // holdingId -> pnlUsd
  tokenRois: Record<string, number>; // holdingId -> roiPercent
  tokenMcaps: Record<string, number>; // holdingId -> mockMarketCap
}

// Deterministic seed helper
function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// Estimate realistic baseline mock market cap for any holding
function getBaselineMarketCap(holding: PortfolioTokenHolding, matchedToken?: TokenRecord): number {
  if (matchedToken?.marketCap && matchedToken.marketCap > 0) {
    return matchedToken.marketCap;
  }
  const sym = holding.symbol.toUpperCase();
  if (sym.includes("MAO")) return 3_000_000_000_000; // $3 Trillion Sovereign Cap
  if (sym === "ETH" || sym === "WETH") return 412_500_000_000; // $412.5B
  if (sym === "BTC" || sym === "WBTC") return 1_865_000_000_000; // $1.865T
  if (sym === "USDC") return 34_800_000_000; // $34.8B
  if (sym === "USDT") return 118_400_000_000; // $118.4B
  if (sym === "LINK") return 10_900_000_000; // $10.9B
  if (sym === "UNI") return 6_150_000_000; // $6.15B
  if (sym === "AAVE") return 3_100_000_000; // $3.1B
  if (sym === "ARB") return 2_950_000_000; // $2.95B
  if (sym === "OP") return 2_200_000_000; // $2.2B
  if (sym === "AERO") return 780_000_000; // $780M
  if (sym === "POL" || sym === "MATIC") return 4_600_000_000; // $4.6B
  if (sym === "SOL") return 94_000_000_000; // $94B

  // Fallback for custom or generated tokens: derive from value & supply
  if (holding.isFoundryToken) {
    return 150_000_000 + (hashString(holding.contractAddress) % 850_000_000);
  }
  return Math.max(50_000_000, holding.valueUsd * 2500);
}

// Format numbers nicely
function formatCurrency(val: number, maxDecimals: number = 2): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(maxDecimals)}`;
}

export const RealTimePnLGraph: React.FC<RealTimePnLGraphProps> = ({
  holdings,
  summary,
  tokens,
  onOpenGlobalSwapSell,
  className = "",
}) => {
  // Navigation & View Controls
  const [timeframe, setTimeframe] = useState<PnLTimeframe>("24H");
  const [displayMode, setDisplayMode] = useState<PnLDisplayMode>("pnl-usd");
  const [selectedHoldingId, setSelectedHoldingId] = useState<string>("all");
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true);
  const [streamSpeedMs, setStreamSpeedMs] = useState<number>(2000);
  const [tickCount, setTickCount] = useState<number>(1);
  const [lastTickDelta, setLastTickDelta] = useState<number>(0);
  const [lastTickTimestamp, setLastTickTimestamp] = useState<number>(Date.now());
  const [latencyMs, setLatencyMs] = useState<number>(16);

  // Manual market condition impulse simulation
  const [marketImpulseMultiplier, setMarketImpulseMultiplier] = useState<number>(1.0);

  // Map each holding to its corresponding token record & baseline market cap
  const enrichedHoldings = useMemo(() => {
    return holdings.map((h) => {
      const matched = tokens.find(
        (t) =>
          t.contractAddress.toLowerCase() === h.contractAddress.toLowerCase() ||
          t.symbol.toLowerCase() === h.symbol.toLowerCase()
      );
      const baselineMarketCap = getBaselineMarketCap(h, matched);

      // Estimated cost basis: average entry point based on historical status
      let costMultiplier = 0.88; // by default entered at 12% profit
      if (h.isFoundryToken) costMultiplier = 0.55; // Foundry early creator reserve: entered much lower
      if (h.symbol.toUpperCase().includes("MAO")) costMultiplier = 0.75; // Founder VIP tier
      if (h.symbol === "USDC" || h.symbol === "USDT") costMultiplier = 0.999;

      const estimatedCostBasis = h.valueUsd * costMultiplier;
      const initialEntryMcap = baselineMarketCap * costMultiplier;

      return {
        ...h,
        matchedToken: matched,
        baselineMarketCap,
        estimatedCostBasis,
        initialEntryMcap,
        unrealizedPnl: h.valueUsd - estimatedCostBasis,
        unrealizedRoi: estimatedCostBasis > 0 ? ((h.valueUsd - estimatedCostBasis) / estimatedCostBasis) * 100 : 0,
      };
    });
  }, [holdings, tokens]);

  // Total current portfolio metrics
  const currentTotalCostBasis = useMemo(() => {
    return enrichedHoldings.reduce((sum, h) => sum + h.estimatedCostBasis, 0);
  }, [enrichedHoldings]);

  const currentTotalValue = useMemo(() => {
    return enrichedHoldings.reduce((sum, h) => sum + h.valueUsd, 0) * marketImpulseMultiplier;
  }, [enrichedHoldings, marketImpulseMultiplier]);

  const currentTotalPnl = currentTotalValue - currentTotalCostBasis;
  const currentTotalRoi = currentTotalCostBasis > 0 ? (currentTotalPnl / currentTotalCostBasis) * 100 : 0;

  // Generate historical curve data points based on mock market cap trajectories
  const baseHistoricalSeries = useMemo(() => {
    if (enrichedHoldings.length === 0) return [];

    let steps = 24;
    let stepDurationMs = 3600 * 1000; // 1 hour per step for 24H
    let formatLabel = (d: Date, idx: number, total: number) => {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    switch (timeframe) {
      case "1H":
        steps = 30;
        stepDurationMs = 2 * 60 * 1000; // 2 min per step
        formatLabel = (d) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        break;
      case "24H":
        steps = 24;
        stepDurationMs = 3600 * 1000;
        formatLabel = (d) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        break;
      case "7D":
        steps = 28;
        stepDurationMs = 6 * 3600 * 1000; // 6h per step
        formatLabel = (d) => `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:00`;
        break;
      case "30D":
        steps = 30;
        stepDurationMs = 24 * 3600 * 1000;
        formatLabel = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
        break;
      case "90D":
        steps = 30;
        stepDurationMs = 3 * 24 * 3600 * 1000;
        formatLabel = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
        break;
      case "1Y":
        steps = 36;
        stepDurationMs = 10 * 24 * 3600 * 1000;
        formatLabel = (d) => `${d.toLocaleDateString([], { month: "short", year: "2-digit" })}`;
        break;
      case "ALL":
        steps = 45;
        stepDurationMs = 15 * 24 * 3600 * 1000;
        formatLabel = (d) => `${d.toLocaleDateString([], { month: "short", year: "2-digit" })}`;
        break;
    }

    const now = Date.now();
    const result: HistoricalPoint[] = [];

    // Pre-calculate random walks for each holding based on its deterministic seed & security score
    const tokenWalks: Record<string, number[]> = {};
    enrichedHoldings.forEach((h) => {
      const seed = hashString(`${h.contractAddress}_${h.symbol}_${timeframe}`);
      let s = seed;
      const rng = () => {
        s = (s * 1664525 + 1013904223) % 4294967296;
        return s / 4294967296;
      };

      // Narrative bias & stability
      const isStable = h.symbol === "USDC" || h.symbol === "USDT";
      const vol = isStable ? 0.001 : 0.028;
      const bias = h.symbol.includes("MAO") ? 0.015 : h.isFoundryToken ? 0.012 : 0.006;

      const walk = new Array(steps);
      walk[steps - 1] = 1.0; // Current normalized anchor
      let currentNorm = 1.0;

      for (let i = steps - 2; i >= 0; i--) {
        const delta = (rng() - 0.49) * vol + bias;
        currentNorm = Math.max(0.2, currentNorm / (1 + delta));
        walk[i] = currentNorm;
      }
      tokenWalks[h.id] = walk;
    });

    for (let step = 0; step < steps; step++) {
      const timeOffsetMs = (steps - 1 - step) * stepDurationMs;
      const pointTime = now - timeOffsetMs;
      const dateObj = new Date(pointTime);
      const isLast = step === steps - 1;

      let totalVal = 0;
      let totalCost = 0;
      let mcapAgg = 0;
      const tokenVals: Record<string, number> = {};
      const tokenPnls: Record<string, number> = {};
      const tokenRois: Record<string, number> = {};
      const tokenMcaps: Record<string, number> = {};

      enrichedHoldings.forEach((h) => {
        const norm = isLast ? 1.0 : tokenWalks[h.id]?.[step] || 1.0;
        const valAtStep = h.valueUsd * norm;
        const mcapAtStep = h.baselineMarketCap * norm;
        const costBasis = h.estimatedCostBasis;
        const pnlAtStep = valAtStep - costBasis;
        const roiAtStep = costBasis > 0 ? (pnlAtStep / costBasis) * 100 : 0;

        tokenVals[h.id] = valAtStep;
        tokenPnls[h.id] = pnlAtStep;
        tokenRois[h.id] = roiAtStep;
        tokenMcaps[h.id] = mcapAtStep;

        totalVal += valAtStep;
        totalCost += costBasis;
        mcapAgg += mcapAtStep;
      });

      const totalPnl = totalVal - totalCost;
      const totalRoi = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

      result.push({
        timestamp: pointTime,
        timeLabel: isLast ? "Now" : formatLabel(dateObj, step, steps),
        totalPnlUsd: totalPnl,
        totalRoiPercent: totalRoi,
        totalValueUsd: totalVal,
        totalCostBasisUsd: totalCost,
        marketCapAggregate: mcapAgg,
        tokenValues: tokenVals,
        tokenPnls: tokenPnls,
        tokenRois: tokenRois,
        tokenMcaps: tokenMcaps,
      });
    }

    return result;
  }, [enrichedHoldings, timeframe]);

  // Live series containing micro real-time ticks
  const [liveSeries, setLiveSeries] = useState<HistoricalPoint[]>([]);

  // Synchronize when base historical series updates
  useEffect(() => {
    setLiveSeries(baseHistoricalSeries);
  }, [baseHistoricalSeries]);

  // Real-time tick engine simulating live market cap micro-ticks
  useEffect(() => {
    if (!isLiveStreaming || liveSeries.length === 0) return;

    const interval = setInterval(() => {
      const ping = Math.floor(12 + Math.random() * 8);
      setLatencyMs(ping);

      setLiveSeries((prev) => {
        if (prev.length === 0) return prev;
        const next = [...prev];
        const lastIdx = next.length - 1;
        const last = next[lastIdx];

        // Micro-tick random walk (between -0.25% and +0.32%)
        const microRate = (Math.random() - 0.485) * 0.006;
        const updatedTotalVal = Math.max(100, last.totalValueUsd * (1 + microRate));
        const updatedTotalPnl = updatedTotalVal - last.totalCostBasisUsd;
        const updatedTotalRoi =
          last.totalCostBasisUsd > 0 ? (updatedTotalPnl / last.totalCostBasisUsd) * 100 : 0;

        const deltaVal = updatedTotalVal - last.totalValueUsd;
        setLastTickDelta(deltaVal);
        setLastTickTimestamp(Date.now());
        setTickCount((c) => c + 1);

        const updatedTokenVals: Record<string, number> = { ...last.tokenValues };
        const updatedTokenPnls: Record<string, number> = { ...last.tokenPnls };
        const updatedTokenRois: Record<string, number> = { ...last.tokenRois };
        const updatedTokenMcaps: Record<string, number> = { ...last.tokenMcaps };

        enrichedHoldings.forEach((h) => {
          const oldVal = last.tokenValues[h.id] || h.valueUsd;
          const oldMcap = last.tokenMcaps[h.id] || h.baselineMarketCap;
          const tokenRate = microRate * (h.symbol.includes("MAO") ? 1.4 : 1.0);
          const newVal = Math.max(1, oldVal * (1 + tokenRate));
          const newMcap = Math.max(1000, oldMcap * (1 + tokenRate));
          const cost = h.estimatedCostBasis;

          updatedTokenVals[h.id] = newVal;
          updatedTokenPnls[h.id] = newVal - cost;
          updatedTokenRois[h.id] = cost > 0 ? ((newVal - cost) / cost) * 100 : 0;
          updatedTokenMcaps[h.id] = newMcap;
        });

        next[lastIdx] = {
          ...last,
          totalValueUsd: updatedTotalVal,
          totalPnlUsd: updatedTotalPnl,
          totalRoiPercent: updatedTotalRoi,
          marketCapAggregate: last.marketCapAggregate * (1 + microRate),
          tokenValues: updatedTokenVals,
          tokenPnls: updatedTokenPnls,
          tokenRois: updatedTokenRois,
          tokenMcaps: updatedTokenMcaps,
        };

        return next;
      });
    }, streamSpeedMs);

    return () => clearInterval(interval);
  }, [isLiveStreaming, streamSpeedMs, enrichedHoldings, liveSeries.length]);

  // Current real-time summary values from latest live tick
  const latestPoint = useMemo(() => {
    if (liveSeries.length === 0) return null;
    return liveSeries[liveSeries.length - 1];
  }, [liveSeries]);

  const activeHolding = useMemo(() => {
    if (selectedHoldingId === "all") return null;
    return enrichedHoldings.find((h) => h.id === selectedHoldingId) || null;
  }, [selectedHoldingId, enrichedHoldings]);

  // Formatted data points for Recharts
  const chartData = useMemo(() => {
    return liveSeries.map((p) => {
      let displayValue = 0;
      let displayPnl = 0;
      let displayRoi = 0;
      let displayMcap = p.marketCapAggregate;

      if (selectedHoldingId === "all") {
        displayValue = p.totalValueUsd;
        displayPnl = p.totalPnlUsd;
        displayRoi = p.totalRoiPercent;
        displayMcap = p.marketCapAggregate;
      } else {
        displayValue = p.tokenValues[selectedHoldingId] || 0;
        displayPnl = p.tokenPnls[selectedHoldingId] || 0;
        displayRoi = p.tokenRois[selectedHoldingId] || 0;
        displayMcap = p.tokenMcaps[selectedHoldingId] || 0;
      }

      // Add individual token values for comparison view
      const item: any = {
        timestamp: p.timestamp,
        timeLabel: p.timeLabel,
        value: Number(displayValue.toFixed(2)),
        pnl: Number(displayPnl.toFixed(2)),
        roi: Number(displayRoi.toFixed(2)),
        mcap: displayMcap,
      };

      // Add top 5 holdings ROI% for multi-token comparison
      enrichedHoldings.slice(0, 5).forEach((h) => {
        item[`roi_${h.symbol}`] = Number((p.tokenRois[h.id] || 0).toFixed(2));
        item[`mcap_${h.symbol}`] = p.tokenMcaps[h.id] || h.baselineMarketCap;
      });

      return item;
    });
  }, [liveSeries, selectedHoldingId, enrichedHoldings]);

  // Determine profit or loss state for colors & glowing gradient
  const currentPnlValue =
    selectedHoldingId === "all"
      ? latestPoint?.totalPnlUsd || 0
      : latestPoint?.tokenPnls[selectedHoldingId] || 0;

  const currentRoiValue =
    selectedHoldingId === "all"
      ? latestPoint?.totalRoiPercent || 0
      : latestPoint?.tokenRois[selectedHoldingId] || 0;

  const isNetPositive = currentPnlValue >= 0;
  const primaryStrokeColor = isNetPositive ? "#10B981" : "#EF4444";
  const primaryGradientId = isNetPositive ? "pnlGreenGradient" : "pnlRedGradient";

  // Best and worst performers in current portfolio
  const { bestPerformer, worstPerformer } = useMemo(() => {
    if (enrichedHoldings.length === 0) return { bestPerformer: null, worstPerformer: null };
    const sorted = [...enrichedHoldings].sort((a, b) => b.unrealizedRoi - a.unrealizedRoi);
    return {
      bestPerformer: sorted[0],
      worstPerformer: sorted[sorted.length - 1],
    };
  }, [enrichedHoldings]);

  // Market impulse handler for stress testing and bull/bear simulations
  const handleMarketImpulse = (multiplierDelta: number) => {
    setMarketImpulseMultiplier((prev) => Math.max(0.4, Math.min(3.0, prev + multiplierDelta)));
    setTickCount((c) => c + 1);
  };

  // Custom Recharts Tooltip
  const CustomPnLTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0]?.payload;
    if (!data) return null;

    return (
      <div className="bg-[#0e1017]/95 backdrop-blur-md border border-[#242a3d] p-3.5 rounded-xl shadow-2xl font-mono text-xs z-50 min-w-[240px]">
        <div className="flex items-center justify-between border-b border-[#1f2433] pb-2 mb-2">
          <span className="text-[#8E9299] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            {data.timeLabel}
          </span>
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#141722] text-[#8E9299]">
            {timeframe} Trajectory
          </span>
        </div>

        {displayMode === "comparison" ? (
          <div className="space-y-1.5">
            <div className="text-[11px] text-[#8E9299] font-semibold uppercase">Multi-Asset ROI %:</div>
            {enrichedHoldings.slice(0, 5).map((h) => {
              const val = data[`roi_${h.symbol}`];
              return (
                <div key={h.id} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: h.color || "#06B6D4" }} />
                    <span className="text-white font-medium">{h.symbol}</span>
                  </div>
                  <span className={`font-bold ${val >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {val >= 0 ? "+" : ""}{val}%
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[#8E9299]">Valuation:</span>
              <span className="font-bold text-white">${data.value?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#8E9299]">Net PnL ($):</span>
              <span className={`font-bold ${data.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {data.pnl >= 0 ? "+" : ""}${data.pnl?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#8E9299]">ROI Return:</span>
              <span className={`font-bold ${data.roi >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {data.roi >= 0 ? "+" : ""}{data.roi}%
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-[#1f2433] pt-1.5 text-[11px]">
              <span className="text-[#8E9299]">Mock Market Cap:</span>
              <span className="text-cyan-400 font-semibold">{formatCurrency(data.mcap)}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`bg-[#0e1017] border border-[#1f2433] rounded-2xl p-6 shadow-2xl relative overflow-hidden ${className}`}>
      {/* Background ambient lighting */}
      <div className={`absolute -top-24 -right-24 w-96 h-96 ${isNetPositive ? "bg-emerald-500/5" : "bg-rose-500/5"} rounded-full blur-3xl pointer-events-none transition-colors duration-500`} />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header and Live Status Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-[#1f2433] pb-5 relative z-10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isNetPositive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-mono text-white tracking-tight">
                  Real-Time Profit &amp; Loss (PnL)
                </h2>
                {/* Live Stream Blinking Badge */}
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-[#141722] border border-[#242a3d]">
                  <span className={`w-2 h-2 rounded-full ${isLiveStreaming ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                  <span className={isLiveStreaming ? "text-emerald-400 font-semibold" : "text-amber-400"}>
                    {isLiveStreaming ? "LIVE TICK FEED" : "PAUSED"}
                  </span>
                  <span className="text-[#8E9299]">({latencyMs}ms)</span>
                </div>
              </div>
              <p className="text-xs text-[#8E9299] font-mono mt-0.5">
                Dynamic valuation &amp; performance calculated from mock market cap history &amp; real-time on-chain pricing
              </p>
            </div>
          </div>
        </div>

        {/* Real-Time Live Ticker Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Pause / Resume Live Stream */}
          <button
            type="button"
            onClick={() => setIsLiveStreaming(!isLiveStreaming)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-semibold transition-all cursor-pointer ${
              isLiveStreaming
                ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20"
                : "bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20"
            }`}
            title={isLiveStreaming ? "Pause real-time market ticks" : "Resume real-time market ticks"}
          >
            {isLiveStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isLiveStreaming ? "Streaming" : "Resume"}</span>
          </button>

          {/* Speed Selector */}
          <div className="flex items-center bg-[#141722] border border-[#242a3d] rounded-xl p-0.5 font-mono text-xs">
            <button
              type="button"
              onClick={() => setStreamSpeedMs(1000)}
              className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${streamSpeedMs === 1000 ? "bg-cyan-500/20 text-cyan-300 font-bold" : "text-[#8E9299] hover:text-white"}`}
              title="1 second tick speed"
            >
              1s
            </button>
            <button
              type="button"
              onClick={() => setStreamSpeedMs(2000)}
              className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${streamSpeedMs === 2000 ? "bg-cyan-500/20 text-cyan-300 font-bold" : "text-[#8E9299] hover:text-white"}`}
              title="2 seconds tick speed (balanced)"
            >
              2s
            </button>
            <button
              type="button"
              onClick={() => setStreamSpeedMs(5000)}
              className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${streamSpeedMs === 5000 ? "bg-cyan-500/20 text-cyan-300 font-bold" : "text-[#8E9299] hover:text-white"}`}
              title="5 seconds tick speed (relaxed)"
            >
              5s
            </button>
          </div>

          {/* Quick Impulse Simulations */}
          <div className="hidden sm:flex items-center gap-1 bg-[#141722] border border-[#242a3d] p-0.5 rounded-xl font-mono text-xs">
            <button
              type="button"
              onClick={() => handleMarketImpulse(0.025)}
              className="px-2 py-1 rounded-lg text-emerald-400 hover:bg-emerald-500/10 cursor-pointer transition-colors"
              title="Simulate +2.5% market cap rally across all tokens"
            >
              +2.5% Bull
            </button>
            <button
              type="button"
              onClick={() => handleMarketImpulse(-0.02)}
              className="px-2 py-1 rounded-lg text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
              title="Simulate -2.0% market cap correction"
            >
              -2.0% Bear
            </button>
            {marketImpulseMultiplier !== 1.0 && (
              <button
                type="button"
                onClick={() => setMarketImpulseMultiplier(1.0)}
                className="px-2 py-1 rounded-lg text-cyan-400 hover:bg-cyan-500/10 cursor-pointer transition-colors"
                title="Reset simulation multiplier to neutral"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Top Metrics Executive Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-5">
        {/* Net Unrealized PnL */}
        <div className="bg-[#141722]/80 border border-[#242a3d] rounded-xl p-3.5 relative overflow-hidden">
          <div className="text-[11px] font-mono text-[#8E9299] flex items-center justify-between">
            <span>UNREALIZED PnL</span>
            {isNetPositive ? (
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div className={`text-xl sm:text-2xl font-bold font-mono mt-1 ${isNetPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {isNetPositive ? "+" : ""}${Math.abs(currentPnlValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-1.5 mt-1 font-mono text-xs">
            <span className={`font-semibold ${isNetPositive ? "text-emerald-400" : "text-rose-400"}`}>
              {isNetPositive ? "+" : ""}{currentRoiValue.toFixed(2)}% ROI
            </span>
            {lastTickDelta !== 0 && (
              <span className={`text-[10px] px-1 rounded ${lastTickDelta > 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>
                {lastTickDelta > 0 ? "+" : ""}${lastTickDelta.toFixed(2)} tick
              </span>
            )}
          </div>
        </div>

        {/* Current Valuation vs Cost Basis */}
        <div className="bg-[#141722]/80 border border-[#242a3d] rounded-xl p-3.5">
          <div className="text-[11px] font-mono text-[#8E9299] flex items-center justify-between">
            <span>VALUATION / COST BASIS</span>
            <DollarSign className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
            ${(selectedHoldingId === "all" ? (latestPoint?.totalValueUsd || currentTotalValue) : (latestPoint?.tokenValues[selectedHoldingId] || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-[#8E9299] font-mono mt-1">
            Basis: ${(selectedHoldingId === "all" ? currentTotalCostBasis : (activeHolding?.estimatedCostBasis || 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Aggregate Mock Market Cap */}
        <div className="bg-[#141722]/80 border border-[#242a3d] rounded-xl p-3.5">
          <div className="text-[11px] font-mono text-[#8E9299] flex items-center justify-between">
            <span>MOCK MARKET CAP</span>
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-orange-400 mt-1 truncate">
            {formatCurrency(selectedHoldingId === "all" ? (latestPoint?.marketCapAggregate || 0) : (latestPoint?.tokenMcaps[selectedHoldingId] || activeHolding?.baselineMarketCap || 0))}
          </div>
          <div className="text-xs text-[#8E9299] font-mono mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            <span>2026 Macro Trajectory</span>
          </div>
        </div>

        {/* Best Performer */}
        <div className="bg-[#141722]/80 border border-[#242a3d] rounded-xl p-3.5">
          <div className="text-[11px] font-mono text-[#8E9299] flex items-center justify-between">
            <span>TOP ASSET RETURN</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1 truncate">
            {bestPerformer ? `${bestPerformer.symbol}` : "None"}
          </div>
          <div className="text-xs text-emerald-400 font-mono mt-1 flex items-center gap-1 font-semibold">
            <span>+{bestPerformer?.unrealizedRoi.toFixed(1)}% ROI</span>
            <span className="text-[#8E9299] font-normal">(${bestPerformer?.unrealizedPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })} gain)</span>
          </div>
        </div>
      </div>

      {/* Chart Filter Bar: Token Selector + Mode + Timeframes */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-5 pt-3 border-t border-[#1f2433]">
        {/* Token Selector & Display Mode */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Token Focus Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#141722] border border-[#242a3d] px-3 py-1.5 rounded-xl font-mono text-xs">
            <span className="text-[#8E9299]">Focus:</span>
            <select
              value={selectedHoldingId}
              onChange={(e) => setSelectedHoldingId(e.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#0e1017] text-white">
                All Tokens (Combined Portfolio)
              </option>
              {enrichedHoldings.map((h) => (
                <option key={h.id} value={h.id} className="bg-[#0e1017] text-white">
                  {h.symbol} — {h.name} ({formatCurrency(h.baselineMarketCap)})
                </option>
              ))}
            </select>
          </div>

          {/* Display Mode Pills */}
          <div className="flex items-center bg-[#141722] border border-[#242a3d] p-0.5 rounded-xl font-mono text-xs">
            <button
              type="button"
              onClick={() => setDisplayMode("pnl-usd")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                displayMode === "pnl-usd"
                  ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              PnL ($)
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode("roi-percent")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                displayMode === "roi-percent"
                  ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              ROI (%)
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode("total-value")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                displayMode === "total-value"
                  ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              Valuation
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode("comparison")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                displayMode === "comparison"
                  ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              Multi-Asset
            </button>
          </div>
        </div>

        {/* Timeframe Buttons */}
        <div className="flex items-center bg-[#141722] border border-[#242a3d] p-0.5 rounded-xl font-mono text-xs self-start sm:self-auto overflow-x-auto">
          {(["1H", "24H", "7D", "30D", "90D", "1Y", "ALL"] as PnLTimeframe[]).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                timeframe === tf
                  ? "bg-cyan-500 text-black font-bold shadow-sm"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Main Interactive Recharts PnL Area Chart */}
      <div className="w-full h-80 mt-4 relative">
        <ResponsiveContainer width="100%" height="100%">
          {displayMode === "comparison" ? (
            <LineChart data={chartData} margin={{ top: 12, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2433" vertical={false} />
              <XAxis dataKey="timeLabel" stroke="#475569" tick={{ fill: "#8E9299", fontSize: 10 }} />
              <YAxis
                stroke="#475569"
                tick={{ fill: "#8E9299", fontSize: 10 }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<CustomPnLTooltip />} />
              <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 4" />
              <Legend
                wrapperStyle={{ fontSize: 11, fontFamily: "monospace", paddingTop: 8 }}
                iconType="circle"
              />
              {enrichedHoldings.slice(0, 5).map((h) => (
                <Line
                  key={h.id}
                  type="monotone"
                  dataKey={`roi_${h.symbol}`}
                  name={`${h.symbol} ROI%`}
                  stroke={h.color || "#06B6D4"}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, fill: h.color || "#06B6D4" }}
                />
              ))}
            </LineChart>
          ) : (
            <AreaChart
              data={chartData}
              margin={{ top: 12, right: 12, left: -10, bottom: 0 }}
            >
              <defs>
                {/* Emerald Gradient for Profit */}
                <linearGradient id="pnlGreenGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                  <stop offset="60%" stopColor="#10B981" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
                {/* Rose Gradient for Loss */}
                <linearGradient id="pnlRedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={0.35} />
                  <stop offset="60%" stopColor="#EF4444" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0.0} />
                </linearGradient>
                {/* Cyan Gradient for Valuation */}
                <linearGradient id="pnlCyanGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.35} />
                  <stop offset="60%" stopColor="#06B6D4" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#1f2433" vertical={false} />
              <XAxis dataKey="timeLabel" stroke="#475569" tick={{ fill: "#8E9299", fontSize: 10 }} />
              <YAxis
                stroke="#475569"
                tick={{ fill: "#8E9299", fontSize: 10 }}
                tickFormatter={(v) => {
                  if (displayMode === "roi-percent") return `${v}%`;
                  return formatCurrency(v, 0);
                }}
              />
              <Tooltip content={<CustomPnLTooltip />} />
              {displayMode !== "total-value" && (
                <ReferenceLine
                  y={0}
                  stroke="#475569"
                  strokeDasharray="4 4"
                  label={{
                    value: "Cost Basis Break-Even",
                    fill: "#64748B",
                    fontSize: 10,
                    position: "insideBottomLeft",
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey={displayMode === "roi-percent" ? "roi" : displayMode === "total-value" ? "value" : "pnl"}
                stroke={displayMode === "total-value" ? "#06B6D4" : primaryStrokeColor}
                strokeWidth={2.5}
                fill={
                  displayMode === "total-value"
                    ? "url(#pnlCyanGradient)"
                    : isNetPositive
                    ? "url(#pnlGreenGradient)"
                    : "url(#pnlRedGradient)"
                }
                activeDot={{
                  r: 6,
                  fill: displayMode === "total-value" ? "#06B6D4" : primaryStrokeColor,
                  stroke: "#0e1017",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Performance Summary of Tokens Based on Mock Market Cap History */}
      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-[#8E9299]">
          <span className="font-semibold text-white flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            Tokens Performance &amp; Mock Market Cap Trajectory
          </span>
          <span className="text-[11px]">
            {enrichedHoldings.length} Assets Tracked • Real-Time Engine Active
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#1f2433] bg-[#141722]/50">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1f2433] bg-[#141722] text-[#8E9299]">
                <th className="py-2.5 px-3">TOKEN</th>
                <th className="py-2.5 px-3">MOCK MARKET CAP</th>
                <th className="py-2.5 px-3">HOLDING VALUE</th>
                <th className="py-2.5 px-3">EST. COST BASIS</th>
                <th className="py-2.5 px-3">UNREALIZED PnL</th>
                <th className="py-2.5 px-3">RETURN (ROI)</th>
                <th className="py-2.5 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2433]">
              {enrichedHoldings.map((h) => {
                const isSelected = selectedHoldingId === h.id;
                const isPositive = h.unrealizedPnl >= 0;
                return (
                  <tr
                    key={h.id}
                    onClick={() => setSelectedHoldingId(isSelected ? "all" : h.id)}
                    className={`hover:bg-[#141722] transition-colors cursor-pointer ${
                      isSelected ? "bg-cyan-500/10 border-l-2 border-cyan-400" : ""
                    }`}
                  >
                    {/* Token Info */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: h.color || "#06B6D4" }}
                        />
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{h.symbol}</span>
                            {h.isFoundryToken && (
                              <span className="px-1 py-0.2 rounded text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                Foundry
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#8E9299] truncate max-w-[120px]">
                            {h.name}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Mock Market Cap */}
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-white">
                        {formatCurrency(h.baselineMarketCap)}
                      </div>
                      <div className="text-[10px] text-[#8E9299]">
                        @ ${h.priceUsd.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </div>
                    </td>

                    {/* Holding Value */}
                    <td className="py-2.5 px-3 font-semibold text-white">
                      ${h.valueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Cost Basis */}
                    <td className="py-2.5 px-3 text-[#8E9299]">
                      ${h.estimatedCostBasis.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Unrealized PnL */}
                    <td className="py-2.5 px-3">
                      <span className={`font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                        {isPositive ? "+" : ""}${h.unrealizedPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* ROI */}
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        isPositive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}>
                        {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {isPositive ? "+" : ""}{h.unrealizedRoi.toFixed(2)}%
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedHoldingId(isSelected ? "all" : h.id);
                          }}
                          className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-colors ${
                            isSelected ? "bg-cyan-500 text-black font-bold" : "bg-[#141722] hover:bg-[#1a1e2c] text-[#8E9299] hover:text-white"
                          }`}
                        >
                          {isSelected ? "Active" : "Chart"}
                        </button>

                        {onOpenGlobalSwapSell && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenGlobalSwapSell(h, "swap");
                            }}
                            className="p-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors"
                            title={`Swap / Trade ${h.symbol}`}
                          >
                            <ArrowDownUp className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
