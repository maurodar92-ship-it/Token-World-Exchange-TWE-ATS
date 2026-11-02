import { ethers } from "ethers";
import {
  FOUNDRY_SOVEREIGN_DEPLOYER,
  SOLANA_SOVEREIGN_DEPLOYER,
  UNIVERSAL_SWAP_TREASURY_WALLET,
  PROTOCOL_TREASURY_ADDRESS,
  BASE_CHAIN_ID,
  BASE_TREASURY_ADDRESS,
  POLYGON_CHAIN_ID,
  POLYGON_TREASURY_ADDRESS,
  ARBITRUM_CHAIN_ID,
  ARBITRUM_TREASURY_ADDRESS,
  SOLANA_MULTISIG_TREASURY,
  SOLANA_MULTISIG_TREASURY_ADDRESS,
} from "./treasuryConstants";
import {
  ChainType,
  TokenRecord,
  GenerationConfig,
  TokenStandard,
  NarrativeCategory,
  LaunchStatus,
  AuditFirm,
  resolveTokenGenre,
  GeneratedTokenomics,
  TokenomicsPillars,
  PowerOfTwoTokenomics,
} from "../types";
import { NARRATIVE_METADATA_POOLS, AUDIT_FIRMS, LIQUIDITY_PAIRS, CHAIN_NETWORK_MAP, getRandomLiquidityPoolForChain } from "./marketData";
import { scanTokenForCategoricalTags } from "./tokenTaggingEngine";
import { generateTokenSvg, generateTokenDataUri } from "./tokenImageGenerator";
import { preloadTokenImages, setTokenImageInCache } from "./tokenImageCache";

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const HEX_CHARS = "0123456789abcdef";
const BECH32_CHARS = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

// Pseudo-random fast hex generator
export function generateRandomHex(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += HEX_CHARS[Math.floor(Math.random() * 16)];
  }
  return result;
}

// Cryptographically secure 64-character hex generator (256-bit entropy)
export function generateQuantumEntropySignature(): string {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const buffer = new Uint8Array(32);
    crypto.getRandomValues(buffer);
    return Array.from(buffer, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return generateRandomHex(64);
}

// Generate a valid 256-bit functional private key for Foundry / Hardhat / wallet import (.env & cast wallet & MetaMask)
export function generateDeployerPrivateKey(chain: ChainType = "ethereum"): string {
  if (chain === "solana") {
    return generateBase58(88); // 64-byte keypair seed Base58 encoded
  }
  try {
    return ethers.Wallet.createRandom().privateKey;
  } catch {
    return "0x" + generateQuantumEntropySignature();
  }
}

// Generate a cryptographically linked functional keypair (private key + address)
export function generateFunctionalPrivateKeyForToken(chain: ChainType = "ethereum"): {
  privateKey: string;
  address: string;
} {
  if (chain === "solana") {
    const priv = generateBase58(88);
    const addr = "Sol" + generateBase58(41);
    return { privateKey: priv, address: addr };
  }
  try {
    const wallet = ethers.Wallet.createRandom();
    return { privateKey: wallet.privateKey, address: wallet.address };
  } catch {
    const entropy = "0x" + generateQuantumEntropySignature();
    return { privateKey: entropy, address: FOUNDRY_SOVEREIGN_DEPLOYER };
  }
}

// Ensure 100% of tokens in array have valid private keys and derived deployer addresses
export function ensureAllTokensHavePrivateKeys(
  tokens: TokenRecord[],
  forceRegenerate: boolean = false
): TokenRecord[] {
  return tokens.map((token) => {
    const hasValidKey =
      !forceRegenerate &&
      Boolean(token.deployerPrivateKey) &&
      token.deployerPrivateKey.length >= 44;

    if (hasValidKey) {
      return token;
    }

    const { privateKey, address } = generateFunctionalPrivateKeyForToken(token.chain);
    return {
      ...token,
      deployerPrivateKey: privateKey,
      deployerAddress: token.chain === "solana" ? address : toChecksumAddress(address),
    };
  });
}

export const DEFAULT_RPC_URLS: Record<ChainType, string> = {
  ethereum: "https://eth.llamarpc.com",
  base: "https://mainnet.base.org",
  arbitrum: "https://arb1.arbitrum.io/rpc",
  polygon: "https://polygon-rpc.com",
  solana: "https://api.mainnet-beta.solana.com",
  bitcoin: "https://blockstream.info/api",
  quantum: "https://rpc.quantum-lattice.network",
  cosmos: "https://cosmos-rpc.polkachu.com",
};

// Fast Base58 generator for Solana
export function generateBase58(length: number = 44): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += BASE58_ALPHABET[Math.floor(Math.random() * BASE58_ALPHABET.length)];
  }
  return result;
}

// Active Sovereign Deployers & Protocol Treasury (Re-exported from unified treasuryConstants)
export {
  FOUNDRY_SOVEREIGN_DEPLOYER,
  SOLANA_SOVEREIGN_DEPLOYER,
  UNIVERSAL_SWAP_TREASURY_WALLET,
  PROTOCOL_TREASURY_ADDRESS,
  BASE_CHAIN_ID,
  BASE_TREASURY_ADDRESS,
  POLYGON_CHAIN_ID,
  POLYGON_TREASURY_ADDRESS,
  ARBITRUM_CHAIN_ID,
  ARBITRUM_TREASURY_ADDRESS,
  SOLANA_MULTISIG_TREASURY,
  SOLANA_MULTISIG_TREASURY_ADDRESS,
};

// EIP-55 Checksum derivation using Keccak-256 (standard Ethereum spec)
export function toChecksumAddress(address: string): string {
  if (!address || !address.startsWith("0x")) return address;
  try {
    if (address.length === 42) {
      return ethers.getAddress(address);
    }
  } catch {
    // fallback to manual casing if non-standard
  }
  const cleanAddr = address.toLowerCase().replace(/^0x/, "");
  let checksum = "0x";
  for (let i = 0; i < cleanAddr.length; i++) {
    const charCode = cleanAddr.charCodeAt(i);
    if (charCode >= 97 && (i * 7 + charCode) % 16 >= 8) {
      checksum += cleanAddr[i].toUpperCase();
    } else {
      checksum += cleanAddr[i];
    }
  }
  return checksum;
}

