import React, { useMemo, useState } from "react";
import { TokenRecord } from "../types";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";

export interface TokenMarketCapSparklineProps {
  token: TokenRecord;
  width?: number;
  height?: number;
  showBadge?: boolean;
  showTooltip?: boolean;
  compact?: boolean;
  className?: string;
}

interface Point {
  day: number; // -7 to 0
  label: string;
  mcap: number;
  x: number;
  y: number;
}

// Deterministic 32-bit hash function
function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Format compact currency helper
function formatMcapCompact(val: number): string {
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
  return `$${val.toFixed(2)}`;
}

export const TokenMarketCapSparkline: React.FC<TokenMarketCapSparklineProps> = ({
  token,
  width = 112,
  height = 32,
  showBadge = true,
  showTooltip = true,
  compact = false,
  className = "",
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<Point | null>(null);

  const trendData = useMemo(() => {
    const seed = hashSeed(
      `${token.id}_${token.symbol}_${token.quantum_entropy_signature || ""}_${token.chain}`
    );
    let s = seed;
    const rng = () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };

    // Determine target 7-day trend direction based on status & narrative
    let bias = 0.005; // slightly positive by default
    if (token.launchStatus === "Audited" || token.launchStatus === "Rug-Proof Vault") {
      bias = 0.012;
    } else if (token.launchStatus === "Paused") {
      bias = -0.015;
    } else if (token.launchStatus === "Presale") {
      bias = 0.02;
    }

    // Generate 8 points backwards from day 0 (today) to day -7
    const rawPoints: { day: number; label: string; mcap: number }[] = new Array(8);
    rawPoints[7] = {
      day: 0,
      label: "Now",
      mcap: token.marketCap,
    };

    let current = token.marketCap;
    for (let i = 6; i >= 0; i--) {
      const dayOffset = -(7 - i);
      // Volatility between -4% and +4%, modulated by bias
      const randomFactor = (rng() - 0.48) * 0.08 + bias;
      // Step backwards
      current = Math.max(10000, current / (1 + randomFactor));
      rawPoints[i] = {
        day: dayOffset,
        label: `${Math.abs(dayOffset)}d ago`,
        mcap: current,
      };
    }

    const mcaps = rawPoints.map((p) => p.mcap);
    const minMcap = Math.min(...mcaps);
    const maxMcap = Math.max(...mcaps);
    const range = maxMcap - minMcap || 1;

    // SVG plotting padding
    const paddingX = 4;
    const paddingTop = 4;
    const paddingBottom = 4;
    const usableW = width - paddingX * 2;
    const usableH = height - paddingTop - paddingBottom;

    const points: Point[] = rawPoints.map((p, idx) => {
      const x = paddingX + (idx / 7) * usableW;
      const normalizedY = (p.mcap - minMcap) / range;
      // Invert Y for SVG coordinates
      const y = paddingTop + (1 - normalizedY) * usableH;
      return {
        ...p,
        x,
        y,
      };
    });

    // Build smooth cubic bezier curve
    let linePath = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      linePath += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(
        2
      )}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }

    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];
    const areaPath = `${linePath} L ${lastPoint.x.toFixed(2)} ${height} L ${firstPoint.x.toFixed(
      2
    )} ${height} Z`;

    const startMcap = rawPoints[0].mcap;
    const endMcap = token.marketCap;
    const changeUsd = endMcap - startMcap;
    const changePercent = ((endMcap - startMcap) / startMcap) * 100;
    const isPositive = changePercent >= 0;

    return {
      points,
      linePath,
      areaPath,
      startMcap,
      endMcap,
      highMcap: maxMcap,
      lowMcap: minMcap,
      changeUsd,
      changePercent,
      isPositive,
      lastPoint,
    };
  }, [token.id, token.symbol, token.quantum_entropy_signature, token.chain, token.launchStatus, token.marketCap, width, height]);

  const strokeColor = trendData.isPositive ? "#10B981" : "#F43F5E";
  const glowColor = trendData.isPositive ? "rgba(16, 185, 129, 0.35)" : "rgba(244, 63, 94, 0.35)";
  const gradientId = `mcap-spark-${token.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <div
      className={`relative inline-flex flex-col items-center select-none group/spark ${className}`}
      onMouseLeave={() => setHoveredPoint(null)}
    >
      <div className="relative flex items-center justify-center">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="overflow-visible cursor-crosshair"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            // Find closest point along x axis
            let closest = trendData.points[0];
            let minDist = Math.abs(mouseX - closest.x);
            for (let i = 1; i < trendData.points.length; i++) {
              const d = Math.abs(mouseX - trendData.points[i].x);
              if (d < minDist) {
                minDist = d;
                closest = trendData.points[i];
              }
            }
            setHoveredPoint(closest);
          }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.38} />
              <stop offset="75%" stopColor={strokeColor} stopOpacity={0.08} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
            <filter id={`glow-${gradientId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor={glowColor} />
            </filter>
          </defs>

          {/* Area fill */}
          <path d={trendData.areaPath} fill={`url(#${gradientId})`} />

          {/* Smooth trendline */}
          <path
            d={trendData.linePath}
            fill="none"
            stroke={strokeColor}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#glow-${gradientId})`}
          />

          {/* Start Point indicator */}
          <circle
            cx={trendData.points[0].x}
            cy={trendData.points[0].y}
            r={1.75}
            fill={strokeColor}
            opacity={0.4}
          />

          {/* End Point / Current MCap pulsing dot */}
          <circle
            cx={trendData.lastPoint.x}
            cy={trendData.lastPoint.y}
            r={2.5}
            fill={strokeColor}
            className="animate-pulse"
          />
          <circle
            cx={trendData.lastPoint.x}
            cy={trendData.lastPoint.y}
            r={4.5}
            fill="none"
            stroke={strokeColor}
            strokeWidth={0.8}
            opacity={0.6}
          />

          {/* Interactive Hover Point Indicator */}
          {hoveredPoint && (
            <g>
              <line
                x1={hoveredPoint.x}
                y1={0}
                x2={hoveredPoint.x}
                y2={height}
                stroke="#8E9299"
                strokeWidth={0.75}
                strokeDasharray="2,2"
                opacity={0.5}
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r={3.5}
                fill="#FFFFFF"
                stroke={strokeColor}
                strokeWidth={1.5}
              />
            </g>
          )}
        </svg>

        {/* Hover Tooltip Overlay */}
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/spark:flex flex-col items-center z-40 pointer-events-none transition-all">
            <div className="bg-[#090C16] border border-[#202944] rounded-lg px-2.5 py-1.5 shadow-2xl text-[10px] font-mono whitespace-nowrap min-w-[130px]">
              <div className="flex items-center justify-between gap-3 text-[#8E9299] pb-1 border-b border-[#182034]">
                <span className="font-bold text-white flex items-center gap-1">
                  {trendData.isPositive ? (
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-rose-400" />
                  )}
                  {token.symbol} 7D MCap
                </span>
                <span
                  className={`font-semibold ${
                    trendData.isPositive ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {trendData.isPositive ? "+" : ""}
                  {trendData.changePercent.toFixed(1)}%
                </span>
              </div>

              {hoveredPoint ? (
                <div className="mt-1 space-y-0.5">
                  <div className="flex justify-between text-slate-400">
                    <span>{hoveredPoint.label}:</span>
                    <span className="font-bold text-white">
                      {formatMcapCompact(hoveredPoint.mcap)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-1 space-y-0.5">
                  <div className="flex justify-between text-slate-400">
                    <span>Current:</span>
                    <span className="font-bold text-white">
                      {formatMcapCompact(trendData.endMcap)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[9px]">
                    <span>7D High:</span>
                    <span className="text-slate-300">
                      {formatMcapCompact(trendData.highMcap)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[9px]">
                    <span>7D Low:</span>
                    <span className="text-slate-300">
                      {formatMcapCompact(trendData.lowMcap)}
                    </span>
                  </div>
                </div>
              )}
            </div>
            {/* Tooltip caret */}
            <div className="w-2 h-2 bg-[#090C16] border-r border-b border-[#202944] transform rotate-45 -mt-1" />
          </div>
        )}
      </div>

      {/* 7D Delta Percentage Badge */}
      {showBadge && (
        <div
          className={`mt-0.5 inline-flex items-center gap-0.5 text-[9px] font-mono font-semibold px-1 rounded transition-colors ${
            trendData.isPositive
              ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
              : "text-rose-400 bg-rose-500/10 border border-rose-500/20"
          }`}
          title={`7-Day Market Cap Net Change: ${trendData.isPositive ? "+" : ""}${formatMcapCompact(
            trendData.changeUsd
          )}`}
        >
          {trendData.isPositive ? (
            <ArrowUpRight className="w-2.5 h-2.5" />
          ) : (
            <ArrowDownRight className="w-2.5 h-2.5" />
          )}
          <span>
            {trendData.isPositive ? "+" : ""}
            {trendData.changePercent.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
};
