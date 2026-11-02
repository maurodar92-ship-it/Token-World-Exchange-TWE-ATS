import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { shouldBypassFirestoreWrite, markFirestoreQuotaExceeded, isQuotaError } from "../utils/firestoreQuotaGuard";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export type EdgarFormType = "10-K" | "10-Q" | "8-K";

export interface DocumentSummary {
  risk_mentions: number;
  revenue_mentions: number;
  guidance_mentions: number;
  cybersecurity_mentions: number;
  word_count: number;
  length: number;
  sentiment_score: number; // -1.0 (very negative) to +1.0 (very positive)
  key_risk_sentences: string[];
}

export interface EdgarFiling {
  accessionNumber: string;
  ticker: string;
  companyName: string;
  cik: string;
  form: EdgarFormType;
  filingDate: string;
  reportPeriod: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  headline: string;
  secEdgarUrl: string;
  htmlContent: string;
  rawText: string;
  summary: DocumentSummary;
  isHighRisk8K: boolean;
  receivedAt: string;
}

export interface XbrlFactRecord {
  ticker: string;
  period: string; // e.g. "2023 Q1", "2024 Q4"
  fiscalYear: number;
  fiscalQuarter: string;
  revenue: number; // in Billions USD
  netIncome: number; // in Billions USD
  eps: number; // in USD diluted
  operatingCashFlow: number; // in Billions USD
  totalAssets: number; // in Billions USD
}

export type SecDisclosureCategory =
  | "Mergers & Acquisitions"
  | "Regulatory Action"
  | "Insider Trading"
  | "Financial Results"
  | "Executive & Governance"
  | "Cybersecurity & Breaches"
  | "Tokenization & ATS";

export const SEC_DISCLOSURE_CATEGORIES: SecDisclosureCategory[] = [
  "Mergers & Acquisitions",
  "Regulatory Action",
  "Insider Trading",
  "Financial Results",
  "Executive & Governance",
  "Cybersecurity & Breaches",
  "Tokenization & ATS",
];

export interface SecRssFeedItem {
  id: string;
  title: string;
  link: string;
  summary: string;
  updated: string;
  ticker: string;
  form: string;
  accessionNumber: string;
  companyName: string;
  cik: string;
  isBreaking: boolean;
  category: SecDisclosureCategory;
  itemCode?: string; // e.g. "Item 1.01", "Item 8.01", "Form 4 / Sec 16(a)", "Item 1.05"
  dealValueOrImpact?: string; // e.g. "$14.2B All-Cash Acquisition", "SEC Subpoena Notice", "120,000 shares ($17.1M)"
  filingParty?: string; // e.g. "Board of Directors", "Jensen Huang (CEO)", "Division of Enforcement"
  urgencyLevel?: "CRITICAL" | "HIGH" | "ELEVATED" | "STANDARD";
}

export interface AlertSensitivitySettings {
  riskThreshold: number; // default: 5
  revenueThreshold: number; // default: 4
  guidanceThreshold: number; // default: 3
  notifyEmail: string; // default: "maurodar08@gmail.com"
  enableBannerToast: boolean;
  enableSimulatedEmail: boolean;
  alertOnHighRisk8KOnly: boolean;
}

export interface AlertHistoryItem {
  id: string;
  timestamp: string;
  ticker: string;
  companyName: string;
  form: EdgarFormType;
  accessionNumber: string;
  triggerReason: string;
  riskMentions: number;
  revenueMentions: number;
  filingUrl: string;
  emailSentTo: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  acknowledged: boolean;
}

export interface EdgarNextTokenConfig {
  filerApiToken: string;
  filerTokenExpiry: string; // 1-year validity
  filerTechnicalAdmin: string;
  userApiToken: string;
  userTokenExpiry: string; // 30-day validity
  userLoginGovEmail: string;
  apiEnvironment: "PRODUCTION" | "EDGAR_BETA_SANDBOX";
  lastValidatedAt: string;
  isValid: boolean;
}

export interface MdaSentimentToneDimensions {
  optimismVsCaution: number; // 0-100 (100 = maximum optimism)
  forwardGuidanceConviction: number; // 0-100 (100 = high forward certainty)
  capitalExpenditureAggression: number; // 0-100 (100 = heavy expansion capEx)
  inflationaryAndCostPressure: number; // 0-100 (100 = severe cost/margin pressure)
  regulatoryAndLitigationConcern: number; // 0-100 (100 = high antitrust/regulatory risk)
}

export interface MdaSentimentResult {
  ticker: string;
  companyName: string;
  fiscalPeriod: string;
  accessionNumber?: string;
  overallScore: number; // -100 to +100
  sentimentLabel: "Bullish / Strong Expansion" | "Cautiously Optimistic" | "Neutral / Balanced" | "Cautious / Defensive" | "Bearish / Material Adversity" | string;
  confidenceScore: number; // 0 to 100
  toneDimensions: MdaSentimentToneDimensions;
  executiveSummary: string;
  keyBullishSignals: string[];
  keyCautionaryRisks: string[];
  actionableTakeawayForATS: string;
  modelUsed?: string;
  isSimulated?: boolean;
  analyzedAt?: string;
}

// ============================================================================
// DOCUMENT SUMMARIZER (summarize_document helper)
// ============================================================================

export const REGULATORY_RISK_KEYWORDS = [
  "litigation",
  "volatility",
  "regulatory",
  "cybersecurity",
  "investigation",
  "subpoena",
  "default",
  "breach",
  "penalty",
  "sanction",
  "material weakness",
  "adverse",
  "enforcement",
  "cease and desist",
  "going concern",
  "remediation",
  "indictment",
  "delisting",
];

export const REVENUE_KEYWORDS = [
  "revenue",
  "net sales",
  "gross margin",
  "topline",
  "operating income",
  "deferred revenue",
  "annual recurring revenue",
  "ebitda",
  "turnover",
  "billings",
];

export const GUIDANCE_KEYWORDS = [
  "guidance",
  "forecast",
  "outlook",
  "forward-looking",
  "projected",
  "full-year estimate",
  "target range",
  "revised guidance",
  "expectation",
];

/**
 * Predefined document summarizer that calculates risk_mentions, revenue_mentions,
 * and guidance_mentions alongside semantic score and risk sentence extraction.
 */
export function summarize_document(text: string): DocumentSummary {
  if (!text) {
    return {
      risk_mentions: 0,
      revenue_mentions: 0,
      guidance_mentions: 0,
      cybersecurity_mentions: 0,
      word_count: 0,
      length: 0,
      sentiment_score: 0,
      key_risk_sentences: [],
    };
  }

  const length = text.length;
  const words = text.split(/\s+/).filter(Boolean);
  const word_count = words.length;

  let risk_mentions = 0;
  for (const kw of REGULATORY_RISK_KEYWORDS) {
    const regex = new RegExp(`\\b${kw}\\b`, "gi");
    const matches = text.match(regex);
    if (matches) risk_mentions += matches.length;
  }

  let revenue_mentions = 0;
  for (const kw of REVENUE_KEYWORDS) {
    const regex = new RegExp(`\\b${kw}\\b`, "gi");
    const matches = text.match(regex);
    if (matches) revenue_mentions += matches.length;
  }

  let guidance_mentions = 0;
  for (const kw of GUIDANCE_KEYWORDS) {
    const regex = new RegExp(`\\b${kw}\\b`, "gi");
    const matches = text.match(regex);
    if (matches) guidance_mentions += matches.length;
  }

  const cyberRegex = /\b(cyber|cybersecurity|data breach|ransomware|malware|unauthorized access)\b/gi;
  const cyberMatches = text.match(cyberRegex);
  const cybersecurity_mentions = cyberMatches ? cyberMatches.length : 0;

  // Sentiment approximation: positive words vs negative words
  const positiveTerms = /\b(increase|growth|profit|record|strong|expanded|accretive|favorable|exceeded|outperformed|dividend|surplus)\b/gi;
  const negativeTerms = /\b(decrease|decline|loss|litigation|adverse|penalty|subpoena|investigation|breach|impairment|default|severance)\b/gi;
  const posCount = (text.match(positiveTerms) || []).length;
  const negCount = (text.match(negativeTerms) || []).length;
  const totalTerms = posCount + negCount;
  const sentiment_score = totalTerms > 0 ? Number(((posCount - negCount) / totalTerms).toFixed(2)) : 0;

  // Extract key sentences containing high-risk keywords
  const sentences = text.split(/(?<=[.?!])\s+/);
  const key_risk_sentences: string[] = [];
  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    if (
      REGULATORY_RISK_KEYWORDS.some((kw) => lower.includes(kw)) &&
      sentence.trim().length > 30 &&
      sentence.trim().length < 280
    ) {
      key_risk_sentences.push(sentence.trim());
      if (key_risk_sentences.length >= 4) break;
    }
  }

  return {
    risk_mentions,
    revenue_mentions,
    guidance_mentions,
    cybersecurity_mentions,
    word_count,
    length,
    sentiment_score,
    key_risk_sentences,
  };
}

// ============================================================================
// DEFAULT WATCHLIST & FIRESTORE PERSISTENCE
// ============================================================================

export const DEFAULT_WATCHLIST: string[] = [
  "AAPL",
  "MSFT",
  "NVDA",
  "AMZN",
  "GOOGL",
  "TW-EQ",
  "TREE3",
];

const LOCAL_STORAGE_WATCHLIST_KEY = "sec_monitor_watchlist_v1";
const LOCAL_STORAGE_SETTINGS_KEY = "sec_monitor_settings_v1";
const LOCAL_STORAGE_ALERTS_KEY = "sec_monitor_alert_history_v1";
const LOCAL_STORAGE_EDGAR_NEXT_KEY = "sec_monitor_edgar_next_tokens_v1";

export const DEFAULT_ALERT_SETTINGS: AlertSensitivitySettings = {
  riskThreshold: 5,
  revenueThreshold: 4,
  guidanceThreshold: 3,
  notifyEmail: "maurodar08@gmail.com",
  enableBannerToast: true,
  enableSimulatedEmail: true,
  alertOnHighRisk8KOnly: false,
};

export const DEFAULT_EDGAR_NEXT_TOKENS: EdgarNextTokenConfig = {
  filerApiToken: "EDGAR-NXT-FILER-2026-9A7B4F-LIVE-1Y",
  filerTokenExpiry: "2027-10-26T00:00:00Z", // 1-year validity technical administrator
  filerTechnicalAdmin: "maurodar08@gmail.com",
  userApiToken: "EDGAR-NXT-USER-LOGIN-GOV-30D-87612E",
  userTokenExpiry: "2026-11-25T00:00:00Z", // 30-day validity Login.gov credentials
  userLoginGovEmail: "maurodar08@gmail.com",
  apiEnvironment: "PRODUCTION",
  lastValidatedAt: "2026-10-26T01:00:00Z",
  isValid: true,
};

/**
 * Load Watchlist with resilient Firestore + LocalStorage fallback
 */
export async function loadWatchlist(): Promise<string[]> {
  // If Firestore write/read is bypassed, return local storage
  if (shouldBypassFirestoreWrite()) {
    try {
      const local = localStorage.getItem(LOCAL_STORAGE_WATCHLIST_KEY);
      if (local) return JSON.parse(local);
    } catch {
      // fallback
    }
    return DEFAULT_WATCHLIST;
  }

  try {
    const docRef = doc(db, "sec_monitor", "watchlist");
    const snap = await getDoc(docRef);
    if (snap.exists() && Array.isArray(snap.data()?.tickers) && snap.data()?.tickers.length > 0) {
      const tickers = snap.data()?.tickers as string[];
      try {
        localStorage.setItem(LOCAL_STORAGE_WATCHLIST_KEY, JSON.stringify(tickers));
      } catch {
        // ignore
      }
      return tickers;
    }
  } catch (err) {
    if (isQuotaError(err)) {
      markFirestoreQuotaExceeded(err instanceof Error ? err.message : String(err));
    }
    console.warn("Firestore watchlist load failed, using local storage:", err);
  }

  try {
    const local = localStorage.getItem(LOCAL_STORAGE_WATCHLIST_KEY);
    if (local) return JSON.parse(local);
  } catch {
    // ignore
  }

  return DEFAULT_WATCHLIST;
}

/**
 * Save Watchlist to Firestore & LocalStorage
 */
export async function saveWatchlist(tickers: string[]): Promise<void> {
  const cleanList = Array.from(new Set(tickers.map((t) => t.trim().toUpperCase()))).filter(Boolean);
  try {
    localStorage.setItem(LOCAL_STORAGE_WATCHLIST_KEY, JSON.stringify(cleanList));
  } catch {
    // ignore
  }

  if (shouldBypassFirestoreWrite()) return;

  try {
    const docRef = doc(db, "sec_monitor", "watchlist");
    await setDoc(
      docRef,
      {
        tickers: cleanList,
        updatedAt: serverTimestamp(),
        lastUpdatedBy: "maurodar08@gmail.com",
      },
      { merge: true }
    );
  } catch (err) {
    if (isQuotaError(err)) {
      markFirestoreQuotaExceeded(err instanceof Error ? err.message : String(err));
      return;
    }
    console.warn("Firestore saveWatchlist warning:", err);
  }
}

/**
 * Subscribe to real-time Watchlist updates
 */
export function subscribeToWatchlist(callback: (tickers: string[]) => void): () => void {
  if (shouldBypassFirestoreWrite()) {
    try {
      const local = localStorage.getItem(LOCAL_STORAGE_WATCHLIST_KEY);
      callback(local ? JSON.parse(local) : DEFAULT_WATCHLIST);
    } catch {
      callback(DEFAULT_WATCHLIST);
    }
    return () => {};
  }

  const docRef = doc(db, "sec_monitor", "watchlist");
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists() && Array.isArray(snap.data()?.tickers)) {
        callback(snap.data()?.tickers as string[]);
      } else {
        callback(DEFAULT_WATCHLIST);
      }
    },
    (err) => {
      console.warn("Watchlist snapshot subscription error:", err);
      try {
        const local = localStorage.getItem(LOCAL_STORAGE_WATCHLIST_KEY);
        callback(local ? JSON.parse(local) : DEFAULT_WATCHLIST);
      } catch {
        callback(DEFAULT_WATCHLIST);
      }
    }
  );
}

/**
 * Load and Save Alert Sensitivity Settings
 */
export function loadAlertSettings(): AlertSensitivitySettings {
  try {
    const local = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
    if (local) return { ...DEFAULT_ALERT_SETTINGS, ...JSON.parse(local) };
  } catch {
    // ignore
  }
  return DEFAULT_ALERT_SETTINGS;
}

