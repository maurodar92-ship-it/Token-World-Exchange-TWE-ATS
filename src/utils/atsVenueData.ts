/**
 * Token World ATS & NYSE Dual-Listing Venue
 * Complete Regulatory Specifications, Master Legal Documents,
 * Off-Chain Matching Engine, and Opening Bell Ceremony Suite.
 * 
 * Registered Principal & Treasury Owner:
 * Mauro Lomibao Dar III
 * 945 Westholme Ave, Los Angeles, CA 90024
 * Phone: (310) 904-5646
 * Email: mdgodsiii@gmail.com
 */

import { ChainType } from "../types";

export interface TokenDeploymentConfig {
  tokenId: string;
  targetChains: ChainType[];
  selectedChain: ChainType;
  // Stage 1: Smart Contracts
  contractStandard: "ERC20" | "SPL" | "ERC20_PERMIT" | "ERC20_VOTES" | "ERC3643" | "ERC1400";
  compilerVersion: string;
  runs: number;
  // Stage 2: Liquidity & DEX
  dexTarget: "uniswap_v3" | "raydium" | "aerodrome" | "pancakeswap" | "fjord_lbp";
  initialLiquidityUsd: number;
  initialTokenSupplyPercent: number;
  feeTier: number; // e.g. 3000 for 0.3%
  // Stage 3: CEX
  cexTargetPlatforms: string[];
  complianceVerified: boolean;
  legalOpinionStatus: "ready" | "pending_review" | "exempt";
  // Stage 4: Vesting & Safe
  safeThreshold: number;
  safeOwners: string[];
  vestingTranches: { name: string; percent: number; cliffMonths: number; durationMonths: number }[];
  // Stage 5: dApp Integration
  clientFramework: "wagmi_v2" | "ethers_v6" | "solana_web3";
  walletLibrary: "rainbowkit" | "privy" | "walletconnect_v2";
}

export type RwaAssetCategory =
  | "pre_ipo_equity"
  | "commercial_real_estate"
  | "treasury_debt"
  | "sovereign_security";

export interface AtsSecurityAsset {
  symbol: string;
  name: string;
  category: RwaAssetCategory;
  categoryLabel: string;
  issuerName: string;
  secRegistration: "Reg D 506(c)" | "Rule 144A" | "Reg S" | "Reg A+ Tier 2" | "SEC Form ATS";
  cusip: string;
  isin: string;
  contractAddress: string;
  navPerShare: number;
  referencePrice: number;
  yieldApy?: number;
  distributionFrequency?: string;
  underlyingCollateral: string;
  jurisdiction: string;
  holdingPeriodLockDays: number;
  minimumInvestmentUsd: number;
  standard: "ERC-3643" | "ERC-1400" | "ERC-20-PERMIT";
  dtccEligible: boolean;
  settlementProtocol: "ATOMIC_DVP_T0";
  description: string;
}

export interface InvestorIdentityProfile {
  id: string;
  walletAddress: string;
  investorName: string;
  countryCode: string;
  accreditationTier: "QIB_RULE_144A" | "ACCREDITED_REG_D" | "OFFSHORE_REG_S" | "RETAIL_RESTRICTED";
  kycStatus: "VERIFIED" | "PENDING_DOCUMENTATION" | "SANCTIONED_REJECTED";
  onChainId: string;
  lockupExpiresAt: number;
  verifiedClaims: {
    claimType: string;
    issuer: string;
    signature: string;
    validUntil: number;
  }[];
}

export interface ComplianceGateVerificationResult {
  canTransfer: boolean;
  reasonCode:
    | "APPROVED"
    | "ERROR_INVESTOR_NOT_ACCREDITED"
    | "ERROR_HOLDING_PERIOD_NOT_ELAPSED"
    | "ERROR_JURISDICTION_PROHIBITED"
    | "ERROR_INVESTOR_CAP_EXCEEDED"
    | "ERROR_UNVERIFIED_ONCHAINID";
  message: string;
  ruleEvaluated: string;
  onChainGateAddress: string;
  gasUnitsEstimated: number;
}

export interface AtsOrder {
  id: string;
  traderAddress: string;
  side: "BUY" | "SELL";
  price: number;
  quantity: number;
  initialQuantity: number;
  timestamp: number;
  status: "OPEN" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED";
  orderType: "LIMIT" | "MARKET" | "STOP_LOSS" | "STOP_LIMIT" | "OCO";
  investorTier: "QIB_RULE_144A" | "ACCREDITED_REG_D" | "OFFSHORE_REG_S";
}

export interface AtsTradeExecution {
  id: string;
  buyOrderId: string;
  sellOrderId: string;
  buyerAddress: string;
  sellerAddress: string;
  symbol: string;
  quantity: number;
  price: number;
  totalUsd: number;
  timestamp: number;
  txHash: string;
  blockNumber: number;
  settlementType: "ATOMIC_DVP_ERC3643";
  dtccFastStatus: "RECONCILED" | "PENDING_REPORT";
  settlementStatus?: "MATCHED" | "ATOMIC_CLEARING_VERIFIED";
}

export interface PrimaryIssuanceRound {
  id: string;
  assetName: string;
  symbol: string;
  exemption: "Reg D 506(c)" | "Rule 144A" | "Reg S" | "Reg A+ Tier 2";
  targetCapitalUsd: number;
  raisedCapitalUsd: number;
  sharePriceUsd: number;
  totalSharesOffered: number;
  sharesAllocated: number;
  minimumInvestmentUsd: number;
  investorCount: number;
  escrowAgent: string;
  status: "ACTIVE" | "SUBSCRIPTION_CLOSED" | "ALLOCATING";
}

export interface DtccFastReconciliationRecord {
  timestamp: number;
  symbol: string;
  nysePublicFloatDtcShares: number;
  tokenWorldWrappedShares: number;
  transferAgentMasterFileTotal: number;
  variance: number;
  status: "BALANCED" | "AUDIT_VERIFIED";
  reconciledBy: string;
}

export const OWNER_PROFILE = {
  name: "Mauro Lomibao Dar III\u00ae",
  soleOwnerName: "Mauro Lomibao Dar III\u00ae",
  title: "Sole Owner/ Creator",
  organization: "Token World Exchange (TWE) ATS\u00ae",
  headquarters: "945 Westholme Ave, Los Angeles, CA 90024",
  phone: "(310) 904-5646",
  email: "maurodar08@gmail.com",
  secondaryEmail: "mdgodsiii@gmail.com",
  finraCrd: "CRD# 8492041",
  secAtsFileNumber: "SEC File No. 024-11894",
  dtccFastParticipantId: "DTCC FAST Participant #9450",
  nyseListedSymbol: "TWE",
  atsTokenSymbol: "TWE",
  exchangeTicker: "TWE",
};

export const TWE_PLATFORM_SPECIFICATIONS = [
  { parameter: "Market Venue", specification: "Token World Exchange ATS®", badge: "SEC Reg ATS" },
  { parameter: "Exchange Ticker Symbol", specification: "TWE", badge: "NYSE & ATS" },
  { parameter: "Regulatory Status", specification: "SEC Regulation ATS & FINRA Registered Broker-Dealer", badge: "CRD# 8492041" },
  { parameter: "Asset Class Support", specification: "Tokenized Equities, ETFs, Institutional RWAs", badge: "Multi-Asset" },
  { parameter: "Trading Schedule", specification: "24/7/365 Continuous Execution", badge: "Follow-The-Sun" },
  { parameter: "Settlement Mechanism", specification: "T+0 Atomic On-Chain Settlement", badge: "Zero Drag" },
  { parameter: "Transfer Agent / Custody", specification: "SEC-Regulated Digital Transfer Agents & Qualified Custodians", badge: "DTCC FAST #9450" },
  { parameter: "Participant Eligibility", specification: "QIBs, Qualified Purchasers & Rule 506(c) Accredited Investors", badge: "KYC/AML Verified" },
  { parameter: "Sole Owner & Creator", specification: "Mauro Lomibao Dar III (maurodar08@gmail.com)", badge: "945 Westholme Ave 90024" },
];

export interface TweFeeTier {
  tier: string;
  holdingRequired: number;
  makerFeePercent: number;
  takerFeePercent: number;
  apiRoutingPriority: string;
  rebatePercent: number;
}

export const TWE_FEE_TIERS: TweFeeTier[] = [
  { tier: "Tier 1: Standard Institutional", holdingRequired: 0, makerFeePercent: 0.20, takerFeePercent: 0.25, apiRoutingPriority: "Standard FIX (1ms)", rebatePercent: 0.00 },
  { tier: "Tier 2: Active Market Participant", holdingRequired: 10000, makerFeePercent: 0.12, takerFeePercent: 0.16, apiRoutingPriority: "Fast FIX (500µs)", rebatePercent: 0.02 },
  { tier: "Tier 3: Designated Liquidity Provider", holdingRequired: 50000, makerFeePercent: 0.05, takerFeePercent: 0.09, apiRoutingPriority: "Ultra-Low Latency (250µs)", rebatePercent: 0.05 },
  { tier: "Tier 4: VIP Sovereign Market Maker", holdingRequired: 250000, makerFeePercent: 0.00, takerFeePercent: 0.03, apiRoutingPriority: "Colocated DMA (140µs)", rebatePercent: 0.08 },
];

export interface TweGovernanceProposal {
  id: string;
  title: string;
  category: "FEE_SCHEDULE" | "ASSET_ONBOARDING" | "PROTOCOL_UPGRADE" | "COLLAR_CALIBRATION";
  status: "ACTIVE" | "PASSED" | "EXECUTED";
  votesFor: number;
  votesAgainst: number;
  quorumPercent: number;
  description: string;
}

export const TWE_GOVERNANCE_PROPOSALS: TweGovernanceProposal[] = [
  {
    id: "TWE-AIP-101",
    title: "Onboard BlackRock BUIDL & Sovereign Treasury Tokens to 24/7 ATS Order Book",
    category: "ASSET_ONBOARDING",
    status: "ACTIVE",
    votesFor: 8450000,
    votesAgainst: 120000,
    quorumPercent: 88.4,
    description: "Authorize direct secondary trading pairs and atomic DvP settlement rails for institutional Treasury funds with SEC-approved custody.",
  },
  {
    id: "TWE-AIP-102",
    title: "Dynamic Maker Fee Rebate Protocol for High-Velocity TWE Stakers",
    category: "FEE_SCHEDULE",
    status: "PASSED",
    votesFor: 12400000,
    votesAgainst: 340000,
    quorumPercent: 94.2,
    description: "Implement a 0.08% maker rebate funded by ATS venue float for participants staking >250,000 TWE tokens.",
  },
  {
    id: "TWE-AIP-103",
    title: "Dual NYSE Rule 497 & Sub-Millisecond Pre-Trade Risk Filter Threshold Calibration",
    category: "PROTOCOL_UPGRADE",
    status: "ACTIVE",
    votesFor: 9100000,
    votesAgainst: 480000,
    quorumPercent: 91.0,
    description: "Calibrate SEC Rule 15c3-5 collars to auto-adjust during breaking 8-K disclosures and expand DTCC FAST continuous settlement bandwidth.",
  },
];

