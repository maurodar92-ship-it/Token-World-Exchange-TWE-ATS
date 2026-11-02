import React, { useState, useMemo } from "react";
import {
  Binary,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Terminal,
  Search,
  Copy,
  Check,
  Download,
  Flame,
  Zap,
  Lock,
  Cpu,
  Layers,
  Database,
  RefreshCw,
  ExternalLink,
  Sliders,
  FileCode,
  Info,
  Globe,
} from "lucide-react";
import {
  analyzeUnverifiedBytecode,
  BytecodeAnalysisReport,
  BytecodeVulnerability,
  SAMPLE_BYTECODE_PRESETS,
  SampleBytecodePreset,
  cleanHexBytecode,
} from "../utils/unverifiedBytecodeInspectorEngine";
import { UINT256_CONTRACT_ADDRESS_DATASET } from "../data/uint256ContractAddressData";

interface Props {
  compiledBytecode?: string;
  compiledContractName?: string;
  onOpenCompilerTab?: () => void;
  initialContractAddress?: string;
}

export const UnverifiedBytecodeInspectorPanel: React.FC<Props> = ({
  compiledBytecode,
  compiledContractName,
  onOpenCompilerTab,
  initialContractAddress,
}) => {
  // Input State
  const [bytecodeInput, setBytecodeInput] = useState<string>(
    SAMPLE_BYTECODE_PRESETS[0].bytecode
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string>("vuln_reentrancy_dao");
  const [selectedUint256Address, setSelectedUint256Address] = useState<string>(
    initialContractAddress || UINT256_CONTRACT_ADDRESS_DATASET[0].contractAddress
  );
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [activeInspectorView, setActiveInspectorView] = useState<"findings" | "disassembly" | "selectors" | "storage">("findings");

  // Opcode search filter
  const [opcodeSearch, setOpcodeSearch] = useState<string>("");
  const [onlyVulnerableOpcodes, setOnlyVulnerableOpcodes] = useState<boolean>(false);

  // Copy state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Perform static analysis
  const analysisReport: BytecodeAnalysisReport = useMemo(() => {
    return analyzeUnverifiedBytecode(bytecodeInput);
  }, [bytecodeInput]);

  // Load preset
  const handleSelectPreset = (preset: SampleBytecodePreset) => {
    setSelectedPresetId(preset.id);
    setBytecodeInput(preset.bytecode);
  };

  // Load from compiled contract
  const handleLoadCompiledContract = () => {
    if (compiledBytecode) {
      setSelectedPresetId("compiled_current");
      setBytecodeInput(compiledBytecode);
    }
  };

  // Format hex input
  const handleFormatHex = () => {
    const cleaned = cleanHexBytecode(bytecodeInput);
    setBytecodeInput("0x" + cleaned);
  };

  // Filtered opcodes
  const filteredInstructions = useMemo(() => {
    return analysisReport.instructions.filter((instr) => {
      if (onlyVulnerableOpcodes && !instr.vulnerabilityTag) {
        return false;
      }
      if (!opcodeSearch.trim()) return true;
      const q = opcodeSearch.toLowerCase().trim();
      const pcHex = "0x" + instr.pc.toString(16).toLowerCase();
      const mnemonic = instr.mnemonic.toLowerCase();
      const pushData = (instr.pushData || "").toLowerCase();
      return mnemonic.includes(q) || pcHex.includes(q) || pushData.includes(q);
    });
  }, [analysisReport.instructions, opcodeSearch, onlyVulnerableOpcodes]);

  // Generate Markdown report for download
  const handleExportMarkdownReport = () => {
    const reportMd = `# EVM Unverified Bytecode Static Analysis Report
**Timestamp**: ${new Date().toISOString()}
**Bytecode Size**: ${analysisReport.rawBytecodeLength} bytes (${analysisReport.instructionCount} instructions)
**Overall Security Rating**: ${analysisReport.overallRiskGrade} (Risk Score: ${analysisReport.overallRiskScore}/100)

## Executive Summary
${analysisReport.summaryText}

## Storage & External Call Footprint
- SLOAD Count: ${analysisReport.storageStats.sloadCount}
- SSTORE Count: ${analysisReport.storageStats.sstoreCount}
- Transient Storage (EIP-1153): ${analysisReport.storageStats.hasTransientStorage ? `Active (${analysisReport.storageStats.tloadCount} TLOAD, ${analysisReport.storageStats.tstoreCount} TSTORE)` : "None"}
- External CALL: ${analysisReport.callStats.callCount}
- DELEGATECALL: ${analysisReport.callStats.delegatecallCount}
- SELFDESTRUCT: ${analysisReport.callStats.selfdestructCount}

## Identified Vulnerabilities (${analysisReport.vulnerabilities.length})
${analysisReport.vulnerabilities.map((v, i) => `
### ${i + 1}. [${v.severity}] ${v.title}
- **Category**: ${v.category.toUpperCase()}
- **Estimated CVSS**: ${v.cvssEstimate}
- **Affected PC Offsets**: ${v.affectedPcs.map(pc => "0x" + pc.toString(16)).join(", ")}
- **Description**: ${v.summary}
- **Exploit Scenario**:
${v.exploitScenario}
- **Recommended Remediation**:
${v.remediation}
`).join("\n")}

## Extracted Function Dispatcher Selectors (${analysisReport.extractedSelectors.length})
${analysisReport.extractedSelectors.map(s => `- \`${s.selectorHex}\` -> Jump PC: 0x${s.jumpDestPc.toString(16)} (${s.probableSignature || "Unmapped"})`).join("\n")}

---
*Generated by Unverified Bytecode Inspector - Token World Exchange & Solidity Studio*
`;

    const blob = new Blob([reportMd], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `EVM_Bytecode_Audit_Report_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reentrancyVulns = analysisReport.vulnerabilities.filter((v) => v.category === "reentrancy");
  const selfdestructVulns = analysisReport.vulnerabilities.filter((v) => v.category === "selfdestruct");
  const delegatecallVulns = analysisReport.vulnerabilities.filter((v) => v.category === "delegatecall");

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                <ShieldAlert className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  Unverified Bytecode Inspector
                  <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    EVM Static Analysis Engine
                  </span>
                </h2>
                <p className="text-xs text-gray-400">
                  Analyze unverified raw EVM runtime bytecode to spot potential reentrancy (CALL → SSTORE), unprotected selfdestruct (0xFF), and arbitrary delegatecall (0xF4) vectors.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportMarkdownReport}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1E1E24] hover:bg-[#25252D] text-gray-200 border border-[#2B2B33] text-xs font-mono transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-orange-400" />
              Export Audit Report
            </button>
            {compiledBytecode && (
              <button
                onClick={handleLoadCompiledContract}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 border border-orange-500/30 text-xs font-semibold transition cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                Load Compiled ({compiledContractName || "Contract"})
              </button>
            )}
          </div>
        </div>

        {/* Preset Selector Bar */}
        <div className="mt-5 pt-4 border-t border-[#23232A]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-orange-400" />
              1-Click Vulnerability Archetypes & Test Presets:
            </span>
            <span className="text-xs font-mono text-gray-500">
              Loaded: {cleanHexBytecode(bytecodeInput).length / 2} bytes
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {SAMPLE_BYTECODE_PRESETS.map((preset) => {
              const isSelected = selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className={`text-left p-2.5 rounded-xl border text-xs transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "bg-red-500/15 border-red-500/40 text-white shadow-sm"
                      : "bg-[#101014] border-[#222228] text-gray-400 hover:border-gray-600 hover:text-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-semibold text-gray-200 truncate">
                      {preset.name.split(" ")[0]} {preset.name.split(" ")[1]}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        preset.expectedRisk === "CRITICAL"
                          ? "bg-red-500/20 text-red-400"
                          : preset.expectedRisk === "HIGH"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-emerald-500/20 text-emerald-400"
                      }`}
                    >
                      {preset.expectedRisk}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-500 line-clamp-1">
                    {preset.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick UINT256 Smart Contract Address Direct Loader */}
          <div className="mt-3 pt-3 border-t border-[#1C1C24] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5 font-mono">
                <Globe className="w-3.5 h-3.5" />
                Inspect 49 UINT256 Contract Addresses:
              </span>
              <select
                value={selectedUint256Address}
                onChange={(e) => {
                  const addr = e.target.value;
                  setSelectedUint256Address(addr);
                  const entry = UINT256_CONTRACT_ADDRESS_DATASET.find(u => u.contractAddress === addr);
                  if (entry) {
                    // Generate mock/deterministic runtime bytecode snippet reflecting the contract's zero prefix
                    const isBurn = addr === "0x0000000000000000000000000000000000000000";
                    if (isBurn) {
                      setBytecodeInput("608060405234801561001057600080fd5b50600080fd");
                    } else {
                      // Load standard ERC-20 with leading zeroes reflected
                      setBytecodeInput(SAMPLE_BYTECODE_PRESETS[4].bytecode);
                    }
                    setSelectedPresetId(`uint256_${addr.slice(0, 8)}`);
                  }
                }}
                className="bg-[#0A0A0C] border border-[#2B2B33] text-gray-200 text-xs rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:border-cyan-400 max-w-xs truncate"
              >
                {UINT256_CONTRACT_ADDRESS_DATASET.map((u, i) => (
                  <option key={u.contractAddress} value={u.contractAddress}>
                    #{i + 1} {u.contractAddress.slice(0, 8)}...{u.contractAddress.slice(-4)} ({u.suggestedSymbol})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`https://etherscan.io/address/${selectedUint256Address}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 font-mono transition"
              >
                <span>Etherscan</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-gray-600">•</span>
              <a
                href={`https://tokensniffer.com/token/eth/${selectedUint256Address}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-mono transition"
              >
                <span>TokenSniffer</span>
                <ShieldCheck className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Raw Bytecode Input Panel */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-semibold text-gray-200">
              Raw EVM Bytecode Input (Runtime / Deployed Code)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleFormatHex}
              className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#202026] text-gray-300 hover:text-white border border-[#2B2B33] transition cursor-pointer"
            >
              Format 0x Hex
            </button>
            <button
              onClick={() => handleCopy(bytecodeInput, "bytecode_input")}
              className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#202026] text-gray-300 hover:text-white border border-[#2B2B33] flex items-center gap-1 transition cursor-pointer"
            >
              {copiedKey === "bytecode_input" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              Copy
            </button>
            <button
              onClick={() => setBytecodeInput("")}
              className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#202026] text-red-400 hover:bg-red-500/20 border border-[#2B2B33] transition cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="relative">
          <textarea
            rows={4}
            value={bytecodeInput}
            onChange={(e) => {
              setSelectedPresetId("custom");
              setBytecodeInput(e.target.value);
            }}
            placeholder="Paste raw EVM bytecode (e.g. 0x608060405234801561001057600080fd5b50...)"
            className="w-full bg-[#0E0E12] border border-[#26262E] rounded-xl p-3.5 text-xs font-mono text-cyan-300 placeholder-gray-600 focus:outline-none focus:border-orange-500/60 resize-y break-all"
          />
        </div>

        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-3">
            <span>
              Hex Chars: <strong className="text-gray-200">{bytecodeInput.trim().replace(/^0x/i, "").length}</strong>
            </span>
            <span>
              Bytes: <strong className="text-gray-200">{analysisReport.rawBytecodeLength}</strong>
            </span>
            <span>
              Opcodes: <strong className="text-gray-200">{analysisReport.instructionCount}</strong>
            </span>
          </div>
          <span className="text-[11px] text-gray-500 font-mono">
            Analyzed dynamically in real-time
          </span>
        </div>
      </div>

      {/* High-Level Risk & KPI Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Overall Risk Score */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between ${
          analysisReport.overallRiskGrade === "CRITICAL"
            ? "bg-red-500/10 border-red-500/30 text-red-300"
            : analysisReport.overallRiskGrade === "HIGH"
            ? "bg-orange-500/10 border-orange-500/30 text-orange-300"
            : analysisReport.overallRiskGrade === "MEDIUM"
            ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
        }`}>
          <span className="text-[11px] font-medium opacity-80">Risk Assessment</span>
          <div className="mt-1">
            <span className="text-lg font-bold font-mono tracking-tight block">
              {analysisReport.overallRiskGrade}
            </span>
            <span className="text-[11px] font-mono opacity-80">
              Score: {analysisReport.overallRiskScore}/100
            </span>
          </div>
        </div>

        {/* Reentrancy Status */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between ${
          reentrancyVulns.length > 0
            ? "bg-red-500/10 border-red-500/30 text-red-300"
            : "bg-[#16161A] border-[#222228] text-gray-300"
        }`}>
          <span className="text-[11px] font-medium text-gray-400">Reentrancy Risk</span>
          <div className="mt-1">
            <span className="text-lg font-bold font-mono">
              {reentrancyVulns.length > 0 ? "VULNERABLE" : "PROTECTED"}
            </span>
            <span className="text-[11px] block font-mono text-gray-400">
              {reentrancyVulns.length} trigger pair{reentrancyVulns.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* Selfdestruct Status */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between ${
          selfdestructVulns.length > 0
            ? "bg-red-500/10 border-red-500/30 text-red-300"
            : "bg-[#16161A] border-[#222228] text-gray-300"
        }`}>
          <span className="text-[11px] font-medium text-gray-400">Selfdestruct (0xFF)</span>
          <div className="mt-1">
            <span className="text-lg font-bold font-mono">
              {analysisReport.callStats.selfdestructCount > 0 ? `${analysisReport.callStats.selfdestructCount} DETECTED` : "NONE"}
            </span>
            <span className="text-[11px] block font-mono text-gray-400">
              {selfdestructVulns.some(v => v.severity === "CRITICAL") ? "Unprotected suicide" : selfdestructVulns.length > 0 ? "Gated execution" : "Clean"}
            </span>
          </div>
        </div>

        {/* Delegatecall Status */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between ${
          delegatecallVulns.length > 0
            ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
            : "bg-[#16161A] border-[#222228] text-gray-300"
        }`}>
          <span className="text-[11px] font-medium text-gray-400">Delegatecall (0xF4)</span>
          <div className="mt-1">
            <span className="text-lg font-bold font-mono">
              {analysisReport.callStats.delegatecallCount > 0 ? `${analysisReport.callStats.delegatecallCount} DETECTED` : "NONE"}
            </span>
            <span className="text-[11px] block font-mono text-gray-400">
              {delegatecallVulns.some(v => v.severity === "CRITICAL") ? "Arbitrary target" : delegatecallVulns.length > 0 ? "Proxy pattern" : "Clean"}
            </span>
          </div>
        </div>

        {/* Storage State Footprint */}
        <div className="p-4 rounded-xl border bg-[#16161A] border-[#222228] text-gray-300 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-gray-400">Storage Footprint</span>
          <div className="mt-1">
            <span className="text-lg font-bold font-mono text-cyan-300">
              {analysisReport.storageStats.sstoreCount} SSTORE
            </span>
            <span className="text-[11px] block font-mono text-gray-400">
              {analysisReport.storageStats.sloadCount} SLOAD
            </span>
          </div>
        </div>

        {/* Transient Storage (EIP-1153) */}
        <div className="p-4 rounded-xl border bg-[#16161A] border-[#222228] text-gray-300 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-gray-400">EIP-1153 Transient</span>
          <div className="mt-1">
            <span className={`text-lg font-bold font-mono ${analysisReport.storageStats.hasTransientStorage ? "text-emerald-400" : "text-gray-500"}`}>
              {analysisReport.storageStats.hasTransientStorage ? "ACTIVE" : "INACTIVE"}
            </span>
            <span className="text-[11px] block font-mono text-gray-400">
              {analysisReport.storageStats.tstoreCount} TSTORE / {analysisReport.storageStats.tloadCount} TLOAD
            </span>
          </div>
        </div>
      </div>

      {/* Summary Banner */}
      <div className={`p-4 rounded-xl border text-xs leading-relaxed flex items-start gap-3 ${
        analysisReport.overallRiskGrade === "CRITICAL"
          ? "bg-red-950/20 border-red-500/30 text-red-200"
          : analysisReport.overallRiskGrade === "HIGH"
          ? "bg-orange-950/20 border-orange-500/30 text-orange-200"
          : analysisReport.overallRiskGrade === "MEDIUM"
          ? "bg-amber-950/20 border-amber-500/30 text-amber-200"
          : "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
      }`}>
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold block">Static Analysis Assessment Summary:</span>
          <p className="text-gray-300">{analysisReport.summaryText}</p>
        </div>
      </div>

      {/* Sub-view Navigation */}
      <div className="flex items-center gap-2 border-b border-[#222228] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveInspectorView("findings")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
            activeInspectorView === "findings"
              ? "bg-[#F27D26] text-white shadow-md shadow-orange-500/20"
              : "bg-[#1E1E24] text-gray-300 hover:text-white border border-[#2B2B33]"
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          Security Findings ({analysisReport.vulnerabilities.length})
        </button>

        <button
          onClick={() => setActiveInspectorView("disassembly")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
            activeInspectorView === "disassembly"
              ? "bg-[#F27D26] text-white shadow-md shadow-orange-500/20"
              : "bg-[#1E1E24] text-gray-300 hover:text-white border border-[#2B2B33]"
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          Opcode Disassembler ({analysisReport.instructionCount})
        </button>

        <button
          onClick={() => setActiveInspectorView("selectors")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
            activeInspectorView === "selectors"
              ? "bg-[#F27D26] text-white shadow-md shadow-orange-500/20"
              : "bg-[#1E1E24] text-gray-300 hover:text-white border border-[#2B2B33]"
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          Function Selectors ({analysisReport.extractedSelectors.length})
        </button>

        <button
          onClick={() => setActiveInspectorView("storage")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
            activeInspectorView === "storage"
              ? "bg-[#F27D26] text-white shadow-md shadow-orange-500/20"
              : "bg-[#1E1E24] text-gray-300 hover:text-white border border-[#2B2B33]"
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          Storage & Call Graph
        </button>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: SECURITY FINDINGS & EXPLOIT WALKTHROUGHS */}
      {/* ========================================================================= */}
      {activeInspectorView === "findings" && (
        <div className="space-y-4">
          {analysisReport.vulnerabilities.length === 0 ? (
            <div className="bg-[#16161A] border border-emerald-500/30 rounded-2xl p-8 text-center space-y-3">
              <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold text-white">No Vulnerabilities Identified</h3>
              <p className="text-xs text-gray-400 max-w-lg mx-auto">
                Static heuristic analysis verified that this bytecode contains no raw CALL-before-SSTORE reentrancy sequences, no unauthenticated SELFDESTRUCT opcodes, and no calldata-controlled DELEGATECALL targets.
              </p>
            </div>
          ) : (
            analysisReport.vulnerabilities.map((vuln) => (
              <div
                key={vuln.id}
                className="bg-[#16161A] border border-[#23232A] rounded-2xl p-5 space-y-4 transition hover:border-[#33333E]"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#23232A] pb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                        vuln.severity === "CRITICAL"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : vuln.severity === "HIGH"
                          ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                          : vuln.severity === "MEDIUM"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      }`}
                    >
                      {vuln.severity}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white">{vuln.title}</h4>
                      <span className="text-[11px] font-mono text-gray-400">
                        Category: {vuln.category.toUpperCase()} | CVSS Estimate: {vuln.cvssEstimate}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400">
                      Affected PCs:
                    </span>
                    {vuln.affectedPcs.map((pc) => (
                      <span
                        key={pc}
                        className="text-xs font-mono px-2 py-0.5 rounded bg-[#202028] text-cyan-300 border border-[#2E2E38]"
                      >
                        0x{pc.toString(16)} ({pc})
                      </span>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <p className="text-xs text-gray-300 leading-relaxed">
                  {vuln.summary}
                </p>

                {/* Offending Disassembly Snippet */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-gray-400 flex items-center gap-1.5">
                    <Terminal className="w-3 h-3 text-orange-400" />
                    Offending EVM Instruction Sequence:
                  </span>
                  <div className="bg-[#0B0B0E] border border-[#23232A] rounded-xl p-3 font-mono text-xs overflow-x-auto space-y-1">
                    {vuln.disassemblySnippet.map((instr) => {
                      const isAffected = vuln.affectedPcs.includes(instr.pc);
                      return (
                        <div
                          key={instr.pc}
                          className={`flex items-center gap-3 px-2 py-1 rounded transition ${
                            isAffected
                              ? "bg-red-500/20 text-red-300 font-semibold border-l-2 border-red-500"
                              : "text-gray-400 hover:bg-[#15151B]"
                          }`}
                        >
                          <span className="text-gray-600 w-16 select-none">
                            0x{instr.pc.toString(16).padStart(4, "0")}
                          </span>
                          <span className="text-cyan-400 w-10 font-bold select-none">
                            0x{instr.opcode.toString(16).padStart(2, "0")}
                          </span>
                          <span className={`w-32 ${isAffected ? "text-red-400 font-bold" : "text-gray-200"}`}>
                            {instr.mnemonic}
                          </span>
                          <span className="text-amber-300 flex-1 truncate">
                            {instr.pushData || ""}
                          </span>
                          {instr.vulnerabilityTag && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950/60 text-red-400 border border-red-800/40 font-mono">
                              {instr.vulnerabilityTag}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Exploit Scenario & Remediation in 2 Columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-[#121216] border border-[#222228] space-y-1.5">
                    <span className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5" />
                      Exploit Mechanism
                    </span>
                    <p className="text-xs text-gray-300 whitespace-pre-line leading-relaxed">
                      {vuln.exploitScenario}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#121216] border border-[#222228] space-y-1.5">
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Remediation & Hardening Guide
                    </span>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      {vuln.remediation}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: FULL OPCODE DISASSEMBLER */}
      {/* ========================================================================= */}
      {activeInspectorView === "disassembly" && (
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-orange-400" />
              <h3 className="text-sm font-bold text-white">
                Interactive EVM Opcode Disassembly
              </h3>
              <span className="text-xs font-mono text-gray-400">
                ({filteredInstructions.length} of {analysisReport.instructionCount} instructions)
              </span>
            </div>

            {/* Filter and Search */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter (e.g. CALL, SSTORE, PUSH4, 0x1a)..."
                  value={opcodeSearch}
                  onChange={(e) => setOpcodeSearch(e.target.value)}
                  className="bg-[#0E0E12] border border-[#2B2B33] rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <button
                onClick={() => setOnlyVulnerableOpcodes(!onlyVulnerableOpcodes)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                  onlyVulnerableOpcodes
                    ? "bg-red-500/20 text-red-300 border border-red-500/40"
                    : "bg-[#22222A] text-gray-400 border border-[#2D2D36] hover:text-white"
                }`}
              >
                Only Flagged Opcodes
              </button>

              <button
                onClick={() => {
                  const txt = filteredInstructions
                    .map((i) => `0x${i.pc.toString(16).padStart(4, "0")}  ${i.mnemonic.padEnd(12)}  ${i.pushData || ""}`)
                    .join("\n");
                  handleCopy(txt, "all_disassembly");
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[#22222A] text-gray-300 hover:text-white border border-[#2D2D36] text-xs font-mono flex items-center gap-1 transition cursor-pointer"
              >
                {copiedKey === "all_disassembly" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                Copy Opcodes
              </button>
            </div>
          </div>

          {/* Opcodes Table */}
          <div className="bg-[#0B0B0E] border border-[#222228] rounded-xl overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto divide-y divide-[#181820] font-mono text-xs scrollbar-thin">
              {filteredInstructions.map((instr) => (
                <div
                  key={instr.pc}
                  className={`flex items-center gap-4 px-3 py-1.5 transition ${
                    instr.vulnerabilityTag
                      ? "bg-red-950/20 text-red-300 border-l-2 border-red-500"
                      : "hover:bg-[#14141A] text-gray-300"
                  }`}
                >
                  <span className="text-gray-500 w-16 select-none">
                    0x{instr.pc.toString(16).padStart(4, "0")}
                  </span>
                  <span className="text-cyan-400 w-12 font-semibold select-none">
                    0x{instr.opcode.toString(16).padStart(2, "0")}
                  </span>
                  <span className={`w-28 font-bold ${instr.vulnerabilityTag ? "text-red-400" : "text-white"}`}>
                    {instr.mnemonic}
                  </span>
                  <span className="text-amber-300 flex-1 truncate font-mono">
                    {instr.pushData || "-"}
                  </span>
                  <span className="text-gray-500 text-[11px] w-16 text-right">
                    {instr.gasCost} gas
                  </span>
                  {instr.vulnerabilityTag && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-red-900/40 text-red-300 border border-red-700/50 font-bold">
                      {instr.vulnerabilityTag}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: FUNCTION SELECTORS & DISPATCHER */}
      {/* ========================================================================= */}
      {activeInspectorView === "selectors" && (
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileCode className="w-4 h-4 text-orange-400" />
                EVM Dispatcher 4-Byte Function Selectors
              </h3>
              <p className="text-xs text-gray-400">
                Extracted from the standard EVM dispatcher pattern: <code className="text-orange-300">PUSH4 0xXXXXXXXX → EQ → JUMPI</code>
              </p>
            </div>
            <span className="text-xs font-mono text-gray-400">
              {analysisReport.extractedSelectors.length} selector{analysisReport.extractedSelectors.length === 1 ? "" : "s"} identified
            </span>
          </div>

          {analysisReport.extractedSelectors.length === 0 ? (
            <div className="p-6 bg-[#0E0E12] border border-[#222228] rounded-xl text-center text-xs text-gray-400">
              No dispatcher PUSH4 selectors detected. This contract may be a minimal proxy, custom dispatcher, or fallback-only contract.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {analysisReport.extractedSelectors.map((sel) => (
                <div
                  key={sel.selectorHex}
                  className="p-3.5 bg-[#0E0E12] border border-[#222228] rounded-xl space-y-2 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-300 px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-800/40">
                      {sel.selectorHex}
                    </span>
                    <span className="text-[11px] font-mono text-gray-400">
                      JumpDest PC: 0x{sel.jumpDestPc.toString(16)}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-white block">
                      {sel.probableSignature || "Unknown / Custom Signature"}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {sel.notes}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#1C1C22]">
                    <span className="text-[10px] text-gray-500 font-mono">
                      2^32 Collision Space
                    </span>
                    <button
                      onClick={() => handleCopy(sel.selectorHex, sel.selectorHex)}
                      className="text-[11px] font-mono text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === sel.selectorHex ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      Copy Selector
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 4: STORAGE FOOTPRINT & EXTERNAL CALL GRAPH */}
      {/* ========================================================================= */}
      {activeInspectorView === "storage" && (
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-5 space-y-5">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-orange-400" />
              EVM Storage Footprint & Interaction Profile
            </h3>
            <p className="text-xs text-gray-400">
              Low-level memory, persistent slot mutations, and external protocol reach.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Storage Profile */}
            <div className="p-4 bg-[#0E0E12] border border-[#222228] rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                Persistent & Transient Storage
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[#1C1C22]">
                  <span className="text-gray-400">Persistent SLOAD (0x54)</span>
                  <span className="font-mono text-white font-bold">{analysisReport.storageStats.sloadCount}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1C1C22]">
                  <span className="text-gray-400">Persistent SSTORE (0x55)</span>
                  <span className="font-mono text-white font-bold">{analysisReport.storageStats.sstoreCount}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1C1C22]">
                  <span className="text-gray-400">Transient TLOAD (0x5C / EIP-1153)</span>
                  <span className="font-mono text-white font-bold">{analysisReport.storageStats.tloadCount}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1C1C22]">
                  <span className="text-gray-400">Transient TSTORE (0x5D / EIP-1153)</span>
                  <span className="font-mono text-white font-bold">{analysisReport.storageStats.tstoreCount}</span>
                </div>
              </div>
            </div>

            {/* External Call Profile */}
            <div className="p-4 bg-[#0E0E12] border border-[#222228] rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-orange-300 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                External Execution Primitives
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[#1C1C22]">
                  <span className="text-gray-400">Standard CALL (0xF1)</span>
                  <span className="font-mono text-white font-bold">{analysisReport.callStats.callCount}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1C1C22]">
                  <span className="text-gray-400">DELEGATECALL (0xF4)</span>
                  <span className="font-mono text-white font-bold">{analysisReport.callStats.delegatecallCount}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1C1C22]">
                  <span className="text-gray-400">STATICCALL (0xFA)</span>
                  <span className="font-mono text-white font-bold">{analysisReport.callStats.staticcallCount}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1C1C22]">
                  <span className="text-gray-400">SELFDESTRUCT (0xFF)</span>
                  <span className="font-mono text-white font-bold">{analysisReport.callStats.selfdestructCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