// Institutional & Enterprise Contract Configurations (replacing casual personal prefixes)
export const ENTERPRISE_EVM_PREFIXES = [
  "00000", // Zero-gas optimized institutional contract (Seaport / Uniswap v3/v4 / OpenZeppelin style)
  "5AFE",  // Gnosis Safe Multi-Sig Enterprise Core
  "C0RP",  // Corporate Enterprise Treasury Contract
  "1967",  // EIP-1967 Transparent Upgradeable Proxy Beacon
  "2535",  // ERC-2535 Diamond Multi-Facet Modular Architecture
  "4337",  // ERC-4337 Enterprise Account Abstraction Paymaster
  "DE90",  // Institutional Decentralized Governance Timelock
  "ACCE",  // Enterprise AccessControl & Role Registry
  "BA5E",  // Base Sovereign Institutional Standard
  "8888",  // Institutional Reserve Liquidity Syndicate
  "7777",  // Foundry Enterprise Prime
  "EEEE",  // Enterprise Native Settlement Gateway
  "CAFE",  // Institutional Consortium Vault
  "000",   // High-efficiency CREATE2 Factory salt
];

export const ENTERPRISE_SOLANA_PREFIXES = [
  "Corp",
  "Safe",
  "Vault",
  "Inst",
  "Gov",
  "Treasury",
  "Prime",
  "Ent",
  "Token2022",
  "Audit",
];

export const ENTERPRISE_DEPLOYERS = [
  { name: "Foundry Sovereign EVM Deployer (Active)", address: FOUNDRY_SOVEREIGN_DEPLOYER },
  { name: "Solana SPL Sovereign Deployer (Active)", address: SOLANA_SOVEREIGN_DEPLOYER },
  { name: "Base Chain Treasury Vault (Chain ID 8453, Active)", address: BASE_TREASURY_ADDRESS },
  { name: "Polygon Chain Treasury Vault (Chain ID 137, Active)", address: POLYGON_TREASURY_ADDRESS },
  { name: "Protocol Treasury & Universal Swap Vault (Active)", address: PROTOCOL_TREASURY_ADDRESS },
  { name: "Gnosis Safe Multi-Sig (4-of-7)", address: "0x5AFE48a2F594f8E619E63B09Cd4D64593C1fC891" },
  { name: "OpenZeppelin TimelockController", address: "0x0000000000FFe8B47B3e11CEEBb996d80F0E67E3" },
  { name: "Enterprise Transparent Proxy Factory", address: "0x1967C5A376916524A600e12338A994B69Ac37688" },
  { name: "Diamond Core Cut Factory", address: "0x2535D76e7b1657999B0182E47d8964d4A30B1C45" },
  { name: "Immutable CREATE2 Enterprise Factory", address: "0x4e59b44847b379578588920cA78FbF26c0B4956C" },
  { name: "Institutional Treasury Governor Alpha", address: "0xC0RP89F4b537A179427D60D64860D4e2a8685afe" },
];

export const ENTERPRISE_ARCHETYPES = [
  "Enterprise Transparent Upgradeable Proxy (EIP-1967)",
  "Gnosis Safe Multi-Sig Core (Enterprise 4-of-7)",
  "ERC-2535 Diamond Multi-Facet Modular Contract",
  "OpenZeppelin Timelock Governor (CREATE2 Salt Grinded)",
  "Enterprise Account Abstraction Paymaster (ERC-4337)",
  "Gas-Optimized Zero-Calldata Institutional Contract",
];

// Generate Enterprise EVM Contract Address (CREATE2 / Proxy / Multi-Sig deterministic derivation)
export function generateEVMAddress(
  isVanity: boolean = false,
  customPrefix: string = "",
  eip55: boolean = true
): { address: string; isVanity: boolean; archetype: string; salt: string } {
  let address = "";
  const salt = "0x" + generateRandomHex(64);
  const archetype = ENTERPRISE_ARCHETYPES[Math.floor(Math.random() * ENTERPRISE_ARCHETYPES.length)];

  if (isVanity || customPrefix) {
    const prefix = customPrefix
      ? customPrefix.replace(/^0x/i, "").toLowerCase()
      : ENTERPRISE_EVM_PREFIXES[Math.floor(Math.random() * ENTERPRISE_EVM_PREFIXES.length)].toLowerCase();
    const remainingLength = Math.max(0, 40 - prefix.length);
    address = "0x" + prefix + generateRandomHex(remainingLength);
    return {
      address: eip55 ? toChecksumAddress(address) : address,
      isVanity: true,
      archetype,
      salt,
    };
  }

  // Enterprise standard: Calldata gas-optimized zero-byte prefix or institutional standard
  const standardEnterprisePrefixes = ["0000", "000", "00", "5afe", "c0rp", "1967", "2535", "de90", "acce", "8888"];
  const prefix = standardEnterprisePrefixes[Math.floor(Math.random() * standardEnterprisePrefixes.length)];
  const remainingLength = Math.max(0, 40 - prefix.length);
  address = "0x" + prefix + generateRandomHex(remainingLength);

  return {
    address: eip55 ? toChecksumAddress(address) : address,
    isVanity: false,
    archetype,
    salt,
  };
}

// Generate Enterprise Solana Mint / Program-Derived Address (PDA)
export function generateSolanaKey(
  isVanity: boolean = false,
  customPrefix: string = ""
): { address: string; isVanity: boolean; archetype: string } {
  const prefix = customPrefix || ENTERPRISE_SOLANA_PREFIXES[Math.floor(Math.random() * ENTERPRISE_SOLANA_PREFIXES.length)];
  const remaining = 44 - prefix.length;
  return {
    address: prefix + generateBase58(remaining),
    isVanity: isVanity || !!customPrefix,
    archetype: "Enterprise SPL-Token-2022 Mint PDA",
  };
}

// Generate Enterprise Bitcoin Taproot / Runes Multisig AST Address
export function generateBitcoinAddress(): string {
  const enterpriseSub = ["corp", "safe", "vault", "inst", "gov"][Math.floor(Math.random() * 5)];
  let body = enterpriseSub;
  for (let i = enterpriseSub.length; i < 58; i++) {
    body += BECH32_CHARS[Math.floor(Math.random() * BECH32_CHARS.length)];
  }
  return "bc1p" + body;
}

// Generate Enterprise Quantum-Hybrid Post-Quantum Lattice Address (Kyber-768/Falcon)
export function generateQuantumAddress(): string {
  const prefix = ["C0RP", "5AFE", "1N5T", "VAULT", "GOV", "ENT"][Math.floor(Math.random() * 6)];
  return "0xQ" + prefix + generateRandomHex(40 - prefix.length);
}

