import React, { useState, useMemo } from "react";
import {
  Activity,
  TrendingUp,
  Layers,
  BarChart3,
  Sliders,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Zap,
  ArrowDownUp,
  Info,
  CheckCircle2,
  DollarSign,
  Gauge,
  Percent,
} from "lucide-react";
import { TokenRecord } from "../types";
import {
  LiquidityPoolInitParameters,
  PoolRangeStrategy,
  SettlementAssetSymbol,
} from "../utils/treasuryCollateralSettlementEngine";

export interface LiquidityPoolDepthPreviewChartProps {
  poolParams: LiquidityPoolInitParameters;
  activeToken: TokenRecord;
  quoteAsset: SettlementAssetSymbol;
  feeTier: 500 | 3000 | 10000;
  rangeStrategy: PoolRangeStrategy;
  liquidityPercent: number;
  slippagePercent: number;
  className?: string;
}

interface DepthBin {
  price: number;
  priceRatio: number;
  diffPercent: number;
  type: "bid" | "ask" | "mid";
  inRange: boolean;
  density: number; // 0 to 1 relative height
  depthUsd: number;
  cumulativeDepthUsd: number;
}

interface SlippageTier {
  tradeSizeUsd: number;
  priceImpactPct: number;
  totalSlippagePct: number;
  effectivePriceUsd: number;
  depthConsumedPct: number;
  isWithinSlippageCollar: boolean;
  status: "SAFE" | "MODERATE" | "HIGH" | "CRITICAL";
}

export const LiquidityPoolDepthPreviewChart: React.FC<
  LiquidityPoolDepthPreviewChartProps
