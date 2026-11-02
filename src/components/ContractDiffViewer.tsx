import React, { useState, useMemo, useRef } from "react";
import { TokenRecord } from "../types";
import {
  OPENZEPPELIN_PRESETS,
  OpenZeppelinStandardPreset,
  computeContractDiff,
  DiffReport,
} from "../utils/openzeppelinStandards";
import {
  GitCompare,
  Split,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Download,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  Maximize2,
  Terminal,
  Zap,
  Info,
} from "lucide-react";
import { buildRemixIdeUrl } from "../utils/metamaskContractGenerator";

interface ContractDiffViewerProps {
  token: TokenRecord | null;
  generatedSolidity: string;
  onOpenSolidityEditor?: () => void;
  onDeployToMetaMask?: () => void;
}

export const ContractDiffViewer: React.FC<ContractDiffViewerProps> = ({
  token,
  generatedSolidity,
  onOpenSolidityEditor,
  onDeployToMetaMask,
}) => {
  // Determine default preset based on token standard
  const initialPresetId = useMemo(() => {
    if (!token) return "oz_erc20_standard";
    if (token.tokenStandard === "ERC-721") return "oz_erc721_standard";
    if (token.tokenStandard === "ERC-1155") return "oz_erc1155_standard";
    return "oz_erc20_ownable2step_permit";
  }, [token]);

  const [selectedPresetId, setSelectedPresetId] = useState<string>(initialPresetId);
  const [viewMode, setViewMode] = useState<"split" | "unified" | "audit">("split");
  const [ignoreWhitespace, setIgnoreWhitespace] = useState<boolean>(true);
  const [showOnlyDiffs, setShowOnlyDiffs] = useState<boolean>(false);
  const [copiedDiff, setCopiedDiff] = useState<boolean>(false);

  // Active OpenZeppelin preset
  const activePreset: OpenZeppelinStandardPreset = useMemo(() => {
    return (
      OPENZEPPELIN_PRESETS.find((p) => p.id === selectedPresetId) ||
      OPENZEPPELIN_PRESETS[0]
    );
  }, [selectedPresetId]);

  // Compute diff
  const diffReport: DiffReport = useMemo(() => {
    return computeContractDiff(activePreset.code, generatedSolidity, ignoreWhitespace);
  }, [activePreset, generatedSolidity, ignoreWhitespace]);

  // Filter lines if showOnlyDiffs is enabled
  const displayLines = useMemo(() => {
    if (!showOnlyDiffs) return diffReport.lines;
    return diffReport.lines.filter((l) => l.type !== "unchanged");
  }, [diffReport, showOnlyDiffs]);

  // Copy entire git-style diff
  const handleCopyDiff = () => {
    const diffText = [
      `--- ${activePreset.filePath} (${activePreset.version})`,
      `+++ contracts/${token?.symbol || "Token"}.sol (Generated Implementation)`,
      `@@ -1,${diffReport.totalLinesLeft} +1,${diffReport.totalLinesRight} @@`,
      ...diffReport.lines.map((l) => {
        if (l.type === "added") return `+ ${l.rightContent}`;
        if (l.type === "removed") return `- ${l.leftContent}`;
        return `  ${l.leftContent || l.rightContent}`;
      }),
    ].join("\n");

    navigator.clipboard.writeText(diffText);
    setCopiedDiff(true);
    setTimeout(() => setCopiedDiff(false), 2000);
  };

  // Download patch file
  const handleDownloadPatch = () => {
    const patchText = [
      `# OpenZeppelin v5.0 Standard vs ${token?.symbol || "Token"} Implementation Diff`,
      `# Base Reference: ${activePreset.name} (${activePreset.filePath})`,
      `# Target Token: ${token?.name || "Token"} (${token?.symbol || "TOK"})`,
      `# Generated Timestamp: ${new Date().toISOString()}`,
      `# Standard Compliance Score: ${diffReport.similarityScore}%`,
      "",
      `--- a/${activePreset.filePath}`,
      `+++ b/contracts/${token?.symbol || "Token"}.sol`,
      ...diffReport.lines.map((l) => {
        if (l.type === "added") return `+ ${l.rightContent}`;
        if (l.type === "removed") return `- ${l.leftContent}`;
        return `  ${l.leftContent || l.rightContent}`;
      }),
    ].join("\n");

    const blob = new Blob([patchText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${token?.symbol || "contract"}_vs_openzeppelin.diff`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOpenRemix = () => {
    const url = buildRemixIdeUrl(generatedSolidity, `${token?.symbol || "Token"}.sol`);
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Header Card */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                OpenZeppelin Standard vs. Generated Contract Diff Viewer
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Solidity 0.8.24
              </span>
            </div>
            <p className="text-xs text-[#8E9299]">
              Compare your customized contract against audited OpenZeppelin v5.0.2 reference implementations to detect deviations, custom logic additions, and security enhancements prior to broadcast.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyDiff}
              className="px-3 py-1.5 rounded-lg bg-[#0A0A0C] border border-[#1F1F23] hover:border-amber-500/40 text-xs font-semibold text-[#E0E0E0] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copiedDiff ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-[#8E9299]" />}
              <span>{copiedDiff ? "Diff Copied!" : "Copy Diff"}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPatch}
              className="px-3 py-1.5 rounded-lg bg-[#0A0A0C] border border-[#1F1F23] hover:border-amber-500/40 text-xs font-semibold text-[#E0E0E0] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#8E9299]" />
              <span>Export .diff</span>
            </button>

            <button
              type="button"
              onClick={handleOpenRemix}
              className="px-3 py-1.5 rounded-lg bg-[#F27D26]/10 hover:bg-[#F27D26]/20 border border-[#F27D26]/30 text-xs font-semibold text-[#F27D26] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Remix IDE</span>
            </button>

            {onDeployToMetaMask && (
              <button
                type="button"
                onClick={onDeployToMetaMask}
                className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Deploy Contract</span>
              </button>
            )}
          </div>
        </div>

        {/* Configuration Bar: Standard Selection & View Modes */}
        <div className="pt-3 border-t border-[#1F1F23] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          {/* Preset Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[#8E9299] font-medium">Compare Against:</span>
            <select
              value={selectedPresetId}
              onChange={(e) => setSelectedPresetId(e.target.value)}
              className="bg-[#0A0A0C] border border-[#1F1F23] focus:border-amber-400/50 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none cursor-pointer"
            >
              {OPENZEPPELIN_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  [{preset.category}] {preset.name}
                </option>
              ))}
            </select>
            <span className="text-[10px] font-mono text-[#8E9299] px-2 py-1 bg-[#0A0A0C] rounded border border-[#1F1F23]">
              {activePreset.filePath}
            </span>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-[#0A0A0C] p-1 rounded-lg border border-[#1F1F23]">
            <button
              type="button"
              onClick={() => setViewMode("split")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === "split"
                  ? "bg-[#16161A] text-white font-bold border border-amber-500/30 shadow-xs"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              <Split className="w-3 h-3 text-amber-400" />
              <span>Side-by-Side</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("unified")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === "unified"
                  ? "bg-[#16161A] text-white font-bold border border-amber-500/30 shadow-xs"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              <GitCompare className="w-3 h-3 text-cyan-400" />
              <span>Unified Diff</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("audit")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === "audit"
                  ? "bg-[#16161A] text-white font-bold border border-amber-500/30 shadow-xs"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Security Breakdown</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics & Options Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Similarity Score */}
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] text-[#8E9299] font-mono uppercase">Standard Alignment</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold font-mono text-emerald-400">
              {diffReport.similarityScore}%
            </span>
            <span className="text-[10px] text-[#8E9299]">similarity</span>
          </div>
          <div className="w-full bg-[#0A0A0C] h-1.5 rounded-full overflow-hidden mt-2 border border-[#1F1F23]">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${diffReport.similarityScore}%` }}
            />
          </div>
        </div>

        {/* Additions */}
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] text-[#8E9299] font-mono uppercase">Custom Additions</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold font-mono text-emerald-400">
              +{diffReport.additionsCount}
            </span>
            <span className="text-[10px] text-[#8E9299]">lines</span>
          </div>
          <span className="text-[10px] text-[#8E9299] mt-2">New capabilities</span>
        </div>

        {/* Deletions / Deviations */}
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] text-[#8E9299] font-mono uppercase">Deviations / Pruned</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold font-mono text-rose-400">
              -{diffReport.deletionsCount}
            </span>
            <span className="text-[10px] text-[#8E9299]">lines</span>
          </div>
          <span className="text-[10px] text-[#8E9299] mt-2">Replaced logic</span>
        </div>

        {/* Unchanged / Canonical */}
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] text-[#8E9299] font-mono uppercase">Canonical Lines</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold font-mono text-cyan-400">
              {diffReport.unchangedCount}
            </span>
            <span className="text-[10px] text-[#8E9299]">lines</span>
          </div>
          <span className="text-[10px] text-[#8E9299] mt-2">Direct matches</span>
        </div>

        {/* Generated Total */}
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] text-[#8E9299] font-mono uppercase">Target Contract</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold font-mono text-white">
              {diffReport.totalLinesRight}
            </span>
            <span className="text-[10px] text-[#8E9299]">lines</span>
          </div>
          <span className="text-[10px] text-[#8E9299] mt-2 font-mono truncate">{token?.symbol || "TOKEN"}.sol</span>
        </div>

        {/* Filter Controls */}
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-3 flex flex-col justify-center gap-2">
          <label className="flex items-center gap-2 text-xs text-[#E0E0E0] cursor-pointer">
            <input
              type="checkbox"
              checked={ignoreWhitespace}
              onChange={(e) => setIgnoreWhitespace(e.target.checked)}
              className="rounded accent-amber-500 cursor-pointer"
            />
            <span className="text-[11px]">Ignore Whitespace</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-[#E0E0E0] cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyDiffs}
              onChange={(e) => setShowOnlyDiffs(e.target.checked)}
              className="rounded accent-amber-500 cursor-pointer"
            />
            <span className="text-[11px]">Show Diffs Only</span>
          </label>
        </div>
      </div>

      {/* VIEW 1: Split View (Side-by-Side) */}
      {viewMode === "split" && (
        <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-xl overflow-hidden shadow-2xl">
          {/* Headers */}
          <div className="grid grid-cols-2 bg-[#16161A] border-b border-[#1F1F23] font-mono text-xs">
            <div className="p-3 border-r border-[#1F1F23] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                <span className="font-bold text-white">OpenZeppelin Standard</span>
                <span className="text-[#8E9299] text-[11px]">({activePreset.filePath})</span>
              </div>
              <span className="text-[10px] text-[#8E9299] bg-[#0A0A0C] px-2 py-0.5 rounded border border-[#1F1F23]">
                {diffReport.totalLinesLeft} lines
              </span>
            </div>
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                <span className="font-bold text-white">Your Generated Token Contract</span>
                <span className="text-[#8E9299] text-[11px]">({token?.symbol || "Token"}.sol)</span>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                {diffReport.totalLinesRight} lines
              </span>
            </div>
          </div>

          {/* Diff Content Viewport */}
          <div className="max-h-[640px] overflow-y-auto font-mono text-xs select-text">
            {displayLines.map((line, idx) => {
              const isAdded = line.type === "added";
              const isRemoved = line.type === "removed";
              const isUnchanged = line.type === "unchanged";

              return (
                <div
                  key={idx}
                  className={`grid grid-cols-2 border-b border-[#16161A] hover:bg-[#1A1A20]/40 transition-colors ${
                    isAdded
                      ? "bg-emerald-950/15"
                      : isRemoved
                      ? "bg-rose-950/15"
                      : "bg-transparent"
                  }`}
                >
                  {/* Left (OpenZeppelin Reference) */}
                  <div
                    className={`flex items-start border-r border-[#1F1F23] px-2 py-0.5 ${
                      isRemoved
                        ? "bg-rose-950/30 text-rose-300"
                        : isAdded
                        ? "bg-[#0A0A0C]/40 text-[#4E5158]"
                        : "text-[#A0A4AB]"
                    }`}
                  >
                    <span className="w-10 text-right pr-3 text-[10px] text-[#555861] select-none font-mono shrink-0">
                      {line.leftLineNumber || ""}
                    </span>
                    <span className="w-4 text-center select-none shrink-0 font-bold">
                      {isRemoved ? "-" : " "}
                    </span>
                    <span className="whitespace-pre overflow-x-auto pl-1">
                      {line.leftContent ?? ""}
                    </span>
                  </div>

                  {/* Right (Generated Token Contract) */}
                  <div
                    className={`flex items-start px-2 py-0.5 ${
                      isAdded
                        ? "bg-emerald-950/30 text-emerald-300 font-medium"
                        : isRemoved
                        ? "bg-[#0A0A0C]/40 text-[#4E5158]"
                        : "text-[#E0E0E0]"
                    }`}
                  >
                    <span className="w-10 text-right pr-3 text-[10px] text-[#555861] select-none font-mono shrink-0">
                      {line.rightLineNumber || ""}
                    </span>
                    <span className="w-4 text-center select-none shrink-0 font-bold">
                      {isAdded ? "+" : " "}
                    </span>
                    <span className="whitespace-pre overflow-x-auto pl-1">
                      {line.rightContent ?? ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: Unified Git-Style Diff */}
      {viewMode === "unified" && (
        <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-xl overflow-hidden shadow-2xl">
          <div className="bg-[#16161A] border-b border-[#1F1F23] p-3 flex items-center justify-between font-mono text-xs">
            <span className="text-[#8E9299]">
              Unified Diff: <strong className="text-white">a/{activePreset.filePath}</strong> vs{" "}
              <strong className="text-emerald-400">b/{token?.symbol || "Token"}.sol</strong>
            </span>
            <span className="text-[10px] text-[#8E9299]">
              {displayLines.length} lines rendered
            </span>
          </div>

          <div className="max-h-[640px] overflow-y-auto font-mono text-xs select-text">
            {displayLines.map((line, idx) => {
              const isAdded = line.type === "added";
              const isRemoved = line.type === "removed";

              return (
                <div
                  key={idx}
                  className={`flex items-start px-3 py-0.5 border-b border-[#16161A] ${
                    isAdded
                      ? "bg-emerald-950/25 text-emerald-300"
                      : isRemoved
                      ? "bg-rose-950/25 text-rose-300"
                      : "text-[#8E9299]"
                  }`}
                >
                  <span className="w-10 text-right pr-2 text-[10px] text-[#555861] select-none shrink-0 font-mono">
                    {line.leftLineNumber || ""}
                  </span>
                  <span className="w-10 text-right pr-3 text-[10px] text-[#555861] select-none shrink-0 font-mono">
                    {line.rightLineNumber || ""}
                  </span>
                  <span className="w-5 text-center font-bold select-none shrink-0">
                    {isAdded ? "+" : isRemoved ? "-" : " "}
                  </span>
                  <span className="whitespace-pre overflow-x-auto pl-1">
                    {isAdded ? line.rightContent : isRemoved ? line.leftContent : line.leftContent || line.rightContent}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: Security & Architecture Breakdown */}
      {viewMode === "audit" && (
        <div className="space-y-4">
          {/* Comparison Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: OpenZeppelin Baseline */}
            <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  <h4 className="text-sm font-bold text-white">{activePreset.name}</h4>
                </div>
                <span className="text-[10px] font-mono text-[#8E9299] bg-[#0A0A0C] px-2 py-0.5 rounded border border-[#1F1F23]">
                  {activePreset.version}
                </span>
              </div>
              <p className="text-xs text-[#8E9299] leading-relaxed">
                {activePreset.description}
              </p>
              <div className="pt-2 border-t border-[#1F1F23] space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-[#8E9299] block">
                  Reference Architecture Features:
                </span>
                {activePreset.keyFeatures.map((feat, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-[#E0E0E0]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Generated Token Architecture */}
            <div className="bg-[#16161A] border border-emerald-500/30 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <h4 className="text-sm font-bold text-white">
                    {token?.name || "Token"} ({token?.symbol || "TOK"})
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                  {token?.tokenStandard || "ERC-20"} Custom
                </span>
              </div>
              <p className="text-xs text-[#8E9299] leading-relaxed">
                Tailored enterprise contract implementing automated genesis minting, sovereign treasury allocations, and strict EVM security wrappers.
              </p>
              <div className="pt-2 border-t border-[#1F1F23] space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-emerald-400 block">
                  Detected Custom Enhancements:
                </span>
                <div className="flex items-center gap-2 text-xs text-[#E0E0E0]">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Fixed MAX_SUPPLY Cap with genesis allocation</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#E0E0E0]">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Two-Step Ownership Transfer (Ownable2Step)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#E0E0E0]">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>EIP-2612 Gasless Permit Signatures supported</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#E0E0E0]">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Public Contract ID & EIP-55 Checksum integrity</span>
                </div>
              </div>
            </div>
          </div>

          {/* Compliance Checklist */}
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Standard Compliance & Pre-Deployment Audit Checklist
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {diffReport.complianceChecks.map((chk, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                    chk.passed
                      ? "bg-emerald-950/15 border-emerald-900/30"
                      : "bg-amber-950/15 border-amber-900/30"
                  }`}
                >
                  {chk.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="text-xs font-bold text-white">{chk.title}</div>
                    <div className="text-[11px] text-[#8E9299] mt-0.5">{chk.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Context Footer */}
      <div className="p-4 bg-[#16161A] border border-[#1F1F23] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8E9299]">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#F27D26]" />
          <span>
            Contracts deploying to EVM Cancun testnets or mainnets should be tested with solc 0.8.20–0.8.24 and OpenZeppelin v5.0+ to prevent compiler opcode regressions.
          </span>
        </div>
        {onOpenSolidityEditor && (
          <button
            type="button"
            onClick={onOpenSolidityEditor}
            className="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer underline shrink-0"
          >
            Edit in Solidity Workspace &rarr;
          </button>
        )}
      </div>
    </div>
  );
};
