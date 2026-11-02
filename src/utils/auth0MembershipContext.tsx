import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export const AUTH0_NAMESPACE = "https://tokenworldexchange.com/claims";

export type MembershipTier =
  | "STANDARD"
  | "FREE_TIER_1"
  | "PAID_VIP_SUBSCRIPTION"
  | "ELITE_INSTITUTIONAL";

export interface VipTierBenefit {
  tier: MembershipTier;
  label: string;
  badgeColor: string;
  qualification: string;
  makerTakerFee: string;
  securityAndFeatures: string[];
  rateLimitReqSec: number;
  darkPoolAccess: boolean;
}

export const VIP_TIER_MATRIX: Record<MembershipTier, VipTierBenefit> = {
  STANDARD: {
    tier: "STANDARD",
    label: "Standard Member",
    badgeColor: "bg-slate-800 text-slate-300 border-slate-700",
    qualification: "Default Registration",
    makerTakerFee: "0.10% / 0.15% (Baseline)",
    securityAndFeatures: [
      "Standard OAuth 2.0 / OIDC Login",
      "Two-Factor Authentication (SMS/TOTP)",
      "Standard API Gateway (10 req/s)",
      "Public Order Book Access",
    ],
    rateLimitReqSec: 10,
    darkPoolAccess: false,
  },
  FREE_TIER_1: {
    tier: "FREE_TIER_1",
    label: "Tier 1 Member",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    qualification: "$1,000 Volume or 500 ATS",
    makerTakerFee: "10% Fee Discount (0.09% / 0.135%)",
    securityAndFeatures: [
      "FIDO2 / WebAuthn Hardware Key Support (YubiKey)",
      "Advanced Charting Tools & Technical Indicators",
      "Priority Customer Support Queue",
      "Standard API Gateway (15 req/s)",
    ],
    rateLimitReqSec: 15,
    darkPoolAccess: false,
  },
  PAID_VIP_SUBSCRIPTION: {
    tier: "PAID_VIP_SUBSCRIPTION",
    label: "VIP Subscription",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.25)]",
    qualification: "$50k Volume or 5,000 ATS Holdings",
    makerTakerFee: "30% Fee Discount (0.07% / 0.105%)",
    securityAndFeatures: [
      "Full Institutional L3 Order Book & OCO Triggers",
      "Dedicated Sub-accounts & Master Account API Keys",
      "Priority API Gateway (50 req/s)",
      "Institutional Sandbox Access (TW-DEMO)",
      "Dark Pool Execution Routing Access",
    ],
    rateLimitReqSec: 50,
    darkPoolAccess: true,
  },
  ELITE_INSTITUTIONAL: {
    tier: "ELITE_INSTITUTIONAL",
    label: "Elite Institutional",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.3)]",
    qualification: "Institutional KYC / Custom Direct Clearing",
    makerTakerFee: "Custom Rebate Structure (Negative Maker Fees)",
    securityAndFeatures: [
      "Dedicated Executive Account Manager",
      "Institutional ATS Dark Pool Liquidity Routing",
      "Custom IP Whitelisting & VPN Tunneling",
      "Zero-latency Co-location FIX/Binary API",
      "Custodial Segregation (Fireblocks / Anchorage)",
    ],
    rateLimitReqSec: 250,
    darkPoolAccess: true,
  },
};

export interface AdminAuditLog {
  id: string;
  timestampUtc: string;
  adminUserId: string;
  actionType: string;
  targetEntity: string;
  reason: string;
  requiresTwoManRule: boolean;
  twoManStatus: "APPROVED" | "PENDING_SECOND_OFFICER" | "NOT_REQUIRED";
}

export interface Auth0AppMetadata {
  membership_tier: MembershipTier;
  ats_account_status: "ACTIVE" | "SUSPENDED";
  roles: string[];
  vip_upgraded_at?: string;
  connected_provider?: string;
  web3_wallet_address?: string;
  web3_signature_verified?: boolean;
  step_up_webauthn_active?: boolean;
  adaptive_risk_score?: number;
}

export interface Auth0UserProfile {
  sub: string;
  name: string;
  email: string;
  picture?: string;
  app_metadata: Auth0AppMetadata;
}

