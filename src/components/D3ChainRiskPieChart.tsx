import React, { useRef, useEffect, useState, useMemo } from "react";
import * as d3 from "d3";
import {
  PieChart as PieChartIcon,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Layers,
  Zap,
  Cpu,
  DollarSign,
  TrendingUp,
  Filter,
  RotateCcw,
  Info,
} from "lucide-react";
import { TokenRecord } from "../types";
import { TokenThreatAssessment } from "../utils/securityThreatScanner";

export type ChainFamily = "evm" | "solana" | "quantum" | "other";

export interface ChainExposureStats {
  id: ChainFamily;
  name: string;
  subTitle: string;
  color: string;
  secondaryColor: string;
  glowColor: string;
  gradientId: string;
  tokenCount: number;
  totalMarketCapUsd: number;
  percentOfTotalValue: number;
  weightedThreatScore: number;
  weightedVolatility: number;
  var95Percent: number;
  riskRating: "Low" | "Moderate" | "High" | "Extreme";
  dominantToken: string;
  sampleTokens: string[];
}

export interface D3ChainRiskPieChartProps {
  tokens: TokenRecord[];
  threatAssessmentMap: Map<string, TokenThreatAssessment>;
  selectedChainFilter?: ChainFamily | "all";
  onSelectChainFilter?: (chain: ChainFamily | "all") => void;
  onSelectToken?: (token: TokenRecord) => void;
}

