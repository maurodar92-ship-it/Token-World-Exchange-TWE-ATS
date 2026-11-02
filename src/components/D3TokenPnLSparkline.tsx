import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { PortfolioTokenHolding } from "../utils/walletPortfolioService";
import { TokenRecord } from "../types";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Flame, Zap, Activity } from "lucide-react";

export interface D3TokenPnLSparklineProps {
  holding: PortfolioTokenHolding;
  token?: TokenRecord;
  width?: number;
  height?: number;
  showBadge?: boolean;
  showTooltip?: boolean;
  showZeroBaseline?: boolean;
  showVolatilityHeatmap?: boolean;
  volatilityAlertEnabled?: boolean;
  pulseEffectActive?: boolean;
  overlayMode?: boolean;
  className?: string;
  onHoverPoint?: (point: VolatilityDayPoint | null) => void;
  onSpikeMetrics?: (metrics: TokenVolatilityMetrics) => void;
}

export interface VolatilityDayPoint {
  dayIndex: number; // -7 to 0
  date: Date;
  dateLabel: string;
  marketCap: number;
  tokenPrice: number;
  positionValue: number;
  costBasis: number;
  pnlUsd: number;
  pnlPercent: number;
  returnRate: number; // return rate relative to previous day
  zScore: number; // standard deviation spike multiplier
  volatilityBand: "low" | "moderate" | "high" | "extreme";
  isSpike: boolean; // zScore >= 1.8
  isTwoSigmaSpike: boolean; // zScore >= 2.0 (2-sigma standard deviation spike)
  x?: number;
  y?: number;
}

