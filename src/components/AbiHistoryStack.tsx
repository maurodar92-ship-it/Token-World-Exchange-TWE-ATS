import React, { useState } from "react";
import {
  History,
  GitCompare,
  ArrowLeftRight,
  Clock,
  Sparkles,
  Check,
  Copy,
  Terminal,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Code2,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ABIHistoryVersion } from "../types/abiHistory";
import { highlightAbiString } from "../utils/abiSyntaxHighlighter";

interface AbiHistoryStackProps {
  history: ABIHistoryVersion[];
  activeVersionId: string;
  onSelectVersion: (version: ABIHistoryVersion) => void;
  onRestoreVersionToCoder: (version: ABIHistoryVersion) => void;
  onRunInTerminal: (version: ABIHistoryVersion) => void;
  onTakeSnapshot?: () => void;
  maxHistory?: number;
}

export const AbiHistoryStack: React.FC<AbiHistoryStackProps> = ({
  history,
  activeVersionId,
  onSelectVersion,
  onRestoreVersionToCoder,
  onRunInTerminal,
  onTakeSnapshot,
  maxHistory = 5,
}) => {
  const [isCompareOpen, setIsCompareOpen] = useState<boolean>(false);
  const [compareVersionAId, setCompareVersionAId] = useState<string>(
    history[0]?.id || ""
  );
  const [compareVersionBId, setCompareVersionBId] = useState<string>(
    history[1]?.id || history[0]?.id || ""
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const versionA = history.find((v) => v.id === compareVersionAId) || history[0];
  const versionB =
    history.find((v) => v.id === compareVersionBId) ||
    history[1] ||
    history[0];

  const formatLabel = (fmt: string) => {
    switch (fmt) {
      case "single_line_json":
        return "Minified JSON";
      case "single_line_human":
        return "Human-Readable";
      case "single_line_ethers":
        return "ethers.Contract";
      case "single_line_viem":
        return "Viem getContract";
      case "single_line_cast":
        return "Cast CLI";
      default:
        return "Web3.js";
    }
  };

  const getFormatBadgeClass = (fmt: string) => {
    switch (fmt) {
      case "single_line_json":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      case "single_line_human":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "single_line_ethers":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
      case "single_line_viem":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "single_line_cast":
        return "bg-rose-500/20 text-rose-300 border-rose-500/30";
      default:
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    }
  };

  return (
    <div
      id="abi-history-stack-container"
      className="bg-[#121216] border border-[#22222A] rounded-xl p-4 space-y-4 shadow-lg"
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1F1F26]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white font-mono tracking-tight">
                ABI Version History Stack
              </h4>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40">
                LAST {history.length}/{maxHistory} VERSIONS
              </span>
            </div>
            <p className="text-[11px] text-[#8E9299]">
              Switch between the last 5 generated ABI iterations, compare deltas, or revert to a previous state.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onTakeSnapshot && (
            <button
              type="button"
              id="btn-take-abi-snapshot"
              onClick={onTakeSnapshot}
              className="px-2.5 py-1 rounded bg-[#1C1C24] hover:bg-[#252532] border border-[#2E2E3C] text-purple-300 hover:text-white text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              title="Snapshot currently active ABI configuration to history"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Snapshot Current ABI</span>
            </button>
          )}

          <button
            type="button"
            id="btn-toggle-abi-compare"
            onClick={() => setIsCompareOpen(!isCompareOpen)}
            disabled={history.length < 2}
            className={`px-3 py-1 rounded text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-all border ${
              isCompareOpen
                ? "bg-purple-600 text-white border-purple-500 font-bold shadow-sm"
                : history.length < 2
                ? "bg-[#16161A] text-[#555] border-[#222] cursor-not-allowed"
                : "bg-[#1A1A22] text-[#8E9299] hover:text-white border-[#2A2A38]"
            }`}
          >
            <GitCompare className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isCompareOpen ? "Close Comparison" : "Compare Versions"}</span>
            {isCompareOpen ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>

      {/* Stack Items (Horizontal Timeline Chips / Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        {history.map((item, index) => {
          const isActive = item.id === activeVersionId;
          return (
            <div
              key={item.id}
              id={`abi-version-card-${item.versionNumber}`}
              onClick={() => onSelectVersion(item)}
              className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all flex flex-col justify-between gap-2 relative group ${
                isActive
                  ? "bg-[#181524] border-purple-500 shadow-md shadow-purple-950/30 ring-1 ring-purple-500/50"
                  : "bg-[#0D0D10] border-[#1F1F24] hover:border-[#333342] hover:bg-[#131318]"
              }`}
            >
              {/* Top Row: Version Number + Status Pill */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isActive
                        ? "bg-purple-500 text-white"
                        : "bg-[#1C1C24] text-[#8E9299] group-hover:text-white"
                    }`}
                  >
                    v{item.versionNumber}
                  </span>
                  {isActive && (
                    <span className="text-[9px] font-mono font-bold text-purple-400 uppercase">
                      ACTIVE
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {item.isValid ? (
                    <span
                      title="Syntax Valid"
                      className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-500/20"
                    />
                  ) : (
                    <span
                      title="Syntax Error Detected"
                      className="w-2 h-2 rounded-full bg-rose-400 ring-2 ring-rose-500/20 animate-pulse"
                    />
                  )}
                  <span className="text-[9px] font-mono text-[#777] flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5 text-[#555]" />
                    {item.formattedTime}
                  </span>
                </div>
              </div>

              {/* Middle Row: Token & Standard */}
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-white font-mono truncate">
                  {item.tokenSymbol || "TOKEN"}
                </div>
                <div className="text-[10px] text-[#8E9299] font-mono truncate">
                  {item.tokenStandard} • {item.contractAddress.slice(0, 6)}...
                </div>
              </div>

              {/* Bottom Row: Format & Length */}
              <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                <span
                  className={`px-1.5 py-0.5 rounded border text-[9px] truncate max-w-[100px] ${getFormatBadgeClass(
                    item.format
                  )}`}
                >
                  {formatLabel(item.format)}
                </span>
                <span className="text-[#8E9299]">
                  {item.charCount.toLocaleString()} ch
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* COMPARISON DRAWER / PANEL */}
      {isCompareOpen && versionA && versionB && (
        <div
          id="abi-comparison-panel"
          className="p-4 bg-[#09090C] border border-cyan-500/30 rounded-xl space-y-4 animate-fade-in"
        >
          {/* Compare Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                ABI Version Delta Inspector:
              </span>
            </div>

            {/* Pickers for Version A & Version B */}
            <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="text-purple-300 font-bold">Version A:</span>
                <select
                  value={compareVersionAId}
                  onChange={(e) => setCompareVersionAId(e.target.value)}
                  className="bg-[#16161C] border border-[#2B2B38] rounded px-2 py-1 text-xs text-white font-mono focus:border-purple-500"
                >
                  {history.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.versionNumber} ({v.tokenSymbol} • {formatLabel(v.format)})
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-[#555] font-bold">VS</span>

              <div className="flex items-center gap-1.5">
                <span className="text-cyan-300 font-bold">Version B:</span>
                <select
                  value={compareVersionBId}
                  onChange={(e) => setCompareVersionBId(e.target.value)}
                  className="bg-[#16161C] border border-[#2B2B38] rounded px-2 py-1 text-xs text-white font-mono focus:border-cyan-500"
                >
                  {history.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.versionNumber} ({v.tokenSymbol} • {formatLabel(v.format)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Quick Metrics Delta Grid */}
          {(() => {
            const charDiff = versionB.charCount - versionA.charCount;
            const entryDiff = versionB.entryCount - versionA.entryCount;
            const isSameToken = versionA.contractAddress === versionB.contractAddress;
            const isSameFormat = versionA.format === versionB.format;
            const isExactMatch = versionA.abiCode === versionB.abiCode;

            return (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  {/* Length Diff */}
                  <div className="p-2.5 rounded-lg bg-[#121216] border border-[#22222A] flex flex-col gap-0.5">
                    <span className="text-[10px] text-[#8E9299]">
                      Character Delta
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-bold text-white">
                        {Math.abs(charDiff).toLocaleString()}
                      </span>
                      <span
                        className={`text-[10px] font-bold ${
                          charDiff === 0
                            ? "text-emerald-400"
                            : charDiff > 0
                            ? "text-cyan-400"
                            : "text-amber-400"
                        }`}
                      >
                        ({charDiff === 0 ? "Identical" : charDiff > 0 ? `+${charDiff} ch` : `${charDiff} ch`})
                      </span>
                    </div>
                  </div>

                  {/* Definitions Count Diff */}
                  <div className="p-2.5 rounded-lg bg-[#121216] border border-[#22222A] flex flex-col gap-0.5">
                    <span className="text-[10px] text-[#8E9299]">
                      EVM Definitions
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-bold text-white">
                        {versionA.entryCount} vs {versionB.entryCount}
                      </span>
                      <span
                        className={`text-[10px] font-bold ${
                          entryDiff === 0
                            ? "text-emerald-400"
                            : entryDiff > 0
                            ? "text-cyan-400"
                            : "text-amber-400"
                        }`}
                      >
                        ({entryDiff === 0 ? "Match" : entryDiff > 0 ? `+${entryDiff}` : `${entryDiff}`})
                      </span>
                    </div>
                  </div>

                  {/* Syntax Score Diff */}
                  <div className="p-2.5 rounded-lg bg-[#121216] border border-[#22222A] flex flex-col gap-0.5">
                    <span className="text-[10px] text-[#8E9299]">
                      Syntax Quality
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-bold text-white">
                        {versionA.score} vs {versionB.score}
                      </span>
                      <span
                        className={`text-[10px] font-bold ${
                          versionA.isValid && versionB.isValid
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {versionA.isValid && versionB.isValid
                          ? "✓ Both Valid"
                          : "⚠ Has Error"}
                      </span>
                    </div>
                  </div>

                  {/* Similarity Status */}
                  <div className="p-2.5 rounded-lg bg-[#121216] border border-[#22222A] flex flex-col gap-0.5">
                    <span className="text-[10px] text-[#8E9299]">
                      Code Match Status
                    </span>
                    <div className="text-xs font-bold font-mono">
                      {isExactMatch ? (
                        <span className="text-emerald-400">100% Identical</span>
                      ) : isSameFormat ? (
                        <span className="text-amber-400">Same Format, Diff Code</span>
                      ) : (
                        <span className="text-cyan-400">Cross-Format Diff</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Side-by-Side Code Viewers */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {/* Left: Version A */}
                  <div className="space-y-2 p-3 bg-[#0D0D12] border border-purple-500/30 rounded-lg">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-purple-500 text-white font-bold text-[10px]">
                          Version {versionA.versionNumber}
                        </span>
                        <span className="font-bold text-white">
                          {versionA.tokenSymbol} ({formatLabel(versionA.format)})
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onRestoreVersionToCoder(versionA)}
                          className="px-2 py-0.5 rounded bg-[#1A1A24] hover:bg-purple-600 hover:text-white text-purple-300 text-[10px] font-mono flex items-center gap-1 cursor-pointer border border-[#2C2C3C]"
                          title="Restore this version into the active ABI workspace"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>Load Active</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopy(versionA.abiCode, "copy_vA")}
                          className="p-1 rounded text-[#8E9299] hover:text-white cursor-pointer"
                          title="Copy ABI Code"
                        >
                          {copiedKey === "copy_vA" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="p-2.5 bg-[#060608] border border-[#1C1C22] rounded overflow-x-auto whitespace-nowrap text-[11px] font-mono scrollbar-thin">
                      <span className="text-[#555] select-none mr-2">1:</span>
                      <code
                        className="prism-abi-code"
                        dangerouslySetInnerHTML={{ __html: highlightAbiString(versionA.abiCode).html }}
                      />
                    </div>
                  </div>

                  {/* Right: Version B */}
                  <div className="space-y-2 p-3 bg-[#0D0D12] border border-cyan-500/30 rounded-lg">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-cyan-500 text-black font-bold text-[10px]">
                          Version {versionB.versionNumber}
                        </span>
                        <span className="font-bold text-white">
                          {versionB.tokenSymbol} ({formatLabel(versionB.format)})
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onRestoreVersionToCoder(versionB)}
                          className="px-2 py-0.5 rounded bg-[#1A1A24] hover:bg-cyan-600 hover:text-white text-cyan-300 text-[10px] font-mono flex items-center gap-1 cursor-pointer border border-[#2C2C3C]"
                          title="Restore this version into the active ABI workspace"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>Load Active</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopy(versionB.abiCode, "copy_vB")}
                          className="p-1 rounded text-[#8E9299] hover:text-white cursor-pointer"
                          title="Copy ABI Code"
                        >
                          {copiedKey === "copy_vB" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="p-2.5 bg-[#060608] border border-[#1C1C22] rounded overflow-x-auto whitespace-nowrap text-[11px] font-mono scrollbar-thin">
                      <span className="text-[#555] select-none mr-2">1:</span>
                      <code
                        className="prism-abi-code"
                        dangerouslySetInnerHTML={{ __html: highlightAbiString(versionB.abiCode).html }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer comparison actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs font-mono">
                  <span className="text-[11px] text-[#8E9299]">
                    Comparing v{versionA.versionNumber} ({versionA.formattedTime}) against v{versionB.versionNumber} ({versionB.formattedTime})
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onRunInTerminal(versionB)}
                      className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono flex items-center gap-1 cursor-pointer"
                    >
                      <Terminal className="w-3 h-3" />
                      <span>Run v{versionB.versionNumber} in Terminal</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
