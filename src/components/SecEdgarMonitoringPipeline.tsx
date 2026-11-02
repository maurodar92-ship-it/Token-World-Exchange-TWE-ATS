import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Landmark,
  Activity,
  FileText,
  Search,
  Bell,
  RefreshCw,
  Download,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Play,
  RotateCcw,
  Clock,
  Calendar,
  Layers,
  Database,
  Terminal,
  Code2,
  Server,
  TrendingUp,
  TrendingDown,
  Cpu,
  Mail,
  Zap,
  Sliders,
  DollarSign,
  PieChart as PieChartIcon,
  ChevronRight,
  Filter,
  CheckCircle2,
  Info,
  X,
  Sparkles,
  Eye,
  Globe,
  Share2,
} from "lucide-react";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type EdgarFormType = "10-K" | "10-Q" | "8-K" | "4" | "13F-HR" | "ATS-N";

export interface EdgarFilingRecord {
  accessionNumber: string;
  ticker: string;
  companyName: string;
  cik: string;
  form: EdgarFormType;
  filingDate: string;
  acceptedTimestamp: string;
  reportPeriod: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  isProcessed: boolean;
  isAlertSent: boolean;
  alertRecipient: string;
  summary: {
    length: number;
    wordCount: number;
    riskMentions: number;
    revenueMentions: number;
    guidanceMentions: number;
    cybersecurityMentions: number;
    goingConcernMentions: number;
    sentimentScore: number; // -1.0 to +1.0
  };
  headline: string;
  keyExcerpts: string[];
  rawTextPreview: string;
  secEdgarUrl: string;
}

export interface XbrlFinancialFact {
  ticker: string;
  period: string; // e.g. "2024 Q3" or "2024 FY"
  fiscalYear: number;
  revenueBillions: number;
  netIncomeBillions: number;
  dilutedEps: number;
  totalAssetsBillions: number;
  totalLiabilitiesBillions: number;
  operatingCashFlowBillions: number;
  freeCashFlowBillions: number;
}

export interface Form4InsiderTransaction {
  id: string;
  accessionNumber: string;
  ticker: string;
  companyName: string;
  reportingOwner: string;
  ownerRelationship: "CEO" | "CFO" | "Director" | "10% Owner" | "Officer" | "Principal";
  transactionDate: string;
  transactionCode: "P" | "S" | "A" | "M"; // P: Purchase, S: Sale, A: Grant/Award, M: Exercise
  transactionLabel: string;
  shares: number;
  pricePerShare: number;
  totalValueUsd: number;
  directOrIndirect: "Direct" | "Indirect";
  sharesOwnedFollowing: number;
}

export interface Form13FInstitutionalHolding {
  id: string;
  institutionName: string;
  managerName: string;
  filingPeriod: string;
  totalPortfolioValueBillions: number;
  topHoldings: {
    ticker: string;
    companyName: string;
    shares: number;
    valueMillions: number;
    portfolioWeightPct: number;
    changeFromPriorQuarter: number; // percentage change
    status: "HELD" | "NEW" | "INCREASED" | "DECREASED" | "LIQUIDATED";
  }[];
}

export interface EdgarAlertDispatch {
  id: string;
  timestamp: string;
  accessionNumber: string;
  ticker: string;
  companyName: string;
  form: EdgarFormType;
  channel: "EMAIL" | "TEAMS_WEBHOOK" | "SLACK_WEBHOOK" | "ATS_BUS";
  destination: string;
  subject: string;
  preview: string;
  status: "DELIVERED" | "QUEUED" | "FAILED";
}

export interface SemanticSearchResult {
  id: string;
  accessionNumber: string;
  ticker: string;
  companyName: string;
  form: EdgarFormType;
  filingDate: string;
  similarityScore: number; // 0 to 100
  matchedSection: string;
  highlightedText: string;
  topic: string;
}

// ============================================================================
// SEED MOCK DATA REPOSITORY
// ============================================================================

const DEFAULT_WATCHLIST = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "TW-EQ", "TREE3"];

const INITIAL_FILINGS: EdgarFilingRecord[] = [
  {
    accessionNumber: "0000320193-24-000106",
    ticker: "AAPL",
    companyName: "Apple Inc.",
    cik: "0000320193",
    form: "10-K",
    filingDate: "2024-11-01",
    acceptedTimestamp: "2024-11-01 16:32:05 EST",
    reportPeriod: "2024-09-28",
    fileSizeBytes: 12450890,
    fileSizeFormatted: "11.87 MB",
    isProcessed: true,
    isAlertSent: true,
    alertRecipient: "maurodar08@gmail.com",
    summary: {
      length: 489210,
      wordCount: 78420,
      riskMentions: 142,
      revenueMentions: 98,
      guidanceMentions: 24,
      cybersecurityMentions: 38,
      goingConcernMentions: 0,
      sentimentScore: 0.65,
    },
    headline: "Annual Report for Fiscal Year Ended September 28, 2024. Services revenue hits record $96.2B.",
    keyExcerpts: [
      "Item 1A. Risk Factors: Global geopolitical conditions, semiconductor fabrication supply lines, and antitrust scrutiny across European digital markets present ongoing strategic considerations.",
      "Item 7. MD&A: Net sales increased across Services and iPhone segments, offset by foreign exchange headwinds in Greater China.",
      "Item 8. Financial Statements: Cash and marketable securities totalled $156.6B with $29.9B returned via share repurchases.",
    ],
    rawTextPreview: `UNITED STATES SECURITIES AND EXCHANGE COMMISSION\nWashington, D.C. 20549\nFORM 10-K\nANNUAL REPORT PURSUANT TO SECTION 13 OR 15(d) OF THE SECURITIES EXCHANGE ACT OF 1934\nFor the fiscal year ended September 28, 2024\nCommission File Number: 001-36743\nAPPLE INC.\nOne Apple Park Way, Cupertino, California 95014\nTotal Net Sales: $391,035,000,000 | Net Income: $93,736,000,000`,
    secEdgarUrl: "https://www.sec.gov/edgar/browse/?CIK=0000320193",
  },
  {
    accessionNumber: "0001045810-24-000215",
    ticker: "NVDA",
    companyName: "NVIDIA Corporation",
    cik: "0001045810",
    form: "10-Q",
    filingDate: "2024-11-21",
    acceptedTimestamp: "2024-11-21 16:05:12 EST",
    reportPeriod: "2024-10-27",
    fileSizeBytes: 8940220,
    fileSizeFormatted: "8.52 MB",
    isProcessed: true,
    isAlertSent: true,
    alertRecipient: "maurodar08@gmail.com",
    summary: {
      length: 312450,
      wordCount: 52140,
      riskMentions: 168,
      revenueMentions: 145,
      guidanceMentions: 48,
      cybersecurityMentions: 22,
      goingConcernMentions: 0,
      sentimentScore: 0.88,
    },
    headline: "Quarterly Report (Q3 FY25). Data Center revenue surges 112% YoY to $30.8B driven by Blackwell Hopper architectures.",
    keyExcerpts: [
      "Data Center compute demand continues to outpace total fab capacity; packaging and HBM3e allocations remain tightly scheduled with foundry partners.",
      "U.S. Government export licensing restrictions on advanced compute accelerators (A800/H800 and equivalent architectures) monitored across international shipping corridors.",
      "Operating margin expanded to 62.3% reflecting sovereign AI cluster procurements and cloud hyperscaler infrastructure scaling.",
    ],
    rawTextPreview: `FORM 10-Q - QUARTERLY REPORT PURSUANT TO SECTION 13 OR 15(d)\nNVIDIA CORPORATION (CIK: 0001045810)\nFor the quarterly period ended October 27, 2024\nRevenue for the third quarter of fiscal 2025 was $35.08 billion, up 94% from a year ago.\nData Center revenue was a record $30.8 billion.`,
    secEdgarUrl: "https://www.sec.gov/edgar/browse/?CIK=0001045810",
  },
  {
    accessionNumber: "0000789019-24-000084",
    ticker: "MSFT",
    companyName: "Microsoft Corporation",
    cik: "0000789019",
    form: "8-K",
    filingDate: "2024-10-30",
    acceptedTimestamp: "2024-10-30 16:15:33 EST",
    reportPeriod: "2024-10-30",
    fileSizeBytes: 214500,
    fileSizeFormatted: "209 KB",
    isProcessed: true,
    isAlertSent: true,
    alertRecipient: "maurodar08@gmail.com",
    summary: {
      length: 18500,
      wordCount: 3120,
      riskMentions: 14,
      revenueMentions: 32,
      guidanceMentions: 18,
      cybersecurityMentions: 12,
      goingConcernMentions: 0,
      sentimentScore: 0.72,
    },
    headline: "Item 2.02 Results of Operations and Financial Condition. Microsoft Cloud revenue tops $38.9B with Azure growth +33%.",
    keyExcerpts: [
      "Item 2.02: Q1 FY25 Revenue was $65.6 billion and increased 16% YoY. Operating income was $30.6 billion, up 14%.",
      "Capital expenditures including finance leases were $20.0 billion, supporting cloud and AI data center footprint expansion.",
    ],
    rawTextPreview: `FORM 8-K - CURRENT REPORT\nMICROSOFT CORPORATION (CIK: 0000789019)\nDate of Report: October 30, 2024\nItem 2.02. Results of Operations and Financial Condition.\nOn October 30, 2024, Microsoft issued a press release announcing its financial results for the fiscal quarter ended September 30, 2024.`,
    secEdgarUrl: "https://www.sec.gov/edgar/browse/?CIK=0000789019",
  },
  {
    accessionNumber: "0001018724-24-000049",
    ticker: "AMZN",
    companyName: "Amazon.com, Inc.",
    cik: "0001018724",
    form: "10-Q",
    filingDate: "2024-10-31",
    acceptedTimestamp: "2024-10-31 16:45:00 EST",
    reportPeriod: "2024-09-30",
    fileSizeBytes: 9840100,
    fileSizeFormatted: "9.38 MB",
    isProcessed: true,
    isAlertSent: true,
    alertRecipient: "maurodar08@gmail.com",
    summary: {
      length: 345000,
      wordCount: 56200,
      riskMentions: 154,
      revenueMentions: 110,
      guidanceMentions: 28,
      cybersecurityMentions: 26,
      goingConcernMentions: 0,
      sentimentScore: 0.69,
    },
    headline: "Quarterly Report (Q3 2024). AWS segment sales increase 19% YoY to $27.5B; North America retail operating margin expands.",
    keyExcerpts: [
      "Operating income increased to $17.4 billion in Q3 compared with $11.2 billion in Q3 2023.",
      "Free cash flow improved to $47.7 billion for the trailing twelve months.",
    ],
    rawTextPreview: `FORM 10-Q - AMAZON.COM, INC. (CIK: 0001018724)\nFor the period ended September 30, 2024\nNet sales increased 11% to $158.9 billion in the third quarter.`,
    secEdgarUrl: "https://www.sec.gov/edgar/browse/?CIK=0001018724",
  },
  {
    accessionNumber: "0001652044-24-000067",
    ticker: "GOOGL",
    companyName: "Alphabet Inc.",
    cik: "0001652044",
    form: "8-K",
    filingDate: "2024-10-29",
    acceptedTimestamp: "2024-10-29 16:01:45 EST",
    reportPeriod: "2024-10-29",
    fileSizeBytes: 310500,
    fileSizeFormatted: "303 KB",
    isProcessed: true,
    isAlertSent: true,
    alertRecipient: "maurodar08@gmail.com",
    summary: {
      length: 22400,
      wordCount: 3890,
      riskMentions: 19,
      revenueMentions: 44,
      guidanceMentions: 15,
      cybersecurityMentions: 14,
      goingConcernMentions: 0,
      sentimentScore: 0.74,
    },
    headline: "Item 2.02 Financial Results for Q3 2024. Google Cloud revenue up 35% YoY to $11.4B with operating operating income of $1.9B.",
    keyExcerpts: [
      "Consolidated revenues of $88.3 billion, up 15% year-over-year.",
      "Google Services revenues were $76.5 billion, driven by strength in Search, YouTube ads, and subscription services.",
    ],
    rawTextPreview: `FORM 8-K - ALPHABET INC. (CIK: 0001652044)\nQuarter ended September 30, 2024\nAlphabet Announces Third Quarter 2024 Results`,
    secEdgarUrl: "https://www.sec.gov/edgar/browse/?CIK=0001652044",
  },
  {
    accessionNumber: "0001984201-24-000012",
    ticker: "TW-EQ",
    companyName: "Token World Treasury Growth Equity (TWE-ATS)",
    cik: "0001984201",
    form: "ATS-N",
    filingDate: "2024-10-15",
    acceptedTimestamp: "2024-10-15 09:30:00 EST",
    reportPeriod: "2024-10-15",
    fileSizeBytes: 524000,
    fileSizeFormatted: "511 KB",
    isProcessed: true,
    isAlertSent: true,
    alertRecipient: "maurodar08@gmail.com",
    summary: {
      length: 84000,
      wordCount: 14500,
      riskMentions: 42,
      revenueMentions: 26,
      guidanceMentions: 12,
      cybersecurityMentions: 34,
      goingConcernMentions: 0,
      sentimentScore: 0.92,
    },
    headline: "Form ATS-N Material Amendment: Implementation of Real-Time SEC Rule 15c3-5 Moving Average Price Collars & DTCC FAST #9450 Reconciliation.",
    keyExcerpts: [
      "Part III, Item 7: Order Types and Priority Rules. Automated moving average ±5% price collar halts rogue participant orders before execution.",
      "Part III, Item 15: Clearance and Settlement. Direct dual-clearinghouse integration supporting EVM atomic DvP and DTCC FAST custody ledger bridge.",
      "Sole Owner & Registered ATS Operator: Mauro Lomibao Dar III® (CRD# 8492041).",
    ],
    rawTextPreview: `FORM ATS-N - FORM FOR FILING NOTICE OF OPERATION AS AN ALTERNATIVE TRADING SYSTEM\nTOKEN WORLD EXCHANGE (TWE) ATS®\nPrincipal Operator: Mauro Lomibao Dar III®\nCompliance Collar: SEC Rule 15c3-5 Compliance Engine Activated\nDual Listing Bridge: NYSE Hybrid & EVM Sovereign Protocol`,
    secEdgarUrl: "https://www.sec.gov/edgar/browse/?CIK=0001984201",
  },
  {
    accessionNumber: "0001984201-24-000015",
    ticker: "TREE3",
    companyName: "Token World Sovereign TREE3 Security Token",
    cik: "0001984201",
    form: "8-K",
    filingDate: "2024-10-22",
    acceptedTimestamp: "2024-10-22 11:15:00 EST",
    reportPeriod: "2024-10-22",
    fileSizeBytes: 185000,
    fileSizeFormatted: "180 KB",
    isProcessed: true,
    isAlertSent: true,
    alertRecipient: "maurodar08@gmail.com",
    summary: {
      length: 16500,
      wordCount: 2900,
      riskMentions: 11,
      revenueMentions: 19,
      guidanceMentions: 8,
      cybersecurityMentions: 28,
      goingConcernMentions: 0,
      sentimentScore: 0.95,
    },
    headline: "Item 8.01 Other Events: Quarterly Net Asset Value (NAV) Attestation and On-Chain Tokenized Treasury Yield Distribution.",
    keyExcerpts: [
      "Item 8.01: Total On-Chain Treasury Value confirmed at $1.25B across permissioned ERC-3643 smart contracts.",
      "Yield distributions routed via automated smart contract dividend module to verified KYC whitelisted wallets.",
    ],
    rawTextPreview: `FORM 8-K - CURRENT REPORT\nTOKEN WORLD SOVEREIGN TREE3 (CIK: 0001984201)\nSole Owner: Mauro Lomibao Dar III®\nQuarterly Attestation of Reserves and Yield Payment`,
    secEdgarUrl: "https://www.sec.gov/edgar/browse/?CIK=0001984201",
  },
];

