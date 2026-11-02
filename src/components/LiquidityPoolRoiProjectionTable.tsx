import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Percent,
  Sparkles,
  Sliders,
  ShieldCheck,
  Zap,
  RefreshCw,
  Layers,
  Clock,
  ArrowUpRight,
  Info,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { TokenRecord } from "../types";
import {
  LiquidityPoolInitParameters,
  PoolRangeStrategy,
  SettlementAssetSymbol,
} from "../utils/treasuryCollateralSettlementEngine";

export interface LiquidityPoolRoiProjectionTableProps {
  poolParams: LiquidityPoolInitParameters;
  activeToken: TokenRecord;
  quoteAsset: SettlementAssetSymbol;
  feeTier: 500 | 3000 | 10000;
  rangeStrategy: PoolRangeStrategy;
  liquidityPercent: number;
  slippagePercent: number;
  className?: string;
}

export type RoiTimeHorizon = "30D" | "90D" | "1Y" | "3Y";

export interface MarketTrendScenario {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  turnoverDailyPct: number; // Daily volume as % of pool depth
  volatilityLabel: "Low" | "Moderate" | "Elevated" | "High Volatility";
  impermanentLossAnnualPct: number;
  description: string;
}

const MARKET_TREND_SCENARIOS: MarketTrendScenario[] = [
  {
    id: "conservative",
    name: "Defensive Trend (Quiet Market)",
    badge: "Bearish / Low Vol",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/25",
    turnoverDailyPct: 8.0,
    volatilityLabel: "Low",
    impermanentLossAnnualPct: 1.2,
    description: "Low-velocity market environment with modest organic swap volume and minimal price drift.",
  },
  {
    id: "benchmark",
    name: "Benchmark Trend (Current Market)",
    badge: "Balanced / Steady",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
    turnoverDailyPct: 22.0,
    volatilityLabel: "Moderate",
    impermanentLossAnnualPct: 2.8,
    description: "Standard DeFi market conditions with steady cross-DEX arbitrage, AMM routing, and retail swaps.",
  },
  {
    id: "bullish",
    name: "High-Velocity Bull Trend",
    badge: "Bullish Surge",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/25",
    turnoverDailyPct: 55.0,
    volatilityLabel: "Elevated",
    impermanentLossAnnualPct: 5.2,
    description: "Strong directional momentum, heavy token discovery volume, and frequent liquidity pool rebalancing.",
  },
  {
    id: "viral",
    name: "Viral Discovery / Arbitrage Frenzy",
    badge: "Hyper-Growth",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/25",
    turnoverDailyPct: 110.0,
    volatilityLabel: "High Volatility",
    impermanentLossAnnualPct: 8.5,
    description: "Extreme DEX trading volume with MEV algorithmic searchers and rapid pool utilization spikes.",
  },
];