export function saveAlertSettings(settings: AlertSensitivitySettings): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

/**
 * Load and Save Alert History
 */
export function loadAlertHistory(): AlertHistoryItem[] {
  try {
    const local = localStorage.getItem(LOCAL_STORAGE_ALERTS_KEY);
    if (local) return JSON.parse(local);
  } catch {
    // ignore
  }
  return SEED_ALERT_HISTORY;
}

export function saveAlertHistory(history: AlertHistoryItem[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_ALERTS_KEY, JSON.stringify(history.slice(0, 150)));
  } catch {
    // ignore
  }
}

/**
 * Load and Save EDGAR Next Tokens
 */
export function loadEdgarNextTokens(): EdgarNextTokenConfig {
  try {
    const local = localStorage.getItem(LOCAL_STORAGE_EDGAR_NEXT_KEY);
    if (local) return { ...DEFAULT_EDGAR_NEXT_TOKENS, ...JSON.parse(local) };
  } catch {
    // ignore
  }
  return DEFAULT_EDGAR_NEXT_TOKENS;
}

export function saveEdgarNextTokens(tokens: EdgarNextTokenConfig): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_EDGAR_NEXT_KEY, JSON.stringify(tokens));
  } catch {
    // ignore
  }
}

// ============================================================================
// SEED FILINGS & XBRL DATA REPOSITORY (edgartools compatible)
// ============================================================================

export const SEED_FILINGS: EdgarFiling[] = [
  {
    accessionNumber: "0000320193-24-000106",
    ticker: "AAPL",
    companyName: "Apple Inc.",
    cik: "0000320193",
    form: "10-K",
    filingDate: "2024-11-01",
    reportPeriod: "2024-09-28",
    fileSizeBytes: 15420310,
    fileSizeFormatted: "14.7 MB",
    headline: "Annual Report Pursuant to Section 13 and 15(d) for Fiscal Year Ended September 28, 2024",
    secEdgarUrl: "https://www.sec.gov/edgar/browse/?CIK=0000320193",
    rawText: `ITEM 1A. RISK FACTORS. Global economic conditions, regulatory scrutiny on App Store commissions, antitrust litigation in the US Department of Justice action, and semiconductor volatility in East Asia pose ongoing operational challenges. The Company faces regulatory scrutiny regarding digital market compliance in the European Union (Digital Markets Act) and ongoing supply chain concentration risk. Cybersecurity threats and unauthorized access attempts are continuously monitored with advanced cryptographic mitigation. Total Net Sales reached $391.03 billion with Services segment achieving record revenue of $96.17 billion. Forward-looking guidance assumes stable consumer demand and operational resilience across key hardware categories.`,
    htmlContent: `<h2>Apple Inc. FORM 10-K (Annual Report)</h2><p><strong>Item 1A. Risk Factors</strong>: Global economic conditions, <em>regulatory</em> scrutiny on App Store commissions, antitrust <em>litigation</em> in the US Department of Justice action, and semiconductor <em>volatility</em> in East Asia pose ongoing operational challenges. The Company faces <em>regulatory</em> scrutiny regarding digital market compliance in the European Union (DMA). <em>Cybersecurity</em> threats and unauthorized access attempts are continuously monitored with advanced cryptographic mitigation.</p><p><strong>Item 7. Management Discussion & Analysis</strong>: Total <em>revenue</em> reached $391.03B with strong Services segment performance. Forward-looking <em>guidance</em> assumes stable consumer demand and operational resilience across hardware categories.</p>`,
    summary: summarize_document(
      `ITEM 1A. RISK FACTORS. Global economic conditions, regulatory scrutiny on App Store commissions, antitrust litigation in the US Department of Justice action, and semiconductor volatility in East Asia pose ongoing operational challenges. The Company faces regulatory scrutiny regarding digital market compliance in the European Union (Digital Markets Act) and ongoing supply chain concentration risk. Cybersecurity threats and unauthorized access attempts are continuously monitored with advanced cryptographic mitigation. Total Net Sales reached $391.03 billion with Services segment achieving record revenue of $96.17 billion. Forward-looking guidance assumes stable consumer demand and operational resilience across key hardware categories.`
    ),
    isHighRisk8K: false,
    receivedAt: "2024-11-01T20:14:02Z",
  },
  {
    accessionNumber: "0000789019-24-000038",
    ticker: "MSFT",
    companyName: "Microsoft Corporation",
    cik: "0000789019",
    form: "10-Q",
    filingDate: "2024-10-30",
    reportPeriod: "2024-09-30",
    fileSizeBytes: 6241000,
    fileSizeFormatted: "5.9 MB",
    headline: "Quarterly Report Pursuant to Section 13 or 15(d) for the Period Ended September 30, 2024",
    secEdgarUrl: "https://www.sec.gov/edgar/browse/?CIK=0000789019",
    rawText: `ITEM 1A. RISK FACTORS. Cloud infrastructure capital expenditures increased significantly to support generative AI demand. The Company is subject to evolving regulatory requirements and competition laws globally regarding AI partnerships. Cybersecurity risks remain elevated following historic state-sponsored spear-phishing incident, prompting the Secure Future Initiative (SFI). Revenue grew 16% year-over-year to $65.6 billion driven by Azure and cloud services. Management provides guidance for intelligent cloud revenue to remain above 20% constant-currency growth.`,
    htmlContent: `<h2>Microsoft Corporation FORM 10-Q</h2><p><strong>Item 1A. Risk Factors</strong>: Cloud infrastructure capital expenditures increased significantly. Evolving <em>regulatory</em> requirements and competition laws globally regarding AI partnerships. <em>Cybersecurity</em> risks remain elevated following historic spear-phishing incident, prompting SFI <em>remediation</em>.</p><p>Total <em>revenue</em> grew 16% YoY to $65.6B driven by Azure. Management <em>guidance</em> forecasts intelligent cloud expansion above 20%.</p>`,
    summary: summarize_document(
      `ITEM 1A. RISK FACTORS. Cloud infrastructure capital expenditures increased significantly to support generative AI demand. The Company is subject to evolving regulatory requirements and competition laws globally regarding AI partnerships. Cybersecurity risks remain elevated following historic state-sponsored spear-phishing incident, prompting the Secure Future Initiative (SFI). Revenue grew 16% year-over-year to $65.6 billion driven by Azure and cloud services. Management provides guidance for intelligent cloud revenue to remain above 20% constant-currency growth.`
    ),
    isHighRisk8K: false,
    receivedAt: "2024-10-30T21:05:12Z",
  },
  {
    accessionNumber: "0001045810-24-000092",
    ticker: "NVDA",
    companyName: "NVIDIA Corporation",
    cik: "0001045810",
    form: "8-K",
    filingDate: "2024-10-24",
    reportPeriod: "2024-10-24",
    fileSizeBytes: 1829000,
    fileSizeFormatted: "1.7 MB",
    headline: "Current Report: Department of Justice Subpoena Inquiry & Export Control Volatility Disclosures",
    secEdgarUrl: "https://www.sec.gov/edgar/browse/?CIK=0001045810",
    rawText: `ITEM 8.01 OTHER EVENTS. On October 22, 2024, the Company received informational requests and a subpoena from regulatory authorities regarding market distribution practices. The Company denies any antitrust violations and intends to vigorously defend any litigation. Geopolitical volatility and export control restrictions to certain sovereign jurisdictions could materially impact future quarterly revenue if secondary sanctions or licensing delays materialize. Cybersecurity protocols and secure silicon verification are operating with zero detected intrusion. Revenue guidance for fourth fiscal quarter updated to reflect Blackwell server ramp.`,
    htmlContent: `<h2>NVIDIA Corporation FORM 8-K (Current Report)</h2><p><strong>Item 8.01 Other Events</strong>: The Company received informational requests and a <em>subpoena</em> from <em>regulatory</em> authorities regarding market distribution. The Company denies antitrust violations and intends to defend against <em>litigation</em>. Geopolitical <em>volatility</em> and export control restrictions could impact quarterly <em>revenue</em> if sanctions materialize. Management updated <em>guidance</em> for Q4.</p>`,
    summary: summarize_document(
      `ITEM 8.01 OTHER EVENTS. On October 22, 2024, the Company received informational requests and a subpoena from regulatory authorities regarding market distribution practices. The Company denies any antitrust violations and intends to vigorously defend any litigation. Geopolitical volatility and export control restrictions to certain sovereign jurisdictions could materially impact future quarterly revenue if secondary sanctions or licensing delays materialize. Cybersecurity protocols and secure silicon verification are operating with zero detected intrusion. Revenue guidance for fourth fiscal quarter updated to reflect Blackwell server ramp.`
    ),
    isHighRisk8K: true,
    receivedAt: "2024-10-24T18:42:01Z",
  },
  {
    accessionNumber: "0001018724-24-000129",
    ticker: "AMZN",
    companyName: "Amazon.com, Inc.",
    cik: "0001018724",
    form: "10-Q",
    filingDate: "2024-10-31",
    reportPeriod: "2024-09-30",
    fileSizeBytes: 8940000,
    fileSizeFormatted: "8.5 MB",
    headline: "Quarterly Report Pursuant to Section 13 or 15(d) for the Period Ended September 30, 2024",
    secEdgarUrl: "https://www.sec.gov/edgar/browse/?CIK=0001018724",
    rawText: `ITEM 1A. RISK FACTORS. Ongoing antitrust litigation brought by the Federal Trade Commission and state attorneys general. Regulatory developments in European markets under the Digital Services Act and AI Act. Energy capacity constraints and grid volatility impacting data center expansion for AWS. Net sales increased 11% to $158.9 billion in the third quarter. Guidance for fourth quarter anticipates net sales between $181.5 billion and $188.5 billion.`,
    htmlContent: `<h2>Amazon.com, Inc. FORM 10-Q</h2><p><strong>Item 1A. Risk Factors</strong>: Ongoing antitrust <em>litigation</em> brought by the FTC. <em>Regulatory</em> developments in EU markets under DSA. Energy capacity constraints and grid <em>volatility</em> impacting AWS.</p><p>Total <em>revenue</em> increased 11% to $158.9B. <em>Guidance</em> for Q4 anticipates net sales up to $188.5B.</p>`,
    summary: summarize_document(
      `ITEM 1A. RISK FACTORS. Ongoing antitrust litigation brought by the Federal Trade Commission and state attorneys general. Regulatory developments in European markets under the Digital Services Act and AI Act. Energy capacity constraints and grid volatility impacting data center expansion for AWS. Net sales increased 11% to $158.9 billion in the third quarter. Guidance for fourth quarter anticipates net sales between $181.5 billion and $188.5 billion.`
    ),
    isHighRisk8K: false,
    receivedAt: "2024-10-31T20:00:15Z",
  },
  {
    accessionNumber: "0001652044-24-000088",
    ticker: "GOOGL",
    companyName: "Alphabet Inc.",
    cik: "0001652044",
    form: "10-Q",
    filingDate: "2024-10-29",
    reportPeriod: "2024-09-30",
    fileSizeBytes: 7120000,
    fileSizeFormatted: "6.8 MB",
    headline: "Quarterly Report: Google Services and Cloud Momentum, US Antitrust Remedies Phase",
    secEdgarUrl: "https://www.sec.gov/edgar/browse/?CIK=0001652044",
    rawText: `ITEM 1A. RISK FACTORS. The Company is engaged in legal proceedings regarding US Department of Justice antitrust claims concerning search distribution and ad tech remedies. Regulatory scrutiny and structural remedies could impact business operations. Revenue reached $88.27 billion, up 15% year over year. Operating income grew 34% with Google Cloud operating margin expanding. Forward guidance underscores disciplined capital allocation and continuous cybersecurity defensive engineering.`,
    htmlContent: `<h2>Alphabet Inc. FORM 10-Q</h2><p><strong>Item 1A. Risk Factors</strong>: Engaged in legal proceedings regarding US DOJ antitrust claims. <em>Regulatory</em> scrutiny and potential structural remedies could impact business. <em>Cybersecurity</em> engineering remains priority.</p><p>Consolidated <em>revenue</em> reached $88.27B (+15% YoY). Forward <em>guidance</em> underscores disciplined capital allocation.</p>`,
    summary: summarize_document(
      `ITEM 1A. RISK FACTORS. The Company is engaged in legal proceedings regarding US Department of Justice antitrust claims concerning search distribution and ad tech remedies. Regulatory scrutiny and structural remedies could impact business operations. Revenue reached $88.27 billion, up 15% year over year. Operating income grew 34% with Google Cloud operating margin expanding. Forward guidance underscores disciplined capital allocation and continuous cybersecurity defensive engineering.`
    ),
    isHighRisk8K: false,
    receivedAt: "2024-10-29T20:30:45Z",
  },
  {
    accessionNumber: "0001984501-24-000015",
    ticker: "TW-EQ",
    companyName: "Token World Exchange ATS Corp.",
    cik: "0001984501",
    form: "8-K",
    filingDate: "2024-11-04",
    reportPeriod: "2024-11-04",
    fileSizeBytes: 2450000,
    fileSizeFormatted: "2.3 MB",
    headline: "Current Report: FINRA Form ATS-N Dual Venue Operational Approval & NYSE Fast Settlement Bridge",
    secEdgarUrl: "https://www.sec.gov/edgar/browse/?CIK=0001984501",
    rawText: `ITEM 8.01 OTHER EVENTS. Token World Exchange ATS (TWE) filed operational addenda to Form ATS-N confirming SEC Rule 15c3-5 automated risk collars, SEC Rule 17a-4 WORM audit logging, and DTCC FAST transfer agent integration with Continental Stock Transfer & Trust. No regulatory litigation, subpoena, or default actions are pending. Total venue institutional order volume surpassed $12.4 billion in synthetic notional liquidity. Revenue projections for Q4 updated upward by 28% based on enterprise tier subscriptions. Zero cybersecurity intrusions recorded across 52 connected liquidity routing nodes.`,
    htmlContent: `<h2>Token World Exchange ATS Corp. FORM 8-K</h2><p><strong>Item 8.01 Other Events</strong>: Filed operational addenda to Form ATS-N confirming SEC Rule 15c3-5 automated risk collars and SEC Rule 17a-4 WORM compliance. No <em>regulatory</em> <em>litigation</em>, <em>subpoena</em>, or <em>default</em> actions pending. Venue institutional volume surpassed $12.4B. <em>Revenue</em> projections for Q4 revised upward. Zero <em>cybersecurity</em> intrusions recorded.</p>`,
    summary: summarize_document(
      `ITEM 8.01 OTHER EVENTS. Token World Exchange ATS (TWE) filed operational addenda to Form ATS-N confirming SEC Rule 15c3-5 automated risk collars, SEC Rule 17a-4 WORM audit logging, and DTCC FAST transfer agent integration with Continental Stock Transfer & Trust. No regulatory litigation, subpoena, or default actions are pending. Total venue institutional order volume surpassed $12.4 billion in synthetic notional liquidity. Revenue projections for Q4 updated upward by 28% based on enterprise tier subscriptions. Zero cybersecurity intrusions recorded across 52 connected liquidity routing nodes.`
    ),
    isHighRisk8K: false,
    receivedAt: "2024-11-04T14:15:00Z",
  },
  {
    accessionNumber: "0001984501-24-000016",
    ticker: "TREE3",
    companyName: "TREE3 Sovereign Ecosystem Foundation",
    cik: "0001984502",
    form: "10-K",
    filingDate: "2024-11-05",
    reportPeriod: "2024-10-31",
    fileSizeBytes: 9800000,
    fileSizeFormatted: "9.3 MB",
    headline: "Annual Report: Global Forest Carbon Reserve Tokenization & Sovereign Asset Safeguards",
    secEdgarUrl: "https://www.sec.gov/edgar/browse/?CIK=0001984502",
    rawText: `ITEM 1A. RISK FACTORS. TREE3 tokenization requires strict compliance with international biodiversity credits verification under ISO 14064-2. Carbon market price volatility and sovereign land regulatory treaties represent primary external contingencies. Cybersecurity architecture implements multi-signature threshold cryptography with hardware enclave isolation to prevent unauthorized minting. The Foundation generated $410 million in tokenized verified carbon standard revenue, up 42% year-over-year. Long-term guidance anticipates expansion into European green asset registries with zero reported litigation.`,
    htmlContent: `<h2>TREE3 Sovereign Ecosystem Foundation FORM 10-K</h2><p><strong>Item 1A. Risk Factors</strong>: Strict compliance with international biodiversity credits verification. Carbon market price <em>volatility</em> and sovereign land <em>regulatory</em> treaties represent external contingencies. <em>Cybersecurity</em> architecture implements multi-signature threshold cryptography.</p><p>Total verified carbon <em>revenue</em> reached $410M (+42% YoY). Long-term <em>guidance</em> anticipates expansion with zero <em>litigation</em>.</p>`,
    summary: summarize_document(
      `ITEM 1A. RISK FACTORS. TREE3 tokenization requires strict compliance with international biodiversity credits verification under ISO 14064-2. Carbon market price volatility and sovereign land regulatory treaties represent primary external contingencies. Cybersecurity architecture implements multi-signature threshold cryptography with hardware enclave isolation to prevent unauthorized minting. The Foundation generated $410 million in tokenized verified carbon standard revenue, up 42% year-over-year. Long-term guidance anticipates expansion into European green asset registries with zero reported litigation.`
    ),
    isHighRisk8K: false,
    receivedAt: "2024-11-05T09:30:00Z",
  },
  {
    accessionNumber: "0001045810-24-000099",
    ticker: "NVDA",
    companyName: "NVIDIA Corporation",
    cik: "0001045810",
    form: "8-K",
    filingDate: "2024-11-18",
    reportPeriod: "2024-11-18",
    fileSizeBytes: 2150000,
    fileSizeFormatted: "2.1 MB",
    headline: "Current Report: Notice of Cross-Border Trade Sanction Clarification & Regulatory Inquiry",
    secEdgarUrl: "https://www.sec.gov/edgar/browse/?CIK=0001045810",
    rawText: `ITEM 8.01 OTHER EVENTS. On November 16, 2024, the Company received regulatory correspondence from international trade compliance bodies regarding distributor resale monitoring. Subpoena documents were requested for third-party logistics records. Regulatory penalties and litigation risk could occur if distributors failed to comply with trade sanctions. Market volatility in high-performance computing components remains elevated. Operating revenue for datacenter systems remains robust with $30.8 billion achieved in prior quarter. Forward guidance continues to anticipate strong hyper-scaler capital expenditure allocations.`,
    htmlContent: `<h2>NVIDIA Corporation FORM 8-K</h2><p><strong>Item 8.01 Other Events</strong>: Received <em>regulatory</em> correspondence from trade bodies. <em>Subpoena</em> documents were requested for third-party logistics. <em>Regulatory</em> penalties and <em>litigation</em> risk could occur if distributors breached compliance. Market <em>volatility</em> in AI hardware remains elevated. Operating <em>revenue</em> remains robust. Forward <em>guidance</em> anticipates strong demand.</p>`,
    summary: summarize_document(
      `ITEM 8.01 OTHER EVENTS. On November 16, 2024, the Company received regulatory correspondence from international trade compliance bodies regarding distributor resale monitoring. Subpoena documents were requested for third-party logistics records. Regulatory penalties and litigation risk could occur if distributors failed to comply with trade sanctions. Market volatility in high-performance computing components remains elevated. Operating revenue for datacenter systems remains robust with $30.8 billion achieved in prior quarter. Forward guidance continues to anticipate strong hyper-scaler capital expenditure allocations.`
    ),
    isHighRisk8K: true,
    receivedAt: "2024-11-18T16:20:10Z",
  },
];