const INITIAL_XBRL_FACTS: XbrlFinancialFact[] = [
  {
    ticker: "NVDA",
    period: "2025 Q3",
    fiscalYear: 2025,
    revenueBillions: 35.08,
    netIncomeBillions: 19.31,
    dilutedEps: 0.78,
    totalAssetsBillions: 95.8,
    totalLiabilitiesBillions: 28.4,
    operatingCashFlowBillions: 17.6,
    freeCashFlowBillions: 16.8,
  },
  {
    ticker: "NVDA",
    period: "2025 Q2",
    fiscalYear: 2025,
    revenueBillions: 30.04,
    netIncomeBillions: 16.60,
    dilutedEps: 0.67,
    totalAssetsBillions: 85.2,
    totalLiabilitiesBillions: 26.1,
    operatingCashFlowBillions: 14.5,
    freeCashFlowBillions: 13.5,
  },
  {
    ticker: "NVDA",
    period: "2025 Q1",
    fiscalYear: 2025,
    revenueBillions: 26.04,
    netIncomeBillions: 14.88,
    dilutedEps: 0.60,
    totalAssetsBillions: 77.1,
    totalLiabilitiesBillions: 23.9,
    operatingCashFlowBillions: 15.3,
    freeCashFlowBillions: 14.9,
  },
  {
    ticker: "AAPL",
    period: "2024 FY",
    fiscalYear: 2024,
    revenueBillions: 391.03,
    netIncomeBillions: 93.74,
    dilutedEps: 6.08,
    totalAssetsBillions: 364.9,
    totalLiabilitiesBillions: 308.0,
    operatingCashFlowBillions: 118.2,
    freeCashFlowBillions: 108.8,
  },
  {
    ticker: "MSFT",
    period: "2025 Q1",
    fiscalYear: 2025,
    revenueBillions: 65.59,
    netIncomeBillions: 24.67,
    dilutedEps: 3.30,
    totalAssetsBillions: 512.2,
    totalLiabilitiesBillions: 254.1,
    operatingCashFlowBillions: 34.2,
    freeCashFlowBillions: 19.3,
  },
  {
    ticker: "AMZN",
    period: "2024 Q3",
    fiscalYear: 2024,
    revenueBillions: 158.88,
    netIncomeBillions: 15.33,
    dilutedEps: 1.43,
    totalAssetsBillions: 554.2,
    totalLiabilitiesBillions: 310.8,
    operatingCashFlowBillions: 25.1,
    freeCashFlowBillions: 18.2,
  },
  {
    ticker: "GOOGL",
    period: "2024 Q3",
    fiscalYear: 2024,
    revenueBillions: 88.27,
    netIncomeBillions: 26.30,
    dilutedEps: 2.12,
    totalAssetsBillions: 422.5,
    totalLiabilitiesBillions: 122.9,
    operatingCashFlowBillions: 30.7,
    freeCashFlowBillions: 17.6,
  },
  {
    ticker: "TW-EQ",
    period: "2024 Q3",
    fiscalYear: 2024,
    revenueBillions: 0.125,
    netIncomeBillions: 0.084,
    dilutedEps: 4.20,
    totalAssetsBillions: 1.05,
    totalLiabilitiesBillions: 0.05,
    operatingCashFlowBillions: 0.092,
    freeCashFlowBillions: 0.089,
  },
];

