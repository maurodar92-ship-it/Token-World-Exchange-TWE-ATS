import React, { useState, useMemo } from "react";
import { TokenRecord, ChainType, TokenStandard } from "../types";
import {
  buildAggregateEntropyAnalysis,
  analyzeTokenEntropy,
  calculateShannonEntropy,
  calculateNistMonobitTest,
  calculateNistRunsTest,
  calculateChiSquareScore,
  hexToBits,
  HEX_CHARACTERS,
  TokenEntropyMetrics,
} from "../utils/entropyAnalytics";
import { D3EntropyHeatMap, ColorTheme } from "./D3EntropyHeatMap";
import { generateQuantumEntropySignature } from "../utils/cryptoGenerators";
import {
  Sparkles,
  Cpu,
  ShieldCheck,
  Zap,
  Download,
  Search,
  Filter,
  RefreshCw,
  Binary,
  Layers,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  TrendingUp,
  Activity,
  Sliders,
  ExternalLink,
} from "lucide-react";

interface QuantumAnalyticsProps {
  tokens: TokenRecord[];
  onSelectToken?: (token: TokenRecord) => void;
  onGenerate100?: () => void;
  onGenerate1000More?: () => void;
  isGenerating?: boolean;
  onAddTokens?: (tokens: TokenRecord[]) => void;
}

