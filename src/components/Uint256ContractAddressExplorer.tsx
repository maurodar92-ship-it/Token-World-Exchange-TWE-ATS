import React, { useState, useMemo } from "react";
import {
  UINT256_CONTRACT_ADDRESS_DATASET,
  formatUint256AddressEntry,
  Uint256ContractAddressEntry,
  generateSdkInteractionSnippet,
} from "../data/uint256ContractAddressData";
import {
  Search,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Activity,
  Code2,
  Terminal,
  Filter,
  Download,
  AlertTriangle,
  Layers,
  Sparkles,
  Zap,
  Globe,
  Binary,
  ArrowUpDown,
  BookOpen,
} from "lucide-react";

interface Props {
  onSelectContractAddress?: (address: string, tokenId: string) => void;
  onOpenBytecodeInspector?: (address: string) => void;
}

export const Uint256ContractAddressExplorer: React.FC<Props> = ({
  onSelectContractAddress,
  onOpenBytecodeInspector,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterZeroTier, setFilterZeroTier] = useState<"ALL" | "VANITY" | "EXTREME_10_PLUS" | "NULL">("ALL");
  const [activeActionModal, setActiveActionModal] = useState<Uint256ContractAddressEntry | null>(null);
  const [selectedSdkTab, setSelectedSdkTab] = useState<"ethers_v6" | "web3_py" | "viem" | "cast">("ethers_v6");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Format dataset
  const formattedEntries = useMemo(() => {
    return UINT256_CONTRACT_ADDRESS_DATASET.map((raw, idx) =>
      formatUint256AddressEntry(raw, idx + 1)
    );
  }, []);

  // Filter entries
  const filteredEntries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return formattedEntries.filter((entry) => {
      // Zero tier filter
      if (filterZeroTier === "VANITY" && entry.leadingZeros < 3) return false;
      if (filterZeroTier === "EXTREME_10_PLUS" && entry.leadingZeros < 10) return false;
      if (filterZeroTier === "NULL" && entry.contractAddress !== "0x0000000000000000000000000000000000000000") return false;

      // Text query
      if (!q) return true;
      return (
        entry.contractAddress.toLowerCase().includes(q) ||
        entry.uint256TokenId.toLowerCase().includes(q) ||
        entry.hexTokenId.toLowerCase().includes(q) ||
        entry.tokenSymbol.toLowerCase().includes(q) ||
        entry.tokenName.toLowerCase().includes(q)
      );
    });
  }, [formattedEntries, searchQuery, filterZeroTier]);

  const copyToClipboard = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setStatusMsg(`Copied ${label} to clipboard!`);
    setTimeout(() => {
      setCopiedKey(null);
      setStatusMsg(null);
    }, 2500);
  };

  const handleExportCsv = () => {
    const headers = [
      "contract_address",
      "token_id",
      "network_id",
      "leading_zeros",
      "hex_token_id",
      "suggested_symbol",
      "suggested_name",
    ];
    const rows = filteredEntries.map((e) =>
      [
        e.contractAddress,
        e.uint256TokenId,
        e.networkId,
        e.leadingZeros,
        e.hexTokenId,
        e.tokenSymbol,
        `"${e.tokenName}"`,
      ].join(",")
    );
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `UINT256_Contract_Addresses_Export_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatusMsg(`Exported ${filteredEntries.length} addresses to CSV!`);
    setTimeout(() => setStatusMsg(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* 5 Key Action Cards Banner */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#F27D26]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center gap-1 font-mono">
                  <Binary className="w-3.5 h-3.5" />
                  UINT256 Blockchain Tracker
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-mono">
                  49 Smart Contracts
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                  EVM Mainnet (ID #1)
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                UINT256 Smart Contract Addresses & Web3 Interaction Engine
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 max-w-3xl mt-1 leading-relaxed">
                Interact with, analyze, and track decentralized applications or tokens on blockchain networks using high-entropy UINT256 token IDs and deterministic vanity contract addresses.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleExportCsv}
                className="px-4 py-2 rounded-xl bg-[#1E1E24] hover:bg-[#25252D] text-gray-200 border border-[#2B2B33] text-xs font-bold flex items-center gap-2 transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-orange-400" />
                Export CSV ({filteredEntries.length})
              </button>
            </div>
          </div>

          {/* 5 Key Action Pillars (as outlined in user prompt) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
            <div className="p-3.5 bg-[#101014] border border-[#22222B] rounded-xl space-y-1.5 hover:border-cyan-500/40 transition">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
                <Globe className="w-4 h-4" />
                <span>1. Inspect Code & Security</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-snug">
                Search addresses on Etherscan, Solscan, and BscScan to view verified Solidity source code and creator history.
              </p>
            </div>

            <div className="p-3.5 bg-[#101014] border border-[#22222B] rounded-xl space-y-1.5 hover:border-emerald-500/40 transition">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                <Activity className="w-4 h-4" />
                <span>2. Track Analytics & Metrics</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-snug">
                Inspect token liquidity, market cap, DEX trading volume, and real-time price charts on DexScreener & DEX Tools.
              </p>
            </div>

            <div className="p-3.5 bg-[#101014] border border-[#22222B] rounded-xl space-y-1.5 hover:border-amber-500/40 transition">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                <Zap className="w-4 h-4" />
                <span>3. Wallets & dApps</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-snug">
                Import custom ERC-20 / SPL tokens into MetaMask & Phantom, or execute write calls directly via Remix IDE.
              </p>
            </div>

            <div className="p-3.5 bg-[#101014] border border-[#22222B] rounded-xl space-y-1.5 hover:border-purple-500/40 transition">
              <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs">
                <Terminal className="w-4 h-4" />
                <span>4. Automate & Program SDKs</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-snug">
                Query contract state data and broadcast atomic transactions using ethers.js v6, web3.py, viem, or Foundry cast.
              </p>
            </div>

            <div className="p-3.5 bg-[#101014] border border-[#22222B] rounded-xl space-y-1.5 hover:border-rose-500/40 transition">
              <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>5. Verify Security Risks</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-snug">
                Scan contract bytecode for honeypots, hidden mint fees, unrenounced admin roles, and TokenSniffer compliance.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by 0x address, decimal UINT256 token ID, hex ID, or symbol..."
            className="w-full bg-[#0A0A0C] border border-[#262630] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400 font-medium">Vanity Filter:</span>
          {(
            [
              { id: "ALL", label: "All 49" },
              { id: "VANITY", label: "Vanity (3+ Zeros)" },
              { id: "EXTREME_10_PLUS", label: "Extreme (10+ Zeros)" },
              { id: "NULL", label: "Null Void (0x0)" },
            ] as const
          ).map((tier) => (
            <button
              key={tier.id}
              onClick={() => setFilterZeroTier(tier.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filterZeroTier === tier.id
                  ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                  : "bg-[#1E1E24] text-gray-300 hover:bg-[#25252D] hover:text-white border border-[#2B2B33]"
              }`}
            >
              {tier.label}
            </button>
          ))}
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2 font-mono animate-fadeIn">
          <Check className="w-4 h-4" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0D0D10] border-b border-[#1F1F23] text-gray-400 font-mono uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3 text-center w-12">#</th>
                <th className="py-3 px-4">Contract Address (0x)</th>
                <th className="py-3 px-4">UINT256 Token ID (Decimal & Hex)</th>
                <th className="py-3 px-3 text-center">Vanity Zeros</th>
                <th className="py-3 px-4">Token Identity</th>
                <th className="py-3 px-4">Direct Web3 Actions</th>
                <th className="py-3 px-4 text-center">SDK Snippet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F1F23] text-gray-300">
              {filteredEntries.map((entry) => (
                <tr
                  key={entry.index}
                  className="hover:bg-[#1E1E24]/60 transition cursor-pointer"
                  onClick={() => {
                    if (onSelectContractAddress) {
                      onSelectContractAddress(entry.contractAddress, entry.uint256TokenId);
                    }
                  }}
                >
                  {/* # */}
                  <td className="py-3 px-3 text-center text-gray-500 font-mono text-[11px]">
                    {entry.index}
                  </td>

                  {/* Contract Address */}
                  <td className="py-3 px-4 font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold text-xs select-all">
                        {entry.contractAddress.slice(0, 10)}...{entry.contractAddress.slice(-8)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(entry.contractAddress, `addr_${entry.index}`, "Contract Address");
                        }}
                        className="p-1 rounded hover:bg-[#25252D] text-gray-400 hover:text-white transition"
                        title="Copy full 42-char address"
                      >
                        {copiedKey === `addr_${entry.index}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <a
                        href={entry.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-orange-400 hover:text-orange-300 transition"
                        title="View on Etherscan"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      Net #{entry.networkId} ({entry.networkName})
                    </div>
                  </td>

                  {/* UINT256 Token ID */}
                  <td className="py-3 px-4 font-mono">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-orange-400 font-bold select-all text-xs" title={entry.uint256TokenId}>
                          {entry.uint256TokenId.length > 18
                            ? `${entry.uint256TokenId.slice(0, 10)}...${entry.uint256TokenId.slice(-6)}`
                            : entry.uint256TokenId}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(entry.uint256TokenId, `tid_${entry.index}`, "UINT256 ID");
                          }}
                          className="p-1 rounded hover:bg-[#25252D] text-gray-400 hover:text-white transition"
                          title="Copy full UINT256 decimal number"
                        >
                          {copiedKey === `tid_${entry.index}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <div className="text-[10px] text-cyan-400/80 truncate max-w-[190px]" title={`Hex: ${entry.hexTokenId}`}>
                        Hex: {entry.hexTokenId}
                      </div>
                    </div>
                  </td>

                  {/* Vanity Zeros */}
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        entry.leadingZeros >= 10
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          : entry.leadingZeros >= 4
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                          : entry.leadingZeros > 0
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-gray-800 text-gray-400"
                      }`}
                    >
                      {entry.leadingZeros} zeros
                    </span>
                  </td>

                  {/* Token Identity */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <span>{entry.tokenName}</span>
                      <span className="text-[10px] font-mono text-gray-400">({entry.tokenSymbol})</span>
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono">
                      {entry.standard}
                    </div>
                  </td>

                  {/* Direct Web3 Actions */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <a
                        href={entry.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-1 rounded bg-[#101014] hover:bg-[#1C1C24] border border-[#2B2B35] text-[11px] text-cyan-400 flex items-center gap-1 transition"
                        title="Etherscan verified code & tx history"
                      >
                        <Globe className="w-3 h-3" />
                        <span>Explorer</span>
                      </a>

                      <a
                        href={entry.dexScreenerUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-1 rounded bg-[#101014] hover:bg-[#1C1C24] border border-[#2B2B35] text-[11px] text-emerald-400 flex items-center gap-1 transition"
                        title="DexScreener liquidity & trading pairs"
                      >
                        <Activity className="w-3 h-3" />
                        <span>DexScreener</span>
                      </a>

                      <a
                        href={entry.tokenSnifferUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-1 rounded bg-[#101014] hover:bg-[#1C1C24] border border-[#2B2B35] text-[11px] text-rose-400 flex items-center gap-1 transition"
                        title="TokenSniffer honeypot & risk scan"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>Sniffer</span>
                      </a>
                    </div>
                  </td>

                  {/* SDK Snippet Modal Trigger */}
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveActionModal(entry);
                      }}
                      className="px-3 py-1 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/40 text-orange-300 font-semibold text-xs flex items-center gap-1.5 transition mx-auto cursor-pointer"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>SDK</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Code Snippet & Interactive Actions Modal */}
      {activeActionModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setActiveActionModal(null)}
        >
          <div
            className="bg-[#121216] border border-[#2D2D35] rounded-2xl w-full max-w-3xl overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 bg-[#0A0A0C] border-b border-[#1F1F23] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Developer SDK Interaction Pipeline</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                      UINT256 Engine
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400 font-mono mt-0.5 truncate max-w-xl">
                    {activeActionModal.contractAddress} • Token ID #{activeActionModal.uint256TokenId.slice(0, 10)}...
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveActionModal(null)}
                className="p-1.5 rounded-lg bg-[#16161A] hover:bg-[#1E1E24] text-gray-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {/* SDK Selection Tabs */}
            <div className="flex items-center gap-2 px-4 pt-3 border-b border-[#1F1F23] bg-[#0E0E12]">
              {(
                [
                  { id: "ethers_v6", label: "Ethers.js v6" },
                  { id: "web3_py", label: "Web3.py (Python)" },
                  { id: "viem", label: "Viem / Wagmi" },
                  { id: "cast", label: "Foundry Cast CLI" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedSdkTab(tab.id)}
                  className={`px-3 py-2 text-xs font-semibold border-b-2 transition cursor-pointer ${
                    selectedSdkTab === tab.id
                      ? "border-orange-500 text-orange-400"
                      : "border-transparent text-gray-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Code Body */}
            <div className="p-4 bg-[#0A0A0C] space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="font-mono">Ready-to-execute script:</span>
                <button
                  onClick={() => {
                    const snippet = generateSdkInteractionSnippet(
                      activeActionModal.contractAddress,
                      activeActionModal.uint256TokenId,
                      selectedSdkTab
                    );
                    copyToClipboard(snippet, "sdk_snippet", "SDK Script");
                  }}
                  className="px-3 py-1 rounded bg-[#1E1E24] hover:bg-[#25252D] text-orange-400 font-mono text-xs flex items-center gap-1.5 transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Script</span>
                </button>
              </div>

              <pre className="p-4 bg-[#141418] border border-[#22222B] rounded-xl font-mono text-xs text-emerald-300 leading-relaxed overflow-x-auto max-h-[380px]">
                {generateSdkInteractionSnippet(
                  activeActionModal.contractAddress,
                  activeActionModal.uint256TokenId,
                  selectedSdkTab
                )}
              </pre>

              {/* Action Buttons Bar */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <a
                    href={activeActionModal.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-lg bg-[#1E1E24] hover:bg-[#25252D] text-gray-200 border border-[#2B2B33] text-xs font-semibold flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-orange-400" />
                    <span>Open in Etherscan</span>
                  </a>

                  <a
                    href={activeActionModal.dexScreenerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-lg bg-[#1E1E24] hover:bg-[#25252D] text-gray-200 border border-[#2B2B33] text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Track Liquidity on DexScreener</span>
                  </a>
                </div>

                <button
                  onClick={() => {
                    if (onOpenBytecodeInspector) {
                      onOpenBytecodeInspector(activeActionModal.contractAddress);
                    }
                    setActiveActionModal(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-orange-500/20"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Inspect Bytecode Security</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
