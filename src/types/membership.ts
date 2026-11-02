export type MembershipTier = 'free' | 'elite' | 'vip';

export type BillingInterval = 'monthly' | 'annual' | 'lifetime';

export type PaymentMethodType = 
  | 'crypto_usdc' 
  | 'crypto_usdt' 
  | 'crypto_twe' 
  | 'fiat_card' 
  | 'fiat_wire';

export interface TierFeature {
  name: string;
  description: string;
  includedInFree: boolean;
  includedInElite: boolean;
  includedInVip: boolean;
  category: 'trading' | 'analytics' | 'compliance' | 'settlement' | 'support';
}

export interface TierPricingPlan {
  tier: MembershipTier;
  name: string;
  subtitle: string;
  tagline: string;
  badgeLabel: string;
  monthlyPriceUsd: number;
  annualPriceUsd: number;
  lifetimePriceUsd: number;
  atsMakerFeePct: number;
  atsTakerFeePct: number;
  feeRebatePct: number;
  tweTokenDiscountPct: number;
  features: string[];
  restrictedNotice?: string;
}

export interface PartnerVoucher {
  id: string;
  partnerName: string;
  logoIcon: string;
  title: string;
  valueUsd: number;
  code: string;
  description: string;
  minTierRequired: MembershipTier;
  claimed: boolean;
  expiryDate: string;
}

export interface MembershipTransactionReceipt {
  id: string;
  timestamp: string;
  tier: MembershipTier;
  billingInterval: BillingInterval;
  amountUsd: number;
  paymentMethod: PaymentMethodType;
  txHash: string;
  status: 'confirmed' | 'active';
  invoiceNumber: string;
}

export interface UserMembershipState {
  tier: MembershipTier;
  billingInterval: BillingInterval;
  status: 'active' | 'trial' | 'free';
  isLifetime: boolean;
  memberSince: string;
  validUntil: string | null;
  totalSavedFeesUsd: number;
  totalVolumeTradedUsd: number;
  paymentMethod?: PaymentMethodType;
  claimedVoucherIds: string[];
  receipts: MembershipTransactionReceipt[];
}

export const TIER_PLANS: Record<MembershipTier, TierPricingPlan> = {
  free: {
    tier: 'free',
    name: 'Free Access',
    subtitle: 'Public Market & Disclosures',
    tagline: 'Essential access for public market surveillance and community exploration',
    badgeLabel: 'PUBLIC FREE',
    monthlyPriceUsd: 0,
    annualPriceUsd: 0,
    lifetimePriceUsd: 0,
    atsMakerFeePct: 0.15,
    atsTakerFeePct: 0.20,
    feeRebatePct: 0,
    tweTokenDiscountPct: 0,
    features: [
      'Real-time Public SEC Filings (10-K, 10-Q, 8-K Feed)',
      'Public Order Book & Market Price Feeds',
      'Standard Interactive TradingView Charts',
      'Community Governance Discussions & Polls',
      'Basic Token Swap & Uniswap Liquidity Viewer',
      'Standard RPC Node Access (10 req/sec rate limit)'
    ],
    restrictedNotice: 'Upgrade to Elite to unlock AI sentiment analysis, risk heatmaps, and ATS fee rebates.'
  },
  elite: {
    tier: 'elite',
    name: 'Elite Tier',
    subtitle: 'AI Analytics & Active Execution',
    tagline: 'Engineered for active prop traders and digital asset analysts needing AI foresight',
    badgeLabel: 'ELITE MEMBER ★',
    monthlyPriceUsd: 99,
    annualPriceUsd: 990,
    lifetimePriceUsd: 1999,
    atsMakerFeePct: 0.10,
    atsTakerFeePct: 0.14,
    feeRebatePct: 30,
    tweTokenDiscountPct: 5,
    features: [
      'Everything in Free Access',
      'Gemini AI MD&A Sentiment Analysis (10-K & 10-Q filings)',
      'SEC Regulatory Risk Heatmaps with Recharts',
      'Automated High-Risk 8-K Disclosure Alerting',
      'Full Level-2 Order Book Depth & Flow Visualizer',
      '30% ATS Maker & Taker Trading Fee Rebate',
      '5% OTC Discount on TWE Token Block Purchases',
      'Priority RPC Node Throughput (100 req/sec)'
    ]
  },
  vip: {
    tier: 'vip',
    name: 'VIP Full Access',
    subtitle: 'Institutional Dark Pool & Maximum Rebates',
    tagline: 'Maximum platform access with dark pool liquidity and sub-millisecond atomic settlement',
    badgeLabel: 'VIP FULL ACCESS ♦',
    monthlyPriceUsd: 299,
    annualPriceUsd: 2990,
    lifetimePriceUsd: 4999,
    atsMakerFeePct: 0.038,
    atsTakerFeePct: 0.05,
    feeRebatePct: 75,
    tweTokenDiscountPct: 15,
    features: [
      'Everything in Elite Tier',
      'Exclusive Dark Pool Order Book & Hidden Liquidity Routing',
      'Smart Order Routing (SOR) across 52+ Liquidity Venues',
      'T+0 Sub-Millisecond Atomic On-Chain Settlement Priority',
      '75% ATS Maker & Taker Trading Fee Rebate (Lowest Venue Fee)',
      '15% OTC Discount on TWE Token Block Purchases',
      'Full Institutional Partner API Credits ($870 Value)',
      'Dedicated 24/7/365 Desk Concierge & Custom Compliance Audits'
    ],
    restrictedNotice: 'Full Access excludes System Owner / Administrator superuser console, reserved for Mauro Lomibao Dar III.'
  }
};

export const INITIAL_PARTNER_VOUCHERS: PartnerVoucher[] = [
  {
    id: 'edgar-pro-voucher',
    partnerName: 'EdgarTools Pro',
    logoIcon: 'Landmark',
    title: '$120 EdgarTools API & SEC Pipeline Credit',
    valueUsd: 120,
    code: 'TWE-EDGAR-120-VIP',
    description: 'Complimentary high-speed SEC filings stream and automated document text analysis endpoint.',
    minTierRequired: 'elite',
    claimed: false,
    expiryDate: '2027-12-31'
  },
  {
    id: 'chainlink-oracle-voucher',
    partnerName: 'Chainlink Data Feeds',
    logoIcon: 'Zap',
    title: '$250 Decentralized Oracle & Gas Subsidies',
    valueUsd: 250,
    code: 'TWE-LINK-250-VIP',
    description: 'Subsidized gas oracle updates and institutional low-latency data feeds for automated market making.',
    minTierRequired: 'elite',
    claimed: false,
    expiryDate: '2027-12-31'
  },
  {
    id: 'refinitiv-ats-voucher',
    partnerName: 'Refinitiv / Bloomberg ATS Gateway',
    logoIcon: 'Activity',
    title: '$500 Institutional FIX/FAST Stream Credit',
    valueUsd: 500,
    code: 'TWE-BLOOMBERG-500-VIP',
    description: 'Direct institutional FIX protocol socket connector to traditional capital markets and dark pools.',
    minTierRequired: 'vip',
    claimed: false,
    expiryDate: '2027-12-31'
  }
];

// Helper functions for capability checking
export function canAccessAiSentiment(tier: MembershipTier): boolean {
  return tier === 'elite' || tier === 'vip';
}

export function canAccessRiskHeatmap(tier: MembershipTier): boolean {
  return tier === 'elite' || tier === 'vip';
}

export function canAccessDarkPool(tier: MembershipTier): boolean {
  return tier === 'vip';
}

export function canAccessInstitutionalSor(tier: MembershipTier): boolean {
  return tier === 'vip';
}
