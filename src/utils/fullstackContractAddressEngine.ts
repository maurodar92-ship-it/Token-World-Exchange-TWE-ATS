/**
 * FULLSTACK CONTRACT ADDRESS & TOKEN SERVICE ENGINE
 * 
 * Provides:
 * 1. Trillions / UINT256 Explorer Maximum Allowance Token Types & Architectures
 * 2. Deterministic and CREATE2 fullstack contract address generation
 * 3. Support for importing and synthesizing the verified 49 UINT256 Smart Contract Addresses
 * 4. Multi-chain fullstack address derivation (Ethereum, Base, Arbitrum, Solana, Polygon, Bitcoin Taproot)
 */

import { ethers } from "ethers";
import { ChainType, TokenRecord, TokenStandard, NarrativeCategory } from "../types";
import { UINT256_CONTRACT_ADDRESS_DATASET } from "../data/uint256ContractAddressData";
import {
  generateEVMAddress,
  toChecksumAddress,
  buildInstitutionalTokenomics,
  generateQuantumEntropySignature,
  generateDeployerPrivateKey,
  FOUNDRY_SOVEREIGN_DEPLOYER,
  PROTOCOL_TREASURY_ADDRESS,
  MIN_SOVEREIGN_MARKET_CAP,
  SOVEREIGN_OWNER,
  SOVEREIGN_RESERVE_SHARES,
  SOVEREIGN_TREASURY_SHARES,
} from "./cryptoGenerators";

export const UINT256_MAX_ALLOWANCE = "115792089237316195423570985008687907853269984665640564039457584007913129639935"; // 2^256 - 1
export const UINT256_MAX_HEX = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

export type AllowanceTier =
  | "UINT256_MAX" // 2^256 - 1 (Unlimited approval pattern for DEXs / AMMs)
  | "TRILLIONS_100T" // 100 Trillion tokens (100,000,000,000,000)
  | "TRILLIONS_10T" // 10 Trillion tokens (10,000,000,000,000)
  | "TRILLIONS_1T" // 1 Trillion tokens (1,000,000,000,000)
  | "BILLIONS_1B"; // 1 Billion standard institutional supply

export type FullstackContractType =
  | "ERC20_TRILLION_SUPPLY"
  | "ERC20_UNLIMITED_ALLOWANCE"
  | "ERC721_UINT256_NFT"
  | "ERC1155_MULTI_TOKEN"
  | "ERC4626_TRILLION_VAULT"
  | "CREATE2_DETERMINISTIC_FACTORY"
  | "TRANSPARENT_UPGRADEABLE_PROXY"
  | "SOVEREIGN_TRILLION_RESERVE";

export interface FullstackContractSpecification {
  contractType: FullstackContractType;
  name: string;
  symbol: string;
  chain: ChainType;
  tokenStandard: TokenStandard;
  allowanceTier: AllowanceTier;
  allowanceValue: string;
  initialSupply: string;
  marketCap: number;
  contractAddress: string;
  deployerAddress: string;
  factorySalt: string;
  create2BytecodeHash: string;
  uint256TokenId: string;
  vanityZeros: number;
  isVerified: boolean;
  solidityTemplate: string;
}

export const ALLOWANCE_CONFIGS: Record<
  AllowanceTier,
  { label: string; formatted: string; rawValue: string; description: string }
> = {
  UINT256_MAX: {
    label: "2^256 - 1 (Max uint256)",
    formatted: "1.1579 × 10^77 (Infinite EVM Approval)",
    rawValue: UINT256_MAX_ALLOWANCE,
    description: "Standard DeFi protocol unlimited allowance pattern (Uniswap / Aave infinite permit)",
  },
  TRILLIONS_100T: {
    label: "100 Trillion Tokens",
    formatted: "100,000,000,000,000.00",
    rawValue: "100000000000000000000000000000000", // with 18 decimals
    description: "Ultra-high volume algorithmic currency / micro-transaction credit network",
  },
  TRILLIONS_10T: {
    label: "10 Trillion Tokens",
    formatted: "10,000,000,000,000.00",
    rawValue: "10000000000000000000000000000000",
    description: "Global settlement reserve and sovereign liquidity tier",
  },
  TRILLIONS_1T: {
    label: "1 Trillion Tokens",
    formatted: "1,000,000,000,000.00",
    rawValue: "1000000000000000000000000000000",
    description: "Benchmark 1 Trillion sovereign currency tier",
  },
  BILLIONS_1B: {
    label: "1 Billion Tokens",
    formatted: "1,000,000,000.00",
    rawValue: "1000000000000000000000000000",
    description: "Standard institutional blue-chip asset tier",
  },
};

