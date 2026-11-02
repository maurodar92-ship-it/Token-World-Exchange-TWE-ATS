import { useState, useEffect } from "react";
import { TokenRecord, GenerationConfig } from "../types";
import { generateTokenBatch } from "../utils/cryptoGenerators";
import { 
  persistTokenBatch, 
  subscribeToTokens,
  secureTokensToVault 
} from "../utils/firebase";
import { isFirestoreQuotaExceeded } from "../utils/firestoreQuotaGuard";
import { 
  saveGeneratorState, 
  loadGeneratorState,
  GeneratorSaveState 
} from "../lib/firebase";
import { 
  Database, 
  Cloud, 
  CloudCheck, 
  Play, 
  Square, 
  Zap, 
  Save, 
  RefreshCw, 
  Sliders, 
  Check, 
  Activity,
  HardDrive,
  Cpu,
  Layers,
  Flame,
  Shield,
  Lock
} from "lucide-react";

interface ConstantSaveModePanelProps {
  tokens: TokenRecord[];
  onTokensUpdated: (tokens: TokenRecord[]) => void;
  onAppendTokens: (tokens: TokenRecord[]) => void;
  maxCapacity: number;
  onMaxCapacityChange: (capacity: number) => void;
  constantLoopActive: boolean;
  onToggleConstantLoop: () => void;
  onGenerate100: () => void;
  onOpenVault: () => void;
  isGenerating?: boolean;
}