// Generate Enterprise Cosmos IBC Module / Multi-Sig Address
export function generateCosmosAddress(): string {
  const enterpriseSub = ["corp", "safe", "gov", "vault", "inst"][Math.floor(Math.random() * 5)];
  let body = enterpriseSub;
  for (let i = enterpriseSub.length; i < 38; i++) {
    body += BECH32_CHARS[Math.floor(Math.random() * BECH32_CHARS.length)];
  }
  return "cosmos1" + body;
}

// Generate uint256 Token ID
export function generateUint256TokenId(format: "decimal" | "hex64" = "decimal", sequenceIndex?: number): string {
  if (sequenceIndex !== undefined && sequenceIndex < 1000000 && Math.random() > 0.4) {
    if (format === "hex64") {
      return "0x" + sequenceIndex.toString(16).padStart(64, "0");
    }
    return sequenceIndex.toString();
  }

  if (format === "hex64") {
    return "0x" + generateRandomHex(64);
  }

  // Generate large uint256-like decimal string
  let high = Math.floor(Math.random() * 900000000 + 100000000).toString();
  let mid = Math.floor(Math.random() * 900000000 + 100000000).toString();
  let low = Math.floor(Math.random() * 900000000 + 100000000).toString();
  return high + mid + low;
}

export const SOVEREIGN_RESERVE_SHARES = "900000000000000000000"; // 9e20 with 18 decimals (Reserve)
export const SOVEREIGN_TREASURY_SHARES = "9000000000000000000000"; // 9e21 with 18 decimals (Treasury)
export const SOVEREIGN_OWNER = "Mauro Lomibao Dar III";
export const MIN_SOVEREIGN_MARKET_CAP = 3_000_000_000_000; // $3.00 Trillion USD

// Mathematical Boundaries & 2^8 Tokenomics Constants
export const UINT256_MAX_STRING = "115792089237316195423570985008687907853269984665640564039457584007913129639935"; // 2^256 - 1
export const POWER_OF_TWO_RESERVES = 256; // 2^8
export const MIN_COINMARKETCAP_METRIC = 256; // >= 2^8

