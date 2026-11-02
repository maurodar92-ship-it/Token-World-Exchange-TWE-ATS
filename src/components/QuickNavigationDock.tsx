import React, { useState, useEffect, useRef } from "react";
import { 
  Database, 
  Shield, 
  Zap, 
  Globe, 
  Layers, 
  Palette, 
  Activity, 
  Rocket, 
  Gauge, 
  Code2, 
  Terminal, 
  BarChart3, 
  Sparkles,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Compass,
  X
} from "lucide-react";
import { NavTabId, NAV_ITEMS } from "./Navbar";

interface QuickNavigationDockProps {
  activeTab: NavTabId;
  setActiveTab: (tab: NavTabId) => void;
  totalTokensCount: number;
  vaultTokensCount: number;
}

export const QuickNavigationDock: React.FC<QuickNavigationDockProps> = ({
  activeTab,
  setActiveTab,
  totalTokensCount,
  vaultTokensCount,
}) => {
  const [showFloatingDock, setShowFloatingDock] = useState(false);
  const [showAllMenu, setShowAllMenu] = useState(false);
  const barScrollRef = useRef<HTMLDivElement>(null);

  // Monitor vertical scroll to toggle floating dock
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setShowFloatingDock(scrollY > 280);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectTab = (tabId: NavTabId) => {
    setActiveTab(tabId);
    setShowAllMenu(false);
    setTimeout(() => {
      const target = document.getElementById("active-module-view");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 60);
  };

  const scrollBarLeft = () => {
    if (barScrollRef.current) {
      barScrollRef.current.scrollBy({ left: -240, behavior: "smooth" });
    }
  };

  const scrollBarRight = () => {
    if (barScrollRef.current) {
      barScrollRef.current.scrollBy({ left: 240, behavior: "smooth" });
    }
  };

  const currentItem = NAV_ITEMS.find((item) => item.id === activeTab) || NAV_ITEMS[0];
  const CurrentIcon = currentItem.icon;

  return (
    <>
      {/* 1. In-Page Sticky Header Bar (Sits immediately above the active module content) */}
      <div 
        id="active-module-view" 
        className="scroll-mt-20 rounded-xl bg-[#121216] border border-[#1F1F23] p-2.5 sm:p-3 shadow-md transition-all flex flex-col md:flex-row items-center justify-between gap-3"
      >
        {/* Left: Active Module Identifier */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#181820] border border-[#F27D26]/40 flex items-center justify-center text-[#F27D26] shadow-sm flex-shrink-0">
              <CurrentIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white tracking-wide">
                  {currentItem.label}
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#F27D26]/10 text-[#F27D26] border border-[#F27D26]/30 uppercase font-semibold">
                  Active Page
                </span>
              </div>
              <p className="text-[10px] text-[#8E9299]">
                Fullstack module viewport
              </p>
            </div>
          </div>

          {/* Jump to Top Cockpit Button */}
          <button
            type="button"
            onClick={scrollToTop}
            className="md:hidden flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#181820] hover:bg-[#22222E] border border-[#1F1F23] text-xs text-[#8E9299] hover:text-white cursor-pointer"
            title="Scroll up to the top cockpit"
          >
            <ArrowUp className="w-3.5 h-3.5 text-[#F27D26]" />
            <span className="text-[10px] font-mono">Top</span>
          </button>
        </div>

        {/* Center/Right: Sideways Scrollable Fast Page Switcher Strip */}
        <div className="relative flex items-center gap-1 w-full md:max-w-2xl">
          {/* Scroll Left Chevron */}
          <button
            type="button"
            onClick={scrollBarLeft}
            aria-label="Scroll left in switcher"
            className="p-1 rounded-md bg-[#0A0A0C] border border-[#1F1F23] text-[#8E9299] hover:text-white cursor-pointer flex-shrink-0"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Horizontal Track */}
          <div
            ref={barScrollRef}
            className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth py-0.5 w-full"
            style={{ scrollbarWidth: "none" }}
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  id={`dock-tab-${item.id}`}
                  type="button"
                  onClick={() => handleSelectTab(item.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition-all cursor-pointer flex-shrink-0 font-medium ${
                    isActive
                      ? "bg-[#F27D26] text-black font-bold shadow-sm"
                      : "bg-[#0A0A0C] text-[#8E9299] hover:text-white hover:bg-[#1A1A22] border border-[#1F1F23]"
                  }`}
                >
                  <Icon className={`w-3 h-3 ${isActive ? "text-black" : "text-gray-400"}`} />
                  <span>{item.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Scroll Right Chevron */}
          <button
            type="button"
            onClick={scrollBarRight}
            aria-label="Scroll right in switcher"
            className="p-1 rounded-md bg-[#0A0A0C] border border-[#1F1F23] text-[#8E9299] hover:text-white cursor-pointer flex-shrink-0"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Jump to Top Cockpit (Desktop) */}
          <button
            type="button"
            onClick={scrollToTop}
            className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#181820] hover:bg-[#22222E] border border-[#1F1F23] text-xs text-[#8E9299] hover:text-white cursor-pointer flex-shrink-0 ml-1 transition-colors"
            title="Scroll to top of front page"
          >
            <ArrowUp className="w-3.5 h-3.5 text-[#F27D26]" />
            <span className="text-[10px] font-mono">Top Cockpit</span>
          </button>
        </div>
      </div>

      {/* 2. Floating Quick Dock (Appears when user is scrolled deep down on any page) */}
      {showFloatingDock && (
        <aside
          aria-label="Quick page navigation"
          className="fixed bottom-4 right-4 sm:right-6 z-50 flex items-center gap-2 bg-[#121216]/95 backdrop-blur-md border border-[#F27D26]/40 p-1.5 sm:p-2 rounded-2xl shadow-2xl animate-fadeIn"
        >
          {/* Active indicator pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0A0A0C] border border-[#1F1F23] text-xs">
            <div className="w-2 h-2 rounded-full bg-[#F27D26] animate-pulse" />
            <span className="text-[#8E9299] text-[10px] font-mono uppercase">Viewing:</span>
            <span className="text-white font-bold text-xs">{currentItem.shortLabel}</span>
          </div>

          {/* Quick-Jump Core Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleSelectTab("token_vault")}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                activeTab === "token_vault"
                  ? "bg-[#F27D26] text-black shadow-md font-bold"
                  : "bg-[#181820] text-[#8E9299] hover:text-white hover:bg-[#242430] border border-[#1F1F23]"
              }`}
              title="Token Vault"
            >
              <Shield className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => handleSelectTab("high_volume")}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                activeTab === "high_volume"
                  ? "bg-[#F27D26] text-black shadow-md font-bold"
                  : "bg-[#181820] text-[#8E9299] hover:text-white hover:bg-[#242430] border border-[#1F1F23]"
              }`}
              title="1M Stream Export"
            >
              <Zap className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => handleSelectTab("all_apps")}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                activeTab === "all_apps"
                  ? "bg-[#F27D26] text-black shadow-md font-bold"
                  : "bg-[#181820] text-[#8E9299] hover:text-white hover:bg-[#242430] border border-[#1F1F23]"
              }`}
              title="All Apps (75+ Chains)"
            >
              <Globe className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => handleSelectTab("art_studio")}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                activeTab === "art_studio"
                  ? "bg-[#F27D26] text-black shadow-md font-bold"
                  : "bg-[#181820] text-[#8E9299] hover:text-white hover:bg-[#242430] border border-[#1F1F23]"
              }`}
              title="Crypto Art Studio"
            >
              <Palette className="w-4 h-4" />
            </button>

            {/* Menu of all pages */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAllMenu((prev) => !prev)}
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-[#1F1F28] hover:bg-[#282836] border border-[#F27D26]/40 text-xs font-semibold text-white transition-all cursor-pointer"
                title="All Pages & Inventions"
              >
                <Compass className="w-4 h-4 text-[#F27D26]" />
                <span className="text-[11px] hidden sm:inline">{NAV_ITEMS.length} Tabs</span>
              </button>

              {/* All Pages Popover */}
              {showAllMenu && (
                <div className="absolute bottom-full right-0 mb-2 w-64 bg-[#0D0D12] border border-[#1F1F23] rounded-xl shadow-2xl p-2 z-50 max-h-[70vh] overflow-y-auto space-y-1">
                  <div className="flex items-center justify-between px-2 py-1 text-[10px] font-mono text-[#8E9299] uppercase font-bold border-b border-[#1F1F23]">
                    <span>Jump to Any Page</span>
                    <button 
                      type="button" 
                      onClick={() => setShowAllMenu(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-1 pt-1">
                    {NAV_ITEMS.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectTab(item.id)}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                            isActive
                              ? "bg-[#F27D26] text-black font-bold"
                              : "text-[#C0C4CC] hover:text-white hover:bg-[#1A1A22]"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="w-3.5 h-3.5" />
                            <span>{item.label}</span>
                          </div>
                          {isActive && <span className="text-[9px] font-mono">Active</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Scroll to Top Arrow */}
            <button
              type="button"
              onClick={scrollToTop}
              className="p-2 rounded-xl bg-[#F27D26] hover:bg-[#ff8f3d] text-black shadow-md transition-all cursor-pointer"
              title="Scroll to Top of Front Page"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}
    </>
  );
};
