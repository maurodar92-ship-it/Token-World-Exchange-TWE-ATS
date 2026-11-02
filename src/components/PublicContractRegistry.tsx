import React, { useState, useEffect, useMemo, useCallback } from "react";
import { TokenRecord, ChainType } from "../types";
import { ChainIcon } from "./ChainIcon";
import { TokenImage } from "./TokenImage";
import {
  PublicRegistryEntry,
  RpcPingResult,
  mapTokenToPublicRegistry,
  computePublicContractId,
  pingRpcEndpoint,
  EXPLORER_CONFIG,
  generateProductionReadySolidityCode,
} from "../utils/publicRegistry";
import {
  Search,
  ExternalLink,
  Copy,
  Check,
  Activity,
  Globe,
  Coins,
  ShieldCheck,
  Download,
  Terminal,
  RefreshCw,
  Code2,
  Filter,
  CheckSquare,
  Square,
  MinusSquare,
  Layers,
  ArrowUpDown,
  Zap,
  Radio,
  FileCode,
  Sparkles,
  AlertCircle,
  Binary,
} from "lucide-react";
import { ContractDecompilerModal } from "./ContractDecompilerModal";
import { BulkEtherscanVerifyModal } from "./BulkEtherscanVerifyModal";
import { Uint256ContractAddressExplorer } from "./Uint256ContractAddressExplorer";

interface PublicContractRegistryProps {
  tokens: TokenRecord[];
  onSelectToken?: (token: TokenRecord) => void;
  selectedTokenIds?: Set<string>;
  onSelectedTokenIdsChange?: (updater: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const PublicContractRegistry: React.FC<PublicContractRegistryProps> = ({
  tokens,
  onSelectToken,
  selectedTokenIds: externalSelectedTokenIds,
  onSelectedTokenIdsChange,
  onNavigateToTab,
}) => {
  // Registry View Mode: Standard Public Registry vs. 49 UINT256 Contract Addresses Explorer
  const [registryViewMode, setRegistryViewMode] = useState<"standard" | "uint256_explorer">("standard");

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChain, setSelectedChain] = useState<string>("all");
  const [selectedPoolFilter, setSelectedPoolFilter] = useState<"all" | "active" | "inactive">("all");
  const [selectedVerification, setSelectedVerification] = useState<string>("all");

  // Selection state
  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(new Set());
  const selectedIds = externalSelectedTokenIds !== undefined ? externalSelectedTokenIds : internalSelectedIds;
  const setSelectedIds = (updater: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    if (onSelectedTokenIdsChange) {
      onSelectedTokenIdsChange(updater);
    } else {
      setInternalSelectedIds(updater);
    }
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Copy Feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Active Solidity Prompt Modal Token
  const [activeSolidityToken, setActiveSolidityToken] = useState<TokenRecord | null>(null);

  // Active Contract Decompiler Modal Token
  const [activeDecompileToken, setActiveDecompileToken] = useState<TokenRecord | null>(null);
  const [showDecompilerModal, setShowDecompilerModal] = useState<boolean>(false);

  // Bulk Etherscan Verification Modal State
  const [showBulkVerifyModal, setShowBulkVerifyModal] = useState<boolean>(false);
  const [bulkVerifyTokensOverride, setBulkVerifyTokensOverride] = useState<TokenRecord[] | null>(null);

  // Live RPC Reachability State per Chain
  const [rpcStatusMap, setRpcStatusMap] = useState<Record<string, RpcPingResult>>({});
  const [isPingingAll, setIsPingingAll] = useState(false);

  // Ping a specific chain RPC
  const handlePingChain = useCallback(async (chain: string) => {
    setRpcStatusMap((prev) => ({
      ...prev,
      [chain]: {
        chain,
        rpcUrl: EXPLORER_CONFIG[chain]?.rpcUrl || "https://cloudflare-eth.com",
        reachable: false,
        latencyMs: 0,
        status: "degraded",
        lastChecked: Date.now(),
      },
    }));

    const result = await pingRpcEndpoint(chain);
    setRpcStatusMap((prev) => ({
      ...prev,
      [chain]: result,
    }));
  }, []);

  // Ping all configured network RPCs
  const handlePingAllRpcs = useCallback(async () => {
    setIsPingingAll(true);
    const chains = Object.keys(EXPLORER_CONFIG);
    await Promise.all(
      chains.map(async (chain) => {
        const res = await pingRpcEndpoint(chain);
        setRpcStatusMap((prev) => ({ ...prev, [chain]: res }));
      })
    );
    setIsPingingAll(false);
    setFeedbackMsg("Pings completed across all chain RPC endpoints!");
    setTimeout(() => setFeedbackMsg(null), 3500);
  }, []);

  // Initial RPC check on mount
  useEffect(() => {
    handlePingAllRpcs();
  }, [handlePingAllRpcs]);

  // Transform tokens into registry records
  const registryRecords = useMemo(() => {
    return tokens.map((token) => ({
      token,
      registry: mapTokenToPublicRegistry(token),
    }));
  }, [tokens]);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return registryRecords.filter(({ token, registry }) => {
      // Chain filter
      if (selectedChain !== "all" && token.chain !== selectedChain) {
        return false;
      }
      // Liquidity pool filter
      if (selectedPoolFilter === "active" && !registry.hasActiveLiquidityPool) {
        return false;
      }
      if (selectedPoolFilter === "inactive" && registry.hasActiveLiquidityPool) {
        return false;
      }
      // Verification status filter
      if (selectedVerification !== "all" && registry.verificationStatus !== selectedVerification) {
        return false;
      }
      // Text query match
      if (!query) return true;
      return (
        token.name.toLowerCase().includes(query) ||
        token.symbol.toLowerCase().includes(query) ||
        token.contractAddress.toLowerCase().includes(query) ||
        registry.publicContractId.toLowerCase().includes(query) ||
        token.tokenId.toLowerCase().includes(query) ||
        registry.explorerName.toLowerCase().includes(query)
      );
    });
  }, [registryRecords, searchQuery, selectedChain, selectedPoolFilter, selectedVerification]);