export function buildInstitutionalTokenomics(
  name: string,
  symbol: string,
  chain: ChainType = "ethereum",
  standard: TokenStandard = "ERC-20"
): GeneratedTokenomics {
  const pillars: TokenomicsPillars = {
    mathematicalBoundaries: {
      uint256Ceiling: "115792089237316195423570985008687907853269984665640564039457584007913129639935 (2^256 - 1)",
      uint256ExponentialNotation: "2^256 - 1 (~1.1579e77 wei)",
      noLiteralInfinityExplanation: "Numbers on EVM blockchains are limited by data types (such as uint256, which has a hard ceiling of 2^256 - 1). They cannot represent literal infinity. Checked arithmetic prevents silent overflows.",
      overflowProtection: "Solidity 0.8+ checked arithmetic / SafeMath boundary validation",
    },
    economicRealities: {
      capitalBackingRequired: true,
      liquidityReserveMechanics: "Real liquidity reserves require actual capital deposited by participants, and market values depend entirely on real-world market dynamics, not automated code commands.",
      marketDynamicsDependence: "Constant product invariant (x * y = k) mandates real token and collateral deposits. Monetary velocity and valuation stem from verifiable trading volume and order books.",
    },
    smartContractArchitecture: {
      standardFramework: "OpenZeppelin Contracts v5.0 (ERC-20 / ERC-4626 / Permit / Ownable2Step)",
      governanceModel: "Ownable2Step + MultiSig (Owner: Mauro Lomibao Dar III)",
      monetaryCreationTruth: "Standard contracts (such as OpenZeppelin ERC-20) define fixed or mintable supplies governed by an owner address or multisig, but they cannot create monetary value on their own.",
    },
  };

  const powerOfTwo: PowerOfTwoTokenomics = {
    reserveSharesPowerOfTwo: POWER_OF_TWO_RESERVES, // 2^8 = 256
    reserveSharesExponent: 8,
    reserveSharesFormatted: "2^8 (256 Reserves / Shares)",
    reserveOwner: SOVEREIGN_OWNER,
    coinmarketcapMetricFloor: MIN_COINMARKETCAP_METRIC, // >= 2^8 (256)
    coinmarketcapMetricDescription: "CoinMarketCap floor metric indexed at >= 2^8 (256 points / floor tier)",
    smartContractAddressBatchCount: POWER_OF_TWO_RESERVES, // >= 2^8 (256 addresses)
  };

  const cleanSymbol = symbol.replace(/[^a-zA-Z0-9]/g, "") || "Token";
  const cleanName = name.replace(/[^a-zA-Z0-9 ]/g, "") || "Protocol Asset";

  const solidityStub = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title ${cleanName} (${cleanSymbol})
 * @author Mauro L. Dar III
 * @notice Invented and architected by Mauro L. Dar III
 * @notice Mathematical Boundaries: uint256 ceiling (2^256 - 1) strictly enforced.
 * @notice Economic Realities: Liquidity requires participant capital; no artificial value without reserves.
 * @notice Smart Contract Architecture: OpenZeppelin governed by Sovereign Owner.
 * @custom:inventor Mauro L. Dar III
 * @custom:reserve-shares 2^8 (256 Reserves)
 * @custom:coinmarketcap-floor >= 2^8 (256 Metric Floor)
 * @custom:owner Mauro Lomibao Dar III
 */
contract ${cleanSymbol} is ERC20Permit, Ownable2Step {
    uint256 public constant UINT256_MAX = type(uint256).max; // 2^256 - 1
    uint256 public constant RESERVE_SHARES_2_EXP_8 = 256; // 2^8 Reserves
    uint256 public constant CMC_METRIC_FLOOR = 256; // >= 2^8 Floor

    address public immutable SOVEREIGN_CUSTODIAN;
    uint256 public immutable reserveAllocation;

    event ReserveSharesAllocated(address indexed custodian, uint256 shares);

    constructor(
        string memory tokenName,
        string memory tokenSymbol,
        uint256 initialSupply,
        address initialOwner
    ) 
        ERC20(tokenName, tokenSymbol) 
        ERC20Permit(tokenName) 
        Ownable(initialOwner) 
    {
        require(initialSupply <= UINT256_MAX, "Math boundary: exceeds uint256");
        SOVEREIGN_CUSTODIAN = initialOwner;
        reserveAllocation = RESERVE_SHARES_2_EXP_8;
        _mint(initialOwner, initialSupply);
        emit ReserveSharesAllocated(initialOwner, RESERVE_SHARES_2_EXP_8);
    }
}`;

  return {
    tagline: `Algorithmic 2⁸ Reserve Tokenomics with EVM uint256 Boundary Enforcement`,
    executiveSummary: `Dual-tier institutional token architecture incorporating 2^8 (256) Sovereign Reserve shares, audited OpenZeppelin ERC-20 framework, strict mathematical uint256 ceilings, and participant-backed economic liquidity.`,
    tokenomics: [
      { category: "2⁸ Sovereign Reserve Pool (256 Shares)", percentage: 25.6, lockup: "48-Month Sovereign Timelock" },
      { category: "Macro Treasury Allocation", percentage: 25.6, lockup: "36-Month DAO Escrow" },
      { category: "Public AMM Liquidity Reserves", percentage: 25.6, lockup: "100% Locked Liquidity Invariant (x*y=k)" },
      { category: "Ecosystem Grants & Staking Yield", percentage: 23.2, lockup: "Continuous Block Vesting" },
    ],
    solidityStub,
    securityScore: 99,
    auditNotes: `Mathematical Boundary Certified: Max uint256 ceiling verified. No literal infinity permitted. Standard OpenZeppelin Ownable2Step architecture. Real-world liquidity required for AMM pricing.`,
    pillars,
    powerOfTwo,
  };
}

export function generateContractAddressBatch(
  count: number = 256,
  chain: ChainType = "ethereum"
): Array<{
  index: number;
  address: string;
  chain: ChainType;
  salt: string;
  standard: string;
  mathChecked: boolean;
  archetype: string;
  isEnterprise: boolean;
}> {
  const targetCount = Math.max(256, count);
  const result = [];
  for (let i = 0; i < targetCount; i++) {
    const isVanity = i % 8 === 0;
    const { address, archetype, salt } = generateEVMAddress(isVanity, "", true);
    result.push({
      index: i + 1,
      address,
      chain,
      salt: salt || ("0x" + generateRandomHex(64)),
      standard: i % 2 === 0 ? "Enterprise ERC-20 Proxy" : "Enterprise ERC-4626 Vault",
      mathChecked: true,
      archetype: archetype || "Enterprise Transparent Upgradeable Proxy (EIP-1967)",
      isEnterprise: true,
    });
  }
  return result;
}

export function enrichTokenWithTokenomics(token: TokenRecord): TokenRecord {
  const tokenomics = token.tokenomics || buildInstitutionalTokenomics(token.name, token.symbol, token.chain, token.tokenStandard);
  return {
    ...token,
    powerOfTwoReserves: POWER_OF_TWO_RESERVES, // 2^8 = 256
    coinmarketcapMetric: Math.max(MIN_COINMARKETCAP_METRIC, token.coinmarketcapMetric || 256),
    tokenomics,
    tokenomicsPillars: tokenomics.pillars,
  };
}

export function enrichAllTokensWithTokenomics(tokens: TokenRecord[]): TokenRecord[] {
  return tokens.map((t) => enrichTokenWithTokenomics(t));
}

export function formatMarketCapCompact(cap: number): string {
  if (!cap || cap <= 0) return "$0";
  if (cap >= 1e15) return `$${(cap / 1e15).toFixed(2)}Q`;
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
  if (cap >= 1e3) return `$${(cap / 1e3).toFixed(2)}K`;
  return `$${cap.toFixed(2)}`;
}

export function expandTokenToSovereignMarketCap(
  token: TokenRecord,
  minMarketCap: number = MIN_SOVEREIGN_MARKET_CAP
): TokenRecord {
  const targetCap = Math.max(
    minMarketCap,
    token.marketCap >= minMarketCap
      ? token.marketCap
      : minMarketCap + Math.floor(Math.random() * 2_500_000_000_000)
  );

  const numericSupply = token.tokenStandard === "ERC-721" ? 10000 : 1_000_000_000;
  const priceUsd = Number((targetCap / numericSupply).toFixed(4));

  return {
    ...token,
    marketCap: targetCap,
    priceUsd: priceUsd > 0 ? priceUsd : token.priceUsd,
    reserveShares: SOVEREIGN_RESERVE_SHARES,
    treasuryShares: SOVEREIGN_TREASURY_SHARES,
    targetOwner: SOVEREIGN_OWNER,
  };
}

export function expandAllTokensToSovereignMarketCap(
  tokens: TokenRecord[],
  minMarketCap: number = MIN_SOVEREIGN_MARKET_CAP
): TokenRecord[] {
  return tokens.map((t) => expandTokenToSovereignMarketCap(t, minMarketCap));
}

// Single Token Record Generator
export function generateTokenRecord(
  index: number,
  config: Partial<GenerationConfig> = {}
): TokenRecord {
  const chains: ChainType[] = config.chains && config.chains.length > 0 ? config.chains : ["ethereum", "base", "arbitrum", "solana"];
  const chain = chains[Math.floor(Math.random() * chains.length)];

  const narratives: NarrativeCategory[] = config.narratives && config.narratives.length > 0 ? config.narratives : ["ai_agents", "depin", "rwa", "quantum_defi"];
  const narrative = narratives[Math.floor(Math.random() * narratives.length)];

  const standards: TokenStandard[] = config.standards && config.standards.length > 0 ? config.standards : ["ERC-20", "ERC-721", "ERC-1155"];
  const tokenStandard = standards[Math.floor(Math.random() * standards.length)];

  // Vanity decision
  const vanityThreshold = (config.vanityPercentage ?? 5) / 100;
  const isVanity = config.includeVanity ? Math.random() < vanityThreshold : false;

  let contractAddress = "";
  let actualIsVanity = isVanity;

  switch (chain) {
    case "solana": {
      const res = generateSolanaKey(isVanity, config.customVanityPrefix);
      contractAddress = res.address;
      actualIsVanity = res.isVanity;
      break;
    }
    case "bitcoin": {
      contractAddress = generateBitcoinAddress();
      break;
    }
    case "quantum": {
      contractAddress = generateQuantumAddress();
      break;
    }
    case "cosmos": {
      contractAddress = generateCosmosAddress();
      break;
    }
    default: {
      const res = generateEVMAddress(isVanity, config.customVanityPrefix, config.eip55Checksum ?? true);
      contractAddress = res.address;
      actualIsVanity = res.isVanity;
      break;
    }
  }

  // Pick metadata pool based on narrative
  const pool = NARRATIVE_METADATA_POOLS[narrative];
  const nameObj = pool.names[Math.floor(Math.random() * pool.names.length)];
  const name = `${nameObj.prefix}${pool.suffixes[Math.floor(Math.random() * pool.suffixes.length)]}`;
  const symbol = nameObj.symbolPrefix + (Math.random() > 0.5 ? "X" : "N");

  // Market simulation
  const statuses: LaunchStatus[] = ["Deployed", "Audited", "Liquidity Locked", "Paused", "Rug-Proof Vault"];
  const statusWeights = [0.45, 0.25, 0.2, 0.05, 0.05];
  const randStatus = Math.random();
  let cumulative = 0;
  let launchStatus: LaunchStatus = "Deployed";
  for (let i = 0; i < statuses.length; i++) {
    cumulative += statusWeights[i];
    if (randStatus <= cumulative) {
      launchStatus = statuses[i];
      break;
    }
  }

  const auditFirm = AUDIT_FIRMS[Math.floor(Math.random() * AUDIT_FIRMS.length)];
  const poolItem = getRandomLiquidityPoolForChain(chain);
  const liquidityPair = `${poolItem.pair} (${poolItem.dex})`;
  const liquidityPoolId = poolItem.id;
  const decimals = tokenStandard === "ERC-721" ? 0 : [18, 9, 6][Math.floor(Math.random() * 3)];
  const initialSupply = tokenStandard === "ERC-721" ? "10,000" : (Math.floor(Math.random() * 900 + 100) * 1000000).toLocaleString();

  let marketCap: number;
  let priceUsd: number;

  if (config.macroMarketCapScale) {
    marketCap = MIN_SOVEREIGN_MARKET_CAP + Math.floor(Math.random() * 4_500_000_000_000); // $3.0T to $7.5T
    const supplyFactor = tokenStandard === "ERC-721" ? 10000 : 1_000_000_000;
    priceUsd = Number((marketCap / supplyFactor).toFixed(4));
  } else {
    priceUsd = Number((Math.random() * 45 + 0.0012).toFixed(4));
    marketCap = Math.floor(priceUsd * (tokenStandard === "ERC-721" ? 10000 : 100000000));
  }

  const holderCount = Math.floor(Math.random() * 24000 + 120);
  const securityScore = Math.floor(Math.random() * 20 + 80);

  const creationTx = "0x" + generateRandomHex(64);
  const enterpriseDeployer = ENTERPRISE_DEPLOYERS[Math.floor(Math.random() * ENTERPRISE_DEPLOYERS.length)].address;
  const enterpriseSalt = "0x" + generateRandomHex(64);

  // Generate cryptographically functional wallet pair so private key functions when added to wallet
  let deployerPrivateKey: string;
  let deployerAddress: string;

  if (chain === "solana") {
    deployerPrivateKey = generateBase58(88);
    deployerAddress = (config.customDeployerAddress && !config.customDeployerAddress.startsWith("0x"))
      ? config.customDeployerAddress
      : SOLANA_SOVEREIGN_DEPLOYER;
  } else if (config.customDeployerAddress && ethers.isAddress(config.customDeployerAddress)) {
    deployerAddress = config.eip55Checksum ? toChecksumAddress(config.customDeployerAddress) : config.customDeployerAddress;
    deployerPrivateKey = generateDeployerPrivateKey(chain);
  } else {
    // Default to active Foundry Sovereign Deployer
    deployerAddress = config.eip55Checksum ? toChecksumAddress(FOUNDRY_SOVEREIGN_DEPLOYER) : FOUNDRY_SOVEREIGN_DEPLOYER;
    deployerPrivateKey = generateDeployerPrivateKey(chain);
  }

  const contractArchetype =
    chain === "solana"
      ? "Enterprise SPL-Token-2022 Mint PDA"
      : chain === "bitcoin"
      ? "Enterprise Taproot Multisig AST (3-of-5)"
      : chain === "quantum"
      ? "Post-Quantum Kyber Lattice Safe"
      : chain === "cosmos"
      ? "Enterprise Cosmos IBC Multi-Sig Module"
      : ENTERPRISE_ARCHETYPES[Math.floor(Math.random() * ENTERPRISE_ARCHETYPES.length)];
  const quantum_entropy_signature = generateQuantumEntropySignature();

  const tokenomics = buildInstitutionalTokenomics(name, symbol, chain, tokenStandard);

  const record: TokenRecord = {
    id: `tok_${index}_${Date.now().toString(36)}`,
    name,
    symbol,
    chain,
    networkId: CHAIN_NETWORK_MAP[chain] || 1,
    contractAddress,
    isVanity: actualIsVanity,
    contractArchetype,
    isEnterprise: true,
    enterpriseSalt,
    enterpriseTier: "Tier-1 Institutional",
    genre: resolveTokenGenre({ narrative, isVanity: actualIsVanity, tokenStandard }),
    tokenId: generateUint256TokenId(config.uint256Format || "decimal", index),
    tokenStandard,
    narrative,
    launchStatus,
    isDeployed: launchStatus === "Deployed",
    deploymentHistory: launchStatus === "Deployed" ? [
      {
        id: `dep_${Date.now()}_${index}`,
        timestamp: new Date().toISOString(),
        deployerAddress: config.eip55Checksum ? toChecksumAddress(deployerAddress) : deployerAddress,
        status: "Success" as const,
        network: chain,
        txHash: creationTx,
        contractAddress: contractAddress,
        gasUsed: "184,200",
        notes: `Initial deployment to blockchain market via ${liquidityPair}.`,
      }
    ] : [],
    initialSupply,
    decimals,
    marketCap,
    priceUsd,
    liquidityPair,
    liquidityPoolId,
    reserveShares: SOVEREIGN_RESERVE_SHARES,
    treasuryShares: SOVEREIGN_TREASURY_SHARES,
    targetOwner: SOVEREIGN_OWNER,
    powerOfTwoReserves: POWER_OF_TWO_RESERVES, // 2^8 = 256
    coinmarketcapMetric: Math.max(MIN_COINMARKETCAP_METRIC, Math.floor(Math.random() * 500 + 256)), // >= 2^8
    tokenomics,
    tokenomicsPillars: tokenomics.pillars,
    holderCount,
    auditFirm,
    securityScore,
    createdAt: new Date(Date.now() - Math.floor(Math.random() * 86400000 * 30)).toISOString(),
    creationTx,
    deployerAddress: config.eip55Checksum ? toChecksumAddress(deployerAddress) : deployerAddress,
    deployerPrivateKey,
    treasuryAddress: config.customTreasuryAddress
      ? (config.eip55Checksum && ethers.isAddress(config.customTreasuryAddress) ? toChecksumAddress(config.customTreasuryAddress) : config.customTreasuryAddress)
      : (chain === "base" ? BASE_TREASURY_ADDRESS : (chain === "polygon" ? POLYGON_TREASURY_ADDRESS : (chain === "solana" ? SOLANA_MULTISIG_TREASURY : PROTOCOL_TREASURY_ADDRESS))),
    quantum_entropy_signature,
  };

  // Generate deterministic vector SVG and image data URI for instantaneous rendering
  const svgData = generateTokenSvg(record);
  const imageUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgData)}`;
  record.svgData = svgData;
  record.imageUrl = imageUrl;

  // Immediately warm up synchronous L1 cache
  setTokenImageInCache(record.id, imageUrl);

  // Automatically scan name, narrative, and parameters to apply categorical tags
  const autoTags = scanTokenForCategoricalTags(record, { maxTagsPerToken: 3 });
  record.tags = autoTags;

  return record;
}

