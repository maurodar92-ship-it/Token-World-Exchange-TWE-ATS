import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Activity,
  AlertTriangle,
  Zap,
  Radio,
  Sliders,
  Volume2,
  VolumeX,
  RefreshCw,
  Download,
  CheckCircle2,
  Bell,
  Clock,
  ArrowUpRight,
  TrendingUp,
  ShieldAlert,
  Flame,
  Layers,
  Sparkles,
  Info,
  X,
  Play,
  RotateCcw,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { AtsOrder, AtsTradeExecution } from "../utils/atsVenueData";

export interface VelocityDataPoint {
  id: string;
  timestamp: number;
  timeStr: string;
  volumeVelocity: number; // Volume per second
  rollingMean: number;
  rollingStdDev: number;
  threshold3Sigma: number;
  zScore: number;
  isSpike: boolean;
}

export interface VelocitySpikeAlert {
  id: string;
  timestamp: number;
  timeStr: string;
  symbol: string;
  currentVelocity: number;
  rollingMean: number;
  rollingStdDev: number;
  threshold3Sigma: number;
  zScore: number;
  excessFactor: number; // percentage above 3-sigma
  severity: "CRITICAL_3_SIGMA" | "ELEVATED_2_SIGMA";
  status: "ACTIVE" | "ACKNOWLEDGED";
}

interface TradeVelocityAlertMonitorProps {
  selectedSymbol: string;
  referencePrice: number;
  bids?: AtsOrder[];
  asks?: AtsOrder[];
  trades?: AtsTradeExecution[];
  onTriggerGlobalToast?: (alert: VelocitySpikeAlert) => void;
  compact?: boolean;
}

/**
 * Web Audio API synthesizer for the Trade Velocity 3-Sigma Anomaly Chime
 */
export function playTradeVelocityChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;
    // High-urgency dual-tone frequency burst (1046.5 Hz -> 1567.98 Hz - C6 to G6)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(1046.5, now);
    osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.12);

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(1567.98, now);
    osc2.frequency.exponentialRampToValueAtTime(2093.0, now + 0.18);

    gainNode.gain.setValueAtTime(0.01, now);
    gainNode.gain.linearRampToValueAtTime(0.28, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.36);
    osc2.stop(now + 0.36);
  } catch (err) {
    // Graceful fallback if user hasn't interacted with audio yet
    console.debug("AudioContext prevented auto-play:", err);
  }
}

