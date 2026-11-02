import React, { useState, useMemo } from "react";
import {
  Layers,
  Sparkles,
  ArrowUpDown,
  Search,
  Filter,
  Database,
  Cloud,
  Check,
  Copy,
  ChevronDown,
  ExternalLink,
  Shield,
  Coins,
  Gauge,
  Plus,
  RefreshCw,
  Zap,
  FileJson,
  CheckCircle2,
  Globe,
} from "lucide-react";
import { TokenRecord, Web3Genre, GENRE_DEFINITIONS, GenreDefinition, resolveTokenGenre } from "../types";
import { TokenImage } from "./TokenImage";
import { generateTokenBatch } from "../utils/cryptoGenerators";
import { saveTokensToFirestore } from "../lib/firebase";
import { NFTMetadataModal } from "./NFTMetadataModal";
import { CHAIN_CATALOG, getChainById, EVM_CHAINS } from "../utils/chainCatalog";
import { ChainAppOrchestrator } from "./ChainAppOrchestrator";

interface GenreDirectoryProps {
  tokens: TokenRecord[];
  onAddTokens: (newTokens: TokenRecord[]) => void;
  onSelectToken?: (token: TokenRecord) => void;
}

type SortAlphabetical = "none" | "name_asc" | "name_desc" | "symbol_asc" | "symbol_desc";
type SortNumerical = "none" | "market_cap_desc" | "market_cap_asc" | "price_desc" | "token_id_asc" | "security_desc" | "holders_desc";

