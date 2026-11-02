import React, { useMemo, useState } from "react";
import { highlightAbiString } from "../utils/abiSyntaxHighlighter";
import { Copy, Check, WrapText, AlignLeft, Sparkles, Layers } from "lucide-react";

interface AbiSyntaxViewerProps {
  code: string;
  format?: string;
  title?: string;
  showLineNumbers?: boolean;
  maxHeight?: string;
  className?: string;
  allowMultiLineToggle?: boolean;
}

export const AbiSyntaxViewer: React.FC<AbiSyntaxViewerProps> = ({
  code,
  format = "single_line_json",
  title,
  showLineNumbers = true,
  maxHeight = "360px",
  className = "",
  allowMultiLineToggle = true,
}) => {
  const [copied, setCopied] = useState(false);
  const [isWordWrap, setIsWordWrap] = useState(false);
  const [isFormattedMultiLine, setIsFormattedMultiLine] = useState(false);

  // Attempt to nicely format JSON if multi-line is toggled
  const displayCode = useMemo(() => {
    if (!isFormattedMultiLine) {
      return code;
    }
    // Check if code contains JSON array or object
    try {
      if (code.startsWith("const ") || code.startsWith("let ") || code.startsWith("var ")) {
        const eqIdx = code.indexOf("=");
        const semiIdx = code.lastIndexOf(";");
        if (eqIdx !== -1) {
          const varPart = code.slice(0, eqIdx + 1);
          const rawVal = semiIdx !== -1 ? code.slice(eqIdx + 1, semiIdx).trim() : code.slice(eqIdx + 1).trim();
          const parsed = JSON.parse(rawVal);
          return `${varPart} ${JSON.stringify(parsed, null, 2)};`;
        }
      } else if (code.trim().startsWith("[") || code.trim().startsWith("{")) {
        const parsed = JSON.parse(code.trim());
        return JSON.stringify(parsed, null, 2);
      }
    } catch {
      // If parsing fails, fallback to original code
    }
    return code;
  }, [code, isFormattedMultiLine]);

  // Compute syntax highlighted HTML using Prism.js
  const { html, stats } = useMemo(() => {
    return highlightAbiString(displayCode);
  }, [displayCode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(displayCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lineCount = useMemo(() => {
    return displayCode.split("\n").length;
  }, [displayCode]);

  return (
    <div
      className={`bg-[#0A0A0C] border border-[#1F1F23] rounded-xl overflow-hidden font-mono shadow-lg transition-all ${className}`}
    >
      {/* Top Bar with Format Tag, Stats, Legend, and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5 bg-[#121216] border-b border-[#1F1F23] text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold text-[10px] border border-purple-500/30 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-400" />
            PRISM HIGHLIGHTED
          </span>

          {title && (
            <span className="text-white font-bold text-[11px] truncate max-w-[160px]">
              {title}
            </span>
          )}

          <span className="text-[#8E9299] text-[11px]">
            {displayCode.length.toLocaleString()} chars
          </span>
        </div>

        {/* Syntax Legend: Distinct badges for Keys, Values, Types, Keywords */}
        <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
          <span className="text-[#8E9299] mr-0.5 hidden sm:inline">Syntax:</span>
          <span
            className="px-1.5 py-0.5 rounded bg-sky-950/60 text-sky-300 border border-sky-500/40 font-bold"
            title="JSON Object Keys (name, type, inputs, etc.)"
          >
            ● Key
          </span>
          <span
            className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 font-bold"
            title="Solidity EVM Types (address, uint256, bool, bytes32, etc.)"
          >
            ● Type
          </span>
          <span
            className="px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-500/40 font-bold"
            title="EVM Entry Kinds & Mutability (function, event, view, nonpayable)"
          >
            ● Keyword
          </span>
          <span
            className="px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-500/40 font-bold"
            title="Identifiers & Values (transfer, recipient, amount)"
          >
            ● Value
          </span>
        </div>

        {/* Action Controls: Multi-line Format Toggle, Wrap Toggle, Copy Button */}
        <div className="flex items-center gap-1.5">
          {allowMultiLineToggle && (
            <button
              type="button"
              onClick={() => setIsFormattedMultiLine((prev) => !prev)}
              className={`px-2 py-1 rounded text-[11px] flex items-center gap-1 transition-all cursor-pointer border ${
                isFormattedMultiLine
                  ? "bg-purple-900/40 text-purple-300 border-purple-500/60 font-bold"
                  : "bg-[#16161A] text-[#8E9299] hover:text-white border-[#27272F]"
              }`}
              title={
                isFormattedMultiLine
                  ? "Switch to compact 1-line view"
                  : "Expand to multi-line auto-indented tree view"
              }
            >
              <AlignLeft className="w-3 h-3" />
              <span>{isFormattedMultiLine ? "1-Line" : "Indent"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsWordWrap((prev) => !prev)}
            className={`px-2 py-1 rounded text-[11px] flex items-center gap-1 transition-all cursor-pointer border ${
              isWordWrap
                ? "bg-purple-900/40 text-purple-300 border-purple-500/60 font-bold"
                : "bg-[#16161A] text-[#8E9299] hover:text-white border-[#27272F]"
            }`}
            title="Toggle word wrapping"
          >
            <WrapText className="w-3 h-3" />
            <span className="hidden sm:inline">Wrap</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="px-2.5 py-1 rounded bg-[#F27D26] hover:bg-[#ff8e3c] text-black font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm"
            title="Copy highlighted ABI code to clipboard"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      {/* Code Display Area with Prism Highlighted HTML */}
      <div
        style={{ maxHeight }}
        className={`p-4 overflow-x-auto text-xs leading-relaxed font-mono scrollbar-thin ${
          isWordWrap ? "whitespace-pre-wrap break-all" : "whitespace-nowrap"
        }`}
      >
        <div className="flex">
          {/* Line number gutter */}
          {showLineNumbers && (
            <div className="select-none pr-3 text-[#555] text-right font-mono border-r border-[#1F1F23] mr-3">
              {lineCount === 1 ? (
                <span>1:</span>
              ) : (
                Array.from({ length: lineCount }).map((_, idx) => (
                  <div key={idx}>{idx + 1}</div>
                ))
              )}
            </div>
          )}

          {/* Highlighted Prism Tokens */}
          <div className="flex-1 min-w-0">
            <code
              className="prism-abi-code font-mono text-xs block"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </div>
      </div>

      {/* Footer Diagnostic Stats Bar */}
      <div className="px-3.5 py-1.5 bg-[#0e0e12] border-t border-[#1F1F23] flex items-center justify-between text-[10px] text-[#8E9299]">
        <div className="flex items-center gap-3">
          <span>
            Keys: <strong className="text-sky-400 font-mono">{stats.keyCount}</strong>
          </span>
          <span>
            Types: <strong className="text-emerald-400 font-mono">{stats.typeCount}</strong>
          </span>
          <span>
            Keywords: <strong className="text-purple-400 font-mono">{stats.keywordCount}</strong>
          </span>
          <span>
            Values: <strong className="text-amber-400 font-mono">{stats.valueCount}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[#666]">Engine: Prism.js lightweight</span>
        </div>
      </div>
    </div>
  );
};
