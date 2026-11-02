import React, { useState, useEffect, useRef } from "react";
import {
  Volume2,
  VolumeX,
  Play,
  Square,
  Radio,
  Sliders,
  Sparkles,
  Zap,
  Activity,
  Music,
  Layers,
  Cpu,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Palette,
  Maximize2,
  ExternalLink,
} from "lucide-react";
import { genreSoundscapeEngine } from "../utils/genreSoundscapeEngine";
import { Web3Genre, GENRE_DEFINITIONS } from "../types";

// Generated visual asset references
import synthUiControlsImg from "../assets/images/synth_ui_controls_1789414858830.jpg";
import synthRackModuleImg from "../assets/images/synth_rack_module_1789414885956.jpg";
import synthGameUiKitImg from "../assets/images/synth_game_uikit_1789414961660.jpg";

export type SynthUiStyle = "vector_daw" | "photorealistic_rack" | "game_uikit";

interface SynthStyleConfig {
  id: SynthUiStyle;
  label: string;
  shortLabel: string;
  imageSrc: string;
  description: string;
  promptText: string;
  badge: string;
}

const SYNTH_STYLES: SynthStyleConfig[] = [
  {
    id: "vector_daw",
    label: "Digital Audio Workstation (Vector Flat UI)",
    shortLabel: "Vector DAW",
    imageSrc: synthUiControlsImg,
    description: "Clean, flat modern DAW style with illuminated micro-LED buttons, crisp rotary rings, and high-usability dark dashboard aesthetics.",
    badge: "Vector / Flat UI",
    promptText: `A clean, modern synthesizer user interface vector icon set showing active controls, flat UI design, digital audio workstation style. Features glowing lit-up buttons, illuminated micro-LED indicators, retro-futuristic audio synth control card, functional toggles, rotary knobs with LED rings, smooth gradients, crisp line art, dark mode dashboard background, high usability aesthetic, isolated design elements.`,
  },
  {
    id: "photorealistic_rack",
    label: "Photorealistic Synthesizer Rack Module",
    shortLabel: "Hardware Rack",
    imageSrc: synthRackModuleImg,
    description: "Analog hardware modular synthesizer rack with tactile mechanical switches, back-lit acrylic buttons, and soft studio depth of field.",
    badge: "Photorealistic",
    promptText: `A photorealistic synthesizer rack module user interface showing active controls, tactile mechanical switches, back-lit acrylic buttons, close-up studio shot, soft depth of field. Features glowing lit-up buttons, illuminated micro-LED indicators, retro-futuristic audio synth control card, functional toggles, rotary knobs with LED rings, smooth gradients, dark mode dashboard background, high usability aesthetic.`,
  },
  {
    id: "game_uikit",
    label: "2D Game Asset & Neon UI Kit",
    shortLabel: "Game Asset UI",
    imageSrc: synthGameUiKitImg,
    description: "2D interactive audio card with illuminated neon buttons, clean sprite sheet layout, and vibrant cyber synth controls.",
    badge: "2D Neon Sprite",
    promptText: `2D game asset UI kit and interactive audio card showing active controls, illuminated neon buttons, clean sprite sheet layout, transparent background, digital audio workstation style. Features glowing lit-up buttons, illuminated micro-LED indicators, retro-futuristic audio synth control card, functional toggles, rotary knobs with LED rings, crisp line art, high usability aesthetic.`,
  },
];

// Interactive live synth pads that play real frequencies using Web Audio API
const SYNTH_PAD_KEYS = [
  { note: "C4", freq: 261.63, label: "ROOT", color: "#F27D26" },
  { note: "D4", freq: 293.66, label: "SEC", color: "#00F0FF" },
  { note: "E4", freq: 329.63, label: "TERT", color: "#10B981" },
  { note: "G4", freq: 392.0, label: "FIFTH", color: "#A855F7" },
  { note: "A4", freq: 440.0, label: "OCT", color: "#F59E0B" },
];

