import React, { useState, useRef, useEffect } from "react";
import { 
  Sparkles, 
  Cpu, 
  Layers, 
  ShieldCheck, 
  Terminal, 
  Database, 
  Code2, 
  Rocket, 
  Activity, 
  Copy, 
  Check, 
  ArrowUpRight, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft,
  ChevronRight,
  Globe, 
  Zap, 
  Workflow, 
  FileCode,
  Flame,
  Palette,
  Gauge,
  BarChart3,
  Shield,
  LayoutGrid,
  Columns,
  ArrowDown,
  Scale,
  Binary,
  ShieldAlert
} from "lucide-react";
import { GenerationConfig, TokenRecord } from "../types";
import { NavTabId } from "./Navbar";
import { VaultMemoryCockpit } from "./VaultMemoryCockpit";

interface IntelligentPromptCard {
  id: string;
  title: string;
  category: "DeFi & Vaults" | "Identity & Vanity" | "DePIN & Sensors" | "Gaming & SVG" | "Market Sync" | "Security Audit";
  accentColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  description: string;
  parameters: {
    chain: string;
    standard: string;
    narrative: string;
    security: string;
  };
  promptTemplate: string;
}

const INTELLIGENT_PROMPT_CARDS: IntelligentPromptCard[] = [
  {
    id: "prompt-quantum-defi",
    title: "Quantum Entropy DeFi Yield Engine",
    category: "DeFi & Vaults",
    accentColor: "#F27D26",
    badgeBg: "bg-orange-500/10",
    badgeBorder: "border-orange-500/30",
    badgeText: "text-orange-400",
    description: "Generates high-yield algorithmic liquidity vaults with real-time quantum entropy signature tracking and multi-tier fee routing.",
    parameters: {
      chain: "Ethereum / Base",
      standard: "ERC-20 + Vault",
      narrative: "quantum_defi",
      security: "98/100 (Trail of Bits)",
    },
    promptTemplate: `Act as a principal Web3 Solidity Architect. Construct an institutional-grade ERC-4626 Quantum DeFi yield vault contract for Ethereum and Base.
Include:
1. Dynamic quantum entropy signature verification for simulated randomness in rebalancing.
2. Concentrated tick-range liquidity provisioning with EIP-2612 permit approvals.
3. Treasury allocation of 15% and auto-compounding fee distribution logic.
4. Forge deployment script with simulated zero-slippage broadcast parameters.`,
  },
  {
    id: "prompt-account-abstraction",
    title: "EIP-4337 Smart Account & Vanity Mint",
    category: "Identity & Vanity",
    accentColor: "#00F0FF",
    badgeBg: "bg-cyan-500/10",
    badgeBorder: "border-cyan-500/30",
    badgeText: "text-cyan-400",
    description: "Synthesizes sovereign Web3 name resolver records, deterministic 0x vanity salts, and ERC-4337 account abstraction paymasters.",
    parameters: {
      chain: "Arbitrum / Polygon",
      standard: "ERC-4337 + Vanity",
      narrative: "rwa",
      security: "96/100 (OpenZeppelin)",
    },
    promptTemplate: `Architect an EIP-4337 compatible Smart Contract Account with vanity address mining validation for Arbitrum.
Requirements:
1. Gasless userOp sponsor verification via decentralized Paymaster module.
2. Deterministic CREATE2 deployment utilizing a 0x777 / 0xDEAD vanity bytecode salt.
3. Soulbound reverse-resolution metadata mapping ENS-compatible aliases to raw cryptographic pubkeys.
4. Full Forge test suite verifying signature aggregation and recovery bounds.`,
  },
  {
    id: "prompt-depin-telemetry",
    title: "DePIN IoT Sensor Stream & Micro-Settlement",
    category: "DePIN & Sensors",
    accentColor: "#10B981",
    badgeBg: "bg-emerald-500/10",
    badgeBorder: "border-emerald-500/30",
    badgeText: "text-emerald-400",
    description: "Constructs machine-to-machine sensor micropayment channels, hardware proof-of-coverage, and distributed compute reward meters.",
    parameters: {
      chain: "Solana / Quantum",
      standard: "SPL-Token / Micro",
      narrative: "depin",
      security: "94/100 (Halborn)",
    },
    promptTemplate: `Design a high-throughput DePIN micro-settlement protocol contract handling 10,000+ IoT telemetry pings per second.
Features:
1. Cryptographic proof-of-coverage verification for physical wireless gateways and GPU inference nodes.
2. Off-chain state channel settlement with on-chain dispute resolution thresholds.
3. Automated token burn-and-mint equilibrium (BME) economics for bandwidth consumption.
4. Comprehensive metadata schema compatible with CoinMarketCap and Dexscreener.`,
  },
  {
    id: "prompt-gaming-loot",
    title: "Autonomous Gaming SVG & Procedural Loot",
    category: "Gaming & SVG",
    accentColor: "#A855F7",
    badgeBg: "bg-purple-500/10",
    badgeBorder: "border-purple-500/30",
    badgeText: "text-purple-400",
    description: "Builds dynamic on-chain SVG vector generators, trait state evolution resolvers, and gas-optimized ERC-1155 multiverse assets.",
    parameters: {
      chain: "Base / Ethereum",
      standard: "ERC-721 / ERC-1155",
      narrative: "autonomous_worlds",
      security: "95/100 (Code4rena)",
    },
    promptTemplate: `Write a 100% on-chain SVG generative NFT smart contract conforming to ERC-721Enumerable.
Details:
1. Procedural vector rendering engine outputting raw <svg> data strings without external IPFS dependencies.
2. Dynamic trait evolution based on on-chain block hash entropy and token age.
3. Gas-optimized Base64 JSON metadata encoding in pure Solidity.
4. Marketplace-ready OpenSea / Blur trait attributes schema with rarity weightings.`,
  },
  {
    id: "prompt-market-sync",
    title: "Universal Multi-Chain Market Sync",
    category: "Market Sync",
    accentColor: "#3B82F6",
    badgeBg: "bg-blue-500/10",
    badgeBorder: "border-blue-500/30",
    badgeText: "text-blue-400",
    description: "Automated Forge CLI deployment scripts, live wallet state reading, and aggregator-compliant JSON metadata formats.",
    parameters: {
      chain: "75+ Supported Chains",
      standard: "ERC-20 / Native",
      narrative: "ai_agents",
      security: "99/100 (CertiK)",
    },
    promptTemplate: `Create a universal Web3 deployment and market indexing package:
1. Foundry script DeployTokens.s.sol broadcastable to any EVM network with automatic wallet state reading.
2. Explorer verification command with dynamic chain ID parameters.
3. Production CoinMarketCap / Dexscreener formatted payload schema with liquidity pool addresses and initial circulating supply.
4. EIP-747 wallet_watchAsset integration snippet for Web3 browser extensions.`,
  },
  {
    id: "prompt-security-vault",
    title: "Rug-Proof Liquidity Time-Lock & Vesting",
    category: "Security Audit",
    accentColor: "#EC4899",
    badgeBg: "bg-pink-500/10",
    badgeBorder: "border-pink-500/30",
    badgeText: "text-pink-400",
    description: "Synthesizes multi-signature treasury time-locks, linear token vesting schedules, and emergency circuit-breaker defenses.",
    parameters: {
      chain: "Ethereum / Arbitrum",
      standard: "ERC-20 + Lock",
      narrative: "liquid_restaking",
      security: "100/100 (Multi-Audited)",
    },
    promptTemplate: `Implement a multi-tier token vesting and liquidity time-lock contract with emergency timelock safeguards.
Specifications:
1. Linear vesting curves with customizable cliff periods for founder and advisor allocations.
2. Immutable liquidity locking mechanism preventing LP token withdrawal before scheduled maturity.
3. Multi-signature governance requirement for contract upgrades and fee adjustment.
4. Formal verification assertions and CertiK/OpenZeppelin compatible audit reports.`,
  },
];

