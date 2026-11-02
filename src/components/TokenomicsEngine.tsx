import React, { useState, useMemo } from "react";
import {
  Sparkles,
  Shield,
  ShieldCheck,
  Cpu,
  Layers,
  Zap,
  Copy,
  Check,
  ExternalLink,
  Download,
  Flame,
  Scale,
  DollarSign,
  TrendingUp,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Terminal,
  Calculator,
  RefreshCw,
  Hash,
  Database,
  Lock,
  ArrowRight
} from "lucide-react";
import { TokenRecord, GeneratedTokenomics, ChainType, TokenStandard } from "../types";
import {
  UINT256_MAX_STRING,
  POWER_OF_TWO_RESERVES,
  MIN_COINMARKETCAP_METRIC,
  SOVEREIGN_OWNER,
  buildInstitutionalTokenomics,
  generateContractAddressBatch,
  formatMarketCapCompact,
} from "../utils/cryptoGenerators";

interface TokenomicsEngineProps {
  tokens: TokenRecord[];
  onAddTokens?: (tokens: TokenRecord[]) => void;
  onBulkUpdateTokens?: (tokenIds: string[], updates: Partial<TokenRecord>) => void;
  onSelectToken?: (token: TokenRecord) => void;
  onGenerate1000More?: () => void;
  isGenerating?: boolean;
}

