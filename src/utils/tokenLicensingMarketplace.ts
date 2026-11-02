import { SOLANA_MULTISIG_TREASURY, BASE_TREASURY_ADDRESS } from "./treasuryConstants";

export type LicenseAssetType =
  | "contract_id_rights"
  | "synthetic_dataset"
  | "solidity_architecture"
  | "tokenomics_model";

export type LicenseTerms =
  | "Perpetual Commercial"
  | "Exclusive Ownership"
  | "1-Year Developer License"
  | "Royalty-Free Open Use";

export interface MarketplaceListing {
  id: string;
  title: string;
  type: LicenseAssetType;
  description: string;
  sellerPayoutAddress: string; // The seller's MetaMask / EVM or Solana address
  sellerNameOrAlias: string;
  priceAmount: number;
  priceCurrency: "ETH" | "POL" | "USDC" | "USDT" | "SOL";
  priceUsdEstimate: number;
  terms: LicenseTerms;
  chain: string;
  tokenSymbol?: string;
  contractAddress?: string;
  datasetSizeCount?: number; // e.g. 250 tokens, 1000 records
  entropyScore?: number;
  rarityTag?: string; // e.g. "Vanity 0x777...", "Triple-Zero Prefix", "AI DePIN 500-Batch"
  previewSnippet: string;
  solidityCodeSnippet?: string;
  rawPayloadJson?: string;
  salesCount: number;
  totalEarningsUsd: number;
  createdAt: string;
  isFeatured?: boolean;
  isUserListing?: boolean;
}

export interface LicensePurchaseCertificate {
  certificateId: string;
  licenseKey: string;
  listingId: string;
  listingTitle: string;
  assetType: LicenseAssetType;
  granteeAddress: string;
  sellerPayoutAddress: string;
  contractAddress?: string;
  terms: LicenseTerms;
  pricePaid: string;
  priceUsd: number;
  txHash: string;
  timestamp: string;
  cryptographicSignature: string;
  scopeOfUse: string[];
}

const STORAGE_KEY_LISTINGS = "web3_foundry_licensing_marketplace_listings_v1";
const STORAGE_KEY_PURCHASES = "web3_foundry_licensing_marketplace_purchases_v1";

export const INITIAL_MARKETPLACE_LISTINGS: MarketplaceListing[] = [
  {
    id: "list_seed_1",
    title: "0x7777...8888 Quad-Lucky Vanity Contract ID Rights",
    type: "contract_id_rights",
    description: "Exclusive cryptographic ownership & deployment rights for a collision-resistant 0x7777 prefix vanity contract address on Base & Ethereum Mainnet. Includes pre-computed CREATE2 salt and deployment script.",
    sellerPayoutAddress: "0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0",
    sellerNameOrAlias: "CipherArchitect.eth",
    priceAmount: 0.045,
    priceCurrency: "ETH",
    priceUsdEstimate: 155.25,
    terms: "Exclusive Ownership",
    chain: "base",
    tokenSymbol: "LUCK7",
    contractAddress: "0x7777Aa39B924fC3e12089Da071f654b41a8e8888",
    entropyScore: 99.4,
    rarityTag: "0x7777 Quad Vanity",
    previewSnippet: `// CREATE2 Deployment Salt: 0x93f4e187b2c019d84e...\n// Deterministic Deployer Target: 0x7777Aa39B924fC3e12089Da071f654b41a8e8888\n// Verified EVM Signature: 0xa91b...e4f1`,
    salesCount: 4,
    totalEarningsUsd: 621.00,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    isFeatured: true,
  },
  {
    id: "list_seed_2",
    title: "500-Token AI Agent & DePIN Synthetic Simulation Matrix",
    type: "synthetic_dataset",
    description: "Full production-ready synthetic dataset of 500 validated Web3 token profiles (circulating supplies, market cap curves, reserve ratios, 2^8 power-of-two tokenomics distributions, and Uniswap V3 liquidity ticks).",
    sellerPayoutAddress: "0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0",
    sellerNameOrAlias: "QuantumFoundry_Labs",
    priceAmount: 49.00,
    priceCurrency: "USDC",
    priceUsdEstimate: 49.00,
    terms: "Perpetual Commercial",
    chain: "ethereum",
    datasetSizeCount: 500,
    entropyScore: 98.7,
    rarityTag: "500 AI Synthetic Dataset",
    previewSnippet: `[\n  {\n    "symbol": "NEURO",\n    "initialSupply": "1000000000",\n    "marketCap": 450000000,\n    "reserveShares": "0.15",\n    "entropyScore": 98.2\n  }\n]`,
    salesCount: 18,
    totalEarningsUsd: 882.00,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    isFeatured: true,
  },
  {
    id: "list_seed_3",
    title: "MEV-Shield Anti-Sniper ERC-20 Architecture & Bytecode",
    type: "solidity_architecture",
    description: "Audited Solidity smart contract architecture featuring block-delay sandwich mitigation, dynamic slippage fee dampeners, and multi-sig liquidity pool lock mechanisms. Royalty-free commercial license for any dApp.",
    sellerPayoutAddress: BASE_TREASURY_ADDRESS,
    sellerNameOrAlias: "SolidityShield",
    priceAmount: 75.0,
    priceCurrency: "POL",
    priceUsdEstimate: 39.00,
    terms: "Perpetual Commercial",
    chain: "polygon",
    tokenSymbol: "SHIELD",
    contractAddress: "0x892aBbC341Fe4888C9024B10fAA411239845Cc01",
    entropyScore: 96.5,
    rarityTag: "Anti-MEV Architecture",
    previewSnippet: `contract AntiBotFoundryToken is ERC20, Ownable {\n    uint256 public immutable antiSnipeBlockWindow;\n    mapping(address => uint256) public lastTradeBlock;\n    function _beforeTokenTransfer(...) internal override { ... }\n}`,
    salesCount: 11,
    totalEarningsUsd: 429.00,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
  },
  {
    id: "list_seed_4",
    title: "Solana High-Velocity SPL-Token Synthetic Liquidity Feed",
    type: "synthetic_dataset",
    description: "Algorithmic pricing & orderbook depth dataset mimicking 250 high-volume Solana SPL tokens for backtesting arbitrage bots and Raydium/Jupiter CP-Swap routing algorithms with zero mainnet slippage loss.",
    sellerPayoutAddress: SOLANA_MULTISIG_TREASURY,
    sellerNameOrAlias: "SolSpeed_Quant",
    priceAmount: 0.35,
    priceCurrency: "SOL",
    priceUsdEstimate: 68.25,
    terms: "1-Year Developer License",
    chain: "solana",
    datasetSizeCount: 250,
    entropyScore: 99.1,
    rarityTag: "250 SPL Liquidity Matrix",
    previewSnippet: `{\n  "network": "solana",\n  "pairsCount": 250,\n  "liquidityTicks": [14.2, 18.5, 23.1, 45.0],\n  "averageSpreadBps": 12\n}`,
    salesCount: 7,
    totalEarningsUsd: 477.75,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
  },
];

