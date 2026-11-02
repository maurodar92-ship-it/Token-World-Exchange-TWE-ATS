import React, { useState, useEffect } from "react";
import {
  Volume2,
  VolumeX,
  Play,
  Square,
  Sparkles,
  Waves,
  ChevronRight,
  Maximize2,
  X,
  Radio,
  Sliders,
  SkipForward,
  SkipBack,
} from "lucide-react";
import {
  harmonicsAudioEngine,
  HarmonicsEngineState,
  SOLFEGGIO_FREQUENCIES,
  FIBONACCI_FREQUENCIES,
} from "../utils/harmonicsAudioEngine";

interface FloatingHarmonicsPlayerProps {
  onOpenStudio?: () => void;
}

export const FloatingHarmonicsPlayer: React.FC<FloatingHarmonicsPlayerProps> = ({
  onOpenStudio,
}) => {
  const [engineState, setEngineState] = useState<HarmonicsEngineState>(harmonicsAudioEngine.getState());
  const [isMinimized, setIsMinimized] = useState<boolean>(true);
  const [showVolumePopup, setShowVolumePopup] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = harmonicsAudioEngine.subscribe((state) => {
      setEngineState(state);
    });
    return () => unsubscribe();
  }, []);

  const handleNextTone = () => {
    // Cycle through Solfeggio frequencies
    const currentIdx = SOLFEGGIO_FREQUENCIES.findIndex(
      (s) => Math.abs(s.hz - engineState.activeFrequency) < 0.5
    );
    const nextIdx = (currentIdx + 1) % SOLFEGGIO_FREQUENCIES.length;
    const nextFreq = SOLFEGGIO_FREQUENCIES[nextIdx];
    harmonicsAudioEngine.setFrequency(nextFreq.hz, `${nextFreq.hz} Hz • ${nextFreq.name}`);
    if (!engineState.isPlaying) harmonicsAudioEngine.start();
  };

  const handlePrevTone = () => {
    const currentIdx = SOLFEGGIO_FREQUENCIES.findIndex(
      (s) => Math.abs(s.hz - engineState.activeFrequency) < 0.5
    );
    const prevIdx = (currentIdx - 1 + SOLFEGGIO_FREQUENCIES.length) % SOLFEGGIO_FREQUENCIES.length;
    const prevFreq = SOLFEGGIO_FREQUENCIES[prevIdx];
    harmonicsAudioEngine.setFrequency(prevFreq.hz, `${prevFreq.hz} Hz • ${prevFreq.name}`);
    if (!engineState.isPlaying) harmonicsAudioEngine.start();
  };

  // If minimized, show floating micro-pill
  if (isMinimized) {
    return (
      <div className="fixed bottom-16 left-4 z-40 animate-fade-in">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className={`flex items-center gap-2 px-3 py-2 rounded-full border shadow-2xl transition-all cursor-pointer ${
            engineState.isPlaying
              ? "bg-[#181824] border-[#F27D26] text-[#F27D26] shadow-orange-500/20"
              : "bg-[#121216] border-[#1F1F24] text-[#8E9299] hover:text-white"
          }`}
          title="Open Harmonics Tuner"
        >
          <Waves className={`w-4 h-4 ${engineState.isPlaying ? "animate-pulse" : ""}`} />
          <span className="text-xs font-mono font-bold">
            {engineState.activeFrequency} Hz
          </span>
          {engineState.isPlaying && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-16 left-4 z-40 max-w-sm w-full animate-fade-in hidden sm:block">
      <div className="rounded-xl bg-[#121218]/95 backdrop-blur-md border border-[#252532] shadow-2xl p-3 flex flex-col gap-2.5">
        {/* Top Bar: Title & Min/Close */}
        <div className="flex items-center justify-between gap-2 border-b border-[#1F1F24] pb-2 text-[11px] font-mono">
          <div className="flex items-center gap-1.5 text-[#F27D26] font-bold truncate">
            <Waves className={`w-3.5 h-3.5 shrink-0 ${engineState.isPlaying ? "animate-bounce" : ""}`} />
            <span className="truncate">Solfeggio & Fibonacci</span>
          </div>

          <div className="flex items-center gap-1">
            {onOpenStudio && (
              <button
                type="button"
                onClick={onOpenStudio}
                className="p-1 rounded text-[#8E9299] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Open Full Harmonics Studio"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="p-1 rounded text-[#8E9299] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Minimize to Pill"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Center: Frequency Readout & Cycle buttons */}
        <div className="flex items-center justify-between gap-2 bg-[#0A0A0E] px-3 py-2 rounded-lg border border-[#1A1A20]">
          <button
            type="button"
            onClick={handlePrevTone}
            className="text-[#8E9299] hover:text-white p-1 cursor-pointer transition-colors"
            title="Previous Sacred Tone"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <div className="text-center truncate">
            <div className="font-extrabold font-mono text-sm text-white flex items-center justify-center gap-1.5">
              <span className="text-[#F27D26]">{engineState.activeFrequency} Hz</span>
              {engineState.isPlaying && (
                <div className="flex items-center gap-0.5 h-3">
                  <span className="w-0.5 h-2 bg-[#F27D26] animate-pulse" />
                  <span className="w-0.5 h-3 bg-cyan-400 animate-pulse delay-75" />
                  <span className="w-0.5 h-1.5 bg-emerald-400 animate-pulse delay-150" />
                </div>
              )}
            </div>
            <p className="text-[10px] text-[#8E9299] truncate max-w-[180px]">
              {engineState.activeLabel}
            </p>
          </div>

          <button
            type="button"
            onClick={handleNextTone}
            className="text-[#8E9299] hover:text-white p-1 cursor-pointer transition-colors"
            title="Next Sacred Tone"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bottom Action Controls */}
        <div className="flex items-center justify-between gap-2">
          {/* Play/Pause */}
          <button
            type="button"
            onClick={() => harmonicsAudioEngine.togglePlay()}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              engineState.isPlaying
                ? "bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30"
                : "bg-gradient-to-r from-[#F27D26] to-[#ff8e3c] text-black font-extrabold hover:opacity-95"
            }`}
          >
            {engineState.isPlaying ? (
              <>
                <Square className="w-3 h-3 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span>Play Tone</span>
              </>
            )}
          </button>

          {/* Volume Popup Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowVolumePopup((v) => !v)}
              className="p-1.5 rounded-lg bg-[#181820] hover:bg-[#20202A] text-[#8E9299] hover:text-white border border-[#22222A] cursor-pointer"
              title="Volume Control"
            >
              {engineState.isMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-red-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-[#F27D26]" />
              )}
            </button>

            {showVolumePopup && (
              <div className="absolute bottom-full right-0 mb-2 p-2 rounded-lg bg-[#0E0E14] border border-[#262632] shadow-xl flex items-center gap-2 z-50">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={engineState.isMuted ? 0 : engineState.volume}
                  onChange={(e) => harmonicsAudioEngine.setVolume(parseFloat(e.target.value))}
                  className="w-20 accent-[#F27D26] cursor-pointer"
                />
                <span className="text-[10px] font-mono text-[#8E9299] w-6">
                  {Math.round(engineState.volume * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* Jump to Studio CTA */}
          {onOpenStudio && (
            <button
              type="button"
              onClick={onOpenStudio}
              className="py-1.5 px-2.5 rounded-lg bg-[#181820] hover:bg-[#22222C] border border-[#262632] text-[11px] font-mono text-[#8E9299] hover:text-white transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>Studio</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FloatingHarmonicsPlayer;
