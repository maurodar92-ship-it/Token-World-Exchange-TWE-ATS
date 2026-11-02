import React, { useState, useEffect, useCallback } from "react";
import {
  Fuel,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Layers,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  TrendingDown,
  Sparkles,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";

export interface ChainGasData {
  id: string;
  name: string;
  nativeSymbol: string;
  gwei: number;
  status: "Optimal" | "Moderate" | "Congested";
  rpcSource: string;
  speeds: {
    slow: number;
    standard: number;
    fast: number;
  };
  estDeploymentCostUsd: number;
  estDeploymentCostNative: number;
  gasUnitsEstimated: number;
  blockTimeSec: number;
}

export interface GasEstimateApiResponse {
  success: boolean;
  timestamp: string;
  recommendedChain: "ethereum" | "polygon" | "arbitrum" | string;
  overallAdvisory: string;
  chains: {
    ethereum: ChainGasData;
    polygon: ChainGasData;
    arbitrum: ChainGasData;
  };
}

interface GasEstimatorWidgetProps {
  onTriggerDeployment?: () => void;
  className?: string;
  defaultExpanded?: boolean;
}

export const GasEstimatorWidget: React.FC<GasEstimatorWidgetProps> = ({
  onTriggerDeployment,
  className = "",
  defaultExpanded = true,
}) => {
  const [gasData, setGasData] = useState<GasEstimateApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [refreshInterval, setRefreshInterval] = useState<number>(15); // seconds (0 = off)
  const [selectedSpeed, setSelectedSpeed] = useState<"slow" | "standard" | "fast">("standard");
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [selectedChainId, setSelectedChainId] = useState<string>("arbitrum");

  // Fetch gas estimates from backend API
  const fetchGasEstimate = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/gas/estimate");
      if (res.ok) {
        const data: GasEstimateApiResponse = await res.json();
        if (data.success) {
          setGasData(data);
          setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
        }
      }
    } catch (err) {
      console.warn("Gas estimator failed to fetch live rates:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchGasEstimate();
  }, [fetchGasEstimate]);

  // Periodic auto-refresh
  useEffect(() => {
    if (refreshInterval <= 0) return;
    const interval = setInterval(() => {
      fetchGasEstimate();
    }, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [fetchGasEstimate, refreshInterval]);

  // Fallback defaults if initial load is pending
  const eth = gasData?.chains?.ethereum || {
    id: "ethereum",
    name: "Ethereum Mainnet",
    nativeSymbol: "ETH",
    gwei: 14.5,
    status: "Optimal" as const,
    rpcSource: "Public Node",
    speeds: { slow: 13.5, standard: 14.5, fast: 16.2 },
    estDeploymentCostUsd: 0.58,
    estDeploymentCostNative: 0.00021,
    gasUnitsEstimated: 1500000,
    blockTimeSec: 12,
  };

  const poly = gasData?.chains?.polygon || {
    id: "polygon",
    name: "Polygon PoS",
    nativeSymbol: "POL",
    gwei: 275.0,
    status: "Optimal" as const,
    rpcSource: "Public Node",
    speeds: { slow: 260.0, standard: 275.0, fast: 330.0 },
    estDeploymentCostUsd: 0.21,
    estDeploymentCostNative: 0.41,
    gasUnitsEstimated: 1500000,
    blockTimeSec: 2,
  };

  const arb = gasData?.chains?.arbitrum || {
    id: "arbitrum",
    name: "Arbitrum One",
    nativeSymbol: "ETH (L2)",
    gwei: 0.02,
    status: "Optimal" as const,
    rpcSource: "Arbitrum RPC",
    speeds: { slow: 0.019, standard: 0.02, fast: 0.022 },
    estDeploymentCostUsd: 0.013,
    estDeploymentCostNative: 0.000005,
    gasUnitsEstimated: 1500000,
    blockTimeSec: 0.25,
  };

  const getStatusBadge = (status: "Optimal" | "Moderate" | "Congested", gwei: number) => {
    if (status === "Optimal" || gwei < 20) {
      return {
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        text: "text-emerald-400",
        label: "Optimal Window",
      };
    }
    if (status === "Moderate") {
      return {
        bg: "bg-amber-500/10",
        border: "border-amber-500/30",
        text: "text-amber-300",
        label: "Moderate Traffic",
      };
    }
    return {
      bg: "bg-rose-500/10",
      border: "border-rose-500/30",
      text: "text-rose-400",
      label: "Congested",
    };
  };

  return (
    <div
      id="realtime-gas-estimator-widget"
      className={`bg-[#0D0F15] border border-[#202738] rounded-xl overflow-hidden shadow-xl transition-all ${className}`}
    >
      {/* Widget Header Strip */}
      <div className="p-3 bg-gradient-to-r from-[#121622] via-[#141926] to-[#121622] border-b border-[#202738] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 shadow-sm">
            <Fuel className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                Real-Time Multi-Chain Gas Estimator
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                LIVE RPC FEEDS
              </span>
            </div>
            <p className="text-[10px] text-[#8E9299]">
              Live Gwei costs for Ethereum, Polygon &amp; Arbitrum to plan optimal contract deployment timing.
            </p>
          </div>
        </div>

        {/* Compact Status Badges & Controls */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {/* Quick Glances in Header */}
          <div className="hidden sm:flex items-center gap-1.5 bg-[#171D2B] px-2.5 py-1 rounded-lg border border-[#252E44] text-[11px]">
            <span className="text-[#8E9299]">ETH:</span>
            <span className="text-amber-300 font-bold">{eth.gwei} Gwei</span>
            <span className="text-[#4E566D]">|</span>
            <span className="text-[#8E9299]">POL:</span>
            <span className="text-purple-300 font-bold">{Math.round(poly.gwei)} Gwei</span>
            <span className="text-[#4E566D]">|</span>
            <span className="text-[#8E9299]">ARB:</span>
            <span className="text-cyan-300 font-bold">{arb.gwei} Gwei</span>
          </div>

          {/* Speed Tier Selector */}
          <div className="flex items-center bg-[#171D2B] p-0.5 rounded-lg border border-[#252E44] text-[10px]">
            {(["slow", "standard", "fast"] as const).map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setSelectedSpeed(spd)}
                className={`px-2 py-0.5 rounded capitalize transition-all cursor-pointer ${
                  selectedSpeed === spd
                    ? "bg-[#252E44] text-cyan-300 font-bold shadow-xs"
                    : "text-[#8E9299] hover:text-white"
                }`}
              >
                {spd}
              </button>
            ))}
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            id="btn-refresh-gas-estimates"
            onClick={fetchGasEstimate}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-[#1D2436] hover:bg-[#28324B] border border-[#2F3C5E] text-[#8E9299] hover:text-white transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Gas Estimates Now"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          {/* Auto-Refresh Dropdown */}
          <div className="flex items-center gap-1 bg-[#171D2B] px-2 py-1 rounded-lg border border-[#252E44]">
            <Clock className="w-3 h-3 text-[#8E9299]" />
            <select
              id="select-gas-refresh-interval"
              aria-label="Select gas auto-refresh interval"
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="bg-transparent text-[10px] text-cyan-300 font-mono focus:outline-none cursor-pointer"
            >
              <option value={10} className="bg-[#171D2B] text-white">10s</option>
              <option value={15} className="bg-[#171D2B] text-white">15s</option>
              <option value={30} className="bg-[#171D2B] text-white">30s</option>
              <option value={0} className="bg-[#171D2B] text-white">Off</option>
            </select>
          </div>

          {/* Expand/Collapse Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-[#171D2B] hover:bg-[#252E44] border border-[#252E44] text-[#8E9299] hover:text-white transition-all cursor-pointer"
            title={isExpanded ? "Collapse Gas Estimator" : "Expand Gas Estimator"}
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Interactive Body */}
      {isExpanded && (
        <div className="p-3.5 space-y-3 font-mono">
          {/* 3 Chain Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. Ethereum Mainnet */}
            {(() => {
              const badge = getStatusBadge(eth.status, eth.gwei);
              const gweiVal = eth.speeds[selectedSpeed];
              const isSelected = selectedChainId === "ethereum";
              return (
                <div
                  onClick={() => setSelectedChainId("ethereum")}
                  className={`p-3 rounded-lg border transition-all cursor-pointer relative space-y-2 ${
                    isSelected
                      ? "bg-[#141A28] border-amber-500/50 shadow-md shadow-amber-950/20"
                      : "bg-[#10131C] border-[#1E2434] hover:border-[#2C364D]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-[10px] font-bold text-amber-300">
                        Ξ
                      </span>
                      <span className="text-xs font-bold text-white">{eth.name}</span>
                    </div>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${badge.bg} ${badge.border} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Big Gwei Figure */}
                  <div className="flex items-baseline justify-between pt-1">
                    <div>
                      <div className="text-xl font-black text-amber-300 tracking-tight">
                        {gweiVal} <span className="text-xs font-normal text-[#8E9299]">Gwei</span>
                      </div>
                      <div className="text-[10px] text-[#8E9299]">
                        Rate: {selectedSpeed.toUpperCase()} (~{eth.blockTimeSec}s block)
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-white">
                        ~${eth.estDeploymentCostUsd.toFixed(2)}
                      </div>
                      <div className="text-[9px] text-[#8E9299]">
                        ~{eth.estDeploymentCostNative.toFixed(5)} ETH
                      </div>
                    </div>
                  </div>

                  {/* Deployment Estimate Meta */}
                  <div className="text-[10px] text-[#8E9299] pt-1.5 border-t border-[#1C2130] flex items-center justify-between">
                    <span>ERC-20 Contract (~1.5M gas):</span>
                    <span className="text-emerald-400 font-semibold">
                      {eth.gwei < 20 ? "Cheap L1 Window" : "Wait for <15 Gwei"}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* 2. Polygon PoS */}
            {(() => {
              const badge = getStatusBadge(poly.status, poly.gwei);
              const gweiVal = poly.speeds[selectedSpeed];
              const isSelected = selectedChainId === "polygon";
              return (
                <div
                  onClick={() => setSelectedChainId("polygon")}
                  className={`p-3 rounded-lg border transition-all cursor-pointer relative space-y-2 ${
                    isSelected
                      ? "bg-[#141A28] border-purple-500/50 shadow-md shadow-purple-950/20"
                      : "bg-[#10131C] border-[#1E2434] hover:border-[#2C364D]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-[10px] font-bold text-purple-300">
                        ⬡
                      </span>
                      <span className="text-xs font-bold text-white">{poly.name}</span>
                    </div>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${badge.bg} ${badge.border} ${badge.text}`}>
                      Stable L1/L2
                    </span>
                  </div>

                  {/* Big Gwei Figure */}
                  <div className="flex items-baseline justify-between pt-1">
                    <div>
                      <div className="text-xl font-black text-purple-300 tracking-tight">
                        {Math.round(gweiVal)} <span className="text-xs font-normal text-[#8E9299]">Gwei</span>
                      </div>
                      <div className="text-[10px] text-[#8E9299]">
                        Rate: {selectedSpeed.toUpperCase()} (~{poly.blockTimeSec}s block)
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-white">
                        ~${poly.estDeploymentCostUsd.toFixed(2)}
                      </div>
                      <div className="text-[9px] text-[#8E9299]">
                        ~{poly.estDeploymentCostNative.toFixed(3)} POL
                      </div>
                    </div>
                  </div>

                  {/* Deployment Estimate Meta */}
                  <div className="text-[10px] text-[#8E9299] pt-1.5 border-t border-[#1C2130] flex items-center justify-between">
                    <span>ERC-20 Contract (~1.5M gas):</span>
                    <span className="text-purple-300 font-semibold">
                      Instant &lt;$0.25 Deploy
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* 3. Arbitrum One (L2) */}
            {(() => {
              const badge = getStatusBadge(arb.status, arb.gwei);
              const gweiVal = arb.speeds[selectedSpeed];
              const isSelected = selectedChainId === "arbitrum";
              return (
                <div
                  onClick={() => setSelectedChainId("arbitrum")}
                  className={`p-3 rounded-lg border transition-all cursor-pointer relative space-y-2 ${
                    isSelected
                      ? "bg-[#141A28] border-cyan-500/50 shadow-md shadow-cyan-950/20"
                      : "bg-[#10131C] border-[#1E2434] hover:border-[#2C364D]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-[10px] font-bold text-cyan-300">
                        ⚡
                      </span>
                      <span className="text-xs font-bold text-white">{arb.name}</span>
                    </div>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold border bg-cyan-500/10 border-cyan-500/30 text-cyan-400">
                      ⚡ 99% Cheaper
                    </span>
                  </div>

                  {/* Big Gwei Figure */}
                  <div className="flex items-baseline justify-between pt-1">
                    <div>
                      <div className="text-xl font-black text-cyan-300 tracking-tight">
                        {gweiVal.toFixed(3)} <span className="text-xs font-normal text-[#8E9299]">Gwei</span>
                      </div>
                      <div className="text-[10px] text-[#8E9299]">
                        Rate: {selectedSpeed.toUpperCase()} (~{arb.blockTimeSec}s block)
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-emerald-400">
                        ~${arb.estDeploymentCostUsd.toFixed(3)}
                      </div>
                      <div className="text-[9px] text-[#8E9299]">
                        ~{arb.estDeploymentCostNative.toFixed(6)} ETH
                      </div>
                    </div>
                  </div>

                  {/* Deployment Estimate Meta */}
                  <div className="text-[10px] text-[#8E9299] pt-1.5 border-t border-[#1C2130] flex items-center justify-between">
                    <span>ERC-20 Contract (~1.5M gas):</span>
                    <span className="text-cyan-300 font-semibold">
                      Lowest Cost Venue
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Real-Time Deployment Advisory Strip */}
          <div className="p-2.5 rounded-lg bg-[#141824] border border-[#222A3E] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start sm:items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <span className="text-white font-bold">Deployment Recommendation: </span>
                <span className="text-[#8E9299]">
                  {gasData?.overallAdvisory ||
                    `Ethereum Mainnet is at ${eth.gwei} Gwei (~$${eth.estDeploymentCostUsd.toFixed(2)}). Optimal window for authority deployments.`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-[#8E9299]">
                Last synced: {lastUpdated || "Live"}
              </span>

              {onTriggerDeployment && (
                <button
                  type="button"
                  id="btn-gas-deploy-optimal-chain"
                  onClick={onTriggerDeployment}
                  className="px-3 py-1 rounded-md bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <Zap className="w-3 h-3 fill-black" />
                  <span>Deploy Now</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
