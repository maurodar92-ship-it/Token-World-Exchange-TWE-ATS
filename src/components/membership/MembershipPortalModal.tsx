import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Crown, 
  Sparkles, 
  ShieldCheck, 
  ShieldAlert, 
  CreditCard, 
  Coins, 
  ArrowRight, 
  FileText, 
  CheckCircle2, 
  Percent, 
  ExternalLink,
  Receipt,
  Download,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useMembership } from '../../context/MembershipContext';
import { 
  MembershipTier, 
  BillingInterval, 
  PaymentMethodType, 
  TIER_PLANS 
} from '../../types/membership';

export const MembershipPortalModal: React.FC = () => {
  const { 
    isCheckoutModalOpen, 
    closeCheckoutModal, 
    userState, 
    setTier,
    preselectedTier,
    openDiscountCenter
  } = useMembership();

  const [selectedTier, setSelectedTier] = useState<MembershipTier>(preselectedTier || 'elite');
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('crypto_usdc');
  const [activeStep, setActiveStep] = useState<'plans' | 'checkout' | 'success'>('plans');
  const [activeTab, setActiveTab] = useState<'select' | 'receipts'>('select');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastReceiptId, setLastReceiptId] = useState<string | null>(null);

  if (!isCheckoutModalOpen) return null;

  const currentPlan = TIER_PLANS[selectedTier];

  const getTierPrice = (tier: MembershipTier) => {
    const plan = TIER_PLANS[tier];
    if (tier === 'free') return 0;
    if (billingInterval === 'monthly') return plan.monthlyPriceUsd;
    if (billingInterval === 'annual') return plan.annualPriceUsd;
    return plan.lifetimePriceUsd;
  };

  const handleStartCheckout = (tier: MembershipTier) => {
    setSelectedTier(tier);
    if (tier === 'free') {
      setTier('free');
      setActiveStep('success');
      return;
    }
    setActiveStep('checkout');
  };

  const handleExecutePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setTier(selectedTier, billingInterval, paymentMethod);
      setIsProcessing(false);
      setActiveStep('success');
      setLastReceiptId(userState.receipts[0]?.id || `rcpt_${Date.now()}`);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden text-slate-100 my-auto">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 px-6 py-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-amber-500 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-950">
              <Crown className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  SEC/FINRA ATS Access Gateway
                </span>
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700">
                  Current Tier: <strong className="text-emerald-400 font-mono uppercase">{userState.tier}</strong>
                </span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Token World Exchange ATS® Tier Membership
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                closeCheckoutModal();
                openDiscountCenter();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 rounded-xl transition-all"
            >
              <Percent className="w-3.5 h-3.5" />
              <span>Discount Center</span>
            </button>
            <button
              onClick={closeCheckoutModal}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-navigation tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6">
          <button
            onClick={() => { setActiveTab('select'); setActiveStep('plans'); }}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'select'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>Membership Plans & Upgrades</span>
          </button>
          <button
            onClick={() => setActiveTab('receipts')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'receipts'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Billing & Invoices History ({userState.receipts.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {activeTab === 'receipts' ? (
            /* Receipts View */
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Membership Invoices & Digital Certificates</h3>
                  <p className="text-xs text-slate-400">Institutional record of paid subscriptions, atomic settlement hashes, and tier proofs.</p>
                </div>
                <div className="text-right font-mono text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                  Total Fees Saved: ${userState.totalSavedFeesUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>

              {userState.receipts.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
                  <Receipt className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">No paid invoices recorded yet.</p>
                  <p className="text-xs text-slate-500 mt-1">Upgrade to Elite or VIP Full Access to generate institutional audit receipts.</p>
                  <button
                    onClick={() => { setActiveTab('select'); setActiveStep('plans'); }}
                    className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded-xl"
                  >
                    View Membership Tiers
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
                  {userState.receipts.map(rcpt => (
                    <div key={rcpt.id} className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-800/40 transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-white">{rcpt.invoiceNumber}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase font-mono font-semibold">
                            {rcpt.tier} • {rcpt.billingInterval}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          Date: {new Date(rcpt.timestamp).toLocaleDateString()} {new Date(rcpt.timestamp).toLocaleTimeString()} • Method: {rcpt.paymentMethod}
                        </div>
                        <div className="text-xs font-mono text-slate-500 mt-0.5 truncate max-w-md">
                          TxHash: {rcpt.txHash}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-bold font-mono text-white">
                          ${rcpt.amountUsd.toFixed(2)} USD
                        </div>
                        <div className="flex items-center gap-2 mt-1 justify-end">
                          <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeStep === 'plans' ? (
            /* Plans View */
            <div>
              {/* Billing Interval Toggle */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                    Select Billing Structure
                  </span>
                  <span className="text-xs text-slate-500">
                    Choose recurring terms or one-time lifetime institutional pass.
                  </span>
                </div>

                <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-700/60">
                  <button
                    onClick={() => setBillingInterval('monthly')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      billingInterval === 'monthly'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingInterval('annual')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                      billingInterval === 'annual'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Annual</span>
                    <span className="text-[10px] bg-amber-400 text-slate-950 font-bold px-1.5 py-0.2 rounded-full">
                      Save 17%
                    </span>
                  </button>
                  <button
                    onClick={() => setBillingInterval('lifetime')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                      billingInterval === 'lifetime'
                        ? 'bg-gradient-to-r from-amber-500 to-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>Lifetime Pass</span>
                  </button>
                </div>
              </div>

              {/* Tiers Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Free Tier */}
                <div className={`rounded-2xl p-5 border flex flex-col justify-between transition-all ${
                  userState.tier === 'free' 
                    ? 'border-slate-600 bg-slate-800/40 shadow-inner' 
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                }`}>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        PUBLIC FREE
                      </span>
                      {userState.tier === 'free' && (
                        <span className="text-xs text-slate-400 font-semibold">Active Plan</span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-white">Free Access</h3>
                    <p className="text-xs text-slate-400 mt-1 mb-4">
                      Public disclosure surveillance & community order book viewing.
                    </p>

                    <div className="mb-4 pb-4 border-b border-slate-800">
                      <div className="text-3xl font-black font-mono text-white">$0</div>
                      <div className="text-xs text-slate-500">Free forever • No credit card</div>
                    </div>

                    <div className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wider">Trading Fees:</div>
                    <div className="text-xs font-mono text-slate-300 mb-4 bg-slate-900 p-2 rounded-lg border border-slate-800">
                      Maker: 0.15% • Taker: 0.20% (0% rebate)
                    </div>

                    <div className="space-y-2 mb-6">
                      {TIER_PLANS.free.features.map((f, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <Check className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    disabled={userState.tier === 'free'}
                    onClick={() => handleStartCheckout('free')}
                    className={`w-full py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      userState.tier === 'free'
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                    }`}
                  >
                    {userState.tier === 'free' ? 'Current Access' : 'Downgrade to Free'}
                  </button>
                </div>

                {/* Elite Tier */}
                <div className={`rounded-2xl p-5 border flex flex-col justify-between transition-all relative ${
                  userState.tier === 'elite' 
                    ? 'border-indigo-500/80 bg-indigo-950/20 shadow-xl shadow-indigo-950/40 ring-2 ring-indigo-500/30' 
                    : 'border-indigo-500/30 bg-slate-950/60 hover:border-indigo-500/60'
                }`}>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white font-bold text-[10px] tracking-wider uppercase px-3 py-0.5 rounded-full shadow-md">
                    Most Popular for Traders
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3 mt-1">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        ELITE MEMBER ★
                      </span>
                      {userState.tier === 'elite' && (
                        <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-white">Elite Tier</h3>
                    <p className="text-xs text-slate-400 mt-1 mb-4">
                      AI MD&A tone analysis, risk heatmaps, and 30% ATS fee rebates.
                    </p>

                    <div className="mb-4 pb-4 border-b border-slate-800">
                      <div className="text-3xl font-black font-mono text-emerald-400">
                        ${getTierPrice('elite')}
                        <span className="text-xs text-slate-400 font-normal ml-1 font-sans">
                          {billingInterval === 'monthly' ? '/month' : billingInterval === 'annual' ? '/year' : 'one-time'}
                        </span>
                      </div>
                      <div className="text-xs text-emerald-400/80 font-mono">
                        {billingInterval === 'annual' ? 'Billed annually ($82.50/mo equiv.)' : billingInterval === 'lifetime' ? 'Lifetime single payment pass' : 'Billed monthly, cancel anytime'}
                      </div>
                    </div>

                    <div className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wider">Trading Fees & Rebates:</div>
                    <div className="text-xs font-mono text-emerald-300 mb-4 bg-slate-900 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                      <span>Maker: 0.10% • Taker: 0.14%</span>
                      <span className="bg-emerald-500/20 px-1.5 py-0.5 rounded text-[11px] text-emerald-300 font-bold">30% Rebate</span>
                    </div>

                    <div className="space-y-2 mb-6">
                      {TIER_PLANS.elite.features.map((f, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-200">
                          <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleStartCheckout('elite')}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg ${
                      userState.tier === 'elite'
                        ? 'bg-indigo-600/40 text-indigo-300 border border-indigo-500/50 hover:bg-indigo-600/60'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/50'
                    }`}
                  >
                    {userState.tier === 'elite' ? 'Renew / Modify Elite' : 'Select Elite Tier'}
                  </button>
                </div>

                {/* VIP Full Access */}
                <div className={`rounded-2xl p-5 border flex flex-col justify-between transition-all relative ${
                  userState.tier === 'vip' 
                    ? 'border-amber-500/80 bg-amber-950/20 shadow-xl shadow-amber-950/40 ring-2 ring-amber-500/30' 
                    : 'border-amber-500/30 bg-slate-950/60 hover:border-amber-500/60'
                }`}>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 font-black text-[10px] tracking-wider uppercase px-3 py-0.5 rounded-full shadow-md">
                    Institutional Power
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3 mt-1">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <Crown className="w-3 h-3" /> VIP FULL ACCESS ♦
                      </span>
                      {userState.tier === 'vip' && (
                        <span className="text-xs text-amber-400 font-semibold flex items-center gap-1 font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-white">VIP Full Access</h3>
                    <p className="text-xs text-slate-400 mt-1 mb-4">
                      Dark pool liquidity, Smart Order Routing (SOR), atomic settlement, & 75% fee rebates.
                    </p>

                    <div className="mb-4 pb-4 border-b border-slate-800">
                      <div className="text-3xl font-black font-mono text-amber-400">
                        ${getTierPrice('vip')}
                        <span className="text-xs text-slate-400 font-normal ml-1 font-sans">
                          {billingInterval === 'monthly' ? '/month' : billingInterval === 'annual' ? '/year' : 'one-time'}
                        </span>
                      </div>
                      <div className="text-xs text-amber-400/80 font-mono">
                        {billingInterval === 'annual' ? 'Billed annually ($249.16/mo equiv.)' : billingInterval === 'lifetime' ? 'Lifetime single payment pass' : 'Billed monthly, cancel anytime'}
                      </div>
                    </div>

                    <div className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wider">Trading Fees & Rebates:</div>
                    <div className="text-xs font-mono text-amber-300 mb-4 bg-slate-900 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                      <span>Maker: 0.038% • Taker: 0.05%</span>
                      <span className="bg-amber-500/20 px-1.5 py-0.5 rounded text-[11px] text-amber-300 font-bold">75% Rebate</span>
                    </div>

                    <div className="space-y-2 mb-6">
                      {TIER_PLANS.vip.features.map((f, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-200">
                          <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleStartCheckout('vip')}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg ${
                      userState.tier === 'vip'
                        ? 'bg-amber-600/40 text-amber-300 border border-amber-500/50 hover:bg-amber-600/60'
                        : 'bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white shadow-amber-950/50'
                    }`}
                  >
                    {userState.tier === 'vip' ? 'Manage VIP Membership' : 'Select VIP Full Access'}
                  </button>
                </div>
              </div>

              {/* Exclusion Notice Banner */}
              <div className="mt-6 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-3">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-400 leading-relaxed">
                  <strong className="text-slate-300">Executive & Administration Security Notice:</strong> All member tiers (Free, Elite, and VIP Full Access) provide market participation, liquidity routing, and algorithmic analysis privileges. Administrative superuser controls, smart contract owner keys, and regulatory filing dispatch master keys are strictly partitioned and exclusively reserved for System Owner <strong className="text-slate-200">Mauro Lomibao Dar III</strong>.
                </div>
              </div>
            </div>
          ) : activeStep === 'checkout' ? (
            /* Checkout View */
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="border border-slate-800 rounded-2xl p-5 bg-slate-950/60">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Upgrading to:</span>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      {currentPlan.name}
                      <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                        {billingInterval.toUpperCase()}
                      </span>
                    </h3>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black font-mono text-emerald-400">
                      ${getTierPrice(selectedTier)} USD
                    </div>
                    <div className="text-xs text-slate-500">
                      {billingInterval === 'lifetime' ? 'Single One-Time Payment' : `Recurring ${billingInterval}`}
                    </div>
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div className="mt-5 space-y-3">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Select Payment Gateway:
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('crypto_usdc')}
                      className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                        paymentMethod === 'crypto_usdc'
                          ? 'border-emerald-500 bg-emerald-950/20 text-white ring-1 ring-emerald-500'
                          : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <Coins className="w-5 h-5 text-emerald-400" />
                      <div>
                        <div className="text-xs font-bold">USD Coin (USDC)</div>
                        <div className="text-[10px] text-slate-400 font-mono">EVM / Polygon / Arbitrum</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('crypto_twe')}
                      className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                        paymentMethod === 'crypto_twe'
                          ? 'border-amber-500 bg-amber-950/20 text-white ring-1 ring-amber-500'
                          : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <Sparkles className="w-5 h-5 text-amber-400" />
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1">
                          <span>TWE Native Token</span>
                          <span className="text-[9px] bg-amber-500 text-slate-950 font-bold px-1 rounded">5% Off</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">Atomic T+0 settlement</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('fiat_card')}
                      className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                        paymentMethod === 'fiat_card'
                          ? 'border-indigo-500 bg-indigo-950/20 text-white ring-1 ring-indigo-500'
                          : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 text-indigo-400" />
                      <div>
                        <div className="text-xs font-bold">Corporate Credit Card</div>
                        <div className="text-[10px] text-slate-400">Visa, MasterCard, Amex</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('fiat_wire')}
                      className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                        paymentMethod === 'fiat_wire'
                          ? 'border-cyan-500 bg-cyan-950/20 text-white ring-1 ring-cyan-500'
                          : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <FileText className="w-5 h-5 text-cyan-400" />
                      <div>
                        <div className="text-xs font-bold">Institutional Fedwire</div>
                        <div className="text-[10px] text-slate-400">Same-Day RTGS Clearance</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Order Summary details */}
                <div className="mt-5 p-3.5 bg-slate-900 rounded-xl border border-slate-800 text-xs space-y-2">
                  <div className="flex justify-between text-slate-400">
                    <span>Base Tier Subscription:</span>
                    <span className="font-mono text-white">${getTierPrice(selectedTier)}.00 USD</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>ATS Network Settlement Gas:</span>
                    <span className="font-mono text-emerald-400">$0.00 (Subsidized)</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Estimated Monthly Fee Savings:</span>
                    <span className="font-mono text-emerald-400">
                      ~${selectedTier === 'vip' ? '2,450.00' : '650.00'} / mo
                    </span>
                  </div>
                  <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-sm text-white">
                    <span>Total Due Now:</span>
                    <span className="font-mono text-emerald-400">${getTierPrice(selectedTier)}.00 USD</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setActiveStep('plans')}
                  className="px-4 py-2.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Back to Plans
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleExecutePayment}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white shadow-xl shadow-emerald-950/50 transition-all disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verifying On-Chain Clearance...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm & Activate {currentPlan.name}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Success View */
            <div className="max-w-xl mx-auto text-center py-8">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-white">Membership Tier Active!</h3>
              <p className="text-sm text-slate-300 mt-2">
                Your account is now authenticated with <strong className="text-emerald-400 uppercase font-mono">{userState.tier}</strong> privileges.
              </p>

              <div className="my-6 p-4 bg-slate-950 rounded-2xl border border-slate-800 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Membership Tier:</span>
                  <span className="font-mono font-bold text-white">{currentPlan.badgeLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Billing Term:</span>
                  <span className="font-mono text-emerald-400">
                    {userState.isLifetime ? 'Lifetime One-Time Pass' : `${userState.billingInterval.toUpperCase()} Subscription`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ATS Fee Rebate Rate:</span>
                  <span className="font-mono text-emerald-400">{currentPlan.feeRebatePct}% Maker/Taker Discount</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">TWE Token OTC Discount:</span>
                  <span className="font-mono text-amber-400">{currentPlan.tweTokenDiscountPct}% Off Block Orders</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    closeCheckoutModal();
                    openDiscountCenter();
                  }}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-2"
                >
                  <Percent className="w-4 h-4" />
                  <span>Open Discount Center</span>
                </button>
                <button
                  onClick={closeCheckoutModal}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all"
                >
                  Return to Terminal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
