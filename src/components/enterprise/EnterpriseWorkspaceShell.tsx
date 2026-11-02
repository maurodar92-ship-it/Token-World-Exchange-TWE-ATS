import React, { useState, useEffect, useMemo } from "react";
import {
  Folder,
  FolderOpen,
  Lock,
  Unlock,
  Search,
  Command,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Layers,
  ShieldCheck,
  Crown,
  Percent,
  Wallet,
  Waves,
  Globe,
  Compass,
  Navigation,
  Play,
  Square,
  SkipForward,
  SkipBack,
  Volume2,
  ExternalLink,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  CheckCircle2,
  Sparkles,
  Maximize2,
  Minimize2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  KeyRound,
  LayoutGrid,
} from "lucide-react";
import { NavTabId } from "../Navbar";
import {
  ENTERPRISE_FOLDERS,
  EnterpriseFolderId,
  EnterpriseFolderDefinition,
  EnterpriseModuleItem,
  findFolderByTabId,
} from "../../data/enterpriseFolders";
import { useMembership } from "../../context/MembershipContext";
import { FolderSecurityGateModal } from "./FolderSecurityGateModal";
import {
  harmonicsAudioEngine,
  HarmonicsEngineState,
  SOLFEGGIO_FREQUENCIES,
} from "../../utils/harmonicsAudioEngine";
import { FOUR_CORNERS_CONFIG, WorldCornerId } from "../FourCornersOfTheWorld";
import { CommandPaletteModal } from "./CommandPaletteModal";

export type UtilityDrawerTabId = "wallet" | "harmonics" | "corners" | "glide";

interface EnterpriseWorkspaceShellProps {
  activeTab: NavTabId;
  setActiveTab: (tab: NavTabId) => void;
  totalTokensCount: number;
  vaultTokensCount: number;
  isGenerating?: boolean;
  onGenerate100?: () => void;
  onGenerate1000More?: () => void;
  onGenerateSolanaTokens?: () => void;
  onSyncAllToDeployer?: () => void;
  onOpenMarketDeploy?: () => void;
  onToggleTheme?: () => void;
  theme?: string;
  isMetaMaskConnected: boolean;
  metaMaskAccount: string | null;
  onOpenMetaMaskSync: () => void;
  onOpenUniversalWallet: () => void;
  onOpenWorldConnectivity: () => void;
  onOpenSendReceive: (mode: "send" | "receive") => void;
  onOpenSwap: () => void;
  children: React.ReactNode;
}