export const ConstantSaveModePanel = ({
  tokens,
  onTokensUpdated,
  onAppendTokens,
  maxCapacity,
  onMaxCapacityChange,
  constantLoopActive,
  onToggleConstantLoop,
  onGenerate100,
  onOpenVault,
  isGenerating = false,
}: ConstantSaveModePanelProps) => {
  const [autoSaveToFirebase, setAutoSaveToFirebase] = useState<boolean>(true);
  const [generationIntervalSec, setGenerationIntervalSec] = useState<number>(3);
  const [batchPerTick, setBatchPerTick] = useState<number>(5);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error" | "secured">("idle");
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<string | null>(null);
  const [totalSavedCount, setTotalSavedCount] = useState<number>(0);
  const [firebaseTokensCount, setFirebaseTokensCount] = useState<number>(0);
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [securedNotification, setSecuredNotification] = useState<string | null>(null);

  // Sync with Firestore on mount
  useEffect(() => {
    loadGeneratorState().then((state) => {
      if (state) {
        setAutoSaveToFirebase(state.autoSaveEnabled ?? true);
        if (state.lastSavedAt) {
          setLastSavedTimestamp(new Date(state.lastSavedAt).toLocaleTimeString());
        }
      }
    });

    // Real-time listener for remote tokens count
    const unsubscribe = subscribeToTokens(
      (remoteTokens) => {
        setFirebaseTokensCount(remoteTokens.length);
      },
      undefined,
      () => {
        // Guarded by Centralized Sync & Permission Guard with local fallback
      }
    );

    return () => unsubscribe();
  }, []);

  // Constant Generator Loop: Strictly only generates when constantLoopActive is TRUE
  useEffect(() => {
    let timer: any = null;

    if (constantLoopActive) {
      // Check immediately if already at max capacity
      if (tokens.length >= maxCapacity) {
        onToggleConstantLoop();
        triggerMaxCapacitySecurity(tokens);
        return;
      }

      timer = setInterval(async () => {
        // Enforce maximum list capacity
        const remainingSlots = maxCapacity - tokens.length;
        if (remainingSlots <= 0) {
          onToggleConstantLoop();
          triggerMaxCapacitySecurity(tokens);
          return;
        }

        const countToGenerate = Math.min(batchPerTick, remainingSlots);
        const newBatch = generateTokenBatch(countToGenerate, {
          chains: ["ethereum", "base", "arbitrum", "solana", "quantum"],
          narratives: ["ai_agents", "depin", "rwa", "quantum_defi"],
          standards: ["ERC-20", "ERC-721", "ERC-1155"],
          includeVanity: true,
          vanityPercentage: 15,
          eip55Checksum: true,
        });

        onAppendTokens(newBatch);

        // Check if this batch hit max capacity
        if (tokens.length + countToGenerate >= maxCapacity) {
          onToggleConstantLoop();
          triggerMaxCapacitySecurity([...newBatch, ...tokens]);
          return;
        }

        // Instant Auto-Save to Firebase Token Vault
        if (autoSaveToFirebase) {
          setSaveStatus("saving");
          try {
            const res = await persistTokenBatch(newBatch, { source: "constant_loop" });
            if (res.success) {
              setSaveStatus("saved");
              setLastSavedTimestamp(new Date().toLocaleTimeString());
              setTotalSavedCount((prev) => prev + res.savedCount);
              setTimeout(() => setSaveStatus("idle"), 1500);
            } else {
              setSaveStatus("error");
            }
          } catch (err) {
            console.error("Auto save to vault failed:", err);
            setSaveStatus("error");
          }
        }
      }, generationIntervalSec * 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [constantLoopActive, generationIntervalSec, batchPerTick, autoSaveToFirebase, tokens.length, maxCapacity]);

  // Max capacity security lock
  const triggerMaxCapacitySecurity = async (currentTokens: TokenRecord[]) => {
    setSaveStatus("saving");
    try {
      const res = await secureTokensToVault(currentTokens, maxCapacity, "max_capacity_auto_lock");
      if (res.success) {
        setSaveStatus("secured");
        setSecuredNotification(`Max list limit reached (${maxCapacity} IDs) — Secured in Firebase Memory!`);
        setLastSavedTimestamp(new Date().toLocaleTimeString());
        setTimeout(() => setSecuredNotification(null), 6000);
      }
    } catch (e) {
      console.error("Error locking to vault:", e);
    }
  };

  // Manual Trigger: Save All Current Tokens to Firebase
  const handleManualSaveAll = async () => {
    if (tokens.length === 0) return;
    setSaveStatus("saving");
    try {
      const res = await secureTokensToVault(tokens, maxCapacity, "manual_save_all");
      if (res.success) {
        setSaveStatus("saved");
        setLastSavedTimestamp(new Date().toLocaleTimeString());
        setTotalSavedCount((prev) => prev + res.savedCount);
        
        // Update persistent generator state
        await saveGeneratorState({
          id: "current",
          totalTokensCount: tokens.length,
          autoSaveEnabled: autoSaveToFirebase,
          constantGenerationActive: constantLoopActive,
          generationIntervalMs: generationIntervalSec * 1000,
          maxListCapacity: maxCapacity,
          isVaultSecured: true,
          vaultTokenCount: firebaseTokensCount,
          lastSavedAt: new Date().toISOString(),
          activeChains: ["ethereum", "base", "arbitrum", "solana", "quantum"],
        });

        setTimeout(() => setSaveStatus("idle"), 2500);
      } else {
        setSaveStatus("error");
      }
    } catch (err) {
      console.error("Manual save error:", err);
      setSaveStatus("error");
    }
  };

  const isAtMaxCapacity = tokens.length >= maxCapacity;

  return (
    <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1F1F23]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#F27D26]/10 border border-[#F27D26]/20">
            <Database className="w-4 h-4 text-[#F27D26]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Constant Generation & Firebase Memory Engine
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-green-500/20 text-green-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Live Firestore Synced
              </span>
              {isAtMaxCapacity && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#F27D26]/20 text-[#F27D26] font-bold border border-[#F27D26]/40 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Max Capacity Secured
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#8E9299]">
              Tokens are strictly generated only via Start Constant Loop or explicit 100 IDs trigger. Automatically secured in Firebase memory when max capacity is met.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Generate 100 IDs Trigger */}
          <button
            id="btn-trigger-generate-100"
            type="button"
            onClick={onGenerate100}
            disabled={isGenerating}
            className="px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 bg-[#F27D26]/15 hover:bg-[#F27D26]/25 border border-[#F27D26] text-[#F27D26] transition-all cursor-pointer disabled:opacity-50"
            title="Generate exactly 100 token IDs and secure to Vault"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Generate 100 IDs</span>
          </button>

          {/* Constant Generation Toggle Button */}
          <button
            id="btn-toggle-constant-gen"
            type="button"
            onClick={onToggleConstantLoop}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
              constantLoopActive
                ? "bg-red-500 hover:bg-red-400 text-white animate-pulse"
                : "bg-[#F27D26] hover:bg-[#ff8e3c] text-black"
            }`}
          >
            {constantLoopActive ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Constant Loop</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Constant Loop</span>
              </>
            )}
          </button>

          {/* Token Vault Button */}
          <button
            id="btn-open-token-vault-panel"
            type="button"
            onClick={onOpenVault}
            className="px-3 py-1.5 rounded-lg bg-[#0A0A0C] hover:bg-[#1E1E24] border border-[#1F1F23] hover:border-[#F27D26] text-xs font-mono text-[#E0E0E0] hover:text-[#F27D26] font-medium flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Shield className="w-3.5 h-3.5 text-[#F27D26]" />
            <span>Token Vault ({firebaseTokensCount})</span>
          </button>

          {/* Instant Save to Firebase Button */}
          <button
            id="btn-instant-save-firebase"
            type="button"
            onClick={handleManualSaveAll}
            disabled={saveStatus === "saving" || tokens.length === 0}
            className="px-3 py-1.5 rounded-lg bg-[#0A0A0C] hover:bg-[#1E1E24] border border-[#1F1F23] text-xs font-mono text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
          >
            {saveStatus === "saving" ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            ) : saveStatus === "saved" || saveStatus === "secured" ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Save className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span>
              {saveStatus === "saving"
                ? "Saving..."
                : saveStatus === "secured"
                ? isFirestoreQuotaExceeded()
                  ? "Secured (Local Vault)"
                  : "Secured in Cloud"
                : saveStatus === "saved"
                ? isFirestoreQuotaExceeded()
                  ? "Saved (Local Vault)"
                  : "Saved to Vault"
                : "Save All to Vault"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
              showConfig ? "bg-[#0A0A0C] border-[#F27D26] text-[#F27D26]" : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
            }`}
            title="Configure Constant Loop Parameters"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Secured Notification Banner */}
      {securedNotification && (
        <div className="p-3 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-400 shrink-0" />
            <span>{securedNotification}</span>
          </div>
          <button
            type="button"
            onClick={onOpenVault}
            className="text-white hover:underline text-[11px] font-bold"
          >
            View in Token Vault &rarr;
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="bg-[#0A0A0C] p-3 rounded-lg border border-[#1F1F23]">
          <div className="text-[10px] text-[#8E9299] uppercase">Local Foundry Tokens</div>
          <div className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
            <span>{tokens.length.toLocaleString()}</span>
            <span className="text-[10px] text-[#8E9299]">/ {maxCapacity} cap</span>
          </div>
        </div>

        <div className="bg-[#0A0A0C] p-3 rounded-lg border border-[#1F1F23]">
          <div className="text-[10px] text-[#8E9299] uppercase">Firestore Vault Memory</div>
          <div className="text-sm font-bold text-cyan-400 mt-1 flex items-center gap-1.5">
            <span>{firebaseTokensCount.toLocaleString()}</span>
            <span className="text-[10px] text-cyan-500/70">in vault</span>
          </div>
        </div>

        <div className="bg-[#0A0A0C] p-3 rounded-lg border border-[#1F1F23]">
          <div className="text-[10px] text-[#8E9299] uppercase">Loop Velocity</div>
          <div className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
            {constantLoopActive ? (
              <span className="text-green-400 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-[#F27D26] animate-bounce" />
                +{batchPerTick} tok / {generationIntervalSec}s
              </span>
            ) : (
              <span className="text-[#8E9299]">Paused / Idle</span>
            )}
          </div>
        </div>

        <div className="bg-[#0A0A0C] p-3 rounded-lg border border-[#1F1F23]">
          <div className="text-[10px] text-[#8E9299] uppercase">Max List Capacity</div>
          <div className="text-xs font-bold text-[#E0E0E0] mt-1 flex items-center justify-between">
            <span className="text-[#F27D26]">{maxCapacity} Tokens</span>
            <select
              value={maxCapacity}
              onChange={(e) => onMaxCapacityChange(Number(e.target.value))}
              className="bg-[#16161A] text-[10px] border border-[#1F1F23] rounded px-1 py-0.5 text-[#8E9299] focus:outline-none cursor-pointer"
            >
              <option value={50}>50</option>
              <option value={100}>100 (Default)</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
            </select>
          </div>
        </div>
      </div>

      {/* Configuration Drawer */}
      {showConfig && (
        <div className="bg-[#0A0A0C] p-4 rounded-lg border border-[#1F1F23] grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in text-xs">
          <div>
            <label className="text-[10px] font-bold text-[#8E9299] uppercase block mb-1.5 font-mono">
              Generation Interval (Seconds)
            </label>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={generationIntervalSec}
              onChange={(e) => setGenerationIntervalSec(parseInt(e.target.value))}
              className="w-full accent-[#F27D26]"
            />
            <div className="flex justify-between text-[10px] text-[#8E9299] font-mono mt-1">
              <span>Fast (1s)</span>
              <span className="text-white font-bold">{generationIntervalSec}s</span>
              <span>Relaxed (10s)</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-[#8E9299] uppercase block mb-1.5 font-mono">
              Batch Tokens Per Tick
            </label>
            <input
              type="range"
              min="1"
              max="25"
              step="1"
              value={batchPerTick}
              onChange={(e) => setBatchPerTick(parseInt(e.target.value))}
              className="w-full accent-[#F27D26]"
            />
            <div className="flex justify-between text-[10px] text-[#8E9299] font-mono mt-1">
              <span>1 token</span>
              <span className="text-white font-bold">+{batchPerTick} tokens</span>
              <span>25 tokens</span>
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <label className="text-[10px] font-bold text-[#8E9299] uppercase block mb-1.5 font-mono">
              Automatic Vault Mode
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-white">
              <input
                type="checkbox"
                checked={autoSaveToFirebase}
                onChange={(e) => setAutoSaveToFirebase(e.target.checked)}
                className="rounded accent-[#F27D26]"
              />
              <span>Auto-Vault All Generated Tokens</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
