import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence, type Variants } from "motion/react";
import {
  TokenRecord,
  ChainType,
  NarrativeCategory,
  LaunchStatus,
  TokenStandard,
  Web3Genre,
  resolveTokenGenre,
  GENRE_DEFINITIONS,
} from "../types";
import {
  ALL_NARRATIVES,
  ALL_GENRES,
  simulateTokenOrganicEvolution,
  type MarketEvolutionOptions,
  type TokenEvolutionResult,
  NARRATIVE_TAGS_MAP,
  GENRE_TAGS_MAP,
} from "../utils/marketEvolution";
import { CHAIN_METADATA } from "../utils/marketData";
import { ChainIcon } from "./ChainIcon";
import { TokenImage } from "./TokenImage";
import { TokenAnalyticsCharts } from "./TokenAnalyticsCharts";
import { TokenMarketCapSparkline } from "./TokenMarketCapSparkline";
import { NFTMetadataModal } from "./NFTMetadataModal";
import { StreamContractArtifactModal } from "./StreamContractArtifactModal";
import { AllTokensPrivateKeyVaultModal } from "./AllTokensPrivateKeyVaultModal";
import { generateTokenNFTMetadata } from "../utils/nftMetadataGenerator";
import {
  computePublicContractId,
  mapTokenToPublicRegistry,
  checkTokenLiquidityPool,
  pingRpcEndpoint,
  getExplorerConfig,
  generateProductionReadySolidityCode,
} from "../utils/publicRegistry";
import {
  SOVEREIGN_RESERVE_SHARES,
  SOVEREIGN_TREASURY_SHARES,
  SOVEREIGN_OWNER,
  verifyEnterpriseContractRequirements,
  buildMultiTokenDotEnv,
  generateDeployerPrivateKey,
  ensureAllTokensHavePrivateKeys,
  duplicateTokenRecord,
  duplicateTokenBatch,
} from "../utils/cryptoGenerators";
import { downloadTokensCSV } from "../utils/csvExport";
import {
  seededShuffle,
  generateShuffleSeed,
  formatSeedDisplay,
} from "../utils/seededShuffle";
import {
  Search,
  Download,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  FileSpreadsheet,
  FileCode,
  FileJson,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  Filter,
  Eye,
  CheckSquare,
  Square,
  MinusSquare,
  Edit3,
  SlidersHorizontal,
  X,
  BarChart3,
  Coins,
  Hash,
  FileText,
  Key,
  Terminal,
  Globe,
  RefreshCw,
  AlertCircle,
  Code2,
  Shuffle,
  CopyPlus,
  Type,
  Compass,
  Tag,
  Tags,
  Dna,
  Zap,
  Trash2,
  Clock,
  CheckCircle2,
  Rocket,
  ArrowDownUp,
  Scale,
} from "lucide-react";
import { AutomatedTaggingModal } from "./AutomatedTaggingModal";
import { TokenCompareModal } from "./TokenCompareModal";
import {
  CATEGORICAL_TAG_DEFINITIONS,
  ALL_CATEGORICAL_TAG_IDS,
  CategoricalTagId,
  getCategoricalTagMeta,
} from "../utils/tokenTaggingEngine";

// Framer Motion Orchestrated Stagger Variants for High-Volume Token Stream
const tableBodyVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.024,
      delayChildren: 0.03,
    },
  },
};

const tokenRowVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 16,
    scale: 0.988,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 26,
      mass: 0.7,
    },
  },
};

interface TokenExplorerProps {
  tokens: TokenRecord[];
  onSelectToken: (token: TokenRecord) => void;
  onClearTokens: () => void;
  onDuplicateToken?: (token: TokenRecord) => TokenRecord | void;
  onDuplicateTokens?: (tokens: TokenRecord[]) => void;
  onBatchRenameTokens?: (
    tokenIds: string[],
    updater: (token: TokenRecord) => { name: string; symbol?: string }
  ) => void;
  onBatchUpdateTokens?: (updatedTokens: TokenRecord[]) => void;
  onBulkUpdate?: (tokenIds: string[], updates: Partial<TokenRecord>) => void;
  onBulkDeleteTokens?: (tokenIds: string[]) => void;
  onExpandAllToSovereignMCap?: () => void;
  onOpenMarketDeploy?: (targetTokenIds?: string[]) => void;
  onOpenGlobalSwapSell?: (token: TokenRecord, mode?: "swap" | "sell") => void;
  onUpdateTokens?: (updatedTokens: TokenRecord[]) => void;
  // External filter bindings from TokenFilterBar above
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  selectedChains?: Set<ChainType>;
  selectedStandards?: Set<TokenStandard>;
  selectedTokenIds?: Set<string>;
  onSelectedTokenIdsChange?: (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  lastGeneratedCount?: number;
}

export const TokenExplorer = ({
  tokens,
  onSelectToken,
  onClearTokens,
  onDuplicateToken,
  onDuplicateTokens,
  onBatchRenameTokens,
  onBatchUpdateTokens,
  onUpdateTokens,
  onBulkUpdate,
  onBulkDeleteTokens,
  onExpandAllToSovereignMCap,
  onOpenMarketDeploy,
  onOpenGlobalSwapSell,
  searchQuery: externalSearchQuery,
  onSearchChange: onExternalSearchChange,
  selectedChains: externalSelectedChains,
  selectedStandards: externalSelectedStandards,
  selectedTokenIds: externalSelectedTokenIds,
  onSelectedTokenIdsChange,
  lastGeneratedCount: externalLastGeneratedCount,
}: TokenExplorerProps) => {
  const SEARCH_STORAGE_KEY = "token_explorer_search_query";

  // Persistent search query state initialized from localStorage
  const [internalSearchQuery, setInternalSearchQuery] = useState<string>(() => {
    try {
      if (typeof window !== "undefined") {
        return localStorage.getItem(SEARCH_STORAGE_KEY) || "";
      }
    } catch {
      // Ignore local storage errors
    }
    return "";
  });

  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const setSearchQuery = (val: string) => {
    setInternalSearchQuery(val);
    if (onExternalSearchChange) {
      onExternalSearchChange(val);
    }
  };

  const searchInputRef = useRef<HTMLInputElement>(null);

  const [selectedChain, setSelectedChain] = useState<string>("all");
  const [selectedStandard, setSelectedStandard] = useState<string>("all");
  const [selectedNarrative, setSelectedNarrative] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [isTaggingModalOpen, setIsTaggingModalOpen] = useState<boolean>(false);
  const [onlyVanity, setOnlyVanity] = useState<boolean>(false);
  const [onlyEnterprise, setOnlyEnterprise] = useState<boolean>(false);
  const [showVisualCharts, setShowVisualCharts] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copySuccessMsg, setCopySuccessMsg] = useState<string | null>(null);
  const [selectedNFTToken, setSelectedNFTToken] = useState<TokenRecord | null>(null);
  const [streamArtifactToken, setStreamArtifactToken] = useState<TokenRecord | null>(null);
  const [solidityPromptToken, setSolidityPromptToken] = useState<TokenRecord | null>(null);
  const [isKeysVaultOpen, setIsKeysVaultOpen] = useState<boolean>(false);

  // Live RPC reachability state per chain for registry status indicators
  const [rpcStatusMap, setRpcStatusMap] = useState<Record<string, { reachable: boolean; latencyMs: number }>>({
    ethereum: { reachable: true, latencyMs: 24 },
    base: { reachable: true, latencyMs: 16 },
    arbitrum: { reachable: true, latencyMs: 18 },
    polygon: { reachable: true, latencyMs: 28 },
    solana: { reachable: true, latencyMs: 14 },
    bitcoin: { reachable: true, latencyMs: 42 },
    quantum: { reachable: true, latencyMs: 22 },
    cosmos: { reachable: true, latencyMs: 31 },
  });
  const [pingingChains, setPingingChains] = useState<Set<string>>(new Set());

  const handlePingTokenRpc = async (chain: string) => {
    setPingingChains((prev) => new Set(prev).add(chain));
    try {
      const res = await pingRpcEndpoint(chain);
      setRpcStatusMap((prev) => ({
        ...prev,
        [chain]: { reachable: res.reachable, latencyMs: res.latencyMs },
      }));
    } finally {
      setPingingChains((prev) => {
        const next = new Set(prev);
        next.delete(chain);
        return next;
      });
    }
  };

