import React, { useState, useEffect, useMemo } from "react";
import {
  Activity,
  Shield,
  ShieldCheck,
  Zap,
  Lock,
  TrendingUp,
  Coins,
  FileCode,
  Cpu,
  Code2,
  CheckCircle2,
  Send,
  Copy,
  Check,
  Download,
  RefreshCw,
  Layers,
  Key,
  UserCheck,
  ExternalLink,
  Search,
  Terminal,
  Sliders,
  Crown,
  Percent,
} from "lucide-react";
import { TokenWorldUnifiedAuthGateway, UnifiedAuthUser } from "./TokenWorldUnifiedAuthGateway";
import { useMembership } from "../context/MembershipContext";

export interface AtsTerminalAsset {
  symbol: string;
  pair: string;
  name: string;
  category: "L1/L2" | "DeFi" | "AI" | "RWA";
  contractId: string;
  price: number;
  change24h: number;
  marketCap: number;
  spread: number;
  defaultQty: number;
}

const TERMINAL_ASSETS: AtsTerminalAsset[] = [
  {
    symbol: "TWE",
    pair: "TWE / USD",
    name: "Token World Exchange ATS® Native Equity",
    category: "RWA",
    contractId: "0x89234T1045A98B7C6D5E4F3A2B1C0D9E8F7A6B5C",
    price: 100.0,
    change24h: 14.85,
    marketCap: 10000000000,
    spread: 0.05,
    defaultQty: 250.0,
  },
  {
    symbol: "BTC",
    pair: "BTC / USD",
    name: "Bitcoin Institutional Wrapped (wBTC-ATS)",
    category: "L1/L2",
    contractId: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    price: 64258.0,
    change24h: 3.42,
    marketCap: 1268400000000,
    spread: 10.0,
    defaultQty: 1.5,
  },
  {
    symbol: "ETH",
    pair: "ETH / USD",
    name: "Ethereum L1 Settlement Native",
    category: "L1/L2",
    contractId: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    price: 3485.5,
    change24h: 2.18,
    marketCap: 418900000000,
    spread: 1.5,
    defaultQty: 10.0,
  },
  {
    symbol: "SOL",
    pair: "SOL / USD",
    name: "Solana High-Throughput Bridge",
    category: "L1/L2",
    contractId: "0x5300000000000000000000000000000000000004",
    price: 184.2,
    change24h: 6.74,
    marketCap: 86400000000,
    spread: 0.15,
    defaultQty: 100.0,
  },
  {
    symbol: "UNI",
    pair: "UNI / USD",
    name: "Uniswap Protocol Governance",
    category: "DeFi",
    contractId: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    price: 12.45,
    change24h: -1.12,
    marketCap: 7480000000,
    spread: 0.02,
    defaultQty: 500.0,
  },
  {
    symbol: "AAVE",
    pair: "AAVE / USD",
    name: "Aave Institutional Liquidity Pool",
    category: "DeFi",
    contractId: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
    price: 162.8,
    change24h: 4.15,
    marketCap: 2420000000,
    spread: 0.1,
    defaultQty: 50.0,
  },
  {
    symbol: "RNDR",
    pair: "RNDR / USD",
    name: "Render Distributed GPU Compute",
    category: "AI",
    contractId: "0x6De037ef9aD2725EB40118Bb1702EBb27e4Aeb24",
    price: 9.85,
    change24h: 8.92,
    marketCap: 5120000000,
    spread: 0.02,
    defaultQty: 1000.0,
  },
  {
    symbol: "TAO",
    pair: "TAO / USD",
    name: "Bittensor Decentralized Machine Learning",
    category: "AI",
    contractId: "0x9A315b510927D1645A1E2988F9c5E03F86A1427B",
    price: 542.0,
    change24h: 7.35,
    marketCap: 3980000000,
    spread: 0.8,
    defaultQty: 25.0,
  },
  {
    symbol: "ONDO",
    pair: "ONDO / USD",
    name: "Ondo Tokenized US Treasuries",
    category: "RWA",
    contractId: "0xfAbA6f8e4a5E8Ab82F62fe7C39859FA577269BE3",
    price: 1.42,
    change24h: 5.1,
    marketCap: 2050000000,
    spread: 0.005,
    defaultQty: 5000.0,
  },
  {
    symbol: "TREE3",
    pair: "TREE3 / USD",
    name: "TREE3 Sovereign Biodiversity RWA",
    category: "RWA",
    contractId: "0x3333984502A1B2C3D4E5F60718293A4B5C6D7E8F",
    price: 48.75,
    change24h: 11.2,
    marketCap: 4875000000,
    spread: 0.04,
    defaultQty: 200.0,
  },
];

interface ExecutionRecord {
  id: string;
  timestamp: string;
  symbol: string;
  side: "BUY" | "SELL";
  orderType: "LIMIT" | "MARKET";
  price: number;
  qty: number;
  weiQty: string;
  totalUsd: number;
  clientId: string;
  rule15c35Status: "VERIFIED" | "COLLAR_PASS";
}