export const SoundscapeToolbar: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.35);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [activeGenres, setActiveGenres] = useState<Record<Web3Genre, boolean>>({
    defi_liquidity: true,
    onchain_identity: false,
    gaming_media: false,
    depin_infra: false,
  });
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [selectedStyle, setSelectedStyle] = useState<SynthUiStyle>("vector_daw");
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [activePadIdx, setActivePadIdx] = useState<number | null>(null);
  const [audioMeterLevels, setAudioMeterLevels] = useState<number[]>([4, 6, 9, 7, 5, 8, 10, 6]);

  const animationFrameRef = useRef<number | null>(null);

  // Synchronize state with genreSoundscapeEngine
  useEffect(() => {
    const unsubscribe = genreSoundscapeEngine.subscribe((state) => {
      setIsPlaying(state.isPlaying);
      setActiveGenres(state.activeGenres);
      setVolume(state.volume);
      setIsMuted(state.isMuted);
    });

    setIsPlaying(genreSoundscapeEngine.getIsPlaying());
    setActiveGenres(genreSoundscapeEngine.getActiveGenres());

    return () => {
      unsubscribe();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Animate audio meter LEDs when playing
  useEffect(() => {
    let lastTime = 0;
    const animateMeters = (time: number) => {
      if (isPlaying && !isMuted) {
        if (time - lastTime > 120) {
          const freqData = genreSoundscapeEngine.getAudioFrequencyData();
          if (freqData && freqData.length > 0) {
            const nextLevels = [
              Math.min(10, Math.floor((freqData[0] || 40) / 25)),
              Math.min(10, Math.floor((freqData[2] || 60) / 25)),
              Math.min(10, Math.floor((freqData[4] || 80) / 25)),
              Math.min(10, Math.floor((freqData[6] || 50) / 25)),
              Math.min(10, Math.floor((freqData[8] || 70) / 25)),
              Math.min(10, Math.floor((freqData[10] || 90) / 25)),
              Math.min(10, Math.floor((freqData[12] || 45) / 25)),
              Math.min(10, Math.floor((freqData[14] || 65) / 25)),
            ];
            setAudioMeterLevels(nextLevels);
          } else {
            setAudioMeterLevels((prev) =>
              prev.map(() => Math.floor(Math.random() * 7 + 3))
            );
          }
          lastTime = time;
        }
      } else {
        setAudioMeterLevels([1, 1, 1, 1, 1, 1, 1, 1]);
      }
      animationFrameRef.current = requestAnimationFrame(animateMeters);
    };

    animationFrameRef.current = requestAnimationFrame(animateMeters);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, isMuted]);

  const handleTogglePlay = () => {
    genreSoundscapeEngine.togglePlay();
  };

  const handleToggleMute = () => {
    genreSoundscapeEngine.toggleMute();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    genreSoundscapeEngine.setVolume(val);
  };

  const handleToggleGenre = (genre: Web3Genre) => {
    genreSoundscapeEngine.toggleGenreLayer(genre);
  };

  const handleTriggerPad = (padIndex: number, freq: number) => {
    setActivePadIdx(padIndex);
    setTimeout(() => setActivePadIdx(null), 250);

    // Live Web Audio synthesize single tone
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // Audio context fall-through
    }
  };

  const currentStyleConfig =
    SYNTH_STYLES.find((s) => s.id === selectedStyle) || SYNTH_STYLES[0];

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(currentStyleConfig.promptText);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  return (
    <div className="w-full bg-[#0D0E12] border border-[#1F222E] rounded-xl overflow-hidden shadow-2xl transition-all mb-4">
      {/* Top Primary Synth Bar */}
      <div className="px-4 py-3 bg-[#12141A] border-b border-[#1F222E] flex flex-wrap items-center justify-between gap-3">
        {/* Left: Synth Brand & Status LED */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={handleTogglePlay}
              className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold transition-all cursor-pointer ${
                isPlaying
                  ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(0,240,255,0.6)] border border-cyan-400"
                  : "bg-[#181B22] text-[#8E9299] hover:text-white border border-[#262B37]"
              }`}
              title={isPlaying ? "Pause Soundscape Synth" : "Start Soundscape Synth"}
            >
              {isPlaying ? (
                <Square className="w-4 h-4 fill-white animate-pulse" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>
            {/* Illuminated Micro-LED Status Ring */}
            <span
              className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-black ${
                isPlaying
                  ? "bg-emerald-400 shadow-[0_0_8px_#34d399] animate-ping"
                  : "bg-red-500/60"
              }`}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-white tracking-wider uppercase flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-cyan-400" />
                <span>Web3 Synth Station</span>
              </span>
              <span className="px-1.5 py-0.2 text-[9px] font-mono rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                Active DAW
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-[#8E9299]">
              <span className="flex items-center gap-1">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isPlaying ? "bg-cyan-400 animate-pulse" : "bg-slate-600"
                  }`}
                />
                {isPlaying ? "72 BPM Synthesizer Loop" : "Standby • Click to engage"}
              </span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">{currentStyleConfig.shortLabel}</span>
            </div>
          </div>
        </div>

        {/* Center: Live Illuminated Audio Frequency VU Meter */}
        <div className="hidden sm:flex items-center gap-1 bg-[#0A0B0E] px-3 py-1.5 rounded-lg border border-[#1A1D26]">
          <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider mr-1">
            VU
          </span>
          {audioMeterLevels.map((lvl, idx) => (
            <div key={idx} className="w-1.5 h-6 bg-[#161820] rounded-xs flex flex-col justify-end overflow-hidden">
              <div
                className="w-full transition-all duration-75 rounded-xs"
                style={{
                  height: `${lvl * 10}%`,
                  backgroundColor:
                    lvl > 8 ? "#ef4444" : lvl > 5 ? "#f59e0b" : "#10b981",
                  boxShadow:
                    isPlaying && lvl > 3
                      ? `0 0 6px ${lvl > 8 ? "#ef4444" : lvl > 5 ? "#f59e0b" : "#10b981"}`
                      : "none",
                }}
              />
            </div>
          ))}
        </div>

        {/* 4 Web3 Genre Synth Toggles (Active, Illuminated with Micro-LEDs) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(Object.keys(GENRE_DEFINITIONS) as Web3Genre[]).map((genre) => {
            const def = GENRE_DEFINITIONS[genre];
            const active = activeGenres[genre];
            return (
              <button
                key={genre}
                type="button"
                onClick={() => handleToggleGenre(genre)}
                className={`relative px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
                  active
                    ? `${def.badgeBg} ${def.badgeBorder} ${def.badgeText} shadow-[0_0_10px_rgba(255,255,255,0.08)]`
                    : "bg-[#141720] border-[#222736] text-[#717684] hover:text-slate-300"
                }`}
                title={def.soundscapeDescription}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    active
                      ? isPlaying
                        ? "bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse"
                        : "bg-emerald-400"
                      : "bg-slate-600"
                  }`}
                />
                <span>{def.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Master Volume & Expand Details */}
        <div className="flex items-center gap-2.5 ml-auto">
          {/* Mute Toggle */}
          <button
            type="button"
            onClick={handleToggleMute}
            className={`p-1.5 rounded border transition-all cursor-pointer ${
              isMuted
                ? "bg-red-500/10 border-red-500/30 text-red-400"
                : "bg-[#161820] border-[#242835] text-[#8E9299] hover:text-white"
            }`}
            title={isMuted ? "Unmute Master Audio" : "Mute Master Audio"}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Volume Slider */}
          <div className="flex items-center gap-1.5 w-24">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-full accent-cyan-400 h-1.5 bg-[#1B1E28] rounded cursor-pointer"
              title={`Master Volume: ${Math.round(volume * 100)}%`}
            />
          </div>

          {/* Expand Synth Rack Controls Button */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2.5 py-1 rounded bg-[#1A1E29] hover:bg-[#232838] border border-[#2B3245] text-cyan-300 font-mono text-xs flex items-center gap-1 cursor-pointer transition-all"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{isExpanded ? "Collapse Rack" : "Synth Rack & Prompts"}</span>
            {isExpanded ? (
              <ChevronUp className="w-3 h-3 ml-0.5" />
            ) : (
              <ChevronDown className="w-3 h-3 ml-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Synthesizer UI Control Card & Interactive Pad Station */}
      {isExpanded && (
        <div className="p-4 sm:p-5 bg-[#0A0B0F] border-t border-[#1F222E] space-y-5 animate-fade-in text-xs">
          {/* Top Style Selector Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1A1D27]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white uppercase text-[11px] tracking-wider font-mono flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                <span>Illuminated UI Style Generator:</span>
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {SYNTH_STYLES.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setSelectedStyle(style.id)}
                    className={`px-3 py-1 rounded text-xs font-mono font-medium transition-all cursor-pointer border ${
                      selectedStyle === style.id
                        ? "bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)] font-bold"
                        : "bg-[#141720] border-[#222736] text-[#8E9299] hover:text-white"
                    }`}
                  >
                    {style.shortLabel}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyPrompt}
              className="px-3 py-1.5 rounded bg-[#161922] hover:bg-[#202533] border border-[#2B3245] text-white flex items-center gap-1.5 font-mono text-xs cursor-pointer transition-all shadow-sm"
            >
              {copiedPrompt ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span>{copiedPrompt ? "Prompt Copied!" : "Copy Prompt Framework"}</span>
            </button>
          </div>

          {/* Interactive Synthesizer Rack Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left: Visual UI Asset Showcase (Active illuminated synth buttons & rotary knobs) */}
            <div className="lg:col-span-6 bg-[#12141A] rounded-xl border border-[#1F222E] p-3.5 space-y-3">
              <div className="flex items-center justify-between text-[#8E9299]">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-white">
                    {currentStyleConfig.label}
                  </span>
                  <span className="px-2 py-0.2 rounded text-[10px] font-mono bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    {currentStyleConfig.badge}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-cyan-400">16:9 Isolated UI</span>
              </div>

              {/* Generated Image Asset Container with Glowing Active Ring */}
              <div className="relative rounded-lg overflow-hidden border border-[#262B37] group bg-black shadow-inner aspect-video">
                <img
                  src={currentStyleConfig.imageSrc}
                  alt={currentStyleConfig.label}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-70 pointer-events-none" />
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] font-mono bg-black/60 backdrop-blur-md px-3 py-1.5 rounded border border-white/10 text-slate-300">
                  <span className="truncate mr-2">{currentStyleConfig.description}</span>
                  <span className="text-emerald-400 font-bold shrink-0">Ready for Interaction</span>
                </div>
              </div>

              <p className="text-[11px] text-[#8E9299] leading-relaxed">
                {currentStyleConfig.description}
              </p>
            </div>

            {/* Right: Live Interactive Synth Pads & Prompt Framework Inspector */}
            <div className="lg:col-span-6 space-y-4">
              {/* Interactive Audio Synth Trigger Pads */}
              <div className="bg-[#12141A] rounded-xl border border-[#1F222E] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-white text-xs font-mono uppercase tracking-wider">
                      Interactive Live Synth Trigger Pads
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">
                    Web Audio 44.1kHz
                  </span>
                </div>

                <p className="text-[11px] text-[#8E9299]">
                  Click each illuminated button to trigger harmonic pentatonic sine sweeps and micro-LED pulses:
                </p>

                <div className="grid grid-cols-5 gap-2 pt-1">
                  {SYNTH_PAD_KEYS.map((pad, idx) => (
                    <button
                      key={pad.note}
                      type="button"
                      onClick={() => handleTriggerPad(idx, pad.freq)}
                      className={`relative flex flex-col items-center justify-center p-3 rounded-lg border transition-all cursor-pointer font-mono ${
                        activePadIdx === idx
                          ? "bg-cyan-500 text-black shadow-[0_0_18px_#00f0ff] border-white scale-95"
                          : "bg-[#181B24] border-[#2A3040] text-white hover:border-cyan-400/50 hover:bg-[#1E2330]"
                      }`}
                    >
                      <span className="text-xs font-bold">{pad.note}</span>
                      <span className="text-[9px] text-[#8E9299] mt-0.5">{pad.label}</span>
                      <span
                        className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${
                          activePadIdx === idx
                            ? "bg-white animate-ping"
                            : "bg-cyan-400/60"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Exact AI Prompt Framework Box (Ready for Copy / Export) */}
              <div className="bg-[#12141A] rounded-xl border border-[#1F222E] p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Active Prompt Framework ({currentStyleConfig.shortLabel})</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="text-cyan-400 hover:text-cyan-300 font-mono text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </button>
                </div>

                <div className="p-3 bg-[#0A0B0F] rounded-lg border border-[#1C202C] text-[#8E9299] font-mono text-[11px] leading-relaxed max-h-36 overflow-y-auto select-all">
                  {currentStyleConfig.promptText}
                </div>

                <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between pt-1 border-t border-[#1C202C]">
                  <span>Style adjustments: Vector Flat UI • Photorealistic Rack • 2D Game Asset</span>
                  <span className="text-cyan-400">Sound-ready synth elements</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
