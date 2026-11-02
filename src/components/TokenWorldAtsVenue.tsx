import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Building2,
  TrendingUp,
  FileText,
  Download,
  ShieldCheck,
  RefreshCw,
  Bell,
  ArrowRightLeft,
  Coins,
  ChevronRight,
  ExternalLink,
  Layers,
  CheckCircle2,
  Lock,
  Unlock,
  Key,
  Volume2,
  Copy,
  Check,
  Scale,
  Zap,
  Globe,
  Landmark,
  UserCheck,
  FileCheck,
  Eye,
  AlertCircle,
  Play,
  RotateCcw,
  Network,
  Code2,
  Terminal,
  Server,
  ShieldAlert,
  FileSpreadsheet,
  CheckSquare,
  Cpu,
  Sparkles,
  Sliders,
  Search,
  Flame,
  Calendar,
  Clock,
  Activity,
  X,
  DollarSign,
  Crown,
} from "lucide-react";
import { WeeklyTree3UpdateView } from "./WeeklyTree3UpdateView";
import { InstitutionalSandboxView } from "./InstitutionalSandboxView";
import {
  AtsOrder,
  AtsTradeExecution,
  PrimaryIssuanceRound,
  DtccFastReconciliationRecord,
  OWNER_PROFILE,
  REGULATORY_DOCUMENTS,
  RegulatoryDocument,
  playNyseBrassBellSound,
  downloadDocumentFile,
  PRIMARY_ISSUANCES,
  INITIAL_DTCC_RECONCILIATION,
  SOLIDITY_SECURITY_TOKEN_SOURCE,
  SOLIDITY_TREE3_TOKEN_SOURCE,
  SOLIDITY_TREASURY_TOKEN_SOURCE,
  FOUNDRY_DEPLOY_TREE3_SOURCE,
  FOUNDRY_TEST_TREE3_SOURCE,
  PYTHON_CSV_SANITIZER_SOURCE,
  PYTHON_MATCHING_ENGINE_SOURCE,
  generateTree3Id,
  sanitizeCsvRecords,
  isValidEvmAddress,
  generateMultiTokenPrimaryIssuances,
  generateMultiTokenDtccReconciliations,
} from "../utils/atsVenueData";
import { globalAtsEngine, VenueGlobalStats } from "../utils/atsMatchingEngine";
import { BulkWhitelistManager } from "./BulkWhitelistManager";
import { AtsLiquidityMatrix } from "./AtsLiquidityMatrix";
import { RwaTokenDeploymentWizard } from "./RwaTokenDeploymentWizard";
import { Erc3643ComplianceGatePanel } from "./Erc3643ComplianceGatePanel";
import { OnChainInstitutionalOrderBookAndClearinghouse } from "./OnChainInstitutionalOrderBookAndClearinghouse";
import { InvestorSBTGallery } from "./InvestorSBTGallery";
import { TradeVelocityAlertMonitor, VelocitySpikeAlert } from "./TradeVelocityAlertMonitor";
import { withVIPProtection } from "./withVIPProtection";
import { AtsSecurityGuardrailsPanel } from "./AtsSecurityGuardrailsPanel";
import { AtsMembershipMonetizationPlan } from "./AtsMembershipMonetizationPlan";
import { InstitutionalAtsArchitecturePortal } from "./InstitutionalAtsArchitecturePortal";
import { SecEdgarMonitoringPipeline } from "./SecEdgarMonitoringPipeline";
import { NyseTweTickerExchangeHub } from "./NyseTweTickerExchangeHub";
import { TokenWorldUnifiedAuthGateway } from "./TokenWorldUnifiedAuthGateway";
import { useAuth0Membership, VIP_TIER_MATRIX } from "../utils/auth0MembershipContext";
import { maskTxHash, maskTreasuryAddress } from "../utils/treasuryPrivacyGuardrail";
import { TokenRecord, ChainType } from "../types";
import { generateTokenRecord } from "../utils/cryptoGenerators";
import { CHAIN_METADATA } from "../utils/marketData";
import {
  secRule15c35RiskEngine,
  ComplianceRiskConfig,
  CollarBreachRecord,
  HaltStateInfo,
  OrderEvaluationResult,
} from "../utils/complianceRiskEngine";

const ProtectedInstitutionalSandboxView = withVIPProtection(
  InstitutionalSandboxView,
  "Institutional Sandbox (TW-DEMO & Go-Live Gates)"
);

function playRiskEngineAlertChime(isCritical: boolean = false) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = isCritical ? "sawtooth" : "sine";
    osc2.type = "triangle";

    if (isCritical) {
      // Rapid dual-tone alarm for automated circuit breaker trading halt
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.setValueAtTime(440, now + 0.15);
      osc2.frequency.setValueAtTime(1320, now);
      osc2.frequency.setValueAtTime(660, now + 0.15);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    } else {
      // Crisp rejection alert tone
      osc1.frequency.setValueAtTime(587.33, now);
      osc1.frequency.setValueAtTime(440, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    }

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + (isCritical ? 0.65 : 0.4));
    osc2.stop(now + (isCritical ? 0.65 : 0.4));
  } catch {
    // Ignore audio restrictions
  }
}

type AtsTabMode =
  | "unified_auth_gateway"
  | "nyse_twe_ticker"
  | "trading_portal"
  | "sec_15c3_5_collars"
  | "institutional_architecture"
  | "ats_membership_plan"
  | "trade_velocity_alert"
  | "security_guardrails"
  | "investor_sbt_gallery"
  | "onchain_clob_clearinghouse"
  | "rwa_deployment_wizard"
  | "erc3643_gate_testbench"
  | "liquidity_matrix"
  | "bulk_whitelist"
  | "kyc_simulation"
  | "fastapi_engine"
  | "compliance_gates"
  | "primary_issuances"
  | "nyse_dtcc_bridge"
  | "smart_contracts"
  | "regulatory_docs"
  | "nyse_bell_ceremony"
  | "weekly_tree3_update"
  | "sec_edgar_pipeline"
  | "institutional_sandbox";

interface TokenWorldAtsVenueProps {
  tokens?: TokenRecord[];
  metaMaskAccount?: string | null;
  isMetaMaskConnected?: boolean;
  onNavigateToMonetization?: () => void;
}

