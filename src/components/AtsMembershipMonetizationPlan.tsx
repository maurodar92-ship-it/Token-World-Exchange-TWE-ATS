import React, { useState, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  Shield,
  Zap,
  CheckCircle2,
  Crown,
  Building2,
  Lock,
  ArrowRight,
  Download,
  Play,
  RotateCcw,
  Scale,
  Activity,
  Layers,
  Landmark,
  FileText,
  Wallet,
  Sparkles,
  Info,
  Clock,
  Key,
} from "lucide-react";
import { useAuth0Membership, MembershipTier } from "../utils/auth0MembershipContext";
import {
  recordRevenueEvent,
  getMonetizationSettings,
  exportRevenueLedgerCsv,
  exportRevenueLedgerJson,
} from "../utils/monetizationManager";
import { playNyseBrassBellSound } from "../utils/atsVenueData";

// Synthesizer for revenue chime
function playCashChimeSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Harmonic 2-tone cash register chime (E6 -> B6)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "triangle";

    osc1.frequency.setValueAtTime(1318.51, now); // E6
    osc1.frequency.exponentialRampToValueAtTime(1975.53, now + 0.1); // B6

    osc2.frequency.setValueAtTime(659.25, now);
    osc2.frequency.exponentialRampToValueAtTime(987.77, now + 0.1);

    gainNode.gain.setValueAtTime(0.01, now);
    gainNode.gain.linearRampToValueAtTime(0.25, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.7);
    osc2.stop(now + 0.7);
  } catch (err) {
    console.debug("AudioContext error:", err);
  }
}

interface AtsMembershipMonetizationPlanProps {
  onNavigateToVenue?: () => void;
  onRefreshData?: () => void;
}

