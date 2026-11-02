/**
 * Unified Treasury Constants & Sovereign Multi-Chain Vault Registry
 * 
 * Single Source of Truth for verified institutional Treasury IDs,
 * Multi-Sig Escrows, and Sovereign Deployer addresses across EVM and SVM networks.
 */

// ==========================================
// 1. Core Verified Treasury & Deployer IDs
// ==========================================

/**
 * Verified Polygon POS Sovereign Treasury Vault (Chain ID 137)
 * Designated beneficiary for QuickSwap AMM fees, POL gas rebates, and multi-asset settlements.
 */
export const POLYGON_CHAIN_ID = 137;
export const POLYGON_TREASURY_ADDRESS = "0xd12A2E29B64E8CeFC8bc2AA80A7169817608704D";

/**
 * Verified Base Network Sovereign Treasury Vault (Chain ID 8453)
 * Institutional settlement vault for Coinbase L2 Aerodrome fees and USDC payouts.
 */
export const BASE_CHAIN_ID = 8453;
export const BASE_TREASURY_ADDRESS = "0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0";

/**
 * Verified Ethereum Mainnet / Universal Sovereign Protocol Treasury (Chain ID 1)
 * High-grade institutional liquidity clearinghouse & Foundry deployer authority.
 */
export const ETHEREUM_CHAIN_ID = 1;
export const PROTOCOL_TREASURY_ADDRESS = "0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0";
export const UNIVERSAL_SWAP_TREASURY_WALLET = "0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0";
export const FOUNDRY_SOVEREIGN_DEPLOYER = "0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0";

/**
 * Verified Arbitrum One Sovereign Escrow (Chain ID 42161)
 */
export const ARBITRUM_CHAIN_ID = 42161;
export const ARBITRUM_TREASURY_ADDRESS = "0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0";

/**
 * Verified Solana SPL Multisig Treasury & Program Deployer
 * Multi-Signature Squads Treasury Vault for Raydium / Orca fee capture & token mint authority.
 */
export const SOLANA_SOVEREIGN_DEPLOYER = "2TTeGtPdU2g58QWUKzqneeVcson4a4mmB9PpCxAE4Gr6";
export const SOLANA_MULTISIG_TREASURY = "2TTeGtPdU2g58QWUKzqneeVcson4a4mmB9PpCxAE4Gr6";
export const SOLANA_MULTISIG_TREASURY_ADDRESS = "2TTeGtPdU2g58QWUKzqneeVcson4a4mmB9PpCxAE4Gr6";

// ==========================================
// 2. Structured Metadata & Explorer Registry
// ==========================================

export interface VerifiedTreasuryEntry {
  chainId: number | string;
  chainName: string;
  chainKey: "polygon" | "base" | "ethereum" | "arbitrum" | "solana";
  treasuryAddress: string;
  label: string;
  explorerUrl: string;
  complianceTier: string;
  isVerified: boolean;
  standard: "EVM-ERC20" | "SVM-SPL";
}

export const VERIFIED_TREASURY_REGISTRY: Record<string, VerifiedTreasuryEntry> = {
  polygon: {
    chainId: POLYGON_CHAIN_ID,
    chainName: "Polygon PoS",
    chainKey: "polygon",
    treasuryAddress: POLYGON_TREASURY_ADDRESS,
    label: "Polygon Sovereign Treasury Vault (Chain 137)",
    explorerUrl: `https://polygonscan.com/address/${POLYGON_TREASURY_ADDRESS}`,
    complianceTier: "Tier 1: Qualified Purchaser & Institutional ATS",
    isVerified: true,
    standard: "EVM-ERC20",
  },
  base: {
    chainId: BASE_CHAIN_ID,
    chainName: "Base Mainnet",
    chainKey: "base",
    treasuryAddress: BASE_TREASURY_ADDRESS,
    label: "Base Sovereign Treasury Clearing Vault",
    explorerUrl: `https://basescan.org/address/${BASE_TREASURY_ADDRESS}`,
    complianceTier: "Tier 1: Institutional Broker-Dealer & Clearinghouse",
    isVerified: true,
    standard: "EVM-ERC20",
  },
  ethereum: {
    chainId: ETHEREUM_CHAIN_ID,
    chainName: "Ethereum Mainnet",
    chainKey: "ethereum",
    treasuryAddress: PROTOCOL_TREASURY_ADDRESS,
    label: "Foundry Sovereign Universal Protocol Treasury",
    explorerUrl: `https://etherscan.io/address/${PROTOCOL_TREASURY_ADDRESS}`,
    complianceTier: "Tier 1: Institutional Primary Custody",
    isVerified: true,
    standard: "EVM-ERC20",
  },
  arbitrum: {
    chainId: ARBITRUM_CHAIN_ID,
    chainName: "Arbitrum One",
    chainKey: "arbitrum",
    treasuryAddress: ARBITRUM_TREASURY_ADDRESS,
    label: "Arbitrum Sovereign Liquidity Escrow",
    explorerUrl: `https://arbiscan.io/address/${ARBITRUM_TREASURY_ADDRESS}`,
    complianceTier: "Tier 1: Institutional Clearinghouse",
    isVerified: true,
    standard: "EVM-ERC20",
  },
  solana: {
    chainId: "solana-mainnet",
    chainName: "Solana Mainnet-Beta",
    chainKey: "solana",
    treasuryAddress: SOLANA_MULTISIG_TREASURY,
    label: "Solana Institutional Multi-Sig Treasury (Squads)",
    explorerUrl: `https://solscan.io/account/${SOLANA_MULTISIG_TREASURY}`,
    complianceTier: "Tier 1: Multi-Sig Governance & Yield Distribution",
    isVerified: true,
    standard: "SVM-SPL",
  },
};

/**
 * Returns the verified Treasury address for a given chain key
 */
export function getVerifiedTreasuryAddressForChain(chain: string): string {
  const normalized = (chain || "").toLowerCase().trim();
  if (normalized === "polygon" || normalized === "matic") {
    return POLYGON_TREASURY_ADDRESS;
  }
  if (normalized === "base") {
    return BASE_TREASURY_ADDRESS;
  }
  if (normalized === "solana") {
    return SOLANA_MULTISIG_TREASURY;
  }
  if (normalized === "arbitrum") {
    return ARBITRUM_TREASURY_ADDRESS;
  }
  return PROTOCOL_TREASURY_ADDRESS;
}

/**
 * Check if a given address matches any verified institutional treasury address
 */
export function isVerifiedTreasuryAddress(address: string | undefined | null): boolean {
  if (!address) return false;
  const target = address.toLowerCase().trim();
  return (
    target === POLYGON_TREASURY_ADDRESS.toLowerCase() ||
    target === BASE_TREASURY_ADDRESS.toLowerCase() ||
    target === PROTOCOL_TREASURY_ADDRESS.toLowerCase() ||
    target === SOLANA_MULTISIG_TREASURY.toLowerCase() ||
    target === FOUNDRY_SOVEREIGN_DEPLOYER.toLowerCase()
  );
}

/**
 * Formats a verified treasury address for UI display with truncate & badge
 */
export function formatTreasuryDisplayAddress(address: string, chain?: string): string {
  if (!address) return "0x0000...0000";
  if (chain === "solana" || address.length > 42) {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
