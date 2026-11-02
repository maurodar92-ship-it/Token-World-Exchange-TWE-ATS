import { useState } from "react";
import { ChainType, GenerationConfig, NarrativeCategory, TokenStandard, TokenRecord } from "../types";
import { CHAIN_METADATA, NARRATIVE_METADATA_POOLS } from "../utils/marketData";
import {
  Play,
  Sparkles,
  Sliders,
  CheckCircle2,
  RotateCcw,
  Zap,
  Cpu,
  FileDown,
  Eye,
  Copy,
  Check,
  X,
  ShieldCheck,
} from "lucide-react";
import { downloadSanitizeDataCSV, generateSanitizeDataCSVString } from "../utils/csvExport";
import { CsvExportModal } from "./CsvExportModal";

interface BatchGeneratorProps {
  tokens?: TokenRecord[];
  onGenerate: (config: GenerationConfig) => void;
  onGenerate100?: () => void;
  onOpenTokenServiceManager?: () => void;
  isGenerating: boolean;
  lastGenerationTime: number | null;
  lastGeneratedCount: number;
  metaMaskDeployer?: string | null;
  isMetaMaskConnected?: boolean;
  onOpenMetaMaskSync?: () => void;
}

export const BatchGenerator = ({
  tokens = [],
  onGenerate,
  onGenerate100,
  onOpenTokenServiceManager,
  isGenerating,
  lastGenerationTime,
  lastGeneratedCount,
  metaMaskDeployer,
  isMetaMaskConnected,
  onOpenMetaMaskSync,
}: BatchGeneratorProps) => {
  const [count, setCount] = useState<number>(100);
  const [useMetaMaskDeployer, setUseMetaMaskDeployer] = useState<boolean>(true);
  const [selectedChains, setSelectedChains] = useState<ChainType[]>([
    "ethereum",
    "base",
    "arbitrum",
    "solana",
  ]);
  const [selectedNarratives, setSelectedNarratives] = useState<NarrativeCategory[]>([
    "ai_agents",
    "depin",
    "rwa",
    "quantum_defi",
  ]);
  const [selectedStandards, setSelectedStandards] = useState<TokenStandard[]>([
    "ERC-20",
    "ERC-721",
    "ERC-1155",
  ]);
  const [includeVanity, setIncludeVanity] = useState<boolean>(true);
  const [vanityPercentage, setVanityPercentage] = useState<number>(5);
  const [customVanityPrefix, setCustomVanityPrefix] = useState<string>("0x000");
  const [uint256Format, setUint256Format] = useState<"decimal" | "hex64">("decimal");
  const [eip55Checksum, setEip55Checksum] = useState<boolean>(true);
  const [simulatedMarketData, setSimulatedMarketData] = useState<boolean>(true);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [copiedCsv, setCopiedCsv] = useState<boolean>(false);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);

  const presetCounts = [50, 100, 250, 500, 1000];

  const handleExportSanitizeCsv = () => {
    if (!tokens || tokens.length === 0) return;
    const result = downloadSanitizeDataCSV(tokens, "token_input");
    setExportNotice(`Exported ${result.count.toLocaleString()} tokens to ${result.filename}!`);
    setTimeout(() => setExportNotice(null), 4000);
  };

  const handleCopySanitizeCsvText = () => {
    if (!tokens || tokens.length === 0) return;
    const csvText = generateSanitizeDataCSVString(tokens);
    navigator.clipboard.writeText(csvText);
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2000);
  };

  const toggleChain = (c: ChainType) => {
    if (selectedChains.includes(c)) {
      if (selectedChains.length > 1) {
        setSelectedChains(selectedChains.filter((x) => x !== c));
      }
    } else {
      setSelectedChains([...selectedChains, c]);
    }
  };

  const toggleNarrative = (n: NarrativeCategory) => {
    if (selectedNarratives.includes(n)) {
      if (selectedNarratives.length > 1) {
        setSelectedNarratives(selectedNarratives.filter((x) => x !== n));
      }
    } else {
      setSelectedNarratives([...selectedNarratives, n]);
    }
  };

  const toggleStandard = (s: TokenStandard) => {
    if (selectedStandards.includes(s)) {
      if (selectedStandards.length > 1) {
        setSelectedStandards(selectedStandards.filter((x) => x !== s));
      }
    } else {
      setSelectedStandards([...selectedStandards, s]);
    }
  };

  const handleRun = () => {
    onGenerate({
      count,
      chains: selectedChains,
      standards: selectedStandards,
      narratives: selectedNarratives,
      includeVanity,
      vanityPercentage,
      customVanityPrefix: includeVanity ? customVanityPrefix : "",
      uint256Format,
      eip55Checksum,
      simulatedMarketData,
      customDeployerAddress: useMetaMaskDeployer && metaMaskDeployer ? metaMaskDeployer : undefined,
    });
  };

  return (
    <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#1F1F23]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white tracking-tight uppercase">
              High-Volume Synthetic Foundry
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-green-500/10 text-green-500 border border-green-500/20 uppercase tracking-wider">
              PRNG Online
            </span>
          </div>
          <p className="text-xs text-[#8E9299] mt-0.5">
            Configure multi-chain contract schemas, 2026 narrative metadata, vanity prefixes, and token standard distributions.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {lastGenerationTime !== null && (
            <div className="text-right hidden sm:block">
              <span className="text-[11px] text-[#8E9299] font-mono">
                Generated {lastGeneratedCount.toLocaleString()} IDs in{" "}
                <span className="text-green-500 font-semibold">{lastGenerationTime.toFixed(1)}ms</span>
              </span>
            </div>
          )}

          {/* sanitize_data.py CSV Export Button */}
          <div className="flex items-center">
            <button
              id="btn-export-sanitize-csv"
              type="button"
              onClick={() => setShowPreviewModal(true)}
              disabled={!tokens || tokens.length === 0}
              className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg border text-xs font-mono font-medium transition-all active:scale-[0.98] ${
                tokens && tokens.length > 0
                  ? "bg-[#0E0E12] hover:bg-[#1A1A22] border-emerald-500/40 hover:border-emerald-500 text-white shadow-sm cursor-pointer"
                  : "bg-[#0A0A0C] border-[#1F1F23] text-[#6E7178] opacity-50 cursor-not-allowed"
              }`}
              title={
                tokens && tokens.length > 0
                  ? `Configure columns, preview, and export ${tokens.length} tokens to CSV`
                  : "Generate tokens to preview and export to CSV"
              }
            >
              <FileDown className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">Export CSV</span>
              <span className="text-[10px] text-[#8E9299] font-sans hidden sm:inline">(Preview & Select)</span>
              {tokens && tokens.length > 0 && (
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/10 text-emerald-300 font-mono font-bold border border-emerald-500/20">
                  {tokens.length}
                </span>
              )}
            </button>

            {tokens && tokens.length > 0 && (
              <button
                id="btn-preview-sanitize-csv"
                type="button"
                onClick={() => setShowPreviewModal(true)}
                className="ml-1 p-2 rounded-lg bg-[#0E0E12] hover:bg-[#1A1A22] border border-[#2F2F3D] hover:border-emerald-500/40 text-[#8E9299] hover:text-emerald-400 text-xs transition-colors cursor-pointer"
                title="Preview & customize columns before exporting to CSV"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {onOpenTokenServiceManager && (
            <button
              id="btn-open-token-service-manager"
              type="button"
              onClick={onOpenTokenServiceManager}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 font-mono font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98] cursor-pointer"
              title="Act as Token Service Manager: Generate Trillions supply, UINT256 max allowance tokens, and fullstack CREATE2 contracts"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Trillions &amp; UINT256 Service Manager</span>
            </button>
          )}

          {onGenerate100 && (
            <button
              id="btn-batch-generate-100-quick"
              type="button"
              onClick={onGenerate100}
              disabled={isGenerating}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#0A0A0C] hover:bg-[#1E1E24] border border-[#F27D26] text-[#F27D26] font-mono font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              title="Generate exactly 100 IDs and secure directly to Token Vault"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Generate 100 IDs</span>
            </button>
          )}

          <button
            id="btn-generate-batch"
            onClick={handleRun}
            disabled={isGenerating}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#F27D26] hover:bg-[#ff8e3c] text-black font-bold text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(242,125,38,0.25)] transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Cpu className="w-4 h-4 animate-spin text-black" />
                <span>Synthesizing...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>Generate {count.toLocaleString()} IDs</span>
              </>
            )}
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="mt-3 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between text-xs text-emerald-300 font-mono animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{exportNotice}</span>
            <span className="text-[11px] text-[#8E9299]">Ready for python3 sanitize_data.py ingestion</span>
          </div>
          <button
            type="button"
            onClick={() => setExportNotice(null)}
            className="text-[#8E9299] hover:text-white text-xs px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* MetaMask Deployer Integration Bar */}
      <div className="mt-4 p-3 bg-[#0E0E12] border border-[#23232C] rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#181820] border border-[#2F2F3D] flex items-center justify-center text-sm shadow-inner select-none">
            🦊
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">Deployer Synchronization:</span>
              {metaMaskDeployer ? (
                <span className="font-mono text-emerald-400 font-semibold truncate max-w-[180px] sm:max-w-[260px]" title={metaMaskDeployer}>
                  {metaMaskDeployer}
                </span>
              ) : (
                <span className="text-[#8E9299]">Standard Multi-Sig Enterprise Safe</span>
              )}
              {isMetaMaskConnected && (
                <span className="px-1.5 py-0.2 text-[9px] font-mono bg-green-500/10 text-green-400 border border-green-500/20 rounded">
                  Connected
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#8E9299]">
              {metaMaskDeployer
                ? useMetaMaskDeployer
                  ? "Newly generated tokens will assign this MetaMask address as deployer & owner."
                  : "MetaMask deployer disabled (using randomized enterprise deployers)."
                : "Connect MetaMask to sync your wallet address as the token deployer."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {metaMaskDeployer && (
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-300">
              <input
                type="checkbox"
                checked={useMetaMaskDeployer}
                onChange={(e) => setUseMetaMaskDeployer(e.target.checked)}
                className="accent-[#F27D26] w-3.5 h-3.5 rounded cursor-pointer"
              />
              <span>Use as Deployer</span>
            </label>
          )}

          {onOpenMetaMaskSync && (
            <button
              type="button"
              onClick={onOpenMetaMaskSync}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C1C24] hover:bg-[#282834] border border-[#333342] text-white font-medium text-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>🦊</span>
              <span>{isMetaMaskConnected ? "MetaMask Sync" : "Connect MetaMask"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 pt-5">
        {/* 1. Batch Size */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-[#E0E0E0] flex items-center justify-between">
            <span className="uppercase tracking-wider text-[11px] text-[#8E9299]">Batch Volume</span>
            <span className="font-mono text-[#F27D26] font-bold">{count.toLocaleString()} IDs</span>
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {presetCounts.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setCount(val)}
                className={`py-1.5 text-xs font-mono font-medium rounded border transition-all ${
                  count === val
                    ? "bg-[#0A0A0C] border-[#F27D26] text-white shadow-sm font-bold"
                    : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white hover:border-[#F27D26]/40"
                }`}
              >
                {val >= 1000 ? `${val / 1000}k` : val}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <input
              type="range"
              min={10}
              max={50000}
              step={50}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full h-1.5 bg-[#0A0A0C] rounded-lg appearance-none cursor-pointer accent-[#F27D26]"
            />
          </div>
        </div>

        {/* 2. Target Blockchains */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-[#E0E0E0] flex items-center justify-between">
            <span className="uppercase tracking-wider text-[11px] text-[#8E9299]">Target Blockchains</span>
            <span className="text-[10px] text-[#8E9299] font-mono">
              {selectedChains.length} selected
            </span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(CHAIN_METADATA) as ChainType[]).map((c) => {
              const active = selectedChains.includes(c);
              const meta = CHAIN_METADATA[c];
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleChain(c)}
                  className={`px-2.5 py-1 text-xs rounded border transition-all flex items-center gap-1.5 ${
                    active
                      ? "bg-[#0A0A0C] border-[#F27D26] text-white font-medium shadow-sm"
                      : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white hover:border-[#1F1F23]"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-[#F27D26]" : "bg-[#8E9299]"}`} />
                  <span>{meta.name.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. 2026 Narrative Taxonomy */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-[#E0E0E0] flex items-center justify-between">
            <span className="uppercase tracking-wider text-[11px] text-[#8E9299]">2026 Narratives</span>
            <span className="text-[10px] text-[#F27D26] font-mono font-medium">
              {selectedNarratives.length} Active
            </span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(NARRATIVE_METADATA_POOLS) as NarrativeCategory[]).map((n) => {
              const active = selectedNarratives.includes(n);
              const label =
                n === "ai_agents"
                  ? "AI Agents"
                  : n === "depin"
                  ? "DePIN"
                  : n === "rwa"
                  ? "RWA"
                  : n === "quantum_defi"
                  ? "Quantum DeFi"
                  : n === "liquid_restaking"
                  ? "Restaking"
                  : "Autonomous Worlds";
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => toggleNarrative(n)}
                  className={`px-2.5 py-1 text-xs rounded border transition-all ${
                    active
                      ? "bg-[#0A0A0C] border-[#F27D26] text-white font-medium"
                      : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Token Standards */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-[#E0E0E0] flex items-center justify-between">
            <span className="uppercase tracking-wider text-[11px] text-[#8E9299]">Standards & Mint IDs</span>
            <span className="text-[10px] text-cyan-400 font-mono">
              {selectedStandards.length} Types
            </span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {(["ERC-20", "ERC-721", "ERC-1155", "ERC-4337", "SPL-Token", "Quantum-Hybrid"] as TokenStandard[]).map(
              (s) => {
                const active = selectedStandards.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleStandard(s)}
                    className={`px-2.5 py-1 text-xs rounded border transition-all font-mono ${
                      active
                        ? "bg-[#0A0A0C] border-cyan-500/60 text-cyan-300 font-medium"
                        : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                    }`}
                  >
                    {s}
                  </button>
                );
              }
            )}
          </div>
        </div>
      </div>

      {/* Advanced Drawer / Vanity Settings */}
      <div className="mt-4 pt-4 border-t border-[#1F1F23]">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-xs text-[#8E9299] hover:text-[#F27D26] transition-colors font-medium cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-[#F27D26]" />
            <span>
              {showAdvanced ? "Hide Advanced & Vanity Settings" : "Show Advanced & Vanity Address Settings"}
            </span>
          </button>

          <div className="flex items-center gap-3 text-xs text-[#8E9299]">
            <span className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              EIP-55 Checksum: {eip55Checksum ? "Enabled" : "Raw Lowercase"}
            </span>
          </div>
        </div>

        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 p-4 rounded-lg bg-[#0A0A0C] border border-[#1F1F23]">
            {/* Vanity Addresses Configuration */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#E0E0E0] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#F27D26]" />
                  <span>Vanity Address Generator</span>
                </label>
                <input
                  type="checkbox"
                  checked={includeVanity}
                  onChange={(e) => setIncludeVanity(e.target.checked)}
                  className="rounded border-[#1F1F23] text-[#F27D26] focus:ring-[#F27D26] bg-[#16161A]"
                />
              </div>

              {includeVanity && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs text-[#8E9299]">
                    <span>Vanity Frequency</span>
                    <span className="font-mono text-[#F27D26] font-bold">{vanityPercentage}% of batch</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={25}
                    value={vanityPercentage}
                    onChange={(e) => setVanityPercentage(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#16161A] rounded-lg appearance-none cursor-pointer accent-[#F27D26]"
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] text-[#8E9299]">Prefix:</span>
                    {["0x000", "0xACE", "0xDEFI", "0x777", "0xDEAD"].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setCustomVanityPrefix(p)}
                        className={`px-1.5 py-0.5 text-[10px] font-mono rounded border ${
                          customVanityPrefix === p
                            ? "bg-[#16161A] border-[#F27D26] text-[#F27D26] font-bold"
                            : "bg-[#16161A] border-[#1F1F23] text-[#8E9299] hover:text-white"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* uint256 Formatting & Standards */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#E0E0E0]">
                uint256 Token ID Formatting
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setUint256Format("decimal")}
                  className={`p-2 rounded border text-left text-xs transition-all ${
                    uint256Format === "decimal"
                      ? "bg-[#16161A] border-[#F27D26] text-white"
                      : "bg-[#16161A] border-[#1F1F23] text-[#8E9299]"
                  }`}
                >
                  <p className="font-semibold text-xs">BigInt Decimal</p>
                  <p className="text-[10px] text-[#8E9299] font-mono truncate">18294729104...</p>
                </button>
                <button
                  type="button"
                  onClick={() => setUint256Format("hex64")}
                  className={`p-2 rounded border text-left text-xs transition-all ${
                    uint256Format === "hex64"
                      ? "bg-[#16161A] border-[#F27D26] text-white"
                      : "bg-[#16161A] border-[#1F1F23] text-[#8E9299]"
                  }`}
                >
                  <p className="font-semibold text-xs">64-Char Hex (NFT)</p>
                  <p className="text-[10px] text-[#8E9299] font-mono truncate">0x000...1a3f</p>
                </button>
              </div>
            </div>

            {/* Cryptographic Compliance */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#E0E0E0]">
                Cryptographic Encoding
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-[#E0E0E0] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={eip55Checksum}
                    onChange={(e) => setEip55Checksum(e.target.checked)}
                    className="rounded border-[#1F1F23] text-[#F27D26] focus:ring-[#F27D26] bg-[#16161A]"
                  />
                  <span>EIP-55 Mixed-Case Checksumming</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-[#E0E0E0] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simulatedMarketData}
                    onChange={(e) => setSimulatedMarketData(e.target.checked)}
                    className="rounded border-[#1F1F23] text-[#F27D26] focus:ring-[#F27D26] bg-[#16161A]"
                  />
                  <span>Market Sim (Status, Liquidity, Audits)</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Customizable CSV Export Modal with column selection and token selection preview */}
      <CsvExportModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        tokens={tokens || []}
        onExportSuccess={(info) => {
          setExportNotice(`Exported ${info.count.toLocaleString()} tokens to ${info.filename}!`);
          setTimeout(() => setExportNotice(null), 4000);
        }}
      />
    </div>
  );
};
