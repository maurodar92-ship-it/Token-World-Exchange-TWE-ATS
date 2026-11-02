import React, { useState } from "react";
import { 
  Database, 
  Sparkles, 
  Zap, 
  Check, 
  X, 
  ChevronRight, 
  ExternalLink, 
  Copy, 
  RefreshCw, 
  Play, 
  Pause,
  Terminal,
  ShieldCheck,
  Minimize2,
  Maximize2
} from "lucide-react";
import { TokenRecord } from "../types";

export interface VaultSavePromptState {
  isOpen: boolean;
  tokenCount: number;
  tokenSample?: TokenRecord;
  source: string;
  timestamp: string;
  associatedPrompt?: string;
  savedPromptId?: string;
}

interface VaultSavePromptBannerProps {
  promptState: VaultSavePromptState | null;
  onClose: () => void;
  onContinueSaving: () => void;
  isContinuing?: boolean;
  constantLoopActive: boolean;
  onToggleConstantLoop: () => void;
  onViewVault: () => void;
  onSavePromptToVault?: (prompt: string) => Promise<void>;
  vaultTokensCount: number;
}

export const VaultSavePromptBanner: React.FC<VaultSavePromptBannerProps> = ({
  promptState,
  onClose,
  onContinueSaving,
  isContinuing = false,
  constantLoopActive,
  onToggleConstantLoop,
  onViewVault,
  onSavePromptToVault,
  vaultTokensCount,
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [isCustomizing, setIsCustomizing] = useState<boolean>(false);
  const [manualSaved, setManualSaved] = useState<boolean>(false);

  if (!promptState || !promptState.isOpen) {
    return null;
  }

  const promptText = customPrompt || promptState.associatedPrompt || "Synthesize high-entropy Web3 token contracts with vanity salt and institutional audit proofs.";

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(promptText);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleSaveCustomPrompt = async () => {
    if (!promptText || !onSavePromptToVault) return;
    try {
      await onSavePromptToVault(promptText);
      setManualSaved(true);
      setTimeout(() => setManualSaved(false), 2500);
      setIsCustomizing(false);
    } catch (e) {
      console.warn("Could not manually save prompt:", e);
    }
  };

  // Minimized floating pill view
  if (isMinimized) {
    return (
      <div 
        id="vault-save-prompt-minimized"
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2.5 bg-[#0D0D11]/95 backdrop-blur-md border border-[#F27D26]/50 shadow-[0_4px_24px_rgba(242,125,38,0.25)] rounded-full px-4 py-2 text-xs font-mono text-white animate-fadeIn"
      >
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
          <span className="w-2 h-2 rounded-full bg-green-500 absolute" />
          <span className="text-[#F27D26] font-bold ml-1">Vault Sync:</span>
          <span className="text-gray-300">+{promptState.tokenCount} IDs Secured</span>
        </div>

        <div className="h-3.5 w-px bg-[#26262E]" />

        <button
          type="button"
          id="btn-vault-prompt-min-continue"
          onClick={onContinueSaving}
          disabled={isContinuing}
          className="px-2.5 py-1 rounded-full bg-[#F27D26] hover:bg-[#ff8e3c] text-black font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
        >
          {isContinuing ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : (
            <Zap className="w-3 h-3" />
          )}
          <span>Continue Saving</span>
        </button>

        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          title="Expand Details"
          className="p-1 hover:text-[#F27D26] text-gray-400 cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onClose}
          title="Dismiss Banner"
          className="p-1 hover:text-red-400 text-gray-400 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div 
      id="vault-save-prompt-dock"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-2xl z-50 bg-[#0D0D11]/98 backdrop-blur-xl border border-[#F27D26]/60 shadow-[0_8px_32px_rgba(0,0,0,0.8),0_0_24px_rgba(242,125,38,0.2)] rounded-xl p-4 sm:p-5 text-white animate-slideUp font-sans"
    >
      {/* Top Status Header */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#1F1F26]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#F27D26]/15 border border-[#F27D26]/40 flex items-center justify-center text-[#F27D26]">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Live in Firestore Vault
              </span>
              <span className="text-[11px] font-mono text-[#8E9299]">
                {promptState.timestamp}
              </span>
            </div>
            <h4 className="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5">
              <span>Token Generated & Saved in Vault</span>
              <span className="text-xs font-mono font-normal text-[#F27D26]">
                (+{promptState.tokenCount} IDs • {promptState.source})
              </span>
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            id="btn-minimize-vault-prompt"
            onClick={() => setIsMinimized(true)}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#1A1A22] transition-colors cursor-pointer"
            title="Minimize"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            id="btn-close-vault-prompt"
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-[#1A1A22] transition-colors cursor-pointer"
            title="Dismiss Prompt"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center: Token Sample & Saved Prompt Information */}
      <div className="py-3 space-y-2.5">
        {promptState.tokenSample && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-[#14141A] border border-[#22222C] text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">{promptState.tokenSample.name}</span>
              <span className="px-1.5 py-0.5 rounded bg-[#F27D26]/20 text-[#F27D26] text-[10px] font-bold">
                {promptState.tokenSample.symbol}
              </span>
              <span className="text-gray-400 text-[11px]">
                {promptState.tokenSample.chain.toUpperCase()}
              </span>
            </div>
            <div className="text-[11px] text-gray-400 truncate max-w-[200px]" title={promptState.tokenSample.contractAddress}>
              {promptState.tokenSample.contractAddress}
            </div>
          </div>
        )}

        {/* Prompt Saved in Vault Area */}
        <div className="bg-[#121216] p-3 rounded-lg border border-[#1F1F24] space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-[#8E9299] flex items-center gap-1.5">
              <Terminal className="w-3 h-3 text-cyan-400" />
              <span>GENERATION PROMPT (SAVED IN VAULT):</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-toggle-customize-prompt"
                onClick={() => setIsCustomizing((prev) => !prev)}
                className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
              >
                {isCustomizing ? "Cancel Edit" : "Edit Prompt"}
              </button>
              <button
                type="button"
                id="btn-copy-vault-prompt"
                onClick={handleCopyPrompt}
                className="text-[10px] text-[#F27D26] hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copiedPrompt ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedPrompt ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          {isCustomizing ? (
            <div className="space-y-2 pt-1">
              <textarea
                value={customPrompt || promptText}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={3}
                className="w-full bg-[#0A0A0E] border border-[#2A2A35] rounded p-2 text-xs font-mono text-white focus:border-[#F27D26] focus:outline-none resize-none"
                placeholder="Modify prompt for continuous vault saving..."
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleSaveCustomPrompt}
                  className="px-2.5 py-1 rounded bg-[#F27D26] text-black text-xs font-bold font-mono cursor-pointer"
                >
                  {manualSaved ? "Saved in Vault!" : "Save Updated Prompt in Vault"}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs font-mono text-gray-300 line-clamp-2 leading-relaxed bg-[#0A0A0C] p-2 rounded border border-[#1A1A22]">
              "{promptText}"
            </p>
          )}

          <div className="flex items-center gap-2 pt-1 text-[10px] font-mono text-green-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Prompt is stored in Cloud Firestore memory alongside token records.</span>
          </div>
        </div>
      </div>

      {/* Action Controls: Continue Prompt Saving in Vault */}
      <div className="pt-3 border-t border-[#1F1F26] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Continuous Loop Toggle */}
          <button
            type="button"
            id="btn-toggle-continuous-loop-prompt"
            onClick={onToggleConstantLoop}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer border ${
              constantLoopActive
                ? "bg-green-500/15 border-green-500/40 text-green-300 font-bold shadow-[0_0_12px_rgba(34,197,94,0.2)]"
                : "bg-[#14141A] border-[#22222C] text-gray-400 hover:text-white"
            }`}
          >
            {constantLoopActive ? (
              <>
                <Pause className="w-3.5 h-3.5 text-green-400" />
                <span>Continuous Auto-Save: ON</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-gray-400" />
                <span>Continuous Auto-Save: OFF</span>
              </>
            )}
          </button>

          {/* Inspect in Vault */}
          <button
            type="button"
            id="btn-prompt-inspect-vault"
            onClick={onViewVault}
            className="px-3 py-1.5 rounded-lg bg-[#14141A] hover:bg-[#1C1C24] border border-[#22222C] text-xs font-mono text-gray-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>View Vault ({vaultTokensCount})</span>
            <ExternalLink className="w-3 h-3 text-[#F27D26]" />
          </button>
        </div>

        {/* Primary CTA: Continue Prompt Saving in Vault */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-continue-prompt-saving-vault"
            onClick={onContinueSaving}
            disabled={isContinuing}
            className="px-4 py-2 rounded-lg bg-[#F27D26] hover:bg-[#ff8e3c] text-black text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50 active:scale-95"
          >
            {isContinuing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving to Vault...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 fill-black" />
                <span>Continue Prompt Saving in Vault</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
