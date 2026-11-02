import React, { useMemo, useState, useEffect } from "react";
import { ChainType, TokenStandard, TokenRecord } from "../types";
import { ChainIcon } from "./ChainIcon";
import {
  Search,
  X,
  Eye,
  EyeOff,
  Filter,
  Layers,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
  Check,
  Zap,
  Globe,
  Coins,
  Clock,
  History,
  Trash2,
  ArrowRight,
  Bookmark,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  MinusSquare,
} from "lucide-react";

export interface FilterHistoryItem {
  id: string;
  timestamp: number;
  searchQuery: string;
  chains: ChainType[];
  standards: TokenStandard[];
  matchedCount?: number;
}

export function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 15) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  return `${diffDays}d ago`;
}

export interface ChainOption {
  id: ChainType;
  name: string;
  symbol: string;
  badgeBorder: string;
  badgeBg: string;
  badgeText: string;
  activeBg: string;
  activeBorder: string;
  activeText: string;
  glow: string;
}

export const CHAIN_OPTIONS: ChainOption[] = [
  {
    id: "solana",
    name: "Solana",
    symbol: "SOL",
    badgeBorder: "border-emerald-500/30",
    badgeBg: "bg-emerald-500/10",
    badgeText: "text-emerald-400",
    activeBg: "bg-emerald-500/20",
    activeBorder: "border-emerald-400",
    activeText: "text-emerald-300",
    glow: "shadow-emerald-950/40",
  },
  {
    id: "ethereum",
    name: "Ethereum",
    symbol: "ETH",
    badgeBorder: "border-blue-400/30",
    badgeBg: "bg-blue-400/10",
    badgeText: "text-blue-300",
    activeBg: "bg-blue-500/20",
    activeBorder: "border-blue-400",
    activeText: "text-blue-200",
    glow: "shadow-blue-950/40",
  },
  {
    id: "base",
    name: "Base",
    symbol: "BASE",
    badgeBorder: "border-sky-500/30",
    badgeBg: "bg-sky-500/10",
    badgeText: "text-sky-400",
    activeBg: "bg-sky-500/20",
    activeBorder: "border-sky-400",
    activeText: "text-sky-300",
    glow: "shadow-sky-950/40",
  },
  {
    id: "arbitrum",
    name: "Arbitrum",
    symbol: "ARB",
    badgeBorder: "border-cyan-500/30",
    badgeBg: "bg-cyan-500/10",
    badgeText: "text-cyan-400",
    activeBg: "bg-cyan-500/20",
    activeBorder: "border-cyan-400",
    activeText: "text-cyan-300",
    glow: "shadow-cyan-950/40",
  },
  {
    id: "polygon",
    name: "Polygon",
    symbol: "POL",
    badgeBorder: "border-purple-500/30",
    badgeBg: "bg-purple-500/10",
    badgeText: "text-purple-400",
    activeBg: "bg-purple-500/20",
    activeBorder: "border-purple-400",
    activeText: "text-purple-300",
    glow: "shadow-purple-950/40",
  },
  {
    id: "bitcoin",
    name: "Bitcoin",
    symbol: "BTC",
    badgeBorder: "border-amber-500/30",
    badgeBg: "bg-amber-500/10",
    badgeText: "text-amber-400",
    activeBg: "bg-amber-500/20",
    activeBorder: "border-amber-400",
    activeText: "text-amber-300",
    glow: "shadow-amber-950/40",
  },
  {
    id: "quantum",
    name: "Quantum",
    symbol: "QTM",
    badgeBorder: "border-pink-500/30",
    badgeBg: "bg-pink-500/10",
    badgeText: "text-pink-400",
    activeBg: "bg-pink-500/20",
    activeBorder: "border-pink-400",
    activeText: "text-pink-300",
    glow: "shadow-pink-950/40",
  },
  {
    id: "cosmos",
    name: "Cosmos",
    symbol: "ATOM",
    badgeBorder: "border-indigo-500/30",
    badgeBg: "bg-indigo-500/10",
    badgeText: "text-indigo-400",
    activeBg: "bg-indigo-500/20",
    activeBorder: "border-indigo-400",
    activeText: "text-indigo-300",
    glow: "shadow-indigo-950/40",
  },
];

export interface StandardOption {
  id: TokenStandard;
  name: string;
  category: "fungible" | "nft" | "smart" | "hybrid" | "btc";
  activeBg: string;
  activeBorder: string;
  activeText: string;
}