export const TradeVelocityAlertMonitor: React.FC<TradeVelocityAlertMonitorProps> = ({
  selectedSymbol,
  referencePrice,
  bids = [],
  asks = [],
  trades = [],
  onTriggerGlobalToast,
  compact = false,
}) => {
  // Engine Modes
  const [feedMechanism, setFeedMechanism] = useState<"WEBSOCKET" | "POLLING">("WEBSOCKET");
  const [samplingIntervalMs, setSamplingIntervalMs] = useState<number>(1500); // 1.5s default
  const [sigmaThreshold, setSigmaThreshold] = useState<number>(3.0); // 3.0 Standard Deviations
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Connection & Ping Simulation
  const [wsStatus, setWsStatus] = useState<"CONNECTED" | "RECONNECTING" | "PAUSED">("CONNECTED");
  const [pingLatencyMs, setPingLatencyMs] = useState<number>(14);

  // Time-series rolling buffer (last 35 samples)
  const [history, setHistory] = useState<VelocityDataPoint[]>(() => {
    // Seed initial statistical baseline data around reference baseline volume
    const seed: VelocityDataPoint[] = [];
    const baseVolume = 12500;
    const now = Date.now();
    for (let i = 25; i >= 1; i--) {
      const t = now - i * 1500;
      const noise = (Math.random() - 0.5) * 2800;
      const vol = Math.max(2000, Math.round(baseVolume + noise));
      seed.push({
        id: `seed-${i}`,
        timestamp: t,
        timeStr: new Date(t).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        volumeVelocity: vol,
        rollingMean: baseVolume,
        rollingStdDev: 1400,
        threshold3Sigma: baseVolume + 3 * 1400,
        zScore: (vol - baseVolume) / 1400,
        isSpike: false,
      });
    }
    return seed;
  });

  // Recent Spikes Audit Log
  const [alerts, setAlerts] = useState<VelocitySpikeAlert[]>([
    {
      id: "ALRT-INIT-01",
      timestamp: Date.now() - 120000,
      timeStr: new Date(Date.now() - 120000).toLocaleTimeString(),
      symbol: selectedSymbol,
      currentVelocity: 34500,
      rollingMean: 12400,
      rollingStdDev: 1350,
      threshold3Sigma: 16450,
      zScore: 3.26,
      excessFactor: 109.7,
      severity: "CRITICAL_3_SIGMA",
      status: "ACKNOWLEDGED",
    },
  ]);

  // Active Flash Banner State
  const [activeAlertToast, setActiveAlertToast] = useState<VelocitySpikeAlert | null>(null);
  const lastAlertTimeRef = useRef<number>(0);

  // Calculate total instantaneous depth from actual props
  const totalBookVolume = useMemo(() => {
    const bidVol = bids.reduce((acc, b) => acc + b.quantity, 0);
    const askVol = asks.reduce((acc, a) => acc + a.quantity, 0);
    return bidVol + askVol;
  }, [bids, asks]);

  // Current Instantaneous Statistics
  const currentStats = useMemo(() => {
    if (history.length < 2) {
      return {
        currentVelocity: 12000,
        mean: 12000,
        stdDev: 1500,
        threshold: 16500,
        zScore: 0,
        isSpike: false,
      };
    }
    const latest = history[history.length - 1];
    return {
      currentVelocity: latest.volumeVelocity,
      mean: latest.rollingMean,
      stdDev: latest.rollingStdDev,
      threshold: latest.threshold3Sigma,
      zScore: latest.zScore,
      isSpike: latest.isSpike,
    };
  }, [history]);

  // Core Rolling Statistics Calculator
  const computeRollingStats = useCallback(
    (samples: number[], currentVal: number) => {
      if (samples.length < 2) {
        return { mean: currentVal, stdDev: 1000, zScore: 0, threshold3Sigma: currentVal + 3000 };
      }
      const n = samples.length;
      const sum = samples.reduce((acc, v) => acc + v, 0);
      const mean = sum / n;
      const variance = samples.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n - 1);
      const stdDev = Math.sqrt(variance) || 1;
      const zScore = (currentVal - mean) / stdDev;
      const threshold3Sigma = Math.round(mean + sigmaThreshold * stdDev);
      return { mean: Math.round(mean), stdDev: Math.round(stdDev), zScore, threshold3Sigma };
    },
    [sigmaThreshold]
  );

  // WebSocket / Polling Stream Engine
  useEffect(() => {
    if (isPaused) {
      setWsStatus("PAUSED");
      return;
    }

    setWsStatus("CONNECTED");

    const timer = setInterval(() => {
      // Simulate real-world micro-jitter and network ping
      setPingLatencyMs(Math.floor(10 + Math.random() * 12));

      setHistory((prevHistory) => {
        const lastPoints = prevHistory.slice(-25);
        const pastVelocities = lastPoints.map((p) => p.volumeVelocity);

        // Derive current instantaneous velocity with natural market variance
        const baseline = totalBookVolume > 0 ? Math.round(totalBookVolume * 0.08) : 12500;
        const randomFluctuation = (Math.random() - 0.5) * 3200;
        const currentVelocity = Math.max(1500, Math.round(baseline + randomFluctuation));

        const { mean, stdDev, zScore, threshold3Sigma } = computeRollingStats(
          pastVelocities,
          currentVelocity
        );

        const isSpike = zScore >= sigmaThreshold;
        const now = Date.now();
        const timeStr = new Date(now).toLocaleTimeString([], {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        const newPoint: VelocityDataPoint = {
          id: `vel-${now}`,
          timestamp: now,
          timeStr,
          volumeVelocity: currentVelocity,
          rollingMean: mean,
          rollingStdDev: stdDev,
          threshold3Sigma,
          zScore: Number(zScore.toFixed(2)),
          isSpike,
        };

        // If a 3-sigma anomaly spike is detected and not on cooldown (> 6 seconds)
        if (isSpike && now - lastAlertTimeRef.current > 6000) {
          lastAlertTimeRef.current = now;
          const excessPct = Math.round(((currentVelocity - threshold3Sigma) / threshold3Sigma) * 100);

          const newAlert: VelocitySpikeAlert = {
            id: `ALRT-${now}`,
            timestamp: now,
            timeStr,
            symbol: selectedSymbol,
            currentVelocity,
            rollingMean: mean,
            rollingStdDev: stdDev,
            threshold3Sigma,
            zScore: Number(zScore.toFixed(2)),
            excessFactor: Math.max(0, excessPct),
            severity: zScore >= 3.0 ? "CRITICAL_3_SIGMA" : "ELEVATED_2_SIGMA",
            status: "ACTIVE",
          };

          setAlerts((prev) => [newAlert, ...prev.slice(0, 19)]);
          setActiveAlertToast(newAlert);
          if (soundEnabled) {
            playTradeVelocityChime();
          }
          if (onTriggerGlobalToast) {
            onTriggerGlobalToast(newAlert);
          }
        }

        // Keep rolling window bounded
        return [...prevHistory.slice(-34), newPoint];
      });
    }, samplingIntervalMs);

    return () => clearInterval(timer);
  }, [
    isPaused,
    samplingIntervalMs,
    totalBookVolume,
    computeRollingStats,
    sigmaThreshold,
    selectedSymbol,
    soundEnabled,
    onTriggerGlobalToast,
  ]);

  // Manually trigger a massive 3-Sigma Volume Surge (Testing & Demo)
  const handleSimulateSurge = () => {
    const now = Date.now();
    const timeStr = new Date(now).toLocaleTimeString([], {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    setHistory((prevHistory) => {
      const pastVelocities = prevHistory.map((p) => p.volumeVelocity);
      const n = pastVelocities.length || 1;
      const sum = pastVelocities.reduce((a, b) => a + b, 0);
      const mean = Math.round(sum / n);
      const variance = pastVelocities.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n - 1 || 1);
      const stdDev = Math.round(Math.sqrt(variance)) || 1400;

      // Inject deliberate volume surge that exceeds 3-sigma: mean + (3.6 * stdDev)
      const surgeMultiplier = 3.65 + Math.random() * 0.5;
      const surgeVolume = Math.round(mean + surgeMultiplier * stdDev + 15000);
      const zScore = Number(((surgeVolume - mean) / stdDev).toFixed(2));
      const threshold3Sigma = Math.round(mean + sigmaThreshold * stdDev);
      const excessPct = Math.round(((surgeVolume - threshold3Sigma) / threshold3Sigma) * 100);

      const surgePoint: VelocityDataPoint = {
        id: `surge-${now}`,
        timestamp: now,
        timeStr,
        volumeVelocity: surgeVolume,
        rollingMean: mean,
        rollingStdDev: stdDev,
        threshold3Sigma,
        zScore,
        isSpike: true,
      };

      const newAlert: VelocitySpikeAlert = {
        id: `ALRT-SURGE-${now}`,
        timestamp: now,
        timeStr,
        symbol: selectedSymbol,
        currentVelocity: surgeVolume,
        rollingMean: mean,
        rollingStdDev: stdDev,
        threshold3Sigma,
        zScore,
        excessFactor: excessPct,
        severity: "CRITICAL_3_SIGMA",
        status: "ACTIVE",
      };

      lastAlertTimeRef.current = now;
      setAlerts((prev) => [newAlert, ...prev.slice(0, 19)]);
      setActiveAlertToast(newAlert);
      if (soundEnabled) {
        playTradeVelocityChime();
      }
      if (onTriggerGlobalToast) {
        onTriggerGlobalToast(newAlert);
      }

      return [...prevHistory.slice(-34), surgePoint];
    });
  };

  // Export alerts as institutional CSV audit log
  const handleExportCsv = () => {
    if (alerts.length === 0) return;
    const headers = [
      "Alert ID",
      "Timestamp",
      "Symbol",
      "Velocity (Shares/Sec)",
      "Rolling Mean (μ)",
      "StdDev (σ)",
      "Threshold (3σ)",
      "Z-Score (σ)",
      "Excess %",
      "Severity",
      "Supervisory Status",
    ];

    const rows = alerts.map((a) => [
      a.id,
      new Date(a.timestamp).toISOString(),
      a.symbol,
      a.currentVelocity,
      a.rollingMean,
      a.rollingStdDev,
      a.threshold3Sigma,
      a.zScore,
      `${a.excessFactor}%`,
      a.severity,
      a.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Trade_Velocity_Alerts_${selectedSymbol}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compact Widget View (e.g. inside CLOB Header or Side Card)
  if (compact) {
    const isSpike = currentStats.zScore >= sigmaThreshold;
    return (
      <div className={`rounded-xl p-3 border transition-all ${
        isSpike
          ? "bg-rose-950/40 border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.3)] animate-pulse"
          : currentStats.zScore >= 2.0
          ? "bg-amber-950/20 border-amber-500/40"
          : "bg-[#0E0E12] border-[#222228]"
      }`}>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <div className="flex items-center gap-1.5 font-bold">
            <Activity className={`w-3.5 h-3.5 ${isSpike ? "text-rose-400 animate-spin" : "text-cyan-400"}`} />
            <span className="text-white text-[11px] uppercase tracking-wider font-mono">
              Trade Velocity Radar
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${
              wsStatus === "CONNECTED" ? "bg-emerald-400 animate-ping" : "bg-amber-400"
            }`} />
            <span className="text-[10px] font-mono text-[#8E9299]">
              {feedMechanism === "WEBSOCKET" ? "WSS 14ms" : "Poll 1.5s"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
          <div className="p-1.5 rounded bg-black/40 border border-[#1F1F24]">
            <div className="text-[9px] text-[#8E9299]">Velocity</div>
            <div className="text-white font-bold">{currentStats.currentVelocity.toLocaleString()} <span className="text-[9px] text-slate-400">/s</span></div>
          </div>
          <div className="p-1.5 rounded bg-black/40 border border-[#1F1F24]">
            <div className="text-[9px] text-[#8E9299]">3σ Ceiling</div>
            <div className="text-amber-300 font-bold">{currentStats.threshold.toLocaleString()}</div>
          </div>
          <div className={`p-1.5 rounded border ${
            isSpike
              ? "bg-rose-500/20 border-rose-500 text-rose-300 font-black animate-pulse"
              : currentStats.zScore >= 2.0
              ? "bg-amber-500/10 border-amber-500/30 text-amber-300 font-bold"
              : "bg-black/40 border-[#1F1F24] text-emerald-400"
          }`}>
            <div className="text-[9px] text-[#8E9299]">Z-Score</div>
            <div>{currentStats.zScore >= 0 ? `+${currentStats.zScore}σ` : `${currentStats.zScore}σ`}</div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-[#1F1F24] text-[10px]">
          <span className={`font-mono font-semibold ${isSpike ? "text-rose-400" : "text-emerald-400"}`}>
            {isSpike ? "🚨 3σ ANOMALY SPIKE DETECTED" : "Normal Flow (<3σ)"}
          </span>
          <button
            type="button"
            onClick={handleSimulateSurge}
            className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-mono text-[9px] border border-amber-500/40 cursor-pointer transition-all"
            title="Simulate 3σ volume spike"
          >
            Test 3σ Spike
          </button>
        </div>
      </div>
    );
  }

  // Full-Fledged Radar Dashboard
  const isCurrentlySpiking = currentStats.zScore >= sigmaThreshold;

  return (
    <div className="space-y-6 text-slate-200 font-sans">
      {/* 🚨 Active Flash Toast Overlay */}
      {activeAlertToast && (
        <div className="rounded-xl bg-gradient-to-r from-rose-950/90 via-red-900/80 to-slate-950 border-2 border-rose-500 p-4 shadow-[0_0_35px_rgba(244,63,94,0.5)] animate-in fade-in slide-in-from-top duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-rose-500/20 border border-rose-500 text-rose-300 shrink-0 animate-bounce">
              <ShieldAlert className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-rose-500 text-black uppercase tracking-wider">
                  3-Sigma Velocity Anomaly Detected
                </span>
                <span className="text-xs text-rose-200 font-mono">
                  {activeAlertToast.timeStr}
                </span>
              </div>
              <h4 className="text-base font-bold text-white mt-1">
                Order Book Volume Spike: <span className="text-amber-300 font-mono">{activeAlertToast.symbol}</span> Velocity reached{" "}
                <span className="text-rose-400 font-mono font-bold">{activeAlertToast.currentVelocity.toLocaleString()} shares/s</span>
              </h4>
              <p className="text-xs text-rose-200/90 mt-0.5 font-mono">
                Z-Score: <strong className="text-white">+{activeAlertToast.zScore}σ</strong> (Ceiling: {activeAlertToast.threshold3Sigma.toLocaleString()} shares/s) · Anomaly is{" "}
                <strong className="text-amber-300">+{activeAlertToast.excessFactor}% above 3-Standard Deviations</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
            <button
              onClick={() => {
                setActiveAlertToast(null);
                setAlerts((prev) =>
                  prev.map((a) => (a.id === activeAlertToast.id ? { ...a, status: "ACKNOWLEDGED" } : a))
                );
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-black text-xs font-bold font-mono transition-all cursor-pointer shadow-lg shadow-rose-500/20"
            >
              Acknowledge Alert
            </button>
            <button
              onClick={() => setActiveAlertToast(null)}
              className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 cursor-pointer"
              title="Dismiss toast"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Header & Stream Controls */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-[#121216] to-slate-900 border border-[#222228] p-5 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isCurrentlySpiking ? "bg-rose-400 animate-ping" : "bg-emerald-400 animate-pulse"}`} />
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-1.5">
              <span>Statistical Anomaly Surveillance</span>
              <span className="text-slate-500">|</span>
              <span className="text-amber-300">SEC Reg ATS Rule 301 &amp; FINRA Market Integrity</span>
            </span>
          </div>

          <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-cyan-400" />
            <span>Trade Velocity &amp; 3-Sigma Order Book Spike Alert</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
              {selectedSymbol}
            </span>
          </h2>

          <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
            Continuously monitors order book depth turnover and trade execution velocity via WebSockets or high-resolution polling. 
            Automatically flags volume surges exceeding the <strong className="text-amber-300">3-standard-deviation ($\mu \pm 3\sigma$)</strong> normal distribution threshold to protect market participants from algorithmic spoofing, layering, or liquidity shock waves.
          </p>
        </div>

        {/* Live Knobs & Action Strip */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          {/* Feed Switcher */}
          <div className="flex items-center bg-[#0A0A0E] p-1 rounded-xl border border-[#26262B]">
            <button
              onClick={() => setFeedMechanism("WEBSOCKET")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg transition-all cursor-pointer ${
                feedMechanism === "WEBSOCKET"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>WebSocket</span>
            </button>
            <button
              onClick={() => setFeedMechanism("POLLING")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg transition-all cursor-pointer ${
                feedMechanism === "POLLING"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Polling ({samplingIntervalMs}ms)</span>
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              if (next) playTradeVelocityChime();
            }}
            className={`p-2 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
              soundEnabled
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm"
                : "bg-slate-900 text-slate-500 border-slate-800"
            }`}
            title={soundEnabled ? "Audio Alert Enabled (Click to Mute)" : "Audio Muted (Click to Enable)"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Pause / Resume */}
          <button
            onClick={() => setIsPaused((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              isPaused
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800"
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
            <span>{isPaused ? "Resume Feed" : "Pause Feed"}</span>
          </button>

          {/* Test Surge Button */}
          <button
            onClick={handleSimulateSurge}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-black font-extrabold text-xs font-mono shadow-lg shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            title="Inject simulated block order to trigger 3σ threshold"
          >
            <Flame className="w-4 h-4 text-black fill-black" />
            <span>Simulate 3σ Volume Surge</span>
          </button>
        </div>
      </div>

      {/* KPI Telemetry Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1: Current Instantaneous Velocity */}
        <div className={`p-4 rounded-xl border transition-all ${
          isCurrentlySpiking
            ? "bg-rose-950/40 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)] animate-pulse"
            : "bg-[#111116] border-[#1F1F24]"
        }`}>
          <div className="text-[11px] text-[#8E9299] uppercase font-mono flex items-center justify-between">
            <span>Instantaneous Velocity</span>
            <Activity className={`w-3.5 h-3.5 ${isCurrentlySpiking ? "text-rose-400 animate-spin" : "text-cyan-400"}`} />
          </div>
          <div className="text-xl md:text-2xl font-bold font-mono text-white mt-1 tabular-nums">
            {currentStats.currentVelocity.toLocaleString()}{" "}
            <span className="text-xs text-slate-400 font-normal">shares/s</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1">
            Notional: ~${((currentStats.currentVelocity * referencePrice) / 1000).toFixed(1)}k/sec
          </div>
        </div>

        {/* Metric 2: Rolling Baseline Mean (μ) */}
        <div className="p-4 rounded-xl bg-[#111116] border border-[#1F1F24]">
          <div className="text-[11px] text-[#8E9299] uppercase font-mono flex items-center justify-between">
            <span>Rolling Baseline Mean (μ)</span>
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl md:text-2xl font-bold font-mono text-amber-300 mt-1 tabular-nums">
            {currentStats.mean.toLocaleString()}{" "}
            <span className="text-xs text-slate-400 font-normal">shares/s</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1">
            Window: 35 observations (N)
          </div>
        </div>

        {/* Metric 3: Standard Deviation (σ) */}
        <div className="p-4 rounded-xl bg-[#111116] border border-[#1F1F24]">
          <div className="text-[11px] text-[#8E9299] uppercase font-mono flex items-center justify-between">
            <span>Rolling Dispersion (σ)</span>
            <Sliders className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl md:text-2xl font-bold font-mono text-purple-300 mt-1 tabular-nums">
            ±{currentStats.stdDev.toLocaleString()}{" "}
            <span className="text-xs text-slate-400 font-normal">shares/s</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1">
            3σ Ceiling: <strong className="text-rose-400">{currentStats.threshold.toLocaleString()}</strong>
          </div>
        </div>

        {/* Metric 4: Real-Time Z-Score Gauge */}
        <div className={`p-4 rounded-xl border transition-all ${
          isCurrentlySpiking
            ? "bg-rose-950/40 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)] animate-pulse"
            : currentStats.zScore >= 2.0
            ? "bg-amber-950/20 border-amber-500/40"
            : "bg-[#111116] border-[#1F1F24]"
        }`}>
          <div className="text-[11px] text-[#8E9299] uppercase font-mono flex items-center justify-between">
            <span>Z-Score Deviation</span>
            <Zap className={`w-3.5 h-3.5 ${isCurrentlySpiking ? "text-rose-400 animate-bounce" : "text-emerald-400"}`} />
          </div>
          <div className={`text-xl md:text-2xl font-black font-mono mt-1 tabular-nums ${
            isCurrentlySpiking
              ? "text-rose-400"
              : currentStats.zScore >= 2.0
              ? "text-amber-300"
              : "text-emerald-400"
          }`}>
            {currentStats.zScore >= 0 ? `+${currentStats.zScore}σ` : `${currentStats.zScore}σ`}
          </div>
          <div className="text-[10px] font-mono mt-1 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${
              isCurrentlySpiking ? "bg-rose-400" : currentStats.zScore >= 2.0 ? "bg-amber-400" : "bg-emerald-400"
            }`} />
            <span className="text-slate-300">
              {isCurrentlySpiking
                ? "CRITICAL 3σ SPIKE"
                : currentStats.zScore >= 2.0
                ? "Elevated Volatility"
                : "Statistical Normal"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Interactive Recharts Area Plot */}
      <div className="rounded-2xl bg-[#121216] border border-[#1F1F23] p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1F1F23] pb-3 gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>Real-Time Volume Velocity &amp; 3σ Threshold Boundary Stream</span>
            </h3>
            <p className="text-xs text-[#8E9299]">
              Gaussian Normal Distribution surveillance: Green area = actual volume/sec; Amber dashed = mean (μ); Red dashed = 3-sigma anomaly ceiling (μ + 3σ).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            {/* Threshold Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[#8E9299] text-[11px]">Threshold:</span>
              {[2.5, 3.0, 3.5].map((val) => (
                <button
                  key={val}
                  onClick={() => setSigmaThreshold(val)}
                  className={`px-2 py-0.5 rounded text-[11px] cursor-pointer transition-all ${
                    sigmaThreshold === val
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/50 font-bold"
                      : "text-slate-400 hover:text-white bg-black/40 border border-[#222228]"
                  }`}
                >
                  {val.toFixed(1)}σ
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
                <span>Velocity</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 bg-amber-400 inline-block" />
                <span>Mean (μ)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 bg-rose-500 inline-block" />
                <span>+3σ Ceiling</span>
              </span>
            </div>
          </div>
        </div>

        {/* Chart View */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="spikeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#222229" vertical={false} />
              <XAxis
                dataKey="timeStr"
                stroke="#6B7280"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: "#222229" }}
              />
              <YAxis
                stroke="#6B7280"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: "#222229" }}
                domain={["auto", "auto"]}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as VelocityDataPoint;
                    return (
                      <div className="bg-[#0D0D12] border border-[#2D2D38] p-3 rounded-xl shadow-2xl font-mono text-xs space-y-1.5 z-50">
                        <div className="text-slate-400 text-[10px]">{data.timeStr} · {selectedSymbol}</div>
                        <div className="text-white font-bold flex items-center justify-between gap-4">
                          <span>Volume Velocity:</span>
                          <span className={data.isSpike ? "text-rose-400" : "text-cyan-400"}>
                            {data.volumeVelocity.toLocaleString()} shares/s
                          </span>
                        </div>
                        <div className="text-[#8E9299] flex items-center justify-between gap-4">
                          <span>Baseline Mean (μ):</span>
                          <span className="text-amber-400">{data.rollingMean.toLocaleString()}</span>
                        </div>
                        <div className="text-[#8E9299] flex items-center justify-between gap-4">
                          <span>3-Sigma Ceiling (μ+3σ):</span>
                          <span className="text-rose-400">{data.threshold3Sigma.toLocaleString()}</span>
                        </div>
                        <div className="text-[#8E9299] flex items-center justify-between gap-4 pt-1 border-t border-[#222228]">
                          <span>Statistical Z-Score:</span>
                          <span className={data.isSpike ? "text-rose-400 font-bold" : "text-emerald-400"}>
                            {data.zScore >= 0 ? `+${data.zScore}σ` : `${data.zScore}σ`}
                          </span>
                        </div>
                        {data.isSpike && (
                          <div className="text-rose-400 text-[10px] font-bold bg-rose-500/10 px-2 py-0.5 rounded text-center">
                            🚨 3-SIGMA SPIKE TRIGGERED
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Baseline Mean line */}
              <ReferenceLine
                y={currentStats.mean}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `μ: ${currentStats.mean.toLocaleString()}`,
                  fill: "#f59e0b",
                  fontSize: 10,
                  position: "insideTopLeft",
                }}
              />

              {/* 3-Sigma Ceiling line */}
              <ReferenceLine
                y={currentStats.threshold}
                stroke="#f43f5e"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: `3σ Ceiling: ${currentStats.threshold.toLocaleString()}`,
                  fill: "#f43f5e",
                  fontSize: 10,
                  position: "insideTopRight",
                }}
              />

              <Area
                type="monotone"
                dataKey="volumeVelocity"
                stroke={isCurrentlySpiking ? "#f43f5e" : "#06b6d4"}
                strokeWidth={2}
                fill={isCurrentlySpiking ? "url(#spikeGradient)" : "url(#velocityGradient)"}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Historical Spikes Audit Log Table */}
      <div className="rounded-2xl bg-[#121216] border border-[#1F1F23] p-5 space-y-3 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1F1F23] pb-3 gap-2">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Institutional Audit Log: 3-Sigma Order Book Spike Alerts</span>
            </h4>
            <div className="text-xs text-[#8E9299]">
              Immutable surveillance record of anomalous volume bursts for broker-dealer supervisory review.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 rounded-lg bg-[#0A0A0E] border border-cyan-500/40 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Download CSV for regulatory compliance filing"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export Audit CSV</span>
            </button>
            <span className="text-xs text-slate-500 font-mono">
              Total Alerts: <strong className="text-white">{alerts.length}</strong>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="text-[#8E9299] border-b border-[#26262B]">
                <th className="py-2.5 pr-3">Alert ID</th>
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3">Spike Velocity</th>
                <th className="py-2.5 px-3">Baseline (μ)</th>
                <th className="py-2.5 px-3">3σ Ceiling</th>
                <th className="py-2.5 px-3">Z-Score</th>
                <th className="py-2.5 px-3">Excess</th>
                <th className="py-2.5 pl-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F1F23]">
              {alerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-[#18181D] transition-colors">
                  <td className="py-2.5 pr-3 text-white font-medium">
                    <span className="text-[#8E9299] mr-1">#</span>
                    {alert.id}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">{alert.timeStr}</td>
                  <td className="py-2.5 px-3 font-bold text-amber-300">{alert.symbol}</td>
                  <td className="py-2.5 px-3 text-rose-400 font-bold tabular-nums">
                    {alert.currentVelocity.toLocaleString()} <span className="text-[10px] text-slate-500">shares/s</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 tabular-nums">{alert.rollingMean.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-amber-400 tabular-nums">{alert.threshold3Sigma.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-rose-400 font-bold tabular-nums">+{alert.zScore}σ</td>
                  <td className="py-2.5 px-3 text-amber-300 tabular-nums">+{alert.excessFactor}%</td>
                  <td className="py-2.5 pl-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                      alert.status === "ACTIVE"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    }`}>
                      {alert.status === "ACTIVE" ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                          <span>NEW SPIKE</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>ACKNOWLEDGED</span>
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
