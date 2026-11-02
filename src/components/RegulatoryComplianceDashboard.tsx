import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  FileCheck,
  Download,
  Search,
  UserCheck,
  AlertTriangle,
  Lock,
  Building2,
  FileText,
  Sliders,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  Plus,
  X,
  FileSpreadsheet,
  Flame,
  Zap,
  Volume2,
  VolumeX,
} from "lucide-react";
import { TokenRecord } from "../types";
import { OWNER_PROFILE } from "../utils/atsVenueData";
import { TopBookSpoofingHeatmap } from "./TopBookSpoofingHeatmap";
import {
  SpoofingAlert,
  SpoofingAlertNotificationLog,
} from "./SpoofingAlertNotificationLog";
import {
  secRule15c35RiskEngine,
  CollarBreachRecord,
  HaltStateInfo,
} from "../utils/complianceRiskEngine";

export interface KycRecord {
  id: string;
  legalName: string;
  entityType: "INDIVIDUAL" | "INSTITUTION" | "SOVEREIGN_FUND" | "FAMILY_OFFICE";
  tier: "TIER_1_RETAIL" | "TIER_2_INSTITUTIONAL" | "TIER_3_SOVEREIGN";
  jurisdiction: string;
  walletAddress: string;
  status: "VERIFIED" | "PENDING_REVIEW" | "SANCTION_FLAGGED";
  dailyLimitUsd: number;
  submittedAt: number;
  approvedAt?: number;
  secAccreditedStatus: "REG_D_506C" | "RULE_144A_QIB" | "REG_S_OFFSHORE";
}

export interface AmlAlert {
  id: string;
  timestamp: number;
  walletAddress: string;
  transactionAmountUsd: number;
  riskScore: number;
  alertType: "STRUCTURING_DETECTION" | "VELOCITY_BURST" | "SANCTION_PROXIMITY" | "FAT_FINGER_VIOLATION";
  status: "ACTIVE_FLAG" | "CLEARED" | "SAR_FILED";
  details: string;
}

interface RegulatoryComplianceDashboardProps {
  tokens?: TokenRecord[];
  onNavigateToTab?: (tab: string) => void;
}