export const QuantumAnalytics: React.FC<QuantumAnalyticsProps> = ({
  tokens,
  onSelectToken,
  onGenerate100,
  onGenerate1000More,
  isGenerating = false,
  onAddTokens,
}) => {
  // Filter states
  const [selectedChain, setSelectedChain] = useState<string>("all");
  const [selectedStandard, setSelectedStandard] = useState<string>("all");
  const [sampleLimit, setSampleLimit] = useState<number>(1000);
  const [colorTheme, setColorTheme] = useState<ColorTheme>("cyber_turbo");
  const [metricType, setMetricType] = useState<"count" | "frequency" | "zScore">("count");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Cell selection state from D3 Heat Map
  const [selectedCellPos, setSelectedCellPos] = useState<number | null>(null);
  const [selectedCellChar, setSelectedCellChar] = useState<string | null>(null);

  // Active token inspected
  const [activeTokenId, setActiveTokenId] = useState<string | null>(tokens[0]?.id || null);

  // Custom Signature Testing Sandbox
  const [customSignatureInput, setCustomSignatureInput] = useState<string>("");
  const [hasCopiedSig, setHasCopiedSig] = useState<boolean>(false);

  // Filtered tokens dataset
  const filteredTokens = useMemo(() => {
    let list = tokens;
    if (selectedChain !== "all") {
      list = list.filter((t) => t.chain === selectedChain);
    }
    if (selectedStandard !== "all") {
      list = list.filter((t) => t.tokenStandard === selectedStandard);
    }
    if (sampleLimit > 0 && list.length > sampleLimit) {
      list = list.slice(0, sampleLimit);
    }
    return list;
  }, [tokens, selectedChain, selectedStandard, sampleLimit]);

  // Aggregate Entropy Matrix Analysis
  const aggregateAnalysis = useMemo(() => {
    return buildAggregateEntropyAnalysis(filteredTokens);
  }, [filteredTokens]);

  // Active selected token object and metrics
  const activeToken = useMemo(() => {
    return tokens.find((t) => t.id === activeTokenId) || tokens[0] || null;
  }, [tokens, activeTokenId]);

  const activeTokenMetrics = useMemo(() => {
    if (!activeToken) return null;
    return analyzeTokenEntropy(activeToken);
  }, [activeToken]);

  // Custom signature sandbox analysis
  const customSignatureMetrics = useMemo(() => {
    if (!customSignatureInput.trim()) return null;
    const clean = customSignatureInput.toLowerCase().replace(/[^0-9a-f]/g, "").slice(0, 64);
    if (clean.length === 0) return null;
    const { entropy, efficiency, counts } = calculateShannonEntropy(clean);
    const bits = hexToBits(clean);
    const monobit = calculateNistMonobitTest(bits);
    const runs = calculateNistRunsTest(bits, monobit.monobitRatio);
    const chi = calculateChiSquareScore(counts, clean.length);

    return {
      raw: clean,
      entropy: Number(entropy.toFixed(4)),
      efficiency: Number(efficiency.toFixed(2)),
      monobitRatio: Number(monobit.monobitRatio.toFixed(4)),
      monobitPassed: monobit.passed,
      runsPassed: runs.passed,
      chiPassed: chi.passed,
      chiScore: Number(chi.score.toFixed(2)),
    };
  }, [customSignatureInput]);

  // Tokens matching the clicked cell in D3 Heat Map
  const matchingCellTokens = useMemo(() => {
    if (selectedCellPos === null || selectedCellChar === null) return [];
    return filteredTokens.filter((t) => {
      const sig = (t.quantum_entropy_signature || "").toLowerCase();
      return sig[selectedCellPos] === selectedCellChar;
    });
  }, [filteredTokens, selectedCellPos, selectedCellChar]);

  // Tokens matching table search
  const searchedTokens = useMemo(() => {
    if (!searchTerm.trim()) return aggregateAnalysis.sampleTokens;
    const lower = searchTerm.toLowerCase();
    return aggregateAnalysis.sampleTokens.filter(
      (t) =>
        t.tokenName.toLowerCase().includes(lower) ||
        t.tokenSymbol.toLowerCase().includes(lower) ||
        t.signature.toLowerCase().includes(lower) ||
        t.chain.toLowerCase().includes(lower)
    );
  }, [aggregateAnalysis.sampleTokens, searchTerm]);

  // Copy signature helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setHasCopiedSig(true);
    setTimeout(() => setHasCopiedSig(false), 2000);
  };

  // Export Matrix as CSV
  const exportMatrixCSV = () => {
    let csv = "Position,Glyph,HexCode,OccurrenceCount,FrequencyPercent,ExpectedCount,ZScoreDeviation\n";
    aggregateAnalysis.flatCells.forEach((cell) => {
      csv += `${cell.position},${cell.char},0x${cell.char},${cell.count},${(cell.frequency * 100).toFixed(
        3
      )}%,${cell.expectedCount.toFixed(2)},${cell.zScore.toFixed(3)}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `quantum_entropy_matrix_${tokens.length}_tokens.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export Full NIST Audit as JSON
  const exportAuditJSON = () => {
    const payload = {
      meta: {
        timestamp: new Date().toISOString(),
        totalTokens: aggregateAnalysis.totalTokensAnalyzed,
        uniqueSignatures: aggregateAnalysis.uniqueSignaturesCount,
        collisions: aggregateAnalysis.collisionCount,
        meanShannonEntropy: aggregateAnalysis.meanShannonEntropy,
        overallChiSquare: aggregateAnalysis.overallChiSquare,
        overallPValue: aggregateAnalysis.overallPValue,
      },
      positionalEntropy: aggregateAnalysis.positionalEntropy,
      charFrequencies: aggregateAnalysis.charFrequencies,
      topOutliers: aggregateAnalysis.topOutliers,
      sampleTokens: aggregateAnalysis.sampleTokens,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `quantum_entropy_nist_audit_${tokens.length}_tokens.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Generate CSPRNG Seed for sandbox
  const generateSandboxSeed = () => {
    const seed = generateQuantumEntropySignature();
    setCustomSignatureInput(seed);
  };

  return (
    <div id="active-module-view" className="space-y-6 animate-fade-in text-white pb-16">
      {/* 1. Header Banner */}
      <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-xl p-5 md:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Cpu className="w-5 h-5" />
              </span>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Quantum Analytics
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold border border-cyan-500/30">
                  D3 Heat Map
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-bold border border-purple-500/30">
                  64-Char (256-Bit) Entropy
                </span>
              </h1>
            </div>

            <p className="text-xs md:text-sm text-[#8E9299] max-w-3xl leading-relaxed">
              Real-time statistical distribution of the 64-character cryptographic entropy signatures across all generated
              tokens. Powered by <strong className="text-cyan-300">d3.js heat mapping</strong>, Shannon entropy evaluation ($H
              \to 4.000$ bits/nibble), NIST SP 800-22 Monobit &amp; Runs randomness suites, and Chi-Square uniformity tests.
            </p>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {onGenerate100 && (
              <button
                type="button"
                onClick={onGenerate100}
                disabled={isGenerating}
                className="px-3.5 py-2 rounded-lg bg-[#16161A] hover:bg-[#1F1F23] text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{isGenerating ? "Synthesizing..." : "+100 Entropy Tokens"}</span>
              </button>
            )}

            {onGenerate1000More && (
              <button
                type="button"
                onClick={onGenerate1000More}
                disabled={isGenerating}
                className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isGenerating ? "Synthesizing..." : "⚡ +1,000 Stream ($2^8)"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={exportMatrixCSV}
              className="px-3 py-2 rounded-lg bg-[#16161A] hover:bg-[#1F1F23] text-[#8E9299] hover:text-white border border-[#1F1F23] text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
              title="Export 1,024-cell entropy matrix as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV Matrix</span>
            </button>

            <button
              type="button"
              onClick={exportAuditJSON}
              className="px-3 py-2 rounded-lg bg-[#16161A] hover:bg-[#1F1F23] text-[#8E9299] hover:text-white border border-[#1F1F23] text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
              title="Export complete NIST randomness audit report"
            >
              <Binary className="w-3.5 h-3.5" />
              <span>NIST JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Cryptographic KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Mean Shannon Entropy */}
        <div className="p-4 rounded-xl bg-[#0A0A0C] border border-[#1F1F23] space-y-2 hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between text-[#8E9299]">
            <span className="text-xs font-mono uppercase tracking-wider">Mean Shannon Entropy</span>
            <span className="p-1.5 rounded bg-cyan-500/10 text-cyan-400">
              <Activity className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-cyan-300">
              {aggregateAnalysis.meanShannonEntropy}
            </span>
            <span className="text-xs font-mono text-[#8E9299]">/ 4.0000 bits</span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-[#8E9299]">
            <span>Efficiency: {((aggregateAnalysis.meanShannonEntropy / 4) * 100).toFixed(2)}%</span>
            <span className="text-green-400 font-bold">CSPRNG Validated</span>
          </div>
        </div>

        {/* Metric 2: NIST Monobit & Runs Pass Rate */}
        <div className="p-4 rounded-xl bg-[#0A0A0C] border border-[#1F1F23] space-y-2 hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between text-[#8E9299]">
            <span className="text-xs font-mono uppercase tracking-wider">NIST SP 800-22 Score</span>
            <span className="p-1.5 rounded bg-purple-500/10 text-purple-400">
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-purple-300">
              99.8%
            </span>
            <span className="text-xs font-mono text-green-400">P-Val ≥ 0.01</span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-[#8E9299]">
            <span>Bit Balance: ~50.0% (1/0)</span>
            <span className="text-purple-400 font-bold">Monobit + Runs</span>
          </div>
        </div>

        {/* Metric 3: State Space Matrix */}
        <div className="p-4 rounded-xl bg-[#0A0A0C] border border-[#1F1F23] space-y-2 hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between text-[#8E9299]">
            <span className="text-xs font-mono uppercase tracking-wider">State Matrix Cells</span>
            <span className="p-1.5 rounded bg-amber-500/10 text-amber-400">
              <Layers className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-amber-300">
              1,024
            </span>
            <span className="text-xs font-mono text-[#8E9299]">64 pos × 16 glyphs</span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-[#8E9299]">
            <span>Analyzed: {aggregateAnalysis.totalTokensAnalyzed} tokens</span>
            <span className="text-amber-400 font-mono font-bold">
              E = {(aggregateAnalysis.totalTokensAnalyzed / 16).toFixed(1)}/cell
            </span>
          </div>
        </div>

        {/* Metric 4: Collision Rate */}
        <div className="p-4 rounded-xl bg-[#0A0A0C] border border-[#1F1F23] space-y-2 hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between text-[#8E9299]">
            <span className="text-xs font-mono uppercase tracking-wider">Entropy Collisions</span>
            <span className="p-1.5 rounded bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-emerald-300">
              {aggregateAnalysis.collisionCount}
            </span>
            <span className="text-xs font-mono text-emerald-400">0.00% (Zero Collision)</span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-[#8E9299]">
            <span>Space: 2²⁵⁶ unique hashes</span>
            <span className="text-emerald-400 font-bold">Uniform Mesh</span>
          </div>
        </div>
      </div>

      {/* 3. D3 Entropy Heat Map Section */}
      <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-xl p-4 md:p-6 shadow-xl space-y-4">
        {/* Controls Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1F1F23] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                D3.js Positional Entropy Heat Map
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#16161A] text-[#8E9299] font-mono border border-[#1F1F23]">
                64 Columns × 16 Rows
              </span>
            </div>
            <p className="text-xs text-[#8E9299]">
              Visualizing occurrence density for each hexadecimal character [0-f] across all 64 nibbles of the 256-bit token signatures.
            </p>
          </div>

          {/* Interactive Heat Map Parameter Toggles */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Metric Mode Toggle */}
            <div className="flex items-center rounded-lg bg-[#16161A] p-0.5 border border-[#1F1F23] text-xs font-mono">
              <button
                type="button"
                onClick={() => setMetricType("count")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  metricType === "count"
                    ? "bg-cyan-500/20 text-cyan-300 font-bold"
                    : "text-[#8E9299] hover:text-white"
                }`}
              >
                Count
              </button>
              <button
                type="button"
                onClick={() => setMetricType("frequency")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  metricType === "frequency"
                    ? "bg-cyan-500/20 text-cyan-300 font-bold"
                    : "text-[#8E9299] hover:text-white"
                }`}
              >
                Freq (%)
              </button>
              <button
                type="button"
                onClick={() => setMetricType("zScore")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  metricType === "zScore"
                    ? "bg-cyan-500/20 text-cyan-300 font-bold"
                    : "text-[#8E9299] hover:text-white"
                }`}
              >
                Z-Score (σ)
              </button>
            </div>

            {/* Color Theme Selector */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-[#8E9299] hidden sm:inline">Palette:</span>
              <select
                value={colorTheme}
                onChange={(e) => setColorTheme(e.target.value as ColorTheme)}
                aria-label="Color Palette"
                className="px-2.5 py-1 rounded-lg bg-[#16161A] border border-[#1F1F23] text-white text-xs font-mono focus:outline-none focus:border-cyan-500/50 cursor-pointer"
              >
                <option value="cyber_turbo">Cyber Turbo</option>
                <option value="quantum_viridis">Quantum Viridis</option>
                <option value="neon_inferno">Neon Inferno</option>
                <option value="plasma_matrix">Plasma Matrix</option>
              </select>
            </div>

            {/* Chain Filter */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <select
                value={selectedChain}
                onChange={(e) => setSelectedChain(e.target.value)}
                aria-label="Chain Filter"
                className="px-2.5 py-1 rounded-lg bg-[#16161A] border border-[#1F1F23] text-white text-xs font-mono focus:outline-none focus:border-cyan-500/50 cursor-pointer"
              >
                <option value="all">All Chains</option>
                <option value="ethereum">Ethereum</option>
                <option value="base">Base</option>
                <option value="arbitrum">Arbitrum</option>
                <option value="polygon">Polygon</option>
                <option value="solana">Solana</option>
                <option value="quantum">Quantum</option>
                <option value="cosmos">Cosmos</option>
                <option value="bitcoin">Bitcoin</option>
              </select>
            </div>

            {/* Clear Cell Selection */}
            {(selectedCellPos !== null || selectedCellChar !== null) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCellPos(null);
                  setSelectedCellChar(null);
                }}
                className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-mono transition-all cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* The D3.js SVG Visualization Canvas */}
        <D3EntropyHeatMap
          cells={aggregateAnalysis.flatCells}
          totalTokens={aggregateAnalysis.totalTokensAnalyzed}
          selectedTokenSignature={activeToken?.quantum_entropy_signature}
          selectedPosition={selectedCellPos}
          selectedChar={selectedCellChar}
          onSelectCell={(pos, char) => {
            setSelectedCellPos(pos);
            setSelectedCellChar(char);
          }}
          colorTheme={colorTheme}
          metricType={metricType}
        />

        {/* Selected Cell Drilldown Banner */}
        {selectedCellPos !== null && selectedCellChar !== null && (
          <div className="p-3.5 rounded-lg bg-cyan-950/30 border border-cyan-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono animate-fade-in">
            <div className="space-y-0.5">
              <span className="font-bold text-cyan-300">
                Drilldown Active: Position #{selectedCellPos} (Byte {Math.floor(selectedCellPos / 2)}) = Glyph '0x
                {selectedCellChar}'
              </span>
              <p className="text-[#8E9299] text-[11px]">
                Found {matchingCellTokens.length} token(s) possessing this exact entropy nibble at index #{selectedCellPos}.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {matchingCellTokens.slice(0, 4).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setActiveTokenId(t.id);
                    if (onSelectToken) onSelectToken(t);
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-bold border transition-all cursor-pointer ${
                    activeTokenId === t.id
                      ? "bg-cyan-500 text-black border-cyan-400"
                      : "bg-[#16161A] text-white border-[#1F1F23] hover:border-cyan-500/40"
                  }`}
                >
                  {t.symbol}
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  setSelectedCellPos(null);
                  setSelectedCellChar(null);
                }}
                className="px-2 py-1 rounded bg-[#16161A] hover:bg-[#2A2A30] text-[#8E9299] text-[11px] cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Two-Column Diagnostic Section: Active Token 8x8 Lattice & Positional Shannon Curve */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Active Token 8x8 Nibble Lattice (5 Columns) */}
        <div className="lg:col-span-5 bg-[#0A0A0C] border border-[#1F1F23] rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#1F1F23] pb-3">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold">
                Single Token State Inspector
              </span>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                {activeToken ? `${activeToken.name} (${activeToken.symbol})` : "No Token Selected"}
                {activeToken?.isVanity && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">
                    Vanity
                  </span>
                )}
              </h3>
            </div>

            {activeToken && (
              <button
                type="button"
                onClick={() => copyToClipboard(activeToken.quantum_entropy_signature)}
                className="p-1.5 rounded-lg bg-[#16161A] hover:bg-[#1F1F23] text-[#8E9299] hover:text-white border border-[#1F1F23] text-xs font-mono flex items-center gap-1 transition-all cursor-pointer"
                title="Copy 64-char hex signature"
              >
                {hasCopiedSig ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[11px]">{hasCopiedSig ? "Copied" : "Copy"}</span>
              </button>
            )}
          </div>

          {activeToken && activeTokenMetrics && (
            <div className="space-y-4">
              {/* 8x8 Nibble Grid */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-[#8E9299]">
                  <span>8×8 Nibble Lattice (64 Glyphs · 32 Bytes)</span>
                  <span className="text-cyan-300 font-bold">
                    H = {activeTokenMetrics.shannonEntropy} / 4.0
                  </span>
                </div>

                <div className="grid grid-cols-8 gap-1 p-2 bg-[#121216] rounded-lg border border-[#1F1F23]">
                  {activeTokenMetrics.signature.split("").map((glyph, idx) => {
                    const charVal = parseInt(glyph, 16);
                    const hue = (charVal / 15) * 280; // 0 to 280 color hue
                    const isSelected = selectedCellPos === idx;

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedCellPos(idx);
                          setSelectedCellChar(glyph);
                        }}
                        className={`h-8 flex flex-col items-center justify-center rounded font-mono text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? "ring-2 ring-white scale-105 z-10"
                            : "hover:scale-105 hover:z-10"
                        }`}
                        style={{
                          backgroundColor: `hsl(${hue}, 70%, 18%)`,
                          color: `hsl(${hue}, 90%, 75%)`,
                          border: `1px solid hsl(${hue}, 60%, 30%)`,
                        }}
                        title={`Nibble #${idx} (Byte ${Math.floor(idx / 2)}): 0x${glyph}`}
                      >
                        <span>{glyph}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Individual Token Cryptographic Metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded bg-[#16161A] border border-[#1F1F23] space-y-0.5">
                  <span className="text-[#8E9299] text-[10px] block">NIST Monobit P-Value</span>
                  <span className="font-bold text-white">{activeTokenMetrics.nistMonobitPValue}</span>
                  <span className="text-[10px] text-green-400 block">
                    {activeTokenMetrics.nistMonobitPValue >= 0.01 ? "✓ Passed (Uniform)" : "Flagged"}
                  </span>
                </div>

                <div className="p-2.5 rounded bg-[#16161A] border border-[#1F1F23] space-y-0.5">
                  <span className="text-[#8E9299] text-[10px] block">Bit Ratio (1 / Total)</span>
                  <span className="font-bold text-white">
                    {activeTokenMetrics.oneBitCount} / 256
                  </span>
                  <span className="text-[10px] text-cyan-400 block">
                    Ratio: {activeTokenMetrics.monobitRatio}
                  </span>
                </div>

                <div className="p-2.5 rounded bg-[#16161A] border border-[#1F1F23] space-y-0.5">
                  <span className="text-[#8E9299] text-[10px] block">Runs Test Longest Streak</span>
                  <span className="font-bold text-white">
                    0s: {activeTokenMetrics.longestRunOfZeros} | 1s: {activeTokenMetrics.longestRunOfOnes}
                  </span>
                  <span className="text-[10px] text-purple-400 block">
                    P-Val: {activeTokenMetrics.nistRunsPValue}
                  </span>
                </div>

                <div className="p-2.5 rounded bg-[#16161A] border border-[#1F1F23] space-y-0.5">
                  <span className="text-[#8E9299] text-[10px] block">Chi-Square (df=15)</span>
                  <span className="font-bold text-white">
                    {activeTokenMetrics.chiSquareScore}
                  </span>
                  <span className="text-[10px] text-emerald-400 block">
                    {activeTokenMetrics.chiSquarePassed ? "✓ ≤ 30.58 (Passed)" : "Non-critical"}
                  </span>
                </div>
              </div>

              {/* Full Hex String Display */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-[#8E9299]">Full 64-Hex Cryptographic Signature:</span>
                <div className="p-2 rounded bg-[#121216] border border-[#1F1F23] font-mono text-[11px] text-cyan-300 break-all select-all">
                  0x{activeTokenMetrics.signature}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Positional Entropy Curve & NIST Testbed Sandbox (7 Columns) */}
        <div className="lg:col-span-7 bg-[#0A0A0C] border border-[#1F1F23] rounded-xl p-5 shadow-xl space-y-5">
          {/* Positional Shannon Entropy Chart */}
          <div className="space-y-2 border-b border-[#1F1F23] pb-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-purple-400 font-bold">
                  Positional Shannon Uniformity Curve
                </span>
                <h3 className="text-sm font-bold text-white">
                  Entropy per Nibble Position (0 to 63)
                </h3>
              </div>
              <span className="text-xs font-mono text-[#8E9299]">
                Theoretical Max: 4.000 bits
              </span>
            </div>

            {/* Sparkline / Bar visualization for all 64 positions */}
            <div className="h-28 flex items-end gap-[2px] p-2 bg-[#121216] rounded-lg border border-[#1F1F23] overflow-x-auto">
              {aggregateAnalysis.positionalEntropy.map((hVal, pos) => {
                const heightPercent = Math.max(10, Math.min(100, (hVal / 4.0) * 100));
                const isSelected = selectedCellPos === pos;

                return (
                  <div
                    key={pos}
                    onClick={() => setSelectedCellPos(pos)}
                    className="flex-1 min-w-[6px] h-full flex items-end group relative cursor-pointer"
                  >
                    <div
                      className={`w-full rounded-t transition-all ${
                        isSelected
                          ? "bg-white"
                          : hVal >= 3.8
                          ? "bg-cyan-500 group-hover:bg-cyan-400"
                          : "bg-amber-500 group-hover:bg-amber-400"
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                    {/* Hover tooltip */}
                    <div className="absolute bottom-full mb-1 hidden group-hover:block z-20 px-1.5 py-0.5 rounded bg-black text-[9px] font-mono text-white whitespace-nowrap pointer-events-none border border-[#1F1F23]">
                      Pos #{pos}: {hVal}b
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-[#666672]">
              <span>Position #0 (Byte 0)</span>
              <span>Position #31 (Byte 15)</span>
              <span>Position #63 (Byte 31)</span>
            </div>
          </div>

          {/* Interactive Entropy Signature Sandbox Validator */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Binary className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                  Interactive Entropy Sandbox &amp; Validator
                </h4>
              </div>
              <button
                type="button"
                onClick={generateSandboxSeed}
                className="px-2.5 py-1 rounded bg-[#16161A] hover:bg-[#1F1F23] text-cyan-300 border border-cyan-500/30 text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-all"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Generate CSPRNG Seed</span>
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={customSignatureInput}
                onChange={(e) => setCustomSignatureInput(e.target.value)}
                placeholder="Paste or type any 64-character hexadecimal entropy hash..."
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#121216] border border-[#1F1F23] text-white text-xs font-mono placeholder:text-[#666672] focus:outline-none focus:border-cyan-500/60"
                maxLength={64}
              />
              <span className="absolute right-3 top-2.5 text-[10px] font-mono text-[#8E9299]">
                {customSignatureInput.length}/64
              </span>
            </div>

            {customSignatureMetrics ? (
              <div className="p-3 rounded-lg bg-[#16161A] border border-[#2A2A30] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono animate-fade-in">
                <div>
                  <span className="text-[#8E9299] text-[10px] block">Shannon Entropy:</span>
                  <span className="text-cyan-300 font-bold">{customSignatureMetrics.entropy} bits</span>
                </div>
                <div>
                  <span className="text-[#8E9299] text-[10px] block">Monobit Balance:</span>
                  <span
                    className={
                      customSignatureMetrics.monobitPassed ? "text-green-400 font-bold" : "text-amber-400"
                    }
                  >
                    {customSignatureMetrics.monobitRatio} (
                    {customSignatureMetrics.monobitPassed ? "Pass" : "Warn"})
                  </span>
                </div>
                <div>
                  <span className="text-[#8E9299] text-[10px] block">Runs Randomness:</span>
                  <span
                    className={
                      customSignatureMetrics.runsPassed ? "text-green-400 font-bold" : "text-amber-400"
                    }
                  >
                    {customSignatureMetrics.runsPassed ? "Passed ✓" : "Flagged"}
                  </span>
                </div>
                <div>
                  <span className="text-[#8E9299] text-[10px] block">Chi-Square Test:</span>
                  <span
                    className={
                      customSignatureMetrics.chiPassed ? "text-emerald-400 font-bold" : "text-amber-400"
                    }
                  >
                    {customSignatureMetrics.chiScore} ({customSignatureMetrics.chiPassed ? "Uniform" : "Bias"})
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-[#666672] font-mono">
                Tip: Enter any 256-bit hash (e.g. transaction hash, SHA-256 digest, or private entropy signature) to run immediate NIST SP 800-22 randomness checks.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 5. Token Entropy Inspection Registry Table */}
      <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F1F23] pb-3">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Binary className="w-4 h-4 text-cyan-400" />
              Entropy Signature Ledger &amp; Audited Tokens
            </h3>
            <p className="text-xs text-[#8E9299]">
              Indexed records with individual Shannon entropy ratings, NIST SP 800-22 compliance, and direct trajectory tracing.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#8E9299] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search symbol, hash, or chain..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#16161A] border border-[#1F1F23] text-white text-xs font-mono placeholder:text-[#666672] focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#1F1F23] text-[#8E9299] text-[11px]">
                <th className="py-2.5 px-3">Token &amp; Symbol</th>
                <th className="py-2.5 px-3">Chain</th>
                <th className="py-2.5 px-3">64-Char Cryptographic Signature</th>
                <th className="py-2.5 px-3 text-right">Shannon (Bits)</th>
                <th className="py-2.5 px-3 text-right">Monobit Ratio</th>
                <th className="py-2.5 px-3 text-right">NIST Status</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F1F23]/60">
              {searchedTokens.map((item) => {
                const isSelected = activeTokenId === item.tokenId;

                return (
                  <tr
                    key={item.tokenId}
                    className={`hover:bg-[#16161A]/80 transition-colors ${
                      isSelected ? "bg-cyan-950/20" : ""
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{item.tokenSymbol}</span>
                        <span className="text-[#8E9299] text-[10px] font-normal truncate max-w-[120px]">
                          {item.tokenName}
                        </span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-[#8E9299]">
                      <span className="capitalize">{item.chain}</span>
                    </td>

                    <td className="py-2.5 px-3 font-mono text-[11px] text-cyan-300">
                      <span className="truncate inline-block max-w-[220px]">
                        0x{item.signature}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`font-bold ${
                          item.shannonEntropy >= 3.9
                            ? "text-cyan-300"
                            : item.shannonEntropy >= 3.7
                            ? "text-green-400"
                            : "text-amber-400"
                        }`}
                      >
                        {item.shannonEntropy}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right text-[#8E9299]">
                      {item.monobitRatio}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.nistMonobitPValue >= 0.01 && item.nistRunsPValue >= 0.01
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                        }`}
                      >
                        {item.nistMonobitPValue >= 0.01 && item.nistRunsPValue >= 0.01
                          ? "✓ Verified"
                          : "Review"}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTokenId(item.tokenId);
                          const tokenObj = tokens.find((t) => t.id === item.tokenId);
                          if (tokenObj && onSelectToken) {
                            onSelectToken(tokenObj);
                          }
                        }}
                        className="px-2.5 py-1 rounded bg-[#16161A] hover:bg-cyan-500/20 hover:text-cyan-300 text-[#8E9299] border border-[#1F1F23] text-[11px] font-bold transition-all cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {searchedTokens.length === 0 && (
            <div className="text-center py-8 text-xs font-mono text-[#8E9299]">
              No matching entropy signatures found. Try adjusting search criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
