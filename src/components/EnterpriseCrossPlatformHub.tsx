import React, { useState, useEffect } from "react";
import {
  Monitor,
  Smartphone,
  Laptop,
  Layers,
  RefreshCw,
  ShieldCheck,
  Key,
  Fingerprint,
  Cpu,
  Activity,
  Database,
  Download,
  Copy,
  Check,
  Sparkles,
  Lock,
  Globe,
  Sliders,
  Terminal,
  ArrowLeftRight,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Code2,
  Wifi,
  Zap,
  FileSpreadsheet,
  FileCode,
  Send,
  Plus,
  Trash2,
  Sun,
  Moon,
  Contrast,
  Server,
  HardDrive,
  Radio,
  Bell,
  Wallet,
} from "lucide-react";
import { UniversalPageHeaderLogo } from "./UniversalPageHeaderLogo";

export type SurfaceThemeMode = "dark" | "oled" | "light";
export type ActivePillarTab =
  | "dual_surface_live"
  | "pillar_1_design"
  | "pillar_2_sync"
  | "pillar_3_infra"
  | "pillar_4_security";

export interface SyncedOrderItem {
  id: string;
  pair: string;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  price: number;
  amount: number;
  totalUsd: number;
  originSurface: "WEB_WORKSTATION" | "MOBILE_APP" | "DESKTOP_TAURI";
  status: "OPEN" | "FILLED" | "PENDING_PUSH_AUTH";
  timestamp: string;
  iso20022MsgId: string;
}

export interface ApiKeyScope {
  id: string;
  label: string;
  prefix: string;
  ipWhitelist: string;
  scopes: ("READ_BOOK" | "TRADE_SPOT" | "DARK_POOL" | "WITHDRAW")[];
  createdAt: string;
  status: "ACTIVE" | "REVOKED";
}

const DESIGN_TOKENS_SPEC = {
  version: "4.2.0-enterprise",
  platformTargets: ["Web (React/Tailwind)", "Mobile (React Native / Jetpack Compose)", "Desktop (Rust Tauri / Electron)"],
  colorTokens: {
    "twe.surface.oled": "#000000",
    "twe.surface.dark": "#090D16",
    "twe.surface.elevated": "#111827",
    "twe.brand.emerald": "#10B981",
    "twe.brand.amber": "#F59E0B",
    "twe.brand.indigo": "#6366F1",
    "twe.semantic.bid": "#10B981",
    "twe.semantic.ask": "#EF4444",
  },
  typographyTokens: {
    "font.sans": "Inter, system-ui, -apple-system, sans-serif",
    "font.mono": "'JetBrains Mono', 'Fira Code', monospace",
    "scale.blotter": "11px / 16px (tabular-nums)",
    "scale.ticker": "14px / 20px (700 weight)",
  },
  spacingGrid: {
    "workstation.gap": "12px (0.75rem)",
    "mobile.card.padding": "16px (1.0rem)",
    "border.radius.panel": "16px (1.0rem)",
  },
};

const INITIAL_ORDERS: SyncedOrderItem[] = [
  {
    id: "ORD-99481",
    pair: "TWE / USDC",
    side: "BUY",
    type: "LIMIT",
    price: 100.0,
    amount: 250,
    totalUsd: 25000.0,
    originSurface: "WEB_WORKSTATION",
    status: "FILLED",
    timestamp: "10:14:22.408",
    iso20022MsgId: "PACS.008.TWE.20261027.99481",
  },
  {
    id: "ORD-99482",
    pair: "BTC / USDC",
    side: "SELL",
    type: "LIMIT",
    price: 64450.0,
    amount: 0.75,
    totalUsd: 48337.5,
    originSurface: "MOBILE_APP",
    status: "OPEN",
    timestamp: "10:15:09.112",
    iso20022MsgId: "PACS.008.TWE.20261027.99482",
  },
  {
    id: "ORD-99483",
    pair: "ETH / USDC",
    side: "BUY",
    type: "MARKET",
    price: 3485.5,
    amount: 10.0,
    totalUsd: 34855.0,
    originSurface: "DESKTOP_TAURI",
    status: "FILLED",
    timestamp: "10:16:45.890",
    iso20022MsgId: "PACS.008.TWE.20261027.99483",
  },
];

