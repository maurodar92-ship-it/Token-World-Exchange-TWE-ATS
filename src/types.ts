export type ChainType =
  | "ethereum"
  | "base"
  | "arbitrum"
  | "polygon"
  | "solana"
  | "bitcoin"
  | "quantum"
  | "cosmos";

export type TokenStandard =
  | "ERC-20"
  | "ERC-721"
  | "ERC-1155"
  | "ERC-4337"
  | "SPL-Token"
  | "Quantum-Hybrid"
  | "BRC-20/Rune";

export type NarrativeCategory =
  | "ai_agents"
  | "depin"
  | "rwa"
  | "quantum_defi"
  | "liquid_restaking"
  | "autonomous_worlds";

export type Web3Genre =
  | "defi_liquidity"
  | "onchain_identity"
  | "gaming_media"
  | "depin_infra";

export interface GenreDefinition {
  id: Web3Genre;
  title: string;
  shortLabel: string;
  tagline: string;
  description: string;
  accentColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  soundscapeName: string;
  soundscapeDescription: string;
  keyInnovations: string[];
}

export const GENRE_DEFINITIONS: Record<Web3Genre, GenreDefinition> = {
  defi_liquidity: {
    id: "defi_liquidity",
    title: "DeFi Liquidity & Vaults",
    shortLabel: "DeFi & Vaults",
    tagline: "Concentrated AMM Liquidity, Yield Strategies & Collateralized Vaults",
    description: "Algorithmic capital-efficient liquidity pools, automated debt vaults, and multi-asset restaking vaults with deterministic yield routing.",
    accentColor: "#F27D26",
    badgeBg: "bg-orange-500/10",
    badgeBorder: "border-orange-500/30",
    badgeText: "text-orange-400",
    soundscapeName: "Resonant Liquidity Pad & Sub-Bass",
    soundscapeDescription: "Warm analog synthesizer pads modulated with low-pass AMM frequency filters and sub-harmonic bass.",
    keyInnovations: [
      "Concentrated Tick Range Positions",
      "Auto-Compounding Yield Vaults",
      "Flash-Loan Shielded Arbitrage",
      "Multi-Collateral Debt Modules",
    ],
  },
  onchain_identity: {
    id: "onchain_identity",
    title: "On-Chain Identity & ENS/Vanity IDs",
    shortLabel: "Identity & Vanity",
    tagline: "Sovereign Web3 Name Services, EIP-4337 Smart Accounts & Verified Vanity Keys",
    description: "Decentralized cryptographic naming resolvers, soulbound identity attestations, and vanity addresses calculated via deterministic hash mining.",
    accentColor: "#00F0FF",
    badgeBg: "bg-cyan-500/10",
    badgeBorder: "border-cyan-500/30",
    badgeText: "text-cyan-400",
    soundscapeName: "Cryptographic Pentatonic Bell Chimes",
    soundscapeDescription: "Crisp crystalline chimes triggered in harmony with vanity prefix mining and signature validation.",
    keyInnovations: [
      "EIP-4337 Account Abstraction Resolvers",
      "Deterministic 0x Vanity Mining Engine",
      "Soulbound Sybil-Resistant Attestations",
      "Universal Reverse Resolution Registry",
    ],
  },
  gaming_media: {
    id: "gaming_media",
    title: "Gaming & Generative Digital Media",
    shortLabel: "Gaming & Multiverse",
    tagline: "ERC-721/1155 Multiverse Assets, On-Chain SVG Artifacts & World Currencies",
    description: "Autonomous virtual world economies, procedurally generated on-chain art vectors, and interoperable gaming loot standards.",
    accentColor: "#A855F7",
    badgeBg: "bg-purple-500/10",
    badgeBorder: "border-purple-500/30",
    badgeText: "text-purple-400",
    soundscapeName: "Dynamic Multiverse Chime Arpeggiator",
    soundscapeDescription: "Cascading 8-bit / harmonic arpeggiator inspired by interactive virtual reality game engines.",
    keyInnovations: [
      "Pure On-Chain SVG Vector Generation",
      "ERC-1155 Batch Crafting Standards",
      "Dynamic Trait State Evolution",
      "Zero-Royalty Protocol Bypass Immunity",
    ],
  },
  depin_infra: {
    id: "depin_infra",
    title: "Decentralized Physical Infrastructure (DePIN)",
    shortLabel: "DePIN & Telemetry",
    tagline: "Hardware Sensor Micropayments, Bandwidth Credits & Compute Mesh Networks",
    description: "Decentralized machine-to-machine telemetry settlement, physical node proof-of-coverage, and cryptographic bandwidth routing.",
    accentColor: "#10B981",
    badgeBg: "bg-emerald-500/10",
    badgeBorder: "border-emerald-500/30",
    badgeText: "text-emerald-400",
    soundscapeName: "Pulsing Hardware Telemetry & Sensor Ping",
    soundscapeDescription: "Rhythmic 60-BPM sub-pulse combined with high-frequency radio telemetry chirp simulations.",
    keyInnovations: [
      "Zero-Knowledge Hardware Proof of Coverage",
      "Microsecond Sensor Stream Settlement",
      "Distributed GPU/AI Inference Credits",
      "Decentralized Mesh Radio Verification",
    ],
  },
};