interface Auth0MembershipContextType {
  user: Auth0UserProfile;
  membershipTier: MembershipTier;
  isVIP: boolean;
  loginWithSocial: (provider: "google" | "github" | "apple" | "twitter") => void;
  upgradeToVIP: (paymentRef?: string) => Promise<void>;
  setMembershipTier: (tier: MembershipTier) => void;
  downgradeToFree: () => void;
  getCustomClaims: () => Record<string, any>;
  isLoading: boolean;
  verifyWeb3Signature: (address: string) => Promise<boolean>;
  verifyStepUpHardwareKey: () => Promise<boolean>;
  auditLogs: AdminAuditLog[];
  recordAdminAuditAction: (
    actionType: string,
    targetEntity: string,
    reason: string,
    requiresTwoManRule?: boolean
  ) => void;
}

const STORAGE_KEY = "tokenworld_auth0_user_v1";
const AUDIT_LOG_STORAGE_KEY = "tokenworld_admin_audit_logs_v1";

const DEFAULT_USER: Auth0UserProfile = {
  sub: "google-oauth2|1043999305701849102",
  name: "Mauro L. Dar III (Verified Member)",
  email: "maurodar08@gmail.com",
  picture: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
  app_metadata: {
    membership_tier: "FREE_TIER_1",
    ats_account_status: "ACTIVE",
    roles: ["MEMBER"],
    connected_provider: "google",
    web3_wallet_address: "0x70Ac9Bb89d5C3d4a47D5cd11B108Fea9ad4E94f0",
    web3_signature_verified: true,
    step_up_webauthn_active: true,
    adaptive_risk_score: 8, // Low risk (< 20)
  },
};

const INITIAL_AUDIT_LOGS: AdminAuditLog[] = [
  {
    id: "AUD-9012",
    timestampUtc: new Date(Date.now() - 3600000).toISOString(),
    adminUserId: "ADMIN-OP-01 (Mauro L. Dar III)",
    actionType: "TIER_ELEVATION",
    targetEntity: "maurodar08@gmail.com",
    reason: "Sovereign Principal Initial Setup & Form ATS Verification",
    requiresTwoManRule: false,
    twoManStatus: "NOT_REQUIRED",
  },
  {
    id: "AUD-9011",
    timestampUtc: new Date(Date.now() - 7200000).toISOString(),
    adminUserId: "SYSTEM-AUTOMATION-CAT",
    actionType: "CIRCUIT_BREAKER_RESET",
    targetEntity: "CLOB-ENGINE-TREE3",
    reason: "Pre-Trade SEC Rule 15c3-5 Price Collar Volatility Boundary Check",
    requiresTwoManRule: true,
    twoManStatus: "APPROVED",
  },
];

const Auth0MembershipContext = createContext<Auth0MembershipContextType | undefined>(undefined);

