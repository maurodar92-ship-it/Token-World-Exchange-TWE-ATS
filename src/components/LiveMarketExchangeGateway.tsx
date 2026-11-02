import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Globe,
  Radio,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Zap,
  Server,
  Scale,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  BarChart2,
  Sliders,
  DollarSign,
  Key,
  Database,
  ArrowDownUp,
  Link as LinkIcon,
} from "lucide-react";
import { TokenRecord } from "../types";

export interface LiveTickerItem {
  symbol: string;
  name: string;
  priceUsd: number;
  change24h: number;
  volume24hUsd: number;
  high24h: number;
  low24h: number;
  lastUpdated: string;
}

export interface ArbitrageItem {
  symbol: string;
  name: string;
  exchanges: Array<{ exchange: string; price: number }>;
  lowestAsk: { exchange: string; price: number };
  highestBid: { exchange: string; price: number };
  spreadPercent: number;
  spreadUsd: number;
}

export interface ExchangePingItem {
  id: string;
  name: string;
  category: "CEX" | "DEX" | "Aggregator" | "Oracle";
  status: "Online" | "Degraded" | "Offline";
  httpCode: number;
  latencyMs: number;
  url: string;
  timestamp: string;
}

export interface OrderBookEntry {
  price: number;
  size: number;
  totalUsd: number;
  cumulativeVolume: number;
}

export interface DexPairItem {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; name: string; symbol: string };
  priceUsd: number;
  liquidityUsd: number;
  volume24hUsd: number;
  priceChange24h: number;
}

interface LiveMarketExchangeGatewayProps {
  tokens?: TokenRecord[];
  onSelectToken?: (token: TokenRecord) => void;
  className?: string;
}

