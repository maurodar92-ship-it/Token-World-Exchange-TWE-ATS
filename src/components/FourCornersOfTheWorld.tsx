import React, { useState } from "react";
import {
  Globe,
  Compass,
  Landmark,
  ShieldCheck,
  Sparkles,
  Radio,
  ExternalLink,
  ChevronDown,
  Eye,
  CheckCircle2,
  X,
} from "lucide-react";

export interface FourCornersOfTheWorldProps {
  onOpenWorldModal?: () => void;
}

export type WorldCornerId = "NW" | "NE" | "SW" | "SE";

interface WorldCornerConfig {
  id: WorldCornerId;
  name: string;
  quadrant: string;
  compass: string;
  coordinates: string;
  hubCity: string;
  region: string;
  regulatoryJurisdiction: string;
  latencyMs: number;
}

export const FOUR_CORNERS_CONFIG: Record<WorldCornerId, WorldCornerConfig> = {
  NW: {
    id: "NW",
    name: "Northwest Corner of the World",
    quadrant: "Northwest Quadrant (Americas & Pacific Rim)",
    compass: "34°03'N 118°26'W / 90°00'N 180°00'W",
    coordinates: "Northwest Hemisphere",
    hubCity: "Los Angeles & New York",
    region: "Americas / North Pacific",
    regulatoryJurisdiction: "SEC Regulation ATS & FINRA Rule 15c3-5",
    latencyMs: 12,
  },
  NE: {
    id: "NE",
    name: "Northeast Corner of the World",
    quadrant: "Northeast Quadrant (Eurasia & EMEA)",
    compass: "51°30'N 00°07'W / 90°00'N 180°00'E",
    coordinates: "Northeast Hemisphere",
    hubCity: "London, Frankfurt & Tokyo",
    region: "Europe & Asia-Pacific North",
    regulatoryJurisdiction: "Cross-Border Multilateral FIX / MiFID II Gateway",
    latencyMs: 38,
  },
  SW: {
    id: "SW",
    name: "Southwest Corner of the World",
    quadrant: "Southwest Quadrant (South Pacific & Latin America)",
    compass: "33°27'S 70°40'W / 90°00'S 180°00'W",
    coordinates: "Southwest Hemisphere",
    hubCity: "Santiago & São Paulo",
    region: "Latin America & South Pacific",
    regulatoryJurisdiction: "Sovereign Carbon Reserves & Tree3 Custody",
    latencyMs: 54,
  },
  SE: {
    id: "SE",
    name: "Southeast Corner of the World",
    quadrant: "Southeast Quadrant (Australasia & Indian Ocean)",
    compass: "33°52'S 151°12'E / 90°00'S 180°00'E",
    coordinates: "Southeast Hemisphere",
    hubCity: "Sydney & Singapore",
    region: "Australasia & Southeast Asia",
    regulatoryJurisdiction: "24/7 Follow-the-Sun CLOB Secondary Crossing",
    latencyMs: 62,
  },
};

