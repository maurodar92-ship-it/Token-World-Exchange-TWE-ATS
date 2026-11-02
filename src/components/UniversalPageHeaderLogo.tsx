import React from "react";
import { NavTabId, NAV_ITEMS } from "./Navbar";
import { 
  ShieldCheck, 
  Landmark, 
  Radio, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  Clock,
} from "lucide-react";

interface UniversalPageHeaderLogoProps {
  activeTab: NavTabId;
  setActiveTab?: (tab: NavTabId) => void;
  totalTokensCount?: number;
}

export const UniversalPageHeaderLogo: React.FC<UniversalPageHeaderLogoProps> = ({
  activeTab,
  setActiveTab,
  totalTokensCount = 0,
}) => {
  const currentNav = NAV_ITEMS.find((item) => item.id === activeTab);
  const CurrentIcon = currentNav?.icon || Landmark;

  return (
    <div className="w-full rounded-2xl bg-gradient-to-r from-[#121218] via-[#161622] to-[#101018] border border-amber-500/30 p-4 sm:p-5 shadow-2xl relative overflow-hidden group">
      {/* Background Ambient Glow */}
      <div className="absolute -top-16 -right-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Official Logo + Venue & Creator Brand Identity */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4">
          {/* Logo Frame */}
          <div className="relative flex-shrink-0 cursor-pointer" onClick={() => setActiveTab?.("generator")}>
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-[#1C1C28] via-[#101016] to-[#0A0A0E] border-2 border-amber-500/60 p-1 shadow-[0_0_25px_rgba(242,125,38,0.35)] hover:shadow-[0_0_35px_rgba(242,125,38,0.6)] hover:border-amber-400 transition-all duration-300 flex items-center justify-center">
              <img
                src="/assets/aistudio/IMG_20261026_022436_ab42bf11.jpg"
                alt="Token World Exchange ATS® (TWE) Official Logo"
                className="w-full h-full object-contain rounded-xl hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/twe_logo.jpg";
                }}
              />
            </div>
            <span className="absolute -bottom-1.5 -right-1.5 px-1.5 py-0.5 rounded bg-amber-500 text-black text-[9px] font-black font-mono uppercase tracking-wider shadow">
              ATS®
            </span>
          </div>

          {/* Title & Creator Attribution */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 bg-clip-text text-transparent">
                  Token World Exchange ATS®
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1C1C28] text-amber-300 border border-amber-500/30 font-bold">
                  (TWE)
                </span>
              </h2>
            </div>

            <p className="text-xs text-amber-200/90 font-mono flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
              <span className="font-bold text-white">Sole Owner &amp; Creator:</span>
              <span className="text-amber-400 font-bold">Mauro Lomibao Dar III®</span>
              <span className="text-gray-500">&bull;</span>
              <span className="text-cyan-300">maurodar08@gmail.com</span>
              <span className="text-gray-500">&bull;</span>
              <span className="text-gray-400">945 Westholme Ave. LA CA 90024</span>
            </p>

            {/* Regulatory & Institutional Badges */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1 text-[10px] font-mono">
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                SEC EDGAR Next Verified
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 font-semibold flex items-center gap-1">
                <Landmark className="w-3 h-3 text-blue-400" />
                NYSE Dual Venue Rule 497
              </span>
              <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-purple-400" />
                DTCC FAST Cleared
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                SEC Rule 15c3-5 Collars Active
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/50 font-bold flex items-center gap-1 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                In All 4 Corners of the World: Token World Exchange ATS® (TWE)
              </span>
            </div>
          </div>
        </div>

        {/* Right: Active Page Badge & Fast Navigation Indicator */}
        <div className="flex flex-col items-center sm:items-end justify-center gap-2 border-t sm:border-t-0 sm:border-l border-[#242436] pt-3 sm:pt-0 sm:pl-5 self-stretch sm:self-auto">
          <div className="text-center sm:text-right">
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block">
              Active Page / Module:
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <CurrentIcon className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-white font-mono">
                {currentNav?.label || "Token World Exchange ATS®"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-gray-400">
            {totalTokensCount > 0 && (
              <span className="px-2 py-0.5 rounded bg-[#14141E] border border-[#222234] text-cyan-400 font-bold">
                {totalTokensCount} Inventions Active
              </span>
            )}
            <button
              type="button"
              onClick={() => setActiveTab?.("sec_monitor")}
              className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold transition-all cursor-pointer flex items-center gap-1"
            >
              <span>🏛️ SEC Monitor</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