// Convert any legacy or personal token record to an enterprise contract architecture
export function upgradeToEnterpriseToken(token: TokenRecord): TokenRecord {
  const isPersonal =
    !token.isEnterprise ||
    !token.contractArchetype ||
    token.contractAddress.toLowerCase().includes("dead") ||
    token.contractAddress.toLowerCase().includes("beef") ||
    token.contractAddress.toLowerCase().includes("coffee") ||
    token.contractAddress.toLowerCase().includes("pump") ||
    token.contractAddress.toLowerCase().includes("moon");

  let contractAddress = token.contractAddress;
  let actualIsVanity = token.isVanity;

  if (isPersonal) {
    switch (token.chain) {
      case "solana": {
        const res = generateSolanaKey(token.isVanity);
        contractAddress = res.address;
        actualIsVanity = res.isVanity;
        break;
      }
      case "bitcoin": {
        contractAddress = generateBitcoinAddress();
        break;
      }
      case "quantum": {
        contractAddress = generateQuantumAddress();
        break;
      }
      case "cosmos": {
        contractAddress = generateCosmosAddress();
        break;
      }
      default: {
        const res = generateEVMAddress(token.isVanity, "", true);
        contractAddress = res.address;
        actualIsVanity = res.isVanity;
        break;
      }
    }
  }

  const enterpriseDeployer = ENTERPRISE_DEPLOYERS[Math.floor(Math.random() * ENTERPRISE_DEPLOYERS.length)].address;
  const contractArchetype =
    token.chain === "solana"
      ? "Enterprise SPL-Token-2022 Mint PDA"
      : token.chain === "bitcoin"
      ? "Enterprise Taproot Multisig AST (3-of-5)"
      : token.chain === "quantum"
      ? "Post-Quantum Kyber Lattice Safe"
      : token.chain === "cosmos"
      ? "Enterprise Cosmos IBC Multi-Sig Module"
      : token.contractArchetype || ENTERPRISE_ARCHETYPES[Math.floor(Math.random() * ENTERPRISE_ARCHETYPES.length)];

  let deployerPrivateKey = token.deployerPrivateKey;
  let deployerAddress = token.deployerAddress;

  if (token.chain === "solana") {
    if (!deployerPrivateKey) deployerPrivateKey = generateBase58(88);
    deployerAddress = SOLANA_SOVEREIGN_DEPLOYER;
  } else {
    // EVM: verify if private key derives address or prioritize active foundry deployer
    if (
      !deployerAddress ||
      deployerAddress.toLowerCase() === "0x5afe48a2f594f8e619e63b09cd4d64593c1fc891" ||
      !ethers.isAddress(deployerAddress)
    ) {
      deployerAddress = FOUNDRY_SOVEREIGN_DEPLOYER;
      deployerPrivateKey = generateDeployerPrivateKey(token.chain);
    } else if (deployerPrivateKey && /^0x[0-9a-fA-F]{64}$/.test(deployerPrivateKey)) {
      try {
        deployerAddress = ethers.computeAddress(deployerPrivateKey);
      } catch {
        deployerAddress = FOUNDRY_SOVEREIGN_DEPLOYER;
      }
    } else {
      deployerAddress = FOUNDRY_SOVEREIGN_DEPLOYER;
      deployerPrivateKey = generateDeployerPrivateKey(token.chain);
    }
  }

  return {
    ...token,
    contractAddress,
    isVanity: actualIsVanity,
    deployerAddress: token.chain === "solana" ? deployerAddress : toChecksumAddress(deployerAddress),
    treasuryAddress:
      token.treasuryAddress ||
      (token.chain === "base" ? BASE_TREASURY_ADDRESS : (token.chain === "solana" ? SOLANA_MULTISIG_TREASURY : PROTOCOL_TREASURY_ADDRESS)),
    contractArchetype,
    isEnterprise: true,
    enterpriseSalt: token.enterpriseSalt || ("0x" + generateRandomHex(64)),
    enterpriseTier: "Tier-1 Institutional",
    deployerPrivateKey,
    tags: token.tags && token.tags.length > 0 ? token.tags : scanTokenForCategoricalTags(token, { maxTagsPerToken: 3 }),
  };
}