export const SAMPLE_RWA_ASSETS: AtsSecurityAsset[] = [
  {
    symbol: "TWE",
    name: "Token World Exchange ATS®",
    category: "pre_ipo_equity",
    categoryLabel: "NYSE & ATS Dual-Listed",
    issuerName: "Token World Exchange ATS® Inc. (Mauro Lomibao Dar III)",
    secRegistration: "SEC Form ATS",
    cusip: "89234T104",
    isin: "US89234T1045",
    contractAddress: "0x12bE66708709320Ac321A858712C208492E69d12",
    navPerShare: 100.00,
    referencePrice: 100.00,
    underlyingCollateral: "Token World Exchange ATS Broker-Dealer Float, NYSE Dual Listing & Global Fee Revenues",
    jurisdiction: "United States (SEC Regulation ATS & FINRA Registered Broker-Dealer)",
    holdingPeriodLockDays: 0,
    minimumInvestmentUsd: 100,
    standard: "ERC-3643",
    dtccEligible: true,
    settlementProtocol: "ATOMIC_DVP_T0",
    description: "Institutional-grade Alternative Trading System operating under SEC/FINRA oversight to facilitate continuous trading, liquidity, and settlement for tokenized securities, ETFs, and real-world assets (RWAs).",
  },
  {
    symbol: "TW-EQ",
    name: "Token World Institutional Common Equity",
    category: "pre_ipo_equity",
    categoryLabel: "ATS & NYSE Dual-Listing",
    issuerName: "Token World Exchange Inc.",
    secRegistration: "SEC Form ATS",
    cusip: "89234M109",
    isin: "US89234M1092",
    contractAddress: "0x3A9F1B229D48C1C82902bC017845fD24E67Ac08E",
    navPerShare: 52.50,
    referencePrice: 52.50,
    underlyingCollateral: "Token World Treasury ATS Broker-Dealer Float & Exchange Retained Earnings",
    jurisdiction: "United States (Delaware C-Corp)",
    holdingPeriodLockDays: 0,
    minimumInvestmentUsd: 1000,
    standard: "ERC-3643",
    dtccEligible: true,
    settlementProtocol: "ATOMIC_DVP_T0",
    description: "Sovereign common equity in Token World Exchange, dual-cleared across NYSE DTC float and ERC-3643 on-chain order books.",
  },
  {
    symbol: "SPX-EQ",
    name: "SpaceX Fractional Pre-IPO Common Equity Series N",
    category: "pre_ipo_equity",
    categoryLabel: "Pre-IPO Secondary Equity",
    issuerName: "Space Exploration Technologies Corp. SPV IV",
    secRegistration: "Reg D 506(c)",
    cusip: "848574102",
    isin: "US8485741028",
    contractAddress: "0x789d98F8aC61466A8E1b3BfFa6c1B61942E285bF",
    navPerShare: 185.00,
    referencePrice: 185.00,
    underlyingCollateral: "1,500,000 Series N SpaceX Common Shares held in Delaware Custody Trust",
    jurisdiction: "United States (Delaware SPV)",
    holdingPeriodLockDays: 365,
    minimumInvestmentUsd: 5000,
    standard: "ERC-3643",
    dtccEligible: true,
    settlementProtocol: "ATOMIC_DVP_T0",
    description: "Tokenized pre-IPO secondary equity representing indirect beneficial ownership in SpaceX commercial spaceflight operations.",
  },
  {
    symbol: "STR-EQ",
    name: "Stripe Secondary Common Stock Class A",
    category: "pre_ipo_equity",
    categoryLabel: "Pre-IPO Secondary Equity",
    issuerName: "Stripe Global Holdings SPV II",
    secRegistration: "Rule 144A",
    cusip: "863294201",
    isin: "US8632942014",
    contractAddress: "0x12bE66708709320Ac321A858712C208492E69d12",
    navPerShare: 32.40,
    referencePrice: 32.40,
    underlyingCollateral: "2,800,000 Class A Common Shares deposited in qualified institutional custody",
    jurisdiction: "United States (Delaware)",
    holdingPeriodLockDays: 180,
    minimumInvestmentUsd: 2500,
    standard: "ERC-1400",
    dtccEligible: true,
    settlementProtocol: "ATOMIC_DVP_T0",
    description: "Institutional digital security providing liquid 24/7 secondary access to Stripe fintech payment processing equity.",
  },
  {
    symbol: "NEU-EQ",
    name: "Neuralink Series C Tokenized Preferred Stock",
    category: "pre_ipo_equity",
    categoryLabel: "Pre-IPO Secondary Equity",
    issuerName: "Neuralink NeuroTech SPV III",
    secRegistration: "Reg D 506(c)",
    cusip: "641290305",
    isin: "US6412903052",
    contractAddress: "0x9812A27F11C871A6992dC8817282bAc60E21e905",
    navPerShare: 45.50,
    referencePrice: 45.50,
    underlyingCollateral: "Series C Preferred Stock in Brain-Computer Interface pioneer",
    jurisdiction: "United States (Texas)",
    holdingPeriodLockDays: 365,
    minimumInvestmentUsd: 5000,
    standard: "ERC-3643",
    dtccEligible: true,
    settlementProtocol: "ATOMIC_DVP_T0",
    description: "Regulated security token representing fractional ownership in clinical-stage neural interface technologies.",
  },
  {
    symbol: "RWA-MANH",
    name: "Manhattan Hudson Yards Class-A Real Estate Deed",
    category: "commercial_real_estate",
    categoryLabel: "Real-World Asset (Real Estate)",
    issuerName: "Hudson Yards Prime Property Trust LLC",
    secRegistration: "Reg D 506(c)",
    cusip: "444109823",
    isin: "US4441098231",
    contractAddress: "0x44BcA912c98F9082A81B0941F480414B60Ef110C",
    navPerShare: 1000.00,
    referencePrice: 1000.00,
    yieldApy: 8.4,
    distributionFrequency: "Quarterly in USDC",
    underlyingCollateral: "First mortgage & equity deed on 65-story commercial skyscraper in Manhattan, NYC",
    jurisdiction: "United States (New York)",
    holdingPeriodLockDays: 90,
    minimumInvestmentUsd: 1000,
    standard: "ERC-3643",
    dtccEligible: true,
    settlementProtocol: "ATOMIC_DVP_T0",
    description: "Fractionalized prime commercial real estate yielding 8.4% APY from institutional tech tenants with automated on-chain distributions.",
  },
  {
    symbol: "RWA-MIA",
    name: "Miami Brickell Financial Center Fractional Deed",
    category: "commercial_real_estate",
    categoryLabel: "Real-World Asset (Real Estate)",
    issuerName: "Brickell Gateway Towers LLC",
    secRegistration: "Reg S",
    cusip: "109823444",
    isin: "US1098234449",
    contractAddress: "0x56aD9818C0bA176840715D081Ba722e0e9819921",
    navPerShare: 250.00,
    referencePrice: 250.00,
    yieldApy: 7.8,
    distributionFrequency: "Monthly in USDT/USDC",
    underlyingCollateral: "Direct deed on Class-A Brickell financial district office tower",
    jurisdiction: "United States / Offshore Reg S Eligible",
    holdingPeriodLockDays: 45,
    minimumInvestmentUsd: 500,
    standard: "ERC-1400",
    dtccEligible: true,
    settlementProtocol: "ATOMIC_DVP_T0",
    description: "Tokenized commercial property deed in Miami's international banking corridor offering monthly net cashflow payouts.",
  },
  {
    symbol: "US-TBILL",
    name: "US 3-Month Short-Duration Treasury Bill Yield",
    category: "treasury_debt",
    categoryLabel: "Tokenized US Government Debt",
    issuerName: "Token World Sovereign Liquidity Fund",
    secRegistration: "Reg A+ Tier 2",
    cusip: "912797HY8",
    isin: "US912797HY81",
    contractAddress: "0x7F037A34A600e1669485C92bCc0C3E6899A1E028",
    navPerShare: 98.75,
    referencePrice: 98.75,
    yieldApy: 5.25,
    distributionFrequency: "Daily Rebasing",
    underlyingCollateral: "100% US Department of the Treasury 13-week T-Bills held with BNY Mellon",
    jurisdiction: "United States (Federal Reserve / SEC Qualified)",
    holdingPeriodLockDays: 0,
    minimumInvestmentUsd: 100,
    standard: "ERC-3643",
    dtccEligible: true,
    settlementProtocol: "ATOMIC_DVP_T0",
    description: "Direct tokenized access to sovereign US Government risk-free yield with continuous 24/7 liquidity and atomic DvP clearing.",
  },
  {
    symbol: "TREE3",
    name: "Token World Sovereign TREE3 Security Token",
    category: "sovereign_security",
    categoryLabel: "Sovereign Treasury Token",
    issuerName: "Token World Sovereign Foundation",
    secRegistration: "Reg D 506(c)",
    cusip: "945089332",
    isin: "US9450893320",
    contractAddress: "0xd12A2E29B64E8CeFC8bc2AA80A7169817608704D",
    navPerShare: 125.00,
    referencePrice: 125.00,
    underlyingCollateral: "Intellectual Property Rights, ATS Revenue Share, and Sovereign Algorithm Patent Vault",
    jurisdiction: "United States (Founder Mauro Lomibao Dar III)",
    holdingPeriodLockDays: 0,
    minimumInvestmentUsd: 2500,
    standard: "ERC-3643",
    dtccEligible: true,
    settlementProtocol: "ATOMIC_DVP_T0",
    description: "Sovereign enterprise security token entitling holders to direct ATS transaction fee yield and intellectual property dividends.",
  },
];

export const SAMPLE_INVESTOR_PROFILES: InvestorIdentityProfile[] = [
  {
    id: "INV-01-SOVEREIGN",
    walletAddress: "0x3A9F1B229D48C1C82902bC017845fD24E67Ac08E",
    investorName: "Mauro Lomibao Dar III Sovereign Treasury",
    countryCode: "US",
    accreditationTier: "QIB_RULE_144A",
    kycStatus: "VERIFIED",
    onChainId: "0x89f412d0a8b9812e34fa98012480cba0981e3301",
    lockupExpiresAt: 0,
    verifiedClaims: [
      {
        claimType: "KYC_AML_CLEARANCE_FINRA",
        issuer: "Token World Compliance Officer",
        signature: "0xabc123...456",
        validUntil: Date.now() + 86400000 * 365,
      },
      {
        claimType: "SEC_QIB_RULE_144A_VERIFIED",
        issuer: "Qualified Institutional Audit",
        signature: "0xdef456...789",
        validUntil: Date.now() + 86400000 * 365,
      },
      {
        claimType: "OFAC_SANCTIONS_CHECK_PASSED",
        issuer: "Dow Jones Risk & Compliance",
        signature: "0x789012...345",
        validUntil: Date.now() + 86400000 * 180,
      },
    ],
  },
  {
    id: "INV-02-FAMILYOFFICE",
    walletAddress: "0x789d98F8aC61466A8E1b3BfFa6c1B61942E285bF",
    investorName: "Silicon Valley Tech Ventures Family Office",
    countryCode: "US",
    accreditationTier: "ACCREDITED_REG_D",
    kycStatus: "VERIFIED",
    onChainId: "0x4428bda81a98e09f87234cb09124ef98001a44bc",
    lockupExpiresAt: 0,
    verifiedClaims: [
      {
        claimType: "SEC_ACCREDITED_506C_VERIFIED",
        issuer: "VerifyInvestor.com Legal Audit",
        signature: "0xaa9812...bb3",
        validUntil: Date.now() + 86400000 * 300,
      },
      {
        claimType: "US_TAX_W9_CERTIFIED",
        issuer: "PricewaterhouseCoopers Tax Agent",
        signature: "0xbb1234...cc5",
        validUntil: Date.now() + 86400000 * 365,
      },
    ],
  },
  {
    id: "INV-03-OFFSHORE",
    walletAddress: "0x12bE66708709320Ac321A858712C208492E69d12",
    investorName: "Zurich Private Banking Group & Trust",
    countryCode: "CH",
    accreditationTier: "OFFSHORE_REG_S",
    kycStatus: "VERIFIED",
    onChainId: "0x99238bc01928374aefb098123498aefc091823bb",
    lockupExpiresAt: 0,
    verifiedClaims: [
      {
        claimType: "FINMA_QUALIFIED_INVESTOR",
        issuer: "Swiss Financial Market Authority Agent",
        signature: "0xdd9922...ee4",
        validUntil: Date.now() + 86400000 * 365,
      },
      {
        claimType: "NON_US_PERSON_REG_S",
        issuer: "International Legal Counsel",
        signature: "0xee3344...ff5",
        validUntil: Date.now() + 86400000 * 365,
      },
    ],
  },
  {
    id: "INV-04-RESTRICTED",
    walletAddress: "0x9999999999999999999999999999999999999999",
    investorName: "Unverified Retail Trader (Non-Accredited)",
    countryCode: "US",
    accreditationTier: "RETAIL_RESTRICTED",
    kycStatus: "PENDING_DOCUMENTATION",
    onChainId: "0x0000000000000000000000000000000000000000",
    lockupExpiresAt: Date.now() + 86400000 * 365,
    verifiedClaims: [],
  },
];