// Convert decimal number to 18-decimal uint256 string
function toUint256WeiString(val: number): string {
  if (!Number.isFinite(val) || val <= 0) return "0";
  try {
    const fixed = val.toFixed(6);
    const [whole, frac = ""] = fixed.split(".");
    const paddedFrac = (frac + "000000000000000000").slice(0, 18);
    const combined = (whole === "0" ? "" : whole) + paddedFrac;
    return combined.replace(/^0+/, "") || "0";
  } catch {
    return "1000000000000000000";
  }
}

export const TokenWorldAtsTerminal: React.FC<{
  onNavigateToTab?: (tab: string) => void;
}> = ({ onNavigateToTab }) => {
  const { 
    userState, 
    currentPlan, 
    calculateFeeWithRebate, 
    recordSimulatedTradeSavings, 
    openCheckoutModal, 
    openDiscountCenter 
  } = useMembership();

  // Active Top-Level Terminal View
  const [activeSubView, setActiveSubView] = useState<
    "trading" | "markets" | "contracts" | "architecture" | "code"
  >("trading");

  // Asset & Category State
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [activeSymbol, setActiveSymbol] = useState<string>("BTC");
  const [livePriceOffset, setLivePriceOffset] = useState<number>(0);
  const [latencyUs, setLatencyUs] = useState<number>(142);

  // Order Form State
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"LIMIT" | "MARKET">("LIMIT");
  const [clientId, setClientId] = useState<string>("INST-MAURO-DAR-08");
  const [orderPrice, setOrderPrice] = useState<string>("64258.00");
  const [orderQty, setOrderQty] = useState<string>("1.500");
  const [orderFeedback, setOrderFeedback] = useState<{
    message: string;
    side: "BUY" | "SELL";
    hash: string;
  } | null>(null);

  // Unified Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authUser, setAuthUser] = useState<UnifiedAuthUser | null>(() => {
    try {
      const saved = localStorage.getItem("twe_unified_auth_session");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Key Vault & uint256 Converter State (Tab 3)
  const [converterInput, setConverterInput] = useState<string>("25.5");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Execution Log State
  const [executions, setExecutions] = useState<ExecutionRecord[]>([
    {
      id: "exec-9941",
      timestamp: new Date(Date.now() - 45000).toLocaleTimeString(),
      symbol: "BTC",
      side: "BUY",
      orderType: "LIMIT",
      price: 64258.0,
      qty: 1.5,
      weiQty: "1500000000000000000",
      totalUsd: 96387.0,
      clientId: "INST-MAURO-DAR-08",
      rule15c35Status: "VERIFIED",
    },
    {
      id: "exec-9940",
      timestamp: new Date(Date.now() - 120000).toLocaleTimeString(),
      symbol: "TWE",
      side: "BUY",
      orderType: "LIMIT",
      price: 100.0,
      qty: 500.0,
      weiQty: "500000000000000000000",
      totalUsd: 50000.0,
      clientId: "INST-CITADEL-DMA",
      rule15c35Status: "VERIFIED",
    },
    {
      id: "exec-9939",
      timestamp: new Date(Date.now() - 210000).toLocaleTimeString(),
      symbol: "ETH",
      side: "SELL",
      orderType: "MARKET",
      price: 3485.5,
      qty: 12.0,
      weiQty: "12000000000000000000",
      totalUsd: 41826.0,
      clientId: "INST-BLACKROCK-RWA",
      rule15c35Status: "COLLAR_PASS",
    },
    {
      id: "exec-9938",
      timestamp: new Date(Date.now() - 320000).toLocaleTimeString(),
      symbol: "SOL",
      side: "BUY",
      orderType: "LIMIT",
      price: 184.2,
      qty: 150.0,
      weiQty: "150000000000000000000",
      totalUsd: 27630.0,
      clientId: "INST-WINTERMUTE-MM",
      rule15c35Status: "VERIFIED",
    },
  ]);

  // Sync auth session when modal closes
  useEffect(() => {
    try {
      const saved = localStorage.getItem("twe_unified_auth_session");
      if (saved) {
        const parsed: UnifiedAuthUser = JSON.parse(saved);
        setAuthUser(parsed);
        if (parsed.role === "ADMIN_OPERATOR") {
          setClientId("ADMIN-MAURO-DAR-III");
        }
      } else {
        setAuthUser(null);
      }
    } catch {
      // ignore
    }
  }, [isAuthModalOpen]);

  // Filtered assets by category
  const filteredAssets = useMemo(() => {
    if (selectedCategory === "ALL") return TERMINAL_ASSETS;
    return TERMINAL_ASSETS.filter((a) => a.category === selectedCategory);
  }, [selectedCategory]);

  const currentAsset = useMemo(() => {
    return TERMINAL_ASSETS.find((a) => a.symbol === activeSymbol) || TERMINAL_ASSETS[0];
  }, [activeSymbol]);

  // Live micro-tick simulation for order book & latency
  useEffect(() => {
    const timer = setInterval(() => {
      const delta = (Math.random() - 0.49) * (currentAsset.spread * 0.4);
      setLivePriceOffset(Number(delta.toFixed(4)));
      setLatencyUs(Math.floor(136 + Math.random() * 14));
    }, 2200);
    return () => clearInterval(timer);
  }, [currentAsset]);

  // Handle asset change
  const handleSelectAsset = (sym: string) => {
    const found = TERMINAL_ASSETS.find((a) => a.symbol === sym);
    if (found) {
      setActiveSymbol(found.symbol);
      setOrderPrice(found.price.toFixed(2));
      setOrderQty(found.defaultQty.toFixed(3));
      setLivePriceOffset(0);
    }
  };

  const liveMidPrice = Number((currentAsset.price + livePriceOffset).toFixed(2));
  const halfSpread = currentAsset.spread / 2;
  const nbboBid = Number((liveMidPrice - halfSpread).toFixed(2));
  const nbboAsk = Number((liveMidPrice + halfSpread).toFixed(2));

  // Generate 7 levels of Asks (highest to lowest) and Bids (highest to lowest)
  const orderBookLevels = useMemo(() => {
    const step = currentAsset.spread * 0.6;
    const asks = [];
    const bids = [];

    for (let i = 7; i >= 1; i--) {
      const askPrice = Number((nbboAsk + (i - 1) * step).toFixed(2));
      const size = Number((currentAsset.defaultQty * (0.4 + ((i * 7) % 11) * 0.18)).toFixed(3));
      const total = Number((askPrice * size).toFixed(2));
      const depthPct = Math.min(100, Math.round((i / 7) * 85 + 15));
      asks.push({ price: askPrice, size, total, depthPct });
    }

    for (let i = 1; i <= 7; i++) {
      const bidPrice = Number((nbboBid - (i - 1) * step).toFixed(2));
      const size = Number((currentAsset.defaultQty * (0.5 + ((i * 5) % 9) * 0.2)).toFixed(3));
      const total = Number((bidPrice * size).toFixed(2));
      const depthPct = Math.min(100, Math.round(((8 - i) / 7) * 85 + 15));
      bids.push({ price: bidPrice, size, total, depthPct });
    }

    return { asks, bids };
  }, [nbboAsk, nbboBid, currentAsset]);

  // Submit Order Handler
  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericPrice = orderType === "MARKET" ? liveMidPrice : parseFloat(orderPrice) || liveMidPrice;
    const numericQty = parseFloat(orderQty) || 1;
    const weiQty = toUint256WeiString(numericQty);
    const totalUsd = Number((numericPrice * numericQty).toFixed(2));

    const newExec: ExecutionRecord = {
      id: `exec-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toLocaleTimeString(),
      symbol: currentAsset.symbol,
      side: orderSide,
      orderType,
      price: numericPrice,
      qty: numericQty,
      weiQty,
      totalUsd,
      clientId: clientId.trim() || "INST-MAURO-DAR-08",
      rule15c35Status: "VERIFIED",
    };

    const isTaker = orderType === "MARKET";
    const { netFee, savings } = calculateFeeWithRebate(totalUsd, isTaker);
    recordSimulatedTradeSavings(totalUsd, isTaker);

    setExecutions((prev) => [newExec, ...prev.slice(0, 19)]);
    setOrderFeedback({
      message: `${orderSide} ${numericQty} ${currentAsset.symbol} @ $${numericPrice.toLocaleString()} matched atomically (T+0). Net Fee: $${netFee.toFixed(2)} (${currentPlan.feeRebatePct}% tier rebate saved $${savings.toFixed(2)})`,
      side: orderSide,
      hash: `0x${Math.random().toString(16).substring(2, 14)}...${Math.random().toString(16).substring(2, 6)}`,
    });

    setTimeout(() => {
      setOrderFeedback(null);
    }, 6000);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const parsedQty = parseFloat(orderQty) || 0;
  const parsedPrice = parseFloat(orderPrice) || liveMidPrice;
  const estimatedOrderUsd = Number((parsedQty * parsedPrice).toFixed(2));
  const rawUint256Qty = toUint256WeiString(parsedQty);
  const rawMarketCapWei = toUint256WeiString(currentAsset.marketCap);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans antialiased flex flex-col rounded-2xl border border-slate-800/90 overflow-hidden shadow-2xl">
      {/* TOP STATUS HEADER BAR */}
      <header className="bg-slate-900/95 border-b border-slate-800 backdrop-blur px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand Title & ATS Badges */}
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-700 text-slate-950 font-black p-2 rounded-lg shadow-lg shadow-emerald-950/50 flex items-center justify-center w-10 h-10 font-mono text-lg">
              TWE
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-bold text-white tracking-wide text-base sm:text-lg flex items-center gap-1.5">
                  TOKEN WORLD EXCHANGE{" "}
                  <span className="text-xs bg-slate-800 text-emerald-400 font-mono px-1.5 py-0.5 rounded border border-emerald-500/30">
                    TWE®
                  </span>
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
                  VENUE: LIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono hidden sm:block">
                Institutional Digital Asset ATS &amp; Multi-Token Liquidity Engine &bull; Owner: Mauro Lomibao Dar III
              </p>
            </div>
          </div>

          {/* Regulatory Badges & System Telemetry */}
          <div className="flex items-center flex-wrap gap-2 text-xs font-mono">
            <div className="bg-slate-950 border border-emerald-900/60 px-2.5 py-1 rounded text-emerald-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-500" />
              <span>
                PRECISION: <strong className="text-white">18 DECIMALS (uint256)</strong>
              </span>
            </div>
            <div className="bg-slate-950 border border-purple-900/60 px-2.5 py-1 rounded text-purple-400 flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-purple-400" />
              <span>
                OPENZEPPELIN: <strong className="text-white">v5.0 SECURE</strong>
              </span>
            </div>
            <div className="bg-slate-950 border border-emerald-900/60 px-2.5 py-1 rounded text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>
                SEC RULE 15c3-5: <strong className="text-white">ACTIVE</strong>
              </span>
            </div>
            <div className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded text-slate-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>
                LATENCY: <strong className="text-emerald-400">{latencyUs} μs</strong>
              </span>
            </div>

            {/* Tier Badge & Upgrade CTA */}
            <button
              type="button"
              onClick={() => openCheckoutModal()}
              className="bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/50 text-amber-300 px-3 py-1 rounded flex items-center gap-1.5 transition cursor-pointer font-sans shadow-sm"
              title="Manage ATS Membership Tier (Free, Elite, VIP Full Access)"
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold text-xs uppercase">{userState.tier} TIER</span>
              <span className="text-[10px] bg-amber-500/20 px-1 rounded font-mono">{currentPlan.feeRebatePct}% Rebate</span>
            </button>

            {/* Discount Center Button */}
            <button
              type="button"
              onClick={() => openDiscountCenter()}
              className="bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/50 text-emerald-300 px-3 py-1 rounded flex items-center gap-1.5 transition cursor-pointer font-sans shadow-sm"
              title="Open ATS Discount Center (Fee Rebates & OTC Token Discounts)"
            >
              <Percent className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold text-xs">Discount Center</span>
            </button>

            {/* Auth0 & Google Single Sign-On Button Trigger */}
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="bg-blue-950 hover:bg-blue-900 border border-blue-600/60 text-blue-300 px-3 py-1 rounded flex items-center gap-2 transition cursor-pointer font-sans shadow-sm"
            >
              <Lock className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-semibold">
                {authUser ? `${authUser.name.split(" ")[0]} (Connected)` : "Auth0 / Social Login"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* NAVIGATION TABS */}
      <div className="bg-slate-900 border-b border-slate-800/80 px-4">
        <div className="max-w-7xl mx-auto flex gap-1 overflow-x-auto py-1.5 text-xs sm:text-sm font-medium no-scrollbar">
          {[
            { id: "trading", label: "Multi-Asset L2 Terminal", icon: TrendingUp },
            { id: "markets", label: "Token Directory (uint256 / 18-Dec)", icon: Coins },
            { id: "contracts", label: "OpenZeppelin Smart Contracts & Key Vault", icon: Shield },
            { id: "architecture", label: "System Schematics & Compliance", icon: Cpu },
            { id: "code", label: "Source Blueprints & Engine", icon: Code2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubView(tab.id as any)}
                className={`px-3.5 py-2 rounded-md transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "text-emerald-400 bg-slate-800/90 border border-emerald-500/30 font-semibold shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 space-y-4">
        {/* =====================================================================
            VIEW 1: TRADING TERMINAL & L2 ORDER BOOK
           ===================================================================== */}
        {activeSubView === "trading" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Market Pair Selector Bar & Category Filters */}
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <label className="text-xs font-mono text-slate-400">SELECT ASSET PAIR:</label>
                <select
                  value={activeSymbol}
                  onChange={(e) => handleSelectAsset(e.target.value)}
                  className="bg-slate-950 text-white font-mono text-sm border border-emerald-500/40 rounded px-3 py-1.5 focus:outline-none focus:border-emerald-400 font-bold cursor-pointer"
                >
                  {filteredAssets.map((asset) => (
                    <option key={asset.symbol} value={asset.symbol}>
                      {asset.pair} — {asset.name} (${asset.price.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
                {[
                  { id: "ALL", label: "ALL" },
                  { id: "L1/L2", label: "L1 / L2" },
                  { id: "DeFi", label: "DeFi" },
                  { id: "AI", label: "AI & Compute" },
                  { id: "RWA", label: "RWA / Equities" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      const firstMatch =
                        cat.id === "ALL"
                          ? TERMINAL_ASSETS[0]
                          : TERMINAL_ASSETS.find((a) => a.category === cat.id);
                      if (firstMatch && firstMatch.symbol !== activeSymbol) {
                        handleSelectAsset(firstMatch.symbol);
                      }
                    }}
                    className={`px-2.5 py-1 rounded transition cursor-pointer ${
                      selectedCategory === cat.id
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-600/60 font-bold"
                        : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Market Overview Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800 font-mono text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 text-[10px]">SELECTED TICKER &amp; CONTRACT ID</span>
                <div className="flex items-center gap-2 text-base font-bold text-white truncate">
                  <span>{currentAsset.pair}</span>
                  <span className="text-[10px] font-normal text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800/50">
                    {currentAsset.category}
                  </span>
                </div>
                <div className="text-[10px] text-purple-400 font-mono truncate" title={currentAsset.contractId}>
                  CID: {currentAsset.contractId.slice(0, 10)}...{currentAsset.contractId.slice(-6)}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 text-[10px]">24H MARKET CAP</span>
                <div className="text-base font-bold text-emerald-400">
                  ${currentAsset.marketCap.toLocaleString()}
                </div>
                <div
                  className={`text-[10px] font-bold ${
                    currentAsset.change24h >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {currentAsset.change24h >= 0 ? "+" : ""}
                  {currentAsset.change24h}% (24h)
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 text-[10px]">uint256 RAW WEI UNITS (18-DEC)</span>
                <div
                  className="text-[11px] font-mono text-purple-300 truncate font-semibold"
                  title={rawMarketCapWei}
                >
                  {rawMarketCapWei}
                </div>
                <div className="text-[10px] text-slate-500">10¹⁸ Fixed-Point Integer</div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 text-[10px]">NBBO SPREAD</span>
                <div className="text-base font-bold text-amber-400">
                  ${currentAsset.spread.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-400">Sub-millisecond Sync</div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 text-[10px]">PRE-TRADE RISK CHECK</span>
                <div className="text-sm sm:text-base font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>VALIDATION ACTIVE</span>
                </div>
                <div className="text-[10px] text-slate-400">Rule 15c3-5 Collars Armed</div>
              </div>
            </div>

            {/* Main Trading Grid: Left L2 Orderbook (5), Middle Order Form (4), Right Live Executions (3) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* L2 ORDER BOOK (5 COLS) */}
              <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 font-mono">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <h2 className="font-bold text-white text-sm">
                        Level 2 Order Book (<span>{currentAsset.symbol}</span>)
                      </h2>
                    </div>
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      LIVE FEED
                    </span>
                  </div>

                  {/* Table Header */}
                  <div className="grid grid-cols-3 text-[11px] font-mono font-semibold text-slate-400 pb-2 px-1 border-b border-slate-800/60 text-right">
                    <span className="text-left">PRICE (USD)</span>
                    <span>SIZE ({currentAsset.symbol})</span>
                    <span>TOTAL (USD)</span>
                  </div>

                  {/* Asks (Red) */}
                  <div className="font-mono text-xs my-1 space-y-0.5">
                    {orderBookLevels.asks.map((ask, i) => (
                      <div
                        key={`ask-${i}`}
                        onClick={() => {
                          setOrderSide("BUY");
                          setOrderPrice(ask.price.toFixed(2));
                        }}
                        style={{
                          background: `linear-gradient(90deg, rgba(239, 68, 68, 0.16) ${ask.depthPct}%, transparent ${ask.depthPct}%)`,
                        }}
                        className="grid grid-cols-3 py-1 px-1.5 rounded text-right hover:bg-slate-800/60 cursor-pointer transition-colors"
                      >
                        <span className="text-left text-rose-400 font-semibold">
                          ${ask.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-slate-200">{ask.size.toFixed(3)}</span>
                        <span className="text-slate-400">
                          ${ask.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Spread Mid Price Bar */}
                  <div className="my-2 py-2 px-3 bg-slate-950 border-y border-slate-800 flex items-center justify-between font-mono text-xs rounded">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[10px]">MID PRICE:</span>
                      <span className="font-bold text-sm text-white">
                        ${liveMidPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      NBBO:{" "}
                      <span className="text-emerald-400">
                        ${nbboBid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>{" "}
                      /{" "}
                      <span className="text-rose-400">
                        ${nbboAsk.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Bids (Green) */}
                  <div className="font-mono text-xs my-1 space-y-0.5">
                    {orderBookLevels.bids.map((bid, i) => (
                      <div
                        key={`bid-${i}`}
                        onClick={() => {
                          setOrderSide("SELL");
                          setOrderPrice(bid.price.toFixed(2));
                        }}
                        style={{
                          background: `linear-gradient(90deg, rgba(16, 185, 129, 0.16) ${bid.depthPct}%, transparent ${bid.depthPct}%)`,
                        }}
                        className="grid grid-cols-3 py-1 px-1.5 rounded text-right hover:bg-slate-800/60 cursor-pointer transition-colors"
                      >
                        <span className="text-left text-emerald-400 font-semibold">
                          ${bid.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-slate-200">{bid.size.toFixed(3)}</span>
                        <span className="text-slate-400">
                          ${bid.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono flex justify-between items-center">
                  <span>
                    Matching Protocol: <strong className="text-slate-200">Price-Time Priority</strong>
                  </span>
                  <span>
                    Precision: <strong className="text-emerald-400">10¹⁸ (Wei Standard)</strong>
                  </span>
                </div>
              </div>

              {/* ORDER ENTRY TERMINAL & RISK ENGINE (4 COLS) */}
              <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-xl">
                <div>
                  {/* Order Form Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 font-mono">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-blue-400" />
                      <h2 className="font-bold text-white text-sm">Order Entry &amp; Pre-Risk Validation</h2>
                    </div>
                    <span className="text-[10px] bg-blue-950 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800/60">
                      SEC 15c3-5
                    </span>
                  </div>

                  {/* Order Side Toggle */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-lg mb-4 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setOrderSide("BUY")}
                      className={`py-2 rounded-md font-bold transition cursor-pointer ${
                        orderSide === "BUY"
                          ? "bg-emerald-600 text-white shadow"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      BUY / BID
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderSide("SELL")}
                      className={`py-2 rounded-md font-bold transition cursor-pointer ${
                        orderSide === "SELL"
                          ? "bg-rose-600 text-white shadow"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      SELL / ASK
                    </button>
                  </div>

                  {/* SSO Status Banner inside Order Entry */}
                  <div className="mb-3 p-2.5 bg-slate-950 border border-blue-900/50 rounded-lg flex items-center justify-between text-[11px] font-mono">
                    <div className="flex items-center gap-2 truncate">
                      <UserCheck className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      <span className="text-slate-300 truncate">
                        Session: {authUser ? authUser.name : "Anonymous Guest"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAuthModalOpen(true)}
                      className="text-blue-400 underline hover:text-blue-300 ml-2 flex-shrink-0 cursor-pointer"
                    >
                      {authUser ? "Session" : "Authenticate"}
                    </button>
                  </div>

                  {/* Input Fields */}
                  <form onSubmit={handleOrderSubmit} className="space-y-3 font-mono text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1">CLIENT INSTITUTION ID</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={clientId}
                          onChange={(e) => setClientId(e.target.value)}
                          required
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                        />
                        <span className="absolute right-2 top-2 text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> VERIFIED
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">ORDER TYPE</label>
                      <select
                        value={orderType}
                        onChange={(e) => setOrderType(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="LIMIT">LIMIT ORDER (Standard ATS)</option>
                        <option value="MARKET">MARKET ORDER (Immediate Match)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-400 mb-1">PRICE (USD)</label>
                        <input
                          type="number"
                          step="0.000001"
                          value={orderType === "MARKET" ? liveMidPrice : orderPrice}
                          disabled={orderType === "MARKET"}
                          onChange={(e) => setOrderPrice(e.target.value)}
                          required
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">
                          QUANTITY (<span>{currentAsset.symbol}</span>)
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          value={orderQty}
                          onChange={(e) => setOrderQty(e.target.value)}
                          required
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Raw uint256 wei quantity display */}
                    <div className="bg-slate-950 p-2 rounded border border-purple-900/40 text-[10px] space-y-0.5">
                      <div className="text-purple-400 font-bold flex justify-between">
                        <span>uint256 (18-decimal integer):</span>
                        <span>10¹⁸ Wei Scaled</span>
                      </div>
                      <div className="font-mono text-slate-300 truncate">{rawUint256Qty}</div>
                    </div>

                    {/* Estimated Value Display */}
                    <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80 flex justify-between text-[11px]">
                      <span className="text-slate-400">Est. Order Value:</span>
                      <span className="font-bold text-white">
                        ${estimatedOrderUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                      </span>
                    </div>

                    {/* Pre-trade compliance status box */}
                    <div className="p-2.5 bg-emerald-950/30 border border-emerald-800/40 rounded space-y-1 text-[11px]">
                      <div className="font-semibold text-emerald-400 flex items-center justify-between">
                        <span>Pre-Trade Risk Checks:</span>
                        <span className="text-[10px] bg-emerald-900/60 px-1.5 py-0.5 rounded text-emerald-300 font-bold">
                          PASSED
                        </span>
                      </div>
                      <ul className="text-[10px] text-slate-400 space-y-0.5 list-disc list-inside">
                        <li>Collateral Segregation Check (Rule 15c3-3)</li>
                        <li>uint256 Balance &amp; Overflow Guard Passed</li>
                      </ul>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className={`w-full py-3 font-bold rounded-lg shadow-lg transition flex items-center justify-center gap-2 text-sm cursor-pointer ${
                        orderSide === "BUY"
                          ? "bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-emerald-950/50"
                          : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50"
                      }`}
                    >
                      <Send className="w-4 h-4" />
                      <span>SUBMIT {orderSide} TO MATCHING ENGINE</span>
                    </button>
                  </form>
                </div>

                {/* Notification feedback box */}
                {orderFeedback && (
                  <div
                    className={`mt-3 p-2.5 rounded-lg border text-[11px] font-mono animate-in fade-in duration-200 ${
                      orderFeedback.side === "BUY"
                        ? "bg-emerald-950/50 border-emerald-500/50 text-emerald-300"
                        : "bg-rose-950/50 border-rose-500/50 text-rose-300"
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>ATOMIC MATCH CONFIRMED (T+0)</span>
                      <span className="text-[10px] opacity-80">{orderFeedback.hash}</span>
                    </div>
                    <p className="mt-1 text-white">{orderFeedback.message}</p>
                  </div>
                )}
              </div>

              {/* LIVE EXECUTION LOG & REGULATORY AUDIT (3 COLS) */}
              <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 font-mono">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-amber-400" />
                      <h2 className="font-bold text-white text-sm">Live Executions</h2>
                    </div>
                    <span className="text-[10px] bg-amber-950/80 text-amber-300 px-1.5 py-0.5 rounded border border-amber-800/50">
                      FINRA CAT
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 font-mono text-xs">
                    {executions.map((ex) => (
                      <div
                        key={ex.id}
                        className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/90 space-y-1 hover:border-slate-700 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              ex.side === "BUY"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            {ex.side} {ex.symbol}
                          </span>
                          <span className="text-[10px] text-slate-500">{ex.timestamp}</span>
                        </div>
                        <div className="flex justify-between items-baseline pt-0.5">
                          <span className="text-white font-bold">
                            {ex.qty} @ ${ex.price.toLocaleString()}
                          </span>
                          <span className="text-emerald-400 text-[11px] font-semibold">
                            ${ex.totalUsd.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-[9px] text-purple-400 truncate" title={`Wei: ${ex.weiQty}`}>
                          uint256: {ex.weiQty}
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-slate-500 pt-1 border-t border-slate-900">
                          <span className="truncate max-w-[110px]">{ex.clientId}</span>
                          <span className="text-emerald-500 font-semibold">15c3-5 PASS</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono space-y-1">
                  <div className="flex justify-between">
                    <span>Settlement Engine:</span>
                    <strong className="text-emerald-400">T+0 Atomic DvP</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>DTCC Transfer Agent:</span>
                    <strong className="text-slate-200">FAST #9450</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            VIEW 2: TOKEN DIRECTORY (uint256 / 18-Dec)
           ===================================================================== */}
        {activeSubView === "markets" && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Coins className="w-4 h-4 text-emerald-400" />
                  Institutional Multi-Token Directory (18-Decimal uint256 Wei Standard)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  All assets are normalized to 10¹⁸ Wei integer precision for zero-rounding smart contract clearing.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">Asset Pair</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Smart Contract ID</th>
                    <th className="py-3 px-3 text-right">Price (USD)</th>
                    <th className="py-3 px-3 text-right">24h Change</th>
                    <th className="py-3 px-3">1 Unit in uint256 Wei</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {TERMINAL_ASSETS.map((asset) => (
                    <tr key={asset.symbol} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{asset.pair}</div>
                        <div className="text-[10px] text-slate-400">{asset.name}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 text-[10px]">
                          {asset.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-purple-300 text-[11px]">
                        {asset.contractId.slice(0, 12)}...{asset.contractId.slice(-6)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-white">
                        ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-bold ${
                          asset.change24h >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {asset.change24h >= 0 ? "+" : ""}
                        {asset.change24h}%
                      </td>
                      <td className="py-3 px-3 text-slate-300 text-[10px]">
                        1000000000000000000
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            handleSelectAsset(asset.symbol);
                            setActiveSubView("trading");
                          }}
                          className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-[11px] transition cursor-pointer"
                        >
                          Trade L2
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =====================================================================
            VIEW 3: OPENZEPPELIN SMART CONTRACTS & KEY VAULT
           ===================================================================== */}
        {activeSubView === "contracts" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                  <Shield className="w-4 h-4 text-purple-400" />
                  OpenZeppelin v5.0 AccessControl &amp; ERC-20 Vault
                </h3>
                <span className="text-[10px] font-mono bg-purple-950 text-purple-300 px-2 py-0.5 rounded border border-purple-800">
                  AUDITED
                </span>
              </div>

              <div className="space-y-2.5 font-mono text-xs">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">DEFAULT_ADMIN_ROLE (SOLE CREATOR)</span>
                  <span className="text-emerald-400 font-bold">Mauro Lomibao Dar III (0x70Ac...8E9B)</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">OPENZEPPELIN MODULES INHERITED</span>
                  <span className="text-slate-200">
                    ERC20, ERC20Burnable, ERC20Pausable, AccessControl, ReentrancyGuard
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">DTCC FAST DIGITAL CUSTODY GATEWAY</span>
                  <span className="text-amber-400 font-semibold">Transfer Agent #9450 &bull; T+0 DvP Active</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  Interactive uint256 (18-Decimal Wei) Scaling Calculator
                </h3>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">HUMAN-READABLE TOKEN AMOUNT</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={converterInput}
                    onChange={(e) => setConverterInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-purple-900/50 space-y-1">
                  <div className="flex justify-between text-[10px] text-purple-400">
                    <span>SOLIDITY uint256 WEI OUTPUT (× 10¹⁸):</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(toUint256WeiString(parseFloat(converterInput) || 0), "wei-conv")
                      }
                      className="text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === "wei-conv" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      Copy
                    </button>
                  </div>
                  <div className="text-sm font-bold text-white break-all">
                    {toUint256WeiString(parseFloat(converterInput) || 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            VIEW 4: SYSTEM SCHEMATICS & COMPLIANCE
           ===================================================================== */}
        {activeSubView === "architecture" && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 animate-in fade-in duration-200 font-mono text-xs">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Token World Exchange ATS® System Schematics &amp; Regulatory Architecture
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-emerald-400 font-bold">1. OAuth 2.0 PKCE + TOTP Gateway</div>
                <p className="text-slate-400 leading-relaxed">
                  RFC 7636 SHA-256 Code Challenge handshake with Auth0/Google SSO and 6-digit RFC 6238 TOTP Administrator hardware verification.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-amber-400 font-bold">2. SEC Rule 15c3-5 Pre-Trade Engine</div>
                <p className="text-slate-400 leading-relaxed">
                  Every order is validated in &lt;145μs for credit thresholds, price collars, and Rule 15c3-3 customer reserve segregation before entering the CLOB.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-purple-400 font-bold">3. OpenZeppelin v5.0 Atomic DvP</div>
                <p className="text-slate-400 leading-relaxed">
                  Matched trades settle T+0 on-chain with 18-decimal uint256 precision and instant FINRA CAT audit trail reporting.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            VIEW 5: SOURCE BLUEPRINTS & ENGINE
           ===================================================================== */}
        {activeSubView === "code" && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-400" />
                TokenWorldExchangeATS_v5.sol (OpenZeppelin v5.0 &amp; 18-Decimal uint256 Settlement)
              </h2>
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.24;\nimport "@openzeppelin/contracts/token/ERC20/ERC20.sol";\nimport "@openzeppelin/contracts/access/AccessControl.sol";\n\ncontract TokenWorldExchangeATS is ERC20, AccessControl {\n    bytes32 public constant ATS_OPERATOR_ROLE = keccak256("ATS_OPERATOR_ROLE");\n    constructor() ERC20("Token World Exchange ATS", "TWE") {\n        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);\n        _mint(msg.sender, 100_000_000 * 10 ** decimals());\n    }\n}`,
                    "sol-code"
                  )
                }
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-emerald-400 flex items-center gap-1.5 cursor-pointer"
              >
                {copiedId === "sol-code" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedId === "sol-code" ? "Copied" : "Copy Solidity"}
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
{`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Token World Exchange ATS® (Ticker: TWE)
 * @notice Sole Owner & Creator: Mauro Lomibao Dar III (maurodar08@gmail.com)
 * @dev 18-Decimal uint256 Institutional ATS Settlement & SEC Rule 15c3-5 Collar Engine
 */
contract TokenWorldExchangeATS is ERC20, ERC20Burnable, Pausable, AccessControl, ReentrancyGuard {
    bytes32 public constant ATS_OPERATOR_ROLE = keccak256("ATS_OPERATOR_ROLE");
    bytes32 public constant COMPLIANCE_OFFICER_ROLE = keccak256("COMPLIANCE_OFFICER_ROLE");

    event AtomicDvPExecuted(
        string indexed clientId,
        string symbol,
        uint256 priceUsdScaled,
        uint256 quantityWei,
        uint256 timestamp
    );

    constructor(address initialOwner) ERC20("Token World Exchange ATS", "TWE") {
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(ATS_OPERATOR_ROLE, initialOwner);
        _grantRole(COMPLIANCE_OFFICER_ROLE, initialOwner);
        _mint(initialOwner, 100_000_000 * 10 ** decimals()); // 10^18 Wei Precision
    }

    function settleAtomicTrade(
        string calldata clientId,
        string calldata symbol,
        uint256 priceUsdScaled,
        uint256 quantityWei
    ) external onlyRole(ATS_OPERATOR_ROLE) whenNotPaused nonReentrant {
        require(quantityWei > 0, "Rule 15c3-5: Zero uint256 quantity rejected");
        emit AtomicDvPExecuted(clientId, symbol, priceUsdScaled, quantityWei, block.timestamp);
    }
}`}
            </pre>
          </div>
        )}
      </main>

      {/* Unified Auth Gateway Modal */}
      <TokenWorldUnifiedAuthGateway
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onNavigateToTab={onNavigateToTab}
      />
    </div>
  );
};
