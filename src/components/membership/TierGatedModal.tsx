import React from 'react';
import { 
  ShieldAlert, 
  Sparkles, 
  Crown, 
  Check, 
  ArrowRight, 
  X, 
  Lock, 
  ShieldCheck,
  Scale
} from 'lucide-react';
import { useMembership } from '../../context/MembershipContext';
import { TIER_PLANS } from '../../types/membership';

export const TierGatedModal: React.FC = () => {
  const { 
    isGatedModalOpen, 
    closeGatedModal, 
    gatedFeatureInfo, 
    openCheckoutModal,
    userState 
  } = useMembership();

  if (!isGatedModalOpen || !gatedFeatureInfo) return null;

  const requiredPlan = TIER_PLANS[gatedFeatureInfo.requiredTier];
  const isVipRequired = gatedFeatureInfo.requiredTier === 'vip';

  const handleUpgrade = () => {
    closeGatedModal();
    openCheckoutModal(gatedFeatureInfo.requiredTier);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Top Decorative Header Accent */}
        <div className={`h-2.5 w-full bg-gradient-to-r ${isVipRequired ? 'from-amber-500 via-emerald-500 to-indigo-600' : 'from-indigo-500 via-emerald-500 to-teal-400'}`} />

        <div className="p-6">
          {/* Close Button */}
          <button
            onClick={closeGatedModal}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header Badge & Title */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isVipRequired ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'}`}>
              {isVipRequired ? <Crown className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold tracking-wider uppercase border ${isVipRequired ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'}`}>
                  {requiredPlan.badgeLabel} REQUIRED
                </span>
                <span className="text-xs text-slate-400">Current: {userState.tier.toUpperCase()}</span>
              </div>
              <h3 className="text-xl font-bold text-white mt-1">
                {gatedFeatureInfo.featureName}
              </h3>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-slate-300 leading-relaxed mb-5 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            {gatedFeatureInfo.description}
          </p>

          {/* Key Tier Benefits list */}
          <div className="space-y-2 mb-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Unlocks with {requiredPlan.name}:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {requiredPlan.features.slice(1, 5).map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-200 bg-slate-800/60 p-2 rounded-lg border border-slate-700/50">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Summary Strip */}
          <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-slate-950 to-slate-900 rounded-xl border border-slate-800 mb-6">
            <div>
              <div className="text-xs text-slate-400">Subscription starts at</div>
              <div className="text-xl font-bold text-emerald-400 font-mono">
                ${requiredPlan.monthlyPriceUsd}<span className="text-xs text-slate-400 font-normal">/mo</span>
                <span className="text-xs text-slate-400 ml-2 font-normal font-sans">or ${requiredPlan.lifetimePriceUsd} lifetime pass</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded font-mono">
                {requiredPlan.feeRebatePct}% Fee Rebate
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={closeGatedModal}
              className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpgrade}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl text-white shadow-lg transition-all ${
                isVipRequired
                  ? 'bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 shadow-amber-950/50'
                  : 'bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 shadow-indigo-950/50'
              }`}
            >
              <span>Upgrade to {requiredPlan.name}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
