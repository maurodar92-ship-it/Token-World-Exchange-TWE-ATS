import React, { useState, useMemo } from "react";
import {
  Tag,
  Tags,
  Sparkles,
  CheckCircle2,
  Filter,
  X,
  RefreshCw,
  Sliders,
  Layers,
  Zap,
  Check,
  Search,
  Cpu,
} from "lucide-react";
import { TokenRecord } from "../types";
import {
  CATEGORICAL_TAG_DEFINITIONS,
  ALL_CATEGORICAL_TAG_IDS,
  CategoricalTagId,
  batchScanAndApplyTags,
  scanTokenForCategoricalTags,
  evaluateTokenTagScores,
  TaggingOptions,
} from "../utils/tokenTaggingEngine";

interface AutomatedTaggingModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokens: TokenRecord[];
  selectedTokenIds?: Set<string>;
  onApplyTags: (updatedTokens: TokenRecord[]) => void;
  onSelectTagFilter?: (tagId: string) => void;
}

export const AutomatedTaggingModal: React.FC<AutomatedTaggingModalProps> = ({
  isOpen,
  onClose,
  tokens,
  selectedTokenIds,
  onApplyTags,
  onSelectTagFilter,
}) => {
  const [scope, setScope] = useState<"all" | "selected">(
    selectedTokenIds && selectedTokenIds.size > 0 ? "selected" : "all"
  );
  const [strategy, setStrategy] = useState<"enrich" | "overwrite">("enrich");
  const [maxTags, setMaxTags] = useState<number>(3);
  const [previewFilterTag, setPreviewFilterTag] = useState<string>("all");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [completedResult, setCompletedResult] = useState<{
    totalScanned: number;
    totalApplied: number;
    breakdown: Record<CategoricalTagId, number>;
  } | null>(null);

  // Determine active tokens based on scope
  const targetTokens = useMemo(() => {
    if (scope === "selected" && selectedTokenIds && selectedTokenIds.size > 0) {
      return tokens.filter((t) => selectedTokenIds.has(t.id));
    }
    return tokens;
  }, [tokens, scope, selectedTokenIds]);

  // Current tagging state in target tokens
  const currentStats = useMemo(() => {
    let taggedCount = 0;
    const tagFreq: Record<string, number> = {};

    targetTokens.forEach((t) => {
      if (t.tags && t.tags.length > 0) {
        taggedCount++;
        t.tags.forEach((tag) => {
          const lower = tag.toLowerCase();
          tagFreq[lower] = (tagFreq[lower] || 0) + 1;
        });
      }
    });

    return {
      total: targetTokens.length,
      taggedCount,
      untaggedCount: targetTokens.length - taggedCount,
      tagFreq,
    };
  }, [targetTokens]);

  // Generate live sample preview of what tags would be applied
  const previewSample = useMemo(() => {
    const sample = targetTokens.slice(0, 8);
    return sample.map((token) => {
      const detected = scanTokenForCategoricalTags(token, {
        maxTagsPerToken: maxTags,
        preserveExisting: strategy === "enrich",
      });
      const scores = evaluateTokenTagScores(token);
      return {
        token,
        detected,
        topScoreTag: detected[0] || "high-yield",
        score: scores[detected[0] || "high-yield"] || 0,
      };
    });
  }, [targetTokens, maxTags, strategy]);

  const handleRunTagging = () => {
    setIsProcessing(true);

    // Run batch engine
    const options: TaggingOptions = {
      maxTagsPerToken: maxTags,
      preserveExisting: strategy === "enrich",
      minScoreThreshold: 2.0,
    };

    const { updatedTokens, totalScanned, totalTagsApplied, tagFrequency } =
      batchScanAndApplyTags(targetTokens, options);

    // If scope was 'selected', merge back into full list
    let fullUpdatedList = updatedTokens;
    if (scope === "selected" && selectedTokenIds && selectedTokenIds.size > 0) {
      const updateMap = new Map(updatedTokens.map((t) => [t.id, t]));
      fullUpdatedList = tokens.map((t) => updateMap.get(t.id) || t);
    }

    onApplyTags(fullUpdatedList);
    setCompletedResult({
      totalScanned,
      totalApplied: totalTagsApplied,
      breakdown: tagFrequency,
    });
    setIsProcessing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#0F0F12] border border-[#26262B] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#141418] border-b border-[#26262B] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Tags className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Automated Token Tagging Engine
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 text-[10px] font-mono font-semibold uppercase">
                  Semantic Scanner
                </span>
              </div>
              <p className="text-xs text-[#8E9299]">
                Scans token names, narratives, archetypes, and parameters to classify & organize tokens with verified categorical tags.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8E9299] hover:text-white hover:bg-[#1E1E24] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-[#E0E0E0]">
          {/* Top Status Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-[#141418] border border-[#222228] flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-[#8E9299] uppercase font-mono tracking-wider">
                  Target Dataset
                </div>
                <div className="text-base font-bold text-white font-mono">
                  {targetTokens.length.toLocaleString()}{" "}
                  <span className="text-xs text-[#8E9299] font-sans font-normal">tokens</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#141418] border border-[#222228] flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-[#8E9299] uppercase font-mono tracking-wider">
                  Currently Tagged
                </div>
                <div className="text-base font-bold text-emerald-400 font-mono">
                  {currentStats.taggedCount.toLocaleString()}{" "}
                  <span className="text-xs text-[#8E9299] font-sans font-normal">
                    ({Math.round((currentStats.taggedCount / Math.max(1, targetTokens.length)) * 100)}%)
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#141418] border border-[#222228] flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-[#8E9299] uppercase font-mono tracking-wider">
                  Categorical Taxonomies
                </div>
                <div className="text-base font-bold text-purple-400 font-mono">
                  {ALL_CATEGORICAL_TAG_IDS.length}{" "}
                  <span className="text-xs text-[#8E9299] font-sans font-normal">categories</span>
                </div>
              </div>
            </div>
          </div>

          {/* Configuration Controls */}
          <div className="p-4 rounded-xl bg-[#141418] border border-[#222228] space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-white uppercase tracking-wider font-mono">
              <Sliders className="w-3.5 h-3.5 text-orange-400" />
              <span>Scanning Configuration</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Scope Selection */}
              <div>
                <label className="block text-[11px] text-[#8E9299] font-mono mb-1.5 uppercase">
                  Target Scope:
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-[#0A0A0C] p-1 rounded-lg border border-[#222228]">
                  <button
                    type="button"
                    onClick={() => setScope("all")}
                    className={`py-1.5 px-2 rounded text-xs font-mono font-medium transition-all ${
                      scope === "all"
                        ? "bg-orange-500 text-white shadow-sm font-bold"
                        : "text-[#8E9299] hover:text-white"
                    }`}
                  >
                    All Tokens ({tokens.length})
                  </button>
                  <button
                    type="button"
                    disabled={!selectedTokenIds || selectedTokenIds.size === 0}
                    onClick={() => setScope("selected")}
                    className={`py-1.5 px-2 rounded text-xs font-mono font-medium transition-all ${
                      scope === "selected"
                        ? "bg-orange-500 text-white shadow-sm font-bold"
                        : selectedTokenIds && selectedTokenIds.size > 0
                        ? "text-[#8E9299] hover:text-white"
                        : "text-zinc-600 cursor-not-allowed"
                    }`}
                    title={
                      selectedTokenIds && selectedTokenIds.size > 0
                        ? `Target only ${selectedTokenIds.size} selected tokens`
                        : "Select tokens with checkboxes in Explorer to use this mode"
                    }
                  >
                    Selected ({selectedTokenIds?.size || 0})
                  </button>
                </div>
              </div>

              {/* Tagging Strategy */}
              <div>
                <label className="block text-[11px] text-[#8E9299] font-mono mb-1.5 uppercase">
                  Assignment Strategy:
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-[#0A0A0C] p-1 rounded-lg border border-[#222228]">
                  <button
                    type="button"
                    onClick={() => setStrategy("enrich")}
                    className={`py-1.5 px-2 rounded text-xs font-mono font-medium transition-all ${
                      strategy === "enrich"
                        ? "bg-emerald-600 text-white shadow-sm font-bold"
                        : "text-[#8E9299] hover:text-white"
                    }`}
                    title="Enrich existing tags without deleting prior manual labels"
                  >
                    Enrich &amp; Append
                  </button>
                  <button
                    type="button"
                    onClick={() => setStrategy("overwrite")}
                    className={`py-1.5 px-2 rounded text-xs font-mono font-medium transition-all ${
                      strategy === "overwrite"
                        ? "bg-rose-600 text-white shadow-sm font-bold"
                        : "text-[#8E9299] hover:text-white"
                    }`}
                    title="Re-index freshly from token name, symbol, and narrative"
                  >
                    Clean Re-Index
                  </button>
                </div>
              </div>

              {/* Max Tags per Token */}
              <div>
                <label className="block text-[11px] text-[#8E9299] font-mono mb-1.5 uppercase">
                  Max Tags / Token ({maxTags}):
                </label>
                <div className="flex items-center gap-1.5 bg-[#0A0A0C] p-1 rounded-lg border border-[#222228]">
                  {[2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setMaxTags(num)}
                      className={`flex-1 py-1.5 rounded text-xs font-mono font-bold transition-all ${
                        maxTags === num
                          ? "bg-[#26262B] text-orange-400 border border-orange-500/40"
                          : "text-[#8E9299] hover:text-white"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Categorical Taxonomy Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                Active Categorical Taxonomies ({ALL_CATEGORICAL_TAG_IDS.length})
              </span>
              <span className="text-[11px] text-[#8E9299]">
                Click any tag below to filter preview
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {ALL_CATEGORICAL_TAG_IDS.map((tagId) => {
                const def = CATEGORICAL_TAG_DEFINITIONS[tagId];
                const activeCount = currentStats.tagFreq[tagId] || 0;
                const isSelected = previewFilterTag === tagId;

                return (
                  <button
                    key={tagId}
                    type="button"
                    onClick={() =>
                      setPreviewFilterTag(isSelected ? "all" : tagId)
                    }
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? `${def.badgeBg} border-white/40 shadow-md`
                        : `bg-[#141418] border-[#222228] hover:border-[#333]`
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${def.dotColor}`} />
                        <span className={`text-xs font-bold font-mono ${def.badgeText}`}>
                          {def.label}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-[#8E9299]">
                        {activeCount}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#8E9299] line-clamp-2 leading-tight">
                      {def.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Preview Sample */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Live Scanning Preview ({previewSample.length} Sample Tokens)
              </span>
              {previewFilterTag !== "all" && (
                <button
                  type="button"
                  onClick={() => setPreviewFilterTag("all")}
                  className="text-[11px] text-orange-400 hover:underline font-mono"
                >
                  Clear filter
                </button>
              )}
            </div>

            <div className="bg-[#0A0A0C] border border-[#222228] rounded-xl overflow-hidden divide-y divide-[#1F1F23]">
              {previewSample
                .filter(
                  (item) =>
                    previewFilterTag === "all" ||
                    item.detected.includes(previewFilterTag as CategoricalTagId)
                )
                .map(({ token, detected }) => (
                  <div
                    key={token.id}
                    className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-[#141418] transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white font-mono">
                          {token.name}
                        </span>
                        <span className="text-[10px] text-[#8E9299] font-mono">
                          ({token.symbol})
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#16161A] text-[#8E9299] border border-[#26262B] font-mono">
                          {token.narrative.replace("_", " ")}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#666] font-mono">
                        Standard: {token.tokenStandard} • Chain: {token.chain}
                      </div>
                    </div>

                    {/* Detected Categorical Tags */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {detected.map((tagId) => {
                        const def = CATEGORICAL_TAG_DEFINITIONS[tagId];
                        if (!def) return null;
                        return (
                          <span
                            key={tagId}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium border ${def.badgeBg} ${def.badgeBorder} ${def.badgeText}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${def.dotColor}`} />
                            {def.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Success Outcome Banner */}
          {completedResult && (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Automated Tagging Successfully Completed!</span>
              </div>
              <p className="text-xs text-emerald-200/80 leading-relaxed">
                Scanned {completedResult.totalScanned.toLocaleString()} tokens and applied {completedResult.totalApplied.toLocaleString()} categorical tags across the dataset. All tags have been committed to local memory and synchronized with durable vault storage.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {Object.entries(completedResult.breakdown)
                  .filter(([_, count]) => (count as number) > 0)
                  .slice(0, 6)
                  .map(([tagId, count]) => {
                    const def = CATEGORICAL_TAG_DEFINITIONS[tagId as CategoricalTagId];
                    if (!def) return null;
                    return (
                      <button
                        key={tagId}
                        type="button"
                        onClick={() => {
                          if (onSelectTagFilter) {
                            onSelectTagFilter(tagId);
                            onClose();
                          }
                        }}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border cursor-pointer hover:scale-105 transition-transform ${def.badgeBg} ${def.badgeBorder} ${def.badgeText}`}
                        title="Click to view tokens with this tag in Explorer"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${def.dotColor}`} />
                        {def.label}: {count}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#141418] border-t border-[#26262B] flex items-center justify-between gap-3">
          <div className="text-xs text-[#8E9299] font-mono">
            Scanning {targetTokens.length.toLocaleString()} tokens with {ALL_CATEGORICAL_TAG_IDS.length} taxonomies
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#1E1E24] hover:bg-[#26262B] text-xs font-semibold text-[#8E9299] hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isProcessing || targetTokens.length === 0}
              onClick={handleRunTagging}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-orange-950/40 cursor-pointer transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Scanning &amp; Tagging...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-white" />
                  <span>Run Tagging Engine ({targetTokens.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
