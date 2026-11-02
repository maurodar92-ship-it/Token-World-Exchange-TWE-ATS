import { useMemo, useState } from "react";
import { TokenRecord, ChainType, TokenStandard, LaunchStatus } from "../types";
import { CHAIN_METADATA } from "../utils/marketData";
import { ChainLatencyMonitor } from "./ChainLatencyMonitor";
import { PerformanceHeatmap } from "./PerformanceHeatmap";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import {
  BarChart3,
  PieChart as PieIcon,
  Layers,
  Shield,
  Zap,
  GitBranch,
  Github,
  ExternalLink,
  Search,
  CheckCircle2,
  Copy,
  Check,
  TrendingUp,
  Cpu,
  Globe,
  Database,
  Lock,
  Flame,
  Activity,
} from "lucide-react";

interface TokenAnalyticsChartsProps {
  tokens: TokenRecord[];
  onSelectToken?: (token: TokenRecord) => void;
}

const CHAIN_COLORS: Record<string, string> = {
  ethereum: "#627EEA",
  solana: "#14F195",
  base: "#0052FF",
  arbitrum: "#28A0F0",
  polygon: "#8247E5",
  bitcoin: "#F7931A",
  cosmos: "#2E3148",
  avalanche: "#E84142",
  monad: "#836EF9",
};

const STANDARD_COLORS: Record<string, string> = {
  "ERC-20": "#F27D26",
  "ERC-721": "#9945FF",
  "ERC-1155": "#28A0F0",
  "ERC-4337": "#14F195",
  "Quantum-Hybrid": "#EC4899",
  "SPL-Token": "#10B981",
  "BRC-20/Rune": "#F59E0B",
};

const STATUS_COLORS: Record<string, string> = {
  Deployed: "#3B82F6",
  Audited: "#10B981",
  "Liquidity Locked": "#F27D26",
  Paused: "#F43F5E",
  "Rug-Proof Vault": "#06B6D4",
  Presale: "#A855F7",
};

// Curated Repos & Explorers
const SOURCE_CODE_RESOURCES = [
  {
    category: "1. Curated GitHub Repositories & Aggregators",
    description: "Ranked open-source smart contract platforms, token templates, and DeFi protocols.",
    items: [
      {
        name: "lukasmasuch/best-of-crypto",
        url: "https://github.com/lukasmasuch/best-of-crypto",
        stars: "3,000+ Projects",
        badge: "Ranked Aggregator",
        detail: "A ranked, categorized collection of over 3,000 open-source cryptocurrency projects, smart contract platforms, and DeFi protocols.",
      },
      {
        name: "OpenZeppelin/openzeppelin-contracts",
        url: "https://github.com/OpenZeppelin/openzeppelin-contracts",
        stars: "24k+ Stars",
        badge: "Industry Standard",
        detail: "The open-source gold standard repository for secure ERC-20, ERC-721, ERC-1155, and ERC-4337 token implementations.",
      },
      {
        name: "coinpride/CryptoList",
        url: "https://github.com/coinpride/CryptoList",
        stars: "Curated Directory",
        badge: "Altcoin Codebases",
        detail: "A curated repository linking to official codebases, whitepapers, and resources for major altcoins and blockchain projects.",
      },
    ],
  },
  {
    category: "2. On-Chain Block Explorers (Verified Deployed Bytecode)",
    description: "Search any contract address to view decompiled and verified Solidity/Rust source code.",
    items: [
      {
        name: "Etherscan / BSCScan / Polygonscan",
        url: "https://etherscan.io",
        stars: "EVM Indexers",
        badge: "Verified Solidity",
        detail: "Search a token's contract address and view the verified Solidity code, ABI, and compiler settings under the Contract tab.",
      },
      {
        name: "Solscan & Solana Explorer",
        url: "https://solscan.io",
        stars: "Solana SPL",
        badge: "Rust / BPF",
        detail: "Search Solana SPL tokens and programs to inspect their Anchor schema, program ID bytecode, and token authority state.",
      },
    ],
  },
  {
    category: "3. Direct Protocol GitHub Organizations",
    description: "Core layer-1 nodes, virtual machines, and foundational liquidity infrastructure.",
    items: [
      {
        name: "bitcoin/bitcoin",
        url: "https://github.com/bitcoin/bitcoin",
        stars: "Core Node",
        badge: "C++ / PoW",
        detail: "Bitcoin Core reference implementation, UTXO consensus rules, and RPC wallet integration.",
      },
      {
        name: "ethereum/go-ethereum",
        url: "https://github.com/ethereum/go-ethereum",
        stars: "Geth EVM",
        badge: "Go / EVM",
        detail: "Official Go implementation of the Ethereum protocol, EVM state transition engine, and consensus client.",
      },
      {
        name: "Uniswap/v3-core & v4-core",
        url: "https://github.com/Uniswap/v3-core",
        stars: "DEX Standard",
        badge: "Solidity",
        detail: "Concentrated liquidity AMM, factory pools, and decentralized swap routing smart contracts.",
      },
      {
        name: "smartcontractkit/chainlink",
        url: "https://github.com/smartcontractkit/chainlink",
        stars: "Oracles & CCIP",
        badge: "Cross-Chain",
        detail: "Decentralized oracle networks, Price Feeds, VRF verifiable randomness, and CCIP cross-chain interoperability.",
      },
    ],
  },
];