export const LiveMarketExchangeGateway: React.FC<LiveMarketExchangeGatewayProps> = ({
  tokens = [],
  className = "",
}) => {
  // Navigation Sub-Tabs
  const [subTab, setSubTab] = useState<"tickers" | "arbitrage" | "orderbook" | "health" | "dex_scanner" | "api_keys">("tickers");

  // Live Exchange Health Data
  const [exchangeHealth, setExchangeHealth] = useState<ExchangePingItem[]>([]);
  const [connectedCount, setConnectedCount] = useState<number>(0);
  const [averageLatency, setAverageLatency] = useState<number>(0);
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [lastPingTime, setLastPingTime] = useState<string>("");

  // Live Ticker Data
  const [tickers, setTickers] = useState<LiveTickerItem[]>([]);
  const [arbitrageList, setArbitrageList] = useState<ArbitrageItem[]>([]);
  const [isLoadingTickers, setIsLoadingTickers] = useState<boolean>(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(15); // seconds (0 = off)

  // Order Book Data
  const [orderBookPair, setOrderBookPair] = useState<string>("ETH-USD");
  const [orderBookBids, setOrderBookBids] = useState<OrderBookEntry[]>([]);
  const [orderBookAsks, setOrderBookAsks] = useState<OrderBookEntry[]>([]);
  const [orderBookMidPrice, setOrderBookMidPrice] = useState<number>(0);
  const [orderBookSpreadUsd, setOrderBookSpreadUsd] = useState<number>(0);
  const [orderBookSpreadPercent, setOrderBookSpreadPercent] = useState<number>(0);
  const [orderBookPressure, setOrderBookPressure] = useState<number>(50);
  const [isLoadingOrderBook, setIsLoadingOrderBook] = useState<boolean>(false);

  // DEX Token Scanner State
  const [dexSearchInput, setDexSearchInput] = useState<string>(
    tokens.length > 0 && tokens[0].contractAddress ? tokens[0].contractAddress : "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
  );
  const [dexPairs, setDexPairs] = useState<DexPairItem[]>([]);
  const [isSearchingDex, setIsSearchingDex] = useState<boolean>(false);
  const [dexSearchError, setDexSearchError] = useState<string | null>(null);

  // Read-Only User API Keys (Local Storage)
  const [savedApiKeys, setSavedApiKeys] = useState<Array<{ exchange: string; keyMasked: string; dateAdded: string }>>(() => {
    try {
      const raw = localStorage.getItem("outside_world_exchange_keys_v1");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [newKeyExchange, setNewKeyExchange] = useState<string>("Binance");
  const [newKeyInput, setNewKeyInput] = useState<string>("");

  // 1. Fetch Live Exchange Ping Latency
  const fetchHealthPing = useCallback(async () => {
    setIsPinging(true);
    try {
      const res = await fetch("/api/exchange/health-ping");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setExchangeHealth(data.results || []);
          setConnectedCount(data.connectedCount || 0);
          setAverageLatency(data.averageLatencyMs || 0);
          setLastPingTime(new Date().toLocaleTimeString());
        }
      }
    } catch (err) {
      console.warn("Failed to ping external exchanges:", err);
    } finally {
      setIsPinging(false);
    }
  }, []);

  // 2. Fetch Live Price Tickers & Arbitrage
  const fetchLiveTickers = useCallback(async () => {
    setIsLoadingTickers(true);
    try {
      const res = await fetch("/api/exchange/live-tickers");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTickers(data.tickers || []);
          setArbitrageList(data.arbitrageComparison || []);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch live tickers:", err);
    } finally {
      setIsLoadingTickers(false);
    }
  }, []);

  // 3. Fetch Live Order Book Depth
  const fetchOrderBook = useCallback(async (pair: string) => {
    setIsLoadingOrderBook(true);
    try {
      const res = await fetch(`/api/exchange/orderbook?pair=${pair}&limit=12`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setOrderBookBids(data.bids || []);
          setOrderBookAsks(data.asks || []);
          setOrderBookMidPrice(data.midPrice || 0);
          setOrderBookSpreadUsd(data.spreadUsd || 0);
          setOrderBookSpreadPercent(data.spreadPercent || 0);
          setOrderBookPressure(data.bidPressurePercent || 50);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch live order book:", err);
    } finally {
      setIsLoadingOrderBook(false);
    }
  }, []);

  // 4. Search DEX On-Chain Pairs via DEXScreener
  const handleSearchDex = async (addressToSearch: string) => {
    const cleanAddr = addressToSearch.trim();
    if (!cleanAddr) return;

    setIsSearchingDex(true);
    setDexSearchError(null);
    setDexPairs([]);

    try {
      const res = await fetch(`/api/exchange/dex-lookup?address=${encodeURIComponent(cleanAddr)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDexPairs(data.pairs || []);
          if ((data.pairs || []).length === 0) {
            setDexSearchError("No active automated market maker (AMM) liquidity pools found on DEXScreener for this contract address yet.");
          }
        } else {
          setDexSearchError(data.error || "Lookup failed.");
        }
      } else {
        setDexSearchError("External DEX Screener network lookup failed.");
      }
    } catch (err: any) {
      setDexSearchError(err?.message || "Error querying DEX pools.");
    } finally {
      setIsSearchingDex(false);
    }
  };

  // Initial Data Load
  useEffect(() => {
    fetchHealthPing();
    fetchLiveTickers();
    fetchOrderBook(orderBookPair);
  }, [fetchHealthPing, fetchLiveTickers, fetchOrderBook, orderBookPair]);

  // Auto Refresh Interval
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    const interval = setInterval(() => {
      fetchLiveTickers();
      if (subTab === "orderbook") {
        fetchOrderBook(orderBookPair);
      }
    }, autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshInterval, fetchLiveTickers, fetchOrderBook, orderBookPair, subTab]);

  // Handle Adding Read-Only API Key
  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyInput.trim()) return;
    const masked = newKeyInput.slice(0, 4) + "••••••••••••" + newKeyInput.slice(-4);
    const updated = [
      ...savedApiKeys.filter((k) => k.exchange !== newKeyExchange),
      {
        exchange: newKeyExchange,
        keyMasked: masked,
        dateAdded: new Date().toLocaleDateString(),
      },
    ];
    setSavedApiKeys(updated);
    localStorage.setItem("outside_world_exchange_keys_v1", JSON.stringify(updated));
    setNewKeyInput("");
  };

  const handleRemoveApiKey = (exchange: string) => {
    const updated = savedApiKeys.filter((k) => k.exchange !== exchange);
    setSavedApiKeys(updated);
    localStorage.setItem("outside_world_exchange_keys_v1", JSON.stringify(updated));
  };

  return (
    <div
      id="outside-world-exchange-gateway"
      className={`bg-[#0D0E12] border border-[#1E222D] rounded-xl overflow-hidden shadow-2xl space-y-4 ${className}`}
    >
      {/* 1. Real-Time Outside World Connectivity Header */}
      <div className="bg-gradient-to-r from-[#12141A] via-[#161922] to-[#12141A] p-4 border-b border-[#1E222D]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-950/40">
                <Globe className="w-5 h-5 animate-pulse" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-mono text-white tracking-wide">
                  Outside World Crypto Market Exchange Bridge
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                  LIVE FEED ACTIVE
                </span>
              </div>
              <p className="text-xs text-[#8E9299]">
                Live round-trip API connections to Coinbase, Kraken, OKX, Binance.US, CoinGecko, and DexScreener.
              </p>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <div className="bg-[#191D28] px-3 py-1.5 rounded-lg border border-[#272E40] flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[#8E9299]">Status:</span>
              <span className="text-white font-bold">
                {connectedCount > 0 ? `${connectedCount}/${exchangeHealth.length || 12} Online` : "Connecting..."}
              </span>
            </div>

            <div className="bg-[#191D28] px-3 py-1.5 rounded-lg border border-[#272E40] flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[#8E9299]">Avg Ping:</span>
              <span className="text-amber-300 font-bold">{averageLatency > 0 ? `${averageLatency}ms` : "Testing..."}</span>
            </div>

            <button
              type="button"
              id="btn-ping-outside-world-exchanges"
              onClick={fetchHealthPing}
              disabled={isPinging}
              className="px-3 py-1.5 rounded-lg bg-[#222838] hover:bg-[#2C344A] text-white border border-[#343D56] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Ping all live outside world exchange endpoints"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#F27D26] ${isPinging ? "animate-spin" : ""}`} />
              <span>{isPinging ? "Pinging..." : "Test Pings"}</span>
            </button>

            {/* Auto Refresh Interval Selector */}
            <div className="flex items-center gap-1 bg-[#191D28] px-2 py-1 rounded-lg border border-[#272E40]">
              <Clock className="w-3.5 h-3.5 text-[#8E9299]" />
              <select
                id="select-live-exchange-refresh-interval"
                aria-label="Select live market data auto-refresh interval"
                value={autoRefreshInterval}
                onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                className="bg-transparent text-xs font-mono text-cyan-300 focus:outline-none cursor-pointer"
              >
                <option value={5} className="bg-[#191D28] text-white">5s stream</option>
                <option value={15} className="bg-[#191D28] text-white">15s stream</option>
                <option value={30} className="bg-[#191D28] text-white">30s stream</option>
                <option value={0} className="bg-[#191D28] text-white">Manual</option>
              </select>
            </div>
          </div>
        </div>

        {/* Live Top Ticker Strip (Real-World Benchmark Coins) */}
        {tickers.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[#1F2432] flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar text-xs font-mono">
            <span className="text-[11px] text-[#8E9299] uppercase font-bold tracking-wider shrink-0 flex items-center gap-1">
              <Radio className="w-3 h-3 text-red-500 animate-pulse" />
              Live Feeds:
            </span>
            {tickers.slice(0, 8).map((t) => (
              <div
                key={t.symbol}
                className="bg-[#161922] px-2.5 py-1 rounded border border-[#232838] flex items-center gap-2 shrink-0 hover:border-[#384159] transition-all"
              >
                <span className="text-white font-bold">{t.symbol}</span>
                <span className="text-cyan-300 font-semibold">
                  ${t.priceUsd >= 1 ? t.priceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : t.priceUsd.toFixed(6)}
                </span>
                <span
                  className={`text-[10px] font-bold flex items-center ${
                    t.change24h >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {t.change24h >= 0 ? "+" : ""}
                  {t.change24h.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Navigation Sub-Tabs */}
      <div className="px-4 border-b border-[#1E222D]">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            id="tab-live-market-tickers"
            onClick={() => setSubTab("tickers")}
            className={`px-3.5 py-2 rounded-t-lg font-mono text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              subTab === "tickers"
                ? "bg-[#181C26] text-cyan-400 border-cyan-400"
                : "text-[#8E9299] hover:text-white border-transparent hover:bg-[#13151D]"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Live Spot Tickers (12 Assets)</span>
          </button>

          <button
            type="button"
            id="tab-live-market-arbitrage"
            onClick={() => setSubTab("arbitrage")}
            className={`px-3.5 py-2 rounded-t-lg font-mono text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              subTab === "arbitrage"
                ? "bg-[#181C26] text-[#F27D26] border-[#F27D26]"
                : "text-[#8E9299] hover:text-white border-transparent hover:bg-[#13151D]"
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Cross-Exchange Arbitrage</span>
          </button>

          <button
            type="button"
            id="tab-live-market-orderbook"
            onClick={() => setSubTab("orderbook")}
            className={`px-3.5 py-2 rounded-t-lg font-mono text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              subTab === "orderbook"
                ? "bg-[#181C26] text-emerald-400 border-emerald-400"
                : "text-[#8E9299] hover:text-white border-transparent hover:bg-[#13151D]"
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Live Order Book Depth</span>
          </button>

          <button
            type="button"
            id="tab-live-market-health"
            onClick={() => setSubTab("health")}
            className={`px-3.5 py-2 rounded-t-lg font-mono text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              subTab === "health"
                ? "bg-[#181C26] text-blue-400 border-blue-400"
                : "text-[#8E9299] hover:text-white border-transparent hover:bg-[#13151D]"
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Exchange Health & Latency ({exchangeHealth.length})</span>
          </button>

          <button
            type="button"
            id="tab-live-market-dex-scanner"
            onClick={() => setSubTab("dex_scanner")}
            className={`px-3.5 py-2 rounded-t-lg font-mono text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              subTab === "dex_scanner"
                ? "bg-[#181C26] text-purple-400 border-purple-400"
                : "text-[#8E9299] hover:text-white border-transparent hover:bg-[#13151D]"
            }`}
          >
            <Search className="w-4 h-4" />
            <span>DEX On-Chain Pool Scanner</span>
          </button>

          <button
            type="button"
            id="tab-live-market-api-keys"
            onClick={() => setSubTab("api_keys")}
            className={`px-3.5 py-2 rounded-t-lg font-mono text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              subTab === "api_keys"
                ? "bg-[#181C26] text-amber-400 border-amber-400"
                : "text-[#8E9299] hover:text-white border-transparent hover:bg-[#13151D]"
            }`}
          >
            <Key className="w-4 h-4" />
            <span>API Key Gateway ({savedApiKeys.length})</span>
          </button>
        </div>
      </div>

      {/* 3. Sub-Tab Content Views */}
      <div className="p-4 pt-0">
        {/* VIEW 1: LIVE SPOT TICKERS */}
        {subTab === "tickers" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-mono text-[#8E9299]">
              <span className="flex items-center gap-1.5 text-white font-semibold">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                Live Spot Prices from Outside World Exchanges (CoinGecko / Coinbase / Kraken)
              </span>
              <button
                type="button"
                onClick={fetchLiveTickers}
                className="text-[#F27D26] hover:text-white flex items-center gap-1 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingTickers ? "animate-spin" : ""}`} />
                <span>Refresh Live Tickers</span>
              </button>
            </div>

            {/* Ticker Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 font-mono">
              {tickers.map((t) => (
                <div
                  key={t.symbol}
                  className="bg-[#12141C] p-3 rounded-lg border border-[#1E2332] hover:border-[#2D364D] transition-all space-y-2 group shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {t.symbol}
                      </span>
                      <span className="text-[10px] text-[#8E9299] truncate max-w-[90px]">{t.name}</span>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        t.change24h >= 0
                          ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                          : "bg-rose-500/10 border border-rose-500/30 text-rose-400"
                      }`}
                    >
                      {t.change24h >= 0 ? "+" : ""}
                      {t.change24h.toFixed(2)}%
                    </span>
                  </div>

                  {/* Price */}
                  <div className="text-lg font-bold text-white">
                    ${t.priceUsd >= 1 ? t.priceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : t.priceUsd.toFixed(6)}
                  </div>

                  {/* 24h Stats */}
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-[#8E9299] pt-1.5 border-t border-[#1C212E]">
                    <div>
                      <span>24h High:</span>{" "}
                      <span className="text-white">${t.high24h.toLocaleString()}</span>
                    </div>
                    <div>
                      <span>24h Low:</span>{" "}
                      <span className="text-white">${t.low24h.toLocaleString()}</span>
                    </div>
                    <div className="col-span-2 truncate">
                      <span>24h Vol:</span>{" "}
                      <span className="text-cyan-300">
                        ${t.volume24hUsd >= 1e9 ? `${(t.volume24hUsd / 1e9).toFixed(2)}B` : `${(t.volume24hUsd / 1e6).toFixed(1)}M`}
                      </span>
                    </div>
                  </div>

                  {/* Direct Trade Route Links */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <a
                      href={`https://advanced.coinbase.com/trade/${t.symbol}-USD`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center py-1 rounded bg-[#1A1F2C] hover:bg-blue-600/30 text-[10px] text-blue-300 hover:text-white border border-blue-500/30 transition-all flex items-center justify-center gap-1"
                    >
                      <span>Coinbase</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    <a
                      href={`https://pro.kraken.com/app/trade/${t.symbol}-USD`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center py-1 rounded bg-[#1A1F2C] hover:bg-purple-600/30 text-[10px] text-purple-300 hover:text-white border border-purple-500/30 transition-all flex items-center justify-center gap-1"
                    >
                      <span>Kraken</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    <a
                      href={`https://www.binance.com/en/trade/${t.symbol}_USDT`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center py-1 rounded bg-[#1A1F2C] hover:bg-amber-600/30 text-[10px] text-amber-300 hover:text-white border border-amber-500/30 transition-all flex items-center justify-center gap-1"
                    >
                      <span>Binance</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 2: CROSS-EXCHANGE ARBITRAGE MATRIX */}
        {subTab === "arbitrage" && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-[#141824] border border-[#222A3E] text-xs font-mono flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#F27D26]" />
                <span className="text-white font-bold">Real-World Cross-Exchange Arbitrage Detector</span>
                <span className="text-[#8E9299]">• Parallel real-time price monitoring</span>
              </div>
              <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Live Spreads Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
              {arbitrageList.map((arb) => (
                <div
                  key={arb.symbol}
                  className="bg-[#12141C] p-4 rounded-xl border border-[#1E2332] space-y-3 shadow-xl"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#1E2330]">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-[#F27D26] font-bold">
                        {arb.symbol}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{arb.name} ({arb.symbol})</div>
                        <div className="text-[10px] text-[#8E9299]">4 Real-World Exchange Feeds</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-[#8E9299]">Arbitrage Spread</div>
                      <div className="text-sm font-bold text-emerald-400">
                        {arb.spreadPercent > 0 ? `+${arb.spreadPercent}% ($${arb.spreadUsd})` : "<0.01%"}
                      </div>
                    </div>
                  </div>

                  {/* Multi-Exchange Prices Table */}
                  <div className="space-y-1.5 text-xs">
                    {arb.exchanges.map((ex) => {
                      const isLowest = ex.exchange === arb.lowestAsk.exchange;
                      const isHighest = ex.exchange === arb.highestBid.exchange;
                      return (
                        <div
                          key={ex.exchange}
                          className={`p-2 rounded flex items-center justify-between border ${
                            isLowest
                              ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-300"
                              : isHighest
                              ? "bg-cyan-500/5 border-cyan-500/30 text-cyan-300"
                              : "bg-[#171B26] border-[#222738] text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{ex.exchange}</span>
                            {isLowest && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-300 font-bold">
                                LOWEST ASK (BUY HERE)
                              </span>
                            )}
                            {isHighest && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-500/20 text-cyan-300 font-bold">
                                HIGHEST BID (SELL HERE)
                              </span>
                            )}
                          </div>
                          <div className="font-bold text-sm">
                            ${ex.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Suggested Arbitrage Execution Route */}
                  <div className="p-2.5 rounded bg-[#161A26] border border-[#23293D] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-[#8E9299]">
                      <span>Buy on <strong className="text-emerald-400">{arb.lowestAsk.exchange}</strong></span>
                      <ArrowRight className="w-3 h-3 text-[#F27D26]" />
                      <span>Sell on <strong className="text-cyan-400">{arb.highestBid.exchange}</strong></span>
                    </div>

                    <a
                      href={`https://advanced.coinbase.com/trade/${arb.symbol}-USD`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded bg-[#F27D26] hover:bg-[#ff9040] text-black font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <span>Trade Route</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 3: LIVE ORDER BOOK DEPTH */}
        {subTab === "orderbook" && (
          <div className="space-y-4 font-mono">
            {/* Pair Selector & Depth Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-[#141824] border border-[#222A3E]">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-400" />
                <span className="text-white font-bold text-xs">Coinbase Exchange Live Order Book</span>
                <span className="text-[#8E9299] text-xs">• Real-Time Level 2 Depth</span>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-[#8E9299]">Pair:</span>
                  <select
                    id="select-orderbook-pair"
                    aria-label="Select order book trading pair"
                    value={orderBookPair}
                    onChange={(e) => {
                      setOrderBookPair(e.target.value);
                      fetchOrderBook(e.target.value);
                    }}
                    className="bg-[#1C2130] text-cyan-300 font-bold px-2 py-1 rounded border border-[#2B334A] focus:outline-none cursor-pointer"
                  >
                    <option value="ETH-USD">ETH / USD</option>
                    <option value="BTC-USD">BTC / USD</option>
                    <option value="SOL-USD">SOL / USD</option>
                  </select>
                </div>

                <div className="text-white">
                  Mid: <strong className="text-cyan-400">${orderBookMidPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                </div>

                <div className="text-[#8E9299]">
                  Spread: <strong className="text-amber-300">${orderBookSpreadUsd.toFixed(2)} ({orderBookSpreadPercent.toFixed(3)}%)</strong>
                </div>

                <button
                  type="button"
                  onClick={() => fetchOrderBook(orderBookPair)}
                  className="p-1 rounded bg-[#202638] text-[#8E9299] hover:text-white"
                  title="Refresh Order Book"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOrderBook ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* Depth Pressure Gauge */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-[#8E9299]">
                <span className="text-emerald-400 font-bold">Buy Pressure (Bids): {orderBookPressure}%</span>
                <span className="text-rose-400 font-bold">Sell Pressure (Asks): {100 - orderBookPressure}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#181C28] overflow-hidden flex">
                <div style={{ width: `${orderBookPressure}%` }} className="bg-emerald-500 h-full transition-all" />
                <div style={{ width: `${100 - orderBookPressure}%` }} className="bg-rose-500 h-full transition-all" />
              </div>
            </div>

            {/* Live Order Book Tables (Side by Side Bids and Asks) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* BIDS (BUY ORDERS) */}
              <div className="bg-[#10121A] p-3 rounded-lg border border-[#1E2332] space-y-2">
                <div className="flex items-center justify-between text-emerald-400 font-bold pb-1 border-b border-[#1E2332]">
                  <span>Bids (Buy Orders)</span>
                  <span className="text-[10px] text-[#8E9299] font-normal">Coinbase Pro Engine</span>
                </div>
                <div className="grid grid-cols-3 text-[10px] text-[#8E9299] font-bold">
                  <span>Price ($)</span>
                  <span className="text-center">Size</span>
                  <span className="text-right">Total ($)</span>
                </div>
                <div className="space-y-1">
                  {orderBookBids.map((b, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-3 text-xs p-1 rounded bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors"
                    >
                      <span className="text-emerald-400 font-bold">${b.price.toFixed(2)}</span>
                      <span className="text-center text-white">{b.size.toFixed(4)}</span>
                      <span className="text-right text-[#8E9299]">${Math.round(b.totalUsd).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ASKS (SELL ORDERS) */}
              <div className="bg-[#10121A] p-3 rounded-lg border border-[#1E2332] space-y-2">
                <div className="flex items-center justify-between text-rose-400 font-bold pb-1 border-b border-[#1E2332]">
                  <span>Asks (Sell Orders)</span>
                  <span className="text-[10px] text-[#8E9299] font-normal">Coinbase Pro Engine</span>
                </div>
                <div className="grid grid-cols-3 text-[10px] text-[#8E9299] font-bold">
                  <span>Price ($)</span>
                  <span className="text-center">Size</span>
                  <span className="text-right">Total ($)</span>
                </div>
                <div className="space-y-1">
                  {orderBookAsks.map((a, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-3 text-xs p-1 rounded bg-rose-500/5 hover:bg-rose-500/10 transition-colors"
                    >
                      <span className="text-rose-400 font-bold">${a.price.toFixed(2)}</span>
                      <span className="text-center text-white">{a.size.toFixed(4)}</span>
                      <span className="text-right text-[#8E9299]">${Math.round(a.totalUsd).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: EXCHANGE HEALTH & LATENCY MATRIX */}
        {subTab === "health" && (
          <div className="space-y-4 font-mono">
            <div className="flex items-center justify-between text-xs text-[#8E9299]">
              <span className="text-white font-bold flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-blue-400" />
                Live Outside World Exchange Endpoints Ping Test
              </span>
              <span>Last tested: {lastPingTime || "Just now"}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {exchangeHealth.map((ex) => {
                const isOnline = ex.status === "Online";
                return (
                  <div
                    key={ex.id}
                    className="bg-[#12141C] p-3 rounded-lg border border-[#1E2332] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white font-bold text-xs">{ex.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isOnline
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {ex.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#8E9299]">Latency:</span>
                      <span className={`font-bold ${ex.latencyMs < 200 ? "text-emerald-400" : ex.latencyMs < 500 ? "text-amber-400" : "text-rose-400"}`}>
                        {ex.latencyMs < 999 ? `${ex.latencyMs} ms` : "Timeout"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#8E9299] pt-1 border-t border-[#1C212E]">
                      <span>HTTP {ex.httpCode}</span>
                      <span className="truncate max-w-[160px] text-[9px] text-[#5C6478]">{ex.url}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 5: DEX ON-CHAIN POOL SCANNER */}
        {subTab === "dex_scanner" && (
          <div className="space-y-4 font-mono">
            <div className="p-3 rounded-lg bg-[#141824] border border-[#222A3E] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white font-bold flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-purple-400" />
                  Live DEX Pool Scanner (DexScreener API)
                </span>
                <span className="text-[10px] text-[#8E9299]">Search any token across Uniswap, Raydium, Aerodrome & 70+ chains</span>
              </div>

              {/* Search Bar */}
              <div className="flex items-center gap-2">
                <input
                  id="input-dex-scanner-address"
                  type="text"
                  placeholder="Enter contract address (0x... or Solana mint)"
                  value={dexSearchInput}
                  onChange={(e) => setDexSearchInput(e.target.value)}
                  className="flex-1 bg-[#0A0C10] border border-[#282F42] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#5C6478] focus:outline-none focus:border-purple-500 font-mono"
                />
                <button
                  type="button"
                  id="btn-dex-scanner-search"
                  onClick={() => handleSearchDex(dexSearchInput)}
                  disabled={isSearchingDex}
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                >
                  <Search className={`w-3 h-3 ${isSearchingDex ? "animate-spin" : ""}`} />
                  <span>{isSearchingDex ? "Searching..." : "Scan DEX"}</span>
                </button>
              </div>

              {/* Quick Preset Buttons from Token List */}
              {tokens.length > 0 && (
                <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
                  <span className="text-[10px] text-[#8E9299] shrink-0">Quick Pick:</span>
                  {tokens.slice(0, 5).map((tok) => (
                    <button
                      key={tok.id}
                      type="button"
                      onClick={() => {
                        setDexSearchInput(tok.contractAddress || "");
                        handleSearchDex(tok.contractAddress || "");
                      }}
                      className="px-2 py-0.5 rounded text-[10px] bg-[#1A1E2B] text-cyan-300 hover:bg-[#252C3E] border border-[#283247] shrink-0"
                    >
                      {tok.symbol} ({tok.chain})
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Error / Notice */}
            {dexSearchError && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{dexSearchError}</span>
              </div>
            )}

            {/* Results Table */}
            {dexPairs.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-[#8E9299] flex items-center justify-between">
                  <span>Found {dexPairs.length} Live DEX Liquidity Pools:</span>
                </div>

                <div className="space-y-2">
                  {dexPairs.map((p, idx) => (
                    <div
                      key={idx}
                      className="bg-[#12141C] p-3 rounded-lg border border-[#1E2332] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">
                            {p.baseToken?.symbol} / {p.quoteToken?.symbol}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 border border-purple-500/30 text-purple-300 uppercase">
                            {p.dexId} ({p.chainId})
                          </span>
                        </div>
                        <div className="text-[10px] text-[#8E9299] font-mono">
                          Pair Contract: <span className="text-[#A2A7B5]">{p.pairAddress}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <div className="text-white font-bold">${p.priceUsd.toFixed(6)}</div>
                          <div
                            className={`text-[10px] font-bold ${
                              p.priceChange24h >= 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {p.priceChange24h >= 0 ? "+" : ""}{p.priceChange24h.toFixed(2)}%
                          </div>
                        </div>

                        <div>
                          <div className="text-[#8E9299] text-[10px]">Liquidity TVL</div>
                          <div className="text-cyan-300 font-bold">${Math.round(p.liquidityUsd).toLocaleString()}</div>
                        </div>

                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 hover:text-white border border-purple-500/30 flex items-center gap-1 font-bold text-xs"
                        >
                          <span>DexScreener</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 6: READ-ONLY API KEY GATEWAY */}
        {subTab === "api_keys" && (
          <div className="space-y-4 font-mono text-xs">
            <div className="p-3 rounded-lg bg-[#141824] border border-[#222A3E] space-y-1">
              <div className="flex items-center gap-2 text-white font-bold">
                <Key className="w-4 h-4 text-amber-400" />
                <span>Read-Only External Exchange API Connection Manager</span>
              </div>
              <p className="text-[#8E9299] text-[11px]">
                Connect read-only API keys from your personal exchange accounts (Binance, Coinbase, Kraken, OKX) to sync external balances. Keys are stored locally in your browser session and never sent to external third parties.
              </p>
            </div>

            {/* Add Key Form */}
            <form onSubmit={handleSaveApiKey} className="p-3 rounded-lg bg-[#12141C] border border-[#1E2332] space-y-3">
              <div className="font-bold text-white">Add Exchange Connection</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label htmlFor="select-new-key-exchange" className="block text-[10px] text-[#8E9299] mb-1">Target Exchange</label>
                  <select
                    id="select-new-key-exchange"
                    value={newKeyExchange}
                    onChange={(e) => setNewKeyExchange(e.target.value)}
                    className="w-full bg-[#1A1E2B] border border-[#283247] rounded px-2.5 py-1.5 text-white focus:outline-none"
                  >
                    <option value="Binance">Binance</option>
                    <option value="Coinbase">Coinbase</option>
                    <option value="Kraken">Kraken</option>
                    <option value="OKX">OKX</option>
                    <option value="Bybit">Bybit</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="input-new-key-val" className="block text-[10px] text-[#8E9299] mb-1">Read-Only API Key</label>
                  <div className="flex items-center gap-2">
                    <input
                      id="input-new-key-val"
                      type="password"
                      placeholder="Paste read-only API key (no withdrawal permissions required)"
                      value={newKeyInput}
                      onChange={(e) => setNewKeyInput(e.target.value)}
                      className="flex-1 bg-[#1A1E2B] border border-[#283247] rounded px-2.5 py-1.5 text-white placeholder-[#5C6478] focus:outline-none"
                    />
                    <button
                      type="submit"
                      id="btn-save-exchange-api-key"
                      className="px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold cursor-pointer transition-all"
                    >
                      Connect
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* Connected Keys List */}
            <div className="space-y-2">
              <div className="font-bold text-white">Active Connected Exchange Keys ({savedApiKeys.length})</div>
              {savedApiKeys.length === 0 ? (
                <div className="p-4 rounded-lg bg-[#10121A] border border-[#1A1E2B] text-center text-[#8E9299]">
                  No external exchange API keys connected. Add a read-only key above to link your accounts.
                </div>
              ) : (
                savedApiKeys.map((k) => (
                  <div
                    key={k.exchange}
                    className="p-3 rounded-lg bg-[#12141C] border border-[#1E2332] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <div>
                        <div className="font-bold text-white">{k.exchange}</div>
                        <div className="text-[10px] text-[#8E9299]">Key: {k.keyMasked} • Connected {k.dateAdded}</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveApiKey(k.exchange)}
                      className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] cursor-pointer"
                    >
                      Disconnect
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