export const EnterpriseWorkspaceShell: React.FC<EnterpriseWorkspaceShellProps> = ({
  activeTab,
  setActiveTab,
  totalTokensCount,
  vaultTokensCount,
  isGenerating,
  onGenerate100,
  onGenerate1000More,
  onGenerateSolanaTokens,
  onSyncAllToDeployer,
  onOpenMarketDeploy,
  onToggleTheme,
  theme,
  isMetaMaskConnected,
  metaMaskAccount,
  onOpenMetaMaskSync,
  onOpenUniversalWallet,
  onOpenWorldConnectivity,
  onOpenSendReceive,
  onOpenSwap,
  children,
}) => {
  const { userState, openCheckoutModal, openDiscountCenter } = useMembership();

  // Left folder sidebar & mega-menu states
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState<boolean>(true);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState<boolean>(false);
  const [isCommandModalOpen, setIsCommandModalOpen] = useState<boolean>(false);
  const [commandToastMessage, setCommandToastMessage] = useState<string | null>(null);

  // Single Right-Hand Utility Drawer (Zero Overlap Architecture)
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState<boolean>(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState<UtilityDrawerTabId>("wallet");

  // Secured Folder Lock/Unlock State
  const [unlockedFolders, setUnlockedFolders] = useState<Set<string>>(
    () => new Set(["ats_markets", "sec_compliance", "foundry_web3", "ai_analytics"])
  );
  const [securityModalTarget, setSecurityModalTarget] = useState<{
    folder: EnterpriseFolderDefinition;
    module?: EnterpriseModuleItem | null;
  } | null>(null);

  // Harmonics Audio Engine state for Dock & Drawer
  const [audioState, setAudioState] = useState<HarmonicsEngineState>(
    harmonicsAudioEngine.getState()
  );

  // Selected World Corner in Dock/Drawer
  const [selectedCornerId, setSelectedCornerId] = useState<WorldCornerId>("NW");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const unsub = harmonicsAudioEngine.subscribe((st) => setAudioState(st));
    return () => unsub();
  }, []);

  // Keyboard shortcut Cmd+K / Ctrl+K for Command Launcher
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandModalOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setIsCommandModalOpen(false);
        setIsMegaMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const currentFolder = useMemo(() => findFolderByTabId(activeTab), [activeTab]);
  const [expandedFolderId, setExpandedFolderId] = useState<EnterpriseFolderId>(currentFolder.id);

  useEffect(() => {
    setExpandedFolderId(currentFolder.id);
  }, [currentFolder.id]);

  const isFolderUnlocked = (folder: EnterpriseFolderDefinition) => {
    return !folder.defaultLocked || unlockedFolders.has(folder.id);
  };

  const handleSelectModule = (folder: EnterpriseFolderDefinition, mod: EnterpriseModuleItem) => {
    // If folder is locked and module is an executive vault module, prompt security gate
    if (!isFolderUnlocked(folder) && mod.isExecutiveVault) {
      setSecurityModalTarget({ folder, module: mod });
      return;
    }
    setActiveTab(mod.id);
    setIsMegaMenuOpen(false);
    setIsCommandModalOpen(false);
  };

  const handleToggleFolderLock = (folder: EnterpriseFolderDefinition, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isFolderUnlocked(folder)) {
      if (folder.defaultLocked) {
        setUnlockedFolders((prev) => {
          const next = new Set(prev);
          next.delete(folder.id);
          return next;
        });
      }
    } else {
      setSecurityModalTarget({ folder, module: null });
    }
  };

  const openUtilityDrawer = (tab: UtilityDrawerTabId) => {
    if (isRightDrawerOpen && activeDrawerTab === tab) {
      setIsRightDrawerOpen(false);
    } else {
      setActiveDrawerTab(tab);
      setIsRightDrawerOpen(true);
    }
  };

  // Flat list of all modules for Command Launcher & Swift Glide
  const allModulesFlat = useMemo(() => {
    const list: Array<{ folder: EnterpriseFolderDefinition; module: EnterpriseModuleItem }> = [];
    for (const folder of ENTERPRISE_FOLDERS) {
      for (const mod of folder.modules) {
        list.push({ folder, module: mod });
      }
    }
    return list;
  }, []);

  const handleNotifyCommandAction = (message: string) => {
    setCommandToastMessage(message);
    setTimeout(() => {
      setCommandToastMessage((prev) => (prev === message ? null : prev));
    }, 4000);
  };

  const handleDirectNavigateTab = (tab: NavTabId, unlockVaultIfNeeded?: boolean) => {
    if (unlockVaultIfNeeded) {
      setUnlockedFolders((prev) => new Set([...prev, "sovereign_vault"]));
    }
    setActiveTab(tab);
    setIsMegaMenuOpen(false);
    setIsCommandModalOpen(false);
  };

  // Swift Glide directional navigation helpers (no floating overlap)
  const flatTabOrder = useMemo(() => allModulesFlat.map((item) => item.module.id), [allModulesFlat]);

  const handleStepModule = (direction: "prev" | "next") => {
    const idx = flatTabOrder.indexOf(activeTab);
    if (idx === -1) return;
    const nextIdx =
      direction === "next"
        ? (idx + 1) % flatTabOrder.length
        : (idx - 1 + flatTabOrder.length) % flatTabOrder.length;
    setActiveTab(flatTabOrder[nextIdx]);
  };

  const handleScrollViewport = (direction: "up" | "down" | "top" | "bottom") => {
    if (direction === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (direction === "bottom") {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    } else if (direction === "up") {
      window.scrollBy({ top: -520, behavior: "smooth" });
    } else {
      window.scrollBy({ top: 520, behavior: "smooth" });
    }
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const getTierBadgeStyle = (tier: string) => {
    if (tier === "vip") {
      return "bg-amber-500/20 text-amber-300 border-amber-500/40";
    }
    if (tier === "elite") {
      return "bg-indigo-500/20 text-indigo-300 border-indigo-500/40";
    }
    return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  };

  const activeModuleObj = useMemo(() => {
    return (
      currentFolder.modules.find((m) => m.id === activeTab) || currentFolder.modules[0]
    );
  }, [currentFolder, activeTab]);

  return (
    <div className="relative flex-1 flex flex-col pb-12">
      {/* =====================================================================
          1. TOP SECURED ENTERPRISE FOLDER & WORKSPACE CONTROL BAR
         ===================================================================== */}
      <div className="sticky top-[57px] z-30 bg-[#0B0C12]/95 backdrop-blur-md border-b border-[#222433] shadow-lg">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2">
          {/* Left: Sidebar Toggle + 5 Domain Folders Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => setIsLeftSidebarOpen((prev) => !prev)}
              className="px-2.5 py-1.5 rounded-lg bg-[#151622] hover:bg-[#1E2030] border border-[#2A2C3E] text-gray-300 hover:text-white flex items-center gap-1.5 text-xs font-mono font-bold transition cursor-pointer shrink-0"
              title="Toggle Enterprise Folder Explorer Sidebar"
            >
              {isLeftSidebarOpen ? (
                <PanelLeftClose className="w-3.5 h-3.5 text-[#F27D26]" />
              ) : (
                <PanelLeftOpen className="w-3.5 h-3.5 text-[#F27D26]" />
              )}
              <span className="hidden md:inline">Folders</span>
            </button>

            {/* 5 Canonical Enterprise Folder Pills */}
            {ENTERPRISE_FOLDERS.map((folder) => {
              const isCurrent = folder.id === currentFolder.id;
              const unlocked = isFolderUnlocked(folder);
              return (
                <div key={folder.id} className="flex items-center shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedFolderId(folder.id);
                      if (!unlocked) {
                        setSecurityModalTarget({ folder, module: folder.modules[0] });
                      } else {
                        setActiveTab(folder.modules[0].id);
                      }
                    }}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition cursor-pointer ${
                      isCurrent
                        ? "bg-gradient-to-r from-[#F27D26]/20 to-amber-500/10 border-[#F27D26] text-white font-bold shadow-[0_0_12px_rgba(242,125,38,0.2)]"
                        : "bg-[#13141D] hover:bg-[#1B1C29] border-[#242636] text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    {isCurrent ? (
                      <FolderOpen className="w-3.5 h-3.5 text-[#F27D26]" />
                    ) : (
                      <Folder className="w-3.5 h-3.5 text-gray-400" />
                    )}
                    <span className="text-[10px] font-bold text-[#F27D26]">
                      {folder.number}
                    </span>
                    <span>{folder.shortName}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-gray-400">
                      {folder.modules.length}
                    </span>
                    {folder.defaultLocked && (
                      <span
                        onClick={(e) => handleToggleFolderLock(folder, e)}
                        className={`p-0.5 rounded ${
                          unlocked
                            ? "text-emerald-400 hover:bg-emerald-500/20"
                            : "text-rose-400 hover:bg-rose-500/20"
                        }`}
                        title={
                          unlocked
                            ? "Secured Folder Unlocked (Click to Re-Lock)"
                            : "Secured Enclave Folder (Click to Authenticate)"
                        }
                      >
                        {unlocked ? (
                          <Unlock className="w-3 h-3" />
                        ) : (
                          <Lock className="w-3 h-3" />
                        )}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}

            {/* Mega-Menu All 36 Modules Directory Toggle */}
            <button
              type="button"
              onClick={() => setIsMegaMenuOpen((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1 transition cursor-pointer shrink-0 ${
                isMegaMenuOpen
                  ? "bg-amber-500 text-black border-amber-400"
                  : "bg-[#151622] hover:bg-[#1E2030] border-[#2A2C3E] text-amber-300"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>All Suites</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          {/* Right: Cmd+K Launcher + Utility Drawer Dock Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsCommandModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-[#141520] hover:bg-[#1D1F2E] border border-[#F27D26]/50 text-white flex items-center gap-2 text-xs font-mono transition cursor-pointer shadow-sm"
              title="Open Command Palette (Ctrl+K / Cmd+K) — Generate tokens, Switch to Trading Tab, Open Vault"
            >
              <Command className="w-3.5 h-3.5 text-[#F27D26]" />
              <span className="hidden sm:inline font-bold">Command Palette</span>
              <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-[#0A0B10] border border-[#2A2C3E] text-amber-300">
                Ctrl+K
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => openUtilityDrawer("wallet")}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
                isRightDrawerOpen
                  ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                  : "bg-[#151622] hover:bg-[#1E2030] border-[#2A2C3E] text-gray-300 hover:text-white"
              }`}
              title="Toggle Docked Utility Drawer (Wallet, Audio, World Corners, Swift Glide)"
            >
              {isRightDrawerOpen ? (
                <PanelRightClose className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <PanelRightOpen className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span className="hidden lg:inline">Utility Drawer</span>
            </button>
          </div>
        </div>

        {/* =====================================================================
            ACTIVE FOLDER SUB-TABS BAR (CLEAN TABBED MODULE SWITCHER)
           ===================================================================== */}
        <div className="bg-[#0E0F17] border-t border-[#1C1E2B]">
          <div className="max-w-[1600px] mx-auto px-3 sm:px-6 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#181926] border border-[#282A3D] text-[#F27D26] font-bold shrink-0">
              Folder {currentFolder.number}: {currentFolder.shortName}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600 shrink-0" />
            {currentFolder.modules.map((mod) => {
              const isTabActive = mod.id === activeTab;
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => handleSelectModule(currentFolder, mod)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                    isTabActive
                      ? "bg-[#F27D26] text-black font-black shadow-sm"
                      : "bg-[#151621] hover:bg-[#1F2130] text-gray-300 hover:text-white border border-[#232536]"
                  }`}
                >
                  {mod.isExecutiveVault && (
                    <Lock className={`w-3 h-3 ${isTabActive ? "text-black" : "text-rose-400"}`} />
                  )}
                  <span>{mod.shortTitle}</span>
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded uppercase font-bold ${
                      isTabActive
                        ? "bg-black/20 text-black"
                        : getTierBadgeStyle(mod.requiredTier)
                    }`}
                  >
                    {mod.requiredTier}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* =====================================================================
            MEGA-MENU DIRECTORY OVERLAY (ALL 5 SECURED FOLDERS AT A GLANCE)
           ===================================================================== */}
        {isMegaMenuOpen && (
          <div className="border-t border-[#26293C] bg-[#0D0E16]/98 backdrop-blur-xl shadow-2xl p-4 sm:p-6 max-h-[78vh] overflow-y-auto">
            <div className="max-w-[1600px] mx-auto space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222436] pb-3">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#F27D26]" />
                    <span>Token World Exchange ATS® — Complete 5-Folder Enterprise Suite Directory</span>
                  </h3>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    Every module is housed in a dedicated secured folder with zero overlapping floating widgets.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMegaMenuOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#1A1C29] hover:bg-[#242738] text-xs font-mono text-gray-300 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <span>Close Directory</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {ENTERPRISE_FOLDERS.map((folder) => {
                  const unlocked = isFolderUnlocked(folder);
                  return (
                    <div
                      key={folder.id}
                      className="rounded-xl bg-[#13141F] border border-[#25283B] p-3.5 flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#F27D26]/15 text-[#F27D26] border border-[#F27D26]/30">
                            FOLDER {folder.number}
                          </span>
                          {folder.defaultLocked ? (
                            <button
                              type="button"
                              onClick={(e) => handleToggleFolderLock(folder, e)}
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer ${
                                unlocked
                                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                  : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                              }`}
                            >
                              {unlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                              <span>{unlocked ? "UNLOCKED" : "LOCKED"}</span>
                            </button>
                          ) : (
                            <span className="text-[10px] font-mono text-emerald-400">
                              ● ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-black text-white leading-snug">
                          {folder.name}
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                          {folder.description}
                        </p>

                        <div className="space-y-1 pt-2 border-t border-[#1F2130]">
                          {folder.modules.map((mod) => {
                            const active = mod.id === activeTab;
                            return (
                              <button
                                key={mod.id}
                                type="button"
                                onClick={() => handleSelectModule(folder, mod)}
                                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between gap-2 transition cursor-pointer ${
                                  active
                                    ? "bg-[#F27D26] text-black font-bold"
                                    : "hover:bg-[#1C1E2E] text-gray-300 hover:text-white"
                                }`}
                              >
                                <span className="truncate flex items-center gap-1.5">
                                  {mod.isExecutiveVault && (
                                    <Lock className="w-3 h-3 text-rose-400 shrink-0" />
                                  )}
                                  <span className="truncate">{mod.shortTitle}</span>
                                </span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded uppercase shrink-0 ${
                                    active
                                      ? "bg-black/20 text-black font-bold"
                                      : getTierBadgeStyle(mod.requiredTier)
                                  }`}
                                >
                                  {mod.requiredTier}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          2. MAIN WORKSPACE ROW: LEFT SIDEBAR + MODULE CANVAS + RIGHT DRAWER
         ===================================================================== */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto flex items-start gap-4 px-3 sm:px-6 pt-4">
        {/* Collapsible Left Enterprise Folder Explorer Sidebar */}
        {isLeftSidebarOpen && (
          <aside className="hidden xl:flex flex-col w-72 shrink-0 rounded-2xl bg-[#0F1018] border border-[#222436] overflow-hidden sticky top-[148px] max-h-[calc(100vh-200px)]">
            <div className="p-3.5 bg-[#141622] border-b border-[#222436] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#F27D26]" />
                <span className="text-xs font-mono font-black uppercase tracking-wider text-white">
                  Enterprise Folders
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 uppercase font-bold">
                {userState.tier} TIER
              </span>
            </div>

            {/* Folder Accordion Tree */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
              {ENTERPRISE_FOLDERS.map((folder) => {
                const isExpanded = expandedFolderId === folder.id;
                const isCurrentFolder = currentFolder.id === folder.id;
                const unlocked = isFolderUnlocked(folder);

                return (
                  <div
                    key={folder.id}
                    className={`rounded-xl border transition ${
                      isCurrentFolder
                        ? "bg-[#151724] border-[#F27D26]/50"
                        : "bg-[#11121B] border-[#1F2130]"
                    }`}
                  >
                    <div
                      onClick={() =>
                        setExpandedFolderId(isExpanded ? folder.id : folder.id)
                      }
                      className="w-full p-2.5 flex items-center justify-between gap-2 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isExpanded ? (
                          <FolderOpen className="w-4 h-4 text-[#F27D26] shrink-0" />
                        ) : (
                          <Folder className="w-4 h-4 text-gray-400 shrink-0" />
                        )}
                        <div className="truncate">
                          <div className="text-[10px] font-mono text-[#F27D26] font-bold">
                            FOLDER {folder.number}
                          </div>
                          <div className="text-xs font-bold text-white truncate">
                            {folder.shortName}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {folder.defaultLocked && (
                          <button
                            type="button"
                            onClick={(e) => handleToggleFolderLock(folder, e)}
                            className={`p-1 rounded border cursor-pointer ${
                              unlocked
                                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                                : "bg-rose-500/15 border-rose-500/30 text-rose-300"
                            }`}
                            title={unlocked ? "Folder Unlocked" : "Folder Locked — Click to Unlock"}
                          >
                            {unlocked ? (
                              <Unlock className="w-3 h-3" />
                            ) : (
                              <Lock className="w-3 h-3" />
                            )}
                          </button>
                        )}
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-2 pb-2 space-y-1 border-t border-[#1E2030] pt-1.5">
                        {folder.modules.map((mod) => {
                          const isSelected = mod.id === activeTab;
                          return (
                            <button
                              key={mod.id}
                              type="button"
                              onClick={() => handleSelectModule(folder, mod)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between gap-1.5 transition cursor-pointer ${
                                isSelected
                                  ? "bg-[#F27D26] text-black font-black shadow"
                                  : "text-gray-300 hover:bg-[#1C1E2E] hover:text-white"
                              }`}
                            >
                              <span className="truncate flex items-center gap-1.5">
                                {mod.isExecutiveVault && (
                                  <Lock
                                    className={`w-3 h-3 shrink-0 ${
                                      isSelected ? "text-black" : "text-rose-400"
                                    }`}
                                  />
                                )}
                                <span className="truncate">{mod.shortTitle}</span>
                              </span>
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded uppercase shrink-0 ${
                                  isSelected
                                    ? "bg-black/20 text-black font-bold"
                                    : getTierBadgeStyle(mod.requiredTier)
                                }`}
                              >
                                {mod.requiredTier}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Sidebar Footer: Quick Membership & Discount Center Access */}
            <div className="p-3 bg-[#131420] border-t border-[#222436] space-y-1.5">
              <button
                type="button"
                onClick={() => openDiscountCenter()}
                className="w-full py-1.5 px-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold flex items-center justify-between cursor-pointer transition"
              >
                <span className="flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5" />
                  <span>ATS Discount Center</span>
                </span>
                <span>75% OFF</span>
              </button>
              <button
                type="button"
                onClick={() => openCheckoutModal()}
                className="w-full py-1.5 px-3 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold flex items-center justify-between cursor-pointer transition"
              >
                <span className="flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5" />
                  <span>Membership Passes</span>
                </span>
                <span className="uppercase">{userState.tier}</span>
              </button>
            </div>
          </aside>
        )}

        {/* Center Active Module Workspace Canvas */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Active Breadcrumb Context Strip */}
          <div className="p-3 rounded-xl bg-[#11121B] border border-[#222436] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-2 py-0.5 rounded bg-[#F27D26]/20 text-[#F27D26] font-bold">
                FOLDER {currentFolder.number}
              </span>
              <span className="text-gray-400">{currentFolder.shortName}</span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
              <span className="text-white font-bold">{activeModuleObj.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${getTierBadgeStyle(
                  activeModuleObj.requiredTier
                )}`}
              >
                {activeModuleObj.requiredTier} ACCESS
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#191B28] border border-[#2A2D42] text-gray-300">
                {activeModuleObj.badge}
              </span>
            </div>
          </div>

          {/* Module Content */}
          {children}
        </div>

        {/* =====================================================================
            3. SINGLE COLLAPSIBLE RIGHT-HAND UTILITY DRAWER (ZERO OVERLAP)
           ===================================================================== */}
        {isRightDrawerOpen && (
          <aside className="w-80 sm:w-96 shrink-0 rounded-2xl bg-[#0F1018] border border-[#26293E] shadow-2xl overflow-hidden sticky top-[148px] max-h-[calc(100vh-200px)] flex flex-col z-30">
            {/* Drawer Header & 4 Utility Tabs */}
            <div className="p-3 bg-[#151724] border-b border-[#25283C] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Enterprise Utility Dock</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsRightDrawerOpen(false)}
                  className="p-1 rounded-lg bg-[#1F2132] hover:bg-[#2A2D42] text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#0B0C12] border border-[#222436]">
                <button
                  type="button"
                  onClick={() => setActiveDrawerTab("wallet")}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                    activeDrawerTab === "wallet"
                      ? "bg-emerald-500 text-black"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Wallet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDrawerTab("harmonics")}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                    activeDrawerTab === "harmonics"
                      ? "bg-[#F27D26] text-black"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Waves className="w-3.5 h-3.5" />
                  <span>Audio Hz</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDrawerTab("corners")}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                    activeDrawerTab === "corners"
                      ? "bg-amber-500 text-black"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>4 Corners</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDrawerTab("glide")}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                    activeDrawerTab === "glide"
                      ? "bg-cyan-500 text-black"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Glide</span>
                </button>
              </div>
            </div>

            {/* Drawer Tab Body */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {activeDrawerTab === "wallet" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-[#151724] border border-emerald-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">
                        Multi-Wallet & Sentinel
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                        {isMetaMaskConnected ? "CONNECTED" : "FOUNDRY ENCLAVE"}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-white break-all bg-[#0B0C12] p-2 rounded-lg border border-[#232638]">
                      {metaMaskAccount || "0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0"}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="p-2 rounded-lg bg-[#10111A] border border-[#222436]">
                        <div className="text-[10px] text-gray-400 font-mono">Working Batch</div>
                        <div className="text-sm font-black text-white font-mono">
                          {totalTokensCount} Tokens
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-[#10111A] border border-[#222436]">
                        <div className="text-[10px] text-gray-400 font-mono">Cloud Vault</div>
                        <div className="text-sm font-black text-emerald-400 font-mono">
                          {vaultTokensCount} Saved
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={onOpenUniversalWallet}
                      className="py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-mono text-xs font-black cursor-pointer transition"
                    >
                      Open Wallet Extension
                    </button>
                    <button
                      type="button"
                      onClick={onOpenMetaMaskSync}
                      className="py-2.5 px-3 rounded-xl bg-[#1A1C2B] hover:bg-[#24273B] border border-[#2E324B] text-white font-mono text-xs font-bold cursor-pointer transition"
                    >
                      MetaMask Sync
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenSendReceive("send")}
                      className="py-2 px-3 rounded-xl bg-[#161826] hover:bg-[#202336] border border-[#282B40] text-amber-300 font-mono text-xs font-bold cursor-pointer transition"
                    >
                      Send / Receive
                    </button>
                    <button
                      type="button"
                      onClick={onOpenSwap}
                      className="py-2 px-3 rounded-xl bg-[#161826] hover:bg-[#202336] border border-[#282B40] text-cyan-300 font-mono text-xs font-bold cursor-pointer transition"
                    >
                      52-Venue Swap
                    </button>
                  </div>
                </div>
              )}

              {activeDrawerTab === "harmonics" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-[#151724] border border-[#F27D26]/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-[#F27D26] font-bold">
                        Solfeggio & Fibonacci Synthesizer
                      </span>
                      <span className="text-xs font-mono font-black text-white">
                        {audioState.activeFrequency} Hz
                      </span>
                    </div>
                    <div className="text-xs text-gray-300 font-mono">
                      {audioState.activeLabel}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          audioState.isPlaying
                            ? harmonicsAudioEngine.stop()
                            : harmonicsAudioEngine.start()
                        }
                        className={`flex-1 py-2 px-3 rounded-lg font-mono text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition ${
                          audioState.isPlaying
                            ? "bg-rose-500 text-white"
                            : "bg-[#F27D26] text-black"
                        }`}
                      >
                        {audioState.isPlaying ? (
                          <>
                            <Square className="w-3.5 h-3.5" />
                            <span>Stop Audio</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            <span>Start Tone</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("harmonics_studio")}
                        className="py-2 px-3 rounded-lg bg-[#1C1E2E] hover:bg-[#26293E] text-white font-mono text-xs cursor-pointer"
                      >
                        Full Studio
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-[10px] font-mono uppercase text-gray-400">
                      Quick Solfeggio Presets
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {SOLFEGGIO_FREQUENCIES.map((freq) => (
                        <button
                          key={freq.hz}
                          type="button"
                          onClick={() => {
                            harmonicsAudioEngine.setFrequency(
                              freq.hz,
                              `${freq.hz} Hz • ${freq.name}`
                            );
                            if (!audioState.isPlaying) harmonicsAudioEngine.start();
                          }}
                          className={`p-2 rounded-lg border font-mono text-xs font-bold transition cursor-pointer ${
                            Math.abs(audioState.activeFrequency - freq.hz) < 0.5
                              ? "bg-[#F27D26]/20 border-[#F27D26] text-white"
                              : "bg-[#131420] border-[#232538] text-gray-400 hover:text-white"
                          }`}
                        >
                          {freq.hz} Hz
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeDrawerTab === "corners" && (
                <div className="space-y-3">
                  <div className="text-[11px] text-gray-300 leading-relaxed">
                    Inspect all four planetary quadrants of{" "}
                    <span className="text-amber-300 font-bold">
                      Token World Exchange ATS® (TWE)
                    </span>{" "}
                    without floating corner badges covering your workspace.
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(["NW", "NE", "SW", "SE"] as WorldCornerId[]).map((cid) => {
                      const cfg = FOUR_CORNERS_CONFIG[cid];
                      const active = selectedCornerId === cid;
                      return (
                        <button
                          key={cid}
                          type="button"
                          onClick={() => setSelectedCornerId(cid)}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                            active
                              ? "bg-amber-500/20 border-amber-400 text-white"
                              : "bg-[#141522] border-[#24273A] text-gray-400 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center justify-between font-mono text-xs font-black">
                            <span className="text-amber-400">{cid}</span>
                            <span className="text-[10px] text-emerald-400">
                              {cfg.latencyMs}ms
                            </span>
                          </div>
                          <div className="text-[11px] font-bold truncate mt-0.5">
                            {cfg.hubCity}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {FOUR_CORNERS_CONFIG[selectedCornerId] && (
                    <div className="p-3 rounded-xl bg-[#141624] border border-amber-500/30 space-y-1.5 font-mono">
                      <div className="text-xs font-bold text-amber-300">
                        {FOUR_CORNERS_CONFIG[selectedCornerId].name}
                      </div>
                      <div className="text-[11px] text-gray-300">
                        Hub: {FOUR_CORNERS_CONFIG[selectedCornerId].hubCity}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        GPS: {FOUR_CORNERS_CONFIG[selectedCornerId].compass}
                      </div>
                      <div className="text-[10px] text-emerald-400">
                        {FOUR_CORNERS_CONFIG[selectedCornerId].regulatoryJurisdiction}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={onOpenWorldConnectivity}
                    className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-black cursor-pointer transition"
                  >
                    Open 8-Node World Connectivity Matrix
                  </button>
                </div>
              )}

              {activeDrawerTab === "glide" && (
                <div className="space-y-3">
                  <div className="text-[11px] text-gray-300">
                    Docked Swift Glide Navigator — step through enterprise modules or scroll the viewport smoothly.
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleStepModule("prev")}
                      className="p-2.5 rounded-xl bg-[#151724] hover:bg-[#1E2133] border border-[#282B42] text-white font-mono text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Prev Module</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStepModule("next")}
                      className="p-2.5 rounded-xl bg-[#151724] hover:bg-[#1E2133] border border-[#282B42] text-white font-mono text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Next Module</span>
                      <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleScrollViewport("top")}
                      className="p-2.5 rounded-xl bg-[#151724] hover:bg-[#1E2133] border border-[#282B42] text-gray-300 hover:text-white font-mono text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
                      <span>Scroll Top</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleScrollViewport("bottom")}
                      className="p-2.5 rounded-xl bg-[#151724] hover:bg-[#1E2133] border border-[#282B42] text-gray-300 hover:text-white font-mono text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                      <span>Scroll Bottom</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleFullscreen}
                    className="w-full py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isFullscreen ? (
                      <>
                        <Minimize2 className="w-3.5 h-3.5" />
                        <span>Exit Fullscreen Workstation</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Enter Fullscreen Workstation</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* =====================================================================
          4. UNIFIED BOTTOM ENTERPRISE DOCK BAR (ZERO FLOATING OVERLAPS)
         ===================================================================== */}
      <div className="fixed bottom-0 left-0 right-0 z-40 h-10 bg-[#0A0B10]/95 backdrop-blur-md border-t border-[#232538] px-3 sm:px-6 flex items-center justify-between gap-2 text-[11px] font-mono select-none">
        {/* Left: Docked Four Corners of the World Telemetry Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[10px] text-gray-400 hidden sm:inline uppercase font-bold">
            TWE® Nodes:
          </span>
          {(["NW", "NE", "SW", "SE"] as WorldCornerId[]).map((cid) => {
            const cfg = FOUR_CORNERS_CONFIG[cid];
            return (
              <button
                key={cid}
                type="button"
                onClick={() => {
                  setSelectedCornerId(cid);
                  openUtilityDrawer("corners");
                }}
                className="px-2 py-0.5 rounded bg-[#151622] hover:bg-[#1F2133] border border-[#272A3F] text-gray-300 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition shrink-0"
                title={`${cfg.name} (${cfg.hubCity}) — Click to inspect in Drawer`}
              >
                <span className="text-amber-400 font-bold">{cid}</span>
                <span className="hidden md:inline text-[10px] text-gray-400">
                  {cfg.hubCity.split("&")[0].trim()}
                </span>
                <span className="text-[9px] text-emerald-400">{cfg.latencyMs}ms</span>
              </button>
            );
          })}
        </div>

        {/* Center: Docked Swift Glide Directional Bar */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleStepModule("prev")}
            className="px-2 py-1 rounded bg-[#151622] hover:bg-[#222436] border border-[#272A3F] text-gray-300 hover:text-white cursor-pointer"
            title="Previous Module"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => handleScrollViewport("up")}
            className="px-2 py-1 rounded bg-[#151622] hover:bg-[#222436] border border-[#272A3F] text-gray-300 hover:text-white cursor-pointer"
            title="Glide Up"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => handleScrollViewport("down")}
            className="px-2 py-1 rounded bg-[#151622] hover:bg-[#222436] border border-[#272A3F] text-gray-300 hover:text-white cursor-pointer"
            title="Glide Down"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => handleStepModule("next")}
            className="px-2 py-1 rounded bg-[#151622] hover:bg-[#222436] border border-[#272A3F] text-gray-300 hover:text-white cursor-pointer"
            title="Next Module"
          >
            →
          </button>
        </div>

        {/* Right: Command Palette + Docked Harmonics Hz + Docked Wallet Drawer Triggers */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsCommandModalOpen(true)}
            className="px-2.5 py-1 rounded bg-[#151622] hover:bg-[#202234] border border-[#F27D26]/40 text-amber-300 font-bold flex items-center gap-1.5 cursor-pointer transition"
            title="Open Command Palette (Ctrl+K)"
          >
            <Command className="w-3 h-3 text-[#F27D26]" />
            <span className="hidden md:inline">Ctrl+K</span>
          </button>

          <button
            type="button"
            onClick={() => openUtilityDrawer("harmonics")}
            className={`px-2.5 py-1 rounded border flex items-center gap-1.5 cursor-pointer transition ${
              audioState.isPlaying
                ? "bg-[#F27D26]/20 border-[#F27D26] text-[#F27D26]"
                : "bg-[#151622] border-[#272A3F] text-gray-300 hover:text-white"
            }`}
          >
            <Waves className="w-3 h-3" />
            <span>{audioState.activeFrequency} Hz</span>
          </button>

          <button
            type="button"
            onClick={() => openUtilityDrawer("wallet")}
            className="px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-1.5 cursor-pointer transition"
          >
            <Wallet className="w-3 h-3" />
            <span className="hidden sm:inline">Wallet & Vault</span>
          </button>
        </div>
      </div>

      {/* Command Palette Execution Toast Notification */}
      {commandToastMessage && (
        <div className="fixed bottom-12 right-4 z-50 max-w-md rounded-xl bg-[#121420] border border-[#F27D26] px-4 py-3 shadow-2xl flex items-center gap-3 text-xs font-mono text-white">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="flex-1">{commandToastMessage}</span>
          <button
            type="button"
            onClick={() => setCommandToastMessage(null)}
            className="text-gray-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* =====================================================================
          5. COMMAND PALETTE MODAL (CTRL+K / CMD+K)
         ===================================================================== */}
      <CommandPaletteModal
        isOpen={isCommandModalOpen}
        onClose={() => setIsCommandModalOpen(false)}
        activeTab={activeTab}
        onSelectModule={handleSelectModule}
        onDirectNavigateTab={handleDirectNavigateTab}
        totalTokensCount={totalTokensCount}
        vaultTokensCount={vaultTokensCount}
        isGenerating={isGenerating}
        onGenerate100={onGenerate100}
        onGenerate1000More={onGenerate1000More}
        onGenerateSolanaTokens={onGenerateSolanaTokens}
        onSyncAllToDeployer={onSyncAllToDeployer}
        onOpenMarketDeploy={onOpenMarketDeploy}
        onOpenUniversalWallet={onOpenUniversalWallet}
        onOpenMetaMaskSync={onOpenMetaMaskSync}
        onOpenWorldConnectivity={onOpenWorldConnectivity}
        onOpenSendReceive={onOpenSendReceive}
        onOpenSwap={onOpenSwap}
        onOpenDiscountCenter={() => openDiscountCenter()}
        onOpenMembershipPortal={() => openCheckoutModal()}
        onToggleTheme={onToggleTheme}
        theme={theme}
        onNotifyAction={handleNotifyCommandAction}
      />

      {/* =====================================================================
          6. SECURED FOLDER HARDWARE PASSKEY / PIN GATE MODAL
         ===================================================================== */}
      <FolderSecurityGateModal
        isOpen={Boolean(securityModalTarget)}
        folder={securityModalTarget?.folder || null}
        targetModule={securityModalTarget?.module}
        onClose={() => setSecurityModalTarget(null)}
        onUnlockSuccess={(folderId) => {
          setUnlockedFolders((prev) => new Set([...prev, folderId]));
          if (securityModalTarget?.module) {
            setActiveTab(securityModalTarget.module.id);
          }
          setSecurityModalTarget(null);
        }}
      />
    </div>
  );
};
