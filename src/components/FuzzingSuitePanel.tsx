import React, { useState, useMemo } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Play,
  RefreshCw,
  Sliders,
  Terminal,
  Code2,
  HardDrive,
  Copy,
  Check,
  Download,
  AlertTriangle,
  Zap,
  Activity,
  Layers,
  ChevronDown,
  ChevronRight,
  Info,
  CheckCircle2,
  XCircle,
  Hash,
  Sparkles,
  BarChart3,
  Search,
  Plus,
  Trash2,
} from "lucide-react";
import { CompilationResult } from "../utils/solidityCompilerEngine";
import {
  FuzzInvariantProperty,
  FuzzRunConfig,
  FuzzParamDefinition,
  FuzzCampaignReport,
  DEFAULT_INVARIANT_PROPERTIES,
  DEFAULT_FUZZ_CONFIG,
  FUZZ_ACTORS,
  extractFuzzableMethodsFromAbi,
  runFuzzingCampaign,
} from "../utils/fuzzingSuiteEngine";
import { fossibotMemoryCardClient } from "../utils/fossibotDeviceMemoryCard";

interface Props {
  compilationResult: CompilationResult | null;
  onOpenSolidityCompiler?: () => void;
}

export const FuzzingSuitePanel: React.FC<Props> = ({
  compilationResult,
  onOpenSolidityCompiler,
}) => {
  // Config State
  const [fuzzConfig, setFuzzConfig] = useState<FuzzRunConfig>(DEFAULT_FUZZ_CONFIG);
  const [properties, setProperties] = useState<FuzzInvariantProperty[]>(DEFAULT_INVARIANT_PROPERTIES);
  const [selectedMethodName, setSelectedMethodName] = useState<string>("");

  // Parameter definitions customized per method
  const [customParams, setCustomParams] = useState<Record<string, FuzzParamDefinition[]>>({});

  // Fuzzing Execution State
  const [isFuzzing, setIsFuzzing] = useState<boolean>(false);
  const [campaignReport, setCampaignReport] = useState<FuzzCampaignReport | null>(null);
  const [selectedCounterexampleId, setSelectedCounterexampleId] = useState<string | null>(null);
  const [activeResultsTab, setActiveResultsTab] = useState<"invariants" | "gas" | "foundry" | "traces">("invariants");

  // Notifications & Copy state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // New Custom Invariant Form
  const [showAddInvariantModal, setShowAddInvariantModal] = useState<boolean>(false);
  const [newPropName, setNewPropName] = useState<string>("");
  const [newPropDesc, setNewPropDesc] = useState<string>("");
  const [newPropExpr, setNewPropExpr] = useState<string>("assertLe(balanceOf[user], totalSupply)");
  const [newPropCategory, setNewPropCategory] = useState<FuzzInvariantProperty["category"]>("custom_logic");

  // Extract fuzzable methods from ABI
  const availableMethods = useMemo(() => {
    if (!compilationResult || !compilationResult.abi) return [];
    return extractFuzzableMethodsFromAbi(compilationResult.abi);
  }, [compilationResult]);

  // Set default selected method when available
  React.useEffect(() => {
    if (availableMethods.length > 0 && !selectedMethodName) {
      setSelectedMethodName(availableMethods[0].methodName);
    }
  }, [availableMethods, selectedMethodName]);

  // Current method parameters
  const currentMethodParams = useMemo(() => {
    if (!selectedMethodName) return [];
    if (customParams[selectedMethodName]) return customParams[selectedMethodName];
    const m = availableMethods.find((item) => item.methodName === selectedMethodName);
    return m ? m.inputs : [];
  }, [selectedMethodName, customParams, availableMethods]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleToggleProperty = (propId: string) => {
    setProperties((prev) =>
      prev.map((p) => (p.id === propId ? { ...p, enabled: !p.enabled } : p))
    );
  };

  const handleUpdateParamDistribution = (paramName: string, dist: FuzzParamDefinition["distribution"]) => {
    if (!selectedMethodName) return;
    const current = [...currentMethodParams];
    const idx = current.findIndex((p) => p.name === paramName);
    if (idx !== -1) {
      current[idx] = { ...current[idx], distribution: dist };
      setCustomParams((prev) => ({
        ...prev,
        [selectedMethodName]: current,
      }));
    }
  };

  const handleAddCustomInvariant = () => {
    if (!newPropName.trim()) return;
    const newProp: FuzzInvariantProperty = {
      id: `custom_inv_${Date.now().toString().slice(-5)}`,
      name: newPropName.trim(),
      description: newPropDesc.trim() || "User-defined custom invariant constraint.",
      category: newPropCategory,
      enabled: true,
      expression: newPropExpr.trim(),
      targetMethod: selectedMethodName || undefined,
    };
    setProperties((prev) => [...prev, newProp]);
    setShowAddInvariantModal(false);
    setNewPropName("");
    setNewPropDesc("");
    setNotification(`Added custom invariant: ${newProp.name}`);
    setTimeout(() => setNotification(null), 3000);
  };

  // Run Fuzzing Campaign
  const handleExecuteFuzzCampaign = () => {
    if (!compilationResult) {
      setNotification("Please compile a Solidity contract first in the Compiler Studio.");
      setTimeout(() => setNotification(null), 3500);
      return;
    }

    setIsFuzzing(true);
    setTimeout(() => {
      try {
        const report = runFuzzingCampaign(compilationResult, properties, fuzzConfig, customParams);
        setCampaignReport(report);
        if (report.counterexamples.length > 0) {
          setSelectedCounterexampleId(report.counterexamples[0].propertyId);
        }
        setIsFuzzing(false);
        setNotification(`Fuzzing Campaign Complete: ${report.totalExecutions.toLocaleString()} test calls executed across ${report.totalProperties} properties!`);
        setTimeout(() => setNotification(null), 4000);
      } catch (err: any) {
        setIsFuzzing(false);
        setNotification(`Error running fuzz campaign: ${err?.message}`);
        setTimeout(() => setNotification(null), 4000);
      }
    }, 450);
  };

  // Save report to Fossibot MicroSD Card
  const handleSaveReportToFossibot = () => {
    if (!campaignReport) return;
    try {
      const fileName = `FuzzReport_${campaignReport.contractName}_${Date.now().toString().slice(-6)}.twreport`;
      fossibotMemoryCardClient.saveArtifactToMemoryCard(
        fileName,
        "SECURITY_AUDIT",
        JSON.stringify(campaignReport, null, 2),
        true
      );
      setNotification(`Fuzzing Audit Report safely written to Fossibot MicroSD Card Enclave (${fileName})!`);
      setTimeout(() => setNotification(null), 4000);
    } catch (e: any) {
      setNotification(`Error saving to Fossibot: ${e?.message}`);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleDownloadFoundryFile = () => {
    if (!campaignReport) return;
    const blob = new Blob([campaignReport.foundryTestFile], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${campaignReport.contractName}FuzzTest.t.sol`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 rounded-xl px-4 py-3 text-emerald-300 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Hero Banner */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Property-Based Fuzzing Suite
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                Foundry Forge Invariant Engine
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                Automatic Shrinking
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                Gas Distribution Analysis
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Contract Fuzzing & Invariant Testing Studio
            </h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              Define input parameter boundary distributions, formulate mathematical invariants (solvency, conservation, access control),
              and automatically execute thousands of randomized property-based tests against your compiled contract artifacts.
            </p>

            {compilationResult ? (
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono pt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Target Artifact: <strong>{compilationResult.contractName}</strong> (Solidity v{compilationResult.compilerVersion}, {compilationResult.evmTarget})
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-amber-400 font-mono pt-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                No compiled contract detected. Click &quot;Open Compiler Studio&quot; to compile your Solidity source.
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 min-w-[210px]">
            <button
              onClick={handleExecuteFuzzCampaign}
              disabled={isFuzzing || !compilationResult}
              className={`px-5 py-3 rounded-xl text-xs sm:text-sm font-bold text-white transition flex items-center justify-center gap-2 shadow-lg ${
                isFuzzing || !compilationResult
                  ? "bg-gray-700/50 cursor-not-allowed opacity-60 text-gray-400 border border-gray-600"
                  : "bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 border border-red-500/40 shadow-red-500/20"
              }`}
            >
              {isFuzzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  Running Fuzzing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-white" />
                  Run Fuzzing Campaign ({fuzzConfig.runs} Runs)
                </>
              )}
            </button>

            {onOpenSolidityCompiler && (
              <button
                onClick={onOpenSolidityCompiler}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#1E1E24] hover:bg-[#25252D] text-gray-300 border border-[#2B2B33] transition flex items-center justify-center gap-2"
              >
                <Code2 className="w-4 h-4 text-orange-400" />
                Compiler Studio
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Parameters Config & Invariants Definition */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Fuzz Parameters & Function Selector (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Target Function & Input Parameters */}
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#222228] pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-orange-400" />
                <h3 className="text-sm font-bold text-white">Target Function & Parameters</h3>
              </div>
              <span className="text-[11px] font-mono text-gray-400">
                {availableMethods.length} Methods in ABI
              </span>
            </div>

            {/* Function Select */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Target Method for Fuzz Ingestion
              </label>
              <select
                value={selectedMethodName}
                onChange={(e) => setSelectedMethodName(e.target.value)}
                className="w-full bg-[#0A0A0C] border border-[#2B2B33] rounded-xl px-3 py-2 text-xs font-mono text-orange-300 focus:outline-none focus:border-orange-500"
              >
                {availableMethods.map((m) => (
                  <option key={m.signature} value={m.methodName}>
                    {m.signature}
                  </option>
                ))}
              </select>
            </div>

            {/* Parameters Table */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2">
                Input Parameter Distributions & Bounds
              </label>

              {currentMethodParams.length === 0 ? (
                <div className="p-3 rounded-xl bg-[#0F0F12] border border-[#1F1F23] text-xs text-gray-400 text-center">
                  This function takes no parameters (parameterless call).
                </div>
              ) : (
                <div className="space-y-2.5">
                  {currentMethodParams.map((param) => (
                    <div
                      key={param.name}
                      className="p-3 rounded-xl bg-[#0F0F12] border border-[#1F1F23] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white font-mono">
                            {param.name}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            {param.type}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <div>
                          <span className="block text-[10px] text-gray-400 mb-1">
                            Distribution Generator
                          </span>
                          <select
                            value={param.distribution}
                            onChange={(e) =>
                              handleUpdateParamDistribution(
                                param.name,
                                e.target.value as FuzzParamDefinition["distribution"]
                              )
                            }
                            className="w-full bg-[#18181E] border border-[#2B2B33] rounded-lg px-2 py-1.5 text-[11px] text-gray-200 focus:outline-none focus:border-orange-500"
                          >
                            <option value="edge_heavy">Edge-Heavy (0, 1, 2^256-1)</option>
                            <option value="uniform">Uniform Random</option>
                            <option value="boundary_extremes">Boundary Extremes (Max/Min)</option>
                            <option value="realistic_wei">Realistic Wei (10^18)</option>
                            <option value="actor_pool">Actor Pool (Owner, Whales, Attacker)</option>
                          </select>
                        </div>

                        <div>
                          <span className="block text-[10px] text-gray-400 mb-1">
                            Actor Pool / Sample
                          </span>
                          <div className="bg-[#18181E] border border-[#2B2B33] rounded-lg px-2 py-1.5 text-[10px] font-mono text-gray-400 truncate">
                            {param.type === "address"
                              ? "5 Core Actors + Random EOA"
                              : param.type === "bool"
                              ? "True / False Alternating"
                              : "0 → 2^256-1 + Edge Set"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fuzz Engine Execution Configuration */}
            <div className="pt-2 border-t border-[#1F1F23] space-y-3">
              <h4 className="text-xs font-bold text-gray-300">Fuzz Engine Configuration</h4>

              <div className="grid grid-cols-2 gap-3">
                {/* Runs count */}
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">
                    Number of Fuzz Runs
                  </label>
                  <select
                    value={fuzzConfig.runs}
                    onChange={(e) =>
                      setFuzzConfig((prev) => ({ ...prev, runs: Number(e.target.value) }))
                    }
                    className="w-full bg-[#0A0A0C] border border-[#2B2B33] rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value={100}>100 Runs (Rapid check)</option>
                    <option value={256}>256 Runs (Standard Foundry)</option>
                    <option value={1000}>1,000 Runs (Thorough)</option>
                    <option value={5000}>5,000 Runs (Deep audit)</option>
                    <option value={10000}>10,000 Runs (Exhaustive)</option>
                  </select>
                </div>

                {/* Mode */}
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">
                    Testing Mode
                  </label>
                  <select
                    value={fuzzConfig.mode}
                    onChange={(e) =>
                      setFuzzConfig((prev) => ({
                        ...prev,
                        mode: e.target.value as "stateless" | "stateful_invariant",
                      }))
                    }
                    className="w-full bg-[#0A0A0C] border border-[#2B2B33] rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="stateless">Stateless Fuzzing</option>
                    <option value="stateful_invariant">Stateful Invariant Campaign</option>
                  </select>
                </div>

                {/* Seed */}
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">
                    PRNG Seed
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={fuzzConfig.seed}
                      onChange={(e) =>
                        setFuzzConfig((prev) => ({ ...prev, seed: Number(e.target.value) }))
                      }
                      className="w-full bg-[#0A0A0C] border border-[#2B2B33] rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                    />
                    <button
                      onClick={() =>
                        setFuzzConfig((prev) => ({ ...prev, seed: Math.floor(Math.random() * 10000) }))
                      }
                      title="Randomize Seed"
                      className="p-1 rounded bg-[#1E1E24] hover:bg-[#2B2B33] text-gray-300"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Shrink on Fail */}
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">
                    Counterexample Shrinking
                  </label>
                  <button
                    onClick={() =>
                      setFuzzConfig((prev) => ({ ...prev, shrinkOnFail: !prev.shrinkOnFail }))
                    }
                    className={`w-full py-1 rounded-lg text-xs font-semibold border transition ${
                      fuzzConfig.shrinkOnFail
                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                        : "bg-gray-800 border-gray-700 text-gray-400"
                    }`}
                  >
                    {fuzzConfig.shrinkOnFail ? "Shrink Enabled (Auto)" : "Shrink Disabled"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Invariant Properties List (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#222228] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Invariant Properties Under Verification</h3>
              </div>
              <button
                onClick={() => setShowAddInvariantModal(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Invariant
              </button>
            </div>

            {/* Invariants List */}
            <div className="space-y-3">
              {properties.map((prop) => {
                const isCustom = prop.id.startsWith("custom_");
                return (
                  <div
                    key={prop.id}
                    className={`p-3.5 rounded-xl border transition ${
                      prop.enabled
                        ? "bg-[#0F0F12] border-[#222229]"
                        : "bg-[#0B0B0E] border-[#18181D] opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={prop.enabled}
                          onChange={() => handleToggleProperty(prop.id)}
                          className="mt-1 w-4 h-4 rounded text-orange-500 bg-[#1E1E24] border-gray-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-white">
                              {prop.name}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                                prop.category === "solvency"
                                  ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                                  : prop.category === "balance_conservation"
                                  ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                                  : prop.category === "zero_address_guard"
                                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                  : prop.category === "access_control"
                                  ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                                  : "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                              }`}
                            >
                              {prop.category.replace("_", " ")}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed">
                            {prop.description}
                          </p>
                          <div className="pt-1 font-mono text-[11px] text-orange-400/90 bg-[#0A0A0C] px-2.5 py-1 rounded border border-[#1A1A20] truncate">
                            {prop.expression}
                          </div>
                        </div>
                      </div>

                      {isCustom && (
                        <button
                          onClick={() =>
                            setProperties((prev) => prev.filter((p) => p.id !== prop.id))
                          }
                          className="text-gray-500 hover:text-red-400 p-1"
                          title="Delete Custom Invariant"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Add Custom Invariant Modal */}
      {showAddInvariantModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#16161A] border border-[#2B2B33] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#222228] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                Define Custom Invariant Property
              </h3>
              <button
                onClick={() => setShowAddInvariantModal(false)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Invariant Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Non-Zero Liquidity Preservation"
                  value={newPropName}
                  onChange={(e) => setNewPropName(e.target.value)}
                  className="w-full bg-[#0A0A0C] border border-[#2B2B33] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Liquidity pool invariant x * y >= k holds under all swap operations."
                  value={newPropDesc}
                  onChange={(e) => setNewPropDesc(e.target.value)}
                  className="w-full bg-[#0A0A0C] border border-[#2B2B33] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={newPropCategory}
                  onChange={(e) =>
                    setNewPropCategory(e.target.value as FuzzInvariantProperty["category"])
                  }
                  className="w-full bg-[#0A0A0C] border border-[#2B2B33] rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="solvency">Solvency & Supply Bounds</option>
                  <option value="balance_conservation">Conservation of Balances</option>
                  <option value="access_control">Access Control & Role Guards</option>
                  <option value="zero_address_guard">Zero Address Protection</option>
                  <option value="arithmetic_bounds">Safe Arithmetic</option>
                  <option value="custom_logic">Custom Logic / Mathematical</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Solidity Assertion Expression
                </label>
                <input
                  type="text"
                  value={newPropExpr}
                  onChange={(e) => setNewPropExpr(e.target.value)}
                  className="w-full bg-[#0A0A0C] border border-[#2B2B33] rounded-xl px-3 py-2 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#222228]">
              <button
                onClick={() => setShowAddInvariantModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomInvariant}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                Save Invariant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Results View */}
      {campaignReport && (
        <div className="space-y-6 pt-2">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 rounded-xl bg-[#16161A] border border-[#1F1F23] space-y-1">
              <span className="text-[11px] text-gray-400">Total Fuzz Calls</span>
              <div className="text-xl font-extrabold text-white font-mono">
                {campaignReport.totalExecutions.toLocaleString()}
              </div>
              <span className="text-[10px] text-emerald-400">
                {campaignReport.config.runs} runs × {campaignReport.totalProperties} props
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#16161A] border border-[#1F1F23] space-y-1">
              <span className="text-[11px] text-gray-400">Invariants Passed</span>
              <div className="text-xl font-extrabold text-emerald-400 font-mono">
                {campaignReport.passedProperties} / {campaignReport.totalProperties}
              </div>
              <span className="text-[10px] text-gray-400">
                {Math.round((campaignReport.passedProperties / campaignReport.totalProperties) * 100)}% Success Rate
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#16161A] border border-[#1F1F23] space-y-1">
              <span className="text-[11px] text-gray-400">Violations Found</span>
              <div className={`text-xl font-extrabold font-mono ${
                campaignReport.failedProperties > 0 ? "text-red-400" : "text-emerald-400"
              }`}>
                {campaignReport.failedProperties}
              </div>
              <span className="text-[10px] text-gray-400">
                {campaignReport.failedProperties > 0 ? "Counterexamples shrunk" : "Zero regressions"}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#16161A] border border-[#1F1F23] space-y-1">
              <span className="text-[11px] text-gray-400">Opcode Coverage</span>
              <div className="text-xl font-extrabold text-cyan-400 font-mono">
                {campaignReport.opcodeCoveragePercent}%
              </div>
              <span className="text-[10px] text-gray-400">
                EVM Branch Traversal
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#16161A] border border-[#1F1F23] space-y-1">
              <span className="text-[11px] text-gray-400">Average Gas Cost</span>
              <div className="text-xl font-extrabold text-orange-400 font-mono">
                {campaignReport.gasStats.avg.toLocaleString()}
              </div>
              <span className="text-[10px] text-gray-400">
                Median: {campaignReport.gasStats.median.toLocaleString()} gas
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#16161A] border border-[#1F1F23] space-y-1">
              <span className="text-[11px] text-gray-400">Execution Speed</span>
              <div className="text-xl font-extrabold text-purple-400 font-mono">
                {campaignReport.durationMs}ms
              </div>
              <span className="text-[10px] text-gray-400">
                In-Memory EVM Harness
              </span>
            </div>
          </div>

          {/* Results Sub-Tab Navigation Bar */}
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222228] pb-4">
              <div className="flex items-center gap-2 overflow-x-auto">
                <button
                  onClick={() => setActiveResultsTab("invariants")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                    activeResultsTab === "invariants"
                      ? "bg-red-500/20 text-red-300 border border-red-500/40"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Invariant Verification ({campaignReport.totalProperties})
                </button>

                <button
                  onClick={() => setActiveResultsTab("gas")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                    activeResultsTab === "gas"
                      ? "bg-orange-500/20 text-orange-300 border border-orange-500/40"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Gas Distribution Histogram
                </button>

                <button
                  onClick={() => setActiveResultsTab("foundry")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                    activeResultsTab === "foundry"
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  Foundry Test Script (FuzzTest.t.sol)
                </button>

                {campaignReport.counterexamples.length > 0 && (
                  <button
                    onClick={() => setActiveResultsTab("traces")}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                      activeResultsTab === "traces"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <Terminal className="w-3.5 h-3.5 text-amber-400" />
                    Counterexample Traces ({campaignReport.counterexamples.length})
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveReportToFossibot}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition flex items-center gap-1.5"
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  Save to Fossibot MicroSD
                </button>

                <button
                  onClick={handleDownloadFoundryFile}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export .t.sol
                </button>
              </div>
            </div>

            {/* Sub-Tab 1: Invariants Detailed Results */}
            {activeResultsTab === "invariants" && (
              <div className="space-y-3">
                {campaignReport.propertyResults.map((res) => {
                  const hasFailed = res.status === "FAILED";
                  return (
                    <div
                      key={res.property.id}
                      className={`p-4 rounded-xl border transition ${
                        hasFailed
                          ? "bg-red-950/20 border-red-500/40"
                          : "bg-[#0F0F12] border-[#222229]"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          {hasFailed ? (
                            <XCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                          )}
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-white">
                                {res.property.name}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  hasFailed
                                    ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                }`}
                              >
                                {res.status} ({res.runsExecuted} runs)
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              {res.property.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                          <div>
                            <span className="text-gray-500 block text-[10px]">Avg Gas</span>
                            <span className="text-orange-300">{res.avgGasUsed.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block text-[10px]">Violations</span>
                            <span className={hasFailed ? "text-red-400 font-bold" : "text-emerald-400"}>
                              {res.violationsFound}
                            </span>
                          </div>
                          {res.counterexample && (
                            <button
                              onClick={() => {
                                setSelectedCounterexampleId(res.property.id);
                                setActiveResultsTab("traces");
                              }}
                              className="px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-[11px]"
                            >
                              Inspect Counterexample →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Sub-Tab 2: Gas Distribution Histogram */}
            {activeResultsTab === "gas" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-[#0F0F12] border border-[#222228]">
                    <span className="text-[10px] text-gray-500 block">Minimum Gas</span>
                    <span className="text-base font-bold text-white font-mono">
                      {campaignReport.gasStats.min.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0F0F12] border border-[#222228]">
                    <span className="text-[10px] text-gray-500 block">Median Gas</span>
                    <span className="text-base font-bold text-orange-400 font-mono">
                      {campaignReport.gasStats.median.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0F0F12] border border-[#222228]">
                    <span className="text-[10px] text-gray-500 block">Average Gas</span>
                    <span className="text-base font-bold text-cyan-400 font-mono">
                      {campaignReport.gasStats.avg.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0F0F12] border border-[#222228]">
                    <span className="text-[10px] text-gray-500 block">Maximum Gas (Worst-Case)</span>
                    <span className="text-base font-bold text-red-400 font-mono">
                      {campaignReport.gasStats.max.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#0F0F12] border border-[#222228] space-y-3">
                  <h4 className="text-xs font-bold text-gray-300">
                    Execution Gas Distribution Frequency (All Fuzz Calls)
                  </h4>
                  <div className="space-y-2">
                    {campaignReport.gasStats.histogramBuckets.map((b) => {
                      const maxCount = Math.max(
                        1,
                        ...campaignReport.gasStats.histogramBuckets.map((item) => item.count)
                      );
                      const percent = Math.round((b.count / maxCount) * 100);
                      return (
                        <div key={b.range} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                            <span>{b.range} gas</span>
                            <span>{b.count} calls ({Math.round((b.count / campaignReport.totalExecutions) * 100)}%)</span>
                          </div>
                          <div className="w-full h-3 bg-[#1B1B22] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Tab 3: Foundry Test Script */}
            {activeResultsTab === "foundry" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-400">
                    Target File: <span className="text-white font-mono">test/{campaignReport.contractName}FuzzTest.t.sol</span>
                  </div>
                  <button
                    onClick={() => handleCopy(campaignReport.foundryTestFile, "foundry_code")}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1E1E24] hover:bg-[#2B2B33] text-gray-200 border border-[#2B2B33] flex items-center gap-1.5"
                  >
                    {copiedKey === "foundry_code" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                        Copy Solidity Test Script
                      </>
                    )}
                  </button>
                </div>

                <pre className="p-4 rounded-xl bg-[#0A0A0C] border border-[#1F1F23] text-xs font-mono text-emerald-400/90 overflow-x-auto max-h-96 scrollbar-thin">
                  {campaignReport.foundryTestFile}
                </pre>
              </div>
            )}

            {/* Sub-Tab 4: Counterexample Traces */}
            {activeResultsTab === "traces" && (
              <div className="space-y-4">
                {campaignReport.counterexamples.length === 0 ? (
                  <div className="p-6 rounded-xl bg-[#0F0F12] border border-[#222228] text-center text-xs text-gray-400">
                    No counterexamples discovered! All invariant properties held under property-based fuzzing.
                  </div>
                ) : (
                  campaignReport.counterexamples.map((ce) => (
                    <div
                      key={ce.propertyId}
                      className="p-4 rounded-xl bg-red-950/20 border border-red-500/40 space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                            <span className="text-sm font-bold text-white">
                              {ce.propertyName}
                            </span>
                          </div>
                          <p className="text-xs text-red-300 mt-1">
                            {ce.violationMessage}
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded bg-red-500/30 text-red-200 text-xs font-mono font-bold">
                          Run #{ce.failedRunIndex}
                        </span>
                      </div>

                      {/* Shrunk Inputs vs Raw */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-[#0A0A0C] border border-[#222228] space-y-1">
                          <span className="text-[10px] text-gray-400 block font-semibold">
                            Initial Fuzz Vector (Raw Breaking Input)
                          </span>
                          <pre className="text-[11px] font-mono text-gray-300 overflow-x-auto">
                            {JSON.stringify(ce.initialFuzzInputs, null, 2)}
                          </pre>
                        </div>

                        <div className="p-3 rounded-lg bg-[#0A0A0C] border border-red-500/30 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-emerald-400 block font-semibold">
                              Minimal Shrunk Counterexample
                            </span>
                            <span className="text-[10px] font-mono text-gray-400">
                              {ce.shrinkSteps} Shrink Steps
                            </span>
                          </div>
                          <pre className="text-[11px] font-mono text-emerald-300 overflow-x-auto">
                            {JSON.stringify(ce.shrunkInputs, null, 2)}
                          </pre>
                        </div>
                      </div>

                      {/* Step-by-Step Call Trace */}
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-gray-300">
                          EVM Execution Call Trace
                        </span>
                        <div className="space-y-1.5 font-mono text-xs">
                          {ce.callTrace.map((step) => (
                            <div
                              key={step.stepIndex}
                              className="p-2.5 rounded-lg bg-[#0F0F14] border border-[#222228] flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">#{step.stepIndex}</span>
                                <span className="text-blue-400">[{step.callerRole.toUpperCase()}]</span>
                                <span className="text-white font-bold">{step.method}()</span>
                                {step.revertReason && (
                                  <span className="text-red-400 text-[11px]">
                                    → REVERT: &quot;{step.revertReason}&quot;
                                  </span>
                                )}
                              </div>
                              <span className="text-orange-400 text-[11px]">
                                {step.gasUsed.toLocaleString()} gas
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Reproduction command */}
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0A0A0C] border border-[#1F1F23]">
                        <span className="text-xs font-mono text-gray-300">
                          {ce.reproductionCommand}
                        </span>
                        <button
                          onClick={() => handleCopy(ce.reproductionCommand, `repro_${ce.propertyId}`)}
                          className="text-xs text-orange-400 hover:text-white flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          {copiedKey === `repro_${ce.propertyId}` ? "Copied" : "Copy CLI"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