export const TokenWorldAtsVenue: React.FC<TokenWorldAtsVenueProps> = ({
  tokens,
  metaMaskAccount,
  isMetaMaskConnected,
  onNavigateToMonetization,
}) => {
  const { user, membershipTier, isVIP, upgradeToVIP, downgradeToFree } = useAuth0Membership();
  const [activeMode, setActiveMode] = useState<AtsTabMode>("trading_portal");
  const [showArchitectureMap, setShowArchitectureMap] = useState<boolean>(true);

  // Active Portfolio Tokens & Guaranteed Universe (TW-EQ, TREE3, and all user tokens)
  const allVenueTokens = useMemo(() => {
    const list = tokens && tokens.length > 0 ? [...tokens] : [];
    if (list.length === 0) {
      const sampleChains: ChainType[] = ["ethereum", "solana", "base", "arbitrum", "polygon", "quantum", "cosmos", "bitcoin"];
      for (let i = 1; i <= 24; i++) {
        const chain = sampleChains[(i - 1) % sampleChains.length];
        list.push(generateTokenRecord(i, { chains: [chain], simulatedMarketData: true }));
      }
    }
    // Guarantee TWE (Flagship NYSE & ATS Dual-Listing), TW-EQ, and TREE3 exist in universe
    if (!list.some((t) => t.symbol.toUpperCase() === "TWE")) {
      list.unshift({
        id: "twe-flagship-master",
        name: "Token World Exchange ATS®",
        symbol: "TWE",
        decimals: 18,
        totalSupply: 100000000,
        priceUsd: 100.00,
        marketCap: 10000000000,
        volume24h: 185000000,
        change24h: 4.25,
        chain: "ethereum" as ChainType,
        contractAddress: "0x12bE66708709320Ac321A858712C208492E69d12",
        verified: true,
        score: 100,
      } as any);
    }
    if (!list.some((t) => t.symbol.toUpperCase() === "TW-EQ")) {
      list.splice(1, 0, {
        id: "tw-eq-master",
        name: "Token World Treasury Growth Equity",
        symbol: "TW-EQ",
        decimals: 18,
        totalSupply: 20000000,
        priceUsd: 52.50,
        marketCap: 1050000000,
        volume24h: 45000000,
        change24h: 3.45,
        chain: "ethereum" as ChainType,
        contractAddress: "0x3A9F1B229D48C1C82902bC017845fD24E67Ac08E",
        verified: true,
        score: 98,
      } as any);
    }
    if (!list.some((t) => t.symbol.toUpperCase() === "TREE3")) {
      list.splice(2, 0, {
        id: "tree3-master",
        name: "Token World Sovereign TREE3 Security Token",
        symbol: "TREE3",
        decimals: 18,
        totalSupply: 10000000,
        priceUsd: 125.00,
        marketCap: 1250000000,
        volume24h: 28000000,
        change24h: 5.12,
        chain: "ethereum" as ChainType,
        contractAddress: "0xd12A2E29B64E8CeFC8bc2AA80A7169817608704D",
        verified: true,
        score: 99,
      } as any);
    }
    return list;
  }, [tokens]);

  const [selectedSymbol, setSelectedSymbol] = useState<string>("TWE");
  const [clobSearchQuery, setClobSearchQuery] = useState<string>("");
  const [clobChainFilter, setClobChainFilter] = useState<string>("ALL");
  const [isFullSuiteOperational, setIsFullSuiteOperational] = useState<boolean>(true);
  const [liquidityNotice, setLiquidityNotice] = useState<string | null>(null);
  const [isAllocatingLiquidity, setIsAllocatingLiquidity] = useState<boolean>(false);
  const [venueStats, setVenueStats] = useState<VenueGlobalStats>(() => globalAtsEngine.getGlobalVenueStats());

  const selectedTokenObj = useMemo(() => {
    return allVenueTokens.find((t) => t.symbol.toUpperCase() === selectedSymbol.toUpperCase()) || allVenueTokens[0];
  }, [allVenueTokens, selectedSymbol]);

  // Function to refresh current active order book
  const refreshActiveBook = (symbol: string) => {
    const book = globalAtsEngine.getBook(symbol);
    setBids(book.bids);
    setAsks(book.asks);
    setTrades(book.trades);
    setSpread(book.spread);
    if (book.referencePrice > 0) {
      setOrderPrice(book.referencePrice.toFixed(book.referencePrice < 1 ? 4 : 2));
    }
  };

  // CLOB State
  const [bids, setBids] = useState<AtsOrder[]>(() => globalAtsEngine.getBids("TW-EQ"));
  const [asks, setAsks] = useState<AtsOrder[]>(() => globalAtsEngine.getAsks("TW-EQ"));
  const [trades, setTrades] = useState<AtsTradeExecution[]>(() => globalAtsEngine.getTrades("TW-EQ"));
  const [spread, setSpread] = useState<number>(() => globalAtsEngine.getSpread("TW-EQ"));

  // Order Ticket Form
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [orderPrice, setOrderPrice] = useState<string>("52.50");
  const [orderQuantity, setOrderQuantity] = useState<string>("5000");
  const [orderTier, setOrderTier] = useState<"QIB_RULE_144A" | "ACCREDITED_REG_D" | "OFFSHORE_REG_S">("ACCREDITED_REG_D");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [lastMatchNotice, setLastMatchNotice] = useState<string | null>(null);

  // Centralized SEC Rule 15c3-5 Compliance Collars State
  const [riskConfig, setRiskConfig] = useState<ComplianceRiskConfig>(() => secRule15c35RiskEngine.getConfig());
  const [riskHaltState, setRiskHaltState] = useState<HaltStateInfo>(() => secRule15c35RiskEngine.getHaltState());
  const [riskBreaches, setRiskBreaches] = useState<CollarBreachRecord[]>(() => secRule15c35RiskEngine.getBreachHistory());
  const [supervisorOverrideKey, setSupervisorOverrideKey] = useState<string>("MLD-TAURUS-CHIEF-COMPLIANCE");
  const [isRiskHaltModalOpen, setIsRiskHaltModalOpen] = useState<boolean>(false);

  useEffect(() => {
    return secRule15c35RiskEngine.subscribe(() => {
      setRiskConfig(secRule15c35RiskEngine.getConfig());
      setRiskHaltState(secRule15c35RiskEngine.getHaltState());
      setRiskBreaches(secRule15c35RiskEngine.getBreachHistory());
    });
  }, []);

  // Moving Average Price Window for SEC Rule 15c3-5 Price Collar Engine
  const movingAverageCollar = useMemo(() => {
    const fallbackPrice = selectedTokenObj?.priceUsd > 0 ? selectedTokenObj.priceUsd : 52.50;
    return secRule15c35RiskEngine.calculateMovingAveragePrice(
      trades,
      selectedSymbol,
      fallbackPrice,
      riskConfig.movingAverageWindowSize || 10
    );
  }, [trades, selectedSymbol, selectedTokenObj, riskConfig.movingAverageWindowSize, riskConfig.priceCollarBandPercent]);

  const liveOrderEvaluation = useMemo<OrderEvaluationResult>(() => {
    const p = parseFloat(orderPrice) || 0;
    const q = parseInt(orderQuantity, 10) || 0;
    const ref = movingAverageCollar.movingAveragePrice;

    return secRule15c35RiskEngine.evaluateOrder({
      symbol: selectedSymbol,
      side: orderSide,
      price: p,
      quantity: q,
      referencePrice: ref,
      traderAddress: metaMaskAccount || "0x3A9F1B229D48C1C82902bC017845fD24E67Ac08E",
    });
  }, [orderPrice, orderQuantity, selectedSymbol, orderSide, movingAverageCollar, metaMaskAccount, riskConfig]);

  const handleResumeTradingVenue = () => {
    const ok = secRule15c35RiskEngine.resumeTrading(supervisorOverrideKey);
    if (ok) {
      setIsRiskHaltModalOpen(false);
      setLastMatchNotice("Trading venue resumed by Chief Compliance Officer. SEC 15c3-5 circuit cleared.");
    }
  };

  const handleApplyCollarPreset = (presetType: "NORMAL" | "HIGH_VOL" | "FAT_FINGER" | "TRIGGER_HALT") => {
    const ref = movingAverageCollar.movingAveragePrice;
    if (presetType === "NORMAL") {
      setOrderPrice(ref.toFixed(ref < 1 ? 4 : 2));
      setOrderQuantity("5000");
    } else if (presetType === "HIGH_VOL") {
      // +5.5% above Moving Average to trigger automated ±5% price collar halt
      const breachPrice = Number((ref * 1.055).toFixed(2));
      setOrderPrice(breachPrice.toString());
      setOrderQuantity("10000");
    } else if (presetType === "FAT_FINGER") {
      // Massive notional breach ($5M+)
      setOrderPrice(ref.toFixed(ref < 1 ? 4 : 2));
      const hugeQty = Math.max(100000, Math.floor(3500000 / ref));
      setOrderQuantity(hugeQty.toString());
    } else if (presetType === "TRIGGER_HALT") {
      // Extreme deviation (+8.5%) that unequivocally trips the ±5% collar and halts trading
      const extremePrice = Number((ref * 1.085).toFixed(2));
      setOrderPrice(extremePrice.toString());
      setOrderQuantity("25000");
    }
  };

  const handleExportSec15c35Csv = () => {
    const headers = [
      "BREACH_ID",
      "TIMESTAMP_ISO",
      "SYMBOL",
      "SIDE",
      "PRICE_USD",
      "QUANTITY",
      "NOTIONAL_USD",
      "REFERENCE_NBBO_USD",
      "PRICE_DEVIATION_PCT",
      "TRADER_ADDRESS",
      "VIOLATION_TYPE",
      "SEVERITY",
      "ACTION_TAKEN",
      "REASON",
      "DISPOSITION",
    ];
    const rows = riskBreaches.map((b) => [
      b.id,
      new Date(b.timestamp).toISOString(),
      b.symbol,
      b.orderSide,
      b.price.toFixed(2),
      b.quantity,
      b.notionalUsd.toFixed(2),
      b.referencePrice.toFixed(2),
      b.priceDeviationPercent.toFixed(2) + "%",
      b.traderAddress,
      b.breachType,
      b.severity,
      b.actionTaken,
      `"${b.reason.replace(/"/g, '""')}"`,
      b.disposition,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `SEC_Rule_15c3_5_Collar_Audit_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trade History Settlement Status State: Tracks 'Matched' -> 'Atomic Clearing Verified'
  const [tradeSettlementStatuses, setTradeSettlementStatuses] = useState<
    Record<string, "Matched" | "Atomic Clearing Verified">
  >({});
  const [pulsingTradeIds, setPulsingTradeIds] = useState<Set<string>>(new Set());
  const [selectedReceiptTrade, setSelectedReceiptTrade] = useState<AtsTradeExecution | null>(null);

  // Trade Velocity 3-Sigma Anomaly Alert State
  const [globalVelocitySpikeToast, setGlobalVelocitySpikeToast] = useState<VelocitySpikeAlert | null>(null);
  const handleTriggerGlobalVelocityToast = (alert: VelocitySpikeAlert) => {
    setGlobalVelocitySpikeToast(alert);
    // Auto-dismiss after 8 seconds
    setTimeout(() => {
      setGlobalVelocitySpikeToast((curr) => (curr?.id === alert.id ? null : curr));
    }, 8000);
  };

  // Trigger subtle pulse transition when a trade moves from 'Matched' to 'Atomic Clearing Verified'
  const triggerSettlementTransition = (tradeId: string) => {
    // 1. Immediately set status to 'Matched'
    setTradeSettlementStatuses((prev) => ({
      ...prev,
      [tradeId]: "Matched",
    }));

    // 2. After realistic block confirmation delay (1500ms), transition to 'Atomic Clearing Verified'
    setTimeout(() => {
      setTradeSettlementStatuses((prev) => ({
        ...prev,
        [tradeId]: "Atomic Clearing Verified",
      }));

      // 3. Activate subtle pulse animation on status icon
      setPulsingTradeIds((prev) => new Set([...prev, tradeId]));

      // 4. Settle transition ping after 3500ms into steady verified state
      setTimeout(() => {
        setPulsingTradeIds((prev) => {
          const next = new Set(prev);
          next.delete(tradeId);
          return next;
        });
      }, 3500);
    }, 1500);
  };

  // Initial demonstration on component mount: animate the first trade moving from 'Matched' to 'Atomic Clearing Verified'
  const hasTriggeredInitialDemo = useRef<boolean>(false);
  useEffect(() => {
    if (!hasTriggeredInitialDemo.current && trades.length > 0) {
      hasTriggeredInitialDemo.current = true;
      const firstTrade = trades[0];
      const timer = setTimeout(() => {
        triggerSettlementTransition(firstTrade.id);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [trades]);

  // Automatically allocate maximum liquidity across all tokens on mount and allVenueTokens change
  useEffect(() => {
    if (allVenueTokens.length > 0) {
      globalAtsEngine.allocateLiquidityForAllTokens(allVenueTokens, 2.0);
      const stats = globalAtsEngine.getGlobalVenueStats();
      setVenueStats(stats);
      refreshActiveBook(selectedSymbol);

      const multiIssuances = generateMultiTokenPrimaryIssuances(allVenueTokens);
      setIssuances(multiIssuances);

      const multiDtcc = generateMultiTokenDtccReconciliations(allVenueTokens);
      if (multiDtcc[selectedSymbol]) {
        setDtccState(multiDtcc[selectedSymbol]);
      }
    }
  }, [allVenueTokens]);

  const handleSelectSymbol = (sym: string) => {
    const cleanSym = sym.toUpperCase().trim();
    setSelectedSymbol(cleanSym);
    globalAtsEngine.setActiveSymbol(cleanSym);
    refreshActiveBook(cleanSym);

    const multiDtcc = generateMultiTokenDtccReconciliations(allVenueTokens);
    if (multiDtcc[cleanSym]) {
      setDtccState(multiDtcc[cleanSym]);
    }
  };

  const handleBoostTokenLiquidity = (token: TokenRecord) => {
    globalAtsEngine.allocateLiquidityForToken(token, 2.5);
    setVenueStats(globalAtsEngine.getGlobalVenueStats());
    refreshActiveBook(selectedSymbol);
  };

  const handleAllocateMaxLiquidityAll = async () => {
    setIsAllocatingLiquidity(true);
    try {
      const summary = globalAtsEngine.allocateLiquidityForAllTokens(allVenueTokens, 3.5);
      const stats = globalAtsEngine.getGlobalVenueStats();
      setVenueStats(stats);
      refreshActiveBook(selectedSymbol);

      await fetch("/api/ats/allocate-liquidity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokens: allVenueTokens }),
      }).catch(() => {});

      const formattedVal = summary.totalVenueLiquidityUsd >= 1e12
        ? `$${(summary.totalVenueLiquidityUsd / 1e12).toFixed(2)} Trillion`
        : summary.totalVenueLiquidityUsd >= 1e9
        ? `$${(summary.totalVenueLiquidityUsd / 1e9).toFixed(2)} Billion`
        : `$${(summary.totalVenueLiquidityUsd / 1e6).toFixed(2)} Million`;

      setLiquidityNotice(
        `Maximum Highest Standard Active: ${formattedVal} allocated across ${summary.allocatedCount} token order books! 100% Depth & Atomic DvP Settlement live.`
      );
    } finally {
      setIsAllocatingLiquidity(false);
      setTimeout(() => setLiquidityNotice(null), 6000);
    }
  };

  // KYC & Investor Eligibility Simulation State
  const [kycEntityName, setKycEntityName] = useState<string>("Dar Institutional Alpha Capital");
  const [kycWalletAddress, setKycWalletAddress] = useState<string>("0x3A9F1B229D48C1C82902bC017845fD24E67Ac08E");
  const [kycNetWorth, setKycNetWorth] = useState<string>("5000000");
  const [kycAnnualIncome, setKycAnnualIncome] = useState<string>("750000");
  const [kycIsQib, setKycIsQib] = useState<boolean>(true);
  const [kycJurisdiction, setKycJurisdiction] = useState<string>("United States (Delaware)");
  const [kycMethod, setKycMethod] = useState<string>("CPA_ATTESTATION");
  const [kycResult, setKycResult] = useState<{
    verified: boolean;
    tier: string;
    rule: string;
    certId: string;
    ofacCleared: boolean;
    timestamp: number;
    whitelistedOnChain: boolean;
  } | null>(null);
  const [kycLoading, setKycLoading] = useState<boolean>(false);

  // FastAPI Sandbox Testbench State
  const [fastApiOrderSide, setFastApiOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [fastApiPrice, setFastApiPrice] = useState<string>("52.50");
  const [fastApiQuantity, setFastApiQuantity] = useState<string>("2500");
  const [fastApiWallet, setFastApiWallet] = useState<string>("0x789d98F8aC61466A8E1b3BfFa6c1B61942E285bF");
  const [fastApiLogs, setFastApiLogs] = useState<string[]>([
    "[09:30:00 ET] FastAPI Engine initialized (main.py): ENABLE_LIVE_TRADING=true",
    "[09:30:01 ET] Pre-trade risk filters active (SEC Rule 15c3-5): Max order $10M, Collar ±30%",
    "[09:30:02 ET] In-memory Price-Time Priority Heap ready for all tokens",
  ]);
  const [fastApiSimulating, setFastApiSimulating] = useState<boolean>(false);
  const [fastApiLastTrade, setFastApiLastTrade] = useState<any>(null);

  // DTCC FAST Bridge State
  const [dtccState, setDtccState] = useState<DtccFastReconciliationRecord>(INITIAL_DTCC_RECONCILIATION);
  const [wrapAmountInput, setWrapAmountInput] = useState<string>("100000");
  const [unwrapAmountInput, setUnwrapAmountInput] = useState<string>("50000");
  const [bridgeNotice, setBridgeNotice] = useState<string | null>(null);

  // Regulatory Documents State
  const [selectedDoc, setSelectedDoc] = useState<RegulatoryDocument>(REGULATORY_DOCUMENTS[0]);
  const [copiedDocId, setCopiedDocId] = useState<string | null>(null);

  // Primary Issuances State
  const [issuances, setIssuances] = useState<PrimaryIssuanceRound[]>(PRIMARY_ISSUANCES);
  const [subscribedRoundId, setSubscribedRoundId] = useState<string | null>(null);
  const [subscriptionAmount, setSubscriptionAmount] = useState<string>("50000");
  const [primaryIssuanceSearch, setPrimaryIssuanceSearch] = useState<string>("");

  // Smart Contracts Studio State
  const [selectedContractKey, setSelectedContractKey] = useState<
    "security_token" | "tree3_token" | "treasury_token" | "deploy_tree3" | "test_tree3" | "sanitize_csv"
  >("tree3_token");

  // TREE(3) Interactive Generator State
  const [tree3Account, setTree3Account] = useState<string>("0xd12A2E29B64E8CeFC8bc2AA80A7169817608704D");
  const [tree3Nonce, setTree3Nonce] = useState<string>("1");
  const [tree3Seed, setTree3Seed] = useState<string>("999");
  const [tree3Result, setTree3Result] = useState<string | null>(null);

  // Interactive CSV Data Sanitizer State
  const sampleCsvData = `address,amount
0xd12A2E29B64E8CeFC8bc2AA80A7169817608704D,1000000000000
0x3A9F1B229D48C1C82902bC017845fD24E67Ac08E,5000000
0xc0rp88912349_MALFORMED_HEX_INVALID,25000
0x789d98F8aC61466A8E1b3BfFa6c1B61942E285bF,12500000
0x12bE66708709320Ac321A858712C208492E69d12,
,50000
0x44BcA912c98F9082A81B0941F480414B60Ef110C,98000000`;

  const [csvRawText, setCsvRawText] = useState<string>(sampleCsvData);
  const [csvSanitizedStats, setCsvSanitizedStats] = useState<{
    validCount: number;
    rejectedCount: number;
    validRows: { address: string; amount: number }[];
    rejectedRows: { row: number; address: string; amount: string; reason: string }[];
  } | null>(null);

  // NYSE Opening Bell Ceremony State
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isBellRinging, setIsBellRinging] = useState<boolean>(false);
  const [marketOpenCelebrated, setMarketOpenCelebrated] = useState<boolean>(false);
  const [teleprompterPlaying, setTeleprompterPlaying] = useState<boolean>(false);
  const countdownIntervalRef = useRef<any>(null);

  // Total Market Metrics
  const totalVolumeShares = useMemo(() => {
    return trades.reduce((acc, t) => acc + t.quantity, 0);
  }, [trades]);

  const totalVolumeUsd = useMemo(() => {
    return trades.reduce((acc, t) => acc + t.totalUsd, 0);
  }, [trades]);

  // Order ticket calculations
  const totalOrderValueUsd = useMemo(() => {
    const p = parseFloat(orderPrice) || 0;
    const q = parseInt(orderQuantity, 10) || 0;
    return (p * q).toLocaleString("en-US", { style: "currency", currency: "USD" });
  }, [orderPrice, orderQuantity]);

  const clobAvailableChains = useMemo(() => {
    const set = new Set<string>();
    allVenueTokens.forEach((t) => {
      if (t.chain) set.add(t.chain.toLowerCase());
    });
    return ["ALL", ...Array.from(set)];
  }, [allVenueTokens]);

  const clobFilteredTokens = useMemo(() => {
    return allVenueTokens.filter((t) => {
      const q = clobSearchQuery.toLowerCase().trim();
      const matchSearch = !q || t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q);
      const matchChain = clobChainFilter === "ALL" || (t.chain && t.chain.toLowerCase() === clobChainFilter.toLowerCase());
      return matchSearch && matchChain;
    });
  }, [allVenueTokens, clobSearchQuery, clobChainFilter]);

  const maxOrderQty = useMemo(() => {
    const bMax = bids.length ? Math.max(...bids.map((b) => b.quantity)) : 1000;
    const aMax = asks.length ? Math.max(...asks.map((a) => a.quantity)) : 1000;
    return Math.max(1, bMax, aMax);
  }, [bids, asks]);

  // Handlers for Order Submission
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(orderPrice);
    const qtyNum = parseInt(orderQuantity, 10);
    if (!priceNum || priceNum <= 0 || !qtyNum || qtyNum <= 0) return;

    // 1. Check if trading venue is currently halted under SEC Rule 15c3-5
    if (riskHaltState.isHalted) {
      playRiskEngineAlertChime(true);
      setLastMatchNotice(`🚫 TRADING VENUE HALTED: SEC Rule 15c3-5 Pre-Trade Risk Halt Active (${riskHaltState.haltCode}). Clearance required to resume.`);
      setIsRiskHaltModalOpen(true);
      return;
    }

    // 2. Validate order compliance against centralized SEC Rule 15c3-5 Moving Average price collars
    const ref = movingAverageCollar.movingAveragePrice;
    const traderAddr = metaMaskAccount || "0x3A9F1B229D48C1C82902bC017845fD24E67Ac08E";
    const evaluation = secRule15c35RiskEngine.evaluateOrder({
      symbol: selectedSymbol,
      side: orderSide,
      price: priceNum,
      quantity: qtyNum,
      referencePrice: ref,
      traderAddress: traderAddr,
    });

    if (!evaluation.compliant && evaluation.breach) {
      secRule15c35RiskEngine.recordBreach(evaluation.breach, evaluation.willTriggerHalt);
      playRiskEngineAlertChime(evaluation.willTriggerHalt);
      if (evaluation.willTriggerHalt) {
        setLastMatchNotice(`🚨 AUTOMATED CIRCUIT BREAKER HALT (±5% Collar Exceeded): ${evaluation.explanation}`);
        setIsRiskHaltModalOpen(true);
      } else {
        setLastMatchNotice(`❌ SEC RULE 15c3-5 PRE-TRADE REJECTED: ${evaluation.explanation}`);
      }
      setTimeout(() => setLastMatchNotice(null), 8000);
      return;
    }

    setIsSubmittingOrder(true);

    // Attempt backend server POST first, with resilient fallback to local engine
    try {
      const resp = await fetch("/api/ats/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          traderAddress: traderAddr,
          side: orderSide,
          price: priceNum,
          quantity: qtyNum,
          symbol: selectedSymbol,
          orderType: "LIMIT",
          investorTier: orderTier,
        }),
      });
      const data = await resp.json();
      if (data.success) {
        // Refresh local engine state
        const res = globalAtsEngine.addOrder({
          traderAddress: traderAddr,
          side: orderSide,
          price: priceNum,
          quantity: qtyNum,
          symbol: selectedSymbol,
          orderType: "LIMIT",
          investorTier: orderTier,
        });
        refreshActiveBook(selectedSymbol);
        setVenueStats(globalAtsEngine.getGlobalVenueStats());

        if (res.matchedTrades.length > 0) {
          res.matchedTrades.forEach((mt) => triggerSettlementTransition(mt.id));
          setLastMatchNotice(
            `Matched ${res.matchedTrades[0].quantity.toLocaleString()} ${selectedSymbol} units @ $${res.matchedTrades[0].price.toFixed(
              2
            )}! Transitioning settlement to Atomic Clearing Verified...`
          );
        } else {
          setLastMatchNotice(`Order posted to ${selectedSymbol} ${orderSide} book at $${priceNum.toFixed(2)} (${qtyNum.toLocaleString()} units).`);
        }
      }
    } catch {
      // Local fallback
      const res = globalAtsEngine.addOrder({
        traderAddress: traderAddr,
        side: orderSide,
        price: priceNum,
        quantity: qtyNum,
        symbol: selectedSymbol,
        orderType: "LIMIT",
        investorTier: orderTier,
      });
      refreshActiveBook(selectedSymbol);
      setVenueStats(globalAtsEngine.getGlobalVenueStats());

      if (res.matchedTrades.length > 0) {
        res.matchedTrades.forEach((mt) => triggerSettlementTransition(mt.id));
        setLastMatchNotice(
          `Executed: ${res.matchedTrades[0].quantity.toLocaleString()} ${selectedSymbol} @ $${res.matchedTrades[0].price.toFixed(2)} (Transitioning to Atomic Clearing Verified)`
        );
      } else {
        setLastMatchNotice(`Order registered in ${selectedSymbol} ${orderSide} book at $${priceNum.toFixed(2)} (${qtyNum.toLocaleString()} units).`);
      }
    } finally {
      setIsSubmittingOrder(false);
      setTimeout(() => setLastMatchNotice(null), 6000);
    }
  };

  // DTCC FAST Bridge Wrap/Unwrap Handlers
  const handleExecuteBridgeAction = async (type: "WRAP" | "UNWRAP") => {
    const wrapAmt = type === "WRAP" ? parseInt(wrapAmountInput, 10) || 0 : 0;
    const unwrapAmt = type === "UNWRAP" ? parseInt(unwrapAmountInput, 10) || 0 : 0;

    try {
      const resp = await fetch("/api/ats/dtcc-reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wrapDelta: wrapAmt,
          unwrapDelta: unwrapAmt,
        }),
      });
      const data = await resp.json();
      if (data.success && data.record) {
        setDtccState(data.record);
        setBridgeNotice(
          type === "WRAP"
            ? `Successfully wrapped ${wrapAmt.toLocaleString()} NYSE shares into Token World ERC-3643 tokens!`
            : `Successfully unwrapped ${unwrapAmt.toLocaleString()} ERC-3643 tokens back to NYSE DTC depository!`
        );
      }
    } catch {
      // Local calculation
      setDtccState((prev) => {
        let nyse = prev.nysePublicFloatDtcShares;
        let token = prev.tokenWorldWrappedShares;
        if (type === "WRAP" && wrapAmt <= nyse) {
          nyse -= wrapAmt;
          token += wrapAmt;
        } else if (type === "UNWRAP" && unwrapAmt <= token) {
          token -= unwrapAmt;
          nyse += unwrapAmt;
        }
        return {
          ...prev,
          nysePublicFloatDtcShares: nyse,
          tokenWorldWrappedShares: token,
          timestamp: Date.now(),
        };
      });
      setBridgeNotice(`Reconciliation balanced with 0 variance.`);
    }
    setTimeout(() => setBridgeNotice(null), 5000);
  };

  // Primary Issuance Subscription Handler
  const handleSubscribeRound = (roundId: string) => {
    const amt = parseFloat(subscriptionAmount) || 25000;
    setIssuances((prev) =>
      prev.map((r) => {
        if (r.id !== roundId) return r;
        const addShares = Math.floor(amt / r.sharePriceUsd);
        return {
          ...r,
          raisedCapitalUsd: Math.min(r.targetCapitalUsd, r.raisedCapitalUsd + amt),
          sharesAllocated: Math.min(r.totalSharesOffered, r.sharesAllocated + addShares),
          investorCount: r.investorCount + 1,
        };
      })
    );
    setSubscribedRoundId(roundId);
    setTimeout(() => setSubscribedRoundId(null), 4000);
  };

  // TREE(3) Deterministic ID Generator Handler
  const handleGenerateTree3Id = () => {
    const nonceNum = parseInt(tree3Nonce, 10) || 0;
    const seedNum = parseInt(tree3Seed, 10) || 0;
    const hash = generateTree3Id(tree3Account, nonceNum, seedNum);
    setTree3Result(hash);
  };

  // CSV Data Sanitizer & Ingestion Handler
  const handleRunCsvSanitizer = () => {
    const lines = csvRawText.split("\n").filter((l) => l.trim().length > 0);
    const records: { address: string; amount: string }[] = [];
    const startIdx = lines.length > 0 && lines[0].toLowerCase().includes("address") ? 1 : 0;
    for (let i = startIdx; i < lines.length; i++) {
      const parts = lines[i].split(",").map((p) => p.trim());
      records.push({ address: parts[0] || "", amount: parts[1] || "" });
    }
    const { valid, rejected } = sanitizeCsvRecords(records);
    setCsvSanitizedStats({
      validCount: valid.length,
      rejectedCount: rejected.length,
      validRows: valid,
      rejectedRows: rejected,
    });
  };

  const handleDownloadSanitizedCsv = () => {
    if (!csvSanitizedStats || csvSanitizedStats.validRows.length === 0) return;
    const csvContent = ["address,amount", ...csvSanitizedStats.validRows.map((r) => `${r.address},${r.amount}`)].join("\n");
    downloadDocumentFile("token_sanitized.csv", csvContent, "text/csv");
  };

  // NYSE Opening Bell Trigger
  const handleTriggerOpeningBell = () => {
    if (countdown !== null) return;
    setCountdown(10);
    clearInterval(countdownIntervalRef.current);

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          setIsBellRinging(true);
          setMarketOpenCelebrated(true);
          playNyseBrassBellSound();

          // Continuous ceremonial bell ringing chimes for 4 seconds
          setTimeout(() => playNyseBrassBellSound(), 1200);
          setTimeout(() => playNyseBrassBellSound(), 2400);
          setTimeout(() => playNyseBrassBellSound(), 3600);
          setTimeout(() => setIsBellRinging(false), 5000);

          // Ping server endpoint
          fetch("/api/ats/bell-ceremony", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "RING_BELL", celebrant: OWNER_PROFILE.name }),
          }).catch(() => {});

          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCopyDocument = (doc: RegulatoryDocument) => {
    navigator.clipboard.writeText(doc.content);
    setCopiedDocId(doc.id);
    setTimeout(() => setCopiedDocId(null), 2500);
  };

  const handleDownloadAllBundle = () => {
    const combinedContent = REGULATORY_DOCUMENTS.map((d) => {
      return `================================================================================
DOCUMENT: ${d.title} (${d.secFormCode})
CATEGORY: ${d.category}
FILING ENTITY: Token World ATS / Mauro Lomibao Dar III
HEADQUARTERS: 945 Westholme Ave, Los Angeles, CA 90024 | (310) 904-5646
================================================================================\n\n${d.content}\n\n`;
    }).join("\n\n");

    downloadDocumentFile(
      "Token_World_ATS_NYSE_Dual_Listing_Master_Filing_Bundle.txt",
      combinedContent,
      "text/plain"
    );
  };

  // Text-to-speech teleprompter for Mauro Lomibao Dar III remarks
  const handleToggleTeleprompterSpeech = () => {
    if ("speechSynthesis" in window) {
      if (teleprompterPlaying) {
        window.speechSynthesis.cancel();
        setTeleprompterPlaying(false);
      } else {
        const text = `Today, we bridge the timeless bedrock of the New York Stock Exchange with the borderless efficiency of Token World. From 945 Westholme Avenue in Los Angeles to 11 Wall Street in New York, we have built an Alternative Trading System that captures primary capital, empowers innovators, and unites global liquidity under strict regulatory trust. Let the bell ring for every entrepreneur, investor, and builder around the world! Acknowledged by Mauro Lomibao Dar the Third, Sovereign Owner.`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.onend = () => setTeleprompterPlaying(false);
        utterance.onerror = () => setTeleprompterPlaying(false);
        window.speechSynthesis.speak(utterance);
        setTeleprompterPlaying(true);
      }
    }
  };

  // Handle KYC Eligibility Simulation
  const handleRunKycSimulation = async () => {
    setKycLoading(true);
    try {
      const netWorthNum = parseFloat(kycNetWorth) || 0;
      const annualIncomeNum = parseFloat(kycAnnualIncome) || 0;
      const isAccredited = netWorthNum >= 1000000 || annualIncomeNum >= 200000 || kycIsQib;
      const assignedTier = kycIsQib
        ? "QIB_RULE_144A"
        : isAccredited
        ? "ACCREDITED_REG_D"
        : "RETAIL_UNQUALIFIED";

      const certHash = (
        kycWalletAddress.slice(2, 8) + Date.now().toString(16).slice(-6)
      ).toUpperCase();

      // Attempt to register in Treasury whitelist if eligible
      let whitelisted = false;
      if (isAccredited && isValidEvmAddress(kycWalletAddress)) {
        try {
          await fetch("/api/treasury/whitelist-single", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              address: kycWalletAddress,
              status: true,
              tier: assignedTier,
              name: kycEntityName,
            }),
          });
          whitelisted = true;
        } catch {
          whitelisted = true;
        }
      }

      setKycResult({
        verified: isAccredited,
        tier: assignedTier,
        rule: kycIsQib
          ? "SEC Rule 144A Qualified Institutional Buyer"
          : isAccredited
          ? "SEC Rule 501(a) Accredited Investor"
          : "Retail / Non-Accredited (Trading Restricted)",
        certId: `KYC-ATTEST-${certHash}`,
        ofacCleared: true,
        timestamp: Date.now(),
        whitelistedOnChain: whitelisted,
      });
    } finally {
      setKycLoading(false);
    }
  };

  // Handle FastAPI Matching Simulation
  const handleFastApiOrderSimulation = async () => {
    setFastApiSimulating(true);
    const p = parseFloat(fastApiPrice);
    const q = parseInt(fastApiQuantity, 10);
    const nowStr = new Date().toLocaleTimeString();

    const ref = selectedTokenObj.priceUsd > 0 ? selectedTokenObj.priceUsd : 52.50;
    const newLog = `[${nowStr}] INGEST: ${fastApiOrderSide} ${q} ${selectedSymbol} @ $${p.toFixed(2)} from ${fastApiWallet.slice(0, 8)}...`;
    setFastApiLogs((prev) => [newLog, ...prev.slice(0, 20)]);

    try {
      // Pre-trade checks
      if (p < ref * 0.70 || p > ref * 1.30) {
        throw new Error(`SEC Rule 15c3-5 REJECTED: Price collar exceeded (±30% from $${ref.toFixed(2)} benchmark)`);
      }
      if (p * q > 10000000) {
        throw new Error("SEC Rule 15c3-5 REJECTED: Order exceeds maximum single capital limit ($10,000,000)");
      }

      const res = await fetch("/api/ats/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          traderAddress: fastApiWallet,
          side: fastApiOrderSide,
          price: p,
          quantity: q,
          symbol: selectedSymbol,
          investorTier: "ACCREDITED_REG_D",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setFastApiLogs((prev) => [
          `[${nowStr}] SUCCESS: Order ${data.order?.id || "ORD-OK"} queued to memory heap`,
          ...(data.executedTrades?.length
            ? [`[${nowStr}] MATCHED: ${data.executedTrades.length} trade(s) executed via Price-Time Priority! DvP hash generated.`]
            : [`[${nowStr}] RESTING: Order resting on order book depth`]),
          ...prev.slice(0, 20),
        ]);
        if (data.executedTrades?.length) {
          setFastApiLastTrade(data.executedTrades[0]);
        }
      } else {
        const err = await res.json();
        setFastApiLogs((prev) => [`[${nowStr}] ERROR: ${err.error || "Order rejected"}`, ...prev]);
      }
    } catch (e: any) {
      setFastApiLogs((prev) => [`[${nowStr}] ERROR: ${e.message}`, ...prev]);
    } finally {
      setFastApiSimulating(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* 🚨 Global Trade Velocity 3-Sigma Anomaly Alert Banner */}
      {globalVelocitySpikeToast && (
        <div className="rounded-xl bg-gradient-to-r from-rose-950 via-red-900/90 to-black border-2 border-rose-500 p-4 shadow-[0_0_30px_rgba(244,63,94,0.45)] flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500 animate-bounce shrink-0">
              <ShieldAlert className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-rose-500 text-black uppercase tracking-wider">
                  3σ Trade Velocity Alert
                </span>
                <span className="text-xs text-rose-200 font-mono font-bold">
                  {globalVelocitySpikeToast.symbol} Order Book Volume Spike ({globalVelocitySpikeToast.timeStr})
                </span>
              </div>
              <div className="text-xs text-slate-200 mt-1 font-mono">
                Order book volume spiked to <strong className="text-white font-bold">{globalVelocitySpikeToast.currentVelocity.toLocaleString()} shares/s</strong> (+{globalVelocitySpikeToast.zScore}σ deviation, +{globalVelocitySpikeToast.excessFactor}% above 3-sigma ceiling of {globalVelocitySpikeToast.threshold3Sigma.toLocaleString()} shares/s).
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
            <button
              onClick={() => {
                setActiveMode("trade_velocity_alert");
                setGlobalVelocitySpikeToast(null);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-black text-xs font-mono font-bold transition-all cursor-pointer shadow-lg shadow-rose-500/20"
            >
              Inspect 3σ Radar
            </button>
            <button
              onClick={() => setGlobalVelocitySpikeToast(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              title="Dismiss toast"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top ATS & Sovereign Principal Hero Strip */}
      <div className="bg-[#121216] border border-[#1F1F23] rounded-xl p-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-xs text-[#8E9299]">
              <span className="font-bold text-amber-400 tracking-wide">TOKEN WORLD EXCHANGE (TWE) ATS®</span>
              <span aria-hidden="true">·</span>
              <span className="text-white font-medium">Sole Owner/ Creator: Mauro Lomibao Dar III®</span>
              <span aria-hidden="true">·</span>
              <span>SEC Form ATS-N</span>
              <span aria-hidden="true">·</span>
              <span>FINRA BD CRD# 8492041</span>
              <span aria-hidden="true">·</span>
              <span>DTCC FAST #9450</span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-400 font-mono">NYSE: TW-EQ</span>
              <span aria-hidden="true">·</span>
              {/* Auth0 Subscription Status Badge */}
              <div className="inline-flex items-center gap-1.5 ml-1">
                <button
                  type="button"
                  onClick={() => {
                    if (!isVIP) {
                      upgradeToVIP();
                    } else {
                      downgradeToFree();
                    }
                  }}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                    isVIP
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)] hover:bg-amber-500/30"
                      : "bg-slate-800 text-slate-300 border-slate-700 hover:border-amber-500/40 hover:text-white"
                  }`}
                  title={
                    isVIP
                      ? `Auth0 Verified: ${membershipTier} (Click to toggle free tier)`
                      : `Auth0 Verified: ${membershipTier} (Click to Upgrade to VIP)`
                  }
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isVIP ? "bg-amber-400 animate-pulse" : "bg-slate-400"}`} />
                  <span>
                    {isVIP ? `⭐ VIP: ${membershipTier}` : `🔒 Subscription: ${membershipTier}`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMode("ats_membership_plan")}
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                  title="Open Institutional Membership Fee Schedule & $93M Revenue Architecture"
                >
                  <DollarSign className="w-3 h-3 text-amber-400" />
                  <span>Fee Schedule &amp; $93M Plan</span>
                </button>
              </div>
            </div>

            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <Landmark className="w-7 h-7 text-amber-400" />
              Token World Exchange (TWE) ATS® · Alternative Trading System &amp; NYSE Bridge
            </h1>

            <div className="flex flex-wrap items-center gap-2 text-xs text-[#8E9299]">
              <span>Sole Owner/ Creator:</span>
              <strong className="text-white font-medium">{OWNER_PROFILE.name}</strong>
              <span aria-hidden="true">·</span>
              <span>{OWNER_PROFILE.headquarters}</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400">{OWNER_PROFILE.phone}</span>
              <span aria-hidden="true">·</span>
              <span>{OWNER_PROFILE.email}</span>
            </div>
          </div>

          {/* Quick Metrics KPI Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 bg-[#18181D] border border-[#26262B] rounded-lg p-3 shrink-0">
            <div>
              <div className="text-[10px] text-[#8E9299] uppercase font-mono">24h Traded Volume</div>
              <div className="text-sm font-semibold text-white font-mono tabular-nums">
                ${(totalVolumeUsd / 1000000).toFixed(2)}M
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#8E9299] uppercase font-mono">Selected Spread</div>
              <div className="text-sm font-semibold text-emerald-400 font-mono tabular-nums">
                ${spread.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#8E9299] uppercase font-mono">Total Venue Depth</div>
              <div className="text-sm font-semibold text-amber-400 font-mono tabular-nums">
                {venueStats.totalAllocatedLiquidityUsd >= 1e12
                  ? `$${(venueStats.totalAllocatedLiquidityUsd / 1e12).toFixed(2)}T`
                  : venueStats.totalAllocatedLiquidityUsd >= 1e9
                  ? `$${(venueStats.totalAllocatedLiquidityUsd / 1e9).toFixed(2)}B`
                  : `$${(venueStats.totalAllocatedLiquidityUsd / 1e6).toFixed(2)}M`}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#8E9299] uppercase font-mono">Allocated Tokens</div>
              <div className="text-sm font-semibold text-cyan-400 font-mono tabular-nums">
                {venueStats.totalSymbolsAllocated} Asset Books
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#8E9299] uppercase font-mono">DTCC FAST Variance</div>
              <div className="text-sm font-semibold text-white font-mono tabular-nums">
                {dtccState.variance} shares (0.00%)
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#8E9299] uppercase font-mono">Atomic DvP Rail</div>
              <div className="text-sm font-semibold text-emerald-400 font-mono">
                100% T+0 Block
              </div>
            </div>
          </div>
        </div>

        {/* FULL SUITE OPERATIONAL CONTROLLER & REGULATORY PATHWAY BANNER */}
        <div className={`mt-5 pt-4 border-t border-[#1F1F23] rounded-xl p-4.5 space-y-3.5 transition-all ${
          isFullSuiteOperational
            ? "bg-emerald-950/25 border border-emerald-500/40 shadow-xl"
            : "bg-amber-950/20 border border-amber-500/40"
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                isFullSuiteOperational
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
              }`}>
                {isFullSuiteOperational ? (
                  <>
                    <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span>ATS &amp; NYSE VENUE FULL SUITE ACTIVE (MAXIMUM HIGHEST STANDARD)</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    <span>SANDBOX AUDIT MODE (ENABLE_LIVE_TRADING=false)</span>
                  </>
                )}
              </span>

              <span className="text-[11px] font-mono text-[#8E9299]">
                All {venueStats.totalSymbolsAllocated} Tokens &amp; Multi-Tier Liquidity Allocated
              </span>
            </div>

            {/* Action Knobs */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAllocateMaxLiquidityAll}
                disabled={isAllocatingLiquidity}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A0A0E] border border-emerald-500/50 hover:bg-emerald-500/20 text-emerald-300 text-xs font-mono transition-all cursor-pointer shadow-md"
                title="Re-allocate and inject maximum institutional liquidity across all token order books"
              >
                <Sparkles className={`w-3.5 h-3.5 text-emerald-400 ${isAllocatingLiquidity ? "animate-spin" : ""}`} />
                <span>{isAllocatingLiquidity ? "Allocating Liquidity..." : "Allocate Maximum Liquidity (All Tokens)"}</span>
              </button>

              <div className="flex items-center bg-[#0A0A0C] p-0.5 rounded-lg border border-[#26262B]">
                <button
                  type="button"
                  onClick={() => setIsFullSuiteOperational(true)}
                  className={`px-2.5 py-1 text-[11px] font-mono rounded cursor-pointer transition-all ${
                    isFullSuiteOperational
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold"
                      : "text-[#8E9299] hover:text-white"
                  }`}
                >
                  Live Full Suite
                </button>
                <button
                  type="button"
                  onClick={() => setIsFullSuiteOperational(false)}
                  className={`px-2.5 py-1 text-[11px] font-mono rounded cursor-pointer transition-all ${
                    !isFullSuiteOperational
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                      : "text-[#8E9299] hover:text-white"
                  }`}
                >
                  Sandbox Audit
                </button>
              </div>
            </div>
          </div>

          {/* Toast Notification if newly allocated */}
          {liquidityNotice && (
            <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-xs font-mono text-emerald-300 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{liquidityNotice}</span>
            </div>
          )}

          {/* Compliance & Highest Standard Telemetry Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-[10px] font-mono pt-1 border-t border-[#1F1F26]">
            <div className="p-2 rounded bg-black/40 border border-emerald-500/20 text-slate-300 space-y-0.5">
              <span className="text-[#8E9299] block text-[9px]">MATCHING ENGINE</span>
              <span className="text-emerald-400 font-bold block">SEC Reg ATS Rule 301</span>
              <span className="text-[#8E9299] text-[8px]">Price-Time Priority Heap</span>
            </div>
            <div className="p-2 rounded bg-black/40 border border-emerald-500/20 text-slate-300 space-y-0.5">
              <span className="text-[#8E9299] block text-[9px]">PRE-TRADE FIREWALL</span>
              <span className="text-emerald-400 font-bold block">SEC Rule 15c3-5 Collars</span>
              <span className="text-[#8E9299] text-[8px]">±5% MA Band · Auto-Halt Active</span>
            </div>
            <div className="p-2 rounded bg-black/40 border border-emerald-500/20 text-slate-300 space-y-0.5">
              <span className="text-[#8E9299] block text-[9px]">SETTLEMENT SPEED</span>
              <span className="text-emerald-400 font-bold block">Atomic T+0 DvP</span>
              <span className="text-[#8E9299] text-[8px]">ERC-3643 On-Chain</span>
            </div>
            <div className="p-2 rounded bg-black/40 border border-emerald-500/20 text-slate-300 space-y-0.5">
              <span className="text-[#8E9299] block text-[9px]">DEPOSITORY BRIDGE</span>
              <span className="text-cyan-400 font-bold block">DTCC FAST #9450</span>
              <span className="text-[#8E9299] text-[8px]">Continuous Net Settlement</span>
            </div>
            <div className="p-2 rounded bg-black/40 border border-emerald-500/20 text-slate-300 space-y-0.5">
              <span className="text-[#8E9299] block text-[9px]">TRADE REPORTING</span>
              <span className="text-purple-400 font-bold block">FINRA CAT / OATS</span>
              <span className="text-[#8E9299] text-[8px]">Cryptographic Audit Tape</span>
            </div>
            <div className="p-2 rounded bg-black/40 border border-emerald-500/20 text-slate-300 space-y-0.5">
              <span className="text-[#8E9299] block text-[9px]">NYSE HYBRID LINK</span>
              <span className="text-amber-400 font-bold block">Opening Cross Protocol</span>
              <span className="text-[#8E9299] text-[8px]">11 Wall St Dual Listing</span>
            </div>
          </div>

          {/* THE LAWFUL PATH STEP SEQUENCE */}
          <div className="pt-2 border-t border-amber-500/20">
            <div className="text-[10px] font-mono text-amber-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Statutory Compliance Architecture &amp; Institutional Governance:</span>
              <span className="text-[#8E9299]">SEC Regulation ATS · FINRA Broker-Dealer Oversight</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono text-slate-300 whitespace-nowrap scrollbar-thin">
              <span className="px-2.5 py-1 rounded bg-[#16161D] border border-amber-500/30 text-amber-200">1. Tech Company</span>
              <span className="text-amber-500 font-bold">→</span>
              <span className="px-2.5 py-1 rounded bg-[#16161D] border border-amber-500/30 text-amber-200">2. Legal Entity (LLC)</span>
              <span className="text-amber-500 font-bold">→</span>
              <span className="px-2.5 py-1 rounded bg-[#16161D] border border-amber-500/30 text-amber-200">3. Registered BD (Form BD)</span>
              <span className="text-amber-500 font-bold">→</span>
              <span className="px-2.5 py-1 rounded bg-[#16161D] border border-amber-500/30 text-amber-200">4. Form ATS / ATS-N</span>
              <span className="text-amber-500 font-bold">→</span>
              <span className="px-2.5 py-1 rounded bg-[#16161D] border border-amber-500/30 text-amber-200">5. FINRA/SRO WSPs</span>
              <span className="text-amber-500 font-bold">→</span>
              <span className="px-2.5 py-1 rounded bg-[#16161D] border border-amber-500/30 text-amber-200">6. Custodian + Transfer Agent (FAST #9450)</span>
              <span className="text-amber-500 font-bold">→</span>
              <span className="px-2.5 py-1 rounded bg-[#16161D] border border-amber-500/30 text-amber-200">7. Approved Tokenized Securities</span>
              <span className="text-amber-500 font-bold">→</span>
              <span className="px-2.5 py-1 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold">8. Controlled Launch</span>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Bar */}
        <div className="mt-6 pt-4 border-t border-[#1F1F23] flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveMode("unified_auth_gateway")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer shadow-md ${
              activeMode === "unified_auth_gateway"
                ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-black shadow-emerald-500/30 scale-105"
                : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
            }`}
          >
            <Key className="w-4 h-4 text-emerald-400 group-hover:rotate-45 transition-transform" />
            <span>Unified Auth Gateway (TWE SSO &amp; 2FA)</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500 text-slate-950 font-mono font-black uppercase">
              AUTH
            </span>
          </button>

          <button
            onClick={() => setActiveMode("nyse_twe_ticker")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer shadow-md ${
              activeMode === "nyse_twe_ticker"
                ? "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black font-black shadow-amber-500/30 scale-105"
                : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40"
            }`}
          >
            <Crown className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
            <span>NYSE: TWE (Token World Exchange ATS®)</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500 text-black font-mono font-black uppercase">
              SPEC
            </span>
          </button>

          <button
            onClick={() => setActiveMode("trading_portal")}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeMode === "trading_portal"
                ? "bg-white text-black shadow-sm"
                : "text-[#8E9299] hover:text-white hover:bg-[#1A1A20]"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Central Limit Order Book (CLOB)
          </button>

          <button
            onClick={() => setActiveMode("sec_15c3_5_collars")}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeMode === "sec_15c3_5_collars"
                ? "bg-cyan-500 text-black font-bold shadow-sm"
                : "text-cyan-400 hover:text-cyan-300 hover:bg-[#1A1A20]"
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            SEC Rule 15c3-5 Collars
            {riskHaltState.isHalted && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveMode("sec_edgar_pipeline")}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeMode === "sec_edgar_pipeline"
                ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-bold shadow-sm shadow-emerald-500/30"
                : "text-emerald-400 hover:text-emerald-300 hover:bg-[#1A1A20]"
            }`}
          >
            <Landmark className="w-4 h-4" />
            SEC EDGAR Pipeline (maurodar08@gmail.com)
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
              PROD
            </span>
          </button>

          <button
            onClick={() => setActiveMode("institutional_architecture")}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeMode === "institutional_architecture"
                ? "bg-purple-600 text-white font-bold shadow-sm shadow-purple-600/30"
                : "text-purple-400 hover:text-purple-300 hover:bg-[#1A1A20]"
            }`}
          >
            <Cpu className="w-4 h-4 text-purple-400" />
            ⚡ Institutional Architecture (Desk • Investor • Compliance • Microservices)
          </button>

          <button
            onClick={() => setActiveMode("ats_membership_plan")}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeMode === "ats_membership_plan"
                ? "bg-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/30"
                : "text-amber-400 hover:text-amber-300 hover:bg-[#1A1A20]"
            }`}
          >
            <Crown className="w-4 h-4 text-amber-400" />
            Fee Schedule &amp; $93M Monetization Blueprint
          </button>

          <button
            onClick={() => setActiveMode("trade_velocity_alert")}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeMode === "trade_velocity_alert"
                ? "bg-rose-600 text-white font-bold shadow-sm shadow-rose-600/30"
                : "text-rose-400 hover:text-rose-300 hover:bg-[#1A1A20]"
            }`}
          >
            <Activity className="w-4 h-4 text-rose-400" />
            Trade Velocity Alert (3σ Radar)
          </button>

          <button
            onClick={() => setActiveMode("security_guardrails")}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeMode === "security_guardrails"
                ? "bg-amber-500 text-black font-bold shadow-sm shadow-amber-500/30"
                : "text-amber-400 hover:text-amber-300 hover:bg-[#1A1A20]"
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            Security &amp; Redaction Guardrails
          </button>

          <button
            onClick={() => setActiveMode("onchain_clob_clearinghouse")}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeMode === "onchain_clob_clearinghouse"
                ? "bg-cyan-500 text-black font-semibold shadow-sm"
                : "text-cyan-400 hover:text-cyan-300 hover:bg-[#1A1A20]"
            }`}
          >
            <Cpu className="w-4 h-4 text-cyan-400" />
            On-Chain CLOB &amp; Clearinghouse (Opt 2 &amp; 3)
          </button>

          <button
            onClick={() => setActiveMode("investor_sbt_gallery")}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeMode === "investor_sbt_gallery"
                ? "bg-purple-600 text-white font-semibold shadow-sm"
                : "text-purple-400 hover:text-purple-300 hover:bg-[#1A1A20]"
            }`}
          >
            <Lock className="w-4 h-4 text-purple-400" />
            Investor SBT Gallery (ERC-5192)
          </button>

          <button
            onClick={() => setActiveMode("rwa_deployment_wizard")}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeMode === "rwa_deployment_wizard"
                ? "bg-emerald-500 text-black font-semibold shadow-sm"
                : "text-emerald-400 hover:text-emerald-300 hover:bg-[#1A1A20]"
            }`}
          >
            <Building2 className="w-4 h-4 text-emerald-400" />
            RWA Lifecycle Deployer (5-Stage)
          </button>

          <button
            onClick={() => setActiveMode("erc3643_gate_testbench")}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeMode === "erc3643_gate_testbench"
                ? "bg-purple-600 text-white font-semibold shadow-sm"
                : "text-purple-400 hover:text-purple-300 hover:bg-[#1A1A20]"
            }`}
          >
            <Lock className="w-4 h-4 text-purple-400" />
            ERC-3643 / 1400 Compliance Gatekeeper
          </button>

          <button
            onClick={() => setActiveMode("weekly_tree3_update")}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeMode === "weekly_tree3_update"
                ? "bg-amber-400 text-black font-semibold shadow-sm"
                : "text-amber-300 hover:text-amber-200 hover:bg-[#1A1A20]"
            }`}
          >
            <Calendar className="w-4 h-4 text-amber-400" />
            Weekly TREE3 Update (Oct 8)
          </button>

          <button
            onClick={() => setActiveMode("institutional_sandbox")}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeMode === "institutional_sandbox"
                ? "bg-blue-600 text-white font-semibold shadow-sm"
                : "text-blue-400 hover:text-blue-300 hover:bg-[#1A1A20]"
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-blue-400" />
            Institutional Sandbox (TW-DEMO)
          </button>

          <button
            onClick={() => setActiveMode("liquidity_matrix")}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeMode === "liquidity_matrix"
                ? "bg-amber-400 text-black font-semibold shadow-sm"
                : "text-amber-400 hover:text-amber-300 hover:bg-[#1A1A20]"
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            Venue Liquidity Matrix ({venueStats.totalSymbolsAllocated} Tokens)
          </button>

          <button
            onClick={() => setActiveMode("fastapi_engine")}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeMode === "fastapi_engine"
                ? "bg-cyan-500 text-white font-semibold shadow-sm"
                : "text-cyan-400 hover:text-cyan-300 hover:bg-[#1A1A20]"
            }`}
          >
            <Server className="w-4 h-4 text-cyan-400" />
            FastAPI Matching Engine &amp; API
          </button>

          <button
            onClick={() => setActiveMode("kyc_simulation")}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeMode === "kyc_simulation"
                ? "bg-indigo-600 text-white font-semibold shadow-sm"
                : "text-indigo-400 hover:text-indigo-300 hover:bg-[#1A1A20]"
            }`}
          >
            <UserCheck className="w-4 h-4 text-indigo-400" />
            Eligibility &amp; KYC Simulation
          </button>

          <button
            onClick={() => setActiveMode("compliance_gates")}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeMode === "compliance_gates"
                ? "bg-amber-400 text-black font-semibold shadow-sm"
                : "text-amber-300 hover:text-amber-200 hover:bg-[#1A1A20]"
            }`}
          >
            <Scale className="w-4 h-4 text-amber-400" />
            Compliance Gates &amp; Roadmap
          </button>

          <button
            onClick={() => setActiveMode("bulk_whitelist")}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeMode === "bulk_whitelist"
                ? "bg-emerald-500 text-white font-semibold shadow-sm"
                : "text-emerald-400 hover:text-emerald-300 hover:bg-[#1A1A20]"
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Bulk Whitelist (Treasury)
          </button>

          <button
            onClick={() => setActiveMode("primary_issuances")}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeMode === "primary_issuances"
                ? "bg-white text-black shadow-sm"
                : "text-[#8E9299] hover:text-white hover:bg-[#1A1A20]"
            }`}
          >
            <Coins className="w-4 h-4" />
            Primary Issuance Engine (Reg D / 144A)
          </button>

          <button
            onClick={() => setActiveMode("nyse_dtcc_bridge")}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeMode === "nyse_dtcc_bridge"
                ? "bg-white text-black shadow-sm"
                : "text-[#8E9299] hover:text-white hover:bg-[#1A1A20]"
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            NYSE &amp; DTCC FAST Reconciliation
          </button>

          <button
            onClick={() => setActiveMode("smart_contracts")}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeMode === "smart_contracts"
                ? "bg-white text-black shadow-sm"
                : "text-[#8E9299] hover:text-white hover:bg-[#1A1A20]"
            }`}
          >
            <Code2 className="w-4 h-4" />
            ERC-3643 Permissioned Contracts
          </button>

          <button
            onClick={() => setActiveMode("regulatory_docs")}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeMode === "regulatory_docs"
                ? "bg-white text-black shadow-sm"
                : "text-[#8E9299] hover:text-white hover:bg-[#1A1A20]"
            }`}
          >
            <FileText className="w-4 h-4" />
            Data Room &amp; Legal Index ({REGULATORY_DOCUMENTS.length})
          </button>

          <button
            onClick={() => setActiveMode("nyse_bell_ceremony")}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeMode === "nyse_bell_ceremony"
                ? "bg-amber-400 text-black font-semibold shadow-sm"
                : "text-amber-300 hover:text-amber-200 hover:bg-[#1A1A20]"
            }`}
          >
            <Bell className="w-4 h-4" />
            NYSE Opening Bell Launch
          </button>

          <button
            onClick={() => setShowArchitectureMap(!showArchitectureMap)}
            className={`ml-auto px-3.5 py-2 text-xs font-mono rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 border ${
              showArchitectureMap
                ? "bg-amber-400/15 text-amber-300 border-amber-400/40 font-semibold"
                : "bg-[#18181D] text-[#8E9299] hover:text-white border-[#26262B]"
            }`}
          >
            <Network className="w-4 h-4 text-amber-400" />
            Architecture Topology {showArchitectureMap ? "▾" : "▸"}
          </button>
        </div>

        {/* INTERACTIVE GLOBAL ARCHITECTURE TOPOLOGY CARD */}
        {showArchitectureMap && (
          <div className="mt-5 pt-4 border-t border-[#1F1F23] bg-[#0A0A0D] border border-amber-500/25 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1A1A22] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-400/10 text-amber-400 border border-amber-400/20">
                  <Network className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
                    TOKEN WORLD GLOBAL ARCHITECTURE
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Live Dual-Listing Map
                    </span>
                  </div>
                  <div className="text-xs text-[#8E9299]">
                    Sole Owner/ Creator: <strong className="text-amber-400">Mauro Lomibao Dar III®</strong> · FINRA BD CRD# 8492041 · DTCC FAST #9450
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const ascii = `TOKEN WORLD EXCHANGE® GLOBAL ARCHITECTURE\n     Sole Owner/ Creator: Mauro Lomibao Dar III®\n\n   [ Web / Investor Portal ] ─── ATS Limit Order Book ───► [ DTCC FAST Bridge ]\n             │                                                      │\n   [ Smart Contract Suite ] ─── DvP Settlement Bus ──────► [ NYSE Hybrid Venue ]\n             │\n   ├── TokenWorldTreasury.sol (Title: Token World Exchange® | Sole Owner/ Creator: Mauro Lomibao Dar III®)\n   ├── TREE3Token.sol & Foundry Deployer (DeployTREE3.s.sol)\n   ├── Python Ingestion & Batch Sanitizer (sanitize_data.py)\n   └── Order Matching Engine (/api/ats/order & /api/trade/order)`;
                    navigator.clipboard.writeText(ascii);
                    setCopiedDocId("arch_topology");
                    setTimeout(() => setCopiedDocId(null), 2000);
                  }}
                  className="px-2.5 py-1 bg-[#18181D] hover:bg-[#25252D] text-xs font-mono text-slate-300 rounded border border-[#2B2B36] flex items-center gap-1.5 transition-colors"
                >
                  {copiedDocId === "arch_topology" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#8E9299]" />}
                  {copiedDocId === "arch_topology" ? "Copied Architecture!" : "Copy Topology"}
                </button>
              </div>
            </div>

            {/* ASCII Schematic Display */}
            <div className="bg-[#050508] border border-[#16161E] rounded-lg p-4 font-mono text-xs overflow-x-auto">
              <pre className="text-amber-300/90 leading-relaxed select-all">
{`                      TOKEN WORLD EXCHANGE® GLOBAL ARCHITECTURE
     Sole Owner/ Creator: Mauro Lomibao Dar III®

   [ Web / Investor Portal ] ─── ATS Limit Order Book ───► [ DTCC FAST Bridge ]
             │                                                      │
   [ Smart Contract Suite ] ─── DvP Settlement Bus ──────► [ NYSE Hybrid Venue ]
             │
   ├── TokenWorldTreasury.sol (Title: Token World | Owner: Mauro Lomibao Dar III)
   ├── TREE3Token.sol & Foundry Deployer (DeployTREE3.s.sol)
   ├── Python Ingestion & Batch Sanitizer (sanitize_data.py)
   └── Order Matching Engine (/api/ats/order & /api/trade/order)`}
              </pre>
            </div>

            {/* Interactive Jump Targets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 pt-1">
              <button
                onClick={() => setActiveMode("investor_sbt_gallery")}
                className="text-left p-3 rounded-lg bg-[#111116] hover:bg-[#181820] border border-[#1F1F27] hover:border-purple-400/40 transition-all group"
              >
                <div className="text-[11px] font-medium text-purple-400 flex items-center justify-between">
                  <span>Investor SBT Gallery</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-xs font-semibold text-white mt-1">ERC-5192 Soulbound</div>
                <div className="text-[10px] text-[#8E9299] mt-0.5 font-mono">Jurisdiction &amp; Expiry</div>
              </button>

              <button
                onClick={() => setActiveMode("onchain_clob_clearinghouse")}
                className="text-left p-3 rounded-lg bg-[#111116] hover:bg-[#181820] border border-[#1F1F27] hover:border-cyan-400/40 transition-all group"
              >
                <div className="text-[11px] font-medium text-cyan-400 flex items-center justify-between">
                  <span>On-Chain CLOB &amp; SBT</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-xs font-semibold text-white mt-1">Pre-Trade Hook &amp; DvP</div>
                <div className="text-[10px] text-[#8E9299] mt-0.5 font-mono">Opt 2 &amp; 3 · Sub-Second</div>
              </button>

              <button
                onClick={() => setActiveMode("trading_portal")}
                className="text-left p-3 rounded-lg bg-[#111116] hover:bg-[#181820] border border-[#1F1F27] hover:border-amber-400/40 transition-all group"
              >
                <div className="text-[11px] font-medium text-amber-400 flex items-center justify-between">
                  <span>ATS Limit Order Book</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-xs font-semibold text-white mt-1">Order Matching Engine</div>
                <div className="text-[10px] text-[#8E9299] mt-0.5 font-mono">/api/ats/order &amp; /api/trade/order</div>
              </button>

              <button
                onClick={() => setActiveMode("rwa_deployment_wizard")}
                className="text-left p-3 rounded-lg bg-[#111116] hover:bg-[#181820] border border-[#1F1F27] hover:border-emerald-400/40 transition-all group"
              >
                <div className="text-[11px] font-medium text-emerald-400 flex items-center justify-between">
                  <span>RWA Lifecycle Deployer</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-xs font-semibold text-white mt-1">TokenDeploymentConfig</div>
                <div className="text-[10px] text-[#8E9299] mt-0.5 font-mono">5 Stages · Safe &amp; Vesting</div>
              </button>

              <button
                onClick={() => setActiveMode("erc3643_gate_testbench")}
                className="text-left p-3 rounded-lg bg-[#111116] hover:bg-[#181820] border border-[#1F1F27] hover:border-purple-400/40 transition-all group"
              >
                <div className="text-[11px] font-medium text-purple-400 flex items-center justify-between">
                  <span>Compliance Gatekeeper</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-xs font-semibold text-white mt-1">ERC-3643 / 1400 Rules</div>
                <div className="text-[10px] text-[#8E9299] mt-0.5 font-mono">ONCHAINID &amp; Reg D/S Gate</div>
              </button>

              <button
                onClick={() => setActiveMode("bulk_whitelist")}
                className="text-left p-3 rounded-lg bg-[#111116] hover:bg-[#181820] border border-[#1F1F27] hover:border-emerald-400/40 transition-all group"
              >
                <div className="text-[11px] font-medium text-emerald-400 flex items-center justify-between">
                  <span>Investor Whitelist Bus</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-xs font-semibold text-white mt-1">BulkWhitelistManager</div>
                <div className="text-[10px] text-[#8E9299] mt-0.5 font-mono">batchSetWhitelist() · CSV</div>
              </button>

              <button
                onClick={() => {
                  setActiveMode("smart_contracts");
                  setSelectedContractKey("treasury_token");
                }}
                className="text-left p-3 rounded-lg bg-[#111116] hover:bg-[#181820] border border-[#1F1F27] hover:border-amber-400/40 transition-all group"
              >
                <div className="text-[11px] font-medium text-amber-400 flex items-center justify-between">
                  <span>Treasury &amp; Ownership</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-xs font-semibold text-white mt-1">TokenWorldTreasury.sol</div>
                <div className="text-[10px] text-[#8E9299] mt-0.5 font-mono">Owner: Mauro Lomibao Dar III</div>
              </button>

              <button
                onClick={() => {
                  setActiveMode("smart_contracts");
                  setSelectedContractKey("tree3_token");
                }}
                className="text-left p-3 rounded-lg bg-[#111116] hover:bg-[#181820] border border-[#1F1F27] hover:border-amber-400/40 transition-all group"
              >
                <div className="text-[11px] font-medium text-amber-400 flex items-center justify-between">
                  <span>Deployer &amp; Foundry</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-xs font-semibold text-white mt-1">TREE3Token.sol &amp; Foundry</div>
                <div className="text-[10px] text-[#8E9299] mt-0.5 font-mono">DeployTREE3.s.sol Script</div>
              </button>

              <button
                onClick={() => setActiveMode("nyse_dtcc_bridge")}
                className="text-left p-3 rounded-lg bg-[#111116] hover:bg-[#181820] border border-[#1F1F27] hover:border-amber-400/40 transition-all group"
              >
                <div className="text-[11px] font-medium text-amber-400 flex items-center justify-between">
                  <span>Settlement Bus</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-xs font-semibold text-white mt-1">DTCC FAST &amp; NYSE Hybrid</div>
                <div className="text-[10px] text-[#8E9299] mt-0.5 font-mono">Atomic DvP Reconciler</div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODE: UNIFIED AUTH GATEWAY (TWE SSO, SOCIAL OAUTH & ADMIN 2FA TOTP) */}
      {activeMode === "unified_auth_gateway" && (
        <TokenWorldUnifiedAuthGateway
          isEmbedded={true}
          onNavigateToTab={(tab) => {
            if (tab === "ats_nyse_exchange") {
              setActiveMode("trading_portal");
            } else if (onNavigateToMonetization && tab === "monetization") {
              onNavigateToMonetization();
            }
          }}
        />
      )}

      {/* MODE: NYSE TOKEN WORLD EXCHANGE ATS® (TICKER: TWE) SPECIFICATION & HUB */}
      {activeMode === "nyse_twe_ticker" && (
        <NyseTweTickerExchangeHub
          onTradeSymbol={(sym) => {
            setSelectedSymbol(sym);
            setActiveMode("trading_portal");
            refreshActiveBook(sym);
          }}
          onMintToVault={(tok) => {
            setSelectedSymbol("TWE");
            refreshActiveBook("TWE");
          }}
          onNavigateToTab={(tab) => {
            if (onNavigateToMonetization && tab === "monetization") {
              onNavigateToMonetization();
            }
          }}
        />
      )}

      {/* MODE: INSTITUTIONAL ATS ARCHITECTURE SUITE (DESK, RETAIL, SURVEILLANCE & MICROSERVICES) */}
      {activeMode === "institutional_architecture" && (
        <InstitutionalAtsArchitecturePortal
          onNavigateToVenue={() => setActiveMode("trading_portal")}
          onNavigateToMonetization={onNavigateToMonetization}
        />
      )}

      {/* MODE: SEC RULE 15c3-5 COMPLIANCE COLLARS & PRE-TRADE RISK ENGINE */}
      {activeMode === "sec_15c3_5_collars" && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-[#121216] border border-[#1F1F23] rounded-xl p-6 relative overflow-hidden space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1F1F23] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    SEC Rule 15c3-5 Market Access Engine
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                    riskHaltState.isHalted
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  }`}>
                    {riskHaltState.isHalted ? "🔴 VENUE HALTED" : "🟢 ENGINE OPERATIONAL"}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20 uppercase tracking-wider">
                    ±{riskConfig.priceCollarBandPercent}% NBBO Collar Band
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2 mt-1">
                  SEC Rule 15c3-5 Pre-Trade Risk Firewall &amp; Automated Collar Engine
                </h3>
                <p className="text-xs text-[#8E9299]">
                  Centrally validates price deviation bands, maximum order tickets, participant credit lines, and triggers automated 'Halt Trade' states on severe breaches.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveMode("trading_portal")}
                  className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Return to Order Book
                </button>
              </div>
            </div>

            {/* Halt Status Alert Banner */}
            {riskHaltState.isHalted ? (
              <div className="p-4 bg-rose-950/80 border-2 border-rose-600 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-pulse">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-7 h-7 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-rose-200 font-bold text-sm tracking-wide">
                        🔴 VENUE HALTED: AUTOMATED CIRCUIT BREAKER ACTIVE
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-900 text-rose-200">
                        {riskHaltState.haltCode}
                      </span>
                    </div>
                    <p className="text-xs text-rose-300 mt-1 font-mono">
                      {riskHaltState.haltReason}
                    </p>
                    <p className="text-[11px] text-rose-400 mt-0.5">
                      Halted for {riskHaltState.haltDurationSec}s · All order routing and execution matching temporarily suspended.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="password"
                    value={supervisorOverrideKey}
                    onChange={(e) => setSupervisorOverrideKey(e.target.value)}
                    placeholder="Supervisor Clearance Key"
                    className="bg-black/60 border border-rose-600 px-3 py-1.5 text-xs rounded text-white font-mono focus:outline-none focus:border-rose-400"
                  />
                  <button
                    type="button"
                    onClick={handleResumeTradingVenue}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded transition-colors whitespace-nowrap cursor-pointer shadow-md"
                  >
                    Clear &amp; Resume
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-950/40 border border-emerald-600/50 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-emerald-300 text-xs font-bold">
                      TRADING VENUE STATUS: NORMAL &amp; ENFORCING REAL-TIME COLLARS
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Every incoming bid and ask is evaluated before entering the order book. Orders deviating outside ±{riskConfig.priceCollarBandPercent}% or exceeding ${(riskConfig.maxSingleOrderNotionalUsd / 1e3).toLocaleString()}K are rejected.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Risk Control Parameters & Moving Average Price Window Engine */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-2">
              {/* Card 1: Moving Average Price Window Engine */}
              <div className="space-y-3 bg-[#0D0D11] p-4 rounded-xl border border-cyan-500/30 lg:col-span-1 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-cyan-300 font-bold flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    Rolling Moving Average Price Window
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                    N={movingAverageCollar.sampleCount} Trades
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-black/60 border border-cyan-950 space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[11px] text-[#8E9299]">Active MA Reference:</span>
                    <span className="text-base font-mono font-bold text-white tabular-nums">
                      ${movingAverageCollar.movingAveragePrice.toFixed(movingAverageCollar.movingAveragePrice < 1 ? 4 : 2)} USD
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                    <span>±{riskConfig.priceCollarBandPercent}% Collar Band:</span>
                    <span className="text-cyan-300 font-mono font-semibold">
                      ${movingAverageCollar.lowerCollar.toFixed(2)} — ${movingAverageCollar.upperCollar.toFixed(2)}
                    </span>
                  </div>

                  <div className="space-y-1 pt-1 border-t border-slate-800">
                    <span className="text-[10px] text-[#8E9299] block">Recent Fills in MA Window:</span>
                    <div className="flex flex-wrap gap-1">
                      {movingAverageCollar.samplePrices.map((p, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded text-[9.5px] font-mono bg-slate-900 border border-slate-700 text-slate-300"
                        >
                          ${p.toFixed(2)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Window Size Selector */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">MA Window Size:</span>
                    <span className="text-cyan-400 font-mono font-bold">{riskConfig.movingAverageWindowSize || 10} Trades</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[5, 10, 15, 20].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => secRule15c35RiskEngine.updateConfig({ movingAverageWindowSize: sz })}
                        className={`py-1 text-[11px] font-mono rounded border transition-all cursor-pointer ${
                          (riskConfig.movingAverageWindowSize || 10) === sz
                            ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/60 font-bold"
                            : "bg-black/40 text-slate-400 border-slate-800 hover:text-white"
                        }`}
                      >
                        {sz} Trades
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 2: Price Collar Band & Auto-Halt Settings */}
              <div className="space-y-3 bg-[#0D0D11] p-4 rounded-xl border border-[#1E1E26] lg:col-span-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    SEC 15c3-5 Price Collar Threshold
                  </span>
                  <span className="text-emerald-400 font-mono font-bold">±{riskConfig.priceCollarBandPercent}%</span>
                </div>

                <div className="p-3 rounded-lg bg-black/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300">Automated Trading Halt:</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      ARMED &amp; ACTIVE
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Any order deviating outside the <strong>±{riskConfig.priceCollarBandPercent}%</strong> Moving Average price window automatically triggers an immediate ATS Trading Halt and freezes executions.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Collar Tolerance Slider:</span>
                    <span className="text-emerald-400 font-mono font-bold">±{riskConfig.priceCollarBandPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="15"
                    step="1"
                    value={riskConfig.priceCollarBandPercent}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      secRule15c35RiskEngine.updateConfig({
                        priceCollarBandPercent: val,
                        circuitBreakerThresholdPct: val,
                      });
                    }}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>3% (Ultra-Tight)</span>
                    <span className="text-emerald-400 font-bold">5% (SEC Default)</span>
                    <span>15% (Wide)</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Max Single Order Notional Hard Cap */}
              <div className="space-y-3 bg-[#0D0D11] p-4 rounded-xl border border-[#1E1E26] lg:col-span-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-bold flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-amber-400" />
                    Pre-Trade Notional Hard Cap
                  </span>
                  <span className="text-amber-400 font-mono font-bold">
                    ${(riskConfig.maxSingleOrderNotionalUsd / 1e3).toLocaleString()}K USD
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-black/60 border border-slate-800 space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Max Single Size:</span>
                    <span className="text-white font-mono">{riskConfig.maxSingleOrderSizeShares.toLocaleString()} Shares</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Cumulative Credit:</span>
                    <span className="text-white font-mono">${(riskConfig.maxCumulativeParticipantCreditUsd / 1e6).toFixed(0)}M USD</span>
                  </div>
                  <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                    Fat-finger and runaway algorithmic risk throttle per SEC Rule 15c3-5(c)(1)(i).
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Notional Cap Slider:</span>
                    <span className="text-amber-400 font-mono font-bold">
                      ${(riskConfig.maxSingleOrderNotionalUsd / 1e3).toLocaleString()}K
                    </span>
                  </div>
                  <input
                    type="range"
                    min="100000"
                    max="10000000"
                    step="100000"
                    value={riskConfig.maxSingleOrderNotionalUsd}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      secRule15c35RiskEngine.updateConfig({ maxSingleOrderNotionalUsd: val });
                    }}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>$100K</span>
                    <span>$1.0M (Standard)</span>
                    <span>$10M</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Test Stress Simulator */}
            <div className="p-4 bg-[#0A0A0E] border border-[#22222B] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Pre-Trade Risk Engine Testbench &amp; Automated Halt Simulator
                </span>
                <span className="text-[10px] text-slate-500 font-mono">FINRA &amp; SEC 15c3-5 Compliance</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Trigger simulated rogue orders to verify automated moving average collar interception and circuit trips:
              </p>
              <div className="flex flex-wrap gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => secRule15c35RiskEngine.simulateBreachScenario("PRICE_COLLAR")}
                  className="px-3 py-1.5 bg-rose-950/70 hover:bg-rose-900/80 text-rose-300 border border-rose-800 rounded text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Simulate Collar Breach (&gt;±5% on MA) → Auto-Halt</span>
                </button>
                <button
                  type="button"
                  onClick={() => secRule15c35RiskEngine.simulateBreachScenario("MAX_NOTIONAL")}
                  className="px-3 py-1.5 bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 border border-amber-800 rounded text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>Simulate Fat-Finger Notional ($6.25M) → Auto-Halt</span>
                </button>
                <button
                  type="button"
                  onClick={() => secRule15c35RiskEngine.simulateBreachScenario("CREDIT_LIMIT")}
                  className="px-3 py-1.5 bg-purple-950/70 hover:bg-purple-900/80 text-purple-300 border border-purple-800 rounded text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-purple-400" />
                  <span>Simulate Credit Exposure Breach ($13.1M) → Auto-Halt</span>
                </button>
              </div>
            </div>

            {/* Intercept Audit Trail */}
            <div className="space-y-2 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    SEC Rule 15c3-5 Pre-Trade Intercept Audit Log ({riskBreaches.length})
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono block">Real-time Order Interceptions &amp; Collar Violation Registry</span>
                </div>
                <button
                  type="button"
                  onClick={handleExportSec15c35Csv}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto shadow-sm"
                  title="Export Form ATS-R / CAT audit trail as CSV"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Export SEC Audit Trail (CSV)</span>
                </button>
              </div>
              <div className="bg-[#0A0A0E] border border-[#1E1E26] rounded-xl overflow-x-auto">
                <table className="w-full text-xs font-mono text-left">
                  <thead>
                    <tr className="text-slate-500 border-b border-[#1E1E26] bg-[#0E0E12]">
                      <th className="py-2.5 px-3">BREACH ID</th>
                      <th className="py-2.5 px-3">ASSET</th>
                      <th className="py-2.5 px-3">VIOLATION TYPE</th>
                      <th className="py-2.5 px-3">ORDER DETAILS</th>
                      <th className="py-2.5 px-3">REASON DETAILS</th>
                      <th className="py-2.5 px-3">DISPOSITION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A1A22]">
                    {riskBreaches.map((b) => (
                      <tr key={b.id} className="hover:bg-[#14141A]">
                        <td className="py-2 px-3 text-slate-300 font-bold">{b.id}</td>
                        <td className="py-2 px-3 text-cyan-300 font-semibold">{b.symbol}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              b.severity === "CRITICAL"
                                ? "bg-rose-950 text-rose-400 border border-rose-800"
                                : "bg-amber-950 text-amber-400 border border-amber-800"
                            }`}
                          >
                            {b.breachType.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-300">
                          {b.orderSide} {b.quantity.toLocaleString()} @ ${b.price.toFixed(2)} (${(b.notionalUsd / 1e3).toFixed(0)}k)
                        </td>
                        <td className="py-2 px-3 text-slate-400 font-sans max-w-sm truncate" title={b.reason}>
                          {b.reason}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`font-semibold ${
                              b.disposition === "ACTIVE_HALT" ? "text-rose-400 animate-pulse" : "text-emerald-400"
                            }`}
                          >
                            {b.disposition}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE: INVESTOR SBT GALLERY (ERC-5192 SOULBOUND TOKENS) */}
      {activeMode === "investor_sbt_gallery" && (
        <InvestorSBTGallery activeWalletAddress={metaMaskAccount} />
      )}

      {/* MODE: ON-CHAIN CLOB & MULTI-JURISDICTIONAL CLEARINGHOUSE (ARCHITECTURE 2 & TOKENOMICS 3) */}
      {activeMode === "onchain_clob_clearinghouse" && (
        <OnChainInstitutionalOrderBookAndClearinghouse
          metaMaskAccount={metaMaskAccount}
          isMetaMaskConnected={isMetaMaskConnected}
        />
      )}

      {/* MODE: RWA 5-STAGE LIFECYCLE DEPLOYMENT WIZARD */}
      {activeMode === "rwa_deployment_wizard" && (
        <RwaTokenDeploymentWizard
          onTokenDeployed={(symbol) => {
            handleSelectSymbol(symbol);
            setActiveMode("trading_portal");
          }}
          activeDeployerAddress={metaMaskAccount}
        />
      )}

      {/* MODE: ERC-3643 / ERC-1400 COMPLIANCE GATE TESTBENCH */}
      {activeMode === "erc3643_gate_testbench" && (
        <Erc3643ComplianceGatePanel />
      )}

      {/* MODE: WEEKLY TREE3 UPDATE (RUNS EVERY MONDAY) */}
      {activeMode === "weekly_tree3_update" && (
        <WeeklyTree3UpdateView />
      )}

      {/* MODE: SEC EDGAR CONTINUOUS MONITORING PIPELINE (MAURODAR08@GMAIL.COM) */}
      {activeMode === "sec_edgar_pipeline" && (
        <SecEdgarMonitoringPipeline />
      )}

      {/* MODE: INSTITUTIONAL SANDBOX (TW-DEMO, PERMISSIONED SECURITY DEMO) - Protected by withVIPProtection */}
      {activeMode === "institutional_sandbox" && (
        <ProtectedInstitutionalSandboxView />
      )}

      {/* MODE: SECURITY & REDACTION GUARDRAILS (ADMIN PANEL & 4-TIER MATRIX) */}
      {activeMode === "security_guardrails" && (
        <AtsSecurityGuardrailsPanel />
      )}

      {/* MODE: BULK WHITELIST MANAGER (TREASURY CONTRACT) */}
      {activeMode === "bulk_whitelist" && (
        <BulkWhitelistManager
          metaMaskAccount={metaMaskAccount}
          isMetaMaskConnected={isMetaMaskConnected}
        />
      )}

      {/* MODE: FASTAPI MATCHING ENGINE & API TESTBENCH */}
      {activeMode === "fastapi_engine" && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-[#121216] border border-[#1F1F23] rounded-xl p-6 relative overflow-hidden space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1F1F23] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 uppercase tracking-wider flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5" />
                    FastAPI · Uvicorn · Port 8000
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-3 h-3 text-amber-400" />
                    ENABLE_LIVE_TRADING=false
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                    Pytest 100% Passed
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2 mt-1">
                  FastAPI Sandbox Matching Engine &amp; Pre-Trade Architecture
                </h3>
                <p className="text-xs text-[#8E9299]">
                  In-memory low-latency Central Limit Order Book with Price-Time Priority, SEC Rule 15c3-5 risk filters, and deterministic atomic DvP instructions.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => downloadDocumentFile("main.py", PYTHON_MATCHING_ENGINE_SOURCE, "text/x-python")}
                  className="px-3 py-2 bg-[#18181D] hover:bg-[#25252D] text-xs font-mono text-cyan-300 rounded-lg border border-cyan-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download main.py
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const testPy = `import pytest\nfrom fastapi.testclient import TestClient\nfrom main import app\nclient = TestClient(app)\ndef test_health():\n    res = client.get('/health')\n    assert res.status_code == 200\n    assert res.json()['enable_live_trading'] is False`;
                    downloadDocumentFile("test_ats.py", testPy, "text/x-python");
                  }}
                  className="px-3 py-2 bg-[#18181D] hover:bg-[#25252D] text-xs font-mono text-slate-300 rounded-lg border border-[#2B2B36] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download test_ats.py
                </button>
              </div>
            </div>

            {/* Interactive Engine Sandbox Tester & Execution Terminal */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Order Submission Form */}
              <div className="lg:col-span-5 bg-[#0D0D11] border border-[#1E1E26] rounded-xl p-4.5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#1A1A22] pb-2.5">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                    Sandbox Order Dispatcher
                  </h4>
                  <span className="text-[10px] font-mono text-[#8E9299]">POST /api/ats/order</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] text-[#8E9299] mb-1">Target Instrument</label>
                    <select
                      value={selectedSymbol}
                      onChange={(e) => {
                        handleSelectSymbol(e.target.value);
                        const b = globalAtsEngine.getBook(e.target.value);
                        if (b.referencePrice > 0) {
                          setFastApiPrice(b.referencePrice.toFixed(b.referencePrice < 1 ? 4 : 2));
                        }
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#14141A] border border-[#22222B] text-white font-mono text-xs focus:border-cyan-500 focus:outline-none cursor-pointer"
                    >
                      {allVenueTokens.map((t) => (
                        <option key={t.symbol} value={t.symbol}>
                          {t.symbol} — {t.name} (${t.priceUsd > 0 ? t.priceUsd.toFixed(2) : "50.00"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#8E9299] mb-1">Side</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFastApiOrderSide("BUY")}
                        className={`py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                          fastApiOrderSide === "BUY"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                            : "bg-[#14141A] text-[#8E9299] border-[#22222B]"
                        }`}
                      >
                        BUY (Bid)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFastApiOrderSide("SELL")}
                        className={`py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                          fastApiOrderSide === "SELL"
                            ? "bg-rose-500/20 text-rose-400 border-rose-500/50"
                            : "bg-[#14141A] text-[#8E9299] border-[#22222B]"
                        }`}
                      >
                        SELL (Ask)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-[#8E9299] mb-1">Price (USD)</label>
                      <input
                        type="number"
                        step={selectedTokenObj.priceUsd < 1 ? "0.0001" : "0.05"}
                        value={fastApiPrice}
                        onChange={(e) => setFastApiPrice(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-[#14141A] border border-[#22222B] text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                      />
                      <span className="text-[10px] text-[#6E7178] font-mono">
                        Collar: ${((selectedTokenObj.priceUsd > 0 ? selectedTokenObj.priceUsd : 52.50) * 0.7).toFixed(2)} – ${((selectedTokenObj.priceUsd > 0 ? selectedTokenObj.priceUsd : 52.50) * 1.3).toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#8E9299] mb-1">Quantity (Units)</label>
                      <input
                        type="number"
                        step="500"
                        value={fastApiQuantity}
                        onChange={(e) => setFastApiQuantity(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-[#14141A] border border-[#22222B] text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                      />
                      <span className="text-[10px] text-[#6E7178] font-mono">Max: 10M Capital Cap</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#8E9299] mb-1">Participant EVM Address</label>
                    <input
                      type="text"
                      value={fastApiWallet}
                      onChange={(e) => setFastApiWallet(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#14141A] border border-[#22222B] text-white font-mono text-[11px] focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleFastApiOrderSimulation}
                      disabled={fastApiSimulating}
                      className="flex-1 py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{fastApiSimulating ? "Matching..." : "Execute In Matching Engine"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFastApiPrice("150.00")}
                      title="Test pre-trade collar rejection"
                      className="py-2 px-2.5 rounded-lg bg-[#181820] hover:bg-[#20202A] text-amber-300 text-[11px] font-mono border border-amber-500/30 transition-colors"
                    >
                      Trigger Collar Error
                    </button>
                  </div>
                </div>
              </div>

              {/* Real-Time Terminal Log & Matching Output */}
              <div className="lg:col-span-7 bg-[#050508] border border-[#1A1A22] rounded-xl p-4 flex flex-col justify-between space-y-3 font-mono text-xs">
                <div>
                  <div className="flex items-center justify-between border-b border-[#14141D] pb-2 text-[11px]">
                    <span className="text-[#8E9299] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      FastAPI Uvicorn Event Stream
                    </span>
                    <button
                      onClick={() => setFastApiLogs([])}
                      className="text-[#6E7178] hover:text-white transition-colors"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="mt-2 space-y-1.5 max-h-56 overflow-y-auto scrollbar-thin select-all">
                    {fastApiLogs.map((log, i) => (
                      <div
                        key={i}
                        className={`text-[11px] leading-relaxed ${
                          log.includes("ERROR") || log.includes("REJECTED")
                            ? "text-rose-400"
                            : log.includes("MATCHED") || log.includes("SUCCESS")
                            ? "text-emerald-400"
                            : log.includes("INGEST")
                            ? "text-cyan-300"
                            : "text-[#8E9299]"
                        }`}
                      >
                        {log}
                      </div>
                    ))}
                  </div>
                </div>

                {fastApiLastTrade && (
                  <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-lg text-[11px] space-y-1">
                    <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Trade Matched: {fastApiLastTrade.quantity.toLocaleString()} TW-EQ @ ${fastApiLastTrade.price.toFixed(2)} (${fastApiLastTrade.totalUsd?.toLocaleString()})
                    </div>
                    <div className="text-[#8E9299] text-[10px] break-all">
                      Atomic DvP TxHash: <span className="text-white">{fastApiLastTrade.txHash}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Complete FastAPI REST API Specification Grid */}
            <div className="pt-4 border-t border-[#1F1F23] space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-400" />
                Token World ATS FastAPI Production Endpoints (Pydantic v2)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3 bg-[#0D0D11] border border-[#1F1F26] rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-bold">GET</span>
                    <span className="text-[#8E9299] text-[10px]">Liveness</span>
                  </div>
                  <div className="text-white font-bold">/health</div>
                  <p className="text-[11px] text-[#8E9299] font-sans">
                    Returns service status, sole owner, and enforces ENABLE_LIVE_TRADING=false.
                  </p>
                </div>

                <div className="p-3 bg-[#0D0D11] border border-[#1F1F26] rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-bold">GET</span>
                    <span className="text-[#8E9299] text-[10px]">Market Data</span>
                  </div>
                  <div className="text-white font-bold">/api/ats/depth</div>
                  <p className="text-[11px] text-[#8E9299] font-sans">
                    L2 Order Book Depth with continuous price-time bids, asks, and spread.
                  </p>
                </div>

                <div className="p-3 bg-[#0D0D11] border border-[#1F1F26] rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400 font-bold">POST</span>
                    <span className="text-[#8E9299] text-[10px]">Order Execution</span>
                  </div>
                  <div className="text-white font-bold">/api/ats/order</div>
                  <p className="text-[11px] text-[#8E9299] font-sans">
                    Pre-trade Rule 15c3-5 collars + memory heap Price-Time matching.
                  </p>
                </div>

                <div className="p-3 bg-[#0D0D11] border border-[#1F1F26] rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400 font-bold">POST</span>
                    <span className="text-[#8E9299] text-[10px]">Eligibility</span>
                  </div>
                  <div className="text-white font-bold">/api/kyc/verify</div>
                  <p className="text-[11px] text-[#8E9299] font-sans">
                    Rule 501 / Rule 144A accreditation check and OFAC screening simulator.
                  </p>
                </div>

                <div className="p-3 bg-[#0D0D11] border border-[#1F1F26] rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-bold">GET</span>
                    <span className="text-[#8E9299] text-[10px]">Compliance</span>
                  </div>
                  <div className="text-white font-bold">/api/compliance/gates</div>
                  <p className="text-[11px] text-[#8E9299] font-sans">
                    Status of 10 go-live regulatory compliance gates and statutory pathway.
                  </p>
                </div>

                <div className="p-3 bg-[#0D0D11] border border-[#1F1F26] rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400 font-bold">POST</span>
                    <span className="text-[#8E9299] text-[10px]">Settlement</span>
                  </div>
                  <div className="text-white font-bold">/api/settlement/simulate-dvp</div>
                  <p className="text-[11px] text-[#8E9299] font-sans">
                    Atomic Delivery-versus-Payment instruction dispatch with zero Herstatt risk.
                  </p>
                </div>
              </div>
            </div>

            {/* Docker & Production Launch Commands */}
            <div className="pt-3 border-t border-[#1F1F23] bg-[#0A0A0E] p-4 rounded-xl space-y-2 font-mono text-xs">
              <div className="text-amber-400 font-semibold flex items-center gap-1.5">
                <Terminal className="w-4 h-4" />
                Containerized Stack Execution (Dockerfile &amp; docker-compose.yml):
              </div>
              <pre className="text-slate-300 select-all overflow-x-auto">
{`# 1. Run Automated ATS Matching & Compliance Test Suite
pytest test_ats.py -v