export interface InventionItem {
  id: NavTabId;
  title: string;
  badge: string;
  description: string;
  category: "Core Storage & Vault" | "Ecosystem & Chains" | "Developer & Deploy" | "AI & Visual Studio";
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  iconBg: string;
  glowBorder: string;
  stats: string;
}

interface TopFullstackCockpitProps {
  activeTab: NavTabId;
  setActiveTab: (tab: NavTabId) => void;
  totalTokensCount: number;
  vaultTokensCount: number;
  onGenerate100: () => void;
  onGenerate1000More?: () => void;
  onUsePromptInAI: (promptText: string) => void;
  onQuickGenerate: (config: Partial<GenerationConfig>, promptTemplate?: string) => void;
  maxCapacity: number;
  isGenerating: boolean;
  onOpenValidationModal?: () => void;
  tokens?: TokenRecord[];
  onMaxCapacityChange?: (cap: number) => void;
  onTokensUpdated?: (tokens: TokenRecord[]) => void;
  metaMaskAccount?: string | null;
  isMetaMaskConnected?: boolean;
  onOpenMetaMaskSync?: () => void;
}

export const TopFullstackCockpit: React.FC<TopFullstackCockpitProps> = ({
  activeTab,
  setActiveTab,
  totalTokensCount,
  vaultTokensCount,
  onGenerate100,
  onGenerate1000More,
  onUsePromptInAI,
  onQuickGenerate,
  maxCapacity,
  isGenerating,
  onOpenValidationModal,
  tokens = [],
  onMaxCapacityChange,
  onTokensUpdated,
  metaMaskAccount,
  isMetaMaskConnected,
  onOpenMetaMaskSync,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [layoutMode, setLayoutMode] = useState<"sideways" | "grid">("sideways");
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null);
  const [quickGenNotice, setQuickGenNotice] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [inventionFilter, setInventionFilter] = useState<string>("All Inventions");

  const reelRef = useRef<HTMLDivElement>(null);
  const [canScrollReelLeft, setCanScrollReelLeft] = useState(false);
  const [canScrollReelRight, setCanScrollReelRight] = useState(true);

  const inventionCategories = [
    "All Inventions",
    "Core Storage & Vault",
    "Ecosystem & Chains",
    "Developer & Deploy",
    "AI & Visual Studio"
  ];

  const inventions: InventionItem[] = [
    {
      id: "security_threat_scanner",
      title: "Security Threat Scanner",
      badge: "Heuristic Deep Scan",
      description: "Automated vulnerability scanner evaluating un-renounced ownership, insider whale distribution patterns, unlocked AMM liquidity, and deterministic entropy safeguards.",
      category: "Developer & Deploy",
      icon: ShieldAlert,
      accentColor: "#F43F5E",
      iconBg: "bg-rose-500/10 text-rose-400 border-rose-500/30",
      glowBorder: "hover:border-rose-500/60",
      stats: "Heuristic AI Engine"
    },
    {
      id: "token_vault",
      title: "Token Vault",
      badge: vaultTokensCount > 0 ? `${vaultTokensCount.toLocaleString()} Cloud Docs` : "Firestore Cloud Sync",
      description: "Durable encrypted Firestore storage with automated snapshot rollbacks, batch synchronization, and entropy validation.",
      category: "Core Storage & Vault",
      icon: ShieldCheck,
      accentColor: "#10B981",
      iconBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      glowBorder: "hover:border-emerald-500/60",
      stats: "Cloud Persistence"
    },
    {
      id: "tokenomics_engine",
      title: "2⁸ Reserve Tokenomics",
      badge: "2⁸ Shares & uint256 Ceil",
      description: "Mathematical uint256 boundaries (2²⁵⁶-1), real participant capital liquidity (x·y=k), OpenZeppelin contracts, 2⁸ reserve shares, and ≥ 2⁸ CoinMarketCap floor.",
      category: "Developer & Deploy",
      icon: Scale,
      accentColor: "#F59E0B",
      iconBg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      glowBorder: "hover:border-amber-500/60",
      stats: "2⁸ Shares • ≥2⁸ CMC"
    },
    {
      id: "quantum_analytics",
      title: "Quantum Analytics",
      badge: "D3 Heat Map & NIST SP 800-22",
      description: "Positional distribution heat map across 64-char (256-bit) entropy signatures with Shannon entropy evaluation (H→4.0 bits), NIST Monobit & Runs suites, and Chi-Square uniformity tests.",
      category: "Developer & Deploy",
      icon: Binary,
      accentColor: "#06B6D4",
      iconBg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
      glowBorder: "hover:border-cyan-500/60",
      stats: "64-Char D3 Heat Map"
    },
    {
      id: "high_volume",
      title: "1M Stream Export",
      badge: "Web Worker Pipeline",
      description: "High-throughput multi-threaded engine synthesizing and streaming up to 1,000,000 JSON tokens with memory-safe batching.",
      category: "Core Storage & Vault",
      icon: Zap,
      accentColor: "#F59E0B",
      iconBg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      glowBorder: "hover:border-amber-500/60",
      stats: "1M Stream Capable"
    },
    {
      id: "all_apps",
      title: "All Apps (75+ Chains)",
      badge: "75+ Blockchains",
      description: "Universal cross-chain marketplace orchestrator covering EVM, Solana SVM, Bitcoin, and Cosmos layer ecosystems.",
      category: "Ecosystem & Chains",
      icon: Globe,
      accentColor: "#06B6D4",
      iconBg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
      glowBorder: "hover:border-cyan-500/60",
      stats: "EVM • SVM • Cosmos"
    },
    {
      id: "genre_directory",
      title: "Web3 Genres (4-Matrix)",
      badge: "DeFi • ID • Gaming • DePIN",
      description: "Side-by-side categorical matrix with alphabetical and numerical sorting, liquidity depth curves, and batch cloud memory.",
      category: "Ecosystem & Chains",
      icon: Layers,
      accentColor: "#A855F7",
      iconBg: "bg-purple-500/10 text-purple-400 border-purple-500/30",
      glowBorder: "hover:border-purple-500/60",
      stats: "4 Specialized Hubs"
    },
    {
      id: "generator",
      title: "Token Foundry",
      badge: `${totalTokensCount} Working IDs`,
      description: "Algorithmic token synthesis engine with vanity address mining, EIP-55 checksum validation, and quantum entropy signatures.",
      category: "Core Storage & Vault",
      icon: Database,
      accentColor: "#F27D26",
      iconBg: "bg-orange-500/10 text-orange-400 border-orange-500/30",
      glowBorder: "hover:border-orange-500/60",
      stats: "Synthesizer Core"
    },
    {
      id: "art_studio",
      title: "Token Art Studio",
      badge: "100% On-Chain SVG",
      description: "Procedural vector art generation producing scalable on-chain token medallions with trait evolution and dynamic metadata.",
      category: "AI & Visual Studio",
      icon: Palette,
      accentColor: "#14B8A6",
      iconBg: "bg-teal-500/10 text-teal-400 border-teal-500/30",
      glowBorder: "hover:border-teal-500/60",
      stats: "Generative SVG"
    },
    {
      id: "crypto_architect",
      title: "Deployment & AI Invention",
      badge: "Solidity & Rust Engine",
      description: "Principal contract architecture, bytecode gas optimization, cross-chain bridge scripts, and multi-signature security.",
      category: "Developer & Deploy",
      icon: Activity,
      accentColor: "#3B82F6",
      iconBg: "bg-blue-500/10 text-blue-400 border-blue-500/30",
      glowBorder: "hover:border-blue-500/60",
      stats: "Architect Matrix"
    },
    {
      id: "genesis_launch",
      title: "Genesis Launch",
      badge: "5-Stage Pipeline",
      description: "Mainnet launchpad orchestrator with gas estimation, wallet pre-flight checks, DEX liquidity pool seeding, and verification.",
      category: "Developer & Deploy",
      icon: Rocket,
      accentColor: "#F97316",
      iconBg: "bg-orange-500/10 text-orange-400 border-orange-500/30",
      glowBorder: "hover:border-orange-500/60",
      stats: "Mainnet Pipeline"
    },
    {
      id: "simulator",
      title: "Deployment Simulator",
      badge: "Sandbox RPC",
      description: "Interactive simulated blockchain testnet environment with simulated block times, gas metrics, and transaction explorer logs.",
      category: "Developer & Deploy",
      icon: Gauge,
      accentColor: "#38BDF8",
      iconBg: "bg-sky-500/10 text-sky-400 border-sky-500/30",
      glowBorder: "hover:border-sky-500/60",
      stats: "Simulated Testnet"
    },
    {
      id: "remix",
      title: "Remix IDE & Governance",
      badge: "OZ v5 & $ADT Lifecycle",
      description: "Direct Remix IDE bridge, AdvancedToken ($ADT) lifecycle governance, OpenZeppelin v5 contract verification, Etherscan Write tab simulation, and bytecode constant max capacity.",
      category: "Developer & Deploy",
      icon: Terminal,
      accentColor: "#10B981",
      iconBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      glowBorder: "hover:border-emerald-500/60",
      stats: "Remix • $ADT Governance"
    },
    {
      id: "scripts",
      title: "Solidity Forge Hub",
      badge: "Foundry CLI & Hardhat",
      description: "Production-grade Forge DeployTokens.s.sol broadcast scripts, multi-chain CLI templates, and Solana Rust SPL stubs.",
      category: "Developer & Deploy",
      icon: Code2,
      accentColor: "#EC4899",
      iconBg: "bg-pink-500/10 text-pink-400 border-pink-500/30",
      glowBorder: "hover:border-pink-500/60",
      stats: "Solidity / Rust"
    },
    {
      id: "analytics",
      title: "Analytics & Distribution",
      badge: "Recharts Telemetry",
      description: "Real-time liquidity depth charts, market cap distribution curves, and cryptographic security score heatmaps.",
      category: "AI & Visual Studio",
      icon: BarChart3,
      accentColor: "#6366F1",
      iconBg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
      glowBorder: "hover:border-indigo-500/60",
      stats: "Market Telemetry"
    },
    {
      id: "prompts",
      title: "2026 Prompts Library",
      badge: "Prompt Engineering",
      description: "Pre-crafted generative prompts for smart contracts, cross-chain AMMs, quantum tokenomics, and AI agent frameworks.",
      category: "AI & Visual Studio",
      icon: Terminal,
      accentColor: "#8B5CF6",
      iconBg: "bg-violet-500/10 text-violet-400 border-violet-500/30",
      glowBorder: "hover:border-violet-500/60",
      stats: "AI Prompt Foundry"
    },
    {
      id: "ai_assistant",
      title: "Gemini AI Synthesizer",
      badge: "Google GenAI Studio",
      description: "Conversational tokenomics architect, whitepaper drafting copilot, and automated Solidity security audit engineer.",
      category: "AI & Visual Studio",
      icon: Sparkles,
      accentColor: "#3B82F6",
      iconBg: "bg-blue-500/10 text-blue-400 border-blue-500/30",
      glowBorder: "hover:border-blue-500/60",
      stats: "AI Prompt Foundry"
    }
  ];

  const filteredInventions = inventionFilter === "All Inventions"
    ? inventions
    : inventions.filter((inv) => inv.category === inventionFilter);

  const categories = ["All", "DeFi & Vaults", "Identity & Vanity", "DePIN & Sensors", "Gaming & SVG", "Market Sync", "Security Audit"];

  const filteredCards = selectedCategory === "All" 
    ? INTELLIGENT_PROMPT_CARDS 
    : INTELLIGENT_PROMPT_CARDS.filter((c) => c.category === selectedCategory);

  // Check scroll on horizontal reel
  const checkReelScroll = () => {
    if (reelRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = reelRef.current;
      setCanScrollReelLeft(scrollLeft > 15);
      setCanScrollReelRight(scrollLeft < scrollWidth - clientWidth - 15);
    }
  };

  useEffect(() => {
    checkReelScroll();
    const el = reelRef.current;
    if (el) {
      el.addEventListener("scroll", checkReelScroll, { passive: true });
      window.addEventListener("resize", checkReelScroll);
      return () => {
        el.removeEventListener("scroll", checkReelScroll);
        window.removeEventListener("resize", checkReelScroll);
      };
    }
  }, [layoutMode, inventionFilter]);

  const scrollReelLeft = () => {
    if (reelRef.current) {
      reelRef.current.scrollBy({ left: -340, behavior: "smooth" });
    }
  };

  const scrollReelRight = () => {
    if (reelRef.current) {
      reelRef.current.scrollBy({ left: 340, behavior: "smooth" });
    }
  };

  const handleNavigate = (tabId: NavTabId) => {
    setActiveTab(tabId);
    // Smoothly scroll down to the active module view
    setTimeout(() => {
      const target = document.getElementById("active-module-view");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 60);
  };

  const handleCopyPrompt = (text: string, cardId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCardId(cardId);
    setTimeout(() => setCopiedCardId(null), 2000);
  };

  return (
    <div id="top-fullstack-cockpit" className="bg-[#121216] rounded-xl border border-[#1F1F23] shadow-xl overflow-hidden transition-all duration-300">
      {/* Cockpit Header & Fullstack Controls */}
      <div className="p-4 bg-gradient-to-r from-[#16161A] via-[#121216] to-[#16161A] border-b border-[#1F1F23] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0A0A0C] border border-[#F27D26]/40 flex items-center justify-center shadow-[0_0_12px_rgba(242,125,38,0.25)] flex-shrink-0">
            <Workflow className="w-5 h-5 text-[#F27D26]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                FULLSTACK ACTIVE COCKPIT
              </h2>
              <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                14 Systems Active
              </span>
              <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                Firestore Synced
              </span>
            </div>
            <p className="text-[11px] text-[#8E9299]">
              Interactive launchpad for Token Vault, 1M Stream Export, 75+ Chain Apps, and AI synthesis.
            </p>
          </div>
        </div>

        {/* Live Status Indicators & Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Stats Pill */}
          <div className="flex items-center gap-2 bg-[#0A0A0C] px-3 py-1.5 rounded-lg border border-[#1F1F23] text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[#8E9299]">Vault:</span>
            <span className="text-white font-semibold">{vaultTokensCount}</span>
            <span className="text-[#1F1F23]">|</span>
            <span className="text-[#8E9299]">Working:</span>
            <span className="text-[#F27D26] font-semibold">{totalTokensCount}/{maxCapacity}</span>
          </div>

          {/* Quick 100 IDs Trigger */}
          <button
            id="btn-quick-100-cockpit"
            type="button"
            onClick={onGenerate100}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F27D26] hover:bg-[#ff8f3d] text-black font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
            title="Synthesize 100 deterministic tokens into working memory"
          >
            <Zap className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
            <span>{isGenerating ? "Synthesizing..." : "Quick 100 IDs"}</span>
          </button>

          {/* Quick 1,000 More (2^8 Reserves & Tokenomics) Trigger */}
          {onGenerate1000More && (
            <button
              id="btn-quick-1000-cockpit"
              type="button"
              onClick={onGenerate1000More}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-[#F27D26] hover:from-amber-400 hover:to-[#ff8f3d] text-black font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 active:scale-95"
              title="Synthesize 1,000 more tokens with 2^8 reserve tokenomics and verified smart contract addresses"
            >
              <Zap className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
              <span>{isGenerating ? "Synthesizing 1,000..." : "⚡ Generate 1,000 More (2⁸)"}</span>
            </button>
          )}

          {/* Validate All Tokens (Remix, Etherscan & MetaMask) Trigger */}
          {onOpenValidationModal && (
            <button
              id="btn-validate-all-contracts-cockpit-header"
              type="button"
              onClick={onOpenValidationModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A0A0C] hover:bg-[#16161A] border border-emerald-500/40 text-emerald-400 font-semibold text-xs shadow-md transition-all cursor-pointer"
              title="Verify smart contracts in Remix IDE & Etherscan.io and confirm MetaMask acceptance"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Validate All IDs</span>
            </button>
          )}

          {/* MetaMask Deployer Quick Status & Sync Trigger */}
          {onOpenMetaMaskSync && (
            <button
              id="btn-cockpit-metamask-sync"
              type="button"
              onClick={onOpenMetaMaskSync}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-medium transition-all cursor-pointer ${
                isMetaMaskConnected
                  ? "bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20"
                  : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white hover:border-[#3A3A46]"
              }`}
              title="MetaMask Deployer Address Sync Studio"
            >
              <span>🦊</span>
              <span>
                {metaMaskAccount
                  ? `Deployer: ${metaMaskAccount.slice(0, 6)}...${metaMaskAccount.slice(-4)}`
                  : "Sync MetaMask Deployer"}
              </span>
            </button>
          )}

          {/* View Mode Toggle: Sideways Reel vs Grid */}
          <div className="flex items-center bg-[#0A0A0C] p-0.5 rounded-lg border border-[#1F1F23]">
            <button
              type="button"
              onClick={() => setLayoutMode("sideways")}
              className={`p-1.5 rounded text-xs transition-all cursor-pointer flex items-center gap-1 ${
                layoutMode === "sideways"
                  ? "bg-[#1F1F23] text-[#F27D26] font-semibold shadow-sm"
                  : "text-[#8E9299] hover:text-white"
              }`}
              title="Sideways Scroll Reel View"
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden md:inline">Sideways</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode("grid")}
              className={`p-1.5 rounded text-xs transition-all cursor-pointer flex items-center gap-1 ${
                layoutMode === "grid"
                  ? "bg-[#1F1F23] text-[#F27D26] font-semibold shadow-sm"
                  : "text-[#8E9299] hover:text-white"
              }`}
              title="Expanded Grid View (Up & Down)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden md:inline">Grid</span>
            </button>
          </div>

          {/* Toggle Expand/Collapse */}
          <button
            id="btn-toggle-cockpit-expand"
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1.5 rounded-lg bg-[#0A0A0C] hover:bg-[#1F1F23] border border-[#1F1F23] text-[#8E9299] hover:text-white transition-all cursor-pointer"
            title={isExpanded ? "Collapse Cockpit" : "Expand Cockpit"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Cockpit Body */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-5">
          {/* Quick Generation Feedback Notification */}
          {quickGenNotice && (
            <div className="p-2.5 rounded-lg bg-[#16161A] border border-[#F27D26]/40 flex items-center justify-between text-xs text-[#E0E0E0] animate-fadeIn">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                <span>{quickGenNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => handleNavigate("generator")}
                className="px-2 py-0.5 rounded bg-[#F27D26] text-black font-bold text-[10px] cursor-pointer"
              >
                Inspect in Foundry →
              </button>
            </div>
          )}

          {/* Fullstack Active Cockpit: Maximize Vault Memory (100 Quadrillion / 500 Septillion / 1 Octillion Tier) & Continuous Saving */}
          <VaultMemoryCockpit
            tokens={tokens}
            vaultTokensCount={vaultTokensCount}
            onOpenValidationModal={onOpenValidationModal || (() => {})}
            maxCapacity={maxCapacity}
            onMaxCapacityChange={onMaxCapacityChange || (() => {})}
            onTokensUpdated={onTokensUpdated}
          />

          {/* Section 1: Inventions & Master Ecosystem Suite */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#F27D26]" />
                  AVAILABLE INVENTIONS & MASTER ECOSYSTEM SUITE
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F27D26]/15 text-[#F27D26] border border-[#F27D26]/30">
                    {inventions.length} Systems Ready
                  </span>
                </span>
                <p className="text-[11px] text-[#8E9299] mt-0.5">
                  Direct launchpad with high-visibility icon cards. Scroll sideways or browse the vertical grid.
                </p>
              </div>

              {/* Invention Category Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full no-scrollbar">
                {inventionCategories.map((cat) => (
                  <button
                    key={cat}
                    id={`btn-inv-cat-${cat.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                    type="button"
                    onClick={() => setInventionFilter(cat)}
                    className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap transition-all cursor-pointer font-medium ${
                      inventionFilter === cat
                        ? "bg-[#F27D26] text-black font-bold shadow-sm"
                        : "bg-[#0A0A0C] text-[#8E9299] hover:text-white border border-[#1F1F23]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* View 1: Sideways Reel Mode with Left & Right Arrow Controls */}
            {layoutMode === "sideways" ? (
              <div className="relative group/reel">
                {/* Left Scroll Arrow */}
                {canScrollReelLeft && (
                  <button
                    type="button"
                    onClick={scrollReelLeft}
                    aria-label="Scroll reel left"
                    className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-[#0A0A0C]/95 border border-[#F27D26]/40 text-white shadow-2xl hover:bg-[#F27D26] hover:text-black transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}

                {/* Horizontal Scroll Track */}
                <div
                  ref={reelRef}
                  className="flex items-stretch gap-3.5 overflow-x-auto scroll-smooth py-2 px-1 no-scrollbar"
                  style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none" }}
                >
                  {filteredInventions.map((inv) => {
                    const isActive = activeTab === inv.id;
                    const Icon = inv.icon;
                    return (
                      <div
                        key={inv.id}
                        id={`cockpit-reel-card-${inv.id}`}
                        style={{ scrollSnapAlign: "start" }}
                        className={`w-[290px] sm:w-[320px] flex-shrink-0 group relative p-4 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between ${
                          isActive
                            ? "bg-[#171722] border-[#F27D26] shadow-[0_0_18px_rgba(242,125,38,0.25)] ring-1 ring-[#F27D26]/60"
                            : "bg-[#0D0D11] border-[#1F1F23] hover:border-[#3A3A46] hover:bg-[#131318]"
                        }`}
                      >
                        {/* Top Area: Large Viewable Icon & Category Tag */}
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-md transition-transform duration-200 group-hover:scale-105 ${inv.iconBg}`}>
                              <Icon className="w-6 h-6" />
                            </div>

                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#18181E] text-[#8E9299] border border-[#26262E]">
                                {inv.category}
                              </span>
                              {isActive && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-[#F27D26] bg-[#F27D26]/10 px-2 py-0.5 rounded border border-[#F27D26]/30 animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#F27D26]" />
                                  ACTIVE
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Title & Badge */}
                          <h3 className="text-sm font-bold text-white group-hover:text-[#F27D26] transition-colors leading-snug">
                            {inv.title}
                          </h3>
                          <div className="mt-1 mb-2">
                            <span className="inline-block text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-[#16161C] text-[#A0A5AE] border border-[#22222A]">
                              {inv.badge}
                            </span>
                          </div>

                          {/* Description */}
                          <p className="text-xs text-[#8E9299] line-clamp-2 leading-relaxed">
                            {inv.description}
                          </p>
                        </div>

                        {/* Bottom Bar: Action Trigger */}
                        <div className="pt-3 mt-3 border-t border-[#1F1F23] flex items-center justify-between text-[11px] font-mono">
                          <span className="text-[#666]">{inv.stats}</span>
                          <button
                            type="button"
                            id={`btn-launch-${inv.id}`}
                            onClick={() => handleNavigate(inv.id)}
                            className={`font-semibold transition-all px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer ${
                              isActive
                                ? "bg-[#F27D26] text-black font-bold shadow-sm"
                                : "bg-[#181820] text-[#E0E0E0] hover:text-[#F27D26] hover:bg-[#20202A] border border-[#262630]"
                            }`}
                          >
                            <span>{isActive ? "Viewing Below ↓" : "Open Page →"}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right Scroll Arrow */}
                {canScrollReelRight && (
                  <button
                    type="button"
                    onClick={scrollReelRight}
                    aria-label="Scroll reel right"
                    className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-[#0A0A0C]/95 border border-[#F27D26]/40 text-white shadow-2xl hover:bg-[#F27D26] hover:text-black transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>
            ) : (
              /* View 2: Structured Multi-Column Grid (Up & Down Scroll) */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {filteredInventions.map((inv) => {
                  const isActive = activeTab === inv.id;
                  const Icon = inv.icon;
                  return (
                    <button
                      key={inv.id}
                      id={`cockpit-grid-card-${inv.id}`}
                      type="button"
                      onClick={() => handleNavigate(inv.id)}
                      className={`group relative p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                        isActive
                          ? "bg-[#171722] border-[#F27D26] shadow-[0_0_16px_rgba(242,125,38,0.22)] ring-1 ring-[#F27D26]/60"
                          : "bg-[#0D0D11] border-[#1F1F23] hover:border-[#33333D] hover:bg-[#131318]"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-md transition-transform duration-200 group-hover:scale-105 ${inv.iconBg}`}>
                            <Icon className="w-6 h-6" />
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#18181E] text-[#8E9299] border border-[#26262E]">
                              {inv.category}
                            </span>
                            {isActive ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-[#F27D26] bg-[#F27D26]/10 px-2 py-0.5 rounded border border-[#F27D26]/30 animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#F27D26]" />
                                ACTIVE NOW
                              </span>
                            ) : (
                              <span className="text-[#8E9299] group-hover:text-white transition-colors p-1">
                                <ArrowUpRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                              </span>
                            )}
                          </div>
                        </div>

                        <h3 className="text-sm font-bold text-white group-hover:text-[#F27D26] transition-colors leading-snug">
                          {inv.title}
                        </h3>
                        <div className="mt-1 mb-2">
                          <span className="inline-block text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-[#16161C] text-[#A0A5AE] border border-[#22222A]">
                            {inv.badge}
                          </span>
                        </div>

                        <p className="text-xs text-[#8E9299] line-clamp-2 leading-relaxed">
                          {inv.description}
                        </p>
                      </div>

                      <div className="pt-3 mt-3 border-t border-[#1F1F23] flex items-center justify-between text-[11px] font-mono">
                        <span className="text-[#666]">{inv.stats}</span>
                        <span className={`font-semibold transition-colors flex items-center gap-1 ${isActive ? "text-[#F27D26]" : "text-[#8E9299] group-hover:text-white"}`}>
                          {isActive ? "Viewing Below ↓" : "Launch Module →"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Intelligent Prompt Generator Cards Matrix */}
          <div className="space-y-3 pt-3 border-t border-[#1F1F23]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  INTELLIGENT PROMPT CARDS FOUNDRY
                  <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    6 Automated Pipelines
                  </span>
                </h3>
                <p className="text-[11px] text-[#8E9299]">
                  One-click generation into the Foundry, or seamless dispatch to the AI Synthesizer.
                </p>
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full no-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    id={`btn-prompt-cat-${cat.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all whitespace-nowrap cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-[#F27D26] text-black font-bold"
                        : "bg-[#0A0A0C] text-[#8E9299] hover:text-white border border-[#1F1F23]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredCards.map((card) => (
                <div
                  key={card.id}
                  id={`prompt-card-${card.id}`}
                  className="bg-[#0A0A0C] rounded-lg border border-[#1F1F23] hover:border-[#2E2E35] p-3.5 flex flex-col justify-between transition-all space-y-3 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${card.badgeBg} ${card.badgeBorder} ${card.badgeText}`}>
                        {card.category}
                      </span>
                      <span className="text-[10px] text-green-400 font-mono">
                        {card.parameters.security}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-[#E0E0E0] group-hover:text-white transition-colors">
                      {card.title}
                    </h4>

                    <p className="text-[11px] text-[#8E9299] leading-relaxed line-clamp-2">
                      {card.description}
                    </p>

                    <div className="grid grid-cols-2 gap-1.5 pt-1 font-mono text-[10px]">
                      <div className="bg-[#141418] px-2 py-1 rounded border border-[#1F1F23] text-[#8E9299]">
                        <span className="text-gray-400">Chain:</span> <span className="text-white">{card.parameters.chain}</span>
                      </div>
                      <div className="bg-[#141418] px-2 py-1 rounded border border-[#1F1F23] text-[#8E9299]">
                        <span className="text-gray-400">Type:</span> <span className="text-cyan-300">{card.parameters.standard}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bottom Bar */}
                  <div className="pt-2 border-t border-[#1F1F23] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      id={`btn-copy-prompt-${card.id}`}
                      onClick={() => handleCopyPrompt(card.promptTemplate, card.id)}
                      className="p-1.5 rounded bg-[#16161A] hover:bg-[#1F1F23] border border-[#1F1F23] text-[#8E9299] hover:text-white text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                      title="Copy Full Prompt"
                    >
                      {copiedCardId === card.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-400" />
                          <span className="text-green-400 text-[10px]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Copy</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        id={`btn-quick-gen-${card.id}`}
                        onClick={() => {
                          onQuickGenerate(
                            {
                              narratives: [card.parameters.narrative as any],
                              count: 25,
                            },
                            card.promptTemplate
                          );
                          setQuickGenNotice(`Synthesized 25 tokens with ${card.title} configuration & prompt into Vault.`);
                          setTimeout(() => setQuickGenNotice(null), 4500);
                        }}
                        className="px-2 py-1 rounded bg-[#16161A] hover:bg-[#1F1F23] border border-[#1F1F23] text-[#F27D26] hover:text-orange-300 text-[10px] font-mono cursor-pointer transition-colors"
                        title="Generate 25 Tokens with this configuration"
                      >
                        +25 IDs
                      </button>

                      <button
                        type="button"
                        id={`btn-build-ai-${card.id}`}
                        onClick={() => {
                          onUsePromptInAI(card.promptTemplate);
                          handleNavigate("ai_assistant");
                        }}
                        className="px-2.5 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                        title="Open in AI Assistant with this prompt preloaded"
                      >
                        <span>Build in AI</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
