import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  Command,
  Zap,
  Sparkles,
  TrendingUp,
  Archive,
  Wallet,
  ArrowRightLeft,
  Rocket,
  ShieldCheck,
  Crown,
  Percent,
  Waves,
  Sun,
  Moon,
  Folder,
  Lock,
  Unlock,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  X,
  RefreshCw,
  Globe,
  Terminal,
} from "lucide-react";
import { NavTabId } from "../Navbar";
import {
  ENTERPRISE_FOLDERS,
  EnterpriseFolderDefinition,
  EnterpriseModuleItem,
} from "../../data/enterpriseFolders";
import { MembershipTier } from "../../types/membership";
import { harmonicsAudioEngine } from "../../utils/harmonicsAudioEngine";

export interface CommandPaletteAction {
  id: string;
  title: string;
  subtitle: string;
  category: "quick_action" | "navigation" | "vault_security" | "utility";
  categoryLabel: string;
  keywords: string[];
  shortcut?: string;
  badge?: string;
  requiredTier?: MembershipTier;
  isExecutiveVault?: boolean;
  icon: React.ReactNode;
  onExecute: () => void;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: NavTabId;
  onSelectModule: (folder: EnterpriseFolderDefinition, mod: EnterpriseModuleItem) => void;
  onDirectNavigateTab: (tab: NavTabId, unlockVaultIfNeeded?: boolean) => void;
  totalTokensCount: number;
  vaultTokensCount: number;
  isGenerating?: boolean;
  onGenerate100?: () => void;
  onGenerate1000More?: () => void;
  onGenerateSolanaTokens?: () => void;
  onSyncAllToDeployer?: () => void;
  onOpenMarketDeploy?: () => void;
  onOpenUniversalWallet: () => void;
  onOpenMetaMaskSync: () => void;
  onOpenWorldConnectivity: () => void;
  onOpenSendReceive: (mode: "send" | "receive") => void;
  onOpenSwap: () => void;
  onOpenDiscountCenter: () => void;
  onOpenMembershipPortal: () => void;
  onToggleTheme?: () => void;
  theme?: string;
  onNotifyAction?: (message: string) => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectModule,
  onDirectNavigateTab,
  totalTokensCount,
  vaultTokensCount,
  isGenerating,
  onGenerate100,
  onGenerate1000More,
  onGenerateSolanaTokens,
  onSyncAllToDeployer,
  onOpenMarketDeploy,
  onOpenUniversalWallet,
  onOpenMetaMaskSync,
  onOpenWorldConnectivity,
  onOpenSendReceive,
  onOpenSwap,
  onOpenDiscountCenter,
  onOpenMembershipPortal,
  onToggleTheme,
  theme,
  onNotifyAction,
}) => {
  const [query, setQuery] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "quick_action" | "navigation" | "vault_security" | "utility"
  >("all");
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 20);
    }
  }, [isOpen]);

  const triggerFeedbackAndClose = (msg: string, keepOpen = false) => {
    if (onNotifyAction) {
      onNotifyAction(msg);
    }
    if (!keepOpen) {
      onClose();
    }
  };

  // Build unified list of Quick Actions + Module Navigation
  const allCommands = useMemo<CommandPaletteAction[]>(() => {
    const quickActions: CommandPaletteAction[] = [
      {
        id: "action-generate-tokens-100",
        title: "Generate tokens (Mint 100 Sovereign Batch)",
        subtitle: `Instantly synthesize 100 multi-chain tokens & persist to Vault (${totalTokensCount} active)`,
        category: "quick_action",
        categoryLabel: "Quick Action",
        keywords: ["generate", "tokens", "mint", "batch", "100", "create", "foundry"],
        shortcut: "G 1",
        badge: "Instant Mint",
        icon: <Zap className="w-4 h-4 text-[#F27D26]" />,
        onExecute: () => {
          if (onGenerate100) {
            onGenerate100();
            triggerFeedbackAndClose("Executed: Generating 100 synthetic multi-chain tokens & securing to Vault...");
          } else {
            onDirectNavigateTab("generator");
            triggerFeedbackAndClose("Switched to Token Foundry & Batch Generator");
          }
        },
      },
      {
        id: "action-switch-trading-tab",
        title: "Switch to Trading Tab (TWE ATS® L2 Order Book Terminal)",
        subtitle: "Open the institutional 24/7 SEC/FINRA Alternative Trading System & L2 Order Book",
        category: "quick_action",
        categoryLabel: "Quick Action",
        keywords: ["switch", "trading", "tab", "terminal", "ats", "order book", "market", "exchange", "trade"],
        shortcut: "G T",
        badge: "ATS L2 Live",
        icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
        onExecute: () => {
          onDirectNavigateTab("twe_ats_terminal");
          triggerFeedbackAndClose("Switched to Token World Exchange ATS® Trading Terminal");
        },
      },
      {
        id: "action-open-vault",
        title: "Open Vault (Sovereign Cloud & Durable Token Vault)",
        subtitle: `Inspect, restore, or export ${vaultTokensCount || totalTokensCount} secured token records in the Vault`,
        category: "quick_action",
        categoryLabel: "Quick Action",
        keywords: ["open", "vault", "storage", "cloud", "firestore", "backup", "keys", "custody"],
        shortcut: "G V",
        badge: `${vaultTokensCount || totalTokensCount} Saved`,
        icon: <Archive className="w-4 h-4 text-amber-400" />,
        onExecute: () => {
          onDirectNavigateTab("token_vault", true);
          triggerFeedbackAndClose("Opened Sovereign Token Vault");
        },
      },
      {
        id: "action-generate-tokens-1000",
        title: "Generate 1,000 Macro 2⁸ Sovereign Tokens",
        subtitle: "Scale capacity and mint 1,000 enterprise tokens with EIP-55 checksums",
        category: "quick_action",
        categoryLabel: "Quick Action",
        keywords: ["generate", "1000", "macro", "tokens", "batch", "2^8", "sovereign"],
        shortcut: "G M",
        badge: "1,000 Batch",
        icon: <Sparkles className="w-4 h-4 text-amber-300" />,
        onExecute: () => {
          if (onGenerate1000More) {
            onGenerate1000More();
            triggerFeedbackAndClose("Executed: Generating 1,000 Macro 2⁸ Sovereign Tokens...");
          } else {
            onDirectNavigateTab("generator");
            triggerFeedbackAndClose("Switched to Token Foundry");
          }
        },
      },
      {
        id: "action-generate-solana-50",
        title: "Generate 50 Solana SPL Tokens",
        subtitle: "Synthesize 50 high-speed Solana SPL tokens routed to Solana Multi-Sig Treasury",
        category: "quick_action",
        categoryLabel: "Quick Action",
        keywords: ["generate", "solana", "spl", "50", "tokens", "svm"],
        badge: "Solana SPL",
        icon: <Zap className="w-4 h-4 text-cyan-400" />,
        onExecute: () => {
          if (onGenerateSolanaTokens) {
            onGenerateSolanaTokens();
            triggerFeedbackAndClose("Executed: Generating 50 Solana SPL Tokens...");
          }
        },
      },
      {
        id: "action-switch-advanced-trading",
        title: "Switch to Advanced L3 Trading Terminal (Limit • Stop • OCO)",
        subtitle: "Jump to institutional L3 depth chart, OCO orders, and live execution blotter",
        category: "quick_action",
        categoryLabel: "Quick Action",
        keywords: ["switch", "trading", "advanced", "l3", "oco", "limit", "stop"],
        badge: "VIP L3 Book",
        icon: <TrendingUp className="w-4 h-4 text-cyan-300" />,
        onExecute: () => {
          onDirectNavigateTab("advanced_trading_terminal");
          triggerFeedbackAndClose("Switched to Advanced L3 Trading Terminal");
        },
      },
      {
        id: "action-buy-liquidity-shares",
        title: "Buy Token Liquidity Shares (Customer LP Marketplace & APY Dividends)",
        subtitle: "Connect customer wallets (MetaMask, Coinbase, Trust, Rabby, Uniswap, Phantom) to buy LP shares for any token",
        category: "quick_action",
        categoryLabel: "Customer LP Exchange",
        keywords: [
          "buy",
          "liquidity",
          "shares",
          "customer",
          "lp",
          "pool",
          "apy",
          "yield",
          "wallet",
          "market",
        ],
        shortcut: "L P",
        badge: "LP Marketplace",
        icon: <TrendingUp className="w-4 h-4 text-[#F27D26]" />,
        onExecute: () => {
          onDirectNavigateTab("customer_liquidity_exchange");
          triggerFeedbackAndClose(
            "Opened Customer Liquidity Share Exchange & Multi-Wallet LP Marketplace"
          );
        },
      },
      {
        id: "action-sell-treasury-collateral",
        title: "Sell Treasury Collateral Shares & Swap to Verified Treasury ID",
        subtitle: "Liquidate token invention shares via Uniswap V3 & EIP-6963 wallets (MetaMask, Uniswap, Coinbase, Trust, Rabby)",
        category: "quick_action",
        categoryLabel: "Treasury & Settlement",
        keywords: [
          "sell",
          "treasury",
          "collateral",
          "shares",
          "swap",
          "uniswap",
          "metamask",
          "coinbase",
          "trust",
          "rabby",
          "payout",
        ],
        shortcut: "T S",
        badge: "Verified 0x70Ac",
        icon: <ArrowRightLeft className="w-4 h-4 text-emerald-400" />,
        onExecute: () => {
          onDirectNavigateTab("global_exchange");
          triggerFeedbackAndClose(
            "Opened Treasury Collateral Share Liquidation & Real Multi-Wallet Settlement Hub"
          );
        },
      },
      {
        id: "action-open-swap-modal",
        title: "Open 52-World-Exchange Universal Token Swap",
        subtitle: "Instant cross-venue liquidity swap & sell modal without leaving your current tab",
        category: "quick_action",
        categoryLabel: "Quick Action",
        keywords: ["swap", "sell", "exchange", "trade", "convert", "liquidity"],
        shortcut: "S W",
        badge: "52 Venues",
        icon: <ArrowRightLeft className="w-4 h-4 text-emerald-300" />,
        onExecute: () => {
          onClose();
          onOpenSwap();
        },
      },
      {
        id: "action-deploy-market",
        title: "Broadcast & Deploy Tokens to Blockchain Market",
        subtitle: "Open the Sovereign Blockchain Market Deployment Hub from anywhere",
        category: "quick_action",
        categoryLabel: "Quick Action",
        keywords: ["deploy", "broadcast", "market", "mainnet", "launch"],
        shortcut: "D M",
        badge: "Mainnet Broadcast",
        icon: <Rocket className="w-4 h-4 text-orange-400" />,
        onExecute: () => {
          onClose();
          if (onOpenMarketDeploy) {
            onOpenMarketDeploy();
          } else {
            onDirectNavigateTab("production_deployment");
          }
        },
      },
      {
        id: "action-open-wallet-extension",
        title: "Open Universal Web3 Multi-Wallet Extension",
        subtitle: "Inspect MetaMask, Coinbase, Trust, Rabby & Drainer Sentinel popup",
        category: "utility",
        categoryLabel: "Wallet & Custody",
        keywords: ["wallet", "metamask", "extension", "balance", "connect", "sentinel"],
        shortcut: "W E",
        badge: "Multi-Wallet",
        icon: <Wallet className="w-4 h-4 text-emerald-400" />,
        onExecute: () => {
          onClose();
          onOpenUniversalWallet();
        },
      },
      {
        id: "action-sync-deployer",
        title: "Sync All Tokens to Active Deployer & Protocol Treasury",
        subtitle: "Align all working tokens with your active EVM & Solana sovereign deployers",
        category: "utility",
        categoryLabel: "Wallet & Custody",
        keywords: ["sync", "deployer", "treasury", "metamask", "address"],
        badge: "Treasury Sync",
        icon: <RefreshCw className="w-4 h-4 text-indigo-400" />,
        onExecute: () => {
          if (onSyncAllToDeployer) {
            onSyncAllToDeployer();
            triggerFeedbackAndClose("Synced all tokens to active EVM/Solana deployers & treasuries");
          }
        },
      },
      {
        id: "action-open-discount-center",
        title: "Open ATS Discount Center & Fee Rebate Calculator (Up to 75% Off)",
        subtitle: "Calculate maker/taker rebates, claim OTC token discounts, and partner API credits",
        category: "utility",
        categoryLabel: "Membership & Rebates",
        keywords: ["discount", "rebate", "fees", "coupon", "voucher", "75%"],
        shortcut: "D C",
        badge: "75% Rebate",
        icon: <Percent className="w-4 h-4 text-emerald-400" />,
        onExecute: () => {
          onClose();
          onOpenDiscountCenter();
        },
      },
      {
        id: "action-open-membership-portal",
        title: "Open Membership Tiers & Lifetime Access Passes (Free • Elite • VIP)",
        subtitle: "Compare recurring plans vs. one-time lifetime passes",
        category: "utility",
        categoryLabel: "Membership & Rebates",
        keywords: ["membership", "tier", "elite", "vip", "upgrade", "pass", "subscription"],
        badge: "Tiers & Passes",
        icon: <Crown className="w-4 h-4 text-amber-400" />,
        onExecute: () => {
          onClose();
          onOpenMembershipPortal();
        },
      },
      {
        id: "action-toggle-harmonics",
        title: "Toggle 528 Hz Solfeggio Harmonics Audio Synthesizer",
        subtitle: "Start or stop pure microtonal acoustic synthesis in the background",
        category: "utility",
        categoryLabel: "Audio & Environment",
        keywords: ["audio", "harmonics", "528", "hz", "solfeggio", "music", "sound", "play", "stop"],
        badge: "528 Hz",
        icon: <Waves className="w-4 h-4 text-[#F27D26]" />,
        onExecute: () => {
          const st = harmonicsAudioEngine.getState();
          if (st.isPlaying) {
            harmonicsAudioEngine.stop();
            triggerFeedbackAndClose("Paused Solfeggio Harmonics Audio Engine");
          } else {
            harmonicsAudioEngine.start();
            triggerFeedbackAndClose(`Playing ${st.activeFrequency} Hz Sacred Harmonics Tone`);
          }
        },
      },
      {
        id: "action-open-world-nodes",
        title: "Open 8-Node World Wide Web Connectivity Matrix",
        subtitle: "Inspect global latency, 10 core languages, and multilateral FIX gateways",
        category: "utility",
        categoryLabel: "Audio & Environment",
        keywords: ["world", "nodes", "connectivity", "latency", "global", "corners"],
        badge: "8 Global Nodes",
        icon: <Globe className="w-4 h-4 text-cyan-400" />,
        onExecute: () => {
          onClose();
          onOpenWorldConnectivity();
        },
      },
    ];

    if (onToggleTheme) {
      quickActions.push({
        id: "action-toggle-theme",
        title: `Switch Workstation Theme (Current: ${theme === "light" ? "Light" : "Dark OLED"})`,
        subtitle: "Toggle between low-latency Dark OLED and high-contrast Daylight mode",
        category: "utility",
        categoryLabel: "Audio & Environment",
        keywords: ["theme", "dark", "light", "mode", "color", "oled"],
        badge: "Theme",
        icon:
          theme === "light" ? (
            <Moon className="w-4 h-4 text-indigo-400" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400" />
          ),
        onExecute: () => {
          onToggleTheme();
          triggerFeedbackAndClose("Toggled Enterprise Workstation Theme");
        },
      });
    }

    // Add all 36 modules across the 5 Enterprise Folders
    const moduleCommands: CommandPaletteAction[] = [];
    for (const folder of ENTERPRISE_FOLDERS) {
      for (const mod of folder.modules) {
        moduleCommands.push({
          id: `module-${mod.id}`,
          title: `Switch to ${mod.title}`,
          subtitle: `Folder ${folder.number} (${folder.shortName}) — ${mod.description}`,
          category: mod.isExecutiveVault ? "vault_security" : "navigation",
          categoryLabel: `Folder ${folder.number} • ${folder.shortName}`,
          keywords: [
            mod.id.replace(/_/g, " "),
            mod.title.toLowerCase(),
            mod.shortTitle.toLowerCase(),
            mod.badge.toLowerCase(),
            folder.name.toLowerCase(),
            folder.shortName.toLowerCase(),
            "switch",
            "tab",
            "open",
          ],
          badge: mod.badge,
          requiredTier: mod.requiredTier,
          isExecutiveVault: mod.isExecutiveVault,
          icon: mod.isExecutiveVault ? (
            <Lock className="w-4 h-4 text-rose-400" />
          ) : (
            <Terminal className="w-4 h-4 text-gray-400" />
          ),
          onExecute: () => {
            onSelectModule(folder, mod);
            triggerFeedbackAndClose(`Switched to ${mod.shortTitle}`);
          },
        });
      }
    }

    return [...quickActions, ...moduleCommands];
  }, [
    totalTokensCount,
    vaultTokensCount,
    theme,
    onGenerate100,
    onGenerate1000More,
    onGenerateSolanaTokens,
    onSyncAllToDeployer,
    onOpenMarketDeploy,
    onOpenUniversalWallet,
    onOpenSwap,
    onOpenDiscountCenter,
    onOpenMembershipPortal,
    onOpenWorldConnectivity,
    onToggleTheme,
    onSelectModule,
    onDirectNavigateTab,
  ]);

  const filteredCommands = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allCommands.filter((cmd) => {
      if (activeFilter !== "all" && cmd.category !== activeFilter) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        cmd.title.toLowerCase(),
        cmd.subtitle.toLowerCase(),
        cmd.categoryLabel.toLowerCase(),
        ...(cmd.keywords || []),
      ].join(" ");
      // Match all query tokens
      const tokens = q.split(/\s+/);
      return tokens.every((tok) => haystack.includes(tok));
    });
  }, [allCommands, query, activeFilter]);

  // Reset selectedIndex when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeFilter]);

  // Keyboard navigation inside the modal (Up/Down/Enter)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filteredCommands.length > 0 ? (prev + 1) % filteredCommands.length : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filteredCommands.length > 0
            ? (prev - 1 + filteredCommands.length) % filteredCommands.length
            : 0
        );
      } else if (e.key === "Enter" && filteredCommands[selectedIndex]) {
        e.preventDefault();
        filteredCommands[selectedIndex].onExecute();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex]);

  // Keep selected item scrolled into view
  useEffect(() => {
    if (!listContainerRef.current) return;
    const activeEl = listContainerRef.current.querySelector(
      `[data-cmd-index="${selectedIndex}"]`
    ) as HTMLElement | null;
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start justify-center pt-12 sm:pt-20 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-[#0D0E16] border border-[#2A2D42] shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Search Input Bar */}
        <div className="p-4 border-b border-[#222538] flex items-center gap-3 bg-[#11131E]">
          <div className="w-8 h-8 rounded-lg bg-[#F27D26]/15 border border-[#F27D26]/40 flex items-center justify-center text-[#F27D26] shrink-0">
            <Command className="w-4 h-4" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search... (e.g. 'Generate tokens', 'Switch to Trading Tab', 'Open Vault')"
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none font-mono"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1 rounded hover:bg-[#1E2132] text-gray-400 hover:text-white cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-md bg-[#1B1D2C] hover:bg-[#25283C] text-[11px] font-mono text-gray-300 hover:text-white cursor-pointer shrink-0"
          >
            ESC
          </button>
        </div>

        {/* One-Click Pinned Quick Action Bar */}
        <div className="px-4 py-2.5 bg-[#10121C] border-b border-[#1E2133] flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 mr-1">
            Instant Actions:
          </span>
          <button
            type="button"
            onClick={() => {
              if (onGenerate100) {
                onGenerate100();
                triggerFeedbackAndClose(
                  "Executed: Generating 100 synthetic multi-chain tokens & securing to Vault..."
                );
              }
            }}
            className="px-2.5 py-1 rounded-lg bg-[#F27D26]/15 hover:bg-[#F27D26]/25 border border-[#F27D26]/40 text-[#F27D26] text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Generate Tokens (+100)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onDirectNavigateTab("twe_ats_terminal");
              triggerFeedbackAndClose(
                "Switched to Token World Exchange ATS® Trading Terminal"
              );
            }}
            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Switch to Trading Tab</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onDirectNavigateTab("token_vault", true);
              triggerFeedbackAndClose("Opened Sovereign Token Vault");
            }}
            className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Open Vault</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenSwap();
            }}
            className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Quick Swap</span>
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="px-4 py-2 bg-[#141622] border-b border-[#222538] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(
            [
              { id: "all", label: `All Commands (${allCommands.length})` },
              { id: "quick_action", label: "Quick Actions" },
              { id: "navigation", label: "Workspace Tabs" },
              { id: "vault_security", label: "Vault & Enclave" },
              { id: "utility", label: "Wallets & Utilities" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition cursor-pointer shrink-0 ${
                activeFilter === tab.id
                  ? "bg-[#F27D26] text-black font-bold"
                  : "text-gray-400 hover:text-white hover:bg-[#1C1F30]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Command Results List */}
        <div
          ref={listContainerRef}
          className="max-h-[380px] overflow-y-auto p-3 space-y-1"
        >
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="text-sm font-mono text-gray-300">
                No matching commands or modules for "{query}"
              </div>
              <div className="text-xs text-gray-500 font-mono">
                Try searching "Generate tokens", "Trading", "Vault", "Swap", or "SEC"
              </div>
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isHighlighted = idx === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  data-cmd-index={idx}
                  type="button"
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => cmd.onExecute()}
                  className={`w-full text-left p-3 rounded-xl border flex items-center justify-between gap-3 transition cursor-pointer ${
                    isHighlighted
                      ? "bg-[#1B1F32] border-[#F27D26] text-white shadow-md"
                      : "bg-[#121420]/70 hover:bg-[#171A29] border-transparent text-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                        isHighlighted
                          ? "bg-[#F27D26]/15 border-[#F27D26]/50"
                          : "bg-[#171926] border-[#25283C]"
                      }`}
                    >
                      {cmd.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">
                          {cmd.title}
                        </span>
                        <span className="text-[10px] font-mono text-gray-400">
                          · {cmd.categoryLabel}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-400 truncate mt-0.5">
                        {cmd.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 font-mono">
                    {cmd.badge && (
                      <span className="text-[10px] text-gray-400 hidden sm:inline">
                        {cmd.badge}
                      </span>
                    )}
                    {cmd.shortcut && (
                      <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-[#0A0B10] border border-[#2A2D42] text-amber-300">
                        {cmd.shortcut}
                      </kbd>
                    )}
                    <CornerDownLeft
                      className={`w-3.5 h-3.5 ${
                        isHighlighted ? "text-[#F27D26]" : "text-gray-600"
                      }`}
                    />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Keyboard Hints */}
        <div className="px-4 py-2.5 bg-[#0A0B10] border-t border-[#222538] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-gray-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[#161824] border border-[#282B3E] text-gray-300">
                ↑
              </kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-[#161824] border border-[#282B3E] text-gray-300">
                ↓
              </kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[#161824] border border-[#282B3E] text-gray-300">
                ↵ Enter
              </kbd>
              <span>Execute Action</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[#161824] border border-[#282B3E] text-gray-300">
                Ctrl+K
              </kbd>
              <span>Toggle Palette</span>
            </span>
          </div>
          <div className="text-gray-500">
            {filteredCommands.length} commands ready
          </div>
        </div>
      </div>
    </div>
  );
};
