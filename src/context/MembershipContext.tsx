import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  MembershipTier, 
  BillingInterval, 
  PaymentMethodType, 
  UserMembershipState, 
  TierPricingPlan, 
  TIER_PLANS, 
  PartnerVoucher, 
  INITIAL_PARTNER_VOUCHERS, 
  MembershipTransactionReceipt 
} from '../types/membership';

interface GatedFeatureInfo {
  featureName: string;
  requiredTier: MembershipTier;
  description: string;
}

interface MembershipContextType {
  userState: UserMembershipState;
  currentPlan: TierPricingPlan;
  vouchers: PartnerVoucher[];
  setTier: (tier: MembershipTier, interval?: BillingInterval, paymentMethod?: PaymentMethodType) => void;
  claimVoucher: (voucherId: string) => boolean;
  calculateFeeWithRebate: (notionalAmountUsd: number, isTaker?: boolean) => { standardFee: number; netFee: number; savings: number };
  recordSimulatedTradeSavings: (tradeVolumeUsd: number, isTaker?: boolean) => void;
  // Modal states
  isCheckoutModalOpen: boolean;
  preselectedTier: MembershipTier;
  openCheckoutModal: (targetTier?: MembershipTier) => void;
  closeCheckoutModal: () => void;
  isDiscountCenterOpen: boolean;
  openDiscountCenter: () => void;
  closeDiscountCenter: () => void;
  isGatedModalOpen: boolean;
  gatedFeatureInfo: GatedFeatureInfo | null;
  triggerGatedFeatureModal: (featureName: string, requiredTier: MembershipTier, description: string) => void;
  closeGatedModal: () => void;
}

const LOCAL_STORAGE_KEY = 'twe_ats_membership_state_v1';

const DEFAULT_STATE: UserMembershipState = {
  tier: 'free',
  billingInterval: 'monthly',
  status: 'free',
  isLifetime: false,
  memberSince: new Date().toISOString(),
  validUntil: null,
  totalSavedFeesUsd: 482.50, // default simulated existing savings for demonstration
  totalVolumeTradedUsd: 1250000,
  claimedVoucherIds: [],
  receipts: []
};

const MembershipContext = createContext<MembershipContextType | undefined>(undefined);

