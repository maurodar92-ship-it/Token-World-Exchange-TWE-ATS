import React, { useState, useMemo, useRef, useEffect, useId } from "react";
import { TokenRecord, ChainType, NarrativeCategory } from "../types";
import { CHAIN_METADATA } from "../utils/marketData";
import { generateTokenRecord } from "../utils/cryptoGenerators";
import * as d3 from "d3";
import {
  Flame,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  Globe,
  Shield,
  Shuffle,
  Download,
  Search,
  Filter,
  Info,
  ExternalLink,
  Copy,
  Check,
  Maximize2,
  Grid,
  LayoutGrid,
  BarChart2,
  PieChart as PieIcon,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Gauge,
  Sliders,
} from "lucide-react";

export type SimulationHorizon = "24H" | "7D" | "30D" | "90D" | "1Y";
export type MarketRegime = "bull" | "equilibrium" | "bear" | "quantum";
export type ViewMode = "treemap" | "matrix" | "sector" | "chain";
export type PerformanceFilter = "all" | "outperforming" | "underperforming" | "top10";
export type SortOption =
  | "relativeGrowthDesc"
  | "relativeGrowthAsc"
  | "marketCapDesc"
  | "simulatedGrowthDesc"
  | "symbol";

interface PerformanceHeatmapProps {
  tokens: TokenRecord[];
  onSelectToken?: (token: TokenRecord) => void;
}

export interface TokenPerformanceMetric {
  token: TokenRecord;
  marketCap: number;
  portfolioWeight: number; // 0 to 1
  portfolioWeightPct: number; // 0 to 100
  simulatedGrowth: number; // Individual token simulated growth %
  simulatedNewMarketCap: number;
  marketCapDelta: number; // $ change
  portfolioGrowthBenchmark: number; // Portfolio weighted baseline %
  relativeGrowth: number; // simulatedGrowth - portfolioGrowthBenchmark (the core relative metric)
  portfolioContribution: number; // weight * simulatedGrowth
  growthDrivers: string[];
  visuals: {
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
    badgeText: string;
    label: string;
    intensity: number; // -1 to +1
  };
}

// Compact currency formatter
function formatCompactCurrency(val: number): string {
  if (!val || isNaN(val)) return "$0";
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
  return `$${val.toFixed(2)}`;
}