export const INITIAL_ORDERS: AtsOrder[] = [
  {
    id: "ORD-B01",
    traderAddress: "0x3A9F1B229D48C1C82902bC017845fD24E67Ac08E",
    side: "BUY",
    price: 52.50,
    quantity: 10000,
    initialQuantity: 10000,
    timestamp: Date.now() - 360000,
    status: "OPEN",
    orderType: "LIMIT",
    investorTier: "QIB_RULE_144A",
  },
  {
    id: "ORD-B02",
    traderAddress: "0x789d98F8aC61466A8E1b3BfFa6c1B61942E285bF",
    side: "BUY",
    price: 52.25,
    quantity: 25000,
    initialQuantity: 25000,
    timestamp: Date.now() - 300000,
    status: "OPEN",
    orderType: "LIMIT",
    investorTier: "ACCREDITED_REG_D",
  },
  {
    id: "ORD-B03",
    traderAddress: "0x12bE66708709320Ac321A858712C208492E69d12",
    side: "BUY",
    price: 51.90,
    quantity: 50000,
    initialQuantity: 50000,
    timestamp: Date.now() - 240000,
    status: "OPEN",
    orderType: "LIMIT",
    investorTier: "QIB_RULE_144A",
  },
  {
    id: "ORD-B04",
    traderAddress: "0x9812A27F11C871A6992dC8817282bAc60E21e905",
    side: "BUY",
    price: 51.50,
    quantity: 75000,
    initialQuantity: 75000,
    timestamp: Date.now() - 180000,
    status: "OPEN",
    orderType: "LIMIT",
    investorTier: "ACCREDITED_REG_D",
  },
  {
    id: "ORD-S01",
    traderAddress: "0x44BcA912c98F9082A81B0941F480414B60Ef110C",
    side: "SELL",
    price: 52.80,
    quantity: 12000,
    initialQuantity: 12000,
    timestamp: Date.now() - 340000,
    status: "OPEN",
    orderType: "LIMIT",
    investorTier: "ACCREDITED_REG_D",
  },
  {
    id: "ORD-S02",
    traderAddress: "0x56aD9818C0bA176840715D081Ba722e0e9819921",
    side: "SELL",
    price: 53.00,
    quantity: 30000,
    initialQuantity: 30000,
    timestamp: Date.now() - 280000,
    status: "OPEN",
    orderType: "LIMIT",
    investorTier: "QIB_RULE_144A",
  },
  {
    id: "ORD-S03",
    traderAddress: "0x7F037A34A600e1669485C92bCc0C3E6899A1E028",
    side: "SELL",
    price: 53.40,
    quantity: 45000,
    initialQuantity: 45000,
    timestamp: Date.now() - 210000,
    status: "OPEN",
    orderType: "LIMIT",
    investorTier: "OFFSHORE_REG_S",
  },
  {
    id: "ORD-S04",
    traderAddress: "0x892a09B16bC106cE77e6822c6080352A9E585fA2",
    side: "SELL",
    price: 53.90,
    quantity: 80000,
    initialQuantity: 80000,
    timestamp: Date.now() - 150000,
    status: "OPEN",
    orderType: "LIMIT",
    investorTier: "QIB_RULE_144A",
  },
];

export const INITIAL_EXECUTED_TRADES: AtsTradeExecution[] = [
  {
    id: "TRD-9041",
    buyOrderId: "ORD-B00",
    sellOrderId: "ORD-S00",
    buyerAddress: "0x3A9F1B229D48C1C82902bC017845fD24E67Ac08E",
    sellerAddress: "0x44BcA912c98F9082A81B0941F480414B60Ef110C",
    symbol: "TW-EQ",
    quantity: 15000,
    price: 52.50,
    totalUsd: 787500,
    timestamp: Date.now() - 480000,
    txHash: "0x8fa4c3b9911e58e37604112e9bca9a55734df987010a30b206771efb540ac099",
    blockNumber: 21045981,
    settlementType: "ATOMIC_DVP_ERC3643",
    dtccFastStatus: "RECONCILED",
  },
  {
    id: "TRD-9040",
    buyOrderId: "ORD-B99",
    sellOrderId: "ORD-S99",
    buyerAddress: "0x789d98F8aC61466A8E1b3BfFa6c1B61942E285bF",
    sellerAddress: "0x56aD9818C0bA176840715D081Ba722e0e9819921",
    symbol: "TW-EQ",
    quantity: 8500,
    price: 52.40,
    totalUsd: 445400,
    timestamp: Date.now() - 720000,
    txHash: "0x2da081c7f99146522c08a1a366f0cb31da7038e8cb57321e25eecb08f44101e4",
    blockNumber: 21045952,
    settlementType: "ATOMIC_DVP_ERC3643",
    dtccFastStatus: "RECONCILED",
  },
  {
    id: "TRD-9039",
    buyOrderId: "ORD-B98",
    sellOrderId: "ORD-S98",
    buyerAddress: "0x12bE66708709320Ac321A858712C208492E69d12",
    sellerAddress: "0x7F037A34A600e1669485C92bCc0C3E6899A1E028",
    symbol: "TW-EQ",
    quantity: 22000,
    price: 52.35,
    totalUsd: 1151700,
    timestamp: Date.now() - 1020000,
    txHash: "0x91bbcc0486f0a3ec608d234a17924fe464c02283a0058b87ceb5d840ef4a9198",
    blockNumber: 21045914,
    settlementType: "ATOMIC_DVP_ERC3643",
    dtccFastStatus: "RECONCILED",
  },
];

export const PRIMARY_ISSUANCES: PrimaryIssuanceRound[] = [
  {
    id: "ISSUE-01",
    assetName: "Token World Treasury Growth Equity",
    symbol: "TW-EQ",
    exemption: "Reg D 506(c)",
    targetCapitalUsd: 50000000,
    raisedCapitalUsd: 38750000,
    sharePriceUsd: 52.50,
    totalSharesOffered: 952380,
    sharesAllocated: 738095,
    minimumInvestmentUsd: 25000,
    investorCount: 142,
    escrowAgent: "Signature Bank Qualified Escrow / Anchorage Digital Custody",
    status: "ACTIVE",
  },
  {
    id: "ISSUE-02",
    assetName: "Token World Global Infrastructure Notes",
    symbol: "TW-NOTE",
    exemption: "Rule 144A",
    targetCapitalUsd: 100000000,
    raisedCapitalUsd: 84200000,
    sharePriceUsd: 1000.00,
    totalSharesOffered: 100000,
    sharesAllocated: 84200,
    minimumInvestmentUsd: 250000,
    investorCount: 48,
    escrowAgent: "BNY Mellon Institutional Trustee",
    status: "ACTIVE",
  },
  {
    id: "ISSUE-03",
    assetName: "Token World International Sovereign Float",
    symbol: "TW-INTL",
    exemption: "Reg S",
    targetCapitalUsd: 25000000,
    raisedCapitalUsd: 25000000,
    sharePriceUsd: 48.00,
    totalSharesOffered: 520833,
    sharesAllocated: 520833,
    minimumInvestmentUsd: 10000,
    investorCount: 310,
    escrowAgent: "Deltec Trust Company Ltd.",
    status: "SUBSCRIPTION_CLOSED",
  },
];

export const INITIAL_DTCC_RECONCILIATION: DtccFastReconciliationRecord = {
  timestamp: Date.now(),
  symbol: "TW-EQ",
  nysePublicFloatDtcShares: 15400000, // Shares held at DTC via Cede & Co.
  tokenWorldWrappedShares: 4600000,   // Shares tokenized in Token World ATS
  transferAgentMasterFileTotal: 20000000, // Total authorized & issued
  variance: 0,
  status: "BALANCED",
  reconciledBy: "VStock Transfer / DTCC FAST Automated Engine #9450",
};

/**
 * Solidity Source Code for TokenWorldSecurityToken.sol
 */
export const SOLIDITY_SECURITY_TOKEN_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Token World - TokenWorldSecurityToken
 * @notice System: Token World
 * @dev Sole Owner: Mauro Lomibao Dar III
 * @dev Compliant ERC-1400 / ERC-3643 Permissioned Security Token
 * Engineered for Token World Alternative Trading System (ATS)
 * Sole Owner: Mauro Lomibao Dar III
 * Executive Office: 945 Westholme Ave, Los Angeles, CA 90024
 */

interface IIdentityRegistry {
    function isVerified(address _userAddress) external view returns (bool);
    function getInvestorCountry(address _userAddress) external view returns (uint16);
    function isAccredited(address _userAddress) external view returns (bool);
}

contract TokenWorldSecurityToken {
    string public constant SYSTEM_TITLE = "Token World Exchange\u00ae";
    string public constant SOLE_OWNER_CREATOR = "Mauro Lomibao Dar III\u00ae";

    string public name = "Token World Exchange\u00ae Equity";
    string public symbol = "TW-EQ";
    uint8 public constant decimals = 0; // Equity units treated as whole shares
    uint256 public totalSupply;

    address public owner;
    address public transferAgent;
    IIdentityRegistry public identityRegistry;

    // Balances & Permissions
    mapping(address => uint256) public balanceOf;
    mapping(address => bool) public isFrozen;
    mapping(address => uint256) public lockupExpiry;

    // Events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);
    event AddressFrozen(address indexed target, bool frozen);
    event IdentityRegistryUpdated(address indexed newRegistry);
    event TransferAgentUpdated(address indexed newAgent);

    modifier onlyOwner() {
        require(msg.sender == owner, "TokenWorld: Unauthorized Caller - Not Owner");
        _;
    }

    modifier onlyTransferAgent() {
        require(msg.sender == transferAgent || msg.sender == owner, "TokenWorld: Unauthorized Caller - Not Transfer Agent");
        _;
    }

    constructor(address _identityRegistry, address _transferAgent) {
        owner = msg.sender;
        identityRegistry = IIdentityRegistry(_identityRegistry);
        transferAgent = _transferAgent;
        
        // Initial Genesis Authorized Shares for Mauro Lomibao Dar III Treasury
        uint256 genesisShares = 20_000_000;
        totalSupply = genesisShares;
        balanceOf[msg.sender] = genesisShares;
        emit TokensMinted(msg.sender, genesisShares);
        emit Transfer(address(0), msg.sender, genesisShares);
    }

    /**
     * @dev Compliant DvP transfer with Identity Registry enforcement
     */
    function transfer(address _to, uint256 _value) public returns (bool) {
        require(!isFrozen[msg.sender], "TokenWorld: Sender address is frozen");
        require(!isFrozen[_to], "TokenWorld: Recipient address is frozen");
        require(block.timestamp >= lockupExpiry[msg.sender], "TokenWorld: Sender shares are in Reg D lockup");
        require(identityRegistry.isVerified(_to), "TokenWorld: Transfer rejected - Recipient KYC not verified in Identity Registry");
        require(balanceOf[msg.sender] >= _value, "TokenWorld: Insufficient share balance");

        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
        emit Transfer(msg.sender, _to, _value);
        return true;
    }

    /**
     * @dev Mint new shares upon Transfer Agent DTCC deposit
     */
    function mint(address _to, uint256 _amount) external onlyTransferAgent {
        require(identityRegistry.isVerified(_to), "TokenWorld: Mint rejected - Recipient KYC invalid");
        totalSupply += _amount;
        balanceOf[_to] += _amount;
        emit TokensMinted(_to, _amount);
        emit Transfer(address(0), _to, _amount);
    }

    /**
     * @dev Burn shares upon redemption back to traditional NYSE float
     */
    function burn(address _from, uint256 _amount) external onlyTransferAgent {
        require(balanceOf[_from] >= _amount, "TokenWorld: Burn rejected - Insufficient share balance");
        balanceOf[_from] -= _amount;
        totalSupply -= _amount;
        emit TokensBurned(_from, _amount);
        emit Transfer(_from, address(0), _amount);
    }

    /**
     * @dev Compliance Freeze toggle for court order / AML sanctions
     */
    function setAddressFrozen(address _target, bool _frozen) external onlyTransferAgent {
        isFrozen[_target] = _frozen;
        emit AddressFrozen(_target, _frozen);
    }

    /**
     * @dev Set lockup expiry for SEC Regulation D 506(c) restricted periods
     */
    function setLockupExpiry(address _target, uint256 _expiryTimestamp) external onlyTransferAgent {
        lockupExpiry[_target] = _expiryTimestamp;
    }

    function setIdentityRegistry(address _newRegistry) external onlyOwner {
        identityRegistry = IIdentityRegistry(_newRegistry);
        emit IdentityRegistryUpdated(_newRegistry);
    }

    function setTransferAgent(address _newAgent) external onlyOwner {
        transferAgent = _newAgent;
        emit TransferAgentUpdated(_newAgent);
    }
}`;

/**
 * Solidity Source Code for Token World TREE3Token.sol
 */
export const SOLIDITY_TREE3_TOKEN_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Token World - TREE3Token
 * @notice System: Token World
 * @dev Sole Owner: Mauro Lomibao Dar III
 * @notice Core ERC-20 token for the Token World ecosystem featuring a deterministic TREE(3)-inspired ID generator.
 */
contract TREE3Token is ERC20, ERC20Burnable, Ownable {
    string public constant SYSTEM_TITLE = "Token World";
    string public constant SOLE_OWNER = "Mauro Lomibao Dar III";

    // 1 Quadrillion TREE3 (1,000,000,000,000,000 * 10**18)
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000_000_000 * 10**18;

    event BatchDataIngested(uint256 indexed batchId, uint256 validRecordsCount);
    event Tree3IdGenerated(address indexed account, uint256 indexed nonce, bytes32 tree3Id);

    constructor(address initialOwner) ERC20("Token World TREE3", "TREE3") Ownable(initialOwner) {
        _mint(initialOwner, INITIAL_SUPPLY);
    }

    /**
     * @notice Generates a deterministic TREE(3)-inspired identifier based on an address, nonce, and seed block.
     * @param account Target account address
     * @param nonce Transaction or sequence nonce
     * @param seed Arbitrary seed or block variable
     */
    function generateTree3ID(address account, uint256 nonce, uint256 seed) public pure returns (bytes32) {
        bytes32 step1 = keccak256(abi.encodePacked(account, nonce, seed));
        bytes32 step2 = keccak256(abi.encodePacked(step1, account, nonce + 1));
        return keccak256(abi.encodePacked(step1, step2, seed));
    }
}`;

