import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { TokenRecord } from "../types";
import {
  TrendingDown,
  AlertTriangle,
  Layers,
  Scale,
  DollarSign,
  Activity,
  Sliders,
  CheckCircle2,
  Info,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

export interface MarketImpactVisualizerProps {
  selectedTokens: TokenRecord[];
  className?: string;
}

export type AmmModelType = "cpmm" | "concentrated" | "stableswap";
export type PoolDepthTier = "auto" | "shallow" | "standard" | "deep" | "sovereign";

interface SimulationDataPoint {
  percentOfOrder: number;
  orderSizeUsd: number;
  orderSizeTokens: number;
  orderSizeUsdFormatted: string;
  poolPrice: number;
  poolPriceFormatted: string;
  execPrice: number;
  execPriceFormatted: string;
  priceImpact: number;
  priceImpactFormatted: string;
  slippageLossUsd: number;
  slippageLossUsdFormatted: string;
  quoteReceivedUsd: number;
}

export const MarketImpactVisualizer: React.FC<MarketImpactVisualizerProps> = ({
  selectedTokens,
  className = "",
}) => {
  // Active selected token to simulate (or "all" for composite portfolio basket)
  const [targetTokenId, setTargetTokenId] = useState<string>("all");

  // Hypothetical sell fraction of available holdings/supply: 1% to 100%
  const [sellPercentage, setSellPercentage] = useState<number>(15);

  // AMM Model
  const [ammModel, setAmmModel] = useState<AmmModelType>("cpmm");

  // Pool Depth Tier
  const [depthTier, setDepthTier] = useState<PoolDepthTier>("auto");

  // Determine active token or aggregated portfolio
  const activeToken = useMemo(() => {
    if (targetTokenId === "all" || selectedTokens.length === 1) {
      return null;
    }
    return selectedTokens.find((t) => t.id === targetTokenId) || null;
  }, [targetTokenId, selectedTokens]);

  // Derive initial price and baseline metrics
  const baseMetrics = useMemo(() => {
    if (activeToken) {
      const price = activeToken.priceUsd && activeToken.priceUsd > 0 ? activeToken.priceUsd : 1.0;
      const rawSupply = parseFloat(activeToken.initialSupply?.replace(/,/g, "") || "1000000");
      const supply = isNaN(rawSupply) || rawSupply <= 0 ? 1000000 : rawSupply;
      const mcap = activeToken.marketCap && activeToken.marketCap > 0 ? activeToken.marketCap : price * supply;
      
      return {
        name: activeToken.name,
        symbol: activeToken.symbol,
        price,
        supply,
        mcap,
        isBasket: false,
        tokenCount: 1,
      };
    }

    // Composite basket of all selected tokens
    let totalValue = 0;
    let totalPrice = 0;
    let totalEstimatedSupply = 0;
    let totalMcap = 0;

    selectedTokens.forEach((t) => {
      const p = t.priceUsd && t.priceUsd > 0 ? t.priceUsd : 1.0;
      const s = parseFloat(t.initialSupply?.replace(/,/g, "") || "1000000");
      const validS = isNaN(s) || s <= 0 ? 1000000 : s;
      const m = t.marketCap && t.marketCap > 0 ? t.marketCap : p * validS;

      totalPrice += p;
      totalEstimatedSupply += validS;
      totalMcap += m;
      totalValue += p * (validS * 0.1); // assume 10% tradable float
    });

    const count = Math.max(1, selectedTokens.length);
    const avgPrice = totalPrice / count;

    return {
      name: `Basket of ${count} Selected Tokens`,
      symbol: `${count} TOKENS`,
      price: avgPrice,
      supply: totalEstimatedSupply,
      mcap: totalMcap,
      isBasket: true,
      tokenCount: count,
    };
  }, [activeToken, selectedTokens]);

  // Calculate modeled pool liquidity depth (TVL)
  const poolTvlUsd = useMemo(() => {
    switch (depthTier) {
      case "shallow":
        return 250_000;
      case "standard":
        return 2_500_000;
      case "deep":
        return 25_000_000;
      case "sovereign":
        return 256_000_000; // 2^8 Million
      case "auto":
      default: {
        // Estimate DEX pool liquidity as ~6% to 10% of market capitalization, clamped to realistic bounds
        const estimatedFromMcap = baseMetrics.mcap * 0.08;
        return Math.max(150_000, Math.min(estimatedFromMcap, 150_000_000));
      }
    }
  }, [depthTier, baseMetrics.mcap]);

  // Order size in USD and token count based on sellPercentage
  // Assume a typical user/whale holding pool represents 2% of total supply or up to 50% of pool size
  const maxSimulatedOrderTokens = useMemo(() => {
    // Model total holding as 5% of total supply
    return baseMetrics.supply * 0.05;
  }, [baseMetrics.supply]);

  const currentOrderTokens = useMemo(() => {
    return maxSimulatedOrderTokens * (sellPercentage / 100);
  }, [maxSimulatedOrderTokens, sellPercentage]);

  const currentOrderUsdInitial = useMemo(() => {
    return currentOrderTokens * baseMetrics.price;
  }, [currentOrderTokens, baseMetrics.price]);

  // Calculate Market Impact Curve Data Points for Recharts
  const { chartData, currentOrderOutcome, safeLimitUsd } = useMemo(() => {
    const P0 = baseMetrics.price;
    const TVL = poolTvlUsd;

    // In a standard AMM (50/50 token and quote), quote reserve Y = TVL / 2
    // Token reserve X = Y / P0 = (TVL / 2) / P0
    const Y0 = TVL / 2;
    const X0 = Y0 / P0;
    const k = X0 * Y0;
    const feeRate = 0.003; // 0.3% standard LP fee

    // Generate 16 simulation intervals along sell size spectrum
    // from 0% up to 2.5x current sell order or pool saturation
    const maxOrderTokens = Math.max(currentOrderTokens * 2.2, X0 * 0.5);
    const steps = 18;
    const points: SimulationDataPoint[] = [];

    let safeLimit: number = currentOrderUsdInitial * 0.5;
    let foundSafeLimit = false;

    for (let i = 0; i <= steps; i++) {
      const fraction = i / steps;
      const dxTokens = maxOrderTokens * fraction;
      const orderUsdBaseline = dxTokens * P0;

      if (dxTokens === 0) {
        points.push({
          percentOfOrder: 0,
          orderSizeUsd: 0,
          orderSizeTokens: 0,
          orderSizeUsdFormatted: "$0",
          poolPrice: Number(P0.toFixed(4)),
          poolPriceFormatted: `$${P0.toFixed(4)}`,
          execPrice: Number(P0.toFixed(4)),
          execPriceFormatted: `$${P0.toFixed(4)}`,
          priceImpact: 0,
          priceImpactFormatted: "0.00%",
          slippageLossUsd: 0,
          slippageLossUsdFormatted: "$0",
          quoteReceivedUsd: 0,
        });
        continue;
      }

      let newSpotPrice = P0;
      let quoteOut = 0;
      let impactPercent = 0;

      if (ammModel === "cpmm") {
        // Standard Uniswap v2 xy = k
        const dxEffective = dxTokens * (1 - feeRate);
        const newX = X0 + dxEffective;
        const newY = k / newX;
        quoteOut = Y0 - newY;

        // Spot price after swap = newY / newX
        newSpotPrice = newY / newX;
        impactPercent = Math.max(0, ((P0 - newSpotPrice) / P0) * 100);
      } else if (ammModel === "concentrated") {
        // Uniswap v3 concentrated liquidity within tick boundary
        // Virtual liquidity depth ~ 3.5x higher for small trades, then accelerates
        const virtFactor = 3.5;
        const virtX0 = X0 * virtFactor;
        const virtY0 = Y0 * virtFactor;
        const virtK = virtX0 * virtY0;

        const dxEffective = dxTokens * (1 - feeRate);
        const newVirtX = virtX0 + dxEffective;
        const newVirtY = virtK / newVirtX;
        quoteOut = Math.min(Y0 * 0.95, virtY0 - newVirtY);

        newSpotPrice = Math.max(P0 * 0.05, newVirtY / newVirtX);
        impactPercent = Math.max(0, ((P0 - newSpotPrice) / P0) * 100);
      } else {
        // StableSwap / Hybrid invariant: very low impact for small fraction, steep slope at threshold
        const ratio = dxTokens / X0;
        impactPercent = Math.min(95, Math.pow(ratio * 1.8, 1.6) * 100);
        newSpotPrice = Math.max(P0 * 0.05, P0 * (1 - impactPercent / 100));
        quoteOut = dxTokens * ((P0 + newSpotPrice) / 2) * (1 - feeRate);
      }

      // Clamp price impact to realistic max 98%
      impactPercent = Math.min(98.5, impactPercent);
      const avgExecPrice = dxTokens > 0 ? quoteOut / dxTokens : P0;
      const slippageLoss = Math.max(0, orderUsdBaseline - quoteOut);

      // Track 5% slippage threshold
      if (!foundSafeLimit && impactPercent >= 5.0) {
        safeLimit = orderUsdBaseline;
        foundSafeLimit = true;
      }

      const formattedOrderUsd =
        orderUsdBaseline >= 1e6
          ? `$${(orderUsdBaseline / 1e6).toFixed(2)}M`
          : orderUsdBaseline >= 1e3
          ? `$${(orderUsdBaseline / 1e3).toFixed(1)}K`
          : `$${orderUsdBaseline.toFixed(0)}`;

      points.push({
        percentOfOrder: Number(((dxTokens / (currentOrderTokens || 1)) * 100).toFixed(0)),
        orderSizeUsd: Math.round(orderUsdBaseline),
        orderSizeTokens: Math.round(dxTokens),
        orderSizeUsdFormatted: formattedOrderUsd,
        poolPrice: Number(newSpotPrice.toFixed(4)),
        poolPriceFormatted: `$${newSpotPrice.toFixed(4)}`,
        execPrice: Number(avgExecPrice.toFixed(4)),
        execPriceFormatted: `$${avgExecPrice.toFixed(4)}`,
        priceImpact: Number(impactPercent.toFixed(2)),
        priceImpactFormatted: `${impactPercent.toFixed(2)}%`,
        slippageLossUsd: Math.round(slippageLoss),
        slippageLossUsdFormatted: `$${Math.round(slippageLoss).toLocaleString()}`,
        quoteReceivedUsd: Math.round(quoteOut),
      });
    }

    // Exact evaluation for the currently selected sell order size
    const currentDx = currentOrderTokens;
    let currentNewPrice = P0;
    let currentQuoteOut = 0;
    let currentImpact = 0;

    if (currentDx > 0) {
      if (ammModel === "cpmm") {
        const dxEff = currentDx * (1 - feeRate);
        const nX = X0 + dxEff;
        const nY = k / nX;
        currentQuoteOut = Y0 - nY;
        currentNewPrice = nY / nX;
        currentImpact = Math.max(0, ((P0 - currentNewPrice) / P0) * 100);
      } else if (ammModel === "concentrated") {
        const virtFactor = 3.5;
        const vX0 = X0 * virtFactor;
        const vY0 = Y0 * virtFactor;
        const vK = vX0 * vY0;
        const dxEff = currentDx * (1 - feeRate);
        const nVX = vX0 + dxEff;
        const nVY = vK / nVX;
        currentQuoteOut = Math.min(Y0 * 0.95, vY0 - nVY);
        currentNewPrice = Math.max(P0 * 0.05, nVY / nVX);
        currentImpact = Math.max(0, ((P0 - currentNewPrice) / P0) * 100);
      } else {
        const r = currentDx / X0;
        currentImpact = Math.min(95, Math.pow(r * 1.8, 1.6) * 100);
        currentNewPrice = Math.max(P0 * 0.05, P0 * (1 - currentImpact / 100));
        currentQuoteOut = currentDx * ((P0 + currentNewPrice) / 2) * (1 - feeRate);
      }
    }

    currentImpact = Math.min(98.5, currentImpact);
    const currentExecPrice = currentDx > 0 ? currentQuoteOut / currentDx : P0;
    const currentSlippageLoss = Math.max(0, currentOrderUsdInitial - currentQuoteOut);

    return {
      chartData: points,
      currentOrderOutcome: {
        orderUsd: currentOrderUsdInitial,
        orderTokens: currentOrderTokens,
        initialSpotPrice: P0,
        finalSpotPrice: currentNewPrice,
        execPrice: currentExecPrice,
        priceImpactPercent: currentImpact,
        slippageLossUsd: currentSlippageLoss,
        quoteReceivedUsd: currentQuoteOut,
      },
      safeLimitUsd: foundSafeLimit ? safeLimit : currentOrderUsdInitial * 1.5,
    };
  }, [baseMetrics, poolTvlUsd, currentOrderTokens, currentOrderUsdInitial, ammModel]);

  // Determine Impact Severity Level
  const impactSeverity = useMemo(() => {
    const impact = currentOrderOutcome.priceImpactPercent;
    if (impact < 1.5) {
      return {
        level: "Minimal",
        color: "text-emerald-400",
        badgeBg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
        desc: "Optimal liquidity conditions. Minimal slippage expected.",
      };
    }
    if (impact < 5.0) {
      return {
        level: "Moderate",
        color: "text-amber-400",
        badgeBg: "bg-amber-500/10 border-amber-500/30 text-amber-300",
        desc: "Noticeable slippage. Safe for routine rebalancing.",
      };
    }
    if (impact < 15.0) {
      return {
        level: "High",
        color: "text-orange-400",
        badgeBg: "bg-orange-500/10 border-orange-500/30 text-orange-300",
        desc: "Significant price degradation. Consider splitting order into tranches.",
      };
    }
    return {
      level: "Severe",
      color: "text-rose-400",
      badgeBg: "bg-rose-500/10 border-rose-500/30 text-rose-300",
      desc: "Critical liquidity drain! Pool price collapses substantially.",
    };
  }, [currentOrderOutcome.priceImpactPercent]);

  return (
    <div
      id="market-impact-visualizer-container"
      className={`bg-[#0F1117] border border-[#1F2432] rounded-xl p-4 shadow-xl space-y-4 ${className}`}
    >
      {/* Header & Controls Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#1E2330]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-[#F27D26]">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5 font-mono">
                <span>Liquidity Pool Market Impact</span>
                <span className="text-xs text-[#8E9299] font-normal">• Recharts AMM Curve</span>
              </h4>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${impactSeverity.badgeBg}`}>
                {impactSeverity.level} Impact ({currentOrderOutcome.priceImpactPercent.toFixed(2)}%)
              </span>
            </div>
            <p className="text-[11px] text-[#8E9299]">
              Simulates automated market maker price slippage and pool depletion for hypothetical sell orders.
            </p>
          </div>
        </div>

        {/* Quick Config Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Target Token Selector (if multiple tokens selected) */}
          {selectedTokens.length > 1 && (
            <div className="flex items-center gap-1.5 bg-[#161822] px-2.5 py-1 rounded-lg border border-[#232838]">
              <span className="text-[10px] font-mono text-[#8E9299] uppercase">Asset:</span>
              <select
                id="select-market-impact-target-token"
                aria-label="Select target asset for market impact simulation"
                value={targetTokenId}
                onChange={(e) => setTargetTokenId(e.target.value)}
                className="bg-transparent text-xs font-mono font-semibold text-white focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#161822] text-white">
                  Composite Basket ({selectedTokens.length} Tokens)
                </option>
                {selectedTokens.map((t) => (
                  <option key={t.id} value={t.id} className="bg-[#161822] text-white">
                    {t.symbol} (${(t.priceUsd || 1).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* AMM Invariant Selector */}
          <div className="flex items-center gap-1.5 bg-[#161822] px-2.5 py-1 rounded-lg border border-[#232838]">
            <span className="text-[10px] font-mono text-[#8E9299] uppercase">AMM:</span>
            <select
              id="select-market-impact-amm-model"
              aria-label="Select automated market maker curve model"
              value={ammModel}
              onChange={(e) => setAmmModel(e.target.value as AmmModelType)}
              className="bg-transparent text-xs font-mono font-semibold text-cyan-300 focus:outline-none cursor-pointer"
            >
              <option value="cpmm" className="bg-[#161822] text-white">Uniswap v2 (CPMM xy=k)</option>
              <option value="concentrated" className="bg-[#161822] text-white">Uniswap v3 (Concentrated)</option>
              <option value="stableswap" className="bg-[#161822] text-white">Curve (StableSwap)</option>
            </select>
          </div>

          {/* Pool Liquidity Depth Selector */}
          <div className="flex items-center gap-1.5 bg-[#161822] px-2.5 py-1 rounded-lg border border-[#232838]">
            <span className="text-[10px] font-mono text-[#8E9299] uppercase">Pool Depth:</span>
            <select
              id="select-market-impact-depth-tier"
              aria-label="Select liquidity pool depth tier"
              value={depthTier}
              onChange={(e) => setDepthTier(e.target.value as PoolDepthTier)}
              className="bg-transparent text-xs font-mono font-semibold text-amber-300 focus:outline-none cursor-pointer"
            >
              <option value="auto" className="bg-[#161822] text-white">Auto (Market Cap %)</option>
              <option value="shallow" className="bg-[#161822] text-white">Shallow ($250K TVL)</option>
              <option value="standard" className="bg-[#161822] text-white">Standard ($2.5M TVL)</option>
              <option value="deep" className="bg-[#161822] text-white">Deep ($25M TVL)</option>
              <option value="sovereign" className="bg-[#161822] text-white">Sovereign 2⁸ ($256M)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Hypothetical Order Size Slider & Preset Chips */}
      <div className="p-3 rounded-lg bg-[#141721] border border-[#1E2330] space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-[#8E9299] flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Hypothetical Sell Order Size:
            </span>
            <span className="text-white font-bold bg-[#1C202C] px-2 py-0.5 rounded border border-[#2B3245]">
              {sellPercentage}% of Position
            </span>
            <span className="text-cyan-400 font-semibold">
              ≈ {currentOrderOutcome.orderTokens.toLocaleString(undefined, { maximumFractionDigits: 0 })} {baseMetrics.symbol}
            </span>
            <span className="text-[#8E9299]">
              (${Math.round(currentOrderOutcome.orderUsd).toLocaleString()})
            </span>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1">
            {[1, 5, 10, 25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                id={`btn-impact-preset-${pct}`}
                onClick={() => setSellPercentage(pct)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                  sellPercentage === pct
                    ? "bg-[#F27D26] text-black font-bold shadow-sm"
                    : "bg-[#1B1E2B] hover:bg-[#252A3D] text-[#A2A7B5] border border-[#272D3D]"
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Range Input */}
        <input
          id="range-hypothetical-sell-order"
          type="range"
          min="1"
          max="100"
          step="1"
          value={sellPercentage}
          onChange={(e) => setSellPercentage(Number(e.target.value))}
          className="w-full h-1.5 bg-[#232838] rounded-lg appearance-none cursor-pointer accent-[#F27D26]"
          aria-label="Hypothetical sell order percentage"
        />
      </div>

      {/* Recharts Graphical Visualization */}
      <div className="p-3 rounded-lg bg-[#0A0C10] border border-[#1A1D27] space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-[#8E9299]">
          <span className="flex items-center gap-1.5 text-white font-semibold">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            Spot Price ($) vs. Price Impact (%) Across Sell Volume
          </span>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
              <span className="text-[#A2A7B5]">Pool Spot Price ($)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              <span className="text-[#A2A7B5]">Price Impact (%)</span>
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2.5 h-0.5 bg-amber-400 inline-block" />
              <span>5% Safe Threshold</span>
            </span>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="w-full h-[270px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 12, right: 16, left: 4, bottom: 4 }}
            >
              <defs>
                <linearGradient id="impactGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.45} />
                  <stop offset="50%" stopColor="#F59E0B" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#1C212E" vertical={false} />

              {/* X-Axis: Sell Order Size */}
              <XAxis
                dataKey="orderSizeUsdFormatted"
                stroke="#5A6173"
                tick={{ fill: "#8E9299", fontSize: 10, fontFamily: "monospace" }}
                tickLine={{ stroke: "#2C3345" }}
                axisLine={{ stroke: "#2C3345" }}
              />

              {/* Left Y-Axis: Pool Price ($) */}
              <YAxis
                yAxisId="price"
                orientation="left"
                stroke="#06B6D4"
                tick={{ fill: "#06B6D4", fontSize: 10, fontFamily: "monospace" }}
                tickFormatter={(v) => `$${Number(v).toFixed(2)}`}
                domain={["auto", "auto"]}
                axisLine={{ stroke: "#2C3345" }}
                tickLine={{ stroke: "#2C3345" }}
              />

              {/* Right Y-Axis: Price Impact (%) */}
              <YAxis
                yAxisId="impact"
                orientation="right"
                stroke="#F43F5E"
                tick={{ fill: "#F43F5E", fontSize: 10, fontFamily: "monospace" }}
                tickFormatter={(v) => `${v}%`}
                domain={[0, (dataMax: number) => Math.max(20, Math.ceil(dataMax / 10) * 10)]}
                axisLine={{ stroke: "#2C3345" }}
                tickLine={{ stroke: "#2C3345" }}
              />

              {/* Tooltip */}
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload as SimulationDataPoint;
                    return (
                      <div className="bg-[#12151F] border border-[#2A3144] p-3 rounded-lg shadow-2xl text-xs font-mono space-y-1.5 min-w-[220px]">
                        <div className="text-white font-bold pb-1 border-b border-[#232A3B] flex items-center justify-between">
                          <span>Sell Volume:</span>
                          <span className="text-cyan-300">{d.orderSizeUsdFormatted}</span>
                        </div>
                        <div className="flex items-center justify-between text-[#8E9299]">
                          <span>Tokens Sold:</span>
                          <span className="text-white font-medium">{d.orderSizeTokens.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-[#8E9299]">
                          <span>Post-Swap Pool Price:</span>
                          <span className="text-cyan-400 font-bold">{d.poolPriceFormatted}</span>
                        </div>
                        <div className="flex items-center justify-between text-[#8E9299]">
                          <span>Avg Execution Price:</span>
                          <span className="text-emerald-400 font-bold">{d.execPriceFormatted}</span>
                        </div>
                        <div className="flex items-center justify-between text-[#8E9299]">
                          <span>Price Impact:</span>
                          <span
                            className={`font-bold ${
                              d.priceImpact < 2
                                ? "text-emerald-400"
                                : d.priceImpact < 5
                                ? "text-amber-400"
                                : "text-rose-400"
                            }`}
                          >
                            {d.priceImpactFormatted}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[#8E9299] pt-1 border-t border-[#232A3B]">
                          <span>Est. Slippage Cost:</span>
                          <span className="text-rose-300">{d.slippageLossUsdFormatted}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* 5% Critical Slippage Reference Line */}
              <ReferenceLine
                yAxisId="impact"
                y={5.0}
                stroke="#F59E0B"
                strokeDasharray="4 4"
                label={{
                  value: "5% High Impact Threshold",
                  fill: "#F59E0B",
                  fontSize: 10,
                  fontFamily: "monospace",
                  position: "top",
                }}
              />

              {/* Price Impact Area (Right Axis) */}
              <Area
                yAxisId="impact"
                type="monotone"
                dataKey="priceImpact"
                stroke="#F43F5E"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#impactGradient)"
                name="Price Impact %"
              />

              {/* Pool Price Line (Left Axis) */}
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="poolPrice"
                stroke="#06B6D4"
                strokeWidth={2.5}
                dot={false}
                name="Pool Spot Price ($)"
              />

              {/* Average Realized Execution Price Line */}
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="execPrice"
                stroke="#10B981"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
                name="Avg Realized Price ($)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Outcome Stat Cards (4 Key Metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs font-mono">
        {/* Metric 1: Initial vs Realized Price */}
        <div className="bg-[#141722] p-2.5 rounded-lg border border-[#202535] space-y-1">
          <div className="text-[10px] text-[#8E9299] uppercase tracking-wider flex items-center justify-between">
            <span>Execution Price</span>
            <Scale className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-emerald-400">
            ${currentOrderOutcome.execPrice.toFixed(4)}
          </div>
          <div className="text-[10px] text-[#8E9299] flex items-center gap-1">
            <span>Spot: ${currentOrderOutcome.initialSpotPrice.toFixed(4)}</span>
            <ArrowRight className="w-2.5 h-2.5" />
            <span>${currentOrderOutcome.finalSpotPrice.toFixed(4)}</span>
          </div>
        </div>

        {/* Metric 2: Price Impact & Slippage */}
        <div className="bg-[#141722] p-2.5 rounded-lg border border-[#202535] space-y-1">
          <div className="text-[10px] text-[#8E9299] uppercase tracking-wider flex items-center justify-between">
            <span>Total Price Impact</span>
            <TrendingDown className={`w-3.5 h-3.5 ${impactSeverity.color}`} />
          </div>
          <div className={`text-sm font-bold ${impactSeverity.color}`}>
            {currentOrderOutcome.priceImpactPercent.toFixed(2)}%
          </div>
          <div className="text-[10px] text-[#8E9299] truncate">
            {impactSeverity.desc}
          </div>
        </div>

        {/* Metric 3: Value Lost to Slippage */}
        <div className="bg-[#141722] p-2.5 rounded-lg border border-[#202535] space-y-1">
          <div className="text-[10px] text-[#8E9299] uppercase tracking-wider flex items-center justify-between">
            <span>Slippage Value Loss</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-sm font-bold text-rose-400">
            ${Math.round(currentOrderOutcome.slippageLossUsd).toLocaleString()}
          </div>
          <div className="text-[10px] text-[#8E9299]">
            Quote Out: ${Math.round(currentOrderOutcome.quoteReceivedUsd).toLocaleString()}
          </div>
        </div>

        {/* Metric 4: Safe Order Recommendation */}
        <div className="bg-[#141722] p-2.5 rounded-lg border border-[#202535] space-y-1">
          <div className="text-[10px] text-[#8E9299] uppercase tracking-wider flex items-center justify-between">
            <span>Safe Ceiling (&lt;5%)</span>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-sm font-bold text-amber-300">
            {safeLimitUsd >= 1e6
              ? `$${(safeLimitUsd / 1e6).toFixed(2)}M`
              : safeLimitUsd >= 1e3
              ? `$${(safeLimitUsd / 1e3).toFixed(1)}K`
              : `$${safeLimitUsd.toFixed(0)}`}
          </div>
          <div className="text-[10px] text-[#8E9299]">
            Pool TVL: ${(poolTvlUsd / 1e6).toFixed(1)}M
          </div>
        </div>
      </div>
    </div>
  );
};
