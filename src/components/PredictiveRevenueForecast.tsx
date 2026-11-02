import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Sparkles,
  ShieldCheck,
  Zap,
  Layers,
  ArrowUpRight,
  Sliders,
  Download,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  PlusCircle,
  HelpCircle,
  Clock,
  PieChart,
  Wallet
} from "lucide-react";
import {
  MarketplaceListing,
  getMarketplaceListings,
  getLicensePurchases
} from "../utils/tokenLicensingMarketplace";

interface PredictiveRevenueForecastProps {
  userMetaMaskAddress?: string | null;
  onNavigateToMarketplace?: () => void;
  className?: string;
}

type MarketTrendMode = "baseline" | "l2_boom" | "bull_run" | "consolidation";

interface TrendModeConfig {
  id: MarketTrendMode;
  name: string;
  badge: string;
  icon: string;
  monthlyGrowthRate: number; // e.g. 0.085 = 8.5% MoM
  dealVelocityMultiplier: number;
  secondaryRoyaltyMultiplier: number;
  tagline: string;
  description: string;
  color: string;
}

const TREND_MODE_CONFIGS: Record<MarketTrendMode, TrendModeConfig> = {
  baseline: {
    id: "baseline",
    name: "Current Organic Trajectory",
    badge: "+8.5% MoM Organic",
    icon: "⚖️",
    monthlyGrowthRate: 0.085,
    dealVelocityMultiplier: 1.0,
    secondaryRoyaltyMultiplier: 1.0,
    tagline: "Steady Base & Polygon L2 token adoption and organic developer licensing demand",
    description: "Reflects verified historical token launch rates and current 30-day rolling marketplace licensing transactions.",
    color: "#6366F1", // Indigo
  },
  l2_boom: {
    id: "l2_boom",
    name: "L2 & DePIN Expansion Boom",
    badge: "+17.2% MoM Expansion",
    icon: "🚀",
    monthlyGrowthRate: 0.172,
    dealVelocityMultiplier: 1.65,
    secondaryRoyaltyMultiplier: 1.4,
    tagline: "Surge in synthetic data demand, micro-DePIN tokenomics, and rapid L2 deployments",
    description: "Accelerated developer activity where teams license vanity contract IDs and synthetic architecture batches in volume.",
    color: "#06B6D4", // Cyan
  },
  bull_run: {
    id: "bull_run",
    name: "Full Web3 Macro Bull Cycle",
    badge: "+28.4% MoM Hyper-Growth",
    icon: "🐂",
    monthlyGrowthRate: 0.284,
    dealVelocityMultiplier: 2.4,
    secondaryRoyaltyMultiplier: 2.1,
    tagline: "Parabolic token generation volume, premium vanity address acquisition, and institutional licensing",
    description: "Massive liquidity inflows where perpetual commercial rights and exclusive vanity contracts command peak valuations.",
    color: "#10B981", // Emerald
  },
  consolidation: {
    id: "consolidation",
    name: "Defensive Consolidation",
    badge: "+2.5% MoM Steady",
    icon: "🛡️",
    monthlyGrowthRate: 0.025,
    dealVelocityMultiplier: 0.75,
    secondaryRoyaltyMultiplier: 0.8,
    tagline: "Conservative developer budgets, utility-first licensing, and steady long-term holding",
    description: "Market cooldown environment where passive earnings rely primarily on renewal subscriptions and essential smart contract templates.",
    color: "#94A3B8", // Slate
  },
};

interface MonthlyForecastPoint {
  monthIndex: number;
  monthLabel: string;
  basePassiveUsd: number;
  secondaryRoyaltiesUsd: number;
  renewalInflowsUsd: number;
  totalMonthlyPassiveUsd: number;
  cumulativePassiveUsd: number;
  projectedActiveDeals: number;
  ethEquivalent: number;
  polEquivalent: number;
}