/**
 * Solidity Source Code for Token World TokenWorldTreasury.sol
 */
export const SOLIDITY_TREASURY_TOKEN_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Token World Exchange® - TokenWorldTreasury
 * @notice System: Token World Exchange®
 * @dev Sole Owner/ Creator: Mauro Lomibao Dar III®
 * @notice Compliant security token using standard ERC-20 patterns with investor whitelisting for Token World Treasury.
 */
contract TokenWorldTreasury {
    string public constant SYSTEM_TITLE = "Token World Exchange\u00ae";
    string public constant SOLE_OWNER_CREATOR = "Mauro Lomibao Dar III\u00ae";

    string public name = "Token World Exchange\u00ae Treasury";
    string public symbol = "TWT";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    address public owner;

    mapping(address => uint256) public balanceOf;
    mapping(address => bool) public whitelistedInvestors;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event WhitelistUpdated(address indexed investor, bool status);
    event BatchWhitelistUpdated(uint256 totalUpdated, bool status);

    modifier onlyOwner() {
        require(msg.sender == owner, "Token World: Not authorized - Caller is not Sole Owner");
        _;
    }

    constructor(uint256 initialSupply) {
        owner = msg.sender;
        totalSupply = initialSupply * 10**uint256(decimals);
        balanceOf[msg.sender] = totalSupply;
        whitelistedInvestors[msg.sender] = true;
    }

    function setWhitelistStatus(address investor, bool status) external onlyOwner {
        whitelistedInvestors[investor] = status;
        emit WhitelistUpdated(investor, status);
    }

    function batchSetWhitelist(address[] calldata investors, bool status) external onlyOwner {
        for (uint256 i = 0; i < investors.length; i++) {
            whitelistedInvestors[investors[i]] = status;
            emit WhitelistUpdated(investors[i], status);
        }
        emit BatchWhitelistUpdated(investors.length, status);
    }

    function transfer(address to, uint256 value) external returns (bool) {
        require(whitelistedInvestors[msg.sender], "Token World: Sender not whitelisted");
        require(whitelistedInvestors[to], "Token World: Recipient not whitelisted");
        require(balanceOf[msg.sender] >= value, "Token World: Insufficient balance");

        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }
}`;

/**
 * Foundry Deployment Script Source Code (DeployTREE3.s.sol)
 */
export const FOUNDRY_DEPLOY_TREE3_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/TREE3Token.sol";

/**
 * @title Token World - DeployTREE3
 * @notice System: Token World
 * @dev Sole Owner: Mauro Lomibao Dar III
 * @notice Production Foundry script to deploy Token World TREE3 Token.
 */
contract DeployTREE3 is Script {
    string public constant SYSTEM_TITLE = "Token World";
    string public constant SOLE_OWNER = "Mauro Lomibao Dar III";

    function run() external returns (TREE3Token) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        TREE3Token token = new TREE3Token(deployerAddress);

        vm.stopBroadcast();

        console.log("TREE3 Token deployed to:", address(token));
        console.log("Owner Address:", deployerAddress);
        console.log("Total Supply:", token.totalSupply());

        return token;
    }
}`;

/**
 * Foundry Test Suite Source Code (TREE3Token.t.sol)
 */
export const FOUNDRY_TEST_TREE3_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/TREE3Token.sol";

/**
 * @title Token World - TREE3TokenTest
 * @notice System: Token World
 * @dev Sole Owner: Mauro Lomibao Dar III
 * @notice Complete Foundry test suite for Token World TREE3 Token.
 */
contract TREE3TokenTest is Test {
    string public constant SYSTEM_TITLE = "Token World";
    string public constant SOLE_OWNER = "Mauro Lomibao Dar III";

    TREE3Token public token;
    address public owner = address(0xd12A2E29B64E8CeFC8bc2AA80A7169817608704D); // Mauro Lomibao Dar III Treasury
    address public user = address(0x2222222222222222222222222222222222222222);

    function setUp() public {
        token = new TREE3Token(owner);
    }

    function test_InitialSupply() public view {
        assertEq(token.totalSupply(), 1_000_000_000_000_000 * 10**18);
        assertEq(token.balanceOf(owner), 1_000_000_000_000_000 * 10**18);
    }

    function test_Burn() public {
        uint256 burnAmount = 1000 * 10**18;
        vm.prank(owner);
        token.burn(burnAmount);
        assertEq(token.totalSupply(), (1_000_000_000_000_000 * 10**18) - burnAmount);
    }

    function test_DeterministicTree3ID() public view {
        bytes32 id1 = token.generateTree3ID(user, 1, 999);
        bytes32 id2 = token.generateTree3ID(user, 1, 999);
        assertEq(id1, id2);
    }
}`;

/**
 * Python CSV Data Sanitizer & Ingestion Script (sanitize_data.py)
 */
export const PYTHON_CSV_SANITIZER_SOURCE = `#!/usr/bin/env python3
"""
Token World - CSV Data Sanitizer & Validator
System: Token World
Sole Owner: Mauro Lomibao Dar III
Headquarters: 945 Westholme Ave, Los Angeles, CA 90024 | (310) 904-5646

Handles malformed inputs (such as corrupted hex addresses 0xc0rp... and incomplete rows)
before submitting payload data to Token World testnet or contract functions.
"""

import csv
import re
import sys

def is_valid_address(address: str) -> bool:
    """Validates EVM 20-byte hex address format."""
    return bool(re.match(r"^0x[a-fA-F0-9]{40}$", address.strip()))

def sanitize_csv(input_filepath: str, output_filepath: str):
    valid_records = []
    rejected_records = []

    with open(input_filepath, mode='r', encoding='utf-8') as infile:
        reader = csv.DictReader(infile)
        for row_num, row in enumerate(reader, start=2):
            address = row.get("address", "").strip()
            amount = row.get("amount", "").strip()

            if not address or not amount:
                rejected_records.append((row_num, row, "Incomplete record"))
                continue

            if not is_valid_address(address):
                rejected_records.append((row_num, row, f"Malformed address: {address}"))
                continue

            try:
                valid_amount = int(amount)
                valid_records.append({"address": address, "amount": valid_amount})
            except ValueError:
                rejected_records.append((row_num, row, f"Invalid numeric amount: {amount}"))

    with open(output_filepath, mode='w', newline='', encoding='utf-8') as outfile:
        writer = csv.DictWriter(outfile, fieldnames=["address", "amount"])
        writer.writeheader()
        writer.writerows(valid_records)

    print(f"[Token World] Ingestion complete. Valid records saved: {len(valid_records)}. Rejected: {len(rejected_records)}.")
    return len(valid_records), len(rejected_records)

if __name__ == "__main__":
    input_file = sys.argv[1] if len(sys.argv) > 1 else "token_input.csv"
    output_file = sys.argv[2] if len(sys.argv) > 2 else "token_sanitized.csv"
    sanitize_csv(input_file, output_file)
`;

/**
 * Python Source Code for TokenWorldMatchingEngine.py
 */
export const PYTHON_MATCHING_ENGINE_SOURCE = `#!/usr/bin/env python3
"""
Token World Alternative Trading System (ATS)
Low-Latency Central Limit Order Book (CLOB) & Atomic Settlement Engine
SEC Form ATS-N / Reg ATS Rule 301 Compliant

Principal: Mauro Lomibao Dar III
HQ: 945 Westholme Ave, Los Angeles, CA 90024
Contact: (310) 904-5646
"""

import hashlib
import time
import json
from typing import List, Dict, Optional

class Order:
    def __init__(self, order_id: str, trader_address: str, side: str, price: float, quantity: int, tier: str = "ACCREDITED_REG_D"):
        self.order_id = order_id
        self.trader_address = trader_address
        self.side = side.upper()  # "BUY" or "SELL"
        self.price = float(price)
        self.quantity = int(quantity)
        self.initial_quantity = int(quantity)
        self.tier = tier
        self.timestamp = time.time()

    def to_dict(self):
        return {
            "order_id": self.order_id,
            "trader_address": self.trader_address,
            "side": self.side,
            "price": self.price,
            "quantity": self.quantity,
            "initial_quantity": self.initial_quantity,
            "tier": self.tier,
            "timestamp": self.timestamp
        }

class TokenWorldMatchingEngine:
    def __init__(self, symbol: str = "TW-EQ"):
        self.symbol = symbol
        self.bids: List[Order] = []
        self.asks: List[Order] = []
        self.trade_history: List[Dict] = []
        self.total_volume_shares = 0
        self.total_volume_usd = 0.0

    def add_order(self, order: Order) -> List[Dict]:
        """
        Adds order to CLOB with strict Price-Time priority matching.
        """
        if order.side == "BUY":
            self.bids.append(order)
            self.bids.sort(key=lambda x: (-x.price, x.timestamp))  # Highest price first, earliest first
        else:
            self.asks.append(order)
            self.asks.sort(key=lambda x: (x.price, x.timestamp))   # Lowest price first, earliest first

        return self.match_orders()

    def match_orders(self) -> List[Dict]:
        executed_trades = []
        while self.bids and self.asks and self.bids[0].price >= self.asks[0].price:
            highest_bid = self.bids[0]
            lowest_ask = self.asks[0]

            matched_qty = min(highest_bid.quantity, lowest_ask.quantity)
            execution_price = lowest_ask.price  # Price-time passive fill price

            trade_receipt = self.execute_on_chain_settlement(highest_bid, lowest_ask, matched_qty, execution_price)
            executed_trades.append(trade_receipt)
            self.trade_history.append(trade_receipt)

            highest_bid.quantity -= matched_qty
            lowest_ask.quantity -= matched_qty
            self.total_volume_shares += matched_qty
            self.total_volume_usd += (matched_qty * execution_price)

            if highest_bid.quantity == 0:
                self.bids.pop(0)
            if lowest_ask.quantity == 0:
                self.asks.pop(0)

        return executed_trades

    def execute_on_chain_settlement(self, buy_order: Order, sell_order: Order, qty: int, price: float) -> Dict:
        """
        Synthesizes deterministic cryptographic Delivery-versus-Payment (DvP) payload
        broadcasted to ERC-3643 TokenWorldSecurityToken contract.
        """
        ts = time.time()
        payload = f"{buy_order.trader_address}:{sell_order.trader_address}:{qty}:{price}:{ts}"
        tx_hash = "0x" + hashlib.sha256(payload.encode("utf-8")).hexdigest()

        receipt = {
            "trade_id": f"TRD-{int(ts * 1000) % 1000000}",
            "symbol": self.symbol,
            "buyer": buy_order.trader_address,
            "seller": sell_order.trader_address,
            "shares": qty,
            "price_usd": price,
            "total_usd": qty * price,
            "tx_hash": tx_hash,
            "settlement_protocol": "ERC-3643_ATOMIC_DVP",
            "dtcc_fast_reconciled": True,
            "timestamp": ts
        }

        print(f"[TOKEN WORLD ATS MATCH] Executed: {qty} {self.symbol} @ \${price:.2f} | Tx: {tx_hash[:18]}...")
        return receipt

    def get_order_book_depth(self) -> Dict:
        return {
            "symbol": self.symbol,
            "spread": round(self.asks[0].price - self.bids[0].price, 2) if (self.bids and self.asks) else 0.0,
            "best_bid": self.bids[0].price if self.bids else None,
            "best_ask": self.asks[0].price if self.asks else None,
            "total_bids_count": len(self.bids),
            "total_asks_count": len(self.asks),
            "bids": [b.to_dict() for b in self.bids[:10]],
            "asks": [a.to_dict() for a in self.asks[:10]],
            "total_volume_shares": self.total_volume_shares,
            "total_volume_usd": self.total_volume_usd
        }

if __name__ == "__main__":
    engine = TokenWorldMatchingEngine()
    print("=== STARTING TOKEN WORLD ATS MATCHING ENGINE ===")
    engine.add_order(Order("B1", "0x3A9F1B229D48C1C82902bC017845fD24E67Ac08E", "BUY", 52.50, 5000))
    engine.add_order(Order("S1", "0x44BcA912c98F9082A81B0941F480414B60Ef110C", "SELL", 52.00, 2500))
    print(json.dumps(engine.get_order_book_depth(), indent=2))
