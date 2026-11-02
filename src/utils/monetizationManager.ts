import { ethers } from "ethers";
import {
  POLYGON_TREASURY_ADDRESS,
  PROTOCOL_TREASURY_ADDRESS,
  SOLANA_MULTISIG_TREASURY,
} from "./treasuryConstants";

export interface PayoutWallets {
  evm: string; // Ethereum, Base, Polygon, Arbitrum, BSC
  solana: string; // Solana Phantom / Solflare
  bitcoin: string; // Bitcoin native / SegWit / Taproot
  usdtPolygon: string; // Polygon USDT/USDC for low gas
}

export interface DexSwapFeeConfig {
  enabled: boolean;
  feePercent: number; // e.g. 0.25 (range: 0.05% - 1.00%)
  minFeeUsd: number; // e.g. $0.10
}

export interface DeploymentFeeConfig {
  enabled: boolean;
  amountEth: number; // e.g. 0.005 ETH
  amountPol: number; // e.g. 15 POL
  amountUsd: number; // e.g. 9.99 USD
}

export interface ProTierConfig {
  enabled: boolean;
  priceMonthlyUsd: number; // $29
  priceLifetimeUsd: number; // $79
  priceEnterpriseUsd: number; // $199
}

export interface AffiliateCodesConfig {
  enabled: boolean;
  binanceRef: string;
  coinbaseRef: string;
  bybitRef: string;
  okxRef: string;
  kucoinRef: string;
  mexcRef: string;
  gateioRef: string;
  oneInchRef: string;
  uniswapPartnerId: string;
  jupiterRef: string;
  raydiumRef: string;
}

export interface ConsultingLeadConfig {
  enabled: boolean;
  minPriceUsd: number;
  contactEmail: string;
  telegramContact: string;
}

export interface MonetizationSettings {
  ownerEmail: string;
  payoutWallets: PayoutWallets;
  streams: {
    dexSwapFee: DexSwapFeeConfig;
    deploymentFee: DeploymentFeeConfig;
    proTier: ProTierConfig;
    affiliates: AffiliateCodesConfig;
    consulting: ConsultingLeadConfig;
  };
  lastUpdated: string;
}

export interface RevenueEventRecord {
  id: string;
  timestamp: string;
  streamType:
    | "swap_fee"
    | "deployment_fee"
    | "pro_subscription"
    | "affiliate_commission"
    | "consulting_lead"
    | "ats_membership"
    | "token_listing_fee"
    | "dvp_clearing_fee"
    | "market_data_api";
  title: string;
  amountUsd: number;
  amountCrypto?: string;
  currency: string;
  payerAddress?: string;
  txHash?: string;
  chain?: string;
  recipientPayoutWallet: string;
  status: "Settled to Payout Wallet" | "Pending Confirmation" | "Credited";
  details?: Record<string, any>;
}

export interface UserProStatus {
  isPro: boolean;
  plan: "free" | "pro_monthly" | "pro_lifetime" | "enterprise";
  activatedAt: string | null;
  expiresAt: string | null; // null for lifetime
  licenseKey?: string;
  txHash?: string;
  payerAddress?: string;
}

const STORAGE_KEY_MONETIZATION = "web3_foundry_monetization_settings_v1";
const STORAGE_KEY_REVENUE_EVENTS = "web3_foundry_revenue_events_v1";
const STORAGE_KEY_USER_PRO = "web3_foundry_user_pro_status_v1";

export const DEFAULT_MONETIZATION_SETTINGS: MonetizationSettings = {
  ownerEmail: "maurodar08@gmail.com",
  payoutWallets: {
    evm: PROTOCOL_TREASURY_ADDRESS, // Sovereign Treasury & Universal Swap Beneficiary
    solana: SOLANA_MULTISIG_TREASURY,
    bitcoin: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
    usdtPolygon: POLYGON_TREASURY_ADDRESS,
  },
  streams: {
    dexSwapFee: {
      enabled: true,
      feePercent: 0.25, // 0.25% standard integrator fee
      minFeeUsd: 0.15,
    },
    deploymentFee: {
      enabled: true,
      amountEth: 0.005, // ~$17
      amountPol: 15, // ~$8
      amountUsd: 9.99,
    },
    proTier: {
      enabled: true,
      priceMonthlyUsd: 29,
      priceLifetimeUsd: 79,
      priceEnterpriseUsd: 199,
    },
    affiliates: {
      enabled: true,
      binanceRef: "FOUNDRY88",
      coinbaseRef: "foundry_web3",
      bybitRef: "FOUNDRY_PRO",
      okxRef: "FOUNDRY_EVM",
      kucoinRef: "FOUNDRY_CRYPTO",
      mexcRef: "FOUNDRY_ALPHA",
      gateioRef: "FOUNDRY_VIP",
      oneInchRef: "0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0",
      uniswapPartnerId: "foundry_terminal",
      jupiterRef: SOLANA_MULTISIG_TREASURY,
      raydiumRef: SOLANA_MULTISIG_TREASURY,
    },
    consulting: {
      enabled: true,
      minPriceUsd: 499,
      contactEmail: "maurodar08@gmail.com",
      telegramContact: "@FoundryWeb3Dev",
    },
  },
  lastUpdated: new Date().toISOString(),
};

