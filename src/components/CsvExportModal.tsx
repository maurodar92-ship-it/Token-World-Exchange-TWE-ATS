import { useState, useMemo, useEffect } from "react";
import { TokenRecord } from "../types";
import {
  AVAILABLE_CSV_COLUMNS,
  downloadCustomTokenCSV,
  generateCustomTokenCSVString,
} from "../utils/csvExport";
import {
  X,
  FileDown,
  Copy,
  Check,
  Search,
  CheckSquare,
  Square,
  ShieldCheck,
  Table,
  Code,
  Sparkles,
  Layers,
  Filter,
} from "lucide-react";

interface CsvExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokens: TokenRecord[];
  onExportSuccess?: (info: { filename: string; count: number }) => void;
}

export const CsvExportModal = ({
  isOpen,
  onClose,
  tokens,
  onExportSuccess,
}: CsvExportModalProps) => {
  // State for selected column IDs
  const [selectedColumnIds, setSelectedColumnIds] = useState<string[]>([
    "address",
    "amount",
  ]);

  // State for selected token IDs (default: all selected)
  const [selectedTokenIds, setSelectedTokenIds] = useState<Set<string>>(
    () => new Set(tokens.map((t) => t.id))
  );

  // Search & Filter within modal
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedChainFilter, setSelectedChainFilter] = useState<string>("all");

  // Preview Mode: "table" or "raw"
  const [previewTab, setPreviewTab] = useState<"table" | "raw">("table");

  // Feedback states
  const [copied, setCopied] = useState<boolean>(false);

  // Reset selected tokens when tokens prop changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTokenIds(new Set(tokens.map((t) => t.id)));
      setSearchQuery("");
      setSelectedChainFilter("all");
    }
  }, [isOpen, tokens]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Filtered tokens for display in the table
  const displayedTokens = useMemo(() => {
    let list = tokens;
    if (selectedChainFilter !== "all") {
      list = list.filter((t) => t.chain.toLowerCase() === selectedChainFilter.toLowerCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.symbol.toLowerCase().includes(q) ||
          t.contractAddress.toLowerCase().includes(q) ||
          t.tokenId.toLowerCase().includes(q) ||
          (t.deployerAddress && t.deployerAddress.toLowerCase().includes(q))
      );
    }
    return list;
  }, [tokens, selectedChainFilter, searchQuery]);

  // The actual tokens to export (preserving original order, filtered by selection)
  const tokensToExport = useMemo(() => {
    return tokens.filter((t) => selectedTokenIds.has(t.id));
  }, [tokens, selectedTokenIds]);

  // Active columns configuration
  const activeColumns = useMemo(() => {
    return AVAILABLE_CSV_COLUMNS.filter((c) => selectedColumnIds.includes(c.id));
  }, [selectedColumnIds]);

  // Is strict sanitize_data.py format active?
  const isStrictSanitize = useMemo(() => {
    return (
      selectedColumnIds.length === 2 &&
      selectedColumnIds.includes("address") &&
      selectedColumnIds.includes("amount")
    );
  }, [selectedColumnIds]);

  // Available chains among tokens
  const uniqueChains = useMemo(() => {
    const chains = new Set(tokens.map((t) => t.chain));
    return Array.from(chains);
  }, [tokens]);

  // Toggle single column
  const toggleColumn = (columnId: string) => {
    if (selectedColumnIds.includes(columnId)) {
      if (selectedColumnIds.length > 1) {
        setSelectedColumnIds(selectedColumnIds.filter((id) => id !== columnId));
      }
    } else {
      setSelectedColumnIds([...selectedColumnIds, columnId]);
    }
  };

  // Quick Column Presets
  const applyPreset = (preset: "sanitize" | "ats" | "all") => {
    if (preset === "sanitize") {
      setSelectedColumnIds(["address", "amount"]);
    } else if (preset === "ats") {
      setSelectedColumnIds(["address", "amount", "symbol", "name", "chain", "token_standard"]);
    } else if (preset === "all") {
      setSelectedColumnIds(AVAILABLE_CSV_COLUMNS.map((c) => c.id));
    }
  };

  // Token Selection Toggles
  const toggleToken = (id: string) => {
    setSelectedTokenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllTokens = () => {
    setSelectedTokenIds(new Set(tokens.map((t) => t.id)));
  };

  const deselectAllTokens = () => {
    setSelectedTokenIds(new Set());
  };

  const selectFilteredOnly = () => {
    setSelectedTokenIds(new Set(displayedTokens.map((t) => t.id)));
  };

  const selectEvmOnly = () => {
    const evmIds = tokens
      .filter((t) => t.contractAddress.startsWith("0x"))
      .map((t) => t.id);
    setSelectedTokenIds(new Set(evmIds));
  };

  // Raw CSV Preview text
  const rawCsvPreview = useMemo(() => {
    if (tokensToExport.length === 0 || selectedColumnIds.length === 0) {
      return "# No tokens or columns selected for export.";
    }
    // Limit raw preview string generation to first 50 rows for performance
    return generateCustomTokenCSVString(
      tokensToExport.slice(0, 50),
      selectedColumnIds
    );
  }, [tokensToExport, selectedColumnIds]);

  // Handlers
  const handleCopyCsv = () => {
    if (tokensToExport.length === 0) return;
    const fullCsv = generateCustomTokenCSVString(tokensToExport, selectedColumnIds);
    navigator.clipboard.writeText(fullCsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    if (tokensToExport.length === 0) return;
    const result = downloadCustomTokenCSV(
      tokensToExport,
      selectedColumnIds,
      isStrictSanitize ? "token_input" : "token_export"
    );
    if (onExportSuccess) {
      onExportSuccess({ filename: result.filename, count: result.count });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div
        className="bg-[#121216] border border-[#26262B] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F1F23] bg-[#16161C]/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="modal-title" className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Export Tokens to CSV
                </h2>
                {isStrictSanitize ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <ShieldCheck className="w-3 h-3" />
                    sanitize_data.py Format
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-[#1E1E26] text-[#A0A5B0] border border-[#2A2A36]">
                    <Layers className="w-3 h-3" />
                    Custom {selectedColumnIds.length}-Col Schema
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8E9299] mt-0.5">
                Preview data, customize column inclusions, and filter specific tokens before downloading.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8E9299] hover:text-white hover:bg-[#1E1E24] transition-colors cursor-pointer"
            title="Close modal (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Configuration Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 scrollbar-thin">
          {/* Section 1: Column Selection */}
          <div className="space-y-3 bg-[#16161A] p-4 rounded-xl border border-[#1F1F24]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white uppercase tracking-wider">
                  Select Columns to Include
                </span>
                <span className="text-[11px] text-[#8E9299] font-mono">
                  ({selectedColumnIds.length}/{AVAILABLE_CSV_COLUMNS.length} active)
                </span>
              </div>

              {/* Column Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-[#8E9299] mr-1">Presets:</span>
                <button
                  type="button"
                  onClick={() => applyPreset("sanitize")}
                  className={`px-2 py-1 rounded text-[11px] font-mono font-medium transition-colors cursor-pointer border ${
                    isStrictSanitize
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-[#1E1E26] text-[#8E9299] border-[#2A2A36] hover:text-white"
                  }`}
                  title="address,amount format strictly expected by sanitize_data.py"
                >
                  sanitize_data.py (2 cols)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("ats")}
                  className="px-2 py-1 rounded text-[11px] font-mono font-medium bg-[#1E1E26] text-[#8E9299] border border-[#2A2A36] hover:text-white transition-colors cursor-pointer"
                  title="address, amount, symbol, name, chain, standard"
                >
                  Order Book / ATS (6 cols)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("all")}
                  className="px-2 py-1 rounded text-[11px] font-mono font-medium bg-[#1E1E26] text-[#8E9299] border border-[#2A2A36] hover:text-white transition-colors cursor-pointer"
                  title="Include all available ledger columns"
                >
                  All Columns
                </button>
              </div>
            </div>

            {/* Column Checkboxes Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
              {AVAILABLE_CSV_COLUMNS.map((col) => {
                const isSelected = selectedColumnIds.includes(col.id);
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => toggleColumn(col.id)}
                    className={`flex items-start gap-2 p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#1A1A22] border-emerald-500/50 text-white"
                        : "bg-[#121216] border-[#1F1F24] text-[#6E7178] hover:text-[#B0B4BC] hover:border-[#2C2C38]"
                    }`}
                  >
                    <div className="mt-0.5 text-xs">
                      {isSelected ? (
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-[#50535A] shrink-0" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-mono font-semibold truncate leading-tight">
                        {col.label}
                      </p>
                      <p className="text-[10px] text-[#8E9299] truncate mt-0.5 leading-tight">
                        {col.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Token Filter & Selection Bar */}
          <div className="space-y-3 bg-[#16161A] p-4 rounded-xl border border-[#1F1F24]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white uppercase tracking-wider">
                  Select Tokens to Include
                </span>
                <span className="text-[11px] text-emerald-400 font-mono font-bold">
                  {tokensToExport.length} of {tokens.length} selected
                </span>
              </div>

              {/* Quick Batch Selection Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={selectAllTokens}
                  className="px-2 py-1 rounded text-[11px] font-mono bg-[#1E1E26] hover:bg-[#282834] text-[#A0A5B0] hover:text-white border border-[#2A2A36] transition-colors cursor-pointer"
                >
                  Select All ({tokens.length})
                </button>
                <button
                  type="button"
                  onClick={deselectAllTokens}
                  className="px-2 py-1 rounded text-[11px] font-mono bg-[#1E1E26] hover:bg-[#282834] text-[#A0A5B0] hover:text-white border border-[#2A2A36] transition-colors cursor-pointer"
                >
                  Clear Selection
                </button>
                <button
                  type="button"
                  onClick={selectEvmOnly}
                  className="px-2 py-1 rounded text-[11px] font-mono bg-[#1E1E26] hover:bg-[#282834] text-emerald-400 hover:text-emerald-300 border border-[#2A2A36] transition-colors cursor-pointer"
                  title="Select only EVM 0x contract addresses"
                >
                  EVM Only
                </button>
                {displayedTokens.length !== tokens.length && (
                  <button
                    type="button"
                    onClick={selectFilteredOnly}
                    className="px-2 py-1 rounded text-[11px] font-mono bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 transition-colors cursor-pointer"
                  >
                    Select Filtered ({displayedTokens.length})
                  </button>
                )}
              </div>
            </div>

            {/* Filter controls inside modal */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <div className="relative flex-1 w-full">
                <Search className="w-3.5 h-3.5 text-[#6E7178] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by token name, symbol, address or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-[#0F0F13] border border-[#23232A] rounded-lg text-xs text-white placeholder-[#6E7178] focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              {/* Chain filter */}
              <div className="flex items-center gap-1 shrink-0 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                <Filter className="w-3 h-3 text-[#6E7178] mr-1 hidden sm:block" />
                <button
                  type="button"
                  onClick={() => setSelectedChainFilter("all")}
                  className={`px-2 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer whitespace-nowrap ${
                    selectedChainFilter === "all"
                      ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40"
                      : "bg-[#1E1E26] text-[#8E9299] hover:text-white border border-[#2A2A36]"
                  }`}
                >
                  All ({tokens.length})
                </button>
                {uniqueChains.map((chain) => (
                  <button
                    key={chain}
                    type="button"
                    onClick={() => setSelectedChainFilter(chain)}
                    className={`px-2 py-1 rounded text-[11px] font-mono capitalize transition-colors cursor-pointer whitespace-nowrap ${
                      selectedChainFilter === chain
                        ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40"
                        : "bg-[#1E1E26] text-[#8E9299] hover:text-white border border-[#2A2A36]"
                    }`}
                  >
                    {chain}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Data Preview (Table vs Raw CSV) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white uppercase tracking-wider">
                  Data Preview
                </span>
                <span className="text-[11px] text-[#8E9299] font-mono">
                  {tokensToExport.length} records ready
                </span>
              </div>

              {/* Preview Tab Switcher */}
              <div className="flex items-center bg-[#0F0F13] border border-[#23232A] rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setPreviewTab("table")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    previewTab === "table"
                      ? "bg-[#1E1E26] text-white shadow-sm"
                      : "text-[#8E9299] hover:text-white"
                  }`}
                >
                  <Table className="w-3 h-3" />
                  <span>Table View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("raw")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    previewTab === "raw"
                      ? "bg-[#1E1E26] text-white shadow-sm"
                      : "text-[#8E9299] hover:text-white"
                  }`}
                >
                  <Code className="w-3 h-3" />
                  <span>Raw CSV Code</span>
                </button>
              </div>
            </div>

            {/* Table View Tab */}
            {previewTab === "table" && (
              <div className="border border-[#1F1F24] rounded-xl overflow-hidden bg-[#0D0D10]">
                <div className="max-h-72 overflow-y-auto scrollbar-thin overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead className="bg-[#15151B] sticky top-0 z-10 border-b border-[#22222B]">
                      <tr>
                        <th className="p-2.5 w-10 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const allDisplayedSelected = displayedTokens.every((t) =>
                                selectedTokenIds.has(t.id)
                              );
                              if (allDisplayedSelected) {
                                // Deselect all displayed
                                setSelectedTokenIds((prev) => {
                                  const next = new Set(prev);
                                  displayedTokens.forEach((t) => next.delete(t.id));
                                  return next;
                                });
                              } else {
                                // Select all displayed
                                setSelectedTokenIds((prev) => {
                                  const next = new Set(prev);
                                  displayedTokens.forEach((t) => next.add(t.id));
                                  return next;
                                });
                              }
                            }}
                            className="text-[#8E9299] hover:text-white cursor-pointer"
                            title="Toggle all displayed"
                          >
                            {displayedTokens.length > 0 &&
                            displayedTokens.every((t) => selectedTokenIds.has(t.id)) ? (
                              <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-[#50535A]" />
                            )}
                          </button>
                        </th>
                        {activeColumns.map((col) => (
                          <th
                            key={col.id}
                            className="p-2.5 text-[#B0B4BC] uppercase tracking-wider text-[11px] font-semibold whitespace-nowrap"
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1A1A22]">
                      {displayedTokens.length === 0 ? (
                        <tr>
                          <td
                            colSpan={activeColumns.length + 1}
                            className="text-center py-8 text-[#8E9299] italic"
                          >
                            No tokens match the current search or chain filter.
                          </td>
                        </tr>
                      ) : (
                        displayedTokens.slice(0, 50).map((token) => {
                          const isSelected = selectedTokenIds.has(token.id);
                          return (
                            <tr
                              key={token.id}
                              onClick={() => toggleToken(token.id)}
                              className={`transition-colors cursor-pointer ${
                                isSelected
                                  ? "bg-[#141419] hover:bg-[#1A1A22]"
                                  : "bg-transparent opacity-40 hover:opacity-75"
                              }`}
                            >
                              <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => toggleToken(token.id)}
                                  className="cursor-pointer"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Square className="w-3.5 h-3.5 text-[#50535A]" />
                                  )}
                                </button>
                              </td>
                              {activeColumns.map((col) => {
                                const val = col.getter(token);
                                return (
                                  <td
                                    key={col.id}
                                    className="p-2.5 text-[#D4D7E0] whitespace-nowrap text-[11px] max-w-xs truncate"
                                    title={String(val)}
                                  >
                                    {col.id === "address" ? (
                                      <span className="text-emerald-400 font-semibold">
                                        {String(val)}
                                      </span>
                                    ) : col.id === "amount" ? (
                                      <span className="text-amber-400 font-semibold">
                                        {typeof val === "number" ? val.toLocaleString() : val}
                                      </span>
                                    ) : col.id === "symbol" ? (
                                      <span className="text-blue-400 font-bold">{val}</span>
                                    ) : col.id === "chain" ? (
                                      <span className="capitalize text-[#A0A5B0]">{val}</span>
                                    ) : (
                                      <span>{typeof val === "number" ? val.toLocaleString() : String(val)}</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                {displayedTokens.length > 50 && (
                  <div className="bg-[#121217] px-4 py-2 text-[11px] text-[#8E9299] border-t border-[#1F1F24] flex items-center justify-between">
                    <span>Showing first 50 of {displayedTokens.length} matching rows</span>
                    <span>All {tokensToExport.length} selected tokens will be exported</span>
                  </div>
                )}
              </div>
            )}

            {/* Raw CSV Code Tab */}
            {previewTab === "raw" && (
              <div className="border border-[#1F1F24] rounded-xl overflow-hidden bg-[#0A0A0D]">
                <div className="p-3 bg-[#111116] border-b border-[#1F1F24] flex items-center justify-between text-[11px] text-[#8E9299]">
                  <span className="font-mono">
                    Header: <code className="text-emerald-400">{activeColumns.map((c) => c.label).join(",")}</code>
                  </span>
                  <span>
                    Previewing {Math.min(tokensToExport.length, 50)} rows
                  </span>
                </div>
                <div className="p-4 font-mono text-xs text-[#E0E0E0] max-h-72 overflow-y-auto scrollbar-thin select-all leading-relaxed whitespace-pre">
                  {rawCsvPreview}
                  {tokensToExport.length > 50 && (
                    <div className="text-[10px] text-[#8E9299] pt-3 border-t border-[#1F1F24] mt-2 italic">
                      ... plus {(tokensToExport.length - 50).toLocaleString()} more records included in the generated file
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#1F1F23] bg-[#16161C]/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyCsv}
              disabled={tokensToExport.length === 0}
              className={`px-3.5 py-2 rounded-lg border text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer w-full sm:w-auto ${
                tokensToExport.length === 0
                  ? "bg-[#16161A] border-[#222228] text-[#555] opacity-50 cursor-not-allowed"
                  : "bg-[#18181D] hover:bg-[#222228] border-[#2F2F3D] text-white"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#8E9299]" />
                  <span>Copy CSV Payload</span>
                </>
              )}
            </button>
            <span className="text-xs text-[#8E9299] font-mono hidden md:inline">
              {tokensToExport.length} rows · {activeColumns.length} columns
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-[#8E9299] hover:text-white hover:bg-[#1E1E24] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={tokensToExport.length === 0}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                tokensToExport.length === 0
                  ? "bg-emerald-950/40 text-emerald-800 border border-emerald-900/30 cursor-not-allowed"
                  : "bg-emerald-500 hover:bg-emerald-400 text-black active:scale-[0.98]"
              }`}
            >
              <FileDown className="w-4 h-4 fill-current" />
              <span>
                Export CSV ({tokensToExport.length} Tokens)
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