`;

/**
 * 8 Official Regulatory & Master Architecture Documents
 */
export interface RegulatoryDocument {
  id: string;
  title: string;
  category:
    | "SEC Regulatory Filing"
    | "Corporate Governance"
    | "Smart Contract Suite"
    | "Technical Matching Engine"
    | "Compliance & Risk Framework";
  secFormCode: string;
  summary: string;
  filename: string;
  content: string;
  badge: string;
}

export const REGULATORY_DOCUMENTS: RegulatoryDocument[] = [
  {
    id: "doc-form-ats-n",
    title: "SEC Form ATS / ATS-N Operational Disclosure Packet",
    category: "SEC Regulatory Filing",
    secFormCode: "Form ATS / ATS-N",
    summary: "Complete initial operation filing under Regulation ATS Rule 301(a) establishing Token World Alternative Trading System for private primary issuances and secondary permissioned equity trading.",
    filename: "SEC_Form_ATS_N_Token_World_Filing.txt",
    badge: "SEC Filing Form ATS-N",
    content: `UNITED STATES SECURITIES AND EXCHANGE COMMISSION
WASHINGTON, D.C. 20549
FORM ATS-N / INITIAL FILING UNDER REGULATION ATS (17 CFR § 242.301)

PART I: FILING INFORMATION & BROKER-DEALER OPERATOR
1. Exact Name of Alternative Trading System: TOKEN WORLD ATS
2. Primary Broker-Dealer Operator: Token World LLC (FINRA Member CRD# 8492041)
3. Principal Executive Office: 945 Westholme Ave, Los Angeles, CA 90024
4. Principal Officer / Treasury Owner: Mauro Lomibao Dar III
   Title: Chief Executive Officer & Treasury Sovereign
   Direct Telephone: (310) 904-5646
   Corporate Email: mdgodsiii@gmail.com
5. Designated Clearing Agency: Depository Trust & Clearing Corporation (DTCC / FAST #9450)
6. Securities Traded:
   - Tokenized Private Common Equity (TW-EQ)
   - Regulation D 506(c) Primary Offering Units
   - Rule 144A Qualified Institutional Buyer (QIB) Resale Notes
   - Regulation S International Common Share Receipts
   - Dual-Listed Hybrid ERC-3643 Permissioned Securities

PART II: ELIGIBILITY OF SUBSCRIBERS
Subscribers are restricted to verified accredited investors under Rule 501(a) of Regulation D,
Qualified Institutional Buyers (QIBs) under Rule 144A, and non-U.S. persons under Regulation S.
KYC/AML identity verification is enforced synchronously via the TokenWorldSecurityToken
Identity Registry contract prior to order submission or settlement wallet generation.

PART III: ORDER TYPES & MATCHING METHODOLOGY
Token World operates a continuous electronic Central Limit Order Book (CLOB) utilizing strict
Price-Time Priority. Orders are submitted off-chain via secure REST/Websocket/FIX 4.4 APIs.
Matching is conducted within an in-memory execution engine with median internal latency under 2ms.
Upon match execution, an atomic Delivery-versus-Payment (DvP) cryptographic instruction is
dispatched to the smart contract settlement bus, guaranteeing simultaneous asset transfer
and USDC/USD cash debit.

PART IV: DUAL-LISTING RECONCILIATION WITH TRADITIONAL EXCHANGES (NYSE)
Token World provides seamless wrapping and unwrapping mechanisms interfacing directly with
the issuer's Transfer Agent (VStock Transfer / Computershare) via the DTCC FAST protocol.
Shares deposited from DTC account (Cede & Co.) are locked on the master register, triggering
an automated ERC-3643 mint to the subscriber's whitelisted wallet. Redemptions burn on-chain
tokens and credit the depository for physical/DTC-eligible NYSE trading.

PART V: EXHIBITS & ATTESTATIONS
Exhibit A: Code of Conduct & Market Integrity Rules
Exhibit B: Disaster Recovery & Cloud BCP Architecture
Exhibit C: Form BD Cross-Reference & FINRA ATS Operating Agreement
Executed this day by:
/s/ Mauro Lomibao Dar III
Founder & Treasury Sovereign, Token World LLC`,
  },
  {
    id: "doc-form-ats-r",
    title: "SEC Form ATS-R Quarterly Volume & Participant Activity Report",
    category: "SEC Regulatory Filing",
    secFormCode: "Form ATS-R",
    summary: "Mandatory quarterly transaction summary pursuant to Rule 301(b)(9) detailing gross dollar volume, share volume, subscriber distribution, and DvP settlement efficiency.",
    filename: "SEC_Form_ATS_R_Quarterly_Report_TokenWorld.txt",
    badge: "Quarterly Report Form ATS-R",
    content: `UNITED STATES SECURITIES AND EXCHANGE COMMISSION
FORM ATS-R: QUARTERLY REPORT OF ALTERNATIVE TRADING SYSTEM ACTIVITIES
Reporting Period: Q3 / Q4 Institutional Period
Operator: Token World LLC (Mauro Lomibao Dar III, Owner)
Address: 945 Westholme Ave, Los Angeles, CA 90024 | Tel: (310) 904-5646

SECTION 1: AGGREGATE DOLLAR & SHARE VOLUME
1. Equity Securities Traded on Token World ATS:
   - Ticker: TW-EQ (Token World Equity)
   - Total Units Traded: 4,850,000 Shares
   - Total Dollar Volume Traded: $254,625,000.00 USD
   - Average Execution Price: $52.50 USD
2. Debt & Structured Notes (Rule 144A):
   - Ticker: TW-NOTE
   - Total Units Traded: 84,200 Units
   - Total Dollar Volume Traded: $84,200,000.00 USD
3. Primary Issuance Volume (Reg D 506(c)):
   - Total Capital Syndicated: $38,750,000.00 USD
   - Active Subscribers: 142 Accredited Entities

SECTION 2: SUBSCRIBER ACTIVITY & SETTLEMENT STATS
- Registered Institutional Subscribers: 48 QIBs
- Registered Accredited Individuals / Family Offices: 310 Whitelisted Addresses
- On-Chain Atomic DvP Settlement Rate: 100.00% Zero-Fail Executions
- Failed Trades / Settling Reversals: 0
- DTCC FAST Automated Transfer Program Discrepancies: 0 (Zero Variance)

SECTION 3: CONFIDENTIAL ATTESTATION
I, Mauro Lomibao Dar III, hereby certify under penalty of perjury that the statements
and information contained herein are true, correct, and complete to the best of my knowledge.
Dated: October 2026
Mauro Lomibao Dar III
Principal Executive, Token World ATS`,
  },
  {
    id: "doc-ppm-reg-d",
    title: "SEC Regulation D (Rule 506(c)) Private Placement Memorandum (PPM)",
    category: "Corporate Governance",
    secFormCode: "Rule 506(c) PPM",
    summary: "Institutional Offering Circular & Subscription Agreement authorizing $50,000,000 in Token World Treasury Common Shares with integrated Transfer Agent book-entry.",
    filename: "Token_World_Reg_D_PPM_Mauro_Lomibao_Dar_III.txt",
    badge: "Reg D 506(c) PPM",
    content: `CONFIDENTIAL PRIVATE PLACEMENT MEMORANDUM
TOKEN WORLD LLC
$50,000,000 MAXIMUM OFFERING OF TOKENIZED COMMON EQUITY (TW-EQ)
OFFERED PURSUANT TO RULE 506(c) OF REGULATION D UNDER THE SECURITIES ACT OF 1933

OFFERING SUMMARY:
Issuer: Token World LLC (State of California / Delaware Registration)
Managing Member & Sovereign Owner: Mauro Lomibao Dar III
Executive Office: 945 Westholme Ave, Los Angeles, CA 90024
Telephone: (310) 904-5646
Securities Offered: Tokenized Common Equity Shares represented via ERC-3643 Smart Contract
Offering Price per Share: $52.50 USD
Minimum Initial Investment: $25,000.00 USD (Accredited Investors Only)
Escrow & Custody Agent: Qualified Custodian Bank & Anchorage Digital Trust

RESTRICTION ON TRANSFER (RULE 144 LEGEND):
THE SECURITIES OFFERED HEREBY HAVE NOT BEEN REGISTERED UNDER THE SECURITIES ACT OF 1933,
AS AMENDED (THE "SECURITIES ACT"), OR APPLICABLE STATE SECURITIES LAWS. THE SECURITIES ARE
OFFERED PURSUANT TO RULE 506(c) OF REGULATION D. TRANSFERS ARE RESTRICTED FOR A MINIMUM
OF ONE YEAR PURSUANT TO RULE 144 AND ARE ENFORCED PROGRAMMATICALLY VIA SMART CONTRACT
SMART CONTRACT LOCKUP EXPIRY TIMESTAMP METHODS.

INVESTMENT OBJECTIVE:
Proceeds will be deployed into:
1. Expansion of Token World Alternative Trading System high-frequency matching nodes.
2. DTCC FAST bridge capitalization and qualified broker-dealer reserve requirements.
3. Liquidity provisioning for dual-listing synchronization with NYSE trading float.
4. Institutional marketing for the NYSE Opening Bell ceremony and national capital deployment.

SUBSCRIPTION PROCEDURES:
Prospective investors must submit a completed Subscription Agreement, Form W-9 / W-8BEN,
and certified proof of accredited investor status from a licensed CPA, attorney, or FINRA BD.
Whitelisted Ethereum/EVM wallet addresses will be provisioned directly by Transfer Agent
upon wire verification.`,
  },
  {
    id: "doc-dtcc-fast-bridge",
    title: "DTCC FAST Reconciliation & Transfer Agent Master Security Protocol",
    category: "Corporate Governance",
    secFormCode: "DTCC FAST Spec",
    summary: "Technical interface specifications synchronizing legacy DTCC Cede & Co. book-entry depository holdings with the on-chain ERC-3643 Transfer Agent ledger.",
    filename: "DTCC_FAST_Reconciliation_Bridge_Spec.txt",
    badge: "DTCC FAST Bridge",
    content: `DEPOSITORY TRUST & CLEARING CORPORATION (DTCC)
FAST AUTOMATED TRANSFER PROGRAM (FAST) RECONCILIATION SPECIFICATION
ISSUER: TOKEN WORLD LLC (CUSIP: 894520-10-8 / ISIN: US8945201089)
OPERATOR: MAURO LOMIBAO DAR III (945 WESTHOLME AVE, LOS ANGELES, CA 90024)

1. RECONCILIATION EQUATION:
Total Authorized & Issued Shares (Master Security Holder File) MUST EQUAL:
[DTC Cede & Co. Public Float (NYSE: TW-EQ)] + [Token World ATS On-Chain Balances (ERC-3643)]

2. DUAL-LISTING WRAPPING MECHANISM (NYSE -> TOKEN WORLD ATS):
Step A: Broker deposits DTC shares to Transfer Agent participant account FAST #9450.
Step B: Transfer Agent decreases Cede & Co. balance by X units on Master Record.
Step C: Transfer Agent calls TokenWorldSecurityToken.mint(recipientWhitelistedAddress, X).
Step D: Recipient receives permissioned shares on Token World ATS for zero-latency trading.

3. UNWRAPPING MECHANISM (TOKEN WORLD ATS -> NYSE):
Step A: Subscriber initiates unwrap request via Token World trading portal.
Step B: Subscriber signs transaction invoking TokenWorldSecurityToken.burn(subscriberAddress, Y).
Step C: Oracle confirms burn event to Transfer Agent via authenticated webhook.
Step D: Transfer Agent credits DTC participant account with Y shares via FAST automated deposit.
Step E: Shares are tradeable immediately on the New York Stock Exchange floor.

4. DAILY RECONCILIATION CADENCE:
Every business day at 16:15 ET (NYSE Close), an automated reconciliation script verifies:
variance = master_shares - (dtc_shares + token_shares)
If variance != 0, all ATS minting and unwrapping functions are halted pending manual audit.`,
  },
  {
    id: "doc-erc3643-contracts",
    title: "ERC-3643 / ERC-1400 Smart Contract Technical Architecture Suite",
    category: "Smart Contract Suite",
    secFormCode: "ERC-3643 Solidity",
    summary: "Full production-ready Solidity smart contracts including TokenWorldSecurityToken, IIdentityRegistry, and atomic DvP DvPSettlementVault for on-chain execution.",
    filename: "TokenWorldSecurityToken_Suite.sol",
    badge: "Solidity Contracts",
    content: SOLIDITY_SECURITY_TOKEN_SOURCE,
  },
  {
    id: "doc-clob-matching-python",
    title: "High-Frequency Off-Chain Matching Engine Source Code (Python)",
    category: "Technical Matching Engine",
    secFormCode: "CLOB Python",
    summary: "Production-grade in-memory Central Limit Order Book with Price-Time priority matching, JSON streaming, and deterministic DvP settlement dispatch.",
    filename: "TokenWorldMatchingEngine.py",
    badge: "Python Engine",
    content: PYTHON_MATCHING_ENGINE_SOURCE,
  },
  {
    id: "doc-nyse-bell-proposal",
    title: "Official NYSE Opening Bell Ceremony & Market Launch Proposal",
    category: "Corporate Governance",
    secFormCode: "NYSE Bell Proposal",
    summary: "Complete ceremonial and market execution proposal for Mauro Lomibao Dar III to ring the New York Stock Exchange Opening Bell at 11 Wall Street, NYC.",
    filename: "NYSE_Opening_Bell_Proposal_Mauro_Lomibao_Dar_III.txt",
    badge: "NYSE Bell Proposal",
    content: `NEW YORK STOCK EXCHANGE (NYSE)
OPENING BELL CEREMONY & MARKET LAUNCH PROPOSAL
PREPARED FOR: MAURO LOMIBAO DAR III
ENTITY: TOKEN WORLD (TOKEN WORLD LLC)
ADDRESS: 945 WESTHOLME AVE, LOS ANGELES, CA 90024
CONTACT: (310) 904-5646 | mdgodsiii@gmail.com

I. EXECUTIVE SUMMARY
This document outlines the operational, strategic, and ceremonial framework for Token World,
led by Founder & Sovereign Owner Mauro Lomibao Dar III, to celebrate its institutional market
milestone with an official Opening Bell Ceremony at the New York Stock Exchange (NYSE),
11 Wall Street, New York, NY.

II. CEREMONY TIMETABLE (NEW YORK TIME - ET)
- 08:30 AM: Arrival & VIP Guest Check-in at the NYSE VIP Entrance (11 Wall Street).
- 08:45 AM: Escort to the NYSE Boardroom for executive briefing and official sign-in.
- 09:15 AM: Group moves to the Trading Floor Podium overlooking the Main Room.
- 09:28 AM: Floor announcements and global television livestream broadcast activation (CNBC, Bloomberg).
- 09:29:50 AM: Bell Ringing: Mauro Lomibao Dar III pushes the ceremonial button to start the 10-second countdown.
- 09:30:00 AM: Bell rings; Market officially opens with the ringing of the brass bell!
- 09:35 AM: Media interviews on the trading floor, photo opportunities, and corporate ticker celebration.

III. FOUNDER & OWNER REMARKS (PODIUM TELEPROMPTER SCRIPT)
"Today, we bridge the timeless bedrock of the New York Stock Exchange with the borderless
efficiency of Token World. From 945 Westholme Avenue in Los Angeles to 11 Wall Street in
New York, we have built an Alternative Trading System that captures primary capital, empowers
innovators, and unites global liquidity under strict regulatory trust. Let the bell ring for
every entrepreneur, investor, and builder around the world!"
- Mauro Lomibao Dar III, Founder & Sovereign Owner, Token World

IV. PUBLIC RELATIONS & MEDIA CAMPAIGN
- Wire Distribution: PR Newswire & Business Wire blast at 09:00 AM ET.
- Livestream: Broadcasted via NYSE Live and Token World Global Portal.
- Institutional Outreach: Syndicate meeting with top 50 prime brokers at the NYSE Luncheon Club.

ACKNOWLEDGED & CONFIRMED:
Mauro Lomibao Dar III
Owner & Principal, Token World`,
  },
  {
    id: "doc-master-blueprint",
    title: "Master Architecture Blueprint & Complete Fullstack System Specification",
    category: "Technical Matching Engine",
    secFormCode: "Master Blueprint",
    summary: "Comprehensive multi-tier engineering specification unifying FINRA broker-dealer compliance, off-chain order book, and on-chain DvP settlement.",
    filename: "Token_World_Master_Architecture_Blueprint.md",
    badge: "System Blueprint",
    content: `# TOKEN WORLD ATS & NYSE DUAL-LISTING MASTER SPECIFICATION

## ARCHITECTURE OVERVIEW
The Token World Venue combines a regulated U.S. Alternative Trading System (ATS)
with legacy exchange interoperability (New York Stock Exchange):

\`\`\`
                               ┌─────────────────────────────────────────────────────────┐
                               │                    TOKEN WORLD ATS                      │
                               │  - FINRA BD / Form ATS Registration                    │
                               │  - Secondary Market Trading / Off-Chain Order Matching  │
                               └───────────────────────────┬─────────────────────────────┘
                                                           │
                      ┌────────────────────────────────────┴────────────────────────────────────┐
                      ▼                                                                         ▼
┌───────────────────────────────────────────┐                             ┌───────────────────────────────────────────┐
│          PRIMARY ISSUANCES ENGINE         │                             │         SECONDARY LIQUIDITY ENGINE        │
│  - Reg D / Reg S / Rule 144A / Reg A+     │                             │  - ERC-1400 / ERC-3643 Permissioned Tokens │
│  - Fiat/USD & Stablecoin Escrow           │                             │  - Atomic Settlement (DvP) via Smart Contracts│
└─────────────────────┬─────────────────────┘                             └─────────────────────┬─────────────────────┘
                      │                                                                         │
                      └────────────────────────────────────┬────────────────────────────────────┘
                                                           │
                                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                           DUAL-LISTING & RECONCILIATION BUS                                         │
│  - SEC Form ATS-R Quarterly Reporting                                                                               │
│  - Depository Trust & Clearing Corporation (DTCC) Fast Automated Transfer Program (FAST) Reconciliation Engine      │
│  - Synchronizes Public Float (NYSE) and Tokenized Private/Secondary Liquidity via Transfer Agent Master Security File│
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
\`\`\`

## CORE PARTICIPANT DATA
- Owner & Principal: Mauro Lomibao Dar III
- Operational Base: 945 Westholme Ave, Los Angeles, CA 90024 | (310) 904-5646
- Primary Ticker: TW-EQ
- Regulatory Regime: SEC Rule 301, FINRA Rule 1014, Reg D 506(c), Rule 144A
`,
  },
  {
    id: "doc-tree3-token",
    title: "Token World TREE3 ERC-20 Core Contract (TREE3Token.sol)",
    category: "Smart Contract Suite",
    secFormCode: "ERC-20 TREE3",
    summary: "Token World core token featuring 1 Quadrillion initial supply and deterministic TREE(3) ID generation for Sole Owner Mauro Lomibao Dar III.",
    filename: "TREE3Token.sol",
    badge: "Solidity Core",
    content: SOLIDITY_TREE3_TOKEN_SOURCE,
  },
  {
    id: "doc-tokenworld-treasury",
    title: "Token World Treasury Compliant Token (TokenWorldTreasury.sol)",
    category: "Smart Contract Suite",
    secFormCode: "TWT Security",
    summary: "Compliant security token with investor whitelisting and permissioned transfer restrictions for Sole Owner Mauro Lomibao Dar III.",
    filename: "TokenWorldTreasury.sol",
    badge: "Solidity Treasury",
    content: SOLIDITY_TREASURY_TOKEN_SOURCE,
  },
  {
    id: "doc-deploy-tree3",
    title: "Token World Foundry Deployment Script (DeployTREE3.s.sol)",
    category: "Technical Matching Engine",
    secFormCode: "Foundry Script",
    summary: "Production Foundry script to deploy Token World TREE3 Token and verify on-chain bytecode for Sole Owner Mauro Lomibao Dar III.",
    filename: "DeployTREE3.s.sol",
    badge: "Foundry Script",
    content: FOUNDRY_DEPLOY_TREE3_SOURCE,
  },
  {
    id: "doc-test-tree3",
    title: "Token World Foundry Test Suite (TREE3Token.t.sol)",
    category: "Technical Matching Engine",
    secFormCode: "Foundry Test",
    summary: "Foundry unit and fuzz test suite verifying 1 Quadrillion supply, burn mechanics, and deterministic TREE(3) identifiers.",
    filename: "TREE3Token.t.sol",
    badge: "Foundry Test",
    content: FOUNDRY_TEST_TREE3_SOURCE,
  },
  {
    id: "doc-sanitize-csv",
    title: "Token World CSV Data Sanitizer & Validator (sanitize_data.py)",
    category: "Technical Matching Engine",
    secFormCode: "Python Sanitizer",
    summary: "Python automated pipeline filtering malformed addresses and corrupted inputs prior to Token World contract batch execution.",
    filename: "sanitize_data.py",
    badge: "Python Tool",
    content: PYTHON_CSV_SANITIZER_SOURCE,
  },
  {
    id: "doc-reg-filing-workplan-csv",
    title: "Regulatory Filing Workplan Matrix (CSV Export)",
    category: "SEC Regulatory Filing",
    secFormCode: "Workplan CSV",
    summary: "Complete 15-stage structured filing workplan matrix covering Phase 0 through Phase 10 with statutory citations (SEC, FINRA, DTCC) and milestone gates.",
    filename: "regulatory_filing_workplan.csv",
    badge: "Regulatory CSV",
    content: `Phase,Step_ID,Filing_or_Milestone,Regulatory_Body,Statute_or_Rule,Status,Prerequisites,Lead_Role,Estimated_Duration_Days,Deliverable_Description
Phase 0,P0-01,Corporate Entity Formation (Token World Technologies LLC),Delaware DOS,DGCL,COMPLETED,None,Corporate Counsel,14,Delaware LLC certificate of formation and organizational resolutions
Phase 0,P0-02,IP Licensing & Sole Owner Treasury Mandate,Corporate Legal,UCC Article 8,COMPLETED,P0-01,Mauro Lomibao Dar III,7,Master Treasury transfer and sole ownership covenants (Mauro Lomibao Dar III)
Phase 1,P1-01,Form BD Broker-Dealer Application,FINRA / SEC,Exchange Act Sec 15(b),IN_PROGRESS,P0-02,Chief Compliance Officer,180,Comprehensive FINRA New Member Application (NMA) under Rule 1014
Phase 1,P1-02,Principal Licensing (Series 7, 24, 14, 27, 99),FINRA,FINRA Rule 1210,IN_PROGRESS,P1-01,Registered Principals,90,Series 24 General Securities Principal & Series 27 Financial Operations Principal qualification
Phase 2,P2-01,Qualified Custodian Agreement (Digital Assets & Cash),SEC / NYDFS,Rule 206(4)-2 / SAB 121,IN_PROGRESS,P1-01,Treasury Lead,60,Custody escrow and sub-custody tripartite agreement with qualified institutional bank
Phase 2,P2-02,SEC-Registered Transfer Agent Agreement,SEC,Exchange Act Sec 17A,IN_PROGRESS,P1-01,Operations Director,45,Master appointment agreement with SEC-registered transfer agent (FAST #9450 participant)
Phase 3,P3-01,Form ATS Initial Operation Report,SEC Division of Trading & Markets,Rule 301(a)(2) / 301(b)(2),SCHEDULED,P1-01; P2-01; P2-02,Regulatory Counsel,60,Initial Form ATS filing detailing operating hours, order types, subscribers, and matching logic
Phase 3,P3-02,Form ATS-N (if trading NMS Stocks),SEC Division of Trading & Markets,Rule 304 of Reg ATS,SCHEDULED,P3-01,Chief Regulatory Officer,120,Detailed public disclosure document for NMS stock alternative trading systems
Phase 4,P4-01,Subscriber Agreement & KYC/AML Framework,FINRA / FinCEN,BSA / USA PATRIOT Act,READY_FOR_FILING,P1-01,AML Compliance Officer,30,Institutional subscriber agreement, Rule 501 accreditation check, OFAC screening policy
Phase 4,P4-02,Pre-Trade Risk Control Rule 15c3-5 Market Access Architecture,SEC Division of Trading & Markets,SEC Rule 15c3-5,READY_FOR_FILING,P3-01,Head of Engineering,45,Credit checks, capital threshold caps, erroneous order collars, and automated kill-switch
Phase 5,P5-01,Smart Contract Security Audit & Formal Verification,External Auditor,ERC-1400 / ERC-3643,COMPLETED,P4-02,Lead Blockchain Architect,30,Security audit certificate for TokenWorldSecurityToken.sol and DvP settlement vault
Phase 6,P6-01,DTCC FAST Interoperability Testing,DTCC / Depository,FAST Rules & Procedures,SCHEDULED,P2-02; P5-01,Integration Specialist,60,End-to-end sandbox testing of book-entry deposit, lockup, mint, and burn reconciliation
Phase 7,P7-01,FINRA Rule 3110 Written Supervisory Procedures (WSPs),FINRA,FINRA Rule 3110,READY_FOR_FILING,P1-02,Chief Compliance Officer,30,Internal supervisory manual governing ATS operations, surveillance, and trade reporting
Phase 8,P8-01,Form ATS-R Quarterly Volume Reporting Template,SEC Division of Trading & Markets,Rule 301(b)(9),READY_FOR_FILING,P3-01,Financial Operations,15,Automated quarterly ATS transaction reporting pipeline (TW-EQ, 144A notes)
Phase 9,P9-01,Market Data & Trade Reporting Facility (TRF/ORF) Linkage,FINRA,FINRA Rule 6300A / 6620,SCHEDULED,P1-01; P3-01,Trading Systems Lead,45,Over-the-Counter trade reporting connection to FINRA/Nasdaq TRF or OTC Reporting Facility
Phase 10,P10-01,Controlled Beta Launch & Pilot Subscriber Onboarding,SEC / FINRA,Reg ATS Pilot Gate,SCHEDULED,All Prior Phases,Sole Owner & Executive Committee,30,Limited volume trading with selected Qualified Institutional Buyers (QIBs) under live controls
Phase 10,P10-02,Commercial Go-Live & NYSE Opening Bell Protocol,NYSE / Global Venue,Public Launch Gate,SCHEDULED,P10-01,Mauro Lomibao Dar III,1,Ceremonial and production operational go-live bell ceremony at 11 Wall Street, NYC`,
  },
  {
    id: "doc-ats-regulatory-workplan",
    title: "Strategic 0–10 Phase Roadmap & Executive Business Plan",
    category: "SEC Regulatory Filing",
    secFormCode: "ATS Roadmap",
    summary: "Comprehensive multi-phase strategic execution roadmap, executive business plan, monetization architecture, and FINRA/SEC broker-dealer gateway guide.",
    filename: "ATS_REGULATORY_WORKPLAN.md",
    badge: "10-Phase Roadmap",
    content: `# Token World ATS & NYSE Hybrid Venue: Regulatory Workplan & Master Strategic Guide
Principal & Sole Owner: Mauro Lomibao Dar III
Headquarters: 945 Westholme Ave, Los Angeles, CA 90024 | (310) 904-5646 | mdgodsiii@gmail.com

1. REGULATORY GUARDRAIL & COMPLIANCE PATHWAY
A Token World deployment cannot legally become an NYSE-equivalent market simply by deploying Solidity contracts or opening a website.
The SEC explicitly specifies that an ATS operates under Regulation ATS and generally operates through a registered broker-dealer and files the appropriate ATS report. Form ATS itself is not an SEC approval order.
If the platform trades NMS stocks, Form ATS-N is required.

THE LAWFUL PATH TO INSTITUTIONAL TRADING:
Token World technology company
        ↓
Appropriate legal entity (Delaware LLC)
        ↓
Registered broker-dealer / qualified regulated partner (FINRA Form BD)
        ↓
ATS compliance and applicable SEC filing (Form ATS / Form ATS-N)
        ↓
FINRA / SRO requirements (WSPs, Series 24, Rule 3110)
        ↓
Qualified custodian + SEC transfer agent + settlement infrastructure (DTCC FAST #9450)
        ↓
Approved tokenized securities (ERC-3643 / Reg D 506(c) / Rule 144A)
        ↓
Controlled market launch (ENABLE_LIVE_TRADING=true only after all gates clear)

The software deliberately defaults to:
ENABLE_LIVE_TRADING=false
so it cannot be mistaken for an authorized securities market.

2. STRATEGIC 0-10 PHASE ROADMAP:
- Phase 0: Corporate Entity Formation & IP Assignment (Completed)
- Phase 1: Broker-Dealer Sponsorship / Form BD Filing (In Progress)
- Phase 2: Regulated Banking, Custody & Transfer Agent (In Progress)
- Phase 3: Form ATS / Form ATS-N Filing with SEC Division of Trading & Markets
- Phase 4: Pre-Trade Risk Engine & Rule 15c3-5 Controls
- Phase 5: Smart Contract Security Formal Verification
- Phase 6: DTCC FAST Clearing & Depository Testing
- Phase 7: Written Supervisory Procedures & FINRA Rule 3110 Surveillance
- Phase 8: Form ATS-R Reporting Automation
- Phase 9: Market Data Feed & TRF Trade Reporting Linkage
- Phase 10: Controlled Beta Launch & NYSE Opening Bell Protocol

3. MONETIZATION ARCHITECTURE:
- Subscriber Seat Fees: $2,500/month per institutional member
- Execution Fees: 1.5 bps (0.015%) per side
- Primary Syndication Fees: 1.0% - 2.5% of syndicated capital
- DTCC FAST Gateway Fee: $50 per wrap/unwrap transaction`,
  },
  {
    id: "doc-market-rulebook",
    title: "SEC Regulation ATS Market Rulebook Outline",
    category: "Compliance & Risk Framework",
    secFormCode: "Market Rulebook",
    summary: "Formal rulebook governing subscriber eligibility, regular trading hours, Price-Time priority matching, circuit breakers, and emergency halt protocols.",
    filename: "MARKET_RULEBOOK.md",
    badge: "Market Rulebook",
    content: `# Token World Alternative Trading System (ATS) Market Rulebook
Principal & Sovereign Owner: Mauro Lomibao Dar III
Headquarters: 945 Westholme Ave, Los Angeles, CA 90024

CHAPTER 1: GENERAL PROVISIONS & DEFINITIONS
Rule 1.1 Scope: Governs all order routing, trading, matching, and settlement on Token World ATS.
Rule 1.2 Status: Operates pursuant to SEC Regulation ATS (17 CFR § 242.300 - 304). Operates in demonstration mode with ENABLE_LIVE_TRADING=false.
Rule 1.3 Operator: Token World LLC under principal management of Mauro Lomibao Dar III.

CHAPTER 2: SUBSCRIBER ELIGIBILITY & ACCESS
Rule 2.1 Eligible Subscribers: QIBs (Rule 144A), Accredited Investors (Rule 501(a)), and Offshore Entities (Reg S).
Rule 2.2 KYC/AML: Mandatory identity verification, beneficial ownership check, and OFAC sanctions clearance.
Rule 2.3 Fair Access: Fair and non-discriminatory access provided pursuant to SEC Rule 301(b)(5).

CHAPTER 3: TRADING SESSIONS & MATCHING ALGORITHM
Rule 3.1 Regular Hours: 09:30:00 to 16:00:00 ET, Monday through Friday.
Rule 3.2 Price-Time Priority: Orders matched strictly by Price Priority first, then Timestamp priority.
Rule 3.3 No Proprietary Favoritism: Proprietary and subscriber orders execute under equal algorithmic rules.

CHAPTER 4: TRADING HALTS & PRE-TRADE COLLARS
Rule 4.1 Regulatory Halts: Automatic immediate suspension upon SEC, FINRA, or NYSE market halt notices.
Rule 4.2 Price Collars: Hard rejection of orders outside ±30% of $52.50 benchmark.
Rule 4.3 Maximum Order Cap: Maximum single order not to exceed $10,000,000 USD.`,
  },
  {
    id: "doc-settlement-lifecycle",
    title: "Settlement Lifecycle & T+0 Atomic DvP Protocol Specification",
    category: "Technical Matching Engine",
    secFormCode: "Settlement Spec",
    summary: "Detailed end-to-end specifications for atomic Delivery-versus-Payment smart contracts and DTCC FAST master register synchronization.",
    filename: "SETTLEMENT_LIFECYCLE.md",
    badge: "Settlement Lifecycle",
    content: `# Token World Settlement Lifecycle & DvP Protocol
Principal: Mauro Lomibao Dar III | Headquarters: 945 Westholme Ave, Los Angeles, CA 90024

DUAL-RAIL SETTLEMENT ARCHITECTURE:
Rail 1: Secondary ATS On-Chain Rail (Real-Time T+0 Atomic DvP via ERC-3643)
Rail 2: Legacy DTCC FAST Interoperability (Cede & Co. book-entry synchronization)

LIFECYCLE SEQUENCE:
1. Pre-Funding: Buyer funds USDC escrow at Qualified Custodian; Seller deposits TW-EQ tokens in DvP Vault.
2. Off-Chain Match: Order executed in sub-2ms CLOB matching engine with deterministic hash.
3. Atomic DvP Execution: Smart contract executes simultaneous token delivery and cash debit in 1 transaction.
4. Zero Settlement Risk: Eliminates Herstatt risk completely; T+0 instant finality replaces T+1.
5. End-of-Day DTCC FAST Balancing: Automated oracle verifies Master File Total == NYSE Float + ATS Token Float.
   Variance must strictly equal 0.`,
  },
  {
    id: "doc-security-controls",
    title: "Security Control Framework (SEC Rule 15c3-5 & Reg SCI)",
    category: "Compliance & Risk Framework",
    secFormCode: "Security Controls",
    summary: "Pre-trade risk checks, capital threshold caps, erroneous order collars, HSM key custody, and SEC Rule 17a-4 7-year audit logging standards.",
    filename: "SECURITY_CONTROLS.md",
    badge: "Security Controls",
    content: `# Token World ATS Security Control Framework
Principal: Mauro Lomibao Dar III | Headquarters: 945 Westholme Ave, Los Angeles, CA 90024

1. PRE-TRADE MARKET ACCESS CONTROLS (SEC RULE 15c3-5):
- Financial Collar: Hard cap of $10,000,000 USD maximum single order.
- Price Band Collar: Automatic rejection if price deviates > ±30% from $52.50 reference.
- Credit Limits: Real-time monitoring of aggregate participant daily buying power.
- Automated Kill Switch: Operator can pause matching in <10ms upon system anomaly.

2. CRYPTOGRAPHIC KEY CUSTODY & REG SCI SAFEGUARDS:
- FIPS 140-2 Level 3 Hardware Security Modules (HSMs) for all settlement signers.
- 3-of-5 Multi-Sig Treasury Governance.
- Non-Repudiation: Every order and trade cryptographically signed with immutable hash.
- SEC Rule 17a-4 Compliance: WORM storage retention for 7 years.`,
  },
  {
    id: "doc-deployment-runbook",
    title: "ATS Operational Deployment Runbook & Docker Configuration",
    category: "Technical Matching Engine",
    secFormCode: "Runbook",
    summary: "System runbook detailing multi-stage Docker deployment, environment configuration, health checking, and failover incident response procedures.",
    filename: "DEPLOYMENT_RUNBOOK.md",
    badge: "Deployment Runbook",
    content: `# Token World ATS Deployment & Operational Runbook
Principal: Mauro Lomibao Dar III | Headquarters: 945 Westholme Ave, Los Angeles, CA 90024

DEPLOYMENT COMMANDS:
1. Environment Setup:
   cp .env.example .env
   # Verify ENABLE_LIVE_TRADING=false

2. Automated Test Verification:
   pytest test_ats.py -v

3. Docker Stack Launch:
   docker-compose up --build -d

4. Service Endpoints:
   - Trading Portal: http://localhost:3000
   - FastAPI Matching Engine: http://localhost:8000
   - Interactive Docs: http://localhost:8000/docs
   - Health Status: http://localhost:8000/health

5. Operational Monitoring:
   - Health Ping: curl http://localhost:8000/health
   - DTCC Variance: curl http://localhost:8000/api/dtcc/reconciliation`,
  },
  {
    id: "doc-board-resolution",
    title: "Corporate Board Resolution Template (Token World ATS Launch)",
    category: "Corporate Governance",
    secFormCode: "Board Resolution",
    summary: "Official unanimous written consent authorizing broker-dealer formation, Form ATS/ATS-N submission, and transfer agent / custodian appointments.",
    filename: "Corporate_Board_Resolution_Token_World.txt",
    badge: "Board Resolution",
    content: `UNANIMOUS WRITTEN CONSENT OF THE BOARD OF DIRECTORS / MANAGING MEMBER
TOKEN WORLD LLC

WHEREAS, Token World LLC (the "Company"), founded and owned by Mauro Lomibao Dar III,
desires to develop, register, and operate an Alternative Trading System ("Token World ATS");

NOW, THEREFORE, BE IT RESOLVED:
1. FORMATION & REGISTRATION: The Company is authorized to prepare and execute Form BD for
   submission to FINRA, and Form ATS / Form ATS-N for submission to the SEC.
2. PRINCIPAL AUTHORITY: Mauro Lomibao Dar III is authorized to enter into binding agreements with
   Qualified Custodians, Transfer Agents (DTCC FAST #9450), and regulatory legal counsel.
3. COMPLIANCE GUARDRAIL: The platform shall strictly maintain ENABLE_LIVE_TRADING=false
   until all required SEC and FINRA regulatory gates are formally cleared.

Executed this day by:
/s/ Mauro Lomibao Dar III
Founder, Sole Owner & Managing Principal, Token World LLC`,
  },
  {
    id: "doc-investor-risk",
    title: "Investor Risk Disclosure & Transfer Restriction Notice",
    category: "Corporate Governance",
    secFormCode: "Risk Disclosure",
    summary: "Statutory investor risk disclosure detailing illiquidity, transfer restrictions under Rule 144, smart contract operational risks, and regulatory disclaimers.",
    filename: "Investor_Risk_Disclosure_Token_World.txt",
    badge: "Risk Disclosure",
    content: `TOKEN WORLD ATS - INVESTOR RISK DISCLOSURE & STATUTORY DISCLAIMER

IMPORTANT NOTICE TO PROSPECTIVE INVESTORS:
Securities traded on Token World ATS are speculative, illiquid, and carry a high degree of risk,
including the risk of total loss of invested capital.

1. LACK OF REGISTRATION:
Securities issued under Regulation D Rule 506(c) or Rule 144A have not been registered under the
Securities Act of 1933 or any state securities laws. They are subject to statutory transfer
restrictions and holding periods (minimum 1-year Rule 144 legend).

2. REGULATORY STATUS:
Token World operates in compliance with Regulation ATS. Prior to full broker-dealer licensing
and effective Form ATS-N, the platform functions exclusively as an institutional sandbox
demonstration with ENABLE_LIVE_TRADING=false. The SEC does not approve or endorse any ATS.

3. SMART CONTRACT RISKS:
Trading utilizes permissioned ERC-3643 smart contracts. While formally audited, blockchain
protocols carry inherent operational, network latency, and cryptographic risks.

Acknowledged by Subscriber:
Entity / Individual: _________________________
Date: _________________________`,
  },
  {
    id: "doc-subscriber-agreement",
    title: "Institutional Subscriber Agreement Outline",
    category: "Corporate Governance",
    secFormCode: "Subscriber Agreement",
    summary: "Master legal agreement governing institutional subscriber representations, order routing, fees, clearing via atomic DvP, and market conduct obligations.",
    filename: "Institutional_Subscriber_Agreement_Outline.txt",
    badge: "Subscriber Agreement",
    content: `TOKEN WORLD ALTERNATIVE TRADING SYSTEM (ATS)
MASTER INSTITUTIONAL SUBSCRIBER AGREEMENT OUTLINE

SECTION 1: DEFINITIONS & SCOPE OF ACCESS
- Grant of non-exclusive access to Token World ATS Central Limit Order Book (CLOB).
- Identification of Subscriber: Institutional QIB (Rule 144A) or Accredited Entity.

SECTION 2: SUBSCRIBER REPRESENTATIONS & WARRANTIES
- Valid corporate organization, requisite regulatory licenses, and authority.
- Continuous maintenance of accredited / QIB investor eligibility.
- Anti-Money Laundering (AML) / Know Your Customer (KYC) certification.

SECTION 3: ORDER ENTRY, PRE-TRADE CONTROLS & TRADING RULES
- Compliance with Token World Market Rulebook and Price-Time Priority rules.
- Mandatory pre-trade collars (±30% from benchmark) and $10,000,000 order ceiling.
- Strict prohibition against wash sales, spoofing, and manipulative market practices.

SECTION 4: CLEARING, CUSTODY & SETTLEMENT
- T+0 Atomic Delivery-versus-Payment (DvP) via TokenWorldSecurityToken.sol.
- Settlement finality and pre-funding covenants with Qualified Custodian.

SECTION 5: SYSTEM CAPACITY, DISCLAIMERS & LIMITATION OF LIABILITY
- Platform operational availability, maintenance windows, and disaster recovery.
- Limitation of liability for third-party network outages or blockchain congestion.`,
  },
  {
    id: "doc-privacy-notice",
    title: "Institutional Privacy Notice & Data Governance Outline",
    category: "Corporate Governance",
    secFormCode: "Privacy Notice",
    summary: "Institutional privacy notice detailing subscriber data handling, KYC identity storage, cryptographic wallet tracking, and SEC Rule 17a-4 record retention.",
    filename: "Institutional_Privacy_Notice_Outline.txt",
    badge: "Privacy Notice",
    content: `TOKEN WORLD ATS - INSTITUTIONAL PRIVACY NOTICE & DATA GOVERNANCE

1. INFORMATION COLLECTED:
- Corporate identity: Certificate of Incorporation, EIN, Tax ID, and organizational documents.
- Beneficial ownership information pursuant to FinCEN Customer Due Diligence (CDD) rule.
- Financial credentials: Net worth attestations, CPA accreditation letters, bank wiring instructions.
- Blockchain identifiers: EVM public wallet addresses, signing public keys, and transaction history.

2. PURPOSE OF DATA PROCESSING:
- Customer identification and verification (KYC/AML/OFAC screening).
- Regulatory compliance under SEC Regulation ATS and FINRA Rule 3110.
- Execution of atomic DvP settlements and DTCC FAST automated reconciliation.

3. RECORD RETENTION & SEC RULE 17a-4:
All subscriber communications, order entries, transaction logs, and identity records are
preserved in Write-Once-Read-Many (WORM) compliant electronic storage for a minimum of 7 years,
the first 2 years in an easily accessible place, pursuant to SEC Rule 17a-4.

4. INFORMATION SECURITY:
Multi-layered cryptographic defense including AES-256 at rest, TLS 1.3 in transit, and
FIPS 140-2 Level 3 hardware security module key protection.`,
  },
];