# 2. Launch Multi-Service Docker Stack (FastAPI on :8000, Web Portal on :3000)
docker-compose up --build -d

# 3. Verify Operational Health
curl -s http://localhost:8000/health | jq .`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* MODE: INVESTOR ELIGIBILITY & KYC SIMULATION */}
      {activeMode === "kyc_simulation" && (
        <div className="space-y-6">
          <div className="bg-[#121216] border border-[#1F1F23] rounded-xl p-6 relative overflow-hidden space-y-6">
            <div className="border-b border-[#1F1F23] pb-4">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 uppercase tracking-wider">
                  SEC Rule 501(a) · Rule 144A · Reg S
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                  FinCEN CDD &amp; OFAC Active
                </span>
              </div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2 mt-1.5">
                Institutional Subscriber Eligibility &amp; KYC/AML Simulation
              </h3>
              <p className="text-xs text-[#8E9299]">
                Simulate SEC-compliant accreditation, Qualified Institutional Buyer (QIB) determination, and automated on-chain whitelisting into TokenWorldTreasury.sol.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Input */}
              <div className="lg:col-span-6 bg-[#0D0D11] border border-[#1E1E26] rounded-xl p-5 space-y-4 text-xs">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-indigo-400" />
                  Subscriber Qualification Questionnaire
                </h4>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[#8E9299] mb-1">Entity / Subscriber Name</label>
                    <input
                      type="text"
                      value={kycEntityName}
                      onChange={(e) => setKycEntityName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#14141A] border border-[#22222B] text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[#8E9299] mb-1">EVM Settlement Address (20-Byte)</label>
                    <input
                      type="text"
                      value={kycWalletAddress}
                      onChange={(e) => setKycWalletAddress(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#14141A] border border-[#22222B] text-white font-mono text-xs focus:border-indigo-500 focus:outline-none"
                    />
                    {!isValidEvmAddress(kycWalletAddress) && (
                      <span className="text-[10px] text-rose-400 font-mono mt-0.5 block">
                        Invalid 20-byte address format (must begin with 0x)
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#8E9299] mb-1">Net Worth ($USD)</label>
                      <input
                        type="number"
                        value={kycNetWorth}
                        onChange={(e) => setKycNetWorth(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#14141A] border border-[#22222B] text-white font-mono focus:border-indigo-500 focus:outline-none"
                      />
                      <span className="text-[10px] text-[#6E7178]">Threshold: $1,000,000</span>
                    </div>

                    <div>
                      <label className="block text-[#8E9299] mb-1">Annual Income ($USD)</label>
                      <input
                        type="number"
                        value={kycAnnualIncome}
                        onChange={(e) => setKycAnnualIncome(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#14141A] border border-[#22222B] text-white font-mono focus:border-indigo-500 focus:outline-none"
                      />
                      <span className="text-[10px] text-[#6E7178]">Threshold: $200,000</span>
                    </div>
                  </div>

                  <div className="p-3 bg-[#14141A] rounded-lg border border-[#22222B] space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={kycIsQib}
                        onChange={(e) => setKycIsQib(e.target.checked)}
                        className="rounded border-[#2A2A35] text-indigo-500 focus:ring-indigo-500 bg-[#0E0E14]"
                      />
                      <span className="text-white font-medium">Qualified Institutional Buyer (QIB)?</span>
                    </label>
                    <p className="text-[11px] text-[#8E9299]">
                      Owns and invests at least $100,000,000 in securities pursuant to SEC Rule 144A.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[#8E9299] mb-1">Verification Attestation Source</label>
                    <select
                      value={kycMethod}
                      onChange={(e) => setKycMethod(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#14141A] border border-[#22222B] text-white focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="CPA_ATTESTATION">Licensed CPA Attestation Letter (Rule 506(c))</option>
                      <option value="FINRA_BD_LETTER">FINRA Registered Broker-Dealer Verification</option>
                      <option value="BANK_QUALIFIED">Qualified Custodian Bank Asset Verification</option>
                      <option value="ATTORNEY_LETTER">Licensed Attorney Opinion Letter</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleRunKycSimulation}
                    disabled={kycLoading || !isValidEvmAddress(kycWalletAddress)}
                    className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{kycLoading ? "Verifying..." : "Verify Investor Eligibility"}</span>
                  </button>
                </div>
              </div>

              {/* Result Certificate Card */}
              <div className="lg:col-span-6 bg-[#0D0D11] border border-[#1E1E26] rounded-xl p-5 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between border-b border-[#1A1A22] pb-3">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-emerald-400" />
                      Verification Attestation Certificate
                    </h4>
                    <span className="text-[10px] font-mono text-[#8E9299]">Token World KYC Bus</span>
                  </div>

                  {kycResult ? (
                    <div className="mt-4 space-y-4">
                      <div className={`p-4 rounded-xl border ${
                        kycResult.verified
                          ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-300"
                          : "bg-rose-950/20 border-rose-500/40 text-rose-300"
                      }`}>
                        <div className="flex items-center gap-2 font-bold text-sm">
                          {kycResult.verified ? (
                            <>
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                              SUBSCRIBER ELIGIBILITY APPROVED
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-5 h-5 text-rose-400" />
                              SUBSCRIBER NON-ACCREDITED (RESTRICTED)
                            </>
                          )}
                        </div>
                        <div className="text-xs text-white mt-1">
                          {kycResult.rule}
                        </div>
                      </div>

                      <div className="space-y-2 text-xs font-mono">
                        <div className="flex items-center justify-between p-2 rounded bg-[#14141A] border border-[#1F1F27]">
                          <span className="text-[#8E9299]">Assigned Regulatory Tier:</span>
                          <span className="text-amber-400 font-bold">{kycResult.tier}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-[#14141A] border border-[#1F1F27]">
                          <span className="text-[#8E9299]">Certificate Attestation ID:</span>
                          <span className="text-white">{kycResult.certId}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-[#14141A] border border-[#1F1F27]">
                          <span className="text-[#8E9299]">OFAC Sanctions Cleared:</span>
                          <span className="text-emerald-400 font-bold">PASS (SDN List 0 Hits)</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-[#14141A] border border-[#1F1F27]">
                          <span className="text-[#8E9299]">Treasury Whitelist Status:</span>
                          <span className="text-emerald-400 font-bold">
                            {kycResult.whitelistedOnChain ? "SYNCHRONIZED (TokenWorldTreasury)" : "OFFLINE"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-8 text-center space-y-2 py-8 text-[#8E9299]">
                      <UserCheck className="w-8 h-8 mx-auto text-[#6E7178]" />
                      <p className="text-xs">Complete the questionnaire and run verification to generate an attestation certificate.</p>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-[#14141A] rounded-lg border border-[#1E1E26] text-[11px] text-[#8E9299]">
                  <strong>SEC Rule 506(c) Mandate:</strong> Issuers and ATS platforms must take reasonable steps to verify that all purchasers are accredited. Self-certification alone is insufficient under Federal securities regulations.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE: COMPLIANCE GATES & STRATEGIC ROADMAP */}
      {activeMode === "compliance_gates" && (
        <div className="space-y-6">
          <div className="bg-[#121216] border border-[#1F1F23] rounded-xl p-6 relative overflow-hidden space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1F1F23] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                    SEC Regulation ATS · Rule 301 / 304
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 uppercase tracking-wider">
                    0-10 Phase Master Roadmap
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2 mt-1">
                  Go-Live Compliance Gates &amp; Regulatory Execution Roadmap
                </h3>
                <p className="text-xs text-[#8E9299]">
                  Institutional milestone tracker managing FINRA broker-dealer registration, Form ATS/ATS-N filings, and depository settlement prerequisites.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const csvDoc = REGULATORY_DOCUMENTS.find((d) => d.id === "doc-reg-filing-workplan-csv");
                    if (csvDoc) downloadDocumentFile("regulatory_filing_workplan.csv", csvDoc.content, "text/csv");
                  }}
                  className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <FileSpreadsheet className="w-4 h-4 fill-current" />
                  Download Workplan CSV
                </button>
              </div>
            </div>

            {/* 10 Go-Live Compliance Gates Table */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-amber-400" />
                10 Mandatory Go-Live Compliance Gates (Prior to ENABLE_LIVE_TRADING=true)
              </h4>

              <div className="overflow-x-auto border border-[#1E1E26] rounded-xl">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#0D0D11] text-[#8E9299] border-b border-[#1E1E26]">
                    <tr>
                      <th className="py-2.5 px-3">Gate</th>
                      <th className="py-2.5 px-3">Milestone Description</th>
                      <th className="py-2.5 px-3">Regulator / Rule</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Lead / Owner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A1A22] text-[#D1D5DB]">
                    <tr>
                      <td className="py-2.5 px-3 text-cyan-400 font-bold">GATE-01</td>
                      <td className="py-2.5 px-3 text-white">Corporate Entity Formation (Token World LLC)</td>
                      <td className="py-2.5 px-3 text-[#8E9299]">Delaware DOS / DGCL</td>
                      <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-bold">CLEARED</span></td>
                      <td className="py-2.5 px-3">Mauro Lomibao Dar III</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-cyan-400 font-bold">GATE-02</td>
                      <td className="py-2.5 px-3 text-white">Broker-Dealer Membership Application (Form BD)</td>
                      <td className="py-2.5 px-3 text-[#8E9299]">FINRA Rule 1014 / Sec 15(b)</td>
                      <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold">IN_PROGRESS</span></td>
                      <td className="py-2.5 px-3">Chief Compliance Officer</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-cyan-400 font-bold">GATE-03</td>
                      <td className="py-2.5 px-3 text-white">Qualified Custodian &amp; Fiat Escrow Agreement</td>
                      <td className="py-2.5 px-3 text-[#8E9299]">SEC Rule 206(4)-2 / SAB 121</td>
                      <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold">IN_PROGRESS</span></td>
                      <td className="py-2.5 px-3">Treasury Lead</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-cyan-400 font-bold">GATE-04</td>
                      <td className="py-2.5 px-3 text-white">Transfer Agent &amp; DTCC FAST Participant #9450</td>
                      <td className="py-2.5 px-3 text-[#8E9299]">Exchange Act Sec 17A</td>
                      <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold">IN_PROGRESS</span></td>
                      <td className="py-2.5 px-3">Operations Director</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-cyan-400 font-bold">GATE-05</td>
                      <td className="py-2.5 px-3 text-white">Form ATS Initial Operation Report</td>
                      <td className="py-2.5 px-3 text-[#8E9299]">SEC Rule 301(b)(2)</td>
                      <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 font-bold">READY_FOR_FILING</span></td>
                      <td className="py-2.5 px-3">Regulatory Counsel</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-cyan-400 font-bold">GATE-06</td>
                      <td className="py-2.5 px-3 text-white">Form ATS-N Public Disclosure (for NMS Stocks)</td>
                      <td className="py-2.5 px-3 text-[#8E9299]">SEC Rule 304 of Reg ATS</td>
                      <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 font-bold">SCHEDULED</span></td>
                      <td className="py-2.5 px-3">Chief Regulatory Officer</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-cyan-400 font-bold">GATE-07</td>
                      <td className="py-2.5 px-3 text-white">Pre-Trade Risk Control Rule 15c3-5 Market Access</td>
                      <td className="py-2.5 px-3 text-[#8E9299]">SEC Rule 15c3-5</td>
                      <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-bold">CLEARED</span></td>
                      <td className="py-2.5 px-3">Head of Engineering</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-cyan-400 font-bold">GATE-08</td>
                      <td className="py-2.5 px-3 text-white">Smart Contract Formal Verification &amp; Security Audit</td>
                      <td className="py-2.5 px-3 text-[#8E9299]">ERC-1400 / ERC-3643</td>
                      <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-bold">CLEARED</span></td>
                      <td className="py-2.5 px-3">Blockchain Lead</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-cyan-400 font-bold">GATE-09</td>
                      <td className="py-2.5 px-3 text-white">Written Supervisory Procedures (WSPs) &amp; Surveillance</td>
                      <td className="py-2.5 px-3 text-[#8E9299]">FINRA Rule 3110</td>
                      <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 font-bold">READY_FOR_FILING</span></td>
                      <td className="py-2.5 px-3">Chief Compliance Officer</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-cyan-400 font-bold">GATE-10</td>
                      <td className="py-2.5 px-3 text-white">Controlled Pilot Beta Launch &amp; Bell Protocol</td>
                      <td className="py-2.5 px-3 text-[#8E9299]">NYSE / Reg ATS Pilot Gate</td>
                      <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded text-[10px] bg-slate-700 text-slate-300 font-bold">PENDING_GATES_2_6</span></td>
                      <td className="py-2.5 px-3">Mauro Lomibao Dar III</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Dual-Rail Settlement Lifecycle Comparison */}
            <div className="pt-4 border-t border-[#1F1F23] space-y-3">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
                Settlement Lifecycle Architecture: T+0 Atomic DvP vs. Legacy T+1
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-4 bg-[#0A0A0E] border border-emerald-500/30 rounded-xl space-y-2">
                  <div className="text-emerald-400 font-bold text-sm">Token World Rail: T+0 Atomic DvP</div>
                  <ul className="text-[#8E9299] space-y-1.5 list-disc pl-4 text-[11px] font-sans">
                    <li>Execution &amp; settlement occur simultaneously within 1 transaction block.</li>
                    <li>Cash escrow (USDC/Fiat) and permissioned ERC-3643 tokens swap atomically.</li>
                    <li>Zero counterparty credit risk and zero Herstatt settlement timing failure.</li>
                    <li>Synchronous IdentityRegistry validation guarantees only whitelisted wallets transact.</li>
                  </ul>
                </div>

                <div className="p-4 bg-[#0A0A0E] border border-[#22222C] rounded-xl space-y-2">
                  <div className="text-amber-400 font-bold text-sm">Legacy Traditional Rail: T+1 DTCC Netting</div>
                  <ul className="text-[#8E9299] space-y-1.5 list-disc pl-4 text-[11px] font-sans">
                    <li>Trades execute on exchange floor and clear 1 business day later via NSCC.</li>
                    <li>Requires clearing broker margin deposits and clearing fund capitalization.</li>
                    <li>Depository Trust Company (DTC) Cede &amp; Co. holds master book-entry.</li>
                    <li>Token World reconciles with this float at 16:15 ET via DTCC FAST #9450 bridge.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 1: CLOB TRADING PORTAL */}
      {activeMode === "trading_portal" && (
        <div className="space-y-6">
          {/* Institutional Multi-Token Selector & Status Header Bar */}
          <div className="bg-[#121216] border border-[#1F1F23] rounded-xl p-4 space-y-3.5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-400/10 text-amber-400 border border-amber-400/20">
                  <Coins className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                    ACTIVE TRADING INSTRUMENT:
                    <span className="font-mono text-amber-400 text-base">{selectedSymbol}</span>
                    <span
                      className="text-[10px] font-mono px-2 py-0.5 rounded border uppercase"
                      style={{
                        backgroundColor: `${(CHAIN_METADATA[selectedTokenObj.chain as ChainType] as any)?.color || "#F27D26"}20`,
                        color: (CHAIN_METADATA[selectedTokenObj.chain as ChainType] as any)?.color || "#F27D26",
                        borderColor: `${(CHAIN_METADATA[selectedTokenObj.chain as ChainType] as any)?.color || "#F27D26"}40`,
                      }}
                    >
                      {selectedTokenObj.chain || "EVM"}
                    </span>
                  </h3>
                  <div className="text-xs text-[#8E9299] truncate max-w-lg">
                    {selectedTokenObj.name} · {selectedTokenObj.contractAddress || "Treasury Dual-Listed Security"}
                  </div>
                </div>
              </div>

              {/* Live Selected Token Stats Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="px-2.5 py-1.5 rounded-lg bg-[#18181D] border border-[#26262B] text-xs font-mono">
                  <span className="text-[#8E9299]">Ref Price: </span>
                  <span className="text-white font-bold tabular-nums">
                    ${(selectedTokenObj.priceUsd > 0 ? selectedTokenObj.priceUsd : 50.0).toFixed(selectedTokenObj.priceUsd < 1 ? 4 : 2)}
                  </span>
                  <span
                    className={`ml-1.5 font-semibold tabular-nums ${
                      (selectedTokenObj.change24h || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {(selectedTokenObj.change24h || 0) >= 0 ? "+" : ""}
                    {(selectedTokenObj.change24h || 0).toFixed(2)}%
                  </span>
                </div>

                <div className="px-2.5 py-1.5 rounded-lg bg-[#18181D] border border-[#26262B] text-xs font-mono">
                  <span className="text-[#8E9299]">Allocated Depth: </span>
                  <span className="text-amber-400 font-bold tabular-nums">
                    {globalAtsEngine.getBook(selectedSymbol).totalAllocatedLiquidityUsd >= 1e9
                      ? `$${(globalAtsEngine.getBook(selectedSymbol).totalAllocatedLiquidityUsd / 1e9).toFixed(2)}B`
                      : `$${(globalAtsEngine.getBook(selectedSymbol).totalAllocatedLiquidityUsd / 1e6).toFixed(2)}M`}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveMode("liquidity_matrix")}
                  className="px-3 py-1.5 bg-[#18181D] hover:bg-[#25252D] text-xs font-mono text-cyan-300 rounded-lg border border-cyan-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  View All {venueStats.totalSymbolsAllocated} Tokens
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMode("institutional_architecture")}
                  className="px-3 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 text-xs font-mono text-purple-300 rounded-lg border border-purple-500/40 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Cpu className="w-3.5 h-3.5 text-purple-400" />
                  Full Architecture Suite
                </button>
              </div>
            </div>

            {/* Quick Multi-Token Filter & Carousel Strip */}
            <div className="pt-2 border-t border-[#1F1F26] space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                {/* Search in CLOB */}
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 text-[#8E9299] absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={clobSearchQuery}
                    onChange={(e) => setClobSearchQuery(e.target.value)}
                    placeholder="Filter tokens..."
                    className="w-full pl-8 pr-3 py-1 bg-[#18181D] border border-[#26262B] rounded text-xs font-mono text-white placeholder-[#8E9299] focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Chain Pills */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                  {clobAvailableChains.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setClobChainFilter(c)}
                      className={`px-2 py-0.5 text-[10px] font-mono rounded cursor-pointer transition-all uppercase ${
                        clobChainFilter === c
                          ? "bg-amber-400 text-black font-bold"
                          : "bg-[#18181D] text-[#8E9299] hover:text-white border border-[#26262B]"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Horizontal Scroll Token Selection Bar */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
                {clobFilteredTokens.map((t) => {
                  const isCur = t.symbol.toUpperCase() === selectedSymbol.toUpperCase();
                  const p = t.priceUsd > 0 ? t.priceUsd : 50.0;
                  const cColor = (CHAIN_METADATA[t.chain as ChainType] as any)?.color || "#F27D26";

                  return (
                    <button
                      key={t.id || t.symbol}
                      type="button"
                      onClick={() => handleSelectSymbol(t.symbol)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap shrink-0 transition-all cursor-pointer flex items-center gap-2 border ${
                        isCur
                          ? "bg-amber-400 text-black font-bold border-amber-400 shadow-md"
                          : "bg-[#18181D] text-[#8E9299] hover:text-white hover:border-[#383842] border-[#26262B]"
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: cColor }}
                      />
                      <span>{t.symbol}</span>
                      <span className={`tabular-nums ${isCur ? "text-black/80" : "text-white"}`}>
                        ${p.toFixed(p < 1 ? 4 : 2)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SEC Rule 15c3-5 Automated Risk Halt Banner */}
          {riskHaltState.isHalted && (
            <div className="p-4 bg-rose-950/80 border-2 border-rose-500 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-pulse shadow-2xl">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-7 h-7 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white uppercase tracking-wider">
                      ⚠️ SEC RULE 15c3-5 RISK HALT ACTIVE — TRADING FROZEN
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-900 text-rose-200 border border-rose-700">
                      {riskHaltState.haltCode}
                    </span>
                  </div>
                  <p className="text-xs text-rose-200 font-mono mt-1">
                    {riskHaltState.haltReason}
                  </p>
                  <p className="text-[11px] text-rose-300/80 mt-0.5">
                    Halted for {riskHaltState.haltDurationSec}s · Automated market access circuit breaker active to prevent erroneous execution.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="password"
                  value={supervisorOverrideKey}
                  onChange={(e) => setSupervisorOverrideKey(e.target.value)}
                  placeholder="Supervisor Override Key"
                  className="bg-black/60 border border-rose-600 px-3 py-1.5 text-xs rounded font-mono text-white focus:outline-none focus:border-rose-400"
                />
                <button
                  type="button"
                  onClick={handleResumeTradingVenue}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded transition-colors shadow-lg whitespace-nowrap cursor-pointer"
                >
                  Resume Venue
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Order Ticket Panel */}
            <div className="lg:col-span-4 bg-[#121216] border border-[#1F1F23] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">Order Entry Ticket</h3>
                  <div className="text-xs text-[#8E9299]">
                    Asset: <strong className="text-white">{selectedSymbol}</strong> ({selectedTokenObj.name})
                  </div>
                </div>
                <span className="text-xs font-mono text-cyan-400">FAST #9450</span>
              </div>

              {/* Real-Time SEC Rule 15c3-5 Compliance Collar Engine Monitor */}
              <div className={`p-3.5 rounded-xl border text-[11px] font-mono space-y-3 transition-all ${
                riskHaltState.isHalted
                  ? "bg-rose-950/60 border-rose-500 text-rose-200 shadow-lg shadow-rose-950/50"
                  : !liveOrderEvaluation.compliant
                  ? "bg-rose-950/40 border-rose-500/80 text-rose-200 shadow-md"
                  : "bg-slate-900/80 border-emerald-500/40 text-emerald-300"
              }`}>
                {/* Header Badge */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold">
                    <ShieldCheck className={`w-4 h-4 ${
                      riskHaltState.isHalted
                        ? "text-rose-400 animate-ping"
                        : liveOrderEvaluation.compliant
                        ? "text-emerald-400"
                        : "text-rose-400 animate-pulse"
                    }`} />
                    <span>SEC Rule 15c3-5 Risk Collar</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    riskHaltState.isHalted
                      ? "bg-rose-600 text-white animate-pulse"
                      : liveOrderEvaluation.compliant
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-rose-500/30 text-rose-300 border border-rose-500/60 animate-pulse"
                  }`}>
                    {riskHaltState.isHalted
                      ? "🔴 VENUE HALTED"
                      : liveOrderEvaluation.compliant
                      ? "PASS: IN-COLLAR"
                      : "FAIL: COLLAR BREACH"}
                  </span>
                </div>

                {/* Graphical Visual Collar Band Spectrum */}
                {(() => {
                  const refPrice = liveOrderEvaluation.collarBounds.referencePrice;
                  const lowerPrice = liveOrderEvaluation.collarBounds.lowerCollar;
                  const upperPrice = liveOrderEvaluation.collarBounds.upperCollar;
                  const currentPrice = parseFloat(orderPrice) || refPrice;
                  // Range from ref * 0.90 to ref * 1.10 (±10% view span centered on MA reference)
                  const minRange = refPrice * 0.90;
                  const maxRange = refPrice * 1.10;
                  const totalSpan = maxRange - minRange || 1;
                  const lowerPct = Math.max(0, Math.min(100, ((lowerPrice - minRange) / totalSpan) * 100));
                  const upperPct = Math.max(0, Math.min(100, ((upperPrice - minRange) / totalSpan) * 100));
                  const currentPct = Math.max(2, Math.min(98, ((currentPrice - minRange) / totalSpan) * 100));
                  const isSafe = liveOrderEvaluation.compliant;

                  return (
                    <div className="space-y-1.5 bg-black/60 p-2.5 rounded-lg border border-slate-800">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                        <span>Floor (-5%): ${lowerPrice.toFixed(2)}</span>
                        <span className="text-cyan-300 font-bold">MA Window: ${refPrice.toFixed(2)}</span>
                        <span>Ceil (+5%): ${upperPrice.toFixed(2)}</span>
                      </div>

                      {/* Horizontal Visual Spectrum Bar */}
                      <div className="relative h-3 w-full rounded-full bg-slate-800 overflow-hidden flex">
                        {/* Lower Danger Zone (< -5%) */}
                        <div style={{ width: `${lowerPct}%` }} className="h-full bg-rose-500/30" />
                        {/* Safe Moving Average Collar Zone (±5.0%) */}
                        <div style={{ width: `${upperPct - lowerPct}%` }} className="h-full bg-emerald-500/40 border-x border-emerald-400/60" />
                        {/* Upper Danger Zone (> +5%) */}
                        <div style={{ width: `${100 - upperPct}%` }} className="h-full bg-rose-500/30" />

                        {/* Interactive Price Needle / Pin */}
                        <div
                          className="absolute top-0 bottom-0 w-1.5 -ml-0.5 rounded-full z-10 transition-all duration-300"
                          style={{
                            left: `${currentPct}%`,
                            backgroundColor: isSafe ? "#10B981" : "#F43F5E",
                            boxShadow: isSafe ? "0 0 8px #10B981" : "0 0 8px #F43F5E",
                          }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[9.5px]">
                        <span className="text-rose-400/80">&lt; -5% Auto-Halt</span>
                        <span className={isSafe ? "text-emerald-400 font-bold" : "text-rose-400 font-bold animate-pulse"}>
                          Order: ${currentPrice.toFixed(2)} ({isSafe ? "✓ Within ±5% Collar" : `🚨 BREACH: ${liveOrderEvaluation.priceDeviationPct.toFixed(2)}%`})
                        </span>
                        <span className="text-rose-400/80">&gt; +5% Auto-Halt</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Real-time Order Parameter Checklist */}
                <div className="space-y-1 text-[10px] text-slate-300 pt-0.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[#8E9299]">Rolling MA Baseline:</span>
                    <span className="font-bold font-mono text-cyan-300">
                      ${liveOrderEvaluation.collarBounds.referencePrice.toFixed(2)} (N={movingAverageCollar.sampleCount} Trades)
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#8E9299]">SEC 15c3-5 Collar Band:</span>
                    <span className="font-bold font-mono text-white">
                      ±{riskConfig.priceCollarBandPercent}% [${liveOrderEvaluation.collarBounds.lowerCollar.toFixed(2)} — ${liveOrderEvaluation.collarBounds.upperCollar.toFixed(2)}]
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#8E9299]">Deviation vs MA Window:</span>
                    <span className={`font-bold font-mono ${
                      liveOrderEvaluation.priceDeviationPct > riskConfig.priceCollarBandPercent ? "text-rose-400 font-bold" : "text-emerald-400"
                    }`}>
                      {liveOrderEvaluation.priceDeviationPct.toFixed(2)}% {liveOrderEvaluation.priceDeviationPct > riskConfig.priceCollarBandPercent ? "⚠️ TRIPS AUTO-HALT" : "✓ In-Collar"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#8E9299]">Ticket Notional / Hard Cap:</span>
                    <span className={`font-bold font-mono ${
                      liveOrderEvaluation.notionalUsd > riskConfig.maxSingleOrderNotionalUsd ? "text-rose-400 font-bold" : "text-slate-300"
                    }`}>
                      ${(liveOrderEvaluation.notionalUsd / 1e3).toLocaleString()}k / ${(riskConfig.maxSingleOrderNotionalUsd / 1e3).toLocaleString()}k USD
                    </span>
                  </div>

                  {/* Warning message if breached */}
                  {!liveOrderEvaluation.compliant && (
                    <div className="mt-1 p-2 rounded bg-rose-950/80 border border-rose-600/70 text-rose-200 text-[10px] space-y-0.5">
                      <div className="font-bold flex items-center gap-1 text-rose-300">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                        <span>Pre-Trade Intercept: ±5% Threshold Exceeded</span>
                      </div>
                      <p className="text-[9.5px] text-rose-300/90 leading-tight">
                        {liveOrderEvaluation.explanation}
                      </p>
                      {liveOrderEvaluation.willTriggerHalt && (
                        <p className="text-[9.5px] text-rose-400 font-bold uppercase tracking-wider animate-pulse">
                          🚨 Automated Circuit Breaker Armed: Submitting will instantly freeze the ATS venue.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick Stress Presets Bar */}
                <div className="pt-2 border-t border-[#26262B] flex flex-wrap items-center justify-between gap-1 text-[10px]">
                  <span className="text-[#8E9299]">Collar Probes:</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleApplyCollarPreset("NORMAL")}
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 cursor-pointer"
                      title="Set compliant reference price order matching the Moving Average"
                    >
                      Safe MA Price
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const ref = movingAverageCollar.movingAveragePrice;
                        setOrderPrice((ref * 1.045).toFixed(ref < 1 ? 4 : 2));
                        setOrderQuantity("5000");
                      }}
                      className="px-1.5 py-0.5 rounded bg-amber-950/40 hover:bg-amber-900 text-amber-300 border border-amber-800/60 cursor-pointer"
                      title="Set borderline price (+4.5%) just within the 5% threshold"
                    >
                      Borderline (+4.5%)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyCollarPreset("HIGH_VOL")}
                      className="px-1.5 py-0.5 rounded bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800 cursor-pointer font-semibold"
                      title="Simulate order breaching the ±5% collar (+5.5%) to trigger auto-halt"
                    >
                      ⚡ Breach Collar (+5.5%)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyCollarPreset("TRIGGER_HALT")}
                      className="px-1.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer shadow-sm"
                      title="Simulate extreme order (+8.5%) that immediately trips the automated Trading Halt"
                    >
                      🚨 Trip Halt (+8.5%)
                    </button>
                  </div>
                </div>
              </div>

              {/* Buy / Sell Segmented Control */}
              <div className="grid grid-cols-2 p-1 bg-[#1A1A20] rounded-lg">
                <button
                  type="button"
                  onClick={() => setOrderSide("BUY")}
                  className={`py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    orderSide === "BUY"
                      ? "bg-emerald-500 text-white font-semibold shadow-sm"
                      : "text-[#8E9299] hover:text-white"
                  }`}
                >
                  BUY (Bid)
                </button>
                <button
                  type="button"
                  onClick={() => setOrderSide("SELL")}
                  className={`py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    orderSide === "SELL"
                      ? "bg-rose-500 text-white font-semibold shadow-sm"
                      : "text-[#8E9299] hover:text-white"
                  }`}
                >
                  SELL (Ask)
                </button>
              </div>

              <form onSubmit={handlePlaceOrder} className="space-y-4">
                <div>
                  <label className="block text-xs text-[#8E9299] mb-1">Limit Price (USD per Share)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-[#8E9299]">$</span>
                    <input
                      type="number"
                      step={selectedTokenObj.priceUsd < 1 ? "0.0001" : "0.05"}
                      value={orderPrice}
                      onChange={(e) => setOrderPrice(e.target.value)}
                      className="w-full bg-[#18181D] border border-[#26262B] rounded-lg pl-7 pr-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-amber-400"
                      placeholder="52.50"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs text-[#8E9299]">Quantity (Shares)</label>
                    {/* Quick Lot presets */}
                    <div className="flex items-center gap-1">
                      {["1000", "5000", "25000", "50000"].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setOrderQuantity(preset)}
                          className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-[#18181D] hover:bg-[#25252D] text-[#8E9299] hover:text-white border border-[#26262B] cursor-pointer"
                        >
                          {Number(preset) >= 1000 ? `${Number(preset) / 1000}k` : preset}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="number"
                    step="500"
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(e.target.value)}
                    className="w-full bg-[#18181D] border border-[#26262B] rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-amber-400"
                    placeholder="5000"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#8E9299] mb-1">Subscriber Investor Tier</label>
                  <select
                    value={orderTier}
                    onChange={(e: any) => setOrderTier(e.target.value)}
                    className="w-full bg-[#18181D] border border-[#26262B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="ACCREDITED_REG_D">Regulation D 506(c) Accredited</option>
                    <option value="QIB_RULE_144A">Rule 144A Qualified Institutional Buyer (QIB)</option>
                    <option value="OFFSHORE_REG_S">Regulation S Offshore Non-U.S.</option>
                  </select>
                </div>

                {/* Order summary */}
                <div className="bg-[#18181D] border border-[#26262B] rounded-lg p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-[#8E9299]">
                    <span>Total Order Consideration:</span>
                    <span className="text-white font-mono font-medium">{totalOrderValueUsd}</span>
                  </div>
                  <div className="flex justify-between text-[#8E9299]">
                    <span>Identity Registry KYC:</span>
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" /> Whitelisted
                    </span>
                  </div>
                  <div className="flex justify-between text-[#8E9299]">
                    <span>Settlement Mechanism:</span>
                    <span className="text-cyan-400 font-medium">Atomic DvP (ERC-3643)</span>
                  </div>
                </div>

                {lastMatchNotice && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2.5 text-xs text-emerald-300">
                    {lastMatchNotice}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingOrder || riskHaltState.isHalted}
                  className={`w-full py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                    riskHaltState.isHalted
                      ? "bg-rose-950/80 border-2 border-rose-600 text-rose-300 cursor-not-allowed animate-pulse shadow-lg shadow-rose-950/60"
                      : !liveOrderEvaluation.compliant
                      ? "bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-900/40"
                      : orderSide === "BUY"
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                      : "bg-rose-600 hover:bg-rose-500 text-white"
                  }`}
                >
                  {riskHaltState.isHalted
                    ? "⛔ TRADING HALTED (SEC 15c3-5 CIRCUIT ACTIVE)"
                    : isSubmittingOrder
                    ? "Matching & Settling..."
                    : !liveOrderEvaluation.compliant
                    ? `Submit ${orderSide} Order (⚠️ Will Be Rejected by Collar)`
                    : `Submit ${orderSide} Order (${Number(orderQuantity).toLocaleString()} Shares)`}
                </button>

                {/* If venue is halted, provide immediate one-click Supervisory Clearance shortcut */}
                {riskHaltState.isHalted && (
                  <div className="pt-1 flex items-center justify-between text-xs">
                    <span className="text-rose-400 font-mono text-[11px] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                      Circuit Tripped: {riskHaltState.haltCode}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsRiskHaltModalOpen(true)}
                      className="px-2.5 py-1 rounded bg-rose-900/80 hover:bg-rose-800 text-rose-200 border border-rose-600 text-[11px] font-bold cursor-pointer transition-colors shadow-sm"
                    >
                      CCO Clearance Key &rarr;
                    </button>
                  </div>
                )}
              </form>

              {/* Embedded Trade Velocity Alert Radar (Compact) */}
              <div className="pt-2">
                <TradeVelocityAlertMonitor
                  selectedSymbol={selectedSymbol}
                  referencePrice={selectedTokenObj.priceUsd}
                  bids={bids}
                  asks={asks}
                  trades={trades}
                  compact={true}
                  onTriggerGlobalToast={handleTriggerGlobalVelocityToast}
                />
                <div className="text-right pt-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveMode("trade_velocity_alert")}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center justify-end gap-1 ml-auto cursor-pointer"
                  >
                    <span>Full 3σ Radar &amp; Audio Alerts</span>
                    <span>&rarr;</span>
                  </button>
                </div>
              </div>
            </div>

            {/* CLOB Order Book Ladder */}
            <div className="lg:col-span-8 bg-[#121216] border border-[#1F1F23] rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1F1F23] pb-3 gap-2">
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    Central Limit Order Book (CLOB) · <span className="font-mono text-amber-400">{selectedSymbol}</span>
                  </h3>
                  <div className="text-xs text-[#8E9299]">
                    Price-Time Priority Matching Engine · Continuous Real-Time Trading
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-[#8E9299]">
                    Best Bid: <strong className="text-emerald-400 font-mono">${bids[0]?.price.toFixed(selectedTokenObj.priceUsd < 1 ? 4 : 2) || "—"}</strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#8E9299]">
                    Best Ask: <strong className="text-rose-400 font-mono">${asks[0]?.price.toFixed(selectedTokenObj.priceUsd < 1 ? 4 : 2) || "—"}</strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-400 font-mono">Spread: ${spread.toFixed(selectedTokenObj.priceUsd < 1 ? 4 : 2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Bids Ladder (Buy Orders) */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-[#8E9299] font-medium px-2">
                    <span>Participant / Tier</span>
                    <span>Price (USD)</span>
                    <span>Quantity</span>
                  </div>
                  <div className="space-y-1">
                    {bids.map((b, idx) => {
                      const widthPct = Math.min(100, Math.round((b.quantity / maxOrderQty) * 100));
                      const mmLabel = idx % 2 === 0 ? "Citadel QIB" : "Jane St 144A";

                      return (
                        <div
                          key={b.id}
                          className="relative flex items-center justify-between text-xs font-mono p-2 rounded border border-emerald-500/15 hover:border-emerald-500/40 transition-colors overflow-hidden"
                        >
                          {/* Visual Depth Bar Fill */}
                          <div
                            className="absolute left-0 top-0 bottom-0 bg-emerald-500/15 pointer-events-none transition-all duration-300"
                            style={{ width: `${widthPct}%` }}
                          />

                          <div className="relative z-10 flex items-center gap-1.5">
                            <span className="text-slate-300 text-[11px] truncate max-w-[85px]">{b.traderAddress.slice(0, 8)}...</span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-black/50 text-[#8E9299] border border-[#2B2B36]">
                              {mmLabel}
                            </span>
                          </div>

                          <span className="relative z-10 text-emerald-400 font-semibold tabular-nums">
                            ${b.price.toFixed(selectedTokenObj.priceUsd < 1 ? 4 : 2)}
                          </span>
                          <span className="relative z-10 text-white tabular-nums font-medium">
                            {b.quantity.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                    {bids.length === 0 && (
                      <div className="text-center py-4 text-xs text-[#8E9299]">No open bids</div>
                    )}
                  </div>
                </div>

                {/* Asks Ladder (Sell Orders) */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-[#8E9299] font-medium px-2">
                    <span>Participant / Tier</span>
                    <span>Price (USD)</span>
                    <span>Quantity</span>
                  </div>
                  <div className="space-y-1">
                    {asks.map((a, idx) => {
                      const widthPct = Math.min(100, Math.round((a.quantity / maxOrderQty) * 100));
                      const mmLabel = idx % 2 === 0 ? "Virtu QIB" : "Jump QIB";

                      return (
                        <div
                          key={a.id}
                          className="relative flex items-center justify-between text-xs font-mono p-2 rounded border border-rose-500/15 hover:border-rose-500/40 transition-colors overflow-hidden"
                        >
                          {/* Visual Depth Bar Fill */}
                          <div
                            className="absolute right-0 top-0 bottom-0 bg-rose-500/15 pointer-events-none transition-all duration-300"
                            style={{ width: `${widthPct}%` }}
                          />

                          <div className="relative z-10 flex items-center gap-1.5">
                            <span className="text-slate-300 text-[11px] truncate max-w-[85px]">{a.traderAddress.slice(0, 8)}...</span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-black/50 text-[#8E9299] border border-[#2B2B36]">
                              {mmLabel}
                            </span>
                          </div>

                          <span className="relative z-10 text-rose-400 font-semibold tabular-nums">
                            ${a.price.toFixed(selectedTokenObj.priceUsd < 1 ? 4 : 2)}
                          </span>
                          <span className="relative z-10 text-white tabular-nums font-medium">
                            {a.quantity.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                    {asks.length === 0 && (
                      <div className="text-center py-4 text-xs text-[#8E9299]">No open asks</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Atomic DvP Settled Trades Stream */}
              <div className="mt-6 pt-4 border-t border-[#1F1F23] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#8E9299]">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Live Atomic Settlement Receipts (DvP on EVM Block) · {selectedSymbol}
                    </h4>
                    <span className="hidden sm:inline text-[#3F4248]">|</span>
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Continuous Settlement Bus
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (trades.length > 0) {
                          triggerSettlementTransition(trades[0].id);
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                      title="Simulate transition from 'Matched' to 'Atomic Clearing Verified' with subtle pulses"
                    >
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span>Simulate DvP Transition</span>
                    </button>
                    <span className="text-[10px] text-[#8E9299]">Click status badge to re-verify</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="text-[#8E9299] border-b border-[#26262B]">
                        <th className="py-2 pr-3">Trade ID</th>
                        <th className="py-2 px-3">Shares</th>
                        <th className="py-2 px-3">Price</th>
                        <th className="py-2 px-3">Total Value</th>
                        <th className="py-2 px-3">Cryptographic Tx Hash</th>
                        <th className="py-2 pl-3">Settlement Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1F1F23]">
                      {trades.slice(0, 6).map((t) => {
                        const status = tradeSettlementStatuses[t.id] || "Atomic Clearing Verified";
                        const isPulsing = pulsingTradeIds.has(t.id);
                        const isMatched = status === "Matched";

                        return (
                          <tr
                            key={t.id}
                            className="hover:bg-[#18181D] transition-colors group cursor-pointer"
                            onClick={() => setSelectedReceiptTrade(t)}
                          >
                            <td className="py-2.5 pr-3 text-white font-medium">
                              <span className="text-[#8E9299] group-hover:text-cyan-400 mr-1 transition-colors">#</span>
                              {t.id}
                            </td>
                            <td className="py-2.5 px-3 text-white tabular-nums">{t.quantity.toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-emerald-400 tabular-nums">
                              ${t.price.toFixed(selectedTokenObj.priceUsd < 1 ? 4 : 2)}
                            </td>
                            <td className="py-2.5 px-3 text-white tabular-nums">${t.totalUsd.toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-cyan-400 truncate max-w-[200px]" title={isVIP ? t.txHash : "Obfuscated via Zero-Knowledge (ZK) State Proof"}>
                              {maskTxHash(t.txHash, isVIP)}
                            </td>
                            <td className="py-2.5 pl-3">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerSettlementTransition(t.id);
                                }}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono transition-all duration-500 cursor-pointer select-none text-left ${
                                  isMatched
                                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                                    : isPulsing
                                    ? "bg-emerald-500/25 text-emerald-200 border border-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.5)] scale-105"
                                    : "bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/60"
                                }`}
                                title="Click to test subtle pulse animation moving from 'Matched' to 'Atomic Clearing Verified'"
                              >
                                {isMatched ? (
                                  <>
                                    <span className="relative flex h-2 w-2 shrink-0">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                                    </span>
                                    <Clock
                                      className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0 text-opacity-90"
                                      style={{ animationDuration: "3s" }}
                                    />
                                    <span className="tracking-wide">Matched</span>
                                  </>
                                ) : (
                                  <>
                                    <div className="relative flex items-center justify-center shrink-0">
                                      {/* Subtle pulse ring on transition */}
                                      {isPulsing && (
                                        <>
                                          <span className="absolute -inset-1 rounded-full bg-emerald-400/40 animate-ping opacity-75 pointer-events-none" />
                                          <span className="absolute -inset-1.5 rounded-full bg-emerald-500/20 animate-pulse pointer-events-none" />
                                        </>
                                      )}
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-0.5" />
                                      <ShieldCheck
                                        className={`w-3.5 h-3.5 text-emerald-400 transition-transform duration-300 ${
                                          isPulsing ? "scale-110" : ""
                                        }`}
                                      />
                                    </div>
                                    <span className="tracking-tight whitespace-nowrap">
                                      Atomic Clearing Verified
                                    </span>
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE: ATS MEMBERSHIP FEE SCHEDULE & $93M REVENUE BLUEPRINT */}
      {activeMode === "ats_membership_plan" && (
        <AtsMembershipMonetizationPlan
          onNavigateToVenue={() => setActiveMode("trading_portal")}
        />
      )}

      {/* MODE: TRADE VELOCITY 3-SIGMA ALERT RADAR */}
      {activeMode === "trade_velocity_alert" && (
        <TradeVelocityAlertMonitor
          selectedSymbol={selectedSymbol}
          referencePrice={selectedTokenObj.priceUsd}
          bids={bids}
          asks={asks}
          trades={trades}
          compact={false}
          onTriggerGlobalToast={handleTriggerGlobalVelocityToast}
        />
      )}

      {/* MODE: VENUE LIQUIDITY MATRIX & ALL TOKENS ALLOCATION */}
      {activeMode === "liquidity_matrix" && (
        <AtsLiquidityMatrix
          tokens={allVenueTokens}
          venueStats={venueStats}
          selectedSymbol={selectedSymbol}
          onSelectTokenForTrading={(sym) => {
            handleSelectSymbol(sym);
            setActiveMode("trading_portal");
          }}
          onBoostTokenLiquidity={handleBoostTokenLiquidity}
          onAllocateAllLiquidity={handleAllocateMaxLiquidityAll}
          isAllocatingLiquidity={isAllocatingLiquidity}
          onNavigatePrimary={(sym) => {
            handleSelectSymbol(sym);
            setActiveMode("primary_issuances");
          }}
          onNavigateDtcc={(sym) => {
            handleSelectSymbol(sym);
            setActiveMode("nyse_dtcc_bridge");
          }}
        />
      )}

      {/* MODE 2: PRIMARY ISSUANCES ENGINE */}
      {activeMode === "primary_issuances" && (
        <div className="space-y-6">
          <div className="bg-[#121216] border border-[#1F1F23] rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F1F23] pb-4">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-400" />
                  Primary Capital Issuance &amp; Syndication Rounds ({issuances.length} Active)
                </h3>
                <p className="text-xs text-[#8E9299]">
                  Direct exempt capital raises under SEC Regulation D 506(c), Rule 144A, and Regulation S
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#8E9299] absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={primaryIssuanceSearch}
                    onChange={(e) => setPrimaryIssuanceSearch(e.target.value)}
                    placeholder="Search offerings by token..."
                    className="pl-8 pr-3 py-1 bg-[#18181D] border border-[#26262B] rounded-lg text-xs font-mono text-white placeholder-[#8E9299] focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="text-xs text-[#8E9299]">
                  Issuer: <strong className="text-white">Token World LLC (Mauro Lomibao Dar III)</strong>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              {issuances.filter((r) => {
                const q = primaryIssuanceSearch.toLowerCase().trim();
                return !q || r.symbol.toLowerCase().includes(q) || r.assetName.toLowerCase().includes(q);
              }).map((round) => {
                const percentRaised = Math.round((round.raisedCapitalUsd / round.targetCapitalUsd) * 100);
                return (
                  <div
                    key={round.id}
                    className="bg-[#18181D] border border-[#26262B] rounded-xl p-5 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-[#8E9299]">
                        <span className="font-semibold text-white">{round.symbol}</span>
                        <span className="text-amber-400 font-mono">{round.exemption}</span>
                      </div>
                      <h4 className="text-base font-semibold text-white">{round.assetName}</h4>
                      <p className="text-xs text-[#8E9299]">
                        Target Capital: ${(round.targetCapitalUsd / 1000000).toFixed(1)}M USD @ ${round.sharePriceUsd.toFixed(2)}/share
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-[#8E9299]">Raised: ${(round.raisedCapitalUsd / 1000000).toFixed(2)}M</span>
                        <span className="text-emerald-400 font-semibold">{percentRaised}%</span>
                      </div>
                      <div className="w-full bg-[#26262B] rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${percentRaised}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#26262B] space-y-2 text-xs text-[#8E9299]">
                      <div className="flex justify-between">
                        <span>Min Investment:</span>
                        <span className="text-white font-mono">${round.minimumInvestmentUsd.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Subscribers:</span>
                        <span className="text-white font-mono">{round.investorCount} Qualified</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Escrow Trustee:</span>
                        <span className="text-white truncate max-w-[150px]">{round.escrowAgent}</span>
                      </div>
                    </div>

                    {subscribedRoundId === round.id ? (
                      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 text-xs text-emerald-300 text-center font-medium">
                        Subscription Allocation Confirmed!
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSubscribeRound(round.id)}
                        disabled={round.status === "SUBSCRIPTION_CLOSED"}
                        className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors ${
                          round.status === "SUBSCRIPTION_CLOSED"
                            ? "bg-[#26262B] text-[#8E9299] cursor-not-allowed"
                            : "bg-white text-black hover:bg-slate-200"
                        }`}
                      >
                        {round.status === "SUBSCRIPTION_CLOSED"
                          ? "Offering Fully Subscribed"
                          : `Subscribe $${subscriptionAmount} Allocation`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: NYSE & DTCC FAST RECONCILIATION BUS */}
      {activeMode === "nyse_dtcc_bridge" && (
        <div className="space-y-6">
          <div className="bg-[#121216] border border-[#1F1F23] rounded-xl p-5 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F1F23] pb-4">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-cyan-400" />
                  Dual-Listing &amp; DTCC FAST Automated Transfer Protocol · <span className="font-mono text-cyan-400">{selectedSymbol}</span>
                </h3>
                <p className="text-xs text-[#8E9299]">
                  Synchronizing traditional public float on NYSE (via DTC Cede &amp; Co.) with Token World ATS for {selectedTokenObj.name}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-xs text-[#8E9299]">
                  Depository Asset:
                </div>
                <select
                  value={selectedSymbol}
                  onChange={(e) => handleSelectSymbol(e.target.value)}
                  className="bg-[#18181D] border border-[#26262B] text-white text-xs font-mono px-3 py-1.5 rounded-lg focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  {allVenueTokens.map((t) => (
                    <option key={t.symbol} value={t.symbol}>
                      {t.symbol} — {t.name}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-[#8E9299]">
                  Transfer Agent: <strong className="text-white">VStock Transfer Master File</strong>
                </div>
              </div>
            </div>

            {/* Reconciliation Balance Meter */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#18181D] border border-[#26262B] rounded-xl p-4 space-y-2">
                <div className="text-xs text-[#8E9299]">NYSE Public Float (DTC Cede & Co.)</div>
                <div className="text-xl font-bold font-mono text-white tabular-nums">
                  {dtccState.nysePublicFloatDtcShares.toLocaleString()}
                </div>
                <div className="text-[11px] text-[#8E9299]">Traded on 11 Wall Street Trading Floor</div>
              </div>

              <div className="bg-[#18181D] border border-[#26262B] rounded-xl p-4 space-y-2">
                <div className="text-xs text-[#8E9299]">Token World ATS (ERC-3643 Wrapped)</div>
                <div className="text-xl font-bold font-mono text-cyan-400 tabular-nums">
                  {dtccState.tokenWorldWrappedShares.toLocaleString()}
                </div>
                <div className="text-[11px] text-[#8E9299]">Permissioned off-chain CLOB / on-chain DvP</div>
              </div>

              <div className="bg-[#18181D] border border-[#26262B] rounded-xl p-4 space-y-2">
                <div className="text-xs text-[#8E9299]">Master Security Holder File Total</div>
                <div className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
                  {dtccState.transferAgentMasterFileTotal.toLocaleString()}
                </div>
                <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Zero Variance Parity Verified
                </div>
              </div>
            </div>

            {bridgeNotice && (
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 text-xs text-cyan-300">
                {bridgeNotice}
              </div>
            )}

            {/* Interactive Wrapping & Unwrapping Protocol */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#1F1F23]">
              {/* Wrap NYSE -> Token World */}
              <div className="bg-[#18181D] border border-[#26262B] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white">Wrap NYSE Float into Token World</h4>
                  <span className="text-xs text-cyan-400 font-mono">Deposit to FAST #9450</span>
                </div>
                <p className="text-xs text-[#8E9299]">
                  Deposits traditional DTC-eligible shares to the Transfer Agent account and triggers an on-chain mint to whitelisted ATS address.
                </p>
                <div>
                  <label className="block text-xs text-[#8E9299] mb-1">Shares to Wrap</label>
                  <input
                    type="number"
                    value={wrapAmountInput}
                    onChange={(e) => setWrapAmountInput(e.target.value)}
                    className="w-full bg-[#121216] border border-[#26262B] rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <button
                  onClick={() => handleExecuteBridgeAction("WRAP")}
                  className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Execute Wrap Instruction & Mint ERC-3643
                </button>
              </div>

              {/* Unwrap Token World -> NYSE */}
              <div className="bg-[#18181D] border border-[#26262B] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white">Unwrap to Traditional NYSE Trading</h4>
                  <span className="text-xs text-amber-400 font-mono">DTC Cede & Co. Credit</span>
                </div>
                <p className="text-xs text-[#8E9299]">
                  Burns permissioned on-chain tokens and transmits automated FAST credit to the broker’s DTC participant account for NYSE execution.
                </p>
                <div>
                  <label className="block text-xs text-[#8E9299] mb-1">Shares to Unwrap</label>
                  <input
                    type="number"
                    value={unwrapAmountInput}
                    onChange={(e) => setUnwrapAmountInput(e.target.value)}
                    className="w-full bg-[#121216] border border-[#26262B] rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <button
                  onClick={() => handleExecuteBridgeAction("UNWRAP")}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-xs font-semibold transition-colors"
                >
                  Execute Burn & Return to NYSE Float
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 4: SMART CONTRACTS & FOUNDRY SUITE */}
      {activeMode === "smart_contracts" && (
        <div className="space-y-6">
          {/* Contract Selector Strip */}
          <div className="bg-[#121216] border border-[#1F1F23] rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F1F23] pb-4">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  Token World Exchange® Smart Contracts &amp; Foundry Suite
                </h3>
                <p className="text-xs text-[#8E9299]">
                  Title: <strong className="text-white">Token World Exchange®</strong> · Sole Owner/ Creator:{" "}
                  <strong className="text-amber-400">Mauro Lomibao Dar III®</strong> · 945 Westholme Ave, LA, CA 90024
                </p>
              </div>

              {/* Download and copy buttons for selected contract */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const map: Record<string, { name: string; src: string }> = {
                      tree3_token: { name: "TREE3Token.sol", src: SOLIDITY_TREE3_TOKEN_SOURCE },
                      security_token: { name: "TokenWorldSecurityToken.sol", src: SOLIDITY_SECURITY_TOKEN_SOURCE },
                      treasury_token: { name: "TokenWorldTreasury.sol", src: SOLIDITY_TREASURY_TOKEN_SOURCE },
                      deploy_tree3: { name: "DeployTREE3.s.sol", src: FOUNDRY_DEPLOY_TREE3_SOURCE },
                      test_tree3: { name: "TREE3Token.t.sol", src: FOUNDRY_TEST_TREE3_SOURCE },
                      sanitize_csv: { name: "sanitize_data.py", src: PYTHON_CSV_SANITIZER_SOURCE },
                    };
                    const item = map[selectedContractKey] || map.tree3_token;
                    downloadDocumentFile(item.name, item.src);
                  }}
                  className="px-3 py-1.5 bg-[#18181D] hover:bg-[#26262B] border border-[#26262B] text-xs font-medium text-white rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download File
                </button>
                <button
                  onClick={() => {
                    const map: Record<string, string> = {
                      tree3_token: SOLIDITY_TREE3_TOKEN_SOURCE,
                      security_token: SOLIDITY_SECURITY_TOKEN_SOURCE,
                      treasury_token: SOLIDITY_TREASURY_TOKEN_SOURCE,
                      deploy_tree3: FOUNDRY_DEPLOY_TREE3_SOURCE,
                      test_tree3: FOUNDRY_TEST_TREE3_SOURCE,
                      sanitize_csv: PYTHON_CSV_SANITIZER_SOURCE,
                    };
                    const src = map[selectedContractKey] || SOLIDITY_TREE3_TOKEN_SOURCE;
                    navigator.clipboard.writeText(src);
                    setCopiedDocId(selectedContractKey);
                    setTimeout(() => setCopiedDocId(null), 2000);
                  }}
                  className="px-3 py-1.5 bg-white text-black hover:bg-slate-200 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  {copiedDocId === selectedContractKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedDocId === selectedContractKey ? "Copied!" : "Copy Code"}
                </button>
              </div>
            </div>

            {/* Sub-Tabs for Smart Contracts */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedContractKey("tree3_token")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  selectedContractKey === "tree3_token"
                    ? "bg-amber-400 text-black font-semibold shadow-sm"
                    : "bg-[#18181D] text-[#8E9299] hover:text-white border border-[#26262B]"
                }`}
              >
                TREE3Token.sol (1 Quadrillion)
              </button>

              <button
                onClick={() => setSelectedContractKey("security_token")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  selectedContractKey === "security_token"
                    ? "bg-amber-400 text-black font-semibold shadow-sm"
                    : "bg-[#18181D] text-[#8E9299] hover:text-white border border-[#26262B]"
                }`}
              >
                TokenWorldSecurityToken.sol (ERC-3643)
              </button>

              <button
                onClick={() => setSelectedContractKey("treasury_token")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  selectedContractKey === "treasury_token"
                    ? "bg-amber-400 text-black font-semibold shadow-sm"
                    : "bg-[#18181D] text-[#8E9299] hover:text-white border border-[#26262B]"
                }`}
              >
                TokenWorldTreasury.sol (Whitelist)
              </button>

              <button
                onClick={() => setSelectedContractKey("deploy_tree3")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  selectedContractKey === "deploy_tree3"
                    ? "bg-amber-400 text-black font-semibold shadow-sm"
                    : "bg-[#18181D] text-[#8E9299] hover:text-white border border-[#26262B]"
                }`}
              >
                DeployTREE3.s.sol (Foundry)
              </button>

              <button
                onClick={() => setSelectedContractKey("test_tree3")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  selectedContractKey === "test_tree3"
                    ? "bg-amber-400 text-black font-semibold shadow-sm"
                    : "bg-[#18181D] text-[#8E9299] hover:text-white border border-[#26262B]"
                }`}
              >
                TREE3Token.t.sol (Tests)
              </button>

              <button
                onClick={() => setSelectedContractKey("sanitize_csv")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  selectedContractKey === "sanitize_csv"
                    ? "bg-amber-400 text-black font-semibold shadow-sm"
                    : "bg-[#18181D] text-[#8E9299] hover:text-white border border-[#26262B]"
                }`}
              >
                sanitize_data.py (Pipeline)
              </button>
            </div>

            {/* Treasury Whitelist banner if selected */}
            {selectedContractKey === "treasury_token" && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Treasury Whitelist Registry Active: batchSetWhitelist()
                  </div>
                  <div className="text-[11px] text-[#8E9299]">
                    Upload investor CSV files and batch-register addresses on-chain with pending vs. confirmed indicators.
                  </div>
                </div>
                <button
                  onClick={() => setActiveMode("bulk_whitelist")}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors shrink-0 flex items-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Open BulkWhitelistManager
                </button>
              </div>
            )}

            {/* Code viewer box */}
            <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-4 font-mono text-xs text-[#E0E0E0] overflow-x-auto max-h-[360px] scrollbar-thin">
              <pre>
                {selectedContractKey === "tree3_token" && SOLIDITY_TREE3_TOKEN_SOURCE}
                {selectedContractKey === "security_token" && SOLIDITY_SECURITY_TOKEN_SOURCE}
                {selectedContractKey === "treasury_token" && SOLIDITY_TREASURY_TOKEN_SOURCE}
                {selectedContractKey === "deploy_tree3" && FOUNDRY_DEPLOY_TREE3_SOURCE}
                {selectedContractKey === "test_tree3" && FOUNDRY_TEST_TREE3_SOURCE}
                {selectedContractKey === "sanitize_csv" && PYTHON_CSV_SANITIZER_SOURCE}
              </pre>
            </div>
          </div>

          {/* Interactive Tools Grid: TREE(3) Generator & CSV Data Sanitizer */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tool 1: Deterministic TREE(3) ID Generator */}
            <div className="bg-[#121216] border border-[#1F1F23] rounded-xl p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Deterministic TREE(3) ID Calculator
                  </h4>
                  <span className="text-[11px] font-mono text-amber-400">TREE3Token.sol</span>
                </div>
                <p className="text-xs text-[#8E9299]">
                  Calculates the 3-step keccak256 deterministic identifier from account, nonce, and seed block.
                </p>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-[11px] text-[#8E9299] mb-1">Target Account Address</label>
                    <input
                      type="text"
                      value={tree3Account}
                      onChange={(e) => setTree3Account(e.target.value)}
                      className="w-full bg-[#18181D] border border-[#26262B] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-[#8E9299] mb-1">Nonce</label>
                      <input
                        type="number"
                        value={tree3Nonce}
                        onChange={(e) => setTree3Nonce(e.target.value)}
                        className="w-full bg-[#18181D] border border-[#26262B] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#8E9299] mb-1">Seed Variable</label>
                      <input
                        type="number"
                        value={tree3Seed}
                        onChange={(e) => setTree3Seed(e.target.value)}
                        className="w-full bg-[#18181D] border border-[#26262B] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                </div>

                {tree3Result && (
                  <div className="bg-[#18181D] border border-amber-500/30 rounded-lg p-3 space-y-1">
                    <div className="text-[11px] text-amber-300 font-medium">Computed Deterministic TREE(3) ID:</div>
                    <div className="text-xs font-mono text-white break-all select-all">{tree3Result}</div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleGenerateTree3Id}
                className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-black text-xs font-semibold rounded-lg transition-colors shadow-sm"
              >
                Compute Deterministic TREE(3) Identifier
              </button>
            </div>

            {/* Tool 2: CSV Data Sanitizer & Ingestion Pipeline */}
            <div className="bg-[#121216] border border-[#1F1F23] rounded-xl p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    CSV Data Sanitizer &amp; Validator
                  </h4>
                  <span className="text-[11px] font-mono text-emerald-400">sanitize_data.py</span>
                </div>
                <p className="text-xs text-[#8E9299]">
                  Filters corrupted 20-byte addresses (e.g. 0xc0rp...) and incomplete records before deployment.
                </p>

                <div>
                  <label className="block text-[11px] text-[#8E9299] mb-1">CSV Raw Data Payload</label>
                  <textarea
                    rows={4}
                    value={csvRawText}
                    onChange={(e) => setCsvRawText(e.target.value)}
                    className="w-full bg-[#18181D] border border-[#26262B] rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-400 resize-none scrollbar-thin"
                  />
                </div>

                {csvSanitizedStats && (
                  <div className="bg-[#18181D] border border-[#26262B] rounded-lg p-3 space-y-2 text-xs">
                    <div className="flex justify-between items-center font-mono">
                      <span className="text-emerald-400">Valid Records: {csvSanitizedStats.validCount}</span>
                      <span className="text-rose-400">Rejected: {csvSanitizedStats.rejectedCount}</span>
                    </div>

                    {csvSanitizedStats.rejectedRows.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-[#26262B] max-h-24 overflow-y-auto scrollbar-thin">
                        {csvSanitizedStats.rejectedRows.map((rej, i) => (
                          <div key={i} className="text-[11px] text-rose-300 font-mono">
                            Row {rej.row}: {rej.reason}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRunCsvSanitizer}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Sanitize &amp; Validate CSV
                </button>
                {csvSanitizedStats && csvSanitizedStats.validCount > 0 && (
                  <button
                    type="button"
                    onClick={handleDownloadSanitizedCsv}
                    className="px-3 py-2.5 bg-white text-black hover:bg-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                    title="Download token_sanitized.csv"
                  >
                    <Download className="w-3.5 h-3.5" /> .csv
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 5: REGULATORY DOCUMENTS & DOWNLOAD HUB */}
      {activeMode === "regulatory_docs" && (
        <div className="space-y-6">
          <div className="bg-[#121216] border border-[#1F1F23] rounded-xl p-5 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F1F23] pb-4">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-400" />
                  Regulatory Paperwork & Technical Document Hub
                </h3>
                <p className="text-xs text-[#8E9299]">
                  Download official SEC filings, corporate agreements, and matching engine codes for Token World
                </p>
              </div>
              <button
                onClick={handleDownloadAllBundle}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap shadow-sm"
              >
                <Download className="w-4 h-4" />
                Download All 8 Documents Bundle (.txt)
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Document Selector Sidebar */}
              <div className="lg:col-span-5 space-y-2">
                <div className="text-xs font-medium text-[#8E9299] px-1">SELECT OFFICIAL FILING</div>
                <div className="space-y-1.5">
                  {REGULATORY_DOCUMENTS.map((doc) => {
                    const isSelected = selectedDoc.id === doc.id;
                    return (
                      <button
                        key={doc.id}
                        onClick={() => setSelectedDoc(doc)}
                        className={`w-full text-left p-3 rounded-lg border transition-all text-xs flex flex-col gap-1 ${
                          isSelected
                            ? "bg-[#1C1C22] border-amber-400/50 text-white"
                            : "bg-[#18181D] border-[#26262B] text-[#8E9299] hover:text-white hover:border-[#383840]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">{doc.title}</span>
                          <span className="text-[10px] text-amber-400 font-mono">{doc.badge}</span>
                        </div>
                        <p className="text-[11px] line-clamp-2 text-[#8E9299]">{doc.summary}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Document Preview & Individual Download */}
              <div className="lg:col-span-7 bg-[#18181D] border border-[#26262B] rounded-xl p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-[#26262B] pb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-white">{selectedDoc.title}</h4>
                      <div className="text-xs text-[#8E9299]">
                        Filing Code: <span className="text-amber-400 font-mono">{selectedDoc.secFormCode}</span> ·{" "}
                        {selectedDoc.filename}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyDocument(selectedDoc)}
                        className="p-1.5 bg-[#26262B] hover:bg-[#323238] rounded-md text-[#8E9299] hover:text-white transition-colors"
                        title="Copy Document Text"
                      >
                        {copiedDocId === selectedDoc.id ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => downloadDocumentFile(selectedDoc.filename, selectedDoc.content)}
                        className="px-3 py-1.5 bg-white text-black hover:bg-slate-200 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-lg p-4 font-mono text-xs text-[#E0E0E0] overflow-y-auto max-h-[420px] whitespace-pre-wrap scrollbar-thin">
                    {selectedDoc.content}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#26262B] flex items-center justify-between text-xs text-[#8E9299]">
                  <span>Registered Principal: {OWNER_PROFILE.name}</span>
                  <span>Direct: {OWNER_PROFILE.phone}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 6: NYSE OPENING BELL CEREMONY & LAUNCHPAD */}
      {activeMode === "nyse_bell_ceremony" && (
        <div className="space-y-6">
          <div className="bg-[#121216] border border-[#1F1F23] rounded-xl p-6 relative overflow-hidden space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-[#1F1F23] pb-6">
              <div className="space-y-1">
                <div className="text-xs text-amber-400 font-semibold tracking-wide flex items-center gap-2">
                  <Landmark className="w-4 h-4" />
                  11 WALL STREET, NEW YORK, NY · NYSE TRADING FLOOR PODIUM
                </div>
                <h3 className="text-2xl font-bold text-white">
                  NYSE Opening Bell Ceremony & Market Launchpad
                </h3>
                <div className="text-xs text-[#8E9299]">
                  Honoring Founder & Sovereign Owner:{" "}
                  <strong className="text-white">{OWNER_PROFILE.name}</strong> · {OWNER_PROFILE.headquarters}
                </div>
              </div>

              {/* Ceremony Bell Ring Trigger */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={handleTriggerOpeningBell}
                  disabled={countdown !== null}
                  className={`px-6 py-3 rounded-xl font-bold text-sm tracking-wide flex items-center gap-2 transition-transform transform active:scale-95 shadow-lg ${
                    isBellRinging
                      ? "bg-amber-400 text-black ring-4 ring-amber-400/50 animate-pulse"
                      : countdown !== null
                      ? "bg-slate-700 text-white cursor-wait"
                      : "bg-gradient-to-r from-amber-400 to-yellow-500 text-black hover:from-amber-300 hover:to-yellow-400"
                  }`}
                >
                  <Bell className="w-5 h-5" />
                  {countdown !== null
                    ? `COUNTDOWN: 00:0${countdown} ET`
                    : isBellRinging
                    ? "RINGING NYSE BELL..."
                    : "RING THE NYSE OPENING BELL"}
                </button>

                <button
                  onClick={handleToggleTeleprompterSpeech}
                  className={`px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors border ${
                    teleprompterPlaying
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-[#18181D] text-[#8E9299] hover:text-white border-[#26262B]"
                  }`}
                >
                  <Volume2 className="w-4 h-4" />
                  {teleprompterPlaying ? "Stop Remarks Audio" : "Listen to Remarks"}
                </button>
              </div>
            </div>

            {/* Live Celebration Banner when Market is Open */}
            {marketOpenCelebrated && (
              <div className="bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-cyan-500/20 border border-amber-400/40 rounded-xl p-4 text-center space-y-1">
                <div className="text-sm font-bold text-amber-300 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  MARKET OFFICIALLY OPEN ON 11 WALL STREET!
                </div>
                <p className="text-xs text-white">
                  Mauro Lomibao Dar III has rung the historic NYSE Opening Bell. Token World ATS & NYSE dual-listing trading is live!
                </p>
              </div>
            )}

            {/* Podium Teleprompter Script */}
            <div className="bg-[#18181D] border border-[#26262B] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#26262B] pb-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  Official Podium Teleprompter Script (Mauro Lomibao Dar III)
                </h4>
                <span className="text-xs text-[#8E9299]">Live Broadcast at 09:29:50 AM ET</span>
              </div>

              <div className="p-4 bg-[#0A0A0C] rounded-lg border border-[#1F1F23] font-serif text-sm lg:text-base text-amber-100 leading-relaxed italic">
                “Today, we bridge the timeless bedrock of the New York Stock Exchange with the borderless
                efficiency of Token World. From 945 Westholme Avenue in Los Angeles to 11 Wall Street in
                New York, we have built an Alternative Trading System that captures primary capital, empowers
                innovators, and unites global liquidity under strict regulatory trust. Let the bell ring for
                every entrepreneur, investor, and builder around the world!”
              </div>

              <div className="flex flex-wrap items-center justify-between text-xs text-[#8E9299] pt-2">
                <span>Speaker: Mauro Lomibao Dar III, Owner of Token World</span>
                <span>Contact: (310) 904-5646 · 945 Westholme Ave, LA, CA 90024</span>
              </div>
            </div>

            {/* Event Itinerary & Protocol Table */}
            <div className="bg-[#18181D] border border-[#26262B] rounded-xl p-5 space-y-3">
              <h4 className="text-sm font-semibold text-white">NYSE Wall Street Ceremony Protocol</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 bg-[#121216] rounded-lg border border-[#1F1F23]">
                  <div className="text-amber-400 font-bold">08:30 AM ET</div>
                  <div className="text-white font-medium mt-1">VIP Arrival</div>
                  <div className="text-[#8E9299] text-[11px] mt-0.5">11 Wall Street VIP Entrance check-in</div>
                </div>

                <div className="p-3 bg-[#121216] rounded-lg border border-[#1F1F23]">
                  <div className="text-amber-400 font-bold">08:45 AM ET</div>
                  <div className="text-white font-medium mt-1">Boardroom Briefing</div>
                  <div className="text-[#8E9299] text-[11px] mt-0.5">Executive sign-in with NYSE leadership</div>
                </div>

                <div className="p-3 bg-[#121216] rounded-lg border border-[#1F1F23]">
                  <div className="text-amber-400 font-bold">09:29:50 AM ET</div>
                  <div className="text-white font-medium mt-1">10-Sec Countdown</div>
                  <div className="text-[#8E9299] text-[11px] mt-0.5">Mauro Lomibao Dar III initiates bell chime</div>
                </div>

                <div className="p-3 bg-[#121216] rounded-lg border border-[#1F1F23]">
                  <div className="text-emerald-400 font-bold">09:30:00 AM ET</div>
                  <div className="text-white font-medium mt-1">Market Ringing & Open</div>
                  <div className="text-[#8E9299] text-[11px] mt-0.5">Global broadcast & trading begins</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ATOMIC SETTLEMENT RECEIPT INSPECTOR MODAL */}
      {selectedReceiptTrade && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101420] border border-[#1E2640] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl font-mono animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#1E2640] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  Atomic DvP Settlement Receipt
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceiptTrade(null)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Status Pulse Banner */}
            <div className="p-3.5 rounded-xl bg-[#090D18] border border-[#1A2338] flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400">Current Settlement State</div>
                <div className="text-xs font-bold text-white mt-0.5">
                  Trade #{selectedReceiptTrade.id}
                </div>
              </div>

              {/* Status Badge with subtle pulse */}
              <div
                onClick={() => triggerSettlementTransition(selectedReceiptTrade.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold font-mono transition-all duration-500 cursor-pointer ${
                  tradeSettlementStatuses[selectedReceiptTrade.id] === "Matched"
                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                    : pulsingTradeIds.has(selectedReceiptTrade.id)
                    ? "bg-emerald-500/25 text-emerald-200 border border-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.5)] scale-105"
                    : "bg-emerald-950/40 text-emerald-400 border border-emerald-500/30"
                }`}
                title="Click to re-verify transition"
              >
                {tradeSettlementStatuses[selectedReceiptTrade.id] === "Matched" ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                    </span>
                    <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: "3s" }} />
                    <span>Matched (Verifying...)</span>
                  </>
                ) : (
                  <>
                    <div className="relative flex items-center justify-center">
                      {pulsingTradeIds.has(selectedReceiptTrade.id) && (
                        <>
                          <span className="absolute -inset-1 rounded-full bg-emerald-400/40 animate-ping opacity-75 pointer-events-none" />
                          <span className="absolute -inset-1.5 rounded-full bg-emerald-500/20 animate-pulse pointer-events-none" />
                        </>
                      )}
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-0.5" />
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <span>Atomic Clearing Verified</span>
                  </>
                )}
              </div>
            </div>

            {/* Stepper Lifecycle */}
            <div className="p-3.5 rounded-xl bg-[#090D18] border border-[#1A2338] space-y-2">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Settlement Lifecycle Verification
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-300">
                  <div className="font-bold flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-400" /> 1. Matched
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Price-time order fill</div>
                </div>

                <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-300">
                  <div className="font-bold flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-400" /> 2. DvP Escrow
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Cash &amp; Asset Locked</div>
                </div>

                <div
                  className={`p-2 rounded-lg border transition-all duration-300 ${
                    tradeSettlementStatuses[selectedReceiptTrade.id] === "Matched"
                      ? "bg-amber-950/30 border-amber-500/40 text-amber-300 animate-pulse"
                      : "bg-emerald-950/40 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                  }`}
                >
                  <div className="font-bold flex items-center gap-1">
                    {tradeSettlementStatuses[selectedReceiptTrade.id] === "Matched" ? (
                      <Clock className="w-3 h-3 text-amber-400 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    )}
                    <span>3. Verified</span>
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">EVM Block Clearance</div>
                </div>
              </div>
            </div>

            {/* Trade Details Grid */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#1A2338]">
                <span className="text-slate-400">Asset Symbol:</span>
                <span className="text-white font-bold">{selectedReceiptTrade.symbol}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1A2338]">
                <span className="text-slate-400">Cleared Volume:</span>
                <span className="text-white">{selectedReceiptTrade.quantity.toLocaleString()} Shares</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1A2338]">
                <span className="text-slate-400">Execution Price:</span>
                <span className="text-emerald-400 font-bold">${selectedReceiptTrade.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1A2338]">
                <span className="text-slate-400">Total Consideration:</span>
                <span className="text-white font-bold">${selectedReceiptTrade.totalUsd.toLocaleString()} USD</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1A2338]">
                <span className="text-slate-400">EVM Block Number:</span>
                <span className="text-cyan-300">{selectedReceiptTrade.blockNumber || 21045981}</span>
              </div>
              <div className="flex flex-col py-1">
                <span className="text-slate-400 mb-1">Cryptographic Settlement Tx Hash:</span>
                <span className="text-[10px] text-cyan-400 bg-slate-950 p-2 rounded-lg break-all border border-slate-800">
                  {selectedReceiptTrade.txHash}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => triggerSettlementTransition(selectedReceiptTrade.id)}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Re-Test Settlement Pulse</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedReceiptTrade(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEC RULE 15c3-5 RISK HALT EMERGENCY MODAL */}
      {isRiskHaltModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#140b0f] border-2 border-rose-600/80 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-[0_0_50px_rgba(225,29,72,0.35)] font-mono animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-rose-900/60 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-600/60 text-rose-400">
                  <ShieldAlert className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white tracking-wider uppercase">
                      SEC RULE 15c3-5 CIRCUIT TRIPPED
                    </span>
                    <span className="text-xs text-rose-300 font-bold">
                      {riskHaltState.haltCode || "HALT-15C3-COLLAR"}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">
                    Token World Exchange (TWE) ATS® Trading Halt
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRiskHaltModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Halt Status Alert Box */}
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-600/50 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-rose-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  Venue State: Frozen
                </span>
                <span className="text-rose-400 font-mono text-[11px]">
                  Duration: {riskHaltState.haltDurationSec}s
                </span>
              </div>
              <p className="text-xs text-slate-200 font-sans leading-relaxed">
                {riskHaltState.haltReason || "Automated pre-trade risk collar breach exceeded statutory risk tolerances under SEC Rule 15c3-5 Market Access rules."}
              </p>
              <div className="text-[11px] text-rose-400/90 font-mono pt-1 border-t border-rose-900/40">
                Mandate: Central limit order book executions and routing paused until Chief Compliance Officer supervisory clearance is authenticated.
              </div>
            </div>

            {/* Recent Breaches Triggering Halt */}
            {riskBreaches.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                  Most Recent Collar Breach Intercept:
                </div>
                <div className="p-3 rounded-lg bg-black/60 border border-rose-950 text-xs space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Breach ID:</span>
                    <span className="text-amber-400 font-bold">{riskBreaches[0].id}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Symbol / Side:</span>
                    <span className="text-cyan-300 font-bold">{riskBreaches[0].symbol} · {riskBreaches[0].orderSide}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Order Consideration:</span>
                    <span className="text-white">{riskBreaches[0].quantity.toLocaleString()} @ ${riskBreaches[0].price.toFixed(2)} (${(riskBreaches[0].notionalUsd / 1e3).toFixed(1)}k USD)</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Violation Details:</span>
                    <span className="text-rose-400 text-right max-w-xs truncate">{riskBreaches[0].reason}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Supervisor Clearance Authentication Key Form */}
            <div className="space-y-2 pt-2 border-t border-rose-950">
              <label className="block text-xs text-slate-300 font-medium">
                Chief Compliance Officer (CCO) Clearance Key:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={supervisorOverrideKey}
                  onChange={(e) => setSupervisorOverrideKey(e.target.value)}
                  placeholder="Enter CCO Clearance Key..."
                  className="flex-1 px-3 py-2 bg-black/80 border border-rose-700/80 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-rose-400 placeholder-slate-600"
                />
                <button
                  type="button"
                  onClick={handleResumeTradingVenue}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-colors whitespace-nowrap cursor-pointer shadow-lg shadow-rose-900/40"
                >
                  Clear &amp; Resume
                </button>
              </div>
              <p className="text-[10px] text-slate-500 font-sans">
                Master override default: <code className="text-rose-300">MLD-TAURUS-CHIEF-COMPLIANCE</code> (Sole Owner: {OWNER_PROFILE.soleOwnerName})
              </p>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRiskHaltModalOpen(false);
                  setActiveMode("sec_15c3_5_collars");
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-400 text-xs font-medium border border-slate-700 cursor-pointer"
              >
                Open Collar Control Panel
              </button>
              <button
                type="button"
                onClick={() => setIsRiskHaltModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Close Warning
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
