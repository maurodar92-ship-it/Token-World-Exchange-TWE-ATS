import React, { useState, useMemo } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Code2,
  Bug,
  RotateCcw,
  Sliders,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { validateABIString, ABIValidationResult } from "../utils/abiValidator";

interface AbiValidationIndicatorProps {
  generatedAbiString: string;
  contractName?: string;
  onSelectTestedAbi?: (testedString: string) => void;
}

export const AbiValidationIndicator: React.FC<AbiValidationIndicatorProps> = ({
  generatedAbiString,
  contractName = "Contract",
  onSelectTestedAbi,
}) => {
  // Test mode state: allows simulating common structural defects or custom typing
  const [activeMode, setActiveMode] = useState<
    "generated" | "missing_comma" | "unbalanced_bracket" | "trailing_comma" | "custom"
  >("generated");
  const [customText, setCustomText] = useState<string>("");
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(true);

  // Derive the active string being evaluated
  const currentString = useMemo(() => {
    if (activeMode === "custom") {
      return customText;
    }
    if (activeMode === "missing_comma") {
      // Intentionally simulate a missing comma between objects: replace `},{` with `}{`
      return generatedAbiString.replace(/(\})(\s*),(\s*)(\{)/, "$1$2$4");
    }
    if (activeMode === "unbalanced_bracket") {
      // Intentionally remove the last closing bracket or brace
      return generatedAbiString.endsWith("]")
        ? generatedAbiString.slice(0, -1)
        : generatedAbiString.endsWith("};")
        ? generatedAbiString.slice(0, -2) + ";"
        : generatedAbiString.slice(0, -1);
    }
    if (activeMode === "trailing_comma") {
      // Intentionally inject an illegal trailing comma before the final `]`
      return generatedAbiString.replace(/\]\s*$/, ",]");
    }
    return generatedAbiString;
  }, [activeMode, customText, generatedAbiString]);

  // Run validation engine
  const validationResult: ABIValidationResult = useMemo(() => {
    return validateABIString(currentString);
  }, [currentString]);

  const { isValid, hasWarnings, status, score, bracketStats, issues, entryCount, summary } =
    validationResult;

  const handleSetMode = (
    mode: "generated" | "missing_comma" | "unbalanced_bracket" | "trailing_comma" | "custom"
  ) => {
    setActiveMode(mode);
    if (mode === "custom" && !customText) {
      setCustomText(generatedAbiString);
    }
    if (mode === "generated" && onSelectTestedAbi) {
      onSelectTestedAbi(generatedAbiString);
    }
  };

  return (
    <div
      id="abi-validation-panel"
      className={`rounded-xl border transition-all duration-300 p-4 space-y-3.5 ${
        status === "valid"
          ? "bg-[#09140E] border-emerald-500/30"
          : status === "warning"
          ? "bg-[#141208] border-amber-500/30"
          : "bg-[#16090B] border-rose-500/40"
      }`}
    >
      {/* Top Banner: Status + Summary + Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Main Visual Status Pill */}
          <div
            id="abi-validation-badge"
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wide border shadow-sm ${
              status === "valid"
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-emerald-950/40"
                : status === "warning"
                ? "bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-amber-950/40"
                : "bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-rose-950/40 animate-pulse"
            }`}
          >
            {status === "valid" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : status === "warning" ? (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>
              {status === "valid"
                ? "ABI SYNTAX: VALID"
                : status === "warning"
                ? "ABI SYNTAX: VALID (ADVISORY)"
                : "ABI SYNTAX: INVALID"}
            </span>
          </div>

          {/* Score Indicator */}
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
              score >= 90
                ? "bg-emerald-500/20 text-emerald-300"
                : score >= 60
                ? "bg-amber-500/20 text-amber-300"
                : "bg-rose-500/20 text-rose-400"
            }`}
          >
            {score}/100 Quality Score
          </span>

          {/* Definitions Count */}
          <span className="text-[11px] font-mono text-[#8E9299]">
            {entryCount} EVM Definitions
          </span>
        </div>

        {/* Toggle Details button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-toggle-abi-details"
            onClick={() => setIsDetailsOpen(!isDetailsOpen)}
            className="text-xs text-[#8E9299] hover:text-white flex items-center gap-1 cursor-pointer font-mono"
          >
            <span>{isDetailsOpen ? "Hide Diagnostics" : "Show Diagnostics"}</span>
            {isDetailsOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Summary Message */}
      <div className="flex items-start gap-2 text-xs font-mono">
        <span className="text-[#8E9299] select-none">Status:</span>
        <span
          className={
            status === "valid"
              ? "text-emerald-300"
              : status === "warning"
              ? "text-amber-300"
              : "text-rose-300 font-semibold"
          }
        >
          {summary}
        </span>
      </div>

      {/* Detailed Diagnostic Matrix (Collapsible) */}
      {isDetailsOpen && (
        <div className="space-y-3 pt-1">
          {/* Delimiter Parity Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            {/* Square Brackets [] */}
            <div
              className={`p-2 rounded-lg border flex flex-col gap-0.5 ${
                bracketStats.squareOpen === bracketStats.squareClose
                  ? "bg-[#060D09] border-emerald-500/20 text-emerald-300"
                  : "bg-[#18080A] border-rose-500/30 text-rose-300"
              }`}
            >
              <div className="text-[10px] text-[#8E9299] flex items-center justify-between">
                <span>Brackets [ ]</span>
                <span>
                  {bracketStats.squareOpen === bracketStats.squareClose ? "✓ Match" : "✕ Mismatch"}
                </span>
              </div>
              <div className="font-bold text-sm">
                [{bracketStats.squareOpen} / {bracketStats.squareClose}]
              </div>
            </div>

            {/* Curly Braces {} */}
            <div
              className={`p-2 rounded-lg border flex flex-col gap-0.5 ${
                bracketStats.curlyOpen === bracketStats.curlyClose
                  ? "bg-[#060D09] border-emerald-500/20 text-emerald-300"
                  : "bg-[#18080A] border-rose-500/30 text-rose-300"
              }`}
            >
              <div className="text-[10px] text-[#8E9299] flex items-center justify-between">
                <span>Braces &#123; &#125;</span>
                <span>
                  {bracketStats.curlyOpen === bracketStats.curlyClose ? "✓ Match" : "✕ Mismatch"}
                </span>
              </div>
              <div className="font-bold text-sm">
                &#123;{bracketStats.curlyOpen} / {bracketStats.curlyClose}&#125;
              </div>
            </div>

            {/* Parentheses () */}
            <div
              className={`p-2 rounded-lg border flex flex-col gap-0.5 ${
                bracketStats.parenOpen === bracketStats.parenClose
                  ? "bg-[#060D09] border-emerald-500/20 text-emerald-300"
                  : "bg-[#18080A] border-rose-500/30 text-rose-300"
              }`}
            >
              <div className="text-[10px] text-[#8E9299] flex items-center justify-between">
                <span>Parens ( )</span>
                <span>
                  {bracketStats.parenOpen === bracketStats.parenClose ? "✓ Match" : "✕ Mismatch"}
                </span>
              </div>
              <div className="font-bold text-sm">
                ({bracketStats.parenOpen} / {bracketStats.parenClose})
              </div>
            </div>

            {/* Quotes Count */}
            <div
              className={`p-2 rounded-lg border flex flex-col gap-0.5 ${
                bracketStats.quoteCount % 2 === 0
                  ? "bg-[#060D09] border-emerald-500/20 text-emerald-300"
                  : "bg-[#18080A] border-rose-500/30 text-rose-300"
              }`}
            >
              <div className="text-[10px] text-[#8E9299] flex items-center justify-between">
                <span>Quotes &quot;</span>
                <span>{bracketStats.quoteCount % 2 === 0 ? "✓ Even" : "✕ Unbalanced"}</span>
              </div>
              <div className="font-bold text-sm">{bracketStats.quoteCount} Quotes</div>
            </div>
          </div>

          {/* Issues List (If any) */}
          {issues.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase font-mono text-[#8E9299] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Detected Structural Issues ({issues.length})</span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg border text-xs font-mono space-y-1 ${
                      issue.type === "error"
                        ? "bg-[#200A0D] border-rose-500/40 text-rose-200"
                        : "bg-[#1C150A] border-amber-500/40 text-amber-200"
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-[11px]">
                      <span className="flex items-center gap-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            issue.type === "error" ? "bg-rose-400" : "bg-amber-400"
                          }`}
                        />
                        [{issue.code}]
                      </span>
                      {issue.position !== undefined && (
                        <span className="text-[#8E9299] text-[10px]">
                          Col {issue.position + 1}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] leading-snug">{issue.message}</p>
                    {issue.snippet && (
                      <div className="p-1 rounded bg-[#0A0A0C] border border-white/5 text-[10px] text-[#A0A0B0] font-mono break-all">
                        Snippet: <code>&ldquo;{issue.snippet}&rdquo;</code>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Structural Test Matrix & Fault Simulator */}
          <div className="p-3 bg-[#0A0A0C]/80 border border-white/5 rounded-lg space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-white font-mono flex items-center gap-1.5">
                <Bug className="w-3.5 h-3.5 text-purple-400" />
                <span>Test Structural Faults &amp; Validator Responsiveness:</span>
              </span>

              {activeMode !== "generated" && (
                <button
                  type="button"
                  id="btn-restore-generated-abi"
                  onClick={() => handleSetMode("generated")}
                  className="text-xs text-purple-300 hover:text-white flex items-center gap-1 font-mono cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restore Valid Generated ABI</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
              <button
                type="button"
                id="btn-test-valid"
                onClick={() => handleSetMode("generated")}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1 ${
                  activeMode === "generated"
                    ? "bg-emerald-600 text-white font-bold shadow-sm"
                    : "bg-[#16161A] text-[#8E9299] hover:text-white border border-[#262630]"
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>1. Valid Generated ABI</span>
              </button>

              <button
                type="button"
                id="btn-simulate-missing-comma"
                onClick={() => handleSetMode("missing_comma")}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1 ${
                  activeMode === "missing_comma"
                    ? "bg-rose-600 text-white font-bold shadow-sm"
                    : "bg-[#16161A] text-[#8E9299] hover:text-white border border-[#262630]"
                }`}
                title="Simulates removing a comma between two objects"
              >
                <Bug className="w-3 h-3 text-rose-300" />
                <span>2. Simulate Missing Comma</span>
              </button>

              <button
                type="button"
                id="btn-simulate-unbalanced-bracket"
                onClick={() => handleSetMode("unbalanced_bracket")}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1 ${
                  activeMode === "unbalanced_bracket"
                    ? "bg-rose-600 text-white font-bold shadow-sm"
                    : "bg-[#16161A] text-[#8E9299] hover:text-white border border-[#262630]"
                }`}
                title="Simulates an unclosed bracket or brace"
              >
                <Bug className="w-3 h-3 text-rose-300" />
                <span>3. Simulate Unbalanced Bracket</span>
              </button>

              <button
                type="button"
                id="btn-simulate-trailing-comma"
                onClick={() => handleSetMode("trailing_comma")}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1 ${
                  activeMode === "trailing_comma"
                    ? "bg-rose-600 text-white font-bold shadow-sm"
                    : "bg-[#16161A] text-[#8E9299] hover:text-white border border-[#262630]"
                }`}
                title="Simulates illegal trailing comma before closing bracket"
              >
                <Bug className="w-3 h-3 text-rose-300" />
                <span>4. Simulate Trailing Comma</span>
              </button>

              <button
                type="button"
                id="btn-test-custom-abi"
                onClick={() => handleSetMode("custom")}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1 ${
                  activeMode === "custom"
                    ? "bg-purple-600 text-white font-bold shadow-sm"
                    : "bg-[#16161A] text-[#8E9299] hover:text-white border border-[#262630]"
                }`}
              >
                <Sliders className="w-3 h-3 text-purple-300" />
                <span>5. Custom Sandbox / Playground</span>
              </button>
            </div>

            {/* Custom Edit Area */}
            {activeMode === "custom" && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-[#8E9299]">
                  <span>Paste or edit any ABI string below to test real-time syntax validator:</span>
                  <button
                    type="button"
                    onClick={() => setCustomText(generatedAbiString)}
                    className="text-purple-300 hover:text-white"
                  >
                    Reset to {contractName} ABI
                  </button>
                </div>
                <textarea
                  id="custom-abi-input"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Paste ABI JSON or single-line string here..."
                  rows={3}
                  className="w-full bg-[#0E0E12] border border-[#2B2B36] rounded-lg p-2.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-purple-500 resize-y"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