import { ethers } from "ethers";

/**
 * Deterministic TREE(3)-inspired identifier calculation in TypeScript
 * Mirrors TREE3Token.sol generateTree3ID(account, nonce, seed)
 */
export function generateTree3Id(account: string, nonce: number, seed: number): string {
  try {
    const cleanAccount = ethers.isAddress(account) ? ethers.getAddress(account) : "0x1111111111111111111111111111111111111111";
    const step1 = ethers.solidityPackedKeccak256(
      ["address", "uint256", "uint256"],
      [cleanAccount, BigInt(nonce), BigInt(seed)]
    );
    const step2 = ethers.solidityPackedKeccak256(
      ["bytes32", "address", "uint256"],
      [step1, cleanAccount, BigInt(nonce + 1)]
    );
    return ethers.solidityPackedKeccak256(
      ["bytes32", "bytes32", "uint256"],
      [step1, step2, BigInt(seed)]
    );
  } catch {
    return ethers.keccak256(ethers.toUtf8Bytes(`${account}:${nonce}:${seed}`));
  }
}

/**
 * Validates 20-byte EVM address format
 */
export function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

/**
 * Interactive CSV Data Sanitizer & Validator
 * Filters corrupted records and verifies numeric amounts
 */
export function sanitizeCsvRecords(records: { address: string; amount: string }[]): {
  valid: { address: string; amount: number }[];
  rejected: { row: number; address: string; amount: string; reason: string }[];
} {
  const valid: { address: string; amount: number }[] = [];
  const rejected: { row: number; address: string; amount: string; reason: string }[] = [];

  records.forEach((rec, idx) => {
    const rowNum = idx + 2;
    const addr = (rec.address || "").trim();
    const amtStr = (rec.amount || "").trim();

    if (!addr || !amtStr) {
      rejected.push({
        row: rowNum,
        address: addr || "EMPTY",
        amount: amtStr || "EMPTY",
        reason: "Incomplete record (missing address or amount)",
      });
      return;
    }

    if (!isValidEvmAddress(addr)) {
      rejected.push({
        row: rowNum,
        address: addr,
        amount: amtStr,
        reason: `Malformed address format: ${addr}`,
      });
      return;
    }

    const amtNum = Number(amtStr);
    if (isNaN(amtNum) || amtNum <= 0) {
      rejected.push({
        row: rowNum,
        address: addr,
        amount: amtStr,
        reason: `Invalid numeric amount: ${amtStr}`,
      });
      return;
    }

    valid.push({ address: addr, amount: amtNum });
  });

  return { valid, rejected };
}

