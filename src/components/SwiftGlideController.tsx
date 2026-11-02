import React, { useState, useEffect, useRef } from "react";
import {
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Globe,
  Sliders,
  ShieldCheck,
  Check,
  Zap,
  Sparkles,
  X,
  Compass,
  Languages,
  Radio,
  Layers,
  Activity,
  Laptop,
  Smartphone,
  Tablet,
  Monitor,
} from "lucide-react";
import {
  isFullscreenActive,
  toggleFullscreen,
  subscribeToFullscreen,
  glideToTop,
  glideToBottom,
  glideToElement,
  getStoredGlideSettings,
  saveStoredGlideSettings,
  GlideSettings,
  GlideSpeed,
  ViewportDeviceMode,
} from "../utils/worldConnectivity";
import { useLanguage, WORLD_LANGUAGES, WorldLanguageCode } from "../utils/languageContext";
import { NavTabId, NAV_ITEMS } from "./Navbar";

interface SwiftGlideControllerProps {
  activeTab: NavTabId;
  setActiveTab: (tab: NavTabId) => void;
  isMetaMaskConnected?: boolean;
  metaMaskAccount?: string | null;
  onOpenMetaMaskSync?: () => void;
  onOpenWorldConnectivity?: () => void;
}

export const SwiftGlideController: React.FC<SwiftGlideControllerProps> = ({
  activeTab,
  setActiveTab,
  isMetaMaskConnected = false,
  metaMaskAccount = null,
  onOpenMetaMaskSync,
  onOpenWorldConnectivity,
}) => {
  const { currentLanguage, setLanguage, t, languageConfig } = useLanguage();
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isAllTabsOpen, setIsAllTabsOpen] = useState<boolean>(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState<boolean>(false);
  const [glideSettings, setGlideSettings] = useState<GlideSettings>(getStoredGlideSettings());
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [lastActionToast, setLastActionToast] = useState<string | null>(null);

  // Subscribe to fullscreen state changes
  useEffect(() => {
    setIsFullscreen(isFullscreenActive());
    const unsubscribe = subscribeToFullscreen((active) => {
      setIsFullscreen(active);
    });
    return () => unsubscribe();
  }, []);

  // Show transient action toast
  const triggerToast = (msg: string) => {
    setLastActionToast(msg);
    setTimeout(() => {
      setLastActionToast((prev) => (prev === msg ? null : prev));
    }, 1800);
  };

  // Keyboard navigation for swift glide (Alt + Arrows)
  useEffect(() => {
    if (!glideSettings.keyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing inside an input or textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.altKey) {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          handleGlideUp();
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          handleGlideDown();
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          handleGlideLeft();
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          handleGlideRight();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [glideSettings.keyboardShortcuts, activeTab]);

  // Handle Fullscreen Toggle
  const handleToggleFullscreen = async () => {
    const nextState = await toggleFullscreen();
    setIsFullscreen(nextState);
    triggerToast(nextState ? "⛶ Fullscreen Activated" : "Fullscreen Exited");
  };

  // Handle Swift Glide Up
  const handleGlideUp = () => {
    glideToTop(true);
    triggerToast("⬆️ Glided to Top Cockpit");
  };

  // Handle Swift Glide Down
  const handleGlideDown = () => {
    const activeModule = document.getElementById("active-module-view");
    if (activeModule) {
      activeModule.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      glideToBottom(true);
    }
    triggerToast("⬇️ Glided to Active Module");
  };

  // Handle Swift Glide Left (Previous Tab & Horizontal Scroll Left)
  const handleGlideLeft = () => {
    // 1. Scroll any horizontal nav containers left
    const navScroll = document.querySelector(".overflow-x-auto") as HTMLElement | null;
    if (navScroll) {
      navScroll.scrollBy({ left: -300, behavior: "smooth" });
    }

    // 2. Cycle to previous tab
    const currentIndex = NAV_ITEMS.findIndex((item) => item.id === activeTab);
    if (currentIndex > 0) {
      const prevTab = NAV_ITEMS[currentIndex - 1];
      setActiveTab(prevTab.id);
      triggerToast(`⬅️ Glided to: ${prevTab.shortLabel}`);
    } else {
      triggerToast("⬅️ At First Tab");
    }
  };

  // Handle Swift Glide Right (Next Tab & Horizontal Scroll Right)
  const handleGlideRight = () => {
    // 1. Scroll any horizontal nav containers right
    const navScroll = document.querySelector(".overflow-x-auto") as HTMLElement | null;
    if (navScroll) {
      navScroll.scrollBy({ left: 300, behavior: "smooth" });
    }

    // 2. Cycle to next tab
    const currentIndex = NAV_ITEMS.findIndex((item) => item.id === activeTab);
    if (currentIndex !== -1 && currentIndex < NAV_ITEMS.length - 1) {
      const nextTab = NAV_ITEMS[currentIndex + 1];
      setActiveTab(nextTab.id);
      triggerToast(`➡️ Glided to: ${nextTab.shortLabel}`);
    } else {
      triggerToast("➡️ At Final Tab");
    }
  };

  // Save Settings
  const updateSettings = (updates: Partial<GlideSettings>) => {
    const updated = { ...glideSettings, ...updates };
    setGlideSettings(updated);
    saveStoredGlideSettings(updated);
    triggerToast("⚙️ Glide Settings Saved");
  };

  const currentTabItem = NAV_ITEMS.find((item) => item.id === activeTab) || NAV_ITEMS[0];

  return (
    <>
      {/* Transient Action Toast Feedback */}
      {lastActionToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-fadeIn">
          <div className="px-4 py-2 rounded-xl bg-black/90 border border-[#F27D26]/50 text-white font-mono text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#F27D26] animate-spin" />
            <span>{lastActionToast}</span>
          </div>
        </div>
      )}

      {/* Floating Bottom-Center Enterprise Glide Cockpit */}
      <aside
        aria-label="Swift Glide & World Controls"
        className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 select-none transition-all print:hidden"
      >
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#0C0D12]/95 backdrop-blur-xl border border-zinc-800 shadow-[0_10px_35px_rgba(0,0,0,0.8)] text-zinc-200">
          {/* Collapse/Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            title={isCollapsed ? "Expand Swift Glide Bar" : "Collapse Glide Bar"}
            className="p-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700/50 transition-all cursor-pointer"
          >
            {isCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5 text-[#F27D26]" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5 text-zinc-400" />
            )}
          </button>

          {!isCollapsed && (
            <>
              {/* Directional Glide Controls: UP, DOWN, LEFT, RIGHT */}
              <div className="flex items-center gap-1 px-1 py-0.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                {/* Glide Left */}
                <button
                  type="button"
                  onClick={handleGlideLeft}
                  title="Swift Glide Left (Previous Tab / Scroll Left) [Alt + ←]"
                  aria-label="Swift Glide Left"
                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-[#F27D26] hover:text-black text-zinc-300 transition-all cursor-pointer active:scale-90"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {/* Glide Up */}
                <button
                  type="button"
                  onClick={handleGlideUp}
                  title="Swift Glide Up (Scroll to Top Cockpit) [Alt + ↑]"
                  aria-label="Swift Glide Up"
                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-[#F27D26] hover:text-black text-zinc-300 transition-all cursor-pointer active:scale-90"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>

                {/* Glide Down */}
                <button
                  type="button"
                  onClick={handleGlideDown}
                  title="Swift Glide Down (Scroll to Active Module) [Alt + ↓]"
                  aria-label="Swift Glide Down"
                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-[#F27D26] hover:text-black text-zinc-300 transition-all cursor-pointer active:scale-90"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>

                {/* Glide Right */}
                <button
                  type="button"
                  onClick={handleGlideRight}
                  title="Swift Glide Right (Next Tab / Scroll Right) [Alt + →]"
                  aria-label="Swift Glide Right"
                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-[#F27D26] hover:text-black text-zinc-300 transition-all cursor-pointer active:scale-90"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Fullscreen Toggle Button */}
              <button
                type="button"
                onClick={handleToggleFullscreen}
                title={isFullscreen ? "Exit Fullscreen Mode" : "Enter Fullscreen Mode (Any Device)"}
                aria-label="Toggle Fullscreen"
                className={`flex items-center gap-1 px-2 py-1.5 rounded-xl border text-xs font-mono font-medium transition-all cursor-pointer active:scale-95 ${
                  isFullscreen
                    ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)] font-bold"
                    : "bg-zinc-900 hover:bg-zinc-800 border-zinc-700/60 text-zinc-300 hover:text-white"
                }`}
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="hidden md:inline text-[11px]">Exit Fullscreen</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="hidden md:inline text-[11px]">Fullscreen</span>
                  </>
                )}
              </button>

              {/* World Connectivity & Core Language Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenWorldConnectivity) {
                      onOpenWorldConnectivity();
                    } else {
                      setIsLangMenuOpen((p) => !p);
                    }
                  }}
                  title="Live World Web Connection (8 Global Nodes & 10 Core Languages)"
                  aria-label="World Connectivity & Languages"
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-200 hover:text-white text-xs font-mono transition-all cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5 text-emerald-400 animate-spin" style={{ animationDuration: "20s" }} />
                  <span className="text-[11px] font-bold">{languageConfig.flag} {languageConfig.code.toUpperCase()}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </button>

                {/* Inline Quick Language Switcher Dropdown */}
                {isLangMenuOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-56 p-2 rounded-xl bg-[#0D0E15] border border-cyan-500/40 shadow-2xl z-50 text-xs">
                    <div className="px-2 py-1 border-b border-zinc-800 flex items-center justify-between text-[10px] font-mono uppercase text-zinc-400">
                      <div className="flex items-center gap-1">
                        <Languages className="w-3 h-3 text-cyan-400" />
                        <span>Core Languages</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsLangMenuOpen(false)}
                        className="text-zinc-500 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-1 pt-1 max-h-48 overflow-y-auto">
                      {WORLD_LANGUAGES.map((lang) => (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => {
                            setLanguage(lang.code);
                            setIsLangMenuOpen(false);
                            triggerToast(`Language switched to: ${lang.name}`);
                          }}
                          className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                            currentLanguage === lang.code
                              ? "bg-cyan-500/20 text-cyan-300 font-bold"
                              : "text-zinc-300 hover:bg-zinc-800"
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <span>{lang.flag}</span>
                            <span>{lang.name}</span>
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400">{lang.nativeName}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Secured MetaMask Quick Trigger */}
              {onOpenMetaMaskSync && (
                <button
                  type="button"
                  onClick={onOpenMetaMaskSync}
                  title={
                    isMetaMaskConnected
                      ? `MetaMask Extension Connected & Secured: ${metaMaskAccount}`
                      : "Enable MetaMask Extension (Secured)"
                  }
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer active:scale-95 ${
                    isMetaMaskConnected
                      ? "bg-emerald-950/40 border-emerald-500/60 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                      : "bg-amber-950/30 border-amber-500/50 text-amber-300 hover:bg-amber-900/40"
                  }`}
                >
                  <span className="text-xs select-none">🦊</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden xl:inline text-[11px] font-semibold">
                    {isMetaMaskConnected ? "Secured" : "Enable"}
                  </span>
                </button>
              )}

              {/* All Tabs Quick Navigator */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsAllTabsOpen((prev) => !prev)}
                  title="Jump to Any Module (All 26 Tabs)"
                  className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 transition-all cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5 text-[#F27D26]" />
                </button>

                {isAllTabsOpen && (
                  <div className="absolute bottom-full right-0 mb-2 w-72 max-h-[70vh] overflow-y-auto p-2 rounded-2xl bg-[#0E0F17] border border-amber-500/40 shadow-2xl z-50 text-xs">
                    <div className="px-2.5 py-1.5 border-b border-zinc-800 flex items-center justify-between text-[10px] font-mono uppercase text-zinc-400">
                      <span className="font-bold text-amber-400">Jump to Tab ({NAV_ITEMS.length})</span>
                      <button
                        type="button"
                        onClick={() => setIsAllTabsOpen(false)}
                        className="text-zinc-500 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-1 pt-1.5">
                      {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setActiveTab(item.id);
                              setIsAllTabsOpen(false);
                              triggerToast(`Glided to: ${item.shortLabel}`);
                            }}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                              isActive
                                ? "bg-[#F27D26] text-black font-bold shadow-sm"
                                : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="truncate">{item.label}</span>
                            </div>
                            {item.tag && !isActive && (
                              <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-zinc-800 text-zinc-400 ml-1">
                                {item.tag}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Settings Button */}
              <button
                type="button"
                onClick={() => setIsSettingsOpen((prev) => !prev)}
                title="Swift Glide & Viewport Settings"
                className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 transition-all cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-zinc-400" />
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#0F1018] border border-amber-500/40 rounded-2xl shadow-2xl p-5 text-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#F27D26]/20 text-[#F27D26]">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Swift Glide &amp; Viewport Settings</h3>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    Smooth transitions &amp; responsive layout
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              {/* Glide Speed Preset */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 font-mono">
                  Glide Velocity &amp; Transition Speed
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["snappy", "smooth", "cinematic"] as GlideSpeed[]).map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() =>
                        updateSettings({
                          speed: spd,
                          durationMs: spd === "snappy" ? 150 : spd === "smooth" ? 350 : 700,
                        })
                      }
                      className={`px-3 py-2 rounded-xl border text-xs font-mono font-medium capitalize transition-all cursor-pointer ${
                        glideSettings.speed === spd
                          ? "bg-[#F27D26] text-black border-[#F27D26] font-bold shadow-md"
                          : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                      }`}
                    >
                      {spd}
                    </button>
                  ))}
                </div>
              </div>

              {/* Keyboard Shortcuts Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/70 border border-zinc-800">
                <div>
                  <span className="text-xs font-bold text-white block">Alt + Arrow Shortcuts</span>
                  <span className="text-[11px] text-zinc-400">
                    Alt+↑ (Top), Alt+↓ (Down), Alt+←/→ (Tabs)
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={glideSettings.keyboardShortcuts}
                  onChange={(e) => updateSettings({ keyboardShortcuts: e.target.checked })}
                  className="w-4 h-4 accent-[#F27D26] cursor-pointer"
                />
              </div>

              {/* Fullscreen API Shortcut */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/70 border border-zinc-800">
                <div>
                  <span className="text-xs font-bold text-white block">Fullscreen Optimization</span>
                  <span className="text-[11px] text-zinc-400">
                    Auto-expand viewports for ultra-wide &amp; tablets
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleFullscreen}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono cursor-pointer hover:bg-cyan-500/30"
                >
                  {isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                </button>
              </div>

              {/* Viewport Device Mode Preference */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 font-mono">
                  Target Device Viewport
                </label>
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  {(["auto", "mobile", "tablet", "desktop"] as ViewportDeviceMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => updateSettings({ viewportMode: mode })}
                      className={`px-2 py-2 rounded-xl border text-xs font-mono capitalize transition-all cursor-pointer ${
                        glideSettings.viewportMode === mode
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-[#F27D26] hover:bg-[#ff8f3d] text-black font-semibold text-xs transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