export function resolveTokenGenre(token: Partial<TokenRecord>): Web3Genre {
  if (token.genre) return token.genre;
  if (token.narrative === "quantum_defi" || token.narrative === "rwa" || token.narrative === "liquid_restaking") {
    return "defi_liquidity";
  }
  if (token.isVanity || token.tokenStandard === "ERC-4337") {
    return "onchain_identity";
  }
  if (token.narrative === "autonomous_worlds" || token.tokenStandard === "ERC-721" || token.tokenStandard === "ERC-1155") {
    return "gaming_media";
  }
  if (token.narrative === "depin" || token.narrative === "ai_agents") {
    return "depin_infra";
  }
  return "defi_liquidity";
}

export type LaunchStatus =
  | "Deployed"
  | "Audited"
  | "Liquidity Locked"
  | "Paused"
  | "Rug-Proof Vault"
  | "Presale";

export type AuditFirm =
  | "CertiK"
  | "OpenZeppelin"
  | "Trail of Bits"
  | "Halborn"
  | "Code4rena"
  | "Hacken";

export interface DeploymentAttempt {
  id: string;
  timestamp: string;
  deployerAddress: string;
  status: "Success" | "Failed" | "Pending";
  network: string;
  txHash?: string;
  gasUsed?: string;
  contractAddress?: string;
  notes?: string;
}

export interface TokenRecord {
  id: string;
  name: string;
  symbol: string;
  chain: ChainType;
  networkId: number;
  contractAddress: string;
  isVanity: boolean;
  isDeployed?: boolean; // Visual status indicating whether this token has been marked as deployed
  deploymentHistory?: DeploymentAttempt[]; // List of all deployment attempts for this specific token
  genre?: Web3Genre;
  tags?: string[]; // Organic market development narrative/genre tags
  marketEvolutionNote?: string; // Simulated organic development note or event
  description?: string; // Rich token description & narrative overview (importable from Google Keep & Workspace)
  tokenId: string; // uint256 hex or decimal
  tokenStandard: TokenStandard;
  narrative: NarrativeCategory;
  launchStatus: LaunchStatus;
  initialSupply: string;
  decimals: number;
  marketCap: number;
  priceUsd: number;
  liquidityPair: string;
  liquidityPoolId?: number; // Corresponding ID from 509 Liquidity Pool Pairs (1-509)
  reserveShares?: string; // uint256 reserve allocation with 18 decimals
  treasuryShares?: string; // uint256 treasury allocation with 18 decimals
  targetOwner?: string; // Authorized Sovereign Owner
  powerOfTwoReserves?: number; // 256 (2^8)
  coinmarketcapMetric?: number; // >= 2^8 (>= 256)
  tokenomics?: GeneratedTokenomics;
  tokenomicsPillars?: TokenomicsPillars;
  holderCount: number;
  auditFirm: AuditFirm;
  securityScore: number;
  createdAt: string;
  creationTx: string;
  deployerAddress: string;
  deployerPrivateKey?: string; // 256-bit simulated private key for Foundry .env and cast wallet import
  treasuryAddress?: string; // Protocol Treasury Multi-Sig / Cold Storage Vault Address
  quantum_entropy_signature: string; // Cryptographically secure 64-char hex string
  contractArchetype?: string; // Enterprise Contract Architecture (e.g., CREATE2 Proxy, Multi-Sig Safe)
  isEnterprise?: boolean; // Institutional / Enterprise contract indicator
  enterpriseSalt?: string; // Deterministic 32-byte salt used in CREATE2 deployment
  enterpriseTier?: string; // e.g. "Tier-1 Institutional", "Enterprise Safe 4-of-7"
  generationPrompt?: string; // Generative prompt used for this contract's synthesis and vault persistence
  imageUrl?: string; // Dynamic image URL or SVG data URI for token visual rendering
  svgData?: string; // Raw inline SVG vector markup for zero-latency rendering and fallback
}

