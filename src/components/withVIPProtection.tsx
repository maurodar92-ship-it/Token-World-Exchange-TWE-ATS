import React, { useState } from "react";
import {
  Lock,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Zap,
  CheckCircle2,
  ExternalLink,
  Key,
  Globe,
  Radio,
  Landmark,
  ChevronDown,
  ChevronUp,
  DollarSign,
} from "lucide-react";
import { useAuth0Membership, AUTH0_NAMESPACE } from "../utils/auth0MembershipContext";
import { AtsMembershipMonetizationPlan } from "./AtsMembershipMonetizationPlan";

interface VIPUpgradePromptProps {
  featureName?: string;
}

export const VIPUpgradePrompt: React.FC<VIPUpgradePromptProps> = ({
  featureName = "High-Performance Institutional Terminal",
}) => {
  const { user, isVIP, upgradeToVIP, loginWithSocial, isLoading } = useAuth0Membership();
  const [showPricingBlueprint, setShowPricingBlueprint] = useState(false);

  return (
    <div className="max-w-4xl mx-auto my-8 p-6 md:p-8 rounded-3xl bg-gradient-to-b from-slate-900 via-[#0e1322] to-slate-950 border border-amber-500/30 shadow-2xl space-y-6 text-center font-sans">
      {/* Icon Badge */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.25)]">
            <Lock className="w-8 h-8" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-indigo-600 border-2 border-slate-950 flex items-center justify-center text-white">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="space-y-2 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold uppercase tracking-wider">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Auth0 Claim Guard &bull; Upgrade Required</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
          PAID_VIP_SUBSCRIPTION Required
        </h2>
        <p className="text-slate-300 text-sm leading-relaxed">
          Access to <strong>{featureName}</strong> is restricted to verified institutional holders with the{" "}
          <code className="text-amber-300 font-mono text-xs px-1.5 py-0.5 rounded bg-black/40 border border-amber-500/20">
            PAID_VIP_SUBSCRIPTION
          </code>{" "}
          Auth0 claim. Free Tier 1 accounts have basic exchange access.
        </p>
      </div>

      {/* User Claims Inspector Box */}
      <div className="max-w-xl mx-auto p-4 rounded-xl bg-slate-950 border border-slate-800 text-left font-mono text-xs space-y-2">
        <div className="flex justify-between items-center text-slate-400 border-b border-slate-800 pb-2">
          <span>Auth0 Token Payload (Current Claims)</span>
          <span className="text-[10px] text-amber-400 font-bold">UNAUTHORIZED TIER</span>
        </div>
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-500">sub:</span>
            <span className="text-slate-300">{user.sub}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">email:</span>
            <span className="text-cyan-300">{user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">{AUTH0_NAMESPACE}/membership_tier:</span>
            <span className="text-amber-400 font-bold">{user.app_metadata.membership_tier}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">{AUTH0_NAMESPACE}/ats_account_status:</span>
            <span className="text-emerald-400">{user.app_metadata.ats_account_status}</span>
          </div>
        </div>
      </div>

      {/* VIP Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-2xl mx-auto text-left text-xs">
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
          <div className="text-white font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>L3 Institutional Book</span>
          </div>
          <div className="text-slate-400 text-[11px]">Sub-millisecond price-time priority matching engine.</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
          <div className="text-white font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Advanced OCO Triggers</span>
          </div>
          <div className="text-slate-400 text-[11px]">One-Cancels-the-Other stop loss &amp; take profit orders.</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
          <div className="text-white font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>0% Taker Fees</span>
          </div>
          <div className="text-slate-400 text-[11px]">Direct market access with institutional routing rebate.</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => upgradeToVIP("auth0_instant_upgrade")}
          disabled={isLoading}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
        >
          <Zap className="w-4 h-4 text-black" />
          <span>{isLoading ? "Provisioning VIP Claim..." : "⚡ Upgrade to PAID_VIP_SUBSCRIPTION"}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowPricingBlueprint((prev) => !prev)}
          className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-bold flex items-center justify-center gap-2 border border-amber-500/30 transition-colors cursor-pointer"
        >
          <Landmark className="w-4 h-4 text-amber-400" />
          <span>
            {showPricingBlueprint ? "Hide Pricing Blueprint" : "View 4-Tier Pricing & ROI ($499 VIP / $2,499 Elite)"}
          </span>
          {showPricingBlueprint ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        <button
          type="button"
          onClick={() => loginWithSocial("google")}
          className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition-colors cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <span>Re-authenticate</span>
        </button>
      </div>

      {/* Expandable 4-Tier Membership Blueprint & ROI Calculator */}
      {showPricingBlueprint && (
        <div className="pt-6 border-t border-slate-800 text-left animate-fadeIn">
          <AtsMembershipMonetizationPlan />
        </div>
      )}
    </div>
  );
};

/**
 * Higher-Order Component (HOC) wrapping components with Auth0 VIP Claim Protection
 */
export function withVIPProtection<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  featureName: string = "Institutional Module"
): React.FC<P> {
  const VIPProtectedComponent: React.FC<P> = (props: P) => {
    const { isVIP } = useAuth0Membership();

    if (!isVIP) {
      return <VIPUpgradePrompt featureName={featureName} />;
    }

    return <WrappedComponent {...props} />;
  };

  VIPProtectedComponent.displayName = `withVIPProtection(${WrappedComponent.displayName || WrappedComponent.name || "Component"})`;
  return VIPProtectedComponent;
}

/**
 * Protective Guard component for JSX wrapper usage
 */
export const VIPProtectionGuard: React.FC<{
  children: React.ReactNode;
  featureName?: string;
}> = ({ children, featureName = "Institutional Trading Suite" }) => {
  const { isVIP } = useAuth0Membership();

  if (!isVIP) {
    return <VIPUpgradePrompt featureName={featureName} />;
  }

  return <>{children}</>;
};
