import React, { useState, useMemo } from "react";
import {
  FullstackContractSpecification,
  FullstackContractType,
  AllowanceTier,
  ALLOWANCE_CONFIGS,
  generateFullstackContractSpec,
  convertSpecToTokenRecord,
  generateTrillionsAndUint256Batch,
  UINT256_MAX_ALLOWANCE,
} from "../utils/fullstackContractAddressEngine";
import { UINT256_CONTRACT_ADDRESS_DATASET } from "../data/uint256ContractAddressData";
import { TokenRecord, ChainType } from "../types";
import {
  Cpu,
  Zap,
  Globe,
  Binary,
  ShieldCheck,
  Code2,
  Copy,
  Check,
  Download,
  Terminal,
  Sparkles,
  Layers,
  ArrowRight,
  Database,
  ExternalLink,
  Coins,
  Scale,
  Activity,
} from "lucide-react";

interface Props {
  onAddTokens?: (tokens: TokenRecord[]) => void;
  onSelectToken?: (token: TokenRecord) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const FullstackTokenServiceManagerModal: React.FC<Props> = ({
  onAddTokens,
  onSelectToken,
  onNavigateToTab,
}) => {
  const [selectedChain, setSelectedChain] = useState<ChainType>("ethereum");
  const [selectedAllowanceTier, setSelectedAllowanceTier] = useState<AllowanceTier>("UINT256_MAX");
  const [selectedContractType, setSelectedContractType] = useState<FullstackContractType>("ERC20_TRILLION_SUPPLY");
  const [batchCount, setBatchCount] = useState<number>(49);
  const [useVerified49Addresses, setUseVerified49Addresses] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Active inspected specification preview
  const [inspectedSpec, setInspectedSpec] = useState<FullstackContractSpecification>(() =>
    generateFullstackContractSpec({
      contractType: "ERC20_TRILLION_SUPPLY",
      allowanceTier: "UINT256_MAX",
      chain: "ethereum",
      index: 1,
      useDatasetAddress: true,
    })
  );

  const [activeCodeTab, setActiveCodeTab] = useState<"solidity" | "spec" | "cli">("solidity");

  const handleRegenerateSpec = (idx: number = 1) => {
    const spec = generateFullstackContractSpec({
      contractType: selectedContractType,
      allowanceTier: selectedAllowanceTier,
      chain: selectedChain,
      index: idx,
      useDatasetAddress: useVerified49Addresses,
    });
    setInspectedSpec(spec);
  };

  const handleGenerateAndInjectBatch = () => {
    const tokens = generateTrillionsAndUint256Batch(
      batchCount,
      selectedAllowanceTier,
      selectedChain
    );
    if (onAddTokens) {
      onAddTokens(tokens);
    }
    setSuccessNotice(`Successfully synthesized and injected ${tokens.length} Trillion & UINT256 Explorer tokens into Token Foundry & Vault!`);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="bg-[#121216] border border-[#1F1F23] rounded-2xl p-6 shadow-2xl relative overflow-hidden space-y-6">
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-1 font-mono">
              <Cpu className="w-3.5 h-3.5" />
              Token Service Manager
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30 font-mono">
              Trillions & UINT256 Max Allowance
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
              Fullstack CREATE2 Generator
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-white">
            Fullstack Smart Contract Address & Token Architecture Generator
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 max-w-3xl mt-1 leading-relaxed">
            Generate different kinds of tokens with <strong>Trillions supply</strong>, <strong>UINT256 explorer maximum allowances</strong> (2^256 - 1),
            and deterministic <strong>CREATE2 fullstack contract addresses</strong> paired with the 49 verified on-chain addresses.
          </p>
        </div>

        <button
          onClick={handleGenerateAndInjectBatch}
          className="px-5 py-2.5 rounded-xl bg-[#F27D26] hover:bg-[#ff8e3c] text-black font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-orange-500/20 shrink-0 cursor-pointer"
        >
          <Zap className="w-4 h-4 fill-black" />
          <span>Generate & Inject {batchCount} Tokens</span>
        </button>
      </div>

      {successNotice && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2 font-mono animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Control Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-[#0A0A0C] border border-[#1C1C22] rounded-xl">
        {/* 1. Allowance Tier */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-cyan-400" />
            Allowance / Supply Tier
          </label>
          <select
            value={selectedAllowanceTier}
            onChange={(e) => {
              const tier = e.target.value as AllowanceTier;
              setSelectedAllowanceTier(tier);
              handleRegenerateSpec();
            }}
            className="w-full bg-[#141418] border border-[#2B2B33] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
          >
            {(Object.keys(ALLOWANCE_CONFIGS) as AllowanceTier[]).map((tier) => (
              <option key={tier} value={tier}>
                {ALLOWANCE_CONFIGS[tier].label}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-gray-500 mt-1 truncate">
            {ALLOWANCE_CONFIGS[selectedAllowanceTier].description}
          </p>
        </div>

        {/* 2. Token Architecture / Contract Type */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-orange-400" />
            Token Standard & Architecture
          </label>
          <select
            value={selectedContractType}
            onChange={(e) => {
              const ctype = e.target.value as FullstackContractType;
              setSelectedContractType(ctype);
              handleRegenerateSpec();
            }}
            className="w-full bg-[#141418] border border-[#2B2B33] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-400 font-mono"
          >
            <option value="ERC20_TRILLION_SUPPLY">ERC-20 Trillion Supply Sovereign</option>
            <option value="ERC20_UNLIMITED_ALLOWANCE">ERC-20 Unlimited UINT256 Allowance</option>
            <option value="ERC4626_TRILLION_VAULT">ERC-4626 Tokenized Vault Standard</option>
            <option value="TRANSPARENT_UPGRADEABLE_PROXY">EIP-1967 Upgradeable Proxy Beacon</option>
            <option value="CREATE2_DETERMINISTIC_FACTORY">CREATE2 Deterministic Factory Core</option>
            <option value="ERC721_UINT256_NFT">ERC-721 High-Entropy NFT Standard</option>
          </select>
          <p className="text-[10px] text-gray-500 mt-1">Fullstack compilation and deployment architecture</p>
        </div>

        {/* 3. Target Blockchain */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            Blockchain Deployment Network
          </label>
          <select
            value={selectedChain}
            onChange={(e) => {
              const chain = e.target.value as ChainType;
              setSelectedChain(chain);
              handleRegenerateSpec();
            }}
            className="w-full bg-[#141418] border border-[#2B2B33] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
          >
            <option value="ethereum">Ethereum Mainnet (Chain ID 1)</option>
            <option value="base">Base Ecosystem (Chain ID 8453)</option>
            <option value="arbitrum">Arbitrum One (Chain ID 42161)</option>
            <option value="polygon">Polygon POS (Chain ID 137)</option>
            <option value="quantum">Quantum Lattice L1</option>
          </select>
          <p className="text-[10px] text-gray-500 mt-1">EVM targets supporting EIP-1153 & CREATE2</p>
        </div>

        {/* 4. Batch Count & Verified 49 Toggle */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
            <Binary className="w-3.5 h-3.5 text-purple-400" />
            Dataset Addresses Mode
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const next = !useVerified49Addresses;
                setUseVerified49Addresses(next);
                handleRegenerateSpec();
              }}
              className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                useVerified49Addresses
                  ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                  : "bg-[#141418] border-[#2B2B33] text-gray-400"
              }`}
            >
              {useVerified49Addresses ? "49 Verified Dataset" : "Random CREATE2"}
            </button>

            <select
              value={batchCount}
              onChange={(e) => setBatchCount(Number(e.target.value))}
              className="bg-[#141418] border border-[#2B2B33] rounded-xl px-2.5 py-2 text-xs text-white font-mono focus:outline-none"
            >
              <option value="49">49 IDs</option>
              <option value="100">100 IDs</option>
              <option value="256">256 (2⁸)</option>
              <option value="500">500 IDs</option>
              <option value="1000">1,000 IDs</option>
            </select>
          </div>
          <p className="text-[10px] text-gray-500 mt-1">
            {useVerified49Addresses ? "Using the 49 verified EVM contract addresses" : "Deriving fresh CREATE2 salts"}
          </p>
        </div>
      </div>

      {/* Inspected Specification Details Card */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#23232A]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 font-mono">
                <span className="font-bold text-white text-sm">{inspectedSpec.name}</span>
                <span className="text-xs text-orange-400">({inspectedSpec.symbol})</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  {inspectedSpec.allowanceTier}
                </span>
              </div>
              <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                Contract Address: <span className="text-emerald-400">{inspectedSpec.contractAddress}</span> • ({inspectedSpec.vanityZeros} leading zeros)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRegenerateSpec(Math.floor(Math.random() * 49) + 1)}
              className="px-3 py-1.5 rounded-lg bg-[#1E1E24] hover:bg-[#25252D] text-gray-300 border border-[#2B2B33] text-xs font-semibold transition cursor-pointer"
            >
              Shuffle Next Asset
            </button>
          </div>
        </div>

        {/* 4 Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3 bg-[#0A0A0C] border border-[#222228] rounded-xl">
            <span className="text-[10px] text-gray-500">MAXIMUM ALLOWANCE:</span>
            <div className="text-cyan-400 font-bold truncate text-xs mt-0.5" title={inspectedSpec.allowanceValue}>
              {inspectedSpec.allowanceTier === "UINT256_MAX" ? "2^256 - 1 (Unlimited)" : inspectedSpec.allowanceValue.slice(0, 14) + "..."}
            </div>
          </div>

          <div className="p-3 bg-[#0A0A0C] border border-[#222228] rounded-xl">
            <span className="text-[10px] text-gray-500">INITIAL TOKEN SUPPLY:</span>
            <div className="text-emerald-400 font-bold text-xs mt-0.5 truncate">
              {inspectedSpec.initialSupply}
            </div>
          </div>

          <div className="p-3 bg-[#0A0A0C] border border-[#222228] rounded-xl">
            <span className="text-[10px] text-gray-500">UINT256 TOKEN ID:</span>
            <div className="text-orange-400 font-bold truncate text-xs mt-0.5" title={inspectedSpec.uint256TokenId}>
              #{inspectedSpec.uint256TokenId.slice(0, 10)}...
            </div>
          </div>

          <div className="p-3 bg-[#0A0A0C] border border-[#222228] rounded-xl">
            <span className="text-[10px] text-gray-500">SOVEREIGN MARKET CAP:</span>
            <div className="text-white font-bold text-xs mt-0.5">
              ${(inspectedSpec.marketCap / 1e12).toFixed(2)} Trillion USD
            </div>
          </div>
        </div>

        {/* Code Tabs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-[#23232A] pb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveCodeTab("solidity")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold font-mono transition cursor-pointer ${
                  activeCodeTab === "solidity"
                    ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Solidity 0.8.28 Contract
              </button>
              <button
                onClick={() => setActiveCodeTab("spec")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold font-mono transition cursor-pointer ${
                  activeCodeTab === "spec"
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                CREATE2 Deployment Spec
              </button>
              <button
                onClick={() => setActiveCodeTab("cli")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold font-mono transition cursor-pointer ${
                  activeCodeTab === "cli"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Foundry Cast CLI Commands
              </button>
            </div>

            <button
              onClick={() => {
                const text =
                  activeCodeTab === "solidity"
                    ? inspectedSpec.solidityTemplate
                    : activeCodeTab === "spec"
                    ? JSON.stringify(inspectedSpec, null, 2)
                    : `cast send ${inspectedSpec.contractAddress} "setMaximumAllowance(address)" 0xUniswapV3Router --rpc-url https://cloudflare-eth.com`;
                copyToClipboard(text, "code_view");
              }}
              className="text-xs font-mono text-gray-400 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
            >
              {copiedKey === "code_view" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === "code_view" ? "Copied" : "Copy Code"}</span>
            </button>
          </div>

          <pre className="p-4 bg-[#0A0A0C] border border-[#222228] rounded-xl font-mono text-xs text-emerald-300 leading-relaxed overflow-x-auto max-h-[260px]">
            {activeCodeTab === "solidity"
              ? inspectedSpec.solidityTemplate
              : activeCodeTab === "spec"
              ? JSON.stringify(inspectedSpec, null, 2)
              : `# 1. Query Max Allowance Constant on Contract
cast call ${inspectedSpec.contractAddress} "MAX_ALLOWANCE()(uint256)" --rpc-url https://cloudflare-eth.com

# 2. Approve Unlimited UINT256 Allowance to Spender (e.g. Uniswap Router)
cast send ${inspectedSpec.contractAddress} "approve(address,uint256)" 0xE592427A0AEce92De3Edee1F18E0157C05861564 ${UINT256_MAX_ALLOWANCE} --rpc-url https://cloudflare-eth.com --private-key $PRIVATE_KEY

# 3. Verify Deployed Contract Code
cast code ${inspectedSpec.contractAddress} --rpc-url https://cloudflare-eth.com`}
          </pre>
        </div>
      </div>
    </div>
  );
};
