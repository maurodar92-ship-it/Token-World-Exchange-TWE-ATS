import { ChainType, NarrativeCategory, AuditFirm } from "../types";
import {
  LIQUIDITY_POOLS_509,
  LIQUIDITY_PAIRS_ALL_STRINGS,
  LIQUIDITY_CATEGORIES,
  getLiquidityPoolById,
  getLiquidityPoolsByCategory,
  getRandomLiquidityPoolForChain,
} from "../data/liquidityPools509";

export {
  LIQUIDITY_POOLS_509,
  LIQUIDITY_PAIRS_ALL_STRINGS,
  LIQUIDITY_CATEGORIES,
  getLiquidityPoolById,
  getLiquidityPoolsByCategory,
  getRandomLiquidityPoolForChain,
};

export const CHAIN_NETWORK_MAP: Record<ChainType, number> = {
  ethereum: 1,
  base: 8453,
  arbitrum: 42161,
  polygon: 137,
  solana: 101, // Solana Mainnet-Beta
  bitcoin: 0,
  quantum: 2026,
  cosmos: 118,
};

export const CHAIN_METADATA: Record<
  ChainType,
  { name: string; symbol: string; badgeColor: string; format: string; explorerUrl: string }
> = {
  ethereum: {
    name: "Ethereum",
    symbol: "ETH",
    badgeColor: "bg-[#16161A] text-[#8E9299] border-[#1F1F23]",
    format: "0x + 40 Hex (EIP-55)",
    explorerUrl: "https://etherscan.io/address/",
  },
  base: {
    name: "Base",
    symbol: "ETH",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    format: "0x + 40 Hex (EIP-55)",
    explorerUrl: "https://basescan.org/address/",
  },
  arbitrum: {
    name: "Arbitrum One",
    symbol: "ARB",
    badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    format: "0x + 40 Hex (EIP-55)",
    explorerUrl: "https://arbiscan.io/address/",
  },
  polygon: {
    name: "Polygon PoS",
    symbol: "POL",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    format: "0x + 40 Hex (EIP-55)",
    explorerUrl: "https://polygonscan.com/address/",
  },
  solana: {
    name: "Solana",
    symbol: "SOL",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    format: "Base58 (32-44 Chars)",
    explorerUrl: "https://solscan.io/account/",
  },
  bitcoin: {
    name: "Bitcoin Runes/Taproot",
    symbol: "BTC",
    badgeColor: "bg-[#F27D26]/10 text-[#F27D26] border-[#F27D26]/30",
    format: "bc1p... Taproot",
    explorerUrl: "https://mempool.space/address/",
  },
  quantum: {
    name: "Quantum-Hybrid (Post-Q)",
    symbol: "QETH",
    badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    format: "0xQ + Falcon/Kyber Hex",
    explorerUrl: "#",
  },
  cosmos: {
    name: "Cosmos Hub (IBC)",
    symbol: "ATOM",
    badgeColor: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    format: "cosmos1 + Bech32",
    explorerUrl: "https://www.mintscan.io/cosmos/account/",
  },
};

export const AUDIT_FIRMS: AuditFirm[] = [
  "CertiK",
  "OpenZeppelin",
  "Trail of Bits",
  "Halborn",
  "Code4rena",
  "Hacken",
];

// All 509 Liquidity Pool Pairs organized across EVM, Solana, Cosmos, Move, Bitcoin L2, and alternative blockchains
export const LIQUIDITY_PAIRS: string[] = LIQUIDITY_PAIRS_ALL_STRINGS;

export const NARRATIVE_METADATA_POOLS: Record<
  NarrativeCategory,
  {
    label: string;
    description: string;
    names: Array<{ prefix: string; symbolPrefix: string }>;
    suffixes: string[];
  }