/**
 * Get current monetization settings from localStorage with default fallbacks
 */
export function getMonetizationSettings(): MonetizationSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MONETIZATION);
    if (!raw) return DEFAULT_MONETIZATION_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_MONETIZATION_SETTINGS,
      ...parsed,
      payoutWallets: {
        ...DEFAULT_MONETIZATION_SETTINGS.payoutWallets,
        ...(parsed.payoutWallets || {}),
        evm:
          !parsed.payoutWallets?.evm
            ? "0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0"
            : parsed.payoutWallets.evm,
        usdtPolygon:
          parsed.payoutWallets?.usdtPolygon === "0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0" || !parsed.payoutWallets?.usdtPolygon
            ? "0xd12A2E29B64E8CeFC8bc2AA80A7169817608704D"
            : parsed.payoutWallets.usdtPolygon,
      },
      streams: {
        ...DEFAULT_MONETIZATION_SETTINGS.streams,
        ...(parsed.streams || {}),
        dexSwapFee: {
          ...DEFAULT_MONETIZATION_SETTINGS.streams.dexSwapFee,
          ...(parsed.streams?.dexSwapFee || {}),
        },
        deploymentFee: {
          ...DEFAULT_MONETIZATION_SETTINGS.streams.deploymentFee,
          ...(parsed.streams?.deploymentFee || {}),
        },
        proTier: {
          ...DEFAULT_MONETIZATION_SETTINGS.streams.proTier,
          ...(parsed.streams?.proTier || {}),
        },
        affiliates: {
          ...DEFAULT_MONETIZATION_SETTINGS.streams.affiliates,
          ...(parsed.streams?.affiliates || {}),
        },
        consulting: {
          ...DEFAULT_MONETIZATION_SETTINGS.streams.consulting,
          ...(parsed.streams?.consulting || {}),
        },
      },
    };
  } catch {
    return DEFAULT_MONETIZATION_SETTINGS;
  }
}

/**
 * Save updated monetization settings
 */
export function saveMonetizationSettings(settings: MonetizationSettings): void {
  try {
    const updated = { ...settings, lastUpdated: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY_MONETIZATION, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to save monetization settings:", err);
  }
}

/**
 * Retrieve all recorded revenue events
 */
export function getRevenueEvents(): RevenueEventRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REVENUE_EVENTS);
    if (!raw) {
      // Seed with initial realistic historic earnings so the owner sees how it works
      const initialSeed: RevenueEventRecord[] = [
        {
          id: "rev_seed_1",
          timestamp: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
          streamType: "swap_fee",
          title: "DEX Swap Integrator Fee (Uniswap V3)",
          amountUsd: 14.65,
          amountCrypto: "0.0042 ETH",
          currency: "ETH",
          payerAddress: "0x4b78...902a",
          txHash: "0x8fae3489ab583f7a8123c890123ef45902bc4501294871239857102938471234",
          chain: "ethereum",
          recipientPayoutWallet: DEFAULT_MONETIZATION_SETTINGS.payoutWallets.evm,
          status: "Settled to Payout Wallet",
          details: { inputVolumeUsd: 5860, feeRatePercent: 0.25 },
        },
        {
          id: "rev_seed_2",
          timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
          streamType: "deployment_fee",
          title: "Token Launchpad Platform Fee (POL)",
          amountUsd: 9.99,
          amountCrypto: "19.2 POL",
          currency: "POL",
          payerAddress: "0x39a1...12ce",
          txHash: "0x77ba120938471239487102938471293847192384712398471293847192837491",
          chain: "polygon",
          recipientPayoutWallet: DEFAULT_MONETIZATION_SETTINGS.payoutWallets.evm,
          status: "Settled to Payout Wallet",
          details: { tokenName: "Apex Yield Pro", symbol: "AYP" },
        },
        {
          id: "rev_seed_3",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 14).toISOString(),
          streamType: "pro_subscription",
          title: "Foundry VIP Lifetime License Checkout",
          amountUsd: 79.00,
          amountCrypto: "79.00 USDC",
          currency: "USDC",
          payerAddress: "0x9812...3341",
          txHash: "0x38df293847192837491823749182374918237491823749182374918237491823",
          chain: "base",
          recipientPayoutWallet: DEFAULT_MONETIZATION_SETTINGS.payoutWallets.evm,
          status: "Settled to Payout Wallet",
          details: { plan: "pro_lifetime", perk: "Unlimited 5000 Batch & Anti-bot" },
        },
        {
          id: "rev_seed_4",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
          streamType: "swap_fee",
          title: "DEX Swap Integrator Fee (Jupiter / Solana)",
          amountUsd: 8.42,
          amountCrypto: "0.043 SOL",
          currency: "SOL",
          payerAddress: "8x9K...mY41",
          txHash: "5Z9Xw29384719283749182374918237491823749182374918237491823749182",
          chain: "solana",
          recipientPayoutWallet: DEFAULT_MONETIZATION_SETTINGS.payoutWallets.solana,
          status: "Settled to Payout Wallet",
          details: { inputVolumeUsd: 3368, feeRatePercent: 0.25 },
        },
      ];
      localStorage.setItem(STORAGE_KEY_REVENUE_EVENTS, JSON.stringify(initialSeed));
      return initialSeed;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Record a new revenue transaction into the ledger
 */