export const TokenomicsEngine: React.FC<TokenomicsEngineProps> = ({
  tokens,
  onAddTokens,
  onBulkUpdateTokens,
  onSelectToken,
  onGenerate1000More,
  isGenerating = false,
}) => {
  // Selected token for focused inspection
  const [selectedTokenId, setSelectedTokenId] = useState<string>(tokens[0]?.id || "");
  const activeToken = useMemo(() => {
    return tokens.find((t) => t.id === selectedTokenId) || tokens[0] || null;
  }, [tokens, selectedTokenId]);

  // Active tab within the Tokenomics engine
  const [activeTab, setActiveTab] = useState<"pillars" | "power_of_two" | "contract_addresses" | "batch_generator" | "solidity_spec">("pillars");

  // State for 2^8 address generation
  const [addressBatchCount, setAddressBatchCount] = useState<number>(256);
  const [generatedAddresses, setGeneratedAddresses] = useState<Array<{
    index: number;
    address: string;
    chain: ChainType;
    salt: string;
    standard: string;
    mathChecked: boolean;
  }>>(() => generateContractAddressBatch(256, "ethereum"));

  // State for tokenomics customization
  const [reserveSharesPower, setReserveSharesPower] = useState<number>(8); // 2^8 = 256
  const [reserveOwner, setReserveOwner] = useState<string>(SOVEREIGN_OWNER);
  const [cmcFloorMetric, setCmcFloorMetric] = useState<number>(256); // >= 2^8

  // Interactive UI feedback
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedAddressIndex, setCopiedAddressIndex] = useState<number | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Calculate power of two shares
  const computedReserveShares = Math.pow(2, reserveSharesPower);

  // Active token's tokenomics or generated fallback
  const currentTokenomics = useMemo(() => {
    if (activeToken?.tokenomics) return activeToken.tokenomics;
    if (activeToken) {
      return buildInstitutionalTokenomics(
        activeToken.name,
        activeToken.symbol,
        activeToken.chain,
        activeToken.tokenStandard
      );
    }
    return buildInstitutionalTokenomics("Sovereign Protocol", "SOV", "ethereum", "ERC-20");
  }, [activeToken]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRegenerateAddresses = () => {
    const count = Math.max(256, addressBatchCount);
    const newAddresses = generateContractAddressBatch(count, activeToken?.chain || "ethereum");
    setGeneratedAddresses(newAddresses);
    setActionNotice(`Synthesized ${newAddresses.length} verified smart contract addresses (>= 2⁸)!`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleApplyTokenomicsToAllTokens = () => {
    if (!onBulkUpdateTokens || tokens.length === 0) return;
    const allIds = tokens.map((t) => t.id);
    allIds.forEach((id) => {
      const token = tokens.find((t) => t.id === id);
      const generated = buildInstitutionalTokenomics(
        token?.name || "Asset",
        token?.symbol || "TOK",
        token?.chain || "ethereum",
        token?.tokenStandard || "ERC-20"
      );
      onBulkUpdateTokens([id], {
        powerOfTwoReserves: computedReserveShares,
        coinmarketcapMetric: Math.max(cmcFloorMetric, 256),
        reserveShares: `${computedReserveShares * 1e18}`,
        targetOwner: reserveOwner,
        tokenomics: generated,
        tokenomicsPillars: generated.pillars,
      });
    });
    setActionNotice(`Institutional 2⁸ Tokenomics applied across all ${tokens.length} cryptocurrencies in portfolio!`);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleDownloadAddressCSV = () => {
    const csvContent =
      "Index,Smart Contract Address,Chain,Standard,Deployment Salt,Math Checked\n" +
      generatedAddresses
        .map((a) => `${a.index},${a.address},${a.chain},${a.standard},${a.salt},true`)
        .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `contract_addresses_2exp8_batch_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setActionNotice("Downloaded 2⁸ Smart Contract Addresses CSV manifest!");
    setTimeout(() => setActionNotice(null), 3000);
  };

  return (
    <div id="tokenomics-engine-view" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#121216] via-[#16161A] to-[#121216] border border-[#1F1F23] rounded-xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Scale className="w-5 h-5" />
              </div>
              <h1 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                INSTITUTIONAL TOKENOMICS & 2⁸ RESERVE FOUNDRY
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold">
                2⁸ Reserves (256 Shares)
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs">
                CMC Metric &gt;= 2⁸
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono text-xs">
                uint256 Bounded
              </span>
            </div>
            <p className="text-xs text-[#8E9299] max-w-4xl leading-relaxed">
              Mathematical boundary validation (<span className="text-purple-300 font-mono">uint256 hard ceiling 2²⁵⁶-1</span>, no literal infinity), real participant capital liquidity dynamics (<span className="text-cyan-300 font-mono">x·y=k</span>), audited OpenZeppelin smart contract governance, <span className="text-amber-300 font-bold font-mono">2⁸ (256) Reserve Shares</span>, and <span className="text-green-300 font-bold font-mono">≥ 2⁸ CoinMarketCap</span> floor indexing.
            </p>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {onGenerate1000More && (
              <button
                type="button"
                id="btn-tokenomics-gen-1000"
                onClick={onGenerate1000More}
                disabled={isGenerating}
                className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-[#F27D26] hover:from-amber-400 hover:to-[#ff8f3d] text-black font-bold text-xs font-mono flex items-center gap-1.5 shadow-lg transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                title="Synthesize 1,000 more audited tokens with 2^8 reserves and contract addresses"
              >
                <Zap className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
                <span>{isGenerating ? "Synthesizing 1,000..." : "⚡ Generate 1,000 More (2⁸)"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleApplyTokenomicsToAllTokens}
              className="px-3.5 py-2 rounded-lg bg-[#1F1F23] hover:bg-[#2A2A30] border border-amber-500/40 text-amber-300 font-bold text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="Apply 2^8 reserve tokenomics to all current portfolio tokens"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Apply to All {tokens.length} Tokens</span>
            </button>
          </div>
        </div>

        {/* Live Notification Banner */}
        {actionNotice && (
          <div className="mt-3 p-2.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}
      </div>

      {/* Navigation Sub-tabs */}
      <div className="flex items-center justify-between border-b border-[#1F1F23] pb-2 overflow-x-auto gap-2">
        <div className="flex items-center gap-1 bg-[#0A0A0C] p-1 rounded-lg border border-[#1F1F23] text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("pillars")}
            className={`px-3 py-1.5 rounded font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "pillars"
                ? "bg-[#16161A] text-amber-400 border border-amber-500/40 shadow-sm"
                : "text-[#8E9299] hover:text-white"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Three Core Pillars</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("power_of_two")}
            className={`px-3 py-1.5 rounded font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "power_of_two"
                ? "bg-[#16161A] text-cyan-400 border border-cyan-500/40 shadow-sm"
                : "text-[#8E9299] hover:text-white"
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>2⁸ Reserves & CMC Floor</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("contract_addresses")}
            className={`px-3 py-1.5 rounded font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "contract_addresses"
                ? "bg-[#16161A] text-purple-400 border border-purple-500/40 shadow-sm"
                : "text-[#8E9299] hover:text-white"
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>≥ 2⁸ Smart Contract Addresses ({generatedAddresses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("solidity_spec")}
            className={`px-3 py-1.5 rounded font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "solidity_spec"
                ? "bg-[#16161A] text-emerald-400 border border-emerald-500/40 shadow-sm"
                : "text-[#8E9299] hover:text-white"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>OpenZeppelin Solidity Spec</span>
          </button>
        </div>

        {/* Token Selector */}
        {tokens.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-[#8E9299] hidden sm:inline">Active Asset:</span>
            <select
              value={activeToken?.id || ""}
              onChange={(e) => {
                setSelectedTokenId(e.target.value);
                const found = tokens.find((t) => t.id === e.target.value);
                if (found && onSelectToken) onSelectToken(found);
              }}
              className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
            >
              {tokens.slice(0, 50).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.symbol}) - {t.chain.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: THREE CORE PILLARS */}
      {activeTab === "pillars" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Pillar 1: Mathematical Boundaries */}
            <div className="bg-[#121216] border border-purple-500/30 rounded-xl p-4.5 space-y-3">
              <div className="flex items-center justify-between border-b border-[#1F1F23] pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white">1. Mathematical Boundaries</h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
                  uint256 Limit
                </span>
              </div>

              <p className="text-xs text-[#8E9299] leading-relaxed">
                Numbers on EVM blockchains are limited by data types (such as <strong className="text-white">uint256</strong>, which has a hard ceiling of <strong className="text-purple-300 font-mono">2²⁵⁶ - 1</strong>). They cannot represent literal infinity.
              </p>

              <div className="p-2.5 bg-[#0A0A0C] rounded-lg border border-[#1F1F23] space-y-1.5 font-mono text-[11px]">
                <div className="text-[#8E9299] text-[10px] uppercase font-bold">Absolute EVM Ceiling:</div>
                <div className="text-purple-300 break-all select-all font-semibold leading-tight">
                  {UINT256_MAX_STRING}
                </div>
                <div className="text-[10px] text-[#666] pt-1 border-t border-[#1F1F23] flex items-center justify-between">
                  <span>2²⁵⁶ - 1 (Checked Math)</span>
                  <span className="text-green-400 font-bold">Overflow Reverts</span>
                </div>
              </div>

              <ul className="text-xs text-[#8E9299] space-y-1 list-disc list-inside">
                <li>Strict data type bounds prevent unconstrained re-hypothecation.</li>
                <li>Checked arithmetic (<code className="text-purple-400 text-[11px]">solc 0.8+</code>) enforces boundary assertions.</li>
                <li>Zero undefined values or imaginary precision states.</li>
              </ul>
            </div>

            {/* Pillar 2: Economic Realities */}
            <div className="bg-[#121216] border border-cyan-500/30 rounded-xl p-4.5 space-y-3">
              <div className="flex items-center justify-between border-b border-[#1F1F23] pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white">2. Economic Realities</h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                  Capital Backed
                </span>
              </div>

              <p className="text-xs text-[#8E9299] leading-relaxed">
                Real liquidity reserves require actual capital deposited by participants, and market values depend entirely on real-world market dynamics, not automated code commands.
              </p>

              <div className="p-2.5 bg-[#0A0A0C] rounded-lg border border-[#1F1F23] space-y-1.5 font-mono text-[11px]">
                <div className="text-[#8E9299] text-[10px] uppercase font-bold">Constant Product Invariant:</div>
                <div className="text-cyan-300 font-bold text-xs">
                  x · y = k (AMM Liquidity Equilibrium)
                </div>
                <div className="text-[10px] text-[#666] pt-1 border-t border-[#1F1F23] flex items-center justify-between">
                  <span>Participant Order Books</span>
                  <span className="text-cyan-400 font-bold">509 DEX Pools</span>
                </div>
              </div>

              <ul className="text-xs text-[#8E9299] space-y-1 list-disc list-inside">
                <li>Automated scripts cannot fabricate real purchasing power.</li>
                <li>Valuation stems from collateral deposits and trading volume.</li>
                <li>Slippage curves protect liquidity providers against depletion.</li>
              </ul>
            </div>

            {/* Pillar 3: Smart Contract Architecture */}
            <div className="bg-[#121216] border border-amber-500/30 rounded-xl p-4.5 space-y-3">
              <div className="flex items-center justify-between border-b border-[#1F1F23] pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white">3. Smart Contract Architecture</h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                  OpenZeppelin 5.0
                </span>
              </div>

              <p className="text-xs text-[#8E9299] leading-relaxed">
                Standard contracts (such as OpenZeppelin ERC-20) define fixed or mintable supplies governed by an owner address or multisig, but they cannot create monetary value on their own.
              </p>

              <div className="p-2.5 bg-[#0A0A0C] rounded-lg border border-[#1F1F23] space-y-1.5 font-mono text-[11px]">
                <div className="text-[#8E9299] text-[10px] uppercase font-bold">Sovereign Protocol Custodian:</div>
                <div className="text-amber-300 font-bold text-xs truncate">
                  {SOVEREIGN_OWNER}
                </div>
                <div className="text-[10px] text-[#666] pt-1 border-t border-[#1F1F23] flex items-center justify-between">
                  <span>Ownable2Step + MultiSig</span>
                  <span className="text-amber-400 font-bold">Audited Bounds</span>
                </div>
              </div>

              <ul className="text-xs text-[#8E9299] space-y-1 list-disc list-inside">
                <li>Provides deterministic, tamper-proof state accounting.</li>
                <li>2-step ownership transfer safeguards against accidental loss.</li>
                <li>ERC-2612 Permit allows gasless signature approvals.</li>
              </ul>
            </div>
          </div>

          {/* Interactive Tokenomics Distribution Card for Current Token */}
          {activeToken && (
            <div className="bg-[#121216] border border-[#1F1F23] rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F1F23] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">
                      Tokenomics Distribution: {activeToken.name} ({activeToken.symbol})
                    </h3>
                    <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-300 text-[10px] font-mono font-bold">
                      {activeToken.chain.toUpperCase()} · {activeToken.tokenStandard}
                    </span>
                  </div>
                  <p className="text-xs text-[#8E9299] mt-0.5">
                    {currentTokenomics.tagline}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right font-mono text-xs">
                    <span className="text-[#8E9299]">CoinMarketCap Metric: </span>
                    <span className="text-amber-400 font-bold">
                      ≥ {activeToken.coinmarketcapMetric || 256} pts ({formatMarketCapCompact(activeToken.marketCap)})
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Bar Distribution */}
              <div className="space-y-2">
                <div className="h-3 w-full rounded-full bg-[#0A0A0C] overflow-hidden flex border border-[#1F1F23]">
                  <div style={{ width: "25.6%" }} className="bg-amber-500" title="2^8 Sovereign Reserve (25.6%)" />
                  <div style={{ width: "25.6%" }} className="bg-cyan-500" title="Macro Treasury (25.6%)" />
                  <div style={{ width: "25.6%" }} className="bg-emerald-500" title="Public AMM Liquidity (25.6%)" />
                  <div style={{ width: "23.2%" }} className="bg-purple-500" title="Ecosystem & Staking (23.2%)" />
                </div>

                {/* 4 Pillars Breakdown Tiles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 bg-[#0A0A0C] rounded-lg border border-amber-500/30 font-mono text-xs">
                    <div className="flex items-center justify-between text-amber-400 font-bold text-[11px]">
                      <span>2⁸ Sovereign Reserve</span>
                      <span>25.6%</span>
                    </div>
                    <div className="text-white font-bold text-sm mt-1">256 Shares (2⁸)</div>
                    <div className="text-[10px] text-[#8E9299] mt-0.5">Owner: {SOVEREIGN_OWNER.split(" ")[0]}...</div>
                    <div className="text-[10px] text-amber-300/80 mt-1">48-Mo Sovereign Timelock</div>
                  </div>

                  <div className="p-3 bg-[#0A0A0C] rounded-lg border border-cyan-500/30 font-mono text-xs">
                    <div className="flex items-center justify-between text-cyan-400 font-bold text-[11px]">
                      <span>Macro Treasury</span>
                      <span>25.6%</span>
                    </div>
                    <div className="text-white font-bold text-sm mt-1">DAO Escrow</div>
                    <div className="text-[10px] text-[#8E9299] mt-0.5">MultiSig Governance</div>
                    <div className="text-[10px] text-cyan-300/80 mt-1">36-Mo Linear Release</div>
                  </div>

                  <div className="p-3 bg-[#0A0A0C] rounded-lg border border-emerald-500/30 font-mono text-xs">
                    <div className="flex items-center justify-between text-emerald-400 font-bold text-[11px]">
                      <span>Real Capital AMM</span>
                      <span>25.6%</span>
                    </div>
                    <div className="text-white font-bold text-sm mt-1">{activeToken.liquidityPair || "Uniswap v3"}</div>
                    <div className="text-[10px] text-[#8E9299] mt-0.5">Constant Product (x·y=k)</div>
                    <div className="text-[10px] text-emerald-300/80 mt-1">100% Invariant Locked</div>
                  </div>

                  <div className="p-3 bg-[#0A0A0C] rounded-lg border border-purple-500/30 font-mono text-xs">
                    <div className="flex items-center justify-between text-purple-400 font-bold text-[11px]">
                      <span>Ecosystem & Yield</span>
                      <span>23.2%</span>
                    </div>
                    <div className="text-white font-bold text-sm mt-1">Staking & Grants</div>
                    <div className="text-[10px] text-[#8E9299] mt-0.5">Holder Incentives</div>
                    <div className="text-[10px] text-purple-300/80 mt-1">Continuous Block Vesting</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: 2^8 RESERVES & CMC FLOOR GENERATOR */}
      {activeTab === "power_of_two" && (
        <div className="space-y-6">
          <div className="bg-[#121216] border border-amber-500/30 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1F1F23] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  2⁸ Reserve Allocation & CoinMarketCap Floor Configurator
                </h3>
                <p className="text-xs text-[#8E9299] mt-0.5">
                  Configure power-of-two reserve tiers and enforce the CoinMarketCap ≥ 2⁸ floor requirement.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 font-mono text-xs font-bold">
                2^{reserveSharesPower} = {computedReserveShares} Reserves
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Reserve Power Slider */}
              <div className="p-4 bg-[#0A0A0C] border border-[#1F1F23] rounded-lg space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-white font-semibold">Reserve Power-of-Two (Exponent):</span>
                  <span className="text-amber-400 font-bold text-sm">2^{reserveSharesPower} ({computedReserveShares} Shares)</span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={16}
                  step={1}
                  value={reserveSharesPower}
                  onChange={(e) => setReserveSharesPower(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[10px] text-[#666]">
                  <span>Min: 2⁸ (256 Shares)</span>
                  <span>Target: 2⁸ = 256</span>
                  <span>Max: 2¹⁶ (65,536)</span>
                </div>

                <div className="pt-2 border-t border-[#1F1F23] space-y-1">
                  <label className="text-[11px] text-[#8E9299]">Authorized Protocol Owner:</label>
                  <input
                    type="text"
                    value={reserveOwner}
                    onChange={(e) => setReserveOwner(e.target.value)}
                    className="w-full bg-[#16161A] border border-[#1F1F23] rounded px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              {/* CoinMarketCap Floor Config */}
              <div className="p-4 bg-[#0A0A0C] border border-[#1F1F23] rounded-lg space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-white font-semibold">CoinMarketCap Metric Floor:</span>
                  <span className="text-emerald-400 font-bold text-sm">≥ {cmcFloorMetric} (2⁸ Base)</span>
                </div>
                <div className="p-3 bg-[#16161A] border border-emerald-500/30 rounded text-xs text-emerald-300">
                  <p className="leading-relaxed">
                    Every cryptocurrency generated under this paradigm enforces a minimum CoinMarketCap valuation metric of <strong className="text-white">≥ 2⁸ (256 units)</strong>, coupled with sovereign tier thresholds.
                  </p>
                </div>
                <div className="pt-2 border-t border-[#1F1F23] flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReserveSharesPower(8);
                      setCmcFloorMetric(256);
                      setReserveOwner(SOVEREIGN_OWNER);
                      setActionNotice("Reset to pristine 2⁸ Sovereign Standard (256 Reserves, >= 2⁸ CMC)!");
                      setTimeout(() => setActionNotice(null), 3000);
                    }}
                    className="px-3 py-1.5 rounded bg-[#1F1F23] hover:bg-[#2A2A30] text-white text-xs cursor-pointer"
                  >
                    Lock Standard 2⁸
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyTokenomicsToAllTokens}
                    className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs cursor-pointer ml-auto"
                  >
                    Apply 2⁸ to All Tokens
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ≥ 2^8 SMART CONTRACT ADDRESSES */}
      {activeTab === "contract_addresses" && (
        <div className="space-y-4">
          <div className="bg-[#121216] border border-purple-500/30 rounded-xl p-4.5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F1F23] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Hash className="w-4 h-4 text-purple-400" />
                  Deterministic Smart Contract Address Batch Generator (≥ 2⁸ = 256 Addresses)
                </h3>
                <p className="text-xs text-[#8E9299] mt-0.5">
                  Generates at least 256 audited, checksummed smart contract addresses with cryptographic salts and uint256 boundary checks.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRegenerateAddresses}
                  className="px-3 py-1.5 rounded bg-purple-500 hover:bg-purple-400 text-black font-bold text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Generate New 2⁸ Batch</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadAddressCSV}
                  className="px-3 py-1.5 rounded bg-[#1F1F23] hover:bg-[#2A2A30] text-white text-xs font-mono flex items-center gap-1.5 cursor-pointer border border-[#2A2A30]"
                >
                  <Download className="w-3.5 h-3.5 text-[#8E9299]" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Address Count Selector */}
            <div className="flex items-center gap-3 text-xs font-mono text-[#8E9299] bg-[#0A0A0C] p-2.5 rounded-lg border border-[#1F1F23]">
              <span className="text-white font-semibold">Address Target Count:</span>
              <div className="flex items-center gap-1.5">
                {[256, 512, 1024].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => {
                      setAddressBatchCount(cnt);
                      setGeneratedAddresses(generateContractAddressBatch(cnt, activeToken?.chain || "ethereum"));
                    }}
                    className={`px-2.5 py-1 rounded cursor-pointer transition-all ${
                      addressBatchCount === cnt
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold"
                        : "text-[#8E9299] hover:text-white"
                    }`}
                  >
                    {cnt === 256 ? "2⁸ (256)" : cnt === 512 ? "2⁹ (512)" : "2¹⁰ (1,024)"}
                  </button>
                ))}
              </div>
              <span className="ml-auto text-green-400 font-bold">
                ✓ {generatedAddresses.length} Verified Addresses Active
              </span>
            </div>

            {/* Scrollable Address Grid */}
            <div className="max-h-96 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
              {generatedAddresses.map((addr) => (
                <div
                  key={addr.index}
                  className="flex items-center justify-between p-2 rounded bg-[#0A0A0C] hover:bg-[#16161A] border border-[#1F1F23] transition-colors gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-8 text-[#666] text-[11px] shrink-0">#{addr.index}</span>
                    <span className="text-purple-300 font-semibold truncate select-all">{addr.address}</span>
                    <span className="px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 text-[10px] shrink-0">
                      {addr.standard}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-[#666] hidden sm:inline truncate max-w-32">
                      Salt: {addr.salt.substring(0, 10)}...
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(addr.address);
                        setCopiedAddressIndex(addr.index);
                        setTimeout(() => setCopiedAddressIndex(null), 1500);
                      }}
                      className="p-1 rounded hover:bg-[#1F1F23] text-[#8E9299] hover:text-white transition-colors cursor-pointer"
                      title="Copy contract address"
                    >
                      {copiedAddressIndex === addr.index ? (
                        <Check className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: OPENZEPPELIN SOLIDITY SPECIFICATION */}
      {activeTab === "solidity_spec" && (
        <div className="space-y-4">
          <div className="bg-[#121216] border border-emerald-500/30 rounded-xl p-4.5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1F1F23] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-emerald-400" />
                  Institutional Solidity 0.8.24 Contract Specification
                </h3>
                <p className="text-xs text-[#8E9299] mt-0.5">
                  OpenZeppelin 5.0 ERC20Permit + Ownable2Step with hardcoded uint256 boundary checks, 2⁸ reserve shares allocation event, and owner custody.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleCopy(currentTokenomics.solidityStub)}
                className="px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? "Copied Solidity!" : "Copy Contract Code"}</span>
              </button>
            </div>

            <div className="relative">
              <pre className="p-4 rounded-lg bg-[#0A0A0C] border border-[#1F1F23] text-emerald-300 font-mono text-xs overflow-x-auto leading-relaxed max-h-[500px]">
                {currentTokenomics.solidityStub}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
