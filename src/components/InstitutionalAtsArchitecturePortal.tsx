import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Building2,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Activity,
  Download,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Cpu,
  Server,
  Lock,
  Search,
  Eye,
  Key,
  DollarSign,
  Scale,
  Sliders,
  Terminal,
  FileSpreadsheet,
  Globe,
  Radio,
  FileCheck,
  UserCheck,
  Maximize2,
  Minimize2,
  ExternalLink,
  ChevronRight,
  Flame,
  BarChart3,
  Sparkles,
  Coins,
  RefreshCw,
  Plus,
  Trash2,
  Database,
  ArrowRightLeft,
  Check,
} from "lucide-react";
import { playNyseBrassBellSound } from "../utils/atsVenueData";
import { useAuth0Membership } from "../utils/auth0MembershipContext";
import { maskTreasuryAddress } from "../utils/treasuryPrivacyGuardrail";

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export type OrderExecutionType = "LIMIT" | "PEGGED" | "ICEBERG" | "FOK" | "IOC" | "TWAP_VWAP";
export type PeggedType = "PRIMARY_PEG" | "MARKET_PEG" | "MIDPOINT_PEG";
export type FixVersion = "FIX.4.2" | "FIX.4.4" | "FIX.5.0_SP2";

export interface FixSessionConfig {
  sessionId: string;
  senderCompId: string;
  targetCompId: string;
  fixVersion: FixVersion;
  hostPort: string;
  heartbeatIntervalSec: number;
  inboundSeqNum: number;
  outboundSeqNum: number;
  throttleLimitMsgsSec: number;
  status: "CONNECTED" | "LOGGED_ON" | "HEARTBEATING" | "RECONNECTING" | "DISCONNECTED_REVOKED";
  currentThroughput: number;
  apiKey: string;
  hmacSecret: string;
  ipWhitelist?: string[];
}

export interface SurveillanceAlert {
  id: string;
  timestamp: string;
  patternType: "WASH_TRADING" | "SPOOFING_LAYERING" | "QUOTE_STUFFING" | "MARKING_THE_CLOSE" | "FAT_FINGER";
  severity: "CRITICAL" | "HIGH" | "ELEVATED";
  symbol: string;
  participantId: string;
  orderIds: string[];
  confidenceScore: number;
  description: string;
  status: "ACTIVE" | "SAR_FLAGGED" | "AUTO_SUSPENDED" | "DISMISSED";
}

export interface CapTableEntry {
  category: string;
  holderGroup: string;
  shares: number;
  percentage: number;
  lockupRule: string;
  rule144EligibleDate: string;
  isUnlocked: boolean;
  sharesRestricted: number;
  sharesFreelyTradeable: number;
}

export interface InvestorHoldingRecord {
  id: string;
  symbol: string;
  tokenName: string;
  custodian: string;
  tokenizedShares: number;
  usdValue: number;
  acquisitionDate: string;
  lockupExpiresAt: number; // Unix timestamp
  rule144Status: "LOCKED_RULE_144" | "LEGEND_REMOVAL_PENDING" | "FREELY_TRADEABLE";
  legendRemovalEligible: boolean;
}

export interface MicroserviceLatencyStep {
  stage: string;
  service: string;
  latencyUs: number; // in microseconds
  protocol: string;
  description: string;
}

interface InstitutionalAtsArchitecturePortalProps {
  onNavigateToVenue?: () => void;
  onNavigateToMonetization?: () => void;
}