export const FourCornersOfTheWorld: React.FC<FourCornersOfTheWorldProps> = ({ onOpenWorldModal }) => {
  const [selectedCorner, setSelectedCorner] = useState<WorldCornerId | null>(null);
  const [isHudMinimized, setIsHudMinimized] = useState<boolean>(true);

  return (
    <>
      {/* =====================================================================
          1. TOP-LEFT CORNER OF THE WORLD (NORTHWEST)
         ===================================================================== */}
      <aside
        aria-label="Token World Exchange ATS® - Northwest Corner of the World"
        className="fixed top-1 left-1 sm:top-2 sm:left-3 z-30 pointer-events-auto select-none font-sans"
      >
        <div
          onClick={() => setSelectedCorner("NW")}
          className={`group flex items-center gap-2 p-1.5 sm:p-2 rounded-xl border backdrop-blur-md transition-all duration-300 shadow-xl cursor-pointer ${
            selectedCorner === "NW"
              ? "bg-[#181824] border-amber-400 ring-2 ring-amber-500/30 shadow-[0_0_20px_rgba(242,125,38,0.4)]"
              : "bg-[#0E0E14]/85 hover:bg-[#161622] border-amber-500/40 hover:border-amber-400/80 shadow-[0_0_15px_rgba(242,125,38,0.2)]"
          }`}
          title="Click to inspect Token World Exchange ATS® (TWE) in the Northwest Corner of the World"
        >
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#14141E] border border-amber-500/60 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
            <img
              src="/assets/aistudio/IMG_20261026_022436_ab42bf11.jpg"
              alt="TWE Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/twe_logo.jpg";
              }}
            />
          </div>
          <div className="flex flex-col text-left pr-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono font-black uppercase px-1 py-0.2 rounded bg-amber-500 text-black">
                NW
              </span>
              <span className="text-[11px] sm:text-xs font-black tracking-tight text-white group-hover:text-amber-300 transition-colors">
                Token World Exchange ATS® (TWE)
              </span>
            </div>
            {!isHudMinimized && (
              <span className="text-[9px] font-mono text-amber-200/80 hidden sm:inline-block">
                Northwest Corner of the World &bull; Americas Hub
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* =====================================================================
          2. TOP-RIGHT CORNER OF THE WORLD (NORTHEAST)
         ===================================================================== */}
      <aside
        aria-label="Token World Exchange ATS® - Northeast Corner of the World"
        className="fixed top-1 right-1 sm:top-2 sm:right-3 z-30 pointer-events-auto select-none font-sans"
      >
        <div
          onClick={() => setSelectedCorner("NE")}
          className={`group flex items-center gap-2 p-1.5 sm:p-2 rounded-xl border backdrop-blur-md transition-all duration-300 shadow-xl cursor-pointer ${
            selectedCorner === "NE"
              ? "bg-[#181824] border-cyan-400 ring-2 ring-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
              : "bg-[#0E0E14]/85 hover:bg-[#161622] border-cyan-500/40 hover:border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
          }`}
          title="Click to inspect Token World Exchange ATS® (TWE) in the Northeast Corner of the World"
        >
          <div className="flex flex-col text-right pl-1">
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-[11px] sm:text-xs font-black tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                Token World Exchange ATS® (TWE)
              </span>
              <span className="text-[9px] font-mono font-black uppercase px-1 py-0.2 rounded bg-cyan-500 text-black">
                NE
              </span>
            </div>
            {!isHudMinimized && (
              <span className="text-[9px] font-mono text-cyan-200/80 hidden sm:inline-block">
                Northeast Corner of the World &bull; Eurasia Hub
              </span>
            )}
          </div>
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#14141E] border border-cyan-500/60 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
            <img
              src="/assets/aistudio/IMG_20261026_022436_ab42bf11.jpg"
              alt="TWE Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/twe_logo.jpg";
              }}
            />
          </div>
        </div>
      </aside>

      {/* =====================================================================
          3. BOTTOM-LEFT CORNER OF THE WORLD (SOUTHWEST)
         ===================================================================== */}
      <aside
        aria-label="Token World Exchange ATS® - Southwest Corner of the World"
        className="fixed bottom-1 left-1 sm:bottom-2 sm:left-3 z-30 pointer-events-auto select-none font-sans"
      >
        <div
          onClick={() => setSelectedCorner("SW")}
          className={`group flex items-center gap-2 p-1.5 sm:p-2 rounded-xl border backdrop-blur-md transition-all duration-300 shadow-xl cursor-pointer ${
            selectedCorner === "SW"
              ? "bg-[#181824] border-emerald-400 ring-2 ring-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
              : "bg-[#0E0E14]/85 hover:bg-[#161622] border-emerald-500/40 hover:border-emerald-400/80 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
          }`}
          title="Click to inspect Token World Exchange ATS® (TWE) in the Southwest Corner of the World"
        >
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#14141E] border border-emerald-500/60 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
            <img
              src="/assets/aistudio/IMG_20261026_022436_ab42bf11.jpg"
              alt="TWE Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/twe_logo.jpg";
              }}
            />
          </div>
          <div className="flex flex-col text-left pr-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono font-black uppercase px-1 py-0.2 rounded bg-emerald-500 text-black">
                SW
              </span>
              <span className="text-[11px] sm:text-xs font-black tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                Token World Exchange ATS® (TWE)
              </span>
            </div>
            {!isHudMinimized && (
              <span className="text-[9px] font-mono text-emerald-200/80 hidden sm:inline-block">
                Southwest Corner of the World &bull; South Pacific Hub
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* =====================================================================
          4. BOTTOM-RIGHT CORNER OF THE WORLD (SOUTHEAST)
         ===================================================================== */}
      <aside
        aria-label="Token World Exchange ATS® - Southeast Corner of the World"
        className="fixed bottom-14 right-1 sm:bottom-14 sm:right-3 z-30 pointer-events-auto select-none font-sans"
      >
        <div
          onClick={() => setSelectedCorner("SE")}
          className={`group flex items-center gap-2 p-1.5 sm:p-2 rounded-xl border backdrop-blur-md transition-all duration-300 shadow-xl cursor-pointer ${
            selectedCorner === "SE"
              ? "bg-[#181824] border-purple-400 ring-2 ring-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.4)]"
              : "bg-[#0E0E14]/85 hover:bg-[#161622] border-purple-500/40 hover:border-purple-400/80 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
          }`}
          title="Click to inspect Token World Exchange ATS® (TWE) in the Southeast Corner of the World"
        >
          <div className="flex flex-col text-right pl-1">
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-[11px] sm:text-xs font-black tracking-tight text-white group-hover:text-purple-300 transition-colors">
                Token World Exchange ATS® (TWE)
              </span>
              <span className="text-[9px] font-mono font-black uppercase px-1 py-0.2 rounded bg-purple-500 text-white">
                SE
              </span>
            </div>
            {!isHudMinimized && (
              <span className="text-[9px] font-mono text-purple-200/80 hidden sm:inline-block">
                Southeast Corner of the World &bull; Australasia Hub
              </span>
            )}
          </div>
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#14141E] border border-purple-500/60 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
            <img
              src="/assets/aistudio/IMG_20261026_022436_ab42bf11.jpg"
              alt="TWE Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/twe_logo.jpg";
              }}
            />
          </div>
        </div>
      </aside>

      {/* =====================================================================
          CORNER DETAIL MODAL: THE FOUR CORNERS OF THE WORLD INSPECTOR
         ===================================================================== */}
      {selectedCorner && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in zoom-in-95 duration-200"
          onClick={() => setSelectedCorner(null)}
        >
          <div
            className="w-full max-w-2xl bg-gradient-to-br from-[#141420] via-[#101018] to-[#0A0A0E] border-2 border-amber-500/60 rounded-2xl p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#242436] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#1C1C28] border border-amber-500/50 p-1 flex items-center justify-center shadow">
                  <img
                    src="/assets/aistudio/IMG_20261026_022436_ab42bf11.jpg"
                    alt="TWE"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/twe_logo.jpg";
                    }}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 rounded bg-amber-500 text-black">
                      {FOUR_CORNERS_CONFIG[selectedCorner].id} CORNER
                    </span>
                    <span className="text-xs font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30 font-bold">
                      THE FOUR CORNERS OF THE WORLD
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white mt-1">
                    Token World Exchange ATS® (TWE) &mdash; {FOUR_CORNERS_CONFIG[selectedCorner].name}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCorner(null)}
                className="p-1.5 rounded-lg bg-[#1C1C28] hover:bg-[#28283C] text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corner Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-[#0E0E14] border border-[#222232] space-y-1">
                <span className="text-[10px] text-gray-500 uppercase">Geographic Quadrant</span>
                <p className="text-white font-bold">{FOUR_CORNERS_CONFIG[selectedCorner].quadrant}</p>
              </div>

              <div className="p-3 rounded-xl bg-[#0E0E14] border border-[#222232] space-y-1">
                <span className="text-[10px] text-gray-500 uppercase">Cardinal Compass &amp; Coordinates</span>
                <p className="text-amber-300 font-bold">{FOUR_CORNERS_CONFIG[selectedCorner].compass}</p>
              </div>

              <div className="p-3 rounded-xl bg-[#0E0E14] border border-[#222232] space-y-1">
                <span className="text-[10px] text-gray-500 uppercase">Primary Financial Hubs</span>
                <p className="text-cyan-300 font-bold">{FOUR_CORNERS_CONFIG[selectedCorner].hubCity}</p>
              </div>

              <div className="p-3 rounded-xl bg-[#0E0E14] border border-[#222232] space-y-1">
                <span className="text-[10px] text-gray-500 uppercase">Direct Fiber Latency</span>
                <p className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {FOUR_CORNERS_CONFIG[selectedCorner].latencyMs} ms &bull; Optimal Route
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#0E0E14] border border-[#222232] col-span-1 sm:col-span-2 space-y-1">
                <span className="text-[10px] text-gray-500 uppercase">Regulatory &amp; Trading Framework</span>
                <p className="text-gray-200">{FOUR_CORNERS_CONFIG[selectedCorner].regulatoryJurisdiction}</p>
              </div>
            </div>

            {/* World Compass 4-Corner Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-gray-400 uppercase font-bold">Select World Corner:</span>
                <span className="text-amber-400 font-bold">Token World Exchange ATS® (TWE) Inscribed</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(["NW", "NE", "SW", "SE"] as WorldCornerId[]).map((cid) => {
                  const cfg = FOUR_CORNERS_CONFIG[cid];
                  const isCur = selectedCorner === cid;
                  return (
                    <button
                      key={cid}
                      type="button"
                      onClick={() => setSelectedCorner(cid)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer font-mono ${
                        isCur
                          ? "bg-amber-500 text-black font-black border-amber-400 shadow-md scale-105"
                          : "bg-[#12121A] text-gray-300 border-[#222232] hover:bg-[#1A1A26] hover:text-white"
                      }`}
                    >
                      <div className="text-sm font-black">{cid}</div>
                      <div className="text-[9px] uppercase tracking-tight opacity-80 mt-0.5 truncate">
                        {cfg.id === "NW"
                          ? "Northwest"
                          : cfg.id === "NE"
                          ? "Northeast"
                          : cfg.id === "SW"
                          ? "Southwest"
                          : "Southeast"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inscription Statement & Venue Owner Attribution */}
            <div className="p-4 rounded-xl bg-[#0B0B10] border border-[#202030] space-y-2 text-xs leading-relaxed text-gray-300">
              <p className="font-semibold text-white">
                Official Inscription Across All Four Corners of the World:
              </p>
              <p className="font-mono text-amber-300 text-[11px]">
                &ldquo;Token World Exchange ATS® (TWE) is operational across the Northwest, Northeast, Southwest, and Southeast quadrants of the World, establishing 24/7 global alternative trading liquidity with sub-millisecond deterministic matching.&rdquo;
              </p>
              <div className="pt-2 border-t border-[#1C1C28] flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] text-gray-500 font-mono gap-1">
                <span>Sole Owner &amp; Creator: Mauro Lomibao Dar III</span>
                <span>maurodar08@gmail.com &bull; 945 Westholme Ave. Los Angeles CA 90024</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedCorner(null);
                  if (onOpenWorldModal) onOpenWorldModal();
                }}
                className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5" />
                Open World Connectivity Map
              </button>

              <button
                type="button"
                onClick={() => setSelectedCorner(null)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold font-mono transition cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
