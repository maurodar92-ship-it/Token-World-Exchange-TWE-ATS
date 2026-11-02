import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ChainType, TokenRecord } from "../types";
import { CHAIN_METADATA } from "../utils/marketData";
import { generateTokenRecord } from "../utils/cryptoGenerators";
import { ChainIcon } from "./ChainIcon";
import {
  Activity,
  Zap,
  Play,
  Pause,
  RotateCw,
  Gauge,
  Clock,
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowDownUp,
  BarChart2,
  LineChart as LineChartIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

export interface LatencySample {
  id: string;
  chain: ChainType;
  chainName: string;
  totalMs: number;
  generationMs: number;
  networkMs: number;
  timestamp: number;
  timeFormatted: string;
  tokenSymbol: string;
  contractAddress: string;
  networkId: number;
  status: "optimal" | "nominal" | "congested";
}

interface ChainEnvProfile {
  chain: ChainType;
  name: string;
  envType: string;
  description: string;
  baseRpcDelay: number;
  jitterVariance: number;
  accentColor: string;
}

const CHAIN_ENV_PROFILES: ChainEnvProfile[] = [
  {
    chain: "solana",
    name: "Solana",
    envType: "SVM Sealevel Pipeline",
    description: "Multi-threaded Gulf Stream mempool & parallel runtime",
    baseRpcDelay: 16,
    jitterVariance: 6,
    accentColor: "#14F195",
  },
  {
    chain: "arbitrum",
    name: "Arbitrum One",
    envType: "Nitro WASM Rollup",
    description: "Arbitrum Nitro execution layer with soft sequencer confirmation",
    baseRpcDelay: 22,
    jitterVariance: 8,
    accentColor: "#28A0F0",
  },
  {
    chain: "base",
    name: "Base",
    envType: "OP Stack L2",
    description: "Optimistic rollup fast block sequencer environment",
    baseRpcDelay: 24,
    jitterVariance: 9,
    accentColor: "#0052FF",
  },
  {
    chain: "polygon",
    name: "Polygon PoS",
    envType: "Bor / Heimdall EVM",
    description: "Bor block producer with Heimdall validator checkpointing",
    baseRpcDelay: 38,
    jitterVariance: 12,
    accentColor: "#8247E5",
  },
  {
    chain: "ethereum",
    name: "Ethereum",
    envType: "Cancun EVM Mainnet",
    description: "Geth/Besu execution client with blob-space verification",
    baseRpcDelay: 52,
    jitterVariance: 15,
    accentColor: "#627EEA",
  },
  {
    chain: "cosmos",
    name: "Cosmos Hub",
    envType: "CometBFT / ABCI",
    description: "Inter-Blockchain Communication (IBC) deterministic consensus",
    baseRpcDelay: 46,
    jitterVariance: 14,
    accentColor: "#8B5CF6",
  },
  {
    chain: "quantum",
    name: "Quantum-Hybrid",
    envType: "Post-Q Lattice Synth",
    description: "Falcon-512 & Kyber-768 lattice quantum entropy verification",
    baseRpcDelay: 68,
    jitterVariance: 18,
    accentColor: "#EC4899",
  },
  {
    chain: "bitcoin",
    name: "Bitcoin Runes",
    envType: "Taproot / UTXO Script",
    description: "Ordinals & Runes protocol transaction indexer roundtrip",
    baseRpcDelay: 84,
    jitterVariance: 22,
    accentColor: "#F7931A",
  },
];

export const ChainLatencyMonitor: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"cards" | "chart" | "log">("cards");
  const [chartView, setChartView] = useState<"bar" | "line">("bar");
  const [isAutoPingActive, setIsAutoPingActive] = useState<boolean>(true);
  const [autoPingIntervalSec, setAutoPingIntervalSec] = useState<number>(3);
  const [isBenchmarking, setIsBenchmarking] = useState<boolean>(false);
  const [benchmarkProgress, setBenchmarkProgress] = useState<number>(0);
  const [stressRunning, setStressRunning] = useState<boolean>(false);
  const [activeChainFilter, setActiveChainFilter] = useState<string>("all");
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Live samples history (most recent first)
  const [samples, setSamples] = useState<LatencySample[]>(() => {
    // Generate initial realistic sample baseline
    const now = Date.now();
    return CHAIN_ENV_PROFILES.map((env, i) => {
      const tStart = performance.now();
      const mockToken = generateTokenRecord(i + 1, { chains: [env.chain] });
      const tGen = performance.now() - tStart;
      const net = env.baseRpcDelay + (Math.random() * env.jitterVariance - env.jitterVariance / 2);
      const total = Number((tGen + net).toFixed(2));
      const status = total < 35 ? "optimal" : total < 75 ? "nominal" : "congested";

      return {
        id: `init-${env.chain}-${now}`,
        chain: env.chain,
        chainName: env.name,
        totalMs: total,
        generationMs: Number(tGen.toFixed(2)),
        networkMs: Number(net.toFixed(2)),
        timestamp: now - (CHAIN_ENV_PROFILES.length - i) * 800,
        timeFormatted: new Date(now - (CHAIN_ENV_PROFILES.length - i) * 800).toLocaleTimeString(),
        tokenSymbol: mockToken.symbol,
        contractAddress: mockToken.contractAddress,
        networkId: mockToken.networkId,
        status,
      };
    });
  });

  // Current per-chain latest latency record
  const latestByChain = useMemo(() => {
    const map: Partial<Record<ChainType, LatencySample>> = {};
    samples.forEach((s) => {
      if (!map[s.chain]) {
        map[s.chain] = s;
      }
    });
    return map;
  }, [samples]);

  // Aggregate Stats
  const stats = useMemo(() => {
    if (samples.length === 0) {
      return {
        avgTotalMs: 0,
        avgGenMs: 0,
        avgNetMs: 0,
        fastestChain: "None",
        fastestMs: 0,
        slowestChain: "None",
        slowestMs: 0,
        p95Ms: 0,
        tokensPerSec: 0,
        totalMeasurements: 0,
      };
    }

    const totals = samples.map((s) => s.totalMs).sort((a, b) => a - b);
    const sumTotal = totals.reduce((acc, v) => acc + v, 0);
    const sumGen = samples.reduce((acc, s) => acc + s.generationMs, 0);
    const sumNet = samples.reduce((acc, s) => acc + s.networkMs, 0);

    const avgTotal = sumTotal / totals.length;
    const avgGen = sumGen / samples.length;
    const avgNet = sumNet / samples.length;

    // P95
    const p95Idx = Math.floor(totals.length * 0.95);
    const p95 = totals[Math.min(p95Idx, totals.length - 1)];

    // Fastest & slowest from latest readings
    let fastest = CHAIN_ENV_PROFILES[0];
    let fastestVal = 9999;
    let slowest = CHAIN_ENV_PROFILES[0];
    let slowestVal = 0;

    CHAIN_ENV_PROFILES.forEach((env) => {
      const rec = latestByChain[env.chain];
      if (rec) {
        if (rec.totalMs < fastestVal) {
          fastestVal = rec.totalMs;
          fastest = env;
        }
        if (rec.totalMs > slowestVal) {
          slowestVal = rec.totalMs;
          slowest = env;
        }
      }
    });

    // Approximate generation throughput in tokens/sec
    const tokensPerSec = avgGen > 0 ? Math.round(1000 / avgGen) : 2500;

    return {
      avgTotalMs: Number(avgTotal.toFixed(2)),
      avgGenMs: Number(avgGen.toFixed(2)),
      avgNetMs: Number(avgNet.toFixed(2)),
      fastestChain: fastest.name,
      fastestMs: Number(fastestVal.toFixed(2)),
      slowestChain: slowest.name,
      slowestMs: Number(slowestVal.toFixed(2)),
      p95Ms: Number(p95.toFixed(2)),
      tokensPerSec,
      totalMeasurements: samples.length,
    };
  }, [samples, latestByChain]);

  /**
   * Execute single round-trip token generation benchmark using performance.now()
   */
  const pingChain = useCallback(
    async (chainType: ChainType, customIndex?: number): Promise<LatencySample> => {
      const env = CHAIN_ENV_PROFILES.find((p) => p.chain === chainType) || CHAIN_ENV_PROFILES[0];

      // 1. High-Precision Start
      const t0 = performance.now();

      // 2. Real Token Generation logic execution
      const tokenIndex = customIndex || Math.floor(Math.random() * 10000) + 1;
      const generated = generateTokenRecord(tokenIndex, { chains: [chainType] });

      // 3. Measure code generation timestamp
      const tGen = performance.now();
      const generationDuration = tGen - t0;

      // 4. Realistic RPC / Mempool Round-Trip simulation with natural variance
      const jitter = (Math.random() * 2 - 1) * env.jitterVariance;
      const targetDelay = Math.max(8, env.baseRpcDelay + jitter);

      await new Promise((resolve) => setTimeout(resolve, targetDelay));

      // 5. Total Round-Trip End
      const tEnd = performance.now();
      const totalDuration = tEnd - t0;
      const networkDuration = tEnd - tGen;

      const totalMs = Number(totalDuration.toFixed(2));
      const genMs = Number(generationDuration.toFixed(2));
      const netMs = Number(networkDuration.toFixed(2));

      const status = totalMs < 35 ? "optimal" : totalMs < 75 ? "nominal" : "congested";
      const now = Date.now();

      const sample: LatencySample = {
        id: `sample-${chainType}-${now}-${Math.random().toString(36).slice(2, 6)}`,
        chain: chainType,
        chainName: env.name,
        totalMs,
        generationMs: genMs,
        networkMs: netMs,
        timestamp: now,
        timeFormatted: new Date(now).toLocaleTimeString(),
        tokenSymbol: generated.symbol,
        contractAddress: generated.contractAddress,
        networkId: generated.networkId,
        status,
      };

      setSamples((prev) => [sample, ...prev.slice(0, 49)]); // Keep last 50
      return sample;
    },
    []
  );

  /**
   * Benchmark all chain environments sequentially
   */
  const benchmarkAllChains = async () => {
    if (isBenchmarking) return;
    setIsBenchmarking(true);
    setBenchmarkProgress(0);

    for (let i = 0; i < CHAIN_ENV_PROFILES.length; i++) {
      const env = CHAIN_ENV_PROFILES[i];
      await pingChain(env.chain);
      setBenchmarkProgress(Math.round(((i + 1) / CHAIN_ENV_PROFILES.length) * 100));
    }

    setIsBenchmarking(false);
  };

  /**
   * Run 10x Stress Burst to test throughput and jitter
   */
  const runStressTest = async () => {
    if (stressRunning) return;
    setStressRunning(true);

    const stressChains: ChainType[] = ["solana", "arbitrum", "base", "ethereum"];
    for (let cycle = 0; cycle < 10; cycle++) {
      const chain = stressChains[cycle % stressChains.length];
      await pingChain(chain, 90000 + cycle);
      await new Promise((r) => setTimeout(r, 60));
    }

    setStressRunning(false);
  };

  // Live Auto-Ping Interval
  const autoPingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roundRobinIdx = useRef<number>(0);

  useEffect(() => {
    if (!isAutoPingActive) {
      if (autoPingRef.current) clearInterval(autoPingRef.current);
      return;
    }

    autoPingRef.current = setInterval(() => {
      const nextEnv = CHAIN_ENV_PROFILES[roundRobinIdx.current % CHAIN_ENV_PROFILES.length];
      roundRobinIdx.current += 1;
      pingChain(nextEnv.chain);
    }, autoPingIntervalSec * 1000);

    return () => {
      if (autoPingRef.current) clearInterval(autoPingRef.current);
    };
  }, [isAutoPingActive, autoPingIntervalSec, pingChain]);

  // Recharts Bar Data: Latest per chain
  const chartBarData = useMemo(() => {
    return CHAIN_ENV_PROFILES.map((env) => {
      const sample = latestByChain[env.chain];
      return {
        name: env.name,
        chain: env.chain,
        total: sample ? sample.totalMs : env.baseRpcDelay,
        gen: sample ? sample.generationMs : 1.2,
        network: sample ? sample.networkMs : env.baseRpcDelay,
        color: env.accentColor,
        envType: env.envType,
      };
    });
  }, [latestByChain]);

  // Recharts Line Data: Chronological trend
  const chartLineData = useMemo(() => {
    const chronoSorted = [...samples].reverse().slice(-20);
    return chronoSorted.map((s, idx) => ({
      index: idx + 1,
      time: s.timeFormatted,
      chain: s.chainName,
      total: s.totalMs,
      gen: s.generationMs,
      network: s.networkMs,
    }));
  }, [samples]);

  const filteredSamples = useMemo(() => {
    if (activeChainFilter === "all") return samples;
    return samples.filter((s) => s.chain === activeChainFilter);
  }, [samples, activeChainFilter]);

  return (
    <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl overflow-hidden shadow-xl" id="widget-chain-latency-monitor">
      {/* Top Header */}
      <div className="p-4 sm:p-5 border-b border-[#1F1F23] bg-[#0E0E12] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#16161A] border border-[#26262B] flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4 text-[#F27D26] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight uppercase flex items-center gap-2">
                  <span>Real-Time Chain Latency Monitor</span>
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Live Heartbeat</span>
                </span>
              </div>
              <p className="text-xs text-[#8E9299] mt-0.5">
                Precision tracking via <code className="text-[#F27D26] font-mono">performance.now()</code> API • Sub-millisecond round-trip speed of token generation & simulated chain broadcast
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Auto Ping Switch */}
          <div className="flex items-center gap-1.5 bg-[#0A0A0C] border border-[#1F1F23] rounded-lg px-2.5 py-1.5 text-xs font-mono">
            <button
              type="button"
              id="btn-toggle-autoping"
              onClick={() => setIsAutoPingActive((prev) => !prev)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded cursor-pointer transition-colors ${
                isAutoPingActive
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "text-[#8E9299] hover:text-white"
              }`}
              title={isAutoPingActive ? "Pause continuous auto-ping" : "Resume auto-ping"}
            >
              {isAutoPingActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>{isAutoPingActive ? "Auto-Ping ON" : "Auto-Ping OFF"}</span>
            </button>

            {isAutoPingActive && (
              <select
                id="select-autoping-interval"
                value={autoPingIntervalSec}
                onChange={(e) => setAutoPingIntervalSec(Number(e.target.value))}
                className="bg-[#16161A] text-white text-[11px] border border-[#26262B] rounded px-1.5 py-0.5 cursor-pointer focus:outline-none focus:border-[#F27D26]"
              >
                <option value={2}>Every 2s</option>
                <option value={3}>Every 3s</option>
                <option value={5}>Every 5s</option>
                <option value={10}>Every 10s</option>
              </select>
            )}
          </div>

          {/* Benchmark All Button */}
          <button
            type="button"
            id="btn-benchmark-all-chains"
            onClick={benchmarkAllChains}
            disabled={isBenchmarking}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
              isBenchmarking
                ? "bg-[#26262B] text-[#8E9299] border-[#333] cursor-not-allowed"
                : "bg-[#F27D26]/10 text-[#F27D26] border-[#F27D26]/30 hover:bg-[#F27D26]/20 active:scale-95"
            }`}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isBenchmarking ? "animate-spin text-[#F27D26]" : ""}`} />
            <span>{isBenchmarking ? `Benchmarking (${benchmarkProgress}%)` : "Benchmark All"}</span>
          </button>

          {/* Stress Test 10x */}
          <button
            type="button"
            id="btn-stress-test-chains"
            onClick={runStressTest}
            disabled={stressRunning}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
              stressRunning
                ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                : "bg-[#16161A] text-[#8E9299] border-[#1F1F23] hover:text-white hover:border-[#333]"
            }`}
            title="Fire 10 rapid burst generation cycles"
          >
            <Flame className={`w-3.5 h-3.5 ${stressRunning ? "text-amber-400 animate-bounce" : "text-amber-500"}`} />
            <span>{stressRunning ? "Burst Testing..." : "10x Burst"}</span>
          </button>

          {/* Toggle Expand */}
          <button
            type="button"
            id="btn-toggle-latency-expand"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1.5 rounded-lg bg-[#0A0A0C] border border-[#1F1F23] text-[#8E9299] hover:text-white cursor-pointer"
            title={isExpanded ? "Collapse Widget" : "Expand Widget"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Primary Content (Expandable) */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-5">
          {/* Quick Real-Time Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. Fastest Chain */}
            <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-3">
              <div className="flex items-center justify-between text-[11px] text-[#8E9299] font-mono">
                <span className="uppercase">Fastest Network</span>
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-lg sm:text-xl font-bold font-mono text-emerald-400">
                  {stats.fastestMs} <span className="text-xs font-normal text-[#8E9299]">ms</span>
                </span>
                <span className="text-xs font-mono text-white truncate">({stats.fastestChain})</span>
              </div>
              <span className="text-[10px] text-[#8E9299] block mt-0.5">SVM / Rollup Pipeline</span>
            </div>

            {/* 2. Average Round-Trip */}
            <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-3">
              <div className="flex items-center justify-between text-[11px] text-[#8E9299] font-mono">
                <span className="uppercase">Fleet Average</span>
                <Gauge className="w-3.5 h-3.5 text-[#F27D26]" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-lg sm:text-xl font-bold font-mono text-[#F27D26]">
                  {stats.avgTotalMs} <span className="text-xs font-normal text-[#8E9299]">ms</span>
                </span>
                <span className="text-xs font-mono text-[#8E9299]">P95: {stats.p95Ms}ms</span>
              </div>
              <span className="text-[10px] text-[#8E9299] block mt-0.5">
                Gen: {stats.avgGenMs}ms • Net: {stats.avgNetMs}ms
              </span>
            </div>

            {/* 3. Compute Engine Rate */}
            <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-3">
              <div className="flex items-center justify-between text-[11px] text-[#8E9299] font-mono">
                <span className="uppercase">Gen Throughput</span>
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-lg sm:text-xl font-bold font-mono text-blue-400">
                  ~{stats.tokensPerSec.toLocaleString()}
                </span>
                <span className="text-xs font-normal text-[#8E9299]">tokens/sec</span>
              </div>
              <span className="text-[10px] text-[#8E9299] block mt-0.5">Cryptographic Synthesis</span>
            </div>

            {/* 4. Timer Telemetry */}
            <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-3">
              <div className="flex items-center justify-between text-[11px] text-[#8E9299] font-mono">
                <span className="uppercase">Timer API</span>
                <Clock className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-sm font-bold font-mono text-white">performance.now()</span>
              </div>
              <span className="text-[10px] text-purple-300/80 block mt-0.5 font-mono">
                {stats.totalMeasurements} samples recorded
              </span>
            </div>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1F1F23] pb-3">
            <div className="flex items-center gap-2 bg-[#0A0A0C] p-1 rounded-lg border border-[#1F1F23]">
              <button
                type="button"
                id="tab-latency-cards"
                onClick={() => setActiveTab("cards")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono cursor-pointer transition-all ${
                  activeTab === "cards"
                    ? "bg-[#16161A] text-white border border-[#F27D26]"
                    : "text-[#8E9299] hover:text-white"
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Chain Cards</span>
              </button>

              <button
                type="button"
                id="tab-latency-chart"
                onClick={() => setActiveTab("chart")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono cursor-pointer transition-all ${
                  activeTab === "chart"
                    ? "bg-[#16161A] text-white border border-[#F27D26]"
                    : "text-[#8E9299] hover:text-white"
                }`}
              >
                <BarChart2 className="w-3 h-3" />
                <span>Comparative Chart</span>
              </button>

              <button
                type="button"
                id="tab-latency-log"
                onClick={() => setActiveTab("log")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono cursor-pointer transition-all ${
                  activeTab === "log"
                    ? "bg-[#16161A] text-white border border-[#F27D26]"
                    : "text-[#8E9299] hover:text-white"
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Round-Trip Log ({samples.length})</span>
              </button>
            </div>

            {/* Filter by chain in log/card views */}
            {activeTab !== "chart" && (
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-[#8E9299]">Filter:</span>
                <select
                  id="select-filter-latency-chain"
                  value={activeChainFilter}
                  onChange={(e) => setActiveChainFilter(e.target.value)}
                  className="bg-[#0A0A0C] text-white border border-[#1F1F23] rounded px-2 py-1 cursor-pointer focus:outline-none focus:border-[#F27D26]"
                >
                  <option value="all">All Chains ({CHAIN_ENV_PROFILES.length})</option>
                  {CHAIN_ENV_PROFILES.map((env) => (
                    <option key={env.chain} value={env.chain}>
                      {env.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Chart View Toggle */}
            {activeTab === "chart" && (
              <div className="flex items-center gap-1 bg-[#0A0A0C] p-1 rounded border border-[#1F1F23] text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setChartView("bar")}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    chartView === "bar" ? "bg-[#16161A] text-white border border-[#333]" : "text-[#8E9299]"
                  }`}
                >
                  Bar
                </button>
                <button
                  type="button"
                  onClick={() => setChartView("line")}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    chartView === "line" ? "bg-[#16161A] text-white border border-[#333]" : "text-[#8E9299]"
                  }`}
                >
                  Trend Stream
                </button>
              </div>
            )}
          </div>

          {/* TAB 1: CHAIN CARDS GRID */}
          {activeTab === "cards" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {CHAIN_ENV_PROFILES.filter(
                (env) => activeChainFilter === "all" || env.chain === activeChainFilter
              ).map((env) => {
                const sample = latestByChain[env.chain];
                const total = sample ? sample.totalMs : env.baseRpcDelay;
                const gen = sample ? sample.generationMs : 1.2;
                const net = sample ? sample.networkMs : env.baseRpcDelay;

                // Status classification
                const status = total < 35 ? "optimal" : total < 75 ? "nominal" : "congested";
                const statusBadge =
                  status === "optimal"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : status === "nominal"
                    ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/30";

                // Relative bar fill (max 120ms baseline)
                const percent = Math.min(100, Math.max(8, (total / 120) * 100));

                return (
                  <div
                    key={env.chain}
                    className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-3.5 flex flex-col justify-between space-y-3 hover:border-[#2D2D35] transition-all"
                  >
                    {/* Header: Icon + Name + Ping button */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ChainIcon chain={env.chain} size="sm" showContainer />
                        <div>
                          <h4 className="text-xs font-bold text-white leading-tight flex items-center gap-1">
                            <span>{env.name}</span>
                          </h4>
                          <span className="text-[10px] text-[#8E9299] font-mono block truncate max-w-[130px]">
                            {env.envType}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        id={`btn-ping-chain-${env.chain}`}
                        onClick={() => pingChain(env.chain)}
                        className="px-2 py-1 rounded bg-[#16161A] text-[10px] font-mono text-[#8E9299] hover:text-[#F27D26] hover:border-[#F27D26]/40 border border-[#1F1F23] cursor-pointer transition-colors shrink-0"
                        title={`Run test ping for ${env.name}`}
                      >
                        Ping
                      </button>
                    </div>

                    {/* Latency Number & Status */}
                    <div className="space-y-1.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-bold font-mono tracking-tight text-white">
                          {total} <span className="text-xs font-normal text-[#8E9299]">ms</span>
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border uppercase ${statusBadge}`}>
                          {status}
                        </span>
                      </div>

                      {/* Visual Meter Bar */}
                      <div className="w-full bg-[#16161A] h-1.5 rounded-full overflow-hidden border border-[#222]">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${percent}%`,
                            backgroundColor: env.accentColor,
                          }}
                        />
                      </div>

                      {/* Sub-breakdown */}
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#8E9299] pt-1">
                        <span>
                          Gen: <strong className="text-white">{gen}ms</strong>
                        </span>
                        <span>
                          Net: <strong className="text-white">{net}ms</strong>
                        </span>
                      </div>
                    </div>

                    {/* Last sample note */}
                    {sample && (
                      <div className="pt-2 border-t border-[#1F1F23] flex items-center justify-between text-[9px] font-mono text-[#666]">
                        <span className="truncate max-w-[120px]" title={sample.tokenSymbol}>
                          Token: {sample.tokenSymbol}
                        </span>
                        <span>{sample.timeFormatted.split(" ")[0]}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: RECHARTS COMPARATIVE VISUALIZER */}
          {activeTab === "chart" && (
            <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wide">
                    {chartView === "bar"
                      ? "Cross-Chain Latency Comparison (Round-Trip vs Generation)"
                      : "Live Latency Measurement History (Last 20 Tests)"}
                  </h4>
                  <p className="text-[11px] text-[#8E9299] mt-0.5">
                    Measured using high-resolution browser timestamps via performance.now()
                  </p>
                </div>
              </div>

              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartView === "bar" ? (
                    <BarChart data={chartBarData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F1F23" />
                      <XAxis dataKey="name" stroke="#8E9299" fontSize={10} angle={-20} textAnchor="end" />
                      <YAxis stroke="#8E9299" fontSize={10} unit="ms" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#16161A",
                          borderColor: "#1F1F23",
                          borderRadius: "8px",
                          fontSize: "12px",
                          color: "#FFF",
                        }}
                        formatter={(val: any, name: any) => [`${val} ms`, name === "total" ? "Round-Trip" : name]}
                      />
                      <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                        {chartBarData.map((entry, index) => (
                          <Cell key={`cell-bar-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <LineChart data={chartLineData} margin={{ top: 10, right: 15, left: -10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F1F23" />
                      <XAxis dataKey="index" stroke="#8E9299" fontSize={10} label={{ value: "Sample #", position: "insideBottom", offset: -5 }} />
                      <YAxis stroke="#8E9299" fontSize={10} unit="ms" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#16161A",
                          borderColor: "#1F1F23",
                          borderRadius: "8px",
                          fontSize: "12px",
                          color: "#FFF",
                        }}
                        formatter={(val: any, name: any, item: any) => [
                          `${val} ms (${item.payload.chain})`,
                          "Total Round-Trip",
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="#F27D26"
                        strokeWidth={2}
                        dot={{ r: 3, fill: "#F27D26" }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="gen"
                        stroke="#14F195"
                        strokeWidth={1.5}
                        strokeDasharray="3 3"
                        dot={false}
                      />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>

              <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-[#8E9299] pt-2 border-t border-[#1F1F23]">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F27D26]" />
                    <span>Total Round-Trip Speed (ms)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#14F195]" />
                    <span>Pure Generation Execution (ms)</span>
                  </span>
                </div>
                <span>Resolution: High-Res Double Precision Float</span>
              </div>
            </div>
          )}

          {/* TAB 3: ROUND-TRIP AUDIT LOG */}
          {activeTab === "log" && (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-lg border border-[#1F1F23]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#0A0A0C] text-[#8E9299] border-b border-[#1F1F23]">
                    <tr>
                      <th className="py-2.5 px-3">Time</th>
                      <th className="py-2.5 px-3">Chain Environment</th>
                      <th className="py-2.5 px-3">Token & Address</th>
                      <th className="py-2.5 px-3 text-right">Pure Gen</th>
                      <th className="py-2.5 px-3 text-right">Simulated RPC</th>
                      <th className="py-2.5 px-3 text-right">Total Round-Trip</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F1F23] bg-[#0E0E12]">
                    {filteredSamples.slice(0, 15).map((s) => (
                      <tr key={s.id} className="hover:bg-[#16161A] transition-colors">
                        <td className="py-2 px-3 text-[#8E9299] whitespace-nowrap">{s.timeFormatted}</td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5">
                            <ChainIcon chain={s.chain} size="xs" />
                            <span className="text-white font-medium">{s.chainName}</span>
                            <span className="text-[10px] text-[#666]">Net #{s.networkId}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold text-[11px]">{s.tokenSymbol}</span>
                            <span className="text-[10px] text-[#8E9299] truncate max-w-[140px]" title={s.contractAddress}>
                              {s.contractAddress.slice(0, 8)}...{s.contractAddress.slice(-6)}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-400">{s.generationMs} ms</td>
                        <td className="py-2 px-3 text-right text-blue-400">{s.networkMs} ms</td>
                        <td className="py-2 px-3 text-right font-bold text-white">
                          <span
                            className={
                              s.totalMs < 35
                                ? "text-emerald-400"
                                : s.totalMs < 75
                                ? "text-cyan-400"
                                : "text-amber-400"
                            }
                          >
                            {s.totalMs} ms
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] uppercase border ${
                              s.status === "optimal"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : s.status === "nominal"
                                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-[10px] text-[#8E9299] font-mono text-right">
                Showing latest {Math.min(15, filteredSamples.length)} of {filteredSamples.length} captured samples
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