export const MembershipProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userState, setUserState] = useState<UserMembershipState>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_STATE, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Failed to load membership state from localStorage', e);
    }
    return DEFAULT_STATE;
  });

  const [vouchers, setVouchers] = useState<PartnerVoucher[]>(() => {
    return INITIAL_PARTNER_VOUCHERS.map(v => ({
      ...v,
      claimed: userState.claimedVoucherIds.includes(v.id)
    }));
  });

  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [preselectedTier, setPreselectedTier] = useState<MembershipTier>('elite');
  const [isDiscountCenterOpen, setIsDiscountCenterOpen] = useState(false);
  const [isGatedModalOpen, setIsGatedModalOpen] = useState(false);
  const [gatedFeatureInfo, setGatedFeatureInfo] = useState<GatedFeatureInfo | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userState));
    } catch (e) {
      console.warn('Failed to persist membership state', e);
    }
  }, [userState]);

  const currentPlan = TIER_PLANS[userState.tier];

  const setTier = (tier: MembershipTier, interval: BillingInterval = 'monthly', paymentMethod: PaymentMethodType = 'crypto_usdc') => {
    const plan = TIER_PLANS[tier];
    let price = 0;
    if (tier !== 'free') {
      if (interval === 'monthly') price = plan.monthlyPriceUsd;
      else if (interval === 'annual') price = plan.annualPriceUsd;
      else if (interval === 'lifetime') price = plan.lifetimePriceUsd;
    }

    const now = new Date();
    const expiry = new Date();
    if (interval === 'monthly') {
      expiry.setMonth(expiry.getMonth() + 1);
    } else if (interval === 'annual') {
      expiry.setFullYear(expiry.getFullYear() + 1);
    } else {
      expiry.setFullYear(expiry.getFullYear() + 100);
    }

    const newReceipt: MembershipTransactionReceipt = {
      id: `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: now.toISOString(),
      tier,
      billingInterval: interval,
      amountUsd: price,
      paymentMethod,
      txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      status: 'confirmed',
      invoiceNumber: `TWE-INV-2026-${Math.floor(100000 + Math.random() * 900000)}`
    };

    setUserState(prev => ({
      ...prev,
      tier,
      billingInterval: interval,
      status: tier === 'free' ? 'free' : 'active',
      isLifetime: interval === 'lifetime',
      validUntil: interval === 'lifetime' ? null : expiry.toISOString(),
      paymentMethod,
      receipts: [newReceipt, ...prev.receipts]
    }));
  };

  const claimVoucher = (voucherId: string): boolean => {
    const v = vouchers.find(item => item.id === voucherId);
    if (!v) return false;

    // Check tier eligibility
    const tierPriority = { free: 0, elite: 1, vip: 2 };
    if (tierPriority[userState.tier] < tierPriority[v.minTierRequired]) {
      triggerGatedFeatureModal(
        `${v.partnerName} Partner Voucher`, 
        v.minTierRequired, 
        `This partner voucher requires ${v.minTierRequired.toUpperCase()} membership. Upgrade to claim $${v.valueUsd} in credits immediately.`
      );
      return false;
    }

    setVouchers(prev => prev.map(item => item.id === voucherId ? { ...item, claimed: true } : item));
    setUserState(prev => ({
      ...prev,
      claimedVoucherIds: [...new Set([...prev.claimedVoucherIds, voucherId])],
      totalSavedFeesUsd: prev.totalSavedFeesUsd + v.valueUsd
    }));
    return true;
  };

  const calculateFeeWithRebate = (notionalAmountUsd: number, isTaker: boolean = false) => {
    const baseRate = isTaker ? 0.0020 : 0.0015; // 0.20% taker, 0.15% maker
    const standardFee = notionalAmountUsd * baseRate;

    const currentRate = isTaker ? (currentPlan.atsTakerFeePct / 100) : (currentPlan.atsMakerFeePct / 100);
    const netFee = notionalAmountUsd * currentRate;
    const savings = Math.max(0, standardFee - netFee);

    return { standardFee, netFee, savings };
  };

  const recordSimulatedTradeSavings = (tradeVolumeUsd: number, isTaker: boolean = false) => {
    const { savings } = calculateFeeWithRebate(tradeVolumeUsd, isTaker);
    if (savings > 0) {
      setUserState(prev => ({
        ...prev,
        totalVolumeTradedUsd: prev.totalVolumeTradedUsd + tradeVolumeUsd,
        totalSavedFeesUsd: prev.totalSavedFeesUsd + savings
      }));
    }
  };

  const openCheckoutModal = (targetTier: MembershipTier = 'elite') => {
    setPreselectedTier(targetTier);
    setIsCheckoutModalOpen(true);
  };

  const closeCheckoutModal = () => {
    setIsCheckoutModalOpen(false);
  };

  const openDiscountCenter = () => {
    setIsDiscountCenterOpen(true);
  };

  const closeDiscountCenter = () => {
    setIsDiscountCenterOpen(false);
  };

  const triggerGatedFeatureModal = (featureName: string, requiredTier: MembershipTier, description: string) => {
    setGatedFeatureInfo({ featureName, requiredTier, description });
    setIsGatedModalOpen(true);
  };

  const closeGatedModal = () => {
    setIsGatedModalOpen(false);
    setGatedFeatureInfo(null);
  };

  return (
    <MembershipContext.Provider
      value={{
        userState,
        currentPlan,
        vouchers,
        setTier,
        claimVoucher,
        calculateFeeWithRebate,
        recordSimulatedTradeSavings,
        isCheckoutModalOpen,
        preselectedTier,
        openCheckoutModal,
        closeCheckoutModal,
        isDiscountCenterOpen,
        openDiscountCenter,
        closeDiscountCenter,
        isGatedModalOpen,
        gatedFeatureInfo,
        triggerGatedFeatureModal,
        closeGatedModal
      }}
    >
      {children}
    </MembershipContext.Provider>
  );
};

export const useMembership = (): MembershipContextType => {
  const context = useContext(MembershipContext);
  if (!context) {
    throw new Error('useMembership must be used within a MembershipProvider');
  }
  return context;
};