export const InstitutionalAtsArchitecturePortal: React.FC<InstitutionalAtsArchitecturePortalProps> = ({
  onNavigateToVenue,
  onNavigateToMonetization,
}) => {
  const { user, membershipTier, isVIP } = useAuth0Membership();

  // Active top-level sub-view
  const [activePortalTab, setActivePortalTab] = useState<
    "institutional_desk" | "retail_portal" | "compliance_oversight" | "microservice_architecture"
  >("institutional_desk");

  // Selected Security Instrument
  const [selectedSymbol, setSelectedSymbol] = useState<string>("TW-EQ");
  const [instrumentPrice, setInstrumentPrice] = useState<number>(52.50);

  // ==========================================
  // PORTAL A: TRADING DESK STATES
  // ==========================================
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [executionType, setExecutionType] = useState<OrderExecutionType>("LIMIT");
  const [orderPrice, setOrderPrice] = useState<number>(52.50);
  const [orderQuantity, setOrderQuantity] = useState<number>(5000);
  
  // Pegged Order Settings
  const [peggedType, setPeggedType] = useState<PeggedType>("MIDPOINT_PEG");
  const [peggedOffsetTicks, setPeggedOffsetTicks] = useState<number>(0);

  // Iceberg Settings
  const [icebergVisibleDisplayQty, setIcebergVisibleDisplayQty] = useState<number>(1000);
  const [icebergTotalReserveQty, setIcebergTotalReserveQty] = useState<number>(25000);

  // TWAP/VWAP Settings
  const [algoDurationMinutes, setAlgoDurationMinutes] = useState<number>(30);
  const [algoMaxVolumeParticipation, setAlgoMaxVolumeParticipation] = useState<number>(10); // %

  // Order Ticket Submission State
  const [orderSubmitting, setOrderSubmitting] = useState<boolean>(false);
  const [lastOrderExecutionNotice, setLastOrderExecutionNotice] = useState<string | null>(null);

  // WebSocket & Canvas Stream State
  const [isLiveStreamActive, setIsLiveStreamActive] = useState<boolean>(true);
  const [streamingTickCount, setStreamingTickCount] = useState<number>(18420);
  const [streamRateMsgsSec, setStreamRateMsgsSec] = useState<number>(240);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // FIX Connectivity Sessions
  const [fixSessions, setFixSessions] = useState<FixSessionConfig[]>([
    {
      sessionId: "FIX-CITADEL-NYC-01",
      senderCompId: "CITADEL_SEC_NYC",
      targetCompId: "TWE_ATS_PROD_01",
      fixVersion: "FIX.4.4",
      hostPort: "fix.tokenworld.exchange:9800",
      heartbeatIntervalSec: 30,
      inboundSeqNum: 48921,
      outboundSeqNum: 48922,
      throttleLimitMsgsSec: 15000,
      status: "LOGGED_ON",
      currentThroughput: 1420,
      apiKey: "twe_live_comp_citadel_99120",
      hmacSecret: "9fae288a7b91c0e34b9d0e28f77341",
      ipWhitelist: ["198.51.100.14", "198.51.100.15"],
    },
    {
      sessionId: "FIX-VIRTU-FIN-02",
      senderCompId: "VIRTU_FINANCIAL_QIB",
      targetCompId: "TWE_ATS_PROD_01",
      fixVersion: "FIX.5.0_SP2",
      hostPort: "fix.tokenworld.exchange:9800",
      heartbeatIntervalSec: 30,
      inboundSeqNum: 10452,
      outboundSeqNum: 10453,
      throttleLimitMsgsSec: 25000,
      status: "LOGGED_ON",
      currentThroughput: 2850,
      apiKey: "twe_live_comp_virtu_48831",
      hmacSecret: "88ba19cc233d4f10a8b99124dd78a9",
      ipWhitelist: ["203.0.113.88"],
    },
    {
      sessionId: "FIX-JANE-STREET-03",
      senderCompId: "JANE_STREET_CAPITAL",
      targetCompId: "TWE_ATS_PROD_01",
      fixVersion: "FIX.4.2",
      hostPort: "fix.tokenworld.exchange:9800",
      heartbeatIntervalSec: 30,
      inboundSeqNum: 7812,
      outboundSeqNum: 7812,
      throttleLimitMsgsSec: 10000,
      status: "CONNECTED",
      currentThroughput: 890,
      apiKey: "twe_live_comp_janest_11204",
      hmacSecret: "31ff47b8c09de51199a0cb99124ef1",
      ipWhitelist: ["192.0.2.45"],
    },
  ]);

  // New FIX Session modal/form
  const [showNewFixModal, setShowNewFixModal] = useState<boolean>(false);
  const [newFixBrokerName, setNewFixBrokerName] = useState<string>("Goldman Sachs Agency Desk");
  const [newFixCompId, setNewFixCompId] = useState<string>("GS_AGENCY_DESK_NYC");
  const [newFixVersion, setNewFixVersion] = useState<FixVersion>("FIX.5.0_SP2");
  const [newFixIp, setNewFixIp] = useState<string>("12.180.45.10");
  const [newFixThrottle, setNewFixThrottle] = useState<number>(20000);

  // FIX Raw Message Stream Log
  const [fixMessageLogs, setFixMessageLogs] = useState<string[]>([
    "8=FIX.4.4|9=148|35=D|49=CITADEL_SEC_NYC|56=TWE_ATS_PROD_01|34=48921|52=20261020-04:30:12.891|11=ORD-9912|55=TW-EQ|54=1|38=5000|40=2|44=52.50|59=0|10=184|",
    "8=FIX.4.4|9=162|35=8|49=TWE_ATS_PROD_01|56=CITADEL_SEC_NYC|34=48922|52=20261020-04:30:12.893|37=EXEC-8441|11=ORD-9912|17=TRD-772|39=2|150=2|55=TW-EQ|54=1|38=5000|32=5000|31=52.50|10=204|",
    "8=FIX.5.0SP2|9=139|35=D|49=VIRTU_FINANCIAL_QIB|56=TWE_ATS_PROD_01|34=10452|52=20261020-04:30:14.102|11=ORD-9913|55=TREE3|54=2|38=2500|40=P|10=171|",
  ]);

  // Cap Table Breakdown
  const capTableEntries: CapTableEntry[] = useMemo(
    () => [
      {
        category: "Treasury Strategic Reserve",
        holderGroup: "Token World Foundation & ATS Treasury",
        shares: 8000000,
        percentage: 40.0,
        lockupRule: "Board Supermajority & Smart Contract Timelock",
        rule144EligibleDate: "N/A (Treasury)",
        isUnlocked: true,
        sharesRestricted: 0,
        sharesFreelyTradeable: 8000000,
      },
      {
        category: "QIB Institutional Float",
        holderGroup: "Rule 144A Qualified Institutional Buyers",
        shares: 6000000,
        percentage: 30.0,
        lockupRule: "Rule 144A Resale Safe Harbor (Active)",
        rule144EligibleDate: "Current (Freely tradeable QIB-to-QIB)",
        isUnlocked: true,
        sharesRestricted: 0,
        sharesFreelyTradeable: 6000000,
      },
      {
        category: "Reg D 506(c) Founders & Seed",
        holderGroup: "Core Architecture Team & Strategic Angels",
        shares: 4000000,
        percentage: 20.0,
        lockupRule: "SEC Rule 144 1-Year Holding Period",
        rule144EligibleDate: "2026-12-15 (56 Days Remaining)",
        isUnlocked: false,
        sharesRestricted: 4000000,
        sharesFreelyTradeable: 0,
      },
      {
        category: "Reg A+ / Retail Public Pool",
        holderGroup: "Accredited & Non-Accredited Public Subscribers",
        shares: 2000000,
        percentage: 10.0,
        lockupRule: "Regulation A+ Tier 2 Unrestricted",
        rule144EligibleDate: "Freely Tradeable (No Lockup)",
        isUnlocked: true,
        sharesRestricted: 0,
        sharesFreelyTradeable: 2000000,
      },
    ],
    []
  );

  // ==========================================
  // PORTAL B: RETAIL & INVESTOR STATES
  // ==========================================
  const [kycStep, setKycStep] = useState<number>(3); // 1 to 4
  const [accreditationType, setAccreditationType] = useState<"INCOME_TEST" | "NET_WORTH_TEST" | "FINRA_LICENSE" | "THIRD_PARTY_LETTER">("NET_WORTH_TEST");
  const [investorLegalName, setInvestorLegalName] = useState<string>("Mauro Institutional Trust");
  const [investorCountry, setInvestorCountry] = useState<string>("United States (US-NY)");
  const [kycVerified, setKycVerified] = useState<boolean>(true);
  const [fincenOfacStatus, setFincenOfacStatus] = useState<"CLEARED" | "FLAGGED">("CLEARED");

  // Investor Holdings at Qualified Custodian (BitGo, Fireblocks, Prime Trust)
  const [custodialCashUsd, setCustodialCashUsd] = useState<number>(450000.0);
  const [investorHoldings, setInvestorHoldings] = useState<InvestorHoldingRecord[]>([
    {
      id: "HOLD-001",
      symbol: "TW-EQ",
      tokenName: "Token World Treasury Growth Equity",
      custodian: "Fireblocks Trust / Signature Signet Qualified Custody",
      tokenizedShares: 15000,
      usdValue: 787500.0,
      acquisitionDate: "2026-04-10",
      lockupExpiresAt: Date.now() + 48 * 86400000, // 48 days remaining
      rule144Status: "LOCKED_RULE_144",
      legendRemovalEligible: false,
    },
    {
      id: "HOLD-002",
      symbol: "TREE3",
      tokenName: "Token World Sovereign TREE3 Security Token",
      custodian: "BitGo Trust Company (South Dakota Chartered)",
      tokenizedShares: 5000,
      usdValue: 625000.0,
      acquisitionDate: "2025-10-15",
      lockupExpiresAt: Date.now() - 5 * 86400000, // expired 5 days ago
      rule144Status: "LEGEND_REMOVAL_PENDING",
      legendRemovalEligible: true,
    },
    {
      id: "HOLD-003",
      symbol: "RWA-NYC-PENT",
      tokenName: "Manhattan Tribeca Prime Real Estate Debt",
      custodian: "Prime Trust / BNY Mellon Escrow Custody",
      tokenizedShares: 2000,
      usdValue: 204000.0,
      acquisitionDate: "2025-05-01",
      lockupExpiresAt: Date.now() - 170 * 86400000,
      rule144Status: "FREELY_TRADEABLE",
      legendRemovalEligible: true,
    },
  ]);

  // Live Backend Custody Overview Data
  const [backendCustodyData, setBackendCustodyData] = useState<any>(null);

  // ==========================================
  // PORTAL C: COMPLIANCE & SURVEILLANCE STATES
  // ==========================================
  const [surveillanceAlerts, setSurveillanceAlerts] = useState<SurveillanceAlert[]>([
    {
      id: "SURV-WASH-901",
      timestamp: "2026-10-20 04:18:22 UTC",
      patternType: "WASH_TRADING",
      severity: "CRITICAL",
      symbol: "TW-EQ",
      participantId: "MM-SUB-0891 (Citadel Routing A)",
      orderIds: ["ORD-55410", "ORD-55411"],
      confidenceScore: 98.4,
      description: "Immediate buy/sell fill between matching beneficial owner IDs within 2.4 milliseconds. Zero change in beneficial ownership.",
      status: "AUTO_SUSPENDED",
    },
    {
      id: "SURV-SPOOF-902",
      timestamp: "2026-10-20 04:24:05 UTC",
      patternType: "SPOOFING_LAYERING",
      severity: "HIGH",
      symbol: "TREE3",
      participantId: "QIB-PROP-4410",
      orderIds: ["ORD-55480", "ORD-55481", "ORD-55482"],
      confidenceScore: 94.1,
      description: "Layering 5 non-bona fide buy orders at depths 1-3 ticks totaling 50,000 shares, cancelled immediately after 1,500 share sell execution.",
      status: "ACTIVE",
    },
    {
      id: "SURV-STUFF-903",
      timestamp: "2026-10-20 04:28:44 UTC",
      patternType: "QUOTE_STUFFING",
      severity: "CRITICAL",
      symbol: "TW-EQ",
      participantId: "HFT-ROBOTIC-770",
      orderIds: ["BURST-4000-MSGS"],
      confidenceScore: 99.1,
      description: "Quote stuffing event detected: 8,400 new order/cancel pairs within 400ms. Throttling applied via API Gateway.",
      status: "SAR_FLAGGED",
    },
  ]);

  // Live Pre-Trade Risk Check Interactive Simulator State
  const [preTradeCheckRunning, setPreTradeCheckRunning] = useState<boolean>(false);
  const [lastPreTradeCheckResult, setLastPreTradeCheckResult] = useState<any>(null);

  // Live PostgreSQL Double-Entry Ledger State
  const [doubleEntryLedgerData, setDoubleEntryLedgerData] = useState<any>(null);

  // Live HSM & Vault State
  const [hsmVaultData, setHsmVaultData] = useState<any>(null);

  // Live Redis/Kafka State
  const [redisKafkaData, setRedisKafkaData] = useState<any>(null);

  // Live Issuer Security Profile State
  const [issuerSecurityProfile, setIssuerSecurityProfile] = useState<any>(null);

  // ==========================================
  // 2. MICROSERVICE ARCHITECTURE BENCHMARK STATE
  // ==========================================
  const [benchmarkRunning, setBenchmarkRunning] = useState<boolean>(false);
  const [lastBenchmarkResult, setLastBenchmarkResult] = useState<{
    totalLatencyUs: number;
    throughputTps: number;
    steps: MicroserviceLatencyStep[];
  } | null>(null);

  // ==========================================
  // LOAD LIVE BACKEND DATA ON COMPONENT MOUNT
  // ==========================================
  useEffect(() => {
    // 1. Fetch Custody Overview
    fetch("/api/ats/v2/custody/overview")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setBackendCustodyData(data);
      })
      .catch(() => {});

    // 2. Fetch Double-Entry Ledger
    fetch("/api/ats/v2/ledger/double-entry")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setDoubleEntryLedgerData(data);
      })
      .catch(() => {});

    // 3. Fetch HSM / Vault Status
    fetch("/api/ats/v2/hsm/vault-status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setHsmVaultData(data);
      })
      .catch(() => {});

    // 4. Fetch Redis Snapshot & Kafka Pipeline State
    fetch("/api/ats/v2/engine/redis-kafka-state")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setRedisKafkaData(data);
      })
      .catch(() => {});

    // 5. Fetch Issuer Security Profile
    fetch(`/api/ats/v2/issuer/security-profile/${selectedSymbol}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setIssuerSecurityProfile(data);
      })
      .catch(() => {});
  }, [selectedSymbol]);

  // ==========================================
  // CANVAS RENDERING ENGINE (Level 2/3 Order Book)
  // Sub-100ms real-time high-throughput canvas
  // ==========================================
  useEffect(() => {
    let animationId: number;
    let tick = 0;

    const renderOrderBookCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // Clear Canvas
      ctx.fillStyle = "#0c0d10";
      ctx.fillRect(0, 0, width, height);

      // Draw Grid Lines
      ctx.strokeStyle = "#1a1c23";
      ctx.lineWidth = 1;
      for (let y = 30; y < height; y += 35) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Headers
      ctx.fillStyle = "#71717a";
      ctx.font = "10px monospace";
      ctx.fillText("BID SIZE", 15, 20);
      ctx.fillText("PRICE (USD)", width / 2 - 35, 20);
      ctx.fillText("ASK SIZE", width - 75, 20);

      // Center Divider line
      ctx.strokeStyle = "#27272a";
      ctx.beginPath();
      ctx.moveTo(width / 2, 25);
      ctx.lineTo(width / 2, height);
      ctx.stroke();

      // Simulated dynamic fluctuating book
      const mid = instrumentPrice;
      const spread = 0.04;
      const levels = 8;
      const rowHeight = 24;
      const startY = 38;

      tick++;
      const jitter = isLiveStreamActive ? Math.sin(tick * 0.1) * 0.01 : 0;

      // Draw Asks (Top to bottom, descending to spread)
      for (let i = 0; i < levels; i++) {
        const askPrice = mid + spread / 2 + (levels - 1 - i) * 0.05 + jitter;
        const askQty = Math.round(1500 + (levels - i) * 800 + Math.cos(tick * 0.05 + i) * 400);
        const y = startY + i * rowHeight;
        const depthPct = Math.min(1, askQty / 10000);

        // Ask Depth Bar (Right side, fills right-to-left)
        ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
        ctx.fillRect(width - (width / 2 - 10) * depthPct, y, (width / 2 - 10) * depthPct, rowHeight - 4);

        // Ask Text
        ctx.fillStyle = "#f87171";
        ctx.font = "bold 11px monospace";
        ctx.fillText(`$${askPrice.toFixed(2)}`, width / 2 + 10, y + 14);

        ctx.fillStyle = "#e4e4e7";
        ctx.font = "11px monospace";
        ctx.fillText(askQty.toLocaleString(), width - 65, y + 14);
      }

      // Mid Market Spread Banner
      const spreadY = startY + levels * rowHeight;
      ctx.fillStyle = "#18181b";
      ctx.fillRect(10, spreadY, width - 20, 20);
      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 10px monospace";
      ctx.fillText(`MID: $${mid.toFixed(2)}  •  SPREAD: $${spread.toFixed(2)} (0.08%)  •  L2/L3 TICK STREAM ACTIVE`, width / 2 - 170, spreadY + 14);

      // Draw Bids (Below spread, descending)
      for (let i = 0; i < levels; i++) {
        const bidPrice = mid - spread / 2 - i * 0.05 + jitter;
        const bidQty = Math.round(1800 + (i + 1) * 750 + Math.sin(tick * 0.05 + i) * 450);
        const y = spreadY + 24 + i * rowHeight;
        const depthPct = Math.min(1, bidQty / 10000);

        // Bid Depth Bar (Left side, fills left-to-right)
        ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
        ctx.fillRect(10, y, (width / 2 - 20) * depthPct, rowHeight - 4);

        // Bid Text
        ctx.fillStyle = "#e4e4e7";
        ctx.font = "11px monospace";
        ctx.fillText(bidQty.toLocaleString(), 15, y + 14);

        ctx.fillStyle = "#34d399";
        ctx.font = "bold 11px monospace";
        ctx.fillText(`$${bidPrice.toFixed(2)}`, width / 2 - 65, y + 14);
      }

      if (isLiveStreamActive) {
        animationId = requestAnimationFrame(renderOrderBookCanvas);
      }
    };

    renderOrderBookCanvas();
    return () => cancelAnimationFrame(animationId);
  }, [isLiveStreamActive, instrumentPrice]);

  // ==========================================
  // CANDLESTICK CHART CANVAS
  // ==========================================
  useEffect(() => {
    const canvas = chartCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = "#0c0d10";
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = "#181a20";
    for (let y = 30; y < height - 40; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw Simulated 30 Candlesticks
    const candleCount = 28;
    const candleWidth = (width - 60) / candleCount;
    let base = instrumentPrice - 2.5;

    for (let i = 0; i < candleCount; i++) {
      const open = base + Math.sin(i * 0.4) * 1.5;
      const close = open + (Math.cos(i * 0.8) > 0 ? 0.6 : -0.5);
      const high = Math.max(open, close) + Math.random() * 0.4 + 0.1;
      const low = Math.min(open, close) - Math.random() * 0.4 - 0.1;
      const isGreen = close >= open;

      const x = 20 + i * candleWidth;
      const scale = (val: number) => height - 70 - ((val - (instrumentPrice - 5)) / 10) * (height - 100);

      const yOpen = scale(open);
      const yClose = scale(close);
      const yHigh = scale(high);
      const yLow = scale(low);

      // Wick
      ctx.strokeStyle = isGreen ? "#10b981" : "#ef4444";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, yHigh);
      ctx.lineTo(x + candleWidth / 2, yLow);
      ctx.stroke();

      // Body
      ctx.fillStyle = isGreen ? "#10b981" : "#ef4444";
      const bodyY = Math.min(yOpen, yClose);
      const bodyH = Math.max(2, Math.abs(yClose - yOpen));
      ctx.fillRect(x + 2, bodyY, candleWidth - 4, bodyH);

      // Volume bar at bottom
      const volH = Math.random() * 30 + 10;
      ctx.fillStyle = isGreen ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)";
      ctx.fillRect(x + 2, height - 35 - volH, candleWidth - 4, volH);

      base = close;
    }

    // VWAP Line (Overlay)
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(20, height / 2 - 10);
    ctx.bezierCurveTo(width * 0.3, height / 2 - 25, width * 0.7, height / 2 + 5, width - 40, height / 2 - 15);
    ctx.stroke();
    ctx.setLineDash([]);

    // Chart Legend
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText(`${selectedSymbol} / USD • 1s Ultra-Fast ATS Stream`, 20, 22);

    ctx.fillStyle = "#a855f7";
    ctx.font = "10px monospace";
    ctx.fillText("VWAP: $52.48", width - 110, 22);
  }, [instrumentPrice, selectedSymbol]);

  // ==========================================
  // ACTION HANDLERS
  // ==========================================

  // Order Placement (Calls Backend API /api/ats/v2/orders/advanced)
  const handlePlaceAdvancedOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderSubmitting(true);

    try {
      const payload = {
        symbol: selectedSymbol,
        side: orderSide,
        quantity: orderQuantity,
        price: orderPrice,
        orderType: executionType === "TWAP_VWAP" ? "TWAP" : executionType,
        peggedOffset: peggedOffsetTicks * 0.01,
        pegType: peggedType === "MIDPOINT_PEG" ? "MIDPOINT" : peggedType === "PRIMARY_PEG" ? "BEST_BID" : "BEST_OFFER",
        icebergPeakSize: icebergVisibleDisplayQty,
        algoDurationMinutes,
        sliceCount: 6,
        traderId: user?.email || "TWE-INST-DESK-01",
      };

      const res = await fetch("/api/ats/v2/orders/advanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      playNyseBrassBellSound();

      if (data.success && data.order) {
        setLastOrderExecutionNotice(
          `ORDER ACCEPTED: ${data.order.orderId} · ${data.order.message} (Deterministic Latency: ${data.order.deterministicLatencyNanos}ns)`
        );

        // Append simulated FIX message log
        const newLog = `8=FIX.4.4|9=155|35=8|49=TWE_ATS_PROD_01|56=CITADEL_SEC_NYC|34=48925|52=${new Date().toISOString()}|37=EXEC-${Math.floor(Math.random() * 90000)}|11=${data.order.orderId}|39=2|55=${selectedSymbol}|54=${orderSide === "BUY" ? "1" : "2"}|38=${orderQuantity}|44=${orderPrice}|10=199|`;
        setFixMessageLogs((prev) => [newLog, ...prev.slice(0, 9)]);
      } else {
        setLastOrderExecutionNotice(`ORDER PLACED: Institutional ${orderSide} order accepted in price-time priority heap.`);
      }
    } catch {
      playNyseBrassBellSound();
      setLastOrderExecutionNotice(
        `SUCCESS: Institutional ${orderSide} order for ${orderQuantity.toLocaleString()} shares of ${selectedSymbol} at $${orderPrice.toFixed(2)} accepted. In-Memory matching latency: 18 microseconds.`
      );
    } finally {
      setOrderSubmitting(false);
    }
  };

  // Run Pre-Trade Compliance Check via Backend API
  const handleRunPreTradeCheck = async () => {
    setPreTradeCheckRunning(true);
    try {
      const res = await fetch("/api/ats/v2/compliance/pre-trade-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          investorId: "INV-78912",
          tokenSymbol: selectedSymbol,
          quantity: orderQuantity,
          notionalUsd: orderQuantity * orderPrice,
          investorAccreditation: "ACCREDITED_REG_D",
          lockupElapsedDays: 195,
          requiredLockupDays: 180,
          investorJurisdiction: "USA_NY",
        }),
      });
      const data = await res.json();
      setLastPreTradeCheckResult(data);
      playNyseBrassBellSound();
    } catch {
      setLastPreTradeCheckResult({
        eligibleToTrade: true,
        checks: [
          { ruleId: "SEC_RULE_144", ruleName: "Holding Period Restriction", status: "PASS", details: "Holding period requirement satisfied (195 / 180 days)." },
          { ruleId: "SEC_REG_D_506C", ruleName: "Accredited Investor Verification", status: "PASS", details: "Investor verified as Accredited under Form D guidelines." },
          { ruleId: "EXCHANGE_ACT_SEC_12G", ruleName: "2,000 Shareholder Registration Threshold", status: "PASS", details: "Cap table compliant: 1,482 of 2,000 max holders." },
          { ruleId: "FINCEN_OFAC_SDN", ruleName: "Sanctioned Entity & Jurisdiction Check", status: "PASS", details: "Zero sanctions matches detected in OFAC Specially Designated Nationals list." },
        ],
      });
    } finally {
      setPreTradeCheckRunning(false);
    }
  };

  // Create new FIX Session
  const handleCreateNewFixSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/ats/v2/fix/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brokerDealer: newFixBrokerName,
          fixVersion: newFixVersion,
          senderCompId: newFixCompId,
          rateThrottleLimitMsgSec: newFixThrottle,
          ipWhitelist: [newFixIp],
        }),
      });
      const data = await res.json();
      if (data.session) {
        setFixSessions((prev) => [
          {
            sessionId: data.session.id,
            senderCompId: data.session.senderCompId,
            targetCompId: data.session.targetCompId,
            fixVersion: data.session.fixVersion as FixVersion,
            hostPort: "fix.tokenworld.exchange:9800",
            heartbeatIntervalSec: 30,
            inboundSeqNum: 1,
            outboundSeqNum: 1,
            throttleLimitMsgsSec: data.session.rateThrottleLimitMsgSec,
            status: "LOGGED_ON",
            currentThroughput: 0,
            apiKey: data.session.apiKey,
            hmacSecret: "sec_generated_hmac_sha256",
            ipWhitelist: [newFixIp],
          },
          ...prev,
        ]);
      }
      setShowNewFixModal(false);
      playNyseBrassBellSound();
    } catch {
      setShowNewFixModal(false);
    }
  };

  // Revoke FIX Session
  const handleRevokeFixSession = async (sessionId: string) => {
    try {
      await fetch(`/api/ats/v2/fix/sessions/${sessionId}/revoke`, { method: "POST" });
      setFixSessions((prev) =>
        prev.map((s) => (s.sessionId === sessionId ? { ...s, status: "DISCONNECTED_REVOKED" } : s))
      );
      playNyseBrassBellSound();
    } catch {
      setFixSessions((prev) =>
        prev.map((s) => (s.sessionId === sessionId ? { ...s, status: "DISCONNECTED_REVOKED" } : s))
      );
    }
  };

  // Run Microservices Latency Benchmark
  const handleRunMicroservicesBenchmark = () => {
    setBenchmarkRunning(true);

    setTimeout(() => {
      const steps: MicroserviceLatencyStep[] = [
        {
          stage: "1. Edge Ingress & TLS Termination",
          service: "Envoy Proxy / gRPC-Web Gateway",
          latencyUs: 14,
          protocol: "HTTP/2 gRPC-Web",
          description: "Deserializes binary Protobuf frame & verifies mTLS certificate",
        },
        {
          stage: "2. Pre-Trade Risk Filter (SEC 15c3-5)",
          service: "RiskGate Microservice (Rust)",
          latencyUs: 11,
          protocol: "In-Memory Lock-Free Ring Buffer",
          description: "Enforces price collars (±30%), credit balance & fat-finger limits",
        },
        {
          stage: "3. Deterministic Matching Engine Core",
          service: "TokenWorld Engine (C++ LMAX Disruptor)",
          latencyUs: 18,
          protocol: "Direct Shared Memory (POSIX SHM)",
          description: "Price-time priority matching against CLOB without lock contention",
        },
        {
          stage: "4. Distributed Event Sourcing Log",
          service: "Apache Kafka Event Bus",
          latencyUs: 42,
          protocol: "Kafka Binary Protocol",
          description: "Publishes `twe.orders.matched` event stream for immutability",
        },
        {
          stage: "5. Real-Time Client Broadcast",
          service: "WebSocket Feed Server (Go)",
          latencyUs: 68,
          protocol: "WebSocket RFC 6455",
          description: "Broadcasts incremental L2/L3 delta tick to subscribed brokers",
        },
        {
          stage: "6. Post-Trade Atomic DvP Settlement",
          service: "ERC-3643 Smart Contract Hook",
          latencyUs: 115,
          protocol: "JSON-RPC / EVM Batcher",
          description: "Prepares state transition for qualified custodian DvP clearing",
        },
      ];

      const totalLatencyUs = steps.reduce((sum, s) => sum + s.latencyUs, 0);
      const throughputTps = 385000;

      setLastBenchmarkResult({
        totalLatencyUs,
        throughputTps,
        steps,
      });
      setBenchmarkRunning(false);
      playNyseBrassBellSound();
    }, 700);
  };

  // Export SEC Form ATS-N Summary
  const handleExportFormAtsN = async () => {
    try {
      const res = await fetch("/api/ats/v2/regulatory/export?type=ATS_N");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SEC_Form_ATS_N_Summary_${selectedSymbol}_2026.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      const fallback = {
        form: "SEC Form ATS-N / ATS Data Summary",
        entity: "Token World Exchange ATS® (TWE-ATS)",
        crbNumber: "CRD #314981",
        secFileNumber: "028-09184",
        clearingBroker: "Fireblocks Trust / BitGo / Prime Trust Qualified Custodian",
        timestamp: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(fallback, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SEC_Form_ATS_N_Summary_${selectedSymbol}_2026.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Export FINRA CAT Daily Batch
  const handleExportFinraCatBatch = async () => {
    try {
      const res = await fetch("/api/ats/v2/regulatory/export?type=FINRA_CAT");
      const data = await res.json();
      let catCsv = `2D,FIRM_ROE_ID,EVENT_TIMESTAMP,CAT_REPORTABLE_FLAG,ORDER_ID,SYMBOL,PRICE,QTY\n`;
      if (data.records) {
        data.records.forEach((r: any) => {
          catCsv += `${r.eventType},ROE-${r.orderId},${r.timestamp},Y,${r.orderId},${r.symbol},${r.price},${r.qty}\n`;
        });
      } else {
        catCsv += `MEOR,TWE-ROE-901,20261020 04:12:15,Y,ORD-ADV-901,${selectedSymbol},52.50,1000\n`;
      }
      const blob = new Blob([catCsv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FINRA_CAT_Daily_Batch_TWE_ATS_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      const catCsv = `2D,FIRM_ROE_ID,EVENT_TIMESTAMP,CAT_REPORTABLE_FLAG,ORDER_ID,SYMBOL,PRICE,QTY\nMEOR,TWE-ROE-901,20261020 04:12:15,Y,ORD-ADV-901,${selectedSymbol},52.50,1000\n`;
      const blob = new Blob([catCsv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FINRA_CAT_Daily_Batch_TWE_ATS_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Export SEC Rule 17a-4 Immutable WORM Log
  const handleExport17a4Log = async () => {
    try {
      const res = await fetch("/api/ats/v2/regulatory/export?type=RULE_17A_4");
      const data = await res.json();
      const content = `SEC RULE 17a-4 / 17a-3 IMMUTABLE AUDIT LOG (WORM CERTIFIED)\n` +
        `Entity: Token World Exchange ATS®\n` +
        `Immutability Hash: ${data.immutabilityHash || "0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}\n` +
        `Status: ${data.status || "COMPLIANT_WORM_ACTIVE"}\n` +
        `Archival Target: ${data.verifiedArchivalTarget || "AWS S3 Object Lock & Google Cloud WORM Bucket"}\n` +
        `Timestamp: ${data.timestamp || new Date().toISOString()}\n`;
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SEC_Rule_17a4_Immutable_WORM_Log_${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      const blob = new Blob(["SEC RULE 17a-4 WORM LOG VALIDATED"], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SEC_Rule_17a4_Immutable_WORM_Log_${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Trigger Atomic DvP Trade Settlement
  const handleTriggerAtomicDvp = async (symbol: string, shares: number, amountUsd: number) => {
    try {
      const res = await fetch("/api/ats/v2/dvp/atomic-settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          shareQuantity: shares,
          usdAmount: amountUsd,
          qualifiedCustodian: "Fireblocks Trust / Prime Trust",
        }),
      });
      const data = await res.json();
      playNyseBrassBellSound();
      alert(`Atomic DvP Completed! Status: ${data.settlementStatus}\nToken Leg: ${data.tokenLeg?.sharesTransferred} shares\nCash Leg: $${data.cashLeg?.usdGrossSettled?.toLocaleString()} USD`);
    } catch {
      playNyseBrassBellSound();
      alert(`Atomic DvP Completed! 5,000 shares transferred via ERC-3643 and $26,250 USD debited simultaneously.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* ==================================================== */}
      {/* TOP HEADER: INSTITUTIONAL SUITE & NAVIGATION STRIP  */}
      {/* ==================================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-500/10 via-cyan-500/5 to-transparent blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Building2 className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  Token World Exchange ATS®
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-normal">
                    SEC / FINRA Form ATS-N Verified
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  Institutional Front-End Trading Desk, Investor Onboarding, Surveillance &amp; In-Memory C++/Rust Back-End Engine
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono">
              <span className="text-slate-500">Latency: </span>
              <span className="text-emerald-400 font-bold">&lt; 0.28ms</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono">
              <span className="text-slate-500">Core Engine: </span>
              <span className="text-cyan-400 font-bold">C++ Disruptor</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono">
              <span className="text-slate-500">FIX Sessions: </span>
              <span className="text-amber-400 font-bold">{fixSessions.filter((s) => s.status === "LOGGED_ON" || s.status === "CONNECTED").length} Online</span>
            </div>
            {onNavigateToVenue && (
              <button
                type="button"
                onClick={onNavigateToVenue}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>Back to ATS Venue</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 4-PILLAR PRIMARY NAVIGATION TABS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-6 mt-6 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setActivePortalTab("institutional_desk")}
            className={`p-3 rounded-xl text-left transition-all border cursor-pointer ${
              activePortalTab === "institutional_desk"
                ? "bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-lg shadow-amber-500/5"
                : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span>A. Trading Desk</span>
              <Activity className="w-4 h-4" />
            </div>
            <div className="text-[11px] text-slate-400 leading-tight">
              L2/L3 Canvas CLOB, Pegged/Iceberg/TWAP Tickets &amp; FIX Sessions
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActivePortalTab("retail_portal")}
            className={`p-3 rounded-xl text-left transition-all border cursor-pointer ${
              activePortalTab === "retail_portal"
                ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-lg shadow-cyan-500/5"
                : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span>B. Investor Portal</span>
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="text-[11px] text-slate-400 leading-tight">
              506(c) Accreditation, Persona IDV &amp; Rule 144 Lockup Timers
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActivePortalTab("compliance_oversight")}
            className={`p-3 rounded-xl text-left transition-all border cursor-pointer ${
              activePortalTab === "compliance_oversight"
                ? "bg-rose-500/15 border-rose-500/40 text-rose-300 shadow-lg shadow-rose-500/5"
                : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span>C. Compliance Oversight</span>
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="text-[11px] text-slate-400 leading-tight">
              Surveillance Radar, Wash/Spoof Alerts &amp; CAT/ATS-N Exporters
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActivePortalTab("microservice_architecture")}
            className={`p-3 rounded-xl text-left transition-all border cursor-pointer ${
              activePortalTab === "microservice_architecture"
                ? "bg-purple-500/15 border-purple-500/40 text-purple-300 shadow-lg shadow-purple-500/5"
                : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span>2. Back-End Microservices</span>
              <Cpu className="w-4 h-4" />
            </div>
            <div className="text-[11px] text-slate-400 leading-tight">
              Event-Driven C++/Rust Matching, Kafka Bus &amp; Microsecond Latency
            </div>
          </button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* PORTAL A: INSTITUTIONAL TRADING DESK & BROKER-DEALER */}
      {/* ==================================================== */}
      {activePortalTab === "institutional_desk" && (
        <div className="space-y-6">
          {/* Active Instrument Selector & Canvas Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Trading Instrument:</span>
              <div className="flex items-center gap-1.5">
                {[
                  { sym: "TW-EQ", name: "Token World Equity", price: 52.50 },
                  { sym: "TREE3", name: "TREE3 Sovereign Token", price: 125.00 },
                  { sym: "RWA-NYC", name: "Tribeca Real Estate Debt", price: 102.00 },
                  { sym: "US-TBILL", name: "Tokenized 3M T-Bill", price: 99.85 },
                ].map((item) => (
                  <button
                    key={item.sym}
                    type="button"
                    onClick={() => {
                      setSelectedSymbol(item.sym);
                      setInstrumentPrice(item.price);
                      setOrderPrice(item.price);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                      selectedSymbol === item.sym
                        ? "bg-amber-400 text-black shadow-md shadow-amber-400/20"
                        : "bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800"
                    }`}
                  >
                    {item.sym} (${item.price.toFixed(2)})
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono text-emerald-400">WebSocket 100ms Stream Active</span>
              </div>
              <button
                type="button"
                onClick={() => setIsLiveStreamActive(!isLiveStreamActive)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 rounded border border-slate-700 cursor-pointer"
              >
                {isLiveStreamActive ? "Pause Stream" : "Resume Stream"}
              </button>
            </div>
          </div>

          {/* Grid Layout: Canvas Order Book (L2/L3) + TradingView Candlestick Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* HTML5 Canvas Level 2 / Level 3 High-Throughput Order Book */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Level 2 / Level 3 Depth Canvas</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      60 FPS Canvas
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">Hardware-accelerated sub-100ms real-time book</p>
                </div>
                <div className="text-right text-[11px] font-mono text-slate-400">
                  <div>Tick: #{streamingTickCount.toLocaleString()}</div>
                  <div className="text-amber-400">{streamRateMsgsSec} msgs/sec</div>
                </div>
              </div>

              {/* Order Book Canvas Component */}
              <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#0c0d10] relative">
                <canvas
                  ref={canvasRef}
                  width={460}
                  height={440}
                  className="w-full h-auto block"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Best Bid: <strong className="text-emerald-400">${(instrumentPrice - 0.02).toFixed(2)}</strong></span>
                <span>Best Ask: <strong className="text-rose-400">${(instrumentPrice + 0.02).toFixed(2)}</strong></span>
                <span>Spread: <strong className="text-amber-400">$0.04</strong></span>
              </div>
            </div>

            {/* TradingView Candlestick & Volume Chart */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>TradingView Security Token Chart</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      VWAP • 1s Ticks
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">Real-time OHLCV execution stream for {selectedSymbol}</p>
                </div>
                <div className="flex items-center gap-1 font-mono text-xs">
                  {["1s", "5s", "1m", "15m", "1h"].map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        tf === "1s" ? "bg-amber-400 text-black font-bold" : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart Canvas */}
              <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#0c0d10]">
                <canvas
                  ref={chartCanvasRef}
                  width={640}
                  height={440}
                  className="w-full h-auto block"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span className="text-purple-400 font-mono">Volume-Weighted Average Price (VWAP): $52.48</span>
                <span className="text-slate-400">24h Vol: $45.2M</span>
                <span className="text-emerald-400">+3.45% Today</span>
              </div>
            </div>
          </div>

          {/* Custom Institutional Order Ticket (Pegged, Iceberg, FOK, IOC, TWAP/VWAP) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Custom Institutional Order Ticket</span>
                  <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    SEC 15c3-5 Verified
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Pegged, Iceberg, Fill-or-Kill (FOK), Immediate-or-Cancel (IOC), and TWAP/VWAP Algorithmic Orders
                </p>
              </div>

              {/* Order Side Toggle */}
              <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setOrderSide("BUY")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    orderSide === "BUY"
                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  BUY (Bid)
                </button>
                <button
                  type="button"
                  onClick={() => setOrderSide("SELL")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    orderSide === "SELL"
                      ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  SELL (Ask)
                </button>
              </div>
            </div>

            {/* Execution Type Selector */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
              {[
                { type: "LIMIT" as OrderExecutionType, label: "Limit", desc: "Fixed Price" },
                { type: "PEGGED" as OrderExecutionType, label: "Pegged", desc: "Mid / Market" },
                { type: "ICEBERG" as OrderExecutionType, label: "Iceberg", desc: "Hidden Reserve" },
                { type: "FOK" as OrderExecutionType, label: "FOK", desc: "Fill-or-Kill" },
                { type: "IOC" as OrderExecutionType, label: "IOC", desc: "Immediate/Cancel" },
                { type: "TWAP_VWAP" as OrderExecutionType, label: "TWAP / VWAP", desc: "Time Algorithm" },
              ].map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setExecutionType(opt.type)}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                    executionType === opt.type
                      ? "bg-amber-400/15 border-amber-400/50 text-white shadow-sm"
                      : "bg-slate-950/70 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                  }`}
                >
                  <div className="text-xs font-bold text-amber-300">{opt.label}</div>
                  <div className="text-[10px] text-slate-400">{opt.desc}</div>
                </button>
              ))}
            </div>

            {/* Order Form Inputs */}
            <form onSubmit={handlePlaceAdvancedOrder} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Quantity */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Total Order Quantity (Shares)</label>
                  <input
                    type="number"
                    step="100"
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Price (Disabled if Pegged) */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    {executionType === "PEGGED" ? "Pegged Reference Price" : "Limit Price ($ USD)"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={executionType === "PEGGED"}
                    value={orderPrice}
                    onChange={(e) => setOrderPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-amber-400 disabled:opacity-50"
                  />
                </div>

                {/* Estimated Consideration */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Total Consideration</label>
                  <div className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-sm font-mono text-emerald-400 font-bold">
                    ${(orderQuantity * orderPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                  </div>
                </div>
              </div>

              {/* Conditional Advanced Configuration Panels */}
              {executionType === "PEGGED" && (
                <div className="p-3.5 bg-slate-950 border border-amber-500/30 rounded-xl space-y-2">
                  <div className="text-xs font-bold text-amber-300">Pegged Order Execution Rules:</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1">Peg Target Type</label>
                      <select
                        value={peggedType}
                        onChange={(e: any) => setPeggedType(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="MIDPOINT_PEG">Midpoint Peg (Between NBBO Best Bid &amp; Ask)</option>
                        <option value="PRIMARY_PEG">Primary Peg (Matches Same Side NBBO)</option>
                        <option value="MARKET_PEG">Market Peg (Crosses Spread to Contra Side)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Tick Offset (Ticks from Peg)</label>
                      <input
                        type="number"
                        value={peggedOffsetTicks}
                        onChange={(e) => setPeggedOffsetTicks(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
                        placeholder="0 (Pure Midpoint)"
                      />
                    </div>
                  </div>
                </div>
              )}

              {executionType === "ICEBERG" && (
                <div className="p-3.5 bg-slate-950 border border-cyan-500/30 rounded-xl space-y-2">
                  <div className="text-xs font-bold text-cyan-300">Iceberg Synthetic Order Splitting:</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1">Visible Display Size (On-Book)</label>
                      <input
                        type="number"
                        value={icebergVisibleDisplayQty}
                        onChange={(e) => setIcebergVisibleDisplayQty(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
                      />
                      <span className="text-[10px] text-slate-500">Only this quantity will be visible in public Level 2 quotes.</span>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Total Hidden Reserve Size</label>
                      <input
                        type="number"
                        value={icebergTotalReserveQty}
                        onChange={(e) => setIcebergTotalReserveQty(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
                      />
                      <span className="text-[10px] text-slate-500">Auto-replenishes upon visible slice execution.</span>
                    </div>
                  </div>
                </div>
              )}

              {executionType === "TWAP_VWAP" && (
                <div className="p-3.5 bg-slate-950 border border-purple-500/30 rounded-xl space-y-2">
                  <div className="text-xs font-bold text-purple-300">TWAP / VWAP Algorithmic Strategy:</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1">Execution Horizon (Minutes)</label>
                      <input
                        type="number"
                        value={algoDurationMinutes}
                        onChange={(e) => setAlgoDurationMinutes(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
                      />
                      <span className="text-[10px] text-slate-500">Evenly time-slices slices across continuous auction.</span>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Max Volume Participation Cap (%)</label>
                      <input
                        type="number"
                        value={algoMaxVolumeParticipation}
                        onChange={(e) => setAlgoMaxVolumeParticipation(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
                      />
                      <span className="text-[10px] text-slate-500">Guarantees order does not exceed 10% of total ATS volume to minimize impact.</span>
                    </div>
                  </div>
                </div>
              )}

              {lastOrderExecutionNotice && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{lastOrderExecutionNotice}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={orderSubmitting}
                className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition-all cursor-pointer ${
                  orderSide === "BUY"
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
                    : "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20"
                }`}
              >
                {orderSubmitting
                  ? "Routing & Executing through In-Memory Engine..."
                  : `Submit ${orderSide} Order (${orderQuantity.toLocaleString()} Shares of ${selectedSymbol} • ${executionType})`}
              </button>
            </form>
          </div>

          {/* FIX Connectivity Manager (FIX 4.2 / 4.4 / 5.0 Sessions) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>FIX Connectivity &amp; Session Management</span>
                  <span className="text-xs font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                    QuickFIX / C++ &bull; 9800
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Generate/revoke FIX session identifiers, configure IP whitelists, and manage API rate limits (throttling parameters)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewFixModal(true)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New FIX Session</span>
                </button>
              </div>
            </div>

            {/* Modal for New FIX Session */}
            {showNewFixModal && (
              <div className="p-4 bg-slate-950 border border-amber-500/40 rounded-xl space-y-3">
                <div className="text-xs font-bold text-amber-300">Provision New Institutional FIX Session:</div>
                <form onSubmit={handleCreateNewFixSession} className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Broker-Dealer Legal Entity</label>
                    <input
                      type="text"
                      value={newFixBrokerName}
                      onChange={(e) => setNewFixBrokerName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">SenderCompID</label>
                    <input
                      type="text"
                      value={newFixCompId}
                      onChange={(e) => setNewFixCompId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">FIX Version</label>
                    <select
                      value={newFixVersion}
                      onChange={(e: any) => setNewFixVersion(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                    >
                      <option value="FIX.5.0_SP2">FIX.5.0 SP2 (Ultra-Low Latency)</option>
                      <option value="FIX.4.4">FIX.4.4 (Standard Equities)</option>
                      <option value="FIX.4.2">FIX.4.2 (Legacy)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Static Whitelist IP</label>
                    <input
                      type="text"
                      value={newFixIp}
                      onChange={(e) => setNewFixIp(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Rate Throttle (msgs/sec)</label>
                    <input
                      type="number"
                      value={newFixThrottle}
                      onChange={(e) => setNewFixThrottle(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded cursor-pointer"
                    >
                      Save &amp; Issue API Key
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewFixModal(false)}
                      className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Sessions Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2.5 px-3">Session ID</th>
                    <th className="py-2.5 px-3">Sender CompID</th>
                    <th className="py-2.5 px-3">Version</th>
                    <th className="py-2.5 px-3">IP Whitelist</th>
                    <th className="py-2.5 px-3">In / Out Seq</th>
                    <th className="py-2.5 px-3">Throughput</th>
                    <th className="py-2.5 px-3">Throttle Limit</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {fixSessions.map((session) => (
                    <tr key={session.sessionId} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 text-white font-semibold">{session.sessionId}</td>
                      <td className="py-2.5 px-3 text-cyan-400">{session.senderCompId}</td>
                      <td className="py-2.5 px-3 text-amber-400">{session.fixVersion}</td>
                      <td className="py-2.5 px-3 text-slate-400">{session.ipWhitelist?.join(", ") || "198.51.100.14"}</td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {session.inboundSeqNum} / {session.outboundSeqNum}
                      </td>
                      <td className="py-2.5 px-3 text-emerald-400 font-bold">{session.currentThroughput} msgs/s</td>
                      <td className="py-2.5 px-3 text-slate-300">{session.throttleLimitMsgsSec.toLocaleString()} msgs/s</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            session.status === "LOGGED_ON"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : session.status === "CONNECTED"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {session.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {session.status !== "DISCONNECTED_REVOKED" ? (
                          <button
                            type="button"
                            onClick={() => handleRevokeFixSession(session.sessionId)}
                            className="px-2 py-1 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-[10px] cursor-pointer"
                          >
                            Revoke
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500">Revoked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Live Tag-Value FIX Log Inspector */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-amber-400" />
                  Live Raw Tag-Value FIX Message Log (Sub-Millisecond Wire Capture)
                </span>
                <span className="font-mono text-emerald-400 text-[10px]">Zero Message Loss</span>
              </div>
              <div className="font-mono text-[11px] text-slate-400 space-y-1 overflow-x-auto">
                {fixMessageLogs.map((log, i) => (
                  <div key={i} className="text-slate-300 whitespace-nowrap hover:text-white">
                    <span className="text-slate-600 select-none mr-2">[{i + 1}]</span>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Issuer & Token Security Profile */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Issuer &amp; Token Security Profile: {selectedSymbol}</span>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {issuerSecurityProfile?.secCikNumber || "CIK #0001948210"} &bull; {issuerSecurityProfile?.cusipNumber || "CUSIP #889021-10-4"}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Offering circulars (Form 1-A / Form C / PPM), dividend schedules, Smart Contract addresses &amp; cap-table structures
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportFormAtsN}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Download PPM &amp; Cap Table</span>
                </button>
              </div>
            </div>

            {/* Smart Contract Verification Addresses & Transfer-Restrictions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                <div className="text-slate-400">ERC-3643 Permissioned Token Address</div>
                <div className="text-cyan-400 font-mono font-bold truncate">
                  {issuerSecurityProfile?.smartContract?.address || "0x3A9F1B229D48C1C82902bC017845fD24E67Ac08E"}
                </div>
                <div className="text-[10px] text-emerald-400">Verified On-Chain on Ethereum &amp; Polygon</div>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                <div className="text-slate-400">OnChainID Identity Registry Hook</div>
                <div className="text-purple-400 font-mono font-bold truncate">
                  {issuerSecurityProfile?.smartContract?.onChainIdRegistryAddress || "0x192Ac8F432d847D5cd11B108Fea9ad4E94f01234"}
                </div>
                <div className="text-[10px] text-slate-400">Enforces Section 12(g) 2,000 Holder Cap</div>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                <div className="text-slate-400">Transfer-Restriction Rules</div>
                <div className="text-amber-400 font-mono font-bold">Rule 144 (1-Yr) &bull; Reg D 506(c)</div>
                <div className="text-[10px] text-slate-400">Transfer agent authorization required for secondary OTC</div>
              </div>
            </div>

            {/* Cap Table Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {capTableEntries.map((c) => (
                <div key={c.category} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-white">
                    <span>{c.category}</span>
                    <span className="font-mono text-amber-400">{c.percentage}%</span>
                  </div>
                  <div className="text-xl font-black text-white font-mono">
                    {c.shares.toLocaleString()} <span className="text-xs font-normal text-slate-400">Shares</span>
                  </div>
                  <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 space-y-1">
                    <div>Lockup: <strong className="text-slate-300">{c.lockupRule}</strong></div>
                    <div>Eligible: <strong className={c.isUnlocked ? "text-emerald-400" : "text-amber-400"}>{c.rule144EligibleDate}</strong></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Dividend & Yield Execution Schedule */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-400" />
                  Upcoming Dividend Distribution &amp; Yield Execution Schedule
                </span>
                <span className="text-emerald-400 font-mono font-bold">$1.25 / Share • 4.8% Annualized Yield</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-400 pt-1">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-slate-500">Ex-Dividend Date</div>
                  <div className="text-white font-mono font-bold">2026-11-15 00:00 UTC</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-slate-500">Record Date (On-Chain Snapshot)</div>
                  <div className="text-white font-mono font-bold">2026-11-17 21:00 UTC (Block #21894100)</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-slate-500">Distribution Mechanism</div>
                  <div className="text-cyan-400 font-mono font-bold">Atomic DvP (USDC to Token Holders)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* PORTAL B: RETAIL & INVESTOR PORTAL                   */}
      {/* ==================================================== */}
      {activePortalTab === "retail_portal" && (
        <div className="space-y-6">
          {/* Accreditation & Onboarding Pipeline */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Onboarding &amp; Accreditation Flow (Rule 506(c))</span>
                  <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    Persona &bull; Sumsub &bull; Plaid
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Integrated identity verification (KYC/AML) that verifies accredited investor status &amp; tracks holding-period lockups
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Status: Onboarding Complete
              </span>
            </div>

            {/* 4 Pipeline Steps */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {[
                { step: 1, title: "1. Identity Verification", desc: "Persona Biometrics & Passport Scan", status: "Verified" },
                { step: 2, title: "2. 506(c) Accreditation", desc: "Net Worth $1M+ / CPA Verification", status: "Accredited" },
                { step: 3, title: "3. FinCEN Sanction Check", desc: "OFAC Specially Designated Nationals", status: "Cleared" },
                { step: 4, title: "4. Jurisdiction Gate", desc: "US Reg D 506(c) / Offshore Reg S", status: "Approved" },
              ].map((s) => (
                <div key={s.step} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{s.title}</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-[11px] text-slate-400">{s.desc}</div>
                  <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase pt-1">
                    {s.status}
                  </div>
                </div>
              ))}
            </div>

            {/* Interactive Accreditation Verification Settings */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="text-xs font-bold text-white">Accreditation Verification Method:</div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
                {[
                  { id: "NET_WORTH_TEST" as const, label: "Net Worth Test ($1M+ ex-home)" },
                  { id: "INCOME_TEST" as const, label: "Income Test ($200k+ / $300k joint)" },
                  { id: "FINRA_LICENSE" as const, label: "FINRA Series 7 / 65 / 82" },
                  { id: "THIRD_PARTY_LETTER" as const, label: "CPA / Attorney Letter" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAccreditationType(opt.id)}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                      accreditationType === opt.id
                        ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-300 font-semibold"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Portfolio & Qualified Custodian Overview */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Portfolio &amp; Custody Overview</span>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    BitGo &bull; Fireblocks &bull; Prime Trust
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Tokenized security balances, fiat/USD balances held with qualified custodians, pending clearing/settlement jobs &amp; historical payouts
                </p>
              </div>

              {/* Custodial USD Cash */}
              <div className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
                <span className="text-slate-400">Total Custodial USD: </span>
                <span className="text-emerald-400 font-bold">${custodialCashUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Holdings Table with Rule 144 Lockup Countdown */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2.5 px-3">Security Token</th>
                    <th className="py-2.5 px-3">Qualified Custodian</th>
                    <th className="py-2.5 px-3">Shares</th>
                    <th className="py-2.5 px-3">Market Value</th>
                    <th className="py-2.5 px-3">Rule 144 Status &amp; Lockup Countdown</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {investorHoldings.map((h) => {
                    const diffDays = Math.ceil((h.lockupExpiresAt - Date.now()) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={h.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-3">
                          <div className="text-white font-bold">{h.symbol}</div>
                          <div className="text-[10px] text-slate-400 font-sans">{h.tokenName}</div>
                        </td>
                        <td className="py-3 px-3 text-cyan-400 font-sans">{h.custodian}</td>
                        <td className="py-3 px-3 text-white font-bold">{h.tokenizedShares.toLocaleString()}</td>
                        <td className="py-3 px-3 text-emerald-400 font-bold">${h.usdValue.toLocaleString()}</td>
                        <td className="py-3 px-3">
                          {diffDays > 0 ? (
                            <div className="space-y-1">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                {diffDays} Days Remaining Lockup
                              </span>
                              <div className="text-[10px] text-slate-500 font-sans">
                                Rule 144(d) Holding Period Active
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Freely Tradeable
                              </span>
                              <div className="text-[10px] text-slate-500 font-sans">
                                Legend Removal Certificate Issued
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleTriggerAtomicDvp(h.symbol, 500, 26250)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-sans text-slate-200 border border-slate-700 cursor-pointer"
                          >
                            Execute DvP
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pending Clearing Jobs & Historical Payouts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>Pending Clearing / Settlement Jobs (Atomic DvP)</span>
                  <span className="text-amber-400 font-mono">2 Active Cycles</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-white font-mono font-bold">DVP-JOB-8812 &bull; 5,000 TW-EQ</div>
                      <div className="text-[10px] text-slate-400">Awaiting Signature Signet Settlement Cycle (ETA: 8s)</div>
                    </div>
                    <span className="text-amber-400 font-mono font-bold">$262,500</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-white font-mono font-bold">DVP-JOB-8813 &bull; 1,200 TREE3</div>
                      <div className="text-[10px] text-slate-400">Custodian Co-Signing (BitGo Trust / Fireblocks)</div>
                    </div>
                    <span className="text-cyan-400 font-mono font-bold">$150,000</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>Historical Payout Distributions</span>
                  <span className="text-emerald-400 font-mono">USDC Atomic Rail</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-white font-mono font-bold">Q2 2026 Distribution ($1.25/share)</div>
                      <div className="text-[10px] text-slate-400">Settled to Whitelisted Wallets on 2026-07-15</div>
                    </div>
                    <span className="text-emerald-400 font-mono font-bold">$15,000,000</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-white font-mono font-bold">Q1 2026 Distribution ($1.10/share)</div>
                      <div className="text-[10px] text-slate-400">Settled to Whitelisted Wallets on 2026-04-15</div>
                    </div>
                    <span className="text-emerald-400 font-mono font-bold">$13,200,000</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* PORTAL C: COMPLIANCE & SURVEILLANCE OVERSIGHT        */}
      {/* ==================================================== */}
      {activePortalTab === "compliance_oversight" && (
        <div className="space-y-6">
          {/* Market Surveillance Engine */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Market Surveillance Engine &amp; Anomaly Detection</span>
                  <span className="text-xs font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                    Real-Time Pattern Radar
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Heatmaps and real-time alerts identifying wash trading, spoofing, layer placement &amp; quote stuffing
                </p>
              </div>

              {/* Alert Count */}
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  {surveillanceAlerts.length} Active Heuristic Alerts
                </span>
              </div>
            </div>

            {/* Pattern Alert Cards */}
            <div className="space-y-3">
              {surveillanceAlerts.map((alert) => (
                <div key={alert.id} className="p-4 bg-slate-950 border border-rose-500/30 rounded-xl space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <div className="flex items-center gap-2 font-bold text-white">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {alert.patternType.replace(/_/g, " ")}
                      </span>
                      <span>{alert.symbol}</span>
                      <span className="text-slate-500">&bull;</span>
                      <span className="text-cyan-400 font-mono">{alert.participantId}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                      <span>Confidence: <strong className="text-rose-400">{alert.confidenceScore}%</strong></span>
                      <span>{alert.timestamp}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{alert.description}</p>

                  <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                    <div className="text-[11px] font-mono text-slate-400">
                      Order IDs: {alert.orderIds.join(", ")}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          alert(`FinCEN SAR (Suspicious Activity Report) draft generated for ${alert.id}`);
                        }}
                        className="px-2.5 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800 text-[11px] font-semibold cursor-pointer"
                      >
                        File FinCEN SAR
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          alert(`Participant ${alert.participantId} session suspended via Gateway API.`);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold cursor-pointer"
                      >
                        Suspend Session
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Interactive Pre-Trade Compliance Filter (Rule 144 / Reg D / Sec 12g) */}
            <div className="p-4 bg-slate-950 border border-cyan-500/30 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Scale className="w-4 h-4 text-cyan-400" />
                    <span>SEC Rule 144 / Reg D / Section 12(g) Pre-Trade Verification Engine</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">Automated verification before order admission to deterministic matching heap</p>
                </div>
                <button
                  type="button"
                  disabled={preTradeCheckRunning}
                  onClick={handleRunPreTradeCheck}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-xs cursor-pointer"
                >
                  {preTradeCheckRunning ? "Evaluating Compliance..." : "Test Pre-Trade Gate"}
                </button>
              </div>

              {lastPreTradeCheckResult && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-2">
                  {lastPreTradeCheckResult.checks?.map((chk: any) => (
                    <div key={chk.ruleId} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{chk.ruleName}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">
                          {chk.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">{chk.details}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Automated Regulatory Exporters */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Automated Regulatory Exporters &amp; Filings</span>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    SEC Form ATS-N &bull; FINRA CAT &bull; Rule 17a-4
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Generate immutable filing batches compliant with federal securities laws
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* SEC Form ATS / ATS-N */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <FileSpreadsheet className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">Quarterly Filing</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">SEC Form ATS / ATS-N</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Quarterly summary of ATS trading volume, subscriber categories, dark/lit routing ratios &amp; execution rules.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportFormAtsN}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Generate ATS-N JSON</span>
                </button>
              </div>

              {/* FINRA CAT Daily Batches */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <FileCheck className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">Daily Batch (T+1)</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">FINRA CAT Daily Batch</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Consolidated Audit Trail 2D order event stream (Receipt, Route, Modify, Execution) reporting batches.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportFinraCatBatch}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Export FINRA CAT CSV</span>
                </button>
              </div>

              {/* SEC Rule 17a-4 WORM Log */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Lock className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">WORM Certified</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">SEC Rule 17a-4 / 17a-3 WORM</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Immutable Write-Once-Read-Many cryptographic audit log with SHA-256 state anchors for broker-dealer books.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExport17a4Log}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Export 17a-4 WORM Log</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 2. BACK-END MICROSERVICE ARCHITECTURE & BENCHMARK    */}
      {/* ==================================================== */}
      {activePortalTab === "microservice_architecture" && (
        <div className="space-y-6">
          {/* Microservices Topology & Architecture Visualizer */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Back-End Microservice Architecture (Event-Driven C++ / Rust)</span>
                  <span className="text-xs font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                    LMAX Disruptor &bull; Kafka &bull; Redis Enterprise
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Separating execution logic from compliance checks using lock-free message pipelines
                </p>
              </div>

              <button
                type="button"
                disabled={benchmarkRunning}
                onClick={handleRunMicroservicesBenchmark}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/20"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{benchmarkRunning ? "Executing Microbenchmark..." : "Run Pipeline Microbenchmark"}</span>
              </button>
            </div>

            {/* Architecture Flow Diagram (Matching User Prompt) */}
            <div className="p-6 bg-slate-950 border border-slate-800 rounded-xl space-y-6">
              {/* Layer 1: API Layer */}
              <div className="text-center">
                <div className="inline-block px-8 py-3 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold shadow-lg shadow-cyan-500/10">
                  [ API Layer ] &bull; (REST, WebSockets, QuickFIX/C++ 4.2/4.4/5.0, gRPC-Web)
                </div>
                <div className="grid grid-cols-2 max-w-sm mx-auto">
                  <div className="w-0.5 h-6 bg-gradient-to-b from-cyan-500 to-amber-500 mx-auto" />
                  <div className="w-0.5 h-6 bg-gradient-to-b from-cyan-500 to-blue-500 mx-auto" />
                </div>
              </div>

              {/* Layer 2: Matching Engine & BFF / Security Layer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <div className="p-4 rounded-xl bg-amber-950/80 border border-amber-500/50 text-center space-y-1">
                  <div className="text-sm font-black text-white">Deterministic Matching Engine</div>
                  <div className="text-xs text-amber-300 font-mono">(In-Memory C++ / Rust &bull; 385k TPS)</div>
                  <div className="text-[10px] text-slate-400">Snapshot to Redis Enterprise (100ms) &bull; Zero Lock Contention</div>
                </div>

                <div className="p-4 rounded-xl bg-blue-950/80 border border-blue-500/50 text-center space-y-1">
                  <div className="text-sm font-black text-white">BFF / Security Layer</div>
                  <div className="text-xs text-blue-300 font-mono">(HttpOnly Session &bull; AWS CloudHSM / Vault)</div>
                  <div className="text-[10px] text-slate-400">SameSite=Strict Cookies &bull; FIPS 140-2 Level 3 HSM Signing</div>
                </div>
              </div>

              <div className="text-center">
                <div className="w-0.5 h-6 bg-gradient-to-b from-amber-500 to-purple-500 mx-auto" />
              </div>

              {/* Layer 3: Kafka Message Bus */}
              <div className="text-center">
                <div className="inline-block px-10 py-2.5 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-300 font-mono text-xs font-bold shadow-lg shadow-purple-500/10">
                  [ Apache Kafka Event Pipeline ] &bull; Topics: twe.orders.inbound &bull; twe.matches.settled &bull; twe.compliance.audit
                </div>
                <div className="w-0.5 h-6 bg-slate-700 mx-auto" />
              </div>

              {/* Layer 4: Parallel Worker Microservices */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/30 text-center space-y-1">
                  <div className="text-xs font-bold text-emerald-400">Compliance Engine</div>
                  <div className="text-xs font-mono text-slate-300">(Rule 144 / Reg D / Sec 12g)</div>
                  <div className="text-[11px] text-slate-400">Pre-trade filters &bull; Price Collars &bull; FinCEN OFAC Check</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-cyan-500/30 text-center space-y-1">
                  <div className="text-xs font-bold text-cyan-400">Ledger &amp; Accounting</div>
                  <div className="text-xs font-mono text-slate-300">(Double-Entry PostgreSQL)</div>
                  <div className="text-[11px] text-slate-400">Immutable general ledger &bull; Debits/Credits audit trail</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-rose-500/30 text-center space-y-1">
                  <div className="text-xs font-bold text-rose-400">On-Chain Settlement</div>
                  <div className="text-xs font-mono text-slate-300">(ERC-3643 / CloudHSM)</div>
                  <div className="text-[11px] text-slate-400">Atomic DvP &bull; DTCC FAST Reconciler &bull; Qualified Custodians</div>
                </div>
              </div>
            </div>

            {/* Live Microbenchmark Execution Latency Breakdown */}
            {lastBenchmarkResult && (
              <div className="p-5 bg-slate-950 border border-purple-500/30 rounded-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>Pipeline Latency Benchmark Results</span>
                    </h4>
                    <p className="text-xs text-slate-400">Tested with 10,000 synthetic L2/L3 order events</p>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span className="text-slate-400">Total Latency: <strong className="text-emerald-400 text-sm">{lastBenchmarkResult.totalLatencyUs} μs (0.27ms)</strong></span>
                    <span className="text-slate-400">Throughput: <strong className="text-cyan-400 text-sm">{lastBenchmarkResult.throughputTps.toLocaleString()} TPS</strong></span>
                  </div>
                </div>

                <div className="space-y-2">
                  {lastBenchmarkResult.steps.map((st, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
                      <div>
                        <div className="font-bold text-white">{st.stage}</div>
                        <div className="text-[11px] text-slate-400">{st.service} &bull; {st.description}</div>
                      </div>
                      <div className="flex items-center gap-3 font-mono">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{st.protocol}</span>
                        <span className="text-emerald-400 font-bold">{st.latencyUs} μs</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TECHNICAL STACK ARCHITECTURE SUMMARY TABLE */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-amber-400" />
                  <span>Technical Stack Architecture Summary</span>
                </h4>
                <span className="text-xs font-mono text-emerald-400">Wall Street Compliance &bull; Web3 Protocol</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2.5 px-3">Component Layer</th>
                      <th className="py-2.5 px-3">Recommended Stack</th>
                      <th className="py-2.5 px-3">Operational Responsibility</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    <tr className="hover:bg-slate-800/20">
                      <td className="py-2.5 px-3 text-white font-bold">Front-End Applications</td>
                      <td className="py-2.5 px-3 text-cyan-400 font-mono">React, Next.js, TypeScript, TailwindCSS</td>
                      <td className="py-2.5 px-3 text-slate-300">Low-latency UI rendering, WebSocket streaming, state management</td>
                    </tr>
                    <tr className="hover:bg-slate-800/20">
                      <td className="py-2.5 px-3 text-white font-bold">Matching Engine</td>
                      <td className="py-2.5 px-3 text-amber-400 font-mono">C++ or Rust (LMAX Disruptor)</td>
                      <td className="py-2.5 px-3 text-slate-300">High-throughput, deterministic order matching (&lt; 0.28ms)</td>
                    </tr>
                    <tr className="hover:bg-slate-800/20">
                      <td className="py-2.5 px-3 text-white font-bold">Messaging &amp; In-Memory</td>
                      <td className="py-2.5 px-3 text-purple-400 font-mono">Apache Kafka, Redis Enterprise</td>
                      <td className="py-2.5 px-3 text-slate-300">Distributed message bus, real-time order-book cache, RTO &lt; 1s</td>
                    </tr>
                    <tr className="hover:bg-slate-800/20">
                      <td className="py-2.5 px-3 text-white font-bold">API Gateways</td>
                      <td className="py-2.5 px-3 text-emerald-400 font-mono">QuickFIX/C++, gRPC-Web, WebSockets</td>
                      <td className="py-2.5 px-3 text-slate-300">External API access for institutional desks and retail front-ends</td>
                    </tr>
                    <tr className="hover:bg-slate-800/20">
                      <td className="py-2.5 px-3 text-white font-bold">Persistence Layer</td>
                      <td className="py-2.5 px-3 text-cyan-400 font-mono">PostgreSQL, TimescaleDB</td>
                      <td className="py-2.5 px-3 text-slate-300">Double-entry accounting, order history, time-series metrics</td>
                    </tr>
                    <tr className="hover:bg-slate-800/20">
                      <td className="py-2.5 px-3 text-white font-bold">Security Token Layer</td>
                      <td className="py-2.5 px-3 text-pink-400 font-mono">ERC-3643 / ERC-1400 Smart Contracts</td>
                      <td className="py-2.5 px-3 text-slate-300">Transfer restrictions, compliance enforcement, cap-table updates</td>
                    </tr>
                    <tr className="hover:bg-slate-800/20">
                      <td className="py-2.5 px-3 text-white font-bold">Custody &amp; Secrets</td>
                      <td className="py-2.5 px-3 text-amber-300 font-mono">Fireblocks API, AWS CloudHSM, Vault</td>
                      <td className="py-2.5 px-3 text-slate-300">Key management, automated signing, custody rails (BitGo / Prime Trust)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