export const EnterpriseCrossPlatformHub: React.FC = () => {
  const [activePillar, setActivePillar] = useState<ActivePillarTab>("dual_surface_live");
  const [surfaceTheme, setSurfaceTheme] = useState<SurfaceThemeMode>("dark");
  const [activeMobileTab, setActiveMobileTab] = useState<"terminal" | "assets" | "security">("terminal");

  // Shared Multi-Device Synchronized State
  const [syncedOrders, setSyncedOrders] = useState<SyncedOrderItem[]>(INITIAL_ORDERS);
  const [syncedWatchlist, setSyncedWatchlist] = useState<string[]>(["TWE/USDC", "BTC/USDC", "ETH/USDC", "SOL/USDC", "RWA-TREASURY/USDC"]);
  const [newWatchlistInput, setNewWatchlistInput] = useState("");
  const [selectedPair, setSelectedPair] = useState<string>("TWE/USDC");
  const [liveTwePrice, setLiveTwePrice] = useState<number>(100.25);
  const [grpcSeqNumber, setGrpcSeqNumber] = useState<number>(8492014);
  const [syncLatencyMs, setSyncLatencyMs] = useState<number>(0.8);

  // Order Ticket Inputs (Shared across Web & Mobile)
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"LIMIT" | "MARKET">("LIMIT");
  const [orderPrice, setOrderPrice] = useState<string>("100.25");
  const [orderAmount, setOrderAmount] = useState<string>("50");
  const [requireBiometricPush, setRequireBiometricPush] = useState<boolean>(false);

  // Pending Mobile Push Approval State
  const [pendingPushOrder, setPendingPushOrder] = useState<SyncedOrderItem | null>(null);
  const [biometricVerifiedMsg, setBiometricVerifiedMsg] = useState<string | null>(null);

  // Security & RBAC State
  const [ipWhitelist, setIpWhitelist] = useState<string[]>(["192.0.2.14/32 (NYC Co-Lo)", "198.51.100.42/32 (LA Executive Desk)"]);
  const [newIpInput, setNewIpInput] = useState("");
  const [withdrawalThresholdUsd, setWithdrawalThresholdUsd] = useState<number>(100000);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const [apiKeys] = useState<ApiKeyScope[]>([
    {
      id: "ak-1",
      label: "Primary Desktop Tauri DMA Key",
      prefix: "twe_live_98a4f...31c",
      ipWhitelist: "192.0.2.14/32",
      scopes: ["READ_BOOK", "TRADE_SPOT", "DARK_POOL"],
      createdAt: "2026-10-01",
      status: "ACTIVE",
    },
    {
      id: "ak-2",
      label: "Mobile Jetpack Compose Session Bridge",
      prefix: "twe_mob_44e1b...90a",
      ipWhitelist: "Dynamic mTLS Enclave",
      scopes: ["READ_BOOK", "TRADE_SPOT"],
      createdAt: "2026-10-15",
      status: "ACTIVE",
    },
  ]);

  // Simulate real-time WebSocket & gRPC stream ticks
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveTwePrice((prev) => {
        const delta = (Math.random() - 0.48) * 0.15;
        return Number(Math.max(95, prev + delta).toFixed(2));
      });
      setGrpcSeqNumber((prev) => prev + Math.floor(Math.random() * 7 + 1));
      setSyncLatencyMs(Number((0.5 + Math.random() * 0.7).toFixed(2)));
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  // Place Order from either Web Workstation or Mobile Application
  const handlePlaceCrossPlatformOrder = (origin: "WEB_WORKSTATION" | "MOBILE_APP" | "DESKTOP_TAURI") => {
    const priceNum = orderType === "MARKET" ? liveTwePrice : parseFloat(orderPrice) || liveTwePrice;
    const amountNum = parseFloat(orderAmount) || 10;
    const totalUsd = Number((priceNum * amountNum).toFixed(2));
    const nowStr = new Date().toISOString().slice(11, 23);
    const ordId = `ORD-${Math.floor(10000 + Math.random() * 89999)}`;

    const newOrder: SyncedOrderItem = {
      id: ordId,
      pair: selectedPair,
      side: orderSide,
      type: orderType,
      price: priceNum,
      amount: amountNum,
      totalUsd,
      originSurface: origin,
      status: requireBiometricPush && origin === "WEB_WORKSTATION" ? "PENDING_PUSH_AUTH" : "OPEN",
      timestamp: nowStr,
      iso20022MsgId: `PACS.008.TWE.20261027.${ordId.split("-")[1]}`,
    };

    setSyncedOrders((prev) => [newOrder, ...prev]);

    if (newOrder.status === "PENDING_PUSH_AUTH") {
      setPendingPushOrder(newOrder);
      setActiveMobileTab("security");
    }
  };

  const handleApproveMobilePush = (orderId: string) => {
    setSyncedOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: "FILLED" } : o))
    );
    setPendingPushOrder(null);
    setBiometricVerifiedMsg(`Secure Enclave Biometric Signature Verified for ${orderId} — Settled Atomically (T+0)`);
    setTimeout(() => setBiometricVerifiedMsg(null), 5000);
  };

  const handleCancelOrder = (orderId: string) => {
    setSyncedOrders((prev) => prev.filter((o) => o.id !== orderId));
    if (pendingPushOrder?.id === orderId) {
      setPendingPushOrder(null);
    }
  };

  const handleAddWatchlistPair = () => {
    const cleaned = newWatchlistInput.trim().toUpperCase();
    if (cleaned && !syncedWatchlist.includes(cleaned)) {
      setSyncedWatchlist((prev) => [...prev, cleaned]);
      setNewWatchlistInput("");
    }
  };

  const handleExportIso20022Json = () => {
    const payload = {
      Document: {
        FIToFICstmrCdtTrf: {
          GrpHdr: {
            MsgId: `TWE-ISO20022-${Date.now()}`,
            CreDtTm: new Date().toISOString(),
            NbOfTxs: String(syncedOrders.length),
            SttlmInf: { SttlmMtd: "CLRG", ClrSys: { Cd: "TWE-ATS-ATOMIC-T0" } },
          },
          CdtTrfTxInf: syncedOrders.map((o) => ({
            PmtId: { InstrId: o.id, EndToEndId: o.iso20022MsgId },
            IntrBkSttlmAmt: { Ccy: "USD", Value: o.totalUsd.toFixed(2) },
            ChrgBr: "SHAR",
            RmtInf: { Ustrd: `${o.side} ${o.amount} ${o.pair} @ ${o.price} via ${o.originSurface}` },
          })),
        },
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `TWE_ATS_ISO20022_Audit_${Date.now()}.json`;
    a.click();
  };

  const handleExportCsvLedger = () => {
    const rows = [
      ["Order ID", "Pair", "Side", "Type", "Price (USD)", "Amount", "Total (USD)", "Origin Surface", "Status", "Timestamp", "ISO 20022 Message ID"],
      ...syncedOrders.map((o) => [
        o.id,
        o.pair,
        o.side,
        o.type,
        o.price.toFixed(2),
        String(o.amount),
        o.totalUsd.toFixed(2),
        o.originSurface,
        o.status,
        o.timestamp,
        o.iso20022MsgId,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `TWE_CrossPlatform_Ledger_${Date.now()}.csv`;
    a.click();
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(id);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  // Dynamic surface theme styles
  const surfaceBgClass =
    surfaceTheme === "oled"
      ? "bg-black text-slate-100 border-slate-800"
      : surfaceTheme === "light"
      ? "bg-slate-100 text-slate-900 border-slate-300"
      : "bg-[#090D16] text-slate-100 border-slate-800";

  const panelBgClass =
    surfaceTheme === "oled"
      ? "bg-[#050505] border-slate-800/90 text-slate-100"
      : surfaceTheme === "light"
      ? "bg-white border-slate-300 text-slate-900 shadow-sm"
      : "bg-slate-900/90 border-slate-800 text-slate-100";

  return (
    <div className={`min-h-screen rounded-3xl border p-4 sm:p-6 transition-colors duration-300 ${surfaceBgClass} space-y-6`}>
      <UniversalPageHeaderLogo
        moduleTitle="Enterprise Cross-Platform Architecture (Web • Desktop • Mobile)"
        moduleSubtitle="Unified Design Token System, Real-Time gRPC/WebSocket State Sync, Micro-Frontends & Hardware Enclave Security"
      />

      {/* TOP ARCHITECTURE CONTROL BAR */}
      <div className={`p-5 rounded-2xl border ${panelBgClass} flex flex-wrap items-center justify-between gap-4`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-emerald-950/50">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                4-Pillar Enterprise Parity
              </span>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 flex items-center gap-1">
                <Wifi className="w-3 h-3 animate-pulse" /> gRPC Stream #{grpcSeqNumber} ({syncLatencyMs}ms)
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-1">
              Token World Exchange® Cross-Platform Sync Engine
            </h1>
          </div>
        </div>

        {/* High-Contrast Theme Switcher (Dark / OLED / Light) */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono uppercase text-slate-400 mr-1">Surface Mode:</span>
          <button
            type="button"
            onClick={() => setSurfaceTheme("dark")}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border transition cursor-pointer ${
              surfaceTheme === "dark"
                ? "bg-emerald-600 text-white border-emerald-400 shadow"
                : "bg-slate-800/70 text-slate-300 border-slate-700 hover:text-white"
            }`}
          >
            <Moon className="w-3.5 h-3.5" /> Dark Institutional
          </button>
          <button
            type="button"
            onClick={() => setSurfaceTheme("oled")}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border transition cursor-pointer ${
              surfaceTheme === "oled"
                ? "bg-black text-emerald-400 border-emerald-500 ring-1 ring-emerald-500/50"
                : "bg-slate-900 text-slate-300 border-slate-700 hover:text-white"
            }`}
          >
            <Contrast className="w-3.5 h-3.5 text-emerald-400" /> OLED #000000
          </button>
          <button
            type="button"
            onClick={() => setSurfaceTheme("light")}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border transition cursor-pointer ${
              surfaceTheme === "light"
                ? "bg-amber-500 text-slate-950 border-amber-600 shadow"
                : "bg-slate-800/70 text-slate-300 border-slate-700 hover:text-white"
            }`}
          >
            <Sun className="w-3.5 h-3.5" /> High-Contrast Light
          </button>
        </div>
      </div>

      {/* PILLAR NAVIGATION TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          {
            id: "dual_surface_live",
            label: "⚡ Live Dual-Surface Sync (Web Workstation + Mobile App)",
            icon: ArrowLeftRight,
            badge: "Bit-for-Bit Live",
          },
          {
            id: "pillar_1_design",
            label: "1. Unified Design Tokens & Grid",
            icon: Layers,
            badge: "Style Dictionary",
          },
          {
            id: "pillar_2_sync",
            label: "2. Multi-Device State & gRPC Sync",
            icon: RefreshCw,
            badge: "0ms Drift",
          },
          {
            id: "pillar_3_infra",
            label: "3. Hybrid Web3/Web2 & Micro-Frontends",
            icon: Cpu,
            badge: "Viem • Rust FFI",
          },
          {
            id: "pillar_4_security",
            label: "4. Biometrics, HSM, RBAC & ISO 20022",
            icon: ShieldCheck,
            badge: "Secure Enclave",
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activePillar === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActivePillar(tab.id as ActivePillarTab)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap border transition-all cursor-pointer ${
                isActive
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400 shadow-lg shadow-emerald-950/40"
                  : `${panelBgClass} opacity-80 hover:opacity-100`
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/30 text-emerald-300 border border-emerald-500/30">
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* BIOMETRIC VERIFICATION BANNER */}
      {biometricVerifiedMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-emerald-400" />
            <span className="font-bold">{biometricVerifiedMsg}</span>
          </div>
          <span className="text-[10px] uppercase bg-emerald-500/30 px-2 py-0.5 rounded">Hardware Bound</span>
        </div>
      )}

      {/* =====================================================================
          TAB 0: LIVE DUAL-SURFACE WORKSTATION & MOBILE SYNCHRONIZATION
         ===================================================================== */}
      {activePillar === "dual_surface_live" && (
        <div className="space-y-6">
          {/* Cross-Session Continuity Banner */}
          <div className={`p-4 rounded-2xl border ${panelBgClass} flex flex-wrap items-center justify-between gap-4`}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold">
                  Cross-Session Continuity &amp; Simultaneous Surface Mirroring
                </h3>
                <p className="text-xs text-slate-400">
                  Place or cancel an order on the <strong>Web Workstation</strong> (left) or the <strong>Mobile Application</strong> (right) — state updates bit-for-bit across both surfaces with zero manual refresh.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCsvLedger}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                Export CSV Ledger
              </button>
              <button
                type="button"
                onClick={handleExportIso20022Json}
                className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                ISO 20022 XML/JSON
              </button>
            </div>
          </div>

          {/* SIDE-BY-SIDE: WEB WORKSTATION (LEFT 7 COLS) + MOBILE APP (RIGHT 5 COLS) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT: WEB WORKSTATION / DESKTOP TAURI APPLICATION */}
            <div className={`lg:col-span-7 rounded-2xl border p-5 space-y-5 ${panelBgClass}`}>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <Monitor className="w-5 h-5 text-emerald-400" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">Web Workstation &amp; Desktop (Tauri/Electron)</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Multi-Window Grid
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Full L2 Order Book • DOM Depth • Execution Blotter • Hardware Key Manager
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {selectedPair}: ${liveTwePrice.toFixed(2)}
                </span>
              </div>

              {/* Shared Watchlist Sync Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono uppercase text-slate-400 font-semibold">
                    Synced Profile Watchlist (Auto-Mirrors to Mobile):
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Add pair (e.g. AVAX/USDC)"
                      value={newWatchlistInput}
                      onChange={(e) => setNewWatchlistInput(e.target.value)}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-white w-36"
                    />
                    <button
                      type="button"
                      onClick={handleAddWatchlistPair}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Sync
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {syncedWatchlist.map((pair) => (
                    <button
                      key={pair}
                      type="button"
                      onClick={() => setSelectedPair(pair)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer border ${
                        selectedPair === pair
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold"
                          : "bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white"
                      }`}
                    >
                      {pair}
                    </button>
                  ))}
                </div>
              </div>

              {/* Workstation Order Entry + L2 Book Snapshot */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Order Ticket */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase text-slate-300">
                      Workstation Order Entry
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">Optimistic UI + Double-Entry</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setOrderSide("BUY")}
                      className={`py-1.5 rounded-lg text-xs font-bold font-mono cursor-pointer ${
                        orderSide === "BUY" ? "bg-emerald-600 text-white" : "bg-slate-900 text-slate-400"
                      }`}
                    >
                      BUY / BID
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderSide("SELL")}
                      className={`py-1.5 rounded-lg text-xs font-bold font-mono cursor-pointer ${
                        orderSide === "SELL" ? "bg-rose-600 text-white" : "bg-slate-900 text-slate-400"
                      }`}
                    >
                      SELL / ASK
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-1">Price (USDC)</label>
                      <input
                        type="number"
                        step="0.05"
                        value={orderPrice}
                        onChange={(e) => setOrderPrice(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-1">Quantity</label>
                      <input
                        type="number"
                        value={orderAmount}
                        onChange={(e) => setOrderAmount(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-white text-xs"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={requireBiometricPush}
                      onChange={(e) => setRequireBiometricPush(e.target.checked)}
                      className="rounded accent-emerald-500"
                    />
                    <span>Require Mobile Biometric Push Approval</span>
                  </label>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handlePlaceCrossPlatformOrder("WEB_WORKSTATION")}
                      className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold font-mono shadow cursor-pointer"
                    >
                      Submit via Web
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePlaceCrossPlatformOrder("DESKTOP_TAURI")}
                      className="px-3 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-xs font-mono font-bold cursor-pointer"
                      title="Simulate order from Desktop Tauri Rust client"
                    >
                      Desktop DMA
                    </button>
                  </div>
                </div>

                {/* Synchronized L2 Depth Snapshot */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400 font-bold">L2 DOM DEPTH ({selectedPair})</span>
                    <span className="text-[10px] text-cyan-400">gRPC Synced</span>
                  </div>
                  <div className="space-y-1">
                    {[0.45, 0.3, 0.15].map((spread, idx) => (
                      <div key={idx} className="flex justify-between text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
                        <span>{(liveTwePrice + spread).toFixed(2)}</span>
                        <span>{(140 - idx * 25).toFixed(1)}</span>
                        <span className="text-slate-400">${((liveTwePrice + spread) * (140 - idx * 25)).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="py-1 text-center font-bold text-emerald-400 border-y border-slate-800">
                    MID: ${liveTwePrice.toFixed(2)} USD
                  </div>
                  <div className="space-y-1">
                    {[0.15, 0.3, 0.45].map((spread, idx) => (
                      <div key={idx} className="flex justify-between text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        <span>{(liveTwePrice - spread).toFixed(2)}</span>
                        <span>{(165 + idx * 30).toFixed(1)}</span>
                        <span className="text-slate-400">${((liveTwePrice - spread) * (165 + idx * 30)).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Unified Cross-Platform Order Blotter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-slate-300">
                    Unified Real-Time Order Blotter ({syncedOrders.length} Active Records)
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400">
                    Mirrored across Web, Desktop &amp; Mobile
                  </span>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
                  <table className="w-full text-left font-mono text-xs">
                    <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-3">Order ID</th>
                        <th className="py-2 px-3">Pair</th>
                        <th className="py-2 px-3">Side</th>
                        <th className="py-2 px-3">Price / Qty</th>
                        <th className="py-2 px-3">Origin Surface</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {syncedOrders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-800/30">
                          <td className="py-2 px-3 font-bold text-white">{ord.id}</td>
                          <td className="py-2 px-3 text-slate-300">{ord.pair}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                ord.side === "BUY"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-rose-500/20 text-rose-300"
                              }`}
                            >
                              {ord.side}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-300">
                            ${ord.price.toFixed(2)} × {ord.amount}
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 text-[10px] border border-slate-700">
                              {ord.originSurface}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                ord.status === "FILLED"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : ord.status === "PENDING_PUSH_AUTH"
                                  ? "bg-amber-500/20 text-amber-300 animate-pulse"
                                  : "bg-blue-500/20 text-blue-300"
                              }`}
                            >
                              {ord.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleCancelOrder(ord.id)}
                              className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer"
                              title="Cancel / Remove Order across all devices"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* RIGHT: INTERACTIVE MOBILE APPLICATION VIEWPORT (REACT NATIVE / JETPACK COMPOSE) */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="w-full max-w-[390px] rounded-[36px] border-4 border-slate-700 bg-slate-950 p-4 shadow-2xl space-y-4 relative">
                {/* Mobile Notch & Status Bar */}
                <div className="flex items-center justify-between px-2 pt-1 text-[10px] font-mono text-slate-400">
                  <span>9:41 AM • 5G UW</span>
                  <div className="w-20 h-3.5 rounded-full bg-slate-900 border border-slate-800" />
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Wifi className="w-3 h-3" /> Sync
                  </span>
                </div>

                {/* Mobile App Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="text-xs font-bold text-white">TWE Mobile® (iOS / Android)</div>
                      <div className="text-[10px] text-slate-400 font-mono">Secure Enclave • Jetpack Compose</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    LIVE MIRROR
                  </span>
                </div>

                {/* Pending Biometric Push Prompt Alert inside Mobile Viewport */}
                {pendingPushOrder && (
                  <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/50 space-y-2 animate-in zoom-in-95">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase text-amber-300 flex items-center gap-1">
                        <Fingerprint className="w-3.5 h-3.5" /> Push Approval Requested
                      </span>
                      <span className="text-[10px] font-mono text-slate-300">{pendingPushOrder.id}</span>
                    </div>
                    <p className="text-xs text-white">
                      Web Workstation initiated <strong>{pendingPushOrder.side} {pendingPushOrder.amount} {pendingPushOrder.pair}</strong> (${pendingPushOrder.totalUsd.toLocaleString()}).
                    </p>
                    <button
                      type="button"
                      onClick={() => handleApproveMobilePush(pendingPushOrder.id)}
                      className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
                    >
                      <Fingerprint className="w-4 h-4" />
                      Sign with FaceID / Secure Enclave
                    </button>
                  </div>
                )}

                {/* Mobile Viewport Content Based on Selected Mobile Bottom Tab */}
                {activeMobileTab === "terminal" && (
                  <div className="space-y-3">
                    {/* Mobile Watchlist Pills */}
                    <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                      {syncedWatchlist.map((pair) => (
                        <button
                          key={pair}
                          type="button"
                          onClick={() => setSelectedPair(pair)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono whitespace-nowrap cursor-pointer ${
                            selectedPair === pair
                              ? "bg-emerald-600 text-white font-bold"
                              : "bg-slate-900 text-slate-400 border border-slate-800"
                          }`}
                        >
                          {pair}
                        </button>
                      ))}
                    </div>

                    {/* Mobile Compact Price & Quick Depth */}
                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400">{selectedPair}</span>
                        <div className="text-lg font-black font-mono text-white">${liveTwePrice.toFixed(2)}</div>
                      </div>
                      <div className="text-right font-mono text-[10px]">
                        <div className="text-rose-400">Ask: ${(liveTwePrice + 0.15).toFixed(2)}</div>
                        <div className="text-emerald-400">Bid: ${(liveTwePrice - 0.15).toFixed(2)}</div>
                      </div>
                    </div>

                    {/* Simplified Mobile Order Ticket */}
                    <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2.5">
                      <div className="text-[11px] font-bold text-slate-200 flex items-center justify-between">
                        <span>Mobile Instant Order Ticket</span>
                        <span className="text-[10px] text-emerald-400 font-mono">Syncs to Web</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setOrderSide("BUY")}
                          className={`py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                            orderSide === "BUY" ? "bg-emerald-600 text-white" : "bg-slate-950 text-slate-400"
                          }`}
                        >
                          BUY
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrderSide("SELL")}
                          className={`py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                            orderSide === "SELL" ? "bg-rose-600 text-white" : "bg-slate-950 text-slate-400"
                          }`}
                        >
                          SELL
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          value={orderPrice}
                          onChange={(e) => setOrderPrice(e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                          placeholder="Price"
                        />
                        <input
                          type="number"
                          value={orderAmount}
                          onChange={(e) => setOrderAmount(e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                          placeholder="Qty"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePlaceCrossPlatformOrder("MOBILE_APP")}
                        className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs cursor-pointer shadow-md"
                      >
                        Place Mobile Order ({orderSide} {orderAmount})
                      </button>
                    </div>

                    {/* Mobile Compact Order List */}
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {syncedOrders.slice(0, 4).map((o) => (
                        <div
                          key={o.id}
                          className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-[11px] font-mono"
                        >
                          <div>
                            <span className={o.side === "BUY" ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                              {o.side}
                            </span>{" "}
                            <span className="text-white">{o.amount} {o.pair.split("/")[0]}</span>
                            <div className="text-[9px] text-slate-400">Origin: {o.originSurface}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-white">${o.price.toFixed(2)}</div>
                            <span className="text-[9px] text-emerald-400">{o.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeMobileTab === "assets" && (
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950 to-slate-900 border border-emerald-500/30">
                      <span className="text-[10px] font-mono uppercase text-emerald-300">Consolidated Net Worth</span>
                      <div className="text-2xl font-black font-mono text-white mt-0.5">$4,820,450.00</div>
                      <div className="text-[11px] text-emerald-400 font-mono mt-1">+6.42% (24h Synced Custody)</div>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                      <div className="font-bold text-white">Fast Transfer &amp; Gas Estimator</div>
                      <div className="flex justify-between text-slate-400 font-mono text-[11px]">
                        <span>EVM L2 Priority Gas:</span>
                        <span className="text-emerald-400">0.00014 ETH ($0.48)</span>
                      </div>
                      <div className="flex justify-between text-slate-400 font-mono text-[11px]">
                        <span>Rust FFI Bridge Status:</span>
                        <span className="text-cyan-400">Connected (T+0)</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeMobileTab === "security" && (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                        <Fingerprint className="w-4 h-4" />
                        <span>iOS Secure Enclave &amp; Android Keystore</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Hardware-bound ECDSA P-256 private key active. Biometric Passkey matches WebAuthn YubiKey policy.
                      </p>
                      <div className="text-[10px] font-mono text-cyan-300 bg-slate-950 p-2 rounded-lg border border-slate-800">
                        Key ID: enclave_hw_0x70Ac...4930
                      </div>
                    </div>
                  </div>
                )}

                {/* Mobile Bottom Navigation Bar */}
                <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-800">
                  {[
                    { id: "terminal", label: "Terminal", icon: Activity },
                    { id: "assets", label: "Net Worth", icon: Wallet },
                    { id: "security", label: "Passkey Hub", icon: Fingerprint },
                  ].map((mTab) => {
                    const MIcon = mTab.icon;
                    return (
                      <button
                        key={mTab.id}
                        type="button"
                        onClick={() => setActiveMobileTab(mTab.id as any)}
                        className={`py-2 rounded-xl flex flex-col items-center gap-1 text-[10px] font-semibold cursor-pointer ${
                          activeMobileTab === mTab.id
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <MIcon className="w-4 h-4" />
                        <span>{mTab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ENTERPRISE FEATURE LAYOUT COMPARISON MATRIX */}
          <div className={`p-5 rounded-2xl border ${panelBgClass} space-y-3`}>
            <h3 className="text-base font-bold flex items-center gap-2">
              <Monitor className="w-4 h-4 text-emerald-400" />
              <span>Enterprise Feature Layout Comparison Matrix</span>
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-300 font-mono uppercase text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Layout Area</th>
                    <th className="py-3 px-4">Web Workstation / Desktop Application (Electron / Tauri)</th>
                    <th className="py-3 px-4">Mobile Application (React Native / Jetpack Compose)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  <tr>
                    <td className="py-3 px-4 font-bold text-emerald-400 font-mono">Trading Terminal</td>
                    <td className="py-3 px-4 text-slate-300">
                      Full multi-window grid: Depth chart, Level 2 order book, execution blotter, time &amp; sales stream.
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      Modular tabbed terminal: Toggleable order book visualizer, simplified order ticket, depth quick-view.
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold text-amber-400 font-mono">Asset &amp; Ledger</td>
                    <td className="py-3 px-4 text-slate-300">
                      Consolidated portfolio balance breakdown, staking yields, multi-chain custody ledger with CSV export.
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      High-level net worth card, instant token search, fast transfer/swap drawers with gas estimators.
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold text-cyan-400 font-mono">Security Hub</td>
                    <td className="py-3 px-4 text-slate-300">
                      Hardware key management (YubiKey/WebAuthn), IP whitelisting, API key permission scope manager.
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      Passkey/Biometric login (Secure Enclave / Keystore), prompt-based push approval for web-initiated transactions.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          PILLAR 1: UNIFIED VISUAL & COMPONENT ARCHITECTURE (DESIGN TOKENS)
         ===================================================================== */}
      {activePillar === "pillar_1_design" && (
        <div className={`p-6 rounded-2xl border ${panelBgClass} space-y-6`}>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold">
                Pillar 1: Centralized Design Token System (Tailwind &amp; Style Dictionary)
              </h2>
              <p className="text-xs text-slate-400">
                Single source of truth compiling tokens to Web CSS variables, React Native StyleSheet, Jetpack Compose Kotlin, and Tauri Desktop.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCopyText(JSON.stringify(DESIGN_TOKENS_SPEC, null, 2), "design_tokens")}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center gap-2 cursor-pointer"
            >
              {copiedToken === "design_tokens" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedToken === "design_tokens" ? "Copied Style Dictionary JSON" : "Copy Style Dictionary JSON"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(DESIGN_TOKENS_SPEC.colorTokens).map(([tokenName, hexValue]) => (
              <div key={tokenName} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg border border-white/20" style={{ backgroundColor: hexValue }} />
                  <div>
                    <div className="text-xs font-mono font-bold text-white">{tokenName}</div>
                    <div className="text-[10px] font-mono text-slate-400">{hexValue}</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-emerald-400 border border-slate-800">
                  Synced
                </span>
              </div>
            ))}
          </div>

          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto">
            {JSON.stringify(DESIGN_TOKENS_SPEC, null, 2)}
          </pre>
        </div>
      )}

      {/* =====================================================================
          PILLAR 2: MULTI-DEVICE STATE & CONTEXT SYNCHRONIZATION
         ===================================================================== */}
      {activePillar === "pillar_2_sync" && (
        <div className={`p-6 rounded-2xl border ${panelBgClass} space-y-5`}>
          <h2 className="text-lg font-bold">
            Pillar 2: Real-Time WebSocket &amp; gRPC State Synchronization Telemetry
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-mono">gRPC Stream Sequence</span>
              <div className="text-2xl font-black font-mono text-emerald-400">#{grpcSeqNumber}</div>
              <div className="text-[11px] text-slate-500">Protobuf v3 Binary Framing</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-mono">Cross-Surface State Drift</span>
              <div className="text-2xl font-black font-mono text-cyan-400">0.00 ms (Bit-Identical)</div>
              <div className="text-[11px] text-slate-500">CRDT + Optimistic Ledger Lock</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-mono">Active Connected Surfaces</span>
              <div className="text-2xl font-black font-mono text-amber-400">3 Endpoints</div>
              <div className="text-[11px] text-slate-500">Web • Desktop Tauri • Mobile iOS/Android</div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          PILLAR 3: ENTERPRISE INFRASTRUCTURE & MICRO-FRONTENDS
         ===================================================================== */}
      {activePillar === "pillar_3_infra" && (
        <div className={`p-6 rounded-2xl border ${panelBgClass} space-y-5`}>
          <h2 className="text-lg font-bold">
            Pillar 3: Hybrid Web3/Web2 Middleware &amp; Micro-Frontend Module Registry
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: "Staking & Yield Portal", sdk: "Viem + Wagmi v2", bundle: "42 KB gzipped", status: "MOUNTED" },
              { name: "Token Minting Foundry", sdk: "OpenZeppelin v5 + Rust FFI", bundle: "58 KB gzipped", status: "MOUNTED" },
              { name: "ATS / AMM Hybrid Swap", sdk: "gRPC + Double-Entry Engine", bundle: "64 KB gzipped", status: "MOUNTED" },
              { name: "Governance & DAO Portal", sdk: "EIP-712 Typed Signatures", bundle: "39 KB gzipped", status: "MOUNTED" },
            ].map((mod) => (
              <div key={mod.name} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                    {mod.status}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{mod.bundle}</span>
                </div>
                <div className="font-bold text-sm text-white">{mod.name}</div>
                <div className="text-xs font-mono text-cyan-400">{mod.sdk}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          PILLAR 4: INSTITUTIONAL SECURITY, RBAC & ISO 20022 COMPLIANCE
         ===================================================================== */}
      {activePillar === "pillar_4_security" && (
        <div className={`p-6 rounded-2xl border ${panelBgClass} space-y-6`}>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold">
                Pillar 4: Hardware HSM / Biometric Keys, RBAC &amp; ISO 20022 Audit Trail
              </h2>
              <p className="text-xs text-slate-400">
                Unified security rules across Web Workstation (YubiKey WebAuthn) and Mobile (Secure Enclave / Keystore) • Sole Owner: Mauro Lomibao Dar III.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportIso20022Json}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download ISO 20022 Audit Package
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* IP Whitelist & Multi-Sig Thresholds */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="text-xs font-mono font-bold uppercase text-emerald-400">
                Institutional IP Whitelist &amp; Multi-Sig Withdrawal Collar
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add CIDR (e.g. 203.0.113.5/32)"
                  value={newIpInput}
                  onChange={(e) => setNewIpInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newIpInput.trim()) {
                      setIpWhitelist((prev) => [...prev, newIpInput.trim()]);
                      setNewIpInput("");
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                >
                  Whitelist IP
                </button>
              </div>
              <div className="space-y-1.5">
                {ipWhitelist.map((ip, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex justify-between text-xs font-mono">
                    <span className="text-slate-200">{ip}</span>
                    <span className="text-emerald-400">ENFORCED</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-slate-800">
                <label className="text-xs font-mono text-slate-400 block mb-1">
                  Multi-Sig + Mobile Biometric Threshold: ${withdrawalThresholdUsd.toLocaleString()} USD
                </label>
                <input
                  type="range"
                  min="10000"
                  max="1000000"
                  step="10000"
                  value={withdrawalThresholdUsd}
                  onChange={(e) => setWithdrawalThresholdUsd(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
            </div>

            {/* Scoped API Keys */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="text-xs font-mono font-bold uppercase text-cyan-400">
                Hardware-Bound API Key Scope Manager
              </div>
              <div className="space-y-2.5">
                {apiKeys.map((k) => (
                  <div key={k.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex justify-between font-bold text-white">
                      <span>{k.label}</span>
                      <span className="text-emerald-400 font-mono text-[10px]">{k.status}</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      Key: {k.prefix} • IP: {k.ipWhitelist}
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {k.scopes.map((sc) => (
                        <span key={sc} className="px-2 py-0.5 rounded bg-slate-950 text-cyan-300 border border-slate-700 font-mono text-[10px]">
                          {sc}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