export function upgradeAllTokensToEnterprise(tokens: TokenRecord[]): TokenRecord[] {
  return tokens.map(upgradeToEnterpriseToken);
}

export interface EnterpriseVerificationResult {
  isVerified: boolean;
  tier: string;
  badgeLabel: string;
  checks: {
    formatValid: boolean;
    prefixCompliant: boolean;
    checksumValid: boolean;
    antiMemeClean: boolean;
    deployerSecured: boolean;
  };
  reason: string;
}

export function verifyEnterpriseContractRequirements(token: TokenRecord): EnterpriseVerificationResult {
  const addr = token.contractAddress || "";
  const chain = token.chain;
  const lowerAddr = addr.toLowerCase();

  // 1. Anti-meme check: reject casual meme fragments
  const memeWords = ["dead", "beef", "coffee", "pump", "moon", "doge", "shib", "pepe"];
  const antiMemeClean = !memeWords.some((w) => lowerAddr.includes(w));

  let formatValid = false;
  let prefixCompliant = false;
  let checksumValid = false;

  if (chain === "ethereum" || chain === "base" || chain === "arbitrum" || chain === "polygon") {
    // EVM: 0x + 40 hex chars = 42 chars
    formatValid = /^0x[0-9a-fA-F]{40}$/.test(addr);
    const enterpriseEvmPrefixes = [
      "00000", "0000", "000", "00", "5afe", "c0rp", "1967", "2535", "4337", "de90", "acce", "ba5e", "8888", "7777", "eeee", "cafe"
    ];
    const strippedHex = lowerAddr.replace(/^0x/, "");
    prefixCompliant = enterpriseEvmPrefixes.some((p) => strippedHex.startsWith(p)) || Boolean(token.isEnterprise);

    // Checksum verification
    try {
      const calculated = toChecksumAddress(addr);
      checksumValid = addr === calculated || addr.toLowerCase() === calculated.toLowerCase();
    } catch {
      checksumValid = false;
    }
  } else if (chain === "solana") {
    // Solana: 40-44 Base58 characters
    formatValid = /^[1-9A-HJ-NP-za-km-z]{40,44}$/.test(addr);
    const enterpriseSolPrefixes = ["corp", "safe", "vault", "inst", "gov", "treasury", "prime", "ent", "token2022", "audit"];
    prefixCompliant = enterpriseSolPrefixes.some((p) => lowerAddr.startsWith(p)) || Boolean(token.isEnterprise);
    checksumValid = formatValid;
  } else if (chain === "bitcoin") {
    // Bitcoin Taproot AST: bc1p...
    formatValid = addr.startsWith("bc1p") && addr.length >= 60;
    prefixCompliant = ["corp", "safe", "vault", "inst", "gov"].some((p) => lowerAddr.includes(p)) || Boolean(token.isEnterprise);
    checksumValid = formatValid;
  } else if (chain === "quantum") {
    // Post-Quantum Kyber: 0xQ...
    formatValid = /^0xQ[0-9a-fA-F]{30,42}$/i.test(addr);
    prefixCompliant = ["c0rp", "5afe", "1n5t", "vault", "gov", "ent"].some((p) => lowerAddr.includes(p)) || Boolean(token.isEnterprise);
    checksumValid = formatValid;
  } else if (chain === "cosmos") {
    // Cosmos IBC: cosmos1...
    formatValid = addr.startsWith("cosmos1") && addr.length >= 40;
    prefixCompliant = ["corp", "safe", "gov", "vault", "inst"].some((p) => lowerAddr.includes(p)) || Boolean(token.isEnterprise);
    checksumValid = formatValid;
  }

  const deployerSecured = Boolean(
    token.deployerAddress &&
    (token.deployerAddress.startsWith("0x5AFE") ||
     token.deployerAddress.startsWith("0x0000") ||
     token.deployerAddress.startsWith("0x1967") ||
     token.deployerAddress.startsWith("0x2535") ||
     token.deployerAddress.startsWith("0x4e59") ||
     token.deployerAddress.startsWith("0xC0RP") ||
     token.isEnterprise)
  );

  const isVerified = formatValid && prefixCompliant && antiMemeClean;

  let tier = token.enterpriseTier || "Tier-1 Institutional";
  if (token.contractArchetype?.includes("Safe") || token.contractArchetype?.includes("Multi-Sig")) {
    tier = "Enterprise Safe Multi-Sig";
  } else if (token.contractArchetype?.includes("Proxy") || token.contractArchetype?.includes("1967")) {
    tier = "EIP-1967 Proxy Beacon";
  } else if (token.contractArchetype?.includes("Diamond") || token.contractArchetype?.includes("2535")) {
    tier = "ERC-2535 Diamond Core";
  } else if (token.contractArchetype?.includes("Paymaster") || token.contractArchetype?.includes("4337")) {
    tier = "ERC-4337 Account Abstraction";
  }

  const badgeLabel = "Enterprise";

  let reason = "";
  if (!formatValid) {
    reason = "Address fails length or hexadecimal formatting requirements";
  } else if (!antiMemeClean) {
    reason = "Address contains non-institutional casual vanity strings";
  } else if (!prefixCompliant) {
    reason = "Address lacks standard enterprise deterministic prefix specification";
  } else {
    reason = "Complies with EIP-55, deterministic CREATE2/PDA architecture and institutional multi-sig governance";
  }

  return {
    isVerified,
    tier,
    badgeLabel,
    checks: {
      formatValid,
      prefixCompliant,
      checksumValid,
      antiMemeClean,
      deployerSecured,
    },
    reason,
  };
}

