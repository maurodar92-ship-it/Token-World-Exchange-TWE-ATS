import React, { useState, useMemo } from "react";
import {
  Layers,
  Search,
  Check,
  CheckCircle2,
  Sparkles,
  Zap,
  Globe,
  Server,
  Database,
  ArrowRight,
  ArrowLeft,
  Filter,
  Shield,
  Coins,
  RefreshCw,
  ExternalLink,
  Code2,
  Sliders,
  Cloud,
  Terminal,
  Play,
  Share2,
  Lock,
  Boxes,
  Compass,
  Cpu,
  PlusCircle,
  FolderPlus,
  Atom,
  Clock,
  Eye,
  Bookmark,
  TrendingUp,
  FileCode,
} from "lucide-react";
import { CHAIN_CATALOG, ChainInfo, EVM_CHAINS, getChainById } from "../utils/chainCatalog";
import { TokenRecord, Web3Genre, GENRE_DEFINITIONS, AppProfile, AppServiceConfig } from "../types";
import { generateTokenBatch } from "../utils/cryptoGenerators";
import { saveTokensToFirestore } from "../lib/firebase";
import { QUANTUM_GLYPHS, QuantumGlyph, synthesizeQuantumSymbolicName, translateToQuantumNumerals } from "../utils/quantumSymbology";
import { PLATFORM_SERVICES, ServiceDefinition } from "../utils/serviceSimulators";
import { UniversalMarketSyncPanel } from "./UniversalMarketSyncPanel";

interface ChainAppOrchestratorProps {
  onAddTokens: (tokens: TokenRecord[]) => void;
  onClose?: () => void;
}

// Initial default Apps in the overlay registry
const DEFAULT_APPS: AppProfile[] = [
  {
    id: "app-mdgods-prime",
    name: "✦ mdgods.xyz Prime Timeline",
    tagline: "30-Year Forward Quantum Token & NFT Ecosystem with Zero-Gas Marketplace",
    description: "Holistic multi-chain ecosystem integrating 75+ chains, self-absorbing quantum glyphs, NFT art studio, and Gas Manager paymasters.",
    environment: "Mainnet",
    targetGenre: "gaming_media",
    selectedChains: ["ethereum", "solana", "base", "monad", "berachain", "unichain", "zksync", "arbitrum", "polygon_pos"],
    services: {
      nftApi: true,
      webhooks: true,
      tokenApi: true,
      nodeApi: true,
      grpc: true,
      pricesApi: true,
      transfersApi: true,
      bundlerApi: true,
      debugApi: true,
      blockTimestampApi: true,
      gasManager: true,
      traceApi: true,
      txReceiptsApi: true,
      userOpSimulationApi: true,
      websockets: true,
    },
    platformTimeline: "mdgods.xyz Epoch 2026 - 2056 Timeline",
    quantumGlyphsEnabled: true,
    nftBatchDeploymentVersion: "v4_cross_chain_6551",
    createdAt: new Date().toISOString(),
    contractCount: 850,
  },
  {
    id: "app-defi-vaults",
    name: "⏣ Concentrated Liquidity HyperVault",
    tagline: "Algorithmic AMM Yield Optimizer & Automated Debt Collateralizer",
    description: "Capital-efficient multi-chain vault deployment across Unichain, Berachain, Arbitrum, and Monad with automated rebalancing.",
    environment: "Mainnet",
    targetGenre: "defi_liquidity",
    selectedChains: ["unichain", "berachain", "arbitrum", "monad", "ethereum", "hyperliquid"],
    services: {
      nftApi: false,
      webhooks: true,
      tokenApi: true,
      nodeApi: true,
      grpc: true,
      pricesApi: true,
      transfersApi: true,
      bundlerApi: true,
      debugApi: false,
      blockTimestampApi: true,
      gasManager: true,
      traceApi: true,
      txReceiptsApi: true,
      userOpSimulationApi: true,
      websockets: true,
    },
    platformTimeline: "mdgods.xyz DeFi Genesis 2026",
    quantumGlyphsEnabled: true,
    nftBatchDeploymentVersion: "v2_quantum",
    createdAt: new Date().toISOString(),
    contractCount: 420,
  },
];

