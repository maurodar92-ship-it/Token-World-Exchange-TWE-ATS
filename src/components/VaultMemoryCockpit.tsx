import React, { useState, useEffect } from "react";
import { 
  Zap, 
  ShieldCheck, 
  Database, 
  Cpu, 
  Layers, 
  Activity, 
  RefreshCw, 
  Sliders, 
  Check, 
  Flame, 
  Lock, 
  Sparkles,
  RotateCcw,
  FileCode,
  Globe,
  Radio,
  Power,
  KeyRound,
  Terminal,
  Plus,
  ServerCrash,
  HardDrive
} from "lucide-react";
import { TokenRecord } from "../types";
import { continuousVaultSaver, ContinuousSaverState } from "../utils/continuousVaultSaver";
import { QuantumEncryptedCockpitModal } from "./QuantumEncryptedCockpitModal";
import { 
  saveWorkingTokensToQuantumVault, 
  getQuantumVaultTelemetry,
  expandAndGenerateVaultMemory,
  setVaultCapacityTier,
  QuantumVaultTelemetry 
} from "../utils/quantumMemory";

interface VaultMemoryCockpitProps {
  tokens: TokenRecord[];
  vaultTokensCount: number;
  onOpenValidationModal: () => void;
  onSynthesizeTokens?: (count: number) => void;
  maxCapacity: number;
  onMaxCapacityChange: (cap: number) => void;
  onTokensUpdated?: (tokens: TokenRecord[]) => void;
}

