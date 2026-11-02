import React, { useState, useMemo, useCallback } from "react";
import {
  Scale,
  TrendingUp,
  TrendingDown,
  ArrowDownUp,
  Zap,
  Sliders,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Activity,
  Flame,
  Info,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  BarChart2,
  RefreshCw
} from "lucide-react";
import { PortfolioTokenHolding } from "../utils/walletPortfolioService";
import { TokenRecord } from "../types";
import { OrderBookLevel } from "./DepthOfMarketVisualizer";

export interface SlippageSensitivitySimulatorProps {
  holding: PortfolioTokenHolding;
  token?: TokenRecord;
  currentPrice: number;
  currentMarketCap?: number;
  bids?: OrderBookLevel[];
  asks?: OrderBookLevel[];
  midPrice?: number;
  totalBookDepthUsd?: number;
  onOpenGlobalSwapSell?: (token: any, initialMode?: "swap" | "send" | "sell") => void;
  className?: string;
}

export interface VolumeImpactTier {
  volumeUsd: number;
  buySlippagePct: number;
  sellSlippagePct: number;
  buyVwap: number;
  sellVwap: number;
  buyDollarDrag: number;
  sellDollarDrag: number;
  buyDepthConsumedPct: number;
  sellDepthConsumedPct: number;
  isCollarBreached: boolean;
  impactLevel: "MINIMAL" | "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  tierLabel: string;
}