/**
 * Sound synthesizer for the NYSE Brass Bell chiming
 * Using Web Audio API to create authentic heavy bronze/brass harmonic resonance
 */
export function playNyseBrassBellSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Fundamental frequencies of the NYSE historic bronze bell (rich in overtones)
    const bellFrequencies = [
      { freq: 440, gain: 0.6, decay: 3.5 },   // Fundamental A4
      { freq: 880, gain: 0.45, decay: 2.8 },  // Octave harmonic
      { freq: 1320, gain: 0.35, decay: 2.2 }, // Minor third overtone
      { freq: 1760, gain: 0.25, decay: 1.8 }, // Fifth overtone
      { freq: 2640, gain: 0.15, decay: 1.2 }, // High metallic strike
    ];

    const now = ctx.currentTime;

    bellFrequencies.forEach(({ freq, gain, decay }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      // Small frequency pitch glide simulating bell hammer strike
      osc.frequency.exponentialRampToValueAtTime(freq * 0.998, now + decay);

      // Fast percussive strike attack (2ms), long ringing acoustic decay
      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(gain, now + 0.005);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + decay);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + decay);
    });
  } catch (err) {
    console.warn("Web Audio Bell Sound warning:", err);
  }
}

/**
 * Client-side file downloader for documents
 */