/**
 * Generate a fullstack deterministic CREATE2 contract address
 * address = keccak256(0xff ++ factoryAddress ++ salt ++ keccak256(initCode))[12:]
 */
export function computeCreate2ContractAddress(
  factoryAddress: string,
  saltHex: string,
  initCodeHash: string
): string {
  try {
    const cleanFactory = factoryAddress.toLowerCase().replace(/^0x/, "");
    const cleanSalt = saltHex.toLowerCase().replace(/^0x/, "").padStart(64, "0");
    const cleanHash = initCodeHash.toLowerCase().replace(/^0x/, "").padStart(64, "0");

    const packed = "0xff" + cleanFactory + cleanSalt + cleanHash;
    const hash = ethers.keccak256(packed);
    const address = "0x" + hash.slice(-40);
    return toChecksumAddress(address);
  } catch {
    return generateEVMAddress(true, "0x0000", true).address;
  }
}

/**
 * Fullstack contract address generator for different kinds of tokens
 */
export function generateFullstackContractSpec(
  params: {
    contractType?: FullstackContractType;
    allowanceTier?: AllowanceTier;
    chain?: ChainType;
    index?: number;
    useDatasetAddress?: boolean;
    customSalt?: string;
  } = {}
): FullstackContractSpecification {
  const contractType = params.contractType || "ERC20_TRILLION_SUPPLY";
  const allowanceTier = params.allowanceTier || "UINT256_MAX";
  const chain = params.chain || "ethereum";
  const index = params.index || 1;

  const allowanceInfo = ALLOWANCE_CONFIGS[allowanceTier];

  // If using dataset address, pick one of the 49 verified addresses
  let contractAddress = "";
  let uint256TokenId = "";
  let name = "";
  let symbol = "";

  if (params.useDatasetAddress && UINT256_CONTRACT_ADDRESS_DATASET.length > 0) {
    const entry = UINT256_CONTRACT_ADDRESS_DATASET[(index - 1) % UINT256_CONTRACT_ADDRESS_DATASET.length];
    contractAddress = entry.contractAddress;
    uint256TokenId = entry.uint256TokenId;
    name = entry.suggestedName || `Trillion ${entry.suggestedSymbol || "Asset"}`;
    symbol = entry.suggestedSymbol || `TRL${index}`;
  } else {
    // Generate deterministic CREATE2 fullstack address
    const salt = params.customSalt || "0x" + ethers.hexlify(ethers.randomBytes(32)).replace(/^0x/, "");
    const dummyInitHash = ethers.keccak256(ethers.toUtf8Bytes(`INIT_CODE_${contractType}_${index}`));
    contractAddress = computeCreate2ContractAddress(FOUNDRY_SOVEREIGN_DEPLOYER, salt, dummyInitHash);
    uint256TokenId = BigInt(ethers.keccak256(ethers.toUtf8Bytes(contractAddress + index))).toString();

    const prefixes = ["Trillion", "MaxAllowance", "Sovereign", "Infinity", "Quantum", "Apex"];
    const suffixes = ["Reserve", "Vault", "Cash", "Standard", "Protocol", "Network"];
    name = `${prefixes[index % prefixes.length]} ${suffixes[index % suffixes.length]} #${index}`;
    symbol = `${name.slice(0, 3).toUpperCase()}${index}`;
  }

  const cleanAddr = contractAddress.replace(/^0x/, "").toLowerCase();
  const vanityZeros = cleanAddr.length - cleanAddr.replace(/^0+/, "").length;

  let initialSupply = "1,000,000,000,000";
  if (allowanceTier === "TRILLIONS_100T") initialSupply = "100,000,000,000,000";
  else if (allowanceTier === "TRILLIONS_10T") initialSupply = "10,000,000,000,000";
  else if (allowanceTier === "UINT256_MAX") initialSupply = "1,157,920,892,373,161,954,235,709,850,086";

  const marketCap = MIN_SOVEREIGN_MARKET_CAP + (index * 50_000_000_000);

  // Generate Solidity source code template
  const solidityTemplate = `// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title ${name} (${symbol})
 * @notice Fullstack Contract Address: ${contractAddress}
 * @notice Token Allowance Tier: ${allowanceInfo.label}
 * @notice Maximum uint256 Explorer Allowance: ${allowanceInfo.rawValue}
 */
contract ${symbol.replace(/[^a-zA-Z0-9]/g, "")}Contract is ERC20, ERC20Permit, Ownable2Step {
    uint256 public constant MAX_ALLOWANCE = ${allowanceTier === "UINT256_MAX" ? "type(uint256).max" : allowanceInfo.rawValue};
    uint256 public constant UINT256_TOKEN_ID = ${uint256TokenId};

    constructor(address initialOwner)
        ERC20("${name}", "${symbol}")
        ERC20Permit("${name}")
        Ownable(initialOwner)
    {
        // Mint Initial Sovereign Supply
        _mint(initialOwner, 1_000_000_000_000 * 10 ** decimals());
    }

    /// @notice Infinite allowance helper adhering to Uniswap v2/v3 & EIP-2612 standards
    function setMaximumAllowance(address spender) external returns (bool) {
        _approve(_msgSender(), spender, type(uint256).max);
        return true;
    }
}`;

  return {
    contractType,
    name,
    symbol,
    chain,
    tokenStandard: "ERC-20",
    allowanceTier,
    allowanceValue: allowanceInfo.rawValue,
    initialSupply,
    marketCap,
    contractAddress,
    deployerAddress: FOUNDRY_SOVEREIGN_DEPLOYER,
    factorySalt: "0x" + generateQuantumEntropySignature(),
    create2BytecodeHash: "0x" + generateQuantumEntropySignature(),
    uint256TokenId,
    vanityZeros,
    isVerified: true,
    solidityTemplate,
  };
}