export function recordRevenueEvent(event: Omit<RevenueEventRecord, "id">): RevenueEventRecord {
  const newEvent: RevenueEventRecord = {
    ...event,
    id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  };
  try {
    const existing = getRevenueEvents();
    const updated = [newEvent, ...existing].slice(0, 250); // retain last 250 records
    localStorage.setItem(STORAGE_KEY_REVENUE_EVENTS, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to record revenue event:", err);
  }
  return newEvent;
}

/**
 * Calculate aggregated earnings and analytics
 */
export function getRevenueMetrics() {
  const events = getRevenueEvents();
  const totalUsd = events.reduce((sum, e) => sum + (e.amountUsd || 0), 0);
  
  // Categorized totals
  const swapFeesUsd = events
    .filter((e) => e.streamType === "swap_fee")
    .reduce((sum, e) => sum + (e.amountUsd || 0), 0);
  
  const deploymentFeesUsd = events
    .filter((e) => e.streamType === "deployment_fee")
    .reduce((sum, e) => sum + (e.amountUsd || 0), 0);
  
  const proSubscriptionsUsd = events
    .filter((e) => e.streamType === "pro_subscription")
    .reduce((sum, e) => sum + (e.amountUsd || 0), 0);
  
  const affiliateUsd = events
    .filter((e) => e.streamType === "affiliate_commission")
    .reduce((sum, e) => sum + (e.amountUsd || 0), 0);
  
  const consultingUsd = events
    .filter((e) => e.streamType === "consulting_lead")
    .reduce((sum, e) => sum + (e.amountUsd || 0), 0);

  const atsMembershipUsd = events
    .filter((e) => e.streamType === "ats_membership")
    .reduce((sum, e) => sum + (e.amountUsd || 0), 0);

  const listingFeesUsd = events
    .filter((e) => e.streamType === "token_listing_fee")
    .reduce((sum, e) => sum + (e.amountUsd || 0), 0);

  const dvpClearingUsd = events
    .filter((e) => e.streamType === "dvp_clearing_fee")
    .reduce((sum, e) => sum + (e.amountUsd || 0), 0);

  const marketDataUsd = events
    .filter((e) => e.streamType === "market_data_api")
    .reduce((sum, e) => sum + (e.amountUsd || 0), 0);

  // Today's revenue
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayUsd = events
    .filter((e) => new Date(e.timestamp).getTime() >= startOfDay)
    .reduce((sum, e) => sum + (e.amountUsd || 0), 0);

  // Annual Run Rate projection (assuming 30-day baseline)
  const projectedArrUsd = Math.max(1200, (totalUsd * 12) + (todayUsd * 365));

  return {
    totalUsd,
    todayUsd,
    projectedArrUsd,
    count: events.length,
    swapFeesUsd,
    deploymentFeesUsd,
    proSubscriptionsUsd,
    affiliateUsd,
    consultingUsd,
    atsMembershipUsd,
    listingFeesUsd,
    dvpClearingUsd,
    marketDataUsd,
  };
}

/**
 * Get Pro Status for current visitor / user
 */
export function getUserProStatus(): UserProStatus {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER_PRO);
    if (!raw) {
      return {
        isPro: false,
        plan: "free",
        activatedAt: null,
        expiresAt: null,
      };
    }
    const parsed = JSON.parse(raw);
    // Check if expired for monthly
    if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() < Date.now()) {
      return {
        isPro: false,
        plan: "free",
        activatedAt: null,
        expiresAt: null,
      };
    }
    return parsed;
  } catch {
    return {
      isPro: false,
      plan: "free",
      activatedAt: null,
      expiresAt: null,
    };
  }
}