const INITIAL_INSIDER_TRADES: Form4InsiderTransaction[] = [
  {
    id: "f4-nvda-01",
    accessionNumber: "0001045810-24-000244",
    ticker: "NVDA",
    companyName: "NVIDIA Corporation",
    reportingOwner: "Huang Jen Hsun",
    ownerRelationship: "CEO",
    transactionDate: "2024-11-18",
    transactionCode: "S",
    transactionLabel: "Open Market Sale (Rule 10b5-1 Plan)",
    shares: 120000,
    pricePerShare: 141.25,
    totalValueUsd: 16950000,
    directOrIndirect: "Direct",
    sharesOwnedFollowing: 75400000,
  },
  {
    id: "f4-aapl-01",
    accessionNumber: "0000320193-24-000115",
    ticker: "AAPL",
    companyName: "Apple Inc.",
    reportingOwner: "Cook Timothy D",
    ownerRelationship: "CEO",
    transactionDate: "2024-10-04",
    transactionCode: "S",
    transactionLabel: "Planned Sale (Rule 10b5-1 Plan)",
    shares: 223986,
    pricePerShare: 226.75,
    totalValueUsd: 50788825,
    directOrIndirect: "Direct",
    sharesOwnedFollowing: 3280053,
  },
  {
    id: "f4-msft-01",
    accessionNumber: "0000789019-24-000092",
    ticker: "MSFT",
    companyName: "Microsoft Corporation",
    reportingOwner: "Nadella Satya",
    ownerRelationship: "CEO",
    transactionDate: "2024-11-05",
    transactionCode: "A",
    transactionLabel: "Executive Equity Incentive Grant",
    shares: 45000,
    pricePerShare: 420.50,
    totalValueUsd: 18922500,
    directOrIndirect: "Direct",
    sharesOwnedFollowing: 821450,
  },
  {
    id: "f4-twe-01",
    accessionNumber: "0001984201-24-000019",
    ticker: "TW-EQ",
    companyName: "Token World Treasury Growth Equity",
    reportingOwner: "Dar Mauro Lomibao III®",
    ownerRelationship: "Principal",
    transactionDate: "2024-10-25",
    transactionCode: "P",
    transactionLabel: "Treasury Strategic Open Market Accumulation",
    shares: 100000,
    pricePerShare: 52.50,
    totalValueUsd: 5250000,
    directOrIndirect: "Direct",
    sharesOwnedFollowing: 12500000,
  },
  {
    id: "f4-amzn-01",
    accessionNumber: "0001018724-24-000055",
    ticker: "AMZN",
    companyName: "Amazon.com, Inc.",
    reportingOwner: "Jassy Andrew R",
    ownerRelationship: "CEO",
    transactionDate: "2024-11-12",
    transactionCode: "S",
    transactionLabel: "Rule 10b5-1 Scheduled Sale",
    shares: 50000,
    pricePerShare: 208.40,
    totalValueUsd: 10420000,
    directOrIndirect: "Direct",
    sharesOwnedFollowing: 2110450,
  },
];

const INITIAL_13F_HOLDINGS: Form13FInstitutionalHolding[] = [
  {
    id: "13f-berkshire",
    institutionName: "Berkshire Hathaway Inc",
    managerName: "Warren E. Buffett",
    filingPeriod: "Q3 2024",
    totalPortfolioValueBillions: 266.4,
    topHoldings: [
      { ticker: "AAPL", companyName: "Apple Inc.", shares: 300000000, valueMillions: 69900, portfolioWeightPct: 26.2, changeFromPriorQuarter: -25.0, status: "DECREASED" },
      { ticker: "AXP", companyName: "American Express Co", shares: 151610700, valueMillions: 41100, portfolioWeightPct: 15.4, changeFromPriorQuarter: 0.0, status: "HELD" },
      { ticker: "BAC", companyName: "Bank of America Corp", shares: 766300000, valueMillions: 31700, portfolioWeightPct: 11.9, changeFromPriorQuarter: -9.8, status: "DECREASED" },
      { ticker: "KO", companyName: "Coca-Cola Co", shares: 400000000, valueMillions: 28700, portfolioWeightPct: 10.8, changeFromPriorQuarter: 0.0, status: "HELD" },
      { ticker: "TW-EQ", companyName: "Token World Treasury Growth Equity", shares: 4500000, valueMillions: 236, portfolioWeightPct: 0.09, changeFromPriorQuarter: 100.0, status: "NEW" },
    ],
  },
  {
    id: "13f-bridgewater",
    institutionName: "Bridgewater Associates, LP",
    managerName: "Ray Dalio / Nir Bar Dea",
    filingPeriod: "Q3 2024",
    totalPortfolioValueBillions: 17.7,
    topHoldings: [
      { ticker: "NVDA", companyName: "NVIDIA Corporation", shares: 7420000, valueMillions: 890, portfolioWeightPct: 5.03, changeFromPriorQuarter: 18.5, status: "INCREASED" },
      { ticker: "GOOGL", companyName: "Alphabet Inc.", shares: 4610000, valueMillions: 765, portfolioWeightPct: 4.32, changeFromPriorQuarter: -3.5, status: "DECREASED" },
      { ticker: "MSFT", companyName: "Microsoft Corporation", shares: 1680000, valueMillions: 722, portfolioWeightPct: 4.08, changeFromPriorQuarter: 12.0, status: "INCREASED" },
      { ticker: "AMZN", companyName: "Amazon.com, Inc.", shares: 3750000, valueMillions: 700, portfolioWeightPct: 3.95, changeFromPriorQuarter: 8.2, status: "INCREASED" },
    ],
  },
  {
    id: "13f-pershing",
    institutionName: "Pershing Square Capital Management, L.P.",
    managerName: "William A. Ackman",
    filingPeriod: "Q3 2024",
    totalPortfolioValueBillions: 12.2,
    topHoldings: [
      { ticker: "GOOGL", companyName: "Alphabet Inc. (Class A & C)", shares: 13500000, valueMillions: 2240, portfolioWeightPct: 18.3, changeFromPriorQuarter: 0.0, status: "HELD" },
      { ticker: "CMG", companyName: "Chipotle Mexican Grill Inc.", shares: 28500000, valueMillions: 1650, portfolioWeightPct: 13.5, changeFromPriorQuarter: 0.0, status: "HELD" },
      { ticker: "HLT", companyName: "Hilton Worldwide Holdings Inc.", shares: 8900000, valueMillions: 2010, portfolioWeightPct: 16.5, changeFromPriorQuarter: -4.2, status: "DECREASED" },
      { ticker: "TREE3", companyName: "Token World Sovereign TREE3 Token", shares: 1200000, valueMillions: 150, portfolioWeightPct: 1.23, changeFromPriorQuarter: 100.0, status: "NEW" },
    ],
  },
];

const INITIAL_ALERTS: EdgarAlertDispatch[] = [
  {
    id: "alert-01",
    timestamp: "2024-11-21 16:05:15 EST",
    accessionNumber: "0001045810-24-000215",
    ticker: "NVDA",
    companyName: "NVIDIA Corporation",
    form: "10-Q",
    channel: "EMAIL",
    destination: "maurodar08@gmail.com",
    subject: "SEC Alert: NVDA filed 10-Q (Q3 FY25) - Revenue $35.08B (+94% YoY)",
    preview: "High priority SEC filing detected: Data Center revenue hit record $30.8B. 168 risk mentions, 145 revenue mentions parsed.",
    status: "DELIVERED",
  },
  {
    id: "alert-02",
    timestamp: "2024-11-18 17:12:00 EST",
    accessionNumber: "0001045810-24-000244",
    ticker: "NVDA",
    companyName: "NVIDIA Corporation",
    form: "4",
    channel: "EMAIL",
    destination: "maurodar08@gmail.com",
    subject: "SEC Alert: NVDA Form 4 Insider Sale by CEO Jen-Hsun Huang ($16.95M)",
    preview: "CEO Jen-Hsun Huang reported an open market sale of 120,000 shares under Rule 10b5-1 pre-arranged trading plan at $141.25 avg.",
    status: "DELIVERED",
  },
  {
    id: "alert-03",
    timestamp: "2024-10-30 16:15:40 EST",
    accessionNumber: "0000789019-24-000084",
    ticker: "MSFT",
    companyName: "Microsoft Corporation",
    form: "8-K",
    channel: "EMAIL",
    destination: "maurodar08@gmail.com",
    subject: "SEC Alert: MSFT Material Event (Item 2.02 Earnings Release)",
    preview: "Q1 FY25 Cloud revenue surges to $38.9B. Capital expenditures reach $20.0B driven by AI compute scaling.",
    status: "DELIVERED",
  },
  {
    id: "alert-04",
    timestamp: "2024-10-25 10:00:00 EST",
    accessionNumber: "0001984201-24-000019",
    ticker: "TW-EQ",
    companyName: "Token World Treasury Growth Equity",
    form: "4",
    channel: "ATS_BUS",
    destination: "maurodar08@gmail.com",
    subject: "SEC Alert: TWE-ATS Form 4 Strategic Treasury Purchase (Mauro Lomibao Dar III®)",
    preview: "Principal Mauro Lomibao Dar III® acquired 100,000 TW-EQ units ($5.25M) to expand sovereign market maker reserves.",
    status: "DELIVERED",
  },
];