export const AtsMembershipMonetizationPlan: React.FC<AtsMembershipMonetizationPlanProps> = ({
  onNavigateToVenue,
  onRefreshData,
}) => {
  const { user, membershipTier, setMembershipTier, isVIP } = useAuth0Membership();
  const settings = getMonetizationSettings();

  // Billing Cadence: Monthly vs Annual (20% discount)
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [upgradeNotice, setUpgradeNotice] = useState<string | null>(null);

  // Trader ROI Calculator State
  const [traderMonthlyVolume, setTraderMonthlyVolume] = useState<number>(1500000);
  const [orderFrequency, setOrderFrequency] = useState<number>(45);

  // Dynamic Cash Flow Simulation Sliders
  const [simVipUsers, setSimVipUsers] = useState<number>(1200);
  const [simEliteUsers, setSimEliteUsers] = useState<number>(250);
  const [simAdvUsd, setSimAdvUsd] = useState<number>(40000000); // $40M daily volume
  const [simPrimaryListings, setSimPrimaryListings] = useState<number>(20);
  const [simDvpBlocks, setSimDvpBlocks] = useState<number>(300000);

  // Active view tab inside the monetization blueprint
  const [activeBlueprintSection, setActiveBlueprintSection] = useState<
    "tiers" | "roi_calculator" | "five_engines" | "pro_forma" | "audit_simulate"
  >("tiers");

  // Trader ROI calculations
  const roiCalculations = useMemo(() => {
    const standardFeeRate = 0.0015; // 0.15% Taker
    const vipFeeRate = 0.00105; // 0.105% Taker (30% rebate)
    const eliteFeeRate = 0.0005; // 0.05% Taker

    const monthlyStandardFees = traderMonthlyVolume * standardFeeRate;
    const monthlyVipFees = traderMonthlyVolume * vipFeeRate;
    const monthlyEliteFees = traderMonthlyVolume * eliteFeeRate;

    const vipGrossSavings = monthlyStandardFees - monthlyVipFees;
    const eliteGrossSavings = monthlyStandardFees - monthlyEliteFees;

    const vipMonthlyCost = billingCycle === "monthly" ? 499 : 4990 / 12;
    const eliteMonthlyCost = billingCycle === "monthly" ? 2499 : 24990 / 12;

    const vipNetProfit = vipGrossSavings - vipMonthlyCost;
    const eliteNetProfit = eliteGrossSavings - eliteMonthlyCost;

    // Breakeven Volume for VIP: volume * 0.00045 = vipMonthlyCost
    const vipBreakevenVolume = vipMonthlyCost / 0.00045;

    return {
      monthlyStandardFees,
      monthlyVipFees,
      monthlyEliteFees,
      vipGrossSavings,
      eliteGrossSavings,
      vipMonthlyCost,
      eliteMonthlyCost,
      vipNetProfit,
      eliteNetProfit,
      vipBreakevenVolume,
    };
  }, [traderMonthlyVolume, billingCycle]);

  // Five Flywheel Engines Calculations
  const fiveEnginesRevenue = useMemo(() => {
    // 1. SaaS Memberships (Tier 1 @ $49/mo, VIP @ $499/mo, Elite @ $2,499/mo)
    const tier1Subscribers = 2500;
    const tier1Arr = tier1Subscribers * 49 * 12;
    const vipArr = simVipUsers * 499 * 12;
    const eliteArr = simEliteUsers * 2499 * 12;
    const engine1SaasTotal = tier1Arr + vipArr + eliteArr;

    // 2. Secondary CLOB & Dark Pool Trading Fees (0.08% net spread take across $ADV)
    const annualTradingVolume = simAdvUsd * 365;
    const engine2TradingFees = annualTradingVolume * 0.0008;

    // 3. Primary Issuance Underwriting & Listing Fees ($25k onboarding + 3.5% syndication of $10M avg raise)
    const setupFeePerListing = 25000;
    const avgCapitalRaisedPerListing = 10000000;
    const underwritingPercent = 0.035;
    const engine3ListingFees =
      simPrimaryListings * setupFeePerListing +
      simPrimaryListings * avgCapitalRaisedPerListing * underwritingPercent;

    // 4. Atomic DvP Clearing Fees ($2.50 ticket fee + 3 bps of $50k avg institutional block)
    const ticketFee = 2.5;
    const avgBlockNotional = 50000;
    const notionalBpsFee = 0.0003;
    const engine4DvpClearing =
      simDvpBlocks * ticketFee + simDvpBlocks * avgBlockNotional * notionalBpsFee;

    // 5. Market Data Licensing & Binary FIX APIs (Level 3 feeds $750/mo, FIX $1,500/mo)
    const institutionCount = Math.round((simVipUsers + simEliteUsers) * 0.12);
    const engine5MarketData = institutionCount * (750 + 1500) * 12;

    const grossAnnualRevenue =
      engine1SaasTotal +
      engine2TradingFees +
      engine3ListingFees +
      engine4DvpClearing +
      engine5MarketData;

    const estimatedOverhead = Math.round(grossAnnualRevenue * 0.11 + 1800000);
    const netPreTaxCashFlow = grossAnnualRevenue - estimatedOverhead;

    return {
      tier1Arr,
      vipArr,
      eliteArr,
      engine1SaasTotal,
      engine2TradingFees,
      engine3ListingFees,
      engine4DvpClearing,
      engine5MarketData,
      grossAnnualRevenue,
      estimatedOverhead,
      netPreTaxCashFlow,
    };
  }, [simVipUsers, simEliteUsers, simAdvUsd, simPrimaryListings, simDvpBlocks]);

  // Handler to upgrade/change tier
  const handleSelectTier = (tier: MembershipTier, tierName: string, amount: number) => {
    setMembershipTier(tier);
    playCashChimeSound();

    if (amount > 0) {
      recordRevenueEvent({
        timestamp: new Date().toISOString(),
        streamType: "ats_membership",
        title: `Token World Exchange ATS® ${tierName} Subscription (${billingCycle.toUpperCase()})`,
        amountUsd: amount,
        amountCrypto: `${amount} USDC`,
        currency: "USDC",
        payerAddress: user.app_metadata.web3_wallet_address || "0x70Ac9...94f0",
        txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
        chain: "ethereum",
        recipientPayoutWallet: settings.payoutWallets.evm,
        status: "Settled to Payout Wallet",
        details: { tier, billingCycle },
      });
      if (onRefreshData) onRefreshData();
    }

    setUpgradeNotice(
      `Auth0 custom claim updated: ${tier}. Subscription status set to active!`
    );
    setTimeout(() => setUpgradeNotice(null), 4500);
  };

  // Instant simulation transaction
  const handleSimulateEvent = (
    streamType:
      | "ats_membership"
      | "token_listing_fee"
      | "dvp_clearing_fee"
      | "market_data_api",
    title: string,
    amountUsd: number
  ) => {
    playNyseBrassBellSound();
    recordRevenueEvent({
      timestamp: new Date().toISOString(),
      streamType,
      title,
      amountUsd,
      amountCrypto: `${amountUsd.toLocaleString()} USDC`,
      currency: "USDC",
      payerAddress: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
      txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
      chain: "ethereum",
      recipientPayoutWallet: settings.payoutWallets.evm,
      status: "Settled to Payout Wallet",
      details: { simulation: true },
    });
    if (onRefreshData) onRefreshData();

    setUpgradeNotice(
      `Simulated fee credited: $${amountUsd.toLocaleString()} -> Payout Wallet ${settings.payoutWallets.evm.slice(0, 8)}...`
    );
    setTimeout(() => setUpgradeNotice(null), 4000);
  };

  const handleDownloadCsv = () => {
    const csv = exportRevenueLedgerCsv();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `TokenWorldExchange_Revenue_Plan_${new Date().toISOString().slice(0, 10)}.csv`
    );
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
    link.setAttribute(
      "download",
      `TokenWorldExchange_Financial_ProForma_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Sovereign Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-[#0a0f1d] to-slate-900 border border-amber-500/30 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-amber-400 uppercase tracking-wider">
                Token World Exchange ATS®
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-300">Sole Owner: Mauro Lomibao Dar III®</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-400">FINRA BD CRD# 8492041</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-400">DTCC FAST #9450</span>
            </div>

            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Institutional Membership &amp; $93.1M Revenue Architecture
            </h2>

            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              Anchor your platform cash flows with <strong>predictable recurring SaaS memberships</strong> ($499 VIP / $2,499 Elite) while capturing exponential upside from secondary trading commissions, primary Regulation D syndication underwriting, and atomic DTCC settlement fees.
            </p>
          </div>

          {/* Quick Payout Route Indicator */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 shrink-0">
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-right space-y-1">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Sovereign Protocol Treasury (100% Payouts)
              </div>
              <div className="text-xs font-mono font-bold text-amber-300">
                {settings.payoutWallets.evm}
              </div>
              <div className="text-[11px] text-emerald-400 flex items-center justify-end gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>EVM Smart Routing Active</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                title="Download CSV Ledger"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export Plan (CSV)</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadJson}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                title="Download JSON Statement"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Pro-Forma (JSON)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Top Metrics Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <div className="text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
              Year 3 Gross Revenue Potential
            </div>
            <div className="text-xl md:text-2xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
              ${(fiveEnginesRevenue.grossAnnualRevenue / 1000000).toFixed(1)}M
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Across all 5 flywheel engines</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <div className="text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
              Annual SaaS Recurring Cashflow (ARR)
            </div>
            <div className="text-xl md:text-2xl font-bold font-mono text-amber-300 mt-1 tabular-nums">
              ${(fiveEnginesRevenue.engine1SaasTotal / 1000000).toFixed(2)}M
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Predictable subscription baseline</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <div className="text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
              Net Pre-Tax Cash Flow
            </div>
            <div className="text-xl md:text-2xl font-bold font-mono text-cyan-400 mt-1 tabular-nums">
              ${(fiveEnginesRevenue.netPreTaxCashFlow / 1000000).toFixed(1)}M
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Retained platform cashflow</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <div className="text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
              Your Current Auth0 Tier
            </div>
            <div className="text-base font-bold font-mono text-white mt-1 flex items-center gap-1.5 truncate">
              <span className={`w-2 h-2 rounded-full ${isVIP ? "bg-amber-400" : "bg-blue-400"}`} />
              <span className="truncate">{membershipTier}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {isVIP ? "Institutional Access Active" : "Standard Tier Active"}
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Notice Alert */}
      {upgradeNotice && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs md:text-sm flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{upgradeNotice}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        {[
          { id: "tiers", label: "1. Four-Tier Fee Schedule & Checkout", icon: Crown },
          { id: "roi_calculator", label: "2. Trader ROI & Fee Savings Calculator", icon: Scale },
          { id: "five_engines", label: "3. Five Flywheel Revenue Engines", icon: Zap },
          { id: "pro_forma", label: "4. Three-Year Financial Growth Pro-Forma", icon: TrendingUp },
          { id: "audit_simulate", label: "5. Instant Revenue Test & Audit Simulation", icon: Play },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeBlueprintSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveBlueprintSection(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION 1: FOUR-TIER FEE SCHEDULE & CHECKOUT */}
      {activeBlueprintSection === "tiers" && (
        <div className="space-y-6">
          {/* Cadence Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/90 border border-slate-800">
            <div>
              <div className="text-sm font-bold text-white">Select Billing Cycle</div>
              <div className="text-xs text-slate-400">
                Annual billing provides a 20% discount, incentivizing long-term institutional lock-in.
              </div>
            </div>

            <div className="inline-flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  billingCycle === "monthly"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("annual")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                  billingCycle === "annual"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>Annual Billing</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards Grid (4 Columns) */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            
            {/* TIER 1: STANDARD (FREE) */}
            <div
              className={`rounded-2xl p-5 flex flex-col justify-between border transition-all ${
                membershipTier === "STANDARD"
                  ? "bg-slate-900 border-blue-500/50 ring-1 ring-blue-500/30"
                  : "bg-slate-900/70 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Entry Tier
                    </span>
                    <h3 className="text-lg font-bold text-white mt-0.5">Standard Member</h3>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    Retail
                  </span>
                </div>

                <div>
                  <div className="text-3xl font-extrabold text-white font-mono tabular-nums">$0</div>
                  <div className="text-xs text-slate-500 mt-0.5">Free forever · No credit card</div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Execution &amp; Entitlements
                  </div>
                  <ul className="space-y-2 text-slate-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      <span><strong>0.10% Maker / 0.15% Taker</strong> baseline fee schedule</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      <span>Public CLOB Order Book Depth</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      <span>Standard Rate Limit: <strong>10 req/sec</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      <span>Basic OAuth 2.0 / TOTP 2FA Security</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => handleSelectTier("STANDARD", "Standard Free Tier", 0)}
                  disabled={membershipTier === "STANDARD"}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    membershipTier === "STANDARD"
                      ? "bg-slate-800 text-slate-400 cursor-default"
                      : "bg-slate-800 hover:bg-slate-700 text-white"
                  }`}
                >
                  {membershipTier === "STANDARD" ? "Current Tier Active" : "Select Free Standard"}
                </button>
              </div>
            </div>

            {/* TIER 2: TIER 1 ACTIVE TRADER ($49) */}
            <div
              className={`rounded-2xl p-5 flex flex-col justify-between border transition-all ${
                membershipTier === "FREE_TIER_1"
                  ? "bg-slate-900 border-cyan-500/50 ring-1 ring-cyan-500/30"
                  : "bg-slate-900/70 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                      Active Trader
                    </span>
                    <h3 className="text-lg font-bold text-white mt-0.5">Tier 1 Member</h3>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    Pro Trader
                  </span>
                </div>

                <div>
                  <div className="text-3xl font-extrabold text-white font-mono tabular-nums">
                    {billingCycle === "monthly" ? "$49" : "$490"}
                    <span className="text-xs font-normal text-slate-400 font-sans">
                      {billingCycle === "monthly" ? " / month" : " / year"}
                    </span>
                  </div>
                  <div className="text-xs text-cyan-400 mt-0.5">
                    {billingCycle === "annual" ? "Save $98/year (20% off)" : "$49/mo billed monthly"}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Execution &amp; Entitlements
                  </div>
                  <ul className="space-y-2 text-slate-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span><strong>10% Trading Fee Rebate</strong> (0.09% / 0.135%)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span>FIDO2 / WebAuthn Hardware Keys (YubiKey)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span>Advanced Charting &amp; Real-time Anomaly Signals</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span>Enhanced Rate Limit: <strong>15 req/sec</strong></span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() =>
                    handleSelectTier(
                      "FREE_TIER_1",
                      "Tier 1 Trader",
                      billingCycle === "monthly" ? 49 : 490
                    )
                  }
                  disabled={membershipTier === "FREE_TIER_1"}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    membershipTier === "FREE_TIER_1"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 cursor-default"
                      : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold shadow-md shadow-cyan-500/20"
                  }`}
                >
                  {membershipTier === "FREE_TIER_1" ? "Current Tier Active" : "Select Tier 1 ($49)"}
                </button>
              </div>
            </div>

            {/* TIER 3: VIP INSTITUTIONAL ($499) - FEATURED */}
            <div
              className={`relative rounded-2xl p-5 flex flex-col justify-between border transition-all ${
                membershipTier === "PAID_VIP_SUBSCRIPTION"
                  ? "bg-slate-900 border-amber-500 ring-2 ring-amber-500/40 shadow-xl shadow-amber-500/10"
                  : "bg-slate-900/90 border-amber-500/60 shadow-lg shadow-amber-500/5 hover:border-amber-400"
              }`}
            >
              {/* Most Popular Badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[10px] font-extrabold uppercase tracking-wider shadow-md">
                ⭐ Most Popular · Institutional Pro
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-start pt-1">
                  <div>
                    <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                      Institutional Flagship
                    </span>
                    <h3 className="text-lg font-bold text-white mt-0.5">VIP Subscription</h3>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    High Margin
                  </span>
                </div>

                <div>
                  <div className="text-3xl font-extrabold text-amber-400 font-mono tabular-nums">
                    {billingCycle === "monthly" ? "$499" : "$4,990"}
                    <span className="text-xs font-normal text-slate-400 font-sans">
                      {billingCycle === "monthly" ? " / month" : " / year"}
                    </span>
                  </div>
                  <div className="text-xs text-emerald-400 mt-0.5">
                    {billingCycle === "annual"
                      ? "Save $998/year (20% off)"
                      : "Payback in 10-15 trades via fee savings"}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs">
                  <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                    Full Institutional Entitlements
                  </div>
                  <ul className="space-y-2 text-slate-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span><strong>30% Trading Fee Rebate</strong> (0.07% / 0.105%)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span><strong>Full Level 3 Institutional Order Book</strong> &amp; OCO orders</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span><strong>Institutional Sandbox (TW-DEMO)</strong> with test capital</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span><strong>Trade Velocity Radar</strong> with 3-sigma anomaly triggers</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>Priority API Gateway: <strong>50 req/sec</strong></span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() =>
                    handleSelectTier(
                      "PAID_VIP_SUBSCRIPTION",
                      "VIP Institutional Subscription",
                      billingCycle === "monthly" ? 499 : 4990
                    )
                  }
                  className={`w-full py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    membershipTier === "PAID_VIP_SUBSCRIPTION"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-default"
                      : "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-lg shadow-amber-500/20"
                  }`}
                >
                  <Crown className="w-4 h-4" />
                  <span>
                    {membershipTier === "PAID_VIP_SUBSCRIPTION"
                      ? "Current Tier Active"
                      : "Upgrade to VIP ($499)"}
                  </span>
                </button>
              </div>
            </div>

            {/* TIER 4: ELITE INSTITUTIONAL ($2,499) */}
            <div
              className={`rounded-2xl p-5 flex flex-col justify-between border transition-all ${
                membershipTier === "ELITE_INSTITUTIONAL"
                  ? "bg-slate-900 border-purple-500/50 ring-1 ring-purple-500/30"
                  : "bg-slate-900/70 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                      Market Maker &amp; Dark Pool
                    </span>
                    <h3 className="text-lg font-bold text-white mt-0.5">Elite Institutional</h3>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
                    Enterprise
                  </span>
                </div>

                <div>
                  <div className="text-3xl font-extrabold text-purple-300 font-mono tabular-nums">
                    {billingCycle === "monthly" ? "$2,499" : "$24,990"}
                    <span className="text-xs font-normal text-slate-400 font-sans">
                      {billingCycle === "monthly" ? " / month" : " / year"}
                    </span>
                  </div>
                  <div className="text-xs text-purple-400 mt-0.5">
                    {billingCycle === "annual" ? "Save $4,998/year (20% off)" : "Hedge Funds & Market Makers"}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs">
                  <div className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">
                    Institutional Clearing Infrastructure
                  </div>
                  <ul className="space-y-2 text-slate-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                      <span><strong>Negative Maker Fee Rebate (-0.02%)</strong> · Earn on resting orders</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                      <span><strong>Dark Pool ATS Crossing</strong> (Zero market impact on 8-figure blocks)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                      <span>Dedicated sub-millisecond <strong>FIX/Binary Gateway</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                      <span>Custodial Segregation (Fireblocks / Anchorage)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                      <span>High Rate Limit: <strong>250 req/sec</strong> &amp; dedicated executive desk</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() =>
                    handleSelectTier(
                      "ELITE_INSTITUTIONAL",
                      "Elite Institutional Subscription",
                      billingCycle === "monthly" ? 2499 : 24990
                    )
                  }
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    membershipTier === "ELITE_INSTITUTIONAL"
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 cursor-default"
                      : "bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20"
                  }`}
                >
                  {membershipTier === "ELITE_INSTITUTIONAL"
                    ? "Current Tier Active"
                    : "Activate Elite ($2,499)"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SECTION 2: TRADER ROI & FEE SAVINGS CALCULATOR */}
      {activeBlueprintSection === "roi_calculator" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Scale className="w-5 h-5 text-amber-400" />
                  <span>Trader ROI &amp; Subscription Payback Calculator</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                  Show traders the exact financial mathematical proof that the $499 VIP subscription is an immediate profit center rather than a cost.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-right">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  VIP Breakeven Monthly Volume
                </div>
                <div className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
                  ${Math.round(roiCalculations.vipBreakevenVolume).toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500">
                  Any volume above this pays the trader net profits
                </div>
              </div>
            </div>

            {/* Sliders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-300">Monthly Trading Volume</span>
                  <span className="font-mono font-bold text-amber-400 text-sm tabular-nums">
                    ${traderMonthlyVolume.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min="50000"
                  max="10000000"
                  step="50000"
                  value={traderMonthlyVolume}
                  onChange={(e) => setTraderMonthlyVolume(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>$50k</span>
                  <span>$1M</span>
                  <span>$5M</span>
                  <span>$10M</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-300">Average Trade Frequency</span>
                  <span className="font-mono font-bold text-cyan-400 text-sm tabular-nums">
                    {orderFrequency} trades / month
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="200"
                  step="5"
                  value={orderFrequency}
                  onChange={(e) => setOrderFrequency(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>5 trades</span>
                  <span>50 trades</span>
                  <span>100 trades</span>
                  <span>200 trades</span>
                </div>
              </div>
            </div>

            {/* Calculation Output Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  Standard Fee on Volume
                </div>
                <div className="text-xl font-bold font-mono text-slate-300 tabular-nums">
                  ${roiCalculations.monthlyStandardFees.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div className="text-[10px] text-slate-500">At standard 0.15% taker rate</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  VIP 30% Fee Rebate Savings
                </div>
                <div className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
                  +${roiCalculations.vipGrossSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div className="text-[10px] text-slate-500">Gross savings on 0.105% VIP taker</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  Net Trader Savings (After $499 VIP)
                </div>
                <div
                  className={`text-xl font-bold font-mono tabular-nums ${
                    roiCalculations.vipNetProfit >= 0 ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {roiCalculations.vipNetProfit >= 0 ? "+" : ""}$
                  {roiCalculations.vipNetProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div className="text-[10px] text-slate-500">
                  {roiCalculations.vipNetProfit >= 0
                    ? "Net cash saved in the trader's pocket"
                    : "Close to breakeven"}
                </div>
              </div>
            </div>

            {/* Visual Value Proof Box */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-emerald-950/40 border border-amber-500/30 flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-white">Institutional Sales Conversion Formula</div>
                  <div className="text-slate-300">
                    By saving traders $
                    {roiCalculations.vipGrossSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    /mo on fees, paying $499/mo is a rational no-brainer financial decision for every active account.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleSelectTier(
                    "PAID_VIP_SUBSCRIPTION",
                    "VIP Institutional Subscription",
                    billingCycle === "monthly" ? 499 : 4990
                  )
                }
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs whitespace-nowrap shrink-0 shadow transition-colors cursor-pointer"
              >
                Subscribe Now to Save Fees
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: FIVE FLYWHEEL REVENUE ENGINES */}
      {activeBlueprintSection === "five_engines" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <span>The Five Flywheel Revenue Engines Matrix</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl">
                How Token World Exchange ATS® generates predictable multi-million annual cash flow through 5 synchronized software and transaction engines.
              </p>
            </div>

            {/* Interactive Sliders to Test Revenue Scale */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">VIP Subscribers</span>
                  <span className="font-mono font-bold text-amber-300">{simVipUsers}</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="3000"
                  step="50"
                  value={simVipUsers}
                  onChange={(e) => setSimVipUsers(Number(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Elite MM Subscribers</span>
                  <span className="font-mono font-bold text-purple-300">{simEliteUsers}</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="1000"
                  step="10"
                  value={simEliteUsers}
                  onChange={(e) => setSimEliteUsers(Number(e.target.value))}
                  className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Daily Trading Volume (ADV)</span>
                  <span className="font-mono font-bold text-emerald-400">
                    ${(simAdvUsd / 1000000).toFixed(0)}M / day
                  </span>
                </div>
                <input
                  type="range"
                  min="5000000"
                  max="100000000"
                  step="5000000"
                  value={simAdvUsd}
                  onChange={(e) => setSimAdvUsd(Number(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Primary Token Issuances</span>
                  <span className="font-mono font-bold text-cyan-300">{simPrimaryListings} / yr</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="60"
                  step="2"
                  value={simPrimaryListings}
                  onChange={(e) => setSimPrimaryListings(Number(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 md:col-span-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Annual DTCC DvP Cleared Tickets</span>
                  <span className="font-mono font-bold text-blue-300">
                    {simDvpBlocks.toLocaleString()} blocks / yr
                  </span>
                </div>
                <input
                  type="range"
                  min="50000"
                  max="1000000"
                  step="25000"
                  value={simDvpBlocks}
                  onChange={(e) => setSimDvpBlocks(Number(e.target.value))}
                  className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Five Engine Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              
              {/* Engine 1 */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between items-start">
                  <div className="text-xs font-bold text-amber-400">
                    Engine 1: SaaS Subscriptions
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Recurring ARR</span>
                </div>
                <div className="text-2xl font-bold font-mono text-white tabular-nums">
                  ${(fiveEnginesRevenue.engine1SaasTotal / 1000000).toFixed(2)}M
                  <span className="text-xs text-slate-500 font-sans"> / yr</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {simVipUsers.toLocaleString()} VIP ($499) + {simEliteUsers.toLocaleString()} Elite ($2,499) accounts. Predictable software cash flow with &gt;90% margin.
                </p>
              </div>

              {/* Engine 2 */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between items-start">
                  <div className="text-xs font-bold text-emerald-400">
                    Engine 2: Trading Commissions
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">CLOB &amp; Dark Pool</span>
                </div>
                <div className="text-2xl font-bold font-mono text-white tabular-nums">
                  ${(fiveEnginesRevenue.engine2TradingFees / 1000000).toFixed(2)}M
                  <span className="text-xs text-slate-500 font-sans"> / yr</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  0.08% net spread take across ${(simAdvUsd / 1000000).toFixed(0)}M daily volume on 509 token pairs and RWA assets.
                </p>
              </div>

              {/* Engine 3 */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between items-start">
                  <div className="text-xs font-bold text-cyan-400">
                    Engine 3: Primary Token Listings
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Reg D &amp; Rule 144A</span>
                </div>
                <div className="text-2xl font-bold font-mono text-white tabular-nums">
                  ${(fiveEnginesRevenue.engine3ListingFees / 1000000).toFixed(2)}M
                  <span className="text-xs text-slate-500 font-sans"> / yr</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  $25k onboarding fee + 3.5% syndication commission across {simPrimaryListings} corporate real estate &amp; equity issuances.
                </p>
              </div>

              {/* Engine 4 */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between items-start">
                  <div className="text-xs font-bold text-blue-400">
                    Engine 4: Atomic DvP Clearing
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">DTCC FAST #9450</span>
                </div>
                <div className="text-2xl font-bold font-mono text-white tabular-nums">
                  ${(fiveEnginesRevenue.engine4DvpClearing / 1000000).toFixed(2)}M
                  <span className="text-xs text-slate-500 font-sans"> / yr</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  $2.50 ticket fee + 3 bps on {simDvpBlocks.toLocaleString()} cleared institutional trades. T+0 settlement replaces slow legacy clearinghouses.
                </p>
              </div>

              {/* Engine 5 */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between items-start">
                  <div className="text-xs font-bold text-purple-400">
                    Engine 5: Market Data &amp; FIX APIs
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Quant Feeds</span>
                </div>
                <div className="text-2xl font-bold font-mono text-white tabular-nums">
                  ${(fiveEnginesRevenue.engine5MarketData / 1000000).toFixed(2)}M
                  <span className="text-xs text-slate-500 font-sans"> / yr</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Level 3 historical tick feeds ($750/mo) and dedicated ultra-low latency FIX binary gateways ($1,500/mo) licensed to quantitative hedge funds.
                </p>
              </div>

              {/* Retained Treasury Net Cash */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-950/60 via-slate-900 to-emerald-950/60 border border-emerald-500/40 space-y-2">
                <div className="flex justify-between items-start">
                  <div className="text-xs font-bold text-emerald-300">
                    Sovereign Protocol Net Cash Flow
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">100% Payout</span>
                </div>
                <div className="text-2xl font-black font-mono text-emerald-400 tabular-nums">
                  ${(fiveEnginesRevenue.netPreTaxCashFlow / 1000000).toFixed(2)}M
                  <span className="text-xs text-slate-400 font-sans"> / yr</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Direct automated disbursements into Sole Owner Mauro Lomibao Dar III Treasury (`0x70Ac...94f0`).
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: 3-YEAR FINANCIAL PRO-FORMA */}
      {activeBlueprintSection === "pro_forma" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span>3-Year Financial Growth Pro-Forma (Scaling to $93.1M Gross)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl">
                Conservative institutional growth runway showing the compounding transition from initial ATS activation to institutional market leadership.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                    <th className="py-3 px-4">Revenue Stream Engine</th>
                    <th className="py-3 px-4">Year 1 (Traction &amp; Seed)</th>
                    <th className="py-3 px-4">Year 2 (ATS Scaling)</th>
                    <th className="py-3 px-4 text-emerald-400">Year 3 (Institutional Scale)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono tabular-nums">
                  <tr>
                    <td className="py-3.5 px-4 font-sans font-semibold text-white">
                      1. SaaS Memberships (Tier 1, VIP, Elite)
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">$3,850,000</td>
                    <td className="py-3.5 px-4 text-slate-300">$13,440,000</td>
                    <td className="py-3.5 px-4 text-emerald-400 font-bold">$28,600,000</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-sans font-semibold text-white">
                      2. Secondary CLOB &amp; Dark Pool Trading Fees
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">$2,900,000</td>
                    <td className="py-3.5 px-4 text-slate-300">$11,680,000</td>
                    <td className="py-3.5 px-4 text-emerald-400 font-bold">$34,500,000</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-sans font-semibold text-white">
                      3. Primary Token Listing &amp; Syndication
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">$2,000,000</td>
                    <td className="py-3.5 px-4 text-slate-300">$7,500,000</td>
                    <td className="py-3.5 px-4 text-emerald-400 font-bold">$18,000,000</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-sans font-semibold text-white">
                      4. Atomic DvP Clearing (DTCC FAST)
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">$650,000</td>
                    <td className="py-3.5 px-4 text-slate-300">$2,100,000</td>
                    <td className="py-3.5 px-4 text-emerald-400 font-bold">$5,800,000</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-sans font-semibold text-white">
                      5. Market Data Licensing &amp; FIX APIs
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">$800,000</td>
                    <td className="py-3.5 px-4 text-slate-300">$2,700,000</td>
                    <td className="py-3.5 px-4 text-emerald-400 font-bold">$6,200,000</td>
                  </tr>
                  <tr className="bg-slate-950 font-bold">
                    <td className="py-3.5 px-4 font-sans text-amber-300">
                      Total Gross Platform Cashflow
                    </td>
                    <td className="py-3.5 px-4 text-amber-300">$10,200,000</td>
                    <td className="py-3.5 px-4 text-amber-300">$37,420,000</td>
                    <td className="py-3.5 px-4 text-amber-300 text-sm">$93,100,000</td>
                  </tr>
                  <tr className="text-rose-400">
                    <td className="py-3.5 px-4 font-sans">
                      Estimated Operational Overhead &amp; Compliance Legal
                    </td>
                    <td className="py-3.5 px-4">($1,850,000)</td>
                    <td className="py-3.5 px-4">($4,200,000)</td>
                    <td className="py-3.5 px-4">($8,500,000)</td>
                  </tr>
                  <tr className="bg-emerald-950/30 border-t-2 border-emerald-500 font-bold text-sm">
                    <td className="py-4 px-4 font-sans text-emerald-300">
                      Net Pre-Tax Operating Cash Flow (Mauro L. Dar III)
                    </td>
                    <td className="py-4 px-4 text-emerald-400">$8,350,000</td>
                    <td className="py-4 px-4 text-emerald-400">$33,220,000</td>
                    <td className="py-4 px-4 text-emerald-400 text-base">$84,600,000</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: INSTANT AUDIT SIMULATION */}
      {activeBlueprintSection === "audit_simulate" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Play className="w-5 h-5 text-emerald-400" />
                <span>Instant Revenue Event Simulator &amp; Audit Verification</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl">
                Click any simulation button to trigger a real transaction event into the platform revenue ledger, sound the trading audio chime, and verify real-time credit to your payout wallet.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() =>
                  handleSimulateEvent(
                    "ats_membership",
                    "Token World Exchange ATS® Monthly VIP Subscription",
                    499.0
                  )
                }
                className="p-4 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/50 text-left space-y-2 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                    <Crown className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">+$499.00</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Simulate VIP Monthly Sale</div>
                  <div className="text-[11px] text-slate-400">
                    Billed to prop trader account, instant settlement in USDC.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleSimulateEvent(
                    "ats_membership",
                    "Token World Exchange ATS® Annual VIP Subscription (Prepaid)",
                    4990.0
                  )
                }
                className="p-4 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/50 text-left space-y-2 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">+$4,990.00</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Simulate VIP Annual Prepaid</div>
                  <div className="text-[11px] text-slate-400">
                    12 months upfront with 20% discount applied.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleSimulateEvent(
                    "ats_membership",
                    "Token World Exchange ATS® Elite Institutional Tier (Monthly)",
                    2499.0
                  )
                }
                className="p-4 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-purple-500/50 text-left space-y-2 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-mono font-bold text-purple-300">+$2,499.00</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Simulate Elite MM Sale</div>
                  <div className="text-[11px] text-slate-400">
                    Hedge fund / market maker with FIX binary gateway access.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleSimulateEvent(
                    "token_listing_fee",
                    "SEC Reg D 506(c) Primary Listing & Smart Contract Factory Fee",
                    25000.0
                  )
                }
                className="p-4 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/50 text-left space-y-2 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start">
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-mono font-bold text-cyan-300">+$25,000.00</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Simulate Reg D Listing Fee</div>
                  <div className="text-[11px] text-slate-400">
                    Upfront legal diligence and factory contract deployment.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleSimulateEvent(
                    "dvp_clearing_fee",
                    "DTCC FAST #9450 Atomic DvP Settlement Batch Fee (500 trades)",
                    1250.0
                  )
                }
                className="p-4 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500/50 text-left space-y-2 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                    <Layers className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-300">+$1,250.00</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Simulate DvP Settlement Batch</div>
                  <div className="text-[11px] text-slate-400">
                    Cleared on-chain through DTCC FAST settlement bridge.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleSimulateEvent(
                    "market_data_api",
                    "Institutional Level 3 Raw Tick Feed & FIX Gateway Licensing",
                    1500.0
                  )
                }
                className="p-4 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 text-left space-y-2 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                    <Activity className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-300">+$1,500.00</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Simulate Market Data License</div>
                  <div className="text-[11px] text-slate-400">
                    Monthly raw feed and dedicated IP whitelist gateway.
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return to ATS Venue Navigation Banner */}
      {onNavigateToVenue && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">
                Ready to trade or inspect the order book?
              </div>
              <div className="text-xs text-slate-400">
                Jump directly to the live Token World Exchange ATS® trading venue and central limit order book.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateToVenue}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <span>Launch ATS Trading Venue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
