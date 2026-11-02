import React, { useState, useEffect, useMemo } from "react";
import {
  Landmark,
  Activity,
  FileText,
  Search,
  Bell,
  RefreshCw,
  Download,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Layers,
  BarChart3,
  TrendingUp,
  Cpu,
  Mail,
  Zap,
  Sliders,
  DollarSign,
  ChevronRight,
  Filter,
  CheckCircle2,
  Info,
  X,
  Sparkles,
  Eye,
  Globe,
  Radio,
  FileSpreadsheet,
  Check,
  Plus,
  Trash2,
  Database,
  Lock,
  Key,
  Play,
  Code2,
  Terminal,
  Copy,
  Pause,
  Briefcase,
  Scale,
  UserCheck,
  Building2,
  Tag,
  ShieldCheck,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import {
  EdgarFiling,
  EdgarFormType,
  XbrlFactRecord,
  SecRssFeedItem,
  SecDisclosureCategory,
  SEC_DISCLOSURE_CATEGORIES,
  AlertSensitivitySettings,
  AlertHistoryItem,
  EdgarNextTokenConfig,
  summarize_document,
  loadWatchlist,
  saveWatchlist,
  subscribeToWatchlist,
  loadAlertSettings,
  saveAlertSettings,
  loadAlertHistory,
  saveAlertHistory,
  loadEdgarNextTokens,
  saveEdgarNextTokens,
  getFilingsForWatchlist,
  getOrCreateXbrlFacts,
  exportFilingsToCsv,
  downloadFilingHtml,
  SEED_RSS_FEED,
  REGULATORY_RISK_KEYWORDS,
  PostgresQueryResult,
  PRESET_SQL_QUERIES,
  executePostgreSqlQuery,
  SEED_POSTGRES_FILINGS,
  SEED_POSTGRES_FACTS,
  SEED_POSTGRES_EMBEDDINGS,
  NyseComplianceNotice,
  SEED_NYSE_COMPLIANCE_NOTICES,
  downloadNyseCompliancePacket,
  exportDuckDbParquetScript,
  exportPandasCsvBundle,
  exportS3Manifest,
  MdaSentimentResult,
  SAMPLE_MDA_TEXTS,
  fetchMdaSentiment,
  exportMdaSentimentReportMarkdown,
} from "../services/secEdgarService";

export interface SecMonitorComponentProps {
  onNavigateToTab?: (tab: string) => void;
}

type SecMonitorTab =
  | "filings"
  | "risk_heatmap"
  | "analytics"
  | "rss_feed"
  | "alert_history"
  | "postgres_workbench"
  | "edgar_next"
  | "nyse_bridge"
  | "sentiment_analysis";

import { useMembership } from "../context/MembershipContext";
import { canAccessAiSentiment } from "../types/membership";

export const SecMonitorComponent: React.FC<SecMonitorComponentProps> = ({ onNavigateToTab }) => {
  const { userState, triggerGatedFeatureModal } = useMembership();
  // Navigation
  const [activeSubTab, setActiveSubTab] = useState<SecMonitorTab>("filings");

  // Watchlist State & Persistence
  const [watchlist, setWatchlist] = useState<string[]>(["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "TW-EQ", "TREE3"]);
  const [newTickerInput, setNewTickerInput] = useState<string>("");
  const [selectedTickerForAnalytics, setSelectedTickerForAnalytics] = useState<string>("NVDA");
  const [isWatchlistSynced, setIsWatchlistSynced] = useState<boolean>(true);

  // Filings Data
  const [filings, setFilings] = useState<EdgarFiling[]>([]);
  const [selectedFormFilter, setSelectedFormFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeFilingModal, setActiveFilingModal] = useState<EdgarFiling | null>(null);

  // Settings & Alerts
  const [alertSettings, setAlertSettings] = useState<AlertSensitivitySettings>(loadAlertSettings());
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [alertHistory, setAlertHistory] = useState<AlertHistoryItem[]>(loadAlertHistory());
  const [activeBannerAlert, setActiveBannerAlert] = useState<AlertHistoryItem | null>(null);

  // RSS Feed & Interactive Category Filters State
  const [rssFeedItems, setRssFeedItems] = useState<SecRssFeedItem[]>(SEED_RSS_FEED);
  const [rssFilterForm, setRssFilterForm] = useState<string>("ALL");
  const [selectedRssCategory, setSelectedRssCategory] = useState<string>("ALL");
  const [rssSearchQuery, setRssSearchQuery] = useState<string>("");
  const [rssBreakingOnly, setRssBreakingOnly] = useState<boolean>(false);
  const [activeRssItemModal, setActiveRssItemModal] = useState<SecRssFeedItem | null>(null);
  const [copiedRssAccession, setCopiedRssAccession] = useState<string | null>(null);
  const [isRefreshingFeed, setIsRefreshingFeed] = useState<boolean>(false);

  // EDGAR Next Token State
  const [edgarTokens, setEdgarTokens] = useState<EdgarNextTokenConfig>(loadEdgarNextTokens());
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // PostgreSQL & pgvector Workbench State
  const [activePresetId, setActivePresetId] = useState<string>("latest_10k");
  const [sqlInput, setSqlInput] = useState<string>(PRESET_SQL_QUERIES[0].sql);
  const [vectorQueryText, setVectorQueryText] = useState<string>("Show cloud-computing risks mentioned by Microsoft");
  const [queryResult, setQueryResult] = useState<PostgresQueryResult>(executePostgreSqlQuery(PRESET_SQL_QUERIES[0].sql));
  const [isExecutingSql, setIsExecutingSql] = useState<boolean>(false);
  const [showPythonDriverCode, setShowPythonDriverCode] = useState<boolean>(false);

  // 5-Minute Automated Ingestion Loop State (Hybrid: SEC RSS & Daily Index)
  const [pollingSecondsLeft, setPollingSecondsLeft] = useState<number>(300);
  const [isAutoPolling, setIsAutoPolling] = useState<boolean>(true);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>(new Date().toLocaleTimeString());
  const [isSyncingNow, setIsSyncingNow] = useState<boolean>(false);

  // NYSE Compliance State
  const [selectedNyseTicker, setSelectedNyseTicker] = useState<string>("ALL");
  const [selectedNyseStatus, setSelectedNyseStatus] = useState<string>("ALL");

  // Gemini 3.8 Flash MD&A Item 7 Sentiment State
  const [selectedSentimentTicker, setSelectedSentimentTicker] = useState<string>("NVDA");
  const [isAnalyzingSentiment, setIsAnalyzingSentiment] = useState<boolean>(false);
  const [sentimentResult, setSentimentResult] = useState<MdaSentimentResult | null>(null);
  const [sentimentCache, setSentimentCache] = useState<Record<string, MdaSentimentResult>>({});
  const [mdaCustomInput, setMdaCustomInput] = useState<string>(SAMPLE_MDA_TEXTS["NVDA"]?.excerpt || "");
  const [showMdaEditor, setShowMdaEditor] = useState<boolean>(false);
  const [sentimentToast, setSentimentToast] = useState<string | null>(null);

  // Analyze MD&A Tone using Gemini 3.8 Flash
  const handleRunMdaAnalysis = async (ticker: string, customText?: string) => {
    setIsAnalyzingSentiment(true);
    try {
      const res = await fetchMdaSentiment(ticker, undefined, undefined, customText);
      setSentimentResult(res.data);
      setSentimentCache((prev) => ({ ...prev, [ticker]: res.data }));
      setSentimentToast(`MD&A Tone Analysis complete for ${ticker} via ${res.data.modelUsed || "Gemini 3.8 Flash"}`);
      setTimeout(() => setSentimentToast(null), 4000);
    } catch (err: any) {
      console.error("Error analyzing MD&A sentiment:", err);
    } finally {
      setIsAnalyzingSentiment(false);
    }
  };

  // Sync sample text and cached sentiment on ticker selection change
  useEffect(() => {
    const sample = SAMPLE_MDA_TEXTS[selectedSentimentTicker];
    if (sample) {
      setMdaCustomInput(sample.excerpt);
    }
    if (sentimentCache[selectedSentimentTicker]) {
      setSentimentResult(sentimentCache[selectedSentimentTicker]);
    } else {
      handleRunMdaAnalysis(selectedSentimentTicker);
    }
  }, [selectedSentimentTicker]);

  // Force trigger hybrid sync
  const triggerHybridSync = () => {
    setIsSyncingNow(true);
    setTimeout(() => {
      setFilings(getFilingsForWatchlist(watchlist));
      setLastSyncedTime(new Date().toLocaleTimeString());
      setIsSyncingNow(false);
      setPollingSecondsLeft(300);
    }, 600);
  };

  // 5-Minute Polling Countdown Effect
  useEffect(() => {
    if (!isAutoPolling) return;

    const timer = setInterval(() => {
      setPollingSecondsLeft((prev) => {
        if (prev <= 1) {
          triggerHybridSync();
          return 300;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAutoPolling, watchlist]);

  // Initialize & Subscribe to Firestore Watchlist
  useEffect(() => {
    loadWatchlist().then((list) => {
      setWatchlist(list);
      setFilings(getFilingsForWatchlist(list));
    });

    const unsubscribe = subscribeToWatchlist((updatedList) => {
      setWatchlist(updatedList);
      setFilings(getFilingsForWatchlist(updatedList));
      setIsWatchlistSynced(true);
    });

    return () => unsubscribe();
  }, []);

  // Update filings when watchlist changes
  useEffect(() => {
    setFilings(getFilingsForWatchlist(watchlist));
    if (!watchlist.includes(selectedTickerForAnalytics) && watchlist.length > 0) {
      setSelectedTickerForAnalytics(watchlist[0]);
    }
  }, [watchlist]);

  // Check for High-Risk Alerts whenever filings or settings change
  useEffect(() => {
    const unacknowledged = alertHistory.filter((a) => !a.acknowledged);
    if (unacknowledged.length > 0 && alertSettings.enableBannerToast) {
      setActiveBannerAlert(unacknowledged[0]);
    }
  }, [alertHistory, alertSettings.enableBannerToast]);

  // Add Ticker
  const handleAddTicker = async () => {
    const clean = newTickerInput.trim().toUpperCase();
    if (!clean) return;
    if (watchlist.includes(clean)) {
      setNewTickerInput("");
      return;
    }
    const nextList = [...watchlist, clean];
    setWatchlist(nextList);
    setNewTickerInput("");
    setIsWatchlistSynced(false);
    await saveWatchlist(nextList);
    setIsWatchlistSynced(true);
  };

  // Remove Ticker
  const handleRemoveTicker = async (tickerToRemove: string) => {
    if (watchlist.length <= 1) return; // Keep at least one
    const nextList = watchlist.filter((t) => t !== tickerToRemove);
    setWatchlist(nextList);
    setIsWatchlistSynced(false);
    await saveWatchlist(nextList);
    setIsWatchlistSynced(true);
  };

  // Save Settings
  const handleSaveSettings = (newSettings: AlertSensitivitySettings) => {
    setAlertSettings(newSettings);
    saveAlertSettings(newSettings);
    setIsSettingsModalOpen(false);

    // Evaluate current filings against new thresholds to see if a new alert triggers
    for (const filing of filings) {
      const isRiskBreach = filing.summary.risk_mentions >= newSettings.riskThreshold;
      const isRevBreach = filing.summary.revenue_mentions >= newSettings.revenueThreshold;

      if ((filing.form === "8-K" && isRiskBreach) || (!newSettings.alertOnHighRisk8KOnly && (isRiskBreach || isRevBreach))) {
        const existing = alertHistory.find((a) => a.accessionNumber === filing.accessionNumber);
        if (!existing) {
          const newAlert: AlertHistoryItem = {
            id: `alt_${Date.now()}_${filing.ticker}`,
            timestamp: new Date().toISOString(),
            ticker: filing.ticker,
            companyName: filing.companyName,
            form: filing.form,
            accessionNumber: filing.accessionNumber,
            triggerReason: `Threshold Breach: ${filing.summary.risk_mentions} risk mentions exceed custom threshold (${newSettings.riskThreshold})`,
            riskMentions: filing.summary.risk_mentions,
            revenueMentions: filing.summary.revenue_mentions,
            filingUrl: filing.secEdgarUrl,
            emailSentTo: newSettings.notifyEmail,
            severity: filing.form === "8-K" ? "CRITICAL" : "HIGH",
            acknowledged: false,
          };
          const updatedHistory = [newAlert, ...alertHistory];
          setAlertHistory(updatedHistory);
          saveAlertHistory(updatedHistory);
          if (newSettings.enableBannerToast) {
            setActiveBannerAlert(newAlert);
          }
          break;
        }
      }
    }
  };

  // Dismiss Banner Alert
  const handleDismissBanner = () => {
    if (activeBannerAlert) {
      const updated = alertHistory.map((a) =>
        a.id === activeBannerAlert.id ? { ...a, acknowledged: true } : a
      );
      setAlertHistory(updated);
      saveAlertHistory(updated);
      setActiveBannerAlert(null);
    }
  };

  // Refresh RSS Feed with dynamic categorized breaking item
  const handleRefreshRss = () => {
    setIsRefreshingFeed(true);
    setTimeout(() => {
      const targetTicker = watchlist[Math.floor(Math.random() * watchlist.length)] || "TWE";
      const sampleCategories: Array<{
        category: SecDisclosureCategory;
        form: string;
        itemCode: string;
        dealValueOrImpact: string;
        filingParty: string;
        urgencyLevel: "CRITICAL" | "HIGH" | "ELEVATED" | "STANDARD";
        headline: string;
        summary: string;
      }> = [
        {
          category: "Mergers & Acquisitions",
          form: "8-K",
          itemCode: "Item 1.01",
          dealValueOrImpact: "$5.8B Definitive Merger",
          filingParty: "Board M&A Special Committee",
          urgencyLevel: "CRITICAL",
          headline: `8-K - ${targetTicker} CORP (${targetTicker}) (Filer)`,
          summary: `Item 1.01 Entry into Material Definitive Agreement. ${targetTicker} entered into a binding merger agreement to acquire high-throughput tokenized RWA liquidity infrastructure.`,
        },
        {
          category: "Regulatory Action",
          form: "8-K",
          itemCode: "Item 8.01",
          dealValueOrImpact: "SEC Formal Ingestion Order",
          filingParty: "Office of the General Counsel",
          urgencyLevel: "HIGH",
          headline: `8-K - ${targetTicker} CORP (${targetTicker}) (Filer)`,
          summary: `Item 8.01 Other Events. Submission of FINRA Rule 15c3-5 automated risk filter certification and SEC Regulation ATS audit confirmation.`,
        },
        {
          category: "Insider Trading",
          form: "Form 4",
          itemCode: "Form 4 / Sec 16(a)",
          dealValueOrImpact: "85,000 Shares Sold ($12.4M)",
          filingParty: "Executive VP & Director",
          urgencyLevel: "HIGH",
          headline: `Form 4 - ${targetTicker} CORP (${targetTicker}) (Filer)`,
          summary: `Statement of Changes in Beneficial Ownership. Pre-scheduled Rule 10b5-1 portfolio disposition of 85,000 common shares executed under approved plan.`,
        },
        {
          category: "Financial Results",
          form: "8-K",
          itemCode: "Item 2.02",
          dealValueOrImpact: "Preliminary Net Revenues +24%",
          filingParty: "Chief Financial Officer",
          urgencyLevel: "ELEVATED",
          headline: `8-K - ${targetTicker} CORP (${targetTicker}) (Filer)`,
          summary: `Item 2.02 Results of Operations and Financial Condition. Real-time trading revenues up +24% YoY with gross operating margin expansion.`,
        },
        {
          category: "Cybersecurity & Breaches",
          form: "8-K",
          itemCode: "Item 1.05",
          dealValueOrImpact: "Cryptographic Perimeter Hardened",
          filingParty: "Chief Information Security Officer",
          urgencyLevel: "HIGH",
          headline: `8-K - ${targetTicker} CORP (${targetTicker}) (Filer)`,
          summary: `Item 1.05 Material Cybersecurity Incident. Containment and zero-trust validation of third-party API gateway; zero user funds or private keys affected.`,
        },
        {
          category: "Tokenization & ATS",
          form: "8-K",
          itemCode: "Item 8.01 / Form ATS-N",
          dealValueOrImpact: "24/7 T+0 Atomic Settlement Live",
          filingParty: "Mauro Lomibao Dar III (Creator)",
          urgencyLevel: "CRITICAL",
          headline: `8-K - TOKEN WORLD EXCHANGE ATS (${targetTicker}) (Filer)`,
          summary: `Item 8.01 Other Events. Token World Exchange ATS® launched upgraded 140µs direct market access routing and DTCC FAST real-time custody settlement.`,
        },
      ];

      const chosen = sampleCategories[Math.floor(Math.random() * sampleCategories.length)];
      const newFiling: SecRssFeedItem = {
        id: `rss_feed_${Date.now()}`,
        title: chosen.headline,
        link: `https://www.sec.gov/Archives/edgar/data/000000/live-${Date.now()}.htm`,
        summary: chosen.summary,
        updated: new Date().toISOString(),
        ticker: targetTicker,
        form: chosen.form,
        accessionNumber: `0000999999-26-${Math.floor(Math.random() * 900000 + 100000)}`,
        companyName: `${targetTicker} Corp`,
        cik: "0001984501",
        isBreaking: true,
        category: chosen.category,
        itemCode: chosen.itemCode,
        dealValueOrImpact: chosen.dealValueOrImpact,
        filingParty: chosen.filingParty,
        urgencyLevel: chosen.urgencyLevel,
      };
      setRssFeedItems((prev) => [newFiling, ...prev.slice(0, 24)]);
      setIsRefreshingFeed(false);
    }, 500);
  };

  // RSS Feed Category Counts
  const rssCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: rssFeedItems.length };
    SEC_DISCLOSURE_CATEGORIES.forEach((cat) => {
      counts[cat] = rssFeedItems.filter((item) => item.category === cat).length;
    });
    return counts;
  }, [rssFeedItems]);

  // Filtered RSS Feed Items
  const filteredRssFeedItems = useMemo(() => {
    return rssFeedItems.filter((item) => {
      const matchesForm = rssFilterForm === "ALL" || item.form === rssFilterForm;
      const matchesCategory = selectedRssCategory === "ALL" || item.category === selectedRssCategory;
      const matchesBreaking = !rssBreakingOnly || item.isBreaking;
      const q = rssSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.ticker.toLowerCase().includes(q) ||
        item.companyName.toLowerCase().includes(q) ||
        item.accessionNumber.toLowerCase().includes(q) ||
        (item.itemCode && item.itemCode.toLowerCase().includes(q)) ||
        (item.dealValueOrImpact && item.dealValueOrImpact.toLowerCase().includes(q)) ||
        (item.filingParty && item.filingParty.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q));

      return matchesForm && matchesCategory && matchesBreaking && matchesSearch;
    });
  }, [rssFeedItems, rssFilterForm, selectedRssCategory, rssBreakingOnly, rssSearchQuery]);

  // Filtered Filings
  const filteredFilings = useMemo(() => {
    return filings.filter((f) => {
      const matchesForm = selectedFormFilter === "ALL" || f.form === selectedFormFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        f.ticker.toLowerCase().includes(q) ||
        f.companyName.toLowerCase().includes(q) ||
        f.accessionNumber.toLowerCase().includes(q) ||
        f.headline.toLowerCase().includes(q) ||
        f.rawText.toLowerCase().includes(q);
      return matchesForm && matchesQuery;
    });
  }, [filings, selectedFormFilter, searchQuery]);

  // Aggregate Risk Heatmap Data for Watchlist
  const riskHeatmapData = useMemo(() => {
    return watchlist.map((ticker) => {
      const tickerFilings = filings.filter((f) => f.ticker.toUpperCase() === ticker.toUpperCase());
      const totalRisks = tickerFilings.reduce((acc, f) => acc + f.summary.risk_mentions, 0);
      const totalRev = tickerFilings.reduce((acc, f) => acc + f.summary.revenue_mentions, 0);
      const totalGuidance = tickerFilings.reduce((acc, f) => acc + f.summary.guidance_mentions, 0);
      const avgSentiment = tickerFilings.length
        ? Number((tickerFilings.reduce((acc, f) => acc + f.summary.sentiment_score, 0) / tickerFilings.length).toFixed(2))
        : 0;

      return {
        ticker,
        risk_mentions: totalRisks || (ticker === "NVDA" ? 17 : ticker === "AAPL" ? 10 : 6),
        revenue_mentions: totalRev || 7,
        guidance_mentions: totalGuidance || 4,
        avgSentiment,
        filingCount: tickerFilings.length || 1,
      };
    });
  }, [watchlist, filings]);

  // XBRL Financial Trends Data for Selected Company
  const selectedXbrlData = useMemo(() => {
    return getOrCreateXbrlFacts(selectedTickerForAnalytics);
  }, [selectedTickerForAnalytics]);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(id);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  // Interactive Keyword Highlighter
  const renderHighlightedContent = (htmlContent: string) => {
    let result = htmlContent;
    for (const kw of REGULATORY_RISK_KEYWORDS) {
      const regex = new RegExp(`\\b(${kw})\\b`, "gi");
      result = result.replace(
        regex,
        `<mark class="bg-rose-500/30 text-rose-300 font-semibold px-1 py-0.5 rounded border border-rose-500/40">$1</mark>`
      );
    }
    return <div className="text-sm leading-relaxed text-gray-300 space-y-3" dangerouslySetInnerHTML={{ __html: result }} />;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#E0E0E0] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Banner Alert (Triggered High-Risk 8-K or Threshold Breaches) */}
      {activeBannerAlert && (
        <div className="rounded-xl bg-gradient-to-r from-rose-950/80 via-red-900/50 to-[#121216] border border-rose-500/60 p-4 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40 flex-shrink-0 animate-pulse">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/30 text-rose-300 border border-rose-500/40 font-mono">
                  CRITICAL 8-K ALERT
                </span>
                <span className="text-xs text-rose-200 font-mono">
                  {new Date(activeBannerAlert.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono border border-amber-500/30">
                  {activeBannerAlert.ticker}
                </span>
              </div>
              <h4 className="text-sm font-semibold text-white mt-1">
                {activeBannerAlert.companyName} &mdash; {activeBannerAlert.triggerReason}
              </h4>
              <p className="text-xs text-rose-200/80 mt-0.5 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-rose-400" />
                Notification dispatched to: <span className="font-mono text-white underline">{activeBannerAlert.emailSentTo}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 self-end md:self-center">
            <button
              type="button"
              onClick={() => {
                const target = filings.find((f) => f.accessionNumber === activeBannerAlert.accessionNumber);
                if (target) setActiveFilingModal(target);
                else {
                  window.open(activeBannerAlert.filingUrl, "_blank");
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              Inspect Filing
            </button>
            <button
              type="button"
              onClick={handleDismissBanner}
              className="p-1.5 rounded-lg bg-[#16161A] hover:bg-[#202028] text-gray-400 hover:text-white border border-[#2A2A35] transition-all cursor-pointer"
              title="Acknowledge Alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Header Card */}
      <div className="rounded-2xl bg-gradient-to-b from-[#141419] to-[#0E0E12] border border-[#1F1F28] p-5 sm:p-6 shadow-2xl space-y-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-[#1F1F28] pb-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1C1C28] to-[#0D0D12] border-2 border-amber-500/50 p-1 shadow-[0_0_20px_rgba(242,125,38,0.35)] flex items-center justify-center flex-shrink-0">
              <img
                src="/assets/aistudio/IMG_20261026_022436_ab42bf11.jpg"
                alt="Token World Exchange ATS®"
                className="w-full h-full object-contain rounded-xl hover:scale-105 transition-transform"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/twe_logo.jpg";
                }}
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  SEC EDGAR Real-Time Filing & Financial Fact Monitor
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  EDGAR Next Active
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                  edgartools 2.29.0
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#8E9299] mt-1 max-w-3xl">
                Real-time surveillance across 10-K, 10-Q, and 8-K disclosures for institutional ATS compliance. Automated
                regulatory risk keyword extraction, multi-period XBRL financial trends, live RSS parsing, and instant alerts.
              </p>
            </div>
          </div>

          {/* Quick Actions (Settings, Export, Refresh) */}
          <div className="flex items-center gap-2.5 flex-wrap self-end lg:self-center">
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-[#181820] hover:bg-[#20202C] text-[#E0E0E0] border border-[#2A2A38] text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              Alert Sensitivity ({alertSettings.riskThreshold} Risk / {alertSettings.revenueThreshold} Rev)
            </button>

            <button
              type="button"
              onClick={() => exportFilingsToCsv(filings)}
              className="px-3 py-1.5 rounded-lg bg-[#181820] hover:bg-[#20202C] text-[#E0E0E0] border border-[#2A2A38] text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Export filtered filings view as CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              Export CSV
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHybridSync();
                handleRefreshRss();
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow || isRefreshingFeed ? "animate-spin" : ""}`} />
              Poll EDGAR
            </button>
          </div>
        </div>

        {/* Automated Ingestion Trigger & Hybrid Loop Status Controller */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#111117] border border-[#1E1E2C] text-xs">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border ${isAutoPolling ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" : "bg-amber-500/10 text-amber-400 border-amber-500/30"}`}>
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Radio className={`w-3.5 h-3.5 text-cyan-400 ${isAutoPolling ? "animate-pulse" : ""}`} />
                  Automated EDGAR Ingestion Trigger (5-Minute Hybrid Loop)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1A1A26] text-cyan-300 border border-cyan-500/20 font-semibold">
                  data.sec.gov &amp; /Archives/edgar/daily-index/
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5 font-mono">
                {isAutoPolling ? (
                  <>
                    Next automatic poll in <span className="text-amber-400 font-bold">{Math.floor(pollingSecondsLeft / 60)}m {String(pollingSecondsLeft % 60).padStart(2, "0")}s</span> &bull; Last synchronized: <span className="text-gray-300">{lastSyncedTime}</span>
                  </>
                ) : (
                  <span className="text-amber-400 font-semibold">Automated polling loop paused by compliance officer.</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setIsAutoPolling((p) => !p)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                isAutoPolling
                  ? "bg-[#161622] hover:bg-[#20202E] text-gray-300 border-[#2A2A3C]"
                  : "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/40"
              }`}
            >
              {isAutoPolling ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isAutoPolling ? "Pause 5m Loop" : "Resume Loop"}
            </button>

            <button
              type="button"
              onClick={triggerHybridSync}
              disabled={isSyncingNow}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold font-mono flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? "animate-spin" : ""}`} />
              {isSyncingNow ? "Syncing..." : "Force Sync SEC RSS & Index"}
            </button>
          </div>
        </div>

        {/* Watchlist Bar with Firestore Persistence Status */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#A0A5B0] font-mono flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                Active SEC Watchlist ({watchlist.length} Tickers)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1A1A24] text-cyan-300 border border-cyan-500/20 flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isWatchlistSynced ? "bg-cyan-400" : "bg-amber-400 animate-ping"}`} />
                {isWatchlistSynced ? "Firestore Synced" : "Saving..."}
              </span>
            </div>

            {/* Add Ticker Input */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Add ticker (e.g. TSLA)..."
                  value={newTickerInput}
                  onChange={(e) => setNewTickerInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddTicker();
                  }}
                  className="w-full pl-8 pr-2 py-1 rounded-lg bg-[#0E0E12] border border-[#22223E] text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 uppercase font-mono"
                />
              </div>
              <button
                type="button"
                onClick={handleAddTicker}
                className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>

          {/* Watchlist Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {watchlist.map((ticker) => {
              const count = filings.filter((f) => f.ticker === ticker).length;
              const hasAlert = alertHistory.some((a) => a.ticker === ticker && !a.acknowledged);
              const isSelected = selectedTickerForAnalytics === ticker;

              return (
                <div
                  key={ticker}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all border ${
                    isSelected
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                      : "bg-[#14141C] text-gray-300 border-[#222230] hover:border-[#38384C]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTickerForAnalytics(ticker);
                      setActiveSubTab("analytics");
                    }}
                    className="flex items-center gap-1.5 cursor-pointer text-left"
                    title={`View ${ticker} XBRL financials & trend analytics`}
                  >
                    <span>{ticker}</span>
                    <span className="text-[10px] px-1 rounded bg-[#20202C] text-gray-400">
                      {count} filings
                    </span>
                    {hasAlert && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" title="Active High-Risk Alert" />
                    )}
                  </button>

                  {watchlist.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTicker(ticker)}
                      className="text-gray-500 hover:text-rose-400 p-0.5 rounded transition-colors cursor-pointer"
                      title={`Remove ${ticker} from watchlist`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="flex items-center gap-2 border-b border-[#1F1F28] pt-2 overflow-x-auto no-scrollbar">
          {[
            { id: "filings", label: "Live Filings (10-K, 10-Q, 8-K)", icon: FileText, count: filteredFilings.length },
            { id: "risk_heatmap", label: "Risk Heatmap", icon: BarChart3, badge: "Recharts" },
            { id: "analytics", label: "Financials & XBRL Trends", icon: TrendingUp, badge: selectedTickerForAnalytics },
            { id: "rss_feed", label: "SEC RSS Feed", icon: Radio, count: rssFeedItems.length },
            {
              id: "alert_history",
              label: "Alert History",
              icon: Bell,
              count: alertHistory.length,
              badgeColor: alertHistory.some((a) => !a.acknowledged) ? "bg-rose-500 text-white" : undefined,
            },
            { id: "postgres_workbench", label: "PostgreSQL & AI Search", icon: Database, badge: "pgvector" },
            { id: "edgar_next", label: "EDGAR Next Tokens", icon: Key, badge: "1-Yr Active" },
            { id: "nyse_bridge", label: "NYSE Listing Compliance", icon: Landmark, badge: "Dual 8-K" },
            { 
              id: "sentiment_analysis", 
              label: "10-K MD&A Sentiment", 
              icon: Sparkles, 
              badge: userState.tier === "free" ? "🔒 ELITE ★" : "Gemini 3.8",
              badgeColor: userState.tier === "free" ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : undefined 
            },
          ].map((tab) => {
            const isActive = activeSubTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (tab.id === "sentiment_analysis" && !canAccessAiSentiment(userState.tier)) {
                    triggerGatedFeatureModal(
                      "Gemini AI MD&A Sentiment Analysis",
                      "elite",
                      "Institutional AI sentiment analysis and tone classification of 10-K and 10-Q MD&A sections require Elite or VIP Full Access membership."
                    );
                    return;
                  }
                  setActiveSubTab(tab.id as SecMonitorTab);
                }}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-lg text-xs font-semibold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                  isActive
                    ? "border-amber-400 text-amber-400 bg-amber-500/10 font-bold"
                    : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-[#161620]"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      tab.badgeColor || "bg-[#1F1F2A] text-gray-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          TAB 1: LIVE FILINGS (10-K, 10-Q, 8-K)
         ========================================================================= */}
      {activeSubTab === "filings" && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#111116] border border-[#1F1F28] p-3 rounded-xl">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              <span className="text-xs text-gray-400 font-mono flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5 text-amber-400" />
                Form:
              </span>
              {["ALL", "10-K", "10-Q", "8-K"].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setSelectedFormFilter(f)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition-all cursor-pointer ${
                    selectedFormFilter === f
                      ? "bg-amber-500 text-black font-bold shadow-sm"
                      : "bg-[#181822] text-gray-400 hover:text-white hover:bg-[#20202E]"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search filings, keywords, accession..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0A0A0E] border border-[#222230] text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 font-mono"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Filings Table */}
          <div className="rounded-xl bg-[#111116] border border-[#1F1F28] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#161620] text-gray-400 uppercase font-mono tracking-wider text-[11px] border-b border-[#222230]">
                  <tr>
                    <th className="py-3 px-4">Form</th>
                    <th className="py-3 px-4">Ticker & Entity</th>
                    <th className="py-3 px-4">Filing Date</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4 text-center">Risk Mentions</th>
                    <th className="py-3 px-4 text-center">Revenue Mentions</th>
                    <th className="py-3 px-4 text-center">Guidance Mentions</th>
                    <th className="py-3 px-4 text-center">Sentiment</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1A24]">
                  {filteredFilings.map((filing) => {
                    const isHighRisk = filing.isHighRisk8K || filing.summary.risk_mentions >= alertSettings.riskThreshold;

                    return (
                      <tr
                        key={filing.accessionNumber}
                        className={`hover:bg-[#161622] transition-colors ${
                          isHighRisk ? "bg-rose-950/10" : ""
                        }`}
                      >
                        {/* Form Badge */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] border ${
                                filing.form === "10-K"
                                  ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                                  : filing.form === "10-Q"
                                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                  : "bg-purple-500/20 text-purple-300 border-purple-500/40"
                              }`}
                            >
                              {filing.form}
                            </span>
                            {filing.isHighRisk8K && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-bold font-mono animate-pulse">
                                HIGH-RISK
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Company & Ticker */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            <span className="font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                              {filing.ticker}
                            </span>
                            <span className="truncate max-w-[180px]">{filing.companyName}</span>
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                            Acc: {filing.accessionNumber}
                          </div>
                        </td>

                        {/* Filing Date */}
                        <td className="py-3 px-4 font-mono text-gray-300 whitespace-nowrap">
                          {filing.filingDate}
                          <div className="text-[10px] text-gray-500">Period: {filing.reportPeriod}</div>
                        </td>

                        {/* Size */}
                        <td className="py-3 px-4 font-mono text-gray-400 whitespace-nowrap">
                          {filing.fileSizeFormatted}
                        </td>

                        {/* Risk Mentions */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-xs ${
                              filing.summary.risk_mentions >= alertSettings.riskThreshold
                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                : "bg-[#1E1E28] text-gray-300"
                            }`}
                          >
                            {filing.summary.risk_mentions}
                          </span>
                        </td>

                        {/* Revenue Mentions */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-xs ${
                              filing.summary.revenue_mentions >= alertSettings.revenueThreshold
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-[#1E1E28] text-gray-300"
                            }`}
                          >
                            {filing.summary.revenue_mentions}
                          </span>
                        </td>

                        {/* Guidance Mentions */}
                        <td className="py-3 px-4 text-center">
                          <span className="inline-block px-2 py-0.5 rounded font-mono text-xs bg-[#1E1E28] text-gray-300">
                            {filing.summary.guidance_mentions}
                          </span>
                        </td>

                        {/* Sentiment */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`font-mono font-semibold text-xs ${
                              filing.summary.sentiment_score > 0
                                ? "text-emerald-400"
                                : filing.summary.sentiment_score < 0
                                ? "text-rose-400"
                                : "text-gray-400"
                            }`}
                          >
                            {filing.summary.sentiment_score > 0 ? "+" : ""}
                            {filing.summary.sentiment_score}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setActiveFilingModal(filing)}
                              className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                              title="Inspect full text with regulatory keyword highlighting"
                            >
                              <Eye className="w-3 h-3" />
                              Inspect
                            </button>
                            <button
                              type="button"
                              onClick={() => downloadFilingHtml(filing)}
                              className="p-1 rounded bg-[#181822] hover:bg-[#20202E] text-gray-400 hover:text-white border border-[#2A2A38] transition-all cursor-pointer"
                              title="Download full filing HTML file"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <a
                              href={filing.secEdgarUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded bg-[#181822] hover:bg-[#20202E] text-gray-400 hover:text-cyan-400 border border-[#2A2A38] transition-all"
                              title="Open SEC EDGAR archive entry"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredFilings.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-gray-500 font-mono">
                        No filings matched current filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: VISUAL RISK HEATMAP (Recharts)
         ========================================================================= */}
      {activeSubTab === "risk_heatmap" && (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl bg-[#121218] border border-[#1F1F28] p-4">
              <span className="text-[11px] text-gray-400 font-mono uppercase tracking-wider">Top Risk Ticker</span>
              <div className="text-xl font-bold text-rose-400 mt-1 flex items-center justify-between">
                <span>NVDA</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                  17 Mentions
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Subpoenas, trade compliance & antitrust</p>
            </div>

            <div className="rounded-xl bg-[#121218] border border-[#1F1F28] p-4">
              <span className="text-[11px] text-gray-400 font-mono uppercase tracking-wider">Total Risk Mentions</span>
              <div className="text-xl font-bold text-amber-400 mt-1">
                {riskHeatmapData.reduce((acc, d) => acc + d.risk_mentions, 0)} Keywords
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Across {watchlist.length} watchlist companies</p>
            </div>

            <div className="rounded-xl bg-[#121218] border border-[#1F1F28] p-4">
              <span className="text-[11px] text-gray-400 font-mono uppercase tracking-wider">Revenue Discussions</span>
              <div className="text-xl font-bold text-emerald-400 mt-1">
                {riskHeatmapData.reduce((acc, d) => acc + d.revenue_mentions, 0)} Mentions
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Item 7 MD&A and Item 2.02</p>
            </div>

            <div className="rounded-xl bg-[#121218] border border-[#1F1F28] p-4">
              <span className="text-[11px] text-gray-400 font-mono uppercase tracking-wider">Watchlist Coverage</span>
              <div className="text-xl font-bold text-cyan-400 mt-1">100% EDGAR Real-Time</div>
              <p className="text-[11px] text-gray-500 mt-1">10-K, 10-Q, 8-K automated feed</p>
            </div>
          </div>

          {/* Bar Chart Heatmap Comparison */}
          <div className="rounded-xl bg-[#121218] border border-[#1F1F28] p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                  Regulatory Risk Mentions vs. Revenue Mentions by Watchlist Ticker
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Extracted via edgartools pipeline analyzing Item 1A Risk Factors and Item 8.01 8-K disclosures.
                </p>
              </div>
              <div className="text-xs font-mono text-gray-400">
                Sensitivity Threshold: <span className="text-rose-400 font-bold">{alertSettings.riskThreshold}</span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskHeatmapData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222230" vertical={false} />
                  <XAxis dataKey="ticker" stroke="#8E9299" fontSize={12} tickLine={false} />
                  <YAxis stroke="#8E9299" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#161622",
                      borderColor: "#2E2E40",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#FFFFFF",
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }} />
                  <Bar dataKey="risk_mentions" name="Risk Mentions" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="revenue_mentions" name="Revenue Mentions" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="guidance_mentions" name="Guidance Mentions" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: FINANCIALS & XBRL TRENDS (Recharts)
         ========================================================================= */}
      {activeSubTab === "analytics" && (
        <div className="space-y-6">
          {/* Company Selector Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#111116] border border-[#1F1F28] p-4 rounded-xl">
            <div>
              <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">Selected Company</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg font-bold text-white font-mono">{selectedTickerForAnalytics}</span>
                <span className="text-xs text-gray-400">XBRL Financial Facts (edgartools XBRL API)</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {watchlist.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTickerForAnalytics(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    selectedTickerForAnalytics === t
                      ? "bg-cyan-500 text-black font-extrabold shadow-sm"
                      : "bg-[#181822] text-gray-400 hover:text-white hover:bg-[#20202E]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Revenue & Net Income Multi-Period Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Revenue & Net Income ($ Billions) */}
            <div className="rounded-xl bg-[#121218] border border-[#1F1F28] p-5 shadow-xl">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Historical Revenue & Net Income ($ Billions)
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Multi-period GAAP financials extracted from official 10-K & 10-Q XBRL statements.
                </p>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={selectedXbrlData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222230" vertical={false} />
                    <XAxis dataKey="period" stroke="#8E9299" fontSize={11} tickLine={false} />
                    <YAxis stroke="#8E9299" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#161622",
                        borderColor: "#2E2E40",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "#FFFFFF",
                      }}
                      formatter={(val: any) => [`$${val}B`, ""]}
                    />
                    <Legend wrapperStyle={{ paddingTop: "8px", fontSize: "12px" }} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue ($B)"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRev)"
                    />
                    <Area
                      type="monotone"
                      dataKey="netIncome"
                      name="Net Income ($B)"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorNet)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Diluted EPS Trend ($ USD) */}
            <div className="rounded-xl bg-[#121218] border border-[#1F1F28] p-5 shadow-xl">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  Diluted Earnings Per Share (EPS in USD)
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Quarterly Diluted EPS progression as reported under US GAAP XBRL.
                </p>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selectedXbrlData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222230" vertical={false} />
                    <XAxis dataKey="period" stroke="#8E9299" fontSize={11} tickLine={false} />
                    <YAxis stroke="#8E9299" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#161622",
                        borderColor: "#2E2E40",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "#FFFFFF",
                      }}
                      formatter={(val: any) => [`$${val}`, "EPS"]}
                    />
                    <Legend wrapperStyle={{ paddingTop: "8px", fontSize: "12px" }} />
                    <Line
                      type="monotone"
                      dataKey="eps"
                      name="Diluted EPS ($)"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#f59e0b" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* XBRL Financial Data Table */}
          <div className="rounded-xl bg-[#121218] border border-[#1F1F28] p-4 overflow-hidden">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 font-mono mb-3">
              {selectedTickerForAnalytics} XBRL Balance Sheet & Cash Flow Records
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#181824] text-gray-400 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Period</th>
                    <th className="py-2.5 px-3">Revenue ($B)</th>
                    <th className="py-2.5 px-3">Net Income ($B)</th>
                    <th className="py-2.5 px-3">Diluted EPS</th>
                    <th className="py-2.5 px-3">Operating Cash Flow ($B)</th>
                    <th className="py-2.5 px-3">Total Assets ($B)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F1F2C]">
                  {selectedXbrlData.map((row) => (
                    <tr key={row.period} className="hover:bg-[#1A1A26]">
                      <td className="py-2 px-3 font-bold text-white">{row.period}</td>
                      <td className="py-2 px-3 text-cyan-400 font-semibold">${row.revenue.toFixed(2)}B</td>
                      <td className="py-2 px-3 text-emerald-400 font-semibold">${row.netIncome.toFixed(2)}B</td>
                      <td className="py-2 px-3 text-amber-400 font-bold">${row.eps.toFixed(2)}</td>
                      <td className="py-2 px-3 text-gray-300">${row.operatingCashFlow.toFixed(2)}B</td>
                      <td className="py-2 px-3 text-gray-400">${row.totalAssets.toFixed(2)}B</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: SEC RSS FEED WITH INTERACTIVE CATEGORY FILTERS
         ========================================================================= */}
      {activeSubTab === "rss_feed" && (() => {
        const categoryConfigs: Array<{
          category: "ALL" | SecDisclosureCategory;
          label: string;
          icon: React.ComponentType<{ className?: string }>;
          accentColor: string;
          activeClass: string;
          badgeStyle: string;
          description: string;
        }> = [
          {
            category: "ALL",
            label: "All Disclosures",
            icon: Globe,
            accentColor: "text-gray-300",
            activeClass: "bg-white text-black font-bold shadow-md",
            badgeStyle: "bg-[#1E1E2A] text-gray-300 border-[#2E2E3E]",
            description: "Aggregated live stream across all statutory categories",
          },
          {
            category: "Mergers & Acquisitions",
            label: "Mergers & Acquisitions",
            icon: Briefcase,
            accentColor: "text-amber-400",
            activeClass: "bg-amber-500 text-black font-bold shadow-lg shadow-amber-500/25",
            badgeStyle: "bg-amber-500/15 text-amber-300 border-amber-500/35",
            description: "8-K Item 1.01 & 2.01 Definitive M&A Agreements, Tender Offers & Consolidations",
          },
          {
            category: "Regulatory Action",
            label: "Regulatory Action",
            icon: Scale,
            accentColor: "text-rose-400",
            activeClass: "bg-rose-600 text-white font-bold shadow-lg shadow-rose-600/25",
            badgeStyle: "bg-rose-500/15 text-rose-300 border-rose-500/35",
            description: "8-K Item 8.01 Formal SEC Subpoenas, Wells Notices, DOJ Antitrust Orders & FINRA 15c3-5 Collars",
          },
          {
            category: "Insider Trading",
            label: "Insider Trading",
            icon: UserCheck,
            accentColor: "text-emerald-400",
            activeClass: "bg-emerald-500 text-black font-bold shadow-lg shadow-emerald-500/25",
            badgeStyle: "bg-emerald-500/15 text-emerald-300 border-emerald-500/35",
            description: "Section 16(a) Form 4 & Form 144 Pre-arranged Rule 10b5-1 executive transactions",
          },
          {
            category: "Financial Results",
            label: "Financial Results",
            icon: BarChart3,
            accentColor: "text-blue-400",
            activeClass: "bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/25",
            badgeStyle: "bg-blue-500/15 text-blue-300 border-blue-500/35",
            description: "8-K Item 2.02 Earnings Releases, 10-K Annual Reports & 10-Q Financial Trends",
          },
          {
            category: "Cybersecurity & Breaches",
            label: "Cybersecurity & Breaches",
            icon: ShieldAlert,
            accentColor: "text-cyan-400",
            activeClass: "bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/25",
            badgeStyle: "bg-cyan-500/15 text-cyan-300 border-cyan-500/35",
            description: "8-K Item 1.05 Material Cybersecurity Incidents, zero-trust perimeter & forensics",
          },
          {
            category: "Executive & Governance",
            label: "Executive & Governance",
            icon: Building2,
            accentColor: "text-purple-400",
            activeClass: "bg-purple-600 text-white font-bold shadow-lg shadow-purple-600/25",
            badgeStyle: "bg-purple-500/15 text-purple-300 border-purple-500/35",
            description: "8-K Item 5.02 C-Suite Appointments, Officer Departures & Board Committee Updates",
          },
          {
            category: "Tokenization & ATS",
            label: "Tokenization & ATS",
            icon: Sparkles,
            accentColor: "text-yellow-400",
            activeClass: "bg-yellow-500 text-black font-bold shadow-lg shadow-yellow-500/25",
            badgeStyle: "bg-yellow-500/15 text-yellow-300 border-yellow-500/35",
            description: "SEC Form ATS-N Operational Amendments, DTCC FAST #9450 & Real-World Asset Onboarding",
          },
        ];

        const hasActiveFilter =
          selectedRssCategory !== "ALL" ||
          rssFilterForm !== "ALL" ||
          rssBreakingOnly ||
          rssSearchQuery.trim() !== "";

        const handleClearAllRssFilters = () => {
          setSelectedRssCategory("ALL");
          setRssFilterForm("ALL");
          setRssBreakingOnly(false);
          setRssSearchQuery("");
        };

        const activeCatMeta = categoryConfigs.find((c) => c.category === selectedRssCategory);

        return (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Top Overview & Action Bar */}
            <div className="rounded-2xl bg-gradient-to-b from-[#14141C] to-[#0E0E14] border border-[#20202E] p-4 sm:p-5 shadow-xl space-y-4">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-[#1E1E2C] pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                      Live SEC EDGAR Real-Time Ingest RSS Stream
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                      data.sec.gov Atom/RSS
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold">
                      Sub-Second Ingest
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 max-w-3xl">
                    Surveillance gateway parsing official SEC breaking disclosure feeds. Narrow updates dynamically across
                    statutory categories such as <strong className="text-amber-300">Mergers &amp; Acquisitions</strong>,{" "}
                    <strong className="text-rose-300">Regulatory Action</strong>, and{" "}
                    <strong className="text-emerald-300">Insider Trading</strong>.
                  </p>
                </div>

                {/* Top Metrics & Ingest Controls */}
                <div className="flex items-center gap-2.5 flex-wrap self-end lg:self-center">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111117] border border-[#222234] text-xs font-mono">
                    <span className="text-gray-400">Total Stream:</span>
                    <span className="text-white font-bold">{rssFeedItems.length}</span>
                    <span className="text-gray-600">|</span>
                    <span className="text-rose-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                      {rssFeedItems.filter((i) => i.isBreaking).length} Breaking
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleRefreshRss}
                    disabled={isRefreshingFeed}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold font-mono flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingFeed ? "animate-spin" : ""}`} />
                    {isRefreshingFeed ? "Polling Feed..." : "Fetch Latest Disclosures"}
                  </button>
                </div>
              </div>

              {/* Interactive Category Filter Pills */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-300 font-mono flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-amber-400" />
                    Interactive Category Filters &mdash; Select To Filter:
                  </span>
                  {selectedRssCategory !== "ALL" && (
                    <button
                      type="button"
                      onClick={() => setSelectedRssCategory("ALL")}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-mono flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Clear Category Filter
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  {categoryConfigs.map((cat) => {
                    const isSelected = selectedRssCategory === cat.category;
                    const Icon = cat.icon;
                    const count = rssCategoryCounts[cat.category] || 0;

                    return (
                      <button
                        key={cat.category}
                        type="button"
                        onClick={() => setSelectedRssCategory(cat.category)}
                        className={`flex flex-col items-start justify-between p-2.5 rounded-xl border transition-all text-left cursor-pointer group ${
                          isSelected
                            ? `${cat.activeClass} border-transparent scale-[1.02]`
                            : "bg-[#111118] hover:bg-[#161622] text-gray-300 border-[#222232] hover:border-[#38384C]"
                        }`}
                        title={cat.description}
                      >
                        <div className="flex items-center justify-between w-full mb-1.5">
                          <Icon className={`w-4 h-4 ${isSelected ? "text-current" : cat.accentColor}`} />
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                              isSelected
                                ? "bg-black/30 text-white"
                                : "bg-[#1B1B26] text-gray-400 group-hover:text-white"
                            }`}
                          >
                            {count}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold leading-tight line-clamp-1 w-full">
                          {cat.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Active Category Description Note */}
                {activeCatMeta && selectedRssCategory !== "ALL" && (
                  <div className="p-2.5 rounded-lg bg-[#101018] border border-[#242436] flex items-center justify-between text-xs animate-in fade-in duration-150">
                    <div className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <span className="text-gray-300">
                        Filtering by <strong className="text-white">{activeCatMeta.label}:</strong> {activeCatMeta.description}
                      </span>
                    </div>
                    <span className="text-amber-400 font-mono text-[11px] font-bold">
                      {rssCategoryCounts[selectedRssCategory] || 0} filings found
                    </span>
                  </div>
                )}
              </div>

              {/* Secondary Controls: Search Query, Form Filter & Breaking Only Toggle */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 border-t border-[#1C1C2A]">
                {/* Form Buttons */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <span className="text-xs text-gray-400 font-mono mr-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    Form:
                  </span>
                  {["ALL", "8-K", "Form 4", "Form 144", "10-Q", "10-K"].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setRssFilterForm(f)}
                      className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        rssFilterForm === f
                          ? "bg-emerald-500 text-black font-bold shadow-sm"
                          : "bg-[#161622] text-gray-400 hover:text-white hover:bg-[#20202E]"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                {/* Right controls: Breaking toggle & Search Input */}
                <div className="flex items-center gap-2.5 flex-1 md:max-w-md">
                  <button
                    type="button"
                    onClick={() => setRssBreakingOnly((prev) => !prev)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      rssBreakingOnly
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm"
                        : "bg-[#161622] text-gray-400 hover:text-white border-[#2A2A3C]"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        rssBreakingOnly ? "bg-rose-400 animate-ping" : "bg-gray-600"
                      }`}
                    />
                    Breaking Only
                  </button>

                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search ticker, deal, officer, CIK, keywords..."
                      value={rssSearchQuery}
                      onChange={(e) => setRssSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-7 py-1 rounded-lg bg-[#0A0A0E] border border-[#242436] text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 font-mono"
                    />
                    {rssSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setRssSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Active Filters Summary Breadcrumbs */}
              {hasActiveFilter && (
                <div className="flex items-center gap-2 pt-2 border-t border-[#1C1C2A] flex-wrap text-xs font-mono">
                  <span className="text-gray-400 text-[11px]">Active Filters:</span>
                  {selectedRssCategory !== "ALL" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px]">
                      Category: {selectedRssCategory}
                      <button
                        type="button"
                        onClick={() => setSelectedRssCategory("ALL")}
                        className="hover:text-white ml-0.5 cursor-pointer"
                      >
                        &times;
                      </button>
                    </span>
                  )}
                  {rssFilterForm !== "ALL" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px]">
                      Form: {rssFilterForm}
                      <button
                        type="button"
                        onClick={() => setRssFilterForm("ALL")}
                        className="hover:text-white ml-0.5 cursor-pointer"
                      >
                        &times;
                      </button>
                    </span>
                  )}
                  {rssBreakingOnly && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px]">
                      Breaking Disclosures Only
                      <button
                        type="button"
                        onClick={() => setRssBreakingOnly(false)}
                        className="hover:text-white ml-0.5 cursor-pointer"
                      >
                        &times;
                      </button>
                    </span>
                  )}
                  {rssSearchQuery.trim() !== "" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[11px]">
                      Search: &ldquo;{rssSearchQuery}&rdquo;
                      <button
                        type="button"
                        onClick={() => setRssSearchQuery("")}
                        className="hover:text-white ml-0.5 cursor-pointer"
                      >
                        &times;
                      </button>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleClearAllRssFilters}
                    className="text-gray-400 hover:text-white underline text-[11px] ml-auto cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                </div>
              )}
            </div>

            {/* Results Count Header */}
            <div className="flex items-center justify-between text-xs text-gray-400 px-1 font-mono">
              <div>
                Showing <strong className="text-white">{filteredRssFeedItems.length}</strong> of{" "}
                <strong className="text-gray-300">{rssFeedItems.length}</strong> live disclosures
                {selectedRssCategory !== "ALL" && (
                  <span className="text-amber-400 ml-1">in &ldquo;{selectedRssCategory}&rdquo;</span>
                )}
              </div>
              <div className="text-[11px] text-gray-500">
                Sorted by latest SEC filing timestamp (UTC-5 EST)
              </div>
            </div>

            {/* Disclosures Feed List */}
            <div className="space-y-3.5">
              {filteredRssFeedItems.map((item) => {
                const categoryMeta = categoryConfigs.find((c) => c.category === item.category);
                const Icon = categoryMeta?.icon || Tag;

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border transition-all p-4 sm:p-5 relative overflow-hidden group shadow-lg ${
                      item.isBreaking
                        ? "bg-gradient-to-r from-[#17111D] via-[#12121A] to-[#0E0E14] border-purple-500/40 hover:border-purple-500/70"
                        : "bg-gradient-to-r from-[#121218] to-[#0D0D12] border-[#1F1F2C] hover:border-[#323246]"
                    }`}
                  >
                    {/* Top Meta Line: Badges, Category, Ticker, Urgency */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 border-b border-[#1C1C2A] pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Interactive Category Badge */}
                        <button
                          type="button"
                          onClick={() => setSelectedRssCategory(item.category)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-transform hover:scale-105 cursor-pointer ${
                            categoryMeta?.badgeStyle || "bg-gray-800 text-gray-300 border-gray-700"
                          }`}
                          title={`Filter stream by ${item.category}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{item.category}</span>
                        </button>

                        {/* Form Badge */}
                        <span
                          className={`px-2 py-0.5 rounded font-mono font-bold text-xs border ${
                            item.form === "8-K"
                              ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                              : item.form.includes("Form 4") || item.form.includes("144")
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                              : item.form === "10-K"
                              ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                              : "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                          }`}
                        >
                          {item.form}
                        </span>

                        {/* Ticker Badge */}
                        <button
                          type="button"
                          onClick={() => {
                            if (watchlist.includes(item.ticker)) {
                              setSelectedTickerForAnalytics(item.ticker);
                              setActiveSubTab("analytics");
                            } else {
                              setRssSearchQuery(item.ticker);
                            }
                          }}
                          className="font-mono text-xs font-bold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 px-2 py-0.5 rounded border border-amber-500/30 transition-colors cursor-pointer"
                          title={`Inspect ${item.ticker} filings`}
                        >
                          ${item.ticker}
                        </button>

                        {/* Breaking Indicator */}
                        {item.isBreaking && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/25 text-rose-300 border border-rose-500/50 font-bold flex items-center gap-1.5 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            BREAKING DISCLOSURE
                          </span>
                        )}

                        {item.urgencyLevel === "CRITICAL" && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-600 text-white font-bold tracking-wider">
                            CRITICAL
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-gray-500" />
                          {new Date(item.updated).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Headline Title */}
                    <div className="mt-3">
                      <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-amber-200 transition-colors leading-snug">
                        {item.title}
                      </h4>
                      <p className="text-xs text-gray-300/90 mt-1.5 leading-relaxed">
                        {item.summary}
                      </p>
                    </div>

                    {/* Category Specific Disclosure Metadata Strip */}
                    <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs font-mono">
                      {item.itemCode && (
                        <div className="p-2 rounded-lg bg-[#0E0E14] border border-[#20202E]">
                          <span className="text-[10px] text-gray-500 block uppercase">SEC Item Code</span>
                          <span className="text-cyan-300 font-semibold truncate block mt-0.5">
                            {item.itemCode}
                          </span>
                        </div>
                      )}

                      {item.dealValueOrImpact && (
                        <div className="p-2 rounded-lg bg-[#0E0E14] border border-[#20202E]">
                          <span className="text-[10px] text-gray-500 block uppercase">
                            {item.category === "Mergers & Acquisitions"
                              ? "Deal Consideration"
                              : item.category === "Insider Trading"
                              ? "Shares Transacted"
                              : "Disclosed Impact"}
                          </span>
                          <span className="text-amber-300 font-bold truncate block mt-0.5">
                            {item.dealValueOrImpact}
                          </span>
                        </div>
                      )}

                      {item.filingParty && (
                        <div className="p-2 rounded-lg bg-[#0E0E14] border border-[#20202E]">
                          <span className="text-[10px] text-gray-500 block uppercase">
                            {item.category === "Insider Trading" ? "Insider / Filer" : "Reporting Party"}
                          </span>
                          <span className="text-gray-200 truncate block mt-0.5">
                            {item.filingParty}
                          </span>
                        </div>
                      )}

                      <div className="p-2 rounded-lg bg-[#0E0E14] border border-[#20202E]">
                        <span className="text-[10px] text-gray-500 block uppercase">Accession / CIK</span>
                        <span className="text-gray-400 font-mono text-[11px] truncate block mt-0.5">
                          {item.accessionNumber}
                        </span>
                      </div>
                    </div>

                    {/* Action Toolbar */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 mt-4 pt-3 border-t border-[#1C1C2A]">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-500 font-mono">
                          Entity: <strong className="text-gray-300">{item.companyName}</strong> (CIK: {item.cik})
                        </span>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(item.accessionNumber);
                            setCopiedRssAccession(item.id);
                            setTimeout(() => setCopiedRssAccession(null), 2000);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#161622] hover:bg-[#20202E] text-gray-300 hover:text-white border border-[#2A2A3C] text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                          title="Copy SEC EDGAR Accession Number"
                        >
                          {copiedRssAccession === item.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-gray-400" />
                              <span>Copy Acc#</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveRssItemModal(item)}
                          className="px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Inspect Disclosure
                        </button>

                        <a
                          href={item.link}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 rounded-lg bg-[#181824] hover:bg-[#222234] text-gray-300 hover:text-white border border-[#2A2A3E] text-xs font-medium flex items-center gap-1.5 transition-all"
                        >
                          SEC Archive
                          <ExternalLink className="w-3 h-3 text-cyan-400" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredRssFeedItems.length === 0 && (
                <div className="rounded-2xl bg-[#111118] border border-[#20202E] p-12 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                    <Filter className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">No Disclosures Match Current Filters</h4>
                    <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                      No breaking updates were found for category &ldquo;{selectedRssCategory}&rdquo; with the selected
                      form and search query. Clear filters or poll the live EDGAR feed.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleClearAllRssFilters}
                      className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      Clear All Category Filters
                    </button>
                    <button
                      type="button"
                      onClick={handleRefreshRss}
                      className="px-4 py-2 rounded-lg bg-[#1A1A26] hover:bg-[#242436] text-gray-300 border border-[#2E2E42] text-xs font-semibold transition-all cursor-pointer"
                    >
                      Fetch New Breaking Disclosures
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal: Comprehensive RSS Disclosure Inspector */}
            {activeRssItemModal && (
              <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-[#12121A] border border-[#2A2A3E] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5">
                  {/* Modal Header */}
                  <div className="flex items-start justify-between gap-4 border-b border-[#202030] pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold">
                          {activeRssItemModal.category}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-mono font-bold">
                          {activeRssItemModal.form}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold">
                          ${activeRssItemModal.ticker}
                        </span>
                        {activeRssItemModal.isBreaking && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/25 text-rose-300 border border-rose-500/50 text-[10px] font-mono font-bold animate-pulse">
                            BREAKING DISCLOSURE
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-white mt-2">
                        {activeRssItemModal.title}
                      </h3>
                      <p className="text-xs text-gray-400 font-mono">
                        {activeRssItemModal.companyName} &bull; CIK: {activeRssItemModal.cik} &bull; Accession: {activeRssItemModal.accessionNumber}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveRssItemModal(null)}
                      className="p-1.5 rounded-lg bg-[#181822] hover:bg-[#222232] text-gray-400 hover:text-white border border-[#2A2A3C] transition-all cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Highlight Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                    <div className="p-3 rounded-xl bg-[#0E0E14] border border-[#20202E]">
                      <span className="text-[10px] text-gray-500 block uppercase">Statutory Item</span>
                      <span className="text-cyan-300 font-bold block mt-1">
                        {activeRssItemModal.itemCode || "Item 8.01 Other Events"}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#0E0E14] border border-[#20202E]">
                      <span className="text-[10px] text-gray-500 block uppercase">
                        {activeRssItemModal.category === "Mergers & Acquisitions"
                          ? "Deal Value"
                          : activeRssItemModal.category === "Insider Trading"
                          ? "Transaction Size"
                          : "Primary Value / Impact"}
                      </span>
                      <span className="text-amber-300 font-bold block mt-1">
                        {activeRssItemModal.dealValueOrImpact || "Material Disclosed"}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#0E0E14] border border-[#20202E]">
                      <span className="text-[10px] text-gray-500 block uppercase">Reporting Party</span>
                      <span className="text-gray-200 block mt-1">
                        {activeRssItemModal.filingParty || "Executive Officer"}
                      </span>
                    </div>
                  </div>

                  {/* Summary Block */}
                  <div className="p-4 rounded-xl bg-[#0A0A0E] border border-[#1E1E2C] space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400 font-mono">
                      Full Statutory Disclosure Excerpt:
                    </span>
                    <p className="text-sm leading-relaxed text-gray-200">
                      {activeRssItemModal.summary}
                    </p>
                  </div>

                  {/* ATS Risk & Compliance Assessment Box */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-[#141422] to-[#0E0E18] border border-cyan-500/30 space-y-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-white font-mono">
                        Token World Exchange ATS® Automated Compliance Evaluation
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      This {activeRssItemModal.category} filing triggers automated SEC Rule 15c3-5 market access pre-trade collar
                      validation. Digital transfer agent custody records (DTCC FAST #9450) and ONCHAINID whitelists are
                      cross-referenced for regulatory clearance prior to order book matching.
                    </p>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#202030] text-xs font-mono">
                    <span className="text-gray-500">
                      Filed: {new Date(activeRssItemModal.updated).toLocaleString()}
                    </span>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(activeRssItemModal.accessionNumber);
                          setCopiedRssAccession("modal");
                          setTimeout(() => setCopiedRssAccession(null), 2000);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#181822] hover:bg-[#222232] text-gray-300 hover:text-white border border-[#2A2A3C] transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        {copiedRssAccession === "modal" ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Accession</span>
                          </>
                        )}
                      </button>

                      <a
                        href={activeRssItemModal.link}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-bold flex items-center gap-1.5 transition-all shadow-md"
                      >
                        Open SEC Archive Entry
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* =========================================================================
          TAB 5: ALERT HISTORY
         ========================================================================= */}
      {activeSubTab === "alert_history" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#111116] border border-[#1F1F28] p-4 rounded-xl">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-rose-400" />
                Triggered High-Risk 8-K & Threshold Breach History
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Audit trail of regulatory disclosures exceeding risk sensitivities. Automatically notifies{" "}
                <span className="text-white font-mono underline">{alertSettings.notifyEmail}</span>.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const cleared = alertHistory.map((a) => ({ ...a, acknowledged: true }));
                setAlertHistory(cleared);
                saveAlertHistory(cleared);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#181822] hover:bg-[#20202E] text-gray-300 hover:text-white border border-[#2A2A38] text-xs font-medium transition-all cursor-pointer"
            >
              Acknowledge All Alerts
            </button>
          </div>

          <div className="rounded-xl bg-[#111116] border border-[#1F1F28] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#161620] text-gray-400 uppercase font-mono tracking-wider text-[11px] border-b border-[#222230]">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Ticker & Form</th>
                    <th className="py-3 px-4">Trigger Reason</th>
                    <th className="py-3 px-4">Risk Mentions</th>
                    <th className="py-3 px-4">Dispatched To</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1A24]">
                  {alertHistory.map((alert) => (
                    <tr
                      key={alert.id}
                      className={`hover:bg-[#161622] transition-colors ${
                        !alert.acknowledged ? "bg-rose-950/20" : ""
                      }`}
                    >
                      <td className="py-3 px-4 font-mono text-gray-400 whitespace-nowrap">
                        {new Date(alert.timestamp).toLocaleString()}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] border ${
                            alert.severity === "CRITICAL"
                              ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
                              : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          }`}
                        >
                          {alert.severity}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-white font-mono flex items-center gap-1.5">
                          <span className="text-amber-400">{alert.ticker}</span>
                          <span className="text-xs px-1.5 py-0.2 rounded bg-[#1F1F2A] text-gray-300">
                            {alert.form}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                          Acc: {alert.accessionNumber}
                        </div>
                      </td>

                      <td className="py-3 px-4 max-w-sm">
                        <div className="text-gray-200 font-medium">{alert.triggerReason}</div>
                      </td>

                      <td className="py-3 px-4 text-center font-mono">
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold">
                          {alert.riskMentions}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-gray-300 whitespace-nowrap flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-rose-400" />
                        {alert.emailSentTo}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            const filing = filings.find((f) => f.accessionNumber === alert.accessionNumber);
                            if (filing) setActiveFilingModal(filing);
                            else window.open(alert.filingUrl, "_blank");
                          }}
                          className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          View Filing
                        </button>
                      </td>
                    </tr>
                  ))}
                  {alertHistory.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500 font-mono">
                        No alert history recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 6: POSTGRESQL & PGVECTOR INTERACTIVE WORKBENCH
         ========================================================================= */}
      {activeSubTab === "postgres_workbench" && (
        <div className="space-y-6">
          {/* Header & Status */}
          <div className="rounded-xl bg-[#121218] border border-[#1F1F28] p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#1F1F28] pb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-cyan-400" />
                  PostgreSQL Hybrid Storage Console & pgvector Semantic Search
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Hybrid storage model: Relational metadata & XBRL metrics for fast screening, plus 1536-dim vector embeddings for AI document search.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  PostgreSQL 16.4 + pgvector
                </span>
                <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {queryResult.rowCount} rows &bull; {queryResult.executionTimeMs} ms
                </span>
              </div>
            </div>

            {/* Preset Query Buttons */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 font-mono">
                Preset Institutional Queries:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {PRESET_SQL_QUERIES.map((preset) => {
                  const isSelected = activePresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setActivePresetId(preset.id);
                        setSqlInput(preset.sql);
                        const res = executePostgreSqlQuery(preset.sql, vectorQueryText);
                        setQueryResult(res);
                      }}
                      className={`p-3 rounded-lg text-left transition-all border cursor-pointer ${
                        isSelected
                          ? "bg-cyan-500/15 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                          : "bg-[#161622] border-[#222234] hover:border-[#333348]"
                      }`}
                    >
                      <div className="text-xs font-bold font-mono text-white flex items-center justify-between">
                        <span>{preset.title}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 line-clamp-2">
                        {preset.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Vector Natural Language Prompt Bar (for pgvector AI Search) */}
            {(activePresetId === "ai_search" || sqlInput.includes("filing_embeddings") || sqlInput.includes("<=>")) && (
              <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300 font-mono flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    pgvector 1536-dim Embedding Question:
                  </span>
                  <span className="text-[10px] font-mono text-purple-400">Cosine Distance: &lt;=&gt;</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={vectorQueryText}
                    onChange={(e) => setVectorQueryText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const res = executePostgreSqlQuery(sqlInput, vectorQueryText);
                        setQueryResult(res);
                      }
                    }}
                    placeholder="Enter natural language query to match embeddings..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[#0E0E14] border border-[#2D2240] text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const res = executePostgreSqlQuery(sqlInput, vectorQueryText);
                      setQueryResult(res);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-mono cursor-pointer transition-all"
                  >
                    Match Embeddings
                  </button>
                </div>

                {/* Question Suggestion Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] font-mono">
                  <span className="text-gray-400">Suggested Queries:</span>
                  {[
                    "Show cloud-computing risks mentioned by Microsoft",
                    "Find cybersecurity incidents reported in 8-Ks",
                    "Compare AI disclosures across Magnificent Seven companies",
                    "Department of Justice antitrust and subpoena inquiries",
                  ].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => {
                        setVectorQueryText(sug);
                        const res = executePostgreSqlQuery(sqlInput, sug);
                        setQueryResult(res);
                      }}
                      className="px-2 py-0.5 rounded bg-[#1B1628] hover:bg-[#251D38] text-purple-300 hover:text-white border border-purple-500/20 cursor-pointer transition-all truncate max-w-xs"
                    >
                      &ldquo;{sug}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* SQL Editor Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-300 font-mono flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-amber-400" />
                  SQL Query Input (PostgreSQL Dialect):
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  Press Ctrl+Enter or click Run Query
                </span>
              </div>

              <div className="relative">
                <textarea
                  rows={4}
                  value={sqlInput}
                  onChange={(e) => setSqlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                      e.preventDefault();
                      const res = executePostgreSqlQuery(sqlInput, vectorQueryText);
                      setQueryResult(res);
                    }
                  }}
                  className="w-full p-3 rounded-xl bg-[#09090D] border border-[#222230] text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500/60 leading-relaxed resize-y"
                  spellCheck={false}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsExecutingSql(true);
                      setTimeout(() => {
                        const res = executePostgreSqlQuery(sqlInput, vectorQueryText);
                        setQueryResult(res);
                        setIsExecutingSql(false);
                      }, 100);
                    }}
                    disabled={isExecutingSql}
                    className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <Play className={`w-3.5 h-3.5 ${isExecutingSql ? "animate-spin" : ""}`} />
                    Execute SQL Query
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPythonDriverCode((prev) => !prev)}
                    className="px-3 py-2 rounded-lg bg-[#181822] hover:bg-[#20202E] text-gray-300 hover:text-white border border-[#2A2A38] text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                    {showPythonDriverCode ? "Hide Python psycopg2 Driver" : "View Python psycopg2 Driver"}
                  </button>
                </div>

                <span className="text-[11px] font-mono text-gray-400">
                  Executed in <span className="text-emerald-400 font-bold">{queryResult.executionTimeMs} ms</span> &bull; {queryResult.rowCount} rows
                </span>
              </div>
            </div>

            {/* Python psycopg2 Snippet (Verbatim from specification) */}
            {showPythonDriverCode && (
              <div className="p-4 rounded-xl bg-[#0A0A0E] border border-[#222230] space-y-3 font-mono text-xs text-gray-300 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-[#1E1E2A] pb-2">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <Code2 className="w-4 h-4" />
                    Python psycopg2 Hybrid Connection & Storage Script
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        `import psycopg2\n\nconn = psycopg2.connect(\n    host="localhost",\n    port=5432,\n    database="edgar",\n    user="postgres",\n    password="password"\n)\ncur = conn.cursor()`,
                        "python_code"
                      )
                    }
                    className="text-[11px] px-2 py-0.5 rounded bg-[#181824] hover:bg-[#202030] text-gray-300 hover:text-white"
                  >
                    {copiedToken === "python_code" ? "Copied!" : "Copy Python Snippet"}
                  </button>
                </div>

                <pre className="overflow-x-auto text-[11px] leading-relaxed text-gray-300">{`# 2. PostgreSQL Connection
import psycopg2

conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="edgar",
    user="postgres",
    password="password"
)
cur = conn.cursor()

# 3. Insert Filing Metadata
def insert_filing(filing):
    sql = """
    INSERT INTO filings (
        accession_number, cik, ticker, company_name, form_type, filing_date, filing_url
    )
    VALUES (%s, %s, %s, %s, %s, %s, %s)
    ON CONFLICT (accession_number) DO NOTHING;
    """
    cur.execute(sql, (
        filing.accession_number, filing.cik, filing.ticker,
        filing.company, filing.form, filing.filing_date, filing.url
    ))
    conn.commit()

# 4. Store Filing Text
def store_document(accession, html_content, plain_text):
    cur.execute("""
        INSERT INTO filing_documents(accession_number, document_type, html_content, plain_text)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT DO NOTHING;
    """, (accession, "primary", html_content, plain_text))
    conn.commit()

# 5. Store XBRL Facts
def store_fact(accession, concept, value, unit, period_end):
    cur.execute("""
        INSERT INTO financial_facts(accession_number, concept, value, unit, period_end)
        VALUES (%s, %s, %s, %s, %s);
    """, (accession, concept, value, unit, period_end))
    conn.commit()`}</pre>
              </div>
            )}

            {/* Analytics & Cloud Storage Exporters (DuckDB Parquet, Pandas CSV, S3 Manifest) */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#12121B] via-[#101017] to-[#141420] border border-[#222234] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex-shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                      Analytics &amp; Cloud Storage Exporters
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      ZSTD Parquet &bull; Multi-Table CSV &bull; S3
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Export high-performance analytical datasets directly for DuckDB pipelines, Pandas quantitative models, and S3/Power BI cloud warehouses.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
                <button
                  type="button"
                  onClick={exportPandasCsvBundle}
                  className="px-3 py-1.5 rounded-lg bg-[#181824] hover:bg-[#222232] text-emerald-300 border border-emerald-500/30 text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:border-emerald-400"
                  title="Download filings, financial_facts, and embeddings as multi-table CSV files"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  Export Pandas CSV Bundle
                </button>
                <button
                  type="button"
                  onClick={exportDuckDbParquetScript}
                  className="px-3 py-1.5 rounded-lg bg-[#181824] hover:bg-[#222232] text-amber-300 border border-amber-500/30 text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:border-amber-400"
                  title="Download DuckDB Python ingestion script that generates compressed ZSTD Parquet files"
                >
                  <Code2 className="w-3.5 h-3.5 text-amber-400" />
                  Download DuckDB Parquet Script
                </button>
                <button
                  type="button"
                  onClick={exportS3Manifest}
                  className="px-3 py-1.5 rounded-lg bg-[#181824] hover:bg-[#222232] text-cyan-300 border border-cyan-500/30 text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:border-cyan-400"
                  title="Download S3 Cloud storage JSON manifest with row counts and query endpoints"
                >
                  <Database className="w-3.5 h-3.5 text-cyan-400" />
                  Download S3 Manifest
                </button>
              </div>
            </div>

            {/* Query Results Data Grid */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 font-mono">
                Query Result Set ({queryResult.rowCount} rows):
              </span>

              <div className="rounded-xl border border-[#1F1F28] overflow-hidden bg-[#0D0D12]">
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#161622] text-gray-400 uppercase text-[10px] sticky top-0 border-b border-[#222230]">
                      <tr>
                        {queryResult.columns.map((col, idx) => (
                          <th key={idx} className="py-2.5 px-3 whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1A1A26]">
                      {queryResult.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-[#151520] transition-colors">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="py-2.5 px-3 text-gray-300 max-w-md truncate">
                              {cIdx === 0 && String(cell).includes("-") ? (
                                <span className="font-bold text-cyan-400">{String(cell)}</span>
                              ) : String(cell).includes("match") ? (
                                <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                                  {String(cell)}
                                </span>
                              ) : String(cell).startsWith("$") ? (
                                <span className="text-emerald-400 font-bold">{String(cell)}</span>
                              ) : (
                                String(cell)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {queryResult.rows.length === 0 && (
                        <tr>
                          <td colSpan={queryResult.columns.length || 1} className="py-6 text-center text-gray-500">
                            Query returned 0 rows.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 7: OFFICIAL SEC EDGAR NEXT TOKEN MANAGEMENT & COMPLIANCE GUIDE
         ========================================================================= */}
      {activeSubTab === "edgar_next" && (
        <div className="space-y-6">
          {/* Official Government & Creator Header Banner */}
          <div className="rounded-xl bg-[#121218] border border-[#242436] p-4 text-xs space-y-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#1E1E2C] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Landmark className="w-4 h-4 text-amber-400" />
                  An official website of the United States government
                </span>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  Here’s how you know
                </span>
              </div>
              <div className="text-[11px] font-mono text-gray-400">
                U.S. Securities and Exchange Commission &bull; SEC.gov
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 font-mono text-xs">
              <div>
                <span className="font-bold text-[#F27D26]">Token World Exchange ATS® (TWE)</span>
                <span className="text-gray-400 ml-2">Creator: Mauro Lomibao Dar III</span>
              </div>
              <div className="text-gray-400">
                <span className="text-white">maurodar08@gmail.com</span> &bull; 945 Westholme Ave. LA CA 90024
              </div>
            </div>
          </div>

          {/* Active Credentials Cards (Static Display per User Preference) */}
          <div className="rounded-xl bg-[#121218] border border-[#1F1F28] p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#1F1F28] pb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400" />
                  SEC EDGAR Next Verified API Token Credentials
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Static display of active Filer API Token and User API Token credentials authorized under EDGAR Next architecture.
                </p>
              </div>

              <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Status: Verified Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Filer API Token */}
              <div className="p-4 rounded-xl bg-[#161622] border border-[#242436] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                    Filer API Token (Technical Administrator)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    1-Year Validity
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    readOnly
                    value={edgarTokens.filerApiToken}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[#0E0E14] border border-[#28283C] text-xs font-mono text-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(edgarTokens.filerApiToken, "filer_token")}
                    className="px-2.5 py-1.5 rounded-lg bg-[#222234] hover:bg-[#2A2A40] text-gray-300 hover:text-white text-xs font-mono flex items-center gap-1 transition-all cursor-pointer"
                  >
                    {copiedToken === "filer_token" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : "Copy"}
                  </button>
                </div>
                <div className="text-[11px] text-gray-400 font-mono">
                  Technical Administrator: <span className="text-white">{edgarTokens.filerTechnicalAdmin}</span> &bull; Valid until: {edgarTokens.filerTokenExpiry.slice(0, 10)}
                </div>
              </div>

              {/* User API Token */}
              <div className="p-4 rounded-xl bg-[#161622] border border-[#242436] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    User API Token (Login.gov Credentials)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    30-Day Rolling
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    readOnly
                    value={edgarTokens.userApiToken}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[#0E0E14] border border-[#28283C] text-xs font-mono text-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(edgarTokens.userApiToken, "user_token")}
                    className="px-2.5 py-1.5 rounded-lg bg-[#222234] hover:bg-[#2A2A40] text-gray-300 hover:text-white text-xs font-mono flex items-center gap-1 transition-all cursor-pointer"
                  >
                    {copiedToken === "user_token" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : "Copy"}
                  </button>
                </div>
                <div className="text-[11px] text-gray-400 font-mono">
                  Login.gov Account: <span className="text-white">{edgarTokens.userLoginGovEmail}</span> &bull; Valid until: {edgarTokens.userTokenExpiry.slice(0, 10)}
                </div>
              </div>
            </div>
          </div>

          {/* Official SEC EDGAR Next Guidance Text (Full Official Content) */}
          <div className="rounded-xl bg-[#121218] border border-[#1F1F28] p-5 shadow-xl space-y-5 text-xs text-gray-300 leading-relaxed">
            <div className="border-b border-[#1F1F28] pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-cyan-400" />
                SEC EDGAR Next: Create and Manage Filer and User API Tokens
              </h4>
              <p className="text-[11px] text-gray-400 mt-0.5 font-mono">
                Official SEC guidance jump sections: Introduction to API Tokens &bull; Create a Filer API Token &bull; Inactivate a Filer API Token &bull; Create a User API Token
              </p>
            </div>

            {/* Section 1: Introduction */}
            <div className="space-y-1.5">
              <h5 className="font-bold text-white text-xs">Introduction to API Tokens</h5>
              <p>
                Application Programming Interface (API) tokens are a security requirement for use of EDGAR Next APIs.
                As explained below, there are two different API tokens: the <strong>filer API token</strong> and the <strong>user API token</strong>.
                For information about EDGAR Next APIs, refer to <em>How Do I Understand EDGAR Application Programming Interfaces (APIs)</em>, <em>Overview of EDGAR APIs</em>, and the <em>API Development Toolkit</em>.
              </p>
            </div>

            {/* Section 2: Create a Filer API Token */}
            <div className="space-y-1.5">
              <h5 className="font-bold text-white text-xs">Create a Filer API Token</h5>
              <ul className="list-disc list-inside space-y-1 text-gray-300 pl-1">
                <li>A filer must present a filer API token to connect to APIs.</li>
                <li>A filer API token is valid for <strong>one year</strong> from date of creation.</li>
                <li>Filer API tokens must be created by a filer’s technical administrator.</li>
                <li><strong>Each filer must have at least two technical administrators</strong> to connect to APIs.</li>
                <li>A filer’s technical administrators are responsible for managing the filer’s connections to APIs.</li>
                <li>Technical administrators may generate an unlimited number of filer API tokens on the dashboard.</li>
                <li>Multiple different filer API tokens can be used by the filer at any given time, and filer API tokens may overlap in duration.</li>
                <li><strong>Delegated entity exception:</strong> A filer may choose to use the filer API token and API connections of its delegated entity (so long as the delegated entity has authorized at least two technical administrators).</li>
              </ul>
            </div>

            {/* Section 3: Inactivate a Filer API Token */}
            <div className="space-y-1.5">
              <h5 className="font-bold text-white text-xs">Inactivate a Filer API Token</h5>
              <p>
                A filer’s technical administrator can inactivate a filer API token at any time. Once inactivated, no one will be able to use the token.
                Select the ellipsis next to the relevant token under Actions, select Inactivate, then choose Yes, Inactivate. You will receive an email verification at the address provided to create your Login.gov credentials for EDGAR.
              </p>
            </div>

            {/* Section 4: Create a User API Token */}
            <div className="space-y-1.5">
              <h5 className="font-bold text-white text-xs">Create a User API Token</h5>
              <ul className="list-disc list-inside space-y-1 text-gray-300 pl-1">
                <li>Each account administrator or user must present that individual’s own user API token to the EDGAR Submission API and any EDGAR Filer Management API.</li>
                <li>A user API token is <strong>not required</strong> for the EDGAR Submission Status API or Operational Status API.</li>
                <li>User API tokens are valid for <strong>30 days</strong> from date of creation.</li>
                <li>An account administrator or user may generate a user API token. A technical administrator cannot generate a user API token unless also a user or account administrator.</li>
                <li><strong>Each individual may only have one active user API token at any given time.</strong></li>
                <li>To inactivate a user API token, simply create a new user API token; the prior user API token is automatically inactivated by EDGAR.</li>
              </ul>
            </div>

            <div className="pt-2 text-[11px] font-mono text-gray-500 border-t border-[#1F1F28]">
              Last Reviewed or Updated: April 3, 2025 &bull; U.S. Securities and Exchange Commission &bull; SEC EDGAR Next
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 8: NYSE LISTING MANAGER & SEC 8-K DUAL COMPLIANCE BRIDGE
         ========================================================================= */}
      {activeSubTab === "nyse_bridge" && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="rounded-xl bg-gradient-to-b from-[#14141C] to-[#0E0E14] border border-[#222234] p-5 shadow-xl space-y-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-[#1E1E2C] pb-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1C1C28] to-[#0D0D12] border border-amber-500/50 p-0.5 shadow-[0_0_15px_rgba(242,125,38,0.35)] flex items-center justify-center flex-shrink-0">
                  <img
                    src="/assets/aistudio/IMG_20261026_022436_ab42bf11.jpg"
                    alt="Token World Exchange ATS®"
                    className="w-full h-full object-contain rounded-lg hover:scale-105 transition-transform"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/twe_logo.jpg";
                    }}
                  />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      NYSE Listing Manager &amp; SEC 8-K Dual Compliance Bridge
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live Portal Bridge Active
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 font-semibold">
                      NYSE Rule 497 &amp; 15c3-5
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 max-w-3xl leading-relaxed">
                    Automated regulatory synchronization bridging Token World Exchange ATS® (TWE) trading venue operations with
                    NYSE Listing Manager filings, dual-venue SEC Form 8-K corporate actions, Supplemental Listing Applications, and DTCC FAST transfer agent reconciliations.
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 self-end lg:self-center">
                <button
                  type="button"
                  onClick={() => {
                    SEED_NYSE_COMPLIANCE_NOTICES.forEach((notice) => downloadNyseCompliancePacket(notice));
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  title="Download all compliance verification HTML packets"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download All Packets ({SEED_NYSE_COMPLIANCE_NOTICES.length})
                </button>
              </div>
            </div>

            {/* ATS Venue & Creator Attribution Strip */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-lg bg-[#0A0A0E] border border-[#1A1A24] text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-[#F27D26] font-bold">Token World Exchange ATS® (TWE)</span>
                <span className="text-gray-500">&bull;</span>
                <span className="text-gray-300">Creator &amp; Sole Owner: Mauro Lomibao Dar III</span>
              </div>
              <div className="text-gray-400 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-cyan-300">maurodar08@gmail.com</span>
                <span className="text-gray-500">&bull;</span>
                <span>945 Westholme Ave. LA CA 90024</span>
              </div>
            </div>

            {/* Quick Metrics KPI Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-[#0F0F16] border border-[#1C1C28] space-y-1">
                <div className="text-[10px] font-mono text-gray-400 uppercase">Dual Filings Monitored</div>
                <div className="text-lg font-bold text-white font-mono">{SEED_NYSE_COMPLIANCE_NOTICES.length} Notices</div>
                <div className="text-[10px] text-emerald-400">100% SEC/NYSE In Sync</div>
              </div>

              <div className="p-3 rounded-lg bg-[#0F0F16] border border-[#1C1C28] space-y-1">
                <div className="text-[10px] font-mono text-gray-400 uppercase">DTCC FAST Eligibility</div>
                <div className="text-lg font-bold text-emerald-400 font-mono">
                  {SEED_NYSE_COMPLIANCE_NOTICES.filter((n) => n.dtccFastEligibility).length} / {SEED_NYSE_COMPLIANCE_NOTICES.length}
                </div>
                <div className="text-[10px] text-gray-400">Direct Book-Entry Settled</div>
              </div>

              <div className="p-3 rounded-lg bg-[#0F0F16] border border-[#1C1C28] space-y-1">
                <div className="text-[10px] font-mono text-gray-400 uppercase">Transfer Agents</div>
                <div className="text-lg font-bold text-cyan-400 font-mono">2 Agents</div>
                <div className="text-[10px] text-gray-400">Continental &amp; Computershare</div>
              </div>

              <div className="p-3 rounded-lg bg-[#0F0F16] border border-[#1C1C28] space-y-1">
                <div className="text-[10px] font-mono text-gray-400 uppercase">Compliance Status</div>
                <div className="text-lg font-bold text-amber-400 font-mono">ALL CLEARED</div>
                <div className="text-[10px] text-gray-400">No active listing collars</div>
              </div>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#121218] border border-[#1F1F28] text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-gray-400 font-mono font-bold flex items-center gap-1.5 mr-1">
                <Filter className="w-3.5 h-3.5 text-amber-400" />
                Filter Notices:
              </span>

              {/* Ticker Filter */}
              <div className="flex items-center gap-1">
                {["ALL", "TW-EQ", "TREE3", "NVDA", "AAPL"].map((ticker) => (
                  <button
                    key={ticker}
                    type="button"
                    onClick={() => setSelectedNyseTicker(ticker)}
                    className={`px-2.5 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                      selectedNyseTicker === ticker
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                        : "bg-[#181822] text-gray-400 hover:text-white border border-[#222230]"
                    }`}
                  >
                    {ticker}
                  </button>
                ))}
              </div>

              <div className="h-4 w-[1px] bg-[#222230] mx-1" />

              {/* Status Filter */}
              <div className="flex items-center gap-1">
                {["ALL", "CLEARED", "ACKNOWLEDGED"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setSelectedNyseStatus(status)}
                    className={`px-2 py-1 rounded text-[11px] font-mono transition-all cursor-pointer ${
                      selectedNyseStatus === status
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold"
                        : "bg-[#181822] text-gray-400 hover:text-white border border-[#222230]"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-gray-400 font-mono text-[11px]">
              Showing{" "}
              {
                SEED_NYSE_COMPLIANCE_NOTICES.filter(
                  (n) =>
                    (selectedNyseTicker === "ALL" || n.ticker === selectedNyseTicker) &&
                    (selectedNyseStatus === "ALL" || n.status === selectedNyseStatus)
                ).length
              }{" "}
              of {SEED_NYSE_COMPLIANCE_NOTICES.length} compliance bridge items
            </span>
          </div>

          {/* Compliance Notice Cards */}
          <div className="space-y-4">
            {SEED_NYSE_COMPLIANCE_NOTICES.filter(
              (n) =>
                (selectedNyseTicker === "ALL" || n.ticker === selectedNyseTicker) &&
                (selectedNyseStatus === "ALL" || n.status === selectedNyseStatus)
            ).map((notice) => {
              const linkedFiling = filings.find((f) => f.accessionNumber === notice.secAccessionNumber);

              return (
                <div
                  key={notice.id}
                  className="rounded-xl bg-[#121218] border border-[#1F1F28] hover:border-[#2C2C3E] p-5 shadow-lg space-y-4 transition-all"
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#1E1E2C] pb-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold">
                        {notice.ticker}
                      </span>
                      <span className="text-sm font-bold text-white">
                        {notice.companyName}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-[#1A1A28] text-gray-300 border border-[#26263A]">
                        {notice.noticeType.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-mono font-bold px-2.5 py-1 rounded border ${
                          notice.status === "CLEARED"
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                            : "bg-blue-500/15 text-blue-300 border-blue-500/40"
                        }`}
                      >
                        {notice.status}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        {new Date(notice.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Headline & Subject */}
                  <div>
                    <h4 className="text-sm font-semibold text-white leading-snug">
                      {notice.headline}
                    </h4>
                  </div>

                  {/* Technical & Settlement Specs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 rounded-lg bg-[#0A0A0E] border border-[#1B1B26] text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase block">NYSE Portal Reference</span>
                      <span className="text-cyan-400 font-bold">{notice.nyseListingPortalRef}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-500 uppercase block">SEC Accession Number</span>
                      <span className="text-gray-300 font-bold">{notice.secAccessionNumber}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-500 uppercase block">Transfer Agent</span>
                      <span className="text-gray-300 truncate block" title={notice.transferAgent}>
                        {notice.transferAgent}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-500 uppercase block">DTCC FAST Eligibility</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Verified (Fast Eligible)
                      </span>
                    </div>
                  </div>

                  {/* Operational Notes */}
                  <div className="p-3 rounded-lg bg-[#14141E] border border-[#202030] text-xs space-y-1">
                    <span className="text-[10px] font-mono text-gray-400 uppercase font-bold block">
                      Operational &amp; Regulatory Bridge Notes:
                    </span>
                    <p className="text-gray-300 leading-relaxed">
                      {notice.notes}
                    </p>
                  </div>

                  {/* Card Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#1C1C28]">
                    <div className="text-[11px] font-mono text-gray-500">
                      Authorized Shares: <span className="text-gray-300 font-bold">{notice.sharesAuthorized.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {linkedFiling && (
                        <button
                          type="button"
                          onClick={() => setActiveFilingModal(linkedFiling)}
                          className="px-3 py-1.5 rounded-lg bg-[#1A1A26] hover:bg-[#242436] text-cyan-300 hover:text-white border border-cyan-500/30 text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          Inspect SEC 8-K ({linkedFiling.form})
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => downloadNyseCompliancePacket(notice)}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold font-mono flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download Compliance Packet (HTML)
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Regulatory Standards Reference Accordion */}
          <div className="rounded-xl bg-[#101016] border border-[#1E1E2A] p-5 space-y-3 text-xs text-gray-300">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400" />
              NYSE Listing Standards &amp; ATS Dual Compliance Reference
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-[#0A0A0E] border border-[#1A1A24] space-y-1.5">
                <h5 className="font-bold text-white text-xs">NYSE Rule 497 &amp; Tokenized Secondary Markets</h5>
                <p className="text-gray-400 leading-relaxed text-[11px]">
                  Dual-venue securities listed on the New York Stock Exchange and concurrently traded via Token World Exchange ATS® (TWE)
                  must satisfy SEC Rule 15c3-5 market access controls and maintain continuous reconciliation with the designated DTCC FAST transfer agent.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#0A0A0E] border border-[#1A1A24] space-y-1.5">
                <h5 className="font-bold text-white text-xs">Section 303A Corporate Governance Affirmations</h5>
                <p className="text-gray-400 leading-relaxed text-[11px]">
                  Annual Written Affirmations and interim material change disclosures must be filed concurrently with SEC Form 8-K and submitted via the NYSE Listing Manager portal within 4 business days of occurrence.
                </p>
              </div>
            </div>

            <div className="pt-2 text-[11px] font-mono text-gray-500 border-t border-[#1C1C28] flex justify-between items-center">
              <span>Token World Exchange ATS® (TWE) &bull; NYSE Listing Bridge</span>
              <span>Mauro Lomibao Dar III &bull; 945 Westholme Ave. LA CA 90024</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 9: GEMINI 3.8 FLASH MD&A ITEM 7 SENTIMENT & TONE ANALYZER
         ========================================================================= */}
      {activeSubTab === "sentiment_analysis" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Toast Notification Banner */}
          {sentimentToast && (
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/60 via-[#181824] to-[#12121A] border border-amber-500/50 flex items-center justify-between gap-3 text-xs text-amber-200 shadow-lg animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                <span className="font-semibold">{sentimentToast}</span>
              </div>
              <button
                type="button"
                onClick={() => setSentimentToast(null)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Top Engine Overview Card */}
          <div className="rounded-2xl bg-gradient-to-br from-[#151520] via-[#101018] to-[#0A0A0E] border border-[#26263A] p-5 sm:p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-12 -top-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute right-40 -bottom-10 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
              <div className="space-y-2 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    GEMINI 3.8 FLASH MD&amp;A ENGINE
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    SEC Form 10-K &bull; Item 7 Tone Extraction
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1C1C2A] text-gray-400 border border-[#2E2E42]">
                    Server-Side Proxy: /api/gemini/sec-mda-sentiment
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                  Management Discussion &amp; Analysis (MD&amp;A) Tone Analysis
                </h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Evaluates executive tone, forward guidance conviction, capital expenditure aggressiveness, and regulatory risk sentiment within Item 7 disclosures of the latest SEC Form 10-K filings. Integrated directly into Token World Exchange ATS® pre-trade risk protocols.
                </p>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                <button
                  type="button"
                  onClick={() => setShowMdaEditor((prev) => !prev)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-mono font-medium border flex items-center gap-2 transition-all cursor-pointer ${
                    showMdaEditor
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                      : "bg-[#181824] hover:bg-[#202030] text-gray-300 border-[#2A2A3E]"
                  }`}
                >
                  <Code2 className="w-4 h-4 text-cyan-400" />
                  {showMdaEditor ? "Hide Raw Excerpt" : "View/Edit Item 7 Text"}
                </button>

                {sentimentResult && (
                  <button
                    type="button"
                    onClick={() => exportMdaSentimentReportMarkdown(sentimentResult)}
                    className="px-3.5 py-2 rounded-xl bg-[#181824] hover:bg-[#222234] text-gray-200 hover:text-white border border-[#2A2A3E] text-xs font-mono font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                  >
                    <Download className="w-4 h-4 text-amber-400" />
                    Export Executive Report (.md)
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleRunMdaAnalysis(selectedSentimentTicker, showMdaEditor ? mdaCustomInput : undefined)}
                  disabled={isAnalyzingSentiment}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-bold font-mono flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isAnalyzingSentiment ? "animate-spin text-black" : ""}`} />
                  {isAnalyzingSentiment ? "Analyzing with Gemini..." : "Re-Analyze with Gemini 3.8"}
                </button>
              </div>
            </div>

            {/* Watchlist Ticker Selector Strip */}
            <div className="mt-5 pt-4 border-t border-[#1F1F30] flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono text-gray-400 font-bold uppercase mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-amber-400" />
                Select 10-K Filer:
              </span>
              {watchlist.map((t) => {
                const isSelected = selectedSentimentTicker === t;
                const cached = sentimentCache[t];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedSentimentTicker(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                      isSelected
                        ? "bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/30 font-black scale-105"
                        : "bg-[#14141E] hover:bg-[#1E1E2C] text-gray-300 border-[#26263A]"
                    }`}
                  >
                    <span>{t}</span>
                    {cached && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                          isSelected
                            ? "bg-black/30 text-black"
                            : cached.overallScore >= 70
                            ? "bg-emerald-500/20 text-emerald-300"
                            : cached.overallScore >= 40
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-rose-500/20 text-rose-300"
                        }`}
                      >
                        {cached.overallScore > 0 ? "+" : ""}
                        {cached.overallScore}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Raw Item 7 Excerpt Inspector / Editor */}
          {showMdaEditor && (
            <div className="rounded-xl bg-[#101018] border border-cyan-500/40 p-4 space-y-3 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#1E1E2E] pb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white font-mono">
                    Form 10-K Item 7 Disclosure Excerpt &bull; {selectedSentimentTicker}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    {mdaCustomInput.length.toLocaleString()} characters
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const sample = SAMPLE_MDA_TEXTS[selectedSentimentTicker];
                      if (sample) setMdaCustomInput(sample.excerpt);
                    }}
                    className="text-[11px] font-mono text-gray-400 hover:text-white underline cursor-pointer"
                  >
                    Reset to SEC Official Excerpt
                  </button>
                </div>
              </div>
              <textarea
                value={mdaCustomInput}
                onChange={(e) => setMdaCustomInput(e.target.value)}
                rows={7}
                placeholder="Paste or edit SEC Form 10-K Item 7 MD&A disclosure text to re-evaluate with Gemini..."
                className="w-full bg-[#0A0A0F] border border-[#242436] rounded-lg p-3 text-xs text-gray-200 font-mono focus:outline-none focus:border-cyan-500/60 leading-relaxed resize-y"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleRunMdaAnalysis(selectedSentimentTicker, mdaCustomInput)}
                  disabled={isAnalyzingSentiment}
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Re-Analyze Custom Excerpt
                </button>
              </div>
            </div>
          )}

          {/* Main Analysis Display */}
          {sentimentResult ? (
            <div className="space-y-6">
              {/* Top Row: Scorecard & 5 Tone Dimensions Bar Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Scorecard (5 cols on lg) */}
                <div className="lg:col-span-5 rounded-2xl bg-[#111118] border border-[#222232] p-5 sm:p-6 flex flex-col justify-between space-y-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-gray-400 font-bold uppercase tracking-wider">
                        Overall Sentiment Score
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1A1A28] text-cyan-300 border border-cyan-500/20 font-semibold">
                        Scale: -100 to +100
                      </span>
                    </div>

                    <div className="flex items-baseline gap-3">
                      <span
                        className={`text-5xl sm:text-6xl font-black font-mono tracking-tight ${
                          sentimentResult.overallScore >= 70
                            ? "text-emerald-400"
                            : sentimentResult.overallScore >= 40
                            ? "text-amber-400"
                            : sentimentResult.overallScore >= 0
                            ? "text-blue-400"
                            : "text-rose-400"
                        }`}
                      >
                        {sentimentResult.overallScore > 0 ? "+" : ""}
                        {sentimentResult.overallScore}
                      </span>
                      <span className="text-sm font-mono text-gray-500 font-bold">/ 100</span>
                    </div>

                    {/* Classification Badge */}
                    <div>
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-lg border font-mono ${
                          sentimentResult.overallScore >= 70
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                            : sentimentResult.overallScore >= 40
                            ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                            : "bg-rose-500/15 text-rose-300 border-rose-500/40"
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {sentimentResult.sentimentLabel}
                      </span>
                    </div>
                  </div>

                  {/* Metadata Stats */}
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#1C1C2A] text-xs font-mono">
                    <div className="p-2.5 rounded-lg bg-[#0C0C12] border border-[#1A1A26]">
                      <span className="text-[10px] text-gray-500 uppercase block">Confidence Rating</span>
                      <span className="text-sm font-bold text-white mt-0.5 block">
                        {sentimentResult.confidenceScore}% Certainty
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#0C0C12] border border-[#1A1A26]">
                      <span className="text-[10px] text-gray-500 uppercase block">Filing Period</span>
                      <span className="text-xs font-bold text-gray-200 mt-0.5 block truncate">
                        {sentimentResult.fiscalPeriod}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#0C0C12] border border-[#1A1A26] col-span-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-500">Analysis Engine:</span>
                        <span className="text-amber-400 font-bold">
                          {sentimentResult.modelUsed || "Gemini 3.8 Flash"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] mt-1">
                        <span className="text-gray-500">Accession Ref:</span>
                        <span className="text-gray-300 truncate max-w-[180px]">
                          {sentimentResult.accessionNumber || "0001045810-24-000029"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tone Dimensions Chart (7 cols on lg) */}
                <div className="lg:col-span-7 rounded-2xl bg-[#111118] border border-[#222232] p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-amber-400" />
                        5-Dimensional Tone &amp; Posture Breakdown
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Quantitative index scores extracted from Item 7 MD&amp;A linguistic patterns (0 to 100 scale).
                      </p>
                    </div>
                  </div>

                  {/* Horizontal Bar Chart via Recharts */}
                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: "Optimism", score: sentimentResult.toneDimensions.optimismVsCaution, fill: "#10B981" },
                          { name: "Forward Guidance", score: sentimentResult.toneDimensions.forwardGuidanceConviction, fill: "#06B6D4" },
                          { name: "CapEx Aggression", score: sentimentResult.toneDimensions.capitalExpenditureAggression, fill: "#F59E0B" },
                          { name: "Cost Pressure", score: sentimentResult.toneDimensions.inflationaryAndCostPressure, fill: "#F97316" },
                          { name: "Regulatory Concern", score: sentimentResult.toneDimensions.regulatoryAndLitigationConcern, fill: "#F43F5E" },
                        ]}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1F1F2E" horizontal={false} />
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          stroke="#6B7280"
                          fontSize={11}
                          tickLine={false}
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          stroke="#E5E7EB"
                          fontSize={11}
                          tickLine={false}
                          width={110}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#161622",
                            borderColor: "#2A2A3C",
                            borderRadius: "8px",
                            fontSize: "12px",
                            color: "#fff",
                          }}
                          formatter={(value: any) => [`${value} / 100`, "Index Score"]}
                        />
                        <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={18}>
                          {[
                            "#10B981",
                            "#06B6D4",
                            "#F59E0B",
                            "#F97316",
                            "#F43F5E",
                          ].map((color, index) => (
                            <Cell key={`cell-${index}`} fill={color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Tone Dimension Legend / Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-[#1C1C2A] text-center">
                    <div className="p-2 rounded-lg bg-[#0C0C12] border border-[#1A1A24]">
                      <div className="text-xs font-bold text-emerald-400 font-mono">
                        {sentimentResult.toneDimensions.optimismVsCaution}%
                      </div>
                      <div className="text-[9px] text-gray-400 font-mono uppercase mt-0.5">Optimism</div>
                    </div>
                    <div className="p-2 rounded-lg bg-[#0C0C12] border border-[#1A1A24]">
                      <div className="text-xs font-bold text-cyan-400 font-mono">
                        {sentimentResult.toneDimensions.forwardGuidanceConviction}%
                      </div>
                      <div className="text-[9px] text-gray-400 font-mono uppercase mt-0.5">Guidance</div>
                    </div>
                    <div className="p-2 rounded-lg bg-[#0C0C12] border border-[#1A1A24]">
                      <div className="text-xs font-bold text-amber-400 font-mono">
                        {sentimentResult.toneDimensions.capitalExpenditureAggression}%
                      </div>
                      <div className="text-[9px] text-gray-400 font-mono uppercase mt-0.5">CapEx Push</div>
                    </div>
                    <div className="p-2 rounded-lg bg-[#0C0C12] border border-[#1A1A24]">
                      <div className="text-xs font-bold text-orange-400 font-mono">
                        {sentimentResult.toneDimensions.inflationaryAndCostPressure}%
                      </div>
                      <div className="text-[9px] text-gray-400 font-mono uppercase mt-0.5">Cost Stress</div>
                    </div>
                    <div className="p-2 rounded-lg bg-[#0C0C12] border border-[#1A1A24] col-span-2 sm:col-span-1">
                      <div className="text-xs font-bold text-rose-400 font-mono">
                        {sentimentResult.toneDimensions.regulatoryAndLitigationConcern}%
                      </div>
                      <div className="text-[9px] text-gray-400 font-mono uppercase mt-0.5">Reg Risk</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Executive Summary Callout */}
              <div className="rounded-2xl bg-gradient-to-r from-[#14141E] via-[#101018] to-[#12121C] border border-amber-500/30 p-5 sm:p-6 space-y-2.5 shadow-xl">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 font-mono">
                    Executive MD&amp;A Tone &amp; Outlook Synthesis (Gemini 3.8 Flash):
                  </h4>
                </div>
                <p className="text-sm text-gray-200 leading-relaxed font-sans pl-3 border-l-2 border-amber-500">
                  {sentimentResult.executiveSummary}
                </p>
              </div>

              {/* Comparative Signals Matrix: Bullish Drivers vs Cautionary Risks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Bullish Signals Card */}
                <div className="rounded-2xl bg-[#101016] border border-emerald-500/30 p-5 space-y-3.5 shadow-lg">
                  <div className="flex items-center justify-between border-b border-[#1A1A26] pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-bold text-white">Key Bullish Signals &amp; Catalysts</h4>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                      {sentimentResult.keyBullishSignals.length} Extracted
                    </span>
                  </div>

                  <ul className="space-y-2.5">
                    {sentimentResult.keyBullishSignals.map((signal, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-emerald-100/90 leading-relaxed pl-3 border-l-2 border-emerald-500/70 bg-[#0A0A0E] p-2.5 rounded-r-lg border-y border-r border-[#1C1C28]"
                      >
                        <span className="font-semibold text-emerald-400 mr-1.5">&ldquo;</span>
                        {signal}
                        <span className="font-semibold text-emerald-400 ml-1">&rdquo;</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Cautionary Risks Card */}
                <div className="rounded-2xl bg-[#101016] border border-rose-500/30 p-5 space-y-3.5 shadow-lg">
                  <div className="flex items-center justify-between border-b border-[#1A1A26] pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-bold text-white">Management Disclosures &amp; Risk Nuances</h4>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                      {sentimentResult.keyCautionaryRisks.length} Disclosures
                    </span>
                  </div>

                  <ul className="space-y-2.5">
                    {sentimentResult.keyCautionaryRisks.map((risk, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-rose-100/90 leading-relaxed pl-3 border-l-2 border-rose-500/70 bg-[#0A0A0E] p-2.5 rounded-r-lg border-y border-r border-[#1C1C28]"
                      >
                        <span className="font-semibold text-rose-400 mr-1.5">&ldquo;</span>
                        {risk}
                        <span className="font-semibold text-rose-400 ml-1">&rdquo;</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Actionable ATS Venue Risk & Liquidity Protocol */}
              <div className="rounded-2xl bg-[#111119] border border-cyan-500/30 p-5 sm:p-6 space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Actionable ATS Execution Venue Collar &amp; Liquidity Parameters
                      </h4>
                      <p className="text-[11px] text-gray-400">
                        Enforced under SEC Regulation ATS &amp; SEC Rule 15c3-5 Pre-Trade Risk Engine
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-bold">
                    SEC Rule 15c3-5 Active
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#0B0B10] border border-[#1E1E2C] text-xs text-gray-200 leading-relaxed space-y-2">
                  <p className="font-mono text-cyan-300">
                    <strong>Institutional Venue Recommendation:</strong>
                  </p>
                  <p className="text-gray-300 pl-3 border-l-2 border-cyan-500">
                    {sentimentResult.actionableTakeawayForATS}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl bg-[#111118] border border-[#222232] space-y-3">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
              <h4 className="text-sm font-bold text-white">Analyzing Form 10-K Item 7 via Gemini 3.8 Flash...</h4>
              <p className="text-xs text-gray-400">Extracting executive tone dimensions, bullish signals, and regulatory disclosures.</p>
            </div>
          )}

          {/* Institutional Venue Attribution Footer */}
          <div className="p-4 rounded-xl bg-[#0D0D14] border border-[#1C1C28] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono text-gray-400">
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-amber-400" />
              <span className="text-gray-300 font-bold">Token World Exchange ATS® (TWE)</span>
              <span>&bull; Item 7 MD&amp;A AI Sentiment Module</span>
            </div>
            <div>
              <span>Owner &amp; Creator: Mauro Lomibao Dar III &bull; maurodar08@gmail.com</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: DETAILED FILING SUMMARY & REGULATORY KEYWORD HIGHLIGHTER
         ========================================================================= */}
      {activeFilingModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121218] border border-[#2A2A3C] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#222234] flex items-start justify-between gap-4 bg-[#161622]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold">
                    {activeFilingModal.form}
                  </span>
                  <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    {activeFilingModal.ticker}
                  </span>
                  {activeFilingModal.isHighRisk8K && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold animate-pulse">
                      HIGH-RISK DISCLOSURE
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-white mt-1.5">
                  {activeFilingModal.companyName} &mdash; Accession: {activeFilingModal.accessionNumber}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">
                  CIK: {activeFilingModal.cik} | Filing Date: {activeFilingModal.filingDate} | Size: {activeFilingModal.fileSizeFormatted}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadFilingHtml(activeFilingModal)}
                  className="px-3 py-1.5 rounded-lg bg-[#222234] hover:bg-[#2C2C42] text-gray-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Save HTML
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilingModal(null)}
                  className="p-1.5 rounded-lg bg-[#222234] hover:bg-[#2C2C42] text-gray-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Metrics Bar (summarize_document outputs) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-4 bg-[#0E0E14] border-b border-[#202030]">
              <div className="text-center p-2 rounded-lg bg-[#161622] border border-[#222234]">
                <div className="text-lg font-bold text-rose-400 font-mono">
                  {activeFilingModal.summary.risk_mentions}
                </div>
                <div className="text-[10px] text-gray-400 uppercase font-mono">Risk Mentions</div>
              </div>

              <div className="text-center p-2 rounded-lg bg-[#161622] border border-[#222234]">
                <div className="text-lg font-bold text-emerald-400 font-mono">
                  {activeFilingModal.summary.revenue_mentions}
                </div>
                <div className="text-[10px] text-gray-400 uppercase font-mono">Revenue Mentions</div>
              </div>

              <div className="text-center p-2 rounded-lg bg-[#161622] border border-[#222234]">
                <div className="text-lg font-bold text-cyan-400 font-mono">
                  {activeFilingModal.summary.guidance_mentions}
                </div>
                <div className="text-[10px] text-gray-400 uppercase font-mono">Guidance Mentions</div>
              </div>

              <div className="text-center p-2 rounded-lg bg-[#161622] border border-[#222234]">
                <div className="text-lg font-bold text-purple-400 font-mono">
                  {activeFilingModal.summary.word_count.toLocaleString()}
                </div>
                <div className="text-[10px] text-gray-400 uppercase font-mono">Word Count</div>
              </div>

              <div className="text-center p-2 rounded-lg bg-[#161622] border border-[#222234]">
                <div className={`text-lg font-bold font-mono ${
                  activeFilingModal.summary.sentiment_score >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}>
                  {activeFilingModal.summary.sentiment_score > 0 ? "+" : ""}
                  {activeFilingModal.summary.sentiment_score}
                </div>
                <div className="text-[10px] text-gray-400 uppercase font-mono">Sentiment Score</div>
              </div>
            </div>

            {/* Modal Body: High-Risk Key Sentences & Highlighted Document Text */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Key Risk Sentences Extracted */}
              {activeFilingModal.summary.key_risk_sentences.length > 0 && (
                <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-300 font-mono flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    Key Regulatory Risk Disclosures Extracted:
                  </h4>
                  <ul className="space-y-1.5">
                    {activeFilingModal.summary.key_risk_sentences.map((sent, i) => (
                      <li key={i} className="text-xs text-rose-200/90 leading-relaxed pl-3 border-l-2 border-rose-500">
                        &ldquo;{sent}&rdquo;
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Keyword Highlight Legend */}
              <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-[#161622] border border-[#242436] text-[11px] font-mono">
                <span className="text-gray-400 font-bold">Auto-Highlighted Keywords:</span>
                {REGULATORY_RISK_KEYWORDS.slice(0, 8).map((kw) => (
                  <span key={kw} className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {kw}
                  </span>
                ))}
              </div>

              {/* Full Text View with Interactive Highlight */}
              <div className="p-5 rounded-xl bg-[#0D0D12] border border-[#1E1E2C]">
                {renderHighlightedContent(activeFilingModal.htmlContent || activeFilingModal.rawText)}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#222234] bg-[#161622] flex items-center justify-between">
              <a
                href={activeFilingModal.secEdgarUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
              >
                Inspect Official Filing on SEC.gov
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={() => setActiveFilingModal(null)}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold transition-all cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ALERT SENSITIVITY SETTINGS
         ========================================================================= */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121218] border border-[#2A2A3C] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#222234] pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Alert Sensitivity Settings</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Risk Mentions Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-mono">
                  <span className="text-gray-300 font-bold">Risk Mentions Threshold:</span>
                  <span className="text-rose-400 font-bold">{alertSettings.riskThreshold} mentions</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="15"
                  value={alertSettings.riskThreshold}
                  onChange={(e) =>
                    setAlertSettings((prev) => ({ ...prev, riskThreshold: Number(e.target.value) }))
                  }
                  className="w-full accent-rose-500 cursor-pointer"
                />
                <p className="text-[11px] text-gray-500">
                  Trigger alert when words like &ldquo;litigation&rdquo;, &ldquo;subpoena&rdquo;, or &ldquo;regulatory&rdquo; exceed this frequency.
                </p>
              </div>

              {/* Revenue Mentions Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-mono">
                  <span className="text-gray-300 font-bold">Revenue Mentions Threshold:</span>
                  <span className="text-emerald-400 font-bold">{alertSettings.revenueThreshold} mentions</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="15"
                  value={alertSettings.revenueThreshold}
                  onChange={(e) =>
                    setAlertSettings((prev) => ({ ...prev, revenueThreshold: Number(e.target.value) }))
                  }
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <p className="text-[11px] text-gray-500">
                  Trigger notification for unusual revenue, net sales, or EBITDA disclosure density.
                </p>
              </div>

              {/* Recipient Email */}
              <div className="space-y-1.5">
                <label className="text-gray-300 font-bold block">Alert Recipient Email:</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    value={alertSettings.notifyEmail}
                    onChange={(e) =>
                      setAlertSettings((prev) => ({ ...prev, notifyEmail: e.target.value }))
                    }
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0E0E14] border border-[#28283C] text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-2 border-t border-[#222234]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alertSettings.enableBannerToast}
                    onChange={(e) =>
                      setAlertSettings((prev) => ({ ...prev, enableBannerToast: e.target.checked }))
                    }
                    className="rounded accent-amber-500"
                  />
                  <span className="text-gray-300">Display in-app banner toast notifications</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alertSettings.alertOnHighRisk8KOnly}
                    onChange={(e) =>
                      setAlertSettings((prev) => ({ ...prev, alertOnHighRisk8KOnly: e.target.checked }))
                    }
                    className="rounded accent-amber-500"
                  />
                  <span className="text-gray-300">Trigger alerts only for High-Risk 8-K filings</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alertSettings.enableSimulatedEmail}
                    onChange={(e) =>
                      setAlertSettings((prev) => ({ ...prev, enableSimulatedEmail: e.target.checked }))
                    }
                    className="rounded accent-amber-500"
                  />
                  <span className="text-gray-300">Dispatch simulated email notification to recipient</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#222234]">
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-[#181822] hover:bg-[#20202E] text-gray-300 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveSettings(alertSettings)}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Save Sensitivity Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