export const LiquidityPoolRoiProjectionTable: React.FC<
  LiquidityPoolRoiProjectionTableProps
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
  // State: Selected Horizon, Compounding Toggle, and Custom Turnover Slider
  const [selectedHorizon, setSelectedHorizon] = useState<RoiTimeHorizon>("1Y");
  const [isCompounded, setIsCompounded] = useState<boolean>(true);
  const [customTurnoverPct, setCustomTurnoverPct] = useState<number>(22.0);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("all");

  const totalPoolDepthUsd = poolParams.totalInitialLiquidityUsd;
  const sovereignMarketCap = poolParams.sovereignMarketCap;
  const feeRate = feeTier / 1_000_000; // 500 -> 0.0005, 3000 -> 0.003, 10000 -> 0.01
  const efficiency = poolParams.concentratedCapitalEfficiencyMultiplier;

  // Horizon Multiplier in Days
  const horizonDays = useMemo(() => {
    switch (selectedHorizon) {
      case "30D":
        return 30;
      case "90D":
        return 90;
      case "1Y":
        return 365;
      case "3Y":
        return 365 * 3;
      default:
        return 365;
    }
  }, [selectedHorizon]);

  // =========================================================================
  // SCENARIO CALCULATIONS
  // =========================================================================
  const scenariosWithMetrics = useMemo(() => {
    const list = isCustomMode
      ? [
          {
            id: "custom",
            name: `Custom Trend (${customTurnoverPct}% Daily Turnover)`,
            badge: "Custom Mode",
            badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/25",
            turnoverDailyPct: customTurnoverPct,
            volatilityLabel:
              customTurnoverPct < 15
                ? ("Low" as const)
                : customTurnoverPct < 50
                ? ("Moderate" as const)
                : ("High Volatility" as const),
            impermanentLossAnnualPct: Math.min(12, customTurnoverPct * 0.1),
            description: "User-configured daily volume turnover parameter for custom stress testing.",
          },
        ]
      : MARKET_TREND_SCENARIOS;

    return list.map((sc) => {
      // 1. Daily Volume ($) = Total Pool Depth * Turnover %
      const dailyVolumeUsd = totalPoolDepthUsd * (sc.turnoverDailyPct / 100);
      const annualVolumeUsd = dailyVolumeUsd * 365;

      // 2. Fee Earnings: The LP owns 100% of this initialized pool's active range
      const dailyFeesUsd = dailyVolumeUsd * feeRate;
      const annualFeesUsd = annualVolumeUsd * feeRate;

      // 3. APR / APY Calculations
      const simpleApr = (annualFeesUsd / totalPoolDepthUsd) * 100;
      // Daily compound formula: (1 + r/365)^365 - 1
      const compoundedApy =
        (Math.pow(1 + simpleApr / 100 / 365, 365) - 1) * 100;

      // Active annual yield rate chosen by user toggle
      const effectiveAnnualRate = isCompounded ? compoundedApy : simpleApr;
      const netEffectiveApy = Math.max(0, effectiveAnnualRate - sc.impermanentLossAnnualPct);

      // Period fee yield for the chosen horizon
      const periodRatio = horizonDays / 365;
      const periodReturnUsd = isCompounded
        ? totalPoolDepthUsd * (Math.pow(1 + netEffectiveApy / 100, periodRatio) - 1)
        : annualFeesUsd * periodRatio;

      // Break-even horizon (days needed for fees to equal initial pool commitment)
      const breakEvenDays = dailyFeesUsd > 0 ? Math.ceil(totalPoolDepthUsd / dailyFeesUsd) : 9999;

      return {
        ...sc,
        dailyVolumeUsd,
        annualVolumeUsd,
        dailyFeesUsd,
        annualFeesUsd,
        simpleApr,
        compoundedApy,
        netEffectiveApy,
        periodReturnUsd,
        breakEvenDays,
      };
    });
  }, [
    isCustomMode,
    customTurnoverPct,
    totalPoolDepthUsd,
    feeRate,
    isCompounded,
    horizonDays,
  ]);

  // Active benchmark scenario for quick highlights
  const benchmarkScenario = useMemo(() => {
    return (
      scenariosWithMetrics.find((s) => s.id === "benchmark") ||
      scenariosWithMetrics[0]
    );
  }, [scenariosWithMetrics]);

  return (
    <div
      className={`rounded-xl bg-[#0B0D18] border border-[#242944] p-4 space-y-4 font-mono shadow-xl ${className}`}
    >
      {/* =================================================================
          HEADER & INTERACTIVE CONTROLS
         ================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1C2138] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-emerald-400">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Dynamic ROI & Annual Yield Projections
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#F27D26]/10 text-[#F27D26] border border-[#F27D26]/25">
                {liquidityPercent}% Ratio · ${(totalPoolDepthUsd).toLocaleString()} USD Depth
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-sans mt-0.5">
              Simulates annual fee returns and compounding yields based on {activeToken.symbol}&apos;s ${sovereignMarketCap.toLocaleString()} market cap and current market trends.
            </p>
          </div>
        </div>

        {/* Horizon & Compounding Switchers */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe Selector */}
          <div className="flex items-center rounded-lg bg-[#121526] p-1 border border-[#202642]">
            {(["30D", "90D", "1Y", "3Y"] as RoiTimeHorizon[]).map((hz) => (
              <button
                key={hz}
                type="button"
                onClick={() => setSelectedHorizon(hz)}
                className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer transition ${
                  selectedHorizon === hz
                    ? "bg-emerald-500 text-black shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {hz}
              </button>
            ))}
          </div>

          {/* Daily Compounding Toggle */}
          <button
            type="button"
            onClick={() => setIsCompounded((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
              isCompounded
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                : "bg-[#141728] border-[#252C48] text-gray-400 hover:text-white"
            }`}
            title="Toggle between Auto-Compounding APY and Simple APR"
          >
            <RefreshCw className={`w-3 h-3 ${isCompounded ? "text-emerald-400 animate-spin" : ""}`} style={{ animationDuration: '6s' }} />
            <span>{isCompounded ? "Daily APY (Compounded)" : "Simple APR"}</span>
          </button>
        </div>
      </div>

      {/* =================================================================
          BENCHMARK ROI EXECUTIVE SUMMARY TILES
         ================================================================= */}
      {benchmarkScenario && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          {/* Projected Period Return */}
          <div className="p-3 rounded-lg bg-[#0E1224] border border-[#202848] space-y-1">
            <span className="text-[10px] text-gray-400 uppercase block">
              Est. {selectedHorizon} Fee Earnings
            </span>
            <div className="text-base font-black text-emerald-400">
              +${Math.round(benchmarkScenario.periodReturnUsd).toLocaleString()} USD
            </div>
            <span className="text-[10px] text-gray-400 block truncate">
              {benchmarkScenario.netEffectiveApy.toFixed(1)}% Net Annual Yield
            </span>
          </div>

          {/* Daily Cashflow to Treasury */}
          <div className="p-3 rounded-lg bg-[#0E1224] border border-[#202848] space-y-1">
            <span className="text-[10px] text-gray-400 uppercase block">
              Daily Fee Cashflow
            </span>
            <div className="text-base font-black text-cyan-400">
              ${Math.round(benchmarkScenario.dailyFeesUsd).toLocaleString()} / day
            </div>
            <span className="text-[10px] text-gray-400 block truncate">
              Sovereign Treasury Vault
            </span>
          </div>

          {/* Break-Even Period */}
          <div className="p-3 rounded-lg bg-[#0E1224] border border-[#202848] space-y-1">
            <span className="text-[10px] text-gray-400 uppercase block">
              Collateral Recovery Period
            </span>
            <div className="text-base font-black text-white">
              {benchmarkScenario.breakEvenDays > 3650
                ? "> 10 Years"
                : `${benchmarkScenario.breakEvenDays} Days`}
            </div>
            <span className="text-[10px] text-emerald-400 block truncate">
              At ${(benchmarkScenario.dailyVolumeUsd).toLocaleString()} daily volume
            </span>
          </div>

          {/* Liquidity Ratio Commitment */}
          <div className="p-3 rounded-lg bg-[#0E1224] border border-[#202848] space-y-1">
            <span className="text-[10px] text-gray-400 uppercase block">
              Allocated Pool Ratio
            </span>
            <div className="text-base font-black text-[#F27D26]">
              {liquidityPercent.toFixed(1)}% MCap
            </div>
            <span className="text-[10px] text-gray-400 block truncate">
              ${Math.round(totalPoolDepthUsd).toLocaleString()} USD backing
            </span>
          </div>
        </div>
      )}

      {/* =================================================================
          CUSTOM TURNOVER SLIDER & SIMULATION BAR
         ================================================================= */}
      <div className="p-3 rounded-lg bg-[#0F1326] border border-[#1E2544] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-[#F27D26]" />
          <span className="text-gray-300 font-bold">Simulate Custom Market Volume Turnover:</span>
          <span className="text-emerald-400 font-bold">{customTurnoverPct}% / day</span>
          <span className="text-[11px] text-gray-400 hidden sm:inline">
            (${(totalPoolDepthUsd * (customTurnoverPct / 100)).toLocaleString()} 24h Vol)
          </span>
        </div>

        <div className="flex items-center gap-3 flex-1 sm:max-w-xs">
          <input
            type="range"
            min="2"
            max="120"
            step="1"
            value={customTurnoverPct}
            onChange={(e) => {
              setCustomTurnoverPct(parseFloat(e.target.value) || 20);
              setIsCustomMode(true);
            }}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          {isCustomMode && (
            <button
              type="button"
              onClick={() => setIsCustomMode(false)}
              className="text-[10px] text-gray-400 hover:text-white underline cursor-pointer shrink-0"
            >
              Reset Scenarios
            </button>
          )}
        </div>
      </div>

      {/* =================================================================
          DYNAMIC ROI PROJECTION TABLE
         ================================================================= */}
      <div className="overflow-x-auto rounded-xl border border-[#1E243E] bg-[#070914]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0F1326] text-[10px] text-gray-400 uppercase tracking-wider border-b border-[#1E243E]">
            <tr>
              <th className="py-2.5 px-3">Market Trend Regime</th>
              <th className="py-2.5 px-3">Est. 24h Volume</th>
              <th className="py-2.5 px-3">Daily Fee Cashflow</th>
              <th className="py-2.5 px-3">{selectedHorizon} Projected Yield</th>
              <th className="py-2.5 px-3">Annual APY (Net)</th>
              <th className="py-2.5 px-3">IL Drag</th>
              <th className="py-2.5 px-3 text-right">Break-Even</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#171B30]">
            {scenariosWithMetrics.map((sc) => (
              <tr
                key={sc.id}
                className={`transition-colors ${
                  sc.id === "benchmark" && !isCustomMode
                    ? "bg-[#12162C]/80 hover:bg-[#161C38]"
                    : "hover:bg-[#101428]"
                }`}
              >
                {/* Trend Regime */}
                <td className="py-2.5 px-3 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{sc.name}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${sc.badgeColor}`}
                    >
                      {sc.badge}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 font-sans mt-0.5 max-w-sm truncate">
                    {sc.description}
                  </div>
                </td>

                {/* 24h Volume */}
                <td className="py-2.5 px-3 text-gray-300 font-bold">
                  ${Math.round(sc.dailyVolumeUsd).toLocaleString()}
                  <span className="text-[10px] text-gray-500 block font-normal">
                    {sc.turnoverDailyPct}% TVL/day
                  </span>
                </td>

                {/* Daily Fee Cashflow */}
                <td className="py-2.5 px-3 text-cyan-400 font-bold">
                  +${Math.round(sc.dailyFeesUsd).toLocaleString()}
                  <span className="text-[10px] text-gray-500 block font-normal">
                    @ {(feeTier / 10000).toFixed(2)}% fee
                  </span>
                </td>

                {/* Period Yield */}
                <td className="py-2.5 px-3 font-bold text-emerald-400">
                  +${Math.round(sc.periodReturnUsd).toLocaleString()} USD
                  <span className="text-[10px] text-gray-400 block font-normal">
                    {((sc.periodReturnUsd / totalPoolDepthUsd) * 100).toFixed(2)}% of capital
                  </span>
                </td>

                {/* Net Annual APY */}
                <td className="py-2.5 px-3 font-black text-white">
                  <span className="text-emerald-400 text-sm">
                    {sc.netEffectiveApy.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-gray-500 block font-normal">
                    {isCompounded ? "Auto-Compounded" : "Simple APR"}
                  </span>
                </td>

                {/* Impermanent Loss Buffer */}
                <td className="py-2.5 px-3 text-gray-400">
                  <span className="text-rose-400">-{sc.impermanentLossAnnualPct.toFixed(1)}%</span>
                  <span className="text-[9px] text-gray-500 block">
                    {sc.volatilityLabel}
                  </span>
                </td>

                {/* Break-Even Days */}
                <td className="py-2.5 px-3 text-right font-bold text-gray-300">
                  {sc.breakEvenDays > 3650 ? "> 10 yrs" : `${sc.breakEvenDays} days`}
                  <span className="text-[9px] text-emerald-400 block">
                    100% Payout
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* =================================================================
          TREASURY DESTINATION BENEFICIARY NOTE
         ================================================================= */}
      <div className="p-3 rounded-lg bg-[#0E1222] border border-[#1E2544] flex flex-wrap items-center justify-between text-xs text-gray-400 gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Accrued LP swap fees settle automatically into the verified beneficiary:{" "}
            <strong className="text-white font-mono">
              {poolParams.recipientTreasuryAddress.slice(0, 10)}...{poolParams.recipientTreasuryAddress.slice(-6)}
            </strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-cyan-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Yields compound continuously on-chain via Uniswap V3 concentrated positions.</span>
        </div>
      </div>
    </div>
  );
};