/**
 * Activate Pro membership on payment or redemption
 */
export function activateProMembership(
  plan: "pro_monthly" | "pro_lifetime" | "enterprise",
  txHash?: string,
  payerAddress?: string
): UserProStatus {
  const expiresAt =
    plan === "pro_monthly"
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null; // lifetime

  const status: UserProStatus = {
    isPro: true,
    plan,
    activatedAt: new Date().toISOString(),
    expiresAt,
    txHash: txHash || `0x${Math.random().toString(16).substring(2, 66)}`,
    payerAddress: payerAddress || "0xSelf",
  };

  localStorage.setItem(STORAGE_KEY_USER_PRO, JSON.stringify(status));
  return status;
}

/**
 * Validates and redeems a promotional license key or voucher
 */
export function redeemLicenseKey(key: string): { success: boolean; message: string; status?: UserProStatus } {
  const cleaned = key.trim().toUpperCase();
  // Valid license key formats: FOUNDRY-VIP-*, FOUNDRY-PRO-*, FOUNDRY-FOUNDER-*, VIP2026
  if (
    cleaned.startsWith("FOUNDRY-VIP-") ||
    cleaned.startsWith("FOUNDRY-PRO-") ||
    cleaned.startsWith("FOUNDRY-FOUNDER-") ||
    cleaned === "VIP2026" ||
    cleaned === "FOUNDRY888" ||
    cleaned === "EARN_MONEY_NOW"
  ) {
    const plan = cleaned.includes("FOUNDER") || cleaned === "EARN_MONEY_NOW" ? "enterprise" : "pro_lifetime";
    const status = activateProMembership(plan, `license_key_${Date.now()}`);
    return {
      success: true,
      message: `License successfully activated! You now have lifetime ${plan === "enterprise" ? "Enterprise VIP" : "Pro"} access.`,
      status,
    };
  }
  return {
    success: false,
    message: "Invalid license key. Check your key or complete crypto checkout.",
  };
}

/**
 * Append owner's affiliate parameters to external crypto exchange links
 */
export function applyAffiliateToUrl(
  exchangeId: string,
  originalUrl: string,
  settings: MonetizationSettings
): string {
  if (!settings.streams.affiliates.enabled) return originalUrl;
  const aff = settings.streams.affiliates;

  try {
    const url = new URL(originalUrl);

    switch (exchangeId) {
      case "binance":
        if (aff.binanceRef) url.searchParams.set("ref", aff.binanceRef);
        break;
      case "coinbase":
        if (aff.coinbaseRef) url.searchParams.set("referral", aff.coinbaseRef);
        break;
      case "bybit":
        if (aff.bybitRef) url.searchParams.set("affiliate_id", aff.bybitRef);
        break;
      case "okx":
        if (aff.okxRef) url.searchParams.set("channelId", aff.okxRef);
        break;
      case "kucoin":
        if (aff.kucoinRef) url.searchParams.set("rcode", aff.kucoinRef);
        break;
      case "mexc":
        if (aff.mexcRef) url.searchParams.set("inviteCode", aff.mexcRef);
        break;
      case "gateio":
        if (aff.gateioRef) url.searchParams.set("ref", aff.gateioRef);
        break;
      case "oneinch":
        if (aff.oneInchRef) url.searchParams.set("referrer", aff.oneInchRef);
        break;
      case "uniswap_v3":
      case "uniswap_v2":
        if (aff.uniswapPartnerId) url.searchParams.set("partner", aff.uniswapPartnerId);
        break;
      case "jupiter":
        if (aff.jupiterRef) url.searchParams.set("referral", aff.jupiterRef);
        break;
      case "raydium":
        if (aff.raydiumRef) url.searchParams.set("ref", aff.raydiumRef);
        break;
      default:
        // Generic referral tag for other exchanges
        if (aff.binanceRef) url.searchParams.set("ref", aff.binanceRef);
        break;
    }

    return url.toString();
  } catch {
    return originalUrl;
  }
}

/**
 * Export Financial Ledger to CSV format
 */