export interface GenerationConfig {
  count: number;
  chains: ChainType[];
  standards: TokenStandard[];
  narratives: NarrativeCategory[];
  includeVanity: boolean;
  vanityPercentage: number;
  customVanityPrefix: string;
  uint256Format: "decimal" | "hex64";
  eip55Checksum: boolean;
  simulatedMarketData: boolean;
  macroMarketCapScale?: boolean; // When enabled, scales valuation to >= $3 Trillion CoinMarketCap
  customDeployerAddress?: string; // Active deployer address (e.g. synced from MetaMask)
  customTreasuryAddress?: string; // Active protocol treasury address
  customBaseTreasuryAddress?: string; // Active Base EVM chain treasury address
}

export interface PromptTemplate {
  id: string;
  category:
    | "scripts"
    | "narratives"
    | "market_sim"
    | "technical"
    | "recursive"
    | "pro_tips"
    | "smart_contracts"
    | "compliance"
    | "privacy_zk"
    | "distributed_systems"
    | "contract_ids";
  title: string;
  description: string;
  promptText: string;
  chainTarget?: string;
  tags: string[];
  sampleOutput?: string;
}

export interface TokenomicsPillars {
  mathematicalBoundaries: {
    uint256Ceiling: string;
    uint256ExponentialNotation: string;
    noLiteralInfinityExplanation: string;
    overflowProtection: string;
  };
  economicRealities: {
    capitalBackingRequired: boolean;
    liquidityReserveMechanics: string;
    marketDynamicsDependence: string;
  };
  smartContractArchitecture: {
    standardFramework: string;
    governanceModel: string;
    monetaryCreationTruth: string;
  };
}

export interface PowerOfTwoTokenomics {
  reserveSharesPowerOfTwo: number; // 2^8 = 256
  reserveSharesExponent: number; // 8
  reserveSharesFormatted: string; // "2^8 (256 Reserves)"
  reserveOwner: string; // "Mauro Lomibao Dar III"
  coinmarketcapMetricFloor: number; // >= 2^8 (>= 256)
  coinmarketcapMetricDescription: string;
  smartContractAddressBatchCount: number; // >= 2^8 (>= 256 addresses)
  generatedContractAddresses?: string[];
}

export interface GeneratedTokenomics {
  tagline: string;
  executiveSummary: string;
  tokenomics: Array<{
    category: string;
    percentage: number;
    lockup: string;
  }>;
  solidityStub: string;
  securityScore: number;
  auditNotes: string;
  pillars?: TokenomicsPillars;
  powerOfTwo?: PowerOfTwoTokenomics;
}

export interface SimulatedGasBreakdown {
  intrinsicGas: number;
  codeDepositGas: number;
  executionGas: number;
  l1DataFeeGas: number;
  totalGasUnits: number;
  baseFeeGwei: number;
  priorityFeeGwei: number;
  effectiveGasPriceGwei: number;
  nativeCost: number;
  nativeSymbol: string;
  usdCost: number;
}

export interface SimulationSuccessMetrics {
  overallSuccessRate: number; // percentage, e.g. 99.2
  mempoolClearanceProbability: number;
  codeSizeSafetyScore: number;
  blockGasSafetyScore: number;
  rpcLatencyResilience: number;
  riskFactors: string[];
  recommendations: string[];
}

export interface DeploymentSimulationResult {
  network: string;
  chainId: number;
  contractName: string;
  contractStandard: TokenStandard;
  bytecodeSize: number;
  gasBreakdown: SimulatedGasBreakdown;
  successMetrics: SimulationSuccessMetrics;
  estimatedTxHash: string;
  deployedAddress: string;
  timestamp: string;
}

export interface AppServiceConfig {
  // Recommended for Marketplace for all ages:
  nftApi: boolean;
  webhooks: boolean;
  tokenApi: boolean;
  nodeApi: boolean;
  grpc: boolean;
  // All other services:
  pricesApi: boolean;
  transfersApi: boolean;
  bundlerApi: boolean;
  debugApi: boolean;
  blockTimestampApi: boolean;
  gasManager: boolean;
  traceApi: boolean;
  txReceiptsApi: boolean;
  userOpSimulationApi: boolean;
  websockets: boolean;
}

export interface AppProfile {
  id: string;
  name: string;
  tagline: string;
  description: string;
  environment: "Mainnet" | "Testnet" | "Multi-Stage";
  targetGenre: Web3Genre;
  selectedChains: string[];
  services: AppServiceConfig;
  platformTimeline: string;
  quantumGlyphsEnabled: boolean;
  nftBatchDeploymentVersion: "v1_genesis" | "v2_quantum" | "v3_neural_ai" | "v4_cross_chain_6551";
  createdAt: string;
  contractCount: number;
}
