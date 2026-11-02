import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  Download,
  Terminal,
  FileCode,
  Layers,
  Sparkles,
  AlertCircle,
  Play,
  RefreshCw,
  CheckCircle2,
  Code2,
  ListOrdered,
  ArrowUpRight,
  HelpCircle,
  Sliders,
  ChevronDown,
  ChevronUp,
  Cpu,
} from "lucide-react";
import { TokenRecord } from "../types";
import {
  buildBatchVerificationQueue,
  EtherscanQueueItem,
  generateBatchVerificationBashScript,
} from "../utils/etherscanBatchVerifier";

interface BulkEtherscanVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTokens: TokenRecord[];
  allTokens: TokenRecord[];
  onSelectAllTokens?: () => void;
}

export const BulkEtherscanVerifyModal: React.FC<BulkEtherscanVerifyModalProps> = ({
  isOpen,
  onClose,
  selectedTokens,
  allTokens,
  onSelectAllTokens,
}) => {
  const [queue, setQueue] = useState<EtherscanQueueItem[]>([]);
  const [isOpeningTabs, setIsOpeningTabs] = useState<boolean>(false);
  const [openedCount, setOpenedCount] = useState<number>(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [popupNoticeVisible, setPopupNoticeVisible] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Determine active list: if user selected tokens, use those; otherwise use first 10 or all
  const activeTokens = useMemo(() => {
    if (selectedTokens.length > 0) return selectedTokens;
    return allTokens.slice(0, 10);
  }, [selectedTokens, allTokens]);

  // Build the queue when modal opens or tokens change
  useEffect(() => {
    if (isOpen && activeTokens.length > 0) {
      const generatedQueue = buildBatchVerificationQueue(activeTokens);
      setQueue(generatedQueue);
      setOpenedCount(0);
      setIsOpeningTabs(false);
      if (generatedQueue.length > 0) {
        setExpandedItemId(generatedQueue[0].id);
      }
    }
  }, [isOpen, activeTokens]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Open single tab
  const handleOpenSingleTab = (item: EtherscanQueueItem) => {
    window.open(item.verificationUrl, "_blank", "noopener,noreferrer");
    setQueue((prev) =>
      prev.map((q) => (q.id === item.id ? { ...q, tabOpened: true, status: "opened" } : q))
    );
  };

  // Multi-tab batch launcher with safety delay to prevent browser popup suppression
  const handleLaunchBatchTabs = async () => {
    if (queue.length === 0 || isOpeningTabs) return;

    setIsOpeningTabs(true);
    let count = 0;

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      try {
        window.open(item.verificationUrl, "_blank", "noopener,noreferrer");
        count++;
        setOpenedCount(count);
        setQueue((prev) =>
          prev.map((q, idx) => (idx === i ? { ...q, tabOpened: true, status: "opened" } : q))
        );
      } catch (err) {
        console.warn("Popup blocked for item", item.contractAddress, err);
      }

      // 350ms delay between tabs for browser pop-up dispatcher
      if (i < queue.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
    }

    setIsOpeningTabs(false);
  };

  // Copy all verification URLs
  const handleCopyAllLinks = () => {
    const urls = queue.map((item) => `${item.name} (${item.symbol}): ${item.verificationUrl}`).join("\n");
    handleCopy(urls, "all-urls");
  };

  // Download batch automation script
  const handleDownloadScript = () => {
    const script = generateBatchVerificationBashScript(queue);
    const blob = new Blob([script], { type: "text/x-shellscript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `batch_verify_etherscan_${queue.length}_contracts.sh`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download all verification JSON payloads
  const handleDownloadBatchJson = () => {
    const payload = {
      timestamp: new Date().toISOString(),
      totalContracts: queue.length,
      compilerTarget: "v0.8.24+commit.e11b9ed9",
      optimizerRuns: 200,
      contracts: queue.map((item) => ({
        name: item.name,
        symbol: item.symbol,
        contractAddress: item.contractAddress,
        chain: item.chain,
        explorerName: item.explorerName,
        verificationUrl: item.verificationUrl,
        contractCodeUrl: item.contractCodeUrl,
        contractName: item.contractName,
        compilerVersion: item.compilerVersion,
        constructorArgsHex: item.constructorArgsHex,
        publicContractId: item.publicContractId,
        sourceCode: item.sourceCode,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `etherscan_batch_verification_${queue.length}_contracts.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredQueue = useMemo(() => {
    if (!searchQuery.trim()) return queue;
    const q = searchQuery.toLowerCase();
    return queue.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.symbol.toLowerCase().includes(q) ||
        item.contractAddress.toLowerCase().includes(q) ||
        item.chain.toLowerCase().includes(q)
    );
  }, [queue, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in">
      <div
        id="bulk-etherscan-verify-modal"
        className="bg-[#0E1017] border border-[#262A3B] rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-mono"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#1E2233] flex items-center justify-between bg-[#121522]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 to-[#F27D26]/20 border border-[#F27D26]/40 flex items-center justify-center text-[#F27D26]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-mono">
                  Bulk Verify on Etherscan
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26]/40 font-bold">
                  {queue.length} Contracts Queued
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Pre-filled Source &amp; ABI
                </span>
              </div>
              <p className="text-xs text-[#8E9299]">
                Generates a multi-link batch queue for automated explorer verification pre-filled with Solidity 0.8.24 source code and ABI constructor arguments
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1C2030] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action & Status Bar */}
        <div className="px-6 py-3.5 bg-[#0A0C13] border-b border-[#1B1E2D] flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Primary Action: Launch All Tabs */}
            <button
              id="btn-launch-batch-tabs"
              onClick={handleLaunchBatchTabs}
              disabled={isOpeningTabs || queue.length === 0}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F27D26] to-amber-500 hover:from-[#e06f1d] hover:to-amber-600 text-black font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#F27D26]/20 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              {isOpeningTabs ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>Opening Tabs ({openedCount}/{queue.length})...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-black text-black" />
                  <span>Open Multi-Tab Queue ({queue.length} Tabs)</span>
                </>
              )}
            </button>

            {/* Copy All URLs */}
            <button
              onClick={handleCopyAllLinks}
              className="px-3 py-2 rounded-xl bg-[#141724] hover:bg-[#1D2133] border border-[#272C40] text-gray-300 hover:text-white text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Copy all generated Etherscan verification URLs to clipboard"
            >
              {copiedKey === "all-urls" ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span>{copiedKey === "all-urls" ? "Copied All" : "Copy All URLs"}</span>
            </button>

            {/* Export Foundry / Hardhat CLI script */}
            <button
              onClick={handleDownloadScript}
              className="px-3 py-2 rounded-xl bg-[#141724] hover:bg-[#1D2133] border border-[#272C40] text-gray-300 hover:text-white text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Download executable Foundry & Hardhat verification bash script"
            >
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              <span>CLI Script (.sh)</span>
            </button>

            {/* Download Full JSON Package */}
            <button
              onClick={handleDownloadBatchJson}
              className="px-3 py-2 rounded-xl bg-[#141724] hover:bg-[#1D2133] border border-[#272C40] text-gray-300 hover:text-white text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Download pre-filled source code, constructor args, and verification metadata in JSON"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Batch JSON</span>
            </button>
          </div>

          {/* Quick Filter */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter queue by name or address..."
              className="px-3 py-1.5 bg-[#121522] border border-[#24293C] rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#F27D26] w-48 sm:w-60"
            />
          </div>
        </div>

        {/* Browser Popup Guidance Notice */}
        {popupNoticeVisible && (
          <div className="px-6 py-2.5 bg-[#111422] border-b border-[#1C2032] flex items-center justify-between text-xs text-[#8E9299]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#F27D26] shrink-0" />
              <span>
                <strong className="text-white">Multi-Tab Note:</strong> If your browser pauses multiple simultaneous tabs, allow popups from this window or use the individual <strong className="text-cyan-300">Open Tab</strong> button on each row below.
              </span>
            </div>
            <button
              onClick={() => setPopupNoticeVisible(false)}
              className="text-gray-500 hover:text-gray-300 cursor-pointer ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Queue Items List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filteredQueue.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#8E9299] space-y-2">
              <AlertCircle className="w-8 h-8 text-gray-500 mx-auto" />
              <div className="text-white font-bold">No tokens found in batch queue</div>
              <p>Try clearing your search query or selecting contracts in the registry table.</p>
            </div>
          ) : (
            filteredQueue.map((item, index) => {
              const isExpanded = expandedItemId === item.id;
              return (
                <div
                  key={item.id}
                  className={`rounded-xl border transition-all duration-150 ${
                    item.tabOpened
                      ? "border-emerald-500/40 bg-[#0E1318]"
                      : isExpanded
                      ? "border-[#32374E] bg-[#111420]"
                      : "border-[#1D2132] bg-[#0E1019] hover:border-[#2A2F45]"
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-4 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[#181C2B] border border-[#252A40] flex items-center justify-center text-xs font-bold text-gray-300">
                        {index + 1}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white">{item.name}</span>
                          <span className="text-xs text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                            {item.symbol}
                          </span>
                          <span className="text-[10px] text-cyan-300 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                            {item.chain}
                          </span>
                          {item.tabOpened && (
                            <span className="text-[10px] text-emerald-300 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Tab Opened
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-[#8E9299] mt-1 flex-wrap">
                          <span>Address:</span>
                          <span className="text-gray-300 font-mono select-all">{item.contractAddress}</span>
                          <span className="text-gray-600">•</span>
                          <span>Compiler:</span>
                          <span className="text-emerald-400 font-mono">0.8.24 (Cancun)</span>
                          <span className="text-gray-600">•</span>
                          <span>Constructor:</span>
                          <span className="text-amber-300 font-mono">
                            {item.constructorArgsHex.slice(0, 16)}... ({Math.round(item.constructorArgsHex.length / 2)} bytes)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Row Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Direct Single Tab Open */}
                      <button
                        type="button"
                        onClick={() => handleOpenSingleTab(item)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          item.tabOpened
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                            : "bg-[#181C2D] hover:bg-[#22283F] text-white border border-[#2B314B]"
                        }`}
                        title={`Open verification wizard for ${item.name} in a new tab`}
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{item.tabOpened ? "Re-open Tab" : "Open Verification Tab"}</span>
                      </button>

                      {/* Copy Source */}
                      <button
                        type="button"
                        onClick={() => handleCopy(item.sourceCode, `source-${item.id}`)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#141624] hover:bg-[#1E2235] text-gray-300 hover:text-white border border-[#24283C] text-xs flex items-center gap-1 transition-all cursor-pointer"
                        title="Copy single-file Solidity 0.8.24 source code"
                      >
                        {copiedKey === `source-${item.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <FileCode className="w-3.5 h-3.5 text-[#F27D26]" />
                        )}
                        <span>{copiedKey === `source-${item.id}` ? "Copied" : "Copy Source"}</span>
                      </button>

                      {/* Copy Constructor Args Hex */}
                      <button
                        type="button"
                        onClick={() => handleCopy(item.constructorArgsHex, `args-${item.id}`)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#141624] hover:bg-[#1E2235] text-gray-300 hover:text-white border border-[#24283C] text-xs flex items-center gap-1 transition-all cursor-pointer"
                        title="Copy ABI-encoded constructor parameters hex for Etherscan form"
                      >
                        {copiedKey === `args-${item.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        <span>{copiedKey === `args-${item.id}` ? "Copied" : "Copy Args Hex"}</span>
                      </button>

                      {/* Expand / Collapse Details */}
                      <button
                        type="button"
                        onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                        className="p-1.5 rounded-lg bg-[#141624] hover:bg-[#1E2235] text-gray-400 hover:text-white border border-[#24283C] transition-all cursor-pointer"
                        title="Toggle verification payload details"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Details Drawer */}
                  {isExpanded && (
                    <div className="p-4 border-t border-[#1C2032] bg-[#0A0C13] space-y-4">
                      {/* Form Field Pre-fills Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        {/* 1. Compiler Target */}
                        <div className="p-3 rounded-lg bg-[#111420] border border-[#202538] space-y-1">
                          <span className="text-[10px] text-[#8E9299] block">1. Compiler Version</span>
                          <span className="text-white font-bold block">{item.compilerVersion}</span>
                          <span className="text-[10px] text-emerald-400 block">Single File (Flat Layout)</span>
                        </div>

                        {/* 2. Open Source License */}
                        <div className="p-3 rounded-lg bg-[#111420] border border-[#202538] space-y-1">
                          <span className="text-[10px] text-[#8E9299] block">2. Open Source License Type</span>
                          <span className="text-white font-bold block">3) MIT License (MIT)</span>
                          <span className="text-[10px] text-gray-400 block">Declared in SPDX header</span>
                        </div>

                        {/* 3. Optimization */}
                        <div className="p-3 rounded-lg bg-[#111420] border border-[#202538] space-y-1">
                          <span className="text-[10px] text-[#8E9299] block">3. Optimization Setting</span>
                          <span className="text-white font-bold block">Yes (200 runs)</span>
                          <span className="text-[10px] text-cyan-400 block">EVM: cancun / paris</span>
                        </div>
                      </div>

                      {/* Constructor Arguments Pre-fill Box */}
                      <div className="rounded-lg bg-[#0E1018] border border-[#1F2436] p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-amber-400" />
                            ABI-Encoded Constructor Arguments (For Step 2 Verification Form)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.constructorArgsHex, `hex-${item.id}`)}
                            className="px-2 py-0.5 rounded bg-[#181C2D] hover:bg-[#23293F] text-amber-300 text-[10px] flex items-center gap-1 cursor-pointer transition-all"
                          >
                            {copiedKey === `hex-${item.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedKey === `hex-${item.id}` ? "Copied" : "Copy Hex"}</span>
                          </button>
                        </div>

                        {/* Raw Hex */}
                        <div className="p-2.5 rounded bg-[#07080D] border border-[#161926] text-[11px] text-amber-300/90 font-mono break-all select-all max-h-20 overflow-y-auto">
                          {item.constructorArgsHex || "None (Zero Arguments)"}
                        </div>

                        {/* Decoded Parameters breakdown */}
                        <pre className="p-2 rounded bg-[#07080D]/60 text-[10px] text-[#8E9299] font-mono leading-relaxed whitespace-pre-wrap">
                          {item.constructorArgsReadable}
                        </pre>
                      </div>

                      {/* Source Code Box */}
                      <div className="rounded-lg bg-[#0E1018] border border-[#1F2436] p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Code2 className="w-3.5 h-3.5 text-[#F27D26]" />
                            Pre-filled Solidity Source Code ({item.contractName}.sol)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.sourceCode, `code-${item.id}`)}
                            className="px-2 py-0.5 rounded bg-[#181C2D] hover:bg-[#23293F] text-cyan-300 text-[10px] flex items-center gap-1 cursor-pointer transition-all"
                          >
                            {copiedKey === `code-${item.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedKey === `code-${item.id}` ? "Copied Code" : "Copy Code"}</span>
                          </button>
                        </div>
                        <pre className="p-3 rounded bg-[#07080D] text-[10px] text-cyan-200/90 font-mono max-h-48 overflow-y-auto leading-relaxed select-text">
                          {item.sourceCode.slice(0, 1000)}...
                          {"\n"}// [Remaining 200+ lines generated and included in clipboard copy]
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-[#1E2233] flex items-center justify-between bg-[#121522] flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs text-[#8E9299]">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              Queue is ready for Etherscan, Basescan, Arbiscan, and Polygonscan verification portals
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-[#1A1E2E] hover:bg-[#242A40] text-white text-xs transition-all cursor-pointer"
            >
              Close Queue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
