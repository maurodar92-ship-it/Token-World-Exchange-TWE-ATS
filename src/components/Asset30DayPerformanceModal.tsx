import React, { useState, useMemo, useEffect, useRef } from "react";
import * as d3 from "d3";
import {
  X,
  Maximize2,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Flame,
  Zap,
  DollarSign,
  Calendar,
  Clock,
  Layers,
  ArrowDownUp,
  Eye,
  Send,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Gauge,
  Sliders,
  BarChart3,
  Scale,
} from "lucide-react";
import { PortfolioTokenHolding } from "../utils/walletPortfolioService";
import { TokenRecord } from "../types";
import { DepthOfMarketVisualizer } from "./DepthOfMarketVisualizer";
import { SlippageSensitivitySimulator } from "./SlippageSensitivitySimulator";

export interface Asset30DayPerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  holding: PortfolioTokenHolding | null;
  token?: TokenRecord;
  initialTab?: "performance" | "dom" | "slippage";
  onOpenGlobalSwapSell?: (token?: any, mode?: "swap" | "sell") => void;
  onWatchToken?: (h: PortfolioTokenHolding) => void;
  onSendToken?: (h: PortfolioTokenHolding) => void;
}

export interface DayPerformanceRecord {
  dayIndex: number; // -30 to 0
  date: Date;
  dateFormatted: string;
  dayLabel: string;
  marketCap: number;
  tokenPrice: number;
  positionValue: number;
  costBasis: number;
  pnlUsd: number;
  pnlPercent: number;
  dailyReturnPercent: number;
  zScore: number;
  volatilityBand: "low" | "moderate" | "high" | "extreme";
  isSpike: boolean;
  volume24hUsd: number;
  rsi14: number; // 14-day Relative Strength Index (0 to 100)
  rsiCondition: "overbought" | "neutral" | "oversold";
  rsiMomentum: "bullish" | "bearish" | "neutral";
  rsiSignal: "BUY" | "SELL" | "HOLD";
  rsiSignalLabel: string;
  isBuySignal: boolean; // rsi14 <= 30
  isSellSignal: boolean; // rsi14 >= 70
  isDeepOversold: boolean; // rsi14 < 20 (Intense buy zone)
  isDeepOverbought: boolean; // rsi14 > 80 (Intense sell zone)
  isRsiLocalPeak?: boolean; // Historical local maxima
  isRsiLocalTrough?: boolean; // Historical local minima
  rsiExtremumType?: "maxima" | "minima";
  rsiExtremumLabel?: string;
}

export interface RsiSignalIntensity {
  isSignal: boolean;
  isBuy: boolean;
  isSell: boolean;
  isExtreme: boolean; // >80 or <20
  pulseClass: string; // "animate-rsi-buy-intense" | "animate-rsi-buy-subtle" | "animate-rsi-sell-intense" | "animate-rsi-sell-subtle" | ""
  badgeBorderClass: string;
  badgeBgClass: string;
  badgeTextClass: string;
  badgeFullClass: string;
  badgeText: string;
  zoneLabel: string;
  statusLabel: string;
}

export function getRsiSignalIntensity(rsi: number): RsiSignalIntensity {
  if (rsi < 20) {
    return {
      isSignal: true,
      isBuy: true,
      isSell: false,
      isExtreme: true,
      pulseClass: "animate-rsi-buy-intense",
      badgeBorderClass: "border-emerald-400",
      badgeBgClass: "bg-emerald-500/30",
      badgeTextClass: "text-emerald-100",
      badgeFullClass: "animate-rsi-buy-intense bg-emerald-500/30 text-emerald-100 border-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.6)] font-bold",
      badgeText: "STRONG BUY (<20)",
      zoneLabel: "Deep Oversold Zone (<20)",
      statusLabel: "Intense Oversold (<20) • Strong Buy Signal",
    };
  } else if (rsi <= 30) {
    return {
      isSignal: true,
      isBuy: true,
      isSell: false,
      isExtreme: false,
      pulseClass: "animate-rsi-buy-subtle",
      badgeBorderClass: "border-emerald-500/50",
      badgeBgClass: "bg-emerald-500/20",
      badgeTextClass: "text-emerald-300",
      badgeFullClass: "animate-rsi-buy-subtle bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.3)] font-semibold",
      badgeText: "BUY ZONE (≤30)",
      zoneLabel: "Oversold Zone (≤30)",
      statusLabel: "Oversold (≤30) • Accumulate / Buy Signal",
    };
  } else if (rsi > 80) {
    return {
      isSignal: true,
      isBuy: false,
      isSell: true,
      isExtreme: true,
      pulseClass: "animate-rsi-sell-intense",
      badgeBorderClass: "border-rose-400",
      badgeBgClass: "bg-rose-500/30",
      badgeTextClass: "text-rose-100",
      badgeFullClass: "animate-rsi-sell-intense bg-rose-500/30 text-rose-100 border-rose-400 shadow-[0_0_16px_rgba(244,63,94,0.6)] font-bold",
      badgeText: "STRONG SELL (>80)",
      zoneLabel: "Deep Overbought Zone (>80)",
      statusLabel: "Intense Overbought (>80) • Strong Take Profit",
    };
  } else if (rsi >= 70) {
    return {
      isSignal: true,
      isBuy: false,
      isSell: true,
      isExtreme: false,
      pulseClass: "animate-rsi-sell-subtle",
      badgeBorderClass: "border-rose-500/50",
      badgeBgClass: "bg-rose-500/20",
      badgeTextClass: "text-rose-300",
      badgeFullClass: "animate-rsi-sell-subtle bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.3)] font-semibold",
      badgeText: "SELL ZONE (≥70)",
      zoneLabel: "Overbought Zone (≥70)",
      statusLabel: "Overbought (≥70) • Take Profit / Sell Signal",
    };
  } else {
    return {
      isSignal: false,
      isBuy: false,
      isSell: false,
      isExtreme: false,
      pulseClass: "",
      badgeBorderClass: "border-[#242a3d]",
      badgeBgClass: "bg-[#0e1017]",
      badgeTextClass: "text-[#8E9299]",
      badgeFullClass: "bg-[#0e1017] text-[#8E9299] border-[#242a3d]",
      badgeText: "HOLD / NEUTRAL",
      zoneLabel: "Neutral Range (30-70)",
      statusLabel: rsi >= 50 ? "Bullish (>50) • Range Bound" : "Bearish (<50) • Range Bound",
    };
  }
}

export interface RsiExtremumPoint {
  index: number;
  dayIndex: number;
  rsi: number;
  dateStr: string;
  type: "maxima" | "minima";
  label: string;
  isHigherThanPrev?: boolean;
}

export interface RsiTrendAnalysis {
  maxima: RsiExtremumPoint[];
  minima: RsiExtremumPoint[];
  maximaSlope: number; // RSI change per day
  minimaSlope: number; // RSI change per day
  projectedCurrentResistance: number;
  projectedCurrentSupport: number;
  patternType:
    | "ascending_channel"
    | "descending_channel"
    | "converging_wedge"
    | "broadening_wedge"
    | "ascending_triangle"
    | "descending_triangle"
    | "horizontal_range";
  patternLabel: string;
  patternDescription: string;
  patternEmoji: string;
  divergenceStatus: "bullish_expansion" | "bearish_exhaustion" | "compression" | "widening_volatility" | "range_bound";
}