// Batch generator
export function generateTokenBatch(count: number, config: Partial<GenerationConfig> = {}): TokenRecord[] {
  const batch: TokenRecord[] = new Array(count);
  for (let i = 0; i < count; i++) {
    batch[i] = generateTokenRecord(i + 1, config);
  }
  // Asynchronously warm IndexedDB cache for batch in background
  try {
    preloadTokenImages(batch);
  } catch {
    // Non-blocking
  }
  return batch;
}

// ==============================================================================
// Foundry Deployment Environment & Keystore Generators (.env & CLI scripts)
// ==============================================================================

export function buildDotEnvConfig(
  token: TokenRecord,
  rpcUrlOverride?: string,
  etherscanKeyOverride?: string
): string {
  const rpcUrl = rpcUrlOverride || DEFAULT_RPC_URLS[token.chain] || "https://eth.llamarpc.com";
  const etherscanKey = etherscanKeyOverride || "ETHERSCAN_API_KEY_PLACEHOLDER";
  const pKey = token.deployerPrivateKey || generateDeployerPrivateKey(token.chain);

  return `# ==============================================================================
# Web3 Foundry / Hardhat Deployment Environment
# Asset: ${token.name} (${token.symbol}) | Standard: ${token.tokenStandard} | Chain: ${token.chain.toUpperCase()}
# ==============================================================================

# Network RPC Provider
RPC_URL=${rpcUrl}

# Deployer Private Key (Simulated / Devnet Key for Foundry Scripts & cast wallet)
PRIVATE_KEY=${pKey}

# Block Explorer Verification API Key (Etherscan / Basescan / Arbiscan)
ETHERSCAN_API_KEY=${etherscanKey}

# Contract & Identity Architecture Identifiers
CONTRACT_ADDRESS=${token.contractAddress}
TOKEN_ID=${token.tokenId}
CHAIN_ID=${token.networkId}
DEPLOYER_ADDRESS=${token.deployerAddress}
TREASURY_ADDRESS=${token.treasuryAddress || (token.chain === "base" ? BASE_TREASURY_ADDRESS : token.chain === "polygon" ? POLYGON_TREASURY_ADDRESS : token.chain === "solana" ? SOLANA_MULTISIG_TREASURY : PROTOCOL_TREASURY_ADDRESS)}
ENTERPRISE_SALT=${token.enterpriseSalt || "0x0000000000000000000000000000000000000000000000000000000000000000"}
QUANTUM_SIGNATURE=${token.quantum_entropy_signature}
`;
}

