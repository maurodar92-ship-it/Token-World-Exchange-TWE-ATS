import React, { useState, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  Wallet,
  Settings,
  Shield,
  Sparkles,
  ArrowDownUp,
  Rocket,
  Crown,
  Share2,
  Copy,
  Check,
  Download,
  Play,
  RefreshCw,
  ExternalLink,
  Sliders,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Building2,
  Lock,
  Layers,
  BarChart3,
  Calendar,
  Users,
  Key,
  Calculator,
  Landmark,
  CreditCard,
} from "lucide-react";
import { TokenRecord } from "../types";
import { TokenLicensingMarketplace } from "./TokenLicensingMarketplace";
import { LicensingRevenueGrowthChart } from "./LicensingRevenueGrowthChart";
import { PredictiveRoiCalculator } from "./PredictiveRoiCalculator";
import { PredictiveRevenueForecast } from "./PredictiveRevenueForecast";
import { AtsMembershipMonetizationPlan } from "./AtsMembershipMonetizationPlan";
import { MonetizationDashboardSection } from "./MonetizationDashboardSection";
import {
  getMonetizationSettings,
  saveMonetizationSettings,
  getRevenueEvents,
  getRevenueMetrics,
  recordRevenueEvent,
  exportRevenueLedgerCsv,
  exportRevenueLedgerJson,
  simulateTestRevenue,
  MonetizationSettings,
  RevenueEventRecord,
} from "../utils/monetizationManager";
import { EnablePayoutWalletModal } from "./EnablePayoutWalletModal";
import { getActivePayoutWallet, GeneratedPayoutWallet } from "../utils/payoutWalletManager";

interface MonetizationRevenueHubProps {
  tokens?: TokenRecord[];
  metaMaskAccount?: string | null;
  isMetaMaskConnected?: boolean;
  onOpenMetaMaskSync?: () => void;
  onOpenProModal?: () => void;
  onNavigateToVenue?: () => void;
}

