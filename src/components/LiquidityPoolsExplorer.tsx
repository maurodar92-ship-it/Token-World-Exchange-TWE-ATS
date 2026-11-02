import React, { useState, useMemo } from "react";
import {
  LIQUIDITY_POOLS_509,
  LIQUIDITY_CATEGORIES,
  LiquidityPoolItem,
} from "../data/liquidityPools509";
import {
  Coins,
  Search,
  Layers,
  Copy,
  Check,
  ExternalLink,
  Filter,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  ArrowRight,
} from "lucide-react";

interface LiquidityPoolsExplorerProps {
  onSelectPool?: (pool: LiquidityPoolItem) => void;
  onOpenLiquidityPoolInit?: () => void;
}

export const LiquidityPoolsExplorer: React.FC<LiquidityPoolsExplorerProps> = ({
  onSelectPool,
  onOpenLiquidityPoolInit,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const filteredPools = useMemo(() => {
    return LIQUIDITY_POOLS_509.filter((pool) => {
      const matchesCat =
        selectedCategory === "all" || pool.categoryKey === selectedCategory;
      if (!matchesCat) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        pool.pair.toLowerCase().includes(q) ||
        pool.dex.toLowerCase().includes(q) ||
        pool.chain.toLowerCase().includes(q) ||
        pool.category.toLowerCase().includes(q) ||
        pool.id.toString() === q.replace("#", "")
      );
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-xl bg-[#0F0F12] border border-[#1F1F23] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-[#F27D26]/10 text-[#F27D26] border border-[#F27D26]/20">
                <Coins className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                509 Liquidity Pool Pairs Catalog
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                509 Pairs Registered
              </span>
            </div>
            <p className="text-xs text-[#8E9299]">
              Comprehensive liquidity pools organized across EVM (Ethereum, Base, Arbitrum, Optimism, BNB, Polygon, Avalanche), Solana, Cosmos IBC, Move (Sui/Aptos), Bitcoin L2s, and Exotic Restaking pools.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-[#8E9299]">
              Showing <strong className="text-white font-mono">{filteredPools.length}</strong> of 509 pools
            </span>
            {onOpenLiquidityPoolInit && (
              <button
                type="button"
                onClick={onOpenLiquidityPoolInit}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-xs font-mono font-bold text-white flex items-center gap-1.5 shadow-md shadow-cyan-950/40 cursor-pointer transition shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                <span>Initialize Pool for Token</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#1F1F23]">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === "all"
                ? "bg-[#F27D26] text-black font-semibold shadow"
                : "bg-[#16161A] text-[#8E9299] hover:text-white border border-[#1F1F23]"
            }`}
          >
            <span>All Ecosystems</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/20 font-mono">
              509
            </span>
          </button>

          {LIQUIDITY_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === cat.key
                  ? "bg-[#F27D26] text-black font-semibold shadow"
                  : "bg-[#16161A] text-[#8E9299] hover:text-white border border-[#1F1F23]"
              }`}
            >
              <span>{cat.label}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/20 font-mono">
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#8E9299] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search 509 pools by pair (e.g. AERO/USDC, SOL/USDC, 3CRV), DEX (Uniswap, Raydium), chain, or #ID..."
            className="w-full bg-[#16161A] border border-[#1F1F23] rounded-lg pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#5A5E66] focus:outline-none focus:border-[#F27D26]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8E9299] hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Grid of Pools */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredPools.map((pool) => (
          <div
            key={pool.id}
            className="p-3.5 rounded-lg bg-[#0F0F12] border border-[#1F1F23] hover:border-[#F27D26]/50 transition flex flex-col justify-between group space-y-2.5"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#16161A] text-[#8E9299] border border-[#1F1F23]">
                  #{pool.id}
                </span>
                <span className="text-[10px] text-[#8E9299] truncate max-w-[120px]" title={pool.category}>
                  {pool.chain}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white group-hover:text-[#F27D26] transition font-mono tracking-tight">
                  {pool.pair}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(pool.pair, `copy_${pool.id}`)}
                  className="p-1 rounded text-[#8E9299] hover:text-white hover:bg-[#16161A]"
                  title="Copy Pair Symbol"
                >
                  {copiedKey === `copy_${pool.id}` ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-[#1F1F23] flex items-center justify-between text-[11px] text-[#8E9299]">
              <span className="truncate text-emerald-400 font-mono text-[10px]" title={pool.dex}>
                {pool.dex}
              </span>
              {onSelectPool && (
                <button
                  type="button"
                  onClick={() => onSelectPool(pool)}
                  className="text-[10px] text-[#F27D26] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                >
                  Pair Token <ArrowRight className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredPools.length === 0 && (
        <div className="text-center py-12 bg-[#0F0F12] border border-[#1F1F23] rounded-xl space-y-2">
          <p className="text-sm text-[#8E9299]">
            No liquidity pool pairs match your filter "{searchQuery}".
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory("all");
              setSearchQuery("");
            }}
            className="text-xs text-[#F27D26] hover:underline font-medium"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
};
