import { useState } from "react";
import { TokenRecord } from "../types";
import { CHAIN_METADATA, CHAIN_NETWORK_MAP, NARRATIVE_METADATA_POOLS } from "../utils/marketData";
import {
  generateTokenNFTMetadata,
  computeSimulatedDeploymentStats,
  NFTMarketplaceMetadata,
} from "../utils/nftMetadataGenerator";
import { OFFICIAL_CRYPTOVAULTVAULT_GENESIS_METADATA } from "../utils/contractIdEngines";
import {
  X,
  Copy,
  Check,
  Download,
  FileJson,
  ExternalLink,
  ShieldCheck,
  Gauge,
  Layers,
  Sparkles,
  Cpu,
  CheckCircle2,
  Share2,
} from "lucide-react";

interface NFTMetadataModalProps {
  token: TokenRecord | null;
  onClose: () => void;
}

export const NFTMetadataModal = ({ token, onClose }: NFTMetadataModalProps) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"visual_preview" | "raw_json" | "attributes_matrix">(
    "visual_preview"
  );
  const [viewGenesisPreset, setViewGenesisPreset] = useState<boolean>(false);

  if (!token) return null;

  const isCvltx = token.symbol === "CVLTX" || token.name === "CryptoVaultVault" || viewGenesisPreset;

  const chainMeta = isCvltx ? CHAIN_METADATA.base : (CHAIN_METADATA[token.chain] || CHAIN_METADATA.ethereum);
  const networkId = isCvltx ? 8453 : (CHAIN_NETWORK_MAP[token.chain] || 1);
  const narrativeInfo = isCvltx
    ? { label: "Quantum-Resistant DeFi", description: "Institutional cryptographic vault deployed to Base." }
    : (NARRATIVE_METADATA_POOLS[token.narrative] || {
        label: "Emerging Web3 Paradigm",
        description: "Decentralized cryptographic protocol.",
      });

  const metadata: NFTMarketplaceMetadata = isCvltx
    ? (OFFICIAL_CRYPTOVAULTVAULT_GENESIS_METADATA as unknown as NFTMarketplaceMetadata)
    : generateTokenNFTMetadata(token);
  const jsonString = JSON.stringify(metadata, null, 2);
  const stats = isCvltx
    ? {
        bytecodeSize: 11450,
        totalGasUnits: 4589000,
        nativeCostFormatted: "0.000041 ETH",
        usdCostFormatted: 0.13,
        overallSuccessRate: 89.2,
        mempoolClearance: 97.7,
        codeSizeSafety: 72,
        blockGasSafety: 99.2,
      }
    : computeSimulatedDeploymentStats(token);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${token.symbol.toLowerCase()}_nft_metadata.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#1F1F23] flex items-center justify-between bg-[#0A0A0C]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#00F0FF]">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white tracking-tight">NFT Marketplace Metadata</h3>
                <span className="text-xs font-mono text-[#8E9299]">
                  {token.name} ({token.symbol})
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold">
                  OpenSea & ERC-721/1155 Ready
                </span>
              </div>
              <p className="text-xs text-[#8E9299] font-mono mt-0.5">
                Intended Chain: {chainMeta.name} • Standard: {token.tokenStandard} • Net #{networkId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewGenesisPreset((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                viewGenesisPreset
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                  : "bg-[#16161A] text-[#8E9299] hover:text-white border-[#1F1F23]"
              }`}
              title="Toggle Official CryptoVaultVault (CVLTX) Genesis Profile"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F27D26]" />
              <span className="hidden sm:inline">{viewGenesisPreset ? "Viewing CVLTX #3" : "Load CVLTX #3 Genesis"}</span>
            </button>

            <button
              type="button"
              onClick={() => handleCopy(jsonString, "header_json")}
              className="px-3 py-1.5 rounded-lg bg-[#16161A] hover:bg-[#1E1E24] border border-[#1F1F23] text-white flex items-center gap-1.5 text-xs font-mono transition-all cursor-pointer"
              title="Copy JSON Payload"
            >
              {copiedKey === "header_json" ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[#8E9299]" />
              )}
              <span className="hidden sm:inline">Copy JSON</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg bg-[#F27D26] hover:bg-[#ff8e3c] text-black font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Download metadata.json"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download JSON</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#1F1F23] text-[#8E9299] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 border-b border-[#1F1F23] flex items-center gap-6 bg-[#0E0E10]">
          <button
            type="button"
            onClick={() => setActiveTab("visual_preview")}
            className={`pb-2.5 px-2 text-xs font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === "visual_preview"
                ? "border-[#00F0FF] text-[#00F0FF] font-bold"
                : "border-transparent text-[#8E9299] hover:text-white"
            }`}
          >
            Marketplace Card & Stats Preview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("attributes_matrix")}
            className={`pb-2.5 px-2 text-xs font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === "attributes_matrix"
                ? "border-[#00F0FF] text-[#00F0FF] font-bold"
                : "border-transparent text-[#8E9299] hover:text-white"
            }`}
          >
            Traits & Attributes Matrix ({metadata.attributes.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("raw_json")}
            className={`pb-2.5 px-2 text-xs font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === "raw_json"
                ? "border-[#00F0FF] text-[#00F0FF] font-bold"
                : "border-transparent text-[#8E9299] hover:text-white"
            }`}
          >
            Raw JSON Specification
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* TAB 1: VISUAL MARKETPLACE PREVIEW */}
          {activeTab === "visual_preview" && (
            <div className="space-y-6">
              {/* Top Highlights Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-3">
                  <span className="text-[10px] text-[#8E9299] font-mono uppercase block">
                    Intended Blockchain
                  </span>
                  <div className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    <span>{chainMeta.name}</span>
                  </div>
                  <span className="text-[10px] text-[#8E9299] font-mono">Chain ID: {networkId}</span>
                </div>

                <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-3">
                  <span className="text-[10px] text-[#8E9299] font-mono uppercase block">
                    Contract Standard
                  </span>
                  <div className="text-sm font-bold text-[#F27D26] mt-1 font-mono">
                    {token.tokenStandard}
                  </div>
                  <span className="text-[10px] text-[#8E9299] font-mono">
                    {token.decimals} Decimals
                  </span>
                </div>

                <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-3">
                  <span className="text-[10px] text-[#8E9299] font-mono uppercase block">
                    Simulated Deployment Gas
                  </span>
                  <div className="text-sm font-bold text-white mt-1 font-mono">
                    {stats.totalGasUnits.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-green-400 font-mono">
                    ~{stats.nativeCostFormatted} (${stats.usdCostFormatted})
                  </span>
                </div>

                <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-3">
                  <span className="text-[10px] text-[#8E9299] font-mono uppercase block">
                    Simulation Success Rate
                  </span>
                  <div className="text-sm font-bold text-emerald-400 mt-1 font-mono flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5" />
                    <span>{stats.overallSuccessRate}%</span>
                  </div>
                  <span className="text-[10px] text-[#8E9299] font-mono">
                    EIP-170 Code Size: {stats.bytecodeSize}B
                  </span>
                </div>
              </div>

              {/* 2-Column Layout: Left Card Preview, Right Metadata Details */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Left: OpenSea Style Marketplace Card */}
                <div className="md:col-span-5 bg-[#0A0A0C] border border-[#1F1F23] rounded-xl overflow-hidden shadow-lg flex flex-col">
                  {/* Card Media Preview */}
                  <div className="relative aspect-square bg-[#06080E] border-b border-[#1F1F23] flex items-center justify-center p-4 group">
                    <img
                      src={metadata.image}
                      alt={metadata.name}
                      className="w-full h-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                    <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-mono text-white border border-[#1F1F23]">
                      #{token.tokenId.slice(-4) || "0001"}
                    </span>
                    <span className="absolute top-3 right-3 px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold">
                      {token.tokenStandard}
                    </span>
                  </div>

                  {/* Card Meta Info */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-[#8E9299]">
                        <span>Web3 Contract ID Foundry</span>
                        <span className="text-green-400 font-mono flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-1">{metadata.name}</h4>
                      <p className="text-[11px] text-[#8E9299] font-mono mt-1 truncate">
                        {token.contractAddress}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#1F1F23] flex items-center justify-between text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-[#8E9299] block">Simulated Floor / Est</span>
                        <span className="text-white font-bold">${token.priceUsd.toFixed(4)} USD</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-[#8E9299] block">Success Probability</span>
                        <span className="text-emerald-400 font-bold">{stats.overallSuccessRate}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Technical Schema Breakdown & Description */}
                <div className="md:col-span-7 space-y-4">
                  {/* Schema Summary Card */}
                  <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                        Marketplace Description
                      </span>
                      <span className="text-[10px] text-cyan-400 font-mono">Markdown Supported</span>
                    </div>
                    <p className="text-xs text-[#8E9299] leading-relaxed whitespace-pre-line bg-[#16161A] p-3 rounded-lg border border-[#1F1F23]">
                      {metadata.description}
                    </p>
                  </div>

                  {/* Deployment Simulation Properties */}
                  <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-xl p-4 space-y-3">
                    <span className="text-xs font-bold text-white uppercase tracking-wider font-mono block">
                      Simulated Deployment Properties
                    </span>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div className="bg-[#16161A] p-2.5 rounded border border-[#1F1F23]">
                        <span className="text-[#8E9299] block text-[10px]">TOTAL GAS UNITS</span>
                        <span className="text-white font-bold text-xs">
                          {stats.totalGasUnits.toLocaleString()} units
                        </span>
                      </div>

                      <div className="bg-[#16161A] p-2.5 rounded border border-[#1F1F23]">
                        <span className="text-[#8E9299] block text-[10px]">ESTIMATED TX COST</span>
                        <span className="text-green-400 font-bold text-xs">
                          {stats.nativeCostFormatted} (~${stats.usdCostFormatted})
                        </span>
                      </div>

                      <div className="bg-[#16161A] p-2.5 rounded border border-[#1F1F23]">
                        <span className="text-[#8E9299] block text-[10px]">EIP-170 BYTECODE SIZE</span>
                        <span className="text-white font-bold text-xs">
                          {stats.bytecodeSize} / 24,576 bytes
                        </span>
                      </div>

                      <div className="bg-[#16161A] p-2.5 rounded border border-[#1F1F23]">
                        <span className="text-[#8E9299] block text-[10px]">MEMPOOL CLEARANCE</span>
                        <span className="text-cyan-300 font-bold text-xs">
                          {stats.mempoolClearance}% probability
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contract Architecture Metadata */}
                  <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-xl p-4 space-y-2 font-mono text-[11px]">
                    <div className="flex justify-between py-1 border-b border-[#1F1F23]">
                      <span className="text-[#8E9299]">External URL:</span>
                      <a
                        href={metadata.external_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:underline flex items-center gap-1"
                      >
                        <span>View on Explorer</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#1F1F23]">
                      <span className="text-[#8E9299]">Deployer Signer:</span>
                      <span className="text-white">{token.deployerAddress.slice(0, 10)}...{token.deployerAddress.slice(-6)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-[#8E9299]">Solidity Compiler Target:</span>
                      <span className="text-white">v0.8.24+commit.e11b9ed9 (cancun)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ATTRIBUTES MATRIX */}
          {activeTab === "attributes_matrix" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">OpenSea Attributes / Traits Specification</h4>
                  <p className="text-xs text-[#8E9299] mt-0.5">
                    Standard key-value traits ingested by secondary marketplaces to generate rarity filters and stat bars.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(JSON.stringify(metadata.attributes, null, 2), "traits_json")}
                  className="px-3 py-1 rounded bg-[#0A0A0C] hover:bg-[#1E1E24] border border-[#1F1F23] text-white flex items-center gap-1 font-mono text-xs cursor-pointer"
                >
                  {copiedKey === "traits_json" ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[#8E9299]" />
                  )}
                  <span>Copy Attributes Array</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 font-mono">
                {metadata.attributes.map((attr, idx) => {
                  const isScore = typeof attr.value === "number" && attr.max_value;
                  return (
                    <div
                      key={idx}
                      className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-3.5 space-y-1.5 hover:border-cyan-500/40 transition-colors"
                    >
                      <span className="text-[10px] text-cyan-400 uppercase font-semibold block tracking-wider truncate">
                        {attr.trait_type}
                      </span>
                      <div className="text-sm font-bold text-white truncate">
                        {attr.display_type === "date"
                          ? new Date(Number(attr.value) * 1000).toLocaleDateString()
                          : String(attr.value)}
                        {attr.max_value && (
                          <span className="text-xs text-[#8E9299] font-normal"> / {attr.max_value}</span>
                        )}
                      </div>

                      {/* Optional progress bar for rated score metrics */}
                      {isScore && (
                        <div className="w-full bg-[#16161A] h-1.5 rounded-full overflow-hidden mt-1">
                          <div
                            className="bg-cyan-400 h-full rounded-full"
                            style={{ width: `${(Number(attr.value) / (attr.max_value || 100)) * 100}%` }}
                          />
                        </div>
                      )}

                      {attr.display_type && (
                        <span className="text-[9px] text-[#8E9299] block">
                          Display Type: {attr.display_type}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: RAW JSON CODE VIEWER */}
          {activeTab === "raw_json" && (
            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between bg-[#0A0A0C] p-3 rounded-lg border border-[#1F1F23]">
                <div className="flex items-center gap-2">
                  <span className="text-[#8E9299]">File Name:</span>
                  <span className="text-white font-bold">{token.symbol.toLowerCase()}_nft_metadata.json</span>
                  <span className="text-[#8E9299] text-[10px]">({(jsonString.length / 1024).toFixed(2)} KB)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(jsonString, "raw_json_code")}
                    className="px-2.5 py-1 rounded bg-[#16161A] hover:bg-[#1E1E24] border border-[#1F1F23] text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === "raw_json_code" ? (
                      <Check className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-[#8E9299]" />
                    )}
                    <span>Copy JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="px-2.5 py-1 rounded bg-[#F27D26] hover:bg-[#ff8e3c] text-black font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              <pre className="p-4 bg-[#0A0A0C] border border-[#1F1F23] rounded-lg overflow-x-auto text-[11px] leading-relaxed text-[#D4D4D4] max-h-[500px] overflow-y-auto">
                <code>{jsonString}</code>
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#0A0A0C] border-t border-[#1F1F23] flex items-center justify-between text-xs text-[#8E9299] font-mono">
          <div className="flex items-center gap-2">
            <span>Schema: ERC-721 / ERC-1155 Metadata URI</span>
            <span>•</span>
            <span className="text-cyan-400">IPFS / Arweave / HTTP Compatible</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded bg-[#16161A] hover:bg-[#1E1E24] border border-[#1F1F23] text-white font-medium transition-colors cursor-pointer"
          >
            Close Metadata Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