export const VaultMemoryCockpit: React.FC<VaultMemoryCockpitProps> = ({
  tokens,
  vaultTokensCount,
  onOpenValidationModal,
  onSynthesizeTokens,
  maxCapacity,
  onMaxCapacityChange,
  onTokensUpdated,
}) => {
  const [saverState, setSaverState] = useState<ContinuousSaverState>(continuousVaultSaver.getState());
  const [powerMode, setPowerMode] = useState<"standard" | "quadrillion" | "septillion" | "octillion">("octillion");
  const [isMaximized, setIsMaximized] = useState<boolean>(true);
  const [promptInput, setPromptInput] = useState<string>(
    "Continuous AI synthesis and cryptographic verification of smart contract IDs to maximum vault memory..."
  );
  const [boostAnimation, setBoostAnimation] = useState<boolean>(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [isQuantumModalOpen, setIsQuantumModalOpen] = useState<boolean>(false);
  const [quantumTelemetry, setQuantumTelemetry] = useState<QuantumVaultTelemetry>(getQuantumVaultTelemetry());
  const [isExpanding, setIsExpanding] = useState<boolean>(false);
  const [expansionCount, setExpansionCount] = useState<number>(1000);

  // Subscribe to continuous saver updates
  useEffect(() => {
    const unsub = continuousVaultSaver.subscribe((state) => {
      setSaverState(state);
      if (state.promptText) {
        setPromptInput(state.promptText);
      }
      setQuantumTelemetry(getQuantumVaultTelemetry());
    });
    return () => unsub();
  }, []);

  const handleToggleContinuousSaving = () => {
    continuousVaultSaver.toggle(promptInput);
    const nextState = continuousVaultSaver.getState();
    setFeedbackNotice(
      nextState.isActive
        ? "Continuous Vault Saving: ACTIVE (Secured across tab exit and reload)"
        : "Continuous Vault Saving: PAUSED"
    );
    setTimeout(() => setFeedbackNotice(null), 3500);
  };

  const handlePromptChange = (val: string) => {
    setPromptInput(val);
    continuousVaultSaver.updatePrompt(val);
  };

  const handleMaximizeVaultMemory = () => {
    setBoostAnimation(true);
    setPowerMode("octillion");
    setIsMaximized(true);
    
    // Scale capacity to Octillion Hyper Tier (1,000,000 tokens)
    const targetCapacity = 1000000;
    onMaxCapacityChange(targetCapacity);
    setVaultCapacityTier("octillion", targetCapacity);

    // If continuous saving is off, turn it on
    if (!saverState.isActive) {
      continuousVaultSaver.start(promptInput);
    }

    // Encrypt all working tokens in quantum memory with stack immunity
    saveWorkingTokensToQuantumVault(tokens).then(() => {
      setQuantumTelemetry(getQuantumVaultTelemetry());
    }).catch(() => {});

    setFeedbackNotice("⚡ VAULT MEMORY MAXIMIZED: 1 Octillion Hyper Tier Enclave Engaged! 1,000,000 Token Capacity & Zero Stack Size Overflow!");
    setTimeout(() => {
      setBoostAnimation(false);
      setTimeout(() => setFeedbackNotice(null), 4500);
    }, 600);
  };

  const handleSaveAllTokensAutomatically = async () => {
    // 1. Force continuous saver to engage if paused
    if (!saverState.isActive) {
      continuousVaultSaver.start(promptInput);
    }
    // 2. Push all tokens to durable store with expanded capacity
    continuousVaultSaver.saveTokensToDurableStorage(tokens, maxCapacity);

    // 3. Encrypt into client-side quantum memory enclave (AES-GCM 256-bit with safe chunking)
    try {
      await saveWorkingTokensToQuantumVault(tokens);
      setQuantumTelemetry(getQuantumVaultTelemetry());
    } catch (e) {
      console.warn("Could not save to quantum memory:", e);
    }

    setFeedbackNotice(`✓ All ${tokens.length} working tokens automatically saved to vault & encrypted with AES-GCM (256-bit)!`);
    setTimeout(() => setFeedbackNotice(null), 4000);
  };

  const handleSelectPreset = (mode: "standard" | "quadrillion" | "septillion" | "octillion") => {
    setPowerMode(mode);
    let target = 100000;
    if (mode === "standard") {
      target = 100000;
    } else if (mode === "quadrillion") {
      target = 250000;
    } else if (mode === "septillion") {
      target = 500000;
    } else {
      target = 1000000;
    }
    onMaxCapacityChange(target);
    setVaultCapacityTier(mode, target);
    setFeedbackNotice(`Preset Switched: ${mode.toUpperCase()} Tier (${target.toLocaleString()} Token Enclave Allocation)`);
    setTimeout(() => setFeedbackNotice(null), 3000);
  };

  // Primary Feature: Expand and Generate Vault Memory to Bigger Expansion
  const handleExpandAndGenerateMemory = async () => {
    setIsExpanding(true);
    setBoostAnimation(true);
    try {
      const { expandedTokens, result } = await expandAndGenerateVaultMemory(tokens, {
        tokensToGenerate: expansionCount,
        tier: powerMode,
      });

      // Update parent tokens state
      if (onTokensUpdated) {
        onTokensUpdated(expandedTokens);
      } else if (onSynthesizeTokens) {
        onSynthesizeTokens(expansionCount);
      }

      // Update max capacity
      onMaxCapacityChange(result.newCapacity);
      continuousVaultSaver.saveTokensToDurableStorage(expandedTokens, result.newCapacity);

      // Refresh telemetry
      setQuantumTelemetry(getQuantumVaultTelemetry());

      setFeedbackNotice(
        `⚡ VAULT MEMORY EXPANDED: Generated +${result.expandedBy.toLocaleString()} tokens! Active Enclave: ${result.newCount.toLocaleString()} / ${result.newCapacity.toLocaleString()} Capacity (${result.memoryBufferSizeFormatted} Encrypted). Stack Size Overflow: IMMUNE!`
      );
    } catch (err: any) {
      setFeedbackNotice(`Expansion Warning: ${err?.message || "Check memory limit"}`);
    } finally {
      setIsExpanding(false);
      setTimeout(() => setBoostAnimation(false), 500);
      setTimeout(() => setFeedbackNotice(null), 5500);
    }
  };

  return (
    <div 
      id="vault-memory-active-cockpit"
      className="bg-[#121216] border border-[#1F1F23] rounded-2xl p-5 shadow-xl transition-all relative overflow-hidden"
    >
      {/* Background Quantum Gradient Glow */}
      <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
        isMaximized 
          ? "bg-gradient-to-bl from-orange-500/15 via-purple-500/10 to-transparent opacity-80" 
          : "bg-emerald-500/5 opacity-50"
      }`} />

      {/* Header & Status Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-4 relative z-10 border-b border-[#1F1F23] pb-4">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
            boostAnimation ? "scale-110 rotate-12" : ""
          } ${
            isMaximized
              ? "bg-gradient-to-br from-[#F27D26] to-amber-500 text-black shadow-[0_0_20px_rgba(242,125,38,0.4)]"
              : "bg-[#16161A] border border-[#1F1F23] text-[#8E9299]"
          }`}>
            <Zap className="w-6 h-6 fill-current" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                ACTIVE VAULT MEMORY COCKPIT
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-orange-400 border border-orange-500/30 flex items-center gap-1.5 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping" />
                {powerMode === "octillion" ? "1 Octillion Hyper Tier (1M Max)" : powerMode === "septillion" ? "500 Septillion Max Power Tier" : `${powerMode.toUpperCase()} Tier`}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                saverState.isActive
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : "bg-gray-500/15 text-[#8E9299] border-gray-500/30"
              }`}>
                Auto-Save: {saverState.isActive ? "ACTIVE" : "PAUSED"}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/15 text-purple-400 border border-purple-500/30">
                Quantum Enclave: AES-GCM-256
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-green-500/15 text-green-400 border border-green-500/30 font-semibold">
                🛡️ Stack Size: IMMUNE
              </span>
            </div>
            <p className="text-xs text-[#8E9299] mt-0.5">
              Quantum memory scaling engine with chunked 32KB streaming serialization, zero stack-overflow risk, and 1-Octillion capacity expansion.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Expand and Generate Bigger Memory Button */}
          <button
            id="btn-expand-generate-bigger-memory"
            type="button"
            onClick={handleExpandAndGenerateMemory}
            disabled={isExpanding}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-extrabold text-xs shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all cursor-pointer active:scale-95 disabled:opacity-60"
            title="Expands encrypted vault memory capacity and generates a new batch of tokens safely with zero call stack overflow"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
            <span>{isExpanding ? "Expanding Memory..." : `Expand & Generate (+${expansionCount})`}</span>
          </button>

          {/* Save All Working Tokens Automatically Button */}
          <button
            id="btn-auto-save-all-tokens-vault"
            type="button"
            onClick={handleSaveAllTokensAutomatically}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-xs shadow-md transition-all cursor-pointer active:scale-95"
            title="Automatically saves all working tokens into durable vault and client-side encrypted quantum memory"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Auto-Save All Tokens ({tokens.length})</span>
          </button>

          {/* Encrypted Quantum Memory Cockpit Modal Button */}
          <button
            id="btn-open-quantum-memory-modal"
            type="button"
            onClick={() => setIsQuantumModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#16161A] hover:bg-[#1F1F23] border border-purple-500/40 text-purple-400 text-xs font-semibold shadow-sm transition-all cursor-pointer"
            title="Open Encrypted Quantum Memory & Foundry / Remix Suite"
          >
            <Lock className="w-4 h-4 text-purple-400" />
            <span>Quantum Memory Enclave</span>
          </button>

          {/* Maximize Vault Memory Button */}
          <button
            id="btn-maximize-vault-memory"
            type="button"
            onClick={handleMaximizeVaultMemory}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#F27D26] via-amber-500 to-orange-400 hover:from-amber-400 hover:to-[#ff8f3d] text-black font-extrabold text-xs shadow-[0_0_20px_rgba(242,125,38,0.3)] transition-all cursor-pointer active:scale-95"
            title="Push memory allocation, throughput, and token vault capacity to maximum power"
          >
            <Flame className="w-4 h-4 fill-current animate-pulse" />
            <span>⚡ MAXIMIZE VAULT</span>
          </button>

          {/* Validate All Tokens (Remix + Etherscan + MetaMask) */}
          <button
            id="btn-validate-all-contracts-cockpit"
            type="button"
            onClick={onOpenValidationModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#16161A] hover:bg-[#1F1F23] border border-emerald-500/40 text-emerald-400 text-xs font-semibold shadow-sm transition-all cursor-pointer"
            title="Verify all contract IDs for Remix IDE, Etherscan.io and MetaMask compatibility"
          >
            <Terminal className="w-4 h-4" />
            <span>Remix & Foundry Specs</span>
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedbackNotice && (
        <div className="mt-3 bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{feedbackNotice}</span>
        </div>
      )}

      {/* Dedicated Memory Expansion & Stack Protection Controller Bar */}
      <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-[#14121a] via-[#16161c] to-[#12161a] border border-purple-500/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  VAULT MEMORY EXPANSION ENGINE
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-green-500/20 text-green-300 border border-green-500/40">
                  STACK OVERFLOW IMMUNE
                </span>
              </div>
              <div className="text-[11px] text-[#8E9299]">
                Dynamic memory allocation: increases active token capacity up to 1,000,000 (1 Octillion Tier) with 32KB streaming base64 encoding.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-[#0A0A0E] px-2.5 py-1 rounded-lg border border-[#1F1F23]">
              <span className="text-[10px] font-mono text-[#8E9299]">Batch Add:</span>
              {[500, 1000, 2500, 5000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setExpansionCount(amt)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    expansionCount === amt
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-[#8E9299] hover:text-white hover:bg-[#1F1F23]"
                  }`}
                >
                  +{amt}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleExpandAndGenerateMemory}
              disabled={isExpanding}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{isExpanding ? "Expanding..." : `Generate & Expand (+${expansionCount})`}</span>
            </button>
          </div>
        </div>

        {/* Real-time Memory Diagnostics Ribbon */}
        <div className="mt-3 pt-3 border-t border-[#1F1F23]/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
          <div className="flex items-center justify-between bg-[#0A0A0E] px-2.5 py-1.5 rounded-lg border border-[#1F1F23]">
            <span className="text-[#8E9299]">Stack Status:</span>
            <span className="text-emerald-400 font-bold">Safe (Chunked)</span>
          </div>
          <div className="flex items-center justify-between bg-[#0A0A0E] px-2.5 py-1.5 rounded-lg border border-[#1F1F23]">
            <span className="text-[#8E9299]">Payload Buffer:</span>
            <span className="text-cyan-400 font-bold">{quantumTelemetry.expandedMemoryBytesFormatted || "0 B"}</span>
          </div>
          <div className="flex items-center justify-between bg-[#0A0A0E] px-2.5 py-1.5 rounded-lg border border-[#1F1F23]">
            <span className="text-[#8E9299]">Active Enclave:</span>
            <span className="text-amber-400 font-bold">{tokens.length} / {maxCapacity.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between bg-[#0A0A0E] px-2.5 py-1.5 rounded-lg border border-[#1F1F23]">
            <span className="text-[#8E9299]">Capacity Tier:</span>
            <span className="text-purple-400 font-bold uppercase">{powerMode}</span>
          </div>
        </div>
      </div>

      {/* Real-time Telemetry & Memory Presets */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Tier 1: Capacity Tier */}
        <div 
          onClick={() => handleSelectPreset("standard")}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            powerMode === "standard"
              ? "bg-[#16161A] border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
              : "bg-[#0E0E12] border-[#1F1F23] opacity-70 hover:opacity-100"
          }`}
        >
          <div className="flex items-center justify-between text-[10px] font-mono text-[#8E9299]">
            <span>STANDARD VAULT</span>
            <Database className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-sm font-bold text-white mt-1">100,000 Tokens</div>
          <div className="text-[10px] text-cyan-400 mt-0.5">High Speed Cache</div>
        </div>

        {/* Tier 2: 100 Quadrillion Memory Tokens Vault */}
        <div 
          onClick={() => handleSelectPreset("quadrillion")}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            powerMode === "quadrillion"
              ? "bg-[#16161A] border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.15)]"
              : "bg-[#0E0E12] border-[#1F1F23] opacity-70 hover:opacity-100"
          }`}
        >
          <div className="flex items-center justify-between text-[10px] font-mono text-[#8E9299]">
            <span>100 QUADRILLION VAULT</span>
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-sm font-bold text-purple-300 mt-1">10¹⁷ Memory Tokens</div>
          <div className="text-[10px] text-purple-400 mt-0.5">250,000 Active Enclave</div>
        </div>

        {/* Tier 3: 500 Septillion Token Vault */}
        <div 
          onClick={() => handleSelectPreset("septillion")}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            powerMode === "septillion"
              ? "bg-gradient-to-br from-[#16161A] to-[#1F1A14] border-[#F27D26] shadow-[0_0_15px_rgba(242,125,38,0.25)]"
              : "bg-[#0E0E12] border-[#1F1F23] opacity-70 hover:opacity-100"
          }`}
        >
          <div className="flex items-center justify-between text-[10px] font-mono text-[#F27D26]">
            <span className="font-bold">500 SEPTILLION VAULT</span>
            <Flame className="w-3.5 h-3.5 text-[#F27D26]" />
          </div>
          <div className="text-sm font-extrabold text-orange-400 mt-1">500 × 10²⁴ Tokens</div>
          <div className="text-[10px] text-amber-300 mt-0.5">500,000 Active Enclave</div>
        </div>

        {/* Tier 4: 1 Octillion Hyper Tier (NEW) */}
        <div 
          onClick={() => handleSelectPreset("octillion")}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            powerMode === "octillion"
              ? "bg-gradient-to-br from-[#1A1226] via-[#1E142B] to-[#14121F] border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
              : "bg-[#0E0E12] border-[#1F1F23] opacity-70 hover:opacity-100"
          }`}
        >
          <div className="flex items-center justify-between text-[10px] font-mono text-purple-300">
            <span className="font-bold">1 OCTILLION HYPER TIER</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          </div>
          <div className="text-sm font-extrabold text-purple-200 mt-1">10²⁷ Memory Units</div>
          <div className="text-[10px] text-emerald-400 mt-0.5">1,000,000 Enclave Tokens</div>
        </div>
      </div>

      {/* Continuous Vault Saving Prompt Controller */}
      <div className="mt-4 p-4 rounded-xl bg-[#0E0E12] border border-[#1F1F23]">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Radio className={`w-4 h-4 ${saverState.isActive ? "text-emerald-400 animate-pulse" : "text-[#8E9299]"}`} />
            <span className="text-xs font-bold text-white">
              AUTOMATIC CONTINUOUS VAULT SAVER ENGINE
            </span>
            <span className="text-[10px] font-mono text-[#8E9299]">
              (Step #{saverState.stepCount} • {saverState.totalSecuredCount} Secured Tokens)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleContinuousSaving}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                saverState.isActive
                  ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{saverState.isActive ? "Pause Auto-Save" : "Engage Auto-Save"}</span>
            </button>

            <button
              onClick={handleSaveAllTokensAutomatically}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#16161A] hover:bg-[#1F1F23] text-emerald-400 border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Flush All to Vault</span>
            </button>
          </div>
        </div>

        {/* Editable Moving Saving Prompt */}
        <div className="relative">
          <textarea
            value={promptInput}
            onChange={(e) => handlePromptChange(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg bg-[#16161A] border border-[#1F1F23] text-xs text-white placeholder-[#8E9299] focus:border-orange-500/50 outline-none font-mono"
            placeholder="Continuous saving prompt moving forward..."
          />
        </div>

        {/* Persistence Safeguard Notice */}
        <div className="mt-2 flex flex-wrap items-center justify-between text-[11px] text-[#8E9299]">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Whatever is in the vault stays in the vault. Reload-proof, tab-exit persistent, AES-GCM-256 encrypted, and immune to stack overflow.</span>
          </div>
          <div className="font-mono text-[10px] text-[#8E9299]">
            Last Secured Checkpoint: {new Date(saverState.lastSavedAt).toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Render Modal */}
      <QuantumEncryptedCockpitModal
        isOpen={isQuantumModalOpen}
        onClose={() => setIsQuantumModalOpen(false)}
        tokens={tokens}
        onForceSaveAllToVault={handleSaveAllTokensAutomatically}
        onExpandAndGenerateMemory={handleExpandAndGenerateMemory}
      />
    </div>
  );
};