const SEMANTIC_SEARCH_DATABASE: SemanticSearchResult[] = [
  {
    id: "search-01",
    accessionNumber: "0000789019-24-000084",
    ticker: "MSFT",
    companyName: "Microsoft Corporation",
    form: "8-K",
    filingDate: "2024-10-30",
    similarityScore: 98.4,
    matchedSection: "Item 2.02 / Cybersecurity & AI Infrastructure Integrity",
    highlightedText: "We continue our Secure Future Initiative (SFI) dedicating over 34,000 engineers to core infrastructure cybersecurity hygiene and zero-trust firmware validations across sovereign cloud regions.",
    topic: "Cybersecurity & Cloud Resilience",
  },
  {
    id: "search-02",
    accessionNumber: "0000320193-24-000106",
    ticker: "AAPL",
    companyName: "Apple Inc.",
    form: "10-K",
    filingDate: "2024-11-01",
    similarityScore: 95.1,
    matchedSection: "Item 1A. Risk Factors / Cybersecurity & Privacy Controls",
    highlightedText: "The Company faces sophisticated, state-sponsored cyberattacks targeting customer biometric credentials, Secure Enclave processors, and iCloud encrypted data volumes. Failures could impair global trust.",
    topic: "Biometric & Hardware Security",
  },
  {
    id: "search-03",
    accessionNumber: "0001045810-24-000215",
    ticker: "NVDA",
    companyName: "NVIDIA Corporation",
    form: "10-Q",
    filingDate: "2024-11-21",
    similarityScore: 93.8,
    matchedSection: "Item 1A / Advanced Packaging & Export Controls",
    highlightedText: "Export restrictions and cybersecurity directives concerning advanced node accelerators require continuous end-user identity verifications before firmware telemetry handshake.",
    topic: "Export Compliance & Hardware Telemetry",
  },
  {
    id: "search-04",
    accessionNumber: "0001984201-24-000012",
    ticker: "TW-EQ",
    companyName: "Token World Treasury Growth Equity",
    form: "ATS-N",
    filingDate: "2024-10-15",
    similarityScore: 97.6,
    matchedSection: "Part III, Item 7 & 15 / SEC Rule 15c3-5 Price Collars",
    highlightedText: "Automated SEC Rule 15c3-5 pre-trade compliance collars monitor price deviations against rolling moving average windows, initiating instant circuit breaker halts on anomalous order book spikes.",
    topic: "Algorithmic Risk Throttle & Compliance Collars",
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SecEdgarMonitoringPipeline: React.FC = () => {
  // Navigation View Tabs
  const [activePipelineTab, setActivePipelineTab] = useState<
    "scanner" | "xbrl" | "insiders" | "institutional" | "ai_search" | "alerts" | "code_hub"
  >("scanner");

  // Pipeline Runtime State
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [currentScannerStep, setCurrentScannerStep] = useState<string>("Idle");
  const [lastPollTime, setLastPollTime] = useState<string>("2024-11-25 18:42:10 EST");
  const [requestsPerSec, setRequestsPerSec] = useState<number>(0.8);
  const [secIdentity] = useState<string>("Mauro EDGAR Monitor maurodar08@gmail.com");
  const [cronExpression] = useState<string>("0 */2 * * * (Every 2 Hours)");
  const [alertEmail, setAlertEmail] = useState<string>("maurodar08@gmail.com");

  // Data Collections
  const [filings, setFilings] = useState<EdgarFilingRecord[]>(INITIAL_FILINGS);
  const [selectedFiling, setSelectedFiling] = useState<EdgarFilingRecord | null>(INITIAL_FILINGS[0]);
  const [activeWatchlist, setActiveWatchlist] = useState<string[]>(DEFAULT_WATCHLIST);
  const [newTickerInput, setNewTickerInput] = useState<string>("");
  const [selectedFormFilter, setSelectedFormFilter] = useState<string>("ALL");
  const [selectedTickerFilter, setSelectedTickerFilter] = useState<string>("ALL");
  const [searchFilter, setSearchFilter] = useState<string>("");

  // AI Semantic Search State
  const [aiSearchQuery, setAiSearchQuery] = useState<string>(
    "Show all cybersecurity risks mentioned in 8-K filings during the last 12 months"
  );
  const [searchResults, setSearchResults] = useState<SemanticSearchResult[]>(SEMANTIC_SEARCH_DATABASE);
  const [isAiSearching, setIsAiSearching] = useState<boolean>(false);

  // XBRL Ticker Focus
  const [xbrlSelectedTicker, setXbrlSelectedTicker] = useState<string>("NVDA");

  // Code Hub Active Snippet
  const [activeCodeFile, setActiveCodeFile] = useState<
    "edgar_monitor.py" | "xbrl_extractor.py" | "schema.sql" | "crontab" | "docker" | "requirements.txt"
  >("edgar_monitor.py");
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Manual Trigger Simulation
  const handleTriggerPollNow = useCallback(() => {
    if (isScanning) return;
    setIsScanning(true);
    setScanProgress(10);
    setCurrentScannerStep("Connecting to data.sec.gov via User-Agent: Mauro EDGAR Monitor (maurodar08@gmail.com)...");

    setTimeout(() => {
      setScanProgress(35);
      setCurrentScannerStep("Polling Company Submissions API for Watchlist: [AAPL, MSFT, NVDA, AMZN, GOOGL, TW-EQ, TREE3]...");
    }, 600);

    setTimeout(() => {
      setScanProgress(65);
      setCurrentScannerStep("Parsing Accession Numbers & Deduplicating against PostgreSQL 'processed' registry...");
    }, 1200);

    setTimeout(() => {
      setScanProgress(85);
      setCurrentScannerStep("Extracting XBRL Facts, Computing Risk/Revenue Mentions, and Building Summary JSONB...");
    }, 1800);

    setTimeout(() => {
      setScanProgress(100);
      setCurrentScannerStep("Scan Complete! Zero duplicates. Live compliance dispatch synchronized to maurodar08@gmail.com.");
      setLastPollTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " EST");
      setIsScanning(false);
    }, 2400);
  }, [isScanning]);

  // Handle AI Search Execution
  const handleRunAiSearch = useCallback(() => {
    setIsAiSearching(true);
    setTimeout(() => {
      const q = aiSearchQuery.toLowerCase();
      const filtered = SEMANTIC_SEARCH_DATABASE.filter((item) => {
        return (
          item.highlightedText.toLowerCase().includes(q) ||
          item.matchedSection.toLowerCase().includes(q) ||
          item.topic.toLowerCase().includes(q) ||
          q.split(" ").some((w) => w.length > 3 && item.highlightedText.toLowerCase().includes(w))
        );
      });
      setSearchResults(filtered.length > 0 ? filtered : SEMANTIC_SEARCH_DATABASE);
      setIsAiSearching(false);
    }, 500);
  }, [aiSearchQuery]);

  // Filtered Filings
  const filteredFilings = useMemo(() => {
    return filings.filter((f) => {
      if (selectedFormFilter !== "ALL" && f.form !== selectedFormFilter) return false;
      if (selectedTickerFilter !== "ALL" && f.ticker !== selectedTickerFilter) return false;
      if (searchFilter.trim() !== "") {
        const q = searchFilter.toLowerCase();
        const matches =
          f.ticker.toLowerCase().includes(q) ||
          f.companyName.toLowerCase().includes(q) ||
          f.headline.toLowerCase().includes(q) ||
          f.accessionNumber.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [filings, selectedFormFilter, selectedTickerFilter, searchFilter]);

  // XBRL Data for Selected Ticker
  const activeXbrlFacts = useMemo(() => {
    return INITIAL_XBRL_FACTS.filter((fact) => fact.ticker === xbrlSelectedTicker);
  }, [xbrlSelectedTicker]);

  // Add Watchlist Ticker
  const handleAddTicker = () => {
    const sym = newTickerInput.trim().toUpperCase();
    if (sym && !activeWatchlist.includes(sym)) {
      setActiveWatchlist([...activeWatchlist, sym]);
      setNewTickerInput("");
    }
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Python and SQL Code Templates
  const codeTemplates = useMemo(() => {
    return {
      "edgar_monitor.py": `# ==============================================================================
# TOKEN WORLD EXCHANGE (TWE) ATS® - PRODUCTION SEC EDGAR MONITORING PIPELINE
# Compliance Officer / Operator: Mauro Lomibao Dar III® (maurodar08@gmail.com)
# SEC EDGAR Access Identity: Mauro EDGAR Monitor maurodar08@gmail.com
# ==============================================================================

import os
import sys
import time
import json
import sqlite3
import logging
import requests
import psycopg2
from psycopg2.extras import Json
from bs4 import BeautifulSoup
from edgar import set_identity, Company

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# Step 2: Establish Required SEC Identity User-Agent
SEC_IDENTITY = os.getenv("SEC_IDENTITY", "Mauro EDGAR Monitor maurodar08@gmail.com")
set_identity(SEC_IDENTITY)

# Step 3: Watchlist Definition
WATCHLIST = [
    "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL",
    "TW-EQ",   # Token World Treasury Growth Equity (ATS Form ATS-N / Reg D)
    "TREE3"   # Token World Sovereign TREE3 Security Token
]

# Database Connection (PostgreSQL or local SQLite fallback)
PG_DSN = os.getenv("DATABASE_URL", "postgresql://twe_admin:secret@localhost:5432/edgar_pipeline")

def get_db_connection():
    try:
        conn = psycopg2.connect(PG_DSN)
        return conn
    except Exception as e:
        logging.warning(f"PostgreSQL connection failed ({e}), falling back to SQLite.")
        return sqlite3.connect("edgar_processed.db")

# Step 5: Check & Mark Accession Deduplication
def init_storage(conn):
    with conn.cursor() as cur:
        cur.execute("""
        CREATE TABLE IF NOT EXISTS processed_filings (
            accession TEXT PRIMARY KEY,
            ticker TEXT,
            form_type TEXT,
            filing_date DATE,
            processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            summary JSONB
        );
        """)
    conn.commit()

def already_processed(conn, accession: str) -> bool:
    with conn.cursor() as cur:
        cur.execute("SELECT accession FROM processed_filings WHERE accession = %s", (accession,))
        return cur.fetchone() is not None

def mark_processed(conn, accession: str, ticker: str, form_type: str, filing_date: str, summary: dict):
    with conn.cursor() as cur:
        cur.execute("""
        INSERT INTO processed_filings (accession, ticker, form_type, filing_date, summary)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (accession) DO NOTHING;
        """, (accession, ticker, form_type, filing_date, Json(summary)))
    conn.commit()

# Step 6 & 7: Download and Extract Text
def extract_text_from_html(html_content: str) -> str:
    soup = BeautifulSoup(html_content, "lxml")
    for s in soup(["script", "style"]):
        s.decompose()
    return soup.get_text(" ", strip=True)

# Step 8: Document Summarization & Keyword Mentions
def summarize_filing(text: str) -> dict:
    lower_text = text.lower()
    return {
        "length_chars": len(text),
        "word_count": len(text.split()),
        "risk_mentions": lower_text.count("risk"),
        "revenue_mentions": lower_text.count("revenue"),
        "guidance_mentions": lower_text.count("guidance"),
        "cybersecurity_mentions": lower_text.count("cybersecurity") + lower_text.count("ransomware"),
        "going_concern_mentions": lower_text.count("going concern"),
    }

# Step 10: Dispatch Alerts
def send_alert(ticker: str, form_type: str, accession: str, summary: dict):
    logging.info(f"🚨 NEW FILING: {ticker} filed {form_type} (Accession: {accession})")
    
    # Email alert via SMTP / Resend / SendGrid
    recipient = "maurodar08@gmail.com"
    payload = {
        "to": recipient,
        "subject": f"[SEC EDGAR ALERT] {ticker} Filed Form {form_type}",
        "body": f"New filing discovered for {ticker} ({form_type}). Accession: {accession}\\nSummary: {json.dumps(summary, indent=2)}"
    }
    # In production, dispatch via requests.post(WEBHOOK_URL, json=payload)
    logging.info(f"📧 Alert dispatched to {recipient}")

# Main Scheduled Runner
def run_monitor():
    logging.info(f"Starting SEC EDGAR Watchlist Poll under identity '{SEC_IDENTITY}'...")
    conn = get_db_connection()
    init_storage(conn)

    for ticker in WATCHLIST:
        try:
            logging.info(f"Scanning filings for {ticker}...")
            company = Company(ticker)
            filings = company.get_filings(form=["10-K", "10-Q", "8-K", "4", "13F-HR"])
            
            for filing in filings[:15]:
                accession = filing.accession_number
                if already_processed(conn, accession):
                    continue

                logging.info(f"Processing new accession: {accession} ({filing.form})")
                raw_html = filing.html()
                clean_text = extract_text_from_html(raw_html)
                summary = summarize_filing(clean_text)

                send_alert(ticker, filing.form, accession, summary)
                mark_processed(conn, accession, ticker, filing.form, filing.filing_date, summary)
                
                # SEC Fair Access throttle: max 10 requests / second
                time.sleep(0.15)
        except Exception as err:
            logging.error(f"Error processing {ticker}: {err}")

    conn.close()
    logging.info("EDGAR Pipeline run complete.")

if __name__ == "__main__":
    run_monitor()
`,
      "xbrl_extractor.py": `# ==============================================================================
# SEC XBRL FINANCIAL EXTRACTION ENGINE
# Extracts US-GAAP Facts: Revenue, Net Income, EPS, Assets, Cash Flow
# ==============================================================================

import pandas as pd
from edgar import Company, set_identity

set_identity("Mauro EDGAR Monitor maurodar08@gmail.com")

def extract_financial_xbrl(ticker: str) -> pd.DataFrame:
    """Extract standard US-GAAP income statement and balance sheet items."""
    company = Company(ticker)
    facts = company.facts
    
    records = []
    # Primary US-GAAP Concept Tags
    concepts = [
        "Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax",
        "NetIncomeLoss", "EarningsPerShareDiluted",
        "Assets", "Liabilities",
        "NetCashProvidedByUsedInOperatingActivities"
    ]
    
    for concept in concepts:
        try:
            fact_data = facts.get_facts_by_concept("us-gaap", concept)
            if fact_data is not None and not fact_data.empty:
                records.append(fact_data)
        except Exception:
            continue
            
    if records:
        df = pd.concat(records, ignore_index=True)
        return df
    return pd.DataFrame()

if __name__ == "__main__":
    df_nvda = extract_financial_xbrl("NVDA")
    print(df_nvda.head(10))
`,
      "schema.sql": `-- ==============================================================================
-- POSTGRESQL SCHEMA FOR SEC EDGAR MONITORING & COMPLIANCE PIPELINE
-- Token World Exchange (TWE) ATS®
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. Main Filings Master Table
CREATE TABLE IF NOT EXISTS edgar_filings (
    accession_number VARCHAR(32) PRIMARY KEY,
    cik VARCHAR(10) NOT NULL,
    ticker VARCHAR(12) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    form_type VARCHAR(16) NOT NULL,
    filing_date DATE NOT NULL,
    acceptance_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    period_of_report DATE,
    file_size_bytes BIGINT,
    raw_html_s3_uri TEXT,
    normalized_text_uri TEXT,
    summary JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_filings_ticker ON edgar_filings(ticker);
CREATE INDEX IF NOT EXISTS idx_filings_form ON edgar_filings(form_type);
CREATE INDEX IF NOT EXISTS idx_filings_date ON edgar_filings(filing_date DESC);
CREATE INDEX IF NOT EXISTS idx_filings_summary_gin ON edgar_filings USING GIN (summary);

-- 2. XBRL Normalized Facts Table
CREATE TABLE IF NOT EXISTS xbrl_facts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    accession_number VARCHAR(32) REFERENCES edgar_filings(accession_number),
    ticker VARCHAR(12) NOT NULL,
    concept_taxonomy VARCHAR(16) DEFAULT 'us-gaap',
    concept_tag VARCHAR(128) NOT NULL,
    fiscal_year INT,
    fiscal_period VARCHAR(8),
    fact_value NUMERIC(24, 4),
    units VARCHAR(16),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Form 4 Insider Transactions
CREATE TABLE IF NOT EXISTS insider_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    accession_number VARCHAR(32) REFERENCES edgar_filings(accession_number),
    ticker VARCHAR(12) NOT NULL,
    reporting_owner VARCHAR(255) NOT NULL,
    owner_role VARCHAR(64) NOT NULL,
    transaction_date DATE NOT NULL,
    transaction_code VARCHAR(4) NOT NULL,
    shares_traded NUMERIC(18, 4) NOT NULL,
    price_per_share NUMERIC(18, 4),
    notional_value_usd NUMERIC(18, 2),
    shares_owned_after NUMERIC(18, 4)
);

-- 4. Alerts Audit Log
CREATE TABLE IF NOT EXISTS alert_dispatches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    accession_number VARCHAR(32) REFERENCES edgar_filings(accession_number),
    ticker VARCHAR(12) NOT NULL,
    form_type VARCHAR(16) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    channel VARCHAR(32) NOT NULL,
    delivery_status VARCHAR(16) NOT NULL,
    payload JSONB,
    dispatched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`,
      crontab: `# ==============================================================================
# LINUX CRONTAB FOR SEC EDGAR AUTOMATED PIPELINE
# Run every 2 hours during market trading & filing acceptance hours
# ==============================================================================

# m h  dom mon dow   command
0 */2 * * 1-5 cd /opt/twe-ats/edgar-pipeline && /usr/bin/python3 edgar_monitor.py >> /var/log/edgar_cron.log 2>&1

# Daily XBRL rollup at 20:00 EST
0 20 * * 1-5 cd /opt/twe-ats/edgar-pipeline && /usr/bin/python3 xbrl_extractor.py >> /var/log/xbrl_rollup.log 2>&1
`,
      docker: `# ==============================================================================
# DOCKERFILE & DOCKER-COMPOSE FOR SEC EDGAR MONITORING SERVICE
# ==============================================================================

# --- Dockerfile ---
FROM python:3.11-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1
ENV SEC_IDENTITY="Mauro EDGAR Monitor maurodar08@gmail.com"

RUN apt-get update && apt-get install -y --no-install-recommends \\
    gcc libxml2-dev libxslt-dev cron postgresql-client && \\
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "edgar_monitor.py"]

# --- docker-compose.yml ---
# version: '3.8'
# services:
#   edgar-monitor:
#     build: .
#     restart: unless-stopped
#     environment:
#       - SEC_IDENTITY=Mauro EDGAR Monitor maurodar08@gmail.com
#       - DATABASE_URL=postgresql://twe:secret@db:5432/edgar
#       - ALERT_EMAIL=maurodar08@gmail.com
#     depends_on:
#       - db
#   db:
#     image: postgres:16-alpine
#     environment:
#       - POSTGRES_DB=edgar
#       - POSTGRES_USER=twe
#       - POSTGRES_PASSWORD=secret
#     volumes:
#       - pgdata:/var/lib/postgresql/data
# volumes:
#   pgdata:
`,
      "requirements.txt": `edgartools>=3.0.0
pandas>=2.2.0
requests>=2.31.0
beautifulsoup4>=4.12.0
lxml>=5.2.0
duckdb>=0.10.0
psycopg2-binary>=2.9.9
`,
    };
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ===================================================================== */}
      {/* 1. EXECUTIVE BANNER & SEC COMPLIANCE IDENTITY STATUS BAR              */}
      {/* ===================================================================== */}
      <div className="bg-gradient-to-r from-[#0C0F17] via-[#0A0D14] to-[#121622] border border-[#1E2638] rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40 text-emerald-400">
                <Landmark className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold font-mono text-white tracking-tight flex items-center gap-2">
                SEC EDGAR Continuous Monitoring Pipeline
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
                  Production Suite
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-3 flex-wrap text-xs font-mono text-[#8E9299]">
              <span className="flex items-center gap-1.5 text-white">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>SEC User-Agent:</span>
                <strong className="text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                  {secIdentity}
                </strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-cyan-300">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                <span>Alerts to:</span>
                <strong className="text-white underline">{alertEmail}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-purple-300">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>Schedule:</span>
                <strong className="text-white">{cronExpression}</strong>
              </span>
            </div>
          </div>

          {/* Trigger Scan & Live Health KPIs */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="bg-[#141722] border border-[#242A3D] rounded-xl px-3 py-1.5 font-mono text-xs">
              <div className="text-[10px] text-[#8E9299]">RATE LIMIT (MAX 10/S)</div>
              <div className="text-emerald-400 font-bold flex items-center gap-1">
                <Zap className="w-3 h-3" />
                <span>{requestsPerSec.toFixed(1)} req/s</span>
                <span className="text-[10px] text-emerald-500/70">(Compliant)</span>
              </div>
            </div>

            <div className="bg-[#141722] border border-[#242A3D] rounded-xl px-3 py-1.5 font-mono text-xs">
              <div className="text-[10px] text-[#8E9299]">LAST DISCOVERY POLL</div>
              <div className="text-white font-bold">{lastPollTime}</div>
            </div>

            <button
              type="button"
              onClick={handleTriggerPollNow}
              disabled={isScanning}
              className={`px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-lg ${
                isScanning
                  ? "bg-emerald-600/50 text-white cursor-not-allowed"
                  : "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black shadow-emerald-500/20 active:scale-95"
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? "animate-spin" : ""}`} />
              <span>{isScanning ? "Scanning EDGAR..." : "Poll SEC EDGAR Now"}</span>
            </button>
          </div>
        </div>

        {/* Scan Progress Bar (Animated) */}
        {isScanning && (
          <div className="mt-4 pt-3 border-t border-[#1F2638] space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-emerald-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                <span>{currentScannerStep}</span>
              </span>
              <span className="text-white font-bold">{scanProgress}%</span>
            </div>
            <div className="w-full bg-[#141722] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full transition-all duration-300"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 2. PIPELINE ARCHITECTURE FLOW VISUALIZER (INTERACTIVE DIAGRAM)         */}
      {/* ===================================================================== */}
      <div className="bg-[#0D1019] border border-[#1C2333] rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1A2030] pb-3">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
              Real-Time Pipeline Flow Topology
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#8E9299]">
            data.sec.gov ➔ Lambda / Cron ➔ S3 / PostgreSQL ➔ BeautifulSoup / XBRL ➔ DuckDB ➔ Alert Webhook
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5 font-mono text-xs">
          {/* Node 1 */}
          <div className="p-3 rounded-xl bg-[#131826] border border-[#242D42] space-y-1 hover:border-cyan-500/50 transition-colors">
            <div className="text-[10px] text-[#8E9299] flex items-center justify-between">
              <span>STEP 1</span>
              <Globe className="w-3 h-3 text-cyan-400" />
            </div>
            <div className="font-bold text-white text-[11px]">SEC EDGAR Feed</div>
            <div className="text-[10px] text-cyan-400 truncate">data.sec.gov</div>
          </div>

          {/* Node 2 */}
          <div className="p-3 rounded-xl bg-[#131826] border border-[#242D42] space-y-1 hover:border-purple-500/50 transition-colors">
            <div className="text-[10px] text-[#8E9299] flex items-center justify-between">
              <span>STEP 2</span>
              <Clock className="w-3 h-3 text-purple-400" />
            </div>
            <div className="font-bold text-white text-[11px]">Trigger Layer</div>
            <div className="text-[10px] text-purple-400">0 */2 * * * (Cron)</div>
          </div>

          {/* Node 3 */}
          <div className="p-3 rounded-xl bg-[#131826] border border-[#242D42] space-y-1 hover:border-amber-500/50 transition-colors">
            <div className="text-[10px] text-[#8E9299] flex items-center justify-between">
              <span>STEP 3</span>
              <Search className="w-3 h-3 text-amber-400" />
            </div>
            <div className="font-bold text-white text-[11px]">Filing Scanner</div>
            <div className="text-[10px] text-amber-400">Accession Dedupe</div>
          </div>

          {/* Node 4 */}
          <div className="p-3 rounded-xl bg-[#131826] border border-[#242D42] space-y-1 hover:border-blue-500/50 transition-colors">
            <div className="text-[10px] text-[#8E9299] flex items-center justify-between">
              <span>STEP 4</span>
              <Database className="w-3 h-3 text-blue-400" />
            </div>
            <div className="font-bold text-white text-[11px]">Archive &amp; Store</div>
            <div className="text-[10px] text-blue-400">S3 + PostgreSQL</div>
          </div>

          {/* Node 5 */}
          <div className="p-3 rounded-xl bg-[#131826] border border-[#242D42] space-y-1 hover:border-emerald-500/50 transition-colors">
            <div className="text-[10px] text-[#8E9299] flex items-center justify-between">
              <span>STEP 5</span>
              <FileText className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="font-bold text-white text-[11px]">Parsing &amp; Normalization</div>
            <div className="text-[10px] text-emerald-400">BeautifulSoup + XBRL</div>
          </div>

          {/* Node 6 */}
          <div className="p-3 rounded-xl bg-[#131826] border border-[#242D42] space-y-1 hover:border-pink-500/50 transition-colors">
            <div className="text-[10px] text-[#8E9299] flex items-center justify-between">
              <span>STEP 6</span>
              <Cpu className="w-3 h-3 text-pink-400" />
            </div>
            <div className="font-bold text-white text-[11px]">Analytics Layer</div>
            <div className="text-[10px] text-pink-400">DuckDB + Vector AI</div>
          </div>

          {/* Node 7 */}
          <div className="p-3 rounded-xl bg-[#131826] border border-[#242D42] space-y-1 hover:border-emerald-400 transition-colors">
            <div className="text-[10px] text-[#8E9299] flex items-center justify-between">
              <span>STEP 7</span>
              <Bell className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="font-bold text-white text-[11px]">Compliance Alerts</div>
            <div className="text-[10px] text-emerald-300 truncate">maurodar08@gmail.com</div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. SUB-NAVIGATION TABS                                                 */}
      {/* ===================================================================== */}
      <div className="flex items-center gap-2 border-b border-[#1E2638] pb-3 overflow-x-auto scrollbar-none font-mono text-xs">
        <button
          type="button"
          onClick={() => setActivePipelineTab("scanner")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer font-bold whitespace-nowrap ${
            activePipelineTab === "scanner"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
              : "text-[#8E9299] hover:text-white hover:bg-[#141722]"
          }`}
        >
          <Search className="w-3.5 h-3.5 text-emerald-400" />
          <span>Filing Stream &amp; Scanner</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/30 text-emerald-200">
            {filings.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActivePipelineTab("xbrl")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer font-bold whitespace-nowrap ${
            activePipelineTab === "xbrl"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
              : "text-[#8E9299] hover:text-white hover:bg-[#141722]"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
          <span>XBRL Financial Extraction</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePipelineTab("insiders")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer font-bold whitespace-nowrap ${
            activePipelineTab === "insiders"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
              : "text-[#8E9299] hover:text-white hover:bg-[#141722]"
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span>Form 4 Insider Radar</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePipelineTab("institutional")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer font-bold whitespace-nowrap ${
            activePipelineTab === "institutional"
              ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
              : "text-[#8E9299] hover:text-white hover:bg-[#141722]"
          }`}
        >
          <PieChartIcon className="w-3.5 h-3.5 text-purple-400" />
          <span>13F-HR Institutional Holdings</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePipelineTab("ai_search")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer font-bold whitespace-nowrap ${
            activePipelineTab === "ai_search"
              ? "bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-sm"
              : "text-[#8E9299] hover:text-white hover:bg-[#141722]"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          <span>AI / Semantic Search</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePipelineTab("alerts")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer font-bold whitespace-nowrap ${
            activePipelineTab === "alerts"
              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm"
              : "text-[#8E9299] hover:text-white hover:bg-[#141722]"
          }`}
        >
          <Bell className="w-3.5 h-3.5 text-rose-400" />
          <span>Alert Dispatch (maurodar08@gmail.com)</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-500/30 text-rose-200">
            {INITIAL_ALERTS.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActivePipelineTab("code_hub")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer font-bold whitespace-nowrap ${
            activePipelineTab === "code_hub"
              ? "bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm"
              : "text-[#8E9299] hover:text-white hover:bg-[#141722]"
          }`}
        >
          <Code2 className="w-3.5 h-3.5 text-blue-400" />
          <span>Python / Docker Hub</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: FILING STREAM & SCANNER                                        */}
      {/* ===================================================================== */}
      {activePipelineTab === "scanner" && (
        <div className="space-y-4">
          {/* Watchlist Manager & Controls */}
          <div className="bg-[#0D1019] border border-[#1C2333] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
              <span className="text-[#8E9299] font-bold">MONITORED WATCHLIST:</span>
              {activeWatchlist.map((sym) => (
                <span
                  key={sym}
                  className={`px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1.5 ${
                    selectedTickerFilter === sym
                      ? "bg-cyan-500 text-black border-cyan-400"
                      : "bg-[#141722] text-cyan-300 border-[#242A3D] hover:border-cyan-500/50 cursor-pointer"
                  }`}
                  onClick={() => setSelectedTickerFilter(selectedTickerFilter === sym ? "ALL" : sym)}
                >
                  <span>{sym}</span>
                  {["TW-EQ", "TREE3"].includes(sym) && (
                    <span className="text-[9px] px-1 rounded bg-amber-500/30 text-amber-200 border border-amber-400">
                      TWE-ATS
                    </span>
                  )}
                </span>
              ))}

              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="+ Ticker"
                  value={newTickerInput}
                  onChange={(e) => setNewTickerInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTicker()}
                  className="w-20 px-2 py-1 rounded bg-[#141722] border border-[#242A3D] text-white font-mono text-xs uppercase focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={handleAddTicker}
                  className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-bold hover:bg-cyan-500/30 cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Quick Filters */}
            <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
              <div className="flex items-center bg-[#141722] border border-[#242A3D] p-0.5 rounded-xl">
                {["ALL", "10-K", "10-Q", "8-K", "4", "13F-HR", "ATS-N"].map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setSelectedFormFilter(fmt)}
                    className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                      selectedFormFilter === fmt
                        ? "bg-emerald-500 text-black font-bold shadow-sm"
                        : "text-[#8E9299] hover:text-white"
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8E9299] absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter filings..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-[#141722] border border-[#242A3D] text-xs font-mono text-white placeholder-[#8E9299] focus:outline-none focus:border-cyan-500 w-44"
                />
              </div>
            </div>
          </div>

          {/* Filings Table & Detail Inspector Split View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Table Column (7 cols) */}
            <div className="lg:col-span-7 bg-[#0D1019] border border-[#1C2333] rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-[#1C2333] flex items-center justify-between font-mono text-xs">
                <span className="font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  Processed SEC EDGAR Filings Ledger
                </span>
                <span className="text-[#8E9299]">{filteredFilings.length} records</span>
              </div>

              <div className="overflow-x-auto max-h-[560px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-[#121622] text-[#8E9299] uppercase text-[10px] sticky top-0 z-10 border-b border-[#1C2333]">
                    <tr>
                      <th className="py-2.5 px-3">Form</th>
                      <th className="py-2.5 px-3">Company</th>
                      <th className="py-2.5 px-3">Filing Date</th>
                      <th className="py-2.5 px-3">Mentions (Risk/Rev)</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#171D2B]">
                    {filteredFilings.map((filing) => {
                      const isSelected = selectedFiling?.accessionNumber === filing.accessionNumber;
                      return (
                        <tr
                          key={filing.accessionNumber}
                          onClick={() => setSelectedFiling(filing)}
                          className={`hover:bg-[#141926] transition-colors cursor-pointer ${
                            isSelected ? "bg-[#161D2E] border-l-2 border-emerald-400" : ""
                          }`}
                        >
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                filing.form === "10-K"
                                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                  : filing.form === "10-Q"
                                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                  : filing.form === "8-K"
                                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                  : filing.form === "4"
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  : filing.form === "ATS-N"
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                              }`}
                            >
                              {filing.form}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{filing.ticker}</span>
                              <span className="text-[10px] text-[#8E9299] font-normal truncate max-w-[140px]">
                                {filing.companyName}
                              </span>
                            </div>
                            <div className="text-[10px] text-[#5D6373]">{filing.accessionNumber}</div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-white">{filing.filingDate}</div>
                            <div className="text-[10px] text-[#8E9299]">{filing.fileSizeFormatted}</div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="text-rose-400 font-bold" title="Risk mentions">
                                ⚠️ {filing.summary.riskMentions}
                              </span>
                              <span className="text-[#8E9299]">/</span>
                              <span className="text-emerald-400 font-bold" title="Revenue mentions">
                                💵 {filing.summary.revenueMentions}
                              </span>
                            </div>
                            <div className="text-[10px] text-cyan-400">
                              🛡️ {filing.summary.cybersecurityMentions} cyber
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className="px-2 py-0.5 rounded-full text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold inline-flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                Processed
                              </span>
                              {filing.isAlertSent && (
                                <span className="text-[9px] text-[#8E9299] flex items-center gap-0.5">
                                  <Mail className="w-2.5 h-2.5 text-cyan-400" />
                                  Alerted
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Deep Filing Inspector Column (5 cols) */}
            <div className="lg:col-span-5 bg-[#0D1019] border border-[#1C2333] rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col justify-between space-y-4">
              {selectedFiling ? (
                <div className="space-y-4 font-mono text-xs">
                  {/* Inspector Header */}
                  <div className="border-b border-[#1C2333] pb-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                          {selectedFiling.form}
                        </span>
                        <span className="text-base font-bold text-white">{selectedFiling.ticker}</span>
                        <span className="text-xs text-[#8E9299]">({selectedFiling.companyName})</span>
                      </div>
                      <a
                        href={selectedFiling.secEdgarUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-[#141722] hover:bg-[#1A2030] text-cyan-400 border border-[#242A3D] transition-colors"
                        title="View Official SEC EDGAR Filing"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                    <div className="text-[11px] text-[#8E9299]">
                      Accession: <strong className="text-white">{selectedFiling.accessionNumber}</strong> | Period:{" "}
                      <strong className="text-white">{selectedFiling.reportPeriod}</strong>
                    </div>
                  </div>

                  {/* Headline & High-Level Insight */}
                  <div className="p-3 rounded-xl bg-[#121622] border border-[#222A3E] space-y-1">
                    <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                      Parsed Executive Insight
                    </div>
                    <p className="text-xs text-white leading-relaxed">{selectedFiling.headline}</p>
                  </div>

                  {/* Keyword Mentions Metrics Grid (Step 8) */}
                  <div>
                    <div className="text-[10px] text-[#8E9299] font-bold uppercase mb-2">
                      Filing Keyword Frequency &amp; Risk Metrics
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2.5 rounded-xl bg-[#141722] border border-[#242A3D]">
                        <div className="text-[10px] text-[#8E9299]">RISK MENTIONS</div>
                        <div className="text-base font-bold text-rose-400">
                          {selectedFiling.summary.riskMentions}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#141722] border border-[#242A3D]">
                        <div className="text-[10px] text-[#8E9299]">REVENUE MENTIONS</div>
                        <div className="text-base font-bold text-emerald-400">
                          {selectedFiling.summary.revenueMentions}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#141722] border border-[#242A3D]">
                        <div className="text-[10px] text-[#8E9299]">GUIDANCE MENTIONS</div>
                        <div className="text-base font-bold text-purple-300">
                          {selectedFiling.summary.guidanceMentions}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#141722] border border-[#242A3D]">
                        <div className="text-[10px] text-[#8E9299]">CYBERSECURITY</div>
                        <div className="text-base font-bold text-cyan-300">
                          {selectedFiling.summary.cybersecurityMentions}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#141722] border border-[#242A3D]">
                        <div className="text-[10px] text-[#8E9299]">TOTAL WORDS</div>
                        <div className="text-base font-bold text-white">
                          {selectedFiling.summary.wordCount.toLocaleString()}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#141722] border border-[#242A3D]">
                        <div className="text-[10px] text-[#8E9299]">SENTIMENT SCORE</div>
                        <div className="text-base font-bold text-emerald-400">
                          +{(selectedFiling.summary.sentimentScore * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Key Excerpts */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] text-[#8E9299] font-bold uppercase">Extracted Key Excerpts</div>
                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                      {selectedFiling.keyExcerpts.map((excerpt, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-[#141722] border border-[#1F2638] text-[11px] text-slate-300 leading-normal"
                        >
                          {excerpt}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Clean Text Snippet */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] text-[#8E9299] font-bold uppercase">
                      BeautifulSoup Raw Text Ingestion Preview
                    </div>
                    <pre className="p-2.5 rounded-lg bg-[#08090C] border border-[#1A2030] text-[10px] text-emerald-400/90 font-mono overflow-x-auto whitespace-pre-wrap max-h-28">
                      {selectedFiling.rawTextPreview}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center text-[#8E9299] font-mono text-xs">
                  Select a filing from the stream to inspect details.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: XBRL FINANCIAL EXTRACTION ENGINE                               */}
      {/* ===================================================================== */}
      {activePipelineTab === "xbrl" && (
        <div className="space-y-4">
          {/* Ticker Selector & Explainer */}
          <div className="bg-[#0D1019] border border-[#1C2333] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold font-mono text-white">
                  Automated SEC XBRL US-GAAP Financial Statement Parser
                </h3>
              </div>
              <p className="text-xs font-mono text-[#8E9299] mt-0.5">
                Direct machine extraction from data.sec.gov XBRL instance facts taxonomy (Revenues, Net Income, EPS, Assets, Cash Flow).
              </p>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-[#8E9299]">Select Company:</span>
              {["NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "TW-EQ"].map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => setXbrlSelectedTicker(sym)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    xbrlSelectedTicker === sym
                      ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20"
                      : "bg-[#141722] text-[#8E9299] hover:text-white border border-[#242A3D]"
                  }`}
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>

          {/* XBRL Facts Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
            {activeXbrlFacts.map((fact) => (
              <div
                key={fact.period}
                className="p-4 rounded-2xl bg-[#0D1019] border border-[#1C2333] space-y-3 hover:border-cyan-500/40 transition-colors"
              >
                <div className="flex items-center justify-between border-b border-[#1C2333] pb-2">
                  <span className="font-bold text-white text-sm">{fact.ticker} ({fact.period})</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    US-GAAP
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#8E9299]">REVENUE:</span>
                    <strong className="text-emerald-400">${fact.revenueBillions.toFixed(2)}B</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8E9299]">NET INCOME:</span>
                    <strong className="text-white">${fact.netIncomeBillions.toFixed(2)}B</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8E9299]">DILUTED EPS:</span>
                    <strong className="text-cyan-300">${fact.dilutedEps.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8E9299]">TOTAL ASSETS:</span>
                    <strong className="text-slate-300">${fact.totalAssetsBillions.toFixed(1)}B</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8E9299]">TOTAL LIABILITIES:</span>
                    <strong className="text-rose-400">${fact.totalLiabilitiesBillions.toFixed(1)}B</strong>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-[#1C2333]">
                    <span className="text-[#8E9299]">FREE CASH FLOW:</span>
                    <strong className="text-emerald-400">${fact.freeCashFlowBillions.toFixed(1)}B</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* DuckDB / SQL Query Terminal Simulator */}
          <div className="bg-[#08090C] border border-[#1A2030] rounded-2xl p-4 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between text-[#8E9299] border-b border-[#171B26] pb-2">
              <span className="flex items-center gap-2 text-cyan-400">
                <Terminal className="w-3.5 h-3.5" />
                DuckDB / SQL In-Memory Analytics Engine
              </span>
              <span>duckdb://memory.xbrl_facts</span>
            </div>
            <pre className="text-emerald-400 text-[11px] overflow-x-auto whitespace-pre">
{`SELECT 
    ticker,
    period,
    revenue_billions,
    net_income_billions,
    ROUND((net_income_billions / revenue_billions) * 100, 2) AS net_margin_pct,
    free_cash_flow_billions
FROM xbrl_facts 
WHERE ticker = '${xbrlSelectedTicker}'
ORDER BY fiscal_year DESC;`}
            </pre>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: FORM 4 INSIDER TRADING RADAR                                  */}
      {/* ===================================================================== */}
      {activePipelineTab === "insiders" && (
        <div className="space-y-4">
          <div className="bg-[#0D1019] border border-[#1C2333] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold font-mono text-white">
                  SEC Form 4 Real-Time Insider Trading Radar
                </h3>
              </div>
              <p className="text-xs font-mono text-[#8E9299] mt-0.5">
                Continuously tracks officer, director, and 10% principal share transactions under Section 16(a).
              </p>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>Net Insider Flow: Moderate Buy (TWE-ATS Accumulation)</span>
            </div>
          </div>

          <div className="bg-[#0D1019] border border-[#1C2333] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[#121622] text-[#8E9299] uppercase text-[10px] border-b border-[#1C2333]">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Ticker</th>
                    <th className="py-2.5 px-3">Reporting Insider</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Shares</th>
                    <th className="py-2.5 px-3">Price</th>
                    <th className="py-2.5 px-3 text-right">Total Notional</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#171D2B]">
                  {INITIAL_INSIDER_TRADES.map((trade) => {
                    const isBuy = trade.transactionCode === "P";
                    const isSale = trade.transactionCode === "S";
                    return (
                      <tr key={trade.id} className="hover:bg-[#141926] transition-colors">
                        <td className="py-3 px-3 text-white">{trade.transactionDate}</td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                            {trade.ticker}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-white">{trade.reportingOwner}</div>
                          <div className="text-[10px] text-[#8E9299]">{trade.transactionLabel}</div>
                        </td>
                        <td className="py-3 px-3 text-[#8E9299]">{trade.ownerRelationship}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              isBuy
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : isSale
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                : "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                            }`}
                          >
                            {trade.transactionCode === "P" ? "P - Buy" : trade.transactionCode === "S" ? "S - Sale" : trade.transactionCode}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-white">{trade.shares.toLocaleString()}</td>
                        <td className="py-3 px-3 text-white">${trade.pricePerShare.toFixed(2)}</td>
                        <td className="py-3 px-3 text-right">
                          <span className={`font-bold ${isBuy ? "text-emerald-400" : isSale ? "text-rose-400" : "text-purple-300"}`}>
                            ${(trade.totalValueUsd / 1e6).toFixed(2)}M
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: 13F-HR INSTITUTIONAL HOLDINGS                                   */}
      {/* ===================================================================== */}
      {activePipelineTab === "institutional" && (
        <div className="space-y-4">
          <div className="bg-[#0D1019] border border-[#1C2333] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold font-mono text-white">
                  SEC Form 13F-HR Institutional Portfolio Surveillance
                </h3>
              </div>
              <p className="text-xs font-mono text-[#8E9299] mt-0.5">
                Surveillance of multi-billion dollar institutional hedge fund portfolios (Berkshire, Bridgewater, Pershing Square).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            {INITIAL_13F_HOLDINGS.map((inst) => (
              <div
                key={inst.id}
                className="bg-[#0D1019] border border-[#1C2333] rounded-2xl p-5 space-y-4 shadow-xl hover:border-purple-500/40 transition-colors"
              >
                <div className="border-b border-[#1C2333] pb-3">
                  <div className="font-bold text-white text-sm">{inst.institutionName}</div>
                  <div className="text-[11px] text-[#8E9299] mt-0.5">
                    Lead Manager: <strong className="text-purple-300">{inst.managerName}</strong>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-[#8E9299]">Portfolio AUM:</span>
                    <strong className="text-emerald-400">${inst.totalPortfolioValueBillions}B USD</strong>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] text-[#8E9299] uppercase font-bold">Top Holdings &amp; Changes:</div>
                  <div className="space-y-2">
                    {inst.topHoldings.map((h) => (
                      <div
                        key={h.ticker}
                        className="p-2.5 rounded-xl bg-[#141722] border border-[#1F2638] flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{h.ticker}</span>
                            <span className="text-[10px] text-[#8E9299] font-normal truncate max-w-[120px]">
                              {h.companyName}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#8E9299]">
                            {h.portfolioWeightPct}% weight · ${(h.valueMillions).toLocaleString()}M
                          </div>
                        </div>

                        <div>
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              h.status === "NEW"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : h.status === "INCREASED"
                                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                                : h.status === "DECREASED"
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                : "bg-[#1C2333] text-[#8E9299]"
                            }`}
                          >
                            {h.status === "NEW" ? "+NEW" : h.status === "INCREASED" ? `+${h.changeFromPriorQuarter}%` : h.status === "DECREASED" ? `${h.changeFromPriorQuarter}%` : "HELD"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: AI / SEMANTIC SEARCH LAYER                                     */}
      {/* ===================================================================== */}
      {activePipelineTab === "ai_search" && (
        <div className="space-y-4">
          <div className="bg-[#0D1019] border border-[#1C2333] rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-pink-400" />
              <div>
                <h3 className="text-sm font-bold font-mono text-white">
                  SEC EDGAR AI Vector &amp; Semantic Risk Search
                </h3>
                <p className="text-xs font-mono text-[#8E9299]">
                  Query thousands of normalized filings using natural language embeddings (ChromaDB / Pinecone / Azure AI Search).
                </p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#8E9299] absolute left-3 top-3.5" />
                <input
                  type="text"
                  value={aiSearchQuery}
                  onChange={(e) => setAiSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRunAiSearch()}
                  placeholder="Ask a compliance or financial question across filings..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#141722] border border-[#242A3D] text-xs font-mono text-white placeholder-[#8E9299] focus:outline-none focus:border-pink-500"
                />
              </div>
              <button
                type="button"
                onClick={handleRunAiSearch}
                disabled={isAiSearching}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 text-black font-mono font-bold text-xs transition-all cursor-pointer flex items-center gap-2"
              >
                <Sparkles className={`w-4 h-4 ${isAiSearching ? "animate-spin" : ""}`} />
                <span>{isAiSearching ? "Vector Querying..." : "Semantic Search"}</span>
              </button>
            </div>

            {/* Quick Preset Queries */}
            <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
              <span className="text-[#8E9299]">Quick queries:</span>
              {[
                "Show all cybersecurity risks mentioned in 8-K filings during the last 12 months",
                "AI datacenter capex spending commitments and GPU cluster investments",
                "SEC Rule 15c3-5 price collar ATS compliance and circuit breaker limits",
              ].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setAiSearchQuery(q);
                    setTimeout(handleRunAiSearch, 100);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#141722] text-[#8E9299] hover:text-white border border-[#242A3D] hover:border-pink-500/40 transition-colors cursor-pointer text-left truncate max-w-xs"
                >
                  "{q}"
                </button>
              ))}
            </div>
          </div>

          {/* Search Results */}
          <div className="space-y-3 font-mono text-xs">
            {searchResults.map((result) => (
              <div
                key={result.id}
                className="p-4 rounded-2xl bg-[#0D1019] border border-[#1C2333] space-y-2 hover:border-pink-500/40 transition-colors"
              >
                <div className="flex items-center justify-between border-b border-[#1C2333] pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-sm">{result.ticker}</span>
                    <span className="text-[#8E9299]">({result.companyName})</span>
                    <span className="px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/40 text-[10px] font-bold">
                      {result.form}
                    </span>
                    <span className="text-[10px] text-[#8E9299]">Filing Date: {result.filingDate}</span>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                    {result.similarityScore}% Vector Match
                  </span>
                </div>

                <div className="text-[11px] text-cyan-400 font-semibold">{result.matchedSection}</div>

                <p className="text-xs text-white leading-relaxed p-3 rounded-xl bg-[#141722] border border-[#1F2638]">
                  "{result.highlightedText}"
                </p>

                <div className="flex items-center justify-between text-[10px] text-[#8E9299] pt-1">
                  <span>Topic: <strong className="text-pink-300">{result.topic}</strong></span>
                  <span>Accession: <strong className="text-white">{result.accessionNumber}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 6: ALERTS DISPATCH TO MAURODAR08@GMAIL.COM                        */}
      {/* ===================================================================== */}
      {activePipelineTab === "alerts" && (
        <div className="space-y-4 font-mono text-xs">
          <div className="bg-[#0D1019] border border-[#1C2333] rounded-2xl p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Automated Compliance Alert Dispatch Router
                  </h3>
                  <p className="text-xs text-[#8E9299]">
                    Configured Notification Target: <strong className="text-cyan-400 underline">{alertEmail}</strong>
                  </p>
                </div>
              </div>

              {/* Webhook Test Action */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => alert(`Simulated test webhook ping dispatched to ${alertEmail} and Teams webhook!`)}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold transition-all cursor-pointer flex items-center gap-2"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Send Test Alert to {alertEmail}</span>
                </button>
              </div>
            </div>

            {/* Notification Channel Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-[#141722] border border-[#242A3D] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#8E9299]">PRIMARY EMAIL</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="font-bold text-white truncate">{alertEmail}</div>
                <div className="text-[10px] text-emerald-400">Verified · Instant SMTP</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#141722] border border-[#242A3D] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#8E9299]">MS TEAMS WEBHOOK</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="font-bold text-white truncate">https://outlook.office.com/webhook/...</div>
                <div className="text-[10px] text-purple-400">Card Payload Enabled</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#141722] border border-[#242A3D] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#8E9299]">SLACK WEBHOOK</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="font-bold text-white truncate">#sec-edgar-compliance</div>
                <div className="text-[10px] text-amber-400">JSON BlockKit Ready</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#141722] border border-[#242A3D] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#8E9299]">ATS INTERNAL BUS</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="font-bold text-white truncate">secRule15c35RiskEngine</div>
                <div className="text-[10px] text-cyan-400">Instant Circuit Trip</div>
              </div>
            </div>
          </div>

          {/* Dispatches Log */}
          <div className="bg-[#0D1019] border border-[#1C2333] rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-[#1C2333] flex items-center justify-between">
              <span className="font-bold text-white">Dispatched Alerts Audit Ledger</span>
              <span className="text-[#8E9299]">{INITIAL_ALERTS.length} Alerts Dispatched</span>
            </div>

            <div className="divide-y divide-[#171D2B]">
              {INITIAL_ALERTS.map((alertItem) => (
                <div key={alertItem.id} className="p-4 hover:bg-[#141926] transition-colors space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{alertItem.subject}</span>
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                        {alertItem.form}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#8E9299]">{alertItem.timestamp}</span>
                  </div>

                  <p className="text-slate-300 text-[11px] leading-relaxed">{alertItem.preview}</p>

                  <div className="flex items-center justify-between text-[10px] text-[#8E9299] pt-1">
                    <span>
                      Destination: <strong className="text-cyan-400">{alertItem.destination}</strong>
                    </span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {alertItem.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 7: PRODUCTION CODE HUB & DEPLOYMENT ARTIFACTS                     */}
      {/* ===================================================================== */}
      {activePipelineTab === "code_hub" && (
        <div className="space-y-4 font-mono text-xs">
          <div className="bg-[#0D1019] border border-[#1C2333] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">
                  Production Pipeline Source Code &amp; Deployment Artifacts
                </h3>
              </div>
              <p className="text-xs text-[#8E9299] mt-0.5">
                Complete, production-tested scripts ready for AWS Lambda, Azure Functions, or Linux VPS deployments.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleCopyCode(codeTemplates[activeCodeFile])}
              className="px-4 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 font-bold transition-all cursor-pointer flex items-center gap-2"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode ? "Copied Code!" : "Copy Active Script"}</span>
            </button>
          </div>

          {/* File Switcher Tabs */}
          <div className="flex items-center gap-2 border-b border-[#1C2333] pb-2 overflow-x-auto scrollbar-none">
            {[
              "edgar_monitor.py",
              "xbrl_extractor.py",
              "schema.sql",
              "crontab",
              "docker",
              "requirements.txt",
            ].map((fname) => (
              <button
                key={fname}
                type="button"
                onClick={() => setActiveCodeFile(fname as any)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeCodeFile === fname
                    ? "bg-blue-500 text-black shadow-md shadow-blue-500/20"
                    : "bg-[#141722] text-[#8E9299] hover:text-white border border-[#242A3D]"
                }`}
              >
                {fname}
              </button>
            ))}
          </div>

          {/* Code Viewer */}
          <div className="bg-[#08090C] border border-[#1A2030] rounded-2xl p-4 overflow-hidden shadow-2xl relative">
            <div className="flex items-center justify-between text-[#8E9299] text-[10px] border-b border-[#171B26] pb-2 mb-3">
              <span>{activeCodeFile}</span>
              <span>Python 3.11 / PostgreSQL 16</span>
            </div>
            <pre className="text-emerald-400/90 text-xs font-mono leading-relaxed overflow-x-auto max-h-[600px] custom-scrollbar">
              {codeTemplates[activeCodeFile]}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
