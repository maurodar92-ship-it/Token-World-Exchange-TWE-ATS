import React, { useState } from "react";
import {
  Layers,
  Code2,
  Terminal,
  Activity,
  Database,
  Shield,
  Zap,
  Globe,
  Wallet,
  HardDrive,
  Copy,
  Check,
  ExternalLink,
  Search,
  Sparkles,
  Cpu,
  FileCode,
  Lock,
  ArrowRight,
  RefreshCw,
  Play,
  Share2,
  Coins,
  DollarSign,
  TrendingUp,
  BarChart3,
  Server,
  Key,
  Radio,
  Sliders,
  Send,
  Binary,
  CheckCircle2,
  Workflow,
  Network,
  Cpu as CpuIcon
} from "lucide-react";
import {
  WEB3_FULLSTACK_LAYERS,
  ArchLayerId,
  TechItem,
  validateUserOperationFormat,
  computeSimulatedIpfsCid,
} from "../utils/web3FullStackArchitecture";
import { fossibotMemoryCardClient } from "../utils/fossibotDeviceMemoryCard";

interface Props {
  onOpenSolidityCompiler?: () => void;
  onOpenMetaMaskTransferModal?: (mode?: "send" | "receive") => void;
}

export type CockpitViewMode =
  | "system_topology"
  | "end_to_end_flow"
  | "architecture_layers"
  | "key_patterns";

