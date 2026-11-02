import React, { useState } from "react";
import {
  Sparkles,
  Send,
  Code2,
  Terminal,
  Layers,
  Shield,
  Coins,
  Cpu,
  ArrowRight,
  CheckCircle2,
  Copy,
  Check,
  Zap,
  BookOpen,
  Boxes,
  Compass,
  Rocket,
  Globe,
  Sliders,
  Flame,
} from "lucide-react";
import { TokenRecord } from "../types";
import { MaxThresholdInventionEngine } from "./MaxThresholdInventionEngine";
import { saveTokensToFirestore } from "../lib/firebase";
import { generateEVMAddress, generateUint256TokenId, generateRandomHex } from "../utils/cryptoGenerators";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const STEP_BY_STEP_MODULES = [
  {
    step: 1,
    title: "Tokenomics & Economic Architecture",
    badge: "Phase 1: Design",
    summary: "Define total supply, inflation/deflation curves, vesting cliffs, staking yields, and utility sinks.",
    keyMetrics: [
      "Total Supply: 1,000,000,000 units (18 decimals)",
      "Public Liquidity: 35% at TGE",
      "Treasury & Compute Staking: 25% (4-yr linear release)",
      "Team & Devs: 18% (1-yr cliff, 3-yr vest)",
      "Strategic Reserve: 12%",
      "Ecosystem Grants: 10%",
    ],
    codeSnippet: `// Tokenomics Model Calculation (Python)
def calculate_emission(initial_supply=1_000_000_000, halving_years=2, years=10):
    supply = initial_supply
    for y in range(1, years + 1):
        inflation = (0.05 / (2 ** (y // halving_years)))
        minted = supply * inflation
        supply += minted
        print(f"Year {y}: +{minted:,.0f} tokens (Total: {supply:,.0f})")`,
  },
  {
    step: 2,
    title: "Consensus & Ledger Paradigm",
    badge: "Phase 2: Architecture",
    summary: "Select between an EVM Smart Contract (Ethereum/Base/Arbitrum) or a standalone Layer-1 Chain.",
    keyMetrics: [
      "EVM Standard: ERC-20 / ERC-721 / ERC-1155 / Quantum-Hybrid",
      "Gas Mechanism: Native EIP-1559 burn or gasless ERC-4337 paymasters",
      "Custom Chain Alternative: CometBFT PoS (Cosmos SDK) or Geth EVM Fork",
      "Block Time: 2.0s (L2 Rollups) to 12.0s (Ethereum L1)",
    ],
    codeSnippet: `// Hardhat & Foundry Config (foundry.toml)
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.24"
optimizer = true
optimizer_runs = 1000000
evm_version = "cancun"`,
  },
  {
    step: 3,
    title: "Smart Contract & Genesis Implementation",
    badge: "Phase 3: Engineering",
    summary: "Write robust Solidity 0.8.24+ contracts with OpenZeppelin 5.0, ReentrancyGuard, and Permit.",
    keyMetrics: [
      "OpenZeppelin 5.0 ERC20Permit (EIP-2612 gasless approvals)",
      "ERC-4337 Account Abstraction compatible",
      "2-Step Ownership transfer (Ownable2Step)",
      "Custom minting caps and deterministic address salts (CREATE2)",
    ],
    codeSnippet: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

contract NextGenCrypto is ERC20Permit, Ownable2Step {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 1e18;

    constructor(address initialOwner) 
        ERC20("Autonomous Quantum Currency", "AQC") 
        ERC20Permit("Autonomous Quantum Currency") 
        Ownable(initialOwner) 
    {
        _mint(initialOwner, MAX_SUPPLY);
    }
}`,
  },
  {
    step: 4,
    title: "Local Testing & Public Testnets",
    badge: "Phase 4: Verification",
    summary: "Simulate edge cases locally using Foundry fuzzing before broadcasting to Sepolia or Base Sepolia.",
    keyMetrics: [
      "Foundry Invariant Fuzzing: 100,000 random transaction runs",
      "Public Testnets: Ethereum Sepolia, Holesky, Base Sepolia",
      "Testnet Faucets & RPC Node Providers (Alchemy / Infura / QuickNode)",
    ],
    codeSnippet: `# Foundry Deployment Command
forge script script/Deploy.s.sol:DeployScript \\
  --rpc-url https://sepolia.infura.io/v3/$API_KEY \\
  --private-key $DEPLOYER_PRIVATE_KEY \\
  --broadcast \\
  --verify \\
  --etherscan-api-key $ETHERSCAN_KEY`,
  },
  {
    step: 5,
    title: "Security Audits & Formal Verification",
    badge: "Phase 5: Security",
    summary: "Run automated static analysis (Slither, Mythril) and invariant tests before mainnet.",
    keyMetrics: [
      "Slither Static Analyzer: Zero high/medium findings",
      "Mythril Symbolic Execution: Reentrancy & overflow verified",
      "Safe Multi-Sig (3/5 threshold) + 48-hour Timelock controller",
    ],
    codeSnippet: `# Run Slither Security Suite
pip3 install slither-analyzer
slither . --print human-summary
slither . --detect reentrancy-eth,unprotected-upgrade,arbitrary-send-erc20`,
  },
  {
    step: 6,
    title: "Mainnet Genesis, Liquidity & DEX Listing",
    badge: "Phase 6: Mainnet Launch",
    summary: "Execute mainnet deployment, verify source code on Etherscan, and seed Uniswap v3/v4 pools.",
    keyMetrics: [
      "Mainnet Broadcast: Ethereum Mainnet (ChainID: 1) or Base (8453)",
      "Uniswap v3 Liquidity: Pair with ETH/USDC with concentrated tick ranges",
      "Liquidity Lock: 100% of initial LP tokens locked via UNCX / Team.Finance",
      "CoinGecko / CoinMarketCap DEX listing tracker metadata indexation",
    ],
    codeSnippet: `// Uniswap v3 Pool Initialization (Solidity)
INonfungiblePositionManager.MintParams memory params = 
    INonfungiblePositionManager.MintParams({
        token0: tokenA,
        token1: tokenB,
        fee: 3000, // 0.3% fee tier
        tickLower: -887220,
        tickUpper: 887220,
        amount0Desired: tokenAmount,
        amount1Desired: ethAmount,
        amount0Min: 0,
        amount1Min: 0,
        recipient: treasurySafe,
        deadline: block.timestamp + 1200
    });`,
  },
];

interface CryptoArchitectProps {
  onInventToken?: (tokens: TokenRecord[]) => void;
  onSendToRemix?: (solidityCode: string, tokenName: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const CryptoArchitect: React.FC<CryptoArchitectProps> = ({
  onInventToken,
  onSendToRemix,
  onNavigateTab,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"max_thresholds" | "roadmap" | "ai_inventor" | "cli_cheatsheet">("max_thresholds");
  const [selectedStep, setSelectedStep] = useState<number>(1);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [simulatedTokenSuccess, setSimulatedTokenSuccess] = useState<string | null>(null);

  // AI Invention conversation state
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `### Welcome to the 2026 Cryptocurrency Invention & Deployment Engine

I am your out-of-sandbox Blockchain Architect. You can ask me to:
1. **Invent completely novel cryptocurrencies** (e.g. AI-agent swarm incentives, zero-knowledge verifiable compute tokens, quantum-resistant rebase currencies).
2. **Generate production-ready smart contracts & genesis block files** in Solidity, Rust, Go, or Python.
3. **Walk through the end-to-end steps to launch and deploy** your cryptocurrency to Ethereum, Base, Solana, or a custom Cosmos/L2 chain.

What kind of cryptocurrency would you like to invent or deploy today?`,
      timestamp: "Just now",
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // Tokenomics Calculator State
  const [totalSupplySlider, setTotalSupplySlider] = useState<number>(1000000000);
  const [publicPercent, setPublicPercent] = useState<number>(35);
  const [treasuryPercent, setTreasuryPercent] = useState<number>(25);
  const [teamPercent, setTeamPercent] = useState<number>(18);
  const [stakingPercent, setStakingPercent] = useState<number>(12);
  const [grantsPercent, setGrantsPercent] = useState<number>(10);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputPrompt;
    if (!text.trim() || isAiLoading) return;

    const userMsg: Message = {
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputPrompt("");
    setIsAiLoading(true);

    try {
      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      if (data.success && data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } else {
        throw new Error(data.error || "Failed to generate reply");
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `**Error**: ${err.message || "Failed to connect to AI engine"}. Please check your network or try again.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleInstantiateSimulatedTokenomics = async () => {
    const sym = `ARCH-${Math.floor(Math.random() * 900 + 100)}`;
    const name = `Architect Matrix ${sym}`;
    const evmAddrObj = generateEVMAddress();
    const evmAddr = typeof evmAddrObj === "string" ? evmAddrObj : evmAddrObj.address;
    const tokenRecord: TokenRecord = {
      id: generateUint256TokenId(),
      name,
      symbol: sym,
      chain: "ethereum",
      networkId: 1,
      contractAddress: evmAddr,
      isVanity: true,
      tokenId: generateUint256TokenId(),
      tokenStandard: "ERC-20",
      narrative: "quantum_defi",
      launchStatus: "Deployed",
      initialSupply: totalSupplySlider.toLocaleString(),
      decimals: 18,
      marketCap: totalSupplySlider * 1.0,
      priceUsd: 1.0,
      liquidityPair: "ETH/USDT (Uniswap V3)",
      liquidityPoolId: 1,
      holderCount: 420,
      auditFirm: "OpenZeppelin",
      securityScore: 98,
      createdAt: new Date().toISOString().split("T")[0],
      creationTx: `0x${generateRandomHex(64)}`,
      deployerAddress: "0x5AFE0000A192e4C38148386348612EadD997C0RP",
      quantum_entropy_signature: generateRandomHex(64),
      contractArchetype: "CREATE2 Institutional Proxy",
      isEnterprise: true,
    };

    if (onInventToken) {
      onInventToken([tokenRecord]);
    }
    await saveTokensToFirestore([tokenRecord]);
    setSimulatedTokenSuccess(`Token ${sym} (${totalSupplySlider.toLocaleString()} units) instantiated to Foundry & Vault!`);
    setTimeout(() => setSimulatedTokenSuccess(null), 4500);
  };

  const activeModule = STEP_BY_STEP_MODULES.find((m) => m.step === selectedStep) || STEP_BY_STEP_MODULES[0];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Boxes className="w-5 h-5 text-[#F27D26]" />
              <h2 className="text-base font-bold text-white tracking-tight uppercase">
                Cryptocurrency Invention & Step-by-Step Deployment Engine
              </h2>
            </div>
            <p className="text-xs text-[#8E9299] mt-1">
              End-to-end framework to architect tokenomics, write Solidity/Rust ledgers, simulate testnets, audit security, and launch to mainnet with out-of-sandbox AI mode.
            </p>
          </div>

          {/* Sub-tab Navigation */}
          <div className="flex items-center gap-1 bg-[#0A0A0C] p-1 rounded-lg border border-[#1F1F23]">
            <button
              onClick={() => setActiveSubTab("max_thresholds")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === "max_thresholds"
                  ? "bg-purple-950/60 text-purple-300 border border-purple-500 shadow-sm"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-purple-400" />
              <span>Max Protocol Limits & Inventions</span>
            </button>
            <button
              onClick={() => setActiveSubTab("roadmap")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer ${
                activeSubTab === "roadmap"
                  ? "bg-[#16161A] text-white border border-[#F27D26]"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              Step-by-Step Blueprint
            </button>
            <button
              onClick={() => setActiveSubTab("ai_inventor")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === "ai_inventor"
                  ? "bg-[#16161A] text-[#F27D26] border border-[#F27D26]"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Mode Invention</span>
            </button>
            <button
              onClick={() => setActiveSubTab("cli_cheatsheet")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer ${
                activeSubTab === "cli_cheatsheet"
                  ? "bg-[#16161A] text-white border border-[#F27D26]"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              Deployment CLI
            </button>
          </div>
        </div>
      </div>

      {/* SUB-TAB 0: Max Protocol Limits & Economic Inventions */}
      {activeSubTab === "max_thresholds" && (
        <MaxThresholdInventionEngine 
          onInventToken={onInventToken} 
          onSendToRemix={onSendToRemix}
          onNavigateTab={onNavigateTab}
        />
      )}

      {/* SUB-TAB 1: Step-by-Step Blueprint */}
      {activeSubTab === "roadmap" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Steps Navigation Column */}
          <div className="lg:col-span-4 space-y-2">
            <div className="text-xs font-semibold text-[#8E9299] uppercase tracking-wider px-1">
              6 Core Deployment Milestones
            </div>
            {STEP_BY_STEP_MODULES.map((mod) => (
              <button
                key={mod.step}
                type="button"
                onClick={() => setSelectedStep(mod.step)}
                className={`w-full text-left p-3.5 rounded-lg border transition-all cursor-pointer flex items-start gap-3 ${
                  selectedStep === mod.step
                    ? "bg-[#16161A] border-[#F27D26] shadow-md"
                    : "bg-[#0A0A0C] border-[#1F1F23] hover:border-[#333] opacity-80 hover:opacity-100"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                    selectedStep === mod.step
                      ? "bg-[#F27D26] text-black"
                      : "bg-[#1F1F23] text-[#8E9299]"
                  }`}
                >
                  0{mod.step}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate">{mod.title}</span>
                  </div>
                  <span className="text-[10px] text-[#F27D26] font-mono">{mod.badge}</span>
                  <p className="text-[11px] text-[#8E9299] line-clamp-1 mt-0.5">{mod.summary}</p>
                </div>
              </button>
            ))}

            {/* Interactive Supply Calculator Card */}
            <div className="bg-[#16161A] border border-[#1F1F23] rounded-lg p-4 space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-white uppercase">
                  <Sliders className="w-3.5 h-3.5 text-[#F27D26]" />
                  <span>Tokenomics Simulator</span>
                </div>
                <span className="text-[10px] font-mono text-green-500">Live 100% Sum</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#8E9299]">Total Supply</span>
                  <span className="font-mono text-white font-bold">{totalSupplySlider.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="1000000"
                  max="10000000000"
                  step="10000000"
                  value={totalSupplySlider}
                  onChange={(e) => setTotalSupplySlider(Number(e.target.value))}
                  className="w-full accent-[#F27D26]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                <div className="bg-[#0A0A0C] p-2 rounded border border-[#1F1F23]">
                  <span className="text-[#8E9299] block text-[9px] uppercase">Public Liquidity (35%)</span>
                  <span className="text-[#F27D26] font-bold">{(totalSupplySlider * 0.35).toLocaleString()}</span>
                </div>
                <div className="bg-[#0A0A0C] p-2 rounded border border-[#1F1F23]">
                  <span className="text-[#8E9299] block text-[9px] uppercase">Treasury (25%)</span>
                  <span className="text-white font-bold">{(totalSupplySlider * 0.25).toLocaleString()}</span>
                </div>
                <div className="bg-[#0A0A0C] p-2 rounded border border-[#1F1F23]">
                  <span className="text-[#8E9299] block text-[9px] uppercase">Team & Devs (18%)</span>
                  <span className="text-white font-bold">{(totalSupplySlider * 0.18).toLocaleString()}</span>
                </div>
                <div className="bg-[#0A0A0C] p-2 rounded border border-[#1F1F23]">
                  <span className="text-[#8E9299] block text-[9px] uppercase">Staking / Yield (12%)</span>
                  <span className="text-green-500 font-bold">{(totalSupplySlider * 0.12).toLocaleString()}</span>
                </div>
              </div>

              {/* Instantiate Button */}
              <div className="pt-2">
                <button
                  id="btn-instantiate-tokenomics-blueprint"
                  type="button"
                  onClick={handleInstantiateSimulatedTokenomics}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-mono font-bold text-xs transition-all cursor-pointer shadow-md shadow-orange-600/20 active:scale-95"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Instantiate Tokenomics as Token</span>
                </button>
                {simulatedTokenSuccess && (
                  <div className="mt-2 p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono flex items-center gap-1.5 animate-fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{simulatedTokenSuccess}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step Detail & Code Workspace */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-[#16161A] border border-[#1F1F23] rounded-lg p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#1F1F23]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26]/30 text-xs font-mono font-bold">
                      STEP 0{activeModule.step}
                    </span>
                    <h3 className="text-base font-bold text-white">{activeModule.title}</h3>
                  </div>
                  <p className="text-xs text-[#8E9299] mt-1">{activeModule.summary}</p>
                </div>
                <button
                  onClick={() => handleCopy(activeModule.codeSnippet)}
                  className="px-3 py-1.5 rounded bg-[#0A0A0C] border border-[#1F1F23] text-xs font-mono text-[#8E9299] hover:text-white flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? "Copied" : "Copy Snippet"}</span>
                </button>
              </div>

              {/* Core Checklists / Metrics */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#8E9299] uppercase tracking-wider">
                  Technical Checklist & Specifications
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeModule.keyMetrics.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-[#0A0A0C] p-2.5 rounded border border-[#1F1F23] flex items-start gap-2 text-xs"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#F27D26] shrink-0 mt-0.5" />
                      <span className="text-[#E0E0E0] font-mono">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Code Snippet Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#8E9299] uppercase tracking-wider">
                    Production Implementation Code
                  </label>
                  <span className="text-[10px] font-mono text-[#555]">Standardized 2026 Template</span>
                </div>
                <pre className="p-4 rounded-lg bg-[#0A0A0C] border border-[#1F1F23] text-xs font-mono text-[#E0E0E0] overflow-x-auto leading-relaxed whitespace-pre">
                  {activeModule.codeSnippet}
                </pre>
              </div>

              {/* Navigation Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-[#1F1F23]">
                <button
                  type="button"
                  disabled={selectedStep === 1}
                  onClick={() => setSelectedStep((prev) => Math.max(1, prev - 1))}
                  className="px-4 py-2 rounded bg-[#0A0A0C] border border-[#1F1F23] text-xs text-[#8E9299] hover:text-white disabled:opacity-40 cursor-pointer"
                >
                  ← Previous Step
                </button>
                <span className="text-xs font-mono text-[#8E9299]">
                  Step {selectedStep} of {STEP_BY_STEP_MODULES.length}
                </span>
                <button
                  type="button"
                  disabled={selectedStep === STEP_BY_STEP_MODULES.length}
                  onClick={() => setSelectedStep((prev) => Math.min(STEP_BY_STEP_MODULES.length, prev + 1))}
                  className="px-4 py-2 rounded bg-[#F27D26] hover:bg-[#ff8e3c] text-black font-bold text-xs uppercase tracking-wider cursor-pointer disabled:opacity-40"
                >
                  Next Step →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: AI Mode Invention (Out-of-Sandbox Conversation) */}
      {activeSubTab === "ai_inventor" && (
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-lg p-5 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1F1F23]">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#F27D26]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-tight">
                  Out-of-Sandbox Cryptocurrency Invention Studio
                </h3>
              </div>
              <p className="text-xs text-[#8E9299] mt-0.5">
                Brainstorm novel token mechanics, compute rewards, zero-knowledge verification ledgers, and ask detailed deployment questions.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-green-500 bg-[#0A0A0C] px-2.5 py-1 rounded border border-[#1F1F23]">
                Model: Gemini 3.8 Flash
              </span>
            </div>
          </div>

          {/* Quick Idea Starters */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold text-[#8E9299] uppercase tracking-wider">Invention Presets:</span>
            <div className="flex flex-wrap gap-2">
              {[
                "What are the components to build a cryptocurrency step by step to deployed?",
                "How does the Genesis Token Launch Automator pipeline work (Foundry + Uniswap DEX)?",
                "Invent an AI Autonomous Agent Swarm Compute Token with staking curves",
                "Walk me through DAO transition & handing over administrative keys to a Timelock",
                "How to set up automated token migration swappers and Layer 1/2 bridges",
                "Write an ERC-20 Solidity contract with EIP-2612 permit & anti-whale limits",
                "Design a Zero-Knowledge Proof-of-Useful-Work currency architecture",
                "Explain platform sunsetting protocols, state archiving, and legacy API deprecation",
              ].map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(preset)}
                  className="px-2.5 py-1 rounded bg-[#0A0A0C] hover:bg-[#1F1F23] border border-[#1F1F23] hover:border-[#F27D26] text-[11px] text-[#8E9299] hover:text-white transition-all cursor-pointer text-left"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Messages Log */}
          <div className="min-h-[380px] max-h-[500px] overflow-y-auto space-y-4 p-4 rounded-lg bg-[#0A0A0C] border border-[#1F1F23] font-mono text-xs">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${
                  msg.role === "user"
                    ? "bg-[#16161A] border-[#F27D26]/40 text-[#E0E0E0] ml-8"
                    : "bg-[#121215] border-[#1F1F23] text-[#E0E0E0] mr-8"
                }`}
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1F1F23] text-[10px]">
                  <span className={msg.role === "user" ? "text-[#F27D26] font-bold" : "text-green-500 font-bold"}>
                    {msg.role === "user" ? "YOU (ARCHITECT)" : "GEMINI 3.8 (BLOCKCHAIN PROTOCOL AI)"}
                  </span>
                  <span className="text-[#555]">{msg.timestamp}</span>
                </div>
                <div className="leading-relaxed whitespace-pre-wrap font-sans text-xs">
                  {msg.content}
                </div>
              </div>
            ))}

            {isAiLoading && (
              <div className="p-4 rounded-lg bg-[#121215] border border-[#1F1F23] mr-8 flex items-center gap-3 text-xs text-[#8E9299]">
                <Cpu className="w-4 h-4 text-[#F27D26] animate-spin" />
                <span>Synthesizing token architecture and cryptographic deployment specifications...</span>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Ask how to build token mechanics, write smart contracts, or invent a custom currency..."
              disabled={isAiLoading}
              className="flex-1 bg-[#0A0A0C] border border-[#1F1F23] rounded-lg px-4 py-2.5 text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#F27D26]"
            />
            <button
              type="submit"
              disabled={isAiLoading || !inputPrompt.trim()}
              className="px-5 py-2.5 rounded-lg bg-[#F27D26] hover:bg-[#ff8e3c] text-black font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Invent</span>
            </button>
          </form>
        </div>
      )}

      {/* SUB-TAB 3: Deployment CLI Cheat Sheet */}
      {activeSubTab === "cli_cheatsheet" && (
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-lg p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-[#1F1F23]">
            <div>
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#F27D26]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-tight">
                  Cryptocurrency Deployment CLI & Tooling Cheat Sheet
                </h3>
              </div>
              <p className="text-xs text-[#8E9299] mt-0.5">
                Exact bash commands to initialize, compile, fuzz, deploy, and verify smart contracts across EVM, Solana, and Cosmos chains.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Foundry */}
            <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white font-mono">1. Foundry (EVM Preferred)</span>
                <span className="text-[10px] text-green-500 font-mono">Ethereum / Base / Arbitrum</span>
              </div>
              <pre className="p-3 rounded bg-[#16161A] text-[11px] font-mono text-[#E0E0E0] overflow-x-auto whitespace-pre">
{`# 1. Install Foundry
curl -L https://foundry.paradigm.xyz | bash && foundryup

# 2. Initialize project
forge init crypto_project && cd crypto_project
forge install OpenZeppelin/openzeppelin-contracts

# 3. Test & Fuzz
forge test -vvv

# 4. Deploy to Sepolia Testnet
forge create src/Token.sol:NextGenCrypto \\
  --rpc-url $SEPOLIA_RPC \\
  --private-key $PRIVATE_KEY \\
  --verify`}
              </pre>
            </div>

            {/* Hardhat */}
            <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white font-mono">2. Hardhat (Node.js / TS)</span>
                <span className="text-[10px] text-green-500 font-mono">Full-Stack Scripts</span>
              </div>
              <pre className="p-3 rounded bg-[#16161A] text-[11px] font-mono text-[#E0E0E0] overflow-x-auto whitespace-pre">
{`# 1. Install Hardhat
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# 2. Compile Solidity contracts
npx hardhat compile

# 3. Run deployment script
npx hardhat run scripts/deploy.ts --network baseSepolia

# 4. Verify on Etherscan/Basescan
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS>`}
              </pre>
            </div>

            {/* Solana CLI */}
            <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white font-mono">3. Solana SPL Token-2022</span>
                <span className="text-[10px] text-green-500 font-mono">Solana Mainnet & Devnet</span>
              </div>
              <pre className="p-3 rounded bg-[#16161A] text-[11px] font-mono text-[#E0E0E0] overflow-x-auto whitespace-pre">
{`# 1. Configure Devnet
solana config set --url https://api.devnet.solana.com

# 2. Create SPL Token with 9 decimals
spl-token create-token --decimals 9

# 3. Create token account
spl-token create-account <TOKEN_MINT_ADDRESS>

# 4. Mint supply
spl-token mint <TOKEN_MINT_ADDRESS> 1000000000`}
              </pre>
            </div>

            {/* Security Suite */}
            <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white font-mono">4. Security & Static Analysis</span>
                <span className="text-[10px] text-[#F27D26] font-mono">Pre-Deployment Audit</span>
              </div>
              <pre className="p-3 rounded bg-[#16161A] text-[11px] font-mono text-[#E0E0E0] overflow-x-auto whitespace-pre">
{`# 1. Slither automated static vulnerability scan
slither .

# 2. Echidna property-based fuzzing
echidna-test . --contract TestToken

# 3. Mythril symbolic analyzer
myth analyze src/Token.sol --solc-json mythril.config.json`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