export const RegulatoryComplianceDashboard: React.FC<RegulatoryComplianceDashboardProps> = ({
  tokens = [],
  onNavigateToTab,
}) => {
  const [activeTab, setActiveTab] = useState<
    "SPOOFING_HEATMAP" | "SPOOFING_ALERTS" | "KYC" | "AML" | "SEC_15C3_5" | "AUDIT_REPORTS"
  >("SPOOFING_HEATMAP");

  // SEC Rule 15c3-5 Live Risk Engine State
  const [riskHaltState, setRiskHaltState] = useState<HaltStateInfo>(() => secRule15c35RiskEngine.getHaltState());
  const [riskBreaches, setRiskBreaches] = useState<CollarBreachRecord[]>(() => secRule15c35RiskEngine.getBreachHistory());
  const [supervisorKeyInput, setSupervisorKeyInput] = useState<string>("MLD-TAURUS-CHIEF-COMPLIANCE");

  // Real-Time Spoofing Alert Notification State
  const [spoofingAlerts, setSpoofingAlerts] = useState<SpoofingAlert[]>([
    {
      id: "SPOOF-ALT-8021",
      timestamp: Date.now() - 1000 * 38,
      symbol: "TW-EQ",
      side: "ASK",
      priceLevel: "$52.75 (Ask +1 / Top-of-Book)",
      price: 52.75,
      cancelledVolume: 42500,
      cancellationCount: 26,
      fillCount: 1,
      cancelToFillRatio: 96.3,
      avgRestingTimeMs: 31,
      riskScore: 98,
      severity: "CRITICAL_SPOOFER",
      suspectTrader: "0x44BcA912c98F9082A81B0941F480414B60Ef110C (HFT Layering Bot)",
      patternDescription: "Rapid top-of-book quote stuffing & phantom depth layering: 42.5k shares cancelled in 31ms before opposite executions.",
      status: "NEW",
      isRead: false,
    },
    {
      id: "SPOOF-ALT-8019",
      timestamp: Date.now() - 1000 * 60 * 3,
      symbol: "TREE3",
      side: "BID",
      priceLevel: "$124.75 (Bid -1 / Top-of-Book)",
      price: 124.75,
      cancelledVolume: 35000,
      cancellationCount: 19,
      fillCount: 0,
      cancelToFillRatio: 100.0,
      avgRestingTimeMs: 44,
      riskScore: 94,
      severity: "FLASH_BURST",
      suspectTrader: "0x891a27eE242b109F20B271A6992dC8817282bAc6 (Suspected Spoof-Node)",
      patternDescription: "Aggressive sub-50ms flash cancellation cluster inflating perceived buy-side demand without bona fide fills.",
      status: "INVESTIGATING",
      isRead: true,
    },
    {
      id: "SPOOF-ALT-8014",
      timestamp: Date.now() - 1000 * 60 * 12,
      symbol: "MAOMAO",
      side: "ASK",
      priceLevel: "$8.93 (Ask +1 / Top-of-Book)",
      price: 8.93,
      cancelledVolume: 128000,
      cancellationCount: 38,
      fillCount: 2,
      cancelToFillRatio: 95.0,
      avgRestingTimeMs: 27,
      riskScore: 99,
      severity: "CRITICAL_SPOOFER",
      suspectTrader: "0x44BcA912c98F9082A81B0941F480414B60Ef110C (HFT Layering Bot)",
      patternDescription: "High-volume phantom wall cancellation cluster depressing NBBO mid-market prior to proprietary buy order execution.",
      status: "FLAGGED_FOR_SEC",
      isRead: true,
    },
  ]);

  const [activeAlertBanner, setActiveAlertBanner] = useState<SpoofingAlert | null>(null);
  const [isAudioAlertsEnabled, setIsAudioAlertsEnabled] = useState<boolean>(true);

  // Web Audio alert chime
  const playAlertChime = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.28);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.29);
    } catch {
      // Audio playback might be restricted without user interaction
    }
  };

  // Real-time alert dispatch handler
  const handleNewSpoofingAlert = (newAlert: SpoofingAlert) => {
    setSpoofingAlerts((prev) => [newAlert, ...prev]);
    setActiveAlertBanner(newAlert);
    if (isAudioAlertsEnabled) {
      playAlertChime();
    }
  };

  // Search and Filter states
  const [kycSearch, setKycSearch] = useState<string>("");
  const [kycTierFilter, setKycTierFilter] = useState<string>("ALL");

  // KYC Registry state
  const [kycRecords, setKycRecords] = useState<KycRecord[]>([
    {
      id: "KYC-INST-9021",
      legalName: "Citadel Global Digital Asset Fund LP",
      entityType: "INSTITUTION",
      tier: "TIER_2_INSTITUTIONAL",
      jurisdiction: "United States (Delaware)",
      walletAddress: "0x3A9F1B229D48C1C82902bC017845fD24E67Ac08E",
      status: "VERIFIED",
      dailyLimitUsd: 5000000,
      submittedAt: Date.now() - 86400000 * 12,
      approvedAt: Date.now() - 86400000 * 11,
      secAccreditedStatus: "RULE_144A_QIB",
    },
    {
      id: "KYC-SOV-0419",
      legalName: "Sovereign Treasury Wealth Allocation Vault",
      entityType: "SOVEREIGN_FUND",
      tier: "TIER_3_SOVEREIGN",
      jurisdiction: "Singapore / MAS Exemption",
      walletAddress: "0x789d98F8aC61466A8E1b3BfFa6c1B61942E285bF",
      status: "VERIFIED",
      dailyLimitUsd: 50000000,
      submittedAt: Date.now() - 86400000 * 25,
      approvedAt: Date.now() - 86400000 * 24,
      secAccreditedStatus: "REG_S_OFFSHORE",
    },
    {
      id: "KYC-RET-8812",
      legalName: "Alexander Vance",
      entityType: "INDIVIDUAL",
      tier: "TIER_1_RETAIL",
      jurisdiction: "United Kingdom",
      walletAddress: "0x12bE66708709320Ac321A858712C208492E69d12",
      status: "VERIFIED",
      dailyLimitUsd: 50000,
      submittedAt: Date.now() - 86400000 * 4,
      approvedAt: Date.now() - 86400000 * 3,
      secAccreditedStatus: "REG_D_506C",
    },
    {
      id: "KYC-INST-7734",
      legalName: "Helios Quant Partners LLC",
      entityType: "FAMILY_OFFICE",
      tier: "TIER_2_INSTITUTIONAL",
      jurisdiction: "Switzerland (Zug)",
      walletAddress: "0x9812A27F11C871A6992dC8817282bAc60E21e905",
      status: "PENDING_REVIEW",
      dailyLimitUsd: 2500000,
      submittedAt: Date.now() - 86400000 * 1,
      secAccreditedStatus: "RULE_144A_QIB",
    },
    {
      id: "KYC-SUSP-1002",
      legalName: "Blackwater Offshore Trading Corp",
      entityType: "INSTITUTION",
      tier: "TIER_2_INSTITUTIONAL",
      jurisdiction: "Seychelles (Unverified)",
      walletAddress: "0x44BcA912c98F9082A81B0941F480414B60Ef110C",
      status: "SANCTION_FLAGGED",
      dailyLimitUsd: 0,
      submittedAt: Date.now() - 86400000 * 2,
      secAccreditedStatus: "REG_S_OFFSHORE",
    },
  ]);

  // Real-Time AML Alerts
  const [amlAlerts, setAmlAlerts] = useState<AmlAlert[]>([
    {
      id: "AML-ALT-01",
      timestamp: Date.now() - 1000 * 60 * 14,
      walletAddress: "0x44BcA912c98F9082A81B0941F480414B60Ef110C",
      transactionAmountUsd: 9950,
      riskScore: 89,
      alertType: "STRUCTURING_DETECTION",
      status: "ACTIVE_FLAG",
      details: "Repeated sub-$10,000 threshold transfers detected within 60-second execution window (Structuring evasion).",
    },
    {
      id: "AML-ALT-02",
      timestamp: Date.now() - 1000 * 60 * 45,
      walletAddress: "0x891a27eE242b109F20B271A6992dC8817282bAc6",
      transactionAmountUsd: 450000,
      riskScore: 68,
      alertType: "VELOCITY_BURST",
      status: "ACTIVE_FLAG",
      details: "Unusual volume burst exceeding 400% of 30-day baseline moving average.",
    },
    {
      id: "AML-ALT-03",
      timestamp: Date.now() - 1000 * 60 * 120,
      walletAddress: "0x789d98F8aC61466A8E1b3BfFa6c1B61942E285bF",
      transactionAmountUsd: 1200000,
      riskScore: 22,
      alertType: "FAT_FINGER_VIOLATION",
      status: "CLEARED",
      details: "Large sovereign allocation matched against pre-cleared Rule 144A QIB liquidity pool. Reviewed and cleared.",
    },
  ]);

  // SEC Rule 15c3-5 Pre-Trade Risk Firewall Parameters synchronized with centralized risk engine
  const [collarPercentage, setCollarPercentage] = useState<number>(() => secRule15c35RiskEngine.getConfig().priceCollarBandPercent);
  const [maxOrderSizeUsd, setMaxOrderSizeUsd] = useState<number>(() => secRule15c35RiskEngine.getConfig().maxSingleOrderNotionalUsd);
  const [circuitBreakerThreshold, setCircuitBreakerThreshold] = useState<number>(() => secRule15c35RiskEngine.getConfig().circuitBreakerThresholdPct);
  const [cancelOnDisconnect, setCancelOnDisconnect] = useState<boolean>(() => secRule15c35RiskEngine.getConfig().cancelOnDisconnect);
  const [shortSaleLocateActive, setShortSaleLocateActive] = useState<boolean>(() => secRule15c35RiskEngine.getConfig().shortSaleLocateActive);

  // Sync with Risk Engine subscription
  useEffect(() => {
    return secRule15c35RiskEngine.subscribe(() => {
      setRiskHaltState(secRule15c35RiskEngine.getHaltState());
      setRiskBreaches(secRule15c35RiskEngine.getBreachHistory());
      const cfg = secRule15c35RiskEngine.getConfig();
      setCollarPercentage(cfg.priceCollarBandPercent);
      setMaxOrderSizeUsd(cfg.maxSingleOrderNotionalUsd);
      setCircuitBreakerThreshold(cfg.circuitBreakerThresholdPct);
      setCancelOnDisconnect(cfg.cancelOnDisconnect);
      setShortSaleLocateActive(cfg.shortSaleLocateActive);
    });
  }, []);

  const handleUpdateCollarBand = (val: number) => {
    setCollarPercentage(val);
    secRule15c35RiskEngine.updateConfig({ priceCollarBandPercent: val });
  };

  const handleUpdateMaxOrderNotional = (val: number) => {
    setMaxOrderSizeUsd(val);
    secRule15c35RiskEngine.updateConfig({ maxSingleOrderNotionalUsd: val });
  };

  const handleUpdateCancelOnDisconnect = (val: boolean) => {
    setCancelOnDisconnect(val);
    secRule15c35RiskEngine.updateConfig({ cancelOnDisconnect: val });
  };

  const handleUpdateShortSaleLocate = (val: boolean) => {
    setShortSaleLocateActive(val);
    secRule15c35RiskEngine.updateConfig({ shortSaleLocateActive: val });
  };

  const handleResumeTradingVenue = () => {
    const success = secRule15c35RiskEngine.resumeTrading(supervisorKeyInput);
    if (success) {
      showToast("Chief Compliance Officer override verified. Trading venue resumed from risk halt.");
    }
  };

  const handleTriggerSimulatedBreach = (type: "PRICE_COLLAR" | "MAX_NOTIONAL" | "CREDIT_LIMIT") => {
    const breach = secRule15c35RiskEngine.simulateBreachScenario(type);
    showToast(`Simulated ${breach.breachType}: Trading venue automatically entered HALT state.`);
  };

  // New KYC Modal
  const [isNewKycModalOpen, setIsNewKycModalOpen] = useState<boolean>(false);
  const [newKycName, setNewKycName] = useState<string>("");
  const [newKycWallet, setNewKycWallet] = useState<string>("");
  const [newKycJurisdiction, setNewKycJurisdiction] = useState<string>("United States");
  const [newKycTier, setNewKycTier] = useState<KycRecord["tier"]>("TIER_2_INSTITUTIONAL");
  const [newKycType, setNewKycType] = useState<KycRecord["entityType"]>("INSTITUTION");
  const [newKycAccredited, setNewKycAccredited] = useState<KycRecord["secAccreditedStatus"]>("RULE_144A_QIB");

  // Notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // KYC Actions
  const handleApproveKyc = (id: string) => {
    setKycRecords((prev) =>
      prev.map((k) => (k.id === id ? { ...k, status: "VERIFIED", approvedAt: Date.now() } : k))
    );
    showToast(`KYC Record ${id} approved. Pre-trade trading limit activated.`);
  };

  const handleFlagKyc = (id: string) => {
    setKycRecords((prev) =>
      prev.map((k) => (k.id === id ? { ...k, status: "SANCTION_FLAGGED", dailyLimitUsd: 0 } : k))
    );
    showToast(`KYC Record ${id} flagged. Trading permissions suspended.`);
  };

  const handleCreateKyc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKycName || !newKycWallet) return;

    const newRecord: KycRecord = {
      id: `KYC-NEW-${Date.now().toString().slice(-4)}`,
      legalName: newKycName,
      entityType: newKycType,
      tier: newKycTier,
      jurisdiction: newKycJurisdiction,
      walletAddress: newKycWallet,
      status: "PENDING_REVIEW",
      dailyLimitUsd: newKycTier === "TIER_3_SOVEREIGN" ? 25000000 : newKycTier === "TIER_2_INSTITUTIONAL" ? 5000000 : 50000,
      submittedAt: Date.now(),
      secAccreditedStatus: newKycAccredited,
    };

    setKycRecords([newRecord, ...kycRecords]);
    setIsNewKycModalOpen(false);
    setNewKycName("");
    setNewKycWallet("");
    showToast(`New KYC applicant for ${newRecord.legalName} logged for compliance review.`);
  };

  // AML Actions
  const handleClearAlert = (id: string) => {
    setAmlAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "CLEARED" } : a))
    );
    showToast(`Alert ${id} cleared by compliance officer.`);
  };

  const handleFileSar = (id: string) => {
    setAmlAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "SAR_FILED" } : a))
    );
    showToast(`Suspicious Activity Report (SAR) prepared and filed for ${id}.`);
  };

  // Compliance Export
  const handleExportCsvAudit = () => {
    const headers = [
      "Record ID",
      "Legal Name",
      "Entity Type",
      "Tier",
      "Jurisdiction",
      "Wallet Address",
      "Status",
      "Daily Limit USD",
      "Accreditation Status",
      "Submission Date",
      "Certification Entity",
      "Sole Owner / Founder",
    ];

    const rows = kycRecords.map((k) => [
      k.id,
      `"${k.legalName}"`,
      k.entityType,
      k.tier,
      `"${k.jurisdiction}"`,
      k.walletAddress,
      k.status,
      k.dailyLimitUsd,
      k.secAccreditedStatus,
      new Date(k.submittedAt).toISOString(),
      `"Token World Exchange (TWE) ATS®"`,
      `"${OWNER_PROFILE.soleOwnerName}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TWE_Regulatory_KYC_Audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Downloaded official KYC Compliance Audit CSV Report.");
  };

  const handleExportJsonDossier = () => {
    const auditPayload = {
      auditMetadata: {
        exchangeName: "Token World Exchange (TWE) ATS®",
        soleOwner: OWNER_PROFILE.soleOwnerName,
        regulatoryFramework: "SEC Regulation ATS Rule 301 & SEC Rule 15c3-5",
        generatedAt: new Date().toISOString(),
        preTradeRiskCollarBand: `±${collarPercentage}%`,
        maxSingleOrderLimitUsd: maxOrderSizeUsd,
        circuitBreakerTripPct: `${circuitBreakerThreshold}%`,
        venueHaltStatus: riskHaltState.isHalted ? "HALTED" : "OPERATIONAL",
      },
      kycRegistrations: kycRecords,
      amlTransactionAlerts: amlAlerts,
      riskFirewallInvariants: {
        shortSaleLocateEnforced: shortSaleLocateActive,
        cancelOnDisconnectEnforced: cancelOnDisconnect,
        settlementStandard: "Atomic T+0 DvP (ERC-3643)",
      },
      activeCollarBreaches: riskBreaches,
    };

    const blob = new Blob([JSON.stringify(auditPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `TWE_SEC_Compliance_Dossier_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Exported certified institutional SEC Compliance Dossier JSON.");
  };

  // Regulatory Submission: Download Audit Report (CSV)
  const handleDownloadAuditReport = () => {
    const reportDate = new Date();
    const batchId = `SEC-CAT-SPOOF-${reportDate.getTime().toString(36).toUpperCase()}`;

    const escapeCsv = (val: string | number | undefined | null) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = [
      "RECORD_TYPE",
      "INCIDENT_ALERT_ID",
      "FLAGGED_CANCELLATION_TIMESTAMP_UTC",
      "FLAGGED_TIMESTAMP_EPOCH_MS",
      "FLAGGED_TIME_EST",
      "BURST_SEQUENCE_ID",
      "SYMBOL",
      "ORDER_SIDE",
      "PRICE_LEVEL",
      "LIMIT_PRICE_USD",
      "CANCELLED_VOLUME",
      "CANCELLATIONS_IN_BURST",
      "EXECUTED_FILLS",
      "CANCEL_RATIO_PCT",
      "AVG_RESTING_TIME_MS",
      "RISK_SCORE",
      "SEVERITY",
      "DETECTED_SPOOFING_PATTERN",
      "PATTERN_FORENSIC_SUMMARY",
      "SUSPECT_PARTICIPANT_WALLET",
      "COMPLIANCE_DISPOSITION",
      "REGULATORY_FRAMEWORK",
      "EXCHANGE_VENUE",
      "CAT_SUBMISSION_BATCH_ID",
      "CHIEF_COMPLIANCE_OFFICER_SIGNATURE",
    ];

    const rows: string[][] = [];

    spoofingAlerts.forEach((alert) => {
      // 1. Primary Detected Spoofing Pattern Cluster Record
      rows.push([
        escapeCsv("DETECTED_SPOOFING_PATTERN_CLUSTER"),
        escapeCsv(alert.id),
        escapeCsv(new Date(alert.timestamp).toISOString()),
        escapeCsv(alert.timestamp),
        escapeCsv(new Date(alert.timestamp).toLocaleString("en-US", { timeZone: "America/New_York" }) + " EST"),
        escapeCsv("CLUSTER_SUMMARY"),
        escapeCsv(alert.symbol),
        escapeCsv(alert.side),
        escapeCsv(alert.priceLevel),
        escapeCsv(alert.price.toFixed(2)),
        escapeCsv(alert.cancelledVolume),
        escapeCsv(alert.cancellationCount),
        escapeCsv(alert.fillCount),
        escapeCsv(`${alert.cancelToFillRatio.toFixed(1)}%`),
        escapeCsv(`${alert.avgRestingTimeMs}ms`),
        escapeCsv(alert.riskScore),
        escapeCsv(alert.severity),
        escapeCsv(alert.severity.replace(/_/g, " ")),
        escapeCsv(alert.patternDescription),
        escapeCsv(alert.suspectTrader),
        escapeCsv(alert.status),
        escapeCsv("SEC Reg ATS Rule 301(b)(10) / FINRA Rule 5210 / 15 U.S.C. § 78j(b) / CEA § 6c(a)(5)(C)"),
        escapeCsv("Token World Exchange (TWE) ATS®"),
        escapeCsv(batchId),
        escapeCsv(`Attested by ${OWNER_PROFILE.soleOwnerName}, Chief Compliance Officer`),
      ]);

      // 2. Granular Flagged Order Cancellation Timestamps Tape
      const granularCount = Math.min(alert.cancellationCount, 12);
      const avgVol = Math.round(alert.cancelledVolume / Math.max(1, alert.cancellationCount));
      for (let seq = 1; seq <= granularCount; seq++) {
        const orderTimeMs = alert.timestamp - (granularCount - seq) * Math.max(1, Math.round(alert.avgRestingTimeMs / 2));
        const restingMs = Math.max(14, Math.round(alert.avgRestingTimeMs + Math.cos(seq) * 5));
        rows.push([
          escapeCsv("FLAGGED_CANCELLATION_TIMESTAMP_EVENT"),
          escapeCsv(`${alert.id}-ORDER-${String(seq).padStart(3, "0")}`),
          escapeCsv(new Date(orderTimeMs).toISOString()),
          escapeCsv(orderTimeMs),
          escapeCsv(new Date(orderTimeMs).toLocaleString("en-US", { timeZone: "America/New_York" }) + " EST"),
          escapeCsv(`CANCEL_ORDER_${seq}_OF_${alert.cancellationCount}`),
          escapeCsv(alert.symbol),
          escapeCsv(alert.side),
          escapeCsv(alert.priceLevel),
          escapeCsv(alert.price.toFixed(2)),
          escapeCsv(avgVol),
          escapeCsv(1),
          escapeCsv(0),
          escapeCsv("100.0%"),
          escapeCsv(`${restingMs}ms`),
          escapeCsv(alert.riskScore),
          escapeCsv(alert.severity),
          escapeCsv(`Rapid Quote Stuffing / Non-Bona Fide Withdrawal Event #${seq}`),
          escapeCsv(`Flagged top-of-book order withdrawn after ${restingMs}ms resting duration`),
          escapeCsv(alert.suspectTrader),
          escapeCsv(alert.status),
          escapeCsv("FINRA Rule 5210 Non-Bona Fide Order Withdrawal"),
          escapeCsv("Token World Exchange (TWE) ATS®"),
          escapeCsv(batchId),
          escapeCsv(`Attested by ${OWNER_PROFILE.soleOwnerName}, Chief Compliance Officer`),
        ]);
      }
    });

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TWE_ATS_Spoofing_Surveillance_Audit_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Downloaded official Spoofing Surveillance Audit Report CSV (${spoofingAlerts.length} patterns & flagged cancellation timestamps).`);
  };

  const unacknowledgedSpoofCount = useMemo(() => {
    return spoofingAlerts.filter((a) => a.status === "NEW").length;
  }, [spoofingAlerts]);

  const handleAcknowledgeSpoofAlert = (id: string) => {
    setSpoofingAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "ACKNOWLEDGED", isRead: true } : a))
    );
    if (activeAlertBanner?.id === id) {
      setActiveAlertBanner(null);
    }
    showToast(`Acknowledged spoofing alert ${id}.`);
  };

  const handleFreezeTraderMarketAccess = (traderAddress: string, alertId: string) => {
    handleFlagKyc(traderAddress);
    setSpoofingAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId || a.suspectTrader.includes(traderAddress)
          ? { ...a, status: "ACCESS_RESTRICTED", isRead: true }
          : a
      )
    );
    if (activeAlertBanner?.id === alertId) {
      setActiveAlertBanner(null);
    }
    showToast(`REVOKED ATS MATCHING ACCESS for ${traderAddress}. Placed under AML sanction freeze.`);
  };

  const handleFlagForSecTcr = (alert: SpoofingAlert) => {
    setSpoofingAlerts((prev) =>
      prev.map((a) => (a.id === alert.id ? { ...a, status: "FLAGGED_FOR_SEC", isRead: true } : a))
    );

    const report = {
      agency: "U.S. Securities and Exchange Commission (SEC) - Division of Enforcement",
      form: "Form TCR (Tip, Complaint or Referral) - Market Manipulation / Spoofing Alert Dossier",
      venue: "Token World Exchange (TWE) ATS®",
      soleOwner: OWNER_PROFILE.soleOwnerName,
      headquarters: OWNER_PROFILE.headquarters,
      timestamp: new Date().toISOString(),
      alertRecord: alert,
      statutoryViolations: [
        "15 U.S.C. § 78j(b) and 17 CFR § 240.10b-5 (Employment of Manipulative and Deceptive Devices)",
        "FINRA Rule 5210 (Publication of Transactions and Quotations - Non-Bona Fide Bids/Offers)",
        "Commodity Exchange Act 7 U.S.C. § 6c(a)(5)(C) (Prohibition against Spoofing and Layering)",
      ],
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SEC_Form_TCR_Spoofing_Alert_${alert.id}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (activeAlertBanner?.id === alert.id) {
      setActiveAlertBanner(null);
    }
    showToast(`Filed SEC Form TCR Referral and exported dossier for alert ${alert.id}.`);
  };

  const handleToggleAlertStatus = (alertId: string, nextStatus: SpoofingAlert["status"]) => {
    setSpoofingAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: nextStatus, isRead: true } : a))
    );
  };

  const handleSimulateBurstTrigger = () => {
    const burstVol = 48500 + Math.floor(Math.random() * 28000);
    const burstResting = 22 + Math.floor(Math.random() * 25);
    const burstTrader = "0x44BcA912c98F9082A81B0941F480414B60Ef110C (HFT Layering Bot)";
    const alertId = `SPOOF-ALERT-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const newAlert: SpoofingAlert = {
      id: alertId,
      timestamp: Date.now(),
      symbol: "TW-EQ",
      side: "ASK",
      priceLevel: "$52.75 (Ask +1 / Top-of-Book)",
      price: 52.75,
      cancelledVolume: burstVol,
      cancellationCount: 28,
      fillCount: 0,
      cancelToFillRatio: 100,
      avgRestingTimeMs: burstResting,
      riskScore: 99,
      severity: "CRITICAL_SPOOFER",
      suspectTrader: burstTrader,
      patternDescription: `Real-time top-of-book spoofing cluster detected: ${burstVol.toLocaleString()} phantom shares flashed and withdrawn in ${burstResting}ms to manipulate NBBO spread.`,
      status: "NEW",
      isRead: false,
    };

    handleNewSpoofingAlert(newAlert);
    showToast(`Simulated high-volume cancellation cluster on TW-EQ: ${burstVol.toLocaleString()} shares in ${burstResting}ms!`);
  };

  const filteredKyc = useMemo(() => {
    return kycRecords.filter((k) => {
      const matchSearch =
        k.legalName.toLowerCase().includes(kycSearch.toLowerCase()) ||
        k.walletAddress.toLowerCase().includes(kycSearch.toLowerCase()) ||
        k.id.toLowerCase().includes(kycSearch.toLowerCase());
      const matchTier = kycTierFilter === "ALL" || k.tier === kycTierFilter;
      return matchSearch && matchTier;
    });
  }, [kycRecords, kycSearch, kycTierFilter]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-16">
      {/* Header Banner */}
      <div className="border-b border-slate-800 bg-slate-900/60 px-4 py-5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-cyan-400" />
              <h1 className="text-xl font-bold tracking-tight text-white">
                Regulatory Compliance & SEC Audit Hub
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Token World Exchange (TWE) ATS® · Chief Compliance Terminal · Founder & Sole Owner: {OWNER_PROFILE.soleOwnerName}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadAuditReport}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs px-3.5 py-2 rounded font-semibold transition-colors shadow-sm whitespace-nowrap"
              title="Download CSV Audit Report of detected spoofing patterns and flagged cancellation timestamps for regulatory submission"
            >
              <Download className="w-4 h-4" />
              Download Audit Report (CSV)
            </button>
            <button
              onClick={handleExportCsvAudit}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs px-3 py-2 rounded transition-colors whitespace-nowrap"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Export KYC Audit CSV
            </button>
            <button
              onClick={handleExportJsonDossier}
              className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs px-3 py-2 rounded font-medium transition-colors shadow-sm whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              SEC Compliance JSON
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="max-w-7xl mx-auto w-full px-4 mt-3">
          <div className="p-3 bg-cyan-950/60 border border-cyan-500/50 text-cyan-200 text-xs rounded flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Live Real-Time Spoofing Alert Banner */}
      {activeAlertBanner && (
        <div className="max-w-7xl mx-auto w-full px-4 mt-3">
          <div className="p-3.5 bg-gradient-to-r from-rose-950/95 via-red-950/90 to-slate-900 border-2 border-rose-500/80 rounded-xl shadow-2xl flex flex-wrap items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-rose-600/50">
                <Flame className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-rose-300 font-mono">
                    [LIVE REAL-TIME SPOOFING ANOMALY TRIGGERED]
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-600 text-white">
                    {activeAlertBanner.symbol} · {activeAlertBanner.severity.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-xs text-white font-medium mt-0.5">
                  Rapid high-volume cancellation cluster: <strong className="text-amber-300 font-mono">{activeAlertBanner.cancelledVolume.toLocaleString()} shares</strong> cancelled in <strong className="text-rose-300 font-mono">{activeAlertBanner.avgRestingTimeMs}ms</strong> at <strong className="text-cyan-300 font-mono">{activeAlertBanner.priceLevel}</strong> by <span className="font-mono text-slate-300">{activeAlertBanner.suspectTrader.split(" ")[0]}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setActiveTab("SPOOFING_ALERTS");
                  setActiveAlertBanner(null);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-colors"
              >
                Investigate in Alert Log
              </button>
              <button
                onClick={() =>
                  handleFreezeTraderMarketAccess(
                    activeAlertBanner.suspectTrader.split(" ")[0],
                    activeAlertBanner.id
                  )
                }
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-900 hover:bg-purple-800 text-purple-200 border border-purple-600 transition-colors"
              >
                Freeze Trader Access
              </button>
              <button
                onClick={() => setActiveAlertBanner(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto w-full px-4 pt-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg max-w-5xl">
          <button
            onClick={() => setActiveTab("SPOOFING_HEATMAP")}
            className={`flex-1 min-w-[170px] py-2 px-3 text-xs font-semibold rounded transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === "SPOOFING_HEATMAP"
                ? "bg-rose-950 text-rose-300 border border-rose-800/80 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            Top-of-Book Heatmap (D3)
          </button>
          <button
            onClick={() => setActiveTab("SPOOFING_ALERTS")}
            className={`flex-1 min-w-[170px] py-2 px-3 text-xs font-semibold rounded transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === "SPOOFING_ALERTS"
                ? "bg-rose-900/80 text-rose-200 border border-rose-600/80 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            Spoofing Alert Log
            {unacknowledgedSpoofCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-rose-600 text-white animate-pulse">
                {unacknowledgedSpoofCount} NEW
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("KYC")}
            className={`flex-1 min-w-[130px] py-2 px-3 text-xs font-medium rounded transition-colors ${
              activeTab === "KYC"
                ? "bg-slate-800 text-cyan-400 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Tiered KYC ({kycRecords.length})
          </button>
          <button
            onClick={() => setActiveTab("AML")}
            className={`flex-1 min-w-[140px] py-2 px-3 text-xs font-medium rounded transition-colors ${
              activeTab === "AML"
                ? "bg-slate-800 text-cyan-400 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            AML Velocity ({amlAlerts.filter((a) => a.status === "ACTIVE_FLAG").length})
          </button>
          <button
            onClick={() => setActiveTab("SEC_15C3_5")}
            className={`flex-1 min-w-[160px] py-2 px-3 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === "SEC_15C3_5"
                ? "bg-slate-800 text-cyan-400 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            SEC 15c3-5 Collars
            {riskHaltState.isHalted && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("AUDIT_REPORTS")}
            className={`flex-1 min-w-[150px] py-2 px-3 text-xs font-medium rounded transition-colors ${
              activeTab === "AUDIT_REPORTS"
                ? "bg-slate-800 text-cyan-400 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Form ATS Certifications
          </button>
        </div>
      </div>

      {/* Main Content Areas */}
      <div className="max-w-7xl mx-auto w-full px-4 py-4 flex-1">
        {/* TAB 0A: TOP-OF-BOOK SPOOFING HEATMAP (D3) + LIVE ALERT STREAM */}
        {activeTab === "SPOOFING_HEATMAP" && (
          <div className="space-y-6">
            <TopBookSpoofingHeatmap
              onFlagTrader={(traderAddr) => {
                handleFlagKyc(traderAddr);
              }}
              onSpoofingAlert={handleNewSpoofingAlert}
            />

            {/* Live Real-Time Spoofing Detection Feed */}
            <div className="pt-2">
              <SpoofingAlertNotificationLog
                alerts={spoofingAlerts}
                onAcknowledgeAlert={handleAcknowledgeSpoofAlert}
                onFreezeTrader={handleFreezeTraderMarketAccess}
                onFlagForSecTcr={handleFlagForSecTcr}
                onToggleStatus={handleToggleAlertStatus}
                onSimulateBurst={handleSimulateBurstTrigger}
                onClearAll={() => {
                  setSpoofingAlerts((prev) =>
                    prev.map((a) => ({ ...a, status: "ACKNOWLEDGED", isRead: true }))
                  );
                  setActiveAlertBanner(null);
                }}
                isAudioAlertsEnabled={isAudioAlertsEnabled}
                onToggleAudioAlerts={() => setIsAudioAlertsEnabled(!isAudioAlertsEnabled)}
                onFocusSymbol={() => setActiveTab("SPOOFING_HEATMAP")}
                onDownloadAuditReport={handleDownloadAuditReport}
                compactMode={true}
              />
            </div>
          </div>
        )}

        {/* TAB 0B: DEDICATED FULL SPOOFING NOTIFICATION LOG */}
        {activeTab === "SPOOFING_ALERTS" && (
          <div className="space-y-4">
            <SpoofingAlertNotificationLog
              alerts={spoofingAlerts}
              onAcknowledgeAlert={handleAcknowledgeSpoofAlert}
              onFreezeTrader={handleFreezeTraderMarketAccess}
              onFlagForSecTcr={handleFlagForSecTcr}
              onToggleStatus={handleToggleAlertStatus}
              onSimulateBurst={handleSimulateBurstTrigger}
              onClearAll={() => {
                setSpoofingAlerts((prev) =>
                  prev.map((a) => ({ ...a, status: "ACKNOWLEDGED", isRead: true }))
                );
                setActiveAlertBanner(null);
              }}
              isAudioAlertsEnabled={isAudioAlertsEnabled}
              onToggleAudioAlerts={() => setIsAudioAlertsEnabled(!isAudioAlertsEnabled)}
              onFocusSymbol={() => setActiveTab("SPOOFING_HEATMAP")}
              onDownloadAuditReport={handleDownloadAuditReport}
              compactMode={false}
            />
          </div>
        )}

        {/* TAB 1: KYC REGISTRY */}
        {activeTab === "KYC" && (
          <div className="space-y-4">
            {/* Filter and Add Applicant Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 border border-slate-800 p-3 rounded-lg">
              <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={kycSearch}
                    onChange={(e) => setKycSearch(e.target.value)}
                    placeholder="Search by legal name, wallet, or ID..."
                    className="w-full bg-slate-950 border border-slate-800 pl-9 pr-3 py-1.5 text-xs rounded text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <select
                  value={kycTierFilter}
                  onChange={(e) => setKycTierFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs rounded text-slate-300 focus:outline-none focus:border-cyan-500"
                >
                  <option value="ALL">All KYC Tiers</option>
                  <option value="TIER_1_RETAIL">Tier 1 Retail ($50K)</option>
                  <option value="TIER_2_INSTITUTIONAL">Tier 2 Institutional ($5M)</option>
                  <option value="TIER_3_SOVEREIGN">Tier 3 Sovereign ($50M+)</option>
                </select>
              </div>

              <button
                onClick={() => setIsNewKycModalOpen(true)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded transition-colors whitespace-nowrap font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Add KYC Applicant
              </button>
            </div>

            {/* KYC Table */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-lg overflow-x-auto">
              <table className="w-full text-xs font-mono text-left">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800 bg-slate-950/40">
                    <th className="py-3 px-3">RECORD ID</th>
                    <th className="py-3 px-3">LEGAL ENTITY</th>
                    <th className="py-3 px-3">TIER & LIMIT</th>
                    <th className="py-3 px-3">JURISDICTION</th>
                    <th className="py-3 px-3">WALLET ADDRESS</th>
                    <th className="py-3 px-3">STATUS</th>
                    <th className="py-3 px-3 text-right">COMPLIANCE ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {filteredKyc.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-800/20">
                      <td className="py-3 px-3 text-slate-300 font-bold">{rec.id}</td>
                      <td className="py-3 px-3">
                        <div className="text-white font-medium font-sans">{rec.legalName}</div>
                        <div className="text-slate-500 text-[10px]">{rec.secAccreditedStatus}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-slate-200">
                          {rec.tier === "TIER_3_SOVEREIGN"
                            ? "Tier 3 Sovereign"
                            : rec.tier === "TIER_2_INSTITUTIONAL"
                            ? "Tier 2 Institutional"
                            : "Tier 1 Retail"}
                        </div>
                        <div className="text-slate-500 text-[10px]">
                          ${(rec.dailyLimitUsd / 1e6).toFixed(1)}M / day limit
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-400 font-sans">{rec.jurisdiction}</td>
                      <td className="py-3 px-3 text-slate-400">
                        {rec.walletAddress.slice(0, 8)}...{rec.walletAddress.slice(-6)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`font-semibold text-[11px] ${
                            rec.status === "VERIFIED"
                              ? "text-emerald-400"
                              : rec.status === "PENDING_REVIEW"
                              ? "text-amber-400"
                              : "text-rose-400"
                          }`}
                        >
                          {rec.status === "VERIFIED"
                            ? "Verified"
                            : rec.status === "PENDING_REVIEW"
                            ? "Pending Review"
                            : "Sanction Flagged"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {rec.status !== "VERIFIED" && (
                            <button
                              onClick={() => handleApproveKyc(rec.id)}
                              className="text-emerald-400 hover:text-emerald-300 font-medium px-2 py-1 rounded hover:bg-emerald-950/40"
                            >
                              Approve
                            </button>
                          )}
                          {rec.status !== "SANCTION_FLAGGED" && (
                            <button
                              onClick={() => handleFlagKyc(rec.id)}
                              className="text-rose-400 hover:text-rose-300 font-medium px-2 py-1 rounded hover:bg-rose-950/40"
                            >
                              Flag
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: AML VELOCITY ALERTS */}
        {activeTab === "AML" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-lg">
                <div className="text-slate-400 text-xs">MONITORED TRANSACTIONS</div>
                <div className="text-2xl font-bold font-mono text-white mt-1">14,290</div>
                <p className="text-[11px] text-slate-500 mt-1">Automated real-time heuristic pass rate: 99.8%</p>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-lg">
                <div className="text-slate-400 text-xs">ACTIVE HIGH-RISK FLAGS</div>
                <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                  {amlAlerts.filter((a) => a.status === "ACTIVE_FLAG").length}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Requires compliance supervisory disposition</p>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-lg">
                <div className="text-slate-400 text-xs">SARs TRANSMITTED</div>
                <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                  {amlAlerts.filter((a) => a.status === "SAR_FILED").length}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Direct regulatory FinCEN audit logs</p>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 rounded-lg overflow-x-auto">
              <table className="w-full text-xs font-mono text-left">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800 bg-slate-950/40">
                    <th className="py-3 px-3">ALERT ID</th>
                    <th className="py-3 px-3">RISK SCORE</th>
                    <th className="py-3 px-3">VIOLATION TYPE</th>
                    <th className="py-3 px-3">WALLET & AMOUNT</th>
                    <th className="py-3 px-3">DETAILS</th>
                    <th className="py-3 px-3">STATUS</th>
                    <th className="py-3 px-3 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {amlAlerts.map((alt) => (
                    <tr key={alt.id} className="hover:bg-slate-800/20">
                      <td className="py-3 px-3 text-slate-300 font-bold">{alt.id}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            alt.riskScore >= 75
                              ? "bg-rose-950/80 text-rose-400 border border-rose-800"
                              : "bg-amber-950/80 text-amber-400 border border-amber-800"
                          }`}
                        >
                          {alt.riskScore} / 100
                        </span>
                      </td>
                      <td className="py-3 px-3 text-white font-medium">{alt.alertType.replace("_", " ")}</td>
                      <td className="py-3 px-3">
                        <div className="text-slate-300">${alt.transactionAmountUsd.toLocaleString()}</div>
                        <div className="text-slate-500 text-[10px]">{alt.walletAddress.slice(0, 10)}...</div>
                      </td>
                      <td className="py-3 px-3 text-slate-400 font-sans max-w-sm">{alt.details}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`font-semibold ${
                            alt.status === "ACTIVE_FLAG"
                              ? "text-rose-400"
                              : alt.status === "CLEARED"
                              ? "text-emerald-400"
                              : "text-cyan-400"
                          }`}
                        >
                          {alt.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {alt.status === "ACTIVE_FLAG" && (
                            <>
                              <button
                                onClick={() => handleClearAlert(alt.id)}
                                className="text-slate-300 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
                              >
                                Clear
                              </button>
                              <button
                                onClick={() => handleFileSar(alt.id)}
                                className="text-rose-300 hover:text-white px-2 py-1 rounded bg-rose-900/60 hover:bg-rose-900"
                              >
                                File SAR
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: SEC RULE 15C3-5 PRE-TRADE RISK COLLARS */}
        {activeTab === "SEC_15C3_5" && (
          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-lg space-y-6">
            {/* Real-time Venue Halt Status Banner */}
            {riskHaltState.isHalted ? (
              <div className="p-4 bg-rose-950/80 border-2 border-rose-600 rounded-lg flex flex-wrap items-center justify-between gap-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-8 h-8 text-rose-400 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-rose-200 font-bold text-sm tracking-wide">
                        🔴 VENUE HALT ACTIVE: SEC RULE 15c3-5 CIRCUIT TRIPPED
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-900 text-rose-200">
                        {riskHaltState.haltCode}
                      </span>
                    </div>
                    <p className="text-xs text-rose-300 mt-1 font-mono">
                      {riskHaltState.haltReason}
                    </p>
                    <p className="text-[11px] text-rose-400 mt-0.5">
                      Halted for: {riskHaltState.haltDurationSec} seconds · New order submissions & matching frozen.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={supervisorKeyInput}
                    onChange={(e) => setSupervisorKeyInput(e.target.value)}
                    placeholder="Supervisor Clearance Key"
                    className="bg-slate-950 border border-rose-700 px-3 py-1.5 text-xs rounded text-white focus:outline-none focus:border-rose-400 font-mono"
                  />
                  <button
                    onClick={handleResumeTradingVenue}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded shadow-md transition-colors whitespace-nowrap"
                  >
                    Authorize Resume
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-950/50 border border-emerald-600/60 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-emerald-300 text-xs font-bold">
                      🟢 SEC RULE 15c3-5 COMPLIANCE COLLARS ACTIVE & NORMAL
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Automated risk engine validating price collars (±{collarPercentage}%), max notional ($
                      {(maxOrderSizeUsd / 1e3).toLocaleString()}K), and participant credit lines.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab("SPOOFING_HEATMAP")}
                    className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-xs font-medium border border-slate-700 transition-colors"
                  >
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    View Spoofing Heatmap
                  </button>
                </div>
              </div>
            )}

            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                SEC Rule 15c3-5 Pre-Trade Risk Firewall Controls
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Mandates algorithmic checks that prevent erroneous orders, exceeding credit thresholds, and off-market executions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Collar Slider */}
              <div className="space-y-2 bg-slate-950/60 p-4 rounded border border-slate-800">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">Price Collar Band:</span>
                  <span className="text-cyan-400 font-mono font-bold">±{collarPercentage}%</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="20"
                  step="1"
                  value={collarPercentage}
                  onChange={(e) => handleUpdateCollarBand(parseInt(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500">
                  Automatically rejects limit orders submitted more than {collarPercentage}% away from National Best Bid & Offer (NBBO).
                  For TW-EQ ($52.50), permissible band is ${(52.5 * (1 - collarPercentage / 100)).toFixed(2)} - ${(52.5 * (1 + collarPercentage / 100)).toFixed(2)}.
                </p>
              </div>

              {/* Max Single Order Slider */}
              <div className="space-y-2 bg-slate-950/60 p-4 rounded border border-slate-800">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">Fat-Finger Single Order Cap:</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    ${(maxOrderSizeUsd / 1e3).toLocaleString()}K USD
                  </span>
                </div>
                <input
                  type="range"
                  min="100000"
                  max="10000000"
                  step="100000"
                  value={maxOrderSizeUsd}
                  onChange={(e) => handleUpdateMaxOrderNotional(parseInt(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500">
                  Blocks single ticket submissions exceeding ${(maxOrderSizeUsd / 1e3).toLocaleString()}K without secondary authorization.
                </p>
              </div>
            </div>

            {/* Toggle Switches */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <label className="flex items-center justify-between p-3 bg-slate-950/40 rounded border border-slate-850 cursor-pointer hover:bg-slate-950/60">
                <div>
                  <div className="text-xs font-medium text-white">Cancel on Disconnect (CoD) Engine</div>
                  <div className="text-[11px] text-slate-400">
                    Instantly purges all resting open limit orders if the trader's WebSocket heartbeat drops for &gt; 3,000ms.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={cancelOnDisconnect}
                  onChange={(e) => handleUpdateCancelOnDisconnect(e.target.checked)}
                  className="w-4 h-4 accent-cyan-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-slate-950/40 rounded border border-slate-850 cursor-pointer hover:bg-slate-950/60">
                <div>
                  <div className="text-xs font-medium text-white">Short-Sale Locate (SEC Rule 201 Reg SHO)</div>
                  <div className="text-[11px] text-slate-400">
                    Pre-verifies borrow allocation availability prior to executing sell orders marked as short.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={shortSaleLocateActive}
                  onChange={(e) => handleUpdateShortSaleLocate(e.target.checked)}
                  className="w-4 h-4 accent-cyan-500 cursor-pointer"
                />
              </label>
            </div>

            {/* Compliance Testing Simulation Panel */}
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Pre-Trade Risk Engine Testbench & Automated Halt Verification
                </span>
                <span className="text-[10px] text-slate-500 font-mono">SEC Rule 15c3-5 Stress Simulator</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Simulate errant market maker tickets breaching risk collars to verify automated venue circuit trips and order rejections:
              </p>
              <div className="flex flex-wrap gap-2.5 pt-1">
                <button
                  onClick={() => handleTriggerSimulatedBreach("PRICE_COLLAR")}
                  className="px-3 py-1.5 bg-rose-950/70 hover:bg-rose-900/80 text-rose-300 border border-rose-800 rounded text-xs font-semibold transition-colors"
                >
                  ⚡ Simulate Price Collar Breach (+49.5%)
                </button>
                <button
                  onClick={() => handleTriggerSimulatedBreach("MAX_NOTIONAL")}
                  className="px-3 py-1.5 bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 border border-amber-800 rounded text-xs font-semibold transition-colors"
                >
                  ⚡ Simulate Fat-Finger Notional ($6.25M)
                </button>
                <button
                  onClick={() => handleTriggerSimulatedBreach("CREDIT_LIMIT")}
                  className="px-3 py-1.5 bg-purple-950/70 hover:bg-purple-900/80 text-purple-300 border border-purple-800 rounded text-xs font-semibold transition-colors"
                >
                  ⚡ Simulate Credit Exposure Breach ($13.1M)
                </button>
              </div>
            </div>

            {/* Active Collar Breach Log */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  SEC Rule 15c3-5 Intercept Audit Log ({riskBreaches.length})
                </span>
                <span className="text-[11px] text-slate-500 font-mono">Real-time Pre-Trade Rejections</span>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg overflow-x-auto">
                <table className="w-full text-xs font-mono text-left">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800 bg-slate-950">
                      <th className="py-2.5 px-3">BREACH ID</th>
                      <th className="py-2.5 px-3">ASSET</th>
                      <th className="py-2.5 px-3">VIOLATION</th>
                      <th className="py-2.5 px-3">ORDER DETAILS</th>
                      <th className="py-2.5 px-3">REASON DETAILS</th>
                      <th className="py-2.5 px-3">DISPOSITION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {riskBreaches.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-900/40">
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
                        <td className="py-2 px-3 text-slate-400 font-sans max-w-xs truncate" title={b.reason}>
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
        )}

        {/* TAB 4: FORM ATS REGULATORY CERTIFICATIONS */}
        {activeTab === "AUDIT_REPORTS" && (
          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-lg space-y-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-cyan-400" />
                SEC Form ATS-N Certified Compliance Dossier
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Official regulatory disclosures for Alternative Trading Systems operating under SEC Rule 301.
              </p>
            </div>

            <div className="p-4 bg-slate-950/80 rounded border border-slate-800 font-mono text-xs space-y-2 text-slate-300">
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span>OPERATING ENTITY:</span>
                <span className="text-white font-bold">Token World Exchange (TWE) ATS®</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span>FOUNDER & SOLE OWNER:</span>
                <span className="text-cyan-400 font-bold">{OWNER_PROFILE.soleOwnerName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span>PRIMARY MATCHING VENUE:</span>
                <span className="text-white">TokenWorldCLOB Central Limit Order Book</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span>SEC RULE 15C3-5 COMPLIANCE:</span>
                <span className="text-emerald-400 font-bold">CERTIFIED ACTIVE (100%)</span>
              </div>
              <div className="flex justify-between pb-1">
                <span>SETTLEMENT LIFECYCLE:</span>
                <span className="text-white">Atomic T+0 DvP (Delivery vs Payment) ERC-3643</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleExportCsvAudit}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4 py-2.5 rounded font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Complete Form ATS CSV Audit
              </button>
              <button
                onClick={handleExportJsonDossier}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs px-4 py-2.5 rounded transition-colors"
              >
                <FileText className="w-4 h-4 text-cyan-400" />
                Generate SEC Audit JSON Dossier
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New KYC Modal */}
      {isNewKycModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Enroll New KYC Applicant</h3>
              <button
                onClick={() => setIsNewKycModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateKyc} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Legal Entity / Full Name</label>
                <input
                  type="text"
                  required
                  value={newKycName}
                  onChange={(e) => setNewKycName(e.target.value)}
                  placeholder="e.g. Apex Alpha Capital Ltd"
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded text-white focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Ethereum Wallet Address</label>
                <input
                  type="text"
                  required
                  value={newKycWallet}
                  onChange={(e) => setNewKycWallet(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Entity Type</label>
                  <select
                    value={newKycType}
                    onChange={(e) => setNewKycType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="INSTITUTION">Institution</option>
                    <option value="INDIVIDUAL">Individual</option>
                    <option value="FAMILY_OFFICE">Family Office</option>
                    <option value="SOVEREIGN_FUND">Sovereign Fund</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Target Tier</label>
                  <select
                    value={newKycTier}
                    onChange={(e) => setNewKycTier(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="TIER_1_RETAIL">Tier 1 Retail ($50K)</option>
                    <option value="TIER_2_INSTITUTIONAL">Tier 2 Institutional ($5M)</option>
                    <option value="TIER_3_SOVEREIGN">Tier 3 Sovereign ($50M)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Jurisdiction</label>
                <input
                  type="text"
                  required
                  value={newKycJurisdiction}
                  onChange={(e) => setNewKycJurisdiction(e.target.value)}
                  placeholder="e.g. United States, Switzerland, Singapore"
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewKycModalOpen(false)}
                  className="px-3 py-2 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
                >
                  Submit Applicant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
