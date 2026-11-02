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
  Flame,
  Sliders,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Download,
  Terminal,
  Zap,
  Layers,
  ArrowRight,
  ShieldAlert,
  Coins,
  Scale,
  Sparkles,
  Info,
} from "lucide-react";
import { formatCompactCurrency, formatCompactNumber } from "./SelectedTokenomicsDashboard";

export interface BurnMechanismSimulatorProps {
  selectedTokens: TokenRecord[];
  className?: string;
}

export type ValuationModelType = "constant_price" | "scarcity_rerate" | "elastic_demand";

interface BurnTrajectoryPoint {
  burnPercent: number;
  label: string;
  remainingSupply: number;
  remainingSupplyFormatted: string;
  burnedSupply: number;
  constantPriceMcap: number;
  scarcityMcap: number;
  elasticMcap: number;
  impliedPriceConstant: number;
  impliedPriceScarcity: number;
  impliedPriceElastic: number;
}

const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";

export const BurnMechanismSimulator: React.FC<BurnMechanismSimulatorProps> = ({
  selectedTokens,
  className = "",
}) => {
  // Target token scope: "all" for composite basket or individual token id
  const [targetTokenId, setTargetTokenId] = useState<string>("all");

  // Burn percentage: 0.1% to 95%
  const [burnPercent, setBurnPercent] = useState<number>(20);

  // Valuation model
  const [valuationModel, setValuationModel] = useState<ValuationModelType>("constant_price");

  // Demand elasticity factor for elastic model (default 0.75)
  const [elasticityFactor, setElasticityFactor] = useState<number>(0.75);

  // Copy state
  const [copiedReport, setCopiedReport] = useState<boolean>(false);
  const [simulatedExecution, setSimulatedExecution] = useState<boolean>(false);

  // Active single token if targetTokenId !== "all"
  const activeToken = useMemo(() => {
    if (targetTokenId === "all" || selectedTokens.length === 1) {
      return null;
    }
    return selectedTokens.find((t) => t.id === targetTokenId) || null;
  }, [targetTokenId, selectedTokens]);

  // Baseline aggregated metrics
  const baseMetrics = useMemo(() => {
    if (activeToken) {
      const price = activeToken.priceUsd && activeToken.priceUsd > 0 ? activeToken.priceUsd : 1.0;
      const rawSupply = parseFloat(activeToken.initialSupply?.replace(/,/g, "") || "1000000");
      const supply = isNaN(rawSupply) || rawSupply <= 0 ? 1000000 : rawSupply;
      const mcap = activeToken.marketCap && activeToken.marketCap > 0 ? activeToken.marketCap : price * supply;

      return {
        name: activeToken.name,
        symbol: activeToken.symbol,
        contractAddress: activeToken.contractAddress,
        chain: activeToken.chain,
        standard: activeToken.tokenStandard,
        price,
        supply,
        mcap,
        isBasket: false,
        tokenCount: 1,
      };
    }

    // Composite basket of all selected tokens
    let totalSupply = 0;
    let totalMcap = 0;
    let totalPrice = 0;

    selectedTokens.forEach((t) => {
      const rawSupply = parseFloat(t.initialSupply?.replace(/,/g, "") || "0");
      const supply = isNaN(rawSupply) || rawSupply <= 0 ? 1000000 : rawSupply;
      totalSupply += supply;

      const price = t.priceUsd && t.priceUsd > 0 ? t.priceUsd : 1.0;
      totalPrice += price;

      const mcap = t.marketCap && t.marketCap > 0 ? t.marketCap : price * supply;
      totalMcap += mcap;
    });

    const avgPrice = selectedTokens.length > 0 ? totalPrice / selectedTokens.length : 1.0;

    return {
      name: `Composite Portfolio (${selectedTokens.length} Tokens)`,
      symbol: "BASKET",
      contractAddress: DEAD_ADDRESS,
      chain: "Multi-Chain",
      standard: "Multi-Standard",
      price: avgPrice,
      supply: totalSupply,
      mcap: totalMcap,
      isBasket: true,
      tokenCount: selectedTokens.length,
    };
  }, [activeToken, selectedTokens]);

  // Current burn calculation results
  const burnCalculations = useMemo(() => {
    const fraction = Math.min(Math.max(burnPercent, 0.1), 99.9) / 100;
    const initialSupply = baseMetrics.supply;
    const initialMcap = baseMetrics.mcap;
    const initialPrice = baseMetrics.price;

    const burnedSupply = initialSupply * fraction;
    const remainingSupply = initialSupply - burnedSupply;

    // Nominal value of burned tokens at pre-burn spot price
    const burnedTokensUsdValue = burnedSupply * initialPrice;

    // Model 1: Constant Spot Price (Direct nominal supply reduction)
    const constantPriceMcap = remainingSupply * initialPrice;
    const constantPrice = initialPrice;

    // Model 2: Scarcity Re-rating (Invariant Market Cap: P_new = MC_0 / S_new)
    const scarcityMcap = initialMcap;
    const scarcityPrice = remainingSupply > 0 ? initialMcap / remainingSupply : initialPrice;

    // Model 3: Elastic Demand (Price increases with elasticity factor)
    // P_elastic = P_0 * (S_0 / S_new)^elasticity
    const supplyRatio = remainingSupply > 0 ? initialSupply / remainingSupply : 1;
    const elasticPrice = initialPrice * Math.pow(supplyRatio, elasticityFactor);
    const elasticMcap = remainingSupply * elasticPrice;

    // Active updated values based on selected model
    let updatedMcap = constantPriceMcap;
    let updatedPrice = constantPrice;

    if (valuationModel === "scarcity_rerate") {
      updatedMcap = scarcityMcap;
      updatedPrice = scarcityPrice;
    } else if (valuationModel === "elastic_demand") {
      updatedMcap = elasticMcap;
      updatedPrice = elasticPrice;
    }

    const mcapDelta = updatedMcap - initialMcap;
    const mcapDeltaPercent = initialMcap > 0 ? (mcapDelta / initialMcap) * 100 : 0;
    const priceDelta = updatedPrice - initialPrice;
    const priceDeltaPercent = initialPrice > 0 ? (priceDelta / initialPrice) * 100 : 0;

    return {
      fraction,
      burnedSupply,
      remainingSupply,
      burnedTokensUsdValue,
      constantPriceMcap,
      constantPrice,
      scarcityMcap,
      scarcityPrice,
      elasticMcap,
      elasticPrice,
      updatedMcap,
      updatedPrice,
      mcapDelta,
      mcapDeltaPercent,
      priceDelta,
      priceDeltaPercent,
    };
  }, [baseMetrics, burnPercent, valuationModel, elasticityFactor]);

  // Chart trajectory across 0% to 90% burn range
  const chartTrajectory = useMemo((): BurnTrajectoryPoint[] => {
    const percentages = [0, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90];
    const initialSupply = baseMetrics.supply;
    const initialMcap = baseMetrics.mcap;
    const initialPrice = baseMetrics.price;

    return percentages.map((pct) => {
      const frac = pct / 100;
      const burned = initialSupply * frac;
      const remaining = initialSupply - burned;

      // Constant price
      const cMcap = remaining * initialPrice;
      const cPrice = initialPrice;

      // Scarcity
      const sMcap = initialMcap;
      const sPrice = remaining > 0 ? initialMcap / remaining : initialPrice;

      // Elastic
      const ratio = remaining > 0 ? initialSupply / remaining : 1;
      const ePrice = initialPrice * Math.pow(ratio, elasticityFactor);
      const eMcap = remaining * ePrice;

      return {
        burnPercent: pct,
        label: `${pct}%`,
        remainingSupply: Math.round(remaining),
        remainingSupplyFormatted: formatCompactNumber(remaining),
        burnedSupply: Math.round(burned),
        constantPriceMcap: Math.round(cMcap),
        scarcityMcap: Math.round(sMcap),
        elasticMcap: Math.round(eMcap),
        impliedPriceConstant: cPrice,
        impliedPriceScarcity: sPrice,
        impliedPriceElastic: ePrice,
      };
    });
  }, [baseMetrics, elasticityFactor]);

  // Copy burn simulation report to clipboard
  const handleCopyReport = () => {
    const report = `=== TOKEN BURN MECHANISM SIMULATION ===
Scope: ${baseMetrics.name} (${baseMetrics.symbol})
Original Circulating Supply: ${baseMetrics.supply.toLocaleString()}
Burn Removal Target: ${burnPercent}% (${burnCalculations.burnedSupply.toLocaleString()} tokens)
Remaining Circulating Supply: ${burnCalculations.remainingSupply.toLocaleString()}
Burn Destination: ${DEAD_ADDRESS}

[VALUATION IMPACT (${valuationModel.toUpperCase()})]
Original Market Cap: ${formatCompactCurrency(baseMetrics.mcap)}
Updated Market Cap:  ${formatCompactCurrency(burnCalculations.updatedMcap)} (Delta: ${burnCalculations.mcapDelta >= 0 ? "+" : ""}${formatCompactCurrency(burnCalculations.mcapDelta)} / ${burnCalculations.mcapDeltaPercent.toFixed(2)}%)
Initial Token Price: $${baseMetrics.price.toFixed(6)} USD
Updated Implied Price: $${burnCalculations.updatedPrice.toFixed(6)} USD (Delta: ${burnCalculations.priceDelta >= 0 ? "+" : ""}${burnCalculations.priceDeltaPercent.toFixed(2)}%)
Destroyed Asset Value: ${formatCompactCurrency(burnCalculations.burnedTokensUsdValue)}

Generated via Web3 Token & Contract ID Foundry 5.0`;

    navigator.clipboard.writeText(report);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  // Export JSON payload
  const handleExportJson = () => {
    const payload = {
      timestamp: new Date().toISOString(),
      scope: baseMetrics.name,
      symbol: baseMetrics.symbol,
      burnPercent,
      valuationModel,
      elasticityFactor,
      destinationAddress: DEAD_ADDRESS,
      metrics: {
        initialSupply: baseMetrics.supply,
        burnedSupply: burnCalculations.burnedSupply,
        remainingSupply: burnCalculations.remainingSupply,
        initialMarketCap: baseMetrics.mcap,
        updatedMarketCap: burnCalculations.updatedMcap,
        initialPriceUsd: baseMetrics.price,
        updatedPriceUsd: burnCalculations.updatedPrice,
        burnedUsdValue: burnCalculations.burnedTokensUsdValue,
      },
      selectedTokenCount: selectedTokens.length,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `burn_simulation_${baseMetrics.symbol.toLowerCase()}_${burnPercent}pct.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Trigger simulated on-chain burn
  const handleSimulateExecution = () => {
    setSimulatedExecution(true);
    setTimeout(() => {
      setSimulatedExecution(false);
    }, 3500);
  };

  const burnPresets = [5, 10, 20, 25, 33.3, 50, 75, 90];

  return (
    <div
      id="burn-mechanism-simulator-container"
      className={`bg-[#0C0E14] border border-orange-500/40 rounded-xl p-4 sm:p-5 shadow-2xl space-y-5 transition-all text-xs font-mono ${className}`}
    >
      {/* 1. Header with Title, Scope Picker & Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3.5 border-b border-[#202738]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500/25 to-rose-500/25 border border-orange-500/40 flex items-center justify-center text-orange-400 shadow-md">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>Token Burn Mechanism Simulator</span>
              </h4>
              <span className="px-2 py-0.5 rounded bg-orange-500/20 border border-orange-500/40 text-orange-300 text-[10px] font-bold">
                SUPPLY DESTRUCTION &amp; VALUATION IMPACT
              </span>
            </div>
            <p className="text-[11px] text-[#8E9299]">
              Simulate deflationary burn events, calculate permanent supply reductions, and project updated market cap valuations.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Target Token Scope Picker */}
          {selectedTokens.length > 1 && (
            <div className="flex items-center gap-1.5 bg-[#141824] px-2.5 py-1 rounded-lg border border-[#232B3E]">
              <span className="text-[#8E9299] text-[10px]">Scope:</span>
              <select
                id="select-burn-target-scope"
                value={targetTokenId}
                onChange={(e) => setTargetTokenId(e.target.value)}
                className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#141824] text-white">
                  All Selected ({selectedTokens.length} Tokens Basket)
                </option>
                {selectedTokens.map((t) => (
                  <option key={t.id} value={t.id} className="bg-[#141824] text-white">
                    {t.name} ({t.symbol})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            id="btn-burn-copy-report"
            onClick={handleCopyReport}
            className="px-2.5 py-1.5 rounded-lg bg-[#141824] hover:bg-[#202738] border border-[#2B354C] text-[#8E9299] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Copy burn mechanism report to clipboard"
          >
            {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedReport ? "Copied" : "Copy Report"}</span>
          </button>

          <button
            type="button"
            id="btn-burn-export-json"
            onClick={handleExportJson}
            className="px-2.5 py-1.5 rounded-lg bg-[#141824] hover:bg-[#202738] border border-[#2B354C] text-[#8E9299] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Download burn analysis JSON payload"
          >
            <Download className="w-3.5 h-3.5 text-orange-400" />
            <span>JSON</span>
          </button>

          <button
            type="button"
            id="btn-burn-simulate-execution"
            onClick={handleSimulateExecution}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-md ${
              simulatedExecution
                ? "bg-emerald-500 text-black shadow-emerald-500/30"
                : "bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 text-black shadow-orange-950/40"
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${simulatedExecution ? "animate-bounce" : ""}`} />
            <span>{simulatedExecution ? "Burn Executed (Simulated)!" : "Simulate Burn Event"}</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Burn Percentage & Economic Model Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-[#101420] p-4 rounded-xl border border-[#1E2536]">
        {/* Left Column: Burn Percentage Slider & Presets (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-white font-bold flex items-center gap-1.5 text-xs">
              <Sliders className="w-3.5 h-3.5 text-orange-400" />
              <span>Define Burn Percentage (% of Total Supply)</span>
            </label>
            <div className="flex items-center gap-1.5 bg-[#0A0D14] px-2 py-0.5 rounded border border-[#252E44]">
              <span className="text-orange-400 font-extrabold text-sm font-mono">{burnPercent}%</span>
              <span className="text-[#8E9299] text-[10px]">Supply Removed</span>
            </div>
          </div>

          {/* Range Slider */}
          <div className="space-y-1">
            <input
              id="slider-burn-percentage"
              type="range"
              min="0.5"
              max="95"
              step="0.5"
              value={burnPercent}
              onChange={(e) => setBurnPercent(parseFloat(e.target.value))}
              className="w-full h-2.5 bg-[#192030] rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <div className="flex justify-between text-[10px] text-[#6E7587]">
              <span>0.5% (Micro Burn)</span>
              <span>25% (Quarter)</span>
              <span>50% (Halving)</span>
              <span>75% (Major Liquidation)</span>
              <span>95% (Extreme Squeeze)</span>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[#8E9299] text-[10px] mr-1">Presets:</span>
            {burnPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                id={`btn-burn-preset-${preset}`}
                onClick={() => setBurnPercent(preset)}
                className={`px-2 py-0.5 rounded text-[10px] border transition-all cursor-pointer ${
                  burnPercent === preset
                    ? "bg-orange-500 text-black font-bold border-orange-400"
                    : "bg-[#161C2A] text-[#8E9299] hover:text-white border-[#273248] hover:border-orange-500/50"
                }`}
              >
                {preset}%
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Valuation Model Selection (5 cols) */}
        <div className="lg:col-span-5 space-y-2 border-t lg:border-t-0 lg:border-l border-[#1E2536] lg:pl-4 pt-3 lg:pt-0">
          <label className="text-white font-bold flex items-center gap-1.5 text-xs">
            <Scale className="w-3.5 h-3.5 text-cyan-400" />
            <span>Market Cap Valuation Model</span>
          </label>

          <div className="grid grid-cols-1 gap-1.5">
            <button
              type="button"
              id="btn-model-constant-price"
              onClick={() => setValuationModel("constant_price")}
              className={`p-2 rounded-lg border text-left flex items-start justify-between transition-all cursor-pointer ${
                valuationModel === "constant_price"
                  ? "bg-orange-500/15 border-orange-500/60 text-white"
                  : "bg-[#141824] border-[#222A3E] text-[#8E9299] hover:text-white"
              }`}
            >
              <div>
                <div className="font-bold text-[11px] text-white flex items-center gap-1.5">
                  <span>Nominal Burn (Constant Unit Price)</span>
                  {valuationModel === "constant_price" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                  )}
                </div>
                <div className="text-[10px] text-[#8E9299] mt-0.5">
                  Spot price remains unchanged; nominal Market Cap decreases proportionally with supply destruction.
                </div>
              </div>
            </button>

            <button
              type="button"
              id="btn-model-scarcity-rerate"
              onClick={() => setValuationModel("scarcity_rerate")}
              className={`p-2 rounded-lg border text-left flex items-start justify-between transition-all cursor-pointer ${
                valuationModel === "scarcity_rerate"
                  ? "bg-cyan-500/15 border-cyan-500/60 text-white"
                  : "bg-[#141824] border-[#222A3E] text-[#8E9299] hover:text-white"
              }`}
            >
              <div>
                <div className="font-bold text-[11px] text-white flex items-center gap-1.5">
                  <span>Scarcity Re-Rating (Invariant Market Cap)</span>
                  {valuationModel === "scarcity_rerate" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  )}
                </div>
                <div className="text-[10px] text-[#8E9299] mt-0.5">
                  Total capital valuation is retained; implied price per token increases inversely to removed supply.
                </div>
              </div>
            </button>

            <button
              type="button"
              id="btn-model-elastic-demand"
              onClick={() => setValuationModel("elastic_demand")}
              className={`p-2 rounded-lg border text-left flex items-start justify-between transition-all cursor-pointer ${
                valuationModel === "elastic_demand"
                  ? "bg-purple-500/15 border-purple-500/60 text-white"
                  : "bg-[#141824] border-[#222A3E] text-[#8E9299] hover:text-white"
              }`}
            >
              <div>
                <div className="font-bold text-[11px] text-white flex items-center gap-1.5">
                  <span>Elastic Demand (Dynamic Market Response)</span>
                  {valuationModel === "elastic_demand" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  )}
                </div>
                <div className="text-[10px] text-[#8E9299] mt-0.5">
                  Price scales by supply elasticity (η={elasticityFactor}), capturing real-world AMM liquidity responses.
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Before vs After Key Metric Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Circulating Supply Impact */}
        <div className="bg-[#101420] p-3.5 rounded-xl border border-[#1E2536] space-y-2">
          <div className="flex items-center justify-between text-[#8E9299] text-[10px] uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-cyan-400" />
              Circulating Supply
            </span>
            <span className="text-rose-400 font-bold">-{burnPercent}%</span>
          </div>

          <div>
            <div className="text-base font-bold text-white truncate">
              {formatCompactNumber(burnCalculations.remainingSupply)}
            </div>
            <div className="text-[10px] text-[#8E9299] flex items-center justify-between mt-1">
              <span>Original: {formatCompactNumber(baseMetrics.supply)}</span>
              <span className="text-orange-400">-{formatCompactNumber(burnCalculations.burnedSupply)}</span>
            </div>
          </div>

          {/* Micro Progress Bar */}
          <div className="w-full bg-[#1A202E] h-1.5 rounded-full overflow-hidden flex">
            <div
              className="bg-cyan-400 h-full"
              style={{ width: `${100 - burnPercent}%` }}
              title={`Remaining: ${(100 - burnPercent).toFixed(1)}%`}
            />
            <div
              className="bg-orange-500 h-full"
              style={{ width: `${burnPercent}%` }}
              title={`Burned: ${burnPercent}%`}
            />
          </div>
        </div>

        {/* Card 2: Updated Market Cap Valuation */}
        <div className="bg-[#101420] p-3.5 rounded-xl border border-orange-500/30 space-y-2">
          <div className="flex items-center justify-between text-[#8E9299] text-[10px] uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
              Updated Market Cap
            </span>
            <span
              className={`font-bold ${
                burnCalculations.mcapDelta >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {burnCalculations.mcapDeltaPercent >= 0 ? "+" : ""}
              {burnCalculations.mcapDeltaPercent.toFixed(1)}%
            </span>
          </div>

          <div>
            <div className="text-base font-bold text-amber-300 truncate">
              {formatCompactCurrency(burnCalculations.updatedMcap)}
            </div>
            <div className="text-[10px] text-[#8E9299] flex items-center justify-between mt-1">
              <span>Initial: {formatCompactCurrency(baseMetrics.mcap)}</span>
              <span
                className={
                  burnCalculations.mcapDelta >= 0 ? "text-emerald-400 font-bold" : "text-rose-400"
                }
              >
                {burnCalculations.mcapDelta >= 0 ? "+" : ""}
                {formatCompactCurrency(burnCalculations.mcapDelta)}
              </span>
            </div>
          </div>

          <div className="text-[10px] text-amber-400/90 font-semibold truncate">
            Model: {valuationModel === "constant_price" ? "Constant Spot Price" : valuationModel === "scarcity_rerate" ? "Invariant Valuation" : "Elastic AMM"}
          </div>
        </div>

        {/* Card 3: Implied Token Price */}
        <div className="bg-[#101420] p-3.5 rounded-xl border border-[#1E2536] space-y-2">
          <div className="flex items-center justify-between text-[#8E9299] text-[10px] uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              Implied Token Price
            </span>
            <span
              className={`font-bold ${
                burnCalculations.priceDelta >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {burnCalculations.priceDelta >= 0 ? "+" : ""}
              {burnCalculations.priceDeltaPercent.toFixed(1)}%
            </span>
          </div>

          <div>
            <div className="text-base font-bold text-emerald-400 truncate">
              ${burnCalculations.updatedPrice.toFixed(6)}
            </div>
            <div className="text-[10px] text-[#8E9299] flex items-center justify-between mt-1">
              <span>Initial: ${baseMetrics.price.toFixed(6)}</span>
              <span className="text-emerald-400">
                {burnCalculations.priceDelta >= 0 ? "+" : ""}${burnCalculations.priceDelta.toFixed(6)}
              </span>
            </div>
          </div>

          <div className="text-[10px] text-[#8E9299] truncate">
            Multiplier: {(burnCalculations.updatedPrice / (baseMetrics.price || 1)).toFixed(2)}x initial spot
          </div>
        </div>

        {/* Card 4: Value of Burned Tokens (USD) */}
        <div className="bg-[#101420] p-3.5 rounded-xl border border-[#1E2536] space-y-2">
          <div className="flex items-center justify-between text-[#8E9299] text-[10px] uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              Value of Burned Assets
            </span>
            <span className="text-orange-400 font-bold">WIPED</span>
          </div>

          <div>
            <div className="text-base font-bold text-orange-400 truncate">
              {formatCompactCurrency(burnCalculations.burnedTokensUsdValue)}
            </div>
            <div className="text-[10px] text-[#8E9299] flex items-center justify-between mt-1">
              <span>Permanently sent to:</span>
              <span className="text-[#D0D4E0] font-mono">0x...dEaD</span>
            </div>
          </div>

          <div className="text-[10px] text-orange-400/90 font-semibold truncate">
            {formatCompactNumber(burnCalculations.burnedSupply)} units irrevocably lost
          </div>
        </div>
      </div>

      {/* 4. Supply & Market Cap Trajectory Chart */}
      <div className="bg-[#101420] p-4 rounded-xl border border-[#1E2536] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1E2536] pb-2.5">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-orange-400" />
            <div>
              <h5 className="font-bold text-white text-xs uppercase tracking-wider">
                Supply Destruction &amp; Market Cap Trajectory
              </h5>
              <p className="text-[10px] text-[#8E9299]">
                Simulated response across burn percentages (0% to 90%), contrasting constant price vs. scarcity re-rating.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[10px] text-[#8E9299]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span>Remaining Supply</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
              <span>Nominal MCap ($)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>Scarcity MCap ($)</span>
            </div>
          </div>
        </div>

        {/* Recharts Composed Chart */}
        <div className="h-56 sm:h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartTrajectory} margin={{ top: 10, right: 15, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="burnSupplyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#00F0FF" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1D2436" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#5A657D"
                tick={{ fill: "#8E9299", fontSize: 10, fontFamily: "monospace" }}
              />
              {/* Left Y Axis: Market Cap ($) */}
              <YAxis
                yAxisId="mcap"
                stroke="#5A657D"
                tick={{ fill: "#8E9299", fontSize: 10, fontFamily: "monospace" }}
                tickFormatter={(val) => formatCompactCurrency(val)}
              />
              {/* Right Y Axis: Supply Tokens */}
              <YAxis
                yAxisId="supply"
                orientation="right"
                stroke="#5A657D"
                tick={{ fill: "#8E9299", fontSize: 10, fontFamily: "monospace" }}
                tickFormatter={(val) => formatCompactNumber(val)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0C0F16",
                  borderColor: "#263045",
                  borderRadius: "0.5rem",
                  fontFamily: "monospace",
                  fontSize: "11px",
                }}
                formatter={(val: any, name: any) => {
                  if (name === "Remaining Supply") return [formatCompactNumber(Number(val)), name];
                  return [formatCompactCurrency(Number(val)), name];
                }}
              />
              <Legend
                wrapperStyle={{ fontFamily: "monospace", fontSize: "10px", paddingTop: "5px" }}
              />
              <ReferenceLine
                x={`${burnPercent}%`}
                stroke="#F97316"
                strokeDasharray="3 3"
                label={{ value: `Active (${burnPercent}%)`, fill: "#F97316", fontSize: 10 }}
              />
              <Area
                yAxisId="supply"
                type="monotone"
                dataKey="remainingSupply"
                name="Remaining Supply"
                fill="url(#burnSupplyGrad)"
                stroke="#00F0FF"
                strokeWidth={2}
              />
              <Line
                yAxisId="mcap"
                type="monotone"
                dataKey="constantPriceMcap"
                name="Nominal MCap (Constant Price)"
                stroke="#F97316"
                strokeWidth={2}
                dot={{ r: 3, fill: "#F97316" }}
              />
              <Line
                yAxisId="mcap"
                type="monotone"
                dataKey="scarcityMcap"
                name="Scarcity MCap (Invariant)"
                stroke="#10B981"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={{ r: 2, fill: "#10B981" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. On-Chain Smart Contract Burn Verification & Receipt Simulation */}
      <div className="bg-[#080A0F] border border-[#1A202E] rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between text-[11px] text-[#8E9299]">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-orange-400" />
            Smart Contract Burn Protocol Signature (EIP-20 / SPL)
          </span>
          <span className="text-emerald-400 font-mono flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Proof of Supply Annihilation
          </span>
        </div>

        <div className="bg-[#05060A] p-2.5 rounded-lg border border-[#141822] space-y-1.5 text-[10px] font-mono text-[#A0A5B5] overflow-x-auto">
          <div className="flex items-center gap-2">
            <span className="text-purple-400 font-bold">function</span>
            <span className="text-cyan-300">burn</span>
            <span className="text-white">(uint256 amount)</span>
            <span className="text-purple-400 font-bold">external returns</span>
            <span className="text-white">(bool)</span>
          </div>
          <div className="text-[#6E7587] pl-4">
            // Emits: Transfer(msg.sender, {DEAD_ADDRESS}, {formatCompactNumber(burnCalculations.burnedSupply)} {baseMetrics.symbol})
          </div>
          <div className="flex items-center justify-between text-[#8E9299] pt-1 border-t border-[#121620]">
            <div>
              Target Contract: <span className="text-cyan-400">{baseMetrics.contractAddress}</span>
            </div>
            <div>
              Burn Sink: <span className="text-orange-400">{DEAD_ADDRESS}</span>
            </div>
          </div>
        </div>

        {simulatedExecution && (
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Simulated Burn Completed:</strong> Successfully burned {formatCompactNumber(burnCalculations.burnedSupply)} {baseMetrics.symbol} ({burnPercent}% of total supply). Updated Market Cap is now {formatCompactCurrency(burnCalculations.updatedMcap)}.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
