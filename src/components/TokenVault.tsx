import React, { useState, useEffect, useMemo } from "react";
import { TokenRecord, ChainType, TokenStandard } from "../types";
import { TokenImage } from "./TokenImage";
import { 
  subscribeToTokens, 
  fetchTokens, 
  deleteTokenFromFirestore, 
  clearTokenVault, 
  secureTokensToVault, 
  fetchVaultSnapshots, 
  VaultSnapshot 
} from "../utils/firebase";
import { isFirestoreQuotaExceeded } from "../utils/firestoreQuotaGuard";
import { 
  fetchVaultPrompts, 
  savePromptToVault, 
  deleteVaultPrompt, 
  GeminiMemoryItem 
} from "../lib/firebase";
import { 
  Shield, 
  Database, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  Cloud, 
  CloudCheck, 
  RefreshCw, 
  Download, 
  Trash2, 
  Search, 
  Copy, 
  ExternalLink, 
  Layers, 
  Cpu, 
  Zap, 
  Play, 
  Square, 
  Sliders, 
  Check, 
  AlertTriangle,
  FileSpreadsheet,
  FileCode,
  Archive,
  Eye,
  EyeOff,
  Terminal,
  Server,
  Radio,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { CHAIN_METADATA } from "../utils/marketData";
import { CRYPTOVAULTVAULT_GENESIS_TOKEN } from "../utils/contractIdEngines";
import { Sparkles, ShieldCheck, HeartPulse, ShieldAlert, Activity } from "lucide-react";
import { UniversalContractValidationModal } from "./UniversalContractValidationModal";
import { BatchDeploymentManager } from "./BatchDeploymentManager";
import {
  runCompleteMemoryHealthCheck,
  subscribeToMemoryHealth,
  startAutomatedHealthMonitoring,
  MemoryHealthReport,
  getLastHealthReport,
} from "../utils/memoryHealthDiagnostics";
import { MemoryHealthCheckModal } from "./MemoryHealthCheckModal";

interface TokenVaultProps {
  workingTokens: TokenRecord[];
  onRestoreTokens: (tokens: TokenRecord[]) => void;
  onSelectToken: (token: TokenRecord) => void;
  maxCapacity: number;
  onMaxCapacityChange: (cap: number) => void;
  constantLoopActive: boolean;
  onToggleConstantLoop: () => void;
  onGenerate100: () => void;
  isGenerating: boolean;
  onContinuePromptSaving?: (prompt: string) => void;
}

export const TokenVault: React.FC<TokenVaultProps> = ({
  workingTokens,
  onRestoreTokens,
  onSelectToken,
  maxCapacity,
  onMaxCapacityChange,
  constantLoopActive,
  onToggleConstantLoop,
  onGenerate100,
  isGenerating,
  onContinuePromptSaving,
}) => {
  const [vaultTokens, setVaultTokens] = useState<TokenRecord[]>([]);
  const [snapshots, setSnapshots] = useState<VaultSnapshot[]>([]);
  const [savedPrompts, setSavedPrompts] = useState<GeminiMemoryItem[]>([]);
  const [newPromptInput, setNewPromptInput] = useState<string>("");
  const [isSavingNewPrompt, setIsSavingNewPrompt] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedChain, setSelectedChain] = useState<string>("all");
  const [selectedStandard, setSelectedStandard] = useState<string>("all");
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [isSecuring, setIsSecuring] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState<boolean>(false);
  const [showValidationModal, setShowValidationModal] = useState<boolean>(false);
  const [showBatchDeployModal, setShowBatchDeployModal] = useState<boolean>(false);
  const [selectedVaultTokenIds, setSelectedVaultTokenIds] = useState<Set<string>>(new Set());
  const [activeSubTab, setActiveSubTab] = useState<"tokens" | "prompts" | "snapshots" | "chunk_engine">("tokens");
  const [isTreasuryWalletHidden, setIsTreasuryWalletHidden] = useState<boolean>(true);

  // Encrypted Memory Health Diagnostics states
  const [healthReport, setHealthReport] = useState<MemoryHealthReport | null>(getLastHealthReport());
  const [isScanningHealth, setIsScanningHealth] = useState<boolean>(false);
  const [showHealthModal, setShowHealthModal] = useState<boolean>(false);

  // Chunk Engine & System Feature Flag states
  const [systemFlagEnabled, setSystemFlagEnabled] = useState<boolean>(true);
  const [batchCountInput, setBatchCountInput] = useState<number>(100);
  const [isBatchGenerating, setIsBatchGenerating] = useState<boolean>(false);
  const [batchResult, setBatchResult] = useState<any | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);

  // Dynamic Cursor Pagination states for locked /tokenVault
  const [lockedVaultTokens, setLockedVaultTokens] = useState<any[]>([]);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]);
  const [cursorIndex, setCursorIndex] = useState<number>(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isFetchingLockedVault, setIsFetchingLockedVault] = useState<boolean>(false);
  const [lockedVaultTotal, setLockedVaultTotal] = useState<number>(0);

  // Real-time subscribe to all tokens in Firebase Token Vault
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToTokens(
      (tokens) => {
        setVaultTokens(tokens);
        setIsLoading(false);
      },
      { limitCount: 450 },
      (err) => {
        console.error("Token Vault subscription error:", err);
        setIsLoading(false);
      }
    );

    loadSnapshots();
    loadPrompts();
    fetchSystemConfig();
    fetchLockedVaultPage(null, 0);

    // Initial check and subscription to Memory Health Diagnostics
    runCompleteMemoryHealthCheck().then((rep) => setHealthReport(rep));
    const unsubHealth = subscribeToMemoryHealth((rep) => {
      setHealthReport(rep);
    });

    return () => {
      unsubscribe();
      unsubHealth();
    };
  }, []);

  const handleRunManualIntegrityScan = async () => {
    setIsScanningHealth(true);
    setActionFeedback("Running cryptographic integrity scan on all local encrypted blobs...");
    try {
      const rep = await runCompleteMemoryHealthCheck();
      setHealthReport(rep);
      if (rep.overallStatus === "corrupted") {
        setActionFeedback("⚠ Integrity Alert: Decryption failure or corrupted blob detected!");
      } else if (rep.overallStatus === "healthy") {
        setActionFeedback(`✓ Integrity Scan Passed: ${rep.healthyBlobsCount} blobs verified (AES-GCM-256).`);
      } else {
        setActionFeedback(`Memory scan status: ${rep.overallStatus.toUpperCase()} (${rep.totalBlobsChecked} blobs checked)`);
      }
    } catch (e: any) {
      setActionFeedback(`Scan error: ${e?.message || e}`);
    } finally {
      setIsScanningHealth(false);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  const loadPrompts = async () => {
    try {
      const items = await fetchVaultPrompts();
      setSavedPrompts(items);
    } catch (e) {
      console.warn("Could not load vault prompts:", e);
    }
  };

  const handleSavePrompt = async () => {
    if (!newPromptInput.trim()) return;
    setIsSavingNewPrompt(true);
    try {
      await savePromptToVault(newPromptInput.trim(), {
        source: "token_vault_console",
        tokenCount: vaultTokens.length,
        tags: ["manual_vault_prompt", "ai_memory"]
      });
      setNewPromptInput("");
      await loadPrompts();
      setActionFeedback("Prompt successfully secured in Vault memory!");
    } catch (e: any) {
      setActionFeedback(`Error saving prompt: ${e?.message || e}`);
    } finally {
      setIsSavingNewPrompt(false);
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  const handleDeletePrompt = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteVaultPrompt(id);
      setSavedPrompts((prev) => prev.filter((p) => p.id !== id));
      setActionFeedback("Prompt removed from Vault memory.");
    } catch (e: any) {
      setActionFeedback(`Error deleting prompt: ${e?.message || e}`);
    } finally {
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  const handleContinueWithPrompt = (promptText: string) => {
    if (onContinuePromptSaving) {
      onContinuePromptSaving(promptText);
      setActionFeedback("Triggered continuous token generation with selected prompt!");
    } else {
      onGenerate100();
      setActionFeedback("Triggered generation with active prompt!");
    }
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const fetchSystemConfig = async () => {
    try {
      const res = await fetch("/api/system-config/token-generator");
      const data = await res.json();
      if (data.success && data.config) {
        setSystemFlagEnabled(data.config.isTokenGenerationEnabled);
      }
    } catch (e) {
      console.warn("Could not fetch system config:", e);
    }
  };

  const handleToggleSystemFlag = async () => {
    try {
      const res = await fetch("/api/system-config/token-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTokenGenerationEnabled: !systemFlagEnabled })
      });
      const data = await res.json();
      if (data.success) {
        setSystemFlagEnabled(data.config.isTokenGenerationEnabled);
        setActionFeedback(`System flag updated: isTokenGenerationEnabled = ${data.config.isTokenGenerationEnabled}`);
        setTimeout(() => setActionFeedback(null), 3000);
      }
    } catch (e: any) {
      setActionFeedback(`Error updating flag: ${e?.message || e}`);
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  const handleExecuteBatchGeneration = async () => {
    setIsBatchGenerating(true);
    setBatchError(null);
    setBatchResult(null);
    try {
      const res = await fetch("/api/vault/generate-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: batchCountInput })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setBatchError(data.error || "Batch generation failed");
      } else {
        setBatchResult(data);
        setActionFeedback(`Generated ${data.countGenerated} tokens across ${data.chunksProcessed} chunks!`);
        setTimeout(() => setActionFeedback(null), 4000);
        // Refresh locked vault table
        fetchLockedVaultPage(null, 0);
      }
    } catch (e: any) {
      setBatchError(e?.message || "Network error generating batch");
    } finally {
      setIsBatchGenerating(false);
    }
  };

  const fetchLockedVaultPage = async (cursor: string | null, targetIndex: number) => {
    setIsFetchingLockedVault(true);
    try {
      let url = "/api/vault/tokens?limit=15";
      if (cursor) {
        url += `&cursor=${encodeURIComponent(cursor)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setLockedVaultTokens(data.data || []);
        setNextCursor(data.nextCursor);
        setLockedVaultTotal(data.totalCount || 0);
        setCursorIndex(targetIndex);
      }
    } catch (e) {
      console.warn("Failed to fetch locked vault:", e);
    } finally {
      setIsFetchingLockedVault(false);
    }
  };

  const handleNextPage = () => {
    if (nextCursor) {
      const newHistory = [...cursorHistory.slice(0, cursorIndex + 1), nextCursor];
      setCursorHistory(newHistory);
      fetchLockedVaultPage(nextCursor, cursorIndex + 1);
    }
  };

  const handlePrevPage = () => {
    if (cursorIndex > 0) {
      const prevCursor = cursorHistory[cursorIndex - 1];
      fetchLockedVaultPage(prevCursor, cursorIndex - 1);
    }
  };

  const loadSnapshots = async () => {
    try {
      const list = await fetchVaultSnapshots();
      setSnapshots(list);
    } catch (e) {
      console.warn("Could not load snapshots:", e);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(id);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const handleManualSecureCurrentList = async () => {
    if (workingTokens.length === 0) {
      setActionFeedback("No tokens in working list to secure.");
      setTimeout(() => setActionFeedback(null), 3000);
      return;
    }
    setIsSecuring(true);
    try {
      const res = await secureTokensToVault(workingTokens, maxCapacity, "manual_user_vault");
      if (res.success) {
        setActionFeedback(
          isFirestoreQuotaExceeded()
            ? `Secured ${res.savedCount} tokens to Local Vault (Cloud Quota Protected)!`
            : `Secured ${res.savedCount} tokens to Firebase Vault!`
        );
        await loadSnapshots();
      } else {
        setActionFeedback(`Save error: ${res.error || "Failed"}`);
      }
    } catch (e: any) {
      setActionFeedback(`Error: ${e?.message || e}`);
    } finally {
      setIsSecuring(false);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  const handleRestoreToWorkspace = () => {
    if (vaultTokens.length === 0) {
      setActionFeedback("No tokens in vault to restore.");
      setTimeout(() => setActionFeedback(null), 3000);
      return;
    }
    onRestoreTokens(vaultTokens);
    setActionFeedback(`Restored ${vaultTokens.length} tokens to active workspace!`);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleIngestGenesisToken = async () => {
    try {
      const genesis = CRYPTOVAULTVAULT_GENESIS_TOKEN as unknown as TokenRecord;
      const existsInWorking = workingTokens.some(t => t.contractAddress === genesis.contractAddress);
      if (!existsInWorking) {
        onRestoreTokens([genesis, ...workingTokens]);
      }
      await secureTokensToVault([genesis]);
      setVaultTokens((prev) => {
        if (prev.some(t => t.contractAddress === genesis.contractAddress)) return prev;
        return [genesis, ...prev];
      });
      setActionFeedback("Ingested official CryptoVaultVault (CVLTX) #3 Genesis Profile into Vault!");
    } catch (e: any) {
      setActionFeedback(`Ingest notice: Added to workspace. ${e?.message || ""}`);
    } finally {
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  const handleDeleteToken = async (tokenId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteTokenFromFirestore(tokenId);
    setVaultTokens((prev) => prev.filter((t) => t.id !== tokenId));
  };

  const handlePurgeVault = async () => {
    try {
      await clearTokenVault();
      setVaultTokens([]);
      setShowPurgeConfirm(false);
      setActionFeedback("Firebase Token Vault cleared successfully.");
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (e) {
      setActionFeedback("Failed to purge vault.");
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  // Export JSON
  const handleExportJSON = () => {
    const sanitized = vaultTokens.map(t => ({
      ...t,
      treasuryAddress: isTreasuryWalletHidden ? "[HIDDEN IN VAULT - SECURED COLD STORAGE]" : t.treasuryAddress
    }));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sanitized, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `token_vault_export_${Date.now()}.json`);
    dlAnchor.click();
    dlAnchor.remove();
  };

  // Export CSV
  const handleExportCSV = () => {
    if (vaultTokens.length === 0) return;
    const headers = ["ID", "Name", "Symbol", "Chain", "Standard", "ContractAddress", "InitialSupply", "SecurityScore", "AuditFirm"];
    const rows = vaultTokens.map(t => [
      t.id,
      `"${t.name}"`,
      t.symbol,
      t.chain,
      t.tokenStandard,
      t.contractAddress,
      t.initialSupply,
      t.securityScore,
      `"${t.auditFirm}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", encodeURI(csvContent));
    dlAnchor.setAttribute("download", `token_vault_export_${Date.now()}.csv`);
    dlAnchor.click();
    dlAnchor.remove();
  };

  // Filtered tokens
  const filteredTokens = useMemo(() => {
    return vaultTokens.filter((t) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.symbol.toLowerCase().includes(q) ||
        t.contractAddress.toLowerCase().includes(q) ||
        t.tokenId.toLowerCase().includes(q);

      const matchChain = selectedChain === "all" || t.chain === selectedChain;
      const matchStandard = selectedStandard === "all" || t.tokenStandard === selectedStandard;

      return matchSearch && matchChain && matchStandard;
    });
  }, [vaultTokens, searchQuery, selectedChain, selectedStandard]);

  // Average security score
  const avgSecurity = useMemo(() => {
    if (vaultTokens.length === 0) return 100;
    const sum = vaultTokens.reduce((acc, t) => acc + (t.securityScore || 0), 0);
    return Math.round(sum / vaultTokens.length);
  }, [vaultTokens]);

  const isListMaxReached = workingTokens.length >= maxCapacity;

  return (
    <div className="space-y-6">
      {/* Top Vault Security Hub Card */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#F27D26]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#1F1F23]">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 rounded-lg bg-[#F27D26]/10 border border-[#F27D26]/30 text-[#F27D26]">
                <Shield className="w-5 h-5" />
              </div>
              <h1 className="text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2">
                <span>OMNI-ID Firebase Token Vault</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-green-500/10 text-green-500 border border-green-500/20 uppercase tracking-wider font-semibold flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Secured
                </span>
              </h1>
            </div>
            <p className="text-xs text-[#8E9299]">
              Cryptographic memory vault storing all automatically generated token contracts in Cloud Firestore.
            </p>
          </div>

          {/* Quick Action Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="btn-vault-manual-secure"
              type="button"
              onClick={handleManualSecureCurrentList}
              disabled={isSecuring || workingTokens.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F27D26] hover:bg-[#ff8e3c] text-black font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {isSecuring ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Securing...</span>
                </>
              ) : (
                <>
                  <Archive className="w-3.5 h-3.5" />
                  <span>Secure Current List ({workingTokens.length})</span>
                </>
              )}
            </button>

            <button
              id="btn-vault-restore-workspace"
              type="button"
              onClick={handleRestoreToWorkspace}
              disabled={vaultTokens.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A0A0C] hover:bg-[#1E1E24] border border-[#1F1F23] hover:border-[#F27D26] text-white text-xs font-mono transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>Restore to Workspace</span>
            </button>

            <button
              id="btn-vault-ingest-cvltx"
              type="button"
              onClick={handleIngestGenesisToken}
              title="Ingest Official CryptoVaultVault (CVLTX) #3 Genesis Profile"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/40 text-[#F27D26] text-xs font-mono font-bold transition-all cursor-pointer active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ingest CVLTX #3</span>
            </button>

            <button
              id="btn-vault-validate-all-contracts"
              type="button"
              onClick={() => setShowValidationModal(true)}
              title="Validate All Token Contract IDs for Remix IDE, Etherscan.io & MetaMask"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A0A0C] hover:bg-[#1E1E24] border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold transition-all cursor-pointer active:scale-95"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Validate Contract IDs</span>
            </button>

            <button
              id="btn-vault-batch-deploy-queue"
              type="button"
              onClick={() => setShowBatchDeployModal(true)}
              title="Launch Single-Click Batch Deployment Queue & Script Generator"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Batch Deploy Queue
                {selectedVaultTokenIds.size > 0 ? ` (${selectedVaultTokenIds.size})` : ""}
              </span>
            </button>

            <div className="flex items-center border border-[#1F1F23] rounded-lg overflow-hidden bg-[#0A0A0C]">
              <button
                id="btn-vault-export-json"
                type="button"
                onClick={handleExportJSON}
                disabled={vaultTokens.length === 0}
                title="Export Vault as JSON"
                className="p-1.5 hover:bg-[#1E1E24] text-[#8E9299] hover:text-white transition-colors cursor-pointer border-r border-[#1F1F23] disabled:opacity-40"
              >
                <FileCode className="w-4 h-4" />
              </button>
              <button
                id="btn-vault-export-csv"
                type="button"
                onClick={handleExportCSV}
                disabled={vaultTokens.length === 0}
                title="Export Vault as CSV"
                className="p-1.5 hover:bg-[#1E1E24] text-[#8E9299] hover:text-white transition-colors cursor-pointer disabled:opacity-40"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Feedback Alert if present */}
        {actionFeedback && (
          <div className="mt-3 p-2.5 rounded-lg bg-[#F27D26]/15 border border-[#F27D26]/30 text-[#F27D26] text-xs font-mono flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* Key Vault Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-4">
          <div className="p-3 rounded-lg bg-[#0A0A0C] border border-[#1F1F23]">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#8E9299] mb-1">
              <span>Vault Tokens</span>
              <Database className="w-3.5 h-3.5 text-[#F27D26]" />
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {isLoading ? "..." : vaultTokens.length.toLocaleString()}
            </div>
            <div className="text-[10px] text-green-500 font-mono flex items-center gap-1 mt-0.5">
              <CloudCheck className="w-3 h-3" />
              <span>Live in Firestore</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#0A0A0C] border border-[#1F1F23]">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#8E9299] mb-1">
              <span>Max List Limit</span>
              <Sliders className="w-3.5 h-3.5 text-[#F27D26]" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-bold font-mono text-white">
                {workingTokens.length}
              </span>
              <span className="text-xs text-[#666] font-mono">/ {maxCapacity}</span>
            </div>
            <div className="text-[10px] font-mono mt-0.5">
              {isListMaxReached ? (
                <span className="text-[#F27D26] font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Auto-Secured in Memory
                </span>
              ) : (
                <span className="text-[#8E9299]">
                  {maxCapacity - workingTokens.length} capacity left
                </span>
              )}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#0A0A0C] border border-[#1F1F23]">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#8E9299] mb-1">
              <span>Security Score</span>
              <Shield className="w-3.5 h-3.5 text-green-500" />
            </div>
            <div className="text-xl font-bold font-mono text-green-400">
              {avgSecurity} <span className="text-xs text-[#666]">/ 100</span>
            </div>
            <div className="text-[10px] text-[#8E9299] font-mono mt-0.5">
              Strict ABAC verification
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#0A0A0C] border border-[#1F1F23]">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#8E9299] mb-1">
              <span>Vault Snapshots</span>
              <Archive className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-xl font-bold font-mono text-cyan-400">
              {snapshots.length}
            </div>
            <div className="text-[10px] text-[#8E9299] font-mono mt-0.5">
              Audit memory checkpoints
            </div>
          </div>

          {/* Treasury Wallet ID Protection Card */}
          <div className="p-3 rounded-lg bg-[#0A0A0C] border border-cyan-500/30 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#8E9299] mb-1">
              <span>Treasury Wallet ID</span>
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-bold font-mono text-cyan-300 truncate">
                {isTreasuryWalletHidden ? "••••••••••••••••" : "0x70Ac...94f0"}
              </span>
              <button
                type="button"
                onClick={() => setIsTreasuryWalletHidden(!isTreasuryWalletHidden)}
                className="p-1 rounded text-[#8E9299] hover:text-white transition-colors cursor-pointer"
                title={isTreasuryWalletHidden ? "Reveal Treasury Wallet ID" : "Hide Treasury Wallet ID in Vault"}
              >
                {isTreasuryWalletHidden ? (
                  <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                )}
              </button>
            </div>
            <div className="text-[10px] text-emerald-400 font-mono mt-0.5 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate">
                {isTreasuryWalletHidden ? "Hidden in Vault (Protected)" : "Revealed (Admin Mode)"}
              </span>
            </div>
          </div>
        </div>

        {/* Encrypted Memory Health Check & Integrity Scan Dashboard Widget */}
        <div
          id="token-vault-memory-health-widget"
          className="mt-3 p-3.5 rounded-xl bg-gradient-to-r from-[#0C0D12] via-[#10121A] to-[#0C0D12] border border-[#222430] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-inner"
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                healthReport?.overallStatus === "corrupted"
                  ? "bg-red-500/15 border-red-500/50 text-red-400"
                  : healthReport?.overallStatus === "healthy"
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                  : "bg-cyan-500/15 border-cyan-500/40 text-cyan-400"
              }`}
            >
              {healthReport?.overallStatus === "corrupted" ? (
                <ShieldAlert className="w-4 h-4 animate-bounce" />
              ) : (
                <HeartPulse className="w-4 h-4" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Memory Health Diagnostic:
                </span>
                {healthReport?.overallStatus === "corrupted" ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/40 flex items-center gap-1 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                    CORRUPTED ({healthReport.corruptedBlobsCount} fault{healthReport.corruptedBlobsCount > 1 ? "s" : ""})
                  </span>
                ) : healthReport?.overallStatus === "healthy" ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    ALL BLOBS VERIFIED (AES-GCM-256)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    {healthReport?.overallStatus?.toUpperCase() || "INITIALIZING..."}
                  </span>
                )}

                <span className="text-[11px] font-mono text-[#8E9299]">
                  {healthReport?.healthyBlobsCount || 0}/{healthReport?.totalBlobsChecked || 0} Blobs Decryptable
                </span>
              </div>

              <div className="text-[11px] font-mono text-[#8E9299] mt-0.5 flex items-center gap-2 flex-wrap">
                <span>
                  Last Health Check:{" "}
                  <strong className="text-gray-200">
                    {healthReport?.timestamp
                      ? new Date(healthReport.timestamp).toLocaleTimeString()
                      : "Never run"}
                  </strong>
                </span>
                <span>•</span>
                <span className="text-cyan-400/90 font-mono">
                  {healthReport?.cryptoApiAvailable ? "Web Crypto Subtle Active" : "No Crypto API"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
            <button
              id="btn-vault-manual-integrity-scan"
              type="button"
              onClick={handleRunManualIntegrityScan}
              disabled={isScanningHealth}
              title="Validate AES-GCM tags, Base64 IV/Salt lengths, and JSON decryptability on encrypted memory blobs"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16161A] hover:bg-[#1E1E24] border border-[#2A2A35] hover:border-cyan-500/50 text-cyan-300 text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isScanningHealth ? "animate-spin" : ""}`} />
              <span>{isScanningHealth ? "Scanning Blobs..." : "Run Integrity Scan"}</span>
            </button>

            <button
              id="btn-vault-view-diagnostics"
              type="button"
              onClick={() => setShowHealthModal(true)}
              title="Open Comprehensive Encrypted Memory Health Diagnostics Tool"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#16161A] hover:bg-[#1E1E24] border border-[#2A2A35] text-[#8E9299] hover:text-white text-xs font-mono font-medium transition-all cursor-pointer active:scale-95"
            >
              <Activity className="w-3.5 h-3.5 text-purple-400" />
              <span>Diagnostics Inspector</span>
            </button>
          </div>
        </div>

        {/* Generation Controller Strip: Enforces "Don't generate when not on start loop OR token generate 100 IDS" */}
        <div className="mt-4 pt-4 border-t border-[#1F1F23] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#0E0E10] p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${constantLoopActive ? "bg-green-500 animate-pulse" : "bg-[#666]"}`} />
            <span className="text-xs font-mono font-medium text-white">
              Generation Policy:
            </span>
            <span className="text-xs font-mono text-[#8E9299]">
              {constantLoopActive 
                ? "Constant Loop Active (Continuous Auto-Save to Vault)" 
                : "Loop Idle — Generation strictly triggered via 'Generate 100 IDs' or Loop Start"}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Max List Capacity Selector */}
            <div className="flex items-center gap-1.5 text-xs font-mono bg-[#16161A] border border-[#1F1F23] px-2.5 py-1 rounded-md">
              <span className="text-[#8E9299]">Max List:</span>
              <select
                id="select-max-list-capacity"
                value={maxCapacity}
                onChange={(e) => onMaxCapacityChange(Number(e.target.value))}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value={50} className="bg-[#16161A]">50 IDs</option>
                <option value={100} className="bg-[#16161A]">100 IDs (Standard)</option>
                <option value={250} className="bg-[#16161A]">250 IDs</option>
                <option value={500} className="bg-[#16161A]">500 IDs</option>
                <option value={1000} className="bg-[#16161A]">1,000 IDs</option>
              </select>
            </div>

            {/* Generate 100 IDs Trigger */}
            <button
              id="btn-vault-generate-100"
              type="button"
              onClick={onGenerate100}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#F27D26]/20 hover:bg-[#F27D26]/30 border border-[#F27D26] text-[#F27D26] text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Generate 100 IDs</span>
            </button>

            {/* Constant Loop Toggle */}
            <button
              id="btn-vault-toggle-loop"
              type="button"
              onClick={onToggleConstantLoop}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-bold transition-all cursor-pointer border ${
                constantLoopActive
                  ? "bg-red-500/20 border-red-500 text-red-400 hover:bg-red-500/30"
                  : "bg-green-500/20 border-green-500 text-green-400 hover:bg-green-500/30"
              }`}
            >
              {constantLoopActive ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop Loop</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Constant Loop</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs: Tokens vs Audit Snapshots */}
      <div className="flex items-center justify-between border-b border-[#1F1F23] pb-2">
        <div className="flex items-center gap-2">
          <button
            id="tab-vault-tokens"
            type="button"
            onClick={() => setActiveSubTab("tokens")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === "tokens"
                ? "bg-[#16161A] text-[#F27D26] border border-[#1F1F23]"
                : "text-[#8E9299] hover:text-white"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Vaulted Token Records ({vaultTokens.length})</span>
          </button>

          <button
            id="tab-vault-snapshots"
            type="button"
            onClick={() => {
              setActiveSubTab("snapshots");
              loadSnapshots();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === "snapshots"
                ? "bg-[#16161A] text-cyan-400 border border-[#1F1F23]"
                : "text-[#8E9299] hover:text-white"
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Memory Snapshots ({snapshots.length})</span>
          </button>

          <button
            id="tab-vault-chunk-engine"
            type="button"
            onClick={() => {
              setActiveSubTab("chunk_engine");
              fetchSystemConfig();
              fetchLockedVaultPage(null, 0);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === "chunk_engine"
                ? "bg-[#16161A] text-purple-400 border border-[#1F1F23]"
                : "text-[#8E9299] hover:text-white"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Chunk Engine & Rules (/tokenVault)</span>
          </button>
        </div>

        {activeSubTab === "tokens" && vaultTokens.length > 0 && (
          <button
            id="btn-purge-vault-prompt"
            type="button"
            onClick={() => setShowPurgeConfirm(true)}
            className="text-[11px] font-mono text-red-400/80 hover:text-red-400 flex items-center gap-1 hover:underline cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            <span>Purge Vault</span>
          </button>
        )}
      </div>

      {/* Confirmation Modal for Purge */}
      {showPurgeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#16161A] border border-red-500/40 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-sm uppercase tracking-wide text-white">
                Confirm Purge Firebase Token Vault
              </h3>
            </div>
            <p className="text-xs text-[#8E9299] leading-relaxed">
              This will permanently delete up to 500 token documents currently stored in your Firebase Cloud Firestore database. Active working tokens in memory will remain untouched.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPurgeConfirm(false)}
                className="px-3 py-1.5 rounded-lg bg-[#0A0A0C] border border-[#1F1F23] text-xs text-[#8E9299] hover:text-white font-mono cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-purge-vault"
                type="button"
                onClick={handlePurgeVault}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold font-mono uppercase tracking-wider cursor-pointer"
              >
                Purge All Documents
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 1: Tokens Table */}
      {activeSubTab === "tokens" && (
        <div className="space-y-4">
          {/* Search & Filters Toolbar */}
          <div className="bg-[#0E0E10] border border-[#1F1F23] rounded-xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#8E9299] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="input-vault-search"
                type="text"
                placeholder="Search vaulted tokens by address, name, or symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-[#0A0A0C] border border-[#1F1F23] focus:border-[#F27D26] text-xs font-mono text-white placeholder-[#666] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                id="select-vault-chain"
                value={selectedChain}
                onChange={(e) => setSelectedChain(e.target.value)}
                className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg px-2.5 py-1.5 text-xs text-[#E0E0E0] focus:outline-none focus:border-[#F27D26] font-mono cursor-pointer"
              >
                <option value="all">All Chains</option>
                <option value="ethereum">Ethereum</option>
                <option value="base">Base</option>
                <option value="arbitrum">Arbitrum</option>
                <option value="polygon">Polygon</option>
                <option value="solana">Solana</option>
                <option value="quantum">Quantum-Hybrid</option>
              </select>

              <select
                id="select-vault-standard"
                value={selectedStandard}
                onChange={(e) => setSelectedStandard(e.target.value)}
                className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg px-2.5 py-1.5 text-xs text-[#E0E0E0] focus:outline-none focus:border-[#F27D26] font-mono cursor-pointer"
              >
                <option value="all">All Standards</option>
                <option value="ERC-20">ERC-20</option>
                <option value="ERC-721">ERC-721</option>
                <option value="ERC-1155">ERC-1155</option>
                <option value="SPL">SPL</option>
              </select>
            </div>
          </div>

          {/* Tokens Table Card */}
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl overflow-hidden shadow-xl">
            {isLoading ? (
              <div className="p-12 text-center space-y-3">
                <RefreshCw className="w-6 h-6 text-[#F27D26] animate-spin mx-auto" />
                <p className="text-xs text-[#8E9299] font-mono">
                  Loading secured tokens from Firebase Cloud Firestore...
                </p>
              </div>
            ) : filteredTokens.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Shield className="w-8 h-8 text-[#666] mx-auto" />
                <h4 className="text-sm font-bold text-white font-mono uppercase">
                  No Tokens Found In Vault
                </h4>
                <p className="text-xs text-[#8E9299] max-w-md mx-auto">
                  Tokens generated via Constant Loop or "Generate 100 IDs" are automatically saved here. You can also click "Secure Current List" above to snapshot your active workspace.
                </p>
                <div className="pt-2 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={onGenerate100}
                    className="px-4 py-2 rounded-lg bg-[#F27D26] text-black font-bold text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Generate 100 IDs Now
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#0E0E10] border-b border-[#1F1F23] text-[#8E9299] text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Token & Symbol</th>
                      <th className="py-3 px-4">Enterprise Contract Address</th>
                      <th className="py-3 px-4">Chain & Standard</th>
                      <th className="py-3 px-4">Initial Supply</th>
                      <th className="py-3 px-4">Security Score</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F1F23]/60">
                    {filteredTokens.map((token) => (
                      <tr
                        key={token.id}
                        className="hover:bg-[#1E1E24]/60 transition-colors group cursor-pointer"
                        onClick={() => onSelectToken(token)}
                      >
                        {/* Token Name & Symbol */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <TokenImage
                              token={token}
                              size="xs"
                              rounded="rounded-lg"
                              fallbackSymbolLength={3}
                            />
                            <div>
                              <div className="font-bold text-white group-hover:text-[#F27D26] transition-colors flex items-center gap-1.5">
                                <span>{token.name}</span>
                                {token.isVanity && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26]/30 font-sans uppercase">
                                    Vanity
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-[#8E9299]">
                                ${token.symbol} • ID #{token.tokenId.slice(0, 8)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Enterprise Contract Address */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[#00F0FF] text-[11px] bg-[#0A0A0C] px-2 py-0.5 rounded border border-[#1F1F23]">
                                {token.contractAddress.slice(0, 8)}...{token.contractAddress.slice(-6)}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopy(token.contractAddress, token.id);
                                }}
                                className="p-1 text-[#8E9299] hover:text-white hover:bg-[#0A0A0C] rounded transition-colors cursor-pointer"
                                title="Copy Enterprise Contract Address"
                              >
                                {copySuccess === token.id ? (
                                  <Check className="w-3.5 h-3.5 text-green-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] font-mono uppercase px-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                                Enterprise
                              </span>
                              <span className="text-[10px] text-[#8E9299] font-mono truncate max-w-[110px]" title={token.contractArchetype || "CREATE2 Proxy"}>
                                {token.contractArchetype ? token.contractArchetype.replace("Enterprise ", "").split("(")[0].trim() : "CREATE2 Proxy"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Chain & Standard */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#0A0A0C] border border-[#1F1F23] text-white capitalize">
                              {token.chain}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#F27D26]/10 text-[#F27D26] border border-[#F27D26]/20">
                              {token.tokenStandard}
                            </span>
                          </div>
                        </td>

                        {/* Initial Supply */}
                        <td className="py-3 px-4 text-[#8E9299] font-mono">
                          {Number(token.initialSupply).toLocaleString()}
                        </td>

                        {/* Security Score */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            <span className="text-green-400 font-bold font-mono">
                              {token.securityScore}/100
                            </span>
                            <span className="text-[10px] text-[#666] hidden sm:inline">
                              ({token.auditFirm})
                            </span>
                          </div>
                        </td>

                        {/* Action buttons */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectToken(token);
                              }}
                              className="p-1.5 rounded bg-[#0A0A0C] hover:bg-[#1E1E24] text-[#8E9299] hover:text-white border border-[#1F1F23] transition-colors cursor-pointer"
                              title="View Token Specification"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteToken(token.id, e)}
                              className="p-1.5 rounded bg-[#0A0A0C] hover:bg-red-500/20 text-[#8E9299] hover:text-red-400 border border-[#1F1F23] hover:border-red-500/40 transition-colors cursor-pointer"
                              title="Delete from Firestore"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Memory Snapshots */}
      {activeSubTab === "snapshots" && (
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1F1F23]">
            <div>
              <h3 className="text-sm font-bold text-white uppercase font-mono">
                Firebase Memory Snapshots
              </h3>
              <p className="text-xs text-[#8E9299]">
                Immutable checkpoints recorded when the token list reaches max capacity or is manually secured.
              </p>
            </div>
            <button
              type="button"
              onClick={loadSnapshots}
              className="flex items-center gap-1.5 text-xs font-mono text-[#F27D26] hover:underline cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Checkpoints</span>
            </button>
          </div>

          {snapshots.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#8E9299] font-mono">
              No snapshots recorded yet. When the token list reaches max capacity, a snapshot is automatically recorded here.
            </div>
          ) : (
            <div className="space-y-3">
              {snapshots.map((snap) => (
                <div
                  key={snap.id}
                  className="p-3.5 rounded-lg bg-[#0A0A0C] border border-[#1F1F23] hover:border-[#F27D26]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{snap.id}</span>
                      <span className="text-[10px] px-2 py-0.2 rounded bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26]/30">
                        {snap.source}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#8E9299] flex items-center gap-3">
                      <span>Saved: {new Date(snap.savedAt).toLocaleString()}</span>
                      <span>Checksum: {snap.checksum}</span>
                    </div>
                    {snap.sampleTokens && snap.sampleTokens.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-[#666] pt-1">
                        <span>Sample:</span>
                        {snap.sampleTokens.map((st, i) => (
                          <span key={i} className="bg-[#16161A] px-1.5 py-0.5 rounded text-[#8E9299]">
                            {st.symbol} ({st.chain})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <div className="text-right">
                      <div className="text-sm font-bold text-cyan-400">
                        {snap.tokenCount} Tokens
                      </div>
                      <div className="text-[10px] text-[#666]">
                        Cap: {snap.maxListCapacity}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Production Chunk Engine & Security Rules (/tokenVault) */}
      {activeSubTab === "chunk_engine" && (
        <div className="space-y-5">
          {/* Security Rules Lockdown Banner */}
          <div className="bg-[#16161A] border border-purple-500/30 rounded-xl p-5 shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1F1F23]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white uppercase font-mono">
                    Firestore Architecture & Rules Lockdown
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-500/10 text-red-400 border border-red-500/20 uppercase font-semibold">
                    Client Access Denied
                  </span>
                </div>
                <p className="text-xs text-[#8E9299]">
                  Direct client reads & writes to <code className="text-purple-300">/tokenVault/{'{tokenId}'}</code> are strictly prohibited by Firestore Security Rules (<code className="text-red-300">allow read, write: if false;</code>). All vault creation and dynamic pagination is routed through authenticated server endpoints.
                </p>
              </div>

              {/* System Flag Toggle */}
              <div className="flex items-center gap-3 bg-[#0A0A0C] border border-[#1F1F23] px-3.5 py-2 rounded-xl">
                <div className="text-right">
                  <div className="text-[10px] font-mono text-[#8E9299] uppercase">
                    Feature Flag (systemConfig)
                  </div>
                  <div className="text-xs font-mono font-bold text-white">
                    isTokenGenerationEnabled:{" "}
                    <span className={systemFlagEnabled ? "text-green-400" : "text-red-400"}>
                      {systemFlagEnabled ? "TRUE" : "FALSE"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleSystemFlag}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold border transition-all cursor-pointer ${
                    systemFlagEnabled
                      ? "bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30"
                      : "bg-green-500/20 border-green-500/40 text-green-400 hover:bg-green-500/30"
                  }`}
                >
                  {systemFlagEnabled ? "Disable Flag" : "Enable Flag"}
                </button>
              </div>
            </div>

            {/* Architecture Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 font-mono text-xs">
              <div className="p-3 rounded-lg bg-[#0A0A0C] border border-[#1F1F23]">
                <div className="text-[11px] text-[#8E9299]">Max System Capacity</div>
                <div className="text-base font-bold text-white mt-0.5">500 Records</div>
                <div className="text-[10px] text-[#666]">Hard clamped per execution</div>
              </div>
              <div className="p-3 rounded-lg bg-[#0A0A0C] border border-[#1F1F23]">
                <div className="text-[11px] text-[#8E9299]">Sub-Batch Chunk Size</div>
                <div className="text-base font-bold text-purple-400 mt-0.5">100 Docs / Chunk</div>
                <div className="text-[10px] text-[#666]">Safe Firestore 500-op limit</div>
              </div>
              <div className="p-3 rounded-lg bg-[#0A0A0C] border border-[#1F1F23]">
                <div className="text-[11px] text-[#8E9299]">Loop Recurrence Guard</div>
                <div className="text-base font-bold text-green-400 mt-0.5">HTTP On-Demand</div>
                <div className="text-[10px] text-[#666]">No recursive onCreate loops</div>
              </div>
            </div>
          </div>

          {/* Generator Control Card */}
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1F1F23]">
              <div>
                <h4 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#F27D26]" />
                  <span>Execute Chunked Token Batch</span>
                </h4>
                <p className="text-xs text-[#8E9299]">
                  Dispatches <code className="text-[#F27D26]">POST /api/vault/generate-batch</code> with segmented sub-batch commits.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#8E9299]">Amount:</span>
                <select
                  value={batchCountInput}
                  onChange={(e) => setBatchCountInput(Number(e.target.value))}
                  className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg px-2.5 py-1 text-xs text-white font-mono cursor-pointer"
                >
                  <option value={50}>50 IDs (1 chunk)</option>
                  <option value={100}>100 IDs (1 chunk)</option>
                  <option value={200}>200 IDs (2 chunks)</option>
                  <option value={300}>300 IDs (3 chunks)</option>
                  <option value={500}>500 IDs (5 chunks - MAX)</option>
                </select>

                <button
                  type="button"
                  onClick={handleExecuteBatchGeneration}
                  disabled={isBatchGenerating}
                  className="flex items-center gap-1.5 px-3.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {isBatchGenerating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Chunking...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>Execute Batch ({batchCountInput})</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error or Success feedback from Batch Execution */}
            {batchError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold uppercase">Execution Blocked / Error:</div>
                  <div className="text-[11px]">{batchError}</div>
                </div>
              </div>
            )}

            {batchResult && (
              <div className="p-3.5 rounded-lg bg-green-500/10 border border-green-500/30 text-xs font-mono space-y-2">
                <div className="flex items-center justify-between text-green-400 font-bold">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Batch Committed Successfully</span>
                  </span>
                  <span className="text-[11px] text-[#8E9299]">Batch ID: {batchResult.batchId}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-[#E0E0E0] pt-1">
                  <div>Generated: <span className="font-bold text-white">{batchResult.countGenerated} IDs</span></div>
                  <div>Chunks: <span className="font-bold text-purple-400">{batchResult.chunksProcessed} sub-batches</span></div>
                  <div>Chunk Size: <span className="font-bold text-white">{batchResult.chunkSize} docs</span></div>
                  <div>Status: <span className="font-bold text-green-400">Unused (Secured)</span></div>
                </div>
              </div>
            )}
          </div>

          {/* Locked Token Vault Dynamic Cursor Browser */}
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl overflow-hidden shadow-xl space-y-0">
            <div className="p-4 bg-[#0E0E10] border-b border-[#1F1F23] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-white uppercase font-mono flex items-center gap-2">
                  <Database className="w-4 h-4 text-purple-400" />
                  <span>Dynamic Cursor Pagination: /tokenVault ({lockedVaultTotal} records)</span>
                </h4>
                <p className="text-[11px] text-[#8E9299] font-mono">
                  Proxied securely via backend cursor (<code className="text-[#00F0FF]">GET /api/vault/tokens</code>) since direct client access is locked down.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevPage}
                  disabled={cursorIndex === 0 || isFetchingLockedVault}
                  className="p-1.5 rounded bg-[#0A0A0C] border border-[#1F1F23] text-white hover:bg-[#1E1E24] disabled:opacity-30 cursor-pointer text-xs font-mono flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev Page</span>
                </button>
                <span className="text-xs font-mono text-[#8E9299] px-2">
                  Page {cursorIndex + 1}
                </span>
                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={!nextCursor || isFetchingLockedVault}
                  className="p-1.5 rounded bg-[#0A0A0C] border border-[#1F1F23] text-white hover:bg-[#1E1E24] disabled:opacity-30 cursor-pointer text-xs font-mono flex items-center gap-1"
                >
                  <span>Next Page</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {isFetchingLockedVault ? (
              <div className="p-8 text-center text-xs font-mono text-[#8E9299] flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                <span>Reading locked vault via cursor...</span>
              </div>
            ) : lockedVaultTokens.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-[#8E9299]">
                No records found in server Token Vault. Click "Execute Batch" above to populate chunked tokens.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#0A0A0C] border-b border-[#1F1F23] text-[#8E9299] text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-4">Token ID (UUID)</th>
                      <th className="py-2.5 px-4">Contract Address</th>
                      <th className="py-2.5 px-4">Standard</th>
                      <th className="py-2.5 px-4">Batch ID</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F1F23]/60">
                    {lockedVaultTokens.map((item) => (
                      <tr key={item.tokenId} className="hover:bg-[#1E1E24]/50 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-purple-300 font-bold">
                          {item.tokenId.slice(0, 18)}...
                        </td>
                        <td className="py-2.5 px-4 text-[#00F0FF]">
                          {item.contractAddress.slice(0, 10)}...{item.contractAddress.slice(-6)}
                        </td>
                        <td className="py-2.5 px-4 text-white">
                          <span className="px-1.5 py-0.5 rounded bg-[#0A0A0C] border border-[#1F1F23] text-[10px]">
                            {item.tokenStandard}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-[#8E9299] text-[11px]">
                          {item.batchId.slice(0, 10)}...
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 uppercase">
                            {item.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right text-[#8E9299] text-[10px]">
                          {new Date(item.createdAt).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Universal Contract Validation Matrix Modal */}
      <UniversalContractValidationModal
        isOpen={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        tokens={workingTokens && workingTokens.length > 0 ? workingTokens : vaultTokens}
      />

      {/* Memory Health Check & Diagnostic Tool Modal */}
      <MemoryHealthCheckModal
        isOpen={showHealthModal}
        onClose={() => setShowHealthModal(false)}
        tokens={workingTokens && workingTokens.length > 0 ? workingTokens : vaultTokens}
        onHealed={() => {
          runCompleteMemoryHealthCheck().then((rep) => setHealthReport(rep));
        }}
      />
    </div>
  );
};
