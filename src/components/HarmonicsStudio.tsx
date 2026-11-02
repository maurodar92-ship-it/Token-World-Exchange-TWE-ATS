import React, { useState, useEffect } from "react";
import {
  Volume2,
  VolumeX,
  Play,
  Square,
  Sparkles,
  Zap,
  Activity,
  Music,
  Layers,
  Radio,
  Sliders,
  RotateCcw,
  Check,
  Compass,
  Waves,
  Brain,
  Binary,
  Flame,
  Sun,
  Moon,
  Info,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import {
  harmonicsAudioEngine,
  HarmonicsEngineState,
  HarmonicsSoundMode,
  SOLFEGGIO_FREQUENCIES,
  FIBONACCI_FREQUENCIES,
  SPECIAL_SACRED_TUNINGS,
  BinauralBrainwaveState,
} from "../utils/harmonicsAudioEngine";
import { HarmonicsOscilloscope } from "./HarmonicsOscilloscope";

type StudioSubTab = "solfeggio" | "fibonacci" | "sacred_tunings" | "binaural" | "custom_tuner";

export const HarmonicsStudio: React.FC = () => {
  const [engineState, setEngineState] = useState<HarmonicsEngineState>(harmonicsAudioEngine.getState());
  const [activeSubTab, setActiveSubTab] = useState<StudioSubTab>("solfeggio");
  const [customInputHz, setCustomInputHz] = useState<number>(528);

  useEffect(() => {
    const unsubscribe = harmonicsAudioEngine.subscribe((state) => {
      setEngineState(state);
      setCustomInputHz(state.activeFrequency);
    });
    return () => unsubscribe();
  }, []);

  const handlePlayToggle = () => {
    harmonicsAudioEngine.togglePlay();
  };

  const handleSelectFrequency = (hz: number, label: string) => {
    harmonicsAudioEngine.setFrequency(hz, label);
    if (!engineState.isPlaying) {
      harmonicsAudioEngine.start();
    }
  };

  const handleSelectMode = (mode: HarmonicsSoundMode) => {
    harmonicsAudioEngine.setMode(mode);
    if (!engineState.isPlaying) {
      harmonicsAudioEngine.start();
    }
  };

  const handleBinauralPreset = (deltaHz: number, brainwave: BinauralBrainwaveState) => {
    harmonicsAudioEngine.setBinauralBeatHz(deltaHz, brainwave);
    if (engineState.mode !== "binaural_beats") {
      harmonicsAudioEngine.setMode("binaural_beats");
    }
    if (!engineState.isPlaying) {
      harmonicsAudioEngine.start();
    }
  };

  // Find chakra color or spectral color for current frequency
  const currentSolfeggio = SOLFEGGIO_FREQUENCIES.find((s) => Math.abs(s.hz - engineState.activeFrequency) < 0.5);
  const currentFibonacci = FIBONACCI_FREQUENCIES.find((f) => Math.abs(f.hz - engineState.activeFrequency) < 0.5);
  const activeColor = currentSolfeggio?.chakraColor || currentFibonacci?.spectralColor || "#F27D26";

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 font-sans animate-fade-in">
      {/* 1. Header Banner */}
      <div className="relative rounded-2xl bg-gradient-to-br from-[#14141E] via-[#0E0E14] to-[#120B1A] border border-[#262632] p-5 sm:p-7 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-gradient-to-br from-[#F27D26]/10 to-[#A855F7]/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26]/40 flex items-center gap-1.5">
                <Waves className="w-3 h-3 text-[#F27D26]" />
                Web Audio Acoustic Harmonics
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Golden Ratio Φ 1.618
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20">
                9 Solfeggio Chords
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span>Solfeggio & Fibonacci Sacred Harmonics Studio</span>
            </h1>

            <p className="text-xs sm:text-sm text-[#8E9299] leading-relaxed">
              Real-time Web Audio synthesizer combining ancient 9 Solfeggio healing frequencies,
              Fibonacci sequence geometric harmonics (34 Hz to 2584 Hz), Pythagorean 432 Hz natural pitch,
              and dual-channel binaural brainwave entrainment.
            </p>
          </div>

          {/* Master Transport & Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-[#0A0A0E] p-3.5 rounded-xl border border-[#1F1F24] flex-shrink-0 shadow-lg">
            {/* Play/Pause Button */}
            <button
              type="button"
              onClick={handlePlayToggle}
              className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer shadow-lg active:scale-95 ${
                engineState.isPlaying
                  ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20"
                  : "bg-gradient-to-r from-[#F27D26] to-[#ff8e3c] hover:opacity-95 text-black shadow-orange-500/20"
              }`}
            >
              {engineState.isPlaying ? (
                <>
                  <Square className="w-4 h-4 fill-current" />
                  <span>Pause Tone</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Play Tone</span>
                </>
              )}
            </button>

            {/* Volume & Mute */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#14141A] border border-[#1F1F24]">
              <button
                type="button"
                onClick={() => harmonicsAudioEngine.toggleMute()}
                className="text-[#8E9299] hover:text-white transition-colors cursor-pointer"
                title={engineState.isMuted ? "Unmute" : "Mute"}
              >
                {engineState.isMuted || engineState.volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-[#F27D26]" />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={engineState.isMuted ? 0 : engineState.volume}
                onChange={(e) => harmonicsAudioEngine.setVolume(parseFloat(e.target.value))}
                className="w-20 sm:w-24 accent-[#F27D26] cursor-pointer"
                title={`Volume: ${Math.round(engineState.volume * 100)}%`}
              />

              <span className="text-[10px] font-mono text-[#8E9299] w-7 text-right">
                {engineState.isMuted ? "0%" : `${Math.round(engineState.volume * 100)}%`}
              </span>
            </div>

            {/* Ambient Pink Noise Toggle */}
            <button
              type="button"
              onClick={() => harmonicsAudioEngine.toggleNoiseBed()}
              className={`px-3 py-2 rounded-lg text-xs font-mono border transition-all cursor-pointer flex items-center gap-1.5 ${
                engineState.noiseLayerActive
                  ? "bg-purple-500/20 border-purple-500/50 text-purple-300 font-bold"
                  : "bg-[#14141A] hover:bg-[#1A1A22] border-[#1F1F24] text-[#8E9299]"
              }`}
              title="Add gentle celestial pink noise background bed"
            >
              <Waves className="w-3.5 h-3.5" />
              <span>Ocean Bed</span>
            </button>
          </div>
        </div>

        {/* Live Sacred Oscilloscope */}
        <div className="mt-5 space-y-2">
          <HarmonicsOscilloscope
            isPlaying={engineState.isPlaying}
            frequency={engineState.activeFrequency}
            color={activeColor}
            height={130}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-[#8E9299]">Active Resonance:</span>
              <span className="font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeColor }} />
                {engineState.activeLabel}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[#8E9299]">
              <span>Mode: <strong className="text-white uppercase">{engineState.mode.replace(/_/g, " ")}</strong></span>
              {engineState.mode === "binaural_beats" && (
                <span className="text-cyan-400">
                  Delta: +{engineState.binauralBeatHz} Hz ({engineState.binauralBrainwave})
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Sound Mode Selector Bar */}
      <div className="p-3 rounded-xl bg-[#121216] border border-[#1F1F23] flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        <span className="text-xs font-bold text-[#8E9299] uppercase font-mono px-2 flex items-center gap-1.5 shrink-0">
          <Sliders className="w-3.5 h-3.5 text-[#F27D26]" />
          Synthesis Engine Mode:
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          {[
            { id: "harmonic_rich", label: "Harmonics & Φ Overtones", badge: "Warm" },
            { id: "pure_sine", label: "Pure Sine Wave", badge: "Meditation" },
            { id: "binaural_beats", label: "Binaural Brainwave Entrainment", badge: "Dual Ear" },
            { id: "fibonacci_arpeggiator", label: "Fibonacci Spiral Arpeggio", badge: "Chime" },
            { id: "solfeggio_cascade", label: "9-Tone Solfeggio Cascade", badge: "Chakras" },
            { id: "ambient_drone", label: "Ambient Sacred Drone", badge: "Immersive" },
          ].map((modeItem) => {
            const isSelected = engineState.mode === modeItem.id;
            return (
              <button
                key={modeItem.id}
                type="button"
                onClick={() => handleSelectMode(modeItem.id as HarmonicsSoundMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? "bg-[#F27D26]/20 border border-[#F27D26] text-white font-bold shadow-sm"
                    : "bg-[#181820] hover:bg-[#1E1E26] border border-[#22222A] text-[#8E9299] hover:text-white"
                }`}
              >
                <span>{modeItem.label}</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-black/40 text-[#8E9299] font-normal">
                  {modeItem.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Sub-Tab Navigation */}
      <div className="flex items-center justify-between border-b border-[#1F1F23] pb-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: "solfeggio", label: "Solfeggio Frequencies (9 Tones)", icon: Flame, badge: "174 - 963 Hz" },
            { id: "fibonacci", label: "Fibonacci Sequence & Golden Ratio Φ", icon: Binary, badge: "34 - 2584 Hz" },
            { id: "sacred_tunings", label: "Sacred Tunings (432 Hz / 108 Hz)", icon: Sun, badge: "Natural Pitch" },
            { id: "binaural", label: "Binaural Brainwave Entrainment", icon: Brain, badge: "Theta / Alpha" },
            { id: "custom_tuner", label: "Manual Frequency Tuner", icon: Sliders, badge: "Custom Hz" },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id as StudioSubTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-[#181822] text-[#F27D26] border border-[#F27D26]/50 shadow-sm"
                    : "text-[#8E9299] hover:text-white hover:bg-[#141418]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#F27D26]" : "text-gray-400"}`} />
                <span>{tab.label}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#0A0A0E] text-[#8E9299] font-mono">
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Tab Content Panels */}

      {/* TAB A: 9 Solfeggio Frequencies */}
      {activeSubTab === "solfeggio" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#121216] border border-[#1F1F24]">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>The 9 Sacred Solfeggio Scale Vibrations</span>
                <span className="text-[10px] px-2 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                  Ancient Sound Healing
                </span>
              </h3>
              <p className="text-xs text-[#8E9299]">
                Calculated using Gregorian and Vedic sound scales where digital roots equal 3, 6, or 9 (Tesla Key).
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleSelectMode("solfeggio_cascade")}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white font-mono text-xs font-bold transition-all cursor-pointer shadow-md shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Play 9-Chakra Cycle</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SOLFEGGIO_FREQUENCIES.map((freq) => {
              const isSelected = Math.abs(engineState.activeFrequency - freq.hz) < 0.5;
              return (
                <div
                  key={freq.hz}
                  className={`rounded-xl p-4.5 transition-all relative overflow-hidden border flex flex-col justify-between gap-4 ${
                    isSelected
                      ? "bg-[#161622] border-white/40 shadow-xl ring-1 ring-white/20"
                      : "bg-[#0E0E14] hover:bg-[#14141C] border-[#1F1F26] hover:border-[#2E2E38]"
                  }`}
                  style={{
                    borderLeftColor: freq.chakraColor,
                    borderLeftWidth: "4px",
                  }}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black font-mono text-white tracking-tight">
                          {freq.hz} <span className="text-xs font-medium text-[#8E9299]">Hz</span>
                        </span>
                        <span
                          className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase"
                          style={{
                            backgroundColor: `${freq.chakraColor}20`,
                            color: freq.chakraColor,
                          }}
                        >
                          {freq.ancientSyllable}
                        </span>
                      </div>

                      {isSelected && engineState.isPlaying && (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          RESONATING
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="font-bold text-white text-sm">{freq.name}</h4>
                      <p className="text-[11px] font-mono" style={{ color: freq.chakraColor }}>
                        {freq.chakra}
                      </p>
                    </div>

                    <p className="text-xs text-[#8E9299] leading-relaxed">
                      {freq.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {freq.benefits.map((b, idx) => (
                        <span
                          key={idx}
                          className="text-[9px] px-2 py-0.5 rounded bg-[#16161E] text-gray-300 font-mono border border-white/5"
                        >
                          ✓ {b}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectFrequency(freq.hz, `${freq.hz} Hz • ${freq.name}`)}
                    className={`w-full py-2.5 px-3 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      isSelected && engineState.isPlaying
                        ? "bg-white text-black font-black shadow-lg"
                        : "bg-[#181822] hover:bg-[#20202E] text-white border border-white/10"
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isSelected && engineState.isPlaying ? "Playing Frequency" : `Tune to ${freq.hz} Hz`}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB B: Fibonacci Sequence & Golden Ratio Φ */}
      {activeSubTab === "fibonacci" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#121216] border border-[#1F1F24] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Fibonacci Sequence Geometric Frequencies & Golden Ratio Φ</span>
                <span className="text-[10px] px-2 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                  Φ = 1.6180339887...
                </span>
              </h3>
              <p className="text-xs text-[#8E9299]">
                Harmonics derived from the Fibonacci sequence where consecutive ratios converge to the Golden Spiral.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => handleSelectMode("fibonacci_arpeggiator")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shadow-md ${
                  engineState.mode === "fibonacci_arpeggiator" && engineState.isPlaying
                    ? "bg-cyan-400 text-black font-extrabold shadow-cyan-400/30 animate-pulse"
                    : "bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:opacity-90"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {engineState.mode === "fibonacci_arpeggiator" && engineState.isPlaying
                    ? "Playing Golden Spiral..."
                    : "Start Fibonacci Arpeggiator"}
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {FIBONACCI_FREQUENCIES.map((fib, idx) => {
              const isSelected = Math.abs(engineState.activeFrequency - fib.hz) < 0.5;
              const isArpActive =
                engineState.mode === "fibonacci_arpeggiator" &&
                engineState.currentArpStep === idx &&
                engineState.isPlaying;

              return (
                <div
                  key={fib.hz}
                  className={`rounded-xl p-4 transition-all relative border flex flex-col justify-between gap-3 ${
                    isArpActive
                      ? "bg-cyan-950/60 border-cyan-400 shadow-xl shadow-cyan-500/20 ring-2 ring-cyan-400/40 scale-102"
                      : isSelected
                      ? "bg-[#181824] border-white/40 shadow-lg"
                      : "bg-[#0E0E14] hover:bg-[#14141C] border-[#1F1F24]"
                  }`}
                  style={{
                    borderTopColor: fib.spectralColor,
                    borderTopWidth: "3px",
                  }}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-[#8E9299]">
                        F_{fib.index}
                      </span>
                      <span
                        className="text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold"
                        style={{
                          backgroundColor: `${fib.spectralColor}20`,
                          color: fib.spectralColor,
                        }}
                      >
                        Φ {fib.phiRatio.toFixed(3)}
                      </span>
                    </div>

                    <div className="text-xl font-black font-mono text-white">
                      {fib.hz} <span className="text-xs text-[#8E9299] font-normal">Hz</span>
                    </div>

                    <h4 className="font-bold text-white text-xs truncate" title={fib.name}>
                      {fib.name}
                    </h4>

                    <p className="text-[11px] text-[#8E9299] leading-snug line-clamp-3">
                      {fib.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectFrequency(fib.hz, `Fibonacci ${fib.hz} Hz (${fib.name})`)}
                    className={`w-full py-2 px-2.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      isSelected && engineState.isPlaying
                        ? "bg-cyan-400 text-black shadow-md"
                        : "bg-[#16161E] hover:bg-[#20202A] text-white border border-white/10"
                    }`}
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Play {fib.hz} Hz</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB C: Sacred Tunings (432 Hz, 108 Hz, 111 Hz) */}
      {activeSubTab === "sacred_tunings" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SPECIAL_SACRED_TUNINGS.map((tune) => {
              const isSelected = Math.abs(engineState.activeFrequency - tune.hz) < 0.5;
              return (
                <div
                  key={tune.hz}
                  className={`rounded-xl p-5 border transition-all flex flex-col justify-between gap-4 ${
                    isSelected
                      ? "bg-[#181826] border-amber-400/50 shadow-xl ring-1 ring-amber-400/30"
                      : "bg-[#0E0E14] hover:bg-[#14141C] border-[#1F1F24]"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl font-black font-mono text-white">
                        {tune.hz} <span className="text-sm text-[#8E9299]">Hz</span>
                      </span>
                      {isSelected && engineState.isPlaying && (
                        <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/30 animate-pulse">
                          ACTIVE TUNE
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-bold text-white">{tune.name}</h4>
                    <p className="text-xs text-[#8E9299] leading-relaxed">
                      {tune.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectFrequency(tune.hz, `${tune.hz} Hz • ${tune.name}`)}
                    className="w-full py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-black font-bold text-xs font-mono cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Tune to {tune.hz} Hz</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB D: Binaural Brainwave Entrainment */}
      {activeSubTab === "binaural" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#121216] border border-[#1F1F24] space-y-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Brain className="w-4 h-4 text-cyan-400" />
              <span>Dual-Channel Binaural Beat Generator</span>
              <span className="text-[10px] px-2 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">
                Stereo Headphones Recommended
              </span>
            </h3>
            <p className="text-xs text-[#8E9299]">
              By delivering slightly different frequencies into each ear (e.g. 528 Hz Left and 535.83 Hz Right),
              your auditory cortex synchronizes into a perceived beat difference of 7.83 Hz (Schumann Theta state).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {[
              {
                state: "delta" as BinauralBrainwaveState,
                range: "0.5 - 4 Hz",
                presetHz: 2.5,
                title: "Delta Wave",
                desc: "Deep restorative sleep, immune system recovery, subconscious release.",
                color: "#6366F1",
              },
              {
                state: "theta" as BinauralBrainwaveState,
                range: "4 - 8 Hz",
                presetHz: 7.83,
                title: "Theta (Schumann)",
                desc: "Earth resonance 7.83 Hz. Deep trance, spontaneous creativity, astral dreaming.",
                color: "#06B6D4",
              },
              {
                state: "alpha" as BinauralBrainwaveState,
                range: "8 - 12 Hz",
                presetHz: 10.0,
                title: "Alpha Wave",
                desc: "Relaxed high focus, stress dissipation, flow state programming.",
                color: "#10B981",
              },
              {
                state: "beta" as BinauralBrainwaveState,
                range: "13 - 30 Hz",
                presetHz: 16.0,
                title: "Beta Wave",
                desc: "Active alertness, logical computation, rapid problem solving.",
                color: "#F59E0B",
              },
              {
                state: "gamma" as BinauralBrainwaveState,
                range: "30 - 45 Hz",
                presetHz: 40.0,
                title: "Gamma Wave",
                desc: "Peak cognitive processing, hemispheric binding, transcendental insight.",
                color: "#EC4899",
              },
            ].map((bw) => {
              const isCurrentBrainwave =
                engineState.mode === "binaural_beats" &&
                engineState.binauralBrainwave === bw.state;

              return (
                <div
                  key={bw.state}
                  className={`rounded-xl p-4 border transition-all flex flex-col justify-between gap-3 ${
                    isCurrentBrainwave
                      ? "bg-[#181826] border-white shadow-xl ring-2 ring-cyan-400/40"
                      : "bg-[#0E0E14] hover:bg-[#14141C] border-[#1F1F24]"
                  }`}
                  style={{
                    borderTopColor: bw.color,
                    borderTopWidth: "3px",
                  }}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="font-bold text-white uppercase">{bw.title}</span>
                      <span className="text-[#8E9299]">{bw.range}</span>
                    </div>

                    <div className="text-xl font-bold font-mono text-white">
                      +{bw.presetHz} <span className="text-xs text-[#8E9299]">Hz</span>
                    </div>

                    <p className="text-[11px] text-[#8E9299] leading-snug">
                      {bw.desc}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleBinauralPreset(bw.presetHz, bw.state)}
                    className="w-full py-2 px-2.5 rounded-lg text-xs font-mono font-bold bg-[#161620] hover:bg-[#20202E] text-white border border-white/10 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Brain className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Engage {bw.title}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB E: Manual Frequency Tuner */}
      {activeSubTab === "custom_tuner" && (
        <div className="p-5 rounded-xl bg-[#121216] border border-[#1F1F24] space-y-5">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#F27D26]" />
              <span>Continuous Microtonal Hertz Slider & Dial</span>
            </h3>
            <p className="text-xs text-[#8E9299]">
              Tune to any continuous frequency from 20 Hz to 2500 Hz with sub-Hertz precision.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#0A0A0E] p-4 rounded-xl border border-[#1F1F24]">
            <div className="text-center sm:text-left">
              <span className="text-4xl font-extrabold font-mono text-[#F27D26]">
                {customInputHz} <span className="text-sm font-normal text-[#8E9299]">Hz</span>
              </span>
              <p className="text-[10px] font-mono text-[#8E9299]">Current Oscillator Center</p>
            </div>

            <div className="flex-1 w-full space-y-2">
              <input
                type="range"
                min="20"
                max="2000"
                step="1"
                value={customInputHz}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setCustomInputHz(val);
                  harmonicsAudioEngine.setFrequency(val, `Custom ${val} Hz Microtone`);
                }}
                className="w-full accent-[#F27D26] cursor-pointer"
              />

              <div className="flex items-center justify-between text-[10px] font-mono text-[#8E9299]">
                <span>20 Hz (Sub-Bass)</span>
                <span>432 Hz (Pythagorean)</span>
                <span>528 Hz (Solfeggio)</span>
                <span>1000 Hz</span>
                <span>2000 Hz</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {[-10, -1, 1, 10].map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => {
                    const next = Math.max(20, Math.min(2500, customInputHz + step));
                    setCustomInputHz(next);
                    harmonicsAudioEngine.setFrequency(next, `Custom ${next} Hz Microtone`);
                  }}
                  className="px-2.5 py-1.5 rounded bg-[#16161E] hover:bg-[#20202A] text-white border border-[#22222A] text-xs font-mono font-bold cursor-pointer"
                >
                  {step > 0 ? `+${step}` : step}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. Quick Sacred Meditation Presets Bar */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-[#121216] via-[#161622] to-[#121216] border border-[#1F1F24] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#F27D26]" />
          <span className="text-xs font-bold text-white font-mono uppercase">
            Quick Resonance Presets:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: "DNA Repair (528 Hz + Theta)", hz: 528, mode: "binaural_beats" as const, delta: 7.83, bw: "theta" as const },
            { label: "Golden Spiral (Fibonacci Cycle)", hz: 144, mode: "fibonacci_arpeggiator" as const },
            { label: "Crown Awakening (963 Hz)", hz: 963, mode: "harmonic_rich" as const },
            { label: "Water Crystal (432 Hz Pythagorean)", hz: 432, mode: "harmonic_rich" as const },
            { label: "Deep Root Grounding (396 Hz)", hz: 396, mode: "pure_sine" as const },
          ].map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                harmonicsAudioEngine.setFrequency(preset.hz, preset.label);
                harmonicsAudioEngine.setMode(preset.mode);
                if (preset.delta && preset.bw) {
                  harmonicsAudioEngine.setBinauralBeatHz(preset.delta, preset.bw);
                }
                if (!engineState.isPlaying) {
                  harmonicsAudioEngine.start();
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-[#0A0A0E] hover:bg-[#1A1A24] border border-[#242430] hover:border-[#F27D26]/40 text-xs font-mono text-[#E0E0E0] hover:text-[#F27D26] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Play className="w-2.5 h-2.5 fill-current" />
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HarmonicsStudio;
