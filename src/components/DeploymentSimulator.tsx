import React, { useState, useMemo, useEffect } from "react";
import {
  Activity,
  Gauge,
  Cpu,
  Layers,
  Shield,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Play,
  RotateCcw,
  Download,
  Terminal,
  Code2,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Clock,
  Coins,
  Globe,
  ArrowRight,
  FileCode,
  Sliders,
  CheckCheck,
  FileJson,
} from "lucide-react";
import { TokenRecord, TokenStandard, SimulatedGasBreakdown, SimulationSuccessMetrics, DeploymentSimulationResult } from "../types";
import { NFTMetadataModal } from "./NFTMetadataModal";

interface NetworkProfile {
  id: string;
  name: string;
  chainId: number;
  currency: string;
  nativePriceUsd: number;
  baseFeeGwei: number;
  priorityFeeGwei: number;
  blockTimeSec: number;
  isL2Rollup: boolean;
  l1DataGasMultiplier: number;
  reorgRiskScore: number; // 0 (lowest) to 10 (highest)
  mempoolCongestionBaseline: number; // percentage
  rpcUrl: string;
  explorerUrl: string;
  badgeClass: string;
}

const SUPPORTED_NETWORKS: NetworkProfile[] = [
  {
    id: "ethereum",
    name: "Ethereum Mainnet",
    chainId: 1,
    currency: "ETH",
    nativePriceUsd: 3120,
    baseFeeGwei: 28.5,
    priorityFeeGwei: 2.0,
    blockTimeSec: 12.0,
    isL2Rollup: false,
    l1DataGasMultiplier: 0,
    reorgRiskScore: 1.5,
    mempoolCongestionBaseline: 65,
    rpcUrl: "https://eth-mainnet.alchemyapi.io/v2/demo",
    explorerUrl: "https://etherscan.io",
    badgeClass: "bg-[#16161A] text-slate-300 border-[#2A2A32]",
  },
  {
    id: "base",
    name: "Base L2 (Coinbase)",
    chainId: 8453,
    currency: "ETH",
    nativePriceUsd: 3120,
    baseFeeGwei: 0.008,
    priorityFeeGwei: 0.001,
    blockTimeSec: 2.0,
    isL2Rollup: true,
    l1DataGasMultiplier: 42000,
    reorgRiskScore: 0.5,
    mempoolCongestionBaseline: 30,
    rpcUrl: "https://mainnet.base.org",
    explorerUrl: "https://basescan.org",
    badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  {
    id: "arbitrum",
    name: "Arbitrum One",
    chainId: 42161,
    currency: "ETH",
    nativePriceUsd: 3120,
    baseFeeGwei: 0.12,
    priorityFeeGwei: 0.02,
    blockTimeSec: 0.25,
    isL2Rollup: true,
    l1DataGasMultiplier: 32000,
    reorgRiskScore: 0.6,
    mempoolCongestionBaseline: 35,
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    explorerUrl: "https://arbiscan.io",
    badgeClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  },
  {
    id: "polygon",
    name: "Polygon PoS",
    chainId: 137,
    currency: "POL",
    nativePriceUsd: 0.42,
    baseFeeGwei: 35.0,
    priorityFeeGwei: 28.0,
    blockTimeSec: 2.1,
    isL2Rollup: false,
    l1DataGasMultiplier: 0,
    reorgRiskScore: 3.2,
    mempoolCongestionBaseline: 55,
    rpcUrl: "https://polygon-rpc.com",
    explorerUrl: "https://polygonscan.com",
    badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  },
  {
    id: "bsc",
    name: "BNB Smart Chain",
    chainId: 56,
    currency: "BNB",
    nativePriceUsd: 585,
    baseFeeGwei: 3.0,
    priorityFeeGwei: 1.0,
    blockTimeSec: 3.0,
    isL2Rollup: false,
    l1DataGasMultiplier: 0,
    reorgRiskScore: 1.8,
    mempoolCongestionBaseline: 45,
    rpcUrl: "https://bsc-dataseed.binance.org",
    explorerUrl: "https://bscscan.com",
    badgeClass: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  },
  {
    id: "optimism",
    name: "OP Mainnet",
    chainId: 10,
    currency: "ETH",
    nativePriceUsd: 3120,
    baseFeeGwei: 0.005,
    priorityFeeGwei: 0.001,
    blockTimeSec: 2.0,
    isL2Rollup: true,
    l1DataGasMultiplier: 40000,
    reorgRiskScore: 0.5,
    mempoolCongestionBaseline: 28,
    rpcUrl: "https://mainnet.optimism.io",
    explorerUrl: "https://optimistic.etherscan.io",
    badgeClass: "bg-red-500/10 text-red-400 border-red-500/20",
  },
  {
    id: "sepolia",
    name: "Sepolia Testnet",
    chainId: 11155111,
    currency: "SepoliaETH",
    nativePriceUsd: 0,
    baseFeeGwei: 14.2,
    priorityFeeGwei: 1.5,
    blockTimeSec: 12.0,
    isL2Rollup: false,
    l1DataGasMultiplier: 0,
    reorgRiskScore: 2.0,
    mempoolCongestionBaseline: 40,
    rpcUrl: "https://rpc.sepolia.org",
    explorerUrl: "https://sepolia.etherscan.io",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  {
    id: "quantum",
    name: "Quantum-Hybrid L2",
    chainId: 7777,
    currency: "QETH",
    nativePriceUsd: 1.0,
    baseFeeGwei: 0.0001,
    priorityFeeGwei: 0.00001,
    blockTimeSec: 0.01,
    isL2Rollup: true,
    l1DataGasMultiplier: 5000,
    reorgRiskScore: 0.05,
    mempoolCongestionBaseline: 5,
    rpcUrl: "https://quantum-node.omni-id.io",
    explorerUrl: "https://quantumscan.io",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
];

interface ContractArchetype {
  id: string;
  name: string;
  symbol: string;
  standard: TokenStandard;
  bytecodeSizeBytes: number;
  complexityFactor: number;
  constructorGasBase: number;
  description: string;
  features: string[];
}

const CONTRACT_PRESETS: ContractArchetype[] = [
  {
    id: "uncapped_erc20",
    name: "Uncapped Continuous ERC-20",
    symbol: "INFT",
    standard: "ERC-20",
    bytecodeSizeBytes: 8520,
    complexityFactor: 1.25,
    constructorGasBase: 1680000,
    description: "Solidity 0.8.24 uncapped protocol minting up to EVM 256-bit limit (2^256 - 1) with AccessControl & EIP-2612 Permit.",
    features: ["AccessControl Admin & Minter", "ERC20Permit Signatures", "ERC20Burnable", "Continuous 2^256 Ceiling"],
  },
  {
    id: "dynamic_erc721",
    name: "Dynamic Continuous ERC-721",
    symbol: "DNFT",
    standard: "ERC-721",
    bytecodeSizeBytes: 11450,
    complexityFactor: 1.45,
    constructorGasBase: 2240000,
    description: "OpenZeppelin 5.0 continuous NFT issuance engine with sequential _nextTokenId and unbounded safeMinting.",
    features: ["ERC-721 Standard", "Ownable2Step", "Continuous _nextTokenId", "Batch SafeMint Logic"],
  },
  {
    id: "uncapped_erc1155",
    name: "Uncapped Multi-Token ERC-1155",
    symbol: "MTK1155",
    standard: "ERC-1155",
    bytecodeSizeBytes: 9880,
    complexityFactor: 1.35,
    constructorGasBase: 1980000,
    description: "Multi-token unbounded protocol supporting single & batch minting across arbitrary token classes without total caps.",
    features: ["Multi-Token Standard", "URI Dynamic Storage", "Unbounded mintBatch", "Granular Access Roles"],
  },
  {
    id: "fixed_erc20",
    name: "Standard Fixed-Cap Genesis ERC-20",
    symbol: "CAP20",
    standard: "ERC-20",
    bytecodeSizeBytes: 5420,
    complexityFactor: 1.0,
    constructorGasBase: 1190000,
    description: "Lightweight, gas-optimized standard ERC-20 token with fixed initial genesis supply minted to deployer.",
    features: ["Standard ERC-20", "Ownable2Step", "Genesis Allocation", "Low Bytecode Footprint"],
  },
  {
    id: "quantum_hybrid",
    name: "Quantum-Resistant Hybrid Token",
    symbol: "QRX",
    standard: "Quantum-Hybrid",
    bytecodeSizeBytes: 14890,
    complexityFactor: 1.8,
    constructorGasBase: 2790000,
    description: "Post-quantum cryptographic state verification with lattice-based signature hooks and multi-signature security.",
    features: ["Lattice Proof Hooks", "ERC-4337 Account Abstraction", "Quantum Entropy Beacon", "Dual-Layer Key Ring"],
  },
];

interface DeploymentSimulatorProps {
  tokens?: TokenRecord[];
  onSelectToken?: (token: TokenRecord) => void;
}

export const DeploymentSimulator: React.FC<DeploymentSimulatorProps> = ({
  tokens = [],
  onSelectToken,
}) => {
  // Selection States
  const [selectedNetworkId, setSelectedNetworkId] = useState<string>("ethereum");
  const [selectedContractPresetId, setSelectedContractPresetId] = useState<string>("uncapped_erc20");
  const [selectedCustomTokenId, setSelectedCustomTokenId] = useState<string>("");
  const [congestionMultiplier, setCongestionMultiplier] = useState<number>(1.0); // 0.5x to 3.5x
  const [optimizerRuns, setOptimizerRuns] = useState<number>(200);

  // Ethers Simulation States
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationStep, setSimulationStep] = useState<number>(0);
  const [simulatedReceipt, setSimulatedReceipt] = useState<DeploymentSimulationResult | null>(null);
  const [copiedTextKey, setCopiedTextKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"simulator" | "multi_chain_matrix" | "ethers_code" | "logs">("simulator");
  const [showNFTMetadataModal, setShowNFTMetadataModal] = useState<boolean>(false);

  // Simulated Ethers Terminal Logs
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "ethers.js v6.13.2 simulation runtime ready.",
    "Provider interface initialized for EVM bytecode gas analysis.",
    "Select target network and contract archetype to run interactive dry-run.",
  ]);

  // Active Network
  const activeNetwork = useMemo(() => {
    return SUPPORTED_NETWORKS.find((n) => n.id === selectedNetworkId) || SUPPORTED_NETWORKS[0];
  }, [selectedNetworkId]);

  // Active Contract Archetype
  const activeContract = useMemo(() => {
    if (selectedCustomTokenId && tokens.length > 0) {
      const customToken = tokens.find((t) => t.id === selectedCustomTokenId);
      if (customToken) {
        return {
          id: customToken.id,
          name: customToken.name,
          symbol: customToken.symbol,
          standard: customToken.tokenStandard,
          bytecodeSizeBytes: customToken.tokenStandard === "ERC-721" ? 11450 : customToken.tokenStandard === "ERC-1155" ? 9880 : 8520,
          complexityFactor: 1.25,
          constructorGasBase: 1650000,
          description: `Custom Token Vault Asset (${customToken.name} - ${customToken.symbol})`,
          features: [customToken.narrative, customToken.launchStatus, `${customToken.decimals} Decimals`],
        };
      }
    }
    return CONTRACT_PRESETS.find((c) => c.id === selectedContractPresetId) || CONTRACT_PRESETS[0];
  }, [selectedContractPresetId, selectedCustomTokenId, tokens]);

  const activeTokenRecord = useMemo<TokenRecord>(() => {
    if (selectedCustomTokenId) {
      const found = tokens.find((t) => t.id === selectedCustomTokenId);
      if (found) return found;
    }
    if (tokens.length > 0) return tokens[0];
    return {
      id: "sim_preset_1",
      name: activeContract.name,
      symbol: activeContract.name.split(" ")[0].toUpperCase() || "SIM",
      chain: (activeNetwork.id as any) || "ethereum",
      networkId: activeNetwork.chainId,
      contractAddress: "0x5AFE0000A192e4C38148386348612EadD997C0RP",
      isVanity: true,
      contractArchetype: "Enterprise Transparent Upgradeable Proxy (EIP-1967)",
      isEnterprise: true,
      enterpriseSalt: "0x0000000000000000000000000000000000000000000000000000000000005afe",
      enterpriseTier: "Tier-1 Institutional",
      tokenId: "1",
      tokenStandard: activeContract.standard,
      narrative: "quantum_defi",
      launchStatus: "Deployed",
      initialSupply: "1,000,000",
      decimals: 18,
      marketCap: 1250000,
      priceUsd: 1.25,
      liquidityPair: "SIM/ETH",
      holderCount: 840,
      auditFirm: "OpenZeppelin",
      securityScore: 98,
      createdAt: new Date().toISOString(),
      creationTx: "0x" + "0".repeat(64),
      deployerAddress: "0x5AFE48a2F594f8E619E63B09Cd4D64593C1fC891",
    };
  }, [selectedCustomTokenId, tokens, activeContract, activeNetwork]);

  // Gas Calculations
  const gasEstimates = useMemo<SimulatedGasBreakdown>(() => {
    const baseFee = activeNetwork.baseFeeGwei * congestionMultiplier;
    const priorityFee = activeNetwork.priorityFeeGwei * Math.max(1, congestionMultiplier * 0.8);
    const effectivePriceGwei = baseFee + priorityFee;

    // Bytecode size effect: EIP-170 code deposit gas = 200 gas per byte
    // Intrinsic transaction cost = 21,000 gas
    const intrinsicGas = 21000;
    const codeDepositGas = Math.round(activeContract.bytecodeSizeBytes * 200);
    
    // Optimizer reduction (higher runs decreases runtime gas, increases deployment size slightly; typical sweet spot: 200)
    const optimizerFactor = optimizerRuns >= 1000 ? 0.94 : optimizerRuns >= 200 ? 0.97 : 1.0;
    const executionGas = Math.round(activeContract.constructorGasBase * activeContract.complexityFactor * optimizerFactor);
    
    // L1 Data fee for rollups
    const l1DataFeeGas = activeNetwork.isL2Rollup ? activeNetwork.l1DataGasMultiplier : 0;
    const totalGasUnits = intrinsicGas + codeDepositGas + executionGas + l1DataFeeGas;

    // Native cost calculation: gasUnits * (effectivePriceGwei * 1e-9)
    const nativeCost = (totalGasUnits * effectivePriceGwei) / 1e9;
    const usdCost = nativeCost * activeNetwork.nativePriceUsd;

    return {
      intrinsicGas,
      codeDepositGas,
      executionGas,
      l1DataFeeGas,
      totalGasUnits,
      baseFeeGwei: Number(baseFee.toFixed(4)),
      priorityFeeGwei: Number(priorityFee.toFixed(4)),
      effectiveGasPriceGwei: Number(effectivePriceGwei.toFixed(4)),
      nativeCost: Number(nativeCost.toFixed(6)),
      nativeSymbol: activeNetwork.currency,
      usdCost: Number(usdCost.toFixed(4)),
    };
  }, [activeNetwork, activeContract, congestionMultiplier, optimizerRuns]);

  // Success Rate Metrics Calculation
  const successMetrics = useMemo<SimulationSuccessMetrics>(() => {
    // 1. Code size safety: EIP-170 limit is 24,576 bytes
    const maxBytecodeLimit = 24576;
    const sizeRatio = activeContract.bytecodeSizeBytes / maxBytecodeLimit;
    const codeSizeSafetyScore = Number((Math.max(0, 1 - sizeRatio * 0.6) * 100).toFixed(1));

    // 2. Block gas safety: Standard block limit is 30M gas
    const blockGasLimit = activeNetwork.isL2Rollup ? 60000000 : 30000000;
    const gasRatio = gasEstimates.totalGasUnits / blockGasLimit;
    const blockGasSafetyScore = Number((Math.max(0, 1 - gasRatio * 1.5) * 100).toFixed(1));

    // 3. Mempool clearance: Congestion degrades clearance probability
    const effectiveCongestion = Math.min(100, activeNetwork.mempoolCongestionBaseline * congestionMultiplier);
    const mempoolClearanceProbability = Number(Math.max(75, 100 - (effectiveCongestion * 0.18)).toFixed(1));

    // 4. RPC Latency & Re-org Resilience
    const rpcLatencyResilience = Number((99.5 - (activeNetwork.reorgRiskScore * 1.1)).toFixed(1));

    // Weighted composite success rate
    const compositeScore = (
      codeSizeSafetyScore * 0.30 +
      blockGasSafetyScore * 0.25 +
      mempoolClearanceProbability * 0.30 +
      rpcLatencyResilience * 0.15
    );

    const overallSuccessRate = Number(Math.min(99.9, Math.max(82.0, compositeScore)).toFixed(1));

    const riskFactors: string[] = [];
    const recommendations: string[] = [];

    if (congestionMultiplier > 2.0) {
      riskFactors.push(`High mempool congestion (${congestionMultiplier}x surge) may cause replacement transaction timeout.`);
      recommendations.push("Increase maxPriorityFeePerGas by 25-50% to ensure top-of-block priority.");
    }
    if (sizeRatio > 0.6) {
      riskFactors.push(`Bytecode size (${activeContract.bytecodeSizeBytes} bytes) consumes ${(sizeRatio * 100).toFixed(0)}% of EIP-170 max.`);
      recommendations.push("Enable Solidity optimizer (runs=200+) or consider diamond proxy pattern for future extensions.");
    } else {
      recommendations.push("Bytecode footprint well within EVM limits; safe for atomic direct deployment.");
    }

    if (activeNetwork.isL2Rollup) {
      recommendations.push("L2 batch finalization verifies within seconds with ultra-low sub-cent gas fees.");
    } else if (activeNetwork.id === "ethereum") {
      riskFactors.push("L1 base fee variance can cause gas price spikes during high network traffic.");
      recommendations.push("Broadcast during low-traffic windows (e.g. UTC 02:00 - 06:00) to minimize ETH outlay.");
    }

    return {
      overallSuccessRate,
      mempoolClearanceProbability,
      codeSizeSafetyScore,
      blockGasSafetyScore,
      rpcLatencyResilience,
      riskFactors,
      recommendations,
    };
  }, [activeContract, activeNetwork, gasEstimates, congestionMultiplier]);

  // Execute Interactive Ethers Deployment Simulation
  const handleExecuteSimulation = () => {
    setIsSimulating(true);
    setSimulationStep(1);
    setSimulatedReceipt(null);

    const cleanSym = activeContract.symbol.replace(/[^a-zA-Z0-9]/g, "");
    const mockFrom = "0x71C8364862088029F741C89F30C66567584143a9";
    const mockNonce = Math.floor(Math.random() * 45 + 1);
    const mockTxHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    const mockContractAddress = "0x" + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

    const timestamp = () => new Date().toLocaleTimeString();

    setTerminalLogs((prev) => [
      `[${timestamp()}] [ethers.provider.getNetwork()] Connecting to ${activeNetwork.name} (Chain ID: ${activeNetwork.chainId})...`,
      `[${timestamp()}] → RPC Handshake OK. Block #${Math.floor(21850000 + Math.random() * 5000)} | Latency: ${activeNetwork.blockTimeSec * 100}ms`,
    ]);

    setTimeout(() => {
      setSimulationStep(2);
      setTerminalLogs((prev) => [
        ...prev,
        `[${timestamp()}] [ethers.provider.getFeeData()] Fetching latest EIP-1559 fee history...`,
        `[${timestamp()}] → baseFee: ${gasEstimates.baseFeeGwei} Gwei | priorityFee: ${gasEstimates.priorityFeeGwei} Gwei | effective: ${gasEstimates.effectiveGasPriceGwei} Gwei`,
      ]);
    }, 600);

    setTimeout(() => {
      setSimulationStep(3);
      setTerminalLogs((prev) => [
        ...prev,
        `[${timestamp()}] [ethers.provider.estimateGas(deployTx)] Dry-running EVM opcode execution trace...`,
        `[${timestamp()}] → Bytecode Size: ${activeContract.bytecodeSizeBytes} bytes | Estimated Gas Units: ${gasEstimates.totalGasUnits.toLocaleString()} gas`,
      ]);
    }, 1200);

    setTimeout(() => {
      setSimulationStep(4);
      setTerminalLogs((prev) => [
        ...prev,
        `[${timestamp()}] [ethers.getContractFactory("${cleanSym}")] Packaging ABI & Bytecode with deployer ${mockFrom} (Nonce: ${mockNonce})...`,
        `[${timestamp()}] → Broadcasting deployment transaction payload to mempool... (Hash: ${mockTxHash.slice(0, 18)}...)`,
      ]);
    }, 1800);

    setTimeout(() => {
      setSimulationStep(5);
      const receipt: DeploymentSimulationResult = {
        network: activeNetwork.name,
        chainId: activeNetwork.chainId,
        contractName: activeContract.name,
        contractStandard: activeContract.standard,
        bytecodeSize: activeContract.bytecodeSizeBytes,
        gasBreakdown: gasEstimates,
        successMetrics,
        estimatedTxHash: mockTxHash,
        deployedAddress: mockContractAddress,
        timestamp: new Date().toISOString(),
      };

      setSimulatedReceipt(receipt);
      setIsSimulating(false);
      setTerminalLogs((prev) => [
        ...prev,
        `[${timestamp()}] [tx.waitForDeployment()] Block mined! 1 Confirmation received.`,
        `[${timestamp()}] ✓ Contract successfully deployed at: ${mockContractAddress}`,
        `[${timestamp()}] ✓ Total Gas Consumed: ${gasEstimates.totalGasUnits.toLocaleString()} units | Total Cost: ${gasEstimates.nativeCost} ${gasEstimates.nativeSymbol} ($${gasEstimates.usdCost.toFixed(2)})`,
        `[${timestamp()}] ✓ Simulation Complete. Reliability Index: ${successMetrics.overallSuccessRate}%`,
      ]);
    }, 2500);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTextKey(key);
    setTimeout(() => setCopiedTextKey(null), 2000);
  };

  const handleDownloadReport = () => {
    const reportData = {
      timestamp: new Date().toISOString(),
      network: activeNetwork,
      contractArchetype: activeContract,
      gasEstimates,
      successMetrics,
      simulatedReceipt,
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `deployment-simulation-${activeNetwork.id}-${activeContract.symbol}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Ethers.js v6 Deployment Script Code
  const generatedEthersScript = useMemo(() => {
    const cleanSym = activeContract.symbol.replace(/[^a-zA-Z0-9]/g, "");
    return `// ==============================================================================
// ethers.js v6 - Automated Gas Estimation & Deployment Script
// Target Network: ${activeNetwork.name} (Chain ID: ${activeNetwork.chainId})
// Contract: ${activeContract.name} (${activeContract.standard})
// ==============================================================================
const { ethers } = require("hardhat");

async function main() {
  console.log("=== Initializing ethers.js v6 Deployment Simulator ===");
  
  // 1. Connect Provider & Validate Network
  const provider = ethers.provider;
  const network = await provider.getNetwork();
  console.log(\`Connected to: \${network.name} (Chain ID: \${network.chainId})\`);

  // 2. Fetch Real-time Fee Data (EIP-1559)
  const feeData = await provider.getFeeData();
  console.log("Base Fee (Gwei):", ethers.formatUnits(feeData.maxFeePerGas || 0n, "gwei"));
  console.log("Priority Fee (Gwei):", ethers.formatUnits(feeData.maxPriorityFeePerGas || 0n, "gwei"));

  // 3. Load Contract Factory & Bytecode
  const ContractFactory = await ethers.getContractFactory("${cleanSym}");
  
  // 4. Simulate Gas Estimation
  const deployTx = await ContractFactory.getDeployTransaction("${activeContract.name}", "${activeContract.symbol}");
  const estimatedGas = await provider.estimateGas(deployTx);
  console.log(\`Estimated Gas Units: \${estimatedGas.toString()} units\`);

  const effectiveGasPrice = feeData.maxFeePerGas || ethers.parseUnits("${gasEstimates.effectiveGasPriceGwei}", "gwei");
  const estimatedTotalCostWei = estimatedGas * effectiveGasPrice;
  console.log(\`Estimated Total Cost: \${ethers.formatEther(estimatedTotalCostWei)} ${activeNetwork.currency}\`);

  // 5. Execute Deployment
  console.log("Broadcasting deployment transaction...");
  const contract = await ContractFactory.deploy("${activeContract.name}", "${activeContract.symbol}", {
    maxFeePerGas: feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
  });

  console.log(\`Transaction Hash: \${contract.deploymentTransaction()?.hash}\`);
  await contract.waitForDeployment();

  const deployedAddress = await contract.getAddress();
  console.log(\`✓ \${contract.name || "${cleanSym}"} successfully deployed to: \${deployedAddress}\`);
}

main().catch((error) => {
  console.error("Simulation failed:", error);
  process.exitCode = 1;
});
`;
  }, [activeNetwork, activeContract, gasEstimates]);

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#F27D26]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-[#F27D26]/10 border border-[#F27D26]/30 text-[#F27D26]">
                <Gauge className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>Ethers Deployment Simulator</span>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                  ethers.js v6
                </span>
              </h1>
            </div>
            <p className="text-xs text-[#8E9299] mt-1.5 font-mono max-w-2xl">
              Simulate gas cost estimations, EVM code deposit boundaries, and deployment success rates for continuous and fixed-supply token contracts across multi-chain EVM networks.
            </p>
          </div>

          {/* Quick Action Navigation */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("simulator")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                activeTab === "simulator"
                  ? "bg-[#0A0A0C] text-white border border-[#F27D26] shadow-sm"
                  : "bg-[#0A0A0C] text-[#8E9299] border border-[#1F1F23] hover:text-white"
              }`}
            >
              Interactive Simulator
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("multi_chain_matrix")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                activeTab === "multi_chain_matrix"
                  ? "bg-[#0A0A0C] text-[#F27D26] border border-[#F27D26] shadow-sm font-bold"
                  : "bg-[#0A0A0C] text-[#8E9299] border border-[#1F1F23] hover:text-white"
              }`}
            >
              Multi-Chain Matrix
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ethers_code")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                activeTab === "ethers_code"
                  ? "bg-[#0A0A0C] text-cyan-400 border border-cyan-500 shadow-sm font-bold"
                  : "bg-[#0A0A0C] text-[#8E9299] border border-[#1F1F23] hover:text-white"
              }`}
            >
              Ethers Script
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("logs")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                activeTab === "logs"
                  ? "bg-[#0A0A0C] text-purple-400 border border-purple-500 shadow-sm font-bold"
                  : "bg-[#0A0A0C] text-[#8E9299] border border-[#1F1F23] hover:text-white"
              }`}
            >
              Ethers Terminal
            </button>
          </div>
        </div>
      </div>

      {activeTab === "simulator" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Network & Contract Controls (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Target Network Selector */}
            <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 shadow-xl space-y-3 font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-[#1F1F23]">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#F27D26]" />
                  <span className="text-xs font-bold text-white uppercase">1. Select Target Network</span>
                </div>
                <span className="text-[10px] text-[#8E9299]">EIP-1559 Dynamic Gas</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SUPPORTED_NETWORKS.map((network) => {
                  const isSelected = network.id === selectedNetworkId;
                  return (
                    <button
                      key={network.id}
                      type="button"
                      onClick={() => setSelectedNetworkId(network.id)}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#F27D26]/10 border-[#F27D26] text-white shadow-sm"
                          : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white hover:bg-[#1A1A20]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase">{network.currency}</span>
                        <span className="text-[9px] px-1 rounded bg-[#16161A] border border-[#2A2A32] text-[#8E9299]">
                          ID: {network.chainId}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white truncate mt-1">{network.name}</div>
                      <div className="text-[10px] text-[#8E9299] mt-0.5">
                        Base: {network.baseFeeGwei} Gwei
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Contract Archetype or Vault Asset */}
            <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 shadow-xl space-y-4 font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-[#1F1F23]">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-white uppercase">2. Select Generated Token Contract</span>
                </div>
                {tokens.length > 0 && (
                  <span className="text-[10px] text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                    {tokens.length} Vault Tokens Available
                  </span>
                )}
              </div>

              {/* Presets */}
              <div className="space-y-2">
                <label className="text-[10px] text-[#8E9299] uppercase">Standard Archetypes:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CONTRACT_PRESETS.map((preset) => {
                    const isSelected = selectedContractPresetId === preset.id && !selectedCustomTokenId;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setSelectedContractPresetId(preset.id);
                          setSelectedCustomTokenId("");
                        }}
                        className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-purple-600/15 border-purple-500 text-white shadow-sm"
                            : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white hover:bg-[#1A1A20]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{preset.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {preset.standard}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#8E9299] mt-1 line-clamp-2">{preset.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-[#8E9299]">
                          <span>Size: {preset.bytecodeSizeBytes.toLocaleString()} B</span>
                          <span>Gas Base: ~{(preset.constructorGasBase / 1000).toFixed(0)}k</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Vault Tokens Selector if available */}
              {tokens.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-[#1F1F23]">
                  <label className="text-[10px] text-[#8E9299] uppercase">Or Pick From Your Active Token Vault:</label>
                  <select
                    value={selectedCustomTokenId}
                    onChange={(e) => setSelectedCustomTokenId(e.target.value)}
                    className="w-full bg-[#0A0A0C] border border-[#1F1F23] rounded-lg px-3 py-2 text-xs text-white cursor-pointer font-mono"
                  >
                    <option value="">-- Choose Token from Workspace Vault --</option>
                    {tokens.map((token) => (
                      <option key={token.id} value={token.id}>
                        {token.name} ({token.symbol}) • {token.tokenStandard} • {token.chain.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sliders: Congestion & Optimizer Runs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#1F1F23] text-xs">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-[#8E9299] uppercase">Network Congestion Stress:</label>
                    <span className={`text-[11px] font-bold ${
                      congestionMultiplier > 2.0 ? "text-red-400" : congestionMultiplier > 1.2 ? "text-yellow-400" : "text-green-400"
                    }`}>
                      {congestionMultiplier.toFixed(1)}x {congestionMultiplier > 2.0 ? "(Surge)" : congestionMultiplier < 1.0 ? "(Calm)" : "(Normal)"}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3.5"
                    step="0.1"
                    value={congestionMultiplier}
                    onChange={(e) => setCongestionMultiplier(parseFloat(e.target.value))}
                    className="w-full accent-[#F27D26] cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-[#8E9299]">
                    <span>0.5x (Night)</span>
                    <span>1.0x (Average)</span>
                    <span>3.5x (NFT Mint Surge)</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-[#8E9299] uppercase">Solc Optimizer Runs:</label>
                    <span className="text-[11px] text-cyan-400 font-bold">{optimizerRuns} runs</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="1000"
                    step="50"
                    value={optimizerRuns}
                    onChange={(e) => setOptimizerRuns(parseInt(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-[#8E9299]">
                    <span>50 (Min Size)</span>
                    <span>200 (Default)</span>
                    <span>1000 (Low Runtime)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulation Trigger & Ethers Execution Status */}
            <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 shadow-xl space-y-4 font-mono">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase flex items-center gap-2">
                    <Zap className="w-4 h-4 text-green-400" />
                    <span>3. Ethers Simulation Engine</span>
                  </h3>
                  <p className="text-[10px] text-[#8E9299] mt-0.5">
                    Broadcasts dry-run transaction payload through simulated ethers.js v6 provider.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isSimulating}
                  onClick={handleExecuteSimulation}
                  className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-lg ${
                    isSimulating
                      ? "bg-[#1F1F23] text-[#8E9299] cursor-not-allowed"
                      : "bg-[#F27D26] hover:bg-[#F27D26]/90 text-white shadow-[#F27D26]/20"
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{isSimulating ? `Executing Step ${simulationStep}/5...` : "Simulate ethers.deploy()"}</span>
                </button>
              </div>

              {/* Progress Steps */}
              {isSimulating && (
                <div className="space-y-2 pt-2 border-t border-[#1F1F23]">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#8E9299]">Simulation Progress:</span>
                    <span className="text-green-400 font-bold">{(simulationStep * 20)}%</span>
                  </div>
                  <div className="w-full bg-[#0A0A0C] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-green-500 h-full transition-all duration-300 ease-out"
                      style={{ width: `${simulationStep * 20}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-5 text-[9px] text-[#8E9299] text-center pt-1">
                    <span className={simulationStep >= 1 ? "text-green-400 font-bold" : ""}>1. Network</span>
                    <span className={simulationStep >= 2 ? "text-green-400 font-bold" : ""}>2. Fee Data</span>
                    <span className={simulationStep >= 3 ? "text-green-400 font-bold" : ""}>3. Estimate Gas</span>
                    <span className={simulationStep >= 4 ? "text-green-400 font-bold" : ""}>4. Broadcast</span>
                    <span className={simulationStep >= 5 ? "text-green-400 font-bold" : ""}>5. Confirm</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Gas Estimation & Success Metrics (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Overall Success Rate Card */}
            <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 shadow-xl space-y-4 font-mono">
              <div className="flex items-center justify-between pb-3 border-b border-[#1F1F23]">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-xs font-bold text-white uppercase">Deployment Success Rate</span>
                </div>
                <span className="text-[10px] text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                  Deterministic EVM Score
                </span>
              </div>

              {/* Big Success Metric Gauge */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-[#0A0A0C] border border-[#1F1F23]">
                <div>
                  <div className="text-[10px] text-[#8E9299] uppercase">Estimated Success Probability</div>
                  <div className={`text-3xl font-extrabold tracking-tight mt-1 ${
                    successMetrics.overallSuccessRate >= 98
                      ? "text-green-400"
                      : successMetrics.overallSuccessRate >= 92
                      ? "text-yellow-400"
                      : "text-red-400"
                  }`}>
                    {successMetrics.overallSuccessRate}%
                  </div>
                  <div className="text-[10px] text-[#8E9299] mt-1">
                    Tested against {activeNetwork.name} gas headroom
                  </div>
                </div>

                <div className="w-16 h-16 rounded-full border-4 border-[#1F1F23] flex items-center justify-center relative">
                  <div
                    className="absolute inset-0 rounded-full border-4 border-green-500"
                    style={{
                      clipPath: `polygon(0 0, 100% 0, 100% ${successMetrics.overallSuccessRate}%, 0 ${successMetrics.overallSuccessRate}%)`,
                    }}
                  />
                  <CheckCheck className="w-6 h-6 text-green-400" />
                </div>
              </div>

              {/* Metric Breakdown Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-[#0A0A0C] border border-[#1F1F23]">
                  <div className="text-[10px] text-[#8E9299]">Mempool Clearance</div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {successMetrics.mempoolClearanceProbability}%
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0A0A0C] border border-[#1F1F23]">
                  <div className="text-[10px] text-[#8E9299]">EIP-170 Code Size</div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {successMetrics.codeSizeSafetyScore}% safe
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0A0A0C] border border-[#1F1F23]">
                  <div className="text-[10px] text-[#8E9299]">Block Gas Safety</div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {successMetrics.blockGasSafetyScore}%
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0A0A0C] border border-[#1F1F23]">
                  <div className="text-[10px] text-[#8E9299]">Reorg Resilience</div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {successMetrics.rpcLatencyResilience}%
                  </div>
                </div>
              </div>

              {/* Risk & Recommendation Pills */}
              <div className="space-y-2 pt-2 border-t border-[#1F1F23] text-[11px]">
                {successMetrics.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 text-green-300">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-green-400" />
                    <span>{rec}</span>
                  </div>
                ))}
                {successMetrics.riskFactors.map((risk, i) => (
                  <div key={i} className="flex items-start gap-2 text-yellow-300">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-yellow-400" />
                    <span>{risk}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gas Cost Estimation Card */}
            <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 shadow-xl space-y-4 font-mono">
              <div className="flex items-center justify-between pb-3 border-b border-[#1F1F23]">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-[#F27D26]" />
                  <span className="text-xs font-bold text-white uppercase">Gas Cost Breakdown</span>
                </div>
                <span className="text-[10px] text-[#8E9299]">
                  {activeNetwork.currency} @ ${activeNetwork.nativePriceUsd.toLocaleString()}
                </span>
              </div>

              {/* Total Cost Display */}
              <div className="p-4 rounded-xl bg-[#0A0A0C] border border-[#1F1F23] flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-[#8E9299] uppercase">Estimated Deployment Fee</div>
                  <div className="text-2xl font-bold text-white mt-0.5">
                    {gasEstimates.nativeCost} {gasEstimates.nativeSymbol}
                  </div>
                  <div className="text-xs text-[#F27D26] font-semibold mt-0.5">
                    ≈ ${gasEstimates.usdCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-[#8E9299]">Total Gas Units</div>
                  <div className="text-lg font-bold text-cyan-400">
                    {gasEstimates.totalGasUnits.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[#8E9299] mt-0.5">
                    Effective: {gasEstimates.effectiveGasPriceGwei} Gwei
                  </div>
                </div>
              </div>

              {/* Itemized Gas Units List */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded bg-[#0A0A0C] border border-[#1F1F23]">
                  <span className="text-[#8E9299]">Intrinsic Base Transaction:</span>
                  <span className="text-white font-bold">{gasEstimates.intrinsicGas.toLocaleString()} gas</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[#0A0A0C] border border-[#1F1F23]">
                  <span className="text-[#8E9299]">EIP-170 Code Deposit ({activeContract.bytecodeSizeBytes} B):</span>
                  <span className="text-white font-bold">{gasEstimates.codeDepositGas.toLocaleString()} gas</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[#0A0A0C] border border-[#1F1F23]">
                  <span className="text-[#8E9299]">Constructor State Allocation:</span>
                  <span className="text-white font-bold">{gasEstimates.executionGas.toLocaleString()} gas</span>
                </div>
                {activeNetwork.isL2Rollup && (
                  <div className="flex items-center justify-between p-2 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300">
                    <span>L1 Rollup Data Availability:</span>
                    <span className="font-bold">{gasEstimates.l1DataFeeGas.toLocaleString()} gas</span>
                  </div>
                )}
              </div>

              {/* Actions: Download / Export Simulation */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadReport}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A0A0C] hover:bg-[#1A1A20] border border-[#1F1F23] text-white text-xs cursor-pointer transition-all"
                  >
                    <Download className="w-3.5 h-3.5 text-[#8E9299]" />
                    <span>Export JSON Report</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowNFTMetadataModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs cursor-pointer transition-all"
                    title="View OpenSea / Marketplace compliant NFT Metadata JSON"
                  >
                    <FileJson className="w-3.5 h-3.5" />
                    <span>NFT Metadata JSON</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(JSON.stringify(gasEstimates, null, 2), "gas_json")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A0A0C] hover:bg-[#1A1A20] border border-[#1F1F23] text-[#8E9299] hover:text-white text-xs cursor-pointer transition-all"
                >
                  {copiedTextKey === "gas_json" ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>Copy Metrics</span>
                </button>
              </div>
            </div>

            {/* Simulated Receipt Preview (if simulated) */}
            {simulatedReceipt && (
              <div className="bg-[#16161A] border border-green-500/30 rounded-xl p-4 shadow-xl space-y-3 font-mono text-xs animate-fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-[#1F1F23]">
                  <div className="flex items-center gap-2 text-green-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Dry-Run Deployment Confirmed</span>
                  </div>
                  <span className="text-[10px] text-[#8E9299]">Block #21850412</span>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[10px] text-[#8E9299]">Contract Address (Calculated via ethers.getCreateAddress):</div>
                  <div className="p-2 rounded bg-[#0A0A0C] border border-[#1F1F23] text-white select-all break-all text-[11px]">
                    {simulatedReceipt.deployedAddress}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[10px] text-[#8E9299]">Transaction Hash:</div>
                  <div className="p-2 rounded bg-[#0A0A0C] border border-[#1F1F23] text-[#8E9299] select-all break-all text-[10px]">
                    {simulatedReceipt.estimatedTxHash}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Multi-Chain Comparison Matrix */}
      {activeTab === "multi_chain_matrix" && (
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 shadow-xl font-mono space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#1F1F23]">
            <div>
              <h2 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#F27D26]" />
                <span>Multi-Chain Deployment Comparison: {activeContract.name}</span>
              </h2>
              <p className="text-xs text-[#8E9299] mt-0.5">
                Side-by-side cost and success rate benchmark across all EVM chains at current gas profiles.
              </p>
            </div>
            <span className="text-[10px] text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              Bytecode Size: {activeContract.bytecodeSizeBytes} Bytes
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#1F1F23] text-[#8E9299] text-[10px] uppercase">
                  <th className="py-2.5 px-3">Network</th>
                  <th className="py-2.5 px-3">Chain ID</th>
                  <th className="py-2.5 px-3">Base Fee</th>
                  <th className="py-2.5 px-3">Gas Units</th>
                  <th className="py-2.5 px-3">Native Cost</th>
                  <th className="py-2.5 px-3">USD Cost</th>
                  <th className="py-2.5 px-3">Success Rate</th>
                  <th className="py-2.5 px-3">Block Time</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F1F23]">
                {SUPPORTED_NETWORKS.map((network) => {
                  const effectivePriceGwei = network.baseFeeGwei + network.priorityFeeGwei;
                  const totalUnits = 21000 + Math.round(activeContract.bytecodeSizeBytes * 200) + Math.round(activeContract.constructorGasBase * activeContract.complexityFactor) + (network.isL2Rollup ? network.l1DataGasMultiplier : 0);
                  const native = (totalUnits * effectivePriceGwei) / 1e9;
                  const usd = native * network.nativePriceUsd;

                  const isCurrent = network.id === selectedNetworkId;

                  return (
                    <tr
                      key={network.id}
                      className={`hover:bg-[#1A1A20] transition-all ${isCurrent ? "bg-[#F27D26]/5" : ""}`}
                    >
                      <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${network.badgeClass}`}>
                          {network.currency}
                        </span>
                        <span>{network.name}</span>
                      </td>
                      <td className="py-3 px-3 text-[#8E9299]">{network.chainId}</td>
                      <td className="py-3 px-3 text-white">{network.baseFeeGwei} Gwei</td>
                      <td className="py-3 px-3 text-cyan-400 font-bold">{totalUnits.toLocaleString()}</td>
                      <td className="py-3 px-3 text-white">
                        {native < 0.0001 ? native.toExponential(3) : native.toFixed(5)} {network.currency}
                      </td>
                      <td className={`py-3 px-3 font-bold ${usd > 20 ? "text-[#F27D26]" : "text-green-400"}`}>
                        ${usd.toFixed(2)}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 font-bold border border-green-500/20">
                          {(99.5 - network.reorgRiskScore * 0.7).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#8E9299]">{network.blockTimeSec}s</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedNetworkId(network.id);
                            setActiveTab("simulator");
                          }}
                          className="px-2.5 py-1 rounded bg-[#0A0A0C] hover:bg-[#1F1F23] border border-[#1F1F23] text-white text-[10px] cursor-pointer"
                        >
                          Simulate
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Ethers.js v6 Script Generator */}
      {activeTab === "ethers_code" && (
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl overflow-hidden shadow-xl font-mono text-xs">
          <div className="bg-[#0E0E10] px-4 py-3 border-b border-[#1F1F23] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-white">
                scripts/deploy-{activeContract.symbol}.js (ethers.js v6)
              </span>
              <span className="text-[10px] text-[#8E9299] px-2 py-0.5 rounded bg-[#0A0A0C] border border-[#1F1F23]">
                {activeNetwork.name}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopy(generatedEthersScript, "ethers_script")}
                className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#0A0A0C] hover:bg-[#1A1A20] border border-[#1F1F23] text-white cursor-pointer transition-all"
              >
                {copiedTextKey === "ethers_script" ? (
                  <Check className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-[#8E9299]" />
                )}
                <span>Copy Script</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([generatedEthersScript], { type: "text/javascript" });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `deploy-${activeContract.symbol}.js`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded bg-orange-600 hover:bg-orange-500 text-white font-bold cursor-pointer transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .js</span>
              </button>
            </div>
          </div>

          <pre className="p-4 overflow-x-auto text-[11px] leading-relaxed text-[#D4D4D4] bg-[#0A0A0C] max-h-[460px] overflow-y-auto">
            <code>{generatedEthersScript}</code>
          </pre>
        </div>
      )}

      {/* Tab 4: Interactive Ethers Terminal Logs */}
      {activeTab === "logs" && (
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl overflow-hidden shadow-xl font-mono text-xs">
          <div className="bg-[#0E0E10] px-4 py-3 border-b border-[#1F1F23] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-white">Ethers Execution Stream & Trace</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTerminalLogs(["Terminal cleared. Ethers runtime ready."])}
                className="px-2.5 py-1 rounded bg-[#0A0A0C] hover:bg-[#1A1A20] border border-[#1F1F23] text-[#8E9299] hover:text-white cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleCopy(terminalLogs.join("\n"), "terminal_logs")}
                className="px-2.5 py-1 rounded bg-[#0A0A0C] hover:bg-[#1A1A20] border border-[#1F1F23] text-white cursor-pointer"
              >
                {copiedTextKey === "terminal_logs" ? "Copied" : "Copy Logs"}
              </button>
            </div>
          </div>

          <div className="p-4 bg-[#0A0A0C] max-h-[380px] overflow-y-auto space-y-1 text-[11px]">
            {terminalLogs.map((log, index) => (
              <div
                key={index}
                className={`font-mono leading-relaxed ${
                  log.includes("✓")
                    ? "text-green-400 font-bold"
                    : log.includes("Error") || log.includes("failed")
                    ? "text-red-400 font-bold"
                    : log.includes("ethers.provider") || log.includes("ethers.getContractFactory")
                    ? "text-cyan-300"
                    : "text-[#8E9299]"
                }`}
              >
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NFT Marketplace Metadata Modal */}
      {showNFTMetadataModal && (
        <NFTMetadataModal
          token={activeTokenRecord}
          onClose={() => setShowNFTMetadataModal(false)}
        />
      )}
    </div>
  );
};
