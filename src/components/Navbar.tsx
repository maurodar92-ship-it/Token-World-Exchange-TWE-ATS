import React, { useRef, useState, useEffect } from "react";
import { 
  Shield, 
  Sparkles, 
  Terminal, 
  Database, 
  Code2, 
  Zap, 
  Layers, 
  Activity, 
  BarChart3, 
  Moon, 
  Sun, 
  Rocket, 
  Palette, 
  Gauge, 
  Globe,
  Coins,
  Scale,
  Binary,
  Key,
  Landmark,
  Cpu,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  ArrowDownUp,
  Wallet,
  DollarSign,
  Calendar,
  Waves,
  Music,
  Maximize2,
  Minimize2,
  Languages,
  ShieldAlert,
  ShieldCheck,
  Mail,
  Crown,
  Percent,
  Monitor,
} from "lucide-react";
import { ThemeMode } from "../utils/theme";
import { harmonicsAudioEngine } from "../utils/harmonicsAudioEngine";
import { isFullscreenActive, toggleFullscreen, subscribeToFullscreen } from "../utils/worldConnectivity";
import { useLanguage } from "../utils/languageContext";

export type NavTabId = 
  | "enterprise_showroom"
  | "generator" 
  | "discount_center"
  | "membership_tiers"
  | "twe_ats_terminal"
  | "unified_auth_gateway"
  | "live_market_uniswap_binance"
  | "production_deployment"
  | "advanced_trading_terminal"
  | "regulatory_compliance"
  | "sec_monitor"
  | "maximum_security"
  | "workspace_hub"
  | "solidity_compiler"
  | "security_threat_scanner"
  | "weekly_tree3_update"
  | "institutional_sandbox"
  | "ats_nyse_exchange"
  | "enterprise_exchange"
  | "risk_analytics"
  | "multi_modal_vision"
  | "harmonics_studio"
  | "monetization"
  | "wallet_portfolio"
  | "global_exchange"
  | "customer_liquidity_exchange"
  | "token_vault" 
  | "public_registry"
  | "tokenomics_engine"
  | "liquidity_pools"
  | "high_volume" 
  | "all_apps" 
  | "genre_directory" 
  | "art_studio" 
  | "crypto_architect" 
  | "genesis_launch" 
  | "simulator" 
  | "remix" 
  | "scripts" 
  | "analytics" 
  | "quantum_analytics"
  | "prompts" 
  | "key_enclave_bridge"
  | "ai_assistant";

interface NavbarProps {
  activeTab: NavTabId;
  setActiveTab: (tab: NavTabId) => void;
  totalTokensCount: number;
  vaultTokensCount?: number;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
  metaMaskAccount?: string | null;
  isMetaMaskConnected?: boolean;
  onOpenMetaMaskSync?: () => void;
  onOpenUniversalWallet?: () => void;
  onOpenMarketDeploy?: () => void;
  onOpenGlobalSwapSell?: (token?: any, mode?: "swap" | "sell") => void;
  onOpenProModal?: () => void;
  onOpenWorldConnectivity?: () => void;
  onOpenAuthGateway?: () => void;
  onOpenMembershipPortal?: () => void;
  onOpenDiscountCenter?: () => void;
}