// Compact number formatter
function formatCompactNumber(val: number): string {
  if (!val || isNaN(val)) return "0";
  if (val >= 1e9) return `${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `${(val / 1e6).toFixed(2)}M`;
  if (val >= 1e3) return `${(val / 1e3).toFixed(1)}K`;
  return val.toLocaleString();
}

// Pseudo-random deterministic hash for organic variance
function hashStringToFactor(str: string, seed: number): number {
  let hash = seed * 31;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  // Convert to 0..1
  const normalized = (Math.abs(hash) % 10000) / 10000;
  return normalized;
}

// Color-coding based on relative simulated growth relative to the total portfolio
export function getRelativePerformanceVisuals(relativeGrowth: number) {
  if (relativeGrowth >= 20.0) {
    return {
      bg: "rgba(16, 185, 129, 0.45)",
      border: "#10B981",
      text: "#34D399",
      badgeBg: "bg-emerald-500/20",
      badgeText: "text-emerald-300",
      label: "Super Alpha (≥+20%)",
      intensity: 1.0,
    };
  }
  if (relativeGrowth >= 10.0) {
    return {
      bg: "rgba(5, 150, 105, 0.38)",
      border: "#059669",
      text: "#6EE7B7",
      badgeBg: "bg-emerald-600/20",
      badgeText: "text-emerald-300",
      label: "Strong Alpha (+10% to +20%)",
      intensity: 0.75,
    };
  }
  if (relativeGrowth >= 3.0) {
    return {
      bg: "rgba(4, 120, 87, 0.28)",
      border: "#047857",
      text: "#A7F3D0",
      badgeBg: "bg-emerald-700/20",
      badgeText: "text-emerald-300",
      label: "Outperforming (+3% to +10%)",
      intensity: 0.5,
    };
  }
  if (relativeGrowth >= 0.5) {
    return {
      bg: "rgba(6, 78, 59, 0.22)",
      border: "#065F46",
      text: "#D1FAE5",
      badgeBg: "bg-emerald-800/20",
      badgeText: "text-emerald-400",
      label: "Mild Lead (+0.5% to +3%)",
      intensity: 0.25,
    };
  }
  if (relativeGrowth >= -0.5) {
    return {
      bg: "rgba(30, 41, 59, 0.45)",
      border: "#475569",
      text: "#94A3B8",
      badgeBg: "bg-slate-700/30",
      badgeText: "text-slate-300",
      label: "Neutral / Inline (-0.5% to +0.5%)",
      intensity: 0.0,
    };
  }
  if (relativeGrowth >= -3.0) {
    return {
      bg: "rgba(127, 29, 29, 0.25)",
      border: "#991B1B",
      text: "#FECACA",
      badgeBg: "bg-red-900/20",
      badgeText: "text-red-300",
      label: "Mild Lag (-0.5% to -3%)",
      intensity: -0.25,
    };
  }
  if (relativeGrowth >= -10.0) {
    return {
      bg: "rgba(153, 27, 27, 0.35)",
      border: "#B91C1C",
      text: "#FCA5A5",
      badgeBg: "bg-red-800/25",
      badgeText: "text-red-300",
      label: "Underperforming (-3% to -10%)",
      intensity: -0.5,
    };
  }
  if (relativeGrowth >= -20.0) {
    return {
      bg: "rgba(185, 28, 28, 0.45)",
      border: "#DC2626",
      text: "#F87171",
      badgeBg: "bg-red-700/30",
      badgeText: "text-red-400",
      label: "Heavy Drag (-10% to -20%)",
      intensity: -0.75,
    };
  }
  return {
    bg: "rgba(220, 38, 38, 0.55)",
    border: "#EF4444",
    text: "#EF4444",
    badgeBg: "bg-red-600/35",
    badgeText: "text-red-300",
    label: "Severe Drag (<-20%)",
    intensity: -1.0,
  };
}

export const PerformanceHeatmap: React.FC<PerformanceHeatmapProps> = ({
  tokens: rawTokens,
  onSelectToken,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 900, height: 520 });

  // Simulation controls state
  const [horizon, setHorizon] = useState<SimulationHorizon>("30D");
  const [regime, setRegime] = useState<MarketRegime>("bull");
  const [seed, setSeed] = useState<number>(42);
  const [viewMode, setViewMode] = useState<ViewMode>("treemap");
  const [filterMode, setFilterMode] = useState<PerformanceFilter>("all");
  const [selectedChain, setSelectedChain] = useState<string>("all");
  const [selectedNarrative, setSelectedNarrative] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("relativeGrowthDesc");
  const [inspectedToken, setInspectedToken] = useState<TokenPerformanceMetric | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // ResizeObserver for dynamic treemap layout
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width > 0) {
          // Dynamic height proportional to width
          const calcHeight = Math.max(480, Math.min(680, Math.round(width * 0.55)));
          setContainerSize({ width, height: calcHeight });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Provide a realistic fallback sample portfolio if tokens list is empty
  const activeTokens = useMemo(() => {
    if (rawTokens && rawTokens.length > 0) {
      return rawTokens;
    }
    // Generate an institutional sample portfolio
    const samples: TokenRecord[] = [];
    const chains: ChainType[] = ["ethereum", "solana", "base", "arbitrum", "polygon", "quantum", "cosmos", "bitcoin"];
    for (let i = 1; i <= 24; i++) {
      const chain = chains[(i - 1) % chains.length];
      const rec = generateTokenRecord(i, {
        chains: [chain],
        includeVanity: i % 4 === 0,
        simulatedMarketData: true,
      });
      samples.push(rec);
    }
    return samples;
  }, [rawTokens]);

  // 1. Core Simulation Calculation: Computes token growth, portfolio baseline, and relative growth spread
  const {
    metrics,
    totalPortfolioMarketCap,
    portfolioWeightedGrowth,
    portfolioSimulatedMarketCap,
    portfolioDollarDelta,
    topPerformer,
    topDrag,
    outperformerRatio,
    availableChains,
    availableNarratives,
  } = useMemo(() => {
    // Determine base portfolio valuation
    let sumCurrentMcap = 0;
    const rawMetricsList = activeTokens.map((t) => {
      const cap = t.marketCap > 0 ? t.marketCap : (t.priceUsd || 0.05) * 100_000_000;
      sumCurrentMcap += cap;
      return { token: t, marketCap: cap };
    });

    if (sumCurrentMcap <= 0) sumCurrentMcap = 1_000_000;

    // Regime baseline parameters
    let regimeBaseGrowth = 8.0; // Equilibrium
    let regimeBetaMultiplier = 1.0;
    if (regime === "bull") {
      regimeBaseGrowth = 24.5;
      regimeBetaMultiplier = 1.35;
    } else if (regime === "bear") {
      regimeBaseGrowth = -14.0;
      regimeBetaMultiplier = 0.85;
    } else if (regime === "quantum") {
      regimeBaseGrowth = 15.0;
      regimeBetaMultiplier = 2.1; // High volatility shock
    }

    // Horizon factor
    let horizonFactor = 1.0; // 30D
    if (horizon === "24H") horizonFactor = 0.12;
    else if (horizon === "7D") horizonFactor = 0.38;
    else if (horizon === "90D") horizonFactor = 1.75;
    else if (horizon === "1Y") horizonFactor = 3.1;

    // Pass 1: Compute individual simulated growth rates and total simulated market cap
    let sumSimulatedMcap = 0;
    const preliminaryList = rawMetricsList.map(({ token, marketCap }) => {
      const weight = marketCap / sumCurrentMcap;

      // Factors:
      const growthDrivers: string[] = [];

      // Narrative momentum factor
      let narrativeAlpha = 0;
      if (token.narrative === "quantum_defi") {
        narrativeAlpha = 11.5;
        growthDrivers.push("Quantum-Resistant Lattice Demand (+11.5%)");
      } else if (token.narrative === "ai_agents") {
        narrativeAlpha = 9.8;
        growthDrivers.push("Autonomous Agent Swarm Adoption (+9.8%)");
      } else if (token.narrative === "depin") {
        narrativeAlpha = 7.2;
        growthDrivers.push("DePIN Physical Node Deployment (+7.2%)");
      } else if (token.narrative === "rwa") {
        narrativeAlpha = 5.4;
        growthDrivers.push("Tokenized Treasury & Credit Inflow (+5.4%)");
      } else if (token.narrative === "liquid_restaking") {
        narrativeAlpha = 4.1;
        growthDrivers.push("AVS Staking Restake Multiplier (+4.1%)");
      } else {
        narrativeAlpha = 2.5;
        growthDrivers.push("Sector Organic Expansion (+2.5%)");
      }

      // Security / Audit factor
      let securityAlpha = 0;
      if (token.launchStatus === "Rug-Proof Vault" || token.launchStatus === "Audited") {
        securityAlpha = 5.2;
        growthDrivers.push(`Verified ${token.auditFirm || "Smart Contract"} Audit (+5.2%)`);
      } else if (token.launchStatus === "Liquidity Locked") {
        securityAlpha = 3.0;
        growthDrivers.push("Locked AMM Liquidity Reserves (+3.0%)");
      } else if (token.launchStatus === "Paused") {
        securityAlpha = -18.5;
        growthDrivers.push("Governance Pause Contract Penalty (-18.5%)");
      }

      // Security score adjustment
      const scoreAdj = ((token.securityScore || 85) - 80) * 0.25;
      if (Math.abs(scoreAdj) > 0.5) {
        growthDrivers.push(`Security Rating Score ${token.securityScore} (${scoreAdj > 0 ? "+" : ""}${scoreAdj.toFixed(1)}%)`);
      }

      // Chain ecosystem multiplier
      let chainAlpha = 0;
      if (token.chain === "base" || token.chain === "solana") {
        chainAlpha = 4.2;
        growthDrivers.push(`${token.chain.toUpperCase()} Low-Fee TPS Throughput (+4.2%)`);
      } else if (token.chain === "quantum") {
        chainAlpha = 6.8;
        growthDrivers.push("Post-Quantum Kyber Execution Mesh (+6.8%)");
      }

      // Vanity prefix bonus
      if (token.isVanity) {
        growthDrivers.push("Institutional Vanity Prefix Premium (+2.5%)");
      }
      const vanityAlpha = token.isVanity ? 2.5 : 0;

      // Deterministic idiosyncratic pseudo-random dispersion
      const noiseSeed = hashStringToFactor(token.id + (token.contractAddress || ""), seed);
      // noise in range -12% to +14%
      const idiosyncraticNoise = (noiseSeed * 26 - 12) * regimeBetaMultiplier;

      // Aggregate token raw growth percentage
      const rawGrowth =
        (regimeBaseGrowth +
          narrativeAlpha +
          securityAlpha +
          scoreAdj +
          chainAlpha +
          vanityAlpha +
          idiosyncraticNoise) *
        horizonFactor;

      const simulatedGrowth = Number(rawGrowth.toFixed(2));
      const simulatedNewMarketCap = Math.max(10_000, Math.round(marketCap * (1 + simulatedGrowth / 100)));
      const marketCapDelta = simulatedNewMarketCap - marketCap;

      sumSimulatedMcap += simulatedNewMarketCap;

      return {
        token,
        marketCap,
        portfolioWeight: weight,
        portfolioWeightPct: Number((weight * 100).toFixed(2)),
        simulatedGrowth,
        simulatedNewMarketCap,
        marketCapDelta,
        growthDrivers,
      };
    });

    // 2. Portfolio-level weighted benchmark growth rate
    const portfolioDollarDelta = sumSimulatedMcap - sumCurrentMcap;
    const portfolioWeightedGrowth = Number(
      ((portfolioDollarDelta / sumCurrentMcap) * 100).toFixed(2)
    );

    // Pass 2: Calculate relative growth vs total portfolio (Alpha / Spread)
    const computedMetrics: TokenPerformanceMetric[] = preliminaryList.map((item) => {
      // Relative growth is the exact difference between this token's growth and the total portfolio benchmark
      const relativeGrowth = Number((item.simulatedGrowth - portfolioWeightedGrowth).toFixed(2));
      const portfolioContribution = Number((item.portfolioWeight * item.simulatedGrowth).toFixed(2));
      const visuals = getRelativePerformanceVisuals(relativeGrowth);

      return {
        ...item,
        portfolioGrowthBenchmark: portfolioWeightedGrowth,
        relativeGrowth,
        portfolioContribution,
        visuals,
      };
    });

    // Sort to find top and bottom performers
    const sortedByRelative = [...computedMetrics].sort((a, b) => b.relativeGrowth - a.relativeGrowth);
    const topPerformer = sortedByRelative[0] || null;
    const topDrag = sortedByRelative[sortedByRelative.length - 1] || null;

    const outperformingCount = computedMetrics.filter((m) => m.relativeGrowth > 0).length;
    const outperformerRatio = computedMetrics.length
      ? Math.round((outperformingCount / computedMetrics.length) * 100)
      : 0;

    // Available chains & narratives for filters
    const chainsSet = new Set<string>();
    const narrativesSet = new Set<string>();
    activeTokens.forEach((t) => {
      chainsSet.add(t.chain);
      narrativesSet.add(t.narrative);
    });

    return {
      metrics: computedMetrics,
      totalPortfolioMarketCap: sumCurrentMcap,
      portfolioWeightedGrowth,
      portfolioSimulatedMarketCap: sumSimulatedMcap,
      portfolioDollarDelta,
      topPerformer,
      topDrag,
      outperformerRatio,
      availableChains: Array.from(chainsSet),
      availableNarratives: Array.from(narrativesSet),
    };
  }, [activeTokens, horizon, regime, seed]);

  // Filtered and sorted metrics
  const displayedMetrics = useMemo(() => {
    let list = [...metrics];

    // Filter by Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.token.symbol.toLowerCase().includes(q) ||
          m.token.name.toLowerCase().includes(q) ||
          m.token.contractAddress.toLowerCase().includes(q)
      );
    }

    // Filter by Chain
    if (selectedChain !== "all") {
      list = list.filter((m) => m.token.chain === selectedChain);
    }

    // Filter by Narrative
    if (selectedNarrative !== "all") {
      list = list.filter((m) => m.token.narrative === selectedNarrative);
    }

    // Filter by Outperformers / Underperformers
    if (filterMode === "outperforming") {
      list = list.filter((m) => m.relativeGrowth > 0);
    } else if (filterMode === "underperforming") {
      list = list.filter((m) => m.relativeGrowth < 0);
    } else if (filterMode === "top10") {
      list = [...list].sort((a, b) => b.marketCap - a.marketCap).slice(0, 10);
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === "relativeGrowthDesc") return b.relativeGrowth - a.relativeGrowth;
      if (sortBy === "relativeGrowthAsc") return a.relativeGrowth - b.relativeGrowth;
      if (sortBy === "marketCapDesc") return b.marketCap - a.marketCap;
      if (sortBy === "simulatedGrowthDesc") return b.simulatedGrowth - a.simulatedGrowth;
      if (sortBy === "symbol") return a.token.symbol.localeCompare(b.token.symbol);
      return 0;
    });

    return list;
  }, [metrics, searchQuery, selectedChain, selectedNarrative, filterMode, sortBy]);

  // Compute D3 squarified treemap layout when in treemap mode
  const treemapNodes = useMemo(() => {
    if (viewMode !== "treemap" || displayedMetrics.length === 0) return [];

    const rootData = {
      name: "Portfolio",
      children: displayedMetrics.map((m) => ({
        ...m,
        // D3 expects numeric value for squarified tile sizing
        value: Math.max(1, m.marketCap),
      })),
    };

    const root = d3
      .hierarchy(rootData)
      .sum((d: any) => d.value)
      .sort((a: any, b: any) => (b.value || 0) - (a.value || 0));

    const treemapLayout = d3
      .treemap<any>()
      .size([containerSize.width, containerSize.height])
      .paddingOuter(4)
      .paddingInner(3)
      .round(true);

    treemapLayout(root);

    return (root.leaves() as any[]).map((leaf) => {
      const metric = leaf.data as TokenPerformanceMetric;
      return {
        metric,
        x0: leaf.x0,
        y0: leaf.y0,
        x1: leaf.x1,
        y1: leaf.y1,
        width: Math.max(0, leaf.x1 - leaf.x0),
        height: Math.max(0, leaf.y1 - leaf.y0),
      };
    });
  }, [viewMode, displayedMetrics, containerSize]);

  // Trigger organic re-simulation
  const handleResimulate = () => {
    setIsSimulating(true);
    setSeed((prev) => prev + Math.floor(Math.random() * 1000 + 1));
    setTimeout(() => setIsSimulating(false), 300);
  };

  // Copy address helper
  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 1800);
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      "Token Symbol",
      "Token Name",
      "Contract Address",
      "Chain",
      "Token Standard",
      "Launch Status",
      "Current Market Cap (USD)",
      "Portfolio Weight (%)",
      "Simulated Token Growth (%)",
      "Portfolio Benchmark Growth (%)",
      "Relative Growth vs Portfolio (Alpha %)",
      "Projected Market Cap (USD)",
      "Projected Value Delta (USD)",
      "Primary Growth Drivers",
    ];

    const rows = displayedMetrics.map((m) => [
      `"${m.token.symbol}"`,
      `"${m.token.name}"`,
      `"${m.token.contractAddress}"`,
      `"${m.token.chain}"`,
      `"${m.token.tokenStandard}"`,
      `"${m.token.launchStatus}"`,
      m.marketCap,
      m.portfolioWeightPct,
      m.simulatedGrowth,
      m.portfolioGrowthBenchmark,
      m.relativeGrowth,
      m.simulatedNewMarketCap,
      m.marketCapDelta,
      `"${m.growthDrivers.join("; ")}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `token_world_performance_heatmap_${horizon}_${regime}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Groupings for sector and chain view modes
  const groupedBySector = useMemo(() => {
    const map = new Map<string, TokenPerformanceMetric[]>();
    displayedMetrics.forEach((m) => {
      const narrative = m.token.narrative;
      if (!map.has(narrative)) map.set(narrative, []);
      map.get(narrative)!.push(m);
    });
    return Array.from(map.entries()).map(([sector, items]) => {
      const avgRelative = Number(
        (items.reduce((acc, i) => acc + i.relativeGrowth, 0) / items.length).toFixed(2)
      );
      const sectorMcap = items.reduce((acc, i) => acc + i.marketCap, 0);
      return { sector, items, avgRelative, sectorMcap };
    });
  }, [displayedMetrics]);

  const groupedByChain = useMemo(() => {
    const map = new Map<string, TokenPerformanceMetric[]>();
    displayedMetrics.forEach((m) => {
      const chain = m.token.chain;
      if (!map.has(chain)) map.set(chain, []);
      map.get(chain)!.push(m);
    });
    return Array.from(map.entries()).map(([chain, items]) => {
      const avgRelative = Number(
        (items.reduce((acc, i) => acc + i.relativeGrowth, 0) / items.length).toFixed(2)
      );
      const chainMcap = items.reduce((acc, i) => acc + i.marketCap, 0);
      return { chain, items, avgRelative, chainMcap };
    });
  }, [displayedMetrics]);

  return (
    <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 space-y-5 shadow-2xl">
      {/* 1. Header Banner & Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1F1F23]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Flame className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight uppercase font-mono">
                  Performance Heatmap & Relative Portfolio Alpha
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F27D26]/10 text-[#F27D26] border border-[#F27D26]/30">
                  Relative Valuation Engine
                </span>
              </div>
              <p className="text-xs text-[#8E9299]">
                Color-coded visualization benchmarking simulated market cap growth of each token against the value-weighted total portfolio growth.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleResimulate}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A0A0C] border border-[#1F1F23] hover:border-[#F27D26] text-xs font-mono text-white transition-all cursor-pointer ${
              isSimulating ? "animate-pulse border-[#F27D26]" : ""
            }`}
            title="Re-run Monte Carlo simulation with organic entropy"
          >
            <Shuffle className={`w-3.5 h-3.5 text-[#F27D26] ${isSimulating ? "rotate-180" : ""}`} />
            <span>Re-Simulate Growth</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A0A0C] border border-[#1F1F23] hover:border-emerald-500 text-xs font-mono text-emerald-400 transition-all cursor-pointer"
            title="Download formatted Heatmap dataset as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Heatmap CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Institutional KPI Strip: Portfolio Benchmark Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#0A0A0C] p-3 rounded-lg border border-[#1F1F23] space-y-1">
          <span className="text-[10px] uppercase font-mono text-[#8E9299] block">Total Portfolio MCap</span>
          <div className="text-base font-bold font-mono text-white">
            {formatCompactCurrency(totalPortfolioMarketCap)}
          </div>
          <span className="text-[10px] text-[#8E9299] block font-mono">
            {activeTokens.length} Token Assets
          </span>
        </div>

        <div className="bg-[#0A0A0C] p-3 rounded-lg border border-[#1F1F23] space-y-1">
          <span className="text-[10px] uppercase font-mono text-[#8E9299] block">
            Portfolio Growth Benchmark
          </span>
          <div
            className={`text-base font-bold font-mono flex items-center gap-1 ${
              portfolioWeightedGrowth >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {portfolioWeightedGrowth >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-400 inline" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400 inline" />
            )}
            <span>
              {portfolioWeightedGrowth >= 0 ? `+${portfolioWeightedGrowth}%` : `${portfolioWeightedGrowth}%`}
            </span>
          </div>
          <span className="text-[10px] text-[#8E9299] block font-mono">
            {horizon} Weighted Base
          </span>
        </div>

        <div className="bg-[#0A0A0C] p-3 rounded-lg border border-[#1F1F23] space-y-1">
          <span className="text-[10px] uppercase font-mono text-[#8E9299] block">Simulated Expansion</span>
          <div
            className={`text-base font-bold font-mono ${
              portfolioDollarDelta >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {portfolioDollarDelta >= 0 ? `+${formatCompactCurrency(portfolioDollarDelta)}` : formatCompactCurrency(portfolioDollarDelta)}
          </div>
          <span className="text-[10px] text-[#8E9299] block font-mono">
            Proj: {formatCompactCurrency(portfolioSimulatedMarketCap)}
          </span>
        </div>

        <div className="bg-[#0A0A0C] p-3 rounded-lg border border-[#1F1F23] space-y-1">
          <span className="text-[10px] uppercase font-mono text-[#8E9299] block">Top Outperformer</span>
          {topPerformer ? (
            <div>
              <div className="text-base font-bold font-mono text-emerald-400 truncate">
                {topPerformer.token.symbol}
              </div>
              <span className="text-[10px] font-mono text-emerald-300 block">
                +{topPerformer.relativeGrowth}% vs Port
              </span>
            </div>
          ) : (
            <span className="text-xs text-[#8E9299]">-</span>
          )}
        </div>

        <div className="bg-[#0A0A0C] p-3 rounded-lg border border-[#1F1F23] space-y-1">
          <span className="text-[10px] uppercase font-mono text-[#8E9299] block">Greatest Portfolio Drag</span>
          {topDrag ? (
            <div>
              <div className="text-base font-bold font-mono text-red-400 truncate">
                {topDrag.token.symbol}
              </div>
              <span className="text-[10px] font-mono text-red-300 block">
                {topDrag.relativeGrowth}% vs Port
              </span>
            </div>
          ) : (
            <span className="text-xs text-[#8E9299]">-</span>
          )}
        </div>

        <div className="bg-[#0A0A0C] p-3 rounded-lg border border-[#1F1F23] space-y-1">
          <span className="text-[10px] uppercase font-mono text-[#8E9299] block">Alpha Breadth</span>
          <div className="text-base font-bold font-mono text-cyan-400">
            {outperformerRatio}%
          </div>
          <span className="text-[10px] text-[#8E9299] block font-mono">
            Beating Portfolio
          </span>
        </div>
      </div>

      {/* 3. Heatmap Spectrum Legend Bar */}
      <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-3 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] font-mono text-[#8E9299] gap-1">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#F27D26]" />
            <span className="text-white font-semibold">Relative Performance Color Legend:</span>
            <span>Simulated Token Growth vs Total Portfolio Baseline ({portfolioWeightedGrowth}%)</span>
          </div>
          <span className="text-[#8E9299]">
            Scale: <span className="text-red-400 font-bold">Lagging / Drag</span> ➔ <span className="text-slate-400">Neutral (0%)</span> ➔ <span className="text-emerald-400 font-bold">Leading / Alpha</span>
          </span>
        </div>

        {/* Visual gradient bar with segment badges */}
        <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-9 gap-1 text-[10px] font-mono text-center">
          <div className="p-1 rounded bg-red-600/40 border border-red-500 text-red-200">
            &lt; -20%
            <span className="block text-[8px] opacity-75">Severe Drag</span>
          </div>
          <div className="p-1 rounded bg-red-700/35 border border-red-600 text-red-300">
            -20% to -10%
            <span className="block text-[8px] opacity-75">Heavy Drag</span>
          </div>
          <div className="p-1 rounded bg-red-800/30 border border-red-700 text-red-300">
            -10% to -3%
            <span className="block text-[8px] opacity-75">Underperforming</span>
          </div>
          <div className="p-1 rounded bg-red-900/25 border border-red-800 text-red-300">
            -3% to -0.5%
            <span className="block text-[8px] opacity-75">Mild Lag</span>
          </div>
          <div className="p-1 rounded bg-slate-800/60 border border-slate-600 text-slate-300">
            ±0.5%
            <span className="block text-[8px] opacity-75">Benchmark</span>
          </div>
          <div className="p-1 rounded bg-emerald-900/25 border border-emerald-800 text-emerald-300">
            +0.5% to +3%
            <span className="block text-[8px] opacity-75">Mild Lead</span>
          </div>
          <div className="p-1 rounded bg-emerald-800/30 border border-emerald-700 text-emerald-300">
            +3% to +10%
            <span className="block text-[8px] opacity-75">Outperforming</span>
          </div>
          <div className="p-1 rounded bg-emerald-700/35 border border-emerald-600 text-emerald-300">
            +10% to +20%
            <span className="block text-[8px] opacity-75">Strong Alpha</span>
          </div>
          <div className="p-1 rounded bg-emerald-600/40 border border-emerald-500 text-emerald-200">
            &ge; +20%
            <span className="block text-[8px] opacity-75">Super Alpha</span>
          </div>
        </div>
      </div>

      {/* 4. Interactive Simulation & Filter Controls */}
      <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-3 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Market Regime Knobs */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono text-[#8E9299] flex items-center gap-1">
              <Sliders className="w-3 h-3 text-[#F27D26]" />
              <span>Regime:</span>
            </span>
            <div className="flex items-center gap-1 bg-[#16161A] p-0.5 rounded border border-[#1F1F23]">
              <button
                type="button"
                onClick={() => setRegime("bull")}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all cursor-pointer ${
                  regime === "bull"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold"
                    : "text-[#8E9299] hover:text-white"
                }`}
              >
                🚀 Bull Expansion
              </button>
              <button
                type="button"
                onClick={() => setRegime("equilibrium")}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all cursor-pointer ${
                  regime === "equilibrium"
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/40 font-bold"
                    : "text-[#8E9299] hover:text-white"
                }`}
              >
                ⚖️ Equilibrium
              </button>
              <button
                type="button"
                onClick={() => setRegime("bear")}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all cursor-pointer ${
                  regime === "bear"
                    ? "bg-red-500/20 text-red-400 border border-red-500/40 font-bold"
                    : "text-[#8E9299] hover:text-white"
                }`}
              >
                📉 Stress Test
              </button>
              <button
                type="button"
                onClick={() => setRegime("quantum")}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all cursor-pointer ${
                  regime === "quantum"
                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/40 font-bold"
                    : "text-[#8E9299] hover:text-white"
                }`}
              >
                ⚡ High Volatility
              </button>
            </div>

            {/* Time Horizon */}
            <div className="flex items-center gap-1 ml-0 sm:ml-2">
              <span className="text-[11px] font-mono text-[#8E9299]">Horizon:</span>
              <div className="flex items-center bg-[#16161A] p-0.5 rounded border border-[#1F1F23]">
                {(["24H", "7D", "30D", "90D", "1Y"] as SimulationHorizon[]).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHorizon(h)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-all ${
                      horizon === h
                        ? "bg-[#F27D26] text-black font-bold"
                        : "text-[#8E9299] hover:text-white"
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* View Mode Buttons */}
          <div className="flex items-center gap-1 self-start lg:self-auto bg-[#16161A] p-0.5 rounded border border-[#1F1F23]">
            <button
              type="button"
              onClick={() => setViewMode("treemap")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono transition-all cursor-pointer ${
                viewMode === "treemap"
                  ? "bg-[#0A0A0C] text-white border border-[#F27D26]"
                  : "text-[#8E9299] hover:text-white"
              }`}
              title="Weighted Treemap (Finviz style by market cap)"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>Treemap</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("matrix")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono transition-all cursor-pointer ${
                viewMode === "matrix"
                  ? "bg-[#0A0A0C] text-white border border-[#F27D26]"
                  : "text-[#8E9299] hover:text-white"
              }`}
              title="Uniform Matrix Grid Cards"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Matrix</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("sector")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono transition-all cursor-pointer ${
                viewMode === "sector"
                  ? "bg-[#0A0A0C] text-white border border-[#F27D26]"
                  : "text-[#8E9299] hover:text-white"
              }`}
              title="Grouped by Narrative Sector"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Sectors</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("chain")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono transition-all cursor-pointer ${
                viewMode === "chain"
                  ? "bg-[#0A0A0C] text-white border border-[#F27D26]"
                  : "text-[#8E9299] hover:text-white"
              }`}
              title="Grouped by Blockchain Network"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Chains</span>
            </button>
          </div>
        </div>

        {/* Secondary Filter & Search Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#1F1F23]">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[180px]">
              <Search className="w-3 h-3 text-[#8E9299] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search symbol, name, 0x..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#16161A] border border-[#1F1F23] rounded pl-7 pr-2 py-1 text-xs font-mono text-white placeholder-[#555] focus:outline-none focus:border-[#F27D26]"
              />
            </div>

            {/* Performance Filter Buttons */}
            <div className="flex items-center gap-1 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className={`px-2 py-1 rounded border cursor-pointer ${
                  filterMode === "all"
                    ? "bg-[#16161A] text-white border-[#F27D26]"
                    : "border-transparent text-[#8E9299] hover:text-white"
                }`}
              >
                All ({metrics.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("outperforming")}
                className={`px-2 py-1 rounded border cursor-pointer ${
                  filterMode === "outperforming"
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                    : "border-transparent text-[#8E9299] hover:text-emerald-400"
                }`}
              >
                Alpha Leads ({metrics.filter((m) => m.relativeGrowth > 0).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("underperforming")}
                className={`px-2 py-1 rounded border cursor-pointer ${
                  filterMode === "underperforming"
                    ? "bg-red-500/20 text-red-400 border-red-500/40"
                    : "border-transparent text-[#8E9299] hover:text-red-400"
                }`}
              >
                Portfolio Drags ({metrics.filter((m) => m.relativeGrowth < 0).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("top10")}
                className={`px-2 py-1 rounded border cursor-pointer ${
                  filterMode === "top10"
                    ? "bg-blue-500/20 text-blue-400 border-blue-500/40"
                    : "border-transparent text-[#8E9299] hover:text-blue-400"
                }`}
              >
                Top 10 Weight
              </button>
            </div>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-[#8E9299] text-[11px]">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Sort heatmap tokens by metric"
              className="bg-[#16161A] border border-[#1F1F23] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-[#F27D26]"
            >
              <option value="relativeGrowthDesc">Relative Alpha (Highest ➔ Lowest)</option>
              <option value="relativeGrowthAsc">Relative Drag (Lowest ➔ Highest)</option>
              <option value="marketCapDesc">Portfolio Market Cap (Largest First)</option>
              <option value="simulatedGrowthDesc">Individual Token Growth %</option>
              <option value="symbol">Token Symbol (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. VISUALIZATION CANVAS */}
      <div
        ref={containerRef}
        className="w-full relative min-h-[460px] bg-[#0A0A0C] border border-[#1F1F23] rounded-xl overflow-hidden p-2"
      >
        {displayedMetrics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
            <Filter className="w-8 h-8 text-[#555]" />
            <div className="text-sm font-mono text-white">No tokens matched your active criteria</div>
            <p className="text-xs text-[#8E9299] max-w-sm">
              Adjust your search query or reset the filter to display tokens in the performance heatmap.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setFilterMode("all");
                setSelectedChain("all");
                setSelectedNarrative("all");
              }}
              className="px-3 py-1.5 rounded bg-[#16161A] border border-[#1F1F23] hover:border-[#F27D26] text-xs font-mono text-white cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : viewMode === "treemap" ? (
          /* SQUARIFIED TREEMAP (Area = Portfolio Weight, Color = Relative Growth vs Portfolio) */
          <div
            className="relative w-full overflow-hidden rounded-lg select-none"
            style={{ height: `${containerSize.height}px` }}
          >
            {treemapNodes.map(({ metric, x0, y0, width, height }) => {
              const isLead = metric.relativeGrowth >= 0;
              const isLarge = width >= 110 && height >= 80;
              const isMedium = width >= 70 && height >= 50;

              return (
                <div
                  key={metric.token.id}
                  onClick={() => {
                    setInspectedToken(metric);
                    if (onSelectToken) onSelectToken(metric.token);
                  }}
                  style={{
                    position: "absolute",
                    left: `${x0}px`,
                    top: `${y0}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                    backgroundColor: metric.visuals.bg,
                    borderColor: metric.visuals.border,
                  }}
                  className="border rounded transition-all duration-150 p-1.5 flex flex-col justify-between overflow-hidden cursor-pointer hover:scale-[1.01] hover:z-20 hover:shadow-xl hover:brightness-125"
                  title={`${metric.token.symbol} (${metric.token.name})
Simulated Growth: ${metric.simulatedGrowth > 0 ? "+" : ""}${metric.simulatedGrowth}%
Portfolio Benchmark: ${metric.portfolioGrowthBenchmark}%
Relative Alpha: ${isLead ? "+" : ""}${metric.relativeGrowth}% vs Portfolio
Market Cap: ${formatCompactCurrency(metric.marketCap)} (${metric.portfolioWeightPct}%)`}
                >
                  {/* Top Bar: Symbol & Chain */}
                  <div className="flex items-center justify-between gap-1 overflow-hidden">
                    <span className="font-mono font-bold text-xs text-white truncate drop-shadow-sm">
                      {metric.token.symbol}
                    </span>
                    {isLarge && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-black/40 text-[#8E9299] font-mono border border-white/10 truncate">
                        {metric.token.chain}
                      </span>
                    )}
                  </div>

                  {/* Center: The Core Relative Metric */}
                  <div className="text-center my-auto overflow-hidden">
                    <div
                      className={`font-mono font-bold tracking-tight drop-shadow-md ${
                        isLarge ? "text-sm" : isMedium ? "text-xs" : "text-[10px]"
                      }`}
                      style={{ color: metric.visuals.text }}
                    >
                      {isLead ? `+${metric.relativeGrowth}%` : `${metric.relativeGrowth}%`}
                    </div>
                    {isLarge && (
                      <span className="text-[9px] font-mono text-white/80 block uppercase tracking-wider">
                        vs Port ({metric.simulatedGrowth > 0 ? "+" : ""}{metric.simulatedGrowth}%)
                      </span>
                    )}
                  </div>

                  {/* Bottom: Market Cap & Weight */}
                  {isMedium && (
                    <div className="flex items-center justify-between text-[9px] font-mono text-white/80 border-t border-black/30 pt-0.5">
                      <span className="truncate">{formatCompactCurrency(metric.marketCap)}</span>
                      <span className="text-white/60">{metric.portfolioWeightPct}%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : viewMode === "matrix" ? (
          /* UNIFORM DENSE GRID MATRIX */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 p-1">
            {displayedMetrics.map((metric) => {
              const isLead = metric.relativeGrowth >= 0;
              return (
                <div
                  key={metric.token.id}
                  onClick={() => {
                    setInspectedToken(metric);
                    if (onSelectToken) onSelectToken(metric.token);
                  }}
                  style={{
                    backgroundColor: metric.visuals.bg,
                    borderColor: metric.visuals.border,
                  }}
                  className="border rounded-lg p-3 space-y-2 hover:scale-[1.01] hover:brightness-125 transition-all cursor-pointer shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-white text-sm">
                        {metric.token.symbol}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/40 text-[#8E9299] font-mono border border-[#1F1F23]">
                        {metric.token.chain}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-[#8E9299]">
                      {metric.portfolioWeightPct}% Port
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <div>
                      <span className="text-[9px] text-[#8E9299] block font-mono">Relative Spread</span>
                      <span
                        className="text-base font-bold font-mono"
                        style={{ color: metric.visuals.text }}
                      >
                        {isLead ? `+${metric.relativeGrowth}%` : `${metric.relativeGrowth}%`}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-[#8E9299] block font-mono">Simulated Token</span>
                      <span className="text-xs font-mono text-white font-semibold">
                        {metric.simulatedGrowth > 0 ? `+${metric.simulatedGrowth}%` : `${metric.simulatedGrowth}%`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-[#8E9299] pt-1 border-t border-black/30">
                    <span>MCap: {formatCompactCurrency(metric.marketCap)}</span>
                    <span className="text-white">Proj: {formatCompactCurrency(metric.simulatedNewMarketCap)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === "sector" ? (
          /* GROUPED BY NARRATIVE SECTOR */
          <div className="space-y-4 p-1">
            {groupedBySector.map(({ sector, items, avgRelative, sectorMcap }) => {
              const isSectorLead = avgRelative >= 0;
              return (
                <div key={sector} className="bg-[#16161A] border border-[#1F1F23] rounded-lg p-3 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-[#1F1F23]">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#F27D26]" />
                      <span className="font-mono font-bold text-sm text-white uppercase">
                        {sector.replace("_", " ")}
                      </span>
                      <span className="text-xs font-mono text-[#8E9299]">
                        ({items.length} tokens • {formatCompactCurrency(sectorMcap)})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[#8E9299]">Sector Relative Avg:</span>
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                          isSectorLead
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-red-500/20 text-red-300 border border-red-500/30"
                        }`}
                      >
                        {isSectorLead ? `+${avgRelative}%` : `${avgRelative}%`} vs Portfolio
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-1">
                    {items.map((metric) => (
                      <div
                        key={metric.token.id}
                        onClick={() => setInspectedToken(metric)}
                        style={{
                          backgroundColor: metric.visuals.bg,
                          borderColor: metric.visuals.border,
                        }}
                        className="border rounded p-2 text-center hover:brightness-125 cursor-pointer transition-all"
                      >
                        <span className="font-mono font-bold text-xs text-white block truncate">
                          {metric.token.symbol}
                        </span>
                        <span
                          className="font-mono font-bold text-xs block"
                          style={{ color: metric.visuals.text }}
                        >
                          {metric.relativeGrowth >= 0 ? `+${metric.relativeGrowth}%` : `${metric.relativeGrowth}%`}
                        </span>
                        <span className="text-[9px] font-mono text-[#8E9299] block mt-0.5">
                          {formatCompactCurrency(metric.marketCap)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* GROUPED BY BLOCKCHAIN NETWORK */
          <div className="space-y-4 p-1">
            {groupedByChain.map(({ chain, items, avgRelative, chainMcap }) => {
              const isChainLead = avgRelative >= 0;
              return (
                <div key={chain} className="bg-[#16161A] border border-[#1F1F23] rounded-lg p-3 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-[#1F1F23]">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-[#F27D26]" />
                      <span className="font-mono font-bold text-sm text-white uppercase">
                        {chain} Network
                      </span>
                      <span className="text-xs font-mono text-[#8E9299]">
                        ({items.length} tokens • {formatCompactCurrency(chainMcap)})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[#8E9299]">Chain Relative Avg:</span>
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                          isChainLead
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-red-500/20 text-red-300 border border-red-500/30"
                        }`}
                      >
                        {isChainLead ? `+${avgRelative}%` : `${avgRelative}%`} vs Portfolio
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-1">
                    {items.map((metric) => (
                      <div
                        key={metric.token.id}
                        onClick={() => setInspectedToken(metric)}
                        style={{
                          backgroundColor: metric.visuals.bg,
                          borderColor: metric.visuals.border,
                        }}
                        className="border rounded p-2 text-center hover:brightness-125 cursor-pointer transition-all"
                      >
                        <span className="font-mono font-bold text-xs text-white block truncate">
                          {metric.token.symbol}
                        </span>
                        <span
                          className="font-mono font-bold text-xs block"
                          style={{ color: metric.visuals.text }}
                        >
                          {metric.relativeGrowth >= 0 ? `+${metric.relativeGrowth}%` : `${metric.relativeGrowth}%`}
                        </span>
                        <span className="text-[9px] font-mono text-[#8E9299] block mt-0.5">
                          {formatCompactCurrency(metric.marketCap)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. MODAL INSPECTOR: Detailed Breakdown of Selected Token */}
      {inspectedToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl max-w-xl w-full p-5 space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setInspectedToken(null)}
              className="absolute right-4 top-4 text-[#8E9299] hover:text-white p-1 rounded hover:bg-[#1F1F23] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-lg border flex items-center justify-center font-mono font-bold text-lg"
                style={{
                  backgroundColor: inspectedToken.visuals.bg,
                  borderColor: inspectedToken.visuals.border,
                  color: inspectedToken.visuals.text,
                }}
              >
                {inspectedToken.token.symbol.slice(0, 3)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-bold text-white font-mono">
                    {inspectedToken.token.name} ({inspectedToken.token.symbol})
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-black/50 text-[#F27D26] border border-[#1F1F23]">
                    {inspectedToken.token.chain.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-[#8E9299] mt-0.5">
                  <span className="truncate max-w-[200px]">
                    {inspectedToken.token.contractAddress}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(inspectedToken.token.contractAddress)}
                    className="text-[#F27D26] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedAddress === inspectedToken.token.contractAddress ? (
                      <Check className="w-3 h-3 text-green-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedAddress === inspectedToken.token.contractAddress ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Core Relative Benchmark Comparison Box */}
            <div
              className="p-3.5 rounded-lg border space-y-2"
              style={{
                backgroundColor: inspectedToken.visuals.bg,
                borderColor: inspectedToken.visuals.border,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-white font-semibold">
                  Relative Growth vs Total Portfolio
                </span>
                <span
                  className="text-lg font-mono font-bold"
                  style={{ color: inspectedToken.visuals.text }}
                >
                  {inspectedToken.relativeGrowth >= 0
                    ? `+${inspectedToken.relativeGrowth}% Alpha`
                    : `${inspectedToken.relativeGrowth}% Drag`}
                </span>
              </div>

              {/* Head-to-Head Visual Comparison */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-black/30">
                <div className="bg-black/30 p-2.5 rounded border border-white/10 space-y-0.5">
                  <span className="text-[10px] text-[#8E9299] font-mono block">Simulated Token Growth</span>
                  <span className="text-base font-bold font-mono text-white">
                    {inspectedToken.simulatedGrowth >= 0
                      ? `+${inspectedToken.simulatedGrowth}%`
                      : `${inspectedToken.simulatedGrowth}%`}
                  </span>
                  <span className="text-[10px] text-[#8E9299] block font-mono">
                    Timeframe: {horizon}
                  </span>
                </div>
                <div className="bg-black/30 p-2.5 rounded border border-white/10 space-y-0.5">
                  <span className="text-[10px] text-[#8E9299] font-mono block">Portfolio Weighted Baseline</span>
                  <span className="text-base font-bold font-mono text-cyan-400">
                    {portfolioWeightedGrowth >= 0
                      ? `+${portfolioWeightedGrowth}%`
                      : `${portfolioWeightedGrowth}%`}
                  </span>
                  <span className="text-[10px] text-[#8E9299] block font-mono">
                    Market Cap Weighted Average
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Waterfall Metrics */}
            <div className="grid grid-cols-3 gap-2.5 text-xs font-mono">
              <div className="bg-[#0A0A0C] p-2.5 rounded border border-[#1F1F23]">
                <span className="text-[10px] text-[#8E9299] block">Current Market Cap</span>
                <span className="font-bold text-white text-sm">
                  {formatCompactCurrency(inspectedToken.marketCap)}
                </span>
                <span className="text-[10px] text-[#8E9299] block mt-0.5">
                  {inspectedToken.portfolioWeightPct}% of portfolio
                </span>
              </div>
              <div className="bg-[#0A0A0C] p-2.5 rounded border border-[#1F1F23]">
                <span className="text-[10px] text-[#8E9299] block">Simulated Expansion</span>
                <span
                  className={`font-bold text-sm ${
                    inspectedToken.marketCapDelta >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {inspectedToken.marketCapDelta >= 0
                    ? `+${formatCompactCurrency(inspectedToken.marketCapDelta)}`
                    : formatCompactCurrency(inspectedToken.marketCapDelta)}
                </span>
                <span className="text-[10px] text-[#8E9299] block mt-0.5">Dollar Value Delta</span>
              </div>
              <div className="bg-[#0A0A0C] p-2.5 rounded border border-[#1F1F23]">
                <span className="text-[10px] text-[#8E9299] block">Projected MCap</span>
                <span className="font-bold text-white text-sm">
                  {formatCompactCurrency(inspectedToken.simulatedNewMarketCap)}
                </span>
                <span className="text-[10px] text-emerald-400 block mt-0.5">
                  {regime.toUpperCase()} Model
                </span>
              </div>
            </div>

            {/* Growth Catalysts / Drivers */}
            <div className="space-y-1.5 bg-[#0A0A0C] p-3 rounded-lg border border-[#1F1F23]">
              <span className="text-[11px] font-mono text-[#8E9299] uppercase block font-semibold">
                Simulated Valuation Catalysts & Factor Loadings:
              </span>
              <div className="space-y-1">
                {inspectedToken.growthDrivers.map((driver, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-xs font-mono text-[#E0E0E0] bg-[#16161A] px-2.5 py-1 rounded border border-[#1F1F23]"
                  >
                    <Sparkles className="w-3 h-3 text-[#F27D26] shrink-0" />
                    <span>{driver}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Metadata Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-[#1F1F23] text-[11px] font-mono text-[#8E9299]">
              <div>
                Standard: <strong className="text-white">{inspectedToken.token.tokenStandard}</strong> | Status:{" "}
                <strong className="text-white">{inspectedToken.token.launchStatus}</strong>
              </div>
              <button
                type="button"
                onClick={() => setInspectedToken(null)}
                className="px-3 py-1 rounded bg-[#0A0A0C] border border-[#1F1F23] hover:text-white cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