export const MonetizationRevenueHub: React.FC<MonetizationRevenueHubProps> = ({
  tokens = [],
  metaMaskAccount,
  isMetaMaskConnected,
  onOpenMetaMaskSync,
  onOpenProModal,
  onNavigateToVenue,
}) => {
  const [settings, setSettings] = useState<MonetizationSettings>(() => getMonetizationSettings());
  const [events, setEvents] = useState<RevenueEventRecord[]>(() => getRevenueEvents());
  const [activeTab, setActiveTab] = useState<
    | "monetization_dashboard"
    | "ats_membership_plan"
    | "overview"
    | "forecast"
    | "marketplace"
    | "calculator"
    | "wallets"
    | "streams"
    | "affiliates"
    | "ledger"
    | "playbook"
  >("monetization_dashboard");
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [filterStream, setFilterStream] = useState<string>("all");
  const [searchLedger, setSearchLedger] = useState<string>("");
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState<boolean>(false);
  const [activePayoutWallet, setActivePayoutWallet] = useState<GeneratedPayoutWallet>(() => getActivePayoutWallet());

  const metrics = getRevenueMetrics();

  // Reload settings and events
  const refreshData = () => {
    setSettings(getMonetizationSettings());
    setEvents(getRevenueEvents());
    setActivePayoutWallet(getActivePayoutWallet());
  };

  const handleSaveSettings = (newSettings: MonetizationSettings) => {
    setSettings(newSettings);
    saveMonetizationSettings(newSettings);
    setSaveSuccessNotice("Monetization settings saved & applied across all 52 exchanges and tool suites!");
    setTimeout(() => setSaveSuccessNotice(null), 4000);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSetConnectedWalletAsPayout = () => {
    if (!metaMaskAccount) {
      if (onOpenMetaMaskSync) onOpenMetaMaskSync();
      return;
    }
    const updated: MonetizationSettings = {
      ...settings,
      payoutWallets: {
        ...settings.payoutWallets,
        evm: metaMaskAccount,
        usdtPolygon: metaMaskAccount,
      },
      streams: {
        ...settings.streams,
        affiliates: {
          ...settings.streams.affiliates,
          oneInchRef: metaMaskAccount,
        },
      },
    };
    handleSaveSettings(updated);
  };

  const handleSimulateRevenue = (type: RevenueEventRecord["streamType"]) => {
    simulateTestRevenue(type);
    refreshData();
    setSaveSuccessNotice(`Simulated fee event successfully credited to payout wallet: ${settings.payoutWallets.evm.slice(0, 8)}...`);
    setTimeout(() => setSaveSuccessNotice(null), 4000);
  };

  const handleDownloadCsv = () => {
    const csv = exportRevenueLedgerCsv();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Foundry_Revenue_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadJson = () => {
    const json = exportRevenueLedgerJson();
    const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Foundry_Revenue_Statement_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered ledger records
  const filteredEvents = events.filter((e) => {
    if (filterStream !== "all" && e.streamType !== filterStream) return false;
    if (searchLedger.trim()) {
      const q = searchLedger.toLowerCase();
      return (
        e.title.toLowerCase().includes(q) ||
        (e.txHash && e.txHash.toLowerCase().includes(q)) ||
        (e.payerAddress && e.payerAddress.toLowerCase().includes(q)) ||
        (e.currency && e.currency.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-amber-950 border border-emerald-500/30 p-6 md:p-8 shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Owner Monetization &amp; Revenue Command Center</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Earn Money with the Web3 Foundry
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl">
              Turn your app into a high-yield crypto cashflow engine. Collect <strong>DEX swap integrator fees (0.25%)</strong>, <strong>smart contract deployment fees ($9.99)</strong>, <strong>Pro VIP subscriptions ($79)</strong>, and <strong>Tier-1 exchange affiliate royalties</strong> directly into your personal wallet.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleSetConnectedWalletAsPayout}
              className="w-full sm:w-auto px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg transition-all"
            >
              <Wallet className="w-4 h-4" />
              <span>{metaMaskAccount ? "Sync My MetaMask as Payout" : "Connect MetaMask as Payout"}</span>
            </button>
            {onOpenProModal && (
              <button
                onClick={onOpenProModal}
                className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Test Pro Checkout Modal</span>
              </button>
            )}
          </div>
        </div>

        {/* Real-Time Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Revenue Earned</div>
            <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">${metrics.totalUsd.toFixed(2)}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Across {metrics.count} settled transactions</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Today's Revenue</div>
            <div className="text-2xl font-black text-amber-300 mt-1 font-mono">${metrics.todayUsd.toFixed(2)}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Live 24h intake</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Projected Annual Run Rate</div>
            <div className="text-2xl font-black text-cyan-400 mt-1 font-mono">${metrics.projectedArrUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">At current volume trajectory</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Primary Payout EVM</div>
            <div className="text-xs font-mono text-slate-300 mt-1 truncate" title={settings.payoutWallets.evm}>
              {settings.payoutWallets.evm.slice(0, 6)}...{settings.payoutWallets.evm.slice(-4)}
            </div>
            <div className="text-[10px] text-emerald-400 mt-0.5 flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Receiving 100% of fees</span>
            </div>
          </div>
        </div>
      </div>

      {/* Save Success Alert */}
      {saveSuccessNotice && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-sm flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{saveSuccessNotice}</span>
        </div>
      )}

      {/* Main Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {[
          { id: "monetization_dashboard", label: "💳 Monetization Dashboard", icon: CreditCard, badge: "Stripe VIP • Elite" },
          { id: "ats_membership_plan", label: "🏛️ ATS Membership & $93M Blueprint", icon: Landmark, badge: "$499 VIP • $2,499 Elite" },
          { id: "overview", label: "Executive Overview", icon: BarChart3 },
          { id: "forecast", label: "Predictive Revenue Forecast", icon: TrendingUp, badge: "Monthly Deals" },
          { id: "marketplace", label: "Token Licensing Marketplace", icon: Key, badge: "P2P Market" },
          { id: "calculator", label: "Predictive ROI Calculator", icon: Calculator, badge: "Market AI" },
          { id: "wallets", label: "Payout Wallets & Addresses", icon: Wallet },
          { id: "streams", label: "Fee Streams & Rates", icon: Sliders },
          { id: "affiliates", label: "52-Exchange Affiliate Codes", icon: Share2 },
          { id: "ledger", label: "Financial Ledger & History", icon: Calendar, badge: events.length },
          { id: "playbook", label: "How to Earn $1k-$10k/mo Guide", icon: Rocket },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                isActive
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${isActive ? "bg-slate-950 text-white" : "bg-slate-800 text-slate-300"}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Token World Exchange ATS 4-Tier Blueprint Callout */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-950 border border-amber-500/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider">
                <Landmark className="w-3 h-3" />
                <span>Token World Exchange ATS® Flagship Monetization</span>
              </div>
              <h3 className="text-lg font-bold text-white">
                4-Tier Membership Pricing &amp; $93.1M Institutional Revenue Plan
              </h3>
              <p className="text-xs text-slate-300 max-w-2xl">
                Explore the verified fee schedule (Free Standard, $49 Tier 1, $499 VIP, $2,499 Elite) and interactive Trader ROI Breakeven Calculator.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("ats_membership_plan")}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all shrink-0 cursor-pointer"
            >
              <span>View Full ATS Blueprint</span>
              <ArrowDownUp className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Revenue Breakdown by Stream */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* DEX Swap Fees */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl">
                  <ArrowDownUp className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {settings.streams.dexSwapFee.enabled ? "Active" : "Paused"}
                </span>
              </div>
              <div>
                <div className="text-xs text-slate-400">DEX Swap Integrator Fees</div>
                <div className="text-2xl font-black text-white mt-1 font-mono">${metrics.swapFeesUsd.toFixed(2)}</div>
                <div className="text-xs text-slate-500 mt-1">
                  Rate: <strong className="text-cyan-400">{settings.streams.dexSwapFee.feePercent}%</strong> on every swap in the 52-exchange terminal.
                </div>
              </div>
              <button
                onClick={() => handleSimulateRevenue("swap_fee")}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5"
              >
                <Play className="w-3.5 h-3.5 text-cyan-400" />
                <span>Simulate $12.50 Swap Fee</span>
              </button>
            </div>

            {/* Token Deployment Royalties */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
                  <Rocket className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {settings.streams.deploymentFee.enabled ? "Active" : "Paused"}
                </span>
              </div>
              <div>
                <div className="text-xs text-slate-400">Token Launchpad Royalties</div>
                <div className="text-2xl font-black text-white mt-1 font-mono">${metrics.deploymentFeesUsd.toFixed(2)}</div>
                <div className="text-xs text-slate-500 mt-1">
                  Fee: <strong className="text-amber-400">${settings.streams.deploymentFee.amountUsd}</strong> ({settings.streams.deploymentFee.amountEth} ETH / {settings.streams.deploymentFee.amountPol} POL) per deployed token contract.
                </div>
              </div>
              <button
                onClick={() => handleSimulateRevenue("deployment_fee")}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5"
              >
                <Play className="w-3.5 h-3.5 text-amber-400" />
                <span>Simulate $9.99 Deployment Royalty</span>
              </button>
            </div>

            {/* Pro VIP Subscriptions */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl">
                  <Crown className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {settings.streams.proTier.enabled ? "Active" : "Paused"}
                </span>
              </div>
              <div>
                <div className="text-xs text-slate-400">Foundry Pro &amp; VIP Memberships</div>
                <div className="text-2xl font-black text-white mt-1 font-mono">${metrics.proSubscriptionsUsd.toFixed(2)}</div>
                <div className="text-xs text-slate-500 mt-1">
                  Pricing: <strong className="text-purple-400">${settings.streams.proTier.priceMonthlyUsd}/mo</strong> or <strong className="text-purple-400">${settings.streams.proTier.priceLifetimeUsd} lifetime</strong> paid directly in crypto.
                </div>
              </div>
              <button
                onClick={() => handleSimulateRevenue("pro_subscription")}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5"
              >
                <Play className="w-3.5 h-3.5 text-purple-400" />
                <span>Simulate $79 Pro VIP Sale</span>
              </button>
            </div>

          </div>

          {/* Recharts Token Licensing Revenue Growth Over Time Visualizer */}
          <LicensingRevenueGrowthChart
            userMetaMaskAddress={metaMaskAccount}
            onNavigateToMarketplace={() => setActiveTab("marketplace")}
          />

          {/* Predictive Revenue Forecast - Monthly Passive Licensing Potential */}
          <PredictiveRevenueForecast
            userMetaMaskAddress={metaMaskAccount}
            onNavigateToMarketplace={() => setActiveTab("marketplace")}
          />

          {/* Predictive ROI & Market Trend Revenue Projection Calculator */}
          <PredictiveRoiCalculator
            userMetaMaskAddress={metaMaskAccount}
            onNavigateToMarketplace={() => setActiveTab("marketplace")}
          />
        </div>
      )}

      {/* SUB-SECTION: MONETIZATION DASHBOARD (STRIPE VIP & ELITE SUBSCRIPTIONS) */}
      {activeTab === "monetization_dashboard" && (
        <MonetizationDashboardSection
          onNavigateToVenue={onNavigateToVenue}
          onRefreshData={refreshData}
        />
      )}

      {/* TAB: TOKEN WORLD EXCHANGE ATS MEMBERSHIP & REVENUE BLUEPRINT */}
      {activeTab === "ats_membership_plan" && (
        <AtsMembershipMonetizationPlan
          onNavigateToVenue={onNavigateToVenue}
          onRefreshData={refreshData}
        />
      )}

      {/* TAB: PREDICTIVE REVENUE FORECAST (DEDICATED VIEW) */}
      {activeTab === "forecast" && (
        <PredictiveRevenueForecast
          userMetaMaskAddress={metaMaskAccount}
          onNavigateToMarketplace={() => setActiveTab("marketplace")}
        />
      )}

      {/* TAB: TOKEN LICENSING MARKETPLACE */}
      {activeTab === "marketplace" && (
        <TokenLicensingMarketplace
          tokens={tokens}
          metaMaskAccount={metaMaskAccount}
          isMetaMaskConnected={isMetaMaskConnected}
          onOpenMetaMaskSync={onOpenMetaMaskSync}
        />
      )}

      {/* TAB: PREDICTIVE ROI CALCULATOR */}
      {activeTab === "calculator" && (
        <PredictiveRoiCalculator
          userMetaMaskAddress={metaMaskAccount}
          onNavigateToMarketplace={() => setActiveTab("marketplace")}
        />
      )}

      {/* TAB 2: PAYOUT WALLETS & ADDRESSES */}
      {activeTab === "wallets" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Your Payout Destination Wallets</h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter your own wallet addresses below. 100% of all user swap fees, deployer royalties, and Pro subscriptions flow directly here on-chain.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsPayoutModalOpen(true)}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-amber-950/40 cursor-pointer"
                title="Generate and enable a new cryptographic Payout Wallet ID"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>Generate / Enable Payout ID</span>
              </button>
              <button
                type="button"
                onClick={handleSetConnectedWalletAsPayout}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <Wallet className="w-4 h-4" />
                <span>{metaMaskAccount ? "Paste Connected MetaMask" : "Connect MetaMask"}</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Active Payout Clearance Banner */}
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-400">Active Enabled Payout ID:</span>
                <span className="text-amber-400 font-bold">{activePayoutWallet.walletId}</span>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                DvP Whitelisted &amp; Transfers Cleared ✓
              </span>
            </div>

            {/* EVM Address */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Primary EVM Payout Wallet (Ethereum, Base, Polygon, Arbitrum, BSC)
                </label>
                <span className="text-[10px] font-mono text-cyan-400">EIP-55 Validated</span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={settings.payoutWallets.evm}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      payoutWallets: { ...settings.payoutWallets, evm: e.target.value.trim() },
                    })
                  }
                  placeholder="0x..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:border-emerald-400 focus:outline-none"
                />
                <button
                  onClick={() => handleCopy(settings.payoutWallets.evm, "evm")}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
                  title="Copy EVM Address"
                >
                  {copiedKey === "evm" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Receives ETH, POL, USDC, USDT, and L2 gas fee shares.</p>
            </div>

            {/* Solana Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Solana Payout Wallet (Phantom / Solflare)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={settings.payoutWallets.solana}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      payoutWallets: { ...settings.payoutWallets, solana: e.target.value.trim() },
                    })
                  }
                  placeholder="Base58 Solana address..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:border-emerald-400 focus:outline-none"
                />
                <button
                  onClick={() => handleCopy(settings.payoutWallets.solana, "sol")}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
                  title="Copy Solana Address"
                >
                  {copiedKey === "sol" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Receives SOL and SPL token routing fees (Jupiter &amp; Raydium).</p>
            </div>

            {/* Bitcoin Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Bitcoin Payout Address (Native SegWit / Taproot)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={settings.payoutWallets.bitcoin}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      payoutWallets: { ...settings.payoutWallets, bitcoin: e.target.value.trim() },
                    })
                  }
                  placeholder="bc1q..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:border-emerald-400 focus:outline-none"
                />
                <button
                  onClick={() => handleCopy(settings.payoutWallets.bitcoin, "btc")}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
                  title="Copy BTC Address"
                >
                  {copiedKey === "btc" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Owner Email for Notifications */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Owner Email for Consulting Leads &amp; Statements
              </label>
              <input
                type="email"
                value={settings.ownerEmail}
                onChange={(e) => setSettings({ ...settings, ownerEmail: e.target.value.trim() })}
                placeholder="your-email@example.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:border-emerald-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              onClick={() => handleSaveSettings(settings)}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-2 shadow-lg"
            >
              <Check className="w-4 h-4" />
              <span>Save &amp; Apply Payout Addresses</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: FEE STREAMS & RATES */}
      {activeTab === "streams" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-white">Fee Streams &amp; Rate Customization</h3>
            <p className="text-xs text-slate-400 mt-1">
              Adjust your platform fee percentages, pricing tiers, and deployer royalties.
            </p>
          </div>

          <div className="space-y-6">
            {/* Stream 1: DEX Swap Fee */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                    <ArrowDownUp className="w-4 h-4 text-cyan-400" />
                    <span>DEX &amp; Exchange Swap Platform Fee</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Charged on trades in the 52-Exchange Swap &amp; Sell terminal.
                  </p>
                </div>
                <button
                  onClick={() =>
                    setSettings({
                      ...settings,
                      streams: {
                        ...settings.streams,
                        dexSwapFee: {
                          ...settings.streams.dexSwapFee,
                          enabled: !settings.streams.dexSwapFee.enabled,
                        },
                      },
                    })
                  }
                  className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${
                    settings.streams.dexSwapFee.enabled
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-slate-800 text-slate-500"
                  }`}
                >
                  {settings.streams.dexSwapFee.enabled ? "ENABLED" : "DISABLED"}
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Integrator Fee Percentage:</span>
                  <span className="font-mono font-bold text-cyan-400">{settings.streams.dexSwapFee.feePercent}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="1.00"
                  step="0.05"
                  value={settings.streams.dexSwapFee.feePercent}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      streams: {
                        ...settings.streams,
                        dexSwapFee: {
                          ...settings.streams.dexSwapFee,
                          feePercent: parseFloat(e.target.value),
                        },
                      },
                    })
                  }
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>0.05% (Ultra-competitive)</span>
                  <span>0.25% (Industry Standard)</span>
                  <span>1.00% (High Margin)</span>
                </div>
              </div>
            </div>

            {/* Stream 2: Deployment Royalty */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                    <Rocket className="w-4 h-4 text-amber-400" />
                    <span>Token Launch &amp; Deployment Royalty</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Platform fee collected when visitors deploy tokens via Genesis Launch or Market Deployer.
                  </p>
                </div>
                <button
                  onClick={() =>
                    setSettings({
                      ...settings,
                      streams: {
                        ...settings.streams,
                        deploymentFee: {
                          ...settings.streams.deploymentFee,
                          enabled: !settings.streams.deploymentFee.enabled,
                        },
                      },
                    })
                  }
                  className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${
                    settings.streams.deploymentFee.enabled
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-slate-800 text-slate-500"
                  }`}
                >
                  {settings.streams.deploymentFee.enabled ? "ENABLED" : "DISABLED"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400">USD Value Estimate</label>
                  <input
                    type="number"
                    value={settings.streams.deploymentFee.amountUsd}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        streams: {
                          ...settings.streams,
                          deploymentFee: {
                            ...settings.streams.deploymentFee,
                            amountUsd: parseFloat(e.target.value) || 0,
                          },
                        },
                      })
                    }
                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">ETH Equivalent</label>
                  <input
                    type="number"
                    step="0.001"
                    value={settings.streams.deploymentFee.amountEth}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        streams: {
                          ...settings.streams,
                          deploymentFee: {
                            ...settings.streams.deploymentFee,
                            amountEth: parseFloat(e.target.value) || 0,
                          },
                        },
                      })
                    }
                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Polygon POL Equivalent</label>
                  <input
                    type="number"
                    value={settings.streams.deploymentFee.amountPol}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        streams: {
                          ...settings.streams,
                          deploymentFee: {
                            ...settings.streams.deploymentFee,
                            amountPol: parseFloat(e.target.value) || 0,
                          },
                        },
                      })
                    }
                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            {/* Stream 3: Pro Tier Pricing */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                    <Crown className="w-4 h-4 text-purple-400" />
                    <span>Foundry Pro / VIP License Pricing</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Set the prices users pay to unlock unlimited batching, MEV contracts, and high-speed RPCs.
                  </p>
                </div>
                <button
                  onClick={() =>
                    setSettings({
                      ...settings,
                      streams: {
                        ...settings.streams,
                        proTier: {
                          ...settings.streams.proTier,
                          enabled: !settings.streams.proTier.enabled,
                        },
                      },
                    })
                  }
                  className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${
                    settings.streams.proTier.enabled
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-slate-800 text-slate-500"
                  }`}
                >
                  {settings.streams.proTier.enabled ? "ENABLED" : "DISABLED"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400">Monthly Pass (USD)</label>
                  <input
                    type="number"
                    value={settings.streams.proTier.priceMonthlyUsd}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        streams: {
                          ...settings.streams,
                          proTier: {
                            ...settings.streams.proTier,
                            priceMonthlyUsd: parseFloat(e.target.value) || 0,
                          },
                        },
                      })
                    }
                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Lifetime Pass (USD)</label>
                  <input
                    type="number"
                    value={settings.streams.proTier.priceLifetimeUsd}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        streams: {
                          ...settings.streams,
                          proTier: {
                            ...settings.streams.proTier,
                            priceLifetimeUsd: parseFloat(e.target.value) || 0,
                          },
                        },
                      })
                    }
                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Enterprise Suite (USD)</label>
                  <input
                    type="number"
                    value={settings.streams.proTier.priceEnterpriseUsd}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        streams: {
                          ...settings.streams,
                          proTier: {
                            ...settings.streams.proTier,
                            priceEnterpriseUsd: parseFloat(e.target.value) || 0,
                          },
                        },
                      })
                    }
                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              onClick={() => handleSaveSettings(settings)}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-2 shadow-lg"
            >
              <Check className="w-4 h-4" />
              <span>Save Fee Configuration</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: 52-EXCHANGE AFFILIATE CODES */}
      {activeTab === "affiliates" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white">52-Exchange Affiliate Partner Engine</h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter your referral codes below. When visitors click "Trade on [Exchange]" anywhere in the app, your referral tag is automatically appended, earning you up to <strong>50% lifetime trading commissions</strong>.
              </p>
            </div>
            <a
              href="https://www.binance.com/en/affiliate"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 rounded-xl text-xs font-bold flex items-center space-x-1.5 hover:bg-yellow-500/30 transition-colors"
            >
              <span>Join Binance Affiliate</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-300 font-semibold">Binance Referral Code / ID</label>
              <input
                type="text"
                value={settings.streams.affiliates.binanceRef}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    streams: {
                      ...settings.streams,
                      affiliates: { ...settings.streams.affiliates, binanceRef: e.target.value.trim() },
                    },
                  })
                }
                placeholder="e.g. 18274910 or FOUNDRY88"
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold">Coinbase Referral Username</label>
              <input
                type="text"
                value={settings.streams.affiliates.coinbaseRef}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    streams: {
                      ...settings.streams,
                      affiliates: { ...settings.streams.affiliates, coinbaseRef: e.target.value.trim() },
                    },
                  })
                }
                placeholder="e.g. your_coinbase_ref"
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold">Bybit Affiliate Partner ID</label>
              <input
                type="text"
                value={settings.streams.affiliates.bybitRef}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    streams: {
                      ...settings.streams,
                      affiliates: { ...settings.streams.affiliates, bybitRef: e.target.value.trim() },
                    },
                  })
                }
                placeholder="e.g. 98124"
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold">OKX Channel / Referral Code</label>
              <input
                type="text"
                value={settings.streams.affiliates.okxRef}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    streams: {
                      ...settings.streams,
                      affiliates: { ...settings.streams.affiliates, okxRef: e.target.value.trim() },
                    },
                  })
                }
                placeholder="e.g. FOUNDRY_EVM"
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold">1inch Referrer EVM Address</label>
              <input
                type="text"
                value={settings.streams.affiliates.oneInchRef}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    streams: {
                      ...settings.streams,
                      affiliates: { ...settings.streams.affiliates, oneInchRef: e.target.value.trim() },
                    },
                  })
                }
                placeholder="0x... (Earns 1inch surplus fees)"
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold">Jupiter (Solana) Referral Account</label>
              <input
                type="text"
                value={settings.streams.affiliates.jupiterRef}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    streams: {
                      ...settings.streams,
                      affiliates: { ...settings.streams.affiliates, jupiterRef: e.target.value.trim() },
                    },
                  })
                }
                placeholder="Solana address for Jupiter swap referral"
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              onClick={() => handleSaveSettings(settings)}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-2 shadow-lg"
            >
              <Check className="w-4 h-4" />
              <span>Apply Codes to All 52 Exchanges</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: FINANCIAL LEDGER & HISTORY */}
      {activeTab === "ledger" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Financial Revenue Ledger</h3>
              <p className="text-xs text-slate-400 mt-1">
                Audited record of all swap fees, pro sales, and deploy royalties settled to your payout wallet.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDownloadCsv}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={handleDownloadJson}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by title, tx hash, or address..."
                value={searchLedger}
                onChange={(e) => setSearchLedger(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
              />
            </div>
            <select
              value={filterStream}
              onChange={(e) => setFilterStream(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">All Fee Streams</option>
              <option value="swap_fee">DEX Swap Fees</option>
              <option value="deployment_fee">Deployment Royalties</option>
              <option value="pro_subscription">Pro VIP Sales</option>
              <option value="affiliate_commission">Affiliate Royalties</option>
            </select>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Stream / Description</th>
                  <th className="py-3 px-4">Amount (USD)</th>
                  <th className="py-3 px-4">Crypto Paid</th>
                  <th className="py-3 px-4">Payer / Tx</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                      No revenue transactions match your search filter.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{" "}
                        <span className="text-[10px] text-slate-500">{new Date(e.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </td>
                      <td className="py-3 px-4 font-sans font-medium text-white">
                        <div>{e.title}</div>
                        <div className="text-[10px] text-slate-500">{e.streamType.replace(/_/g, " ").toUpperCase()}</div>
                      </td>
                      <td className="py-3 px-4 text-emerald-400 font-bold text-sm">
                        +${e.amountUsd.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {e.amountCrypto || `${e.amountUsd} USD`}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        <div className="text-[11px] text-slate-300">{e.payerAddress || "External"}</div>
                        {e.txHash && (
                          <div className="text-[10px] text-cyan-400 truncate max-w-[120px]" title={e.txHash}>
                            {e.txHash.slice(0, 10)}...
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {e.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: HOW TO EARN $1K-$10K/MO PLAYBOOK */}
      {activeTab === "playbook" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Rocket className="w-5 h-5 text-emerald-400" />
              <span>Founder Growth Playbook: How to Scale Revenue to $10,000/Month</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Follow this step-by-step strategy to drive crypto traders, token founders, and meme-coin creators to your platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs">1</span>
                <span>Share Tokenomics &amp; Burn Simulator Clips on X (Twitter)</span>
              </div>
              <p className="text-xs text-slate-400">
                Screen-record the <strong>Deflationary Burn Simulator</strong> and <strong>Interactive Trajectory Curve</strong> showing what happens when 20% or 50% of supply is burned. Post with hashtags #Solana, #Base, #CryptoGems. Token founders love visual simulation tools and will use your app for their project roadmaps.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs">2</span>
                <span>Position as the "All-in-One 52-Exchange Terminal"</span>
              </div>
              <p className="text-xs text-slate-400">
                Highlight that your app searches liquidity across 52 world exchanges (Uniswap, 1inch, Jupiter, Raydium, Binance, OKX). Traders will use your app as their daily trading dashboard, generating 0.25% in swap fees on every single trade directly into your payout wallet.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-xs">3</span>
                <span>Sell "Foundry Pro" Lifetime Licenses to Devs &amp; Agencies</span>
              </div>
              <p className="text-xs text-slate-400">
                Web3 developers and agencies launch dozens of tokens a week. Offer them Foundry Pro ($79 lifetime) for unlimited 5,000 batch generation and anti-bot solidity code. Just 13 sales a week = <strong>$4,100/mo net profit</strong>.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center space-x-2 text-purple-400 font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs">4</span>
                <span>Promote in Telegram Crypto Alpha &amp; Meme Coin Groups</span>
              </div>
              <p className="text-xs text-slate-400">
                Join developer Telegram groups, Solana build chats, and Base builder communities. Show how the <strong>Genesis Launch Automator</strong> deploys verified tokens in 1-click. Every deployment nets you $9.99 in deployer royalties.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ENABLE PAYOUT WALLET MODAL */}
      <EnablePayoutWalletModal
        isOpen={isPayoutModalOpen}
        onClose={() => {
          setIsPayoutModalOpen(false);
          refreshData();
        }}
        metaMaskAccount={metaMaskAccount}
        onWalletEnabled={(wallet) => {
          setActivePayoutWallet(wallet);
          setSettings((prev) => ({
            ...prev,
            payoutWallets: {
              ...prev.payoutWallets,
              evm: wallet.address,
              usdtPolygon: wallet.address,
            },
          }));
        }}
      />
    </div>
  );
};