export const D3ChainRiskPieChart: React.FC<D3ChainRiskPieChartProps> = ({
  tokens,
  threatAssessmentMap,
  selectedChainFilter = "all",
  onSelectChainFilter,
  onSelectToken,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // View metric mode: "value" (Total USD Valuation) vs "risk" (Aggregate Risk Exposure) vs "count" (Token Count)
  const [metricMode, setMetricMode] = useState<"value" | "risk" | "count">("value");
  const [hoveredSlice, setHoveredSlice] = useState<ChainExposureStats | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Classify tokens into EVM, Solana, Quantum, and Other
  const chainStats = useMemo(() => {
    const groups: Record<
      ChainFamily,
      {
        tokens: TokenRecord[];
        totalValue: number;
        threatScoreSum: number;
        volatilitySum: number;
      }
    > = {
      evm: { tokens: [], totalValue: 0, threatScoreSum: 0, volatilitySum: 0 },
      solana: { tokens: [], totalValue: 0, threatScoreSum: 0, volatilitySum: 0 },
      quantum: { tokens: [], totalValue: 0, threatScoreSum: 0, volatilitySum: 0 },
      other: { tokens: [], totalValue: 0, threatScoreSum: 0, volatilitySum: 0 },
    };

    tokens.forEach((t) => {
      let fam: ChainFamily = "other";
      const chainLower = (t.chain || "").toLowerCase();
      if (
        chainLower === "ethereum" ||
        chainLower === "base" ||
        chainLower === "arbitrum" ||
        chainLower === "polygon" ||
        chainLower.includes("evm")
      ) {
        fam = "evm";
      } else if (chainLower === "solana" || chainLower.includes("spl")) {
        fam = "solana";
      } else if (chainLower === "quantum" || chainLower.includes("quantum")) {
        fam = "quantum";
      }

      const val = t.marketCap > 0 ? t.marketCap : (t.priceUsd || 1) * 1_000_000;
      const assessment = threatAssessmentMap.get(t.id);
      const threat = assessment ? assessment.threatScore : (100 - (t.securityScore || 95));
      const vol = 45 + ((t.id.charCodeAt(0) * 7) % 38);

      groups[fam].tokens.push(t);
      groups[fam].totalValue += val;
      groups[fam].threatScoreSum += threat * val;
      groups[fam].volatilitySum += vol * val;
    });

    const totalPortfolioVal = Object.values(groups).reduce((acc, g) => acc + g.totalValue, 0) || 1;

    const metadata: Record<
      ChainFamily,
      {
        name: string;
        subTitle: string;
        color: string;
        secondaryColor: string;
        glowColor: string;
        gradientId: string;
      }
    > = {
      evm: {
        name: "EVM Chains",
        subTitle: "Ethereum • Base • Arbitrum • Polygon",
        color: "#3B82F6",
        secondaryColor: "#6366F1",
        glowColor: "rgba(59, 130, 246, 0.4)",
        gradientId: "pie-grad-evm",
      },
      solana: {
        name: "Solana Network",
        subTitle: "High-Throughput SPL Engine",
        color: "#14F195",
        secondaryColor: "#06B6D4",
        glowColor: "rgba(20, 241, 149, 0.4)",
        gradientId: "pie-grad-solana",
      },
      quantum: {
        name: "Quantum Chains",
        subTitle: "Entangled CSPRNG & Hybrid Lattice",
        color: "#C084FC",
        secondaryColor: "#EC4899",
        glowColor: "rgba(192, 132, 252, 0.4)",
        gradientId: "pie-grad-quantum",
      },
      other: {
        name: "Other / Multichain",
        subTitle: "Bitcoin BRC-20 • Cosmos IBC",
        color: "#F59E0B",
        secondaryColor: "#F97316",
        glowColor: "rgba(245, 158, 11, 0.35)",
        gradientId: "pie-grad-other",
      },
    };

    const result: ChainExposureStats[] = (["evm", "solana", "quantum", "other"] as ChainFamily[])
      .map((fam) => {
        const g = groups[fam];
        const count = g.tokens.length;
        const totalVal = g.totalValue;
        const percent = (totalVal / totalPortfolioVal) * 100;
        const weightedThreat = totalVal > 0 ? Math.round(g.threatScoreSum / totalVal) : 25;
        const weightedVol = totalVal > 0 ? Math.round((g.volatilitySum / totalVal) * 10) / 10 : 52.5;

        // Parametric VaR (1-day 95% confidence) roughly 1.65 * daily vol
        const dailyVol = weightedVol / Math.sqrt(365);
        const var95 = Math.round(1.65 * dailyVol * 10) / 10;

        let riskRating: "Low" | "Moderate" | "High" | "Extreme" = "Low";
        if (weightedThreat >= 70 || var95 >= 12) riskRating = "Extreme";
        else if (weightedThreat >= 45 || var95 >= 8) riskRating = "High";
        else if (weightedThreat >= 25 || var95 >= 5) riskRating = "Moderate";

        // Sort tokens to find dominant token
        const sortedTokens = [...g.tokens].sort((a, b) => b.marketCap - a.marketCap);
        const dominantToken = sortedTokens[0] ? `${sortedTokens[0].symbol} (${sortedTokens[0].name})` : "None";
        const sampleTokens = sortedTokens.slice(0, 4).map((t) => t.symbol);

        return {
          id: fam,
          name: metadata[fam].name,
          subTitle: metadata[fam].subTitle,
          color: metadata[fam].color,
          secondaryColor: metadata[fam].secondaryColor,
          glowColor: metadata[fam].glowColor,
          gradientId: metadata[fam].gradientId,
          tokenCount: count,
          totalMarketCapUsd: totalVal,
          percentOfTotalValue: percent,
          weightedThreatScore: weightedThreat,
          weightedVolatility: weightedVol,
          var95Percent: var95,
          riskRating,
          dominantToken,
          sampleTokens,
        };
      })
      .filter((item) => item.tokenCount > 0);

    return result;
  }, [tokens, threatAssessmentMap]);

  // Aggregate totals
  const totalPortfolioValue = useMemo(() => {
    return chainStats.reduce((acc, c) => acc + c.totalMarketCapUsd, 0);
  }, [chainStats]);

  const totalTokensCount = useMemo(() => {
    return chainStats.reduce((acc, c) => acc + c.tokenCount, 0);
  }, [chainStats]);

  // D3 Pie rendering
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || chainStats.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 280;
    const height = 280;
    const margin = 16;
    const radius = Math.min(width, height) / 2 - margin;
    const innerRadius = radius * 0.58; // Donut style for modern HUD feel

    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // SVG Defs for gradients & filters
    const defs = svg.append("defs");

    // Glow filter
    const filter = defs
      .append("filter")
      .attr("id", "pie-glow")
      .attr("x", "-40%")
      .attr("y", "-40%")
      .attr("width", "180%")
      .attr("height", "180%");
    filter
      .append("feGaussianBlur")
      .attr("stdDeviation", "4")
      .attr("result", "blur");
    filter
      .append("feComposite")
      .attr("in", "SourceGraphic")
      .attr("in2", "blur")
      .attr("operator", "over");

    // Gradients for each slice
    chainStats.forEach((c) => {
      const grad = defs
        .append("linearGradient")
        .attr("id", c.gradientId)
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "100%");
      grad.append("stop").attr("offset", "0%").attr("stop-color", c.color);
      grad.append("stop").attr("offset", "100%").attr("stop-color", c.secondaryColor);
    });

    // D3 Pie Generator
    const pie = d3
      .pie<ChainExposureStats>()
      .value((d) => {
        if (metricMode === "value") return Math.max(1, d.totalMarketCapUsd);
        if (metricMode === "risk") return Math.max(1, d.weightedThreatScore * d.totalMarketCapUsd);
        return Math.max(1, d.tokenCount);
      })
      .sort(null)
      .padAngle(0.035);

    // D3 Arc Generators
    const arc = d3
      .arc<d3.PieArcDatum<ChainExposureStats>>()
      .innerRadius(innerRadius)
      .outerRadius(radius)
      .cornerRadius(5);

    const arcHover = d3
      .arc<d3.PieArcDatum<ChainExposureStats>>()
      .innerRadius(innerRadius - 2)
      .outerRadius(radius + 7)
      .cornerRadius(7);

    const pieData = pie(chainStats);

    // Background track ring
    g.append("circle")
      .attr("r", (radius + innerRadius) / 2)
      .attr("fill", "none")
      .attr("stroke", "#141722")
      .attr("stroke-width", radius - innerRadius)
      .attr("opacity", 0.5);

    // Slices group
    const sliceGroup = g.append("g").attr("class", "pie-slices");

    const paths = sliceGroup
      .selectAll("path")
      .data(pieData)
      .enter()
      .append("path")
      .attr("d", arc)
      .attr("fill", (d) => `url(#${d.data.gradientId})`)
      .attr("stroke", (d) => {
        if (selectedChainFilter !== "all" && selectedChainFilter === d.data.id) {
          return "#FFFFFF";
        }
        return "#0B0E14";
      })
      .attr("stroke-width", (d) => {
        if (selectedChainFilter !== "all" && selectedChainFilter === d.data.id) return 2.5;
        return 1.8;
      })
      .attr("cursor", "pointer")
      .style("transition", "all 0.25s ease-out")
      .style("filter", (d) => (selectedChainFilter === d.data.id ? "drop-shadow(0 0 8px rgba(255,255,255,0.4))" : "none"))
      .attr("opacity", (d) => {
        if (selectedChainFilter === "all" || selectedChainFilter === d.data.id) return 1;
        return 0.35;
      });

    // Hover & Click interactions
    paths
      .on("mouseenter", function (event, d) {
        d3.select(this)
          .transition()
          .duration(180)
          .attr("d", arcHover as any)
          .attr("opacity", 1)
          .style("filter", `drop-shadow(0 0 10px ${d.data.glowColor})`);

        setHoveredSlice(d.data);

        const [x, y] = d3.pointer(event, containerRef.current);
        setTooltipPos({ x, y });
      })
      .on("mousemove", function (event) {
        const [x, y] = d3.pointer(event, containerRef.current);
        setTooltipPos({ x, y });
      })
      .on("mouseleave", function (event, d) {
        const isSelected = selectedChainFilter === d.data.id;
        d3.select(this)
          .transition()
          .duration(180)
          .attr("d", arc as any)
          .attr("opacity", selectedChainFilter === "all" || isSelected ? 1 : 0.35)
          .style("filter", isSelected ? "drop-shadow(0 0 8px rgba(255,255,255,0.4))" : "none");

        setHoveredSlice(null);
        setTooltipPos(null);
      })
      .on("click", function (event, d) {
        if (onSelectChainFilter) {
          if (selectedChainFilter === d.data.id) {
            onSelectChainFilter("all");
          } else {
            onSelectChainFilter(d.data.id);
          }
        }
      });

    // Center Donut Display text
    const centerG = g.append("g").attr("class", "center-donut-info").attr("pointer-events", "none");

    const activeDisplay = hoveredSlice || (selectedChainFilter !== "all" ? chainStats.find((c) => c.id === selectedChainFilter) : null);

    if (activeDisplay) {
      centerG
        .append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "-16")
        .attr("fill", activeDisplay.color)
        .attr("font-size", "11px")
        .attr("font-family", "monospace")
        .attr("font-weight", "bold")
        .text(activeDisplay.name.toUpperCase());

      centerG
        .append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "6")
        .attr("fill", "#FFFFFF")
        .attr("font-size", "16px")
        .attr("font-family", "monospace")
        .attr("font-weight", "bold")
        .text(
          metricMode === "value"
            ? `${activeDisplay.percentOfTotalValue.toFixed(1)}%`
            : metricMode === "risk"
            ? `Risk: ${activeDisplay.weightedThreatScore}/100`
            : `${activeDisplay.tokenCount} Tokens`
        );

      centerG
        .append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "22")
        .attr("fill", "#8E9299")
        .attr("font-size", "9.5px")
        .attr("font-family", "monospace")
        .text(
          metricMode === "value"
            ? `$${(activeDisplay.totalMarketCapUsd / (activeDisplay.totalMarketCapUsd >= 1e12 ? 1e12 : activeDisplay.totalMarketCapUsd >= 1e9 ? 1e9 : 1e6)).toFixed(1)}${
                activeDisplay.totalMarketCapUsd >= 1e12 ? "T" : activeDisplay.totalMarketCapUsd >= 1e9 ? "B" : "M"
              }`
            : `VaR 95%: ${activeDisplay.var95Percent}%`
        );
    } else {
      centerG
        .append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "-14")
        .attr("fill", "#8E9299")
        .attr("font-size", "9.5px")
        .attr("font-family", "monospace")
        .text("TOTAL PORTFOLIO");

      centerG
        .append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "6")
        .attr("fill", "#FFFFFF")
        .attr("font-size", "15px")
        .attr("font-family", "monospace")
        .attr("font-weight", "bold")
        .text(
          `$${(totalPortfolioValue / (totalPortfolioValue >= 1e12 ? 1e12 : totalPortfolioValue >= 1e9 ? 1e9 : 1e6)).toFixed(2)}${
            totalPortfolioValue >= 1e12 ? "T" : totalPortfolioValue >= 1e9 ? "B" : "M"
          }`
        );

      centerG
        .append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "22")
        .attr("fill", "#38BDF8")
        .attr("font-size", "9.5px")
        .attr("font-family", "monospace")
        .text(`${chainStats.length} Chains • ${totalTokensCount} Assets`);
    }
  }, [chainStats, metricMode, hoveredSlice, selectedChainFilter, totalPortfolioValue, totalTokensCount, onSelectChainFilter]);

  function formatCurrency(val: number): string {
    if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
    return `$${val.toFixed(2)}`;
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0F141C] p-5 shadow-xl space-y-5">
      {/* Header with Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[11px] font-mono font-semibold text-cyan-300 mb-1">
            <PieChartIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span>INTERACTIVE D3 MULTI-CHAIN RISK &amp; EXPOSURE ENGINE</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>Portfolio Chain Distribution</span>
            <span className="text-xs font-mono font-normal text-slate-400">
              (EVM vs. Solana vs. Quantum)
            </span>
          </h3>
        </div>

        {/* Metric Mode Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMetricMode("value")}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              metricMode === "value"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Value ($)</span>
          </button>
          <button
            type="button"
            onClick={() => setMetricMode("risk")}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              metricMode === "risk"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Risk Exposure</span>
          </button>
          <button
            type="button"
            onClick={() => setMetricMode("count")}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              metricMode === "count"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Count</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Grid: Pie Chart on Left, Detailed Chain Exposure Cards on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: D3 Interactive SVG Canvas */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative" ref={containerRef}>
          <div className="w-[280px] h-[280px] relative">
            <svg ref={svgRef} className="w-full h-full block select-none" />
          </div>

          <div className="flex items-center gap-2 mt-2 text-[11px] font-mono text-slate-400">
            <Info className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span>Hover sectors for details • Click to filter chain tokens</span>
          </div>

          {selectedChainFilter !== "all" && (
            <button
              type="button"
              onClick={() => onSelectChainFilter && onSelectChainFilter("all")}
              className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-mono border border-slate-700 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 text-cyan-400" />
              <span>Reset Filter (Showing {selectedChainFilter.toUpperCase()} only)</span>
            </button>
          )}
        </div>

        {/* Right: Detailed Chain Exposure Statistics Breakdown Cards */}
        <div className="lg:col-span-7 space-y-3">
          {chainStats.map((item) => {
            const isSelected = selectedChainFilter === item.id;
            const isHovered = hoveredSlice?.id === item.id;

            return (
              <div
                key={item.id}
                onClick={() => onSelectChainFilter && onSelectChainFilter(isSelected ? "all" : item.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-slate-800/90 border-cyan-400 shadow-lg shadow-cyan-950/40"
                    : isHovered
                    ? "bg-slate-800/70 border-slate-700 shadow-md"
                    : "bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.glowColor}` }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs sm:text-sm">{item.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {item.tokenCount} {item.tokenCount === 1 ? "token" : "tokens"}
                        </span>
                        <span
                          className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded font-bold border ${
                            item.riskRating === "Extreme"
                              ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                              : item.riskRating === "High"
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                              : item.riskRating === "Moderate"
                              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                              : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          }`}
                        >
                          {item.riskRating} Risk
                        </span>
                      </div>
                      <div className="text-[10.5px] text-slate-400 font-mono mt-0.5">{item.subTitle}</div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="font-mono font-bold text-sm text-white">
                      {formatCurrency(item.totalMarketCapUsd)}
                    </div>
                    <div className="text-[11px] font-mono text-cyan-400 font-semibold">
                      {item.percentOfTotalValue.toFixed(1)}% of portfolio
                    </div>
                  </div>
                </div>

                {/* Progress bar visual for portfolio weight */}
                <div className="w-full bg-slate-950 rounded-full h-1.5 mt-2.5 overflow-hidden border border-slate-800">
                  <div
                    className="h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(2, item.percentOfTotalValue)}%`,
                      backgroundColor: item.color,
                      boxShadow: `0 0 6px ${item.glowColor}`,
                    }}
                  />
                </div>

                {/* Micro metrics grid */}
                <div className="grid grid-cols-3 gap-2 mt-2.5 pt-2 border-t border-slate-800/60 text-[10.5px] font-mono text-slate-400">
                  <div>
                    <span className="text-slate-500 block text-[9.5px]">Avg Threat Score</span>
                    <span className="text-white font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>{item.weightedThreatScore}/100</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9.5px]">Parametric VaR (95%)</span>
                    <span className="text-rose-400 font-semibold flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-rose-400" />
                      <span>-{item.var95Percent}%</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9.5px]">Dominant Asset</span>
                    <span className="text-cyan-300 font-semibold truncate block" title={item.dominantToken}>
                      {item.dominantToken}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