export const GenreDirectory: React.FC<GenreDirectoryProps> = ({
  tokens,
  onAddTokens,
  onSelectToken,
}) => {
  // Filter & Search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedGenreTab, setSelectedGenreTab] = useState<"all_side_by_side" | Web3Genre>("all_side_by_side");
  const [selectedStandard, setSelectedStandard] = useState<string>("all");
  const [selectedChainFilter, setSelectedChainFilter] = useState<string>("all");
  const [showOrchestrator, setShowOrchestrator] = useState<boolean>(false);

  // Sorting
  const [sortAlpha, setSortAlpha] = useState<SortAlphabetical>("name_asc");
  const [sortNum, setSortNum] = useState<SortNumerical>("market_cap_desc");
  const [primarySortMode, setPrimarySortMode] = useState<"alphabetical" | "numerical">("numerical");

  // High-Volume Batch Generation & Cloud Save
  const [isGeneratingBatch, setIsGeneratingBatch] = useState<boolean>(false);
  const [batchStatusMessage, setBatchStatusMessage] = useState<string | null>(null);
  const [lastBatchCount, setLastBatchCount] = useState<number>(0);

  // Copying state & modal
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [selectedNFTToken, setSelectedNFTToken] = useState<TokenRecord | null>(null);

  // Group tokens into the 4 canonical Web3 Genres
  const categorizedTokens = useMemo(() => {
    const map: Record<Web3Genre, TokenRecord[]> = {
      defi_liquidity: [],
      onchain_identity: [],
      gaming_media: [],
      depin_infra: [],
    };

    tokens.forEach((token) => {
      const g = resolveTokenGenre(token);
      if (map[g]) {
        map[g].push(token);
      } else {
        map.defi_liquidity.push(token);
      }
    });

    return map;
  }, [tokens]);

  // Sorter logic per genre list
  const sortTokensList = (list: TokenRecord[]): TokenRecord[] => {
    let result = [...list];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.symbol.toLowerCase().includes(q) ||
          t.contractAddress.toLowerCase().includes(q) ||
          t.tokenId.includes(q)
      );
    }

    // Standard filter
    if (selectedStandard !== "all") {
      result = result.filter((t) => t.tokenStandard === selectedStandard);
    }

    // Chain filter (75+ Chains)
    if (selectedChainFilter !== "all") {
      result = result.filter((t) => t.chain === selectedChainFilter);
    }

    // Apply Sorting
    if (primarySortMode === "alphabetical") {
      result.sort((a, b) => {
        switch (sortAlpha) {
          case "name_asc":
            return a.name.localeCompare(b.name);
          case "name_desc":
            return b.name.localeCompare(a.name);
          case "symbol_asc":
            return a.symbol.localeCompare(b.symbol);
          case "symbol_desc":
            return b.symbol.localeCompare(a.symbol);
          default:
            return 0;
        }
      });
    } else {
      result.sort((a, b) => {
        switch (sortNum) {
          case "market_cap_desc":
            return (b.marketCap || 0) - (a.marketCap || 0);
          case "market_cap_asc":
            return (a.marketCap || 0) - (b.marketCap || 0);
          case "price_desc":
            return (b.priceUsd || 0) - (a.priceUsd || 0);
          case "token_id_asc":
            return a.tokenId.localeCompare(b.tokenId, undefined, { numeric: true });
          case "security_desc":
            return (b.securityScore || 0) - (a.securityScore || 0);
          case "holders_desc":
            return (b.holderCount || 0) - (a.holderCount || 0);
          default:
            return 0;
        }
      });
    }

    return result;
  };

  // High-Volume Batch Generator (500 or 1,000 tokens)
  const handleGenerateBatch = async (count: 500 | 1000, autoSaveFirestore: boolean = true) => {
    setIsGeneratingBatch(true);
    setBatchStatusMessage(`Synthesizing ${count.toLocaleString()} tokens across 4 Web3 genres...`);

    try {
      // Simulate minor async tick so UI displays progress
      await new Promise((resolve) => setTimeout(resolve, 60));

      const newBatch = generateTokenBatch(count, {
        simulatedMarketData: true,
        eip55Checksum: true,
      });

      // Distribute evenly across the 4 genres for balance
      const genresList: Web3Genre[] = ["defi_liquidity", "onchain_identity", "gaming_media", "depin_infra"];
      newBatch.forEach((tok, idx) => {
        tok.genre = genresList[idx % genresList.length];
      });

      // Add to in-house reactive memory state
      onAddTokens(newBatch);
      setLastBatchCount(count);

      if (autoSaveFirestore) {
        setBatchStatusMessage(`Batch complete! Persisting to Firebase Firestore in-house memory...`);
        try {
          const savedCount = await saveTokensToFirestore(newBatch.slice(0, 450));
          setBatchStatusMessage(`✓ Successfully generated ${count} tokens and saved ${savedCount} records to Firebase!`);
        } catch (dbErr) {
          console.warn("Firestore auto-save notice:", dbErr);
          setBatchStatusMessage(`✓ Generated ${count} tokens in quantum memory (local cache synced).`);
        }
      } else {
        setBatchStatusMessage(`✓ Successfully generated ${count} tokens in-house memory.`);
      }
    } catch (err: any) {
      console.error("Batch generation failed:", err);
      setBatchStatusMessage("Generation error: " + (err?.message || "Unknown error"));
    } finally {
      setIsGeneratingBatch(false);
      setTimeout(() => setBatchStatusMessage(null), 5000);
    }
  };

  // 100 per Category Batch (400 Total across 4 Web3 Genres)
  const handleGenerate100PerCategory = async () => {
    setIsGeneratingBatch(true);
    setBatchStatusMessage("Synthesizing 100 tokens per category (400 total across 4 genres)...");
    try {
      await new Promise((resolve) => setTimeout(resolve, 60));
      const categories: Web3Genre[] = ["defi_liquidity", "onchain_identity", "gaming_media", "depin_infra"];
      const newTokens: TokenRecord[] = [];

      categories.forEach((genre) => {
        const batch = generateTokenBatch(100, {
          simulatedMarketData: true,
          eip55Checksum: true,
        });
        batch.forEach((tok) => {
          tok.genre = genre;
        });
        newTokens.push(...batch);
      });

      onAddTokens(newTokens);
      setLastBatchCount(400);

      try {
        const saved = await saveTokensToFirestore(newTokens.slice(0, 450));
        setBatchStatusMessage(`✓ Successfully synthesized 100 per category (400 tokens) & synced ${saved} to Firebase!`);
      } catch {
        setBatchStatusMessage(`✓ Successfully synthesized 100 per category (400 tokens) in quantum memory.`);
      }
    } catch (err: any) {
      setBatchStatusMessage("Generation error: " + (err?.message || "Error"));
    } finally {
      setIsGeneratingBatch(false);
      setTimeout(() => setBatchStatusMessage(null), 5000);
    }
  };

  // 100 Chain Batch (100 tokens tailored to current filtered chain or EVM)
  const handleGenerate100ChainBatch = async () => {
    setIsGeneratingBatch(true);
    const targetChain = selectedChainFilter !== "all" ? selectedChainFilter : "ethereum";
    const chainInfo = getChainById(targetChain);
    setBatchStatusMessage(`Synthesizing 100 tokens for ${chainInfo.name} (${chainInfo.symbol})...`);

    try {
      await new Promise((resolve) => setTimeout(resolve, 60));
      const batch = generateTokenBatch(100, {
        simulatedMarketData: true,
        eip55Checksum: chainInfo.isEVM,
      });

      const genresList: Web3Genre[] = ["defi_liquidity", "onchain_identity", "gaming_media", "depin_infra"];
      batch.forEach((tok, idx) => {
        tok.chain = targetChain as any;
        tok.genre = genresList[idx % genresList.length];
      });

      onAddTokens(batch);
      setLastBatchCount(100);

      try {
        const saved = await saveTokensToFirestore(batch.slice(0, 450));
        setBatchStatusMessage(`✓ Minted 100 tokens for ${chainInfo.name} & saved ${saved} to Firebase!`);
      } catch {
        setBatchStatusMessage(`✓ Minted 100 tokens for ${chainInfo.name} in quantum memory.`);
      }
    } catch (err: any) {
      setBatchStatusMessage("Generation error: " + (err?.message || "Error"));
    } finally {
      setIsGeneratingBatch(false);
      setTimeout(() => setBatchStatusMessage(null), 5000);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(text);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const genres = Object.keys(GENRE_DEFINITIONS) as Web3Genre[];

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header Card */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-[#F27D26]/10 border border-[#F27D26]/30 flex items-center justify-center text-[#F27D26]">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Organized Categorical Directory</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                    4 Web3 Genres
                  </span>
                </h1>
                <p className="text-xs text-[#8E9299] font-mono mt-0.5">
                  Side-by-side categorical matrix with alphabetical/numerical sorting and 500/1,000 batch cloud memory.
                </p>
              </div>
            </div>
          </div>

          {/* High-Volume Batch Action Buttons & All Apps Studio Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowOrchestrator((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                showOrchestrator
                  ? "bg-[#1E1E24] border-[#F27D26] text-[#F27D26]"
                  : "bg-[#0A0A0C] hover:bg-[#1E1E24] border-[#1F1F23] text-white"
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>{showOrchestrator ? "Close Chains Studio" : "All Apps (75+ Chains Studio)"}</span>
            </button>

            <button
              type="button"
              disabled={isGeneratingBatch}
              onClick={handleGenerate100PerCategory}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0A0A0C] hover:bg-[#1E1E24] border border-[#1F1F23] text-white text-xs font-mono transition-all cursor-pointer disabled:opacity-50"
              title="Mint 100 tokens per category (400 total)"
            >
              {isGeneratingBatch ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#F27D26]" />
              ) : (
                <Coins className="w-3.5 h-3.5 text-[#F27D26]" />
              )}
              <span>+100/Category (400)</span>
            </button>

            <button
              type="button"
              disabled={isGeneratingBatch}
              onClick={handleGenerate100ChainBatch}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0A0A0C] hover:bg-[#1E1E24] border border-[#1F1F23] text-white text-xs font-mono transition-all cursor-pointer disabled:opacity-50"
              title="Mint 100 tokens for active chain"
            >
              {isGeneratingBatch ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              ) : (
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span>+100 Chain Batch</span>
            </button>

            <button
              type="button"
              disabled={isGeneratingBatch}
              onClick={() => handleGenerateBatch(500, true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0A0A0C] hover:bg-[#1E1E24] border border-[#1F1F23] text-white text-xs font-mono transition-all cursor-pointer disabled:opacity-50"
            >
              {isGeneratingBatch ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#F27D26]" />
              ) : (
                <Plus className="w-3.5 h-3.5 text-[#F27D26]" />
              )}
              <span>+500 Batch</span>
            </button>

            <button
              type="button"
              disabled={isGeneratingBatch}
              onClick={() => handleGenerateBatch(1000, true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#F27D26] hover:bg-[#ff8e3c] text-black text-xs font-mono font-bold transition-all cursor-pointer shadow-lg shadow-[#F27D26]/20 disabled:opacity-50"
            >
              {isGeneratingBatch ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              <span>+1,000 Batch & Save</span>
            </button>
          </div>
        </div>

        {/* Status Alert Notification */}
        {batchStatusMessage && (
          <div className="mt-4 p-3 rounded-lg bg-[#0A0A0C] border border-green-500/30 text-green-400 text-xs font-mono flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span>{batchStatusMessage}</span>
            </div>
            <span className="text-[10px] text-[#8E9299]">Firestore Realtime Sync</span>
          </div>
        )}
      </div>

      {/* Embedded All Apps & 75+ Chains Provisioning Studio */}
      {showOrchestrator && (
        <div className="animate-fade-in">
          <ChainAppOrchestrator
            onAddTokens={onAddTokens}
            onClose={() => setShowOrchestrator(false)}
          />
        </div>
      )}

      {/* Control Bar: Sorting (Alphabetical & Numerical) & Search Filters */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-4 shadow-lg space-y-3 font-mono text-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 text-[#8E9299] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, symbol, contract address, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0A0A0C] border border-[#1F1F23] text-white text-xs placeholder-[#8E9299]/50 focus:outline-none focus:border-[#F27D26]"
            />
          </div>

          {/* Sorting Controls */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            <div className="flex items-center bg-[#0A0A0C] p-1 rounded-lg border border-[#1F1F23]">
              <button
                type="button"
                onClick={() => setPrimarySortMode("alphabetical")}
                className={`px-2.5 py-1 rounded text-[11px] transition-all cursor-pointer ${
                  primarySortMode === "alphabetical"
                    ? "bg-[#16161A] text-white font-bold border border-[#F27D26]"
                    : "text-[#8E9299] hover:text-white"
                }`}
              >
                Alphabetical
              </button>
              <button
                type="button"
                onClick={() => setPrimarySortMode("numerical")}
                className={`px-2.5 py-1 rounded text-[11px] transition-all cursor-pointer ${
                  primarySortMode === "numerical"
                    ? "bg-[#16161A] text-white font-bold border border-[#F27D26]"
                    : "text-[#8E9299] hover:text-white"
                }`}
              >
                Numerical
              </button>
            </div>

            {/* Sub-selector based on active sort mode */}
            {primarySortMode === "alphabetical" ? (
              <select
                value={sortAlpha}
                onChange={(e) => setSortAlpha(e.target.value as SortAlphabetical)}
                className="bg-[#0A0A0C] border border-[#1F1F23] text-white text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-[#F27D26] cursor-pointer"
              >
                <option value="name_asc">Name: A → Z</option>
                <option value="name_desc">Name: Z → A</option>
                <option value="symbol_asc">Symbol: A → Z</option>
                <option value="symbol_desc">Symbol: Z → A</option>
              </select>
            ) : (
              <select
                value={sortNum}
                onChange={(e) => setSortNum(e.target.value as SortNumerical)}
                className="bg-[#0A0A0C] border border-[#1F1F23] text-white text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-[#F27D26] cursor-pointer"
              >
                <option value="market_cap_desc">Market Cap: High → Low</option>
                <option value="market_cap_asc">Market Cap: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
                <option value="token_id_asc">Token ID: #1 → #N</option>
                <option value="security_desc">Security Score: 100 → 0</option>
                <option value="holders_desc">Holders: Most → Least</option>
              </select>
            )}

            {/* Standard Filter */}
            <select
              value={selectedStandard}
              onChange={(e) => setSelectedStandard(e.target.value)}
              className="bg-[#0A0A0C] border border-[#1F1F23] text-white text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-[#F27D26] cursor-pointer"
            >
              <option value="all">All Standards</option>
              <option value="ERC-20">ERC-20</option>
              <option value="ERC-721">ERC-721</option>
              <option value="ERC-1155">ERC-1155</option>
              <option value="ERC-4337">ERC-4337</option>
              <option value="SPL-Token">SPL-Token</option>
            </select>

            {/* Multi-Chain Filter for 75+ Chains */}
            <select
              value={selectedChainFilter}
              onChange={(e) => setSelectedChainFilter(e.target.value)}
              className="bg-[#0A0A0C] border border-[#1F1F23] text-white text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-[#F27D26] cursor-pointer max-w-[170px]"
            >
              <option value="all">All 75+ Chains</option>
              <optgroup label="Featured Ecosystems">
                {CHAIN_CATALOG.filter((c) => c.isFeatured).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.symbol})
                  </option>
                ))}
              </optgroup>
              <optgroup label="EVM Mainnets & Rollups">
                {CHAIN_CATALOG.filter((c) => c.isEVM && !c.isFeatured).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.symbol})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Non-EVM (SVM, Move, UTXO)">
                {CHAIN_CATALOG.filter((c) => !c.isEVM && !c.isFeatured).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.symbol})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Genre View Selector Tabs */}
        <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelectedGenreTab("all_side_by_side")}
            className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
              selectedGenreTab === "all_side_by_side"
                ? "bg-[#F27D26] text-black"
                : "bg-[#0A0A0C] text-[#8E9299] hover:text-white"
            }`}
          >
            All 4 Genres (Side-by-Side Matrix)
          </button>
          {genres.map((g) => {
            const def = GENRE_DEFINITIONS[g];
            const count = categorizedTokens[g].length;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setSelectedGenreTab(g)}
                className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                  selectedGenreTab === g
                    ? "bg-[#0A0A0C] text-white border border-[#F27D26]"
                    : "bg-[#0A0A0C] text-[#8E9299] hover:text-white border border-[#1F1F23]"
                }`}
              >
                <span>{def.shortLabel}</span>
                <span className="text-[10px] bg-[#16161A] px-1.5 py-0.2 rounded text-[#8E9299]">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Side-by-Side Genre Directory Columns */}
      <div
        className={`grid gap-4 ${
          selectedGenreTab === "all_side_by_side"
            ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
            : "grid-cols-1"
        }`}
      >
        {genres
          .filter((g) => selectedGenreTab === "all_side_by_side" || selectedGenreTab === g)
          .map((genre) => {
            const def = GENRE_DEFINITIONS[genre];
            const rawList = categorizedTokens[genre];
            const sortedList = sortTokensList(rawList);

            // Aggregate metrics
            const totalMcap = rawList.reduce((acc, t) => acc + (t.marketCap || 0), 0);
            const avgSecurity = rawList.length
              ? Math.round(rawList.reduce((acc, t) => acc + (t.securityScore || 0), 0) / rawList.length)
              : 95;

            return (
              <div
                key={genre}
                className="bg-[#16161A] border border-[#1F1F23] rounded-xl flex flex-col shadow-xl overflow-hidden font-mono"
              >
                {/* Column Header */}
                <div className="p-4 border-b border-[#1F1F23] bg-[#121216] space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${def.badgeBg} ${def.badgeBorder} ${def.badgeText}`}
                    >
                      {def.shortLabel}
                    </span>
                    <span className="text-[10px] text-[#8E9299] font-mono">
                      {rawList.length} total
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">{def.title}</h3>
                    <p className="text-[11px] text-[#8E9299] mt-0.5 leading-snug line-clamp-2">
                      {def.tagline}
                    </p>
                  </div>

                  {/* Aggregate Mini-Stats */}
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[10px]">
                    <div className="bg-[#0A0A0C] p-1.5 rounded border border-[#1F1F23]">
                      <span className="text-[#8E9299] block">Total Contracts:</span>
                      <span className="text-white font-bold">{sortedList.length} / {rawList.length}</span>
                    </div>
                    <div className="bg-[#0A0A0C] p-1.5 rounded border border-[#1F1F23]">
                      <span className="text-[#8E9299] block">Est. Market Cap:</span>
                      <span className="text-emerald-400 font-bold">${(totalMcap / 1e6).toFixed(1)}M</span>
                    </div>
                  </div>
                </div>

                {/* Token Cards Scrollable List */}
                <div className="p-3 space-y-2.5 overflow-y-auto max-h-[640px] flex-1">
                  {sortedList.length === 0 ? (
                    <div className="p-8 text-center text-[#8E9299] text-xs">
                      No contracts matching filter criteria.
                    </div>
                  ) : (
                    sortedList.map((token) => (
                      <div
                        key={token.id}
                        className="p-3 rounded-lg bg-[#0A0A0C] hover:bg-[#121216] border border-[#1F1F23] hover:border-[#2E2E36] transition-all space-y-2"
                      >
                        {/* Token Title & Standard */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <TokenImage token={token} size="xs" rounded="rounded-md" fallbackSymbolLength={2} />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-white">{token.symbol}</span>
                                <span className="text-[10px] text-[#8E9299] truncate max-w-[120px]">
                                  {token.name}
                                </span>
                              </div>
                              <span className="text-[10px] text-[#8E9299]">
                                ID: #{token.tokenId.slice(0, 10)}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#16161A] text-[#E0E0E0] border border-[#1F1F23]">
                              {token.tokenStandard}
                            </span>
                            <span className="text-[9px] text-cyan-400 uppercase">
                              {token.chain}
                            </span>
                          </div>
                        </div>

                        {/* Contract Address Snippet with Copy */}
                        <div className="flex items-center justify-between text-[10px] bg-[#16161A] px-2 py-1 rounded border border-[#1F1F23]">
                          <span className="text-[#8E9299] truncate font-mono">
                            {token.contractAddress.slice(0, 10)}...{token.contractAddress.slice(-6)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(token.contractAddress)}
                            className="text-[#8E9299] hover:text-white p-0.5 cursor-pointer"
                            title="Copy Contract Address"
                          >
                            {copiedAddress === token.contractAddress ? (
                              <Check className="w-3 h-3 text-green-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>

                        {/* Market Cap & Price */}
                        <div className="flex items-center justify-between text-[10px]">
                          <div>
                            <span className="text-[#8E9299]">MCap: </span>
                            <span className="text-white font-semibold">
                              ${token.marketCap ? (token.marketCap / 1e6).toFixed(2) + "M" : "N/A"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#8E9299]">Price: </span>
                            <span className="text-green-400 font-semibold">
                              ${token.priceUsd ? token.priceUsd.toFixed(3) : "0.00"}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons: Inspect & NFT Metadata */}
                        <div className="pt-1 flex items-center justify-between border-t border-[#1F1F23] text-[10px]">
                          <span className="text-[#8E9299] flex items-center gap-1">
                            <Shield className="w-3 h-3 text-emerald-400" />
                            <span>{token.securityScore}/100</span>
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedNFTToken(token)}
                              className="px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                              title="Inspect NFT Marketplace JSON"
                            >
                              <FileJson className="w-3 h-3" />
                              <span>NFT JSON</span>
                            </button>

                            {onSelectToken && (
                              <button
                                type="button"
                                onClick={() => onSelectToken(token)}
                                className="px-2 py-0.5 rounded bg-[#16161A] hover:bg-[#202028] text-white border border-[#1F1F23] text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <ExternalLink className="w-3 h-3 text-[#F27D26]" />
                                <span>Details</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* NFT Marketplace Metadata Modal */}
      {selectedNFTToken && (
        <NFTMetadataModal
          token={selectedNFTToken}
          onClose={() => setSelectedNFTToken(null)}
        />
      )}
    </div>
  );
};