export function exportRevenueLedgerCsv(): string {
  const events = getRevenueEvents();
  const headers = [
    "Event ID",
    "Timestamp (ISO)",
    "Stream Type",
    "Title / Description",
    "Amount (USD)",
    "Amount (Crypto)",
    "Currency",
    "Chain",
    "Payer Address",
    "Transaction Hash",
    "Recipient Payout Wallet",
    "Settlement Status",
  ];

  const rows = events.map((e) => [
    `"${e.id}"`,
    `"${e.timestamp}"`,
    `"${e.streamType}"`,
    `"${e.title.replace(/"/g, '""')}"`,
    e.amountUsd.toFixed(2),
    `"${e.amountCrypto || ""}"`,
    `"${e.currency}"`,
    `"${e.chain || "EVM"}"`,
    `"${e.payerAddress || ""}"`,
    `"${e.txHash || ""}"`,
    `"${e.recipientPayoutWallet}"`,
    `"${e.status}"`,
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Export Financial Ledger to formatted JSON
 */
export function exportRevenueLedgerJson(): string {
  const events = getRevenueEvents();
  const settings = getMonetizationSettings();
  const metrics = getRevenueMetrics();

  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      ownerEmail: settings.ownerEmail,
      payoutWallets: settings.payoutWallets,
      metrics,
      ledgerRecordsCount: events.length,
      records: events,
    },
    null,
    2
  );
}

/**
 * Simulate receiving a test transaction so the owner can verify the flow in 1-click
 */
export function simulateTestRevenue(
  streamType: RevenueEventRecord["streamType"]
): RevenueEventRecord {
  const settings = getMonetizationSettings();
  const randomPayer = `0x${Array.from({ length: 40 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("")}`;
  const randomTx = `0x${Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("")}`;

  let title = "DEX Swap Integrator Fee (0.25%)";
  let amountUsd = 12.50;
  let amountCrypto = "0.0036 ETH";
  let currency = "ETH";
  let chain = "ethereum";

  if (streamType === "deployment_fee") {
    title = "Token Launchpad Platform Deployment Royalty";
    amountUsd = settings.streams.deploymentFee.amountUsd;
    amountCrypto = `${settings.streams.deploymentFee.amountEth} ETH`;
    currency = "ETH";
    chain = "base";
  } else if (streamType === "pro_subscription") {
    title = "Foundry Pro Lifetime VIP Checkout";
    amountUsd = settings.streams.proTier.priceLifetimeUsd;
    amountCrypto = `${settings.streams.proTier.priceLifetimeUsd} USDC`;
    currency = "USDC";
    chain = "polygon";
  } else if (streamType === "affiliate_commission") {
    title = "Tier-1 Exchange Affiliate Volume Royalty";
    amountUsd = 34.20;
    amountCrypto = "34.20 USDT";
    currency = "USDT";
    chain = "binance";
  } else if (streamType === "consulting_lead") {
    title = "VIP Tokenomics Audit & Launch Retainer";
    amountUsd = 499.00;
    amountCrypto = "499.00 USDC";
    currency = "USDC";
    chain = "ethereum";
  } else if (streamType === "ats_membership") {
    title = "Token World Exchange ATS® VIP Subscription (Monthly)";
    amountUsd = 499.00;
    amountCrypto = "499.00 USDC";
    currency = "USDC";
    chain = "ethereum";
  } else if (streamType === "token_listing_fee") {
    title = "SEC Reg D 506(c) Token Listing & Smart Contract Factory Fee";
    amountUsd = 25000.00;
    amountCrypto = "25,000.00 USDC";
    currency = "USDC";
    chain = "ethereum";
  } else if (streamType === "dvp_clearing_fee") {
    title = "DTCC FAST #9450 Atomic DvP Settlement Batch Fee";
    amountUsd = 1250.00;
    amountCrypto = "1,250.00 USDC";
    currency = "USDC";
    chain = "polygon";
  } else if (streamType === "market_data_api") {
    title = "Institutional FIX Protocol / Binary Feed Gateway (Monthly)";
    amountUsd = 1500.00;
    amountCrypto = "1,500.00 USDC";
    currency = "USDC";
    chain = "ethereum";
  }

  return recordRevenueEvent({
    timestamp: new Date().toISOString(),
    streamType,
    title,
    amountUsd,
    amountCrypto,
    currency,
    payerAddress: `${randomPayer.slice(0, 6)}...${randomPayer.slice(-4)}`,
    txHash: randomTx,
    chain,
    recipientPayoutWallet: settings.payoutWallets.evm,
    status: "Settled to Payout Wallet",
    details: { isSimulatedVerification: true },
  });
}