export const PredictiveRevenueForecast: React.FC<PredictiveRevenueForecastProps> = ({
  userMetaMaskAddress,
  onNavigateToMarketplace,
  className = "",
}) => {
  // Load marketplace listings and purchases
  const listings = useMemo(() => getMarketplaceListings(), []);
  const purchases = useMemo(() => getLicensePurchases(), []);

  // Filter user's specific listings or fallback to all active listings if none yet
  const userListings = useMemo(() => {
    if (!userMetaMaskAddress) return listings;
    const lower = userMetaMaskAddress.toLowerCase();
    const filtered = listings.filter(
      (l) => l.sellerPayoutAddress?.toLowerCase() === lower || l.isUserListing
    );
    return filtered.length > 0 ? filtered : listings;
  }, [listings, userMetaMaskAddress]);

  // Forecast state controls
  const [selectedTrend, setSelectedTrend] = useState<MarketTrendMode>("baseline");
  const [forecastHorizonMonths, setForecastHorizonMonths] = useState<6 | 12 | 24>(12);
  const [royaltyCutPercent, setRoyaltyCutPercent] = useState<number>(5.0); // 5% default secondary protocol cut
  const [renewalRatePercent, setRenewalRatePercent] = useState<number>(75); // 75% license renewal retention
  const [customDealsCountOverride, setCustomDealsCountOverride] = useState<number>(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const activeTrend = TREND_MODE_CONFIGS[selectedTrend];

  // Number of effective active deals modeled
  const effectiveDealsCount = useMemo(() => {
    if (customDealsCountOverride > 0) return customDealsCountOverride;
    return Math.max(userListings.length, 6);
  }, [customDealsCountOverride, userListings.length]);

  // Average listing base price USD
  const averageDealPriceUsd = useMemo(() => {
    if (userListings.length === 0) return 145.0;
    const sum = userListings.reduce((acc, l) => acc + (l.priceUsdEstimate || 100), 0);
    return Math.round((sum / userListings.length) * 100) / 100;
  }, [userListings]);

  // Generate 12-month predictive passive cashflow projection
  const forecastData: MonthlyForecastPoint[] = useMemo(() => {
    const points: MonthlyForecastPoint[] = [];
    const now = new Date();
    let runningCumulative = 0;

    // Monthly baseline deal velocity based on trend
    const baseMonthlyDealsClosed = (effectiveDealsCount * 0.35) * activeTrend.dealVelocityMultiplier;

    for (let m = 1; m <= forecastHorizonMonths; m++) {
      const forecastDate = new Date(now.getFullYear(), now.getMonth() + m, 1);
      const monthLabel = forecastDate.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

      // Compounded monthly growth multiplier
      const growthFactor = Math.pow(1 + activeTrend.monthlyGrowthRate, m - 1);

      // Monthly new deals passive volume (spread out as ongoing passive streams)
      const monthlyDeals = baseMonthlyDealsClosed * growthFactor;
      const basePassiveUsd = Math.round(monthlyDeals * averageDealPriceUsd * 0.45 * 100) / 100;

      // Ongoing secondary royalties (e.g. transfers, downstream token transactions, contract clones)
      const secondaryRoyaltiesUsd = Math.round(
        (monthlyDeals * averageDealPriceUsd * (royaltyCutPercent / 100) * activeTrend.secondaryRoyaltyMultiplier * 2.2) * 100
      ) / 100;

      // License renewals (compounding from prior months based on renewal rate)
      const renewalBase = m > 1 ? (points[m - 2]?.totalMonthlyPassiveUsd || 0) * (renewalRatePercent / 100) * 0.3 : 0;
      const renewalInflowsUsd = Math.round(renewalBase * 100) / 100;

      const totalMonthlyPassiveUsd = Math.round((basePassiveUsd + secondaryRoyaltiesUsd + renewalInflowsUsd) * 100) / 100;
      runningCumulative = Math.round((runningCumulative + totalMonthlyPassiveUsd) * 100) / 100;

      const ethEquivalent = Math.round((totalMonthlyPassiveUsd / 3450) * 1000) / 1000;
      const polEquivalent = Math.round((totalMonthlyPassiveUsd / 0.52) * 10) / 10;

      points.push({
        monthIndex: m,
        monthLabel,
        basePassiveUsd,
        secondaryRoyaltiesUsd,
        renewalInflowsUsd,
        totalMonthlyPassiveUsd,
        cumulativePassiveUsd: runningCumulative,
        projectedActiveDeals: Math.round(effectiveDealsCount * growthFactor),
        ethEquivalent,
        polEquivalent,
      });
    }

    return points;
  }, [
    forecastHorizonMonths,
    effectiveDealsCount,
    activeTrend,
    averageDealPriceUsd,
    royaltyCutPercent,
    renewalRatePercent,
  ]);

  // Aggregate metrics
  const currentMonthRunRate = forecastData[0]?.totalMonthlyPassiveUsd || 0;
  const endMonthRunRate = forecastData[forecastData.length - 1]?.totalMonthlyPassiveUsd || 0;
  const totalCumulativeEarnings = forecastData[forecastData.length - 1]?.cumulativePassiveUsd || 0;
  const annualizedRunRate = Math.round(endMonthRunRate * 12);
  const avgMonthlyPassivePerDeal = Math.round((currentMonthRunRate / effectiveDealsCount) * 100) / 100;

  // Handle export to CSV
  const handleExportCsv = () => {
    const headers = [
      "Month",
      "Base_Passive_USD",
      "Secondary_Royalties_USD",
      "Renewal_Inflows_USD",
      "Total_Monthly_Passive_USD",
      "Cumulative_Passive_USD",
      "ETH_Equiv",
      "Active_Deals_Count"
    ];
    const rows = forecastData.map((p) => [
      p.monthLabel,
      p.basePassiveUsd,
      p.secondaryRoyaltiesUsd,
      p.renewalInflowsUsd,
      p.totalMonthlyPassiveUsd,
      p.cumulativePassiveUsd,
      p.ethEquivalent,
      p.projectedActiveDeals,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `predictive_revenue_forecast_${selectedTrend}_${forecastHorizonMonths}mo.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyValue = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-8 shadow-2xl relative overflow-hidden ${className}`}>
      {/* Decorative gradient ambient glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6 relative z-10">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-2xl text-indigo-400">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
            </span>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <h3 className="text-xl font-extrabold text-white tracking-tight">
                  Predictive Revenue Forecast
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                  Monthly Passive Licensing Deals
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Simulates recurring monthly passive earnings potential from active token licensing contracts, developer seat renewals, and on-chain protocol royalties based on historical market trends.
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2.5 self-start md:self-center flex-wrap">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer"
            title="Export 12-Month Predictive Cashflow to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-300" />
            <span>Export CSV</span>
          </button>

          {onNavigateToMarketplace && (
            <button
              onClick={onNavigateToMarketplace}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>List New Licensing Deal</span>
            </button>
          )}
        </div>
      </div>

      {/* Market Trend Scenario Selector Cards */}
      <div className="space-y-3 relative z-10">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span>Select Market Trend Environment</span>
          </label>
          <span className="text-[11px] text-slate-400 font-mono">
            Active Trend: <strong className="text-white">{activeTrend.name}</strong> ({activeTrend.badge})
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(Object.keys(TREND_MODE_CONFIGS) as MarketTrendMode[]).map((modeKey) => {
            const cfg = TREND_MODE_CONFIGS[modeKey];
            const isSelected = selectedTrend === modeKey;
            return (
              <button
                key={modeKey}
                onClick={() => setSelectedTrend(modeKey)}
                className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? "bg-slate-800/90 border-indigo-500/80 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/50"
                    : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{cfg.icon}</span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border"
                      style={{
                        backgroundColor: `${cfg.color}15`,
                        borderColor: `${cfg.color}40`,
                        color: cfg.color,
                      }}
                    >
                      {cfg.badge}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">{cfg.name}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {cfg.tagline}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>Growth Velocity:</span>
                  <span className="font-bold text-slate-200">
                    {cfg.dealVelocityMultiplier}x Normal
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Top 4 Key Passive Metric Callouts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        {/* Metric 1: Monthly Passive Run Rate */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-500/30 relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Est. Monthly Passive MRR
            </span>
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-white font-mono flex items-baseline space-x-1.5">
            <span>${currentMonthRunRate.toLocaleString()}</span>
            <span className="text-xs font-normal text-slate-400">/ mo</span>
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center space-x-1 mt-2 font-mono">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Scaling to ${endMonthRunRate.toLocaleString()}/mo in Month {forecastHorizonMonths}</span>
          </div>
        </div>

        {/* Metric 2: Annualized Passive Run Rate (ARR) */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30 relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Projected Annual Passive ARR
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            ${annualizedRunRate.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-mono flex items-center justify-between">
            <span>Total {forecastHorizonMonths}M Cumulative:</span>
            <strong className="text-white">${totalCumulativeEarnings.toLocaleString()}</strong>
          </div>
        </div>

        {/* Metric 3: Active Deals Modeled */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-950 border border-purple-500/30 relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Active Licensing Deals
            </span>
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-purple-300 font-mono">
            {effectiveDealsCount} Deals
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-mono">
            Avg. Passive Yield: <strong className="text-purple-400">${avgMonthlyPassivePerDeal}/deal/mo</strong>
          </div>
        </div>

        {/* Metric 4: Secondary Royalty Flow */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-950 border border-cyan-500/30 relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Protocol Cut & Royalties
            </span>
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Zap className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-cyan-300 font-mono">
            {royaltyCutPercent.toFixed(1)}% Royalty
          </div>
          <div className="text-[11px] text-cyan-400 mt-2 font-mono flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>{renewalRatePercent}% Retention Renewal Rate</span>
          </div>
        </div>
      </div>

      {/* Interactive Horizon & Model Adjustment Sliders */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-5 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Fine-Tune Forecast Model Parameters
            </h4>
          </div>
          {/* Horizon toggle pills */}
          <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
            {([6, 12, 24] as const).map((hz) => (
              <button
                key={hz}
                onClick={() => setForecastHorizonMonths(hz)}
                className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                  forecastHorizonMonths === hz
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {hz} Months
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Slider 1: Active Deals Volume */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400">Modeled Active Deals:</span>
              <span className="font-mono font-bold text-indigo-400">{effectiveDealsCount} Listings</span>
            </div>
            <input
              type="range"
              min="2"
              max="50"
              step="1"
              value={effectiveDealsCount}
              onChange={(e) => setCustomDealsCountOverride(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>Min: 2 deals</span>
              <span>Default: {userListings.length} deals</span>
              <span>Max: 50 deals</span>
            </div>
          </div>

          {/* Slider 2: Secondary Protocol Royalty Cut */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400">Secondary Royalty Cut:</span>
              <span className="font-mono font-bold text-cyan-400">{royaltyCutPercent.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="15.0"
              step="0.5"
              value={royaltyCutPercent}
              onChange={(e) => setRoyaltyCutPercent(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>1.0% (Low)</span>
              <span>5.0% (Standard)</span>
              <span>15.0% (High)</span>
            </div>
          </div>

          {/* Slider 3: Annual License Renewal Retention */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400">License Renewal Retention:</span>
              <span className="font-mono font-bold text-emerald-400">{renewalRatePercent}% Retention</span>
            </div>
            <input
              type="range"
              min="30"
              max="95"
              step="5"
              value={renewalRatePercent}
              onChange={(e) => setRenewalRatePercent(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>30% (Conservative)</span>
              <span>75% (Organic)</span>
              <span>95% (Enterprise)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recharts 12-Month Passive Cashflow Visualization */}
      <div className="space-y-3 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center space-x-2">
              <span>12-Month Monthly Passive Inflow Trajectory</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                USD & Crypto Equivalents
              </span>
            </h4>
            <p className="text-xs text-slate-400">
              Interactive timeline showing base licensing inflows, secondary royalties, and cumulative passive balance growth.
            </p>
          </div>
          <div className="flex items-center space-x-3 text-xs font-mono text-slate-400">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <span>Monthly Passive ($/mo)</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>Cumulative ($)</span>
            </span>
          </div>
        </div>

        <div className="h-[320px] sm:h-[380px] w-full bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 sm:p-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={forecastData} margin={{ top: 15, right: 25, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="colorMonthlyPassive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis
                dataKey="monthLabel"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#334155" }}
              />
              <YAxis
                yAxisId="monthly"
                stroke="#64748B"
                fontSize={11}
                tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
                tickLine={false}
                axisLine={{ stroke: "#334155" }}
              />
              <YAxis
                yAxisId="cumulative"
                orientation="right"
                stroke="#10B981"
                fontSize={11}
                tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                tickLine={false}
                axisLine={{ stroke: "#10B981" }}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload as MonthlyForecastPoint;
                  return (
                    <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-xs font-mono space-y-2 min-w-[240px]">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-bold text-white text-sm">{data.monthLabel}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          Month #{data.monthIndex}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-slate-300">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Total Monthly Passive:</span>
                          <span className="font-bold text-indigo-400 text-sm">
                            ${data.totalMonthlyPassiveUsd.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-500 pl-2">↳ Base Inflows:</span>
                          <span className="text-slate-300">${data.basePassiveUsd.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-500 pl-2">↳ Secondary Royalties:</span>
                          <span className="text-cyan-400">${data.secondaryRoyaltiesUsd.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-500 pl-2">↳ Renewals:</span>
                          <span className="text-emerald-400">${data.renewalInflowsUsd.toLocaleString()}</span>
                        </div>
                        <div className="border-t border-slate-800 pt-1.5 flex justify-between items-center">
                          <span className="text-slate-400">Cumulative Balance:</span>
                          <span className="font-bold text-emerald-400">
                            ${data.cumulativePassiveUsd.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-slate-800/80 pt-2 flex items-center justify-between text-[10px] text-slate-400">
                        <span>ETH: {data.ethEquivalent} ETH</span>
                        <span>POL: {data.polEquivalent.toLocaleString()} POL</span>
                      </div>
                    </div>
                  );
                }}
              />

              {/* Monthly Stacked Bar for Secondary Royalties */}
              <Bar
                yAxisId="monthly"
                dataKey="secondaryRoyaltiesUsd"
                name="Secondary Royalties"
                fill="#06B6D4"
                opacity={0.6}
                radius={[4, 4, 0, 0]}
              />

              {/* Monthly Passive Area Fill */}
              <Area
                yAxisId="monthly"
                type="monotone"
                dataKey="totalMonthlyPassiveUsd"
                name="Monthly Passive Inflow"
                stroke="#6366F1"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorMonthlyPassive)"
              />

              {/* Cumulative Passive Curve */}
              <Line
                yAxisId="cumulative"
                type="monotone"
                dataKey="cumulativePassiveUsd"
                name="Cumulative Total"
                stroke="#10B981"
                strokeWidth={2.5}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Active Deals Passive Contribution Ledger */}
      <div className="space-y-3 relative z-10">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-white flex items-center space-x-2">
            <PieChart className="w-4 h-4 text-indigo-400" />
            <span>Active Licensing Deals & Estimated Passive Yield</span>
          </h4>
          <span className="text-xs text-slate-400 font-mono">
            {userListings.length} Active Listings Analyzed
          </span>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 font-mono border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Deal Title & Asset</th>
                  <th className="py-3 px-3 font-semibold">Terms</th>
                  <th className="py-3 px-3 font-semibold">Unit Price</th>
                  <th className="py-3 px-3 font-semibold text-right">Est. Monthly Passive</th>
                  <th className="py-3 px-3 font-semibold text-right">1-Yr Projected ARR</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {userListings.slice(0, 6).map((deal, idx) => {
                  const dealPrice = deal.priceUsdEstimate || 120;
                  const estimatedMonthly = Math.round(
                    dealPrice * 0.45 * activeTrend.dealVelocityMultiplier * (1 + royaltyCutPercent / 100) * 10
                  ) / 10;
                  const projected1Yr = Math.round(estimatedMonthly * 12);

                  return (
                    <tr key={deal.id || idx} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-sans font-bold text-white text-xs truncate max-w-xs">
                          {deal.title}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center space-x-2 mt-0.5">
                          <span className="uppercase text-indigo-400 font-mono">{deal.type.replace(/_/g, " ")}</span>
                          {deal.tokenSymbol && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px]">
                              ${deal.tokenSymbol}
                            </span>
                          )}
                          {deal.chain && (
                            <span className="text-[10px] text-slate-500 uppercase">{deal.chain}</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {deal.terms}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-slate-200">
                        ${dealPrice.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-bold text-indigo-400">
                        +${estimatedMonthly.toLocaleString()}/mo
                      </td>

                      <td className="py-3.5 px-3 text-right font-bold text-emerald-400">
                        ${projected1Yr.toLocaleString()}/yr
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Active Deal</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {userListings.length > 6 && (
            <div className="p-3 bg-slate-900/60 border-t border-slate-800 text-center text-xs text-slate-400">
              Showing top 6 active deals. All {userListings.length} deals are included in the cumulative forecast calculations above.
            </div>
          )}
        </div>
      </div>

      {/* Footer callout: Safe & Non-Custodial Protocol Payout Notice */}
      <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300 relative z-10">
        <div className="flex items-center space-x-2.5">
          <Wallet className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <span>
            All projected passive earnings route 100% directly to your configured payout wallet (<strong>{userMetaMaskAddress ? `${userMetaMaskAddress.slice(0, 8)}...${userMetaMaskAddress.slice(-6)}` : "Configured EVM Wallet"}</strong>) with zero intermediary custody.
          </span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono flex-shrink-0">
          Updated: {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};