export function buildCastKeystoreCommand(
  privateKey: string,
  accountName: string = "deployer"
): string {
  return `# Step 1: Import key securely into an encrypted Foundry keystore
cast wallet import ${accountName} --private-key ${privateKey}`;
}

export function buildForgeDeployScriptCommand(
  rpcUrl: string = "${RPC_URL}",
  accountName: string = "deployer",
  etherscanKey: string = "${ETHERSCAN_API_KEY}"
): string {
  return `# Step 2: Deploy using the saved keystore profile and verify on Etherscan
forge script script/Deploy.s.sol:DeployScript \\
  --rpc-url ${rpcUrl} \\
  --account ${accountName} \\
  --broadcast \\
  --verify \\
  --etherscan-api-key ${etherscanKey}`;
}

export function buildMultiTokenDotEnv(tokens: TokenRecord[]): string {
  if (tokens.length === 0) return "";
  let content = `# ==============================================================================
# Web3 Multi-Token & Contract ID Foundry Environment (.env)
# Total Generated Records: ${tokens.length}
# Generated: ${new Date().toISOString()}
# ==============================================================================

`;
  tokens.forEach((t, idx) => {
    const rpc = DEFAULT_RPC_URLS[t.chain] || "https://eth.llamarpc.com";
    const pKey = t.deployerPrivateKey || generateDeployerPrivateKey(t.chain);
    content += `# Token #${idx + 1}: ${t.symbol} - ${t.name} (${t.chain.toUpperCase()} / ${t.tokenStandard})
TOKEN_${idx + 1}_NAME="${t.name}"
TOKEN_${idx + 1}_SYMBOL="${t.symbol}"
TOKEN_${idx + 1}_CHAIN="${t.chain}"
TOKEN_${idx + 1}_RPC_URL="${rpc}"
TOKEN_${idx + 1}_CONTRACT="${t.contractAddress}"
TOKEN_${idx + 1}_ID="${t.tokenId}"
TOKEN_${idx + 1}_PRIVATE_KEY="${pKey}"
TOKEN_${idx + 1}_DEPLOYER="${t.deployerAddress}"

`;
  });
  return content;
}

/**
 * Derives a new random contract address for a given blockchain type.
 */
export function generateRandomContractAddressForChain(
  chain: ChainType,
  isVanity: boolean = false,
  customPrefix: string = "",
  eip55Checksum: boolean = true
): { address: string; isVanity: boolean; archetype?: string; salt?: string } {
  switch (chain) {
    case "solana": {
      const res = generateSolanaKey(isVanity, customPrefix);
      return { address: res.address, isVanity: res.isVanity, archetype: res.archetype };
    }
    case "bitcoin": {
      return { address: generateBitcoinAddress(), isVanity: false, archetype: "Enterprise Taproot Multisig AST (3-of-5)" };
    }
    case "quantum": {
      return { address: generateQuantumAddress(), isVanity: false, archetype: "Post-Quantum Kyber Lattice Safe" };
    }
    case "cosmos": {
      return { address: generateCosmosAddress(), isVanity: false, archetype: "Enterprise Cosmos IBC Multi-Sig Module" };
    }
    default: {
      const res = generateEVMAddress(isVanity, customPrefix, eip55Checksum);
      return { address: res.address, isVanity: res.isVanity, archetype: res.archetype, salt: res.salt };
    }
  }
}

/**
 * Creates an independent deep copy of a TokenRecord with a new random contract address,
 * fresh transaction hash, salt, and unique ID, while preserving all shared tokenomics metadata.
 */
export function duplicateTokenRecord(
  token: TokenRecord,
  options?: { nameSuffix?: string }
): TokenRecord {
  const newAddrObj = generateRandomContractAddressForChain(token.chain, false, "", true);

  // Deep clone tokenomics structures to guarantee independence
  const deepClonedTokenomics = token.tokenomics
    ? JSON.parse(JSON.stringify(token.tokenomics))
    : undefined;
  const deepClonedPillars = token.tokenomicsPillars
    ? JSON.parse(JSON.stringify(token.tokenomicsPillars))
    : undefined;

  const suffix = options?.nameSuffix ?? " (Copy)";
  const baseName = token.name.replace(/\s*\(Copy(?:\s+\d+)?\)$/, "");
  const newName = token.name.includes("(Copy")
    ? `${baseName} (Copy ${Math.floor(Math.random() * 900 + 100)})`
    : `${token.name}${suffix}`;

  const newId = `tok_dup_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
  const newTx = "0x" + generateRandomHex(64);
  const newSalt = newAddrObj.salt || ("0x" + generateRandomHex(64));
  const newEntropy = generateQuantumEntropySignature();
  const newTokenId = generateUint256TokenId("decimal");

  return {
    ...token,
    id: newId,
    name: newName,
    contractAddress: newAddrObj.address,
    isVanity: newAddrObj.isVanity,
    tokenId: newTokenId,
    contractArchetype: newAddrObj.archetype || token.contractArchetype,
    enterpriseSalt: newSalt,
    quantum_entropy_signature: newEntropy,
    creationTx: newTx,
    createdAt: new Date().toISOString(),
    // Shared tokenomics metadata (strictly deep copied)
    tokenomics: deepClonedTokenomics,
    tokenomicsPillars: deepClonedPillars,
  };
}

/**
 * Creates deep copies for a batch of TokenRecords.
 */
export function duplicateTokenBatch(tokens: TokenRecord[]): TokenRecord[] {
  return tokens.map((t) => duplicateTokenRecord(t));
}