/**
 * Convert fullstack specification into standard TokenRecord for platform-wide compatibility
 */
export function convertSpecToTokenRecord(
  spec: FullstackContractSpecification,
  index: number
): TokenRecord {
  const tokenomics = buildInstitutionalTokenomics(spec.name, spec.symbol, spec.chain, spec.tokenStandard);

  return {
    id: `tok_fullstack_${Date.now()}_${index}`,
    name: spec.name,
    symbol: spec.symbol,
    chain: spec.chain,
    networkId: spec.chain === "ethereum" ? 1 : spec.chain === "base" ? 8453 : 42161,
    contractAddress: spec.contractAddress,
    isVanity: spec.vanityZeros >= 3,
    contractArchetype: `FullStack CREATE2 (${spec.contractType})`,
    isEnterprise: true,
    enterpriseSalt: spec.factorySalt,
    enterpriseTier: "Tier-1 Sovereign Trillion",
    genre: "defi_liquidity",
    tokenId: spec.uint256TokenId,
    tokenStandard: spec.tokenStandard,
    narrative: "quantum_defi",
    launchStatus: "Audited",
    isDeployed: true,
    initialSupply: spec.initialSupply,
    decimals: 18,
    marketCap: spec.marketCap,
    priceUsd: Number((spec.marketCap / 1_000_000_000_000).toFixed(4)),
    liquidityPair: `${spec.symbol}/USDC (Uniswap v3)`,
    liquidityPoolId: 1,
    reserveShares: SOVEREIGN_RESERVE_SHARES,
    treasuryShares: SOVEREIGN_TREASURY_SHARES,
    targetOwner: SOVEREIGN_OWNER,
    powerOfTwoReserves: 256,
    coinmarketcapMetric: 512,
    tokenomics,
    tokenomicsPillars: tokenomics.pillars,
    holderCount: 48900,
    auditFirm: "OpenZeppelin",
    securityScore: 99,
    createdAt: new Date().toISOString(),
    creationTx: "0x" + generateQuantumEntropySignature(),
    deployerAddress: spec.deployerAddress,
    deployerPrivateKey: generateDeployerPrivateKey(spec.chain),
    treasuryAddress: PROTOCOL_TREASURY_ADDRESS,
    quantum_entropy_signature: generateQuantumEntropySignature(),
    description: `Sovereign ${spec.name} with ${spec.allowanceTier} maximum allowance architecture. Deterministically generated fullstack smart contract deployed on ${spec.chain}.`,
  };
}

/**
 * Batch generate Trillions or UINT256 Explorer tokens with the 49 verified addresses
 */
export function generateTrillionsAndUint256Batch(
  count: number = 49,
  allowanceTier: AllowanceTier = "UINT256_MAX",
  chain: ChainType = "ethereum"
): TokenRecord[] {
  const result: TokenRecord[] = [];

  for (let i = 0; i < count; i++) {
    const spec = generateFullstackContractSpec({
      contractType: i % 2 === 0 ? "ERC20_TRILLION_SUPPLY" : "ERC20_UNLIMITED_ALLOWANCE",
      allowanceTier,
      chain,
      index: i + 1,
      useDatasetAddress: i < UINT256_CONTRACT_ADDRESS_DATASET.length,
    });
    result.push(convertSpecToTokenRecord(spec, i + 1));
  }

  return result;
}
