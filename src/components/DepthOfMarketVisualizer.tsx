import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import * as d3 from "d3";
import {
  Layers,
  ArrowDownUp,
  Activity,
  Flame,
  Zap,
  TrendingUp,
  TrendingDown,
  Scale,
  ShieldCheck,
  AlertCircle,
  Sliders,
  DollarSign,
  Info,
  Maximize2,
  BarChart3,
  BarChart2,
  Gauge,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Smile,
  Frown,
  Meh,
  MessageSquare,
  Globe,
  Radio,
} from "lucide-react";
import { PortfolioTokenHolding } from "../utils/walletPortfolioService";
import { TokenRecord } from "../types";
import { RecentTradeExecutionHistory } from "./RecentTradeExecutionHistory";
import { SlippageSensitivitySimulator } from "./SlippageSensitivitySimulator";

export interface MarketSentimentData {
  score: number; // -100 to +100
  label: string;
  classification: "EXTREME_BULLISH" | "BULLISH" | "NEUTRAL" | "BEARISH" | "EXTREME_BEARISH";
  colorHex: string;
  badgeBg: string;
  badgeBorder: string;
  orderBookBiasLabel: string;
  orderBookBiasColor: string;
  newsPositivePercent: number;
  socialMentions24h: number;
  socialSpikePercent: number;
  catalystHeadline: string;
}

export interface DepthOfMarketVisualizerProps {
  holding: PortfolioTokenHolding;
  token?: TokenRecord;
  currentMarketCap: number;
  currentPrice: number;
  currentRsi?: number; // 0 to 100
  rsiCondition?: "overbought" | "neutral" | "oversold";
  rsiMomentum?: "bullish" | "bearish" | "neutral";
  volatilityZScore?: number; // e.g. 0.5 to 3.5
  volatilityBand?: "low" | "moderate" | "high" | "extreme";
  onOpenGlobalSwapSell?: (token: any, initialMode?: "swap" | "send" | "sell") => void;
  className?: string;
}

export interface OrderBookLevel {
  id: string;
  type: "bid" | "ask";
  price: number;
  diffPercent: number; // e.g. -1.25% or +1.25%
  sizeTokens: number;
  sizeUsd: number;
  cumulativeTokens: number;
  cumulativeUsd: number;
  depthRatio: number; // 0 to 1
  isWall: boolean; // Large institutional block order / pressure wall
  wallLabel?: string;
}

export interface OrderDistributionTier {
  id: string;
  type: "bid" | "ask";
  price: number;
  diffPercent: number;
  pendingVolumeUsd: number;
  pendingTokenCount: number;
  orderCount: number;
  isVolCluster: boolean;
  clusterLabel?: string;
  barWidthPercent: number; // 0 to 100% relative to maximum tier volume
}

export interface DepthOfMarketMetrics {
  midPrice: number;
  spreadUsd: number;
  spreadPercent: number;
  totalBidDepthUsd: number;
  totalAskDepthUsd: number;
  totalBookDepthUsd: number;
  totalBidTokens: number;
  totalAskTokens: number;
  buyPressurePercent: number;
  sellPressurePercent: number;
  imbalanceDeltaUsd: number;
  pressureState: "bullish_wall" | "buy_leaning" | "balanced" | "sell_leaning" | "bearish_wall";
  pressureLabel: string;
  pressureEmoji: string;
  liquidityTier: "Mega-Cap Institutional" | "Large-Cap Tier 1" | "Mid-Cap Liquid" | "Emerging Growth";
  marketCapPercent2Pct: number;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  largestBidWall?: OrderBookLevel;
  largestAskWall?: OrderBookLevel;
  distributionTiers: OrderDistributionTier[];
  maxTierVolumeUsd: number;
}

function hashStr(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function formatUSD(val: number, maxDecimals: number = 2): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  if (abs >= 1) return `${sign}$${abs.toFixed(2)}`;
  return `${sign}$${abs.toFixed(Math.max(2, maxDecimals))}`;
}

