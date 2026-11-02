import React, { useState } from "react";
import {
  Crown,
  Building2,
  Lock,
  CheckCircle2,
  Zap,
  CreditCard,
  Shield,
  ArrowRight,
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
  HelpCircle,
  Clock,
  Key,
  DollarSign,
  Download,
  Flame,
  Check,
  Scale,
} from "lucide-react";
import { useAuth0Membership, MembershipTier, VIP_TIER_MATRIX } from "../utils/auth0MembershipContext";
import { StripeElementsCheckoutModal, StripePaymentReceipt } from "./StripeElementsCheckoutModal";
import { recordRevenueEvent, getMonetizationSettings } from "../utils/monetizationManager";
import { playNyseBrassBellSound } from "../utils/atsVenueData";

interface MonetizationDashboardSectionProps {
  onNavigateToVenue?: () => void;
  onRefreshData?: () => void;
}

export const MonetizationDashboardSection: React.FC<MonetizationDashboardSectionProps> = ({
  onNavigateToVenue,
  onRefreshData,
}) => {
  const { user, membershipTier, isVIP, setMembershipTier, downgradeToFree } = useAuth0Membership();
  const settings = getMonetizationSettings();

  // Billing Cadence State
  const [billingCadence, setBillingCadence] = useState<"monthly" | "annual">("monthly");

  // Stripe Checkout Modal State
  const [checkoutModalOpen, setCheckoutModalOpen] = useState<boolean>(false);
  const [selectedTier, setSelectedTier] = useState<MembershipTier>("PAID_VIP_SUBSCRIPTION");
  const [selectedTierName, setSelectedTierName] = useState<string>("VIP Institutional Subscription");
  const [selectedTierAmount, setSelectedTierAmount] = useState<number>(499);

  // Success Notification
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Open Stripe Checkout for a specific tier
  const handleOpenStripeCheckout = (tier: MembershipTier) => {
    setSelectedTier(tier);
    if (tier === "PAID_VIP_SUBSCRIPTION") {
      setSelectedTierName("VIP Institutional Subscription");
      setSelectedTierAmount(billingCadence === "monthly" ? 499 : 4990);
    } else if (tier === "ELITE_INSTITUTIONAL") {
      setSelectedTierName("Elite Institutional Subscription");
      setSelectedTierAmount(billingCadence === "monthly" ? 2499 : 24990);
    } else {
      setSelectedTierName("Tier 1 Active Trader");
      setSelectedTierAmount(billingCadence === "monthly" ? 49 : 490);
    }
    setCheckoutModalOpen(true);
  };

  // Payment Success Handler
  const handlePaymentSuccess = (receipt: StripePaymentReceipt) => {
    // 1. Update Auth0 Custom Claim & Metadata
    setMembershipTier(receipt.tier);

    // 2. Record Revenue Event into Platform Financial Ledger
    recordRevenueEvent({
      timestamp: receipt.timestamp,
      streamType: "ats_membership",
      title: `Token World Exchange ATS® ${receipt.tierName} (Stripe Elements Checkout)`,
      amountUsd: receipt.amountUsd,
      amountCrypto: `${receipt.amountUsd.toFixed(2)} USDC`,
      currency: "USDC",
      payerAddress: receipt.customerEmail,
      txHash: receipt.chargeId,
      chain: "stripe",
      recipientPayoutWallet: settings.payoutWallets.evm,
      status: "Settled to Payout Wallet",
      details: {
        stripePaymentIntentId: receipt.paymentIntentId,
        stripeChargeId: receipt.chargeId,
        cardBrand: receipt.cardBrand,
        cardLast4: receipt.cardLast4,
        billingCadence: receipt.billingCadence,
      },
    });

    if (onRefreshData) onRefreshData();

    // 3. Play audio bell celebration
    playNyseBrassBellSound();

    // 4. Show success banner
    setSuccessBanner(
      `Stripe Payment Successful! Auth0 Claim upgraded to ${receipt.tier}. Charge ID: ${receipt.chargeId}`
    );
    setTimeout(() => setSuccessBanner(null), 6000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Header & Account Status Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-[#0d1326] to-slate-900 border border-[#635BFF]/30 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#635BFF]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#635BFF]/15 border border-[#635BFF]/30 text-[#00D4FF] text-xs font-bold uppercase tracking-wider">
              <CreditCard className="w-3.5 h-3.5 text-[#635BFF]" />
              <span>Stripe Elements · Monetization Dashboard</span>
            </div>

            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Institutional Membership &amp; Subscription Gateway
            </h2>

            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Securely upgrade your Token World Exchange ATS® membership using <strong>Stripe Elements</strong>. Access sub-millisecond Level 3 order books, dark pool execution routing, and automated trading fee rebates.
            </p>
          </div>

          {/* Current Auth0 Subscription State Box */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-left sm:text-right space-y-1.5 shrink-0">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Auth0 Verified Account State
            </div>
            <div className="flex items-center sm:justify-end gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isVIP ? "bg-amber-400 animate-pulse" : "bg-blue-400"}`} />
              <span className="text-sm font-mono font-bold text-white">
                {membershipTier}
              </span>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              {user.email}
            </div>
            <div className="text-[11px] text-emerald-400 font-semibold flex items-center sm:justify-end gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Status: {user.app_metadata.ats_account_status}</span>
            </div>
          </div>
        </div>

        {/* Live Feature Highlights Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <div className="text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
              VIP Tier Pricing
            </div>
            <div className="text-xl font-bold font-mono text-amber-400 mt-1 tabular-nums">
              $499 <span className="text-xs text-slate-400 font-normal">/ mo</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">30% Trading Fee Rebate</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <div className="text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
              Elite Tier Pricing
            </div>
            <div className="text-xl font-bold font-mono text-purple-400 mt-1 tabular-nums">
              $2,499 <span className="text-xs text-slate-400 font-normal">/ mo</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">-0.02% Negative Maker Rebate</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <div className="text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
              Payment Rails
            </div>
            <div className="text-base font-bold text-white mt-1 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-[#635BFF]" />
              <span>Stripe Elements</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">PCI-DSS Level 1 Compliant</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <div className="text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
              Auth0 Synchronization
            </div>
            <div className="text-base font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Instant Claim Mutation</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Zero-latency terminal unlock</div>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successBanner && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs md:text-sm flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Billing Cycle Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <div className="text-sm font-bold text-white">Select Billing Cadence</div>
          <div className="text-xs text-slate-400">
            Save 20% on annual subscriptions with automated yearly Stripe recurring billing.
          </div>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setBillingCadence("monthly")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              billingCadence === "monthly"
                ? "bg-[#635BFF] text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => setBillingCadence("annual")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              billingCadence === "annual"
                ? "bg-[#635BFF] text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Annual Billing</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* PRICING TABLE: PRIMARY FOCUS ON $499/MO VIP AND $2,499/MO ELITE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. VIP MEMBERSHIP TIER ($499/mo) */}
        <div
          className={`relative rounded-3xl p-6 md:p-8 flex flex-col justify-between border transition-all ${
            membershipTier === "PAID_VIP_SUBSCRIPTION"
              ? "bg-slate-900/90 border-amber-500 ring-2 ring-amber-500/40 shadow-2xl shadow-amber-500/10"
              : "bg-slate-900/80 border-amber-500/50 hover:border-amber-400 shadow-xl"
          }`}
        >
          {/* Most Popular Badge */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Institutional Pro · High Demand</span>
          </div>

          <div className="space-y-6 pt-2">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Proprietary &amp; Algorithmic Desks
              </span>
              <h3 className="text-2xl font-black text-white mt-1 flex items-center gap-2">
                <Crown className="w-6 h-6 text-amber-400" />
                <span>VIP Membership Tier</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                For high-frequency algorithmic traders and prop firms requiring full Level 3 market depth, OCO execution, and 30% fee rebates.
              </p>
            </div>

            {/* Price Box */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-amber-400 font-mono tabular-nums">
                  {billingCadence === "monthly" ? "$499" : "$4,990"}
                </span>
                <span className="text-sm font-semibold text-slate-400">
                  {billingCadence === "monthly" ? "/ month" : "/ year"}
                </span>
              </div>
              <div className="text-xs text-emerald-400 mt-1 font-medium">
                {billingCadence === "annual"
                  ? "Billed annually at $4,990/yr (Save $998 with 20% discount)"
                  : "Billed monthly via Stripe Elements · Cancel anytime"}
              </div>
            </div>

            {/* Entitlements & Features List */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Included Institutional Capabilities:
              </div>
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>30% Trading Fee Rebate</strong>: 0.07% Maker / 0.105% Taker (pays for itself in 10-15 trades)
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Full Level 3 Institutional Order Book</strong> with sub-millisecond price-time priority heap
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Advanced OCO Triggers</strong>: One-Cancels-the-Other stop loss &amp; take profit orders
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Institutional Sandbox (TW-DEMO)</strong> with simulated matching engine &amp; test capital
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Trade Velocity Alert Surveillance</strong> with 3-sigma order book volume anomaly radar
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Priority API Gateway: <strong>50 requests / second</strong> with master/sub-account keys
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Action CTA */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <button
              type="button"
              onClick={() => handleOpenStripeCheckout("PAID_VIP_SUBSCRIPTION")}
              disabled={membershipTier === "PAID_VIP_SUBSCRIPTION"}
              className={`w-full py-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                membershipTier === "PAID_VIP_SUBSCRIPTION"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-default"
                  : "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/20"
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>
                {membershipTier === "PAID_VIP_SUBSCRIPTION"
                  ? "VIP Tier Currently Active"
                  : `Subscribe Now ($${billingCadence === "monthly" ? "499/mo" : "4,990/yr"}) with Stripe`}
              </span>
            </button>
            <div className="text-[11px] text-slate-500 text-center mt-2">
              Instant activation &bull; Auth0 claim updated on settlement
            </div>
          </div>
        </div>

        {/* 2. ELITE MEMBERSHIP TIER ($2,499/mo) */}
        <div
          className={`relative rounded-3xl p-6 md:p-8 flex flex-col justify-between border transition-all ${
            membershipTier === "ELITE_INSTITUTIONAL"
              ? "bg-slate-900/90 border-purple-500 ring-2 ring-purple-500/40 shadow-2xl shadow-purple-500/10"
              : "bg-slate-900/80 border-purple-500/50 hover:border-purple-400 shadow-xl"
          }`}
        >
          {/* Institutional Badge */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            <span>Market Maker &amp; Dark Pool DMA</span>
          </div>

          <div className="space-y-6 pt-2">
            <div>
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                Hedge Funds &amp; Institutional Market Makers
              </span>
              <h3 className="text-2xl font-black text-white mt-1 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-purple-400" />
                <span>Elite Membership Tier</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                For tier-1 market makers, hedge funds, and prime brokerages requiring negative maker rebates, dark pool crossing, and co-located FIX/Binary APIs.
              </p>
            </div>

            {/* Price Box */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-purple-300 font-mono tabular-nums">
                  {billingCadence === "monthly" ? "$2,499" : "$24,990"}
                </span>
                <span className="text-sm font-semibold text-slate-400">
                  {billingCadence === "monthly" ? "/ month" : "/ year"}
                </span>
              </div>
              <div className="text-xs text-purple-400 mt-1 font-medium">
                {billingCadence === "annual"
                  ? "Billed annually at $24,990/yr (Save $4,998 with 20% discount)"
                  : "Billed monthly via Stripe Elements · Invoice/ACH support available"}
              </div>
            </div>

            {/* Entitlements & Features List */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Included Institutional Capabilities:
              </div>
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Negative Maker Rebates (-0.02%)</strong>: Get paid to provide liquidity on resting limit orders
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Dark Pool ATS Crossing Access</strong>: Zero market impact execution on 8-figure block trades
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>
                    Dedicated sub-millisecond <strong>FIX Protocol / Binary Feed Gateway</strong> with IP whitelisting
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Custodial Segregation</strong> via Fireblocks, Anchorage Digital, and BitGo Trust
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>
                    High-Capacity API Gateway: <strong>250 requests / second</strong> with zero throttling
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>
                    Dedicated 24/7 Institutional Executive Account Desk &amp; Form ATS compliance officer liaison
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Action CTA */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <button
              type="button"
              onClick={() => handleOpenStripeCheckout("ELITE_INSTITUTIONAL")}
              disabled={membershipTier === "ELITE_INSTITUTIONAL"}
              className={`w-full py-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                membershipTier === "ELITE_INSTITUTIONAL"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 cursor-default"
                  : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/20"
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>
                {membershipTier === "ELITE_INSTITUTIONAL"
                  ? "Elite Tier Currently Active"
                  : `Subscribe Now ($${billingCadence === "monthly" ? "2,499/mo" : "24,990/yr"}) with Stripe`}
              </span>
            </button>
            <div className="text-[11px] text-slate-500 text-center mt-2">
              Includes Dedicated FIX Gateway provisioning &bull; Custom SLA
            </div>
          </div>
        </div>

      </div>

      {/* FULL FOUR-TIER COMPARISON MATRIX */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div>
          <h4 className="text-base font-bold text-white flex items-center gap-2">
            <Scale className="w-4 h-4 text-amber-400" />
            <span>Four-Tier Membership Comparison Matrix</span>
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare all four tiers from entry-level retail access to institutional market maker dark pool clearing.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                <th className="py-3 px-3">Tier Name</th>
                <th className="py-3 px-3">Monthly Fee</th>
                <th className="py-3 px-3">Maker / Taker Schedule</th>
                <th className="py-3 px-3">Order Book Access</th>
                <th className="py-3 px-3">Rate Limit</th>
                <th className="py-3 px-3">Security &amp; Hardware</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
              <tr>
                <td className="py-3 px-3 font-sans font-bold text-slate-200">Standard Member</td>
                <td className="py-3 px-3 text-white">$0 / mo</td>
                <td className="py-3 px-3">0.10% / 0.15%</td>
                <td className="py-3 px-3 font-sans">Public CLOB</td>
                <td className="py-3 px-3">10 req/s</td>
                <td className="py-3 px-3 font-sans text-slate-400">OAuth 2.0 / TOTP</td>
                <td className="py-3 px-3 text-right">
                  {membershipTier === "STANDARD" ? (
                    <span className="text-[11px] text-emerald-400 font-sans font-bold">Active</span>
                  ) : (
                    <button
                      type="button"
                      onClick={downgradeToFree}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-sans font-semibold cursor-pointer"
                    >
                      Downgrade
                    </button>
                  )}
                </td>
              </tr>

              <tr>
                <td className="py-3 px-3 font-sans font-bold text-cyan-400">Tier 1 Active Trader</td>
                <td className="py-3 px-3 text-cyan-300">$49 / mo</td>
                <td className="py-3 px-3">0.09% / 0.135% (10% rebate)</td>
                <td className="py-3 px-3 font-sans">Advanced CLOB</td>
                <td className="py-3 px-3">15 req/s</td>
                <td className="py-3 px-3 font-sans text-cyan-400">YubiKey FIDO2 WebAuthn</td>
                <td className="py-3 px-3 text-right">
                  {membershipTier === "FREE_TIER_1" ? (
                    <span className="text-[11px] text-cyan-400 font-sans font-bold">Active</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenStripeCheckout("FREE_TIER_1")}
                      className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-sans font-semibold cursor-pointer"
                    >
                      Subscribe ($49)
                    </button>
                  )}
                </td>
              </tr>

              <tr className="bg-amber-950/20">
                <td className="py-3 px-3 font-sans font-black text-amber-400 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>VIP Subscription</span>
                </td>
                <td className="py-3 px-3 text-amber-300 font-bold">$499 / mo</td>
                <td className="py-3 px-3 text-emerald-400 font-bold">0.07% / 0.105% (30% rebate)</td>
                <td className="py-3 px-3 font-sans font-semibold text-white">Full L3 Institutional + OCO</td>
                <td className="py-3 px-3 font-bold text-white">50 req/s</td>
                <td className="py-3 px-3 font-sans text-slate-300">YubiKey + TW-DEMO Sandbox</td>
                <td className="py-3 px-3 text-right">
                  {membershipTier === "PAID_VIP_SUBSCRIPTION" ? (
                    <span className="text-[11px] text-amber-400 font-sans font-bold">Active</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenStripeCheckout("PAID_VIP_SUBSCRIPTION")}
                      className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-sans font-bold text-[11px] shadow cursor-pointer"
                    >
                      Subscribe ($499)
                    </button>
                  )}
                </td>
              </tr>

              <tr className="bg-purple-950/20">
                <td className="py-3 px-3 font-sans font-black text-purple-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Elite Institutional</span>
                </td>
                <td className="py-3 px-3 text-purple-300 font-bold">$2,499 / mo</td>
                <td className="py-3 px-3 text-purple-300 font-bold">-0.02% Maker / 0.05% Taker</td>
                <td className="py-3 px-3 font-sans font-semibold text-purple-200">Dark Pool Crossing DMA</td>
                <td className="py-3 px-3 font-bold text-purple-300">250 req/s</td>
                <td className="py-3 px-3 font-sans text-slate-300">FIX/Binary + Fireblocks</td>
                <td className="py-3 px-3 text-right">
                  {membershipTier === "ELITE_INSTITUTIONAL" ? (
                    <span className="text-[11px] text-purple-400 font-sans font-bold">Active</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenStripeCheckout("ELITE_INSTITUTIONAL")}
                      className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-sans font-bold text-[11px] shadow cursor-pointer"
                    >
                      Subscribe ($2,499)
                    </button>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* STRIPE ELEMENTS CHECKOUT MODAL */}
      <StripeElementsCheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        tier={selectedTier}
        tierName={selectedTierName}
        amountUsd={selectedTierAmount}
        billingCadence={billingCadence}
        customerEmail={user.email}
        customerName={user.name}
        onPaymentSuccess={handlePaymentSuccess}
      />

    </div>
  );
};