export const SEED_XBRL_FACTS: Record<string, XbrlFactRecord[]> = {
  AAPL: [
    { ticker: "AAPL", period: "2023 Q1", fiscalYear: 2023, fiscalQuarter: "Q1", revenue: 117.15, netIncome: 29.99, eps: 1.88, operatingCashFlow: 34.0, totalAssets: 346.7 },
    { ticker: "AAPL", period: "2023 Q2", fiscalYear: 2023, fiscalQuarter: "Q2", revenue: 94.84, netIncome: 24.16, eps: 1.52, operatingCashFlow: 28.6, totalAssets: 332.1 },
    { ticker: "AAPL", period: "2023 Q3", fiscalYear: 2023, fiscalQuarter: "Q3", revenue: 81.80, netIncome: 19.88, eps: 1.26, operatingCashFlow: 26.4, totalAssets: 335.0 },
    { ticker: "AAPL", period: "2023 Q4", fiscalYear: 2023, fiscalQuarter: "Q4", revenue: 89.50, netIncome: 22.96, eps: 1.46, operatingCashFlow: 30.7, totalAssets: 352.5 },
    { ticker: "AAPL", period: "2024 Q1", fiscalYear: 2024, fiscalQuarter: "Q1", revenue: 119.58, netIncome: 33.92, eps: 2.18, operatingCashFlow: 39.9, totalAssets: 353.5 },
    { ticker: "AAPL", period: "2024 Q2", fiscalYear: 2024, fiscalQuarter: "Q2", revenue: 90.75, netIncome: 23.64, eps: 1.53, operatingCashFlow: 22.7, totalAssets: 337.4 },
    { ticker: "AAPL", period: "2024 Q3", fiscalYear: 2024, fiscalQuarter: "Q3", revenue: 85.78, netIncome: 21.45, eps: 1.40, operatingCashFlow: 28.9, totalAssets: 329.8 },
    { ticker: "AAPL", period: "2024 Q4", fiscalYear: 2024, fiscalQuarter: "Q4", revenue: 94.93, netIncome: 14.74, eps: 0.97, operatingCashFlow: 26.8, totalAssets: 364.9 },
  ],
  MSFT: [
    { ticker: "MSFT", period: "2023 Q1", fiscalYear: 2023, fiscalQuarter: "Q1", revenue: 52.86, netIncome: 18.30, eps: 2.45, operatingCashFlow: 24.4, totalAssets: 380.0 },
    { ticker: "MSFT", period: "2023 Q2", fiscalYear: 2023, fiscalQuarter: "Q2", revenue: 56.19, netIncome: 20.08, eps: 2.69, operatingCashFlow: 28.8, totalAssets: 411.9 },
    { ticker: "MSFT", period: "2023 Q3", fiscalYear: 2023, fiscalQuarter: "Q3", revenue: 56.52, netIncome: 22.29, eps: 2.99, operatingCashFlow: 30.5, totalAssets: 445.7 },
    { ticker: "MSFT", period: "2023 Q4", fiscalYear: 2023, fiscalQuarter: "Q4", revenue: 62.02, netIncome: 21.87, eps: 2.93, operatingCashFlow: 33.3, totalAssets: 470.5 },
    { ticker: "MSFT", period: "2024 Q1", fiscalYear: 2024, fiscalQuarter: "Q1", revenue: 61.86, netIncome: 21.94, eps: 2.94, operatingCashFlow: 31.9, totalAssets: 484.2 },
    { ticker: "MSFT", period: "2024 Q2", fiscalYear: 2024, fiscalQuarter: "Q2", revenue: 64.73, netIncome: 22.04, eps: 2.95, operatingCashFlow: 37.2, totalAssets: 512.1 },
    { ticker: "MSFT", period: "2024 Q3", fiscalYear: 2024, fiscalQuarter: "Q3", revenue: 65.59, netIncome: 24.67, eps: 3.30, operatingCashFlow: 34.2, totalAssets: 523.8 },
  ],
  NVDA: [
    { ticker: "NVDA", period: "2023 Q1", fiscalYear: 2023, fiscalQuarter: "Q1", revenue: 7.19, netIncome: 2.04, eps: 0.82, operatingCashFlow: 2.9, totalAssets: 44.5 },
    { ticker: "NVDA", period: "2023 Q2", fiscalYear: 2023, fiscalQuarter: "Q2", revenue: 13.51, netIncome: 6.19, eps: 2.48, operatingCashFlow: 6.3, totalAssets: 49.5 },
    { ticker: "NVDA", period: "2023 Q3", fiscalYear: 2023, fiscalQuarter: "Q3", revenue: 18.12, netIncome: 9.24, eps: 3.71, operatingCashFlow: 7.3, totalAssets: 54.1 },
    { ticker: "NVDA", period: "2023 Q4", fiscalYear: 2023, fiscalQuarter: "Q4", revenue: 22.10, netIncome: 12.29, eps: 4.93, operatingCashFlow: 11.5, totalAssets: 65.7 },
    { ticker: "NVDA", period: "2024 Q1", fiscalYear: 2024, fiscalQuarter: "Q1", revenue: 26.04, netIncome: 14.88, eps: 0.60, operatingCashFlow: 15.3, totalAssets: 77.0 },
    { ticker: "NVDA", period: "2024 Q2", fiscalYear: 2024, fiscalQuarter: "Q2", revenue: 30.04, netIncome: 16.60, eps: 0.67, operatingCashFlow: 14.5, totalAssets: 85.2 },
    { ticker: "NVDA", period: "2024 Q3", fiscalYear: 2024, fiscalQuarter: "Q3", revenue: 35.08, netIncome: 19.31, eps: 0.78, operatingCashFlow: 17.6, totalAssets: 96.4 },
  ],
  AMZN: [
    { ticker: "AMZN", period: "2023 Q1", fiscalYear: 2023, fiscalQuarter: "Q1", revenue: 127.36, netIncome: 3.17, eps: 0.31, operatingCashFlow: 4.8, totalAssets: 464.3 },
    { ticker: "AMZN", period: "2023 Q2", fiscalYear: 2023, fiscalQuarter: "Q2", revenue: 134.38, netIncome: 6.75, eps: 0.65, operatingCashFlow: 16.5, totalAssets: 477.6 },
    { ticker: "AMZN", period: "2023 Q3", fiscalYear: 2023, fiscalQuarter: "Q3", revenue: 143.08, netIncome: 9.88, eps: 0.94, operatingCashFlow: 21.2, totalAssets: 486.8 },
    { ticker: "AMZN", period: "2023 Q4", fiscalYear: 2023, fiscalQuarter: "Q4", revenue: 169.96, netIncome: 10.62, eps: 1.00, operatingCashFlow: 39.8, totalAssets: 527.8 },
    { ticker: "AMZN", period: "2024 Q1", fiscalYear: 2024, fiscalQuarter: "Q1", revenue: 143.31, netIncome: 10.43, eps: 0.98, operatingCashFlow: 18.9, totalAssets: 530.9 },
    { ticker: "AMZN", period: "2024 Q2", fiscalYear: 2024, fiscalQuarter: "Q2", revenue: 147.98, netIncome: 13.48, eps: 1.26, operatingCashFlow: 25.3, totalAssets: 554.0 },
    { ticker: "AMZN", period: "2024 Q3", fiscalYear: 2024, fiscalQuarter: "Q3", revenue: 158.88, netIncome: 15.33, eps: 1.43, operatingCashFlow: 31.5, totalAssets: 585.2 },
  ],
  GOOGL: [
    { ticker: "GOOGL", period: "2023 Q1", fiscalYear: 2023, fiscalQuarter: "Q1", revenue: 69.79, netIncome: 15.05, eps: 1.17, operatingCashFlow: 21.7, totalAssets: 379.5 },
    { ticker: "GOOGL", period: "2023 Q2", fiscalYear: 2023, fiscalQuarter: "Q2", revenue: 74.60, netIncome: 18.37, eps: 1.44, operatingCashFlow: 28.7, totalAssets: 383.0 },
    { ticker: "GOOGL", period: "2023 Q3", fiscalYear: 2023, fiscalQuarter: "Q3", revenue: 76.69, netIncome: 19.69, eps: 1.55, operatingCashFlow: 30.7, totalAssets: 396.7 },
    { ticker: "GOOGL", period: "2023 Q4", fiscalYear: 2023, fiscalQuarter: "Q4", revenue: 86.31, netIncome: 20.69, eps: 1.64, operatingCashFlow: 28.8, totalAssets: 402.4 },
    { ticker: "GOOGL", period: "2024 Q1", fiscalYear: 2024, fiscalQuarter: "Q1", revenue: 80.54, netIncome: 23.66, eps: 1.89, operatingCashFlow: 28.8, totalAssets: 407.4 },
    { ticker: "GOOGL", period: "2024 Q2", fiscalYear: 2024, fiscalQuarter: "Q2", revenue: 84.74, netIncome: 23.62, eps: 1.89, operatingCashFlow: 26.6, totalAssets: 414.9 },
    { ticker: "GOOGL", period: "2024 Q3", fiscalYear: 2024, fiscalQuarter: "Q3", revenue: 88.27, netIncome: 26.30, eps: 2.12, operatingCashFlow: 34.5, totalAssets: 432.1 },
  ],
  "TW-EQ": [
    { ticker: "TW-EQ", period: "2023 Q1", fiscalYear: 2023, fiscalQuarter: "Q1", revenue: 1.10, netIncome: 0.32, eps: 0.45, operatingCashFlow: 0.55, totalAssets: 8.2 },
    { ticker: "TW-EQ", period: "2023 Q2", fiscalYear: 2023, fiscalQuarter: "Q2", revenue: 1.85, netIncome: 0.65, eps: 0.88, operatingCashFlow: 0.95, totalAssets: 12.4 },
    { ticker: "TW-EQ", period: "2023 Q3", fiscalYear: 2023, fiscalQuarter: "Q3", revenue: 2.90, netIncome: 1.15, eps: 1.45, operatingCashFlow: 1.60, totalAssets: 18.9 },
    { ticker: "TW-EQ", period: "2023 Q4", fiscalYear: 2023, fiscalQuarter: "Q4", revenue: 4.40, netIncome: 1.80, eps: 2.25, operatingCashFlow: 2.50, totalAssets: 28.5 },
    { ticker: "TW-EQ", period: "2024 Q1", fiscalYear: 2024, fiscalQuarter: "Q1", revenue: 6.20, netIncome: 2.75, eps: 3.40, operatingCashFlow: 3.60, totalAssets: 42.1 },
    { ticker: "TW-EQ", period: "2024 Q2", fiscalYear: 2024, fiscalQuarter: "Q2", revenue: 8.90, netIncome: 4.10, eps: 5.10, operatingCashFlow: 5.20, totalAssets: 64.0 },
    { ticker: "TW-EQ", period: "2024 Q3", fiscalYear: 2024, fiscalQuarter: "Q3", revenue: 12.40, netIncome: 5.85, eps: 7.20, operatingCashFlow: 7.40, totalAssets: 95.8 },
  ],
  TREE3: [
    { ticker: "TREE3", period: "2023 Q1", fiscalYear: 2023, fiscalQuarter: "Q1", revenue: 0.08, netIncome: 0.02, eps: 0.12, operatingCashFlow: 0.04, totalAssets: 2.1 },
    { ticker: "TREE3", period: "2023 Q2", fiscalYear: 2023, fiscalQuarter: "Q2", revenue: 0.14, netIncome: 0.05, eps: 0.25, operatingCashFlow: 0.08, totalAssets: 3.5 },
    { ticker: "TREE3", period: "2023 Q3", fiscalYear: 2023, fiscalQuarter: "Q3", revenue: 0.22, netIncome: 0.08, eps: 0.40, operatingCashFlow: 0.12, totalAssets: 5.2 },
    { ticker: "TREE3", period: "2023 Q4", fiscalYear: 2023, fiscalQuarter: "Q4", revenue: 0.29, netIncome: 0.11, eps: 0.55, operatingCashFlow: 0.16, totalAssets: 7.8 },
    { ticker: "TREE3", period: "2024 Q1", fiscalYear: 2024, fiscalQuarter: "Q1", revenue: 0.38, netIncome: 0.16, eps: 0.80, operatingCashFlow: 0.22, totalAssets: 10.5 },
    { ticker: "TREE3", period: "2024 Q2", fiscalYear: 2024, fiscalQuarter: "Q2", revenue: 0.46, netIncome: 0.21, eps: 1.05, operatingCashFlow: 0.28, totalAssets: 14.2 },
    { ticker: "TREE3", period: "2024 Q3", fiscalYear: 2024, fiscalQuarter: "Q3", revenue: 0.58, netIncome: 0.27, eps: 1.35, operatingCashFlow: 0.35, totalAssets: 19.6 },
  ],
};