export const TokenAnalyticsCharts = ({ tokens, onSelectToken }: TokenAnalyticsChartsProps) => {
  const [chartType, setChartType] = useState<"pie" | "bar">("pie");
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState<"all" | "heatmap" | "distributions" | "latency" | "registry">("all");
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // 1. Chain Distribution Data
  const chainDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    tokens.forEach((t) => {
      counts[t.chain] = (counts[t.chain] || 0) + 1;
    });

    return Object.entries(counts).map(([chain, count]) => {
      const meta = CHAIN_METADATA[chain as ChainType];
      return {
        name: meta ? meta.name : chain,
        key: chain,
        value: count,
        percentage: tokens.length ? ((count / tokens.length) * 100).toFixed(1) : "0",
        color: CHAIN_COLORS[chain] || "#8E9299",
      };
    });
  }, [tokens]);

  // 2. Token Standard Distribution Data
  const standardDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    tokens.forEach((t) => {
      counts[t.tokenStandard] = (counts[t.tokenStandard] || 0) + 1;
    });

    return Object.entries(counts).map(([standard, count]) => ({
      name: standard,
      value: count,
      percentage: tokens.length ? ((count / tokens.length) * 100).toFixed(1) : "0",
      color: STANDARD_COLORS[standard] || "#F27D26",
    }));
  }, [tokens]);

  // 3. Launch Status Distribution Data
  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    tokens.forEach((t) => {
      counts[t.launchStatus] = (counts[t.launchStatus] || 0) + 1;
    });

    return Object.entries(counts).map(([status, count]) => ({
      name: status,
      value: count,
      percentage: tokens.length ? ((count / tokens.length) * 100).toFixed(1) : "0",
      color: STATUS_COLORS[status] || "#10B981",
    }));
  }, [tokens]);

  // 4. Narrative Distribution Data
  const narrativeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    tokens.forEach((t) => {
      counts[t.narrative] = (counts[t.narrative] || 0) + 1;
    });

    return Object.entries(counts).map(([narrative, count]) => ({
      name: narrative.replace("_", " ").toUpperCase(),
      value: count,
      percentage: tokens.length ? ((count / tokens.length) * 100).toFixed(1) : "0",
    }));
  }, [tokens]);

  const totalTokens = tokens.length;
  const vanityCount = tokens.filter((t) => t.isVanity).length;
  const auditedCount = tokens.filter((t) => t.launchStatus === "Audited" || t.launchStatus === "Rug-Proof Vault").length;
  const deployedCount = tokens.filter((t) => t.launchStatus === "Deployed" || t.launchStatus === "Liquidity Locked").length;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(text);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#F27D26]" />
              <h2 className="text-base font-bold text-white tracking-tight uppercase">
                Institutional Token Analytics, Performance Heatmap & Source Registry
              </h2>
            </div>
            <p className="text-xs text-[#8E9299] mt-1">
              Relative portfolio alpha simulations, market cap growth heatmaps, consensus chain telemetry, and curated smart contract repositories.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Module Switcher */}
            <div className="flex items-center gap-1 bg-[#0A0A0C] p-1 rounded-lg border border-[#1F1F23]">
              <button
                type="button"
                onClick={() => setActiveAnalyticsTab("all")}
                className={`px-2.5 py-1.5 rounded text-xs font-mono transition-all cursor-pointer ${
                  activeAnalyticsTab === "all"
                    ? "bg-[#16161A] text-white border border-[#F27D26]"
                    : "text-[#8E9299] hover:text-white"
                }`}
              >
                All Views
              </button>
              <button
                type="button"
                onClick={() => setActiveAnalyticsTab("heatmap")}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-mono transition-all cursor-pointer ${
                  activeAnalyticsTab === "heatmap"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold"
                    : "text-[#8E9299] hover:text-emerald-400"
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-emerald-400" />
                <span>Performance Heatmap</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveAnalyticsTab("distributions")}
                className={`px-2.5 py-1.5 rounded text-xs font-mono transition-all cursor-pointer ${
                  activeAnalyticsTab === "distributions"
                    ? "bg-[#16161A] text-white border border-[#F27D26]"
                    : "text-[#8E9299] hover:text-white"
                }`}
              >
                Distributions
              </button>
              <button
                type="button"
                onClick={() => setActiveAnalyticsTab("latency")}
                className={`px-2.5 py-1.5 rounded text-xs font-mono transition-all cursor-pointer ${
                  activeAnalyticsTab === "latency"
                    ? "bg-[#16161A] text-white border border-[#F27D26]"
                    : "text-[#8E9299] hover:text-white"
                }`}
              >
                TPS Latency
              </button>
              <button
                type="button"
                onClick={() => setActiveAnalyticsTab("registry")}
                className={`px-2.5 py-1.5 rounded text-xs font-mono transition-all cursor-pointer ${
                  activeAnalyticsTab === "registry"
                    ? "bg-[#16161A] text-white border border-[#F27D26]"
                    : "text-[#8E9299] hover:text-white"
                }`}
              >
                Source Registry
              </button>
            </div>

            {/* Recharts Format Switcher */}
            {(activeAnalyticsTab === "all" || activeAnalyticsTab === "distributions") && (
              <div className="flex items-center gap-1 bg-[#0A0A0C] p-1 rounded-lg border border-[#1F1F23]">
                <button
                  type="button"
                  onClick={() => setChartType("pie")}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono transition-all cursor-pointer ${
                    chartType === "pie"
                      ? "bg-[#16161A] text-white border border-[#F27D26]"
                      : "text-[#8E9299] hover:text-white"
                  }`}
                  title="Switch to Pie Charts"
                >
                  <PieIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Pies</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartType("bar")}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono transition-all cursor-pointer ${
                    chartType === "bar"
                      ? "bg-[#16161A] text-white border border-[#F27D26]"
                      : "text-[#8E9299] hover:text-white"
                  }`}
                  title="Switch to Bar Graphs"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Bars</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#1F1F23]">
          <div className="bg-[#0A0A0C] p-3 rounded-lg border border-[#1F1F23]">
            <span className="text-[10px] text-[#8E9299] uppercase font-mono block">Sample Population</span>
            <span className="text-lg font-mono font-bold text-white">{totalTokens.toLocaleString()}</span>
            <span className="text-[10px] text-[#8E9299] block mt-0.5">Active In-Memory IDs</span>
          </div>
          <div className="bg-[#0A0A0C] p-3 rounded-lg border border-[#1F1F23]">
            <span className="text-[10px] text-[#8E9299] uppercase font-mono block">Vanity Ratio</span>
            <span className="text-lg font-mono font-bold text-[#F27D26]">
              {totalTokens ? ((vanityCount / totalTokens) * 100).toFixed(1) : 0}%
            </span>
            <span className="text-[10px] text-[#8E9299] block mt-0.5">{vanityCount} institutional prefixes</span>
          </div>
          <div className="bg-[#0A0A0C] p-3 rounded-lg border border-[#1F1F23]">
            <span className="text-[10px] text-[#8E9299] uppercase font-mono block">Audited / Secure</span>
            <span className="text-lg font-mono font-bold text-green-400">
              {totalTokens ? ((auditedCount / totalTokens) * 100).toFixed(1) : 0}%
            </span>
            <span className="text-[10px] text-[#8E9299] block mt-0.5">{auditedCount} audited contracts</span>
          </div>
          <div className="bg-[#0A0A0C] p-3 rounded-lg border border-[#1F1F23]">
            <span className="text-[10px] text-[#8E9299] uppercase font-mono block">Chains Represented</span>
            <span className="text-lg font-mono font-bold text-blue-400">{chainDistribution.length}</span>
            <span className="text-[10px] text-[#8E9299] block mt-0.5">EVM + SVM + Cosmos</span>
          </div>
        </div>
      </div>

      {/* PERFORMANCE HEATMAP (Flagship relative simulated growth visualization) */}
      {(activeAnalyticsTab === "all" || activeAnalyticsTab === "heatmap") && (
        <PerformanceHeatmap tokens={tokens} onSelectToken={onSelectToken} />
      )}

      {/* Real-time Chain Latency Monitor Widget */}
      {(activeAnalyticsTab === "all" || activeAnalyticsTab === "latency") && (
        <ChainLatencyMonitor />
      )}

      {/* RECHARTS VISUALIZATION GRID */}
      {(activeAnalyticsTab === "all" || activeAnalyticsTab === "distributions") && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Chain Distribution Chart */}
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-[#1F1F23]">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#F27D26]" />
              <h3 className="text-sm font-bold text-white uppercase tracking-tight">
                Distribution Across Blockchain Networks
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#8E9299]">{chainDistribution.length} Networks</span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "pie" ? (
                <PieChart>
                  <Pie
                    data={chainDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chainDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#16161A" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0A0A0C",
                      borderColor: "#1F1F23",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#FFF",
                    }}
                    formatter={(value: any, name: any, item: any) => [
                      `${value.toLocaleString()} tokens (${item.payload.percentage}%)`,
                      name,
                    ]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{ fontSize: "11px", color: "#8E9299" }}
                  />
                </PieChart>
              ) : (
                <BarChart data={chainDistribution} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F1F23" />
                  <XAxis type="number" stroke="#8E9299" fontSize={10} />
                  <YAxis type="category" dataKey="name" stroke="#8E9299" fontSize={10} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0A0A0C",
                      borderColor: "#1F1F23",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#FFF",
                    }}
                    formatter={(value: any) => [`${value} tokens`, "Count"]}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {chainDistribution.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1F1F23] text-[11px] font-mono">
            {chainDistribution.slice(0, 3).map((item) => (
              <div key={item.key} className="bg-[#0A0A0C] p-2 rounded border border-[#1F1F23]">
                <span className="text-[#8E9299] block text-[9px] truncate">{item.name}</span>
                <span className="font-bold text-white">{item.value.toLocaleString()} ({item.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Token Standard Distribution Chart */}
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-[#1F1F23]">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#F27D26]" />
              <h3 className="text-sm font-bold text-white uppercase tracking-tight">
                Distribution Across Token Standards
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#8E9299]">{standardDistribution.length} Standards</span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "pie" ? (
                <PieChart>
                  <Pie
                    data={standardDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {standardDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#16161A" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0A0A0C",
                      borderColor: "#1F1F23",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#FFF",
                    }}
                    formatter={(value: any, name: any, item: any) => [
                      `${value.toLocaleString()} tokens (${item.payload.percentage}%)`,
                      name,
                    ]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{ fontSize: "11px", color: "#8E9299" }}
                  />
                </PieChart>
              ) : (
                <BarChart data={standardDistribution} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F1F23" />
                  <XAxis dataKey="name" stroke="#8E9299" fontSize={10} angle={-25} textAnchor="end" />
                  <YAxis stroke="#8E9299" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0A0A0C",
                      borderColor: "#1F1F23",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#FFF",
                    }}
                    formatter={(value: any) => [`${value} tokens`, "Standard Count"]}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {standardDistribution.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1F1F23] text-[11px] font-mono">
            {standardDistribution.slice(0, 3).map((item) => (
              <div key={item.name} className="bg-[#0A0A0C] p-2 rounded border border-[#1F1F23]">
                <span className="text-[#8E9299] block text-[9px] truncate">{item.name}</span>
                <span className="font-bold text-white">{item.value.toLocaleString()} ({item.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Launch Status Compliance Breakdown */}
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-[#1F1F23]">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#F27D26]" />
              <h3 className="text-sm font-bold text-white uppercase tracking-tight">
                Launch Status & Security Compliance
              </h3>
            </div>
            <span className="text-[10px] font-mono text-green-500">Real-Time State</span>
          </div>

          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusDistribution} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F1F23" />
                <XAxis dataKey="name" stroke="#8E9299" fontSize={10} angle={-20} textAnchor="end" />
                <YAxis stroke="#8E9299" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0A0A0C",
                    borderColor: "#1F1F23",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#FFF",
                  }}
                  formatter={(value: any) => [`${value} tokens`, "Count"]}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`status-bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Narrative Clusters */}
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-[#1F1F23]">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#F27D26]" />
              <h3 className="text-sm font-bold text-white uppercase tracking-tight">
                Narrative & Market Sector Clustering
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#8E9299]">{narrativeDistribution.length} Sectors</span>
          </div>

          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={narrativeDistribution} layout="vertical" margin={{ top: 5, right: 20, left: 35, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F1F23" />
                <XAxis type="number" stroke="#8E9299" fontSize={10} />
                <YAxis type="category" dataKey="name" stroke="#8E9299" fontSize={9} width={90} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0A0A0C",
                    borderColor: "#1F1F23",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#FFF",
                  }}
                  formatter={(value: any) => [`${value} tokens`, "Sector Count"]}
                />
                <Bar dataKey="value" fill="#F27D26" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      )}

      {/* DECENTRALIZED SOURCE CODE & GITHUB REPOSITORIES DIRECTORY */}
      {(activeAnalyticsTab === "all" || activeAnalyticsTab === "registry") && (
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1F1F23]">
          <div>
            <div className="flex items-center gap-2">
              <Github className="w-5 h-5 text-white" />
              <h3 className="text-base font-bold text-white uppercase tracking-tight">
                Decentralized Token Source Code & Smart Contract Registry
              </h3>
            </div>
            <p className="text-xs text-[#8E9299] mt-1">
              Because token code is decentralized across thousands of repositories and on-chain contract verifiers, use these primary curated GitHub aggregators, verified block explorers, and core protocol organizations:
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-2.5 py-1 rounded bg-[#0A0A0C] border border-[#1F1F23] text-xs font-mono text-[#F27D26]">
              Deploy Target: Hermes-fossibot
            </span>
          </div>
        </div>

        {/* Directory Modules */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SOURCE_CODE_RESOURCES.map((section, idx) => (
            <div key={idx} className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-4 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white font-mono">{section.category}</h4>
                </div>
                <p className="text-[11px] text-[#8E9299] mt-1 line-clamp-2">{section.description}</p>
                <div className="space-y-2.5 mt-3">
                  {section.items.map((item, itemIdx) => (
                    <div
                      key={itemIdx}
                      className="p-2.5 rounded bg-[#16161A] border border-[#1F1F23] space-y-1.5 hover:border-[#333] transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#F27D26] font-mono truncate">{item.name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#0A0A0C] text-green-400 font-mono border border-green-500/20">
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8E9299] leading-relaxed">{item.detail}</p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-[#555] font-mono">{item.stars}</span>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-[#8E9299] hover:text-white flex items-center gap-1 font-mono transition-colors"
                        >
                          <span>Open Repo</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* GitHub Hermes-fossibot & Remote Push Instructions */}
        <div className="bg-[#0A0A0C] border border-[#F27D26]/40 rounded-lg p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-[#F27D26]" />
              <h4 className="text-xs font-bold text-white uppercase font-mono">
                GitHub Repository Deployment Configuration
              </h4>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#8E9299]">
              <span>Target: <strong className="text-white">Hermes-fossibot</strong></span>
              <span>•</span>
              <span>Author: <strong className="text-white">maurodar92@gmail.com</strong></span>
            </div>
          </div>

          <pre className="p-3 rounded bg-[#16161A] border border-[#1F1F23] text-xs font-mono text-[#E0E0E0] overflow-x-auto whitespace-pre">
{`# 1. Configure Git credentials
git config user.name "Hermes-fossibot"
git config user.email "maurodar92@gmail.com"

# 2. Stage all generated cryptocurrency contracts, tokenomics, and Recharts engine
git add .
git commit -m "feat(crypto): deploy high-volume EVM foundry with Recharts analytics & OpenZeppelin registry"

# 3. Connect remote and push to GitHub
git remote add origin https://github.com/Hermes-fossibot/crypto-token-foundry.git
git branch -M main
git push -u origin main`}
          </pre>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] font-mono text-[#8E9299]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <span>Everything enabled: Multi-chain generator, Recharts visualizer, 1M stream exporter, and GitHub indexer.</span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(`git config user.name "Hermes-fossibot" && git config user.email "maurodar92@gmail.com"`)}
              className="text-[#F27D26] hover:underline flex items-center gap-1 cursor-pointer"
            >
              {copiedLink ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              <span>{copiedLink ? "Copied Git Command" : "Copy Git Setup"}</span>
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