export const Auth0MembershipProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Auth0UserProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Could not load Auth0 user from localStorage", e);
    }
    return DEFAULT_USER;
  });

  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>(() => {
    try {
      const saved = localStorage.getItem(AUDIT_LOG_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Could not load audit logs from localStorage", e);
    }
    return INITIAL_AUDIT_LOGS;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.warn("Could not save Auth0 user to localStorage", e);
    }
  }, [user]);

  useEffect(() => {
    try {
      localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(auditLogs));
    } catch (e) {
      console.warn("Could not save audit logs to localStorage", e);
    }
  }, [auditLogs]);

  const membershipTier = user.app_metadata.membership_tier;
  const isVIP =
    membershipTier === "PAID_VIP_SUBSCRIPTION" || membershipTier === "ELITE_INSTITUTIONAL";

  const loginWithSocial = (provider: "google" | "github" | "apple" | "twitter") => {
    setIsLoading(true);
    setTimeout(() => {
      setUser((prev) => ({
        ...prev,
        app_metadata: {
          ...prev.app_metadata,
          connected_provider: provider,
        },
      }));
      setIsLoading(false);
    }, 500);
  };

  const setMembershipTier = (tier: MembershipTier) => {
    setUser((prev) => ({
      ...prev,
      app_metadata: {
        ...prev.app_metadata,
        membership_tier: tier,
        vip_upgraded_at:
          tier === "PAID_VIP_SUBSCRIPTION" || tier === "ELITE_INSTITUTIONAL"
            ? new Date().toISOString()
            : prev.app_metadata.vip_upgraded_at,
        roles:
          tier === "ELITE_INSTITUTIONAL"
            ? ["MEMBER", "VIP_TRADER", "INSTITUTIONAL_DMA", "ELITE_CLEARING"]
            : tier === "PAID_VIP_SUBSCRIPTION"
            ? ["MEMBER", "VIP_TRADER", "INSTITUTIONAL_DMA"]
            : ["MEMBER"],
      },
    }));
  };

  const upgradeToVIP = async (paymentRef: string = "manual_upgrade") => {
    setIsLoading(true);
    try {
      await fetch("/api/auth0/upgrade-vip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.sub, paymentRef }),
      }).catch(() => null);

      setMembershipTier("PAID_VIP_SUBSCRIPTION");
    } finally {
      setIsLoading(false);
    }
  };

  const downgradeToFree = () => {
    setMembershipTier("FREE_TIER_1");
  };

  const verifyWeb3Signature = async (address: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      await new Promise((res) => setTimeout(res, 600));
      setUser((prev) => ({
        ...prev,
        app_metadata: {
          ...prev.app_metadata,
          web3_wallet_address: address,
          web3_signature_verified: true,
        },
      }));
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyStepUpHardwareKey = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      await new Promise((res) => setTimeout(res, 800));
      setUser((prev) => ({
        ...prev,
        app_metadata: {
          ...prev.app_metadata,
          step_up_webauthn_active: true,
        },
      }));
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const recordAdminAuditAction = (
    actionType: string,
    targetEntity: string,
    reason: string,
    requiresTwoManRule: boolean = false
  ) => {
    const newLog: AdminAuditLog = {
      id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
      timestampUtc: new Date().toISOString(),
      adminUserId: `ADMIN-OP-${user.sub.slice(-4)}`,
      actionType,
      targetEntity,
      reason,
      requiresTwoManRule,
      twoManStatus: requiresTwoManRule ? "PENDING_SECOND_OFFICER" : "NOT_REQUIRED",
    };
    setAuditLogs((prev) => [newLog, ...prev.slice(0, 49)]);
  };

  const getCustomClaims = () => {
    return {
      sub: user.sub,
      email: user.email,
      [`${AUTH0_NAMESPACE}/membership_tier`]: user.app_metadata.membership_tier,
      [`${AUTH0_NAMESPACE}/ats_account_status`]: user.app_metadata.ats_account_status,
      [`${AUTH0_NAMESPACE}/roles`]: user.app_metadata.roles,
      [`${AUTH0_NAMESPACE}/connected_provider`]: user.app_metadata.connected_provider,
      [`${AUTH0_NAMESPACE}/web3_signature_verified`]: user.app_metadata.web3_signature_verified,
      [`${AUTH0_NAMESPACE}/step_up_webauthn_active`]: user.app_metadata.step_up_webauthn_active,
    };
  };

  return (
    <Auth0MembershipContext.Provider
      value={{
        user,
        membershipTier,
        isVIP,
        loginWithSocial,
        upgradeToVIP,
        setMembershipTier,
        downgradeToFree,
        getCustomClaims,
        isLoading,
        verifyWeb3Signature,
        verifyStepUpHardwareKey,
        auditLogs,
        recordAdminAuditAction,
      }}
    >
      {children}
    </Auth0MembershipContext.Provider>
  );
};

export const useAuth0Membership = (): Auth0MembershipContextType => {
  const context = useContext(Auth0MembershipContext);
  if (!context) {
    const isSavedVip =
      localStorage.getItem(STORAGE_KEY)?.includes("PAID_VIP_SUBSCRIPTION") ||
      localStorage.getItem(STORAGE_KEY)?.includes("ELITE_INSTITUTIONAL") ||
      false;
    return {
      user: DEFAULT_USER,
      membershipTier: isSavedVip ? "PAID_VIP_SUBSCRIPTION" : "FREE_TIER_1",
      isVIP: isSavedVip,
      loginWithSocial: () => {},
      upgradeToVIP: async () => {},
      setMembershipTier: () => {},
      downgradeToFree: () => {},
      getCustomClaims: () => ({}),
      isLoading: false,
      verifyWeb3Signature: async () => true,
      verifyStepUpHardwareKey: async () => true,
      auditLogs: INITIAL_AUDIT_LOGS,
      recordAdminAuditAction: () => {},
    };
  }
  return context;
};