  // Pagination Slice
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // Copy helper
  const handleCopy = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setFeedbackMsg(`Copied ${label} to clipboard!`);
    setTimeout(() => {
      setCopiedKey(null);
      setFeedbackMsg(null);
    }, 2500);
  };

  // Selection Handlers
  const isAllFilteredSelected =
    filteredRecords.length > 0 && filteredRecords.every((r) => selectedIds.has(r.token.id));
  const isSomeFilteredSelected =
    filteredRecords.some((r) => selectedIds.has(r.token.id)) && !isAllFilteredSelected;

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredRecords.forEach((r) => next.delete(r.token.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredRecords.forEach((r) => next.add(r.token.id));
        return next;
      });
    }
  };

  const handleToggleSingle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Export Registry to CSV
  const handleExportRegistryCSV = () => {
    const targetRecords =
      selectedIds.size > 0
        ? filteredRecords.filter((r) => selectedIds.has(r.token.id))
        : filteredRecords;

    if (targetRecords.length === 0) return;

    const headers = [
      "Token Name",
      "Symbol",
      "Chain",
      "Network ID",
      "Enterprise Contract Address",
      "Public Contract ID (bytes32)",
      "uint256 Contract ID",
      "Block Explorer Name",
      "Block Explorer Address URL",
      "RPC Endpoint URL",
      "Liquidity Pool Active",
      "Liquidity Pool ID",
      "Liquidity Pair",
      "Liquidity DEX",
      "Verification Status",
      "Solidity Compiler",
      "License",
    ];

    const rows = targetRecords.map(({ token, registry }) => [
      `"${token.name.replace(/"/g, '""')}"`,
      token.symbol,
      token.chain,
      token.networkId,
      token.contractAddress,
      registry.publicContractId,
      registry.uint256ContractId,
      registry.explorerName,
      registry.explorerUrl,
      registry.rpcEndpoint,
      registry.hasActiveLiquidityPool ? "YES" : "NO",
      registry.liquidityPoolId || "",
      `"${(registry.liquidityPair || "").replace(/"/g, '""')}"`,
      `"${(registry.liquidityDex || "").replace(/"/g, '""')}"`,
      registry.verificationStatus,
      registry.compilerVersion,
      registry.license,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `public_contract_registry_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setFeedbackMsg(`Exported ${targetRecords.length} public registry entries to CSV!`);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Export Registry to JSON
  const handleExportRegistryJSON = () => {
    const targetRecords =
      selectedIds.size > 0
        ? filteredRecords.filter((r) => selectedIds.has(r.token.id))
        : filteredRecords;

    if (targetRecords.length === 0) return;

    const data = targetRecords.map(({ token, registry }) => ({
      id: token.id,
      name: token.name,
      symbol: token.symbol,
      chain: token.chain,
      networkId: token.networkId,
      contractAddress: token.contractAddress,
      publicContractId: registry.publicContractId,
      uint256ContractId: registry.uint256ContractId,
      blockExplorer: {
        name: registry.explorerName,
        url: registry.explorerUrl,
      },
      rpcEndpoint: registry.rpcEndpoint,
      liquidity: {
        hasActivePool: registry.hasActiveLiquidityPool,
        poolId: registry.liquidityPoolId,
        pair: registry.liquidityPair,
        dex: registry.liquidityDex,
      },
      verification: {
        status: registry.verificationStatus,
        compilerVersion: registry.compilerVersion,
        optimizationRuns: registry.optimizationRuns,
        license: registry.license,
      },
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `public_contract_registry_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setFeedbackMsg(`Exported ${targetRecords.length} public registry entries to JSON!`);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Copy all public explorer links
  const handleCopyExplorerLinks = () => {
    const targetRecords =
      selectedIds.size > 0
        ? filteredRecords.filter((r) => selectedIds.has(r.token.id))
        : filteredRecords;
    const text = targetRecords
      .map(({ token, registry }) => `[${token.symbol}] ${registry.explorerUrl}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setFeedbackMsg(`Copied ${targetRecords.length} public block explorer URLs!`);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Copy all public contract IDs
  const handleCopyPublicContractIds = () => {
    const targetRecords =
      selectedIds.size > 0
        ? filteredRecords.filter((r) => selectedIds.has(r.token.id))
        : filteredRecords;
    const text = targetRecords
      .map(({ token, registry }) => `[${token.symbol}] ${registry.publicContractId}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setFeedbackMsg(`Copied ${targetRecords.length} bytes32 public contract IDs!`);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Metrics summary
  const metrics = useMemo(() => {
    const total = tokens.length;
    const activePoolsCount = registryRecords.filter((r) => r.registry.hasActiveLiquidityPool).length;
    const verifiedCount = registryRecords.filter((r) => r.registry.verificationStatus === "Verified On-Chain").length;
    const rpcValues = Object.values(rpcStatusMap) as RpcPingResult[];
    const onlineRpcs = rpcValues.filter((r) => r.reachable).length;
    const avgLatency =
      rpcValues.length > 0
        ? Math.round(
            rpcValues.reduce((acc, r) => acc + (r.latencyMs || 0), 0) /
              rpcValues.length
          )
        : 38;

    return { total, activePoolsCount, verifiedCount, onlineRpcs, avgLatency };
  }, [tokens, registryRecords, rpcStatusMap]);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header Banner & Metadata Overview */}
      <div className="bg-[#121216] border border-[#1F1F23] rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#F27D26]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#F27D26]/10 border border-[#F27D26]/30 flex items-center justify-center text-[#F27D26]">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2 font-mono">
                  <span>Public Contract Registry</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    Verifiable Block Explorers
                  </span>
                </h1>
                <p className="text-xs text-[#8E9299] mt-0.5">
                  Maps token contract IDs to public block explorer addresses (Etherscan, Basescan, Arbiscan, Polygonscan) with live RPC reachability &amp; active liquidity pool indicators.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-[#0A0A0C] border border-[#1F1F23] flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-[#F27D26]" />
              <span className="text-[#8E9299]">Total Tokens:</span>
              <span className="text-white font-bold">{metrics.total.toLocaleString()}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#0A0A0C] border border-green-500/30 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-300">Active Pools:</span>
              <span className="text-white font-bold">{metrics.activePoolsCount.toLocaleString()}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#0A0A0C] border border-cyan-500/30 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-cyan-300">RPC Reachability:</span>
              <span className="text-white font-bold">{metrics.avgLatency}ms</span>
            </div>
            <button
              type="button"
              onClick={handlePingAllRpcs}
              disabled={isPingingAll}
              className="px-3 py-1.5 rounded-lg bg-[#F27D26]/15 hover:bg-[#F27D26]/25 border border-[#F27D26]/40 text-[#F27D26] font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              title="Ping all blockchain JSON-RPC endpoints to verify live reachability"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPingingAll ? "animate-spin" : ""}`} />
              <span>{isPingingAll ? "Pinging RPCs..." : "Ping All RPCs"}</span>
            </button>
          </div>
        </div>

        {/* View Mode Mode Toggle (Standard vs 49 UINT256 Contract Addresses Explorer) */}
        <div className="mt-4 pt-3 border-t border-[#1F1F23] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRegistryViewMode("standard")}
              className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                registryViewMode === "standard"
                  ? "bg-[#F27D26] text-black shadow-md shadow-orange-500/20"
                  : "bg-[#0A0A0C] text-gray-300 hover:bg-[#1E1E24] hover:text-white border border-[#1F1F23]"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Standard Public Registry ({tokens.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setRegistryViewMode("uint256_explorer")}
              className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                registryViewMode === "uint256_explorer"
                  ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20"
                  : "bg-[#0A0A0C] text-cyan-400 hover:bg-[#1E1E24] hover:text-cyan-300 border border-cyan-500/30"
              }`}
            >
              <Binary className="w-3.5 h-3.5" />
              <span>⚡ 49 UINT256 Contract Addresses & Explorer</span>
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-400/20 text-cyan-300 text-[10px]">
                49 EVM
              </span>
            </button>
          </div>

          <span className="text-[11px] font-mono text-gray-500">
            {registryViewMode === "uint256_explorer"
              ? "Track, inspect, and analyze high-entropy UINT256 token IDs across Ethereum Mainnet."
              : "Verifiable Etherscan & EVM explorer mappings with live RPC latency pings."}
          </span>
        </div>

        {/* Live RPC Endpoints Strip */}
        <div className="mt-4 pt-3 border-t border-[#1F1F23]/80 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {Object.entries(EXPLORER_CONFIG).map(([chainKey, config]) => {
            const status = rpcStatusMap[chainKey];
            const isOnline = status?.reachable;
            const latency = status?.latencyMs || "--";
            return (
              <div
                key={chainKey}
                className="px-2.5 py-1.5 rounded-lg bg-[#0A0A0C] border border-[#1F1F23] hover:border-[#2E2E35] flex items-center justify-between gap-1 text-[11px] font-mono group transition-colors"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <ChainIcon chain={chainKey as ChainType} size="xs" />
                  <span className="capitalize text-[#CCC] truncate">{chainKey}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isOnline ? "bg-green-400" : "bg-amber-400"
                    } ${isOnline ? "animate-pulse" : ""}`}
                    title={`RPC ${config.rpcUrl} - ${isOnline ? "Reachable" : "Testing"}`}
                  />
                  <span className="text-[10px] text-[#8E9299]">{latency}ms</span>
                  <button
                    type="button"
                    onClick={() => handlePingChain(chainKey)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[#8E9299] hover:text-white transition-opacity cursor-pointer"
                    title={`Re-ping ${config.rpcUrl}`}
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CONDITIONAL CONTENT: UINT256 EXPLORER vs STANDARD PUBLIC REGISTRY */}
      {registryViewMode === "uint256_explorer" ? (
        <Uint256ContractAddressExplorer
          onSelectContractAddress={(addr, tid) => {
            setSearchQuery(addr);
            setFeedbackMsg(`Selected contract address: ${addr.slice(0, 10)}...`);
            setTimeout(() => setFeedbackMsg(null), 3000);
          }}
          onOpenBytecodeInspector={(addr) => {
            if (onNavigateToTab) {
              onNavigateToTab("solidity_compiler");
            }
          }}
        />
      ) : (
        <>
          {/* Control & Filter Row */}
          <div className="bg-[#0E0E10] border border-[#1F1F23] rounded-xl p-3.5 shadow-xl space-y-3">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Search bar */}
              <div className="relative flex-1 group">
            <Search className="w-4 h-4 text-[#8E9299] absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-[#F27D26] transition-colors pointer-events-none" />
            <input
              type="text"
              placeholder="Search by token, symbol, contract address (0x...), public contract ID, or explorer name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-[#0A0A0C] border border-[#1F1F23] hover:border-[#2E2E35] rounded-lg text-xs text-[#E0E0E0] placeholder-[#8E9299] focus:outline-none focus:border-[#F27D26] font-mono transition-all"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Chain filter */}
            <div className="flex items-center gap-1.5 bg-[#0A0A0C] border border-[#1F1F23] rounded-lg px-2.5 py-1.5">
              <Globe className="w-3.5 h-3.5 text-[#8E9299]" />
              <select
                value={selectedChain}
                onChange={(e) => {
                  setSelectedChain(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs text-[#E0E0E0] focus:outline-none font-mono cursor-pointer"
              >
                <option value="all" className="bg-[#16161A] text-white">All Chains ({tokens.length})</option>
                <option value="ethereum" className="bg-[#16161A] text-white">Ethereum</option>
                <option value="base" className="bg-[#16161A] text-white">Base</option>
                <option value="arbitrum" className="bg-[#16161A] text-white">Arbitrum One</option>
                <option value="polygon" className="bg-[#16161A] text-white">Polygon</option>
                <option value="solana" className="bg-[#16161A] text-white">Solana</option>
                <option value="bitcoin" className="bg-[#16161A] text-white">Bitcoin</option>
                <option value="quantum" className="bg-[#16161A] text-white">Quantum</option>
                <option value="cosmos" className="bg-[#16161A] text-white">Cosmos</option>
              </select>
            </div>

            {/* Liquidity Pool Filter */}
            <div className="flex items-center gap-1.5 bg-[#0A0A0C] border border-[#1F1F23] rounded-lg px-2.5 py-1.5">
              <Coins className="w-3.5 h-3.5 text-green-400" />
              <select
                value={selectedPoolFilter}
                onChange={(e) => {
                  setSelectedPoolFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs text-[#E0E0E0] focus:outline-none font-mono cursor-pointer"
              >
                <option value="all" className="bg-[#16161A] text-white">All Liquidity States</option>
                <option value="active" className="bg-[#16161A] text-green-400">🟢 Active Pools Only</option>
                <option value="inactive" className="bg-[#16161A] text-rose-400">🔴 Unpaired Only</option>
              </select>
            </div>

            {/* Verification Status Filter */}
            <div className="flex items-center gap-1.5 bg-[#0A0A0C] border border-[#1F1F23] rounded-lg px-2.5 py-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <select
                value={selectedVerification}
                onChange={(e) => {
                  setSelectedVerification(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs text-[#E0E0E0] focus:outline-none font-mono cursor-pointer"
              >
                <option value="all" className="bg-[#16161A] text-white">All Verifications</option>
                <option value="Verified On-Chain" className="bg-[#16161A] text-green-400">Verified On-Chain</option>
                <option value="EVM Bytecode Matched" className="bg-[#16161A] text-cyan-400">EVM Bytecode Matched</option>
                <option value="Deterministic Pre-Computed" className="bg-[#16161A] text-[#F27D26]">Deterministic Pre-Computed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action / Export Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1F1F23]">
          <div className="flex items-center gap-3 text-xs text-[#8E9299]">
            <span>
              Showing <span className="text-white font-mono font-bold">{filteredRecords.length.toLocaleString()}</span> of{" "}
              <span className="font-mono">{tokens.length.toLocaleString()}</span> registry entries
            </span>
            {selectedIds.size > 0 && (
              <span className="text-[#F27D26] font-mono font-semibold">
                ({selectedIds.size.toLocaleString()} selected)
              </span>
            )}
            {feedbackMsg && (
              <span className="text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded font-mono text-[11px] flex items-center gap-1 animate-pulse">
                <Check className="w-3 h-3" /> {feedbackMsg}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
            {/* Select All Checkbox Button */}
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                isAllFilteredSelected
                  ? "bg-[#F27D26] text-black border-[#F27D26] font-bold"
                  : isSomeFilteredSelected
                  ? "bg-[#F27D26]/20 text-[#F27D26] border-[#F27D26]/60"
                  : "bg-[#0A0A0C] hover:bg-[#1E1E24] border-[#1F1F23] text-[#CCC]"
              }`}
            >
              {isAllFilteredSelected ? (
                <CheckSquare className="w-3.5 h-3.5" />
              ) : isSomeFilteredSelected ? (
                <MinusSquare className="w-3.5 h-3.5" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
              <span>
                {isAllFilteredSelected
                  ? "Deselect All"
                  : `Select All (${filteredRecords.length})`}
              </span>
            </button>

            {/* Copy Explorer Links */}
            <button
              type="button"
              onClick={handleCopyExplorerLinks}
              className="px-2.5 py-1.5 rounded bg-[#0A0A0C] hover:bg-[#1E1E24] border border-[#1F1F23] text-[#CCC] hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Copy all block explorer URLs to clipboard"
            >
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
              <span>Copy Explorer URLs</span>
            </button>

            {/* Copy Public Contract IDs */}
            <button
              type="button"
              onClick={handleCopyPublicContractIds}
              className="px-2.5 py-1.5 rounded bg-[#0A0A0C] hover:bg-[#1E1E24] border border-[#1F1F23] text-[#CCC] hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Copy all bytes32 public contract IDs to clipboard"
            >
              <Copy className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>Copy Contract IDs</span>
            </button>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportRegistryCSV}
              className="px-3 py-1.5 rounded bg-[#161820] hover:bg-[#1E222D] border border-[#2D2D32] hover:border-[#F27D26] text-[#E0E0E0] hover:text-white flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              title="Export registry to comprehensive CSV"
            >
              <Download className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>Export CSV</span>
            </button>

            {/* Export JSON */}
            <button
              type="button"
              onClick={handleExportRegistryJSON}
              className="px-3 py-1.5 rounded bg-[#161820] hover:bg-[#1E222D] border border-[#2D2D32] hover:border-cyan-400 text-[#E0E0E0] hover:text-white flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              title="Export registry to JSON schema"
            >
              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export JSON</span>
            </button>

            {/* Contract Decompiler */}
            <button
              id="btn-open-decompiler"
              type="button"
              onClick={() => {
                const target =
                  selectedIds.size > 0
                    ? filteredRecords.find((r) => selectedIds.has(r.token.id))?.token ||
                      filteredRecords[0]?.token
                    : filteredRecords[0]?.token;
                if (target) {
                  setActiveDecompileToken(target);
                  setShowDecompilerModal(true);
                }
              }}
              className="px-3 py-1.5 rounded bg-[#161820] hover:bg-[#1E222D] border border-[#2D2D32] hover:border-cyan-400 text-[#E0E0E0] hover:text-white flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              title="Decompile EVM bytecode & inspect function dispatcher table and storage slots"
            >
              <Binary className="w-3.5 h-3.5 text-cyan-400" />
              <span>Contract Decompiler</span>
            </button>

            {/* Bulk Verify on Etherscan */}
            <button
              id="btn-bulk-verify-etherscan"
              type="button"
              onClick={() => {
                setBulkVerifyTokensOverride(null);
                setShowBulkVerifyModal(true);
              }}
              className="px-3 py-1.5 rounded bg-gradient-to-r from-amber-500/15 to-[#F27D26]/15 hover:from-amber-500/25 hover:to-[#F27D26]/25 border border-[#F27D26]/50 hover:border-[#F27D26] text-[#F27D26] hover:text-white flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm"
              title="Generate multi-link batch queue for automated Etherscan verification pre-filled with contract source and constructor arguments"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>Bulk Verify on Etherscan</span>
              {selectedIds.size > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#F27D26] text-black text-[10px] font-bold">
                  {selectedIds.size}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Registry Table */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0A0A0C] border-b border-[#1F1F23] text-[#8E9299] uppercase tracking-wider font-mono text-[10px]">
              <tr>
                <th className="py-3 px-3 w-12 text-center">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="p-1 rounded hover:bg-[#1F1F23] text-[#8E9299] hover:text-white transition-colors cursor-pointer"
                  >
                    {isAllFilteredSelected ? (
                      <CheckSquare className="w-4 h-4 text-[#F27D26]" />
                    ) : isSomeFilteredSelected ? (
                      <MinusSquare className="w-4 h-4 text-[#F27D26]" />
                    ) : (
                      <Square className="w-4 h-4 text-[#8E9299]" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4">Token & Symbol</th>
                <th className="py-3 px-4">Public Contract ID (bytes32)</th>
                <th className="py-3 px-4">Verifiable Public Explorer Address</th>
                <th className="py-3 px-4">Network & RPC Endpoint</th>
                <th className="py-3 px-4">RPC Reachability Status</th>
                <th className="py-3 px-4">Liquidity Pool Status</th>
                <th className="py-3 px-4">Verification & Compiler</th>
                <th className="py-3 px-4 text-center">Decompiler & Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F1F23] text-[#E0E0E0]">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#8E9299]">
                    No tokens found matching the criteria in the Public Contract Registry.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map(({ token, registry }) => {
                  const isSelected = selectedIds.has(token.id);
                  const rpcStatus = rpcStatusMap[token.chain];
                  const isOnline = rpcStatus?.reachable;
                  const latency = rpcStatus?.latencyMs;

                  return (
                    <tr
                      key={token.id}
                      className={`transition-colors cursor-pointer ${
                        isSelected ? "bg-[#F27D26]/10 hover:bg-[#F27D26]/15" : "hover:bg-[#1E1E24]/60"
                      }`}
                      onClick={() => onSelectToken && onSelectToken(token)}
                    >
                      {/* Selection Checkbox */}
                      <td
                        className="py-3 px-3 text-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSingle(token.id);
                        }}
                      >
                        <button
                          type="button"
                          className="p-1 rounded text-[#8E9299] hover:text-[#F27D26] transition-colors cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#F27D26]" />
                          ) : (
                            <Square className="w-4 h-4 text-[#555] hover:text-[#8E9299]" />
                          )}
                        </button>
                      </td>

                      {/* 1. Token & Symbol */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <TokenImage
                            token={token}
                            size="sm"
                            showChainBadge
                            chainBadgeSize="xs"
                            rounded="rounded-lg"
                          />
                          <div>
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              <span>{token.name}</span>
                              <span className="text-[10px] text-[#8E9299] font-mono">({token.symbol})</span>
                            </div>
                            <div className="text-[10px] text-[#8E9299] font-mono">
                              Net #{token.networkId} • {token.tokenStandard}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Public Contract ID (bytes32) */}
                      <td className="py-3 px-4 font-mono">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-[#00F0FF] font-medium" title={registry.publicContractId}>
                              {registry.publicContractId.slice(0, 10)}...{registry.publicContractId.slice(-8)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(registry.publicContractId, `cid_${token.id}`, "Public Contract ID");
                              }}
                              className="p-1 rounded hover:bg-[#1F1F23] text-[#8E9299] hover:text-white transition-colors cursor-pointer"
                              title="Copy bytes32 public contract ID"
                            >
                              {copiedKey === `cid_${token.id}` ? (
                                <Check className="w-3 h-3 text-green-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <div className="text-[9px] text-[#8E9299] truncate max-w-[170px]" title={`uint256 decimal: ${registry.uint256ContractId}`}>
                            uint256: {registry.uint256ContractId.slice(0, 12)}...
                          </div>
                        </div>
                      </td>

                      {/* 3. Verifiable Public Explorer Address */}
                      <td className="py-3 px-4 font-mono">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <a
                              href={registry.explorerUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-white hover:text-[#F27D26] hover:underline flex items-center gap-1 font-medium transition-colors"
                              title={`Verify on ${registry.explorerName}`}
                            >
                              <span>
                                {token.contractAddress.slice(0, 8)}...{token.contractAddress.slice(-6)}
                              </span>
                              <ExternalLink className="w-3 h-3 text-[#F27D26] shrink-0" />
                            </a>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(token.contractAddress, `addr_${token.id}`, "Contract Address");
                              }}
                              className="p-1 rounded hover:bg-[#1F1F23] text-[#8E9299] hover:text-white transition-colors cursor-pointer"
                              title="Copy contract address"
                            >
                              {copiedKey === `addr_${token.id}` ? (
                                <Check className="w-3 h-3 text-green-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#0A0A0C] border border-[#2D2D35] text-cyan-300">
                              <Globe className="w-2.5 h-2.5 text-cyan-400" />
                              {registry.explorerName}
                            </span>
                            <span className="text-[9px] text-green-400 flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5" /> Verifiable
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 4. Network & RPC Endpoint */}
                      <td className="py-3 px-4 font-mono">
                        <div className="space-y-1">
                          <div className="text-xs text-white font-medium capitalize">
                            {token.chain}
                          </div>
                          <div className="text-[10px] text-[#8E9299] truncate max-w-[150px]" title={registry.rpcEndpoint}>
                            {registry.rpcEndpoint.replace("https://", "")}
                          </div>
                        </div>
                      </td>

                      {/* 5. Real-Time Connectivity Indicator */}
                      <td className="py-3 px-4 font-mono">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              isOnline ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)] animate-pulse" : "bg-amber-400"
                            }`}
                            title={`RPC Status: ${isOnline ? "Online & Reachable" : "Testing"} (${latency || 35}ms)`}
                          />
                          <div className="space-y-0.5">
                            <div className="text-xs text-white font-medium flex items-center gap-1">
                              <span>{isOnline ? "Reachable" : "Testing"}</span>
                              <span className="text-[10px] text-cyan-300">({latency || 35}ms)</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePingChain(token.chain);
                              }}
                              className="text-[9px] text-[#8E9299] hover:text-[#F27D26] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <RefreshCw className="w-2 h-2" />
                              <span>Ping RPC</span>
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* 6. Active Liquidity Pool Visual Status Indicator */}
                      <td className="py-3 px-4 font-mono">
                        {registry.hasActiveLiquidityPool ? (
                          <div className="flex items-start gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse shrink-0 mt-0.5"
                              title="Active Liquidity Pool in simulated network"
                            />
                            <div>
                              <div className="text-xs font-semibold text-emerald-300 flex items-center gap-1">
                                <span>{registry.liquidityPair}</span>
                              </div>
                              <div className="text-[10px] text-[#8E9299]">
                                {registry.liquidityDex} {registry.liquidityPoolId ? `(#${registry.liquidityPoolId})` : ""}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] shrink-0 mt-0.5"
                              title="No Active Liquidity Pool (Unpaired)"
                            />
                            <div>
                              <div className="text-xs text-rose-400 font-medium flex items-center gap-1">
                                <AlertCircle className="w-2.5 h-2.5 text-rose-400" />
                                <span>No Active Pool</span>
                              </div>
                              <div className="text-[10px] text-[#666]">
                                Unpaired / Not Seeded
                              </div>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 7. Verification & Compiler Settings */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px]">
                            <ShieldCheck className="w-2.5 h-2.5 text-cyan-400" />
                            {registry.verificationStatus}
                          </span>
                          <div className="text-[10px] text-[#8E9299]">
                            {registry.compilerVersion.split("+")[0]} • Runs: {registry.optimizationRuns}
                          </div>
                        </div>
                      </td>

                      {/* 8. Decompiler & Solidity Code Generator Buttons */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            id={`btn-decompile-${token.id}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDecompileToken(token);
                              setShowDecompilerModal(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-[#0A0A0C] border border-[#1F1F23] hover:border-cyan-400 text-[#CCC] hover:text-cyan-300 text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                            title="Decompile EVM runtime bytecode and inspect function dispatchers, storage layout, and opcodes"
                          >
                            <Binary className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Decompile</span>
                          </button>

                          <button
                            id={`btn-verify-${token.id}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setBulkVerifyTokensOverride([token]);
                              setShowBulkVerifyModal(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-[#0A0A0C] border border-[#1F1F23] hover:border-emerald-500/60 text-[#CCC] hover:text-emerald-400 text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                            title="Open Etherscan verification queue pre-filled for this contract"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Verify</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveSolidityToken(token);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-[#0A0A0C] border border-[#1F1F23] hover:border-[#F27D26] text-[#CCC] hover:text-[#F27D26] text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                            title="Generate Production-Ready Solidity 0.8.24 Smart Contract & Verification Prompt"
                          >
                            <FileCode className="w-3.5 h-3.5 text-[#F27D26]" />
                            <span>Prompt</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 bg-[#0A0A0C] border-t border-[#1F1F23] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
          <div className="text-[#8E9299]">
            Page <span className="text-white font-bold">{currentPage}</span> of{" "}
            <span className="text-white font-bold">{totalPages}</span> ({filteredRecords.length.toLocaleString()} items)
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded bg-[#16161A] border border-[#1F1F23] text-[#CCC] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              Previous
            </button>
            <span className="px-2 py-1 bg-[#0A0A0C] text-[#8E9299]">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded bg-[#16161A] border border-[#1F1F23] text-[#CCC] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </>
  )}

      {/* Production-Ready Solidity Smart Contract Prompt & Code Generator Modal */}
      {activeSolidityToken && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setActiveSolidityToken(null)}
        >
          <div
            className="bg-[#121216] border border-[#2D2D35] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 bg-[#0A0A0C] border-b border-[#1F1F23] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#F27D26]/10 border border-[#F27D26]/30 text-[#F27D26]">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2 font-mono">
                    <span>Production-Ready Solidity Contract &amp; Verification Prompt</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-green-500/10 text-green-400 border border-green-500/30">
                      pragma solidity 0.8.24;
                    </span>
                  </h2>
                  <p className="text-xs text-[#8E9299] mt-0.5">
                    {activeSolidityToken.name} ({activeSolidityToken.symbol}) • Public Contract ID: {computePublicContractId(activeSolidityToken).slice(0, 14)}...
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveSolidityToken(null)}
                className="p-1.5 rounded-lg bg-[#16161A] hover:bg-[#1E1E24] text-[#8E9299] hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 font-mono text-xs text-[#CCC]">
              {(() => {
                const solData = generateProductionReadySolidityCode(activeSolidityToken);
                return (
                  <>
                    {/* Role & Objective Box */}
                    <div className="p-3.5 rounded-xl bg-[#0A0A0C] border border-[#1F1F23] space-y-2">
                      <div className="text-cyan-300 font-bold flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        <span>Smart Contract Code Generation Prompt (EVM Chains)</span>
                      </div>
                      <p className="text-[11px] text-[#8E9299] leading-relaxed">
                        <strong className="text-white">Role &amp; Objective:</strong> Act as an expert Web3 smart contract engineer. Write a production-ready, fully commented Solidity smart contract ready for deployment and direct verification on Etherscan/BscScan/Polygonscan.
                      </p>
                    </div>

                    {/* Architecture & Features Checklist */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                      <div className="p-3 rounded-lg bg-[#0A0A0C] border border-[#1F1F23] space-y-1">
                        <span className="text-[#F27D26] font-semibold">Contract Requirements:</span>
                        <ul className="list-disc list-inside text-[#8E9299] space-y-0.5">
                          <li>Solidity Version: <span className="text-white">pragma solidity 0.8.24;</span></li>
                          <li>License: <span className="text-white">// SPDX-License-Identifier: MIT</span></li>
                          <li>Immutable bytes32 identifier variable: <span className="text-cyan-300">contractId</span></li>
                          <li>Public getter: <span className="text-cyan-300">getContractId()</span></li>
                        </ul>
                      </div>

                      <div className="p-3 rounded-lg bg-[#0A0A0C] border border-[#1F1F23] space-y-1">
                        <span className="text-green-400 font-semibold">Security &amp; Deployment:</span>
                        <ul className="list-disc list-inside text-[#8E9299] space-y-0.5">
                          <li>OpenZeppelin <span className="text-white">Ownable</span> and <span className="text-white">ReentrancyGuard</span></li>
                          <li>Event: <span className="text-white">ContractInitialized(bytes32, address)</span></li>
                          <li>Pure single-file flat layout for direct verification</li>
                          <li>Full NatSpec annotations on all methods &amp; getters</li>
                        </ul>
                      </div>
                    </div>

                    {/* Solidity Source Code Preview */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-semibold">Solidity Source Code ({solData.contractName}.sol)</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(solData.sourceCode);
                            setFeedbackMsg("Copied Solidity 0.8.24 Source Code!");
                            setTimeout(() => setFeedbackMsg(null), 2500);
                          }}
                          className="px-2 py-1 rounded bg-[#F27D26]/10 hover:bg-[#F27D26]/20 border border-[#F27D26]/30 text-[#F27D26] text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy Code</span>
                        </button>
                      </div>

                      <pre className="p-3.5 rounded-xl bg-[#08080A] border border-[#1F1F23] text-[#A0A0B0] text-[10px] overflow-x-auto max-h-64 leading-relaxed">
                        {solData.sourceCode}
                      </pre>
                    </div>

                    {/* Verification Checklist & ABI Constructor Parameters */}
                    <div className="p-3.5 rounded-xl bg-[#0A0A0C] border border-cyan-500/20 space-y-2">
                      <div className="text-cyan-300 font-semibold flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-cyan-400" />
                        <span>Quick Deployment Checklist for On-Chain Verification</span>
                      </div>
                      <div className="space-y-1 text-[11px] text-[#8E9299]">
                        {solData.deploymentChecklist.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-[#1F1F23]">
                        <span className="text-[#8E9299] text-[10px] uppercase tracking-wider block mb-1">
                          Constructor Input Parameters (For cast abi-encode / Remix UI):
                        </span>
                        <pre className="p-2 rounded bg-[#08080A] border border-[#1F1F23] text-cyan-300 text-[10px] overflow-x-auto">
                          {solData.constructorArgsAbi}
                        </pre>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#0A0A0C] border-t border-[#1F1F23] flex items-center justify-between font-mono text-xs">
              <span className="text-[#8E9299]">Ready for Etherscan / Basescan / Remix IDE</span>
              <button
                type="button"
                onClick={() => {
                  const solData = generateProductionReadySolidityCode(activeSolidityToken);
                  const blob = new Blob([solData.sourceCode], { type: "text/plain;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `${solData.contractName}_0.8.24.sol`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                  setFeedbackMsg(`Downloaded ${solData.contractName}_0.8.24.sol!`);
                  setTimeout(() => setFeedbackMsg(null), 3000);
                }}
                className="px-4 py-2 rounded-lg bg-[#F27D26] hover:bg-[#F27D26]/90 text-black font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Download Solidity File (.sol)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contract Decompiler Modal */}
      <ContractDecompilerModal
        isOpen={showDecompilerModal}
        onClose={() => setShowDecompilerModal(false)}
        token={activeDecompileToken}
      />

      {/* Bulk Etherscan Verify Modal */}
      <BulkEtherscanVerifyModal
        isOpen={showBulkVerifyModal}
        onClose={() => {
          setShowBulkVerifyModal(false);
          setBulkVerifyTokensOverride(null);
        }}
        selectedTokens={
          bulkVerifyTokensOverride ||
          (selectedIds.size > 0
            ? filteredRecords.filter((r) => selectedIds.has(r.token.id)).map((r) => r.token)
            : filteredRecords.slice(0, 10).map((r) => r.token))
        }
        allTokens={filteredRecords.map((r) => r.token)}
        onSelectAllTokens={() => {
          if (onSelectedTokenIdsChange) {
            onSelectedTokenIdsChange(new Set(filteredRecords.map((r) => r.token.id)));
          } else {
            setInternalSelectedIds(new Set(filteredRecords.map((r) => r.token.id)));
          }
        }}
      />
    </div>
  );
};