export const SEED_ALERT_HISTORY: AlertHistoryItem[] = [
  {
    id: "alt_8k_nvda_20241024",
    timestamp: "2024-10-24T18:42:01Z",
    ticker: "NVDA",
    companyName: "NVIDIA Corporation",
    form: "8-K",
    accessionNumber: "0001045810-24-000092",
    triggerReason: "High-Risk 8-K Disclosure: 8 risk mentions (litigation, subpoena, volatility) exceed sensitivity threshold (5)",
    riskMentions: 8,
    revenueMentions: 4,
    filingUrl: "https://www.sec.gov/edgar/browse/?CIK=0001045810",
    emailSentTo: "maurodar08@gmail.com",
    severity: "CRITICAL",
    acknowledged: true,
  },
  {
    id: "alt_8k_nvda_20241118",
    timestamp: "2024-11-18T16:20:10Z",
    ticker: "NVDA",
    companyName: "NVIDIA Corporation",
    form: "8-K",
    accessionNumber: "0001045810-24-000099",
    triggerReason: "High-Risk 8-K Disclosure: 9 risk mentions (subpoena, penalties, regulatory inquiry) exceed threshold (5)",
    riskMentions: 9,
    revenueMentions: 3,
    filingUrl: "https://www.sec.gov/edgar/browse/?CIK=0001045810",
    emailSentTo: "maurodar08@gmail.com",
    severity: "CRITICAL",
    acknowledged: false,
  },
  {
    id: "alt_10q_aapl_20241101",
    timestamp: "2024-11-01T20:14:02Z",
    ticker: "AAPL",
    companyName: "Apple Inc.",
    form: "10-K",
    accessionNumber: "0000320193-24-000106",
    triggerReason: "Revenue & Risk Surge: 10 risk mentions and 6 revenue mentions detected in Item 1A / MD&A",
    riskMentions: 10,
    revenueMentions: 6,
    filingUrl: "https://www.sec.gov/edgar/browse/?CIK=0000320193",
    emailSentTo: "maurodar08@gmail.com",
    severity: "HIGH",
    acknowledged: true,
  },
];

export const SEED_RSS_FEED: SecRssFeedItem[] = [
  // --- Mergers & Acquisitions ---
  {
    id: "rss_feed_ma_001",
    title: "8-K - MICROSOFT CORP (0000789019) (Filer)",
    link: "https://www.sec.gov/Archives/edgar/data/789019/000078901924000045/msft-20241120.htm",
    summary: "Item 1.01 Entry into a Material Definitive Agreement. Execution of $14.2B definitive merger agreement to acquire Next-Gen Distributed AI Data Infrastructure.",
    updated: "2024-11-20T17:15:22-05:00",
    ticker: "MSFT",
    form: "8-K",
    accessionNumber: "0000789019-24-000045",
    companyName: "MICROSOFT CORP",
    cik: "0000789019",
    isBreaking: true,
    category: "Mergers & Acquisitions",
    itemCode: "Item 1.01",
    dealValueOrImpact: "$14.2B Definitive Merger",
    filingParty: "Board of Directors / M&A Committee",
    urgencyLevel: "CRITICAL",
  },
  {
    id: "rss_feed_ma_002",
    title: "8-K - APPLE INC (0000320193) (Filer)",
    link: "https://www.sec.gov/Archives/edgar/data/320193/000032019324000112/aapl-20241115.htm",
    summary: "Item 2.01 Completion of Acquisition or Disposition of Assets. Finalized $2.85B asset purchase of Silicon Micro-Optics Foundry, strengthening next-gen spatial compute hardware.",
    updated: "2024-11-15T16:45:00-05:00",
    ticker: "AAPL",
    form: "8-K",
    accessionNumber: "0000320193-24-000112",
    companyName: "APPLE INC",
    cik: "0000320193",
    isBreaking: false,
    category: "Mergers & Acquisitions",
    itemCode: "Item 2.01",
    dealValueOrImpact: "$2.85B Micro-Optics Asset Deal",
    filingParty: "Corporate Development",
    urgencyLevel: "HIGH",
  },
  {
    id: "rss_feed_ma_003",
    title: "8-K - AMAZON COM INC (0001018724) (Filer)",
    link: "https://www.sec.gov/Archives/edgar/data/1018724/000101872424000135/amzn-20241112.htm",
    summary: "Item 1.01 Entry into Material Definitive Agreement. Strategic tender offer and definitive stock purchase agreement for Autonomous Robotics Fleet developer ($3.4B cash).",
    updated: "2024-11-12T18:10:00-05:00",
    ticker: "AMZN",
    form: "8-K",
    accessionNumber: "0001018724-24-000135",
    companyName: "AMAZON COM INC",
    cik: "0001018724",
    isBreaking: false,
    category: "Mergers & Acquisitions",
    itemCode: "Item 1.01",
    dealValueOrImpact: "$3.4B Tender Offer",
    filingParty: "Executive Leadership Team",
    urgencyLevel: "HIGH",
  },

  // --- Regulatory Action ---
  {
    id: "rss_feed_reg_001",
    title: "8-K - NVIDIA CORP (0001045810) (Filer)",
    link: "https://www.sec.gov/Archives/edgar/data/1045810/000104581024000099/nvda-20241118.htm",
    summary: "Item 8.01 Other Events. Disclosures concerning international trade compliance and formal SEC inquiry documentation regarding enterprise accelerator allocation.",
    updated: "2024-11-18T16:20:10-05:00",
    ticker: "NVDA",
    form: "8-K",
    accessionNumber: "0001045810-24-000099",
    companyName: "NVIDIA CORPORATION",
    cik: "0001045810",
    isBreaking: true,
    category: "Regulatory Action",
    itemCode: "Item 8.01",
    dealValueOrImpact: "SEC Formal Inquiry / Subpoena",
    filingParty: "Office of the General Counsel",
    urgencyLevel: "CRITICAL",
  },
  {
    id: "rss_feed_reg_002",
    title: "8-K - ALPHABET INC (0001652044) (Filer)",
    link: "https://www.sec.gov/Archives/edgar/data/1652044/000165204424000095/goog-20241114.htm",
    summary: "Item 8.01 Other Events. Update on DOJ Antitrust Remediation Proceedings; submission of behavioral safeguards and proposed compliance monitor framework.",
    updated: "2024-11-14T17:30:00-05:00",
    ticker: "GOOGL",
    form: "8-K",
    accessionNumber: "0001652044-24-000095",
    companyName: "ALPHABET INC",
    cik: "0001652044",
    isBreaking: true,
    category: "Regulatory Action",
    itemCode: "Item 8.01",
    dealValueOrImpact: "DOJ Antitrust Remediation Order",
    filingParty: "Chief Legal Officer",
    urgencyLevel: "HIGH",
  },
  {
    id: "rss_feed_reg_003",
    title: "8-K - TOKEN WORLD EXCHANGE ATS CORP (0001984501) (Filer)",
    link: "https://www.sec.gov/Archives/edgar/data/1984501/000198450124000015/twe-20241104.htm",
    summary: "Item 8.01 Other Events - Form ATS-N Operational Addenda & SEC Rule 15c3-5 Automated Pre-Trade Risk Collars clearance by FINRA.",
    updated: "2024-11-04T14:15:00-05:00",
    ticker: "TW-EQ",
    form: "8-K",
    accessionNumber: "0001984501-24-000015",
    companyName: "TOKEN WORLD EXCHANGE ATS CORP",
    cik: "0001984501",
    isBreaking: true,
    category: "Regulatory Action",
    itemCode: "Item 8.01",
    dealValueOrImpact: "FINRA 15c3-5 ATS Collar Clearance",
    filingParty: "Chief Compliance Officer",
    urgencyLevel: "ELEVATED",
  },

  // --- Insider Trading ---
  {
    id: "rss_feed_ins_001",
    title: "Form 4 - NVIDIA CORP (0001045810) (Filer)",
    link: "https://www.sec.gov/Archives/edgar/data/1045810/000104581024000105/form4-nvda-huang.htm",
    summary: "Statement of Changes in Beneficial Ownership (Section 16(a)). President & CEO pre-arranged Rule 10b5-1 disposition of 120,000 common shares at weighted average price of $142.50.",
    updated: "2024-11-19T18:05:30-05:00",
    ticker: "NVDA",
    form: "Form 4",
    accessionNumber: "0001045810-24-000105",
    companyName: "NVIDIA CORPORATION",
    cik: "0001045810",
    isBreaking: true,
    category: "Insider Trading",
    itemCode: "Form 4 / Sec 16(a)",
    dealValueOrImpact: "120,000 Shares Sold ($17.1M)",
    filingParty: "Jensen Huang (President & CEO)",
    urgencyLevel: "HIGH",
  },
  {
    id: "rss_feed_ins_002",
    title: "Form 4 - APPLE INC (0000320193) (Filer)",
    link: "https://www.sec.gov/Archives/edgar/data/320193/000032019324000115/form4-aapl-vp.htm",
    summary: "Statement of Changes in Beneficial Ownership. Senior Vice President exercised stock appreciation rights and sold 45,000 shares under Rule 10b5-1 trading plan.",
    updated: "2024-11-16T17:40:12-05:00",
    ticker: "AAPL",
    form: "Form 4",
    accessionNumber: "0000320193-24-000115",
    companyName: "APPLE INC",
    cik: "0000320193",
    isBreaking: false,
    category: "Insider Trading",
    itemCode: "Form 4 / Sec 16(a)",
    dealValueOrImpact: "45,000 Shares Exercised ($10.3M)",
    filingParty: "Senior VP Hardware Engineering",
    urgencyLevel: "STANDARD",
  },
  {
    id: "rss_feed_ins_003",
    title: "Form 144 - AMAZON COM INC (0001018724) (Filer)",
    link: "https://www.sec.gov/Archives/edgar/data/1018724/000101872424000140/form144-amzn.htm",
    summary: "Notice of Proposed Sale of Securities Pursuant to Rule 144. Proposed secondary market sale of 60,000 common shares via Morgan Stanley & Co. LLC.",
    updated: "2024-11-13T16:15:00-05:00",
    ticker: "AMZN",
    form: "Form 144",
    accessionNumber: "0001018724-24-000140",
    companyName: "AMAZON COM INC",
    cik: "0001018724",
    isBreaking: false,
    category: "Insider Trading",
    itemCode: "Form 144",
    dealValueOrImpact: "60,000 Proposed Shares ($11.8M)",
    filingParty: "Officer / Director Affiliate",
    urgencyLevel: "STANDARD",
  },

  // --- Financial Results ---
  {
    id: "rss_feed_fin_001",
    title: "10-K - APPLE INC (0000320193) (Filer)",
    link: "https://www.sec.gov/Archives/edgar/data/320193/000032019324000106/aapl-20240928.htm",
    summary: "Annual Report for Fiscal Year Ended September 28, 2024. Total Net Sales $391.03B (+2.0% YoY), Net Income $93.74B, Gross Margin expanded to 46.2%.",
    updated: "2024-11-01T20:14:02-05:00",
    ticker: "AAPL",
    form: "10-K",
    accessionNumber: "0000320193-24-000106",
    companyName: "APPLE INC",
    cik: "0000320193",
    isBreaking: false,
    category: "Financial Results",
    itemCode: "Annual 10-K",
    dealValueOrImpact: "$391.03B Net Sales (+2% YoY)",
    filingParty: "Chief Financial Officer",
    urgencyLevel: "ELEVATED",
  },
  {
    id: "rss_feed_fin_002",
    title: "10-Q - AMAZON COM INC (0001018724) (Filer)",
    link: "https://www.sec.gov/Archives/edgar/data/1018724/000101872424000129/amzn-20240930.htm",
    summary: "Quarterly Report for period ended September 30, 2024. Net sales $158.9B (+11% YoY); AWS cloud segment operating income reached $10.4B.",
    updated: "2024-10-31T20:00:15-05:00",
    ticker: "AMZN",
    form: "10-Q",
    accessionNumber: "0001018724-24-000129",
    companyName: "AMAZON COM INC",
    cik: "0001018724",
    isBreaking: false,
    category: "Financial Results",
    itemCode: "Quarterly 10-Q",
    dealValueOrImpact: "$158.9B Sales (+11% YoY)",
    filingParty: "Principal Accounting Officer",
    urgencyLevel: "STANDARD",
  },
  {
    id: "rss_feed_fin_003",
    title: "10-Q - MICROSOFT CORP (0000789019) (Filer)",
    link: "https://www.sec.gov/Archives/edgar/data/789019/000078901924000038/msft-20240930.htm",
    summary: "Quarterly Report for period ended September 30, 2024. Azure and intelligent cloud revenue grew 29%; capital expenditures of $19.0B for AI datacenters.",
    updated: "2024-10-30T21:05:12-05:00",
    ticker: "MSFT",
    form: "10-Q",
    accessionNumber: "0000789019-24-000038",
    companyName: "MICROSOFT CORP",
    cik: "0000789019",
    isBreaking: false,
    category: "Financial Results",
    itemCode: "Quarterly 10-Q",
    dealValueOrImpact: "Azure Growth +29% / $19B CapEx",
    filingParty: "Corporate Controller",
    urgencyLevel: "STANDARD",
  },
  {
    id: "rss_feed_fin_004",
    title: "10-Q - ALPHABET INC (0001652044) (Filer)",
    link: "https://www.sec.gov/Archives/edgar/data/1652044/000165204424000088/goog-20240930.htm",
    summary: "Quarterly Report for period ended September 30, 2024. Google Services and Google Cloud combined revenue reached $88.3B (+15% YoY).",
    updated: "2024-10-29T20:30:45-05:00",
    ticker: "GOOGL",
    form: "10-Q",
    accessionNumber: "0001652044-24-000088",
    companyName: "ALPHABET INC",
    cik: "0001652044",
    isBreaking: false,
    category: "Financial Results",
    itemCode: "Quarterly 10-Q",
    dealValueOrImpact: "$88.3B Revenue (+15% YoY)",
    filingParty: "VP Finance",
    urgencyLevel: "STANDARD",
  },

  // --- Cybersecurity & Breaches ---
  {
    id: "rss_feed_sec_001",
    title: "8-K - MICROSOFT CORP (0000789019) (Filer)",
    link: "https://www.sec.gov/Archives/edgar/data/789019/000078901924000050/msft-20241117.htm",
    summary: "Item 1.05 Material Cybersecurity Incident. Detection of unauthorized access telemetry targeting legacy test-tenant; threat actor evicted, zero customer data affected.",
    updated: "2024-11-17T21:40:00-05:00",
    ticker: "MSFT",
    form: "8-K",
    accessionNumber: "0000789019-24-000050",
    companyName: "MICROSOFT CORP",
    cik: "0000789019",
    isBreaking: true,
    category: "Cybersecurity & Breaches",
    itemCode: "Item 1.05",
    dealValueOrImpact: "Incident Evicted / Zero Impact",
    filingParty: "Chief Information Security Officer",
    urgencyLevel: "HIGH",
  },

  // --- Executive & Governance ---
  {
    id: "rss_feed_gov_001",
    title: "8-K - ALPHABET INC (0001652044) (Filer)",
    link: "https://www.sec.gov/Archives/edgar/data/1652044/000165204424000098/goog-20241116.htm",
    summary: "Item 5.02 Departure of Directors or Certain Officers; Election of Directors. Formal appointment of new Chief Regulatory Officer to oversee global AI safety governance.",
    updated: "2024-11-16T18:00:00-05:00",
    ticker: "GOOGL",
    form: "8-K",
    accessionNumber: "0001652044-24-000098",
    companyName: "ALPHABET INC",
    cik: "0001652044",
    isBreaking: false,
    category: "Executive & Governance",
    itemCode: "Item 5.02",
    dealValueOrImpact: "Executive Appointment",
    filingParty: "Board Nominating Committee",
    urgencyLevel: "STANDARD",
  },

  // --- Tokenization & ATS ---
  {
    id: "rss_feed_tok_001",
    title: "8-K - TOKEN WORLD EXCHANGE ATS CORP (0001984501) (Filer)",
    link: "https://www.sec.gov/Archives/edgar/data/1984501/000198450124000018/twe-20241121.htm",
    summary: "Item 8.01 Other Events. SEC Form ATS-N Operational Update - Launch of 24/7/365 Continuous Execution & DTCC FAST #9450 Live Digital Settlement Gateway for TWE Ticker.",
    updated: "2024-11-21T09:00:00-05:00",
    ticker: "TWE",
    form: "8-K",
    accessionNumber: "0001984501-24-000018",
    companyName: "TOKEN WORLD EXCHANGE ATS CORP",
    cik: "0001984501",
    isBreaking: true,
    category: "Tokenization & ATS",
    itemCode: "Item 8.01 / Form ATS-N",
    dealValueOrImpact: "24/7 T+0 Atomic Settlement Live",
    filingParty: "Mauro Lomibao Dar III (Sole Owner & Creator)",
    urgencyLevel: "CRITICAL",
  },
  {
    id: "rss_feed_tok_002",
    title: "10-K - TREE3 SOVEREIGN FOUNDATION (0001984502) (Filer)",
    link: "https://www.sec.gov/Archives/edgar/data/1984502/000198450124000016/tree3-20241031.htm",
    summary: "Annual Report Pursuant to Section 13/15(d) - ISO 14064-2 verified biodiversity tokenization and institutional natural capital sovereign reserves.",
    updated: "2024-11-05T09:30:00-05:00",
    ticker: "TREE3",
    form: "10-K",
    accessionNumber: "0001984501-24-000016",
    companyName: "TREE3 SOVEREIGN ECOSYSTEM FOUNDATION",
    cik: "0001984502",
    isBreaking: false,
    category: "Tokenization & ATS",
    itemCode: "Section 13/15(d)",
    dealValueOrImpact: "ISO 14064-2 Verified RWA Assets",
    filingParty: "Sovereign Asset Trustee",
    urgencyLevel: "STANDARD",
  },
];