export const SlippageSensitivitySimulator: React.FC<SlippageSensitivitySimulatorProps> = ({
  holding,
  token,
  currentPrice,
  currentMarketCap,
  bids = [],
  asks = [],
  midPrice: propMidPrice,
  totalBookDepthUsd: propTotalDepth,
  onOpenGlobalSwapSell,
  className = "",
}) => {
  const sym = holding.symbol || "TOKEN";
  const mid = propMidPrice && propMidPrice > 0 ? propMidPrice : currentPrice > 0 ? currentPrice : 50;

  // Simulator Controls State
  const [tradeVolumeUsd, setTradeVolumeUsd] = useState<number>(25000);
  const [activeSide, setActiveSide] = useState<"BUY" | "SELL" | "DUAL">("DUAL");
  const [liquidityStressMultiplier, setLiquidityStressMultiplier] = useState<number>(1.0); // 0.5x, 1.0x, 2.0x
  const [hoveredTier, setHoveredTier] = useState<VolumeImpactTier | null>(null);

  // Fallback synthetic order book if bids/asks are empty
  const activeBids = useMemo(() => {
    if (bids.length > 0) return bids;
    // Generate 12 synthetic bid levels
    const levels: OrderBookLevel[] = [];
    let cumulative = 0;
    for (let i = 1; i <= 15; i++) {
      const diff = i * 0.25;
      const price = mid * (1 - diff / 100);
      const sizeUsd = Math.round((25000 + i * 18000) * liquidityStressMultiplier);
      const sizeTokens = sizeUsd / price;
      cumulative += sizeUsd;
      levels.push({
        id: `bid-${i}`,
        type: "bid",
        price,
        diffPercent: -diff,
        sizeTokens,
        sizeUsd,
        cumulativeTokens: cumulative / price,
        cumulativeUsd: cumulative,
        depthRatio: Math.min(1, cumulative / 500000),
        isWall: i === 4 || i === 8,
      });
    }
    return levels;
  }, [bids, mid, liquidityStressMultiplier]);

  const activeAsks = useMemo(() => {
    if (asks.length > 0) return asks;
    // Generate 12 synthetic ask levels
    const levels: OrderBookLevel[] = [];
    let cumulative = 0;
    for (let i = 1; i <= 15; i++) {
      const diff = i * 0.25;
      const price = mid * (1 + diff / 100);
      const sizeUsd = Math.round((25000 + i * 18000) * liquidityStressMultiplier);
      const sizeTokens = sizeUsd / price;
      cumulative += sizeUsd;
      levels.push({
        id: `ask-${i}`,
        type: "ask",
        price,
        diffPercent: diff,
        sizeTokens,
        sizeUsd,
        cumulativeTokens: cumulative / price,
        cumulativeUsd: cumulative,
        depthRatio: Math.min(1, cumulative / 500000),
        isWall: i === 4 || i === 8,
      });
    }
    return levels;
  }, [asks, mid, liquidityStressMultiplier]);

  const totalBidDepth = useMemo(() => {
    return activeBids.reduce((acc, b) => acc + b.sizeUsd * liquidityStressMultiplier, 0);
  }, [activeBids, liquidityStressMultiplier]);

  const totalAskDepth = useMemo(() => {
    return activeAsks.reduce((acc, a) => acc + a.sizeUsd * liquidityStressMultiplier, 0);
  }, [activeAsks, liquidityStressMultiplier]);

  // Precise order book walking algorithm to compute VWAP, slippage, and depth consumption
  const calculateExactImpact = useCallback(
    (volumeUsd: number, side: "BUY" | "SELL") => {
      const levels = side === "BUY" ? activeAsks : activeBids;
      let remainingUsd = volumeUsd;
      let totalTokensFilled = 0;
      let highestPriceReached = mid;
      let lowestPriceReached = mid;
      let tierReachedIndex = 0;

      for (let i = 0; i < levels.length; i++) {
        const lvl = levels[i];
        const availableUsdAtLvl = lvl.sizeUsd * liquidityStressMultiplier;
        tierReachedIndex = i;

        if (remainingUsd <= availableUsdAtLvl) {
          // Partially fill this level and finish
          const tokensAtThisLvl = remainingUsd / lvl.price;
          totalTokensFilled += tokensAtThisLvl;
          if (side === "BUY") highestPriceReached = lvl.price;
          else lowestPriceReached = lvl.price;
          remainingUsd = 0;
          break;
        } else {
          // Fully absorb this level
          const tokensAtThisLvl = availableUsdAtLvl / lvl.price;
          totalTokensFilled += tokensAtThisLvl;
          if (side === "BUY") highestPriceReached = lvl.price;
          else lowestPriceReached = lvl.price;
          remainingUsd -= availableUsdAtLvl;
        }
      }

      // If volume exceeded all immediate discrete order book levels, extrapolate deep liquidity curve tail
      if (remainingUsd > 0) {
        const lastPrice = side === "BUY" ? highestPriceReached : lowestPriceReached;
        const extraDepthUsd = (side === "BUY" ? totalAskDepth : totalBidDepth) * 1.5;
        const extraFactor = remainingUsd / Math.max(1000, extraDepthUsd);
        const tailSlippage = Math.min(0.20, extraFactor * 0.08); // up to +20% tail max

        const tailPrice =
          side === "BUY"
            ? lastPrice * (1 + tailSlippage)
            : Math.max(0.0001, lastPrice * (1 - tailSlippage));

        const avgTailPrice = (lastPrice + tailPrice) / 2;
        const tailTokens = remainingUsd / avgTailPrice;
        totalTokensFilled += tailTokens;
        if (side === "BUY") highestPriceReached = tailPrice;
        else lowestPriceReached = tailPrice;
        tierReachedIndex = levels.length;
      }

      const vwap = totalTokensFilled > 0 ? volumeUsd / totalTokensFilled : mid;
      const slippagePct =
        side === "BUY"
          ? ((vwap - mid) / mid) * 100
          : ((mid - vwap) / mid) * 100;

      const clampedSlippagePct = Number(Math.max(0.001, Math.min(25.0, slippagePct)).toFixed(3));
      const dollarDrag = Number(((volumeUsd * clampedSlippagePct) / 100).toFixed(2));
      const totalDepthSide = side === "BUY" ? totalAskDepth : totalBidDepth;
      const depthConsumedPct = Number(
        Math.min(100, (volumeUsd / Math.max(1, totalDepthSide)) * 100).toFixed(1)
      );

      return {
        vwap: Number(vwap.toFixed(mid < 1 ? 4 : 2)),
        slippagePct: clampedSlippagePct,
        dollarDrag,
        depthConsumedPct,
        marginalPrice: side === "BUY" ? highestPriceReached : lowestPriceReached,
        tierIndex: tierReachedIndex,
        isCollarBreached: clampedSlippagePct > 5.0, // SEC Rule 15c3-5 ±5% threshold
      };
    },
    [activeBids, activeAsks, mid, liquidityStressMultiplier, totalBidDepth, totalAskDepth]
  );

  // Active Trade Volume Calculation
  const activeImpact = useMemo(() => {
    const buy = calculateExactImpact(tradeVolumeUsd, "BUY");
    const sell = calculateExactImpact(tradeVolumeUsd, "SELL");

    return {
      volumeUsd: tradeVolumeUsd,
      buy,
      sell,
      isHeavy: buy.slippagePct > 1.0 || sell.slippagePct > 1.0,
      isCollarBreached: buy.isCollarBreached || sell.isCollarBreached,
    };
  }, [tradeVolumeUsd, calculateExactImpact]);

  // Sensitivity Matrix across standard volume tiers
  const sensitivityMatrix = useMemo<VolumeImpactTier[]>(() => {
    const testVolumes = [5000, 25000, 50000, 100000, 250000, 500000, 1000000];

    return testVolumes.map((vol) => {
      const buy = calculateExactImpact(vol, "BUY");
      const sell = calculateExactImpact(vol, "SELL");
      const maxSlip = Math.max(buy.slippagePct, sell.slippagePct);

      let impactLevel: VolumeImpactTier["impactLevel"] = "MINIMAL";
      if (maxSlip > 5.0) impactLevel = "CRITICAL";
      else if (maxSlip > 2.0) impactLevel = "HIGH";
      else if (maxSlip > 0.8) impactLevel = "MODERATE";
      else if (maxSlip > 0.25) impactLevel = "LOW";

      const tierLabel =
        vol >= 1000000
          ? `$${(vol / 1000000).toFixed(1)}M Mega-Block`
          : `$${(vol / 1000).toFixed(0)}k Order`;

      return {
        volumeUsd: vol,
        buySlippagePct: buy.slippagePct,
        sellSlippagePct: sell.slippagePct,
        buyVwap: buy.vwap,
        sellVwap: sell.vwap,
        buyDollarDrag: buy.dollarDrag,
        sellDollarDrag: sell.dollarDrag,
        buyDepthConsumedPct: buy.depthConsumedPct,
        sellDepthConsumedPct: sell.depthConsumedPct,
        isCollarBreached: buy.isCollarBreached || sell.isCollarBreached,
        impactLevel,
        tierLabel,
      };
    });
  }, [calculateExactImpact]);

  // Sensitivity Curve SVG Points calculation
  const curvePoints = useMemo(() => {
    const svgWidth = 600;
    const svgHeight = 140;
    const padding = { top: 15, right: 25, bottom: 25, left: 45 };

    const maxVol = 1000000;
    const maxSlip = 6.0; // scale up to 6%

    const chartW = svgWidth - padding.left - padding.right;
    const chartH = svgHeight - padding.top - padding.bottom;

    const buyPts: [number, number][] = [];
    const sellPts: [number, number][] = [];

    const steps = 30;
    for (let i = 0; i <= steps; i++) {
      const vol = (i / steps) * maxVol;
      const buy = calculateExactImpact(Math.max(100, vol), "BUY");
      const sell = calculateExactImpact(Math.max(100, vol), "SELL");

      const x = padding.left + (vol / maxVol) * chartW;
      const yBuy = padding.top + chartH - Math.min(1, buy.slippagePct / maxSlip) * chartH;
      const ySell = padding.top + chartH - Math.min(1, sell.slippagePct / maxSlip) * chartH;

      buyPts.push([x, yBuy]);
      sellPts.push([x, ySell]);
    }

    const buyPath = buyPts.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
    const sellPath = sellPts.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");

    // Current scrub position
    const currentClampedVol = Math.min(maxVol, tradeVolumeUsd);
    const scrubX = padding.left + (currentClampedVol / maxVol) * chartW;
    const scrubYBuy = padding.top + chartH - Math.min(1, activeImpact.buy.slippagePct / maxSlip) * chartH;
    const scrubYSell = padding.top + chartH - Math.min(1, activeImpact.sell.slippagePct / maxSlip) * chartH;

    // Collar boundary line Y (at 5.0%)
    const collarY = padding.top + chartH - (5.0 / maxSlip) * chartH;

    return {
      svgWidth,
      svgHeight,
      padding,
      chartW,
      chartH,
      buyPath,
      sellPath,
      scrubX,
      scrubYBuy,
      scrubYSell,
      collarY,
    };
  }, [calculateExactImpact, tradeVolumeUsd, activeImpact]);

  return (
    <div className={`space-y-4 rounded-2xl bg-[#0a0d14]/95 border border-cyan-500/30 p-4 sm:p-5 shadow-2xl font-sans ${className}`}>
      {/* HEADER BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#1f2433] pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-cyan-400" />
              Slippage Sensitivity Simulator
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3 text-purple-400" />
              Order Book Depth Engine
            </span>
            <span className="text-[11px] font-mono text-[#8E9299]">
              Mid Price: <strong className="text-white">${mid.toFixed(mid < 1 ? 4 : 2)}</strong>
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white mt-1 flex items-center gap-2">
            Dynamic Trade Volume vs. Projected Price Impact
          </h3>
          <p className="text-xs text-[#8E9299]">
            Calculates the non-linear execution slippage and VWAP drag as simulated trade volumes consume resting order book liquidity walls.
          </p>
        </div>

        {/* Liquidity Condition Stress Knobs */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <div className="flex items-center bg-[#141722] p-1 rounded-xl border border-[#242a3d] text-xs font-mono">
            <span className="text-[10px] text-[#8E9299] px-2">Book Depth:</span>
            {[
              { mult: 0.5, label: "0.5x Thin" },
              { mult: 1.0, label: "1.0x Normal" },
              { mult: 2.0, label: "2.0x Deep" },
            ].map((st) => (
              <button
                key={st.mult}
                type="button"
                onClick={() => setLiquidityStressMultiplier(st.mult)}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer font-semibold ${
                  liquidityStressMultiplier === st.mult
                    ? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/60 shadow-sm"
                    : "text-[#8E9299] hover:text-white"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {onOpenGlobalSwapSell && (
            <button
              type="button"
              onClick={() => onOpenGlobalSwapSell(token || holding, "swap")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-xs transition-all cursor-pointer shadow-md shadow-cyan-500/20"
            >
              <ArrowDownUp className="w-3.5 h-3.5" />
              <span>Direct Swap</span>
            </button>
          )}
        </div>
      </div>

      {/* INTERACTIVE TRADE VOLUME SLIDER & DIRECTION KNOBS */}
      <div className="p-4 rounded-xl bg-[#121520] border border-[#242a3d] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-xs text-white font-mono uppercase tracking-wider">
              Simulated Trade Volume Size
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#8E9299]">Selected Volume:</span>
            <span className="text-base font-bold font-mono text-cyan-300">
              ${tradeVolumeUsd.toLocaleString()} USD
            </span>
          </div>
        </div>

        {/* Continuous Range Slider */}
        <div className="space-y-1">
          <input
            type="range"
            min="1000"
            max="1000000"
            step="1000"
            value={tradeVolumeUsd}
            onChange={(e) => setTradeVolumeUsd(parseInt(e.target.value, 10))}
            className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>$1K Retail</span>
            <span>$50K Standard</span>
            <span>$250K Whale</span>
            <span>$1.0M Institutional Block</span>
          </div>
        </div>

        {/* Quick Size Preset Pills & Direction Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-[#1a1e2c]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-mono text-[#8E9299]">Presets:</span>
            {[5000, 25000, 50000, 100000, 250000, 500000, 1000000].map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setTradeVolumeUsd(sz)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  tradeVolumeUsd === sz
                    ? "bg-cyan-500/25 text-cyan-200 border border-cyan-400 shadow-sm"
                    : "bg-[#0e1017] text-[#8E9299] hover:text-white border border-[#242a3d]"
                }`}
              >
                ${sz >= 1000000 ? `${sz / 1000000}M` : `${sz / 1000}K`}
              </button>
            ))}
          </div>

          {/* Trade Direction Selector */}
          <div className="flex items-center bg-[#0a0d14] p-0.5 rounded-xl border border-[#242a3d] font-mono text-xs">
            <button
              type="button"
              onClick={() => setActiveSide("DUAL")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                activeSide === "DUAL"
                  ? "bg-purple-500/25 text-purple-200 font-bold border border-purple-500/40"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              Dual Comparison
            </button>
            <button
              type="button"
              onClick={() => setActiveSide("BUY")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                activeSide === "BUY"
                  ? "bg-emerald-500/25 text-emerald-300 font-bold border border-emerald-500/40"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              Buy Slippage
            </button>
            <button
              type="button"
              onClick={() => setActiveSide("SELL")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                activeSide === "SELL"
                  ? "bg-rose-500/25 text-rose-300 font-bold border border-rose-500/40"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              Sell Slippage
            </button>
          </div>
        </div>
      </div>

      {/* DUAL DIRECTION IMPACT TELEMETRY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* BUY DIRECTION (Taker Consumes Asks) */}
        {(activeSide === "BUY" || activeSide === "DUAL") && (
          <div className="p-4 rounded-xl bg-[#0e1017] border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono text-emerald-400 flex items-center gap-1.5 uppercase">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Buy Impact (Ask Depth Sweep)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Consumes {activeImpact.buy.depthConsumedPct}% Depth
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-black/50 border border-slate-800 space-y-0.5">
                <span className="text-[10px] text-[#8E9299] block">PROJECTED SLIPPAGE</span>
                <span className={`text-lg font-bold block ${activeImpact.buy.slippagePct > 3 ? "text-rose-400" : activeImpact.buy.slippagePct > 1 ? "text-amber-400" : "text-emerald-400"}`}>
                  +{activeImpact.buy.slippagePct}%
                </span>
                <span className="text-[10px] text-slate-400">
                  Dollar Drag: <strong className="text-white">${activeImpact.buy.dollarDrag.toLocaleString()}</strong>
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-black/50 border border-slate-800 space-y-0.5">
                <span className="text-[10px] text-[#8E9299] block">PROJECTED BUY VWAP</span>
                <span className="text-lg font-bold text-white block">
                  ${activeImpact.buy.vwap.toFixed(mid < 1 ? 4 : 2)}
                </span>
                <span className="text-[10px] text-slate-400">
                  Marginal: <strong className="text-emerald-300">${activeImpact.buy.marginalPrice.toFixed(mid < 1 ? 4 : 2)}</strong>
                </span>
              </div>
            </div>

            <p className="text-[11px] text-[#8E9299] leading-relaxed">
              Order of ${tradeVolumeUsd.toLocaleString()} USD will fill at an estimated VWAP of ${activeImpact.buy.vwap.toFixed(2)}, incurring a +{activeImpact.buy.slippagePct}% premium over mid-market.
            </p>
          </div>
        )}

        {/* SELL DIRECTION (Taker Consumes Bids) */}
        {(activeSide === "SELL" || activeSide === "DUAL") && (
          <div className="p-4 rounded-xl bg-[#0e1017] border border-rose-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono text-rose-400 flex items-center gap-1.5 uppercase">
                <TrendingDown className="w-4 h-4 text-rose-400" />
                Sell Impact (Bid Depth Sweep)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                Consumes {activeImpact.sell.depthConsumedPct}% Depth
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-black/50 border border-slate-800 space-y-0.5">
                <span className="text-[10px] text-[#8E9299] block">PROJECTED SLIPPAGE</span>
                <span className={`text-lg font-bold block ${activeImpact.sell.slippagePct > 3 ? "text-rose-400" : activeImpact.sell.slippagePct > 1 ? "text-amber-400" : "text-emerald-400"}`}>
                  -{activeImpact.sell.slippagePct}%
                </span>
                <span className="text-[10px] text-slate-400">
                  Dollar Drag: <strong className="text-white">${activeImpact.sell.dollarDrag.toLocaleString()}</strong>
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-black/50 border border-slate-800 space-y-0.5">
                <span className="text-[10px] text-[#8E9299] block">PROJECTED SELL VWAP</span>
                <span className="text-lg font-bold text-white block">
                  ${activeImpact.sell.vwap.toFixed(mid < 1 ? 4 : 2)}
                </span>
                <span className="text-[10px] text-slate-400">
                  Marginal: <strong className="text-rose-300">${activeImpact.sell.marginalPrice.toFixed(mid < 1 ? 4 : 2)}</strong>
                </span>
              </div>
            </div>

            <p className="text-[11px] text-[#8E9299] leading-relaxed">
              Selling ${tradeVolumeUsd.toLocaleString()} USD will liquidate at an estimated VWAP of ${activeImpact.sell.vwap.toFixed(2)}, reflecting a -{activeImpact.sell.slippagePct}% discount below mid-market.
            </p>
          </div>
        )}
      </div>

      {/* SEC RULE 15c3-5 COLLAR WARNING BANNER IF EXCEEDED */}
      {activeImpact.isCollarBreached && (
        <div className="p-3.5 rounded-xl bg-rose-950/70 border-2 border-rose-600 flex items-start gap-3 animate-pulse text-xs font-mono">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-rose-200 uppercase tracking-wider block">
              ⚠️ SEC RULE 15c3-5 COMPLIANCE COLLAR ALERT (±5.0% BREACH RISK)
            </span>
            <p className="text-rose-300">
              Projected execution slippage exceeds the mandatory <strong>±5.0% Moving Average price collar threshold</strong>. Submitting a market order of this size would automatically trip the ATS circuit breaker and trigger a venue trading halt!
            </p>
          </div>
        </div>
      )}

      {/* CONTINUOUS SLIPPAGE SENSITIVITY CURVE (SVG VISUALIZER) */}
      <div className="p-4 rounded-xl bg-[#0a0d14] border border-[#1f2433] space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-white uppercase tracking-wider">
              Sensitivity Curve: Trade Volume vs Slippage %
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" /> Buy Curve
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-2.5 h-0.5 bg-rose-400 inline-block" /> Sell Curve
            </span>
            <span className="flex items-center gap-1 text-amber-400 font-bold">
              <span className="w-2.5 h-0.5 border-t border-dashed border-amber-400 inline-block" /> ±5% Collar Halt
            </span>
          </div>
        </div>

        {/* SVG Curve Container */}
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${curvePoints.svgWidth} ${curvePoints.svgHeight}`}
            className="w-full h-36 select-none"
          >
            {/* Grid Lines */}
            {[1, 2, 3, 4, 5].map((slip) => {
              const y = curvePoints.padding.top + curvePoints.chartH - (slip / 6.0) * curvePoints.chartH;
              return (
                <g key={slip}>
                  <line
                    x1={curvePoints.padding.left}
                    y1={y}
                    x2={curvePoints.svgWidth - curvePoints.padding.right}
                    y2={y}
                    stroke="#1a1e2c"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={curvePoints.padding.left - 6}
                    y={y + 3}
                    textAnchor="end"
                    fill="#6e7382"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {slip}%
                  </text>
                </g>
              );
            })}

            {/* SEC Rule 15c3-5 Collar Line (5.0%) */}
            <line
              x1={curvePoints.padding.left}
              y1={curvePoints.collarY}
              x2={curvePoints.svgWidth - curvePoints.padding.right}
              y2={curvePoints.collarY}
              stroke="#F59E0B"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <text
              x={curvePoints.svgWidth - curvePoints.padding.right}
              y={curvePoints.collarY - 4}
              textAnchor="end"
              fill="#F59E0B"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
            >
              5% Collar Limit
            </text>

            {/* Buy Curve Path */}
            <path
              d={curvePoints.buyPath}
              fill="none"
              stroke="#10B981"
              strokeWidth="2.5"
            />

            {/* Sell Curve Path */}
            <path
              d={curvePoints.sellPath}
              fill="none"
              stroke="#F43F5E"
              strokeWidth="2"
              strokeDasharray="5 2"
            />

            {/* Active Scrub Pin Line */}
            <line
              x1={curvePoints.scrubX}
              y1={curvePoints.padding.top}
              x2={curvePoints.scrubX}
              y2={curvePoints.svgHeight - curvePoints.padding.bottom}
              stroke="#38BDF8"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />

            {/* Active Points */}
            <circle
              cx={curvePoints.scrubX}
              cy={curvePoints.scrubYBuy}
              r="4.5"
              fill="#10B981"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
            <circle
              cx={curvePoints.scrubX}
              cy={curvePoints.scrubYSell}
              r="4.5"
              fill="#F43F5E"
              stroke="#ffffff"
              strokeWidth="1.5"
            />

            {/* X-Axis Volume Labels */}
            {[
              { val: 0, label: "$0" },
              { val: 250000, label: "$250K" },
              { val: 500000, label: "$500K" },
              { val: 750000, label: "$750K" },
              { val: 1000000, label: "$1.0M" },
            ].map((pt) => {
              const x = curvePoints.padding.left + (pt.val / 1000000) * curvePoints.chartW;
              return (
                <text
                  key={pt.val}
                  x={x}
                  y={curvePoints.svgHeight - 8}
                  textAnchor="middle"
                  fill="#6e7382"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {pt.label}
                </text>
              );
            })}
          </svg>
        </div>
      </div>

      {/* MULTI-TIER VOLUME SENSITIVITY MATRIX TABLE */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-purple-400" />
            Order Size Sensitivity Matrix
          </span>
          <span className="text-[#8E9299]">Calculated against live order book depth tiers</span>
        </div>

        <div className="rounded-xl border border-[#1f2433] bg-[#0a0d14] overflow-x-auto shadow-inner">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#121520] border-b border-[#242a3d] text-[#8E9299]">
              <tr>
                <th className="py-2.5 px-3">TRADE VOLUME</th>
                <th className="py-2.5 px-3">BUY SLIPPAGE</th>
                <th className="py-2.5 px-3">BUY VWAP</th>
                <th className="py-2.5 px-3">SELL SLIPPAGE</th>
                <th className="py-2.5 px-3">SELL VWAP</th>
                <th className="py-2.5 px-3">AVG DOLLAR DRAG</th>
                <th className="py-2.5 px-3 text-right">IMPACT RATING</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1e2c]">
              {sensitivityMatrix.map((tier) => {
                const isSelected =
                  tradeVolumeUsd >= tier.volumeUsd * 0.75 &&
                  tradeVolumeUsd <= tier.volumeUsd * 1.5;

                return (
                  <tr
                    key={tier.volumeUsd}
                    onClick={() => setTradeVolumeUsd(tier.volumeUsd)}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-cyan-950/40 hover:bg-cyan-900/40"
                        : "hover:bg-[#141724]"
                    }`}
                  >
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="text-white font-bold">${tier.volumeUsd.toLocaleString()}</span>
                      <span className="text-[10px] text-[#8E9299] ml-1.5 font-normal">
                        ({tier.tierLabel})
                      </span>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap text-emerald-400 font-bold tabular-nums">
                      +{tier.buySlippagePct}%
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap text-white tabular-nums">
                      ${tier.buyVwap.toFixed(mid < 1 ? 4 : 2)}
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap text-rose-400 font-bold tabular-nums">
                      -{tier.sellSlippagePct}%
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap text-white tabular-nums">
                      ${tier.sellVwap.toFixed(mid < 1 ? 4 : 2)}
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-300 tabular-nums">
                      ${((tier.buyDollarDrag + tier.sellDollarDrag) / 2).toLocaleString()}
                    </td>

                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tier.impactLevel === "CRITICAL"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse"
                            : tier.impactLevel === "HIGH"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : tier.impactLevel === "MODERATE"
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        }`}
                      >
                        {tier.impactLevel === "CRITICAL"
                          ? "⚠️ Collar Risk"
                          : tier.impactLevel === "HIGH"
                          ? "High Slippage"
                          : tier.impactLevel === "MODERATE"
                          ? "Moderate Sweep"
                          : "Minimal Slippage"}
                      </span>
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
