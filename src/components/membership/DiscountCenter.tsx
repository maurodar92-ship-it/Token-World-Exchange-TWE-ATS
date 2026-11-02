import React, { useState } from 'react';
import { 
  Percent, 
  Crown, 
  Sparkles, 
  ArrowUpRight, 
  Check, 
  Copy, 
  CheckCircle2, 
  Calculator, 
  Coins, 
  Download, 
  ExternalLink, 
  ShieldCheck, 
  Zap, 
  Landmark, 
  Activity, 
  X,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { useMembership } from '../../context/MembershipContext';
import { TIER_PLANS, PartnerVoucher } from '../../types/membership';

interface DiscountCenterProps {
  isModal?: boolean;
  onClose?: () => void;
}

export const DiscountCenter: React.FC<DiscountCenterProps> = ({ isModal = false, onClose }) => {
  const { 
    userState, 
    currentPlan, 
    vouchers, 
    claimVoucher, 
    openCheckoutModal,
    recordSimulatedTradeSavings
  } = useMembership();

  // Volume simulation state
  const [tradeVolumeUsd, setTradeVolumeUsd] = useState<number>(500000);
  const [isTakerOrder, setIsTakerOrder] = useState<boolean>(true);
  const [simulationNotification, setSimulationNotification] = useState<string | null>(null);

  // TWE Token purchase simulator state
  const [tweTokenQty, setTweTokenQty] = useState<number>(5000);
  const [tokenPurchaseStatus, setTokenPurchaseStatus] = useState<string | null>(null);

  // Copied voucher state
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Calculations for volume
  const standardFeeRate = isTakerOrder ? 0.0020 : 0.0015; // 0.20% or 0.15%
  const standardFee = tradeVolumeUsd * standardFeeRate;

  const eliteRate = isTakerOrder ? 0.0014 : 0.0010;
  const eliteFee = tradeVolumeUsd * eliteRate;
  const eliteSavings = standardFee - eliteFee;

  const vipRate = isTakerOrder ? 0.0005 : 0.00038;
  const vipFee = tradeVolumeUsd * vipRate;
  const vipSavings = standardFee - vipFee;

  const userCurrentRate = isTakerOrder ? (currentPlan.atsTakerFeePct / 100) : (currentPlan.atsMakerFeePct / 100);
  const userCurrentFee = tradeVolumeUsd * userCurrentRate;
  const userCurrentSavings = standardFee - userCurrentFee;

  // TWE token calculations
  const tweSpotPrice = 1.85;
  const tweDiscountPct = currentPlan.tweTokenDiscountPct;
  const tweEffectivePrice = tweSpotPrice * (1 - tweDiscountPct / 100);
  const tweGrossCost = tweTokenQty * tweSpotPrice;
  const tweNetCost = tweTokenQty * tweEffectivePrice;
  const tweDiscountSavings = tweGrossCost - tweNetCost;

  const handleSimulateExecution = () => {
    recordSimulatedTradeSavings(tradeVolumeUsd, isTakerOrder);
    setSimulationNotification(
      `Executed $${tradeVolumeUsd.toLocaleString()} simulated ATS order. Saved $${userCurrentSavings.toFixed(2)} in trading fees!`
    );
    setTimeout(() => setSimulationNotification(null), 4000);
  };

  const handleSimulateTokenPurchase = () => {
    if (tweDiscountPct === 0) {
      setTokenPurchaseStatus('Upgrade to Elite (5% off) or VIP (15% off) to unlock OTC token discounts.');
    } else {
      recordSimulatedTradeSavings(tweDiscountSavings, false);
      setTokenPurchaseStatus(
        `Acquired ${tweTokenQty.toLocaleString()} TWE at $${tweEffectivePrice.toFixed(4)} OTC rate! Saved $${tweDiscountSavings.toFixed(2)}.`
      );
    }
    setTimeout(() => setTokenPurchaseStatus(null), 4500);
  };

  const handleCopyCode = (voucher: PartnerVoucher) => {
    navigator.clipboard.writeText(voucher.code);
    setCopiedCodeId(voucher.id);
    setTimeout(() => setCopiedCodeId(null), 2500);
  };

  const handleExportSavingsCsv = () => {
    const csvContent = [
      ['Metric', 'Value'],
      ['Member Tier', userState.tier.toUpperCase()],
      ['Billing Term', userState.isLifetime ? 'Lifetime Pass' : userState.billingInterval],
      ['Total Cumulative Fees Saved (USD)', userState.totalSavedFeesUsd.toFixed(2)],
      ['Total ATS Volume Traded (USD)', userState.totalVolumeTradedUsd.toFixed(2)],
      ['Maker Fee Rebate Pct', `${currentPlan.feeRebatePct}%`],
      ['TWE Token OTC Discount Pct', `${currentPlan.tweTokenDiscountPct}%`],
      ['Claimed Partner Vouchers', userState.claimedVoucherIds.join('; ')]
    ].map(e => e.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `TWE_ATS_Savings_Report_${userState.tier}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const containerClasses = isModal 
    ? "relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden text-slate-100 my-auto"
    : "w-full max-w-7xl mx-auto space-y-6 text-slate-100";

  const content = (
    <div className={containerClasses}>
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-amber-950 px-6 py-6 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 via-amber-500 to-indigo-500 flex items-center justify-center text-slate-950 shadow-xl shadow-emerald-950/50">
            <Percent className="w-8 h-8 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
                <Crown className="w-3 h-3" /> Tier Benefits & Rebates Center
              </span>
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700 font-mono">
                Your Status: <strong className="text-emerald-400 uppercase">{userState.tier}</strong>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
              Token World Exchange ATS® Discount Center
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated fee rebates, OTC token purchase discounts, and institutional partner credits.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {userState.tier !== 'vip' && (
            <button
              onClick={() => openCheckoutModal('vip')}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 rounded-xl shadow-lg hover:brightness-110 transition-all"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Upgrade to VIP (75% Rebate)</span>
            </button>
          )}
          {isModal && onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 relative overflow-hidden">
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Fees Saved</div>
            <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
              ${userState.totalSavedFeesUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" /> Across ATS & partner credits
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 relative overflow-hidden">
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">ATS Trading Fee Rebate</div>
            <div className="text-2xl font-black font-mono text-white mt-1 flex items-baseline gap-1.5">
              <span>{currentPlan.feeRebatePct}%</span>
              <span className="text-xs text-emerald-400 font-normal">Rebate Rate</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              Maker: {currentPlan.atsMakerFeePct}% • Taker: {currentPlan.atsTakerFeePct}%
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 relative overflow-hidden">
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">TWE Token OTC Discount</div>
            <div className="text-2xl font-black font-mono text-amber-400 mt-1">
              {currentPlan.tweTokenDiscountPct}% OFF
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Net: ${tweEffectivePrice.toFixed(4)} (Spot: $1.85)
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Audit & Export</div>
              <div className="text-xs text-slate-300 mt-1 font-mono">
                {userState.claimedVoucherIds.length} / {vouchers.length} Vouchers Active
              </div>
            </div>
            <button
              onClick={handleExportSavingsCsv}
              className="mt-2 w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Savings CSV</span>
            </button>
          </div>
        </div>

        {/* Section 1: ATS Maker / Taker Rebate Engine & Interactive Calculator */}
        <div className="p-6 rounded-3xl bg-slate-950/80 border border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-400" />
                <span>Interactive ATS Execution Fee & Rebate Calculator</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulate institutional execution volumes to see real-time cost savings across membership tiers.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setIsTakerOrder(true)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  isTakerOrder ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Taker Order (Market)
              </button>
              <button
                onClick={() => setIsTakerOrder(false)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  !isTakerOrder ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Maker Order (Limit)
              </button>
            </div>
          </div>

          {/* Volume Slider & Input */}
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label htmlFor="volumeSlider" className="text-xs font-semibold text-slate-300">
                Monthly Trading Volume (USD Notional):
              </label>
              <span className="font-mono text-lg font-bold text-emerald-400">
                ${tradeVolumeUsd.toLocaleString()} USD
              </span>
            </div>

            <input
              id="volumeSlider"
              type="range"
              min="50000"
              max="10000000"
              step="50000"
              value={tradeVolumeUsd}
              onChange={(e) => setTradeVolumeUsd(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />

            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>$50k</span>
              <span>$1M</span>
              <span>$5M</span>
              <span>$10M+</span>
            </div>
          </div>

          {/* Comparison Matrix Table */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Free Tier Fee */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase">Free Access</span>
              <div className="text-xs text-slate-500 mt-0.5">Rate: {isTakerOrder ? '0.20%' : '0.15%'}</div>
              <div className="text-2xl font-bold font-mono text-white mt-2">
                ${standardFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Total Fee / Month • 0% Rebate</div>
            </div>

            {/* Elite Tier Fee */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-indigo-500/40 text-center relative">
              <span className="text-xs font-mono font-bold text-indigo-400 uppercase">Elite Member (30% Rebate)</span>
              <div className="text-xs text-slate-400 mt-0.5">Rate: {isTakerOrder ? '0.14%' : '0.10%'}</div>
              <div className="text-2xl font-bold font-mono text-indigo-300 mt-2">
                ${eliteFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-emerald-400 font-mono font-semibold mt-1">
                Saves ${eliteSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mo
              </div>
            </div>

            {/* VIP Tier Fee */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/50 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-bl">
                75% REBATE
              </div>
              <span className="text-xs font-mono font-bold text-amber-400 uppercase">VIP Full Access</span>
              <div className="text-xs text-slate-400 mt-0.5">Rate: {isTakerOrder ? '0.05%' : '0.038%'}</div>
              <div className="text-2xl font-bold font-mono text-amber-300 mt-2">
                ${vipFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-emerald-400 font-mono font-semibold mt-1">
                Saves ${vipSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mo
              </div>
            </div>
          </div>

          {/* Simulation button */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-800">
            <div className="text-xs text-slate-400">
              Your Current Status ({userState.tier.toUpperCase()}): Monthly Fee = <strong className="text-white font-mono">${userCurrentFee.toFixed(2)}</strong> (Net Savings: <strong className="text-emerald-400 font-mono">${userCurrentSavings.toFixed(2)}</strong>)
            </div>

            <button
              onClick={handleSimulateExecution}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/50 transition-all flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>Simulate Trade Execution & Log Savings</span>
            </button>
          </div>

          {simulationNotification && (
            <div className="mt-3 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{simulationNotification}</span>
            </div>
          )}
        </div>

        {/* Section 2: Exclusive TWE Token Purchase Discount Portal */}
        <div className="p-6 rounded-3xl bg-slate-950/80 border border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" />
                <span>Exclusive TWE Token OTC Discount Portal</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Institutional block allocations of TWE tokens at discounted OTC rates directly from the treasury.
              </p>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-400">TWE Token Spot Price</div>
              <div className="text-xl font-bold font-mono text-emerald-400">$1.8500 USD</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                <label htmlFor="tokenQtyInput" className="text-xs font-semibold text-slate-300 block mb-2">
                  Block Purchase Quantity (TWE Tokens):
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="tokenQtyInput"
                    type="number"
                    min="500"
                    max="100000"
                    step="500"
                    value={tweTokenQty}
                    onChange={(e) => setTweTokenQty(Math.max(100, Number(e.target.value)))}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-xs font-mono font-bold text-slate-400">TWE</span>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                  <div className="text-slate-400">Spot Market Value:</div>
                  <div className="text-base font-bold font-mono text-white mt-1">
                    ${tweGrossCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-amber-500/30 text-xs">
                  <div className="text-amber-400">Tier Discount ({tweDiscountPct}%):</div>
                  <div className="text-base font-bold font-mono text-amber-300 mt-1">
                    -${tweDiscountSavings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/30 text-xs">
                  <div className="text-emerald-400">Net OTC Total:</div>
                  <div className="text-base font-bold font-mono text-emerald-400 mt-1">
                    ${tweNetCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            {/* OTC Action Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-amber-400 uppercase">
                  {userState.tier === 'vip' ? '15% VIP OTC Rate' : userState.tier === 'elite' ? '5% Elite OTC Rate' : '0% Discount (Free)'}
                </span>
                <div className="text-xs text-slate-400 mt-1">
                  Effective Price: <strong className="text-white font-mono">${tweEffectivePrice.toFixed(4)}</strong> / TWE
                </div>
                <div className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                  Tokens settle atomically to your connected Web3 address with instant governance and fee staking privileges.
                </div>
              </div>

              <div className="mt-4">
                <button
                  onClick={handleSimulateTokenPurchase}
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center gap-1.5"
                >
                  <Coins className="w-4 h-4" />
                  <span>Execute OTC Block Acquisition</span>
                </button>
              </div>
            </div>
          </div>

          {tokenPurchaseStatus && (
            <div className="mt-4 p-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{tokenPurchaseStatus}</span>
            </div>
          )}
        </div>

        {/* Section 3: Institutional Partner Ecosystem Credits & Vouchers */}
        <div className="p-6 rounded-3xl bg-slate-950/80 border border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <span>Partner Ecosystem API Vouchers & Data Credits</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Exclusive redeemable API keys, data streams, and gas oracle allowances subsidized for TWE members.
              </p>
            </div>
            <div className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20">
              Total Partner Value: $870.00 USD
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {vouchers.map((voucher) => {
              const isEligible = 
                voucher.minTierRequired === 'elite' 
                  ? userState.tier === 'elite' || userState.tier === 'vip'
                  : userState.tier === 'vip';

              return (
                <div 
                  key={voucher.id}
                  className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                    voucher.claimed 
                      ? 'bg-emerald-950/20 border-emerald-500/40' 
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono font-bold text-slate-400">{voucher.partnerName}</span>
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        ${voucher.valueUsd} CREDIT
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white mb-2">{voucher.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">{voucher.description}</p>
                  </div>

                  <div>
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between mb-3 font-mono text-xs">
                      <span className="text-slate-300 font-semibold">{voucher.code}</span>
                      <button
                        onClick={() => handleCopyCode(voucher)}
                        className="p-1 text-slate-400 hover:text-white transition-colors"
                        title="Copy voucher code"
                      >
                        {copiedCodeId === voucher.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase font-mono text-slate-500">
                        Requires: {voucher.minTierRequired.toUpperCase()}
                      </span>
                      {voucher.claimed ? (
                        <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Claimed
                        </span>
                      ) : (
                        <button
                          onClick={() => claimVoucher(voucher.id)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                            isEligible
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          {isEligible ? 'Claim Voucher' : `Unlock with ${voucher.minTierRequired.toUpperCase()}`}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
        {content}
      </div>
    );
  }

  return content;
};