// Helper to generate dynamic financial facts for any custom added ticker
export function getOrCreateXbrlFacts(ticker: string): XbrlFactRecord[] {
  const upper = ticker.toUpperCase();
  if (SEED_XBRL_FACTS[upper]) {
    return SEED_XBRL_FACTS[upper];
  }

  // Deterministic generator for custom added tickers
  const hash = upper.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const baseRev = Math.max(2, (hash % 80) + 10);
  const quarters = ["2023 Q1", "2023 Q2", "2023 Q3", "2023 Q4", "2024 Q1", "2024 Q2", "2024 Q3", "2024 Q4"];

  return quarters.map((q, idx) => {
    const growth = 1 + idx * 0.08 + ((hash * (idx + 1)) % 15) / 100;
    const rev = Number((baseRev * growth).toFixed(2));
    const net = Number((rev * 0.22).toFixed(2));
    const eps = Number((net / 3.5).toFixed(2));
    const ocf = Number((net * 1.2).toFixed(2));
    const assets = Number((rev * 3.8).toFixed(2));
    return {
      ticker: upper,
      period: q,
      fiscalYear: Number(q.split(" ")[0]),
      fiscalQuarter: q.split(" ")[1],
      revenue: rev,
      netIncome: net,
      eps,
      operatingCashFlow: ocf,
      totalAssets: assets,
    };
  });
}

// Generate dynamic filings if a new ticker is added to the watchlist
export function getFilingsForWatchlist(watchlist: string[]): EdgarFiling[] {
  const upperWatchlist = new Set(watchlist.map((w) => w.toUpperCase()));
  const matched = SEED_FILINGS.filter((f) => upperWatchlist.has(f.ticker.toUpperCase()));

  // For any watchlist item with no seed filing, synthesize standard filings
  for (const ticker of watchlist) {
    const upper = ticker.toUpperCase();
    if (!matched.some((m) => m.ticker === upper)) {
      const synthetic10K: EdgarFiling = {
        accessionNumber: `0009999999-24-${(Math.random() * 900000 + 100000).toFixed(0)}`,
        ticker: upper,
        companyName: `${upper} Holdings Corp.`,
        cik: `000${Math.floor(Math.random() * 900000 + 100000)}`,
        form: "10-K",
        filingDate: "2024-11-12",
        reportPeriod: "2024-09-30",
        fileSizeBytes: 4200000,
        fileSizeFormatted: "4.0 MB",
        headline: `Annual Report Pursuant to Section 13 and 15(d) for ${upper}`,
        secEdgarUrl: `https://www.sec.gov/edgar/browse/?CIK=${upper}`,
        rawText: `ITEM 1A. RISK FACTORS. Operational volatility in digital asset markets and changing regulatory parameters. Cybersecurity safeguards are established to defend customer records against unauthorized data intrusion. The company experienced solid revenue expansion with top-line growth of 18% year-over-year. Management guidance targets further expansion with zero pending litigation.`,
        htmlContent: `<h2>${upper} FORM 10-K</h2><p>Operational <em>volatility</em> in digital asset markets and changing <em>regulatory</em> parameters. <em>Cybersecurity</em> safeguards established. Solid <em>revenue</em> expansion. Forward <em>guidance</em> targets expansion with zero <em>litigation</em>.</p>`,
        summary: summarize_document(
          `ITEM 1A. RISK FACTORS. Operational volatility in digital asset markets and changing regulatory parameters. Cybersecurity safeguards are established to defend customer records against unauthorized data intrusion. The company experienced solid revenue expansion with top-line growth of 18% year-over-year. Management guidance targets further expansion with zero pending litigation.`
        ),
        isHighRisk8K: false,
        receivedAt: "2024-11-12T15:00:00Z",
      };
      matched.push(synthetic10K);
    }
  }

  return matched.sort((a, b) => new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime());
}

// ============================================================================
// EXPORT UTILITIES (CSV & HTML DOWNLOAD)
// ============================================================================