export const STANDARD_OPTIONS: StandardOption[] = [
  {
    id: "ERC-20",
    name: "ERC-20",
    category: "fungible",
    activeBg: "bg-orange-500/20",
    activeBorder: "border-orange-400",
    activeText: "text-orange-300",
  },
  {
    id: "SPL-Token",
    name: "SPL-Token",
    category: "fungible",
    activeBg: "bg-emerald-500/20",
    activeBorder: "border-emerald-400",
    activeText: "text-emerald-300",
  },
  {
    id: "ERC-721",
    name: "ERC-721",
    category: "nft",
    activeBg: "bg-purple-500/20",
    activeBorder: "border-purple-400",
    activeText: "text-purple-300",
  },
  {
    id: "ERC-1155",
    name: "ERC-1155",
    category: "nft",
    activeBg: "bg-violet-500/20",
    activeBorder: "border-violet-400",
    activeText: "text-violet-300",
  },
  {
    id: "ERC-4337",
    name: "ERC-4337",
    category: "smart",
    activeBg: "bg-cyan-500/20",
    activeBorder: "border-cyan-400",
    activeText: "text-cyan-300",
  },
  {
    id: "Quantum-Hybrid",
    name: "Quantum-Hybrid",
    category: "hybrid",
    activeBg: "bg-rose-500/20",
    activeBorder: "border-rose-400",
    activeText: "text-rose-300",
  },
  {
    id: "BRC-20/Rune",
    name: "BRC-20/Rune",
    category: "btc",
    activeBg: "bg-amber-500/20",
    activeBorder: "border-amber-400",
    activeText: "text-amber-300",
  },
];