export const Web3FullStackArchitectureCockpit: React.FC<Props> = ({
  onOpenSolidityCompiler,
  onOpenMetaMaskTransferModal,
}) => {
  const [activeViewMode, setActiveViewMode] = useState<CockpitViewMode>("end_to_end_flow");
  const [selectedLayerId, setSelectedLayerId] = useState<ArchLayerId>("layer1_execution");
  const [selectedTechId, setSelectedTechId] = useState<string>("solidity");
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  // ==========================================
  // END-TO-END FLOW SIMULATOR STATE
  // ==========================================
  const [flowStep, setFlowStep] = useState<number>(1);
  const [isAutomatingFlow, setIsAutomatingFlow] = useState<boolean>(false);
  const [flowTelemetry, setFlowTelemetry] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Pipeline ready: 6-stage end-to-end Web3 architecture initialized.`,
  ]);

  // Step 1: Onboarding
  const [userSmartAccount, setUserSmartAccount] = useState<string>(
    "0x70Ac8a93DAe2F7B8D4151a6C4980665Tree3MaoMao"
  );
  const [onboardingAuthMethod, setOnboardingAuthMethod] = useState<"passkey" | "google_oauth" | "metamask">("passkey");

  // Step 2: Frontend & Query
  const [indexedQueryStatus, setIndexedQueryStatus] = useState<string>("Cached: The Graph Subgraph query (14ms)");

  // Step 3: SP1 zkVM Prover
  const [sp1ProofHash, setSp1ProofHash] = useState<string>("0x70ac8a93dae2f7b8d4151a6c4980665sp1zkstark");
  const [sp1Cycles, setSp1Cycles] = useState<number>(184200);

  // Step 4: Pyth Oracle
  const [pythEthPrice, setPythEthPrice] = useState<number>(3450.82);
  const [pythLatencyMs, setPythLatencyMs] = useState<number>(380);

  // Step 5: On-Chain Settlement
  const [settlementTxHash, setSettlementTxHash] = useState<string>("0x70ac980665dae2f7b8d4151a6c4980665settledorbit");
  const [settlementBlock, setSettlementBlock] = useState<number>(21849200);

  // Step 6: Celestia Data Availability
  const [celestiaBlobHeight, setCelestiaBlobHeight] = useState<number>(1892040);
  const [celestiaGasSavingsPercent, setCelestiaGasSavingsPercent] = useState<number>(99.3);

  // ==========================================
  // INTERACTIVE TOOLS & SIMULATORS STATE
  // ==========================================

  // 1. ERC-4337 UserOperation Simulator
  const [userOpSender, setUserOpSender] = useState<string>("0x70Ac8a93DAe2F7B8D4151a6C4980665Tree3MaoMao");
  const [userOpPaymasterEnabled, setUserOpPaymasterEnabled] = useState<boolean>(true);
  const [userOpCallData, setUserOpCallData] = useState<string>(
    "0xa9059cbb000000000000000000000000recipient0000000000000000000000000000000000000000000000056bc75e2d63100000"
  );
  const [userOpValidation, setUserOpValidation] = useState<{ valid: boolean; errors: string[] } | null>(null);

  // 2. IPFS CID Generator
  const [ipfsContentInput, setIpfsContentInput] = useState<string>(
    JSON.stringify(
      {
        name: "TREE3 Sovereign Quantum Artifact #001",
        description: "Permanent on-chain digital asset engineered by Mauro Lomibao Dar III",
        image: "ipfs://bafybeic70ac8a93dae2f7b8d4151a6c4980665tree3/art.png",
        attributes: [
          { trait_type: "Creator", value: "Taurus King of God Zeus Mao-Mao" },
          { trait_type: "Standard", value: "ERC-721 / ERC-1155" },
          { trait_type: "Supply", value: "1,000,000,000" },
        ],
      },
      null,
      2
    )
  );
  const [generatedCid, setGeneratedCid] = useState<string>(() =>
    computeSimulatedIpfsCid(ipfsContentInput)
  );

  // 3. Chainlink CCIP Cross-Chain Router Simulator
  const [ccipSourceChain, setCcipSourceChain] = useState<string>("Ethereum Mainnet (1)");
  const [ccipDestChain, setCcipDestChain] = useState<string>("Base Mainnet (8453)");
  const [ccipTokenAmount, setCcipTokenAmount] = useState<number>(50000);
  const [ccipSimulatedResult, setCcipSimulatedResult] = useState<any>(null);

  // 4. Pyth Sub-Second Price Oracle Streamer Simulator
  const [pythPriceStream, setPythPriceStream] = useState<{ ethPrice: number; tree3Price: number; conf: number; latencyMs: number }>({
    ethPrice: 3450.82,
    tree3Price: 104.55,
    conf: 0.12,
    latencyMs: 380,
  });

  // 5. EigenLayer Restaking & AVS Yield Simulator
  const [restakeAmountEth, setRestakeAmountEth] = useState<number>(32);
  const [selectedAvsName, setSelectedAvsName] = useState<string>("EigenDA Modular Availability");

  // 6. Celestia Modular Blob Space Cost Calculator
  const [blobSizeBytes, setBlobSizeBytes] = useState<number>(128000);
  const [ethereumL1GasCost, setEthereumL1GasCost] = useState<number>(45.8);
  const [celestiaBlobCost, setCelestiaBlobCost] = useState<number>(0.32);

  // 7. Circle CCTP Cross-Chain Burn/Mint Simulator
  const [cctpAmountUsdc, setCctpAmountUsdc] = useState<number>(25000);
  const [cctpSimResult, setCctpSimResult] = useState<any>(null);

  // 8. SP1 / RISC Zero zkVM Prover Simulator
  const [zkvmInputInt, setZkvmInputInt] = useState<number>(1000000000);
  const [zkvmProofResult, setZkvmProofResult] = useState<any>(null);

  const activeLayer = WEB3_FULLSTACK_LAYERS[selectedLayerId] || WEB3_FULLSTACK_LAYERS.layer1_execution;
  const activeTech = activeLayer.technologies.find((t) => t.id === selectedTechId) || activeLayer.technologies[0];

  const [actionNotification, setActionNotification] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(null), 2500);
  };

  const handleSaveTechToFossibot = (tech: TechItem) => {
    try {
      fossibotMemoryCardClient.saveArtifactToMemoryCard(
        `${tech.name.replace(/[^a-zA-Z0-9]/g, "_")}_snippet.${tech.language}`,
        "SOLIDITY_SRC",
        tech.codeSnippet,
        false
      );
      setActionNotification(`Saved ${tech.name} configuration directly to Fossibot MicroSD Card!`);
      setTimeout(() => setActionNotification(null), 3500);
    } catch (e: any) {
      setActionNotification(`Error saving to Fossibot: ${e?.message}`);
      setTimeout(() => setActionNotification(null), 4000);
    }
  };

  const handleValidateUserOp = () => {
    const userOp = {
      sender: userOpSender,
      nonce: "0x1",
      initCode: "0x",
      callData: userOpCallData,
      callGasLimit: "0x186a0",
      verificationGasLimit: "0x249f0",
      preVerificationGas: "0xc350",
      maxFeePerGas: "0x4a817c800",
      maxPriorityFeePerGas: "0x59682f00",
      paymasterAndData: userOpPaymasterEnabled ? "0x70Ac8a93DAe2F7B8D4151a6C4980665Tree3MaoMao" : "0x",
      signature: "0x70ac...secp256k1",
    };
    const res = validateUserOperationFormat(userOp);
    setUserOpValidation(res);
  };

  const handleGenerateIpfsCid = () => {
    const cid = computeSimulatedIpfsCid(ipfsContentInput);
    setGeneratedCid(cid);
  };

  const handleSimulateCcip = () => {
    const messageId = `0x70ac${Math.random().toString(16).slice(2, 10)}${Date.now().toString(16)}ccipmsg`;
    setCcipSimulatedResult({
      messageId,
      source: ccipSourceChain,
      destination: ccipDestChain,
      tokens: `${ccipTokenAmount.toLocaleString()} TREE3 / USDC`,
      feeUsd: 1.84,
      status: "SUCCESS_DELIVERED",
      executionTimeSeconds: 4.2,
    });
  };

  const handleRefreshPyth = () => {
    setPythPriceStream({
      ethPrice: Number((3440 + Math.random() * 25).toFixed(2)),
      tree3Price: Number((104 + Math.random() * 2).toFixed(2)),
      conf: Number((0.08 + Math.random() * 0.08).toFixed(3)),
      latencyMs: Math.floor(320 + Math.random() * 90),
    });
  };

  const handleSimulateCctp = () => {
    const burnTx = `0x70ac${Math.random().toString(16).slice(2, 10)}burn`;
    const mintTx = `0x70ac${Math.random().toString(16).slice(2, 10)}mint`;
    setCctpSimResult({
      burnTx,
      mintTx,
      amount: cctpAmountUsdc,
      attestationHash: `0xcircleattest${Date.now().toString(16)}`,
      timeSeconds: 6.8,
      status: "NATIVELY_MINTED_DESTINATION",
    });
  };

  const handleExecuteZkvmProof = () => {
    const proofHash = `0x70ac${Math.random().toString(16).slice(2, 10)}${Date.now().toString(16)}zkstark`;
    setZkvmProofResult({
      proofHash,
      cycles: 184920,
      proverTimeMs: 410,
      verifierGas: 94200,
      resultEnergy: (zkvmInputInt * Math.pow(299792, 2)) / 1e10,
    });
  };

  // Automated 6-step flow runner
  const handleRunFullEndToEndSimulation = () => {
    setIsAutomatingFlow(true);
    setFlowStep(1);
    const logs: string[] = [
      `[${new Date().toLocaleTimeString()}] ▶ INITIATING FULL-STACK END-TO-END WEB3 LIFECYCLE`,
    ];
    setFlowTelemetry(logs);

    setTimeout(() => {
      setFlowStep(2);
      logs.unshift(`[${new Date().toLocaleTimeString()}] Stage 1: Authenticated via Privy (${onboardingAuthMethod}). Embedded ERC-4337 Smart Account derived: ${userSmartAccount.slice(0, 10)}...`);
      setFlowTelemetry([...logs]);

      setTimeout(() => {
        setFlowStep(3);
        logs.unshift(`[${new Date().toLocaleTimeString()}] Stage 2: React 19 Frontend + Viem queries indexed reserves from The Graph Subgraph (Latency: 14ms).`);
        setFlowTelemetry([...logs]);

        setTimeout(() => {
          setFlowStep(4);
          logs.unshift(`[${new Date().toLocaleTimeString()}] Stage 3: SP1 zkVM executes off-chain Rust compute. Generated STARK proof (${sp1Cycles.toLocaleString()} cycles).`);
          setFlowTelemetry([...logs]);

          setTimeout(() => {
            setFlowStep(5);
            logs.unshift(`[${new Date().toLocaleTimeString()}] Stage 4: Sub-second Pyth Network price stream injected ($${pythEthPrice} ± 0.12, 380ms latency).`);
            setFlowTelemetry([...logs]);

            setTimeout(() => {
              setFlowStep(6);
              logs.unshift(`[${new Date().toLocaleTimeString()}] Stage 5: MetaMask signs offline via secp256k1; Infura broadcasts to Arbitrum Orbit L3; contract verifies ZK proof & settles on block #${settlementBlock}.`);
              setFlowTelemetry([...logs]);

              setTimeout(() => {
                logs.unshift(`[${new Date().toLocaleTimeString()}] Stage 6: Rollup batch published to Celestia DA (Height #${celestiaBlobHeight}, 99.3% cost reduction). PIPELINE COMPLETE.`);
                setFlowTelemetry([...logs]);
                setIsAutomatingFlow(false);
              }, 800);
            }, 800);
          }, 800);
        }, 800);
      }, 800);
    }, 800);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {actionNotification && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 rounded-xl px-4 py-3 text-emerald-300 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionNotification}</span>
          </div>
          <button onClick={() => setActionNotification(null)} className="text-gray-400 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Overview Banner */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Crypto / Web3 Full-Stack Architecture
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                End-to-End Technology Spectrum
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                L1/L2/L3 • DA • ZK • AA
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Web3 Full-Stack Architectural Engine
            </h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              Synthesizes smart contracts at the execution layer, middleware and data indexing, reactive frontends,
              off-chain compute via SP1 zkVMs, Chainlink & Pyth oracles, EigenLayer restaking, Celestia modular DA,
              and Circle CCTP financial rails.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 min-w-[200px]">
            {onOpenSolidityCompiler && (
              <button
                onClick={onOpenSolidityCompiler}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#F27D26] hover:bg-[#ff8f3d] text-white border border-orange-400/30 transition flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
              >
                <Code2 className="w-4 h-4" />
                Open Solidity Studio
              </button>
            )}
            {onOpenMetaMaskTransferModal && (
              <button
                onClick={() => onOpenMetaMaskTransferModal("send")}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#1E1E24] hover:bg-[#25252D] text-gray-200 border border-[#2B2B33] transition flex items-center justify-center gap-2"
              >
                <Wallet className="w-4 h-4 text-orange-400" />
                MetaMask Web3 Gateway
              </button>
            )}
          </div>
        </div>

        {/* View Mode Mode Switcher */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-[#1F1F23] overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "end_to_end_flow", label: "⚡ End-to-End User Flow (6 Stages)", icon: Workflow },
            { id: "system_topology", label: "🗺️ System Architecture Overview & Topology", icon: Network },
            { id: "key_patterns", label: "💎 4 Key Architectural Patterns", icon: Sparkles },
            { id: "architecture_layers", label: "📚 11 Technology Layers Deep-Dive", icon: Layers },
          ].map((mode) => {
            const Icon = mode.icon;
            const isActive = activeViewMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setActiveViewMode(mode.id as CockpitViewMode)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition ${
                  isActive
                    ? "bg-[#F27D26] text-white shadow-md shadow-orange-500/20"
                    : "bg-[#1E1E24] text-gray-300 hover:bg-[#25252D] hover:text-white border border-[#2B2B33]"
                }`}
              >
                <Icon className="w-4 h-4" />
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: END-TO-END USER FLOW SIMULATOR */}
      {/* ========================================================================= */}
      {activeViewMode === "end_to_end_flow" && (
        <div className="space-y-6">
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Workflow className="w-5 h-5 text-orange-400" />
                  End-to-End User Flow Lifecycle Execution
                </h3>
                <p className="text-xs text-gray-400">
                  Walks through the entire user journey: from Privy passkey onboarding to Celestia Data Availability
                </p>
              </div>

              <button
                onClick={handleRunFullEndToEndSimulation}
                disabled={isAutomatingFlow}
                className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-600/20 transition self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAutomatingFlow ? "animate-spin" : ""}`} />
                {isAutomatingFlow ? "Executing Pipeline..." : "Run Complete End-to-End Simulation"}
              </button>
            </div>

            {/* 6-Stage Progress Stepper */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 pt-2">
              {[
                { step: 1, title: "1. Onboarding", tech: "Privy / Dynamic", desc: "Passkey & ERC-4337" },
                { step: 2, title: "2. Frontend Read", tech: "Wagmi + Viem", desc: "The Graph / Alchemy" },
                { step: 3, title: "3. zkVM Proof", tech: "SP1 (Succinct)", desc: "Off-chain Rust compute" },
                { step: 4, title: "4. Oracle Feed", tech: "Pyth Network", desc: "Sub-second Hermes feed" },
                { step: 5, title: "5. Settlement", tech: "Arbitrum Orbit L3", desc: "MetaMask / Infura RPC" },
                { step: 6, title: "6. DA Posting", tech: "Celestia DA", desc: "99.3% cost reduction" },
              ].map((s) => {
                const isCurrent = flowStep === s.step;
                const isPassed = flowStep > s.step;
                return (
                  <button
                    key={s.step}
                    onClick={() => setFlowStep(s.step)}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      isCurrent
                        ? "bg-orange-500/15 border-orange-500 shadow"
                        : isPassed
                        ? "bg-emerald-500/10 border-emerald-500/30 text-gray-300"
                        : "bg-[#0A0A0C] border-[#1F1F23] text-gray-500"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold font-mono ${isCurrent ? "text-orange-400" : isPassed ? "text-emerald-400" : "text-gray-500"}`}>
                          {s.title}
                        </span>
                        {isPassed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <div className="text-xs font-bold text-white leading-tight">{s.tech}</div>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-2">{s.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Stage Detail Card */}
            <div className="p-5 bg-[#0A0A0C] border border-[#2B2B33] rounded-xl space-y-4">
              {flowStep === 1 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#1F1F23]">
                    <span className="text-xs font-bold text-orange-400">
                      Stage 1: Embedded Onboarding & Account Abstraction (Privy / Dynamic)
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">ERC-4337 Smart Account</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    User authenticates via Privy using passkeys (WebAuthn) or social accounts. An embedded non-custodial
                    ERC-4337 smart account is created without seed phrase friction.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-3 bg-[#16161A] rounded-lg">
                      <span className="text-gray-500 block">Auth Method:</span>
                      <span className="text-cyan-400 font-bold uppercase">{onboardingAuthMethod}</span>
                    </div>
                    <div className="p-3 bg-[#16161A] rounded-lg">
                      <span className="text-gray-500 block">Derived Smart Account:</span>
                      <span className="text-emerald-400 font-bold">{userSmartAccount}</span>
                    </div>
                  </div>
                </div>
              )}

              {flowStep === 2 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#1F1F23]">
                    <span className="text-xs font-bold text-cyan-400">
                      Stage 2: Frontend Query via Wagmi & The Graph Protocol
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">Decentralized Indexing</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    A Next.js interface using Viem & Wagmi reads historical balances and pool reserves indexed in
                    real time by The Graph subgraphs and Alchemy RPC node cache.
                  </p>
                  <div className="p-3 bg-[#16161A] rounded-lg font-mono text-xs text-gray-300">
                    Status: <strong className="text-emerald-400">{indexedQueryStatus}</strong>
                  </div>
                </div>
              )}

              {flowStep === 3 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#1F1F23]">
                    <span className="text-xs font-bold text-amber-400">
                      Stage 3: Off-Chain Compute & Proof Generation (SP1 zkVM by Succinct)
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">Succinct STARK Prover</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Heavy relativistic logic and invariant checks run off-chain in an SP1 zkVM executing arbitrary Rust code.
                    A succinct cryptographic proof is generated for verification on-chain at low gas cost.
                  </p>
                  <div className="p-3 bg-[#16161A] rounded-lg font-mono text-xs text-gray-300 space-y-1">
                    <div>Proof Hash: <span className="text-amber-400">{sp1ProofHash}</span></div>
                    <div>Prover Cost: <span className="text-cyan-400">{sp1Cycles.toLocaleString()} RISC-V cycles</span></div>
                  </div>
                </div>
              )}

              {flowStep === 4 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#1F1F23]">
                    <span className="text-xs font-bold text-indigo-400">
                      Stage 4: Low-Latency Financial Price Feeds (Pyth Network)
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">Sub-Second Pull Oracle</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Financial market prices are dynamically pulled via Pyth Hermes streams directly into the transaction payload,
                    ensuring accurate pricing without stale on-chain oracle latency.
                  </p>
                  <div className="p-3 bg-[#16161A] rounded-lg font-mono text-xs text-gray-300 flex justify-between">
                    <span>ETH / USD: <strong className="text-white">${pythEthPrice}</strong></span>
                    <span>Latency: <strong className="text-emerald-400">{pythLatencyMs} ms</strong></span>
                  </div>
                </div>
              )}

              {flowStep === 5 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#1F1F23]">
                    <span className="text-xs font-bold text-purple-400">
                      Stage 5: Offline Signing & Arbitrum Orbit L3 On-Chain Settlement
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">MetaMask & Infura RPC</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    The user approves the transaction locally. MetaMask signs offline via ECDSA secp256k1; the signed
                    RLP hex is dispatched via Infura JSON-RPC to an Arbitrum Orbit L3, where the contract verifies the ZK proof
                    and finalizes state changes.
                  </p>
                  <div className="p-3 bg-[#16161A] rounded-lg font-mono text-xs text-gray-300 space-y-1">
                    <div>Settlement Tx: <span className="text-purple-400">{settlementTxHash}</span></div>
                    <div>Block Height: <span className="text-emerald-400">#{settlementBlock.toLocaleString()}</span></div>
                  </div>
                </div>
              )}

              {flowStep === 6 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#1F1F23]">
                    <span className="text-xs font-bold text-teal-400">
                      Stage 6: Modular Data Availability Posting (Celestia DA)
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">2D Erasure Coding (DAS)</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    The rollup sequencer packages transaction batches into light cryptographic blobs published to Celestia,
                    ensuring transaction data is verifiable by light nodes at 99%+ gas savings over L1 calldata.
                  </p>
                  <div className="p-3 bg-[#16161A] rounded-lg font-mono text-xs text-gray-300 flex justify-between">
                    <span>Celestia Blob Height: <strong className="text-white">#{celestiaBlobHeight.toLocaleString()}</strong></span>
                    <span>Cost Savings: <strong className="text-emerald-400">{celestiaGasSavingsPercent}% lower</strong></span>
                  </div>
                </div>
              )}
            </div>

            {/* Live Pipeline Telemetry Log */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-300 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                Live Architecture Pipeline Telemetry
              </span>
              <div className="p-3 bg-[#0A0A0C] border border-[#1F1F23] rounded-xl font-mono text-[11px] text-gray-400 space-y-1 max-h-[160px] overflow-y-auto">
                {flowTelemetry.map((log, idx) => (
                  <div key={idx} className={idx === 0 ? "text-emerald-300 font-bold" : ""}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: SYSTEM TOPOLOGY & ARCHITECTURE MAP */}
      {/* ========================================================================= */}
      {activeViewMode === "system_topology" && (
        <div className="space-y-6">
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-[#1F1F23]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Network className="w-5 h-5 text-cyan-400" />
                  System Architecture Overview & Data Flow
                </h3>
                <p className="text-xs text-gray-400">
                  Full stack topology connecting user interfaces, account layers, off-chain compute, and modular DA
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                End-to-End Topology
              </span>
            </div>

            {/* Visual Topography Diagram */}
            <div className="p-6 bg-[#0A0A0C] border border-[#2B2B33] rounded-xl space-y-4 font-mono text-xs">
              {/* Box 1: Application & Frontend */}
              <div className="p-4 bg-[#16161A] border-2 border-cyan-500/40 rounded-xl text-center space-y-1 shadow-lg shadow-cyan-500/10">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest block">
                  1. Application & Frontend
                </span>
                <div className="text-white font-bold text-sm">
                  Next.js / React 19 / Vue • Viem / Wagmi / Ethers.js v6 • RainbowKit / AppKit
                </div>
                <p className="text-[10px] text-gray-400 font-sans">
                  User interfaces, responsive state hooks, wallet connectors, and multi-chain network switchers
                </p>
              </div>

              {/* Arrow */}
              <div className="text-center text-gray-500 font-bold">│ ▼</div>

              {/* Box 2: Split Rows - Onboarding vs Middleware */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-[#16161A] border border-orange-500/40 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider block">
                    2A. Onboarding & Account Layer
                  </span>
                  <div className="text-white font-bold">Privy • Dynamic • AppKit • Safe • Biconomy (ERC-4337)</div>
                  <p className="text-[10px] text-gray-400 font-sans">
                    Passkey authentication, session keys, gas sponsorship paymasters, and multi-sig smart accounts
                  </p>
                </div>

                <div className="p-4 bg-[#16161A] border border-purple-500/40 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
                    2B. Middleware & Data Indexing
                  </span>
                  <div className="text-white font-bold">The Graph • Goldsky • Alchemy • QuickNode • Infura</div>
                  <p className="text-[10px] text-gray-400 font-sans">
                    GraphQL subgraphs, indexed event streams, token balance APIs, and global RPC meshes
                  </p>
                </div>
              </div>

              {/* Arrow */}
              <div className="text-center text-gray-500 font-bold">│ ▼</div>

              {/* Box 3: Off-Chain Compute, Oracles & Storage */}
              <div className="p-4 bg-[#16161A] border border-indigo-500/40 rounded-xl text-center space-y-1">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                  3. Off-Chain Data, Compute & Oracles
                </span>
                <div className="text-white font-bold">
                  Chainlink (CCIP/Feeds) • Pyth Network / RedStone • SP1 / RISC Zero (zkVMs) • EigenLayer / Symbiotic • IPFS / Arweave
                </div>
                <p className="text-[10px] text-gray-400 font-sans">
                  Sub-second price feeds, verifiable Rust zk-proofs, restaked cryptoeconomic security, and content-addressed storage
                </p>
              </div>

              {/* Arrow */}
              <div className="text-center text-gray-500 font-bold">│ ▼</div>

              {/* Box 4: Execution & Settlement */}
              <div className="p-4 bg-[#16161A] border-2 border-emerald-500/40 rounded-xl text-center space-y-1 shadow-lg shadow-emerald-500/10">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest block">
                  4. Execution & Settlement Layer (L1 / L2 / L3)
                </span>
                <div className="text-white font-bold text-sm">
                  EVM (Solidity/Foundry) • Solana (Anchor/Rust) • Move (Aptos/Sui) • Arbitrum Orbit / OP Stack Rollups via RaaS
                </div>
                <p className="text-[10px] text-gray-400 font-sans">
                  On-chain bytecode execution, state transitions, ZK verification, and transaction settlement
                </p>
              </div>

              {/* Arrow */}
              <div className="text-center text-gray-500 font-bold">│ ▼</div>

              {/* Box 5: Data Availability */}
              <div className="p-4 bg-[#16161A] border-2 border-teal-500/40 rounded-xl text-center space-y-1">
                <span className="text-[11px] font-bold text-teal-400 uppercase tracking-widest block">
                  5. Modular Data Availability (DA) Layer
                </span>
                <div className="text-white font-bold text-sm">
                  Celestia • EigenDA • Avail
                </div>
                <p className="text-[10px] text-gray-400 font-sans">
                  2D Reed-Solomon Erasure Coding & Data Availability Sampling (DAS) guaranteeing data availability at &lt;1% the cost
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: 4 KEY ARCHITECTURAL PATTERNS */}
      {/* ========================================================================= */}
      {activeViewMode === "key_patterns" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pattern 1 */}
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 font-bold font-mono flex items-center justify-center text-sm border border-teal-500/30">
                1
              </span>
              <h3 className="text-base font-bold text-white">
                Decoupled Execution & Data Availability (DA)
              </h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Traditional blockchains bundle execution, settlement, consensus, and data availability into a monolithic chain.
              Rollups execute off-chain and post light cryptographic proofs or transaction data to specialized DA layers (Celestia, EigenDA)
              to decouple data publishing from execution, slashing gas overhead by up to 99.3%.
            </p>
            <div className="p-3 bg-[#0A0A0C] border border-[#2B2B33] rounded-xl text-[11px] font-mono text-teal-400 space-y-1">
              <div>• Mechanism: Data Availability Sampling (DAS) via Light Nodes</div>
              <div>• Providers: Celestia, EigenDA, Avail, AnyTrust</div>
            </div>
          </div>

          {/* Pattern 2 */}
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-300 font-bold font-mono flex items-center justify-center text-sm border border-orange-500/30">
                2
              </span>
              <h3 className="text-base font-bold text-white">
                Account Abstraction (ERC-4337)
              </h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Smart contract wallets replace traditional single-key EOAs (Externally Owned Accounts). Users benefit from
              programmable validation logic, session keys for zero-popup gaming/trading, gas sponsorship (paymasters),
              social recovery, and WebAuthn passkey signatures without compromising non-custodial ownership.
            </p>
            <div className="p-3 bg-[#0A0A0C] border border-[#2B2B33] rounded-xl text-[11px] font-mono text-orange-400 space-y-1">
              <div>• Mechanism: UserOperations dispatched to Alto/ZeroDev Bundlers</div>
              <div>• Providers: ZeroDev Kernel v3, Biconomy, Safe, Pimlico</div>
            </div>
          </div>

          {/* Pattern 3 */}
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-300 font-bold font-mono flex items-center justify-center text-sm border border-pink-500/30">
                3
              </span>
              <h3 className="text-base font-bold text-white">
                Shared Security & Restaking
              </h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Bootstrapping a new Proof-of-Stake consensus network requires billions in capital. Restaking protocol designs (EigenLayer, Symbiotic, Karak)
              reuse existing staked ETH or multi-asset collateral (USDC, ERC-20s) to secure off-chain oracles, bridges, sidechains, and AVSs,
              extending Ethereum's tens-of-billions cryptoeconomic security blanket.
            </p>
            <div className="p-3 bg-[#0A0A0C] border border-[#2B2B33] rounded-xl text-[11px] font-mono text-pink-400 space-y-1">
              <div>• Mechanism: Actively Validated Services (AVSs) with Slashing Conditions</div>
              <div>• Providers: EigenLayer, Symbiotic, Karak Network</div>
            </div>
          </div>

          {/* Pattern 4 */}
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 font-bold font-mono flex items-center justify-center text-sm border border-amber-500/30">
                4
              </span>
              <h3 className="text-base font-bold text-white">
                Off-Chain Compute & Zero-Knowledge Proofs
              </h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Complex mathematical evaluations (e.g. Einstein-Dar Logic Field Formula, institutional risk modeling, private identity checks)
              cost millions of gas on EVM. General-purpose zkVMs (SP1, RISC Zero) execute arbitrary Rust off-chain and output succinct
              cryptographic proofs verified on-chain in single-step operations.
            </p>
            <div className="p-3 bg-[#0A0A0C] border border-[#2B2B33] rounded-xl text-[11px] font-mono text-amber-400 space-y-1">
              <div>• Mechanism: STARK-to-SNARK Prover with Constant-Time EVM Verifier</div>
              <div>• Providers: SP1 (Succinct), RISC Zero, Circom, Noir (Aztec)</div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 4: 11 TECHNOLOGY LAYERS DEEP-DIVE */}
      {/* ========================================================================= */}
      {activeViewMode === "architecture_layers" && (
        <div className="space-y-6">
          {/* Stepper Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-11 gap-2">
            {Object.values(WEB3_FULLSTACK_LAYERS).map((layer) => {
              const isSelected = selectedLayerId === layer.id;
              return (
                <button
                  key={layer.id}
                  onClick={() => {
                    setSelectedLayerId(layer.id);
                    setSelectedTechId(layer.technologies[0].id);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    isSelected
                      ? "bg-[#1E1E24] border-orange-500 shadow-md shadow-orange-500/10"
                      : "bg-[#0A0A0C] border-[#1F1F23] hover:border-gray-700"
                  }`}
                >
                  <div>
                    <div className="text-[9px] font-bold tracking-wider uppercase text-orange-400 font-mono">
                      L{layer.layerNumber}
                    </div>
                    <div className="text-xs font-bold text-white leading-tight line-clamp-1 mt-0.5">
                      {layer.title.split(" ")[0]}
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-2 font-mono">
                    {layer.technologies.length} Techs
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Tech Selector */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#1F1F23]">
                  <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                    Layer {activeLayer.layerNumber}: {activeLayer.title}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {activeLayer.technologies.length} stacks
                  </span>
                </div>

                <div className="space-y-2">
                  {activeLayer.technologies.map((tech) => {
                    const isSelected = selectedTechId === tech.id;
                    return (
                      <button
                        key={tech.id}
                        onClick={() => setSelectedTechId(tech.id)}
                        className={`w-full p-3.5 rounded-xl border text-left transition flex items-start justify-between gap-3 ${
                          isSelected
                            ? "bg-[#1E1E24] border-orange-500 shadow"
                            : "bg-[#0A0A0C] border-[#1F1F23] hover:border-gray-700 text-gray-300"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{tech.name}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${tech.badgeColor}`}>
                              {tech.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 line-clamp-2">{tech.description}</p>
                        </div>
                        <ArrowRight className={`w-4 h-4 mt-1 transition ${isSelected ? "text-orange-400" : "text-gray-600"}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Code Workspace */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-[#16161A] border border-[#1F1F23] rounded-2xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1F1F23]">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">{activeTech.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${activeTech.badgeColor}`}>
                        {activeTech.category}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">{activeTech.description}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSaveTechToFossibot(activeTech)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <HardDrive className="w-3.5 h-3.5" />
                      Save to Fossibot Card
                    </button>
                    <button
                      onClick={() => handleCopy(activeTech.codeSnippet, activeTech.id)}
                      className="px-3 py-1.5 rounded-lg bg-[#1E1E24] hover:bg-[#25252D] text-gray-300 border border-[#2B2B33] text-xs font-semibold flex items-center gap-1 transition"
                    >
                      {copiedLabel === activeTech.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedLabel === activeTech.id ? "Copied" : "Copy Code"}
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <div className="p-4 bg-[#0A0A0C] border border-[#1F1F23] rounded-xl font-mono text-xs text-emerald-300/90 overflow-x-auto max-h-[440px] leading-relaxed">
                    <pre>{activeTech.codeSnippet}</pre>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 text-xs text-gray-500">
                  <span>Language: <strong className="text-gray-300 uppercase font-mono">{activeTech.language}</strong></span>
                  <a
                    href={activeTech.docUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-orange-400 hover:text-orange-300 flex items-center gap-1 font-semibold"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Official Documentation
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