export const ChainAppOrchestrator: React.FC<ChainAppOrchestratorProps> = ({
  onAddTokens,
  onClose,
}) => {
  // App Profiles Registry (Multi-app ecosystem)
  const [appsList, setAppsList] = useState<AppProfile[]>(DEFAULT_APPS);
  const [activeAppId, setActiveAppId] = useState<string>("app-mdgods-prime");

  // 3-Step Wizard Navigation
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1 Form States: Create / Edit App
  const [appName, setAppName] = useState<string>("mdgods.xyz Quantum Multiverse 2056");
  const [appDescription, setAppDescription] = useState<string>(
    "Self-absorbing multi-dimensional application integrating 75+ chains, new generation of numbers & alphabets, Gas Manager sponsorship, and NFT art studio batch deployment."
  );
  const [targetGenre, setTargetGenre] = useState<Web3Genre>("gaming_media");
  const [environment, setEnvironment] = useState<"Mainnet" | "Testnet" | "Multi-Stage">("Mainnet");
  const [platformTimeline, setPlatformTimeline] = useState<string>("mdgods.xyz Platform - 30 Years Ahead (2056 Era)");
  const [nftBatchVersion, setNftBatchVersion] = useState<"v1_genesis" | "v2_quantum" | "v3_neural_ai" | "v4_cross_chain_6551">(
    "v4_cross_chain_6551"
  );
  const [quantumGlyphsEnabled, setQuantumGlyphsEnabled] = useState<boolean>(true);
  const [selectedGlyphCategory, setSelectedGlyphCategory] = useState<string>("all");

  // Step 2 States: Choose Chains
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedChainIds, setSelectedChainIds] = useState<Set<string>>(
    new Set(["ethereum", "solana", "base", "arbitrum", "polygon_pos", "zksync", "monad", "berachain", "unichain", "world_chain", "robinhood_chain", "shape", "starknet", "blast"])
  );
  const [chainCategoryFilter, setChainCategoryFilter] = useState<string>("all");

  // Step 3 States: Activate Services
  const [services, setServices] = useState<AppServiceConfig>({
    nftApi: true,
    webhooks: true,
    tokenApi: true,
    nodeApi: true,
    grpc: true,
    pricesApi: true,
    transfersApi: true,
    bundlerApi: true,
    debugApi: true,
    blockTimestampApi: true,
    gasManager: true,
    traceApi: true,
    txReceiptsApi: true,
    userOpSimulationApi: true,
    websockets: true,
  });

  // Interactive Live Service Inspector Modal
  const [inspectingServiceId, setInspectingServiceId] = useState<string | null>(null);
  const [serviceTestResponse, setServiceTestResponse] = useState<any | null>(null);
  const [isExecutingTest, setIsExecutingTest] = useState<boolean>(false);

  // Batch Generation States
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationLog, setGenerationLog] = useState<string | null>(null);
  const [generatedTokensCount, setGeneratedTokensCount] = useState<number>(0);

  // Active App Object
  const activeApp = useMemo(() => {
    return appsList.find((a) => a.id === activeAppId) || appsList[0];
  }, [appsList, activeAppId]);

  // Filtered Chains
  const filteredChains = useMemo(() => {
    return CHAIN_CATALOG.filter((chain) => {
      const matchesSearch =
        chain.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chain.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chain.tagline.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        chainCategoryFilter === "all"
          ? true
          : chainCategoryFilter === "evm"
          ? chain.isEVM
          : chainCategoryFilter === "non_evm"
          ? !chain.isEVM
          : chainCategoryFilter === "featured"
          ? chain.isFeatured
          : chain.category.toLowerCase().includes(chainCategoryFilter.toLowerCase());
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, chainCategoryFilter]);

  // Filtered Glyphs
  const filteredGlyphs = useMemo(() => {
    if (selectedGlyphCategory === "all") return QUANTUM_GLYPHS;
    return QUANTUM_GLYPHS.filter((g) => g.category === selectedGlyphCategory);
  }, [selectedGlyphCategory]);

  const toggleChain = (id: string) => {
    setSelectedChainIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllEVM = () => {
    setSelectedChainIds((prev) => {
      const next = new Set(prev);
      const allEvmSelected = EVM_CHAINS.every((c) => next.has(c.id));
      if (allEvmSelected) {
        EVM_CHAINS.forEach((c) => next.delete(c.id));
      } else {
        EVM_CHAINS.forEach((c) => next.add(c.id));
      }
      return next;
    });
  };

  const handleSelectFeatured = () => {
    setSelectedChainIds((prev) => {
      const next = new Set(prev);
      CHAIN_CATALOG.filter((c) => c.isFeatured).forEach((c) => next.add(c.id));
      return next;
    });
  };

  const handleToggleService = (key: keyof AppServiceConfig) => {
    setServices((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleEnableAllServices = () => {
    setServices({
      nftApi: true,
      webhooks: true,
      tokenApi: true,
      nodeApi: true,
      grpc: true,
      pricesApi: true,
      transfersApi: true,
      bundlerApi: true,
      debugApi: true,
      blockTimestampApi: true,
      gasManager: true,
      traceApi: true,
      txReceiptsApi: true,
      userOpSimulationApi: true,
      websockets: true,
    });
  };

  // Inspect & Test Service Live
  const handleInspectService = (serviceId: string) => {
    const s = PLATFORM_SERVICES[serviceId];
    if (!s) return;
    setInspectingServiceId(serviceId);
    const targetChain = (Array.from(selectedChainIds)[0] || "ethereum") as string;
    setServiceTestResponse(s.sampleResponse(targetChain));
  };

  const handleExecuteLiveTest = () => {
    if (!inspectingServiceId) return;
    setIsExecutingTest(true);
    setTimeout(() => {
      const s = PLATFORM_SERVICES[inspectingServiceId];
      const targetChain = (Array.from(selectedChainIds)[0] || "ethereum") as string;
      setServiceTestResponse(s.sampleResponse(targetChain));
      setIsExecutingTest(false);
    }, 400);
  };

  // Create App Action & Register Dynamic Profile
  const handleCreateAppSubmit = () => {
    const newApp: AppProfile = {
      id: `app-${Date.now()}`,
      name: appName.startsWith("✦") ? appName : `✦ ${appName}`,
      tagline: `30-Year Forward ${targetGenre.toUpperCase()} on ${selectedChainIds.size} Chains`,
      description: appDescription,
      environment,
      targetGenre,
      selectedChains: Array.from(selectedChainIds),
      services,
      platformTimeline,
      quantumGlyphsEnabled,
      nftBatchDeploymentVersion: nftBatchVersion,
      createdAt: new Date().toISOString(),
      contractCount: 100,
    };

    setAppsList((prev) => [newApp, ...prev]);
    setActiveAppId(newApp.id);
    setGenerationLog(`✓ App "${newApp.name}" dynamically created in overlay! All habitat, chains, and services integrated.`);
  };

  // 100 per Category (400 total)
  const handleGenerate100PerCategory = async () => {
    setIsGenerating(true);
    setGenerationLog("Synthesizing 100 tokens per category (400 total) with quantum glyphs across selected chains...");

    try {
      await new Promise((res) => setTimeout(res, 80));

      const categories: Web3Genre[] = ["defi_liquidity", "onchain_identity", "gaming_media", "depin_infra"];
      const activeChainsArray = Array.from(selectedChainIds);
      const allGenerated: TokenRecord[] = [];

      categories.forEach((genre) => {
        const batch = generateTokenBatch(100, {
          simulatedMarketData: true,
          eip55Checksum: true,
        });
        batch.forEach((tok, i) => {
          tok.genre = genre;
          if (activeChainsArray.length > 0) {
            tok.chain = activeChainsArray[i % activeChainsArray.length] as any;
          }
          if (quantumGlyphsEnabled) {
            tok.name = synthesizeQuantumSymbolicName(tok.name, "✦");
            tok.initialSupply = translateToQuantumNumerals(tok.initialSupply);
          }
        });
        allGenerated.push(...batch);
      });

      onAddTokens(allGenerated);
      setGeneratedTokensCount((prev) => prev + allGenerated.length);

      // Persist to Firebase
      try {
        const saved = await saveTokensToFirestore(allGenerated.slice(0, 450));
        setGenerationLog(`✓ Successfully minted 100 per category (400 total) and saved ${saved} tokens to Firestore in-house memory!`);
      } catch {
        setGenerationLog(`✓ Minted 400 categorized tokens cached in quantum local memory.`);
      }
    } catch (e: any) {
      setGenerationLog("Generation error: " + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // 100 Tokens per Selected Chain Batch
  const handleGenerate100PerChain = async () => {
    const activeChainsArray = Array.from(selectedChainIds);
    if (activeChainsArray.length === 0) {
      setGenerationLog("Please select at least 1 chain before generating chain batches.");
      return;
    }

    setIsGenerating(true);
    const totalCount = activeChainsArray.length * 100;
    setGenerationLog(`Generating 100 tokens for each of ${activeChainsArray.length} chains (${totalCount.toLocaleString()} total tokens)...`);

    try {
      await new Promise((res) => setTimeout(res, 100));

      const allGenerated: TokenRecord[] = [];
      const genresList: Web3Genre[] = ["defi_liquidity", "onchain_identity", "gaming_media", "depin_infra"];

      (activeChainsArray as string[]).forEach((chainId: string) => {
        const chainInfo = getChainById(chainId);
        const batch = generateTokenBatch(100, {
          simulatedMarketData: true,
          eip55Checksum: chainInfo.isEVM,
        });

        batch.forEach((tok, i) => {
          tok.chain = chainId as any;
          tok.genre = genresList[i % genresList.length];
          if (i % 4 === 0) {
            tok.symbol = `${chainInfo.symbol}${tok.symbol.slice(0, 3)}`;
          }
          if (quantumGlyphsEnabled) {
            tok.name = synthesizeQuantumSymbolicName(tok.name, "⏣");
          }
        });

        allGenerated.push(...batch);
      });

      onAddTokens(allGenerated);
      setGeneratedTokensCount((prev) => prev + allGenerated.length);

      try {
        const saved = await saveTokensToFirestore(allGenerated.slice(0, 450));
        setGenerationLog(`✓ Generated 100 tokens per selected chain (${allGenerated.length.toLocaleString()} total) and synced ${saved} to Firebase!`);
      } catch {
        setGenerationLog(`✓ Minted ${allGenerated.length.toLocaleString()} chain tokens in quantum memory.`);
      }
    } catch (e: any) {
      setGenerationLog("Chain batch error: " + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const isAllEvmSelected = EVM_CHAINS.every((c) => selectedChainIds.has(c.id));

  return (
    <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-6 shadow-2xl space-y-6 font-mono text-xs">
      {/* Top Banner: Dynamic App Switcher & mdgods.xyz Platform Timeline Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1F1F23]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-[#F27D26]/20 to-purple-600/20 border border-[#F27D26]/40 flex items-center justify-center text-[#F27D26] shadow-inner">
            <Atom className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>All Apps • Multi-Chain Platform</span>
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26]/30 font-bold">
                75+ Mainnets
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                mdgods.xyz Platform
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-bold">
                <Clock className="w-3 h-3" />
                <span>13:00 Timeline Synced</span>
              </span>
            </div>
            <p className="text-[11px] text-[#8E9299] mt-0.5">
              Self-absorbing multi-dimensional application overlay. Upgrade reality 30 years ahead with new generation alphabets, numbers & services.
            </p>
          </div>
        </div>

        {/* Dynamic App Profile Switcher */}
        <div className="flex items-center gap-2 bg-[#0A0A0C] p-2 rounded-lg border border-[#1F1F23]">
          <span className="text-[10px] text-[#8E9299] uppercase font-bold px-1">Active App:</span>
          <select
            value={activeAppId}
            onChange={(e) => {
              setActiveAppId(e.target.value);
              const found = appsList.find((a) => a.id === e.target.value);
              if (found) {
                setAppName(found.name);
                setAppDescription(found.description);
                setTargetGenre(found.targetGenre);
                setEnvironment(found.environment);
                setSelectedChainIds(new Set(found.selectedChains));
                setServices(found.services);
                setPlatformTimeline(found.platformTimeline);
              }
            }}
            className="bg-[#16161A] text-white border border-[#2F2F38] text-xs px-2.5 py-1 rounded focus:outline-none focus:border-[#F27D26] cursor-pointer"
          >
            {appsList.map((app) => (
              <option key={app.id} value={app.id}>
                {app.name} ({app.selectedChains.length} chains)
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              setCurrentStep(1);
              setAppName("✦ mdgods.xyz Inventions Nexus 2056");
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#F27D26]/20 hover:bg-[#F27D26]/30 border border-[#F27D26]/40 text-[#F27D26] text-xs font-bold transition-all cursor-pointer"
            title="Create new app in overlay"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New App</span>
          </button>
        </div>
      </div>

      {/* 3-Step Wizard Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0A0A0C] p-2 rounded-xl border border-[#1F1F23]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              currentStep === 1
                ? "bg-[#1E1E24] text-white font-bold border border-[#F27D26]"
                : "text-[#8E9299] hover:text-white"
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-[#16161A] border border-[#2F2F38] text-[10px] flex items-center justify-center font-bold">
              1
            </span>
            <span>Create new app</span>
          </button>

          <ArrowRight className="w-3.5 h-3.5 text-[#3A3A44]" />

          <button
            type="button"
            onClick={() => setCurrentStep(2)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              currentStep === 2
                ? "bg-[#1E1E24] text-white font-bold border border-[#F27D26]"
                : "text-[#8E9299] hover:text-white"
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-[#16161A] border border-[#2F2F38] text-[10px] flex items-center justify-center font-bold">
              2
            </span>
            <span>Choose chains</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#F27D26]/20 text-[#F27D26] font-bold">
              {selectedChainIds.size}
            </span>
          </button>

          <ArrowRight className="w-3.5 h-3.5 text-[#3A3A44]" />

          <button
            type="button"
            onClick={() => setCurrentStep(3)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              currentStep === 3
                ? "bg-[#1E1E24] text-white font-bold border border-[#F27D26]"
                : "text-[#8E9299] hover:text-white"
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-[#16161A] border border-[#2F2F38] text-[10px] flex items-center justify-center font-bold">
              3
            </span>
            <span>Activate services</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold">
              15 APIs
            </span>
          </button>
        </div>

        {/* Global Batch Mint Shortcut */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGenerate100PerCategory}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#16161A] hover:bg-[#1E1E24] border border-[#2F2F38] text-white transition-all cursor-pointer disabled:opacity-50"
          >
            <Coins className="w-3 h-3 text-[#F27D26]" />
            <span>100/Category (400)</span>
          </button>
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGenerate100PerChain}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#F27D26] hover:bg-[#ff8e3c] text-black font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            <Layers className="w-3 h-3" />
            <span>100/Chain Batch</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* STEP 1: CREATE NEW APP & 30-YEAR QUANTUM SYMBOLOGY SYNTHESIZER       */}
      {/* ===================================================================== */}
      {currentStep === 1 && (
        <div className="space-y-6 animate-fade-in">
          {/* Main App Configuration Fields */}
          <div className="bg-[#0A0A0C] p-4 rounded-xl border border-[#1F1F23] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-[#F27D26]" />
                <span>1. App Identity & Environment Blueprint</span>
              </h3>
              <span className="text-[10px] text-purple-400 font-mono">
                Timeline: {platformTimeline}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] text-[#8E9299] uppercase font-bold">App Name</label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="e.g. mdgods.xyz Quantum Multiverse 2056"
                  className="w-full px-3 py-2 rounded-lg bg-[#16161A] border border-[#1F1F23] text-white text-xs focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-[#8E9299] uppercase font-bold">Environment Target</label>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-[#16161A] border border-[#1F1F23] text-white text-xs focus:outline-none focus:border-[#F27D26] cursor-pointer"
                >
                  <option value="Mainnet">Production Mainnet (All 75+ Chains)</option>
                  <option value="Testnet">Developer Testnet (Sepolia, Amoy, Devnet)</option>
                  <option value="Multi-Stage">Multi-Stage Hybrid Simulation</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-[#8E9299] uppercase font-bold">App Description</label>
              <textarea
                rows={2}
                value={appDescription}
                onChange={(e) => setAppDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#16161A] border border-[#1F1F23] text-white text-xs focus:outline-none focus:border-[#F27D26]"
              />
            </div>

            {/* Target Genre Selection */}
            <div className="space-y-2">
              <label className="text-[11px] text-[#8E9299] uppercase font-bold">Target Web3 Genre</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {(Object.keys(GENRE_DEFINITIONS) as Web3Genre[]).map((g) => {
                  const def = GENRE_DEFINITIONS[g];
                  const isSelected = targetGenre === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setTargetGenre(g)}
                      className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "bg-[#1E1E24] border-[#F27D26] text-white shadow-md shadow-[#F27D26]/10"
                          : "bg-[#16161A] border-[#1F1F23] text-[#8E9299] hover:text-white"
                      }`}
                    >
                      <div>
                        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border ${def.badgeBg} ${def.badgeBorder} ${def.badgeText}`}>
                          {def.shortLabel}
                        </span>
                        <h4 className="text-xs font-bold text-white mt-1.5">{def.title}</h4>
                        <p className="text-[10px] text-[#8E9299] mt-1 line-clamp-2 leading-relaxed">
                          {def.tagline}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* NFT Art Studio Batch Deployment Series Version */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-[11px] text-[#8E9299] uppercase font-bold">
                  NFT Art Studio Batch Deployment Version
                </label>
                <select
                  value={nftBatchVersion}
                  onChange={(e) => setNftBatchVersion(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-[#16161A] border border-[#1F1F23] text-white text-xs focus:outline-none focus:border-[#F27D26] cursor-pointer"
                >
                  <option value="v4_cross_chain_6551">Version 4: Cross-Chain ERC-6551 Token Bound Accounts</option>
                  <option value="v3_neural_ai">Version 3: AI Neural Dynamic SVG Art Foundry</option>
                  <option value="v2_quantum">Version 2: Quantum Parametric Generative Series</option>
                  <option value="v1_genesis">Version 1: mdgods.xyz Sovereign Genesis Codex</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-[#8E9299] uppercase font-bold">
                  mdgods.xyz Platform Timeline Epoch
                </label>
                <input
                  type="text"
                  value={platformTimeline}
                  onChange={(e) => setPlatformTimeline(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#16161A] border border-[#1F1F23] text-white text-xs focus:outline-none focus:border-[#F27D26]"
                />
              </div>
            </div>
          </div>

          {/* New Generation of Numbers, Alphabets & Quantum Symbology Synthesizer */}
          <div className="bg-gradient-to-br from-[#1A1A26] to-[#0F0F14] p-5 rounded-xl border border-purple-500/30 space-y-4 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Atom className="w-4 h-4 text-purple-400" />
                  <span>New Generation of Numbers, Alphabets & Self-Absorbing Glyphs</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    30 Years Ahead (2056)
                  </span>
                </h3>
                <p className="text-[11px] text-[#8E9299] mt-1">
                  Dynamic self-absorption of all geometric shapes, characters, special symbols, and upgraded numerals into cohesive future token entities.
                </p>
              </div>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-[#0A0A0C] border border-[#1F1F23] cursor-pointer">
                <input
                  type="checkbox"
                  checked={quantumGlyphsEnabled}
                  onChange={(e) => setQuantumGlyphsEnabled(e.target.checked)}
                  className="accent-purple-500"
                />
                <span className="text-xs text-purple-300 font-bold">Enable Holographic Symbology</span>
              </label>
            </div>

            {/* Glyph Filter Categories */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: "all", label: "All Symbols" },
                { id: "shape", label: "Shapes & Nexuses" },
                { id: "numeral", label: "New Numerals (𝟘–𝟡)" },
                { id: "alphabet", label: "Future Alphabets (𝚯, 𝚽, 𝛀)" },
                { id: "special_operator", label: "Special Operators (⟠, ⌬, ⨂, ⚡)" },
                { id: "mdgods_hologram", label: "mdgods.xyz Holograms" },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedGlyphCategory(c.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] whitespace-nowrap cursor-pointer transition-all ${
                    selectedGlyphCategory === c.id
                      ? "bg-purple-600 text-white font-bold"
                      : "bg-[#0A0A0C] text-[#8E9299] hover:text-white border border-[#1F1F23]"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Glyph Matrix Display */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 max-h-56 overflow-y-auto p-1">
              {filteredGlyphs.map((glyph, idx) => (
                <div
                  key={idx}
                  className="bg-[#0A0A0C] p-2.5 rounded-lg border border-[#1F1F23] hover:border-purple-500/50 transition-all flex flex-col justify-between group cursor-default"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl text-purple-300 group-hover:scale-125 transition-transform font-serif">
                      {glyph.symbol}
                    </span>
                    <span className="text-[9px] text-[#8E9299]">{glyph.temporalDecade}</span>
                  </div>
                  <div className="mt-1.5">
                    <span className="text-[10px] font-bold text-white block truncate">{glyph.name}</span>
                    <span className="text-[9px] text-purple-400/80 block truncate">{glyph.energyVector}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex items-center justify-between border-t border-[#1F1F23]">
            <button
              type="button"
              onClick={handleCreateAppSubmit}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer transition-all shadow-lg shadow-purple-600/20"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create App in Overlay</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F27D26] hover:bg-[#ff8e3c] text-black font-bold text-xs cursor-pointer transition-all shadow-md shadow-[#F27D26]/20"
            >
              <span>Next: Choose Chains ({selectedChainIds.size})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 2: CHOOSE CHAINS (75+ MULTI-CHAIN ECOSYSTEM)                     */}
      {/* ===================================================================== */}
      {currentStep === 2 && (
        <div className="space-y-4 animate-fade-in">
          {/* Action Bar: Search, Enable all EVM, Featured */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-[#0A0A0C] p-3 rounded-lg border border-[#1F1F23]">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-3.5 h-3.5 text-[#8E9299] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search 75+ chains (e.g. Ethereum, Solana, ZKsync, Base)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#16161A] border border-[#1F1F23] text-white text-xs placeholder-[#8E9299]/50 focus:outline-none focus:border-[#F27D26]"
              />
            </div>

            {/* Quick Action Toggles */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllEVM}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer border ${
                  isAllEvmSelected
                    ? "bg-[#F27D26]/20 border-[#F27D26] text-[#F27D26] font-bold"
                    : "bg-[#16161A] border-[#1F1F23] text-[#8E9299] hover:text-white"
                }`}
              >
                <Zap className="w-3 h-3 text-[#F27D26]" />
                <span>{isAllEvmSelected ? "✓ All EVM Enabled" : "Enable all EVM"}</span>
              </button>

              <button
                type="button"
                onClick={handleSelectFeatured}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#16161A] hover:bg-[#1E1E24] border border-[#1F1F23] text-white text-xs transition-all cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-[#F27D26]" />
                <span>Select Featured</span>
              </button>

              <span className="text-[11px] text-[#8E9299] px-2">
                Selected: <strong className="text-white">{selectedChainIds.size}</strong> / {CHAIN_CATALOG.length}
              </span>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { id: "all", label: "All 75+ Chains" },
              { id: "evm", label: "EVM Compatible" },
              { id: "featured", label: "Featured" },
              { id: "optimistic", label: "Optimistic L2" },
              { id: "zk", label: "ZK-Rollup" },
              { id: "appchain", label: "AppChains" },
              { id: "non_evm", label: "SVM / Move / UTXO" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setChainCategoryFilter(cat.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] whitespace-nowrap cursor-pointer transition-all ${
                  chainCategoryFilter === cat.id
                    ? "bg-[#F27D26] text-black font-bold"
                    : "bg-[#0A0A0C] text-[#8E9299] hover:text-white border border-[#1F1F23]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Chain Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[460px] overflow-y-auto p-1">
            {filteredChains.map((chain) => {
              const isSelected = selectedChainIds.has(chain.id);
              return (
                <div
                  key={chain.id}
                  onClick={() => toggleChain(chain.id)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "bg-[#1A1A22] border-[#F27D26] shadow-md shadow-[#F27D26]/10"
                      : "bg-[#0A0A0C] border-[#1F1F23] hover:border-[#2F2F38] opacity-80 hover:opacity-100"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isSelected
                              ? "bg-[#F27D26] border-[#F27D26] text-black"
                              : "border-[#3A3A44] bg-[#16161A]"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{chain.name}</span>
                            {chain.isFeatured && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                Featured
                              </span>
                            )}
                          </h4>
                          <span className="text-[10px] text-[#8E9299]">
                            {chain.symbol} • {chain.category}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded ${
                          chain.isEVM
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {chain.isEVM ? "EVM" : "ALT"}
                      </span>
                    </div>

                    <p className="text-[10px] text-[#8E9299] mt-2 line-clamp-2 leading-relaxed">
                      {chain.tagline}
                    </p>
                  </div>

                  <div className="pt-2 mt-2 border-t border-[#1F1F23] flex items-center justify-between text-[9px] text-[#8E9299]">
                    <span className="text-green-400">
                      {chain.platformSupport}
                    </span>
                    <span>{chain.testnets[0] || "Mainnet"}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Navigation Controls */}
          <div className="pt-3 flex items-center justify-between border-t border-[#1F1F23]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/30 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>13:00</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A0A0C] hover:bg-[#16161A] text-[#8E9299] hover:text-white cursor-pointer border border-[#1F1F23]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F27D26] hover:bg-[#ff8e3c] text-black font-bold text-xs cursor-pointer transition-all"
              >
                <span>Next: Activate Services ({selectedChainIds.size} Chains Selected)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 3: ACTIVATE SERVICES (ALL 15 SERVICES REQUESTED)                 */}
      {/* ===================================================================== */}
      {currentStep === 3 && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Action: Enable All Services */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0A0A0C] p-3 rounded-lg border border-[#1F1F23]">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Server className="w-3.5 h-3.5 text-[#F27D26]" />
                <span>Activate Services for {selectedChainIds.size} Mainnets</span>
              </h3>
              <p className="text-[11px] text-[#8E9299] mt-0.5">
                Multi-chain APIs, zero-gas Paymasters, ERC-4337 bundlers, streaming websockets, and NFT art studio.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleEnableAllServices}
                className="px-3 py-1.5 rounded-md bg-[#F27D26]/20 hover:bg-[#F27D26]/30 border border-[#F27D26]/40 text-[#F27D26] font-bold text-xs cursor-pointer transition-all"
              >
                Enable All 15 Services
              </button>
            </div>
          </div>

          {/* Section 1: Recommended for Marketplace */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#1F1F23] pb-1.5">
              <h4 className="text-xs font-bold text-[#F27D26] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Recommended for Marketplace</span>
              </h4>
              <span className="text-[10px] text-[#8E9299]">5 Core Services</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                PLATFORM_SERVICES.nftApi,
                PLATFORM_SERVICES.webhooks,
                PLATFORM_SERVICES.tokenApi,
                PLATFORM_SERVICES.nodeApi,
                PLATFORM_SERVICES.grpc,
              ].map((serv) => {
                const isEnabled = services[serv.id as keyof AppServiceConfig];
                return (
                  <div
                    key={serv.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                      isEnabled
                        ? "bg-[#1A1A22] border-[#F27D26]/60 shadow-md shadow-[#F27D26]/5"
                        : "bg-[#0A0A0C] border-[#1F1F23] opacity-75"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={() => handleToggleService(serv.id as keyof AppServiceConfig)}
                            className="accent-[#F27D26] w-3.5 h-3.5 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-white">{serv.name}</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => handleInspectService(serv.id)}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 cursor-pointer"
                        >
                          <Terminal className="w-2.5 h-2.5" />
                          <span>Test API</span>
                        </button>
                      </div>

                      <p className="text-[10px] text-[#F27D26]/90 font-medium mt-1">
                        {serv.tagline}
                      </p>
                      <p className="text-[10px] text-[#8E9299] mt-1 line-clamp-2 leading-relaxed">
                        {serv.description}
                      </p>
                    </div>

                    <div className="pt-2 mt-2 border-t border-[#1F1F23] flex items-center justify-between text-[9px] text-[#8E9299]">
                      <span className="font-mono text-emerald-400 truncate max-w-[170px]">
                        {serv.defaultEndpoint}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-[#16161A] text-white">
                        {isEnabled ? "ACTIVE" : "OFF"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: All other services */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#1F1F23] pb-1.5">
              <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5" />
                <span>All other services</span>
              </h4>
              <span className="text-[10px] text-[#8E9299]">10 Specialized APIs</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                PLATFORM_SERVICES.pricesApi,
                PLATFORM_SERVICES.transfersApi,
                PLATFORM_SERVICES.bundlerApi,
                PLATFORM_SERVICES.debugApi,
                PLATFORM_SERVICES.blockTimestampApi,
                PLATFORM_SERVICES.gasManager,
                PLATFORM_SERVICES.traceApi,
                PLATFORM_SERVICES.txReceiptsApi,
                PLATFORM_SERVICES.userOpSimulationApi,
                PLATFORM_SERVICES.websockets,
              ].map((serv) => {
                const isEnabled = services[serv.id as keyof AppServiceConfig];
                return (
                  <div
                    key={serv.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                      isEnabled
                        ? "bg-[#1A1A22] border-cyan-500/40 shadow-md shadow-cyan-500/5"
                        : "bg-[#0A0A0C] border-[#1F1F23] opacity-75"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={() => handleToggleService(serv.id as keyof AppServiceConfig)}
                            className="accent-cyan-400 w-3.5 h-3.5 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-white">{serv.name}</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => handleInspectService(serv.id)}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 cursor-pointer"
                        >
                          <Terminal className="w-2.5 h-2.5" />
                          <span>Test API</span>
                        </button>
                      </div>

                      <p className="text-[10px] text-cyan-400/90 font-medium mt-1">
                        {serv.tagline}
                      </p>
                      <p className="text-[10px] text-[#8E9299] mt-1 line-clamp-2 leading-relaxed">
                        {serv.description}
                      </p>
                    </div>

                    <div className="pt-2 mt-2 border-t border-[#1F1F23] flex items-center justify-between text-[9px] text-[#8E9299]">
                      <span className="font-mono text-cyan-300 truncate max-w-[170px]">
                        {serv.defaultEndpoint}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-[#16161A] text-white">
                        {isEnabled ? "ACTIVE" : "OFF"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Live API Tester Modal / Drawer */}
          {inspectingServiceId && PLATFORM_SERVICES[inspectingServiceId] && (
            <div className="bg-[#0A0A0C] p-4 rounded-xl border border-cyan-500/40 space-y-3 animate-fade-in shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-[#1F1F23]">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white">
                    Live API Tester: {PLATFORM_SERVICES[inspectingServiceId].name}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                    {PLATFORM_SERVICES[inspectingServiceId].sampleMethod}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectingServiceId(null)}
                  className="text-xs text-[#8E9299] hover:text-white cursor-pointer px-2 py-0.5 rounded bg-[#16161A]"
                >
                  ✕ Close Inspector
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Request Payload */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-[#8E9299] uppercase font-bold">Request Payload</span>
                  <pre className="p-3 rounded-lg bg-[#16161A] border border-[#1F1F23] text-cyan-300 text-[11px] overflow-x-auto font-mono max-h-48">
                    {JSON.stringify(PLATFORM_SERVICES[inspectingServiceId].samplePayload, null, 2)}
                  </pre>
                </div>

                {/* Simulated Response */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#8E9299] uppercase font-bold">Live Response Output</span>
                    <button
                      type="button"
                      disabled={isExecutingTest}
                      onClick={handleExecuteLiveTest}
                      className="text-[10px] text-black bg-cyan-400 hover:bg-cyan-300 px-2 py-0.5 rounded font-bold cursor-pointer transition-all flex items-center gap-1"
                    >
                      {isExecutingTest ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Play className="w-2.5 h-2.5" />}
                      <span>Execute</span>
                    </button>
                  </div>
                  <pre className="p-3 rounded-lg bg-[#16161A] border border-green-500/30 text-green-400 text-[11px] overflow-x-auto font-mono max-h-48">
                    {JSON.stringify(serviceTestResponse, null, 2)}
                  </pre>
                </div>
              </div>

              <p className="text-[10px] text-[#8E9299] italic">
                Academic Insight: {PLATFORM_SERVICES[inspectingServiceId].academicInsight}
              </p>
            </div>
          )}

          {/* Universal Market Sync Parameters & Foundry CLI Suite */}
          <UniversalMarketSyncPanel
            selectedChainId={Array.from(selectedChainIds)[0] || "ethereum"}
            activeTokenName={appName || "MarketAsset"}
            activeTokenSymbol={appName.includes("DePIN") ? "DEPIN" : "MKT"}
            onDeploySuccess={(addr) =>
              setGenerationLog(`✓ Contract ${addr} deployed via Forge CLI on ${Array.from(selectedChainIds)[0] || "ethereum"}!`)
            }
          />

          {/* Dedicated Batch Foundry: 100 per Category & 100 per Chain */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#1A1A24] to-[#121218] border border-[#F27D26]/30 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#F27D26]" />
                  <span>30-Year Forward Inventions: High-Efficiency Token Foundry</span>
                </h4>
                <p className="text-[11px] text-[#8E9299] mt-0.5">
                  Synthesize 100-token batches per category and 100 per selected chain with EIP-7702, EIP-4337, and quantum numerals.
                </p>
              </div>

              {generatedTokensCount > 0 && (
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/30">
                  +{generatedTokensCount.toLocaleString()} Tokens Minted
                </span>
              )}
            </div>

            {/* Batch Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerate100PerCategory}
                className="p-3.5 rounded-lg bg-[#0A0A0C] hover:bg-[#16161A] border border-[#F27D26]/50 text-left transition-all cursor-pointer flex items-center justify-between group disabled:opacity-50"
              >
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-[#F27D26] flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-[#F27D26]" />
                    <span>Generate 100 per Category (400 Total)</span>
                  </div>
                  <div className="text-[10px] text-[#8E9299] mt-1">
                    100 DeFi Vaults • 100 Identity • 100 Gaming • 100 DePIN
                  </div>
                </div>
                {isGenerating ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-[#F27D26]" />
                ) : (
                  <Zap className="w-4 h-4 text-[#F27D26]" />
                )}
              </button>

              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerate100PerChain}
                className="p-3.5 rounded-lg bg-[#F27D26] hover:bg-[#ff8e3c] text-black font-bold text-left transition-all cursor-pointer flex items-center justify-between shadow-lg shadow-[#F27D26]/20 disabled:opacity-50"
              >
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Generate 100 per Selected Chain</span>
                  </div>
                  <div className="text-[10px] text-black/75 mt-1 font-medium">
                    100 tokens × {selectedChainIds.size} chains = {(selectedChainIds.size * 100).toLocaleString()} tokens
                  </div>
                </div>
                {isGenerating ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                ) : (
                  <Globe className="w-4 h-4 text-black" />
                )}
              </button>
            </div>

            {/* Notification Status Log */}
            {generationLog && (
              <div className="p-3 rounded-lg bg-[#0A0A0C] border border-green-500/30 text-green-400 text-xs font-mono flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span>{generationLog}</span>
                </div>
                <span className="text-[10px] text-[#8E9299]">mdgods.xyz Realtime Vault</span>
              </div>
            )}
          </div>

          {/* Navigation Controls: 13:00, Back, Create app13:00 */}
          <div className="pt-4 flex items-center justify-between border-t border-[#1F1F23]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/30 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>13:00</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0A0A0C] hover:bg-[#16161A] text-[#8E9299] hover:text-white cursor-pointer border border-[#1F1F23] font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleCreateAppSubmit}
                className="px-5 py-2.5 rounded-lg bg-[#F27D26] hover:bg-[#ff8e3c] text-black font-bold text-xs cursor-pointer transition-all shadow-xl shadow-[#F27D26]/25 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Create app</span>
                <span className="text-[10px] bg-black/20 text-black px-1.5 py-0.5 rounded font-mono font-bold">13:00</span>
              </button>

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-[#0A0A0C] hover:bg-[#16161A] border border-[#1F1F23] text-[#8E9299] hover:text-white font-bold text-xs cursor-pointer transition-all"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