> = {
  ai_agents: {
    label: "AI Agents & Autonomous Swarms",
    description: "Autonomous reasoning agents, on-chain inference networks, and multi-agent coordination layers.",
    names: [
      { prefix: "Neural", symbolPrefix: "NEUR" },
      { prefix: "Synap", symbolPrefix: "SYN" },
      { prefix: "Agent", symbolPrefix: "AGNT" },
      { prefix: "Cogni", symbolPrefix: "COG" },
      { prefix: "AutoPilot", symbolPrefix: "AUTO" },
      { prefix: "Sentient", symbolPrefix: "SENT" },
      { prefix: "Cortex", symbolPrefix: "CTX" },
      { prefix: "Swarm", symbolPrefix: "SWRM" },
      { prefix: "Vector", symbolPrefix: "VECT" },
      { prefix: "Tensor", symbolPrefix: "TNSR" },
    ],
    suffixes: ["Node", "Mesh", "Grid", "Protocol", "Mind", "Core", "Brain", "Sync", "Hub", "Nexus"],
  },
  depin: {
    label: "DePIN (Physical Infrastructure)",
    description: "Decentralized compute clusters, wireless edge bandwidth, GPU networks, and IoT sensor arrays.",
    names: [
      { prefix: "Helio", symbolPrefix: "HLIO" },
      { prefix: "Compute", symbolPrefix: "CMP" },
      { prefix: "Edge", symbolPrefix: "EDGE" },
      { prefix: "Band", symbolPrefix: "BAND" },
      { prefix: "Sensor", symbolPrefix: "SNSR" },
      { prefix: "Wireless", symbolPrefix: "WRLS" },
      { prefix: "MeshNet", symbolPrefix: "MESH" },
      { prefix: "Beam", symbolPrefix: "BEAM" },
      { prefix: "GpuFarm", symbolPrefix: "GPU" },
      { prefix: "Fiber", symbolPrefix: "FIBR" },
    ],
    suffixes: ["Grid", "Node", "Link", "Chain", "Array", "Fabric", "Stream", "Station", "Relay", "Cluster"],
  },
  rwa: {
    label: "RWA (Real-World Assets & Yield)",
    description: "Tokenized carbon credits, fractional real estate, treasury bills, and high-frequency trade yields.",
    names: [
      { prefix: "Carbon", symbolPrefix: "CARB" },
      { prefix: "Regen", symbolPrefix: "RGN" },
      { prefix: "Brick", symbolPrefix: "BRK" },
      { prefix: "Prime", symbolPrefix: "PRM" },
      { prefix: "Treasury", symbolPrefix: "TRS" },
      { prefix: "Vaulted", symbolPrefix: "VLT" },
      { prefix: "Estate", symbolPrefix: "EST" },
      { prefix: "Commodity", symbolPrefix: "CMDT" },
      { prefix: "YieldMax", symbolPrefix: "YMAX" },
      { prefix: "Solidus", symbolPrefix: "SLD" },
    ],
    suffixes: ["Flow", "Yield", "X", "Vault", "Capital", "Securities", "Reserve", "Credit", "Fund", "Trust"],
  },
  quantum_defi: {
    label: "Quantum-Resistant DeFi",
    description: "Post-quantum lattice cryptography, Falcon-512 signatures, and zk-SNARK shielded pools.",
    names: [
      { prefix: "Quantum", symbolPrefix: "QNTM" },
      { prefix: "Kyber", symbolPrefix: "KYBR" },
      { prefix: "Dilithium", symbolPrefix: "DLTH" },
      { prefix: "ZeroProof", symbolPrefix: "ZPRF" },
      { prefix: "Shield", symbolPrefix: "SHLD" },
      { prefix: "Lattice", symbolPrefix: "LTTC" },
      { prefix: "Falcon", symbolPrefix: "FLCN" },
      { prefix: "CryptoVault", symbolPrefix: "CVLT" },
    ],
    suffixes: ["Swap", "Guard", "Proof", "Core", "Safe", "Vault", "Exchange", "Pool", "Index"],
  },
  liquid_restaking: {
    label: "Liquid Staking & Restaking",
    description: "Actively Validated Services (AVS), multi-asset restaking vaults, and pooled proof-of-stake derivative tokens.",
    names: [
      { prefix: "Restake", symbolPrefix: "RSTK" },
      { prefix: "Eigen", symbolPrefix: "EIGN" },
      { prefix: "Symbiotic", symbolPrefix: "SYMB" },
      { prefix: "Karak", symbolPrefix: "KRK" },
      { prefix: "Liquid", symbolPrefix: "LQD" },
      { prefix: "Pooled", symbolPrefix: "PLED" },
    ],
    suffixes: ["ETH", "SOL", "Yield", "Vault", "AVS", "Delegate", "Restake", "Stake"],
  },
  autonomous_worlds: {
    label: "Autonomous Worlds & Gaming",
    description: "Fully on-chain physics simulation, dynamic NFT items, and verifiable agent economies.",
    names: [
      { prefix: "Mud", symbolPrefix: "MUD" },
      { prefix: "Dojo", symbolPrefix: "DOJO" },
      { prefix: "Elysium", symbolPrefix: "ELY" },
      { prefix: "Mythic", symbolPrefix: "MYTH" },
      { prefix: "Voxel", symbolPrefix: "VOX" },
      { prefix: "CosmoRealm", symbolPrefix: "CRLM" },
    ],
    suffixes: ["World", "Realm", "Item", "Relic", "Asset", "Craft", "Guild", "Shard"],
  },
};