export interface TokenVolatilityMetrics {
  points: VolatilityDayPoint[];
  currentMcap: number;
  minMcap: number;
  maxMcap: number;
  net7dPnlUsd: number;
  net7dRoiPercent: number;
  isPositive: boolean;
  maxZScore: number;
  spikeCount: number;
  twoSigmaSpikeCount: number;
  hasTwoSigmaSpike: boolean; // zScore >= 2.0 standard deviation shock detected
  stdDevVal: number;
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

// Compact currency formatting helper
function formatCurrency(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

// Color interpolator for volatility heatmap bands
function getVolatilityColor(zScore: number, opacity: number = 1): string {
  if (zScore >= 2.5) return `rgba(236, 72, 153, ${opacity})`; // Extreme spike (Fuchsia/Pink)
  if (zScore >= 2.0) return `rgba(244, 63, 94, ${opacity})`; // 2-Sigma Spike Alert (Rose)
  if (zScore >= 1.8) return `rgba(239, 68, 68, ${opacity})`; // High spike (Red)
  if (zScore >= 1.2) return `rgba(245, 158, 11, ${opacity})`; // Moderate turbulence (Amber)
  return `rgba(6, 182, 212, ${opacity * 0.4})`; // Calm / Normal (Teal)
}

/**
 * Pure calculation function to compute deterministic 7-day volatility metrics,
 * returns, and detect 2-sigma standard deviation spikes based on token market cap history.
 */
export function computeTokenVolatilityMetrics(
  holding: PortfolioTokenHolding,
  token?: TokenRecord
): TokenVolatilityMetrics {
  // 1. Determine baseline market cap
  let baselineMcap = 0;
  if (token?.marketCap && token.marketCap > 0) {
    baselineMcap = token.marketCap;
  } else {
    const sym = holding.symbol.toUpperCase();
    if (sym.includes("MAO")) baselineMcap = 3_000_000_000_000;
    else if (sym === "ETH" || sym === "WETH") baselineMcap = 412_500_000_000;
    else if (sym === "BTC" || sym === "WBTC") baselineMcap = 1_865_000_000_000;
    else if (sym === "USDC") baselineMcap = 34_800_000_000;
    else if (sym === "USDT") baselineMcap = 118_400_000_000;
    else if (sym === "LINK") baselineMcap = 10_900_000_000;
    else if (sym === "UNI") baselineMcap = 6_150_000_000;
    else if (sym === "AAVE") baselineMcap = 3_100_000_000;
    else if (sym === "ARB") baselineMcap = 2_950_000_000;
    else if (sym === "OP") baselineMcap = 2_200_000_000;
    else if (sym === "AERO") baselineMcap = 780_000_000;
    else if (holding.isFoundryToken) {
      baselineMcap = 150_000_000 + (hashString(holding.contractAddress) % 850_000_000);
    } else {
      baselineMcap = Math.max(25_000_000, holding.valueUsd * 2000);
    }
  }

  // 2. Generate 8 daily points (-7 days to 0 days) with deterministic pseudo-random walk
  const seed = hashString(
    `${holding.contractAddress}_${holding.symbol}_${token?.quantum_entropy_signature || ""}_7dpnl`
  );
  let s = seed;
  const rng = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };

  const isStable = holding.symbol === "USDC" || holding.symbol === "USDT";
  const baseVol = isStable ? 0.0008 : 0.032;
  let bias = 0.008;
  if (token?.launchStatus === "Audited" || token?.launchStatus === "Rug-Proof Vault") bias = 0.016;
  else if (token?.launchStatus === "Paused") bias = -0.018;
  else if (holding.symbol.includes("MAO")) bias = 0.022;

  const rawPoints: { day: number; mcap: number; date: Date }[] = new Array(8);
  const now = Date.now();
  rawPoints[7] = {
    day: 0,
    mcap: baselineMcap,
    date: new Date(now),
  };

  let current = baselineMcap;
  for (let i = 6; i >= 0; i--) {
    const dayOffset = -(7 - i);
    // Introduce realistic volatility clustering (e.g. sharp micro-shocks on specific days)
    const shockFactor = rng() > 0.72 ? (rng() - 0.45) * 3.2 : 1.0;
    const randomRate = ((rng() - 0.48) * baseVol * 2 + bias) * shockFactor;
    current = Math.max(10_000, current / (1 + randomRate));
    rawPoints[i] = {
      day: dayOffset,
      mcap: current,
      date: new Date(now + dayOffset * 24 * 3600 * 1000),
    };
  }

  // 3. Compute rates of return between successive daily market caps
  const returnRates: number[] = [];
  for (let i = 0; i < rawPoints.length; i++) {
    if (i === 0) {
      const nextRate = (rawPoints[1].mcap - rawPoints[0].mcap) / rawPoints[0].mcap;
      returnRates.push(nextRate);
    } else {
      const rate = (rawPoints[i].mcap - rawPoints[i - 1].mcap) / rawPoints[i - 1].mcap;
      returnRates.push(rate);
    }
  }

  // 4. Calculate Mean Absolute Return and Standard Deviation (σ)
  const absReturns = returnRates.map((r) => Math.abs(r));
  const meanReturn = d3.mean(absReturns) || 0.01;
  const stdDev = d3.deviation(absReturns) || 0.015;

  // 5. Calculate position value and cost basis benchmark
  const day7Mcap = rawPoints[0].mcap;
  const currentPrice = holding.priceUsd;
  const balance = holding.balance;
  const entryPrice = currentPrice * (day7Mcap / baselineMcap);
  const costBasis = balance * entryPrice;

  // 6. Map to enriched VolatilityDayPoint array with Z-Scores and 2-Sigma Spikes
  let countSpikes = 0;
  let countTwoSigmaSpikes = 0;
  let peakZ = 0;

  const computedPoints: VolatilityDayPoint[] = rawPoints.map((p, idx) => {
    const stepPrice = currentPrice * (p.mcap / baselineMcap);
    const positionValue = balance * stepPrice;
    const pnlUsd = positionValue - costBasis;
    const pnlPercent = costBasis > 0 ? (pnlUsd / costBasis) * 100 : 0;
    const dateLabel = p.day === 0 ? "Today" : `${Math.abs(p.day)}d ago`;

    const ret = returnRates[idx];
    const zScore = Math.max(0.2, Number((Math.abs(ret) / (stdDev || 0.01)).toFixed(2)));
    if (zScore > peakZ) peakZ = zScore;

    let volatilityBand: "low" | "moderate" | "high" | "extreme" = "low";
    if (zScore >= 2.5) volatilityBand = "extreme";
    else if (zScore >= 1.8) volatilityBand = "high";
    else if (zScore >= 1.2) volatilityBand = "moderate";

    const isSpike = zScore >= 1.8;
    const isTwoSigmaSpike = zScore >= 2.0;
    if (isSpike) countSpikes++;
    if (isTwoSigmaSpike) countTwoSigmaSpikes++;

    return {
      dayIndex: p.day,
      date: p.date,
      dateLabel,
      marketCap: p.mcap,
      tokenPrice: stepPrice,
      positionValue,
      costBasis,
      pnlUsd,
      pnlPercent,
      returnRate: ret,
      zScore,
      volatilityBand,
      isSpike,
      isTwoSigmaSpike,
    };
  });

  const mcaps = computedPoints.map((p) => p.marketCap);
  const minM = Math.min(...mcaps);
  const maxM = Math.max(...mcaps);

  const latestPoint = computedPoints[computedPoints.length - 1];
  const initialPoint = computedPoints[0];
  const net7d = latestPoint.positionValue - initialPoint.positionValue;
  const net7dRoi = initialPoint.positionValue > 0 ? (net7d / initialPoint.positionValue) * 100 : 0;

  return {
    points: computedPoints,
    currentMcap: baselineMcap,
    minMcap: minM,
    maxMcap: maxM,
    net7dPnlUsd: net7d,
    net7dRoiPercent: net7dRoi,
    isPositive: net7d >= 0,
    maxZScore: peakZ,
    spikeCount: countSpikes,
    twoSigmaSpikeCount: countTwoSigmaSpikes,
    hasTwoSigmaSpike: peakZ >= 2.0 || countTwoSigmaSpikes > 0,
    stdDevVal: stdDev,
  };
}

export const D3TokenPnLSparkline: React.FC<D3TokenPnLSparklineProps> = ({
  holding,
  token,
  width: customWidth,
  height = 60,
  showBadge = true,
  showTooltip = true,
  showZeroBaseline = true,
  showVolatilityHeatmap = true,
  volatilityAlertEnabled = true,
  pulseEffectActive = false,
  overlayMode = false,
  className = "",
  onHoverPoint,
  onSpikeMetrics,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(customWidth || 280);
  const [hoveredPoint, setHoveredPoint] = useState<VolatilityDayPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [heatmapEnabled, setHeatmapEnabled] = useState<boolean>(showVolatilityHeatmap);

  // ResizeObserver for dynamic fluid sizing
  useEffect(() => {
    if (customWidth) {
      setContainerWidth(customWidth);
      return;
    }
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const w = entries[0].contentRect.width;
      if (w > 50) {
        setContainerWidth(Math.floor(w));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [customWidth]);

  // Compute 7-day market cap history, PnL trend, and Standard Deviation Volatility Spikes
  const metrics = useMemo(() => computeTokenVolatilityMetrics(holding, token), [holding, token]);

  const {
    points,
    currentMcap,
    minMcap,
    maxMcap,
    net7dPnlUsd,
    net7dRoiPercent,
    isPositive,
    maxZScore,
    spikeCount,
    twoSigmaSpikeCount,
    hasTwoSigmaSpike,
    stdDevVal,
  } = metrics;

  useEffect(() => {
    if (onSpikeMetrics) {
      onSpikeMetrics(metrics);
    }
  }, [metrics, onSpikeMetrics]);

  // Render D3 chart & Volatility Heatmap Overlay onto SVG
  useEffect(() => {
    if (!svgRef.current || points.length === 0 || containerWidth <= 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = containerWidth;
    const paddingX = 6;
    const paddingTop = 6;
    const paddingBottom = heatmapEnabled ? 10 : 6;

    // Scales
    const xScale = d3
      .scaleLinear()
      .domain([0, points.length - 1])
      .range([paddingX, width - paddingX]);

    const pnls = points.map((p) => p.pnlUsd);
    let minPnl = Math.min(...pnls);
    let maxPnl = Math.max(...pnls);

    if (minPnl === maxPnl) {
      minPnl -= 1;
      maxPnl += 1;
    }
    const pnlRange = maxPnl - minPnl;
    const buffer = pnlRange * 0.15;

    const chartHeight = height - paddingBottom;
    const yScale = d3
      .scaleLinear()
      .domain([minPnl - buffer, maxPnl + buffer])
      .range([chartHeight, paddingTop]);

    // Unique gradient IDs
    const gradId = `d3-pnl-grad-${holding.id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    const heatGradId = `d3-heat-grad-${holding.id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    const strokeColor = isPositive ? "#10B981" : "#EF4444";

    const defs = svg.append("defs");

    // Standard PnL Area Linear Gradient
    const linearGrad = defs
      .append("linearGradient")
      .attr("id", gradId)
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    linearGrad
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", strokeColor)
      .attr("stop-opacity", overlayMode ? 0.35 : 0.25);

    linearGrad
      .append("stop")
      .attr("offset", "80%")
      .attr("stop-color", strokeColor)
      .attr("stop-opacity", overlayMode ? 0.08 : 0.04);

    linearGrad
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", strokeColor)
      .attr("stop-opacity", 0.0);

    // Filter for glowing standard deviation spikes
    const filter = defs.append("filter").attr("id", `spike-glow-${holding.id.replace(/[^a-zA-Z0-9_-]/g, "_")}`);
    filter.append("feGaussianBlur").attr("stdDeviation", "2.5").attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // =========================================================================
    // 1. D3 VOLATILITY HEATMAP OVERLAY: Vertical Standard Deviation Heat Bands
    // =========================================================================
    if (heatmapEnabled) {
      const stepWidth = (width - paddingX * 2) / (points.length - 1);
      const heatmapGroup = svg.append("g").attr("class", "volatility-heatmap-bands");

      points.forEach((pt, idx) => {
        const xCenter = xScale(idx);
        const xStart = Math.max(0, xCenter - stepWidth / 2);
        const bandWidth = Math.min(width - xStart, stepWidth);

        // Calculate heat intensity based on Z-Score
        let bandOpacity = 0.06;
        let bandColor = "#06B6D4"; // Normal

        if (pt.zScore >= 2.5) {
          bandColor = "#EC4899"; // Extreme pink/magenta
          bandOpacity = 0.38;
        } else if (pt.zScore >= 1.8) {
          bandColor = "#EF4444"; // High red
          bandOpacity = 0.28;
        } else if (pt.zScore >= 1.2) {
          bandColor = "#F59E0B"; // Moderate amber
          bandOpacity = 0.16;
        }

        // Vertical heat column
        heatmapGroup
          .append("rect")
          .attr("x", xStart)
          .attr("y", 0)
          .attr("width", bandWidth)
          .attr("height", chartHeight)
          .attr("fill", bandColor)
          .attr("opacity", bandOpacity)
          .attr("class", "transition-opacity duration-300 pointer-events-none");
      });

      // Bottom Volatility Heat Ribbon Bar (3px high)
      const ribbonGroup = svg.append("g").attr("class", "volatility-heat-ribbon");
      points.forEach((pt, idx) => {
        const xCenter = xScale(idx);
        const xStart = Math.max(0, xCenter - stepWidth / 2);
        const bandWidth = Math.min(width - xStart, stepWidth);

        let ribbonColor = "#06B6D4";
        if (pt.zScore >= 2.5) ribbonColor = "#EC4899";
        else if (pt.zScore >= 1.8) ribbonColor = "#EF4444";
        else if (pt.zScore >= 1.2) ribbonColor = "#F59E0B";

        ribbonGroup
          .append("rect")
          .attr("x", xStart)
          .attr("y", height - 4)
          .attr("width", bandWidth)
          .attr("height", 3)
          .attr("fill", ribbonColor)
          .attr("opacity", 0.85);
      });
    }

    // Optional zero baseline
    if (showZeroBaseline && minPnl < 0 && maxPnl > 0) {
      const zeroY = yScale(0);
      svg
        .append("line")
        .attr("x1", paddingX)
        .attr("x2", width - paddingX)
        .attr("y1", zeroY)
        .attr("y2", zeroY)
        .attr("stroke", "#334155")
        .attr("stroke-dasharray", "3,3")
        .attr("stroke-width", 1);
    }

    // Area Generator
    const areaGenerator = d3
      .area<VolatilityDayPoint>()
      .x((_, i) => xScale(i))
      .y0(chartHeight)
      .y1((d) => yScale(d.pnlUsd))
      .curve(d3.curveMonotoneX);

    svg
      .append("path")
      .datum(points)
      .attr("fill", `url(#${gradId})`)
      .attr("d", areaGenerator);

    // Line Generator
    const lineGenerator = d3
      .line<VolatilityDayPoint>()
      .x((_, i) => xScale(i))
      .y((d) => yScale(d.pnlUsd))
      .curve(d3.curveMonotoneX);

    svg
      .append("path")
      .datum(points)
      .attr("fill", "none")
      .attr("stroke", strokeColor)
      .attr("stroke-width", overlayMode ? 2.5 : 2)
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .attr("d", lineGenerator);

    // =========================================================================
    // 2. STANDARD DEVIATION SPIKE MARKERS (When zScore >= 1.8σ or 2.0σ)
    // =========================================================================
    if (heatmapEnabled) {
      const spikesGroup = svg.append("g").attr("class", "standard-deviation-spikes");

      points.forEach((pt, i) => {
        if (!pt.isSpike) return;

        const spikeX = xScale(i);
        const spikeY = yScale(pt.pnlUsd);
        const isTwoSigma = pt.isTwoSigmaSpike || pt.zScore >= 2.0;
        const spikeColor = isTwoSigma ? "#F43F5E" : pt.zScore >= 2.5 ? "#EC4899" : "#F59E0B";

        // Enhanced 2-Sigma Visual Pulse Effect Rings
        if (isTwoSigma && volatilityAlertEnabled) {
          // Intense outer pulsing ping halo
          spikesGroup
            .append("circle")
            .attr("cx", spikeX)
            .attr("cy", spikeY)
            .attr("r", 9)
            .attr("fill", "#F43F5E")
            .attr("opacity", 0.65)
            .attr("class", "animate-ping pointer-events-none");

          // Secondary subtle pulsing radar ring
          spikesGroup
            .append("circle")
            .attr("cx", spikeX)
            .attr("cy", spikeY)
            .attr("r", 13)
            .attr("fill", "none")
            .attr("stroke", "#F43F5E")
            .attr("stroke-width", 1.2)
            .attr("opacity", 0.5)
            .attr("stroke-dasharray", "2,2")
            .attr("class", "pointer-events-none");
        } else {
          // Standard pulsing ping ring
          spikesGroup
            .append("circle")
            .attr("cx", spikeX)
            .attr("cy", spikeY)
            .attr("r", 6)
            .attr("fill", spikeColor)
            .attr("opacity", 0.45)
            .attr("class", "animate-ping pointer-events-none");
        }

        // Glowing Diamond indicator for standard deviation spike
        const diamondPath = d3
          .symbol()
          .type(d3.symbolDiamond)
          .size(isTwoSigma ? 75 : pt.zScore >= 2.5 ? 65 : 45);

        spikesGroup
          .append("path")
          .attr("d", diamondPath)
          .attr("transform", `translate(${spikeX}, ${spikeY})`)
          .attr("fill", spikeColor)
          .attr("stroke", isTwoSigma ? "#FFFFFF" : "#0e1017")
          .attr("stroke-width", isTwoSigma ? 1.5 : 1)
          .attr("filter", `url(#spike-glow-${holding.id.replace(/[^a-zA-Z0-9_-]/g, "_")})`)
          .attr("class", "pointer-events-none");

        // Small 2σ text callout if 2-sigma alert is active
        if (isTwoSigma && volatilityAlertEnabled && overlayMode) {
          spikesGroup
            .append("text")
            .attr("x", spikeX)
            .attr("y", Math.max(12, spikeY - 10))
            .attr("text-anchor", "middle")
            .attr("fill", "#FDA4AF")
            .attr("font-size", "8px")
            .attr("font-family", "monospace")
            .attr("font-weight", "bold")
            .attr("class", "pointer-events-none drop-shadow")
            .text(`${pt.zScore}σ`);
        }
      });
    }

    // End-point Glowing Pulse Dot (Today)
    const lastPoint = points[points.length - 1];
    const lastX = xScale(points.length - 1);
    const lastY = yScale(lastPoint.pnlUsd);

    svg
      .append("circle")
      .attr("cx", lastX)
      .attr("cy", lastY)
      .attr("r", 5)
      .attr("fill", strokeColor)
      .attr("opacity", 0.35)
      .attr("class", "animate-ping pointer-events-none");

    svg
      .append("circle")
      .attr("cx", lastX)
      .attr("cy", lastY)
      .attr("r", 3)
      .attr("fill", strokeColor)
      .attr("stroke", "#0e1017")
      .attr("stroke-width", 1.5)
      .attr("class", "pointer-events-none");

    // Interactive pointer tracker
    const crosshairLine = svg
      .append("line")
      .attr("stroke", "#64748B")
      .attr("stroke-dasharray", "2,2")
      .attr("stroke-width", 1)
      .style("display", "none");

    const hoverDot = svg
      .append("circle")
      .attr("r", 4.5)
      .attr("fill", strokeColor)
      .attr("stroke", "#FFFFFF")
      .attr("stroke-width", 1.5)
      .style("display", "none");

    // Transparent mouse overlay for interactive scrubbing
    svg
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent")
      .attr("cursor", "crosshair")
      .on("mousemove", (event) => {
        const [mouseX] = d3.pointer(event);
        const index = Math.round(xScale.invert(mouseX));
        const clampedIndex = Math.max(0, Math.min(points.length - 1, index));
        const pt = points[clampedIndex];

        const cx = xScale(clampedIndex);
        const cy = yScale(pt.pnlUsd);

        crosshairLine
          .style("display", null)
          .attr("x1", cx)
          .attr("x2", cx)
          .attr("y1", paddingTop)
          .attr("y2", chartHeight);

        hoverDot
          .style("display", null)
          .attr("cx", cx)
          .attr("cy", cy);

        setHoveredPoint({ ...pt, x: cx, y: cy });
        setTooltipPos({ x: Math.min(width - 150, Math.max(10, cx - 75)), y: Math.max(2, cy - 64) });
        if (onHoverPoint) onHoverPoint(pt);
      })
      .on("mouseleave", () => {
        crosshairLine.style("display", "none");
        hoverDot.style("display", "none");
        setHoveredPoint(null);
        setTooltipPos(null);
        if (onHoverPoint) onHoverPoint(null);
      });
  }, [
    points,
    containerWidth,
    height,
    isPositive,
    overlayMode,
    showZeroBaseline,
    heatmapEnabled,
    volatilityAlertEnabled,
    holding.id,
    onHoverPoint,
  ]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden select-none ${className} ${
        pulseEffectActive ? "ring-1 ring-rose-500/40 rounded-lg" : ""
      }`}
      style={{ height }}
    >
      {/* SVG Canvas for D3.js with Heatmap & Spikes */}
      <svg
        ref={svgRef}
        width={containerWidth}
        height={height}
        className="w-full h-full block overflow-visible"
      />

      {/* Top Controls: 7-Day Net PnL Badge + Volatility Heatmap Toggle */}
      <div className="absolute top-1 right-1.5 flex items-center gap-1.5 pointer-events-auto">
        {/* Volatility Spike Badge (With High-Priority 2-Sigma Alert Styling) */}
        {!hoveredPoint && (
          <>
            {volatilityAlertEnabled && hasTwoSigmaSpike ? (
              <span
                className="inline-flex items-center gap-1 font-mono text-[9px] px-1.5 py-0.5 rounded backdrop-blur-sm border bg-rose-500/25 text-rose-200 border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.4)] animate-pulse font-bold"
                title={`2-Sigma Standard Deviation Spike Alert: ${maxZScore}σ shock detected with ${twoSigmaSpikeCount} day(s) >= 2.0σ`}
              >
                <Zap className="w-2.5 h-2.5 text-rose-300 fill-rose-300 animate-bounce" />
                <span>2σ ALERT ({maxZScore}σ)</span>
              </span>
            ) : spikeCount > 0 ? (
              <span
                className={`inline-flex items-center gap-0.5 font-mono text-[9px] px-1.5 py-0.5 rounded backdrop-blur-sm border ${
                  maxZScore >= 2.5
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                }`}
                title={`Detected ${spikeCount} standard deviation volatility spikes (Peak: ${maxZScore}σ)`}
              >
                <Flame className="w-2.5 h-2.5 animate-pulse" />
                <span>{maxZScore}σ Spike</span>
              </span>
            ) : null}
          </>
        )}

        {/* 7D PnL Badge */}
        {showBadge && !hoveredPoint && (
          <div className="flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-[#0e1017]/85 border border-[#1f2433] backdrop-blur-sm pointer-events-none">
            <span className={`inline-flex items-center gap-0.5 font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
              {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {isPositive ? "+" : ""}{net7dRoiPercent.toFixed(1)}% (7D)
            </span>
          </div>
        )}
      </div>

      {/* Interactive Tooltip on Hover showing PnL and Standard Deviation Heat */}
      {showTooltip && hoveredPoint && tooltipPos && (
        <div
          className="absolute pointer-events-none z-30 font-mono text-[10px] bg-[#0e1017]/95 border border-[#242a3d] px-2.5 py-1.5 rounded-lg shadow-xl backdrop-blur-md text-white whitespace-nowrap animate-in fade-in duration-100"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
          }}
        >
          <div className="flex items-center justify-between gap-3 text-[#8E9299] border-b border-[#1f2433] pb-0.5 mb-1">
            <span>{hoveredPoint.dateLabel}</span>
            <span className="text-cyan-400 font-semibold">{formatCurrency(hoveredPoint.marketCap)} cap</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#8E9299]">PnL:</span>
            <span className={`font-bold ${hoveredPoint.pnlUsd >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {hoveredPoint.pnlUsd >= 0 ? "+" : ""}${hoveredPoint.pnlUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              {" "}({hoveredPoint.pnlPercent >= 0 ? "+" : ""}{hoveredPoint.pnlPercent.toFixed(1)}%)
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-[#1f2433] mt-1 text-[9px]">
            <span className="text-[#8E9299] flex items-center gap-1">
              <Zap className="w-2.5 h-2.5 text-amber-400" />
              Volatility:
            </span>
            <span
              className={`font-semibold ${
                hoveredPoint.zScore >= 2.5
                  ? "text-rose-400 font-bold"
                  : hoveredPoint.zScore >= 1.8
                  ? "text-amber-400 font-bold"
                  : "text-cyan-300"
              }`}
            >
              {hoveredPoint.zScore}σ ({hoveredPoint.volatilityBand}
              {hoveredPoint.isSpike ? " spike 🔥" : ""})
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