> = ({
  poolParams,
  activeToken,
  quoteAsset,
  feeTier,
  rangeStrategy,
  liquidityPercent,
  slippagePercent,
  className = "",
}) => {
  // Active View Tab: "DEPTH" (AMM Liquidity Distribution) vs "SLIPPAGE" (Volume Impact Curve)
  const [activeTab, setActiveTab] = useState<"DEPTH" | "SLIPPAGE">("DEPTH");
  const [hoveredBin, setHoveredBin] = useState<DepthBin | null>(null);
  const [testTradeAmountUsd, setTestTradeAmountUsd] = useState<number>(() => {
    return Math.max(10000, Math.round(poolParams.totalInitialLiquidityUsd * 0.02));
  });

  const midPrice = poolParams.impliedTokenUnitPriceUsd;
  const lowerBound = poolParams.priceLowerUsd;
  const upperBound = poolParams.priceUpperUsd;
  const totalPoolDepth = poolParams.totalInitialLiquidityUsd;
  const efficiencyMultiplier = poolParams.concentratedCapitalEfficiencyMultiplier;
  const virtualLiquidity = totalPoolDepth * efficiencyMultiplier;

  // =========================================================================
  // 1. GENERATE CONCENTRATED LIQUIDITY DEPTH BINS (31 BINS AROUND MID PRICE)
  // =========================================================================
  const depthBins: DepthBin[] = useMemo(() => {
    const bins: DepthBin[] = [];
    const spanPercent = rangeStrategy === "NARROW" ? 0.25 : rangeStrategy === "WIDE" ? 0.8 : 0.45;
    const steps = 15; // 15 bids + 1 mid + 15 asks = 31 total

    // Generate Bid side (Quote token collateral, price < mid)
    let cumulativeBids = 0;
    const rawBids: DepthBin[] = [];
    for (let i = steps; i >= 1; i--) {
      const diffPct = -((i / steps) * spanPercent * 100);
      const price = midPrice * (1 + diffPct / 100);
      const inRange = price >= lowerBound && price <= upperBound;
      
      // Concentrated Gaussian bell curve density
      const distFromMid = Math.abs(diffPct) / 100;
      const rawDensity = inRange ? Math.exp(-Math.pow(distFromMid / (spanPercent * 0.65), 2)) : 0.05;
      const depthUsd = (totalPoolDepth / 2) * (rawDensity / (steps * 0.7));
      cumulativeBids += depthUsd;

      rawBids.push({
        price,
        priceRatio: price / (VERIFIED_PRICE_MAP[quoteAsset] || 1.0),
        diffPercent: diffPct,
        type: "bid",
        inRange,
        density: Math.min(1, Math.max(0.08, rawDensity)),
        depthUsd,
        cumulativeDepthUsd: cumulativeBids,
      });
    }

    // Mid price bin (Zero point)
    const midBin: DepthBin = {
      price: midPrice,
      priceRatio: poolParams.initialPriceRatio,
      diffPercent: 0,
      type: "mid",
      inRange: true,
      density: 1.0,
      depthUsd: totalPoolDepth * 0.08,
      cumulativeDepthUsd: cumulativeBids,
    };

    // Generate Ask side (Base token inventory, price > mid)
    let cumulativeAsks = 0;
    const rawAsks: DepthBin[] = [];
    for (let i = 1; i <= steps; i++) {
      const diffPct = (i / steps) * spanPercent * 100;
      const price = midPrice * (1 + diffPct / 100);
      const inRange = price >= lowerBound && price <= upperBound;

      const distFromMid = Math.abs(diffPct) / 100;
      const rawDensity = inRange ? Math.exp(-Math.pow(distFromMid / (spanPercent * 0.65), 2)) : 0.05;
      const depthUsd = (totalPoolDepth / 2) * (rawDensity / (steps * 0.7));
      cumulativeAsks += depthUsd;

      rawAsks.push({
        price,
        priceRatio: price / (VERIFIED_PRICE_MAP[quoteAsset] || 1.0),
        diffPercent: diffPct,
        type: "ask",
        inRange,
        density: Math.min(1, Math.max(0.08, rawDensity)),
        depthUsd,
        cumulativeDepthUsd: cumulativeAsks,
      });
    }

    return [...rawBids, midBin, ...rawAsks];
  }, [midPrice, lowerBound, upperBound, totalPoolDepth, rangeStrategy, quoteAsset, poolParams.initialPriceRatio]);

  // =========================================================================
  // 2. SIMULATE SLIPPAGE SENSITIVITY CURVE ACROSS STANDARDIZED TRADE VOLUMES
  // =========================================================================
  const slippageTiers: SlippageTier[] = useMemo(() => {
    // Standard sizes based on pool scale
    const baseScale = Math.max(1000, Math.round(totalPoolDepth * 0.005));
    const tradeSizes = [
      Math.round(baseScale * 0.5),
      Math.round(baseScale * 1),
      Math.round(baseScale * 2.5),
      Math.round(baseScale * 5),
      Math.round(baseScale * 10),
      Math.round(baseScale * 25),
      Math.round(baseScale * 50),
    ];

    const feePct = feeTier / 10000; // e.g. 0.30%

    return tradeSizes.map((size) => {
      // Concentrated liquidity formula: Price Impact ~ S / (VirtualLiquidity + S)
      const rawImpact = (size / (virtualLiquidity + size)) * 100 * 1.15;
      const totalSlippage = rawImpact + feePct;
      const depthConsumed = (size / totalPoolDepth) * 100;
      const isWithinSlippageCollar = totalSlippage <= slippagePercent;

      let status: SlippageTier["status"] = "SAFE";
      if (totalSlippage > 3.0 || depthConsumed > 25) {
        status = "CRITICAL";
      } else if (totalSlippage > 1.5 || depthConsumed > 10) {
        status = "HIGH";
      } else if (totalSlippage > slippagePercent) {
        status = "MODERATE";
      }

      return {
        tradeSizeUsd: size,
        priceImpactPct: rawImpact,
        totalSlippagePct: totalSlippage,
        effectivePriceUsd: midPrice * (1 + rawImpact / 100),
        depthConsumedPct: depthConsumed,
        isWithinSlippageCollar,
        status,
      };
    });
  }, [totalPoolDepth, virtualLiquidity, feeTier, slippagePercent, midPrice]);

  // =========================================================================
  // 3. INTERACTIVE CUSTOM TRADE IMPACT TESTER CALCULATION
  // =========================================================================
  const interactiveTradeImpact = useMemo(() => {
    const size = Math.max(100, testTradeAmountUsd);
    const feePct = feeTier / 10000;
    const rawImpact = (size / (virtualLiquidity + size)) * 100 * 1.15;
    const totalSlippage = rawImpact + feePct;
    const tokensReceived = size / (midPrice * (1 + rawImpact / 200));
    const isCollarPassed = totalSlippage <= slippagePercent;

    return {
      sizeUsd: size,
      tokensReceived,
      priceImpactPct: rawImpact,
      totalSlippagePct: totalSlippage,
      postTradePriceUsd: midPrice * (1 + rawImpact / 100),
      isCollarPassed,
      depthConsumedPct: Math.min(100, (size / totalPoolDepth) * 100),
    };
  }, [testTradeAmountUsd, virtualLiquidity, totalPoolDepth, feeTier, midPrice, slippagePercent]);

  // Maximum single trade size preserving slippage tolerance collar
  const maxSafeTradeCollarUsd = useMemo(() => {
    const targetMaxImpact = Math.max(0.05, slippagePercent - feeTier / 10000);
    // Solve: targetMaxImpact = S / (VirtualLiquidity + S) * 100
    const ratio = targetMaxImpact / 100;
    return Math.max(500, Math.round((virtualLiquidity * ratio) / (1 - ratio)));
  }, [slippagePercent, feeTier, virtualLiquidity]);

  return (
    <div
      className={`rounded-xl bg-[#0B0D18] border border-[#242944] p-4 space-y-4 font-mono shadow-xl ${className}`}
    >
      {/* =================================================================
          CHART HEADER & VIEW SELECTOR TABS
         ================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1C2138] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-gradient-to-br from-[#F27D26]/20 to-amber-500/10 border border-[#F27D26]/30 text-[#F27D26]">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Post-Initialization Liquidity & Slippage Simulation
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">
                {rangeStrategy} · {efficiencyMultiplier.toFixed(1)}x Efficiency
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-sans mt-0.5">
              Simulates real-time market depth and trade slippage based on {liquidityPercent}% allocation ($
              {Math.round(totalPoolDepth).toLocaleString()} USD).
            </p>
          </div>
        </div>

        {/* Dual Mode View Switcher */}
        <div className="flex items-center rounded-lg bg-[#121526] p-1 border border-[#202642]">
          <button
            type="button"
            onClick={() => setActiveTab("DEPTH")}
            className={`px-3 py-1 rounded text-xs font-bold cursor-pointer transition flex items-center gap-1.5 ${
              activeTab === "DEPTH"
                ? "bg-[#F27D26] text-black shadow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Depth Curve</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("SLIPPAGE")}
            className={`px-3 py-1 rounded text-xs font-bold cursor-pointer transition flex items-center gap-1.5 ${
              activeTab === "SLIPPAGE"
                ? "bg-[#F27D26] text-black shadow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Slippage Sensitivity</span>
          </button>
        </div>
      </div>

      {/* =================================================================
          METRICS SUMMARY CHIPS
         ================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        {/* Total Liquidity Depth */}
        <div className="p-2.5 rounded-lg bg-[#101323] border border-[#1E243D] space-y-0.5">
          <span className="text-[10px] text-gray-400 uppercase block">Total Depth Capacity</span>
          <div className="text-sm font-bold text-emerald-400 truncate">
            ${Math.round(totalPoolDepth).toLocaleString()} USD
          </div>
          <span className="text-[10px] text-gray-400 block truncate">
            {poolParams.quoteAssetAmountFormatted} {quoteAsset} + {poolParams.baseTokenAmountFormatted} {activeToken.symbol}
          </span>
        </div>

        {/* Active Tick Bounds */}
        <div className="p-2.5 rounded-lg bg-[#101323] border border-[#1E243D] space-y-0.5">
          <span className="text-[10px] text-gray-400 uppercase block">Active In-Range Tick Bounds</span>
          <div className="text-sm font-bold text-white truncate">
            ${lowerBound.toFixed(4)} → ${upperBound.toFixed(4)}
          </div>
          <span className="text-[10px] text-cyan-400 block truncate">
            Ticks [{poolParams.tickLower}, {poolParams.tickUpper}]
          </span>
        </div>

        {/* Max Safe Single Trade */}
        <div className="p-2.5 rounded-lg bg-[#101323] border border-[#1E243D] space-y-0.5">
          <span className="text-[10px] text-gray-400 uppercase block">Max Safe Trade (≤{slippagePercent}%)</span>
          <div className="text-sm font-bold text-cyan-400 truncate">
            ${maxSafeTradeCollarUsd.toLocaleString()} USD
          </div>
          <span className="text-[10px] text-emerald-400 block truncate">
            Within strict slippage collar
          </span>
        </div>

        {/* Capital Multiplier */}
        <div className="p-2.5 rounded-lg bg-[#101323] border border-[#1E243D] space-y-0.5">
          <span className="text-[10px] text-gray-400 uppercase block">Concentrated Efficiency</span>
          <div className="text-sm font-bold text-[#F27D26] truncate">
            {efficiencyMultiplier.toFixed(1)}x Multiplier
          </div>
          <span className="text-[10px] text-gray-400 block truncate">
            vs Uniswap V2 Constant Product
          </span>
        </div>
      </div>

      {/* =================================================================
          TAB 1: CONCENTRATED LIQUIDITY DEPTH BAR CHART VISUALIZER
         ================================================================= */}
      {activeTab === "DEPTH" && (
        <div className="space-y-3">
          {/* Depth Chart SVG Canvas */}
          <div className="relative w-full h-48 sm:h-56 rounded-xl bg-[#070913] border border-[#1C2036] p-3 flex flex-col justify-between overflow-hidden">
            {/* Range Bound Shading Indicator */}
            <div className="absolute inset-0 flex pointer-events-none">
              <div className="w-[18%] bg-rose-950/10 border-r border-dashed border-rose-500/20" />
              <div className="w-[64%] bg-gradient-to-b from-cyan-950/15 via-emerald-950/10 to-transparent border-x border-cyan-500/30" />
              <div className="w-[18%] bg-rose-950/10 border-l border-dashed border-rose-500/20" />
            </div>

            {/* Top Overlay Legend */}
            <div className="relative z-10 flex items-center justify-between text-[10px] text-gray-400">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Bid Depth ({quoteAsset})</span>
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span>Ask Depth ({activeToken.symbol})</span>
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#F27D26]" />
                  <span>Mid Price (${midPrice.toFixed(4)})</span>
                </span>
              </div>
              <span className="text-cyan-400 font-bold hidden sm:inline">
                Shaded Area = Active In-Range Concentrated Depth
              </span>
            </div>

            {/* SVG Bars for 31 Depth Bins */}
            <div className="relative z-10 flex items-end justify-between h-32 gap-0.5 sm:gap-1 px-1">
              {depthBins.map((bin, idx) => {
                const isMid = bin.type === "mid";
                const isBid = bin.type === "bid";
                const barHeightPercent = Math.max(10, Math.round(bin.density * 100));

                let barColor = isMid
                  ? "bg-[#F27D26]"
                  : isBid
                  ? bin.inRange
                    ? "bg-emerald-500/75 hover:bg-emerald-400"
                    : "bg-emerald-950/50"
                  : bin.inRange
                  ? "bg-cyan-500/75 hover:bg-cyan-400"
                  : "bg-cyan-950/50";

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredBin(bin)}
                    onMouseLeave={() => setHoveredBin(null)}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                  >
                    <div
                      style={{ height: `${barHeightPercent}%` }}
                      className={`w-full rounded-t transition-all duration-150 ${barColor} ${
                        isMid ? "ring-2 ring-amber-400/80" : ""
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {/* Price Axis Labels */}
            <div className="relative z-10 flex items-center justify-between text-[10px] text-gray-500 border-t border-[#1C2036] pt-1">
              <span>${depthBins[0]?.price.toFixed(4)} (-{Math.abs(Math.round(depthBins[0]?.diffPercent || 0))}%)</span>
              <span className="text-emerald-400 font-bold">Lower Tick: ${lowerBound.toFixed(4)}</span>
              <span className="text-[#F27D26] font-bold">Initial: ${midPrice.toFixed(4)}</span>
              <span className="text-cyan-400 font-bold">Upper Tick: ${upperBound.toFixed(4)}</span>
              <span>${depthBins[depthBins.length - 1]?.price.toFixed(4)} (+{Math.round(depthBins[depthBins.length - 1]?.diffPercent || 0)}%)</span>
            </div>
          </div>

          {/* Interactive Hover Tooltip Bar */}
          {hoveredBin ? (
            <div className="p-2.5 rounded-lg bg-[#12162A] border border-[#2B3356] flex flex-wrap items-center justify-between text-xs text-gray-300 gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    hoveredBin.type === "mid"
                      ? "bg-[#F27D26]"
                      : hoveredBin.type === "bid"
                      ? "bg-emerald-400"
                      : "bg-cyan-400"
                  }`}
                />
                <span className="text-white font-bold">
                  Price: ${hoveredBin.price.toFixed(4)} ({hoveredBin.diffPercent > 0 ? "+" : ""}
                  {hoveredBin.diffPercent.toFixed(1)}%)
                </span>
                <span className="text-gray-400">
                  · 1 {activeToken.symbol} = {hoveredBin.priceRatio.toFixed(6)} {quoteAsset}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span>
                  Bin Depth: <strong className="text-white">${Math.round(hoveredBin.depthUsd).toLocaleString()} USD</strong>
                </span>
                <span>
                  In-Range:{" "}
                  <strong className={hoveredBin.inRange ? "text-emerald-400" : "text-rose-400"}>
                    {hoveredBin.inRange ? "Active Earning" : "Out of Range"}
                  </strong>
                </span>
              </div>
            </div>
          ) : (
            <div className="p-2 rounded-lg bg-[#0E111F] border border-[#1A1F36] text-[11px] text-gray-400 flex items-center justify-between">
              <span>Hover over any depth bar to inspect localized liquidity, tick ranges, and fee generation status.</span>
              <span className="text-emerald-400 font-semibold">Live Simulated Curve</span>
            </div>
          )}
        </div>
      )}

      {/* =================================================================
          TAB 2: SLIPPAGE SENSITIVITY TABLE & CURVE
         ================================================================= */}
      {activeTab === "SLIPPAGE" && (
        <div className="space-y-3">
          {/* Slippage Matrix Table */}
          <div className="overflow-x-auto rounded-xl border border-[#1C2036] bg-[#080A14]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#101324] text-[10px] text-gray-400 uppercase tracking-wider border-b border-[#1C2036]">
                <tr>
                  <th className="py-2.5 px-3">Trade Volume (USD)</th>
                  <th className="py-2.5 px-3">Price Impact</th>
                  <th className="py-2.5 px-3">Total Slippage (incl. fee)</th>
                  <th className="py-2.5 px-3">Execution VWAP</th>
                  <th className="py-2.5 px-3">Depth Consumed</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#171B2E]">
                {slippageTiers.map((tier, idx) => (
                  <tr key={idx} className="hover:bg-[#121528] transition-colors">
                    <td className="py-2 px-3 font-bold text-white">
                      ${tier.tradeSizeUsd.toLocaleString()} USD
                    </td>
                    <td className="py-2 px-3 text-gray-300">
                      {tier.priceImpactPct.toFixed(3)}%
                    </td>
                    <td className="py-2 px-3 font-bold">
                      <span
                        className={
                          tier.isWithinSlippageCollar
                            ? "text-emerald-400"
                            : "text-amber-400"
                        }
                      >
                        {tier.totalSlippagePct.toFixed(3)}%
                      </span>
                    </td>
                    <td className="py-2 px-3 text-gray-300">
                      ${tier.effectivePriceUsd.toFixed(4)}
                    </td>
                    <td className="py-2 px-3 text-gray-400">
                      {tier.depthConsumedPct.toFixed(2)}%
                    </td>
                    <td className="py-2 px-3 text-right">
                      {tier.status === "SAFE" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                          <CheckCircle2 className="w-3 h-3" /> Safe
                        </span>
                      ) : tier.status === "MODERATE" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/25">
                          <AlertTriangle className="w-3 h-3" /> Exceeds Collar
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/25">
                          <AlertTriangle className="w-3 h-3" /> High Impact
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================
          INTERACTIVE INSTANT TRADE SIZE SIMULATOR
         ================================================================= */}
      <div className="p-3.5 rounded-xl bg-[#0F1222] border border-[#21263F] space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-white font-bold">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Interactive Single-Swap Slippage Tester</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-gray-400">Preset Volume:</span>
            {[5000, 25000, 50000, 100000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setTestTradeAmountUsd(amt)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                  testTradeAmountUsd === amt
                    ? "bg-[#F27D26] text-black"
                    : "bg-[#181D33] text-gray-300 hover:text-white border border-[#272F4F]"
                }`}
              >
                ${(amt / 1000).toFixed(0)}k
              </button>
            ))}
          </div>
        </div>

        {/* Trade Size Slider & Input */}
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="1000"
            max={Math.min(500000, Math.round(totalPoolDepth * 0.4))}
            step="1000"
            value={testTradeAmountUsd}
            onChange={(e) => setTestTradeAmountUsd(parseFloat(e.target.value) || 1000)}
            className="flex-1 accent-[#F27D26] cursor-pointer"
          />
          <div className="w-32 px-2.5 py-1 rounded-lg bg-[#0B0D18] border border-[#252C4B] flex items-center justify-between text-xs text-white">
            <span className="text-gray-500">$</span>
            <input
              type="number"
              min="100"
              value={testTradeAmountUsd}
              onChange={(e) => setTestTradeAmountUsd(parseFloat(e.target.value) || 100)}
              className="bg-transparent border-none text-right focus:outline-none w-full text-white font-bold"
            />
          </div>
        </div>

        {/* Live Simulation Output Pill Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
          <div className="p-2 rounded-lg bg-[#0A0C16] border border-[#1C2036]">
            <span className="text-[10px] text-gray-400 uppercase block">Expected Slippage</span>
            <span
              className={`font-bold ${
                interactiveTradeImpact.isCollarPassed
                  ? "text-emerald-400"
                  : "text-amber-400"
              }`}
            >
              {interactiveTradeImpact.totalSlippagePct.toFixed(3)}%
            </span>
            <span className="text-[9px] text-gray-500 block">
              Collar: ≤{slippagePercent}%
            </span>
          </div>

          <div className="p-2 rounded-lg bg-[#0A0C16] border border-[#1C2036]">
            <span className="text-[10px] text-gray-400 uppercase block">Simulated Output</span>
            <span className="font-bold text-white truncate block">
              {interactiveTradeImpact.tokensReceived.toFixed(2)} {activeToken.symbol}
            </span>
            <span className="text-[9px] text-gray-500 block">
              Tokens for ${testTradeAmountUsd.toLocaleString()}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-[#0A0C16] border border-[#1C2036]">
            <span className="text-[10px] text-gray-400 uppercase block">Post-Trade Price</span>
            <span className="font-bold text-cyan-400">
              ${interactiveTradeImpact.postTradePriceUsd.toFixed(4)}
            </span>
            <span className="text-[9px] text-gray-500 block">
              +{interactiveTradeImpact.priceImpactPct.toFixed(2)}% Impact
            </span>
          </div>

          <div className="p-2 rounded-lg bg-[#0A0C16] border border-[#1C2036]">
            <span className="text-[10px] text-gray-400 uppercase block">Depth Consumed</span>
            <span className="font-bold text-white">
              {interactiveTradeImpact.depthConsumedPct.toFixed(2)}%
            </span>
            <span className="text-[9px] text-gray-500 block">
              of ${Math.round(totalPoolDepth).toLocaleString()} total
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper price map for quotes
const VERIFIED_PRICE_MAP: Record<string, number> = {
  USDC: 1.0,
  USDT: 1.0,
  WETH: 3425.8,
  WBTC: 94850.0,
  SOL: 195.4,
};