export const NAV_ITEMS: {
  id: NavTabId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  tag?: string;
  tagColor?: string;
}[] = [
  { id: "enterprise_showroom", label: "🏛️ Enterprise Showroom (Desktop•Tablet•Mobile)", shortLabel: "Showroom", icon: Monitor, tag: "Cross-Device Sync", tagColor: "bg-gradient-to-r from-amber-500/20 to-emerald-500/20 text-amber-300 border-amber-500/40" },
  { id: "generator", label: "Token Foundry", shortLabel: "Foundry", icon: Database },
  { id: "discount_center", label: "🏷️ ATS Discount Center & Fee Rebates", shortLabel: "Discount Center", icon: Percent, tag: "75% Rebate", tagColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  { id: "membership_tiers", label: "👑 TWE ATS Membership Tiers (Free•Elite•VIP)", shortLabel: "Membership Tiers", icon: Crown, tag: "Subscriptions & Passes", tagColor: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  { id: "twe_ats_terminal", label: "🏛️ Token World Exchange ATS® (TWE) Terminal", shortLabel: "TWE ATS® Terminal", icon: Terminal, tag: "uint256•18-Dec", tagColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  { id: "unified_auth_gateway", label: "🔐 Unified Auth Gateway (TWE SSO & TOTP)", shortLabel: "Auth Gateway", icon: Key, tag: "OAuth 2.0", tagColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  { id: "live_market_uniswap_binance", label: "🟡 Live Market: Uniswap AMM & Binance CEX", shortLabel: "Live Market (Uni•Binance)", icon: ArrowDownUp, tag: "DEX & CEX Live", tagColor: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  { id: "production_deployment", label: "🚀 Production Deployment & Export Hub", shortLabel: "Deploy & Export", icon: Rocket, tag: "5-Pillar Live", tagColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" },
  { id: "advanced_trading_terminal", label: "⚡ Advanced Trading & Order Book", shortLabel: "Trading Book", icon: Activity, tag: "Limit•Stop•OCO", tagColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  { id: "regulatory_compliance", label: "📜 Regulatory & SEC Compliance", shortLabel: "Compliance", icon: Scale, tag: "KYC•AML•15c3-5", tagColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" },
  { id: "sec_monitor", label: "🏛️ SEC EDGAR Monitor", shortLabel: "SEC Monitor", icon: Landmark, tag: "10-K•10-Q•8-K", tagColor: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  { id: "maximum_security", label: "🛡️ Maximum Security Lifecycle", shortLabel: "Max Security", icon: ShieldCheck, tag: "Zero Trust • WORM", tagColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  { id: "workspace_hub", label: "📧 Google Workspace (Gmail & Keep) & Futures", shortLabel: "Workspace & Futures", icon: Mail, tag: "Gmail•Keep•Futures", tagColor: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  { id: "solidity_compiler", label: "⚡ Solidity Compiler & Full-Stack Web3", shortLabel: "Web3 Full-Stack", icon: Code2, tag: "Full-Stack Web3", tagColor: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
  { id: "security_threat_scanner", label: "🛡️ Security Threat Scanner", shortLabel: "Threat Scanner", icon: ShieldAlert, tag: "Heuristic AI", tagColor: "bg-rose-500/20 text-rose-300 border-rose-500/30" },
  { id: "weekly_tree3_update", label: "🌳³ Weekly TREE3 Update", shortLabel: "TREE3 Weekly", icon: Calendar, tag: "Every Monday", tagColor: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  { id: "institutional_sandbox", label: "🏛️ Institutional Sandbox (TW-DEMO)", shortLabel: "Sandbox", icon: Shield, tag: "TW-DEMO", tagColor: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  { id: "ats_nyse_exchange", label: "🏛️ Token World Exchange (TWE) ATS® & NYSE", shortLabel: "TWE ATS® & NYSE", icon: Landmark, tag: "FINRA ATS", tagColor: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  { id: "enterprise_exchange", label: "🏢 Token World Exchange (TWE) ATS® (Java•FastAPI•Kotlin)", shortLabel: "Enterprise TWE ATS®", icon: Cpu, tag: "Fortune 500/1000", tagColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" },
  { id: "risk_analytics", label: "📊 Risk Analytics Panel (Volatility & Security)", shortLabel: "Risk Analytics", icon: ShieldAlert, tag: "VaR & Audit", tagColor: "bg-rose-500/20 text-rose-300 border-rose-500/30" },
  { id: "multi_modal_vision", label: "✨ AI Vision & Music Hub", shortLabel: "AI Vision & Music", icon: Sparkles, tag: "Lyria & Veo", tagColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" },
  { id: "harmonics_studio", label: "🎵 Solfeggio & Fibonacci Tunes", shortLabel: "Harmonics & Hz", icon: Waves, tag: "Solfeggio & Φ", tagColor: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  { id: "monetization", label: "💰 Earn & Revenue Hub", shortLabel: "💰 Earn", icon: DollarSign, tag: "Revenue Engine", tagColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  { id: "wallet_portfolio", label: "Wallet Portfolio (MetaMask)", shortLabel: "Portfolio", icon: Wallet, tag: "MetaMask Sync", tagColor: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  { id: "global_exchange", label: "Universal Token Swap (52 Ex.)", shortLabel: "Universal Swap", icon: ArrowDownUp, tag: "Treasury 0x70Ac", tagColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" },
  { id: "public_registry", label: "Public Contract Registry", shortLabel: "Public Registry", icon: Globe, tag: "EVM Explorers", tagColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" },
  { id: "token_vault", label: "Token Vault", shortLabel: "Vault", icon: Shield, tag: "Cloud", tagColor: "bg-green-500/20 text-green-300 border-green-500/30" },
  { id: "tokenomics_engine", label: "2⁸ Tokenomics", shortLabel: "2⁸ Tokenomics", icon: Scale, tag: "2⁸", tagColor: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  { id: "quantum_analytics", label: "Quantum Analytics", shortLabel: "Quantum D3", icon: Binary, tag: "D3 Heat Map", tagColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" },
  { id: "liquidity_pools", label: "509 Liquidity Pools", shortLabel: "509 Pools", icon: Coins, tag: "509 Pairs", tagColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  { id: "high_volume", label: "Stream Exporter & Artifacts", shortLabel: "Stream & Artifacts", icon: Zap, tag: "5 Artifacts", tagColor: "bg-green-500/20 text-green-300 border-green-500/30" },
  { id: "all_apps", label: "All Apps (75+ Chains)", shortLabel: "75+ Chains", icon: Globe, tag: "EVM•SVM", tagColor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  { id: "genre_directory", label: "Web3 Genres", shortLabel: "Genres", icon: Layers, tag: "4-Matrix", tagColor: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  { id: "art_studio", label: "Crypto Art Studio", shortLabel: "Art Studio", icon: Palette, tag: "SVG", tagColor: "bg-teal-500/20 text-teal-300 border-teal-500/30" },
  { id: "crypto_architect", label: "Deployment & AI Invention", shortLabel: "Architect", icon: Activity },
  { id: "genesis_launch", label: "Genesis Automator", shortLabel: "Genesis", icon: Rocket },
  { id: "simulator", label: "Deployment Simulator", shortLabel: "Simulator", icon: Gauge },
  { id: "remix", label: "Remix 2.5.4 Studio", shortLabel: "Remix", icon: Code2, tag: "EVM", tagColor: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
  { id: "scripts", label: "Script Hub", shortLabel: "Scripts", icon: Terminal },
  { id: "analytics", label: "Recharts Analytics", shortLabel: "Analytics", icon: BarChart3 },
  { id: "prompts", label: "2026 Prompts", shortLabel: "Prompts", icon: Terminal },
  { id: "key_enclave_bridge", label: "🔐 Key Management & Secure Enclaves", shortLabel: "Enclave Bridge", icon: Key, tag: "Web3 Bridge", tagColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" },
  { id: "ai_assistant", label: "AI Synthesizer", shortLabel: "AI Agent", icon: Sparkles },
];

export const Navbar: React.FC<NavbarProps> = ({ 
  activeTab, 
  setActiveTab, 
  totalTokensCount,
  vaultTokensCount = 0,
  theme = "dark",
  onToggleTheme,
  metaMaskAccount,
  isMetaMaskConnected,
  onOpenMetaMaskSync,
  onOpenUniversalWallet,
  onOpenMarketDeploy,
  onOpenGlobalSwapSell,
  onOpenProModal,
  onOpenWorldConnectivity,
  onOpenAuthGateway,
  onOpenMembershipPortal,
  onOpenDiscountCenter,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [harmonicsState, setHarmonicsState] = useState(harmonicsAudioEngine.getState());
  const { currentLanguage, languageConfig } = useLanguage();
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    setIsFullscreen(isFullscreenActive());
    return subscribeToFullscreen((active) => {
      setIsFullscreen(active);
    });
  }, []);

  useEffect(() => {
    return harmonicsAudioEngine.subscribe((s) => {
      setHarmonicsState(s);
    });
  }, []);

  // Check scroll positions to show/hide scroll arrows
  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const el = scrollContainerRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll, { passive: true });
      window.addEventListener("resize", checkScroll);
      return () => {
        el.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }
  }, []);

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -260, behavior: "smooth" });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 260, behavior: "smooth" });
    }
  };

  const handleTabClick = (tabId: NavTabId) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
    
    // Smoothly scroll to active module view if user is already browsing
    setTimeout(() => {
      const target = document.getElementById("active-module-view");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  };

  return (
    <header className="border-b border-[#1F1F23] bg-[#0A0A0C]/95 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Brand Logo & Title */}
          <button 
            type="button"
            onClick={() => handleTabClick("generator")}
            className="flex items-center gap-2.5 text-left cursor-pointer group flex-shrink-0"
            title="Return to Main Foundry"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1C1C28] to-[#0D0D12] border border-amber-500/50 p-0.5 group-hover:border-[#F27D26] shadow-[0_0_15px_rgba(242,125,38,0.35)] group-hover:shadow-[0_0_20px_rgba(242,125,38,0.6)] flex items-center justify-center transition-all flex-shrink-0">
              <img
                src="/assets/aistudio/IMG_20261026_022436_ab42bf11.jpg"
                alt="Token World Exchange ATS®"
                className="w-full h-full object-contain rounded-lg group-hover:scale-105 transition-transform"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/twe_logo.jpg";
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-[#F27D26]">
                  Token World Exchange (TWE) ATS®
                </span>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Sole Owner/ Creator: Mauro Lomibao Dar III®
                </span>
              </div>
              <p className="text-[10px] text-[#8E9299] font-mono hidden md:block">
                Token World Exchange (TWE) ATS® · Sole Owner/ Creator: Mauro Lomibao Dar III®
              </p>
            </div>
          </button>

          {/* Sideways Scrollable Navigation Bar with Arrow Controls */}
          <div className="relative flex-1 max-w-4xl mx-2 hidden sm:flex items-center">
            {/* Left Scroll Arrow */}
            {canScrollLeft && (
              <button
                type="button"
                onClick={handleScrollLeft}
                aria-label="Scroll navigation left"
                className="absolute left-0 z-10 p-1.5 rounded-full bg-[#0A0A0C] border border-[#1F1F23] text-[#8E9299] hover:text-white shadow-lg hover:bg-[#16161A] transition-all cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-[#F27D26]" />
              </button>
            )}

            {/* Scroll Container */}
            <div
              ref={scrollContainerRef}
              className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-1 px-2 w-full"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {NAV_ITEMS.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    id={`nav-tab-${item.id}`}
                    type="button"
                    onClick={() => handleTabClick(item.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer flex-shrink-0 ${
                      isActive
                        ? "bg-[#181820] text-[#F27D26] border border-[#F27D26] shadow-sm font-bold"
                        : "bg-[#121216] text-[#8E9299] hover:text-white hover:bg-[#1A1A22] border border-[#1F1F23]"
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-[#F27D26]" : "bg-[#555]"}`} />
                    <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#F27D26]" : "text-gray-400"}`} />
                    <span>{item.label}</span>
                    {item.id === "generator" && totalTokensCount > 0 && (
                      <span className="text-[10px] bg-[#1F1F23] text-gray-300 px-1 py-0.2 rounded font-mono">
                        {totalTokensCount >= 1000 ? `${(totalTokensCount / 1000).toFixed(0)}k` : totalTokensCount}
                      </span>
                    )}
                    {item.id === "token_vault" && (
                      <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.2 rounded font-mono border border-green-500/30">
                        {vaultTokensCount > 0 ? vaultTokensCount.toLocaleString() : "Cloud"}
                      </span>
                    )}
                    {item.tag && item.id !== "token_vault" && (
                      <span className={`text-[9px] px-1 py-0.2 rounded font-mono border ${item.tagColor}`}>
                        {item.tag}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right Scroll Arrow */}
            {canScrollRight && (
              <button
                type="button"
                onClick={handleScrollRight}
                aria-label="Scroll navigation right"
                className="absolute right-0 z-10 p-1.5 rounded-full bg-[#0A0A0C] border border-[#1F1F23] text-[#8E9299] hover:text-white shadow-lg hover:bg-[#16161A] transition-all cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5 text-[#F27D26]" />
              </button>
            )}
          </div>

          {/* Right Controls: Quick Mobile Menu & Theme Toggle */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Quick Mobile / Small Screen Menu Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label="Open all pages list"
              className="sm:hidden p-2 rounded-lg bg-[#16161A] border border-[#1F1F23] text-[#8E9299] hover:text-white cursor-pointer"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4 text-[#F27D26]" /> : <Menu className="w-4 h-4" />}
            </button>

            {/* Live Operational Badge */}
            <div className="hidden xl:flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[#16161A] border border-[#1F1F23] text-xs text-[#E0E0E0]">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-[#8E9299] uppercase font-mono">Status:</span>
              <span className="text-[10px] font-mono text-green-400 font-semibold">Live Mainnet</span>
            </div>

            {/* Wallet Portfolio View Quick CTA */}
            <button
              id="btn-navbar-portfolio"
              type="button"
              onClick={() => handleTabClick("wallet_portfolio")}
              title="Open Wallet Portfolio View synced with MetaMask"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold transition-all cursor-pointer shadow-sm active:scale-95 ${
                activeTab === "wallet_portfolio"
                  ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                  : "bg-[#16161A] hover:bg-[#1E1E24] border-[#1F1F23] hover:border-amber-500/40 text-[#E0E0E0]"
              }`}
            >
              <Wallet className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Portfolio</span>
            </button>

            {/* MetaMask Sync Deployer Button */}
            {onOpenMetaMaskSync && (
              <button
                id="btn-navbar-metamask"
                type="button"
                onClick={onOpenMetaMaskSync}
                title={
                  isMetaMaskConnected && metaMaskAccount
                    ? `MetaMask Synced Deployer: ${metaMaskAccount}`
                    : metaMaskAccount
                    ? `Active Foundry Deployer: ${metaMaskAccount}`
                    : "Connect MetaMask as Sovereign Deployer"
                }
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer shadow-sm active:scale-98 ${
                  isMetaMaskConnected
                    ? "bg-emerald-950/30 hover:bg-emerald-900/40 border-emerald-500/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                    : "bg-[#181822] hover:bg-[#22222E] border-amber-500/40 hover:border-amber-400 text-amber-300"
                }`}
              >
                <span className="text-sm select-none">🦊</span>
                <span className="text-[11px] font-semibold hidden md:inline">
                  {isMetaMaskConnected && metaMaskAccount
                    ? `${metaMaskAccount.slice(0, 6)}...${metaMaskAccount.slice(-4)} (Secured 🛡️)`
                    : "Enable MetaMask (Secured)"}
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isMetaMaskConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                  }`}
                  title={isMetaMaskConnected ? "MetaMask Extension Connected & Secured" : "Ready to Connect MetaMask Extension"}
                />
              </button>
            )}

            {/* Universal Web3 Multi-Wallet Extension Button (MetaMask, Coinbase, Trust, Rabby + Drainer Sentinel) */}
            {onOpenUniversalWallet && (
              <button
                id="btn-navbar-universal-wallet"
                type="button"
                onClick={onOpenUniversalWallet}
                title="Universal Web3 Extension: MetaMask, Coinbase, Trust, Rabby & Real-time Anti-Drainer Sentinel"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer shadow-sm active:scale-98 bg-[#181824] hover:bg-[#222232] border-[#2A2A3E] hover:border-amber-500/50 text-slate-200"
              >
                <span className="flex items-center -space-x-1 text-sm select-none">
                  <span>🦊</span>
                  <span>🔵</span>
                  <span>🛡️</span>
                  <span>🐰</span>
                </span>
                <span className="text-[11px] font-bold hidden xl:inline text-amber-300">
                  Extension
                </span>
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              </button>
            )}

            {/* Universal Swap & Sell (52 Exchanges) Quick CTA */}
            <button
              id="btn-navbar-swap-sell"
              type="button"
              onClick={() => {
                if (onOpenGlobalSwapSell) {
                  onOpenGlobalSwapSell(undefined, "swap");
                } else {
                  handleTabClick("global_exchange");
                }
              }}
              title="Universal Swap & Sell connected to 52 World Exchanges (Uniswap, Binance, Coinbase, etc.)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold transition-all cursor-pointer shadow-md shadow-cyan-950/40 active:scale-95"
            >
              <ArrowDownUp className="w-3.5 h-3.5 text-white animate-pulse" />
              <span className="hidden sm:inline">Swap &amp; Sell</span>
              <span className="sm:hidden">Swap</span>
            </button>

            {/* Enterprise Multi-Device Showroom CTA */}
            <button
              id="btn-navbar-enterprise-showroom"
              type="button"
              onClick={() => handleTabClick("enterprise_showroom")}
              title="Enterprise Multi-Device Showroom: Desktop, Tablet Pro, Mobile Native, and Live Side-by-Side Sync"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer shadow-md active:scale-95 ${
                activeTab === "enterprise_showroom"
                  ? "bg-gradient-to-r from-amber-500/40 via-emerald-500/40 to-indigo-500/40 border-amber-400 text-amber-200 ring-1 ring-amber-400"
                  : "bg-slate-900 hover:bg-slate-800 border-amber-500/50 text-amber-300 shadow-amber-950/40"
              }`}
            >
              <Monitor className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="hidden sm:inline">Showroom</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1 rounded">Sync</span>
            </button>

            {/* Earn Money / Owner Revenue Hub & Pro VIP Upgrade CTA */}
            <button
              id="btn-navbar-earn-pro"
              type="button"
              onClick={() => {
                setActiveTab("monetization");
              }}
              title="Monetization Command Center: Collect DEX swap fees, deploy royalties, and Pro subscriptions"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-mono text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-950/40 active:scale-95 border border-emerald-400/30"
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-200 animate-pulse" />
              <span className="hidden sm:inline">Earn / Pro VIP</span>
              <span className="sm:hidden">Earn $</span>
            </button>

            {/* ATS Membership Tiers (Free, Elite, VIP Full Access) */}
            <button
              id="btn-navbar-membership-tiers"
              type="button"
              onClick={() => {
                if (onOpenMembershipPortal) {
                  onOpenMembershipPortal();
                } else {
                  handleTabClick("membership_tiers");
                }
              }}
              title="TWE ATS Membership Tiers: Free Access, Elite Member ($99/mo), and VIP Full Access ($299/mo or Lifetime)"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer shadow-md active:scale-95 ${
                activeTab === "membership_tiers"
                  ? "bg-amber-500/30 border-amber-400 text-amber-300 ring-1 ring-amber-400"
                  : "bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 hover:bg-slate-800 border-amber-500/40 text-amber-300 shadow-amber-950/40"
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Membership Tiers</span>
              <span className="sm:hidden">Tiers</span>
            </button>

            {/* ATS Discount Center & Fee Rebates (Up to 75% Off & Token Discounts) */}
            <button
              id="btn-navbar-discount-center"
              type="button"
              onClick={() => {
                if (onOpenDiscountCenter) {
                  onOpenDiscountCenter();
                } else {
                  handleTabClick("discount_center");
                }
              }}
              title="ATS Discount Center: Maker/Taker fee rebates, TWE OTC token discounts, and partner API credits"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer shadow-md active:scale-95 ${
                activeTab === "discount_center"
                  ? "bg-emerald-500/30 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400"
                  : "bg-emerald-950/30 hover:bg-emerald-900/40 border-emerald-500/40 text-emerald-300"
              }`}
            >
              <Percent className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Discount Center</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1 rounded">75% Off</span>
            </button>

            {/* Deploy All to Blockchain Market Quick CTA */}
            {onOpenMarketDeploy && (
              <button
                id="btn-navbar-market-deploy"
                type="button"
                onClick={onOpenMarketDeploy}
                title="Deploy All Token Inventions to Blockchain Market (DEX AMM Pairs)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-mono text-xs font-bold transition-all cursor-pointer shadow-md shadow-orange-950/40 active:scale-95"
              >
                <Rocket className="w-3.5 h-3.5 text-white animate-pulse" />
                <span className="hidden sm:inline">Deploy All to Market</span>
                <span className="sm:hidden">Market</span>
              </button>
            )}

            {/* Solfeggio & Fibonacci Harmonics Quick CTA */}
            <button
              id="btn-navbar-harmonics-quick"
              type="button"
              onClick={() => handleTabClick("harmonics_studio")}
              title={
                harmonicsState.isPlaying
                  ? `Playing: ${harmonicsState.activeFrequency} Hz (${harmonicsState.activeLabel}). Click to open Harmonics Studio.`
                  : "Solfeggio & Fibonacci Tunes (528 Hz, 432 Hz, Φ Golden Ratio)"
              }
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono font-semibold transition-all cursor-pointer shadow-sm active:scale-95 ${
                activeTab === "harmonics_studio"
                  ? "bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-purple-900/30"
                  : harmonicsState.isPlaying
                  ? "bg-[#181824] border-purple-500/50 text-purple-300 ring-1 ring-purple-500/30"
                  : "bg-[#16161A] hover:bg-[#1E1E24] border-[#1F1F23] hover:border-purple-500/40 text-[#E0E0E0]"
              }`}
            >
              <Waves className={`w-3.5 h-3.5 text-purple-400 ${harmonicsState.isPlaying ? "animate-pulse" : ""}`} />
              <span className="hidden xl:inline">
                {harmonicsState.isPlaying ? `${harmonicsState.activeFrequency} Hz` : "Harmonics"}
              </span>
              {harmonicsState.isPlaying && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>

            {/* Unified Auth Gateway Modal Quick Action */}
            {onOpenAuthGateway && (
              <button
                id="btn-navbar-auth-gateway"
                type="button"
                onClick={onOpenAuthGateway}
                title="Unified Auth Gateway: Member SSO, Social OAuth 2.0 & Admin 2FA TOTP"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 text-xs font-mono text-emerald-300 transition-all cursor-pointer shadow-sm active:scale-95 group"
              >
                <Key className="w-3.5 h-3.5 text-emerald-400 group-hover:rotate-45 transition-transform" />
                <span className="hidden lg:inline text-[11px] font-bold">ATS Auth</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </button>
            )}

            {/* World Wide Web Connectivity & Core Languages */}
            {onOpenWorldConnectivity && (
              <button
                id="btn-navbar-world-connectivity"
                type="button"
                onClick={onOpenWorldConnectivity}
                title="Live World Wide Web Connectivity: 8 Global Nodes, Real-Time Pings & 10 Core Languages"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#16161A] hover:bg-[#1E1E24] border border-[#1F1F23] hover:border-cyan-500/50 text-xs font-mono text-[#E0E0E0] transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Globe className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: "20s" }} />
                <span className="hidden lg:inline text-[11px] font-bold text-cyan-300">
                  {languageConfig.flag} {languageConfig.code.toUpperCase()}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </button>
            )}

            {/* Full Screen Toggle Button */}
            <button
              id="btn-navbar-fullscreen"
              type="button"
              onClick={() => toggleFullscreen()}
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen (Optimized for Any Device)"}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer shadow-sm active:scale-95 ${
                isFullscreen
                  ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                  : "bg-[#16161A] hover:bg-[#1E1E24] border-[#1F1F23] hover:border-cyan-500/40 text-[#E0E0E0]"
              }`}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden xl:inline text-[11px]">Exit Screen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden xl:inline text-[11px]">Full Screen</span>
                </>
              )}
            </button>

            {/* Theme Preference Toggle */}
            {onToggleTheme && (
              <button
                id="btn-theme-toggle"
                type="button"
                onClick={onToggleTheme}
                title={theme === "dark" ? "Switch to High-Contrast Light Mode" : "Switch to Sophisticated Dark Mode"}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#16161A] hover:bg-[#1E1E24] border border-[#1F1F23] text-xs transition-all cursor-pointer shadow-sm group"
                aria-label={`Current theme: ${theme}. Click to switch theme.`}
              >
                {theme === "dark" ? (
                  <>
                    <Moon className="w-3.5 h-3.5 text-[#F27D26] group-hover:rotate-12 transition-transform" />
                    <span className="font-mono text-[11px] text-[#E0E0E0] hidden md:inline">Dark</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-500 group-hover:rotate-45 transition-transform" />
                    <span className="font-mono text-[11px] text-[#0F172A] font-semibold hidden md:inline">Light</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Dropdown Menu for Small Screens */}
        {isMobileMenuOpen && (
          <div className="sm:hidden border-t border-[#1F1F23] py-3 space-y-1 max-h-[70vh] overflow-y-auto">
            <div className="px-2 py-1 text-[10px] font-bold uppercase text-[#8E9299] font-mono">
              Jump to Page ({NAV_ITEMS.length} Inventions)
            </div>
            <div className="grid grid-cols-2 gap-1.5 p-1">
              {NAV_ITEMS.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTabClick(item.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium text-left cursor-pointer transition-all ${
                      isActive
                        ? "bg-[#181820] text-[#F27D26] border border-[#F27D26] font-bold"
                        : "bg-[#121216] text-[#A0A5AE] hover:text-white border border-[#1F1F23]"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#F27D26]" : "text-gray-400"}`} />
                    <span className="truncate">{item.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