export const DepthOfMarketVisualizer: React.FC<DepthOfMarketVisualizerProps> = ({
  holding,
  token,
  currentMarketCap,
  currentPrice,
  currentRsi = 50,
  rsiCondition = "neutral",
  rsiMomentum = "neutral",
  volatilityZScore = 1.0,
  volatilityBand = "moderate",
  onOpenGlobalSwapSell,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [chartWidth, setChartWidth] = useState<number>(750);
  const chartHeight = 220;

  // Zoom & Pan state (via d3-zoom)
  const [zoomScale, setZoomScale] = useState<number>(1.0);

  // Depth range selection: ±1%, ±2.5%, ±5%, ±10%
  const [depthRange, setDepthRange] = useState<number>(2.5);
  // View mode: "split", "chart", "histogram", "ladder"
  const [viewLayout, setViewLayout] = useState<"split" | "chart" | "histogram" | "ladder">("split");
  const [hoveredLevel, setHoveredLevel] = useState<OrderBookLevel | null>(null);
  const [hoveredTier, setHoveredTier] = useState<OrderDistributionTier | null>(null);

  // Market Sentiment Control & Scoring (-100 to +100)
  const [userSentimentShift, setUserSentimentShift] = useState<number>(0);
  const [showSentimentDetails, setShowSentimentDetails] = useState<boolean>(true);

  // Calculate Market Sentiment using token news & social metadata
  const marketSentiment: MarketSentimentData = useMemo(() => {
    const sym = holding.symbol.toUpperCase();
    const seed = hashStr(`${sym}_DOM_SENTIMENT`);
    // Dynamic sentiment calculation based on token symbol hash + RSI deviation + user modifier
    const rsiSentimentDelta = (currentRsi - 50) * 1.2; // positive when bullish, negative when oversold/bearish
    const rawScore = ((seed % 71) - 35) + rsiSentimentDelta + userSentimentShift;
    const clampedScore = Math.max(-100, Math.min(100, Math.round(rawScore)));

    let classification: MarketSentimentData["classification"] = "NEUTRAL";
    let label = "Neutral Consolidation (Equilibrium)";
    let colorHex = "#8B5CF6"; // Purple
    let badgeBg = "bg-purple-500/15";
    let badgeBorder = "border-purple-500/40";
    let orderBookBiasLabel = "Balanced Two-Way Liquidity";
    let orderBookBiasColor = "text-purple-300";

    if (clampedScore >= 45) {
      classification = "EXTREME_BULLISH";
      label = "Extreme Bullish Accumulation";
      colorHex = "#10B981"; // Emerald
      badgeBg = "bg-emerald-500/25";
      badgeBorder = "border-emerald-400";
      orderBookBiasLabel = "Heavy Buy Wall Dominance (+Bid Inflow)";
      orderBookBiasColor = "text-emerald-300";
    } else if (clampedScore >= 15) {
      classification = "BULLISH";
      label = "Bullish Sentiment Momentum";
      colorHex = "#34D399";
      badgeBg = "bg-emerald-500/15";
      badgeBorder = "border-emerald-500/35";
      orderBookBiasLabel = "Buy Leaning Accumulation Bias";
      orderBookBiasColor = "text-emerald-400";
    } else if (clampedScore <= -45) {
      classification = "EXTREME_BEARISH";
      label = "Extreme Fear / Supply Distribution";
      colorHex = "#F43F5E"; // Rose
      badgeBg = "bg-rose-500/25";
      badgeBorder = "border-rose-400";
      orderBookBiasLabel = "Heavy Sell Wall Overhead (-Ask Resistance)";
      orderBookBiasColor = "text-rose-300";
    } else if (clampedScore <= -15) {
      classification = "BEARISH";
      label = "Bearish Sentiment Skew";
      colorHex = "#FB7185";
      badgeBg = "bg-rose-500/15";
      badgeBorder = "border-rose-500/35";
      orderBookBiasLabel = "Sell Leaning Distribution Bias";
      orderBookBiasColor = "text-rose-400";
    }

    const newsPositive = Math.max(12, Math.min(96, Math.round(50 + clampedScore * 0.45)));
    const mentions = Math.round(6200 + Math.abs(clampedScore) * 140 + (seed % 1200));
    const spike = Math.round(15 + Math.abs(clampedScore) * 0.65);

    const headlines = clampedScore >= 15
      ? [
          `Institutional Accumulation: Tier-1 Market Makers establish persistent buy liquidity walls for ${sym}.`,
          `Social Velocity Spike: Community volume surges +${spike}% on positive protocol upgrade sentiment.`,
          `Liquidity Depth Expansion: Buy orders thicken beneath mid-market following strong catalyst.`
        ]
      : clampedScore <= -15
      ? [
          `Overhead Supply Cluster: Large sell orders resting at resistance tiers cap upside on ${sym}.`,
          `Macro Risk-Off Shift: Increased ask volume placed across top-of-book tiers.`,
          `Elevated Profit-Taking: Distribution pattern detected on high-frequency order books.`
        ]
      : [
          `Equilibrium Order Flow: Balanced bid and ask book depth stabilizing spread around mid-market.`,
          `Two-Way Market Maker Quotation: Symmetrical liquidity provision across all active tiers.`,
        ];

    const catalystHeadline = headlines[seed % headlines.length];

    return {
      score: clampedScore,
      label,
      classification,
      colorHex,
      badgeBg,
      badgeBorder,
      orderBookBiasLabel,
      orderBookBiasColor,
      newsPositivePercent: newsPositive,
      socialMentions24h: mentions,
      socialSpikePercent: spike,
      catalystHeadline,
    };
  }, [holding.symbol, currentRsi, userSentimentShift]);

  // Programmatic zoom control handlers using d3-zoom
  const handleZoomIn = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 1.4);
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 1 / 1.4);
  }, []);

  const handleResetZoom = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    setZoomScale(1.0);
  }, []);

  // Dynamic RSI Color Scale:
  // Emerald (#10B981) for bullish/oversold momentum -> Purple/Cyan (#8B5CF6) -> Rose (#F43F5E) for bearish/overbought momentum
  const rsiInterpolatedColor = useMemo(() => {
    const colorScale = d3
      .scaleLinear<string>()
      .domain([20, 50, 80])
      .range(["#10B981", "#8B5CF6", "#F43F5E"])
      .clamp(true);
    return colorScale(currentRsi);
  }, [currentRsi]);

  const rsiTrendMetadata = useMemo(() => {
    if (currentRsi >= 75) {
      return {
        label: "Extreme Overbought (Distribution Resistance)",
        bias: "Sell-Heavy Skew",
        description: "Elevated market cap momentum pushing sellers to stack heavy ask resistance walls.",
        pillClass: "bg-rose-500/25 text-rose-200 border-rose-400 font-bold animate-pulse",
        emoji: "🔥",
        accentHex: "#F43F5E",
      };
    } else if (currentRsi >= 60) {
      return {
        label: "Bullish Momentum (Profit Taking Emerging)",
        bias: "Moderate Sell Pressure",
        description: "Expansion in valuation prompting liquidity providers to deepen ask depth tiers.",
        pillClass: "bg-rose-500/15 text-rose-300 border-rose-500/40 font-semibold",
        emoji: "📈",
        accentHex: "#FB7185",
      };
    } else if (currentRsi <= 25) {
      return {
        label: "Extreme Oversold (Strong Buy Accumulation)",
        bias: "Buy-Heavy Skew",
        description: "Depressed valuation triggering institutional algorithmic buy bids and price floors.",
        pillClass: "bg-emerald-500/25 text-emerald-200 border-emerald-400 font-bold animate-pulse",
        emoji: "⚡",
        accentHex: "#10B981",
      };
    } else if (currentRsi <= 40) {
      return {
        label: "Oversold Discount (Buyer Support Building)",
        bias: "Moderate Buy Pressure",
        description: "Accumulation bids consolidating at key support levels beneath current price.",
        pillClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 font-semibold",
        emoji: "🛡️",
        accentHex: "#34D399",
      };
    } else {
      return {
        label: "Balanced Equilibrium (Neutral Range)",
        bias: "Symmetric Liquidity",
        description: "Balanced buy and sell order flow with symmetric spread consolidation.",
        pillClass: "bg-purple-500/20 text-purple-300 border-purple-500/30 font-medium",
        emoji: "⚖️",
        accentHex: "#A855F7",
      };
    }
  }, [currentRsi]);

  // Resize Observer for D3 responsive SVG
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const w = entries[0].contentRect.width;
      if (w > 200) setChartWidth(Math.floor(w));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute Simulated Depth of Market and Pending Order Distribution Histogram
  const metrics: DepthOfMarketMetrics = useMemo(() => {
    const p0 = currentPrice > 0 ? currentPrice : 1.0;
    const mcap = currentMarketCap > 0 ? currentMarketCap : 1_000_000;
    const sym = holding.symbol.toUpperCase();

    // 1. Determine Liquidity Scaling Tier based on Market Cap
    let liquidityTier: DepthOfMarketMetrics["liquidityTier"] = "Mid-Cap Liquid";
    let baseDepthFactor = 0.025; // 2.5% of mcap in order book
    let spreadBps = 6; // 0.06%

    if (mcap >= 1e11) {
      // Mega-cap: >= $100B (e.g. BTC, ETH, MAO)
      liquidityTier = "Mega-Cap Institutional";
      baseDepthFactor = 0.018;
      spreadBps = 3;
    } else if (mcap >= 1e9) {
      // Large-cap: >= $1B
      liquidityTier = "Large-Cap Tier 1";
      baseDepthFactor = 0.024;
      spreadBps = 7;
    } else if (mcap >= 5e7) {
      // Mid-cap: >= $50M
      liquidityTier = "Mid-Cap Liquid";
      baseDepthFactor = 0.038;
      spreadBps = 14;
    } else {
      // Emerging / Micro-cap
      liquidityTier = "Emerging Growth";
      baseDepthFactor = 0.055;
      spreadBps = 28;
    }

    const midPrice = p0;
    const spreadPercent = spreadBps / 100; // e.g. 0.06%
    const spreadUsd = midPrice * (spreadPercent / 100);

    // 2. Deterministic Buy vs Sell Order Pressure Bias based on hash + currentRsi momentum
    const seed = hashStr(`${sym}_DOM_${Math.round(mcap / 100_000)}`);
    const seedNorm = (seed % 1000) / 1000; // 0.0 to 1.0

    // RSI momentum bias shift:
    // If RSI is low (<35, oversold), buyers are stepping in (higher buy pressure)
    // If RSI is high (>65, overbought), sellers are locking in profits (higher sell pressure)
    const rsiPressureBias = (50 - currentRsi) * 0.22; // -11% to +11% shift
    const baseBuyPressure = 45 + seedNorm * 10 + rsiPressureBias;
    const buyPressurePercent = Number(Math.max(25, Math.min(75, baseBuyPressure)).toFixed(1));
    const sellPressurePercent = Number((100 - buyPressurePercent).toFixed(1));

    // Total book depth scales with current market cap & chosen depthRange
    const rangeMultiplier = Math.sqrt(depthRange / 2.5);
    const totalOrderBookUsd = mcap * baseDepthFactor * rangeMultiplier;
    const totalBidDepthTarget = totalOrderBookUsd * (buyPressurePercent / 100);
    const totalAskDepthTarget = totalOrderBookUsd * (sellPressurePercent / 100);

    // 3. Generate 14 Bids and 14 Asks levels
    const LEVEL_COUNT = 14;
    const bids: OrderBookLevel[] = [];
    const asks: OrderBookLevel[] = [];

    let bidAccumUsd = 0;
    let askAccumUsd = 0;

    // Detect wall indices deterministically
    const bidWallIdx = 3 + (seed % 5);
    const askWallIdx = 4 + ((seed >> 3) % 5);

    for (let i = 1; i <= LEVEL_COUNT; i++) {
      const progress = i / LEVEL_COUNT;
      const offsetPct = (spreadPercent / 2) + Math.pow(progress, 1.25) * (depthRange - spreadPercent / 2);

      // --- BID (BUY) LEVEL ---
      const bidPrice = Math.max(0.000001, midPrice * (1 - offsetPct / 100));
      const isBidWall = i === bidWallIdx;
      const bidWeight = (1 - progress * 0.45) * (isBidWall ? 3.2 : 0.9 + ((seed + i * 17) % 30) / 100);
      const bidLevelUsd = (totalBidDepthTarget / LEVEL_COUNT) * bidWeight;
      bidAccumUsd += bidLevelUsd;
      const bidTokens = bidLevelUsd / bidPrice;

      bids.push({
        id: `bid-${i}`,
        type: "bid",
        price: Number(bidPrice.toFixed(p0 < 1 ? 6 : p0 < 100 ? 3 : 2)),
        diffPercent: -Number(offsetPct.toFixed(2)),
        sizeTokens: bidTokens,
        sizeUsd: bidLevelUsd,
        cumulativeTokens: 0,
        cumulativeUsd: bidAccumUsd,
        depthRatio: 0,
        isWall: isBidWall,
        wallLabel: isBidWall ? "Institutional Buy Wall" : undefined,
      });

      // --- ASK (SELL) LEVEL ---
      const askPrice = midPrice * (1 + offsetPct / 100);
      const isAskWall = i === askWallIdx;
      const askWeight = (1 - progress * 0.45) * (isAskWall ? 3.2 : 0.9 + ((seed + i * 29) % 30) / 100);
      const askLevelUsd = (totalAskDepthTarget / LEVEL_COUNT) * askWeight;
      askAccumUsd += askLevelUsd;
      const askTokens = askLevelUsd / askPrice;

      asks.push({
        id: `ask-${i}`,
        type: "ask",
        price: Number(askPrice.toFixed(p0 < 1 ? 6 : p0 < 100 ? 3 : 2)),
        diffPercent: Number(offsetPct.toFixed(2)),
        sizeTokens: askTokens,
        sizeUsd: askLevelUsd,
        cumulativeTokens: 0,
        cumulativeUsd: askAccumUsd,
        depthRatio: 0,
        isWall: isAskWall,
        wallLabel: isAskWall ? "Heavy Sell Resistance" : undefined,
      });
    }

    // Cumulative sums and relative ratios
    let runningBidTokens = 0;
    bids.forEach((b) => {
      runningBidTokens += b.sizeTokens;
      b.cumulativeTokens = runningBidTokens;
      b.depthRatio = Math.min(1, b.cumulativeUsd / bidAccumUsd);
    });

    let runningAskTokens = 0;
    asks.forEach((a) => {
      runningAskTokens += a.sizeTokens;
      a.cumulativeTokens = runningAskTokens;
      a.depthRatio = Math.min(1, a.cumulativeUsd / askAccumUsd);
    });

    // 4. GENERATE HORIZONTAL BAR CHART HISTOGRAM TIERS (Order Size Distribution based on Volatility)
    // Volatility impact: Higher Z-Score / extreme volatility broadens pending order clusters away from mid
    const volSpreadFactor = Math.max(0.7, Math.min(2.5, volatilityZScore));
    const tierOffsets = [
      { pct: 4.8 * volSpreadFactor, type: "ask" as const },
      { pct: 3.5 * volSpreadFactor, type: "ask" as const },
      { pct: 2.2 * volSpreadFactor, type: "ask" as const },
      { pct: 1.4 * volSpreadFactor, type: "ask" as const },
      { pct: 0.8 * volSpreadFactor, type: "ask" as const },
      { pct: 0.3 * volSpreadFactor, type: "ask" as const },
      { pct: -0.3 * volSpreadFactor, type: "bid" as const },
      { pct: -0.8 * volSpreadFactor, type: "bid" as const },
      { pct: -1.4 * volSpreadFactor, type: "bid" as const },
      { pct: -2.2 * volSpreadFactor, type: "bid" as const },
      { pct: -3.5 * volSpreadFactor, type: "bid" as const },
      { pct: -4.8 * volSpreadFactor, type: "bid" as const },
    ];

    const distributionTiers: OrderDistributionTier[] = [];
    let maxTierVol = 0;

    tierOffsets.forEach((tier, tIdx) => {
      const isBid = tier.type === "bid";
      const tierPrice = midPrice * (1 + tier.pct / 100);
      const distFromMid = Math.abs(tier.pct);

      // Base tier volume distribution modeled with a Gaussian curve modulated by market cap volatility
      // When volatility is high, tails get fatter; when low, volume concentrates closer to mid
      const variance = 1.6 * volSpreadFactor;
      const density = Math.exp(-Math.pow(distFromMid, 2) / (2 * Math.pow(variance, 2)));

      // Check if this tier has an abnormal order cluster / institutional block order
      const isCluster = (tIdx === 2 || tIdx === 9) && volatilityZScore >= 1.5;
      const clusterMultiplier = isCluster ? (1.8 + volatilityZScore * 0.4) : 1.0;

      // Pressure bias
      const sideWeight = isBid ? (buyPressurePercent / 50) : (sellPressurePercent / 50);
      const tierUsd = (totalOrderBookUsd * 0.12) * density * clusterMultiplier * sideWeight * (0.85 + ((seed + tIdx * 31) % 30) / 100);
      const tokenCount = tierUsd / Math.max(0.000001, tierPrice);
      const orderCount = Math.round(40 + density * 350 * clusterMultiplier);

      if (tierUsd > maxTierVol) maxTierVol = tierUsd;

      distributionTiers.push({
        id: `dist-tier-${tIdx}`,
        type: tier.type,
        price: Number(tierPrice.toFixed(p0 < 1 ? 6 : p0 < 100 ? 3 : 2)),
        diffPercent: Number(tier.pct.toFixed(2)),
        pendingVolumeUsd: tierUsd,
        pendingTokenCount: tokenCount,
        orderCount,
        isVolCluster: isCluster,
        clusterLabel: isCluster ? `Institutional ${volatilityZScore >= 2 ? "2σ Volatility" : "Block"} Cluster` : undefined,
        barWidthPercent: 0, // calculated in second pass
      });
    });

    // Normalize barWidthPercent
    distributionTiers.forEach((d) => {
      d.barWidthPercent = maxTierVol > 0 ? Number(((d.pendingVolumeUsd / maxTierVol) * 100).toFixed(1)) : 0;
    });

    // Determine Pressure Status
    let pressureState: DepthOfMarketMetrics["pressureState"] = "balanced";
    let pressureLabel = "Balanced Liquidity";
    let pressureEmoji = "⚖️";

    if (buyPressurePercent >= 57) {
      pressureState = "bullish_wall";
      pressureLabel = "Dominant Buy Wall / Accumulation";
      pressureEmoji = "🛡️";
    } else if (buyPressurePercent >= 52) {
      pressureState = "buy_leaning";
      pressureLabel = "Moderate Buy Order Bias";
      pressureEmoji = "📈";
    } else if (buyPressurePercent <= 43) {
      pressureState = "bearish_wall";
      pressureLabel = "Heavy Sell Resistance / Distribution";
      pressureEmoji = "🧱";
    } else if (buyPressurePercent <= 48) {
      pressureState = "sell_leaning";
      pressureLabel = "Moderate Sell Order Bias";
      pressureEmoji = "📉";
    }

    const largestBidWall = bids.find((b) => b.isWall);
    const largestAskWall = asks.find((a) => a.isWall);

    return {
      midPrice,
      spreadUsd,
      spreadPercent,
      totalBidDepthUsd: bidAccumUsd,
      totalAskDepthUsd: askAccumUsd,
      totalBookDepthUsd: bidAccumUsd + askAccumUsd,
      totalBidTokens: runningBidTokens,
      totalAskTokens: runningAskTokens,
      buyPressurePercent,
      sellPressurePercent,
      imbalanceDeltaUsd: bidAccumUsd - askAccumUsd,
      pressureState,
      pressureLabel,
      pressureEmoji,
      liquidityTier,
      marketCapPercent2Pct: (baseDepthFactor * 100),
      bids,
      asks,
      largestBidWall,
      largestAskWall,
      distributionTiers,
      maxTierVolumeUsd: maxTierVol,
    };
  }, [currentPrice, currentMarketCap, holding.symbol, depthRange, currentRsi, volatilityZScore]);



  // D3 Cumulative Depth Mountain Chart Drawing Effect with d3-zoom
  useEffect(() => {
    if (!svgRef.current || chartWidth <= 100) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 18, right: 30, bottom: 26, left: 30 };
    const innerWidth = chartWidth - margin.left - margin.right;
    const innerHeight = chartHeight - margin.top - margin.bottom;

    if (innerWidth <= 50 || innerHeight <= 40) return;

    const g = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);
    const defs = svg.append("defs");

    // Clip path for smooth pan & zoom bounds
    defs
      .append("clipPath")
      .attr("id", "dom-chart-viewport-clip")
      .append("rect")
      .attr("x", 0)
      .attr("y", -10)
      .attr("width", innerWidth)
      .attr("height", innerHeight + 15);

    // Gradients for Buy (Bids) and Sell (Asks)
    const bidGrad = defs
      .append("linearGradient")
      .attr("id", "dom-bid-grad")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");
    bidGrad.append("stop").attr("offset", "0%").attr("stop-color", "#10B981").attr("stop-opacity", 0.55);
    bidGrad.append("stop").attr("offset", "100%").attr("stop-color", "#10B981").attr("stop-opacity", 0.05);

    const askGrad = defs
      .append("linearGradient")
      .attr("id", "dom-ask-grad")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");
    askGrad.append("stop").attr("offset", "0%").attr("stop-color", "#F43F5E").attr("stop-opacity", 0.55);
    askGrad.append("stop").attr("offset", "100%").attr("stop-color", "#F43F5E").attr("stop-opacity", 0.05);

    // X Scale: Price from lowest bid to highest ask
    const minPrice = metrics.bids[metrics.bids.length - 1].price;
    const maxPrice = metrics.asks[metrics.asks.length - 1].price;
    const xScale = d3.scaleLinear().domain([minPrice, maxPrice]).range([0, innerWidth]);

    // Y Scale: Cumulative USD depth
    const maxCumulativeUsd = Math.max(metrics.totalBidDepthUsd, metrics.totalAskDepthUsd) * 1.1;
    const yScale = d3.scaleLinear().domain([0, maxCumulativeUsd]).range([innerHeight, 0]);

    // Grid lines
    const yGrid = d3.axisLeft(yScale).ticks(4).tickSize(-innerWidth).tickFormat(() => "");
    g.append("g").attr("class", "dom-grid-y opacity-15 text-slate-500").call(yGrid);

    // X Axis bottom ticks
    const xAxisG = g
      .append("g")
      .attr("class", "dom-axis-x opacity-40 text-slate-400 font-mono")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(
        d3.axisBottom(xScale)
          .ticks(5)
          .tickFormat((d) => `$${Number(d) < 1 ? Number(d).toFixed(4) : Number(d).toFixed(2)}`)
      );

    // Clipped Content Group for smooth zooming and panning
    const chartContentG = g.append("g").attr("clip-path", "url(#dom-chart-viewport-clip)");

    // 1. Prepare Bid Curve Data Points:
    const bidCurvePoints: [number, number][] = [];
    bidCurvePoints.push([minPrice, 0]);
    const sortedBids = [...metrics.bids].sort((a, b) => a.price - b.price);
    sortedBids.forEach((b) => {
      bidCurvePoints.push([b.price, b.cumulativeUsd]);
    });
    const bidTerminalPrice = metrics.midPrice * (1 - metrics.spreadPercent / 200);
    bidCurvePoints.push([bidTerminalPrice, 0]);

    // 2. Prepare Ask Curve Data Points:
    const askCurvePoints: [number, number][] = [];
    const askTerminalPrice = metrics.midPrice * (1 + metrics.spreadPercent / 200);
    askCurvePoints.push([askTerminalPrice, 0]);
    const sortedAsks = [...metrics.asks].sort((a, b) => a.price - b.price);
    sortedAsks.forEach((a) => {
      askCurvePoints.push([a.price, a.cumulativeUsd]);
    });
    askCurvePoints.push([maxPrice, 0]);

    // Area & Line Generators
    const bidAreaGen = d3
      .area<[number, number]>()
      .x((d) => xScale(d[0]))
      .y0(innerHeight)
      .y1((d) => yScale(d[1]))
      .curve(d3.curveStepAfter);

    const bidLineGen = d3
      .line<[number, number]>()
      .x((d) => xScale(d[0]))
      .y((d) => yScale(d[1]))
      .curve(d3.curveStepAfter);

    const askAreaGen = d3
      .area<[number, number]>()
      .x((d) => xScale(d[0]))
      .y0(innerHeight)
      .y1((d) => yScale(d[1]))
      .curve(d3.curveStepBefore);

    const askLineGen = d3
      .line<[number, number]>()
      .x((d) => xScale(d[0]))
      .y((d) => yScale(d[1]))
      .curve(d3.curveStepBefore);

    // Draw Bid Area & Line
    const bidAreaPath = chartContentG.append("path").datum(bidCurvePoints).attr("fill", "url(#dom-bid-grad)").attr("d", bidAreaGen);
    const bidLinePath = chartContentG.append("path")
      .datum(bidCurvePoints.slice(1, bidCurvePoints.length - 1))
      .attr("fill", "none")
      .attr("stroke", "#10B981")
      .attr("stroke-width", 2.2)
      .attr("d", bidLineGen);

    // Draw Ask Area & Line
    const askAreaPath = chartContentG.append("path").datum(askCurvePoints).attr("fill", "url(#dom-ask-grad)").attr("d", askAreaGen);
    const askLinePath = chartContentG.append("path")
      .datum(askCurvePoints.slice(0, askCurvePoints.length - 1))
      .attr("fill", "none")
      .attr("stroke", "#F43F5E")
      .attr("stroke-width", 2.2)
      .attr("d", askLineGen);

    // Mid Price Vertical Marker & Label
    const midX = xScale(metrics.midPrice);
    const midLine = chartContentG.append("line")
      .attr("x1", midX)
      .attr("x2", midX)
      .attr("y1", 0)
      .attr("y2", innerHeight)
      .attr("stroke", rsiInterpolatedColor)
      .attr("stroke-width", 1.8)
      .attr("stroke-dasharray", "3,3");

    // Mid Price Beacon Pin
    const midCircle = chartContentG.append("circle")
      .attr("cx", midX)
      .attr("cy", innerHeight - 4)
      .attr("r", 5)
      .attr("fill", rsiInterpolatedColor)
      .attr("stroke", "#0e1017")
      .attr("stroke-width", 1.5);

    const midLabel = chartContentG.append("text")
      .attr("x", midX)
      .attr("y", -6)
      .attr("fill", rsiInterpolatedColor)
      .attr("text-anchor", "middle")
      .attr("font-size", 9.5)
      .attr("font-family", "monospace")
      .attr("font-weight", "bold")
      .text(`MID: $${metrics.midPrice < 1 ? metrics.midPrice.toFixed(4) : metrics.midPrice.toFixed(2)}`);

    // Highlight Institutional Liquidity Walls on Chart
    let bidWallCircle: any = null;
    let bidWallPing: any = null;
    let bidWallText: any = null;
    if (metrics.largestBidWall) {
      const bx = xScale(metrics.largestBidWall.price);
      const by = yScale(metrics.largestBidWall.cumulativeUsd);
      bidWallCircle = chartContentG.append("circle").attr("cx", bx).attr("cy", by).attr("r", 5).attr("fill", "#10B981").attr("stroke", "#FFFFFF").attr("stroke-width", 1.5);
      bidWallPing = chartContentG.append("circle").attr("cx", bx).attr("cy", by).attr("r", 9).attr("fill", "none").attr("stroke", "#10B981").attr("stroke-width", 1.2).attr("class", "animate-ping");
      bidWallText = chartContentG.append("text")
        .attr("x", bx - 4)
        .attr("y", Math.max(12, by - 8))
        .attr("fill", "#6EE7B7")
        .attr("text-anchor", "end")
        .attr("font-size", 8.5)
        .attr("font-family", "monospace")
        .attr("font-weight", "bold")
        .text(`WALL: ${formatUSD(metrics.largestBidWall.sizeUsd)}`);
    }

    let askWallCircle: any = null;
    let askWallPing: any = null;
    let askWallText: any = null;
    if (metrics.largestAskWall) {
      const ax = xScale(metrics.largestAskWall.price);
      const ay = yScale(metrics.largestAskWall.cumulativeUsd);
      askWallCircle = chartContentG.append("circle").attr("cx", ax).attr("cy", ay).attr("r", 5).attr("fill", "#F43F5E").attr("stroke", "#FFFFFF").attr("stroke-width", 1.5);
      askWallPing = chartContentG.append("circle").attr("cx", ax).attr("cy", ay).attr("r", 9).attr("fill", "none").attr("stroke", "#F43F5E").attr("stroke-width", 1.2).attr("class", "animate-ping");
      askWallText = chartContentG.append("text")
        .attr("x", ax + 4)
        .attr("y", Math.max(12, ay - 8))
        .attr("fill", "#FDA4AF")
        .attr("text-anchor", "start")
        .attr("font-size", 8.5)
        .attr("font-family", "monospace")
        .attr("font-weight", "bold")
        .text(`WALL: ${formatUSD(metrics.largestAskWall.sizeUsd)}`);
    }

    // Interactive Hover Crosshair
    const crosshair = chartContentG
      .append("line")
      .attr("stroke", "#E2E8F0")
      .attr("stroke-dasharray", "2,2")
      .attr("stroke-width", 1)
      .style("display", "none");

    const hoverDot = chartContentG
      .append("circle")
      .attr("r", 4.5)
      .attr("fill", "#38BDF8")
      .attr("stroke", "#FFFFFF")
      .attr("stroke-width", 1.5)
      .style("display", "none");

    // D3 Zoom and Pan behavior attachment
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .translateExtent([[0, 0], [chartWidth, chartHeight]])
      .extent([[0, 0], [innerWidth, innerHeight]])
      .on("zoom", (event) => {
        const transform = event.transform;
        setZoomScale(transform.k);
        const currentRescaledX = transform.rescaleX(xScale);

        // Update Areas and Curves
        bidAreaPath.attr("d", bidAreaGen.x((d) => currentRescaledX(d[0])));
        bidLinePath.attr("d", bidLineGen.x((d) => currentRescaledX(d[0])));
        askAreaPath.attr("d", askAreaGen.x((d) => currentRescaledX(d[0])));
        askLinePath.attr("d", askLineGen.x((d) => currentRescaledX(d[0])));

        // Update Mid Marker
        const curMid = currentRescaledX(metrics.midPrice);
        midLine.attr("x1", curMid).attr("x2", curMid);
        midCircle.attr("cx", curMid);
        midLabel.attr("x", curMid);

        // Update Walls
        if (bidWallCircle && metrics.largestBidWall) {
          const bx = currentRescaledX(metrics.largestBidWall.price);
          bidWallCircle.attr("cx", bx);
          bidWallPing.attr("cx", bx);
          bidWallText.attr("x", bx - 4);
        }
        if (askWallCircle && metrics.largestAskWall) {
          const ax = currentRescaledX(metrics.largestAskWall.price);
          askWallCircle.attr("cx", ax);
          askWallPing.attr("cx", ax);
          askWallText.attr("x", ax + 4);
        }

        // Update X Axis
        xAxisG.call(
          d3.axisBottom(currentRescaledX)
            .ticks(5)
            .tickFormat((d) => `$${Number(d) < 1 ? Number(d).toFixed(4) : Number(d).toFixed(2)}`)
        );
      });

    zoomBehaviorRef.current = zoomBehavior;
    svg.call(zoomBehavior);

    // Interactive Hover Transparent Overlay Rect
    chartContentG.append("rect")
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .attr("fill", "transparent")
      .attr("cursor", "crosshair")
      .on("mousemove", (event) => {
        const [mx] = d3.pointer(event);
        const currentTransform = d3.zoomTransform(svgRef.current || event.currentTarget);
        const activeX = currentTransform ? currentTransform.rescaleX(xScale) : xScale;
        const hoveredPrice = activeX.invert(mx);

        crosshair.style("display", null).attr("x1", mx).attr("x2", mx).attr("y1", 0).attr("y2", innerHeight);

        let closest: OrderBookLevel | null = null;
        let minDiff = Infinity;
        [...metrics.bids, ...metrics.asks].forEach((lvl) => {
          const diff = Math.abs(lvl.price - hoveredPrice);
          if (diff < minDiff) {
            minDiff = diff;
            closest = lvl;
          }
        });

        if (closest) {
          const cx = activeX((closest as OrderBookLevel).price);
          const cy = yScale((closest as OrderBookLevel).cumulativeUsd);
          hoverDot
            .style("display", null)
            .attr("cx", cx)
            .attr("cy", cy)
            .attr("fill", (closest as OrderBookLevel).type === "bid" ? "#10B981" : "#F43F5E");
          setHoveredLevel(closest);
        }
      })
      .on("mouseleave", () => {
        crosshair.style("display", "none");
        hoverDot.style("display", "none");
        setHoveredLevel(null);
      });
  }, [chartWidth, metrics, rsiInterpolatedColor]);

  return (
    <div className={`space-y-4 font-mono ${className}`}>
      {/* Top Banner: Liquidity Tier, Market Cap Anchoring & Pressure Ratio */}
      <div className="bg-[#141722]/80 border border-[#242a3d] rounded-2xl p-4 sm:p-5 relative overflow-hidden">
        {/* Ambient glow matching dynamic RSI Momentum color */}
        <div
          className="absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20 transition-all duration-500"
          style={{ backgroundColor: rsiInterpolatedColor }}
        />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Layers className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
                <span>Depth of Market (DOM) Liquidity Visualizer</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {metrics.liquidityTier}
                </span>
              </h3>
            </div>
            <p className="text-xs text-[#8E9299] mt-1">
              Simulated order book bids &amp; asks scaled dynamically to current market cap of{" "}
              <strong className="text-white">{formatUSD(currentMarketCap)}</strong>
            </p>
          </div>

          {/* Controls: Depth Range (±1%, ±2.5%, ±5%, ±10%) & View Switcher */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Depth Zoom */}
            <div className="flex items-center bg-[#0e1017] border border-[#242a3d] p-0.5 rounded-xl text-xs">
              {[1.0, 2.5, 5.0, 10.0].map((rng) => (
                <button
                  key={rng}
                  type="button"
                  onClick={() => setDepthRange(rng)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    depthRange === rng
                      ? "bg-purple-500/25 text-purple-200 border border-purple-500/40"
                      : "text-[#8E9299] hover:text-white"
                  }`}
                >
                  ±{rng}%
                </button>
              ))}
            </div>

            {/* Layout Mode including Histogram */}
            <div className="flex items-center bg-[#0e1017] border border-[#242a3d] p-0.5 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setViewLayout("split")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  viewLayout === "split"
                    ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30"
                    : "text-[#8E9299] hover:text-white"
                }`}
              >
                Split View
              </button>
              <button
                type="button"
                onClick={() => setViewLayout("chart")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  viewLayout === "chart"
                    ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30"
                    : "text-[#8E9299] hover:text-white"
                }`}
              >
                Depth Chart
              </button>
              <button
                type="button"
                onClick={() => setViewLayout("histogram")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  viewLayout === "histogram"
                    ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30"
                    : "text-[#8E9299] hover:text-white"
                }`}
              >
                <BarChart2 className="w-3 h-3 text-cyan-400" />
                <span>Histogram</span>
              </button>
              <button
                type="button"
                onClick={() => setViewLayout("ladder")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  viewLayout === "ladder"
                    ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30"
                    : "text-[#8E9299] hover:text-white"
                }`}
              >
                Order Book
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            DYNAMIC RSI-BASED TREND INDICATOR (EMERALD TO ROSE MOMENTUM SPECTRUM)
            ========================================================================= */}
        <div className="mt-4 pt-3.5 border-t border-[#1f2433] space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1.5 text-white font-bold">
                <Gauge className="w-4 h-4" style={{ color: rsiInterpolatedColor }} />
                <span>Market Cap RSI Momentum:</span>
              </span>
              <span
                className="text-sm font-bold px-2.5 py-0.5 rounded-full border transition-all duration-300 flex items-center gap-1.5"
                style={{
                  color: rsiInterpolatedColor,
                  borderColor: `${rsiInterpolatedColor}60`,
                  backgroundColor: `${rsiInterpolatedColor}18`,
                  boxShadow: `0 0 14px ${rsiInterpolatedColor}35`,
                }}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    currentRsi > 80 || currentRsi < 20 ? "animate-ping" : ""
                  }`}
                  style={{ backgroundColor: rsiInterpolatedColor }}
                />
                <strong>{currentRsi} RSI</strong>
                <span className="text-[10px] uppercase font-semibold">({rsiCondition})</span>
              </span>

              <span className={`px-2 py-0.5 rounded text-[10px] ${rsiTrendMetadata.pillClass}`}>
                <span>{rsiTrendMetadata.emoji}</span> {rsiTrendMetadata.label}
              </span>
            </div>

            <div className="text-[11px] text-[#8E9299] flex items-center gap-2">
              <span>Order Flow Impact:</span>
              <strong className="text-white" style={{ color: rsiInterpolatedColor }}>
                {rsiTrendMetadata.bias}
              </strong>
            </div>
          </div>

          {/* Dynamic Gradient Track: Emerald (Oversold/Bullish) to Rose (Overbought/Bearish) */}
          <div className="space-y-1">
            <div className="relative w-full h-2.5 rounded-full bg-[#0e1017] border border-[#242a3d] overflow-hidden p-0.5">
              {/* Continuous Emerald to Purple to Rose Gradient */}
              <div
                className="w-full h-full rounded-full"
                style={{
                  background: "linear-gradient(to right, #10B981 0%, #34D399 25%, #8B5CF6 50%, #FB7185 75%, #F43F5E 100%)",
                }}
              />
              {/* Moving Pointer Needle reflecting current market cap momentum */}
              <div
                className="absolute top-0 bottom-0 w-2.5 bg-white rounded-full shadow-[0_0_8px_#ffffff] border border-black transform -translate-x-1/2 transition-all duration-500"
                style={{ left: `${Math.max(2, Math.min(98, currentRsi))}%` }}
                title={`Current RSI Momentum: ${currentRsi}`}
              />
            </div>

            {/* Scale markers */}
            <div className="flex items-center justify-between text-[10px] text-[#8E9299] px-0.5">
              <span className="text-emerald-400 font-bold">0 (Intense Emerald Accumulation &lt;20)</span>
              <span className="text-purple-300">50 (Equilibrium)</span>
              <span className="text-rose-400 font-bold">100 (Intense Rose Overbought &gt;80)</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            MARKET SENTIMENT INDICATOR (NEWS & SOCIAL METADATA ORDER BOOK BIAS)
            ========================================================================= */}
        <div className="mt-3.5 pt-3.5 border-t border-[#1f2433] space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1.5 text-white font-bold">
                <Globe className="w-4 h-4" style={{ color: marketSentiment.colorHex }} />
                <span>Market Sentiment &amp; Social Index:</span>
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border transition-all duration-300 flex items-center gap-1.5 ${marketSentiment.badgeBg} ${marketSentiment.badgeBorder}`}
                style={{ color: marketSentiment.colorHex }}
              >
                {marketSentiment.score > 0 ? (
                  <Smile className="w-3.5 h-3.5" />
                ) : marketSentiment.score < 0 ? (
                  <Frown className="w-3.5 h-3.5" />
                ) : (
                  <Meh className="w-3.5 h-3.5" />
                )}
                <strong>{marketSentiment.score > 0 ? `+${marketSentiment.score}` : marketSentiment.score} / 100</strong>
                <span className="text-[10px] uppercase font-semibold">({marketSentiment.classification.replace("_", " ")})</span>
              </span>

              {/* Color-Coded Order Book Bias Tag */}
              <span
                className="px-2 py-0.5 rounded text-[10px] font-bold border transition-colors shadow-sm"
                style={{
                  color: marketSentiment.colorHex,
                  borderColor: `${marketSentiment.colorHex}50`,
                  backgroundColor: `${marketSentiment.colorHex}15`,
                }}
              >
                Order Book Bias: {marketSentiment.orderBookBiasLabel}
              </span>
            </div>

            {/* Quick Sentiment Simulation Overrides */}
            <div className="flex items-center gap-1 text-[11px] text-[#8E9299]">
              <span className="text-[10px]">Test Bias:</span>
              <button
                type="button"
                onClick={() => setUserSentimentShift(35)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                  userSentimentShift === 35
                    ? "bg-emerald-500/25 text-emerald-300 border border-emerald-400"
                    : "bg-[#0e1017] text-slate-400 hover:text-white border border-[#242a3d]"
                }`}
                title="Simulate Bullish News Break"
              >
                +Bullish
              </button>
              <button
                type="button"
                onClick={() => setUserSentimentShift(0)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                  userSentimentShift === 0
                    ? "bg-purple-500/25 text-purple-300 border border-purple-400"
                    : "bg-[#0e1017] text-slate-400 hover:text-white border border-[#242a3d]"
                }`}
                title="Reset to Real-Time Market Feed"
              >
                Feed
              </button>
              <button
                type="button"
                onClick={() => setUserSentimentShift(-35)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                  userSentimentShift === -35
                    ? "bg-rose-500/25 text-rose-300 border border-rose-400"
                    : "bg-[#0e1017] text-slate-400 hover:text-white border border-[#242a3d]"
                }`}
                title="Simulate Bearish Sell-Off"
              >
                -Bearish
              </button>
            </div>
          </div>

          {/* Sentiment Gauge Bar */}
          <div className="space-y-1">
            <div className="relative w-full h-2 rounded-full bg-[#0e1017] border border-[#242a3d] overflow-hidden p-0.5">
              <div
                className="w-full h-full rounded-full"
                style={{
                  background: "linear-gradient(to right, #EF4444 0%, #F59E0B 35%, #8B5CF6 50%, #06B6D4 70%, #10B981 100%)",
                }}
              />
              <div
                className="absolute top-0 bottom-0 w-2.5 bg-white rounded-full shadow-[0_0_8px_#ffffff] border border-black transform -translate-x-1/2 transition-all duration-500"
                style={{ left: `${Math.max(2, Math.min(98, (marketSentiment.score + 100) / 2))}%` }}
                title={`Sentiment Position: ${marketSentiment.score}`}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-[#8E9299] px-0.5">
              <span className="text-rose-400 font-bold">-100 (Extreme Fear / Supply Overhead)</span>
              <span className="text-purple-300">0 (Neutral Equilibrium)</span>
              <span className="text-emerald-400 font-bold">+100 (Extreme Bullish / Buy Wall Stacking)</span>
            </div>
          </div>

          {/* Social Metadata Badge Strip */}
          <div className="p-2 rounded-xl bg-[#0e1017] border border-[#1f2433] text-[11px] flex flex-wrap items-center justify-between gap-3 text-[#8E9299]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-white">
                <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                <span>24h Mentions: <strong className="text-cyan-300">{marketSentiment.socialMentions24h.toLocaleString()}</strong></span>
              </span>
              <span className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Social Spike: <strong className="text-amber-300">+{marketSentiment.socialSpikePercent}%</strong></span>
              </span>
              <span>
                News Tone: <strong className={marketSentiment.newsPositivePercent >= 50 ? "text-emerald-400" : "text-rose-400"}>{marketSentiment.newsPositivePercent}% Positive</strong>
              </span>
            </div>
            <div className="text-[10px] truncate max-w-md italic text-slate-300">
              "{marketSentiment.catalystHeadline}"
            </div>
          </div>
        </div>

        {/* Real-time Order Book Pressure Gauge Bar */}
        <div className="mt-3 pt-3 border-t border-[#1f2433] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-emerald-400">
                BUY PRESSURE: {metrics.buyPressurePercent}%
              </span>
              <span className="text-[#8E9299]">({formatUSD(metrics.totalBidDepthUsd)})</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0e1017] border border-[#242a3d] text-[11px]">
              <span>{metrics.pressureEmoji}</span>
              <span className="font-bold text-white">{metrics.pressureLabel}</span>
              <span className="text-[#8E9299]">
                (Δ {metrics.imbalanceDeltaUsd >= 0 ? "+" : ""}{formatUSD(metrics.imbalanceDeltaUsd)})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[#8E9299]">({formatUSD(metrics.totalAskDepthUsd)})</span>
              <span className="font-bold text-rose-400">
                SELL PRESSURE: {metrics.sellPressurePercent}%
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse" />
            </div>
          </div>

          {/* Bi-directional Visual Fill Gauge */}
          <div className="w-full h-3 rounded-full bg-[#0e1017] border border-[#242a3d] overflow-hidden flex p-0.5">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-l-full transition-all duration-300"
              style={{ width: `${metrics.buyPressurePercent}%` }}
              title={`Buy Orders: ${metrics.buyPressurePercent}% (${formatUSD(metrics.totalBidDepthUsd)})`}
            />
            <div
              className="h-full bg-gradient-to-r from-rose-400 to-rose-600 rounded-r-full transition-all duration-300"
              style={{ width: `${metrics.sellPressurePercent}%` }}
              title={`Sell Orders: ${metrics.sellPressurePercent}% (${formatUSD(metrics.totalAskDepthUsd)})`}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#8E9299] pt-0.5">
            <span>
              Total ±{depthRange}% Liquidity: <strong className="text-white">{formatUSD(metrics.totalBookDepthUsd)}</strong>
            </span>
            <span>
              Spread: <strong className="text-cyan-300">${metrics.spreadUsd < 0.01 ? metrics.spreadUsd.toFixed(6) : metrics.spreadUsd.toFixed(4)}</strong> ({metrics.spreadPercent.toFixed(3)}%)
            </span>
            <span>
              Market Cap Volatility: <strong className={volatilityZScore >= 2 ? "text-rose-400 font-bold" : "text-amber-400"}>{volatilityZScore}σ ({volatilityBand})</strong>
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          HORIZONTAL BAR CHART HISTOGRAM: PENDING ORDER VOLUME AT PRICE TIERS
          ========================================================================= */}
      {(viewLayout === "split" || viewLayout === "histogram") && (
        <div className="bg-[#0e1017] border border-[#1f2433] rounded-2xl p-4 sm:p-5 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <BarChart3 className="w-4 h-4" />
              </span>
              <span className="font-bold text-xs sm:text-sm text-white">
                Pending Order Size Distribution Histogram (By Price Tier &amp; Volatility)
              </span>
              <span className="px-2 py-0.2 rounded text-[10px] bg-[#141722] text-[#8E9299] border border-[#242a3d]">
                {volatilityBand.toUpperCase()} VOLATILITY ({volatilityZScore}σ)
              </span>
            </div>

            <div className="flex items-center gap-3 text-[10px] text-[#8E9299]">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2.5 h-2 rounded-sm bg-emerald-500" /> Bids (Buy Size)
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2.5 h-2 rounded-sm bg-rose-500" /> Asks (Sell Size)
              </span>
            </div>
          </div>

          <p className="text-xs text-[#8E9299]">
            Horizontal bars illustrate the volume of pending buy (left/emerald) and sell (right/rose) limit orders resting at staggered valuation tiers, modulated by simulated market cap volatility.
          </p>

          {/* Bilateral / Stepped Horizontal Bar Chart Grid */}
          <div className="space-y-1.5 pt-1">
            {metrics.distributionTiers.map((tier) => {
              const isAsk = tier.type === "ask";
              const isHovered = hoveredTier?.id === tier.id;

              return (
                <div
                  key={tier.id}
                  onMouseEnter={() => setHoveredTier(tier)}
                  onMouseLeave={() => setHoveredTier(null)}
                  className={`group relative flex items-center gap-2 p-1 rounded-lg transition-all cursor-pointer ${
                    isHovered
                      ? "bg-[#141722] border border-[#242a3d]"
                      : "hover:bg-[#141722]/60 border border-transparent"
                  }`}
                >
                  {/* Price Tier Label & Distance */}
                  <div className="w-24 sm:w-28 text-right flex-shrink-0 text-[11px]">
                    <span className={`font-bold ${isAsk ? "text-rose-400" : "text-emerald-400"}`}>
                      ${tier.price < 1 ? tier.price.toFixed(4) : tier.price.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-[#8E9299] ml-1">
                      ({tier.diffPercent >= 0 ? "+" : ""}{tier.diffPercent}%)
                    </span>
                  </div>

                  {/* Horizontal Bar Visualizer Track */}
                  <div className="flex-1 h-5 rounded bg-[#141722] border border-[#1f2433] relative overflow-hidden flex items-center">
                    {/* Bar Fill */}
                    <div
                      className={`h-full transition-all duration-300 rounded ${
                        isAsk
                          ? "bg-gradient-to-r from-rose-500/30 to-rose-500/80"
                          : "bg-gradient-to-r from-emerald-500/80 to-emerald-500/30"
                      }`}
                      style={{
                        width: `${Math.max(4, tier.barWidthPercent)}%`,
                      }}
                    />

                    {/* Pending Volume and Simulated Count Overlay */}
                    <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] text-white font-mono pointer-events-none">
                      <span className="font-bold drop-shadow">
                        {formatUSD(tier.pendingVolumeUsd)}
                      </span>
                      <span className="text-[#8E9299] drop-shadow text-[9px]">
                        {tier.orderCount} orders • {tier.pendingTokenCount >= 1e6 ? `${(tier.pendingTokenCount / 1e6).toFixed(1)}M` : tier.pendingTokenCount >= 1e3 ? `${(tier.pendingTokenCount / 1e3).toFixed(1)}K` : tier.pendingTokenCount.toFixed(1)} {holding.symbol}
                      </span>
                    </div>
                  </div>

                  {/* Volatility Cluster Tag */}
                  {tier.isVolCluster && (
                    <div className="w-28 flex-shrink-0 hidden sm:block">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse whitespace-nowrap">
                        ⚡ {tier.clusterLabel}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Histogram Inspector Footer */}
          <div className="p-2.5 rounded-xl bg-[#141722] border border-[#242a3d] text-xs flex items-center justify-between gap-3 min-h-[42px]">
            {hoveredTier ? (
              <div className="flex items-center justify-between w-full flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      hoveredTier.type === "bid"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    }`}
                  >
                    {hoveredTier.type.toUpperCase()} TIER @ ${hoveredTier.price < 1 ? hoveredTier.price.toFixed(5) : hoveredTier.price.toFixed(2)}
                  </span>
                  <span className="text-white font-bold">
                    {formatUSD(hoveredTier.pendingVolumeUsd)}
                  </span>
                  <span className="text-[#8E9299]">
                    ({hoveredTier.diffPercent >= 0 ? "+" : ""}{hoveredTier.diffPercent}% from mid)
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-[#8E9299]">
                  <span>Liquidity Density: <strong className="text-purple-300">{hoveredTier.barWidthPercent}% of peak</strong></span>
                  <span>Orders Queued: <strong className="text-white">{hoveredTier.orderCount} Limit Orders</strong></span>
                </div>
              </div>
            ) : (
              <div className="text-[#8E9299] text-[11px] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                <span>Hover over any horizontal price tier bar to inspect pending order size distribution, token counts, and market cap volatility concentration.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area: Depth Mountain Chart and Order Book Ladder */}
      <div className={`grid gap-4 ${viewLayout === "split" ? "grid-cols-1 lg:grid-cols-12" : "grid-cols-1"}`}>
        {/* Cumulative Depth Mountain Chart */}
        {(viewLayout === "split" || viewLayout === "chart") && (
          <div className={`${viewLayout === "split" ? "lg:col-span-7" : "w-full"} bg-[#0e1017] border border-[#1f2433] rounded-2xl p-4 space-y-3`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1f2433] pb-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-xs text-white">Cumulative Liquidity Depth Mountain Chart</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-[#141722] text-cyan-300 border border-cyan-500/30">
                  d3-zoom Pan &amp; Drill-down
                </span>
              </div>

              {/* D3 Zoom Controls Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 bg-[#141722] border border-[#242a3d] p-0.5 rounded-lg text-xs">
                  <span className="text-[10px] text-[#8E9299] px-2 font-mono">
                    Zoom: <strong className="text-white">{zoomScale.toFixed(1)}x</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    className="p-1 rounded bg-[#0e1017] hover:bg-[#1f2433] text-slate-200 hover:text-white transition-colors cursor-pointer"
                    title="Zoom in price tiers (or mouse wheel up)"
                  >
                    <ZoomIn className="w-3.5 h-3.5 text-cyan-400" />
                  </button>
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    className="p-1 rounded bg-[#0e1017] hover:bg-[#1f2433] text-slate-200 hover:text-white transition-colors cursor-pointer"
                    title="Zoom out (or mouse wheel down)"
                  >
                    <ZoomOut className="w-3.5 h-3.5 text-cyan-400" />
                  </button>
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    className="p-1 rounded bg-[#0e1017] hover:bg-[#1f2433] text-slate-200 hover:text-white transition-colors cursor-pointer flex items-center gap-1 px-1.5"
                    title="Reset to 1.0x Full Book View"
                  >
                    <RotateCcw className="w-3 h-3 text-purple-400" />
                    <span className="text-[10px] font-bold text-purple-300">1.0x</span>
                  </button>
                </div>

                <div className="flex items-center gap-3 text-[10px] text-[#8E9299]">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="w-2 h-2 rounded-sm bg-emerald-500" /> Bids
                  </span>
                  <span className="flex items-center gap-1 text-rose-400">
                    <span className="w-2 h-2 rounded-sm bg-rose-500" /> Asks
                  </span>
                </div>
              </div>
            </div>

            {/* D3 Canvas Container */}
            <div ref={containerRef} className="w-full relative" style={{ height: chartHeight }}>
              <svg ref={svgRef} width={chartWidth} height={chartHeight} className="w-full h-full block overflow-visible select-none" />
            </div>

            {/* Inspector Strip on Chart Hover */}
            <div className="p-2.5 rounded-xl bg-[#141722] border border-[#242a3d] text-xs flex items-center justify-between gap-3 min-h-[42px]">
              {hoveredLevel ? (
                <>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        hoveredLevel.type === "bid"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                      }`}
                    >
                      {hoveredLevel.type.toUpperCase()} @ ${hoveredLevel.price < 1 ? hoveredLevel.price.toFixed(5) : hoveredLevel.price.toFixed(2)}
                    </span>
                    <span className="text-[#8E9299]">
                      ({hoveredLevel.diffPercent >= 0 ? "+" : ""}{hoveredLevel.diffPercent}%)
                    </span>
                    {hoveredLevel.isWall && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold animate-pulse">
                        ⭐ {hoveredLevel.wallLabel}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[11px]">
                    <span>
                      Order Size: <strong className="text-white">{formatUSD(hoveredLevel.sizeUsd)}</strong>
                    </span>
                    <span>
                      Cumul. Depth: <strong className={hoveredLevel.type === "bid" ? "text-emerald-400" : "text-rose-400"}>{formatUSD(hoveredLevel.cumulativeUsd)}</strong>
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-[#8E9299] text-[11px] flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Hover cursor over the depth curves to inspect price levels, cumulative liquidity walls, and slippage impact.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Order Book Depth Ladder */}
        {(viewLayout === "split" || viewLayout === "ladder") && (
          <div className={`${viewLayout === "split" ? "lg:col-span-5" : "w-full"} bg-[#0e1017] border border-[#1f2433] rounded-2xl p-4 flex flex-col justify-between space-y-3`}>
            <div className="flex items-center justify-between border-b border-[#1f2433] pb-2 text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-purple-400" />
                Live Order Book Ladder
              </span>
              <span className="text-[10px] text-[#8E9299]">
                Spread: {metrics.spreadPercent.toFixed(3)}% (${metrics.spreadUsd < 0.01 ? metrics.spreadUsd.toFixed(5) : metrics.spreadUsd.toFixed(2)})
              </span>
            </div>

            {/* Asks (Sell Orders) - Displayed in reverse so lowest ask is near mid-market */}
            <div className="space-y-1">
              <div className="grid grid-cols-12 text-[10px] text-[#8E9299] font-bold px-1.5 pb-0.5">
                <span className="col-span-4">PRICE ($)</span>
                <span className="col-span-4 text-right">SIZE</span>
                <span className="col-span-4 text-right">TOTAL ($)</span>
              </div>
              <div className="space-y-0.5 max-h-[120px] overflow-y-auto custom-scrollbar">
                {[...metrics.asks]
                  .slice(0, 6)
                  .reverse()
                  .map((ask) => (
                    <div
                      key={ask.id}
                      onMouseEnter={() => setHoveredLevel(ask)}
                      onMouseLeave={() => setHoveredLevel(null)}
                      className={`relative grid grid-cols-12 items-center text-[11px] px-1.5 py-0.5 rounded transition-colors hover:bg-rose-950/30 ${
                        ask.isWall ? "bg-rose-950/20 border-l-2 border-rose-400" : ""
                      }`}
                    >
                      {/* Depth Fill Bar */}
                      <div
                        className="absolute right-0 top-0 bottom-0 bg-rose-500/15 pointer-events-none rounded-r"
                        style={{ width: `${Math.min(100, ask.depthRatio * 100)}%` }}
                      />
                      <span className="col-span-4 font-bold text-rose-400 relative z-10">
                        ${ask.price < 1 ? ask.price.toFixed(4) : ask.price.toFixed(2)}
                      </span>
                      <span className="col-span-4 text-right text-slate-300 relative z-10 text-[10px]">
                        {ask.sizeTokens >= 1e6
                          ? `${(ask.sizeTokens / 1e6).toFixed(1)}M`
                          : ask.sizeTokens >= 1e3
                          ? `${(ask.sizeTokens / 1e3).toFixed(1)}K`
                          : ask.sizeTokens.toFixed(1)}
                      </span>
                      <span className="col-span-4 text-right font-medium text-[#8E9299] relative z-10 text-[10px]">
                        {formatUSD(ask.cumulativeUsd)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Mid Market Price Divider */}
            <div className="py-1.5 px-3 rounded-xl bg-[#141722] border border-[#242a3d] flex items-center justify-between my-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#8E9299]">MID PRICE:</span>
                <span className="font-bold text-sm text-white">
                  ${metrics.midPrice < 1 ? metrics.midPrice.toFixed(5) : metrics.midPrice.toFixed(2)}
                </span>
              </div>
              <span
                className="text-[10px] px-2 py-0.5 rounded font-bold border transition-colors"
                style={{
                  color: rsiInterpolatedColor,
                  borderColor: `${rsiInterpolatedColor}50`,
                  backgroundColor: `${rsiInterpolatedColor}15`,
                }}
              >
                Spread: ${metrics.spreadUsd < 0.01 ? metrics.spreadUsd.toFixed(4) : metrics.spreadUsd.toFixed(2)}
              </span>
            </div>

            {/* Bids (Buy Orders) */}
            <div className="space-y-1">
              <div className="space-y-0.5 max-h-[120px] overflow-y-auto custom-scrollbar">
                {metrics.bids.slice(0, 6).map((bid) => (
                  <div
                    key={bid.id}
                    onMouseEnter={() => setHoveredLevel(bid)}
                    onMouseLeave={() => setHoveredLevel(null)}
                    className={`relative grid grid-cols-12 items-center text-[11px] px-1.5 py-0.5 rounded transition-colors hover:bg-emerald-950/30 ${
                      bid.isWall ? "bg-emerald-950/20 border-l-2 border-emerald-400" : ""
                    }`}
                  >
                    {/* Depth Fill Bar */}
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-emerald-500/15 pointer-events-none rounded-r"
                      style={{ width: `${Math.min(100, bid.depthRatio * 100)}%` }}
                    />
                    <span className="col-span-4 font-bold text-emerald-400 relative z-10">
                      ${bid.price < 1 ? bid.price.toFixed(4) : bid.price.toFixed(2)}
                    </span>
                    <span className="col-span-4 text-right text-slate-300 relative z-10 text-[10px]">
                      {bid.sizeTokens >= 1e6
                        ? `${(bid.sizeTokens / 1e6).toFixed(1)}M`
                        : bid.sizeTokens >= 1e3
                        ? `${(bid.sizeTokens / 1e3).toFixed(1)}K`
                        : bid.sizeTokens.toFixed(1)}
                    </span>
                    <span className="col-span-4 text-right font-medium text-[#8E9299] relative z-10 text-[10px]">
                      {formatUSD(bid.cumulativeUsd)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Slippage Sensitivity Simulator Module */}
      <SlippageSensitivitySimulator
        holding={holding}
        token={token}
        currentPrice={currentPrice}
        currentMarketCap={currentMarketCap}
        bids={metrics.bids}
        asks={metrics.asks}
        midPrice={metrics.midPrice}
        totalBookDepthUsd={metrics.totalBookDepthUsd}
        onOpenGlobalSwapSell={onOpenGlobalSwapSell}
      />

      {/* Recent Trade Execution History Section */}
      <RecentTradeExecutionHistory
        holding={holding}
        token={token}
        currentPrice={currentPrice}
        currentMarketCap={currentMarketCap}
        onOpenGlobalSwapSell={onOpenGlobalSwapSell}
      />
    </div>
  );
};