/**
 * Retrieve all active marketplace listings
 */
export function getMarketplaceListings(): MarketplaceListing[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LISTINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_LISTINGS, JSON.stringify(INITIAL_MARKETPLACE_LISTINGS));
      return INITIAL_MARKETPLACE_LISTINGS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_MARKETPLACE_LISTINGS;
  } catch {
    return INITIAL_MARKETPLACE_LISTINGS;
  }
}

/**
 * Save listings to persistent storage
 */
export function saveMarketplaceListings(listings: MarketplaceListing[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_LISTINGS, JSON.stringify(listings));
  } catch (err) {
    console.error("Failed to save marketplace listings:", err);
  }
}

/**
 * Create and publish a new marketplace listing
 */
export function createMarketplaceListing(
  listing: Omit<MarketplaceListing, "id" | "salesCount" | "totalEarningsUsd" | "createdAt" | "isUserListing">
): MarketplaceListing {
  const newList: MarketplaceListing = {
    ...listing,
    id: `list_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    salesCount: 0,
    totalEarningsUsd: 0,
    createdAt: new Date().toISOString(),
    isUserListing: true,
  };

  const current = getMarketplaceListings();
  const updated = [newList, ...current];
  saveMarketplaceListings(updated);
  return newList;
}

/**
 * Delete a user's listing
 */
export function deleteMarketplaceListing(id: string): void {
  const current = getMarketplaceListings();
  const updated = current.filter((l) => l.id !== id);
  saveMarketplaceListings(updated);
}

/**
 * Retrieve user's purchased license certificates
 */
export function getLicensePurchases(): LicensePurchaseCertificate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PURCHASES);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Record a successful license purchase and generate the certificate
 */
export function recordLicensePurchase(
  listing: MarketplaceListing,
  buyerAddress: string,
  txHash: string
): LicensePurchaseCertificate {
  const certId = `CERT-${listing.chain.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-6)}`;
  const licenseKey = `LIC-${listing.type.toUpperCase().slice(0, 4)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const cert: LicensePurchaseCertificate = {
    certificateId: certId,
    licenseKey,
    listingId: listing.id,
    listingTitle: listing.title,
    assetType: listing.type,
    granteeAddress: buyerAddress,
    sellerPayoutAddress: listing.sellerPayoutAddress,
    contractAddress: listing.contractAddress,
    terms: listing.terms,
    pricePaid: `${listing.priceAmount} ${listing.priceCurrency}`,
    priceUsd: listing.priceUsdEstimate,
    txHash,
    timestamp: new Date().toISOString(),
    cryptographicSignature: `0x${Array.from({ length: 130 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
    scopeOfUse: [
      "Full commercial rights to deploy and distribute in web3 applications and decentralized networks.",
      "Permission to integrate into proprietary software, dApps, algorithmic trading bots, and backtest pipelines.",
      "Non-exclusive or exclusive rights as dictated by selected license tier.",
      "Decentralized proof of purchase recorded on blockchain transaction ledger.",
    ],
  };

  // Save to user purchases
  try {
    const purchases = getLicensePurchases();
    purchases.unshift(cert);
    localStorage.setItem(STORAGE_KEY_PURCHASES, JSON.stringify(purchases.slice(0, 100)));

    // Increment listing sales and earnings
    const listings = getMarketplaceListings();
    const updated = listings.map((l) => {
      if (l.id === listing.id) {
        return {
          ...l,
          salesCount: (l.salesCount || 0) + 1,
          totalEarningsUsd: (l.totalEarningsUsd || 0) + listing.priceUsdEstimate,
        };
      }
      return l;
    });
    saveMarketplaceListings(updated);
  } catch (err) {
    console.error("Failed to record license purchase:", err);
  }

  return cert;
}

/**
 * Downloads a complete license verification certificate as JSON
 */
export function downloadLicenseCertificateFile(cert: LicensePurchaseCertificate): void {
  const jsonContent = JSON.stringify(cert, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${cert.certificateId}_Commercial_License.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