export interface TokenFilterBarProps {
  tokens: TokenRecord[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedChains: Set<ChainType>;
  onToggleChain: (chain: ChainType) => void;
  onSelectAllChains: () => void;
  onSoloChain: (chain: ChainType) => void;
  onOnlyEVMChains: () => void;
  selectedStandards: Set<TokenStandard>;
  onToggleStandard: (std: TokenStandard) => void;
  onSelectAllStandards: () => void;
  onSoloStandard: (std: TokenStandard) => void;
  onQuickStandardPreset: (category: "fungible" | "nft" | "smart") => void;
  onResetAllFilters: () => void;
  onApplyFilterCombination?: (combo: {
    searchQuery: string;
    chains: ChainType[];
    standards: TokenStandard[];
  }) => void;
  filteredCount: number;
  totalCount: number;
  selectedTokenIds?: Set<string>;
  onToggleSelectAllTokens?: () => void;
}

const FILTER_HISTORY_KEY = "token_filter_queries_history_v1";

const DEFAULT_INITIAL_HISTORY: FilterHistoryItem[] = [
  {
    id: "hist-preset-sol-spl",
    timestamp: Date.now() - 1000 * 60 * 4,
    searchQuery: "sol",
    chains: ["solana"],
    standards: ["SPL-Token"],
    matchedCount: 28,
  },
  {
    id: "hist-preset-evm-fungible",
    timestamp: Date.now() - 1000 * 60 * 15,
    searchQuery: "",
    chains: ["ethereum", "base", "arbitrum"],
    standards: ["ERC-20"],
    matchedCount: 42,
  },
  {
    id: "hist-preset-nft-multi",
    timestamp: Date.now() - 1000 * 60 * 35,
    searchQuery: "",
    chains: ["ethereum", "polygon", "solana"],
    standards: ["ERC-721", "ERC-1155"],
    matchedCount: 19,
  },
];

export const TokenFilterBar: React.FC<TokenFilterBarProps> = ({
  tokens,
  searchQuery,
  onSearchChange,
  selectedChains,
  onToggleChain,
  onSelectAllChains,
  onSoloChain,
  onOnlyEVMChains,
  selectedStandards,
  onToggleStandard,
  onSelectAllStandards,
  onSoloStandard,
  onQuickStandardPreset,
  onResetAllFilters,
  onApplyFilterCombination,
  filteredCount,
  totalCount,
  selectedTokenIds,
  onToggleSelectAllTokens,
}: TokenFilterBarProps) => {
  const selectedCount = selectedTokenIds ? selectedTokenIds.size : 0;
  const isAllSelected = filteredCount > 0 && selectedCount >= filteredCount;
  const isSomeSelected = selectedCount > 0 && !isAllSelected;

  // Counts per chain in current loaded tokens
  const chainCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const opt of CHAIN_OPTIONS) {
      map[opt.id] = 0;
    }
    for (const t of tokens) {
      if (t.chain) {
        map[t.chain] = (map[t.chain] || 0) + 1;
      }
    }
    return map;
  }, [tokens]);

  // Counts per standard in current loaded tokens
  const standardCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const opt of STANDARD_OPTIONS) {
      map[opt.id] = 0;
    }
    for (const t of tokens) {
      if (t.tokenStandard) {
        map[t.tokenStandard] = (map[t.tokenStandard] || 0) + 1;
      }
    }
    return map;
  }, [tokens]);

  const allChainsSelected = selectedChains.size === CHAIN_OPTIONS.length;
  const allStandardsSelected = selectedStandards.size === STANDARD_OPTIONS.length;
  const isFiltered =
    Boolean(searchQuery.trim()) ||
    !allChainsSelected ||
    !allStandardsSelected;

  // History log state
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [historySearchQuery, setHistorySearchQuery] = useState<string>("");
  const [justAppliedId, setJustAppliedId] = useState<string | null>(null);

  const [historyItems, setHistoryItems] = useState<FilterHistoryItem[]>(() => {
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(FILTER_HISTORY_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.slice(0, 10);
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load filter history from localStorage", e);
    }
    return DEFAULT_INITIAL_HISTORY;
  });

  const persistHistory = (items: FilterHistoryItem[]) => {
    const capped = items.slice(0, 10);
    setHistoryItems(capped);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(FILTER_HISTORY_KEY, JSON.stringify(capped));
      }
    } catch (e) {
      console.warn("Failed to save filter history to localStorage", e);
    }
  };

  const isSameCombo = (
    item: FilterHistoryItem,
    query: string,
    chains: Set<ChainType>,
    standards: Set<TokenStandard>
  ) => {
    if (item.searchQuery.trim().toLowerCase() !== query.trim().toLowerCase()) return false;
    if (item.chains.length !== chains.size) return false;
    if (item.standards.length !== standards.size) return false;
    const chainSet = new Set(item.chains);
    for (const c of chains) {
      if (!chainSet.has(c)) return false;
    }
    const stdSet = new Set(item.standards);
    for (const s of standards) {
      if (!stdSet.has(s)) return false;
    }
    return true;
  };

  // Auto-record to history when a filter is applied (debounced by 1200ms)
  useEffect(() => {
    if (!isFiltered) return;

    const timer = setTimeout(() => {
      setHistoryItems((prev) => {
        if (prev.length > 0 && isSameCombo(prev[0], searchQuery, selectedChains, selectedStandards)) {
          return prev;
        }

        const newItem: FilterHistoryItem = {
          id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
          searchQuery: searchQuery.trim(),
          chains: Array.from(selectedChains),
          standards: Array.from(selectedStandards),
          matchedCount: filteredCount,
        };

        const updated = [
          newItem,
          ...prev.filter((i) => !isSameCombo(i, searchQuery, selectedChains, selectedStandards)),
        ].slice(0, 10);

        try {
          if (typeof window !== "undefined") {
            localStorage.setItem(FILTER_HISTORY_KEY, JSON.stringify(updated));
          }
        } catch (e) {
          console.warn("Failed to persist history", e);
        }
        return updated;
      });
    }, 1200);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedChains, selectedStandards, isFiltered, filteredCount]);

  const handleSaveCurrentFilter = () => {
    if (!isFiltered) return;
    const newItem: FilterHistoryItem = {
      id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      searchQuery: searchQuery.trim(),
      chains: Array.from(selectedChains),
      standards: Array.from(selectedStandards),
      matchedCount: filteredCount,
    };
    const updated = [
      newItem,
      ...historyItems.filter((i) => !isSameCombo(i, searchQuery, selectedChains, selectedStandards)),
    ].slice(0, 10);
    persistHistory(updated);
    setJustAppliedId("current-saved");
    setTimeout(() => setJustAppliedId(null), 1800);
  };

  const handleApplyHistory = (item: FilterHistoryItem) => {
    if (onApplyFilterCombination) {
      onApplyFilterCombination({
        searchQuery: item.searchQuery,
        chains: item.chains,
        standards: item.standards,
      });
    } else {
      onSearchChange(item.searchQuery);
    }
    setJustAppliedId(item.id);
    setTimeout(() => setJustAppliedId(null), 2000);
  };

  const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = historyItems.filter((i) => i.id !== id);
    persistHistory(updated);
  };

  const handleClearHistory = () => {
    persistHistory([]);
  };

  // Search inside history items
  const filteredHistory = useMemo(() => {
    const q = historySearchQuery.trim().toLowerCase();
    if (!q) return historyItems;

    return historyItems.filter((item) => {
      if (item.searchQuery.toLowerCase().includes(q)) return true;
      for (const ch of item.chains) {
        if (ch.toLowerCase().includes(q)) return true;
        const opt = CHAIN_OPTIONS.find((o) => o.id === ch);
        if (opt && (opt.name.toLowerCase().includes(q) || opt.symbol.toLowerCase().includes(q))) {
          return true;
        }
      }
      for (const std of item.standards) {
        if (std.toLowerCase().includes(q)) return true;
      }
      if (`${item.matchedCount} tokens`.includes(q)) return true;
      return false;
    });
  }, [historyItems, historySearchQuery]);

  const quickSearchSuggestions = [
    { label: "Solana", val: "solana" },
    { label: "Ethereum", val: "ethereum" },
    { label: "ERC-20", val: "ERC-20" },
    { label: "SPL-Token", val: "SPL-Token" },
    { label: "ERC-721", val: "ERC-721" },
    { label: "0x Vanity", val: "0x" },
  ];

  return (
    <div
      id="token-explorer-filter-bar"
      className="bg-[#0E0E10] border border-[#1F1F23] rounded-xl p-4 shadow-xl space-y-3.5 transition-all"
    >
      {/* Top Header Row: Title, Search Input & Quick Status */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Left Title with Filter Icon */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#F27D26]/10 border border-[#F27D26]/30 flex items-center justify-center text-[#F27D26]">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Explorer Filter Bar
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#16161A] text-[#8E9299] border border-[#2A2A32]">
                Chain &amp; Standard Toggles
              </span>
            </div>
            <p className="text-[11px] text-[#8E9299]">
              Search and toggle token visibility across chains and standards
            </p>
          </div>
        </div>

        {/* Search Field */}
        <div className="relative flex-1 max-w-xl group">
          <Search className="w-4 h-4 text-[#8E9299] absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-[#F27D26] transition-colors pointer-events-none" />
          <input
            id="input-token-filter-bar-search"
            type="text"
            placeholder="Search tokens by name, symbol, contract (0x...), chain, or standard..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-24 py-2 bg-[#0A0A0C] border border-[#1F1F23] hover:border-[#2E2E35] rounded-lg text-xs text-[#E0E0E0] placeholder-[#8E9299] focus:outline-none focus:border-[#F27D26] focus:ring-1 focus:ring-[#F27D26]/40 font-mono transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              id="btn-clear-filter-search"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[#1E1E24] text-[#8E9299] hover:text-white cursor-pointer transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Match Count, History Button & Reset Button */}
        <div className="flex items-center gap-2 self-end lg:self-auto shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#16161A] border border-[#1F1F23] text-xs font-mono">
            <span className="text-[#8E9299]">Visibility:</span>
            <span
              className={`font-bold ${
                filteredCount === 0
                  ? "text-rose-400"
                  : filteredCount < totalCount
                  ? "text-[#F27D26]"
                  : "text-emerald-400"
              }`}
            >
              {filteredCount.toLocaleString()}
            </span>
            <span className="text-[#666]">/</span>
            <span className="text-[#8E9299]">{totalCount.toLocaleString()}</span>
          </div>

          {/* Enable Checkbox Button: Select All Tokens & Contract IDs */}
          {onToggleSelectAllTokens && (
            <button
              type="button"
              id="btn-filterbar-select-all-tokens"
              onClick={onToggleSelectAllTokens}
              disabled={filteredCount === 0}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                isAllSelected
                  ? "bg-[#F27D26] text-black font-bold shadow-md shadow-[#F27D26]/20 border border-[#F27D26]"
                  : isSomeSelected
                  ? "bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26]/60"
                  : "bg-[#16161A] hover:bg-[#1E1E24] border border-[#1F1F23] hover:border-[#F27D26] text-[#E0E0E0] hover:text-white"
              }`}
              title={
                isAllSelected
                  ? `Deselect all ${filteredCount} tokens & contract IDs`
                  : `Select all ${filteredCount} tokens & contract IDs`
              }
            >
              {isAllSelected ? (
                <CheckSquare className="w-3.5 h-3.5 text-black shrink-0" />
              ) : isSomeSelected ? (
                <MinusSquare className="w-3.5 h-3.5 text-[#F27D26] shrink-0" />
              ) : (
                <Square className="w-3.5 h-3.5 text-[#8E9299] shrink-0" />
              )}
              <span>
                {isAllSelected
                  ? `Deselect All (${filteredCount})`
                  : isSomeSelected
                  ? `Select All (${selectedCount}/${filteredCount})`
                  : `Select All Tokens & IDs`}
              </span>
            </button>
          )}

          {/* Searchable History Log Toggle Button */}
          <button
            type="button"
            id="btn-toggle-filter-history"
            onClick={() => setShowHistory((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 ${
              showHistory
                ? "bg-[#F27D26] text-black font-bold shadow-md shadow-[#F27D26]/20 border border-[#F27D26]"
                : "bg-[#16161A] hover:bg-[#1E1E24] border border-[#1F1F23] text-[#E0E0E0] hover:text-white"
            }`}
            title="Toggle Searchable Filter History Log (Last 10)"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>History</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                showHistory ? "bg-black/20 text-black font-bold" : "bg-[#0A0A0C] text-[#8E9299]"
              }`}
            >
              {historyItems.length}/10
            </span>
            {showHistory ? (
              <ChevronUp className="w-3 h-3 text-black" />
            ) : (
              <ChevronDown className="w-3 h-3 text-[#8E9299]" />
            )}
          </button>

          {isFiltered && (
            <button
              type="button"
              id="btn-reset-all-filters"
              onClick={onResetAllFilters}
              className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 hover:text-white text-xs font-mono font-medium flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              title="Reset search and enable all chains & standards"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All</span>
            </button>
          )}
        </div>
      </div>

      {/* SEARCHABLE HISTORY LOG EXPANDABLE PANEL */}
      {showHistory && (
        <div
          id="panel-filter-history-log"
          className="bg-[#0A0A0C] border border-[#F27D26]/40 rounded-xl p-3.5 shadow-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* History Header & History Search Input */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 pb-2.5 border-b border-[#1F1F23]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#F27D26]/20 text-[#F27D26] flex items-center justify-center">
                <History className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-white font-mono">
                    Filter Query History Log
                  </h4>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#16161A] text-[#8E9299] border border-[#26262E]">
                    Last 10 Queries
                  </span>
                </div>
                <p className="text-[10px] text-[#8E9299]">
                  Search past queries and click any card to instantly re-apply complex filter combinations
                </p>
              </div>
            </div>

            {/* History Search Field & Control Actions */}
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[#8E9299] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="input-search-filter-history"
                  type="text"
                  placeholder="Search history by chain, standard, or keyword..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 bg-[#121216] border border-[#26262E] hover:border-[#383842] rounded-lg text-xs text-[#E0E0E0] placeholder-[#777] focus:outline-none focus:border-[#F27D26] font-mono transition-all"
                />
                {historySearchQuery && (
                  <button
                    type="button"
                    onClick={() => setHistorySearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#777] hover:text-white p-0.5 rounded cursor-pointer"
                    title="Clear history search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Save Current Manual Button */}
              {isFiltered && (
                <button
                  type="button"
                  id="btn-save-current-filter-history"
                  onClick={handleSaveCurrentFilter}
                  className="px-2 py-1.5 rounded-lg bg-[#F27D26]/15 hover:bg-[#F27D26]/25 border border-[#F27D26]/40 text-[#F27D26] hover:text-white text-[11px] font-mono font-medium flex items-center gap-1 shrink-0 cursor-pointer transition-all"
                  title="Save current active filter combination to history log"
                >
                  <Bookmark className="w-3 h-3" />
                  <span>
                    {justAppliedId === "current-saved" ? "Saved!" : "Log Current"}
                  </span>
                </button>
              )}

              {/* Clear History Button */}
              {historyItems.length > 0 && (
                <button
                  type="button"
                  id="btn-clear-all-filter-history"
                  onClick={handleClearHistory}
                  className="px-2 py-1.5 rounded-lg bg-[#16161A] hover:bg-rose-500/20 border border-[#26262E] hover:border-rose-500/40 text-[#8E9299] hover:text-rose-300 text-[11px] font-mono flex items-center gap-1 shrink-0 cursor-pointer transition-all"
                  title="Clear all logged filter queries"
                >
                  <Trash2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Clear Log</span>
                </button>
              )}

              {/* Close Button */}
              <button
                type="button"
                id="btn-close-filter-history"
                onClick={() => setShowHistory(false)}
                className="p-1.5 rounded-lg bg-[#16161A] hover:bg-[#202026] text-[#8E9299] hover:text-white border border-[#26262E] cursor-pointer transition-colors shrink-0"
                title="Close history log"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* History Query Cards Grid */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {filteredHistory.length === 0 ? (
              <div className="py-6 text-center text-xs font-mono text-[#8E9299] bg-[#121216] rounded-lg border border-[#1F1F23] p-4">
                {historySearchQuery ? (
                  <div className="space-y-2">
                    <p className="text-[#E0E0E0]">
                      No filter queries in history match "{historySearchQuery}"
                    </p>
                    <button
                      type="button"
                      onClick={() => setHistorySearchQuery("")}
                      className="px-2.5 py-1 rounded bg-[#1C1C22] hover:bg-[#26262E] text-[#F27D26] border border-[#2D2D38] text-xs cursor-pointer"
                    >
                      Clear History Search
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-[#E0E0E0] font-medium">History log is empty</p>
                    <p className="text-[11px] text-[#666]">
                      As you search or toggle chains and standards, your last 10 filter queries will be automatically saved here.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              filteredHistory.map((item, idx) => {
                const isCurrentCombo = isSameCombo(item, searchQuery, selectedChains, selectedStandards);
                const wasJustApplied = justAppliedId === item.id;
                const isAllChains = item.chains.length === CHAIN_OPTIONS.length;
                const isAllStandards = item.standards.length === STANDARD_OPTIONS.length;

                return (
                  <div
                    key={item.id}
                    id={`filter-history-card-${item.id}`}
                    onClick={() => handleApplyHistory(item)}
                    className={`group relative p-2.5 rounded-lg border text-xs font-mono transition-all cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 ${
                      wasJustApplied
                        ? "bg-emerald-500/15 border-emerald-500/50 shadow-md shadow-emerald-950/30"
                        : isCurrentCombo
                        ? "bg-[#16161C] border-[#F27D26]/50 shadow-sm"
                        : "bg-[#121216] hover:bg-[#16161C] border-[#1F1F26] hover:border-[#2D2D38]"
                    }`}
                  >
                    {/* Left: Index, Time & Criteria Summary */}
                    <div className="flex items-start md:items-center gap-2.5 flex-1 flex-wrap">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="w-5 h-5 rounded bg-[#1C1C24] border border-[#282834] text-[10px] text-[#8E9299] flex items-center justify-center font-bold">
                          #{idx + 1}
                        </span>
                        <span
                          className="text-[10px] text-[#8E9299] flex items-center gap-1 shrink-0"
                          title={new Date(item.timestamp).toLocaleString()}
                        >
                          <Clock className="w-2.5 h-2.5 text-[#666]" />
                          {formatRelativeTime(item.timestamp)}
                        </span>
                      </div>

                      {/* Criteria Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Search Query Tag */}
                        {item.searchQuery ? (
                          <span className="px-2 py-0.5 rounded bg-[#1E1E28] border border-[#2D2D3E] text-white text-[11px] font-medium flex items-center gap-1">
                            <span className="text-[#8E9299] text-[9px]">search:</span>
                            <span className="text-[#F27D26]">"{item.searchQuery}"</span>
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-[#16161A] text-[#666] text-[10px] border border-[#202026]">
                            any query
                          </span>
                        )}

                        {/* Chains Tag */}
                        <div className="flex items-center gap-1 flex-wrap">
                          {isAllChains ? (
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px]">
                              All 8 Chains
                            </span>
                          ) : (
                            item.chains.map((ch) => {
                              const opt = CHAIN_OPTIONS.find((c) => c.id === ch);
                              return (
                                <span
                                  key={ch}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border ${
                                    opt
                                      ? `${opt.badgeBg} ${opt.badgeBorder} ${opt.badgeText}`
                                      : "bg-[#1E1E24] text-[#AAA] border-[#2A2A32]"
                                  }`}
                                >
                                  <ChainIcon chain={ch} size="xs" />
                                  <span>{opt ? opt.name : ch}</span>
                                </span>
                              );
                            })
                          )}
                        </div>

                        {/* Standards Tag */}
                        <div className="flex items-center gap-1 flex-wrap">
                          {isAllStandards ? (
                            <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px]">
                              All 7 Standards
                            </span>
                          ) : (
                            item.standards.map((std) => (
                              <span
                                key={std}
                                className="px-1.5 py-0.5 rounded bg-[#1C1C26] text-[#CCC] border border-[#2E2E3A] text-[10px]"
                              >
                                {std}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Matches & Action Buttons */}
                    <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                      {item.matchedCount !== undefined && (
                        <span className="text-[10px] text-[#8E9299] px-2 py-0.5 rounded bg-[#0E0E12] border border-[#1E1E24]">
                          {item.matchedCount.toLocaleString()} tokens
                        </span>
                      )}

                      {/* Re-apply Action Button */}
                      <button
                        type="button"
                        id={`btn-apply-history-${item.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyHistory(item);
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 cursor-pointer transition-all ${
                          wasJustApplied
                            ? "bg-emerald-500 text-black font-bold"
                            : isCurrentCombo
                            ? "bg-[#25252F] text-[#F27D26] border border-[#F27D26]/40 hover:bg-[#F27D26] hover:text-black"
                            : "bg-[#F27D26]/20 hover:bg-[#F27D26] text-[#F27D26] hover:text-black border border-[#F27D26]/40"
                        }`}
                        title="Re-apply this exact filter combination"
                      >
                        {wasJustApplied ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Applied!</span>
                          </>
                        ) : isCurrentCombo ? (
                          <>
                            <Check className="w-3 h-3 text-[#F27D26]" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <ArrowRight className="w-3 h-3" />
                            <span>Re-apply</span>
                          </>
                        )}
                      </button>

                      {/* Delete this single entry */}
                      <button
                        type="button"
                        id={`btn-delete-history-${item.id}`}
                        onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                        className="p-1 rounded text-[#555] hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                        title="Delete this query from history"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Quick Search Suggestions */}
      <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#666] flex-wrap pt-0.5">
        <span className="text-[10px] uppercase tracking-wider text-[#8E9299]">
          Quick search:
        </span>
        {quickSearchSuggestions.map((s) => (
          <button
            key={s.val}
            type="button"
            onClick={() => onSearchChange(s.val)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer ${
              searchQuery.toLowerCase() === s.val.toLowerCase()
                ? "bg-[#F27D26]/20 border-[#F27D26] text-[#F27D26] font-bold"
                : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white hover:border-[#2E2E35]"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* SECTION 1: Chain Visibility Toggles */}
      <div className="pt-2 border-t border-[#1F1F23]/80 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-[#E0E0E0]">
            <Globe className="w-3.5 h-3.5 text-[#F27D26]" />
            <span>Chain Visibility:</span>
            <span className="text-[10px] text-[#8E9299] font-normal">
              ({selectedChains.size} of {CHAIN_OPTIONS.length} active)
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-mono">
            <button
              type="button"
              id="btn-filter-all-chains"
              onClick={onSelectAllChains}
              className={`px-2 py-0.5 rounded border transition-all cursor-pointer ${
                allChainsSelected
                  ? "bg-[#16161A] border-[#F27D26]/50 text-[#F27D26] font-semibold"
                  : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
              }`}
            >
              All Chains
            </button>
            <button
              type="button"
              id="btn-filter-evm-chains"
              onClick={onOnlyEVMChains}
              className="px-2 py-0.5 rounded bg-[#0A0A0C] border border-[#1F1F23] text-[#8E9299] hover:text-blue-400 hover:border-blue-500/40 transition-all cursor-pointer"
            >
              EVM Only
            </button>
            <button
              type="button"
              id="btn-filter-solana-only"
              onClick={() => onSoloChain("solana")}
              className="px-2 py-0.5 rounded bg-[#0A0A0C] border border-[#1F1F23] text-[#8E9299] hover:text-emerald-400 hover:border-emerald-500/40 transition-all cursor-pointer"
            >
              Solana Only
            </button>
            <button
              type="button"
              id="btn-filter-ethereum-only"
              onClick={() => onSoloChain("ethereum")}
              className="px-2 py-0.5 rounded bg-[#0A0A0C] border border-[#1F1F23] text-[#8E9299] hover:text-blue-300 hover:border-blue-400/40 transition-all cursor-pointer"
            >
              Ethereum Only
            </button>
          </div>
        </div>

        {/* Chain Toggle Buttons Grid / Flex */}
        <div className="flex items-center gap-2 flex-wrap">
          {CHAIN_OPTIONS.map((chain) => {
            const isVisible = selectedChains.has(chain.id);
            const count = chainCounts[chain.id] || 0;

            return (
              <div
                key={chain.id}
                className="group relative flex items-center"
              >
                <button
                  type="button"
                  id={`toggle-chain-${chain.id}`}
                  onClick={() => onToggleChain(chain.id)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-2 cursor-pointer ${
                    isVisible
                      ? `${chain.activeBg} ${chain.activeBorder} ${chain.activeText} font-semibold shadow-sm ${chain.glow}`
                      : "bg-[#0A0A0C] border-[#1F1F23] text-[#555] hover:text-[#8E9299] hover:border-[#2A2A32] opacity-60 hover:opacity-100"
                  }`}
                  title={`${isVisible ? "Hide" : "Show"} tokens on ${chain.name}`}
                >
                  {/* Eye indicator */}
                  {isVisible ? (
                    <Eye className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 shrink-0 text-[#666]" />
                  )}

                  {/* Chain Icon */}
                  <ChainIcon chain={chain.id} size="xs" />

                  <span>{chain.name}</span>

                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      isVisible
                        ? "bg-black/30 text-white font-bold"
                        : "bg-[#16161A] text-[#555]"
                    }`}
                  >
                    {count.toLocaleString()}
                  </span>
                </button>

                {/* Solo / Only Hover Action */}
                <button
                  type="button"
                  id={`solo-chain-${chain.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSoloChain(chain.id);
                  }}
                  className="hidden group-hover:inline-block ml-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#16161A] border border-[#2E2E35] text-[#8E9299] hover:text-white cursor-pointer transition-colors"
                  title={`Show only ${chain.name}`}
                >
                  only
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Standard Type Visibility Toggles */}
      <div className="pt-2 border-t border-[#1F1F23]/80 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-[#E0E0E0]">
            <Coins className="w-3.5 h-3.5 text-[#F27D26]" />
            <span>Standard Type Visibility:</span>
            <span className="text-[10px] text-[#8E9299] font-normal">
              ({selectedStandards.size} of {STANDARD_OPTIONS.length} active)
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-mono">
            <button
              type="button"
              id="btn-filter-all-standards"
              onClick={onSelectAllStandards}
              className={`px-2 py-0.5 rounded border transition-all cursor-pointer ${
                allStandardsSelected
                  ? "bg-[#16161A] border-[#F27D26]/50 text-[#F27D26] font-semibold"
                  : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
              }`}
            >
              All Standards
            </button>
            <button
              type="button"
              id="btn-filter-fungible-standards"
              onClick={() => onQuickStandardPreset("fungible")}
              className="px-2 py-0.5 rounded bg-[#0A0A0C] border border-[#1F1F23] text-[#8E9299] hover:text-orange-300 hover:border-orange-500/40 transition-all cursor-pointer"
            >
              Fungible (ERC-20/SPL)
            </button>
            <button
              type="button"
              id="btn-filter-nft-standards"
              onClick={() => onQuickStandardPreset("nft")}
              className="px-2 py-0.5 rounded bg-[#0A0A0C] border border-[#1F1F23] text-[#8E9299] hover:text-purple-300 hover:border-purple-500/40 transition-all cursor-pointer"
            >
              NFTs (721/1155)
            </button>
            <button
              type="button"
              id="btn-filter-smart-standards"
              onClick={() => onQuickStandardPreset("smart")}
              className="px-2 py-0.5 rounded bg-[#0A0A0C] border border-[#1F1F23] text-[#8E9299] hover:text-cyan-300 hover:border-cyan-500/40 transition-all cursor-pointer"
            >
              ERC-4337 (AA)
            </button>
          </div>
        </div>

        {/* Standard Toggle Buttons Grid / Flex */}
        <div className="flex items-center gap-2 flex-wrap">
          {STANDARD_OPTIONS.map((std) => {
            const isVisible = selectedStandards.has(std.id);
            const count = standardCounts[std.id] || 0;

            return (
              <div
                key={std.id}
                className="group relative flex items-center"
              >
                <button
                  type="button"
                  id={`toggle-standard-${std.id}`}
                  onClick={() => onToggleStandard(std.id)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-2 cursor-pointer ${
                    isVisible
                      ? `${std.activeBg} ${std.activeBorder} ${std.activeText} font-semibold shadow-sm`
                      : "bg-[#0A0A0C] border-[#1F1F23] text-[#555] hover:text-[#8E9299] hover:border-[#2A2A32] opacity-60 hover:opacity-100"
                  }`}
                  title={`${isVisible ? "Hide" : "Show"} ${std.name} tokens`}
                >
                  {/* Eye indicator */}
                  {isVisible ? (
                    <Eye className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 shrink-0 text-[#666]" />
                  )}

                  <span>{std.name}</span>

                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      isVisible
                        ? "bg-black/30 text-white font-bold"
                        : "bg-[#16161A] text-[#555]"
                    }`}
                  >
                    {count.toLocaleString()}
                  </span>
                </button>

                {/* Solo / Only Hover Action */}
                <button
                  type="button"
                  id={`solo-standard-${std.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSoloStandard(std.id);
                  }}
                  className="hidden group-hover:inline-block ml-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#16161A] border border-[#2E2E35] text-[#8E9299] hover:text-white cursor-pointer transition-colors"
                  title={`Show only ${std.name}`}
                >
                  only
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Filter Summary Ribbon (shows when filtered) */}
      {isFiltered && (
        <div className="pt-2 border-t border-[#1F1F23]/60 flex items-center justify-between text-xs font-mono text-[#8E9299] flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[#666] text-[11px]">Active criteria:</span>

            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#16161A] text-white border border-[#2D2D35] text-[11px]">
                <span>Query: "{searchQuery}"</span>
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="hover:text-rose-400 text-[#8E9299]"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {!allChainsSelected && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#16161A] text-white border border-[#2D2D35] text-[11px]">
                <span>
                  Chains: {selectedChains.size} of {CHAIN_OPTIONS.length} visible
                </span>
                <button
                  type="button"
                  onClick={onSelectAllChains}
                  className="hover:text-rose-400 text-[#8E9299]"
                  title="Enable all chains"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {!allStandardsSelected && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#16161A] text-white border border-[#2D2D35] text-[11px]">
                <span>
                  Standards: {selectedStandards.size} of {STANDARD_OPTIONS.length} visible
                </span>
                <button
                  type="button"
                  onClick={onSelectAllStandards}
                  className="hover:text-rose-400 text-[#8E9299]"
                  title="Enable all standards"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          <div className="text-[11px] text-[#F27D26] font-medium">
            Showing {filteredCount} tokens ({totalCount > 0 ? Math.round((filteredCount / totalCount) * 100) : 0}% of dataset)
          </div>
        </div>
      )}
    </div>
  );
};