// Deterministic 32-bit hash helper
function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function formatCurrency(val: number, maxDecimals: number = 2): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(maxDecimals)}`;
}

export const Asset30DayPerformanceModal: React.FC<Asset30DayPerformanceModalProps> = ({
  isOpen,
  onClose,
  holding,
  token,
  initialTab,
  onOpenGlobalSwapSell,
  onWatchToken,
  onSendToken,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const rsiSvgRef = useRef<SVGSVGElement>(null);
  const [chartWidth, setChartWidth] = useState<number>(800);
  const [chartHeight] = useState<number>(230);
  const [rsiHeight] = useState<number>(105);

  // Tab mode: "performance" (30D charts & ledger) vs "dom" (Depth of Market) vs "slippage" (Slippage Simulator)
  const [modalMainTab, setModalMainTab] = useState<"performance" | "dom" | "slippage">(initialTab || "performance");
  const [showInlineDom, setShowInlineDom] = useState<boolean>(true);
  const [showSlippageSim, setShowSlippageSim] = useState<boolean>(true);

  // Sync initialTab when modal opens
  useEffect(() => {
    if (isOpen && initialTab) {
      setModalMainTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Selected interactive data point (defaults to Today / Day 0)
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [hoveredPoint, setHoveredPoint] = useState<DayPerformanceRecord | null>(null);
  const [copiedContract, setCopiedContract] = useState<boolean>(false);
  const [activeMetricView, setActiveMetricView] = useState<"pnl" | "mcap" | "price" | "volatility" | "rsi">("pnl");
  const [showRsiOscillator, setShowRsiOscillator] = useState<boolean>(true);
  const [showRsiTrendLines, setShowRsiTrendLines] = useState<boolean>(true);
  const [rsiTrendLineMode, setRsiTrendLineMode] = useState<"both" | "maxima" | "minima">("both");
  const [tableFilter, setTableFilter] = useState<"all" | "buy" | "sell" | "spikes" | "peaks" | "troughs">("all");

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Handle dynamic resize of D3 chart container
  useEffect(() => {
    if (!isOpen || !chartContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const w = entries[0].contentRect.width;
      if (w > 200) setChartWidth(Math.floor(w));
    });
    observer.observe(chartContainerRef.current);
    return () => observer.disconnect();
  }, [isOpen]);

  // Generate 46 total simulation days (Day -45 to Day 0) to compute true Wilder's 14-day RSI
  const {
    dataset,
    baselineMarketCap,
    minMcap,
    maxMcap,
    total30dPnl,
    total30dRoi,
    is30dPositive,
    totalSpikesCount,
    maxZScore,
    avgReturnPercent,
    currentRsi,
    currentRsiCondition,
    currentRsiSignal,
    currentRsiSignalLabel,
    buySignalsCount,
    sellSignalsCount,
    deepBuySignalsCount,
    deepSellSignalsCount,
    localMaxima,
    localMinima,
    rsiTrendAnalysis,
  } = useMemo(() => {
    if (!holding) {
      return {
        dataset: [],
        baselineMarketCap: 0,
        minMcap: 0,
        maxMcap: 0,
        total30dPnl: 0,
        total30dRoi: 0,
        is30dPositive: true,
        totalSpikesCount: 0,
        maxZScore: 0,
        avgReturnPercent: 0,
        currentRsi: 50,
        currentRsiCondition: "neutral" as const,
        currentRsiSignal: "HOLD" as const,
        currentRsiSignalLabel: "Neutral Hold (30-70)",
        buySignalsCount: 0,
        sellSignalsCount: 0,
        deepBuySignalsCount: 0,
        deepSellSignalsCount: 0,
        localMaxima: [] as RsiExtremumPoint[],
        localMinima: [] as RsiExtremumPoint[],
        rsiTrendAnalysis: {
          maxima: [],
          minima: [],
          maximaSlope: 0,
          minimaSlope: 0,
          projectedCurrentResistance: 70,
          projectedCurrentSupport: 30,
          patternType: "horizontal_range" as const,
          patternLabel: "Horizontal Range",
          patternDescription: "Neutral momentum consolidation.",
          patternEmoji: "↔️",
          divergenceStatus: "range_bound" as const,
        },
      };
    }

    // 1. Determine baseline mock market cap
    let baseMcap = 0;
    if (token?.marketCap && token.marketCap > 0) {
      baseMcap = token.marketCap;
    } else {
      const sym = holding.symbol.toUpperCase();
      if (sym.includes("MAO")) baseMcap = 3_000_000_000_000;
      else if (sym === "ETH" || sym === "WETH") baseMcap = 412_500_000_000;
      else if (sym === "BTC" || sym === "WBTC") baseMcap = 1_865_000_000_000;
      else if (sym === "USDC") baseMcap = 34_800_000_000;
      else if (sym === "USDT") baseMcap = 118_400_000_000;
      else if (sym === "LINK") baseMcap = 10_900_000_000;
      else if (sym === "UNI") baseMcap = 6_150_000_000;
      else if (sym === "AAVE") baseMcap = 3_100_000_000;
      else if (sym === "ARB") baseMcap = 2_950_000_000;
      else if (sym === "OP") baseMcap = 2_200_000_000;
      else if (sym === "AERO") baseMcap = 780_000_000;
      else if (holding.isFoundryToken) {
        baseMcap = 150_000_000 + (hashString(holding.contractAddress) % 850_000_000);
      } else {
        baseMcap = Math.max(25_000_000, holding.valueUsd * 2000);
      }
    }

    // 2. Deterministic pseudo-random generation across 46 days (15 extra days for 14D RSI lookback)
    const seed = hashString(`${holding.contractAddress}_${holding.symbol}_30d_breakdown`);
    let s = seed;
    const rng = () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };

    const isStable = holding.symbol === "USDC" || holding.symbol === "USDT";
    const baseVol = isStable ? 0.0006 : 0.028;
    let bias = 0.005;
    if (token?.launchStatus === "Audited" || token?.launchStatus === "Rug-Proof Vault") bias = 0.012;
    else if (token?.launchStatus === "Paused") bias = -0.015;
    else if (holding.symbol.includes("MAO")) bias = 0.018;

    const totalSimDays = 46;
    const rawPoints: { day: number; mcap: number; date: Date }[] = new Array(totalSimDays);
    const now = Date.now();

    rawPoints[totalSimDays - 1] = {
      day: 0,
      mcap: baseMcap,
      date: new Date(now),
    };

    let cur = baseMcap;
    for (let i = totalSimDays - 2; i >= 0; i--) {
      const dayOffset = -(totalSimDays - 1 - i);
      const shock = rng() > 0.78 ? (rng() - 0.45) * 3.0 : 1.0;
      const rate = ((rng() - 0.48) * baseVol * 2 + bias) * shock;
      cur = Math.max(10_000, cur / (1 + rate));
      rawPoints[i] = {
        day: dayOffset,
        mcap: cur,
        date: new Date(now + dayOffset * 24 * 3600 * 1000),
      };
    }

    // 3. Compute daily market cap deltas for 14-period RSI
    const deltas: number[] = [];
    for (let i = 1; i < rawPoints.length; i++) {
      deltas.push(rawPoints[i].mcap - rawPoints[i - 1].mcap);
    }

    // 4. Calculate Wilder's Smoothed 14-period RSI
    const rsiValues: number[] = new Array(rawPoints.length).fill(50);
    let initialGains = 0;
    let initialLosses = 0;
    for (let i = 0; i < 14; i++) {
      const diff = deltas[i];
      if (diff > 0) initialGains += diff;
      else initialLosses += Math.abs(diff);
    }
    let avgGain = initialGains / 14;
    let avgLoss = initialLosses / 14;

    let firstRs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsiValues[14] = Math.min(100, Math.max(0, avgLoss === 0 ? 100 : 100 - 100 / (1 + firstRs)));

    for (let i = 14; i < deltas.length; i++) {
      const diff = deltas[i];
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? Math.abs(diff) : 0;
      avgGain = (avgGain * 13 + gain) / 14;
      avgLoss = (avgLoss * 13 + loss) / 14;
      if (avgLoss === 0) {
        rsiValues[i + 1] = 100;
      } else {
        const rs = avgGain / avgLoss;
        rsiValues[i + 1] = Math.min(100, Math.max(0, 100 - 100 / (1 + rs)));
      }
    }

    // 5. Slice to the 31-day display window (Day -30 to Day 0)
    const displayWindow = rawPoints.slice(totalSimDays - 31);
    const displayRsi = rsiValues.slice(totalSimDays - 31);

    // Compute rates of return across the 31 display days
    const returnRates: number[] = [];
    for (let i = 0; i < displayWindow.length; i++) {
      if (i === 0) {
        returnRates.push((displayWindow[1].mcap - displayWindow[0].mcap) / displayWindow[0].mcap);
      } else {
        returnRates.push((displayWindow[i].mcap - displayWindow[i - 1].mcap) / displayWindow[i - 1].mcap);
      }
    }

    const absReturns = returnRates.map((r) => Math.abs(r));
    const meanReturn = d3.mean(absReturns) || 0.01;
    const stdDev = d3.deviation(absReturns) || 0.015;

    // Cost basis benchmark (Day -30)
    const day30Mcap = displayWindow[0].mcap;
    const currentPrice = holding.priceUsd;
    const balance = holding.balance;
    const entryPrice = currentPrice * (day30Mcap / baseMcap);
    const costBasis = balance * entryPrice;

    let spikes = 0;
    let peakZ = 0;

    const computedDataset: DayPerformanceRecord[] = displayWindow.map((p, idx) => {
      const stepPrice = currentPrice * (p.mcap / baseMcap);
      const positionValue = balance * stepPrice;
      const pnlUsd = positionValue - costBasis;
      const pnlPercent = costBasis > 0 ? (pnlUsd / costBasis) * 100 : 0;

      const ret = returnRates[idx];
      const zScore = Math.max(0.1, Number((Math.abs(ret) / (stdDev || 0.01)).toFixed(2)));
      if (zScore > peakZ) peakZ = zScore;

      let volatilityBand: "low" | "moderate" | "high" | "extreme" = "low";
      if (zScore >= 2.5) volatilityBand = "extreme";
      else if (zScore >= 1.8) volatilityBand = "high";
      else if (zScore >= 1.2) volatilityBand = "moderate";

      const isSpike = zScore >= 1.8;
      if (isSpike) spikes++;

      const volumeMultiplier = 0.012 + rng() * 0.035;
      const vol24h = p.mcap * volumeMultiplier;

      const rsiVal = Number(displayRsi[idx].toFixed(1));
      let rsiCondition: "overbought" | "neutral" | "oversold" = "neutral";
      let rsiSignal: "BUY" | "SELL" | "HOLD" = "HOLD";
      let rsiSignalLabel = "Neutral Hold (30-70)";
      const isBuySignal = rsiVal <= 30;
      const isSellSignal = rsiVal >= 70;
      const isDeepOversold = rsiVal < 20;
      const isDeepOverbought = rsiVal > 80;

      if (isDeepOverbought) {
        rsiCondition = "overbought";
        rsiSignal = "SELL";
        rsiSignalLabel = "Strong Sell (Extreme Overbought > 80)";
      } else if (isSellSignal) {
        rsiCondition = "overbought";
        rsiSignal = "SELL";
        rsiSignalLabel = "Sell Signal (Overbought ≥ 70)";
      } else if (isDeepOversold) {
        rsiCondition = "oversold";
        rsiSignal = "BUY";
        rsiSignalLabel = "Strong Buy (Extreme Oversold < 20)";
      } else if (isBuySignal) {
        rsiCondition = "oversold";
        rsiSignal = "BUY";
        rsiSignalLabel = "Buy Signal (Oversold ≤ 30)";
      }

      let rsiMomentum: "bullish" | "bearish" | "neutral" = "neutral";
      if (rsiVal >= 55) rsiMomentum = "bullish";
      else if (rsiVal <= 45) rsiMomentum = "bearish";

      return {
        dayIndex: p.day,
        date: p.date,
        dateFormatted: p.date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }),
        dayLabel: p.day === 0 ? "Today (Now)" : `${Math.abs(p.day)} days ago`,
        marketCap: p.mcap,
        tokenPrice: stepPrice,
        positionValue,
        costBasis,
        pnlUsd,
        pnlPercent,
        dailyReturnPercent: ret * 100,
        zScore,
        volatilityBand,
        isSpike,
        volume24hUsd: vol24h,
        rsi14: rsiVal,
        rsiCondition,
        rsiMomentum,
        rsiSignal,
        rsiSignalLabel,
        isBuySignal,
        isSellSignal,
        isDeepOversold,
        isDeepOverbought,
      };
    });

    const mcaps = computedDataset.map((d) => d.marketCap);
    const minM = Math.min(...mcaps);
    const maxM = Math.max(...mcaps);

    const initialRecord = computedDataset[0];
    const latestRecord = computedDataset[computedDataset.length - 1];
    const netPnl = latestRecord.positionValue - initialRecord.positionValue;
    const netRoi = initialRecord.positionValue > 0 ? (netPnl / initialRecord.positionValue) * 100 : 0;

    const buyCount = computedDataset.filter((d) => d.isBuySignal).length;
    const sellCount = computedDataset.filter((d) => d.isSellSignal).length;
    const deepBuyCount = computedDataset.filter((d) => d.isDeepOversold).length;
    const deepSellCount = computedDataset.filter((d) => d.isDeepOverbought).length;

    // 6. Detect Historical RSI Local Minima and Maxima (Swing Points)
    const localMaxima: RsiExtremumPoint[] = [];
    const localMinima: RsiExtremumPoint[] = [];

    for (let i = 0; i < computedDataset.length; i++) {
      const cur = computedDataset[i].rsi14;
      const prev = i > 0 ? computedDataset[i - 1].rsi14 : null;
      const next = i < computedDataset.length - 1 ? computedDataset[i + 1].rsi14 : null;

      // Local Maximum (Peak)
      const isPeak =
        prev !== null &&
        next !== null &&
        ((cur > prev && cur >= next) || (cur >= prev && cur > next));

      // Local Minimum (Trough)
      const isTrough =
        prev !== null &&
        next !== null &&
        ((cur < prev && cur <= next) || (cur <= prev && cur < next));

      if (isPeak) {
        const prevPeak = localMaxima[localMaxima.length - 1];
        const isHigherThanPrev = prevPeak ? cur > prevPeak.rsi : undefined;
        localMaxima.push({
          index: i,
          dayIndex: computedDataset[i].dayIndex,
          rsi: cur,
          dateStr: computedDataset[i].dateFormatted,
          type: "maxima",
          label: isHigherThanPrev === true ? "Higher High (HH)" : isHigherThanPrev === false ? "Lower High (LH)" : "Peak High",
          isHigherThanPrev,
        });
        computedDataset[i].isRsiLocalPeak = true;
        computedDataset[i].rsiExtremumType = "maxima";
        computedDataset[i].rsiExtremumLabel = isHigherThanPrev === true ? "Higher High" : isHigherThanPrev === false ? "Lower High" : "Local Peak";
      } else if (isTrough) {
        const prevTrough = localMinima[localMinima.length - 1];
        const isHigherThanPrev = prevTrough ? cur > prevTrough.rsi : undefined;
        localMinima.push({
          index: i,
          dayIndex: computedDataset[i].dayIndex,
          rsi: cur,
          dateStr: computedDataset[i].dateFormatted,
          type: "minima",
          label: isHigherThanPrev === true ? "Higher Low (HL)" : isHigherThanPrev === false ? "Lower Low (LL)" : "Trough Low",
          isHigherThanPrev,
        });
        computedDataset[i].isRsiLocalTrough = true;
        computedDataset[i].rsiExtremumType = "minima";
        computedDataset[i].rsiExtremumLabel = isHigherThanPrev === true ? "Higher Low" : isHigherThanPrev === false ? "Lower Low" : "Local Trough";
      }
    }

    // Ensure at least 2 points for continuous dynamic trend lines
    if (localMaxima.length < 2 && computedDataset.length >= 2) {
      let maxIdx = 0;
      for (let i = 1; i < computedDataset.length; i++) {
        if (computedDataset[i].rsi14 > computedDataset[maxIdx].rsi14) maxIdx = i;
      }
      if (!localMaxima.some((m) => m.index === maxIdx)) {
        localMaxima.push({
          index: maxIdx,
          dayIndex: computedDataset[maxIdx].dayIndex,
          rsi: computedDataset[maxIdx].rsi14,
          dateStr: computedDataset[maxIdx].dateFormatted,
          type: "maxima",
          label: "Peak High",
        });
        computedDataset[maxIdx].isRsiLocalPeak = true;
      }
      if (localMaxima.length < 2) {
        const otherIdx = maxIdx > computedDataset.length / 2 ? 0 : computedDataset.length - 1;
        localMaxima.push({
          index: otherIdx,
          dayIndex: computedDataset[otherIdx].dayIndex,
          rsi: computedDataset[otherIdx].rsi14,
          dateStr: computedDataset[otherIdx].dateFormatted,
          type: "maxima",
          label: "Resistance Anchor",
        });
      }
      localMaxima.sort((a, b) => a.index - b.index);
    }

    if (localMinima.length < 2 && computedDataset.length >= 2) {
      let minIdx = 0;
      for (let i = 1; i < computedDataset.length; i++) {
        if (computedDataset[i].rsi14 < computedDataset[minIdx].rsi14) minIdx = i;
      }
      if (!localMinima.some((m) => m.index === minIdx)) {
        localMinima.push({
          index: minIdx,
          dayIndex: computedDataset[minIdx].dayIndex,
          rsi: computedDataset[minIdx].rsi14,
          dateStr: computedDataset[minIdx].dateFormatted,
          type: "minima",
          label: "Trough Low",
        });
        computedDataset[minIdx].isRsiLocalTrough = true;
      }
      if (localMinima.length < 2) {
        const otherIdx = minIdx > computedDataset.length / 2 ? 0 : computedDataset.length - 1;
        localMinima.push({
          index: otherIdx,
          dayIndex: computedDataset[otherIdx].dayIndex,
          rsi: computedDataset[otherIdx].rsi14,
          dateStr: computedDataset[otherIdx].dateFormatted,
          type: "minima",
          label: "Support Anchor",
        });
      }
      localMinima.sort((a, b) => a.index - b.index);
    }

    // Dynamic Slopes (RSI units / day)
    let maximaSlope = 0;
    if (localMaxima.length >= 2) {
      const f = localMaxima[0];
      const l = localMaxima[localMaxima.length - 1];
      const dx = l.index - f.index;
      maximaSlope = dx > 0 ? Number(((l.rsi - f.rsi) / dx).toFixed(2)) : 0;
    }

    let minimaSlope = 0;
    if (localMinima.length >= 2) {
      const f = localMinima[0];
      const l = localMinima[localMinima.length - 1];
      const dx = l.index - f.index;
      minimaSlope = dx > 0 ? Number(((l.rsi - f.rsi) / dx).toFixed(2)) : 0;
    }

    // Extrapolated Resistance & Support levels at Today (index 30)
    const lastPeak = localMaxima[localMaxima.length - 1];
    const lastTrough = localMinima[localMinima.length - 1];
    const lastIdx = computedDataset.length - 1;

    const projectedCurrentResistance = Number(
      Math.max(10, Math.min(100, lastPeak.rsi + maximaSlope * (lastIdx - lastPeak.index))).toFixed(1)
    );
    const projectedCurrentSupport = Number(
      Math.max(0, Math.min(90, lastTrough.rsi + minimaSlope * (lastIdx - lastTrough.index))).toFixed(1)
    );

    // Momentum Pattern Recognition
    let patternType: RsiTrendAnalysis["patternType"] = "horizontal_range";
    let patternLabel = "Horizontal Range";
    let patternEmoji = "↔️";
    let patternDescription = "Momentum is fluctuating in an equilibrium corridor with balanced highs and lows.";
    let divergenceStatus: RsiTrendAnalysis["divergenceStatus"] = "range_bound";

    const THRESH = 0.18;
    if (maximaSlope > THRESH && minimaSlope > THRESH) {
      patternType = "ascending_channel";
      patternLabel = "Ascending Bullish Channel";
      patternEmoji = "🚀";
      patternDescription = "Higher highs and higher lows confirm sustained bullish momentum expansion over time.";
      divergenceStatus = "bullish_expansion";
    } else if (maximaSlope < -THRESH && minimaSlope < -THRESH) {
      patternType = "descending_channel";
      patternLabel = "Descending Bearish Channel";
      patternEmoji = "📉";
      patternDescription = "Lower highs and lower lows confirm sustained momentum deterioration and seller dominance.";
      divergenceStatus = "bearish_exhaustion";
    } else if (maximaSlope < -THRESH && minimaSlope > THRESH) {
      patternType = "converging_wedge";
      patternLabel = "Symmetrical Converging Wedge";
      patternEmoji = "📐";
      patternDescription = "Lower highs meeting higher lows indicate momentum compression—primed for an imminent volatility breakout.";
      divergenceStatus = "compression";
    } else if (maximaSlope > THRESH && minimaSlope < -THRESH) {
      patternType = "broadening_wedge";
      patternLabel = "Broadening Volatility Wedge";
      patternEmoji = "⚡";
      patternDescription = "Higher highs paired with lower lows reveal escalating volatility and expanding price swings.";
      divergenceStatus = "widening_volatility";
    } else if (maximaSlope > THRESH && Math.abs(minimaSlope) <= THRESH) {
      patternType = "ascending_triangle";
      patternLabel = "Ascending Triangle Pattern";
      patternEmoji = "📈";
      patternDescription = "Rising momentum peaks pressing against a firm support floor signal strong buyer accumulation.";
      divergenceStatus = "bullish_expansion";
    } else if (maximaSlope < -THRESH && Math.abs(minimaSlope) <= THRESH) {
      patternType = "descending_triangle";
      patternLabel = "Descending Triangle Pattern";
      patternEmoji = "🔻";
      patternDescription = "Declining momentum peaks pressing against horizontal support reflect persistent selling pressure.";
      divergenceStatus = "bearish_exhaustion";
    }

    const rsiTrendAnalysis: RsiTrendAnalysis = {
      maxima: localMaxima,
      minima: localMinima,
      maximaSlope,
      minimaSlope,
      projectedCurrentResistance,
      projectedCurrentSupport,
      patternType,
      patternLabel,
      patternDescription,
      patternEmoji,
      divergenceStatus,
    };

    return {
      dataset: computedDataset,
      baselineMarketCap: baseMcap,
      minMcap: minM,
      maxMcap: maxM,
      total30dPnl: netPnl,
      total30dRoi: netRoi,
      is30dPositive: netPnl >= 0,
      totalSpikesCount: spikes,
      maxZScore: peakZ,
      avgReturnPercent: meanReturn * 100,
      currentRsi: latestRecord.rsi14,
      currentRsiCondition: latestRecord.rsiCondition,
      currentRsiSignal: latestRecord.rsiSignal,
      currentRsiSignalLabel: latestRecord.rsiSignalLabel,
      buySignalsCount: buyCount,
      sellSignalsCount: sellCount,
      deepBuySignalsCount: deepBuyCount,
      deepSellSignalsCount: deepSellCount,
      localMaxima,
      localMinima,
      rsiTrendAnalysis,
    };
  }, [holding, token]);

  // Selected interactive point details
  const activeRecord = useMemo(() => {
    if (dataset.length === 0) return null;
    return dataset.find((d) => d.dayIndex === selectedDayIndex) || dataset[dataset.length - 1];
  }, [dataset, selectedDayIndex]);

  // Filtered table records based on Buy/Sell signal or spike selection
  const filteredTableDataset = useMemo(() => {
    if (tableFilter === "buy") return dataset.filter((d) => d.isBuySignal);
    if (tableFilter === "sell") return dataset.filter((d) => d.isSellSignal);
    if (tableFilter === "spikes") return dataset.filter((d) => d.isSpike);
    if (tableFilter === "peaks") return dataset.filter((d) => d.isRsiLocalPeak);
    if (tableFilter === "troughs") return dataset.filter((d) => d.isRsiLocalTrough);
    return dataset;
  }, [dataset, tableFilter]);

  // Synchronized crosshair updates between charts
  const handleScrubIndex = (idx: number) => {
    const clampedIdx = Math.max(0, Math.min(dataset.length - 1, idx));
    setHoveredPoint(dataset[clampedIdx]);
  };

  // =========================================================================
  // Primary D3 Chart Renderer
  // =========================================================================
  useEffect(() => {
    if (!isOpen || !svgRef.current || dataset.length === 0 || chartWidth <= 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = chartWidth;
    const height = chartHeight;
    const margin = { top: 16, right: 16, bottom: 24, left: 16 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const xScale = d3.scaleLinear().domain([0, dataset.length - 1]).range([0, innerWidth]);

    const getValue = (d: DayPerformanceRecord) => {
      switch (activeMetricView) {
        case "mcap":
          return d.marketCap;
        case "price":
          return d.tokenPrice;
        case "volatility":
          return d.zScore;
        case "rsi":
          return d.rsi14;
        case "pnl":
        default:
          return d.pnlUsd;
      }
    };

    const values = dataset.map(getValue);
    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);
    if (activeMetricView === "rsi") {
      minVal = 0;
      maxVal = 100;
    } else {
      if (minVal === maxVal) {
        minVal -= 1;
        maxVal += 1;
      }
      const valRange = maxVal - minVal;
      const buffer = valRange * 0.12;
      minVal -= buffer;
      maxVal += buffer;
    }

    const yScale = d3.scaleLinear().domain([minVal, maxVal]).range([innerHeight, 0]);

    const strokeColor =
      activeMetricView === "rsi"
        ? "#C084FC"
        : activeMetricView === "volatility"
        ? "#F59E0B"
        : activeMetricView === "mcap"
        ? "#38BDF8"
        : is30dPositive
        ? "#10B981"
        : "#EF4444";

    const g = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);
    const defs = svg.append("defs");

    const gradId = `modal-d3-grad-${holding?.id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    const linearGrad = defs
      .append("linearGradient")
      .attr("id", gradId)
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    linearGrad.append("stop").attr("offset", "0%").attr("stop-color", strokeColor).attr("stop-opacity", 0.35);
    linearGrad.append("stop").attr("offset", "75%").attr("stop-color", strokeColor).attr("stop-opacity", 0.05);
    linearGrad.append("stop").attr("offset", "100%").attr("stop-color", strokeColor).attr("stop-opacity", 0.0);

    const filter = defs.append("filter").attr("id", "modal-spike-glow");
    filter.append("feGaussianBlur").attr("stdDeviation", "2.5").attr("result", "blur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "blur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Heatmap bands
    const stepW = innerWidth / (dataset.length - 1);
    const heatGroup = g.append("g").attr("class", "modal-heatmap-bands");

    dataset.forEach((d, idx) => {
      const cx = xScale(idx);
      const x0 = Math.max(0, cx - stepW / 2);
      const w = Math.min(innerWidth - x0, stepW);

      let col = "#06B6D4";
      let op = 0.04;
      if (d.zScore >= 2.5) {
        col = "#EC4899";
        op = 0.35;
      } else if (d.zScore >= 1.8) {
        col = "#EF4444";
        op = 0.24;
      } else if (d.zScore >= 1.2) {
        col = "#F59E0B";
        op = 0.12;
      }

      heatGroup.append("rect").attr("x", x0).attr("y", 0).attr("width", w).attr("height", innerHeight).attr("fill", col).attr("opacity", op);
    });

    // Zero baseline for PnL
    if (activeMetricView === "pnl" && minVal < 0 && maxVal > 0) {
      const zeroY = yScale(0);
      g.append("line").attr("x1", 0).attr("x2", innerWidth).attr("y1", zeroY).attr("y2", zeroY).attr("stroke", "#475569").attr("stroke-dasharray", "4,4").attr("stroke-width", 1);
    }

    // RSI Overbought / Oversold zones on main chart if activeMetricView === 'rsi'
    if (activeMetricView === "rsi") {
      g.append("rect").attr("x", 0).attr("y", yScale(100)).attr("width", innerWidth).attr("height", yScale(70) - yScale(100)).attr("fill", "rgba(239, 68, 68, 0.16)");
      g.append("rect").attr("x", 0).attr("y", yScale(30)).attr("width", innerWidth).attr("height", yScale(0) - yScale(30)).attr("fill", "rgba(16, 185, 129, 0.16)");
      g.append("line").attr("x1", 0).attr("x2", innerWidth).attr("y1", yScale(70)).attr("y2", yScale(70)).attr("stroke", "#EF4444").attr("stroke-dasharray", "4,4").attr("stroke-width", 1.2);
      g.append("line").attr("x1", 0).attr("x2", innerWidth).attr("y1", yScale(50)).attr("y2", yScale(50)).attr("stroke", "#64748B").attr("stroke-dasharray", "2,2").attr("stroke-width", 1);
      g.append("line").attr("x1", 0).attr("x2", innerWidth).attr("y1", yScale(30)).attr("y2", yScale(30)).attr("stroke", "#10B981").attr("stroke-dasharray", "4,4").attr("stroke-width", 1.2);

      g.append("text").attr("x", innerWidth - 4).attr("y", yScale(70) - 4).attr("text-anchor", "end").attr("fill", "#EF4444").attr("font-size", 9).attr("font-family", "monospace").attr("font-weight", "bold").text("70 SELL ZONE (OVERBOUGHT)");
      g.append("text").attr("x", innerWidth - 4).attr("y", yScale(30) + 12).attr("text-anchor", "end").attr("fill", "#10B981").attr("font-size", 9).attr("font-family", "monospace").attr("font-weight", "bold").text("30 BUY ZONE (OVERSOLD)");
    }

    // Area & Line
    const areaGen = d3.area<DayPerformanceRecord>().x((_, i) => xScale(i)).y0(innerHeight).y1((d) => yScale(getValue(d))).curve(d3.curveMonotoneX);
    g.append("path").datum(dataset).attr("fill", `url(#${gradId})`).attr("d", areaGen);

    const lineGen = d3.line<DayPerformanceRecord>().x((_, i) => xScale(i)).y((d) => yScale(getValue(d))).curve(d3.curveMonotoneX);
    g.append("path").datum(dataset).attr("fill", "none").attr("stroke", strokeColor).attr("stroke-width", 2.5).attr("stroke-linecap", "round").attr("stroke-linejoin", "round").attr("d", lineGen);

    // Spikes or RSI Signal Markers on Main Chart
    if (activeMetricView === "rsi") {
      const rsiSignalGroup = g.append("g").attr("class", "modal-rsi-signals pointer-events-none");
      dataset.forEach((d, idx) => {
        if (!d.isBuySignal && !d.isSellSignal) return;
        const sx = xScale(idx);
        const sy = yScale(d.rsi14);

        if (d.isBuySignal) {
          const isExtremeBuy = d.rsi14 < 20;
          rsiSignalGroup.append("circle").attr("cx", sx).attr("cy", sy).attr("r", 4.5).attr("fill", "#10B981").attr("stroke", "#042f2e").attr("stroke-width", 1.5);
          rsiSignalGroup
            .append("circle")
            .attr("cx", sx)
            .attr("cy", sy)
            .attr("r", isExtremeBuy ? 9 : 7.5)
            .attr("fill", "none")
            .attr("stroke", "#10B981")
            .attr("stroke-width", isExtremeBuy ? 2 : 1.5)
            .attr("class", isExtremeBuy ? "animate-rsi-buy-intense" : "animate-ping")
            .attr("opacity", isExtremeBuy ? 0.95 : 0.65);
          if (isExtremeBuy) {
            rsiSignalGroup
              .append("circle")
              .attr("cx", sx)
              .attr("cy", sy)
              .attr("r", 14)
              .attr("fill", "none")
              .attr("stroke", "#34D399")
              .attr("stroke-width", 1)
              .attr("class", "animate-ping")
              .attr("opacity", 0.6);
          }
        } else if (d.isSellSignal) {
          const isExtremeSell = d.rsi14 > 80;
          rsiSignalGroup.append("circle").attr("cx", sx).attr("cy", sy).attr("r", 4.5).attr("fill", "#F43F5E").attr("stroke", "#4c0519").attr("stroke-width", 1.5);
          rsiSignalGroup
            .append("circle")
            .attr("cx", sx)
            .attr("cy", sy)
            .attr("r", isExtremeSell ? 9 : 7.5)
            .attr("fill", "none")
            .attr("stroke", "#F43F5E")
            .attr("stroke-width", isExtremeSell ? 2 : 1.5)
            .attr("class", isExtremeSell ? "animate-rsi-sell-intense" : "animate-ping")
            .attr("opacity", isExtremeSell ? 0.95 : 0.65);
          if (isExtremeSell) {
            rsiSignalGroup
              .append("circle")
              .attr("cx", sx)
              .attr("cy", sy)
              .attr("r", 14)
              .attr("fill", "none")
              .attr("stroke", "#FB7185")
              .attr("stroke-width", 1)
              .attr("class", "animate-ping")
              .attr("opacity", 0.6);
          }
        }
      });

      // Main Chart Dynamic RSI Trend Lines (connecting local maxima & minima)
      if (showRsiTrendLines) {
        const mainTrendGroup = g.append("g").attr("class", "modal-rsi-main-trendlines pointer-events-none");
        const trendGen = d3
          .line<RsiExtremumPoint>()
          .x((d) => xScale(d.index))
          .y((d) => yScale(d.rsi))
          .curve(d3.curveLinear);

        if ((rsiTrendLineMode === "both" || rsiTrendLineMode === "maxima") && localMaxima.length >= 2) {
          const mPath = trendGen(localMaxima);
          if (mPath) {
            mainTrendGroup
              .append("path")
              .attr("d", mPath)
              .attr("fill", "none")
              .attr("stroke", "#FB7185")
              .attr("stroke-width", 2.2)
              .attr("stroke-dasharray", "6,3");
          }
          localMaxima.forEach((m) => {
            mainTrendGroup
              .append("circle")
              .attr("cx", xScale(m.index))
              .attr("cy", yScale(m.rsi))
              .attr("r", 4.5)
              .attr("fill", "#F43F5E")
              .attr("stroke", "#881337")
              .attr("stroke-width", 1.5);
            mainTrendGroup
              .append("text")
              .attr("x", xScale(m.index))
              .attr("y", Math.max(12, yScale(m.rsi) - 7))
              .attr("text-anchor", "middle")
              .attr("fill", "#FDA4AF")
              .attr("font-size", 8.5)
              .attr("font-family", "monospace")
              .attr("font-weight", "bold")
              .text(`▲ ${m.rsi}`);
          });
        }

        if ((rsiTrendLineMode === "both" || rsiTrendLineMode === "minima") && localMinima.length >= 2) {
          const minPath = trendGen(localMinima);
          if (minPath) {
            mainTrendGroup
              .append("path")
              .attr("d", minPath)
              .attr("fill", "none")
              .attr("stroke", "#34D399")
              .attr("stroke-width", 2.2)
              .attr("stroke-dasharray", "6,3");
          }
          localMinima.forEach((m) => {
            mainTrendGroup
              .append("circle")
              .attr("cx", xScale(m.index))
              .attr("cy", yScale(m.rsi))
              .attr("r", 4.5)
              .attr("fill", "#10B981")
              .attr("stroke", "#064E3B")
              .attr("stroke-width", 1.5);
            mainTrendGroup
              .append("text")
              .attr("x", xScale(m.index))
              .attr("y", Math.min(innerHeight - 4, yScale(m.rsi) + 14))
              .attr("text-anchor", "middle")
              .attr("fill", "#6EE7B7")
              .attr("font-size", 8.5)
              .attr("font-family", "monospace")
              .attr("font-weight", "bold")
              .text(`▼ ${m.rsi}`);
          });
        }
      }
    } else {
      const spikesGroup = g.append("g").attr("class", "modal-spikes");
      dataset.forEach((d, idx) => {
        if (!d.isSpike) return;
        const sx = xScale(idx);
        const sy = yScale(getValue(d));
        const diamondColor = d.zScore >= 2.5 ? "#EC4899" : "#F59E0B";

        spikesGroup.append("path").attr("d", d3.symbol().type(d3.symbolDiamond).size(d.zScore >= 2.5 ? 75 : 50)).attr("transform", `translate(${sx}, ${sy})`).attr("fill", diamondColor).attr("stroke", "#0e1017").attr("stroke-width", 1.5).attr("filter", "url(#modal-spike-glow)");
      });
    }

    // Crosshair & Selected Day Pin
    const crosshair = g.append("line").attr("stroke", "#94A3B8").attr("stroke-dasharray", "2,2").attr("stroke-width", 1).style("display", "none");
    const hoverCircle = g.append("circle").attr("r", 5.5).attr("fill", strokeColor).attr("stroke", "#FFFFFF").attr("stroke-width", 2).style("display", "none");

    const selectedIdx = dataset.findIndex((d) => d.dayIndex === selectedDayIndex);
    if (selectedIdx !== -1) {
      const selX = xScale(selectedIdx);
      const selY = yScale(getValue(dataset[selectedIdx]));
      g.append("circle").attr("cx", selX).attr("cy", selY).attr("r", 6.5).attr("fill", "none").attr("stroke", "#38BDF8").attr("stroke-width", 2).attr("class", "animate-ping pointer-events-none");
      g.append("circle").attr("cx", selX).attr("cy", selY).attr("r", 4.5).attr("fill", "#38BDF8").attr("stroke", "#0e1017").attr("stroke-width", 1.5);
    }

    g.append("rect")
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .attr("fill", "transparent")
      .attr("cursor", "crosshair")
      .on("mousemove", (event) => {
        const [mx] = d3.pointer(event);
        const idx = Math.round(xScale.invert(mx));
        const clampedIdx = Math.max(0, Math.min(dataset.length - 1, idx));
        const pt = dataset[clampedIdx];

        const cx = xScale(clampedIdx);
        const cy = yScale(getValue(pt));

        crosshair.style("display", null).attr("x1", cx).attr("x2", cx).attr("y1", 0).attr("y2", innerHeight);
        hoverCircle.style("display", null).attr("cx", cx).attr("cy", cy);

        handleScrubIndex(clampedIdx);
      })
      .on("click", (event) => {
        const [mx] = d3.pointer(event);
        const idx = Math.round(xScale.invert(mx));
        const clampedIdx = Math.max(0, Math.min(dataset.length - 1, idx));
        setSelectedDayIndex(dataset[clampedIdx].dayIndex);
      })
      .on("mouseleave", () => {
        crosshair.style("display", "none");
        hoverCircle.style("display", "none");
        setHoveredPoint(null);
      });

    // Date Ticks
    const tickIndices = [0, 10, 20, dataset.length - 1];
    const axisGroup = g.append("g").attr("class", "date-ticks");
    tickIndices.forEach((tIdx) => {
      const pt = dataset[tIdx];
      if (!pt) return;
      const tx = xScale(tIdx);

      axisGroup
        .append("text")
        .attr("x", tx)
        .attr("y", innerHeight + 16)
        .attr("text-anchor", tIdx === 0 ? "start" : tIdx === dataset.length - 1 ? "end" : "middle")
        .attr("fill", "#64748B")
        .attr("font-size", 10)
        .attr("font-family", "monospace")
        .text(pt.dayIndex === 0 ? "Today" : `${pt.dayIndex}d`);
    });
  }, [
    isOpen,
    dataset,
    chartWidth,
    chartHeight,
    activeMetricView,
    selectedDayIndex,
    is30dPositive,
    holding?.id,
    showRsiTrendLines,
    rsiTrendLineMode,
    localMaxima,
    localMinima,
  ]);

  // =========================================================================
  // Relative Strength Index (RSI 14-Day Momentum) Oscillator D3 Renderer
  // =========================================================================
  useEffect(() => {
    if (!isOpen || !showRsiOscillator || !rsiSvgRef.current || dataset.length === 0 || chartWidth <= 0) return;

    const svg = d3.select(rsiSvgRef.current);
    svg.selectAll("*").remove();

    const width = chartWidth;
    const height = rsiHeight;
    const margin = { top: 12, right: 16, bottom: 20, left: 16 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const xScale = d3.scaleLinear().domain([0, dataset.length - 1]).range([0, innerWidth]);
    const yScale = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);

    const g = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);
    const defs = svg.append("defs");

    // Gradients & Filters for Buy and Sell signal zones
    const sellZoneGrad = defs
      .append("linearGradient")
      .attr("id", "rsi-sell-zone-grad")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");
    sellZoneGrad.append("stop").attr("offset", "0%").attr("stop-color", "#EF4444").attr("stop-opacity", 0.28);
    sellZoneGrad.append("stop").attr("offset", "100%").attr("stop-color", "#EF4444").attr("stop-opacity", 0.06);

    const buyZoneGrad = defs
      .append("linearGradient")
      .attr("id", "rsi-buy-zone-grad")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");
    buyZoneGrad.append("stop").attr("offset", "0%").attr("stop-color", "#10B981").attr("stop-opacity", 0.06);
    buyZoneGrad.append("stop").attr("offset", "100%").attr("stop-color", "#10B981").attr("stop-opacity", 0.28);

    const rsiLineGrad = defs
      .append("linearGradient")
      .attr("id", "rsi-line-signal-grad")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");
    rsiLineGrad.append("stop").attr("offset", "0%").attr("stop-color", "#F43F5E");
    rsiLineGrad.append("stop").attr("offset", "30%").attr("stop-color", "#F43F5E");
    rsiLineGrad.append("stop").attr("offset", "38%").attr("stop-color", "#C084FC");
    rsiLineGrad.append("stop").attr("offset", "62%").attr("stop-color", "#C084FC");
    rsiLineGrad.append("stop").attr("offset", "70%").attr("stop-color", "#10B981");
    rsiLineGrad.append("stop").attr("offset", "100%").attr("stop-color", "#10B981");

    // =========================================================================
    // 1. SELL SIGNAL ZONE (RSI ≥ 70 - OVERBOUGHT)
    // =========================================================================
    const sellZoneH = yScale(70) - yScale(100);
    g.append("rect")
      .attr("x", 0)
      .attr("y", yScale(100))
      .attr("width", innerWidth)
      .attr("height", sellZoneH)
      .attr("fill", "url(#rsi-sell-zone-grad)")
      .attr("class", "pointer-events-none");

    // Sell Zone Banner Tag
    const sellTagG = g.append("g").attr("class", "pointer-events-none");
    sellTagG
      .append("rect")
      .attr("x", 6)
      .attr("y", yScale(100) + 3)
      .attr("width", 152)
      .attr("height", 14)
      .attr("rx", 3.5)
      .attr("fill", "rgba(136, 19, 55, 0.8)")
      .attr("stroke", "#F43F5E")
      .attr("stroke-width", 0.8);

    sellTagG
      .append("text")
      .attr("x", 12)
      .attr("y", yScale(100) + 13.5)
      .attr("fill", "#FDA4AF")
      .attr("font-size", 8.5)
      .attr("font-family", "monospace")
      .attr("font-weight", "bold")
      .text("🔴 SELL ZONE (RSI ≥ 70)");

    // 70 Line (Overbought / Sell Threshold)
    g.append("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", yScale(70))
      .attr("y2", yScale(70))
      .attr("stroke", "#EF4444")
      .attr("stroke-dasharray", "4,4")
      .attr("stroke-width", 1.2);

    g.append("text")
      .attr("x", innerWidth - 4)
      .attr("y", yScale(70) - 3)
      .attr("text-anchor", "end")
      .attr("fill", "#EF4444")
      .attr("font-size", 9)
      .attr("font-family", "monospace")
      .attr("font-weight", "bold")
      .text("70 SELL THRESHOLD");

    // =========================================================================
    // 2. 50 MIDLINE (NEUTRAL EQUILIBRIUM)
    // =========================================================================
    g.append("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", yScale(50))
      .attr("y2", yScale(50))
      .attr("stroke", "#475569")
      .attr("stroke-dasharray", "3,3")
      .attr("stroke-width", 1);

    g.append("text")
      .attr("x", 4)
      .attr("y", yScale(50) - 3)
      .attr("fill", "#64748B")
      .attr("font-size", 8.5)
      .attr("font-family", "monospace")
      .text("50 MIDLINE (HOLD)");

    // =========================================================================
    // 3. BUY SIGNAL ZONE (RSI ≤ 30 - OVERSOLD)
    // =========================================================================
    const buyZoneH = yScale(0) - yScale(30);
    g.append("rect")
      .attr("x", 0)
      .attr("y", yScale(30))
      .attr("width", innerWidth)
      .attr("height", buyZoneH)
      .attr("fill", "url(#rsi-buy-zone-grad)")
      .attr("class", "pointer-events-none");

    // Buy Zone Banner Tag
    const buyTagG = g.append("g").attr("class", "pointer-events-none");
    buyTagG
      .append("rect")
      .attr("x", 6)
      .attr("y", yScale(30) + 4)
      .attr("width", 146)
      .attr("height", 14)
      .attr("rx", 3.5)
      .attr("fill", "rgba(6, 78, 59, 0.8)")
      .attr("stroke", "#10B981")
      .attr("stroke-width", 0.8);

    buyTagG
      .append("text")
      .attr("x", 12)
      .attr("y", yScale(30) + 14.5)
      .attr("fill", "#6EE7B7")
      .attr("font-size", 8.5)
      .attr("font-family", "monospace")
      .attr("font-weight", "bold")
      .text("🟢 BUY ZONE (RSI ≤ 30)");

    // 30 Line (Oversold / Buy Threshold)
    g.append("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", yScale(30))
      .attr("y2", yScale(30))
      .attr("stroke", "#10B981")
      .attr("stroke-dasharray", "4,4")
      .attr("stroke-width", 1.2);

    g.append("text")
      .attr("x", innerWidth - 4)
      .attr("y", yScale(30) + 10)
      .attr("text-anchor", "end")
      .attr("fill", "#10B981")
      .attr("font-size", 9)
      .attr("font-family", "monospace")
      .attr("font-weight", "bold")
      .text("30 BUY THRESHOLD");

    // RSI Area Gradient Fill
    const rsiGrad = defs
      .append("linearGradient")
      .attr("id", "rsi-sub-grad")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    rsiGrad.append("stop").attr("offset", "0%").attr("stop-color", "#C084FC").attr("stop-opacity", 0.25);
    rsiGrad.append("stop").attr("offset", "100%").attr("stop-color", "#C084FC").attr("stop-opacity", 0.0);

    const rsiAreaGen = d3
      .area<DayPerformanceRecord>()
      .x((_, i) => xScale(i))
      .y0(innerHeight)
      .y1((d) => yScale(d.rsi14))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(dataset)
      .attr("fill", "url(#rsi-sub-grad)")
      .attr("d", rsiAreaGen);

    // RSI Multi-Tone Line with Signal Coloring
    const rsiLineGen = d3
      .line<DayPerformanceRecord>()
      .x((_, i) => xScale(i))
      .y((d) => yScale(d.rsi14))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(dataset)
      .attr("fill", "none")
      .attr("stroke", "url(#rsi-line-signal-grad)")
      .attr("stroke-width", 2.2)
      .attr("d", rsiLineGen);

    // =========================================================================
    // 3.5 DYNAMIC TREND LINES (CONNECTING LOCAL MAXIMA & MINIMA)
    // =========================================================================
    if (showRsiTrendLines) {
      const trendGroup = g.append("g").attr("class", "rsi-dynamic-trendlines pointer-events-none");

      const trendLineGen = d3
        .line<RsiExtremumPoint>()
        .x((d) => xScale(d.index))
        .y((d) => yScale(d.rsi))
        .curve(d3.curveLinear);

      // (A) MAXIMA RESISTANCE TREND LINE (Highs / Peaks)
      if ((rsiTrendLineMode === "both" || rsiTrendLineMode === "maxima") && localMaxima.length >= 2) {
        const maximaPath = trendLineGen(localMaxima);
        if (maximaPath) {
          // Glow shadow stroke
          trendGroup
            .append("path")
            .attr("d", maximaPath)
            .attr("fill", "none")
            .attr("stroke", "#F43F5E")
            .attr("stroke-width", 4)
            .attr("stroke-opacity", 0.22)
            .attr("stroke-linecap", "round");

          // Main resistance dashed line
          trendGroup
            .append("path")
            .attr("d", maximaPath)
            .attr("fill", "none")
            .attr("stroke", "#FB7185")
            .attr("stroke-width", 1.9)
            .attr("stroke-dasharray", "5,3")
            .attr("stroke-linecap", "round");

          // Forward dynamic projection to Day 0
          const lastM = localMaxima[localMaxima.length - 1];
          if (lastM.index < dataset.length - 1) {
            const currentProjY = yScale(rsiTrendAnalysis.projectedCurrentResistance);
            trendGroup
              .append("line")
              .attr("x1", xScale(lastM.index))
              .attr("y1", yScale(lastM.rsi))
              .attr("x2", xScale(dataset.length - 1))
              .attr("y2", currentProjY)
              .attr("stroke", "#FDA4AF")
              .attr("stroke-width", 1.4)
              .attr("stroke-dasharray", "2,3")
              .attr("stroke-opacity", 0.85);

            // Forward projection terminal indicator dot
            trendGroup
              .append("circle")
              .attr("cx", xScale(dataset.length - 1))
              .attr("cy", currentProjY)
              .attr("r", 2.8)
              .attr("fill", "#F43F5E")
              .attr("stroke", "#FFFFFF")
              .attr("stroke-width", 1);
          }
        }

        // Peak High Node Badges
        localMaxima.forEach((m) => {
          const mx = xScale(m.index);
          const my = yScale(m.rsi);

          trendGroup
            .append("circle")
            .attr("cx", mx)
            .attr("cy", my)
            .attr("r", 3.8)
            .attr("fill", "#F43F5E")
            .attr("stroke", "#881337")
            .attr("stroke-width", 1.5);

          const tagY = Math.max(9, my - 6);
          trendGroup
            .append("text")
            .attr("x", mx)
            .attr("y", tagY)
            .attr("text-anchor", "middle")
            .attr("fill", "#FDA4AF")
            .attr("font-size", 7.5)
            .attr("font-family", "monospace")
            .attr("font-weight", "bold")
            .text(`▲${m.rsi}`);
        });
      }

      // (B) MINIMA SUPPORT TREND LINE (Lows / Troughs)
      if ((rsiTrendLineMode === "both" || rsiTrendLineMode === "minima") && localMinima.length >= 2) {
        const minimaPath = trendLineGen(localMinima);
        if (minimaPath) {
          // Glow shadow stroke
          trendGroup
            .append("path")
            .attr("d", minimaPath)
            .attr("fill", "none")
            .attr("stroke", "#10B981")
            .attr("stroke-width", 4)
            .attr("stroke-opacity", 0.22)
            .attr("stroke-linecap", "round");

          // Main support dashed line
          trendGroup
            .append("path")
            .attr("d", minimaPath)
            .attr("fill", "none")
            .attr("stroke", "#34D399")
            .attr("stroke-width", 1.9)
            .attr("stroke-dasharray", "5,3")
            .attr("stroke-linecap", "round");

          // Forward dynamic projection to Day 0
          const lastMin = localMinima[localMinima.length - 1];
          if (lastMin.index < dataset.length - 1) {
            const currentProjY = yScale(rsiTrendAnalysis.projectedCurrentSupport);
            trendGroup
              .append("line")
              .attr("x1", xScale(lastMin.index))
              .attr("y1", yScale(lastMin.rsi))
              .attr("x2", xScale(dataset.length - 1))
              .attr("y2", currentProjY)
              .attr("stroke", "#6EE7B7")
              .attr("stroke-width", 1.4)
              .attr("stroke-dasharray", "2,3")
              .attr("stroke-opacity", 0.85);

            // Forward projection terminal indicator dot
            trendGroup
              .append("circle")
              .attr("cx", xScale(dataset.length - 1))
              .attr("cy", currentProjY)
              .attr("r", 2.8)
              .attr("fill", "#10B981")
              .attr("stroke", "#FFFFFF")
              .attr("stroke-width", 1);
          }
        }

        // Trough Low Node Badges
        localMinima.forEach((m) => {
          const mx = xScale(m.index);
          const my = yScale(m.rsi);

          trendGroup
            .append("circle")
            .attr("cx", mx)
            .attr("cy", my)
            .attr("r", 3.8)
            .attr("fill", "#10B981")
            .attr("stroke", "#064E3B")
            .attr("stroke-width", 1.5);

          const tagY = Math.min(innerHeight - 2, my + 10);
          trendGroup
            .append("text")
            .attr("x", mx)
            .attr("y", tagY)
            .attr("text-anchor", "middle")
            .attr("fill", "#6EE7B7")
            .attr("font-size", 7.5)
            .attr("font-family", "monospace")
            .attr("font-weight", "bold")
            .text(`▼${m.rsi}`);
        });
      }
    }

    // =========================================================================
    // 4. BUY & SELL SIGNAL FLAGS DIRECTLY ON RSI CURVE
    // =========================================================================
    const signalMarkersG = g.append("g").attr("class", "rsi-signal-markers pointer-events-none");

    dataset.forEach((d, idx) => {
      const sx = xScale(idx);
      const sy = yScale(d.rsi14);

      if (d.isBuySignal) {
        const isExtreme = d.rsi14 < 20;
        // Green BUY Signal Flag on Oversold Point
        signalMarkersG
          .append("circle")
          .attr("cx", sx)
          .attr("cy", sy)
          .attr("r", isExtreme ? 9 : 7)
          .attr("fill", "none")
          .attr("stroke", "#10B981")
          .attr("stroke-width", isExtreme ? 2 : 1.5)
          .attr("opacity", isExtreme ? 0.95 : 0.65)
          .attr("class", isExtreme ? "animate-rsi-buy-intense" : "animate-ping");

        if (isExtreme) {
          signalMarkersG
            .append("circle")
            .attr("cx", sx)
            .attr("cy", sy)
            .attr("r", 14)
            .attr("fill", "none")
            .attr("stroke", "#34D399")
            .attr("stroke-width", 1)
            .attr("opacity", 0.6)
            .attr("class", "animate-ping");
        }

        signalMarkersG
          .append("circle")
          .attr("cx", sx)
          .attr("cy", sy)
          .attr("r", 4)
          .attr("fill", isExtreme ? "#34D399" : "#10B981")
          .attr("stroke", "#042f2e")
          .attr("stroke-width", 1.5);

        // "BUY" Flag Pill Tag
        const pillY = Math.min(innerHeight - 15, sy + 6);
        const pillWidth = isExtreme ? 46 : 30;
        signalMarkersG
          .append("rect")
          .attr("x", sx - pillWidth / 2)
          .attr("y", pillY)
          .attr("width", pillWidth)
          .attr("height", 12)
          .attr("rx", 3)
          .attr("fill", isExtreme ? "#064E3B" : "#042f2e")
          .attr("stroke", isExtreme ? "#34D399" : "#10B981")
          .attr("stroke-width", isExtreme ? 1.3 : 0.9)
          .attr("class", isExtreme ? "animate-rsi-buy-intense" : "animate-rsi-buy-subtle");

        signalMarkersG
          .append("text")
          .attr("x", sx)
          .attr("y", pillY + 9)
          .attr("fill", isExtreme ? "#A7F3D0" : "#34D399")
          .attr("font-size", isExtreme ? 7.5 : 8)
          .attr("font-family", "monospace")
          .attr("font-weight", "bold")
          .attr("text-anchor", "middle")
          .text(isExtreme ? "BUY <20" : "BUY");
      } else if (d.isSellSignal) {
        const isExtreme = d.rsi14 > 80;
        // Red SELL Signal Flag on Overbought Point
        signalMarkersG
          .append("circle")
          .attr("cx", sx)
          .attr("cy", sy)
          .attr("r", isExtreme ? 9 : 7)
          .attr("fill", "none")
          .attr("stroke", "#F43F5E")
          .attr("stroke-width", isExtreme ? 2 : 1.5)
          .attr("opacity", isExtreme ? 0.95 : 0.7)
          .attr("class", isExtreme ? "animate-rsi-sell-intense" : "animate-ping");

        if (isExtreme) {
          signalMarkersG
            .append("circle")
            .attr("cx", sx)
            .attr("cy", sy)
            .attr("r", 14)
            .attr("fill", "none")
            .attr("stroke", "#FB7185")
            .attr("stroke-width", 1)
            .attr("opacity", 0.6)
            .attr("class", "animate-ping");
        }

        signalMarkersG
          .append("circle")
          .attr("cx", sx)
          .attr("cy", sy)
          .attr("r", 4)
          .attr("fill", isExtreme ? "#FB7185" : "#F43F5E")
          .attr("stroke", "#4c0519")
          .attr("stroke-width", 1.5);

        // "SELL" Flag Pill Tag
        const pillY = Math.max(2, sy - 17);
        const pillWidth = isExtreme ? 46 : 32;
        signalMarkersG
          .append("rect")
          .attr("x", sx - pillWidth / 2)
          .attr("y", pillY)
          .attr("width", pillWidth)
          .attr("height", 12)
          .attr("rx", 3)
          .attr("fill", isExtreme ? "#881337" : "#4c0519")
          .attr("stroke", isExtreme ? "#FB7185" : "#F43F5E")
          .attr("stroke-width", isExtreme ? 1.3 : 0.9)
          .attr("class", isExtreme ? "animate-rsi-sell-intense" : "animate-rsi-sell-subtle");

        signalMarkersG
          .append("text")
          .attr("x", sx)
          .attr("y", pillY + 9)
          .attr("fill", isExtreme ? "#FECDD3" : "#FDA4AF")
          .attr("font-size", isExtreme ? 7.5 : 8)
          .attr("font-family", "monospace")
          .attr("font-weight", "bold")
          .attr("text-anchor", "middle")
          .text(isExtreme ? "SELL >80" : "SELL");
      }
    });

    // Selected Day Point
    const selectedIdx = dataset.findIndex((d) => d.dayIndex === selectedDayIndex);
    if (selectedIdx !== -1) {
      const pt = dataset[selectedIdx];
      const sx = xScale(selectedIdx);
      const sy = yScale(pt.rsi14);

      let dotColor = "#C084FC";
      if (pt.isSellSignal) dotColor = "#EF4444";
      else if (pt.isBuySignal) dotColor = "#10B981";

      g.append("circle")
        .attr("cx", sx)
        .attr("cy", sy)
        .attr("r", 6)
        .attr("fill", "none")
        .attr("stroke", dotColor)
        .attr("stroke-width", 2)
        .attr("class", "animate-ping pointer-events-none");

      g.append("circle")
        .attr("cx", sx)
        .attr("cy", sy)
        .attr("r", 4.5)
        .attr("fill", dotColor)
        .attr("stroke", "#0e1017")
        .attr("stroke-width", 1.5);
    }

    // Interactive scrub overlay on RSI sub-chart
    const rsiCrosshair = g
      .append("line")
      .attr("stroke", "#94A3B8")
      .attr("stroke-dasharray", "2,2")
      .attr("stroke-width", 1)
      .style("display", "none");

    const rsiHoverDot = g
      .append("circle")
      .attr("r", 4.5)
      .attr("fill", "#C084FC")
      .attr("stroke", "#FFFFFF")
      .attr("stroke-width", 1.5)
      .style("display", "none");

    g.append("rect")
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .attr("fill", "transparent")
      .attr("cursor", "crosshair")
      .on("mousemove", (event) => {
        const [mx] = d3.pointer(event);
        const idx = Math.round(xScale.invert(mx));
        const clampedIdx = Math.max(0, Math.min(dataset.length - 1, idx));
        const pt = dataset[clampedIdx];

        const cx = xScale(clampedIdx);
        const cy = yScale(pt.rsi14);

        rsiCrosshair.style("display", null).attr("x1", cx).attr("x2", cx).attr("y1", 0).attr("y2", innerHeight);
        rsiHoverDot
          .style("display", null)
          .attr("cx", cx)
          .attr("cy", cy)
          .attr("fill", pt.isSellSignal ? "#F43F5E" : pt.isBuySignal ? "#10B981" : "#C084FC")
          .attr("stroke", pt.isSellSignal ? "#881337" : pt.isBuySignal ? "#064E3B" : "#FFFFFF");

        handleScrubIndex(clampedIdx);
      })
      .on("click", (event) => {
        const [mx] = d3.pointer(event);
        const idx = Math.round(xScale.invert(mx));
        const clampedIdx = Math.max(0, Math.min(dataset.length - 1, idx));
        setSelectedDayIndex(dataset[clampedIdx].dayIndex);
      })
      .on("mouseleave", () => {
        rsiCrosshair.style("display", "none");
        rsiHoverDot.style("display", "none");
        setHoveredPoint(null);
      });
  }, [
    isOpen,
    showRsiOscillator,
    showRsiTrendLines,
    rsiTrendLineMode,
    dataset,
    chartWidth,
    rsiHeight,
    selectedDayIndex,
    localMaxima,
    localMinima,
    rsiTrendAnalysis,
  ]);

  if (!isOpen || !holding) return null;

  const handleCopyContract = () => {
    navigator.clipboard.writeText(holding.contractAddress);
    setCopiedContract(true);
    setTimeout(() => setCopiedContract(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0A0A0C] border border-[#1f2433] rounded-3xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Ambient Top Glow */}
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ backgroundColor: holding.color || "#06B6D4" }}
        />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-[#1f2433] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          {/* Identity & Badges */}
          <div className="flex items-center gap-3.5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base text-white shadow-xl flex-shrink-0"
              style={{ backgroundColor: holding.color || "#06B6D4" }}
            >
              {holding.symbol.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold font-mono text-white tracking-tight">{holding.symbol}</h2>
                <span className="text-sm font-mono text-[#8E9299]">({holding.name})</span>
                {holding.isNative && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Native EVM
                  </span>
                )}
                {holding.isFoundryToken && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Foundry Token
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-[#141722] text-[#8E9299] border border-[#242a3d]">
                  {holding.chain}
                </span>
              </div>

              {/* Address & Explorer */}
              <div className="flex items-center gap-2 font-mono text-xs text-[#8E9299] mt-1">
                <span>Contract:</span>
                <span className="text-white font-medium">{holding.contractAddress}</span>
                <button
                  type="button"
                  onClick={handleCopyContract}
                  className="p-1 hover:text-cyan-400 text-[#8E9299] transition-colors cursor-pointer"
                  title="Copy contract address"
                >
                  {copiedContract ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a
                  href={holding.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 hover:text-cyan-400 text-[#8E9299] transition-colors"
                  title="View on Explorer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Header Close, Tab Switchers & CTAs */}
          <div className="flex items-center gap-2.5 flex-wrap self-end sm:self-auto">
            {/* View Switcher: 30D Performance vs Depth of Market (DOM) vs Slippage Simulator */}
            <div className="flex items-center bg-[#141722] border border-[#242a3d] p-1 rounded-xl font-mono text-xs">
              <button
                type="button"
                onClick={() => setModalMainTab("performance")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                  modalMainTab === "performance"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                    : "text-[#8E9299] hover:text-white"
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>30D Performance</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalMainTab("dom");
                  setShowInlineDom(true);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                  modalMainTab === "dom"
                    ? "bg-purple-500/25 text-purple-200 border border-purple-500/40 shadow-sm"
                    : "text-[#8E9299] hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>Depth of Market</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-500/30 text-purple-300 border border-purple-400 animate-pulse">
                  DOM
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalMainTab("slippage");
                  setShowSlippageSim(true);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                  modalMainTab === "slippage"
                    ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 shadow-sm"
                    : "text-[#8E9299] hover:text-white"
                }`}
              >
                <Scale className="w-3.5 h-3.5 text-emerald-400" />
                <span>Slippage Simulator</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/30 text-emerald-300 border border-emerald-400">
                  SIM
                </span>
              </button>
            </div>

            {onOpenGlobalSwapSell && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenGlobalSwapSell(
                    {
                      id: holding.id,
                      symbol: holding.symbol,
                      name: holding.name,
                      contractAddress: holding.contractAddress,
                      decimals: holding.decimals,
                      chain: holding.chain,
                      priceUsd: holding.priceUsd,
                    },
                    "swap"
                  );
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono text-xs font-bold transition-all cursor-pointer"
              >
                <ArrowDownUp className="w-3.5 h-3.5" />
                <span>Swap Asset</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#141722] hover:bg-[#1a1e2c] border border-[#242a3d] text-[#8E9299] hover:text-white transition-colors cursor-pointer"
              title="Close modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 relative z-10 custom-scrollbar">
          {/* Dedicated Slippage Sensitivity Simulator View (When modalMainTab === "slippage") */}
          {modalMainTab === "slippage" && holding && (
            <div className="bg-[#141722]/80 border border-[#242a3d] rounded-2xl p-4 sm:p-5 shadow-2xl">
              <SlippageSensitivitySimulator
                holding={holding}
                token={token}
                currentMarketCap={activeRecord ? activeRecord.marketCap : (holding.valueUsd * 250 || 1_000_000)}
                currentPrice={activeRecord ? activeRecord.tokenPrice : holding.priceUsd}
                onOpenGlobalSwapSell={onOpenGlobalSwapSell}
              />
            </div>
          )}

          {/* Executive 30-Day Metrics Banner (5 Metrics including 14D RSI Momentum) */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* 30-Day Net Return */}
            <div className="bg-[#141722]/80 border border-[#242a3d] rounded-2xl p-4">
              <div className="text-[11px] font-mono text-[#8E9299] flex items-center justify-between">
                <span>30-DAY NET RETURN</span>
                {is30dPositive ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-rose-400" />
                )}
              </div>
              <div className={`text-xl sm:text-2xl font-bold font-mono mt-1 ${is30dPositive ? "text-emerald-400" : "text-rose-400"}`}>
                {is30dPositive ? "+" : ""}${Math.abs(total30dPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs font-mono text-[#8E9299] mt-1 flex items-center gap-1">
                <span className={`font-semibold ${is30dPositive ? "text-emerald-400" : "text-rose-400"}`}>
                  {is30dPositive ? "+" : ""}{total30dRoi.toFixed(2)}% ROI
                </span>
              </div>
            </div>

            {/* Position Value */}
            <div className="bg-[#141722]/80 border border-[#242a3d] rounded-2xl p-4">
              <div className="text-[11px] font-mono text-[#8E9299] flex items-center justify-between">
                <span>POSITION VALUE</span>
                <DollarSign className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
                ${holding.valueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs font-mono text-[#8E9299] mt-1">
                {holding.balanceFormatted} {holding.symbol}
              </div>
            </div>

            {/* 30-Day High / Low Mock Market Cap */}
            <div className="bg-[#141722]/80 border border-[#242a3d] rounded-2xl p-4">
              <div className="text-[11px] font-mono text-[#8E9299] flex items-center justify-between">
                <span>30D CAP RANGE</span>
                <Sparkles className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-white mt-1 truncate">
                {formatCurrency(maxMcap)}
              </div>
              <div className="text-xs font-mono text-[#8E9299] mt-1">
                Low: {formatCurrency(minMcap)}
              </div>
            </div>

            {/* Volatility Spikes Detected */}
            <div className="bg-[#141722]/80 border border-[#242a3d] rounded-2xl p-4">
              <div className="text-[11px] font-mono text-[#8E9299] flex items-center justify-between">
                <span>σ VOLATILITY</span>
                <Flame className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400 mt-1">
                {totalSpikesCount} Spikes
              </div>
              <div className="text-xs font-mono text-[#8E9299] mt-1 flex items-center gap-1">
                <span className="text-rose-400 font-semibold">Peak: {maxZScore}σ</span>
              </div>
            </div>

            {/* 14-DAY RSI MOMENTUM & BUY/SELL SIGNAL ZONE METRIC CARD */}
            <div
              className={`rounded-2xl p-4 col-span-2 md:col-span-1 border transition-all ${
                currentRsi < 20
                  ? "bg-emerald-950/45 border-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.35)]"
                  : currentRsi <= 30
                  ? "bg-emerald-950/30 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                  : currentRsi > 80
                  ? "bg-rose-950/45 border-rose-400 shadow-[0_0_24px_rgba(244,63,94,0.35)]"
                  : currentRsi >= 70
                  ? "bg-rose-950/30 border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.2)]"
                  : "bg-[#141722]/80 border-[#242a3d]"
              }`}
            >
              <div className="text-[11px] font-mono text-[#8E9299] flex items-center justify-between">
                <span>14D RSI SIGNAL ZONE</span>
                <Gauge
                  className={`w-4 h-4 ${
                    currentRsi >= 70 ? "text-rose-400" : currentRsi <= 30 ? "text-emerald-400" : "text-purple-400"
                  }`}
                />
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <div
                  className={`text-xl sm:text-2xl font-bold font-mono ${
                    currentRsi >= 70
                      ? "text-rose-400"
                      : currentRsi <= 30
                      ? "text-emerald-400"
                      : "text-purple-300"
                  }`}
                >
                  {currentRsi}
                </div>
                {/* Visual Flag Badge with Intensifying CSS Pulse Animation */}
                {(() => {
                  const intensity = getRsiSignalIntensity(currentRsi);
                  if (intensity.isBuy) {
                    return (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono flex items-center gap-1.5 transition-all ${intensity.badgeFullClass}`}
                        title={intensity.isExtreme ? "Intensified Pulse: Deep Oversold Zone (< 20)" : "Subtle Pulse: Oversold Zone (≤ 30)"}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full bg-emerald-400 ${intensity.isExtreme ? "animate-ping" : ""}`} />
                        <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                        <span>{intensity.badgeText}</span>
                      </span>
                    );
                  }
                  if (intensity.isSell) {
                    return (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono flex items-center gap-1.5 transition-all ${intensity.badgeFullClass}`}
                        title={intensity.isExtreme ? "Intensified Pulse: Deep Overbought Zone (> 80)" : "Subtle Pulse: Overbought Zone (≥ 70)"}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full bg-rose-400 ${intensity.isExtreme ? "animate-ping" : ""}`} />
                        <ArrowDownRight className="w-3 h-3 text-rose-400" />
                        <span>{intensity.badgeText}</span>
                      </span>
                    );
                  }
                  return (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-[#8E9299] bg-[#0e1017] border border-[#242a3d]">
                      HOLD / NEUTRAL
                    </span>
                  );
                })()}
              </div>
              <div className="text-xs font-mono mt-1 flex items-center justify-between gap-1 flex-wrap">
                {currentRsi > 80 ? (
                  <span className="text-rose-300 font-bold flex items-center gap-1">
                    <span>🔥 Deep Overbought (&gt;80) • Strong Sell</span>
                  </span>
                ) : currentRsi >= 70 ? (
                  <span className="text-rose-400 font-bold flex items-center gap-1">
                    <span>Overbought (≥70) • Take Profit</span>
                  </span>
                ) : currentRsi < 20 ? (
                  <span className="text-emerald-300 font-bold flex items-center gap-1">
                    <span>⚡ Deep Oversold (&lt;20) • Strong Buy</span>
                  </span>
                ) : currentRsi <= 30 ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span>Oversold (≤30) • Accumulate</span>
                  </span>
                ) : currentRsi >= 50 ? (
                  <span className="text-purple-300 font-medium">Bullish (&gt;50) • Range Bound</span>
                ) : (
                  <span className="text-amber-400 font-medium">Bearish (&lt;50) • Range Bound</span>
                )}

                {/* Direct Buy / Sell Action Button */}
                {onOpenGlobalSwapSell && (currentRsi <= 30 || currentRsi >= 70) && (
                  <button
                    type="button"
                    onClick={() => onOpenGlobalSwapSell(token || holding, currentRsi <= 30 ? "swap" : "sell")}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                      currentRsi < 20
                        ? "bg-emerald-400 hover:bg-emerald-300 text-black border-emerald-300 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                        : currentRsi <= 30
                        ? "bg-emerald-500 hover:bg-emerald-400 text-black border-emerald-400"
                        : currentRsi > 80
                        ? "bg-rose-500 hover:bg-rose-400 text-white border-rose-300 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.5)]"
                        : "bg-rose-500 hover:bg-rose-400 text-white border-rose-400"
                    }`}
                  >
                    {currentRsi < 20 ? "Execute Strong Buy" : currentRsi <= 30 ? "Execute Buy" : currentRsi > 80 ? "Execute Strong Sell" : "Execute Sell"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Chart Canvas Card with RSI Oscillator */}
          <div className="bg-[#141722]/50 border border-[#1f2433] rounded-2xl p-5 space-y-4">
            {/* Chart Toolbar & Metric Switcher */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-[#1f2433] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold font-mono text-sm text-white">
                    30-Day Multi-Dimensional Performance Breakdown
                  </span>
                </div>
                <p className="text-xs text-[#8E9299] font-mono mt-0.5">
                  Synchronized price momentum &amp; 14-day Relative Strength Index (RSI) oscillator
                </p>
              </div>

              {/* Metric View Mode Buttons & RSI Toggle */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowRsiOscillator(!showRsiOscillator)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                    showRsiOscillator
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                      : "bg-[#0e1017] text-[#8E9299] hover:text-white border border-[#242a3d]"
                  }`}
                  title="Toggle 14-day RSI Oscillator Sub-Chart"
                >
                  <Gauge className="w-3.5 h-3.5" />
                  <span>RSI Panel: {showRsiOscillator ? "ON" : "OFF"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowInlineDom(!showInlineDom)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                    showInlineDom
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "bg-[#0e1017] text-[#8E9299] hover:text-white border border-[#242a3d]"
                  }`}
                  title="Toggle Depth of Market Order Book Pressure visualizer"
                >
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>DOM Book: {showInlineDom ? "ON" : "OFF"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSlippageSim(!showSlippageSim)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                    showSlippageSim
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                      : "bg-[#0e1017] text-[#8E9299] hover:text-white border border-[#242a3d]"
                  }`}
                  title="Toggle Slippage Sensitivity Simulator"
                >
                  <Scale className="w-3.5 h-3.5 text-purple-400" />
                  <span>Slippage Sim: {showSlippageSim ? "ON" : "OFF"}</span>
                </button>

                <div className="flex items-center bg-[#0e1017] border border-[#242a3d] p-0.5 rounded-xl font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveMetricView("pnl")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      activeMetricView === "pnl" ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30" : "text-[#8E9299] hover:text-white"
                    }`}
                  >
                    PnL ($)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMetricView("mcap")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      activeMetricView === "mcap" ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30" : "text-[#8E9299] hover:text-white"
                    }`}
                  >
                    Market Cap
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMetricView("price")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      activeMetricView === "price" ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30" : "text-[#8E9299] hover:text-white"
                    }`}
                  >
                    Price
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMetricView("volatility")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      activeMetricView === "volatility" ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30" : "text-[#8E9299] hover:text-white"
                    }`}
                  >
                    Vol (σ)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMetricView("rsi")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      activeMetricView === "rsi" ? "bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30" : "text-[#8E9299] hover:text-white"
                    }`}
                  >
                    RSI (14)
                  </button>
                </div>
              </div>
            </div>

            {/* Primary D3 SVG Canvas Container */}
            <div ref={chartContainerRef} className="w-full relative" style={{ height: chartHeight }}>
              <svg ref={svgRef} width={chartWidth} height={chartHeight} className="w-full h-full block overflow-visible select-none" />
            </div>

            {/* Dedicated 14-Day Relative Strength Index (RSI) Oscillator Sub-Chart */}
            {showRsiOscillator && (
              <div className="pt-2 border-t border-[#1f2433] space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Gauge className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-white">
                      Relative Strength Index (14-Day RSI Oscillator)
                    </span>
                    {/* Live Active Signal Tag with Intensifying CSS Pulse Animation */}
                    {(() => {
                      const intensity = getRsiSignalIntensity(currentRsi);
                      if (intensity.isBuy) {
                        return (
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] border flex items-center gap-1.5 transition-all ${intensity.badgeFullClass}`}
                            title={intensity.isExtreme ? "Intensified Pulse: Deep Oversold (< 20)" : "Subtle Pulse: Oversold (≤ 30)"}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full bg-emerald-400 ${intensity.isExtreme ? "animate-ping" : ""}`} />
                            <Zap className="w-3 h-3 text-emerald-400" />
                            <span>{intensity.isExtreme ? "ACTIVE INTENSE BUY SIGNAL (<20)" : "ACTIVE BUY SIGNAL (≤30)"}</span>
                          </span>
                        );
                      }
                      if (intensity.isSell) {
                        return (
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] border flex items-center gap-1.5 transition-all ${intensity.badgeFullClass}`}
                            title={intensity.isExtreme ? "Intensified Pulse: Deep Overbought (> 80)" : "Subtle Pulse: Overbought (≥ 70)"}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full bg-rose-400 ${intensity.isExtreme ? "animate-ping" : ""}`} />
                            <Flame className="w-3 h-3 text-rose-400" />
                            <span>{intensity.isExtreme ? "ACTIVE INTENSE SELL SIGNAL (>80)" : "ACTIVE SELL SIGNAL (≥70)"}</span>
                          </span>
                        );
                      }
                      return (
                        <span className="px-2 py-0.5 rounded-full text-[10px] text-[#8E9299] bg-[#0e1017] border border-[#242a3d]">
                          NEUTRAL / HOLD
                        </span>
                      );
                    })()}

                    {/* Dynamic Momentum Pattern Tag */}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                      <span>{rsiTrendAnalysis.patternEmoji}</span>
                      <span>{rsiTrendAnalysis.patternLabel}</span>
                    </span>
                  </div>

                  {/* Signal Zones Legend & 30D Trigger Counts */}
                  <div className="flex items-center gap-2 text-[11px] flex-wrap">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-rsi-sell-subtle" />
                      <span>SELL (≥70)</span>
                      <span className="text-[10px] text-rose-400 font-mono">({sellSignalsCount})</span>
                      {deepSellSignalsCount > 0 && (
                        <span className="px-1 py-0.2 rounded text-[9px] bg-rose-500/30 text-rose-200 border border-rose-400 animate-rsi-sell-intense font-bold">
                          {deepSellSignalsCount} &gt;80🔥
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#141722] text-[#8E9299] border border-[#242a3d]">
                      <span className="w-2 h-2 rounded-full bg-slate-500/60" />
                      <span>MID (50)</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-rsi-buy-subtle" />
                      <span>BUY (≤30)</span>
                      <span className="text-[10px] text-emerald-400 font-mono">({buySignalsCount})</span>
                      {deepBuySignalsCount > 0 && (
                        <span className="px-1 py-0.2 rounded text-[9px] bg-emerald-500/30 text-emerald-200 border border-emerald-400 animate-rsi-buy-intense font-bold">
                          {deepBuySignalsCount} &lt;20⚡
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dynamic Trend Lines Control Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-[#0e1017] border border-[#1f2433] text-xs font-mono">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setShowRsiTrendLines(!showRsiTrendLines)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        showRsiTrendLines
                          ? "bg-purple-500/20 text-purple-200 border border-purple-500/50"
                          : "bg-[#141722] text-[#8E9299] border border-[#242a3d]"
                      }`}
                      title="Toggle dynamic trend lines connecting historical RSI peaks and troughs"
                    >
                      <Sliders className="w-3.5 h-3.5 text-purple-400" />
                      <span>Dynamic Trend Lines: {showRsiTrendLines ? "ON" : "OFF"}</span>
                    </button>

                    {showRsiTrendLines && (
                      <div className="flex items-center gap-1 bg-[#141722] p-0.5 rounded-lg border border-[#242a3d]">
                        <button
                          type="button"
                          onClick={() => setRsiTrendLineMode("both")}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                            rsiTrendLineMode === "both"
                              ? "bg-purple-600 text-white font-bold"
                              : "text-[#8E9299] hover:text-white"
                          }`}
                        >
                          All ({localMaxima.length + localMinima.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setRsiTrendLineMode("maxima")}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                            rsiTrendLineMode === "maxima"
                              ? "bg-rose-600 text-white font-bold"
                              : "text-rose-400/80 hover:text-rose-300"
                          }`}
                        >
                          <span>▲ Resistance ({localMaxima.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRsiTrendLineMode("minima")}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                            rsiTrendLineMode === "minima"
                              ? "bg-emerald-600 text-white font-bold"
                              : "text-emerald-400/80 hover:text-emerald-300"
                          }`}
                        >
                          <span>▼ Support ({localMinima.length})</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Trend Slopes & Momentum Velocity */}
                  <div className="flex items-center gap-2.5 text-[11px] text-[#8E9299] flex-wrap">
                    <span className="flex items-center gap-1 text-rose-300 font-semibold" title="Rate of change connecting local RSI maxima (peaks)">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                      <span>Peaks Slope:</span>
                      <strong className="text-white">{rsiTrendAnalysis.maximaSlope > 0 ? "+" : ""}{rsiTrendAnalysis.maximaSlope}/d</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-emerald-300 font-semibold" title="Rate of change connecting local RSI minima (troughs)">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Troughs Slope:</span>
                      <strong className="text-white">{rsiTrendAnalysis.minimaSlope > 0 ? "+" : ""}{rsiTrendAnalysis.minimaSlope}/d</strong>
                    </span>
                    <span>•</span>
                    <span className="text-purple-300 font-medium">
                      Projected: <strong className="text-rose-400">{rsiTrendAnalysis.projectedCurrentResistance}</strong> / <strong className="text-emerald-400">{rsiTrendAnalysis.projectedCurrentSupport}</strong>
                    </span>
                  </div>
                </div>

                {/* RSI SVG Canvas Container */}
                <div className="w-full bg-[#0e1017] border border-[#1f2433] rounded-xl relative overflow-hidden" style={{ height: rsiHeight }}>
                  <svg ref={rsiSvgRef} width={chartWidth} height={rsiHeight} className="w-full h-full block overflow-visible select-none" />
                </div>

                {/* Dynamic Momentum Pattern Insight Card */}
                {showRsiTrendLines && (
                  <div className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-purple-950/20 via-[#0e1017] to-cyan-950/20 border border-purple-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 font-mono text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base">{rsiTrendAnalysis.patternEmoji}</span>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white tracking-tight">
                            {rsiTrendAnalysis.patternLabel}
                          </span>
                          <span className="px-2 py-0.2 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {rsiTrendAnalysis.divergenceStatus.replace("_", " ").toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8E9299]">
                          {rsiTrendAnalysis.patternDescription}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] bg-[#141722]/80 px-3 py-1.5 rounded-lg border border-[#242a3d] shrink-0">
                      <div>
                        <div className="text-[9px] text-[#8E9299]">RESISTANCE CEILING:</div>
                        <div className="font-bold text-rose-400">{rsiTrendAnalysis.projectedCurrentResistance} RSI</div>
                      </div>
                      <div className="w-[1px] h-6 bg-[#242a3d]" />
                      <div>
                        <div className="text-[9px] text-[#8E9299]">SUPPORT FLOOR:</div>
                        <div className="font-bold text-emerald-400">{rsiTrendAnalysis.projectedCurrentSupport} RSI</div>
                      </div>
                      <div className="w-[1px] h-6 bg-[#242a3d]" />
                      <div>
                        <div className="text-[9px] text-[#8E9299]">DYNAMIC SPREAD:</div>
                        <div className="font-bold text-purple-300">
                          {(rsiTrendAnalysis.projectedCurrentResistance - rsiTrendAnalysis.projectedCurrentSupport).toFixed(1)} pts
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Active / Hovered Point Inspector Banner */}
            {activeRecord && (
              <div className="bg-[#0e1017] border border-[#242a3d] rounded-xl p-4 font-mono text-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[#8E9299] text-[10px]">SELECTED DATA POINT:</div>
                    <div className="text-white font-bold text-sm">
                      {activeRecord.dateFormatted} <span className="text-[#8E9299] font-normal">({activeRecord.dayLabel})</span>
                    </div>
                  </div>
                </div>

                {/* Point PnL */}
                <div>
                  <div className="text-[#8E9299] text-[10px]">NET PnL ($ / %):</div>
                  <div className={`font-bold text-sm ${activeRecord.pnlUsd >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {activeRecord.pnlUsd >= 0 ? "+" : ""}${activeRecord.pnlUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {" "}({activeRecord.pnlPercent >= 0 ? "+" : ""}{activeRecord.pnlPercent.toFixed(2)}%)
                  </div>
                </div>

                {/* Market Cap at Point */}
                <div>
                  <div className="text-[#8E9299] text-[10px]">MOCK MARKET CAP:</div>
                  <div className="text-white font-bold text-sm">{formatCurrency(activeRecord.marketCap)}</div>
                </div>

                {/* 14-Day RSI Oscillator Condition & Signal Zone */}
                <div>
                  <div className="text-[#8E9299] text-[10px]">14D RSI &amp; MOMENTUM PIVOT:</div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span
                      className={`font-bold text-sm ${
                        activeRecord.isSellSignal
                          ? "text-rose-400"
                          : activeRecord.isBuySignal
                          ? "text-emerald-400"
                          : "text-purple-300"
                      }`}
                    >
                      {activeRecord.rsi14}
                    </span>
                    {(() => {
                      const intensity = getRsiSignalIntensity(activeRecord.rsi14);
                      if (intensity.isBuy) {
                        return (
                          <span
                            className={`px-2.5 py-0.5 rounded text-[10px] border flex items-center gap-1.5 transition-all ${intensity.badgeFullClass}`}
                            title={intensity.isExtreme ? "Intense Pulse: Deep Oversold Zone (< 20)" : "Subtle Pulse: Oversold Zone (≤ 30)"}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full bg-emerald-400 ${intensity.isExtreme ? "animate-ping" : ""}`} />
                            <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                            <span>{intensity.isExtreme ? "STRONG BUY (Oversold <20)" : "BUY SIGNAL (Oversold ≤30)"}</span>
                          </span>
                        );
                      }
                      if (intensity.isSell) {
                        return (
                          <span
                            className={`px-2.5 py-0.5 rounded text-[10px] border flex items-center gap-1.5 transition-all ${intensity.badgeFullClass}`}
                            title={intensity.isExtreme ? "Intense Pulse: Deep Overbought Zone (> 80)" : "Subtle Pulse: Overbought Zone (≥ 70)"}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full bg-rose-400 ${intensity.isExtreme ? "animate-ping" : ""}`} />
                            <ArrowDownRight className="w-3 h-3 text-rose-400" />
                            <span>{intensity.isExtreme ? "STRONG SELL (Overbought >80)" : "SELL SIGNAL (Overbought ≥70)"}</span>
                          </span>
                        );
                      }
                      return (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#141722] text-[#8E9299] border border-[#242a3d]">
                          Hold ({activeRecord.rsiMomentum})
                        </span>
                      );
                    })()}

                    {/* Historical Extremum Pivot Badge */}
                    {activeRecord.isRsiLocalPeak && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                        <span>▲</span>
                        <span>{activeRecord.rsiExtremumLabel || "Local Peak"}</span>
                      </span>
                    )}
                    {activeRecord.isRsiLocalTrough && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                        <span>▼</span>
                        <span>{activeRecord.rsiExtremumLabel || "Local Trough"}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Volatility Z-Score */}
                <div>
                  <div className="text-[#8E9299] text-[10px]">VOLATILITY INDEX:</div>
                  <div
                    className={`font-bold text-sm flex items-center gap-1 ${
                      activeRecord.zScore >= 2.5
                        ? "text-rose-400"
                        : activeRecord.zScore >= 1.8
                        ? "text-amber-400"
                        : "text-cyan-300"
                    }`}
                  >
                    <span>{activeRecord.zScore}σ</span>
                    <span className="text-[10px] uppercase font-normal text-[#8E9299]">({activeRecord.volatilityBand})</span>
                    {activeRecord.isSpike && <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Depth of Market (DOM) Liquidity Visualizer Module (Zoom & Pan, Histogram, Market Sentiment) */}
          {showInlineDom && holding && (
            <div className="bg-[#141722]/60 border border-[#1f2433] rounded-2xl p-4 sm:p-5 shadow-xl">
              <DepthOfMarketVisualizer
                holding={holding}
                token={token}
                currentMarketCap={activeRecord ? activeRecord.marketCap : (holding.valueUsd * 250 || 1_000_000)}
                currentPrice={activeRecord ? activeRecord.tokenPrice : holding.priceUsd}
                currentRsi={activeRecord ? activeRecord.rsi14 : currentRsi}
                rsiCondition={activeRecord ? activeRecord.rsiCondition : currentRsiCondition}
                rsiMomentum={activeRecord ? activeRecord.rsiMomentum : "neutral"}
                volatilityZScore={activeRecord ? activeRecord.zScore : (maxZScore || 1.0)}
                volatilityBand={activeRecord ? activeRecord.volatilityBand : "moderate"}
                onOpenGlobalSwapSell={onOpenGlobalSwapSell}
              />
            </div>
          )}

          {/* Standalone Slippage Sensitivity Simulator Module (when showSlippageSim is toggled ON and inline DOM is closed) */}
          {showSlippageSim && modalMainTab !== "slippage" && !showInlineDom && holding && (
            <div className="bg-[#141722]/60 border border-[#1f2433] rounded-2xl p-4 sm:p-5 shadow-xl">
              <SlippageSensitivitySimulator
                holding={holding}
                token={token}
                currentMarketCap={activeRecord ? activeRecord.marketCap : (holding.valueUsd * 250 || 1_000_000)}
                currentPrice={activeRecord ? activeRecord.tokenPrice : holding.priceUsd}
                onOpenGlobalSwapSell={onOpenGlobalSwapSell}
              />
            </div>
          )}

          {/* 30-Day Historical Data Table with RSI Column & Signal Filtering */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-[#8E9299]">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  30-Day Daily Historical Audit Ledger
                </span>
                <span className="text-[#8E9299]">({filteredTableDataset.length} of {dataset.length} Days)</span>
              </div>

              {/* Table Quick Filters for Signals, Pivots & Spikes */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setTableFilter("all")}
                  className={`px-2 py-1 rounded-lg text-[11px] transition-all cursor-pointer ${
                    tableFilter === "all"
                      ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30"
                      : "bg-[#141722] text-[#8E9299] hover:text-white border border-[#242a3d]"
                  }`}
                >
                  All ({dataset.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTableFilter("buy")}
                  className={`px-2 py-1 rounded-lg text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                    tableFilter === "buy"
                      ? "bg-emerald-500/30 text-emerald-200 font-bold border border-emerald-500"
                      : "bg-[#141722] text-emerald-400/80 hover:text-emerald-300 border border-emerald-500/30"
                  }`}
                  title="Filter to only days in the RSI Buy Signal Zone (≤ 30)"
                >
                  <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                  <span>Buy ({buySignalsCount})</span>
                  {deepBuySignalsCount > 0 && (
                    <span className="px-1 rounded text-[9px] bg-emerald-500/30 text-emerald-200 border border-emerald-400 animate-rsi-buy-intense font-bold">
                      {deepBuySignalsCount} &lt;20
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setTableFilter("sell")}
                  className={`px-2 py-1 rounded-lg text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                    tableFilter === "sell"
                      ? "bg-rose-500/30 text-rose-200 font-bold border border-rose-500"
                      : "bg-[#141722] text-rose-400/80 hover:text-rose-300 border border-rose-500/30"
                  }`}
                  title="Filter to only days in the RSI Sell Signal Zone (≥ 70)"
                >
                  <ArrowDownRight className="w-3 h-3 text-rose-400" />
                  <span>Sell ({sellSignalsCount})</span>
                  {deepSellSignalsCount > 0 && (
                    <span className="px-1 rounded text-[9px] bg-rose-500/30 text-rose-200 border border-rose-400 animate-rsi-sell-intense font-bold">
                      {deepSellSignalsCount} &gt;80
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setTableFilter("peaks")}
                  className={`px-2 py-1 rounded-lg text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                    tableFilter === "peaks"
                      ? "bg-purple-500/30 text-purple-200 font-bold border border-purple-500"
                      : "bg-[#141722] text-rose-300/80 hover:text-rose-200 border border-[#242a3d]"
                  }`}
                  title="Filter to historical RSI local maxima (swing peaks)"
                >
                  <span>▲ Peaks ({localMaxima.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTableFilter("troughs")}
                  className={`px-2 py-1 rounded-lg text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                    tableFilter === "troughs"
                      ? "bg-emerald-500/30 text-emerald-200 font-bold border border-emerald-500"
                      : "bg-[#141722] text-emerald-300/80 hover:text-emerald-200 border border-[#242a3d]"
                  }`}
                  title="Filter to historical RSI local minima (swing troughs)"
                >
                  <span>▼ Troughs ({localMinima.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTableFilter("spikes")}
                  className={`px-2 py-1 rounded-lg text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                    tableFilter === "spikes"
                      ? "bg-amber-500/30 text-amber-200 font-bold border border-amber-500"
                      : "bg-[#141722] text-amber-400/80 hover:text-amber-300 border border-amber-500/30"
                  }`}
                  title="Filter to only days with standard deviation volatility spikes"
                >
                  <Flame className="w-3 h-3 text-amber-400" />
                  <span>Spikes ({totalSpikesCount})</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#1f2433] bg-[#0e1017]">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#1f2433] bg-[#141722] text-[#8E9299]">
                    <th className="py-2.5 px-3">TIMEFRAME</th>
                    <th className="py-2.5 px-3">MOCK MARKET CAP</th>
                    <th className="py-2.5 px-3">TOKEN PRICE</th>
                    <th className="py-2.5 px-3">POSITION VALUE</th>
                    <th className="py-2.5 px-3">NET PnL ($)</th>
                    <th className="py-2.5 px-3">ROI (%)</th>
                    <th className="py-2.5 px-3">14D RSI SIGNAL ZONE</th>
                    <th className="py-2.5 px-3">DAILY CHANGE</th>
                    <th className="py-2.5 px-3 text-right">VOLATILITY (σ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f2433]">
                  {filteredTableDataset.map((d) => {
                    const isSelected = selectedDayIndex === d.dayIndex;
                    const isPos = d.pnlUsd >= 0;

                    return (
                      <tr
                        key={d.dayIndex}
                        onClick={() => setSelectedDayIndex(d.dayIndex)}
                        className={`hover:bg-[#141722] transition-colors cursor-pointer ${
                          isSelected ? "bg-cyan-500/10 border-l-2 border-cyan-400" : ""
                        }`}
                      >
                        {/* Date */}
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{d.dateFormatted}</span>
                            {d.dayIndex === 0 && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Latest
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#8E9299]">{d.dayLabel}</div>
                        </td>

                        {/* Market Cap */}
                        <td className="py-2.5 px-3 font-semibold text-white">
                          {formatCurrency(d.marketCap)}
                        </td>

                        {/* Price */}
                        <td className="py-2.5 px-3 text-white">
                          ${d.tokenPrice >= 1 ? d.tokenPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : d.tokenPrice.toFixed(6)}
                        </td>

                        {/* Value */}
                        <td className="py-2.5 px-3 font-semibold text-white">
                          ${d.positionValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* PnL */}
                        <td className="py-2.5 px-3 font-bold">
                          <span className={isPos ? "text-emerald-400" : "text-rose-400"}>
                            {isPos ? "+" : ""}${d.pnlUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>

                        {/* ROI */}
                        <td className="py-2.5 px-3 font-bold">
                          <span className={isPos ? "text-emerald-400" : "text-rose-400"}>
                            {isPos ? "+" : ""}{d.pnlPercent.toFixed(2)}%
                          </span>
                        </td>

                        {/* 14D RSI Column with Buy/Sell Signal Zone & Peak/Trough Badge */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(() => {
                              const intensity = getRsiSignalIntensity(d.rsi14);
                              if (intensity.isBuy) {
                                return (
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] inline-flex items-center gap-1 shadow-sm transition-all ${intensity.badgeFullClass}`}
                                    title={intensity.isExtreme ? "Intense Pulse: Deep Oversold (< 20)" : "Subtle Pulse: Oversold (≤ 30)"}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full bg-emerald-400 ${intensity.isExtreme ? "animate-ping" : ""}`} />
                                    <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                                    <span>{intensity.isExtreme ? "BUY <20" : "BUY"} ({d.rsi14})</span>
                                  </span>
                                );
                              }
                              if (intensity.isSell) {
                                return (
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] inline-flex items-center gap-1 shadow-sm transition-all ${intensity.badgeFullClass}`}
                                    title={intensity.isExtreme ? "Intense Pulse: Deep Overbought (> 80)" : "Subtle Pulse: Overbought (≥ 70)"}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full bg-rose-400 ${intensity.isExtreme ? "animate-ping" : ""}`} />
                                    <ArrowDownRight className="w-3 h-3 text-rose-400" />
                                    <span>{intensity.isExtreme ? "SELL >80" : "SELL"} ({d.rsi14})</span>
                                  </span>
                                );
                              }
                              return (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#141722] text-[#8E9299] border border-[#242a3d] inline-flex items-center gap-1">
                                  <span>{d.rsi14}</span>
                                  <span className="text-[9px] text-[#5d6373]">Hold</span>
                                </span>
                              );
                            })()}

                            {d.isRsiLocalPeak && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                ▲ Peak
                              </span>
                            )}
                            {d.isRsiLocalTrough && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                ▼ Trough
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Daily Return */}
                        <td className="py-2.5 px-3">
                          <span className={d.dailyReturnPercent >= 0 ? "text-emerald-400" : "text-rose-400"}>
                            {d.dailyReturnPercent >= 0 ? "+" : ""}{d.dailyReturnPercent.toFixed(2)}%
                          </span>
                        </td>

                        {/* Volatility */}
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              d.zScore >= 2.5
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : d.zScore >= 1.8
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-[#141722] text-[#8E9299]"
                            }`}
                          >
                            {d.isSpike && <Flame className="w-2.5 h-2.5" />}
                            <span>{d.zScore}σ</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredTableDataset.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-[#8E9299]">
                        <div className="flex flex-col items-center justify-center gap-1.5 font-mono text-xs">
                          <Gauge className="w-6 h-6 text-[#475569]" />
                          <span>No records matched filter "{tableFilter}".</span>
                          <button
                            type="button"
                            onClick={() => setTableFilter("all")}
                            className="text-cyan-400 hover:underline mt-1 cursor-pointer"
                          >
                            Reset filter to view all {dataset.length} days
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer Bar */}
        <div className="p-4 sm:p-5 border-t border-[#1f2433] bg-[#0e1017] flex flex-wrap items-center justify-between gap-3 relative z-10 font-mono text-xs">
          <div className="flex items-center gap-2 flex-wrap text-[#8E9299]">
            <span>Active Asset: <strong className="text-white">{holding.symbol}</strong></span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <span>14D RSI:</span>
              <strong className={currentRsi <= 30 ? "text-emerald-400" : currentRsi >= 70 ? "text-rose-400" : "text-purple-300"}>
                {currentRsi}
              </strong>
              {currentRsi <= 30 ? (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  BUY ZONE (Oversold)
                </span>
              ) : currentRsi >= 70 ? (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  SELL ZONE (Overbought)
                </span>
              ) : (
                <span className="text-[#8E9299]">({currentRsiSignalLabel})</span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenGlobalSwapSell && (currentRsi <= 30 || currentRsi >= 70) && (
              <button
                type="button"
                onClick={() => onOpenGlobalSwapSell(token || holding, currentRsi <= 30 ? "swap" : "sell")}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentRsi <= 30
                    ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                    : "bg-rose-500 hover:bg-rose-400 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                }`}
              >
                {currentRsi <= 30 ? (
                  <>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Execute Buy (Oversold)</span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    <span>Execute Sell (Overbought)</span>
                  </>
                )}
              </button>
            )}

            {onWatchToken && !holding.isNative && (
              <button
                type="button"
                onClick={() => onWatchToken(holding)}
                className="px-3 py-1.5 rounded-xl bg-[#141722] hover:bg-[#1a1e2c] border border-[#242a3d] text-white transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>Watch in MetaMask</span>
              </button>
            )}

            {onSendToken && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSendToken(holding);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Transfer Asset</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