  // Bulk Selection State (supports controlled or internal state)
  const [internalSelectedTokenIds, setInternalSelectedTokenIds] = useState<Set<string>>(new Set());
  const selectedTokenIds = externalSelectedTokenIds !== undefined ? externalSelectedTokenIds : internalSelectedTokenIds;
  const setSelectedTokenIds = (updater: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    if (onSelectedTokenIdsChange) {
      onSelectedTokenIdsChange(updater);
    } else {
      setInternalSelectedTokenIds(updater);
    }
  };
  const [bulkTargetStatus, setBulkTargetStatus] = useState<LaunchStatus | "">("");
  const [bulkTargetStandard, setBulkTargetStandard] = useState<TokenStandard | "">("");
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);

  // Batch Rename Tool State
  const [isBatchRenameOpen, setIsBatchRenameOpen] = useState<boolean>(false);
  const [batchRenamePrefix, setBatchRenamePrefix] = useState<string>("");
  const [batchRenameSuffix, setBatchRenameSuffix] = useState<string>("");
  const [batchRenameTrimWhitespace, setBatchRenameTrimWhitespace] = useState<boolean>(true);
  const [batchRenameUpdateSymbol, setBatchRenameUpdateSymbol] = useState<boolean>(false);
  const [batchRenameSymbolPrefix, setBatchRenameSymbolPrefix] = useState<string>("");
  const [batchRenameSymbolSuffix, setBatchRenameSymbolSuffix] = useState<string>("");

  // Market Evolution (Organic Narrative / Genre Simulation) Tool State
  const [isMarketEvolutionOpen, setIsMarketEvolutionOpen] = useState<boolean>(false);
  const [evolutionNarrativeMode, setEvolutionNarrativeMode] = useState<
    "random_all" | "selected_narratives" | "keep_current"
  >("random_all");
  const [evolutionTargetNarratives, setEvolutionTargetNarratives] = useState<Set<NarrativeCategory>>(
    () => new Set(ALL_NARRATIVES.map((n) => n.id))
  );
  const [evolutionGenreMode, setEvolutionGenreMode] = useState<
    "auto_resolve" | "random_all" | "selected_genres" | "keep_current"
  >("auto_resolve");
  const [evolutionTargetGenres, setEvolutionTargetGenres] = useState<Set<Web3Genre>>(
    () => new Set(ALL_GENRES.map((g) => g.id))
  );
  const [evolutionAssignTags, setEvolutionAssignTags] = useState<boolean>(true);
  const [evolutionTagCount, setEvolutionTagCount] = useState<1 | 2 | 3 | "random">("random");
  const [evolutionSimulatePrice, setEvolutionSimulatePrice] = useState<boolean>(true);
  const [evolutionVolatilityIntensity, setEvolutionVolatilityIntensity] = useState<
    "mild" | "moderate" | "wild"
  >("moderate");
  const [evolutionAppendEventNote, setEvolutionAppendEventNote] = useState<boolean>(true);
  const [evolutionPreviewNonce, setEvolutionPreviewNonce] = useState<number>(0);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Seeded Random Shuffle State to eliminate presentation bias in large datasets
  const [shuffleSeed, setShuffleSeed] = useState<number | null>(null);
  const [shuffleCount, setShuffleCount] = useState<number>(0);

  // High-Volume Batch Generation Staggered Entrance Animation State
  const prevIdsRef = useRef<Set<string>>(new Set(tokens.map((t) => t.id)));
  const [newlyAddedTokenIds, setNewlyAddedTokenIds] = useState<Set<string>>(new Set());
  const [batchWaveCount, setBatchWaveCount] = useState<number>(0);
  const [batchWaveId, setBatchWaveId] = useState<number>(0);
  const [showBatchBanner, setShowBatchBanner] = useState<boolean>(false);
  const [staggerAnimationEnabled, setStaggerAnimationEnabled] = useState<boolean>(true);

  // Detect high-volume batch additions and trigger staggered entrance cascade
  useEffect(() => {
    const prevIds = prevIdsRef.current;
    const newIds = new Set<string>();

    for (const t of tokens) {
      if (!prevIds.has(t.id)) {
        newIds.add(t.id);
      }
    }

    // Update ref for the next render/generation wave
    prevIdsRef.current = new Set(tokens.map((t) => t.id));

    // When newly generated batch of tokens arrives (and tokens were already loaded)
    if (newIds.size > 0 && prevIds.size > 0) {
      setNewlyAddedTokenIds(newIds);
      const count = externalLastGeneratedCount && externalLastGeneratedCount > 0 ? externalLastGeneratedCount : newIds.size;
      setBatchWaveCount(count);
      setBatchWaveId((prev) => prev + 1);
      setShowBatchBanner(true);
      setCurrentPage(1);

      const timer = setTimeout(() => {
        setShowBatchBanner(false);
        setNewlyAddedTokenIds(new Set());
      }, 7500);

      return () => clearTimeout(timer);
    }
  }, [tokens, externalLastGeneratedCount]);

  // Token Comparison Modal State
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);
  const [compareTokenAId, setCompareTokenAId] = useState<string | undefined>(undefined);
  const [compareTokenBId, setCompareTokenBId] = useState<string | undefined>(undefined);

  const handleOpenCompare = (tokenAId?: string, tokenBId?: string) => {
    if (tokenAId) setCompareTokenAId(tokenAId);
    if (tokenBId) setCompareTokenBId(tokenBId);

    if (!tokenAId && !tokenBId && selectedTokenIds.size >= 2) {
      const arr = Array.from(selectedTokenIds);
      setCompareTokenAId(arr[0]);
      setCompareTokenBId(arr[1]);
    } else if (!tokenAId && !tokenBId && selectedTokenIds.size === 1) {
      const arr = Array.from(selectedTokenIds);
      setCompareTokenAId(arr[0]);
    }
    setIsCompareModalOpen(true);
  };

  // Persist search query to localStorage on every change
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        if (searchQuery.trim()) {
          localStorage.setItem(SEARCH_STORAGE_KEY, searchQuery);
        } else {
          localStorage.removeItem(SEARCH_STORAGE_KEY);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, [searchQuery]);

  // Keyboard shortcut listener: Press '/' or 'Cmd/Ctrl+K' to focus search, 'Escape' to clear
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (
        e.key === "/" &&
        activeTag !== "INPUT" &&
        activeTag !== "TEXTAREA" &&
        activeTag !== "SELECT"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        if (searchQuery) {
          setSearchQuery("");
          setCurrentPage(1);
        } else {
          searchInputRef.current?.blur();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchQuery]);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered tokens in real-time based on name, symbol, chain, standard, or contract
  const filteredTokens = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tokens.filter((t) => {
      // Chain filter (external multi-chain set or internal dropdown)
      if (externalSelectedChains && externalSelectedChains.size > 0) {
        if (!externalSelectedChains.has(t.chain)) return false;
      } else if (selectedChain !== "all" && t.chain !== selectedChain) {
        return false;
      }

      // Standard filter (external multi-standard set or internal dropdown)
      if (externalSelectedStandards && externalSelectedStandards.size > 0) {
        if (!externalSelectedStandards.has(t.tokenStandard)) return false;
      } else if (selectedStandard !== "all" && t.tokenStandard !== selectedStandard) {
        return false;
      }

      const matchesNarrative = selectedNarrative === "all" || t.narrative === selectedNarrative;
      const matchesStatus = selectedStatus === "all" || t.launchStatus === selectedStatus;
      const matchesVanity = !onlyVanity || t.isVanity;
      const matchesEnterprise = !onlyEnterprise || verifyEnterpriseContractRequirements(t).isVerified;
      const matchesTag =
        selectedTag === "all" ||
        (t.tags &&
          t.tags.some((tag) => {
            const lower = tag.toLowerCase();
            const target = selectedTag.toLowerCase();
            return lower === target || lower.includes(target) || target.includes(lower);
          }));

      if (!matchesNarrative || !matchesStatus || !matchesVanity || !matchesEnterprise || !matchesTag) return false;

      // Search matching across all key attributes
      if (q) {
        const chainFriendlyName = CHAIN_METADATA[t.chain]?.name?.toLowerCase() || "";
        const pubId = computePublicContractId(t).toLowerCase();
        const effectiveGenre = (t.genre || resolveTokenGenre(t)).toLowerCase();
        const matchesTags = t.tags ? t.tags.some((tag) => tag.toLowerCase().includes(q)) : false;
        const matchesSearch =
          t.name.toLowerCase().includes(q) ||
          t.symbol.toLowerCase().includes(q) ||
          t.chain.toLowerCase().includes(q) ||
          chainFriendlyName.includes(q) ||
          t.contractAddress.toLowerCase().includes(q) ||
          t.tokenId.toLowerCase().includes(q) ||
          pubId.includes(q) ||
          (t.tokenStandard && t.tokenStandard.toLowerCase().includes(q)) ||
          t.narrative.toLowerCase().includes(q) ||
          effectiveGenre.includes(q) ||
          matchesTags;
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [
    tokens,
    searchQuery,
    externalSelectedChains,
    selectedChain,
    externalSelectedStandards,
    selectedStandard,
    selectedNarrative,
    selectedStatus,
    selectedTag,
    onlyVanity,
    onlyEnterprise,
  ]);

  // Displayed tokens: either natural filtered order or seeded randomized order
  const displayedTokens = useMemo(() => {
    if (shuffleSeed === null) {
      return filteredTokens;
    }
    return seededShuffle(filteredTokens, shuffleSeed);
  }, [filteredTokens, shuffleSeed]);

  // Paginated records
  const totalPages = Math.ceil(displayedTokens.length / pageSize) || 1;
  const paginatedTokens = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return displayedTokens.slice(start, start + pageSize);
  }, [displayedTokens, currentPage, pageSize]);

  // Pre-calculate visible batch order so each newly added item has a smooth, progressive staggered delay
  const visibleBatchIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    let batchCounter = 0;
    paginatedTokens.forEach((t) => {
      if (newlyAddedTokenIds.has(t.id)) {
        map.set(t.id, batchCounter++);
      }
    });
    return map;
  }, [paginatedTokens, newlyAddedTokenIds]);

  // Bulk selection helpers
  const isAllVisibleSelected =
    paginatedTokens.length > 0 &&
    paginatedTokens.every((t) => selectedTokenIds.has(t.id));

  const isSomeVisibleSelected =
    paginatedTokens.some((t) => selectedTokenIds.has(t.id)) && !isAllVisibleSelected;

  const isAllFilteredSelected =
    displayedTokens.length > 0 &&
    displayedTokens.every((t) => selectedTokenIds.has(t.id));

  const isSomeFilteredSelected =
    displayedTokens.some((t) => selectedTokenIds.has(t.id)) && !isAllFilteredSelected;

  const handleToggleSelectToken = (id: string) => {
    setSelectedTokenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAllVisible = () => {
    setSelectedTokenIds((prev) => {
      const next = new Set(prev);
      if (isAllVisibleSelected) {
        // Deselect all on current page
        paginatedTokens.forEach((t) => next.delete(t.id));
      } else {
        // Select all on current page
        paginatedTokens.forEach((t) => next.add(t.id));
      }
      return next;
    });
  };

  // Dedicated toggle to select ALL tokens and contract IDs across filtered view
  const handleToggleSelectAllTokensAndContractIds = () => {
    if (isAllFilteredSelected) {
      setSelectedTokenIds(new Set());
    } else {
      setSelectedTokenIds(new Set(displayedTokens.map((t) => t.id)));
    }
  };

  const handleSelectAllFiltered = () => {
    setSelectedTokenIds(new Set(displayedTokens.map((t) => t.id)));
  };

  const handleClearSelection = () => {
    setSelectedTokenIds(new Set());
  };

  // Seeded Random Shuffle Handlers (Fisher-Yates + Mulberry32 PRNG)
  const handleShuffleOrder = () => {
    const newSeed = generateShuffleSeed();
    setShuffleSeed(newSeed);
    setShuffleCount((prev) => prev + 1);
    setCurrentPage(1);
    const tag = formatSeedDisplay(newSeed);
    setBulkFeedback(`Display order randomized with seeded PRNG (${tag}) to prevent bias!`);
    setTimeout(() => setBulkFeedback(null), 3500);
  };

  const handleResetOrder = () => {
    setShuffleSeed(null);
    setCurrentPage(1);
    setBulkFeedback("Restored default display order");
    setTimeout(() => setBulkFeedback(null), 2500);
  };

  // Dedicated Duplicate Token Handler (deep copy with new random contract address & shared tokenomics)
  const handleDuplicateSingleToken = (token: TokenRecord) => {
    let duplicated: TokenRecord;
    if (onDuplicateToken) {
      const res = onDuplicateToken(token);
      duplicated = (res as TokenRecord) || duplicateTokenRecord(token);
    } else {
      duplicated = duplicateTokenRecord(token);
    }

    // Trigger visual entry animation for the newly duplicated token
    setNewlyAddedTokenIds((prev) => new Set([...prev, duplicated.id]));

    // Format address snippet for feedback toast
    const addrSnippet =
      duplicated.contractAddress.length > 14
        ? `${duplicated.contractAddress.slice(0, 6)}...${duplicated.contractAddress.slice(-4)}`
        : duplicated.contractAddress;

    setBulkFeedback(
      `Duplicated "${token.name}" → "${duplicated.name}" with new address (${addrSnippet}) and shared tokenomics!`
    );
    setTimeout(() => {
      setBulkFeedback(null);
    }, 4000);
  };

  const handleBulkDuplicate = () => {
    const selected = tokens.filter((t) => selectedTokenIds.has(t.id));
    if (selected.length === 0) return;

    if (onDuplicateTokens) {
      onDuplicateTokens(selected);
    } else if (onDuplicateToken) {
      selected.forEach((t) => onDuplicateToken(t));
    }

    setBulkFeedback(
      `Duplicated ${selected.length} selected token${selected.length > 1 ? "s" : ""} with new random contract addresses and shared tokenomics!`
    );
    setTimeout(() => {
      setBulkFeedback(null);
    }, 4000);
  };

  // Memoized selected tokens list for preview and batch operations
  const selectedTokensForPreview = useMemo(() => {
    return tokens.filter((t) => selectedTokenIds.has(t.id));
  }, [tokens, selectedTokenIds]);

  // Dedicated Batch Rename Handler: applies prefix and/or suffix to all selected token names
  const handleApplyBatchRename = () => {
    const prefix = batchRenamePrefix;
    const suffix = batchRenameSuffix;
    const hasNameModifier = prefix.length > 0 || suffix.length > 0;
    const hasSymbolModifier =
      batchRenameUpdateSymbol &&
      (batchRenameSymbolPrefix.length > 0 || batchRenameSymbolSuffix.length > 0);

    if (!hasNameModifier && !hasSymbolModifier) return;

    const selectedTokens = tokens.filter((t) => selectedTokenIds.has(t.id));
    if (selectedTokens.length === 0) return;

    const computeNewName = (oldName: string): string => {
      let res = `${prefix}${oldName}${suffix}`;
      if (batchRenameTrimWhitespace) {
        res = res.trim();
      }
      return res || oldName;
    };

    const computeNewSymbol = (oldSymbol: string): string => {
      if (!batchRenameUpdateSymbol) return oldSymbol;
      let res = `${batchRenameSymbolPrefix}${oldSymbol}${batchRenameSymbolSuffix}`;
      if (batchRenameTrimWhitespace) {
        res = res.trim();
      }
      return res || oldSymbol;
    };

    if (onBatchRenameTokens) {
      onBatchRenameTokens(Array.from(selectedTokenIds), (t) => ({
        name: computeNewName(t.name),
        symbol: batchRenameUpdateSymbol ? computeNewSymbol(t.symbol) : undefined,
      }));
    } else if (onBulkUpdate) {
      selectedTokens.forEach((t) => {
        onBulkUpdate([t.id], {
          name: computeNewName(t.name),
          ...(batchRenameUpdateSymbol ? { symbol: computeNewSymbol(t.symbol) } : {}),
        });
      });
    }

    const feedbackParts: string[] = [];
    if (prefix) feedbackParts.push(`Prefix: "${prefix}"`);
    if (suffix) feedbackParts.push(`Suffix: "${suffix}"`);
    if (batchRenameUpdateSymbol && (batchRenameSymbolPrefix || batchRenameSymbolSuffix)) {
      feedbackParts.push(`Symbol: [${batchRenameSymbolPrefix}SYM${batchRenameSymbolSuffix}]`);
    }

    setBulkFeedback(
      `Batch renamed ${selectedTokens.length} token${selectedTokens.length > 1 ? "s" : ""} (${feedbackParts.join(", ")})`
    );
    setTimeout(() => {
      setBulkFeedback(null);
    }, 4000);
  };

  // Memoized simulation preview for Market Evolution (Organic Narrative / Genre Simulation)
  const evolutionPreviewData = useMemo(() => {
    if (!isMarketEvolutionOpen || selectedTokensForPreview.length === 0) return null;
    const options: MarketEvolutionOptions = {
      narrativeMode: evolutionNarrativeMode,
      targetNarratives: Array.from(evolutionTargetNarratives),
      genreMode: evolutionGenreMode,
      targetGenres: Array.from(evolutionTargetGenres),
      assignTags: evolutionAssignTags,
      tagCount: evolutionTagCount,
      simulatePriceVolatility: evolutionSimulatePrice,
      volatilityIntensity: evolutionVolatilityIntensity,
      appendEvolutionNote: evolutionAppendEventNote,
    };
    return simulateTokenOrganicEvolution(selectedTokensForPreview, options);
  }, [
    isMarketEvolutionOpen,
    selectedTokensForPreview,
    evolutionNarrativeMode,
    evolutionTargetNarratives,
    evolutionGenreMode,
    evolutionTargetGenres,
    evolutionAssignTags,
    evolutionTagCount,
    evolutionSimulatePrice,
    evolutionVolatilityIntensity,
    evolutionAppendEventNote,
    evolutionPreviewNonce,
  ]);

  const handleApplyMarketEvolution = () => {
    if (!evolutionPreviewData || evolutionPreviewData.updatedTokens.length === 0) return;

    if (onBatchUpdateTokens) {
      onBatchUpdateTokens(evolutionPreviewData.updatedTokens);
    } else if (onBulkUpdate) {
      evolutionPreviewData.updatedTokens.forEach((t) => {
        onBulkUpdate([t.id], {
          narrative: t.narrative,
          genre: t.genre,
          tags: t.tags,
          priceUsd: t.priceUsd,
          marketCap: t.marketCap,
          marketEvolutionNote: t.marketEvolutionNote,
        });
      });
    }

    const count = evolutionPreviewData.updatedTokens.length;
    const tagCount = evolutionPreviewData.updatedTokens.reduce(
      (acc, t) => acc + (t.tags?.length || 0),
      0
    );
    setBulkFeedback(
      `Organic Market Development: Simulated narrative & genre evolution for ${count} token${count > 1 ? "s" : ""} (${tagCount} organic market tags assigned)!`
    );
    setIsMarketEvolutionOpen(false);
    setTimeout(() => {
      setBulkFeedback(null);
    }, 4500);
  };

  const handleQuickRandomizeMarketEvolution = () => {
    const selected = tokens.filter((t) => selectedTokenIds.has(t.id));
    if (selected.length === 0) return;
    const options: MarketEvolutionOptions = {
      narrativeMode: "random_all",
      genreMode: "auto_resolve",
      assignTags: true,
      tagCount: "random",
      simulatePriceVolatility: true,
      volatilityIntensity: "moderate",
      appendEvolutionNote: true,
    };
    const { updatedTokens } = simulateTokenOrganicEvolution(selected, options);

    if (onBatchUpdateTokens) {
      onBatchUpdateTokens(updatedTokens);
    } else if (onBulkUpdate) {
      updatedTokens.forEach((t) => {
        onBulkUpdate([t.id], {
          narrative: t.narrative,
          genre: t.genre,
          tags: t.tags,
          priceUsd: t.priceUsd,
          marketCap: t.marketCap,
          marketEvolutionNote: t.marketEvolutionNote,
        });
      });
    }

    const count = updatedTokens.length;
    const tagCount = updatedTokens.reduce((acc, t) => acc + (t.tags?.length || 0), 0);
    setBulkFeedback(
      `Organic Market Development: Randomly assigned new narratives, genres & ${tagCount} market tags to ${count} token${count > 1 ? "s" : ""}!`
    );
    setTimeout(() => {
      setBulkFeedback(null);
    }, 4500);
  };

  // Dedicated copy helpers for selected contract addresses and uint256 token IDs
  const copySelectedContractAddresses = () => {
    const selected = tokens.filter((t) => selectedTokenIds.has(t.id));
    if (selected.length === 0) return;
    const list = selected.map((t) => t.contractAddress).join("\n");
    navigator.clipboard.writeText(list);
    setCopySuccessMsg(`Copied ${selected.length} contract addresses to clipboard!`);
    setTimeout(() => setCopySuccessMsg(null), 3000);
  };

  const copySelectedTokenIds = () => {
    const selected = tokens.filter((t) => selectedTokenIds.has(t.id));
    if (selected.length === 0) return;
    const list = selected.map((t) => t.tokenId).join("\n");
    navigator.clipboard.writeText(list);
    setCopySuccessMsg(`Copied ${selected.length} uint256 token IDs to clipboard!`);
    setTimeout(() => setCopySuccessMsg(null), 3000);
  };

  const copySelectedContractsAndTokenIds = () => {
    const selected = tokens.filter((t) => selectedTokenIds.has(t.id));
    if (selected.length === 0) return;
    const list = selected
      .map(
        (t) =>
          `[${t.symbol}] ${t.name} | Contract: ${t.contractAddress} | TokenID: ${t.tokenId} | Chain: ${t.chain} | Standard: ${t.tokenStandard}`
      )
      .join("\n");
    navigator.clipboard.writeText(list);
    setCopySuccessMsg(`Copied ${selected.length} contract & token ID records to clipboard!`);
    setTimeout(() => setCopySuccessMsg(null), 3000);
  };

  const handleApplyBulkStatus = (statusToApply?: LaunchStatus) => {
    const status = statusToApply || (bulkTargetStatus as LaunchStatus);
    if (!status || selectedTokenIds.size === 0) return;

    const ids: string[] = Array.from(selectedTokenIds);
    if (onBulkUpdate) {
      onBulkUpdate(ids, { launchStatus: status });
    }

    setBulkFeedback(`Updated ${ids.length} tokens to status '${status}'`);
    setBulkTargetStatus("");
    setTimeout(() => setBulkFeedback(null), 3500);
  };

  const handleApplyBulkStandard = (standardToApply?: TokenStandard) => {
    const standard = standardToApply || (bulkTargetStandard as TokenStandard);
    if (!standard || selectedTokenIds.size === 0) return;

    const ids: string[] = Array.from(selectedTokenIds);
    if (onBulkUpdate) {
      onBulkUpdate(ids, { tokenStandard: standard });
    }

    setBulkFeedback(`Updated ${ids.length} tokens to standard '${standard}'`);
    setBulkTargetStandard("");
    setTimeout(() => setBulkFeedback(null), 3500);
  };

  const handleExpandSelectedToSovereignMCap = () => {
    if (selectedTokenIds.size === 0) return;
    const ids: string[] = Array.from(selectedTokenIds);
    if (onBulkUpdate) {
      ids.forEach((id: string) => {
        const targetCap = 3_000_000_000_000 + Math.floor(Math.random() * 2_500_000_000_000);
        onBulkUpdate([id], {
          marketCap: targetCap,
          priceUsd: Number((targetCap / 1_000_000_000).toFixed(4)),
          reserveShares: SOVEREIGN_RESERVE_SHARES,
          treasuryShares: SOVEREIGN_TREASURY_SHARES,
          targetOwner: SOVEREIGN_OWNER,
        });
      });
    }
    setBulkFeedback(`Elevated ${ids.length} tokens to >= $3T CoinMarketCap Sovereign Tier!`);
    setTimeout(() => setBulkFeedback(null), 3500);
  };

  // Bulk Delete State & Handlers
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState<boolean>(false);

  const handleBulkDelete = () => {
    if (selectedTokenIds.size === 0) return;
    const idsToDelete: string[] = Array.from(selectedTokenIds);
    if (onBulkDeleteTokens) {
      onBulkDeleteTokens(idsToDelete);
    } else if (onBatchUpdateTokens) {
      const remaining = tokens.filter((t) => !selectedTokenIds.has(t.id));
      onBatchUpdateTokens(remaining);
    }
    handleClearSelection();
    setIsBulkDeleteConfirmOpen(false);
    setCopySuccessMsg(`Successfully deleted ${idsToDelete.length.toLocaleString()} tokens in bulk`);
    setTimeout(() => setCopySuccessMsg(null), 3500);
  };

  const handleBulkMarkDeployed = () => {
    if (selectedTokenIds.size === 0) return;
    const ids: string[] = Array.from(selectedTokenIds);
    if (onBulkUpdate) {
      onBulkUpdate(ids, { isDeployed: true, launchStatus: "Deployed" });
    } else if (onBatchUpdateTokens) {
      const idSet = new Set(ids);
      const updated = tokens.map((t) =>
        idSet.has(t.id) ? { ...t, isDeployed: true, launchStatus: "Deployed" as LaunchStatus } : t
      );
      onBatchUpdateTokens(updated);
    }
    setBulkFeedback(`Marked ${ids.length.toLocaleString()} tokens as Deployed on-chain`);
    setTimeout(() => setBulkFeedback(null), 3500);
  };

  const handleBulkMarkUndeployed = () => {
    if (selectedTokenIds.size === 0) return;
    const ids: string[] = Array.from(selectedTokenIds);
    if (onBulkUpdate) {
      onBulkUpdate(ids, { isDeployed: false });
    } else if (onBatchUpdateTokens) {
      const idSet = new Set(ids);
      const updated = tokens.map((t) =>
        idSet.has(t.id) ? { ...t, isDeployed: false } : t
      );
      onBatchUpdateTokens(updated);
    }
    setBulkFeedback(`Marked ${ids.length.toLocaleString()} tokens as Undeployed`);
    setTimeout(() => setBulkFeedback(null), 3500);
  };

  // Export functions (Supports selected, filtered, or all tokens)
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState<boolean>(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Click outside to close export menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    if (isExportMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExportMenuOpen]);

  const getTokensToExport = () => {
    if (selectedTokenIds.size > 0) {
      const selected = displayedTokens.filter((t) => selectedTokenIds.has(t.id));
      if (selected.length > 0) return { items: selected, label: `${selected.length}_selected_records` };
    }
    if (displayedTokens.length > 0) {
      return { items: displayedTokens, label: `${displayedTokens.length}_filtered_records` };
    }
    const all = shuffleSeed !== null ? seededShuffle(tokens, shuffleSeed) : tokens;
    return { items: all, label: `${all.length}_all_records` };
  };

  const exportToCSV = (
    scope: "selected" | "filtered" | "filtered_and_selected" | "all" | "auto" = "auto"
  ) => {
    let targetTokens: TokenRecord[] = [];
    let label = "tokens";

    const filteredAndSelected = displayedTokens.filter((t) => selectedTokenIds.has(t.id));
    const allSelected = tokens.filter((t) => selectedTokenIds.has(t.id));

    if (scope === "filtered_and_selected") {
      if (filteredAndSelected.length > 0) {
        targetTokens = filteredAndSelected;
        label = `filtered_and_selected_${filteredAndSelected.length}`;
      } else if (allSelected.length > 0) {
        targetTokens = allSelected;
        label = `selected_${allSelected.length}`;
      } else {
        targetTokens = displayedTokens;
        label = `filtered_${displayedTokens.length}`;
      }
    } else if (scope === "selected") {
      targetTokens = allSelected.length > 0 ? allSelected : displayedTokens;
      label = allSelected.length > 0 ? `selected_${allSelected.length}` : `filtered_${displayedTokens.length}`;
    } else if (scope === "filtered") {
      targetTokens = displayedTokens;
      label = `filtered_${displayedTokens.length}`;
    } else if (scope === "all") {
      targetTokens = shuffleSeed !== null ? seededShuffle(tokens, shuffleSeed) : tokens;
      label = `all_${tokens.length}`;
    } else {
      // auto: prefer filtered & selected if selection exists, else filtered, else all
      if (filteredAndSelected.length > 0) {
        targetTokens = filteredAndSelected;
        label = `filtered_selected_${filteredAndSelected.length}`;
      } else if (allSelected.length > 0) {
        targetTokens = allSelected;
        label = `selected_${allSelected.length}`;
      } else if (displayedTokens.length > 0) {
        targetTokens = displayedTokens;
        label = `filtered_${displayedTokens.length}`;
      } else {
        targetTokens = shuffleSeed !== null ? seededShuffle(tokens, shuffleSeed) : tokens;
        label = `all_${tokens.length}`;
      }
    }

    if (targetTokens.length === 0) return;

    const { filename, count } = downloadTokensCSV(targetTokens, label);
    setExportFeedback(`Downloaded CSV (${count.toLocaleString()} tokens: ${filename})`);
    setTimeout(() => setExportFeedback(null), 3500);
  };

  const exportToJSON = () => {
    const { items, label } = getTokensToExport();
    if (items.length === 0) return;

    const jsonStr = JSON.stringify(items, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `token_dataset_${label}_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportFeedback(`Downloaded JSON (${items.length.toLocaleString()} tokens)`);
    setTimeout(() => setExportFeedback(null), 3000);
  };

  const exportToSQL = () => {
    const { items, label } = getTokensToExport();
    if (items.length === 0) return;

    const sqlStatements = [
      `-- Token Foundry Dataset Export (${items.length} records)`,
      `-- Generated: ${new Date().toISOString()}`,
      `CREATE TABLE IF NOT EXISTS token_contracts (`,
      `  id VARCHAR(64) PRIMARY KEY,`,
      `  contract_address VARCHAR(64) NOT NULL,`,
      `  token_id VARCHAR(128) NOT NULL,`,
      `  name VARCHAR(128) NOT NULL,`,
      `  symbol VARCHAR(32) NOT NULL,`,
      `  chain VARCHAR(32) NOT NULL,`,
      `  network_id INT NOT NULL,`,
      `  standard VARCHAR(32) NOT NULL,`,
      `  status VARCHAR(32) NOT NULL,`,
      `  price_usd NUMERIC(18, 6),`,
      `  market_cap_usd NUMERIC(24, 2),`,
      `  is_vanity BOOLEAN,`,
      `  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`,
      `);\n`,
      ...items.map(
        (t) =>
          `INSERT INTO token_contracts (id, contract_address, token_id, name, symbol, chain, network_id, standard, status, price_usd, market_cap_usd, is_vanity) VALUES ('${t.id}', '${t.contractAddress}', '${t.tokenId}', '${t.name.replace(/'/g, "''")}', '${t.symbol.replace(/'/g, "''")}', '${t.chain}', ${t.networkId}, '${t.tokenStandard}', '${t.launchStatus}', ${t.priceUsd}, ${t.marketCap}, ${Boolean(t.isVanity)}) ON CONFLICT (id) DO NOTHING;`
      ),
    ].join("\n");

    const blob = new Blob([sqlStatements], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `token_dataset_insert_${label}_${new Date().toISOString().slice(0, 10)}.sql`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportFeedback(`Downloaded SQL Dump (${items.length.toLocaleString()} queries)`);
    setTimeout(() => setExportFeedback(null), 3000);
  };

  const exportToNFTMetadata = () => {
    const { items, label } = getTokensToExport();
    if (items.length === 0) return;

    const nftBatch = items.map((t) => generateTokenNFTMetadata(t));
    const jsonStr = JSON.stringify(nftBatch, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `nft_marketplace_metadata_${label}_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportFeedback(`Downloaded NFT Metadata (${items.length.toLocaleString()} items)`);
    setTimeout(() => setExportFeedback(null), 3000);
  };

  const exportToFoundryDotEnv = () => {
    const { items, label } = getTokensToExport();
    if (items.length === 0) return;

    const envContent = buildMultiTokenDotEnv(items);
    const blob = new Blob([envContent], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `.env.foundry_${label}_${new Date().toISOString().slice(0, 10)}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportFeedback(`Downloaded Foundry .env (${items.length.toLocaleString()} tokens)`);
    setTimeout(() => setExportFeedback(null), 3000);
  };

  const copySelectedPrivateKeys = () => {
    const selected = tokens.filter((t) => selectedTokenIds.has(t.id));
    if (selected.length === 0) return;
    const list = selected
      .map((t) => {
        const pk = t.deployerPrivateKey || generateDeployerPrivateKey(t.chain);
        return `[${t.symbol}] ${t.contractAddress} | Deployer PK: ${pk}`;
      })
      .join("\n");
    navigator.clipboard.writeText(list);
    setCopySuccessMsg(`Copied ${selected.length} deployer private keys to clipboard!`);
    setTimeout(() => setCopySuccessMsg(null), 3000);
  };

  const copySelectedFoundryDotEnv = () => {
    const selected = tokens.filter((t) => selectedTokenIds.has(t.id));
    if (selected.length === 0) return;
    const envContent = buildMultiTokenDotEnv(selected);
    navigator.clipboard.writeText(envContent);
    setCopySuccessMsg(`Copied Foundry .env configuration for ${selected.length} tokens!`);
    setTimeout(() => setCopySuccessMsg(null), 3000);
  };

  const copyAllAddresses = () => {
    const { items } = getTokensToExport();
    const list = items.map((t) => t.contractAddress).join("\n");
    navigator.clipboard.writeText(list);
    setCopySuccessMsg(`Copied ${items.length} contract addresses to clipboard!`);
    setTimeout(() => setCopySuccessMsg(null), 3000);
  };

  const copySelectedContractIds = () => {
    const { items } = getTokensToExport();
    if (items.length === 0) return;
    const list = items
      .map((t) => `[${t.symbol}] Public Contract ID: ${computePublicContractId(t)} | Enterprise Address: ${t.contractAddress}`)
      .join("\n");
    navigator.clipboard.writeText(list);
    setCopySuccessMsg(`Copied ${items.length} public contract IDs (bytes32) to clipboard!`);
    setTimeout(() => setCopySuccessMsg(null), 3000);
  };

  const copySelectedRegistryUrls = () => {
    const { items } = getTokensToExport();
    if (items.length === 0) return;
    const list = items
      .map((t) => {
        const reg = mapTokenToPublicRegistry(t);
        return `[${t.symbol}] ${reg.explorerName}: ${reg.explorerUrl} (RPC: ${reg.rpcEndpoint})`;
      })
      .join("\n");
    navigator.clipboard.writeText(list);
    setCopySuccessMsg(`Copied ${items.length} verifiable block explorer links to clipboard!`);
    setTimeout(() => setCopySuccessMsg(null), 3000);
  };

  // Chain categories metadata for category filter
  const CHAIN_CATEGORIES: Array<{ id: string; label: string; symbol: string }> = [
    { id: "all", label: "All Chains", symbol: "ALL" },
    { id: "ethereum", label: "Ethereum", symbol: "ETH" },
    { id: "base", label: "Base", symbol: "BASE" },
    { id: "arbitrum", label: "Arbitrum", symbol: "ARB" },
    { id: "polygon", label: "Polygon", symbol: "POL" },
    { id: "solana", label: "Solana", symbol: "SOL" },
    { id: "bitcoin", label: "Bitcoin", symbol: "BTC" },
    { id: "quantum", label: "Quantum", symbol: "QTM" },
    { id: "cosmos", label: "Cosmos", symbol: "ATOM" },
  ];

  // Live count per chain category
  const chainCounts = useMemo(() => {
    const counts: Record<string, number> = { all: tokens.length };
    tokens.forEach((t) => {
      counts[t.chain] = (counts[t.chain] || 0) + 1;
    });
    return counts;
  }, [tokens]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = tokens.length;
    const vanityCount = tokens.filter((t) => t.isVanity).length;
    const evmCount = tokens.filter((t) => ["ethereum", "base", "arbitrum", "polygon"].includes(t.chain)).length;
    const solanaCount = tokens.filter((t) => t.chain === "solana").length;
    const enterpriseCount = tokens.filter((t) => verifyEnterpriseContractRequirements(t).isVerified).length;
    const avgSecurity =
      total > 0 ? Math.round(tokens.reduce((acc, t) => acc + t.securityScore, 0) / total) : 0;

    return { total, vanityCount, evmCount, solanaCount, enterpriseCount, avgSecurity };
  }, [tokens]);

  return (
    <div className="space-y-4">
      {/* Persistent Real-Time Search Bar & Chain Category Filter */}
      <div className="sticky top-16 z-30 bg-[#0E0E10]/95 backdrop-blur-md border border-[#1F1F23] rounded-xl p-3.5 shadow-xl transition-all space-y-3">
        {/* Search Bar Row: Filters by address, name, or symbol in real-time */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          <div className="relative flex-1 group">
            <Search className="w-4 h-4 text-[#8E9299] absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-[#F27D26] transition-colors pointer-events-none" />
            <input
              ref={searchInputRef}
              id="input-token-search"
              type="text"
              placeholder="Search tokens by address (0x...), name, or symbol as you type..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-28 py-2.5 bg-[#0A0A0C] border border-[#1F1F23] hover:border-[#2E2E35] rounded-lg text-xs text-[#E0E0E0] placeholder-[#8E9299] focus:outline-none focus:border-[#F27D26] focus:ring-1 focus:ring-[#F27D26]/40 font-mono transition-all"
            />

            {/* Clear Button & Matches Indicator */}
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {searchQuery ? (
                <>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#16161A] text-[#F27D26] border border-[#F27D26]/30 font-medium">
                    {filteredTokens.length.toLocaleString()} {filteredTokens.length === 1 ? "match" : "matches"}
                  </span>
                  <button
                    type="button"
                    id="btn-clear-token-search"
                    onClick={() => {
                      setSearchQuery("");
                      setCurrentPage(1);
                      searchInputRef.current?.focus();
                    }}
                    className="p-1 rounded hover:bg-[#1E1E24] text-[#8E9299] hover:text-white cursor-pointer transition-colors"
                    title="Clear search query (Esc)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-[#555] bg-[#16161A] border border-[#1F1F23] px-1.5 py-0.5 rounded">
                  <span>Press</span>
                  <kbd className="text-[#8E9299] font-bold">/</kbd>
                  <span>to search</span>
                </span>
              )}
            </div>
          </div>

          {/* Quick Search Suggestions */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#666] shrink-0">
            <span className="text-[10px] uppercase tracking-wider hidden xl:inline">Suggestions:</span>
            {["0x", "SOL", "Base", "BEAMN"].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  setSearchQuery(suggestion);
                  setCurrentPage(1);
                  searchInputRef.current?.focus();
                }}
                className="px-2 py-1 rounded bg-[#0A0A0C] hover:bg-[#16161A] border border-[#1F1F23] hover:border-[#F27D26] text-[#8E9299] hover:text-white text-[10px] font-mono transition-colors cursor-pointer"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Dedicated Category Filter for Chains */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#1F1F23]/60">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#8E9299] shrink-0 font-medium mr-1">
              <Layers className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>Chain Category:</span>
            </div>
            {CHAIN_CATEGORIES.map((cat) => {
              const isSelected = selectedChain === cat.id;
              const count = chainCounts[cat.id] || 0;
              return (
                <button
                  key={cat.id}
                  id={`filter-chain-cat-${cat.id}`}
                  type="button"
                  onClick={() => {
                    setSelectedChain(cat.id);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer border flex items-center gap-1.5 shrink-0 ${
                    isSelected
                      ? "bg-[#F27D26]/15 border-[#F27D26] text-[#F27D26] font-semibold shadow-sm"
                      : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white hover:border-[#2E2E35]"
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-sans ${
                      isSelected
                        ? "bg-[#F27D26]/30 text-white font-bold"
                        : "bg-[#16161A] text-[#666]"
                    }`}
                  >
                    {count.toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedChain !== "all" && (
            <button
              type="button"
              id="btn-reset-chain-filter"
              onClick={() => {
                setSelectedChain("all");
                setCurrentPage(1);
              }}
              className="text-[11px] font-mono text-[#F27D26] hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer shrink-0"
            >
              <X className="w-3 h-3" />
              <span>Reset Chain</span>
            </button>
          )}
        </div>

        {/* Active Persistent Filter & Shuffle Ribbon */}
        {(searchQuery || shuffleSeed !== null) && (
          <div className="pt-2 border-t border-[#1F1F23]/60 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#8E9299]">
            <div className="flex flex-wrap items-center gap-2">
              {searchQuery && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[#666]">Active Search:</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#16161A] text-[#E0E0E0] border border-[#2D2D35]">
                    <span>"{searchQuery}"</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setCurrentPage(1);
                      }}
                      className="hover:text-white text-[#8E9299] cursor-pointer"
                      title="Remove search query"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                </div>
              )}
              {shuffleSeed !== null && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  <Shuffle className="w-3 h-3 text-purple-400" />
                  <span>Seeded Shuffle: {formatSeedDisplay(shuffleSeed)}</span>
                  <button
                    type="button"
                    onClick={handleResetOrder}
                    className="hover:text-white text-purple-400 cursor-pointer ml-0.5"
                    title="Reset to default order"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <span className="text-[#666] text-[10px] hidden sm:inline">
                {shuffleSeed !== null
                  ? "(Mulberry32 PRNG Fisher-Yates eliminates large dataset bias)"
                  : "(Matches address, name, or symbol)"}
              </span>
            </div>
            <span className="text-[#F27D26] font-medium">
              Showing {displayedTokens.length} of {tokens.length} tokens
            </span>
          </div>
        )}
      </div>

      {/* Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-lg p-3">
          <span className="text-[10px] uppercase tracking-wider text-[#8E9299] font-medium">Dataset Total</span>
          <p className="text-xl font-bold font-mono text-white mt-0.5">{stats.total.toLocaleString()}</p>
        </div>
        <div className="bg-[#16161A] border border-cyan-500/30 rounded-lg p-3 bg-gradient-to-b from-cyan-950/20 to-transparent">
          <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-medium flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-cyan-400" />
            Enterprise Verified
          </span>
          <p className="text-xl font-bold font-mono text-cyan-300 mt-0.5">{stats.enterpriseCount.toLocaleString()}</p>
        </div>
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-lg p-3">
          <span className="text-[10px] uppercase tracking-wider text-[#8E9299] font-medium">EVM Addresses</span>
          <p className="text-xl font-bold font-mono text-[#F27D26] mt-0.5">{stats.evmCount.toLocaleString()}</p>
        </div>
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-lg p-3">
          <span className="text-[10px] uppercase tracking-wider text-[#8E9299] font-medium">Solana Base58</span>
          <p className="text-xl font-bold font-mono text-emerald-400 mt-0.5">{stats.solanaCount.toLocaleString()}</p>
        </div>
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-lg p-3">
          <span className="text-[10px] uppercase tracking-wider text-[#8E9299] font-medium">Vanity Contracts</span>
          <p className="text-xl font-bold font-mono text-[#F27D26] mt-0.5">{stats.vanityCount.toLocaleString()}</p>
        </div>
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-lg p-3">
          <span className="text-[10px] uppercase tracking-wider text-[#8E9299] font-medium">Avg Security</span>
          <p className="text-xl font-bold font-mono text-green-500 mt-0.5">{stats.avgSecurity}/100</p>
        </div>
      </div>

      {/* Filter and Export Toolbar */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#0A0A0C] border border-[#1F1F23] rounded-lg px-2.5 py-1.5 focus-within:border-[#F27D26]">
              <Layers className="w-3.5 h-3.5 text-[#F27D26]" />
              <label htmlFor="select-chain-category" className="sr-only">Chain Category</label>
              <select
                id="select-chain-category"
                value={selectedChain}
                onChange={(e) => {
                  setSelectedChain(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs text-[#E0E0E0] focus:outline-none font-mono cursor-pointer"
              >
                {CHAIN_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-[#16161A] text-white">
                    {cat.label} ({chainCounts[cat.id] || 0})
                  </option>
                ))}
              </select>
            </div>

            {/* Standard Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#0A0A0C] border border-[#1F1F23] rounded-lg px-2.5 py-1.5 focus-within:border-[#F27D26]">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <label htmlFor="select-token-standard" className="sr-only">Token Standard</label>
              <select
                id="select-token-standard"
                value={selectedStandard}
                onChange={(e) => {
                  setSelectedStandard(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs text-[#E0E0E0] focus:outline-none font-mono cursor-pointer"
              >
                <option value="all" className="bg-[#16161A] text-white">All Standards ({tokens.length})</option>
                <option value="ERC-20" className="bg-[#16161A] text-orange-400">ERC-20 ({tokens.filter(t => t.tokenStandard === "ERC-20").length})</option>
                <option value="SPL-Token" className="bg-[#16161A] text-emerald-400">SPL-Token ({tokens.filter(t => t.tokenStandard === "SPL-Token").length})</option>
                <option value="ERC-721" className="bg-[#16161A] text-purple-400">ERC-721 ({tokens.filter(t => t.tokenStandard === "ERC-721").length})</option>
                <option value="ERC-1155" className="bg-[#16161A] text-violet-400">ERC-1155 ({tokens.filter(t => t.tokenStandard === "ERC-1155").length})</option>
                <option value="ERC-4337" className="bg-[#16161A] text-cyan-400">ERC-4337 ({tokens.filter(t => t.tokenStandard === "ERC-4337").length})</option>
                <option value="Quantum-Hybrid" className="bg-[#16161A] text-rose-400">Quantum-Hybrid ({tokens.filter(t => t.tokenStandard === "Quantum-Hybrid").length})</option>
                <option value="BRC-20/Rune" className="bg-[#16161A] text-amber-400">BRC-20/Rune ({tokens.filter(t => t.tokenStandard === "BRC-20/Rune").length})</option>
              </select>
            </div>

            <select
              value={selectedNarrative}
              onChange={(e) => {
                setSelectedNarrative(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg px-2.5 py-1.5 text-xs text-[#E0E0E0] focus:outline-none focus:border-[#F27D26] font-mono"
            >
              <option value="all">All Narratives</option>
              <option value="ai_agents">AI Agents</option>
              <option value="depin">DePIN</option>
              <option value="rwa">RWA Assets</option>
              <option value="quantum_defi">Quantum DeFi</option>
              <option value="liquid_restaking">Restaking</option>
              <option value="autonomous_worlds">Autonomous Worlds</option>
            </select>

            {/* Status Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#0A0A0C] border border-[#1F1F23] rounded-lg px-2.5 py-1 focus-within:border-[#F27D26]">
              <Filter className="w-3.5 h-3.5 text-[#8E9299]" />
              <label htmlFor="filter-launch-status" className="sr-only">Filter by Status</label>
              <select
                id="filter-launch-status"
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs text-[#E0E0E0] focus:outline-none font-mono cursor-pointer"
              >
                <option value="all" className="bg-[#16161A] text-white">Status: All</option>
                <option value="Deployed" className="bg-[#16161A] text-blue-400">Status: Deployed</option>
                <option value="Audited" className="bg-[#16161A] text-green-400">Status: Audited</option>
                <option value="Paused" className="bg-[#16161A] text-rose-400">Status: Paused</option>
                <option value="Liquidity Locked" className="bg-[#16161A] text-[#F27D26]">Status: Liquidity Locked</option>
                <option value="Rug-Proof Vault" className="bg-[#16161A] text-emerald-400">Status: Rug-Proof Vault</option>
              </select>
            </div>

            {/* Categorical Tag Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#0A0A0C] border border-[#1F1F23] rounded-lg px-2.5 py-1 focus-within:border-[#F27D26]">
              <Tags className="w-3.5 h-3.5 text-orange-400" />
              <label htmlFor="filter-token-tag" className="sr-only">Filter by Tag</label>
              <select
                id="filter-token-tag"
                value={selectedTag}
                onChange={(e) => {
                  setSelectedTag(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs text-[#E0E0E0] focus:outline-none font-mono cursor-pointer"
              >
                <option value="all" className="bg-[#16161A] text-white">Tag: All ({tokens.length})</option>
                {ALL_CATEGORICAL_TAG_IDS.map((tagId) => {
                  const def = CATEGORICAL_TAG_DEFINITIONS[tagId];
                  const count = tokens.filter((t) => t.tags && t.tags.some(tag => tag.toLowerCase() === tagId || tag.toLowerCase().includes(tagId))).length;
                  return (
                    <option key={tagId} value={tagId} className="bg-[#16161A] text-orange-300">
                      {def.label} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setOnlyVanity(!onlyVanity);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                onlyVanity
                  ? "bg-[#0A0A0C] border-[#F27D26] text-[#F27D26] font-bold"
                  : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Vanity Only</span>
            </button>

            <button
              type="button"
              id="btn-filter-enterprise-verified"
              onClick={() => {
                setOnlyEnterprise(!onlyEnterprise);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                onlyEnterprise
                  ? "bg-cyan-950/40 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_12px_rgba(0,240,255,0.2)]"
                  : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white hover:border-cyan-500/40"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Enterprise Verified ({stats.enterpriseCount})</span>
            </button>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Automated Tagging Engine Button */}
            <button
              type="button"
              id="btn-open-auto-tag-engine"
              onClick={() => setIsTaggingModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/40 text-orange-300 font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95 shrink-0"
              title="Automated Tagging Engine: Scan generated token names & narratives, then apply relevant categorical tags (high-yield, experimental, governance, etc.)"
            >
              <Tags className="w-3.5 h-3.5 text-orange-400" />
              <span>Auto-Tag Engine</span>
            </button>

            <button
              type="button"
              id="btn-expand-all-sovereign-mcap"
              onClick={() => {
                if (onExpandAllToSovereignMCap) {
                  onExpandAllToSovereignMCap();
                } else if (onBulkUpdate) {
                  const allIds = tokens.map((t) => t.id);
                  allIds.forEach((id) => {
                    const targetCap = 3_000_000_000_000 + Math.floor(Math.random() * 2_500_000_000_000);
                    onBulkUpdate([id], {
                      marketCap: targetCap,
                      priceUsd: Number((targetCap / 1_000_000_000).toFixed(4)),
                      reserveShares: SOVEREIGN_RESERVE_SHARES,
                      treasuryShares: SOVEREIGN_TREASURY_SHARES,
                      targetOwner: SOVEREIGN_OWNER,
                    });
                  });
                }
                setBulkFeedback("All tokens expanded to >= $3 Trillion CoinMarketCap Sovereign Cap!");
                setTimeout(() => setBulkFeedback(null), 4000);
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95 shrink-0"
              title="Elevate all cryptocurrencies to >= $3 Trillion CoinMarketCap with uint256 18-dec 9e20 Reserve & 9e21 Treasury"
            >
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              <span>⚡ Expand All to &gt;= $3T CoinMarketCap</span>
            </button>

            {/* Deploy All to Blockchain Market Quick CTA */}
            {onOpenMarketDeploy && (
              <button
                type="button"
                id="btn-explorer-deploy-all-market"
                onClick={() => onOpenMarketDeploy()}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-orange-950/50 transition-all active:scale-95 shrink-0"
                title="Deploy All Token Inventions to the Decentralized Blockchain Market with AMM DEX Liquidity"
              >
                <Rocket className="w-3.5 h-3.5 text-white animate-pulse" />
                <span>Deploy All to Market</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Status Filter Tags */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] uppercase tracking-wider text-[#8E9299] font-mono mr-1">Status:</span>
          {[
            { id: "all", label: "All", color: "text-[#E0E0E0]" },
            { id: "Deployed", label: "Deployed", color: "text-blue-400" },
            { id: "Audited", label: "Audited", color: "text-green-400" },
            { id: "Liquidity Locked", label: "Liquidity Locked", color: "text-[#F27D26]" },
            { id: "Paused", label: "Paused", color: "text-rose-400" },
          ].map((status) => {
            const count =
              status.id === "all"
                ? tokens.length
                : tokens.filter((t) => t.launchStatus === status.id).length;
            const isSelected = selectedStatus === status.id;
            return (
              <button
                key={status.id}
                type="button"
                onClick={() => {
                  setSelectedStatus(status.id);
                  setCurrentPage(1);
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-[#0A0A0C] border-[#F27D26] text-white font-bold shadow-sm"
                    : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:border-[#333] hover:text-white"
                }`}
              >
                <span className={status.color}>{status.label}</span>
                <span className="text-[9px] text-[#555] bg-[#16161A] px-1 py-0.2 rounded font-sans">
                  {count.toLocaleString()}
                </span>
              </button>
            );
          })}
          {selectedStatus !== "all" && (
            <button
              type="button"
              onClick={() => {
                setSelectedStatus("all");
                setCurrentPage(1);
              }}
              className="text-[10px] text-[#F27D26] hover:underline font-mono ml-2 cursor-pointer"
            >
              Reset Status
            </button>
          )}
        </div>

        {/* Quick Standard Filter Tags */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#1F1F23]/60">
          <span className="text-[10px] uppercase tracking-wider text-[#8E9299] font-mono mr-1">Standard:</span>
          {[
            { id: "all", label: "All Standards", color: "text-[#E0E0E0]" },
            { id: "ERC-20", label: "ERC-20", color: "text-orange-400" },
            { id: "SPL-Token", label: "SPL-Token", color: "text-emerald-400" },
            { id: "ERC-721", label: "ERC-721", color: "text-purple-400" },
            { id: "ERC-1155", label: "ERC-1155", color: "text-violet-400" },
            { id: "ERC-4337", label: "ERC-4337", color: "text-cyan-400" },
            { id: "Quantum-Hybrid", label: "Quantum", color: "text-rose-400" },
            { id: "BRC-20/Rune", label: "Runes", color: "text-amber-400" },
          ].map((std) => {
            const count =
              std.id === "all"
                ? tokens.length
                : tokens.filter((t) => t.tokenStandard === std.id).length;
            const isSelected = selectedStandard === std.id;
            return (
              <button
                key={std.id}
                type="button"
                onClick={() => {
                  setSelectedStandard(std.id);
                  setCurrentPage(1);
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-[#0A0A0C] border-[#F27D26] text-white font-bold shadow-sm"
                    : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:border-[#333] hover:text-white"
                }`}
              >
                <span className={std.color}>{std.label}</span>
                <span className="text-[9px] text-[#555] bg-[#16161A] px-1 py-0.2 rounded font-sans">
                  {count.toLocaleString()}
                </span>
              </button>
            );
          })}
          {selectedStandard !== "all" && (
            <button
              type="button"
              onClick={() => {
                setSelectedStandard("all");
                setCurrentPage(1);
              }}
              className="text-[10px] text-[#F27D26] hover:underline font-mono ml-2 cursor-pointer"
            >
              Reset Standard
            </button>
          )}
        </div>

        {/* Quick Categorical Tag Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#1F1F23]/60">
          <span className="text-[10px] uppercase tracking-wider text-[#8E9299] font-mono mr-1 flex items-center gap-1">
            <Tags className="w-3 h-3 text-orange-400" />
            Category:
          </span>
          <button
            type="button"
            onClick={() => {
              setSelectedTag("all");
              setCurrentPage(1);
            }}
            className={`px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 transition-all cursor-pointer border ${
              selectedTag === "all"
                ? "bg-[#0A0A0C] border-[#F27D26] text-white font-bold shadow-sm"
                : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:border-[#333] hover:text-white"
            }`}
          >
            <span>All Tags</span>
            <span className="text-[9px] text-[#555] bg-[#16161A] px-1 py-0.2 rounded font-sans">
              {tokens.length.toLocaleString()}
            </span>
          </button>
          {ALL_CATEGORICAL_TAG_IDS.slice(0, 10).map((tagId) => {
            const def = CATEGORICAL_TAG_DEFINITIONS[tagId];
            const count = tokens.filter(
              (t) =>
                t.tags &&
                t.tags.some(
                  (tag) =>
                    tag.toLowerCase() === tagId ||
                    tag.toLowerCase().includes(tagId)
                )
            ).length;
            const isSelected = selectedTag === tagId;
            return (
              <button
                key={tagId}
                type="button"
                onClick={() => {
                  setSelectedTag(isSelected ? "all" : tagId);
                  setCurrentPage(1);
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 transition-all cursor-pointer border ${
                  isSelected
                    ? `${def.badgeBg} ${def.badgeBorder} ${def.badgeText} font-bold shadow-sm ring-1 ring-orange-500/40`
                    : `bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:border-[#333] hover:text-white`
                }`}
                title={`Filter by ${def.label}: ${def.description}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${def.dotColor}`} />
                <span className={isSelected ? def.badgeText : "text-[#A0A0A0]"}>{def.label}</span>
                <span className="text-[9px] text-[#555] bg-[#16161A] px-1 py-0.2 rounded font-sans">
                  {count.toLocaleString()}
                </span>
              </button>
            );
          })}
          {selectedTag !== "all" && (
            <button
              type="button"
              onClick={() => {
                setSelectedTag("all");
                setCurrentPage(1);
              }}
              className="text-[10px] text-[#F27D26] hover:underline font-mono ml-2 cursor-pointer"
            >
              Reset Tag
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsTaggingModalOpen(true)}
            className="text-[10px] text-orange-400 hover:text-orange-300 font-mono ml-auto flex items-center gap-1 px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 hover:border-orange-500/40 cursor-pointer transition-all"
            title="Open Automated Tagging Engine to scan names & narratives"
          >
            <Sparkles className="w-2.5 h-2.5 text-orange-400" />
            <span>Tagging Engine</span>
          </button>
        </div>

        {/* Bulk Actions Banner (appears when tokens are selected) */}
        {selectedTokenIds.size > 0 && (
          <div className="bg-[#0A0A0C] border-2 border-[#F27D26]/60 rounded-xl p-3.5 shadow-lg space-y-3 animate-in fade-in duration-200">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              {/* Selection Summary & Select All Links */}
              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                <span className="px-2.5 py-1 rounded bg-[#F27D26] text-black font-bold font-mono flex items-center gap-1.5 shadow-sm">
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>{selectedTokenIds.size.toLocaleString()} Tokens &amp; Contract IDs Selected</span>
                </span>

                {selectedTokenIds.size < filteredTokens.length ? (
                  <button
                    type="button"
                    id="btn-bulk-select-all-filtered"
                    onClick={handleSelectAllFiltered}
                    className="px-2.5 py-1 rounded bg-[#16161A] hover:bg-[#1F1F23] border border-[#F27D26]/50 text-[#F27D26] hover:text-white font-mono text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Select all {filteredTokens.length.toLocaleString()} matching tokens &amp; IDs</span>
                  </button>
                ) : (
                  <span className="px-2.5 py-0.5 rounded bg-green-500/10 border border-green-500/30 text-green-400 font-mono text-[11px] flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>All {filteredTokens.length.toLocaleString()} tokens &amp; contract IDs selected</span>
                  </span>
                )}

                {/* Quick Copy Selected Contract IDs */}
                <button
                  type="button"
                  id="btn-bulk-copy-contract-ids"
                  onClick={copySelectedContractAddresses}
                  className="px-2.5 py-1 rounded bg-[#16161A] hover:bg-[#1E1E24] border border-[#1F1F23] hover:border-cyan-500 text-cyan-400 hover:text-cyan-300 font-mono text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  title="Copy all selected Contract Addresses (0x... / Solana)"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Contract IDs</span>
                </button>

                {/* Quick Copy Selected uint256 Token IDs */}
                <button
                  type="button"
                  id="btn-bulk-copy-token-ids"
                  onClick={copySelectedTokenIds}
                  className="px-2.5 py-1 rounded bg-[#16161A] hover:bg-[#1E1E24] border border-[#1F1F23] hover:border-amber-500 text-amber-400 hover:text-amber-300 font-mono text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  title="Copy all selected uint256 Token IDs"
                >
                  <Hash className="w-3.5 h-3.5" />
                  <span>Copy Token IDs</span>
                </button>

                {/* Quick Copy ID Specs */}
                <button
                  type="button"
                  id="btn-bulk-copy-specs"
                  onClick={copySelectedContractsAndTokenIds}
                  className="px-2.5 py-1 rounded bg-[#16161A] hover:bg-[#1E1E24] border border-[#1F1F23] hover:border-[#F27D26] text-[#8E9299] hover:text-white font-mono text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  title="Copy formatted tokens, contract addresses, and token IDs"
                >
                  <FileText className="w-3.5 h-3.5 text-[#F27D26]" />
                  <span>Copy All ID Specs</span>
                </button>

                {/* Open Private Keys Vault for All Tokens */}
                <button
                  type="button"
                  id="btn-bulk-open-keys-vault"
                  onClick={() => setIsKeysVaultOpen(true)}
                  className="px-2.5 py-1 rounded bg-[#1A1810] hover:bg-[#252012] border border-amber-500/50 hover:border-amber-400 text-amber-300 hover:text-white font-mono text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm"
                  title="Open Private Keys Vault to inspect, generate, and export keys for all tokens"
                >
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>Keys Vault ({tokens.length})</span>
                </button>

                {/* Generate / Ensure Private Keys for All Tokens */}
                <button
                  type="button"
                  id="btn-bulk-generate-all-keys"
                  onClick={() => {
                    const updated = ensureAllTokensHavePrivateKeys(tokens, true);
                    if (onUpdateTokens) {
                      onUpdateTokens(updated);
                    } else if (onBatchUpdateTokens) {
                      onBatchUpdateTokens(updated);
                    }
                    setCopySuccessMsg(`Successfully created fresh 256-bit private keys for all ${updated.length} tokens!`);
                    setTimeout(() => setCopySuccessMsg(null), 3500);
                  }}
                  className="px-2.5 py-1 rounded bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/60 hover:border-amber-400 text-amber-300 hover:text-amber-100 font-mono text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm font-semibold"
                  title="Create and verify functional 256-bit private keys for all tokens"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Create Keys For All</span>
                </button>

                {/* Quick Copy Deployer Private Keys */}
                <button
                  type="button"
                  id="btn-bulk-copy-private-keys"
                  onClick={copySelectedPrivateKeys}
                  className="px-2.5 py-1 rounded bg-[#16161A] hover:bg-[#1E1E24] border border-amber-500/30 hover:border-amber-400 text-amber-400 hover:text-amber-300 font-mono text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  title="Copy all selected 256-bit Deployer Private Keys for Foundry/Cast/Devnet"
                >
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>Copy Private Keys</span>
                </button>

                {/* Quick Export Foundry .env */}
                <button
                  type="button"
                  id="btn-bulk-export-foundry-env"
                  onClick={exportToFoundryDotEnv}
                  className="px-2.5 py-1 rounded bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 hover:text-white font-mono text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm"
                  title="Download .env file with RPCs, Deployer Keys & Contract IDs for selected tokens"
                >
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Export Foundry .env</span>
                </button>

                {/* Quick Export CSV for Filtered & Selected */}
                <button
                  type="button"
                  id="btn-bulk-export-csv"
                  onClick={() => exportToCSV("filtered_and_selected")}
                  className="px-2.5 py-1 rounded bg-[#F27D26]/20 hover:bg-[#F27D26]/30 border border-[#F27D26]/50 hover:border-[#F27D26] text-[#F27D26] hover:text-white font-mono text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm font-semibold"
                  title="Export currently filtered & selected tokens to CSV for external analysis"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#F27D26]" />
                  <span>
                    Export CSV (
                    {filteredTokens.filter((t) => selectedTokenIds.has(t.id)).length || selectedTokenIds.size}
                    )
                  </span>
                </button>

                {/* Quick Duplicate Selected Tokens */}
                <button
                  type="button"
                  id="btn-bulk-duplicate-tokens"
                  onClick={handleBulkDuplicate}
                  className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 hover:border-amber-400 text-amber-300 hover:text-amber-200 font-mono text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm font-semibold"
                  title="Duplicate selected tokens with new random contract addresses and shared tokenomics metadata"
                >
                  <CopyPlus className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    Duplicate Selected (
                    {filteredTokens.filter((t) => selectedTokenIds.has(t.id)).length || selectedTokenIds.size}
                    )
                  </span>
                </button>

                {/* Bulk Delete Selected Tokens */}
                <button
                  type="button"
                  id="btn-bulk-delete-selected"
                  onClick={() => setIsBulkDeleteConfirmOpen(true)}
                  className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 hover:border-rose-400 text-rose-300 hover:text-rose-100 font-mono text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm font-semibold"
                  title="Remove selected tokens from stream and database"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>
                    Bulk Delete (
                    {filteredTokens.filter((t) => selectedTokenIds.has(t.id)).length || selectedTokenIds.size}
                    )
                  </span>
                </button>

                {/* Batch Rename Tool Toggle Button */}
                <button
                  type="button"
                  id="btn-bulk-toggle-rename"
                  onClick={() => setIsBatchRenameOpen((prev) => !prev)}
                  className={`px-2.5 py-1 rounded font-mono text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm font-semibold border ${
                    isBatchRenameOpen
                      ? "bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.3)]"
                      : "bg-indigo-500/20 hover:bg-indigo-500/30 border-indigo-500/40 hover:border-indigo-400 text-indigo-300 hover:text-indigo-200"
                  }`}
                  title="Open Batch Rename Tool to apply a prefix or suffix to the names of selected tokens"
                >
                  <Type className="w-3.5 h-3.5 text-indigo-400" />
                  <span>
                    Batch Rename (
                    {filteredTokens.filter((t) => selectedTokenIds.has(t.id)).length || selectedTokenIds.size}
                    )
                  </span>
                </button>

                {/* Auto-Tag Engine for Selected */}
                <button
                  type="button"
                  id="btn-bulk-auto-tag-selected"
                  onClick={() => setIsTaggingModalOpen(true)}
                  className="px-2.5 py-1 rounded bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 hover:border-orange-400 text-orange-300 hover:text-orange-100 font-mono text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm font-semibold"
                  title="Scan selected tokens with the Automated Tagging Engine to apply relevant categorical tags"
                >
                  <Tags className="w-3.5 h-3.5 text-orange-400" />
                  <span>
                    Auto-Tag Selected (
                    {filteredTokens.filter((t) => selectedTokenIds.has(t.id)).length || selectedTokenIds.size}
                    )
                  </span>
                </button>

                {/* Market Evolution Tool Toggle Button */}
                <button
                  type="button"
                  id="btn-bulk-toggle-market-evolution"
                  onClick={() => setIsMarketEvolutionOpen((prev) => !prev)}
                  className={`px-2.5 py-1 rounded font-mono text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm font-semibold border ${
                    isMarketEvolutionOpen
                      ? "bg-purple-600 text-white border-purple-400 ring-2 ring-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                      : "bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/40 hover:border-purple-400 text-purple-300 hover:text-purple-200"
                  }`}
                  title="Randomly assign new narrative & genre tags to selected tokens to simulate organic market development"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>
                    Market Evolution (
                    {filteredTokens.filter((t) => selectedTokenIds.has(t.id)).length || selectedTokenIds.size}
                    )
                  </span>
                </button>

                <button
                  type="button"
                  id="btn-bulk-quick-randomize-narrative"
                  onClick={handleQuickRandomizeMarketEvolution}
                  className="px-2 py-1 rounded bg-[#16161A] hover:bg-[#1F1F23] border border-purple-500/30 hover:border-purple-400 text-purple-300 hover:text-white font-mono text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                  title="Quick 1-Click: Randomly assign new narratives, genres, and organic tags to selected tokens"
                >
                  <Shuffle className="w-3 h-3 text-purple-400" />
                  <span>Quick Randomize</span>
                </button>

                <button
                  type="button"
                  id="btn-bulk-deselect-all"
                  onClick={handleClearSelection}
                  className="px-2 py-1 rounded bg-[#16161A] hover:bg-[#1F1F23] border border-[#1F1F23] text-[#8E9299] hover:text-white font-mono text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                >
                  <X className="w-3 h-3" />
                  <span>Deselect All</span>
                </button>
              </div>

              {/* Bulk Update Controls */}
              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                {/* Bulk Status Update */}
                <div className="flex items-center gap-1 bg-[#16161A] border border-[#1F1F23] rounded-lg p-1">
                  <span className="text-[11px] font-mono text-[#8E9299] pl-1">Status:</span>
                  <select
                    value={bulkTargetStatus}
                    onChange={(e) => setBulkTargetStatus(e.target.value as LaunchStatus)}
                    className="bg-[#0A0A0C] border border-[#1F1F23] rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-[#F27D26]"
                  >
                    <option value="">Select Status...</option>
                    <option value="Deployed">Deployed</option>
                    <option value="Audited">Audited</option>
                    <option value="Liquidity Locked">Liquidity Locked</option>
                    <option value="Paused">Paused</option>
                    <option value="Rug-Proof Vault">Rug-Proof Vault</option>
                    <option value="Presale">Presale</option>
                  </select>
                  <button
                    type="button"
                    disabled={!bulkTargetStatus}
                    onClick={() => handleApplyBulkStatus()}
                    className="px-2.5 py-1 rounded bg-[#F27D26] hover:bg-[#ff8e3c] text-black font-bold text-xs uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95"
                  >
                    Update
                  </button>
                </div>

                {/* Bulk Standard Update */}
                <div className="flex items-center gap-1 bg-[#16161A] border border-[#1F1F23] rounded-lg p-1">
                  <span className="text-[11px] font-mono text-[#8E9299] pl-1">Standard:</span>
                  <select
                    value={bulkTargetStandard}
                    onChange={(e) => setBulkTargetStandard(e.target.value as TokenStandard)}
                    className="bg-[#0A0A0C] border border-[#1F1F23] rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-[#F27D26]"
                  >
                    <option value="">Select Standard...</option>
                    <option value="ERC-20">ERC-20</option>
                    <option value="ERC-721">ERC-721</option>
                    <option value="ERC-1155">ERC-1155</option>
                    <option value="ERC-4337">ERC-4337</option>
                    <option value="Quantum-Hybrid">Quantum-Hybrid</option>
                    <option value="SPL-Token">SPL-Token</option>
                    <option value="BRC-20/Rune">BRC-20/Rune</option>
                  </select>
                  <button
                    type="button"
                    disabled={!bulkTargetStandard}
                    onClick={() => handleApplyBulkStandard()}
                    className="px-2.5 py-1 rounded bg-[#F27D26] hover:bg-[#ff8e3c] text-black font-bold text-xs uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95"
                  >
                    Update
                  </button>
                </div>

                {/* Bulk Deployment Status Quick Controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    id="btn-bulk-mark-deployed"
                    onClick={handleBulkMarkDeployed}
                    className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 hover:text-emerald-200 font-mono text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm font-semibold"
                    title="Mark all selected tokens as Deployed on network"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Mark Deployed</span>
                  </button>

                  <button
                    type="button"
                    id="btn-bulk-mark-undeployed"
                    onClick={handleBulkMarkUndeployed}
                    className="px-2.5 py-1 rounded bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 hover:border-zinc-500 text-zinc-300 hover:text-zinc-100 font-mono text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm font-semibold"
                    title="Mark all selected tokens as Undeployed"
                  >
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Mark Undeployed</span>
                  </button>

                  {/* Deploy Selected to Blockchain Market CTA */}
                  {onOpenMarketDeploy && (
                    <button
                      type="button"
                      id="btn-bulk-deploy-market"
                      onClick={() => onOpenMarketDeploy(Array.from(selectedTokenIds))}
                      className="px-3 py-1 rounded bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md shadow-orange-950/40"
                      title="Deploy selected tokens directly to the decentralized blockchain market (Uniswap / AMM pairs)"
                    >
                      <Rocket className="w-3.5 h-3.5" />
                      <span>Deploy to Market ({selectedTokenIds.size})</span>
                    </button>
                  )}

                  {/* Swap / Liquidate Selected CTA */}
                  {onOpenGlobalSwapSell && (
                    <button
                      type="button"
                      id="btn-bulk-swap-sell"
                      onClick={() => {
                        const firstSelected = tokens.find((t) => selectedTokenIds.has(t.id));
                        if (firstSelected) {
                          onOpenGlobalSwapSell(firstSelected, "swap");
                        }
                      }}
                      className="px-3 py-1 rounded bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md shadow-cyan-950/40"
                      title="Universal Token Swap across 52 World Exchanges connected to Treasury 0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0"
                    >
                      <ArrowDownUp className="w-3.5 h-3.5" />
                      <span>Universal Swap Selected ({selectedTokenIds.size})</span>
                    </button>
                  )}

                  {/* Compare Selected Tokens Button */}
                  <button
                    type="button"
                    id="btn-bulk-compare-tokens"
                    onClick={() => handleOpenCompare()}
                    className="px-3 py-1 rounded bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md shadow-indigo-950/40"
                    title="Open Side-by-Side Comparison Matrix for selected tokens"
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>Compare Tokens {selectedTokenIds.size >= 2 ? `(${selectedTokenIds.size})` : ""}</span>
                  </button>
                </div>

                {/* Elevate Selected to Sovereign Tier */}
                <button
                  type="button"
                  onClick={handleExpandSelectedToSovereignMCap}
                  className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm"
                  title="Assign uint256 18-dec 9e20 Reserve, 9e21 Treasury, and >= $3T CoinMarketCap to selected tokens"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Elevate to &gt;= $3T Sovereign Tier</span>
                </button>
              </div>
            </div>

            {/* Dedicated Batch Rename Tool Panel */}
            {isBatchRenameOpen && (
              <div
                id="panel-batch-rename-tool"
                className="bg-[#0c0c10] border border-indigo-500/40 rounded-xl p-4 space-y-4 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 mt-1"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#1F1F23] pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      <Type className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Batch Rename Selected Tokens</span>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-mono text-[11px] font-normal">
                          {selectedTokensForPreview.length} Selected
                        </span>
                      </h4>
                      <p className="text-[11px] text-[#8E9299]">
                        Apply a custom prefix, suffix, or both to all currently selected token names simultaneously.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBatchRenameOpen(false)}
                    className="p-1.5 rounded-md text-[#8E9299] hover:text-white hover:bg-[#1F1F23] transition-colors cursor-pointer"
                    title="Close Batch Rename Tool"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Prefix & Suffix Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Prefix Column */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="input-batch-rename-prefix" className="text-xs font-mono text-indigo-300 flex items-center gap-1 font-medium">
                        <span>Prefix</span>
                        <span className="text-[10px] text-[#8E9299]">(prepended before name)</span>
                      </label>
                      {batchRenamePrefix && (
                        <button
                          type="button"
                          onClick={() => setBatchRenamePrefix("")}
                          className="text-[10px] text-[#8E9299] hover:text-rose-400 font-mono cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div>
                      <input
                        id="input-batch-rename-prefix"
                        type="text"
                        value={batchRenamePrefix}
                        onChange={(e) => setBatchRenamePrefix(e.target.value)}
                        placeholder="e.g. [PROD] , Apex , Alpha-"
                        className="w-full bg-[#070709] border border-[#1F1F23] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-gray-600 transition-all outline-none"
                      />
                    </div>
                    {/* Prefix Quick Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] font-mono text-[#8E9299]">Presets:</span>
                      {["[PROD] ", "[V2] ", "Apex ", "Enterprise-", "Staked-", "Wrapped "].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setBatchRenamePrefix(preset)}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-all cursor-pointer ${
                            batchRenamePrefix === preset
                              ? "bg-indigo-600 text-white border-indigo-400 font-bold"
                              : "bg-[#16161A] hover:bg-[#1E1E24] text-[#8E9299] hover:text-indigo-300 border-[#1F1F23] hover:border-indigo-500/40"
                          }`}
                        >
                          {preset.trim()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Suffix Column */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="input-batch-rename-suffix" className="text-xs font-mono text-amber-300 flex items-center gap-1 font-medium">
                        <span>Suffix</span>
                        <span className="text-[10px] text-[#8E9299]">(appended after name)</span>
                      </label>
                      {batchRenameSuffix && (
                        <button
                          type="button"
                          onClick={() => setBatchRenameSuffix("")}
                          className="text-[10px] text-[#8E9299] hover:text-rose-400 font-mono cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div>
                      <input
                        id="input-batch-rename-suffix"
                        type="text"
                        value={batchRenameSuffix}
                        onChange={(e) => setBatchRenameSuffix(e.target.value)}
                        placeholder="e.g.  Protocol,  (V2),  Vault"
                        className="w-full bg-[#070709] border border-[#1F1F23] focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-gray-600 transition-all outline-none"
                      />
                    </div>
                    {/* Suffix Quick Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] font-mono text-[#8E9299]">Presets:</span>
                      {[" Protocol", " Vault", " (V2)", " DAO", " Core", " Network"].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setBatchRenameSuffix(preset)}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-all cursor-pointer ${
                            batchRenameSuffix === preset
                              ? "bg-amber-500 text-black border-amber-400 font-bold"
                              : "bg-[#16161A] hover:bg-[#1E1E24] text-[#8E9299] hover:text-amber-300 border-[#1F1F23] hover:border-amber-500/40"
                          }`}
                        >
                          {preset.trim()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Additional Rename Options */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono pt-1 text-[#8E9299]">
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={batchRenameTrimWhitespace}
                      onChange={(e) => setBatchRenameTrimWhitespace(e.target.checked)}
                      className="rounded bg-[#070709] border-[#1F1F23] text-indigo-500 focus:ring-0 cursor-pointer"
                    />
                    <span>Trim outer whitespace from final name</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={batchRenameUpdateSymbol}
                      onChange={(e) => setBatchRenameUpdateSymbol(e.target.checked)}
                      className="rounded bg-[#070709] border-[#1F1F23] text-indigo-500 focus:ring-0 cursor-pointer"
                    />
                    <span>Also modify token ticker symbol</span>
                  </label>
                </div>

                {/* Optional Symbol Modifier Row if checked */}
                {batchRenameUpdateSymbol && (
                  <div className="p-3 rounded-lg bg-[#070709] border border-[#1F1F23] grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in duration-150">
                    <div>
                      <label className="text-[11px] font-mono text-emerald-400 block mb-1">Symbol Prefix (e.g. s, v, W)</label>
                      <input
                        type="text"
                        value={batchRenameSymbolPrefix}
                        onChange={(e) => setBatchRenameSymbolPrefix(e.target.value)}
                        placeholder="e.g. s, w, v"
                        className="w-full bg-[#16161A] border border-[#1F1F23] rounded px-2.5 py-1 text-xs font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono text-emerald-400 block mb-1">Symbol Suffix (e.g. V2, LP)</label>
                      <input
                        type="text"
                        value={batchRenameSymbolSuffix}
                        onChange={(e) => setBatchRenameSymbolSuffix(e.target.value)}
                        placeholder="e.g. V2, -LP"
                        className="w-full bg-[#16161A] border border-[#1F1F23] rounded px-2.5 py-1 text-xs font-mono text-white"
                      />
                    </div>
                  </div>
                )}

                {/* Live Interactive Preview Box */}
                <div className="bg-[#070709] border border-[#1F1F23] rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#8E9299] flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="font-semibold text-gray-300">Live Name Preview:</span>
                    </span>
                    <span className="text-[11px] text-[#8E9299]">
                      Showing {Math.min(3, selectedTokensForPreview.length)} of {selectedTokensForPreview.length} target tokens
                    </span>
                  </div>

                  {(!batchRenamePrefix && !batchRenameSuffix && (!batchRenameUpdateSymbol || (!batchRenameSymbolPrefix && !batchRenameSymbolSuffix))) ? (
                    <div className="py-2 text-center text-xs font-mono text-[#8E9299] italic">
                      Type a prefix or suffix above, or select a preset, to view a live preview of the updated token names.
                    </div>
                  ) : (
                    <div className="space-y-1.5 font-mono text-xs">
                      {selectedTokensForPreview.slice(0, 3).map((token) => {
                        const previewName = batchRenameTrimWhitespace
                          ? `${batchRenamePrefix}${token.name}${batchRenameSuffix}`.trim() || token.name
                          : `${batchRenamePrefix}${token.name}${batchRenameSuffix}` || token.name;

                        const previewSymbol = batchRenameUpdateSymbol
                          ? (batchRenameTrimWhitespace
                              ? `${batchRenameSymbolPrefix}${token.symbol}${batchRenameSymbolSuffix}`.trim()
                              : `${batchRenameSymbolPrefix}${token.symbol}${batchRenameSymbolSuffix}`) || token.symbol
                          : token.symbol;

                        return (
                          <div
                            key={token.id}
                            className="flex flex-wrap items-center justify-between gap-2 bg-[#121217] px-3 py-1.5 rounded border border-[#1F1F23]/80"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[#8E9299] line-through decoration-[#8E9299]/50 text-[11px]">
                                {token.name}
                              </span>
                              <span className="text-gray-500">→</span>
                              <span className="text-white font-medium flex items-center">
                                {batchRenamePrefix && (
                                  <span className="text-indigo-400 font-bold bg-indigo-500/15 px-1 py-0.2 rounded border border-indigo-500/30 mr-0.5">
                                    {batchRenamePrefix}
                                  </span>
                                )}
                                <span>{token.name}</span>
                                {batchRenameSuffix && (
                                  <span className="text-amber-400 font-bold bg-amber-500/15 px-1 py-0.2 rounded border border-amber-500/30 ml-0.5">
                                    {batchRenameSuffix}
                                  </span>
                                )}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[11px]">
                              {batchRenameUpdateSymbol && (batchRenameSymbolPrefix || batchRenameSymbolSuffix) ? (
                                <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold">
                                  ${previewSymbol}
                                </span>
                              ) : (
                                <span className="text-gray-400 bg-gray-800/40 px-1.5 py-0.5 rounded">
                                  ${token.symbol}
                                </span>
                              )}
                              <span className="text-[#8E9299] text-[10px]">({token.chain})</span>
                            </div>
                          </div>
                        );
                      })}
                      {selectedTokensForPreview.length > 3 && (
                        <div className="text-[11px] text-[#8E9299] italic pl-1 pt-0.5">
                          ...and {selectedTokensForPreview.length - 3} more selected token{selectedTokensForPreview.length - 3 > 1 ? "s" : ""} will be updated with identical formatting.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#1F1F23]">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      id="btn-apply-batch-rename"
                      disabled={
                        (!batchRenamePrefix && !batchRenameSuffix && (!batchRenameUpdateSymbol || (!batchRenameSymbolPrefix && !batchRenameSymbolSuffix))) ||
                        selectedTokensForPreview.length === 0
                      }
                      onClick={handleApplyBatchRename}
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold font-mono text-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-md shadow-indigo-600/20"
                    >
                      <Check className="w-4 h-4" />
                      <span>
                        Apply Rename to {selectedTokensForPreview.length} Token{selectedTokensForPreview.length > 1 ? "s" : ""}
                      </span>
                    </button>

                    <button
                      type="button"
                      id="btn-clear-batch-rename-inputs"
                      onClick={() => {
                        setBatchRenamePrefix("");
                        setBatchRenameSuffix("");
                        setBatchRenameSymbolPrefix("");
                        setBatchRenameSymbolSuffix("");
                      }}
                      className="px-3 py-2 rounded-lg bg-[#16161A] hover:bg-[#1F1F23] border border-[#1F1F23] text-[#8E9299] hover:text-white font-mono text-xs cursor-pointer transition-all active:scale-95"
                    >
                      Reset Inputs
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsBatchRenameOpen(false)}
                    className="px-3 py-2 rounded-lg text-[#8E9299] hover:text-white font-mono text-xs cursor-pointer transition-colors"
                  >
                    Done / Close
                  </button>
                </div>
              </div>
            )}

            {/* Quick Bulk Presets & Feedback */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#1F1F23]/60 text-[11px] font-mono">
              <div className="flex items-center gap-2">
                <span className="text-[#8E9299]">Quick Status:</span>
                <button
                  type="button"
                  onClick={() => handleApplyBulkStatus("Audited")}
                  className="px-2 py-0.5 rounded bg-[#16161A] hover:bg-[#1F1F23] text-green-400 border border-green-500/30 cursor-pointer"
                >
                  ✓ Set Audited
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyBulkStatus("Liquidity Locked")}
                  className="px-2 py-0.5 rounded bg-[#16161A] hover:bg-[#1F1F23] text-[#F27D26] border border-[#F27D26]/30 cursor-pointer"
                >
                  🔒 Set Liquidity Locked
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyBulkStatus("Paused")}
                  className="px-2 py-0.5 rounded bg-[#16161A] hover:bg-[#1F1F23] text-rose-400 border border-rose-500/30 cursor-pointer"
                >
                  ⏸ Set Paused
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyBulkStatus("Deployed")}
                  className="px-2 py-0.5 rounded bg-[#16161A] hover:bg-[#1F1F23] text-blue-400 border border-blue-500/30 cursor-pointer"
                >
                  🚀 Set Deployed
                </button>
              </div>

              {bulkFeedback && (
                <div className="text-green-400 font-bold flex items-center gap-1.5 animate-pulse">
                  <Check className="w-3.5 h-3.5" />
                  <span>{bulkFeedback}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action / Export Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1F1F23]">
          <div className="flex items-center gap-2 text-xs text-[#8E9299]">
            <span>
              Showing <span className="font-mono text-white font-semibold">{displayedTokens.length.toLocaleString()}</span> of{" "}
              <span className="font-mono">{tokens.length.toLocaleString()}</span> items
            </span>
            {shuffleSeed !== null && (
              <span className="text-purple-400 text-[11px] font-mono flex items-center gap-1 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                <Shuffle className="w-3 h-3" /> Shuffled ({formatSeedDisplay(shuffleSeed)})
              </span>
            )}
            {selectedTokenIds.size > 0 && (
              <span className="text-[#F27D26] font-mono">
                ({selectedTokenIds.size.toLocaleString()} selected)
              </span>
            )}
            {exportFeedback && (
              <span className="text-[#F27D26] font-medium flex items-center gap-1 bg-[#F27D26]/10 px-2 py-0.5 rounded border border-[#F27D26]/30 animate-pulse">
                <Download className="w-3 h-3" /> {exportFeedback}
              </span>
            )}
            {copySuccessMsg && (
              <span className="text-green-500 font-medium flex items-center gap-1 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/30">
                <Check className="w-3 h-3" /> {copySuccessMsg}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Dedicated Enable Checkbox Button: Select All Tokens & Contract IDs */}
            <button
              id="btn-select-all-tokens-and-contracts"
              type="button"
              onClick={handleToggleSelectAllTokensAndContractIds}
              className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-2 font-mono transition-all cursor-pointer shadow-sm active:scale-95 ${
                isAllFilteredSelected
                  ? "bg-[#F27D26] text-black border-[#F27D26] font-bold shadow-[#F27D26]/20 ring-2 ring-[#F27D26]/40"
                  : isSomeFilteredSelected
                  ? "bg-[#F27D26]/20 text-[#F27D26] border-[#F27D26]/60 font-semibold"
                  : "bg-[#0A0A0C] hover:bg-[#1E1E24] border-[#1F1F23] hover:border-[#F27D26] text-[#E0E0E0] hover:text-white"
              }`}
              title={
                isAllFilteredSelected
                  ? `Deselect all ${displayedTokens.length} tokens and contract IDs`
                  : `Select all ${displayedTokens.length} tokens and contract IDs`
              }
            >
              {isAllFilteredSelected ? (
                <CheckSquare className="w-4 h-4 text-black shrink-0" />
              ) : isSomeFilteredSelected ? (
                <MinusSquare className="w-4 h-4 text-[#F27D26] shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-[#8E9299] shrink-0" />
              )}
              <span>
                {isAllFilteredSelected
                  ? `Deselect All (${displayedTokens.length} Selected)`
                  : isSomeFilteredSelected
                  ? `Select All Tokens & Contract IDs (${selectedTokenIds.size}/${displayedTokens.length})`
                  : `Select All Tokens & Contract IDs (${displayedTokens.length})`}
              </span>
            </button>

            {/* Batch Rename Quick Tool Trigger in Actions Bar */}
            <button
              id="btn-toolbar-batch-rename"
              type="button"
              onClick={() => {
                if (selectedTokenIds.size === 0 && displayedTokens.length > 0) {
                  const visibleIds = new Set<string>(displayedTokens.slice(0, 25).map((t: TokenRecord) => t.id));
                  setSelectedTokenIds(visibleIds);
                }
                setIsBatchRenameOpen(true);
              }}
              className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 font-mono transition-all cursor-pointer shadow-sm active:scale-95 ${
                isBatchRenameOpen && selectedTokenIds.size > 0
                  ? "bg-indigo-600 text-white border-indigo-400 font-bold ring-2 ring-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.3)]"
                  : "bg-[#0A0A0C] hover:bg-[#1E1E24] border-[#1F1F23] hover:border-indigo-500/50 text-[#E0E0E0] hover:text-white"
              }`}
              title="Apply a prefix or suffix to the names of selected tokens"
            >
              <Type className={`w-3.5 h-3.5 ${isBatchRenameOpen && selectedTokenIds.size > 0 ? "text-white" : "text-indigo-400"}`} />
              <span>Batch Rename</span>
              {selectedTokenIds.size > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 font-bold">
                  {selectedTokenIds.size}
                </span>
              )}
            </button>

            {/* Compare Tokens Tool Trigger in Actions Bar */}
            <button
              id="btn-toolbar-compare-tokens"
              type="button"
              onClick={() => handleOpenCompare()}
              className="px-3 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 font-mono transition-all cursor-pointer shadow-sm active:scale-95 bg-[#0A0A0C] hover:bg-[#1E1E24] border-[#1F1F23] hover:border-cyan-500/50 text-[#E0E0E0] hover:text-white"
              title="Open Side-by-Side Token Comparison Matrix"
            >
              <Scale className="w-3.5 h-3.5 text-cyan-400" />
              <span>Compare Tokens</span>
              {selectedTokenIds.size >= 2 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-bold">
                  {selectedTokenIds.size}
                </span>
              )}
            </button>

            {/* Seeded Random Shuffle Order Button (Fisher-Yates + Mulberry32 PRNG) */}
            <div className="flex items-center gap-1">
              <button
                id="btn-shuffle-order"
                type="button"
                onClick={handleShuffleOrder}
                className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 font-mono transition-all cursor-pointer shadow-sm active:scale-95 ${
                  shuffleSeed !== null
                    ? "bg-purple-500/20 border-purple-500/60 text-purple-300 font-semibold ring-1 ring-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.2)]"
                    : "bg-[#0A0A0C] hover:bg-[#1E1E24] border-[#1F1F23] hover:border-purple-500/50 text-[#E0E0E0] hover:text-white"
                }`}
                title={
                  shuffleSeed !== null
                    ? `Display order randomized via Mulberry32 Seed ${formatSeedDisplay(shuffleSeed)}. Click to generate a new seeded permutation.`
                    : "Randomize tokens display order using a seeded random function (Fisher-Yates + Mulberry32 PRNG) to prevent bias in large datasets"
                }
              >
                <Shuffle className={`w-3.5 h-3.5 ${shuffleSeed !== null ? "text-purple-400" : "text-[#8E9299]"}`} />
                <span>Shuffle Order</span>
                {shuffleSeed !== null && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-200 border border-purple-400/30 font-bold">
                    {formatSeedDisplay(shuffleSeed)}
                  </span>
                )}
              </button>

              {shuffleSeed !== null && (
                <button
                  id="btn-reset-shuffle-order"
                  type="button"
                  onClick={handleResetOrder}
                  className="px-2 py-1.5 rounded-lg bg-[#0A0A0C] hover:bg-[#1E1E24] border border-[#1F1F23] hover:border-rose-500/40 text-[#8E9299] hover:text-rose-400 text-xs font-mono transition-colors cursor-pointer flex items-center gap-1"
                  title="Reset tokens display back to default chronological/index order"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span className="hidden xl:inline">Reset</span>
                </button>
              )}
            </div>

            <button
              id="btn-toggle-charts"
              onClick={() => setShowVisualCharts(!showVisualCharts)}
              className={`px-2.5 py-1.5 rounded border text-xs flex items-center gap-1.5 font-medium transition-all cursor-pointer ${
                showVisualCharts
                  ? "bg-[#F27D26] text-black border-[#F27D26] font-bold"
                  : "bg-[#0A0A0C] hover:bg-[#1E1E24] border-[#1F1F23] text-[#8E9299] hover:text-white"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{showVisualCharts ? "Hide Visual Charts" : "Recharts Analytics"}</span>
            </button>

            {/* Staggered Entrance Animation Toggle & Replay */}
            <button
              id="btn-toggle-stagger-animation"
              type="button"
              onClick={() => {
                if (!staggerAnimationEnabled) {
                  setStaggerAnimationEnabled(true);
                  setBatchWaveId((v) => v + 1);
                } else {
                  // If already enabled, clicking acts as a trigger to replay the cascade
                  setBatchWaveId((v) => v + 1);
                }
              }}
              className={`px-2.5 py-1.5 rounded border text-xs flex items-center gap-1.5 font-medium transition-all cursor-pointer ${
                staggerAnimationEnabled
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-medium hover:bg-emerald-500/25"
                  : "bg-[#0A0A0C] hover:bg-[#1E1E24] border-[#1F1F23] text-[#8E9299] hover:text-white"
              }`}
              title="Staggered entrance waterfall animation active for high-volume batch generation. Click to replay."
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Stagger Cascade</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </button>

            <button
              id="btn-copy-addresses"
              onClick={copyAllAddresses}
              className="px-2.5 py-1.5 rounded bg-[#0A0A0C] hover:bg-[#1E1E24] border border-[#1F1F23] text-xs text-[#E0E0E0] flex items-center gap-1.5 font-medium transition-all cursor-pointer"
              title="Copy all target contract addresses to clipboard"
            >
              <Copy className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>Copy Addresses</span>
            </button>

            {/* Copy Public Contract IDs Button */}
            <button
              id="btn-copy-public-contract-ids"
              onClick={copySelectedContractIds}
              className="px-2.5 py-1.5 rounded bg-[#0A0A0C] hover:bg-[#1E1E24] border border-[#1F1F23] text-xs text-[#E0E0E0] flex items-center gap-1.5 font-medium transition-all cursor-pointer"
              title="Copy public contract IDs (bytes32) to clipboard"
            >
              <Hash className="w-3.5 h-3.5 text-cyan-400" />
              <span>Copy Public Contract IDs</span>
            </button>

            {/* Copy Public Block Explorer URLs */}
            <button
              id="btn-copy-explorer-urls"
              onClick={copySelectedRegistryUrls}
              className="px-2.5 py-1.5 rounded bg-[#0A0A0C] hover:bg-[#1E1E24] border border-[#1F1F23] text-xs text-[#E0E0E0] flex items-center gap-1.5 font-medium transition-all cursor-pointer"
              title="Copy verifiable public block explorer links to clipboard"
            >
              <Globe className="w-3.5 h-3.5 text-green-400" />
              <span>Copy Explorer URLs</span>
            </button>

            {/* Quick 1-Click CSV Export for Filtered & Selected */}
            <button
              id="btn-quick-export-csv"
              onClick={() => exportToCSV("filtered_and_selected")}
              className="px-2.5 py-1.5 rounded bg-[#161820] hover:bg-[#1E222D] border border-[#2D2D32] hover:border-[#F27D26] text-xs text-[#E0E0E0] hover:text-white flex items-center gap-1.5 font-medium transition-all cursor-pointer shadow-sm active:scale-95"
              title={
                selectedTokenIds.size > 0
                  ? `Export ${filteredTokens.filter((t) => selectedTokenIds.has(t.id)).length || selectedTokenIds.size} filtered & selected tokens to CSV for external analysis`
                  : `Export ${filteredTokens.length} filtered tokens to CSV for external analysis`
              }
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>
                Export CSV{" "}
                {selectedTokenIds.size > 0
                  ? `(${filteredTokens.filter((t) => selectedTokenIds.has(t.id)).length || selectedTokenIds.size} Sel)`
                  : `(${filteredTokens.length.toLocaleString()})`}
              </span>
            </button>

            {/* Private Keys Vault & Deployer Keystore */}
            <button
              id="btn-all-tokens-private-keys-vault"
              type="button"
              onClick={() => setIsKeysVaultOpen(true)}
              className="px-3 py-1.5 rounded bg-gradient-to-r from-amber-500/20 via-amber-600/25 to-amber-500/20 hover:from-amber-500/30 hover:to-amber-500/30 border border-amber-500/50 hover:border-amber-400 text-amber-300 hover:text-amber-200 text-xs font-mono flex items-center gap-1.5 font-bold transition-all cursor-pointer shadow-md shadow-amber-950/30 active:scale-95"
              title="Open Private Keys Vault for all tokens (Generate, view, test signatures, and export Keystores for all tokens)"
            >
              <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Private Keys ({tokens.length})</span>
            </button>

            {/* Export Dataset Dropdown Menu */}
            <div className="relative" ref={exportMenuRef}>
              <button
                id="btn-export-menu-toggle"
                onClick={() => setIsExportMenuOpen((prev) => !prev)}
                className={`px-3 py-1.5 rounded text-xs flex items-center gap-2 font-medium transition-all cursor-pointer shadow-sm active:scale-95 ${
                  isExportMenuOpen
                    ? "bg-[#F27D26] text-black font-semibold ring-2 ring-[#F27D26]/40"
                    : "bg-[#F27D26]/15 hover:bg-[#F27D26]/25 border border-[#F27D26]/40 text-[#F27D26]"
                }`}
                title="Export synthetic token dataset to local file"
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  Export Dataset{" "}
                  {selectedTokenIds.size > 0
                    ? `(${selectedTokenIds.size.toLocaleString()})`
                    : `(${filteredTokens.length.toLocaleString()})`}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isExportMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown Menu Popover */}
              {isExportMenuOpen && (
                <div
                  id="export-format-menu"
                  className="absolute right-0 mt-1.5 w-72 rounded-xl bg-[#16161A] border border-[#2D2D32] shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md"
                >
                  <div className="px-2.5 py-1.5 border-b border-[#1F1F23] mb-1">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#8E9299]">
                      Export Dataset Format
                    </div>
                    <div className="text-xs text-white font-medium flex items-center justify-between mt-0.5">
                      <span>Target Scope:</span>
                      <span className="font-mono text-[#F27D26]">
                        {selectedTokenIds.size > 0
                          ? `${selectedTokenIds.size.toLocaleString()} selected tokens`
                          : `${filteredTokens.length.toLocaleString()} tokens`}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {/* JSON Format Option */}
                    <button
                      id="export-menu-json-option"
                      onClick={() => {
                        exportToJSON();
                        setIsExportMenuOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[#1E1E24] transition-colors flex items-start gap-2.5 group cursor-pointer"
                    >
                      <div className="p-1.5 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-400 group-hover:bg-purple-500/20 mt-0.5">
                        <FileCode className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white group-hover:text-purple-300">
                            JSON Dataset
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            .json
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8E9299] leading-tight mt-0.5">
                          Full schema objects with contracts, vanity flags & metadata. Ideal for AI prompts & code.
                        </p>
                      </div>
                    </button>

                    {/* CSV Format Option */}
                    <div className="rounded-lg hover:bg-[#1E1E24] p-1 transition-colors">
                      <button
                        id="export-menu-csv-option"
                        onClick={() => {
                          exportToCSV(selectedTokenIds.size > 0 ? "filtered_and_selected" : "filtered");
                          setIsExportMenuOpen(false);
                        }}
                        className="w-full text-left px-1.5 py-1 rounded-md flex items-start gap-2.5 group cursor-pointer"
                      >
                        <div className="p-1.5 rounded-md bg-[#F27D26]/10 border border-[#F27D26]/30 text-[#F27D26] group-hover:bg-[#F27D26]/20 mt-0.5">
                          <FileSpreadsheet className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-white group-hover:text-[#F27D26]">
                              CSV Spreadsheet
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#F27D26]/15 text-[#F27D26] border border-[#F27D26]/30">
                              .csv
                            </span>
                          </div>
                          <p className="text-[11px] text-[#8E9299] leading-tight mt-0.5">
                            36 analysis columns with UTF-8 BOM, numerical metrics, and addresses for Excel, Sheets, or Pandas.
                          </p>
                        </div>
                      </button>

                      {/* Quick scope buttons when selections exist */}
                      {selectedTokenIds.size > 0 && (
                        <div className="flex items-center gap-2 px-2 pb-1 pt-1 text-[10px] font-mono border-t border-[#232328] mt-1">
                          <span className="text-[#8E9299]">Export:</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              exportToCSV("filtered_and_selected");
                              setIsExportMenuOpen(false);
                            }}
                            className="text-[#F27D26] hover:underline cursor-pointer font-semibold"
                            title="Export selected tokens matching current filters"
                          >
                            Selected ({filteredTokens.filter((t) => selectedTokenIds.has(t.id)).length || selectedTokenIds.size})
                          </button>
                          <span className="text-[#3A3D4A]">•</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              exportToCSV("filtered");
                              setIsExportMenuOpen(false);
                            }}
                            className="text-cyan-400 hover:underline cursor-pointer"
                            title="Export all tokens matching current filters"
                          >
                            All Filtered ({filteredTokens.length})
                          </button>
                        </div>
                      )}
                    </div>

                    {/* SQL Dump Option */}
                    <button
                      id="export-menu-sql-option"
                      onClick={() => {
                        exportToSQL();
                        setIsExportMenuOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[#1E1E24] transition-colors flex items-start gap-2.5 group cursor-pointer"
                    >
                      <div className="p-1.5 rounded-md bg-green-500/10 border border-green-500/30 text-green-400 group-hover:bg-green-500/20 mt-0.5">
                        <Download className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white group-hover:text-green-300">
                            SQL Insert Dump
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-green-500/15 text-green-300 border border-green-500/30">
                            .sql
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8E9299] leading-tight mt-0.5">
                          PostgreSQL & SQLite executable CREATE TABLE & INSERT statements.
                        </p>
                      </div>
                    </button>

                    {/* NFT Marketplace Metadata (JSON) Option */}
                    <button
                      id="export-menu-nft-metadata-option"
                      onClick={() => {
                        exportToNFTMetadata();
                        setIsExportMenuOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[#1E1E24] transition-colors flex items-start gap-2.5 group cursor-pointer"
                    >
                      <div className="p-1.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 group-hover:bg-cyan-500/20 mt-0.5">
                        <FileJson className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white group-hover:text-cyan-300">
                            NFT Metadata Batch
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                            .json
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8E9299] leading-tight mt-0.5">
                          OpenSea / ERC-721 / ERC-1155 compliant JSON schemas with simulated gas stats and trait filters.
                        </p>
                      </div>
                    </button>

                    {/* Foundry .env Config Option */}
                    <button
                      id="export-menu-foundry-dotenv-option"
                      onClick={() => {
                        exportToFoundryDotEnv();
                        setIsExportMenuOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[#1E1E24] transition-colors flex items-start gap-2.5 group cursor-pointer border-t border-[#1F1F23]/60 pt-2"
                    >
                      <div className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 group-hover:bg-emerald-500/20 mt-0.5">
                        <Terminal className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white group-hover:text-emerald-300">
                            Foundry .env Config
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            .env
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8E9299] leading-tight mt-0.5">
                          Deployer private keys, RPC URLs, Etherscan API keys &amp; forge deploy command presets.
                        </p>
                      </div>
                    </button>

                    {/* Stream Contract Artifacts & Proof (5 Artifacts) */}
                    <button
                      id="export-menu-stream-artifacts-option"
                      onClick={() => {
                        const targetToken =
                          (selectedTokenIds.size > 0
                            ? filteredTokens.find((t) => selectedTokenIds.has(t.id))
                            : filteredTokens[0]) || tokens[0];
                        if (targetToken) {
                          setStreamArtifactToken(targetToken);
                        }
                        setIsExportMenuOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[#1E1E24] transition-colors flex items-start gap-2.5 group cursor-pointer border-t border-[#1F1F23]/60 pt-2"
                    >
                      <div className="p-1.5 rounded-md bg-green-500/10 border border-green-500/30 text-green-400 group-hover:bg-green-500/20 mt-0.5">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white group-hover:text-green-300">
                            Contract Artifacts &amp; Proof
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-green-500/15 text-green-300 border border-green-500/30">
                            5 Artifacts
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8E9299] leading-tight mt-0.5">
                          Solidity source, bytecode, ABI, EIP-1559 tx &amp; on-chain CREATE2 proof.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Recharts Analytics Drawer (when toggled) */}
      {showVisualCharts && (
        <div className="animate-in fade-in duration-200">
          <TokenAnalyticsCharts tokens={filteredTokens} onSelectToken={onSelectToken} />
        </div>
      )}

      {/* High-Volume Batch Staggered Cascade Notification Banner */}
      <AnimatePresence>
        {showBatchBanner && batchWaveCount > 0 && (
          <motion.div
            id="batch-generation-stagger-banner"
            initial={{ opacity: 0, y: -12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.3 }}
            className="mb-4 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-950/70 via-[#16161A] to-[#121316] border border-emerald-500/40 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-emerald-400 via-teal-400 to-emerald-600" />

            <div className="flex items-center gap-3 pl-1">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Sparkles className="w-4 h-4 animate-spin text-emerald-400" style={{ animationDuration: "4s" }} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white">
                    High-Volume Batch Influx
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-400" />
                    +{batchWaveCount.toLocaleString()} New Tokens
                  </span>
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[9px] font-mono font-medium">
                    Staggered Entrance Active
                  </span>
                </div>
                <p className="text-[11px] text-[#8E9299] mt-0.5">
                  Streaming newly minted records into the active ledger with progressive micro-staggering.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                id="btn-select-new-batch-tokens"
                type="button"
                onClick={() => {
                  setSelectedTokenIds((prev) => {
                    const next = new Set(prev);
                    newlyAddedTokenIds.forEach((id) => next.add(id));
                    return next;
                  });
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 hover:text-white font-mono text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                title="Select all tokens minted in this batch"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Select New Batch ({Math.min(batchWaveCount, 1000).toLocaleString()})</span>
              </button>

              <button
                id="btn-replay-stagger-cascade"
                type="button"
                onClick={() => setBatchWaveId((v) => v + 1)}
                className="px-2.5 py-1.5 rounded-lg bg-[#16161A] hover:bg-[#1E1E24] border border-[#1F1F23] hover:border-emerald-500/40 text-[#8E9299] hover:text-white text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                title="Replay staggered entrance cascade"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>Replay Cascade</span>
              </button>

              <button
                type="button"
                onClick={() => setShowBatchBanner(false)}
                className="p-1.5 rounded text-[#8E9299] hover:text-white hover:bg-[#1F1F23] transition-colors cursor-pointer"
                title="Dismiss banner"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Table */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0A0A0C] border-b border-[#1F1F23] text-[#8E9299] uppercase tracking-wider font-mono text-[10px]">
              <tr>
                {/* Select All Checkbox Column */}
                <th className="py-3 px-3 w-12 text-center">
                  <button
                    id="btn-header-select-all-tokens"
                    type="button"
                    onClick={handleToggleSelectAllTokensAndContractIds}
                    className="p-1 rounded hover:bg-[#1F1F23] text-[#8E9299] hover:text-white transition-colors cursor-pointer"
                    title={
                      isAllFilteredSelected
                        ? `Deselect all ${filteredTokens.length} tokens & contract IDs`
                        : `Select all ${filteredTokens.length} tokens & contract IDs`
                    }
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
                <th className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    <span>Token & Narrative</span>
                    {shuffleSeed !== null && (
                      <span
                        title={`Randomized display order via Seed ${formatSeedDisplay(shuffleSeed)}`}
                        className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-mono normal-case tracking-normal inline-flex items-center gap-1 font-normal"
                      >
                        <Shuffle className="w-2.5 h-2.5" />
                        <span>Shuffled</span>
                      </span>
                    )}
                  </div>
                </th>
                <th className="py-3 px-4">Chain / NetID</th>
                <th className="py-3 px-4">Enterprise Contract Address</th>
                <th className="py-3 px-4">Public Contract ID</th>
                <th className="py-3 px-4">Public Registry & RPC</th>
                <th className="py-3 px-4">uint256 Token ID</th>
                <th className="py-3 px-4">Standard</th>
                <th className="py-3 px-4">Status & Audit</th>
                <th className="py-3 px-4 text-right">Price / MCap</th>
                <th className="py-3 px-3 text-center min-w-[130px]">
                  <div className="flex items-center justify-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-[#F27D26]" />
                    <span>MCap Trend (7D)</span>
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Inspect</th>
              </tr>
            </thead>
            <motion.tbody
              key={`${batchWaveId}_${currentPage}_${shuffleSeed || 0}`}
              variants={tableBodyVariants}
              initial={staggerAnimationEnabled ? "hidden" : false}
              animate="visible"
              className="divide-y divide-[#1F1F23] text-[#E0E0E0]"
            >
              {paginatedTokens.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-[#8E9299]">
                    {searchQuery ? (
                      <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                        <div className="w-10 h-10 rounded-full bg-[#0A0A0C] border border-[#1F1F23] flex items-center justify-center text-[#8E9299]">
                          <Search className="w-5 h-5 text-[#F27D26]" />
                        </div>
                        <p className="text-sm font-semibold text-white">
                          No tokens found matching "{searchQuery}"
                        </p>
                        <p className="text-xs text-[#8E9299] leading-relaxed">
                          Try searching by token name (e.g. BeamLink), symbol (e.g. BEAMN), or blockchain (arbitrum, base, solana, ethereum, quantum).
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery("");
                              setCurrentPage(1);
                              searchInputRef.current?.focus();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#F27D26]/10 hover:bg-[#F27D26]/20 border border-[#F27D26]/30 text-xs font-semibold text-[#F27D26] transition-colors cursor-pointer"
                          >
                            Clear Persistent Search
                          </button>
                          {selectedChain !== "all" && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedChain("all");
                                setCurrentPage(1);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#16161A] hover:bg-[#1E1E24] border border-[#1F1F23] text-xs text-[#E0E0E0] transition-colors cursor-pointer"
                            >
                              Reset Chain Filter
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span>No tokens found matching the filter criteria. Generate a new batch above!</span>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedTokens.map((token, index) => {
                  const isSelected = selectedTokenIds.has(token.id);
                  const isNewInBatch = newlyAddedTokenIds.has(token.id);
                  const chainMeta = CHAIN_METADATA[token.chain] || CHAIN_METADATA.ethereum;
                  const enterpriseReport = verifyEnterpriseContractRequirements(token);

                  // Calculate staggered delay for progressive entrance
                  const batchIndex = visibleBatchIndexMap.get(token.id) ?? index;
                  const staggerDelay = staggerAnimationEnabled
                    ? isNewInBatch
                      ? Math.min(batchIndex * 0.032, 0.55)
                      : Math.min(index * 0.012, 0.22)
                    : 0;

                  return (
                    <motion.tr
                      key={token.id}
                      variants={tokenRowVariants}
                      whileHover={{ x: 2, transition: { duration: 0.12 } }}
                      className={`transition-colors group cursor-pointer ${
                        isSelected
                          ? "bg-[#F27D26]/10 hover:bg-[#F27D26]/15"
                          : isNewInBatch
                          ? "bg-emerald-950/20 hover:bg-emerald-900/30 border-l-2 border-l-emerald-400"
                          : "hover:bg-[#1E1E24]/60"
                      }`}
                      onClick={() => onSelectToken(token)}
                    >
                      {/* Selection Checkbox */}
                      <td
                        className="py-3 px-3 text-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelectToken(token.id);
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

                      {/* 1. Name & Narrative */}
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
                            <div className="font-semibold text-white flex items-center gap-1.5 flex-wrap">
                              <span>{token.name}</span>
                              <span className="text-[10px] text-[#8E9299] font-mono">({token.symbol})</span>
                              {isNewInBatch && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-mono font-semibold animate-pulse shadow-sm"
                                  title="Newly generated token in latest high-volume batch"
                                >
                                  <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                                  NEW
                                </span>
                              )}
                              {enterpriseReport.isVerified && (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[9px] font-mono font-medium"
                                  title="Enterprise-grade contract verification passed"
                                >
                                  <ShieldCheck className="w-2.5 h-2.5 text-cyan-400" />
                                  Enterprise
                                </span>
                              )}
                              {token.isVanity && (
                                <span className="px-1.5 py-0.2 rounded bg-[#F27D26]/10 text-[#F27D26] border border-[#F27D26]/30 text-[9px] font-mono">
                                  Vanity
                                </span>
                              )}
                              {Boolean(token.isDeployed || token.launchStatus === "Deployed") ? (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 text-[9px] font-mono font-medium"
                                  title="Token marked as deployed on-chain"
                                >
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                                  Deployed
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-zinc-800/80 border border-zinc-700/50 text-zinc-400 text-[9px] font-mono"
                                  title="Token has not yet been deployed (draft)"
                                >
                                  <Clock className="w-2.5 h-2.5 text-zinc-400" />
                                  Undeployed
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                              <span className="text-[10px] text-[#8E9299] font-mono">
                                {token.narrative.replace("_", " ")}
                              </span>
                              {token.tags && token.tags.length > 0 && (
                                <div className="flex items-center gap-1 flex-wrap">
                                  {token.tags.slice(0, 3).map((tag, tIdx) => {
                                    const meta = getCategoricalTagMeta(tag);
                                    return (
                                      <button
                                        key={tIdx}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedTag(tag.toLowerCase());
                                          setCurrentPage(1);
                                        }}
                                        className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-mono border transition-all cursor-pointer hover:scale-105 ${
                                          meta
                                            ? `${meta.badgeBg} ${meta.badgeBorder} ${meta.badgeText} ${meta.hoverBorder}`
                                            : "bg-[#1E1E24] text-zinc-300 border-[#2A2A30] hover:border-zinc-500"
                                        }`}
                                        title={`Categorical Tag: ${meta ? meta.label : tag} • Click to filter dataset`}
                                      >
                                        <span className={`w-1 h-1 rounded-full ${meta ? meta.dotColor : "bg-zinc-400"}`} />
                                        <span>{meta ? meta.label : tag}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Chain & Net ID */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border ${chainMeta.badgeColor}`}
                            title={`${chainMeta.name} (${chainMeta.symbol}) - Network #${token.networkId}`}
                          >
                            <ChainIcon chain={token.chain} size="xs" />
                            <span className="font-medium">{chainMeta.name.split(" ")[0]}</span>
                          </span>
                          <p className="text-[10px] text-[#8E9299] font-mono pl-0.5">Net #{token.networkId}</p>
                        </div>
                      </td>

                      {/* 3. Enterprise Contract Address */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-mono">
                            <span
                              className={`text-xs font-medium ${
                                token.isVanity ? "text-[#F27D26]" : "text-[#00F0FF]"
                              }`}
                            >
                              {token.contractAddress.slice(0, 8)}...{token.contractAddress.slice(-6)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(token.contractAddress, `addr_${token.id}`);
                              }}
                              className="p-1 rounded hover:bg-[#1F1F23] text-[#8E9299] hover:text-white transition-colors cursor-pointer"
                              title="Copy enterprise contract address"
                            >
                              {copiedId === `addr_${token.id}` ? (
                                <Check className="w-3 h-3 text-green-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          
                          {/* Visual Enterprise Verification Badge */}
                          {enterpriseReport.isVerified ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <div className="group/badge relative inline-flex items-center">
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono font-semibold uppercase tracking-wider rounded-md bg-cyan-950/70 border border-cyan-400/50 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.18)] hover:bg-cyan-900/80 transition-all cursor-help"
                                  title="Contract meets enterprise-grade formatting and architecture requirements"
                                >
                                  <ShieldCheck className="w-3 h-3 text-cyan-400 shrink-0" />
                                  <span>Enterprise</span>
                                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                                </span>

                                {/* Enterprise Verification Tooltip */}
                                <div className="absolute left-0 bottom-full mb-2 hidden group-hover/badge:block w-72 p-3 bg-[#0A0F14] border border-cyan-500/40 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.85)] z-50 text-[11px] font-mono pointer-events-none">
                                  <div className="flex items-center justify-between border-b border-[#1A2530] pb-2 mb-2">
                                    <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                                      <span>Enterprise Verified</span>
                                    </div>
                                    <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[9px] font-bold">
                                      PASSED
                                    </span>
                                  </div>

                                  <div className="space-y-1.5 text-[#8E9299]">
                                    <div className="flex items-start justify-between gap-2">
                                      <span className="text-[#64748B]">Architecture:</span>
                                      <span className="text-[#E2E8F0] font-sans font-medium text-right text-[10px]">
                                        {token.contractArchetype || "CREATE2 Proxy Architecture"}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-[#64748B]">Prefix Format:</span>
                                      <span className="text-cyan-400 font-bold bg-[#04161F] px-1 rounded border border-cyan-500/20">
                                        {token.contractAddress.slice(0, 6)}...
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-[#64748B]">Checksum / Length:</span>
                                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                        <Check className="w-2.5 h-2.5" /> Validated
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-[#64748B]">Institutional Tier:</span>
                                      <span className="text-[#F27D26] font-medium">{token.enterpriseTier || "Tier-1 Institutional"}</span>
                                    </div>
                                  </div>

                                  <div className="mt-2 pt-1.5 border-t border-[#1A2530] text-[9px] text-[#00F0FF]/80 italic">
                                    Meets enterprise-grade deterministic contract requirements
                                  </div>
                                </div>
                              </div>

                              <span
                                className="text-[10px] text-[#8E9299] font-mono truncate max-w-[120px]"
                                title={token.contractArchetype || "CREATE2 Enterprise Proxy"}
                              >
                                {token.contractArchetype
                                  ? token.contractArchetype.replace("Enterprise ", "").split("(")[0].trim()
                                  : "CREATE2 Proxy"}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center px-1.5 py-0.2 text-[9px] font-mono uppercase tracking-wider rounded bg-[#16161A] border border-[#2D2D35] text-[#8E9299]">
                                Standard
                              </span>
                              <span className="text-[10px] text-[#666] font-mono">Standard Contract</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 4. Public Contract ID (Separate Column for all tokens) */}
                      <td className="py-3 px-4 font-mono">
                        {(() => {
                          const pubContractId = computePublicContractId(token);
                          return (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="text-xs text-[#00F0FF] font-medium"
                                  title={`Public Contract ID (bytes32): ${pubContractId}`}
                                >
                                  {pubContractId.slice(0, 8)}...{pubContractId.slice(-6)}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(pubContractId, `pubid_${token.id}`);
                                  }}
                                  className="p-1 rounded hover:bg-[#1F1F23] text-[#8E9299] hover:text-white transition-colors cursor-pointer"
                                  title="Copy bytes32 public contract ID"
                                >
                                  {copiedId === `pubid_${token.id}` ? (
                                    <Check className="w-3 h-3 text-green-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                              <div
                                className="text-[9px] text-[#8E9299] truncate max-w-[125px]"
                                title={`uint256 Public ID: ${token.tokenId}`}
                              >
                                uint256: {token.tokenId.slice(0, 10)}...
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* 5. Public Registry, Live RPC Reachability & Active Liquidity Pool Visual Indicator */}
                      <td className="py-3 px-4 font-mono">
                        {(() => {
                          const reg = mapTokenToPublicRegistry(token);
                          const rpcStatus = rpcStatusMap[token.chain] || { reachable: true, latencyMs: 24 };
                          const isPinging = pingingChains.has(token.chain);

                          return (
                            <div className="space-y-1.5">
                              {/* Verifiable Block Explorer Address Link */}
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={reg.explorerUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs text-white hover:text-[#F27D26] hover:underline flex items-center gap-1 font-medium transition-colors"
                                  title={`Verify on ${reg.explorerName} (${reg.explorerUrl})`}
                                >
                                  <span>{reg.explorerName}</span>
                                  <ExternalLink className="w-3 h-3 text-[#F27D26] shrink-0" />
                                </a>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(reg.explorerUrl, `exp_${token.id}`);
                                  }}
                                  className="p-1 rounded hover:bg-[#1F1F23] text-[#8E9299] hover:text-white transition-colors cursor-pointer"
                                  title="Copy public block explorer link"
                                >
                                  {copiedId === `exp_${token.id}` ? (
                                    <Check className="w-3 h-3 text-green-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>

                              {/* Real-Time Connectivity Status Indicator (Ping Network RPC) */}
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${
                                    rpcStatus.reachable
                                      ? "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)] animate-pulse"
                                      : "bg-amber-400"
                                  }`}
                                  title={`RPC Endpoint: ${reg.rpcEndpoint} - ${
                                    rpcStatus.reachable ? "Reachable & Synced" : "Testing"
                                  } (${rpcStatus.latencyMs}ms)`}
                                />
                                <span className="text-[#CCC]">{rpcStatus.latencyMs}ms</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePingTokenRpc(token.chain);
                                  }}
                                  disabled={isPinging}
                                  className="text-[9px] text-[#8E9299] hover:text-[#F27D26] hover:underline flex items-center gap-0.5 cursor-pointer disabled:opacity-50"
                                  title={`Ping ${reg.rpcEndpoint} to check reachability`}
                                >
                                  <RefreshCw
                                    className={`w-2.5 h-2.5 ${isPinging ? "animate-spin text-[#F27D26]" : ""}`}
                                  />
                                  <span>{isPinging ? "pinging" : "ping"}</span>
                                </button>
                              </div>

                              {/* Visual Status Icon for Active Liquidity Pools */}
                              {reg.hasActiveLiquidityPool ? (
                                <div
                                  className="flex items-center gap-1.5 text-[10px] text-emerald-300"
                                  title={`Active Liquidity Pool: ${reg.liquidityPair} on ${reg.liquidityDex} (Pool ID: ${reg.liquidityPoolId || "N/A"})`}
                                >
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)] animate-pulse shrink-0" />
                                  <span className="font-semibold truncate max-w-[120px]">
                                    {reg.liquidityPair}
                                  </span>
                                </div>
                              ) : (
                                <div
                                  className="flex items-center gap-1.5 text-[10px] text-rose-400"
                                  title="No active liquidity pools found in simulated network"
                                >
                                  <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)] shrink-0" />
                                  <span className="text-[10px] text-rose-400 flex items-center gap-0.5">
                                    <AlertCircle className="w-2.5 h-2.5" />
                                    <span>No Active Pool</span>
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* 6. uint256 Token ID & Deployer Private Key */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-mono text-[#8E9299] text-[11px]">
                            <span className="text-cyan-400 text-[10px] font-semibold">ID:</span>
                            <span>
                              {token.tokenId.length > 14
                                ? `${token.tokenId.slice(0, 8)}...${token.tokenId.slice(-4)}`
                                : token.tokenId}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(token.tokenId, `id_${token.id}`);
                              }}
                              className="p-1 rounded hover:bg-[#1F1F23] text-[#8E9299] hover:text-white transition-colors cursor-pointer"
                              title="Copy Token ID"
                            >
                              {copiedId === `id_${token.id}` ? (
                                <Check className="w-3 h-3 text-green-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>

                          {/* Quick Deployer Key Indicator */}
                          <div className="flex items-center gap-1.5 font-mono text-amber-400/90 text-[10px]">
                            <Key className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>
                              {token.deployerPrivateKey
                                ? `${token.deployerPrivateKey.slice(0, 6)}...${token.deployerPrivateKey.slice(-4)}`
                                : "0x••••...••••"}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const pKey = token.deployerPrivateKey || generateDeployerPrivateKey(token.chain);
                                handleCopy(pKey, `pkey_${token.id}`);
                              }}
                              className="p-1 rounded hover:bg-[#1F1F23] text-amber-400/80 hover:text-amber-300 transition-colors cursor-pointer"
                              title="Copy 256-bit Deployer Private Key for Foundry / cast"
                            >
                              {copiedId === `pkey_${token.id}` ? (
                                <Check className="w-3 h-3 text-green-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* 5. Token Standard */}
                      <td className="py-3 px-4 font-mono text-[11px] text-cyan-300">
                        {token.tokenStandard}
                      </td>

                      {/* 6. Status & Audit */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            {Boolean(token.isDeployed || token.launchStatus === "Deployed") ? (
                              <span
                                id={`token-deployed-indicator-${token.id}`}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/35 shadow-sm"
                                title="On-Chain Deployment Confirmed"
                              >
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                                Deployed
                              </span>
                            ) : (
                              <span
                                id={`token-undeployed-indicator-${token.id}`}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono text-zinc-400 bg-zinc-800/80 border border-zinc-700/60"
                                title="Draft / Not Deployed"
                              >
                                <Clock className="w-2.5 h-2.5 text-zinc-400" />
                                Undeployed
                              </span>
                            )}
                          </div>
                          <span
                            className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono ${
                              token.launchStatus === "Audited" || token.launchStatus === "Rug-Proof Vault"
                                ? "bg-green-500/10 text-green-500 border border-green-500/20"
                                : token.launchStatus === "Paused"
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            }`}
                          >
                            {token.launchStatus}
                          </span>
                          <div className="flex items-center gap-1 text-[10px] text-[#8E9299]">
                            <ShieldCheck className="w-2.5 h-2.5 text-green-500" />
                            <span>{token.auditFirm}</span>
                          </div>
                        </div>
                      </td>

                      {/* 7. Price & Market Cap */}
                      <td className="py-3 px-4 text-right font-mono">
                        <div className="text-white font-medium">${token.priceUsd.toFixed(4)}</div>
                        <div className="text-[10px] text-[#8E9299]">
                          MCap: ${(token.marketCap / 1000000).toFixed(2)}M
                        </div>
                      </td>

                      {/* 8. Market Cap Sparkline Trend (7D) */}
                      <td className="py-2.5 px-3 text-center align-middle">
                        <TokenMarketCapSparkline
                          token={token}
                          width={116}
                          height={28}
                          showBadge={true}
                          showTooltip={true}
                        />
                      </td>

                      {/* 9. Inspect, Proof & Metadata Buttons */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setStreamArtifactToken(token);
                            }}
                            className="p-1.5 rounded bg-[#0A0A0C] border border-[#1F1F23] hover:border-green-400 text-[#8E9299] hover:text-green-300 transition-colors cursor-pointer"
                            title="Stream Contract Artifacts (Solidity, Bytecode, ABI, Tx, Proof)"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedNFTToken(token);
                            }}
                            className="p-1.5 rounded bg-[#0A0A0C] border border-[#1F1F23] hover:border-cyan-400 text-[#8E9299] hover:text-cyan-300 transition-colors cursor-pointer"
                            title="Inspect NFT Marketplace Metadata (JSON)"
                          >
                            <FileJson className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSolidityPromptToken(token);
                            }}
                            className="p-1.5 rounded bg-[#0A0A0C] border border-[#1F1F23] hover:border-[#F27D26] text-[#8E9299] hover:text-[#F27D26] transition-colors cursor-pointer"
                            title="Generate Production-Ready Solidity 0.8.24 Smart Contract & Verification Prompt"
                          >
                            <Code2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`btn-duplicate-token-${token.id}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateSingleToken(token);
                            }}
                            className="p-1.5 rounded bg-[#0A0A0C] border border-[#1F1F23] hover:border-amber-400 text-[#8E9299] hover:text-amber-300 transition-colors cursor-pointer"
                            title="Duplicate Token (Deep copy with new random contract address & shared tokenomics)"
                          >
                            <CopyPlus className="w-3.5 h-3.5" />
                          </button>
                          {onOpenGlobalSwapSell && (
                            <button
                              id={`btn-swap-sell-token-${token.id}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenGlobalSwapSell(token, "swap");
                              }}
                              className="p-1.5 rounded bg-[#0A0A0C] border border-[#1F1F23] hover:border-cyan-400 text-[#8E9299] hover:text-cyan-300 transition-colors cursor-pointer"
                              title="Universal Token Swap (Connected to Treasury: 0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0)"
                            >
                              <ArrowDownUp className="w-3.5 h-3.5 text-cyan-400" />
                            </button>
                          )}
                          <button
                            id={`btn-compare-token-row-${token.id}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCompare(token.id);
                            }}
                            className="p-1.5 rounded bg-[#0A0A0C] border border-[#1F1F23] hover:border-cyan-400 text-[#8E9299] hover:text-cyan-300 transition-colors cursor-pointer"
                            title="Compare this token side-by-side with another token"
                          >
                            <Scale className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectToken(token);
                            }}
                            className="p-1.5 rounded bg-[#0A0A0C] border border-[#1F1F23] hover:border-[#F27D26] text-[#8E9299] hover:text-[#F27D26] transition-colors cursor-pointer"
                            title="Inspect Token & Smart Contract"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </motion.tbody>
            </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-[#0A0A0C] border-t border-[#1F1F23] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#8E9299]">
            <span>Items per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-[#16161A] border border-[#1F1F23] rounded px-2 py-1 text-[#E0E0E0] font-mono focus:outline-none"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#8E9299] font-mono">
              Page <span className="text-white font-semibold">{currentPage}</span> of{" "}
              <span className="text-white font-semibold">{totalPages}</span>
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded bg-[#16161A] border border-[#1F1F23] text-[#8E9299] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded bg-[#16161A] border border-[#1F1F23] text-[#8E9299] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* NFT Marketplace Metadata Modal */}
      {selectedNFTToken && (
        <NFTMetadataModal
          token={selectedNFTToken}
          onClose={() => setSelectedNFTToken(null)}
        />
      )}

      {/* Stream Contract Artifact & On-Chain Proof Modal */}
      {streamArtifactToken && (
        <StreamContractArtifactModal
          params={{
            contractAddress: streamArtifactToken.contractAddress,
            tokenId: streamArtifactToken.tokenId,
            networkId: streamArtifactToken.networkId,
            chain: streamArtifactToken.chain,
            tokenStandard: streamArtifactToken.tokenStandard,
            name: streamArtifactToken.name,
            symbol: streamArtifactToken.symbol,
            decimals: streamArtifactToken.decimals,
            initialSupply: streamArtifactToken.initialSupply,
            launchStatus: streamArtifactToken.launchStatus,
            deployerAddress: streamArtifactToken.deployerAddress,
          }}
          onClose={() => setStreamArtifactToken(null)}
        />
      )}

      {/* Production-Ready Solidity Smart Contract Prompt & Code Generator Modal */}
      {solidityPromptToken && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSolidityPromptToken(null)}
        >
          <div
            className="bg-[#121216] border border-[#2D2D35] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
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
                    {solidityPromptToken.name} ({solidityPromptToken.symbol}) • Public Contract ID: {computePublicContractId(solidityPromptToken).slice(0, 14)}...
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSolidityPromptToken(null)}
                className="p-1.5 rounded-lg bg-[#16161A] hover:bg-[#1E1E24] text-[#8E9299] hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 font-mono text-xs text-[#CCC]">
              {(() => {
                const solData = generateProductionReadySolidityCode(solidityPromptToken);
                return (
                  <>
                    <div className="p-3.5 rounded-xl bg-[#0A0A0C] border border-[#1F1F23] space-y-1.5">
                      <div className="text-cyan-300 font-bold flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        <span>Smart Contract Code Generation Prompt (EVM Chains)</span>
                      </div>
                      <p className="text-[11px] text-[#8E9299] leading-relaxed">
                        <strong className="text-white">Role &amp; Objective:</strong> Act as an expert Web3 smart contract engineer. Write a production-ready, fully commented Solidity smart contract ready for deployment and direct verification on Etherscan/BscScan/Polygonscan.
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-white font-semibold">{solData.contractName}.sol</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(solData.sourceCode);
                          setCopySuccessMsg("Copied Solidity 0.8.24 source code!");
                          setTimeout(() => setCopySuccessMsg(null), 2500);
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

            <div className="p-4 bg-[#0A0A0C] border-t border-[#1F1F23] flex items-center justify-between font-mono text-xs">
              <span className="text-[#8E9299]">Ready for Etherscan / Basescan / Remix IDE</span>
              <button
                type="button"
                onClick={() => {
                  const solData = generateProductionReadySolidityCode(solidityPromptToken);
                  const blob = new Blob([solData.sourceCode], { type: "text/plain;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `${solData.contractName}_0.8.24.sol`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                  setCopySuccessMsg(`Downloaded ${solData.contractName}_0.8.24.sol!`);
                  setTimeout(() => setCopySuccessMsg(null), 3000);
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

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteConfirmOpen && (
        <div
          id="modal-bulk-delete-confirm"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsBulkDeleteConfirmOpen(false)}
        >
          <div
            className="bg-[#121216] border border-rose-500/40 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 bg-rose-950/30 border-b border-rose-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono">
                    Confirm Bulk Deletion
                  </h3>
                  <p className="text-xs text-rose-300/80">
                    Irreversible removal of {selectedTokenIds.size.toLocaleString()} selected tokens
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="btn-close-bulk-delete-modal"
                onClick={() => setIsBulkDeleteConfirmOpen(false)}
                className="p-1.5 rounded-lg bg-[#16161A] hover:bg-[#1E1E24] text-[#8E9299] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 font-mono text-xs">
              <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Permanent Removal Warning</span>
                </div>
                <p className="text-[11px] text-rose-300/90 leading-relaxed">
                  Are you sure you want to delete <strong className="text-white underline">{selectedTokenIds.size.toLocaleString()}</strong> selected token records?
                  This will remove them immediately from your active stream, search index, and cloud database.
                </p>
              </div>

              {/* Sample preview of tokens to be deleted */}
              <div className="space-y-1.5">
                <div className="text-[11px] text-[#8E9299]">Selected tokens to delete:</div>
                <div className="max-h-36 overflow-y-auto rounded-lg bg-[#0A0A0C] border border-[#1F1F23] p-2 space-y-1 divide-y divide-[#1F1F23]/50">
                  {tokens
                    .filter((t) => selectedTokenIds.has(t.id))
                    .slice(0, 10)
                    .map((t) => (
                      <div key={t.id} className="pt-1 first:pt-0 flex items-center justify-between text-[11px]">
                        <span className="text-white font-semibold">
                          {t.name} <span className="text-[#8E9299]">({t.symbol})</span>
                        </span>
                        <span className="text-[#8E9299] text-[10px]">{t.chain} • {t.tokenStandard}</span>
                      </div>
                    ))}
                  {selectedTokenIds.size > 10 && (
                    <div className="pt-1.5 text-[10px] text-center text-[#8E9299] italic">
                      + {(selectedTokenIds.size - 10).toLocaleString()} more tokens...
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-[#0A0A0C] border-t border-[#1F1F23] flex items-center justify-end gap-2.5">
              <button
                type="button"
                id="btn-cancel-bulk-delete"
                onClick={() => setIsBulkDeleteConfirmOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#16161A] hover:bg-[#1F1F23] border border-[#2D2D35] text-white font-mono text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-bulk-delete"
                onClick={handleBulkDelete}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-900/40 transition-all active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm Delete ({selectedTokenIds.size.toLocaleString()})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Automated Tagging Engine Modal */}
      <AutomatedTaggingModal
        isOpen={isTaggingModalOpen}
        onClose={() => setIsTaggingModalOpen(false)}
        tokens={tokens}
        selectedTokenIds={selectedTokenIds}
        onApplyTags={(updatedTokens) => {
          if (onBatchUpdateTokens) {
            onBatchUpdateTokens(updatedTokens);
          } else if (onBulkUpdate) {
            updatedTokens.forEach((t) => {
              onBulkUpdate([t.id], { tags: t.tags });
            });
          }
          const totalTags = updatedTokens.reduce((acc, t) => acc + (t.tags?.length || 0), 0);
          setBulkFeedback(
            `Automated Tagging Engine: Successfully classified & indexed ${updatedTokens.length.toLocaleString()} tokens with ${totalTags.toLocaleString()} categorical tags!`
          );
          setTimeout(() => setBulkFeedback(null), 5000);
        }}
        onSelectTagFilter={(tagId) => {
          setSelectedTag(tagId);
          setCurrentPage(1);
        }}
      />

      {/* Side-by-Side Token Comparison Modal */}
      <TokenCompareModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        tokens={tokens}
        initialTokenAId={compareTokenAId}
        initialTokenBId={compareTokenBId}
        onOpenGlobalSwapSell={onOpenGlobalSwapSell}
        onOpenMarketDeploy={onOpenMarketDeploy}
      />

      {/* All Tokens Private Key Vault & Keystore Modal */}
      <AllTokensPrivateKeyVaultModal
        tokens={tokens}
        isOpen={isKeysVaultOpen}
        onClose={() => setIsKeysVaultOpen(false)}
        onUpdateTokens={(updatedTokens) => {
          if (onUpdateTokens) {
            onUpdateTokens(updatedTokens);
          } else if (onBatchUpdateTokens) {
            onBatchUpdateTokens(updatedTokens);
          }
        }}
      />
    </div>
  );
};