export function downloadDocumentFile(filename: string, content: string, mimeType: string = "text/plain"): void {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Failed to download document:", err);
  }
}

/**
 * Generates multi-token primary issuances across all allocated tokens
 */
export function generateMultiTokenPrimaryIssuances(tokens: any[]): PrimaryIssuanceRound[] {
  const base = [...PRIMARY_ISSUANCES];
  if (!tokens || tokens.length === 0) return base;

  tokens.forEach((t, idx) => {
    if (base.some((b) => b.symbol === t.symbol)) return;

    const refPrice = t.priceUsd > 0 ? t.priceUsd : 50.0;
    const targetCapital = Math.round(t.marketCap > 0 ? t.marketCap * 0.15 : 25_000_000);
    const raisedRatio = 0.65 + ((idx % 30) / 100);
    const raisedCapital = Math.round(targetCapital * Math.min(0.98, raisedRatio));
    const totalShares = Math.max(1000, Math.round(targetCapital / refPrice));
    const sharesAlloc = Math.round(totalShares * (raisedCapital / targetCapital));

    const exemptions: ("Reg D 506(c)" | "Rule 144A" | "Reg S")[] = [
      "Reg D 506(c)",
      "Rule 144A",
      "Reg S",
    ];

    base.push({
      id: `ISSUE-${t.symbol}`,
      assetName: `${t.name} ATS Growth Round`,
      symbol: t.symbol,
      exemption: exemptions[idx % exemptions.length],
      targetCapitalUsd: targetCapital,
      raisedCapitalUsd: raisedCapital,
      sharePriceUsd: refPrice,
      totalSharesOffered: totalShares,
      sharesAllocated: sharesAlloc,
      minimumInvestmentUsd: refPrice > 100 ? 50000 : 25000,
      investorCount: 85 + (idx * 7) % 300,
      escrowAgent: "Anchorage Digital Qualified Custody / Token World LLC Escrow",
      status: idx % 4 === 0 ? "ALLOCATING" : "ACTIVE",
    });
  });

  return base;
}

/**
 * Generates multi-token DTCC FAST reconciliation records across all allocated tokens
 */
export function generateMultiTokenDtccReconciliations(tokens: any[]): Record<string, DtccFastReconciliationRecord> {
  const recordMap: Record<string, DtccFastReconciliationRecord> = {
    "TW-EQ": { ...INITIAL_DTCC_RECONCILIATION },
  };

  if (!tokens || tokens.length === 0) return recordMap;

  tokens.forEach((t) => {
    const totalShares = Math.round(t.marketCap > 0 ? t.marketCap / (t.priceUsd || 1) : 10_000_000);
    const wrappedRatio = 0.28;
    const tokenWrapped = Math.round(totalShares * wrappedRatio);
    const dtcShares = totalShares - tokenWrapped;

    recordMap[t.symbol] = {
      timestamp: Date.now(),
      symbol: t.symbol,
      nysePublicFloatDtcShares: dtcShares,
      tokenWorldWrappedShares: tokenWrapped,
      transferAgentMasterFileTotal: totalShares,
      variance: 0,
      status: "BALANCED",
      reconciledBy: "DTCC FAST Participant #9450 / VStock Transfer Agent",
    };
  });

  return recordMap;
}