export function exportFilingsToCsv(filings: EdgarFiling[]): void {
  const headers = [
    "Accession Number",
    "Ticker",
    "Company Name",
    "Form",
    "Filing Date",
    "Report Period",
    "File Size",
    "Risk Mentions",
    "Revenue Mentions",
    "Guidance Mentions",
    "Cyber Mentions",
    "Sentiment Score",
    "High Risk 8-K",
    "SEC URL",
  ];

  const rows = filings.map((f) => [
    `"${f.accessionNumber}"`,
    `"${f.ticker}"`,
    `"${f.companyName.replace(/"/g, '""')}"`,
    `"${f.form}"`,
    `"${f.filingDate}"`,
    `"${f.reportPeriod}"`,
    `"${f.fileSizeFormatted}"`,
    f.summary.risk_mentions,
    f.summary.revenue_mentions,
    f.summary.guidance_mentions,
    f.summary.cybersecurity_mentions,
    f.summary.sentiment_score,
    f.isHighRisk8K ? "YES" : "NO",
    `"${f.secEdgarUrl}"`,
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `sec_edgar_filings_report_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadFilingHtml(filing: EdgarFiling): void {
  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${filing.companyName} (${filing.ticker}) - Form ${filing.form}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; max-width: 900px; margin: 40px auto; padding: 0 20px; color: #1e293b; }
    header { border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 24px; }
    h1 { margin: 0 0 8px 0; color: #0f172a; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-weight: bold; background: #e0f2fe; color: #0369a1; }
    .risk-highlight { background: #fee2e2; color: #991b1b; padding: 1px 4px; border-radius: 3px; font-weight: 600; }
    .metrics { display: flex; gap: 16px; background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 24px; border: 1px solid #e2e8f0; }
    .metric { text-align: center; }
    .metric-value { font-size: 20px; font-weight: bold; color: #0f172a; }
    .metric-label { font-size: 11px; text-transform: uppercase; color: #64748b; }
  </style>
</head>
<body>
  <header>
    <span class="badge">SEC EDGAR • FORM ${filing.form}</span>
    <h1>${filing.companyName} (${filing.ticker})</h1>
    <p>Accession: ${filing.accessionNumber} | CIK: ${filing.cik} | Filing Date: ${filing.filingDate}</p>
  </header>
  <div class="metrics">
    <div class="metric"><div class="metric-value">${filing.summary.risk_mentions}</div><div class="metric-label">Risk Mentions</div></div>
    <div class="metric"><div class="metric-value">${filing.summary.revenue_mentions}</div><div class="metric-label">Revenue Mentions</div></div>
    <div class="metric"><div class="metric-value">${filing.summary.guidance_mentions}</div><div class="metric-label">Guidance Mentions</div></div>
    <div class="metric"><div class="metric-value">${filing.summary.word_count}</div><div class="metric-label">Word Count</div></div>
    <div class="metric"><div class="metric-value">${filing.summary.sentiment_score}</div><div class="metric-label">Sentiment</div></div>
  </div>
  <article>
    ${filing.htmlContent}
  </article>
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filing.ticker}_${filing.form}_${filing.accessionNumber}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// POSTGRESQL HYBRID STORAGE ENGINE & PGVECTOR SIMULATION
// ============================================================================

export interface PostgresQueryResult {
  columns: string[];
  rows: (string | number | null)[][];
  rowCount: number;
  executionTimeMs: number;
  query: string;
}

export interface FilingEmbeddingRecord {
  id: number;
  accession_number: string;
  ticker: string;
  chunk_id: number;
  section: string;
  content: string;
  tags: string[];
}

export const SEED_POSTGRES_FILINGS = [
  { accession_number: "0000320193-24-000106", cik: "0000320193", ticker: "AAPL", company_name: "Apple Inc.", form_type: "10-K", filing_date: "2024-11-01", filing_url: "https://www.sec.gov/edgar/browse/?CIK=0000320193" },
  { accession_number: "0000789019-24-000038", cik: "0000789019", ticker: "MSFT", company_name: "Microsoft Corporation", form_type: "10-Q", filing_date: "2024-10-30", filing_url: "https://www.sec.gov/edgar/browse/?CIK=0000789019" },
  { accession_number: "0001045810-24-000092", cik: "0001045810", ticker: "NVDA", company_name: "NVIDIA Corporation", form_type: "8-K", filing_date: "2024-10-24", filing_url: "https://www.sec.gov/edgar/browse/?CIK=0001045810" },
  { accession_number: "0001045810-24-000099", cik: "0001045810", ticker: "NVDA", company_name: "NVIDIA Corporation", form_type: "8-K", filing_date: "2024-11-18", filing_url: "https://www.sec.gov/edgar/browse/?CIK=0001045810" },
  { accession_number: "0001018724-24-000129", cik: "0001018724", ticker: "AMZN", company_name: "Amazon.com, Inc.", form_type: "10-Q", filing_date: "2024-10-31", filing_url: "https://www.sec.gov/edgar/browse/?CIK=0001018724" },
  { accession_number: "0001652044-24-000088", cik: "0001652044", ticker: "GOOGL", company_name: "Alphabet Inc.", form_type: "10-Q", filing_date: "2024-10-29", filing_url: "https://www.sec.gov/edgar/browse/?CIK=0001652044" },
  { accession_number: "0001984501-24-000015", cik: "0001984501", ticker: "TW-EQ", company_name: "Token World Exchange ATS Corp.", form_type: "8-K", filing_date: "2024-11-04", filing_url: "https://www.sec.gov/edgar/browse/?CIK=0001984501" },
  { accession_number: "0001984501-24-000016", cik: "0001984502", ticker: "TREE3", company_name: "TREE3 Sovereign Ecosystem Foundation", form_type: "10-K", filing_date: "2024-11-05", filing_url: "https://www.sec.gov/edgar/browse/?CIK=0001984502" },
];

export const SEED_POSTGRES_FACTS = [
  { accession_number: "0000320193-24-000106", concept: "Revenue", value: 391035000000, unit: "USD", period_end: "2024-09-28" },
  { accession_number: "0000320193-24-000106", concept: "NetIncomeLoss", value: 96995000000, unit: "USD", period_end: "2024-09-28" },
  { accession_number: "0000320193-24-000106", concept: "Assets", value: 352755000000, unit: "USD", period_end: "2024-09-28" },
  { accession_number: "0000789019-24-000038", concept: "Revenue", value: 65585000000, unit: "USD", period_end: "2024-09-30" },
  { accession_number: "0000789019-24-000038", concept: "NetIncomeLoss", value: 24667000000, unit: "USD", period_end: "2024-09-30" },
  { accession_number: "0001045810-24-000092", concept: "Revenue", value: 35082000000, unit: "USD", period_end: "2024-10-27" },
  { accession_number: "0001045810-24-000092", concept: "NetIncomeLoss", value: 19309000000, unit: "USD", period_end: "2024-10-27" },
  { accession_number: "0001018724-24-000129", concept: "Revenue", value: 158877000000, unit: "USD", period_end: "2024-09-30" },
  { accession_number: "0001652044-24-000088", concept: "Revenue", value: 88268000000, unit: "USD", period_end: "2024-09-30" },
  { accession_number: "0001984501-24-000015", concept: "Revenue", value: 12400000000, unit: "USD", period_end: "2024-09-30" },
  { accession_number: "0001984501-24-000016", concept: "Revenue", value: 580000000, unit: "USD", period_end: "2024-10-31" },
];

export const SEED_POSTGRES_EMBEDDINGS: FilingEmbeddingRecord[] = [
  {
    id: 1,
    accession_number: "0000789019-24-000038",
    ticker: "MSFT",
    chunk_id: 101,
    section: "Item 1A Risk Factors",
    content: "Cloud infrastructure capital expenditures and power generation constraints: Scale-up of Azure AI data centers faces energy availability risks, specialized GPU supply chain volatility, and local regulatory environmental approvals.",
    tags: ["cloud-computing", "microsoft", "azure", "ai", "energy", "infrastructure"],
  },
  {
    id: 2,
    accession_number: "0000789019-24-000038",
    ticker: "MSFT",
    chunk_id: 102,
    section: "Item 1A Risk Factors",
    content: "Cybersecurity and state-sponsored intrusion risks: Following Midnight Blizzard attack, the Secure Future Initiative (SFI) mandates tenant isolation and enhanced token authentication across all cloud services.",
    tags: ["cybersecurity", "microsoft", "sfi", "breach", "state-sponsored", "authentication"],
  },
  {
    id: 3,
    accession_number: "0001045810-24-000092",
    ticker: "NVDA",
    chunk_id: 201,
    section: "Item 8.01 Other Events",
    content: "Department of Justice subpoena inquiry regarding GPU market distribution contracts: Company received formal information demands regarding customer allocation and licensing terms for accelerator clusters.",
    tags: ["investigation", "subpoena", "doj", "antitrust", "nvidia", "gpu"],
  },
  {
    id: 4,
    accession_number: "0001045810-24-000099",
    ticker: "NVDA",
    chunk_id: 202,
    section: "Item 8.01 Other Events",
    content: "Export control volatility and secondary sanctions review: International trade authorities issued inquiries into third-party distributor shipments to non-authorized sovereign territories.",
    tags: ["sanctions", "export-control", "nvidia", "regulatory", "distributor", "sovereign"],
  },
  {
    id: 5,
    accession_number: "0001018724-24-000129",
    ticker: "AMZN",
    chunk_id: 301,
    section: "Item 1A Risk Factors",
    content: "AWS cloud computing energy capacity limits and antitrust scrutiny: Federal Trade Commission litigation challenging marketplace bundling and cloud service multi-year commitments.",
    tags: ["cloud-computing", "aws", "amazon", "ftc", "antitrust", "litigation"],
  },
  {
    id: 6,
    accession_number: "0001652044-24-000088",
    ticker: "GOOGL",
    chunk_id: 401,
    section: "Item 1A Risk Factors",
    content: "Search distribution remedies and antitrust trials: Ongoing federal court proceedings regarding default distribution contracts and behavioral remedies that could affect Google Cloud and AI integration.",
    tags: ["google", "antitrust", "remedies", "litigation", "ai", "search"],
  },
  {
    id: 7,
    accession_number: "0000320193-24-000106",
    ticker: "AAPL",
    chunk_id: 501,
    section: "Item 1A Risk Factors",
    content: "App Store commission litigation and EU Digital Markets Act compliance: Legal action by US Department of Justice and EU regulatory mandates forcing alternative app marketplace side-loading.",
    tags: ["apple", "litigation", "regulatory", "eu-dma", "app-store", "compliance"],
  },
  {
    id: 8,
    accession_number: "0001984501-24-000015",
    ticker: "TW-EQ",
    chunk_id: 601,
    section: "Item 8.01 Other Events",
    content: "Token World Exchange ATS Form ATS-N operational approval: Integration of SEC Rule 15c3-5 automated risk collars and DTCC FAST transfer agent with zero cybersecurity incidents recorded across 52 liquidity routing nodes.",
    tags: ["ats", "twe", "finra", "sec-rule-15c3-5", "dtcc", "settlement"],
  },
];

export const PRESET_SQL_QUERIES = [
  {
    id: "latest_10k",
    title: "1. Latest 10-Ks",
    description: "Retrieve all annual 10-K reports sorted by filing date descending",
    sql: `SELECT\n    ticker,\n    filing_date,\n    accession_number\nFROM filings\nWHERE form_type='10-K'\nORDER BY filing_date DESC;`,
  },
  {
    id: "latest_8k",
    title: "2. Latest 8-Ks",
    description: "Fetch breaking 8-K disclosures with accession metadata",
    sql: `SELECT *\nFROM filings\nWHERE form_type='8-K'\nORDER BY filing_date DESC\nLIMIT 50;`,
  },
  {
    id: "revenue_history",
    title: "3. Revenue History",
    description: "Query extracted GAAP XBRL facts for Revenue across all entities",
    sql: `SELECT\n    period_end,\n    concept,\n    value\nFROM financial_facts\nWHERE concept='Revenue'\nORDER BY period_end DESC;`,
  },
  {
    id: "ai_search",
    title: "4. pgvector AI Search",
    description: "Cosine similarity search over Item 1A and 8.01 1536-dim embeddings",
    sql: `SELECT content\nFROM filing_embeddings\nORDER BY embedding <=> :query_embedding\nLIMIT 5;`,
  },
];

export function executePostgreSqlQuery(rawSql: string, vectorQueryParam?: string): PostgresQueryResult {
  const startTime = performance.now();
  const sql = rawSql.trim().replace(/;/g, "");
  const normalized = sql.toLowerCase();

  let columns: string[] = [];
  let rows: (string | number | null)[][] = [];

  if (normalized.includes("from filing_embeddings") || normalized.includes("<=>")) {
    // Vector search simulation
    columns = ["accession_number", "ticker", "section", "similarity_score", "content"];
    const queryTerm = (vectorQueryParam || "risk").toLowerCase();
    
    const scored = SEED_POSTGRES_EMBEDDINGS.map((emb) => {
      let score = 0.55;
      const lowerContent = emb.content.toLowerCase();
      for (const tag of emb.tags) {
        if (queryTerm.includes(tag) || tag.includes(queryTerm)) score += 0.25;
      }
      const words = queryTerm.split(/\s+/);
      for (const w of words) {
        if (w.length > 3 && lowerContent.includes(w)) score += 0.15;
      }
      return { ...emb, score: Math.min(0.98, Number(score.toFixed(3))) };
    });

    scored.sort((a, b) => b.score - a.score);
    rows = scored.slice(0, 5).map((r) => [
      r.accession_number,
      r.ticker,
      r.section,
      `${(r.score * 100).toFixed(1)}% match`,
      r.content,
    ]);
  } else if (normalized.includes("from financial_facts")) {
    if (normalized.includes("concept='revenue'") || normalized.includes('concept="revenue"')) {
      columns = ["period_end", "concept", "value"];
      rows = SEED_POSTGRES_FACTS.filter((f) => f.concept === "Revenue")
        .sort((a, b) => new Date(b.period_end).getTime() - new Date(a.period_end).getTime())
        .map((f) => [f.period_end, f.concept, `$${(f.value / 1e9).toFixed(2)}B (${f.value.toLocaleString()} USD)`]);
    } else {
      columns = ["accession_number", "concept", "value", "unit", "period_end"];
      rows = SEED_POSTGRES_FACTS.map((f) => [
        f.accession_number,
        f.concept,
        `$${(f.value / 1e9).toFixed(2)}B`,
        f.unit,
        f.period_end,
      ]);
    }
  } else if (normalized.includes("from filings")) {
    if (normalized.includes("form_type='10-k'") || normalized.includes('form_type="10-k"')) {
      columns = ["ticker", "filing_date", "accession_number"];
      rows = SEED_POSTGRES_FILINGS.filter((f) => f.form_type === "10-K")
        .sort((a, b) => new Date(b.filing_date).getTime() - new Date(a.filing_date).getTime())
        .map((f) => [f.ticker, f.filing_date, f.accession_number]);
    } else if (normalized.includes("form_type='8-k'") || normalized.includes('form_type="8-k"')) {
      columns = ["accession_number", "cik", "ticker", "company_name", "form_type", "filing_date"];
      rows = SEED_POSTGRES_FILINGS.filter((f) => f.form_type === "8-K")
        .sort((a, b) => new Date(b.filing_date).getTime() - new Date(a.filing_date).getTime())
        .map((f) => [f.accession_number, f.cik, f.ticker, f.company_name, f.form_type, f.filing_date]);
    } else {
      columns = ["accession_number", "cik", "ticker", "company_name", "form_type", "filing_date"];
      rows = SEED_POSTGRES_FILINGS.map((f) => [
        f.accession_number,
        f.cik,
        f.ticker,
        f.company_name,
        f.form_type,
        f.filing_date,
      ]);
    }
  } else {
    // Generic fallback query response
    columns = ["accession_number", "ticker", "company_name", "form_type", "filing_date"];
    rows = SEED_POSTGRES_FILINGS.slice(0, 5).map((f) => [
      f.accession_number,
      f.ticker,
      f.company_name,
      f.form_type,
      f.filing_date,
    ]);
  }

  const executionTimeMs = Number((performance.now() - startTime).toFixed(2));

  return {
    columns,
    rows,
    rowCount: rows.length,
    executionTimeMs,
    query: rawSql,
  };
}

// ============================================================================
// NYSE LISTING MANAGER & CORPORATE COMPLIANCE BRIDGE
// ============================================================================

export interface NyseComplianceNotice {
  id: string;
  timestamp: string;
  ticker: string;
  companyName: string;
  noticeType: "FORM_8K_CROSS_FILING" | "SHARE_ISSUANCE_APP" | "CORPORATE_ACTION" | "DTCC_FAST_RECONCILIATION" | "ANNUAL_LISTING_CERT";
  secAccessionNumber: string;
  nyseListingPortalRef: string;
  headline: string;
  status: "CLEARED" | "ACKNOWLEDGED" | "SUBMITTED" | "PENDING_REVIEW";
  transferAgent: string;
  sharesAuthorized: number;
  dtccFastEligibility: boolean;
  notes: string;
}

export const SEED_NYSE_COMPLIANCE_NOTICES: NyseComplianceNotice[] = [
  {
    id: "nyse_not_001",
    timestamp: "2024-11-04T14:30:00Z",
    ticker: "TW-EQ",
    companyName: "Token World Exchange ATS Corp.",
    noticeType: "FORM_8K_CROSS_FILING",
    secAccessionNumber: "0001984501-24-000015",
    nyseListingPortalRef: "NYSE-LM-2024-TWE-0881",
    headline: "Form ATS-N Dual Venue Operational Approval & NYSE Fast Settlement Bridge Addenda",
    status: "CLEARED",
    transferAgent: "Continental Stock Transfer & Trust Company",
    sharesAuthorized: 1000000000,
    dtccFastEligibility: true,
    notes: "Cross-notification confirmed with NYSE Listing Operations. SEC Rule 15c3-5 collars active.",
  },
  {
    id: "nyse_not_002",
    timestamp: "2024-11-05T10:00:00Z",
    ticker: "TREE3",
    companyName: "TREE3 Sovereign Ecosystem Foundation",
    noticeType: "SHARE_ISSUANCE_APP",
    secAccessionNumber: "0001984501-24-000016",
    nyseListingPortalRef: "NYSE-LM-2024-TREE3-0104",
    headline: "Supplemental Listing Application: 50,000,000 ISO 14064-2 Verified Biodiversity Reserve Units",
    status: "CLEARED",
    transferAgent: "Continental Stock Transfer & Trust Company",
    sharesAuthorized: 500000000,
    dtccFastEligibility: true,
    notes: "Approved under NYSE Rule 497 for secondary tokenized environmental asset listings.",
  },
  {
    id: "nyse_not_003",
    timestamp: "2024-11-18T16:45:00Z",
    ticker: "NVDA",
    companyName: "NVIDIA Corporation",
    noticeType: "FORM_8K_CROSS_FILING",
    secAccessionNumber: "0001045810-24-000099",
    nyseListingPortalRef: "NYSE-LM-2024-NVDA-1142",
    headline: "Item 8.01 Disclosure: International Trade Sanction Distributor Review & Subpoena Notice",
    status: "ACKNOWLEDGED",
    transferAgent: "Computershare Trust Company, N.A.",
    sharesAuthorized: 2500000000,
    dtccFastEligibility: true,
    notes: "NYSE Market Surveillance notified regarding pre-market secondary volatility monitoring.",
  },
  {
    id: "nyse_not_004",
    timestamp: "2024-11-01T20:45:00Z",
    ticker: "AAPL",
    companyName: "Apple Inc.",
    noticeType: "ANNUAL_LISTING_CERT",
    secAccessionNumber: "0000320193-24-000106",
    nyseListingPortalRef: "NYSE-LM-2024-AAPL-0092",
    headline: "Fiscal Year 2024 Annual Written Affirmation & Corporate Governance Listing Compliance",
    status: "CLEARED",
    transferAgent: "Computershare Trust Company, N.A.",
    sharesAuthorized: 15500000000,
    dtccFastEligibility: true,
    notes: "Full adherence with Section 303A Corporate Governance standards affirmed.",
  },
];

// ============================================================================
// DUCKDB PARQUET, PANDAS & S3 MANIFEST EXPORTERS
// ============================================================================

export function exportDuckDbParquetScript(): void {
  const pythonScript = `# =============================================================================
# Token World Exchange ATS® (TWE)
# Creator: Mauro Lomibao Dar III <maurodar08@gmail.com>
# 945 Westholme Avenue Los Angeles California 90024
#
# DuckDB Parquet Ingestion & Quantitative Analytics Pipeline
# =============================================================================
import duckdb
import pandas as pd
import json

print("Initializing DuckDB In-Memory & Parquet Pipeline...")
con = duckdb.connect("sec_edgar_analytics.duckdb")

# 1. Install & load spatial/vector extensions if needed
con.execute("INSTALL json; LOAD json;")

# 2. Ingest hybrid relational tables from CSV
print("Ingesting SEC filings and financial facts...")
con.execute("""
CREATE OR REPLACE TABLE filings AS 
SELECT * FROM read_csv_auto('filings.csv');

CREATE OR REPLACE TABLE financial_facts AS 
SELECT * FROM read_csv_auto('financial_facts.csv');

CREATE OR REPLACE TABLE filing_embeddings AS 
SELECT * FROM read_csv_auto('filing_embeddings.csv');
""")

# 3. Export high-performance compressed Parquet files
print("Exporting compressed Parquet files (ZSTD)...")
con.execute("COPY filings TO 'filings.parquet' (FORMAT PARQUET, COMPRESSION ZSTD);")
con.execute("COPY financial_facts TO 'financial_facts.parquet' (FORMAT PARQUET, COMPRESSION ZSTD);")
con.execute("COPY filing_embeddings TO 'filing_embeddings.parquet' (FORMAT PARQUET, COMPRESSION ZSTD);")

# 4. Multi-entity quantitative screening query (Power BI / Pandas ready)
print("Executing quantitative GAAP XBRL fact screening...")
df_revenue = con.execute("""
    SELECT 
        f.ticker,
        f.company_name,
        ff.concept,
        ff.value,
        ff.period_end,
        f.form_type,
        f.filing_date
    FROM filings f
    JOIN financial_facts ff ON f.accession_number = ff.accession_number
    WHERE ff.concept = 'Revenue'
    ORDER BY ff.period_end DESC;
""").df()

print("Top GAAP Revenue Records:")
print(df_revenue.head(10))

# 5. Export processed facts to Power BI format
df_revenue.to_csv("power_bi_feed.csv", index=False)
print("SUCCESS: DuckDB Parquet pipeline executed. Ready for Pandas and Power BI.")
`;

  const blob = new Blob([pythonScript], { type: "text/x-python;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `export_duckdb_parquet_${new Date().toISOString().slice(0, 10)}.py`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportPandasCsvBundle(): void {
  // Filings CSV
  const filingsHeaders = ["accession_number", "cik", "ticker", "company_name", "form_type", "filing_date", "filing_url"];
  const filingsRows = SEED_POSTGRES_FILINGS.map((f) => [
    `"${f.accession_number}"`,
    `"${f.cik}"`,
    `"${f.ticker}"`,
    `"${f.company_name.replace(/"/g, '""')}"`,
    `"${f.form_type}"`,
    `"${f.filing_date}"`,
    `"${f.filing_url}"`,
  ]);
  const filingsCsv = [filingsHeaders.join(","), ...filingsRows.map((r) => r.join(","))].join("\n");

  // Financial Facts CSV
  const factsHeaders = ["accession_number", "concept", "value", "unit", "period_end"];
  const factsRows = SEED_POSTGRES_FACTS.map((f) => [
    `"${f.accession_number}"`,
    `"${f.concept}"`,
    f.value,
    `"${f.unit}"`,
    `"${f.period_end}"`,
  ]);
  const factsCsv = [factsHeaders.join(","), ...factsRows.map((r) => r.join(","))].join("\n");

  // Embeddings CSV
  const embHeaders = ["id", "accession_number", "ticker", "chunk_id", "section", "content", "tags"];
  const embRows = SEED_POSTGRES_EMBEDDINGS.map((e) => [
    e.id,
    `"${e.accession_number}"`,
    `"${e.ticker}"`,
    e.chunk_id,
    `"${e.section}"`,
    `"${e.content.replace(/"/g, '""')}"`,
    `"${e.tags.join(";")}"`,
  ]);
  const embCsv = [embHeaders.join(","), ...embRows.map((r) => r.join(","))].join("\n");

  // Combined bundle format
  const combinedPayload = `=== FILINGS METADATA (filings.csv) ===\n${filingsCsv}\n\n=== FINANCIAL FACTS (financial_facts.csv) ===\n${factsCsv}\n\n=== FILING EMBEDDINGS (filing_embeddings.csv) ===\n${embCsv}\n`;

  const blob = new Blob([combinedPayload], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pandas_sec_analytics_bundle_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportS3Manifest(): void {
  const manifest = {
    organization: "Token World Exchange ATS® (TWE)",
    owner_creator: "Mauro Lomibao Dar III",
    contact_email: "maurodar08@gmail.com",
    address: "945 Westholme Avenue Los Angeles California 90024",
    generated_at: new Date().toISOString(),
    s3_root_bucket: "s3://twe-sec-edgar-archives-production/",
    production_layout: {
      raw_html: "s3://twe-sec-edgar-archives-production/raw_html/{cik}/{accession_number}.htm",
      xbrl: "s3://twe-sec-edgar-archives-production/xbrl/{cik}/{accession_number}_facts.xml",
      daily_archives: "s3://twe-sec-edgar-archives-production/archives/{date}/daily_index.zip",
      parquet_storage: "s3://twe-sec-edgar-archives-production/parquet/",
    },
    analytics_integrations: {
      duckdb: "duckdb.connect('s3://twe-sec-edgar-archives-production/parquet/filings.parquet')",
      pandas: "pd.read_parquet('s3://twe-sec-edgar-archives-production/parquet/financial_facts.parquet')",
      power_bi: "https://analytics.tokenworld.exchange/v1/powerbi/facts",
    },
    table_row_counts: {
      filings: SEED_POSTGRES_FILINGS.length,
      financial_facts: SEED_POSTGRES_FACTS.length,
      filing_embeddings: SEED_POSTGRES_EMBEDDINGS.length,
    },
  };

  const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `s3_production_manifest_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadNyseCompliancePacket(notice: NyseComplianceNotice): void {
  const content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>NYSE Listing Manager Compliance Notice - ${notice.nyseListingPortalRef}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; max-width: 850px; margin: 40px auto; padding: 0 20px; color: #0f172a; }
    header { border-bottom: 3px solid #f59e0b; padding-bottom: 16px; margin-bottom: 24px; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-weight: bold; background: #fef3c7; color: #b45309; }
    .status { display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: bold; background: #dcfce7; color: #15803d; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0; }
    .field { font-size: 13px; }
    .field strong { display: block; font-size: 11px; text-transform: uppercase; color: #64748b; }
    footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <header>
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span class="badge">NYSE LISTING MANAGER & SEC DUAL COMPLIANCE</span>
      <span class="status">${notice.status}</span>
    </div>
    <h1 style="margin: 12px 0 4px 0;">${notice.companyName} (${notice.ticker})</h1>
    <p style="margin: 0; color: #64748b; font-family: monospace;">Portal Ref: ${notice.nyseListingPortalRef} | SEC Accession: ${notice.secAccessionNumber}</p>
  </header>

  <div class="grid">
    <div class="field"><strong>Notice Type</strong>${notice.noticeType}</div>
    <div class="field"><strong>Timestamp</strong>${notice.timestamp}</div>
    <div class="field"><strong>Transfer Agent</strong>${notice.transferAgent}</div>
    <div class="field"><strong>DTCC FAST Eligibility</strong>${notice.dtccFastEligibility ? "YES (Verified)" : "NO"}</div>
    <div class="field"><strong>Authorized Shares</strong>${notice.sharesAuthorized.toLocaleString()}</div>
    <div class="field"><strong>Venue</strong>Token World Exchange ATS® (TWE) & NYSE Dual Venue</div>
  </div>

  <h2>Compliance Disclosure Subject:</h2>
  <p><strong>${notice.headline}</strong></p>

  <h3>Operational & Regulatory Notes:</h3>
  <p>${notice.notes}</p>

  <footer>
    <p><strong>Token World Exchange ATS® (TWE)</strong><br>
    Sole Owner and Creator: Mauro Lomibao Dar III (maurodar08@gmail.com)<br>
    945 Westholme Avenue, Los Angeles, California 90024</p>
  </footer>
</body>
</html>`;

  const blob = new Blob([content], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${notice.ticker}_NYSE_COMPLIANCE_${notice.nyseListingPortalRef}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// GEMINI 3.8 FLASH MD&A ITEM 7 SENTIMENT EXTRACTION SERVICE
// ============================================================================

export interface SampleMdaEntry {
  ticker: string;
  companyName: string;
  fiscalPeriod: string;
  accession: string;
  cik: string;
  excerpt: string;
}

export const SAMPLE_MDA_TEXTS: Record<string, SampleMdaEntry> = {
  NVDA: {
    ticker: "NVDA",
    companyName: "NVIDIA Corporation",
    fiscalPeriod: "FY 2024 / Q4 10-K Annual Report",
    accession: "0001045810-24-000029",
    cik: "0001045810",
    excerpt: `ITEM 7. MANAGEMENT'S DISCUSSION AND ANALYSIS OF FINANCIAL CONDITION AND RESULTS OF OPERATIONS

Overview and Market Dynamics:
During fiscal year 2024, our Data Center revenue reached unprecedented levels, driven by the global transition from general-purpose computing to accelerated computing and generative artificial intelligence. Compute platform demand from hyperscale cloud service providers, enterprise software companies, and sovereign AI initiatives outpaced our near-term component supply. The ramp of our Hopper architecture computing platforms and the preview introduction of our next-generation Blackwell architecture represent generational technological leaps. We observed gross margin expansion to 72.7%, reflecting rich software and networking attach rates, including Quantum-2 InfiniBand and Spectrum-X Ethernet solutions.

Operating Expenses and Capital Investments:
Research and development expenses increased 18% to $8.68 billion, reflecting accelerated hiring in engineering disciplines, tape-out and mask charges for advanced process nodes, and strategic investments in infrastructure clusters. We expect capital expenditures to grow significantly in fiscal 2025 as we procure dedicated high-density datacenter testing facilities and expand long-term wafer packaging agreements with TSMC CoWoS packaging facilities.

Forward Outlook, Supply Chain, and Regulatory Disclosures:
Demand for our accelerated computing hardware exceeds supply, and we anticipate customer allocations will remain tight through upcoming quarters. Global export control regulations promulgated by the U.S. Department of Commerce have impacted product availability for certain regional markets, specifically China. While we developed alternative configurations compliant with current control thresholds, changes in geopolitical trade restrictions, semiconductor tariffs, or unilateral licensing mandates could materially diminish addressable market volume. Furthermore, high customer concentration among top cloud providers creates potential revenue volatility should macroeconomic capital allocation slow. Management remains highly confident in structural secular demand for accelerated compute workloads.`,
  },
  AAPL: {
    ticker: "AAPL",
    companyName: "Apple Inc.",
    fiscalPeriod: "FY 2024 10-K Annual Report",
    accession: "0000320193-24-000106",
    cik: "0000320193",
    excerpt: `ITEM 7. MANAGEMENT'S DISCUSSION AND ANALYSIS OF FINANCIAL CONDITION AND RESULTS OF OPERATIONS

Business Highlights and Ecosystem Execution:
Fiscal year 2024 demonstrated the enduring strength of our active installed base of devices, surpassing 2.2 billion active devices worldwide across all product categories. Services revenue set an all-time record of $96.17 billion, generating a gross margin of 74.0%. Hardware gross margin remained stable at 36.8%, benefiting from favorable memory pricing and supply chain operational efficiencies, offset by foreign exchange headwinds in key European and Asian markets. The introduction of Apple Intelligence across iOS, iPadOS, and macOS represents our deliberate integration of on-device privacy-preserving generative foundation models.

Liquidity and Capital Return:
We generated $108.3 billion in operating cash flow during the fiscal year, retiring $95.9 billion in shares through accelerated repurchases and maintaining our commitment to reaching net cash neutrality over time. Commercial paper facilities and fixed-rate notes remain rated investment-grade with minimal credit spread expansion.

Regulatory Environment and Forward Headwinds:
We face complex regulatory examinations across several jurisdictions, including ongoing compliance mandates under the European Union Digital Markets Act (DMA) requiring alternative app marketplace distribution and browser engine modifications. Adverse administrative rulings or ongoing antitrust actions brought by the U.S. Department of Justice could require changes to our App Store fee structures, impacting high-margin Services revenue. Additionally, supply chain logistics remain subject to geopolitical tensions and single-source component manufacturing dependencies. Management maintains a disciplined cost posture while expanding targeted investments in custom Apple Silicon architectures.`,
  },
  MSFT: {
    ticker: "MSFT",
    companyName: "Microsoft Corporation",
    fiscalPeriod: "FY 2024 10-K Annual Report",
    accession: "0000789019-24-000045",
    cik: "0000789019",
    excerpt: `ITEM 7. MANAGEMENT'S DISCUSSION AND ANALYSIS OF FINANCIAL CONDITION AND RESULTS OF OPERATIONS

Intelligent Cloud and AI Commercial Monetization:
In fiscal year 2024, Microsoft Cloud revenue surpassed $137 billion, increasing 23% year-over-year. Azure and other cloud services grew 30%, driven by enterprise workload migrations and expanding contributions from Azure OpenAI Service. We observed rapid customer adoption of Microsoft Copilot solutions across our M365 commercial suites, accelerating average revenue per user (ARPU) across corporate seats. Commercial remaining performance obligations (RPO) grew 20% to $269 billion, reflecting multi-year institutional cloud agreements.

Capital Allocation and Infrastructure Buildout:
Capital expenditures, including assets acquired under finance leases, were $55.7 billion, driven by surging enterprise demand for AI infrastructure. Over half of our cloud and AI capital spend was directed toward cloud datacenter real estate, electrical substation interconnects, and long-lead networking infrastructure designed to support multi-decade computing workloads. We anticipate continuing aggressive capital allocation in fiscal 2025 to meet contracted GPU cluster demand.

Risk Considerations:
Cloud capacity constraints in certain geographic regions have temporarily capped near-term revenue potential for compute-intensive AI inferencing. Furthermore, regulatory inquiries from the FTC, European Commission, and UK Competition and Markets Authority regarding partnership investments in foundation model creators and gaming acquisitions create potential legal costs and compliance overhead. Operating margin expansion may face intermediate friction as depreciation from massive infrastructure assets flows into cost of revenue.`,
  },
  AMZN: {
    ticker: "AMZN",
    companyName: "Amazon.com, Inc.",
    fiscalPeriod: "FY 2024 10-K Annual Report",
    accession: "0001018724-24-000038",
    cik: "0001018724",
    excerpt: `ITEM 7. MANAGEMENT'S DISCUSSION AND ANALYSIS OF FINANCIAL CONDITION AND RESULTS OF OPERATIONS

Operating Performance and Regional Logistics:
Net sales increased 12% to $574.8 billion in 2024. AWS segment sales grew 13% to $90.8 billion, with operating margin expanding to 30.2% as cloud optimization cycles moderated and customers deployed new generative AI workloads on Trainium and Inferentia chips. Our regionalized North American fulfillment network reduced cost-to-serve per unit while accelerating same-day and next-day delivery speeds. Advertising services maintained double-digit growth, underpinned by sponsored products and Prime Video ad insertions.

Capital Expenditures and Free Cash Flow:
Free cash flow improved substantially to $36.8 billion, up from negative territory in prior periods. Capital expenditures were approximately $48.4 billion, shifting from fulfillment warehouse footprint expansion toward AWS server infrastructure, custom silicon, and Project Kuiper satellite constellation launches.

Risk Factors & Cost Pressures:
Inflationary shipping and transportation fuel costs, labor wage market adjustments, and energy availability for next-generation datacenters remain top operational considerations. Additionally, ongoing antitrust litigation and regulatory scrutiny regarding retail platform parity provisions could affect marketplace operations. Management remains committed to rigorous cost discipline and continuous efficiency gains.`,
  },
  GOOGL: {
    ticker: "GOOGL",
    companyName: "Alphabet Inc.",
    fiscalPeriod: "FY 2024 10-K Annual Report",
    accession: "0001652044-24-000031",
    cik: "0001652044",
    excerpt: `ITEM 7. MANAGEMENT'S DISCUSSION AND ANALYSIS OF FINANCIAL CONDITION AND RESULTS OF OPERATIONS

Search, Cloud, and Gemini Model Deployment:
Consolidated revenues in 2024 reached $307.4 billion, an increase of 9% year-over-year. Google Cloud delivered $33.1 billion with operating income turning strongly positive to $1.7 billion, reflecting economies of scale across enterprise cloud infrastructure and Google Workspace AI add-ons. Google Services revenue grew 8%, supported by robust search query volume in retail and travel, along with YouTube subscription growth (YouTube TV and Music/Premium).

AI Capex and Infrastructure Strategy:
We accelerated our technical infrastructure investment, deploying the Gemini model family across all consumer touchpoints and Google Cloud Vertex AI. Capital expenditures in property and equipment were $32.3 billion, primarily for technical infrastructure including TPU clusters, servers, and subsea fiber data center interconnects.

Legal, Regulatory, and Antitrust Matters:
We face significant antitrust litigation from the U.S. Department of Justice, state attorneys general, and international authorities regarding search distribution agreements and ad tech monetization tools. Potential structural remedies, behavioral restrictions, or substantial monetary fines could impact commercial distribution economics. Management is actively appealing adverse rulings while re-architecting product surface areas to satisfy emerging AI safety and digital markets regulatory mandates.`,
  },
  "TW-EQ": {
    ticker: "TW-EQ",
    companyName: "Token World Exchange ATS® (TWE)",
    fiscalPeriod: "FY 2024 SEC Form ATS-R / Annual Audited Ledger",
    accession: "0001999888-24-000001",
    cik: "0001999888",
    excerpt: `ITEM 7. MANAGEMENT'S DISCUSSION AND ANALYSIS OF OPERATING PERFORMANCE AND ATS MATCHING INFRASTRUCTURE

ATS Trading Volume & Matching Engine Scalability:
Token World Exchange ATS® (TWE), established by Owner and Creator Mauro Lomibao Dar III, achieved a landmark operational milestone in fiscal year 2024. Secondary matching volume across private corporate equity tokens and real estate security tokens reached $842 million, representing an annualized growth rate of 144%. The migration of the central order book to a low-latency C++ / WebAssembly sub-millisecond matching engine reduced average execution latency to 140 microseconds. SEC Rule 15c3-5 pre-trade risk filter intercept rates remained at 99.999% with zero unauthorized market access violations.

Regulatory Compliance & DTCC Settlement Coordination:
TWE maintains dual-venue notification alignment with the New York Stock Exchange (NYSE) Listing Manager and real-time clearance reporting under SEC Regulation ATS. Transfer agent reconciliations with DTCC FAST eligible repositories maintained zero settlement fails across the full fiscal cycle. Operating cash reserves dedicated to broker-dealer clearing collateral exceed SEC net capital requirements by 210%.

Strategic Outlook & Expansion:
We project secondary digital security token volume to expand threefold in fiscal 2025 as institutional market makers leverage our Direct FIX Level 2 depth feeds. Pre-trade collar mechanisms have been updated to dynamically adjust during high volatility SEC 8-K disclosure events, safeguarding retail and institutional liquidity providers against flash dislocations.`,
  },
  TREE3: {
    ticker: "TREE3",
    companyName: "Dar Global Carbon Token (TWE ATS)",
    fiscalPeriod: "FY 2024 Verra & SEC Verified Environmental Ledger",
    accession: "0001999888-24-000002",
    cik: "0001999888",
    excerpt: `ITEM 7. MANAGEMENT'S DISCUSSION AND ANALYSIS OF CARBON ASSET RESERVES AND SECONDARY ATS TRADING

Verified Carbon Reserves and Tokenized Yield:
The Dar Global Carbon Asset trust holds 2.4 million metric tonnes of verified carbon units (VCUs) registered across Verra, Gold Standard, and the California Air Resources Board (CARB) compliance registry. Secondary market turnover on Token World Exchange ATS® averaged $14.2 million monthly, with tokenized institutional retirement offsets increasing 88% year-over-year. Net asset value (NAV) per token appreciated 11.4% to $28.40, reflecting tightening compliance supply.

Governance & Audited Custody:
Digital asset custody is maintained in multisig cold storage backed by real-time satellite canopy verification audits. Capital reserves dedicated to registry retirement fees and transfer agent compliance remain fully funded in Treasury bills. Management anticipates introducing voluntary corporate retirement escrow contracts in fiscal 2025 to enable Fortune 500 corporations to automate Scope 1 and Scope 2 compliance.`,
  },
};

/**
 * Calls backend Gemini 3.8 Flash endpoint to analyze MD&A Item 7 tone.
 */
export async function fetchMdaSentiment(
  ticker: string,
  companyName?: string,
  fiscalYear?: string,
  customMdaText?: string
): Promise<{ success: boolean; data: MdaSentimentResult; isSimulated?: boolean; error?: string }> {
  const t = ticker.toUpperCase();
  const sample = SAMPLE_MDA_TEXTS[t];
  const textToAnalyze = customMdaText || sample?.excerpt || `ITEM 7. MANAGEMENT'S DISCUSSION AND ANALYSIS OF FINANCIAL CONDITION AND RESULTS OF OPERATIONS for ${companyName || t}. Operations expanded moderately with disciplined capital investment.`;

  try {
    const res = await fetch("/api/gemini/sec-mda-sentiment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticker: t,
        companyName: companyName || sample?.companyName || `${t} Corporation`,
        fiscalYear: fiscalYear || sample?.fiscalPeriod || "FY 2024 10-K Annual Report",
        accessionNumber: sample?.accession || "SEC-10K-OFFICIAL",
        mdaText: textToAnalyze,
      }),
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const json = await res.json();
    return {
      success: true,
      data: {
        ...json.data,
        analyzedAt: new Date().toLocaleTimeString(),
      },
      isSimulated: json.isSimulated,
    };
  } catch (err: any) {
    console.warn("fetchMdaSentiment fallback triggered:", err?.message || err);
    // Reliable deterministic fallback for offline / disconnected states
    const fallbackScore = t === "NVDA" ? 86 : t === "MSFT" ? 79 : t === "AAPL" ? 72 : t === "TW-EQ" ? 92 : 68;
    return {
      success: true,
      isSimulated: true,
      data: {
        ticker: t,
        companyName: companyName || sample?.companyName || `${t} Corporation`,
        fiscalPeriod: fiscalYear || sample?.fiscalPeriod || "FY 2024 10-K Annual Report",
        accessionNumber: sample?.accession || "0001045810-24-000029",
        overallScore: fallbackScore,
        sentimentLabel: fallbackScore > 80 ? "Bullish / Strong Expansion" : fallbackScore > 65 ? "Cautiously Optimistic" : "Neutral / Balanced",
        confidenceScore: 92,
        toneDimensions: {
          optimismVsCaution: fallbackScore > 80 ? 88 : 72,
          forwardGuidanceConviction: 84,
          capitalExpenditureAggression: 89,
          inflationaryAndCostPressure: 48,
          regulatoryAndLitigationConcern: 56,
        },
        executiveSummary: `Management expressed strong commercial conviction and operational momentum driven by secular compute demand and expanding gross margins, while carefully noting regulatory export compliance and infrastructure capacity bottlenecks.`,
        keyBullishSignals: [
          `Unprecedented demand across hyperscale cloud and enterprise customers driving multi-quarter backlog visibility.`,
          `Gross margin expansion supported by high-margin software and proprietary networking attach rates.`,
          `Generational technological architecture rollout solidifying long-term competitive moat.`,
        ],
        keyCautionaryRisks: [
          `Geopolitical export controls and international trade restrictions potentially restricting addressable market sizing.`,
          `Near-term packaging and semiconductor foundry capacity constraints limiting product delivery velocity.`,
          `High customer concentration among premier cloud providers creating exposure to customer capex digestion cycles.`,
        ],
        actionableTakeawayForATS: `Recommend maintaining standard pre-trade liquidity collars on Token World Exchange ATS® with active SEC Rule 15c3-5 order limits.`,
        analyzedAt: new Date().toLocaleTimeString(),
      },
    };
  }
}

/**
 * Downloads a structured MD&A sentiment analysis executive report as a Markdown file.
 */
export function exportMdaSentimentReportMarkdown(sentiment: MdaSentimentResult): void {
  const content = `# SEC FORM 10-K MD&A SENTIMENT & TONE ANALYSIS
## Token World Exchange ATS® (TWE) & Gemini 3.8 Flash Analysis Engine
---
**Venue:** Token World Exchange ATS® (TWE)
**Owner & Creator:** Mauro Lomibao Dar III (maurodar08@gmail.com)
**Address:** 945 Westholme Avenue, Los Angeles, California 90024
**Report Generated:** ${new Date().toLocaleString()}

### Company & Filing Profile
- **Ticker Symbol:** ${sentiment.ticker}
- **Company Name:** ${sentiment.companyName}
- **Filing Period:** ${sentiment.fiscalPeriod}
- **SEC Accession:** ${sentiment.accessionNumber || "SEC-10K-OFFICIAL"}
- **Model Engine:** ${sentiment.modelUsed || "Gemini 3.8 Flash (Server-Side Proxy)"}

---

### Executive Sentiment Scorecard
- **Overall Tone Score:** ${sentiment.overallScore > 0 ? "+" : ""}${sentiment.overallScore} / 100
- **Classification:** ${sentiment.sentimentLabel}
- **Confidence Rating:** ${sentiment.confidenceScore}% Institutional Certainty

### 5-Dimensional Tone Breakdown (0 - 100 Scale)
1. **Optimism vs. Caution:** ${sentiment.toneDimensions.optimismVsCaution} / 100
2. **Forward Guidance Conviction:** ${sentiment.toneDimensions.forwardGuidanceConviction} / 100
3. **Capital Expenditure Aggression:** ${sentiment.toneDimensions.capitalExpenditureAggression} / 100
4. **Inflationary & Cost Headwinds:** ${sentiment.toneDimensions.inflationaryAndCostPressure} / 100
5. **Regulatory & Litigation Concerns:** ${sentiment.toneDimensions.regulatoryAndLitigationConcern} / 100

---

### Executive Summary
${sentiment.executiveSummary}

---

### Key Bullish Management Signals & Catalysts
${sentiment.keyBullishSignals.map((s, i) => `${i + 1}. "${s}"`).join("\n")}

### Key Cautionary Disclosures & Risk Nuances
${sentiment.keyCautionaryRisks.map((r, i) => `${i + 1}. "${r}"`).join("\n")}

---

### Actionable Takeaway for ATS Market Makers & Execution Venues
${sentiment.actionableTakeawayForATS}

---
*Notice: This report was generated automatically via the SEC EDGAR Item 7 MD&A Analyzer on Token World Exchange ATS® under SEC Regulation ATS and Rule 15c3-5 Pre-Trade Risk standards.*
`;

  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sentiment.ticker}_10K_MDA_SENTIMENT_GEMINI_${Date.now()}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


